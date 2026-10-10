// 剧场：全屏 galgame 播放器。读宿主整理好的场景脚本，逐拍演出；导演没整理完的部分先按原文演。
import React from 'react'
import { api, ui, useUi, useGameView, useConfig, useUpdate, useMusic, updateAvailable, toast, openTheater, assetUrl, hostName } from '../api.js'
import { buildBeats, TIME_LABEL, WEATHER_LABEL, MOOD_LABEL, emotionLabel, pickTrack, stageRatio } from './playback.js'
import { Backdrop, Cast, CgLayer, TitleCard, Flash, Particles, useCamera, useHits, aaOf } from './Stage.jsx'
import { aaTurnWait } from './AaSprite.jsx'
import { DialogBox, SceneCard, Choices, useTypewriter } from './Dialog.jsx'
import { Backlog, Gallery, CastPanel, Settings, RestartNotice } from './Panels.jsx'
import { DirectorLog } from './DirectorLog.jsx'
import { useFaceFramer } from './faceFramer.js'
import { playBgm, stopBgm, sfx, stinger, configureSounds } from './audio.js'
import { loadSkinFonts, loadGlyphs } from './skins.js'
import { castVoices, lineVoice } from '../../../lib/sounds.js'

// 读到哪一句：每局记在浏览器里。
const POS_KEY = gameId => 'flowgal:pos:' + gameId
const readPos = gameId => { try { return localStorage.getItem(POS_KEY(gameId)) || '' } catch { return '' } }
const writePos = (gameId, key) => { try { localStorage.setItem(POS_KEY(gameId), key) } catch {} }

/** 提前下载后面几拍要用的字形分片。 */
const GLYPH_AHEAD = 12
/** 当前这句的字形没下载完时，最多等这么久再开始逐字显示。 */
const GLYPH_WAIT = 1200
/** 正文字体画台词；标题字体画名牌、地点和信件类卡片。 */
const glyphsOf = list => ({
  body: list.map(b => b.text).join(''),
  display: list.map(b => (b.alias || b.speaker) + b.scene.location + (b.card ? b.text : '')).join(''),
})

/** 把选项 / 自由输入填进 Tavern 的输入框（尽力而为），同时复制到剪贴板。 */
function fillComposer(text) {
  try { navigator.clipboard && navigator.clipboard.writeText(text).catch(() => {}) } catch {}
  const candidates = [...document.querySelectorAll('textarea, [contenteditable="true"]')]
    .filter(el => !el.closest('.fg-theater') && el.getClientRects().length)
  const el = candidates.sort((a, b) => b.getBoundingClientRect().bottom - a.getBoundingClientRect().bottom)[0]
  if (!el) return false
  try {
    if (el.tagName === 'TEXTAREA') {
      const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set
      setter.call(el, text)
      el.dispatchEvent(new Event('input', { bubbles: true }))
    } else {
      el.focus()
      document.execCommand('selectAll', false)
      document.execCommand('insertText', false, text)
    }
    setTimeout(() => { try { el.focus() } catch {} }, 60)
    return true
  } catch { return false }
}

function firstBeatOfTurn(beats, turn) {
  const i = beats.findIndex(b => b.turn === turn)
  return i < 0 ? -1 : i
}

/**
 * 这一拍说话人要转头时，返回 true 直到他转完（转头时长 + 转完停的那一下，按他的素材包算）。
 * 判断「要转头」：说话人在台上、这一拍的朝向和上一拍不一样、他的立绘是有这个姿势的 v2 素材包；瞬间显示（跳过、标题卡）时不等。
 * 在渲染时就算好截止时刻，第一帧就挡住打字机，不会先出几个字再停。
 */
function useTurnHold(beat, prev, people, view, speed) {
  const ref = React.useRef({ key: '', until: 0 })
  const [, wake] = React.useReducer(n => n + 1, 0)
  if (beat && ref.current.key !== beat.key) {
    let ms = 0
    const name = beat.speaker
    if (speed > 0 && name && (beat.cast || []).some(c => c.name === name)) {
      const facing = b => (b && b.facing && b.facing[name]) || ''
      if (facing(beat) !== facing(prev)) ms = aaTurnWait(aaOf(people.get(name), beat, name, view && view.emotions), facing(prev), facing(beat))
    }
    ref.current = { key: beat.key, until: ms ? performance.now() + ms : 0 }
  }
  const waiting = Boolean(beat) && performance.now() < ref.current.until
  React.useEffect(() => {
    if (!waiting) return undefined
    const t = setTimeout(wake, Math.max(0, ref.current.until - performance.now()) + 5)
    return () => clearTimeout(t)
  }, [waiting, beat && beat.key])
  return waiting
}

export function TheaterRoot() {
  const s = useUi()
  const data = useConfig()
  const cfg = data && data.config
  const watching = s.open || Boolean(s.resume) || Boolean(cfg && cfg.ui.autoOpen && s.lastGameId)
  const gameId = s.open ? s.gameId : (s.resume && s.resume.gameId) || s.lastGameId
  const { view, error } = useGameView(gameId, watching)
  // 表情只换脸：动作底图画好后在这里认脸（认脸模型只能在浏览器里跑）
  useFaceFramer(gameId, view)
  const maxTurn = view && view.turns.length ? view.turns[view.turns.length - 1].turn : -1
  const seen = React.useRef({ gameId: '', turn: -1 })

  // 选了选项回到聊天后：下一轮正文一落地就自动回到剧场（导演还在整理也先演原文）。
  React.useEffect(() => {
    if (!view || view.gameId !== gameId) return
    if (seen.current.gameId !== gameId) { seen.current = { gameId, turn: maxTurn }; }
    const isNew = maxTurn > seen.current.turn
    seen.current.turn = Math.max(seen.current.turn, maxTurn)
    if (s.open || !isNew) return
    if ((s.resume && s.resume.gameId === gameId && maxTurn > s.resume.afterTurn) || (cfg && cfg.ui.autoOpen)) openTheater(gameId, { turn: maxTurn })
  }, [view, maxTurn, s.open])

  React.useEffect(() => { if (!s.open) stopBgm() }, [s.open])
  if (!s.open) return null
  return <Theater key={s.gameId} gameId={s.gameId} view={view} viewError={error} cfg={cfg} startTurn={s.startTurn} panel={s.panel} panelArg={s.panelArg} />
}

function Theater({ gameId, view, viewError, cfg, startTurn, panel: initialPanel, panelArg }) {
  const ui0 = (cfg && cfg.ui) || { skin: 'stellar', textSpeed: 30, autoDelay: 1400, blip: true, bgm: true, bgmVolume: 0.45, particles: true, fontBase: '' }
  const { beats, byKey } = React.useMemo(() => buildBeats(view), [view])
  const [index, setIndex] = React.useState(-1)
  const [title, setTitle] = React.useState(startTurn == null && !initialPanel)
  const [panel, setPanel] = React.useState(initialPanel || '')
  const [settingsTab, setSettingsTab] = React.useState(initialPanel === 'settings' && typeof panelArg === 'string' ? panelArg : 'look')
  const update = useUpdate(Boolean(cfg && cfg.ui.updateCheck))
  const [auto, setAuto] = React.useState(false)
  const [skip, setSkip] = React.useState(false)
  const [hidden, setHidden] = React.useState(false)
  const [choosing, setChoosing] = React.useState(false)
  const [closing, setClosing] = React.useState(false)
  const anchor = React.useRef('') // 当前拍的 key：视图刷新后按 key 找回位置
  const rootRef = React.useRef(null)
  const [glyphKey, setGlyphKey] = React.useState('') // 字形已经就绪的那一拍
  const placed = React.useRef(false)

  // 初始位置：指定轮 → 上次读到的位置 → 最新一轮开头。
  // 指定的轮次可能还没出现在（关剧场前留下的旧）视图里：等一次刷新再决定。
  const waits = React.useRef(0)
  React.useEffect(() => {
    if (placed.current || !beats.length) return
    let i = -1
    if (startTurn != null) i = firstBeatOfTurn(beats, Number(startTurn))
    if (i < 0 && startTurn != null && waits.current++ < 1) return
    placed.current = true
    if (i < 0) { const saved = byKey.get(readPos(gameId)); if (saved != null) i = saved }
    if (i < 0) i = firstBeatOfTurn(beats, beats[beats.length - 1].turn)
    anchor.current = beats[i].key
    setIndex(i)
  }, [beats])
  // 视图刷新（导演整理完 / 新一轮）后保持在同一拍。
  React.useEffect(() => {
    if (!placed.current || !anchor.current) return
    const i = byKey.get(anchor.current)
    if (i != null && i !== index) setIndex(i)
  }, [byKey])

  const beat = index >= 0 ? beats[index] : null
  const speed = skip ? 0 : ui0.textSpeed
  const holdText = Boolean(beat) && glyphKey !== beat.key
  const typeSpeed = title || panel ? 0 : speed
  const blipOn = Boolean(ui0.blip) && !skip && !title
  const sfxOn = ui0.sfx !== false && !skip && !title
  React.useEffect(() => { configureSounds(cfg && cfg.ui) }, [cfg])
  const stageRef = React.useRef(null)
  const flashRef = React.useRef(null)
  const hit = useHits(stageRef, flashRef, sfxOn)
  const people = React.useMemo(() => new Map(((view && view.cast) || []).map(p => [p.name, p])), [view])
  // 这句用谁的声音念：旁白按设置，台词和心声按说话人档案里的声音（没指定时按性别自动分，一局里尽量不撞）
  const voices = React.useMemo(() => castVoices((view && view.cast) || [], ui0), [view, ui0])
  const voice = React.useMemo(() => (beat ? lineVoice(beat.type, beat.speaker, voices, ui0) : null), [beat && beat.type, beat && beat.speaker, voices, ui0])
  // 说话人这句侧头 / 转回来（v2 逆转式立绘）：文字等他转完再出（原作的前置动作也是播完才出字）
  const turnHold = useTurnHold(beat, index > 0 ? beats[index - 1] : null, people, view, typeSpeed)
  const [done, chars, finish, typedAt, typed] = useTypewriter(beat, typeSpeed, { sound: blipOn, voice, hold: holdText || turnHold, onFx: title ? null : hit })
  // 说话人的逆转式立绘按这个对口型（没有素材包的立绘用不到）
  const talk = React.useMemo(() => (beat ? { key: beat.key, type: beat.type, chars, times: typed.times, gap: typed.gap, mouth: typed.mouth, marks: typed.marks, speed: typeSpeed, startedAt: typedAt, done } : null), [beat, chars, typed, typeSpeed, typedAt, done])
  // 灵光一闪（漫画符号是灯泡）：逆转裁判那一声「叮」
  React.useEffect(() => { if (beat && beat.sym === 'bulb' && sfxOn) stinger('ding') }, [beat && beat.key])
  const cam = useCamera(title ? null : beat)
  const atEnd = beat && index === beats.length - 1

  React.useEffect(() => { loadSkinFonts(ui0.skin, ui0.fontBase) }, [ui0.skin, ui0.fontBase])
  // 字体是按字切片的：这句用到的分片下载完再开始逐字显示，不然先用系统字体画、到了再换，整句会闪一下。
  React.useEffect(() => {
    if (!beat) return undefined
    let live = true
    loadSkinFonts(ui0.skin, ui0.fontBase)
      .then(() => loadGlyphs(rootRef.current, glyphsOf([beat]), GLYPH_WAIT))
      .then(() => { if (live) setGlyphKey(beat.key) })
    return () => { live = false }
  }, [beat && beat.key, ui0.skin, ui0.fontBase])
  // 读这句的时候顺手把后面几句的分片下好。
  React.useEffect(() => {
    if (index < 0) return
    loadSkinFonts(ui0.skin, ui0.fontBase).then(() => loadGlyphs(rootRef.current, glyphsOf(beats.slice(index + 1, index + 1 + GLYPH_AHEAD))))
  }, [index, beats, ui0.skin, ui0.fontBase])
  // 配乐：放导演选的曲子；导演还没整理到的轮次按曲目描述粗配，换场才换歌。
  const scene = beat ? beat.scene : (beats[beats.length - 1] || {}).scene
  const tracks = useMusic()
  const musicBeat = beat || beats[beats.length - 1]
  const track = React.useMemo(() => (ui0.bgm ? pickTrack(musicBeat, tracks, assetUrl) : null), [ui0.bgm, tracks, musicBeat && musicBeat.bgm, scene && scene.mood, scene && scene.location])
  React.useEffect(() => { if (track || !ui0.bgm) playBgm(track, ui0.bgmVolume) }, [track && track.id, ui0.bgm, ui0.bgmVolume])

  const go = React.useCallback(i => {
    if (!beats.length) return
    const next = Math.max(0, Math.min(beats.length - 1, i))
    anchor.current = beats[next].key
    writePos(gameId, beats[next].key)
    setIndex(next)
  }, [beats, gameId])

  const advance = React.useCallback(() => {
    if (!beat) return
    if (!done) { finish(); return }
    if (atEnd) { setAuto(false); setSkip(false); setChoosing(true); return }
    sfx('page')
    go(index + 1)
  }, [beat, done, atEnd, index, go, finish])

  // 自动 / 快进。
  React.useEffect(() => {
    if (title || panel || choosing || !beat) return undefined
    if (skip) { const t = setTimeout(() => (atEnd ? setSkip(false) : go(index + 1)), 70); return () => clearTimeout(t) }
    if (auto && done && !atEnd) { const t = setTimeout(() => go(index + 1), ui0.autoDelay + chars.length * 18); return () => clearTimeout(t) }
    return undefined
  }, [auto, skip, done, index, title, panel, choosing, atEnd])

  // 读到末尾时新的一拍到了（导演补了单元 / 新一轮）：继续往下演。
  const prevLen = React.useRef(beats.length)
  React.useEffect(() => {
    if (beats.length > prevLen.current && choosing && index === prevLen.current - 1) { setChoosing(false); go(index + 1) }
    prevLen.current = beats.length
  }, [beats.length])

  const close = React.useCallback(() => {
    setClosing(true)
    stopBgm()
    setTimeout(() => ui.set({ open: false }), 320)
  }, [])

  const choose = text => {
    const ok = fillComposer(text)
    toast(ok ? '已填进输入框，发送后剧场会自动接着演' : '已复制到剪贴板，粘贴到输入框发送即可')
    ui.set({ resume: { gameId, afterTurn: beat ? beat.turn : -1 } })
    setChoosing(false)
    close()
  }

  React.useEffect(() => {
    const onKey = e => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable)) return
      if (e.key === 'Escape') { e.preventDefault(); if (panel) setPanel(''); else if (choosing) setChoosing(false); else if (hidden) setHidden(false); else close(); return }
      if (panel || title) return
      if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); if (hidden) setHidden(false); else if (!choosing) advance() }
      else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); go(index - 1) }
      else if (e.key === 'a' || e.key === 'A') setAuto(v => !v)
      else if (e.key === 'h' || e.key === 'H') setHidden(v => !v)
      else if (e.key === 'l' || e.key === 'L') setPanel('log')
      else if (e.key === 'Control') setSkip(true)
    }
    const onUp = e => { if (e.key === 'Control') setSkip(false) }
    window.addEventListener('keydown', onKey, true)
    window.addEventListener('keyup', onUp, true)
    return () => { window.removeEventListener('keydown', onKey, true); window.removeEventListener('keyup', onUp, true) }
  }, [advance, go, index, panel, title, choosing, hidden, close])

  const directing = view && view.turns.some(t => t.status === 'directing')
  const queue = (view && view.queue) || { running: [], waiting: [] }
  const drawing = queue.running.filter(id => id.includes(':' + gameId + ':')).length + queue.waiting.filter(id => id.includes(':' + gameId + ':')).length
  const speakerPerson = beat && people.get(beat.speaker)
  const color = beat && beat.speaker === '我' ? 'var(--accent2)' : speakerPerson ? speakerPerson.color : ''
  const progressInTurn = beat ? (() => { const all = beats.filter(b => b.turn === beat.turn); return (all.indexOf(beat) + 1) / all.length })() : 0
  const status = beat ? (beat.status === 'directing' ? `第 ${beat.turn} 轮 · 导演整理中，先按原文演` : beat.status === 'failed' ? `第 ${beat.turn} 轮 · 没整理好，按原文演` : '') : ''
  const quick = {
    speed,
    emoLabel: beat && beat.emo ? emotionLabel(beat.emo) : '',
    items: [
      { id: 'auto', label: 'AUTO', title: '自动播放（A）', on: auto, run: () => { setAuto(v => !v); setSkip(false) } },
      { id: 'skip', label: 'SKIP', title: '快进（按住 Ctrl）', on: skip, run: () => { setSkip(v => !v); setAuto(false) } },
      { id: 'log', label: 'LOG', title: '回想（L）', run: () => setPanel('log') },
      { id: 'director', label: 'DIR', title: '导演日志：每次后台整理的提示词、实时输出和结果', run: () => setPanel('director') },
      { id: 'cg', label: 'CG', title: '鉴赏', run: () => setPanel('gallery') },
      { id: 'cast', label: 'CAST', title: '人物志', run: () => setPanel('cast') },
      { id: 'hide', label: 'HIDE', title: '隐藏界面（H）', run: () => setHidden(true) },
      { id: 'config', label: 'CONFIG', title: '设置', run: () => setPanel('settings') },
    ],
  }

  const stageBeat = beat || (beats.length ? beats[beats.length - 1] : null)
  const stageScene = stageBeat ? stageBeat.scene : { location: '', time: 'night', weather: 'stars', mood: 'calm' }
  const latest = beats.length ? beats[beats.length - 1] : null
  const cardTitle = (view && view.card && view.card.name) || 'FlowGal'

  const titleMenu = [
    beats.length && readPos(gameId) ? { id: 'continue', label: '继续', en: 'Continue', run: () => { setTitle(false); sfx('open') } } : null,
    latest ? { id: 'latest', label: '最新一幕', en: 'Latest', run: () => { go(firstBeatOfTurn(beats, latest.turn)); setTitle(false); sfx('open') } } : null,
    !beats.length && gameId ? { id: 'opening', label: '整理开场白', en: 'Prologue', run: async () => {
      try { await api.direct(gameId, 0).catch(() => api.direct(gameId, 1)); toast('开场已整理'); setTitle(false) } catch (e) { toast(String(e.message || e), 'error') }
    } } : null,
    beats.length ? { id: 'log', label: '回想', en: 'Backlog', run: () => setPanel('log') } : null,
    gameId ? { id: 'director', label: '导演日志', en: 'Director', run: () => setPanel('director') } : null,
    { id: 'gallery', label: '鉴赏', en: 'Gallery', run: () => setPanel('gallery') },
    { id: 'cast', label: '人物志', en: 'Characters', run: () => setPanel('cast') },
    updateAvailable(update) ? { id: 'update', label: '更新插件', en: 'New version', badge: true, run: () => { setSettingsTab('about'); setPanel('settings') } } : null,
    { id: 'settings', label: '设置', en: 'Config', run: () => { setSettingsTab('look'); setPanel('settings') } },
    { id: 'quit', label: '回到聊天', en: 'Return', run: close },
  ].filter(Boolean)

  return (
    <div ref={rootRef} className={`fg-theater${closing ? ' is-closing' : ''}${hidden ? ' fg-ui-hidden' : ''}`} data-skin={ui0.skin} style={{ '--stage-ar': stageRatio(cfg) }} role="dialog" aria-label="FlowGal 剧场">
      <div className="fg-stage" ref={stageRef} onClick={() => { if (hidden) { setHidden(false); return } if (!title && !panel && !choosing) advance() }}
        onWheel={e => { if (!title && !panel && e.deltaY < -30) setPanel('log') }}>
        <div className="fg-camera" data-cam={cam}>
          <Backdrop scene={stageScene} view={view} transition={stageBeat ? (stageBeat.sceneEnter ? stageBeat.transition : 'dissolve') : 'dissolve'} />
          <div className="fg-grade" data-time={stageScene.time} />
          {stageBeat && <Cast beat={title ? { ...stageBeat, speaker: '', sym: '' } : stageBeat} view={view} talk={title ? null : talk} />}
          {stageBeat && !title && <CgLayer beat={stageBeat} />}
          <Particles weather={stageScene.weather} enabled={ui0.particles !== false} />
          <div className="fg-vignette" />
        </div>
        {beat && !title && <Flash beat={beat} />}
        <div className="fg-hitflash" ref={flashRef} aria-hidden="true" />
        {!panel && <RestartNotice floating />}
        {beat && !title && <TitleCard beat={beat} />}

        {!title && beat && (
          <div className="fg-hud">
            <div className="fg-hud-bar" />
            <div>
              <div className="fg-hud-place">{beat.scene.location || `第 ${beat.turn} 轮`}</div>
              <div className="fg-hud-meta">
                <span>{TIME_LABEL[beat.scene.time] || ''}</span>
                {beat.scene.weather && beat.scene.weather !== 'clear' && <span>{WEATHER_LABEL[beat.scene.weather]}</span>}
                {beat.scene.mood && <span>♪ {MOOD_LABEL[beat.scene.mood]}</span>}
              </div>
            </div>
          </div>
        )}
        {!title && (
          <div className="fg-topright" onClick={e => e.stopPropagation()}>
            {directing && <button type="button" className="fg-pill is-busy is-link" title="看导演正在写什么" onClick={() => setPanel('director')}>导演整理中 ›</button>}
            {drawing > 0 && <span className="fg-pill is-busy">出图 {drawing}</span>}
            {track && <span className="fg-pill" title={track.name}>♪ {track.name}</span>}
            {viewError && <span className="fg-pill fg-err" title={viewError}>连接中断，重连中</span>}
            <button type="button" className="fg-iconbtn" title="回到聊天（Esc）" onClick={close}>✕</button>
          </div>
        )}

        {beat && !title && beat.card && <SceneCard beat={beat} />}
        {beat && !title && (
          <DialogBox beat={beat} chars={chars} plan={typed} done={done} waiting={holdText} color={color} quick={quick} progress={progressInTurn} status={status} hiddenText={Boolean(beat.card)} />
        )}
        {!beat && !title && (
          <div className="fg-choices"><div className="fg-choices-title">{view ? '这一局还没有可以演的内容' : '读取中'}</div></div>
        )}
        {choosing && beat && <Choices choices={beat.choices} waiting={directing} onChoose={choose} onBack={close} />}

        {title && (
          <div className="fg-title" onClick={e => e.stopPropagation()}>
            <div className="fg-title-kicker">FlowGal · {hostName() === 'st' ? 'SillyTavern' : 'DSH Tavern'}</div>
            <div className="fg-title-logo">{cardTitle}</div>
            <div className="fg-title-sub">{latest ? `第 ${latest.turn} 轮 · ${latest.scene.location || '—'} · ${TIME_LABEL[latest.scene.time] || ''}` : gameId ? '开场白还没有整理' : '先在聊天里打开一局'}</div>
            <div className="fg-title-menu">
              {titleMenu.map((m, i) => (
                <button key={m.id} type="button" className={m.badge ? 'is-new' : undefined} style={{ '--i': i }} onMouseEnter={() => sfx('hover')} onClick={() => { sfx('select'); m.run() }}>{m.label}<span>{m.en}</span></button>
              ))}
            </div>
            <div className="fg-title-foot">FlowGal · 字体 思源 / 霞鹜文楷 / 马善政 / Cormorant（SIL OFL）</div>
          </div>
        )}

        {panel === 'log' && <Backlog beats={beats} index={index} gameId={gameId} onClose={() => setPanel('')} onJump={i => { go(i); setPanel(''); setTitle(false) }} />}
        {panel === 'gallery' && <Gallery view={view} gameId={gameId} focusId={panelArg} onClose={() => setPanel('')} />}
        {panel === 'cast' && <CastPanel view={view} gameId={gameId} onClose={() => setPanel('')} />}
        {panel === 'director' && <DirectorLog gameId={gameId} focusTurn={panelArg} onClose={() => setPanel('')} />}
        {panel === 'settings' && <Settings initialTab={settingsTab} onClose={() => setPanel('')} onDirectorLog={gameId ? () => setPanel('director') : null} />}
      </div>
    </div>
  )
}

export function Toast() {
  const s = useUi()
  if (!s.toast) return null
  return <div className={`fg-toast${s.toast.tone === 'error' ? ' is-error' : ''}`} key={s.toast.at}>{s.toast.text}</div>
}
