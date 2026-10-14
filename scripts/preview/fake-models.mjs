// 假模型、假画师：预览服务器（scripts/preview-server.mjs）和测试酒馆的假服务（scripts/st-mock.mjs）共用。
// 导演按单元编号回放 story.mjs 写好的整理结果；立绘设计师按角色档案和差分清单拼 tag；插画分镜师回 story.mjs 写好的 Base + 角色块；
// 画师按提示词程序化画占位图（背景画风景，立绘画半身像，插画把角色块画成人物叠上去）。
import { segmentTurn } from '../../lib/segment.js'
import { cleanTurnText } from '../../lib/clean.js'
import { emotionId } from '../../lib/emotions.js'
import { EMOTION_TAGS } from '../../lib/vocab.js'
import { grayPng, decodePng, encodePng } from '../../lib/image/png.js'
import { fromBase64 } from '../../lib/bytes.js'
import { fnv1a } from '../../lib/look.js'
import { CARD, TURNS, LATE_TURN, directorReply, CG_DRAFTS } from './story.mjs'
import { paintPlaceholder } from './paint.mjs'
import { paintSprite, spriteLayer } from './sprite.mjs'

// 假立绘设计师：读请求里的角色档案和差分清单，按固定外貌 + 衣服 + 情绪拼 tag（真模型会结合剧情写得更细）。
const EXPRESSIONS = {
  thinking: 'thinking, hand on own chin, looking down, closed mouth',
  smile: 'gentle smile, closed mouth, light blush',
  teasing: 'teasing smile, one eye closed, smirk',
  shy: 'shy, light blush, looking away, small smile',
  pout: 'pout, puffed cheeks, annoyed, furrowed brow',
  love: 'blush, heart-shaped pupils, smile',
  serious: 'serious, closed mouth, straight face',
  '害羞地强装镇定': 'blush, embarrassed, looking away, pursed lips, straight face, hand on own chest',
}
function spriteWriterReply(prompt) {
  const person = prompt.slice(prompt.lastIndexOf('【角色档案】'))
  const appearance = (person.match(/固定外貌：(.*)/) || [])[1] || '1girl'
  const sprites = []
  for (const m of prompt.matchAll(/^- (s\d+)：(.*)$/gm)) {
    const outfit = (m[2].match(/「[^」]*」（([^）]*)）/) || [])[1] || ''
    const states = [...(m[2].match(/长期状态 ([^；]*)/) || [])[1]?.matchAll(/（([^）]*)）/g) || []].map(x => x[1])
    const id = emotionId((m[2].match(/情绪「([^」]+)」/) || [])[1])
    const base = emotionId((m[2].match(/接近 (\S+)$/) || [])[1])
    const face = EXPRESSIONS[id] || EMOTION_TAGS[id] || EMOTION_TAGS[base] || EMOTION_TAGS.neutral
    sprites.push({ key: m[1], tags: [appearance, outfit, ...states, face].filter(Boolean).join(', ') })
  }
  return JSON.stringify({ sprites }, null, 1)
}

// 假插画分镜师：按「要画的插画」里的标题回 story.mjs 写好的 Base + 角色块。
function cgWriterReply(prompt) {
  const images = []
  for (const m of prompt.matchAll(/^- (c\d+)：(.*)$/gm)) {
    const title = (m[2].match(/标题「([^」]+)」/) || [])[1] || ''
    images.push({ key: m[1], ...(CG_DRAFTS[title] || { size: 'landscape', tag: 'outdoors, scenery, wide shot, soft lighting', nl: '', characters: [] }) })
  }
  return JSON.stringify({ images }, null, 1)
}

export const CG_THINKING = '状态账本：林岚此刻穿着海军蓝水手服，手里没有东西，没有长期状态。时代锚：现代日本高中，放学后的校舍。景别：她坐在琴凳上回头，用 cowboy shot 把琴键和回头的动作一起框进来；单人坐姿，竖版。表情：捉弄人的笑，配歪头和一点脸红；视线回头看向我。自查：tag 和 nl 里没有人名，衣服写成了指纹。'

export const THINKING = '先看这一轮的地点和时段，沿用上一幕的站位；说话人按引号前后的名字认，旁白里写到谁的动作就给谁换表情。值得画的只有一处，放在情绪最满的那句后面。'

/**
 * 假模型的一次回答：system 是系统提示词，prompt 是用户那段。回 { reasoning, text, turn }；认不出是哪一轮的导演请求回 text '{}'。
 * decorate(turn, units, reply) 可以改导演的整理结果（预览拿它配上示例曲）。
 */
/** 这次是谁：共用开头开着时（默认）在用户消息的【你的工作】开头那句，关着时在系统提示词里。 */
export function roleOf(system = '', prompt = '') {
  const i = prompt.indexOf('【你的工作】\n')
  return i < 0 ? system : prompt.slice(i + 7, i + 87)
}

// 假听音师：正文单元里认几种常见的声音，每种回一条带近义词的（真模型会读懂整段再列）。
const HEARD = [
  [/门/, '开门', ['开门', '推门', '门', '吱呀']], [/手机|电话/, '手机震动', ['手机', '震动', '来电', '铃声']], [/钢琴|琴/, '钢琴', ['钢琴', '琴声', '弹琴']],
  [/脚步|走/, '脚步声', ['脚步', '走路', '脚步声']], [/雨/, '雨声', ['雨', '下雨', '雨声']], [/风/, '风声', ['风', '风声']], [/铃/, '铃声', ['铃声', '铃', '钟声']],
]
function listenerReply(prompt) {
  const sfx = []
  for (const m of prompt.matchAll(/^\[(U\d+)\|[^\]]*\] (.*)$/gm)) {
    for (const [re, what, words] of HEARD) if (re.test(m[2]) && !sfx.some(h => h.what === what)) sfx.push({ at: m[1], what, words, cats: [] })
  }
  const place = (prompt.match(/【上一幕结束时】(.*)/) || [])[1] || ''
  return JSON.stringify({ amb: place && !place.includes('第一幕') ? [{ at: 'U1', what: place.split(' ')[0], words: place.split(' ').filter(Boolean), cats: [] }] : [], sfx }, null, 1)
}

export function fakeLlmReply({ system: raw = '', prompt = '', decorate = (turn, units, reply) => reply }) {
  const system = roleOf(raw, prompt)
  if (system.includes('你是视觉小说的拟音师')) return { reasoning: '', text: listenerReply(prompt) }
  if (system.includes('立绘设计师')) return { reasoning: '', text: spriteWriterReply(prompt) }
  if (system.includes('你是视觉小说的插画分镜师')) return { reasoning: CG_THINKING, text: cgWriterReply(prompt) }
  if (!system.includes('后台导演')) return { reasoning: '', text: '{}' }
  const turnInfo = [...TURNS, LATE_TURN].find(t => prompt.includes(t.sig || t.text.split('\n')[0].slice(0, 12)))
  if (!turnInfo) return { reasoning: '', text: '{}' }
  const units = segmentTurn(cleanTurnText({ text: turnInfo.text, rawText: turnInfo.raw || turnInfo.text, card: CARD }))
  return { reasoning: THINKING, text: JSON.stringify(decorate(turnInfo.turn, units, directorReply(turnInfo.turn, units)), null, 1), turn: turnInfo.turn }
}

// ───────── 假生图：立绘（白底 / 透明底的单人）画半身像；插画和背景按请求尺寸画风景，角色块画成人物叠上去 ─────────
/** 插画的每个角色块画一个人；没有角色块的单人图（画风的试画样图）按整段提示词画一个。 */
const figuresFor = (prompt, captions) => (captions.length ? captions.map(c => spriteLayer(c.char_caption)) : /\b1(girl|boy)\b/.test(prompt) ? [spriteLayer(prompt)] : [])

/**
 * 换脸的假结果：原图照旧，遮罩中间那一块（眉眼口）按这张的提示词染一层颜色（同一个提示词同一个颜色，种子不同深浅不同），
 * 遮罩边上不动（跟真的局部重绘一样，软边上新旧接得上，比对能过）。
 */
async function tintMasked(json, face) {
  const img = await decodePng(fromBase64(json.parameters.image))
  const mask = await decodePng(fromBase64(json.parameters.mask))
  const h = fnv1a(face)
  const color = [h & 255, (h >> 8) & 255, (h >> 16) & 255]
  const k = (0.35 + ((json.parameters.seed || 0) % 3) * 0.1) * (json.parameters.inpaintImg2ImgStrength ?? 1)
  const { width, height } = img
  let x0 = width, y0 = height, x1 = 0, y1 = 0
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) if (mask.data[(y * width + x) * 4]) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y) }
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, rx = (x1 - x0) / 2, ry = (y1 - y0) / 2
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const i = (y * width + x) * 4
      if (!mask.data[i] || ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 > 0.3) continue
      for (let c = 0; c < 3; c++) img.data[i + c] = img.data[i + c] * (1 - k) + color[c] * k
    }
  }
  return encodePng(img)
}

/**
 * 假画师：吃 NovelAI 的请求体（json），回 PNG。立绘（白底 / 透明底的单人）画半身像；插画和背景按请求尺寸画风景，角色块画成人物；
 * 局部重绘（action infill）：逆转式工作台的眨眼口型按状态回不同深浅的灰图（贴上去就看得出眨眼、张嘴在动）；
 * 表情只换脸回原图、遮罩那块按表情染一层颜色（看得出只有脸那块变了，换个表情换个颜色）。
 */
export async function fakePaint(json) {
  const chars = (json.parameters?.v4_prompt?.caption?.char_captions || []).map(c => c.char_caption).filter(Boolean)
  const sprite = chars.length && /transparent background|white background|simple background/.test(json.input || '')
  const prompt = sprite ? [json.input, ...chars].join(', ') : json.input || ''
  if (json.action === 'infill') {
    const face = chars[0] || prompt
    if (/^(closed eyes|half-closed eyes|parted lips|open mouth)/.test(face)) {
      const shade = /^closed eyes/.test(face) ? 30 : /^half-closed eyes/.test(face) ? 120 : /^open mouth/.test(face) ? 70 : 170
      return grayPng(json.parameters.width, json.parameters.height, () => shade)
    }
    return tintMasked(json, face)
  }
  return /white background|simple background/.test(prompt)
    ? paintSprite(prompt)
    : paintPlaceholder(prompt, { width: json.parameters?.width || 1216, height: json.parameters?.height || 832, figures: figuresFor(prompt, json.parameters?.v4_prompt?.caption?.char_captions || []) })
}
