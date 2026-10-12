// 小瞬间：拍照、触碰、摸头、戳脸、干杯、烟花、做好一道菜、新称呼、约定、交换联系方式。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { normalizeScript } from '../lib/director.js'
import { MOMENTS, CHEERS, MAX_MOMENTS_PER_TURN } from '../lib/vocab.js'
import { FOLEY, MOMENT_FOLEY } from '../lib/foley.js'
import { buildBeats, beatHold, MOMENT_LEAD_MS } from '../src/client/theater/playback.js'

const unitsOf = n => Array.from({ length: n }, (_, i) => ({ id: 'U' + (i + 1), type: 'dialogue', text: '句' + i }))

test('gate: 导演写的小瞬间：认得的种类才收；新称呼、约定、做菜没写 text 不收；干杯认中文材质，认不出按玻璃；地点只给约定', () => {
  const normalized = list => {
    const units = unitsOf(list.length)
    const script = normalizeScript({ scene: {}, cast: [], lines: list.map((moment, i) => ({ u: 'U' + (i + 1), sp: '林岚', moment })) }, units)
    return units.map(u => script.lines[u.id].moment)
  }
  assert.deepEqual(normalized([
    { kind: 'photo', text: '摩天轮前的合影', place: '游乐园' },
    { kind: 'cheers', text: '易拉罐' },
    { kind: 'cheers', text: '纸杯' },
    { kind: 'nickname', who: '林岚' },
  ]), [{ kind: 'photo', text: '摩天轮前的合影' }, { kind: 'cheers', text: 'can' }, { kind: 'cheers', text: 'glass' }, undefined])
  assert.deepEqual(normalized([
    { kind: 'promise', text: '周六上午十点', place: '车站前' },
    { kind: 'fireworks', text: '砰' },
    { kind: 'hug', who: '林岚' },
    'photo',
  ]), [{ kind: 'promise', text: '周六上午十点', place: '车站前' }, { kind: 'fireworks' }, undefined, undefined])
})

test('gate: 一轮最多几个小瞬间；新称呼、约定、交换联系方式一轮只留第一次', () => {
  const units = unitsOf(MAX_MOMENTS_PER_TURN + 3)
  const crowded = normalizeScript({ scene: {}, cast: [], lines: units.map(u => ({ u: u.id, sp: '林岚', moment: { kind: 'pat', who: '苏晴' } })) }, units)
  assert.equal(Object.values(crowded.lines).filter(l => l.moment).length, MAX_MOMENTS_PER_TURN)

  const three = unitsOf(3)
  const once = normalizeScript({ scene: {}, cast: [], lines: [
    { u: 'U1', sp: '林岚', moment: { kind: 'nickname', who: '林岚', text: '笨蛋' } },
    { u: 'U2', sp: '林岚', moment: { kind: 'nickname', who: '林岚', text: '小笨蛋' } },
    { u: 'U3', sp: '林岚', moment: { kind: 'contact', who: '林岚' } },
  ] }, three)
  assert.deepEqual(three.map(u => once.lines[u.id].moment && once.lines[u.id].moment.text), ['笨蛋', undefined, undefined])
  assert.equal(once.lines.U3.moment.kind, 'contact')
})

test('gate: 小瞬间跟着这一拍走；拍照、烟花、卡片等一下再出字，摸头、触碰、干杯不等', () => {
  const units = unitsOf(4)
  const script = { scene: {}, cast: [{ name: '林岚', pos: 'left' }], lines: {
    U1: { sp: '林岚', moment: { kind: 'photo', text: '合影' } },
    U2: { sp: '林岚', moment: { kind: 'pat', who: '林岚' } },
    U3: { sp: '林岚', moment: { kind: 'promise', text: '明天' } },
    U4: { sp: '林岚' },
  } }
  const { beats } = buildBeats({ turns: [{ turn: 1, textVersion: 'v1', units, script }], images: [] })
  assert.deepEqual(beats.map(b => b.moment && b.moment.kind), ['photo', 'pat', 'promise', undefined])
  const was = { place: beats[1].scene.location, mode: '' }
  assert.equal(beatHold(beats[1], { was }).ms, 0)
  assert.equal(beatHold(beats[2], { was }).ms, MOMENT_LEAD_MS.promise)
  assert.equal(beatHold(beats[2], { was }).away, false, '对话框不让开')
})

test('gate: 每个小瞬间都有声音：拟音配方齐全、写法对', () => {
  for (const kind of MOMENTS) {
    if (kind === 'cheers') for (const cup of CHEERS) assert.ok(FOLEY['clink-' + cup], cup)
    else if (kind === 'fireworks') assert.ok(FOLEY['firework-launch'] && FOLEY['firework-boom'])
    else assert.ok(FOLEY[MOMENT_FOLEY[kind]], kind)
  }
  const waves = new Set(['sine', 'triangle', 'square', 'sawtooth', 'noise'])
  for (const [id, parts] of Object.entries(FOLEY)) {
    assert.ok(parts.length > 0, id)
    for (const part of parts) assert.ok(waves.has(part.wave) && part.f > 0 && part.dur > 0 && part.gain > 0 && part.gain <= 0.4 && (part.at || 0) >= 0, id)
  }
})
