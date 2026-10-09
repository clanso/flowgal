// 本地预览：真实的宿主半边（导演 / 档案 / 出图队列 / 接口）+ 假的 Tavern、假的模型、假的生图服务，
// 外加一个模拟 Tavern 聊天页的壳子，用来开发和截图。不需要 DSH，也不需要任何 Key。
//   node scripts/preview-server.mjs [--port 5178]
// 生图请求由假服务按提示词程序化画一张占位风景（scripts/preview/paint.mjs）；立绘不生成（显示剪影占位）。
// 「我的配乐」里放三段程序合成的示例曲（scripts/preview/synth.mjs），假导演每轮从里面选曲。
// 环境变量：FLOWGAL_SKIN 初始皮肤；FLOWGAL_FONT_DIR 本地字体镜像目录（结构同 jsDelivr 的 /npm/ 路径，
// 例如 <目录>/@fontsource/noto-sans-sc@5.3.0/400.css），不设时字体照常从 jsDelivr 读。
import { createServer } from 'node:http'
import { readFile, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, dirname, extname, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createStore } from '../lib/store.js'
import { createEngine } from '../lib/engine.js'
import { createRoutes } from '../lib/routes.js'
import { createMusic } from '../lib/music.js'
import { segmentTurn } from '../lib/segment.js'
import { CARD, TURNS, LATE_TURN, directorReply } from './preview/story.mjs'
import { paintPlaceholder } from './preview/paint.mjs'
import { demoTracks } from './preview/synth.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const fontDir = process.env.FLOWGAL_FONT_DIR ? resolve(process.env.FLOWGAL_FONT_DIR) : ''
const portArg = process.argv.indexOf('--port')
const PORT = Number(portArg > 0 ? process.argv[portArg + 1] : process.env.PORT || 5178)
const GAME = 'preview-game'
const sleep = ms => new Promise(r => setTimeout(r, ms))

// ───────── 假 Tavern：内存里的轮次与媒体项，接口形状同 Tavern 插件接口 v1 ─────────
const turns = new Map()
const items = new Map()
let seq = 0
const tavern = {
  apiVersion: 1,
  async attach({ gameId, turn, textVersion, item }) { const id = 'm' + ++seq; items.set(id, { id, gameId, turn, textVersion, status: 'ready', ...item, current: true }); return { id } },
  async update(id, changes) { const item = items.get(id); if (item) Object.assign(item, changes); return item },
  async remove(id) { return items.delete(id) },
  async list({ gameId }) { return [...items.values()].filter(i => i.gameId === gameId) },
  async getTurn({ gameId, turn }) { const t = turns.get(turn); return t ? { gameId, turn, textVersion: t.textVersion, text: t.text, card: CARD } : null },
  async getCardContext() { return { description: '林岚：高三学姐，钢琴社社长。苏晴：我的同班同学，元气。', personality: '', scenario: '', lore: [] } },
  async backgroundModel() { return { provider: 'preview', model: 'scripted-director' } },
}

// ───────── 假模型：按单元编号回放写好的导演输出，像真模型一样先「思考」再分段流式吐字；
// 第 4 轮故意慢，演示「先文本后整理」和导演日志里的实时输出。配乐按轮次从示例曲里选，第 3 轮在闪电那句换歌 ─────────
const trackIds = {}
function withMusic(turn, units, reply) {
  if (!trackIds.room) return reply
  const pick = { 1: 'room', 2: 'path', 3: 'path', 4: 'room' }[turn]
  reply.scene.bgm = trackIds[pick]
  if (turn === 3) {
    const flash = units.find(u => u.text.includes('一道闪电'))
    const line = reply.lines.find(l => l.u === flash.id)
    if (line) line.bgm = trackIds.rain
    else reply.lines.push({ u: flash.id, bgm: trackIds.rain })
  }
  return reply
}
const THINKING = '先看这一轮的地点和时段，沿用上一幕的站位；说话人按引号前后的名字认，旁白里写到谁的动作就给谁换表情。值得画的只有一处，放在情绪最满的那句后面。'
const llm = {
  resolveModelInfo: async () => ({ context: { contextWindow: 1000000 }, defaultMaxTokens: 128000 }),
  stream(request) {
    const prompt = request.messages[0].content[0].text
    const isDirector = String(request.system || '').includes('后台导演')
    const turnInfo = isDirector ? [...TURNS, LATE_TURN].find(t => prompt.includes(t.text.split('\n')[0].slice(0, 12))) : null
    return (async function* () {
      if (!turnInfo) { yield { type: 'text-delta', text: JSON.stringify({ tags: '@林岚, 1girl, smile, upper body', desc: 'a smiling girl' }) }; yield { type: 'finish', reason: { kind: 'stop' } }; return }
      const slow = turnInfo.turn === 4
      const units = segmentTurn(turnInfo.text)
      const reply = JSON.stringify(withMusic(turnInfo.turn, units, directorReply(turnInfo.turn, units)), null, 1)
      for (let i = 0; i < THINKING.length; i += 12) { yield { type: 'reasoning-delta', text: THINKING.slice(i, i + 12) }; await sleep(slow ? 90 : 4) }
      const step = 12
      for (let i = 0; i < reply.length; i += step) { yield { type: 'text-delta', text: reply.slice(i, i + step) }; await sleep(slow ? Math.max(20, 12000 / (reply.length / step)) : 1) }
      yield { type: 'usage', usage: { inputTokens: Math.ceil(prompt.length * 0.9), outputTokens: Math.ceil(reply.length / 3), reasoningTokens: THINKING.length } }
      yield { type: 'finish', reason: { kind: 'stop' } }
    })()
  },
}

// ───────── 假生图：按提示词关键词程序化画一张占位风景 ─────────
async function fakeFetch(url, init = {}) {
  const body = typeof init.body === 'string' ? init.body : ''
  if (/novelai/.test(String(url)) && /subscription/.test(String(url))) return new Response(JSON.stringify({ tier: 3 }), { status: 200 })
  await sleep(1200 + Math.random() * 800)
  const prompt = (() => { try { return JSON.parse(body).input || body } catch { return body } })()
  return new Response(paintPlaceholder(prompt), { status: 200, headers: { 'content-type': 'image/png' } })
}

const dataDir = await mkdtemp(join(tmpdir(), 'flowgal-preview-'))
const store = createStore(dataDir)
const logger = { info: () => {}, warn: m => console.warn(m) }
const engine = createEngine({ store, services: { tavern, llm, credentials: null }, fetchImpl: fakeFetch, logger })
await engine.patchConfig({
  images: { backend: 'novelai', auto: true, maxPerTurn: 1, backgrounds: false, portraits: false, expressions: false },
  ui: { skin: process.env.FLOWGAL_SKIN || 'stellar', bgm: true, bgmVolume: 0.3, blip: false, textSpeed: 26, ...(fontDir ? { fontBase: `http://localhost:${PORT}/fonts/` } : {}) },
})
await engine.setSecret('novelai', 'official', 'preview-not-a-real-key')
const music = createMusic({ store })
for (const t of demoTracks()) {
  const track = await music.add(t.bytes, t.file)
  await music.update(track.id, t)
  trackIds[t.key] = track.id
}

async function settle(t) {
  const textVersion = `v${t.turn}-${Date.now().toString(36)}`
  turns.set(t.turn, { ...t, textVersion })
  return engine.onTurnSettled({ gameId: GAME, turn: t.turn, textVersion, text: t.text, card: CARD })
}
for (const t of TURNS) await settle(t)

// ───────── HTTP ─────────
// ───────── 假更新器：演示「有新版本」→「已下载，待重启」，不碰真的 git ─────────
const hour = 3600 * 1000
const update = {
  managed: true, restartRequired: false,
  current: { sha: 'b050994', time: Date.now() - 12 * hour, subject: 'feat: 视觉小说剧场、聊天场景卡与插画卡', branch: 'main', tracking: 'origin/main' },
  last: { checkedAt: Date.now(), behind: 2, ahead: 0, target: '8b6097f', error: '', gone: false, fallback: '', commits: [
    { sha: '9c1e2a4', time: Date.now() - hour / 2, subject: 'feat: 我的配乐，导演按曲目描述选曲' },
    { sha: '8b6097f', time: Date.now() - hour, subject: 'feat: 导演日志、生图模型实时列表、NovelAI V5 透明底与更多参数' },
  ] },
}
const updater = {
  status: async () => update,
  apply: async () => { await sleep(1200); Object.assign(update, { restartRequired: true, last: { ...update.last, behind: 0, commits: [], checkedAt: Date.now() } }); return update },
  switchToFallback: async () => update,
}
const routes = new Map(createRoutes({ engine, music, updater, logger }).map(r => [r.path, r.handler]))
const TYPES = { '.js': 'text/javascript; charset=utf-8', '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.webp': 'image/webp', '.png': 'image/png', '.mp3': 'audio/mpeg', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.json': 'application/json' }
async function sendFile(res, file) {
  try {
    const data = await readFile(file)
    res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream', 'access-control-allow-origin': '*', 'cache-control': 'no-cache' })
    res.end(data)
  } catch { res.writeHead(404); res.end('not found') }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost')
  const handler = routes.get(url.pathname)
  if (handler) return handler(req, res)
  if (url.pathname === '/') return sendFile(res, join(root, 'scripts/preview/shell.html'))
  if (url.pathname === '/shell.js') return sendFile(res, join(root, 'scripts/preview/shell.js'))
  if (url.pathname === '/client.js') return sendFile(res, join(root, 'client.js'))
  if (url.pathname === '/vendor/react.js') return sendFile(res, join(root, 'node_modules/react/umd/react.production.min.js'))
  if (url.pathname === '/vendor/react-dom.js') return sendFile(res, join(root, 'node_modules/react-dom/umd/react-dom.production.min.js'))
  if (fontDir && url.pathname.startsWith('/fonts/')) {
    const file = resolve(fontDir, '.' + decodeURIComponent(url.pathname.slice(6)))
    if (!file.startsWith(fontDir + sep)) { res.writeHead(403); return res.end() }
    return sendFile(res, file)
  }
  if (url.pathname === '/preview/chat') {
    const list = await tavern.list({ gameId: GAME })
    const out = [...turns.values()].sort((a, b) => a.turn - b.turn).map(t => ({ turn: t.turn, user: t.user, text: t.text, textVersion: t.textVersion, items: list.filter(i => i.turn === t.turn && i.textVersion === t.textVersion) }))
    res.writeHead(200, { 'content-type': 'application/json' })
    return res.end(JSON.stringify({ gameId: GAME, card: CARD, turns: out }))
  }
  if (url.pathname === '/preview/late' && req.method === 'POST') {
    settle(LATE_TURN).catch(() => {})
    res.writeHead(200, { 'content-type': 'application/json' })
    return res.end('{"ok":true}')
  }
  res.writeHead(404); res.end('not found')
})
server.listen(PORT, () => console.log(`预览：http://localhost:${PORT}/`))
const stop = async () => { server.close(); engine.dispose(); await rm(dataDir, { recursive: true, force: true }); process.exit(0) }
process.on('SIGINT', stop)
process.on('SIGTERM', stop)
