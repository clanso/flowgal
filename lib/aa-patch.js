// 逆转式立绘的贴片清洗（纯函数，图是 { width, height, data }，RGBA，跟画布的 ImageData 一样）。
// 局部重绘每次都把框里整块重画：半闭眼的虹膜常比原图深、蓝，眼框里的皮肤偏暗，压在眼睛上、两眼之间的头发和眉毛也会被改几笔，
// 眨眼时眼睛闪色、眼周闪出方块、头发跟着跳。这里把重画结果洗成「只有真正变了的地方、颜色跟原图一样」的贴片：
//   1. 整体偏色：没怎么变的像素（皮肤、头发）上，重画比原图整体差多少，先全块补回去；
//   2. 按类对齐：虹膜（有彩度的冷色）、线条（暗）分别按 Lab 均值、方差拉到原图同类的颜色（嘴不分类：嘴里的暗红不能拉成睫毛色）；
//   3. 只留变了的：跟原图色差大的像素才用重画的，往外长两像素再羽化；
//   4. 眼核（眼睛）：只许改眼睛本身那块——原图和重画里眼白、虹膜的凸包，按眼睛大小往上撑到上睫毛、往下到下睫毛，
//      加上成块变了的地方（虹膜变成眼皮）；两眼之间、眉毛、脸颊（腮红）上的头发和颜色一律用原图，不认颜色（发色可能跟皮肤、腮红一样）；
//   5. 嘴：新画的嘴挪到跟原来的嘴线对齐（左右对中，张嘴不往上长），只许改原来的嘴线和新嘴附近（下巴、衣领用原图）。
// 嘴框在生成前先对准原来的嘴线（fitMouth）：NovelAI 把嘴画在遮罩中间，框偏了嘴就偏、框上面空得多嘴就往上长。
// 参数照和服少女、担心（青绿眼、浅米粉发）、平静 / 坚定（刘海压着眼睛）几张调出来的；Python 原型（D:\逆转裁判立绘\scripts\eye_color.py）只到第 4 步的旧版（内切椭圆）。

// ───────── 颜色：sRGB ↔ Lab（D65） ─────────
const WHITE = [0.95047, 1, 1.08883]
const lin = c => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4 }
const unlin = c => 255 * (c <= 0.0031308 ? c * 12.92 : 1.055 * Math.max(0, c) ** (1 / 2.4) - 0.055)
const LIN = Array.from({ length: 256 }, (_, i) => lin(i))
const fLab = t => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116)
const fInv = f => (f ** 3 > 216 / 24389 ? f ** 3 : (116 * f - 16) / (24389 / 27))

export function rgbToLab(r, g, b) {
  const R = LIN[r | 0], G = LIN[g | 0], B = LIN[b | 0]
  const x = fLab((0.4124564 * R + 0.3575761 * G + 0.1804375 * B) / WHITE[0])
  const y = fLab(0.2126729 * R + 0.7151522 * G + 0.072175 * B)
  const z = fLab((0.0193339 * R + 0.119192 * G + 0.9503041 * B) / WHITE[2])
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)]
}

export function labToRgb(L, a, b) {
  const fy = (L + 16) / 116
  const X = fInv(fy + a / 500) * WHITE[0], Y = fInv(fy), Z = fInv(fy - b / 200) * WHITE[2]
  const out = [3.2404542 * X - 1.5371385 * Y - 0.4985314 * Z, -0.969266 * X + 1.8760108 * Y + 0.041556 * Z, 0.0556434 * X - 0.2040259 * Y + 1.0572252 * Z]
  return out.map(c => Math.max(0, Math.min(255, Math.round(unlin(c)))))
}

const clamp01 = v => Math.min(1, Math.max(0, v))
/**
 * 每个像素属于「虹膜 / 线条 / 其余」的软权重（加起来是 1）。
 * 虹膜：有彩度的冷色（蓝、青绿、绿、紫——Lab 的 a 或 b 明显为负），皮肤、头发、腮红都是暖色不算；红、褐、金色的眼睛分不出来，归「其余」。
 * 线条：暗的（睫毛、眼线、描边）。
 */
function classWeights(L, a, b) {
  const iris = clamp01((Math.hypot(a, b) - 6) / 8) * clamp01((Math.max(-a, -b) - 2) / 6)
  const line = clamp01((55 - L) / 15) * (1 - iris)
  return [iris, line, Math.max(0, 1 - iris - line)]
}

// ───────── 遮罩：方形最大 / 最小滤波（跟 PIL 的 MaxFilter / MinFilter 一样）、高斯模糊 ─────────
function rankFilter(src, w, h, size, pick) {
  const r = size >> 1
  const tmp = new Float32Array(w * h), out = new Float32Array(w * h)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let v = src[y * w + x]
      for (let k = Math.max(0, x - r); k <= Math.min(w - 1, x + r); k++) v = pick(v, src[y * w + k])
      tmp[y * w + x] = v
    }
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let v = tmp[y * w + x]
      for (let k = Math.max(0, y - r); k <= Math.min(h - 1, y + r); k++) v = pick(v, tmp[k * w + x])
      out[y * w + x] = v
    }
  }
  return out
}
const maxF = (m, w, h, size) => rankFilter(m, w, h, size, Math.max)
const minF = (m, w, h, size) => rankFilter(m, w, h, size, Math.min)

function blur(m, w, h, sigma) {
  if (!(sigma > 0)) return m
  const r = Math.ceil(sigma * 3)
  const k = Array.from({ length: 2 * r + 1 }, (_, i) => Math.exp(-((i - r) ** 2) / (2 * sigma * sigma)))
  const pass = (src, dx, dy) => {
    const out = new Float32Array(w * h)
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let s = 0, ws = 0
        for (let i = -r; i <= r; i++) {
          const X = x + i * dx, Y = y + i * dy
          if (X < 0 || Y < 0 || X >= w || Y >= h) continue
          s += src[Y * w + X] * k[i + r]
          ws += k[i + r]
        }
        out[y * w + x] = s / ws
      }
    }
    return out
  }
  return pass(pass(m, 1, 0), 0, 1)
}

// ───────── 眼核：一只眼睛真正会变的那块（凸包） ─────────
/** 凸包（单调链），点是 [x, y]，回逆时针的顶点。 */
function convexHull(points) {
  const p = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1])
  if (p.length < 3) return p
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
  const lower = [], upper = []
  for (const q of p) { while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], q) <= 0) lower.pop(); lower.push(q) }
  for (const q of p.slice().reverse()) { while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], q) <= 0) upper.pop(); upper.push(q) }
  return lower.slice(0, -1).concat(upper.slice(0, -1))
}

/** 点到凸多边形的距离（在里面是 0；外面按各边外法向的最大值算，拐角处略小，够用）。 */
function hullDistance(hull, x, y) {
  let d = -Infinity
  for (let i = 0; i < hull.length; i++) {
    const [ax, ay] = hull[i], [bx, by] = hull[(i + 1) % hull.length]
    const ex = bx - ax, ey = by - ay, len = Math.hypot(ex, ey) || 1
    // 逆时针（y 朝下的图上看是顺时针）：外法向是 (ey, -ex)
    d = Math.max(d, ((x - ax) * ey - (y - ay) * ex) / len)
  }
  return Math.max(0, d)
}

/** 四连通的连通块：mask 里大于 0 的像素，回每块的下标列表。 */
function components(mask, w, h) {
  const seen = new Uint8Array(w * h), out = []
  for (let s = 0; s < w * h; s++) {
    if (!(mask[s] > 0) || seen[s]) continue
    const comp = [s], stack = [s]
    seen[s] = 1
    while (stack.length) {
      const k = stack.pop(), x = k % w
      for (const nb of [x > 0 ? k - 1 : -1, x < w - 1 ? k + 1 : -1, k - w, k + w]) {
        if (nb < 0 || nb >= w * h || seen[nb] || !(mask[nb] > 0)) continue
        seen[nb] = 1
        stack.push(nb)
        comp.push(nb)
      }
    }
    out.push(comp)
  }
  return out
}

const isSclera = (L, a, b) => L > 80 && Math.hypot(a, b) < 7

/**
 * 一只眼睛的眼核：框的内切椭圆里，原图和重画里的眼白、虹膜，加上色差很大、成块（不是一两像素的细线）而且挨着眼白虹膜的变化
 * （睁眼变闭眼时虹膜、上睫毛那一大块），取凸包。只许改眼核附近：两眼之间、眼睛上方（眉毛）、下方（脸颊、腮红）压着的头发都用原图。
 * 眼白虹膜太少（眼睛几乎全被头发挡住）时回 null，退回只用椭圆。
 */
function eyeCore(r, { x0, y0, w, h, bl, g2, wb, wg, de }) {
  const rx = (r[2] - r[0]) / 2, ry = (r[3] - r[1]) / 2, cx = r[0] + rx, cy = r[1] + ry
  const ell = (x, y) => ((x0 + x + 0.5 - cx) / rx) ** 2 + ((y0 + y + 0.5 - cy) / ry) ** 2
  const feat = new Float32Array(w * h), strong = new Float32Array(w * h)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x
    if (ell(x, y) > 0.9) continue
    const fb = wb[i * 3] > 0.5 || isSclera(bl[i * 3], bl[i * 3 + 1], bl[i * 3 + 2])
    const fg = wg[i * 3] > 0.5 || isSclera(g2[i * 3], g2[i * 3 + 1], g2[i * 3 + 2])
    if (fb || fg) feat[i] = 1
    if (de(i) > 22) strong[i] = 1
  }
  // 眼白、虹膜要成块：头发描边上的细高光（一两像素宽）也是又亮又灰，开运算去掉；零星的小块（头发上大块的高光）也不算
  const feats = components(maxF(minF(feat, w, h, 3), w, h, 3), w, h)
  const biggest = Math.max(0, ...feats.map(c => c.length))
  const points = []
  feat.fill(0)
  for (const c of feats) if (c.length >= Math.max(6, biggest * 0.2)) for (const k of c) { feat[k] = 1; points.push([k % w, (k / w) | 0]) }
  if (points.length < 25) return null
  // 眼睛的画不止眼白虹膜：上面压着一道粗睫毛（常是一缕缕排线，色差图上碎成细线），下面有下睫毛，两头有眼角的尾巴。
  // 按眼白虹膜的高、宽把它们的凸包往上撑 0.7 个眼高、往下 0.35 个、往两边 0.12 个眼宽
  let top = Infinity, bot = -Infinity, left = Infinity, right = -Infinity
  for (const [x, y] of points) { top = Math.min(top, y); bot = Math.max(bot, y); left = Math.min(left, x); right = Math.max(right, x) }
  const eh = bot - top + 1, ew = right - left + 1
  // 睁得很圆的眼睛（眼高快赶上眼宽）睫毛并不跟着变粗：撑出去的量再按眼宽封顶
  const up = 2 + Math.min(eh * 0.7, ew * 0.22), down = 2 + Math.min(eh * 0.35, ew * 0.12), side = 2 + ew * 0.12
  const all = convexHull(points).flatMap(([x, y]) => [[x, y - up], [x, y + down], [x - side, y], [x + side, y]])
  // 再加上成块的大变化（开运算去掉细线：头发描边挪了一两像素），只要挨着眼白虹膜的块（睁眼变闭眼时虹膜、上睫毛那一大块）
  const near = maxF(feat, w, h, 7)
  for (const c of components(maxF(minF(strong, w, h, 3), w, h, 3), w, h)) {
    if (c.some(k => near[k])) for (const k of c) { all.push([k % w, (k / w) | 0]); points.push([k % w, (k / w) | 0]) }
  }
  const hull = convexHull(all).map(([x, y]) => [x0 + x + 0.5, y0 + y + 0.5])
  return { hull, reach: 1, soft: 2.5 }
}

const median = values => {
  if (!values.length) return 0
  const s = Float64Array.from(values).sort()
  const mid = s.length >> 1
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

/**
 * 洗贴片。base：原图（带透明度）；gen：重画结果（垫过白、可能补大过，左上角对齐原图）；rects：这个部件的框（原图坐标）。
 * classes：按虹膜 / 线条分类对齐（眼睛用，嘴不用）；keepHair：只许改眼核（眼睛用，见 eyeCore）；
 * mouth：'top'（小开、开：嘴上沿不高过原来的嘴线）或 'center'（齿缝、圆嘴：中心对齐），新画的嘴挪到原来嘴线的位置、只改嘴附近（嘴用）。
 * 回 { x, y, width, height, data }：贴片（框的外接矩形），颜色是洗过的重画，透明度 = 用了重画的程度 × 原图透明度，
 * 贴在原图 (x, y) 上就是结果；没变的地方全透明。另回 used（0~1，同尺寸）和 shift（嘴挪了多少 [dx, dy]）方便检查。
 */
export function cleanPatch(base, gen, rects, { classes = true, keepHair = false, mouth = null, threshold = 7, grow = 2, feather = 1.5 } = {}) {
  const x0 = Math.max(0, Math.min(...rects.map(r => r[0]))), y0 = Math.max(0, Math.min(...rects.map(r => r[1])))
  const x1 = Math.min(base.width, Math.max(...rects.map(r => r[2]))), y1 = Math.min(base.height, Math.max(...rects.map(r => r[3])))
  const w = x1 - x0, h = y1 - y0
  if (w <= 0 || h <= 0) throw new Error('框在图外')
  if (gen.width < x1 || gen.height < y1) throw new Error('重画结果比原图小，对不上')
  const n = w * h
  const fit = mouth ? mouthFit(base, gen, rects[0], mouth) : null
  const [dx, dy] = fit ? fit.shift : [0, 0]
  const bl = new Float32Array(n * 3), gl = new Float32Array(n * 3), inside = new Uint8Array(n), alpha = new Float32Array(n)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x
      const X = x0 + x, Y = y0 + y
      const bi = (Y * base.width + X) * 4, gi = ((Y - dy) * gen.width + X - dx) * 4
      const a = base.data[bi + 3] / 255
      alpha[i] = a
      // 原图垫白再比（重画时垫的就是白），半透明的边才对得上
      const lb = rgbToLab(base.data[bi] * a + 255 * (1 - a), base.data[bi + 1] * a + 255 * (1 - a), base.data[bi + 2] * a + 255 * (1 - a))
      const lg = rgbToLab(gen.data[gi], gen.data[gi + 1], gen.data[gi + 2])
      bl.set(lb, i * 3)
      gl.set(lg, i * 3)
      // 挪过的嘴：取的那个像素也要在框里（框外是没重画的原图，挪进来会多出一道错位的边）
      inside[i] = rects.some(r => X >= r[0] && X < r[2] && Y >= r[1] && Y < r[3] && X - dx >= r[0] && X - dx < r[2] && Y - dy >= r[1] && Y - dy < r[3]) ? 1 : 0
    }
  }
  const de = i => Math.hypot(gl[i * 3] - bl[i * 3], gl[i * 3 + 1] - bl[i * 3 + 1], gl[i * 3 + 2] - bl[i * 3 + 2])

  // 1. 整体偏色（中位数，不怕眼睛那块拉偏）
  const calm = [[], [], []]
  for (let i = 0; i < n; i++) if (inside[i] && de(i) < 12) for (let c = 0; c < 3; c++) calm[c].push(bl[i * 3 + c] - gl[i * 3 + c])
  const offset = calm[0].length > 50 ? calm.map(median) : [0, 0, 0]
  const g2 = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) for (let c = 0; c < 3; c++) g2[i * 3 + c] = gl[i * 3 + c] + offset[c]

  // 2. 虹膜、线条按类拉到原图同类的颜色
  const wb = new Float32Array(n * 3), wg = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) {
    wb.set(classWeights(bl[i * 3], bl[i * 3 + 1], bl[i * 3 + 2]), i * 3)
    wg.set(classWeights(g2[i * 3], g2[i * 3 + 1], g2[i * 3 + 2]), i * 3)
  }
  const stats = (lab, wts, k) => {
    let s = 0
    const mu = [0, 0, 0], sd = [0, 0, 0]
    for (let i = 0; i < n; i++) { const v = wts[i * 3 + k] * inside[i]; s += v; for (let c = 0; c < 3; c++) mu[c] += lab[i * 3 + c] * v }
    if (s < 20) return null
    for (let c = 0; c < 3; c++) mu[c] /= s
    for (let i = 0; i < n; i++) { const v = wts[i * 3 + k] * inside[i]; for (let c = 0; c < 3; c++) sd[c] += (lab[i * 3 + c] - mu[c]) ** 2 * v }
    return { mu, sd: sd.map(x => Math.max(0.5, Math.sqrt(x / s))) }
  }
  // 方差的缩放限制在 0.8~1.25：两边方差差得多时（一边只有几个像素算进来），放大会把颜色拉得更艳、更亮
  const ratio = (b, g) => Math.min(1.25, Math.max(0.8, b / g))
  const maps = classes ? [0, 1].map(k => { const sb = stats(bl, wb, k), sg = stats(g2, wg, k); return sb && sg ? { sb, sg } : null }) : [null, null]
  const fixed = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) {
    for (let c = 0; c < 3; c++) {
      let v = g2[i * 3 + c] * wg[i * 3 + 2]
      for (let k = 0; k < 2; k++) {
        const m = maps[k]
        const mapped = m ? (g2[i * 3 + c] - m.sg.mu[c]) * ratio(m.sb.sd[c], m.sg.sd[c]) + m.sb.mu[c] : g2[i * 3 + c]
        v += mapped * wg[i * 3 + k]
      }
      fixed[i * 3 + c] = v
    }
  }

  // 3. 只留变了的：色差大于阈值，往外长 grow 像素，补小洞，羽化；框外不动
  let used = new Float32Array(n)
  for (let i = 0; i < n; i++) used[i] = inside[i] && de(i) > threshold ? 1 : 0
  used = maxF(minF(maxF(used, w, h, grow * 2 + 1), w, h, 3), w, h, 3)
  used = blur(used, w, h, feather)
  // 4. 眼核（眼睛）：只许改眼睛本身那块（不超出眼框的内切椭圆）；两眼之间、眉毛、脸颊上的头发一律用原图。
  //    不认颜色：有的角色发色跟腮红几乎一样，按颜色认会把腮红当头发护住，闭眼时留下原来的下睫毛。认不出眼核（眼睛几乎全被挡住）时只用椭圆。
  if (keepHair) {
    const cores = rects.map(r => eyeCore(r, { x0, y0, w, h, bl, g2, wb, wg, de }))
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const X = x0 + x + 0.5, Y = y0 + y + 0.5
      let k = 0
      rects.forEach((r, ri) => {
        const rx = (r[2] - r[0]) / 2, ry = (r[3] - r[1]) / 2
        const d = ((X - (r[0] + rx)) / rx) ** 2 + ((Y - (r[1] + ry)) / ry) ** 2
        let kk = clamp01((1.08 - d) / 0.16)
        const c = cores[ri]
        if (c) kk *= clamp01((c.reach + c.soft - hullDistance(c.hull, X, Y)) / c.soft)
        k = Math.max(k, kk)
      })
      used[y * w + x] *= k
    }
  }
  // 5. 嘴：只许改原来的嘴线和新画的嘴附近（下巴、衣领、鼻子即使被重画了几笔也用原图；挪嘴时框里别处不跟着挪）
  if (fit) {
    const g = fit.grow, f = 2
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const X = x0 + x + 0.5, Y = y0 + y + 0.5
      let k = 0
      for (const b of fit.areas) {
        const d = Math.max(b[0] - X, X - b[2], b[1] - Y, Y - b[3], 0)
        k = Math.max(k, clamp01((g + f - d) / f))
      }
      used[y * w + x] *= k
    }
  }
  for (let i = 0; i < n; i++) used[i] = Math.min(1, used[i]) * inside[i]

  const data = new Uint8ClampedArray(n * 4)
  for (let i = 0; i < n; i++) {
    if (used[i] <= 0.004) continue
    const rgb = labToRgb(fixed[i * 3], fixed[i * 3 + 1], fixed[i * 3 + 2])
    data[i * 4] = rgb[0]
    data[i * 4 + 1] = rgb[1]
    data[i * 4 + 2] = rgb[2]
    data[i * 4 + 3] = Math.round(255 * used[i] * alpha[i])
  }
  return { x: x0, y: y0, width: w, height: h, data, used, shift: [dx, dy] }
}

/**
 * 新画的嘴对齐原来的嘴：左右按嘴的中心对齐；上下 how = 'top'（张嘴：上沿不高过原来嘴线 1 像素，只往下挪）或 'center'（齿缝、圆嘴：中心对齐）。
 * 最多挪 6 像素，而且挪完原来的嘴线还得整个落在新画的那块里（不然会露出半截旧嘴线）。
 * 回 { shift: [dx, dy], areas: [原来的嘴线框, 挪过的新嘴框], grow }；原图或新图里找不到嘴回 null（不挪、不限范围）。
 */
function mouthFit(base, gen, rect, how) {
  const a = mouthLine(base, rect), b = mouthLine(gen, rect)
  if (!a || !b) return null
  let dx = Math.round(a.center[0] - b.center[0])
  let dy = how === 'top' ? Math.max(0, a.box[1] - 1 - b.box[1]) : Math.round(a.center[1] - b.center[1])
  const lim = (v, lo, hi) => Math.max(Math.max(-6, lo), Math.min(Math.min(6, hi), v))
  // 原来的嘴线（多留 1 像素）要在「挪过来的那块」里：rect 平移 (dx, dy) 后仍盖住它
  dx = lim(dx, -(rect[2] - a.box[2] - 1), a.box[0] - rect[0] - 1)
  dy = lim(dy, -(rect[3] - a.box[3] - 1), a.box[1] - rect[1] - 1)
  const moved = [b.box[0] + dx, b.box[1] + dy, b.box[2] + dx, b.box[3] + dy]
  // 嘴边的淡影（下唇的阴影、嘴角）不一定算进嘴里：往外多放一点
  const grow = 3 + Math.max(a.box[3] - a.box[1], b.box[3] - b.box[1]) * 0.25
  return { shift: [dx, dy], areas: [a.box, moved], grow }
}

// ───────── 嘴：在框里找原来的嘴线，框对准它 ─────────
/**
 * 框里原来的嘴（闭着的一条线、几段短线，或张着的一小团）：比肤色暗或更红的像素，几段挨着的合起来。
 * img 是原图（带透明度，垫白算）；rect 是嘴框。回 { box: [x0, y0, x1, y1], center: [x, y] }，找不到回 null。
 */
export function mouthLine(img, rect) {
  const pad = 4
  const X0 = Math.max(0, rect[0] - pad), Y0 = Math.max(0, rect[1] - pad), X1 = Math.min(img.width, rect[2] + pad), Y1 = Math.min(img.height, rect[3] + pad)
  const w = X1 - X0, h = Y1 - Y0
  if (w < 8 || h < 8) return null
  const L = new Float32Array(w * h), R = new Float32Array(w * h)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = ((Y0 + y) * img.width + X0 + x) * 4, a = img.data[i + 3] / 255
    const r = img.data[i] * a + 255 * (1 - a), g = img.data[i + 1] * a + 255 * (1 - a), b = img.data[i + 2] * a + 255 * (1 - a)
    L[y * w + x] = 0.299 * r + 0.587 * g + 0.114 * b
    R[y * w + x] = r - (g + b) / 2
  }
  // 肤色：框边上一圈的中位数（嘴在框中间）
  const ringL = [], ringR = []
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (x < 3 || y < 3 || x >= w - 3 || y >= h - 3) { ringL.push(L[y * w + x]); ringR.push(R[y * w + x]) }
  const sL = median(ringL), sR = median(ringR)
  const score = new Float32Array(w * h)
  let max = 0
  for (let i = 0; i < w * h; i++) { score[i] = Math.max(0, sL - L[i] - 18) + Math.max(0, R[i] - sR - 12) * 1.5; max = Math.max(max, score[i]) }
  if (max < 25) return null
  // 碰到框边的是下巴、衣领、头发，不是嘴；越靠框中间越像
  const blobs = components(score.map(s => (s >= max * 0.3 ? 1 : 0)), w, h).filter(c => c.length >= 3).map(c => {
    let x0 = w, y0 = h, x1 = 0, y1 = 0, m = 0, sx = 0, sy = 0
    for (const k of c) { const x = k % w, y = (k / w) | 0; x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x + 1); y1 = Math.max(y1, y + 1); m += score[k]; sx += x * score[k]; sy += y * score[k] }
    const off = ((sx / m - w / 2) / (w * 0.35)) ** 2 + ((sy / m - h / 2) / (h * 0.6)) ** 2
    return { box: [x0, y0, x1, y1], m, sx, sy, value: m * Math.exp(-off / 2), edge: x0 === 0 || y0 === 0 || x1 === w || y1 === h }
  }).filter(b => !b.edge)
  if (!blobs.length) return null
  // 最像的一块，加上跟它在同一高度、横向挨得近的几段（「- - -」那种断开的嘴线）
  blobs.sort((a, b) => b.value - a.value)
  const main = blobs[0]
  let box = main.box.slice(), m = main.m, sx = main.sx, sy = main.sy
  for (const b of blobs.slice(1)) {
    const cy = (b.box[1] + b.box[3]) / 2, my = (box[1] + box[3]) / 2
    const gap = Math.max(b.box[0] - box[2], box[0] - b.box[2])
    if (Math.abs(cy - my) <= 4 && gap <= (rect[2] - rect[0]) * 0.3 && b.m > main.m * 0.08) {
      box = [Math.min(box[0], b.box[0]), Math.min(box[1], b.box[1]), Math.max(box[2], b.box[2]), Math.max(box[3], b.box[3])]
      m += b.m; sx += b.sx; sy += b.sy
    }
  }
  return { box: [X0 + box[0], Y0 + box[1], X0 + box[2], Y0 + box[3]], center: [X0 + sx / m + 0.5, Y0 + sy / m + 0.5] }
}

/**
 * 嘴框对准原来的嘴线：宽度不变（太窄就放宽到盖住嘴线），左右以嘴线为中心；上边收到嘴线上方 2 像素（对齐 8 像素往上取），
 * 下边不动（框多低嘴最多张到多低，也不碰下巴）——NovelAI 会把嘴画在遮罩中间，框偏了嘴就跟着偏、往上长。width、height 是图的尺寸。
 */
export function fitMouthRect(rect, line, width, height) {
  const [lx0, ly0, lx1, ly1] = line.box
  const cx = line.center[0]
  const s8 = v => Math.round(v / 8) * 8
  let W = Math.max(rect[2] - rect[0], Math.ceil((lx1 - lx0 + 8) / 8) * 8)
  let best = null
  for (const ww of [W, W + 8]) {
    const x0 = s8(cx - ww / 2)
    if (x0 > lx0 - 2 || x0 + ww < lx1 + 2) continue
    const err = Math.abs(x0 + ww / 2 - cx)
    if (!best || err < best.err - 0.01) best = { x0, ww, err }
  }
  if (!best) { W += 16; best = { x0: s8(cx - W / 2), ww: W } }
  const y0 = Math.floor((ly0 - 2) / 8) * 8
  const y1 = Math.max(rect[3], Math.ceil((ly1 + 8) / 8) * 8, y0 + 16)
  const out = [best.x0, y0, best.x0 + best.ww, y1]
  return [Math.max(0, out[0]), Math.max(0, out[1]), Math.min(width, out[2]), Math.min(height, out[3])]
}

/** 生成前把嘴框对准原图上的嘴线（见 fitMouthRect）；rects 是 cleanRects 过的 { eyes, mouth }，找不到嘴线就原样回。 */
export function fitMouth(img, rects) {
  const r = rects.mouth && rects.mouth[0]
  const line = r && mouthLine(img, r)
  return line ? { ...rects, mouth: [fitMouthRect(r, line, img.width, img.height)] } : rects
}
