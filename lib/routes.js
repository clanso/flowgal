// 浏览器用的 JSON 接口：/plugins/flowgal/api/*
// 防跨站：所有接口（除了 /asset）要求自定义请求头 x-flowgal-request（跨站页面发不出这个头而不触发预检），
// 写操作还要求 POST + JSON（上传配乐、音效是 POST + 音频原始字节）。图片、配乐和音效文件（/asset）是只读公开资源。
import { directorChannel, PLUGIN } from './engine.js'
import { MAX_TRACK_BYTES } from './music.js'
import { MAX_SOUND_BYTES } from './sounds.js'

export const BASE = `/plugins/${PLUGIN}/api`
const MAX_BODY = 16 * 1024 * 1024

function send(res, status, body) {
  const data = Buffer.from(JSON.stringify(body))
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'content-length': data.byteLength, 'cache-control': 'no-store' })
  res.end(data)
}

function readBytes(req, limit) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    req.on('data', chunk => {
      size += chunk.length
      if (size > limit) { reject(new Error('请求太大')); req.destroy(); return }
      chunks.push(chunk)
    })
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

async function readBody(req) {
  const bytes = await readBytes(req, MAX_BODY)
  if (!bytes.length) return {}
  try { return JSON.parse(bytes.toString('utf8')) } catch { throw new Error('请求不是合法 JSON') }
}

/** 只读文件响应，支持 Range（Safari 播放音频必须有；拖进度条也靠它）。 */
function sendAsset(req, res, asset) {
  const size = asset.data.byteLength
  const headers = { 'content-type': asset.mediaType, 'accept-ranges': 'bytes', 'cache-control': 'private, max-age=31536000, immutable', 'x-content-type-options': 'nosniff' }
  const range = /^bytes=(\d*)-(\d*)$/.exec(String(req.headers.range || ''))
  if (!range) { res.writeHead(200, { ...headers, 'content-length': size }); res.end(asset.data); return }
  const [, from, to] = range
  const start = from === '' ? Math.max(0, size - Number(to)) : Number(from)
  const end = from === '' || to === '' ? size - 1 : Math.min(Number(to), size - 1)
  if (!(from || to) || start > end) { res.writeHead(416, { 'content-range': `bytes */${size}` }); res.end(); return }
  res.writeHead(206, { ...headers, 'content-range': `bytes ${start}-${end}/${size}`, 'content-length': end - start + 1 })
  res.end(asset.data.subarray(start, end + 1))
}

export function createRoutes({ engine, music, updater, vision, logger }) {
  // 每局一个修订号：浏览器长轮询 /game?since=N，有变化立即返回。
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
  /** 长轮询：客户端带着上次的修订号来，没变化就挂着等（最多 20 秒）。返回当前修订号。 */
  const longPoll = async (key, since) => {
    if (!revisions.has(key)) revisions.set(key, 1)
    if (Number.isFinite(since) && since === revisions.get(key)) await wait(key, 20000)
    return revisions.get(key)
  }

  // 一个路径只注册一次（同路径重复注册会互相覆盖）；同一路径的 GET / POST 在 handler 里分派。
  // rawBody：POST 请求体不是 JSON，是最多这么多字节的原始数据（上传配乐）。
  const json = (methods, path, handler, { rawBody = 0 } = {}) => ({
    kind: 'exact',
    path: BASE + path,
    handler: async (req, res) => {
      try {
        const method = req.method
        if (![].concat(methods).includes(method)) return send(res, 405, { ok: false, error: '方法不对' })
        if (req.headers['x-flowgal-request'] !== '1') return send(res, 403, { ok: false, error: '缺少插件请求头' })
        const raw = method === 'POST' && rawBody
        if (method === 'POST' && !raw && !/application\/json/i.test(req.headers['content-type'] || '')) return send(res, 415, { ok: false, error: '需要 JSON' })
        const url = new URL(req.url || '/', 'http://localhost')
        const body = raw ? await readBytes(req, rawBody) : method === 'POST' ? await readBody(req) : {}
        const result = await handler({ url, body, method, query: Object.fromEntries(url.searchParams) })
        send(res, 200, { ok: true, ...(result || {}) })
      } catch (error) {
        logger.warn?.(`[${PLUGIN}] ${path}: ${error?.message || error}`)
        if (!res.headersSent) send(res, 400, { ok: false, error: String(error?.message || error).slice(0, 400) })
      }
    },
  })

  const needGame = q => { const id = String(q.gameId || ''); if (!id) throw new Error('缺少 gameId'); return id }

  return [
    json('GET', '/game', async ({ query }) => {
      const gameId = needGame(query)
      const rev = await longPoll(gameId, Number(query.since))
      return { rev, view: await engine.gameView(gameId) }
    }),
    // 导演日志：不带 id 是列表（长轮询，含正在跑的实时输出）；带 id 是一次导演的完整记录。
    json('GET', '/director-log', async ({ query }) => {
      const gameId = needGame(query)
      if (query.id) return engine.directorEntry(gameId, String(query.id))
      const rev = await longPoll(directorChannel(gameId), Number(query.since))
      return { rev, ...(await engine.directorLog(gameId)) }
    }),
    json('POST', '/direct', async ({ body }) => ({ scene: await engine.directTurn({ gameId: needGame(body), turn: Number(body.turn), force: Boolean(body.force) }) })),
    json('POST', '/replan', async ({ body }) => engine.replanTurn(needGame(body), Number(body.turn))),
    json('POST', '/image/render', async ({ body }) => {
      const gameId = needGame(body)
      engine.renderCg(gameId, String(body.imageId), body.overrides || {}).catch(() => {})
      return {}
    }),
    json('POST', '/image/rewrite', async ({ body }) => ({ draft: await engine.rewritePrompt(needGame(body), String(body.imageId), String(body.instruction || '')) })),
    json('POST', '/image/version', async ({ body }) => { await engine.selectVersion(needGame(body), String(body.imageId), Number(body.index)); return {} }),
    json('POST', '/library/open', async ({ body }) => engine.openLibrary(body.gameId ? String(body.gameId) : '')),
    json('POST', '/style/sample', async ({ body }) => engine.sampleStyle(String(body.id || ''))),
    json('POST', '/image/until', async ({ body }) => { await engine.setImageUntil(needGame(body), String(body.imageId), String(body.until || '')); return {} }),
    json('POST', '/image/delete', async ({ body }) => { await engine.deleteImage(needGame(body), String(body.imageId)); return {} }),
    json('POST', '/image/add', async ({ body }) => ({ imageId: await engine.addImageAt(needGame(body), Number(body.turn), String(body.after || ''), body.plan || {}) })),
    json('POST', '/cancel', async ({ body }) => ({ cancelled: engine.cancel(needGame(body), String(body.kind || 'cg'), String(body.id || '')) })),
    json('POST', '/place/render', async ({ body }) => { await engine.ensurePlace(needGame(body), String(body.key || '')); return {} }),
    json('POST', '/cast', async ({ body }) => engine.castAction(needGame(body), String(body.action || ''), body)),
    // 逆转式立绘工作台：一次局部重绘（眨眼 / 口型的一个状态），回整张重画后的图
    json('POST', '/aa/inpaint', async ({ body }) => engine.aaInpaint(needGame(body), body)),
    // 补图：错过的插画、背景、立绘差分。turn 只补那一轮；kinds 选补哪几样，不给就跟着设置走。
    json('POST', '/fill', async ({ body }) => engine.fillMissing(needGame(body), {
      turn: body.turn == null ? null : Number(body.turn),
      kinds: Array.isArray(body.kinds) ? body.kinds.filter(k => ['cg', 'bg', 'sprite'].includes(k)) : null,
    })),
    // 情绪库：GET 列表；POST action=save / delete。
    json(['GET', 'POST'], '/emotions', async ({ method, body }) => (method === 'GET' ? engine.emotions() : engine.emotionAction(String(body.action || ''), body))),
    json(['GET', 'POST'], '/config', async ({ method, body }) => (method === 'POST' ? engine.patchConfig(body.patch || {}) : engine.publicConfig())),
    json('POST', '/secret', async ({ body }) => engine.setSecret(String(body.backend || ''), String(body.endpoint || ''), String(body.value ?? ''))),
    json('POST', '/test', async () => engine.testBackend()),
    json('GET', '/models', async () => engine.listModels()),
    json('GET', '/llm', async ({ query }) => engine.llmModels(String(query.provider || ''))),
    // 插件自更新：GET 看版本（check=auto / force 时顺便拉远端）；POST action=apply 快进更新，action=switch 改跟 main。
    json(['GET', 'POST'], '/update', async ({ method, query, body }) => {
      if (method === 'GET') return { update: await updater.status(['auto', 'force'].includes(query.check) ? query.check : 'none') }
      if (body.action === 'apply') return { update: await updater.apply() }
      if (body.action === 'switch') return { update: await updater.switchToFallback() }
      throw new Error('未知的更新操作')
    }),
    // 我的配乐：GET 列表；POST action=update / remove。上传是单独的路径，请求体是音频原始字节。
    json(['GET', 'POST'], '/music', async ({ method, body }) => {
      if (method === 'GET') return { tracks: await music.list() }
      if (body.action === 'update') return { track: await music.update(String(body.id || ''), body.patch || {}) }
      if (body.action === 'remove') { await music.remove(String(body.id || '')); return {} }
      throw new Error('未知的配乐操作')
    }),
    json('POST', '/music/upload', async ({ body, query }) => ({ track: await music.add(body, String(query.name || '')) }), { rawBody: MAX_TRACK_BYTES }),
    // 换成自己的音效：上传是音频原始字节（slot 是哪一种音效）；POST /sound action=remove 删掉、退回默认。都返回最新设置。
    json('POST', '/sound/upload', async ({ body, query }) => engine.uploadSound(String(query.slot || ''), body, String(query.name || '')), { rawBody: MAX_SOUND_BYTES }),
    json('POST', '/sound', async ({ body }) => {
      if (body.action === 'remove') return engine.removeSound(String(body.slot || ''))
      throw new Error('未知的音效操作')
    }),
    // 认脸模型（工作台自动框）：GET 看下没下好、下载进度；POST action=download / cancel / remove。
    json(['GET', 'POST'], '/vision', async ({ method, body }) => {
      if (method === 'GET') return vision.status()
      if (body.action === 'download') return vision.download(String(body.pack || 'basic'))
      if (body.action === 'cancel') return vision.cancel()
      if (body.action === 'remove') return vision.remove(String(body.pack || 'basic'))
      throw new Error('未知的模型操作')
    }),
    {
      // 下好的模型文件（浏览器里的 onnxruntime 直接读，带不了自定义请求头）：只读、只认列表里的文件
      kind: 'prefix',
      path: BASE + '/vision-files',
      handler: async (req, res) => {
        const rest = decodeURIComponent(new URL(req.url || '/', 'http://localhost').pathname.slice((BASE + '/vision-files/').length))
        await vision.serve(req, res, rest).catch(() => { if (!res.headersSent) { res.writeHead(500); res.end() } })
      },
    },
    {
      kind: 'exact',
      path: BASE + '/asset',
      handler: async (req, res) => {
        const id = new URL(req.url || '/', 'http://localhost').searchParams.get('id') || ''
        const asset = await engine.readAsset(id).catch(() => null)
        if (!asset) { res.writeHead(404); res.end(); return }
        sendAsset(req, res, asset)
      },
    },
  ]
}
