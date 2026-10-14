// 我的配乐：用户上传自己的音乐，每首写一段自由描述（听感、适合什么场面）和几个标签。
// 后台导演整理每一轮时看曲目表，自己决定这一幕放哪首、哪句换歌；导演还没整理完时前端按描述粗配（playback.js）。
// 每首还可以有分类（最多两层，「日常/校园」），整理界面按它分组；没分类的按第一个标签算。
// 曲库大了（超过 MUSIC_CANDIDATES 首）时提示词里放不下整张表：按分类的第一层（没分类按第一个标签）分组，每组挑几首（这一轮正文里提到的标签、
// 名字优先，其余按这一轮轮换），保证导演每次都看得到各种情绪的曲子；上一幕在放的那首一定在。
import { sniffAudio, randomId } from './bytes.js'
import { renameCategory, retag } from './catalog.js'

export const MAX_TRACK_BYTES = 50 * 1024 * 1024
const MAX_TRACKS = 5000
export const MUSIC_CANDIDATES = 60

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

/** 曲库大时给导演看的那一批（见文件头）。text 是这一轮正文，keep 是上一幕在放的曲子编号。 */
export function musicCandidates(tracks, text, { limit = MUSIC_CANDIDATES, keep = '' } = {}) {
  const list = tracks || []
  if (list.length <= limit) return list
  const body = String(text || '')
  const seed = hash(body)
  const score = t => [...(t.tags || []), ...String(t.name || '').split(/[\s（）()、，,·_\-]+/)].filter(w => w && body.includes(w)).reduce((n, w) => n + w.length, 0)
  const groups = new Map()
  for (const t of list) {
    const key = (t.category && t.category.split('/')[0]) || (t.tags && t.tags[0]) || '其他'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push({ t, score: score(t), roll: hash(seed + t.id) })
  }
  for (const g of groups.values()) g.sort((a, b) => b.score - a.score || a.roll - b.roll)
  const out = []
  const kept = keep && list.find(t => t.id === keep)
  if (kept) out.push(kept)
  // 轮流从每组拿一首，直到够数：组多的时候每组至少一首，组少的时候每组多拿几首。
  const queues = [...groups.values()]
  for (let round = 0; out.length < limit && queues.some(q => q.length > round); round++) {
    for (const q of queues) {
      if (out.length >= limit) break
      const item = q[round]
      if (item && item.t !== kept) out.push(item.t)
    }
  }
  return out
}

/** 给导演看的曲目表：编号、曲名、描述、标签（分类的每一层排在标签前面）。没有曲子时返回空串（提示词里就不出现配乐一节）。 */
export function musicBrief(tracks) {
  return (tracks || []).map(t => {
    const words = [...new Set([...String(t.category || '').split('/').filter(Boolean), ...(t.tags || [])])]
    return `- ${t.id}｜${t.name}${t.description ? '｜' + t.description : ''}${words.length ? '｜' + words.join('、') : ''}`
  }).join('\n')
}
