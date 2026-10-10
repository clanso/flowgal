// 浏览器里跑认脸模型（逆转式立绘工作台的「自动框」）。模型和运行库都从宿主下好的地方读（/vision-files/…，见 lib/vision.js），
// 不连外网。小模型（脸、头、眼睛）用 onnxruntime 直接跑；精细模式的 Florence-2 用 transformers.js 跑（它自带一份 onnxruntime）。
// 怎么认、框怎么推都在 lib/detect.js，这里只负责把图变成像素、把模型跑起来。
import { API, call } from '../api.js'
import { autoFrame, followFrame, imageTensor, parseYolo } from '../../../lib/detect.js'

const FILES = API + '/vision-files/'

export const visionApi = {
  status: () => call('/vision'),
  download: pack => call('/vision', { action: 'download', pack }),
  cancel: () => call('/vision', { action: 'cancel' }),
  remove: pack => call('/vision', { action: 'remove', pack }),
}

// 运行库和模型只载一次（同一个剧场页面里一直留着）
let ortLoad = null
let florenceLoad = null
const sessions = {}

function loadOrt(status) {
  if (!ortLoad) {
    ortLoad = import(/* 运行时才知道地址，打包时不碰它 */ FILES + status.paths.ort).then(ort => {
      ort.env.wasm.wasmPaths = FILES + status.paths.ortDir
      ort.env.wasm.numThreads = 1 // 页面没开跨源隔离，多线程用不了；单线程一张图也不到 1 秒
      return ort
    })
    ortLoad.catch(() => { ortLoad = null })
  }
  return ortLoad
}

async function session(status, model) {
  if (!sessions[model]) {
    sessions[model] = loadOrt(status).then(ort => ort.InferenceSession.create(FILES + status.models[model].path, { executionProviders: ['wasm'] }))
    sessions[model].catch(() => { delete sessions[model] })
  }
  return sessions[model]
}

function loadFlorence(status) {
  if (!florenceLoad) {
    florenceLoad = import(FILES + status.paths.tjs).then(async tjs => {
      tjs.env.allowRemoteModels = false
      tjs.env.allowLocalModels = true
      tjs.env.localModelPath = FILES
      tjs.env.useBrowserCache = false // 文件就在本机宿主上，不用再在浏览器里存一份 300 MB
      tjs.env.backends.onnx.wasm.wasmPaths = FILES + status.paths.tjsDir
      tjs.env.backends.onnx.wasm.numThreads = 1
      const id = status.paths.florence
      const [model, processor, tokenizer] = await Promise.all([
        tjs.Florence2ForConditionalGeneration.from_pretrained(id, { dtype: 'q8', device: 'wasm' }),
        tjs.AutoProcessor.from_pretrained(id),
        tjs.AutoTokenizer.from_pretrained(id),
      ])
      return { tjs, model, processor, tokenizer }
    })
    florenceLoad.catch(() => { florenceLoad = null })
  }
  return florenceLoad
}

const loadImage = src => new Promise((resolve, reject) => {
  const img = new Image()
  img.onload = () => resolve(img)
  img.onerror = () => reject(new Error('图片读不出来'))
  img.src = src
})

/** 一张图的像素（RGBA，跟 ImageData 一样）。 */
export async function pixelsOf(src) {
  const img = await loadImage(src)
  const c = document.createElement('canvas')
  c.width = img.naturalWidth
  c.height = img.naturalHeight
  const g = c.getContext('2d', { willReadFrequently: true })
  g.drawImage(img, 0, 0)
  const d = g.getImageData(0, 0, c.width, c.height)
  return { width: d.width, height: d.height, data: d.data, image: img }
}

/** 小模型：认图上 box 这一块，回 [{ box, score }]（原图坐标）。 */
function runner(status, img) {
  return async (model, box, size) => {
    const [ort, s] = await Promise.all([loadOrt(status), session(status, model)])
    const tensor = new ort.Tensor('float32', imageTensor(img, box, size), [1, 3, size.h, size.w])
    const out = (await s.run({ images: tensor })).output0
    return parseYolo(out.data, out.dims, { threshold: status.models[model].threshold, box, size })
  }
}

/** 大模型：把 view 这块（正方形，超出图的地方垫白）缩成 768 见方给它看，找 phrase 说的东西，回 [{ label, box }]（原图坐标）。 */
function grounder(status, img) {
  return async (view, phrase) => {
    const { tjs, model, processor, tokenizer } = await loadFlorence(status)
    const S = 768
    const c = document.createElement('canvas')
    c.width = c.height = S
    const g = c.getContext('2d')
    g.fillStyle = '#fff'
    g.fillRect(0, 0, S, S)
    const [x0, y0, x1, y1] = view
    g.drawImage(img.image, x0, y0, x1 - x0, y1 - y0, 0, 0, S, S)
    const task = '<CAPTION_TO_PHRASE_GROUNDING>'
    const textInputs = tokenizer(processor.construct_prompts(task + phrase))
    const visionInputs = await processor(tjs.RawImage.fromCanvas(c).rgb())
    const ids = await model.generate({ ...textInputs, ...visionInputs, max_new_tokens: 80 })
    const text = tokenizer.batch_decode(ids, { skip_special_tokens: false })[0]
    const out = processor.post_process_generation(text, task, [S, S])[task] || { bboxes: [], labels: [] }
    const kx = (x1 - x0) / S, ky = (y1 - y0) / S
    return (out.bboxes || []).map((b, i) => ({ label: String(out.labels[i] || ''), box: [x0 + b[0] * kx, y0 + b[1] * ky, x0 + b[2] * kx, y0 + b[3] * ky] }))
  }
}

/**
 * 自动框一张差分。status 是 visionApi.status() 的结果；big 为真且精细模式大模型下好了就带上它（fine 是每张都用）。
 * 回 lib/detect.js autoFrame 的结果（找不到脸是 null）。
 */
export async function frameSprite(status, src, { big = true, fine = false } = {}) {
  const img = await pixelsOf(src)
  const ground = big && status.packs.fine && status.packs.fine.ready ? grounder(status, img) : null
  if (!ground) return autoFrame(img, runner(status, img))
  try {
    return await autoFrame(img, runner(status, img), { ground, fine })
  } catch (error) {
    // 大模型没跑起来（内存不够、文件坏了）：退回只用小模型，并说一声
    const r = await autoFrame(img, runner(status, img))
    if (r) r.notes.push('大模型没跑起来（' + String((error && error.message) || error).slice(0, 80) + '），这次只用了小模型')
    return r
  }
}

// 大模型很占内存（几百 MB）：离开工作台两分钟后放掉，下次用再载（十几秒）；两分钟内回来接着用
let releaseTimer = null
export function holdVision() { clearTimeout(releaseTimer) }
export function releaseVisionLater(ms = 120000) {
  clearTimeout(releaseTimer)
  releaseTimer = setTimeout(() => {
    const fl = florenceLoad
    florenceLoad = null
    if (fl) fl.then(f => f.model.dispose && f.model.dispose(), () => {})
    for (const key of Object.keys(sessions)) {
      const s = sessions[key]
      delete sessions[key]
      s.then(x => x.release && x.release(), () => {})
    }
  }, ms)
}

/** 同一个角色另一张差分：照参考图上框好的那张脸，在这张里找（见 lib/detect.js followFrame）。 */
export async function followSprite(refSrc, refRects, src) {
  const [ref, img] = await Promise.all([pixelsOf(refSrc), pixelsOf(src)])
  return followFrame(ref, refRects, img)
}
