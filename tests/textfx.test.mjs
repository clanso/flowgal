// 句中文字效果：一句里某几个字发抖、波浪、放大、吼、越说越大 / 越小、小声、轻淡、发光强调。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { normalizeScript } from '../lib/director.js'
import { planLine, textFxSpans } from '../lib/typing.js'
import { MAX_TEXT_FX_PER_TURN } from '../lib/vocab.js'
import { buildBeats } from '../src/client/theater/playback.js'

const chars = s => Array.from(s)
const plan = (text, opts = {}) => planLine(chars(text), 30, { seed: 'k', ...opts })
const gaps = p => p.times.slice(1).map((t, i) => t - p.times[i])
const kinds = p => p.fx.map(f => f.kind + (f.sound ? ':' + f.sound : ''))

test('gate: 导演写的文字效果：原文里有的字才收下，一句最多两处、一轮有上限，不认得的样子丢掉', () => {
  const units = [
    { id: 'U1', type: 'dialogue', text: '别、别过来……求你了' },
    { id: 'U2', type: 'narration', text: '远处隐约传来钟声。' },
  ]
  const raw = {
    scene: {}, cast: [],
    lines: [
      { u: 'U1', sp: '林岚', textfx: [{ text: '别、别过来', style: 'shake' }, { text: '模型改写过的字', style: 'big' }, { text: '求你了', style: 'explode' }, { text: '求你了', style: 'dwindle' }, { text: '……', style: 'faint' }] },
      { u: 'U2', textfx: { text: '钟声', style: 'faint' } },
    ],
  }
  const script = normalizeScript(raw, units)
  assert.deepEqual(script.lines.U1.textfx, [{ text: '别、别过来', style: 'shake' }, { text: '求你了', style: 'dwindle' }])
  assert.deepEqual(script.lines.U2.textfx, [{ text: '钟声', style: 'faint' }], '旁白也可以写，写成一个对象也认')

  const many = Array.from({ length: MAX_TEXT_FX_PER_TURN + 4 }, (_, i) => ({ id: 'U' + (i + 1), type: 'dialogue', text: '好开心呀～' + i }))
  const crowded = normalizeScript({ scene: {}, cast: [], lines: many.map(u => ({ u: u.id, sp: '苏晴', textfx: [{ text: '好开心呀～', style: 'wave' }] })) }, many)
  assert.equal(Object.values(crowded.lines).filter(l => l.textfx).length, MAX_TEXT_FX_PER_TURN, '一轮里按正文顺序只留前面的')
})

test('gate: 文字效果落在哪几个字上：重叠的往后找，找不到的不演；瞬间显示也有样子', () => {
  assert.deepEqual(textFxSpans(chars('好好好，好好好'), [{ text: '好好好', style: 'wave' }, { text: '好好好', style: 'big' }]), [{ s0: 0, s1: 2, style: 'wave' }, { s0: 4, s1: 6, style: 'big' }])
  assert.deepEqual(textFxSpans(chars('你好'), [{ text: '再见', style: 'big' }, { text: '你', style: 'nope' }]), [])
  const instant = planLine(chars('其实我也不是'), 0, { textfx: [{ text: '也不是', style: 'dwindle' }] })
  assert.deepEqual(instant.tx, ['', '', '', 'dwindle', 'dwindle', 'dwindle'])
  assert.deepEqual(instant.txk.slice(3), [0, 0.5, 1], '越说越小按这段走到几成变')
  assert.deepEqual(instant.txi.slice(3), [0, 1, 2])
  assert.equal(plan('普通的一句').blips, null, '没有文字效果时打字音照常')
})

test('gate: 吼成块砸下来、落下时震屏拍桌；越说越小越来越慢越轻；越说越大越来越快越响', () => {
  const roar = plan('给我滚出去！我不想看见你', { textfx: [{ text: '给我滚出去！', style: 'roar' }] })
  assert.equal(roar.times[0], roar.times[1], '两个字一块')
  assert.deepEqual(kinds(roar), ['shake', 'box', 'flash', 'sound:slam'])
  assert.equal(roar.fx[0].at, roar.times[5], '最后一个字落下那一刻震')
  assert.ok(roar.blips[0].gain > 1.3)
  // 怒吼的整句里有吼的字：在吼的字落下时砸，不在开口时再砸一次
  const shout = plan('不行！你不能去', { say: 'shout', textfx: [{ text: '不行！', style: 'roar' }] })
  assert.equal(shout.fx.filter(f => f.sound === 'slam').length, 1)
  assert.ok(shout.fx.every(f => f.at === shout.times[2]))

  const fade = plan('其实我……也不是那个意思', { textfx: [{ text: '也不是那个意思', style: 'dwindle' }] })
  const g = gaps(fade).slice(-6)
  assert.ok(g.every((x, i) => i === 0 || x >= g[i - 1]), '越往后越慢')
  assert.ok(fade.blips.at(-1).gain < 0.4 && fade.blips.at(-1).gain < fade.blips[6].gain, '越来越轻')
  assert.equal(fade.fx.length, 0)

  const grow = plan('你到底要我怎样啊', { textfx: [{ text: '你到底要我怎样啊', style: 'grow' }] })
  const gg = gaps(grow)
  assert.ok(gg.at(-1) < gg[0], '越说越快')
  assert.ok(grow.blips.at(-1).gain > grow.blips[0].gain)
  assert.deepEqual(kinds(grow), ['box', 'shake'])

  // 发光强调：进这段之前先顿一下，一字一字慢慢亮出来
  const glow = plan('他的名字是林岚。', { textfx: [{ text: '林岚', style: 'glow' }] })
  const gl = gaps(glow)
  assert.ok(gl[4] > gl[3] + 60, '进强调之前顿一下')
  // 跟重音落在同一处的不重复砸
  const both = plan('凶手就是你', { stress: '就是你', textfx: [{ text: '就是你', style: 'roar' }] })
  assert.equal(both.fx.filter(f => f.kind === 'shake').length, 1)
})

test('gate: 文字效果跟着这一拍走', () => {
  const units = [{ id: 'U1', type: 'dialogue', text: '才、才没有呢' }, { id: 'U2', type: 'dialogue', text: '哼' }]
  const script = { scene: {}, cast: [{ name: '苏晴', pos: 'center' }], lines: { U1: { sp: '苏晴', textfx: [{ text: '才、才没有呢', style: 'small' }] }, U2: { sp: '苏晴' } } }
  const { beats } = buildBeats({ turns: [{ turn: 1, textVersion: 'v1', units, script }], images: [] })
  assert.deepEqual(beats[0].textfx, [{ text: '才、才没有呢', style: 'small' }])
  assert.equal(beats[1].textfx, undefined)
})
