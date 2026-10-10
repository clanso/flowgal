// 酒馆宿主：导演、立绘设计师、插画分镜师用的大模型。照 DSH llm 服务的样子提供 stream / listProviders / listModels / resolveModelInfo，
// 核心（lib/director.js 的 callModel）不用改。
// 「提供方」就是酒馆的连接配置（Connection Profile）：current = 跟着酒馆当前选中的配置；也可以在设置里指定某一套。
// 走 ConnectionManagerRequestService（支持流式、用那套配置的预设参数）；酒馆没开连接管理、或者一套配置都没有时退回 generateRaw（不流式）。
export const CURRENT = 'current'

const textOf = content => (Array.isArray(content) ? content.map(p => (typeof p === 'string' ? p : p?.text || '')).join('') : String(content ?? ''))

export function createStLlm({ getContext = () => globalThis.SillyTavern.getContext() } = {}) {
  const manager = () => {
    const ctx = getContext()
    const disabled = ctx.extensionSettings?.disabledExtensions?.includes?.('connection-manager')
    return disabled || !ctx.ConnectionManagerRequestService ? null : ctx.ConnectionManagerRequestService
  }
  const profiles = () => {
    const service = manager()
    if (!service) return []
    try { return service.getSupportedProfiles() } catch { return [] }
  }
  const selectedProfile = () => getContext().extensionSettings?.connectionManager?.selectedProfile || ''
  /** current → 酒馆当前选中的那套（没有就是空：退回 generateRaw）。 */
  const profileIdOf = provider => (provider && provider !== CURRENT ? provider : selectedProfile())

  return {
    listProviders() {
      return [{ id: CURRENT, name: '跟着酒馆当前的连接' }, ...profiles().map(p => ({ id: p.id, name: '连接配置：' + (p.name || p.id) }))]
    },
    async listModels(provider) {
      const id = profileIdOf(provider)
      const profile = profiles().find(p => p.id === id)
      const model = profile?.model || getContext().getChatCompletionModel?.() || ''
      return [{ id: model || 'default', name: model || '（这套配置的默认模型）' }]
    },
    /** 窗口大小：用酒馆里设的上下文长度（token），导演按它裁剧情。 */
    async resolveModelInfo() {
      const window = Number(getContext().maxContext) || 0
      return window ? { context: { contextWindow: window } } : null
    },
    /** 默认用哪个模型（引擎的 backgroundModel 用）。 */
    current() {
      const id = selectedProfile()
      const profile = profiles().find(p => p.id === id)
      return { provider: CURRENT, model: profile?.model || 'default' }
    },

    /**
     * 流式调用，吐出跟 DSH 一样的事件：text-delta / reasoning-delta / finish。
     * 酒馆的流式给的是累计全文，这里换成增量。
     */
    async *stream({ provider, system, temperature, maxTokens, signal, messages = [] }) {
      const chat = [...(system ? [{ role: 'system', content: system }] : []), ...messages.map(m => ({ role: m.role || 'user', content: textOf(m.content) }))]
      try {
        const service = manager()
        const id = profileIdOf(provider)
        if (service && id) {
          const out = await service.sendRequest(id, chat, maxTokens, { stream: true, signal, extractData: true, includePreset: true }, Number.isFinite(temperature) ? { temperature } : {})
          if (typeof out === 'function') {
            let text = '', reasoning = ''
            for await (const part of out()) {
              const nextText = String(part?.text || ''), nextReasoning = String(part?.state?.reasoning || '')
              if (nextReasoning.length > reasoning.length) { yield { type: 'reasoning-delta', text: nextReasoning.slice(reasoning.length) }; reasoning = nextReasoning }
              if (nextText.length > text.length) { yield { type: 'text-delta', text: nextText.slice(text.length) }; text = nextText }
            }
          } else {
            if (out?.reasoning) yield { type: 'reasoning-delta', text: String(out.reasoning) }
            yield { type: 'text-delta', text: String(out?.content ?? out ?? '') }
          }
        } else {
          const user = chat.filter(m => m.role !== 'system').map(m => m.content).join('\n\n')
          const text = await getContext().generateRaw({ systemPrompt: system || '', prompt: user, responseLength: maxTokens })
          yield { type: 'text-delta', text: String(text ?? '') }
        }
        yield { type: 'finish', reason: { kind: 'stop' } }
      } catch (error) {
        const cause = error?.cause?.message || error?.cause || ''
        yield { type: 'finish', reason: { kind: signal?.aborted ? 'aborted' : 'error', failure: { message: [error?.message || String(error), cause].filter(Boolean).join('：') } } }
      }
    },
  }
}
