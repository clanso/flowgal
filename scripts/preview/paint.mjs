// 预览用的占位插画：按提示词关键词程序化画一张风景 PNG（琴房、竹林萤火、雨夜街道、旧校舍走廊、黄昏天台）。
// 只给预览和截图用，不随插件发布；真实使用时这里是生图渠道出的图。
import { deflateSync, crc32 } from 'node:zlib'

const W = 1216
const H = 832

function rng(seed) {
  let s = seed >>> 0
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 }
}
const hex = c => [parseInt(c.slice(1, 3), 16) / 255, parseInt(c.slice(3, 5), 16) / 255, parseInt(c.slice(5, 7), 16) / 255]
const clamp = v => (v < 0 ? 0 : v > 1 ? 1 : v)
const smooth = t => t * t * (3 - 2 * t)

/** 一维平滑噪声，用来画山脊、楼顶、云。 */
function noise(seed) {
  const r = rng(seed)
  const table = Array.from({ length: 256 }, r)
  return x => {
    const i = Math.floor(x), f = smooth(x - i)
    return table[i & 255] * (1 - f) + table[(i + 1) & 255] * f
  }
}

function canvas() {
  const px = new Float32Array(W * H * 3)
  const at = (x, y) => (y * W + x) * 3
  return {
    px,
    /** 竖直渐变：stops = [[位置 0~1, '#rrggbb'], ...] */
    gradient(stops) {
      const cs = stops.map(([p, c]) => [p, hex(c)])
      for (let y = 0; y < H; y++) {
        const t = y / (H - 1)
        let k = 0
        while (k < cs.length - 2 && t > cs[k + 1][0]) k++
        const [p0, c0] = cs[k], [p1, c1] = cs[k + 1]
        const f = smooth(clamp((t - p0) / (p1 - p0 || 1)))
        for (let x = 0; x < W; x++) { const i = at(x, y); for (let ch = 0; ch < 3; ch++) px[i + ch] = c0[ch] + (c1[ch] - c0[ch]) * f }
      }
    },
    /** 柔光点：加色混合，半径外按指数衰减。 */
    glow(cx, cy, r, color, strength = 1) {
      const c = hex(color)
      const reach = r * 3
      for (let y = Math.max(0, Math.floor(cy - reach)); y < Math.min(H, cy + reach); y++) {
        for (let x = Math.max(0, Math.floor(cx - reach)); x < Math.min(W, cx + reach); x++) {
          const d = Math.hypot(x - cx, y - cy) / r
          const k = strength * Math.exp(-d * d * 1.6)
          if (k < 0.003) continue
          const i = at(x, y)
          for (let ch = 0; ch < 3; ch++) px[i + ch] += c[ch] * k
        }
      }
    },
    /** 按函数填色：fn(x, y) 返回 [颜色, 不透明度] 或 null。 */
    paint(fn) {
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const hit = fn(x, y)
        if (!hit) continue
        const [c, a] = hit
        const i = at(x, y)
        for (let ch = 0; ch < 3; ch++) px[i + ch] = px[i + ch] * (1 - a) + c[ch] * a
      }
    },
    rect(x0, y0, x1, y1, color, alpha = 1) {
      const c = hex(color)
      for (let y = Math.max(0, Math.round(y0)); y < Math.min(H, Math.round(y1)); y++)
        for (let x = Math.max(0, Math.round(x0)); x < Math.min(W, Math.round(x1)); x++) {
          const i = at(x, y)
          for (let ch = 0; ch < 3; ch++) px[i + ch] = px[i + ch] * (1 - alpha) + c[ch] * alpha
        }
    },
    /** 斜线（雨丝、光柱的边）：加色。 */
    streak(x0, y0, len, angle, color, strength) {
      const c = hex(color)
      const dx = Math.sin(angle), dy = Math.cos(angle)
      for (let s = 0; s < len; s++) {
        const x = Math.round(x0 + dx * s), y = Math.round(y0 + dy * s)
        if (x < 0 || y < 0 || x >= W || y >= H) continue
        const k = strength * Math.sin((s / len) * Math.PI)
        const i = at(x, y)
        for (let ch = 0; ch < 3; ch++) px[i + ch] += c[ch] * k
      }
    },
    /** 暗角 + 轻微颗粒，让占位图看起来像一张画。 */
    finish(seed) {
      const r = rng(seed)
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const dx = x / W - 0.5, dy = y / H - 0.5
        const v = 1 - 0.55 * (dx * dx + dy * dy) * 1.8
        const g = (r() - 0.5) * 0.025
        const i = at(x, y)
        for (let ch = 0; ch < 3; ch++) px[i + ch] = px[i + ch] * v + g
      }
    },
    png() {
      const raw = Buffer.alloc((W * 3 + 1) * H)
      for (let y = 0; y < H; y++) {
        raw[y * (W * 3 + 1)] = 0
        for (let x = 0; x < W * 3; x++) {
          const v = px[y * W * 3 + x]
          raw[y * (W * 3 + 1) + 1 + x] = Math.round(255 * Math.pow(clamp(v), 1 / 1.05))
        }
      }
      const chunk = (type, data) => {
        const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
        const body = Buffer.concat([Buffer.from(type), data])
        const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body) >>> 0)
        return Buffer.concat([len, body, crc])
      }
      const ihdr = Buffer.alloc(13)
      ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 2
      return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 6 })), chunk('IEND', Buffer.alloc(0))])
    },
  }
}

/** 午后琴房：暖色墙面、右侧大窗、斜射的光柱和浮尘、三角钢琴剪影。 */
function musicRoom(c, r) {
  c.gradient([[0, '#2a170f'], [0.45, '#8a5230'], [0.7, '#4a2a18'], [0.72, '#2b1810'], [1, '#170c07']])
  const wx0 = W * 0.62, wx1 = W * 0.93, wy0 = H * 0.1, wy1 = H * 0.62
  c.rect(wx0 - 10, wy0 - 10, wx1 + 10, wy1 + 10, '#3a2214')
  c.paint((x, y) => (x > wx0 && x < wx1 && y > wy0 && y < wy1 ? [hex('#ffe9bf'), 0.92 - (y - wy0) / (wy1 - wy0) * 0.25] : null))
  for (const f of [0.25, 0.5, 0.75]) c.rect(wx0 + (wx1 - wx0) * f - 4, wy0, wx0 + (wx1 - wx0) * f + 4, wy1, '#3a2214')
  c.rect(wx0, wy0 + (wy1 - wy0) * 0.45 - 4, wx1, wy0 + (wy1 - wy0) * 0.45 + 4, '#3a2214')
  // 光柱：从窗口往左下打到地板上。
  const warm = hex('#ffd9a0')
  c.paint((x, y) => {
    if (y < wy0) return null
    const u = (x - wx0 + (y - wy0) * 0.9) / (wx1 - wx0)
    if (u < 0 || u > 1) return null
    const band = Math.sin(u * Math.PI) * (0.22 + 0.1 * Math.sin(u * 19))
    return [warm, band * clamp(1 - (y - wy0) / (H * 0.95))]
  })
  // 地板上的光斑。
  c.paint((x, y) => {
    if (y < H * 0.72) return null
    const u = (x - wx0 + (y - wy0) * 0.9) / (wx1 - wx0)
    return u > 0.05 && u < 0.95 ? [hex('#f7c98a'), 0.35] : null
  })
  // 三角钢琴：琴身、掀起的琴盖、琴腿。
  const black = hex('#0b0706')
  c.paint((x, y) => {
    const bx0 = W * 0.12, bx1 = W * 0.56, top = H * 0.56, bottom = H * 0.66
    const curve = bx1 - Math.max(0, (y - top) / (bottom - top)) * 30
    if (y > top && y < bottom && x > bx0 && x < curve) return [black, 1]
    const lidT = (x - bx0) / (bx1 - bx0)
    const lidY = top - lidT * H * 0.2
    if (lidT > 0.02 && lidT < 1 && y > lidY - 5 && y < lidY + 7) return [black, 0.96]
    if (Math.abs(x - (W * 0.42 + (top - y) * 0.25)) < 3 && y < top && y > top - H * 0.13) return [black, 1]
    if (y >= bottom && y < H * 0.8 && [0.16, 0.5].some(f => Math.abs(x - W * f) < 7)) return [black, 1]
    return null
  })
  c.glow(W * 0.33, H * 0.555, 160, '#ffcf8a', 0.18)
  for (let i = 0; i < 140; i++) {
    const x = wx0 - r() * W * 0.55, y = wy0 + r() * H * 0.6
    c.glow(x, y, 1.5 + r() * 3, '#fff1cc', 0.25 + r() * 0.5)
  }
}

/** 黄昏竹林：紫橙天色、远山、竹竿剪影、小路、萤火。 */
function bambooDusk(c, r) {
  c.gradient([[0, '#140c2e'], [0.35, '#4b2f6b'], [0.58, '#d4826a'], [0.66, '#3a2a40'], [1, '#0c0f12']])
  const hill = noise(7)
  c.paint((x, y) => (y > H * (0.5 + hill(x / 140) * 0.1) ? [hex('#2a2238'), 0.85] : null))
  for (let i = 0; i < 26; i++) {
    const x0 = r() * W, w = 10 + r() * 22, shade = 0.04 + r() * 0.08
    const col = [shade * 0.6, shade * 1.6 + 0.02, shade]
    const lean = (r() - 0.5) * 0.06
    c.paint((x, y) => {
      const cx = x0 + (H - y) * lean
      if (Math.abs(x - cx) > w / 2) return null
      const node = (y + i * 37) % 120 < 4 ? 0.6 : 1
      const edge = 1 - Math.abs(x - cx) / (w / 2) * 0.35
      return [col.map(v => v * edge * node), 1]
    })
  }
  c.paint((x, y) => {
    if (y < H * 0.72) return null
    const t = (y - H * 0.72) / (H * 0.28)
    const half = 40 + t * W * 0.32
    return Math.abs(x - W * 0.5) < half ? [hex('#3a3346'), 0.7] : null
  })
  for (let i = 0; i < 150; i++) {
    const x = r() * W, y = H * 0.25 + r() * H * 0.7
    const s = 2 + r() * 4
    c.glow(x, y, s * 3, '#c8ff6a', 0.18)
    c.glow(x, y, s, '#f4ffb0', 0.9)
  }
}

/** 雨夜街道：楼宇剪影和窗灯、霓虹招牌、湿地面倒影、雨丝。 */
function rainyStreet(c, r) {
  c.gradient([[0, '#05060f'], [0.5, '#151a33'], [0.62, '#0c0d18'], [1, '#05060a']])
  const roof = noise(21)
  const horizon = H * 0.62
  c.paint((x, y) => {
    const h = H * (0.18 + roof(Math.floor(x / 70) * 0.9) * 0.3)
    return y > h && y < horizon ? [hex('#0a0b14'), 1] : null
  })
  for (let i = 0; i < 260; i++) {
    const x = r() * W, y = H * 0.2 + r() * (horizon - H * 0.22)
    if (r() < 0.55) c.rect(x, y, x + 6, y + 9, r() < 0.7 ? '#ffcf7a' : '#9fd8ff', 0.55 + r() * 0.4)
  }
  const neon = ['#ff3d8b', '#33e1ff', '#ffb13d', '#b06bff', '#3dff9e']
  const signs = []
  for (let i = 0; i < 9; i++) {
    const x = r() * W * 0.95, y = H * 0.28 + r() * H * 0.26, w = 40 + r() * 120, h = 14 + r() * 40, col = neon[i % neon.length]
    signs.push([x, y, w, h, col])
    c.glow(x + w / 2, y + h / 2, Math.max(w, h) * 0.9, col, 0.35)
    c.rect(x, y, x + w, y + h, col, 0.85)
  }
  // 湿地面：霓虹往下拉长的倒影。
  for (const [x, y, w, , col] of signs) {
    for (let k = 0; k < 7; k++) c.glow(x + w / 2 + (r() - 0.5) * 10, horizon + (horizon - y) * (0.2 + k * 0.14), w * 0.35, col, 0.16)
  }
  c.paint((x, y) => (y > horizon && y < horizon + 3 ? [hex('#2b3350'), 0.8] : null))
  for (let i = 0; i < 900; i++) c.streak(r() * W * 1.2 - W * 0.1, r() * H, 18 + r() * 40, -0.22, '#a9c6ff', 0.12 + r() * 0.12)
}

/** 旧校舍走廊：一点透视的走廊、左侧窗户透进的夕光、浮尘。 */
function corridor(c, r) {
  c.gradient([[0, '#1a1210'], [0.5, '#3a2a22'], [1, '#120c0a']])
  const vx = W * 0.56, vy = H * 0.46
  const end = { x0: vx - W * 0.08, x1: vx + W * 0.08, y0: vy - H * 0.12, y1: vy + H * 0.1 }
  c.rect(end.x0, end.y0, end.x1, end.y1, '#e0a066', 0.9)
  c.glow(vx, vy, 140, '#ffb070', 0.35)
  c.paint((x, y) => {
    // 地板与天花板：按到消失点的比例上色，越远越亮。
    if (y > end.y1) { const t = (y - end.y1) / (H - end.y1); const k = 0.25 + (1 - t) * 0.35; return [[0.32 * k + 0.05, 0.22 * k + 0.04, 0.16 * k + 0.03], 1] }
    if (y < end.y0) { const t = (end.y0 - y) / end.y0; const k = 0.2 + (1 - t) * 0.25; return [[0.2 * k + 0.03, 0.15 * k + 0.03, 0.12 * k + 0.03], 1] }
    return null
  })
  // 左墙的窗：越近越大的梯形光块。
  for (let i = 0; i < 5; i++) {
    const t0 = 0.08 + i * 0.17, t1 = t0 + 0.1
    const xA = t0 * (end.x0), xB = t1 * (end.x0)
    c.paint((x, y) => {
      if (x < xA || x > xB) return null
      const t = 1 - x / end.x0
      const top = end.y0 - t * (end.y0 - H * 0.02) * 0.85, bottom = end.y1 + t * (H - end.y1) * 0.35
      return y > top && y < bottom ? [hex('#ffb877'), 0.55 + 0.1 * i] : null
    })
  }
  for (let i = 0; i < 110; i++) c.glow(r() * W * 0.7, H * 0.15 + r() * H * 0.6, 1.5 + r() * 2.5, '#ffe2b8', 0.4 + r() * 0.4)
}

/** 黄昏天台：晚霞、落日、城市天际线、近处的铁丝网。 */
function rooftop(c, r) {
  c.gradient([[0, '#2b1b4d'], [0.3, '#8a3f6e'], [0.52, '#ff9a5c'], [0.6, '#ffd59a'], [0.62, '#3b2438'], [1, '#160d18']])
  c.glow(W * 0.62, H * 0.56, 70, '#fff2c8', 1)
  c.glow(W * 0.62, H * 0.56, 260, '#ff9a5c', 0.35)
  const cloud = noise(3)
  c.paint((x, y) => {
    if (y > H * 0.5) return null
    const row = Math.floor(y / 22)
    const v = cloud(x / 260 + row * 7.3) - 0.55
    return v > 0 ? [hex('#ffb28a'), Math.min(0.45, v * 1.6) * Math.sin(((y % 22) / 22) * Math.PI) * (y / H + 0.3)] : null
  })
  const roof = noise(11)
  c.paint((x, y) => {
    const h = H * (0.47 + roof(Math.floor(x / 46) * 1.3) * 0.12)
    return y > h && y < H * 0.72 ? [hex('#24142a'), 1] : null
  })
  c.paint((x, y) => (y > H * 0.72 ? [hex('#1a1016'), 1] : null))
  c.paint((x, y) => {
    if (y < H * 0.55 || y > H * 0.8) return null
    const a = (x + y) % 46, b = (x - y + 4000) % 46
    return a < 2 || b < 2 || Math.abs(y - H * 0.55) < 3 ? [hex('#120a10'), 0.75] : null
  })
}

const SCENES = [
  [/firefl|bamboo/, bambooDusk],
  [/piano|music room/, musicRoom],
  [/street|rain/, rainyStreet],
  [/corridor|abandoned|hallway/, corridor],
]

/** 按提示词挑一个场景画，同样的提示词画出同样的图。 */
export function paintPlaceholder(prompt) {
  const text = String(prompt || '').toLowerCase()
  let seed = 0
  for (const ch of text) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0
  const draw = (SCENES.find(([re]) => re.test(text)) || [, rooftop])[1]
  const c = canvas()
  draw(c, rng(seed || 1))
  c.finish(seed)
  return c.png()
}
