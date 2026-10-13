// 插画分镜师单独接的模型：OpenAI 兼容接口的流式解析、报错、模型列表、设置校验，以及引擎里导演走宿主、分镜师走自定义接口。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createChatLlm, chatModels } from '../lib/chat-llm.js'
import { callModel, retryMaxTokens } from '../lib/director.js'
import { resolveConfig } from '../lib/config.js'
import { createStore } from '../lib/dsh/store.js'
import { createEngine, KIND_CG } from '../lib/engine.js'
import { roleText, rulesText, userText } from './roles.mjs'

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')

/** 按给定的几段字节流式回 SSE（故意从一行中间切开）。 */
const sse = parts => new Response(new ReadableStream({
  start(controller) { for (const p of parts) controller.enqueue(new TextEncoder().encode(p)); controller.close() },
}), { status: 200, headers: { 'content-type': 'text/event-stream' } })
const chunk = obj => `data: ${JSON.stringify(obj)}\n\n`
const collect = async stream => { const out = []; for await (const e of stream) out.push(e); return out }

test('自定义接口：流式解析正文、思考和用量，请求带系统提示词、最大输出和 Key', async () => {
  const requests = []
  const fetchImpl = async (url, init) => {
    requests.push({ url, init, body: JSON.parse(init.body) })
    const all = chunk({ choices: [{ delta: { reasoning_content: '先想想' } }] }) + chunk({ choices: [{ delta: { content: '{"ima' } }] }) + chunk({ choices: [{ delta: { content: 'ges":[]}' } }] })
      + ': keep-alive\n\n' + chunk({ choices: [], usage: { prompt_tokens: 120, completion_tokens: 30, total_tokens: 150 } }) + 'data: [DONE]\n\n'
    return sse([all.slice(0, 37), all.slice(37, 90), all.slice(90)])
  }
  const llm = createChatLlm({ baseURL: 'https://api.example.com/v1/', key: 'sk-test', contextWindow: 64000, fetchImpl })
  const events = await collect(llm.stream({ model: 'm-1', system: '系统', temperature: 0.7, maxTokens: 8000, messages: [{ role: 'user', content: [{ type: 'text', text: '你好' }] }] }))
  assert.deepEqual(events.filter(e => e.type === 'reasoning-delta').map(e => e.text), ['先想想'])
  assert.equal(events.filter(e => e.type === 'text-delta').map(e => e.text).join(''), '{"images":[]}')
  assert.deepEqual(events.find(e => e.type === 'usage').usage, { inputTokens: 120, outputTokens: 30, totalTokens: 150 })
  assert.deepEqual(events.at(-1), { type: 'finish', reason: { kind: 'stop' } })
  assert.equal(requests[0].url, 'https://api.example.com/v1/chat/completions')
  assert.equal(requests[0].init.headers.authorization, 'Bearer sk-test')
  assert.deepEqual(requests[0].body, { model: 'm-1', stream: true, max_tokens: 8000, temperature: 0.7, messages: [{ role: 'system', content: '系统' }, { role: 'user', content: '你好' }] })
  assert.deepEqual(await llm.resolveModelInfo(), { context: { contextWindow: 64000 } })
  // 地址写到 /chat/completions 也认
  await collect(createChatLlm({ baseURL: 'https://api.example.com/v1/chat/completions', fetchImpl }).stream({ model: 'm', messages: [] }))
  assert.equal(requests[1].url, 'https://api.example.com/v1/chat/completions')
  assert.equal(requests[1].init.headers.authorization, undefined, '没填 Key 就不带')
})

test('自定义接口：不流式的中转回整个 JSON 也能用', async () => {
  const fetchImpl = async () => new Response(JSON.stringify({ choices: [{ message: { content: '{"images":[]}', reasoning_content: '想过了' } }], usage: { prompt_tokens: 5, completion_tokens: 6 } }), { headers: { 'content-type': 'application/json' } })
  const result = await callModel(createChatLlm({ baseURL: 'http://127.0.0.1:1234/v1', fetchImpl }), { provider: 'custom', model: 'local', system: 's', user: 'u' })
  assert.equal(result.text, '{"images":[]}')
  assert.equal(result.reasoning, '想过了')
  assert.deepEqual(result.usage, { inputTokens: 5, outputTokens: 6 })
})

test('自定义接口：报错原样带出来，拒绝最大输出时能读出上限重试', async () => {
  const fetchImpl = async () => new Response(JSON.stringify({ error: { message: 'Invalid max_tokens value, the valid range of max_tokens is [1, 8192]', type: 'invalid_request_error' } }), { status: 400 })
  const llm = createChatLlm({ baseURL: 'https://api.example.com', fetchImpl })
  const error = await callModel(llm, { provider: 'custom', model: 'm', system: 's', user: 'u', maxTokens: 128000 }).catch(e => e)
  assert.match(error.message, /^HTTP 400：Invalid max_tokens value/)
  assert.equal(retryMaxTokens(error, 128000, null), 8192)
  // 流里中途报错
  const midway = async () => sse([chunk({ error: { message: 'content filtered', code: 'filtered' } })])
  const failed = await callModel(createChatLlm({ baseURL: 'https://api.example.com', fetchImpl: midway }), { provider: 'custom', model: 'm', system: 's', user: 'u' }).catch(e => e)
  assert.equal(failed.message, 'content filtered')
  assert.equal(failed.code, 'filtered')
  // 没填地址
  const empty = await callModel(createChatLlm({ baseURL: '' }), { provider: 'custom', model: 'm', system: 's', user: 'u' }).catch(e => e)
  assert.match(empty.message, /还没填自定义接口的地址/)
})

test('自定义接口：模型列表（OpenAI、OpenRouter 的样子都认）', async () => {
  const seen = []
  const fetchImpl = async (url, init) => {
    seen.push({ url, auth: init.headers.authorization })
    return new Response(JSON.stringify({ data: [{ id: 'z-model' }, { id: 'a/model', name: 'A Model', context_length: 200000 }] }))
  }
  const models = await chatModels({ baseURL: 'https://openrouter.ai/api/v1', key: 'k', fetchImpl })
  assert.deepEqual(models, [{ id: 'a/model', name: 'A Model（a/model）', window: 200000 }, { id: 'z-model', name: 'z-model', window: 0 }])
  assert.deepEqual(seen, [{ url: 'https://openrouter.ai/api/v1/models', auth: 'Bearer k' }])
  await assert.rejects(chatModels({ baseURL: 'https://x.test', fetchImpl: async () => new Response('nope', { status: 401 }) }), /HTTP 401：nope/)
})

test('设置：插画分镜师的模型只收认得的来源和 http(s) 地址', () => {
  assert.deepEqual(resolveConfig({}).director.cgLlm, { source: '', provider: '', model: '', baseURL: '', contextWindow: 128000 })
  const bad = resolveConfig({ director: { cgLlm: { source: 'evil', baseURL: 'file:///etc/passwd', model: ' m ', contextWindow: -5 } } }).director.cgLlm
  assert.deepEqual(bad, { source: '', provider: '', model: 'm', baseURL: '', contextWindow: 0 })
  assert.deepEqual(resolveConfig({ director: { cgLlm: 'custom' } }).director.cgLlm, resolveConfig({}).director.cgLlm)
  assert.equal(resolveConfig({ director: { cgLlm: { source: 'custom', baseURL: 'https://api.deepseek.com/v1' } } }).director.cgLlm.baseURL, 'https://api.deepseek.com/v1')
})

function fakeTavern() {
  const items = new Map()
  let seq = 0
  return {
    apiVersion: 1, items,
    async attach({ gameId, turn, textVersion, item }) { const id = 'm' + ++seq; items.set(id, { id, gameId, turn, textVersion, ...item, current: true }); return { id } },
    async update(id, changes) { const item = items.get(id); Object.assign(item, changes); return item },
    async remove(id) { return items.delete(id) },
    async list({ gameId }) { return [...items.values()].filter(i => i.gameId === gameId) },
    async getTurn() { return null },
    async getCardContext() { return { description: '林岚：黑长直的学姐。', personality: '', scenario: '', lore: [] } },
    async backgroundModel() { return { provider: 'host', model: 'host-1' } },
  }
}

const DIRECTOR_REPLY = JSON.stringify({
  scene: { location: '卧室', time: 'night', mood: 'sweet', bg: 'bedroom, night, scenery, no humans' },
  cast: [{ name: '林岚', pos: 'center' }],
  lines: [{ u: 'U2', sp: '林岚', emo: 'shy' }],
  images: [{ after: 'U2', title: '夜里', moment: '林岚在床边回头', who: ['林岚'] }],
  people: [{ name: '林岚', gender: 'female', appearance: '1girl, long black hair, blue eyes', outfit: '睡衣', outfitTags: 'white nightgown' }],
})

async function settle(engine, gameId, done, ms = 8000) {
  const end = Date.now() + ms
  for (;;) {
    const view = await engine.gameView(gameId)
    if (done(view)) return view
    if (Date.now() > end) throw new Error('等出图超时：' + JSON.stringify(view.images.map(i => [i.status, i.error])))
    await new Promise(r => setTimeout(r, 20))
  }
}

test('gate: 导演用宿主的模型，插画分镜师走自己接的接口；Key 不出宿主', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'flowgal-cgllm-'))
  try {
    const store = createStore(dir)
    const tavern = fakeTavern()
    const hostCalls = []
    const llm = { stream(request) { hostCalls.push(request); return (async function* () { yield { type: 'text-delta', text: DIRECTOR_REPLY }; yield { type: 'finish', reason: { kind: 'stop' } } })() } }
    const chats = [], images = []
    const fetchImpl = async (url, init) => {
      url = String(url)
      if (url.endsWith('/chat/completions')) {
        const body = JSON.parse(init.body)
        chats.push({ url, auth: init.headers.authorization, body })
        const ids = [...body.messages.at(-1).content.matchAll(/^- (c\d+)：/gm)].map(m => m[1])
        const reply = JSON.stringify({ images: ids.map(key => ({ key, size: 'portrait', tag: 'nsfw, bedroom, night, bed, dim lighting', nl: 'A dim bedroom at night.', characters: [{ name: '林岚', tag: 'girl, white nightgown, looking back, blush', nl: 'She glances back over her shoulder.' }] })) })
        return sse([chunk({ choices: [{ delta: { content: reply.slice(0, 40) } }] }), chunk({ choices: [{ delta: { content: reply.slice(40) } }] }) + 'data: [DONE]\n\n'])
      }
      images.push({ url, body: init?.body ? JSON.parse(init.body) : null })
      return new Response(PNG, { status: 200, headers: { 'content-type': 'image/png' } })
    }
    const engine = createEngine({ store, services: { tavern, llm, credentials: null }, fetchImpl, logger: { warn() {}, info() {} } })
    await engine.patchConfig({ images: { backgrounds: false, portraits: false, expressions: false }, director: { cgLlm: { source: 'custom', baseURL: 'https://cg.example.com/v1', model: 'cg-model', contextWindow: 32000 } } })
    await engine.setSecret('novelai', 'official', 'pst-test-key')
    const config = await engine.setSecret('cgllm', '', 'sk-cg-secret')
    assert.equal(config.keys.cgllm, true)
    assert.equal(JSON.stringify(config).includes('sk-cg-secret'), false, '密钥不出宿主')

    await engine.onTurnSettled({ gameId: 'g', turn: 2, textVersion: 'v1', text: '夜深了。\n“别看。”林岚回过头。', card: { id: 'c', name: '学园' } })
    const view = await settle(engine, 'g', v => v.images[0]?.status === 'ready')
    // 导演走宿主；宿主一次插画分镜都没被叫到
    assert.equal(hostCalls.length, 1)
    assert.equal(hostCalls.some(c => roleText(c).includes('你是视觉小说的插画分镜师')), false)
    // 分镜师走自定义接口：带着 Key、选的模型，最大输出按填的窗口收过
    assert.equal(chats.length, 1)
    assert.equal(chats[0].url, 'https://cg.example.com/v1/chat/completions')
    assert.equal(chats[0].auth, 'Bearer sk-cg-secret')
    assert.equal(chats[0].body.model, 'cg-model')
    assert.match(chats[0].body.messages.map(m => m.content).join('\n'), /你是视觉小说的插画分镜师/)
    assert.ok(chats[0].body.max_tokens < 32000, '最大输出按填的窗口收过')
    assert.equal(view.images[0].writer, 'ai')
    const caption = images.find(r => r.body?.parameters?.v4_prompt)?.body.parameters.v4_prompt.caption
    assert.match(caption.base_caption, /nsfw, bedroom, night/)
    assert.match(caption.char_captions[0].char_caption, /white nightgown, looking back/)
    assert.equal(images.some(r => JSON.stringify(r.body || {}).includes('sk-cg-secret')), false, '分镜师的 Key 只发给它自己的接口')
    assert.ok([...tavern.items.values()].some(i => i.kind === KIND_CG && i.status === 'ready'))
    const log = await engine.directorLog('g')
    const cg = log.entries.find(e => e.kind === 'cg')
    assert.equal(cg.status, 'ok')
    assert.equal(cg.source, 'custom')
    assert.equal(cg.model, 'cg-model')
    assert.equal(cg.window, 32000)

    // 没填模型：分镜师那一步报出原因，按档案拼一份照样出图
    await engine.patchConfig({ director: { cgLlm: { model: '' } } })
    const added = await engine.addImageAt('g', 2, 'U1', {})
    const after = await settle(engine, 'g', v => v.images.find(i => i.id === added)?.status === 'ready')
    assert.equal(after.images.find(i => i.id === added).writer, 'fallback')
    assert.equal(chats.length, 1)
    const failed = (await engine.directorLog('g')).entries.find(e => e.kind === 'cg' && e.status !== 'ok')
    assert.match(failed.error, /自定义接口还没填模型/)

    // 在宿主的模型里另选一个：分镜师走宿主，但用的是单独选的那个
    await engine.patchConfig({ director: { cgLlm: { source: 'host', provider: 'other', model: 'o-1' } } })
    await engine.rewritePrompt('g', view.images[0].id, '改成雨夜').catch(() => {})
    const cgCall = hostCalls.find(c => roleText(c).includes('你是视觉小说的插画分镜师'))
    assert.deepEqual([cgCall.provider, cgCall.model], ['other', 'o-1'])
    assert.deepEqual([hostCalls[0].provider, hostCalls[0].model], ['host', 'host-1'], '导演还是跟着 Tavern')
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})
