// 音效库描述文件（flowgal-sounds.json）：放在音效文件夹最上面一层，按相对路径记每个声音的名字、种类、分类、描述、标签、音量，
// 打字音的性别（gender）和推荐用途（use：落字音效、界面音的哪个槽，或者旁白）。
// 导入文件夹时浏览器读它给新导入的声音带上标签；「导出描述」写回同样的格式。一次导入里可以有好几份（每个子文件夹一份也行），
// 每个声音按离它最近的那一份对。前后端共用，不依赖 Node。
export const SOUND_SIDECAR = 'flowgal-sounds.json'
const FORMAT = 'flowgal-sounds'
const FIELDS = ['name', 'kind', 'category', 'description', 'tags', 'volume', 'gender', 'use']

const slash = path => String(path || '').replace(/\\/g, '/').replace(/^\/+/, '')
const dirOf = path => { const p = slash(path); const i = p.lastIndexOf('/'); return i < 0 ? '' : p.slice(0, i + 1) }

/** 读一份描述文件：返回 相对路径 → { name, kind, category, description, tags, volume, gender, use }。格式不对时抛错。 */
export function readSoundSidecar(text) {
  const data = JSON.parse(text)
  if (!data || data.format !== FORMAT || !Array.isArray(data.sounds)) throw new Error(`${SOUND_SIDECAR} 不是 FlowGal 的音效描述文件`)
  const out = new Map()
  for (const s of data.sounds) {
    if (!s || typeof s.file !== 'string' || !s.file) continue
    const meta = {}
    for (const key of FIELDS) if (s[key] !== undefined) meta[key] = s[key]
    out.set(slash(s.file), meta)
  }
  return out
}

/**
 * 一次导入里的几份描述文件合起来：sidecars 是 [{ path: 描述文件在导入里的路径, map: readSoundSidecar 的结果 }]。
 * 返回 lookup(音频的路径) → { file: 相对那份描述文件的路径, meta }；没对上的 file 是相对导入根的路径、meta 为 null。
 */
export function soundMatcher(sidecars) {
  const list = (sidecars || []).map(s => ({ dir: dirOf(s.path), map: s.map })).sort((a, b) => b.dir.length - a.dir.length)
  return path => {
    const p = slash(path)
    for (const { dir, map } of list) {
      if (!p.startsWith(dir)) continue
      const rel = p.slice(dir.length)
      if (map.has(rel)) return { file: rel, meta: map.get(rel) }
    }
    // 浏览器给的路径带着所选文件夹的名字（选的是 音效/，路径是 音效/门窗/开门.ogg）：去掉第一层，跟没有描述文件时一样。
    return { file: p.includes('/') ? p.slice(p.indexOf('/') + 1) : p, meta: null }
  }
}

/** 把音效库写成描述文件（只收有原文件路径的，导入时才对得上）。 */
export function writeSoundSidecar(sounds, note = '') {
  return JSON.stringify({
    format: FORMAT,
    version: 1,
    ...(note ? { note } : {}),
    sounds: (sounds || []).filter(s => s.file).map(s => ({
      file: s.file, name: s.name, kind: s.kind || 'sfx', category: s.category || '', description: s.description || '', tags: s.tags || [],
      ...(s.volume !== undefined && s.volume !== 1 ? { volume: s.volume } : {}),
      ...(s.gender ? { gender: s.gender } : {}),
      ...(s.use ? { use: s.use } : {}),
    })),
  }, null, 2) + '\n'
}
