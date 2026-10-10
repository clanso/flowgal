// 逆转式立绘的贴片清洗（纯函数，图是 { width, height, data }，RGBA，跟画布的 ImageData 一样）。
// 局部重绘每次都把框里整块重画：半闭眼的虹膜常比原图深、蓝，眼框里的皮肤偏暗，压在眼睛上的刘海也会被改几笔，
// 眨眼时眼睛闪色、眼周闪出方块、头发跟着跳。这里把重画结果洗成「只有真正变了的地方、颜色跟原图一样」的贴片：
//   1. 整体偏色：没怎么变的像素（皮肤、头发）上，重画比原图整体差多少，先全块补回去；
//   2. 按类对齐：虹膜（有彩度的蓝）、线条（暗）分别按 Lab 均值、方差拉到原图同类的颜色（嘴不分类：嘴里的暗红不能拉成睫毛色）；
//   3. 只留变了的：跟原图色差大的像素才用重画的，往外长两像素再羽化；
//   4. 刘海保护（眼睛）：原图里比皮肤偏黄、又不太暗的成块像素当成刘海，一律用原图，盖在眼睛上面。
// 参数照和服少女那张调出来的（先用 Python 原型调好、再搬过来）。

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

/** 每个像素属于「虹膜 / 线条 / 其余」的软权重（加起来是 1）。 */
function classWeights(L, a, b) {
  const iris = Math.min(1, Math.max(0, (Math.hypot(a, b) - 6) / 8)) * Math.min(1, Math.max(0, (-b - 4) / 8))
  const line = Math.min(1, Math.max(0, (55 - L) / 15)) * (1 - iris)
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

/**
 * 原图里压在眼睛上的刘海（0~1 的软遮罩）：Lab 的 b > 10.5（比皮肤偏黄）且 L > 58（不太暗）；
 * 先补小洞，再去掉细于 5 像素的碎块（睫毛浅色的边），往外长 3 像素包住刘海的描边线，边缘模糊 1 像素。
 */
export function hairMask(lab, w, h) {
  let m = new Float32Array(w * h)
  for (let i = 0; i < w * h; i++) m[i] = lab[i * 3 + 2] > 10.5 && lab[i * 3] > 58 ? 1 : 0
  m = minF(maxF(m, w, h, 3), w, h, 3)
  m = maxF(minF(m, w, h, 5), w, h, 5)
  return blur(maxF(m, w, h, 7), w, h, 1)
}

const median = values => {
  if (!values.length) return 0
  const s = Float64Array.from(values).sort()
  const mid = s.length >> 1
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

/**
 * 洗贴片。base：原图（带透明度）；gen：重画结果（垫过白、可能补大过，左上角对齐原图）；rects：这个部件的框（原图坐标）。
 * classes：按虹膜 / 线条分类对齐（眼睛用，嘴不用）；keepHair：刘海一律用原图（眼睛用）。
 * 回 { x, y, width, height, data }：贴片（框的外接矩形），颜色是洗过的重画，透明度 = 用了重画的程度 × 原图透明度，
 * 贴在原图 (x, y) 上就是结果；没变的地方全透明。另回 used（0~1，同尺寸）方便检查。
 */
export function cleanPatch(base, gen, rects, { classes = true, keepHair = false, threshold = 7, grow = 2, feather = 1.5 } = {}) {
  const x0 = Math.max(0, Math.min(...rects.map(r => r[0]))), y0 = Math.max(0, Math.min(...rects.map(r => r[1])))
  const x1 = Math.min(base.width, Math.max(...rects.map(r => r[2]))), y1 = Math.min(base.height, Math.max(...rects.map(r => r[3])))
  const w = x1 - x0, h = y1 - y0
  if (w <= 0 || h <= 0) throw new Error('框在图外')
  if (gen.width < x1 || gen.height < y1) throw new Error('重画结果比原图小，对不上')
  const n = w * h
  const bl = new Float32Array(n * 3), gl = new Float32Array(n * 3), inside = new Uint8Array(n), alpha = new Float32Array(n)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x
      const X = x0 + x, Y = y0 + y
      const bi = (Y * base.width + X) * 4, gi = (Y * gen.width + X) * 4
      const a = base.data[bi + 3] / 255
      alpha[i] = a
      // 原图垫白再比（重画时垫的就是白），半透明的边才对得上
      const lb = rgbToLab(base.data[bi] * a + 255 * (1 - a), base.data[bi + 1] * a + 255 * (1 - a), base.data[bi + 2] * a + 255 * (1 - a))
      const lg = rgbToLab(gen.data[gi], gen.data[gi + 1], gen.data[gi + 2])
      bl.set(lb, i * 3)
      gl.set(lg, i * 3)
      inside[i] = rects.some(r => X >= r[0] && X < r[2] && Y >= r[1] && Y < r[3]) ? 1 : 0
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
  const maps = classes ? [0, 1].map(k => { const sb = stats(bl, wb, k), sg = stats(g2, wg, k); return sb && sg ? { sb, sg } : null }) : [null, null]
  const fixed = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) {
    for (let c = 0; c < 3; c++) {
      let v = g2[i * 3 + c] * wg[i * 3 + 2]
      for (let k = 0; k < 2; k++) {
        const m = maps[k]
        const mapped = m ? (g2[i * 3 + c] - m.sg.mu[c]) * (m.sb.sd[c] / m.sg.sd[c]) + m.sb.mu[c] : g2[i * 3 + c]
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
  // 4. 刘海一律用原图
  const hair = keepHair ? hairMask(bl, w, h) : null
  for (let i = 0; i < n; i++) used[i] = Math.min(1, used[i]) * inside[i] * (hair ? 1 - hair[i] : 1)

  const data = new Uint8ClampedArray(n * 4)
  for (let i = 0; i < n; i++) {
    if (used[i] <= 0.004) continue
    const rgb = labToRgb(fixed[i * 3], fixed[i * 3 + 1], fixed[i * 3 + 2])
    data[i * 4] = rgb[0]
    data[i * 4 + 1] = rgb[1]
    data[i * 4 + 2] = rgb[2]
    data[i * 4 + 3] = Math.round(255 * used[i] * alpha[i])
  }
  return { x: x0, y: y0, width: w, height: h, data, used }
}
