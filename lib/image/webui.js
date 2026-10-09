// SD WebUI / Forge：/sdapi/v1/txt2img。选了底模时只对这一次请求生效（override_settings），不改服务端全局设置；
// 没选就沿用服务端当前的底模。底模、采样器、调度器列表都从服务端实时读取。
import { randomInt } from 'node:crypto'
import { requestJson, imageResult, fromBase64, trimBase, ImageError } from './http.js'

function authHeaders(config, key) {
  const headers = { 'content-type': 'application/json' }
  if (key && config.authType === 'basic') headers.authorization = 'Basic ' + Buffer.from(key).toString('base64')
  if (key && config.authType === 'bearer') headers.authorization = 'Bearer ' + key
  return headers
}

export async function webuiModels(config, key, fetchImpl) {
  const base = trimBase(config.baseURL)
  const get = path => requestJson(base + path, { headers: authHeaders(config, key), fetchImpl, timeout: 8000 })
  const [models, samplers, schedulers] = await Promise.all([get('/sdapi/v1/sd-models'), get('/sdapi/v1/samplers').catch(() => []), get('/sdapi/v1/schedulers').catch(() => [])])
  return {
    models: (Array.isArray(models) ? models : []).map(m => ({ id: String(m.title || m.model_name), name: String(m.model_name || m.title) })),
    samplers: (Array.isArray(samplers) ? samplers : []).map(s => String(s.name)).filter(Boolean),
    schedulers: (Array.isArray(schedulers) ? schedulers : []).map(s => String(s.label || s.name)).filter(Boolean),
  }
}

export async function generateWebUI({ prompt, negative, width, height, seed, config, key, signal, fetchImpl }) {
  const base = trimBase(config.baseURL)
  if (!base) throw new ImageError('WebUI 没有填写地址')
  const headers = authHeaders(config, key)
  const finalSeed = Number.isInteger(seed) && seed >= 0 ? seed : randomInt(0, 2 ** 31 - 1)
  const body = {
    prompt, negative_prompt: negative, width, height, seed: finalSeed, batch_size: 1, n_iter: 1,
    steps: Math.max(1, Math.min(150, Number(config.steps) || 24)),
    cfg_scale: Math.max(1, Math.min(30, Number(config.cfg) || 6)),
    ...(config.sampler ? { sampler_name: config.sampler } : {}),
    ...(config.scheduler ? { scheduler: config.scheduler } : {}),
    ...(config.model ? { override_settings: { sd_model_checkpoint: config.model }, override_settings_restore_afterwards: true } : {}),
    ...(config.hires ? { enable_hr: true, hr_scale: Number(config.hiresScale) || 1.5, denoising_strength: Number(config.hiresDenoise) || 0.35, hr_upscaler: config.hiresUpscaler || 'R-ESRGAN 4x+ Anime6B' } : {}),
  }
  const json = await requestJson(base + '/sdapi/v1/txt2img', { method: 'POST', headers, body: JSON.stringify(body), signal, fetchImpl, timeout: 600000 })
  const first = json?.images?.[0]
  if (!first) throw new ImageError('WebUI 没有返回图片')
  return imageResult(fromBase64(first), { seed: finalSeed, backend: 'webui' })
}
