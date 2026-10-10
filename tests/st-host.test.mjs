// 酒馆宿主层：存档（user/files、user/images）、大模型（连接配置、流式）、楼层和事件（轮次号、正文版本、卡片），
// 以及装起来以后「酒馆写完一轮 → 导演整理 → 楼层挂上场景卡」。用一个假的酒馆（假的文件接口、聊天、事件、连接配置）。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { createStStore, stAssetUrl } from '../st/store.js'
import { createStLlm } from '../st/llm.js'
import { createStTavern, TURN_FIELD } from '../st/tavern.js'
import { createStHost } from '../st/host.js'
import { fromBase64 } from '../lib/bytes.js'
import { createNetFetch } from '../st/net.js'
import { createBrowserVision, cacheKey } from '../st/vision.js'
import { createHash } from 'node:crypto'

const PNG = fromBase64('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==')
const MP3 = new Uint8Array([0x49, 0x44, 0x33, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0xff, 0xfb])

/** 假酒馆的文件接口：user/files 平铺、user/images/<一层>/。记下每次请求。 */
function fakeServer() {
  const files = new Map(), images = new Map(), calls = []
  const json = body => new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } })
  async function fetchImpl(url, init = {}) {
    const path = String(url)
    calls.push({ path, method: init.method || 'GET', headers: init.headers })
    const body = init.body ? JSON.parse(init.body) : null
    if (path === '/api/files/upload') {
      if (!/^[a-zA-Z0-9_\-.]+$/.test(body.name)) return new Response('Illegal character in filename', { status: 400 })
      files.set(body.name, fromBase64(body.data))
      return json({ path: '/user/files/' + body.name })
    }
    if (path === '/api/files/verify') return json(Object.fromEntries(body.urls.map(u => [u, files.has(u.replace('/user/files/', ''))])))
    if (path === '/api/files/delete') return files.delete(body.path.replace('/user/files/', '')) ? new Response('', { status: 200 }) : new Response('', { status: 404 })
    if (path.startsWith('/user/files/')) return files.has(path.slice(12)) ? new Response(files.get(path.slice(12))) : new Response('', { status: 404 })
    if (path === '/api/images/upload') {
      const key = `${body.ch_name}/${body.filename}.${body.format}`
      images.set(key, fromBase64(body.image))
      return json({ path: '/user/images/' + key })
    }
    if (path === '/api/images/list') return json([...images.keys()].filter(k => k.startsWith(body.folder + '/')).map(k => k.split('/').pop()))
    if (path === '/api/images/delete') return images.delete(body.path.replace('/user/images/', '')) ? new Response('', { status: 200 }) : new Response('', { status: 404 })
    if (path.startsWith('/user/images/')) return images.has(path.slice(13)) ? new Response(images.get(path.slice(13))) : new Response('', { status: 404 })
    return new Response('not found', { status: 404 })
  }
  return { files, images, calls, fetchImpl }
}

/** 假的 getContext()：一个角色、一段聊天、事件总线、连接配置。reply 决定模型回什么。 */
function fakeContext({ reply = () => '好的', profiles = [{ id: 'p1', name: '主力', api: 'openai', model: 'deepseek-chat' }], selected = 'p1' } = {}) {
  const eventSource = new EventEmitter()
  const eventTypes = { MESSAGE_RECEIVED: 'message_received', MESSAGE_EDITED: 'message_edited', MESSAGE_SWIPED: 'message_swiped', CHAT_DELETED: 'chat_deleted', CHAT_CHANGED: 'chat_changed' }
  const requests = []
  const ctx = {
    chat: [
      { name: '林岚', is_user: false, mes: '你终于来了。', swipe_id: 0, swipes: ['你终于来了。'] },
      { name: '我', is_user: true, mes: '抱歉，来晚了。' },
      { name: '林岚', is_user: false, mes: '“那就罚你听我弹完这一首。”林岚说。', swipe_id: 0, swipes: ['“那就罚你听我弹完这一首。”林岚说。'] },
    ],
    characters: [{ avatar: 'linlan.png', name: '林岚', chat: '林岚 - 1' }],
    characterId: 0, chatId: '林岚 - 1', groupId: null, maxContext: 16384,
    extensionSettings: { connectionManager: { profiles, selectedProfile: selected }, disabledExtensions: [] },
    eventSource, eventTypes, saved: 0,
    getRequestHeaders: () => ({ 'Content-Type': 'application/json', 'X-CSRF-Token': 't' }),
    saveSettingsDebounced() { ctx.saved++ },
    async saveChat() {},
    getCharacterCardFields: () => ({ description: '高三学姐，钢琴社社长。', personality: '安静', scenario: '放学后的琴房', persona: '' }),
    async getWorldInfoPrompt(chat) { return { worldInfoString: `世界书：琴房在旧校舍三楼（扫了 ${chat.length} 条）` } },
    async generateRaw({ systemPrompt, prompt }) { requests.push({ raw: true, systemPrompt, prompt }); return reply({ system: systemPrompt, user: prompt }) },
    ConnectionManagerRequestService: {
      getSupportedProfiles: () => profiles,
      async sendRequest(id, messages, maxTokens, custom, override) {
        requests.push({ id, messages, maxTokens, custom, override })
        const text = reply({ system: messages.find(m => m.role === 'system')?.content || '', user: messages.find(m => m.role === 'user')?.content || '' })
        return async function* () {
          yield { text: '', state: { reasoning: '想' } }
          yield { text: text.slice(0, 5), state: { reasoning: '想一想' } }
          yield { text, state: { reasoning: '想一想' } }
        }
      },
    },
  }
  return { ctx, requests }
}

test('gate: 酒馆版存档——JSON 写进 user/files、读回来是拷贝、并发改不丢；图片进 user/images/flowgal、配乐进 user/files；Key 放扩展设置', async () => {
  const server = fakeServer()
  const settings = {}
  let saved = 0
  const store = createStStore({ fetchImpl: server.fetchImpl, settings, saveSettings: () => saved++ })
  await store.updateConfig(c => { c.ui = { skin: 'stellar' } })
  const read = await store.readConfig()
  read.ui.skin = '被改了'
  assert.equal((await store.readConfig()).ui.skin, 'stellar', '读出来的是拷贝')
  // 同一局并发改 20 次：串行读改写，一次都不丢
  await Promise.all(Array.from({ length: 20 }, (_, i) => store.updateGame('林岚/聊天 @1', g => { g.castLog.push(i) })))
  assert.equal((await store.readGame('林岚/聊天 @1')).castLog.length, 20)
  await new Promise(r => setTimeout(r, 20))
  const names = [...server.files.keys()]
  assert.ok(names.includes('flowgal-config.json'))
  assert.ok(names.some(n => /^flowgal-game-[0-9a-f]{32}\.json$/.test(n)), '局号哈希成合法文件名：' + names)
  // 换一个存档对象（相当于刷新页面）从酒馆读回来
  const again = createStStore({ fetchImpl: server.fetchImpl, settings })
  assert.equal((await again.readGame('林岚/聊天 @1')).castLog.length, 20)
  // 素材
  const img = await store.saveAsset(PNG, 'image/png')
  const song = await store.saveAsset(MP3, 'audio/mpeg')
  assert.match(stAssetUrl(img), /^\/user\/images\/flowgal\/[0-9a-f]{32}\.png$/)
  assert.match(stAssetUrl(song), /^\/user\/files\/flowgal-a-[0-9a-f]{32}\.mp3$/)
  assert.deepEqual((await store.readAsset(img)).data, PNG)
  assert.equal((await store.readAsset(song)).mediaType, 'audio/mpeg')
  assert.equal(stAssetUrl('../../secrets.json'), '', '只认素材编号')
  // Key
  await store.updateSecrets(s => { s.NOVELAI_TOKEN_OFFICIAL = 'pst-x' })
  assert.deepEqual(settings.flowgal_secrets, { NOVELAI_TOKEN_OFFICIAL: 'pst-x' })
  assert.equal(saved, 1)
  assert.equal(store.secretsLabel, '酒馆的扩展设置（settings.json）')
  // 删局：本局的图和存档都删掉
  await store.updateGame('林岚/聊天 @1', g => { g.places = { k: { assetId: img } } })
  await new Promise(r => setTimeout(r, 20))
  await store.removeGame('林岚/聊天 @1')
  assert.equal(await store.readAsset(img), null)
  assert.ok(![...server.files.keys()].some(n => n.startsWith('flowgal-game-')))
  // 图片文件夹：复制到 user/images/FlowGal-<卡名>/，重名加 (2)
  const pic = await store.saveAsset(PNG, 'image/png')
  assert.equal(await store.exportAsset(pic, ['学园', '插画', '第 1 轮 放学']), '/user/images/FlowGal-学园/插画 第 1 轮 放学.png')
  assert.equal(await store.exportAsset(pic, ['学园', '插画', '第 1 轮 放学']), '/user/images/FlowGal-学园/插画 第 1 轮 放学 (2).png')
})

test('gate: 酒馆版大模型——走连接配置流式、累计全文换成增量、带上温度；没有连接配置时退回 generateRaw；出错变成 finish', async () => {
  const { ctx, requests } = fakeContext({ reply: () => '{"scene":{}}' })
  const llm = createStLlm({ getContext: () => ctx })
  assert.deepEqual(llm.listProviders().map(p => p.id), ['p1'], '「跟着酒馆当前的连接」是设置里的默认项，这里不重复列')
  assert.deepEqual(await llm.listModels('current'), [{ id: 'deepseek-chat', name: 'deepseek-chat' }])
  assert.deepEqual(await llm.resolveModelInfo(), { context: { contextWindow: 16384 } })
  assert.deepEqual(llm.current(), { provider: 'current', model: 'deepseek-chat' })
  const events = []
  for await (const e of llm.stream({ provider: 'current', system: '你是导演', temperature: 0.5, maxTokens: 900, messages: [{ role: 'user', content: [{ type: 'text', text: '第一轮' }] }] })) events.push(e)
  assert.deepEqual(events.filter(e => e.type === 'text-delta').map(e => e.text).join(''), '{"scene":{}}')
  assert.equal(events.filter(e => e.type === 'reasoning-delta').map(e => e.text).join(''), '想一想')
  assert.deepEqual(events.at(-1), { type: 'finish', reason: { kind: 'stop' } })
  assert.equal(requests[0].id, 'p1')
  assert.deepEqual(requests[0].messages, [{ role: 'system', content: '你是导演' }, { role: 'user', content: '第一轮' }])
  assert.deepEqual(requests[0].override, { temperature: 0.5 })
  assert.equal(requests[0].custom.stream, true)
  // 没有选连接配置：generateRaw
  const plain = fakeContext({ reply: () => '原样', selected: '' })
  const out = []
  for await (const e of createStLlm({ getContext: () => plain.ctx }).stream({ provider: 'current', system: 's', maxTokens: 10, messages: [{ role: 'user', content: 'u' }] })) out.push(e)
  assert.equal(out[0].text, '原样')
  assert.equal(plain.requests[0].raw, true)
  // 出错
  ctx.ConnectionManagerRequestService.sendRequest = async () => { throw new Error('API request failed', { cause: new Error('401') }) }
  const failed = []
  for await (const e of llm.stream({ provider: 'p1', system: 's', maxTokens: 10, messages: [] })) failed.push(e)
  assert.equal(failed.at(-1).reason.kind, 'error')
  assert.match(failed.at(-1).reason.failure.message, /API request failed：401/)
})

test('gate: 酒馆版楼层——轮次号写进楼层、删掉前面的不错位；换回复、编辑是新版本；角色卡带世界书；卡片挂上、更新、只认当前版本', async () => {
  const server = fakeServer()
  const { ctx } = fakeContext()
  const store = createStStore({ fetchImpl: server.fetchImpl })
  const tavern = createStTavern({ getContext: () => ctx, store, llm: createStLlm({ getContext: () => ctx }) })
  assert.equal(tavern.currentGameId(), 'linlan.png/林岚 - 1')
  tavern.ensureTurns()
  assert.deepEqual(ctx.chat.map(m => m.extra?.[TURN_FIELD]), [1, undefined, 2])
  const t2 = await tavern.getTurn({ gameId: 'linlan.png/林岚 - 1', turn: 2 })
  assert.equal(t2.text, '“那就罚你听我弹完这一首。”林岚说。')
  assert.deepEqual(t2.card, { id: 'linlan.png', name: '林岚' })
  // 删掉开头两层：第 2 轮还是第 2 轮
  ctx.chat.splice(0, 2)
  assert.equal((await tavern.getTurn({ gameId: 'linlan.png/林岚 - 1', turn: 2 })).textVersion, t2.textVersion)
  ctx.chat.push({ name: '林岚', is_user: false, mes: '新的一轮。', swipe_id: 0 })
  tavern.ensureTurns()
  assert.equal(ctx.chat.at(-1).extra[TURN_FIELD], 3, '接在最大号后面')
  // 换回复、编辑：版本变
  ctx.chat[0].swipe_id = 1
  const swiped = await tavern.getTurn({ gameId: 'linlan.png/林岚 - 1', turn: 2 })
  assert.notEqual(swiped.textVersion, t2.textVersion)
  ctx.chat[0].mes = '改过的。'
  assert.notEqual((await tavern.getTurn({ gameId: 'linlan.png/林岚 - 1', turn: 2 })).textVersion, swiped.textVersion)
  assert.equal(await tavern.getTurn({ gameId: '别的聊天', turn: 2 }), null)
  // 角色卡 + 世界书
  const card = await tavern.getCardContext({ gameId: 'linlan.png/林岚 - 1' })
  assert.equal(card.description, '高三学姐，钢琴社社长。')
  assert.match(card.lore[0].content, /琴房在旧校舍三楼/)
  // 卡片
  const changed = []
  tavern.onItemsChanged(g => changed.push(g))
  const v = (await tavern.getTurn({ gameId: 'linlan.png/林岚 - 1', turn: 2 })).textVersion
  const { id } = await tavern.attach({ gameId: 'linlan.png/林岚 - 1', turn: 2, textVersion: v, item: { kind: 'flowgal/scene', status: 'pending', data: { turn: 2 } } })
  await tavern.update(id, { status: 'ready', data: { turn: 2, summary: '罚听琴' } })
  let items = await tavern.list({ gameId: 'linlan.png/林岚 - 1' })
  assert.deepEqual(items.map(i => [i.status, i.data.summary, i.current]), [['ready', '罚听琴', true]])
  ctx.chat[0].mes = '又改了。'
  items = await tavern.list({ gameId: 'linlan.png/林岚 - 1' })
  assert.equal(items[0].current, false, '正文改了，旧版本的卡片不是当前的')
  assert.equal(await tavern.remove(id), true)
  assert.deepEqual(await tavern.list({ gameId: 'linlan.png/林岚 - 1' }), [])
  assert.equal(changed.length, 3)
})

test('gate: 装起来以后——酒馆写完一轮（MESSAGE_RECEIVED）→ 导演用连接配置整理 → 楼层挂上已整理的场景卡，接口表同页可调', async () => {
  const server = fakeServer()
  const reply = ({ system }) => (system.includes('导演')
    ? JSON.stringify({ scene: { location: '琴房', time: 'afternoon' }, cast: [{ name: '林岚', pos: 'center' }], lines: [], choices: [], images: [], people: [] })
    : '{}')
  const { ctx, requests } = fakeContext({ reply })
  const host = createStHost({ getContext: () => ctx, fetchImpl: server.fetchImpl, logger: { warn() {}, info() {} } })
  try {
    await host.api.call('POST', '/config', { patch: { images: { auto: false, backgrounds: false, portraits: false, expressions: false } } })
    // 酒馆：AI 楼层写完
    ctx.eventSource.emit('message_received', 2, 'normal')
    const gameId = 'linlan.png/林岚 - 1'
    let view
    for (let i = 0; i < 100; i++) {
      view = (await host.api.call('GET', '/game?gameId=' + encodeURIComponent(gameId))).view
      if (Object.values(view.scenes || {}).length || (view.turns || []).some?.(t => t.status === 'ready')) break
      await new Promise(r => setTimeout(r, 20))
    }
    const items = await host.tavern.list({ gameId })
    assert.equal(items.length, 1, '挂了一张场景卡')
    for (let i = 0; i < 100 && items[0].status !== 'ready'; i++) {
      await new Promise(r => setTimeout(r, 20))
      items.splice(0, 1, ...(await host.tavern.list({ gameId })))
    }
    assert.equal(items[0].kind, 'flowgal/scene')
    assert.equal(items[0].status, 'ready')
    assert.equal(items[0].data.location, '琴房')
    assert.ok(requests.some(r => r.id === 'p1' && r.custom.stream), '导演走了连接配置的流式')
    // 用户楼层、扮演不算一轮
    ctx.eventSource.emit('message_received', 1, 'normal')
    ctx.eventSource.emit('message_received', 2, 'impersonate')
    await new Promise(r => setTimeout(r, 30))
    assert.equal((await host.tavern.list({ gameId })).length, 1)
    await assert.rejects(host.api.call('GET', '/nope'), /没有这个接口/)
  } finally { host.dispose() }
})

test('gate: 酒馆版出图请求——NovelAI 官方、同源、上传文件直连；本机 ComfyUI 这类走酒馆转发；转发关着就都直连', async () => {
  const seen = []
  const make = proxyOn => createNetFetch({
    origin: 'http://localhost:8000',
    fetchImpl: async (url, init = {}) => {
      if (String(url).startsWith('/proxy/https://flowgal-cors-probe.invalid')) return proxyOn ? new Response('boom', { status: 500 }) : new Response('CORS proxy is disabled. Enable it in config.yaml', { status: 404 })
      seen.push(String(url))
      return new Response('ok')
    },
  })
  const on = make(true)
  await on('https://image.novelai.net/ai/generate-image', { method: 'POST', body: '{}' })
  await on('http://127.0.0.1:8188/prompt', { method: 'POST', body: '{}' })
  await on('http://127.0.0.1:8188/upload/image', { method: 'POST', body: new Blob(['x']) })
  await on('/user/files/flowgal-config.json')
  assert.deepEqual(seen, ['https://image.novelai.net/ai/generate-image', '/proxy/http://127.0.0.1:8188/prompt', 'http://127.0.0.1:8188/upload/image', '/user/files/flowgal-config.json'])
  seen.length = 0
  await make(false)('http://127.0.0.1:8188/prompt', { method: 'POST', body: '{}' })
  assert.deepEqual(seen, ['http://127.0.0.1:8188/prompt'], '转发关着：直连（ComfyUI 要自己开跨域）')
})

test('gate: 酒馆版认脸模型——下到浏览器缓存、核对 SHA-256、按官方地址存（镜像下的也是）；界面从缓存拿字节和 blob 地址；transformers.js 改读这份缓存', async () => {
  const sha = b => createHash('sha256').update(b).digest('hex')
  const model = new TextEncoder().encode('fake onnx model bytes')
  const glue = new TextEncoder().encode('export default 1')
  const FILES = [
    { id: 'face', pack: 'p', hf: ['org/repo', 'r1', 'face/model.onnx'], local: 'org/face.onnx', size: model.length, sha256: sha(model), threshold: 0.3 },
    { id: 'ort', pack: 'p', npm: ['onnxruntime-web', '1.20.1', 'dist/ort.mjs'], local: 'ort-dir/ort.mjs', size: glue.length, sha256: sha(glue) },
  ]
  const store = new Map()
  const cache = { match: async k => (store.has(k) ? store.get(k).clone() : undefined), put: async (k, r) => { store.set(k, r) }, delete: async k => store.delete(k) }
  const caches = { open: async () => cache }
  const asked = []
  const fetchImpl = async url => {
    asked.push(url)
    if (url.startsWith('https://huggingface.co/')) throw new TypeError('Failed to fetch')
    return new Response(url.includes('model.onnx') ? model : glue)
  }
  const vision = createBrowserVision({ caches, fetchImpl, files: FILES, packs: { p: { label: '测试' } }, settings: async () => ({ source: 'auto' }) })
  assert.equal((await vision.status()).packs.p.ready, false)
  await vision.download('p')
  let s
  for (let i = 0; i < 100; i++) { s = await vision.status(); if (s.job.state !== 'running') break; await new Promise(r => setTimeout(r, 5)) }
  assert.equal(s.job.state, 'done', s.job.error)
  assert.equal(s.packs.p.ready, true)
  assert.equal(s.root, '浏览器缓存（Cache Storage）')
  assert.ok(asked.some(u => u.startsWith('https://hf-mirror.com/')), '官网不通换镜像')
  assert.ok(store.has('https://huggingface.co/org/repo/resolve/r1/face/model.onnx'), '镜像下的也记在官方地址下')
  assert.equal(cacheKey(FILES[1]), 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.20.1/dist/ort.mjs')
  assert.deepEqual(new Uint8Array(await vision.loader.bytes('org/face.onnx')), model)
  const env = { backends: { onnx: { wasm: {} } } }
  const { revision } = await vision.loader.florence({ env })
  assert.equal(env.useCustomCache, true)
  assert.equal(env.customCache, cache)
  assert.equal(env.allowLocalModels, false)
  assert.equal(typeof revision, 'string')
  // 校验不对：不进缓存
  const bad = createBrowserVision({ caches: { open: async () => ({ ...cache, match: async () => undefined }) }, fetchImpl: async () => new Response(new Uint8Array(model.length)), files: [FILES[0]], packs: { p: { label: '测试' } }, settings: async () => ({ source: 'official' }) })
  await bad.download('p')
  for (let i = 0; i < 100; i++) { s = await bad.status(); if (s.job.state !== 'running') break; await new Promise(r => setTimeout(r, 5)) }
  assert.equal(s.job.state, 'failed')
  assert.match(s.job.error, /校验不对/)
  await vision.remove('p')
  assert.equal((await vision.status()).packs.p.ready, false)
})
