// 说话的抑扬（lib/prosody.js）：一句话里哪些字出声（按词、日文按拍）、每一声多高多响（分句的句调、问句分两种、感叹、省略、拖腔）。
import test from 'node:test'
import assert from 'node:assert/strict'
import { pickNotes, speechNotes, sentencesOf, wordStarts } from '../lib/prosody.js'
import { planLine, SILENT } from '../lib/typing.js'
import { voiceMood } from '../lib/voice-mood.js'

const chars = s => Array.from(s)
const even = (s, gap = 30) => chars(s).map((_, i) => i * gap)
const said = (s, opts = {}) => { const c = chars(s); return speechNotes(c, even(s), { type: 'dialogue', seed: 'k', ...opts }).map(n => ({ ...n, ch: c[n.i] })) }
const voicedText = notes => notes.map(n => n.ch).join('')

test('gate: 符号不出声，日文按拍：促音停一下不响、小写假名并进前一拍、长音拖长前一个音、ん轻一点', () => {
  for (const s of ['好♡', '嗯♪', '诶★', '呜😭']) assert.equal(voicedText(said(s, { every: 1 })), s[0], s)
  const sugoku = said('すっごく', { every: 1, gap: 60 })
  assert.ok(!voicedText(sugoku).includes('っ'), 'っ 不响')
  const kya = said('きゃー！', { every: 1, gap: 60 })
  assert.equal(voicedText(kya), 'き', 'ゃ 并进 き、ー 不另响')
  assert.ok(kya[0].hold > 1.5, 'ー 把 き 拖长')
  const san = said('さん', { every: 1, gap: 80 })
  assert.equal(voicedText(san), 'さん')
  assert.ok(san[1].gain < san[0].gain, 'ん 轻一点')
})

test('gate: 按词取音：词首一定响，词里面的字太挤才丢；没有分词时退回按字距', () => {
  const s = '我们一起去学校吧'
  const starts = wordStarts(chars(s))
  assert.ok(starts, '这个环境能分词')
  const notes = said(s, { every: 2 })
  for (const [i, ch] of chars(s).entries()) if (starts[i]) assert.ok(notes.some(n => n.i === i), `词首「${ch}」要响`)
  assert.ok(notes.length < chars(s).length, '不是每个字都响')
  // 一个字一响（威压、怒吼）照样一个字一响
  assert.equal(said('你以为', { every: 1, gap: 110 }).length, 3)
  // 成块蹦出来的几个字只响一下
  const burst = speechNotes(chars('异议你'), [0, 0, 0], { type: 'dialogue', every: 1, gap: 33 })
  assert.equal(burst.length, 1)
})

test('gate: 分句：句末标点（连着的算一个）断句，省略号后面紧跟着字是句中停顿', () => {
  const ss = sentencesOf(chars('你好。真的吗？！我……我其实不知道……'))
  assert.deepEqual(ss.map(s => s.kind), ['statement', 'exclaim-question', 'ellipsis'])
  assert.deepEqual(ss.map(s => [s.start, s.end]), [[0, 2], [3, 7], [8, 18]])
  assert.equal(sentencesOf(chars('你明天会来吗？'))[0].kind, 'question-yn')
  assert.equal(sentencesOf(chars('你什么时候来？'))[0].kind, 'question-wh')
  assert.equal(sentencesOf(chars('你知道他是谁吗？'))[0].kind, 'question-yn', '带「吗」的是是非问')
  assert.equal(sentencesOf(chars('どこに行くの？'))[0].kind, 'question-wh')
  assert.equal(sentencesOf(chars('太好了！'))[0].kind, 'exclaim')
  assert.equal(sentencesOf(chars('好开心呀～'))[0].kind, 'drawl')
  assert.equal(sentencesOf(chars('没有句号'))[0].kind, 'statement')
})

test('gate: 陈述句逐渐往下走、句尾落下；逗号前略扬（话没说完）', () => {
  const notes = said('今天的天气真的很好，我们一起出去走走吧。', { every: 1 })
  assert.ok(notes.at(-1).semis < notes[0].semis - 1.5, '句尾比句首低一个半音以上')
  const comma = chars('今天的天气真的很好，').length - 2 // 「好」
  const before = notes.find(n => n.i === comma), prev = notes.find(n => n.i === comma - 1)
  assert.ok(before.semis > prev.semis, '逗号前那个字往上扬')
})

test('gate: 是非问句尾上扬（带滑音），特指问只轻轻扬、疑问词重读', () => {
  const yn = said('你明天会来吗？', { every: 1 })
  const wh = said('你明天什么时候来？', { every: 1 })
  assert.ok(yn.at(-1).semis > yn.at(-2).semis + 1.5, '是非问最后一个字扬上去')
  assert.ok(yn.at(-1).glide > 0)
  const ynRise = yn.at(-1).semis - yn[0].semis, whRise = wh.at(-1).semis - wh[0].semis
  assert.ok(whRise < ynRise - 1, `特指问扬得少：${whRise} vs ${ynRise}`)
  const what = wh.find(n => n.ch === '什')
  assert.ok(what.semis > wh.find(n => n.ch === '天').semis, '「什么」重读')
})

test('gate: 感叹句整体高、开头最高、更响；省略号越说越低越轻、最后一个拖长；拖腔最后一个滑上去、拖长；♡ 让最后一个字往上挑', () => {
  const ex = said('站住别跑！', { every: 1 })
  const st = said('站住别跑。', { every: 1 })
  assert.ok(ex[0].semis > st[0].semis && ex[0].gain > 1, '感叹开头高、响')
  const el = said('其实我也不是那个意思……', { every: 1 })
  const tail = el.slice(-3)
  assert.ok(tail[0].semis > tail[1].semis && tail[1].semis > tail[2].semis, '越来越低')
  assert.ok(tail[0].gain > tail[2].gain && tail[2].gain < 0.75, '越来越轻')
  assert.ok(tail[2].hold > 1)
  const dr = said('好开心呀～', { every: 1 })
  assert.ok(dr.at(-1).glide > 0 && dr.at(-1).hold > 1.3)
  const heart = said('好名字♡', { every: 1 })
  const plain = said('好名字', { every: 1 })
  assert.ok(heart.at(-1).semis > plain.at(-1).semis && heart.at(-1).glide > 0)
})

test('gate: 起伏按情绪缩放：难过时问句也只轻轻扬，开心时起伏大；整句夹在 ±5 半音里', () => {
  const spread = notes => Math.max(...notes.map(n => n.semis)) - Math.min(...notes.map(n => n.semis))
  const q = '你明天真的会来吗？'
  const sad = said(q, { every: 1, range: voiceMood('sad').range })
  const happy = said(q, { every: 1, range: voiceMood('happy').range })
  assert.ok(spread(sad) < spread(happy) * 0.6, `${spread(sad)} vs ${spread(happy)}`)
  const wild = said('你到底要不要来！？你说啊！？', { every: 1, range: 1.9 })
  assert.ok(wild.every(n => Math.abs(n.semis) <= 5 && n.gain >= 0.4 && n.gain <= 1.5))
})

test('gate: 微小的音高起伏是平滑的随机游走：相邻两声差得不多、不会三声一样高、同一句每次一样', () => {
  const s = '啊啊啊啊啊啊啊啊啊啊啊啊啊啊啊啊'
  const notes = said(s, { every: 1, type: 'narration' }) // 旁白没有句调，只剩微小起伏
  const steps = notes.slice(1).map((n, k) => Math.abs(n.semis - notes[k].semis))
  assert.ok(steps.every(d => d < 0.7), '相邻差不到 0.7 半音')
  assert.ok(notes.every(n => Math.abs(n.semis) <= 0.8), '旁白只在 ±0.8 半音里晃')
  assert.ok(!notes.some((n, k) => k >= 2 && n.semis === notes[k - 1].semis && n.semis === notes[k - 2].semis))
  assert.deepEqual(said(s, { every: 1, type: 'narration' }), notes)
  assert.notDeepEqual(said(s, { every: 1, type: 'narration', seed: 'other' }).map(n => n.semis), notes.map(n => n.semis))
  assert.ok(notes.every(n => n.jitter === false), '起伏已经在音符里，合成时不再白噪声抖')
})

test('gate: 关掉句调时跟以前一模一样：每 every 个字响一下、标点不响、成块的只响一下、音高不动、合成时照旧随机抖', () => {
  const s = '你好，我们一起去吧！'
  const c = chars(s)
  const times = even(s)
  const old = c.map((_, i) => i).filter(i => i % 2 === 0 && !(i > 0 && times[i] === times[i - 1]) && !SILENT.test(c[i]))
  const notes = pickNotes(c, times, { every: 2, legacy: true })
  assert.deepEqual(notes.map(n => n.i), old)
  const flat = speechNotes(c, times, { type: 'dialogue', every: 2, prosody: false })
  assert.ok(flat.every(n => n.semis === 0 && n.gain === 1 && n.jitter === true))
})

test('gate: 演出计划带上音符：台词有句调、旁白平、瞬间显示没有音符；重音字重读', () => {
  const q = planLine(chars('你明天会来吗？'), 30, { type: 'dialogue', seed: 'k' })
  assert.ok(q.notes.length >= 3)
  assert.ok(q.notes.at(-1).semis > q.notes[0].semis + 1)
  assert.ok(q.notes.every(n => n.at === q.times[n.i]), '音符的时刻就是那个字出现的时刻')
  const narr = planLine(chars('他慢慢走了过来。'), 30, { type: 'narration', seed: 'k' })
  assert.ok(narr.notes.every(n => Math.abs(n.semis) <= 0.8))
  assert.deepEqual(planLine(chars('你好'), 0, {}).notes, [])
  const st = planLine(chars('凶手就是你，林岚。'), 30, { stress: '就是你', seed: 'k' })
  const stressed = st.notes.filter(n => st.marks[n.i] === 'stress')
  const others = st.notes.filter(n => !st.marks[n.i] && n.i < 6)
  assert.ok(stressed.length && stressed.every(n => n.gain > 1))
  assert.ok(Math.max(...stressed.map(n => n.semis)) > Math.max(...others.map(n => n.semis)))
  // 关掉句调：音符跟以前的取法一样
  const off = planLine(chars('你明天会来吗？'), 30, { seed: 'k', prosody: false })
  assert.ok(off.notes.every(n => n.semis === 0 && n.jitter))
})

test('gate: 设置里的「句调」默认开，关掉的存档读回来是关的', async () => {
  const { resolveConfig } = await import('../lib/config.js')
  assert.equal(resolveConfig({}).ui.prosody, true)
  assert.equal(resolveConfig({ ui: { prosody: false } }).ui.prosody, false)
})
