// 生图渠道共用的网络工具：超时、错误整理、限量读取、ZIP 解包。
import { inflateRawSync } from 'node:zlib'
import { sniffImage } from '../store.js'

export const MAX_IMAGE_BYTES = 40 * 1024 * 1024

export class ImageError extends Error {
  constructor(message, { status = 0, retryable = false, code = '' } = {}) {
    super(message)
    this.status = status
    this.retryable = retryable
    this.code = code
  }
}

export function withTimeout(signal, ms) {
  const timeout = AbortSignal.timeout(ms)
  return signal ? AbortSignal.any([signal, timeout]) : timeout
}

export function trimBase(url) {
  return String(url || '').trim().replace(/\/+$/, '')
}

async function readLimited(response, limit = MAX_IMAGE_BYTES) {
  const declared = Number(response.headers.get('content-length') || 0)
  if (declared > limit) throw new ImageError('返回内容过大')
  const buffer = new Uint8Array(await response.arrayBuffer())
  if (buffer.byteLength > limit) throw new ImageError('返回内容过大')
  return buffer
}

/** 发请求；非 2xx 时把上游错误原文（截断）带出来，429/503 标记为可重试。 */
export async function request(url, { method = 'GET', headers = {}, body, signal, timeout = 300000, redirect = 'error', fetchImpl = fetch } = {}) {
  let response
  try {
    response = await fetchImpl(url, { method, headers, body, signal: withTimeout(signal, timeout), redirect })
  } catch (error) {
    if (signal?.aborted) throw new ImageError('已取消', { code: 'aborted' })
    if (error?.name === 'TimeoutError') throw new ImageError('请求超时，结果未确认（可能已经计费）', { code: 'timeout' })
    throw new ImageError('连接失败：' + (error?.cause?.code || error?.message || error), { code: 'network' })
  }
  if (!response.ok) {
    let detail = ''
    try { detail = (await response.text()).slice(0, 300) } catch {}
    const status = response.status
    const hint = status === 401 || status === 403 ? '鉴权失败，请检查 Key' : status === 429 ? '请求太频繁或并发超限' : status === 402 ? '额度不足' : ''
    throw new ImageError(`HTTP ${status}${hint ? '（' + hint + '）' : ''}${detail ? '：' + detail : ''}`, { status, retryable: status === 429 || status === 503 })
  }
  return response
}

export async function requestJson(url, options = {}) {
  const response = await request(url, options)
  const text = await response.text()
  try { return JSON.parse(text) } catch { throw new ImageError('返回的不是 JSON：' + text.slice(0, 200)) }
}

export async function requestBytes(url, options = {}) {
  const response = await request(url, options)
  return { bytes: await readLimited(response), contentType: response.headers.get('content-type') || '' }
}

export function imageResult(bytes, meta = {}) {
  const mediaType = sniffImage(bytes)
  if (!mediaType) throw new ImageError('返回的不是图片')
  return { bytes, mediaType, ...meta }
}

export function fromBase64(data) {
  const text = String(data || '').replace(/^data:[^;]+;base64,/, '')
  return new Uint8Array(Buffer.from(text, 'base64'))
}

/** 只认标准 ZIP（NovelAI 返回 image_0.png）。通过中央目录拿到准确尺寸。 */
export function firstImageFromZip(bytes) {
  const buf = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  let eocd = -1
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break }
  }
  if (eocd < 0) throw new ImageError('ZIP 格式不正确')
  const count = buf.readUInt16LE(eocd + 10)
  let offset = buf.readUInt32LE(eocd + 16)
  for (let n = 0; n < count && offset + 46 <= buf.length; n++) {
    if (buf.readUInt32LE(offset) !== 0x02014b50) break
    const method = buf.readUInt16LE(offset + 10)
    const compressed = buf.readUInt32LE(offset + 20)
    const size = buf.readUInt32LE(offset + 24)
    const nameLen = buf.readUInt16LE(offset + 28)
    const extraLen = buf.readUInt16LE(offset + 30)
    const commentLen = buf.readUInt16LE(offset + 32)
    const local = buf.readUInt32LE(offset + 42)
    const name = buf.toString('utf8', offset + 46, offset + 46 + nameLen)
    offset += 46 + nameLen + extraLen + commentLen
    if (!/\.(png|jpe?g|webp)$/i.test(name)) continue
    if (size > MAX_IMAGE_BYTES) throw new ImageError('ZIP 内图片过大')
    if (buf.readUInt32LE(local) !== 0x04034b50) throw new ImageError('ZIP 本地头损坏')
    const start = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28)
    const data = buf.subarray(start, start + compressed)
    const out = method === 0 ? data : method === 8 ? inflateRawSync(data, { maxOutputLength: MAX_IMAGE_BYTES }) : null
    if (!out) throw new ImageError('不支持的 ZIP 压缩方式')
    return new Uint8Array(out)
  }
  throw new ImageError('ZIP 里没有图片')
}
