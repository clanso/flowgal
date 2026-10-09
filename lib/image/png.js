// 最小的 PNG 工具（不引第三方库）：读宽高，生成灰度图。局部重绘的遮罩由宿主按框自己画，不收浏览器传来的遮罩。
import { deflateSync } from 'node:zlib'

const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

// CRC32 自己算（zlib.crc32 要 Node 22 以上，DSH 自带的运行时不一定有）。
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

/** PNG 的宽高（读 IHDR）；不是 PNG 返回 null。 */
export function pngSize(bytes) {
  const b = Buffer.from(bytes || [])
  if (b.length < 24 || !b.subarray(0, 8).equals(SIGNATURE) || b.toString('ascii', 12, 16) !== 'IHDR') return null
  return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) }
}

function chunk(type, data) {
  const head = Buffer.alloc(8)
  head.writeUInt32BE(data.length, 0)
  head.write(type, 4, 'ascii')
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])) >>> 0, 0)
  return Buffer.concat([head, data, crc])
}

/** 8 位灰度 PNG：pixel(x, y) 返回 0~255。 */
export function grayPng(width, height, pixel) {
  const raw = Buffer.alloc((width + 1) * height)
  for (let y = 0; y < height; y++) {
    const row = y * (width + 1)
    for (let x = 0; x < width; x++) raw[row + 1 + x] = pixel(x, y)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // 位深
  ihdr[9] = 0 // 灰度
  return Buffer.concat([SIGNATURE, chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 6 })), chunk('IEND', Buffer.alloc(0))])
}

/** 局部重绘遮罩：框里白（重画），其余黑。rects：[[x0, y0, x1, y1]...]。 */
export function maskPng(width, height, rects) {
  return grayPng(width, height, (x, y) => (rects.some(([x0, y0, x1, y1]) => x >= x0 && x < x1 && y >= y0 && y < y1) ? 255 : 0))
}
