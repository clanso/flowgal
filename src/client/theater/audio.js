// 配乐（「我的配乐」里的曲子，交叉淡入淡出；设置里试听时先把它压下去）+ 环境音（音效库里循环的底，另一条）
// + 剧情音效（音效库里响一次的）+ 打字音 / 落字音效 / 界面音。
// 打字音和音效照 lib/sounds.js 的配方用 WebAudio 现场合成，不需要音频文件；某种音效换成了玩家上传的文件时放那个文件。
import { assetUrl } from '../api.js'
import { voiceById, soundFor, slotById, DEFAULT_SOUNDS } from '../../../lib/sounds.js'

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
  let over = false
  const end = () => { if (over) return; over = true; el.volume = Math.max(0, Math.min(1, to)); if (done) done() }
  const tick = now => {
    if (over) return
    const k = Math.min(1, (now - start) / ms)
    el.volume = Math.max(0, Math.min(1, from + (to - from) * k))
    if (k < 1) requestAnimationFrame(tick)
    else end()
  }
  requestAnimationFrame(tick)
  // 页面在后台、动画帧不跑时也按时收尾（不然淡出永远走不完，关了剧场音乐还在响）
  setTimeout(end, ms + 150)
}

/** 一条循环播放的声音（配乐、环境音各一条）：换的时候交叉淡入淡出，试听时压到 0。 */
function loopPlayer() {
  let cur = null // { el, id, volume }
  const halt = el => { el._fgStopped = true; el.pause(); el.src = '' }
  return {
    get current() { return cur },
    play(item, volume) {
      if (!item) { this.stop(); return }
      volume = Math.max(0, Math.min(1, volume))
      const audible = preview ? 0 : volume
      if (cur && cur.id === item.id) { cur.volume = volume; cur.el.volume = Math.min(cur.el.volume, audible); fade(cur.el, audible, 400); return }
      const old = cur
      const el = new Audio()
      el.src = item.url
      el.loop = true
      el.volume = 0
      // 曲子加载得慢、开始播放前已经被停掉（关了剧场、换了歌）：别再响起来
      el.play().then(() => { if (el._fgStopped) halt(el); else if (!el._fgFading) fade(el, preview ? 0 : volume, 1800) }).catch(() => {})
      cur = { el, id: item.id, volume }
      if (old) { old.el._fgFading = true; fade(old.el, 0, 1400, () => halt(old.el)) }
    },
    stop() {
      const old = cur
      cur = null
      if (old) { old.el._fgFading = true; fade(old.el, 0, 900, () => halt(old.el)) }
    },
  }
}
const music = loopPlayer()
const ambience = loopPlayer()
const loops = () => [music.current, ambience.current].filter(Boolean)

export function playBgm(track, volume = 0.45) { music.play(track, volume) }
export function stopBgm() { music.stop() }
/** 环境音：{ id, url }，null 停掉。 */
export function playAmbience(sound, volume = 0.35) { ambience.play(sound, volume) }
export function stopAmbience() { ambience.stop() }

/** 关剧场：配乐、环境音淡出停下，试听和还在响的剧情音效立刻停。 */
export function stopAll() {
  music.stop()
  ambience.stop()
  stopPreview()
  for (const src of [...oneShots]) { try { src.stop() } catch {} }
  oneShots.clear()
}

/** 试听一首（设置里的配乐页）：剧场配乐先淡出，试听停了再淡回来。onEnd 在停下时调用（播完、换一首或手动停）。 */
export function previewTrack(track, onEnd) {
  stopPreview()
  if (!track) return
  const el = new Audio(track.url)
  el.volume = Math.max(0, Math.min(1, track.volume ?? (music.current ? music.current.volume : 0.6)))
  preview = { el, id: track.id, onEnd }
  el.onended = () => { if (preview && preview.el === el) stopPreview() }
  for (const loop of loops()) fade(loop.el, 0, 500)
  el.play().catch(() => { if (preview && preview.el === el) stopPreview() })
}

export function stopPreview() {
  if (!preview) return
  const p = preview
  preview = null
  p.el.pause()
  p.el.src = ''
  for (const loop of loops()) fade(loop.el, loop.volume, 800)
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
function playParts(ac, parts, { rate = 1, volume = 1, at = ac.currentTime, out = ac.destination } = {}) {
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
    head.connect(g).connect(out)
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

/** 剧情音效（音效库里响一次的）：整段放完，最长 12 秒（再长的最后淡出）。 */
const MAX_STORY_SECONDS = 12
const oneShots = new Set() // 还在响的剧情音效：关剧场时停掉
export function playLibSound(assetId, volume = 1) {
  const ac = assetId && volume > 0 && audioCtx()
  if (!ac) return
  decoded(ac, assetId).then(buffer => {
    const src = ac.createBufferSource()
    oneShots.add(src)
    src.onended = () => oneShots.delete(src)
    const g = ac.createGain()
    const t = ac.currentTime
    src.buffer = buffer
    g.gain.setValueAtTime(volume, t)
    src.connect(g).connect(ac.destination)
    src.start(t)
    if (buffer.duration > MAX_STORY_SECONDS) { g.gain.setValueAtTime(volume, t + MAX_STORY_SECONDS - 1); g.gain.linearRampToValueAtTime(0, t + MAX_STORY_SECONDS); src.stop(t + MAX_STORY_SECONDS) }
  }).catch(() => {})
}

function playSound(sound, volume) {
  const ac = sound && audioCtx()
  if (!ac) return
  if (sound.assetId) playFile(ac, sound.assetId, volume)
  else playParts(ac, sound.parts, { volume })
}

// ───────────── 声音的样子 ─────────────
// 隔着电话、广播喇叭、心灵感应、画外音、回声、回忆、机械音：打字音先过一条效果链再出声。每种链在一个 AudioContext 里只建一次。

/** 混响用的脉冲响应：衰减的噪声，seconds 越长越空旷。 */
function impulse(ac, seconds, decay = 2.5) {
  const len = Math.floor(ac.sampleRate * seconds)
  const buffer = ac.createBuffer(2, len, ac.sampleRate)
  for (let ch = 0; ch < 2; ch += 1) {
    const data = buffer.getChannelData(ch)
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len) ** decay
  }
  return buffer
}
/** 削波失真：amount 越大越破（电话、喇叭的那种毛边）。 */
function shaper(ac, amount) {
  const node = ac.createWaveShaper()
  const curve = new Float32Array(1024)
  for (let i = 0; i < curve.length; i += 1) { const x = (i / (curve.length - 1)) * 2 - 1; curve[i] = ((1 + amount) * x) / (1 + amount * Math.abs(x)) }
  node.curve = curve
  return node
}
function filter(ac, type, frequency, q = 0.7, gain = 0) {
  const node = ac.createBiquadFilter()
  node.type = type
  node.frequency.value = frequency
  node.Q.value = q
  node.gain.value = gain
  return node
}
function amp(ac, value) { const node = ac.createGain(); node.gain.value = value; return node }

const VOICE_CHAINS = {
  // 电话：只剩中频，有点破
  phone: (ac, input, out) => { input.connect(filter(ac, 'highpass', 420)).connect(filter(ac, 'lowpass', 3000)).connect(filter(ac, 'peaking', 1700, 1, 6)).connect(shaper(ac, 6)).connect(amp(ac, 0.75)).connect(out) },
  // 广播 / 对讲机：更窄更破，每个字带一点电流声（见 blip）
  radio: (ac, input, out) => { input.connect(filter(ac, 'highpass', 600)).connect(filter(ac, 'lowpass', 2500)).connect(shaper(ac, 24)).connect(amp(ac, 0.6)).connect(out) },
  // 心灵感应：大混响，干声很轻，像在脑子里回响
  telepathy: (ac, input, out) => {
    input.connect(amp(ac, 0.35)).connect(out)
    const verb = ac.createConvolver(); verb.buffer = impulse(ac, 2.6, 2)
    input.connect(filter(ac, 'highpass', 300)).connect(verb).connect(amp(ac, 1.1)).connect(out)
  },
  // 画外音：门外、隔壁、远处，闷一点、远一点
  offscreen: (ac, input, out) => {
    const muffled = input.connect(filter(ac, 'lowpass', 1300))
    muffled.connect(amp(ac, 0.6)).connect(out)
    const room = ac.createConvolver(); room.buffer = impulse(ac, 0.9, 3)
    muffled.connect(room).connect(amp(ac, 0.45)).connect(out)
  },
  // 回声：山谷、空旷的大厅，每个字后面跟着越来越远的几声
  echo: (ac, input, out) => {
    input.connect(out)
    const delay = ac.createDelay(1); delay.delayTime.value = 0.23
    const feedback = amp(ac, 0.48)
    input.connect(delay).connect(filter(ac, 'lowpass', 2200)).connect(feedback).connect(delay)
    delay.connect(amp(ac, 0.7)).connect(out)
  },
  // 回忆：隔着一层时间。高频收掉一些（3 kHz 以上）、轻 2～3 dB，带一点短短的小房间混响，不拖尾、不弹回来（不是回声）
  memory: (ac, input, out) => {
    const soft = input.connect(filter(ac, 'highpass', 140)).connect(filter(ac, 'lowpass', 3000))
    soft.connect(amp(ac, 0.75)).connect(out)
    const room = ac.createConvolver(); room.buffer = impulse(ac, 0.7, 3.5)
    soft.connect(room).connect(filter(ac, 'lowpass', 2200)).connect(amp(ac, 0.3)).connect(out)
  },
  // 机械音：环形调制 + 削波，像机器人、AI、变声器
  machine: (ac, input, out) => {
    const ring = ac.createGain(); ring.gain.value = 0
    const lfo = ac.createOscillator(); lfo.type = 'sine'; lfo.frequency.value = 95
    lfo.connect(ring.gain); lfo.start()
    input.connect(ring).connect(shaper(ac, 10)).connect(filter(ac, 'highpass', 180)).connect(amp(ac, 0.9)).connect(out)
    input.connect(amp(ac, 0.25)).connect(out)
  },
}
const chains = new Map() // 样子 → 链的入口
function chainFor(ac, style) {
  const build = VOICE_CHAINS[style]
  if (!build) return ac.destination
  const known = chains.get(style)
  if (known && known.context === ac) return known
  const input = ac.createGain()
  build(ac, input, ac.destination)
  chains.set(style, input)
  return input
}

/**
 * 打字音：voice 是 lib/sounds.js 的 lineVoice 算出来的 { id 音色, pitch 升降几个半音, gain }，
 * 再带上这句的声音样子 style（电话、广播、心灵感应、齐声……见 lib/vocab.js 的 VOICES）；齐声时 also 是另外几个人的声音。
 * pitch / gain 是演法给的倍数（威压低沉、激动尖细、低语轻）。每个字音高随机抖一点，不那么机械。
 */
export function blip(voice, { pitch = 1, gain = 1 } = {}) {
  const v = voice && voiceById(voice.id)
  const ac = v && audioCtx()
  if (!ac) return
  const style = voice.style || ''
  const jitter = pitch * (0.96 + Math.random() * 0.08)
  const volume = (sounds.blipVolume ?? 1) * gain
  const rateOf = who => 2 ** ((who.pitch || 0) / 12) * jitter
  if (style === 'chorus') {
    // 齐声：每个人的声音各响一下，错开几毫秒；只有一个人的声音时叠两个错开音高的分身
    const others = (voice.also || []).filter(o => voiceById(o.id))
    const group = others.length ? [voice, ...others] : [voice, { ...voice, pitch: (voice.pitch || 0) - 3 }, { ...voice, pitch: (voice.pitch || 0) + 4 }]
    const share = 1 / Math.sqrt(group.length)
    group.forEach((who, i) => playParts(ac, voiceById(who.id).parts, { rate: rateOf(who), volume: volume * share * (who.gain ?? 1), at: ac.currentTime + i * 0.014 }))
    return
  }
  const out = chainFor(ac, style)
  const rate = rateOf(voice) * (style === 'telepathy' ? 1.08 : style === 'machine' ? 0.94 : 1)
  playParts(ac, v.parts, { rate, volume: volume * (voice.gain ?? 1), out })
  // 心灵感应：高八度的一层虚影；广播：一点电流声
  if (style === 'telepathy') playParts(ac, v.parts, { rate: rate * 2, volume: volume * 0.22 * (voice.gain ?? 1), out })
  if (style === 'radio') playParts(ac, [{ wave: 'noise', f: 3200, q: 0.8, gain: 0.05, dur: 0.06 }], { volume, out })
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
