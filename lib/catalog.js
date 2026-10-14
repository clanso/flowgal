// 曲库、音效库、环境音库共用的整理办法（前后端共用，不依赖 Node）：分类最多两层，用 / 隔开（「R18/キス」）；
// 分类改名时子分类跟着走；批量加标签、去标签。

/** 分类在不在 cat 下面（cat 本身，或者它的子分类）。 */
export const underCategory = (category, cat) => Boolean(cat) && (category === cat || String(category || '').startsWith(cat + '/'))

/** 分类改名：from 改成 to，子分类跟着走（「R18/キス」改「亲密」后是「亲密/キス」）；不在 from 下面的返回 null。 */
export function renameCategory(category, from, to) {
  if (!underCategory(category, from)) return null
  return (String(to || '') + String(category).slice(from.length)).replace(/^\/+/, '')
}

/** 批量改标签：先去掉 removeTags 里的，再把 addTags 里没有的加在后面。 */
export function retag(tags, addTags = [], removeTags = []) {
  const gone = new Set(removeTags)
  const out = (tags || []).filter(t => !gone.has(t))
  for (const t of addTags) if (!out.includes(t)) out.push(t)
  return out
}
