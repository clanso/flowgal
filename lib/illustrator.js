// 插画分镜师：导演挑好要画的瞬间后，后台模型读资料、此前的剧情、这一轮的正文和角色档案，
// 把每个瞬间写成「Base + 每人一个角色块」的提示词（参考柏宝绘的 NovelAI V4.5 / V5 分人写法）。
// 人名只当标签：发给生图模型前，插件按名字补上档案里的固定外貌，并把混进 tag / nl 的人名删掉。
import { CG_SYSTEM, CG_USER, STYLE_HINTS, fill } from './prompts.js'
import { cardContextBrief, cardContextText } from './director.js'
import { runWriter, storyText } from './writer.js'
import { tidyTags } from './cast.js'
import { cleanName } from './look.js'
import { unitsForPrompt } from './segment.js'
import { pick, CG_SIZES, CG_MAX_CHARACTERS } from './vocab.js'

const GENDER = { female: '女', male: '男', other: '其他' }
const str = (value, max) => (typeof value === 'string' ? value.trim().slice(0, max) : '')
const COUNT_TAG = /^(\d+\+?(girls?|boys?|others?)|multiple (girls|boys|others)|no humans)$/i
const IDENTITY_TAG = /^[^()]+ \([^()]+\)$/
const CJK = /[㐀-鿿豈-﫿぀-ヿ]/

/** 档案的 1girl / 1boy 换成角色块里用的 girl / boy（数字只在 Base）。 */
export const girlify = tags => tidyTags(String(tags || '').split(/,\s*/).map(t => ({ '1girl': 'girl', '1boy': 'boy', '1other': 'other' })[t.trim().toLowerCase()] || t).join(', '))

function personLines(p) {
  const lines = [`- ${p.name}${GENDER[p.gender] ? `（${GENDER[p.gender]}）` : ''}`, `  固定外貌：${p.appearance || '（未建档，按设定补全）'}`]
  lines.push(`  此刻穿着：${p.outfit ? `${p.outfit}${p.outfitTags ? `（${p.outfitTags}）` : '（没写 tag，按名字和剧情补全指纹）'}` : '（档案没写，按剧情和设定补全）'}`)
  const others = Object.entries(p.timeline?.outfits || {}).filter(([name]) => name !== p.outfit)
  if (others.length) lines.push(`  衣橱里还有：${others.map(([name, o]) => `${name}${o.tags ? `（${o.tags}）` : ''}`).join('；')}`)
  lines.push(`  长期状态：${p.states?.length ? p.states.map(s => `${s.name}${s.tags ? `（${s.tags}）` : ''}`).join('、') : '无'}`)
  if (p.temp) lines.push(`  临时状态：${p.temp}`)
  if (p.note) lines.push(`  备注（玩家写的）：${p.note}`)
  return lines.join('\n')
}

/** 现有的提示词（改写时给分镜师看）：一行 Base，每人一行。 */
export function promptText(image) {
  const lines = [`Base：${image.tags || '（空）'}${image.desc ? ` ｜ ${image.desc}` : ''}`]
  for (const c of image.characters || []) lines.push(`${c.name}：${c.tag}${c.nl ? ` ｜ ${c.nl}` : ''}`)
  return lines.join('\n')
}

function targetLine(t, units) {
  const unit = units.find(u => u.id === t.after)
  const parts = [`- ${t.id}：插在 ${t.after || '最后'}${unit ? `（「${unit.text.slice(0, 24)}${unit.text.length > 24 ? '…' : ''}」）` : ''}之后`]
  if (t.title) parts.push(`标题「${t.title}」`)
  parts.push(`画什么：${t.moment || '从这一轮里挑最值得画的一个瞬间'}`)
  if (t.who?.length) parts.push(`入画：${t.who.join('、')}`)
  let line = parts.join('；')
  if (t.current) line += `\n  现在的提示词：\n  ${promptText(t.current).replace(/\n/g, '\n  ')}`
  if (t.instruction) line += `\n  玩家的修改意见：${t.instruction}（按意见改，意见没提到的部分保持原样）`
  return line
}

function referenceBlock(references) {
  if (!references?.length) return ''
  return '\n【已经画过的插画（时代锚和衣服指纹沿用这些写法）】\n' + references.map(r => `- ${r.label}\n  ${promptText(r).replace(/\n/g, '\n  ')}`).join('\n') + '\n'
}

function parseImage(entry) {
  const characters = (Array.isArray(entry?.characters) ? entry.characters : []).slice(0, CG_MAX_CHARACTERS).map(c => ({
    name: cleanName(c?.name, 24),
    tag: tidyTags(str(c?.tag ?? c?.tags, 1500)),
    nl: str(c?.nl, 800),
  })).filter(c => c.tag || c.nl)
  return { tags: tidyTags(str(entry?.tag ?? entry?.tags, 1500)), desc: str(entry?.nl ?? entry?.desc, 1200), characters, shape: pick(entry?.size ?? entry?.shape, CG_SIZES, 'portrait') }
}

/**
 * 写一批插画的提示词。
 * targets: [{ key, after, title, moment, who, current?, instruction? }]，同一轮。
 * story：此前各轮 [{turn, text}]；units：这一轮的正文单元；people：这一轮相关人物的档案（effectivePerson）。
 * @returns {Promise<Map<string, { tags, desc, characters, shape, writer: 'ai' }>>} 没写出来的不在里面，调用方自己兜底。
 */
export async function writeCgPrompts({ llm, provider, model, config, backend, context, story = [], turn, units = [], people = [], targets, references = [], signal, trace = {}, onProgress }) {
  const results = new Map()
  const items = targets.map((t, i) => ({ ...t, id: 'c' + (i + 1) }))
  await runWriter({
    llm, provider, model, config, signal, trace, onProgress, items,
    system: fill(config.director?.cgPrompt || CG_SYSTEM, { styleHint: STYLE_HINTS[backend] || STYLE_HINTS.novelai }),
    contextLength: cardContextText(context).length,
    storyLength: storyText(story).length,
    render: ({ list, storyChars, contextChars }) => fill(CG_USER, {
      context: cardContextBrief(context, contextChars),
      turn: String(turn),
      story: storyText(story, storyChars),
      units: unitsForPrompt(units),
      cast: people.length ? people.map(personLines).join('\n') : '（还没有建档的人物，入画的人按正文和设定补全外貌）',
      references: referenceBlock(references),
      targets: list.map(t => targetLine(t, units)).join('\n'),
    }),
    accept: json => {
      const got = []
      for (const entry of Array.isArray(json.images) ? json.images : []) {
        const item = items.find(t => t.id === String(entry?.key || '').trim())
        const image = parseImage(entry)
        if (!item || (!image.tags && !image.characters.length)) continue
        results.set(item.key, { ...image, writer: 'ai' })
        got.push(item.id)
      }
      return got
    },
  })
  return results
}

/** 分镜师写不出来时的保底：场景 tag + 入画的人各自此刻的衣服和状态（固定外貌出图前统一补）。 */
export function fallbackCg(plan, lookup, scene = {}) {
  const tags = tidyTags(String(scene.bg || '').split(/,\s*/).filter(t => !/^(scenery|no humans)$/i.test(t.trim())).join(', '))
  // 没档案的人拼不出外貌，留着只会是个空块：不放。
  const characters = (plan.who || []).slice(0, CG_MAX_CHARACTERS).map(name => ({ name, person: lookup(name) })).filter(c => c.person).map(({ name, person: p }) => ({
    name, tag: tidyTags([p.outfitTags, ...(p.states || []).map(s => s.tags), p.temp].filter(Boolean).join(', ')), nl: '',
  }))
  return { tags, desc: '', characters, shape: plan.shape || 'landscape', writer: 'fallback' }
}

const escapeRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * 把提示词整理成能发出去的样子：
 * - 档案里有的人，把固定外貌（1girl → girl）补在他块的最前面，写过的去重，同人身份 tag 留在第一位；
 * - tag 和 nl 里出现的故事人名都去掉：tag 整个删，nl 里换成 the girl / the boy / the person；中文残字一并去掉；
 * - Base 没写人数的，按角色块的性别补上。
 * lookup(name) → 档案（effectivePerson）或 null；names：这一局的人名。
 */
export function resolveCgPrompt(image, lookup, names = []) {
  const all = [...new Set([...names, ...(image.characters || []).map(c => c.name)])].filter(n => n && n.length > 1).sort((a, b) => b.length - a.length)
  // 英文名按整词匹配（免得 Al 误伤 small），中文名按原样。
  const nameRe = all.length ? new RegExp(all.map(n => (/^[\x00-\x7f]+$/.test(n) ? `\\b${escapeRe(n)}\\b` : escapeRe(n))).join('|'), 'giu') : null
  const genderOf = name => {
    const p = lookup(name)
    if (p?.gender) return p.gender
    const tag = (image.characters || []).find(c => c.name === name)?.tag || ''
    return /^girl\b/i.test(tag) ? 'female' : /^boy\b/i.test(tag) ? 'male' : ''
  }
  const cleanTags = text => tidyTags(String(text || '').split(/,\s*/).filter(t => {
    const tag = t.trim()
    if (!tag || CJK.test(tag)) return false
    if (IDENTITY_TAG.test(tag)) return true
    return !(nameRe && new RegExp(nameRe.source, 'iu').test(tag))
  }).join(', '))
  const cleanNl = text => {
    let out = String(text || '')
    if (nameRe) {
      out = out.replace(new RegExp(`(${nameRe.source})(['’]s)?`, 'giu'), (match, name, possessive) => {
        const who = { female: 'the girl', male: 'the boy' }[genderOf(all.find(n => n.toLowerCase() === name.toLowerCase()) || name)] || 'the person'
        return possessive ? who + "'s" : who
      })
    }
    return out.replace(new RegExp(CJK.source + '+', 'g'), '').replace(/\s{2,}/g, ' ').replace(/\s+([,.;:!?])/g, '$1').trim()
  }
  const characters = (image.characters || []).map(c => {
    const p = lookup(c.name)
    const fixed = p?.appearance ? girlify(p.appearance) : ''
    return { name: c.name, tag: cleanTags([fixed, c.tag].filter(Boolean).join(', ')), nl: cleanNl(c.nl) }
  }).filter(c => c.tag || c.nl)
  let tags = cleanTags(image.tags)
  if (characters.length && !tags.split(', ').some(t => COUNT_TAG.test(t))) {
    const n = { female: 0, male: 0, other: 0 }
    for (const c of characters) {
      const first = c.tag.split(', ').find(t => /^(girl|boy|other)$/i.test(t))
      n[first ? { girl: 'female', boy: 'male', other: 'other' }[first.toLowerCase()] : genderOf(c.name) || 'other']++
    }
    const count = [n.female && `${n.female}girl${n.female > 1 ? 's' : ''}`, n.male && `${n.male}boy${n.male > 1 ? 's' : ''}`, n.other && `${n.other}other${n.other > 1 ? 's' : ''}`].filter(Boolean)
    tags = tidyTags([...count, tags].filter(Boolean).join(', '))
  }
  return { tags, nl: cleanNl(image.desc), characters }
}
