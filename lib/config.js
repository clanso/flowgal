// 设置：默认值、合并、校验。密钥永远不在这里（见 secrets.js）。
import { NAI_OFFICIAL } from './image/novelai.js'
import { DEFAULT_SOUNDS, normalizeSoundSettings } from './sounds.js'
import { BUILTIN_STYLES, DEFAULT_SAMPLE, normalizeStyle, modelKey } from './image/style.js'
import { DEFAULT_MIRROR } from './vision.js'
import { cleanPoseMap } from './face.js'
import { cleanPoseGroups } from './poses.js'
import { DEFAULT_FACE, cleanFaceSettings } from './face-paint.js'
import { cleanPrompts } from './prompt-words.js'
import { RECALL_TONES, CG_ORIENTATIONS, WEATHER } from './vocab.js'
import { cleanLimit, cleanDirectorLimits, DEFAULT_DIRECTOR_LIMITS } from './limits.js'

export const DEFAULT_CONFIG = {
  enabled: true,
  director: {
    auto: true,              // 每轮正文写完后自动整理成场景
    provider: '', model: '', // 留空跟随 Tavern 后台模型
    maxTokens: null,         // 最大输出：null 自动（模型报了上限就用它，不然 128000）；填了数就用这个数。模型窗口装不下或模型拒绝时自动降
    temperature: 0.7,
    contextChars: null,      // 给导演看多少人物卡 / 世界书资料（字）：null 不限（全给）；超出模型窗口时自动缩
    limits: { ...DEFAULT_DIRECTOR_LIMITS }, // 每轮各种演出最多几次（lib/limits.js）：null 不限
    // 提示词都在顶层的 prompts 里（设置 →「提示词」）；以前这里的 systemPrompt / spritePrompt / cgPrompt / actingPrompt 读到时搬过去
    sharedPrefix: true,      // 共用开头：导演和几位设计师的系统提示词换成同一句、各自的规矩挪进用户消息，资料和剧情放在最前面一字不差（模型接口能缓存）
    combineDesign: true,     // 补设计合进写词：已经设计过的人要画没设计的情绪时，补设计和写立绘提示词一次请求做完（资料和剧情只读一遍）；关掉就先单独补设计再写
    // 插画分镜师用的模型：'' 跟导演一样；host 在宿主的模型里另选一个；custom 自己接一个 OpenAI 兼容接口（Key 存在宿主，见 secrets.js）
    cgLlm: { source: '', provider: '', model: '', baseURL: '', contextWindow: 128000 },
  },
  images: {
    backend: 'novelai',
    auto: true,              // 每轮自动配 CG（导演判断值得画时）
    maxPerTurn: null,        // 每轮最多几张：null 不限（导演挑值得画的）
    cgShape: 'auto',         // 插画方向：auto 插画分镜师按构图挑 / landscape 都出横图 / portrait 都出竖图（vocab.js 的 CG_ORIENTATIONS）
    backgrounds: true,       // 新地点自动生成背景
    portraits: true,         // 角色登场、换装、长期状态变化时生成这一套的平静立绘
    expressions: true,       // 情绪差分：导演用到新情绪时补画（每种一张）
    expressionsPerTurn: null, // 每轮最多补几张：null 不限（这一轮用到的都画）
    faceSwap: true,          // 表情只换脸（NovelAI）：每套衣服每个动作整张画一张底图，同一个动作的其余情绪在底图上只重画脸
    poses: {},               // 老设置：通用动作组的改动（情绪 → 动作组）。poseGroups 没存过时照它搬进默认的通用动作组
    poseGroups: null,        // 通用动作组 [{ id, label, desc, tags, emotions }]（lib/poses.js）：没给某个人设计出动作与表情时用；null 用默认的四组
    face: structuredClone(DEFAULT_FACE), // 换脸怎么画：放大重画、软边遮罩、按强弱定重绘强度、最激烈的整张画、画完比对（lib/face-paint.js）
    spriteWriter: true,      // 立绘设计师：画立绘前先给每个人设计专属的动作和表情，再读完资料和剧情写提示词；关掉则按档案机械拼、用通用动作组
    concurrency: null,       // 同时画几张：null 自动（见 imageConcurrency）；NovelAI 官方一个账号同时只能画一张，填多少都是 1
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
    maxOnStage: 8,           // 同屏最多站几个人（2~12，0 不限）：超出的，最久没说话的先下场
    recall: 'text',          // 短闪回怎么演：text 画面不动、对话框换成回忆的样子；ghost 画面压暗、人浮到台前；portrait 对话框旁再出说话人的小头像
    recallName: 'blur',      // 短闪回里的名牌：blur 模糊压暗（认得出、看不清）；hide 不显示；show 照常
    recallTone: 'auto',      // 短闪回的基调：auto 导演按剧情选、没选时按情绪和氛围挑；或固定一种（见 lib/vocab.js 的 RECALL_TONES）
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
    eros: true,              // 亲密场面（R18）的声音与演出：触手、性爱的音效，节奏底，高潮那一下（lib/eros.js）；关掉后导演也不再写
    amb: true,               // 环境音：导演从音效库里给每一幕配的循环背景声
    ambVolume: 0.35,
    storySfx: true,          // 剧情音效：导演给发出声音的那句配的（音效库里的，或者内置的拟声：砰、咚、叮……）
    storySfxVolume: 0.8,
    // 网页字体从 npm CDN 读取（jsDelivr、unpkg 等目录结构相同，可换成镜像）；留空只用系统字体。
    fontBase: 'https://cdn.jsdelivr.net/npm/',
    effects: {},             // 特效开关：关掉的写 false（{ 'cam.shake': false }，编号见 src/client/theater/effects.js），没写的都开着
    fontScale: 1,
    autoOpen: false,         // 新一轮写完后自动打开剧场
    updateCheck: true,       // 打开剧场时检查插件更新（最多 12 小时一次，只在插件是 git 克隆时生效）
  },
  // 认脸模型（立绘工作台的自动框）从哪下：auto 先 HuggingFace 官网、连不上换镜像；official 只官网；mirror 先镜像
  vision: { source: 'auto', mirror: DEFAULT_MIRROR },
  // 玩家改过的提示词：{ 编号: { text, base } }（设置 →「提示词」，编号和默认值见 lib/prompt-book.js）；没改的跟着内置走
  prompts: {},
}

function isObject(v) { return v && typeof v === 'object' && !Array.isArray(v) }

/** 出图边长最大多少（本地渠道）。 */
export const MAX_IMAGE_SIDE = 4096
/** 同屏最多几人能选的档：0 是不限。 */
export const STAGE_SIZES = [0, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

/**
 * 同时画几张：NovelAI 官方接口一个账号同时只能画一张（多发的会被它拒绝，429），填多少都是 1；
 * 别的（NovelAI 自建的接入点、ComfyUI、WebUI、OpenAI 兼容）按设置里填的。没填（自动）时 OpenAI 兼容的同时 4 张，
 * 本地的 ComfyUI / WebUI 一张（一块显卡本来就一张张画，多发了只是在它那边排队、更容易等到超时）。
 */
export function imageConcurrency(config) {
  const backend = config?.images?.backend
  if (backend === 'novelai' && (config?.novelai?.endpoint || 'official') === 'official') return 1
  const set = Number(config?.images?.concurrency)
  if (Number.isFinite(set) && set >= 1) return Math.trunc(set)
  return backend === 'openai' ? 4 : 1
}

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

/** 特效开关的编号：「种类.值」。 */
const EFFECT_ID = /^[a-z]+\.[a-z0-9]+$/
const MAX_EFFECTS = 600

/**
 * 关掉了哪些特效：只留编号像样的、关掉的（false）。存下来的 true 是玩家打开过的，在这里不用记，
 * 但要用来判断老设置里「天气粒子」整个关掉时哪些天气后来又单独打开了。
 */
function cleanEffects(saved) {
  const ui = isObject(saved?.ui) ? saved.ui : {}
  const raw = isObject(ui.effects) ? ui.effects : {}
  const out = {}
  for (const id of Object.keys(raw).slice(0, MAX_EFFECTS)) if (EFFECT_ID.test(id) && raw[id] === false) out[id] = false
  // 以前只有一个「天气粒子」总开关：关着的话，没单独打开过的天气都算关着
  if (ui.particles === false) for (const w of WEATHER) if (w !== 'clear' && !(('weather.' + w) in raw)) out['weather.' + w] = false
  return out
}

/** 合并后的完整设置，带基本校验（数值范围、URL 协议）。 */
export function resolveConfig(saved) {
  const config = deepMerge(DEFAULT_CONFIG, saved)
  const clamp = (v, lo, hi, d) => { const n = Number(v); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d }
  config.images.maxPerTurn = cleanLimit(config.images.maxPerTurn)
  if (!CG_ORIENTATIONS.includes(config.images.cgShape)) config.images.cgShape = 'auto'
  config.images.concurrency = cleanLimit(config.images.concurrency, 1)
  config.images.expressionsPerTurn = cleanLimit(config.images.expressionsPerTurn)
  config.images.faceSwap = config.images.faceSwap !== false
  config.images.poses = cleanPoseMap(config.images.poses)
  config.images.poseGroups = cleanPoseGroups(config.images.poseGroups, config.images.poses)
  config.images.face = cleanFaceSettings(config.images.face)
  config.prompts = cleanPrompts(config.prompts, config.director)
  config.director.sharedPrefix = config.director.sharedPrefix !== false
  config.director.combineDesign = config.director.combineDesign !== false
  config.images.seed = Math.trunc(clamp(config.images.seed, -1, 2 ** 32 - 1, -1))
  config.novelai.cfgRescale = clamp(config.novelai.cfgRescale, 0, 1, 0)
  config.director.maxTokens = cleanLimit(config.director.maxTokens, 1000)
  config.director.temperature = clamp(config.director.temperature, 0, 2, 0.7)
  config.director.contextChars = cleanLimit(config.director.contextChars)
  config.director.limits = cleanDirectorLimits(config.director.limits)
  const cgLlm = isObject(config.director.cgLlm) ? config.director.cgLlm : (config.director.cgLlm = structuredClone(DEFAULT_CONFIG.director.cgLlm))
  if (!['', 'host', 'custom'].includes(cgLlm.source)) cgLlm.source = ''
  for (const f of ['provider', 'model', 'baseURL']) cgLlm[f] = typeof cgLlm[f] === 'string' ? cgLlm[f].trim().slice(0, 300) : ''
  if (cgLlm.baseURL && !/^https?:\/\//i.test(cgLlm.baseURL)) cgLlm.baseURL = ''
  cgLlm.contextWindow = Math.trunc(clamp(cgLlm.contextWindow, 0, 10000000, DEFAULT_CONFIG.director.cgLlm.contextWindow))
  config.ui.textSpeed = clamp(config.ui.textSpeed, 0, 200, 30)
  config.ui.bgmVolume = clamp(config.ui.bgmVolume, 0, 1, 0.45)
  config.ui.ambVolume = clamp(config.ui.ambVolume, 0, 1, 0.35)
  config.ui.storySfxVolume = clamp(config.ui.storySfxVolume, 0, 2, 0.8)
  config.ui.amb = Boolean(config.ui.amb)
  config.ui.eros = config.ui.eros !== false
  config.ui.storySfx = Boolean(config.ui.storySfx)
  config.ui.effects = cleanEffects(saved)
  delete config.ui.particles
  // 出图尺寸：宽高各取 64 的倍数（各家后端都要求），256–4096（本地 ComfyUI / WebUI 能画这么大）；NovelAI 按它自己的规矩最大 2048（image/novelai.js）。填坏了用默认。
  for (const [shape, fallback] of Object.entries(DEFAULT_CONFIG.images.sizes)) {
    const size = config.images.sizes?.[shape]
    const [w, h] = Array.isArray(size) ? size.map(n => Math.round(Number(n) / 64) * 64) : []
    config.images.sizes[shape] = Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0 ? [Math.min(MAX_IMAGE_SIDE, Math.max(256, w)), Math.min(MAX_IMAGE_SIDE, Math.max(256, h))] : [...fallback]
  }
  if (!['cg', 'wide'].includes(config.ui.ratio)) config.ui.ratio = 'cg'
  if (!STAGE_SIZES.includes(config.ui.maxOnStage)) config.ui.maxOnStage = DEFAULT_CONFIG.ui.maxOnStage
  if (!['text', 'ghost', 'portrait'].includes(config.ui.recall)) config.ui.recall = DEFAULT_CONFIG.ui.recall // 早先默认存下的 face 也回到 text
  if (!['blur', 'hide', 'show'].includes(config.ui.recallName)) config.ui.recallName = DEFAULT_CONFIG.ui.recallName
  if (!['auto', ...RECALL_TONES].includes(config.ui.recallTone)) config.ui.recallTone = DEFAULT_CONFIG.ui.recallTone
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
