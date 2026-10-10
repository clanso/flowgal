// 认脸模型（逆转式立绘工作台的「自动框」用）：第一次用时下载到 $DSH_HOME/flowgal/models/，之后浏览器从这里读。
// 只下这里列出的文件，按固定版本下，核对大小和 SHA-256，对不上就删掉报错；浏览器只能读下好、核对过的（/vision-files/… 公开只读，跟 /asset 一样）。
// 来源：模型在 HuggingFace（官网连不上换镜像，默认 hf-mirror.com，设置里可改）；浏览器里跑模型的 onnxruntime 在 npm CDN
// （跟字体用同一个地址，默认 jsDelivr，连不上换 npmmirror）。
import { createHash } from 'node:crypto'
import { createReadStream, createWriteStream } from 'node:fs'
import { mkdir, rename, rm, stat } from 'node:fs/promises'
import { join, dirname } from 'node:path'

export const DEFAULT_MIRROR = 'https://hf-mirror.com'
const ORT = 'onnxruntime-web-1.20.1'
const TJS = 'transformers-3.8.1'
const FLORENCE = 'onnx-community/Florence-2-base-ft'

/**
 * 要下的文件：hf = [仓库, 固定版本, 仓库里的路径]，npm = [包名, 版本, 包里的路径]；local 是存到 models/ 下的路径（也是浏览器读它的路径）。
 * threshold 是模型作者给的分数线（仓库里的 threshold.json）。
 */
export const VISION_FILES = [
  { id: 'ort', pack: 'basic', npm: ['onnxruntime-web', '1.20.1', 'dist/ort.wasm.min.mjs'], local: `${ORT}/ort.wasm.min.mjs`, size: 48904, sha256: 'f53ed4792e758e7232f779d479eb8931b97ff3ab2e3b9a33ee00d1251ffdaad6' },
  { id: 'ort-glue', pack: 'basic', npm: ['onnxruntime-web', '1.20.1', 'dist/ort-wasm-simd-threaded.mjs'], local: `${ORT}/ort-wasm-simd-threaded.mjs`, size: 24618, sha256: '745eb7c0ce6f18a6aa521971b2877babc7ffb27eecb58ab3bc6e5ef4692672e8' },
  { id: 'ort-wasm', pack: 'basic', npm: ['onnxruntime-web', '1.20.1', 'dist/ort-wasm-simd-threaded.wasm'], local: `${ORT}/ort-wasm-simd-threaded.wasm`, size: 11246032, sha256: '207d02be4591c156b0a98f024f3d58005b5b04c92274d759fb390338c63559ea' },
  { id: 'face', pack: 'basic', hf: ['deepghs/anime_face_detection', '784dc4c0bb692351ddcdbe6131a050b17d3025d5', 'face_detect_v1.4_n/model.onnx'], local: 'deepghs/face_detect_v1.4_n.onnx', size: 12102558, sha256: 'fd860b650a4377046842c3cd80d01b0b408bdfbdb4acee5759630f82c6ef04a9', threshold: 0.278 },
  { id: 'head', pack: 'basic', hf: ['deepghs/anime_head_detection', '06604feee81983792a57c21081e539c0ae229833', 'head_detect_v1.6_n_yv11/model.onnx'], local: 'deepghs/head_detect_v1.6_n_yv11.onnx', size: 10481375, sha256: '59965ef74e3630da8a82efc9e05b7c9e56cb4bcb79c9feff1c982a1dcc15153b', threshold: 0.385 },
  { id: 'eye', pack: 'basic', hf: ['deepghs/anime_eye_detection', 'ba69e3ee3b0b23e7c948994e182f06cd46e534f1', 'eye_detect_v1.0_n/model.onnx'], local: 'deepghs/eye_detect_v1.0_n.onnx', size: 12102557, sha256: 'a96515cdf4ca0a4caf56778d93ba7fc28b4582727ff32645844cd89d39cdee29', threshold: 0.258 },
  // 精细模式：Florence-2（微软的看图找东西模型，onnx-community 转的 8 位量化版）+ 跑它用的 transformers.js（自带一份 onnxruntime）。
  // local 的路径照 transformers.js 读本地模型的规矩：<模型名>/<文件>
  ...[
    ['transformers.min.js', 888173, 'aa5002b70e789798da263f5f99c62bd3e8fcd0c119258a493c40c180648365fa'],
    ['ort-wasm-simd-threaded.jsep.mjs', 44484, '08fb86ec433c78bfb032c5d84a68b8e8e5a8d81268fa39e24314179a5767a5b9'],
    ['ort-wasm-simd-threaded.jsep.wasm', 21596019, 'c46655e8a94afc45338d4cb2b840475f88e5012d524509916e505079c00bfa39'],
  ].map(([name, size, sha256]) => ({ id: 'tjs-' + name, pack: 'fine', npm: ['@huggingface/transformers', '3.8.1', 'dist/' + name], local: `${TJS}/${name}`, size, sha256 })),
  ...[
    ['config.json', 5432, 'd90c22ed72eb55291f183fcd9b98ebd3bd3d92bfcffb6c7f6e1606085e793525'],
    ['generation_config.json', 292, '7b8eb17bbd6cf8a07f619ad83ae03881eff05b6b9237bab89005b40e77783c29'],
    ['preprocessor_config.json', 2673, 'c892857e34a7082284983a7717717d39c9bf7e574f1f41d80d4c918c97502efa'],
    ['tokenizer.json', 2297961, 'd69dcdb2323e124ac4f800cb9863ddccea0d7bb11e16125e8df3bd60f2f8aeac'],
    ['tokenizer_config.json', 197658, 'd8e64607233cb53b619fb46664f6cad08176c26e0e8735b2d30d888364f19600'],
    ['onnx/vision_encoder_quantized.onnx', 93746540, '3b79d54f23f666f731549db23cb070c35a979ce19cbd9720e90e67a78dc9768c'],
    ['onnx/encoder_model_quantized.onnx', 43651493, 'f4ad7a68f1fb875d3bcf735ea14a7021b7ba7e83baf7cf10289881b4ed6d9b85'],
    ['onnx/decoder_model_merged_quantized.onnx', 98177697, 'f22f52f980c33df0efa15932c2f3db6d9d3595ce6387eca938b8cfe23dc4c641'],
    ['onnx/embed_tokens_quantized.onnx', 39390433, '6b2258db1c8ee9b160576ccde3cd3814d83a2edaed0dd1c6ca9ff3c38fa62214'],
  ].map(([path, size, sha256]) => ({ id: 'florence-' + path, pack: 'fine', hf: [FLORENCE, 'e88a44eaf3791a35eae0c5a47b3dbcd36e67eb6f', path], local: `${FLORENCE}/${path}`, size, sha256 })),
]

export const VISION_PACKS = {
  basic: { label: '认脸小模型', note: '二次元的脸、头、眼睛三个识别模型（deepghs，MIT / OpenRAIL 许可）和浏览器里跑模型用的 onnxruntime。一张图不到 1 秒。' },
  fine: { label: '精细模式大模型', note: 'Florence-2（微软，MIT 许可）：看图找「眼睛」「嘴」，furry、兽头、张大的嘴也认得出。一张图 7~15 秒。要先有认脸小模型。' },
}
export { TJS, FLORENCE }

const TYPES = { '.mjs': 'text/javascript; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.wasm': 'application/wasm', '.json': 'application/json; charset=utf-8' }
const typeOf = path => TYPES[(/\.[a-z0-9]+$/i.exec(path) || [''])[0].toLowerCase()] || 'application/octet-stream'
const slash = url => String(url || '').replace(/\/+$/, '')

/**
 * 一个文件按顺序试的下载地址。settings：{ source: 'auto' | 'official' | 'mirror', mirror, npmBase }。
 * auto 先官网（HuggingFace / 字体用的 npm CDN）再镜像；official 只官网；mirror 先镜像再官网（镜像没有这个文件时还能补上）。
 */
export function sourceUrls(file, settings = {}) {
  const source = ['official', 'mirror'].includes(settings.source) ? settings.source : 'auto'
  let official, mirror
  if (file.hf) {
    const [repo, rev, path] = file.hf
    official = `https://huggingface.co/${repo}/resolve/${rev}/${path}`
    mirror = `${slash(/^https?:\/\//i.test(settings.mirror || '') ? settings.mirror : DEFAULT_MIRROR)}/${repo}/resolve/${rev}/${path}`
  } else {
    const [name, version, path] = file.npm
    official = `${slash(/^https?:\/\//i.test(settings.npmBase || '') ? settings.npmBase : 'https://cdn.jsdelivr.net/npm')}/${name}@${version}/${path}`
    mirror = `https://registry.npmmirror.com/${name}/${version}/files/${path}`
  }
  if (source === 'official') return [official]
  return source === 'mirror' ? [mirror, official] : [official, mirror]
}

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
    const paths = { ort: `${ORT}/ort.wasm.min.mjs`, ortDir: `${ORT}/`, tjs: `${TJS}/transformers.min.js`, tjsDir: `${TJS}/`, florence: FLORENCE }
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
