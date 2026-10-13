// 天气粒子：一张 canvas，按导演给的 weather 切换。帧率随可见性暂停，减少动画偏好下不跑。
// 粒子有远近：z 越大越近，近的大、快、清楚，远的小、慢、淡；最前面零星几颗贴着镜头，又大又虚（在焦外）。
// 风是一阵一阵的：隔几秒换一次风力，平滑过渡，越近的粒子被吹得越明显。
import React from 'react'

const COUNTS = { rain: 220, storm: 380, snow: 140, blizzard: 420, wind: 70, sakura: 70, leaves: 40, fireflies: 46, embers: 90, dust: 60, bokeh: 26, stars: 160, fog: 6, sparkles: 60, bubbles: 50 }
// 贴着镜头、画成虚焦的那几颗占多少；不在表里的天气没有远近
const NEAR = { rain: 0.025, storm: 0.025, snow: 0.06, blizzard: 0.03, sakura: 0.06, leaves: 0.07, fireflies: 0.07, embers: 0.06, dust: 0.1, sparkles: 0.04, bubbles: 0.06 }
// 阵风：最大风力（每帧横向像素）和主要往哪边吹（1 右，-1 左，0 每次开场随机定一边）
const GUST = { rain: [2.2, -1], storm: [4, -1], snow: [1.4, 0], blizzard: [3.5, -1], wind: [9, 1], sakura: [2.4, 1], leaves: [2.8, 1], fireflies: [0.35, 0], embers: [1.2, 0], dust: [0.5, 0], bokeh: [0.12, 0], fog: [0.6, 1], sparkles: [0.3, 0], bubbles: [0.25, 0] }
// 横着飘出画面就从另一边回来，不用重新生成
const WRAP = new Set(['snow', 'embers', 'sparkles', 'bubbles', 'dust', 'fireflies', 'bokeh'])
const rand = (a, b) => a + Math.random() * (b - a)

/** 定远近：大小、速度、透明度都按 z 缩放。新生成的虚焦粒子从画面外进来，不在边上突然出现。flat（特效开关关掉了「粒子分远近」）时都一样远。 */
function deepen(kind, p, initial, flat) {
  if (flat || !(kind in NEAR)) return p
  const soft = Math.random() < NEAR[kind]
  const z = soft ? rand(1.8, 2.8) : 0.6 + Math.random() ** 1.3 * 0.9
  p.z = z; p.soft = soft
  if (p.r) p.r *= soft ? z * 1.25 : z
  if (p.len) p.len *= z
  if (p.vx) p.vx *= z
  if (p.vy) p.vy *= z
  if (p.a) p.a *= soft ? 0.55 : Math.min(1, 0.6 + z * 0.35)
  if (soft && !initial) p.y += (p.vy < 0 ? 1 : -1) * (p.r || 4) * 3
  return p
}

function spawn(kind, w, h, initial, flat = false) {
  const p = { x: rand(0, w), y: initial ? rand(0, h) : rand(-h * 0.2, -10), life: 0 }
  switch (kind) {
    case 'rain': case 'storm':
      return deepen(kind, { ...p, vx: kind === 'storm' ? -7 : -2.4, vy: rand(16, 26) * (kind === 'storm' ? 1.25 : 1), len: rand(12, 26), a: rand(0.18, 0.45) }, initial, flat)
    case 'snow':
      return deepen(kind, { ...p, vx: rand(-0.4, 0.4), vy: rand(0.5, 1.6), r: rand(1, 3.6), a: rand(0.5, 0.95), ph: rand(0, 6.28) }, initial, flat)
    case 'blizzard':
      return deepen(kind, { ...p, x: initial ? rand(0, w) : rand(-w * 0.1, w * 1.2), vx: -rand(5, 11), vy: rand(2.2, 4.5), r: rand(0.8, 2.8), a: rand(0.45, 0.95), ph: rand(0, 6.28) }, initial, flat)
    case 'wind': {
      const len = rand(60, 180)
      return { ...p, x: initial ? rand(0, w) : -len - rand(0, w * 0.5), y: rand(0, h), vx: rand(16, 30), vy: rand(0.6, 2), len, a: rand(0.05, 0.16) }
    }
    case 'sparkles':
      return deepen(kind, { ...p, y: initial ? rand(0, h) : h + 10, vx: rand(-0.2, 0.2), vy: -rand(0.15, 0.6), r: rand(1.5, 4.2), ph: rand(0, 6.28), sp: rand(0.03, 0.08), hue: Math.random() < 0.6 ? rand(40, 55) : rand(180, 220) }, initial, flat)
    case 'bubbles':
      return deepen(kind, { ...p, y: initial ? rand(0, h) : h + 12, vx: rand(-0.2, 0.2), vy: -rand(0.5, 1.8), r: rand(1.6, 8), ph: rand(0, 6.28) }, initial, flat)
    case 'sakura': case 'leaves':
      return deepen(kind, { ...p, x: rand(-w * 0.2, w), vx: rand(0.6, 1.8), vy: rand(0.7, 1.7), r: rand(5, 10) * (kind === 'leaves' ? 1.3 : 1), rot: rand(0, 6.28), vr: rand(-0.05, 0.05), ph: rand(0, 6.28), hue: kind === 'leaves' ? rand(18, 44) : rand(330, 352) }, initial, flat)
    case 'fireflies':
      return deepen(kind, { ...p, y: initial ? rand(h * 0.3, h) : rand(h * 0.4, h), vx: rand(-0.3, 0.3), vy: rand(-0.3, 0.2), r: rand(1.2, 2.6), ph: rand(0, 6.28) }, initial, flat)
    case 'embers':
      return deepen(kind, { ...p, y: initial ? rand(0, h) : h + 10, vx: rand(-0.4, 0.6), vy: -rand(0.6, 2.2), r: rand(0.8, 2.2), ph: rand(0, 6.28) }, initial, flat)
    case 'dust':
      return deepen(kind, { ...p, y: rand(0, h), vx: rand(-0.15, 0.15), vy: rand(-0.12, 0.12), r: rand(0.6, 1.6), ph: rand(0, 6.28) }, initial, flat)
    case 'bokeh':
      return { ...p, y: rand(0, h), vx: rand(-0.12, 0.12), vy: rand(-0.18, -0.04), r: rand(14, 46), hue: rand(0, 360), ph: rand(0, 6.28) }
    case 'stars':
      return { ...p, y: rand(0, h * 0.65), r: rand(0.4, 1.5), ph: rand(0, 6.28), sp: rand(0.01, 0.05) }
    case 'fog':
      return { ...p, y: rand(h * 0.35, h * 0.9), vx: rand(0.15, 0.4), r: rand(w * 0.25, w * 0.45), a: rand(0.06, 0.13) }
    default: return p
  }
}

/** 焦外的圆光斑：中间平、边上柔，比直接 blur 便宜。 */
function glow(ctx, x, y, r, rgb, a) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r)
  g.addColorStop(0, `rgba(${rgb}, ${a})`); g.addColorStop(0.55, `rgba(${rgb}, ${a * 0.8})`); g.addColorStop(1, `rgba(${rgb}, 0)`)
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.fill()
}

/**
 * 走一帧。e.k 是时间流速：1 正常，慢动作时很小，时间停止时为 0（粒子停在半空）。
 * e.wind 是这一刻的阵风，按粒子远近放大；e.blur 表示 canvas 支持 filter，虚焦的花瓣、雨丝用它糊开。
 */
function step(kind, p, ctx, e) {
  const { w, h, k } = e
  const z = p.z || 1
  const wx = e.wind * z
  switch (kind) {
    case 'rain': case 'storm': {
      const vx = p.vx + wx
      p.x += vx * k; p.y += p.vy * k
      const s = Math.max(0.12, k)
      if (p.soft) { ctx.save(); ctx.lineCap = 'round'; if (e.blur) ctx.filter = 'blur(2px)' }
      ctx.strokeStyle = `rgba(200, 220, 255, ${p.a})`; ctx.lineWidth = p.soft ? 3.4 : 0.5 + z * 0.5
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + vx * 1.6 * s, p.y - p.len * s); ctx.stroke()
      if (p.soft) ctx.restore()
      return p.y < h + p.len + 30
    }
    case 'snow': {
      p.ph += 0.02 * k; p.x += (p.vx + Math.sin(p.ph) * 0.4 * z + wx) * k; p.y += p.vy * k
      if (p.soft) glow(ctx, p.x, p.y, p.r * 2.4, '255, 255, 255', p.a)
      else { ctx.fillStyle = `rgba(255, 255, 255, ${p.a})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill() }
      return p.y < h + p.r * 2 + 10
    }
    case 'blizzard': {
      p.ph += 0.05 * k; p.x += (p.vx + Math.sin(p.ph) * 0.8 * z + wx) * k; p.y += p.vy * k
      if (p.soft) glow(ctx, p.x, p.y, p.r * 2.4, '245, 248, 255', p.a)
      else { ctx.fillStyle = `rgba(245, 248, 255, ${p.a})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill() }
      return p.y < h + p.r * 2 + 10 && p.x > -20 - p.r * 2
    }
    case 'wind': {
      const vx = p.vx + Math.max(0, wx)
      p.x += vx * k; p.y += p.vy * k
      const a = p.a * (1 + Math.max(0, wx) / 12)
      const g = ctx.createLinearGradient(p.x - p.len, p.y - p.len * 0.07, p.x, p.y)
      g.addColorStop(0, 'rgba(235, 240, 255, 0)'); g.addColorStop(1, `rgba(235, 240, 255, ${a})`)
      ctx.strokeStyle = g; ctx.lineWidth = 1.2
      ctx.beginPath(); ctx.moveTo(p.x - p.len, p.y - p.len * 0.07); ctx.lineTo(p.x, p.y); ctx.stroke()
      return p.x - p.len < w + 10
    }
    case 'sparkles': {
      p.ph += p.sp * k; p.x += (p.vx + Math.sin(p.ph * 0.6) * 0.2 + wx) * k; p.y += p.vy * k
      const a = Math.max(0, Math.sin(p.ph)) * 0.9
      if (a > 0.02 && p.soft) glow(ctx, p.x, p.y, p.r * 2.4, hslRgb(p.hue, 100, 85), a * 0.35)
      else if (a > 0.02) {
        const r = p.r * (0.6 + a * 0.6)
        ctx.fillStyle = `hsla(${p.hue}, 100%, 85%, ${a})`
        ctx.beginPath(); ctx.moveTo(p.x, p.y - r * 2); ctx.lineTo(p.x + r * 0.35, p.y - r * 0.35); ctx.lineTo(p.x + r * 2, p.y); ctx.lineTo(p.x + r * 0.35, p.y + r * 0.35)
        ctx.lineTo(p.x, p.y + r * 2); ctx.lineTo(p.x - r * 0.35, p.y + r * 0.35); ctx.lineTo(p.x - r * 2, p.y); ctx.lineTo(p.x - r * 0.35, p.y - r * 0.35); ctx.closePath(); ctx.fill()
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 3)
        g.addColorStop(0, `hsla(${p.hue}, 100%, 80%, ${a * 0.35})`); g.addColorStop(1, `hsla(${p.hue}, 100%, 80%, 0)`)
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, r * 3, 0, 6.283); ctx.fill()
      }
      return p.y > -20 - p.r * 3
    }
    case 'bubbles': {
      p.ph += 0.04 * k; p.x += (p.vx + Math.sin(p.ph) * 0.5 * z + wx) * k; p.y += p.vy * k
      ctx.save()
      if (p.soft) { ctx.globalAlpha = 0.6; if (e.blur) ctx.filter = `blur(${Math.min(6, p.r * 0.12)}px)` }
      ctx.strokeStyle = 'rgba(220, 250, 255, .45)'; ctx.lineWidth = p.soft ? 2 : 1
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.stroke()
      ctx.fillStyle = 'rgba(255, 255, 255, .55)'
      ctx.beginPath(); ctx.arc(p.x - p.r * 0.35, p.y - p.r * 0.35, p.r * 0.25, 0, 6.283); ctx.fill()
      ctx.restore()
      return p.y > -p.r - 4
    }
    case 'sakura': case 'leaves': {
      // 起风时转得快一些，也被往上托一点
      const lift = Math.abs(wx)
      p.ph += 0.03 * k * (1 + lift * 0.3); p.rot += p.vr * k * (1 + lift * 0.8)
      p.x += (p.vx + Math.sin(p.ph) * 0.8 * z + wx) * k; p.y += (p.vy - lift * 0.25) * k
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.scale(1, Math.abs(Math.sin(p.ph)) * 0.6 + 0.4)
      if (p.soft) { ctx.globalAlpha = 0.75; if (e.blur) ctx.filter = `blur(${Math.min(7, p.r * 0.16)}px)` }
      ctx.fillStyle = kind === 'leaves' ? `hsla(${p.hue}, 75%, 48%, .85)` : `hsla(${p.hue}, 90%, 86%, .9)`
      ctx.beginPath(); ctx.moveTo(0, -p.r); ctx.bezierCurveTo(p.r, -p.r * 0.6, p.r * 0.7, p.r * 0.6, 0, p.r); ctx.bezierCurveTo(-p.r * 0.7, p.r * 0.6, -p.r, -p.r * 0.6, 0, -p.r); ctx.fill()
      ctx.restore()
      return p.y < h + p.r * 2 + 20 && p.x < w + p.r * 2 + 30
    }
    case 'fireflies': {
      p.ph += 0.03 * k; p.x += (p.vx + Math.sin(p.ph * 0.7) * 0.3 * z + wx) * k; p.y += (p.vy + Math.cos(p.ph * 0.5) * 0.2 * z) * k
      const a = (0.35 + Math.sin(p.ph * 2) * 0.35) * (p.soft ? 0.5 : 1)
      glow(ctx, p.x, p.y, p.r * 6, '230, 255, 150', a)
      return p.y > -20 - p.r * 6 && p.y < h + 20 + p.r * 6
    }
    case 'embers': {
      p.ph += 0.05 * k; p.x += (p.vx + Math.sin(p.ph) * 0.5 * z + wx) * k; p.y += p.vy * k
      const a = 0.5 + Math.sin(p.ph * 1.7) * 0.4
      if (p.soft) glow(ctx, p.x, p.y, p.r * 3, `255, ${Math.round(140 + Math.sin(p.ph) * 60)}, 60`, a * 0.5)
      else { ctx.fillStyle = `rgba(255, ${140 + Math.sin(p.ph) * 60}, 60, ${a})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill() }
      return p.y > -10 - p.r * 2
    }
    case 'dust': {
      p.ph += 0.01 * k; p.x += (p.vx + wx) * k; p.y += p.vy * k
      const a = 0.25 + Math.sin(p.ph * 3) * 0.2
      if (p.soft) glow(ctx, p.x, p.y, p.r * 2.6, '255, 245, 220', a * 0.45)
      else { ctx.fillStyle = `rgba(255, 245, 220, ${a})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill() }
      return p.y > -10 - p.r * 3 && p.y < h + 10 + p.r * 3
    }
    case 'bokeh': {
      p.ph += 0.01 * k; p.x += (p.vx + wx) * k; p.y += p.vy * k
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r)
      const a = 0.08 + Math.sin(p.ph) * 0.05
      g.addColorStop(0, `hsla(${p.hue}, 90%, 75%, ${a + 0.06})`); g.addColorStop(0.7, `hsla(${p.hue}, 90%, 70%, ${a})`); g.addColorStop(1, `hsla(${p.hue}, 90%, 70%, 0)`)
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill()
      return p.y > -p.r
    }
    case 'stars': {
      p.ph += p.sp * k
      ctx.fillStyle = `rgba(255, 255, 255, ${0.3 + Math.abs(Math.sin(p.ph)) * 0.7})`
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill()
      return true
    }
    case 'fog': {
      p.x += (p.vx + wx) * k
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r)
      g.addColorStop(0, `rgba(230, 235, 245, ${p.a})`); g.addColorStop(1, 'rgba(230, 235, 245, 0)')
      ctx.fillStyle = g; ctx.fillRect(p.x - p.r, p.y - p.r, p.r * 2, p.r * 2)
      if (p.x - p.r > w) p.x = -p.r
      return true
    }
    default: return false
  }
}

function hslRgb(hue, s, l) {
  s /= 100; l /= 100
  const f = n => {
    const q = (n + hue / 30) % 12
    return Math.round(255 * (l - s * Math.min(l, 1 - l) * Math.max(-1, Math.min(q - 3, 9 - q, 1))))
  }
  return `${f(0)}, ${f(8)}, ${f(4)}`
}

/** 阵风：隔几秒换一个目标，一半时候是风停，平滑地吹起来、停下去。calm 时（特效开关关掉了阵风）一直没风。 */
function gusts(kind, calm = false) {
  const [max, lean0] = calm ? [0, 0] : GUST[kind] || [0, 0]
  const lean = lean0 || (Math.random() < 0.5 ? 1 : -1)
  let now = 0, to = 0, at = 0
  return (t, k) => {
    if (t >= at) {
      at = t + rand(2600, 7000)
      to = Math.random() < 0.45 ? 0 : rand(0.35, 1) * (Math.random() < 0.85 ? lean : -lean)
    }
    now += (to - now) * 0.012 * Math.min(1, k)
    return now * max
  }
}

/** speed：时间流速（慢动作、时间停止时变小），换了以后不重新开始，慢慢过渡过去。depth、gust：分远近、一阵一阵的风（特效开关）。 */
export function Particles({ weather, enabled = true, speed = 1, depth = true, gust: windy = true }) {
  const ref = React.useRef(null)
  const want = React.useRef(speed)
  want.current = speed
  React.useEffect(() => {
    const canvas = ref.current
    const kind = weather
    if (!canvas || !enabled || !COUNTS[kind]) return undefined
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined
    const ctx = canvas.getContext('2d')
    let w = 0, h = 0, raf = 0, flash = 0, k = want.current
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const resize = () => {
      w = canvas.clientWidth; h = canvas.clientHeight
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(resize) : null
    ro && ro.observe(canvas)
    const target = Math.round(COUNTS[kind] * Math.min(1.4, Math.max(0.5, w / 1200)))
    const make = initial => spawn(kind, w, h, initial, !depth)
    let list = Array.from({ length: target }, () => make(true))
    // 近的后画，盖在远的上面
    const order = (a, b) => (a.z || 1) - (b.z || 1)
    list.sort(order)
    const gust = gusts(kind, !windy)
    const env = { w, h, k, wind: 0, blur: 'filter' in ctx }
    const wrap = WRAP.has(kind)
    const frame = t => {
      raf = requestAnimationFrame(frame)
      if (document.hidden) return
      ctx.clearRect(0, 0, w, h)
      k += (want.current - k) * 0.06
      if (Math.abs(want.current - k) < 0.002) k = want.current
      if (kind === 'storm') {
        if (flash <= 0 && Math.random() < 0.004 * k) flash = 1
        if (flash > 0) { ctx.fillStyle = `rgba(220, 230, 255, ${flash * 0.35})`; ctx.fillRect(0, 0, w, h); flash -= 0.06 }
      }
      env.w = w; env.h = h; env.k = k; env.wind = gust(t, k)
      const next = []
      for (const p of list) {
        if (wrap) {
          const m = 40 + (p.r || 0) * 3
          if (p.x < -m) p.x += w + m * 2
          else if (p.x > w + m) p.x -= w + m * 2
        }
        if (step(kind, p, ctx, env)) next.push(p)
      }
      let added = false
      while (next.length < target) { next.push(make(false)); added = true }
      if (added) next.sort(order)
      list = next
    }
    raf = requestAnimationFrame(frame)
    return () => { cancelAnimationFrame(raf); ro && ro.disconnect(); ctx.clearRect(0, 0, w, h) }
  }, [weather, enabled, depth, windy])
  return React.createElement('canvas', { ref, className: 'fg-particles', 'aria-hidden': true })
}
