// 对话框（逐字显现 + 打字音）、情境卡片（短信 / 信件 / 便签……）、选项。
import React from 'react'
import { blip, sfx } from './audio.js'
import { CARD_LABEL } from './playback.js'
import { SILENT, planLine } from '../../../lib/typing.js'

const CARD_HEAD = { sms: '新消息', letter: '', note: '', news: '号外', terminal: '> SYSTEM', notice: '告示', diary: '', scroll: '' }

/**
 * 逐字显现：返回 [是否打完, 字, 立即打完, 开始显现的时刻, 演出计划]。hold 为真时先不开始（等字体分片下载完）。
 * 「打完」跟着这一拍的 key 走、在渲染时就复位：要是等 effect 再复位，新一句第一帧会带着上一句的「打完」整句露出来再消失。
 * 怎么说出来由 lib/typing.js 的 planLine 定（演法、重音、标点停顿），打字音和落字特效（onFx）都按它的时间点走。
 * voice 是这句用谁的声音念（lib/sounds.js 的 lineVoice；null 不出声）。
 * 开始时刻是 performance.now()，还没开始时是 NaN（逆转式立绘的口型按它对齐）。
 */
export function useTypewriter(beat, speed, { sound = true, voice = null, hold = false, onFx = null } = {}) {
  const key = beat ? beat.key : ''
  const chars = React.useMemo(() => Array.from((beat && beat.text) || ''), [key, beat && beat.text])
  const emo = beat && beat.speaker ? (beat.emotions && beat.emotions[beat.speaker]) || beat.emo : ''
  const say = beat ? beat.say : ''
  const stress = beat ? beat.stress : ''
  const type = beat ? beat.type : 'narration'
  const plan = React.useMemo(() => planLine(chars, speed || 0, { say, stress, emo, type, seed: key }), [chars, speed, say, stress, emo, type, key])
  const [shown, setShown] = React.useState({ key, done: false })
  const [start, setStart] = React.useState({ key: '', at: NaN })
  if (shown.key !== key) setShown({ key, done: false })
  const done = !speed || !chars.length || (shown.key === key && shown.done)
  const fxRef = React.useRef(onFx)
  fxRef.current = onFx
  const voiceRef = React.useRef(voice)
  voiceRef.current = voice
  const pending = React.useRef([])
  const dropPending = () => { pending.current.forEach(clearTimeout); pending.current = [] }
  React.useEffect(() => {
    if (!speed || !chars.length || hold) return undefined
    const t0 = performance.now()
    setStart({ key, at: t0 })
    const { times, blip: delivery, fx } = plan
    const finish = setTimeout(() => setShown({ key, done: true }), times[times.length - 1] + speed + 220)
    pending.current = fx.map(f => setTimeout(() => { if (fxRef.current) fxRef.current(f) }, f.at))
    // 打字音跟着演出计划：每 delivery.every 个字响一下，标点、空白不响，成块蹦出来的字只响一下
    let next = 0
    const tick = sound ? setInterval(() => {
      const now = performance.now() - t0
      for (; next < chars.length && times[next] <= now; next += 1) {
        const sameBurst = next > 0 && times[next] === times[next - 1]
        if (next % delivery.every === 0 && !sameBurst && !SILENT.test(chars[next])) blip(voiceRef.current, delivery)
      }
      if (next >= chars.length) clearInterval(tick)
    }, Math.max(8, Math.min(speed, plan.gap))) : null
    return () => { clearTimeout(finish); dropPending(); if (tick) clearInterval(tick) }
  }, [key, chars, plan, speed, sound, hold])
  // 点一下直接打完：还没轮到的震屏、闪光、音效不再补放
  React.useEffect(() => { if (done) dropPending() }, [done])
  return [done, chars, () => setShown({ key, done: true }), start.key === key ? start.at : NaN, plan]
}

export function DialogBox({ beat, chars, plan, done, waiting, color, quick, progress, status, hiddenText }) {
  const speaker = beat.alias || beat.speaker
  const showName = speaker && beat.type !== 'narration'
  const speed = quick.speed
  const times = plan ? plan.times : null
  const marks = plan ? plan.marks : []
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
        <div className={`fg-text is-${beat.type}${plan && plan.say ? ' say-' + plan.say : ''}${done ? ' is-done' : waiting ? ' is-wait' : ''}`} key={beat.key} aria-live="polite">
          {chars.map((ch, i) => <span key={i} className={marks[i] ? 'fg-char is-' + marks[i] : 'fg-char'} style={{ '--d': (times ? times[i] : i * speed) + 'ms' }}>{ch}</span>)}
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
