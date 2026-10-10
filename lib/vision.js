// 认脸模型（逆转式立绘工作台的「自动框」用）的清单：要下哪些文件、固定版本、大小、SHA-256、从哪下。两个宿主共用；
// 怎么下、存哪、怎么交给浏览器各宿主自己管（DSH：lib/dsh/vision.js 下到数据目录；酒馆：浏览器缓存）。
// 来源：模型在 HuggingFace（官网连不上换镜像，默认 hf-mirror.com，设置里可改）；浏览器里跑模型的 onnxruntime 在 npm CDN
// （跟字体用同一个地址，默认 jsDelivr，连不上换 npmmirror）。

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

/** 浏览器要的路径（相对模型文件的根）：两套运行库、Florence 的模型名。 */
export const VISION_PATHS = { ort: `${ORT}/ort.wasm.min.mjs`, ortDir: `${ORT}/`, tjs: `${TJS}/transformers.min.js`, tjsDir: `${TJS}/`, florence: FLORENCE }
