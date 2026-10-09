// 逆转式分层立绘：呼吸帧 + 眨眼 + 说话口型（纯函数，不碰 DOM，剧场和测试共用）。
// 素材包是一个 sprite.json 加同目录的图片：
//   size: [宽, 高]
//   breath: { frames: [文件...], lifts: [每帧头部上移的像素], steps: [{ frame, ms }...] }  —— 呼吸按 steps 循环；只有一帧 = 不呼吸
//   parts: { eyes: { half|closed: { file, x, y } }, mouth: { half|open: { file, x, y } } }  —— 差分贴片，贴在原图坐标 (x, y - lift)
//   blink: { sequence: [{ eyes, ms }...], interval_ms: [最短, 最长] }
//   talk: { mouth_loop: [{ mouth, ms }...] }
// 立绘记录带 aa: { manifest: 'sprite.json 的地址' } 时，剧场用这套素材画；没有就照旧显示原图。
import { SILENT } from './typing.js'

/** 按 steps 循环，返回 t 毫秒时该用第几张呼吸帧。 */
export function breathFrame(breath, t) {
  const steps = breath?.steps || []
  const cycle = steps.reduce((s, x) => s + x.ms, 0)
  if (!(cycle > 0)) return 0
  let r = ((t % cycle) + cycle) % cycle
  for (const s of steps) {
    if (r < s.ms) return s.frame
    r -= s.ms
  }
  return steps[steps.length - 1].frame
}

/** 下一次眨眼前等多久（interval_ms 区间内随机）。 */
export function blinkGap(blink, random = Math.random) {
  const [a, b] = blink?.interval_ms || [2000, 5000]
  return a + random() * (Math.max(a, b) - a)
}

/** 眨眼开始后 t 毫秒的眼睛状态；眨完返回 null。 */
export function blinkAt(blink, t) {
  let r = t
  for (const s of blink?.sequence || []) {
    if (r < s.ms) return s.eyes
    r -= s.ms
  }
  return null
}

/**
 * 说话口型，跟着对话框的演出计划走（lib/typing.js 的 planLine）。
 * talk：{ chars, times, gap, mouth, speed, startedAt, done, type }，第 i 个字在 startedAt + times[i] 出现，
 * gap 是这句的基本字距，mouth 是口型方式：
 *   loop 按 mouth_loop 循环开合（语速慢时也慢一点）；soft 同上但只半张（低语）；
 *   syllable 一字一张（威压：每个字先张大、再半张、再合上）；wide 张大嘴（怒吼、崩溃）。
 * 只有台词动嘴；还没出字、出到标点、最后一个字出完、下一个字还要等很久（说说停停、重音前那一顿）都闭嘴；
 * 每段话重新开口时从 mouth_loop 第一步（半张）开始。
 */
export function mouthAt(loop, talk, now) {
  if (!talk || talk.done || talk.type !== 'dialogue' || !(talk.speed > 0) || !talk.chars?.length || !loop?.length) return 'closed'
  if (!Number.isFinite(talk.startedAt)) return 'closed' // 这一句还没开始逐字显现
  const { chars, times } = talk
  const gap = talk.gap > 0 ? talk.gap : talk.speed
  const mode = talk.mouth || 'loop'
  const elapsed = now - talk.startedAt
  if (!times || elapsed < times[0]) return 'closed'
  let i = 0
  while (i + 1 < times.length && times[i + 1] <= elapsed) i += 1
  if (SILENT.test(chars[i])) return 'closed'
  const since = elapsed - times[i]
  const last = i >= chars.length - 1
  if (last && since > gap) return 'closed' // 最后一个字也要说完：再动一个字距才闭嘴
  const next = last ? gap : times[i + 1] - times[i]
  if (next > gap * 2.2 && since > gap) return 'closed'
  if (mode === 'syllable') {
    const slot = Math.max(next, 1)
    return since < slot * 0.5 ? 'open' : since < slot * 0.75 ? 'half' : 'closed'
  }
  // 这一段从哪个字开口：往回找到标点或长停顿
  let start = i
  while (start > 0 && !SILENT.test(chars[start - 1]) && times[start] - times[start - 1] <= gap * 2.2) start -= 1
  const t = elapsed - times[start]
  if (mode === 'wide') return t < 40 ? 'half' : 'open'
  const factor = Math.min(1.4, Math.max(0.8, gap / 35))
  const total = loop.reduce((s, x) => s + x.ms * factor, 0)
  let r = t % total
  let state = loop[loop.length - 1].mouth
  for (const step of loop) {
    const ms = step.ms * factor
    if (r < ms) { state = step.mouth; break }
    r -= ms
  }
  return mode === 'soft' && state === 'open' ? 'half' : state
}

// ───────────────────────── 导入素材包 ─────────────────────────
// 玩家在人物志里给一张差分导入素材包文件夹：先用 cleanPack 检查 sprite.json，按 packFiles 收齐要用的图片，
// 宿主存成素材后用 packWithAssets 把文件名换成素材编号，存进立绘记录的 aa.pack（剧场照着画，文件按编号去读）。

const PACK_FILE = /^(?!\/)(?!.*(?:^|\/)\.\.(?:\/|$))[^\\:*?"<>|\u0000-\u001f]{1,200}$/
const PART_STATE = /^[a-z_]{1,16}$/
const int = (v, lo, hi, what) => {
  const n = Number(v)
  if (!Number.isInteger(n) || n < lo || n > hi) throw new Error(`素材包的 ${what} 不对（要 ${lo}~${hi} 的整数，拿到 ${JSON.stringify(v)}）`)
  return n
}
const file = (v, what) => {
  if (typeof v !== 'string' || !PACK_FILE.test(v)) throw new Error(`素材包的 ${what} 文件名不对：${JSON.stringify(v)}`)
  return v
}
const list = (v, what) => {
  if (!Array.isArray(v)) throw new Error(`素材包缺 ${what}`)
  return v
}

/**
 * 检查并整理 sprite.json：尺寸、呼吸帧、眼睛 / 嘴巴差分（贴片坐标）、眨眼和口型节奏。
 * 只留剧场用得到的字段；文件名只能是素材包文件夹里的相对路径（不能往上跳）。不合法时抛错，说清哪一项不对。
 */
export function cleanPack(raw) {
  if (!raw || typeof raw !== 'object') throw new Error('sprite.json 不是一个对象')
  const size = list(raw.size, 'size（宽、高）')
  const w = int(size[0], 1, 8192, '宽'), h = int(size[1], 1, 8192, '高')
  const frames = list(raw.breath?.frames, 'breath.frames（呼吸帧）').map((f, i) => file(f, `第 ${i + 1} 张呼吸帧`))
  if (!frames.length || frames.length > 12) throw new Error('呼吸帧要 1~12 张')
  const lifts = frames.map((_, i) => int(raw.breath.lifts?.[i] ?? 0, -512, 512, `第 ${i + 1} 张呼吸帧的上移`))
  const steps = (raw.breath.steps?.length ? raw.breath.steps : [{ frame: 0, ms: 1000 }]).slice(0, 32)
    .map((s, i) => ({ frame: int(s?.frame, 0, frames.length - 1, `呼吸第 ${i + 1} 步的帧号`), ms: int(s?.ms, 10, 60000, `呼吸第 ${i + 1} 步的时长`) }))
  const parts = {}
  for (const part of ['eyes', 'mouth']) {
    const states = raw.parts?.[part]
    if (!states) continue
    parts[part] = {}
    for (const [state, p] of Object.entries(states)) {
      if (!PART_STATE.test(state)) throw new Error(`素材包的 ${part} 差分名不对：${state}`)
      parts[part][state] = { file: file(p?.file, `${part}.${state}`), x: int(p?.x, -w, w, `${part}.${state} 的 x`), y: int(p?.y, -h, h, `${part}.${state} 的 y`) }
    }
  }
  const pack = { name: String(raw.name || '').slice(0, 60), size: [w, h], breath: { frames, lifts, steps }, parts }
  if (raw.blink) {
    pack.blink = {
      sequence: list(raw.blink.sequence, 'blink.sequence').slice(0, 16).map((s, i) => ({ eyes: String(s?.eyes || ''), ms: int(s?.ms, 1, 5000, `眨眼第 ${i + 1} 步的时长`) })),
      interval_ms: [int(raw.blink.interval_ms?.[0] ?? 2000, 100, 60000, '眨眼最短间隔'), int(raw.blink.interval_ms?.[1] ?? 5000, 100, 60000, '眨眼最长间隔')],
    }
  }
  if (raw.talk?.mouth_loop) {
    pack.talk = { mouth_loop: list(raw.talk.mouth_loop, 'talk.mouth_loop').slice(0, 16).map((s, i) => ({ mouth: String(s?.mouth || ''), ms: int(s?.ms, 1, 5000, `口型第 ${i + 1} 步的时长`) })) }
  }
  return pack
}

/** 素材包要用到的全部图片（呼吸帧、眼睛和嘴巴的差分），不重复。导入后同一个函数列出的是素材编号。 */
export function packFiles(pack) {
  if (!pack) return []
  const parts = Object.values(pack.parts || {}).flatMap(states => Object.values(states).map(p => p.file))
  return [...new Set([...(pack.breath?.frames || []), ...parts])]
}

/** 把素材包里的文件名换成素材编号（ids：文件名 → 编号）。 */
export function packWithAssets(pack, ids) {
  const at = name => { if (!ids[name]) throw new Error('素材包缺文件：' + name); return ids[name] }
  const parts = {}
  for (const [part, states] of Object.entries(pack.parts || {})) {
    parts[part] = Object.fromEntries(Object.entries(states).map(([state, p]) => [state, { ...p, file: at(p.file) }]))
  }
  return { ...pack, breath: { ...pack.breath, frames: pack.breath.frames.map(at) }, parts }
}
