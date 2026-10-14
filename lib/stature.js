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

/** 这个人的身高和它从哪来：档案里写的 → 按性别和外貌估。 */
export function heightOf(person) {
  const own = cleanHeight(person?.height)
  if (own) return { cm: own, from: 'user' }
  return { cm: guessHeight(person), from: 'guess' }
}

// 参照：一张构图正常的 cowboy shot 立绘里，脸框（眉毛到嘴、两颊，见 lib/face.js）占整张图高度的比例和它中心的位置。
// 是拿真实 NovelAI 立绘量的（12%～15%，中心在 21%～29%）。
export const FACE_RATIO = 0.13
export const FACE_CENTER = 0.24
// 参照身高（160）的人脸的中心在框底往上多高，每厘米身高再抬多少（都按立绘框的高度算）。
// 头一样大时脸框（眉毛到嘴）大约 9 厘米，真实比例是每厘米 0.013～0.014；收到六成多：186 和 162 差出大半个头（矮的眼睛到高的下巴往下一点），
// 不至于一换人就上蹿下跳。参照比参照立绘（1 - FACE_CENTER）低一点，给高个子留出头顶的地方。
const FACE_AT = 0.73
const PER_CM = 0.0085
// 太高、太矮的往回收：高过 FACE_HIGH 的只按一半抬（巨人头顶不出画），低过 FACE_LOW 的只按六成压（孩子、矮人不沉到对话框里）
const FACE_HIGH = 0.9
const FACE_LOW = 0.6

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))

/** 这么高（厘米）的人，脸的中心该在立绘框底往上多高（按框高）。 */
export function faceHeight(cm) {
  let v = FACE_AT + (cm - BASE_HEIGHT.female) * PER_CM
  if (v > FACE_HIGH) v = FACE_HIGH + (v - FACE_HIGH) * 0.5
  if (v < FACE_LOW) v = FACE_LOW - (FACE_LOW - v) * 0.6
  return clamp(v, 0.42, 0.98)
}

// 同一个人的一张立绘，脸框最多比他平常的大、小这么多倍。同一个人不同动作远近不一，脸框差到一两成，照常缩放；
// 再多的多半是认偏了：侧身、别过脸、低头的那张两眼挨得近、眼睛到嘴压扁了，框认得太小，按它缩放会把整个人放大一圈。
export const FACE_SPREAD = 1.15

/**
 * 一个人平常的脸框有多高（占图高的比例）：他整张画的立绘的脸框高度取中位数，给 placeSprite 当参照。
 * boxes：各张的脸框 [x0, y0, x1, y1]（像素；换脸的差分跟底图同一个框，不重复给；上传的不给）。
 * height：图高（同一个人生成的立绘一样大，按显示中那张的算）。不到两张回 0（没有参照）。
 */
export function usualFace(boxes, height) {
  if (!(height > 0)) return 0
  const ratios = (boxes || []).filter(b => Array.isArray(b) && b.length === 4 && b.every(Number.isFinite) && b[3] > b[1]).map(b => (b[3] - b[1]) / height).sort((a, b) => a - b)
  if (ratios.length < 2) return 0
  const mid = ratios.length >> 1
  return ratios.length % 2 ? ratios[mid] : (ratios[mid - 1] + ratios[mid]) / 2
}

/**
 * 一张立绘在立绘框里怎么放：k 是缩放（1 = 跟框一样高），lift 是往上抬多少（按框高，负的是往下压），
 * head 是额头（脸框上沿再往上一点）离框顶多远，漫画符号挂在那儿。都按立绘框的高度算。
 * box：这张图的脸框 [x0, y0, x1, y1]（像素），size：图的 [宽, 高]；认不出脸时不给，只按身高抬。
 * usual：这个人平常的脸框（usualFace）；给了的话，这张的脸框跟它差太多就按 FACE_SPREAD 的边界算。
 */
export function placeSprite({ box = null, size = null, cm = BASE_HEIGHT.female, usual = 0 } = {}) {
  const ok = Array.isArray(box) && box.length === 4 && box.every(Number.isFinite) && box[3] > box[1] && Array.isArray(size) && size[1] > 0
  const measured = ok ? (box[3] - box[1]) / size[1] : FACE_RATIO
  const ratio = ok && usual > 0 ? clamp(measured, usual / FACE_SPREAD, usual * FACE_SPREAD) : measured
  const center = ok ? (box[1] + box[3]) / 2 / size[1] : FACE_CENTER
  const top = ok ? box[1] / size[1] : FACE_CENTER - FACE_RATIO / 2
  // 头一样大：脸框按参照比例缩放（画得太离谱的不硬掰，留一点余地）
  const k = clamp(FACE_RATIO / ratio, 0.6, 1.4)
  // 脸的中心该在框底往上多高：按身高
  const want = faceHeight(cm)
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
