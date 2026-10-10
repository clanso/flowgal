// 酒馆宿主：在浏览器里把核心装起来——存档（st/store.js）、大模型（st/llm.js）、楼层和事件（st/tavern.js）、引擎（lib/engine.js）、
// 接口表（lib/api.js，界面同页直接调用）。跟 DSH 的 lib/dsh/plugin.js 是同一个位置的东西。
import { createEngine } from '../lib/engine.js'
import { createMusic } from '../lib/music.js'
import { createApi } from '../lib/api.js'
import { createStStore } from './store.js'
import { createStLlm } from './llm.js'
import { createStTavern } from './tavern.js'

export function createStHost({ getContext = () => globalThis.SillyTavern.getContext(), fetchImpl = (...a) => fetch(...a), imageFetch = fetchImpl, vision = null, logger = console } = {}) {
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
  const api = createApi({ engine, music: createMusic({ store }), vision })
  const stop = tavern.listen()
  return {
    engine, api, tavern, store, llm,
    dispose() { stop(); engine.dispose() },
  }
}
