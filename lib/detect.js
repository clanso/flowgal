// 逆转式立绘工作台的「自动框」：认出脸、眼睛，推出嘴，给出眼睛和嘴的框（跟手框的格式一样：[x0, y0, x1, y1]，原图坐标）。
// 这里只有纯计算（浏览器和测试共用）：图片怎么喂给模型、模型输出怎么读、框怎么推。真正跑模型的是浏览器里的 onnxruntime，
// 由调用方以 run(模型, 输入) 的形式传进来。
// 模型是 deepghs 的二次元检测（YOLO 导出的 ONNX，见 lib/models.js）：
//   输入 images [1, 3, H, W]：RGB、0~1、透明处垫白；H、W 是原图（或裁下的一块）按长边缩到不超过 640、再向上对齐 32 的尺寸，不加黑边。
//   输出 output0 [1, 4 + 类别数, N]：每一列是框中心 x、中心 y、宽、高（输入图坐标）和各类别的分数。
// 认不出来的（furry 脸、侧脸、挡住的）退一步：用头的位置估脸，用脸估眼睛；同一个角色的其它差分已经框好时，
// 按那张的样子在这张里找（模板匹配），这对任何画风都管用。

/** 送进模型的尺寸：长边缩到不超过 max（只缩不放，除非给了 min），宽高向上对齐 align。 */
export function fitSize(w, h, max = 640, align = 32, min = 0) {
  let r = Math.min(1, max / Math.max(w, h))
  if (min && Math.max(w, h) * r < min) r = min / Math.max(w, h)
  return { w: Math.max(align, Math.ceil((w * r) / align) * align), h: Math.max(align, Math.ceil((h * r) / align) * align) }
}

/**
 * 把图上的一块（box = [x0, y0, x1, y1]）双线性缩放成 size 大小，排成模型要的 [3, H, W] 浮点数组。
 * img 是 { width, height, data }（RGBA，跟画布的 ImageData 一样）；半透明处按白底合成，框到图外的地方也是白。
 */
export function imageTensor(img, box, size) {
  const [x0, y0, x1, y1] = box
  const { w, h } = size
  const out = new Float32Array(3 * w * h)
  const sx = (x1 - x0) / w, sy = (y1 - y0) / h
  const plane = w * h
  const px = (x, y, c) => {
    if (x < 0 || y < 0 || x >= img.width || y >= img.height) return 1
    const i = (y * img.width + x) * 4
    const a = img.data[i + 3] / 255
    return (img.data[i + c] / 255) * a + (1 - a)
  }
  for (let j = 0; j < h; j++) {
    const fy = y0 + (j + 0.5) * sy - 0.5
    const yA = Math.floor(fy), ty = fy - yA
    for (let i = 0; i < w; i++) {
      const fx = x0 + (i + 0.5) * sx - 0.5
      const xA = Math.floor(fx), tx = fx - xA
      for (let c = 0; c < 3; c++) {
        const top = px(xA, yA, c) * (1 - tx) + px(xA + 1, yA, c) * tx
        const bottom = px(xA, yA + 1, c) * (1 - tx) + px(xA + 1, yA + 1, c) * tx
        out[c * plane + j * w + i] = top * (1 - ty) + bottom * ty
      }
    }
  }
  return out
}

/** 两个框的交并比。 */
export function iou(a, b) {
  const w = Math.min(a[2], b[2]) - Math.max(a[0], b[0])
  const h = Math.min(a[3], b[3]) - Math.max(a[1], b[1])
  if (w <= 0 || h <= 0) return 0
  const inter = w * h
  return inter / ((a[2] - a[0]) * (a[3] - a[1]) + (b[2] - b[0]) * (b[3] - b[1]) - inter)
}

/** 非极大值抑制：分数从高到低，跟已留下的框重叠超过 limit 的丢掉。list 里每项 { box, score }。 */
export function nms(list, limit = 0.7) {
  const kept = []
  for (const d of [...list].sort((a, b) => b.score - a.score)) if (kept.every(k => iou(k.box, d.box) <= limit)) kept.push(d)
  return kept
}

/**
 * 读 YOLO 输出：data 是 output0 的数据，dims 是它的形状 [1, 4 + 类别数, N]。
 * box / size 是送进去的那一块和缩放后的尺寸（把框换回原图坐标）。返回按分数排好、做过 NMS 的 [{ box, score }]。
 */
export function parseYolo(data, dims, { threshold = 0.25, box, size, iouLimit = 0.7 }) {
  const n = dims[2], classes = dims[1] - 4
  const kx = (box[2] - box[0]) / size.w, ky = (box[3] - box[1]) / size.h
  const list = []
  for (let i = 0; i < n; i++) {
    let score = 0
    for (let c = 0; c < classes; c++) score = Math.max(score, data[(4 + c) * n + i])
    if (score < threshold) continue
    const cx = data[i], cy = data[n + i], w = data[2 * n + i], h = data[3 * n + i]
    list.push({ score, box: [box[0] + (cx - w / 2) * kx, box[1] + (cy - h / 2) * ky, box[0] + (cx + w / 2) * kx, box[1] + (cy + h / 2) * ky] })
  }
  return nms(list, iouLimit)
}

const center = b => [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2]
const area = b => Math.max(0, b[2] - b[0]) * Math.max(0, b[3] - b[1])
const grow = (b, kx, ky = kx) => { const [cx, cy] = center(b), w = (b[2] - b[0]) * kx, h = (b[3] - b[1]) * ky; return [cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2] }
const clampBox = (b, w, h) => [Math.max(0, b[0]), Math.max(0, b[1]), Math.min(w, b[2]), Math.min(h, b[3])]
const at = ([cx, cy], w, h) => [cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2]

/** 立绘里的主角脸：分数高、个头大、靠上靠中间的那张（一张立绘只有一个人，偶尔会把衣服上的图案认成脸）。 */
export function mainFace(faces, width, height) {
  let best = null, bestScore = -1
  for (const f of faces) {
    const [cx, cy] = center(f.box)
    const s = f.score * Math.sqrt(area(f.box) / (width * height)) * (1 - Math.abs(cx / width - 0.5)) * (1 - 0.5 * cy / height)
    if (s > bestScore) { best = f; bestScore = s }
  }
  return best
}

/** 脸框里的两只眼睛：取分数最高、在脸的上半部、左右分开的一对；只找到一只就只回一只。按从左到右排。 */
export function pickEyes(eyes, face) {
  const fw = face[2] - face[0], fh = face[3] - face[1]
  const inside = eyes.filter(e => {
    const [cx, cy] = center(e.box)
    return cx > face[0] - fw * 0.1 && cx < face[2] + fw * 0.1 && cy > face[1] - fh * 0.05 && cy < face[1] + fh * 0.8
  })
  let pair = null, best = -1
  for (let i = 0; i < inside.length; i++) {
    for (let j = i + 1; j < inside.length; j++) {
      const [a, b] = [inside[i], inside[j]]
      const [ax, ay] = center(a.box), [bx, by] = center(b.box)
      const dx = Math.abs(ax - bx), dy = Math.abs(ay - by)
      // 两只眼睛左右分开（至少脸宽的 1/5）、高度差不多（倾斜不超过约 30°）
      if (dx < fw * 0.2 || dy > dx * 0.6) continue
      const s = a.score + b.score
      if (s > best) { best = s; pair = ax < bx ? [a, b] : [b, a] }
    }
  }
  if (pair) return pair
  return inside.length ? [inside.sort((a, b) => b.score - a.score)[0]] : []
}

/**
 * 从脸框估眼睛（眼睛模型没认出来时）：二次元正脸的眼睛大致在脸框高度的 45%、左右各在 30% 和 70%。
 * 侧着的脸靠 known（认出来的那一只）对称过去。
 */
export function eyesFromFace(face, known = null) {
  const fw = face[2] - face[0], fh = face[3] - face[1]
  const size = [fw * 0.26, fh * 0.2]
  if (known) {
    const [kx, ky] = center(known)
    const mirror = face[0] + face[2] - kx
    // 对称过去的那只离得太近（侧脸、认出的眼睛在正中间）就按脸宽的四成放
    const other = Math.abs(mirror - kx) < fw * 0.25 ? kx + (kx < (face[0] + face[2]) / 2 ? 1 : -1) * fw * 0.4 : mirror
    const kw = known[2] - known[0], kh = known[3] - known[1]
    return [known, at([other, ky], kw, kh)].sort((a, b) => a[0] - b[0])
  }
  return [at([face[0] + fw * 0.3, face[1] + fh * 0.45], ...size), at([face[0] + fw * 0.7, face[1] + fh * 0.45], ...size)]
}

/** 从头框估脸框：头框包着头发，脸在它的下半截、略窄。 */
export function faceFromHead(head) {
  const hw = head[2] - head[0], hh = head[3] - head[1]
  return [head[0] + hw * 0.18, head[1] + hh * 0.32, head[2] - hw * 0.18, head[3] - hh * 0.02]
}

/**
 * 嘴的估计位置：两眼连线的中点往「下」（垂直于连线、朝下巴方向）走 0.7 个眼距。
 * 这个比例是拿手框过的立绘量的（和服少女、阿黛尔都在 0.68~0.70）。回 { center, d, angle }。
 */
export function mouthGuess(eyes) {
  const [a, b] = eyes.map(center)
  const dx = b[0] - a[0], dy = b[1] - a[1]
  const d = Math.hypot(dx, dy)
  const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
  // 垂直于两眼连线、朝下
  let nx = -dy / d, ny = dx / d
  if (ny < 0) { nx = -nx; ny = -ny }
  return { center: [mid[0] + nx * d * 0.7, mid[1] + ny * d * 0.7], d, angle: Math.atan2(dy, dx) }
}

/**
 * 在估计位置附近找嘴：嘴是脸上比肤色暗（闭嘴的一条线）或更红（张开、嘴唇）的一小团。
 * 二次元少女的嘴基本就在估计点上，写实些的大叔要再往下 0.2~0.4 个眼距，所以往下多找一段，但不过下巴（chin，脸框底边）。
 * 先取估计点上方、两眼之间偏下的一块当肤色，算每个像素「像嘴」的程度，连成一团一团的，
 * 挑横着长、靠中间、离估计点近的那团；大笑时嘴被牙齿隔成几块，挨着的几块合起来。回外接框；找不到回 null。
 */
export function findMouth(img, guess, chin = Infinity) {
  const { d } = guess
  const [gx, gy] = guess.center
  const win = clampBox([gx - d * 0.55, gy - d * 0.3, gx + d * 0.55, Math.min(gy + d * 0.62, chin - d * 0.05)].map(Math.round), img.width, img.height)
  const W = win[2] - win[0], H = win[3] - win[1]
  if (W < 6 || H < 6) return null
  const pix = (x, y) => {
    const i = (y * img.width + x) * 4
    const a = img.data[i + 3] / 255
    const r = img.data[i] * a + 255 * (1 - a), g = img.data[i + 1] * a + 255 * (1 - a), b = img.data[i + 2] * a + 255 * (1 - a)
    return [0.299 * r + 0.587 * g + 0.114 * b, r - (g + b) / 2, a]
  }
  // 肤色：估计点上方 0.25~0.4 个眼距（鼻子和嘴之间的脸颊）的中位数
  const skinL = [], skinR = []
  for (let y = Math.round(gy - d * 0.42); y < Math.round(gy - d * 0.22); y++) {
    for (let x = Math.round(gx - d * 0.25); x < Math.round(gx + d * 0.25); x++) {
      if (x < 0 || y < 0 || x >= img.width || y >= img.height) continue
      const [L, R, A] = pix(x, y)
      if (A > 0.9) { skinL.push(L); skinR.push(R) }
    }
  }
  if (skinL.length < 10) return null
  const median = v => v.sort((p, q) => p - q)[v.length >> 1]
  const sL = median(skinL), sR = median(skinR)
  const score = new Float32Array(W * H)
  let max = 0
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const [L, R, A] = pix(win[0] + x, win[1] + y)
      const s = A < 0.5 ? 0 : Math.max(0, sL - L - 18) + Math.max(0, R - sR - 12) * 1.5
      score[y * W + x] = s
      // 门槛只看中间那一段（两边可能是头发、手，比嘴黑得多）
      if (s > max && Math.abs(win[0] + x - gx) < d * 0.25) max = s
    }
  }
  if (max < 25) return null
  // 连通块：分数过最高值的 30% 的像素，四连通
  const on = score.map(s => (s >= max * 0.3 ? 1 : 0))
  const seen = new Uint8Array(W * H)
  const blobs = []
  for (let start = 0; start < W * H; start++) {
    if (!on[start] || seen[start]) continue
    const stack = [start]
    seen[start] = 1
    let x0 = W, y0 = H, x1 = 0, y1 = 0, mass = 0, n = 0, sx = 0, sy = 0
    while (stack.length) {
      const k = stack.pop()
      const x = k % W, y = (k - x) / W
      x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y)
      mass += score[k]; n++; sx += x; sy += y
      for (const nb of [k - 1, k + 1, k - W, k + W]) {
        if (nb < 0 || nb >= W * H || seen[nb] || !on[nb]) continue
        if ((nb === k - 1 && x === 0) || (nb === k + 1 && x === W - 1)) continue
        seen[nb] = 1
        stack.push(nb)
      }
    }
    if (n < 4) continue
    const bw = x1 - x0 + 1, bh = y1 - y0 + 1
    // 碰到窗口边的是脸的轮廓、下巴、头发、手，不是嘴；嘴（大笑时）也不会比 0.95 个眼距还宽、比 0.7 个眼距还高
    if (x0 === 0 || y0 === 0 || x1 === W - 1 || y1 === H - 1) continue
    if (bw > d * 0.95 || bh > d * 0.7 || bh > bw * 1.6) continue
    const ox = (win[0] + sx / n - gx) / d, oy = (win[1] + sy / n - gy) / d
    if (Math.abs(ox) > 0.4) continue
    // 像不像嘴：分量（mass）× 横着长 × 靠中间 × 高度合适（估计点略往下一点最像）
    const value = mass * Math.min(2.5, bw / bh) * Math.exp(-((ox / 0.18) ** 2) / 2) * Math.exp(-(((oy - 0.12) / 0.24) ** 2) / 2)
    blobs.push({ box: [win[0] + x0, win[1] + y0, win[0] + x1 + 1, win[1] + y1 + 1], value })
  }
  if (!blobs.length) return null
  blobs.sort((a, b) => b.value - a.value)
  // 挨着最像的那团（左右 0.15、上下 0.12 个眼距以内）的几块合起来：张开的嘴里有牙、舌头，会断成几块
  let box = blobs[0].box
  for (const b of blobs.slice(1)) {
    const near = b.box[0] < box[2] + d * 0.15 && b.box[2] > box[0] - d * 0.15 && b.box[1] < box[3] + d * 0.12 && b.box[3] > box[1] - d * 0.12
    const merged = [Math.min(box[0], b.box[0]), Math.min(box[1], b.box[1]), Math.max(box[2], b.box[2]), Math.max(box[3], b.box[3])]
    if (near && b.value > blobs[0].value * 0.05 && merged[2] - merged[0] <= d * 0.95 && merged[3] - merged[1] <= d * 0.7) box = merged
  }
  return box
}

/**
 * 眼睛、嘴的框（交给工作台的）：认出的眼睛框往外放一点（睫毛、眉下的阴影都要重画进去），
 * 嘴框给张嘴留出地方（闭着的嘴只是一条线，张开要更高）。都夹在图里。
 */
export function framesFrom({ eyes, mouth, d }, width, height) {
  const eyeBoxes = eyes.map(e => {
    const [cx, cy] = center(e)
    const w = Math.max((e[2] - e[0]) * 1.25, d * 0.55), h = Math.max((e[3] - e[1]) * 1.3, d * 0.42)
    return clampBox(at([cx, cy], w, h), width, height)
  })
  const [mx, my] = center(mouth)
  const fh = mouth[3] - mouth[1]
  const mw = Math.max(mouth[2] - mouth[0] + d * 0.15, d * 0.45), mh = Math.max(fh + d * 0.14, d * 0.28)
  // 嘴张开主要往下长：多出来的高度大半放在下面
  let mouthBox = at([mx, my + (mh - fh) * 0.2], mw, mh)
  // 别跟眼睛框叠上
  const eyeBottom = Math.max(...eyeBoxes.map(e => e[3]))
  if (mouthBox[1] < eyeBottom + 2) mouthBox = [mouthBox[0], eyeBottom + 2, mouthBox[2], Math.max(eyeBottom + 10, mouthBox[3])]
  return { eyes: eyeBoxes, mouth: [clampBox(mouthBox, width, height)] }
}

/** 以 b 为中心的正方形取景，边长 = b 的长边 × k（可以超出图，超出的地方垫白）。 */
export const squareAround = (b, k) => at(center(b), Math.max(b[2] - b[0], b[3] - b[1]) * k, Math.max(b[2] - b[0], b[3] - b[1]) * k)

/**
 * 整理大模型（Florence-2 找词）的结果。list 是 [{ label, box }]（原图坐标），view 是这次给它看的那一块。
 * 它找不到时会把整块取景框给你，这种丢掉；眼睛和嘴的框也不会占取景的一半以上。
 * 「eyes」可能是一个两眼合起来的框加两只单独的，也可能只有合起来的那个：有两只单独的用单独的，只有合起来的从中间劈开。
 * 回 { face, eyes: [左, 右] | [一只] | [], mouths: [框…] }。
 */
export function readGrounding(list, view) {
  const vw = view[2] - view[0], vh = view[3] - view[1]
  const whole = b => b[2] - b[0] > vw * 0.97 && b[3] - b[1] > vh * 0.97
  const small = b => area(b) < vw * vh * 0.5
  const of = re => list.filter(g => re.test(g.label) && !whole(g.box)).map(g => g.box)
  const faces = of(/face|head/i)
  const eyeBoxes = of(/eye/i).filter(small)
  const singles = eyeBoxes.filter(b => !eyeBoxes.some(o => o !== b && o[0] >= b[0] - 2 && o[2] <= b[2] + 2 && o[1] >= b[1] - 2 && o[3] <= b[3] + 2))
  let eyes = []
  if (singles.length >= 2) {
    const [a, b] = [...singles].sort((p, q) => area(q) - area(p))
    eyes = iou(a, b) > 0.3 ? [a] : [a, b].sort((p, q) => p[0] - q[0])
  } else if (singles.length === 1) eyes = [singles[0]]
  // 一个又扁又宽的框是两只眼睛合起来的：从中间劈开，各让出一点中缝
  if (eyes.length === 1 && eyes[0][2] - eyes[0][0] > (eyes[0][3] - eyes[0][1]) * 2.2) {
    const [x0, y0, x1, y1] = eyes[0]
    const cx = (x0 + x1) / 2, gap = (x1 - x0) * 0.06
    eyes = [[x0, y0, cx - gap, y1], [cx + gap, y0, x1, y1]]
  }
  return { face: faces.sort((p, q) => area(q) - area(p))[0] || null, eyes, mouths: of(/mouth|lip/i).filter(small) }
}

/** 大模型给的嘴合不合理：在两眼连线下方 0.3~1.6 个眼距、左右偏不过 0.55 个眼距、不比 2 个眼距宽（兽头的长吻能有 1.7 个眼距宽）。 */
export function plausibleMouth(m, eyes) {
  const [a, b] = eyes.map(center)
  const d = Math.hypot(b[0] - a[0], b[1] - a[1])
  if (!(d > 0)) return false
  const tx = (b[0] - a[0]) / d, ty = (b[1] - a[1]) / d
  let nx = -ty, ny = tx
  if (ny < 0) { nx = -nx; ny = -ny }
  const [mx, my] = center(m)
  const vx = mx - (a[0] + b[0]) / 2, vy = my - (a[1] + b[1]) / 2
  const down = vx * nx + vy * ny, side = vx * tx + vy * ty
  return down >= d * 0.3 && down <= d * 1.6 && Math.abs(side) <= d * 0.55 && m[2] - m[0] <= d * 2 && m[3] - m[1] <= d * 1.4
}

/**
 * 一张立绘的自动框。
 *   run(model, box, size)：跑一个小模型（'face' | 'head' | 'eye'）认图上 box 这一块，回 [{ box, score }]（原图坐标）。
 *   ground(view, phrase)：可选，大模型（Florence-2）在 view 这块里找 phrase 说的东西，回 [{ label, box }]（原图坐标）。
 *   fine：精细模式，每张都让大模型找眼睛和嘴；不开时只在小模型没把握（没认准脸、眼睛不全）时才用它。
 * 回 { rects, confidence: 'high' | 'mid' | 'low', notes: [说明…], face, big: 用没用大模型 }；完全找不到脸回 null。
 */
export async function autoFrame(img, run, { ground = null, fine = false } = {}) {
  const notes = []
  const W = img.width, H = img.height
  const whole = [0, 0, W, H]
  const pct = s => Math.round(s * 100) + '%'
  let face = null, faceScore = 0, view = null, big = false
  const f = mainFace(await run('face', whole, fitSize(W, H)), W, H)
  if (f && f.score >= 0.5) { face = f.box; faceScore = f.score; notes.push(`认到脸（把握 ${pct(f.score)}）`) }
  else {
    // 小模型没认准：看看头在哪；有大模型就让它在头附近（没有头就在上半身正中）找脸，兽头它也认得
    const h = mainFace(await run('head', whole, fitSize(W, H)), W, H)
    if (ground) {
      const look = h ? squareAround(h.box, 1.4) : [W * 0.2, 0, W * 0.8, W * 0.6]
      const g = readGrounding(await ground(look, 'face'), look)
      big = true
      if (g.face) { face = g.face; faceScore = 0.6; view = squareAround(g.face, 1.1); notes.push('大模型找到了脸') }
    }
    if (!face && h) { face = faceFromHead(h.box); faceScore = h.score * 0.7; notes.push(`没认准脸，按头的位置估（把握 ${pct(h.score)}）`) }
    if (!face && f) { face = f.box; faceScore = f.score; notes.push(`认到脸，但把握不大（${pct(f.score)}）`) }
    if (!face) return null
  }
  // 小模型找眼睛：在脸附近裁一块放大了认（立绘里眼睛很小，整张图缩到 640 后只剩几个像素）
  const around = clampBox(grow(face, 1.6, 1.5), W, H)
  const crop = fitSize(around[2] - around[0], around[3] - around[1], 640, 32, 384)
  const eyes = pickEyes(await run('eye', around, crop), face)
  // 大模型找眼睛和嘴：精细模式每张都找；不然只在脸没认准、眼睛不全时找
  let g = null
  if (ground && (fine || faceScore < 0.5 || eyes.length < 2 || view)) {
    const v = view || squareAround(face, 1.5)
    g = readGrounding(await ground(v, 'eyes and mouth'), v)
    big = true
  }
  let eyeBoxes
  let confidence = faceScore >= 0.5 ? 'high' : 'mid'
  if (eyes.length === 2) { eyeBoxes = eyes.map(e => e.box); notes.push('认到两只眼睛') }
  else if (g && g.eyes.length === 2) { eyeBoxes = g.eyes; notes.push('大模型认到两只眼睛') }
  else if (eyes.length === 1 || (g && g.eyes.length === 1)) {
    eyeBoxes = eyesFromFace(face, eyes.length === 1 ? eyes[0].box : g.eyes[0])
    confidence = 'mid'
    notes.push('只认到一只眼睛，另一只按脸对称估')
  } else { eyeBoxes = eyesFromFace(face); confidence = 'low'; notes.push('没认出眼睛，按脸的比例估') }
  const guess = mouthGuess(eyeBoxes)
  // 嘴：大模型找到的（合理的话）最准，张大的嘴、兽头都行；其次在图上按颜色找；都没有就按眼睛的位置估
  const bigMouth = g ? g.mouths.find(m => plausibleMouth(m, eyeBoxes)) : null
  const found = findMouth(img, guess, face[3])
  let mouth
  if (bigMouth) {
    mouth = bigMouth
    // 大模型有时把兽脸的整个口鼻部当成嘴：框里按颜色找到了一条闭着的嘴线（扁扁一条），就把框的上边收到嘴线上方一点
    // （鼻子不重画），下面照旧留给张嘴。张着的嘴颜色上会断成几块，不收，免得切掉上半张嘴。
    const fc = found && center(found)
    const line = found && found[3] - found[1] < guess.d * 0.12 && found[2] - found[0] > (found[3] - found[1]) * 2
    if (line && fc[0] > bigMouth[0] && fc[0] < bigMouth[2] && fc[1] > bigMouth[1] && fc[1] < bigMouth[3]) mouth = [bigMouth[0], Math.max(bigMouth[1], found[1] - guess.d * 0.1), bigMouth[2], bigMouth[3]]
    notes.push('大模型找到了嘴')
  }
  else if (found) { mouth = found; notes.push('嘴在图上找到了') }
  else {
    // 没找到：框大一点、略往下，二次元脸和写实些的脸的嘴都能框进去
    mouth = at([guess.center[0], guess.center[1] + guess.d * 0.1], guess.d * 0.4, guess.d * 0.3)
    if (confidence === 'high') confidence = 'mid'
    notes.push('嘴没找到明显的线条，按眼睛的位置估')
  }
  return { rects: framesFrom({ eyes: eyeBoxes, mouth, d: guess.d }, W, H), confidence, notes, face, big }
}

/** 灰度图（透明处垫白）：每 step×step 个像素取平均，给模板匹配用。回 { width, height, data: Float32Array }。 */
export function grayOf(img, step = 1) {
  const w = Math.floor(img.width / step), h = Math.floor(img.height / step)
  const data = new Float32Array(w * h)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sum = 0
      for (let j = 0; j < step; j++) {
        for (let i = 0; i < step; i++) {
          const k = ((y * step + j) * img.width + x * step + i) * 4
          const a = img.data[k + 3] / 255
          sum += (0.299 * img.data[k] + 0.587 * img.data[k + 1] + 0.114 * img.data[k + 2]) * a + 255 * (1 - a)
        }
      }
      data[y * w + x] = sum / (step * step)
    }
  }
  return { width: w, height: h, data }
}

/** 从灰度图上按比例 scale 取一块（双线性），左上角 (x, y)、宽高 w×h（取样后的尺寸）。 */
function sample(g, x, y, w, h, scale) {
  const out = new Float32Array(w * h)
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const fx = Math.min(g.width - 1.001, Math.max(0, x + i * scale)), fy = Math.min(g.height - 1.001, Math.max(0, y + j * scale))
      const x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0
      const a = g.data[y0 * g.width + x0], b = g.data[y0 * g.width + x0 + 1], c = g.data[(y0 + 1) * g.width + x0], d = g.data[(y0 + 1) * g.width + x0 + 1]
      out[j * w + i] = (a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty
    }
  }
  return out
}

/** 模板 t（tw×th，已减均值，norm 是它的平方和开方）和图 g 上左上角 (x, y) 那一块的归一化互相关，-1~1。 */
function ncc(t, tw, th, norm, g, x, y) {
  let sum = 0, sq = 0, dot = 0
  for (let j = 0; j < th; j++) {
    const row = (y + j) * g.width + x
    for (let i = 0; i < tw; i++) {
      const v = g.data[row + i]
      sum += v; sq += v * v; dot += v * t[j * tw + i]
    }
  }
  const n = tw * th
  const varP = sq - (sum * sum) / n
  return varP <= 1e-6 || norm <= 1e-6 ? 0 : dot / (norm * Math.sqrt(varP))
}

function zeroMean(t) {
  let mean = 0
  for (const v of t) mean += v
  mean /= t.length
  let norm = 0
  for (let k = 0; k < t.length; k++) { t[k] -= mean; norm += t[k] * t[k] }
  return Math.sqrt(norm)
}

/**
 * 同一个角色的另一张差分：在 img 里找参考图 ref 上框好的那张脸（眼睛和嘴的外接框往外扩一圈当模板），
 * 用归一化互相关匹配——先缩小了粗找（左右各 20%、上下各 12% 的范围，大小 ±10%），再在原尺寸附近细找。
 * 不靠认脸模型，什么画风都行（furry、写实、Q 版）；同一角色的差分构图一样，脸只会挪一点。
 * 回 { rects, score }：rects 是挪过去的框，score 是相似度（0~1，0.75 以上基本就是同一张脸）。
 */
export function followFrame(ref, refRects, img) {
  const boxes = [...refRects.eyes, ...refRects.mouth]
  const inner = [Math.min(...boxes.map(b => b[0])), Math.min(...boxes.map(b => b[1])), Math.max(...boxes.map(b => b[2])), Math.max(...boxes.map(b => b[3]))]
  const T = clampBox(grow(inner, 1.7, 1.9).map(Math.round), ref.width, ref.height)
  const Tw = T[2] - T[0], Th = T[3] - T[1]
  // 粗找：缩到模板约 48 像素宽。模板的左上角对齐到格子上（不然取样错开半格，同一张脸也比不像）
  const step = Math.max(1, Math.round(Tw / 48))
  const gRef = grayOf(ref, step), gImg = grayOf(img, step)
  const ox = Math.round(T[0] / step), oy = Math.round(T[1] / step)
  const tw = Math.max(4, Math.floor(Tw / step)), th = Math.max(4, Math.floor(Th / step))
  const rx = Math.round((img.width * 0.2) / step), ry = Math.round((img.height * 0.12) / step)
  let best = null
  for (const scale of [0.9, 1, 1.1]) {
    // 目标图里的脸是参考的 scale 倍大：参考那块按 1/scale 的间隔取样，跟目标图同样的格子比
    const sw = Math.max(4, Math.round(tw * scale)), sh = Math.max(4, Math.round(th * scale))
    const t = sample(gRef, ox, oy, sw, sh, 1 / scale)
    const norm = zeroMean(t)
    const cx = ox + (tw - sw) / 2, cy = oy + (th - sh) / 2
    for (let dy = -ry; dy <= ry; dy++) {
      for (let dx = -rx; dx <= rx; dx++) {
        const x = Math.round(cx + dx), y = Math.round(cy + dy)
        if (x < 0 || y < 0 || x + sw > gImg.width || y + sh > gImg.height) continue
        const s = ncc(t, sw, sh, norm, gImg, x, y)
        if (!best || s > best.score) best = { score: s, x, y, scale }
      }
    }
  }
  if (!best) return { rects: refRects, score: 0 }
  // 找到的位置：参考图上的 origin 对到目标图的 at（都是原图像素）
  let origin = [ox * step, oy * step], at = [best.x * step, best.y * step], score = best.score
  if (step > 1) {
    // 细找：在粗找结果附近 ±step 像素，模板缩到不超过 96 像素宽，免得太慢
    const k = Math.max(1, Math.round(Tw / 96))
    const fx = Math.round(T[0] / k), fy = Math.round(T[1] / k)
    const fw = Math.max(4, Math.floor((Tw * best.scale) / k)), fh = Math.max(4, Math.floor((Th * best.scale) / k))
    const t = sample(grayOf(ref, k), fx, fy, fw, fh, 1 / best.scale)
    const norm = zeroMean(t)
    const target = grayOf(img, k)
    // 粗找的结果换到细格子上：参考的 (fx·k, fy·k) 在目标图里应该在哪
    const gx = (best.x * step + (fx * k - origin[0]) * best.scale) / k, gy = (best.y * step + (fy * k - origin[1]) * best.scale) / k
    const r = Math.ceil(step / k) + 1
    let top = null
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const x = Math.round(gx + dx), y = Math.round(gy + dy)
        if (x < 0 || y < 0 || x + fw > target.width || y + fh > target.height) continue
        const s = ncc(t, fw, fh, norm, target, x, y)
        if (!top || s > top.score) top = { score: s, x, y }
      }
    }
    if (top) { origin = [fx * k, fy * k]; at = [top.x * k, top.y * k]; score = top.score }
  }
  const map = b => clampBox([at[0] + (b[0] - origin[0]) * best.scale, at[1] + (b[1] - origin[1]) * best.scale, at[0] + (b[2] - origin[0]) * best.scale, at[1] + (b[3] - origin[1]) * best.scale], img.width, img.height)
  return { rects: { eyes: refRects.eyes.map(map), mouth: refRects.mouth.map(map) }, score: Math.max(0, Math.min(1, score)) }
}
