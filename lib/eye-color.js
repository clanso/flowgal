// 换脸后瞳色对齐底图（纯函数，宿主、浏览器、测试共用；图是 { width, height, data }，RGBA，跟画布的 ImageData 一样）。
// 重画的眼睛常换了一种蓝：提示词里只有「blue eyes」，模型每次自己挑深浅、渐变和高光的颜色；画完的比对只看线条和明暗，看不出颜色。
// 这里在底图和重画里各找出虹膜（眼睛那块里有彩度、不是皮肤也不是眼白的那一团颜色），按从上到下三层量出底图虹膜的
// 亮度、彩度、色相，把重画虹膜的颜色拉过去：亮暗的形状（眼形、高光、瞳孔、睫毛）是重画自己的，只换颜色，所以表情不受影响。
// 两只眼分开量（异色瞳也对得上）；闭着、被头发挡住、灰黑色的眼睛不动。
import { rgbToLab, labToRgb } from './aa-patch.js'
import { splitTags, tagKey } from './image/style.js'

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))
const clamp01 = v => clamp(v, 0, 1)
const DEG = 180 / Math.PI
/** 两个色相差多少度（-180~180）。 */
const hueDiff = (a, b) => ((a - b + 540) % 360) - 180

/** 补色的参数：照几张蓝、青绿、绿眼睛的立绘调的。 */
export const EYE = Object.freeze({
  pad: 0.3,        // 眼框往外多找几成（自动认的眼框贴得紧，手动框脸时眼框是估的）
  sclera: [80, 10], // 眼白、高光：亮度高于这个、彩度低于这个
  skin: 12,        // 跟肤色色差小于这个的算皮肤（眼皮、腮红边上）
  chroma: 5,       // 彩度低于这个的算灰（睫毛、瞳孔、描边），不当虹膜
  hue: [30, 50],   // 跟虹膜主色相差 30° 以内全算虹膜，到 50° 慢慢不算
  gray: 6,         // 底图虹膜彩度低于这个：灰、黑的眼睛，不补
  closed: 0.25,    // 重画里找到的虹膜不到底图的这么多：闭着或挡住了，这只不补
  same: 1,         // 差不到这么多（Lab 色差）：颜色本来就一样，不动（不白存一张图）
  maxL: 30,        // 亮度最多拉多少（Lab 的 L）
  chromaRatio: [0.5, 2], // 彩度最多缩放到几倍
})

// 眼睛颜色词 → 色相范围（Lab 的色相角，度）：提示词里写了瞳色时，找虹膜只在这附近找，不会把压在眼睛上的头发当成虹膜。
const EYE_HUES = [
  [['red', 'crimson', 'scarlet', 'ruby'], [10, 65]],
  [['orange'], [40, 85]],
  [['brown', 'hazel'], [35, 90]],
  [['amber', 'gold', 'golden', 'yellow'], [60, 115]],
  [['green', 'emerald', 'jade', 'olive'], [105, 180]],
  [['aqua', 'teal', 'cyan', 'turquoise'], [165, 250]],
  [['blue', 'azure', 'sapphire', 'navy', 'cobalt'], [195, 310]],
  [['purple', 'violet', 'lavender', 'lilac', 'indigo'], [270, 350]],
  [['pink', 'magenta', 'rose', 'fuchsia'], [320, 30]],
]

/**
 * 提示词里写的瞳色 → 色相范围列表 [[从, 到]...]（度，可以跨 0°）。「blue eyes」「light blue eyes」「heterochromia, blue eyes, red eyes」都认。
 * 没写、写的是黑灰白银色回 []（不限色相）。
 */
export function eyeHues(...texts) {
  const out = []
  for (const tag of texts.flatMap(t => splitTags(t || ''))) {
    const key = tagKey(tag).replace(/[-_]+/g, ' ')
    if (!/\beyes?$/.test(key) || /\b(?:closed|half closed|shut)\b/.test(key)) continue
    for (const [words, range] of EYE_HUES) if (words.some(w => new RegExp(`\\b${w}\\b`).test(key)) && !out.includes(range)) out.push(range)
  }
  return out
}
const inRange = (h, [a, b]) => (a <= b ? h >= a && h <= b : h >= a || h <= b)
/** 色相离这些范围有多远（度，在里面是 0）。 */
const rangeGap = (h, ranges) => Math.min(...ranges.map(r => (inRange(h, r) ? 0 : Math.min(Math.abs(hueDiff(h, r[0])), Math.abs(hueDiff(h, r[1]))))))

/**
 * 两只眼睛的框（原图坐标，左边那只在前）：认脸认出来的眼框（在脸框里的两个）直接用；没有就照 faceBoxFrom 倒推——
 * 脸框宽约是两眼间距的 2 倍，眼睛上沿在框顶下 0.22 个间距，一只眼宽 0.7、高 0.6 个间距。
 */
export function eyeRects(box, eyes = null) {
  const [x0, y0, x1, y1] = box
  const ok = r => Array.isArray(r) && r.length === 4 && r.every(Number.isFinite) && r[2] > r[0] && r[3] > r[1]
  const inside = r => r[0] >= x0 - 8 && r[2] <= x1 + 8 && r[1] >= y0 - 8 && r[3] <= y1 + 8
  const given = (Array.isArray(eyes) ? eyes : []).filter(r => ok(r) && inside(r)).slice(0, 2)
  if (given.length === 2) return given.map(r => r.slice()).sort((a, b) => a[0] - b[0])
  const d = (x1 - x0) / 2, top = y0 + 0.22 * d, w = 0.7 * d, h = 0.6 * d
  return [[x0 + 0.15 * d, top, x0 + 0.15 * d + w, top + h], [x1 - 0.15 * d - w, top, x1 - 0.15 * d, top + h]]
}

/** 图上 (x, y) 的 Lab（半透明的垫白算，跟重画时一样）；gen 的左上角在原图的 at。图外、太透明的回 null。 */
function labAt(img, x, y, at) {
  const X = x - at[0], Y = y - at[1]
  if (X < 0 || Y < 0 || X >= img.width || Y >= img.height) return null
  const i = (Y * img.width + X) * 4, a = img.data[i + 3] / 255
  if (a < 0.5) return null
  return rgbToLab(img.data[i] * a + 255 * (1 - a), img.data[i + 1] * a + 255 * (1 - a), img.data[i + 2] * a + 255 * (1 - a))
}

const median = (pairs) => {
  // pairs：[值, 权重]
  if (!pairs.length) return 0
  pairs.sort((p, q) => p[0] - q[0])
  const total = pairs.reduce((s, p) => s + p[1], 0)
  let seen = 0
  for (const [v, w] of pairs) if ((seen += w) * 2 >= total) return v
  return pairs[pairs.length - 1][0]
}

/** 肤色：脸框中下部（鼻子、两颊）的 Lab 中位数；那块大多是皮肤，腮红、嘴左右不了中位数。 */
export function skinOf(img, box, at = [0, 0]) {
  const [x0, y0, x1, y1] = box
  const W = x1 - x0, H = y1 - y0
  const pick = (fx0, fy0, fx1, fy1) => {
    const L = [], A = [], B = []
    for (let y = Math.floor(y0 + fy0 * H); y < y0 + fy1 * H; y++) for (let x = Math.floor(x0 + fx0 * W); x < x0 + fx1 * W; x++) {
      const lab = labAt(img, x, y, at)
      if (lab) { L.push([lab[0], 1]); A.push([lab[1], 1]); B.push([lab[2], 1]) }
    }
    return L.length >= 30 ? [median(L), median(A), median(B)] : null
  }
  return pick(0.25, 0.6, 0.75, 0.85) || pick(0, 0, 1, 1) || [85, 8, 12]
}

const hueOf = (a, b) => (Math.atan2(b, a) * DEG + 360) % 360

/**
 * 发色：脸框上面一条（刘海）和左右两边（鬓发）里有彩度、不是皮肤的像素，色相最多的那一族 { hue, C }；
 * 那里没几根头发（额头露着、短发）回 null。压在眼睛上的头发就是这个颜色，找虹膜时不当主色相。
 */
export function hairOf(img, box, skin, at = [0, 0]) {
  const [x0, y0, x1, y1] = box
  const W = x1 - x0, H = y1 - y0
  const hist = new Float64Array(36), chroma = Array.from({ length: 36 }, () => [])
  let total = 0
  for (let y = Math.floor(y0); y < y0 + H * 0.6; y++) for (let x = Math.floor(x0); x < x1; x++) {
    if (y >= y0 + H * 0.15 && x >= x0 + W * 0.12 && x < x1 - W * 0.12) continue
    const lab = labAt(img, x, y, at)
    if (!lab) continue
    total++
    const C = Math.hypot(lab[1], lab[2])
    if (C < EYE.chroma || Math.hypot(lab[0] - skin[0], lab[1] - skin[1], lab[2] - skin[2]) < EYE.skin) continue
    const k = Math.floor(hueOf(lab[1], lab[2]) / 10) % 36
    hist[k]++
    chroma[k].push([C, 1])
  }
  let peak = 0
  for (let k = 0; k < 36; k++) if (hist[(k + 35) % 36] + hist[k] + hist[(k + 1) % 36] > hist[(peak + 35) % 36] + hist[peak] + hist[(peak + 1) % 36]) peak = k
  const mass = hist[(peak + 35) % 36] + hist[peak] + hist[(peak + 1) % 36]
  if (!total || mass < total * 0.2) return null
  return { hue: peak * 10 + 5, C: median([...chroma[(peak + 35) % 36], ...chroma[peak], ...chroma[(peak + 1) % 36]]) }
}

/** 皮肤、头发那几族颜色（{ hue, C } 列表）：色相差不到 25°、又不比它艳很多的算同一族。 */
const familyOf = (skin, hair) => [{ hue: hueOf(skin[1], skin[2]), C: Math.hypot(skin[1], skin[2]) }, ...(hair ? [hair] : [])]
const inFamily = (h, C, family) => family.some(f => Math.abs(hueDiff(h, f.hue)) < 25 && C < Math.max(f.C * 1.8, f.C + 12))

/**
 * 在一块里找虹膜：有彩度、不是皮肤也不是眼白的像素，按色相（离 near 越近权重越大）挑出最多的那一团。
 * near：{ cx, cy, rx, ry }，越靠近它越像虹膜，出了 1.6 倍就不算；hues：提示词里写的瞳色范围（[] 不限）；
 * hueAround：{ hue, width }，重画里找时按底图虹膜的色相找（跑色跑得再多也在这附近）。
 * family：皮肤、头发那几族颜色（familyOf）：睫毛、眼皮、腮红、压在眼睛上的头发多是这几族，不当主色相，
 * 除非提示词写的瞳色、或底图的虹膜就是这一族（红、褐、金色的眼睛）。
 * 回 { pixels: [{ x, y, L, a, b, C, h, w }], n（权重和）, hue（主色相）, warm（主色相在皮肤头发那几族里） }，找不到回 null。
 */
function findIris(img, area, { at = [0, 0], skin, family, near, hues = [], hueAround = null }) {
  const [X0, Y0, X1, Y1] = area
  const cand = []
  const hist = new Float64Array(36)
  for (let y = Math.floor(Y0); y < Math.ceil(Y1); y++) for (let x = Math.floor(X0); x < Math.ceil(X1); x++) {
    const q = ((x + 0.5 - near.cx) / near.rx) ** 2 + ((y + 0.5 - near.cy) / near.ry) ** 2
    if (q > 2.56) continue
    const lab = labAt(img, x, y, at)
    if (!lab) continue
    const [L, a, b] = lab
    const C = Math.hypot(a, b)
    if (C < EYE.chroma - 1) continue
    if (L > EYE.sclera[0] && C < EYE.sclera[1]) continue
    const dS = Math.hypot(L - skin[0], a - skin[1], b - skin[2])
    const notSkin = clamp01((dS - EYE.skin + 3) / 6)
    if (!notSkin) continue
    const h = hueOf(a, b)
    const place = clamp01((2.56 - q) / 1.56)
    const w = clamp01((C - EYE.chroma + 1) / 4) * notSkin * place
    if (!w) continue
    const warm = inFamily(h, C, family)
    let prior
    if (hueAround) prior = Math.max(0.02, clamp01(1 - (Math.abs(hueDiff(h, hueAround.hue)) - hueAround.width) / 25)) * (warm && !hueAround.warm ? 0.02 : 1)
    else if (hues.length) prior = Math.max(0.02, 1 - rangeGap(h, hues) / 15)
    else prior = warm ? 0.02 : 1
    cand.push({ x, y, L, a, b, C, h, w, prior, warm })
    // 主色相：越靠中间、越艳越算数（压在眼睛上的头发多在边上、彩度低；睫毛、眼线暗，打点折扣）
    hist[Math.floor(h / 10) % 36] += w * prior * Math.min(C, 40) * Math.exp(-q) * (0.3 + 0.7 * clamp01((L - 25) / 20))
  }
  if (!cand.length) return null
  let peak = 0, best = -1
  for (let k = 0; k < 36; k++) {
    const v = hist[(k + 35) % 36] + 2 * hist[k] + hist[(k + 1) % 36]
    if (v > best) { best = v; peak = k }
  }
  if (!(best > 0)) return null
  // 主色相：峰附近 ±20° 的像素按权重取平均（向量平均，跨 0° 也对）
  const c0 = peak * 10 + 5
  let sx = 0, sy = 0
  for (const p of cand) if (Math.abs(hueDiff(p.h, c0)) <= 20) { const k = p.w * p.C; sx += Math.cos(p.h / DEG) * k; sy += Math.sin(p.h / DEG) * k }
  const hue = (Math.atan2(sy, sx) * DEG + 360) % 360
  // 主色相那一团的彩度（中位数）：比它灰很多的（同色相的睫毛、头发暗部）不算
  const peakC = median(cand.filter(p => Math.abs(hueDiff(p.h, hue)) <= EYE.hue[0]).map(p => [p.C, p.w * p.prior]))
  // 虹膜不是皮肤头发那一族时，那一族的像素（压在眼睛上、色相挨着的头发）一个都不算
  const warm = inFamily(hue, peakC, family)
  const pixels = []
  for (const p of cand) {
    if (p.warm && !warm) continue
    const dh = Math.abs(hueDiff(p.h, hue))
    const w = p.w * clamp01((EYE.hue[1] - dh) / (EYE.hue[1] - EYE.hue[0])) * clamp01((p.C - 0.35 * peakC) / Math.max(1, 0.2 * peakC))
    if (w > 0.02) pixels.push({ ...p, w })
  }
  const kept = blobs(pixels)
  const n = kept.reduce((t, p) => t + p.w, 0)
  return n >= 8 ? { pixels: kept, n, hue, warm } : null
}

/**
 * 只留成团的：虹膜是实心的一团，压在眼睛上的发丝是一两像素宽的细线。先开运算（3×3 先缩再胀）把细线断开，
 * 留权重最大的那团（和不比它小太多的：被一缕头发切成两半的虹膜），再往外放 2 像素（开运算削掉的虹膜边）。
 */
function blobs(pixels) {
  if (!pixels.length) return pixels
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
  for (const p of pixels) { x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y) }
  const w = x1 - x0 + 1, h = y1 - y0 + 1
  const on = new Uint8Array(w * h), weight = new Float32Array(w * h)
  for (const p of pixels) { const k = (p.y - y0) * w + p.x - x0; weight[k] = p.w; if (p.w > 0.25) on[k] = 1 }
  const rank = (src, keep) => {
    const out = new Uint8Array(w * h)
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let v = keep ? 1 : 0
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const X = x + dx, Y = y + dy
        const s = X >= 0 && Y >= 0 && X < w && Y < h ? src[Y * w + X] : 0
        v = keep ? Math.min(v, s) : Math.max(v, s)
      }
      out[y * w + x] = v
    }
    return out
  }
  const open = rank(rank(on, true), false)
  // 八连通的团，按权重排
  const seen = new Int32Array(w * h).fill(-1), sums = []
  for (let s0 = 0; s0 < w * h; s0++) {
    if (!open[s0] || seen[s0] >= 0) continue
    const id = sums.length, stack = [s0]
    seen[s0] = id
    let sum = 0
    while (stack.length) {
      const k = stack.pop(), x = k % w, y = (k / w) | 0
      sum += weight[k]
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const X = x + dx, Y = y + dy, j = Y * w + X
        if (X < 0 || Y < 0 || X >= w || Y >= h || !open[j] || seen[j] >= 0) continue
        seen[j] = id
        stack.push(j)
      }
    }
    sums.push(sum)
  }
  if (!sums.length) return []
  const top = Math.max(...sums)
  let mask = new Uint8Array(w * h)
  for (let k = 0; k < w * h; k++) if (seen[k] >= 0 && sums[seen[k]] >= top * 0.25) mask[k] = 1
  mask = rank(rank(mask, false), false)
  return pixels.filter(p => mask[(p.y - y0) * w + p.x - x0])
}

/** 一团像素的范围：加权的 5%~95% 分位（x、y）。 */
function spread(pixels) {
  const q = (key, f) => {
    const s = pixels.map(p => [p[key], p.w]).sort((a, b) => a[0] - b[0])
    const total = s.reduce((t, p) => t + p[1], 0)
    let seen = 0
    for (const [v, w] of s) if ((seen += w) >= total * f) return v
    return s[s.length - 1][0]
  }
  return { x0: q('x', 0.05), x1: q('x', 0.95) + 1, y0: q('y', 0.05), y1: q('y', 0.95) + 1 }
}

const BANDS = 3
/** 第 k 层占多少（三角形权重，层中心在 1/6、1/2、5/6）：t 是在底图虹膜从上到下的位置（0~1）。 */
const bandWeights = t => Array.from({ length: BANDS }, (_, k) => clamp01(1 - Math.abs(clamp01(t) * BANDS - 0.5 - k)))

/** 每层（和整团）的亮度、彩度中位数、色相（按彩度加权的向量平均）。top、bot：分层用的上下沿（底图虹膜的）。 */
function irisStats(pixels, top, bot) {
  const one = list => {
    let sx = 0, sy = 0, n = 0
    for (const [p, w] of list) { sx += Math.cos(p.h / DEG) * w * p.C; sy += Math.sin(p.h / DEG) * w * p.C; n += w }
    return { n, L: median(list.map(([p, w]) => [p.L, w])), C: median(list.map(([p, w]) => [p.C, w])), h: (Math.atan2(sy, sx) * DEG + 360) % 360 }
  }
  const bands = Array.from({ length: BANDS }, () => [])
  const span = Math.max(1, bot - top)
  for (const p of pixels) bandWeights((p.y + 0.5 - top) / span).forEach((bw, k) => { if (bw > 0) bands[k].push([p, p.w * bw]) })
  return { all: one(pixels.map(p => [p, p.w])), bands: bands.map(one) }
}

const labOf = s => [s.L, s.C * Math.cos(s.h / DEG), s.C * Math.sin(s.h / DEG)]
const deltaE = (s, t) => { const a = labOf(s), b = labOf(t); return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) }

/**
 * 一只眼睛的虹膜（一张图自己量）：rect 是眼框，hues 是提示词里写的瞳色范围，family 是皮肤、头发那几族颜色（familyOf）；
 * hueAround：{ hue, width, warm }，照基准的颜色找（别的立绘按基准补色时）。
 * 找到的主色相在皮肤头发那几族里、提示词又没写是这个颜色的，拿不准是虹膜还是压着的头发，当没找到（不补比补错好）。
 * 回 { status: 'ok' | 'none' | 'gray', iris: { cx, cy, rx, ry, top, bot, n, hue, warm, stats, eye, pixels } }。
 */
export function irisOf(img, rect, { skin, family = familyOf(skin, null), hues = [], hueAround = null, at = [0, 0] } = {}) {
  const [x0, y0, x1, y1] = rect
  const pw = (x1 - x0) * EYE.pad, ph = (y1 - y0) * EYE.pad
  const near = { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, rx: (x1 - x0) / 2 + pw * 0.5, ry: (y1 - y0) / 2 + ph * 0.5 }
  const found = findIris(img, [x0 - pw, y0 - ph, x1 + pw, y1 + ph], { at, skin, family, near, hues, hueAround })
  const sure = found && (!found.warm || (hueAround && hueAround.warm) || (hues.length && rangeGap(found.hue, hues) === 0))
  if (!sure) return { status: 'none', iris: null }
  const s = spread(found.pixels)
  const stats = irisStats(found.pixels, s.y0, s.y1)
  const iris = { cx: (s.x0 + s.x1) / 2, cy: (s.y0 + s.y1) / 2, rx: Math.max(2, (s.x1 - s.x0) / 2), ry: Math.max(2, (s.y1 - s.y0) / 2), top: s.y0, bot: s.y1, n: found.n, hue: found.hue, warm: found.warm, stats, eye: rect, pixels: found.pixels }
  return { status: stats.all.C < EYE.gray ? 'gray' : 'ok', iris }
}

const round1 = v => Math.round(v * 10) / 10

/**
 * 按「要的颜色」给一团虹膜补色：want、was 是 irisStats 的结果（要的、现在的），每层的亮度差、彩度比、色相差
 * 按像素在 top~bot 里的位置插值着加上去（越像虹膜的像素加得越足）。改 data（img 的像素副本，原图坐标偏 at）。
 * 回 { before, after }：补色前后虹膜跟 want 的色差（Lab，irisGap）。
 */
function recolor(pixels, want, was, top, bot, img, data, at) {
  const shift = (b, g) => ({ dL: clamp(b.L - g.L, -EYE.maxL, EYE.maxL), kC: clamp(b.C / Math.max(1, g.C), ...EYE.chromaRatio), dh: hueDiff(b.h, g.h) })
  const whole = shift(want.all, was.all)
  // 这一层几乎没有虹膜（半闭眼的上面那层）：用整团的
  const per = want.bands.map((b, k) => (was.bands[k].n >= Math.max(4, was.all.n * 0.1) && b.n >= Math.max(4, want.all.n * 0.1) ? shift(b, was.bands[k]) : whole))
  const span = Math.max(1, bot - top)
  const fixed = []
  for (const p of pixels) {
    const bw = bandWeights((p.y + 0.5 - top) / span)
    let dL = 0, kC = 0, hx = 0, hy = 0, s = 0
    bw.forEach((w, k) => { if (w > 0) { dL += per[k].dL * w; kC += per[k].kC * w; hx += Math.cos(per[k].dh / DEG) * w; hy += Math.sin(per[k].dh / DEG) * w; s += w } })
    const dh = Math.atan2(hy, hx) * DEG
    const L = clamp(p.L + dL / s, 0, 100), C = p.C * (kC / s), h = (p.h + dh) / DEG
    const rgb = labToRgb(L, C * Math.cos(h), C * Math.sin(h))
    const i = ((p.y - at[1]) * img.width + (p.x - at[0])) * 4
    for (let c = 0; c < 3; c++) data[i + c] = Math.round(data[i + c] * (1 - p.w) + rgb[c] * p.w)
    // 补完的颜色（按补的程度混回去，跟写进图里的一样）
    const lab = rgbToLab(...rgb)
    const mix = [p.L + (lab[0] - p.L) * p.w, p.a + (lab[1] - p.a) * p.w, p.b + (lab[2] - p.b) * p.w]
    fixed.push({ ...p, L: mix[0], a: mix[1], b: mix[2], C: Math.hypot(mix[1], mix[2]), h: hueOf(mix[1], mix[2]) })
  }
  const now = irisStats(fixed, top, bot)
  return { before: round1(irisGap(want, was)), after: round1(irisGap(want, now)) }
}

/** 两团虹膜差多少：按层比（两边都有的那几层，按这团在那层的多少加权；半闭眼只露出下面几层，不拿整团的平均去比），没有能比的层比整团。 */
function irisGap(want, got) {
  let sum = 0, n = 0
  want.bands.forEach((b, k) => {
    const g = got.bands[k]
    if (b.n < Math.max(4, want.all.n * 0.1) || g.n < Math.max(4, got.all.n * 0.1)) return
    sum += deltaE(b, g) * g.n
    n += g.n
  })
  return n ? sum / n : deltaE(want.all, got.all)
}

/**
 * 换脸：重画的这只眼睛按底图的虹膜补色。在底图虹膜那一带找重画的虹膜（同一个动作，眼睛在同一个地方；
 * 左右放宽到整只眼，看别处的眼神虹膜会挪到眼角），分层按底图虹膜的上下沿分（半闭眼露出来的是下面那几层）。
 * 回 { status: 'fixed' | 'same' | 'closed', before, after }。
 */
function fixEye(base, gen, data, { at, skin, family, hues }) {
  const ex = base.eye
  const near = { cx: base.cx, cy: base.cy, rx: Math.max(base.rx * 1.5, (ex[2] - ex[0]) / 2 * 1.1), ry: base.ry * 1.35 + 2 }
  const area = [near.cx - near.rx * 1.6, near.cy - near.ry * 1.6, near.cx + near.rx * 1.6, near.cy + near.ry * 1.6]
  const found = findIris(gen, area, { at, skin, family, near, hues, hueAround: { hue: base.hue, width: 70, warm: base.warm } })
  if (!found || found.n < base.n * EYE.closed) return { status: 'closed', before: 0, after: 0 }
  const was = irisStats(found.pixels, base.top, base.bot)
  return paint(found.pixels, base.stats, was, base.top, base.bot, gen, data, at)
}

/** 差得够多才补（recolor），本来就一样的回 same、不动像素。 */
function paint(pixels, want, was, top, bot, img, data, at) {
  const gap = round1(irisGap(want, was))
  if (gap < EYE.same) return { status: 'same', before: gap, after: gap }
  return { status: 'fixed', ...recolor(pixels, want, was, top, bot, img, data, at) }
}

/** 一张图的皮肤、头发那几族颜色和两只眼睛的框。 */
function faceParts(img, box, eyes, at = [0, 0]) {
  const skin = skinOf(img, box, at)
  return { skin, family: familyOf(skin, hairOf(img, box, skin, at)), rects: eyeRects(box, eyes) }
}

/**
 * 换脸后瞳色对齐底图。src：底图；gen：重画的脸（原图坐标里的样子，左上角在原图的 at，跟 matchTone、faceDrift 用的一样）；
 * box：脸框；eyes：认脸认出的两个眼框（没有就按脸框估）；hues：提示词里写的瞳色（eyeHues 的结果）。
 * 回 { image, eyes: [{ status, before, after }]（左、右）, diff }：image 是补过色的 gen（不改原来的），
 * status：fixed 补了、same 颜色本来就一样、closed 重画里闭着 / 挡住了、none 底图上没找到虹膜、gray 灰黑的眼睛（后面这几种都不补）；
 * diff：补完还差多少（补了的那几只里最大的，Lab 色差），比对用。
 */
export function matchEyes(src, gen, box, at = [0, 0], { eyes = null, hues = [] } = {}) {
  const b = faceParts(src, box, eyes), g = faceParts(gen, box, eyes, at)
  const data = new Uint8ClampedArray(gen.data)
  const out = b.rects.map(rect => {
    const one = irisOf(src, rect, { skin: b.skin, family: b.family, hues })
    if (one.status !== 'ok') return { status: one.status, before: 0, after: 0 }
    return fixEye(one.iris, gen, data, { at, skin: g.skin, family: g.family, hues })
  })
  return done(gen, data, out)
}

const done = (img, data, eyes) => ({
  image: eyes.some(e => e.status === 'fixed') ? { width: img.width, height: img.height, data } : img,
  eyes,
  diff: Math.max(0, ...eyes.filter(e => e.status === 'fixed' || e.status === 'same').map(e => e.after)),
})

/**
 * 瞳色基准：这张立绘两只眼睛虹膜的颜色（左、右；没找到、灰黑的那只是 null）。存进角色的 eyeRef，别的立绘照它补。
 * 每只 { hue, warm, all, bands }：all、bands 是 irisStats 的结果（每层按这张虹膜自己的上下沿分）。
 */
export function paletteOf(img, box, { eyes = null, hues = [] } = {}) {
  const f = faceParts(img, box, eyes)
  return f.rects.map(rect => {
    const one = irisOf(img, rect, { skin: f.skin, family: f.family, hues })
    if (one.status !== 'ok') return null
    const keep = s => ({ n: Math.round(s.n), L: round1(s.L), C: round1(s.C), h: round1(s.h) })
    return { hue: round1(one.iris.hue), warm: one.iris.warm, all: keep(one.iris.stats.all), bands: one.iris.stats.bands.map(keep) }
  })
}

/**
 * 别的立绘（另一个动作、另一套衣服、整张画的「极」）按瞳色基准补色：两只眼睛各自找虹膜（照基准的颜色找），
 * 分层按这张虹膜自己的上下沿分（脸的大小、位置跟基准不一样）。palette 是 paletteOf 的结果。
 * 回跟 matchEyes 一样的 { image, eyes, diff }；status 多一种 'nobase'：基准上这只眼睛没量出来。
 */
export function matchPalette(img, box, palette, { eyes = null, hues = [] } = {}) {
  const f = faceParts(img, box, eyes)
  const data = new Uint8ClampedArray(img.data)
  const out = f.rects.map((rect, k) => {
    const want = Array.isArray(palette) ? palette[k] : null
    if (!want) return { status: 'nobase', before: 0, after: 0 }
    const one = irisOf(img, rect, { skin: f.skin, family: f.family, hues, hueAround: { hue: want.hue, width: 70, warm: want.warm } })
    if (one.status !== 'ok') return { status: one.status === 'gray' ? 'gray' : 'closed', before: 0, after: 0 }
    const { iris } = one
    return paint(iris.pixels, want, iris.stats, iris.top, iris.bot, img, data, [0, 0])
  })
  return done(img, data, out)
}
