// 酒馆宿主：在浏览器里把核心装起来——存档（st/store.js）、大模型（st/llm.js）、楼层和事件（st/tavern.js）、引擎（lib/engine.js）、
// 接口表（lib/api.js，界面同页直接调用）。跟 DSH 的 lib/dsh/plugin.js 是同一个位置的东西。
import { createEngine } from '../lib/engine.js'
import { createMusic } from '../lib/music.js'
import { createApi } from '../lib/api.js'
import { createStStore } from './store.js'
import { createStLlm } from './llm.js'
import { createStTavern } from './tavern.js'
import { createNetFetch } from './net.js'
import { createBrowserVision } from './vision.js'

export function createStHost({ getContext = () => globalThis.SillyTavern.getContext(), fetchImpl = (...a) => fetch(...a), imageFetch = createNetFetch({ fetchImpl }), caches = globalThis.caches, logger = console } = {}) {
  const log = (level, msg) => { try { logger[level]?.(`[flowgal] ${msg}`) } catch {} }
  const ctx = getContext()
  const store = createStStore({
    fetchImpl,
    headers: () => getContext().getRequestHeaders(),
    settings: ctx.extensionSettings,
    saveSettings: () => getContext().saveSettingsDebounced(),
  })
  const llm = createStLlm({ getContext })
  const tavern = createStTavern({ getContext, store, llm, log })
  const engine = createEngine({ store, services: { tavern, llm, credentials: null }, logger, fetchImpl: imageFetch })
  tavern.onTurnSettled(turn => engine.onTurnSettled(turn))
  tavern.onGameRemoved(({ gameId }) => engine.removeGame(gameId))
  // 认脸模型：存浏览器缓存，下载地址跟着 FlowGal 的设置（来源、镜像；运行库跟字体用同一个 npm CDN）
  const vision = caches ? createBrowserVision({
    caches, fetchImpl: imageFetch, log,
    settings: async () => { const { config } = await engine.publicConfig(); return { ...config.vision, npmBase: config.ui.fontBase } },
  }) : null
  const api = createApi({ engine, music: createMusic({ store }), vision })
  const stop = tavern.listen()
  return {
    engine, api, tavern, store, llm, vision,
    dispose() { stop(); engine.dispose() },
  }
}
