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
 * 说话口型，跟着对话框的逐字时间轴走。talk：{ chars, times, speed, startedAt, done, type }，
 * 第 i 个字在 startedAt + times[i] 出现（times 见 lib/typing.js，标点后有停顿）。
 * 只有台词动嘴；还没出字、出到标点（停顿中）、最后一个字出完都闭嘴；
 * 每段话重新开口时从 mouth_loop 第一步（半张）开始，语速慢时开合也慢一点。
 */
export function mouthAt(loop, talk, now) {
  if (!talk || talk.done || talk.type !== 'dialogue' || !(talk.speed > 0) || !talk.chars?.length || !loop?.length) return 'closed'
  if (!Number.isFinite(talk.startedAt)) return 'closed' // 这一句还没开始逐字显现
  const { chars, times } = talk
  const elapsed = now - talk.startedAt
  if (!times || elapsed < times[0]) return 'closed'
  let i = 0
  while (i + 1 < times.length && times[i + 1] <= elapsed) i += 1
  if (i >= chars.length - 1 || SILENT.test(chars[i])) return 'closed'
  let start = i
  while (start > 0 && !SILENT.test(chars[start - 1])) start -= 1
  const factor = Math.min(1.4, Math.max(0.8, talk.speed / 35))
  const total = loop.reduce((s, x) => s + x.ms * factor, 0)
  let r = (elapsed - times[start]) % total
  for (const step of loop) {
    const ms = step.ms * factor
    if (r < ms) return step.mouth
    r -= ms
  }
  return loop[loop.length - 1].mouth
}
