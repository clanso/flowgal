// 插画分镜师：导演挑好要画的瞬间后，后台模型读资料、此前的剧情、这一轮的正文和角色档案，
// 把每个瞬间写成「Base + 每人一个角色块」的提示词（参考柏宝绘的 NovelAI V4.5 / V5 分人写法）。
// 人名只当标签：发给生图模型前，插件按名字补上档案里的固定外貌，并把混进 tag / nl 的人名删掉。
import { textOf, fillBook, placeRules, styleHintOf } from './prompt-book.js'
import { pickOf } from './prompt-words.js'
import { cardContextBrief, cardContextText } from './director.js'
import { runWriter, storyText } from './writer.js'
import { tidyTags } from './cast.js'
import { cleanName } from './look.js'
import { unitsForPrompt } from './segment.js'
import { pick, CG_SIZES, CG_MAX_CHARACTERS, MODE_NAMES, isNsfwFlag } from './vocab.js'

const str = (value, max) => (typeof value === 'string' ? value.trim().slice(0, max) : '')
const COUNT_TAG = /^(\d+\+?(girls?|boys?|others?)|multiple (girls|boys|others)|no humans)$/i
const IDENTITY_TAG = /^[^()]+ \([^()]+\)$/
const CJK = /[㐀-鿿豈-﫿぀-ヿ]/

/** 档案的 1girl / 1boy 换成角色块里用的 girl / boy（数字只在 Base）。 */
export const girlify = tags => tidyTags(String(tags || '').split(/,\s*/).map(t => ({ '1girl': 'girl', '1boy': 'boy', '1other': 'other' })[t.trim().toLowerCase()] || t).join(', '))

/** 入画的人的档案（写法在设置 →「提示词」→ 插画分镜师 → 角色档案的写法）。 */
function personLines(p, config = null) {
  const blank = key => pickOf(config, 'cg.blanks', key)
  return fillBook(config, 'cg.person', {
    name: p.name, gender: p.gender ? blank(p.gender) : '',
    appearance: p.appearance || blank('noLook'),
    outfit: p.outfit ? `${p.outfit}${p.outfitTags ? `（${p.outfitTags}）` : blank('noTags')}` : blank('noOutfit'),
    others: Object.entries(p.timeline?.outfits || {}).filter(([name]) => name !== p.outfit).map(([name, o]) => `${name}${o.tags ? `（${o.tags}）` : ''}`).join('；'),
    states: p.states?.length ? p.states.map(s => `${s.name}${s.tags ? `（${s.tags}）` : ''}`).join('、') : blank('none'),
    temp: p.temp || '', note: p.note || '',
  })
}

/** 现有的提示词（改写时给分镜师看）：一行 Base，每人一行。 */
export function promptText(image) {
  const lines = [`Base：${image.tags || '（空）'}${image.desc ? ` ｜ ${image.desc}` : ''}`]
  for (const c of image.characters || []) lines.push(`${c.name}：${c.tag}${c.nl ? ` ｜ ${c.nl}` : ''}`)
  return lines.join('\n')
}

/** 段落里一个人当时的样子：一行。 */
function eraLine(p, config = null) {
  const blank = key => pickOf(config, 'cg.blanks', key)
  return fillBook(config, 'cg.era.person', {
    name: p.name, appearance: p.appearance || blank('eraLook'),
    outfit: p.outfit ? `${p.outfit}${p.outfitTags ? `（${p.outfitTags}）` : ''}` : blank('eraOutfit'),
    states: p.states?.length ? p.states.map(s => `${s.name}${s.tags ? `（${s.tags}）` : ''}`).join('、') : blank('none'),
  })
}

/** 要画的插画一条（写法在设置 →「提示词」→ 插画分镜师 → 每张插画那一条）。 */
function targetLine(t, units, config = null) {
  const blank = key => pickOf(config, 'cg.blanks', key)
  const unit = units.find(u => u.id === t.after)
  let line = fillBook(config, 'cg.line', {
    id: t.id, after: t.after || blank('end'), quote: unit ? `${unit.text.slice(0, 24)}${unit.text.length > 24 ? '…' : ''}` : '',
    title: t.title || '', moment: t.moment || blank('anyMoment'), who: t.who?.length ? t.who.join('、') : '', nsfw: t.nsfw ? 'nsfw' : '',
    shape: t.shape ? blank(t.shape === 'portrait' ? 'portrait' : 'landscape') : '', size: t.shape || '',
  })
  // 回忆、梦境这类段落里：画面里的人是当时的样子，以这里为准
  // 这一轮中途才变样子的人（后面才缠上发带、才换衣服）：这一张在变化之前，按变化之前的样子画
  if (t.era) line += '\n  ' + (t.era.mode === 'earlier' ? textOf(config, 'cg.era.earlier') : fillBook(config, 'cg.era.then', { mode: MODE_NAMES[t.era.mode] || t.era.mode })) + '\n' + t.era.people.map(p => `  ${eraLine(p, config)}`).join('\n')
  if (t.current) line += `\n  ${textOf(config, 'cg.current')}\n  ${promptText(t.current).replace(/\n/g, '\n  ')}`
  if (t.instruction) line += '\n  ' + fillBook(config, 'cg.instruction', { text: t.instruction })
  return line
}

function referenceBlock(references, config = null) {
  if (!references?.length) return ''
  return '\n' + fillBook(config, 'cg.references', { list: references.map(r => `- ${r.label}\n  ${promptText(r).replace(/\n/g, '\n  ')}`).join('\n') }) + '\n'
}

const hasNsfw = tags => String(tags || '').split(/,\s*/).some(t => t.trim().toLowerCase() === 'nsfw')

// 模型先占个坑、没写内容的说法（DeepSeek 有时一批里有一张只写 "placeholder"）：当没写。
const STUB = /^(placeholder|todo|tbd|tba|n\/?a|none|null|undefined|\.{2,}|…+|-+|同上|略|待补|待写|省略|占位)$/i
const unstub = text => (STUB.test(text.replace(/[.。]$/, '').trim()) ? '' : text)
const unstubTags = text => tidyTags(text.split(/,\s*/).filter(t => !STUB.test(t.trim())).join(', '))
// 只有人数、分级、画幅的 Base 说不出画面
const BARE_TAG = /^(\d+\+?(girls?|boys?|others?)|multiple (girls|boys|others)|nsfw|sfw|explicit|questionable|sensitive|general|rating:\s*\w+|landscape|portrait|square)$/i

function parseImage(entry) {
  const characters = (Array.isArray(entry?.characters) ? entry.characters : []).slice(0, CG_MAX_CHARACTERS).map(c => ({
    name: cleanName(c?.name, 24),
    tag: unstubTags(tidyTags(str(c?.tag ?? c?.tags, 2000))),
    nl: unstub(str(c?.nl, 1600)),
  })).filter(c => c.tag || c.nl)
  const tags = unstubTags(tidyTags(str(entry?.tag ?? entry?.tags, 2000)))
  const nsfw = isNsfwFlag(entry?.nsfw) || hasNsfw(tags)
  return { tags, desc: unstub(str(entry?.nl ?? entry?.desc, 2000)), characters, shape: pick(entry?.size ?? entry?.shape, CG_SIZES, 'portrait'), ...(nsfw ? { nsfw: true } : {}) }
}

/** 写出了画面：Base 里有人数、分级、画幅以外的 tag，或者有人的角色块。只占了个坑的不算，留给补写。 */
const described = image => image.characters.length > 0 || Boolean(image.desc) || (Boolean(image.tags) && image.tags.split(', ').some(t => !BARE_TAG.test(t)))

/**
 * 写一批插画的提示词。
 * targets: [{ key, after, title, moment, who, current?, instruction? }]，同一轮。
 * story：此前各轮 [{turn, text}]；units：这一轮的正文单元；people：这一轮相关人物的档案（effectivePerson）。
 * @returns {Promise<Map<string, { tags, desc, characters, shape, writer: 'ai' }>>} 没写出来的不在里面，调用方自己兜底。
 */
export async function writeCgPrompts({ llm, provider, model, config, backend, context, story = [], turn, units = [], people = [], targets, references = [], signal, trace = {}, onProgress }) {
  const results = new Map()
  const items = targets.map((t, i) => ({ ...t, id: 'c' + (i + 1) }))
  // 共用开头：系统提示词换成共用的那句，分镜师的规矩放进用户消息（档案后面）
  const { system, role } = placeRules(config, fillBook(config, 'cg.system', { styleHint: styleHintOf(config, backend) }))
  await runWriter({
    llm, provider, model, config, signal, trace, onProgress, items, system,
    contextLength: cardContextText(context).length,
    storyLength: storyText(story, Infinity, config).length,
    render: ({ list, storyChars, contextChars }) => fillBook(config, 'cg.user', {
      context: cardContextBrief(context, contextChars, config),
      turn: String(turn),
      story: storyText(story, storyChars, config),
      units: unitsForPrompt(units),
      cast: people.length ? people.map(p => personLines(p, config)).join('\n') : textOf(config, 'cg.noCast'),
      role: role ? '\n' + role + '\n' : '',
      references: referenceBlock(references, config),
      targets: list.map(t => targetLine(t, units, config)).join('\n'),
    }),
    accept: json => {
      const got = []
      for (const entry of Array.isArray(json.images) ? json.images : []) {
        const item = items.find(t => t.id === String(entry?.key || '').trim())
        const image = parseImage(entry)
        if (!item || !described(image)) continue
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
  return { tags, desc: '', characters, shape: plan.shape || 'landscape', writer: 'fallback', ...(plan.nsfw ? { nsfw: true } : {}) }
}

const escapeRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * 把提示词整理成能发出去的样子：
 * - 档案里有的人，把固定外貌（1girl → girl）补在他块的最前面，写过的去重，同人身份 tag 留在第一位；
 * - tag 和 nl 里出现的故事人名都去掉：tag 整个删，nl 里换成 the girl / the boy / the person；中文残字一并去掉；
 * - 标了露骨（nsfw）的，Base 没写 nsfw 就补上；
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
  // 标了露骨的：Base 里一定有 nsfw（NovelAI 这类模型靠它放开），分镜师漏写了也补上
  if (image.nsfw && !hasNsfw(tags)) tags = tidyTags(['nsfw', tags].filter(Boolean).join(', '))
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
