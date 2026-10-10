// 测试酒馆用的假服务（不要 Key、不花钱），配合真的 SillyTavern 测 FlowGal 酒馆版：
//   OpenAI 兼容的大模型 /v1/chat/completions：酒馆聊天按顺序回 story.mjs 的几轮正文（第几条用户消息就回第几轮）；
//     FlowGal 的导演、立绘设计师、插画分镜师按系统提示词认出来，照预览的假模型回。支持流式（SSE）和非流式。
//   NovelAI 兼容的出图 /ai/generate-image：照预览的假画师画占位图，像官方一样包成 ZIP 回。
// 酒馆里：API 选「Chat Completion → 自定义（OpenAI 兼容）」，地址 http://127.0.0.1:<端口>/v1；
// FlowGal 设置里 NovelAI 加一个接入点，地址 http://127.0.0.1:<端口>，Key 随便填。
//   node scripts/st-mock.mjs [--port 5190]
import { createServer } from 'node:http'
import { TURNS } from './preview/story.mjs'
import { fakeLlmReply, fakePaint } from './preview/fake-models.mjs'

const portArg = process.argv.indexOf('--port')
const PORT = Number(portArg > 0 ? process.argv[portArg + 1] : 5190)
const sleep = ms => new Promise(r => setTimeout(r, ms))
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET, POST, OPTIONS' }

const textOf = content => (Array.isArray(content) ? content.map(p => p?.text || '').join('') : String(content ?? ''))

/** 一次聊天请求该回什么：FlowGal 的几个后台角色照假模型回，其余当酒馆聊天，回第 n 轮正文。 */
function answer(messages) {
  const system = messages.filter(m => m.role === 'system').map(m => textOf(m.content)).join('\n')
  const user = messages.filter(m => m.role === 'user').map(m => textOf(m.content)).join('\n')
  if (/后台导演|立绘设计师|插画分镜师/.test(system)) return fakeLlmReply({ system, prompt: user })
  const n = messages.filter(m => m.role === 'user').length
  const turn = TURNS[Math.max(0, n - 1) % TURNS.length]
  return { reasoning: '', text: turn.raw || turn.text }
}

/** 最小的 ZIP：一个不压缩的 image_0.png（NovelAI 官方就是回 ZIP）。 */
function zipOf(name, data) {
  const crc = (() => {
    let c = 0xffffffff
    for (const b of data) { c ^= b; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1 }
    return (c ^ 0xffffffff) >>> 0
  })()
  const nameBytes = Buffer.from(name)
  const local = Buffer.alloc(30)
  local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt32LE(crc, 14); local.writeUInt32LE(data.length, 18); local.writeUInt32LE(data.length, 22); local.writeUInt16LE(nameBytes.length, 26)
  const central = Buffer.alloc(46)
  central.writeUInt32LE(0x02014b50, 0); central.writeUInt16LE(20, 4); central.writeUInt16LE(20, 6); central.writeUInt32LE(crc, 16); central.writeUInt32LE(data.length, 20); central.writeUInt32LE(data.length, 24); central.writeUInt16LE(nameBytes.length, 28)
  const localPart = Buffer.concat([local, nameBytes, Buffer.from(data)])
  const centralPart = Buffer.concat([central, nameBytes])
  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(1, 8); end.writeUInt16LE(1, 10); end.writeUInt32LE(centralPart.length, 12); end.writeUInt32LE(localPart.length, 16)
  return Buffer.concat([localPart, centralPart, end])
}

const readJson = req => new Promise((resolve, reject) => {
  const chunks = []
  req.on('data', c => chunks.push(c))
  req.on('end', () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')) } catch (e) { reject(e) } })
  req.on('error', reject)
})

createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost')
  if (req.method === 'OPTIONS') { res.writeHead(204, CORS); return res.end() }
  try {
    if (url.pathname === '/v1/models') {
      res.writeHead(200, { ...CORS, 'content-type': 'application/json' })
      return res.end(JSON.stringify({ object: 'list', data: [{ id: 'flowgal-mock', object: 'model' }] }))
    }
    if (url.pathname === '/v1/chat/completions' && req.method === 'POST') {
      const body = await readJson(req)
      const { reasoning, text } = answer(body.messages || [])
      if (!body.stream) {
        res.writeHead(200, { ...CORS, 'content-type': 'application/json' })
        return res.end(JSON.stringify({ id: 'mock', object: 'chat.completion', model: body.model || 'flowgal-mock', choices: [{ index: 0, message: { role: 'assistant', content: text, ...(reasoning ? { reasoning_content: reasoning } : {}) }, finish_reason: 'stop' }] }))
      }
      res.writeHead(200, { ...CORS, 'content-type': 'text/event-stream', 'cache-control': 'no-cache' })
      const send = delta => res.write(`data: ${JSON.stringify({ id: 'mock', object: 'chat.completion.chunk', model: body.model || 'flowgal-mock', choices: [{ index: 0, delta, finish_reason: null }] })}\n\n`)
      for (let i = 0; i < reasoning.length; i += 16) { send({ reasoning_content: reasoning.slice(i, i + 16) }); await sleep(5) }
      for (let i = 0; i < text.length; i += 12) { send({ content: text.slice(i, i + 12) }); await sleep(8) }
      res.write('data: [DONE]\n\n')
      return res.end()
    }
    if (url.pathname === '/ai/generate-image' && req.method === 'POST') {
      const body = await readJson(req)
      await sleep(600)
      const png = await fakePaint(body)
      res.writeHead(200, { ...CORS, 'content-type': 'application/zip' })
      return res.end(zipOf('image_0.png', png))
    }
    if (url.pathname === '/user/subscription') {
      res.writeHead(200, { ...CORS, 'content-type': 'application/json' })
      return res.end(JSON.stringify({ tier: 3, active: true, trainingStepsLeft: { fixedTrainingStepsLeft: 10000, purchasedTrainingSteps: 0 } }))
    }
    res.writeHead(404, CORS)
    res.end('not found')
  } catch (error) {
    res.writeHead(500, CORS)
    res.end(String(error?.message || error))
  }
}).listen(PORT, '127.0.0.1', () => console.log(`假模型 / 假出图：http://127.0.0.1:${PORT}`))
