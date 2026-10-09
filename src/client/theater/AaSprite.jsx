// 逆转式分层立绘：按素材包在画布上画呼吸帧 + 眨眼 + 口型，口型跟着对话框的逐字显现。规则见 lib/aa-sprite.js。
import React from 'react'
import { breathFrame, blinkAt, blinkGap, mouthAt } from '../../../lib/aa-sprite.js'

const packs = new Map()
const loadImage = src => new Promise((resolve, reject) => {
  const img = new Image()
  img.onload = () => resolve(img)
  img.onerror = () => reject(new Error('aa sprite image: ' + src))
  img.src = src
})

/** 读素材包；同一地址只读一次，失败的下次再试。 */
export function loadAaPack(manifest) {
  if (!packs.has(manifest)) {
    const task = (async () => {
      const base = new URL(manifest, location.href)
      const res = await fetch(base)
      if (!res.ok) throw new Error('aa sprite manifest: ' + res.status)
      const m = await res.json()
      const at = file => new URL(file, base).href
      const frames = await Promise.all(m.breath.frames.map(f => loadImage(at(f))))
      const parts = {}
      for (const [part, states] of Object.entries(m.parts || {})) {
        parts[part] = {}
        for (const [state, v] of Object.entries(states)) parts[part][state] = { img: await loadImage(at(v.file)), x: v.x, y: v.y }
      }
      return { m, frames, parts, w: m.size[0], h: m.size[1] }
    })()
    task.catch(() => packs.delete(manifest))
    packs.set(manifest, task)
  }
  return packs.get(manifest)
}

const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * talk：{ key, type, chars, speed, startedAt, done }，只在这个人正在说这一句时传。
 * fallback：素材包读好之前（或读失败）显示的东西，一般是原来的 <img>。
 * 换素材包（换表情）时，新包读好之前继续画旧包，不闪空。
 */
export function AaSprite({ manifest, talk, fallback, className, label }) {
  const [pack, setPack] = React.useState(null)
  const canvas = React.useRef(null)
  const talkRef = React.useRef(talk)
  talkRef.current = talk

  React.useEffect(() => {
    let live = true
    loadAaPack(manifest).then(p => { if (live) setPack(p) }, () => {})
    return () => { live = false }
  }, [manifest])

  // 画布一挂上就同步画第一帧（在浏览器重绘之前），从 <img> 换成画布时不留空白帧
  React.useLayoutEffect(() => {
    const el = canvas.current
    if (!pack || !el) return undefined
    el.width = pack.w
    el.height = pack.h
    const g = el.getContext('2d')
    const { m } = pack
    const begin = performance.now()
    let nextBlink = begin + blinkGap(m.blink)
    let blinkStart = -1
    let drawn = ''
    const draw = now => {
      const still = reduced()
      const b = still ? 0 : breathFrame(m.breath, now - begin)
      let eyes = 'open'
      if (!still) {
        if (blinkStart < 0 && now >= nextBlink) blinkStart = now
        if (blinkStart >= 0) {
          eyes = blinkAt(m.blink, now - blinkStart)
          if (!eyes) { eyes = 'open'; blinkStart = -1; nextBlink = now + blinkGap(m.blink) }
        }
      }
      const mouth = mouthAt(m.talk?.mouth_loop, talkRef.current, now)
      const key = `${b}|${eyes}|${mouth}`
      if (key === drawn) return
      drawn = key
      g.clearRect(0, 0, pack.w, pack.h)
      g.drawImage(pack.frames[b], 0, 0)
      const lift = m.breath.lifts?.[b] || 0
      for (const [part, state] of [['eyes', eyes], ['mouth', mouth]]) {
        const p = pack.parts[part]?.[state]
        if (p) g.drawImage(p.img, p.x, p.y - lift)
      }
    }
    draw(performance.now())
    let raf = requestAnimationFrame(function tick(now) {
      raf = requestAnimationFrame(tick)
      draw(now)
    })
    return () => cancelAnimationFrame(raf)
  }, [pack])

  if (!pack) return fallback || null
  return <canvas ref={canvas} className={className} role="img" aria-label={label} />
}
