// 认脸模型的下载与提供：官网连不上换镜像、核对大小和 SHA-256、浏览器只能读下好的列表里的文件；设置里的下载来源。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdtemp, rm, readFile, readdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createVision, sourceUrls, VISION_FILES, VISION_PACKS, DEFAULT_MIRROR } from '../lib/vision.js'
import { resolveConfig, applyPatch } from '../lib/config.js'

const sha = b => createHash('sha256').update(b).digest('hex')
const bytesA = Buffer.from('model-a '.repeat(500))
const bytesB = Buffer.from('runtime-b')
const FILES = [
  { id: 'a', pack: 'p', hf: ['org/repo', 'abc123', 'dir/model.onnx'], local: 'org/model.onnx', size: bytesA.length, sha256: sha(bytesA), threshold: 0.3 },
  { id: 'b', pack: 'p', npm: ['@scope/pkg', '1.2.3', 'dist/run.mjs'], local: 'pkg-1.2.3/run.mjs', size: bytesB.length, sha256: sha(bytesB) },
]
const PACKS = { p: { label: '测试包', note: '' } }
const body = (buf, parts = 3) => new ReadableStream({
  start(c) { const n = Math.ceil(buf.length / parts); for (let i = 0; i < buf.length; i += n) c.enqueue(new Uint8Array(buf.subarray(i, i + n))); c.close() },
})
const until = async (vision, done) => { for (let i = 0; i < 200; i++) { const s = await vision.status(); if (done(s)) return s; await new Promise(r => setTimeout(r, 10)) } throw new Error('等不到下载结束') }
/** 假的 http 响应：记下写了什么。 */
function fakeRes() {
  const res = { status: 0, headers: {}, chunks: [] }
  res.writeHead = (status, headers = {}) => { res.status = status; res.headers = headers }
  res.write = c => { res.chunks.push(Buffer.from(c)); return true }
  res.end = c => { if (c) res.chunks.push(Buffer.from(c)); res.ended = true; res.emit?.('finish') }
  res.on = res.once = res.emit = () => res
  return res
}

test('gate: 下载地址——自动是先官网再镜像，镜像优先反过来，只用官网就一个；npm 的运行库镜像是 npmmirror', () => {
  const hf = VISION_FILES.find(f => f.id === 'face')
  assert.deepEqual(sourceUrls(hf, { source: 'auto' }), [
    `https://huggingface.co/deepghs/anime_face_detection/resolve/${hf.hf[1]}/face_detect_v1.4_n/model.onnx`,
    `${DEFAULT_MIRROR}/deepghs/anime_face_detection/resolve/${hf.hf[1]}/face_detect_v1.4_n/model.onnx`,
  ])
  assert.equal(sourceUrls(hf, { source: 'mirror', mirror: 'https://my.mirror/' })[0], `https://my.mirror/deepghs/anime_face_detection/resolve/${hf.hf[1]}/face_detect_v1.4_n/model.onnx`)
  assert.equal(sourceUrls(hf, { source: 'official' }).length, 1)
  assert.equal(sourceUrls(hf, { mirror: 'javascript:alert(1)' })[1].startsWith(DEFAULT_MIRROR), true, '镜像地址不是 http 就用默认的')
  const npm = FILES[1]
  assert.deepEqual(sourceUrls(npm, { npmBase: 'https://unpkg.com/' }), ['https://unpkg.com/@scope/pkg@1.2.3/dist/run.mjs', 'https://registry.npmmirror.com/@scope/pkg/1.2.3/files/dist/run.mjs'])
  // 正式列表：每个文件都有大小、SHA-256、本地路径，属于一套已知的模型；本地路径不重复
  for (const f of VISION_FILES) {
    assert.ok(f.size > 0 && /^[0-9a-f]{64}$/.test(f.sha256) && VISION_PACKS[f.pack] && !f.local.includes('..'), f.id)
  }
  assert.equal(new Set(VISION_FILES.map(f => f.local)).size, VISION_FILES.length)
})

test('gate: 官网连不上换镜像下，边下边核对，下好的才给浏览器读；列表外、没下好的读不到', async () => {
  const root = await mkdtemp(join(tmpdir(), 'flowgal-vision-'))
  try {
    const asked = []
    const fetchImpl = async url => {
      asked.push(url)
      if (url.startsWith('https://huggingface.co/')) throw new Error('getaddrinfo ENOTFOUND huggingface.co')
      if (url.includes('model.onnx')) return new Response(body(bytesA), { status: 200 })
      return new Response(body(bytesB), { status: 200 })
    }
    const vision = createVision({ root, files: FILES, packs: PACKS, fetchImpl, logger: {}, settings: async () => ({ source: 'auto' }) })
    let s = await vision.status()
    assert.equal(s.packs.p.ready, false)
    assert.equal(s.packs.p.missing, bytesA.length + bytesB.length)
    // 浏览器读还没下好的：404
    const early = fakeRes()
    await vision.serve({ method: 'GET' }, early, 'org/model.onnx')
    assert.equal(early.status, 404)
    await vision.download('p')
    s = await until(vision, x => x.job && x.job.state !== 'running')
    assert.equal(s.job.state, 'done', s.job.error)
    assert.equal(s.packs.p.ready, true)
    assert.deepEqual(s.models, { a: { path: 'org/model.onnx', threshold: 0.3 } })
    assert.deepEqual(asked.slice(0, 2), ['https://huggingface.co/org/repo/resolve/abc123/dir/model.onnx', `${DEFAULT_MIRROR}/org/repo/resolve/abc123/dir/model.onnx`])
    assert.deepEqual(await readFile(join(root, 'org', 'model.onnx')), bytesA)
    // 下好的能读（流式发出去），列表外的、想跳出目录的都读不到
    const { Writable } = await import('node:stream')
    const chunks = []
    const res = new Writable({ write(c, _, cb) { chunks.push(c); cb() } })
    res.writeHead = (status, headers) => { res.status = status; res.headers = headers }
    await vision.serve({ method: 'GET' }, res, 'pkg-1.2.3/run.mjs')
    await new Promise(r => res.on('finish', r))
    assert.equal(res.status, 200)
    assert.match(res.headers['content-type'], /javascript/)
    assert.deepEqual(Buffer.concat(chunks), bytesB)
    for (const bad of ['../secrets.json', 'org/other.onnx', 'org/model.onnx.part']) {
      const r = fakeRes()
      await vision.serve({ method: 'GET' }, r, bad)
      assert.equal(r.status, 404, bad)
    }
    // 删掉一套：文件没了，又变成没下
    s = await vision.remove('p')
    assert.equal(s.packs.p.ready, false)
  } finally { await rm(root, { recursive: true, force: true }) }
})

test('gate: 下到的文件校验对不上（被改过、下坏了）就删掉报错，不留半截文件', async () => {
  const root = await mkdtemp(join(tmpdir(), 'flowgal-vision-'))
  try {
    const fetchImpl = async () => new Response(body(Buffer.from('X'.repeat(bytesA.length))), { status: 200 })
    const vision = createVision({ root, files: [FILES[0]], packs: PACKS, fetchImpl, logger: {}, settings: async () => ({ source: 'official' }) })
    await vision.download('p')
    const s = await until(vision, x => x.job && x.job.state !== 'running')
    assert.equal(s.job.state, 'failed')
    assert.match(s.job.error, /校验不对/)
    assert.equal(s.packs.p.ready, false)
    assert.deepEqual(await readdir(join(root, 'org')), [], '半截的 .part 也删掉')
    assert.throws(() => vision.download('nope'), /没有这套模型/)
  } finally { await rm(root, { recursive: true, force: true }) }
})

test('gate: 设置里的认脸模型下载来源：只认三种，镜像地址要 http(s)', () => {
  const cfg = resolveConfig({})
  assert.deepEqual(cfg.vision, { source: 'auto', mirror: DEFAULT_MIRROR })
  assert.equal(resolveConfig({ vision: { source: 'whatever' } }).vision.source, 'auto')
  assert.equal(resolveConfig({ vision: { mirror: 'file:///etc/passwd' } }).vision.mirror, DEFAULT_MIRROR)
  assert.equal(resolveConfig(applyPatch({}, { vision: { source: 'mirror', mirror: 'https://hf.example.com' } })).vision.mirror, 'https://hf.example.com')
})
