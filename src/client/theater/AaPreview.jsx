// 看立绘：逆转式动态的预览（工作台、人物志的差分、放大查看共用）。
// 做过动态的用剧场同款分层画布（一直眨眼，循环念一句台词让嘴动），没做过的就是原图。
import React from 'react'
import { assetUrl } from '../api.js'
import { AaSprite } from './AaSprite.jsx'
import { rectsBox } from '../../../lib/aa-sprite.js'
import { planLine } from '../../../lib/typing.js'

/** 预览用的一句台词：循环念，嘴跟着动（跟剧场里一样按演出计划开合）。on 为假时不说话（只眨眼）。 */
export function useDemoTalk(on) {
  const [talk, setTalk] = React.useState(null)
  React.useEffect(() => {
    if (!on) { setTalk(null); return undefined }
    const chars = Array.from('你终于来了，我等了你好久。')
    const plan = planLine(chars, 40, {})
    let timer = null
    const say = () => {
      setTalk({ key: 'demo' + Date.now(), type: 'dialogue', chars, times: plan.times, gap: plan.gap, mouth: plan.mouth, speed: 40, startedAt: performance.now(), done: false })
      timer = setTimeout(say, plan.times[plan.times.length - 1] + 1600)
    }
    say()
    return () => clearTimeout(timer)
  }, [on])
  return talk
}

/** 脸部特写的取景：眼睛和嘴的外接矩形放大 2.4 倍的正方形，夹在图里。没有框时返回 null（只能看全身）。 */
export function closeUpBox(rects, size) {
  if (!rects || !rects.eyes || !rects.eyes.length || !rects.mouth || !rects.mouth.length) return null
  const [x0, y0, x1, y1] = rectsBox([...rects.eyes, ...rects.mouth])
  const side = Math.min(size.w, size.h, Math.max(x1 - x0, y1 - y0) * 2.4)
  return { x: Math.max(0, Math.min(size.w - side, (x0 + x1) / 2 - side / 2)), y: Math.max(0, Math.min(size.h - side, (y0 + y1) / 2 - side / 2)), side }
}

/**
 * 看效果：跟剧场里一样的分层画布（眨眼、跟着台词动嘴）。close 时只看脸，
 * 不然整张立绘缩在框里，眼睛只有几个像素，看不出眨没眨。className 决定多大（工作台 / 放大查看）。
 */
export function PlayView({ aa, talk, label, still, size, rects, close, className = '' }) {
  const fallback = <img src={still} alt="" />
  const box = close ? closeUpBox(rects, size) : null
  if (!box) return <div className={`fg-aa-play ${className}`}><AaSprite aa={aa} talk={talk} label={label} fallback={fallback} /></div>
  return (
    <div className={`fg-aa-play is-close ${className}`}>
      <div style={{ position: 'absolute', width: `${size.w / box.side * 100}%`, left: `${-box.x / box.side * 100}%`, top: `${-box.y / box.side * 100}%` }}>
        <AaSprite aa={aa} talk={talk} label={label} fallback={fallback} />
      </div>
    </div>
  )
}

const packSize = record => {
  const s = record && record.aa && record.aa.pack && record.aa.pack.size
  return s ? { w: s[0], h: s[1] } : { w: 832, h: 1216 }
}

/** 差分格子里的小图：做过动态的直接动起来（一直眨眼、说话），点一下放大。 */
export function SpriteArt({ record, label, onOpen }) {
  const talk = useDemoTalk(Boolean(record && record.aa))
  if (!record || !record.assetId) return null
  const still = assetUrl(record.assetId)
  return (
    <button type="button" className="fg-sprite-art" title="点一下放大看" onClick={onOpen}>
      {record.aa ? <AaSprite aa={record.aa} talk={talk} label={label} fallback={<img src={still} alt={label} />} className="fg-aa" /> : <img src={still} alt={label} />}
      {record.aa && <i>动</i>}
      <span>🔍</span>
    </button>
  )
}

/**
 * 放大看一张立绘。做过逆转式动态的会动：一直眨眼、循环念一句台词让嘴动，可以切脸部特写、让它别说话；
 * 没做过的就是大图。点空白处或「关闭」退出。
 */
export function SpriteViewer({ record, label, onClose, children }) {
  const animated = Boolean(record && record.aa)
  const rects = animated ? record.aa.rects : null
  const [close, setClose] = React.useState(false)
  const [talking, setTalking] = React.useState(true)
  const talk = useDemoTalk(animated && talking)
  React.useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') { e.stopPropagation(); onClose() } }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [onClose])
  if (!record || !record.assetId) return null
  const still = assetUrl(record.assetId)
  return (
    <div className="fg-lightbox fg-sprite-viewer" onClick={onClose}>
      <div className="fg-viewer-stage" onClick={e => e.stopPropagation()}>
        {animated
          ? <PlayView aa={record.aa} talk={talk} label={label} still={still} size={packSize(record)} rects={rects} close={close} className="is-big" />
          : <img src={still} alt={label} />}
      </div>
      <div className="fg-row" onClick={e => e.stopPropagation()}>
        <span className="fg-pill">{label}{animated ? ' · 逆转式动态' : ''}</span>
        {animated && closeUpBox(rects, packSize(record)) && <button type="button" className="fg-btn" onClick={() => setClose(!close)}>{close ? '看全身' : '看脸部特写'}</button>}
        {animated && <button type="button" className="fg-btn" onClick={() => setTalking(!talking)}>{talking ? '别说话（只眨眼）' : '说一句'}</button>}
        {children}
        <button type="button" className="fg-btn" onClick={onClose}>关闭</button>
      </div>
    </div>
  )
}
