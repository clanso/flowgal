// 亲密场面由插画来演：节奏底（scene.eros）开着的那一段，这段里出来的插画一直显示到这段结束，台上的立绘退下；
// 插画方向：设置里可以定死横图 / 竖图，或者交给插画分镜师判断。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { normalizeScript, holdIntimateImages } from '../lib/director.js'
import { walkScenes, intimateRuns, holdIntimateCgs } from '../lib/scenes.js'
import { DIRECTOR_SYSTEM, DIRECTOR_EROS, CG_SYSTEM, fill } from '../lib/prompts.js'
import { resolveConfig } from '../lib/config.js'
import { fixedCgShape } from '../lib/vocab.js'
import { buildBeats } from '../src/client/theater/playback.js'
import { createStore } from '../lib/dsh/store.js'
import { createEngine } from '../lib/engine.js'

const unitsOf = n => Array.from({ length: n }, (_, i) => ({ id: 'U' + (i + 1), text: `第 ${i + 1} 句。`, type: 'narration' }))
const ids = n => unitsOf(n).map(u => u.id)

test('亲密场面的区间：从写 eros 的那一句到 none、换了地方或这一轮结束', () => {
  const lines = [{}, { scene: { eros: 'tease' } }, { scene: { eros: 'fast' } }, {}, { scene: { eros: 'none' } }, {}, { scene: { eros: 'slow' } }, { scene: { location: '走廊' } }, { scene: { eros: 'afterglow' } }, {}]
  assert.deepEqual(intimateRuns(walkScenes({ scene: { location: '卧室' } }, lines)), [[1, 3], [6, 6], [8, 9]])
  // 这一轮一开场就开着
  assert.deepEqual(intimateRuns(walkScenes({ scene: { location: '卧室', eros: 'slow' } }, [{}, {}])), [[0, 1]])
  assert.deepEqual(intimateRuns(walkScenes({ scene: { location: '卧室' } }, [{}, {}])), [])
})

test('这段里出来的插画显示到这段结束；之前就收了的、本来就更长的不动', () => {
  const spans = [{ at: 0, end: 1 }, { at: 2, end: 3 }, { at: 5, end: 6 }, { at: 9, end: 12 }, { at: 14, end: 14 }]
  holdIntimateCgs(spans, [[2, 10], [13, 15]])
  assert.deepEqual(spans.map(s => [s.at, s.end]), [[0, 1], [2, 10], [5, 10], [9, 12], [14, 15]])
  // 这段开始时还显示着的那张也接着演到这段结束；玩家自己定了显示到哪一句的不动
  assert.deepEqual(holdIntimateCgs([{ at: 0, end: 3 }, { at: 4, end: 4, pinned: true }], [[2, 6]]).map(s => s.end), [6, 4])
})

test('导演整理：露骨的 until 写短了也改到这段结束，补的那张挂在这段的中间；到这一轮结束就省略 until', () => {
  const units = unitsOf(12)
  const s = normalizeScript({
    scene: { location: '卧室' }, cast: [],
    lines: [{ u: 'U3', scene: { eros: 'tease' } }, { u: 'U5', scene: { eros: 'fast' } }, { u: 'U10', scene: { eros: 'none' } }],
    images: [{ after: 'U1', until: 'U2', moment: '两人进了卧室' }, { after: 'U4', until: 'U5', title: '床上', moment: '她压在他身上', who: ['林岚', '我'], nsfw: true }],
  }, units, { maxImages: 3 })
  assert.deepEqual(s.images.map(i => [i.after, i.until, Boolean(i.nsfw)]), [['U1', 'U2', false], ['U4', 'U9', true], ['U7', 'U9', true]])
  // 一直到这一轮结束：until 省略
  const open = normalizeScript({ scene: { location: '卧室', eros: 'slow' }, cast: [], lines: [], images: [{ after: 'U2', until: 'U3', moment: 'x', nsfw: true }, { after: 'U6', until: 'U7', moment: 'y', nsfw: true }] }, unitsOf(8), { maxImages: 2 })
  assert.deepEqual(open.images.map(i => [i.after, i.until]), [['U2', undefined], ['U6', undefined]])
  // 没开节奏底（设置里关了亲密场面）：照导演写的
  const plain = normalizeScript({ scene: { location: '卧室' }, cast: [], lines: [], images: [{ after: 'U2', until: 'U3', moment: 'x', nsfw: true }, { after: 'U6', until: 'U7', moment: 'y', nsfw: true }] }, unitsOf(8), { maxImages: 2 })
  assert.deepEqual(plain.images.map(i => [i.after, i.until]), [['U2', 'U3'], ['U6', 'U7']])
  // 直接调：没变的不碰
  const imgs = [{ after: 'U1', until: 'U1' }, { after: 'U3' }]
  holdIntimateImages(imgs, ids(5), [[2, 3]])
  assert.deepEqual(imgs, [{ after: 'U1', until: 'U1' }, { after: 'U3' }])
})

test('gate: 剧场里老脚本也一样：插画盖住整段亲密场面，一张接一张；这段里台上的人退下（节奏底开着）', () => {
  const units = unitsOf(10)
  // 老脚本：导演那时把 until 写得很短
  const script = { scene: { location: '卧室' }, cast: [{ name: '林岚', pos: 'center' }], lines: { U3: { scene: { eros: 'slow' } }, U6: { scene: { eros: 'frantic' } }, U9: { scene: { eros: 'none' } } }, images: [], choices: [] }
  const ready = (id, after, until) => ({ id, turn: 1, textVersion: 'v1', after, until, current: 0, versions: [{ assetId: id }] })
  const { beats } = buildBeats({ turns: [{ turn: 1, textVersion: 'v1', status: 'ready', units, script }], images: [ready('a', 'U4', 'U4'), ready('b', 'U6', 'U7')] })
  assert.deepEqual(beats.map(b => (b.cg ? b.cg.id : '-')), ['-', '-', '-', 'a', 'a', 'b', 'b', 'b', '-', '-'])
  // 立绘退下的那几句（Stage.jsx 的 Cast 按 scene.eros 让开）：U3 开始，U9 写 none 回来
  assert.deepEqual(beats.map(b => b.scene.eros !== 'none'), [false, false, true, true, true, true, true, true, false, false])
  // 玩家在改词里定了显示到 U4：照他的
  const pinned = buildBeats({ turns: [{ turn: 1, textVersion: 'v1', status: 'ready', units, script }], images: [{ ...ready('a', 'U4', 'U4'), untilByUser: true }] })
  assert.deepEqual(pinned.beats.map(b => (b.cg ? b.cg.id : '-')), ['-', '-', '-', 'a', '-', '-', '-', '-', '-', '-'])
})

test('提示词：露骨的插画从这段开始演到这段结束；eros 开着时立绘退下；目标写了画幅照写', () => {
  const system = fill(DIRECTOR_SYSTEM, { maxImages: '1', nsfwMin: '2', nsfwMax: '2' })
  assert.match(system, /露骨的（nsfw）不一样：剧场里这段性爱从头到尾由插画来演/)
  assert.match(system, /中途换动作、换体位、换节奏都不收/)
  assert.match(DIRECTOR_EROS, /eros 开着的那几句剧场里立绘退下/)
  assert.match(CG_SYSTEM, /目标里写了「画幅已经定了」的照写/)
})

test('插画方向的设置：auto / landscape / portrait，别的值回到 auto', () => {
  assert.equal(resolveConfig({}).images.cgShape, 'auto')
  assert.equal(resolveConfig({ images: { cgShape: 'portrait' } }).images.cgShape, 'portrait')
  assert.equal(resolveConfig({ images: { cgShape: 'square' } }).images.cgShape, 'auto')
  assert.equal(fixedCgShape(resolveConfig({ images: { cgShape: 'landscape' } })), 'landscape')
  assert.equal(fixedCgShape(resolveConfig({})), '')
})

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')

function fakeTavern() {
  const items = new Map()
  let seq = 0
  return {
    apiVersion: 1, items,
    async attach({ gameId, turn, textVersion, item }) { const id = 'm' + ++seq; items.set(id, { id, gameId, turn, textVersion, ...item, current: true }); return { id } },
    async update(id, changes) { const item = items.get(id); Object.assign(item, changes); return item },
    async remove(id) { return items.delete(id) },
    async list({ gameId }) { return [...items.values()].filter(i => i.gameId === gameId) },
    async getTurn() { return null },
    async getCardContext() { return null },
    async backgroundModel() { return { provider: 'host', model: 'host-1' } },
  }
}

async function settle(engine, gameId, done, ms = 8000) {
  const end = Date.now() + ms
  for (;;) {
    const view = await engine.gameView(gameId)
    if (done(view)) return view
    if (Date.now() > end) throw new Error('等出图超时：' + JSON.stringify(view.images.map(i => [i.status, i.error])))
    await new Promise(r => setTimeout(r, 20))
  }
}

async function playTurn(shape, writerSize) {
  const dir = await mkdtemp(join(tmpdir(), 'flowgal-shape-'))
  const store = createStore(dir)
  const calls = []
  const director = JSON.stringify({
    scene: { location: '海边', time: 'evening', bg: 'beach, sunset, scenery, no humans' },
    cast: [{ name: '林岚', pos: 'center' }], lines: [],
    images: [{ after: 'U2', title: '海边', moment: '林岚站在海边', who: ['林岚'] }],
    people: [{ name: '林岚', gender: 'female', appearance: '1girl, long black hair', outfit: '连衣裙', outfitTags: 'white sundress' }],
  })
  const writer = request => {
    const ids = [...request.messages[0].content[0].text.matchAll(/^- (c\d+)：/gm)].map(m => m[1])
    return JSON.stringify({ images: ids.map(key => ({ key, tag: 'beach, sunset', nl: 'A beach.', size: writerSize, characters: [{ name: '林岚', tag: 'girl, standing', nl: '' }] })) })
  }
  const llm = {
    stream(request) {
      calls.push(request)
      const text = request.system.includes('你是视觉小说的插画分镜师') ? writer(request) : director
      return (async function* () { yield { type: 'text-delta', text }; yield { type: 'finish', reason: { kind: 'stop' } } })()
    },
  }
  const requests = []
  const fetchImpl = async (url, init) => { requests.push(init?.body ? JSON.parse(init.body) : null); return new Response(PNG, { status: 200, headers: { 'content-type': 'image/png' } }) }
  const engine = createEngine({ store, services: { tavern: fakeTavern(), llm, credentials: null }, fetchImpl, logger: { warn() {}, info() {} } })
  try {
    await engine.patchConfig({ images: { backgrounds: false, portraits: false, expressions: false, maxPerTurn: 1, cgShape: shape } })
    await engine.setSecret('novelai', 'official', 'pst-test-key')
    await engine.onTurnSettled({ gameId: 'g', turn: 1, textVersion: 'v1', text: '傍晚。\n她站在海边。\n风很大。', card: { id: 'c', name: '卡' } })
    const view = await settle(engine, 'g', v => v.images.length === 1 && v.images[0].status === 'ready')
    const writerUser = calls.find(c => c.system.includes('你是视觉小说的插画分镜师')).messages[0].content[0].text
    const sent = requests.filter(r => r?.parameters?.v4_prompt).at(-1).parameters
    return { image: view.images[0], writerUser, size: [sent.width, sent.height] }
  } finally {
    await rm(dir, { recursive: true, force: true, maxRetries: 20, retryDelay: 50 })
  }
}

test('gate: 插画方向定成竖图时分镜师写横图也出竖图，分镜师看得到；交给 AI 时照分镜师写的', async () => {
  const fixed = await playTurn('portrait', 'landscape')
  assert.equal(fixed.image.shape, 'portrait')
  assert.deepEqual(fixed.size, [832, 1216])
  assert.match(fixed.writerUser, /画幅已经定了：竖图（size 写 portrait，按这个方向构图）/)
  const auto = await playTurn('auto', 'landscape')
  assert.equal(auto.image.shape, 'landscape')
  assert.deepEqual(auto.size, [1216, 832])
  assert.doesNotMatch(auto.writerUser, /画幅已经定了/)
})
