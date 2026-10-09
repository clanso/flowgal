// NovelAI：官方站与第三方站（同一 /ai/generate-image 协议）可各存一条，各记各的 Key。
// 换站只换出口，模型、采样器、尺寸、画师串照旧（柏宝绘「NAI 多接入点」）。
import { randomInt } from 'node:crypto'
import { requestBytes, imageResult, firstImageFromZip, trimBase, ImageError } from './http.js'
import { sniffImage } from '../store.js'
import { NAI_SAMPLERS, NAI_NOISE_SCHEDULES, naiModelInfo } from './nai-models.js'

export const NAI_OFFICIAL = { id: 'official', name: 'NovelAI 官方', baseURL: 'https://image.novelai.net' }

const PLAIN_BACKGROUND = /^(simple|white|grey|gray|plain) background$/i

/** 透明底：提示词里要写 transparent background，同时带上提示位；原来的「白底 / 纯色底」tag 去掉，免得打架。 */
function withTransparentBackground(prompt) {
  const tags = String(prompt).split(/,\s*/).filter(t => t && !PLAIN_BACKGROUND.test(t.trim()))
  if (!tags.some(t => /^transparent background$/i.test(t.trim()))) tags.push('transparent background')
  return tags.join(', ')
}

function snap64(n) { return Math.max(64, Math.min(2048, Math.round(Number(n) / 64) * 64)) }

/**
 * characters：每人一条角色块；characterNegatives：同位置的角色块负面（没有就空）。
 * coords 为真时按角色块里的位置画（立绘：一个人正中），否则让模型自己排。
 * 跟柏宝绘 / IGS 发的一致：V5 用 params_version 4；k_euler_ancestral 带 prefer_brownian；V5 透明底同时带 straight_alpha。
 */
export function buildNaiBody({ prompt, negative, width, height, seed, characters = [], characterNegatives = [], coords = false, transparent = false, config }) {
  const info = naiModelInfo(config.model) || naiModelInfo('nai-diffusion-4-5-full')
  const model = info.id
  const w = snap64(width), h = snap64(height)
  if (w * h > 3_145_728) throw new ImageError('尺寸超过 NovelAI 单张上限')
  const clear = Boolean(transparent && info.v5)
  if (clear) prompt = withTransparentBackground(prompt)
  const parameters = {
    params_version: info.v5 ? 4 : 3,
    width: w, height: h,
    scale: Number(config.scale) || info.scale,
    sampler: NAI_SAMPLERS.includes(config.sampler) ? config.sampler : 'k_euler_ancestral',
    steps: Math.max(1, Math.min(50, Number(config.steps) || 23)),
    n_samples: 1,
    seed,
    ucPreset: 3, qualityToggle: false,
    noise_schedule: !info.v5 && NAI_NOISE_SCHEDULES.includes(config.noiseSchedule) ? config.noiseSchedule : 'karras',
    negative_prompt: negative,
    cfg_rescale: Math.max(0, Math.min(1, Number(config.cfgRescale) || 0)),
    dynamic_thresholding: false,
    legacy: false,
    add_original_image: true,
  }
  if (info.v4) {
    // V4+ 把场景与各人物分开描述：base 写场景与构图，char_captions 每人一条。
    const chars = characters.slice(0, info.v5 ? 22 : 6).map((c, i) => ({ char_caption: c, centers: [{ x: characters.length === 1 ? 0.5 : 0.2 + 0.6 * i / Math.max(1, characters.length - 1), y: 0.5 }] }))
    const ucs = chars.map((c, i) => String(characterNegatives[i] || ''))
    const useCoords = Boolean(coords && chars.length)
    Object.assign(parameters, {
      legacy_v3_extend: false,
      use_coords: useCoords,
      v4_prompt: { caption: { base_caption: prompt, char_captions: chars }, use_coords: useCoords, use_order: true },
      v4_negative_prompt: { caption: { base_caption: negative, char_captions: chars.map((c, i) => ({ char_caption: ucs[i], centers: c.centers })) }, legacy_uc: false },
      characterPrompts: chars.map((c, i) => ({ prompt: c.char_caption, uc: ucs[i], center: c.centers[0], enabled: true })),
    })
  } else {
    Object.assign(parameters, { sm: false, sm_dyn: false })
  }
  // Variety+：前几步不做 CFG，构图更多样。V4 / V4.5 才有，阈值随画面面积缩放（与官网一致）。
  if (config.variety && info.v4 && !info.v5) parameters.skip_cfg_above_sigma = (model === 'nai-diffusion-4-5-full' ? 58 : 19) * Math.sqrt(w * h / (832 * 1216))
  // 跟官网一样用布朗噪声（柏宝绘也这么发）；不带时服务器可能按旧的噪声走，同样的种子出图不一样。
  if (parameters.sampler === 'k_euler_ancestral') Object.assign(parameters, { deliberate_euler_ancestral_bug: false, prefer_brownian: true })
  if (clear) Object.assign(parameters, { tag_hint_transparent_background: true, straight_alpha: true })
  return { input: prompt, model, action: 'generate', parameters }
}

export async function generateNovelAI({ prompt, negative, width, height, seed, characters, characterNegatives, coords, transparent, config, key, signal, fetchImpl }) {
  const endpoint = (config.endpoints || []).find(e => e.id === config.endpoint) || NAI_OFFICIAL
  const base = trimBase(endpoint.id === 'official' ? NAI_OFFICIAL.baseURL : endpoint.baseURL)
  if (!base) throw new ImageError('NovelAI 接入点没有地址')
  if (!key) throw new ImageError(`「${endpoint.name || endpoint.id}」还没有填写 Key`)
  const finalSeed = Number.isInteger(seed) && seed >= 0 ? seed : randomInt(0, 2 ** 32 - 1)
  const body = buildNaiBody({ prompt, negative, width, height, seed: finalSeed, characters, characterNegatives, coords, transparent, config })
  const { bytes } = await requestBytes(base + '/ai/generate-image', {
    method: 'POST', signal, fetchImpl, timeout: 180000,
    headers: { 'content-type': 'application/json', authorization: 'Bearer ' + key, accept: 'application/zip, image/*' },
    body: JSON.stringify(body),
  })
  // 第三方站有的直接回图片，有的回 ZIP。
  const image = sniffImage(bytes) ? bytes : firstImageFromZip(bytes)
  return imageResult(image, { seed: finalSeed, model: body.model, backend: 'novelai', endpoint: endpoint.id })
}

/** 局部重绘用的模型：当前模型名后面接 -inpainting（V4 Curated 预览版对应 V4 Curated 的重绘模型）。 */
export function inpaintModel(model) {
  const info = naiModelInfo(model) || naiModelInfo('nai-diffusion-4-5-full')
  return info.id.replace(/-preview$/, '') + '-inpainting'
}

/**
 * 局部重绘（逆转式立绘工作台用）：image 是 PNG 原图，mask 是同尺寸的灰度 PNG（白 = 重画），宽高要是 64 的倍数。
 * 其余参数跟正常出图一样（同一套模型设置、提示词写法），只是不加透明底：原图已经垫好了白底。
 */
export async function inpaintNovelAI({ prompt, negative, characters = [], characterNegatives = [], image, mask, width, height, seed, config, key, signal, fetchImpl }) {
  const endpoint = (config.endpoints || []).find(e => e.id === config.endpoint) || NAI_OFFICIAL
  const base = trimBase(endpoint.id === 'official' ? NAI_OFFICIAL.baseURL : endpoint.baseURL)
  if (!base) throw new ImageError('NovelAI 接入点没有地址')
  if (!key) throw new ImageError(`「${endpoint.name || endpoint.id}」还没有填写 Key`)
  if (width % 64 || height % 64) throw new ImageError('局部重绘的图宽高要是 64 的倍数')
  const finalSeed = Number.isInteger(seed) && seed >= 0 ? seed : randomInt(0, 2 ** 32 - 1)
  const body = buildNaiBody({ prompt, negative, width, height, seed: finalSeed, characters, characterNegatives, coords: characters.length > 0, config })
  body.model = inpaintModel(config.model)
  body.action = 'infill'
  Object.assign(body.parameters, {
    image: Buffer.from(image).toString('base64'),
    mask: Buffer.from(mask).toString('base64'),
    add_original_image: true,
    extra_noise_seed: finalSeed,
    inpaintImg2ImgStrength: 1,
    noise: 0,
  })
  const { bytes } = await requestBytes(base + '/ai/generate-image', {
    method: 'POST', signal, fetchImpl, timeout: 180000,
    headers: { 'content-type': 'application/json', authorization: 'Bearer ' + key, accept: 'application/zip, image/*' },
    body: JSON.stringify(body),
  })
  const out = sniffImage(bytes) ? bytes : firstImageFromZip(bytes)
  return imageResult(out, { seed: finalSeed, model: body.model, backend: 'novelai', endpoint: endpoint.id })
}
