// 音效库：玩家导入的音效（响一次的：关门、手机震动、杯子摔碎）、环境音（循环的底：雨声、蝉鸣、车站广播）
// 和打字音（一个字响一下的哔哔声，比如逆转裁判的男声 / 女声哔哔、打字机；当角色的音色用，不给导演挑）。
// 每个声音有名字、分类、描述和标签。库可以很大（几千个），导演提示词里放不下，所以每一轮按正文挑一批候选：
// 标签、名字、分类在这一轮正文（和上一幕的地点、天气）里出现得越多、越长越靠前，每个分类只取几个，免得被一类占满。
// 库比名额大时，导演之前可以先让听音师读一遍正文（director.js 的 listenSounds），列出听得见的声音和找它们的近义词，
// 候选先照它列的找（正文写「砸了杯子」也找得到标着「摔碎」的声音），剩下的名额再按正文对词补。
// 导演从候选里给场景配环境音、给发出声音的那句配音效（director.js 的 amb / sfx）。
import { sniffAudio, randomId } from './bytes.js'
import { SOUND_USES } from './sounds.js'

export const MAX_SOUNDLIB_BYTES = 20 * 1024 * 1024
export const MAX_SOUNDS = 5000
export const SOUND_KINDS = ['sfx', 'ambience', 'blip']
/** 打字音标的性别（「按性别用库里的打字音」时分给谁）：female 女声、male 男声，空串是不分男女。 */
export const BLIP_GENDERS = ['female', 'male', '']
/** 每一轮给导演看的候选数（设置 → 音效库 / 环境音库里能调；一轮最多配几个音效见设置，lib/limits.js）。 */
export const SFX_CANDIDATES = 36
export const AMBIENCE_CANDIDATES = 12
export const MAX_CANDIDATES = 300
/** 设置里的候选数（director.soundCandidates）；没填、填坏了用默认。 */
export const candidateQuota = config => {
  const set = config?.director?.soundCandidates || {}
  const n = (v, d) => (Number.isInteger(v) && v >= 1 ? Math.min(MAX_CANDIDATES, v) : d)
  return { sfx: n(set.sfx, SFX_CANDIDATES), ambience: n(set.ambience, AMBIENCE_CANDIDATES) }
}

const clean = (text, max) => String(text ?? '').replace(/[\u0000-\u0008\u000b-\u001f]/g, '').replace(/\s+/g, ' ').trim().slice(0, max)
const cleanPath = text => String(text ?? '').replace(/[\u0000-\u001f]/g, '').replace(/\\/g, '/').trim().slice(0, 300)
const cleanName = name => clean(String(name || '').replace(/^.*[\\/]/, '').replace(/\.[a-z0-9]{2,5}$/i, ''), 80) || '未命名'
const cleanTags = list => [...new Set((Array.isArray(list) ? list : String(list || '').split(/[,，、\n]/)).map(t => clean(t, 20)).filter(Boolean))].slice(0, 24)
/** 分类最多两层，用 / 隔开：「门窗/敲门」。 */
const cleanCategory = text => String(text || '').split(/[\\/]/).map(part => clean(part, 20)).filter(Boolean).slice(0, 2).join('/') || '未分类'
const cleanVolume = v => { const n = Number(v); return Number.isFinite(n) ? Math.round(Math.min(2, Math.max(0, n)) * 100) / 100 : 1 }
const view = s => ({ id: s.id, name: s.name, kind: s.kind, category: s.category, description: s.description || '', tags: s.tags || [], volume: s.volume ?? 1, gender: s.gender || '', use: s.use || '', file: s.file || '', assetId: s.assetId, bytes: s.bytes, addedAt: s.addedAt })

function applyMeta(sound, meta) {
  if (typeof meta.name === 'string' && meta.name.trim()) sound.name = clean(meta.name, 80)
  if (SOUND_KINDS.includes(meta.kind)) sound.kind = meta.kind
  if (meta.category !== undefined) sound.category = cleanCategory(meta.category)
  if (typeof meta.description === 'string') sound.description = clean(meta.description, 300)
  if (meta.tags !== undefined) sound.tags = cleanTags(meta.tags)
  if (meta.volume !== undefined) sound.volume = cleanVolume(meta.volume)
  // 打字音的性别；推荐用途（落字音效、界面音的哪个槽，或者旁白）：「声音」页一键套用时按它。空串是去掉。
  if (BLIP_GENDERS.includes(meta.gender)) { if (meta.gender) sound.gender = meta.gender; else delete sound.gender }
  if (meta.use === '' || SOUND_USES.includes(meta.use)) { if (meta.use) sound.use = meta.use; else delete sound.use }
}

export function createSoundLib({ store }) {
  /** 改名字、种类、分类、描述、标签、音量。 */
  const update = async (id, patch = {}) => view(await store.updateSoundLib(lib => {
    const sound = lib.sounds.find(s => s.id === id)
    if (!sound) throw new Error('没有这个声音')
    applyMeta(sound, patch)
    return sound
  }))

  return {
    async list() { return (await store.readSoundLib()).sounds.map(view) },

    /**
     * 导入一个：认格式（不信浏览器声明的类型）、存进素材目录。file 是相对导入文件夹的路径，meta 是描述文件里这一条
     * （名字、种类、分类、描述、标签、音量）。同一个文件（同路径同大小）已经在库里时不重复存，只按 meta 更新。
     */
    async add(bytes, fileName, meta = {}) {
      if (!bytes || !bytes.length) throw new Error('文件是空的')
      if (bytes.length > MAX_SOUNDLIB_BYTES) throw new Error(`单个文件最大 ${MAX_SOUNDLIB_BYTES / 1048576} MB`)
      const type = sniffAudio(bytes)
      if (!type) throw new Error('认不出这个音频格式，支持 mp3、m4a、aac、ogg、opus、wav、flac')
      const file = cleanPath(fileName)
      const { sounds } = await store.readSoundLib()
      const same = sounds.find(s => s.file && s.file === file && s.bytes === bytes.length)
      if (same) return update(same.id, meta || {})
      if (sounds.length >= MAX_SOUNDS) throw new Error(`音效库最多 ${MAX_SOUNDS} 个，先删掉一些`)
      const assetId = await store.saveAsset(bytes, type)
      // 没有描述文件时：名字取文件名，分类取所在的文件夹。
      const folder = file.split('/').slice(0, -1).pop() || ''
      const sound = { id: randomId(10), name: cleanName(file), kind: 'sfx', category: cleanCategory(folder), description: '', tags: [], volume: 1, file, assetId, bytes: bytes.length, addedAt: Date.now() }
      applyMeta(sound, meta || {})
      await store.updateSoundLib(lib => { lib.sounds.push(sound) })
      return view(sound)
    },

    update,

    /** 删掉几个（一整个分类也走这里），文件一起删。返回删掉了几个。 */
    async remove(ids) {
      const wanted = new Set([].concat(ids).map(String))
      const gone = await store.updateSoundLib(lib => {
        const out = lib.sounds.filter(s => wanted.has(s.id))
        lib.sounds = lib.sounds.filter(s => !wanted.has(s.id))
        return out.map(s => s.assetId)
      })
      for (const assetId of gone) await store.removeAsset(assetId)
      return gone.length
    },

    /**
     * 清空一种（kind 是 sfx / ambience / blip；不给就全清），文件一起删、电脑上的原文件不动。keep 里的编号（设置里正在用的）留着，
     * 记在 kept 里；删不掉的文件跳过，记在 failed 里。
     */
    async clear(kind = '', { keep = [] } = {}) {
      const keepSet = new Set(keep)
      let kept = 0
      const gone = await store.updateSoundLib(lib => {
        const out = []
        lib.sounds = lib.sounds.filter(s => {
          if (kind && (s.kind || 'sfx') !== kind) return true
          if (keepSet.has(s.id)) { kept++; return true }
          out.push(s)
          return false
        })
        return out
      })
      let failed = 0
      for (const s of gone) await store.removeAsset(s.assetId).catch(() => { failed++ })
      return { sounds: gone.length, bytes: gone.reduce((n, s) => n + (s.bytes || 0), 0), kept, failed }
    },
  }
}

// ───────────────────────── 给导演挑候选 ─────────────────────────

/** 一个声音能被正文「叫到」的词：标签、名字里的词、分类的每一层。 */
function termsOf(sound) {
  const words = [...(sound.tags || []), ...String(sound.name || '').split(/[\s（）()、，,·/_\-]+/), ...String(sound.category || '').split('/')]
  return [...new Set(words.map(w => w.trim()).filter(w => w && w !== '未分类'))]
}

/** 正文里出现得越多、词越长（越具体）分越高。 */
function scoreOf(sound, text) {
  let score = 0
  for (const term of termsOf(sound)) if (text.includes(term)) score += term.length ** 1.5
  return score
}

/**
 * 从库里挑这一轮的候选：{ ambience: [...], sfx: [...] }。
 * 某一种总数不超过名额时全给；否则按得分取，每个分类最多 perCategory 个，keep（上一幕在放的环境音）一定在。
 * heard（听音师列出的声音，cleanHeard 之后）：先照它列的一条条找，各取最像的 perHeard 个（轮流取，每条先保证一个），
 * 剩下的名额再按正文对词补；这时多返回 found：每条听到的声音找到了哪些（编号，跟 heard 一一对应），导演日志里列出来。
 */
export function soundCandidates(sounds, text, { sfx = SFX_CANDIDATES, ambience = AMBIENCE_CANDIDATES, perCategory = 4, perHeard = 3, keep = [], heard = null } = {}) {
  const body = String(text || '')
  const keepSet = new Set(keep)
  const found = { ambience: [], sfx: [] }
  const pickKind = (kind, limit) => {
    const all = (sounds || []).filter(s => (s.kind || 'sfx') === kind)
    const items = heard?.[kind] || []
    if (all.length <= limit) {
      found[kind] = items.map(item => rankHeard(all, item).slice(0, perHeard).map(s => s.id))
      return all
    }
    const out = []
    const taken = new Set()
    const take = s => { taken.add(s.id); out.push(s) }
    for (const s of all) if (keepSet.has(s.id) && out.length < limit) take(s)
    // 照听音师列的找：一轮一条地轮流取，每条先保证最像的一个
    const lists = items.map(item => rankHeard(all, item))
    found[kind] = items.map(() => [])
    const next = lists.map(() => 0)
    for (let round = 0; round < perHeard && out.length < limit; round++) {
      lists.forEach((list, i) => {
        while (next[i] < list.length && taken.has(list[next[i]].id)) {
          // 别的条目已经拿走的，也算这一条找到的
          if (found[kind][i].length < perHeard && !found[kind][i].includes(list[next[i]].id)) found[kind][i].push(list[next[i]].id)
          next[i]++
        }
        if (out.length >= limit || next[i] >= list.length || found[kind][i].length >= perHeard) return
        const s = list[next[i]++]
        take(s)
        found[kind][i].push(s.id)
      })
    }
    // 剩下的名额按正文对词补
    const ranked = all.filter(s => !taken.has(s.id)).map(s => ({ s, score: scoreOf(s, body) }))
      .filter(r => r.score > 0)
      .sort((a, b) => b.score - a.score || String(a.s.name).localeCompare(String(b.s.name), 'zh-CN'))
    const perCat = new Map()
    for (const s of out) perCat.set(s.category, (perCat.get(s.category) || 0) + 1)
    for (const { s } of ranked) {
      if (out.length >= limit) break
      const n = perCat.get(s.category) || 0
      if (n >= perCategory) continue
      perCat.set(s.category, n + 1)
      take(s)
    }
    return out
  }
  const picked = { ambience: pickKind('ambience', ambience), sfx: pickKind('sfx', sfx) }
  return heard ? { ...picked, found } : picked
}

// ───────────────────────── 听音师 ─────────────────────────

/** 这一种的声音比名额多（导演看不全）：这时候才值得先听一遍。 */
export function overflowing(sounds, { sfx = SFX_CANDIDATES, ambience = AMBIENCE_CANDIDATES } = {}) {
  const count = kind => (sounds || []).filter(s => (s.kind || 'sfx') === kind).length
  return { sfx: count('sfx') > sfx, ambience: count('ambience') > ambience }
}

/** 给听音师看的分类：按大类一组「门窗：敲门、开关门」，组之间用「；」隔开，声音多的大类排前面。没有分类时为空。 */
export function categoryBrief(sounds, kind) {
  const groups = new Map()
  for (const s of sounds || []) {
    if ((s.kind || 'sfx') !== kind || !s.category || s.category === '未分类') continue
    const [top, sub] = s.category.split('/')
    if (!groups.has(top)) groups.set(top, { n: 0, subs: new Set() })
    const g = groups.get(top)
    g.n++
    if (sub) g.subs.add(sub)
  }
  return [...groups.entries()].sort((a, b) => b[1].n - a[1].n || a[0].localeCompare(b[0], 'zh-CN'))
    .map(([top, g]) => (g.subs.size ? `${top}：${[...g.subs].join('、')}` : top)).join('；')
}

/** 听音师写的空词：去库里找不出东西，还会对上一大片。 */
const FILLER = new Set(['音效', '声音', '声', '音', '响声', '声响', '背景音', '背景声', '环境音', '素材', '效果音'])
const MAX_HEARD = { ambience: 8, sfx: 40 }

/**
 * 听音师的输出规整成 { ambience: [...], sfx: [...] }，每条 { at, what, words, cats }：
 * at 是单元编号（对不上的空着），words 去重、去空词、最多 12 个，cats 最多 3 个两层分类。没写 what 也没写词的丢掉。
 */
export function cleanHeard(raw, units = []) {
  const ids = new Set((units || []).map(u => u.id))
  const unitOf = v => { const id = String(v ?? '').trim(); return ids.has(id) ? id : ids.has('U' + id) ? 'U' + id : '' }
  const listOf = v => (Array.isArray(v) ? v : typeof v === 'string' ? v.split(/[,，、;；\n]/) : [])
  const item = v => {
    if (!v || typeof v !== 'object') return null
    const what = clean(v.what, 30)
    const words = [...new Set(listOf(v.words).map(w => clean(w, 12)).filter(w => w && !FILLER.has(w)))].slice(0, 12)
    if (!what && !words.length) return null
    const cats = [...new Set(listOf(v.cats).map(cleanCategory).filter(c => c !== '未分类'))].slice(0, 3)
    return { at: unitOf(v.at), what, words, cats }
  }
  const kind = (value, max) => (Array.isArray(value) ? value : []).map(item).filter(Boolean).slice(0, max)
  return { ambience: kind(raw?.amb ?? raw?.ambience, MAX_HEARD.ambience), sfx: kind(raw?.sfx, MAX_HEARD.sfx) }
}

/**
 * 一个声音跟听到的那件事有多像：听音师的词跟它的标签、名字、分类一样的最算数，互相包含的（摔碎 / 盘子摔碎）算一部分，
 * 只在描述里出现的算一点，只沾一个字的算半分；分类跟听音师挑的一样再加分。词一个都没对上、分类也不一样的是 0。
 */
function heardScore(sound, item) {
  const terms = termsOf(sound)
  const desc = String(sound.description || '')
  let score = 0
  for (const w of new Set([item.what, ...item.words].filter(Boolean))) {
    let best = 0
    for (const t of terms) {
      if (t === w) best = Math.max(best, w.length ** 1.5 * 2)
      else if (t.includes(w) || w.includes(t)) best = Math.max(best, Math.min(w.length, t.length) ** 1.5 * (Math.min(w.length, t.length) > 1 ? 1 : 0.5))
    }
    if (!best && w.length > 1 && desc.includes(w)) best = w.length ** 1.5 * 0.5
    score += best
  }
  const cat = String(sound.category || '')
  if (item.cats.includes(cat)) score += 6
  else if (score > 0 && item.cats.some(c => c.split('/')[0] === cat.split('/')[0])) score += 1
  return score
}

/** 这一种里跟听到的这件事像的，最像的排前面。只沾了一个字的（「门」碰上「门禁」）不算像。 */
function rankHeard(all, item) {
  return all.map(s => ({ s, score: heardScore(s, item) })).filter(r => r.score >= 1)
    .sort((a, b) => b.score - a.score || String(a.s.name).localeCompare(String(b.s.name), 'zh-CN')).map(r => r.s)
}

/** 上一幕的天气、时段换成正文里会出现的字，跟地点一起参与挑环境音。 */
const SCENE_WORDS = {
  rain: '雨', storm: '暴雨 雷', snow: '雪 风', sakura: '春 风', leaves: '秋 风 落叶', fireflies: '夏 夜 虫', fog: '雾', stars: '夜',
  dawn: '清晨 鸟', morning: '早晨 鸟', noon: '中午', dusk: '黄昏', evening: '傍晚', night: '夜', midnight: '深夜 夜',
}
export function sceneWords(scene) {
  if (!scene) return ''
  return [scene.location, SCENE_WORDS[scene.weather], SCENE_WORDS[scene.time]].filter(Boolean).join(' ')
}

/** 给导演看的一行：编号｜名字｜分类｜描述（截短）。 */
export function soundLine(s) {
  const desc = s.description ? '｜' + (s.description.length > 40 ? s.description.slice(0, 40) + '…' : s.description) : ''
  return `- ${s.id}｜${s.name}｜${s.category}${desc}`
}
