// 共用开头（设置 → 导演 → 共用开头，默认开）开着时，导演和几位设计师的系统提示词是同一句，各自是谁、照什么规矩写都在用户消息的【你的工作】里。
// 假模型认角色、测试看规矩，都照这两处一起看（关着时就是系统提示词）。
export const userText = request => request?.messages?.[0]?.content?.[0]?.text ?? request?.user ?? ''
/** 这次是谁：【你的工作】开头那句（没有就是系统提示词）。 */
export function roleText(request) {
  const user = userText(request)
  const i = user.indexOf('【你的工作】\n')
  return i < 0 ? request?.system || '' : user.slice(i + 7, i + 7 + 80)
}
/** 这次的全部规矩和资料：系统提示词 + 用户消息。 */
export const rulesText = request => (request?.system || '') + '\n' + userText(request)
/** 用户消息去掉【你的工作】那一段（规矩）：只看资料、剧情、档案和这次要写的。 */
export function ownText(request) {
  const user = userText(request)
  const i = user.indexOf('【你的工作】\n')
  if (i < 0) return user
  const rest = user.slice(i)
  const end = rest.search(/\n【(?:已经画过|要画的|上一幕)/)
  return user.slice(0, i) + (end < 0 ? '' : rest.slice(end + 1))
}
