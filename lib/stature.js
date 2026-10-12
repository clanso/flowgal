// 立绘在剧场里的大小和高低：照 galgame 的做法，同一个舞台上大家的头一样大，高的人站出来头在上面、矮的在下面。
// 模型画 cowboy shot 时远近不一定（有的贴得近、头很大，有的远、头很小），所以按认出来的脸框把每张立绘缩放到同一个头身比；
// 再按这个人的身高（厘米）抬高或压低。纯函数，宿主和浏览器共用。

// 外貌 tag 拆开、去掉权重写法（不引 image/style.js：cast.js 要用这里，style.js 又引 cast.js）
const keysOf = text => String(text || '').split(/[,，\n]+/).map(t => t.trim().replace(/^-?\d*\.?\d+::|::$/g, '').replace(/^[{[(]+|[}\])]+$/g, '').trim().toLowerCase().replace(/\s+/g, ' ')).filter(Boolean)

/** 没写身高时按性别：成年女性、男性、不知道。 */
export const BASE_HEIGHT = { female: 160, male: 172, other: 165 }
export const MIN_HEIGHT = 60
export const MAX_HEIGHT = 260

// 外貌 tag 里看得出身高的：孩子、矮人这些直接定，矮小、高挑在性别的基础上加减。
const ABSOLUTE = [
  [/^(?:toddler|baby|infant)$/, 95],
  [/^(?:child|kid|loli|shota|little girl|little boy|young child|aged down|chibi)$/, 128],
  [/^(?:dwarf|halfling|hobbit|gnome)$/, 125],
  [/^(?:giant|giantess|ogre|troll)$/, 230],
]
// 每组只算一次（very tall 和 tall 都写了按 very tall）
const RELATIVE = [
  [[/^(?:very tall|towering)$/, 16], [/^(?:tall|tall female|tall male)$/, 10], [/^(?:petite|short|short stature|small|tiny|small stature)$/, -10]],
  [[/^(?:teen|teenage|teenager|young teen)$/, -4], [/^(?:elderly|old man|old woman|old)$/, -3]],
]
const FEMALE = /^(?:\d?girls?|woman|women|female|mature female|lady)$/
const MALE = /^(?:\d?boys?|man|men|male|mature male|old man)$/

/** 档案没写性别时按外貌 tag 猜（1girl / 1boy）。 */
export function genderOf(person) {
  if (person?.gender === 'female' || person?.gender === 'male') return person.gender
  const keys = keysOf(person?.appearance)
  if (keys.some(k => FEMALE.test(k))) return 'female'
  if (keys.some(k => MALE.test(k))) return 'male'
  return 'other'
}

/** 按性别和外貌 tag 估的身高（厘米）。 */
export function guessHeight(person) {
  const keys = keysOf(person?.appearance)
  for (const [re, cm] of ABSOLUTE) if (keys.some(k => re.test(k))) return cm
  let cm = BASE_HEIGHT[genderOf(person)]
  for (const group of RELATIVE) {
    const hit = group.find(([re]) => keys.some(k => re.test(k)))
    if (hit) cm += hit[1]
  }
  return cm
}

/** 身高写法统一：整数厘米，超出范围或不是数的回 null。 */
export function cleanHeight(value) {
  if (value === null || value === undefined || value === '') return null
  const n = Math.round(Number(value))
  return Number.isFinite(n) && n >= MIN_HEIGHT && n <= MAX_HEIGHT ? n : null
}

/** 这个人的身高和它从哪来：档案里写的 → 动作与表情设计时设计师读资料估的 → 按性别和外貌估。 */
export function heightOf(person) {
  const own = cleanHeight(person?.height)
  if (own) return { cm: own, from: 'user' }
  const designed = cleanHeight(person?.acting?.height)
  if (designed) return { cm: designed, from: 'acting' }
  return { cm: guessHeight(person), from: 'guess' }
}

// 参照：一张构图正常的 cowboy shot 立绘里，脸框（眉毛到嘴、两颊，见 lib/face.js）占整张图高度的比例和它中心的位置。
// 是拿真实 NovelAI 立绘量的（12%～15%，中心在 21%～29%）。
export const FACE_RATIO = 0.13
export const FACE_CENTER = 0.24
// 每厘米身高在舞台上抬高多少（按立绘框的高度算）。比真实比例收一些，免得高个子出画、小孩沉到对话框里。
const PER_CM = 0.006

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))

/**
 * 一张立绘在立绘框里怎么放：k 是缩放（1 = 跟框一样高），lift 是往上抬多少（按框高，负的是往下压），
 * head 是额头（脸框上沿再往上一点）离框顶多远，漫画符号挂在那儿。都按立绘框的高度算。
 * box：这张图的脸框 [x0, y0, x1, y1]（像素），size：图的 [宽, 高]；认不出脸时不给，只按身高抬。
 */
export function placeSprite({ box = null, size = null, cm = BASE_HEIGHT.female } = {}) {
  const ok = Array.isArray(box) && box.length === 4 && box.every(Number.isFinite) && box[3] > box[1] && Array.isArray(size) && size[1] > 0
  const ratio = ok ? (box[3] - box[1]) / size[1] : FACE_RATIO
  const center = ok ? (box[1] + box[3]) / 2 / size[1] : FACE_CENTER
  const top = ok ? box[1] / size[1] : FACE_CENTER - FACE_RATIO / 2
  // 头一样大：脸框按参照比例缩放（画得太离谱的不硬掰，留一点余地）
  const k = clamp(FACE_RATIO / ratio, 0.6, 1.4)
  // 脸的中心该在框底往上多高：参照身高 160 时跟参照立绘一样，每高 1 厘米抬一点
  const want = clamp(1 - FACE_CENTER + (cm - BASE_HEIGHT.female) * PER_CM, 0.42, 0.86)
  const lift = clamp(want - (1 - center) * k, -0.5, 0.3)
  const head = clamp(1 - lift - (1 - top) * k - 0.08 * k, -0.2, 0.9)
  return { k: round(k), lift: round(lift), head: round(head) }
}

const round = v => Math.round(v * 1000) / 1000

/**
 * 小头像（短闪回时对话框旁边那一格）从立绘里裁哪一块：一个正方形，脸占它高度的一半不到，脸的中心在正中略偏下（头发、耳朵、领口露一点）。
 * 返回图片在这一格里的宽度和左上角位置（都按格子边长的百分比）；认不出脸时按参照立绘的脸框位置估（水平居中）。
 */
export function faceCrop(box, size) {
  if (!Array.isArray(size) || !(size[0] > 0) || !(size[1] > 0)) return null
  const [w, h] = size
  const ok = Array.isArray(box) && box.length === 4 && box.every(Number.isFinite) && box[2] > box[0] && box[3] > box[1]
  const [x0, y0, x1, y1] = ok ? box : [w / 2 - (FACE_RATIO * h) / 2, (FACE_CENTER - FACE_RATIO / 2) * h, w / 2 + (FACE_RATIO * h) / 2, (FACE_CENTER + FACE_RATIO / 2) * h]
  const side = Math.min((y1 - y0) / 0.48, w, h)
  const pct = v => round((v / side) * 100)
  return { width: pct(w), left: pct(-((x0 + x1) / 2 - side / 2)), top: pct(-((y0 + y1) / 2 - side * 0.52)) }
}
