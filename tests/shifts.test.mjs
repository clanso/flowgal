// 一轮里中途变的样子：一轮正文可能写了好几幕，中途才捡到、缠上的发带，前面几幕的立绘、插画不该带着。
// 导演在变化那一句写 look（从这一句起），people 照样记这一轮结束时的样子；剧场、立绘、插画按这一句前后分开。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { segmentTurn } from '../lib/segment.js'
import { normalizeScript } from '../lib/director.js'
import { buildBeats } from '../src/client/theater/playback.js'
import { shiftsAhead, undoShifts, thenLook, pickSprite, variantKey, lookAt } from '../lib/look.js'
import { settleShifts, applyPeople } from '../lib/cast.js'
import { encodePng } from '../lib/image/png.js'
import { createStore } from '../lib/dsh/store.js'
import { createEngine } from '../lib/engine.js'

const PENDANT = { name: '项链', tags: 'blue teardrop gem pendant' }
const TIRED = { name: '黑眼圈', tags: 'dark circles' }
const RIBBON = { name: '手腕发带', tags: 'dark green ribbon tied around wrist' }
const CHLOE = { name: '柯萝伊', gender: 'female', appearance: { sex: '1girl', hair: 'long curly light brown hair' }, outfit: '炼金术师短外套', outfitTags: 'dark blue cropped jacket' }

test('gate: 导演在变化那一句写 look：只收写了变化的；写在不演的单元上的挪到下一句；每一句还没发生的变化、倒回去的样子', () => {
  const units = segmentTurn(['▍第一幕', '她攥着胸前的宝石。', '【发带挂在石棱上】', '她把发带缠在左手腕上。', '“走吧。”', '她摘下项链。'].join('\n'))
  const [, u2, u3, u4, u5, u6] = units.map(u => u.id)
  const s = normalizeScript({
    scene: { location: '回廊' },
    skip: [u3],
    lines: [
      { u: u3, look: [{ name: '柯萝伊', on: [RIBBON] }] },
      { u: u5, sp: '柯萝伊', look: [{ name: '柯萝伊' }, { name: '路人', outfitTags: 'x' }] },
      { u: u6, look: [{ name: '柯萝伊', off: ['项链', { name: '项链' }], on: { name: '围巾', tags: 'scarf' } }] },
    ],
  }, units)
  assert.deepEqual(s.lines[u4].look, [{ name: '柯萝伊', on: [RIBBON] }], '舞台指示那一句的挪到后面第一句要演的')
  assert.equal(s.lines[u5].look, undefined, '什么都没写的不收')
  assert.deepEqual(s.lines[u6].look, [{ name: '柯萝伊', on: [{ name: '围巾', tags: 'scarf' }], off: [{ name: '项链' }] }])
  const lines = units.filter(u => u.id !== u3).map(u => s.lines[u.id] || {})
  const ahead = shiftsAhead(lines)
  assert.deepEqual(ahead.map(a => (a ? a.柯萝伊.length : 0)), [2, 2, 1, 1, 0], '缠上那一句起只剩后面的摘项链')
  assert.equal(ahead[0], ahead[1], '没变化的几句共用')
  assert.ok(u2)
  // 倒回去：结束时戴着发带和围巾、没有项链 → 一开头有项链、没发带和围巾
  const end = { outfit: '炼金术师短外套', states: [TIRED, RIBBON, { name: '围巾', tags: 'scarf' }] }
  const undo = s.lines[u6].look[0]
  undo.off[0].tags = PENDANT.tags
  assert.deepEqual(undoShifts(end, ahead[0].柯萝伊), { name: '柯萝伊', shift: true, states: [TIRED, { name: '项链', tags: PENDANT.tags }] })
  assert.deepEqual(undoShifts(end, ahead[2].柯萝伊).states.map(x => x.name), ['黑眼圈', '手腕发带', '项链'])
  assert.equal(undoShifts(end, null), null)
  // 换衣服：倒回去穿换之前那套
  assert.deepEqual(undoShifts({ outfit: '睡衣', states: [] }, [{ name: '柯萝伊', outfit: '睡衣', from: '炼金术师短外套' }]), { name: '柯萝伊', shift: true, outfit: '炼金术师短外套' })
})

test('gate: 跟 people 对齐：people 写的是结束时的样子、开头的样子、没写，都推成结束时的；本来就戴着的「戴上」去掉；换衣服记下换之前那套', () => {
  const lines = { U5: { look: [{ name: '柯萝伊', on: [RIBBON] }] } }
  // 驾驶员这一局：people 写的就是结束时的样子（三个状态），发带在第五句才缠上
  let script = { lines: structuredClone(lines), people: [{ ...CHLOE, states: [PENDANT, TIRED, RIBBON] }] }
  settleShifts({}, null, script, 2)
  assert.deepEqual(script.people[0].states.map(x => x.name), ['项链', '黑眼圈', '手腕发带'])
  assert.deepEqual(script.lines.U5.look, [{ name: '柯萝伊', on: [RIBBON] }])
  assert.deepEqual(undoShifts({ states: script.people[0].states }, script.lines.U5.look).states.map(x => x.name), ['项链', '黑眼圈'], '缠上之前：有项链和黑眼圈，没有发带')
  // people 写成开头的样子：推到结束时
  script = { lines: structuredClone(lines), people: [{ ...CHLOE, states: [PENDANT, TIRED] }] }
  settleShifts({}, null, script, 2)
  assert.deepEqual(script.people[0].states.map(x => x.name), ['项链', '黑眼圈', '手腕发带'])
  // 上一轮就缠着了、这一轮又写「缠上」：不算变化
  const game = { cast: { 柯萝伊: { name: '柯萝伊', versions: [{ fromTurn: 0, tags: '1girl' }] } }, looks: { 柯萝伊: { states: [{ fromTurn: 1, list: [PENDANT, RIBBON] }], wear: [{ fromTurn: 1, outfit: '炼金术师短外套' }] } } }
  script = { lines: structuredClone(lines), people: [] }
  settleShifts(game, null, script, 2)
  assert.equal(script.lines.U5.look, undefined)
  // 摘下：从上一轮的样子补上 tag；没写 people 的推成结束时的
  script = { lines: { U3: { look: [{ name: '柯萝伊', off: [{ name: '项链' }] }] } }, people: [] }
  settleShifts(game, null, script, 2)
  assert.deepEqual(script.lines.U3.look[0].off, [PENDANT])
  assert.deepEqual(script.people, [{ name: '柯萝伊', states: [RIBBON] }])
  // 换衣服：people 写的是开头穿的睡衣（新衣服），中途换上铠甲 → 结束时穿铠甲，睡衣进衣橱，换之前是睡衣
  script = { lines: { U4: { look: [{ name: '柯萝伊', outfit: '铠甲', outfitTags: 'silver armor' }] } }, people: [{ name: '柯萝伊', outfit: '睡衣', outfitTags: 'pale blue pajamas' }] }
  const wardrobe = settleShifts(game, null, script, 2)
  assert.deepEqual([script.people[0].outfit, script.people[0].outfitTags, script.lines.U4.look[0].from], ['铠甲', 'silver armor', '睡衣'])
  assert.deepEqual(wardrobe.map(w => w.outfit).sort(), ['睡衣', '铠甲'])
  // people 写的就是换上的铠甲：换之前是上一轮穿的
  script = { lines: { U4: { look: [{ name: '柯萝伊', outfit: '铠甲' }] } }, people: [{ name: '柯萝伊', outfit: '铠甲', outfitTags: 'silver armor' }] }
  settleShifts(game, null, script, 2)
  assert.equal(script.lines.U4.look[0].from, '炼金术师短外套')
  applyPeople(game, null, script.people, 2)
  assert.equal(lookAt({ wear: game.looks.柯萝伊.wear, outfits: {} }, 2).outfit, '铠甲', '档案按轮记结束时的样子，下一轮接着')
})

test('gate: 引擎：发带第三句才缠上 → 前两句的立绘按没有发带的另画一套（这一轮早些时候），插画也不带；剧场按这一句前后挑；重新整理时导演看这一轮开头的样子', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'flowgal-shift-'))
  try {
    const store = createStore(dir)
    const tavern = fakeTavern()
    const { requests, fetchImpl } = fakeNai()
    const director = {
      scene: { location: '珍珠色回廊', time: 'night' },
      cast: [{ name: '柯萝伊', pos: 'center' }],
      people: [{ ...CHLOE, states: [TIRED, RIBBON] }],
      lines: [
        { u: 'U1', sp: '柯萝伊' },
        { u: 'U2', sp: '柯萝伊', emo: 'sad' },
        { u: 'U3', look: [{ name: '柯萝伊', on: [RIBBON] }] },
        { u: 'U4', sp: '柯萝伊', emo: 'sad' },
      ],
      images: [{ after: 'U2', title: '石棱', tags: '@柯萝伊, kneeling, corridor' }],
    }
    const prompts = []
    const llm = { stream(req) { prompts.push(JSON.stringify(req)); return (async function* () { yield { type: 'text-delta', text: JSON.stringify(director) }; yield { type: 'finish', reason: { kind: 'stop' } } })() } }
    const engine = createEngine({ store, services: { tavern, llm }, fetchImpl, logger: { warn() {}, info() {} } })
    await engine.patchConfig({ images: { auto: true, maxPerTurn: 1, backgrounds: false, spriteWriter: false, faceSwap: false, portraits: true, expressions: true, sizes: { portrait: [64, 96], landscape: [96, 64] } } })
    await engine.setSecret('novelai', 'official', 'k')
    const text = '“走吧。”\n“那是……”\n她把它缠在左手腕上。\n“我会找到你的。”'
    const turn = { gameId: 'g', turn: 1, textVersion: 'v1', text, rawText: text, card: { name: '柯萝伊' } }
    tavern.turns.set('g:1', turn)
    await engine.onTurnSettled(turn)

    const settle = async (done, what) => {
      for (const end = Date.now() + 6000; ;) {
        const view = await engine.gameView('g')
        const p = view.cast.find(x => x.name === '柯萝伊')
        if (p && done(p, view)) return { view, p }
        if (Date.now() > end) throw new Error('等太久：' + what)
        await new Promise(r => setTimeout(r, 20))
      }
    }
    const { view, p } = await settle((p, v) => Object.values(p.sprites).filter(r => r.assetId).length >= 4 && v.images.some(i => i.status === 'ready'), '四张立绘和一张插画')
    const end = lookAt(p.timeline, 1)
    assert.deepEqual(end.states.map(s => s.name), ['黑眼圈', '手腕发带'], '档案记的是这一轮结束时的样子')
    const before = thenLook(end, undoShifts(end, [{ name: '柯萝伊', on: [RIBBON] }]), p.timeline.outfits)
    assert.deepEqual(before.states.map(s => s.name), ['黑眼圈'])
    for (const emo of ['neutral', 'sad']) {
      assert.ok(p.sprites[variantKey(end, emo)]?.assetId, '缠上之后那套：' + emo)
      const r = p.sprites[variantKey(before, emo)]
      assert.ok(r?.assetId, '缠上之前那套：' + emo)
      assert.equal(r.era, 'earlier')
    }
    const drawn = requests.map(r => JSON.stringify(r))
    assert.equal(drawn.filter(t => t.includes('ribbon tied around wrist')).length, 2, '只有缠上之后的两张立绘带发带')
    const cg = drawn.find(t => t.includes('kneeling'))
    assert.ok(cg && cg.includes('dark circles') && !cg.includes('ribbon'), '挂在缠上之前的插画不带发带')
    // 剧场：前两拍按没有发带的挑，缠上那一拍起按有发带的
    const { beats } = buildBeats({ turns: view.turns, images: [] })
    const pickAt = b => pickSprite(p.sprites, b.ahead?.柯萝伊 ? thenLook(end, undoShifts(end, b.ahead.柯萝伊), p.timeline.outfits) : end, b.emo || 'neutral')
    assert.deepEqual(beats.map(pickAt), [p.sprites[variantKey(before, 'neutral')].assetId, p.sprites[variantKey(before, 'sad')].assetId, p.sprites[variantKey(end, 'neutral')].assetId, p.sprites[variantKey(end, 'sad')].assetId])
    // 重新整理这一轮：导演看到的是这一轮开头的样子（上次整理记下的发带不算进开头）
    await engine.directTurn({ gameId: 'g', turn: 1, force: true })
    assert.equal(prompts.length, 2)
    assert.doesNotMatch(prompts[1], /手腕发带/)
    engine.dispose()
  } finally {
    await rm(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 })
  }
})

function fakeTavern() {
  const turns = new Map()
  const items = new Map()
  let seq = 0
  return {
    apiVersion: 1, turns,
    async attach({ gameId, turn, textVersion, item }) { const id = 'm' + ++seq; items.set(id, { id, gameId, turn, textVersion, ...item, current: true }); return { id } },
    async update(id, changes) { Object.assign(items.get(id), changes) },
    async list({ gameId }) { return [...items.values()].filter(i => i.gameId === gameId) },
    async getTurn({ gameId, turn }) { return turns.get(gameId + ':' + turn) || null },
    async getCardContext() { return null },
    async backgroundModel() { return { provider: 'fake', model: 'fake-1' } },
  }
}
function fakeNai() {
  const requests = []
  const fetchImpl = async (url, init) => {
    const body = JSON.parse(init.body)
    requests.push(body)
    const { width, height } = body.parameters
    return new Response(await encodePng({ width, height, data: new Uint8ClampedArray(width * height * 4).fill(200) }), { status: 200, headers: { 'content-type': 'image/png' } })
  }
  return { requests, fetchImpl }
}
