// 剧场左上角、右上角每一样显示不显示（设置 → 外观与演出 → 调试信息；存在 ui.corner）。
// 大多是调试用的，默认不显示；通话中的小卡、连接中断的提示默认显示。右上角的关闭按钮一直在，不在这里。

/** 每一样：id、在哪个角、叫什么、默认开不开。左上角的地点没写时显示「第几轮」；别的标签只在这一幕有这一样时出现（天气晴、光线正常这类不显示）。 */
export const CORNER_ITEMS = [
  { id: 'place', side: 'left', label: '地点', on: false },
  { id: 'mode', side: 'left', label: '段落（回忆、梦境……）', on: false },
  { id: 'time', side: 'left', label: '时段', on: false },
  { id: 'weather', side: 'left', label: '天气', on: false },
  { id: 'light', side: 'left', label: '光线', on: false },
  { id: 'fx', side: 'left', label: '画面效果', on: false },
  { id: 'romance', side: 'left', label: '亲密氛围', on: false },
  { id: 'sense', side: 'left', label: '感官', on: false },
  { id: 'mood', side: 'left', label: '配乐情绪', on: false },
  { id: 'director', side: 'right', label: '导演整理中', on: false },
  { id: 'drawing', side: 'right', label: '出图进度', on: false },
  { id: 'track', side: 'right', label: '正在放的曲子', on: false },
  { id: 'call', side: 'right', label: '通话中', on: true },
  { id: 'error', side: 'right', label: '连接中断', on: true },
]
export const CORNER_DEFAULTS = Object.fromEntries(CORNER_ITEMS.map(i => [i.id, i.on]))

/**
 * 收拾存下的 ui.corner：认得的、是 true / false 的留下，别的按默认。
 * old 是早先一版的整块开关：{ showHud, showStatus } 打开过的那几样当作开着（左上角全部；右上角的导演整理中、出图进度、曲子）。
 */
export function cleanCorner(saved, old = {}) {
  const own = saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {}
  const wasOn = item => (old.showHud === true && item.side === 'left') || (old.showStatus === true && ['director', 'drawing', 'track'].includes(item.id))
  return Object.fromEntries(CORNER_ITEMS.map(i => [i.id, typeof own[i.id] === 'boolean' ? own[i.id] : wasOn(i) || i.on]))
}
