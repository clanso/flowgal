// 配乐（「我的配乐」里的曲子，交叉淡入淡出；设置里试听时先把它压下去）+ 打字音 / 界面音（WebAudio 合成，不需要音频文件）。
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

/** 打字音：每个说话人一个音高，旁白低一点。 */
export function blip(seed = '', type = 'dialogue') {
  const ac = audioCtx()
  if (!ac) return
  let h = 0
  for (const ch of String(seed)) h = (h * 31 + ch.codePointAt(0)) >>> 0
  const base = type === 'narration' ? 300 : 420 + (h % 7) * 38
  const t = ac.currentTime
  const osc = ac.createOscillator()
  const gain = ac.createGain()
  osc.type = type === 'thought' ? 'sine' : 'triangle'
  osc.frequency.setValueAtTime(base * (0.96 + Math.random() * 0.08), t)
  gain.gain.setValueAtTime(0.0001, t)
  gain.gain.exponentialRampToValueAtTime(0.045, t + 0.004)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.05)
  osc.connect(gain).connect(ac.destination)
  osc.start(t)
  osc.stop(t + 0.06)
}

/** 界面音：hover / select / page。 */
export function sfx(kind = 'select') {
  const ac = audioCtx()
  if (!ac) return
  const t = ac.currentTime
  const notes = { hover: [880], select: [660, 990], page: [520], open: [440, 660, 880], back: [660, 440] }[kind] || [660]
  notes.forEach((f, i) => {
    const osc = ac.createOscillator()
    const gain = ac.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(f, t + i * 0.06)
    gain.gain.setValueAtTime(0.0001, t + i * 0.06)
    gain.gain.exponentialRampToValueAtTime(kind === 'hover' ? 0.018 : 0.05, t + i * 0.06 + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.06 + 0.18)
    osc.connect(gain).connect(ac.destination)
    osc.start(t + i * 0.06)
    osc.stop(t + i * 0.06 + 0.2)
  })
}
