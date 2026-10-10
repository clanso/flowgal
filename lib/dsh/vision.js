// DSH 宿主：认脸模型第一次用时下载到 $DSH_HOME/flowgal/models/，之后浏览器从这里读。
// 只下 lib/vision.js 清单里的文件，核对大小和 SHA-256，对不上就删掉报错；浏览器只能读下好、核对过的（/vision-files/… 公开只读，跟 /asset 一样）。
import { createHash } from 'node:crypto'
import { createReadStream, createWriteStream } from 'node:fs'
import { mkdir, rename, rm, stat } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { VISION_FILES, VISION_PACKS, VISION_PATHS, DEFAULT_MIRROR, sourceUrls } from '../vision.js'

const TYPES = { '.mjs': 'text/javascript; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.wasm': 'application/wasm', '.json': 'application/json; charset=utf-8' }
const typeOf = path => TYPES[(/\.[a-z0-9]+$/i.exec(path) || [''])[0].toLowerCase()] || 'application/octet-stream'

/** files / packs 只有测试会换（换成小文件）。 */
export function createVision({ root, settings = async () => ({}), fetchImpl = globalThis.fetch, logger = console, files = VISION_FILES, packs = VISION_PACKS }) {
  const where = file => join(root, ...file.local.split('/'))
  let job = null // { pack, state: 'running' | 'done' | 'failed' | 'cancelled', file, received, total, error, source, controller }

  async function have(file) {
    try { return (await stat(where(file))).size === file.size } catch { return false }
  }

  async function status() {
    const state = {}
    for (const [id, pack] of Object.entries(packs)) {
      const list = files.filter(f => f.pack === id)
      const flags = await Promise.all(list.map(have))
      state[id] = { ...pack, size: list.reduce((s, f) => s + f.size, 0), ready: flags.every(Boolean), missing: list.filter((f, i) => !flags[i]).reduce((s, f) => s + f.size, 0) }
    }
    // 浏览器要的路径（都在 /vision-files/ 下）：三个小模型和它们的分数线、两套运行库、Florence 的模型名
    const models = {}
    for (const f of files) if (f.threshold) models[f.id] = { path: f.local, threshold: f.threshold }
    const paths = VISION_PATHS
    const j = job && { pack: job.pack, state: job.state, file: job.file, received: job.received, total: job.total, error: job.error, source: job.source }
    const cfg = await settings()
    return { packs: state, models, paths, job: j, root, source: cfg.source || 'auto', mirror: cfg.mirror || DEFAULT_MIRROR }
  }

  /** 下一个文件：边下边算 SHA-256，下完核对；不对就删掉。stall 秒没收到数据算卡住。 */
  async function fetchOne(file, url, controller, onBytes) {
    const part = where(file) + '.part'
    await mkdir(dirname(part), { recursive: true })
    let timer = null
    const stall = () => { clearTimeout(timer); timer = setTimeout(() => controller.abort(new Error('连接卡住了（30 秒没有收到数据）')), 30000) }
    stall()
    try {
      const res = await fetchImpl(url, { signal: controller.signal, redirect: 'follow' })
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`)
      const hash = createHash('sha256')
      const out = createWriteStream(part)
      const closed = new Promise((resolve, reject) => { out.on('close', resolve); out.on('error', reject) })
      let received = 0
      try {
        for await (const chunk of res.body) {
          stall()
          received += chunk.length
          if (received > file.size) throw new Error('文件比预期大，不是要的那个')
          hash.update(chunk)
          if (!out.write(chunk)) await new Promise(r => out.once('drain', r))
          onBytes(received)
        }
      } finally { out.end() }
      await closed
      if (received !== file.size) throw new Error(`没下完（${received} / ${file.size} 字节）`)
      if (hash.digest('hex') !== file.sha256) throw new Error('校验不对（文件被改过或下坏了）')
      await rename(part, where(file))
    } catch (error) {
      await rm(part, { force: true }).catch(() => {})
      throw controller.signal.aborted && controller.signal.reason instanceof Error ? controller.signal.reason : error
    } finally { clearTimeout(timer) }
  }

  async function runJob(pack, current) {
    const cfg = await settings()
    const todo = []
    for (const f of files.filter(x => x.pack === pack)) if (!(await have(f))) todo.push(f)
    current.total = todo.reduce((s, f) => s + f.size, 0)
    let done = 0
    for (const file of todo) {
      if (current.state !== 'running') return
      current.file = file.id
      const errors = []
      let ok = false
      for (const url of sourceUrls(file, cfg)) {
        if (current.state !== 'running') return
        current.controller = new AbortController()
        current.source = new URL(url).host
        try {
          await fetchOne(file, url, current.controller, n => { current.received = done + n })
          ok = true
          break
        } catch (error) {
          if (current.state !== 'running') return
          errors.push(`${new URL(url).host}：${error?.message || error}`)
          logger.warn?.(`[flowgal] 下载 ${file.local} 失败（${url}）：${error?.message || error}`)
        }
      }
      if (!ok) throw new Error(`${file.local} 下不下来。${errors.join('；')}`)
      done += file.size
      current.received = done
    }
  }

  /** 开始下载一套模型（已经在下就不重复开）。马上返回当前状态，进度靠 status 看。 */
  function download(pack) {
    if (!packs[pack]) throw new Error('没有这套模型')
    if (job && job.state === 'running') return status()
    const current = { pack, state: 'running', file: '', received: 0, total: 0, error: '', source: '', controller: null }
    job = current
    runJob(pack, current).then(
      () => { if (current.state === 'running') current.state = 'done' },
      error => { if (current.state === 'running') { current.state = 'failed'; current.error = String(error?.message || error).slice(0, 600) } },
    )
    return status()
  }

  function cancel() {
    if (job && job.state === 'running') { job.state = 'cancelled'; job.controller?.abort(new Error('已取消')) }
    return status()
  }

  async function remove(pack) {
    if (job && job.state === 'running' && job.pack === pack) cancel()
    await Promise.all(files.filter(f => f.pack === pack).map(f => rm(where(f), { force: true })))
    return status()
  }

  /** 浏览器读模型文件：只认列表里的、已经下好的。rest 是 /vision-files/ 后面的路径。 */
  async function serve(req, res, rest) {
    const file = files.find(f => f.local === rest)
    if (!file || req.method !== 'GET' || !(await have(file))) { res.writeHead(404); res.end(); return }
    res.writeHead(200, { 'content-type': typeOf(file.local), 'content-length': file.size, 'cache-control': 'private, max-age=86400', 'x-content-type-options': 'nosniff' })
    createReadStream(where(file)).on('error', () => res.destroy()).pipe(res)
  }

  return { status, download, cancel, remove, serve }
}
