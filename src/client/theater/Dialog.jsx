// 对话框（逐字显现 + 打字音）、情境卡片（短信 / 信件 / 便签……）、选项。
import React from 'react'
import { blip, sfx } from './audio.js'
import { CARD_LABEL } from './playback.js'

const CARD_HEAD = { sms: '新消息', letter: '', note: '', news: '号外', terminal: '> SYSTEM', notice: '告示', diary: '', scroll: '' }

/**
 * 逐字显现：返回 [是否打完, 字, 立即打完]。hold 为真时先不开始（等字体分片下载完）。
 * 「打完」跟着这一拍的 key 走、在渲染时就复位：要是等 effect 再复位，新一句第一帧会带着上一句的「打完」整句露出来再消失。
 */
export function useTypewriter(beat, speed, { sound = true, hold = false } = {}) {
  const key = beat ? beat.key : ''
  const chars = React.useMemo(() => Array.from((beat && beat.text) || ''), [key, beat && beat.text])
  const [shown, setShown] = React.useState({ key, done: false })
  if (shown.key !== key) setShown({ key, done: false })
  const done = !speed || !chars.length || (shown.key === key && shown.done)
  React.useEffect(() => {
    if (!speed || !chars.length || hold) return undefined
    const finish = setTimeout(() => setShown({ key, done: true }), chars.length * speed + 220)
    let i = 0
    const tick = sound ? setInterval(() => {
      i += 2
      if (i >= chars.length) { clearInterval(tick); return }
      if (!/[\s，。、…！？,.!?]/.test(chars[i])) blip(beat.speaker, beat.type)
    }, speed * 2) : null
    return () => { clearTimeout(finish); if (tick) clearInterval(tick) }
  }, [key, chars, speed, sound, hold])
  return [done, chars, () => setShown({ key, done: true })]
}

export function DialogBox({ beat, chars, done, waiting, color, quick, progress, status, hiddenText }) {
  const speaker = beat.alias || beat.speaker
  const showName = speaker && beat.type !== 'narration'
  const speed = quick.speed
  return (
    <div className="fg-dialog" style={{ '--speaker': color || undefined }}>
      <div className="fg-box" />
      {showName && (
        <div className="fg-name" key={beat.speaker + beat.alias}>
          <div className="fg-name-plate">{speaker}</div>
          {beat.emo && quick.emoLabel && <div className="fg-name-sub">{quick.emoLabel}</div>}
        </div>
      )}
      {hiddenText && <div className="fg-text is-cardhint">〔 {CARD_LABEL[beat.card] || '卡片'} 〕</div>}
      {!hiddenText && (
        <div className={`fg-text is-${beat.type}${done ? ' is-done' : waiting ? ' is-wait' : ''}`} key={beat.key} aria-live="polite">
          {chars.map((ch, i) => <span key={i} className="fg-char" style={{ '--d': (i * speed) + 'ms' }}>{ch}</span>)}
        </div>
      )}
      {done && <div className="fg-wait" aria-hidden="true" />}
      {status && <div className="fg-status">{status}</div>}
      <div className="fg-progress"><i style={{ width: Math.round(progress * 100) + '%' }} /></div>
      <div className="fg-quick" onClick={e => e.stopPropagation()}>
        {quick.items.map(item => (
          <button key={item.id} type="button" className={item.on ? 'is-on' : ''} title={item.title} onClick={() => { sfx('select'); item.run() }} onMouseEnter={() => sfx('hover')}>{item.label}</button>
        ))}
      </div>
    </div>
  )
}

export function SceneCard({ beat }) {
  const kind = beat.card
  return (
    <div className="fg-card" data-card={kind} key={beat.key}>
      {CARD_HEAD[kind] ? <div className="fg-card-head">{CARD_HEAD[kind]}{kind === 'sms' && beat.speaker ? ` · ${beat.alias || beat.speaker}` : ''}</div> : null}
      <div className="fg-card-body">{beat.text}</div>
    </div>
  )
}

export function Choices({ choices, onChoose, onBack, waiting }) {
  const [free, setFree] = React.useState('')
  const list = choices || []
  return (
    <div className="fg-choices" onClick={e => e.stopPropagation()}>
      <div className="fg-choices-title">{list.length ? 'CHOICE' : waiting ? 'TO BE CONTINUED' : 'YOUR TURN'}</div>
      {list.map((text, i) => (
        <button key={text} type="button" className="fg-choice" data-n={String(i + 1).padStart(2, '0')} style={{ '--i': i }} onMouseEnter={() => sfx('hover')} onClick={() => { sfx('select'); onChoose(text) }}>{text}</button>
      ))}
      <form className="fg-free" style={{ '--i': list.length }} onSubmit={e => { e.preventDefault(); if (free.trim()) { sfx('select'); onChoose(free.trim()) } }}>
        <input value={free} onChange={e => setFree(e.target.value)} placeholder={list.length ? '或者，自己写下一步……' : '写下你的下一步……'} onKeyDown={e => e.stopPropagation()} />
        <button type="submit">GO</button>
      </form>
      <button type="button" className="fg-btn" style={{ marginTop: '1cqw' }} onClick={onBack}>回到聊天</button>
    </div>
  )
}
