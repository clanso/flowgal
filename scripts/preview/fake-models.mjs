// 假模型、假画师：预览服务器（scripts/preview-server.mjs）和测试酒馆的假服务（scripts/st-mock.mjs）共用。
// 导演按单元编号回放 story.mjs 写好的整理结果；动作与表情设计回写好的一套；立绘设计师按角色档案和差分清单拼 tag；插画分镜师回 story.mjs 写好的 Base + 角色块；
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
  // 补设计合进写词：先补设计（同假的表演设计师），两份一起回
  if (prompt.includes('【先补设计】')) return JSON.stringify({ acting: JSON.parse(actingWriterReply(prompt)), sprites }, null, 1)
  return JSON.stringify({ sprites }, null, 1)
}

// 假动作与表情设计：按角色档案里的名字回一套写好的设计（真模型会读完资料和剧情来设计）。
// 情绪清单里每个都至少放进一个动作（平静、微笑这类常用的放进好几个，演示剧场身子不动只换脸）：写好的按写好的放，其余放进第一个动作；补设计时只回要补的那几条。
const ACTING = {
  林岚: {
    height: 166,
    read: '安静、爱捉弄人的学姐：情绪很少写在脸上，开心时只是嘴角压不住，被说中心事时会别过脸去，越在意越装得若无其事。',
    poses: [
      { label: '指尖搭在琴凳边', kind: 'self', desc: '弹琴的人的习惯：一只手垂着，指尖轻轻搭着，站得很稳', tags: 'one hand at side, fingers slightly curled, relaxed shoulders, weight on one leg', emotions: ['neutral', 'smile', 'happy', 'laugh', 'thinking', 'serious', 'tired', 'sad', 'cry'] },
      { label: '手背在身后歪头', kind: 'self', desc: '捉弄人、等你上钩的时候', tags: 'hands behind back, head tilt, weight on one leg', emotions: ['teasing', 'smug', 'love', 'confused', 'surprised', 'smile', 'neutral'] },
      { label: '别过脸按着胸口', kind: 'self', desc: '被说中心事、强装镇定的时候', tags: 'hand on own chest, head turned away, shoulders drawn in', emotions: ['shy', 'blush', 'pout', '害羞地强装镇定', 'worried', 'scared', 'smile'] },
      { label: '抱着胳膊', kind: 'self', desc: '冷下来、拒绝再说下去的时候', tags: 'arms crossed, straight posture', emotions: ['cold', 'angry', 'determined'] },
    ],
    faces: {
      neutral: { desc: '眉眼放松，嘴角微微收着，看不出在想什么', tags: 'closed mouth, calm, half-closed eyes' },
      smile: { desc: '嘴角压不住地往上翘，又很快收回去', tags: 'slight smile, closed mouth, half-closed eyes' },
      teasing: { desc: '眯起一只眼，坏心眼的笑', tags: 'teasing smile, one eye closed, smirk' },
      shy: { desc: '眼神躲开，耳尖先红', tags: 'light blush, looking away, pursed lips' },
      '害羞地强装镇定': { desc: '脸红了还要板着脸', tags: 'blush, looking away, pursed lips, straight face' },
      angry: { desc: '不吵，只是眼神冷下来', tags: 'expressionless, narrowed eyes, cold eyes, closed mouth' },
    },
  },
  苏晴: {
    height: 154,
    read: '元气的同学：什么都写在脸上，笑起来眯成一条缝，难过和生气也来得快去得快。',
    now: '心里压着三年前旧校舍的事：一提起来，元气就撑不住。',
    poses: [
      { label: '双手叉腰', kind: 'self', desc: '风风火火跑过来、精神十足的时候', tags: 'hands on hips, wide stance, energetic', emotions: ['neutral', 'smile', 'happy', 'laugh', 'smug', 'determined', 'angry', 'teasing', 'worried'] },
      { label: '攥着衣角', kind: 'situ', premise: '心里瞒着三年前旧校舍的事，一提起就慌', desc: '心里没底、不知道该不该说的时候', tags: 'hands clasped in front, gripping own skirt, shoulders drawn in', emotions: ['sad', 'cry', 'worried', 'scared', 'shy', 'surprised', 'serious', 'smile', 'neutral'] },
    ],
    faces: {
      smile: { desc: '笑得眼睛眯成一条缝', tags: 'happy, wide smile, closed eyes, open mouth' },
      sad: { desc: '嘴角往下撇，眼眶一下就红了', tags: 'sad, frown, teary eyes, biting lip' },
    },
  },
}
// 复盘：苏晴说出了三年前的事，「攥着衣角」收起；难过、哭、害怕搬进一个新动作（从说出口那一句起才有）
const REVIEW = {
  苏晴: {
    poses: [{ id: 'new1', label: '抱紧自己的胳膊', kind: 'situ', premise: '刚说出三年前的事，还没缓过来', desc: '说出口以后撑不住了，抱着自己发抖', tags: 'hugging own arms, shoulders drawn in, looking down', emotions: ['sad', 'cry', 'scared', 'worried'] }, { id: 'p1', emotions: ['serious', 'shy', 'surprised'] }],
    faces: [{ emotion: 'cry', desc: '咬着嘴唇，眼泪一直往下掉', tags: 'crying, tears, biting lip' }],
    now: '说出三年前的事以后，强撑的元气垮了下来，还没缓过来。',
  },
}
function actingWriterReply(prompt) {
  const name = (prompt.slice(prompt.indexOf('【角色档案】\n')).match(/名字：([^（\n]+)/) || [])[1] || ''
  const plan = ACTING[name] || { read: '', poses: [{ label: '站着', desc: '', tags: 'hands at sides', emotions: ['neutral'] }], faces: {} }
  // 动作跟着剧情变（lib/pose-life.js）：处境变了的复盘、到了新世界、给老设计标本性和处境
  if (prompt.includes('的处境在第')) return JSON.stringify(REVIEW[name] || {}, null, 1)
  if (prompt.includes('这个人从别的世界')) return JSON.stringify({ now: plan.now || '' })
  if (prompt.includes('还没分本性和处境')) return JSON.stringify({ read: plan.read, now: plan.now || '', poses: plan.poses.map((p, i) => ({ id: 'p' + (i + 1), kind: p.kind || 'self', premise: p.premise || '' })) }, null, 1)
  // 只重写表演笔记（人物志里「让设计师重写」）：换一种说法，看得出是新写的
  if (prompt.includes('这次只重写这个人的表演笔记')) return JSON.stringify({ read: plan.read ? '（重读资料后）' + plan.read : '情绪都写在脸上，来得快去得快。' })
  const head = prompt.includes('【要先设计的情绪】\n') ? '【要先设计的情绪】\n' : '【要设计的情绪】\n'
  const list = prompt.slice(prompt.indexOf(head)).split('\n').map(line => (line.match(/^- ([^（：]+)（/) || [])[1]).filter(Boolean)
  const adding = prompt.includes('【已有的动作与表情设计】')
  const faces = list.map(e => ({ emotion: e, ...(plan.faces[e] || { desc: '', tags: EXPRESSIONS[e] || EMOTION_TAGS[e] || 'calm, closed mouth' }) }))
  if (adding) return JSON.stringify({ poses: [{ id: 'p1', emotions: list }], faces }, null, 1)
  const placed = new Set(plan.poses.flatMap(p => p.emotions))
  const poses = plan.poses.map((p, i) => ({ id: 'p' + (i + 1), ...p, emotions: [...p.emotions, ...(i ? [] : list.filter(e => !placed.has(e)))] }))
  return JSON.stringify({ read: plan.read, now: plan.now || '', height: plan.height, poses, faces }, null, 1)
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
  if (system.includes('你是视觉小说的角色表演设计师')) return { reasoning: '', text: actingWriterReply(prompt) }
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
