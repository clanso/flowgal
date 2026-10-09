// FlowGal 宿主半边：接上 Tavern 官方插件接口（tavern.*），提供浏览器用的 JSON 接口。
// 只用公开接口：onTurnSettled / getTurn / getCardContext / backgroundModel / attach / update / remove / list / onGameRemoved，
// 以及 DSH 自带的 llm、credentials、webServer。不读 Tavern 数据目录，不打补丁。
import { createStore, dataRoot } from './store.js'
import { createEngine, PLUGIN } from './engine.js'
import { createRoutes } from './routes.js'
import { createUpdater } from './updater.js'
import { createMusic } from './music.js'

export const name = PLUGIN
export const inject = ['webServer']

export function apply(ctx) {
  const logger = ctx.logger ?? console
  const services = { tavern: null, llm: null, credentials: null }
  const store = createStore(dataRoot())
  const engine = createEngine({ store, services, logger })

  const want = (names, fn) => { if (typeof ctx.inject === 'function') ctx.inject(names, fn) }
  want(['llm'], scoped => { services.llm = scoped.llm })
  want(['credentials'], scoped => { services.credentials = scoped.credentials })
  want(['tavern'], scoped => {
    const tavern = scoped.tavern
    if (!tavern || !(tavern.apiVersion >= 1)) { logger.warn?.(`[${PLUGIN}] 当前 Tavern 没有插件接口，插件不工作`); return }
    services.tavern = tavern
    // 注册类方法在插件卸载时由 Tavern 自动撤销；必须用 tavern.方法() 形式调用。
    tavern.onTurnSettled(turn => engine.onTurnSettled(turn))
    tavern.onGameRemoved(({ gameId }) => engine.removeGame(gameId))
    logger.info?.(`[${PLUGIN}] 已接入 Tavern 插件接口 v${tavern.apiVersion}`)
  })

  const routes = createRoutes({ engine, music: createMusic({ store }), updater: createUpdater(), logger })
  const install = () => {
    const disposers = routes.map(route => ctx.webServer.register(route))
    return () => { for (const d of disposers) { try { typeof d === 'function' && d() } catch {} } }
  }
  if (typeof ctx.effect === 'function') ctx.effect(install, `${PLUGIN}: routes`)
  else install()
  if (typeof ctx.on === 'function') ctx.on('dispose', () => engine.dispose())
}
