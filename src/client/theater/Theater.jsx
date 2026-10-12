// 剧场：全屏 galgame 播放器。读宿主整理好的场景脚本，逐拍演出；导演没整理完的部分先按原文演。
import React from 'react'
import { api, ui, useUi, useGameView, useConfig, useUpdate, useMusic, useSoundlib, updateAvailable, toast, openTheater, assetUrl, hostName } from '../api.js'
import { buildBeats, TIME_LABEL, WEATHER_LABEL, MOOD_LABEL, LIGHT_LABEL, FX_LABEL, MODE_LABEL, emotionLabel, pickTrack, stageRatio, cgSrc, beatHold, WAKE_SWAP_MS } from './playback.js'
import { Backdrop, backgroundFor, Cast, CgLayer, SplitPanel, RecallLayer, RecallFace, TitleCard, CutCard, CUT_MS, HAZE_MS, RECALL_HOLD_MS, FadeLayer, Flash, Particles, useCamera, useHits } from './Stage.jsx'
import { DialogBox, SceneCard, Choices, useTypewriter } from './Dialog.jsx'
import { Backlog, Gallery, CastPanel, Settings, RestartNotice } from './Panels.jsx'
import { DirectorLog } from './DirectorLog.jsx'
import { useFaceFramer } from './faceFramer.js'
import { playBgm, playAmbience, stopAll, playLibSound, sfx, stinger, configureSounds } from './audio.js'
import { loadSkinFonts, loadGlyphs } from './skins.js'
import { castVoices, lineVoice } from '../../../lib/sounds.js'

// 读到哪一句：每局记在浏览器里。
const POS_KEY = gameId => 'flowgal:pos:' + gameId
const readPos = gameId => { try { return localStorage.getItem(POS_KEY(gameId)) || '' } catch { return '' } }
const writePos = (gameId, key) => { try { localStorage.setItem(POS_KEY(gameId), key) } catch {} }

/** 慢动作、时间停止时雨雪这些粒子的流速。 */
const TIME_FLOW = { slowmo: 0.12, timestop: 0 }

/** 提前下载后面几拍要用的字形分片。 */
const GLYPH_AHEAD = 12
/** 当前这句的字形没下载完时，最多等这么久再开始逐字显示。 */
const GLYPH_WAIT = 1200
/** 正文字体画台词；标题字体画名牌、地点和信件类卡片。 */
const glyphsOf = list => ({
  body: list.map(b => b.text).join(''),
  display: list.map(b => (b.alias || b.speaker) + b.scene.location + (b.card ? b.text : '') + (b.cut ? b.cut.text : '')).join(''),
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

  React.useEffect(() => { if (!s.open) stopAll() }, [s.open])
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
  const closingRef = React.useRef(false) // 关闭动画那 320ms 里不再开始放任何声音
  // 剧场不管怎么被卸载（关掉、换局），声音都停下
  React.useEffect(() => () => stopAll(), [])
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
  // 「間」：像 galgame 那样，这一句的字出来之前先停一下，点一下跳过，快进时不等——
  // 过场字卡（三小时后、与此同时……）收起前、起雾转场（进出回忆）和短闪回的进出，等画面变过去再出字；
  // 插画出现、换了地方时对话框先让开，等画面出来再接着念；导演写的停顿（pause）按它写的停。后三样的规则在 playback.js 的 beatHold，
  // 跟上一拍画面上的比：往回翻到插画已经在画面上的那句、读到一半插画才画好，都不等。几样同时有取最长的。
  const cgOn = beat && !title && beat.cg && cgSrc(beat.cg, assetUrl) ? beat.cg.id : ''
  const shownRef = React.useRef({ key: '', beat: null, was: null, cg: '', place: '', mode: '', hold: { ms: 0, away: false } })
  if (beat && shownRef.current.key !== beat.key) {
    const was = shownRef.current
    shownRef.current = { key: beat.key, beat, was: was.beat, cg: cgOn, place: beat.scene.location, mode: beat.mode, hold: beatHold(beat, { cg: cgOn, was }) }
  } else if (shownRef.current.cg !== cgOn) shownRef.current = { ...shownRef.current, cg: cgOn }
  const hold = beat && !title && shownRef.current.key === beat.key ? shownRef.current.hold : { ms: 0, away: false }
  // 短闪回的演法（设置）：只有「压暗画面」进出时起雾、等画面变过去；另外两种画面不动，直接出字
  const recallStyle = ui0.recall || 'text'
  const recallTone = ui0.recallTone && ui0.recallTone !== 'auto' ? ui0.recallTone : '' // 设置里固定了一种基调
  const edgeMs = !beat || title ? 0 : beat.cut ? CUT_MS : beat.transition === 'haze' ? HAZE_MS : recallStyle === 'ghost' ? RECALL_HOLD_MS[beat.recallEdge] || 0 : 0
  const pauseMs = speed > 0 ? Math.max(edgeMs, hold.ms) : 0
  const [pauseSeen, setPauseSeen] = React.useState('')
  const pausing = pauseMs > 0 && pauseSeen !== beat.key
  const cutting = pausing && Boolean(beat.cut)
  React.useEffect(() => {
    if (!pausing) return undefined
    const t = setTimeout(() => setPauseSeen(beat.key), pauseMs)
    return () => clearTimeout(t)
  }, [pausing, beat && beat.key])
  const holdText = (Boolean(beat) && glyphKey !== beat.key) || pausing
  // 从回忆里醒过来：回忆褪白的这段时间舞台还演着回忆的最后一拍、配乐停下，白到最浓时（WAKE_SWAP_MS）才换成现在；点一下直接换
  const [wokeKey, setWokeKey] = React.useState('')
  const waking = pausing && Boolean(hold.wake) && Boolean(shownRef.current.was) && wokeKey !== beat.key
  React.useEffect(() => {
    if (!waking) return undefined
    const t = setTimeout(() => setWokeKey(beat.key), WAKE_SWAP_MS)
    return () => clearTimeout(t)
  }, [waking, beat && beat.key])
  // 打开回想、设置这类面板时不把字速改成 0：改成 0 再改回来，关面板时这句会从头再打一遍（还带着打字音）。
  // 面板一打开就把这句直接打完（见下面的 effect），关掉后停在打完的样子。
  const typeSpeed = title ? 0 : speed
  const blipOn = Boolean(ui0.blip) && !skip && !title
  const sfxOn = ui0.sfx !== false && !skip && !title
  React.useEffect(() => { configureSounds(cfg && cfg.ui) }, [cfg])
  const stageRef = React.useRef(null)
  const flashRef = React.useRef(null)
  const hit = useHits(stageRef, flashRef, sfxOn)
  const people = React.useMemo(() => new Map(((view && view.cast) || []).map(p => [p.name, p])), [view])
  // 这句用谁的声音念：旁白按设置，台词和心声按说话人档案里的声音（没指定时按性别自动分，一局里尽量不撞）
  const voices = React.useMemo(() => castVoices((view && view.cast) || [], ui0), [view, ui0])
  // 声音的样子（电话里、广播、心灵感应……）跟着这句走；齐声时几个人的声音一起响
  const voice = React.useMemo(() => {
    if (!beat) return null
    const names = beat.speakers || [beat.speaker]
    const main = lineVoice(beat.type, names[0], voices, ui0)
    if (!main || !beat.voice) return main
    const also = beat.voice === 'chorus' ? names.slice(1).map(name => lineVoice(beat.type, name, voices, ui0)).filter(Boolean) : []
    // 短闪回里的回忆声按基调闷得深浅不一样（audio.js 的 MEMORY_DEPTH）
    const tone = beat.recall ? recallTone || beat.recall.tone : ''
    return { ...main, style: beat.voice, ...(also.length ? { also } : {}), ...(tone ? { tone } : {}) }
  }, [beat && beat.type, beat && beat.speaker, beat && beat.voice, beat && beat.recall, recallTone, voices, ui0])
  const [done, chars, finish, typedAt, typed] = useTypewriter(beat, typeSpeed, { sound: blipOn, voice, hold: holdText, onFx: title ? null : hit })
  // 说话人的逆转式立绘按这个对口型（没有素材包的立绘用不到）
  React.useEffect(() => { if (panel && !done) finish() }, [panel, done])
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
  // 定好从哪一拍开始演之前不放：不然先按最后一拍放一首，定位后又换一首，一进剧场声音就卡一下。
  const musicBeat = waking ? null : beat
  const track = React.useMemo(() => (ui0.bgm ? pickTrack(musicBeat, tracks, assetUrl) : null), [ui0.bgm, tracks, musicBeat && musicBeat.bgm, scene && scene.mood, scene && scene.location])
  React.useEffect(() => { if (!closingRef.current && (track || !ui0.bgm || waking)) playBgm(track, ui0.bgmVolume) }, [track && track.id, ui0.bgm, ui0.bgmVolume])
  // 环境音和剧情音效：导演从音效库里配的（音效库是空的就什么都不响）。剧情音效读到那句时响一次，快进时不响。
  const soundlib = useSoundlib()
  const soundById = React.useMemo(() => new Map((soundlib || []).map(s => [s.id, s])), [soundlib])
  const ambId = ui0.amb !== false && musicBeat && musicBeat.amb !== 'none' ? musicBeat.amb : ''
  const ambSound = (ambId && soundById.get(ambId)) || null
  React.useEffect(() => {
    if (closingRef.current) return
    playAmbience(ambSound ? { id: ambSound.id, url: assetUrl(ambSound.assetId) } : null, (ui0.ambVolume ?? 0.35) * (ambSound ? ambSound.volume ?? 1 : 1))
  }, [ambSound && ambSound.id, ambSound && ambSound.volume, ui0.ambVolume])
  React.useEffect(() => {
    const sound = beat && beat.sfx && !title && !skip && ui0.storySfx !== false ? soundById.get(beat.sfx) : null
    if (sound) playLibSound(sound.assetId, (ui0.storySfxVolume ?? 0.8) * (sound.volume ?? 1))
  }, [beat && beat.key])

  const go = React.useCallback(i => {
    if (!beats.length) return
    const next = Math.max(0, Math.min(beats.length - 1, i))
    anchor.current = beats[next].key
    writePos(gameId, beats[next].key)
    setIndex(next)
  }, [beats, gameId])

  const advance = React.useCallback(() => {
    if (!beat) return
    if (pausing) { setPauseSeen(beat.key); return }
    if (!done) { finish(); return }
    if (atEnd) { setAuto(false); setSkip(false); setChoosing(true); return }
    sfx('page')
    go(index + 1)
  }, [beat, done, atEnd, index, go, finish, pausing])

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
    closingRef.current = true
    stopAll()
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
  const speakerPerson = beat && people.get((beat.speakers || [beat.speaker])[0])
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

  const stageBeat = waking ? shownRef.current.was : beat || (beats.length ? beats[beats.length - 1] : null)
  const hud = waking ? stageBeat : beat // 左上角的地点跟着画面走：回忆还没褪完时还是回忆里的地方
  // 醒过来那一下换画面时已经白透了：回忆的背景、人和滤镜直接撤掉，不在白雾散开时又露出来（theater.css 的 data-tr="wake"）
  const stageTr = stageBeat && hold.wake && !waking && stageBeat === beat ? 'wake' : stageBeat && stageBeat.transition
  const stageScene = stageBeat ? stageBeat.scene : { location: '', time: 'night', weather: 'stars', mood: 'calm', light: 'normal', fx: 'none' }
  const stageMode = (stageBeat && stageBeat.mode) || ''
  // 标题画面上不加光线、滤镜、晃动这些气氛层，只留背景、天色和天气
  const atmosphere = Boolean(stageBeat) && !title
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
          {/* 画面效果（船上摇晃、车里颠簸、心跳……）和特殊段落（梦里飘、幻觉里扭曲）各动一层，叠在一起不互相顶掉 */}
          <div className="fg-world" data-fx={atmosphere ? stageScene.fx : ''}>
            <div className="fg-world-in" data-mode={atmosphere ? stageMode : ''} data-tr={stageTr === 'haze' || stageTr === 'wake' ? stageTr : undefined}>
              <Backdrop scene={stageScene} view={view} transition={stageTr || 'dissolve'} />
              <div className={`fg-grade${backgroundFor(stageScene, view).src ? ' is-drawn' : ''}`} data-time={stageScene.time} />
              {/* 短闪回时说话的是闪回里的人：现在台上的人不高亮、不对口型 */}
              {stageBeat && <Cast beat={title || stageBeat.recall || waking ? { ...stageBeat, speaker: '', speakers: null, sym: '' } : stageBeat} view={view} talk={title || stageBeat.recall || waking ? null : talk} max={ui0.maxOnStage ?? 5} />}
              <FadeLayer name="tone" value={atmosphere && stageScene.mood !== 'daily' ? stageScene.mood : ''} ms={1600} />
              <FadeLayer name="light" value={atmosphere && stageScene.light !== 'normal' ? stageScene.light : ''} ms={700} />
              {stageBeat && !title && <CgLayer beat={stageBeat} sound={sfxOn} />}
              <Particles weather={stageScene.weather} enabled={ui0.particles !== false} speed={atmosphere ? TIME_FLOW[stageScene.fx] ?? 1 : 1} />
              {stageBeat && !title && <SplitPanel beat={stageBeat} view={view} talk={talk} />}
              {stageBeat && !title && <RecallLayer beat={stageBeat} view={view} talk={talk} light={recallStyle !== 'ghost'} tone={recallTone} />}
              <FadeLayer name="fxlayer" value={atmosphere && stageScene.fx !== 'none' ? stageScene.fx : ''} ms={900} />
              <div className="fg-vignette" />
            </div>
          </div>
        </div>
        {/* 特殊段落的滤镜放在镜头外面：推镜头时录像框、REC 这些不跟着放大，对话框和标题卡也不被滤到 */}
        <FadeLayer name="mode" value={atmosphere ? stageMode : ''} ms={stageTr === 'wake' ? 200 : stageTr === 'haze' ? 2400 : 1200} />
        {beat && !title && <Flash beat={beat} recallStyle={recallStyle} tone={recallTone} wake={Boolean(hold.wake) && speed > 0} rising={waking} />}
        <div className="fg-hitflash" ref={flashRef} aria-hidden="true" />
        {!panel && <RestartNotice floating />}
        {beat && !title && <TitleCard beat={beat} delay={speed > 0 ? (beat.cut ? CUT_MS : hold.wake ? WAKE_SWAP_MS + 300 : 0) : 0} />}
        {beat && !title && beat.cut && speed > 0 && <CutCard beat={beat} out={!cutting} />}

        {!title && beat && (
          <div className="fg-hud">
            <div className="fg-hud-bar" />
            <div>
              <div className="fg-hud-place">{hud.scene.location || `第 ${hud.turn} 轮`}</div>
              <div className="fg-hud-meta">
                {hud.mode && <span className="fg-hud-mode">{MODE_LABEL[hud.mode]}</span>}
                <span>{TIME_LABEL[hud.scene.time] || ''}</span>
                {hud.scene.weather && hud.scene.weather !== 'clear' && <span>{WEATHER_LABEL[hud.scene.weather]}</span>}
                {LIGHT_LABEL[hud.scene.light] && <span>{LIGHT_LABEL[hud.scene.light]}</span>}
                {FX_LABEL[hud.scene.fx] && <span>{FX_LABEL[hud.scene.fx]}</span>}
                {hud.scene.mood && <span>♪ {MOOD_LABEL[hud.scene.mood]}</span>}
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
          <DialogBox beat={beat} chars={chars} plan={typed} done={done} waiting={holdText} away={pausing && hold.away} color={color} quick={quick} progress={progressInTurn} status={status} hiddenText={Boolean(beat.card)}
            recall={beat.recall ? { tone: recallTone || beat.recall.tone, name: ui0.recallName || 'blur' } : null}
            face={recallStyle === 'portrait' && beat.recall ? <RecallFace beat={beat} view={view} tone={recallTone} /> : null} />
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

        {panel === 'log' && <Backlog beats={beats} index={index} gameId={gameId} onClose={() => setPanel('')} onJump={i => { go(i); setPanel(''); setTitle(false); setChoosing(false) }} />}
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
