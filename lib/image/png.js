// 最小的 PNG 工具（不引第三方库）：读宽高，生成灰度图，读写 RGBA。局部重绘的遮罩由核心按框自己画，不收浏览器传来的遮罩；
// 表情差分（只换脸）在宿主里把重画的脸贴回原图，所以要能读写整张图的像素。
// 只用 Web 标准接口（两个宿主都能跑）；压缩是异步的，所以生成 PNG 的函数都返回 Promise。
import { deflate, inflate, concatBytes } from '../bytes.js'

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

function header(width, height, color) {
  const ihdr = new Uint8Array(13)
  const view = new DataView(ihdr.buffer)
  view.setUint32(0, width)
  view.setUint32(4, height)
  ihdr[8] = 8 // 位深
  ihdr[9] = color
  return chunk('IHDR', ihdr)
}

/** 8 位灰度 PNG：pixel(x, y) 返回 0~255。 */
export async function grayPng(width, height, pixel) {
  const raw = new Uint8Array((width + 1) * height)
  for (let y = 0; y < height; y++) {
    const row = y * (width + 1)
    for (let x = 0; x < width; x++) raw[row + 1 + x] = pixel(x, y)
  }
  return concatBytes([SIGNATURE, header(width, height, 0), chunk('IDAT', await deflate(raw)), chunk('IEND', new Uint8Array(0))])
}

/** 局部重绘遮罩：框里白（重画），其余黑。rects：[[x0, y0, x1, y1]...]。 */
export function maskPng(width, height, rects) {
  return grayPng(width, height, (x, y) => (rects.some(([x0, y0, x1, y1]) => x >= x0 && x < x1 && y >= y0 && y < y1) ? 255 : 0))
}

/** 读 PNG 最大的边长（再大就是坏图或故意的，免得一张图吃光内存）。 */
const MAX_SIDE = 4096
const CHANNELS = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }

function paeth(a, b, c) {
  const p = a + b - c
  const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c)
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c
}

/** 一行按 filter 过滤 / 还原时，第 i 个字节「左、上、左上」的值（PNG 规范：按字节算，bpp 是每像素字节数）。 */
function predict(filter, cur, prev, i, bpp) {
  const a = i >= bpp ? cur[i - bpp] : 0
  const up = prev ? prev[i] : 0
  if (filter === 1) return a
  if (filter === 2) return up
  if (filter === 3) return (a + up) >> 1
  if (filter === 4) return paeth(a, up, prev && i >= bpp ? prev[i - bpp] : 0)
  return 0
}

/**
 * 读 PNG 成 RGBA 像素：{ width, height, data }（data 跟画布的 ImageData 一样，每像素 4 字节）。
 * 认灰度、灰度带透明、RGB、RGBA（8 / 16 位，16 位取高 8 位）和 8 位调色板；不认隔行扫描。
 */
export async function decodePng(bytes) {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || [])
  if (!pngSize(b)) throw new Error('不是 PNG 图')
  const view = new DataView(b.buffer, b.byteOffset, b.byteLength)
  let at = 8, head = null, palette = null, alpha = null
  const idat = []
  while (at + 8 <= b.length) {
    const len = view.getUint32(at)
    const type = ascii(b, at + 4, 4)
    const data = b.subarray(at + 8, at + 8 + len)
    if (type === 'IHDR') head = { width: view.getUint32(at + 8), height: view.getUint32(at + 12), depth: data[8], color: data[9], interlace: data[12] }
    else if (type === 'PLTE') palette = data
    else if (type === 'tRNS') alpha = data
    else if (type === 'IDAT') idat.push(data)
    else if (type === 'IEND') break
    at += 12 + len
  }
  const { width, height, depth, color, interlace } = head
  const channels = CHANNELS[color]
  if (!channels || !(depth === 8 || (depth === 16 && color !== 3))) throw new Error(`读不了这种 PNG（颜色类型 ${color}，${depth} 位）`)
  if (interlace) throw new Error('读不了隔行扫描的 PNG')
  if (!width || !height || width > MAX_SIDE || height > MAX_SIDE) throw new Error('PNG 尺寸不对')
  if (color === 3 && !palette) throw new Error('PNG 缺调色板')
  const bpp = channels * depth / 8
  const stride = width * bpp
  const raw = await inflate(concatBytes(idat), (stride + 1) * height)
  if (raw.length < (stride + 1) * height) throw new Error('PNG 数据不完整')
  // 去掉每行的过滤：结果放在 rows 里（不带过滤字节）
  const rows = new Uint8Array(stride * height)
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)]
    if (filter > 4) throw new Error('PNG 过滤方式不对')
    const src = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1))
    const cur = rows.subarray(y * stride, (y + 1) * stride)
    const prev = y ? rows.subarray((y - 1) * stride, y * stride) : null
    for (let i = 0; i < stride; i++) cur[i] = src[i] + predict(filter, cur, prev, i, bpp)
  }
  const data = new Uint8ClampedArray(width * height * 4)
  const step = depth / 8 // 16 位时每个通道 2 字节，取高位那个
  for (let p = 0, i = 0; p < width * height; p++, i += bpp) {
    const ch = k => rows[i + k * step]
    let r, g, bl, a = 255
    if (color === 0) { r = g = bl = ch(0) }
    else if (color === 4) { r = g = bl = ch(0); a = ch(1) }
    else if (color === 2) { r = ch(0); g = ch(1); bl = ch(2) }
    else if (color === 6) { r = ch(0); g = ch(1); bl = ch(2); a = ch(3) }
    else { const n = rows[i]; r = palette[n * 3]; g = palette[n * 3 + 1]; bl = palette[n * 3 + 2]; a = alpha && n < alpha.length ? alpha[n] : 255 }
    data[p * 4] = r; data[p * 4 + 1] = g; data[p * 4 + 2] = bl; data[p * 4 + 3] = a
  }
  return { width, height, data }
}

/** RGBA 像素写成 8 位 RGBA 的 PNG。每行挑一种过滤（跟 libpng 一样按「差值绝对值之和最小」挑），文件小一些。 */
export async function encodePng({ width, height, data }) {
  const stride = width * 4
  const out = new Uint8Array((stride + 1) * height)
  const px = data instanceof Uint8Array ? data : new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
  const trial = new Uint8Array(stride)
  for (let y = 0; y < height; y++) {
    const cur = px.subarray(y * stride, (y + 1) * stride)
    const prev = y ? px.subarray((y - 1) * stride, y * stride) : null
    let best = 0, bestSum = Infinity
    for (let f = 0; f < 5; f++) {
      let sum = 0
      for (let i = 0; i < stride && sum < bestSum; i++) {
        const v = (cur[i] - predict(f, cur, prev, i, 4)) & 255
        sum += v < 128 ? v : 256 - v
      }
      if (sum < bestSum) { bestSum = sum; best = f }
    }
    for (let i = 0; i < stride; i++) trial[i] = (cur[i] - predict(best, cur, prev, i, 4)) & 255
    out[y * (stride + 1)] = best
    out.set(trial, y * (stride + 1) + 1)
  }
  return concatBytes([SIGNATURE, header(width, height, 6), chunk('IDAT', await deflate(out)), chunk('IEND', new Uint8Array(0))])
}
