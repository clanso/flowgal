// 逆转式分层立绘：按素材包在画布上画，口型跟着对话框的逐字显现。
// v1（sprite.json）：呼吸帧 + 两态眼嘴，规则见 lib/aa-sprite.js；
// v2（motion.json）：一张整图、更细的眨眼、按音节拍子换嘴形（头部不动），规则见 lib/aa-motion.js。
import React from 'react'
import { breathFrame, blinkAt, blinkGap, mouthAt, packFiles } from '../../../lib/aa-sprite.js'
import { createActor, motionLayers } from '../../../lib/aa-motion.js'
import { assetUrl } from '../api.js'

const packs = new Map()
const loadImage = src => new Promise((resolve, reject) => {
  const img = new Image()
  img.onload = () => resolve(img)
  img.onerror = () => reject(new Error('aa sprite image: ' + src))
  img.src = src
})

/** 立绘记录的 aa：导入的素材包是 { pack }（文件是素材编号），预览演示是 { manifest: sprite.json / motion.json 的地址 }。 */
const packKey = aa => (aa.pack ? 'pack:' + JSON.stringify(aa.pack) : aa.manifest || '')

/** 读素材包；同一份只读一次，失败的下次再试。 */
export function loadAaPack(aa) {
  const key = packKey(aa)
  if (!packs.has(key)) {
    const task = (async () => {
      let m, at
      if (aa.pack) {
        m = aa.pack
        at = assetUrl
      } else {
        const base = new URL(aa.manifest, location.href)
        const res = await fetch(base)
        if (!res.ok) throw new Error('aa sprite manifest: ' + res.status)
        m = await res.json()
        at = file => new URL(file, base).href
      }
      if (m.version === 2) {
        const images = new Map(await Promise.all(packFiles(m).map(async f => [f, await loadImage(at(f))])))
        return { m, v2: true, images, w: m.size[0], h: m.size[1] }
      }
      const frames = await Promise.all(m.breath.frames.map(f => loadImage(at(f))))
      const parts = {}
      for (const [part, states] of Object.entries(m.parts || {})) {
        parts[part] = {}
        for (const [state, v] of Object.entries(states)) parts[part][state] = { img: await loadImage(at(v.file)), x: v.x, y: v.y }
      }
      return { m, frames, parts, w: m.size[0], h: m.size[1] }
    })()
    task.catch(() => packs.delete(key))
    packs.set(key, task)
  }
  return packs.get(key)
}

const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * aa：立绘记录的 aa（见 packKey）。talk：{ key, type, chars, times, gap, mouth, marks, speed, startedAt, done }，只在这个人正在说这一句时传。
 * fallback：素材包读好之前（或读失败）显示的东西，一般是原来的 <img>。
 * 换素材包（换表情）时，新包读好之前继续画旧包，不闪空。
 */
export function AaSprite({ aa, talk, fallback, className, label }) {
  const [pack, setPack] = React.useState(null)
  const canvas = React.useRef(null)
  const talkRef = React.useRef(talk)
  talkRef.current = talk
  const key = packKey(aa)

  React.useEffect(() => {
    let live = true
    loadAaPack(aa).then(p => { if (live) setPack(p) }, () => {})
    return () => { live = false }
  }, [key])

  // 画布一挂上就同步画第一帧（在浏览器重绘之前），从 <img> 换成画布时不留空白帧
  React.useLayoutEffect(() => {
    const el = canvas.current
    if (!pack || !el) return undefined
    el.width = pack.w
    el.height = pack.h
    const g = el.getContext('2d')
    const draw = pack.v2 ? motionDrawer(pack, g, { talkRef, label }) : breathDrawer(pack, g, talkRef)
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

/** v1：呼吸帧 + 随机眨眼 + 口型循环。 */
function breathDrawer(pack, g, talkRef) {
  const { m } = pack
  const begin = performance.now()
  let nextBlink = begin + blinkGap(m.blink)
  let blinkStart = -1
  let drawn = ''
  return now => {
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
}

/** v2：演员状态机（眨眼、音节拍子嘴形）。这句开始逐字显现时开口，点一下打完、换人说话时闭嘴。 */
function motionDrawer(pack, g, { talkRef, label }) {
  const { m, images } = pack
  const actor = createActor(m, { seed: label || 'aa', now: performance.now() })
  let said = ''
  let drawn = ''
  return now => {
    const still = reduced()
    if (still) actor.hush()
    const t = talkRef.current
    const sayKey = t && t.type === 'dialogue' && t.speed > 0 && !t.done && Number.isFinite(t.startedAt) ? `${t.key}|${t.startedAt}` : ''
    if (sayKey !== said) {
      said = sayKey
      if (sayKey && !still) actor.say({ chars: t.chars, times: t.times, gap: t.gap, mouth: t.mouth, marks: t.marks }, t.startedAt)
      else actor.hush()
    }
    const f = still ? { pose: m.default_pose, eyes: 'open', mouth: 'closed' } : actor.frame(now)
    const key = `${f.eyes}|${f.mouth}`
    if (key === drawn) return
    drawn = key
    g.clearRect(0, 0, pack.w, pack.h)
    for (const l of motionLayers(m, f)) {
      const img = images.get(l.file)
      if (img) g.drawImage(img, l.x, l.y)
    }
  }
}
