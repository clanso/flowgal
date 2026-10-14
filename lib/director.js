// 后台导演：正文单元 → 舞台脚本（场景、站位、表情、镜头、选项、插画分镜、外貌档案更新）。
import { textOf, fillBook, placeRules, styleHintOf } from './prompt-book.js'
import { pickOf, mapOf } from './prompt-words.js'
import { musicBrief, musicCandidates } from './music.js'
import { soundCandidates, soundLine, sceneWords, overflowing, categoryBrief, cleanHeard, candidateQuota } from './soundlib.js'
import { unitsForPrompt, joinUnits, pairUnits } from './segment.js'
import { SYMBOLS, CAMERAS, AIMED_CAMERAS, HIT_EFFECTS, MOMENTS, CHEERS, CHEERS_ZH, MOMENT_NEEDS_TEXT, MOMENT_ONCE, PHONE_KINDS, PHONE_ALIASES, CALL_ENDS, CALL_END_ALIASES, PHONE_NEEDS_TEXT, DELIVERIES, WEATHER, TIMES, TRANSITIONS, CARDS, MOODS, LIGHTS, FX, MODES, CUTS, VOICES, RECALL_TONES, PAUSES, HUSH_ALIASES, TEXT_FX, ROMANCE, SENSES, BARS, MOVES, ENTER_HOWS, EXIT_HOWS, cgIn, cgOut, cgMotion, POSITIONS, CG_SIZES, NSFW_MIN_IMAGES, isNsfwFlag, pick } from './vocab.js'
import { sceneEnd, sceneAfter, scriptScenes, orderedLines, walkScenes, intimateRuns, holdIntimateCgs } from './scenes.js'
import { isBuiltinEmotion, emotionBrief, resolveEmotion, emotionEntry, emotionLabel, categoryOf } from './emotions.js'
import { sheetOf } from './poses.js'
import { cleanSituList, poseLife, liveSheet, lifeText } from './pose-life.js'
import { normalizeStates } from './cast.js'
import { cleanName, cleanLookFields, formatLook } from './look.js'
import { castAtEnd } from './staging.js'
import { onomatopoeia } from './foley.js'
import { erosSfx, isErosName, EROS_SFX, EROS_PACES, TENTACLE, peakOf } from './eros.js'
import { directorCaps, limitPhrases, capOf } from './limits.js'

/** 结束原因里表示「没写完就停了」的（写到最大输出、被内容过滤掐断）。 */
const CUT_KINDS = /^(length|max[-_]?tokens|content[-_]?filter)$/i

/**
 * 收完一次流式模型调用。llm.stream 的事件形状见 DSH llm 服务。
 * onDelta(kind, text) 在每段新文字到达时回调（kind 是 text 或 reasoning），导演日志的实时输出靠它。
 * cut：已经写了一些、但这次调用是报错或被截断收尾的（交给 extractJson，不替它补括号）。
 */
export async function callModel(llm, { provider, model, system, user, maxTokens = 6000, temperature = 0.7, signal, onDelta }) {
  if (!llm || typeof llm.stream !== 'function') throw new Error('宿主没有可用的大模型服务')
  if (!provider || !model) throw new Error('没有可用的后台模型：请在「设置 → 导演」里选一个，或先在 Tavern 里配置后台模型')
  signal?.throwIfAborted()
  const chunks = llm.stream({ provider, model, system, temperature, maxTokens, signal, messages: [{ role: 'user', content: [{ type: 'text', text: user }] }] })
  let output = '', reasoning = '', failure = null, usage = null, cut = false
  for await (const chunk of chunks) {
    signal?.throwIfAborted()
    if (!chunk || typeof chunk !== 'object') continue
    if (chunk.type === 'text-delta' && typeof chunk.text === 'string') { output += chunk.text; onDelta?.('text', chunk.text) }
    else if (chunk.type === 'reasoning-delta' && typeof chunk.text === 'string') { reasoning += chunk.text; onDelta?.('reasoning', chunk.text) }
    else if (chunk.type === 'usage') usage = chunk.usage ?? null
    else if (chunk.type === 'finish') {
      const reason = chunk.reason ?? {}
      if (reason.kind === 'error' || reason.kind === 'aborted') failure = { message: reason.failure?.message || (reason.kind === 'aborted' ? '已取消' : '模型调用失败'), code: reason.failure?.code || '' }
      else if (CUT_KINDS.test(String(reason.kind || ''))) cut = true
    }
  }
  signal?.throwIfAborted()
  if (failure && !output.trim()) throw Object.assign(new Error(failure.message), { code: failure.code })
  return { text: output, reasoning, usage, cut: cut || Boolean(failure) }
}

/**
 * 从 source 开头的 { 起按括号配对（跳过字符串里的）收出一个对象，后面的废话不要：
 * 多出来的右括号丢掉，配错的（该收 } 却写了 ]）补上漏掉的那层；
 * 写完了最后一个值却漏了收尾的括号（DeepSeek 有时最后少一个 }），按没配上的补齐。
 * 停在字符串、键名或逗号中间的（像是被截断了）不补，返回 ''。
 */
function closeJson(source) {
  const open = []
  let out = '', inString = false, escaped = false
  for (const ch of source) {
    if (inString) {
      out += ch
      if (escaped) escaped = false
      else if (ch === '\\') escaped = true
      else if (ch === '"') inString = false
      continue
    }
    if (ch === '}' || ch === ']') {
      if (!open.includes(ch)) continue
      while (open.at(-1) !== ch) out += open.pop()
      out += open.pop()
      if (!open.length) return out
      continue
    }
    if (ch === '"') inString = true
    else if (ch === '{') open.push('}')
    else if (ch === '[') open.push(']')
    out += ch
  }
  if (inString || !open.length || !/(["}\]\d]|true|false|null)$/.test(out.trimEnd())) return ''
  return out.trimEnd() + open.reverse().join('')
}

/**
 * 从模型输出里抠出 JSON 对象：容忍代码块、前后废话、思维链、尾逗号、中文引号，漏了收尾括号的补上。
 * close: false 时不补括号（这次调用是被截断收尾的，补上了也是半截）。
 */
export function extractJson(text, { close = true } = {}) {
  let source = String(text ?? '').replace(/<think(?:ing)?>[\s\S]*?<\/think(?:ing)?>/gi, '')
  const fence = /```(?:json)?\s*([\s\S]*?)```/i.exec(source)
  if (fence) source = fence[1]
  const start = source.indexOf('{')
  const end = source.lastIndexOf('}')
  if (start < 0) throw new Error('导演没有返回 JSON')
  let failure = null
  // 原样不行再改常见小毛病：尾逗号、中文引号包键。
  const parse = body => {
    for (const candidate of [body, body.replace(/,\s*([}\]])/g, '$1').replace(/[“”]/g, '"')]) {
      try { return { value: JSON.parse(candidate) } } catch (error) { failure ??= error }
    }
    return null
  }
  const whole = end > start ? parse(source.slice(start, end + 1)) : null
  if (whole) return whole.value
  const closed = close ? closeJson(source.slice(start)) : ''
  if (!closed && !failure) throw new Error('导演没有返回 JSON')
  const fixed = closed ? parse(closed) : null
  if (fixed) return fixed.value
  throw new Error('导演返回的 JSON 无法解析：' + failure.message)
}

const str = (value, max = 200) => (typeof value === 'string' ? value.trim().slice(0, max) : '')
/** 导演写的动作：编号（p1、daily）或动作名，16 字内。 */
const poseRef = value => str(value, 16).replace(/[|@]/g, '')

/** 一幕结束时（现实里）在放的曲子：开头的 scene.bgm，按 lines 里的换歌走到最后；特殊段落里换的不算，段落结束就换回去了。 */
export function playingAfter(script) {
  return sceneEnd(script)?.real.bgm || ''
}

/** 一幕结束时（现实里）的环境音，同上。 */
export function ambienceAfter(script) {
  return sceneEnd(script)?.real.amb || ''
}

export { scriptScenes, sceneAfter }

/** 把模型输出规整成前端可以直接演的脚本。未知值一律丢弃或回落默认。 */
const HAS_CJK = /[\u3400-\u9fff]/
/** 没给站位的人按这个顺序找空位。 */
const SLOT_ORDER = ['left', 'right', 'center', 'farleft', 'farright']

/** 电影黑边：on / none，也认 true / false、off。认不出为空。 */
function barsOf(value) {
  if (value === true || value === 'true') return 'on'
  if (value === false || value === 'false' || value === 'off') return 'none'
  return pick(value, BARS, '')
}

/** 一句里的场景变化：只收认得的项，什么都没写对就是没变。 */
function sceneDelta(value) {
  if (!value || typeof value !== 'object') return null
  const delta = {}
  const location = str(value.location, 40); if (location) delta.location = location
  for (const [key, list] of [['time', TIMES], ['weather', WEATHER], ['mood', MOODS], ['light', LIGHTS], ['fx', FX], ['romance', ROMANCE], ['sense', SENSES], ['eros', EROS_PACES], ['tentacle', TENTACLE], ['transition', TRANSITIONS]]) {
    const v = pick(value[key], list, ''); if (v) delta[key] = v
  }
  const bars = barsOf(value.bars); if (bars) delta.bars = bars
  const bg = str(value.bg, 600); if (bg) delta.bg = bg
  return Object.keys(delta).length ? delta : null
}

/** 段落里「当时的样子」：[{ name, outfit, outfitTags, states, change }]，只写了名字的不收。 */
function thenList(value) {
  const out = []
  for (const e of Array.isArray(value) ? value : []) {
    const name = cleanName(e?.name, 24)
    if (!name || out.some(x => x.name === name)) continue
    const entry = { name }
    const outfit = cleanName(e.outfit); if (outfit) entry.outfit = outfit
    const outfitTags = str(e.outfitTags, 600); if (outfit && outfitTags) entry.outfitTags = outfitTags
    if (Array.isArray(e.states)) entry.states = normalizeStates(e.states)
    const change = cleanLookFields(e.change); if (Object.keys(change).length) entry.change = change
    if (Object.keys(entry).length > 1) out.push(entry)
    if (out.length >= 6) break
  }
  return out
}

/** 一轮里中途变的样子（look）：[{ name, outfit?, outfitTags?, on?: [{name,tags}], off?: [{name}] }]，只留真写了变化的。 */
function shiftList(value) {
  const out = []
  for (const e of Array.isArray(value) ? value : []) {
    const name = cleanName(e?.name, 24)
    if (!name || out.some(x => x.name === name)) continue
    const entry = { name }
    const outfit = cleanName(e.outfit); if (outfit) entry.outfit = outfit
    const outfitTags = str(e.outfitTags, 600); if (outfit && outfitTags) entry.outfitTags = outfitTags
    const on = normalizeStates(Array.isArray(e.on) ? e.on : e.on ? [e.on] : []); if (on.length) entry.on = on
    const off = (Array.isArray(e.off) ? e.off : e.off ? [e.off] : []).map(x => cleanName(typeof x === 'string' ? x : x?.name)).filter(Boolean)
    if (off.length) entry.off = [...new Set(off)].slice(0, 6).map(n => ({ name: n }))
    if (Object.keys(entry).length > 1) out.push(entry)
    if (out.length >= 6) break
  }
  return out
}

/** 分屏：{ who: [另一头的人], location 那头的地点, bg 那头的背景描述（第一次出现时写） }，写 off 收起；只写了名字也收。 */
function splitScreen(value) {
  if (!value) return null
  if (typeof value === 'string') return /^(off|none|关|收起)$/i.test(value.trim()) ? 'off' : { who: [str(value, 24)] }
  if (typeof value !== 'object') return null
  if (value.off) return 'off'
  const who = [...new Set((Array.isArray(value.who) ? value.who : [value.who]).map(n => str(n, 24)).filter(Boolean))].slice(0, 2)
  if (!who.length) return null
  const location = str(value.location, 40)
  const bg = location ? str(value.bg, 600) : ''
  return { who, ...(location ? { location } : {}), ...(bg ? { bg } : {}) }
}

/** 过场字卡：{ kind, text }；只写了一句话的当作时间跳跃。「与此同时」可以不写字。 */
function cutCard(value) {
  if (!value) return null
  const raw = typeof value === 'string' ? { kind: 'time', text: value } : value
  const kind = pick(raw.kind, CUTS, raw.text ? 'time' : '')
  const text = str(raw.text, 24) || (kind === 'meanwhile' ? '与此同时' : '')
  return kind && text ? { kind, text } : null
}

/** normalizeScript 的 emotions：整个情绪库、条目列表，或者只是编号列表（测试里这么写）。 */
const emotionLibFor = emotions => (Array.isArray(emotions) ? { list: emotions.map(e => (typeof e === 'string' ? { id: e } : e)).filter(e => e?.id) } : { list: Array.isArray(emotions?.list) ? emotions.list : [], categories: emotions?.categories })

/**
 * 情绪：按情绪库认（内置键、内置的名字、改过的名字、并掉的跟到并进去的那个）；库里已有的、或这一轮在 emotions 里声明过的新词照收；
 * 停用、删掉的不收。没声明的新词只收中文短语（英文乱写的丢掉）。返回 [逐句的情绪, 这一轮新加的情绪]。
 */
function normalizeEmotions(raw, lib, cap = Infinity) {
  const usable = id => {
    if (isBuiltinEmotion(id)) { const e = emotionEntry(id, lib); return e.deleted || e.off ? '' : id }
    const entry = lib.list.find(e => e.id === id && !e.mergedInto)
    return entry ? (entry.off ? '' : id) : null // null：库里没有
  }
  const declared = new Map()
  for (const e of Array.isArray(raw?.emotions) ? raw.emotions : []) {
    const id = resolveEmotion(e?.name, lib)
    if (!id || usable(id) !== null || declared.has(id)) continue
    const base = resolveEmotion(e?.base, lib)
    const category = categoryOf(e?.category, lib)
    declared.set(id, { name: id, base: base && usable(base) ? base : '', ...(category ? { category } : {}) })
  }
  const added = new Map()
  const accept = value => {
    const id = resolveEmotion(value, lib)
    if (!id) return ''
    const known = usable(id)
    if (known !== null) return known
    if (added.has(id)) return id
    if (added.size >= cap) return ''
    if (declared.has(id)) { added.set(id, declared.get(id)); return id }
    if (HAS_CJK.test(id)) { added.set(id, { name: id, base: '' }); return id }
    return ''
  }
  return { accept, added }
}

/**
 * 亲密场面（scene.eros 开着的那一段）由插画来演：在这段里出来的插画 until 改到这段的最后一句（到这一轮结束就省略），
 * 换动作、换节奏都不收，不回到立绘站着说话。剧场（playback.js）对老脚本也按同一套演。原地改 images。
 * played：要演的单元编号，按正文顺序；runs：intimateRuns 的结果（下标对应 played）。
 */
export function holdIntimateImages(images, played, runs) {
  if (!runs.length || !played.length) return images
  const last = played.length - 1
  const spans = images.map(img => {
    const at = Math.max(0, played.indexOf(img.after))
    const end = img.until && played.includes(img.until) ? Math.max(at, played.indexOf(img.until)) : last
    return { img, at, end, was: end }
  })
  holdIntimateCgs(spans, runs)
  for (const { img, end, was } of spans) {
    if (end === was) continue
    if (end >= last) delete img.until
    else img.until = played[end]
  }
  return images
}

/**
 * 一轮的插画按张数上限收好（原地改 images）。有露骨的（nsfw）时上限放宽到 NSFW_MIN_IMAGES，名额先给露骨的；
 * 露骨的不够这么多张时，在同一段里补：导演写的那一刻之后、它显示到的那一句之前的中间，换个景别、机位或下一个动作再画一张。
 * played：要演的单元编号，按正文顺序。
 */
export function fitImages(images, maxImages, played) {
  const limit = maxImages > 0 && images.some(i => i.nsfw) ? Math.max(maxImages, NSFW_MIN_IMAGES) : maxImages
  const nsfwCount = () => images.filter(i => i.nsfw).length
  // 能补的：露骨的里有写了瞬间的（自定义提示词里导演自己写 tag 的不补）
  const fillable = images.some(i => i.nsfw && i.moment)
  const shortfall = () => (fillable ? Math.max(0, Math.min(NSFW_MIN_IMAGES, limit) - nsfwCount()) : 0)
  // 超出时从后往前先舍不露骨的；还要给补的那张腾位置时也一样
  while (images.length > limit || (images.length + shortfall() > limit && images.some(i => !i.nsfw))) {
    const drop = images.findLastIndex(i => !i.nsfw)
    images.splice(drop >= 0 ? drop : images.length - 1, 1)
  }
  const sources = images.filter(i => i.nsfw && i.moment)
  for (let n = 0; sources.length && nsfwCount() < NSFW_MIN_IMAGES && images.length < limit; n++) {
    const first = sources[n % sources.length]
    const from = Math.max(0, played.indexOf(first.after))
    const to = Math.max(from, played.indexOf(first.until || played.at(-1)))
    const after = played[from + Math.ceil((to - from) / 2)] || first.after
    const keep = first.until && played.indexOf(first.until) >= played.indexOf(after) ? { until: first.until } : {}
    images.splice(images.indexOf(first) + 1, 0, {
      after, title: first.title ? `${first.title}（二）`.slice(0, 40) : '', who: first.who, ...keep, nsfw: true,
      moment: `${first.moment}（同一段的另一张：换一个明显不同的景别和机位，或者画这段里紧接着的下一个动作、换了的体位）`.slice(0, 400),
    })
  }
  return images
}

export function normalizeScript(raw, units, { previous = null, maxImages = 1, trackIds = [], emotions = [], ambienceIds = [], sfxIds = [], alias = new Map(), limits = null } = {}) {
  // limits：设置里导演每轮各种演出的上限（lib/limits.js），没写的不限
  const caps = directorCaps(limits)
  // alias：被合并掉的单元编号 → 合并后的编号（见 joinUnits），导演在 lines、images 里写了旧编号也认得。
  const ref = value => { const id = str(value, 12); return alias.get(id) || id }
  const unitIds = new Set(units.map(u => u.id))
  const unitText = new Map(units.map(u => [u.id, u.text || '']))
  const order = new Map(units.map((u, i) => [u.id, i]))
  // 上一幕结束时的现实场景（中途换过地方、天色变过的，按变完的算）：这一轮没写的项接着用它。
  const prevScene = sceneAfter(previous) || {}
  const sceneIn = raw && typeof raw.scene === 'object' ? raw.scene : {}
  const location = str(sceneIn.location, 40) || prevScene.location || ''
  const samePlace = Boolean(location) && location === prevScene.location
  const time = pick(sceneIn.time, TIMES, prevScene.time || 'afternoon')
  const scene = {
    location,
    time,
    weather: pick(sceneIn.weather, WEATHER, prevScene.weather || 'clear'),
    mood: pick(sceneIn.mood, MOODS, prevScene.mood || 'daily'),
    // 光线、画面效果跟着地方走：还在同一个地方就接着用，换了地方回到默认。
    light: pick(sceneIn.light, LIGHTS, samePlace ? prevScene.light || 'normal' : 'normal'),
    fx: pick(sceneIn.fx, FX, samePlace ? prevScene.fx || 'none' : 'none'),
    // 亲密氛围同理；感官只管眼下这一段，不跨轮带着（还蒙着眼的，这一轮再写一次）
    romance: pick(sceneIn.romance, ROMANCE, samePlace ? prevScene.romance || 'none' : 'none'),
    sense: pick(sceneIn.sense, SENSES, 'none'),
    bars: barsOf(sceneIn.bars) || (samePlace ? prevScene.bars || 'none' : 'none'),
    // 亲密场面的节奏底、触手（lib/eros.js）：跟感官一样只管眼下这一段，不跨轮带着
    eros: pick(sceneIn.eros, EROS_PACES, 'none'),
    tentacle: pick(sceneIn.tentacle, TENTACLE, 'none'),
    // 换了地方默认溶解；时段也变了（隔了一段时间）默认黑场
    transition: pick(sceneIn.transition, TRANSITIONS, samePlace ? 'none' : prevScene.time && time !== prevScene.time ? 'black' : 'dissolve'),
    bg: str(sceneIn.bg, 600) || (samePlace ? prevScene.bg || '' : ''),
  }
  // 配乐：编号或 none；写 keep、没写或写错都沿用上一幕结束时的曲子。
  const tracks = new Set(trackIds)
  const bgmOf = value => { const v = str(value, 40); return v === 'none' || tracks.has(v) ? v : '' }
  // 句子上还可以写 hush：配乐留白，几句后自己回来（开场的 scene.bgm 不收）
  const lineBgmOf = value => (HUSH_ALIASES.includes(str(value, 40).toLowerCase()) ? 'hush' : bgmOf(value))
  if (tracks.size) {
    const carried = bgmOf(playingAfter(previous))
    scene.bgm = bgmOf(sceneIn.bgm) || carried
  }
  // 环境音同理：编号或 none；keep、没写、写错都沿用上一幕结束时的。音效只收音效库里的编号。
  const ambiences = new Set(ambienceIds)
  const effects = new Set(sfxIds)
  const ambOf = value => { const v = str(value, 40); return v === 'none' || ambiences.has(v) ? v : '' }
  if (ambiences.size) scene.amb = ambOf(sceneIn.amb) || ambOf(ambienceAfter(previous))
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
    const a = m && order.get(ref(m[1].toUpperCase()))
    const b = m && (m[2] ? order.get(ref(m[2].toUpperCase())) : a)
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

  const feelings = normalizeEmotions(raw, emotionLibFor(emotions), caps.newEmotions)
  // 登场写 [{name, pos}]（也收只写名字的）；退场只要名字。登场的人没列进 cast 的补进去。
  // 登场、退场可以带方式（how：跑进来、探头、甩头离开……），退场也收 { name, how } 的写法
  const enterList = value => (Array.isArray(value) ? value : []).map(e => (typeof e === 'string' ? { name: str(e, 24) } : { name: str(e?.name, 24), pos: pick(e?.pos, POSITIONS, ''), how: pick(e?.how, ENTER_HOWS, '') }))
    .filter(e => e.name).map(e => ({ name: e.name, ...(e.pos ? { pos: e.pos } : {}), ...(e.how ? { how: e.how } : {}) })).slice(0, 6)
  const exitName = n => str(n && typeof n === 'object' ? n.name : n, 24)
  const exitList = value => [...new Set((Array.isArray(value) ? value : [value]).map(exitName).filter(Boolean))].slice(0, 6)
  const exitHows = value => {
    const out = {}
    for (const n of Array.isArray(value) ? value : [value]) { const how = n && typeof n === 'object' ? pick(n.how, EXIT_HOWS, '') : ''; if (how && exitName(n)) out[exitName(n)] = how }
    return Object.keys(out).length ? out : null
  }
  // 同屏的人：没说话的人的反应 [{ name, emo, sym, pose }]（name 写 * 是台上所有人），走位 [{ name, act, to }]
  // pose 是点名换的动作（动作编号或动作名，剧场按这个人的那套动作认，认不出就不换，见 lib/poses.js）
  const reactList = value => (Array.isArray(value) ? value : value && typeof value === 'object' ? [value] : []).map(r => {
    const name = str(r?.name, 24)
    const emo = feelings.accept(r?.emo)
    const sym = pick(r?.sym, SYMBOLS, '')
    const pose = poseRef(r?.pose)
    return name && (emo || sym || pose) ? { name, ...(emo ? { emo } : {}), ...(sym ? { sym } : {}), ...(pose ? { pose } : {}) } : null
  }).filter(Boolean).slice(0, 4)
  const moveList = value => (Array.isArray(value) ? value : value && typeof value === 'object' ? [value] : []).map(m => {
    const name = str(m?.name, 24)
    const act = pick(m?.act, MOVES, '')
    const to = str(m?.to, 24)
    if (act === 'hide' && (!to || to === name)) return null // 躲到谁身后没写对方，演不出来
    return name && act ? { name, act, ...(to && to !== name ? { to } : {}) } : null
  }).filter(Boolean).slice(0, 4)
  // 一次出手：至少知道打的是谁或者招式名；效果认不出按命中
  const hitOf = value => {
    if (!value || typeof value !== 'object') return null
    const from = str(value.from, 24)
    const to = str(value.to, 24)
    const move = str(value.move, 16)
    if (!to && !move) return null
    return { ...(from ? { from } : {}), ...(to ? { to } : {}), ...(move ? { move } : {}), effect: pick(value.effect, HIT_EFFECTS, 'hit') }
  }
  // 小瞬间：认得的种类才收；新称呼、约定、做菜少了 text 演不出来，不收；干杯的材质认不出按玻璃
  const momentOf = value => {
    if (!value || typeof value !== 'object') return null
    const kind = pick(value.kind, MOMENTS, '')
    if (!kind) return null
    const who = str(value.who, 24)
    const raw = str(value.text, kind === 'photo' ? 24 : 16)
    const text = kind === 'cheers' ? pick(CHEERS_ZH[raw] || raw, CHEERS, 'glass') : kind === 'fireworks' ? '' : raw
    if (MOMENT_NEEDS_TEXT.has(kind) && !text) return null
    const place = kind === 'promise' ? str(value.place, 16) : ''
    return { kind, ...(who ? { who } : {}), ...(text ? { text } : {}), ...(place ? { place } : {}) }
  }
  // 手机：认得的种类才收（video 当作视频来电）；通知、留言少了内容不收；挂断的结果认不出就是正常挂断
  const phoneOf = value => {
    if (!value || typeof value !== 'object') return null
    const word = String(value.kind ?? '').trim().toLowerCase()
    const kind = pick(PHONE_ALIASES[word] || word, PHONE_KINDS, '')
    if (!kind) return null
    const who = str(value.who, 24)
    const text = PHONE_NEEDS_TEXT.has(kind) ? str(value.text, 40) : ''
    if (PHONE_NEEDS_TEXT.has(kind) && !text) return null
    const video = (kind === 'call' || kind === 'dial') && (word === 'video' || value.video === true || value.video === 'true')
    const said = String(value.result ?? '').trim()
    const result = kind === 'end' ? pick(CALL_END_ALIASES[said] || said, CALL_ENDS, '') : ''
    return { kind, ...(who ? { who } : {}), ...(video ? { video: true } : {}), ...(result ? { result } : {}), ...(text ? { text } : {}) }
  }
  // 句中文字效果：text 必须是这句原文里有的字（写错、改写过的丢掉），同一段字只算一次
  const textFxList = (value, text) => {
    const out = []
    for (const f of Array.isArray(value) ? value : value && typeof value === 'object' ? [value] : []) {
      const piece = str(f?.text, 24)
      const style = pick(f?.style, TEXT_FX, '')
      if (!piece || !style || !text.includes(piece) || out.some(o => o.text === piece)) continue
      out.push({ text: piece, style })
      if (out.length >= caps.textFxPerLine) break
    }
    return out
  }
  // 标在不演的单元上的场景变化（【场景：天台】这类舞台指示本身 skip 了）：挪到它后面第一句要演的上。
  const nextPlayed = id => {
    for (let i = order.get(id); i < units.length; i++) if (!skip.has(units[i].id)) return units[i].id
    return ''
  }
  // 音效：音效库里的编号；亲密场面的音效名（插入、射精、触手爬过……，lib/eros.js）；内置的拟声词（砰、咚、叮……）；
  // 再认小黄油那种日文拟声和别的写法（ぬぷ、ずちゅ、どぷっ……）。都是剧场现场合成。
  const sfxOf = value => {
    const v = str(value, 40)
    if (!v) return ''
    if (effects.has(v)) return v
    if (isErosName(v)) return v
    return onomatopoeia(v) || erosSfx(v)
  }
  const carried = {}
  const lines = {}
  for (const entry of Array.isArray(raw?.lines) ? raw.lines : []) {
    const id = ref(entry?.u)
    if (unitIds.has(id) && skip.has(id)) {
      const target = nextPlayed(id)
      if (!target) continue
      const moved = carried[target] || (carried[target] = {})
      const change = sceneDelta(entry.scene); if (change) moved.scene = { ...moved.scene, ...change }
      const mode = pick(entry.mode, [...MODES, 'real'], ''); if (mode) moved.mode = mode
      const then = thenList(entry.then); if (then.length) moved.then = then
      const look = shiftList(entry.look); if (look.length) moved.look = look
      const situ = cleanSituList(entry.situ); if (situ.length) moved.situ = situ
      const cut = cutCard(entry.cut); if (cut) moved.cut = cut
      const bgm = tracks.size ? lineBgmOf(entry.bgm) : ''; if (bgm) moved.bgm = bgm
      const amb = ambiences.size ? ambOf(entry.amb) : ''; if (amb) moved.amb = amb
      const pause = pick(entry.pause, PAUSES, ''); if (pause) moved.pause = pause
      const phone = phoneOf(entry.phone); if (phone) moved.phone = phone
      // 正文自己写的音效提示（[SE：ぬぷ……]）本身不演，配上的声音和高潮那一下挪到它后面第一句
      const sfx = sfxOf(entry.sfx); if (sfx) moved.sfx = sfx
      const peak = peakOf(entry.peak); if (peak) moved.peak = peak
      continue
    }
    if (!unitIds.has(id) || (lines[id] && alias.has(str(entry?.u, 12)))) continue
    const line = {}
    const type = pick(entry.type, ['dialogue', 'narration', 'thought'], ''); if (type && type !== unitType.get(id)) line.type = type
    const sp = str(entry.sp, 24); if (sp) line.sp = sp
    const as = str(entry.as, 24); if (as && as !== sp) line.as = as
    const emo = feelings.accept(entry.emo); if (emo) line.emo = emo
    // 情绪转折时点名换动作（说话的人）：动作编号或动作名
    const pose = poseRef(entry.pose); if (pose) line.pose = pose
    const sym = pick(entry.sym, SYMBOLS, ''); if (sym) line.sym = sym
    const cam = pick(entry.cam, CAMERAS, ''); if (cam) line.cam = cam
    // 镜头对准谁（特写、推近、仰拍……）：不写就是说话的人
    const camOn = AIMED_CAMERAS.has(cam) ? str(entry.camOn, 24) : ''; if (camOn && camOn !== sp) line.camOn = camOn
    const hit = hitOf(entry.hit); if (hit) line.hit = hit
    const moment = momentOf(entry.moment); if (moment) line.moment = moment
    const phone = phoneOf(entry.phone); if (phone) line.phone = phone
    const say = pick(entry.say, DELIVERIES, ''); if (say) line.say = say
    // 重音必须是这句原文里有的字，否则丢掉（模型改写过的、写错的都不演）
    const stress = str(entry.stress, 12); if (stress && unitText.get(id).includes(stress)) line.stress = stress
    const textfx = textFxList(entry.textfx, unitText.get(id)); if (textfx.length) line.textfx = textfx
    const card = pick(entry.card, CARDS, ''); if (card) line.card = card
    const bgm = tracks.size ? lineBgmOf(entry.bgm) : ''; if (bgm) line.bgm = bgm
    const amb = ambiences.size ? ambOf(entry.amb) : ''; if (amb) line.amb = amb
    // 音效：音效库里的编号，或者内置的拟声词（砰、咚、叮……，剧场现场合成）
    const sfx = sfxOf(entry.sfx); if (sfx) line.sfx = sfx
    // 高潮那一下：climax 高潮 / cum 射精 / both 一起（lib/eros.js）
    const peak = peakOf(entry.peak); if (peak) line.peak = peak
    const pause = pick(entry.pause, PAUSES, ''); if (pause) line.pause = pause
    // 场景从这一句起的变化（地点、时段、天气、基调、光线、画面效果）；mode 进出特殊段落（real 回到现实）；cut 过场字卡。
    const change = sceneDelta(entry.scene); if (change) line.scene = change
    const mode = pick(entry.mode, [...MODES, 'real'], ''); if (mode) line.mode = mode
    const then = thenList(entry.then); if (then.length) line.then = then
    // 一轮中途变的样子（换衣服、戴上 / 摘下饰物）：从这一句起
    const look = shiftList(entry.look); if (look.length) line.look = look
    // 处境变了：从这一句起收起 / 放回这个人的处境动作（lib/pose-life.js；引擎记到设计上，设计师跟着复盘）
    const situ = cleanSituList(entry.situ); if (situ.length) line.situ = situ
    // 格式说明里 recall 写成了 "true（……）"，模型常照着写成字符串 "true"；写了基调（warm、dread……）的记下基调
    const tone = pick(entry.recall, RECALL_TONES, '')
    if ((tone || entry.recall === true || entry.recall === 'true') && !mode) line.recall = tone || true
    const cut = cutCard(entry.cut); if (cut) line.cut = cut
    // 声音的样子（电话里、广播、心灵感应、齐声……）；分屏（电话另一头的人同时出现在画面一侧）。
    const voice = pick(entry.voice, VOICES, ''); if (voice) line.voice = voice
    const split = splitScreen(entry.split); if (split) line.split = split
    const enter = enterList(entry.enter); if (enter.length) line.enter = enter
    const exit = exitList(entry.exit); if (exit.length) line.exit = exit
    const exitHow = exitHows(entry.exit); if (exitHow) line.exitHow = exitHow
    const react = reactList(entry.react); if (react.length) line.react = react
    const move = moveList(entry.move); if (move.length) line.move = move
    lines[id] = line
  }
  for (const [id, moved] of Object.entries(carried)) {
    const line = lines[id] || (lines[id] = {})
    if (moved.scene) line.scene = { ...moved.scene, ...line.scene }
    for (const key of ['mode', 'cut', 'bgm', 'amb', 'then', 'look', 'situ', 'pause', 'phone', 'sfx', 'peak']) if (moved[key] && !line[key]) line[key] = moved[key]
  }
  for (const line of Object.values(lines)) {
    for (const e of line.enter || []) {
      if (seen.has(e.name)) continue
      seen.add(e.name)
      cast.push({ name: e.name, pos: e.pos || SLOT_ORDER.find(p => !cast.some(c => c.pos === p)) || 'center' })
    }
  }
  // 不要频繁换歌：换地方、进出特殊段落、过场字卡、基调变了的那一句可以换歌（天气变了的那一句可以换环境音），
  // 别的句子一轮只留第一处换的。跟当时在放的一样的不算换。音效、镜头、停顿这些设置里限了数的，按正文顺序只留前面那么多。
  // 配乐留白不算换歌，本来就没在放的不用停；留白之后写回原来的曲子是让它早点回来，照收。
  let hushCount = 0, hushOpen = false
  let bgmNow = scene.bgm, ambNow = scene.amb, bgmFree = true, ambFree = true, sfxCount = 0, pauseCount = 0, textFxCount = 0, camCount = 0, hitCount = 0, momentCount = 0, phoneCount = 0
  let erosCount = 0, peakCount = 0, stressCount = 0
  const momentSeen = new Set()
  for (const unit of units) {
    const line = lines[unit.id]
    if (!line) continue
    const turning = Boolean(line.mode || line.cut || line.scene?.location || line.scene?.mood)
    const weather = turning || Boolean(line.scene?.weather || line.scene?.time)
    // 回到现实那一句剧场会先换回进段落前的，再按这一句写的换，所以不跟「当时在放的」比。
    if (line.bgm === 'hush') {
      if (hushCount >= caps.hush || bgmNow === 'none') delete line.bgm
      else { hushCount++; hushOpen = true }
    } else if (line.bgm) {
      // 留白之后的第一处换歌也算转折点（气氛定下来了），不占一轮那一次
      if (line.bgm === bgmNow && hushOpen && line.mode !== 'real') hushOpen = false
      else if ((line.bgm === bgmNow && line.mode !== 'real') || (!turning && !bgmFree && !hushOpen)) delete line.bgm
      else { if (!turning && !hushOpen) bgmFree = false; bgmNow = line.bgm; hushOpen = false }
    }
    if (line.amb) {
      if ((line.amb === ambNow && line.mode !== 'real') || (!weather && !ambFree)) delete line.amb
      else { if (!weather) ambFree = false; ambNow = line.amb }
    }
    // 亲密场面的音效另算名额（H 场景里的声音密）
    if (line.sfx && EROS_SFX[line.sfx] && !effects.has(line.sfx)) { if (erosCount >= caps.erosSfx) delete line.sfx; else erosCount++ }
    else if (line.sfx) { if (sfxCount >= caps.sfx) delete line.sfx; else sfxCount++ }
    if (line.peak) { if (peakCount >= caps.peaks) delete line.peak; else peakCount++ }
    if (line.stress) { if (stressCount >= caps.stress) delete line.stress; else stressCount++ }
    if (line.pause) { if (pauseCount >= caps.pauses) delete line.pause; else pauseCount++ }
    if (line.cam) { if (camCount >= caps.cams) { delete line.cam; delete line.camOn } else camCount++ }
    if (line.hit) { if (hitCount >= caps.hits) delete line.hit; else hitCount++ }
    // 新称呼、约定、交换联系方式一轮只留第一次（不是上限，是一轮里只会发生一次的事）
    if (line.moment) {
      const kind = line.moment.kind
      if (momentCount >= caps.moments || (MOMENT_ONCE.has(kind) && momentSeen.has(kind))) delete line.moment
      else { momentCount++; momentSeen.add(kind) }
    }
    if (line.phone) { if (phoneCount >= caps.phone) delete line.phone; else phoneCount++ }
    if (line.textfx) {
      line.textfx = line.textfx.slice(0, Math.max(0, caps.textFx - textFxCount))
      textFxCount += line.textfx.length
      if (!line.textfx.length) delete line.textfx
    }
  }

  const choices = (Array.isArray(raw?.choices) ? raw.choices : []).map(c => str(c, 60)).filter(Boolean).slice(0, 4)

  const images = []
  for (const entry of Array.isArray(raw?.images) ? raw.images : []) {
    const moment = str(entry?.moment, 300)
    // 自定义导演提示词里仍让导演自己写 tag 的，照旧收下，出图时不再经过插画分镜师。
    const tags = str(entry?.tags, 1500)
    if (!moment && !tags) continue
    const after = unitIds.has(ref(entry.after)) ? playable(ref(entry.after)) : lastPlayed
    const who = (Array.isArray(entry.who) ? entry.who : []).map(n => cleanName(n, 24)).filter(Boolean).slice(0, 8)
    // until：剧场里一直显示到这一句，下一句收起；不写或写在 after 前面就显示到这一轮结束。
    const until = unitIds.has(ref(entry.until)) ? playable(ref(entry.until)) : ''
    const keep = unitIds.has(until) && order.get(until) >= order.get(after) ? { until } : {}
    // 出现、收起的方式和停留时的动态：不写就是默认（溶入、静止、溶回场景）；以前那套花哨的写法换成最接近的一种。
    const look = {}
    const enter = cgIn(entry.in); if (enter) look.enter = enter
    const leave = cgOut(entry.out); if (leave) look.leave = leave
    const motion = cgMotion(entry.motion); if (motion) look.motion = motion
    const nsfw = isNsfwFlag(entry.nsfw) ? { nsfw: true } : {}
    images.push({ after, title: str(entry.title, 40), moment, who, ...keep, ...look, ...nsfw, ...(tags ? { tags, desc: str(entry.desc, 600), shape: pick(entry.shape, CG_SIZES, 'landscape') } : {}) })
  }
  const played = units.filter(u => !skip.has(u.id)).map(u => u.id)
  holdIntimateImages(images, played, intimateRuns(walkScenes({ scene }, played.map(id => lines[id] || {}))))
  fitImages(images, maxImages, played)

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

/**
 * 一个人的动作那一段：这一轮开头还在的动作（每个里有哪些情绪，导演点名换动作时写编号；处境的写上前提、靠的长期状态），
 * 后面接已经收起的（situ 开着时；导演又回到那种处境时写放回）。只有一个动作、也没有收起的不列。
 * turn：这一轮（重新整理这一轮时，上次整理记下的这一轮的收起不算）；states：这一轮开头的长期状态（靠的状态没了的也算收起）。
 */
function posesBrief(sheet, { turn, states, situ, needs, emotions, config }) {
  if (!sheet || sheet.poses.length <= 1) return ''
  const ctx = { turn, index: -1, states: needs ? states : null, before: true }
  const live = liveSheet(sheet, ctx)
  const liveIds = new Set(live.poses.map(p => p.id))
  const gone = sheet.poses.filter(p => !liveIds.has(p.id))
  const one = p => fillBook(config, 'director.cast.pose', {
    id: p.id, label: p.label,
    situ: !situ ? '' : p.kind === 'situ'
      ? fillBook(config, 'director.cast.situ', { premise: p.premise || '', needs: (p.needs || []).map(n => n.name).join('、') })
      : fillBook(config, 'director.cast.self', { needs: (p.needs || []).map(n => n.name).join('、') }),
    emotions: p.emotions.map(e => emotionLabel(e, emotions)).join('、'),
  })
  // 还没有的（复盘时为之后的处境设计的）不列；收起的、靠的状态没了的列在后面
  const off = gone.map(p => ({ p, life: poseLife(p, ctx) })).filter(x => x.life.why !== 'later')
  const list = live.poses.map(one).join(' / ')
  return list + (situ && off.length ? fillBook(config, 'director.cast.off', { list: off.map(({ p, life }) => fillBook(config, 'director.cast.offPose', { id: p.id, label: p.label, why: lifeText(life, p) })).join(' / ') }) : '')
}

/**
 * 把档案整理成给导演看的简表：固定外貌、衣橱（只列名字）、正在穿的、长期状态、临时状态，
 * 和这个人的动作（动作与表情设计里的，没有设计时用通用动作组 poseGroups；只有一个动作的不列，见 posesBrief）。
 * turn：这一轮；situ：开着「导演按剧情收起处境动作」；needs：开着「靠的长期状态没了自动收起」。
 */
export function castBrief(castList, { emotions = [], poseGroups = [], config = null, turn = Infinity, situ = false, needs = true } = {}) {
  if (!castList.length) return textOf(config, 'director.cast.none')
  return castList.map(c => {
    const sheet = sheetOf(c, poseGroups)
    return fillBook(config, 'director.cast', {
      name: c.name, global: c.global ? '全局' : '',
      appearance: c.appearance ? formatLook(c.appearanceFields || { other: c.appearance }) : pickOf(config, 'shared.person.blanks', 'noLook'),
      wardrobe: Object.keys(c.timeline?.outfits || {}).join('、'),
      outfit: c.outfit || '',
      states: (c.states || []).map(s => s.name).join('、'),
      temp: c.temp || '',
      poses: posesBrief(sheet, { turn, states: c.states || [], situ, needs, emotions, config }),
    })
  }).join('\n')
}

/**
 * 音效一节：音效库是空的（或者只有打字音）就不出现。候选按这一轮正文（和上一幕的地点、天气、时段）从库里挑；
 * heard 是听音师列出的声音（先照它找，见 soundCandidates），listen 是导演日志里听音师那条记录：记下每条找到了哪些。
 */
export function soundSection(sounds, units, previous, limits = null, config = null, heard = null, listen = null) {
  sounds = sounds.filter(s => s.kind !== 'blip')
  if (!sounds.length) return ''
  const now = ambienceAfter(previous)
  const text = [sceneWords(sceneAfter(previous)), ...units.map(u => u.text || '')].join('\n')
  const picked = soundCandidates(sounds, text, { ...candidateQuota(config), keep: now && now !== 'none' ? [now] : [], heard })
  if (heard && listen) {
    const name = id => sounds.find(s => s.id === id)?.name || id
    listen.heard = Object.fromEntries(['ambience', 'sfx'].map(kind => [kind, heard[kind].map((item, i) => ({ ...item, found: (picked.found[kind][i] || []).map(name) }))]))
  }
  const current = sounds.find(s => s.id === now)
  const ambNow = now === 'none' ? '\n' + textOf(config, 'director.sounds.silent') : current ? '\n' + fillBook(config, 'director.sounds.now', { id: current.id, name: current.name }) : ''
  const none = textOf(config, 'director.sounds.none')
  return fillBook(config, 'director.sounds', {
    ambience: picked.ambience.map(soundLine).join('\n') || none,
    sfx: picked.sfx.map(soundLine).join('\n') || none,
    ...directorLimits(limits, config),
    ambNow,
  })
}

/** 这一轮要不要先听一遍：设置里开着（默认开），并且音效或环境音比给导演看的候选多（不然全给导演看了，不用找）。 */
export function wantsListen(config, sounds) {
  if (config?.director?.listen === false) return false
  const over = overflowing((sounds || []).filter(s => s.kind !== 'blip'), candidateQuota(config))
  return over.sfx || over.ambience
}

/** 听音师最多输出这么多 token（思考模型的思考也算在里面）；设置里的最大输出更小时照设置。 */
export const LISTEN_OUTPUT = 16000

/**
 * 听音师：导演之前先读一遍这一轮正文，列出听得见的声音和去库里找它们的词（返回 cleanHeard 规整后的）。
 * trace.listen 记下这次的模型、提示词、输出、思考、用量、耗时和错误（导演日志里看）；模型拒绝最大输出时按它给的上限重试一次。
 * 失败时抛出，调用方退回按正文对词挑候选。
 */
export async function listenSounds({ llm, provider, model, source = '', units, previous, sounds = [], config, signal, trace = {}, onProgress }) {
  const noCats = textOf(config, 'listen.noCats')
  const system = textOf(config, 'listen.system')
  const user = fillBook(config, 'listen.user', {
    scene: sceneWords(sceneAfter(previous)) || textOf(config, 'listen.first'),
    ambCats: categoryBrief(sounds, 'ambience') || noCats,
    sfxCats: categoryBrief(sounds, 'sfx') || noCats,
    units: unitsForPrompt(units),
  })
  const info = provider && model ? await Promise.resolve(llm?.resolveModelInfo?.(provider, model, signal)).catch(() => null) : null
  let maxTokens = Math.min(wantedOutput(config, info), LISTEN_OUTPUT)
  const window = Number(info?.context?.contextWindow) || 0
  if (window) maxTokens = Math.max(256, Math.min(maxTokens, Math.floor(window * WINDOW_SHARE) - estimateTokens(system) - estimateTokens(user)))
  const record = trace.listen = { at: Date.now(), ms: 0, provider: provider || '', model: model || '', source, stream: llm?.streaming !== false, maxTokens, temperature: Number(config?.director?.temperature ?? 0.7), system, user, output: '', reasoning: '', usage: null, error: '', heard: null }
  onProgress?.()
  const call = () => callModel(llm, {
    provider, model, system, user, signal, maxTokens: record.maxTokens, temperature: record.temperature,
    onDelta: (kind, text) => { record[kind === 'reasoning' ? 'reasoning' : 'output'] += text; onProgress?.() },
  })
  try {
    let result
    try { result = await call() } catch (error) {
      const next = signal?.aborted ? 0 : retryMaxTokens(error, record.maxTokens, info)
      if (!next) throw error
      Object.assign(record, { maxTokens: next, output: '', reasoning: '' })
      result = await call()
    }
    record.usage = result.usage
    const heard = cleanHeard(extractJson(result.text, { close: !result.cut }), units)
    record.heard = heard
    return heard
  } catch (error) {
    record.error = String(error?.message || error).slice(0, 600)
    throw error
  } finally {
    record.ms = Date.now() - record.at
    onProgress?.()
  }
}

/** 每轮上限写进提示词的那半句（设置 →「提示词」→ 导演 → 每轮上限里能改）。 */
export const directorLimits = (limits, config = null) => limitPhrases(limits, mapOf(textOf(config, 'director.limits')))

/** 配乐一节：没有曲子就不出现。 */
function musicSection(music, previous, units = [], limits = null, config = null) {
  if (!music.length) return ''
  const now = playingAfter(previous)
  const track = music.find(t => t.id === now)
  const playing = now === 'none' ? '\n' + textOf(config, 'director.music.silent') : track ? '\n' + fillBook(config, 'director.music.now', { id: track.id, name: track.name }) : ''
  const text = [sceneWords(sceneAfter(previous)), ...units.map(u => u.text || '')].join('\n')
  return fillBook(config, 'director.music', { tracks: musicBrief(musicCandidates(music, text, { keep: now })), playing, ...directorLimits(limits, config) })
}

/** 一幕结束时还没挂的电话 { who, video }（打来、拨出之后没写挂断）；没有为空。 */
export function callAtEnd(script) {
  let call = null
  for (const line of orderedLines(script)) {
    const phone = line.phone
    if (!phone) continue
    if (phone.kind === 'call' || phone.kind === 'dial') call = { ...(phone.who ? { who: phone.who } : {}), ...(phone.video ? { video: true } : {}) }
    else if (phone.kind === 'end') call = null
  }
  return call
}

/** 给导演看的上一幕：结束时的现实场景（中途换过的按换完的算）、在场的人；结束时还在特殊段落里也说一声。 */
export function previousBrief(previous, config = null) {
  const end = sceneEnd(previous)
  if (!end) return textOf(config, 'director.previous.first')
  const s = end.real.scene
  const call = callAtEnd(previous)
  const on = (v, off = 'none') => (v && v !== off ? v : '')
  return fillBook(config, 'director.previous', {
    location: s.location || '未知', time: s.time, weather: s.weather, mood: s.mood,
    light: on(s.light, 'normal'), fx: on(s.fx), romance: on(s.romance), sense: on(s.sense), bars: s.bars === 'on' ? 'on' : '', eros: on(s.eros), tentacle: on(s.tentacle),
    who: castAtEnd(previous).map(c => `${c.name}@${c.pos}`).join('，') || '无人',
    layer: end.layer ? end.layer.mode : '', layerPlace: end.layer ? end.layer.scene.location || '同一地点' : '',
    caller: call ? `${call.who || '对方'}${call.video ? '视频' : ''}` : '',
    summary: previous.summary || '',
  })
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

export function cardContextBrief(context, limit = Infinity, config = null) {
  let text = cardContextText(context)
  if (text.length > limit) text = limit > 0 ? text.slice(0, limit) + '…' : ''
  return text ? fillBook(config, 'shared.context', { text }) : ''
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
/** 最大输出没填（自动）时至少要这么多：当前主流大模型的输出上限；模型自己报了更大的上限就用它的。 */
export const DEFAULT_OUTPUT = 128000

/** 这次请求想要的最大输出：设置里填了数就用它；没填按模型报的上限（不到 DEFAULT_OUTPUT 的按 DEFAULT_OUTPUT，装不下、被拒时再往下收）。 */
export function wantedOutput(config, info) {
  const set = Number(config?.director?.maxTokens)
  if (config?.director?.maxTokens != null && Number.isFinite(set) && set > 0) return Math.trunc(set)
  return Math.max(DEFAULT_OUTPUT, Number(info?.maxOutputTokens) || 0, Number(info?.defaultMaxTokens) || 0)
}

/** 想给模型看多少资料（字）：设置里没限就全给（超出窗口时调用方再缩）。 */
export const wantedContext = (config, length) => Math.min(length, capOf(config?.director?.contextChars))

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
export function rawSection(raw, config = null) {
  const text = String(raw || '').trim()
  return text ? fillBook(config, 'director.raw', { raw: text }) + '\n\n' : ''
}

/**
 * 提示词里插画张数那几句：{{imageLimit}}（「最多 N 张……」，不限时说不设上限）、{{nsfwRoom}}（有露骨场面时名额怎么放宽）。
 * 老的变量 {{maxImages}} {{nsfwMin}} {{nsfwMax}} 也照给（自定义提示词里可能用着）。
 */
export function imagePhrases(maxImages, config = null) {
  const limited = Number.isFinite(maxImages)
  const nsfwMax = limited ? (maxImages ? Math.max(maxImages, NSFW_MIN_IMAGES) : 0) : Infinity
  return {
    maxImages: limited ? String(maxImages) : '不限',
    nsfwMin: String(NSFW_MIN_IMAGES),
    nsfwMax: limited ? String(nsfwMax) : '不限',
    imageLimit: limited ? fillBook(config, 'director.imageLimit', { n: maxImages, nsfwMax }) : textOf(config, 'director.imageFree'),
    nsfwRoom: limited ? fillBook(config, 'director.nsfwRoom', { nsfwMax }) : '',
  }
}

// 打字音（kind 为 blip）是角色的音色，不给导演当剧情音效用
const soundIds = sounds => ({ ambienceIds: sounds.filter(s => s.kind === 'ambience').map(s => s.id), sfxIds: sounds.filter(s => s.kind !== 'ambience' && s.kind !== 'blip').map(s => s.id) })

export async function direct({ llm, provider, model, units, rawText = '', previous, castList, context, config, backend, music = [], sounds = [], listener = null, emotions = [], poseGroups = [], turn = Infinity, signal, trace = {}, onProgress }) {
  // 每轮插画：设置里没限（null）就不限，导演挑值得画的；0 是这一轮不要插画
  const maxImages = capOf(config.images?.maxPerTurn)
  const limits = config.director?.limits || null
  const phrases = directorLimits(limits, config)
  // 动作跟着处境收起、放回（lib/pose-life.js）：设置里关了就不让导演写
  const situ = config.director?.situPoses !== false
  const rules = fillBook(config, 'director.system', {
    ...phrases,
    ...imagePhrases(maxImages, config),
    styleHint: styleHintOf(config, backend),
    situ: situ ? '\n' + textOf(config, 'director.situ') : '',
  }) + (maxImages === 0 ? '\n\n' + textOf(config, 'director.noImages') : '')
  // 共用开头：系统提示词换成大家共用的那句，导演的规矩放在资料后面（资料和别的设计师一字不差，模型接口能缓存）
  const { system, role } = placeRules(config, rules)
  const notes = []
  // 音效库比候选名额大时先让听音师读一遍，候选照它列的声音找；它失败了（或没配好模型）按正文对词挑，导演照常整理。
  let heard = null
  if (wantsListen(config, sounds)) {
    const who = listener || { llm, provider, model }
    if (who.problem) notes.push(`听音师没跑（${who.problem}），音效候选按正文对词挑`)
    else {
      try {
        heard = await listenSounds({ llm: who.llm, provider: who.provider, model: who.model, source: who.source || '', units, previous, sounds: sounds.filter(s => s.kind !== 'blip'), config, signal, trace, onProgress })
      } catch (error) {
        if (signal?.aborted) throw error
        notes.push('听音师失败，音效候选按正文对词挑：' + String(error?.message || error).slice(0, 200))
      }
    }
  }
  const soundText = soundSection(sounds, units, previous, limits, config, heard, trace.listen)
  const promptFor = limit => fillBook(config, 'director.user', {
    context: cardContextBrief(context, limit, config),
    role: role ? role + '\n\n' : '',
    previous: previousBrief(previous, config),
    cast: castBrief(castList, { emotions, poseGroups, config, turn, situ, needs: config.director?.situNeeds !== false }),
    raw: rawSection(rawText, config),
    units: unitsForPrompt(units),
    music: musicSection(music, previous, units, limits, config),
    sounds: soundText,
    eros: config.ui?.eros === false ? '' : fillBook(config, 'director.eros', phrases),
    emotions: emotionBrief(emotions, textOf(config, 'director.emotions'), textOf(config, 'director.emotions.empty')),
  })
  const contextLength = cardContextText(context).length
  const wantedChars = wantedContext(config, contextLength)
  let contextChars = wantedChars
  let user = promptFor(contextChars)
  const info = provider && model ? await Promise.resolve(llm?.resolveModelInfo?.(provider, model, signal)).catch(() => null) : null
  let maxTokens = wantedOutput(config, info)
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
    try { return extractJson(result.text, { close: !result.cut }) } catch (error) { trace.attempts.at(-1).error = error.message; throw error }
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
    result = await attempt('上一次输出无法解析，带着错误再要一次', '\n\n' + fillBook(config, 'director.retry', { error: error.message }))
    raw = parse(result)
  }
  // 导演把切错的单元合并回一句（join）：之后的脚本、插画、剧场都按合并后的单元走。
  // 双语对照（dual）：原文和翻译合成一句，剧场上方小字原文、下方翻译。
  const merged = joinUnits(units, raw?.join)
  const joined = pairUnits(merged.units, raw?.dual, merged.alias)
  const script = normalizeScript(raw, joined.units, { previous, maxImages, trackIds: music.map(t => t.id), emotions, ...soundIds(sounds), alias: joined.alias, limits })
  return { script, usage: result.usage, ...(joined.units !== units ? { units: joined.units } : {}) }
}
