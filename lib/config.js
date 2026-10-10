// 设置：默认值、合并、校验。密钥永远不在这里（见 secrets.js）。
import { NAI_OFFICIAL } from './image/novelai.js'
import { DEFAULT_SOUNDS, normalizeSoundSettings } from './sounds.js'
import { BUILTIN_STYLES, DEFAULT_SAMPLE, normalizeStyle, modelKey } from './image/style.js'
import { DEFAULT_MIRROR } from './vision.js'

export const DEFAULT_CONFIG = {
  enabled: true,
  director: {
    auto: true,              // 每轮正文写完后自动整理成场景
    provider: '', model: '', // 留空跟随 Tavern 后台模型
    maxTokens: 128000,       // 最大输出（当前主流大模型的输出上限）；模型窗口装不下或模型拒绝时自动降
    temperature: 0.7,
    contextChars: 1000000,   // 给导演看多少人物卡 / 世界书资料（字）；超出模型窗口时自动缩
    systemPrompt: '',        // 留空用内置导演提示词
    spritePrompt: '',        // 留空用内置立绘提示词（立绘设计师）
    cgPrompt: '',            // 留空用内置插画提示词（插画分镜师）
  },
  images: {
    backend: 'novelai',
    auto: true,              // 每轮自动配 CG（导演判断值得画时）
    maxPerTurn: 1,
    backgrounds: true,       // 新地点自动生成背景
    portraits: true,         // 角色登场、换装、长期状态变化时生成这一套的平静立绘
    expressions: true,       // 情绪差分：导演用到新情绪时补画（每种一张）
    expressionsPerTurn: 3,
    spriteWriter: true,      // 立绘提示词由后台模型读完资料和剧情来写；关掉则按档案机械拼
    concurrency: 1,
    seed: -1,                // 固定种子；-1 每张随机（鉴赏里改词时仍可给单张指定种子）
    transparentSprites: true, // 立绘用透明底（目前只有 NovelAI V5 支持，其他模型忽略）
    sizes: { landscape: [1216, 832], portrait: [832, 1216], square: [1024, 1024] },
    library: true,           // 画好的图按名字另存一份到图片文件夹
    libraryDir: '',          // 图片文件夹的位置（绝对路径）；留空是数据目录下的「图片」
  },
  style: {
    current: 'galgame',      // 正在用的画风
    presets: BUILTIN_STYLES, // 一套套画风 [{ id, name, artist, positive, negative, cfg, cfgRescale, cover }]，见 image/style.js
    sample: DEFAULT_SAMPLE,  // 「试画」画的内容
  },
  novelai: {
    endpoint: 'official',
    endpoints: [NAI_OFFICIAL],
    model: 'nai-diffusion-4-5-full',
    sampler: 'k_euler_ancestral',
    noiseSchedule: 'karras',
    steps: 23, scale: 5, cfgRescale: 0, variety: false,
  },
  comfyui: {
    baseURL: 'http://127.0.0.1:8188', authType: 'none',
    mode: 'simple', checkpoint: '', sampler: 'euler_ancestral', scheduler: 'normal', steps: 24, cfg: 6,
    workflows: [], workflow: '', timeoutSec: 600,
  },
  openai: {
    baseURL: 'https://api.openai.com/v1', authType: 'bearer', mode: 'images', model: 'gpt-image-1',
    quality: '', landscapeSize: '1536x1024', portraitSize: '1024x1536', squareSize: '1024x1024', sizeMode: 'preset',
  },
  webui: { baseURL: 'http://127.0.0.1:7860', authType: 'none', model: '', steps: 24, cfg: 6, sampler: 'Euler a', scheduler: '', hires: false },
  ui: {
    skin: 'stellar',
    ratio: 'cg',             // 剧场画面比例：cg 跟横版插画一样（默认 NovelAI 1216×832）；wide 是 16:9
    textSpeed: 30,           // 每字毫秒
    autoDelay: 1400,
    blip: true,              // 打字音
    blipVolume: 1,           // 打字音音量（倍数，0~2）
    voiceDefault: 'auto',    // 档案里没指定声音的角色：auto 按性别分；或统一用某个音色（见 lib/sounds.js）
    narrationVoice: 'classic', narrationPitch: -6, // 旁白的打字音；off 不出声
    sfx: true,               // 落字音效和界面音
    sfxVolume: 1,            // 音效音量（倍数，0~2）
    sounds: { ...DEFAULT_SOUNDS }, // 每种音效用哪个版本；off 关掉；custom 用上传的那个
    customSounds: {},        // 上传的音效 { 槽: { assetId, name } }，只经上传接口改
    bgm: true,               // 配乐：从「我的配乐」里按场景情绪选曲
    bgmVolume: 0.45,
    // 网页字体从 npm CDN 读取（jsDelivr、unpkg 等目录结构相同，可换成镜像）；留空只用系统字体。
    fontBase: 'https://cdn.jsdelivr.net/npm/',
    particles: true,
    fontScale: 1,
    autoOpen: false,         // 新一轮写完后自动打开剧场
    updateCheck: true,       // 打开剧场时检查插件更新（最多 12 小时一次，只在插件是 git 克隆时生效）
  },
  // 认脸模型（立绘工作台的自动框）从哪下：auto 先 HuggingFace 官网、连不上换镜像；official 只官网；mirror 先镜像
  vision: { source: 'auto', mirror: DEFAULT_MIRROR },
}

function isObject(v) { return v && typeof v === 'object' && !Array.isArray(v) }

export function deepMerge(base, patch) {
  if (!isObject(patch)) return structuredClone(base)
  const out = structuredClone(base)
  for (const [key, value] of Object.entries(patch)) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue
    if (isObject(value) && isObject(out[key])) out[key] = deepMerge(out[key], value)
    else out[key] = structuredClone(value)
  }
  return out
}

const URL_FIELDS = [['comfyui', 'baseURL'], ['openai', 'baseURL'], ['webui', 'baseURL'], ['ui', 'fontBase'], ['vision', 'mirror']]

/** 合并后的完整设置，带基本校验（数值范围、URL 协议）。 */
export function resolveConfig(saved) {
  const config = deepMerge(DEFAULT_CONFIG, saved)
  const clamp = (v, lo, hi, d) => { const n = Number(v); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d }
  config.images.maxPerTurn = clamp(config.images.maxPerTurn, 0, 4, 1)
  config.images.concurrency = clamp(config.images.concurrency, 1, 4, 1)
  config.images.expressionsPerTurn = clamp(config.images.expressionsPerTurn, 0, 12, 3)
  config.images.seed = Math.trunc(clamp(config.images.seed, -1, 2 ** 32 - 1, -1))
  config.novelai.cfgRescale = clamp(config.novelai.cfgRescale, 0, 1, 0)
  config.director.maxTokens = Math.trunc(clamp(config.director.maxTokens, 1000, 128000, DEFAULT_CONFIG.director.maxTokens))
  config.director.temperature = clamp(config.director.temperature, 0, 2, 0.7)
  config.director.contextChars = Math.trunc(clamp(config.director.contextChars, 0, 1000000, DEFAULT_CONFIG.director.contextChars))
  config.ui.textSpeed = clamp(config.ui.textSpeed, 0, 200, 30)
  config.ui.bgmVolume = clamp(config.ui.bgmVolume, 0, 1, 0.45)
  // 出图尺寸：宽高各取 64 的倍数（各家后端都要求），256–2048；填坏了用默认。
  for (const [shape, fallback] of Object.entries(DEFAULT_CONFIG.images.sizes)) {
    const size = config.images.sizes?.[shape]
    const [w, h] = Array.isArray(size) ? size.map(n => Math.round(Number(n) / 64) * 64) : []
    config.images.sizes[shape] = Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0 ? [Math.min(2048, Math.max(256, w)), Math.min(2048, Math.max(256, h))] : [...fallback]
  }
  if (!['cg', 'wide'].includes(config.ui.ratio)) config.ui.ratio = 'cg'
  config.images.library = config.images.library !== false
  config.images.libraryDir = typeof config.images.libraryDir === 'string' ? config.images.libraryDir.trim().slice(0, 500) : ''
  config.style = normalizeStyle(saved?.style, modelKey(config.images.backend, config))
  normalizeSoundSettings(config.ui)
  if (!['auto', 'official', 'mirror'].includes(config.vision.source)) config.vision.source = 'auto'
  for (const [section, field] of URL_FIELDS) {
    const v = String(config[section][field] || '')
    if (v && !/^https?:\/\//i.test(v)) config[section][field] = DEFAULT_CONFIG[section][field]
  }
  config.novelai.endpoints = (Array.isArray(config.novelai.endpoints) ? config.novelai.endpoints : [])
    .filter(e => e && typeof e.id === 'string' && /^[a-z0-9_-]{1,32}$/i.test(e.id))
    .map(e => e.id === 'official' ? NAI_OFFICIAL : { id: e.id, name: String(e.name || e.id).slice(0, 40), baseURL: /^https?:\/\//i.test(e.baseURL || '') ? e.baseURL : '' })
  if (!config.novelai.endpoints.some(e => e.id === 'official')) config.novelai.endpoints.unshift(NAI_OFFICIAL)
  if (!config.novelai.endpoints.some(e => e.id === config.novelai.endpoint)) config.novelai.endpoint = 'official'
  return config
}

/** 浏览器发来的修改：只接受已知顶层键；数组整体替换。上传的音效只能经上传接口改。 */
export function applyPatch(saved, patch) {
  const allowed = Object.keys(DEFAULT_CONFIG)
  const clean = {}
  for (const key of allowed) if (key in (patch || {})) clean[key] = patch[key]
  if (typeof clean.enabled !== 'undefined') clean.enabled = Boolean(clean.enabled)
  if (isObject(clean.ui) && 'customSounds' in clean.ui) { clean.ui = { ...clean.ui }; delete clean.ui.customSounds }
  return deepMerge(saved || {}, clean)
}
