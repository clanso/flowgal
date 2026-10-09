// 立绘提示词：后台模型读完资料（人物卡、世界书）和到这一轮为止的全部剧情，为同一角色的一批差分写英文 tag。
// 一个角色一次请求写完一批（同一套固定外貌、同一个种子），不必每张都把资料重读一遍。
// 模型不可用、拒绝或漏写时，按档案机械拼一份（固定外貌 + 衣服 + 长期状态 + 情绪 tag），保证总能出图。
import { SPRITE_SYSTEM, SPRITE_USER, STYLE_HINTS, fill } from './prompts.js'
import { callModel, extractJson, estimateTokens, retryMaxTokens, cardContextBrief, cardContextText, MIN_OUTPUT, WINDOW_SHARE } from './director.js'
import { emotionEntry } from './emotions.js'
import { EMOTION_TAGS } from './vocab.js'
import { tidyTags } from './cast.js'
import { lookLabel } from './look.js'
import { DEFAULT_CONFIG } from './config.js'

/** 一次最多写这么多张差分；再多分几次请求。 */
export const WRITER_BATCH = 12

const GENDER = { female: '女', male: '男', other: '其他' }
const countTag = person => (person.gender === 'male' ? '1boy' : person.gender === 'female' ? '1girl' : '')

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

/** 角色档案：给立绘设计师看的全部设定。 */
export function personBrief(person) {
  const lines = [`名字：${person.name}${GENDER[person.gender] ? `（${GENDER[person.gender]}）` : ''}`, `固定外貌：${person.appearance || '（未建档）'}`]
  const wardrobe = Object.entries(person.timeline?.outfits || {})
  if (wardrobe.length) lines.push('衣橱：\n' + wardrobe.map(([name, o]) => `- ${name}：${o.tags || '（没写 tag，按名字和剧情推断）'}`).join('\n'))
  if (person.outfit) lines.push(`此刻穿着：${person.outfit}`)
  lines.push(`长期状态：${person.states?.length ? person.states.map(s => `${s.name}（${s.tags || '按名字推断'}）`).join('、') : '无'}`)
  if (person.temp) lines.push(`临时状态（只影响插画，立绘不要画）：${person.temp}`)
  if (person.note) lines.push(`立绘备注（玩家写的，必须遵守）：${person.note}`)
  if (person.negative) lines.push(`不要出现：${person.negative}`)
  return lines.join('\n')
}

function targetLine(t, custom) {
  const e = emotionEntry(t.emotion, custom)
  const base = e.base ? `；接近 ${emotionEntry(e.base).label}` : ''
  const states = t.states?.length ? t.states.map(s => `${s.name}${s.tags ? `（${s.tags}）` : ''}`).join('、') : '无'
  return `- ${t.id}：服装 ${t.outfit ? `「${t.outfit}」${t.outfitTags ? `（${t.outfitTags}）` : ''}` : '（档案没写，按固定外貌和剧情推断）'}；长期状态 ${states}；情绪「${e.label}」${e.desc ? `：${e.desc}` : ''}${base}`
}

function referenceBlock(references) {
  if (!references?.length) return ''
  return '\n【已经画好的立绘（固定外貌的写法要和它们一致）】\n' + references.map(r => `- ${r.label}：${r.tags}`).join('\n') + '\n'
}

/** 没有模型可用时的机械拼法。 */
export function fallbackTags(person, target, custom = []) {
  const e = emotionEntry(target.emotion, custom)
  const emotionTags = EMOTION_TAGS[target.emotion] || EMOTION_TAGS[e.base] || ''
  return tidyTags([countTag(person), person.appearance, target.outfitTags, ...(target.states || []).map(s => s.tags), emotionTags].filter(Boolean).join(', '))
}

/**
 * 写一批差分的提示词。
 * targets: [{ key, emotion, outfit, outfitTags, states }]，同一套固定外貌。
 * story: [{ turn, text }]，到这一轮为止的剧情。trace 照导演日志的形状记下提示词和每次尝试。
 * @returns {Promise<Map<string, { tags: string, negative: string, writer: 'ai' | 'fallback' }>>}
 */
export async function writeSpritePrompts({ llm, provider, model, config, backend, context, story = [], turn, person, targets, references = [], custom = [], signal, trace = {}, onProgress }) {
  const results = new Map()
  const fallback = list => { for (const t of list) if (!results.has(t.key)) results.set(t.key, { tags: fallbackTags(person, t, custom), negative: '', writer: 'fallback' }) }
  const items = targets.map((t, i) => ({ ...t, id: 's' + (i + 1) }))
  const system = fill(config.director?.spritePrompt || SPRITE_SYSTEM, { styleHint: STYLE_HINTS[backend] || STYLE_HINTS.novelai })
  const storyLength = storyText(story).length
  const contextLength = cardContextText(context).length
  const wantedChars = Math.min(contextLength, Number(config.director?.contextChars ?? DEFAULT_CONFIG.director.contextChars))
  let contextChars = wantedChars
  let storyChars = storyLength
  const build = list => fill(SPRITE_USER, {
    context: cardContextBrief(context, contextChars),
    turn: Number.isFinite(turn) ? String(turn) : '最新',
    story: storyText(story, storyChars),
    person: personBrief(person),
    references: referenceBlock(references),
    targets: list.map(t => targetLine(t, custom)).join('\n'),
  })
  let user = build(items)
  let maxTokens = Number(config.director?.maxTokens ?? DEFAULT_CONFIG.director.maxTokens)
  const notes = []
  const info = provider && model ? await Promise.resolve(llm?.resolveModelInfo?.(provider, model, signal)).catch(() => null) : null
  const window = Number(info?.context?.contextWindow) || 0
  if (window) {
    // 装不下时先从最早的剧情删起，剧情删光了再缩资料。
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
      const json = extractJson(result.text)
      const list = Array.isArray(json.sprites) ? json.sprites : []
      for (const entry of list) {
        const item = items.find(t => t.id === String(entry?.key || '').trim())
        const tags = typeof entry?.tags === 'string' ? tidyTags(entry.tags).slice(0, 2000) : ''
        if (item && tags) results.set(item.key, { tags, negative: typeof entry.negative === 'string' ? tidyTags(entry.negative).slice(0, 600) : '', writer: 'ai' })
      }
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
    const missing = items.filter(t => !results.has(t.key))
    if (missing.length && missing.length < items.length) {
      await attempt(build(missing) + '\n\n（上一次漏写了这几张，只补写它们。）', `补写漏掉的 ${missing.length} 张`).catch(() => {})
    }
  } catch (error) {
    if (signal?.aborted) throw error
    trace.error = String(error?.message || error).slice(0, 300)
  }
  fallback(items)
  return results
}

/** 差分的中文说明：「校服 · 怀孕 · 带着烦躁思考」。 */
export function variantLabel(target, custom = []) {
  return `${lookLabel(target)} · ${emotionEntry(target.emotion, custom).label}`
}
