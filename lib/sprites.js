// 立绘提示词：后台模型读完资料（人物卡、世界书）和到这一轮为止的全部剧情，为同一角色的一批差分写英文 tag。
// 一个角色一次请求写完一批（同一套固定外貌、同一个种子），不必每张都把资料重读一遍。
// 模型不可用、拒绝或漏写时，按档案机械拼一份（固定外貌 + 衣服 + 长期状态 + 情绪 tag），保证总能出图。
// 画之前先给这个人做一份「动作与表情设计」（writeActing，见 lib/acting.js）：同样读完资料和剧情，设计他专属的动作和每种情绪的表情，
// 之后写每张差分（整张画的和只换脸的都一样）时以它为底，再按这个人此刻的处境写。
import { SPRITE_SYSTEM, SPRITE_USER, ACTING_SYSTEM, ACTING_USER, ACTING_TASK_FULL, ACTING_TASK_ADD, ACTING_TASK_NOTE, STYLE_HINTS, fill } from './prompts.js'
import { cardContextBrief, cardContextText, wantedOutput } from './director.js'
import { runWriter, storyText } from './writer.js'
import { emotionEntry, emotionTags, emotionAct, nearestOf } from './emotions.js'
import { MODE_NAMES } from './vocab.js'
import { tidyTags } from './cast.js'
import { lookLabel } from './look.js'
import { faceFor, faceTags } from './face.js'
import { cleanActing, mergeActing, completeActing, actingBrief, actingEmotionLines, actingNoteOf, NOTE_CHARS } from './acting.js'

/** 写一张差分大约要多少输出（tag 加上 JSON，模型自带思考的也算进去）：按这个和最大输出算一次写几张。 */
const TOKENS_PER_SPRITE = 1000

/** 一次请求写几张差分：按最大输出能装下多少算，能一次写完就一次写完（最大输出自动时按 128000 起算，一次一百多张）。 */
export function writerBatch(config) {
  return Math.max(1, Math.floor(wantedOutput(config, null) / TOKENS_PER_SPRITE))
}

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
  const note = actingNoteOf(person)
  if (note.text) lines.push(note.by === 'user' ? `表演笔记（玩家写的，必须遵守）：${note.text}` : `表演笔记（表演设计师读完资料写的）：${note.text}`)
  if (person.note) lines.push(`立绘备注（玩家写的，必须遵守）：${person.note}`)
  if (person.negative) lines.push(`不要出现：${person.negative}`)
  return lines.join('\n')
}

function targetLine(t, custom) {
  const e = emotionEntry(t.emotion, custom)
  const near = e.builtin ? '' : nearestOf(t.emotion, custom)
  const base = near ? `；接近 ${emotionEntry(near, custom).label}` : ''
  // 内置情绪带一段「演到全身」的动作说明（情绪库里能改）；新情绪给它替身的动作
  const act = emotionAct(t.emotion, custom)
  // 这个人的动作与表情设计（读完资料和剧情专门为他设计的）：有就照它画，不再给通用的参考
  const look = t.look ? `；这个人的表情：${t.look.desc ? `${t.look.desc}（脸 ${t.look.tags}）` : t.look.tags}` : ''
  if (t.face) {
    // 只换脸：在同组底图上只重画脸，tags 只要表情
    return `- ${t.id}：只换脸——在「${emotionEntry(t.face.anchor, custom).label}」那张「${t.face.label}」动作底图上只重画脸，身体、衣服不动；情绪「${e.label}」${base}${look || (act ? `；神情参考：${act}` : '')}；tags 只写这张脸的表情（情绪词 + 眉、眼、嘴的细节，需要时脸红、泪、汗、视线），不写外貌、衣服和动作`
  }
  const states = t.states?.length ? t.states.map(s => `${s.name}${s.tags ? `（${s.tags}）` : ''}`).join('、') : '无'
  const designed = t.pose?.designed
  // 这个人的动作（设计好的），或者设置里通用动作组写了样子的：身体照它画；都没写时给情绪的动作参考
  const shaped = t.pose && (designed || t.pose.desc || t.pose.tags)
  const guide = shaped
    ? `；${designed ? '这个人的动作' : '动作组'}「${t.pose.label}」：${t.pose.desc || '照身体 tag'}${t.pose.tags ? `（身体 ${t.pose.tags}）` : ''}${look}`
    : `${act ? `；动作参考：${act}` : ''}${look}`
  const pose = t.pose?.members ? `；这张是「${t.pose.label}」${designed ? '动作' : '动作组'}的底图${t.pose.members.length ? `：同${designed ? '一个动作' : '组'}的${t.pose.members.join('、')}会在这张上只换脸，动作就定成这一个姿势，这些情绪都要能在这个姿势上成立` : ''}` : ''
  // 段落里当时的样子：按这一套写的画，现在的伤病、后来才有的东西都不要带进来
  // 这一轮早些时候（中途才缠上发带、才换衣服之前）的样子：后来才有的东西也不要画
  const era = t.era === 'earlier' ? '；这一套是这个人这一轮早些时候、样子变化之前的样子，只画这里写的服装和状态，不要画剧情里后来才换的衣服、才戴上的饰物、才受的伤'
    : t.era ? `；这一套是「${MODE_NAMES[t.era] || t.era}」里当时的样子，只画这里写的服装和状态，不要画现在才有的伤病、饰物和神色` : ''
  return `- ${t.id}：服装 ${t.outfit ? `「${t.outfit}」${t.outfitTags ? `（${t.outfitTags}）` : ''}` : '（档案没写，按固定外貌和剧情推断）'}；长期状态 ${states}；情绪「${e.label}」${base}${guide}${pose}${era}`
}

function referenceBlock(references) {
  if (!references?.length) return ''
  return '\n【已经画好的立绘（固定外貌的写法要和它们一致）】\n' + references.map(r => `- ${r.label}：${r.tags}`).join('\n') + '\n'
}

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
        // 负面只用画风里带的：设计师写了也不收
        results.set(item.key, { tags, negative: '', writer: 'ai' })
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

/**
 * 动作与表情设计：读完资料、到这一轮为止的全部剧情和角色档案，给这个人设计一套专属的动作和每种情绪的表情（格式见 lib/acting.js）。
 * current 给了就是往已有的设计里补：emotions 里还没分到动作的放进去，已经在的只重写表情。
 * trace 照导演日志的形状记下提示词和每次尝试。
 * @returns {Promise<object|null>} 新的一份设计；没写出能用的回 null（调用方用已有的或通用动作组）
 */
export async function writeActing({ llm, provider, model, config, backend, context, story = [], turn, person, emotions, current = null, custom = [], signal, trace = {}, onProgress }) {
  let sheet = current?.poses?.length ? structuredClone({ read: current.read || '', ...(current.height ? { height: current.height } : {}), poses: current.poses, faces: current.faces || {} }) : null
  const placed = e => Boolean(sheet?.poses.some(p => p.emotions.includes(e)))
  await runWriter({
    llm, provider, model, config, signal, trace, onProgress, items: emotions.map(id => ({ id })),
    system: fill(config.director?.actingPrompt || ACTING_SYSTEM, { styleHint: STYLE_HINTS[backend] || STYLE_HINTS.novelai }),
    contextLength: cardContextText(context).length,
    storyLength: storyText(story).length,
    render: ({ list, storyChars, contextChars }) => fill(ACTING_USER, {
      context: cardContextBrief(context, contextChars),
      turn: Number.isFinite(turn) ? String(turn) : '最新',
      story: storyText(story, storyChars),
      person: personBrief({ ...person, acting: null }),
      current: sheet ? '\n' + actingBrief(sheet, custom, { withNote: !person.actingNote }) : '',
      emotions: actingEmotionLines(list.map(t => t.id), custom, sheet),
      task: sheet ? ACTING_TASK_ADD : ACTING_TASK_FULL,
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

/**
 * 「让设计师重写」表演笔记：读完资料、到这一轮为止的全部剧情和档案，只重写这个人的表演笔记（动作和表情不动）。
 * 档案里玩家写的那条不给设计师看（这次就是要换掉它）；已有的动作与表情设计给它看着写。
 * @returns {Promise<string>} 新的表演笔记；没写出来回 ''
 */
export async function writeActingNote({ llm, provider, model, config, backend, context, story = [], turn, person, current = null, custom = [], signal, trace = {}, onProgress }) {
  let read = ''
  await runWriter({
    llm, provider, model, config, signal, trace, onProgress, items: [{ id: 'read' }],
    system: fill(config.director?.actingPrompt || ACTING_SYSTEM, { styleHint: STYLE_HINTS[backend] || STYLE_HINTS.novelai }),
    contextLength: cardContextText(context).length,
    storyLength: storyText(story).length,
    render: ({ storyChars, contextChars }) => fill(ACTING_USER, {
      context: cardContextBrief(context, contextChars),
      turn: Number.isFinite(turn) ? String(turn) : '最新',
      story: storyText(story, storyChars),
      person: personBrief({ ...person, acting: null, actingNote: '' }),
      current: current?.poses?.length ? '\n' + actingBrief(current, custom, { withNote: false }) : '',
      emotions: '（这次不设计表情）',
      task: ACTING_TASK_NOTE,
    }),
    accept: json => {
      const text = String(json?.read ?? '').replace(/[\r\t]+/g, ' ').trim().slice(0, NOTE_CHARS)
      if (text) read = text
      return text ? ['read'] : []
    },
  })
  return read
}
