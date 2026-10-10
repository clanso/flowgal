// 立绘提示词：后台模型读完资料（人物卡、世界书）和到这一轮为止的全部剧情，为同一角色的一批差分写英文 tag。
// 一个角色一次请求写完一批（同一套固定外貌、同一个种子），不必每张都把资料重读一遍。
// 模型不可用、拒绝或漏写时，按档案机械拼一份（固定外貌 + 衣服 + 长期状态 + 情绪 tag），保证总能出图。
import { SPRITE_SYSTEM, SPRITE_USER, STYLE_HINTS, fill } from './prompts.js'
import { cardContextBrief, cardContextText } from './director.js'
import { runWriter, storyText } from './writer.js'
import { emotionEntry } from './emotions.js'
import { EMOTION_TAGS, EMOTION_ACTS } from './vocab.js'
import { tidyTags } from './cast.js'
import { lookLabel } from './look.js'
import { faceFor, faceTags } from './face.js'

/** 一次最多写这么多张差分；再多分几次请求。 */
export const WRITER_BATCH = 12

const GENDER = { female: '女', male: '男', other: '其他' }
const countTag = person => (person.gender === 'male' ? '1boy' : person.gender === 'female' ? '1girl' : '')

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
  // 内置情绪带一段「演到全身」的动作说明；新情绪用它自己的神情描述，接近的内置情绪的动作也给上
  const act = EMOTION_ACTS[t.emotion] || EMOTION_ACTS[e.base] || ''
  if (t.face) {
    // 只换脸：在同组底图上只重画脸，tags 只要表情
    return `- ${t.id}：只换脸——在「${emotionEntry(t.face.anchor, custom).label}」那张「${t.face.label}」动作底图上只重画脸，身体、衣服不动；情绪「${e.label}」${e.desc ? `：${e.desc}` : ''}${base}${act ? `；神情参考：${act}` : ''}；tags 只写这张脸的表情（情绪词 + 眉、眼、嘴的细节，需要时脸红、泪、汗、视线），不写外貌、衣服和动作`
  }
  const states = t.states?.length ? t.states.map(s => `${s.name}${s.tags ? `（${s.tags}）` : ''}`).join('、') : '无'
  const pose = t.pose ? `；这张是「${t.pose.label}」动作组的底图${t.pose.members.length ? `：同组的${t.pose.members.join('、')}会在这张上只换脸，动作就定成这一个姿势，这些情绪都要能在这个姿势上成立` : ''}` : ''
  return `- ${t.id}：服装 ${t.outfit ? `「${t.outfit}」${t.outfitTags ? `（${t.outfitTags}）` : ''}` : '（档案没写，按固定外貌和剧情推断）'}；长期状态 ${states}；情绪「${e.label}」${e.desc ? `：${e.desc}` : ''}${base}${act ? `；动作参考：${act}` : ''}${pose}`
}

function referenceBlock(references) {
  if (!references?.length) return ''
  return '\n【已经画好的立绘（固定外貌的写法要和它们一致）】\n' + references.map(r => `- ${r.label}：${r.tags}`).join('\n') + '\n'
}

/** 没有模型可用时的机械拼法。 */
export function fallbackTags(person, target, custom = []) {
  if (target.face) return faceFor(target.emotion, '', '', custom).tags // 只换脸的只要表情
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
  const items = targets.map((t, i) => ({ ...t, id: 's' + (i + 1) }))
  await runWriter({
    llm, provider, model, config, signal, trace, onProgress, items,
    system: fill(config.director?.spritePrompt || SPRITE_SYSTEM, { styleHint: STYLE_HINTS[backend] || STYLE_HINTS.novelai }),
    contextLength: cardContextText(context).length,
    storyLength: storyText(story).length,
    render: ({ list, storyChars, contextChars }) => fill(SPRITE_USER, {
      context: cardContextBrief(context, contextChars),
      turn: Number.isFinite(turn) ? String(turn) : '最新',
      story: storyText(story, storyChars),
      person: personBrief(person),
      references: referenceBlock(references),
      targets: list.map(t => targetLine(t, custom)).join('\n'),
    }),
    accept: json => {
      const got = []
      for (const entry of Array.isArray(json.sprites) ? json.sprites : []) {
        const item = items.find(t => t.id === String(entry?.key || '').trim())
        const written = typeof entry?.tags === 'string' ? tidyTags(entry.tags).slice(0, 2000) : ''
        // 只换脸的只留脸上的表情（设计师顺手写了外貌、衣服、动作也去掉）；一个表情 tag 都没有就当没写
        const tags = item?.face ? faceTags(written) : written
        if (!item || !tags) continue
        results.set(item.key, { tags, negative: typeof entry.negative === 'string' ? tidyTags(entry.negative).slice(0, 600) : '', writer: 'ai' })
        got.push(item.id)
      }
      return got
    },
  })
  for (const t of items) if (!results.has(t.key)) results.set(t.key, { tags: fallbackTags(person, t, custom), negative: '', writer: 'fallback' })
  return results
}

/** 差分的中文说明：「校服 · 怀孕 · 带着烦躁思考」。 */
export function variantLabel(target, custom = []) {
  return `${lookLabel(target)} · ${emotionEntry(target.emotion, custom).label}`
}
