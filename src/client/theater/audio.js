// 配乐（「我的配乐」里的曲子，交叉淡入淡出；设置里试听时先把它压下去）+ 打字音 / 落字音效 / 界面音。
// 打字音和音效照 lib/sounds.js 的配方用 WebAudio 现场合成，不需要音频文件；某种音效换成了玩家上传的文件时放那个文件。
import { assetUrl } from '../api.js'
import { voiceById, soundFor, slotById, DEFAULT_SOUNDS } from '../../../lib/sounds.js'

let bgm = null       // { el, id, volume }
let preview = null   // { el, id, onEnd }
let ctx = null

function audioCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return null
    ctx = new AC()
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {})
  return ctx
}

function fade(el, to, ms, done) {
  const from = el.volume
  const start = performance.now()
  const tick = now => {
    const k = Math.min(1, (now - start) / ms)
    el.volume = Math.max(0, Math.min(1, from + (to - from) * k))
    if (k < 1) requestAnimationFrame(tick)
    else if (done) done()
  }
  requestAnimationFrame(tick)
}

export function playBgm(track, volume = 0.45) {
  if (!track) { stopBgm(); return }
  const audible = preview ? 0 : volume
  if (bgm && bgm.id === track.id) { bgm.volume = volume; bgm.el.volume = Math.min(bgm.el.volume, audible); fade(bgm.el, audible, 400); return }
  const old = bgm
  const el = new Audio()
  el.src = track.url
  el.loop = true
  el.volume = 0
  el.play().then(() => fade(el, preview ? 0 : volume, 1800)).catch(() => {})
  bgm = { el, id: track.id, volume }
  if (old) fade(old.el, 0, 1400, () => { old.el.pause(); old.el.src = '' })
}

export function stopBgm() {
  if (!bgm) return
  const old = bgm
  bgm = null
  fade(old.el, 0, 900, () => { old.el.pause(); old.el.src = '' })
}

/** 试听一首（设置里的配乐页）：剧场配乐先淡出，试听停了再淡回来。onEnd 在停下时调用（播完、换一首或手动停）。 */
export function previewTrack(track, onEnd) {
  stopPreview()
  if (!track) return
  const el = new Audio(track.url)
  el.volume = bgm ? bgm.volume : 0.6
  preview = { el, id: track.id, onEnd }
  el.onended = () => { if (preview && preview.el === el) stopPreview() }
  if (bgm) fade(bgm.el, 0, 500)
  el.play().catch(() => { if (preview && preview.el === el) stopPreview() })
}

export function stopPreview() {
  if (!preview) return
  const p = preview
  preview = null
  p.el.pause()
  p.el.src = ''
  if (bgm) fade(bgm.el, bgm.volume, 800)
  if (p.onEnd) p.onEnd()
}

// ───────────────────────── 合成 ─────────────────────────

/** 当前的声音设置（剧场打开时按设置调一次，见 configureSounds）。 */
let sounds = { blipVolume: 1, sfx: true, sfxVolume: 1, sounds: DEFAULT_SOUNDS, customSounds: {} }

/** 按设置调音量、各音效用哪个版本；上传的音效先下载好，第一次响时不用等。 */
export function configureSounds(ui) {
  if (!ui) return
  sounds = ui
  for (const file of Object.values(ui.customSounds || {})) fetchFile(file.assetId).catch(() => {})
}

let noiseBuffer = null
function noise(ac) {
  if (!noiseBuffer) {
    noiseBuffer = ac.createBuffer(1, Math.floor(ac.sampleRate * 0.5), ac.sampleRate)
    const data = noiseBuffer.getChannelData(0)
    for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1
  }
  return noiseBuffer
}

/**
 * 照配方发声（配方格式见 lib/sounds.js）：rate 整体移调（打字音的角色音高），volume 音量倍数，
 * at 什么时候开始（AudioContext 的时间，排一串字的试听用）。
 */
function playParts(ac, parts, { rate = 1, volume = 1, at = ac.currentTime } = {}) {
  if (!(volume > 0)) return
  for (const part of parts) {
    const t = at + (part.at || 0)
    const end = t + part.dur
    const g = ac.createGain()
    const peak = Math.max(0.0002, part.gain * volume)
    const attack = part.attack ?? (part.wave === 'noise' ? 0 : 0.006)
    if (attack > 0) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + attack) } else g.gain.setValueAtTime(peak, t)
    g.gain.exponentialRampToValueAtTime(0.0001, end)
    let src, head
    if (part.wave === 'noise') {
      src = ac.createBufferSource()
      src.buffer = noise(ac)
      src.loop = true
      head = ac.createBiquadFilter()
      head.type = 'bandpass'
      head.Q.value = part.q ?? 1
      src.connect(head)
    } else {
      src = ac.createOscillator()
      src.type = part.wave
      head = src
    }
    const freq = part.wave === 'noise' ? head.frequency : src.frequency
    freq.setValueAtTime(part.f * rate, t)
    if (part.to && part.to !== part.f) freq.exponentialRampToValueAtTime(part.to * rate, end)
    if (part.lp) { const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = part.lp; head.connect(lp); head = lp }
    head.connect(g).connect(ac.destination)
    src.start(t)
    src.stop(end + 0.02)
  }
}

// 上传的音效：先下载字节，第一次放的时候解码，之后用缓存。太长的只放前 4 秒（最后淡出）。
const MAX_FILE_SECONDS = 4
const files = new Map()   // assetId → Promise<ArrayBuffer>
const buffers = new Map() // assetId → Promise<AudioBuffer>
function fetchFile(id) {
  if (!files.has(id)) {
    const p = fetch(assetUrl(id)).then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.arrayBuffer() })
    p.catch(() => files.delete(id))
    files.set(id, p)
  }
  return files.get(id)
}
function decoded(ac, id) {
  if (!buffers.has(id)) {
    const p = fetchFile(id).then(bytes => ac.decodeAudioData(bytes.slice(0)))
    p.catch(() => buffers.delete(id))
    buffers.set(id, p)
  }
  return buffers.get(id)
}
function playFile(ac, id, volume) {
  if (!(volume > 0)) return
  decoded(ac, id).then(buffer => {
    const src = ac.createBufferSource()
    const g = ac.createGain()
    const t = ac.currentTime
    src.buffer = buffer
    g.gain.setValueAtTime(volume, t)
    src.connect(g).connect(ac.destination)
    src.start(t)
    if (buffer.duration > MAX_FILE_SECONDS) { g.gain.setValueAtTime(volume, t + MAX_FILE_SECONDS - 0.3); g.gain.linearRampToValueAtTime(0, t + MAX_FILE_SECONDS); src.stop(t + MAX_FILE_SECONDS) }
  }).catch(() => {})
}

function playSound(sound, volume) {
  const ac = sound && audioCtx()
  if (!ac) return
  if (sound.assetId) playFile(ac, sound.assetId, volume)
  else playParts(ac, sound.parts, { volume })
}

/**
 * 打字音：voice 是 lib/sounds.js 的 lineVoice 算出来的 { id 音色, pitch 升降几个半音, gain }；
 * pitch / gain 是演法给的倍数（威压低沉、激动尖细、低语轻）。每个字音高随机抖一点，不那么机械。
 */
export function blip(voice, { pitch = 1, gain = 1 } = {}) {
  const v = voice && voiceById(voice.id)
  const ac = v && audioCtx()
  if (!ac) return
  const rate = 2 ** ((voice.pitch || 0) / 12) * pitch * (0.96 + Math.random() * 0.08)
  playParts(ac, v.parts, { rate, volume: (sounds.blipVolume ?? 1) * gain * (voice.gain ?? 1) })
}

/** 试听一个音色：按打字音音量念一小段（三个字、一个停顿、再四个字）。ui 是当前设置。 */
export function previewVoice(voice, ui = sounds) {
  const v = voice && voiceById(voice.id)
  const ac = v && audioCtx()
  if (!ac) return
  const base = 2 ** ((voice.pitch || 0) / 12)
  const t0 = ac.currentTime + 0.02
  for (const dt of [0, 0.09, 0.18, 0.42, 0.51, 0.6, 0.69]) playParts(ac, v.parts, { rate: base * (0.96 + Math.random() * 0.08), volume: ui.blipVolume ?? 1, at: t0 + dt })
}

/** 落字音效：impact / slam / stab / ding，按设置里选的版本或上传的文件；音效关了不响。 */
export function stinger(kind) {
  if (sounds.sfx !== false) playSound(soundFor(sounds, kind), sounds.sfxVolume ?? 1)
}

/** 界面音：hover / select / page / open（back 当 select）。跟落字音效同一个开关和音量。 */
export function sfx(kind = 'select') {
  stinger(kind === 'back' ? 'select' : kind)
}

/** 试听某一种音效的某个版本（custom 是上传的那个），不看音效开关。ui 是当前设置。 */
export function previewSound(slot, choice, ui = sounds) {
  const def = slotById(slot)
  if (!def || choice === 'off') return
  const file = choice === 'custom' && ui.customSounds && ui.customSounds[slot]
  const sound = file ? { assetId: file.assetId } : { parts: (def.presets.find(x => x.id === choice) || def.presets[0]).parts }
  playSound(sound, ui.sfxVolume ?? 1)
}
