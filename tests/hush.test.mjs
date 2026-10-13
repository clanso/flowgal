// 配乐留白：屏住呼吸的那一句配乐停下，几句后自己回到原来的曲子。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { normalizeScript, playingAfter } from '../lib/director.js'
import { DIRECTOR_MUSIC, fill } from '../lib/prompts.js'
import { limitPhrases } from '../lib/limits.js'
const MAX_HUSH_PER_TURN = 2 // 设置里限了数时（默认不限）
import { buildBeats, beatHold, HUSH_BEATS, HUSH_LEAD_MS } from '../src/client/theater/playback.js'

const unitsOf = n => Array.from({ length: n }, (_, i) => ({ id: 'U' + (i + 1), type: 'dialogue', text: '句' + i }))
const trackIds = ['a', 'b']

test('gate: 导演写的留白：认中文写法，不算换歌，一轮有上限；没在放、没有曲库、写在开场上的不收；留白之后写回原来的、换别的照收', () => {
  const list = ['b', 'hush', 'b', '无声', 'a', 'hush', 'b']
  const units = unitsOf(list.length)
  const raw = { scene: { bgm: 'a' }, cast: [], lines: list.map((bgm, i) => ({ u: units[i].id, sp: '林岚', bgm })) }
  const script = normalizeScript(raw, units, { trackIds, limits: { hush: MAX_HUSH_PER_TURN } })
  assert.deepEqual(units.map(u => script.lines[u.id].bgm), ['b', 'hush', 'b', 'hush', 'a', undefined, undefined])
  assert.equal(normalizeScript(raw, units, { trackIds }).lines.U6.bgm, 'hush', '默认不限')
  const hushOnly = normalizeScript({ scene: { bgm: 'a' }, cast: [], lines: [{ u: 'U1', sp: '林岚', bgm: 'hush' }] }, unitsOf(1), { trackIds })
  assert.equal(playingAfter(hushOnly), 'a', '留白不是换歌，下一轮接着放原来的')

  const opening = normalizeScript({ scene: { bgm: 'hush' }, cast: [], lines: [{ u: 'U1', sp: '林岚', bgm: 'hush' }] }, unitsOf(1), { trackIds })
  assert.equal(opening.scene.bgm, '')
  assert.equal(opening.lines.U1.bgm, 'hush')
  const quiet = normalizeScript({ scene: { bgm: 'none' }, cast: [], lines: [{ u: 'U1', sp: '林岚', bgm: '留白' }] }, unitsOf(1), { trackIds })
  assert.equal(quiet.lines.U1.bgm, undefined)
  const bare = normalizeScript({ scene: {}, cast: [], lines: [{ u: 'U1', sp: '林岚', bgm: 'hush' }] }, unitsOf(1))
  assert.equal(bare.lines.U1.bgm, undefined)
})

const play = (lines, n = 8, more = []) => buildBeats({ turns: [{ turn: 1, textVersion: 'v1', units: unitsOf(n), script: { scene: { location: '天台', bgm: 'a' }, cast: [], lines } }, ...more], images: [] }).beats

test('gate: 留白那一句先静一下再出字，连它在内几拍不放配乐，之后回到原来的曲子', () => {
  const beats = play({ U2: { sp: '林岚', bgm: 'hush' } })
  assert.equal(HUSH_BEATS, 5)
  assert.deepEqual(beats.map(b => b.hush), [undefined, 'start', 'on', 'on', 'on', 'on', undefined, undefined])
  assert.ok(beats.every(b => b.bgm === 'a'), '曲子没换，回来接着放')
  const was = { place: '天台', mode: '' }
  assert.equal(beatHold(beats[1], { was }).ms, HUSH_LEAD_MS)
  assert.deepEqual(beatHold(beats[2], { was }), { ms: 0, away: false })
})

test('gate: 写回原来的曲子、换歌、换了地方就提前回来；留白不跨轮', () => {
  assert.deepEqual(play({ U2: { bgm: 'hush' }, U4: { bgm: 'a' } }).map(b => b.hush).slice(0, 5), [undefined, 'start', 'on', undefined, undefined])
  const changed = play({ U2: { bgm: 'hush' }, U4: { bgm: 'b' } })
  assert.deepEqual([changed[3].hush, changed[3].bgm], [undefined, 'b'])
  assert.equal(play({ U2: { bgm: 'hush' }, U3: { scene: { location: '走廊' } } })[2].hush, undefined)
  const next = { turn: 2, textVersion: 'v1', units: unitsOf(2), script: { scene: { location: '天台', bgm: 'a' }, cast: [], lines: {} } }
  const beats = play({ U2: { bgm: 'hush' } }, 2, [next])
  assert.deepEqual(beats.map(b => b.hush), [undefined, 'start', undefined, undefined])
})

test('gate: 导演的配乐规则里写着留白', () => {
  assert.ok(DIRECTOR_MUSIC.includes('bgm: "hush"'))
  assert.ok(fill(DIRECTOR_MUSIC, limitPhrases({ hush: MAX_HUSH_PER_TURN })).includes(`一轮最多 ${MAX_HUSH_PER_TURN} 次，留给真正要静下来的那一下`))
  assert.ok(fill(DIRECTOR_MUSIC, limitPhrases({})).includes('hush 不算换歌，留给真正要静下来的那一下'), '不限时不写数')
})
