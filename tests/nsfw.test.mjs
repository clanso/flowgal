// 露骨的场面：导演标 nsfw，这段至少画两张（导演只挑了一张时插件在同一段里补一张），标记一路带到出图、鉴赏和改词。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { normalizeScript, fitImages } from '../lib/director.js'
import { resolveCgPrompt, fallbackCg } from '../lib/illustrator.js'
import { DIRECTOR_SYSTEM, fill } from '../lib/prompts.js'
import { createStore } from '../lib/dsh/store.js'
import { createEngine } from '../lib/engine.js'

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')
const units = Array.from({ length: 9 }, (_, i) => ({ id: 'U' + (i + 1), text: `第 ${i + 1} 句。`, type: 'narration' }))
const script = images => normalizeScript({ scene: { location: '卧室' }, cast: [], lines: [], images }, units, { maxImages: 1 })

test('导演只挑了一张露骨的：标上 nsfw，同一段里补一张，名额先给露骨的', () => {
  const s = script([
    { after: 'U1', title: '进门', moment: '两人进了卧室' },
    { after: 'U3', until: 'U7', title: '床上', moment: '她压在他身上', who: ['林岚', '我'], nsfw: 'true' },
  ])
  assert.equal(s.images.length, 2, '每轮 1 张的设置下也画两张')
  assert.deepEqual(s.images.map(i => i.nsfw), [true, true])
  assert.equal(s.images[0].moment, '她压在他身上')
  const extra = s.images[1]
  assert.equal(extra.after, 'U5', '补的那张在这段的中间')
  assert.equal(extra.until, 'U7')
  assert.equal(extra.title, '床上（二）')
  assert.deepEqual(extra.who, ['林岚', '我'])
  assert.match(extra.moment, /^她压在他身上（同一段的另一张：换一个明显不同的景别和机位/)
})

test('露骨的已经有两张就不补；张数设得高时不露骨的照留；不露骨的照旧按上限', () => {
  const two = script([{ after: 'U2', moment: 'a', nsfw: true }, { after: 'U4', moment: 'b', nsfw: true }, { after: 'U6', moment: 'c', nsfw: true }])
  assert.deepEqual(two.images.map(i => i.moment), ['a', 'b'])
  const wide = fitImages([{ after: 'U1', moment: '进门' }, { after: 'U3', moment: '床上', nsfw: true }], 3, units.map(u => u.id))
  assert.deepEqual(wide.map(i => [i.after, Boolean(i.nsfw)]), [['U1', false], ['U3', true], ['U6', true]])
  const plain = script([{ after: 'U1', moment: 'a' }, { after: 'U2', moment: 'b' }])
  assert.deepEqual(plain.images.map(i => i.moment), ['a'])
  assert.equal(plain.images[0].nsfw, undefined)
  // 关掉插画（每轮 0 张）时露骨的也不画
  assert.deepEqual(fitImages([{ after: 'U3', moment: 'x', nsfw: true }], 0, units.map(u => u.id)), [])
  // 在这一轮最后一句：补的那张也挂在那里
  assert.deepEqual(fitImages([{ after: 'U9', moment: 'x', nsfw: true }], 1, units.map(u => u.id)).map(i => i.after), ['U9', 'U9'])
})

test('导演提示词写明露骨的标 nsfw、至少两张；每轮 1 张时可以到 2 张', () => {
  const system = fill(DIRECTOR_SYSTEM, { maxImages: '1', nsfwMin: '2', nsfwMax: '2' })
  assert.match(system, /这样的瞬间写 nsfw: true。这一轮正文有露骨的性场面时，这段场面至少画 2 张/)
  assert.match(system, /最多 1 张（有露骨的性场面时照上面标 nsfw 那一条，可以到 2 张）/)
})

test('标了露骨的：Base 一定带 nsfw，保底的也带', () => {
  const lookup = () => null
  const resolved = resolveCgPrompt({ tags: 'bedroom, night', nsfw: true, characters: [{ name: 'x', tag: 'girl, nude', nl: '' }] }, lookup, [])
  assert.match(resolved.tags, /^1girl, nsfw, bedroom, night$/)
  assert.equal(resolveCgPrompt({ tags: 'nsfw, bed', nsfw: true }, lookup, []).tags, 'nsfw, bed', '写过的不重复')
  assert.equal(resolveCgPrompt({ tags: 'bed' }, lookup, []).tags, 'bed')
  assert.equal(fallbackCg({ who: [], nsfw: true }, lookup, { bg: 'bedroom' }).nsfw, true)
})

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

test('gate: 一轮里只挑了一张露骨的，出两张都标 NSFW；分镜师看得到标记，Base 都带 nsfw；改词里能取消标记', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'flowgal-nsfw-'))
  try {
    const store = createStore(dir)
    const tavern = fakeTavern()
    const calls = []
    const director = JSON.stringify({
      scene: { location: '卧室', time: 'night', bg: 'bedroom, night, scenery, no humans' },
      cast: [{ name: '林岚', pos: 'center' }],
      lines: [],
      images: [{ after: 'U2', title: '夜里', moment: '林岚在床上', who: ['林岚'], nsfw: true }],
      people: [{ name: '林岚', gender: 'female', appearance: '1girl, long black hair', outfit: '睡衣', outfitTags: 'white nightgown' }],
    })
    const writer = request => {
      const ids = [...request.messages[0].content[0].text.matchAll(/^- (c\d+)：/gm)].map(m => m[1])
      // 分镜师漏写了 nsfw：插件照样补上
      return JSON.stringify({ images: ids.map(key => ({ key, tag: 'bedroom, night, bed', nl: 'A dim bedroom.', characters: [{ name: '林岚', tag: 'girl, lying on bed', nl: '' }] })) })
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
    const engine = createEngine({ store, services: { tavern, llm, credentials: null }, fetchImpl, logger: { warn() {}, info() {} } })
    await engine.patchConfig({ images: { backgrounds: false, portraits: false, expressions: false, maxPerTurn: 1 } })
    await engine.setSecret('novelai', 'official', 'pst-test-key')
    await engine.onTurnSettled({ gameId: 'g', turn: 1, textVersion: 'v1', text: '夜深了。\n她躺到床上。\n灯灭了。\n她轻声说话。', card: { id: 'c', name: '卡' } })
    const view = await settle(engine, 'g', v => v.images.length === 2 && v.images.every(i => i.status === 'ready'))
    assert.deepEqual(view.images.map(i => i.nsfw), [true, true])
    assert.deepEqual(view.images.map(i => i.after).sort(), ['U2', 'U3'])
    const writerUser = calls.find(c => c.system.includes('你是视觉小说的插画分镜师')).messages[0].content[0].text
    assert.equal(writerUser.match(/露骨（nsfw）：照第七节如实画/g).length, 2)
    const bases = requests.filter(r => r?.parameters?.v4_prompt).map(r => r.parameters.v4_prompt.caption.base_caption)
    assert.equal(bases.length, 2)
    for (const base of bases) assert.match(base, /^1girl, .*\bnsfw, bedroom, night, bed\b/)
    // 改词里取消标记：重画时不再补 nsfw
    const id = view.images[0].id
    await engine.renderCg('g', id, { nsfw: false })
    const after = await settle(engine, 'g', v => { const i = v.images.find(x => x.id === id); return i.versions.length === 2 && i.status === 'ready' })
    assert.equal(after.images.find(i => i.id === id).nsfw, false)
    assert.doesNotMatch(requests.at(-1).parameters.v4_prompt.caption.base_caption, /nsfw/)
  } finally {
    // 画好的图另存进图片文件夹是在后台写的：删目录时等它写完
    await rm(dir, { recursive: true, force: true, maxRetries: 20, retryDelay: 50 })
  }
})
