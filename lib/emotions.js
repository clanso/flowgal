// 情绪库：内置情绪（vocab.js 的 EMOTIONS，英文键当编号）+ 导演和玩家新加的情绪。内置的和新加的一样能改：
// 改名（内置的只改显示的名字，编号不变，老存档的立绘照样对得上）、改类别、改替身、改默认的表情 tag、停用、删除、合并。
// 只有「平静」不能删、不能停用、不能并掉：它是登场立绘，也是最后的兜底。
//
// 存在 $DSH_HOME/flowgal/emotions.json（酒馆版 flowgal-emotions.json），所有对局共用：{ list: [条目], categories: [类别] }
//  - 新情绪：{ id（中文短语本身）, category, base, use, words, tags, face, act, react, recall, level, off, source, at, gameId, turn, who }
//  - 内置情绪改过的才有一条：{ id（英文键）, builtin: true, label, category, base, use, words, tags, face, act, react, recall, level, off, deleted }
//  - use「用在」什么场面（导演挑情绪、设计师拉开挨得近的两种时看）；words 近义词（顿号隔开）：写到它们直接当作这一种（resolveEmotion）。
//  - react / recall / level：剧场里有反应时身子怎么一动、短闪回自动挑基调时算哪种、默认强弱。内置的默认见 vocab.js；
//    新情绪没设的跟替身、再跟它那一类的代表情绪走（给一类的代表设一次，这一类里没写替身的都跟着）。
//  - 并掉的：{ id, mergedInto }。之后导演写它、老剧本里的它都当作并进去的那个；它画好的立绘也给那个用（standIns）。
//    导演新造的词交给模型归类（lib/emotion-judge.js）时，归进已有情绪的也记成这样一条（source: 'judge'），归错了能拆出来（splitEmotion）。
//  - 类别 { id, label, rep } 管整理（导演看情绪库按类别列，界面按类别分组），rep 是这一类的代表情绪。没存过类别用 DEFAULT_CATEGORIES。
//    新加一类时顺手加上同名的情绪当代表（库里已经有就把它挪进来）。
//  - 替身 base：这种情绪的立绘还没画好时先用哪张，可以是库里任何一种情绪。没写就用它那一类的代表情绪，再没有用平静。
// 库里只有这个词本身，不带描述：这种情绪在谁脸上什么样，由表演设计师按那个人设计（lib/acting.js）。老存档里的描述（desc）不再进任何提示词。
// 前后端共用这个文件里的纯函数。下面的 custom 可以是整个情绪库（{ list, categories }），也可以只是 list（那时类别用默认的）。
import { EMOTIONS, EMOTION_TAGS, EMOTION_FACE, EMOTION_ACTS, EMOTION_LEVEL, EMOTION_REACT, EMOTION_RECALL, EMOTION_USE, EMOTION_WORDS, EMOTION_BASE, REACT_KINDS, RECALL_TONES, speakersOf } from './vocab.js'
import { TEXT_DEFAULTS } from './prompt-words.js'
import { fill } from './template.js'

const LABEL_TO_KEY = new Map(Object.entries(EMOTIONS).map(([k, v]) => [v, k]))
export const MAX_EMOTION_CHARS = 16
/** 默认的表情 tag、动作说明、用在、近义词最多多长（玩家改的也按这个截）。 */
const TAG_CHARS = 600
const CATEGORY_CHARS = 8

/** 默认的类别（喜怒哀惧……），可以改名、加、删；rep 是代表情绪。 */
export const DEFAULT_CATEGORIES = Object.freeze([
  { id: 'calm', label: '平静', rep: 'neutral' },
  { id: 'joy', label: '喜', rep: 'smile' },
  { id: 'anger', label: '怒', rep: 'angry' },
  { id: 'sorrow', label: '哀', rep: 'sad' },
  { id: 'fear', label: '惧', rep: 'scared' },
  { id: 'surprise', label: '惊', rep: 'surprised' },
  { id: 'shy', label: '羞', rep: 'shy' },
  { id: 'love', label: '爱', rep: 'love' },
  { id: 'think', label: '思', rep: 'thinking' },
  { id: 'tired', label: '倦', rep: 'tired' },
  { id: 'cold', label: '冷', rep: 'cold' },
].map(c => Object.freeze(c)))

/** 内置情绪默认归哪一类。 */
export const BUILTIN_CATEGORY = Object.freeze({
  neutral: 'calm', smile: 'joy', happy: 'joy', laugh: 'joy', smug: 'joy', teasing: 'joy',
  angry: 'anger', pout: 'anger', sad: 'sorrow', cry: 'sorrow', scared: 'fear', worried: 'fear',
  surprised: 'surprise', confused: 'surprise', shy: 'shy', blush: 'shy', love: 'love',
  thinking: 'think', serious: 'think', determined: 'think', tired: 'tired', cold: 'cold',
  disgust: 'cold', wry: 'tired', guilty: 'fear', wronged: 'sorrow', suspicious: 'think', passion: 'love',
})

/** 能改的字段（内置情绪的条目里只存改过的这几样）。level 是数，其余是字符串。 */
const EDITABLE = ['label', 'category', 'base', 'use', 'words', 'tags', 'face', 'act', 'react', 'recall', 'level']
/** 新情绪自己写的（「恢复默认」清掉的那几样；替身、类别不算）。 */
const OWN_FIELDS = ['use', 'words', 'tags', 'face', 'act', 'react', 'recall', 'level']
const LEVELS = [1, 2, 3, 4]
/** 条目里存着这个字段没有（存了空字符串也算：内置情绪改成「跟替身」）。 */
const stored = (entry, k) => (k === 'level' ? LEVELS.includes(entry?.[k]) : typeof entry?.[k] === 'string')
const isObject = v => v && typeof v === 'object' && !Array.isArray(v)
const clip = (v, n) => String(v ?? '').replace(/[\r\n\t]+/g, ' ').trim().slice(0, n)

/**
 * 近义词：顿号、逗号、分号、斜杠、空白都当分隔，每个词照情绪短语的规矩收（最多 16 字），去重，用顿号连起来。
 * self 是这种情绪自己的名字和编号（写进去的去掉）。
 */
export function cleanWords(value, self = []) {
  const skip = new Set(self.filter(Boolean))
  const out = []
  for (const raw of String(value ?? '').split(/[、，,;；\/／|\s]+/)) {
    const w = raw.replace(/[@"“”'‘’]/g, '').trim().slice(0, MAX_EMOTION_CHARS)
    if (w && !skip.has(w) && !out.includes(w)) out.push(w)
  }
  return out.join('、').slice(0, TAG_CHARS)
}
const wordCache = new Map()
/** 近义词那一串拆成词（同一串只拆一次）。 */
function wordsOf(text) {
  if (!text) return []
  let got = wordCache.get(text)
  if (!got) {
    if (wordCache.size > 4000) wordCache.clear()
    got = String(text).split('、').filter(Boolean)
    wordCache.set(text, got)
  }
  return got
}

/** 规整一个情绪写法：内置键、内置的默认中文名归到内置键；其余当作新情绪短语（去掉分隔符 | @ 和引号，最多 16 字）。不看情绪库，看库用 resolveEmotion。 */
export function emotionId(value) {
  const text = String(value ?? '').replace(/[|@"“”'‘’\r\n\t]/g, '').trim().slice(0, MAX_EMOTION_CHARS)
  if (!text) return ''
  const lower = text.toLowerCase()
  if (EMOTIONS[lower]) return lower
  return LABEL_TO_KEY.get(text) || text
}

export const isBuiltinEmotion = id => Object.prototype.hasOwnProperty.call(EMOTIONS, id)

/** 情绪库的类别：存过的按存的（空列表也算存过：全删了），没存过用默认的。 */
export function cleanCategories(raw) {
  if (!Array.isArray(raw)) return DEFAULT_CATEGORIES.map(c => ({ ...c }))
  const seen = new Set()
  const out = []
  for (const c of raw) {
    const id = clip(c?.id, 24)
    const label = clip(c?.label, CATEGORY_CHARS)
    if (!id || !label || seen.has(id) || id === '__proto__') continue
    seen.add(id)
    out.push({ id, label, rep: clip(c?.rep, MAX_EMOTION_CHARS) })
  }
  return out
}

/** custom → { list, categories }：给的是整个情绪库就用它的类别；只给 list 时类别用默认的。 */
export function libOf(custom) {
  if (Array.isArray(custom)) return { list: custom, categories: DEFAULT_CATEGORIES }
  return { list: Array.isArray(custom?.list) ? custom.list : [], categories: cleanCategories(custom?.categories) }
}
const listOf = custom => (Array.isArray(custom) ? custom : Array.isArray(custom?.list) ? custom.list : [])

/**
 * 写到这个词时当作哪种情绪（近义词，见 cleanWords）：内置的看它现在的近义词（改过按改过的），新情绪看它自己写的；
 * 删掉的、停用的不算（停用的导演不用，写到它的近义词另外归类）。认不出回 ''。
 */
function synonymOf(word, list) {
  for (const id of Object.keys(EMOTIONS)) {
    const own = list.find(e => e?.id === id)
    if (own?.off || (own?.deleted && !own.mergedInto)) continue
    if (wordsOf(own && stored(own, 'words') ? own.words : EMOTION_WORDS[id]).includes(word)) return id
  }
  for (const e of list) if (e?.id && !isBuiltinEmotion(e.id) && !e.mergedInto && !e.off && e.words && wordsOf(e.words).includes(word)) return e.id
  return ''
}

/**
 * 按情绪库认一个情绪写法：内置键、内置的名字（改过名的按新名字）、近义词、并掉的跟到并进去的那个。回编号（认不出的照 emotionId 回）。
 */
export function resolveEmotion(value, custom = []) {
  let id = emotionId(value)
  if (!id) return ''
  const list = listOf(custom)
  if (!isBuiltinEmotion(id)) {
    const renamed = list.find(e => e?.builtin && isBuiltinEmotion(e.id) && e.label === id && !e.deleted)
    if (renamed) id = renamed.id
    // 库里没有这个词本身：是哪种情绪的近义词就当作那一种
    else if (!list.some(e => e?.id === id)) id = synonymOf(id, list) || id
  }
  for (let hop = 0; hop < 8; hop++) {
    const into = list.find(e => e?.id === id)?.mergedInto
    if (!into || into === id) break
    id = emotionId(into)
  }
  return id
}

/** 内置情绪的默认样子（「恢复默认」回到这个）。 */
export function builtinDefaults(id) {
  return {
    label: EMOTIONS[id], category: BUILTIN_CATEGORY[id] || '', base: EMOTION_BASE[id] || '', use: EMOTION_USE[id] || '', words: EMOTION_WORDS[id] || '',
    tags: EMOTION_TAGS[id] || '', face: EMOTION_FACE[id]?.add || '', act: EMOTION_ACTS[id] || '',
    react: EMOTION_REACT[id] || 'nod', recall: EMOTION_RECALL[id] || 'none', level: EMOTION_LEVEL[id] || 2,
  }
}

/**
 * 情绪库里的一条（按 resolveEmotion 认过：并掉的给并进去的那条）。
 * { id, label, builtin, category, base, use, words, tags, face, act, off, deleted, edited, defaults?, source?, who?, … }
 * tags / face / act 是这一条自己的（内置的没改过就是默认的），空的时候用 emotionTags / emotionFace / emotionAct 往替身上找。
 */
export function emotionEntry(value, custom = []) {
  const list = listOf(custom)
  const id = resolveEmotion(value, list)
  const own = list.find(e => e?.id === id) || null
  if (isBuiltinEmotion(id)) {
    const defaults = builtinDefaults(id)
    const edits = {}
    for (const k of EDITABLE) if (own && stored(own, k)) edits[k] = own[k]
    return { ...defaults, ...edits, id, builtin: true, off: Boolean(own?.off) && id !== 'neutral', deleted: Boolean(own?.deleted) && id !== 'neutral', edited: Object.keys(edits).length > 0, defaults }
  }
  if (!own) return { id, label: id, builtin: false, category: '', base: '', use: '', words: '', tags: '', face: '', act: '', react: '', recall: '', level: 0, off: false, deleted: false, edited: false }
  const { desc, mergedInto, ...rest } = own
  // 老存档：只有「最接近的内置情绪」（base），类别跟着它
  const category = typeof own.category === 'string' ? own.category : BUILTIN_CATEGORY[own.base] || ''
  const level = LEVELS.includes(own.level) ? own.level : 0
  return {
    ...rest, id, label: id, builtin: false, category, base: own.base || '', use: own.use || '', words: own.words || '', tags: own.tags || '', face: own.face || '', act: own.act || '',
    react: own.react || '', recall: own.recall || '', level, off: Boolean(own.off), deleted: false, edited: Boolean(own.use || own.words || own.tags || own.face || own.act || own.react || own.recall || level),
  }
}

/** 情绪显示的名字（内置的改过名按新名字）。 */
export const emotionLabel = (id, custom = []) => emotionEntry(id, custom).label || String(id || '')

/** 并进这个情绪的那些（它们画好的立绘给这个用）。 */
export function mergedFrom(value, custom = []) {
  const list = listOf(custom)
  const id = resolveEmotion(value, list)
  return list.filter(e => e?.mergedInto && e.id !== id && resolveEmotion(e.id, list) === id).map(e => e.id)
}

/** 这种情绪接近哪个（提示词里写「接近 X」）：写了替身用替身，没写用它那一类的代表情绪；都没有回空。 */
export function nearestOf(value, custom = []) {
  const lib = libOf(custom)
  const e = emotionEntry(value, lib)
  const base = e.base ? resolveEmotion(e.base, lib.list) : ''
  if (base && base !== e.id) return base
  const rep = resolveEmotion(lib.categories.find(c => c.id === e.category)?.rep, lib.list)
  return rep && rep !== e.id ? rep : ''
}

/**
 * 这种情绪的立绘没画好时依次先用哪些：并进它的那些（同一种情绪以前的名字）→ 替身（替身的替身……，走到平静就停）→ 它那一类的代表情绪 → 平静。不含它自己。
 * 自己的替身直接写平静的（认真、思考这种）：没画好就用平静，不再找类别代表。
 */
export function standIns(value, custom = []) {
  const lib = libOf(custom)
  const id = resolveEmotion(value, lib.list)
  const out = []
  const push = e => { if (e && e !== id && !out.includes(e)) out.push(e) }
  for (const e of mergedFrom(id, lib)) push(e)
  let at = id
  let straight = false
  for (let hop = 0; hop < 8; hop++) {
    const base = resolveEmotion(emotionEntry(at, lib).base, lib.list)
    if (base === 'neutral') { straight = hop === 0; break }
    if (!base || base === id || out.includes(base)) break
    push(base)
    at = base
  }
  if (!straight) push(resolveEmotion(lib.categories.find(c => c.id === emotionEntry(id, lib).category)?.rep, lib.list))
  push('neutral')
  return out
}

/** 某个字段：这一条自己写了就用，没写往替身上找（neutral 为假时不找到平静：平静的动作说明套到别的情绪上不对）。 */
function inherit(value, field, custom, { neutral = true } = {}) {
  const lib = libOf(custom)
  const own = emotionEntry(value, lib)
  if (own[field]) return own[field]
  for (const e of standIns(own.id, lib)) {
    if (e === 'neutral' && !neutral) break
    const v = emotionEntry(e, lib)[field]
    if (v) return v
  }
  return ''
}
/** 没有设计师写的 tag 时画这种情绪用的表情 tag（整张画）。 */
export const emotionTags = (value, custom = [], { neutral = true } = {}) => inherit(value, 'tags', custom, { neutral }) || (neutral ? EMOTION_TAGS.neutral : '')
/** 只换脸时这种情绪的表情 tag（只写脸上的）。 */
export const emotionFace = (value, custom = []) => inherit(value, 'face', custom) || EMOTION_FACE.neutral.add
/** 「演到全身」的动作说明（给立绘设计师参考）；新情绪没有替身时没有。 */
export const emotionAct = (value, custom = []) => inherit(value, 'act', custom, { neutral: false })
/** 「用在」什么场面：只看自己的（不跟替身：两种情绪用在的场面不一样）。 */
export const emotionUse = (value, custom = []) => emotionEntry(value, custom).use || ''
/** 这种情绪的近义词，加上并进它的旧名字（模型归进来的、玩家合并的），顿号连起来。 */
export function emotionWords(value, custom = []) {
  const list = listOf(custom)
  const e = emotionEntry(value, list)
  // 近义词里有单独成一种的（玩家加的同名情绪）就不算它的了
  const own = wordsOf(e.words).filter(w => !list.some(x => x?.id === w && resolveEmotion(w, list) !== e.id))
  return cleanWords([...own, ...mergedFrom(e.id, list).filter(w => !isBuiltinEmotion(w))].join('、'), [e.id, e.label])
}

/** 情绪默认的强弱（1 微 ~ 4 极，换脸用）：自己设的（内置的默认按 EMOTION_LEVEL）；新情绪没设的跟着替身（不算平静），都没有算 2（中）。表演设计师给这个人标的优先（lib/acting.js 的 actingLevel）。 */
export const emotionLevel = (value, custom = []) => inherit(value, 'level', custom, { neutral: false }) || 2

/** 没在说话的人有反应时身子怎么一动（REACT_KINDS）：自己设的，没设跟替身、再跟这一类的代表情绪；都没有轻轻点头。 */
export const emotionReact = (value, custom = []) => inherit(value, 'react', custom) || 'nod'

/** 短闪回自动挑基调时这种情绪算哪种（RECALL_TONES）；回 '' 是不影响基调。规则同 emotionReact。 */
export function emotionRecall(value, custom = []) {
  const tone = inherit(value, 'recall', custom)
  return tone === 'none' ? '' : tone
}

/** 全部情绪：内置在前（删掉的不列），新加的按加入先后（并掉的不列）。 */
export function allEmotions(custom = [], { withDeleted = false } = {}) {
  const list = listOf(custom)
  return [
    ...Object.keys(EMOTIONS).filter(id => !list.find(e => e?.id === id)?.mergedInto).map(id => emotionEntry(id, list)).filter(e => withDeleted || !e.deleted),
    ...list.filter(e => e && e.id && !isBuiltinEmotion(e.id) && !e.mergedInto).map(e => emotionEntry(e.id, list)),
  ]
}

/** 导演能用的情绪（停用、删掉的不给）。 */
export const usableEmotions = (custom = []) => allEmotions(custom).filter(e => !e.off)

/** 按类别分组：[{ category（null 是未分类）, list }]，类别按情绪库里的顺序，空的类别也列（界面要显示）。 */
export function groupEmotions(entries, custom = []) {
  const { categories } = libOf(custom)
  const known = new Set(categories.map(c => c.id))
  const groups = categories.map(c => ({ category: c, list: entries.filter(e => e.category === c.id) }))
  const loose = entries.filter(e => !known.has(e.category))
  return [...groups, { category: null, list: loose }]
}

/**
 * 给导演看的情绪库：按类别列，每种一行（item 那段：内置写「键 名字」，新加的只写词本身，后面接用在什么场面、也叫什么）。停用、删掉的不列。
 * 空的类别也列（写 empty 那句：导演新造的情绪可以归进来）；没有情绪的「未分类」不列。template / empty / item：设置 →「提示词」里改过的那段。
 */
export function emotionBrief(custom = [], template = TEXT_DEFAULTS['director.emotions'], empty = TEXT_DEFAULTS['director.emotions.empty'], item = TEXT_DEFAULTS['director.emotions.item']) {
  const lib = libOf(custom)
  const line = e => fill(item, { key: e.id, label: e.builtin ? e.label : '', use: e.use, words: emotionWords(e.id, lib) })
  const lines = groupEmotions(usableEmotions(lib), lib)
    .filter(g => g.list.length || g.category)
    .map(g => `【${g.category ? g.category.label : '未分类'}】${g.list.length ? '\n' + g.list.map(line).join('\n') : empty}`)
  return fill(template, { list: lines.join('\n') })
}

/** 导演写的类别（类别名，或编号）→ 类别编号；认不出回 ''（导演不能自己开新类）。 */
export function categoryOf(value, custom = []) {
  const text = clip(value, 24).replace(/^【|】$/g, '')
  if (!text) return ''
  const { categories } = libOf(custom)
  return (categories.find(c => c.label === text) || categories.find(c => c.id === text))?.id || ''
}

/** 情绪库的存档规整一遍（老存档补上类别）。 */
export function cleanEmotionLib(raw) {
  const lib = isObject(raw) ? raw : {}
  return { ...lib, list: Array.isArray(lib.list) ? lib.list.filter(e => e && e.id) : [], categories: cleanCategories(lib.categories) }
}

/**
 * 把新情绪并进情绪库（原地修改 lib.list）。已有的只补上空着的替身，不覆盖；并掉的、内置的不加。
 * base 可以是库里任何一种情绪（导演写的最接近的那个）；category 是导演写的归哪一类（类别名或编号），没写或认不出就跟着 base 归类；
 * use 是用在什么场面（模型归类时新开的会写）。
 * @param {{ list: object[] }} lib
 * @param {{ name: string, base?: string, category?: string, use?: string }[]} entries
 * @returns {string[]} 真正新加的情绪
 */
export function mergeEmotions(lib, entries, meta = {}) {
  lib.list = Array.isArray(lib.list) ? lib.list : []
  const added = []
  for (const e of entries || []) {
    const raw = emotionId(e?.name)
    const id = resolveEmotion(raw, lib.list)
    if (!id || isBuiltinEmotion(id) || id !== raw) continue
    const base = resolveEmotion(e?.base, lib.list)
    const known = base && base !== id && (isBuiltinEmotion(base) || lib.list.some(x => x.id === base && !x.mergedInto))
    const found = lib.list.find(x => x.id === id)
    if (found) {
      if (!found.base && known) found.base = base
      continue
    }
    const category = categoryOf(e?.category, lib) || (known ? emotionEntry(base, lib).category : '')
    const use = clip(e?.use, TAG_CHARS)
    lib.list.push({ id, base: known ? base : '', ...(category ? { category } : {}), ...(use ? { use } : {}), source: meta.source || 'director', at: Date.now(), ...(meta.gameId ? { gameId: meta.gameId, turn: meta.turn } : {}) })
    added.push(id)
  }
  return added
}

/**
 * 模型归类：导演新造的词归进库里已有的一种（原地修改 lib.list）。记一条 { id, mergedInto, source: 'judge', at, gameId, turn }，
 * 之后导演写它、剧本里的它都当作 into；情绪库「并掉的」那一栏看得到，归错了能拆出来（splitEmotion）。
 * 词已经在库里（别处先加了）、into 认不出、into 就是它自己时不动。回是否记下了。
 */
export function foldEmotion(lib, name, target, meta = {}) {
  lib.list = Array.isArray(lib.list) ? lib.list : []
  const id = emotionId(name)
  const into = resolveEmotion(target, lib.list)
  if (!id || !into || id === into || isBuiltinEmotion(id) || lib.list.some(e => e.id === id)) return false
  if (!isBuiltinEmotion(into) && !lib.list.some(e => e.id === into && !e.mergedInto)) return false
  if (resolveEmotion(id, lib.list) !== id) return false // 已经是哪种的近义词了
  lib.list.push({ id, mergedInto: into, source: meta.source || 'judge', at: Date.now(), ...(meta.gameId ? { gameId: meta.gameId, turn: meta.turn } : {}) })
  return true
}

/**
 * 拆出来：并掉的新词（模型归进去的、玩家合并的）重新单独成一种，替身是它原来并进的那个，类别跟着那个。
 * 已经挪过去的立绘不挪回来（替身照用）。内置的并掉了走「恢复内置情绪」。回它的编号。
 */
export function splitEmotion(lib, value) {
  const id = emotionId(value)
  const old = lib.list.find(e => e.id === id && e.mergedInto)
  if (!old || isBuiltinEmotion(id)) throw new Error('只有并掉的新词能拆出来')
  const into = resolveEmotion(old.mergedInto, lib.list)
  const entry = { id, ...(into && into !== id ? { base: into, category: emotionEntry(into, lib).category } : {}), source: old.source === 'judge' ? 'director' : old.source || 'user', at: Date.now(), ...(old.gameId ? { gameId: old.gameId, turn: old.turn } : {}) }
  lib.list = lib.list.map(e => (e === old ? entry : e))
  return id
}

/**
 * 记下导演新造的情绪是谁在用（情绪库条目的 who）：人物志里新情绪只挂在用过它的角色下面，不挂到所有人。
 * lines 是这一轮的逐句结果（sp 说话人、emo 情绪）。玩家自己加的情绪不记，大家都能用。
 */
export function noteEmotionUsers(lib, lines) {
  for (const line of Object.values(lines || {})) {
    // 齐声说的一句（sp 写「林岚、苏晴」）算每个人都用过；没说话的人的反应（react）算他用过
    const uses = [...(line?.emo ? speakersOf(line?.sp).map(who => [who, line.emo]) : []), ...(line?.react || []).map(r => [r.name, r.emo])]
    for (const [who, raw] of uses) {
      const id = resolveEmotion(raw, lib.list)
      if (!id || !who || isBuiltinEmotion(id) || who === '*') continue
      const entry = (lib.list || []).find(e => e.id === id)
      if (!entry || entry.source === 'user') continue
      if (!(entry.who || []).includes(who)) entry.who = [...(entry.who || []), who].slice(-50)
    }
  }
}

/**
 * 某个角色在人物志里列哪些情绪：内置的（停用的除非画过）；新加的只列玩家自己加的（大家都能用）、导演给这个角色用过的（who）、
 * 这一局里这个角色说话时用过的（老存档还没记 who）、已经画了图的。
 */
export function personEmotions(name, custom = [], { used = [], drawn = [] } = {}) {
  const list = listOf(custom)
  const usedSet = new Set(used.map(e => resolveEmotion(e, list)))
  const drawnSet = new Set(drawn.map(e => resolveEmotion(e, list)))
  return allEmotions(custom).filter(e => (e.builtin && !e.off) || (!e.off && e.source === 'user' && !e.who?.length) || e.who?.includes(name) || usedSet.has(e.id) || drawnSet.has(e.id))
}

// ───────────────────────── 改情绪库（原地改 lib，界面上的每个操作一个函数） ─────────────────────────

function ownEntry(lib, id) {
  lib.list = Array.isArray(lib.list) ? lib.list : []
  let entry = lib.list.find(e => e.id === id)
  if (!entry) { entry = isBuiltinEmotion(id) ? { id, builtin: true } : { id, source: 'user', at: Date.now() }; lib.list.push(entry) }
  return entry
}
/** 内置情绪的条目里什么都没改了就去掉。 */
function tidyBuiltin(lib, id) {
  const entry = lib.list.find(e => e.id === id)
  if (entry && isBuiltinEmotion(id) && !EDITABLE.some(k => stored(entry, k)) && !entry.off && !entry.deleted && !entry.mergedInto) lib.list = lib.list.filter(e => e !== entry)
}
/** 名字跟别的情绪撞了没有（编号、内置的名字、并掉的旧名字）。只是别人的近义词不算：自己单独成一种以后，写到它就是它自己。 */
function nameTaken(lib, name, self) {
  if (!name) return false
  const id = emotionId(name)
  if (isBuiltinEmotion(id) && id !== self) return true
  if (id !== self && lib.list.some(e => e.id === id) && resolveEmotion(id, lib.list) !== self) return true
  return allEmotions(lib, { withDeleted: true }).some(e => e.id !== self && e.label === name)
}

/**
 * 改一种情绪：label（内置的显示名；新情绪改名走 renameEmotion）、category（类别 id，'' 是未分类）、base（替身，'' 不要）、
 * use（用在什么场面）/ words（近义词，见 cleanWords）/ tags / face / act（跟默认一样就当没改）、react（REACT_KINDS）/ recall（RECALL_TONES 或 none）/ level（1~4）：'' 或 0 是跟替身，
 * off（停用：导演不再用它，画好的立绘照用）。平静不能停用。
 */
export function editEmotion(lib, value, patch = {}) {
  const id = resolveEmotion(value, lib.list)
  if (!id || (!isBuiltinEmotion(id) && !lib.list.some(e => e.id === id))) throw new Error('情绪库里没有这个情绪')
  const builtin = isBuiltinEmotion(id)
  const defaults = builtin ? builtinDefaults(id) : { label: id, category: '', base: '', use: '', words: '', tags: '', face: '', act: '', react: '', recall: '', level: 0 }
  // 先全部检查一遍，有不行的就什么都不改
  const next = {}
  if (typeof patch.label === 'string' && builtin) {
    const label = clip(patch.label, MAX_EMOTION_CHARS).replace(/[|@"“”'‘’]/g, '') || defaults.label
    if (label !== defaults.label && nameTaken(lib, label, id)) throw new Error(`「${label}」跟库里别的情绪重名了`)
    next.label = label
  }
  if (typeof patch.category === 'string') {
    const category = clip(patch.category, 24)
    if (category && !libOf(lib).categories.some(c => c.id === category)) throw new Error('没有这个类别')
    next.category = category
  }
  if (typeof patch.base === 'string') {
    const base = resolveEmotion(patch.base, lib.list)
    if (base && (base === id || standInsLoop(lib, id, base))) throw new Error('替身不能是它自己，也不能绕回它自己')
    if (base && !isBuiltinEmotion(base) && !lib.list.some(e => e.id === base && !e.mergedInto)) throw new Error('替身要选库里有的情绪')
    next.base = base
  }
  for (const k of ['use', 'tags', 'face', 'act']) if (typeof patch[k] === 'string') next[k] = clip(patch[k], TAG_CHARS)
  if (typeof patch.words === 'string') next.words = cleanWords(patch.words, [id, builtin ? next.label || emotionEntry(id, lib).label : ''])
  if (typeof patch.react === 'string') {
    if (patch.react && !REACT_KINDS.includes(patch.react)) throw new Error('没有这种反应')
    next.react = patch.react
  }
  if (typeof patch.recall === 'string') {
    if (patch.recall && patch.recall !== 'none' && !RECALL_TONES.includes(patch.recall)) throw new Error('没有这种闪回基调')
    next.recall = patch.recall
  }
  if (patch.level !== undefined && patch.level !== null) {
    const level = Number(patch.level) || 0
    if (level && !LEVELS.includes(level)) throw new Error('强弱写 1~4（微、中、强、极）')
    next.level = level
  }
  if (patch.off === true && id === 'neutral') throw new Error('平静不能停用：它是登场立绘，也是最后的兜底')
  const entry = ownEntry(lib, id)
  // 强弱给 0：新情绪是跟替身，内置的是恢复默认（内置的都有自己的强弱）
  for (const [k, v] of Object.entries(next)) { if ((builtin && v === defaults[k]) || (k === 'level' && !v)) delete entry[k]; else entry[k] = v }
  if (patch.off === true) entry.off = true
  else if (patch.off === false) delete entry.off
  delete entry.desc // 情绪库不再带描述（老存档里有的，玩家一改就去掉）
  if (builtin) tidyBuiltin(lib, id)
  return id
}
/** 把 base 设成 id 的替身会不会绕回 id。 */
function standInsLoop(lib, id, base) {
  let at = base
  for (let hop = 0; hop < 16; hop++) {
    const next = resolveEmotion(emotionEntry(at, lib).base, lib.list)
    if (!next) return false
    if (next === id) return true
    at = next
  }
  return false
}

/** 恢复默认：内置的回到内置的名字、类别、tag；新情绪清掉自己写的 tag（替身、类别不动）。 */
export function resetEmotion(lib, value) {
  const id = resolveEmotion(value, lib.list)
  const entry = lib.list.find(e => e.id === id)
  if (!entry) return id
  for (const k of isBuiltinEmotion(id) ? EDITABLE : OWN_FIELDS) delete entry[k]
  if (isBuiltinEmotion(id)) tidyBuiltin(lib, id)
  return id
}

/** 加一个新情绪（玩家加的，大家都能用）。category 不给就跟着替身归类（给 '' 是未分类）。回它的编号。 */
export function addEmotion(lib, { name, category, base = '' } = {}) {
  const raw = emotionId(name)
  if (!raw) throw new Error('写一个情绪短语')
  if (isBuiltinEmotion(raw) || nameTaken(lib, raw, '')) throw new Error(`库里已经有「${raw}」了`)
  const stand = resolveEmotion(base, lib.list)
  if (stand && !isBuiltinEmotion(stand) && !lib.list.some(e => e.id === stand && !e.mergedInto)) throw new Error('替身要选库里有的情绪')
  if (typeof category === 'string' && category && !libOf(lib).categories.some(c => c.id === category)) throw new Error('没有这个类别')
  lib.list.push({ id: raw, source: 'user', at: Date.now() })
  editEmotion(lib, raw, { category: typeof category === 'string' ? category : stand ? emotionEntry(stand, lib).category : '', base: stand })
  return raw
}

/** 删掉：新情绪整条去掉（并进它的也一起去掉）；内置的标成删掉（「恢复内置情绪」能拿回来）。平静不能删。画好的立绘不删。 */
export function deleteEmotions(lib, values = []) {
  const ids = [...new Set(values.map(v => resolveEmotion(v, lib.list)).filter(Boolean))]
  if (ids.includes('neutral')) throw new Error('平静不能删：它是登场立绘，也是最后的兜底')
  for (const id of ids) {
    if (isBuiltinEmotion(id)) ownEntry(lib, id).deleted = true
    else lib.list = lib.list.filter(e => e.id !== id && resolveEmotion(e.id, lib.list) !== id)
  }
  // 拿删掉的当替身的，替身空出来（之后按类别的代表情绪）
  for (const e of lib.list) if (e.base && ids.includes(resolveEmotion(e.base, lib.list))) delete e.base
  return ids
}

/** 恢复内置情绪：删掉的内置情绪拿回来（改过的名字、tag 不动）。ids 不给就全部。 */
export function restoreBuiltins(lib, ids = null) {
  for (const e of lib.list) if (isBuiltinEmotion(e.id) && e.deleted && !e.mergedInto && (!ids || ids.includes(e.id))) delete e.deleted
  for (const id of Object.keys(EMOTIONS)) tidyBuiltin(lib, id)
}

/**
 * 合并：from 里的情绪都并进 into。之后导演写它们、老剧本里的它们都算 into；它们画好的立绘 into 没画时先用（standIns）。
 * 新情绪并掉后留一条 { id, mergedInto }；内置的标成删掉并指过去。谁用过（who）并到 into 上。平静不能并掉。回真正并掉的。
 */
export function mergeInto(lib, values = [], target) {
  const into = resolveEmotion(target, lib.list)
  if (!into || (!isBuiltinEmotion(into) && !lib.list.some(e => e.id === into))) throw new Error('要并进去的情绪库里没有')
  const from = [...new Set(values.map(v => resolveEmotion(v, lib.list)).filter(id => id && id !== into))]
  if (from.includes('neutral')) throw new Error('平静不能并掉：它是登场立绘，也是最后的兜底')
  const who = new Set(lib.list.find(e => e.id === into)?.who || [])
  for (const id of from) {
    const old = lib.list.find(e => e.id === id)
    for (const w of old?.who || []) who.add(w)
    if (isBuiltinEmotion(id)) { const entry = ownEntry(lib, id); entry.deleted = true; entry.mergedInto = into }
    else lib.list = lib.list.map(e => (e.id === id ? { id, mergedInto: into, source: e.source, at: Date.now() } : e))
  }
  if (who.size && !isBuiltinEmotion(into)) { const entry = lib.list.find(e => e.id === into); if (entry.source !== 'user') entry.who = [...who].slice(-50) }
  // 拿并掉的当替身的，改成指 into（into 自己的替身是并掉的就不要了）；类别的代表情绪也一样
  for (const e of lib.list) if (e.base && from.includes(e.base)) { if (e.id === into) delete e.base; else e.base = into }
  if (Array.isArray(lib.categories)) for (const c of lib.categories) if (from.includes(c.rep)) c.rep = into
  return from
}

/** 新情绪改名：等于并进一个新名字（老剧本里的旧名字、画好的立绘跟过去）。回新编号。 */
export function renameEmotion(lib, value, name) {
  const id = resolveEmotion(value, lib.list)
  if (isBuiltinEmotion(id)) { editEmotion(lib, id, { label: name }); return id }
  const next = emotionId(name)
  if (!next) throw new Error('写一个情绪短语')
  if (next === id) return id
  if (isBuiltinEmotion(next) || nameTaken(lib, next, id)) throw new Error(`库里已经有「${next}」了`)
  const old = lib.list.find(e => e.id === id)
  if (!old) throw new Error('情绪库里没有这个情绪')
  const { id: _, desc, ...keep } = old
  lib.list = lib.list.filter(e => e.id !== next)
  lib.list.push({ ...keep, id: next, at: Date.now() })
  mergeInto(lib, [id], next)
  return next
}

/**
 * 加或改一个类别（id 不给是新加）；rep 是代表情绪。回类别 id。
 * 新加一类时顺手把同名的情绪当代表：库里还没有就加一个（你加的），已经有就把它挪进这一类（rep 另给了就用给的）。
 */
export function saveCategory(lib, { id = '', label = '', rep } = {}) {
  const categories = cleanCategories(lib.categories)
  const name = clip(label, CATEGORY_CHARS)
  const found = id ? categories.find(c => c.id === id) : null
  if (id && !found) throw new Error('没有这个类别')
  if (!found && !name) throw new Error('写一个类别名')
  if (name && categories.some(c => c !== found && c.label === name)) throw new Error(`已经有「${name}」这一类了`)
  const c = found || { id: 'c' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36), label: name, rep: '' }
  if (name) c.label = name
  if (typeof rep === 'string') c.rep = rep ? resolveEmotion(rep, lib.list) : ''
  lib.categories = found ? categories : [...categories, c]
  if (!found && typeof rep !== 'string') {
    const same = resolveEmotion(name, lib.list)
    const there = same && allEmotions(lib, { withDeleted: true }).find(e => e.id === same)
    if (there?.deleted) restoreBuiltins(lib, [same]) // 删掉的内置情绪叫这个名字：拿回来当代表
    c.rep = there ? same : addEmotion(lib, { name, category: c.id })
    if (there) editEmotion(lib, same, { category: c.id })
  }
  return c.id
}

/** 删一个类别：里面的情绪变成未分类。 */
export function deleteCategory(lib, id) {
  lib.categories = cleanCategories(lib.categories).filter(c => c.id !== id)
  for (const e of Object.keys(EMOTIONS)) if (emotionEntry(e, lib).category === id) editEmotion(lib, e, { category: '' })
  for (const e of lib.list) if (!isBuiltinEmotion(e.id) && !e.mergedInto && emotionEntry(e.id, lib).category === id) e.category = ''
}

/** 类别排顺序：ids 是新的顺序（没列到的排在后面）。 */
export function orderCategories(lib, ids = []) {
  const categories = cleanCategories(lib.categories)
  const rank = id => { const i = ids.indexOf(id); return i < 0 ? ids.length + categories.findIndex(c => c.id === id) : i }
  lib.categories = [...categories].sort((a, b) => rank(a.id) - rank(b.id))
}

/** 类别恢复成默认的那一套（情绪归哪一类不动；不认得的类别变未分类）。 */
export function resetCategories(lib) {
  lib.categories = DEFAULT_CATEGORIES.map(c => ({ ...c }))
}

/**
 * 合并之后，一个人的立绘和设计跟过去（原地改）：holder 是 game.looks[名字] 或全局档案里的那个人（{ sprites, spriteStatus, acting }）。
 * 差分的键最后一段是情绪（在别的动作里的带 @动作）：并掉的那种 into 还没有时整条挪过去（只换脸的底图引用跟着改）；into 已经有了就留着旧的不动。
 * 动作与表情设计里：每个动作里并掉的换成 into（那个动作里已经有 into 就去掉）；表情 into 没写时用并掉的那个的。
 * 回挪了几张。
 */
export function followMerge(holder, from = [], into) {
  if (!holder || !into || !from.length) return 0
  const fromSet = new Set(from.filter(e => e !== into))
  let moved = 0
  const sprites = holder.sprites || {}
  const renamed = new Map()
  for (const key of Object.keys(sprites)) {
    const at = key.lastIndexOf('|')
    const [emo, pose] = key.slice(at + 1).split('@')
    if (at < 0 || !fromSet.has(emo)) continue
    const target = key.slice(0, at + 1) + into + (pose ? '@' + pose : '')
    if (sprites[target]) continue
    sprites[target] = { ...sprites[key], emotion: into }
    delete sprites[key]
    if (holder.spriteStatus?.[key]) { holder.spriteStatus[target] = holder.spriteStatus[key]; delete holder.spriteStatus[key] }
    renamed.set(key, target)
    moved++
  }
  for (const r of Object.values(sprites)) if (r?.face?.from && renamed.has(r.face.from)) r.face = { ...r.face, from: renamed.get(r.face.from), ...(fromSet.has(r.face.anchor) ? { anchor: into } : {}) }
  const acting = holder.acting
  if (acting?.poses?.length) {
    // 一个情绪可以在好几个动作里：每个动作里并掉的换成 into（这个动作里已经有 into 就去掉）
    for (const p of acting.poses) p.emotions = [...new Set((p.emotions || []).map(e => (fromSet.has(e) ? into : e)))]
    acting.poses = acting.poses.filter(p => p.emotions.length)
    for (const e of fromSet) {
      if (acting.faces?.[e] && !acting.faces[into]) acting.faces[into] = acting.faces[e]
      if (acting.faces) delete acting.faces[e]
    }
  }
  return moved
}
