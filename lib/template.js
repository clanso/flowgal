// 提示词模板的填法（浏览器和宿主共用）。

/**
 * 填模板：{{变量}} 换成值（没给的是空）；[[ … ]] 包起来的一段，里面的变量有一个是空的就整段不要（里面没有变量的照留）。
 * 值里写着的 {{ }}、[[ ]] 不会再被当成模板。
 */
export function fill(template, values = {}) {
  const get = key => { const v = values[key]; return v === undefined || v === null ? '' : String(v) }
  return String(template)
    .replace(/\[\[([\s\S]*?)\]\]/g, (_, seg) => ([...seg.matchAll(/\{\{(\w+)\}\}/g)].some(m => !get(m[1])) ? '' : seg))
    .replace(/\{\{(\w+)\}\}/g, (_, key) => get(key))
}

/** 模板里用到的变量名（按出现的顺序，不重复）。 */
export const templateVars = template => [...new Set([...String(template).matchAll(/\{\{(\w+)\}\}/g)].map(m => m[1]))]
