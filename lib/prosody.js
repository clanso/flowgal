// 说话的抑扬（纯函数，前后端共用）：一句话里哪些字出声、每一声多高多响多长。打字音、试听都按它。
//
// 取音：
//   - 不是字母数字的不出声（标点、♡♪★、emoji）；日文按「拍」：促音っ停一下不响，小写的ゃゅょぁぃぅぇぉ并进前一拍，
//     长音ー把前一个音拖长、不另响，ん轻一点。
//   - 按词取音（Intl.Segmenter 分词）：词首、句首、重音、哽住的那个字一定响；词里面的字跟上一声隔得够远才响，
//     隔多远按演法（every：每几个字响一下）和字距定。成块蹦出来的几个字只响一下。环境不能分词时退回只按间隔。
// 句调（台词和心声；旁白只有微小起伏）：
//   - 一句里整体慢慢往下走（declination），逗号前略扬（话没说完）。
//   - 句尾按句型：陈述落下；是非问（吗、か，或者没有疑问词）最后一个字扬上去、带滑音；特指问（什么、谁、どこ……）
//     疑问词重读、句尾只轻轻扬；感叹开头最高、整体高而响、句尾陡落；省略号越说越低越轻、最后一个拖长；
//     拖腔（～）最后一个滑上去、拖长；句尾跟着 ♡ 的，最后一个字往上一挑。
//   - 起伏乘情绪的 range（lib/voice-mood.js：难过时问句也只轻轻扬，开心时起伏大）；整句夹在 ±5 半音里。
//   - 再叠一层平滑的随机游走（相邻两声差得不多、不会几声一样高），按句子定种子，同一句每次一样；合成时不再白噪声乱抖。
// 关掉句调（prosody: false）时跟以前一模一样：每 every 个字响一下、标点不响、成块的只响一下、音高不动。

/** 跟 lib/typing.js 的 SILENT 一样（不发声的字：标点、引号括号、空白），抄一份免得互相引用。 */
const SILENT = /[\s，、,；;：:。！？!?.…—～~“”‘’「」『』（）()\[\]【】《》〈〉"']/u
const LETTER = /[\p{L}\p{N}]/u
const SMALL_KANA = /^[ぁぃぅぇぉゃゅょゎゕゖァィゥェォャュョヮヵヶ]$/u
const SOKUON = /^[っッ]$/u
const CHOON = /^[ーｰ]$/u
const MORAIC_N = /^[んン]$/u
const KANA = /[\u3040-\u30ff]/u

const SENT_END = /^[。！？!?…～~．]$/u
const CLOSER = /^[”’」』）)\]】》〉"']$/u
const CLAUSE = /^[，、,；;：:—]$/u
const HEART = /[♡♥❤💕💗💖💓💞]/u
const YN_PARTICLE = /[吗嗎么麼か][？?！!」』”）)\s]*$/u
const WH_WORDS = /什么|甚麼|什麼|怎么|怎麼|怎样|怎樣|为什么|為什麼|为何|為何|如何|谁|誰|哪|多少|几时|幾時|何时|何時|啥|なに|なん|何|どこ|どれ|どう|だれ|いつ|なぜ|どうして|いくら|どの|どちら/u

/** 每句里离句尾多远的那几声，按句型怎么收（半音），以及整体往下走多少。 */
const DECLINE = 1.2 // 一句从头到尾往下走多少半音
const CONTINUE_RISE = 0.9 // 逗号前那个字往上扬
const CLAMP_SEMIS = 5
const GAIN_RANGE = [0.4, 1.5]
const WALK = { keep: 0.72, step: 0.22, max: 0.8 } // 随机游走：保留上一步多少、每步多大、最远多远（半音）
const FORCED_MIN_MS = 25 // 一定要响的字跟上一声至少隔多久（再近就是同一下了）

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))
const round = v => Math.round(v * 1000) / 1000

function seeded(seed) {
  let h = 2166136261
  for (const ch of String(seed)) h = Math.imul(h ^ ch.codePointAt(0), 16777619) >>> 0
  return () => {
    h = (h + 0x6d2b79f5) >>> 0
    let x = Math.imul(h ^ (h >>> 15), 1 | h)
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296
  }
}

const SEGMENTERS = new Map()
function segmenterFor(lang) {
  if (typeof Intl === 'undefined' || typeof Intl.Segmenter !== 'function') return null
  if (!SEGMENTERS.has(lang)) {
    try { SEGMENTERS.set(lang, new Intl.Segmenter(lang, { granularity: 'word' })) } catch { SEGMENTERS.set(lang, null) }
  }
  return SEGMENTERS.get(lang)
}

/** 每个字是不是一个词的开头（按字算，chars 是 Array.from 切的字）。环境不能分词时回 null。 */
export function wordStarts(chars, segmenter) {
  const text = chars.join('')
  const seg = segmenter === undefined ? segmenterFor(KANA.test(text) ? 'ja' : 'zh') : segmenter
  if (!seg) return null
  const charAt = new Map() // 字符串下标 → 第几个字
  let pos = 0
  chars.forEach((ch, i) => { charAt.set(pos, i); pos += ch.length })
  const out = new Array(chars.length).fill(false)
  for (const s of seg.segment(text)) {
    if (s.isWordLike === false) continue
    const i = charAt.get(s.index)
    if (i !== undefined) out[i] = true
  }
  return out
}

/** 这个字会不会自己出一声（不管隔得远不远）。 */
const soundable = ch => LETTER.test(ch) && !SMALL_KANA.test(ch) && !SOKUON.test(ch) && !CHOON.test(ch)

/**
 * 哪些字出声：[{ i, at }]（at = times[i]）。legacy 为真时照旧的取法（每 every 个字、标点不响、成块的只响一下）。
 * gap 是这句的基本字距（毫秒），force 是一定要响的字（Set）。
 */
export function pickNotes(chars, times, { every = 2, gap = 30, legacy = false, force = null } = {}) {
  const out = []
  if (legacy) {
    chars.forEach((ch, i) => {
      if (i % every === 0 && !(i > 0 && times[i] === times[i - 1]) && !SILENT.test(ch)) out.push({ i, at: times[i] })
    })
    return out
  }
  const starts = wordStarts(chars)
  const minGap = every <= 1 ? FORCED_MIN_MS : clamp(gap * every * 0.85, 45, 170)
  let last = -Infinity
  chars.forEach((ch, i) => {
    if (!soundable(ch)) return
    const at = times[i]
    if (i > 0 && at === times[i - 1]) return // 成块蹦出来的
    const must = (starts && starts[i]) || (force && force.has(i))
    if (at - last < (must ? FORCED_MIN_MS : minGap)) return
    out.push({ i, at })
    last = at
  })
  return out
}

/** 分句：[{ start, end, kind }]（按字算，含 end）。句末标点连写算一个，收尾引号括号归这一句；省略号后紧跟字是句中停顿。 */
export function sentencesOf(chars) {
  const out = []
  let start = 0
  for (let i = 0; i < chars.length; i += 1) {
    if (!SENT_END.test(chars[i])) continue
    let end = i
    while (end + 1 < chars.length && (SENT_END.test(chars[end + 1]) || CLOSER.test(chars[end + 1]) || HEART.test(chars[end + 1]))) end += 1
    const run = chars.slice(i, end + 1).join('')
    if (/^[…\s]+$/u.test(run) && end + 1 < chars.length && LETTER.test(chars[end + 1])) { i = end; continue }
    out.push({ start, end, kind: kindOf(chars.slice(start, end + 1).join(''), run) })
    start = end + 1
    i = end
  }
  if (start < chars.length && chars.slice(start).some(ch => LETTER.test(ch))) out.push({ start, end: chars.length - 1, kind: 'statement' })
  return out
}

function kindOf(sentence, run) {
  const q = /[？?]/u.test(run), ex = /[！!]/u.test(run)
  if (q && ex) return 'exclaim-question'
  if (q) return YN_PARTICLE.test(sentence) || !WH_WORDS.test(sentence) ? 'question-yn' : 'question-wh'
  if (ex) return 'exclaim'
  if (/[～~]/u.test(run)) return 'drawl'
  if (run.includes('…')) return 'ellipsis'
  return 'statement'
}

/**
 * 一句台词的音符：[{ i, at, semis, gain, hold, glide, jitter }]。
 * semis 这一声升降几个半音（叠在演法和情绪的音高上）、gain 音量倍数、hold 拖长倍数、glide 往上滑多少（比例），
 * jitter 合成时要不要再随机抖一点（句调关掉时要，开着时起伏已经在 semis 里）。
 * type 台词 / 心声 / 旁白；range 起伏倍数（情绪）；marks 重音（lib/typing.js 的 plan.marks）；force 一定要响的字。
 */
export function speechNotes(chars, times, { type = 'dialogue', every = 2, gap = 30, range = 1, seed = '', prosody = true, marks = null, force = null } = {}) {
  if (!chars.length || !times.length) return []
  if (!prosody) return pickNotes(chars, times, { every, legacy: true }).map(n => ({ ...n, semis: 0, gain: 1, hold: 1, glide: 0, jitter: true }))
  const spoken = type === 'dialogue' || type === 'thought'
  const sentences = spoken ? sentencesOf(chars) : []
  const must = new Set(force || [])
  if (marks) marks.forEach((m, i) => { if (m === 'stress') must.add(i) })
  for (const s of sentences) { const first = chars.findIndex((ch, i) => i >= s.start && soundable(ch)); if (first >= 0 && first <= s.end) must.add(first) }
  const picked = pickNotes(chars, times, { every, gap, force: must })
  const notes = picked.map(n => ({ ...n, semis: 0, gain: 1, hold: 1, glide: 0, jitter: false }))
  const byIndex = new Map(notes.map(n => [n.i, n]))

  // 日文：长音拖长前一声，ん轻一点
  for (const n of notes) {
    let k = n.i + 1
    while (k < chars.length && (SMALL_KANA.test(chars[k]) || CHOON.test(chars[k]))) { if (CHOON.test(chars[k])) n.hold += 0.9; k += 1 }
    if (MORAIC_N.test(chars[n.i])) n.gain *= 0.7
  }

  if (spoken) {
    const amount = range * (type === 'thought' ? 0.8 : 1)
    for (const s of sentences) contour(chars, notes.filter(n => n.i >= s.start && n.i <= s.end), s, amount, byIndex)
    if (marks) for (const n of notes) if (marks[n.i] === 'stress') { n.semis += 1.5 * amount; n.gain *= 1.25 }
  }

  // 平滑的随机游走
  const rand = seeded(`${seed}|walk|${chars.join('')}`)
  let w = 0
  for (const n of notes) {
    w = clamp(w * WALK.keep + (rand() * 2 - 1) * WALK.step * 1.6, -WALK.max, WALK.max)
    n.semis = round(clamp(n.semis + w, -CLAMP_SEMIS, CLAMP_SEMIS))
    n.gain = round(clamp(n.gain, GAIN_RANGE[0], GAIN_RANGE[1]))
    n.hold = round(n.hold)
    n.glide = round(n.glide)
  }
  return notes
}

/** 一句的句调：notes 是这一句里出声的那几个（按先后），amount 是起伏倍数。 */
function contour(chars, notes, s, amount, byIndex) {
  const n = notes.length
  if (!n) return
  const bend = (note, semis) => { if (note) note.semis += semis * amount }
  const last = notes[n - 1], second = notes[n - 2]
  const exclaim = s.kind === 'exclaim' || s.kind === 'exclaim-question'
  // 慢慢往下走（感叹更陡）
  const decline = DECLINE * (exclaim ? 1.5 : 1)
  notes.forEach((note, k) => bend(note, decline / 2 - (n > 1 ? (decline * k) / (n - 1) : 0)))
  // 逗号前那一声扬一下
  for (let i = s.start; i < s.end; i += 1) {
    if (!CLAUSE.test(chars[i])) continue
    const before = [...notes].reverse().find(note => note.i < i)
    if (before && before !== last && i - before.i <= 2) bend(before, CONTINUE_RISE)
  }
  // 句首重读
  notes[0].gain *= 1.12
  switch (s.kind) {
    case 'statement':
      bend(last, -1.2); bend(second, -0.4); last.gain *= 0.88
      break
    case 'question-yn':
      bend(last, 3); bend(second, 0.5); last.glide = 0.06 * Math.min(1.5, amount)
      break
    case 'question-wh': {
      const text = chars.slice(s.start, s.end + 1).join('')
      const m = text.match(WH_WORDS)
      if (m) {
        const from = s.start + Array.from(text.slice(0, m.index)).length
        for (let i = from; i < from + Array.from(m[0]).length; i += 1) { const note = byIndex.get(i); if (note) { bend(note, 1.2); note.gain *= 1.15 } }
      }
      bend(last, 0.8)
      break
    }
    case 'exclaim':
    case 'exclaim-question':
      for (const note of notes) { bend(note, 1); note.gain *= 1.15 }
      bend(notes[0], 1)
      if (s.kind === 'exclaim') bend(last, -0.8)
      else { bend(last, 2.5); last.glide = 0.06 * Math.min(1.5, amount) }
      break
    case 'ellipsis': {
      const tail = notes.slice(-3)
      tail.forEach((note, k) => { bend(note, -0.6 * (k + 1 + 3 - tail.length)); note.gain *= [0.85, 0.72, 0.6][k + 3 - tail.length] })
      last.hold *= 1.4
      break
    }
    case 'drawl':
      bend(last, 0.6); last.glide = 0.1 * Math.min(1.5, amount); last.hold *= 1.6
      break
  }
  // 句尾跟着 ♡：最后一个字往上一挑
  if (chars.slice(last.i + 1, s.end + 1).some(ch => HEART.test(ch))) { bend(last, 1); last.glide = Math.max(last.glide, 0.05) }
}
