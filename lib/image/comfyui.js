// ComfyUI：两种方式（柏宝绘同款思路）
//   简易参数：内置 Checkpoint 工作流，只选模型和步数等基础参数即可出图；
//   自定义工作流：导入自己的 API 格式工作流。占位符 %prompt% %negative% %width% %height% %seed% %steps% %cfg%
//   直接替换；没写占位符时自动定位 KSampler → 正负 CLIPTextEncode、EmptyLatentImage 等节点。
// 取消只撤销自己排队的任务（/queue delete），从不调用会打断别人任务的全局 /interrupt。
import { randomSeed, toBase64, utf8 } from '../bytes.js'
import { requestJson, requestBytes, imageResult, trimBase, ImageError } from './http.js'

export function simpleWorkflow({ checkpoint, prompt, negative, width, height, seed, steps, cfg, sampler, scheduler }) {
  return {
    '4': { class_type: 'CheckpointLoaderSimple', inputs: { ckpt_name: checkpoint } },
    '5': { class_type: 'EmptyLatentImage', inputs: { width, height, batch_size: 1 } },
    '6': { class_type: 'CLIPTextEncode', inputs: { text: prompt, clip: ['4', 1] } },
    '7': { class_type: 'CLIPTextEncode', inputs: { text: negative, clip: ['4', 1] } },
    '3': { class_type: 'KSampler', inputs: { seed, steps, cfg, sampler_name: sampler || 'euler_ancestral', scheduler: scheduler || 'normal', denoise: 1, model: ['4', 0], positive: ['6', 0], negative: ['7', 0], latent_image: ['5', 0] } },
    '8': { class_type: 'VAEDecode', inputs: { samples: ['3', 0], vae: ['4', 2] } },
    '9': { class_type: 'SaveImage', inputs: { filename_prefix: 'flowgal', images: ['8', 0] } },
  }
}

const PLACEHOLDERS = ['prompt', 'negative', 'width', 'height', 'seed', 'steps', 'cfg']

/** 自动定位：找到 KSampler 的 positive/negative 连到的文本节点。返回节点映射。 */
export function locateNodes(graph) {
  const nodes = Object.entries(graph || {})
  const sampler = nodes.find(([, n]) => /KSampler/i.test(n?.class_type || ''))
  const map = {}
  if (sampler) {
    const [id, node] = sampler
    map.sampler = id
    const textNode = ref => {
      let current = Array.isArray(ref) ? String(ref[0]) : null
      for (let depth = 0; current && depth < 6; depth++) {
        const n = graph[current]
        if (!n) return null
        if (typeof n.inputs?.text === 'string' || typeof n.inputs?.text_g === 'string') return current
        const next = n.inputs?.conditioning || n.inputs?.conditioning_1 || n.inputs?.positive
        current = Array.isArray(next) ? String(next[0]) : null
      }
      return null
    }
    map.positive = textNode(node.inputs?.positive)
    map.negative = textNode(node.inputs?.negative)
    const latent = node.inputs?.latent_image
    if (Array.isArray(latent) && graph[latent[0]] && 'width' in (graph[latent[0]].inputs || {})) map.latent = String(latent[0])
  }
  if (!map.latent) {
    const latent = nodes.find(([, n]) => /EmptyLatent|EmptySD3Latent/i.test(n?.class_type || ''))
    if (latent) map.latent = latent[0]
  }
  return map
}

export function hasPlaceholders(graph) {
  const text = JSON.stringify(graph)
  return PLACEHOLDERS.some(p => text.includes('%' + p + '%'))
}

/** 把参数填进工作流。返回新对象，不改原工作流。 */
export function fillWorkflow(graph, values) {
  const copy = structuredClone(graph)
  if (hasPlaceholders(copy)) {
    const walk = obj => {
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string') {
          const whole = /^%(\w+)%$/.exec(value)
          if (whole && PLACEHOLDERS.includes(whole[1]) && typeof values[whole[1]] === 'number') obj[key] = values[whole[1]]
          else obj[key] = value.replace(/%(\w+)%/g, (m, k) => PLACEHOLDERS.includes(k) ? String(values[k] ?? '') : m)
        } else if (value && typeof value === 'object') walk(value)
      }
    }
    walk(copy)
    return copy
  }
  const map = locateNodes(copy)
  if (!map.positive) throw new ImageError('工作流里找不到正面提示词节点：请在提示词处写 %prompt%')
  const setText = (id, text) => { const n = copy[id].inputs; if (typeof n.text === 'string') n.text = text; else { n.text_g = text; if ('text_l' in n) n.text_l = text } }
  setText(map.positive, values.prompt)
  if (map.negative) setText(map.negative, values.negative)
  if (map.latent) Object.assign(copy[map.latent].inputs, { width: values.width, height: values.height })
  if (map.sampler) {
    const s = copy[map.sampler].inputs
    if ('seed' in s) s.seed = values.seed
    if ('noise_seed' in s) s.noise_seed = values.seed
    if (values.steps && 'steps' in s) s.steps = values.steps
    if (values.cfg && 'cfg' in s) s.cfg = values.cfg
  }
  return copy
}

function authHeaders(config, key) {
  if (config.authType === 'bearer' && key) return { authorization: 'Bearer ' + key }
  if (config.authType === 'basic' && key) return { authorization: 'Basic ' + toBase64(utf8(key)) }
  return {}
}

export async function generateComfy({ prompt, negative, width, height, seed, config, key, signal, fetchImpl, onProgress }) {
  const base = trimBase(config.baseURL)
  if (!base) throw new ImageError('ComfyUI 没有填写地址')
  const headers = { 'content-type': 'application/json', ...authHeaders(config, key) }
  const finalSeed = Number.isInteger(seed) && seed >= 0 ? seed : randomSeed(2 ** 31 - 1)
  const values = { prompt, negative, width, height, seed: finalSeed, steps: Number(config.steps) || 24, cfg: Number(config.cfg) || 6 }
  let graph
  if (config.mode === 'workflow') {
    const saved = (config.workflows || []).find(w => w.id === config.workflow) || config.workflows?.[0]
    if (!saved?.graph) throw new ImageError('还没有导入工作流')
    graph = fillWorkflow(saved.graph, values)
  } else {
    if (!config.checkpoint) throw new ImageError('还没有选择底模（Checkpoint）')
    graph = simpleWorkflow({ checkpoint: config.checkpoint, sampler: config.sampler, scheduler: config.scheduler, ...values })
  }
  const clientId = crypto.randomUUID()
  const queued = await requestJson(base + '/prompt', { method: 'POST', headers, body: JSON.stringify({ prompt: graph, client_id: clientId }), signal, fetchImpl, timeout: 30000 })
  const promptId = queued?.prompt_id
  if (!promptId) throw new ImageError('ComfyUI 没有返回任务编号' + (queued?.error ? '：' + JSON.stringify(queued.error).slice(0, 200) : ''))
  const deadline = Date.now() + (Number(config.timeoutSec) || 600) * 1000
  try {
    while (Date.now() < deadline) {
      signal?.throwIfAborted()
      const history = await requestJson(`${base}/history/${encodeURIComponent(promptId)}`, { headers, signal, fetchImpl, timeout: 15000 })
      const entry = history?.[promptId]
      if (entry?.status?.status_str === 'error') throw new ImageError('ComfyUI 执行出错：' + JSON.stringify(entry.status.messages?.slice?.(-1) || '').slice(0, 300))
      const outputs = entry?.outputs ? Object.values(entry.outputs) : []
      const image = outputs.flatMap(o => o.images || []).find(i => i.type === 'output') || outputs.flatMap(o => o.images || [])[0]
      if (image) {
        const q = new URLSearchParams({ filename: image.filename, subfolder: image.subfolder || '', type: image.type || 'output' })
        const { bytes } = await requestBytes(`${base}/view?${q}`, { headers, signal, fetchImpl, timeout: 60000 })
        return imageResult(bytes, { seed: finalSeed, backend: 'comfyui', model: config.mode === 'workflow' ? 'workflow:' + (config.workflow || '') : config.checkpoint })
      }
      onProgress?.(null)
      await new Promise((resolve, reject) => {
        const t = setTimeout(resolve, 1200)
        signal?.addEventListener('abort', () => { clearTimeout(t); reject(new ImageError('已取消', { code: 'aborted' })) }, { once: true })
      })
    }
    throw new ImageError('ComfyUI 超时，任务仍可能在后台运行')
  } catch (error) {
    if (signal?.aborted) {
      // 只删自己的排队任务；正在采样的任务无法单独停止，交给 ComfyUI 跑完。
      try { await requestJson(base + '/queue', { method: 'POST', headers, body: JSON.stringify({ delete: [promptId] }), fetchImpl, timeout: 5000 }) } catch {}
    }
    throw error
  }
}

/** 服务器上的底模、采样器、调度器（/object_info），装了新模型或升级 ComfyUI 后点刷新就能看到。 */
export async function comfyModels(config, key, fetchImpl) {
  const base = trimBase(config.baseURL)
  const get = node => requestJson(base + '/object_info/' + node, { headers: authHeaders(config, key), fetchImpl, timeout: 8000 })
  const [ckpt, sampler] = await Promise.all([get('CheckpointLoaderSimple'), get('KSampler').catch(() => null)])
  const list = value => (Array.isArray(value?.[0]) ? value[0].map(String) : [])
  const required = sampler?.KSampler?.input?.required || {}
  return {
    models: list(ckpt?.CheckpointLoaderSimple?.input?.required?.ckpt_name).map(id => ({ id, name: id })),
    samplers: list(required.sampler_name),
    schedulers: list(required.scheduler),
  }
}

export async function comfyStats(config, key, fetchImpl) {
  const base = trimBase(config.baseURL)
  const stats = await requestJson(base + '/system_stats', { headers: authHeaders(config, key), fetchImpl, timeout: 5000 })
  const device = stats?.devices?.[0]
  return { version: stats?.system?.comfyui_version || '', device: device?.name || '', vram: device?.vram_total ? Math.round(device.vram_total / 2 ** 30) + 'GB' : '' }
}
