// 换脸怎么画（lib/face.js 管脸框和提示词，这里管像素）：照 SD 里 ADetailer 的做法把头那一块裁出来放大了重画，
// 遮罩是围着眉眼口和两颊的圆角软边（不再是硬方框），画完缩回去按软边贴回底图，再量一下有没有跑偏。
// 纯函数（宿主、浏览器、测试共用）。图都是 { width, height, data }（RGBA，跟画布的 ImageData 一样）。

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))

// ───────────────────────── 换脸的设置 ─────────────────────────

/** 情绪强弱分四档：1 微（微笑、害羞这类小变化）、2 中、3 强、4 极（最激烈的：大笑、大哭、惊恐这类，默认整张画）。 */
export const FACE_LEVELS = [1, 2, 3, 4]
export const FACE_LEVEL_LABEL = { 1: '微', 2: '中', 3: '强', 4: '极' }

/** 换脸的默认设置（config.images.face）。 */
export const DEFAULT_FACE = Object.freeze({
  crop: true,        // 放大重画：把头那一块裁出来放大了重画，画完缩回去贴上
  cropScale: 2.2,    // 裁多大：脸框长边的几倍（带上头发和脸的轮廓，模型看得出这是谁）
  cropSize: 1024,    // 放大到多大（正方形，64 的倍数）。NovelAI Opus 会员 1024×1024 以内不花 Anlas
  soft: true,        // 软边遮罩：圆角、边上大范围渐变；关掉是以前的硬方框
  feather: 0.3,      // 软边多宽：脸框半边长的几成
  strength: Object.freeze({ 1: 0.55, 2: 0.68, 3: 0.8, 4: 0.9 }), // 每档的重绘强度：低的留住原来的线条和颜色，高的改得动
  wholePeak: true,   // 「极」那一档不换脸，在同一个动作、同一个种子上整张画（脸由主模型画，画风自然一致）
  tone: true,        // 色调对齐底图：重画的脸整体偏亮、偏暗、偏色时按底图拉回来（只动整体色调，眉眼口、泪、红晕不动）
  check: true,       // 画完自动比对：表情没换上调高强度再来，画风跑偏换种子、调低强度再来，留最像的那张
  retries: 10,       // 没过最多再画几次
  expression: 3,     // 表情至少变多少：眉眼口的线条比底图变了百分之几（见 expressionChange），少于这个算没换上；0 不查
  tolerance: 1,      // 画风比对的宽严：小于 1 更严（更容易重来），大于 1 更松
  floor: 0.5,        // 画风跑偏往下调强度最低调到这里（再低表情就换不上了）；起步强度本来就更低的不往上抬
  reference: false,  // 把底图当角色参考一起发给 NovelAI，锁住人物和画风（只有 V4.5 支持，V5 还没有；每张多花 5 Anlas；接口不认时自动不带）
})
export const FACE_LIMITS = { cropScale: [1.5, 4], cropSize: [512, 1536], feather: [0, 0.6], strength: [0.2, 1], retries: [0, 10], expression: [0, 30], tolerance: [0.5, 2.5], floor: [0.2, 1] }

const num = (v, [lo, hi], d) => { const n = Number(v); return Number.isFinite(n) ? clamp(n, lo, hi) : d }

/** 整理设置里的 face：缺的用默认，数值夹在范围里，cropSize 对齐 64。 */
export function cleanFaceSettings(raw) {
  const r = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}
  const bool = (k) => (typeof r[k] === 'boolean' ? r[k] : DEFAULT_FACE[k])
  const strength = {}
  for (const l of FACE_LEVELS) strength[l] = Math.round(num(r.strength?.[l], FACE_LIMITS.strength, DEFAULT_FACE.strength[l]) * 100) / 100
  return {
    crop: bool('crop'),
    cropScale: Math.round(num(r.cropScale, FACE_LIMITS.cropScale, DEFAULT_FACE.cropScale) * 10) / 10,
    cropSize: Math.round(num(r.cropSize, FACE_LIMITS.cropSize, DEFAULT_FACE.cropSize) / 64) * 64,
    soft: bool('soft'),
    feather: Math.round(num(r.feather, FACE_LIMITS.feather, DEFAULT_FACE.feather) * 100) / 100,
    strength,
    wholePeak: bool('wholePeak'),
    tone: bool('tone'),
    check: bool('check'),
    retries: Math.round(num(r.retries, FACE_LIMITS.retries, DEFAULT_FACE.retries)),
    expression: Math.round(num(r.expression, FACE_LIMITS.expression, DEFAULT_FACE.expression) * 10) / 10,
    tolerance: Math.round(num(r.tolerance, FACE_LIMITS.tolerance, DEFAULT_FACE.tolerance) * 10) / 10,
    floor: Math.round(num(r.floor, FACE_LIMITS.floor, DEFAULT_FACE.floor) * 100) / 100,
    reference: bool('reference'),
  }
}

export const cleanLevel = v => (FACE_LEVELS.includes(Number(v)) ? Number(v) : 0)

// ───────────────────────── 裁、缩放 ─────────────────────────

/**
 * 放大重画裁哪一块：以脸框中心为中心、脸框长边 scale 倍的正方形（可以超出图，超出的地方垫白），放大到 size 见方（64 的倍数）。
 * 脸框本来就比 size 大时不缩小，按它自己的大小对齐 64。回 { box: 原图上的那块（小数）, size }。
 */
export function cropFor(box, { scale = DEFAULT_FACE.cropScale, size = DEFAULT_FACE.cropSize } = {}) {
  const [x0, y0, x1, y1] = box
  const side = Math.max(x1 - x0, y1 - y0) * scale
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2
  const out = Math.max(size, Math.ceil(side / 64) * 64)
  return { box: [cx - side / 2, cy - side / 2, cx + side / 2, cy + side / 2], size: out }
}

function lanczos(x) {
  if (x === 0) return 1
  if (x <= -3 || x >= 3) return 0
  const p = Math.PI * x
  return (3 * Math.sin(p) * Math.sin(p / 3)) / (p * p)
}

/** 一维的取样表：输出第 i 个像素取源的哪几个、各占多少（缩小时核放宽，免得出锯齿）。源外的下标记 -1（白）。 */
function taps(start, length, outLength, inSize) {
  const scale = length / outLength
  const widen = Math.max(1, scale)
  const support = 3 * widen
  const list = []
  for (let i = 0; i < outLength; i++) {
    const center = start + (i + 0.5) * scale - 0.5
    const lo = Math.floor(center - support) + 1, hi = Math.floor(center + support)
    const idx = [], w = []
    let sum = 0
    for (let j = lo; j <= hi; j++) {
      const k = lanczos((j - center) / widen)
      if (!k) continue
      idx.push(j < 0 || j >= inSize ? -1 : j)
      w.push(k)
      sum += k
    }
    list.push({ idx, w: w.map(v => v / sum) })
  }
  return list
}

/**
 * 把图上 box 这一块（小数坐标，可以超出图）缩放成 w×h（Lanczos）：透明处按白底合成，超出图的地方是白，回不透明的 RGBA。
 */
export function resample(img, box, w, h) {
  const [x0, y0, x1, y1] = box
  const tx = taps(x0, x1 - x0, w, img.width), ty = taps(y0, y1 - y0, h, img.height)
  // 先横着缩放用得到的每一行（行号 → 3 通道浮点）
  const rows = new Map()
  const row = y => {
    if (rows.has(y)) return rows.get(y)
    const out = new Float32Array(w * 3)
    for (let i = 0; i < w; i++) {
      const { idx, w: k } = tx[i]
      let r = 0, g = 0, b = 0
      for (let n = 0; n < idx.length; n++) {
        const x = idx[n]
        if (x < 0) { r += 255 * k[n]; g += 255 * k[n]; b += 255 * k[n]; continue }
        const p = (y * img.width + x) * 4, a = img.data[p + 3] / 255
        r += (img.data[p] * a + 255 * (1 - a)) * k[n]
        g += (img.data[p + 1] * a + 255 * (1 - a)) * k[n]
        b += (img.data[p + 2] * a + 255 * (1 - a)) * k[n]
      }
      out[i * 3] = r; out[i * 3 + 1] = g; out[i * 3 + 2] = b
    }
    rows.set(y, out)
    return out
  }
  const data = new Uint8ClampedArray(w * h * 4)
  for (let j = 0; j < h; j++) {
    const { idx, w: k } = ty[j]
    const src = idx.map(y => (y < 0 ? null : row(y)))
    for (let i = 0; i < w; i++) {
      let r = 0, g = 0, b = 0
      for (let n = 0; n < idx.length; n++) {
        const s = src[n]
        if (!s) { r += 255 * k[n]; g += 255 * k[n]; b += 255 * k[n]; continue }
        r += s[i * 3] * k[n]; g += s[i * 3 + 1] * k[n]; b += s[i * 3 + 2] * k[n]
      }
      const p = (j * w + i) * 4
      data[p] = r; data[p + 1] = g; data[p + 2] = b; data[p + 3] = 255
    }
  }
  return { width: w, height: h, data }
}

/** NovelAI 角色参考认的尺寸（竖、横、方）。 */
const REFERENCE_SIZES = [[1024, 1536], [1536, 1024], [1472, 1472]]

/** 角色参考用的图：挑长宽比最接近的那个尺寸，整张缩进去、居中，四周垫黑（跟官网一样）。回不透明的 RGBA。 */
export function referenceImage(img) {
  const ratio = img.width / img.height
  const [W, H] = REFERENCE_SIZES.reduce((a, b) => (Math.abs(Math.log(b[0] / b[1] / ratio)) < Math.abs(Math.log(a[0] / a[1] / ratio)) ? b : a))
  const k = Math.min(W / img.width, H / img.height)
  const w = Math.max(1, Math.round(img.width * k)), h = Math.max(1, Math.round(img.height * k))
  const fit = resample(img, [0, 0, img.width, img.height], w, h)
  const data = new Uint8ClampedArray(W * H * 4)
  for (let i = 3; i < data.length; i += 4) data[i] = 255
  const ox = Math.floor((W - w) / 2), oy = Math.floor((H - h) / 2)
  for (let y = 0; y < h; y++) data.set(fit.data.subarray(y * w * 4, (y + 1) * w * 4), ((oy + y) * W + ox) * 4)
  return { width: W, height: H, data }
}

// ───────────────────────── 遮罩 ─────────────────────────

/** 贴回时硬方框往里羽化的像素（软边关掉时用；也是以前的做法）。 */
export const FACE_FEATHER = 8

function boxFeather(x, y, [x0, y0, x1, y1], f) {
  const d = Math.min(x - x0, x1 - 1 - x, y - y0, y1 - 1 - y)
  if (d < 0) return 0
  const t = Math.min(1, Math.max(0, (d - 0.5) / f))
  return t * t * (3 - 2 * t)
}

/** 软边遮罩比脸框大多少：圆角的里面整块是重画的，眉毛两头、两颊都在里面。 */
const SOFT_SCALE = 1.06
/** 圆角的方圆程度（2 是椭圆，越大越方）：3 刚好把眉毛两头包进来，四个角收圆。 */
const SOFT_POWER = 3

/**
 * 脸上每个像素用多少重画的：1 整个用重画的，0 用原图。
 * soft：脸框中心的圆角方（长宽是脸框的 1.06 倍）里面全用重画的，往外 feather（脸框半边长的几成）里渐变到原图；
 * 不开 soft：就是脸框，框边往里 8 像素羽化（以前的做法）。回 { at(x, y), bounds, box }：bounds 是用得到重画的那一块（整数，没夹到图里），box 是脸框（比对表情用）。
 */
export function faceAlpha(box, { soft = true, feather = DEFAULT_FACE.feather } = {}) {
  const [x0, y0, x1, y1] = box
  if (!soft) return { at: (x, y) => boxFeather(x, y, box, FACE_FEATHER), bounds: [x0, y0, x1, y1], box: [x0, y0, x1, y1] }
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2
  const rx = ((x1 - x0) / 2) * SOFT_SCALE, ry = ((y1 - y0) / 2) * SOFT_SCALE
  const f = Math.max(0.01, feather)
  const at = (x, y) => {
    const dx = Math.abs((x + 0.5 - cx) / rx), dy = Math.abs((y + 0.5 - cy) / ry)
    const r = Math.pow(dx ** SOFT_POWER + dy ** SOFT_POWER, 1 / SOFT_POWER)
    if (r <= 1) return 1
    if (r >= 1 + f) return 0
    const t = (r - 1) / f
    return 1 - t * t * (3 - 2 * t)
  }
  const ex = rx * (1 + f), ey = ry * (1 + f)
  return { at, bounds: [Math.floor(cx - ex), Math.floor(cy - ey), Math.ceil(cx + ex), Math.ceil(cy + ey)], box: [x0, y0, x1, y1] }
}

/**
 * 发给 NovelAI 的遮罩（白 = 重画）：放大后那张图上，贴回时用得到重画的地方都涂白，再往外多涂一圈。
 * NovelAI 按 8×8 一格认遮罩、只认黑白（各家客户端都是先对齐到格子再发），所以这里整格整格地涂：一格里有一点要重画就整格白。
 * crop：cropFor 的结果（不放大时给 { box: [0, 0, 宽, 高] }）；alpha：faceAlpha 的结果。回 pixel(x, y) → 0 / 255，交给 grayPng。
 */
export function maskPixel(crop, alpha, w, h) {
  const [cx0, cy0, cx1, cy1] = crop.box
  const kx = (cx1 - cx0) / w, ky = (cy1 - cy0) / h
  const pad = 8 // 放大后的像素：再往外多一格
  const [bx0, by0, bx1, by1] = alpha.bounds
  const lx = (bx0 - cx0) / kx - pad, rx = (bx1 - cx0) / kx + pad, ty = (by0 - cy0) / ky - pad, by = (by1 - cy0) / ky + pad
  const cells = new Map()
  const cell = (gx, gy) => {
    const id = gy * 4096 + gx
    if (cells.has(id)) return cells.get(id)
    let on = 0
    const x0 = gx * 8, y0 = gy * 8
    if (x0 + 8 >= lx && x0 <= rx && y0 + 8 >= ty && y0 <= by) {
      for (const [dx, dy] of [[4, 4], [0, 0], [8, 0], [0, 8], [8, 8], [-pad, 4], [8 + pad, 4], [4, -pad], [4, 8 + pad]]) {
        if (alpha.at(cx0 + (x0 + dx) * kx, cy0 + (y0 + dy) * ky) > 0) { on = 255; break }
      }
    }
    cells.set(id, on)
    return on
  }
  return (x, y) => cell(x >> 3, y >> 3)
}

// ───────────────────────── 贴回 ─────────────────────────

/**
 * 把重画的脸贴回原图：只动 alpha 用得到的地方，透明度沿用原图（重画时垫的白底不会带进来），
 * 半透明的地方（脸边的发丝）先去掉垫进去的白再贴，太透明的照旧用原图。
 * gen 是重画结果在原图坐标里的样子（不透明，可以比原图大），at = [gen 左上角在原图的 x, y]。
 */
export function blendSoft(src, gen, alpha, at = [0, 0]) {
  const out = new Uint8ClampedArray(src.data)
  const [bx0, by0, bx1, by1] = alpha.bounds
  const [ox, oy] = at
  for (let y = Math.max(0, by0, oy); y < Math.min(by1, src.height, oy + gen.height); y++) {
    for (let x = Math.max(0, bx0, ox); x < Math.min(bx1, src.width, ox + gen.width); x++) {
      const w = alpha.at(x, y)
      const i = (y * src.width + x) * 4, j = ((y - oy) * gen.width + (x - ox)) * 4
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

/** 以前的贴法：只动框里，框边往里 f 像素羽化。gen 左上角对齐原图（垫过白、补过 64 的倍数）。 */
export function blendFace(src, gen, box, f = FACE_FEATHER) {
  if (gen.width < src.width || gen.height < src.height) throw new Error('重画结果比原图小，对不上')
  return blendSoft(src, gen, { at: (x, y) => boxFeather(x, y, box, f), bounds: box, box })
}

/**
 * 放大重画的结果缩回原图大小：gen 是 size 见方的重画结果，crop 是 cropFor 的结果。
 * 回 { image, at }：image 是原图上 crop.box 那一块（取整）的样子，at 是它在原图的左上角。
 */
export function shrinkBack(gen, crop) {
  const [x0, y0, x1, y1] = crop.box
  const ix0 = Math.floor(x0), iy0 = Math.floor(y0), ix1 = Math.ceil(x1), iy1 = Math.ceil(y1)
  const k = gen.width / (x1 - x0)
  // 原图上 [ix0, ix1) 对应放大图上的哪一块
  const box = [(ix0 - x0) * k, (iy0 - y0) * k, (ix1 - x0) * k, (iy1 - y0) * k]
  return { image: resample(gen, box, ix1 - ix0, iy1 - iy0), at: [ix0, iy0] }
}

// ───────────────────────── 比对 ─────────────────────────

const lum = (d, i) => 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]

/** 图在 (x, y) 的亮度，透明处按白底。 */
function lumAt(img, x, y) {
  const i = (y * img.width + x) * 4, a = img.data[i + 3] / 255
  return lum(img.data, i) * a + 255 * (1 - a)
}

function boxBlur(plane, w, h, r) {
  let a = plane, b = new Float32Array(w * h)
  for (let pass = 0; pass < 2; pass++) {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let s = 0, n = 0
        for (let k = -r; k <= r; k++) {
          const xx = pass ? x : x + k, yy = pass ? y + k : y
          if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue
          s += a[yy * w + xx]; n++
        }
        b[y * w + x] = s / n
      }
    }
    ;[a, b] = [b, pass ? b : new Float32Array(w * h)]
  }
  return a
}

/** 每个像素取周围 (2r+1) 见方里最大（max 为真）或最小的值，横竖各走一遍。 */
function rankFilter(plane, w, h, r, max) {
  const a = new Float32Array(w * h), b = new Float32Array(w * h)
  const pick = max ? (v, q) => (q > v ? q : v) : (v, q) => (q < v ? q : v)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let v = plane[y * w + x]
      for (let k = Math.max(0, x - r); k <= Math.min(w - 1, x + r); k++) v = pick(v, plane[y * w + k])
      a[y * w + x] = v
    }
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let v = a[y * w + x]
      for (let k = Math.max(0, y - r); k <= Math.min(h - 1, y + r); k++) v = pick(v, a[k * w + x])
      b[y * w + x] = v
    }
  }
  return b
}

/** 线条：比周围暗的细笔画（眉、眼线、睫毛、瞳孔、嘴线、泪痕的边）。闭运算减原图（black top-hat），比 2r+1 宽的大块明暗不算。 */
function strokes(plane, w, h, r) {
  const closed = rankFilter(rankFilter(plane, w, h, r, true), w, h, r, false)
  const out = new Float32Array(w * h)
  for (let i = 0; i < out.length; i++) out[i] = Math.max(0, closed[i] - plane[i])
  return out
}

/**
 * 线条比对怎么算：笔画粗细按脸框短边的 1/24 认；挪了短边 1/90（一两个像素）以内、深浅差三成以内再多 4 级亮度的不算变了；
 * 脸框分 4×4 格，线条太少（不到平均四分之一）的格子不看。
 */
const STROKE = { width: 24, shift: 90, rel: 0.3, abs: 4, grid: 4 }

/**
 * 表情变了多少（0~100）：脸框分成 4×4 格，每格里底图和重画的线条对一对，新长出来的和没了的占这格线条的百分之几，回变得最多的那一格。
 * 重画一遍线条总会抖一点、淡一点，这些不算（底图原样描一遍的只有 1 上下）；只看最多的一格，是因为表情只动眉眼口那几格，
 * 别处的抖动不该把它冲淡（拿以前换过的脸实测：真换了表情的 6~30，强度 0.3 没换上的 0.6，模糊、变亮、挪半个像素的假重画不到 1.5）。
 * 比的是亮度里的线条，整体变亮变暗、偏色都不影响它。box 是脸框（原图坐标），gen 的左上角在原图的 at。
 */
export function expressionChange(src, gen, box, at = [0, 0]) {
  const [ox, oy] = at
  const x0 = Math.max(0, Math.floor(box[0]), ox), y0 = Math.max(0, Math.floor(box[1]), oy)
  const x1 = Math.min(src.width, Math.ceil(box[2]), ox + gen.width), y1 = Math.min(src.height, Math.ceil(box[3]), oy + gen.height)
  const w = x1 - x0, h = y1 - y0
  if (w < 8 || h < 8) return 0
  const ps = new Float32Array(w * h), pg = new Float32Array(w * h)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      ps[y * w + x] = lumAt(src, x0 + x, y0 + y)
      pg[y * w + x] = lumAt(gen, x0 + x - ox, y0 + y - oy)
    }
  }
  const side = Math.min(w, h)
  const r = Math.max(2, Math.round(side / STROKE.width)), k = Math.max(1, Math.round(side / STROKE.shift))
  const ls = strokes(ps, w, h, r), lg = strokes(pg, w, h, r)
  const near = rankFilter(ls, w, h, k, true), nearG = rankFilter(lg, w, h, k, true)
  const n = STROKE.grid, moved = new Float64Array(n * n), ink = new Float64Array(n * n)
  for (let y = 0; y < h; y++) {
    const row = Math.min(n - 1, Math.floor((y * n) / h)) * n
    for (let x = 0; x < w; x++) {
      const p = y * w + x, c = row + Math.min(n - 1, Math.floor((x * n) / w))
      const grown = lg[p] - near[p] - STROKE.rel * lg[p] - STROKE.abs // 重画多出来的线条：底图附近没有这么深的
      const gone = ls[p] - nearG[p] - STROKE.rel * ls[p] - STROKE.abs // 底图有、重画附近没有了的
      moved[c] += Math.max(0, grown) + Math.max(0, gone)
      ink[c] += ls[p] + lg[p]
    }
  }
  const avg = ink.reduce((s, v) => s + v, 0) / (n * n)
  let most = 0
  // 一格里的线条全换了位置时 moved 最多是 (1 - rel) × ink，按它折成 0~100
  for (let c = 0; c < n * n; c++) if (ink[c] > 0 && ink[c] >= avg / 4) most = Math.max(most, (100 * moved[c]) / ((1 - STROKE.rel) * ink[c]))
  return Math.round(most * 10) / 10
}

/** 色调对齐最多拉多少（每个通道，0~255）：差得比这还多的是真跑偏，留给比对去判。 */
export const TONE_MAX = 40

/**
 * 色调对齐底图：脸上（软边里整块用重画的地方、底图不透明处）每个通道「底图 − 重画」的中位数，整块重画加上它（最多 ±40）。
 * 中位数跟着大片的皮肤走：整张脸亮了、暗了、偏色了拉得回来；红晕、泪、眉眼口这些小块的变化左右不了它，也不会被抹掉。
 * 回 { image, shift: [r, g, b] }，不改原来的 gen。
 */
export function matchTone(src, gen, alpha, at = [0, 0]) {
  const [bx0, by0, bx1, by1] = alpha.bounds
  const [ox, oy] = at
  const hist = [new Uint32Array(511), new Uint32Array(511), new Uint32Array(511)]
  let n = 0
  for (let y = Math.max(0, by0, oy); y < Math.min(by1, src.height, oy + gen.height); y++) {
    for (let x = Math.max(0, bx0, ox); x < Math.min(bx1, src.width, ox + gen.width); x++) {
      const i = (y * src.width + x) * 4
      if (src.data[i + 3] < 250 || alpha.at(x, y) < 1) continue
      const j = ((y - oy) * gen.width + (x - ox)) * 4
      for (let c = 0; c < 3; c++) hist[c][src.data[i + c] - gen.data[j + c] + 255]++
      n++
    }
  }
  const median = h => { for (let v = 0, seen = 0; v < 511; v++) if ((seen += h[v]) * 2 >= n) return clamp(v - 255, -TONE_MAX, TONE_MAX); return 0 }
  const shift = n >= 64 ? hist.map(median) : [0, 0, 0]
  if (!shift.some(Boolean)) return { image: gen, shift }
  const data = new Uint8ClampedArray(gen.data)
  for (let i = 0; i < data.length; i += 4) for (let c = 0; c < 3; c++) data[i + c] = gen.data[i + c] + shift[c]
  return { image: { width: gen.width, height: gen.height, data }, shift }
}

/** 画风比对的分数线（亮度 0~255）：软边上新旧的大块色调差这么多就看得出一圈色差；脸上大块的明暗差这么多就算画风跑偏。 */
export const DRIFT_LIMITS = { seam: 12, shade: 11 }

/**
 * 换完量一下（都在原图坐标、贴回之前）：
 *   expr   表情变了多少（expressionChange）：少于 expression 就是表情没换上（强度太低，或者这个种子没听提示词）。
 *   seam   软边那一圈里重画的和原图大块色调（模糊后）差多少（加权平均）：差得多，贴回去看得出一圈色差。
 *          发丝、线条重画得不一样不算：那些靠软边慢慢混过去，算它只会逼着强度一路往下调到表情换不上。
 *   shade  脸上大块明暗（模糊后）差多少（中位数）：眉眼口变了不算，原来的阴影、排线没了、脸色变了才算。
 *   change 整张脸平均每个像素变了多少（只给人看，不拿来判）。
 * 回 { expr, seam, shade, change, drift, flat, ok }：drift = 画风跑偏的程度（≤ 1 算过，tolerance 越大越松），flat = 表情没换上。
 * expression：表情至少变多少（0 不查）。
 */
export function faceDrift(src, gen, alpha, at = [0, 0], { tolerance = 1, expression = DEFAULT_FACE.expression } = {}) {
  const [bx0, by0, bx1, by1] = alpha.bounds
  const [ox, oy] = at
  const x0 = Math.max(0, bx0, ox), y0 = Math.max(0, by0, oy)
  const x1 = Math.min(bx1, src.width, ox + gen.width), y1 = Math.min(by1, src.height, oy + gen.height)
  const w = x1 - x0, h = y1 - y0
  if (w < 8 || h < 8) return { expr: 0, seam: 0, shade: 0, change: 0, drift: 0, flat: false, ok: true }
  const ls = new Float32Array(w * h), lg = new Float32Array(w * h), wa = new Float32Array(w * h), solid = new Uint8Array(w * h)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = y * w + x
      ls[p] = lumAt(src, x0 + x, y0 + y)
      lg[p] = lum(gen.data, ((y0 + y - oy) * gen.width + (x0 + x - ox)) * 4)
      wa[p] = alpha.at(x0 + x, y0 + y)
      solid[p] = src.data[((y0 + y) * src.width + x0 + x) * 4 + 3] >= 128 ? 1 : 0
    }
  }
  const r = Math.max(2, Math.round(Math.min(w, h) / 28))
  const bs = boxBlur(ls, w, h, r), bg = boxBlur(lg, w, h, r)
  let seamSum = 0, seamW = 0, changeSum = 0, changeN = 0
  const diffs = []
  for (let p = 0; p < w * h; p++) {
    if (!solid[p]) continue
    const band = 4 * wa[p] * (1 - wa[p])
    if (band > 0.05) { seamSum += band * Math.abs(bg[p] - bs[p]); seamW += band }
    if (wa[p] >= 1) { changeSum += Math.abs(lg[p] - ls[p]); changeN++; diffs.push(Math.abs(bg[p] - bs[p])) }
  }
  diffs.sort((a, b) => a - b)
  const seam = seamW ? seamSum / seamW : 0
  const shade = diffs.length ? diffs[Math.floor(diffs.length / 2)] : 0
  const change = changeN ? changeSum / changeN : 0
  const expr = expressionChange(src, gen, alpha.box || alpha.bounds, at)
  const t = Math.max(0.1, Number(tolerance) || 1)
  const drift = Math.max(seam / DRIFT_LIMITS.seam, shade / DRIFT_LIMITS.shade) / t
  const flat = Number(expression) > 0 && expr < Number(expression)
  const round = v => Math.round(v * 100) / 100
  return { expr, seam: round(seam), shade: round(shade), change: round(change), drift: round(drift), flat, ok: drift <= 1 && !flat }
}

/**
 * 下一次用多大的重绘强度：表情没换上往上调（先管这个：没换上的图画风再像也没用）；
 * 画风跑偏往下调，最低到 floor（起步 start 就比 floor 低的，最低到起步那么多，不往上抬）；玩家定死了强度（fixed）就不动。
 */
export function nextStrength(strength, check, { fixed = false, floor = DEFAULT_FACE.floor, start = strength } = {}) {
  if (fixed || !check) return strength
  const round = v => Math.round(v * 100) / 100
  if (check.flat) return round(Math.min(1, strength + 0.12))
  if (check.drift > 1) return round(Math.max(Math.min(floor, start), strength - 0.06))
  return strength
}

/** 几次里留哪一张：表情换上了的先（没换上的，画风再像也不要）；再是过了的、跑偏得少的；都没换上就留表情变得最多的。 */
export function betterTry(a, b) {
  if (!a) return b
  const rank = t => [t.check.flat ? 1 : 0, t.check.ok ? 0 : 1, t.check.flat ? -(t.check.expr || 0) : t.check.drift]
  const ra = rank(a), rb = rank(b)
  for (let i = 0; i < ra.length; i++) if (ra[i] !== rb[i]) return rb[i] < ra[i] ? b : a
  return a
}
