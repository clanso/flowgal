// 立绘提示词：后台模型读完资料（人物卡、世界书）和到这一轮为止的全部剧情，为同一角色的一批差分写英文 tag。
// 一个角色一次请求写完一批（同一套固定外貌、同一个种子），不必每张都把资料重读一遍。
// 模型不可用、拒绝或漏写时，按档案机械拼一份（固定外貌 + 衣服 + 长期状态 + 情绪 tag），保证总能出图。
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

/** 写一张差分大约要多少输出（tag 加上 JSON，模型自带思考的也算进去）：按这个和最大输出算一次写几张。 */
const TOKENS_PER_SPRITE = 1000

/** 一次请求写几张差分：按最大输出能装下多少算，能一次写完就一次写完（最大输出自动时按 128000 起算，一次一百多张）。 */
export function writerBatch(config) {
  return Math.max(1, Math.floor(wantedOutput(config, null) / TOKENS_PER_SPRITE))
}

const countTag = person => (person.gender === 'male' ? '1boy' : person.gender === 'female' ? '1girl' : '')

/** 角色档案：给立绘设计师看的全部设定（写法在设置 →「提示词」→ 共用 → 角色档案的写法）。 */
export function personBrief(person, config = null) {
  const blank = key => pickOf(config, 'shared.person.blanks', key)
  return fillBook(config, 'shared.person', {
    name: person.name, gender: person.gender ? blank(person.gender) : '',
    appearance: person.appearance || blank('noLook'),
    wardrobe: Object.entries(person.timeline?.outfits || {}).map(([name, o]) => fillBook(config, 'shared.person.outfit', { name, tags: o.tags || blank('noTags') })).join('\n'),
    outfit: person.outfit || '',
    states: person.states?.length ? person.states.map(s => fillBook(config, 'shared.person.state', { name: s.name, tags: s.tags || blank('noStateTags') })).join('、') : blank('none'),
    temp: person.temp || '',
    note: person.note || '', negative: person.negative || '',
  })
}

/** 段落里当时的样子、这一轮早些时候的样子那一句（按这一套写的画，现在的伤病、后来才有的东西都不要带进来）。 */
const eraText = (t, config) => (t.era === 'earlier' ? textOf(config, 'sprite.era.earlier') : t.era ? fillBook(config, 'sprite.era.then', { mode: MODE_NAMES[t.era] || t.era }) : '')
const statesText = (t, config) => (t.states?.length ? t.states.map(s => `${s.name}${s.tags ? `（${s.tags}）` : ''}`).join('、') : pickOf(config, 'sprite.blanks', 'none'))
const outfitText = (t, config) => (t.outfit ? `「${t.outfit}」${t.outfitTags ? `（${t.outfitTags}）` : ''}` : pickOf(config, 'sprite.blanks', 'noOutfit'))

/** 要画的差分一行（写法在设置 →「提示词」→ 立绘设计师 → 每张差分那一行）。 */
function targetLine(t, custom, config = null) {
  const e = emotionEntry(t.emotion, custom)
  const nearest = e.builtin ? '' : nearestOf(t.emotion, custom)
  const near = nearest ? emotionEntry(nearest, custom).label : ''
  // 内置情绪带一段「演到全身」的动作说明（情绪库里能改）；新情绪给它替身的动作
  const act = emotionAct(t.emotion, custom)
  if (t.face) {
    // 只换脸：在同组底图上只重画脸，tags 只要表情
    return fillBook(config, 'sprite.line.face', { id: t.id, anchor: emotionEntry(t.face.anchor, custom).label, pose: t.face.label, emotion: e.label, use: e.use, near, look: act ? fillBook(config, 'sprite.faceAct', { act }) : '' })
  }
  // 设置里通用动作组写了样子的：身体照它画；没写时给情绪的动作参考
  const shaped = t.pose && (t.pose.desc || t.pose.tags)
  const guide = shaped
    ? fillBook(config, 'sprite.guide.group', { pose: t.pose.label, desc: t.pose.desc || pickOf(config, 'sprite.blanks', 'poseDesc'), tags: t.pose.tags || '' })
    : act ? fillBook(config, 'sprite.guide.act', { act }) : ''
  const base = t.pose?.members ? fillBook(config, 'sprite.base.group', { pose: t.pose.label, members: t.pose.members.join('、') }) : ''
  return fillBook(config, 'sprite.line.whole', { id: t.id, outfit: outfitText(t, config), states: statesText(t, config), emotion: e.label, use: e.use, near, guide, base, era: eraText(t, config) })
}

function referenceBlock(references, config = null) {
  if (!references?.length) return ''
  return '\n' + fillBook(config, 'sprite.references', { list: references.map(r => `- ${r.label}：${r.tags}`).join('\n') }) + '\n'
}

/** 规矩放进用户消息时（共用开头）前后各空一行。 */
const roleBlock = role => (role ? '\n' + role + '\n' : '')

/** 没有模型可用时的机械拼法：内置的情绪 tag，加上通用动作组写了的身体 tag。 */
export function fallbackTags(person, target, custom = []) {
  if (target.face) return faceFor(target.emotion, '', '', custom).tags // 只换脸的只要表情
  const face = emotionTags(target.emotion, custom, { neutral: target.emotion === 'neutral' })
  const body = target.pose?.tags || '' // 写了身体 tag 的通用动作组
  return tidyTags([countTag(person), person.appearance, target.outfitTags, ...(target.states || []).map(s => s.tags), face, body].filter(Boolean).join(', '))
}

/**
 * 写一批差分的提示词。
 * targets: [{ key, emotion, outfit, outfitTags, states }]，同一套固定外貌。
 * story: [{ turn, text }]，到这一轮为止的剧情。trace 照导演日志的形状记下提示词和每次尝试。
 * @returns {Promise<Map<string, { tags: string, negative: string, writer: 'ai' | 'fallback', raw?: string }>>} raw 是设计师写的原样（过滤之前）
 */
export async function writeSpritePrompts({ llm, provider, model, config, backend, context, story = [], turn, person, targets, references = [], custom = [], signal, trace = {}, onProgress }) {
  const results = new Map()
  const items = targets.map((t, i) => ({ ...t, id: 's' + (i + 1) }))
  const styleHint = styleHintOf(config, backend)
  const { system, role } = placeRules(config, fillBook(config, 'sprite.system', { styleHint }))
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
      references: referenceBlock(references, config),
      targets: list.map(t => targetLine(t, custom, config)).join('\n'),
    }),
    accept: json => {
      const got = []
      for (const entry of Array.isArray(json.sprites) ? json.sprites : []) {
        const item = items.find(t => t.id === String(entry?.key || '').trim())
        const written = typeof entry?.tags === 'string' ? tidyTags(entry.tags).slice(0, 2000) : ''
        // 只换脸的只留脸上的表情（设计师顺手写了外貌、衣服、动作也去掉）；一个表情 tag 都没有就当没写。
        const tags = item?.face ? faceTags(written) : written
        if (!item || !tags) continue
        // 负面只用画风里带的：设计师写了也不收
        results.set(item.key, { tags, negative: '', writer: 'ai', raw: written })
        got.push(item.id)
      }
      return got
    },
  })
  for (const t of items) if (!results.has(t.key)) results.set(t.key, { tags: fallbackTags(person, t, custom), negative: '', writer: 'fallback' })
  return results
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
