// 场景随剧情逐句变：导演在某一句写 scene（地点、时段、天气、光线、基调、画面效果的变化，从这一句起生效）、
// mode（进入回忆、梦境这类特殊段落，real 回到现实）、cut（过场字卡）。剧场、导演（上一幕结束时的场景）、出背景图共用这一套走法。
import { placeKey, speakersOf, RECALL_TONES, RECALL_PRIORITY } from './vocab.js'
import { emotionRecall } from './emotions.js'

/** 场景的默认值：老脚本没有的项按它补。 */
export const SCENE_DEFAULTS = { location: '', time: 'afternoon', weather: 'clear', mood: 'daily', light: 'normal', fx: 'none', romance: 'none', sense: 'none', bars: 'none', eros: 'none', tentacle: 'none', erosLoop: '', bg: '' }

/** 进入各种特殊段落默认用的转场；回到现实默认溶解（从回忆里出来是起雾）；只换了地方是溶解，换地方时时段也变了是黑场。导演在那一句的 scene.transition 里写了就用写的。 */
export const MODE_TRANSITION = { memory: 'haze', dream: 'swirl', illusion: 'glitch', imagine: 'iris', pov: 'blink', inner: 'black', screen: 'glitch', tale: 'dissolve', vision: 'flash', digital: 'glitch' }

const unitNumber = id => Number(String(id).replace(/\D/g, '')) || 0

/** 脚本里有标注的句子，按正文顺序（只存了有标注的单元，编号就是顺序）。 */
export function orderedLines(script) {
  const lines = script?.lines || {}
  return Object.keys(lines).sort((a, b) => unitNumber(a) - unitNumber(b)).map(id => lines[id])
}

/**
 * 把一句的变化叠到场景上。换了地点：没写 bg 就用这一轮里这个地点用过的（没有就空着：剧场找存下的背景，再没有画天空），
 * 光线、画面效果、亲密氛围、感官、电影黑边、节奏底和触手回到默认（关着灯的房间走到走廊上，不再是黑的）；时段、天气、基调接着用。
 */
function applyDelta(scene, delta, known) {
  if (!delta) return scene
  const { transition, ...change } = delta
  const next = { ...scene, ...change }
  if (change.location && change.location !== scene.location) {
    if (!change.bg) next.bg = known.get(change.location) || ''
    if (!change.light) next.light = 'normal'
    if (!change.fx) next.fx = 'none'
    if (!change.romance) next.romance = 'none'
    if (!change.sense) next.sense = 'none'
    if (!change.bars) next.bars = 'none'
    if (!change.eros) next.eros = 'none'
    if (!change.tentacle) next.tentacle = 'none'
    if (!change.erosLoop) next.erosLoop = ''
  }
  // 节奏底的录音（音效库编号）：写 none 回到合成的；这一句收起了节奏和触手、或者转进余韵，又没另写一段录音的，录音也收起
  // （先写好录音、过几句才开始动的照留着）
  if (!change.erosLoop && (change.eros || change.tentacle)) {
    const off = (next.eros || 'none') === 'none' && (next.tentacle || 'none') === 'none'
    if (off || (change.eros === 'afterglow' && scene.eros !== 'afterglow')) next.erosLoop = ''
  }
  if (next.erosLoop === 'none') next.erosLoop = ''
  if (next.bg && next.location) known.set(next.location, next.bg)
  return next
}

/** 段落里「当时的样子」按名字叠起来：{ 名字: then }，同一个段落里后写的覆盖先写的；没有为 null。 */
function addThen(map, list) {
  if (!list?.length) return map || null
  return { ...(map || {}), ...Object.fromEntries(list.map(e => [e.name, e])) }
}

/**
 * 从这一轮开头逐句走一遍。
 * start：{ scene（这一轮开场时的现实场景）, bgm, amb, layer（上一轮带过来、这一轮第一句接着演的特殊段落）}。
 * lines：要演的每一句的标注（没标注的给 {}），按正文顺序。
 * 返回每一句播放时的状态：
 *   scene 画面上的场景（在特殊段落里就是段落里的场景），mode 当前的特殊段落（现实为空），bgm / amb 这时在放的，
 *   real 现实里的状态（段落结束要回到的），layer 当前段落（then 是段落里的人当时的样子），moved 这一句换了地方或进出了段落，transition 这一句的转场（没变化为空）。
 */
export function walkScenes(start, lines) {
  let real = { scene: { ...SCENE_DEFAULTS, ...(start.scene || {}) }, bgm: start.bgm || '', amb: start.amb || '' }
  let layer = start.layer || null
  const known = new Map()
  if (real.scene.bg && real.scene.location) known.set(real.scene.location, real.scene.bg)
  return lines.map(raw => {
    const line = raw || {}
    const before = layer ? layer.scene : real.scene
    const beforeMode = layer ? layer.mode : ''
    const delta = line.scene || null
    if (line.mode === 'real') {
      layer = null
      real = { ...real, scene: applyDelta(real.scene, delta, known) }
    } else if (line.mode) {
      // 当时的样子跟着段落走：接着演同一种段落的叠上去，换了一种段落就重新算
      layer = layer
        ? { ...layer, mode: line.mode, scene: applyDelta(layer.scene, delta, known), then: addThen(layer.mode === line.mode ? layer.then : null, line.then) }
        : { mode: line.mode, scene: applyDelta(real.scene, delta, known), bgm: real.bgm, amb: real.amb, then: addThen(null, line.then) }
    } else if (layer) layer = { ...layer, scene: applyDelta(layer.scene, delta, known), then: addThen(layer.then, line.then) }
    else real = { ...real, scene: applyDelta(real.scene, delta, known) }
    // 换歌、换环境音落在当前这一层：段落里换的，回到现实时自动换回进段落前的。配乐留白（hush）不是换歌，这里不管（剧场的 playback.js 管）。
    const bgm = line.bgm === 'hush' ? '' : line.bgm
    if (bgm || line.amb) {
      const patch = { ...(bgm ? { bgm } : {}), ...(line.amb ? { amb: line.amb } : {}) }
      if (layer) layer = { ...layer, ...patch }
      else real = { ...real, ...patch }
    }
    const now = layer || real
    const scene = now.scene
    const mode = layer ? layer.mode : ''
    const moved = mode !== beforeMode || scene.location !== before.location
    let transition = ''
    // 只换了地方：同一时段里走过去是溶解，时段也变了（过了一段时间）是黑场
    const passed = mode === beforeMode && scene.time !== before.time
    if (moved) transition = delta?.transition || (mode && mode !== beforeMode ? MODE_TRANSITION[mode] : mode !== beforeMode && beforeMode === 'memory' ? 'haze' : passed ? 'black' : 'dissolve')
    else if (placeKey(scene) !== placeKey(before) || scene.bg !== before.bg) transition = delta?.transition || 'fade'
    else if (delta?.transition && delta.transition !== 'none') transition = delta.transition
    return { scene, mode, bgm: now.bgm, amb: now.amb, real, layer, moved, transition, ...(line.cut ? { cut: line.cut } : {}) }
  })
}

/** 一幕走完后的状态：现实里的场景、配乐、环境音（特殊段落在一轮结束时收起），以及结束时还在的段落。 */
export function sceneEnd(script) {
  if (!script?.scene) return null
  const start = { scene: script.scene, bgm: script.scene.bgm || '', amb: script.scene.amb || '' }
  const steps = walkScenes(start, orderedLines(script))
  const last = steps[steps.length - 1]
  return last ? { real: last.real, layer: last.layer } : { real: { ...start, scene: { ...SCENE_DEFAULTS, ...script.scene } }, layer: null }
}

/** 一幕结束时的现实场景（下一轮接着它演）。 */
export function sceneAfter(script) {
  return sceneEnd(script)?.real.scene || null
}

/** 这一轮里出现过的每个场景（开场、换过去的地方、时间推移后的样子、段落里的场景、分屏另一头的地方），出背景图按它来。 */
export function scriptScenes(script) {
  if (!script?.scene) return []
  const start = { scene: script.scene }
  const seen = new Map([[placeKey(script.scene), { ...SCENE_DEFAULTS, ...script.scene }]])
  const add = scene => {
    const key = placeKey(scene)
    if (!seen.has(key) || (!seen.get(key).bg && scene.bg)) seen.set(key, scene)
  }
  const lines = orderedLines(script)
  walkScenes(start, lines).forEach(({ scene }, i) => {
    add(scene)
    const split = lines[i]?.split
    // 分屏另一头：同一时段，天气、光线按默认（导演只描述了那个地方）
    if (split?.location) add({ ...SCENE_DEFAULTS, location: split.location, time: scene.time, bg: split.bg || '' })
  })
  return [...seen.values()]
}

/**
 * 短闪回：脑海里闪过的几句（导演给这几句写 recall，不换场景）。连着的几句算一段。
 * 返回每个单元一项：不在闪回里为 null；在闪回里是这一段的 { who: 段里开口的人（按先后，不含「我」）, then: { 名字: 当时的样子 },
 * tone: 导演写的基调（没写为 ''，剧场用 autoRecallTone 挑）, emos: 段里各句的情绪 }，同一段的几句共用一个对象。
 */
// 正文里写明了的闪回：【闪回】【回忆】【闪回演出：一瞬】【フラッシュバック】……到【闪回结束】【回忆结束】【回到现实】
const STAGE_NOTE = /^[【\[]([^】\]]*)[】\]]$/
const FLASHBACK = '(?:闪回|閃回|回忆|回憶|回想|フラッシュバック|flashback)'
// 标注以这些词开头才算（【背景：……（回想）】这类场景标注不算）
const FLASHBACK_START = new RegExp(`^\\s*${FLASHBACK}`, 'i')
const FLASHBACK_END = new RegExp(`^\\s*${FLASHBACK}(?:演出|篇|シーン)?[\\s・·：:\\-—~～]*(?:结束|結束|终了|終了|终|終|完|おわり|end)|^\\s*(?:回到现实|回到現實|現実に戻)`, 'i')
/** 没写结束的闪回最多算几句。 */
const OPEN_FLASHBACK_MAX = 6

/**
 * 导演没写 recall 也按短闪回演的句子，补上 recall: true（返回补好的脚本，不改原来的；没有要补的原样返回）：
 * - 正文里用舞台指示框起来的闪回（开头【闪回…】，到【…结束】为止；没写结束的，只算开头之后连着的几句台词、心声）。
 *   导演在这一段里写了 mode（当成回忆段落演）的不动。
 * - 声音写成「回忆里的声音」的句子：脑海里响起的、以前听过的话。
 * units 是这一轮全部的单元（含 skip 的舞台指示）。
 */
export function markRecalls(script, units) {
  if (!script?.lines || !units?.length) return script
  const skip = new Set(script.skip || [])
  const spans = []
  let open = null
  for (const u of units) {
    const note = STAGE_NOTE.exec(String(u.text || '').trim())?.[1] || ''
    const ends = FLASHBACK_END.test(note)
    if (ends || FLASHBACK_START.test(note)) {
      if (open) { open.closed = ends; spans.push(open); open = null }
      if (!ends) open = { ids: [], closed: false }
      continue
    }
    if (open && !skip.has(u.id)) open.ids.push({ id: u.id, type: script.lines[u.id]?.type || u.type })
  }
  if (open) spans.push(open)
  const want = new Set()
  for (const span of spans) {
    const cut = span.ids.findIndex(x => x.type === 'narration')
    const ids = span.closed ? span.ids : span.ids.slice(0, Math.min(cut < 0 ? span.ids.length : cut, OPEN_FLASHBACK_MAX))
    if (ids.some(x => script.lines[x.id]?.mode)) continue
    for (const x of ids) want.add(x.id)
  }
  for (const [id, line] of Object.entries(script.lines)) if (line?.voice === 'memory' && !line.mode) want.add(id)
  const add = [...want].filter(id => !script.lines[id]?.recall)
  if (!add.length) return script
  const lines = { ...script.lines }
  for (const id of add) lines[id] = { ...(lines[id] || {}), recall: true }
  return { ...script, lines }
}

/**
 * 亲密场面（scene.eros 开着）的区间，按 walkScenes 走出来的每一句：[[第一句, 最后一句]]（下标）。
 * 写 none、换了地方、这一轮结束时收起（跟剧场的节奏底一样）。
 */
export function intimateRuns(steps) {
  const runs = []
  steps.forEach((step, i) => {
    if (!step?.scene?.eros || step.scene.eros === 'none') return
    const last = runs[runs.length - 1]
    if (last && last[1] === i - 1) last[1] = i
    else runs.push([i, i])
  })
  return runs
}

/**
 * 亲密场面由插画来演，不回到立绘站着说话：在这段里出来的插画（和这段开始时还显示着的）都显示到这段的最后一句，
 * 中途换动作、换体位、换节奏都不收；同一段有几张时后出来的盖住先出来的，一张接一张。
 * spans：[{ at, end, pinned? }]（显示的第一句、最后一句的下标；pinned 是玩家自己定了显示到哪一句的，不动），原地改 end。
 * 导演整理（director.js）和剧场（playback.js）共用。
 */
export function holdIntimateCgs(spans, runs) {
  for (const [from, to] of runs) {
    for (const span of spans) if (!span.pinned && span.at <= to && span.end >= from && span.end < to) span.end = to
  }
  return spans
}

export function recallRuns(script, units) {
  const lines = units.map(u => script?.lines?.[u.id] || {})
  const out = lines.map(() => null)
  for (let i = 0; i < lines.length;) {
    if (!lines[i].recall) { i++; continue }
    const run = { who: [], then: {}, tone: '', emos: [] }
    for (; i < lines.length && lines[i].recall; i++) {
      for (const name of speakersOf(lines[i].sp)) if (name !== '我' && !run.who.includes(name)) run.who.push(name)
      run.then = addThen(run.then, lines[i].then)
      if (!run.tone && RECALL_TONES.includes(lines[i].recall)) run.tone = lines[i].recall
      if (lines[i].emo) run.emos.push(lines[i].emo)
      out[i] = run
    }
  }
  return out
}

// 导演没写基调时按闪回里的情绪挑（每种情绪算哪种在情绪库里能改，默认见 vocab.js 的 EMOTION_RECALL；几种不一样时不安 > 伤感 > 甜蜜 > …），
// 情绪看不出来再按那一刻的场景基调；都不像就是温暖的怀念。
const TONE_BY_MOOD = { tense: 'dread', eerie: 'dread', mystery: 'dread', battle: 'dread', sad: 'sad', despair: 'sad', solemn: 'sad', sweet: 'sweet' }

/** 短闪回的基调（导演没写时）：emos 是闪回里各句的情绪，mood 是闪回那一刻现实场景的基调，custom 是情绪库。 */
export function autoRecallTone(emos, mood, custom = []) {
  const tones = new Set((emos || []).filter(Boolean).map(e => emotionRecall(e, custom)))
  return RECALL_PRIORITY.find(t => tones.has(t)) || TONE_BY_MOOD[mood] || 'warm'
}

/**
 * 每个要演的单元播放时所在的段落（{ mode, then, … }，不在段落里为 null）：立绘、插画按它取段落里的人「当时的样子」。
 * carry 是上一轮结束时还在的段落：这一轮第一句接着演同一种段落才留着。
 */
export function layersByUnit(script, units, carry = null) {
  const lines = units.map(u => script?.lines?.[u.id] || {})
  const keep = carry && lines.length && lines[0].mode === carry.mode ? carry : null
  return walkScenes({ scene: script?.scene, layer: keep }, lines).map(step => step.layer)
}
