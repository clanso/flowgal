// 逐字显现的时间轴：每个字在第几毫秒出现（纯函数，对话框、打字音和立绘口型共用一份）。
// 逆转裁判式的抑扬顿挫：普通字匀速，标点后停一拍——逗号短停，句末长停，省略号、破折号一个一停。
// 停顿按字速等比缩放（下面的倍数在 30ms/字时分别约 180ms、360ms、150ms）。

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
/** 不发声的字：标点、引号括号、空白。立绘在这些字上闭嘴。 */
export const SILENT = /[\s，、,；;：:。！？!?.…—～~“”‘’「」『』（）()\[\]【】《》〈〉"']/u

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

/** 第 i 个字出现的时刻（第一个字在 0）。speed 为 0（瞬间显示）时全是 0。 */
export function typeTimes(chars, speed) {
  const pauses = pausesAfter(chars, speed)
  const times = []
  let t = 0
  for (let i = 0; i < chars.length; i += 1) {
    if (i > 0) t += speed + pauses[i - 1]
    times.push(t)
  }
  return times
}
