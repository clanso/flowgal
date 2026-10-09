// 把一轮正文切成「演出单元」：旁白、台词、心里话。
// 导演模型只按单元编号回填说话人、表情和演出，不重写原文——原文一字不改，
// 输出也短得多（柏宝绘「段尾位置 ID」的思路）。
// 浏览器端也用同一份逻辑做「先文本」的即时预览，所以这里不依赖 Node API。

const QUOTE_PAIRS = [['“', '”'], ['「', '」'], ['『', '』'], ['"', '"'], ['﹁', '﹂']]
const OPENERS = new Map(QUOTE_PAIRS)
const PAGE_LIMIT = 96

/** 「林岚：」「林岚说：」「林岚低声道，」这类说话人提示。 */
const SPEAKER_BEFORE = /([\p{Script=Han}A-Za-z゠-ヿ·・]{1,8}?)(?:[^\p{Script=Han}A-Za-z]{0,2}(?:轻声|低声|小声|大声|笑着|笑|冷冷地|淡淡地|喃喃|忍不住|开口|回答|回应|反问|追问|补充|嘟囔|嘀咕|咕哝|叹气|叹)?(?:说道|说|道|问道|问|喊道|喊|叫道|叫|答道|答|笑道|嚷道|嚷|骂道|哼道|吼道|应道|应))?\s*[：:，,]?\s*$/u
const SCRIPT_LINE = /^\s*([\p{Script=Han}A-Za-z゠-ヿ·・ ]{1,10})\s*[：:]\s*(.+)$/u
const NOT_NAMES = new Set(['他', '她', '它', '我', '你', '他们', '她们', '我们', '你们', '大家', '众人', '有人', '对方', '声音', '旁白', '然后', '于是', '但是', '可是', '只是', '这时', '此时', '随后'])

function cleanName(raw) {
  const name = String(raw || '').replace(/^(?:对|向|朝|冲)/, '').trim()
  if (/^我/.test(name)) return '我'
  if (!name || name.length > 8 || NOT_NAMES.has(name) || /^[你他她它]/.test(name) || /[了的着地得一]/.test(name)) return ''
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
  // 返回 [{kind:'text'|'quote', text}]，嵌套引号不展开。
  const out = []
  let i = 0, buffer = ''
  while (i < paragraph.length) {
    const ch = paragraph[i]
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

const THOUGHT_WRAP = /^\s*[（(＊*]([\s\S]+)[）)＊*]\s*$/u

/**
 * @param {string} text 纯文本正文
 * @returns {{ id: string, type: 'narration'|'dialogue'|'thought', text: string, para: number, hint?: string }[]}
 */
export function segmentTurn(text) {
  const units = []
  const push = (type, body, para, hint) => {
    const value = String(body).trim()
    if (!value) return
    const unit = { id: 'U' + (units.length + 1), type, text: value, para }
    if (hint) unit.hint = hint
    units.push(unit)
  }
  const paragraphs = String(text || '').replace(/\r\n?/g, '\n').split(/\n+/).map(p => p.trim()).filter(Boolean)
  paragraphs.forEach((paragraph, para) => {
    const thought = THOUGHT_WRAP.exec(paragraph)
    if (thought && !/[“「『"]/.test(paragraph)) { for (const page of pageNarration(thought[1])) push('thought', page, para); return }
    const script = SCRIPT_LINE.exec(paragraph)
    if (script && !/[“「『"]/.test(paragraph.slice(0, script[1].length + 2))) {
      const name = cleanName(script[1])
      if (name) {
        const line = script[2].trim().replace(/^[“「『"]([\s\S]*)[”」』"]$/u, '$1')
        for (const page of pageNarration(line)) push('dialogue', page, para, name)
        return
      }
    }
    const pieces = splitQuotes(paragraph)
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
        if (inner.length > PAGE_LIMIT) for (const page of pageNarration(inner)) push('dialogue', page, para, hint)
        else push('dialogue', inner, para, hint)
      } else {
        for (const page of pageNarration(piece.text)) push('narration', page, para)
      }
    })
  })
  return units
}

/** 给导演看的带编号正文：每个单元一行。 */
export function unitsForPrompt(units) {
  return units.map(u => `[${u.id}|${u.type === 'dialogue' ? '台词' : u.type === 'thought' ? '心声' : '旁白'}${u.hint ? '|疑似:' + u.hint : ''}] ${u.text}`).join('\n')
}

/** 正文里的一句原话，用作 tavern.attach 的 anchor。 */
export function anchorFor(units, unitId) {
  const unit = units.find(u => u.id === unitId)
  if (!unit) return ''
  const first = splitSentences(unit.text)[0] || unit.text
  return first.slice(0, 200)
}
