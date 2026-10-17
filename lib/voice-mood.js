// 情绪进声音：一种情绪怎么「听」出来（纯函数，前后端共用；打字音、以后的句调都按它）。
// 情绪 → 情绪库里的大类（喜怒哀惧……）和强弱（1 微 ~ 4 极）→ 声音的几样东西：
//   semis 音区（升降几个半音）、range 起伏（句调摆多大，1 照常）、tempo 字距倍数（>1 慢）、gain 音量、
//   breath 气声（0~1）、tremor 发颤（0~1）、attack 起音（<1 硬、>1 软）、sob 会不会哽一下。
// 方向照语音情感的常见结论：喜、怒、惊、惧高、快、响；哀、倦低、窄、慢、轻；羞、爱轻、软、带气。具体数值按听感调。
// 情绪库里没归类的新情绪（导演造的「温柔又偏执」「哽咽着温柔」）按字面认，几种掺在一起时声音也按比例掺。
import { emotionEntry, emotionLevel, standIns, resolveEmotion, isBuiltinEmotion, libOf } from './emotions.js'

/** 每一类在强弱 2（中）时的样子。 */
export const MOOD_PROFILES = Object.freeze({
  calm: { semis: 0, range: 1, tempo: 1, gain: 1, breath: 0, tremor: 0, attack: 1 },
  joy: { semis: 1.5, range: 1.3, tempo: 0.92, gain: 1.05, breath: 0, tremor: 0, attack: 1 },
  surprise: { semis: 2.5, range: 1.5, tempo: 0.9, gain: 1.15, breath: 0, tremor: 0, attack: 0.8 },
  anger: { semis: 0.5, range: 1.4, tempo: 0.88, gain: 1.25, breath: 0, tremor: 0, attack: 0.5 },
  fear: { semis: 1.5, range: 0.9, tempo: 0.88, gain: 0.9, breath: 0.15, tremor: 0.35, attack: 1 },
  shy: { semis: 1, range: 0.8, tempo: 1.12, gain: 0.72, breath: 0.4, tremor: 0.15, attack: 1.4 },
  love: { semis: 0.5, range: 0.9, tempo: 1.08, gain: 0.85, breath: 0.35, tremor: 0, attack: 1.6 },
  sorrow: { semis: -2, range: 0.6, tempo: 1.2, gain: 0.87, breath: 0.4, tremor: 0.1, attack: 1.3 },
  think: { semis: -0.5, range: 0.8, tempo: 1.1, gain: 0.95, breath: 0, tremor: 0, attack: 1 },
  tired: { semis: -1.5, range: 0.5, tempo: 1.22, gain: 0.8, breath: 0.25, tremor: 0, attack: 1.3 },
  cold: { semis: -1, range: 0.5, tempo: 1, gain: 0.95, breath: 0, tremor: 0, attack: 0.7 },
})

/** 强弱放大多少：1 微只有一半，4 极 1.6 倍（再多就跟演法叠得太狠）。 */
const LEVEL_SCALE = { 1: 0.5, 2: 1, 3: 1.3, 4: 1.6 }

const LIMITS = { semis: [-4.5, 4.5], range: [0.35, 1.9], tempo: [0.7, 1.4], gain: [0.5, 1.4], breath: [0, 1], tremor: [0, 1], attack: [0.3, 2.5] }
const clamp = (v, [lo, hi]) => Math.min(hi, Math.max(lo, v))

/**
 * 字面认情绪：没归类的新情绪按里面的字认是哪几类。长的词先认（「惊恐」是怕不是惊、「冷静」是平静不是冷），
 * 认过的字不再认第二次；前面紧跟否定（不开心、没那么紧张）的不算。
 */
const LEXICON = [
  ['sorrow', '哭 泣 泪 哽咽 抽噎 呜咽 啜泣 悲 伤心 难过 失落 委屈 心碎 心痛 沮丧 绝望 痛苦 落寞 寂寞 孤独 惆怅 哀 酸楚 心酸'],
  ['joy', '笑 开心 高兴 喜 欢 雀跃 兴奋 愉快 快乐 得意 幸福 欣慰 满足'],
  ['love', '温柔 爱 思念 眷恋 宠溺 甜 心动 柔情 依恋 撒娇 深情 怜 疼惜 珍惜 痴迷'],
  ['anger', '怒 生气 气愤 恼 愤 火大 咬牙 暴躁 不满 烦躁'],
  ['fear', '惊恐 恐惧 害怕 怕 慌 紧张 不安 焦虑 颤抖 发抖 畏 忐忑 担心 担忧 心虚'],
  ['surprise', '惊讶 吃惊 震惊 错愕 愣 诧异 惊'],
  ['shy', '害羞 羞 脸红 腼腆 扭捏 难为情'],
  ['cold', '冷 偏执 漠 疏离 阴沉 病娇 狠 嫌 鄙 不屑'],
  ['tired', '累 疲 困 倦 无力 虚弱 慵懒 叹'],
  ['think', '思考 沉思 犹豫 迟疑 纠结 认真 严肃 疑惑 困惑'],
  ['calm', '平静 淡然 镇定 冷静 安心 释然'],
]
const WORDS = LEXICON.flatMap(([cat, words]) => words.split(' ').map(w => [w, cat])).sort((a, b) => b[0].length - a[0].length)
const NEGATION = /(?:不|没|没有|无|毫不|并不|不太|不怎么|不再|没那么|不那么)$/u
/** 哭腔：说着说着哽一下。 */
const SOB_WORDS = /哭|泣|泪|哽咽|抽噎|呜咽|啜泣/u

/** 字面里有哪几类（按出现顺序，不重复）。 */
export function lexiconCategories(text) {
  const s = String(text || '')
  const taken = new Array(s.length).fill(false)
  const hits = []
  for (const [word, cat] of WORDS) {
    for (let at = s.indexOf(word); at >= 0; at = s.indexOf(word, at + 1)) {
      if (taken.slice(at, at + word.length).some(Boolean)) continue
      for (let k = at; k < at + word.length; k += 1) taken[k] = true
      if (NEGATION.test(s.slice(0, at))) continue
      hits.push([at, cat])
    }
  }
  return [...new Set(hits.sort((a, b) => a[0] - b[0]).map(h => h[1]))]
}

/** 情绪库里这一种属于哪一类：自己写的类别，没写跟替身（不跟到平静）。 */
function categoryIn(id, lib) {
  const own = emotionEntry(id, lib).category
  if (own) return own
  for (const e of standIns(id, lib)) {
    if (e === 'neutral') break
    const c = emotionEntry(e, lib).category
    if (c) return c
  }
  return ''
}

export const NEUTRAL_MOOD = Object.freeze({ category: '', cats: Object.freeze([]), level: 2, ...MOOD_PROFILES.calm, sob: false })

/**
 * 一种情绪的声音。emo 是导演写的情绪（编号、内置名字、近义词、新造的词都行），custom 是情绪库（或只是它的 list）。
 * 强弱：level 给了就用；不然看 acting（这个人的动作与表情设计，表演设计师给这种情绪标的强弱）；都没有按情绪库。
 */
export function voiceMood(emo, custom = [], { level, acting = null } = {}) {
  const raw = String(emo ?? '').trim()
  if (!raw) return NEUTRAL_MOOD
  const lib = libOf(custom)
  const id = resolveEmotion(raw, lib.list)
  const primary = categoryIn(id, lib)
  const weights = new Map()
  if (primary) weights.set(primary, 1)
  // 新造的词：字面另有的情绪掺进来（归了类的只掺一半，没归类的平分）
  if (!isBuiltinEmotion(id)) {
    const words = lexiconCategories(id === raw ? raw : `${raw}${id}`)
    for (const cat of words) if (!weights.has(cat)) weights.set(cat, primary ? 0.5 : 1)
  }
  const known = [...weights.entries()].filter(([cat]) => MOOD_PROFILES[cat])
  if (!known.length) return NEUTRAL_MOOD
  const total = known.reduce((sum, [, w]) => sum + w, 0)
  const designed = acting?.faces?.[id]?.level ?? acting?.faces?.[raw]?.level
  const lv = [1, 2, 3, 4].includes(level) ? level : [1, 2, 3, 4].includes(designed) ? designed : emotionLevel(id, lib)
  const k = LEVEL_SCALE[lv] ?? 1
  const mix = field => known.reduce((sum, [cat, w]) => sum + MOOD_PROFILES[cat][field] * w, 0) / total
  const around = (field, center) => clamp(center + (mix(field) - center) * k, LIMITS[field])
  const cats = known.map(([cat]) => cat)
  const sorrowful = cats.includes('sorrow')
  return {
    category: primary || cats[0],
    cats,
    level: lv,
    semis: around('semis', 0),
    range: around('range', 1),
    tempo: around('tempo', 1),
    gain: around('gain', 1),
    breath: around('breath', 0),
    tremor: around('tremor', 0),
    attack: around('attack', 1),
    sob: sorrowful && (id === 'cry' || lv >= 4 || SOB_WORDS.test(raw) || SOB_WORDS.test(emotionEntry(id, lib).label || '')),
  }
}

/**
 * 设置里的「起伏强度」：amount 倍地离开平常（0 平常，1 照原样，2 加倍；离平常的距离按倍数缩放，再夹回范围）。
 * 会不会哽一下不跟着缩放（只有关掉才没有）。
 */
export function scaleMood(mood, amount = 1) {
  if (!mood || mood === NEUTRAL_MOOD || amount === 1) return mood || NEUTRAL_MOOD
  if (!(amount > 0)) return NEUTRAL_MOOD
  const out = { ...mood }
  for (const [field, center] of [['semis', 0], ['range', 1], ['tempo', 1], ['gain', 1], ['breath', 0], ['tremor', 0], ['attack', 1]]) {
    out[field] = clamp(center + (mood[field] - center) * amount, LIMITS[field])
  }
  return out
}

/**
 * 按情绪改一份打字音配方（lib/sounds.js 的格式）：气声 → 叠一层很轻的带通噪声（本来就是噪声的配方不叠），
 * 起音 → attack 乘倍数（软的尾巴也拖长一点），发颤 → vibrato（合成时让音高抖一下）。平常的原样返回。
 * 同一份配方、同样的质感给同一份结果（每个字都要调用，不能每次新建）。
 */
const shaped = new WeakMap() // parts → Map(质感 → 改好的配方)
export function shapeBlip(parts, mood) {
  if (!Array.isArray(parts) || !parts.length || !mood) return parts
  const breath = mood.breath || 0
  const tremor = mood.tremor || 0
  const attack = mood.attack || 1
  if (breath < 0.05 && tremor < 0.05 && Math.abs(attack - 1) < 0.05) return parts
  const key = `${breath.toFixed(2)}|${tremor.toFixed(2)}|${attack.toFixed(2)}`
  let byKey = shaped.get(parts)
  if (!byKey) shaped.set(parts, (byKey = new Map()))
  if (byKey.has(key)) return byKey.get(key)
  const soft = Math.max(1, attack)
  const out = parts.map(p => ({
    ...p,
    attack: Math.min(0.05, (p.attack ?? (p.wave === 'noise' ? 0 : 0.006)) * attack),
    dur: p.dur * (1 + (soft - 1) * 0.25),
    ...(tremor >= 0.05 && p.wave !== 'noise' ? { vibrato: Math.round(tremor * 60) / 1000 } : {}),
  }))
  if (breath >= 0.05 && !parts.some(p => p.wave === 'noise')) {
    const body = parts.reduce((a, p) => (p.gain > a.gain ? p : a), parts[0])
    out.push({ wave: 'noise', f: Math.min(5200, Math.max(1600, body.f * 5)), q: 1.4, dur: body.dur * 1.1, gain: body.gain * 0.32 * breath, attack: Math.max(0.006, (body.attack ?? 0.006) * attack) })
  }
  byKey.set(key, out)
  return out
}
