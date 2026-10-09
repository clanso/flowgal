// 预览用的占位立绘：按提示词程序化画一张透明底的半身像 PNG（832×1216）。
// 发色、瞳色、发型、衣服（校服 / 开衫 / 大衣围巾 / 睡衣）和表情（笑、害羞脸红、哭、生气、惊讶、思考托腮……）都从 tag 里读。
// 只给预览和截图看差分效果，不随插件发布；真实使用时这里是生图渠道按立绘设计师写的词画的图。
import { deflateSync, crc32 } from 'node:zlib'

const W = 832
const H = 1216
const CX = W / 2
const TILE = 16
const hex = c => [parseInt(c.slice(1, 3), 16) / 255, parseInt(c.slice(3, 5), 16) / 255, parseInt(c.slice(5, 7), 16) / 255]
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t)
const clamp = v => (v < 0 ? 0 : v > 1 ? 1 : v)

// ───── 有向距离（负数在里面） ─────
const ellipse = (cx, cy, rx, ry) => (x, y) => { const dx = (x - cx) / rx, dy = (y - cy) / ry; return (Math.sqrt(dx * dx + dy * dy) - 1) * Math.min(rx, ry) }
function segment(ax, ay, bx, by, r) {
  return (x, y) => {
    const px = x - ax, py = y - ay, vx = bx - ax, vy = by - ay
    const t = clamp((px * vx + py * vy) / (vx * vx + vy * vy || 1))
    return Math.hypot(px - vx * t, py - vy * t) - r
  }
}
/** 二次曲线描边（嘴、眉、闭着的眼睛）：拆成几段线段。 */
function curve(ax, ay, cx, cy, bx, by, r) {
  const pts = []
  for (let i = 0; i <= 10; i++) { const t = i / 10; pts.push([(1 - t) ** 2 * ax + 2 * (1 - t) * t * cx + t * t * bx, (1 - t) ** 2 * ay + 2 * (1 - t) * t * cy + t * t * by]) }
  return union(...pts.slice(1).map((p, i) => segment(pts[i][0], pts[i][1], p[0], p[1], r)))
}
const union = (...fs) => (x, y) => { let d = Infinity; for (const f of fs) { const v = f(x, y); if (v < d) d = v } return d }
const cut = (f, g) => (x, y) => Math.max(f(x, y), -g(x, y))
const within = (f, g) => (x, y) => Math.max(f(x, y), g(x, y))

function canvas() {
  const px = new Float32Array(W * H * 4)
  return {
    px,
    /** 填一个形状：color 可以是颜色、RGB 数组或 (x, y) => 颜色；outline 给描边宽度。 */
    // 按 16×16 的格子先量一下距离，离形状远的格子整块跳过（距离场有的只是近似，留足余量）。
    fill(sdf, color, { alpha = 1, outline = 0, ink = '#2a1f2e' } = {}) {
      const line = hex(ink)
      const solid = typeof color === 'function' ? null : Array.isArray(color) ? color : hex(color)
      for (let ty = 0; ty < H; ty += TILE) {
        for (let tx = 0; tx < W; tx += TILE) {
          if (sdf(tx + TILE / 2, ty + TILE / 2) > TILE * 1.6 + outline) continue
          for (let y = ty; y < Math.min(H, ty + TILE); y++) {
            for (let x = tx; x < Math.min(W, tx + TILE); x++) {
              const d = sdf(x + 0.5, y + 0.5)
              const cover = clamp(0.5 - d)
              if (cover <= 0) continue
              let c = solid || color(x, y)
              if (outline && d > -outline - 1) c = mix(c, line, clamp((d + outline + 1) / 1.5))
              const a = cover * alpha
              const i = (y * W + x) * 4
              const da = px[i + 3]
              const oa = a + da * (1 - a)
              for (let ch = 0; ch < 3; ch++) px[i + ch] = (c[ch] * a + px[i + ch] * da * (1 - a)) / oa
              px[i + 3] = oa
            }
          }
        }
      }
    },
    png() {
      const raw = Buffer.alloc((W * 4 + 1) * H)
      for (let y = 0; y < H; y++) {
        const row = y * (W * 4 + 1)
        for (let x = 0; x < W * 4; x++) raw[row + 1 + x] = Math.round(255 * clamp(px[y * W * 4 + x]))
      }
      const chunk = (type, data) => {
        const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
        const body = Buffer.concat([Buffer.from(type), data])
        const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body) >>> 0)
        return Buffer.concat([len, body, crc])
      }
      const ihdr = Buffer.alloc(13)
      ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 6
      return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 6 })), chunk('IEND', Buffer.alloc(0))])
    },
  }
}

const HAIR = [[/black hair/, '#232032'], [/brown hair/, '#6e4632'], [/silver hair|white hair|grey hair/, '#cdd2e4'], [/blonde|golden hair/, '#e9c46c'], [/pink hair/, '#f0a0c2'], [/red hair/, '#b8423c'], [/blue hair/, '#4f6fc6']]
const EYES = [[/blue eyes/, '#3f78d6'], [/amber eyes|golden eyes|yellow eyes/, '#d6952e'], [/red eyes/, '#c9384a'], [/green eyes/, '#3f9a6a'], [/purple eyes|violet eyes/, '#8a5ad0']]
const pickColor = (text, table, fallback) => (table.find(([re]) => re.test(text)) || [, fallback])[1]

/** 读表情：返回眼、眉、嘴的样子和点缀。 */
function readFace(t) {
  const has = re => re.test(t)
  const face = { eyes: 'open', brows: 'calm', mouth: 'line', blush: has(/blush|embarrass|shy/), tears: has(/tear|crying/), look: has(/looking away|averting/) ? 'away' : 'front', hand: has(/hand on (own )?chin|thinking/), hearts: has(/heart-shaped pupils/), sweat: has(/sweatdrop|nervous/) }
  if (has(/closed eyes|laughing|eyes closed/)) face.eyes = 'closed'
  else if (has(/half-closed|tired|sleepy|bored/)) face.eyes = 'half'
  else if (has(/wide eyes|surprised|shocked|scared/)) face.eyes = 'wide'
  else if (has(/one eye closed|wink/)) face.eyes = 'wink'
  if (has(/angry|furrowed brow|glare|annoyed|irritat|frustrat/)) face.brows = 'angry'
  else if (has(/sad|worried|troubled|frown|crying|scared/)) face.brows = 'sad'
  else if (has(/surprised|raised eyebrow/)) face.brows = 'up'
  if (has(/open mouth|laughing|happy/) && has(/smile|laugh|happy/)) face.mouth = 'open-smile'
  else if (has(/surprised|shocked|open mouth|gasp/)) face.mouth = 'o'
  else if (has(/pout|puffed/)) face.mouth = 'pout'
  else if (has(/smirk|teasing|smug/)) face.mouth = 'smirk'
  else if (has(/clenched teeth|gritted/)) face.mouth = 'teeth'
  else if (has(/smile/)) face.mouth = 'smile'
  else if (has(/frown|sad|crying|pursed lips|biting lip/)) face.mouth = 'frown'
  return face
}

/** 衣服：底色、领子、点缀。 */
function readOutfit(t) {
  if (/pajama|nightgown/.test(t)) return { kind: 'pajamas', base: '#f3c9d8', trim: '#ffffff', accent: '#e58fae' }
  if (/coat|scarf|winter/.test(t)) return { kind: 'coat', base: '#9b6c4c', trim: '#e9dccb', accent: '#c4413c' }
  if (/cardigan/.test(t)) return { kind: 'cardigan', base: '#d8bf92', trim: '#ffffff', accent: '#c4413c' }
  if (/school uniform|sailor|serafuku|blazer/.test(t)) return { kind: 'uniform', base: '#283257', trim: '#f4f4f8', accent: '#cf3d4a' }
  return { kind: 'plain', base: '#7e8aa8', trim: '#e8ebf3', accent: '#5a6688' }
}

export function paintSprite(prompt) {
  const t = String(prompt || '').toLowerCase()
  const c = canvas()
  const hair = hex(pickColor(t, HAIR, '#3a2c3c'))
  const hairLight = mix(hair, [1, 1, 1], 0.35)
  const hairDark = mix(hair, [0, 0, 0], 0.35)
  const iris = hex(pickColor(t, EYES, '#7a4a32'))
  const skin = hex('#fbe4d6'), skinShade = hex('#efc3b2')
  const longHair = !/short hair|bob cut/.test(t)
  const outfit = readOutfit(t)
  const face = readFace(t)
  const headY = 430
  const hairTone = (x, y) => { const band = Math.abs((y - 330) / 60 - Math.sin(x / 70) * 0.4); return band < 0.5 ? mix(hair, hairLight, 0.55 * (1 - band * 2)) : y > 700 ? mix(hair, hairDark, clamp((y - 700) / 400)) : hair }

  // 后发
  const backHair = longHair
    ? union(ellipse(CX, headY - 20, 205, 215), segment(CX - 150, 470, CX - 175, 980, 70), segment(CX + 150, 470, CX + 175, 980, 70), ellipse(CX, 700, 210, 300))
    : union(ellipse(CX, headY - 10, 200, 205), ellipse(CX, 560, 185, 110))
  c.fill(backHair, hairTone, { outline: 2.5 })
  if (/side ponytail/.test(t)) c.fill(union(ellipse(CX + 235, 470, 70, 150), ellipse(CX + 215, 330, 40, 40)), hairTone, { outline: 2.5 })

  // 身体与衣服
  const shoulders = ellipse(CX, 800, 235, 115)
  const torso = (x, y) => {
    const half = Math.min(285, 150 + Math.max(0, y - 700) * 0.55)
    return Math.min(Math.max(Math.abs(x - CX) - half, 790 - y), shoulders(x, y))
  }
  const cloth = (x, y) => {
    const base = hex(outfit.base)
    if (outfit.kind === 'pajamas' && Math.floor((x - CX + 1000) / 34) % 2 === 0) return mix(base, [1, 1, 1], 0.55)
    return mix(base, [0, 0, 0], clamp((y - 900) / 900) * 0.4)
  }
  c.fill(segment(CX, 560, CX, 690, 52), skin, { outline: 2 })
  c.fill(segment(CX, 640, CX, 690, 52), skinShade, { alpha: 0.6 })
  c.fill(torso, cloth, { outline: 2.5 })
  if (outfit.kind === 'uniform') {
    const collar = cut(within(torso, (x, y) => Math.max(Math.abs(x - CX) - 290, y - 860)), (x, y) => Math.abs(x - CX) * 1.15 - (y - 660))
    c.fill(collar, outfit.trim, { outline: 2 })
    c.fill(within(collar, (x, y) => Math.abs(Math.abs(x - CX) * 1.15 - (y - 660) - 34) - 7), outfit.base)
    c.fill(union(ellipse(CX - 46, 790, 50, 30), ellipse(CX + 46, 790, 50, 30)), outfit.accent, { outline: 2 })
    c.fill(union(segment(CX - 10, 800, CX - 40, 900, 16), segment(CX + 10, 800, CX + 40, 900, 16)), outfit.accent, { outline: 2 })
    c.fill(ellipse(CX, 792, 18, 18), mix(hex(outfit.accent), [0, 0, 0], 0.2), { outline: 2 })
  } else if (outfit.kind === 'cardigan') {
    c.fill(within(torso, (x, y) => Math.abs(x - CX) - 70), '#f4f4f8', { outline: 2 })
    c.fill(within(torso, (x, y) => Math.abs(x - CX) - 26), '#283257')
    c.fill(union(ellipse(CX - 22, 720, 26, 16), ellipse(CX + 22, 720, 26, 16)), outfit.accent, { outline: 2 })
  } else if (outfit.kind === 'coat') {
    c.fill(within(torso, (x, y) => Math.abs(x - CX) - 6), mix(hex(outfit.base), [0, 0, 0], 0.3))
    for (const by of [860, 960, 1060]) for (const s of [-1, 1]) c.fill(ellipse(CX + s * 40, by, 10, 10), '#3b2a22')
    c.fill(union(ellipse(CX, 680, 140, 48), segment(CX + 60, 690, CX + 90, 900, 30)), (x, y) => (Math.floor((x + y) / 22) % 2 ? hex(outfit.accent) : mix(hex(outfit.accent), [1, 1, 1], 0.25)), { outline: 2.5 })
  } else if (outfit.kind === 'pajamas') {
    c.fill(within(torso, (x, y) => Math.max(Math.abs(x - CX) * 0.9 - (y - 660) * 0.7, y - 760)), skin)
    c.fill(union(ellipse(CX - 50, 700, 60, 26), ellipse(CX + 50, 700, 60, 26)), outfit.trim, { outline: 2 })
  }
  if (/pregnant/.test(t)) c.fill(ellipse(CX, 1150, 230, 170), cloth, { outline: 2.5 })

  // 头
  const head = union(ellipse(CX, headY - 10, 158, 160), ellipse(CX, headY + 50, 122, 132))
  c.fill(head, (x, y) => mix(skin, skinShade, clamp((y - 560) / 40)), { outline: 2.5 })
  // 刘海下的阴影
  c.fill(within(head, (x, y) => y - (350 + 26 * Math.abs(Math.sin(x / 38)) + 30)), skinShade, { alpha: 0.55 })

  // 眼睛
  const ey = headY + 30
  for (const side of [-1, 1]) {
    const ex = CX + side * 62
    const wink = face.eyes === 'wink' && side === 1
    if (face.eyes === 'closed' || wink) {
      c.fill(curve(ex - 30, ey + 4, ex, ey - 22, ex + 30, ey + 4, 4.5), '#2a1f2e')
      continue
    }
    const wide = face.eyes === 'wide'
    const ry = wide ? 34 : 30
    const white = ellipse(ex, ey, wide ? 34 : 31, ry)
    c.fill(white, '#ffffff', { outline: 1.5 })
    const shift = face.look === 'away' ? -side * 0 + 9 : 0
    const irisShape = within(ellipse(ex + shift, ey + 3, wide ? 18 : 22, wide ? 22 : 27), white)
    c.fill(irisShape, (x, y) => mix(mix(iris, [0, 0, 0], 0.45), iris, clamp((y - ey + 20) / 34)))
    if (face.hearts) c.fill(union(ellipse(ex + shift - 6, ey, 8, 8), ellipse(ex + shift + 6, ey, 8, 8), segment(ex + shift - 10, ey + 3, ex + shift, ey + 14, 4), segment(ex + shift + 10, ey + 3, ex + shift, ey + 14, 4)), '#ff5f8f')
    else c.fill(within(ellipse(ex + shift, ey + 5, wide ? 7 : 9, wide ? 9 : 12), white), mix(iris, [0, 0, 0], 0.65))
    c.fill(ellipse(ex + shift + 8, ey - 8, 7, 8), '#ffffff')
    c.fill(ellipse(ex + shift - 7, ey + 12, 3.5, 3.5), '#ffffff', { alpha: 0.8 })
    // 上眼线；半睁时眼皮压下来
    if (face.eyes === 'half') c.fill(within(ellipse(ex, ey - 16, 40, 26), white), skin)
    c.fill(curve(ex - 34, ey - (face.eyes === 'half' ? 2 : 10), ex, ey - (face.eyes === 'half' ? 14 : ry + 6), ex + 34, ey - (face.eyes === 'half' ? 2 : 10), 5), '#2a1f2e')
  }

  // 眉毛
  for (const side of [-1, 1]) {
    const bx = CX + side * 62, by = ey - (face.brows === 'up' ? 64 : 52)
    const inner = face.brows === 'angry' ? 12 : face.brows === 'sad' ? -12 : 0
    const outer = face.brows === 'angry' ? -6 : face.brows === 'sad' ? 6 : 0
    c.fill(segment(bx - side * 26, by + inner, bx + side * 26, by + outer - 4, 4.5), mix(hair, [0, 0, 0], 0.4))
  }

  // 脸红、眼泪、汗
  if (face.blush) for (const side of [-1, 1]) {
    c.fill(ellipse(CX + side * 82, ey + 52, 36, 16), '#ff8fa3', { alpha: 0.45 })
    for (let k = -1; k <= 1; k++) c.fill(segment(CX + side * 82 + k * 14 - 5, ey + 58, CX + side * 82 + k * 14 + 5, ey + 46, 2), '#ff6f8a', { alpha: 0.6 })
  }
  if (face.tears) for (const side of [-1, 1]) c.fill(union(segment(CX + side * 70, ey + 32, CX + side * 74, ey + 80, 5), ellipse(CX + side * 74, ey + 86, 9, 12)), '#9fd3ff', { alpha: 0.85, outline: 1 })
  if (face.sweat) c.fill(union(ellipse(CX + 150, headY - 40, 14, 20), segment(CX + 150, headY - 72, CX + 150, headY - 50, 4)), '#a8dcff', { outline: 1.5 })

  // 嘴
  const my = headY + 118
  const ink = '#7a2f3a'
  if (face.mouth === 'smile') c.fill(curve(CX - 24, my - 4, CX, my + 14, CX + 24, my - 4, 3.5), ink)
  else if (face.mouth === 'open-smile') {
    const m = within(ellipse(CX, my - 2, 30, 26), (x, y) => my - 6 - y)
    c.fill(m, '#9b3644', { outline: 2 })
    c.fill(within(ellipse(CX, my + 16, 16, 10), m), '#ef8a8f')
  } else if (face.mouth === 'o') c.fill(ellipse(CX, my + 2, 13, 17), '#9b3644', { outline: 2 })
  else if (face.mouth === 'pout') { c.fill(ellipse(CX, my + 2, 10, 8), '#c95a68', { outline: 2 }); for (const side of [-1, 1]) c.fill(ellipse(CX + side * 70, my - 6, 22, 14), '#ffb1bd', { alpha: 0.4 }) }
  else if (face.mouth === 'smirk') c.fill(curve(CX - 20, my + 2, CX + 4, my + 8, CX + 26, my - 10, 3.5), ink)
  else if (face.mouth === 'frown') c.fill(curve(CX - 20, my + 8, CX, my - 6, CX + 20, my + 8, 3.5), ink)
  else if (face.mouth === 'teeth') { c.fill(ellipse(CX, my, 26, 11), '#ffffff', { outline: 2.5 }); c.fill(segment(CX - 24, my, CX + 24, my, 1.2), '#c9b8bb') }
  else c.fill(segment(CX - 14, my, CX + 14, my, 3), ink)

  // 刘海与鬓发（压在脸上）
  const fringe = within(ellipse(CX, headY - 30, 182, 178), (x, y) => y - (330 + 44 * Math.abs(Math.sin((x - CX) / 34)) + (Math.abs(x - CX) > 120 ? (Math.abs(x - CX) - 120) * 1.4 : 0)))
  c.fill(fringe, hairTone, { outline: 2.5 })
  c.fill(union(segment(CX - 160, 360, CX - 170, longHair ? 640 : 560, 30), segment(CX + 160, 360, CX + 170, longHair ? 640 : 560, 30)), hairTone, { outline: 2.5 })
  if (/hair ornament|hairclip|hair clip/.test(t)) c.fill(union(ellipse(CX + 118, 318, 22, 22), ellipse(CX + 150, 330, 16, 16)), '#ffd36e', { outline: 2 })

  // 托腮的手
  if (face.hand) {
    c.fill(segment(CX + 210, 1216, CX + 120, my + 70, 46), cloth, { outline: 2.5 })
    c.fill(union(ellipse(CX + 92, my + 46, 46, 40), segment(CX + 70, my + 20, CX + 58, my - 6, 13)), skin, { outline: 2.5 })
  }
  return c.png()
}
