// 插件自己接的大模型：OpenAI 兼容的 /chat/completions（DeepSeek、OpenRouter、各家中转、本机的 LM Studio / Ollama 都是这个格式）。
// 导演、插画分镜师、听音师都可以不用 Tavern 的后台模型，单独接一个。吐出来的事件和宿主的 llm.stream 一样（text-delta / reasoning-delta / usage / finish），
// 所以 callModel、runWriter 那套裁剧情、降最大输出、重试的流程不用改。Key 只在宿主侧用，浏览器拿不到。
// 流式还是不流式按设置（stream）：不流式时接口整段写完才回一个 JSON，解析跟「不管 stream 的中转」走同一条路。

export const CHAT_PROVIDER = 'custom'

const trimBase = url => String(url || '').trim().replace(/\/+$/, '').replace(/\/chat\/completions$/i, '')
const textOf = content => (Array.isArray(content) ? content.map(p => (typeof p === 'string' ? p : p?.text || '')).join('') : String(content ?? ''))
const headersFor = key => ({ 'content-type': 'application/json', ...(key ? { authorization: 'Bearer ' + key } : {}) })

/** 报错正文里的那句话：{error:{message}} / {error:"…"} / {message} / 纯文本。 */
function errorText(body) {
  try {
    const json = typeof body === 'string' ? JSON.parse(body) : body
    const e = json?.error ?? json
    return String((typeof e === 'string' ? e : e?.message || json?.message || json?.detail) || '').slice(0, 400) || String(typeof body === 'string' ? body : '').slice(0, 400)
  } catch { return String(body || '').slice(0, 400) }
}

/** 用量换成宿主的字段名（导演日志按这些名字显示）。 */
function usageOf(u) {
  if (!u || typeof u !== 'object') return null
  const out = {}
  if (Number.isFinite(u.prompt_tokens)) out.inputTokens = u.prompt_tokens
  if (Number.isFinite(u.completion_tokens)) out.outputTokens = u.completion_tokens
  const reasoning = u.completion_tokens_details?.reasoning_tokens
  if (Number.isFinite(reasoning) && reasoning > 0) out.reasoningTokens = reasoning
  const cached = u.prompt_tokens_details?.cached_tokens ?? u.prompt_cache_hit_tokens
  if (Number.isFinite(cached) && cached > 0) out.cachedInputTokens = cached
  if (Number.isFinite(u.total_tokens)) out.totalTokens = u.total_tokens
  return Object.keys(out).length ? out : null
}

/**
 * 一块 JSON（流式的一段，或不流式的整个回复）里的正文、思考、用量、报错。
 * 正文也认分段的数组（[{type:'text', text}]，有的中转这么回）。结束原因、拦截原因、最后一块记进 seen，收尾时 endOf 用。
 */
function* eventsOf(json, seen) {
  if (json?.error) throw Object.assign(new Error(errorText(json)), { code: String(json.error?.code || json.error?.type || '') })
  seen.last = json
  const choice = json?.choices?.[0]
  if (choice?.finish_reason) seen.reason = String(choice.finish_reason)
  const blocked = json?.promptFeedback?.blockReason ?? json?.prompt_feedback?.block_reason
  if (blocked) seen.blocked = String(blocked)
  const part = choice?.delta || choice?.message || {}
  const reasoning = part.reasoning_content ?? part.reasoning
  if (typeof reasoning === 'string' && reasoning) yield { type: 'reasoning-delta', text: reasoning }
  const content = textOf(part.content ?? choice?.text ?? '')
  if (content) { seen.text = true; yield { type: 'text-delta', text: content } }
  const usage = usageOf(json?.usage)
  if (usage) yield { type: 'usage', usage }
}

// 被内容过滤、安全策略拦下的结束原因（OpenAI 的 content_filter，Gemini 的 SAFETY / PROHIBITED_CONTENT / BLOCKLIST……）
const FILTERED = /content[_-]?filter|safety|prohibited|blocklist|recitation|spii|refus/i

/**
 * 收尾：照结束原因吐宿主的 finish。被拦下的、一个字正文都没有的报错，写清楚原因（没有正文时附上接口回的开头，
 * 导演日志里能看到它到底回了什么）；写到上限的标 length（callModel 记成截断）。
 */
function endOf(seen) {
  const reason = seen.blocked || seen.reason
  const fail = (message, code) => ({ type: 'finish', reason: { kind: 'error', failure: { message, code } } })
  if (FILTERED.test(reason)) return fail(`被模型的内容过滤拦下了（${seen.blocked ? 'block_reason' : 'finish_reason'}: ${reason}）`, 'content_filter')
  if (!seen.text) return fail(`接口回了，但回复里没有正文${reason ? `（finish_reason: ${reason}）` : ''}：${JSON.stringify(seen.last ?? null).slice(0, 300)}`, 'empty')
  if (/^(length|max_tokens)$/i.test(reason)) return { type: 'finish', reason: { kind: 'length' } }
  return { type: 'finish', reason: { kind: 'stop' } }
}

/**
 * Node 自带的 fetch 等响应头最多 5 分钟就断（undici 的 headersTimeout）。流式时接口马上回头、边写边传，碰不到；
 * 不流式时接口整段写完才回头，长的导演整理（几万字的剧本、长思考）会被它掐断。换一个不限时的连接池，停止照样靠 signal。
 * 全局连接池第一次 fetch 时才建，还没有就拿一个 data: 地址叫醒它（不走网络）。
 * 浏览器里（酒馆宿主）没有这个，返回 undefined；宿主自己换过全局连接池（代理）时照它的类型新建，建不出来也返回 undefined。
 */
const GLOBAL_DISPATCHER = Symbol.for('undici.globalDispatcher.1')
let patient = { from: null, agent: undefined }
let woken = false
async function patientDispatcher() {
  if (!globalThis[GLOBAL_DISPATCHER] && !woken && typeof globalThis.fetch === 'function') {
    woken = true
    await globalThis.fetch('data:,').then(r => r.arrayBuffer()).catch(() => {})
  }
  const current = globalThis[GLOBAL_DISPATCHER]
  if (!current || typeof current.dispatch !== 'function') return undefined
  if (patient.from !== current) {
    let agent
    try { agent = new current.constructor({ headersTimeout: 0, bodyTimeout: 0 }) } catch {}
    patient = { from: current, agent: typeof agent?.dispatch === 'function' ? agent : undefined }
  }
  return patient.agent
}

/**
 * 接一个 OpenAI 兼容接口。contextWindow 是设置里填的上下文窗口（token），runWriter 按它裁剧情、收最大输出；0 = 不知道。
 * stream = false 时请求带 stream: false，等整段写完一次拿回（导演日志里看不到实时输出）；有的中转流式不稳、会吞字，就关掉。
 * 出错不抛，按宿主的样子吐 finish（kind: error），模型拒绝最大输出时 runWriter 能从报错里读出上限重试；
 * 被内容过滤拦下、回了却没有正文的也按 error 收尾，原因写进报错（见 endOf）。
 */
export function createChatLlm({ baseURL, key = '', contextWindow = 0, stream = true, fetchImpl = fetch }) {
  const base = trimBase(baseURL)
  const streaming = stream !== false
  return {
    streaming,
    async resolveModelInfo() { return contextWindow > 0 ? { context: { contextWindow } } : null },

    async *stream({ model, system, temperature, maxTokens, signal, messages = [] }) {
      try {
        if (!base) throw new Error('还没填自定义接口的地址')
        const chat = [...(system ? [{ role: 'system', content: system }] : []), ...messages.map(m => ({ role: m.role || 'user', content: textOf(m.content) }))]
        const body = { model, messages: chat, stream: streaming, ...(maxTokens ? { max_tokens: maxTokens } : {}), ...(Number.isFinite(temperature) ? { temperature } : {}) }
        const dispatcher = streaming ? undefined : await patientDispatcher()
        const res = await fetchImpl(base + '/chat/completions', { method: 'POST', headers: headersFor(key), body: JSON.stringify(body), signal, ...(dispatcher ? { dispatcher } : {}) })
        if (!res.ok) {
          const text = await res.text().catch(() => '')
          throw Object.assign(new Error(`HTTP ${res.status}${errorText(text) ? '：' + errorText(text) : ''}`), { code: String(res.status) })
        }
        const seen = { text: false, reason: '', blocked: '', last: null }
        // 不流式；或者有的中转不管 stream，直接回整个 JSON
        if (!/event-stream/i.test(res.headers?.get?.('content-type') || '') || !res.body?.getReader) {
          const text = await res.text()
          if (!/^\s*data:/m.test(text)) yield* eventsOf(JSON.parse(text), seen)
          else for (const line of text.split(/\r?\n/)) yield* lineEvents(line, seen)
          yield endOf(seen)
          return
        }
        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        for (;;) {
          const { value, done } = await reader.read()
          buffer += decoder.decode(value || new Uint8Array(), { stream: !done })
          const lines = buffer.split(/\r?\n/)
          buffer = done ? '' : lines.pop()
          for (const line of lines) yield* lineEvents(line, seen)
          if (done) break
        }
        yield endOf(seen)
      } catch (error) {
        yield { type: 'finish', reason: { kind: signal?.aborted ? 'aborted' : 'error', failure: { message: error?.message || String(error), code: error?.code || '' } } }
      }
    },
  }
}

/** SSE 的一行：只认 data:，[DONE] 和心跳、注释跳过。 */
function* lineEvents(line, seen) {
  const m = /^data:\s?(.*)$/.exec(line.trim())
  if (!m || !m[1] || m[1] === '[DONE]') return
  let json
  try { json = JSON.parse(m[1]) } catch { return }
  yield* eventsOf(json, seen)
}

/** 这个接口有哪些模型（GET /models）。读不到就抛，设置页让玩家手填。 */
export async function chatModels({ baseURL, key = '', fetchImpl = fetch, signal }) {
  const base = trimBase(baseURL)
  if (!base) throw new Error('还没填接口地址')
  const res = await fetchImpl(base + '/models', { headers: headersFor(key), signal: signal || AbortSignal.timeout(8000) })
  const text = await res.text().catch(() => '')
  if (!res.ok) throw new Error(`HTTP ${res.status}${errorText(text) ? '：' + errorText(text) : ''}`)
  let json
  try { json = JSON.parse(text) } catch { throw new Error('接口回的不是 JSON') }
  const list = Array.isArray(json) ? json : Array.isArray(json?.data) ? json.data : Array.isArray(json?.models) ? json.models : []
  return list
    .map(m => (typeof m === 'string' ? { id: m } : m))
    .filter(m => m && (m.id || m.name))
    .map(m => ({ id: String(m.id || m.name), name: String(m.name && m.name !== m.id ? `${m.name}（${m.id}）` : m.id || m.name), window: Number(m.context_length || m.context_window) || 0 }))
    .sort((a, b) => a.id.localeCompare(b.id))
}
