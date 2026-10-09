// 后台「写提示词」请求的公共流程：立绘设计师和插画分镜师都走这里。
// 一次请求把资料、到这一轮为止的全部剧情和一批要写的条目一起发出去；
// 模型窗口装不下时先从最早的剧情删起，剧情删光了再缩资料；输入加最大输出装不下就把最大输出往下收。
// 模型拒绝这个最大输出时按它报的上限重试一次；输出坏了带着错误再要一次；漏写的条目单独补要一次。
import { callModel, extractJson, estimateTokens, retryMaxTokens, MIN_OUTPUT, WINDOW_SHARE } from './director.js'
import { DEFAULT_CONFIG } from './config.js'

/** 剧情 [{turn, text}] → 文本。超出 maxChars 时从最早的轮次开始省略。 */
export function storyText(turns, maxChars = Infinity) {
  const parts = []
  let used = 0
  let dropped = 0
  for (let i = turns.length - 1; i >= 0; i--) {
    const block = `〔第 ${turns[i].turn} 轮〕\n${turns[i].text}`
    if (used + block.length > maxChars) { dropped = i + 1; break }
    parts.unshift(block)
    used += block.length + 2
  }
  return (dropped ? `（更早的 ${dropped} 轮因模型窗口装不下略去）\n\n` : '') + (parts.join('\n\n') || '（还没有剧情）')
}

/**
 * 跑一次批量写作。
 * items: [{ id, ... }]；render({ list, storyChars, contextChars }) 生成用户消息；
 * accept(json) 收下模型给的结果，返回这次收下的条目 id（数组或 Set）。
 * trace 照导演日志的形状记下提示词、每次尝试的原始输出和用量；模型彻底失败时 trace.error 写原因，不抛错（停止除外）。
 */
export async function runWriter({ llm, provider, model, config, system, items, render, accept, contextLength = 0, storyLength = 0, signal, trace = {}, onProgress }) {
  const wantedChars = Math.min(contextLength, Number(config.director?.contextChars ?? DEFAULT_CONFIG.director.contextChars))
  let contextChars = wantedChars
  let storyChars = storyLength
  const build = list => render({ list, storyChars, contextChars })
  let user = build(items)
  let maxTokens = Number(config.director?.maxTokens ?? DEFAULT_CONFIG.director.maxTokens)
  const notes = []
  const info = provider && model ? await Promise.resolve(llm?.resolveModelInfo?.(provider, model, signal)).catch(() => null) : null
  const window = Number(info?.context?.contextWindow) || 0
  if (window) {
    const usable = Math.floor(window * WINDOW_SHARE)
    for (let i = 0; i < 16; i++) {
      const over = estimateTokens(system) + estimateTokens(user) + MIN_OUTPUT - usable
      if (over <= 0) break
      if (storyChars > 0) storyChars = Math.max(0, storyChars - over - 500)
      else if (contextChars > 0) contextChars = Math.max(0, contextChars - over - 500)
      else break
      user = build(items)
    }
    if (storyChars < storyLength) notes.push(`剧情太长，按模型窗口（${window} token）只发了最近 ${storyChars} 字`)
    if (contextChars < wantedChars) notes.push(`资料也装不下，从 ${wantedChars} 字收到 ${contextChars} 字`)
    const input = estimateTokens(system) + estimateTokens(user)
    const fit = Math.min(maxTokens, Math.max(MIN_OUTPUT, usable - input))
    if (fit < maxTokens) { maxTokens = fit; notes.push(`输入约 ${input} token，最大输出收到 ${maxTokens}`) }
  }
  Object.assign(trace, { provider, model, window, outputDefault: Number(info?.defaultMaxTokens) || 0, maxTokens, temperature: Number(config.director?.temperature ?? 0.7), notes, system, user, attempts: [], contextLength, contextChars, storyLength, storyChars })
  onProgress?.()

  const done = new Set()
  const attempt = async (text, note) => {
    const record = { at: Date.now(), ms: 0, maxTokens, note, output: '', reasoning: '', usage: null, error: '' }
    trace.attempts.push(record)
    onProgress?.()
    try {
      const result = await callModel(llm, {
        provider, model, system, user: text, signal, maxTokens, temperature: trace.temperature,
        onDelta: (kind, delta) => { record[kind === 'reasoning' ? 'reasoning' : 'output'] += delta; onProgress?.() },
      })
      record.usage = result.usage
      for (const id of accept(extractJson(result.text)) || []) done.add(id)
    } catch (error) {
      record.error = String(error?.message || error).slice(0, 600)
      throw error
    } finally {
      record.ms = Date.now() - record.at
      onProgress?.()
    }
  }

  try {
    try { await attempt(user, '') } catch (error) {
      if (signal?.aborted) throw error
      const next = retryMaxTokens(error, maxTokens, info)
      if (next) { maxTokens = trace.maxTokens = next; await attempt(user, `模型拒绝了这个最大输出，改用 ${next} 重试`) }
      else await attempt(user + `\n\n上一次输出无法使用（${String(error?.message || error).slice(0, 200)}）。只输出一个合法 JSON 对象。`, '上一次输出无法使用，带着错误再要一次')
    }
    const missing = items.filter(t => !done.has(t.id))
    if (missing.length && missing.length < items.length) {
      await attempt(build(missing) + '\n\n（上一次漏写了这几条，只补写它们。）', `补写漏掉的 ${missing.length} 条`).catch(() => {})
    }
  } catch (error) {
    if (signal?.aborted) throw error
    trace.error = String(error?.message || error).slice(0, 300)
  }
}
