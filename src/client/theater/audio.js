// 配乐（「我的配乐」里的曲子，交叉淡入淡出；设置里试听时先把它压下去）+ 环境音（音效库里循环的底，另一条）
// + 剧情音效（音效库里响一次的）+ 打字音 / 落字音效 / 界面音。
// 打字音和音效照 lib/sounds.js 的配方用 WebAudio 现场合成，不需要音频文件；某种音效换成了玩家上传的文件、
// 音效库里的声音，或者音色用的是音效库里的打字音时放那个文件，响度按内置的对齐（见「响度对齐」）。
import { assetUrl, soundlibNow } from '../api.js'
import { voiceById, findVoice, isCustomRef, soundFor, slotById, DEFAULT_SOUNDS, isLibRef, libIdOf } from '../../../lib/sounds.js'
import { FOLEY } from '../../../lib/foley.js'
import { EROS_FOLEY, EROS_LOOPS, TENTACLE_LOOPS, TENTACLE_SWAP, PEAK_FOLEY } from '../../../lib/eros.js'
import { shapeBlip } from '../../../lib/voice-mood.js'

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
  // 同一条声音又开始了新的淡入淡出（留白停下又马上回来这类）：旧的那次让给新的，不然两边抢着改音量
  const turn = (el._fgFadeTurn = (el._fgFadeTurn || 0) + 1)
  let over = false
  const end = () => { if (over) return; over = true; if (el._fgFadeTurn !== turn) return; el.volume = Math.max(0, Math.min(1, to)); if (done) done() }
  const tick = now => {
    if (over) return
    if (el._fgFadeTurn !== turn) { over = true; return }
    const k = Math.min(1, (now - start) / ms)
    el.volume = Math.max(0, Math.min(1, from + (to - from) * k))
    if (k < 1) requestAnimationFrame(tick)
    else end()
  }
  requestAnimationFrame(tick)
  // 页面在后台、动画帧不跑时也按时收尾（不然淡出永远走不完，关了剧场音乐还在响）
  setTimeout(end, ms + 150)
}

/**
 * HTMLAudio 的音量最大是 1；音效库里录得很轻的环境音、试听要放大到 1 倍以上时，再接一级 WebAudio 增益（第一次要放大时才接，
 * 接上以后这条声音一直走 WebAudio）。素材都是同源地址，接上不会变哑。
 */
function boost(el, gain) {
  if (!(gain > 1) && !el._fgGain) return
  const ac = audioCtx()
  if (!ac) return
  if (!el._fgGain) {
    try {
      const g = ac.createGain()
      ac.createMediaElementSource(el).connect(g).connect(ac.destination)
      el._fgGain = g
    } catch { return }
  }
  el._fgGain.gain.value = Math.max(1, gain)
}

/** 配乐留白：停下时淡出得快（字出来之前就静了），回来时慢慢淡回来。 */
const HUSH_OUT_MS = 600
const HUSH_BACK_MS = 2600

/**
 * 一条循环播放的声音（配乐、环境音各一条）：换的时候交叉淡入淡出，试听时压到 0；留白时停在原处，回来时接着放。
 * loud：音量能超过 1（环境音：库里给录得轻的调了好几倍），淡入淡出照旧在 0～1 里走，超出的部分放在增益上。
 */
function loopPlayer({ loud = false } = {}) {
  let cur = null // { el, id, volume }
  let hushed = false
  let ducked = 1 // 高潮那一下压低到几成（见 duck）
  let duckTurn = 0
  const halt = el => { el._fgStopped = true; el.pause(); el.src = '' }
  const audible = volume => (preview || hushed ? 0 : Math.min(1, volume) * ducked)
  return {
    get current() { return cur },
    /** 现在该有的音量：试听、留白时是 0。 */
    get level() { return cur ? audible(cur.volume) : 0 },
    play(item, volume) {
      if (!item) { this.stop(); return }
      volume = Math.max(0, loud ? volume : Math.min(1, volume))
      if (cur && cur.id === item.id) { cur.volume = volume; boost(cur.el, volume); cur.el.volume = Math.min(cur.el.volume, audible(volume)); fade(cur.el, audible(volume), 400); return }
      hushed = false // 换了一首：留白自然结束
      const old = cur
      const el = new Audio()
      el.src = item.url
      el.loop = true
      el.volume = 0
      boost(el, volume)
      // 曲子加载得慢、开始播放前已经被停掉（关了剧场、换了歌）：别再响起来
      el.play().then(() => { if (el._fgStopped) halt(el); else if (!el._fgFading) fade(el, audible(volume), 1800) }).catch(() => {})
      cur = { el, id: item.id, volume }
      if (old) { old.el._fgFading = true; fade(old.el, 0, 1400, () => halt(old.el)) }
    },
    stop() {
      const old = cur
      cur = null
      if (old) { old.el._fgFading = true; fade(old.el, 0, 900, () => halt(old.el)) }
    },
    /** 留白：on 淡出、停在原处；off 从停下的地方接着放、慢慢淡回来。 */
    hush(on) {
      on = Boolean(on)
      if (on === hushed) return
      hushed = on
      const now = cur
      if (!now) return
      if (on) fade(now.el, 0, HUSH_OUT_MS, () => { if (hushed && cur === now) now.el.pause() })
      else { now.el.play().catch(() => {}); fade(now.el, audible(now.volume), HUSH_BACK_MS) }
    },
    /** 压低一会儿：很快压到 level 成，ms 毫秒后慢慢回来（又压了一次就按后一次算）。 */
    duck(level, ms) {
      const turn = (duckTurn += 1)
      ducked = level
      if (cur) fade(cur.el, audible(cur.volume), 350)
      setTimeout(() => {
        if (turn !== duckTurn) return
        ducked = 1
        if (cur) fade(cur.el, audible(cur.volume), 1800)
      }, ms)
    },
  }
}
const music = loopPlayer()
const ambience = loopPlayer({ loud: true })
/** 亲密场面的节奏底用音效库里的录音时（scene.erosLoop），循环它的那一条；音量跟剧情音效走，库里调过的音量也算。 */
const erosRecording = loopPlayer({ loud: true })
const players = [music, ambience, erosRecording]
const loops = () => players.map(p => p.current).filter(Boolean)

export function playBgm(track, volume = 0.45) { music.play(track, volume) }
export function stopBgm() { music.stop() }
/** 配乐留白（导演写 bgm: hush 的那几句）：true 停下，false 回到原来的曲子。 */
export function hushBgm(on) { music.hush(on) }
/** 环境音：{ id, url }，null 停掉。 */
export function playAmbience(sound, volume = 0.35) { ambience.play(sound, volume) }
export function stopAmbience() { ambience.stop() }

/** 关剧场：配乐、环境音淡出停下，试听和还在响的剧情音效立刻停。 */
export function stopAll() {
  music.stop()
  music.hush(false)
  ambience.stop()
  stopPreview()
  for (const src of [...oneShots]) { try { src.stop() } catch {} }
  oneShots.clear()
  stopEros()
  erosRecording.stop()
}

/** 试听一首（设置里的配乐页、音效库）：剧场配乐先淡出，试听停了再淡回来。onEnd 在停下时调用（播完、换一首或手动停）。volume 能超过 1。 */
export function previewTrack(track, onEnd) {
  stopPreview()
  if (!track) return
  const el = new Audio(track.url)
  const volume = track.volume ?? (music.current ? music.current.volume : 0.6)
  el.volume = Math.max(0, Math.min(1, volume))
  boost(el, volume)
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
  for (const player of players) if (player.current) fade(player.current.el, player.level, 800)
  if (p.onEnd) p.onEnd()
}

// ───────────────────────── 合成 ─────────────────────────

/** 当前的声音设置（剧场打开时按设置调一次，见 configureSounds）。 */
let sounds = { blipVolume: 1, sfx: true, sfxVolume: 1, sounds: DEFAULT_SOUNDS, customSounds: {} }

/** 按设置调音量、各音效用哪个版本；上传的、音效库里选的音效和旁白的音色先下载好，第一次响时不用等。 */
export function configureSounds(ui) {
  if (!ui) return
  sounds = ui
  for (const file of Object.values(ui.customSounds || {})) fetchFile(file.assetId).catch(() => {})
  const ac = audioCtx()
  if (!ac) return
  for (const choice of Object.values(ui.sounds || {})) { const s = isLibRef(choice) && libSound(libIdOf(choice)); if (s) loadSample(ac, s.assetId) }
  warmVoices([{ id: ui.narrationVoice }])
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
function playParts(ac, parts, { rate = 1, volume = 1, at = ac.currentTime, out = ac.destination, stretch = 1, glide = 0 } = {}) {
  if (!(volume > 0)) return
  for (const part of parts) {
    const t = at + (part.at || 0) * stretch
    const end = t + part.dur * stretch
    const g = ac.createGain()
    const peak = Math.max(0.0002, part.gain * volume)
    const attack = part.attack ?? (part.wave === 'noise' ? 0 : 0.006)
    if (attack > 0) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + attack) } else g.gain.setValueAtTime(peak, t)
    if (part.hold) g.gain.setValueAtTime(peak, t + attack + part.hold) // 拉长的音（电话的嘟——）：先稳住再收
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
    // 滑音（句调：问句、拖腔的最后一个字往上滑）：滑上去再稍微回落
    if (glide) { const f = (part.to || part.f) * rate; freq.exponentialRampToValueAtTime(f * (1 + glide), t + (end - t) * 0.6); freq.exponentialRampToValueAtTime(f * (1 + glide * 0.7), end) }
    else if (part.to && part.to !== part.f) freq.exponentialRampToValueAtTime(part.to * rate, end)
    // 发颤（情绪的 tremor，lib/voice-mood.js 的 shapeBlip）：音高往上一抖再回来
    else if (part.vibrato) { const f = part.f * rate; freq.linearRampToValueAtTime(f * (1 + part.vibrato), t + part.dur * 0.35); freq.linearRampToValueAtTime(f * (1 - part.vibrato * 0.5), t + part.dur * 0.7); freq.linearRampToValueAtTime(f, end) }
    if (part.lp) { const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = part.lp; head.connect(lp); head = lp }
    head.connect(g).connect(out)
    // 噪声从缓冲里随便一处开始：同一个配方连着响（节奏底一拍一拍）时每一下的颗粒不一样
    if (part.wave === 'noise') src.start(t, Math.random() * 0.4)
    else src.start(t)
    src.stop(end + 0.02)
  }
}

// ───────────── 响度对齐 ─────────────
// 音效库的声音、上传的文件顶替内置配方（打字音、落字音效、界面音）时，按内置那个的响度放：两边都量 A 计权后的有效响度
// （从第一次够响到最后一次够响之间的 RMS），按比例定增益。音效文件往往是满幅的，不对齐会比内置的响二三十分贝。

/** A 计权（四个一阶高通 20.6 / 20.6 / 107.7 / 737.9 Hz，两个一阶低通 12194 Hz，双线性变换）后的有效 RMS，1 kHz 处归一。 */
function loudness(data, rate) {
  const poles = [['hp', 20.6], ['hp', 20.6], ['hp', 107.7], ['hp', 737.9], ['lp', 12194], ['lp', 12194]]
  let y = Float32Array.from(data)
  let norm = 1
  for (const [kind, fc] of poles) {
    const f = Math.min(fc, rate * 0.45)
    const k = Math.tan((Math.PI * f) / rate)
    const a1 = (k - 1) / (k + 1)
    const b0 = kind === 'hp' ? 1 / (1 + k) : k / (1 + k)
    const b1 = kind === 'hp' ? -b0 : b0
    norm *= kind === 'hp' ? 1000 / Math.hypot(1000, f) : f / Math.hypot(1000, f)
    let x1 = 0, y1 = 0
    for (let i = 0; i < y.length; i += 1) { const x = y[i]; y1 = b0 * x + b1 * x1 - a1 * y1; x1 = x; y[i] = y1 }
  }
  let peak = 0
  for (let i = 0; i < y.length; i += 1) peak = Math.max(peak, Math.abs(y[i]))
  if (!(peak > 0)) return 0
  let first = 0, last = y.length - 1
  while (Math.abs(y[first]) < peak * 0.05) first += 1
  while (Math.abs(y[last]) < peak * 0.05) last -= 1
  let sum = 0
  for (let i = first; i <= last; i += 1) sum += y[i] * y[i]
  return Math.sqrt(sum / (last - first + 1)) / norm
}
/** 一段采样的响度（多声道取第一条）。 */
const bufferLoudness = buffer => loudness(buffer.getChannelData(0), buffer.sampleRate)

/** 配方的响度：离线渲染一遍量出来，按配方缓存。浏览器不支持离线渲染时用经典哔哔量级的一个估计值。 */
const FALLBACK_LEVEL = 0.0063 // 约 -44 dB，经典哔哔的量级
const levels = new WeakMap() // parts → { value }：value 量好之前是 null
function recipeLevel(parts) {
  const known = levels.get(parts)
  if (known) return known
  const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext
  const rate = 44100
  const seconds = Math.max(...parts.map(x => (x.at || 0) + x.dur + (x.hold || 0))) + 0.05
  const job = { value: null }
  levels.set(parts, job)
  try {
    const off = new OAC(1, Math.ceil(seconds * rate), rate)
    playParts(off, parts, { at: 0 })
    off.startRendering().then(buffer => { job.value = bufferLoudness(buffer) || FALLBACK_LEVEL }, () => { job.value = FALLBACK_LEVEL })
  } catch { job.value = FALLBACK_LEVEL }
  return job
}
/** 采样顶替配方时乘的增益：两边响度之比（太轻的文件最多拉高 24 dB）；配方还没量好时先用估计值。 */
function matchGain(parts, sample) {
  const ref = recipeLevel(parts).value ?? FALLBACK_LEVEL
  return sample.level > 0 ? Math.min(16, ref / sample.level) : 1
}

/** 音效库里的一个声音（库还没读到、或者编号不在库里是 null）。 */
let libIndex = { list: null, map: new Map() }
function libSound(id) {
  const list = soundlibNow()
  if (libIndex.list !== list) libIndex = { list, map: new Map((list || []).map(x => [x.id, x])) }
  return libIndex.map.get(id) || null
}

// 上传的音效、音效库的声音：先下载字节，第一次放的时候解码，之后用缓存。落字音效和界面音太长的只放前 4 秒（最后淡出）。
const MAX_FILE_SECONDS = 4
const files = new Map()   // assetId → Promise<ArrayBuffer>
const buffers = new Map() // assetId → Promise<AudioBuffer>
const samples = new Map() // assetId → { buffer, level }：解码好、量好响度的，打字音一个字一下要马上能放
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
/** 解码好的采样记下响度（每个文件只量一次）。 */
function measured(id, buffer) {
  const known = samples.get(id)
  if (known && known.buffer) return known
  const sample = { buffer, level: bufferLoudness(buffer) }
  samples.set(id, sample)
  return sample
}
/** 解码好、量好响度的采样；还没好时开始准备，返回 null（这一下先不响）。 */
function loadSample(ac, id) {
  const known = samples.get(id)
  if (known) return known.buffer ? known : null
  samples.set(id, {})
  decoded(ac, id).then(buffer => measured(id, buffer), () => samples.delete(id))
  return null
}
/** 等采样准备好。 */
const sampleReady = (ac, id) => decoded(ac, id).then(buffer => measured(id, buffer))
/** 放一下采样：rate 变速（音高跟着变），volume 增益。 */
function playSample(ac, sample, { rate = 1, volume = 1, at = ac.currentTime, out = ac.destination, fadeIn = 0, glide = 0 } = {}) {
  if (!(volume > 0)) return
  const src = ac.createBufferSource()
  const g = ac.createGain()
  src.buffer = sample.buffer
  if (glide) { const len = sample.buffer.duration / rate; src.playbackRate.setValueAtTime(rate, at); src.playbackRate.linearRampToValueAtTime(rate * (1 + glide), at + len * 0.7) } else src.playbackRate.value = rate
  if (fadeIn > 0) { g.gain.setValueAtTime(0.0001, at); g.gain.linearRampToValueAtTime(volume, at + fadeIn) } else g.gain.value = volume
  src.connect(g).connect(out)
  src.start(at)
}

/** 放上传的、音效库的文件：base 是它顶替的内置配方，按它的响度对齐。 */
function playFile(ac, id, volume, base) {
  if (!(volume > 0)) return
  if (base) recipeLevel(base)
  decoded(ac, id).then(buffer => {
    const src = ac.createBufferSource()
    const g = ac.createGain()
    const t = ac.currentTime
    src.buffer = buffer
    if (base) volume *= matchGain(base, measured(id, buffer))
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

/**
 * 音效库的声音顶替内置配方（打字音、落字音效、界面音）时已经按配方对齐了响度；库里的音量是给剧情音效、环境音拉平响度调的
 * （录得轻的可能调到好几倍），这里只当微调，最多 2 倍。
 */
const slotVolume = lib => Math.min(2, lib.volume ?? 1)

/** 落字音效、界面音：内置配方现场合成；上传的文件、音效库的声音（库里删了的退回默认版本）按默认版本的响度放。 */
function playSound(sound, volume) {
  const ac = sound && audioCtx()
  if (!ac) return
  const lib = sound.libId ? libSound(sound.libId) : null
  if (lib) playFile(ac, lib.assetId, volume * slotVolume(lib), sound.parts)
  else if (sound.assetId) playFile(ac, sound.assetId, volume, sound.parts)
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

/**
 * 回忆里的声音：像闷在水下。低通压到 cutoff 上下（两级，坡很陡）、低频鼓一点；
 * 截止频率和音高都被很慢的振荡推着来回晃（水面在动），再带一点同样闷着的短混响。
 * cutoff 截止频率，wet 混响多少，sway 音高晃多少（秒，延迟线的摆幅）。
 */
function underwater({ cutoff, wet, sway }) {
  return (ac, input, out) => {
    const wobble = ac.createDelay(0.05); wobble.delayTime.value = 0.015
    const drift = ac.createOscillator(); drift.frequency.value = 1.1
    drift.connect(amp(ac, sway)).connect(wobble.delayTime); drift.start()
    const muffle = filter(ac, 'lowpass', cutoff, 1.2)
    const tide = ac.createOscillator(); tide.frequency.value = 0.37
    tide.connect(amp(ac, cutoff * 0.25)).connect(muffle.frequency); tide.start()
    const body = input.connect(wobble).connect(filter(ac, 'highpass', 70)).connect(muffle).connect(filter(ac, 'lowpass', cutoff * 1.5)).connect(filter(ac, 'peaking', 240, 0.9, 5))
    body.connect(amp(ac, 0.38)).connect(out)
    const room = ac.createConvolver(); room.buffer = impulse(ac, 0.8, 2.6)
    body.connect(room).connect(filter(ac, 'lowpass', cutoff * 0.8)).connect(amp(ac, wet)).connect(out)
  }
}
// 短闪回各基调的回忆声：伤感、不安沉得更深，朦胧混响多，猛然想起的那一下浮得最近（还是闷的）
const MEMORY_DEPTH = {
  warm: { cutoff: 620, wet: 0.14, sway: 0.0025 },
  sweet: { cutoff: 720, wet: 0.15, sway: 0.003 },
  sad: { cutoff: 520, wet: 0.17, sway: 0.002 },
  dread: { cutoff: 420, wet: 0.13, sway: 0.004 },
  flash: { cutoff: 900, wet: 0.1, sway: 0.0015 },
  haze: { cutoff: 560, wet: 0.24, sway: 0.0035 },
}
// 回忆的声音整体沉一点、慢一点
const MEMORY_RATE = { warm: 0.92, sweet: 0.95, sad: 0.88, dread: 0.85, flash: 0.97, haze: 0.9 }
// 隔着水，字的起音软下来、尾巴拖长一点
const submerged = parts => parts.map(p => ({ ...p, attack: Math.max(p.attack ?? 0.006, 0.016), dur: p.dur * 1.3 }))
// 偶尔冒一个小气泡（往上一挑的短音），跟字一起过同一条闷住的链
const BUBBLE = [{ wave: 'sine', f: 280, to: 820, dur: 0.05, gain: 0.03, attack: 0.004 }]

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
  // 机械音：环形调制 + 削波，像机器人、AI、变声器
  machine: (ac, input, out) => {
    const ring = ac.createGain(); ring.gain.value = 0
    const lfo = ac.createOscillator(); lfo.type = 'sine'; lfo.frequency.value = 95
    lfo.connect(ring.gain); lfo.start()
    input.connect(ring).connect(shaper(ac, 10)).connect(filter(ac, 'highpass', 180)).connect(amp(ac, 0.9)).connect(out)
    input.connect(amp(ac, 0.25)).connect(out)
  },
}
// 回忆：每种基调一条（memory-warm、memory-sad……），见上面的 underwater
for (const [tone, depth] of Object.entries(MEMORY_DEPTH)) VOICE_CHAINS['memory-' + tone] = underwater(depth)
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

// ───────────── 打字音 ─────────────

const CLASSIC = voiceById('classic').parts
/**
 * 一个音色怎么出声：内置的、自己做的照配方合成（{ parts }，自己做的配方在设置的 customVoices 里，删掉了的退回经典哔哔）；
 * 音效库里的打字音放采样（{ sample, gain }，响度对齐经典哔哔，再乘库里给它调的音量）。
 * 音效库还没读到、采样还没下载解码好时返回 null（这个字先不响，同时开始准备）；库里已经删掉的退回经典哔哔。
 */
function voiceSource(ac, id) {
  if (isCustomRef(id)) return { parts: findVoice(id, sounds)?.parts || CLASSIC }
  if (!isLibRef(id)) { const v = voiceById(id); return v ? { parts: v.parts } : null }
  if (!soundlibNow()) return null
  const lib = libSound(libIdOf(id))
  if (!lib) return { parts: CLASSIC }
  const sample = loadSample(ac, lib.assetId)
  recipeLevel(CLASSIC)
  return sample ? { sample, gain: slotVolume(lib) * matchGain(CLASSIC, sample) } : null
}
/**
 * 响一下：配方合成，或者放采样（变速当移调）。memory 时配方的起音软下来、尾巴拖长（采样照原样，只靠效果链闷住）。
 * mood 是这句的情绪（lib/voice-mood.js）：配方按它叠气声、改起音、发颤；采样叠一层气息、软起音靠淡入。
 */
function emit(ac, source, { rate = 1, volume = 1, at = ac.currentTime, out = ac.destination, memory = false, mood = null, hold = 1, glide = 0 } = {}) {
  if (source.sample) {
    playSample(ac, source.sample, { rate, volume: volume * source.gain, at, out, fadeIn: mood && mood.attack > 1.05 ? 0.004 * mood.attack : 0, glide })
    if (mood && mood.breath >= 0.05) playParts(ac, BREATH, { rate, volume: volume * mood.breath, at, out, stretch: hold })
  } else playParts(ac, shapeBlip(memory ? submerged(source.parts) : source.parts, mood), { rate, volume, at, out, stretch: hold > 1 ? 1 + (hold - 1) * 0.6 : 1, glide })
}
/** 采样的打字音带气声时叠的那一层（合成的配方由 shapeBlip 按配方本身的音高叠）。 */
const BREATH = [{ wave: 'noise', f: 2600, q: 1.4, dur: 0.06, gain: 0.012, attack: 0.008 }]

/** 先把这些音色用到的采样下载、解码好（剧场按这一局的角色和旁白调一次），第一句话第一个字就能响。 */
export function warmVoices(voices) {
  const ac = audioCtx()
  if (!ac) return
  for (const voice of voices || []) {
    if (!voice || !isLibRef(voice.id)) continue
    const lib = libSound(libIdOf(voice.id))
    if (lib) loadSample(ac, lib.assetId)
  }
  recipeLevel(CLASSIC)
}

/**
 * 打字音：voice 是 lib/sounds.js 的 lineVoice 算出来的 { id 音色, pitch 升降几个半音, gain }，
 * 再带上这句的声音样子 style（电话、广播、心灵感应、齐声……见 lib/vocab.js 的 VOICES）；齐声时 also 是另外几个人的声音。
 * pitch / gain 是演法和情绪合起来的倍数（威压低沉、激动尖细、低语轻、哭着说压低）。每个字音高随机抖一点，不那么机械。
 * mood 是这句的情绪（lib/voice-mood.js）：气声、起音、发颤跟着它。
 * 音色可以是音效库里的打字音（lib:编号）：放那段采样，变速当移调。
 */
export function blip(voice, { pitch = 1, gain = 1, mood = null, hold = 1, glide = 0, jitter: wobbly = true } = {}) {
  const ac = voice && audioCtx()
  const v = ac && voiceSource(ac, voice.id)
  if (!v) return
  const style = voice.style || ''
  // 句调开着时起伏已经在 pitch 里（lib/prosody.js 的平滑随机游走），只留一点点抖；关着时照旧 ±4%
  const jitter = pitch * (wobbly ? 0.96 + Math.random() * 0.08 : 0.995 + Math.random() * 0.01)
  const volume = (sounds.blipVolume ?? 1) * gain
  const rateOf = who => 2 ** ((who.pitch || 0) / 12) * jitter
  if (style === 'chorus') {
    // 齐声：每个人的声音各响一下，错开几毫秒；只有一个人的声音时叠两个错开音高的分身
    const others = (voice.also || []).map(o => ({ who: o, source: voiceSource(ac, o.id) })).filter(o => o.source)
    const group = others.length ? [{ who: voice, source: v }, ...others] : [voice, { ...voice, pitch: (voice.pitch || 0) - 3 }, { ...voice, pitch: (voice.pitch || 0) + 4 }].map(who => ({ who, source: v }))
    const share = 1 / Math.sqrt(group.length)
    group.forEach(({ who, source }, i) => emit(ac, source, { rate: rateOf(who), volume: volume * share * (who.gain ?? 1), at: ac.currentTime + i * 0.014, mood, hold, glide }))
    return
  }
  // 短闪回里的回忆声按基调换一条链（voice.tone，见 Theater.jsx）
  const memory = style === 'memory' ? (MEMORY_DEPTH[voice.tone] ? voice.tone : 'warm') : ''
  const out = chainFor(ac, memory ? 'memory-' + memory : style)
  const rate = rateOf(voice) * (style === 'telepathy' ? 1.08 : style === 'machine' ? 0.94 : memory ? MEMORY_RATE[memory] : 1)
  if (memory) {
    // 回忆：软起音的字 + 低八度的一层（声音变厚、发闷），偶尔冒个气泡
    emit(ac, v, { rate, volume: volume * (voice.gain ?? 1), out, memory: true, mood, hold, glide })
    emit(ac, v, { rate: rate / 2, volume: volume * 0.45 * (voice.gain ?? 1), out, memory: true })
    if (Math.random() < 0.16) playParts(ac, BUBBLE, { rate: 0.8 + Math.random() * 0.6, volume, out, at: ac.currentTime + 0.03 + Math.random() * 0.04 })
    return
  }
  emit(ac, v, { rate, volume: volume * (voice.gain ?? 1), out, mood, hold, glide })
  // 心灵感应：高八度的一层虚影；广播：一点电流声
  if (style === 'telepathy') emit(ac, v, { rate: rate * 2, volume: volume * 0.22 * (voice.gain ?? 1), out })
  if (style === 'radio') playParts(ac, [{ wave: 'noise', f: 3200, q: 0.8, gain: 0.05, dur: 0.06 }], { volume, out })
}

/**
 * 试听一个音色：按打字音音量念一小段（三个字、一个停顿、再四个字）。ui 是当前设置。音效库的打字音等下载好再念。
 * voice 带着 parts 时直接照这份配方念（编辑自己的音色时还没保存的那份）。
 */
export async function previewVoice(voice, ui = sounds) {
  const ac = voice && audioCtx()
  if (!ac) return
  if (isLibRef(voice.id)) {
    const lib = libSound(libIdOf(voice.id))
    if (lib) { await sampleReady(ac, lib.assetId); await recipeLevelDone(CLASSIC) }
  }
  const v = voice.parts ? { parts: voice.parts } : isCustomRef(voice.id) ? { parts: findVoice(voice.id, ui)?.parts || CLASSIC } : voiceSource(ac, voice.id)
  if (!v) return
  const base = 2 ** ((voice.pitch || 0) / 12)
  const t0 = ac.currentTime + 0.02
  for (const dt of [0, 0.09, 0.18, 0.42, 0.51, 0.6, 0.69]) emit(ac, v, { rate: base * (0.96 + Math.random() * 0.08), volume: ui.blipVolume ?? 1, at: t0 + dt })
}
/**
 * 试听情绪：同一个音色把一句话按 plan（lib/typing.js 的 planLine，带着情绪）念一遍：哪个字响、什么时候响、音高音量都照剧场的算法。
 * 返回这句念多久（毫秒）。
 */
export async function previewLine(voice, chars, plan, ui = sounds) {
  const ac = voice && audioCtx()
  if (!ac || !plan || !plan.times.length) return 0
  if (isLibRef(voice.id)) {
    const lib = libSound(libIdOf(voice.id))
    if (lib) { await sampleReady(ac, lib.assetId); await recipeLevelDone(CLASSIC) }
  }
  const v = isCustomRef(voice.id) ? { parts: findVoice(voice.id, ui)?.parts || CLASSIC } : voiceSource(ac, voice.id)
  if (!v) return 0
  const base = 2 ** ((voice.pitch || 0) / 12)
  const t0 = ac.currentTime + 0.03
  const d = plan.blip
  for (const note of plan.notes || []) {
    const b = plan.blips && plan.blips[note.i]
    const wobble = note.jitter === false ? 0.995 + Math.random() * 0.01 : 0.96 + Math.random() * 0.08
    emit(ac, v, { rate: base * d.pitch * (b ? b.pitch : 1) * 2 ** ((note.semis || 0) / 12) * wobble, volume: (ui.blipVolume ?? 1) * d.gain * (b ? b.gain : 1) * (note.gain ?? 1), at: t0 + note.at / 1000, mood: plan.mood, hold: note.hold, glide: note.glide })
  }
  return plan.times[plan.times.length - 1] + 200
}
/** 这份配方比经典哔哔响多少（A 计权响度之比），做自己的音色时「音量对齐经典哔哔」用。量不出来时是 1。 */
export async function loudnessVsClassic(parts) {
  await recipeLevelDone(CLASSIC)
  await recipeLevelDone(parts)
  const a = recipeLevel(parts).value, b = recipeLevel(CLASSIC).value
  return a > 0 && b > 0 ? a / b : 1
}
/** 等配方的响度量好（最多等半秒）。 */
async function recipeLevelDone(parts) {
  const job = recipeLevel(parts)
  for (let i = 0; i < 25 && job.value === null; i += 1) await new Promise(r => setTimeout(r, 20))
}

/** 落字音效：impact / slam / stab / ding / whoosh，按设置里选的版本或上传的文件；音效关了不响。 */
export function stinger(kind) {
  if (sounds.sfx !== false) playSound(soundFor(sounds, kind), sounds.sfxVolume ?? 1)
}

/** 拟音：小瞬间（拍照、干杯、烟花……）的合成声音，配方在 lib/foley.js。delay 毫秒后再响。跟落字音效同一个开关和音量。 */
export function foley(id, delay = 0) {
  if (sounds.sfx === false || !FOLEY[id]) return
  const ac = audioCtx()
  if (ac) playParts(ac, FOLEY[id], { volume: sounds.sfxVolume ?? 1, at: ac.currentTime + delay / 1000 })
}

/** 剧情音效里的内置拟声（砰、咚、叮……，lib/foley.js 的 ONOMATOPOEIA）：开关和音量跟剧情音效走（调用方给），不看界面音效的开关。 */
export function storyFoley(id, volume = 1) {
  const ac = FOLEY[id] && volume > 0 && audioCtx()
  if (ac) playParts(ac, FOLEY[id], { volume })
}

/** 界面音：hover / select / page / open（back 当 select）。跟落字音效同一个开关和音量。 */
export function sfx(kind = 'select') {
  stinger(kind === 'back' ? 'select' : kind)
}

/** 试听某一种音效的某个版本（custom 是上传的那个，lib:编号 是音效库里的），不看音效开关。ui 是当前设置。 */
export function previewSound(slot, choice, ui = sounds) {
  const def = slotById(slot)
  if (!def || choice === 'off') return
  playSound(soundFor({ ...ui, sounds: { ...ui.sounds, [slot]: choice } }, slot), ui.sfxVolume ?? 1)
}

// ───────────── 亲密场面（lib/eros.js）─────────────
// 一下一下的音效、节奏底（两条：eros 一条、触手一条）、高潮那一下。开关和音量跟剧情音效走（调用方给），画面上不出字。
// 这些是合成的兜底：导演配了音效库里的录音时放录音（剧情音效走 playLibSound，节奏底走 playErosLoop），合成的不响。

/** 随机抖一点（音高、拍子），同一个声音连着响也不机械。 */
const wobble = (k = 0.06) => 1 - k + Math.random() * 2 * k

/** 亲密场面的一下音效（插入、射精、触手爬过……，lib/eros.js 的 EROS_SFX）。 */
export function erosFoley(id, volume = 1) {
  const ac = EROS_FOLEY[id] && volume > 0 && audioCtx()
  if (ac) playParts(ac, EROS_FOLEY[id], { rate: wobble(0.04), volume })
}

/** 节奏底的一条：定时器每 TICK_MS 往前排 AHEAD 秒的音（页面在后台时定时器变慢，会空几拍）。 */
const AHEAD = 0.3
const TICK_MS = 100
function rhythm() {
  let now = null // { key, plan, volume, t 下一下什么时候响, step 第几拍 }
  let timer = 0
  let quietUntil = 0
  const tick = () => {
    if (!now || !ctx) return
    while (now.t < ctx.currentTime + AHEAD) {
      const at = Math.max(now.t, ctx.currentTime + 0.01)
      if (at >= quietUntil) now.plan.play(ctx, at, now.step, now.volume)
      now.t = at + now.plan.gap()
      now.step += 1
    }
  }
  return {
    set(key, plan, volume) {
      if (!plan || !(volume > 0)) { this.stop(); return }
      if (now && now.key === key) { now.volume = volume; return }
      const ac = audioCtx()
      if (!ac) return
      // 换了节奏从下一拍接着走；刚开始时等 START 秒（进场景那一下先让画面换过去）
      now = { key, plan, volume, t: now ? Math.max(now.t, ac.currentTime + 0.05) : ac.currentTime + EROS_START, step: 0 }
      if (!timer) timer = setInterval(tick, TICK_MS)
      tick()
    },
    stop() { now = null; if (timer) { clearInterval(timer); timer = 0 } },
    /** 停 seconds 秒（高潮那一下只剩心跳和长鸣），之后接着响。 */
    quiet(seconds) { if (ctx) quietUntil = ctx.currentTime + seconds },
  }
}
/** 节奏底开始前等多久（秒）。 */
const EROS_START = 0.25

/** 画面的律动（Eros.jsx 的 useErosPulse）听节奏底：每排下一拍就告诉它还有几毫秒响、这一拍多长、什么节奏。返回取消的函数。 */
const beatListeners = new Set()
export function onErosBeat(fn) { beatListeners.add(fn); return () => beatListeners.delete(fn) }

/** 抽插的节奏（scene.eros）：一拍里按 EROS_LOOPS 排的几下；有触手时换成触手的（TENTACLE_SWAP）。cue：告诉画面（试听时不告诉）。 */
function paceLoop(pace, tentacle, cue = true) {
  const def = EROS_LOOPS[pace]
  if (!def) return null
  return {
    gap: () => def.beat * wobble(0.02),
    play(ac, at, step, volume) {
      for (const [id, phase, gain, every] of def.hits) {
        if (every && step % every) continue
        const parts = EROS_FOLEY[tentacle ? TENTACLE_SWAP[id] || id : id]
        if (!parts) continue
        const t = at + phase * def.beat + (Math.random() - 0.5) * (def.swing || 0) * def.beat
        playParts(ac, parts, { rate: wobble(0.06), volume: volume * gain, at: Math.max(at, t) })
      }
      if (!cue || !beatListeners.size) return
      // 声音真正出来还要再晚一点（outputLatency）
      const ms = (at - ac.currentTime + (ac.outputLatency || ac.baseLatency || 0)) * 1000
      for (const fn of beatListeners) fn({ in: Math.max(0, ms), beat: def.beat * 1000, pace })
    },
  }
}
/** 触手的蠕动（scene.tentacle）：隔一会儿从一组里随便挑一下。 */
function tentacleLoop(kind) {
  const def = TENTACLE_LOOPS[kind]
  if (!def) return null
  const [lo, hi] = def.every
  return {
    gap: () => lo + Math.random() * (hi - lo),
    play(ac, at, step, volume) {
      const [id, gain] = def.pool[Math.floor(Math.random() * def.pool.length)]
      playParts(ac, EROS_FOLEY[id], { rate: wobble(0.1), volume: volume * gain, at })
    },
  }
}
const erosBed = rhythm()
const tentacleBed = rhythm()

/** 节奏底：pace 是 scene.eros，tentacle 是 scene.tentacle；是 none（或 volume 为 0）的那一条停下。 */
export function playEros(pace, tentacle, volume = 1) {
  const writhing = Boolean(TENTACLE_LOOPS[tentacle])
  erosBed.set(pace + (writhing ? '|tentacle' : ''), paceLoop(pace, writhing), volume)
  tentacleBed.set(tentacle, tentacleLoop(tentacle), volume * 0.8)
}
export function stopEros() { erosBed.stop(); tentacleBed.stop() }
/** 节奏底循环音效库里的一段录音：{ id, url }，null 停掉（淡出）。换一段时交叉淡入淡出。 */
export function playErosLoop(sound, volume = 1) { erosRecording.play(sound, volume) }

/**
 * 高潮那一下（climax / cum / both）：节奏底停一会儿（录音压得很低）、配乐压低一会儿，只剩心跳、长鸣和脉动。
 * sound 为 false 时合成的心跳和脉动不响（那一句配了音效库里的射精、高潮声），只停节奏、压配乐。
 */
const PEAK_QUIET = { climax: 2.6, cum: 1.8, both: 2.6 }
export function erosPeak(kind, volume = 1, { sound = true } = {}) {
  const ac = PEAK_FOLEY[kind] && volume > 0 && audioCtx()
  if (!ac) return
  if (sound) for (const id of PEAK_FOLEY[kind]) playParts(ac, EROS_FOLEY[id], { volume })
  erosBed.quiet(PEAK_QUIET[kind])
  tentacleBed.quiet(PEAK_QUIET[kind])
  erosRecording.duck(0.2, PEAK_QUIET[kind] * 1000)
  music.duck(0.35, PEAK_QUIET[kind] * 1000)
}

/** 设置里试听节奏底：另起两条响 seconds 秒，剧场里正在响的先停这么久。 */
let trial = null
export function previewEros(pace, tentacle, volume = 1, seconds = 5) {
  if (trial) { trial.beds.forEach(b => b.stop()); clearTimeout(trial.timer) }
  const beds = [rhythm(), rhythm()]
  const writhing = Boolean(TENTACLE_LOOPS[tentacle])
  beds[0].set('trial', paceLoop(pace, writhing, false), volume)
  beds[1].set('trial', tentacleLoop(tentacle), volume * 0.8)
  erosBed.quiet(seconds + 0.5)
  tentacleBed.quiet(seconds + 0.5)
  erosRecording.duck(0, (seconds + 0.5) * 1000)
  trial = { beds, timer: setTimeout(() => { beds.forEach(b => b.stop()); trial = null }, seconds * 1000) }
}
