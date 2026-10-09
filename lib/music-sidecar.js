// 配乐描述文件（flowgal-music.json）：和音乐放在同一个文件夹里，按文件名记每首的曲名、描述、标签。
// 导入文件夹时浏览器读它给新上传的曲子补描述；「导出描述」写回同样的格式。前后端共用，不依赖 Node。

export const MUSIC_SIDECAR = 'flowgal-music.json'
const FORMAT = 'flowgal-music'
/** 浏览器端先按扩展名挑出音频（文件夹里常混着封面、歌词）；真正认格式在服务端按文件头。 */
export const AUDIO_FILE = /\.(mp3|ogg|oga|opus|wav|flac|m4a|aac)$/i

/** 读描述文件：返回 文件名 → { name, description, tags }。格式不对时抛错。 */
export function readSidecar(text) {
  const data = JSON.parse(text)
  if (!data || data.format !== FORMAT || !Array.isArray(data.tracks)) throw new Error(`${MUSIC_SIDECAR} 不是 FlowGal 的配乐描述文件`)
  const out = new Map()
  for (const t of data.tracks) {
    if (!t || typeof t.file !== 'string' || !t.file) continue
    out.set(t.file, { name: t.name, description: t.description, tags: t.tags })
  }
  return out
}

/** 把曲库写成描述文件（只收有原文件名的曲子，导入时才对得上）。 */
export function writeSidecar(tracks, note = '') {
  return JSON.stringify({
    format: FORMAT,
    version: 1,
    ...(note ? { note } : {}),
    tracks: (tracks || []).filter(t => t.file).map(t => ({ file: t.file, name: t.name, description: t.description || '', tags: t.tags || [] })),
  }, null, 2) + '\n'
}
