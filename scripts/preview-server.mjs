// 本地预览：真实的宿主半边（导演 / 档案 / 出图队列 / 接口）+ 假的 Tavern、假的模型、假的生图服务，
// 外加一个模拟 Tavern 聊天页的壳子，用来开发和截图。不需要 DSH，也不需要任何 Key。
//   node scripts/preview-server.mjs [--port 5178]
// 生图请求由假服务按提示词程序化画占位图：背景画风景（scripts/preview/paint.mjs），
// 立绘画透明底半身像，衣服和表情按立绘设计师写的 tag 变（scripts/preview/sprite.mjs）；
// 插画按请求的尺寸画风景，再把插画分镜师写的每个角色块画成人物叠进去（第 1 轮是竖版，演示摇镜）。
// 「我的配乐」里放三段程序合成的示例曲（scripts/preview/synth.mjs），假导演每轮从里面选曲。
// 环境变量：FLOWGAL_SKIN 初始皮肤；FLOWGAL_FONT_DIR 本地字体镜像目录（结构同 jsDelivr 的 /npm/ 路径，
// 例如 <目录>/@fontsource/noto-sans-sc@5.3.0/400.css），不设时字体照常从 jsDelivr 读。
// 逆转式立绘演示：--aa-demo <素材包目录>（或 FLOWGAL_AA_DEMO），把林岚的立绘换成这个素材包（呼吸 + 眨眼 + 口型），
// 素材包格式见 lib/aa-sprite.js；FLOWGAL_AA_DEMO_NAME 换演示的人物，FLOWGAL_AA_DEMO_MARK 是认出这个人立绘请求的外貌 tag。
// 自动框测试：--sprite-dir <目录>，立绘请求按顺序回这个目录里的真立绘（a/ 给演示的人物，b/ 给其他人），看认脸模型在真图上认得怎样；
// --vision-dir <目录> 把认脸模型下到这个常驻目录（同 FLOWGAL_VISION_DIR），免得每次开预览都重下。
import { createServer } from 'node:http'
import { readFile, readdir, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, dirname, extname, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createStore } from '../lib/dsh/store.js'
import { createEngine } from '../lib/engine.js'
import { createRoutes } from '../lib/dsh/routes.js'
import { createMusic } from '../lib/music.js'
import { createVision } from '../lib/dsh/vision.js'
import { demoTracks } from './preview/synth.mjs'
import { CARD, TURNS, LATE_TURN } from './preview/story.mjs'
import { fakeLlmReply, fakePaint } from './preview/fake-models.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const fontDir = process.env.FLOWGAL_FONT_DIR ? resolve(process.env.FLOWGAL_FONT_DIR) : ''
const portArg = process.argv.indexOf('--port')
const PORT = Number(portArg > 0 ? process.argv[portArg + 1] : process.env.PORT || 5178)
const aaArg = process.argv.indexOf('--aa-demo')
const aaDir = (aaArg > 0 ? process.argv[aaArg + 1] : process.env.FLOWGAL_AA_DEMO) ? resolve(aaArg > 0 ? process.argv[aaArg + 1] : process.env.FLOWGAL_AA_DEMO) : ''
const AA_NAME = process.env.FLOWGAL_AA_DEMO_NAME || '林岚'
const AA_MARK = process.env.FLOWGAL_AA_DEMO_MARK || 'long black hair'
const aaManifest = aaDir ? JSON.parse(await readFile(join(aaDir, 'sprite.json'), 'utf8')) : null
const aaStill = aaDir ? await readFile(join(aaDir, aaManifest.breath.frames[0])) : null
const argOf = name => { const i = process.argv.indexOf(name); return i > 0 ? resolve(process.argv[i + 1]) : '' }
const spriteDir = argOf('--sprite-dir')
const visionDir = argOf('--vision-dir') || (process.env.FLOWGAL_VISION_DIR ? resolve(process.env.FLOWGAL_VISION_DIR) : '')
const realSprites = {}
if (spriteDir) for (const k of ['a', 'b']) realSprites[k] = { files: (await readdir(join(spriteDir, k)).catch(() => [])).filter(f => /\.png$/i.test(f)).sort().map(f => join(spriteDir, k, f)), next: 0 }
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
  async getTurn({ gameId, turn }) { const t = turns.get(turn); return t ? { gameId, turn, textVersion: t.textVersion, text: t.text, rawText: t.raw || t.text, card: CARD } : null },
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
const llm = {
  resolveModelInfo: async () => ({ context: { contextWindow: 1000000 }, defaultMaxTokens: 128000 }),
  stream(request) {
    const prompt = request.messages[0].content[0].text
    const system = String(request.system || '')
    const { reasoning, text, turn } = fakeLlmReply({ system, prompt, decorate: withMusic })
    const director = system.includes('后台导演')
    const slow = turn === 4
    return (async function* () {
      const think = director ? 12 : 16
      for (let i = 0; i < reasoning.length; i += think) { yield { type: 'reasoning-delta', text: reasoning.slice(i, i + think) }; await sleep(director ? (slow ? 90 : 4) : 8) }
      const step = director ? 12 : 24
      for (let i = 0; i < text.length; i += step) { yield { type: 'text-delta', text: text.slice(i, i + step) }; await sleep(director ? (slow ? Math.max(20, 12000 / (text.length / step)) : 1) : 6) }
      if (text !== '{}') yield { type: 'usage', usage: { inputTokens: Math.ceil(prompt.length * 0.9), outputTokens: Math.ceil(text.length / 3), ...(director ? { reasoningTokens: reasoning.length } : {}) } }
      yield { type: 'finish', reason: { kind: 'stop' } }
    })()
  },
}

async function fakeFetch(url, init = {}) {
  const body = typeof init.body === 'string' ? init.body : ''
  if (/novelai/.test(String(url)) && /subscription/.test(String(url))) return new Response(JSON.stringify({ tier: 3 }), { status: 200 })
  await sleep(1200 + Math.random() * 800)
  const json = (() => { try { return JSON.parse(body) } catch { return {} } })()
  // 立绘照柏宝绘的写法分了角色块：外貌、衣服、表情在角色块里，假画师要连 Base 带角色块一起看
  const chars = (json.parameters?.v4_prompt?.caption?.char_captions || []).map(c => c.char_caption).filter(Boolean)
  const sprite = chars.length && /transparent background|white background|simple background/.test(json.input || '')
  const prompt = sprite ? [json.input, ...chars].join(', ') : json.input || body
  // 逆转式立绘演示：这个人的立绘一律用素材包的第一张呼吸帧（剧场里实际按素材包分层画）
  if (aaStill && /white background|simple background/.test(prompt) && prompt.includes(AA_MARK)) {
    return new Response(aaStill, { status: 200, headers: { 'content-type': 'image/webp' } })
  }
  if (spriteDir && sprite) {
    const set = realSprites[prompt.includes(AA_MARK) ? 'a' : 'b']
    if (set.files.length) return new Response(await readFile(set.files[set.next++ % set.files.length]), { status: 200, headers: { 'content-type': 'image/png' } })
  }
  return new Response(await fakePaint(json), { status: 200, headers: { 'content-type': 'image/png' } })
}

const dataDir = await mkdtemp(join(tmpdir(), 'flowgal-preview-'))
const store = createStore(dataDir)
const logger = { info: () => {}, warn: m => console.warn(m) }
const engine = createEngine({ store, services: { tavern, llm, credentials: null }, fetchImpl: fakeFetch, logger })
await engine.patchConfig({
  images: { backend: 'novelai', auto: true, maxPerTurn: 1, backgrounds: false, portraits: true, expressions: true, expressionsPerTurn: 4 },
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
  return engine.onTurnSettled({ gameId: GAME, turn: t.turn, textVersion, text: t.text, rawText: t.raw || t.text, card: CARD })
}
for (const t of TURNS) await settle(t)
// 画风：内置几套之外加一套自己调过的，几套都试画一张样图（排在剧情的图后面）。
const MY_STYLE = { id: 'mynight', name: '夜景厚涂（自己调的）', artist: 'cinematic lighting, 1.2::dramatic lighting::, depth of field, thick painting, painterly', positive: 'masterpiece, best quality, very aesthetic', negative: 'lowres, bad anatomy, bad hands, blurry, watermark, text', cfg: 6, cfgRescale: 0.2 }
await engine.patchConfig({ style: { presets: [...(await engine.publicConfig()).config.style.presets, MY_STYLE] } })
for (const id of ['galgame', 'watercolor', 'cinematic', 'retro90s', MY_STYLE.id]) engine.sampleStyle(id).catch(error => console.warn('试画失败：' + error.message))

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
// 逆转式立绘演示：发给剧场的局面里给演示人物的立绘记录挂上素材包（复制一份再改，不动引擎里的数据）
const routeEngine = !aaDir ? engine : new Proxy(engine, {
  get(target, key) {
    if (key !== 'gameView') return Reflect.get(target, key)
    return async (...args) => {
      const view = structuredClone(await target.gameView(...args))
      for (const person of view?.cast || []) {
        if (person.name !== AA_NAME) continue
        for (const record of Object.values(person.sprites || {})) if (record?.assetId) record.aa = { manifest: '/aa-demo/sprite.json' }
      }
      return view
    }
  },
})
// 认脸模型：默认下到这次预览的临时数据目录（关掉就删）；--vision-dir / FLOWGAL_VISION_DIR 指定一个常驻目录，免得每次重下
const vision = createVision({ root: visionDir || join(dataDir, 'models'), logger, settings: async () => { const { config } = await engine.publicConfig(); return { ...config.vision, npmBase: config.ui.fontBase } } })
const routeList = createRoutes({ engine: routeEngine, music, updater, vision, logger })
const routes = new Map(routeList.filter(r => r.kind === 'exact').map(r => [r.path, r.handler]))
// 前缀路由跟 DSH 一样：精确的没有就找最长的前缀
const prefixes = routeList.filter(r => r.kind === 'prefix').sort((a, b) => b.path.length - a.path.length)
const routeFor = path => routes.get(path) || prefixes.find(r => path === r.path || path.startsWith(r.path + '/'))?.handler
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
  const handler = routeFor(url.pathname)
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
  if (aaDir && url.pathname.startsWith('/aa-demo/')) {
    const file = resolve(aaDir, '.' + decodeURIComponent(url.pathname.slice(8)))
    if (!file.startsWith(aaDir + sep)) { res.writeHead(403); return res.end() }
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
