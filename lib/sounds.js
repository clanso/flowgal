// 声音目录：角色打字音的音色、落字音效和界面音的各个版本。都是 WebAudio 现场合成的配方（纯数据），不需要音频文件；
// 前端照配方发声（src/client/theater/audio.js），宿主用它校验设置和档案。每种音效还可以换成玩家上传的音频。
//
// 配方是一组「声部」，每个声部同时（或延后 at 秒）响起：
//   wave   sine / triangle / square / sawtooth 是振荡器，noise 是滤过的白噪声
//   f, to  起止频率（Hz，指数滑过去；noise 是滤波器频率）
//   dur    多久衰减到听不见（秒）；gain 峰值音量；attack 起音时间（秒，振荡器默认 0.006，噪声默认 0 即瞬间起）
//   q      噪声滤波器的 Q；lp 振荡器后面加一道低通（Hz）
// 打字音的配方按角色音高整体移调（频率全部乘同一个倍数）。

const p = (wave, f, dur, gain, more = {}) => ({ wave, f, dur, gain, ...more })

/**
 * 打字音音色。gender 决定「自动」时分给谁：female 女声、male 男声，空串是不分男女的。
 * classic 是最早的那一个（三角波哔哔），没标性别的角色自动用它，跟以前一样按名字错开音高。
 */
export const VOICES = Object.freeze([
  { id: 'classic', label: '经典哔哔', desc: '逆转裁判式的三角波哔哔声', gender: '', parts: [p('triangle', 420, 0.05, 0.045, { attack: 0.004 })] },
  { id: 'bell', label: '清亮铃音', desc: '干净透亮，带一点泛音', gender: 'female', parts: [p('sine', 660, 0.07, 0.05, { attack: 0.003 }), p('sine', 1320, 0.04, 0.015, { attack: 0.003 })] },
  { id: 'chirp', label: '少女啾啾', desc: '每个字往上一挑，活泼', gender: 'female', parts: [p('triangle', 520, 0.05, 0.045, { to: 640, attack: 0.004 })] },
  { id: 'soft', label: '温柔气声', desc: '软一点、带气息', gender: 'female', parts: [p('sine', 480, 0.07, 0.04, { attack: 0.012 }), p('noise', 2400, 0.05, 0.025, { q: 1.5, attack: 0.01 })] },
  { id: 'cool', label: '冷淡御姐', desc: '短促、偏方的音色，压着说', gender: 'female', parts: [p('square', 400, 0.045, 0.02, { attack: 0.003, lp: 1600 })] },
  { id: 'bubble', label: '元气泡泡', desc: '每个字往下一落，像吐泡泡', gender: 'female', parts: [p('sine', 760, 0.06, 0.055, { to: 560, attack: 0.003 })] },
  { id: 'boy', label: '少年清亮', desc: '中音，干脆', gender: 'male', parts: [p('triangle', 330, 0.05, 0.05, { attack: 0.004 }), p('sine', 660, 0.03, 0.012)] },
  { id: 'deep', label: '低沉男声', desc: '厚实的低音', gender: 'male', parts: [p('sawtooth', 150, 0.06, 0.035, { attack: 0.005, lp: 900 })] },
  { id: 'gruff', label: '粗犷大叔', desc: '更低、带点沙哑', gender: 'male', parts: [p('square', 118, 0.06, 0.03, { attack: 0.004, lp: 700 }), p('noise', 500, 0.04, 0.03, { q: 0.8 })] },
  { id: 'elder', label: '老者', desc: '低、慢慢往下沉，有点颤', gender: 'male', parts: [p('triangle', 190, 0.07, 0.05, { to: 175, attack: 0.006 }), p('triangle', 193, 0.07, 0.03, { to: 178, attack: 0.006 })] },
  { id: 'kid', label: '孩童', desc: '很高、往上挑', gender: '', parts: [p('sine', 880, 0.045, 0.05, { to: 980, attack: 0.003 })] },
  { id: 'wood', label: '木琴', desc: '敲击感，圆润', gender: '', parts: [p('sine', 520, 0.09, 0.06, { attack: 0.002 }), p('sine', 2080, 0.02, 0.02, { attack: 0.001 })] },
  { id: 'retro', label: '8-bit 掌机', desc: '老游戏机的方波', gender: '', parts: [p('square', 523, 0.04, 0.022, { attack: 0.002 })] },
  { id: 'robot', label: '机械电子', desc: '金属感，像机器人', gender: '', parts: [p('sawtooth', 300, 0.05, 0.025, { attack: 0.002, lp: 2200 }), p('square', 603, 0.05, 0.012, { attack: 0.002 })] },
  { id: 'typewriter', label: '打字机', desc: '咔嗒咔嗒，适合旁白', gender: '', parts: [p('noise', 3200, 0.025, 0.09, { q: 2 }), p('square', 1800, 0.012, 0.01, { attack: 0.001 })] },
  { id: 'whisper', label: '耳语', desc: '只有气声，像凑在耳边', gender: '', parts: [p('noise', 1800, 0.06, 0.05, { q: 3, attack: 0.01 })] },
])

export const VOICE_IDS = new Set(VOICES.map(v => v.id))
export const voiceById = id => VOICES.find(v => v.id === id) || null
/** 自动分配时各性别从哪几个里挑（按名字固定挑一个）。没标性别的用经典哔哔，跟以前一样。 */
const VOICE_POOLS = { female: ['bell', 'chirp', 'soft', 'cool', 'bubble'], male: ['boy', 'deep', 'gruff', 'elder'], other: ['classic', 'kid', 'wood', 'robot'], '': ['classic'] }
export const VOICE_PITCH_LIMIT = 6 // 角色音高微调：上下各 6 个半音

/** 落字音效和界面音：每一种是一个「槽」，有几个内置版本，第一个是默认（也就是以前的声音）。 */
export const SOUND_SLOTS = Object.freeze([
  {
    id: 'impact', label: '重音落地', hint: '重音字砸下来的那一下', group: 'stage',
    presets: [
      { id: 'thud', label: '闷咚', parts: [p('sine', 150, 0.28, 0.22, { to: 52 }), p('noise', 900, 0.07, 0.08, { q: 0.8 })] },
      { id: 'boom', label: '低音炮', parts: [p('sine', 90, 0.5, 0.3, { to: 38 }), p('noise', 200, 0.15, 0.08, { q: 0.5 })] },
      { id: 'gavel', label: '法槌', parts: [p('triangle', 420, 0.09, 0.18, { to: 300, attack: 0.001 }), p('noise', 2200, 0.05, 0.15, { q: 2 }), p('sine', 180, 0.2, 0.12, { to: 90 })] },
      { id: 'punch', label: '重拳', parts: [p('noise', 1200, 0.09, 0.22, { q: 0.5 }), p('sine', 110, 0.22, 0.25, { to: 45 })] },
      { id: 'taiko', label: '太鼓', parts: [p('sine', 120, 0.6, 0.28, { to: 80, attack: 0.002 }), p('noise', 600, 0.05, 0.08, { q: 1 }), p('sine', 240, 0.15, 0.06, { to: 160 })] },
    ],
  },
  {
    id: 'slam', label: '怒吼拍桌', hint: '吼出来的台词', group: 'stage',
    presets: [
      { id: 'desk', label: '拍桌', parts: [p('triangle', 95, 0.35, 0.28, { to: 40 }), p('noise', 1600, 0.18, 0.2, { q: 0.6 }), p('noise', 300, 0.25, 0.18, { q: 0.7, at: 0.01 })] },
      { id: 'crash', label: '碎裂', parts: [p('noise', 3500, 0.5, 0.18, { q: 0.4 }), p('noise', 800, 0.3, 0.15, { q: 0.6 }), p('triangle', 80, 0.3, 0.2, { to: 40 })] },
      { id: 'thunder', label: '雷鸣', parts: [p('noise', 200, 1.1, 0.3, { q: 0.5, attack: 0.02 }), p('sine', 60, 0.9, 0.25, { to: 35 })] },
      { id: 'hammer', label: '重锤', parts: [p('square', 70, 0.3, 0.12, { to: 35, lp: 500 }), p('noise', 1000, 0.12, 0.25, { q: 0.7 })] },
      { id: 'gong', label: '铜锣', parts: [p('sine', 180, 1.4, 0.12, { attack: 0.005 }), p('sine', 267, 1.2, 0.08), p('sine', 413, 0.9, 0.05), p('noise', 1500, 0.08, 0.08, { q: 0.8 })] },
    ],
  },
  {
    id: 'stab', label: '刺中要害', hint: '被戳中、崩溃的那一下', group: 'stage',
    presets: [
      { id: 'stab', label: '尖刺', parts: [p('sawtooth', 1400, 0.32, 0.08, { to: 180 }), p('square', 700, 0.4, 0.05, { to: 90 }), p('noise', 2500, 0.12, 0.12, { q: 1.2 })] },
      { id: 'glass', label: '玻璃碎', parts: [p('noise', 5000, 0.35, 0.12, { q: 1 }), p('sine', 2637, 0.3, 0.04), p('sine', 3520, 0.25, 0.03, { at: 0.02 })] },
      { id: 'zap', label: '电击', parts: [p('sawtooth', 2200, 0.25, 0.06, { to: 120 }), p('square', 60, 0.25, 0.04, { lp: 1200 }), p('noise', 4000, 0.1, 0.06, { q: 1 })] },
      { id: 'strings', label: '惊愕弦乐', parts: [p('sawtooth', 622, 0.6, 0.03, { attack: 0.01, lp: 3000 }), p('sawtooth', 659, 0.6, 0.03, { attack: 0.01, lp: 3000 }), p('sawtooth', 932, 0.6, 0.025, { attack: 0.01, lp: 3000 })] },
      { id: 'heart', label: '心跳骤停', parts: [p('sine', 70, 0.15, 0.3, { to: 50 }), p('sine', 70, 0.18, 0.3, { to: 50, at: 0.22 })] },
    ],
  },
  {
    id: 'ding', label: '灵光一闪', hint: '漫画符号是灯泡时', group: 'stage',
    presets: [
      { id: 'ding', label: '叮', parts: [p('sine', 1568, 0.6, 0.08), p('sine', 2093, 0.7, 0.07, { at: 0.07 })] },
      { id: 'sparkle', label: '闪光', parts: [p('sine', 2093, 0.25, 0.05), p('sine', 2637, 0.25, 0.045, { at: 0.05 }), p('sine', 3136, 0.35, 0.04, { at: 0.1 })] },
      { id: 'chime', label: '风铃', parts: [p('sine', 1760, 1, 0.05), p('sine', 2217, 0.9, 0.04, { at: 0.12 }), p('sine', 2637, 0.8, 0.035, { at: 0.24 })] },
      { id: 'pop', label: '啵', parts: [p('sine', 500, 0.09, 0.12, { to: 1500, attack: 0.002 })] },
      { id: 'arp', label: '上行琶音', parts: [p('triangle', 784, 0.18, 0.06), p('triangle', 988, 0.18, 0.06, { at: 0.06 }), p('triangle', 1175, 0.18, 0.06, { at: 0.12 }), p('triangle', 1568, 0.4, 0.06, { at: 0.18 })] },
    ],
  },
  {
    id: 'select', label: '点按钮', hint: '菜单、选项、快捷键', group: 'ui',
    presets: [
      { id: 'pop', label: '双音', parts: [p('sine', 660, 0.18, 0.05, { attack: 0.01 }), p('sine', 990, 0.18, 0.05, { attack: 0.01, at: 0.06 })] },
      { id: 'click', label: '轻点', parts: [p('noise', 4000, 0.02, 0.1, { q: 3 }), p('sine', 1200, 0.03, 0.02, { attack: 0.001 })] },
      { id: 'wood', label: '木鱼', parts: [p('sine', 880, 0.08, 0.08, { to: 700, attack: 0.001 })] },
      { id: 'bubble', label: '水泡', parts: [p('sine', 400, 0.07, 0.07, { to: 900, attack: 0.002 })] },
      { id: 'retro', label: '8-bit', parts: [p('square', 988, 0.05, 0.025, { attack: 0.001 }), p('square', 1319, 0.08, 0.025, { attack: 0.001, at: 0.05 })] },
    ],
  },
  {
    id: 'hover', label: '指到按钮', hint: '鼠标移到选项上', group: 'ui',
    presets: [
      { id: 'tick', label: '轻响', parts: [p('sine', 880, 0.18, 0.018, { attack: 0.01 })] },
      { id: 'soft', label: '更轻', parts: [p('sine', 660, 0.12, 0.012, { attack: 0.02 })] },
      { id: 'wood', label: '木', parts: [p('sine', 1320, 0.04, 0.025, { to: 1100, attack: 0.001 })] },
      { id: 'glass', label: '玻璃', parts: [p('sine', 2637, 0.12, 0.01, { attack: 0.002 })] },
      { id: 'retro', label: '8-bit', parts: [p('square', 1760, 0.02, 0.01, { attack: 0.001 })] },
    ],
  },
  {
    id: 'page', label: '翻页', hint: '翻到下一句', group: 'ui',
    presets: [
      { id: 'tone', label: '单音', parts: [p('sine', 520, 0.18, 0.05, { attack: 0.01 })] },
      { id: 'paper', label: '纸张沙沙', parts: [p('noise', 3000, 0.16, 0.06, { q: 0.6, attack: 0.03 })] },
      { id: 'swish', label: '嗖', parts: [p('noise', 1200, 0.2, 0.07, { to: 4000, q: 1.2, attack: 0.05 })] },
      { id: 'wood', label: '木', parts: [p('sine', 660, 0.1, 0.05, { to: 520, attack: 0.001 })] },
      { id: 'retro', label: '8-bit', parts: [p('square', 660, 0.04, 0.02, { attack: 0.001 }), p('square', 880, 0.04, 0.02, { attack: 0.001, at: 0.04 })] },
    ],
  },
  {
    id: 'open', label: '开始 / 继续', hint: '标题画面进入剧情', group: 'ui',
    presets: [
      { id: 'arp', label: '三连音', parts: [p('sine', 440, 0.18, 0.05, { attack: 0.01 }), p('sine', 660, 0.18, 0.05, { attack: 0.01, at: 0.06 }), p('sine', 880, 0.18, 0.05, { attack: 0.01, at: 0.12 })] },
      { id: 'chime', label: '风铃', parts: [p('sine', 1047, 0.6, 0.04), p('sine', 1319, 0.6, 0.035, { at: 0.08 }), p('sine', 1568, 0.7, 0.03, { at: 0.16 })] },
      { id: 'swell', label: '渐起', parts: [p('triangle', 330, 0.4, 0.05, { to: 660, attack: 0.25 })] },
      { id: 'retro', label: '8-bit', parts: [p('square', 523, 0.06, 0.02), p('square', 659, 0.06, 0.02, { at: 0.06 }), p('square', 784, 0.06, 0.02, { at: 0.12 }), p('square', 1047, 0.12, 0.02, { at: 0.18 })] },
      { id: 'bell', label: '钟声', parts: [p('sine', 880, 1, 0.05, { attack: 0.002 }), p('sine', 2200, 0.5, 0.015)] },
    ],
  },
])

export const SLOT_IDS = new Set(SOUND_SLOTS.map(s => s.id))
export const slotById = id => SOUND_SLOTS.find(s => s.id === id) || null
export const DEFAULT_SOUNDS = Object.freeze(Object.fromEntries(SOUND_SLOTS.map(s => [s.id, s.presets[0].id])))
/** 上传的音效文件最大多少字节。 */
export const MAX_SOUND_BYTES = 5 * 1024 * 1024
const ASSET_ID = /^[a-f0-9]{32}\.[a-z0-9]{2,4}$/

/** 某个槽这次该放什么：{ parts } 内置配方、{ assetId } 上传的文件，关掉时是 null。 */
export function soundFor(ui, slot) {
  const def = slotById(slot)
  if (!def) return null
  const choice = ui?.sounds?.[slot] || def.presets[0].id
  if (choice === 'off') return null
  if (choice === 'custom') return ui?.customSounds?.[slot]?.assetId ? { assetId: ui.customSounds[slot].assetId } : { parts: def.presets[0].parts }
  return { parts: (def.presets.find(x => x.id === choice) || def.presets[0]).parts }
}

const clamp = (v, lo, hi, d) => { const n = Number(v); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d }
export const clampPitch = v => Math.round(clamp(v, -VOICE_PITCH_LIMIT, VOICE_PITCH_LIMIT, 0))

/** 档案里的「声音」：空串是自动，off 是不出声，其余必须是认识的音色。 */
export function cleanVoice(value) {
  const v = String(value ?? '').trim()
  return v === 'off' || VOICE_IDS.has(v) ? v : ''
}

/** 设置里声音相关的几项：音量夹在范围内，认不出的音色 / 音效版本退回默认；「用上传的」但文件没了也退回默认。 */
export function normalizeSoundSettings(ui) {
  ui.blipVolume = clamp(ui.blipVolume, 0, 2, 1)
  ui.sfxVolume = clamp(ui.sfxVolume, 0, 2, 1)
  ui.voiceDefault = ui.voiceDefault === 'auto' || VOICE_IDS.has(ui.voiceDefault) ? ui.voiceDefault : 'auto'
  ui.narrationVoice = ui.narrationVoice === 'off' || VOICE_IDS.has(ui.narrationVoice) ? ui.narrationVoice : 'classic'
  ui.narrationPitch = clampPitch(ui.narrationPitch ?? -6)
  const custom = {}
  for (const [slot, file] of Object.entries(ui.customSounds && typeof ui.customSounds === 'object' ? ui.customSounds : {})) {
    if (SLOT_IDS.has(slot) && ASSET_ID.test(String(file?.assetId || ''))) custom[slot] = { assetId: file.assetId, name: String(file.name || '').slice(0, 80) }
  }
  ui.customSounds = custom
  const sounds = {}
  for (const def of SOUND_SLOTS) {
    const v = ui.sounds?.[def.id]
    sounds[def.id] = v === 'off' || (v === 'custom' && custom[def.id]) || def.presets.some(x => x.id === v) ? v : def.presets[0].id
  }
  ui.sounds = sounds
  return ui
}

/** 名字的固定哈希（跟最早按名字定音高的算法一样，老角色的经典哔哔音高不变）。 */
function nameHash(name) {
  let h = 0
  for (const ch of String(name || '')) h = (h * 31 + ch.codePointAt(0)) >>> 0
  return h
}

/** 自动分配时这个人从哪一组里挑：设置里统一定了某个音色就只有它，否则按性别。 */
function poolOf(person, ui) {
  return VOICE_IDS.has(ui?.voiceDefault) ? [ui.voiceDefault] : VOICE_POOLS[person?.gender] || VOICE_POOLS['']
}

/** 自动分到的音色，音高按名字错开：经典哔哔沿用以前的错法（420Hz 起，每档高 38Hz，共 7 档），其他音色在 ±2 个半音里错开。 */
function autoVoice(id, name, pitch) {
  const h = nameHash(name)
  const spread = id === 'classic' ? 12 * Math.log2((420 + (h % 7) * 38) / 420) : ((h >>> 8) % 5) - 2
  return { id, pitch: pitch + spread, auto: true }
}

/**
 * 一个角色说话用哪个音色、升降几个半音。person 是档案（voice / voicePitch / gender），ui 是设置。
 * 档案里指定了就用它；没指定时从 poolOf 那一组里按名字固定挑一个（一局里避开别人用过的，见 castVoices）。不出声时返回 null。
 */
export function resolveVoice(person, name, ui) {
  const chosen = cleanVoice(person?.voice)
  if (chosen === 'off') return null
  const pitch = clampPitch(person?.voicePitch)
  if (chosen) return { id: chosen, pitch, auto: false }
  const pool = poolOf(person, ui)
  return autoVoice(pool[nameHash(name) % pool.length], name, pitch)
}

/**
 * 一局里所有角色的声音（名字 → 声音，不出声是 null）。自动分配时尽量不撞：先登场的先挑（全局角色最先），
 * 已经被谁用了（包括档案里手动指定的）就顺着这一组往后找一个没人用的；一组都用完了才重复，靠音高错开。
 * 后来的人不会改变先登场的人的声音。
 */
export function castVoices(people, ui) {
  const list = [...(people || [])].sort((a, b) => (a.createdTurn ?? -1) - (b.createdTurn ?? -1) || String(a.name).localeCompare(String(b.name)))
  const voices = new Map(list.map(p => [p.name, resolveVoice(p, p.name, ui)]))
  const taken = new Set([...voices.values()].filter(v => v && !v.auto).map(v => v.id))
  for (const p of list) {
    const voice = voices.get(p.name)
    if (!voice || !voice.auto) continue
    const pool = poolOf(p, ui)
    const start = pool.indexOf(voice.id)
    const free = pool.map((_, i) => pool[(start + i) % pool.length]).find(id => !taken.has(id))
    if (free && free !== voice.id) voices.set(p.name, autoVoice(free, p.name, clampPitch(p.voicePitch)))
    taken.add(voices.get(p.name).id)
  }
  return voices
}

/** 一句话由谁的声音念：旁白按设置；台词和心声按说话人（voices 是 castVoices 的结果，没档案的人按名字自动分）。 */
export function lineVoice(type, speaker, voices, ui) {
  if (type === 'narration' || !speaker) {
    return ui?.narrationVoice === 'off' ? null : { id: VOICE_IDS.has(ui?.narrationVoice) ? ui.narrationVoice : 'classic', pitch: clampPitch(ui?.narrationPitch ?? -6), auto: false }
  }
  const voice = voices?.has?.(speaker) ? voices.get(speaker) : resolveVoice(null, speaker, ui)
  return voice && type === 'thought' ? { ...voice, gain: 0.7 } : voice
}
