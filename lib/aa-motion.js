// 逆转式动态立绘 v2（素材包 version: 2）：姿势（正面 / 侧头）+ 转头中间帧 + 更细的眨眼 + 跟着出字节奏的嘴形。
// 纯函数和一个不碰 DOM 的「演员」状态机，剧场（src/client/theater/AaSprite.jsx）和测试共用；v1（呼吸帧 + 两态眼嘴）见 aa-sprite.js。
// 节奏的依据（逆转裁判原作逐帧实测、人眼眨眼、日本动画口パク、Rhubarb 口型）写在 docs/逆转式立绘动画.md。
//
// 素材包 motion.json：
//   version: 2, size: [宽, 高]
//   poses: { 姿势名: { base: 整图, parts: { eyes: { half|closed（lower 可选）: { file, x, y } }, mouth: { narrow|half|open|round: {...} } } } }
//   default_pose: 'front'
//   turns: { 'front>side': [中间帧整图...] }      —— 反方向自动倒着播
//   blink: { close: [{ eyes, ms }], open: [...], interval_ms: [最短, 最长], double_chance, double_gap_ms,
//            sentence_end_chance, line_start_chance }
//   talk: { beat_ms: [最短, 最长], attack: 开口占一拍的比例, shapes: { normal|loud|soft: { A|E|I|O|U|N: 嘴形 } },
//           accent: { normal|loud|soft: [连着同一嘴形时换用的嘴形] }, release: { 嘴形: 收口时的嘴形 },
//           bump: { 嘴形: 新一拍跟此刻嘴形撞了时换用的嘴形 } }
//   turn: { lead: [{ eyes, ms }] 转头前闭眼, frames_ms: [每张中间帧停多久], land: [{ eyes, ms }] 到位后睁眼 }
// 没写的节奏参数用 MOTION_DEFAULTS。
//
// 台词计划 plan 就是剧场的 talk（typing.js planLine 的结果加上字）：{ chars, times, gap, mouth, marks }，
// times[i] 是第 i 个字在这句开始后多少毫秒出现；mouth 是 loop | soft | syllable | wide。
import { SILENT } from './typing.js'

const SENTENCE_END = /[。！？!?…]/u

// ───────────────────────── 字 → 口型类 ─────────────────────────
// A（a 类，嘴开得最大）E（e）I（i，齿缝）O（o，圆）U（u/ü，圆而小）N（鼻音 / 双唇音，几乎闭）。
// 假名、拉丁字母按元音对；汉字没有读音表，用字本身算一个固定的类（同一个字永远同一个嘴形），
// 比例照普通话韵母的大致分布：A 30%、E 25%、I 20%、O 12%、U 13%。没有配音时看不出读音对不对，要紧的是不单调、不抖。

const KANA_ROWS = [
  ['A', 'あかさたなはまやらわがざだばぱぁゃゎアカサタナハマヤラワガザダバパァャヮ'],
  ['I', 'いきしちにひみりぎじぢびぴぃイキシチニヒミリギジヂビピィ'],
  ['U', 'うくすつぬふむゆるぐずづぶぷぅゅゔウクスツヌフムユルグズヅブプゥュヴ'],
  ['E', 'えけせてねへめれげぜでべぺぇエケセテネヘメレゲゼデベペェ'],
  ['O', 'おこそとのほもよろをごぞどぼぽぉょオコソトノホモヨロヲゴゾドボポォョ'],
  ['N', 'んっンッ'],
]
const KANA = new Map(KANA_ROWS.flatMap(([cls, s]) => [...s].map(ch => [ch, cls])))
const LATIN = { a: 'A', e: 'E', i: 'I', y: 'I', o: 'O', u: 'U', w: 'U', m: 'N', b: 'N', p: 'N' }
const HAN_WEIGHTS = [['A', 0.3], ['E', 0.25], ['I', 0.2], ['O', 0.12], ['U', 0.13]]

function hash01(s) {
  let h = 2166136261
  for (const ch of String(s)) h = Math.imul(h ^ ch.codePointAt(0), 16777619) >>> 0
  h ^= h >>> 13
  h = Math.imul(h, 0x5bd1e995) >>> 0
  h ^= h >>> 15
  return (h >>> 0) / 4294967296
}

/** 一个字的口型类；不发声的字返回 null；长音「ー」返回 ''（沿用前一个）。 */
export function visemeOf(ch) {
  if (!ch || SILENT.test(ch)) return null
  if (ch === 'ー' || ch === '〜') return ''
  if (KANA.has(ch)) return KANA.get(ch)
  const low = ch.toLowerCase()
  if (/^[a-z]$/.test(low)) return LATIN[low] || 'E'
  if (/^[0-9０-９]$/.test(ch)) return 'I'
  let r = hash01(ch)
  for (const [cls, w] of HAN_WEIGHTS) {
    if (r < w) return cls
    r -= w
  }
  return 'E'
}

// ───────────────────────── 嘴：一句话的口型轨道 ─────────────────────────

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))

/**
 * 整句的口型关键帧 [{ at, mouth }]（at = 这句开始后多少毫秒，按时间排好）。
 * 先按标点和长停顿切成「气口」（一口气说完的一段），气口里按出字时刻打拍子：
 * 一拍至少 beat_ms[0]，攒够约 4 个字距（不超过 beat_ms[1]）就在下一个字出现的那一刻换拍——拍子永远对齐出字。
 * 每拍开口到这拍第一个字的嘴形（重音字用大一号），开口占 attack，剩下收到小一号；气口结束闭嘴。
 */
export function mouthTrack(talk, plan) {
  const chars = plan?.chars || []
  const times = plan?.times || []
  if (!talk || !chars.length || times.length !== chars.length) return []
  const gap = plan.gap > 0 ? plan.gap : 30
  const [beatMin, beatMax] = talk.beat_ms || [95, 160]
  const target = Math.max(beatMin, Math.min(gap, beatMax)) // 一拍：从拍头起至少 beatMin 后的第一个字；慢速时一字一拍
  const level = plan.mouth === 'soft' ? 'soft' : plan.mouth === 'wide' || plan.mouth === 'syllable' ? 'loud' : 'normal'
  const shapes = talk.shapes || {}
  const release = talk.release || {}
  const attack = clamp(talk.attack ?? 0.6, 0.3, 0.9)
  const keys = []
  let prevPeak = ''
  let cls = 'A'

  // 切气口：不发声的字、或者下一个字要等很久（说说停停、重音前那一顿）
  const phrases = []
  let s = -1
  for (let i = 0; i < chars.length; i += 1) {
    const voiced = visemeOf(chars[i]) !== null
    if (voiced && s < 0) s = i
    const next = times[i + 1]
    const longWait = next !== undefined && next - times[i] > gap * 2.2 && next - times[i] > beatMin
    if (s >= 0 && (!voiced || longWait || i === chars.length - 1)) {
      const e = voiced ? i : i - 1
      if (e >= s) phrases.push([s, e])
      s = -1
    }
  }

  for (const [ps, pe] of phrases) {
    // 最后一个字也要说完：再动一个字距（至少一拍的开口）
    const end = times[pe] + Math.max(gap, beatMin * attack + 30)
    const beats = []
    let start = ps
    for (let i = ps + 1; i <= pe; i += 1) {
      if (times[i] - times[start] >= target) { beats.push([start, i]); start = i }
    }
    beats.push([start, pe + 1])
    beats.forEach(([b0, b1], k) => {
      const at = times[b0]
      const until = b1 <= pe ? times[b1] : end
      const c = visemeOf(chars[b0])
      if (c) cls = c
      const stressed = plan.marks?.[b0] === 'stress'
      const lv = stressed ? (level === 'soft' ? 'normal' : 'loud') : level
      let peak = shapes[lv]?.[cls] || 'half'
      const alts = talk.accent?.[lv] || []
      // 连着同一个嘴形就换一个（日本动画口パク的经验：几张嘴形要乱序出现，不然像嘴在原地抖）
      if (peak === prevPeak && alts.length) {
        const alt = alts[Math.floor(hash01(`${chars[b0]}|${b0}|${k}`) * alts.length)]
        if (alt !== peak) peak = alt
      }
      // 跟此刻的嘴形一样（上一拍收口正好收到这个形）就换个相邻的，保证每拍都看得见一动；低语宁可停住也不张大
      const cur = keys.length ? keys[keys.length - 1].mouth : 'closed'
      if (peak === cur && lv !== 'soft') peak = talk.bump?.[peak] || peak
      prevPeak = peak
      keys.push({ at, mouth: peak })
      const dur = Math.max(until - at, 1)
      const rel = release[peak] || 'closed'
      if (dur * (1 - attack) >= 30) keys.push({ at: at + dur * attack, mouth: rel })
    })
    keys.push({ at: end, mouth: 'closed' })
  }
  keys.sort((a, b) => a.at - b.at)
  return keys.filter((k, i) => i === 0 || k.mouth !== keys[i - 1].mouth)
}

/** 口型轨道上 elapsed 毫秒时的嘴形。 */
export function mouthOnTrack(track, elapsed) {
  let state = 'closed'
  for (const k of track || []) {
    if (k.at > elapsed) break
    state = k.mouth
  }
  return state
}

// ───────────────────────── 眨眼 ─────────────────────────

/** 一次眨眼的步骤：闭（快）→ 睁（慢）；double 时睁到一半再闭一次。slow 时闭眼多停一会儿（低语、迟疑）。 */
export function blinkSteps(blink, { double = false, slow = false } = {}) {
  const close = blink?.close || [{ eyes: 'half', ms: 40 }, { eyes: 'closed', ms: 60 }]
  const open = blink?.open || [{ eyes: 'half', ms: 60 }]
  const hold = slow ? [{ eyes: 'closed', ms: 120 }] : []
  const one = [...close, ...hold, ...open]
  if (!double) return one
  const gap = [{ eyes: open[open.length - 1]?.eyes || 'half', ms: blink?.double_gap_ms ?? 110 }]
  return [...one, ...gap, ...one]
}

/** 下一次自然眨眼前等多久。 */
export function nextBlinkGap(blink, random = Math.random) {
  const [a, b] = blink?.interval_ms || [2200, 5600]
  return a + random() * Math.max(0, b - a)
}

// ───────────────────────── 转头 ─────────────────────────

/** from → to 的中间帧（没写的方向倒着用反方向的）。 */
export function turnFrames(pack, from, to) {
  const fwd = pack?.turns?.[`${from}>${to}`]
  if (fwd) return fwd
  const back = pack?.turns?.[`${to}>${from}`]
  return back ? [...back].reverse() : []
}

/**
 * 转头的步骤 [{ pose, frame, eyes, ms }]：眼睛领先——先在原姿势闭眼，播中间帧（图里本来就闭着眼），
 * 落到新姿势还闭着，再半闭、略垂、睁开。frame 有值时画中间帧整图，不贴眼睛嘴巴。
 */
export function turnSteps(pack, from, to) {
  const t = pack?.turn || {}
  const frames = turnFrames(pack, from, to)
  const ms = t.frames_ms?.length ? t.frames_ms : [150]
  return [
    ...(t.lead || []).map(s => ({ pose: from, frame: null, eyes: s.eyes, ms: s.ms })),
    ...frames.map((f, i) => ({ pose: to, frame: f, eyes: 'closed', ms: ms[Math.min(i, ms.length - 1)] })),
    ...(t.land || []).map(s => ({ pose: to, frame: null, eyes: s.eyes, ms: s.ms })),
  ]
}

export const stepsDuration = steps => steps.reduce((s, x) => s + x.ms, 0)

function stepAt(steps, t) {
  let r = t
  for (const s of steps) {
    if (r < s.ms) return s
    r -= s.ms
  }
  return null
}

// ───────────────────────── 演员：把几条时间轴合起来 ─────────────────────────

function seeded(seed) {
  let h = Math.floor(hash01(seed) * 4294967296) >>> 0
  return () => {
    h = (h + 0x6d2b79f5) >>> 0
    let x = Math.imul(h ^ (h >>> 15), 1 | h)
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * 一个立绘的状态机。全部按调用方给的 now（毫秒）推进，不读时钟，方便测试和「烤」成动图。
 *   say(plan, startAt)：这句话第一个字在 startAt 出现（转头没转完时调用方应把 startAt 往后挪 turn() 的返回值）；旁白、心声不动嘴
 *   hush()：不说了（换人说话、跳过）
 *   turn(to, now)：转到另一个姿势，返回要多少毫秒
 *   frame(now)：此刻该画什么 { pose, frame, eyes, mouth }
 */
export function createActor(pack, { seed = 'actor', now = 0, pose = '' } = {}) {
  const rand = seeded(seed)
  const blink = pack.blink || {}
  const st = {
    pose: (pose && pack.poses?.[pose] ? pose : '') || pack.default_pose || Object.keys(pack.poses || {})[0] || 'front',
    turn: null, // { steps, start, to }
    blink: null, // { steps, start }
    nextBlink: now + nextBlinkGap(blink, rand),
    queued: [], // 计划好的眨眼时刻（句末、开口）
    line: null, // { track, start, end }
    turnedAt: -Infinity, // 上次转完的时刻：刚睁开眼不再马上眨
  }

  const startBlink = (t, opts = {}) => {
    if (st.blink || st.turn) return
    const double = opts.double ?? rand() < (blink.double_chance ?? 0)
    st.blink = { steps: blinkSteps(blink, { double, slow: opts.slow }), start: t }
  }

  return {
    get pose() { return st.pose },
    say(plan, startAt) {
      const track = plan?.type && plan.type !== 'dialogue' ? [] : mouthTrack(pack.talk, plan)
      const end = startAt + (track.length ? track[track.length - 1].at : 0)
      st.line = { track, start: startAt, end }
      st.queued = []
      const lr = seeded(`${seed}|${(plan.chars || []).join('')}`)
      if (lr() < (blink.line_start_chance ?? 0)) st.queued.push(startAt + 40 + lr() * 120)
      ;(plan.chars || []).forEach((ch, i) => {
        if (SENTENCE_END.test(ch) && i < plan.chars.length - 1 && lr() < (blink.sentence_end_chance ?? 0)) {
          st.queued.push(startAt + plan.times[i] + 60 + lr() * 80)
        }
      })
      return end
    },
    hush() { st.line = null; st.queued = [] },
    turn(to, now) {
      if (!pack.poses?.[to]) return 0
      const from = st.turn ? st.turn.to : st.pose
      if (to === from) return st.turn ? Math.max(0, st.turn.start + stepsDuration(st.turn.steps) - now) : 0
      const steps = turnSteps(pack, from, to)
      st.turn = { steps, start: now, to }
      st.blink = null
      return stepsDuration(steps)
    },
    frame(now) {
      // 转头
      if (st.turn) {
        const s = stepAt(st.turn.steps, now - st.turn.start)
        if (s) return { pose: s.pose, frame: s.frame, eyes: s.eyes, mouth: 'closed', turning: true }
        st.pose = st.turn.to
        st.turn = null
        st.turnedAt = now
        st.nextBlink = now + nextBlinkGap(blink, rand)
      }
      // 眨眼：计划好的（句末、开口）优先，其次是自然间隔
      while (st.queued.length && st.queued[0] <= now) {
        st.queued.shift()
        if (now - st.turnedAt > 400) startBlink(now, { double: false })
      }
      if (!st.blink && now >= st.nextBlink) startBlink(now)
      let eyes = 'open'
      if (st.blink) {
        const s = stepAt(st.blink.steps, now - st.blink.start)
        if (s) eyes = s.eyes
        else { st.blink = null; st.nextBlink = now + nextBlinkGap(blink, rand) }
      }
      // 嘴
      let mouth = 'closed'
      if (st.line) {
        mouth = mouthOnTrack(st.line.track, now - st.line.start)
        if (now > st.line.end + 50) st.line = null
      }
      return { pose: st.pose, frame: null, eyes, mouth, turning: false }
    },
  }
}

/** 某一帧要画的图层 [{ file, x, y }]：姿势整图（或转头中间帧）+ 眼睛贴片 + 嘴巴贴片。 */
export function motionLayers(pack, f) {
  if (f.frame) return [{ file: f.frame, x: 0, y: 0 }]
  const pose = pack.poses[f.pose]
  const out = [{ file: pose.base, x: 0, y: 0 }]
  const eye = pose.parts?.eyes?.[f.eyes]
  if (eye) out.push(eye)
  const mouth = pose.parts?.mouth?.[f.mouth]
  if (mouth) out.push(mouth)
  return out
}

/** 素材包用到的全部图片（不重复）。 */
export function motionFiles(pack) {
  const files = []
  for (const p of Object.values(pack.poses || {})) {
    files.push(p.base)
    for (const states of Object.values(p.parts || {})) for (const v of Object.values(states)) files.push(v.file)
  }
  for (const list of Object.values(pack.turns || {})) files.push(...list)
  return [...new Set(files)]
}

/** 转头要文字等多久：转头本身 + 转完停一下再开口（原作转身后停 60~330ms）。没有这个姿势或不用转时是 0。 */
export const TURN_SETTLE_MS = 120
export function turnWaitMs(pack, from, to) {
  if (!pack?.poses?.[to] || !pack.poses[from] || from === to) return 0
  return stepsDuration(turnSteps(pack, from, to)) + TURN_SETTLE_MS
}

/**
 * 没写的节奏参数：依据见文件头。眨眼闭得快、睁得慢：半闭 40 → 闭 70 → 半闭 90，2.2~5.6 秒一次，18% 连眨；
 * 嘴一拍 95~160ms、开口占 60%；转头先闭眼 90ms、中间帧 150ms、到位后 150ms 睁开。
 * 不用「略垂」（lower）：NovelAI 局部重绘画不出睁四分之三的眼，多一张画法略不同的半闭眼只会让眨眼发抖；素材包自己写了才用。
 */
export const MOTION_DEFAULTS = {
  blink: {
    close: [{ eyes: 'half', ms: 40 }, { eyes: 'closed', ms: 70 }],
    open: [{ eyes: 'half', ms: 90 }],
    interval_ms: [2200, 5600],
    double_chance: 0.18,
    double_gap_ms: 110,
    sentence_end_chance: 0.5,
    line_start_chance: 0.3,
  },
  talk: {
    beat_ms: [95, 160],
    attack: 0.6,
    shapes: {
      normal: { A: 'half', E: 'half', I: 'narrow', O: 'round', U: 'round', N: 'narrow' },
      loud: { A: 'open', E: 'open', I: 'half', O: 'round', U: 'round', N: 'half' },
      soft: { A: 'narrow', E: 'narrow', I: 'narrow', O: 'narrow', U: 'narrow', N: 'closed' },
    },
    accent: { normal: ['half', 'open'], loud: ['open'], soft: ['narrow'] },
    release: { open: 'half', half: 'narrow', round: 'narrow', narrow: 'closed' },
    bump: { narrow: 'half', half: 'round', round: 'half', open: 'half', closed: 'narrow' },
  },
  turn: {
    lead: [{ eyes: 'half', ms: 40 }, { eyes: 'closed', ms: 50 }],
    frames_ms: [150],
    land: [{ eyes: 'closed', ms: 60 }, { eyes: 'half', ms: 90 }],
  },
}
