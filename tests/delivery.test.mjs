import test from 'node:test'
import assert from 'node:assert/strict'
import { planLine, inferDelivery } from '../lib/typing.js'
import { mouthAt } from '../lib/aa-sprite.js'

const chars = s => Array.from(s)
const plan = (text, opts = {}) => planLine(chars(text), 30, { seed: 'k', ...opts })
const gaps = p => p.times.slice(1).map((t, i) => t - p.times[i])
const kinds = p => p.fx.map(f => f.kind + (f.sound ? ':' + f.sound : ''))

test('gate: 威压一个字一个字蹦，激动连珠炮', () => {
  const menace = plan('你以为我会放过你吗', { say: 'menace' })
  assert.ok(gaps(menace).every(g => g >= 110), '威压每个字至少隔 110ms')
  assert.equal(menace.mouth, 'syllable')
  const excited = plan('等等等等你说什么', { say: 'excited' })
  assert.ok(gaps(excited).every(g => g < 20), '激动字距不到普通的一半')
  assert.ok(excited.times.at(-1) < plan('等等等等你说什么').times.at(-1) / 1.5)
})

test('gate: 怒吼几个字一块砸出来，一开口就震屏、闪白、拍桌声', () => {
  const p = plan('异议！你在说谎！', { say: 'shout' })
  assert.equal(p.times[0], p.times[1]) // 同一块
  assert.deepEqual(kinds(p), ['shake', 'box', 'flash', 'sound:slam'])
  assert.ok(p.fx.every(f => f.at === 0))
  assert.equal(p.mouth, 'wide')
})

test('gate: 重音前先顿一拍，一字一顿落下，落地那一下才震', () => {
  const p = plan('凶手就是你，林岚。', { stress: '就是你' })
  assert.deepEqual(p.marks, ['', '', 'stress', 'stress', 'stress', '', '', '', ''])
  const g = gaps(p)
  assert.ok(g[1] >= 30 + 240, '重音前停顿')
  assert.ok(g[2] >= 100 && g[3] >= 100, '重音一字一顿')
  assert.deepEqual(kinds(p), ['shake', 'sound:impact'])
  assert.equal(p.fx[0].at, p.times[4]) // 「你」出现的那一刻
  // 低语的重音只标红、放慢，不震不响；原文里没有的重音不生效
  assert.equal(plan('就是你', { say: 'whisper', stress: '就是你' }).fx.length, 0)
  assert.ok(plan('凶手就是你', { stress: '不存在' }).marks.every(m => !m))
})

test('gate: 迟疑说说停停，崩溃一开口红闪、感叹号震对话框', () => {
  const h = plan('我其实一直都知道这件事情只是不敢说出来', { say: 'hesitant' })
  assert.ok(gaps(h).some(g => g >= 90 + 30), '中间有说不下去的停顿')
  const b = plan('不可能！这不可能！', { say: 'breakdown' })
  assert.deepEqual(kinds(b).slice(0, 3), ['shake', 'redflash', 'sound:stab'])
  assert.equal(b.fx.filter(f => f.kind === 'box').length, 2)
  // 同一句重播节奏一样（按句子定种子）
  assert.deepEqual(plan('我其实一直都知道', { say: 'hesitant' }).times, plan('我其实一直都知道', { say: 'hesitant' }).times)
})

test('gate: 导演没写演法时按字面推断；旁白、心声、瞬间显示都不演', () => {
  assert.equal(inferDelivery('太好了！真的吗！'), 'excited')
  assert.equal(inferDelivery('你给我闭嘴！', 'angry'), 'shout')
  assert.equal(inferDelivery('我、我没有'), 'hesitant')
  assert.equal(inferDelivery('那个……我……', 'shy'), 'hesitant')
  assert.equal(inferDelivery('嗯，好的。'), '')
  assert.equal(plan('你给我闭嘴！', { emo: 'angry' }).say, 'shout')
  assert.equal(plan('他慢慢走了过来！！', { type: 'narration', say: 'shout' }).say, '')
  assert.equal(inferDelivery('太好了！真的吗！', '', 'thought'), '')
  const instant = planLine(chars('异议！'), 0, { say: 'shout' })
  assert.deepEqual(instant.times, [0, 0, 0])
  assert.equal(instant.fx.length, 0)
})

test('gate: 口型跟着演法：威压一字一张，怒吼张大，低语只半张，停顿处闭嘴', () => {
  const LOOP = [{ mouth: 'half', ms: 70 }, { mouth: 'open', ms: 90 }, { mouth: 'half', ms: 70 }, { mouth: 'closed', ms: 70 }]
  const talk = (text, opts) => { const p = plan(text, opts); return { chars: chars(text), times: p.times, gap: p.gap, mouth: p.mouth, speed: 30, startedAt: 0, done: false, type: 'dialogue' } }
  const m = talk('你以为我会放过你吗', { say: 'menace' })
  assert.deepEqual([5, 70, 100, 125].map(t => mouthAt(LOOP, m, t)), ['open', 'half', 'closed', 'open'])
  const s = talk('异议你在说谎', { say: 'shout' }) // 两块：0ms、99ms
  assert.deepEqual([10, 60, 150].map(t => mouthAt(LOOP, s, t)), ['half', 'open', 'open'])
  assert.equal(mouthAt(LOOP, s, 99 + s.gap + 1), 'closed') // 最后一块说完才闭嘴
  const w = talk('悄悄告诉你一件事情吧', { say: 'whisper' })
  const states = new Set(Array.from({ length: 30 }, (_, k) => mouthAt(LOOP, w, k * 10)))
  assert.ok(!states.has('open') && states.has('half'))
  // 重音前那一顿：「手」说完就闭嘴，等「就」出来再开口
  const st = talk('凶手就是你', { stress: '就是你' })
  assert.equal(mouthAt(LOOP, st, st.times[1] + 31 + 50), 'closed')
  assert.notEqual(mouthAt(LOOP, st, st.times[2] + 1), 'closed')
})

test('gate: 导演写的演法和重音：演法只收词表里的，重音必须是这句原文里有的字', async () => {
  const { normalizeScript } = await import('../lib/director.js')
  const { segmentTurn } = await import('../lib/segment.js')
  const units = segmentTurn('“凶手就是你，林岚。”\n\n“我、我没有……”\n\n“给我闭嘴！”')
  const raw = { scene: { location: '法庭' }, lines: [
    { u: 'U1', sp: '我', say: 'Menace', stress: '就是你' },
    { u: 'U2', sp: '林岚', say: 'panic', stress: '我没说过' },
    { u: 'U3', sp: '我', say: 'shout', stress: '' },
  ] }
  const s = normalizeScript(raw, units)
  assert.deepEqual([s.lines.U1.say, s.lines.U1.stress], ['menace', '就是你'])
  assert.equal(s.lines.U2.say, undefined) // 不在词表里
  assert.equal(s.lines.U2.stress, undefined) // 原文里没有
  assert.equal(s.lines.U3.say, 'shout')
})
