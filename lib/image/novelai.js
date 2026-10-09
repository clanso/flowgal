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

export function buildNaiBody({ prompt, negative, width, height, seed, characters = [], transparent = false, config }) {
  const info = naiModelInfo(config.model) || naiModelInfo('nai-diffusion-4-5-full')
  const model = info.id
  const w = snap64(width), h = snap64(height)
  if (w * h > 3_145_728) throw new ImageError('尺寸超过 NovelAI 单张上限')
  const clear = Boolean(transparent && info.v5)
  if (clear) prompt = withTransparentBackground(prompt)
  const parameters = {
    params_version: 3,
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
    Object.assign(parameters, {
      legacy_v3_extend: false,
      use_coords: false,
      v4_prompt: { caption: { base_caption: prompt, char_captions: chars }, use_coords: false, use_order: true },
      v4_negative_prompt: { caption: { base_caption: negative, char_captions: chars.map(c => ({ char_caption: '', centers: c.centers })) }, legacy_uc: false },
      characterPrompts: chars.map(c => ({ prompt: c.char_caption, uc: '', center: c.centers[0], enabled: true })),
    })
  } else {
    Object.assign(parameters, { sm: false, sm_dyn: false })
  }
  // Variety+：前几步不做 CFG，构图更多样。V4 / V4.5 才有，阈值随画面面积缩放（与官网一致）。
  if (config.variety && info.v4 && !info.v5) parameters.skip_cfg_above_sigma = (model === 'nai-diffusion-4-5-full' ? 58 : 19) * Math.sqrt(w * h / (832 * 1216))
  if (clear) parameters.tag_hint_transparent_background = true
  return { input: prompt, model, action: 'generate', parameters }
}

export async function generateNovelAI({ prompt, negative, width, height, seed, characters, transparent, config, key, signal, fetchImpl }) {
  const endpoint = (config.endpoints || []).find(e => e.id === config.endpoint) || NAI_OFFICIAL
  const base = trimBase(endpoint.id === 'official' ? NAI_OFFICIAL.baseURL : endpoint.baseURL)
  if (!base) throw new ImageError('NovelAI 接入点没有地址')
  if (!key) throw new ImageError(`「${endpoint.name || endpoint.id}」还没有填写 Key`)
  const finalSeed = Number.isInteger(seed) && seed >= 0 ? seed : randomInt(0, 2 ** 32 - 1)
  const body = buildNaiBody({ prompt, negative, width, height, seed: finalSeed, characters, transparent, config })
  const { bytes } = await requestBytes(base + '/ai/generate-image', {
    method: 'POST', signal, fetchImpl, timeout: 180000,
    headers: { 'content-type': 'application/json', authorization: 'Bearer ' + key, accept: 'application/zip, image/*' },
    body: JSON.stringify(body),
  })
  // 第三方站有的直接回图片，有的回 ZIP。
  const image = sniffImage(bytes) ? bytes : firstImageFromZip(bytes)
  return imageResult(image, { seed: finalSeed, model: body.model, backend: 'novelai', endpoint: endpoint.id })
}
