// OpenAI 兼容渠道：
//   images 模式：/v1/images/generations（gpt-image-1、dall-e-3、Seedream / 各类中转）
//   chat   模式：/v1/chat/completions 聊天生图中转（Gemini「banana」等），从回复里取图
import { randomInt } from 'node:crypto'
import { requestJson, requestBytes, imageResult, fromBase64, trimBase, ImageError } from './http.js'

function sizeFor(width, height, config) {
  if (config.sizeMode === 'exact') return `${width}x${height}`
  if (width > height * 1.15) return config.landscapeSize || '1536x1024'
  if (height > width * 1.15) return config.portraitSize || '1024x1536'
  return config.squareSize || '1024x1024'
}

async function downloadImage(url, signal, fetchImpl) {
  if (!/^https:\/\//i.test(url)) throw new ImageError('图片地址必须是 https')
  // 下载图片不带 Key，允许 CDN 跳转。
  const { bytes } = await requestBytes(url, { signal, fetchImpl, timeout: 120000, redirect: 'follow' })
  return bytes
}

/** 从聊天回复里找图：OpenRouter 风格 images 字段、内联 base64、Markdown 图片链接。 */
export async function imageFromChat(json, signal, fetchImpl) {
  const message = json?.choices?.[0]?.message || {}
  const parts = []
  for (const img of message.images || []) parts.push(img?.image_url?.url || img?.url)
  const content = Array.isArray(message.content) ? message.content.map(p => p?.image_url?.url || p?.text || '').join('\n') : String(message.content || '')
  parts.push(...(content.match(/data:image\/[a-z]+;base64,[A-Za-z0-9+/=]+/g) || []))
  parts.push(...[...content.matchAll(/!\[[^\]]*\]\((https:\/\/[^)\s]+)\)/g)].map(m => m[1]))
  for (const src of parts.filter(Boolean)) {
    if (src.startsWith('data:')) return fromBase64(src)
    if (/^https:\/\//.test(src)) return downloadImage(src, signal, fetchImpl)
  }
  throw new ImageError('回复里没有图片' + (content ? '：' + content.slice(0, 160) : ''))
}

const IMAGE_MODEL = /image|dall-?e|flux|seedream|seededit|imagen|banana|kolors|cogview|recraft|ideogram|midjourney|stable-?diffusion|sdxl|sd3|hidream|wanx|jimeng|hunyuan/i

/** /models 列表：能出图的排前面。中转站常把几百个模型混在一起，全部列出，由用户挑。 */
export async function openaiModels(config, key, fetchImpl) {
  const base = trimBase(config.baseURL)
  const json = await requestJson(base + '/models', { headers: key ? { authorization: 'Bearer ' + key } : {}, fetchImpl, timeout: 8000 })
  const ids = [...new Set((Array.isArray(json?.data) ? json.data : []).map(m => String(m?.id || '')).filter(Boolean))]
  const image = ids.filter(id => IMAGE_MODEL.test(id)).sort()
  const rest = ids.filter(id => !IMAGE_MODEL.test(id)).sort()
  return { models: [...image.map(id => ({ id, name: '🖼 ' + id })), ...rest.map(id => ({ id, name: id }))] }
}

export async function generateOpenAI({ prompt, negative, width, height, config, key, signal, fetchImpl }) {
  const base = trimBase(config.baseURL)
  if (!base) throw new ImageError('没有填写 API 地址')
  if (!config.model) throw new ImageError('没有填写模型')
  const headers = { 'content-type': 'application/json', ...(key ? { authorization: 'Bearer ' + key } : {}) }
  const text = negative && config.negativeInPrompt !== false ? `${prompt}\n\nAvoid: ${negative}` : prompt
  if (config.mode === 'chat') {
    const json = await requestJson(base + '/chat/completions', {
      method: 'POST', headers, signal, fetchImpl, timeout: 300000,
      body: JSON.stringify({ model: config.model, stream: false, messages: [{ role: 'user', content: `Generate one image (${width > height ? 'landscape' : height > width ? 'portrait' : 'square'}, no text). ${text}` }] }),
    })
    return imageResult(await imageFromChat(json, signal, fetchImpl), { backend: 'openai-chat', model: config.model, seed: randomInt(0, 2 ** 31 - 1) })
  }
  const body = { model: config.model, prompt: text, n: 1, size: sizeFor(width, height, config) }
  if (config.quality) body.quality = config.quality
  if (config.responseFormat === 'b64_json') body.response_format = 'b64_json'
  const json = await requestJson(base + '/images/generations', { method: 'POST', headers, body: JSON.stringify(body), signal, fetchImpl, timeout: 300000 })
  const item = json?.data?.[0]
  if (!item) throw new ImageError('没有返回图片' + (json?.error?.message ? '：' + json.error.message : ''))
  const bytes = item.b64_json ? fromBase64(item.b64_json) : item.url ? await downloadImage(item.url, signal, fetchImpl) : null
  if (!bytes) throw new ImageError('返回里既没有 b64_json 也没有 url')
  return imageResult(bytes, { backend: 'openai', model: config.model, seed: randomInt(0, 2 ** 31 - 1) })
}
