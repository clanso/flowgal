// NovelAI 模型表与协议判断：纯数据和纯函数，宿主和浏览器共用（浏览器据此决定显示哪些参数）。
// NovelAI 没有公开的「列出模型」接口，官方网页也是写死的。这里是已知模型的预设；
// 以后出的新模型可以在设置里直接填模型 ID，按名字里的版本号选协议。
// v5：固定 karras 噪声调度、没有 Variety+、支持透明底（tag_hint_transparent_background）。
export const NAI_MODELS = {
  'nai-diffusion-5-full': { label: 'V5 Full', scale: 5, v4: true, v5: true },
  'nai-diffusion-5-curated': { label: 'V5 Curated', scale: 5, v4: true, v5: true },
  'nai-diffusion-4-5-full': { label: 'V4.5 Full', scale: 5, v4: true },
  'nai-diffusion-4-5-curated': { label: 'V4.5 Curated', scale: 5, v4: true },
  'nai-diffusion-4-full': { label: 'V4 Full', scale: 5.5, v4: true },
  'nai-diffusion-4-curated-preview': { label: 'V4 Curated', scale: 5.5, v4: true },
  'nai-diffusion-3': { label: 'Anime V3', scale: 5, v4: false },
  'nai-diffusion-furry-3': { label: 'Furry V3', scale: 5, v4: false },
}

export const NAI_SAMPLERS = ['k_euler_ancestral', 'k_euler', 'k_dpmpp_2s_ancestral', 'k_dpmpp_2m_sde', 'k_dpmpp_2m', 'k_dpmpp_sde']
export const NAI_NOISE_SCHEDULES = ['karras', 'exponential', 'polyexponential']

const MODEL_ID = /^[a-z0-9][a-z0-9._-]{1,63}$/i

/** 已知模型直接查表；没见过的模型按名字里的版本号推断：V3 及以前用旧协议，其余按 V4 起的新协议，V5 起按 V5 的规矩。 */
export function naiModelInfo(model) {
  const id = String(model || '').trim()
  if (NAI_MODELS[id]) return { id, ...NAI_MODELS[id] }
  if (!MODEL_ID.test(id)) return null
  const version = Number((id.match(/^nai-diffusion(?:-furry)?-(\d+)/i) || [])[1])
  const legacy = /^nai-diffusion(-furry)?$/i.test(id) || (version > 0 && version < 4)
  return { id, label: id, scale: 5, v4: !legacy, v5: version >= 5 }
}
