// DSH 宿主：把接口表（lib/api.js）包成浏览器用的 HTTP 接口 /plugins/flowgal/api/*，外加只读的素材文件和认脸模型文件。
// 防跨站：所有接口（除了 /asset、/vision-files）要求自定义请求头 x-flowgal-request（跨站页面发不出这个头而不触发预检），
// 写操作还要求 POST + JSON（上传配乐、音效是 POST + 音频原始字节）。图片、配乐和音效文件（/asset）是只读公开资源。
import { PLUGIN } from '../engine.js'
import { createApi } from '../api.js'

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
    req.on('end', () => resolve(new Uint8Array(Buffer.concat(chunks))))
    req.on('error', reject)
  })
}

async function readBody(req) {
  const bytes = await readBytes(req, MAX_BODY)
  if (!bytes.length) return {}
  try { return JSON.parse(new TextDecoder().decode(bytes)) } catch { throw new Error('请求不是合法 JSON') }
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
  const { endpoints } = createApi({ engine, music, updater, vision })
  const http = ({ methods, path, handler, rawBody }) => ({
    kind: 'exact',
    path: BASE + path,
    handler: async (req, res) => {
      try {
        const method = req.method
        if (!methods.includes(method)) return send(res, 405, { ok: false, error: '方法不对' })
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

  return [
    ...endpoints.map(http),
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
