// 酒馆宿主：认脸模型（工作台的自动框）存在浏览器缓存（Cache Storage）里，不占酒馆的文件夹。
// 跟 DSH 的 lib/dsh/vision.js 同一组方法（status / download / cancel / remove），文件清单、固定版本、SHA-256 都用 lib/vision.js 的。
// 缓存的键是文件的官方地址（HuggingFace / jsDelivr）：不管实际从镜像还是官网下的都记在官方地址下，
// 这样 transformers.js 读 Florence-2 时能直接从这份缓存拿（customCache），小模型和运行库由 loader 转成 blob 地址给浏览器用。
import { VISION_FILES, VISION_PACKS, VISION_PATHS, DEFAULT_MIRROR, sourceUrls } from '../lib/vision.js'

const CACHE = 'flowgal-vision-v1'
const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('')
const TYPES = { mjs: 'text/javascript', js: 'text/javascript', wasm: 'application/wasm', json: 'application/json' }
const typeOf = path => TYPES[path.split('.').pop()] || 'application/octet-stream'

/** 文件在缓存里的键：官方地址。 */
export function cacheKey(file) {
  return sourceUrls(file, { source: 'official' })[0]
}

/**
 * settings()：{ source, mirror, npmBase }（跟着 FlowGal 的设置）；fetchImpl：下载用（酒馆版传能走转发的那个）。
 * caches：浏览器的 CacheStorage（测试换假的）。
 */
export function createBrowserVision({ settings = async () => ({}), fetchImpl = (...a) => fetch(...a), caches = globalThis.caches, files = VISION_FILES, packs = VISION_PACKS, log = () => {} } = {}) {
  const open = () => caches.open(CACHE)
  let job = null

  async function have(file) {
    const res = await (await open()).match(cacheKey(file))
    return Boolean(res) && Number(res.headers.get('content-length')) === file.size
  }

  async function status() {
    const state = {}
    for (const [id, pack] of Object.entries(packs)) {
      const list = files.filter(f => f.pack === id)
      const flags = await Promise.all(list.map(have))
      state[id] = { ...pack, size: list.reduce((s, f) => s + f.size, 0), ready: flags.every(Boolean), missing: list.filter((f, i) => !flags[i]).reduce((s, f) => s + f.size, 0) }
    }
    const models = {}
    for (const f of files) if (f.threshold) models[f.id] = { path: f.local, threshold: f.threshold }
    const j = job && { pack: job.pack, state: job.state, file: job.file, received: job.received, total: job.total, error: job.error, source: job.source }
    const cfg = await settings()
    return { packs: state, models, paths: VISION_PATHS, job: j, root: '浏览器缓存（Cache Storage）', source: cfg.source || 'auto', mirror: cfg.mirror || DEFAULT_MIRROR }
  }

  /** 下一个文件：边下边记进度，下完核对大小和 SHA-256，对了才放进缓存。 */
  async function fetchOne(file, url, controller, onBytes) {
    const res = await fetchImpl(url, { signal: controller.signal, redirect: 'follow' })
    if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`)
    const reader = res.body.getReader()
    const buf = new Uint8Array(file.size)
    let received = 0
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      if (received + value.length > file.size) { await reader.cancel().catch(() => {}); throw new Error('文件比预期大，不是要的那个') }
      buf.set(value, received)
      received += value.length
      onBytes(received)
    }
    if (received !== file.size) throw new Error(`没下完（${received} / ${file.size} 字节）`)
    if (hex(await crypto.subtle.digest('SHA-256', buf)) !== file.sha256) throw new Error('校验不对（文件被改过或下坏了）')
    await (await open()).put(cacheKey(file), new Response(buf, { headers: { 'content-type': typeOf(file.local), 'content-length': String(file.size) } }))
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
          log('warn', `下载 ${file.local} 失败（${url}）：${error?.message || error}`)
        }
      }
      if (!ok) throw new Error(`${file.local} 下不下来。${errors.join('；')}`)
      done += file.size
      current.received = done
    }
  }

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
    const cache = await open()
    await Promise.all(files.filter(f => f.pack === pack).map(f => cache.delete(cacheKey(f))))
    return status()
  }

  // ───── 给浏览器界面（src/client/theater/vision.js）用：从缓存拿文件 ─────
  const blobs = new Map() // 本地路径 → blob 地址（同一个页面里只建一次）
  const fileOf = path => files.find(f => f.local === path)
  async function bytes(path) {
    const file = fileOf(path)
    const res = file && await (await open()).match(cacheKey(file))
    if (!res) throw new Error('认脸模型还没下好：' + path)
    return res.arrayBuffer()
  }
  async function url(path) {
    if (!blobs.has(path)) blobs.set(path, bytes(path).then(buf => URL.createObjectURL(new Blob([buf], { type: typeOf(path) }))))
    return blobs.get(path)
  }
  const loader = {
    /** 运行库（ES 模块）的地址：blob 地址，import() 直接能用。 */
    moduleUrl: url,
    /** 模型文件的字节（onnxruntime 直接吃 ArrayBuffer）。 */
    bytes,
    /** onnxruntime 的 wasm 文件（胶水 .mjs + .wasm）放在哪：给 blob 地址。 */
    async wasmPaths(dir, jsep = false) {
      const name = jsep ? 'ort-wasm-simd-threaded.jsep' : 'ort-wasm-simd-threaded'
      return { mjs: await url(dir + name + '.mjs'), wasm: await url(dir + name + '.wasm') }
    },
    /** transformers.js 读 Florence-2：不连网、从这份缓存按官方地址拿（固定版本）。 */
    async florence(tjs) {
      const florence = files.find(f => f.hf && f.local.startsWith(VISION_PATHS.florence))
      tjs.env.allowLocalModels = false
      tjs.env.allowRemoteModels = true
      tjs.env.remoteHost = 'https://huggingface.co/'
      tjs.env.useBrowserCache = false
      tjs.env.useCustomCache = true
      tjs.env.customCache = await open()
      return { revision: florence?.hf?.[1] || 'main' }
    },
  }

  return { status, download, cancel, remove, loader }
}
