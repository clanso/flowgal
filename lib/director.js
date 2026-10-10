// 后台导演：正文单元 → 舞台脚本（场景、站位、表情、镜头、选项、插画分镜、外貌档案更新）。
import { DIRECTOR_SYSTEM, DIRECTOR_USER, DIRECTOR_MUSIC, STYLE_HINTS, fill } from './prompts.js'
import { musicBrief } from './music.js'
import { unitsForPrompt } from './segment.js'
import { SYMBOLS, CAMERAS, DELIVERIES, FACINGS, WEATHER, TIMES, TRANSITIONS, CARDS, MOODS, POSITIONS, CG_SIZES, pick } from './vocab.js'
import { emotionId, isBuiltinEmotion, emotionBrief, MAX_NEW_PER_TURN } from './emotions.js'
import { normalizeStates } from './cast.js'
import { cleanName, cleanLookFields, formatLook } from './look.js'
import { castAtEnd } from './staging.js'
import { DEFAULT_CONFIG } from './config.js'

/**
 * 收完一次流式模型调用。llm.stream 的事件形状见 DSH llm 服务。
 * onDelta(kind, text) 在每段新文字到达时回调（kind 是 text 或 reasoning），导演日志的实时输出靠它。
 */
export async function callModel(llm, { provider, model, system, user, maxTokens = 6000, temperature = 0.7, signal, onDelta }) {
  if (!llm || typeof llm.stream !== 'function') throw new Error('宿主没有可用的大模型服务')
  if (!provider || !model) throw new Error('没有可用的后台模型：请在「设置 → 导演」里选一个，或先在 Tavern 里配置后台模型')
  signal?.throwIfAborted()
  const chunks = llm.stream({ provider, model, system, temperature, maxTokens, signal, messages: [{ role: 'user', content: [{ type: 'text', text: user }] }] })
  let output = '', reasoning = '', failure = null, usage = null
  for await (const chunk of chunks) {
    signal?.throwIfAborted()
    if (!chunk || typeof chunk !== 'object') continue
    if (chunk.type === 'text-delta' && typeof chunk.text === 'string') { output += chunk.text; onDelta?.('text', chunk.text) }
    else if (chunk.type === 'reasoning-delta' && typeof chunk.text === 'string') { reasoning += chunk.text; onDelta?.('reasoning', chunk.text) }
    else if (chunk.type === 'usage') usage = chunk.usage ?? null
    else if (chunk.type === 'finish') {
      const reason = chunk.reason ?? {}
      if (reason.kind === 'error' || reason.kind === 'aborted') failure = { message: reason.failure?.message || (reason.kind === 'aborted' ? '已取消' : '模型调用失败'), code: reason.failure?.code || '' }
    }
  }
  signal?.throwIfAborted()
  if (failure && !output.trim()) throw Object.assign(new Error(failure.message), { code: failure.code })
  return { text: output, reasoning, usage }
}

/** 从模型输出里抠出 JSON 对象：容忍代码块、前后废话、思维链。 */
export function extractJson(text) {
  let source = String(text ?? '').replace(/<think(?:ing)?>[\s\S]*?<\/think(?:ing)?>/gi, '')
  const fence = /```(?:json)?\s*([\s\S]*?)```/i.exec(source)
  if (fence) source = fence[1]
  const start = source.indexOf('{')
  const end = source.lastIndexOf('}')
  if (start < 0 || end <= start) throw new Error('导演没有返回 JSON')
  const body = source.slice(start, end + 1)
  try { return JSON.parse(body) } catch {}
  // 常见小毛病：尾逗号、中文引号包键。
  const repaired = body.replace(/,\s*([}\]])/g, '$1').replace(/[“”]/g, '"')
  try { return JSON.parse(repaired) } catch (error) { throw new Error('导演返回的 JSON 无法解析：' + error.message) }
}

const str = (value, max = 200) => (typeof value === 'string' ? value.trim().slice(0, max) : '')

/** 一幕结束时在放的曲子：最后一次换歌（lines 里的 bgm），没有就是这一幕开头的 scene.bgm。 */
export function playingAfter(script) {
  if (!script) return ''
  const switched = Object.values(script.lines || {}).filter(l => l.bgm).pop()
  return switched ? switched.bgm : script.scene?.bgm || ''
}

/** 把模型输出规整成前端可以直接演的脚本。未知值一律丢弃或回落默认。 */
const HAS_CJK = /[\u3400-\u9fff]/
/** 没给站位的人按这个顺序找空位。 */
const SLOT_ORDER = ['left', 'right', 'center', 'farleft', 'farright']

/**
 * 情绪：内置键、内置中文名、情绪库里已有的、或这一轮在 emotions 里声明过的新词照收；
 * 没声明的新词只收中文短语（英文乱写的丢掉）。返回 [逐句的情绪, 这一轮新加的情绪]。
 */
function normalizeEmotions(raw, known) {
  const declared = new Map()
  for (const e of Array.isArray(raw?.emotions) ? raw.emotions : []) {
    const id = emotionId(e?.name)
    if (!id || isBuiltinEmotion(id) || declared.has(id)) continue
    const base = emotionId(e?.base)
    declared.set(id, { name: id, desc: str(e?.desc, 200), base: isBuiltinEmotion(base) ? base : '' })
  }
  const added = new Map()
  const accept = value => {
    const id = emotionId(value)
    if (!id) return ''
    if (isBuiltinEmotion(id) || known.has(id)) return id
    if (added.has(id)) return id
    if (added.size >= MAX_NEW_PER_TURN) return ''
    if (declared.has(id)) { added.set(id, declared.get(id)); return id }
    if (HAS_CJK.test(id)) { added.set(id, { name: id, desc: '', base: '' }); return id }
    return ''
  }
  return { accept, added }
}

export function normalizeScript(raw, units, { previous = null, maxImages = 1, trackIds = [], emotions = [] } = {}) {
  const unitIds = new Set(units.map(u => u.id))
  const unitText = new Map(units.map(u => [u.id, u.text || '']))
  const order = new Map(units.map((u, i) => [u.id, i]))
  const prevScene = previous?.scene || {}
  const sceneIn = raw && typeof raw.scene === 'object' ? raw.scene : {}
  const location = str(sceneIn.location, 40) || prevScene.location || ''
  const scene = {
    location,
    time: pick(sceneIn.time, TIMES, prevScene.time || 'afternoon'),
    weather: pick(sceneIn.weather, WEATHER, prevScene.weather || 'clear'),
    mood: pick(sceneIn.mood, MOODS, prevScene.mood || 'daily'),
    transition: pick(sceneIn.transition, TRANSITIONS, location && location === prevScene.location ? 'none' : 'dissolve'),
    bg: str(sceneIn.bg, 600) || (location === prevScene.location ? prevScene.bg || '' : ''),
  }
  // 配乐：编号或 none；写 keep、没写或写错都沿用上一幕结束时的曲子。
  const tracks = new Set(trackIds)
  const bgmOf = value => { const v = str(value, 40); return v === 'none' || tracks.has(v) ? v : '' }
  if (tracks.size) {
    const carried = bgmOf(playingAfter(previous))
    scene.bgm = bgmOf(sceneIn.bgm) || carried
  }
  const cast = []
  const seen = new Set()
  for (const entry of Array.isArray(raw?.cast) ? raw.cast : []) {
    const name = str(entry?.name, 24)
    if (!name || seen.has(name)) continue
    seen.add(name)
    cast.push({ name, pos: pick(entry?.pos, POSITIONS, '') })
  }
  // 没给站位的按出场顺序分配，避免两人挤在同一处。
  const free = SLOT_ORDER.filter(p => !cast.some(c => c.pos === p))
  for (const c of cast) if (!c.pos) c.pos = free.shift() || 'center'

  // skip：不演的单元（状态栏、网页外壳、作者的话……），可以写成区间 U3-U9。全都不演等于没写。
  const skip = new Set()
  const skipList = Array.isArray(raw?.skip) ? raw.skip : typeof raw?.skip === 'string' ? raw.skip.split(/[,，、\s]+/) : []
  for (const item of skipList) {
    const m = /^(U\d+)\s*(?:[-~–—至到]\s*(U\d+))?$/i.exec(str(item, 24))
    const a = m && order.get(m[1].toUpperCase())
    const b = m && (m[2] ? order.get(m[2].toUpperCase()) : a)
    if (a == null || b == null) continue
    for (let i = Math.min(a, b); i <= Math.max(a, b); i++) skip.add(units[i].id)
  }
  if (skip.size >= units.length) skip.clear()
  // 插画挂在不演的单元上时，往前挪到最近一个要演的单元。
  const playable = id => {
    if (!skip.has(id)) return id
    for (let i = order.get(id); i >= 0; i--) if (!skip.has(units[i].id)) return units[i].id
    return units.find(u => !skip.has(u.id))?.id || id
  }
  const unitType = new Map(units.map(u => [u.id, u.type]))
  const lastPlayed = units.filter(u => !skip.has(u.id)).pop()?.id || ''

  const feelings = normalizeEmotions(raw, new Set(emotions))
  // 登场写 [{name, pos}]（也收只写名字的）；退场只要名字。登场的人没列进 cast 的补进去。
  const enterList = value => (Array.isArray(value) ? value : []).map(e => (typeof e === 'string' ? { name: str(e, 24) } : { name: str(e?.name, 24), pos: pick(e?.pos, POSITIONS, '') }))
    .filter(e => e.name).map(e => (e.pos ? e : { name: e.name })).slice(0, 6)
  const exitList = value => [...new Set((Array.isArray(value) ? value : [value]).map(n => str(n, 24)).filter(Boolean))].slice(0, 6)
  const lines = {}
  for (const entry of Array.isArray(raw?.lines) ? raw.lines : []) {
    const id = str(entry?.u, 12)
    if (!unitIds.has(id) || skip.has(id)) continue
    const line = {}
    const type = pick(entry.type, ['dialogue', 'narration', 'thought'], ''); if (type && type !== unitType.get(id)) line.type = type
    const sp = str(entry.sp, 24); if (sp) line.sp = sp
    const as = str(entry.as, 24); if (as && as !== sp) line.as = as
    const emo = feelings.accept(entry.emo); if (emo) line.emo = emo
    const sym = pick(entry.sym, SYMBOLS, ''); if (sym) line.sym = sym
    const cam = pick(entry.cam, CAMERAS, ''); if (cam) line.cam = cam
    const say = pick(entry.say, DELIVERIES, ''); if (say) line.say = say
    // 重音必须是这句原文里有的字，否则丢掉（模型改写过的、写错的都不演）
    const stress = str(entry.stress, 12); if (stress && unitText.get(id).includes(stress)) line.stress = stress
    const facing = pick(entry.facing, FACINGS, ''); if (facing) line.facing = facing // 落到谁身上由剧场按说话人算（同一人连着说时 sp 省略）
    const card = pick(entry.card, CARDS, ''); if (card) line.card = card
    const bgm = tracks.size ? bgmOf(entry.bgm) : ''; if (bgm) line.bgm = bgm
    const enter = enterList(entry.enter); if (enter.length) line.enter = enter
    const exit = exitList(entry.exit); if (exit.length) line.exit = exit
    lines[id] = line
  }
  for (const line of Object.values(lines)) {
    for (const e of line.enter || []) {
      if (seen.has(e.name)) continue
      seen.add(e.name)
      cast.push({ name: e.name, pos: e.pos || SLOT_ORDER.find(p => !cast.some(c => c.pos === p)) || 'center' })
    }
  }
  // 一轮最多换一次歌：按正文顺序留第一处真正换了曲子的，其余丢掉。
  let switched = false
  for (const unit of units) {
    const line = lines[unit.id]
    if (!line || !line.bgm) continue
    if (switched || line.bgm === scene.bgm) delete line.bgm
    else switched = true
  }

  const choices = (Array.isArray(raw?.choices) ? raw.choices : []).map(c => str(c, 60)).filter(Boolean).slice(0, 4)

  const images = []
  for (const entry of Array.isArray(raw?.images) ? raw.images : []) {
    if (images.length >= maxImages) break
    const moment = str(entry?.moment, 300)
    // 自定义导演提示词里仍让导演自己写 tag 的，照旧收下，出图时不再经过插画分镜师。
    const tags = str(entry?.tags, 1500)
    if (!moment && !tags) continue
    const after = unitIds.has(str(entry.after, 12)) ? playable(str(entry.after, 12)) : lastPlayed
    const who = (Array.isArray(entry.who) ? entry.who : []).map(n => cleanName(n, 24)).filter(Boolean).slice(0, 8)
    // until：剧场里一直显示到这一句，下一句收起；不写或写在 after 前面就显示到这一轮结束。
    const until = unitIds.has(str(entry.until, 12)) ? playable(str(entry.until, 12)) : ''
    const keep = unitIds.has(until) && order.get(until) >= order.get(after) ? { until } : {}
    images.push({ after, title: str(entry.title, 40), moment, who, ...keep, ...(tags ? { tags, desc: str(entry.desc, 600), shape: pick(entry.shape, CG_SIZES, 'landscape') } : {}) })
  }

  const people = []
  for (const entry of Array.isArray(raw?.people) ? raw.people : []) {
    const name = str(entry?.name, 24)
    if (!name) continue
    const person = {
      name,
      gender: pick(entry.gender, ['female', 'male', 'other'], ''),
      // 固定外貌按字段写（见 look.js）；老写法给一整串也收，整串放进「其他」。
      appearance: cleanLookFields(entry.appearance),
      change: cleanLookFields(entry.change),
      outfit: cleanName(entry.outfit),
      outfitTags: str(entry.outfitTags, 600),
      temp: str(entry.temp, 300),
    }
    // states：写了列表（包括空列表）就是新的完整列表；写 none 等于清空；没写就是没变化。
    if (Array.isArray(entry.states)) person.states = normalizeStates(entry.states)
    else if (/^none$/i.test(str(entry.states, 10))) person.states = []
    people.push(person)
  }
  return { scene, cast, lines, choices, images, people, emotions: [...feelings.added.values()], summary: str(raw?.summary, 80), ...(skip.size ? { skip: units.filter(u => skip.has(u.id)).map(u => u.id) } : {}) }
}

/** 把档案整理成给导演看的简表：固定外貌、衣橱（只列名字）、正在穿的、长期状态、临时状态。 */
export function castBrief(castList) {
  if (!castList.length) return '（暂无）'
  return castList.map(c => {
    const parts = [`固定外貌：${c.appearance ? formatLook(c.appearanceFields || { other: c.appearance }) : '（未建档）'}`]
    const wardrobe = Object.keys(c.timeline?.outfits || {})
    if (wardrobe.length) parts.push(`衣橱：${wardrobe.join('、')}`)
    if (c.outfit) parts.push(`正在穿：${c.outfit}`)
    if (c.states?.length) parts.push(`长期状态：${c.states.map(s => s.name).join('、')}`)
    if (c.temp) parts.push(`临时：${c.temp}`)
    return `- ${c.name}${c.global ? '（全局，固定外貌冻结）' : ''}：${parts.join('；')}`
  }).join('\n')
}

/** 配乐一节：没有曲子就不出现。 */
function musicSection(music, previous) {
  if (!music.length) return ''
  const now = playingAfter(previous)
  const track = music.find(t => t.id === now)
  const playing = now === 'none' ? '\n上一幕结束时没有放音乐。' : track ? `\n上一幕结束时在放：${track.id}（${track.name}）。` : ''
  return fill(DIRECTOR_MUSIC, { tracks: musicBrief(music), playing })
}

export function previousBrief(previous) {
  if (!previous?.scene) return '（这是第一幕）'
  const s = previous.scene
  const who = castAtEnd(previous).map(c => `${c.name}@${c.pos}`).join('，') || '无人'
  return `地点：${s.location || '未知'}；时段：${s.time}；天气：${s.weather}；结束时在场：${who}${previous.summary ? '；剧情：' + previous.summary : ''}`
}

export function cardContextText(context) {
  if (!context) return ''
  const parts = []
  if (context.description) parts.push('【人物卡】' + context.description)
  if (context.personality) parts.push('【性格】' + context.personality)
  if (context.scenario) parts.push('【情境】' + context.scenario)
  for (const entry of Array.isArray(context.lore) ? context.lore : []) {
    if (!entry?.content) continue
    parts.push(`【设定·${entry.title || '条目'}】${entry.content}`)
  }
  return parts.join('\n')
}

export function cardContextBrief(context, limit = DEFAULT_CONFIG.director.contextChars) {
  let text = cardContextText(context)
  if (text.length > limit) text = limit > 0 ? text.slice(0, limit) + '…' : ''
  return text ? '【资料（仅供判断人物与外貌，勿复述）】\n' + text : ''
}

const CJK = /[\u3000-\u9fff\uac00-\ud7af\uf900-\ufaff\uff00-\uffef]/g
/** 粗估 token：中日韩文字按 1 字 1 token，其余按 3 个字符 1 token（偏保守，宁可多留余量）。 */
export function estimateTokens(text) {
  const s = String(text || '')
  const cjk = (s.match(CJK) || []).length
  return cjk + Math.ceil((s.length - cjk) / 3)
}

/** 输出至少留这么多 token；窗口只用九成，给各家分词差异留余量。 */
export const MIN_OUTPUT = 4096
export const WINDOW_SHARE = 0.9

/**
 * 模型因为「最大输出」或「输入 + 输出超出上下文」拒绝时，算一个能过的最大输出；不是这类错误返回 0。
 * 报错里写了上限（如 at most 16384 / valid range [1, 8192]）就用它，否则退到模型默认输出或 8192。
 */
export function retryMaxTokens(error, requested, info) {
  const text = `${error?.code || ''} ${error?.message || ''}`
  const context = /CONTEXT_WINDOW|context (?:length|window|limit)/i.test(text)
  if (!context && !/max[_ ]?(?:completion[_ ]?)?tokens|output tokens/i.test(text)) return 0
  const stated = context ? [] : (text.match(/\d{3,7}/g) || []).map(Number).filter(n => n >= 256 && n < requested)
  const next = stated.length ? Math.max(...stated) : Math.min(Math.floor(requested / 2), Number(info?.defaultMaxTokens) || 8192)
  return next >= 256 && next < requested ? next : 0
}

/**
 * 跑一次导演。
 * - 知道模型窗口时先按窗口收紧：输入太长就缩资料，输入 + 最大输出装不下就降最大输出；
 * - 模型拒绝最大输出时按它给的上限重试一次；解析失败时带着错误再要一次；
 * - trace 是调用方传进来的记录（导演日志）：填上实际发出去的提示词、参数和每次尝试的原始输出、思考、用量、错误；
 *   onProgress 在流式输出、尝试开始 / 结束时回调。
 */
/**
 * 给导演看的本轮原文：模型写的原样，标签、网页卡片、状态栏都在。单元是从它切出来的（标签已去掉），
 * 导演靠原文的结构判断哪些单元在状态栏、面板、变量这类块里、该 skip。没有原文时不附。
 */
export function rawSection(raw) {
  const text = String(raw || '').trim()
  return text ? `【本轮原文（模型写的原样，含标签。下面的单元就是从它切出来的；用它看清每句话在原文的什么位置，被状态栏、面板、变量这类标签包着的单元写进 skip）】\n${text}\n\n` : ''
}

export async function direct({ llm, provider, model, units, rawText = '', previous, castList, context, config, backend, music = [], emotions = [], signal, trace = {}, onProgress }) {
  const maxImages = Math.max(0, Math.min(4, Number(config.images?.maxPerTurn ?? 1)))
  const system = fill(config.director?.systemPrompt || DIRECTOR_SYSTEM, {
    maxImages: String(maxImages),
    styleHint: STYLE_HINTS[backend] || STYLE_HINTS.novelai,
  }) + (maxImages === 0 ? '\n\n本次不需要插画：images 给空数组。' : '')
  const promptFor = limit => fill(DIRECTOR_USER, {
    context: cardContextBrief(context, limit),
    previous: previousBrief(previous),
    cast: castBrief(castList),
    raw: rawSection(rawText),
    units: unitsForPrompt(units),
    music: musicSection(music, previous),
    emotions: emotionBrief(emotions),
  })
  const notes = []
  const contextLength = cardContextText(context).length
  const wantedChars = Math.min(contextLength, Number(config.director?.contextChars ?? DEFAULT_CONFIG.director.contextChars))
  let contextChars = wantedChars
  let maxTokens = Number(config.director?.maxTokens ?? DEFAULT_CONFIG.director.maxTokens)
  let user = promptFor(contextChars)
  const info = provider && model ? await Promise.resolve(llm?.resolveModelInfo?.(provider, model, signal)).catch(() => null) : null
  const window = Number(info?.context?.contextWindow) || 0
  if (window) {
    const usable = Math.floor(window * WINDOW_SHARE)
    for (let i = 0; i < 8 && contextChars > 0; i++) {
      const over = estimateTokens(system) + estimateTokens(user) + MIN_OUTPUT - usable
      if (over <= 0) break
      contextChars = Math.max(0, contextChars - over - 500)
      user = promptFor(contextChars)
    }
    if (contextChars < wantedChars) notes.push(`资料太长，按模型窗口（${window} token）从 ${wantedChars} 字收到 ${contextChars} 字`)
    const input = estimateTokens(system) + estimateTokens(user)
    const fit = Math.min(maxTokens, Math.max(MIN_OUTPUT, usable - input))
    if (fit < maxTokens) {
      maxTokens = fit
      notes.push(`输入约 ${input} token，为装进模型窗口（${window}），最大输出收到 ${maxTokens}`)
    }
  }
  Object.assign(trace, { provider, model, window, outputDefault: Number(info?.defaultMaxTokens) || 0, contextLength, contextChars, maxTokens, temperature: Number(config.director?.temperature ?? 0.7), notes, system, user, attempts: [] })
  onProgress?.()

  const attempt = async (note, extra = '') => {
    const record = { at: Date.now(), ms: 0, maxTokens, note, output: '', reasoning: '', usage: null, error: '' }
    trace.attempts.push(record)
    onProgress?.()
    try {
      const result = await callModel(llm, {
        provider, model, system, user: user + extra, signal, maxTokens, temperature: trace.temperature,
        onDelta: (kind, text) => { record[kind === 'reasoning' ? 'reasoning' : 'output'] += text; onProgress?.() },
      })
      record.usage = result.usage
      return result
    } catch (error) {
      record.error = String(error?.message || error).slice(0, 600)
      throw error
    } finally {
      record.ms = Date.now() - record.at
      onProgress?.()
    }
  }
  const parse = result => {
    try { return extractJson(result.text) } catch (error) { trace.attempts.at(-1).error = error.message; throw error }
  }

  let result
  try { result = await attempt('') } catch (error) {
    const next = signal?.aborted ? 0 : retryMaxTokens(error, maxTokens, info)
    if (!next) throw error
    maxTokens = trace.maxTokens = next
    result = await attempt(`模型拒绝了这个最大输出，改用 ${next} 重试`)
  }
  let raw
  try { raw = parse(result) } catch (error) {
    result = await attempt('上一次输出无法解析，带着错误再要一次', `\n\n上一次输出无法解析（${error.message}）。只输出一个合法 JSON 对象。`)
    raw = parse(result)
  }
  return { script: normalizeScript(raw, units, { previous, maxImages, trackIds: music.map(t => t.id), emotions: emotions.map(e => e.id) }), usage: result.usage }
}
