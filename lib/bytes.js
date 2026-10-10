// 两个宿主都能用的字节工具：DSH 的宿主半边跑在 Node（Electron 43，Node 22 以上），酒馆版整个跑在浏览器。
// 只用两边都有的 Web 标准接口（Uint8Array、atob / btoa、crypto、CompressionStream），核心逻辑里不出现 Buffer、node:crypto、node:zlib。

/** 字节 → base64（大图分块拼，免得参数太多爆栈）。 */
export function toBase64(bytes) {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  let text = ''
  for (let i = 0; i < b.length; i += 0x8000) text += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000))
  return btoa(text)
}

/** base64（可以带 data:…;base64, 前缀）→ 字节。 */
export function fromBase64(data) {
  const text = atob(String(data || '').replace(/^data:[^;]*;base64,/, '').replace(/\s+/g, ''))
  const out = new Uint8Array(text.length)
  for (let i = 0; i < text.length; i++) out[i] = text.charCodeAt(i)
  return out
}

export const utf8 = text => new TextEncoder().encode(String(text))

export function concatBytes(list) {
  const out = new Uint8Array(list.reduce((n, b) => n + b.length, 0))
  let at = 0
  for (const b of list) { out.set(b, at); at += b.length }
  return out
}

/** [0, max) 的随机整数（出图种子用，max 最大 2^32）。 */
export function randomSeed(max = 2 ** 32 - 1) {
  return crypto.getRandomValues(new Uint32Array(1))[0] % max
}

/** 随机编号（去掉横线的 UUID，len 给了就截这么长）。 */
export const randomId = (len = 32) => crypto.randomUUID().replace(/-/g, '').slice(0, len)

/** 读完一个字节流；超过 limit 字节就报错（解压炸弹、上游乱回）。 */
async function drain(stream, limit) {
  const chunks = []
  let size = 0
  const reader = stream.getReader()
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    size += value.length
    if (size > limit) { await reader.cancel().catch(() => {}); throw new Error('解压后太大') }
    chunks.push(value)
  }
  return concatBytes(chunks)
}

/** zlib 压缩（PNG 的 IDAT 用）。 */
export const deflate = bytes => drain(new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate')), Infinity)

/** 解 raw deflate（ZIP 里的文件用），最多 limit 字节。 */
export const inflateRaw = (bytes, limit = Infinity) => drain(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw')), limit)

/** 检测图片真实格式（不信任上游声明的 content-type）。 */
export function sniffImage(bytes) {
  const b = bytes
  if (!b || b.length < 12) return null
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png'
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg'
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return 'image/webp'
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) return 'image/gif'
  return null
}

/** 检测音频真实格式：mp3（ID3 标签或帧同步）、aac（ADTS）、ogg / opus、wav、flac、m4a。认不出返回 null。 */
export function sniffAudio(bytes) {
  const b = bytes
  if (!b || b.length < 12) return null
  const ascii = (at, text) => [...text].every((ch, i) => b[at + i] === ch.charCodeAt(0))
  if (b[0] === 0xff && (b[1] & 0xf6) === 0xf0) return 'audio/aac'
  if (ascii(0, 'ID3') || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0)) return 'audio/mpeg'
  if (ascii(0, 'OggS')) return 'audio/ogg'
  if (ascii(0, 'RIFF') && ascii(8, 'WAVE')) return 'audio/wav'
  if (ascii(0, 'fLaC')) return 'audio/flac'
  if (ascii(4, 'ftyp') && ['M4A', 'M4B', 'mp4', 'iso', 'dash'].some(brand => ascii(8, brand))) return 'audio/mp4'
  return null
}

/** 素材的格式和扩展名（两个宿主存素材时一样命名）。 */
export const MIME_EXT = {
  'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif',
  'audio/mpeg': 'mp3', 'audio/ogg': 'ogg', 'audio/wav': 'wav', 'audio/flac': 'flac', 'audio/mp4': 'm4a', 'audio/aac': 'aac',
}
