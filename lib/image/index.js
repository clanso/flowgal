// 生图调度：渠道分发 + 并发闸门 + 限流退避 + 取消。
import { generateNovelAI } from './novelai.js'
import { generateComfy } from './comfyui.js'
import { generateOpenAI } from './openai.js'
import { generateWebUI } from './webui.js'
import { ImageError } from './http.js'
import { applyGuidance } from './style.js'

export const BACKENDS = {
  novelai: { label: 'NovelAI', run: generateNovelAI },
  comfyui: { label: 'ComfyUI', run: generateComfy },
  openai: { label: 'OpenAI 兼容 / 聊天生图', run: generateOpenAI },
  webui: { label: 'SD WebUI / Forge', run: generateWebUI },
}

/** 每个渠道（以及 NovelAI 的每个接入点）各自的凭据名。 */
export function secretRef(backend, config) {
  if (backend === 'novelai') return 'FLOWGAL_NOVELAI_' + String(config?.novelai?.endpoint || 'official').toUpperCase().replace(/[^A-Z0-9]/g, '_') + '_KEY'
  return 'FLOWGAL_' + backend.toUpperCase() + '_KEY'
}

export function backendNeedsKey(backend, config) {
  if (backend === 'novelai') return true
  if (backend === 'openai') return config?.openai?.authType !== 'none'
  return ['bearer', 'basic'].includes(config?.[backend]?.authType)
}

/**
 * 出一张图。种子：这一张指定了就用指定的；否则用设置里的固定种子；都没有（-1）则每张随机。
 * transparent 只有支持透明底的渠道 / 模型才会用（目前是 NovelAI V5）。CFG 按当前画风（config.style）。
 */
export async function generateImage({ backend, config, key, signal, fetchImpl, seed, ...input }) {
  const entry = BACKENDS[backend]
  if (!entry) throw new ImageError('未知的生图渠道：' + backend)
  const fixed = Number(config.images?.seed)
  const finalSeed = Number.isInteger(seed) && seed >= 0 ? seed : Number.isInteger(fixed) && fixed >= 0 ? fixed : undefined
  // 当前画风里填了 CFG / CFG Rescale 的，盖过渠道自己的设置。
  return entry.run({ ...input, seed: finalSeed, config: applyGuidance(backend, config[backend] || {}, config.style), key, signal, fetchImpl })
}

/**
 * 简单队列：同时最多 concurrency 个任务；429/503 等明确未出图的失败按 5s、15s 退避重试两次，
 * 其他失败（超时、断线）不自动重试，避免重复计费。
 */
export function createQueue({ concurrency = () => 1, onChange = () => {} } = {}) {
  const waiting = []
  const running = new Map()
  let disposed = false

  function pump() {
    while (!disposed && waiting.length && running.size < Math.max(1, Number(concurrency()) || 1)) {
      const job = waiting.shift()
      running.set(job.id, job)
      onChange()
      execute(job).finally(() => { running.delete(job.id); onChange(); pump() })
    }
  }

  async function execute(job) {
    const delays = [5000, 15000]
    for (let attempt = 0; ; attempt++) {
      try {
        job.resolve(await job.run(job.controller.signal))
        return
      } catch (error) {
        if (job.controller.signal.aborted) { job.reject(new ImageError('已取消', { code: 'aborted' })); return }
        if (error?.retryable && attempt < delays.length) {
          job.onRetry?.(error, attempt + 1)
          await new Promise(r => setTimeout(r, delays[attempt]))
          if (job.controller.signal.aborted) { job.reject(new ImageError('已取消', { code: 'aborted' })); return }
          continue
        }
        job.reject(error)
        return
      }
    }
  }

  return {
    enqueue(id, run, { onRetry } = {}) {
      if (disposed) return Promise.reject(new ImageError('插件已卸载'))
      if (running.has(id) || waiting.some(j => j.id === id)) return Promise.reject(new ImageError('这张图已经在生成中'))
      return new Promise((resolve, reject) => {
        waiting.push({ id, run, resolve, reject, onRetry, controller: new AbortController() })
        onChange()
        pump()
      })
    },
    cancel(id) {
      const index = waiting.findIndex(j => j.id === id)
      if (index >= 0) { const [job] = waiting.splice(index, 1); job.reject(new ImageError('已取消', { code: 'aborted' })); onChange(); return true }
      const job = running.get(id)
      if (job) { job.controller.abort(); return true }
      return false
    },
    has: id => running.has(id) || waiting.some(j => j.id === id),
    state: () => ({ running: [...running.keys()], waiting: waiting.map(j => j.id) }),
    dispose() {
      disposed = true
      for (const job of waiting.splice(0)) job.reject(new ImageError('插件已卸载'))
      for (const job of running.values()) job.controller.abort()
    },
  }
}
