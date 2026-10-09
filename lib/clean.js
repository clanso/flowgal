// 切单元之前，先把正文里明显不是故事的东西剥掉：思考过程、变量更新、网页外壳和控件、代码块标记、分隔线、Markdown 记号、HTML 实体。
// 拿不准的（状态栏、目录、作者的话、选项菜单、网页标题……）不在这里删，交给导演：它把不演的单元写进 skip（见 prompts.js）。
// 不依赖 Node API。

/** 连同里面的字整块丢掉的标签。 */
const DROP_TAGS = ['script', 'style', 'head', 'template', 'noscript', 'svg', 'canvas', 'iframe', 'object', 'button', 'select', 'textarea', 'nav', 'footer',
  'think', 'thinking', 'reasoning', 'analysis', 'updatevariable', 'statusplaceholderimpl']
const DROP_BLOCK = new RegExp(`<(${DROP_TAGS.join('|')})\\b[^>]*>([\\s\\S]*?)<\\/\\1\\s*>`, 'gi')
/** HTML 注释和 <!DOCTYPE html>。 */
const COMMENT = /<!--[\s\S]*?-->|<![a-z][^>]*>/gi
/** 块级标签换成换行，这样网页里一段一段、一格一格的字不会粘在一起。 */
const BLOCK_TAG = /<\/?(?:html|body|main|header|aside|section|article|div|p|br|hr|h[1-6]|ul|ol|li|dl|dt|dd|table|thead|tbody|tfoot|tr|caption|blockquote|pre|figure|figcaption|details|summary|center)\b[^<>]*>/gi
const CELL_GAP = /<\/t[dh]>\s*<t[dh]\b[^<>]*>/gi
/** 定义列表 <dt>名字</dt><dd>台词</dd>：剧本、wiki 里常这样排说话人和台词。 */
const TERM_GAP = /<\/dt>\s*<dd\b[^<>]*>/gi
const ANY_TAG = /<\/?[a-z][\w:-]*(?:\s[^<>]*)?\/?>/gi
const HAS_TAG = /<\/?[a-z][\w:-]*(?:\s[^<>]*)?\/?>/i
const MACRO = /\{\{\s*([^{}]*?)\s*\}\}|<(user|char|bot)>/gi

const ENTITIES = { nbsp: ' ', ensp: ' ', emsp: ' ', thinsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", hellip: '…', mdash: '—', ndash: '–', middot: '·', bull: '•', ldquo: '“', rdquo: '”', lsquo: '‘', rsquo: '’', laquo: '«', raquo: '»', times: '×', hearts: '♥', star: '☆' }
function decodeEntities(s) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (all, name) => {
    if (name[0] === '#') {
      const code = name[1] === 'x' || name[1] === 'X' ? parseInt(name.slice(2), 16) : Number(name.slice(1))
      return code > 0 && code < 0x110000 ? String.fromCodePoint(code) : all
    }
    return ENTITIES[name.toLowerCase()] ?? all
  })
}

/** Tavern 给插件的 text 就是这样去掉标签的（不补换行），按同样的办法算才能在 text 里找到同一段字。 */
const tavernPlain = s => s.replace(/<[^>]+>/g, '')

const FENCE = /^(?:```|~~~)/
/** 只由装饰符号组成的行：分隔线、Markdown 表格的分隔行、花边。 */
const DIVIDER = /^[\s\-—–_=~*·•●○◆◇■□▪▫★☆✦✧✿❀❖♡♥♪♫+#|:<>/\\═─━┄┅┈┉╌╍]{3,}$/u

/** 逐行收拾：去掉 Markdown 记号、代码块标记行、分隔线和空行。 */
function tidy(text) {
  return decodeEntities(text)
    .replace(/\r\n?/g, '\n')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\((?:https?:|#|\/)[^)]*\)/g, '$1')
    .split('\n')
    .map(line => line
      .replace(/^\s{0,3}#{1,6}\s+/, '')
      .replace(/^\s*>\s?/, '')
      .replace(/^\s*[-+•]\s+/, '')
      .replace(/(\*\*|__)(.+?)\1/g, '$2')
      .replace(/~~(.+?)~~/g, '$1')
      .replace(/[ \t 　]+/g, m => (m.includes('　') ? '　' : ' '))
      .trim())
    .filter(line => line && !FENCE.test(line) && !DIVIDER.test(line))
    .join('\n')
}

/** 网页式的正文（模型写了 HTML）：按结构转成一行一行的字。 */
function htmlToLines(source) {
  return source
    .replace(COMMENT, '')
    .replace(DROP_BLOCK, '')
    .replace(CELL_GAP, ' | ')
    .replace(TERM_GAP, '：')
    .replace(BLOCK_TAG, '\n')
    .replace(ANY_TAG, '')
}

/**
 * 原文里的 {{user}} / {{char}} 换成名字。{{char}} 用角色卡名；{{user}} 的名字从 Tavern 已经换好的 text 里对出来。
 * 有别的宏（变量、随机数……）或对不出来时返回 null，改用 Tavern 的 text。
 */
function resolveMacros(raw, text, cardName) {
  let unresolved = false
  let out = raw.replace(MACRO, (all, inner, angle) => {
    const key = String(inner ?? angle).toLowerCase()
    if ((key === 'char' || key === 'bot') && cardName) return cardName
    if (key === 'user') return all
    unresolved = true
    return all
  })
  if (unresolved) return null
  const userMacro = /\{\{\s*user\s*\}\}|<user>/i
  if (!userMacro.test(out)) return out
  const plainText = String(text)
  let name = ''
  for (const m of out.matchAll(/\{\{\s*user\s*\}\}|<user>/gi)) {
    const before = tavernPlain(out.slice(0, m.index)).split(userMacro).pop().slice(-6)
    const after = tavernPlain(out.slice(m.index + m[0].length)).split(userMacro)[0].slice(0, 6)
    if (!before.trim() && !after.trim()) continue
    const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const found = new RegExp(esc(before) + '([^\\n]{1,24}?)' + esc(after)).exec(plainText)
    if (found) { name = found[1]; break }
  }
  return name ? out.replace(/\{\{\s*user\s*\}\}|<user>/gi, name) : null
}

const visible = s => s.replace(/\s+/g, '').length

/**
 * 一轮正文里要切成单元的字。
 * text 是 Tavern 已经换好宏、去掉标签的正文；rawText 是模型写的原文。原文里有 HTML 时按原文的结构转（段落、表格不粘在一起，
 * 导航、页脚、思考、变量更新整块去掉）；转不了（有对不上的宏、或者原文比 text 多出一大截，说明 Tavern 的正则藏掉了东西）就用 text，
 * 并把原文里那几种整块丢掉的标签里的字从 text 里删掉。
 */
export function storyText({ text = '', rawText = '', card = null } = {}) {
  const plain = String(text || '')
  const raw = String(rawText || '')
  if (!plain.trim()) return ''
  const fallback = () => {
    let s = plain
    let cursor = 0
    for (const m of raw.replace(COMMENT, '').matchAll(DROP_BLOCK)) {
      const inner = tavernPlain(m[2].replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '')).trim()
      if (inner.length < 2 || /\{\{|<user>|<char>/i.test(inner)) continue
      const at = s.indexOf(inner, cursor)
      if (at < 0) continue
      s = s.slice(0, at) + s.slice(at + inner.length)
      cursor = at
    }
    return tidy(s)
  }
  if (!raw || !HAS_TAG.test(raw.replace(MACRO, ''))) return fallback()
  const resolved = resolveMacros(raw, plain, card?.name || '')
  if (resolved == null) return fallback()
  const fromHtml = tidy(htmlToLines(resolved))
  const fromText = fallback()
  return visible(fromHtml) > visible(fromText) * 1.3 + 80 ? fromText : fromHtml
}
