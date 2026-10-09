// 画风：画师串（可存多套、随时切换）、按模型的质量词与负面词默认值（可自定义、一键恢复）。
import { EMOTION_TAGS } from '../vocab.js'
import { tidyTags, hoistCountTags } from '../cast.js'

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

/** 内置画师串示例：只是起点，用户可以增删改。 */
export const BUILTIN_ARTISTS = [
  { id: 'none', name: '不使用', text: '' },
  { id: 'galgame', name: 'Galgame 赛璐璐', text: 'official art, visual novel cg, game cg, anime coloring, clean lineart, soft lighting' },
  { id: 'watercolor', name: '水彩绘本', text: 'watercolor (medium), traditional media, soft colors, pastel colors, painterly' },
  { id: 'cinematic', name: '电影感厚涂', text: 'cinematic lighting, depth of field, dramatic lighting, detailed background, painterly, thick painting' },
  { id: 'retro90s', name: '90 年代复古', text: '1990s (style), retro artstyle, cel shading, film grain' },
]

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
  const custom = style?.quality?.[key]
  return typeof custom === 'string' ? custom : DEFAULT_QUALITY[presetKey(key)]
}
export function negativeFor(style, key) {
  const custom = style?.negative?.[key]
  return typeof custom === 'string' ? custom : DEFAULT_NEGATIVE[presetKey(key)]
}

export function artistText(style) {
  const list = [...BUILTIN_ARTISTS, ...(style?.artists || [])]
  return list.find(a => a.id === style?.artist)?.text || ''
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

/**
 * 组合最终提示词。
 * kind: cg | bg | sprite
 * 返回 { positive, negative, characters }：characters 只在 NovelAI V4+ 分人描述时使用。
 */
export function composePrompt({ kind, tags = '', desc = '', backend, config, scene = {}, person = null, emotion = 'neutral', extraNegative = '' }) {
  const style = config?.style || {}
  const key = modelKey(backend, config)
  const artist = artistText(style)
  const quality = style.useQuality === false ? '' : qualityFor(style, key)
  let body
  if (kind === 'bg') body = [tags, TIME_TAGS[scene.time], WEATHER_TAGS[scene.weather], BG_SUFFIX].filter(Boolean).join(', ')
  else if (kind === 'sprite') {
    const count = person?.gender === 'male' ? '1boy' : person?.gender === 'female' ? '1girl' : ''
    body = [count, person?.appearance, EMOTION_TAGS[emotion] || EMOTION_TAGS.neutral, SPRITE_SUFFIX].filter(Boolean).join(', ')
  } else body = tags
  let positive
  if (backend === 'openai') {
    const what = kind === 'bg' ? 'A visual novel background illustration with no people' : kind === 'sprite' ? 'A visual novel character sprite, single character, upper body, plain white background' : 'A visual novel event CG illustration'
    positive = [`${what}.`, desc, `Details: ${tidyTags(body)}.`, artist ? `Style: ${artist}.` : 'Style: anime, clean lineart, soft lighting.'].filter(Boolean).join(' ')
  } else {
    positive = hoistCountTags(tidyTags([artist, body, quality].filter(Boolean).join(', ')))
  }
  const negative = tidyTags([negativeFor(style, key), kind === 'bg' ? 'people, person, character, 1girl, 1boy' : '', extraNegative].filter(Boolean).join(', '))
  return { positive, negative }
}

export function sizeFor(config, shape) {
  const sizes = config?.images?.sizes || {}
  const defaults = { landscape: [1216, 832], portrait: [832, 1216], square: [1024, 1024] }
  const [w, h] = Array.isArray(sizes[shape]) ? sizes[shape] : defaults[shape] || defaults.landscape
  return { width: Number(w) || 1216, height: Number(h) || 832 }
}
