// 天气粒子：一张 canvas，按导演给的 weather 切换。帧率随可见性暂停，减少动画偏好下不跑。
import React from 'react'

const COUNTS = { rain: 220, storm: 380, snow: 140, blizzard: 420, wind: 70, sakura: 70, leaves: 40, fireflies: 46, embers: 90, dust: 60, bokeh: 26, stars: 160, fog: 6, sparkles: 60, bubbles: 50 }
const rand = (a, b) => a + Math.random() * (b - a)

function spawn(kind, w, h, initial) {
  const p = { x: rand(0, w), y: initial ? rand(0, h) : rand(-h * 0.2, -10), life: 0 }
  switch (kind) {
    case 'rain': case 'storm':
      return { ...p, vx: kind === 'storm' ? -7 : -2.4, vy: rand(16, 26) * (kind === 'storm' ? 1.25 : 1), len: rand(12, 26), a: rand(0.18, 0.45) }
    case 'snow':
      return { ...p, vx: rand(-0.4, 0.4), vy: rand(0.5, 1.6), r: rand(1, 3.6), a: rand(0.5, 0.95), ph: rand(0, 6.28) }
    case 'blizzard':
      return { ...p, x: initial ? rand(0, w) : rand(-w * 0.1, w * 1.2), vx: -rand(5, 11), vy: rand(2.2, 4.5), r: rand(0.8, 2.8), a: rand(0.45, 0.95), ph: rand(0, 6.28) }
    case 'wind': {
      const len = rand(60, 180)
      return { ...p, x: initial ? rand(0, w) : -len - rand(0, w * 0.5), y: rand(0, h), vx: rand(16, 30), vy: rand(0.6, 2), len, a: rand(0.05, 0.16) }
    }
    case 'sparkles':
      return { ...p, y: initial ? rand(0, h) : h + 10, vx: rand(-0.2, 0.2), vy: -rand(0.15, 0.6), r: rand(1.5, 4.2), ph: rand(0, 6.28), sp: rand(0.03, 0.08), hue: Math.random() < 0.6 ? rand(40, 55) : rand(180, 220) }
    case 'bubbles':
      return { ...p, y: initial ? rand(0, h) : h + 12, vx: rand(-0.2, 0.2), vy: -rand(0.5, 1.8), r: rand(1.6, 8), ph: rand(0, 6.28) }
    case 'sakura': case 'leaves':
      return { ...p, x: rand(-w * 0.2, w), vx: rand(0.6, 1.8), vy: rand(0.7, 1.7), r: rand(5, 10) * (kind === 'leaves' ? 1.3 : 1), rot: rand(0, 6.28), vr: rand(-0.05, 0.05), ph: rand(0, 6.28), hue: kind === 'leaves' ? rand(18, 44) : rand(330, 352) }
    case 'fireflies':
      return { ...p, y: initial ? rand(h * 0.3, h) : rand(h * 0.4, h), vx: rand(-0.3, 0.3), vy: rand(-0.3, 0.2), r: rand(1.2, 2.6), ph: rand(0, 6.28) }
    case 'embers':
      return { ...p, y: initial ? rand(0, h) : h + 10, vx: rand(-0.4, 0.6), vy: -rand(0.6, 2.2), r: rand(0.8, 2.2), ph: rand(0, 6.28) }
    case 'dust':
      return { ...p, y: rand(0, h), vx: rand(-0.15, 0.15), vy: rand(-0.12, 0.12), r: rand(0.6, 1.6), ph: rand(0, 6.28) }
    case 'bokeh':
      return { ...p, y: rand(0, h), vx: rand(-0.12, 0.12), vy: rand(-0.18, -0.04), r: rand(14, 46), hue: rand(0, 360), ph: rand(0, 6.28) }
    case 'stars':
      return { ...p, y: rand(0, h * 0.65), r: rand(0.4, 1.5), ph: rand(0, 6.28), sp: rand(0.01, 0.05) }
    case 'fog':
      return { ...p, y: rand(h * 0.35, h * 0.9), vx: rand(0.15, 0.4), r: rand(w * 0.25, w * 0.45), a: rand(0.06, 0.13) }
    default: return p
  }
}

/** 走一帧。k 是时间流速：1 正常，慢动作时很小，时间停止时为 0（粒子停在半空）。 */
function step(kind, p, w, h, t, ctx, k = 1) {
  switch (kind) {
    case 'rain': case 'storm': {
      p.x += p.vx * k; p.y += p.vy * k
      ctx.strokeStyle = `rgba(200, 220, 255, ${p.a})`; ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + p.vx * 1.6 * Math.max(0.12, k), p.y - p.len * Math.max(0.12, k)); ctx.stroke()
      return p.y < h + 30
    }
    case 'snow': {
      p.ph += 0.02 * k; p.x += (p.vx + Math.sin(p.ph) * 0.4) * k; p.y += p.vy * k
      ctx.fillStyle = `rgba(255, 255, 255, ${p.a})`
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill()
      return p.y < h + 10
    }
    case 'blizzard': {
      p.ph += 0.05 * k; p.x += (p.vx + Math.sin(p.ph) * 0.8) * k; p.y += p.vy * k
      ctx.fillStyle = `rgba(245, 248, 255, ${p.a})`
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill()
      return p.y < h + 10 && p.x > -20
    }
    case 'wind': {
      p.x += p.vx * k; p.y += p.vy * k
      const g = ctx.createLinearGradient(p.x - p.len, p.y - p.len * 0.07, p.x, p.y)
      g.addColorStop(0, 'rgba(235, 240, 255, 0)'); g.addColorStop(1, `rgba(235, 240, 255, ${p.a})`)
      ctx.strokeStyle = g; ctx.lineWidth = 1.2
      ctx.beginPath(); ctx.moveTo(p.x - p.len, p.y - p.len * 0.07); ctx.lineTo(p.x, p.y); ctx.stroke()
      return p.x - p.len < w + 10
    }
    case 'sparkles': {
      p.ph += p.sp * k; p.x += (p.vx + Math.sin(p.ph * 0.6) * 0.2) * k; p.y += p.vy * k
      const a = Math.max(0, Math.sin(p.ph)) * 0.9
      if (a > 0.02) {
        const r = p.r * (0.6 + a * 0.6)
        ctx.fillStyle = `hsla(${p.hue}, 100%, 85%, ${a})`
        ctx.beginPath(); ctx.moveTo(p.x, p.y - r * 2); ctx.lineTo(p.x + r * 0.35, p.y - r * 0.35); ctx.lineTo(p.x + r * 2, p.y); ctx.lineTo(p.x + r * 0.35, p.y + r * 0.35)
        ctx.lineTo(p.x, p.y + r * 2); ctx.lineTo(p.x - r * 0.35, p.y + r * 0.35); ctx.lineTo(p.x - r * 2, p.y); ctx.lineTo(p.x - r * 0.35, p.y - r * 0.35); ctx.closePath(); ctx.fill()
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 3)
        g.addColorStop(0, `hsla(${p.hue}, 100%, 80%, ${a * 0.35})`); g.addColorStop(1, `hsla(${p.hue}, 100%, 80%, 0)`)
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, r * 3, 0, 6.283); ctx.fill()
      }
      return p.y > -20
    }
    case 'bubbles': {
      p.ph += 0.04 * k; p.x += (p.vx + Math.sin(p.ph) * 0.5) * k; p.y += p.vy * k
      ctx.strokeStyle = 'rgba(220, 250, 255, .45)'; ctx.lineWidth = 1
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.stroke()
      ctx.fillStyle = 'rgba(255, 255, 255, .55)'
      ctx.beginPath(); ctx.arc(p.x - p.r * 0.35, p.y - p.r * 0.35, p.r * 0.25, 0, 6.283); ctx.fill()
      return p.y > -p.r - 4
    }
    case 'sakura': case 'leaves': {
      p.ph += 0.03 * k; p.rot += p.vr * k; p.x += (p.vx + Math.sin(p.ph) * 0.8) * k; p.y += p.vy * k
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.scale(1, Math.abs(Math.sin(p.ph)) * 0.6 + 0.4)
      ctx.fillStyle = kind === 'leaves' ? `hsla(${p.hue}, 75%, 48%, .85)` : `hsla(${p.hue}, 90%, 86%, .9)`
      ctx.beginPath(); ctx.moveTo(0, -p.r); ctx.bezierCurveTo(p.r, -p.r * 0.6, p.r * 0.7, p.r * 0.6, 0, p.r); ctx.bezierCurveTo(-p.r * 0.7, p.r * 0.6, -p.r, -p.r * 0.6, 0, -p.r); ctx.fill()
      ctx.restore()
      return p.y < h + 20 && p.x < w + 30
    }
    case 'fireflies': {
      p.ph += 0.03 * k; p.x += (p.vx + Math.sin(p.ph * 0.7) * 0.3) * k; p.y += (p.vy + Math.cos(p.ph * 0.5) * 0.2) * k
      const a = 0.35 + Math.sin(p.ph * 2) * 0.35
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 6)
      g.addColorStop(0, `rgba(230, 255, 150, ${a})`); g.addColorStop(1, 'rgba(230, 255, 150, 0)')
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 6, 0, 6.283); ctx.fill()
      return p.x > -20 && p.x < w + 20 && p.y > -20 && p.y < h + 20
    }
    case 'embers': {
      p.ph += 0.05 * k; p.x += (p.vx + Math.sin(p.ph) * 0.5) * k; p.y += p.vy * k
      ctx.fillStyle = `rgba(255, ${140 + Math.sin(p.ph) * 60}, 60, ${0.5 + Math.sin(p.ph * 1.7) * 0.4})`
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill()
      return p.y > -10
    }
    case 'dust': {
      p.ph += 0.01 * k; p.x += p.vx * k; p.y += p.vy * k
      ctx.fillStyle = `rgba(255, 245, 220, ${0.25 + Math.sin(p.ph * 3) * 0.2})`
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill()
      return p.x > -10 && p.x < w + 10 && p.y > -10 && p.y < h + 10
    }
    case 'bokeh': {
      p.ph += 0.01 * k; p.x += p.vx * k; p.y += p.vy * k
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
      p.x += p.vx * k
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r)
      g.addColorStop(0, `rgba(230, 235, 245, ${p.a})`); g.addColorStop(1, 'rgba(230, 235, 245, 0)')
      ctx.fillStyle = g; ctx.fillRect(p.x - p.r, p.y - p.r, p.r * 2, p.r * 2)
      if (p.x - p.r > w) p.x = -p.r
      return true
    }
    default: return false
  }
}

/** speed：时间流速（慢动作、时间停止时变小），换了以后不重新开始，慢慢过渡过去。 */
export function Particles({ weather, enabled = true, speed = 1 }) {
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
    let list = Array.from({ length: target }, () => spawn(kind, w, h, true))
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
      const next = []
      for (const p of list) if (step(kind, p, w, h, t, ctx, k)) next.push(p)
      while (next.length < target) next.push(spawn(kind, w, h, false))
      list = next
    }
    raf = requestAnimationFrame(frame)
    return () => { cancelAnimationFrame(raf); ro && ro.disconnect(); ctx.clearRect(0, 0, w, h) }
  }, [weather, enabled])
  return React.createElement('canvas', { ref, className: 'fg-particles', 'aria-hidden': true })
}
