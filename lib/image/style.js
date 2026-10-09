// 画风：一套套存的画师串 + 正面词 + 负面词 + CFG（可编辑、改名、复制、试画），以及按模型的默认质量词与负面词。
import { EMOTION_TAGS } from '../vocab.js'
import { tidyTags, hoistCountTags } from '../cast.js'
import { naiModelInfo } from './nai-models.js'

export const DEFAULT_QUALITY = {
  'nai-diffusion-4-5-full': 'very aesthetic, masterpiece, no text',
  'nai-diffusion-4-5-curated': 'very aesthetic, masterpiece, no text, rating:general',
  'nai-diffusion-4-full': 'no text, best quality, very aesthetic, absurdres',
  'nai-diffusion-4-curated-preview': 'rating:general, best quality, very aesthetic, absurdres',
  'nai-diffusion-3': 'best quality, amazing quality, very aesthetic, absurdres',
  'nai-diffusion-furry-3': 'best quality, amazing quality, very aesthetic, absurdres',
  sd: 'masterpiece, best quality, amazing quality, very aesthetic, absurdres, newest',
  openai: '',
}

export const DEFAULT_NEGATIVE = {
  'nai-diffusion-4-5-full': 'blurry, lowres, error, film grain, scan artifacts, worst quality, bad quality, jpeg artifacts, very displeasing, chromatic aberration, multiple views, logo, too many watermarks, white blank page, blank page',
  'nai-diffusion-4-5-curated': 'blurry, lowres, upscaled, artistic error, film grain, scan artifacts, worst quality, bad quality, jpeg artifacts, very displeasing, chromatic aberration, halftone, multiple views, logo, too many watermarks, negative space, blank page',
  'nai-diffusion-4-full': 'blurry, lowres, error, film grain, scan artifacts, worst quality, bad quality, jpeg artifacts, very displeasing, chromatic aberration, logo, dated, signature, multiple views, gigantic breasts',
  'nai-diffusion-4-curated-preview': 'blurry, lowres, error, film grain, scan artifacts, worst quality, bad quality, jpeg artifacts, very displeasing, chromatic aberration, logo, dated, signature, multiple views',
  'nai-diffusion-3': 'lowres, bad anatomy, bad hands, text, error, missing fingers, extra digit, fewer digits, cropped, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark, username, blurry',
  'nai-diffusion-furry-3': 'lowres, bad anatomy, bad hands, text, error, missing fingers, worst quality, low quality, jpeg artifacts, signature, watermark, blurry',
  sd: 'lowres, worst quality, bad quality, bad anatomy, bad hands, extra digits, fewer digits, jpeg artifacts, signature, watermark, username, text, blurry, multiple views',
  openai: 'text, watermark, logo, extra fingers, deformed hands',
}

/**
 * 一套画风 = 画师串 + 正面词 + 负面词 + CFG + CFG Rescale，整体存、整体切换。
 * positive / negative 为 null 时跟着当前模型用默认质量词 / 负面词；cfg / cfgRescale 为 null 时用生图渠道里的设置。
 * cover 是「试画」出来的样图。内置的几套只是起点，可以改、改名、复制、删。
 */
const preset = p => ({ positive: null, negative: null, cfg: null, cfgRescale: null, cover: '', ...p })
export const BUILTIN_STYLES = [
  preset({ id: 'none', name: '不加画师串', artist: '' }),
  preset({ id: 'galgame', name: 'Galgame 赛璐璐', artist: 'official art, visual novel cg, game cg, anime coloring, clean lineart, soft lighting' }),
  preset({ id: 'watercolor', name: '水彩绘本', artist: 'watercolor (medium), traditional media, soft colors, pastel colors, painterly' }),
  preset({ id: 'cinematic', name: '电影感厚涂', artist: 'cinematic lighting, depth of field, dramatic lighting, detailed background, painterly, thick painting' }),
  preset({ id: 'retro90s', name: '90 年代复古', artist: '1990s (style), retro artstyle, cel shading, film grain' }),
]
/** 「试画」画的内容：同一段内容、同一个种子，几套画风的样图才好比较。 */
export const DEFAULT_SAMPLE = '1girl, solo, long hair, school uniform, smile, looking at viewer, upper body, classroom, window, sunlight'
export const SAMPLE_SEED = 20240611
export const MAX_STYLES = 100

const STYLE_ID = /^[A-Za-z0-9_-]{1,40}$/
const isObject = v => v && typeof v === 'object' && !Array.isArray(v)
const text = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : null)
const number = (v, lo, hi) => {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, Math.round(n * 100) / 100)) : null
}

/** 校验一套画风；id 不合法时返回 null。 */
export function cleanStyle(p) {
  if (!isObject(p) || !STYLE_ID.test(String(p.id))) return null
  return {
    id: String(p.id),
    name: String(p.name ?? '').replace(/\s+/g, ' ').trim().slice(0, 40) || '未命名画风',
    artist: text(p.artist, 2000) ?? '',
    positive: text(p.positive, 2000),
    negative: text(p.negative, 3000),
    cfg: number(p.cfg, 0, 30),
    cfgRescale: number(p.cfgRescale, 0, 1),
    cover: typeof p.cover === 'string' && /^[A-Za-z0-9._-]{1,80}$/.test(p.cover) ? p.cover : '',
  }
}

/**
 * 设置里的 style 一节：{ current, presets, sample }。
 * 旧版存的是一串串画师串（artist / artists）加按模型存的质量词、负面词（quality / negative / useQuality）：
 * 搬成一套套画风，当时这个模型（legacyKey）改过的质量词、负面词搬进每一套。
 */
export function normalizeStyle(saved, legacyKey = 'nai-diffusion-4-5-full') {
  const s = isObject(saved) ? saved : {}
  let list
  if (Array.isArray(s.presets)) list = s.presets
  else {
    const legacy = {
      positive: s.useQuality === false ? '' : typeof s.quality?.[legacyKey] === 'string' ? s.quality[legacyKey] : null,
      negative: typeof s.negative?.[legacyKey] === 'string' ? s.negative[legacyKey] : null,
    }
    const mine = (Array.isArray(s.artists) ? s.artists : []).filter(isObject).map(a => ({ id: a.id, name: a.name, artist: a.text }))
    list = [...BUILTIN_STYLES, ...mine].map(p => ({ ...p, ...legacy }))
  }
  const seen = new Set()
  let presets = list.map(cleanStyle).filter(p => p && !seen.has(p.id) && seen.add(p.id)).slice(0, MAX_STYLES)
  if (!presets.length) presets = BUILTIN_STYLES.map(p => ({ ...p }))
  const want = typeof s.current === 'string' ? s.current : typeof s.artist === 'string' ? s.artist : 'galgame'
  return {
    current: presets.some(p => p.id === want) ? want : presets[0].id,
    presets,
    sample: text(s.sample, 1000) || DEFAULT_SAMPLE,
  }
}

/** 正在用的那套画风（找不到就用第一套）。 */
export function currentStyle(style) {
  const presets = Array.isArray(style?.presets) ? style.presets : BUILTIN_STYLES
  return presets.find(p => p.id === style?.current) || presets[0] || BUILTIN_STYLES[0]
}

/** 换一套画风出这一张（鉴赏里单张指定的画风；试画）。没有这套就还用当前的。 */
export function withStyle(config, id) {
  if (!id || !config?.style?.presets?.some(p => p.id === id)) return config
  return { ...config, style: { ...config.style, current: id } }
}

export function modelKey(backend, config) {
  if (backend === 'novelai') return config?.novelai?.model || 'nai-diffusion-4-5-full'
  if (backend === 'openai') return 'openai'
  return 'sd'
}

/** 默认质量词 / 负面词查哪一套：没有预设的新 NovelAI 模型沿用 V4.5 Full 的，其余沿用 SD 的。 */
export function presetKey(key) {
  if (key in DEFAULT_QUALITY) return key
  return key !== 'sd' && key !== 'openai' ? 'nai-diffusion-4-5-full' : 'sd'
}
export function qualityFor(style, key) {
  const custom = currentStyle(style).positive
  return typeof custom === 'string' ? custom : DEFAULT_QUALITY[presetKey(key)]
}
export function negativeFor(style, key) {
  const custom = currentStyle(style).negative
  return typeof custom === 'string' ? custom : DEFAULT_NEGATIVE[presetKey(key)]
}

export function artistText(style) {
  return currentStyle(style).artist || ''
}

/** 画风里填了 CFG / CFG Rescale 就盖过渠道自己的设置（CFG Rescale 只有 NovelAI 用）。 */
export function applyGuidance(backend, section, style) {
  const { cfg, cfgRescale } = currentStyle(style)
  const out = { ...section }
  if (cfg !== null && cfg !== undefined) {
    if (backend === 'novelai') out.scale = cfg
    else if (backend === 'comfyui' || backend === 'webui') out.cfg = cfg
  }
  if (backend === 'novelai' && cfgRescale !== null && cfgRescale !== undefined) out.cfgRescale = cfgRescale
  return out
}

const BG_SUFFIX = 'scenery, no humans, wide shot, detailed background, visual novel background'
const SPRITE_SUFFIX = 'solo, upper body, cowboy shot, standing, facing viewer, looking at viewer, simple background, white background'
const TIME_TAGS = {
  dawn: 'dawn, early morning, soft light', morning: 'morning, daylight', noon: 'noon, bright sunlight', afternoon: 'afternoon, warm light',
  dusk: 'sunset, dusk, orange sky', evening: 'evening, twilight, purple sky', night: 'night, moonlight, dark', midnight: 'midnight, night sky, stars, dark',
}
const WEATHER_TAGS = {
  rain: 'rain, wet ground, overcast', storm: 'storm, heavy rain, lightning, dark clouds', snow: 'snow, snowing, winter', sakura: 'cherry blossoms, falling petals, spring',
  leaves: 'autumn leaves, falling leaves', fog: 'fog, mist', fireflies: 'fireflies, night', stars: 'starry sky',
}

/** 这个渠道怎么认权重：nai = NovelAI V4 起的「数字::tag::」，nai3 = 旧版花括号，sd = (tag:1.2)，plain = 不认。 */
export function weightMode(backend, config) {
  if (backend === 'novelai') return naiModelInfo(config?.novelai?.model || 'nai-diffusion-4-5-full')?.v4 === false ? 'nai3' : 'nai'
  return backend === 'openai' ? 'plain' : 'sd'
}

// 括起来的部分可以带单个冒号（artist:xxx）和逗号（一组 tag 一起加权），到下一个 :: 为止。
const WEIGHT = /(-?\d+(?:\.\d+)?)::((?:(?!::)[^\n])+?)::/g
/**
 * 提示词里的权重统一按 NovelAI V4.5 的「数字::tag::」写，发出去前按渠道转换：
 * SD 写成 (tag:1.2)；旧版 NovelAI 用 {tag} / [tag]；不认权重的去掉数字。负权重（防串）只有 NovelAI V4 起能用，别的渠道直接删掉。
 */
export function applyWeights(text, mode) {
  return String(text || '').replace(WEIGHT, (_, w, raw) => {
    const weight = Number(w)
    const tag = raw.trim()
    if (mode === 'nai') return `${weight}::${tag}::`
    if (weight <= 0) return ''
    if (weight === 1) return tag
    if (mode === 'sd') return `(${tag}:${weight})`
    if (mode === 'nai3') return weight > 1 ? `{${tag}}` : `[${tag}]`
    return tag
  })
}

/**
 * 组合最终提示词。
 * kind: cg | bg | sprite
 * cg 可以带 characters（[{ tag, nl }]，人名已经去掉、固定外貌已经补上）：NovelAI V4 起每人一条分人描述，
 * 其他渠道合并进同一段。desc 是 Base 的英文自然语言。
 * 返回 { positive, negative, characters }：characters 是发给 NovelAI 的分人描述，别的渠道为空。
 */
export function composePrompt({ kind, tags = '', desc = '', characters = [], backend, config, scene = {}, person = null, emotion = 'neutral', extraNegative = '' }) {
  const style = config?.style || {}
  const key = modelKey(backend, config)
  const mode = weightMode(backend, config)
  const weigh = text => tidyTags(applyWeights(text, mode))
  const artist = artistText(style)
  const quality = qualityFor(style, key)
  const split = kind === 'cg' && characters.length > 0 && mode === 'nai'
  let body
  if (kind === 'bg') body = [tags, TIME_TAGS[scene.time], WEATHER_TAGS[scene.weather], BG_SUFFIX].filter(Boolean).join(', ')
  else if (kind === 'sprite') {
    const count = person?.gender === 'male' ? '1boy' : person?.gender === 'female' ? '1girl' : ''
    // tags 是立绘设计师写好的整套（外貌、衣服、状态、表情、姿势）；没有时按档案和情绪机械拼。
    body = [count, tags || [person?.appearance, EMOTION_TAGS[emotion] || EMOTION_TAGS.neutral].filter(Boolean).join(', '), SPRITE_SUFFIX].filter(Boolean).join(', ')
  } else {
    // 不能分人描述的渠道合并成一段：角色块开头的 girl / boy 去掉（人数已经在 Base 里）。
    const merged = characters.map(c => String(c.tag || '').split(/,\s*/).filter(t => !/^(girl|boy|other)$/i.test(t.trim())).join(', '))
    body = split ? tags : [tags, ...merged].filter(Boolean).join(', ')
  }
  let positive
  let captions = []
  if (backend === 'openai') {
    const what = kind === 'bg' ? 'A visual novel background illustration with no people' : kind === 'sprite' ? 'A visual novel character sprite, single character, upper body, plain white background' : 'A visual novel event CG illustration'
    const prose = [desc, ...characters.map(c => c.nl)].filter(Boolean).join(' ')
    positive = [`${what}.`, prose, `Details: ${weigh(body)}.`, artist ? `Style: ${artist}.` : 'Style: anime, clean lineart, soft lighting.'].filter(Boolean).join(' ')
  } else {
    // 英文描述只有 NovelAI V4 起读得懂，接在 tag 后面、质量词前面；SD 只发 tag。
    const prose = mode === 'nai' && kind === 'cg' ? desc.trim() : ''
    positive = [hoistCountTags(weigh([artist, body].filter(Boolean).join(', '))), prose, quality].filter(Boolean).join(', ')
    if (split) captions = characters.map(c => [weigh(c.tag), c.nl.trim()].filter(Boolean).join(', ')).filter(Boolean)
  }
  const negative = tidyTags([negativeFor(style, key), kind === 'bg' ? 'people, person, character, 1girl, 1boy' : '', extraNegative].filter(Boolean).join(', '))
  return { positive, negative, characters: captions }
}

export function sizeFor(config, shape) {
  const sizes = config?.images?.sizes || {}
  const defaults = { landscape: [1216, 832], portrait: [832, 1216], square: [1024, 1024] }
  const [w, h] = Array.isArray(sizes[shape]) ? sizes[shape] : defaults[shape] || defaults.landscape
  return { width: Number(w) || 1216, height: Number(h) || 832 }
}
