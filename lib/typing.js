// 台词演出：一句话怎么说出来（纯函数，对话框、打字音、落字特效和立绘口型共用一份）。
// 逆转裁判式的抑扬顿挫：
//   - 标点后停一拍：逗号短停，句末长停，省略号、破折号一个一停（30ms/字时约 180ms、360ms、150ms，随字速等比缩放）。
//   - 演法（say）：威压一个字一个字蹦，激动连珠炮，怒吼成块砸出来，迟疑说说停停，低语又轻又慢，崩溃忽快忽慢。
//   - 重音（stress）：这句里最要命的几个字，先顿一拍，再一字一顿地落下，落地那一下震屏 / 闪光 / 音效。
// 导演没写演法时按文字推断（只推断怒吼、激动、迟疑这类从字面看得出来的）。

/** 标点后的停顿倍数（× 每字毫秒）。 */
const PAUSE = [
  [/^[，、,；;：:]$/u, 6],
  [/^[。！？!?.]$/u, 12],
  [/^[…—～~]$/u, 5],
]
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
  for (let i = 0; i < chars.length; i += 1) {
    const ch = chars[i]
    if (DOTTED.test(ch)) { out[i] = speed * pauseFactor(ch); pending = 0; continue }
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
const EXCITED_EMO = new Set(['surprised', 'scared', 'laugh', 'happy'])

/** 导演没写演法时，从字面推断：只看得出怒吼、激动、迟疑；旁白和心声不推断。 */
export function inferDelivery(text, emo = '', type = 'dialogue') {
  if (type !== 'dialogue') return ''
  const bangs = (text.match(/[！!]/gu) || []).length
  const dots = (text.match(/[…]|\.{3}/gu) || []).length
  const stammer = /(\p{L})[、，,…]+\1/u.test(text)
  if (bangs && emo === 'angry') return 'shout'
  if (bangs >= 2 || (bangs && EXCITED_EMO.has(emo))) return 'excited'
  if (stammer || dots >= 4 || (dots >= 2 && HESITANT_EMO.has(emo))) return 'hesitant'
  return ''
}

/**
 * 一句台词的演出计划。chars 是逐字显现的字，speed 是每字毫秒（0 = 瞬间显示，不演）。
 * 返回：
 *   times[i]  第 i 个字出现的时刻（毫秒，第一个字在 0）
 *   marks[i]  第 i 个字的样子：'' | 'stress'
 *   say       实际用的演法（导演没写时是推断的，可能为 ''）
 *   gap       这句的基本字距：立绘口型用它判断哪里是停顿
 *   mouth     口型方式；blip 打字音参数
 *   fx        [{ at, kind: 'shake'|'box'|'flash'|'redflash'|'sound', power, sound }]：在第 at 毫秒触发
 */
export function planLine(chars, speed, { say = '', stress = '', emo = '', type = 'dialogue', seed = '' } = {}) {
  const n = chars.length
  const text = chars.join('')
  const spoken = type === 'dialogue' || type === 'thought'
  const style = !spoken ? '' : say && STYLES[say] ? say : inferDelivery(text, emo, type)
  const S = STYLES[style]
  const base = Math.max(speed * S.gap, S.min || 0)
  const plan = { times: [], marks: new Array(n).fill(''), say: style, gap: S.chunk ? base * S.chunk : base, mouth: S.mouth, blip: S.blip, fx: [] }
  if (!n) return plan
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
  const pauses = pausesAfter(chars, speed)
  let t = 0
  for (let i = 0; i < n; i += 1) {
    if (i > 0) {
      const prev = chars[i - 1]
      let gap = base
      if (S.chunk && !inStress(i)) gap = i % S.chunk === 0 || SILENT.test(prev) || inStress(i - 1) ? base * S.chunk : 0
      if (S.jitter) gap = base * (0.4 + rand() * 1.4) + (rand() < 0.12 ? speed * 5 : 0)
      gap += pauses[i - 1] * S.pause
      if (S.stall && !SILENT.test(prev) && !SILENT.test(chars[i]) && rand() < 0.2) gap += Math.max(speed * 4, 90)
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
  else if (style === 'shout') push(0, IMPACT.shout) // 没有重音的怒吼：一开口就砸下来
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
