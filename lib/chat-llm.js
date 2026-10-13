// 插件自己接的大模型：OpenAI 兼容的 /chat/completions（DeepSeek、OpenRouter、各家中转、本机的 LM Studio / Ollama 都是这个格式）。
// 插画分镜师可以不用 Tavern 的后台模型，单独接一个。吐出来的事件和宿主的 llm.stream 一样（text-delta / reasoning-delta / usage / finish），
// 所以 callModel、runWriter 那套裁剧情、降最大输出、重试的流程不用改。Key 只在宿主侧用，浏览器拿不到。

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

/** 一块 JSON（流式的一段，或不流式的整个回复）里的正文、思考、用量、报错。 */
function* eventsOf(json) {
  if (json?.error) throw Object.assign(new Error(errorText(json)), { code: String(json.error?.code || json.error?.type || '') })
  const choice = json?.choices?.[0]
  const part = choice?.delta || choice?.message || {}
  const reasoning = part.reasoning_content ?? part.reasoning
  if (typeof reasoning === 'string' && reasoning) yield { type: 'reasoning-delta', text: reasoning }
  if (typeof part.content === 'string' && part.content) yield { type: 'text-delta', text: part.content }
  const usage = usageOf(json?.usage)
  if (usage) yield { type: 'usage', usage }
}

/**
 * 接一个 OpenAI 兼容接口。contextWindow 是设置里填的上下文窗口（token），runWriter 按它裁剧情、收最大输出；0 = 不知道。
 * 出错不抛，按宿主的样子吐 finish（kind: error），模型拒绝最大输出时 runWriter 能从报错里读出上限重试。
 */
export function createChatLlm({ baseURL, key = '', contextWindow = 0, fetchImpl = fetch }) {
  const base = trimBase(baseURL)
  return {
    async resolveModelInfo() { return contextWindow > 0 ? { context: { contextWindow } } : null },

    async *stream({ model, system, temperature, maxTokens, signal, messages = [] }) {
      try {
        if (!base) throw new Error('还没填自定义接口的地址')
        const chat = [...(system ? [{ role: 'system', content: system }] : []), ...messages.map(m => ({ role: m.role || 'user', content: textOf(m.content) }))]
        const body = { model, messages: chat, stream: true, ...(maxTokens ? { max_tokens: maxTokens } : {}), ...(Number.isFinite(temperature) ? { temperature } : {}) }
        const res = await fetchImpl(base + '/chat/completions', { method: 'POST', headers: headersFor(key), body: JSON.stringify(body), signal })
        if (!res.ok) {
          const text = await res.text().catch(() => '')
          throw Object.assign(new Error(`HTTP ${res.status}${errorText(text) ? '：' + errorText(text) : ''}`), { code: String(res.status) })
        }
        // 有的中转不管 stream，直接回整个 JSON
        if (!/event-stream/i.test(res.headers?.get?.('content-type') || '') || !res.body?.getReader) {
          const text = await res.text()
          if (!/^\s*data:/m.test(text)) { yield* eventsOf(JSON.parse(text)); yield { type: 'finish', reason: { kind: 'stop' } }; return }
          for (const line of text.split(/\r?\n/)) yield* lineEvents(line)
          yield { type: 'finish', reason: { kind: 'stop' } }
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
          for (const line of lines) yield* lineEvents(line)
          if (done) break
        }
        yield { type: 'finish', reason: { kind: 'stop' } }
      } catch (error) {
        yield { type: 'finish', reason: { kind: signal?.aborted ? 'aborted' : 'error', failure: { message: error?.message || String(error), code: error?.code || '' } } }
      }
    },
  }
}

/** SSE 的一行：只认 data:，[DONE] 和心跳、注释跳过。 */
function* lineEvents(line) {
  const m = /^data:\s?(.*)$/.exec(line.trim())
  if (!m || !m[1] || m[1] === '[DONE]') return
  let json
  try { json = JSON.parse(m[1]) } catch { return }
  yield* eventsOf(json)
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
