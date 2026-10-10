// 表情差分（只换脸）：galgame 的「一个动作 + 一套表情」。同一套衣服每个动作组整张画一张底图，
// 同组其余情绪在底图上用 NovelAI 局部重绘只重画脸——眉、眼、两颊、嘴——身体、衣服、头发外轮廓一个像素都不动。
// 这里是纯函数（宿主、浏览器、测试共用）：情绪归哪个动作组、脸框怎么推、提示词怎么换脸、重画的脸怎么贴回原图。
import { EMOTIONS, POSES, EMOTION_POSE, EMOTION_FACE } from './vocab.js'
import { emotionEntry } from './emotions.js'
import { tagKey, mergeTags, splitTags, OTHER_GAZE } from './image/style.js'

export const POSE_IDS = Object.keys(POSES)

/** 设置里「情绪 → 动作组」的改动：只留认识的动作组，键是情绪（内置英文键或新情绪原词）。 */
export function cleanPoseMap(map) {
  const out = {}
  if (!map || typeof map !== 'object' || Array.isArray(map)) return out
  for (const [emotion, pose] of Object.entries(map).slice(0, 200)) {
    const key = String(emotion).trim().slice(0, 16)
    if (key && POSES[pose] && key !== '__proto__') out[key] = pose
  }
  return out
}

/** 情绪归哪个动作组：设置里改过的 → 内置的默认 → 新情绪跟着它最接近的内置情绪 → 日常。 */
export function poseOf(emotion, custom = [], overrides = {}) {
  if (POSES[overrides?.[emotion]]) return overrides[emotion]
  if (EMOTION_POSE[emotion]) return EMOTION_POSE[emotion]
  const base = emotionEntry(emotion, custom).base
  if (base && POSES[overrides?.[base]]) return overrides[base]
  return EMOTION_POSE[base] || 'daily'
}

/** 动作组的底图画哪个情绪：默认的代表情绪还在这组就用它，被改到别的组了就用这组第一个内置情绪；一个都没有回空。 */
export function anchorOf(pose, custom = [], overrides = {}) {
  const preset = POSES[pose]?.anchor
  if (preset && poseOf(preset, custom, overrides) === pose) return preset
  return Object.keys(EMOTIONS).find(e => poseOf(e, custom, overrides) === pose) || ''
}

/** 这组里的内置情绪（设置页、人物志列出来）。 */
export const poseMembers = (pose, custom = [], overrides = {}) => Object.keys(EMOTIONS).filter(e => poseOf(e, custom, overrides) === pose)

// ───────────────────────── 表情 tag ─────────────────────────
// 脸上的表情：情绪词、眉眼嘴、脸红、泪、汗、视线。外貌（瞳色、眼型、睫毛、妆）、手的动作、构图都不算。

const FACE_MOOD = new Set([
  'happy', 'sad', 'angry', 'annoyed', 'surprised', 'shocked', 'scared', 'afraid', 'frightened', 'shy', 'embarrassed', 'flustered',
  'nervous', 'worried', 'anxious', 'serious', 'smug', 'confused', 'thinking', 'determined', 'tired', 'sleepy', 'excited', 'calm',
  'gentle', 'neutral', 'cold', 'love', 'lovestruck', 'jealous', 'disgusted', 'bored', 'pensive', 'sorrow', 'relieved', 'proud',
  'crying', 'laughing', 'expressionless', 'naughty face', 'trembling', 'panicking', 'teasing', 'doyagao', 'jitome', 'yandere',
])
const FACE_PART = new RegExp([
  '\\b(?:smil(?:e|ing)|smirk(?:ing)?|grin(?:ning)?|frown(?:ing)?|pout(?:ing)?|blush(?:ing)?|tears?|teary|crying|sobbing|laugh(?:ing)?)\\b',
  '\\b(?:teeth|lips?|mouth|tongue|fangs?|cheeks?|eyebrows?|brows?|glar(?:e|ing)|wink(?:ing)?|star(?:e|ing)|gaze|glance|pupils|sweat(?:drop|ing)?|expression(?:less)?)\\b',
  '\\b(?:closed|half-closed|narrowed|downcast|squinting|sparkling|empty|half-lidded|watery|teary|rolling|averted|crazy|shaded|cold|gentle|sleepy|tired|wide)[ -]eyes?\\b',
  '\\beyes? (?:closed|open)\\b', 'wide-eyed', 'bags under eyes', 'eye contact',
  '^looking (?:at viewer|at another|away|down|up|to the side|back|afar)$', '^sideways glance$',
  '^[:;=>^@x-][a-z3<>^_;@\\-o]{0,2}$',
].join('|'))
// 带这些词的是外貌、手、构图（hand over mouth、long eyelashes、eye-level、facing viewer），不算表情。
const NOT_FACE = /\b(?:hair|hand|hands|finger|fingers|arm|arms|holding|covering|eye-level|eyewear|eyepatch|eyeshadow|eyeliner|mascara|lipstick|eyelashes|facing|mask|paint|mark|whiskers?)\b/

export function isFaceTag(tag) {
  const key = tagKey(tag)
  if (!key || NOT_FACE.test(key)) return false
  return FACE_MOOD.has(key) || FACE_PART.test(key)
}

/** 一串 tag 里脸上的那些（保持原来的顺序和写法）。 */
export const faceTags = text => splitTags(text).filter(isFaceTag).join(', ')

/**
 * 这张差分换脸用的表情：设计师 / 玩家写的 tags 里挑出脸上的；挑不出来就用内置的（新情绪用它最接近的内置情绪的）。
 * 负面里跟这张表情打架的去掉（比如自己写了 smile，负面就不能有 smile）。
 */
export function faceFor(emotion, tags = '', negative = '', custom = []) {
  const preset = EMOTION_FACE[emotion] || EMOTION_FACE[emotionEntry(emotion, custom).base] || EMOTION_FACE.neutral
  const written = faceTags(tags)
  const face = written || preset.add
  const mine = new Set(splitTags(face).map(tagKey))
  const avoid = splitTags(written ? negative : mergeTags(preset.neg, negative)).filter(t => !mine.has(tagKey(t))).join(', ')
  return { tags: face, negative: avoid, preset: !written }
}

/**
 * 底图的提示词改成换脸用的：角色块里底图的表情拿掉，在原来表情的位置换上这张的；角色块负面加上这张要避开的。
 * 新表情的视线不看镜头时，Base 里的 looking at viewer 也拿掉。没有角色块的老记录改 Base。
 * drawn：{ positive, negative, characters, characterNegatives }（底图当初画的那套）；face：faceFor 的结果。
 */
export function swapFace(drawn, face) {
  const swap = text => {
    const tags = splitTags(text)
    const at = tags.findIndex(isFaceTag)
    const kept = tags.filter(t => !isFaceTag(t))
    // 原来没写表情：放在人数 / girl 后面（固定外貌之前也行，模型认得）
    kept.splice(at < 0 ? Math.min(1, kept.length) : at, 0, ...splitTags(face.tags))
    return mergeTags(kept.join(', '))
  }
  const away = splitTags(face.tags).some(t => OTHER_GAZE.test(tagKey(t)))
  const base = text => (away ? splitTags(text).filter(t => tagKey(t) !== 'looking at viewer').join(', ') : String(text || ''))
  if (drawn.characters?.length) {
    return {
      prompt: base(drawn.positive), negative: drawn.negative || '',
      characters: [swap(drawn.characters[0]), ...drawn.characters.slice(1)],
      characterNegatives: [mergeTags(drawn.characterNegatives?.[0] || '', face.negative), ...(drawn.characterNegatives || []).slice(1)],
    }
  }
  return { prompt: base(swap(drawn.positive)), negative: mergeTags(drawn.negative || '', face.negative), characters: [], characterNegatives: [] }
}

// ───────────────────────── 脸框 ─────────────────────────

const snap8 = v => Math.round(v / 8) * 8

/** 检查换脸的框：对齐 8 像素、夹在图里、至少 32×32、不超过整张图的 1/6（只换脸，不是重画半个人）。不对回 null。 */
export function cleanFaceBox(box, width, height) {
  const [x0, y0, x1, y1] = (Array.isArray(box) ? box : []).map(Number)
  if (![x0, y0, x1, y1, width, height].every(Number.isFinite)) return null
  const b = [Math.max(0, snap8(Math.min(x0, x1))), Math.max(0, snap8(Math.min(y0, y1))), Math.min(width, snap8(Math.max(x0, x1))), Math.min(height, snap8(Math.max(y0, y1)))]
  if (b[2] - b[0] < 32 || b[3] - b[1] < 32) return null
  if ((b[2] - b[0]) * (b[3] - b[1]) > (width * height) / 6) return null
  return b
}

/**
 * 从眼睛、嘴的框（认脸模型自动框的，或逆转式工作台框好的）推出换脸的框：
 * 左右各多出两眼间距的 0.15（两颊），上面多 0.22 盖住眉毛，下面到嘴下 0.22（不碰下巴轮廓）。
 * 照和服少女那张试出来的：眼睛 [320,216,392,280] [424,208,504,272]、嘴 [392,312,432,328] → [304,184,520,352]。
 */
export function faceBoxFrom(rects, width, height) {
  const ok = r => Array.isArray(r) && r.length === 4 && r.every(Number.isFinite) && r[2] > r[0] && r[3] > r[1]
  const eyes = (rects?.eyes || []).filter(ok).slice(0, 2)
  if (!eyes.length) return null
  const mouth = (rects?.mouth || []).find(ok)
  const cx = r => (r[0] + r[2]) / 2, cy = r => (r[1] + r[3]) / 2
  const d = eyes.length === 2 ? Math.hypot(cx(eyes[1]) - cx(eyes[0]), cy(eyes[1]) - cy(eyes[0])) : (eyes[0][2] - eyes[0][0]) * 1.5
  const eyeBottom = Math.max(...eyes.map(r => r[3]))
  const bottom = mouth ? Math.max(mouth[3], eyeBottom) : eyeBottom + 0.75 * d
  return cleanFaceBox([Math.min(...eyes.map(r => r[0])) - 0.15 * d, Math.min(...eyes.map(r => r[1])) - 0.22 * d, Math.max(...eyes.map(r => r[2])) + 0.15 * d, bottom + 0.22 * d], width, height)
}

// ───────────────────────── 像素 ─────────────────────────
// 图都是 { width, height, data }（RGBA，跟画布的 ImageData 一样）。

/** 垫白底并补到 64 的倍数（NovelAI 局部重绘要的）：回不透明的 RGBA。 */
export function padWhite(img) {
  const width = Math.ceil(img.width / 64) * 64, height = Math.ceil(img.height / 64) * 64
  const data = new Uint8ClampedArray(width * height * 4).fill(255)
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      const i = (y * img.width + x) * 4, j = (y * width + x) * 4
      const a = img.data[i + 3] / 255
      for (let c = 0; c < 3; c++) data[j + c] = img.data[i + c] * a + 255 * (1 - a)
    }
  }
  return { width, height, data }
}

/** 贴回时框边往里羽化的像素：框边上完全是原图，往里这么多像素后完全是重画的。 */
export const FACE_FEATHER = 8

function feather(x, y, [x0, y0, x1, y1], f) {
  const d = Math.min(x - x0, x1 - 1 - x, y - y0, y1 - 1 - y)
  if (d < 0) return 0
  const t = Math.min(1, Math.max(0, (d - 0.5) / f))
  return t * t * (3 - 2 * t)
}

/**
 * 把重画的脸贴回原图：只动框里，框边羽化；透明度沿用原图（重画时垫的白底不会带进来），
 * 半透明的地方（脸边的发丝）先去掉垫进去的白再贴，太透明的照旧用原图。
 * src 是原图，gen 是重画结果（垫过白、补过 64 的倍数，左上角对齐原图）。
 */
export function blendFace(src, gen, box, f = FACE_FEATHER) {
  if (gen.width < src.width || gen.height < src.height) throw new Error('重画结果比原图小，对不上')
  const out = new Uint8ClampedArray(src.data)
  const [x0, y0, x1, y1] = box
  for (let y = Math.max(0, y0); y < Math.min(y1, src.height); y++) {
    for (let x = Math.max(0, x0); x < Math.min(x1, src.width); x++) {
      const w = feather(x, y, box, f)
      const i = (y * src.width + x) * 4, j = (y * gen.width + x) * 4
      const a = src.data[i + 3] / 255
      if (!w || a < 0.5) continue
      for (let c = 0; c < 3; c++) {
        const g = a < 1 ? (gen.data[j + c] - 255 * (1 - a)) / a : gen.data[j + c]
        out[i + c] = src.data[i + c] * (1 - w) + g * w
      }
    }
  }
  return { width: src.width, height: src.height, data: out }
}
