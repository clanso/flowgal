// 我的配乐：用户上传自己的音乐，每首写一段自由描述（听感、适合什么场面）和几个标签。
// 后台导演整理每一轮时看曲目表，自己决定这一幕放哪首、哪句换歌；导演还没整理完时前端按描述粗配（playback.js）。
// 每首还可以有分类（最多两层，「日常/校园」），整理界面按它分组；没分类的按第一个标签算。
// 曲库大了（超过每轮候选数，默认 60 首，设置 → 配乐里能调）时提示词里放不下整张表，每轮挑一批给导演看：
// 先照听音师说的这一轮该放什么样的音乐（情绪、场面、节奏的词）去对每首的标签、描述、曲名、分类，最像的先进（director.js 的 listenSounds）；
// 剩下的名额按分类的第一层（没分类按第一个标签）分组轮流挑（这一轮正文和上一幕基调里出现的标签、名字优先，其余按这一轮轮换），
// 保证导演每次都看得到各种情绪的曲子；上一幕在放的那首一定在。听音师关着或失败时只有后一半。
import { sniffAudio, randomId } from './bytes.js'
import { renameCategory, retag } from './catalog.js'

export const MAX_TRACK_BYTES = 50 * 1024 * 1024
const MAX_TRACKS = 5000
export const MUSIC_CANDIDATES = 60
export const MAX_MUSIC_CANDIDATES = 300
/** 设置里的每轮候选数（director.musicCandidates）；没填、填坏了用默认。 */
export const musicQuota = config => {
  const n = config?.director?.musicCandidates
  return Number.isInteger(n) && n >= 1 ? Math.min(MAX_MUSIC_CANDIDATES, n) : MUSIC_CANDIDATES
}
/** 听音师说的那几条最多占候选的这么多（其余留给分组轮流挑，免得导演只看到一种情绪）。 */
const HEARD_SHARE = 2 / 3

const clean = (text, max) => String(text || '').replace(/[\u0000-\u0008\u000b-\u001f]/g, '').trim().slice(0, max)
const cleanName = name => clean(String(name || '').replace(/\.[a-z0-9]{2,5}$/i, ''), 80) || '未命名'
const cleanTags = list => [...new Set((Array.isArray(list) ? list : String(list || '').split(/[,，、\n]/)).map(t => clean(t, 20)).filter(Boolean))].slice(0, 16)
/** 分类最多两层，用 / 隔开；空串是没分类。 */
const cleanCategory = text => String(text || '').split(/[\\/]/).map(part => clean(part, 20)).filter(Boolean).slice(0, 2).join('/')
const view = t => ({ id: t.id, name: t.name, category: t.category || '', description: t.description || '', tags: t.tags || [], file: t.file || '', assetId: t.assetId, bytes: t.bytes, addedAt: t.addedAt })

function applyMeta(track, meta) {
  if (typeof meta.name === 'string' && meta.name.trim()) track.name = cleanName(meta.name)
  if (meta.category !== undefined) { const c = cleanCategory(meta.category); if (c) track.category = c; else delete track.category }
  if (typeof meta.description === 'string') track.description = clean(meta.description, 600)
  if (meta.tags !== undefined) track.tags = cleanTags(meta.tags)
}

export function createMusic({ store }) {
  return {
    async list() { return (await store.readMusic()).tracks.map(view) },

    /** 上传一首：认格式（不信浏览器声明的类型）、存进素材目录。同名同大小的文件已经在库里时不重复存。 */
    async add(bytes, fileName) {
      if (!bytes || !bytes.length) throw new Error('文件是空的')
      if (bytes.length > MAX_TRACK_BYTES) throw new Error('单个文件最大 50 MB')
      const type = sniffAudio(bytes)
      if (!type) throw new Error('认不出这个音频格式，支持 mp3、m4a、aac、ogg、opus、wav、flac')
      const file = clean(fileName, 200)
      const { tracks } = await store.readMusic()
      const same = tracks.find(t => t.file && t.file === file && t.bytes === bytes.length)
      if (same) return view(same)
      if (tracks.length >= MAX_TRACKS) throw new Error(`最多 ${MAX_TRACKS} 首，先删掉一些`)
      const assetId = await store.saveAsset(bytes, type)
      const track = { id: randomId(12), name: cleanName(file), description: '', tags: [], file, assetId, bytes: bytes.length, addedAt: Date.now() }
      await store.updateMusic(m => { m.tracks.push(track) })
      return view(track)
    },

    /** 改名、分类、描述、标签。 */
    async update(id, patch = {}) {
      return view(await store.updateMusic(m => {
        const track = m.tracks.find(t => t.id === id)
        if (!track) throw new Error('没有这首曲子')
        applyMeta(track, patch)
        return track
      }))
    },

    /** 一批一起改（整理界面勾选后的批量操作）：分类、描述，addTags / removeTags 加标签、去标签（名字不能一起改）。返回改了几首。 */
    async updateMany(ids, patch = {}) {
      const wanted = new Set([].concat(ids).map(String))
      const { name, addTags, removeTags, ...meta } = patch || {}
      const add = addTags === undefined ? [] : cleanTags(addTags)
      const drop = removeTags === undefined ? [] : cleanTags(removeTags)
      return store.updateMusic(m => {
        let n = 0
        for (const t of m.tracks) {
          if (!wanted.has(t.id)) continue
          applyMeta(t, meta)
          if (add.length || drop.length) t.tags = cleanTags(retag(t.tags, add, drop))
          n++
        }
        return n
      })
    },

    /** 分类改名（子分类跟着走）。返回改了几首。 */
    async renameCategory(from, to) {
      const src = cleanCategory(from)
      const dst = cleanCategory(to)
      if (!src || !dst) throw new Error('分类名不能是空的')
      return store.updateMusic(m => {
        let n = 0
        for (const t of m.tracks) {
          const next = renameCategory(t.category || '', src, dst)
          if (next === null) continue
          t.category = cleanCategory(next)
          n++
        }
        return n
      })
    },

    /** 删掉几首（勾选后一起删），文件一起删。返回删掉了几首。 */
    async removeMany(ids) {
      const wanted = new Set([].concat(ids).map(String))
      const gone = await store.updateMusic(m => {
        const out = m.tracks.filter(t => wanted.has(t.id))
        m.tracks = m.tracks.filter(t => !wanted.has(t.id))
        return out
      })
      for (const t of gone) await store.removeAsset(t.assetId)
      return gone.length
    },

    async remove(id) {
      const assetId = await store.updateMusic(m => {
        const track = m.tracks.find(t => t.id === id)
        if (!track) throw new Error('没有这首曲子')
        m.tracks = m.tracks.filter(t => t !== track)
        return track.assetId
      })
      await store.removeAsset(assetId)
    },

    /** 清空曲库：曲目表和存进来的音频一起删（电脑上的原文件不动）。删不掉的文件跳过，记在 failed 里。 */
    async clear() {
      const gone = await store.updateMusic(m => {
        const out = m.tracks
        m.tracks = []
        return out
      })
      let failed = 0
      for (const t of gone) await store.removeAsset(t.assetId).catch(() => { failed++ })
      return { tracks: gone.length, bytes: gone.reduce((n, t) => n + (t.bytes || 0), 0), failed }
    },
  }
}

/** 字符串的固定哈希（轮换候选用：同一轮每次挑的一样，换一轮换一批）。 */
function hash(text) {
  let h = 2166136261
  for (const ch of String(text)) h = Math.imul(h ^ ch.codePointAt(0), 16777619) >>> 0
  return h
}

/** 一首曲子能被叫到的词：标签、曲名里的词、分类的每一层。 */
function termsOf(track) {
  const words = [...(track.tags || []), ...String(track.name || '').split(/[\s（）()、，,·/_\-]+/), ...String(track.category || '').split('/')]
  return [...new Set(words.map(w => w.trim()).filter(Boolean))]
}

/**
 * 一首曲子跟听音师说的那种音乐有多像：词跟标签、曲名、分类一样的最算数，互相包含的（紧张 / 紧张感）算一部分，
 * 只在描述里出现的也算不少（配乐的情绪常写在描述里），只沾一个字的算半分；分类跟听音师挑的一样再加分。
 */
function heardScore(track, item) {
  const terms = termsOf(track)
  const desc = String(track.description || '')
  let score = 0
  for (const w of new Set([item.what, ...item.words].filter(Boolean))) {
    let best = 0
    for (const t of terms) {
      if (t === w) best = Math.max(best, w.length ** 1.5 * 2)
      else if (t.includes(w) || w.includes(t)) best = Math.max(best, Math.min(w.length, t.length) ** 1.5 * (Math.min(w.length, t.length) > 1 ? 1 : 0.5))
    }
    if (w.length > 1 && desc.includes(w)) best = Math.max(best, w.length ** 1.5 * 0.75)
    score += best
  }
  const cat = String(track.category || '')
  if (cat && item.cats.includes(cat)) score += 6
  else if (cat && score > 0 && item.cats.some(c => c.split('/')[0] === cat.split('/')[0])) score += 1
  return score
}

/** 跟听到的这一条像的曲子，最像的排前面。只沾了一个字的不算像。 */
function rankHeard(list, item) {
  return list.map(t => ({ t, score: heardScore(t, item) })).filter(r => r.score >= 1)
    .sort((a, b) => b.score - a.score || String(a.t.name).localeCompare(String(b.t.name), 'zh-CN')).map(r => r.t)
}

/**
 * 曲库大时给导演看的那一批（见文件头）。text 是这一轮正文（加上上一幕的基调、地点），keep 是上一幕在放的曲子编号。
 * heard 是听音师说的配乐（cleanHeard 之后的 bgm：[{ at, what, words, cats }]）：给了就返回 { tracks, found }，
 * found 跟 heard 一一对应，是每条找到的曲子编号（导演日志里列出来）；没给就只返回曲子数组。
 */
export function musicCandidates(tracks, text, { limit = MUSIC_CANDIDATES, keep = '', heard = null } = {}) {
  const list = tracks || []
  const items = heard || []
  const done = (out, found) => (heard ? { tracks: out, found } : out)
  if (list.length <= limit) return done(list, items.map(item => rankHeard(list, item).slice(0, 5).map(t => t.id)))
  const out = []
  const taken = new Set()
  const take = t => { taken.add(t.id); out.push(t) }
  const kept = keep && list.find(t => t.id === keep)
  if (kept) take(kept)
  // 照听音师说的找：一条一首地轮流取，每条先保证最像的一首，合起来最多占 HEARD_SHARE
  const found = items.map(() => [])
  if (items.length) {
    const share = Math.max(items.length, Math.floor(limit * HEARD_SHARE))
    const per = Math.max(1, Math.floor(share / items.length))
    const lists = items.map(item => rankHeard(list, item))
    const next = lists.map(() => 0)
    for (let round = 0; round < per && out.length < limit && out.length < share + (kept ? 1 : 0); round++) {
      lists.forEach((ranked, i) => {
        if (out.length >= limit || out.length >= share + (kept ? 1 : 0)) return
        while (next[i] < ranked.length && taken.has(ranked[next[i]].id)) {
          // 别的条目已经拿走的（或者上一幕在放的），也算这一条找到的
          if (found[i].length < per && !found[i].includes(ranked[next[i]].id)) found[i].push(ranked[next[i]].id)
          next[i]++
        }
        if (next[i] >= ranked.length || found[i].length >= per) return
        const t = ranked[next[i]++]
        take(t)
        found[i].push(t.id)
      })
    }
  }
  // 剩下的名额：按分组轮流从每组拿一首，直到够数（组多的时候每组至少一首，组少的时候每组多拿几首）
  const body = String(text || '')
  const seed = hash(body)
  const score = t => [...(t.tags || []), ...String(t.name || '').split(/[\s（）()、，,·_\-]+/)].filter(w => w && body.includes(w)).reduce((n, w) => n + w.length, 0)
  const groups = new Map()
  for (const t of list) {
    if (taken.has(t.id)) continue
    const key = (t.category && t.category.split('/')[0]) || (t.tags && t.tags[0]) || '其他'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push({ t, score: score(t), roll: hash(seed + t.id) })
  }
  for (const g of groups.values()) g.sort((a, b) => b.score - a.score || a.roll - b.roll)
  const queues = [...groups.values()]
  for (let round = 0; out.length < limit && queues.some(q => q.length > round); round++) {
    for (const q of queues) {
      if (out.length >= limit) break
      if (q[round]) take(q[round].t)
    }
  }
  return done(out, found)
}

/** 上一幕的基调换成曲子标签里常写的词，跟正文一起参与挑候选（听音师没跑时也能大致对上情绪）。 */
const MOOD_WORDS = {
  daily: '日常 平静', cheerful: '轻快 欢快 明亮', comic: '滑稽 搞笑 欢快', sweet: '甜蜜 恋爱 温馨', touching: '感动 温馨 温柔',
  calm: '静谧 平静 宁静 舒缓', solemn: '庄严 肃穆 庄重', sad: '感伤 悲伤 伤感', despair: '绝望 悲痛 沉重', tense: '紧张 紧迫 不安',
  mystery: '悬疑 神秘', eerie: '诡异 恐怖 阴森', battle: '战斗 激战 激烈', heroic: '热血 激昂 壮阔', silence: '寂静 安静',
}
export const moodWords = mood => MOOD_WORDS[mood] || ''

/** 给听音师看的曲库常用标签：出现得多的在前，最多 limit 个，用「、」隔开。没有标签时为空。 */
export function tagBrief(tracks, limit = 80) {
  const count = new Map()
  for (const t of tracks || []) for (const tag of t.tags || []) count.set(tag, (count.get(tag) || 0) + 1)
  return [...count.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'zh-CN')).slice(0, limit).map(([tag]) => tag).join('、')
}

/** 给听音师看的曲库分类：按大类一组「日常：校园、家」，组之间用「；」隔开，曲子多的大类排前面。没有分类时为空。 */
export function musicCategoryBrief(tracks) {
  const groups = new Map()
  for (const t of tracks || []) {
    if (!t.category) continue
    const [top, sub] = t.category.split('/')
    if (!groups.has(top)) groups.set(top, { n: 0, subs: new Set() })
    const g = groups.get(top)
    g.n++
    if (sub) g.subs.add(sub)
  }
  return [...groups.entries()].sort((a, b) => b[1].n - a[1].n || a[0].localeCompare(b[0], 'zh-CN'))
    .map(([top, g]) => (g.subs.size ? `${top}：${[...g.subs].join('、')}` : top)).join('；')
}

/** 给导演看的曲目表：编号、曲名、描述、标签（分类的每一层排在标签前面）。没有曲子时返回空串（提示词里就不出现配乐一节）。 */
export function musicBrief(tracks) {
  return (tracks || []).map(t => {
    const words = [...new Set([...String(t.category || '').split('/').filter(Boolean), ...(t.tags || [])])]
    return `- ${t.id}｜${t.name}${t.description ? '｜' + t.description : ''}${words.length ? '｜' + words.join('、') : ''}`
  }).join('\n')
}
