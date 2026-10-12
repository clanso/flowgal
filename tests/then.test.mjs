// 立绘跟着故事里的时间走：
// - 回忆、梦境这类段落里，导演可以给段落里的人写「当时的样子」（then）：剧场、立绘、插画都按当时的取，回到现实换回来；
// - 长期状态、换装可以改以前的轮次（某个状态哪几轮有、某次换装从哪一轮起），能回滚。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { segmentTurn } from '../lib/segment.js'
import { normalizeScript } from '../lib/director.js'
import { layersByUnit, sceneEnd } from '../lib/scenes.js'
import { buildBeats } from '../src/client/theater/playback.js'
import { thenLook, pickSprite, variantKey, lookKey, lookAt } from '../lib/look.js'
import { personThen, stateSpans, setStateSpans, editLook, rollback, effectivePerson } from '../lib/cast.js'
import { encodePng } from '../lib/image/png.js'
import { createStore } from '../lib/dsh/store.js'
import { createEngine } from '../lib/engine.js'

const ROBE = { name: '柯萝伊', outfit: '魔导师长袍', outfitTags: 'dark green robe, gold embroidery', states: [] }

test('gate: 当时的样子：导演写在进段落那一句，只收写了东西的；同一个段落里叠起来，回到现实、换一种段落就清掉，接着演同一种段落的带到下一轮', () => {
  const units = segmentTurn(['楼梯上，她握着宝石。', '三年前。', '“稍等一下哦。”', '阿黛尔也在。', '她回过神来。', '又做了个梦。'].join('\n'))
  const s = normalizeScript({
    scene: { location: '楼梯' },
    cast: [{ name: '柯萝伊' }, { name: '阿黛尔' }],
    lines: [
      { u: 'U2', mode: 'memory', then: [{ ...ROBE, states: [{ name: '项链', tags: 'pendant' }, { name: '项链' }] }, { name: '路人' }, { name: '阿黛尔', change: { hair: 'short blonde hair', body: 'petite' } }] },
      { u: 'U4', then: [{ name: '柯萝伊', states: [] }] },
      { u: 'U5', mode: 'real' },
      { u: 'U6', mode: 'dream' },
    ],
  }, units)
  assert.deepEqual(s.lines.U2.then, [
    { ...ROBE, states: [{ name: '项链', tags: 'pendant' }] },
    { name: '阿黛尔', change: { hair: 'short blonde hair', body: 'petite' } },
  ], '只写了名字的不收，状态名去重')
  const layers = layersByUnit(s, units)
  assert.deepEqual(layers.map(l => (l ? Object.keys(l.then || {}).join('+') || '-' : '现实')), ['现实', '柯萝伊+阿黛尔', '柯萝伊+阿黛尔', '柯萝伊+阿黛尔', '现实', '-'])
  assert.deepEqual(layers[3].then.柯萝伊, { name: '柯萝伊', states: [] }, '后写的覆盖先写的')
  // 下一轮第一句接着演回忆：当时的样子跟着带过来
  const open = normalizeScript({ scene: { location: '楼梯' }, lines: [{ u: 'U2', mode: 'memory', then: [ROBE] }] }, units)
  const carry = sceneEnd(open).layer
  assert.equal(carry.then.柯萝伊.outfit, '魔导师长袍')
  const next = normalizeScript({ scene: { location: '楼梯' }, lines: [{ u: 'U1', mode: 'memory' }] }, units)
  assert.equal(layersByUnit(next, units, carry)[0].then.柯萝伊.outfit, '魔导师长袍')
  assert.equal(layersByUnit(normalizeScript({ scene: {}, lines: [] }, units), units, carry)[0], null, '没接着演就回到现实')
  // 剧场的每一拍带着当时的样子
  const { beats } = buildBeats({ turns: [{ turn: 1, textVersion: 'v1', units, script: s }], images: [] })
  assert.deepEqual(beats.map(b => Boolean(b.then)), [false, true, true, true, false, false])
})

test('gate: 当时的样子叠在这一轮的样子上：只换写了的项；回忆里的立绘只认同一套，没画好时不借现在那套（先显示剪影）', () => {
  const outfits = { 炼金术师短外套: { tags: 'short alchemist coat' }, 魔导师长袍: { tags: 'robe from wardrobe' } }
  const now = { appearance: '1girl, long red hair', appearanceFields: { other: '1girl, long red hair' }, outfit: '炼金术师短外套', outfitTags: 'short alchemist coat', states: [{ name: '消瘦黑眼圈', tags: 'dark circles' }, { name: '手腕发带', tags: 'wrist ribbon' }] }
  const then = thenLook(now, ROBE, outfits)
  assert.deepEqual(then, { appearance: now.appearance, appearanceFields: now.appearanceFields, outfit: '魔导师长袍', outfitTags: 'robe from wardrobe', states: [] }, '衣橱里有这套就用衣橱的 tag')
  assert.equal(thenLook(now, { name: '柯萝伊', outfit: '新衣服', outfitTags: 'new' }, outfits).outfitTags, 'new')
  assert.deepEqual(thenLook(now, { name: '柯萝伊', outfit: '魔导师长袍' }, outfits).states, now.states, '没写 states 沿用现在的')
  const young = thenLook(now, { name: '柯萝伊', change: { sex: '1girl', hair: 'short red hair', body: 'child' } }, outfits)
  assert.equal(young.appearance, '1girl, short red hair, child')
  assert.notEqual(lookKey(young), lookKey(now), '年轻时的样子另成一套')

  const sprites = { [variantKey(now, 'neutral')]: { assetId: 'now.png' } }
  assert.equal(pickSprite(sprites, { ...then, outfit: '炼金术师短外套' }, 'smile'), 'now.png', '平时：状态不同借同一身衣服的')
  assert.equal(pickSprite(sprites, { ...then, outfit: '炼金术师短外套' }, 'smile', '', { strict: true }), '', '回忆里：不借现在那套')
  sprites[variantKey(then, 'neutral')] = { assetId: 'then.png' }
  assert.equal(pickSprite(sprites, then, 'smile', '', { strict: true }), 'then.png', '同一套里退到平静的')
})

test('gate: 长期状态改以前的轮次：一个状态可以断断续续几段，改起止只动它自己，前后一样的合并；换装改起始轮次、删掉一次；都能回滚', () => {
  const game = { cast: { 柯萝伊: { name: '柯萝伊', versions: [{ fromTurn: 0, tags: '1girl, red hair' }] } }, looks: {} }
  editLook(game, '柯萝伊', { states: [{ name: '消瘦黑眼圈', tags: 'dark circles' }, { name: '双星之泪项链', tags: 'pendant' }, { name: '手腕发带', tags: 'wrist ribbon' }] }, 3)
  editLook(game, '柯萝伊', { states: [{ name: '双星之泪项链', tags: 'pendant' }, { name: '手腕发带', tags: 'wrist ribbon' }] }, 9)
  const names = turn => lookAt({ states: game.looks.柯萝伊.states }, turn).states.map(s => s.name).join('+')
  assert.deepEqual(stateSpans(game.looks.柯萝伊.states).手腕发带, [{ from: 3, to: null, tags: 'wrist ribbon' }])
  // 发带是第 15 轮才拿到的
  editLook(game, '柯萝伊', { stateSpans: { name: '手腕发带', spans: [[15, null]] } })
  assert.deepEqual([3, 9, 14, 15, 20].map(names), ['消瘦黑眼圈+双星之泪项链', '双星之泪项链', '双星之泪项链', '双星之泪项链+手腕发带', '双星之泪项链+手腕发带'])
  assert.equal(game.looks.柯萝伊.states.find(e => e.fromTurn === 15).list.find(s => s.name === '手腕发带').tags, 'wrist ribbon', '没给 tag 沿用原来的')
  assert.equal(game.castLog.at(-1).action, 'span')
  assert.match(game.castLog.at(-1).after, /手腕发带：第 15 轮起/)
  // 黑眼圈只在第 5~6 轮（结束轮次不含）
  game.looks.柯萝伊.states = setStateSpans(game.looks.柯萝伊.states, '消瘦黑眼圈', '', [[5, 7]])
  assert.deepEqual([3, 5, 6, 7].map(names), ['双星之泪项链', '消瘦黑眼圈+双星之泪项链', '消瘦黑眼圈+双星之泪项链', '双星之泪项链'])
  assert.deepEqual(setStateSpans([], '猫耳', 'cat ears', [[2, 4], [8, null]]).map(e => [e.fromTurn, e.list.length]), [[2, 1], [4, 0], [8, 1]], '断断续续几段')
  // 回滚改起止那一次：发带回到第 3 轮起
  rollback(game, game.castLog.findIndex(e => e.action === 'span'))
  assert.deepEqual(stateSpans(game.looks.柯萝伊.states).手腕发带, [{ from: 3, to: null, tags: 'wrist ribbon' }])

  editLook(game, '柯萝伊', { wear: '睡衣' }, 4)
  editLook(game, '柯萝伊', { wear: '校服' }, 8)
  editLook(game, '柯萝伊', { wearMove: { from: 4, to: 6 } })
  assert.deepEqual(game.looks.柯萝伊.wear.map(e => [e.fromTurn, e.outfit]), [[6, '睡衣'], [8, '校服']])
  editLook(game, '柯萝伊', { wearMove: { from: 6, to: 8 } })
  assert.deepEqual(game.looks.柯萝伊.wear.map(e => [e.fromTurn, e.outfit]), [[8, '睡衣']], '挪到已有的那一轮：替换掉它')
  rollback(game, game.castLog.length - 1)
  editLook(game, '柯萝伊', { wearDrop: 8 })
  assert.deepEqual(game.looks.柯萝伊.wear.map(e => [e.fromTurn, e.outfit]), [[6, '睡衣']])
  rollback(game, game.castLog.length - 1)
  assert.deepEqual(game.looks.柯萝伊.wear.map(e => [e.fromTurn, e.outfit]), [[6, '睡衣'], [8, '校服']])
})

// ───────────────────────── 引擎：整条流程 ─────────────────────────

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
function fakeLlm(text) {
  return { stream() { return (async function* () { yield { type: 'text-delta', text }; yield { type: 'finish', reason: { kind: 'stop' } } })() } }
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

test('gate: 引擎：进回忆写了当时的样子 → 当时的衣服进衣橱，立绘按当时的样子另画一套（不带黑眼圈和发带），人物志里能单独重画这套', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'flowgal-then-'))
  try {
    const store = createStore(dir)
    const tavern = fakeTavern()
    const { requests, fetchImpl } = fakeNai()
    const director = {
      scene: { location: '第88层·长楼梯', time: 'night' },
      cast: [{ name: '柯萝伊', pos: 'center' }],
      people: [{ name: '柯萝伊', gender: 'female', appearance: { sex: '1girl', hair: 'long red hair', eyes: 'green eyes' }, outfit: '炼金术师短外套', outfitTags: 'short alchemist coat', states: [{ name: '消瘦黑眼圈', tags: 'dark circles, gaunt' }, { name: '手腕发带', tags: 'wrist ribbon' }] }],
      lines: [
        { u: 'U1', sp: '柯萝伊' },
        { u: 'U2', mode: 'memory', scene: { location: '第60层·深层（三年前）' }, exit: ['*'], enter: [{ name: '柯萝伊' }], then: [ROBE] },
        { u: 'U3', sp: '柯萝伊', emo: 'smile' },
        { u: 'U4', mode: 'real' },
      ],
    }
    const engine = createEngine({ store, services: { tavern, llm: fakeLlm(JSON.stringify(director)) }, fetchImpl, logger: { warn() {}, info() {} } })
    await engine.patchConfig({ images: { auto: false, backgrounds: false, spriteWriter: false, faceSwap: false, maxPerTurn: 0, portraits: true, expressions: true, sizes: { portrait: [64, 96] } } })
    await engine.setSecret('novelai', 'official', 'k')
    const text = '“走吧，去接阿黛尔。”\n三年前。\n“这是中奖了吧？”\n她回过神来。'
    const turn = { gameId: 'g', turn: 1, textVersion: 'v1', text, rawText: text, card: { name: '柯萝伊' } }
    tavern.turns.set('g:1', turn)
    await engine.onTurnSettled(turn)

    const settle = async (done, what) => {
      for (const end = Date.now() + 6000; ;) {
        const view = await engine.gameView('g')
        const p = view.cast.find(x => x.name === '柯萝伊')
        if (p && done(p)) return { view, p }
        if (Date.now() > end) throw new Error('等太久：' + what)
        await new Promise(r => setTimeout(r, 20))
      }
    }
    const { view, p } = await settle(p => Object.values(p.sprites).filter(r => r.assetId).length >= 3, '三张立绘')
    assert.equal(p.timeline.outfits.魔导师长袍.tags, 'dark green robe, gold embroidery', '当时的衣服进衣橱')
    assert.equal(p.outfit, '炼金术师短外套', '现在穿的不变')
    const now = lookAt(p.timeline, 1)
    const then = thenLook(now, ROBE, p.timeline.outfits)
    assert.ok(p.sprites[variantKey(now, 'neutral')]?.assetId, '现在那套的平静立绘')
    for (const emo of ['neutral', 'smile']) {
      const r = p.sprites[variantKey(then, emo)]
      assert.ok(r?.assetId, '回忆里那套：' + emo)
      assert.deepEqual([r.era, r.then.outfit, r.thenTurn, r.appearance], ['memory', '魔导师长袍', 1, '1girl, long red hair, green eyes'])
    }
    const prompts = requests.map(r => JSON.stringify(r))
    const robe = prompts.filter(t => t.includes('dark green robe'))
    assert.equal(robe.length, 2)
    for (const t of robe) assert.doesNotMatch(t, /dark circles|wrist ribbon|alchemist/, '回忆里不带现在的黑眼圈、发带和外套')
    // 剧场：回忆里那几拍按当时的样子挑立绘
    const { beats } = buildBeats({ turns: view.turns, images: [] })
    const smile = beats.find(b => b.emo === 'smile')
    assert.equal(pickSprite(p.sprites, thenLook(now, smile.then.柯萝伊, p.timeline.outfits), 'smile', '', { strict: true }), p.sprites[variantKey(then, 'smile')].assetId)
    assert.deepEqual(beats.map(b => b.cast.map(c => c.name).join()), ['柯萝伊', '柯萝伊', '柯萝伊', '柯萝伊'], '回忆前的那句也在台上')

    // 人物志里点回忆那套重画：按记下的当时样子画，不画成现在的
    const before = requests.length
    await engine.castAction('g', 'sprite', { name: '柯萝伊', emotion: 'neutral', look: lookKey(then), tags: '1girl, dark green robe, gold embroidery, standing' })
    await settle(() => requests.length > before, '重画回忆那套')
    await settle(x => !x.spriteStatus[variantKey(then, 'neutral')], '重画完')
    assert.match(JSON.stringify(requests.at(-1)), /dark green robe/)

    // 改以前的轮次：发带第 5 轮起才有（第 1 轮那套就不带发带了），并补画用到的样子
    const count = requests.length
    await engine.castAction('g', 'look', { name: '柯萝伊', patch: { stateSpans: { name: '手腕发带', spans: [[5, null]] } } })
    const { p: after } = await settle(x => x.sprites[variantKey(lookAt(x.timeline, 1), 'neutral')]?.assetId, '第 1 轮的新样子补画了')
    assert.ok(requests.length > count)
    assert.deepEqual(lookAt(after.timeline, 1).states.map(s => s.name), ['消瘦黑眼圈'])
    assert.ok(after.sprites[variantKey(now, 'neutral')]?.assetId, '带发带的旧那套还留着')
    engine.dispose()
  } finally {
    await rm(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 })
  }
})

test('gate: 短闪回：导演给闪回的几句写 recall（不换场景）；连着的算一段，段里开口的人和当时的样子；进出时起一层薄雾；台词用回忆里的声音；闪回里开口的人不算在场', async () => {
  const { recallRuns } = await import('../lib/scenes.js')
  const { stageWalk } = await import('../lib/staging.js')
  const units = segmentTurn(['发带被她小心地取下来。', '是柯萝伊亲手绣的。', '“那个，阿黛尔。生日快乐。”', '“哎呀……是铃兰呢。”', '“是那家伙的吗？”'].join('\n'))
  const s = normalizeScript({
    scene: { location: '楼梯' },
    cast: [{ name: '柯萝伊', pos: 'left' }, { name: '布琳希尔德', pos: 'right' }],
    lines: [
      { u: 'U3', sp: '柯萝伊', voice: 'echo', recall: true, then: [ROBE] },
      { u: 'U4', sp: '阿黛尔', voice: 'echo', emo: 'happy', recall: 'true' },
      { u: 'U5', sp: '布琳希尔德' },
      { u: 'U1', recall: 'yes' },
      { u: 'U2', mode: 'memory', recall: true },
    ],
  }, units)
  assert.equal(s.lines.U3.recall, true)
  assert.equal(s.lines.U4.recall, true, '照着格式说明写成字符串 "true" 的也收')
  assert.equal(s.lines.U1?.recall, undefined, '只收 true')
  assert.equal(s.lines.U2.recall, undefined, '写了 mode 的就是段落，不算短闪回')
  const plain = { ...s, lines: { ...s.lines, U2: {} } }
  const runs = recallRuns(plain, units)
  assert.deepEqual(runs.map(r => (r ? r.who.join('+') : '-')), ['-', '-', '柯萝伊+阿黛尔', '柯萝伊+阿黛尔', '-'])
  assert.equal(runs[2], runs[3], '同一段共用')
  assert.equal(runs[2].then.柯萝伊.outfit, '魔导师长袍')
  // 剧场：闪回那两拍带着这一段；进出各起一层薄雾；台上还是现在的人（阿黛尔不上台）
  const { beats } = buildBeats({ turns: [{ turn: 1, textVersion: 'v1', units, script: plain }], images: [] })
  assert.deepEqual(beats.map(b => [b.recall ? b.recall.who.join('+') : '', b.recallEdge || '', b.cast.map(c => c.name).join('+')]), [
    ['', '', '柯萝伊+布琳希尔德'],
    ['', '', '柯萝伊+布琳希尔德'],
    ['柯萝伊+阿黛尔', 'in', '柯萝伊+布琳希尔德'],
    ['柯萝伊+阿黛尔', '', '柯萝伊+布琳希尔德'],
    ['', 'out', '柯萝伊+布琳希尔德'],
  ])
  // 闪回里的台词用回忆里的声音（导演照老规矩写的回声也换掉）；闪回外照旧
  assert.deepEqual(beats.map(b => b.voice || ''), ['', '', 'memory', 'memory', ''])
  const phoned = buildBeats({ turns: [{ turn: 1, textVersion: 'v1', units, script: { ...plain, lines: { ...plain.lines, U4: { ...plain.lines.U4, voice: 'phone' } } } }], images: [] }).beats
  assert.equal(phoned[3].voice, 'phone', '闪回里隔着电话的还是电话')
  // 导演把只在闪回里开口的人也列进了 cast：她不上台，只在闪回里浮出来
  const listed = { ...plain, cast: [...plain.cast, { name: '阿黛尔', pos: 'center' }] }
  const before = [{ name: '柯萝伊', pos: 'left' }, { name: '布琳希尔德', pos: 'right' }]
  assert.deepEqual(stageWalk(listed, units, before).steps.map(st => st.cast.map(c => c.name).join('+')), Array(5).fill('柯萝伊+布琳希尔德'))
  // 闪回外也当面说了话的照旧在；第一幕（没有上一轮的名单）照 cast 来
  const spoke = { ...listed, lines: { ...listed.lines, U5: { sp: '阿黛尔' } } }
  assert.equal(stageWalk(spoke, units, before).steps[0].cast.map(c => c.name).join('+'), '柯萝伊+布琳希尔德+阿黛尔')
  assert.equal(stageWalk(listed, units).steps[0].cast.length, 3)
})

test('gate: 正文用【闪回】…【闪回结束】框起来的一段、回忆里的声音：导演没写 recall 也按短闪回演；导演写成回忆段落的不动', async () => {
  const { markRecalls } = await import('../lib/scenes.js')
  const units = segmentTurn(['是柯萝伊亲手绣的。', '【闪回演出：一瞬】', '“那个，阿黛尔。生日快乐。”', '“哎呀……是铃兰呢。”', '【闪回结束】', '“是那家伙的吗？”', '理由很简单：', '“在迷宫里，要好好吃饭哦。”'].join('\n'))
  assert.equal(units.length, 8)
  const [, open, a, b, close, c, , quote] = units.map(u => u.id)
  const s = normalizeScript({
    scene: { location: '回廊' },
    cast: [{ name: '柯萝伊', pos: 'left' }, { name: '布琳希尔德', pos: 'right' }],
    skip: [open, close],
    lines: [
      { u: a, sp: '柯萝伊', voice: 'echo' },
      { u: b, sp: '阿黛尔', voice: 'echo' },
      { u: c, sp: '布琳希尔德' },
      { u: quote, sp: '阿黛尔', voice: 'memory' },
    ],
  }, units)
  const marked = markRecalls(s, units)
  assert.deepEqual(units.map(u => Boolean(marked.lines[u.id]?.recall)), [false, false, true, true, false, false, false, true])
  assert.equal(s.lines[a].recall, undefined, '不改原来的脚本')
  // 剧场：框起来的两句是一段闪回，台词用回忆里的声音；引用的那一句自己是一段
  const { beats } = buildBeats({ turns: [{ turn: 1, textVersion: 'v1', units, script: s }], images: [] })
  assert.deepEqual(beats.map(b => [b.recall ? b.recall.who.join('+') : '', b.recallEdge || '', b.voice || '']), [
    ['', '', ''],
    ['柯萝伊+阿黛尔', 'in', 'memory'],
    ['柯萝伊+阿黛尔', '', 'memory'],
    ['', 'out', ''],
    ['', '', ''],
    ['阿黛尔', 'in', 'memory'],
  ])
  // 导演把框起来的一段写成了回忆段落：照导演的演
  const asMemory = { ...s, lines: { ...s.lines, [a]: { ...s.lines[a], mode: 'memory' }, [c]: { ...s.lines[c], mode: 'real' } } }
  assert.equal(markRecalls(asMemory, units).lines[b].recall, undefined)
  // 没写结束的：只算开头之后连着的台词，遇到旁白就停
  const loose = segmentTurn(['【回忆】', '“你来了。”', '“嗯。”', '她回过神来。', '“走吧。”'].join('\n'))
  const looseScript = { scene: {}, cast: [], lines: {}, skip: [loose[0].id] }
  assert.deepEqual(loose.map(u => Boolean(markRecalls(looseScript, loose).lines[u.id]?.recall)), [false, true, true, false, false])
})

test('gate: 引擎：短闪回里开口的人要立绘——写了当时样子的按当时的画（不带现在的黑眼圈），没写的按现在的', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'flowgal-recall-'))
  try {
    const store = createStore(dir)
    const tavern = fakeTavern()
    const { requests, fetchImpl } = fakeNai()
    const director = {
      scene: { location: '第88层·长楼梯', time: 'night' },
      cast: [{ name: '柯萝伊', pos: 'center' }],
      people: [
        { name: '柯萝伊', gender: 'female', appearance: { sex: '1girl', hair: 'long red hair' }, outfit: '炼金术师短外套', outfitTags: 'short alchemist coat', states: [{ name: '消瘦黑眼圈', tags: 'dark circles, gaunt' }] },
        { name: '阿黛尔', gender: 'female', appearance: { sex: '1girl', hair: 'long blonde hair' }, outfit: '修女服', outfitTags: 'nun habit, white veil' },
      ],
      lines: [
        { u: 'U1', sp: '柯萝伊' },
        { u: 'U2', sp: '柯萝伊', voice: 'echo', recall: true, then: [ROBE] },
        { u: 'U3', sp: '阿黛尔', voice: 'echo', recall: true },
      ],
    }
    const engine = createEngine({ store, services: { tavern, llm: fakeLlm(JSON.stringify(director)) }, fetchImpl, logger: { warn() {}, info() {} } })
    await engine.patchConfig({ images: { auto: false, backgrounds: false, spriteWriter: false, faceSwap: false, maxPerTurn: 0, portraits: true, expressions: false, sizes: { portrait: [64, 96] } } })
    await engine.setSecret('novelai', 'official', 'k')
    const text = '“走吧。”\n“那个，阿黛尔。生日快乐。”\n“哎呀……是铃兰呢。”'
    const turn = { gameId: 'g', turn: 1, textVersion: 'v1', text, rawText: text, card: { name: '柯萝伊' } }
    tavern.turns.set('g:1', turn)
    await engine.onTurnSettled(turn)
    for (const end = Date.now() + 6000; requests.length < 3;) {
      if (Date.now() > end) throw new Error('等太久：三张立绘，只有 ' + requests.length)
      await new Promise(r => setTimeout(r, 20))
    }
    const prompts = requests.map(r => JSON.stringify(r))
    assert.equal(prompts.filter(t => t.includes('dark green robe')).length, 1, '柯萝伊闪回里那套')
    assert.ok(!prompts.find(t => t.includes('dark green robe')).includes('dark circles'))
    assert.equal(prompts.filter(t => t.includes('nun habit')).length, 1, '阿黛尔不在台上，闪回里开口也要一张')
    engine.dispose()
  } finally {
    await rm(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 })
  }
})
