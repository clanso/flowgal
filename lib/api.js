// 浏览器界面用的接口表：每条是 { methods, path, handler({ query, body, method }), rawBody }，两个宿主共用。
// DSH 把它包成 HTTP（lib/dsh/routes.js，/plugins/flowgal/api/*）；酒馆版在同一个页面里直接调用（不走网络）。
// rawBody：POST 请求体不是 JSON，是最多这么多字节的原始数据（上传配乐、音效）。
// /game 和 /director-log 是长轮询：带着上次的修订号来，没变化就挂着等（最多 20 秒）。
import { directorChannel } from './engine.js'
import { MAX_TRACK_BYTES } from './music.js'
import { MAX_SOUND_BYTES } from './sounds.js'

export function createApi({ engine, music, updater = null, vision = null }) {
  // 每局一个修订号：引擎一有变化就加一，叫醒挂着等的长轮询。
  const revisions = new Map()
  const waiters = new Map()
  engine.subscribe(gameId => {
    const ids = gameId === 'queue' ? [...revisions.keys()] : [gameId]
    for (const id of ids) {
      revisions.set(id, (revisions.get(id) || 0) + 1)
      for (const wake of waiters.get(id) || []) wake()
      waiters.delete(id)
    }
  })
  const wait = (key, ms) => new Promise(resolve => {
    const list = waiters.get(key) || []
    const timer = setTimeout(done, ms)
    function done() { clearTimeout(timer); resolve() }
    list.push(done)
    waiters.set(key, list)
  })
  const longPoll = async (key, since) => {
    if (!revisions.has(key)) revisions.set(key, 1)
    if (Number.isFinite(since) && since === revisions.get(key)) await wait(key, 20000)
    return revisions.get(key)
  }

  const needGame = q => { const id = String(q.gameId || ''); if (!id) throw new Error('缺少 gameId'); return id }
  const needVision = () => { if (!vision) throw new Error('这个宿主没有认脸模型'); return vision }
  // 一个路径只出现一次；同一路径的 GET / POST 在 handler 里分派。
  const route = (methods, path, handler, { rawBody = 0 } = {}) => ({ methods: [].concat(methods), path, handler, rawBody })

  const endpoints = [
    route('GET', '/game', async ({ query }) => {
      const gameId = needGame(query)
      const rev = await longPoll(gameId, Number(query.since))
      return { rev, view: await engine.gameView(gameId) }
    }),
    // 导演日志：不带 id 是列表（长轮询，含正在跑的实时输出）；带 id 是一次导演的完整记录。
    route('GET', '/director-log', async ({ query }) => {
      const gameId = needGame(query)
      if (query.id) return engine.directorEntry(gameId, String(query.id))
      const rev = await longPoll(directorChannel(gameId), Number(query.since))
      return { rev, ...(await engine.directorLog(gameId)) }
    }),
    route('POST', '/direct', async ({ body }) => ({ scene: await engine.directTurn({ gameId: needGame(body), turn: Number(body.turn), force: Boolean(body.force) }) })),
    route('POST', '/replan', async ({ body }) => engine.replanTurn(needGame(body), Number(body.turn))),
    route('POST', '/image/render', async ({ body }) => {
      const gameId = needGame(body)
      engine.renderCg(gameId, String(body.imageId), body.overrides || {}).catch(() => {})
      return {}
    }),
    route('POST', '/image/rewrite', async ({ body }) => ({ draft: await engine.rewritePrompt(needGame(body), String(body.imageId), String(body.instruction || '')) })),
    route('POST', '/image/version', async ({ body }) => { await engine.selectVersion(needGame(body), String(body.imageId), Number(body.index)); return {} }),
    route('POST', '/library/open', async ({ body }) => engine.openLibrary(body.gameId ? String(body.gameId) : '')),
    route('POST', '/style/sample', async ({ body }) => engine.sampleStyle(String(body.id || ''))),
    route('POST', '/image/until', async ({ body }) => { await engine.setImageUntil(needGame(body), String(body.imageId), String(body.until || '')); return {} }),
    route('POST', '/image/delete', async ({ body }) => { await engine.deleteImage(needGame(body), String(body.imageId)); return {} }),
    route('POST', '/image/add', async ({ body }) => ({ imageId: await engine.addImageAt(needGame(body), Number(body.turn), String(body.after || ''), body.plan || {}) })),
    route('POST', '/cancel', async ({ body }) => ({ cancelled: engine.cancel(needGame(body), String(body.kind || 'cg'), String(body.id || '')) })),
    route('POST', '/place/render', async ({ body }) => { await engine.ensurePlace(needGame(body), String(body.key || '')); return {} }),
    route('POST', '/cast', async ({ body }) => engine.castAction(needGame(body), String(body.action || ''), body)),
    // 逆转式立绘工作台：一次局部重绘（眨眼 / 口型的一个状态），回整张重画后的图
    route('POST', '/aa/inpaint', async ({ body }) => engine.aaInpaint(needGame(body), body)),
    // 补图：错过的插画、背景、立绘差分。turn 只补那一轮；kinds 选补哪几样，不给就跟着设置走。
    route('POST', '/fill', async ({ body }) => engine.fillMissing(needGame(body), {
      turn: body.turn == null ? null : Number(body.turn),
      kinds: Array.isArray(body.kinds) ? body.kinds.filter(k => ['cg', 'bg', 'sprite'].includes(k)) : null,
    })),
    // 情绪库：GET 列表；POST action=save / delete。
    route(['GET', 'POST'], '/emotions', async ({ method, body }) => (method === 'GET' ? engine.emotions() : engine.emotionAction(String(body.action || ''), body))),
    route(['GET', 'POST'], '/config', async ({ method, body }) => (method === 'POST' ? engine.patchConfig(body.patch || {}) : engine.publicConfig())),
    route('POST', '/secret', async ({ body }) => engine.setSecret(String(body.backend || ''), String(body.endpoint || ''), String(body.value ?? ''))),
    route('POST', '/test', async () => engine.testBackend()),
    route('GET', '/models', async () => engine.listModels()),
    route('GET', '/llm', async ({ query }) => engine.llmModels(String(query.provider || ''))),
    // 插件自更新：GET 看版本（check=auto / force 时顺便拉远端）；POST action=apply 快进更新，action=switch 改跟 main。
    // 宿主自己管更新的（酒馆的扩展管理）不给 updater，这里只回「不归插件管」。
    route(['GET', 'POST'], '/update', async ({ method, query, body }) => {
      if (!updater) { if (method === 'GET') return { update: { managed: false } }; throw new Error('这里的更新由宿主管') }
      if (method === 'GET') return { update: await updater.status(['auto', 'force'].includes(query.check) ? query.check : 'none') }
      if (body.action === 'apply') return { update: await updater.apply() }
      if (body.action === 'switch') return { update: await updater.switchToFallback() }
      throw new Error('未知的更新操作')
    }),
    // 我的配乐：GET 列表；POST action=update / remove。上传是单独的路径，请求体是音频原始字节。
    route(['GET', 'POST'], '/music', async ({ method, body }) => {
      if (method === 'GET') return { tracks: await music.list() }
      if (body.action === 'update') return { track: await music.update(String(body.id || ''), body.patch || {}) }
      if (body.action === 'remove') { await music.remove(String(body.id || '')); return {} }
      throw new Error('未知的配乐操作')
    }),
    route('POST', '/music/upload', async ({ body, query }) => ({ track: await music.add(body, String(query.name || '')) }), { rawBody: MAX_TRACK_BYTES }),
    // 换成自己的音效：上传是音频原始字节（slot 是哪一种音效）；POST /sound action=remove 删掉、退回默认。都返回最新设置。
    route('POST', '/sound/upload', async ({ body, query }) => engine.uploadSound(String(query.slot || ''), body, String(query.name || '')), { rawBody: MAX_SOUND_BYTES }),
    route('POST', '/sound', async ({ body }) => {
      if (body.action === 'remove') return engine.removeSound(String(body.slot || ''))
      throw new Error('未知的音效操作')
    }),
    // 认脸模型（工作台自动框）：GET 看下没下好、下载进度；POST action=download / cancel / remove。
    route(['GET', 'POST'], '/vision', async ({ method, body }) => {
      if (method === 'GET') return needVision().status()
      if (body.action === 'download') return needVision().download(String(body.pack || 'basic'))
      if (body.action === 'cancel') return needVision().cancel()
      if (body.action === 'remove') return needVision().remove(String(body.pack || 'basic'))
      throw new Error('未知的模型操作')
    }),
  ]

  const byPath = new Map(endpoints.map(e => [e.path, e]))
  /**
   * 同页直接调用（酒馆版用）：path 可以带 ?query；回 { ok: true, ...结果 }，出错抛 Error（信息跟 HTTP 版一样）。
   * rawBody 的接口 body 直接给字节（Uint8Array）。
   */
  async function call(method, pathWithQuery, body = {}) {
    const url = new URL(pathWithQuery, 'http://local')
    const endpoint = byPath.get(url.pathname)
    if (!endpoint) throw new Error('没有这个接口：' + url.pathname)
    if (!endpoint.methods.includes(method)) throw new Error('方法不对')
    if (endpoint.rawBody && method === 'POST' && body && body.length > endpoint.rawBody) throw new Error('请求太大')
    const result = await endpoint.handler({ url, body: method === 'POST' ? body || {} : {}, method, query: Object.fromEntries(url.searchParams) })
    return { ok: true, ...(result || {}) }
  }

  return { endpoints, call }
}
