// 打字音的时钟（纯函数，前后端共用；浏览器里由 src/client/theater/audio.js 接到 AudioContext 上）。
//
// 前瞻排程：以前每个字到点了才在「现在」响一下（setInterval 轮询），主线程一卡，声音先断、再几个挤成一团，
// 字（CSS 动画，不卡）和声音也对不上。现在照 Web Audio 的常规做法：每隔一小会儿把接下来 LOOKAHEAD_S 秒里的音
// 一次排到音频时钟的准点上（AudioContext 的时间线由音频线程走，主线程卡不住它）；卡得比前瞻还久时，
// 已经过点很久的音丢掉不补（补了就是一团），稍微过点的挪到现在。暂停后按原来的间隔接着走；停下之后不再排。
//
// 输出延迟：AudioContext 排在 t 的声音，要再过 outputLatency 才真的从耳机里出来（蓝牙一两百毫秒），
// 字按同样的延迟推迟，两边才对得上。
//
// 声像：按站位分左右（乘设置里的宽度），心声、电话、心灵感应、旁白居中，画外音偏到退场那一侧，特写往中间收。

/** 前瞻多久（秒）、多久泵一次（毫秒）、过点多久以内还照放（秒）。 */
export const LOOKAHEAD_S = 0.1
export const PUMP_MS = 25
export const LATE_OK_S = 0.03
/** 输出延迟最多补多少（毫秒）：浏览器偶尔报出离谱的值。 */
const MAX_DELAY_MS = 400

/**
 * 一句的排程器。notes 是 [{ at（毫秒，相对这句开始）, … }]（按时刻排好），start 是这句在音频时钟上从几秒开始，
 * play(note, when) 把一个音排到音频时钟的 when 秒。pump(now) 由定时器按 PUMP_MS 调（now 是音频时钟现在的秒数）。
 */
export function createLookahead(notes, { start = 0, play, lookahead = LOOKAHEAD_S, lateOk = LATE_OK_S } = {}) {
  const list = Array.isArray(notes) ? notes : []
  let next = 0
  let origin = start // 第 0 毫秒对应音频时钟的哪一秒（暂停后往后挪）
  let pausedAt = null
  let stopped = false
  let lastWhen = -Infinity
  return {
    pump(now) {
      if (stopped || pausedAt !== null) return
      while (next < list.length) {
        const when = origin + list[next].at / 1000
        if (when > now + lookahead) break
        const note = list[next]
        next += 1
        if (when < now - lateOk) continue // 过点太久：丢掉
        const at = Math.max(when, now, lastWhen + 0.001) // 稍微过点的挪到现在；同一瞬间不叠两个
        lastWhen = at
        play(note, at)
      }
    },
    pause(now) { if (pausedAt === null && !stopped) pausedAt = now },
    resume(now) { if (pausedAt !== null) { origin += now - pausedAt; pausedAt = null } },
    stop() { stopped = true },
    done() { return stopped || next >= list.length },
  }
}

/** 声音排下去之后还要多久才真的出来（毫秒）：outputLatency（拿不到用 baseLatency），封顶。 */
export function outputDelayMs(ac) {
  const s = Number(ac?.outputLatency) || Number(ac?.baseLatency) || 0
  return s > 0 ? Math.min(MAX_DELAY_MS, Math.round(s * 1000)) : 0
}

/** 站位 → 横向位置（百分比，跟 src/client/theater/playback.js 的 POS_X 一样）。 */
const POS_X = { farleft: 14, left: 28, center: 50, right: 72, farright: 86 }
/** 声像最远到多少（宽度 1 时 farleft / farright 是 ±0.55）。 */
const PAN_PER_PERCENT = 0.55 / 36
const CENTERED = new Set(['phone', 'radio', 'telepathy', 'machine', 'memory'])

/**
 * 一句台词的声像（-1 左 ~ 1 右）。pos 站位或 x 横向位置（百分比），width 设置里的声像宽度（默认 0.7，0 关掉），
 * type 台词 / 心声 / 旁白，style 声音的样子（电话里、画外……），exitSide 画外音那个人从哪边退场的，cam 这一句的镜头。
 */
export function voicePan({ pos = '', x, width = 0.7, type = 'dialogue', style = '', exitSide = '', cam = '' } = {}) {
  if (!(width > 0) || type !== 'dialogue' || CENTERED.has(style)) return 0
  let pan
  if (style === 'offscreen') pan = exitSide === 'left' ? -0.55 : exitSide === 'right' ? 0.55 : 0
  else {
    const px = Number.isFinite(x) ? x : POS_X[pos]
    if (!Number.isFinite(px)) return 0
    pan = (px - 50) * PAN_PER_PERCENT
  }
  if (cam === 'closeup' || cam === 'zoom' || cam === 'focus') pan *= 0.5 // 特写：人就在眼前
  return Math.max(-1, Math.min(1, pan * width))
}
