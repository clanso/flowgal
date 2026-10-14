// 流式开关：自定义接口（导演 / 插画分镜师 / 听音师）和酒馆的连接配置能选不流式；DSH 的模型服务只走流式。
// 导演也能自己接一个 OpenAI 兼容接口（立绘设计师跟着用），这样 DSH 上也能不流式。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createChatLlm } from '../lib/chat-llm.js'
import { callModel } from '../lib/director.js'
import { resolveConfig } from '../lib/config.js'
import { createStore } from '../lib/dsh/store.js'
import { createEngine } from '../lib/engine.js'
import { createStLlm } from '../st/llm.js'
import { roleText } from './roles.mjs'

const json = obj => new Response(JSON.stringify(obj), { headers: { 'content-type': 'application/json' } })

test('自定义接口：关掉流式时请求带 stream: false，整段 JSON 照样解析；Node 里换不限时的连接池', async () => {
  const seen = []
  const fetchImpl = async (url, init) => {
    seen.push({ body: JSON.parse(init.body), dispatcher: init.dispatcher })
    return json({ choices: [{ message: { content: '{"ok":true}', reasoning_content: '想好了' } }], usage: { prompt_tokens: 9, completion_tokens: 4 } })
  }
  const off = createChatLlm({ baseURL: 'https://relay.example.com/v1', stream: false, fetchImpl })
  assert.equal(off.streaming, false)
  const result = await callModel(off, { provider: 'custom', model: 'm', system: 's', user: 'u' })
  assert.equal(result.text, '{"ok":true}')
  assert.equal(result.reasoning, '想好了')
  assert.deepEqual(result.usage, { inputTokens: 9, outputTokens: 4 })
  assert.equal(seen[0].body.stream, false)
  assert.equal(typeof seen[0].dispatcher?.dispatch, 'function', 'Node 自带的 fetch 等响应头最多 5 分钟：不流式时换一个不限时的')
  // 同一个全局连接池只建一次
  await callModel(off, { provider: 'custom', model: 'm', system: 's', user: 'u' })
  assert.equal(seen[1].dispatcher, seen[0].dispatcher)
  // 默认流式，跟以前一样，不带连接池
  const on = createChatLlm({ baseURL: 'https://relay.example.com/v1', fetchImpl })
  assert.equal(on.streaming, true)
  await callModel(on, { provider: 'custom', model: 'm', system: 's', user: 'u' })
  assert.equal(seen[2].body.stream, true)
  assert.equal('dispatcher' in seen[2], true)
  assert.equal(seen[2].dispatcher, undefined)
})

test('酒馆宿主：连接配置按开关流式或整段一次拿回', async () => {
  const sent = []
  const ctx = {
    extensionSettings: { connectionManager: { selectedProfile: 'p1' } },
    ConnectionManagerRequestService: {
      getSupportedProfiles: () => [{ id: 'p1', name: '主连接', model: 'm1' }],
      async sendRequest(id, chat, maxTokens, custom) {
        sent.push(custom)
        if (custom.stream) return async function* () { yield { text: '{"a"' }; yield { text: '{"a":1}' } }
        return { content: '{"a":1}', reasoning: '整段' }
      },
    },
  }
  const llm = createStLlm({ getContext: () => ctx })
  assert.equal(llm.streamSwitch, true, '告诉引擎这个宿主认流式开关')
  const streamed = await callModel(llm, { provider: 'current', model: 'm1', system: 's', user: 'u' })
  assert.equal(streamed.text, '{"a":1}')
  assert.equal(sent[0].stream, true, '默认流式')
  const whole = await callModel({ ...llm, stream: request => llm.stream({ ...request, stream: false }) }, { provider: 'current', model: 'm1', system: 's', user: 'u' })
  assert.equal(whole.text, '{"a":1}')
  assert.equal(whole.reasoning, '整段')
  assert.equal(sent[1].stream, false)
})

test('设置：导演的模型来源、自定义接口和流式开关都校验过；默认流式', () => {
  const d = resolveConfig({}).director
  assert.deepEqual([d.source, d.provider, d.model, d.baseURL, d.contextWindow, d.stream], ['', '', '', '', 128000, true])
  assert.equal(resolveConfig({}).director.cgLlm.stream, true)
  assert.equal(resolveConfig({}).director.listenLlm.stream, true)
  const bad = resolveConfig({ director: { source: 'host', baseURL: 'javascript:alert(1)', model: ' m ', contextWindow: 'x', stream: 'no' } }).director
  assert.deepEqual([bad.source, bad.baseURL, bad.model, bad.contextWindow, bad.stream], ['', '', 'm', 128000, true], '只认 false 是关')
  const off = resolveConfig({ director: { source: 'custom', baseURL: 'https://relay.example.com/v1', stream: false, cgLlm: { stream: false } } }).director
  assert.deepEqual([off.source, off.baseURL, off.stream, off.cgLlm.stream, off.listenLlm.stream], ['custom', 'https://relay.example.com/v1', false, false, true])
})

function fakeTavern() {
  return {
    apiVersion: 1, async attach() { return { id: 'm1' } }, async update() {}, async remove() {}, async list() { return [] },
    async getTurn({ turn }) { return turn === TURN.turn ? TURN : null }, async getCardContext() { return null }, async backgroundModel() { return { provider: 'host', model: 'host-1' } },
  }
}
const DIRECTOR_REPLY = JSON.stringify({
  scene: { location: '卧室', time: 'night', mood: 'sweet', bg: 'bedroom, night, scenery, no humans' },
  cast: [{ name: '林岚', pos: 'center' }],
  lines: [{ u: 'U2', sp: '林岚', emo: 'shy' }],
  people: [{ name: '林岚', gender: 'female', appearance: '1girl, long black hair, blue eyes', outfit: '睡衣', outfitTags: 'white nightgown' }],
})
const TURN = { gameId: 'g', turn: 1, textVersion: 'v1', text: '夜深了。\n“别看。”林岚回过头。', card: { id: 'c', name: '学园' } }
const hostLlm = extra => {
  const calls = []
  return { calls, ...extra, stream(request) { calls.push(request); return (async function* () { yield { type: 'text-delta', text: DIRECTOR_REPLY }; yield { type: 'finish', reason: { kind: 'stop' } } })() } }
}
async function directed(engine) {
  await engine.onTurnSettled(TURN)
  for (let i = 0; i < 300 && !(await engine.directorLog('g')).entries.length; i++) await new Promise(r => setTimeout(r, 20))
  return (await engine.directorLog('g')).entries[0]
}
const quiet = { images: { auto: false, backgrounds: false, portraits: false, expressions: false } }

test('gate: DSH 的模型服务只走流式：关了开关也不给它传 stream，日志照实记流式；设置页知道这个开关在这儿不管用', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'flowgal-stream-dsh-'))
  try {
    const llm = hostLlm()
    const engine = createEngine({ store: createStore(dir), services: { tavern: fakeTavern(), llm }, logger: { warn() {}, info() {} } })
    const config = await engine.patchConfig({ ...quiet, director: { stream: false } })
    assert.equal(config.hostStreamSwitch, false)
    assert.equal(config.config.director.stream, false, '开关照样存着（换到自定义接口时就管用）')
    const entry = await directed(engine)
    assert.equal(entry.status, 'ok')
    assert.equal(llm.calls.length, 1)
    assert.equal('stream' in llm.calls[0], false, 'DSH 的接口没有这一项，不传')
    assert.equal(entry.stream, true)
    engine.dispose()
  } finally {
    await rm(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 })
  }
})

test('gate: 酒馆宿主认开关：关了流式，导演那次调用带 stream: false，日志记不流式', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'flowgal-stream-st-'))
  try {
    const llm = hostLlm({ streamSwitch: true })
    const engine = createEngine({ store: createStore(dir), services: { tavern: fakeTavern(), llm }, logger: { warn() {}, info() {} } })
    const config = await engine.patchConfig({ ...quiet, director: { stream: false } })
    assert.equal(config.hostStreamSwitch, true)
    const entry = await directed(engine)
    assert.equal(entry.status, 'ok')
    assert.equal(llm.calls[0].stream, false)
    assert.equal(entry.stream, false)
    // 打开就跟以前一样：不传
    await engine.patchConfig({ director: { stream: true } })
    await engine.directTurn({ gameId: 'g', turn: 1, force: true })
    assert.equal(llm.calls.length, 2)
    assert.equal('stream' in llm.calls[1], false)
    assert.equal((await engine.directorLog('g')).entries[0].stream, true, '最新一条在最前')
    engine.dispose()
  } finally {
    await rm(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 })
  }
})

test('gate: 导演自己接接口、不流式：导演和跟着导演的插画分镜师都走它，带导演的 Key；宿主一次没叫；Key 不出宿主', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'flowgal-stream-custom-'))
  try {
    const llm = hostLlm()
    const chats = []
    const fetchImpl = async (url, init) => {
      url = String(url)
      if (url.endsWith('/models')) return json({ data: [{ id: 'claude-x', context_length: 200000 }] })
      const body = JSON.parse(init.body)
      chats.push({ url, auth: init.headers.authorization, body, dispatcher: init.dispatcher })
      const request = { system: body.messages[0].role === 'system' ? body.messages[0].content : '', messages: [{ content: [{ text: body.messages.at(-1).content }] }] }
      const reply = roleText(request).includes('插画分镜师') ? JSON.stringify({ images: [] }) : DIRECTOR_REPLY
      return json({ choices: [{ message: { content: reply } }], usage: { prompt_tokens: 3, completion_tokens: 2 } })
    }
    const engine = createEngine({ store: createStore(dir), services: { tavern: fakeTavern(), llm }, fetchImpl, logger: { warn() {}, info() {} } })
    await engine.patchConfig({ ...quiet, director: { source: 'custom', baseURL: 'https://relay.example.com/v1', model: 'claude-x', contextWindow: 200000, stream: false } })
    const config = await engine.setSecret('directorllm', '', 'sk-director')
    assert.equal(config.keys.directorllm, true)
    assert.equal(JSON.stringify(config).includes('sk-director'), false, 'Key 不出宿主')
    assert.deepEqual((await engine.ownModels('director')).models.map(m => m.id), ['claude-x'])

    const entry = await directed(engine)
    assert.equal(entry.status, 'ok')
    assert.equal(llm.calls.length, 0, '宿主一次没叫')
    assert.equal(chats.length, 1)
    assert.equal(chats[0].url, 'https://relay.example.com/v1/chat/completions')
    assert.equal(chats[0].auth, 'Bearer sk-director')
    assert.equal(chats[0].body.model, 'claude-x')
    assert.equal(chats[0].body.stream, false)
    assert.equal(entry.source, 'directorCustom')
    assert.equal(entry.stream, false)
    assert.equal(entry.window, 200000, '按填的窗口裁')

    // 立绘设计师、插画分镜师（跟导演一样时）也走导演的接口：预览里看得到，预览不发
    for (const role of ['cg', 'sprite']) {
      const preview = await engine.previewPrompt('g', role, { name: '林岚' })
      assert.deepEqual([preview.provider, preview.model], ['custom', 'claude-x'], role)
    }
    assert.equal(chats.length, 1, '预览不发')
    // 插画分镜师单独接了自己的接口：照它自己的开关（默认流式）
    await engine.patchConfig({ director: { cgLlm: { source: 'custom', baseURL: 'https://cg.example.com/v1', model: 'cg-1' } } })
    const cfg = (await engine.publicConfig()).config.director
    assert.deepEqual([cfg.stream, cfg.cgLlm.stream], [false, true])

    // 没填模型：说清楚是导演的自定义接口没填
    await engine.patchConfig({ director: { model: '' } })
    await assert.rejects(engine.directTurn({ gameId: 'g', turn: 1, force: true }), /导演的自定义接口还没填模型/)
    assert.equal(chats.length, 1)
    engine.dispose()
  } finally {
    await rm(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 })
  }
})
