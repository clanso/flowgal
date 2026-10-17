// 台词演出：一句话怎么说出来（纯函数，对话框、打字音、落字特效和立绘口型共用一份）。
// 逆转裁判式的抑扬顿挫：
//   - 标点后停一拍：顿号最短，逗号短停，分号冒号稍长，句末长停，省略号、破折号一个一停但一串最多停一次句末那么长
//     （30ms/字时顿号 75ms、逗号 120ms、句末 300ms、省略号每个 120ms，随字速等比缩放）；旁白的停顿再短一点，读起来不拖。
//   - 演法（say）：威压一个字一个字蹦，激动连珠炮，怒吼成块砸出来，迟疑说说停停，低语又轻又慢，崩溃忽快忽慢。
//   - 重音（stress）：这句里最要命的几个字，先顿一拍，再一字一顿地落下，落地那一下震屏 / 闪光 / 音效。
//   - 句中文字效果（textfx）：某几个字的样子和节奏：发抖、波浪、放大、吼、越说越大、越说越小、小声、轻淡、发光强调。
// 导演没写演法时按文字推断（只推断怒吼、激动、迟疑这类从字面看得出来的）。
//   - 情绪（lib/voice-mood.js）：哭着说的整句压低、放慢、变轻，开心的抬高；跟演法按半音叠起来。

import { voiceMood, NEUTRAL_MOOD } from './voice-mood.js'

/** 标点后的停顿倍数（× 每字毫秒）。 */
const PAUSE = [
  [/^[、]$/u, 2.5],
  [/^[，,]$/u, 4],
  [/^[；;：:]$/u, 5.5],
  [/^[。！？!?.]$/u, 10],
  [/^[…～~]$/u, 4],
  [/^[—]$/u, 2.5],
]
/** 一串省略号、破折号（「…………」「————」）合起来最多停这么久（× 每字毫秒）。 */
const DOTTED_MAX = 10
/** 旁白的标点停顿倍数：旁白不用「说」出来，停得太久像卡住。 */
const NARRATION_PAUSE = 0.8
/** 省略号、破折号：每一个都单独停。 */
const DOTTED = /^[…—～~]$/u
/** 收尾的引号、括号跟着前面的标点一起出现，停顿挪到它们后面。 */
const CLOSER = /^[”’」』）)\]】》〉"']$/u
/** 不发声的字：标点、引号括号、空白。立绘在这些字上闭嘴，打字音不响。 */
export const SILENT = /[\s，、,；;：:。！？!?.…—～~“”‘’「」『』（）()\[\]【】《》〈〉"']/u
const BANG = /^[！!]$/u

export function pauseFactor(ch) {
  for (const [re, f] of PAUSE) if (re.test(ch)) return f
  return 0
}

/** 每个字之后的停顿（毫秒）。连着的标点（“？！”）和收尾引号（“好。」”）合成一次，停在最后一个后面。 */
export function pausesAfter(chars, speed) {
  const out = new Array(chars.length).fill(0)
  let pending = 0
  let dotted = 0 // 这一串省略号、破折号已经停了多少
  for (let i = 0; i < chars.length; i += 1) {
    const ch = chars[i]
    if (DOTTED.test(ch)) {
      const f = Math.min(pauseFactor(ch), DOTTED_MAX - dotted)
      dotted += f
      out[i] = speed * Math.max(0, f)
      pending = 0
      continue
    }
    dotted = 0
    pending = Math.max(pending, pauseFactor(ch))
    if (!pending) continue
    const next = chars[i + 1]
    const joins = next !== undefined && (CLOSER.test(next) || (pauseFactor(next) > 0 && !DOTTED.test(next)))
    if (!joins) { out[i] = speed * pending; pending = 0 }
  }
  return out
}

/**
 * 每种演法的参数（gap、pause 是 × 每字毫秒的倍数）：
 *   gap 字距，min 字距下限（毫秒），pause 标点停顿倍数，chunk 几个字一块蹦出来，stall 说说停停，jitter 忽快忽慢，
 *   blip 打字音（every 每几个字响一下，pitch 音高倍数，gain 音量倍数），mouth 口型（loop 循环开合 / syllable 一字一张 /
 *   wide 张大嘴 / soft 只半张）。
 */
export const STYLES = {
  '': { gap: 1, pause: 1, blip: { every: 2, pitch: 1, gain: 1 }, mouth: 'loop' },
  menace: { gap: 4, min: 110, pause: 1.6, blip: { every: 1, pitch: 0.78, gain: 1.1 }, mouth: 'syllable' },
  excited: { gap: 0.55, pause: 0.5, blip: { every: 2, pitch: 1.18, gain: 1 }, mouth: 'loop' },
  shout: { gap: 1.1, chunk: 3, pause: 0.7, blip: { every: 1, pitch: 1.1, gain: 1.3 }, mouth: 'wide' },
  hesitant: { gap: 1.35, pause: 1.8, stall: true, blip: { every: 3, pitch: 0.95, gain: 0.8 }, mouth: 'loop' },
  whisper: { gap: 1.25, pause: 1.2, blip: { every: 2, pitch: 0.9, gain: 0.35 }, mouth: 'soft' },
  breakdown: { gap: 0.8, jitter: true, pause: 0.6, blip: { every: 1, pitch: 1.25, gain: 1.2 }, mouth: 'wide' },
}

/** 重音落地时的冲击：[种类, 强度]，sound 是音效名（见 src/client/theater/audio.js 的 stinger）。 */
const IMPACT = {
  '': [['shake', 1], ['sound', 'impact']],
  menace: [['shake', 2], ['sound', 'impact']],
  excited: [['shake', 1], ['flash', 1], ['sound', 'impact']],
  shout: [['shake', 3], ['box', 3], ['flash', 2], ['sound', 'slam']],
  hesitant: [['sound', 'impact']],
  whisper: [],
  breakdown: [['shake', 3], ['redflash', 2], ['sound', 'stab']],
}

/**
 * 句中文字效果（导演 textfx 写的那几个字）怎么出来：
 *   gap 字距倍数（[起, 止] 是从这段第一个字渐变到最后一个字），before 这段之前先顿几个字的时间，chunk 几个字一块蹦出来，
 *   gain / pitch 打字音的音量、音高倍数（[起, 止] 同上；pitch 写 'wave' 一高一低地起伏，'jitter' 发颤），
 *   land 这段最后一个字落下时的冲击（写法同 IMPACT），after 落下后再缓几个字的时间。字的样子在 theater.css 的 .tx-*。
 */
export const TEXT_STYLES = {
  shake: { gap: 1.3, gain: 0.9, pitch: 'jitter' },
  wave: { gap: 1.25, pitch: 'wave' },
  big: { gap: 1.1, before: 2, gain: 1.25, pitch: 1.04, land: [['box', 1]], after: 2 },
  roar: { gap: 1.2, before: 5, chunk: 2, gain: 1.45, pitch: 0.94, land: [['shake', 3], ['box', 3], ['flash', 1], ['sound', 'slam']], after: 4 },
  grow: { gap: [1.35, 0.8], gain: [0.85, 1.5], pitch: [1, 1.12], land: [['box', 2], ['shake', 1]], after: 3 },
  dwindle: { gap: [1.1, 2.6], gain: [1, 0.25], pitch: [1, 0.9] },
  small: { gap: 1.15, gain: 0.55, pitch: 1.05 },
  faint: { gap: 1.4, gain: 0.32, pitch: 0.96 },
  glow: { gap: 1.45, before: 3, gain: 1.1, after: 2 },
}
const lerp = (v, k) => (Array.isArray(v) ? v[0] + (v[1] - v[0]) * k : v)

/**
 * 文字效果落在哪几个字上：[{ s0, s1, style }]（按字算，含 s1）。text 取第一次出现、跟前面的段重叠就往后找；找不到的不演。
 */
export function textFxSpans(chars, textfx = []) {
  const text = chars.join('')
  const spans = []
  for (const f of textfx || []) {
    if (!f || !f.text || !TEXT_STYLES[f.style]) continue
    const len = Array.from(f.text).length
    let from = 0
    for (;;) {
      const at = text.indexOf(f.text, from)
      if (at < 0) break
      const s0 = Array.from(text.slice(0, at)).length
      const s1 = s0 + len - 1
      if (!spans.some(o => s0 <= o.s1 && s1 >= o.s0)) { spans.push({ s0, s1, style: f.style }); break }
      from = at + f.text.length
    }
  }
  return spans.sort((a, b) => a.s0 - b.s0)
}

/** 按 seed 出固定的伪随机数：同一句每次重播节奏一样。 */
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

const HESITANT_EMO = new Set(['worried', 'shy', 'blush', 'scared', 'sad', 'confused'])
/** 这几类的情绪（含哭、委屈和导演新造的「哽咽着……」）也会吞吞吐吐。 */
const HESITANT_CATS = new Set(['sorrow', 'fear', 'shy'])
const EXCITED_EMO = new Set(['surprised', 'scared', 'laugh', 'happy'])

/** 导演没写演法时，从字面推断：只看得出怒吼、激动、迟疑；旁白和心声不推断。mood 是 lib/voice-mood.js 认好的情绪（不给按 emo 认）。 */
export function inferDelivery(text, emo = '', type = 'dialogue', mood = null) {
  if (type !== 'dialogue') return ''
  const bangs = (text.match(/[！!]/gu) || []).length
  const dots = (text.match(/[…]|\.{3}/gu) || []).length
  const stammer = /(\p{L})[、，,…]+\1/u.test(text)
  if (bangs && emo === 'angry') return 'shout'
  if (bangs >= 2 || (bangs && EXCITED_EMO.has(emo))) return 'excited'
  if (stammer || dots >= 4) return 'hesitant'
  if (dots >= 2 && (HESITANT_EMO.has(emo) || (mood || voiceMood(emo)).cats.some(c => HESITANT_CATS.has(c)))) return 'hesitant'
  return ''
}

/** 演法和情绪合起来最多把打字音推高、压低几个半音（再多就听不出是这个人了）。 */
const MAX_SEMIS = 7
const semisOf = ratio => 12 * Math.log2(ratio)

/**
 * 一句台词的演出计划。chars 是逐字显现的字，speed 是每字毫秒（0 = 瞬间显示，不演）。
 * 返回：
 *   times[i]  第 i 个字出现的时刻（毫秒，第一个字在 0）
 *   marks[i]  第 i 个字的样子：'' | 'stress'
 *   say       实际用的演法（导演没写时是推断的，可能为 ''）
 *   gap       这句的基本字距：立绘口型用它判断哪里是停顿
 *   mouth     口型方式；blip 打字音参数
 *   fx        [{ at, kind: 'shake'|'box'|'flash'|'redflash'|'sound', power, sound }]：在第 at 毫秒触发
 *   tx[i]     第 i 个字的文字效果（'' 或 TEXT_STYLES 里的一种），txk[i] 它在这段里走到几成（0~1，越说越大 / 越小按它变），
 *             txi[i] 它是这段的第几个字（波浪按它错开）；blips[i] 这个字打字音的 { gain, pitch } 倍数（没有文字效果时为 null）
 */
export function planLine(chars, speed, { say = '', stress = '', emo = '', type = 'dialogue', seed = '', textfx = null, offStyles = null, mood = null } = {}) {
  const n = chars.length
  const text = chars.join('')
  const spoken = type === 'dialogue' || type === 'thought'
  // 情绪（台词和心声才带）：剧场按情绪库和这个人的强弱认好的直接用，没给按 emo 认；旁白不带
  const feel = !spoken ? NEUTRAL_MOOD : mood || voiceMood(emo)
  const wanted = !spoken ? '' : say && STYLES[say] ? say : inferDelivery(text, emo, type, feel)
  const style = offStyles && offStyles.has(wanted) ? '' : wanted // 设置里关掉的演法（剧场的特效开关）按平常的念
  const S = STYLES[style]
  const tempo = feel.tempo || 1
  const base = Math.max(speed * S.gap * tempo, S.min || 0)
  // 打字音：演法的音高和情绪的音区按半音叠起来，合起来不超过 ±MAX_SEMIS；音量相乘；质感（气声、发颤、起音）跟情绪
  const semis = Math.max(-MAX_SEMIS, Math.min(MAX_SEMIS, semisOf(S.blip.pitch) + (feel.semis || 0)))
  // 音量：演法已经压轻了（迟疑）时情绪只再压一半，不轻过 0.6（低语本来就该轻，照乘）
  const moodGain = feel.gain < 1 && S.blip.gain < 1 ? 1 - (1 - feel.gain) / 2 : feel.gain || 1
  const blipGain = style === 'whisper' ? S.blip.gain * moodGain : Math.max(Math.min(0.6, S.blip.gain), S.blip.gain * moodGain)
  const blip = feel === NEUTRAL_MOOD ? S.blip : { ...S.blip, pitch: 2 ** (semis / 12), gain: blipGain, breath: feel.breath, tremor: feel.tremor, attack: feel.attack }
  const plan = { times: [], marks: new Array(n).fill(''), say: style, gap: S.chunk ? base * S.chunk : base, mouth: S.mouth, blip, mood: feel, fx: [], tx: new Array(n).fill(''), txk: new Array(n).fill(0), txi: new Array(n).fill(0), blips: null }
  if (!n) return plan

  // 文字效果：瞬间显示时也要有样子，所以先标上
  const spans = textFxSpans(chars, textfx)
  const spanAt = new Array(n).fill(null)
  if (spans.length) plan.blips = new Array(n).fill(null)
  for (const sp of spans) {
    const T = TEXT_STYLES[sp.style]
    const len = sp.s1 - sp.s0
    for (let i = sp.s0; i <= sp.s1; i += 1) {
      const k = len ? (i - sp.s0) / len : 1
      plan.tx[i] = sp.style
      plan.txk[i] = Math.round(k * 100) / 100
      plan.txi[i] = i - sp.s0
      spanAt[i] = sp
      const pitch = T.pitch === 'wave' ? 1 + 0.09 * Math.sin((i - sp.s0) * 1.3) : T.pitch === 'jitter' ? ((i - sp.s0) % 2 ? 0.95 : 1.06) : lerp(T.pitch ?? 1, k)
      plan.blips[i] = { gain: lerp(T.gain ?? 1, k), pitch }
    }
  }
  if (!(speed > 0)) { plan.times = new Array(n).fill(0); return plan }

  // 重音按字算位置（原文照抄的那几个字，取第一次出现）
  let s0 = -1
  let s1 = -1
  const at = stress && spoken ? text.indexOf(stress) : -1
  if (at >= 0) {
    s0 = Array.from(text.slice(0, at)).length
    s1 = s0 + Array.from(stress).length - 1
    for (let i = s0; i <= s1; i += 1) plan.marks[i] = 'stress'
  }
  const inStress = i => s0 >= 0 && i >= s0 && i <= s1

  const rand = seeded(`${seed}|${style}|${text}`)
  // 哭腔（情绪的 sob）：说着说着哽一下。字和字之间（不在标点后、不在重音里、不是开头两个字）挑一到三处，
  // 多停三四个字的工夫，接着那个字声音轻、往上飘。用自己的种子，不打乱演法原来的节奏。
  const sobs = new Set()
  if (feel.sob && speed > 0) {
    const hic = seeded(`${seed}|sob|${text}`)
    const slots = []
    for (let i = 2; i < n; i += 1) if (!SILENT.test(chars[i]) && !SILENT.test(chars[i - 1]) && !inStress(i)) slots.push(i)
    const want = Math.min(3, Math.max(slots.length >= 6 ? 1 : 0, Math.round(slots.length / 9)))
    for (let k = 0; k < want && slots.length; k += 1) {
      const at = slots.splice(Math.floor(hic() * slots.length), 1)[0]
      if (![...sobs].some(o => Math.abs(o - at) < 4)) sobs.add(at)
    }
    if (sobs.size) {
      if (!plan.blips) plan.blips = new Array(n).fill(null)
      for (const i of sobs) plan.blips[i] = { gain: (plan.blips[i]?.gain ?? 1) * 0.6, pitch: (plan.blips[i]?.pitch ?? 1) * 1.12 }
    }
  }
  const pauses = pausesAfter(chars, speed * tempo)
  let t = 0
  for (let i = 0; i < n; i += 1) {
    if (i > 0) {
      const prev = chars[i - 1]
      let gap = base
      if (S.chunk && !inStress(i)) gap = i % S.chunk === 0 || SILENT.test(prev) || inStress(i - 1) ? base * S.chunk : 0
      if (S.jitter) gap = base * (0.4 + rand() * 1.4) + (rand() < 0.12 ? speed * 5 : 0)
      gap += pauses[i - 1] * S.pause * (spoken ? 1 : NARRATION_PAUSE)
      if (S.stall && !SILENT.test(prev) && !SILENT.test(chars[i]) && rand() < 0.2) gap += Math.max(speed * 4, 90)
      // 文字效果：这段的字距（成块蹦出来的几个字一起出），进这段之前先顿一下，落下之后缓一下
      const sp = spanAt[i]
      if (sp) {
        const T = TEXT_STYLES[sp.style]
        if (T.chunk && i > sp.s0) gap = (i - sp.s0) % T.chunk === 0 || SILENT.test(prev) ? gap * T.chunk * lerp(T.gap, plan.txk[i]) : 0
        else gap *= lerp(T.gap, plan.txk[i])
        if (i === sp.s0) gap += speed * (T.before || 0)
      }
      const was = spanAt[i - 1]
      if (was && was !== sp && i - 1 === was.s1) gap += speed * (TEXT_STYLES[was.style].after || 0)
      if (sobs.has(i)) gap += Math.max(speed * 4, 110) // 哽住
      if (i === s0) gap += speed * 8 // 重音前先顿一拍
      if (i > s0 && i <= s1) gap = Math.max(gap, base, speed * 3.5, 100) // 重音一字一顿
      if (s0 >= 0 && i === s1 + 1) gap += speed * 4 // 落地后缓一下
      t += gap
    }
    plan.times.push(Math.round(t))
  }

  const fx = plan.fx
  const push = (time, list) => {
    for (const [kind, v] of list) fx.push(kind === 'sound' ? { at: time, kind, sound: v } : { at: time, kind, power: v })
  }
  if (s0 >= 0) push(plan.times[s1], IMPACT[style])
  else if (style === 'shout' && !spans.some(sp => (TEXT_STYLES[sp.style].land || []).some(([k]) => k === 'shake'))) push(0, IMPACT.shout) // 没有重音的怒吼：一开口就砸下来（有吼、越说越大的那几个字时，在它们落下时砸）
  // 文字效果这段落下时的冲击（跟重音落在同一处的不重复砸）
  for (const sp of spans) {
    const land = TEXT_STYLES[sp.style].land
    if (land && !(s1 >= sp.s0 && s1 <= sp.s1)) push(plan.times[sp.s1], land)
  }
  if (style === 'breakdown') {
    if (s0 !== 0) push(0, IMPACT.breakdown)
  }
  if (style === 'excited' || style === 'breakdown') {
    // 激动、崩溃：每个感叹号震一下对话框（一句最多三下）
    let left = 3
    chars.forEach((ch, i) => { if (left > 0 && BANG.test(ch) && !(BANG.test(chars[i - 1] || ''))) { fx.push({ at: plan.times[i], kind: 'box', power: style === 'breakdown' ? 2 : 1 }); left -= 1 } })
  }
  fx.sort((a, b) => a.at - b.at)
  return plan
}

/** 第 i 个字出现的时刻（普通演法）。speed 为 0（瞬间显示）时全是 0。 */
export function typeTimes(chars, speed) {
  return planLine(chars, speed, { type: 'narration' }).times
}
