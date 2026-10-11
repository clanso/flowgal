// 把一轮正文切成「演出单元」：旁白、台词、心里话（正文先经过 clean.js 剥掉思考、变量更新、网页外壳）。
// 导演模型只按单元编号回填说话人、表情和演出，不重写原文——原文一字不改，
// 输出也短得多（柏宝绘「段尾位置 ID」的思路）。
// 浏览器端也用同一份逻辑做「先文本」的即时预览，所以这里不依赖 Node API。

const QUOTE_PAIRS = [['“', '”'], ['「', '」'], ['『', '』'], ['"', '"'], ['﹁', '﹂']]
const OPENERS = new Map(QUOTE_PAIRS)
const PAGE_LIMIT = 96

/** 「林岚：」「林岚说：」「林岚低声道，」这类说话人提示。 */
const SPEAKER_BEFORE = /([\p{Script=Han}A-Za-z゠-ヿ·・]{1,8}?)(?:[^\p{Script=Han}A-Za-z]{0,2}(?:轻声|低声|小声|大声|笑着|笑|冷冷地|淡淡地|喃喃|忍不住|开口|回答|回应|反问|追问|补充|嘟囔|嘀咕|咕哝|叹气|叹)?(?:说道|说|道|问道|问|喊道|喊|叫道|叫|答道|答|笑道|嚷道|嚷|骂道|哼道|吼道|应道|应))?\s*[：:，,]?\s*$/u
/** 引号前只有「林岚」「林岚说：」「林岚低声道，」这样的说话人提示：名牌已经显示了名字，这段不再单独演一句旁白。 */
const SPEAKER_ONLY = new RegExp('^\\s*' + SPEAKER_BEFORE.source, 'u')
const SCRIPT_LINE = /^\s*([\p{Script=Han}A-Za-z゠-ヿ·・ ]{1,10})\s*[：:]\s*(.+)$/u
/** 「时间：19:40 ｜ 地点：屋檐下」这种一行几项的状态栏：不是「时间」在说话。 */
const STATUS_LIKE = /[｜|│].*[：:]|[：:].*[｜|│]/
/** 「【林岚】台词」「[林岚] 台词」：剧本、wiki 里常见的写法。 */
const BRACKET_LINE = /^\s*[【\[〔]([\p{Script=Han}A-Za-z゠-ヿ·・ ]{1,10})[】\]〕]\s*(.+)$/u
const NOT_NAMES = new Set(['他', '她', '它', '我', '你', '他们', '她们', '我们', '你们', '大家', '众人', '有人', '对方', '声音', '旁白', '然后', '于是', '但是', '可是', '只是', '这时', '此时', '随后'])

function cleanName(raw) {
  const name = String(raw || '').replace(/^(?:对|向|朝|冲)/, '').trim()
  if (/^我/.test(name)) return '我'
  if (!name || name.length > 8 || NOT_NAMES.has(name) || /^[你他她它]/.test(name) || /[你他她它]$/.test(name) || /[了的着地得一]/.test(name)) return ''
  return name
}

function splitSentences(text) {
  const parts = String(text).match(/[^。！？!?…~～\n]+(?:[。！？!?…~～]+[」』”"）)]*|$)/gu) || []
  return parts.map(s => s.trim()).filter(Boolean)
}

/** 把长旁白切成适合对话框的一页一页。 */
function pageNarration(text) {
  const sentences = splitSentences(text)
  const pages = []
  let current = ''
  for (const sentence of sentences) {
    if (current && (current + sentence).length > PAGE_LIMIT) { pages.push(current); current = '' }
    current += sentence
  }
  if (current) pages.push(current)
  return pages.length ? pages : [String(text).trim()].filter(Boolean)
}

function splitQuotes(paragraph) {
  // 返回 [{kind:'text'|'quote', text}]，嵌套引号不展开；【】里的引号（BGM 名、地点名）不拆，整段留在旁白里。
  const out = []
  let i = 0, buffer = ''
  while (i < paragraph.length) {
    const ch = paragraph[i]
    if (ch === '【') {
      const end = paragraph.indexOf('】', i + 1)
      if (end > i) { buffer += paragraph.slice(i, end + 1); i = end + 1; continue }
    }
    const close = OPENERS.get(ch)
    if (close) {
      const end = paragraph.indexOf(close, i + 1)
      if (end > i) {
        if (buffer.trim()) out.push({ kind: 'text', text: buffer })
        buffer = ''
        out.push({ kind: 'quote', text: paragraph.slice(i, end + 1), inner: paragraph.slice(i + 1, end) })
        i = end + 1
        continue
      }
    }
    buffer += ch
    i++
  }
  if (buffer.trim()) out.push({ kind: 'text', text: buffer })
  return out
}

/** 引号后紧跟「她说」「林岚问道」「林岚回过头」：前面那句是台词。 */
const SAID_AFTER = /^\s*[，,]?\s*[\p{Script=Han}A-Za-z]{1,6}?(?:轻声|低声|笑着|小声)?(?:说道|说|道|问道|问|喊道|喊|笑道|答道|叹道)/u
const ACTED_AFTER = /^\s*([\p{Script=Han}]{2,4}?)(?:回|笑|看|点|摇|低|抬|叹|转|轻|站|走|伸|皱|眨|歪|撇|挑|拍|拉|推|握|咬|扭|眯|别|捂|红)/u
/** 「刻着一行小字：「……」」「牌子上写着：“……”」：引的是字，不是谁在说话。 */
const WRITTEN_BEFORE = /(?:写|刻|印|绣|标|题|贴|涂)(?:着|有|了|道)[^，。！？,!?]{0,6}[：:]?\s*$|(?:小字|一行字|字样|字迹|字条|写的是)[：:]?\s*$/u

/**
 * 嵌在一句旁白里的引号——「最先告诉她“早上了”的，是……」「改为记录“哪些东西不会变”。」「刻着一行小字：「……」字是……」——
 * 是引用、强调或刻的字，不是有人开口，留在这句旁白里，不单拆成一行。
 */
function isInlineQuote(piece, before, after) {
  if (WRITTEN_BEFORE.test(before) && !namedSpeakerBefore(before)) return true
  const inner = piece.inner.trim()
  // 台词才会自带句末或句中的标点（“你好，”林岚说 / 「おう。二人がかりだ」）；引的词语不会。
  // 「林岚说：“好”。」：冒号、逗号引出来的是开口说话。
  if (/[：:，,]\s*$/.test(before)) return false
  if (!inner || inner.length > 24 || /[。！？!?…~～，,、；;—－]/.test(inner)) return false
  // 引号后紧接着这句话的下文（“早上了”的，是 / “不安定”之后 / “哪些东西不会变”。），没换行、没空格。
  if (!/^[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}A-Za-z0-9。，、；：！？,.;:!?…—]/u.test(after)) return false
  if (/^[我你他她它]/.test(after) || SAID_AFTER.test(after) || cleanName(ACTED_AFTER.exec(after)?.[1])) return false
  return true
}

/** 「林岚说：」「林岚低声道，」这种带说话动作、名字也像名字的提示。 */
function namedSpeakerBefore(before) {
  const m = /([\p{Script=Han}A-Za-z゠-ヿ·・]{1,8}?)(?:说道|说|道|问道|问|喊道|喊|答道|答|笑道)\s*[：:，,]\s*$/u.exec(before)
  return !!cleanName(m?.[1])
}

/** 把嵌在旁白里的引号并回旁白：前后的文字和引号连成一段。 */
function mergeInlineQuotes(pieces) {
  const out = []
  pieces.forEach((piece, index) => {
    const before = pieces[index - 1]?.kind === 'text' ? pieces[index - 1].text : ''
    const after = pieces[index + 1]?.kind === 'text' ? pieces[index + 1].text : ''
    const kind = piece.kind === 'quote' && isInlineQuote(piece, before, after) ? 'text' : piece.kind
    const last = out[out.length - 1]
    if (kind === 'text' && last?.kind === 'text') last.text += piece.text
    else out.push(kind === 'text' ? { kind, text: piece.text } : piece)
  })
  return out
}

const THOUGHT_WRAP = /^\s*[（(＊*]([\s\S]+)[）)＊*]\s*$/u

/**
 * @param {string} text 纯文本正文
 * @returns {{ id: string, type: 'narration'|'dialogue'|'thought', text: string, para: number, hint?: string }[]}
 */
export function segmentTurn(text) {
  const units = []
  const push = (type, body, para, hint, src) => {
    const value = String(body).trim()
    if (!value) return
    const unit = { id: 'U' + (units.length + 1), type, text: value, para }
    if (hint) unit.hint = hint
    // src：这个单元在原文里的样子（带引号、带被省掉的「林岚说：」），导演把几个单元合并回一句时按它拼回原文。
    const raw = String(src || '').trim()
    if (raw && raw !== value) unit.src = raw
    units.push(unit)
  }
  const paragraphs = String(text || '').replace(/\r\n?/g, '\n').split(/\n+/).map(p => p.trim()).filter(Boolean)
  paragraphs.forEach((paragraph, para) => {
    const thought = THOUGHT_WRAP.exec(paragraph)
    if (thought && !/[“「『"]/.test(paragraph)) { for (const page of pageNarration(thought[1])) push('thought', page, para); return }
    const script = STATUS_LIKE.test(paragraph) ? null : SCRIPT_LINE.exec(paragraph) || BRACKET_LINE.exec(paragraph)
    if (script && !/[“「『"]/.test(paragraph.slice(0, script[1].length + 2))) {
      const name = cleanName(script[1])
      if (name) {
        const line = script[2].trim().replace(/^[“「『"]([\s\S]*)[”」』"]$/u, '$1')
        for (const page of pageNarration(line)) push('dialogue', page, para, name)
        return
      }
    }
    // 表格的一行（网页里的 <td>、Markdown 表格）：第一格是人名就是这个人的台词，否则各格连成一句旁白。
    if (/\S\s*\|\s*\S/.test(paragraph)) {
      const cells = paragraph.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map(c => c.trim()).filter(Boolean)
      const name = cells.length >= 2 && /^[\p{Script=Han}A-Za-z゠-ヿ·・ ]{1,10}$/u.test(cells[0]) ? cleanName(cells[0]) : ''
      if (name) {
        const line = cells.slice(1).join('\u3000').replace(/^[“「『"]([\s\S]*)[”」』"]$/u, '$1')
        for (const page of pageNarration(line)) push('dialogue', page, para, name)
        return
      }
      if (cells.length >= 2) paragraph = cells.join('\u3000')
    }
    // 整行都是【BGM：…】【背景：…】这样的舞台标注：一整段交给导演（通常 skip），不按句子拆开。
    if (/^(?:【[^】]*】\s*)+$/u.test(paragraph)) { push('narration', paragraph, para); return }
    const pieces = mergeInlineQuotes(splitQuotes(paragraph))
    let cueText = ''
    pieces.forEach((piece, index) => {
      if (piece.kind === 'quote') {
        const before = pieces[index - 1]?.kind === 'text' ? pieces[index - 1].text : ''
        const after = pieces[index + 1]?.kind === 'text' ? pieces[index + 1].text : ''
        let hint = cleanName(SPEAKER_BEFORE.exec(before.trim())?.[1])
        if (!hint) {
          const m = /^\s*[，,]?\s*([\p{Script=Han}A-Za-z]{1,6}?)(?:轻声|低声|笑着|小声)?(?:说道|说|道|问道|问|喊道|喊|笑道|答道|叹道)/u.exec(after)
          hint = cleanName(m?.[1])
          // 「“……”林岚回过头」：引号后紧跟人名和动作，作为弱提示交给导演确认。
          if (!hint) hint = cleanName(/^\s*([\p{Script=Han}]{2,4}?)(?:回|笑|看|点|摇|低|抬|叹|转|轻|站|走|伸|皱|眨|歪|撇|挑|拍|拉|推|握|咬|扭|眯|别|捂|红)/u.exec(after)?.[1])
        }
        const inner = piece.inner.trim()
        if (inner.length > PAGE_LIMIT) pageNarration(inner).forEach((page, n, all) => push('dialogue', page, para, hint, (n ? '' : cueText + piece.text[0]) + page + (n === all.length - 1 ? piece.text.at(-1) : '')))
        else push('dialogue', inner, para, hint, cueText + piece.text)
        cueText = ''
      } else {
        // 台词后面剩下的一个「。」「，」：不单独演成一行。
        if (pieces.length > 1 && !/[\p{L}\p{N}]/u.test(piece.text)) return
        const cue = SPEAKER_ONLY.exec(piece.text)?.[1]
        if (pieces[index + 1]?.kind === 'quote' && cue && cleanName(cue) === cue.trim()) { cueText = piece.text.trim(); return }
        for (const page of pageNarration(piece.text)) push('narration', page, para)
      }
    })
  })
  return units
}

/**
 * 导演发现切错了（一句旁白被引号切成几段）时写 join: ["U7-U9"]：同一段里连着的几个单元合并成一个旁白单元，
 * 编号用第一个的，文字按原文拼回去（带引号、带被省掉的说话人提示），一字不改。
 * 返回 { units, alias }：alias 把被并掉的编号指向合并后的编号。没合并任何东西时 units 就是传进来的那个数组。
 */
export function joinUnits(units, spec) {
  const list = Array.isArray(spec) ? spec : typeof spec === 'string' ? spec.split(/[,，、\s]+/) : []
  const order = new Map(units.map((u, i) => [u.id, i]))
  const taken = new Set()
  const groups = []
  for (const item of list) {
    const m = /^(U\d+)\s*(?:[-~–—至到]\s*(U\d+))$/i.exec(String(item ?? '').trim().slice(0, 24))
    const a = m && order.get(m[1].toUpperCase())
    const b = m && order.get(m[2].toUpperCase())
    if (a == null || b == null || a === b) continue
    const [from, to] = [Math.min(a, b), Math.max(a, b)]
    const group = units.slice(from, to + 1)
    if (group.length > 12 || group.some(u => u.para !== group[0].para || taken.has(u.id))) continue
    group.forEach(u => taken.add(u.id))
    groups.push(group)
  }
  const alias = new Map()
  if (!groups.length) return { units, alias }
  const merged = new Map()
  for (const group of groups) {
    const [first, ...rest] = group
    merged.set(first.id, { id: first.id, type: 'narration', text: group.map(u => u.src || u.text).join(''), para: first.para })
    for (const u of rest) { alias.set(u.id, first.id); merged.set(u.id, null) }
  }
  return { units: units.flatMap(u => (merged.has(u.id) ? (merged.get(u.id) ? [merged.get(u.id)] : []) : [u])), alias }
}

/** 去掉包在外面的一层引号、括号：「……」（……）。 */
function unwrap(text) {
  const t = String(text || '').trim()
  const m = /^([「『“"（(【\[〔])([\s\S]+)([」』”"）)】\]〕])$/u.exec(t)
  return m ? m[2].trim() : t
}

/**
 * 双语对照：导演认出一句外语原文配一句翻译时写 dual，剧场按注音的样子演（上方小字原文、下方翻译）。
 * 写法不限于某一种格式，导演怎么认出来的都行，只要标的是原文里真有的东西：
 *   { orig: "U3", tr: "U4" }            原文、翻译各是连着的单元（也可以写区间 U3-U4），合起来要连成一片，谁先谁后都行；
 *   { u: "U5", orig: "原文", tr: "翻译" } 原文和翻译挤在同一个单元里：两段都必须是这个单元里照抄的字。
 * 合并后编号用最前面那个，类型和说话人提示跟原文走，text 是翻译（打字、导演、重音都按它），orig 是原文。
 * alias 是 joinUnits 给的旧编号映射，返回的 alias 在它的基础上接着记。
 */
export function pairUnits(units, spec, alias = new Map()) {
  const list = Array.isArray(spec) ? spec : []
  const ref = id => { const key = String(id || '').trim().toUpperCase(); return alias.get(key) || key }
  const order = new Map(units.map((u, i) => [u.id, i]))
  const span = value => {
    const m = /^(U\d+)\s*(?:[-~–—至到]\s*(U\d+))?$/i.exec(String(value ?? '').trim().slice(0, 24))
    const a = m && order.get(ref(m[1]))
    const b = m && (m[2] ? order.get(ref(m[2])) : a)
    return a == null || b == null ? null : [Math.min(a, b), Math.max(a, b)]
  }
  const taken = new Set()
  const replaced = new Map() // 编号 → 新单元（null 是被并掉的）
  const next = new Map(alias)
  for (const item of list) {
    if (!item || typeof item !== 'object') continue
    // 同一个单元里的原文 + 翻译：两段都得是原文照抄
    if (item.u != null) {
      const unit = units[order.get(ref(item.u))]
      if (!unit) continue
      const orig = unwrap(String(item.orig || '').slice(0, 400))
      const tr = unwrap(String(item.tr || '').slice(0, 400))
      const body = unit.src || unit.text
      if (!orig || !tr || taken.has(unit.id) || !body.includes(orig) || !body.includes(tr) || orig === tr) continue
      taken.add(unit.id)
      replaced.set(unit.id, { ...unit, text: tr, orig, src: undefined })
      continue
    }
    const o = span(item.orig)
    const t = span(item.tr)
    if (!o || !t || (o[0] <= t[1] && t[0] <= o[1])) continue
    const from = Math.min(o[0], t[0])
    const to = Math.max(o[1], t[1])
    // 原文和翻译之间不能夹着别的单元，一共最多 12 个
    if (to - from + 1 !== (o[1] - o[0] + 1) + (t[1] - t[0] + 1) || to - from + 1 > 12) continue
    const group = units.slice(from, to + 1)
    if (group.some(u => taken.has(u.id))) continue
    group.forEach(u => taken.add(u.id))
    const origUnits = units.slice(o[0], o[1] + 1)
    const trUnits = units.slice(t[0], t[1] + 1)
    const head = origUnits[0]
    const unit = { id: group[0].id, type: head.type, text: unwrap(trUnits.map(u => u.text).join('')), orig: unwrap(origUnits.map(u => u.text).join('')), para: group[0].para }
    const hint = origUnits.map(u => u.hint).find(Boolean)
    if (hint) unit.hint = hint
    replaced.set(group[0].id, unit)
    for (const u of group.slice(1)) replaced.set(u.id, null)
  }
  if (!replaced.size) return { units, alias }
  // 被并掉的编号指向合并后的编号；之前 join 记下的、指向它们的旧编号一起改过去
  let owner = ''
  for (const u of units) {
    if (!replaced.has(u.id)) { owner = ''; continue }
    if (replaced.get(u.id)) owner = u.id
    else next.set(u.id, owner)
  }
  for (const [from, to] of next) if (replaced.has(to) && replaced.get(to) === null) next.set(from, next.get(to))
  const out = units.flatMap(u => {
    if (!replaced.has(u.id)) return [u]
    const unit = replaced.get(u.id)
    if (!unit) return []
    if (unit.src === undefined) delete unit.src
    return [unit]
  })
  return { units: out, alias: next }
}

/** 给导演看的带编号正文：每个单元一行。 */
export function unitsForPrompt(units) {
  return units.map(u => `[${u.id}|${u.type === 'dialogue' ? '台词' : u.type === 'thought' ? '心声' : '旁白'}${u.hint ? '|疑似:' + u.hint : ''}] ${u.text}${u.orig ? `（原文：${u.orig}）` : ''}`).join('\n')
}

/** 正文里的一句原话，用作 tavern.attach 的 anchor。 */
export function anchorFor(units, unitId) {
  const unit = units.find(u => u.id === unitId)
  if (!unit) return ''
  const first = splitSentences(unit.text)[0] || unit.text
  return first.slice(0, 200)
}
