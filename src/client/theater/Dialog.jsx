// 对话框（逐字显现 + 打字音）、情境卡片（短信 / 信件 / 便签……）、选项。
import React from 'react'
import { blip, sfx, audioClock, hushBlips } from './audio.js'
import { createLookahead, PUMP_MS } from '../../../lib/voice-clock.js'
import { CARD_LABEL, VOICE_LABEL } from './playback.js'
import { planLine } from '../../../lib/typing.js'

const CARD_HEAD = { sms: '新消息', letter: '', note: '', news: '号外', terminal: '> SYSTEM', notice: '告示', diary: '', scroll: '' }

/**
 * 逐字显现：返回 [是否打完, 字, 立即打完, 开始显现的时刻, 演出计划]。hold 为真时先不开始（等字体分片下载完）。
 * 「打完」跟着这一拍的 key 走、在渲染时就复位：要是等 effect 再复位，新一句第一帧会带着上一句的「打完」整句露出来再消失。
 * 怎么说出来由 lib/typing.js 的 planLine 定（演法、重音、标点停顿），打字音和落字特效（onFx）都按它的时间点走。
 * voice 是这句用谁的声音念（lib/sounds.js 的 lineVoice；null 不出声）。
 * 开始时刻是 performance.now()，还没开始时是 NaN（逆转式立绘的口型按它对齐）。
 * offStyles 是设置里关掉的演法（effects.js 的 offDeliveries），这几种按平常的念。
 * mood 是剧场按情绪库认好的说话人情绪（lib/voice-mood.js；不给时按这句的情绪认，NEUTRAL_MOOD 是不带情绪）。
 * prosody 为假时不要句调（lib/prosody.js），打字音照旧每几个字一下、音高不动。
 * 打字音排在音频时钟上（lib/voice-clock.js 的前瞻排程：主线程卡一下也不断、不挤成一团）；sync 为真时字整体推迟
 * 「声音排下去到真的出来」那么久（蓝牙耳机一两百毫秒），字和声音对得上。pan 是这句的声像（-1 左 ~ 1 右）。
 * 返回 [是否打完, 字, 立即打完, 第一个字出现的时刻, 演出计划, 字推迟了多少毫秒]。
 */
export function useTypewriter(beat, speed, { sound = true, voice = null, hold = false, onFx = null, offStyles = null, mood = null, prosody = true, sync = true, pan = 0 } = {}) {
  const key = beat ? beat.key : ''
  const chars = React.useMemo(() => Array.from((beat && beat.text) || ''), [key, beat && beat.text])
  const emo = beat && beat.speaker ? (beat.emotions && beat.emotions[beat.speaker]) || beat.emo : ''
  const say = beat ? beat.say : ''
  const stress = beat ? beat.stress : ''
  const type = beat ? beat.type : 'narration'
  const textfx = beat ? beat.textfx : null
  const plan = React.useMemo(() => planLine(chars, speed || 0, { say, stress, emo, type, seed: key, textfx, offStyles, mood, prosody }), [chars, speed, say, stress, emo, type, key, textfx, offStyles, mood, prosody])
  const [shown, setShown] = React.useState({ key, done: false })
  const [start, setStart] = React.useState({ key: '', at: NaN })
  if (shown.key !== key) setShown({ key, done: false })
  const done = !speed || !chars.length || (shown.key === key && shown.done)
  const fxRef = React.useRef(onFx)
  fxRef.current = onFx
  const voiceRef = React.useRef(voice)
  voiceRef.current = voice
  const panRef = React.useRef(pan)
  panRef.current = pan
  const pending = React.useRef([])
  const ticking = React.useRef(null)
  // 字推迟多久：开着打字音、要对齐时，等于声音的输出延迟（这一句开始时量一次，换句才重量）
  const lead = React.useMemo(() => { if (!sync || !sound || !speed) return 0; const c = audioClock(); return c && c.running ? c.delayMs : 0 }, [key, sync, sound, speed])
  // 点一下打完时：还没放的特效丢掉，打字音也停下（前瞻排下的那一小段也掐掉，不然字已经全出来了还在嘟嘟嘟）
  const dropPending = () => { pending.current.forEach(clearTimeout); pending.current = []; if (ticking.current) { ticking.current.stop(); ticking.current = null; hushBlips() } }
  React.useEffect(() => {
    if (!speed || !chars.length || hold) return undefined
    const t0 = performance.now() + lead // 第一个字真正出现的时刻（字整体推迟了 lead）
    setStart({ key, at: t0 })
    const { times, blip: delivery, fx } = plan
    const finish = setTimeout(() => setShown({ key, done: true }), lead + times[times.length - 1] + speed + 220)
    pending.current = fx.map(f => setTimeout(() => { if (fxRef.current) fxRef.current(f) }, lead + f.at))
    // 打字音跟着演出计划的音符（lib/prosody.js：按词取音、句调；关掉句调时每 delivery.every 个字一下）；
    // 文字效果、哽住那几个字按 plan.blips 的音量音高念，情绪（plan.mood）管气声、起音、发颤
    const notes = plan.notes || []
    const clock = sound && notes.length ? audioClock() : null
    if (!clock) return () => { clearTimeout(finish); dropPending() }
    const sounded = (note, when) => {
      const b = plan.blips && plan.blips[note.i]
      return { pitch: delivery.pitch * (b ? b.pitch : 1) * 2 ** ((note.semis || 0) / 12), gain: delivery.gain * (b ? b.gain : 1) * (note.gain ?? 1), hold: note.hold, glide: note.glide, jitter: note.jitter, mood: plan.mood, at: when, pan: panRef.current }
    }
    // 声音从现在开始排（它要晚 lead 才出来，正好跟推迟了 lead 的字对上）
    const la = createLookahead(notes, { start: clock.now, play: (note, when) => blip(voiceRef.current, sounded(note, when)) })
    const pump = () => { const c = audioClock(); if (c) la.pump(c.now); if (la.done()) clearInterval(timer) }
    const timer = setInterval(pump, PUMP_MS)
    ticking.current = { stop: () => { la.stop(); clearInterval(timer) } }
    pump()
    return () => { clearTimeout(finish); dropPending() }
  }, [key, chars, plan, speed, sound, hold])
  // 点一下直接打完：还没轮到的震屏、闪光、音效不再补放，打字音停下
  React.useEffect(() => { if (done) dropPending() }, [done])
  return [done, chars, () => setShown({ key, done: true }), start.key === key ? start.at : NaN, plan, lead]
}

/**
 * 双语对照的原文跟着翻译一起逐字出来：按进度对齐，翻译打到几成，原文就出到几成（两边字数不同也同时开始、同时打完）。
 * 返回 [[字, 出现的毫秒], ...]。
 */
function origChars(orig, times, count, speed) {
  const list = Array.from(orig)
  const at = i => (times && times.length ? times[Math.min(times.length - 1, i)] : i * speed)
  return list.map((ch, j) => [ch, count ? at(Math.floor((j / list.length) * count)) : 0])
}

/** away：插画正在出现这类时候对话框先让开（淡出），过后再回来。 */
/**
 * recall：短闪回里的一句 { tone 基调, name 名牌 blur 模糊压暗 | hide 不显示 | show 照常 }。对话框换成回忆的样子（theater.css 的 data-recall），
 * 「回忆」小标和情绪小字不出：回忆里的声音靠对话框和打字音认出来，不靠界面上的标签。
 * face：短闪回时回忆里说话的人的小头像（Stage.jsx 的 RecallFace，设置里选了才有），挂在对话框右上角。
 */
export function DialogBox({ beat, chars, plan, done, waiting, away = false, color, quick, progress, status, hiddenText, recall = null, face = null, lead = 0 }) {
  const speaker = beat.alias || beat.speaker
  const showName = speaker && beat.type !== 'narration' && !(recall && recall.name === 'hide')
  const speed = quick.speed
  const times = plan ? plan.times : null
  const marks = plan ? plan.marks : []
  const tx = plan ? plan.tx : []
  // 一个字的样子：重音、文字效果（tx-*，越说越大 / 越小按 --k 变，波浪按 --i 错开）
  const charClass = i => 'fg-char' + (marks[i] ? ' is-' + marks[i] : '') + (tx[i] ? ' tx-' + tx[i] : '')
  const charStyle = i => ({ '--d': lead + (times ? times[i] : i * speed) + 'ms', ...(tx[i] ? { '--k': plan.txk[i], '--i': plan.txi[i] } : {}) })
  // 声音的样子：名牌旁边一个小标（带跳动的音量条），对话框和字也换个样子（样式在 theater.css 的 data-voice）
  const voiceChip = !recall && beat.voice && VOICE_LABEL[beat.voice] ? <div className="fg-voice-chip" data-voice={beat.voice}><i /><i /><i /><span>{VOICE_LABEL[beat.voice]}</span></div> : null
  return (
    <div className={`fg-dialog${away ? ' is-away' : ''}`} data-voice={beat.voice || undefined} data-recall={recall ? recall.tone || 'warm' : undefined} data-recall-name={recall ? recall.name : undefined} style={{ '--speaker': color || undefined }}>
      <div className="fg-box" />
      {face}
      {(showName || voiceChip) && (
        <div className="fg-name" key={beat.speaker + beat.alias + (beat.voice || '')}>
          {showName && <div className="fg-name-plate">{speaker}</div>}
          {voiceChip}
          {showName && !recall && beat.emo && quick.emoLabel && <div className="fg-name-sub">{quick.emoLabel}</div>}
        </div>
      )}
      {hiddenText && <div className="fg-text is-cardhint">〔 {CARD_LABEL[beat.card] || '卡片'} 〕</div>}
      {!hiddenText && (
        <div className={`fg-text is-${beat.type}${plan && plan.say ? ' say-' + plan.say : ''}${done ? ' is-done' : waiting ? ' is-wait' : ''}`} key={beat.key} aria-live="polite">
          {beat.orig && <div className="fg-orig" lang="und">{origChars(beat.orig, times, chars.length, speed).map(([ch, d], i) => <span key={i} className="fg-char" style={{ '--d': lead + d + 'ms' }}>{ch}</span>)}</div>}
          <span className="fg-line">{chars.map((ch, i) => <span key={i} className={charClass(i)} style={charStyle(i)}>{ch}</span>)}</span>
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
