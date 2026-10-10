// 最小的 PNG 工具（不引第三方库）：读宽高，生成灰度图。局部重绘的遮罩由核心按框自己画，不收浏览器传来的遮罩。
// 只用 Web 标准接口（两个宿主都能跑）；压缩是异步的，所以生成 PNG 的函数都返回 Promise。
import { deflate, concatBytes } from '../bytes.js'

const SIGNATURE = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

// CRC32 自己算（不靠 zlib）。
const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
function crc32(buf) {
  let c = 0xffffffff
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

const ascii = (b, at, n) => String.fromCharCode(...b.subarray(at, at + n))

/** PNG 的宽高（读 IHDR）；不是 PNG 返回 null。 */
export function pngSize(bytes) {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || [])
  if (b.length < 24 || SIGNATURE.some((v, i) => b[i] !== v) || ascii(b, 12, 4) !== 'IHDR') return null
  const view = new DataView(b.buffer, b.byteOffset, b.byteLength)
  return { width: view.getUint32(16), height: view.getUint32(20) }
}

function chunk(type, data) {
  const out = new Uint8Array(12 + data.length)
  const view = new DataView(out.buffer)
  view.setUint32(0, data.length)
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i)
  out.set(data, 8)
  view.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)))
  return out
}

/** 8 位灰度 PNG：pixel(x, y) 返回 0~255。 */
export async function grayPng(width, height, pixel) {
  const raw = new Uint8Array((width + 1) * height)
  for (let y = 0; y < height; y++) {
    const row = y * (width + 1)
    for (let x = 0; x < width; x++) raw[row + 1 + x] = pixel(x, y)
  }
  const ihdr = new Uint8Array(13)
  const view = new DataView(ihdr.buffer)
  view.setUint32(0, width)
  view.setUint32(4, height)
  ihdr[8] = 8 // 位深
  ihdr[9] = 0 // 灰度
  return concatBytes([SIGNATURE, chunk('IHDR', ihdr), chunk('IDAT', await deflate(raw)), chunk('IEND', new Uint8Array(0))])
}

/** 局部重绘遮罩：框里白（重画），其余黑。rects：[[x0, y0, x1, y1]...]。 */
export function maskPng(width, height, rects) {
  return grayPng(width, height, (x, y) => (rects.some(([x0, y0, x1, y1]) => x >= x0 && x < x1 && y >= y0 && y < y1) ? 255 : 0))
}
