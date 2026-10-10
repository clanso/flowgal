// 我的配乐：用户上传自己的音乐，每首写一段自由描述（听感、适合什么场面）和几个标签。
// 后台导演整理每一轮时会看到整张曲目表，自己决定这一幕放哪首、哪句换歌；导演还没整理完时前端按描述粗配（playback.js）。
import { sniffAudio, randomId } from './bytes.js'

export const MAX_TRACK_BYTES = 50 * 1024 * 1024
const MAX_TRACKS = 300

const clean = (text, max) => String(text || '').replace(/[\u0000-\u0008\u000b-\u001f]/g, '').trim().slice(0, max)
const cleanName = name => clean(String(name || '').replace(/\.[a-z0-9]{2,5}$/i, ''), 80) || '未命名'
const cleanTags = list => [...new Set((Array.isArray(list) ? list : String(list || '').split(/[,，、\n]/)).map(t => clean(t, 20)).filter(Boolean))].slice(0, 16)
const view = t => ({ id: t.id, name: t.name, description: t.description || '', tags: t.tags || [], file: t.file || '', assetId: t.assetId, bytes: t.bytes, addedAt: t.addedAt })

function applyMeta(track, meta) {
  if (typeof meta.name === 'string' && meta.name.trim()) track.name = cleanName(meta.name)
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

    /** 改名、描述、标签。 */
    async update(id, patch = {}) {
      return view(await store.updateMusic(m => {
        const track = m.tracks.find(t => t.id === id)
        if (!track) throw new Error('没有这首曲子')
        applyMeta(track, patch)
        return track
      }))
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
  }
}

/** 给导演看的曲目表：编号、曲名、描述、标签。没有曲子时返回空串（提示词里就不出现配乐一节）。 */
export function musicBrief(tracks) {
  return (tracks || []).map(t => `- ${t.id}｜${t.name}${t.description ? '｜' + t.description : ''}${t.tags && t.tags.length ? '｜' + t.tags.join('、') : ''}`).join('\n')
}
