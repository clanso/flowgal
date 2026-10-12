// 亲密场面（R18）的声音与演出：节奏底、触手、一下一下的音效、高潮那一下。只给成年人之间的场面用，画面上不出字。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { normalizeScript, direct } from '../lib/director.js'
import { DEFAULT_CONFIG, resolveConfig } from '../lib/config.js'
import { DIRECTOR_EROS } from '../lib/prompts.js'
import { MAX_SFX_PER_TURN } from '../lib/soundlib.js'
import { ONOMATOPOEIA } from '../lib/foley.js'
import { EROS_FOLEY, EROS_SFX, EROS_ALIAS, EROS_LOOPS, TENTACLE_LOOPS, TENTACLE_SWAP, PEAK_FOLEY, PEAKS, EROS_PACES, TENTACLE, erosSfx, peakOf, MAX_EROS_SFX_PER_TURN, MAX_PEAKS_PER_TURN } from '../lib/eros.js'
import { buildBeats, beatHold, PEAK_LEAD_MS } from '../src/client/theater/playback.js'

const unitsOf = n => Array.from({ length: n }, (_, i) => ({ id: 'U' + (i + 1), type: 'narration', text: '句' + i }))
const beatsOf = (units, script, turn = 1) => ({ turns: [{ turn, textVersion: 'v1', units, script }], images: [] })

test('gate: 故事里写的音效提示（日文拟声、中文）认成亲密音效；普通的话不认', () => {
  const cues = {
    'ぬぷ……ずぷぷ……': '插入',
    '……こつん': '顶到最深',
    'どぷっ……どくっ、どくどくどくっ……': '射精',
    'ずるり、と。湿った音': '触手爬过',
    'ドサ、ドサ……': '倒下',
    '心音——どくん': '心跳',
    'しゅーっ': '喷雾',
    'ずちゅ、ずちゅっ': '抽插',
    '射精': '射精',
    '触手爬过': '触手爬过',
    '进入房间': '',
    '……ぴちゃ': '',
    '': '',
  }
  for (const [text, name] of Object.entries(cues)) assert.equal(erosSfx(text), name, text)
})

test('gate: 导演写的亲密音效照收（名字、日文拟声），跟普通音效分开算名额；高潮那一下认别的写法，也有上限', () => {
  const n = MAX_EROS_SFX_PER_TURN + MAX_SFX_PER_TURN + 4
  const units = unitsOf(n)
  const lines = units.map((u, i) => ({ u: u.id, sfx: i < MAX_EROS_SFX_PER_TURN + 2 ? (i % 2 ? '插入' : 'ずちゅ') : '砰' }))
  const script = normalizeScript({ scene: {}, cast: [], lines }, units)
  const kept = units.map(u => script.lines[u.id] && script.lines[u.id].sfx).filter(Boolean)
  assert.equal(kept.filter(s => EROS_SFX[s]).length, MAX_EROS_SFX_PER_TURN)
  assert.equal(kept.filter(s => ONOMATOPOEIA[s]).length, Math.min(MAX_SFX_PER_TURN, n - MAX_EROS_SFX_PER_TURN - 2))
  assert.deepEqual(['climax', '高潮', '絶頂', 'cum', '内射', 'both', '一起', 'nope', ''].map(peakOf), ['climax', 'climax', 'climax', 'cum', 'cum', 'both', 'both', '', ''])
  const many = unitsOf(MAX_PEAKS_PER_TURN + 2)
  const peaks = normalizeScript({ scene: {}, cast: [], lines: many.map(u => ({ u: u.id, peak: '高潮' })) }, many)
  assert.equal(many.filter(u => peaks.lines[u.id] && peaks.lines[u.id].peak).length, MAX_PEAKS_PER_TURN)
})

test('gate: 写在不演的 [SE] 单元上的音效和高潮挪到后面第一句；场景的节奏和触手照收，乱写的丢掉', () => {
  const units = [{ id: 'U1', type: 'narration', text: '[SE：ぬぷ……ずぷぷ……]' }, { id: 'U2', type: 'narration', text: '一点点被撑开。' }, { id: 'U3', type: 'narration', text: '[SE：どくどく]' }, { id: 'U4', type: 'narration', text: '灌进来了。' }]
  const raw = { scene: { eros: 'slow', tentacle: 'writhe' }, cast: [], skip: ['U1', 'U3'], lines: [{ u: 'U1', sfx: 'ぬぷ' }, { u: 'U2', scene: { eros: 'fast', tentacle: 'nope' } }, { u: 'U3', sfx: '射精', peak: 'cum' }] }
  const script = normalizeScript(raw, units)
  assert.equal(script.scene.eros, 'slow')
  assert.equal(script.scene.tentacle, 'writhe')
  assert.equal(script.lines.U2.sfx, '插入')
  assert.deepEqual(script.lines.U2.scene, { eros: 'fast' })
  assert.equal(script.lines.U4.sfx, '射精')
  assert.equal(script.lines.U4.peak, 'cum')
  assert.equal(normalizeScript({ scene: { eros: 'wild' }, cast: [], lines: [] }, units).scene.eros, 'none')
})

test('gate: 节奏和触手换了地方就收起，不带到下一轮；高潮那一句等白光起来再出字（关了亲密场面就不等）', () => {
  const units = unitsOf(4)
  const first = normalizeScript({ scene: { location: '卧室', eros: 'slow', tentacle: 'idle' }, cast: [], lines: [{ u: 'U2', scene: { eros: 'frantic' }, peak: 'both' }, { u: 'U3', scene: { location: '走廊' } }] }, units)
  const second = normalizeScript({ scene: { location: '走廊' }, cast: [], lines: [] }, unitsOf(1))
  const { beats } = buildBeats({ turns: [{ turn: 1, textVersion: 'v1', units, script: first }, { turn: 2, textVersion: 'v1', units: unitsOf(1), script: second }], images: [] })
  assert.deepEqual(beats.map(b => [b.scene.eros, b.scene.tentacle]), [['slow', 'idle'], ['frantic', 'idle'], ['none', 'none'], ['none', 'none'], ['none', 'none']])
  assert.equal(beats[1].peak, 'both')
  const was = { place: '卧室' }
  assert.equal(beatHold(beats[1], { was }).ms, PEAK_LEAD_MS.both)
  assert.equal(beatHold(beats[1], { was, eros: false }).ms, 0)
  // 上一轮最后还在激烈，这一轮导演没再写：不带过来
  const carried = buildBeats({ turns: [{ turn: 1, textVersion: 'v1', units: unitsOf(1), script: normalizeScript({ scene: { eros: 'frantic' }, cast: [], lines: [] }, unitsOf(1)) }, { turn: 2, textVersion: 'v1', units: unitsOf(1), script: null }], images: [] })
  assert.deepEqual(carried.beats.map(b => b.scene.eros), ['frantic', 'none'])
})

test('gate: 每个亲密音效都有配方、导演的提示词里都列着，别名都指向有的名字，不跟内置拟声词撞名', () => {
  const waves = new Set(['sine', 'triangle', 'square', 'sawtooth', 'noise'])
  const parts = Object.values(EROS_FOLEY).flat()
  for (const p of parts) {
    assert.ok(waves.has(p.wave), p.wave)
    assert.ok(p.f > 0 && p.dur > 0 && p.gain > 0 && p.gain <= 4, JSON.stringify(p))
  }
  for (const [name, { id, group }] of Object.entries(EROS_SFX)) {
    assert.ok(EROS_FOLEY[id], name)
    assert.ok(group === 'body' || group === 'tentacle', name)
    assert.ok(DIRECTOR_EROS.includes(name), `提示词里没有「${name}」`)
    assert.ok(!ONOMATOPOEIA[name], `「${name}」跟内置拟声词撞了`)
  }
  for (const [alias, name] of Object.entries(EROS_ALIAS)) assert.ok(EROS_SFX[name], `${alias} → ${name}`)
  for (const pace of EROS_PACES.filter(k => k !== 'none')) assert.ok(DIRECTOR_EROS.includes(pace), pace)
  for (const kind of TENTACLE.filter(k => k !== 'none')) assert.ok(DIRECTOR_EROS.includes(kind), kind)
  for (const kind of PEAKS) { assert.ok(DIRECTOR_EROS.includes(kind), kind); for (const id of PEAK_FOLEY[kind]) assert.ok(EROS_FOLEY[id], id) }
  // 节奏底和触手用到的每一下都有配方
  for (const loop of Object.values(EROS_LOOPS)) for (const [id] of loop.hits) { assert.ok(EROS_FOLEY[id], id); assert.ok(!TENTACLE_SWAP[id] || EROS_FOLEY[TENTACLE_SWAP[id]], id) }
  for (const loop of Object.values(TENTACLE_LOOPS)) for (const [id] of loop.pool) assert.ok(EROS_FOLEY[id], id)
  // 节奏一级比一级快
  const beats = ['tease', 'slow', 'fast', 'frantic'].map(k => EROS_LOOPS[k].beat)
  assert.deepEqual([...beats].sort((a, b) => b - a), beats)
})

test('gate: 导演的提示词里放着亲密场面这一段；设置里关了就不放', async () => {
  const prompts = []
  const llm = { stream(request) { prompts.push(JSON.stringify(request)); return (async function* () { yield { type: 'text-delta', text: '{"scene":{"eros":"slow"},"lines":[{"u":"U1","sfx":"插入","peak":"climax"}]}' }; yield { type: 'finish', reason: { kind: 'stop' } } })() } }
  const args = { llm, provider: 'fake', model: 'fake-1', units: unitsOf(2), previous: null, castList: [], context: {}, backend: 'novelai' }
  const on = await direct({ ...args, config: DEFAULT_CONFIG })
  assert.match(prompts[0], /亲密场面的声音与演出/)
  assert.equal(on.script.scene.eros, 'slow')
  assert.deepEqual([on.script.lines.U1.sfx, on.script.lines.U1.peak], ['插入', 'climax'])
  assert.equal(resolveConfig({}).ui.eros, true)
  await direct({ ...args, config: resolveConfig({ ui: { eros: false } }) })
  assert.doesNotMatch(prompts[1], /亲密场面的声音与演出/)
})
