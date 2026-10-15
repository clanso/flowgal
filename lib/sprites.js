// 立绘提示词：后台模型读完资料（人物卡、世界书）和到这一轮为止的全部剧情，为同一角色的一批差分写英文 tag。
// 一个角色一次请求写完一批（同一套固定外貌、同一个种子），不必每张都把资料重读一遍。
// 模型不可用、拒绝或漏写时，按档案机械拼一份（固定外貌 + 衣服 + 长期状态 + 情绪 tag），保证总能出图。
// 画之前先给这个人做一份「动作与表情设计」（writeActing，见 lib/acting.js）：同样读完资料和剧情，设计他专属的动作和每种情绪的表情，
// 之后写每张差分（整张画的和只换脸的都一样）时以它为底，再按这个人此刻的处境写。
// 已经设计过、这次要画的情绪里有没设计的：补设计合进写词这一次（writeSpritesAndDesign），资料和剧情只读一遍。
// 提示词的每一段（系统提示词、用户消息、档案和每张差分那一行的写法）都在设置 →「提示词」里能改（lib/prompt-book.js）。
import { cardContextBrief, cardContextText, wantedOutput } from './director.js'
import { runWriter, storyText } from './writer.js'
import { textOf, fillBook, placeRules, styleHintOf } from './prompt-book.js'
import { pickOf, wordRules } from './prompt-words.js'
import { emotionEntry, emotionTags, emotionAct, nearestOf } from './emotions.js'
import { MODE_NAMES } from './vocab.js'
import { tidyTags } from './cast.js'
import { lookLabel } from './look.js'
import { faceFor, faceTags, isFaceTag } from './face.js'
import { splitTags, tagKey, spriteCharacterTags, wearTags } from './image/style.js'
import { cleanActing, mergeActing, reviseActing, completeActing, addPoses, actingBrief, actingEmotionLines, actingNoteOf, actingHereOf, sheetCopy, poseTags, NOTE_CHARS } from './acting.js'
import { cleanKind } from './pose-life.js'

/** 写一张差分大约要多少输出（tag 加上 JSON，模型自带思考的也算进去）：按这个和最大输出算一次写几张。 */
const TOKENS_PER_SPRITE = 1000

/** 一次请求写几张差分：按最大输出能装下多少算，能一次写完就一次写完（最大输出自动时按 128000 起算，一次一百多张）。 */
export function writerBatch(config) {
  return Math.max(1, Math.floor(wantedOutput(config, null) / TOKENS_PER_SPRITE))
}

const countTag = person => (person.gender === 'male' ? '1boy' : person.gender === 'female' ? '1girl' : '')

/** 角色档案：给表演设计师和立绘设计师看的全部设定（写法在设置 →「提示词」→ 共用 → 角色档案的写法）。 */
export function personBrief(person, config = null) {
  const blank = key => pickOf(config, 'shared.person.blanks', key)
  const note = actingNoteOf(person)
  const here = actingHereOf(person)
  return fillBook(config, 'shared.person', {
    name: person.name, gender: person.gender ? blank(person.gender) : '',
    appearance: person.appearance || blank('noLook'),
    wardrobe: Object.entries(person.timeline?.outfits || {}).map(([name, o]) => fillBook(config, 'shared.person.outfit', { name, tags: o.tags || blank('noTags') })).join('\n'),
    outfit: person.outfit || '',
    states: person.states?.length ? person.states.map(s => fillBook(config, 'shared.person.state', { name: s.name, tags: s.tags || blank('noStateTags') })).join('、') : blank('none'),
    temp: person.temp || '',
    userNote: note.text && note.by === 'user' ? note.text : '',
    aiNote: note.text && note.by !== 'user' ? note.text : '',
    userHere: here.text && here.by === 'user' ? here.text : '',
    aiHere: here.text && here.by !== 'user' ? here.text : '',
    note: person.note || '', negative: person.negative || '',
  })
}

/** 段落里当时的样子、这一轮早些时候的样子那一句（按这一套写的画，现在的伤病、后来才有的东西都不要带进来）。 */
const eraText = (t, config) => (t.era === 'earlier' ? textOf(config, 'sprite.era.earlier') : t.era ? fillBook(config, 'sprite.era.then', { mode: MODE_NAMES[t.era] || t.era }) : '')
const statesText = (t, config) => (t.states?.length ? t.states.map(s => `${s.name}${s.tags ? `（${s.tags}）` : ''}`).join('、') : pickOf(config, 'sprite.blanks', 'none'))
const outfitText = (t, config) => (t.outfit ? `「${t.outfit}」${t.outfitTags ? `（${t.outfitTags}）` : ''}` : pickOf(config, 'sprite.blanks', 'noOutfit'))

/** 要画的差分一行（写法在设置 →「提示词」→ 立绘设计师 → 每张差分那一行）；玩家对这张写了要求（ask）的接在最后。 */
function targetLine(t, custom, config = null) {
  const line = lineOf(t, custom, config)
  return t.ask ? line + fillBook(config, 'sprite.ask', { text: t.ask }) : line
}

function lineOf(t, custom, config = null) {
  const e = emotionEntry(t.emotion, custom)
  const nearest = e.builtin ? '' : nearestOf(t.emotion, custom)
  const near = nearest ? emotionEntry(nearest, custom).label : ''
  // 不按动作库（人物志里自由画的一张）：动作照玩家的要求自由设计，另写这个动作的名字、描述、身体 tag
  if (t.free) {
    const look = t.look ? (t.look.desc ? fillBook(config, 'sprite.look', { desc: t.look.desc, tags: t.look.tags }) : fillBook(config, 'sprite.lookTags', { tags: t.look.tags })) : ''
    return fillBook(config, 'sprite.line.free', { id: t.id, outfit: outfitText(t, config), states: statesText(t, config), emotion: e.label, use: e.use, near, look, era: eraText(t, config) })
  }
  // 还没设计的情绪（顺手补设计时）：先在 acting 里设计，再按放进的动作写
  if (t.design) return fillBook(config, t.whole ? 'sprite.line.designWhole' : 'sprite.line.design', { id: t.id, emotion: e.label, use: e.use, near, outfit: outfitText(t, config), states: statesText(t, config), era: eraText(t, config) })
  // 内置情绪带一段「演到全身」的动作说明（情绪库里能改）；新情绪给它替身的动作
  const act = emotionAct(t.emotion, custom)
  // 这个人的动作与表情设计（读完资料和剧情专门为他设计的）：有就照它画，不再给通用的参考
  const look = t.look ? (t.look.desc ? fillBook(config, 'sprite.look', { desc: t.look.desc, tags: t.look.tags }) : fillBook(config, 'sprite.lookTags', { tags: t.look.tags })) : ''
  if (t.face) {
    // 只换脸：在同组底图上只重画脸，tags 只要表情
    return fillBook(config, 'sprite.line.face', { id: t.id, anchor: emotionEntry(t.face.anchor, custom).label, pose: t.face.label, emotion: e.label, use: e.use, near, look: look || (act ? fillBook(config, 'sprite.faceAct', { act }) : '') })
  }
  const designed = t.pose?.designed
  // 这个人的动作（设计好的），或者设置里通用动作组写了样子的：身体照它画；都没写时给情绪的动作参考
  const shaped = t.pose && (designed || t.pose.desc || t.pose.tags)
  const guide = shaped
    ? fillBook(config, designed ? 'sprite.guide.designed' : 'sprite.guide.group', { pose: t.pose.label, desc: t.pose.desc || pickOf(config, 'sprite.blanks', 'poseDesc'), tags: t.pose.tags || '' }) + look
    : (act ? fillBook(config, 'sprite.guide.act', { act }) : '') + look
  const base = t.pose?.members ? fillBook(config, designed ? 'sprite.base.designed' : 'sprite.base.group', { pose: t.pose.label, members: t.pose.members.join('、') }) : ''
  return fillBook(config, 'sprite.line.whole', { id: t.id, outfit: outfitText(t, config), states: statesText(t, config), emotion: e.label, use: e.use, near, guide, base, era: eraText(t, config) })
}

function referenceBlock(references, config = null) {
  if (!references?.length) return ''
  return '\n' + fillBook(config, 'sprite.references', { list: references.map(r => `- ${r.label}：${r.tags}`).join('\n') }) + '\n'
}

/** 规矩放进用户消息时（共用开头）前后各空一行。 */
const roleBlock = role => (role ? '\n' + role + '\n' : '')

/** 没有模型可用时的机械拼法：有动作与表情设计就拼设计好的身体和脸，没有就拼内置的情绪 tag。 */
export function fallbackTags(person, target, custom = []) {
  if (target.face) return target.look?.tags || faceFor(target.emotion, '', '', custom).tags // 只换脸的只要表情
  const face = target.look?.tags || emotionTags(target.emotion, custom, { neutral: target.emotion === 'neutral' })
  const body = target.pose?.tags || '' // 设计好的动作、写了身体 tag 的通用动作组
  return tidyTags([countTag(person), person.appearance, target.outfitTags, ...(target.states || []).map(s => s.tags), face, body].filter(Boolean).join(', '))
}

/**
 * 写一批差分的提示词。
 * targets: [{ key, emotion, outfit, outfitTags, states }]，同一套固定外貌。
 * story: [{ turn, text }]，到这一轮为止的剧情。trace 照导演日志的形状记下提示词和每次尝试。
 * @returns {Promise<Map<string, { tags: string, negative: string, writer: 'ai' | 'fallback', raw?: string }>>} raw 是设计师写的原样（过滤之前）
 */
export async function writeSpritePrompts(args) {
  return (await writeSprites(args)).results
}

/**
 * 补设计合进写词：已经给这个人设计过、这次要画的情绪里有没设计的（或者 redo 要重新设计表情的），同一个请求里先补设计再写词。
 * design：{ emotions: 要设计的情绪, current: 已有的设计 }；targets 里还没设计的那几条标 design: true（先设计再写：放进哪个动作由设计决定，
 * 调用方拿到新设计再按动作定它是整张画还是只换脸，tags 收原样 raw）。
 * @returns {Promise<{ results: Map, sheet: object | null }>} sheet 是补好的设计（没写出能用的为 null，调用方照已有的画）
 */
export async function writeSpritesAndDesign(args) {
  return writeSprites(args)
}

async function writeSprites({ llm, provider, model, config, backend, context, story = [], turn, person, targets, references = [], custom = [], design = null, signal, trace = {}, onProgress }) {
  const results = new Map()
  const items = targets.map((t, i) => ({ ...t, id: 's' + (i + 1) }))
  const styleHint = styleHintOf(config, backend)
  const { system, role } = placeRules(config, fillBook(config, 'sprite.system', { styleHint }))
  let sheet = sheetCopy(design?.current)
  const designing = Boolean(design && sheet && design.emotions?.length)
  const designText = designing
    ? '\n' + fillBook(config, 'sprite.design', {
      rules: fillBook(config, 'acting.system', { styleHint }),
      current: actingBrief(sheet, custom, { withNote: !person.actingNote, withNow: !person.noteHere, config, ctx: design.ctx || null }),
      emotions: actingEmotionLines(design.emotions, custom, sheet, config),
      task: textOf(config, 'acting.task.add'),
    }) + '\n\n' + textOf(config, 'sprite.combo') + '\n'
    : ''
  let designed = false
  await runWriter({
    llm, provider, model, config, signal, trace, onProgress, items, system,
    contextLength: cardContextText(context).length,
    storyLength: storyText(story, Infinity, config).length,
    render: ({ list, storyChars, contextChars }) => fillBook(config, 'sprite.user', {
      context: cardContextBrief(context, contextChars, config),
      turn: Number.isFinite(turn) ? String(turn) : '最新',
      story: storyText(story, storyChars, config),
      person: personBrief(person, config),
      role: roleBlock(role),
      design: designText,
      references: referenceBlock(references, config),
      targets: list.map(t => targetLine(t, custom, config)).join('\n'),
    }),
    accept: json => {
      // 补设计：表演设计师那份并进已有的设计（只收这次要设计的情绪）
      if (designing && json?.acting && typeof json.acting === 'object') {
        sheet = mergeActing(sheet, json.acting, { allowed: design.emotions }).sheet
        designed = true
      }
      const got = []
      for (const entry of Array.isArray(json.sprites) ? json.sprites : []) {
        const item = items.find(t => t.id === String(entry?.key || '').trim())
        const written = typeof entry?.tags === 'string' ? tidyTags(entry.tags).slice(0, 2000) : ''
        // 只换脸的只留脸上的表情（设计师顺手写了外貌、衣服、动作也去掉）；一个表情 tag 都没有就当没写。
        // 先设计再写的：整张画还是只换脸要等设计定了才知道，收原样
        const tags = item?.face ? faceTags(written) : written
        if (!item || !tags) continue
        // 负面只用画风里带的：设计师写了也不收。自由画的那张另收它写的动作（名字、描述、身体 tag）
        const pose = item.free ? freePose(entry?.pose) : null
        results.set(item.key, { tags, negative: '', writer: 'ai', raw: written, ...(pose ? { pose } : {}) })
        got.push(item.id)
      }
      return got
    },
  })
  for (const t of items) if (!t.design && !results.has(t.key)) results.set(t.key, { tags: fallbackTags(person, t, custom), negative: '', writer: 'fallback' })
  return { results, sheet: designing && designed ? completeActing(sheet, design.emotions, custom) : null }
}

/** 自由画的那张设计师另写的动作：{ label, desc, tags（只留身体）, kind }，什么都没写回 null。 */
export function freePose(raw) {
  if (!raw || typeof raw !== 'object') return null
  const clip = (v, n) => String(v ?? '').replace(/[\r\n\t]+/g, ' ').trim().slice(0, n)
  const out = { label: clip(raw.label, 12), desc: clip(raw.desc, 200), tags: poseTags(raw.tags), kind: cleanKind(raw.kind) }
  return out.label || out.desc || out.tags ? out : null
}

/**
 * 自由画的那张没写动作（玩家自己写的词、模型没写 pose）：从整张的词里摘出身体的那部分——去掉固定外貌、这套衣服和长期状态，
 * 再按动作的规矩只留身体（脸、构图、发色瞳色去掉）。
 */
export function bodyFromTags(tags, person, target = {}) {
  const fixed = new Set(splitTags([person?.appearance, target.outfitTags, ...(target.states || []).map(s => s.tags)].filter(Boolean).join(', ')).map(tagKey))
  return poseTags(splitTags(tags).filter(t => !fixed.has(tagKey(t))).join(', '))
}

/**
 * 先设计再写的那几条，拿到新设计、定了动作以后：只换脸的只留脸上的表情；整张画的要有脸以外的词（设计师只写了表情的不算写了）。
 * 回能用的 tags，不能用回 ''（调用方再按普通的差分要一次）。
 */
export function designedTags(raw, target) {
  if (!raw) return ''
  if (target.face) return faceTags(raw)
  return splitTags(raw).some(t => !isFaceTag(t)) ? raw : ''
}

/**
 * 导演日志里每张差分的「设计师写的 → 实际发出的」：去掉了哪些词（为什么）、换掉了哪些。
 * 只换脸的发出去的是 faceFor 收过的表情；整张画的是 spriteCharacterTags（固定外貌照档案、这套衣服照衣橱锁住、构图归插件、
 * 跟档案冲突的发色瞳色和衣服颜色去掉、收轻）。
 */
export function tagReport(raw, target, person, custom = []) {
  if (!raw) return null
  const rules = wordRules()
  const wear = wearTags(target)
  const sent = target.face ? faceFor(target.emotion, raw, '', custom).tags : spriteCharacterTags({ ...person, wear }, raw, target.emotion)
  const kept = new Set(splitTags(sent).map(tagKey))
  const fixed = new Set(splitTags(person?.appearance).map(tagKey).map(k => (k.match(rules.colorFeature) || [])[1]).filter(Boolean))
  const pieces = new Set(splitTags(wear).map(tagKey).map(k => (k.match(rules.colorWear) || [])[1]).filter(Boolean))
  const removed = [], replaced = [], seen = new Set()
  for (const tag of splitTags(raw)) {
    const key = tagKey(tag)
    if (!key || seen.has(key)) continue
    seen.add(key)
    if (kept.has(key)) continue
    const softer = rules.softer.get(key)
    if (softer && kept.has(tagKey(softer))) { replaced.push({ from: tag, to: softer }); continue }
    const color = key.match(rules.colorFeature)
    const piece = key.match(rules.colorWear)
    const why = rules.harsh.has(key) ? '画出来吓人，收掉'
      : target.face && !isFaceTag(tag) ? '不是脸上的（只换脸只留表情）'
      : rules.spriteDrop.test(key) ? '构图、背景、人数归插件管'
      : color && fixed.has(color[1]) ? '跟档案的发色瞳色不一样'
      : piece && pieces.has(piece[1]) ? '跟衣橱里这套衣服的那一件颜色不一样'
      : '重复'
    if (why !== '重复') removed.push({ tag, why })
  }
  return { sent, removed, replaced }
}

/** 差分的中文说明：「校服 · 怀孕 · 带着烦躁思考」。 */
export function variantLabel(target, custom = []) {
  return `${lookLabel(target)} · ${emotionEntry(target.emotion, custom).label}`
}

/**
 * 动作与表情设计：读完资料、到这一轮为止的全部剧情和角色档案，给这个人设计一套专属的动作和每种情绪的表情（格式见 lib/acting.js）。
 * current 给了就是往已有的设计里补：emotions 里还没分到动作的放进去，已经在的只重写表情。
 * trace 照导演日志的形状记下提示词和每次尝试。
 * @returns {Promise<object|null>} 新的一份设计；没写出能用的回 null（调用方用已有的或通用动作组）
 */
export async function writeActing({ llm, provider, model, config, backend, context, story = [], turn, person, emotions, current = null, custom = [], ctx = null, count = 0, ask = '', signal, trace = {}, onProgress }) {
  let sheet = sheetCopy(current)
  const placed = e => Boolean(sheet?.poses.some(p => p.emotions.includes(e)))
  const rules = placeRules(config, fillBook(config, 'acting.system', { styleHint: styleHintOf(config, backend) }))
  await runWriter({
    llm, provider, model, config, signal, trace, onProgress, items: emotions.map(id => ({ id })),
    system: rules.system,
    contextLength: cardContextText(context).length,
    storyLength: storyText(story, Infinity, config).length,
    render: ({ list, storyChars, contextChars }) => fillBook(config, 'acting.user', {
      context: cardContextBrief(context, contextChars, config),
      turn: Number.isFinite(turn) ? String(turn) : '最新',
      story: storyText(story, storyChars, config),
      person: personBrief({ ...person, acting: null }, config),
      role: roleBlock(rules.role),
      current: sheet ? '\n' + actingBrief(sheet, custom, { withNote: !person.actingNote, withNow: !person.noteHere, config, ctx }) : '',
      emotions: actingEmotionLines(list.map(t => t.id), custom, sheet, config),
      // 人物志里整套设计时填的动作数、写的要求（漏写了补要时只带要求）
      task: textOf(config, sheet ? 'acting.task.add' : 'acting.task.full') + actingAsk(config, { count: sheet ? 0 : count, ask }),
    }),
    accept: json => {
      if (!sheet) {
        sheet = cleanActing(json, { allowed: emotions, soften: true })
        return sheet ? emotions.filter(e => placed(e) && sheet.faces[e]) : []
      }
      const merged = mergeActing(sheet, json, { allowed: emotions })
      sheet = merged.sheet
      return emotions.filter(e => placed(e) && merged.touched.has(e))
    },
  })
  return sheet ? completeActing(sheet, emotions, custom) : null
}

/** 接在任务后面的玩家要求：整套设计定了动作数的那一句、追加要求（都没有回 ''）。 */
export function actingAsk(config, { count = 0, ask = '' } = {}) {
  const n = Math.floor(Number(count))
  const text = String(ask ?? '').trim()
  return (n > 0 ? '\n' + fillBook(config, 'acting.count', { count: String(n) }) : '') + (text ? '\n\n' + fillBook(config, 'acting.ask', { text }) : '')
}

/**
 * 让 AI 加动作（人物志「动作与表情」）：读完资料、到这一轮为止的全部剧情和档案，在已有设计上新加 count 个动作（lib/acting.js 的 addPoses），
 * 已有的动作和表情不动；ask 是玩家写的追加要求。emotions：这个人的全部情绪（新动作里能放的）；ctx：已有动作此刻在不在。
 * @returns {Promise<{ sheet, added } | null>} 一个能用的新动作都没写出来回 null
 */
export async function writeActingMore({ llm, provider, model, config, backend, context, story = [], turn, person, current, emotions = [], count = 1, ask = '', custom = [], ctx = null, signal, trace = {}, onProgress }) {
  const base = sheetCopy(current)
  if (!base) return null
  const n = Math.max(1, Math.floor(Number(count)) || 1)
  let out = null
  const rules = placeRules(config, fillBook(config, 'acting.system', { styleHint: styleHintOf(config, backend) }))
  await runWriter({
    llm, provider, model, config, signal, trace, onProgress, items: [{ id: 'more' }],
    system: rules.system,
    contextLength: cardContextText(context).length,
    storyLength: storyText(story, Infinity, config).length,
    render: ({ storyChars, contextChars }) => fillBook(config, 'acting.user', {
      context: cardContextBrief(context, contextChars, config),
      turn: Number.isFinite(turn) ? String(turn) : '最新',
      story: storyText(story, storyChars, config),
      person: personBrief({ ...person, acting: null }, config),
      role: roleBlock(rules.role),
      current: '\n' + actingBrief(base, custom, { withNote: !person.actingNote, withNow: !person.noteHere, config, ctx }),
      emotions: actingEmotionLines(emotions, custom, base, config),
      task: fillBook(config, 'acting.task.more', { count: String(n) }) + actingAsk(config, { ask }),
    }),
    accept: json => {
      if (!json || typeof json !== 'object') return []
      const r = addPoses(base, json, { allowed: emotions, count: n })
      if (!r.added.length) return []
      out = r
      return ['more']
    },
  })
  return out
}

/**
 * 「让设计师重写」表演笔记：读完资料、到这一轮为止的全部剧情和档案，只重写这个人的表演笔记（动作和表情不动）。
 * 档案里玩家写的那条不给设计师看（这次就是要换掉它）；已有的动作与表情设计给它看着写。
 * @returns {Promise<string>} 新的表演笔记；没写出来回 ''
 */
export async function writeActingNote({ llm, provider, model, config, backend, context, story = [], turn, person, current = null, custom = [], signal, trace = {}, onProgress }) {
  let read = ''
  const rules = placeRules(config, fillBook(config, 'acting.system', { styleHint: styleHintOf(config, backend) }))
  await runWriter({
    llm, provider, model, config, signal, trace, onProgress, items: [{ id: 'read' }],
    system: rules.system,
    contextLength: cardContextText(context).length,
    storyLength: storyText(story, Infinity, config).length,
    render: ({ storyChars, contextChars }) => fillBook(config, 'acting.user', {
      context: cardContextBrief(context, contextChars, config),
      turn: Number.isFinite(turn) ? String(turn) : '最新',
      story: storyText(story, storyChars, config),
      person: personBrief({ ...person, acting: null, actingNote: '' }, config),
      role: roleBlock(rules.role),
      current: current?.poses?.length ? '\n' + actingBrief(current, custom, { withNote: false, withNow: !person.noteHere, config }) : '',
      emotions: textOf(config, 'acting.noEmotions'),
      task: textOf(config, 'acting.task.note'),
    }),
    accept: json => {
      const text = String(json?.read ?? '').replace(/[\r\t]+/g, ' ').trim().slice(0, NOTE_CHARS)
      if (text) read = text
      return text ? ['read'] : []
    },
  })
  return read
}

/**
 * 在已有设计上改一次（lib/acting.js 的 reviseActing）：task 'review' 处境变了复盘、'world' 到了新世界、'label' 给老设计标本性和处境。
 * 读完资料、到这一轮为止的全部剧情和档案。emotions：要（重新）安家的情绪；allowed：这次能收的情绪（新动作可以装别的常用情绪）；
 * ctx：已有设计里每个动作此刻在不在（收起的写明为什么，lib/pose-life.js）；vars：任务那一段的 {{turn}} {{changes}} {{newPoses}}；
 * from：复盘时新动作、新放进去的情绪从哪一句起才有。
 * @returns {Promise<{ sheet, off, why } | null>} 没写出能用的回 null（调用方照旧）
 */
export async function writeActingRevise({ llm, provider, model, config, backend, context, story = [], turn, person, current, task = 'review', emotions = [], allowed = null, ctx = null, vars = {}, from = null, custom = [], signal, trace = {}, onProgress }) {
  const base = sheetCopy(current)
  if (!base) return null
  let out = null
  const rules = placeRules(config, fillBook(config, 'acting.system', { styleHint: styleHintOf(config, backend) }))
  const keep = allowed ? [...new Set([...allowed, ...emotions])] : null
  await runWriter({
    llm, provider, model, config, signal, trace, onProgress, items: [{ id: task }],
    system: rules.system,
    contextLength: cardContextText(context).length,
    storyLength: storyText(story, Infinity, config).length,
    render: ({ storyChars, contextChars }) => fillBook(config, 'acting.user', {
      context: cardContextBrief(context, contextChars, config),
      turn: Number.isFinite(turn) ? String(turn) : '最新',
      story: storyText(story, storyChars, config),
      person: personBrief({ ...person, acting: null }, config),
      role: roleBlock(rules.role),
      current: '\n' + actingBrief(base, custom, { withNote: !person.actingNote, withNow: !person.noteHere, config, ctx }),
      emotions: emotions.length ? actingEmotionLines(emotions, custom, null, config) : textOf(config, 'acting.noEmotions'),
      task: fillBook(config, 'acting.task.' + task, vars),
    }),
    accept: json => {
      if (!json || typeof json !== 'object') return []
      const r = reviseActing(base, json, { allowed: keep, task, from })
      if (!r.sheet) return []
      out = r
      return [task]
    },
  })
  if (!out) return null
  return { ...out, sheet: completeActing(out.sheet, emotions, custom) }
}
