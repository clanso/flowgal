// 拟音：剧场里小瞬间（拍照的快门、干杯、烟花、摸头……）用的合成声音。跟 lib/sounds.js 同一种配方写法，
// 前端照配方现场合成（src/client/theater/audio.js 的 foley），不需要音频文件；跟落字音效同一个开关和音量。

const p = (wave, f, dur, gain, more = {}) => ({ wave, f, dur, gain, ...more })

/** 一串很短的噼啪（烟花炸开后的碎响）：n 声，从 start 秒起，每声间隔 gap 上下晃一点（固定的错落，不用随机数）。 */
const crackle = (n, start, gap) => Array.from({ length: n }, (_, i) => p('noise', 3000 + (i % 3) * 900, 0.03, 0.05 + (i % 2) * 0.02, { q: 2.5, at: start + i * gap * (0.7 + ((i * 7) % 5) / 8) }))

export const FOLEY = Object.freeze({
  // 快门：咔、嚓两声，带一点机械的高音
  shutter: [p('noise', 4200, 0.035, 0.22, { q: 1.4 }), p('square', 1800, 0.02, 0.015, { attack: 0.001, lp: 3200 }), p('noise', 2600, 0.05, 0.16, { q: 1.1, at: 0.085 })],
  // 心动：两下轻轻的心跳，再一声很轻的铃
  heartbeat: [p('sine', 64, 0.16, 0.3, { to: 48 }), p('sine', 64, 0.2, 0.24, { to: 46, at: 0.22 }), p('sine', 1568, 0.9, 0.025, { at: 0.36 }), p('sine', 2093, 0.8, 0.02, { at: 0.44 })],
  // 摸头：噗、噗两下软软的
  pat: [p('sine', 340, 0.09, 0.13, { to: 230, attack: 0.004 }), p('noise', 900, 0.05, 0.04, { q: 0.8 }), p('sine', 340, 0.09, 0.11, { to: 230, attack: 0.004, at: 0.24 }), p('noise', 900, 0.05, 0.035, { q: 0.8, at: 0.24 })],
  // 戳脸：啵嘤（往上一挑）
  poke: [p('sine', 260, 0.24, 0.13, { to: 820, attack: 0.003 }), p('sine', 520, 0.12, 0.03, { to: 1400, attack: 0.003 })],
  // 干杯：各种杯子碰在一起
  'clink-glass': [p('sine', 2637, 0.8, 0.055), p('sine', 2793, 0.7, 0.04, { at: 0.012 }), p('sine', 3951, 0.45, 0.025), p('noise', 6000, 0.02, 0.05, { q: 2 })],
  'clink-ceramic': [p('sine', 1760, 0.28, 0.07), p('sine', 2350, 0.18, 0.03), p('noise', 3500, 0.04, 0.09, { q: 2 })],
  'clink-plastic': [p('noise', 1800, 0.05, 0.14, { q: 1.2 }), p('sine', 620, 0.06, 0.05, { attack: 0.002 })],
  'clink-can': [p('noise', 2500, 0.06, 0.1, { q: 1.5 }), p('square', 900, 0.1, 0.02, { lp: 2800 }), p('sine', 1450, 0.22, 0.03)],
  'clink-wood': [p('sine', 520, 0.1, 0.12, { attack: 0.001 }), p('noise', 1200, 0.03, 0.08, { q: 2 }), p('sine', 780, 0.06, 0.04, { attack: 0.001 })],
  'clink-metal': [p('sine', 1318, 1.1, 0.05), p('sine', 1975, 0.9, 0.035), p('sine', 3200, 0.5, 0.02), p('noise', 5000, 0.02, 0.05, { q: 2 })],
  // 烟花：咻地升空、砰地炸开、噼里啪啦
  'firework-launch': [p('sine', 500, 0.75, 0.025, { to: 1900, attack: 0.06 }), p('noise', 2200, 0.65, 0.04, { q: 3, attack: 0.12 })],
  'firework-boom': [p('sine', 72, 0.9, 0.28, { to: 36 }), p('noise', 420, 0.6, 0.16, { q: 0.6 }), ...crackle(9, 0.25, 0.07)],
  // 做好一道菜：叮！（微波炉、烤箱的铃）
  cook: [p('sine', 2093, 1, 0.07, { attack: 0.002 }), p('sine', 4186, 0.4, 0.015, { attack: 0.002 }), p('sine', 2093, 0.8, 0.04, { attack: 0.002, at: 0.16 })],
  // 新称呼：往上走的一串闪光
  nickname: [p('sine', 1319, 0.22, 0.045), p('sine', 1568, 0.22, 0.045, { at: 0.07 }), p('sine', 2093, 0.3, 0.045, { at: 0.14 }), p('sine', 2637, 0.6, 0.04, { at: 0.21 })],
  // 约定：两声风铃
  promise: [p('sine', 1760, 1, 0.045), p('sine', 2217, 0.9, 0.035, { at: 0.14 }), p('sine', 2637, 1.1, 0.03, { at: 0.28 })],
  // 交换联系方式：手机提示音（嘀嘟）
  contact: [p('sine', 988, 0.12, 0.06, { attack: 0.003 }), p('sine', 1319, 0.22, 0.06, { attack: 0.003, at: 0.11 })],
})

export const FOLEY_IDS = new Set(Object.keys(FOLEY))
/** 小瞬间各响哪一声（干杯按杯子材质响 clink-*，烟花自己排升空和炸开）。 */
export const MOMENT_FOLEY = Object.freeze({ photo: 'shutter', touch: 'heartbeat', pat: 'pat', poke: 'poke', cook: 'cook', nickname: 'nickname', promise: 'promise', contact: 'contact' })
