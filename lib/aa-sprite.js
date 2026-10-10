// 逆转式分层立绘：呼吸帧 + 眨眼 + 说话口型（纯函数，不碰 DOM，剧场和测试共用）。
// 素材包是一个 sprite.json 加同目录的图片：
//   size: [宽, 高]
//   breath: { frames: [文件...], lifts: [每帧头部上移的像素], steps: [{ frame, ms }...] }  —— 呼吸按 steps 循环；只有一帧 = 不呼吸
//   parts: { eyes: { half|closed: { file, x, y } }, mouth: { half|open: { file, x, y } } }  —— 差分贴片，贴在原图坐标 (x, y - lift)
//   blink: { sequence: [{ eyes, ms }...], interval_ms: [最短, 最长] }
//   talk: { mouth_loop: [{ mouth, ms }...] }
// 立绘记录带 aa: { manifest: 'sprite.json 的地址' } 时，剧场用这套素材画；没有就照旧显示原图。
// v2 素材包（motion.json，version: 2：正面 / 侧头两个姿势、转头中间帧、更细的眼嘴）的播放规则在 aa-motion.js；
// 检查、列文件、换素材编号在这里一起管（cleanPack / packFiles / packWithAssets / packStill 两种都认）。
import { SILENT } from './typing.js'
import { MOTION_DEFAULTS } from './aa-motion.js'

/** 按 steps 循环，返回 t 毫秒时该用第几张呼吸帧。 */
export function breathFrame(breath, t) {
  const steps = breath?.steps || []
  const cycle = steps.reduce((s, x) => s + x.ms, 0)
  if (!(cycle > 0)) return 0
  let r = ((t % cycle) + cycle) % cycle
  for (const s of steps) {
    if (r < s.ms) return s.frame
    r -= s.ms
  }
  return steps[steps.length - 1].frame
}

/** 下一次眨眼前等多久（interval_ms 区间内随机）。 */
export function blinkGap(blink, random = Math.random) {
  const [a, b] = blink?.interval_ms || [2000, 5000]
  return a + random() * (Math.max(a, b) - a)
}

/** 眨眼开始后 t 毫秒的眼睛状态；眨完返回 null。 */
export function blinkAt(blink, t) {
  let r = t
  for (const s of blink?.sequence || []) {
    if (r < s.ms) return s.eyes
    r -= s.ms
  }
  return null
}

/**
 * 说话口型，跟着对话框的演出计划走（lib/typing.js 的 planLine）。
 * talk：{ chars, times, gap, mouth, speed, startedAt, done, type }，第 i 个字在 startedAt + times[i] 出现，
 * gap 是这句的基本字距，mouth 是口型方式：
 *   loop 按 mouth_loop 循环开合（语速慢时也慢一点）；soft 同上但只半张（低语）；
 *   syllable 一字一张（威压：每个字先张大、再半张、再合上）；wide 张大嘴（怒吼、崩溃）。
 * 只有台词动嘴；还没出字、出到标点、最后一个字出完、下一个字还要等很久（说说停停、重音前那一顿）都闭嘴；
 * 每段话重新开口时从 mouth_loop 第一步（半张）开始。
 */
export function mouthAt(loop, talk, now) {
  if (!talk || talk.done || talk.type !== 'dialogue' || !(talk.speed > 0) || !talk.chars?.length || !loop?.length) return 'closed'
  if (!Number.isFinite(talk.startedAt)) return 'closed' // 这一句还没开始逐字显现
  const { chars, times } = talk
  const gap = talk.gap > 0 ? talk.gap : talk.speed
  const mode = talk.mouth || 'loop'
  const elapsed = now - talk.startedAt
  if (!times || elapsed < times[0]) return 'closed'
  let i = 0
  while (i + 1 < times.length && times[i + 1] <= elapsed) i += 1
  if (SILENT.test(chars[i])) return 'closed'
  const since = elapsed - times[i]
  const last = i >= chars.length - 1
  if (last && since > gap) return 'closed' // 最后一个字也要说完：再动一个字距才闭嘴
  const next = last ? gap : times[i + 1] - times[i]
  if (next > gap * 2.2 && since > gap) return 'closed'
  if (mode === 'syllable') {
    const slot = Math.max(next, 1)
    return since < slot * 0.5 ? 'open' : since < slot * 0.75 ? 'half' : 'closed'
  }
  // 这一段从哪个字开口：往回找到标点或长停顿
  let start = i
  while (start > 0 && !SILENT.test(chars[start - 1]) && times[start] - times[start - 1] <= gap * 2.2) start -= 1
  const t = elapsed - times[start]
  if (mode === 'wide') return t < 40 ? 'half' : 'open'
  const factor = Math.min(1.4, Math.max(0.8, gap / 35))
  const total = loop.reduce((s, x) => s + x.ms * factor, 0)
  let r = t % total
  let state = loop[loop.length - 1].mouth
  for (const step of loop) {
    const ms = step.ms * factor
    if (r < ms) { state = step.mouth; break }
    r -= ms
  }
  return mode === 'soft' && state === 'open' ? 'half' : state
}

// ───────────────────────── 导入素材包 ─────────────────────────
// 玩家在人物志里给一张差分导入素材包文件夹：先用 cleanPack 检查 sprite.json，按 packFiles 收齐要用的图片，
// 宿主存成素材后用 packWithAssets 把文件名换成素材编号，存进立绘记录的 aa.pack（剧场照着画，文件按编号去读）。

const PACK_FILE = /^(?!\/)(?!.*(?:^|\/)\.\.(?:\/|$))[^\\:*?"<>|\u0000-\u001f]{1,200}$/
const PART_STATE = /^[a-z_]{1,16}$/
const int = (v, lo, hi, what) => {
  const n = Number(v)
  if (!Number.isInteger(n) || n < lo || n > hi) throw new Error(`素材包的 ${what} 不对（要 ${lo}~${hi} 的整数，拿到 ${JSON.stringify(v)}）`)
  return n
}
const file = (v, what) => {
  if (typeof v !== 'string' || !PACK_FILE.test(v)) throw new Error(`素材包的 ${what} 文件名不对：${JSON.stringify(v)}`)
  return v
}
const list = (v, what) => {
  if (!Array.isArray(v)) throw new Error(`素材包缺 ${what}`)
  return v
}

/**
 * 检查并整理 sprite.json：尺寸、呼吸帧、眼睛 / 嘴巴差分（贴片坐标）、眨眼和口型节奏。
 * 只留剧场用得到的字段；文件名只能是素材包文件夹里的相对路径（不能往上跳）。不合法时抛错，说清哪一项不对。
 */
export function cleanPack(raw) {
  if (raw && typeof raw === 'object' && Number(raw.version) === 2) return cleanMotionPack(raw)
  if (!raw || typeof raw !== 'object') throw new Error('sprite.json 不是一个对象')
  const size = list(raw.size, 'size（宽、高）')
  const w = int(size[0], 1, 8192, '宽'), h = int(size[1], 1, 8192, '高')
  const frames = list(raw.breath?.frames, 'breath.frames（呼吸帧）').map((f, i) => file(f, `第 ${i + 1} 张呼吸帧`))
  if (!frames.length || frames.length > 12) throw new Error('呼吸帧要 1~12 张')
  const lifts = frames.map((_, i) => int(raw.breath.lifts?.[i] ?? 0, -512, 512, `第 ${i + 1} 张呼吸帧的上移`))
  const steps = (raw.breath.steps?.length ? raw.breath.steps : [{ frame: 0, ms: 1000 }]).slice(0, 32)
    .map((s, i) => ({ frame: int(s?.frame, 0, frames.length - 1, `呼吸第 ${i + 1} 步的帧号`), ms: int(s?.ms, 10, 60000, `呼吸第 ${i + 1} 步的时长`) }))
  const parts = {}
  for (const part of ['eyes', 'mouth']) {
    const states = raw.parts?.[part]
    if (!states) continue
    parts[part] = {}
    for (const [state, p] of Object.entries(states)) {
      if (!PART_STATE.test(state)) throw new Error(`素材包的 ${part} 差分名不对：${state}`)
      parts[part][state] = { file: file(p?.file, `${part}.${state}`), x: int(p?.x, -w, w, `${part}.${state} 的 x`), y: int(p?.y, -h, h, `${part}.${state} 的 y`) }
    }
  }
  const pack = { name: String(raw.name || '').slice(0, 60), size: [w, h], breath: { frames, lifts, steps }, parts }
  if (raw.blink) {
    pack.blink = {
      sequence: list(raw.blink.sequence, 'blink.sequence').slice(0, 16).map((s, i) => ({ eyes: String(s?.eyes || ''), ms: int(s?.ms, 1, 5000, `眨眼第 ${i + 1} 步的时长`) })),
      interval_ms: [int(raw.blink.interval_ms?.[0] ?? 2000, 100, 60000, '眨眼最短间隔'), int(raw.blink.interval_ms?.[1] ?? 5000, 100, 60000, '眨眼最长间隔')],
    }
  }
  if (raw.talk?.mouth_loop) {
    pack.talk = { mouth_loop: list(raw.talk.mouth_loop, 'talk.mouth_loop').slice(0, 16).map((s, i) => ({ mouth: String(s?.mouth || ''), ms: int(s?.ms, 1, 5000, `口型第 ${i + 1} 步的时长`) })) }
  }
  return pack
}

/** 素材包要用到的全部图片（呼吸帧、眼睛和嘴巴的差分），不重复。导入后同一个函数列出的是素材编号。 */
export function packFiles(pack) {
  if (!pack) return []
  if (pack.version === 2) {
    const files = []
    for (const p of Object.values(pack.poses || {})) {
      files.push(p.base)
      for (const states of Object.values(p.parts || {})) for (const v of Object.values(states)) files.push(v.file)
    }
    for (const list of Object.values(pack.turns || {})) files.push(...list)
    return [...new Set(files)]
  }
  const parts = Object.values(pack.parts || {}).flatMap(states => Object.values(states).map(p => p.file))
  return [...new Set([...(pack.breath?.frames || []), ...parts])]
}

/** 把素材包里的文件名换成素材编号（ids：文件名 → 编号）。 */
export function packWithAssets(pack, ids) {
  const at = name => { if (!ids[name]) throw new Error('素材包缺文件：' + name); return ids[name] }
  if (pack.version === 2) {
    const swap = parts => Object.fromEntries(Object.entries(parts || {}).map(([part, states]) =>
      [part, Object.fromEntries(Object.entries(states).map(([state, p]) => [state, { ...p, file: at(p.file) }]))]))
    const poses = Object.fromEntries(Object.entries(pack.poses).map(([k, p]) => [k, { ...p, base: at(p.base), parts: swap(p.parts) }]))
    const turns = Object.fromEntries(Object.entries(pack.turns || {}).map(([k, list]) => [k, list.map(at)]))
    return { ...pack, poses, turns }
  }
  const parts = {}
  for (const [part, states] of Object.entries(pack.parts || {})) {
    parts[part] = Object.fromEntries(Object.entries(states).map(([state, p]) => [state, { ...p, file: at(p.file) }]))
  }
  return { ...pack, breath: { ...pack.breath, frames: pack.breath.frames.map(at) }, parts }
}

/** 素材包的静止图（这张差分在人物志里显示的那张）：v1 是第一张呼吸帧，v2 是默认姿势的整图。 */
export function packStill(pack) {
  if (!pack) return ''
  return pack.version === 2 ? pack.poses?.[pack.default_pose]?.base || '' : pack.breath?.frames?.[0] || ''
}

const POSE_NAME = /^[a-z_]{1,16}$/
const EYE_STATES = ['lower', 'half', 'closed']
const MOUTH_STATES = ['narrow', 'half', 'open', 'round']
const VISEMES = ['A', 'E', 'I', 'O', 'U', 'N']
const timedSteps = (v, what, key, allowed, fallback) => {
  if (!Array.isArray(v)) return fallback
  const out = v.slice(0, 12).map((s, i) => {
    const state = String(s?.[key] || '')
    if (!allowed.includes(state)) throw new Error(`素材包的${what}第 ${i + 1} 步状态不对：${JSON.stringify(s?.[key])}`)
    return { [key]: state, ms: int(s?.ms, 1, 5000, `${what}第 ${i + 1} 步的时长`) }
  })
  return out.length ? out : fallback
}
const chance = (v, fallback, what) => {
  if (v === undefined) return fallback
  const n = Number(v)
  if (!(n >= 0 && n <= 1)) throw new Error(`素材包的 ${what} 要在 0~1 之间`)
  return n
}
const stateMap = (v, keys, values, fallback, what) => {
  if (!v || typeof v !== 'object') return fallback
  const out = { ...fallback }
  for (const [k, x] of Object.entries(v)) {
    if (!keys.includes(k)) continue
    if (!values.includes(x)) throw new Error(`素材包的 ${what}.${k} 不对：${JSON.stringify(x)}`)
    out[k] = x
  }
  return out
}

/**
 * 检查并整理 v2 素材包（motion.json）：姿势整图、眼嘴贴片、转头中间帧、节奏参数（没写的用 MOTION_DEFAULTS）。
 * 姿势 1~4 个；眼睛只认 lower / half / closed，嘴只认 narrow / half / open / round（睁眼、闭嘴就是整图本身）。
 */
function cleanMotionPack(raw) {
  const size = list(raw.size, 'size（宽、高）')
  const w = int(size[0], 1, 8192, '宽'), h = int(size[1], 1, 8192, '高')
  const names = Object.keys(raw.poses || {})
  if (!names.length || names.length > 4) throw new Error('素材包的姿势（poses）要 1~4 个')
  const poses = {}
  for (const name of names) {
    if (!POSE_NAME.test(name)) throw new Error('素材包的姿势名不对：' + name)
    const p = raw.poses[name] || {}
    const parts = {}
    for (const [part, allowed] of [['eyes', EYE_STATES], ['mouth', MOUTH_STATES]]) {
      parts[part] = {}
      for (const [state, v] of Object.entries(p.parts?.[part] || {})) {
        if (!allowed.includes(state)) throw new Error(`素材包「${name}」的 ${part} 差分名不对：${state}`)
        parts[part][state] = { file: file(v?.file, `${name}.${part}.${state}`), x: int(v?.x, -w, w, `${name}.${part}.${state} 的 x`), y: int(v?.y, -h, h, `${name}.${part}.${state} 的 y`) }
      }
    }
    poses[name] = { label: String(p.label || '').slice(0, 20), base: file(p.base, `姿势「${name}」的整图`), parts }
  }
  const defaultPose = names.includes(raw.default_pose) ? raw.default_pose : names[0]
  const turns = {}
  for (const [k, v] of Object.entries(raw.turns || {})) {
    const [a, b] = k.split('>')
    if (!poses[a] || !poses[b] || a === b) throw new Error('素材包的转头写法不对：' + k + '（要「姿势>姿势」）')
    turns[k] = list(v, `转头 ${k} 的中间帧`).slice(0, 6).map((f, i) => file(f, `转头 ${k} 第 ${i + 1} 张`))
  }
  const D = MOTION_DEFAULTS
  const eyesAll = ['open', ...EYE_STATES]
  const mouthAll = ['closed', ...MOUTH_STATES]
  const B = raw.blink || {}
  const blink = {
    close: timedSteps(B.close, '闭眼', 'eyes', eyesAll, D.blink.close),
    open: timedSteps(B.open, '睁眼', 'eyes', eyesAll, D.blink.open),
    interval_ms: [int(B.interval_ms?.[0] ?? D.blink.interval_ms[0], 100, 60000, '眨眼最短间隔'), int(B.interval_ms?.[1] ?? D.blink.interval_ms[1], 100, 60000, '眨眼最长间隔')],
    double_chance: chance(B.double_chance, D.blink.double_chance, 'double_chance'),
    double_gap_ms: int(B.double_gap_ms ?? D.blink.double_gap_ms, 1, 2000, '连眨间隔'),
    sentence_end_chance: chance(B.sentence_end_chance, D.blink.sentence_end_chance, 'sentence_end_chance'),
    line_start_chance: chance(B.line_start_chance, D.blink.line_start_chance, 'line_start_chance'),
  }
  const T = raw.talk || {}
  const shapes = {}
  const accent = {}
  for (const lv of ['normal', 'loud', 'soft']) {
    shapes[lv] = stateMap(T.shapes?.[lv], VISEMES, mouthAll, D.talk.shapes[lv], `talk.shapes.${lv}`)
    const a = Array.isArray(T.accent?.[lv]) ? T.accent[lv].filter(x => mouthAll.includes(x)).slice(0, 4) : []
    accent[lv] = a.length ? a : D.talk.accent[lv]
  }
  const talk = {
    beat_ms: [int(T.beat_ms?.[0] ?? D.talk.beat_ms[0], 30, 1000, '一拍最短'), int(T.beat_ms?.[1] ?? D.talk.beat_ms[1], 30, 2000, '一拍最长')],
    attack: chance(T.attack, D.talk.attack, 'talk.attack'),
    shapes,
    accent,
    release: stateMap(T.release, mouthAll, mouthAll, D.talk.release, 'talk.release'),
    bump: stateMap(T.bump, mouthAll, mouthAll, D.talk.bump, 'talk.bump'),
  }
  const U = raw.turn || {}
  const turn = {
    lead: timedSteps(U.lead, '转头前', 'eyes', eyesAll, D.turn.lead),
    frames_ms: Array.isArray(U.frames_ms) && U.frames_ms.length ? U.frames_ms.slice(0, 6).map((v, i) => int(v, 1, 3000, `中间帧第 ${i + 1} 张的时长`)) : D.turn.frames_ms,
    land: timedSteps(U.land, '转头后', 'eyes', eyesAll, D.turn.land),
  }
  return { version: 2, name: String(raw.name || '').slice(0, 60), size: [w, h], poses, default_pose: defaultPose, turns, blink, talk, turn }
}

// ───────────────────────── 工作台：用局部重绘做眨眼、口型 ─────────────────────────
// 一张差分只做一帧（不呼吸）：原图当静止帧，NovelAI 局部重绘只重画框里的眼睛、嘴巴，
// 各做两个状态（半闭眼、闭眼；嘴半张、嘴张开），浏览器把重画的那一小块按软边贴片切出来，再按素材包导入。

/**
 * 每个状态怎么改提示词：add 加在最前面，neg 加进负面词，drop 是跟它打架、要拿掉的 tag（整条匹配，不分大小写）。
 * 闭眼时眼睛颜色也拿掉（留着模型会把眼睛画开）；动嘴时拿掉闭嘴、笑，免得嘴型画回原样。
 */
export const AA_PARTS = {
  eyes: {
    label: '眼睛',
    states: {
      half: { label: '半闭眼', add: 'half-closed eyes', neg: 'closed eyes, wide-eyed', drop: [/^wide[- ]eyed$/i, /^open eyes$/i] },
      closed: { label: '闭眼', add: 'closed eyes', neg: 'open eyes, eyelashes up', drop: [/^wide[- ]eyed$/i, /^open eyes$/i, /^looking at viewer$/i, /^(?!closed\b)[\w\s-]* eyes$/i] },
    },
  },
  mouth: {
    label: '嘴',
    states: {
      half: { label: '嘴半张', add: 'parted lips', neg: 'open mouth, :o, round mouth, teeth, tongue', drop: [/^closed mouth$/i, /smile$/i, /^(grin|smirk|:\)|:3)$/i] },
      open: { label: '嘴张开', add: 'open mouth, talking', neg: 'wide open mouth, :d, :o, round mouth, teeth, tongue, laughing, shouting', drop: [/^closed mouth$/i, /smile$/i, /^(grin|smirk|:\)|:3)$/i] },
    },
  },
}
/** 生成顺序：一张差分要重画这四次。 */
export const AA_STEPS = [['eyes', 'half'], ['eyes', 'closed'], ['mouth', 'half'], ['mouth', 'open']]
/** 默认的眨眼、口型节奏（跟最早做的和服少女素材包一样）。 */
export const AA_BLINK = { sequence: [{ eyes: 'half', ms: 60 }, { eyes: 'closed', ms: 90 }, { eyes: 'half', ms: 60 }], interval_ms: [2000, 5000] }
export const AA_TALK = { mouth_loop: [{ mouth: 'half', ms: 70 }, { mouth: 'open', ms: 90 }, { mouth: 'half', ms: 70 }, { mouth: 'closed', ms: 70 }] }

/** 某个状态的重画提示词：原来画这张差分的提示词，拿掉打架的 tag，把要的 tag 放最前面。 */
export function aaPrompt(positive, negative, part, state) {
  const recipe = AA_PARTS[part]?.states?.[state]
  if (!recipe) throw new Error('没有这个状态：' + part + '/' + state)
  const tags = String(positive || '').split(/,\s*/).map(t => t.trim()).filter(Boolean)
  const kept = tags.filter(t => !recipe.drop.some(re => re.test(t)))
  return {
    prompt: [recipe.add, ...kept].join(', '),
    negative: [negative, recipe.neg].filter(s => String(s || '').trim()).join(', '),
  }
}

/** 框对齐到 8 像素（NovelAI 按 8×8 小块处理遮罩）。 */
const snap8 = v => Math.round(v / 8) * 8

/**
 * 检查工作台框的位置：rects 是 { eyes: [[x0,y0,x1,y1]...], mouth: [...] }，原图坐标。
 * 每块对齐 8 像素、夹在图里、至少 8×8；眼睛最多 2 块、嘴 1 块；加起来不超过整张图的 1/8（只重画脸上一小块）。
 */
export function cleanRects(rects, width, height) {
  const out = {}
  let area = 0
  for (const [part, max] of [['eyes', 2], ['mouth', 1]]) {
    const list = Array.isArray(rects?.[part]) ? rects[part].slice(0, max) : []
    out[part] = list.map(r => {
      const [x0, y0, x1, y1] = (Array.isArray(r) ? r : []).map(Number)
      if (![x0, y0, x1, y1].every(Number.isFinite)) throw new Error(`${AA_PARTS[part].label}的框不对`)
      const a = [Math.max(0, snap8(Math.min(x0, x1))), Math.max(0, snap8(Math.min(y0, y1))), Math.min(width, snap8(Math.max(x0, x1))), Math.min(height, snap8(Math.max(y0, y1)))]
      if (a[2] - a[0] < 8 || a[3] - a[1] < 8) throw new Error(`${AA_PARTS[part].label}的框太小`)
      area += (a[2] - a[0]) * (a[3] - a[1])
      return a
    })
    if (!out[part].length) throw new Error(`还没框${AA_PARTS[part].label}`)
  }
  if (area > width * height / 8) throw new Error('框太大了：只框眼睛和嘴就够，重画范围越小越不容易走样')
  return out
}

/** 几块框合起来的外接矩形 [x0, y0, x1, y1]（贴片就切这么大）。 */
export function rectsBox(list) {
  return [Math.min(...list.map(r => r[0])), Math.min(...list.map(r => r[1])), Math.max(...list.map(r => r[2])), Math.max(...list.map(r => r[3]))]
}

/** 一张图还没框过时的默认框（按立绘常见构图估的：脸在上部正中），宽高是原图尺寸。 */
export function defaultRects(width, height) {
  const at = (fx0, fy0, fx1, fy1) => [snap8(width * fx0), snap8(height * fy0), snap8(width * fx1), snap8(height * fy1)]
  return { eyes: [at(0.385, 0.176, 0.471, 0.229), at(0.51, 0.171, 0.606, 0.224)], mouth: [at(0.471, 0.257, 0.519, 0.27)] }
}

/** 工作台做好的一套贴片拼成素材包（sprite.json 的内容）：still 是静止帧文件名，patches[部件][状态] = { file, x, y }。 */
export function stillPack({ name, width, height, still, patches }) {
  return { name, size: [width, height], breath: { frames: [still], lifts: [0], steps: [{ frame: 0, ms: 1000 }] }, parts: patches, blink: AA_BLINK, talk: AA_TALK }
}
