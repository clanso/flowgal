// 把宿主给的视图（每轮的单元 + 导演脚本 + 插画）摊平成一拍一拍的「演出节拍」。
// 导演还没整理完的轮次也能演：用切分时猜出的说话人，沿用上一轮的地点和站位（前台先文本）。
// 立绘按导演标的登场 / 退场逐句增减；插画从 after 那一句显示到 until 那一句（没写就到这一轮结束）。
// 场景逐句变：导演在某一句写的地点、时段、天气、光线、基调、画面效果从那一句起生效，特殊段落（回忆、梦境……）进出见 lib/scenes.js。
// 导演标了 skip 的单元（状态栏、网页外壳、作者的话……）不演；导演改判了类型的单元按改判后的演。
import { placeKey, speakersOf, MODE_NAMES, RECALL_TONES, RECALL_TONE_NAMES, cgIn, cgOut, cgMotion } from '../../../lib/vocab.js'
import { stageWalk, playedUnits } from '../../../lib/staging.js'
import { walkScenes, recallRuns, markRecalls, autoRecallTone, SCENE_DEFAULTS, MODE_TRANSITION } from '../../../lib/scenes.js'
import { sizeFor } from '../../../lib/image/style.js'
import { shiftsAhead } from '../../../lib/look.js'

export { placeKey }
export { emotionLabel } from '../../../lib/emotions.js'

export const TIME_LABEL = { dawn: '黎明', morning: '清晨', noon: '正午', afternoon: '午后', dusk: '黄昏', evening: '傍晚', night: '夜', midnight: '深夜' }
export const WEATHER_LABEL = { clear: '晴', rain: '雨', storm: '暴雨', snow: '雪', blizzard: '暴风雪', wind: '狂风', sakura: '樱吹雪', leaves: '落叶', fireflies: '萤火', fog: '雾', embers: '余烬', dust: '浮尘', bokeh: '光斑', stars: '星空', sparkles: '光点', bubbles: '气泡' }
export const MOOD_LABEL = { daily: '日常', cheerful: '轻快', comic: '滑稽', sweet: '甜蜜', touching: '感动', calm: '静谧', solemn: '庄严', sad: '感伤', despair: '绝望', tense: '紧张', mystery: '悬疑', eerie: '诡异', battle: '激战', heroic: '热血', silence: '寂静' }
export const LIGHT_LABEL = { normal: '', dim: '昏暗', dark: '熄灯', black: '漆黑', candle: '烛光', spot: '聚光', neon: '霓虹', screen: '屏幕光', alarm: '警报红光', moon: '月光', warm: '暖光', cold: '冷光', glare: '强光', flicker: '灯光闪烁' }
export const FX_LABEL = { none: '', sway: '摇晃', ride: '颠簸', handheld: '手持', drift: '推近', woozy: '晕眩', heat: '热浪', underwater: '水下', rumble: '震动', speed: '疾驰', heartbeat: '心跳', slowmo: '慢动作', timestop: '时间停止' }
export const MODE_LABEL = { ...MODE_NAMES, real: '回到现实' }
export { RECALL_TONES, RECALL_TONE_NAMES as RECALL_TONE_LABEL }
export const CUT_LABEL = { time: 'Time Skip', date: 'Date', chapter: 'Chapter', meanwhile: 'Meanwhile' }
export const VOICE_LABEL = { phone: '电话', radio: '广播', telepathy: '心灵感应', chorus: '齐声', offscreen: '画外音', echo: '回声', memory: '回忆', machine: '机械音' }
export const CG_IN_LABEL = { dissolve: '溶入', slow: '慢慢溶入', black: '暗场后浮现', flash: '白闪', focus: '由虚到实', cut: '直接切入', impact: '冲击' }
export const CG_OUT_LABEL = { dissolve: '溶回场景', slow: '慢慢淡去', black: '暗下去', flash: '白闪', cut: '直接切掉' }
export const CG_MOTION_LABEL = { still: '静止', push: '极慢推近', pan: '横移一遍' }
export const CARD_LABEL = { sms: '短信', letter: '信', note: '便条', news: '报纸', terminal: '终端', notice: '告示', diary: '日记', scroll: '卷轴' }
export const POS_LABEL = { farleft: '最左', left: '左', center: '中', right: '右', farright: '最右' }
export const CAMERA_LABEL = { shake: '震动', zoom: '推近', zoomout: '拉远', flash: '闪白', pan: '平移', blur: '虚焦', fadeblack: '黑场', redflash: '红闪', tilt: '倾斜' }
export const SYMBOL_LABEL = { heart: '爱心', anger: '怒筋', sweat: '汗滴', sparkle: '闪光', surprise: '惊叹', gloom: '阴云', note: '音符', zzz: '睡着', bulb: '灵光', heartbreak: '心碎', sigh: '叹气', dizzy: '眩晕', fire: '燃起', blush: '红晕', bloom: '开花', silence: '无语' }
export const TRANSITION_LABEL = { dissolve: '溶解', fade: '慢慢变化', cinematic: '电影黑边', wipe: '横扫', iris: '圆形收缩', strips: '百叶', black: '黑场', flash: '白闪', blink: '闭眼睁眼', glitch: '画面撕裂', swirl: '旋转入梦', haze: '起雾', none: '直接切' }
const POS_X = { farleft: 14, left: 28, center: 50, right: 72, farright: 86 }

const EMPTY_SCENE = { ...SCENE_DEFAULTS, transition: 'dissolve' }

function imageReady(img) { return img && img.current >= 0 && img.versions && img.versions[img.current] }

/**
 * @returns {{ beats: Beat[], byKey: Map<string, number> }}
 */
export function buildBeats(view) {
  const beats = []
  if (!view) return { beats, byKey: new Map() }
  let scene = EMPTY_SCENE // 现实里的场景：这一轮开场时的样子；导演还没整理的轮次沿用上一轮结束时的
  let layer = null // 上一轮结束时还在的特殊段落：这一轮第一句接着演同一种段落才留着
  let cast = [] // 上一轮结束时在场的人：导演还没整理的轮次沿用
  let inside = null // 上一轮结束时还在段落里的话，段落里在场的人：这一轮接着演同一种段落时接着是他们
  const emotions = {}
  const turns = view.turns || []
  const images = view.images || []
  let bgm = '' // 当前在放的曲子（导演选的编号 / none）；没整理的轮次沿用上一轮
  let amb = '' // 当前的环境音，同上
  let shown = null // 上一拍画面上的场景和段落：判断新一轮开场要不要转场
  const active = new Map() // 每个人最近一次说话、登场是第几拍：台上人太多时，最久没动静的先下场
  let recalled = null // 上一拍所在的短闪回：进出闪回时白闪一下
  let set = 0 // 第几堂布景：换了地方、进出回忆这类段落时加一，台上的人跟着旧画面一起退、在新画面里重新登场，不从旧站位滑过去
  // 有立绘的人：导演漏列进 cast、却当面开口时让他上台（lib/staging.js 的 walkOn）
  const drawn = new Set((view.cast || []).filter(p => Object.values(p.sprites || {}).some(s => s && s.assetId)).map(p => p.name))
  const people = (view.cast || []).map(p => p.name)
  turns.forEach((t, ti) => {
    // 正文里框起来的闪回、回忆里的声音：导演没写 recall 也按短闪回演
    const script = markRecalls(t.script, t.units)
    if (script && script.scene && script.scene.bgm) bgm = script.scene.bgm
    if (script && script.scene && script.scene.amb) amb = script.scene.amb
    if (script) scene = { ...EMPTY_SCENE, ...script.scene }
    const all = t.units || []
    const units = playedUnits(all, script)
    const lines = units.map(u => (script && script.lines && script.lines[u.id]) || {})
    const keep = script && layer && lines.length && lines[0].mode === layer.mode ? layer : null
    const walk = stageWalk(script, units, cast, keep ? inside : null, { walkOn: drawn })
    const known = [...new Set([...((script && script.cast) || []).map(c => c.name), ...people])]
    const steps = walk.steps
    cast = walk.end
    inside = walk.inside
    const scenes = walkScenes({ scene, bgm, amb, layer: keep }, lines)
    const recalls = recallRuns(script, units)
    const ahead = shiftsAhead(lines) // 一轮中途变的样子：每一句还没发生的变化
    const unitIndex = new Map(units.map((u, i) => [u.id, i]))
    // 挂在不演的单元上的插画（导演整理前就有的、手动配的）：算到它前面最近一个要演的单元。
    const indexOf = id => {
      for (let i = all.findIndex(u => u.id === id); i >= 0; i--) if (unitIndex.has(all[i].id)) return unitIndex.get(all[i].id)
      return -1
    }
    const turnImages = images
      .filter(img => img.turn === t.turn && img.textVersion === t.textVersion && !img.retired)
      .map(img => {
        const at = img.after && all.some(u => u.id === img.after) ? Math.max(0, indexOf(img.after)) : units.length - 1
        const end = img.until && all.some(u => u.id === img.until) ? Math.max(at, indexOf(img.until)) : units.length - 1
        return { img, at, end }
      })
      .sort((a, b) => a.at - b.at)
    let lastSpeaker = ''
    let split = null // 分屏：电话另一头的人在画面一侧，写 off 或这一轮结束时收起
    units.forEach((unit, ui) => {
      const line = lines[ui]
      const at = scenes[ui]
      let speaker = ''
      const type = line.type || unit.type
      // 导演只给换人那一句写说话人：同一人连续说话沿用上一位。旁白写了 sp 表示描写的是谁（立绘高亮、换表情，不显示名牌）。
      if (type === 'dialogue') { speaker = line.sp || (line.type ? '' : hintedSpeaker(unit.hint, known, lastSpeaker)) || lastSpeaker; lastSpeaker = speaker }
      else if (type === 'thought') speaker = line.sp || '我'
      else if (line.sp) speaker = line.sp
      const speakers = speakersOf(speaker)
      if (line.emo) for (const name of speakers) emotions[name] = line.emo
      if (line.split === 'off') split = null
      else if (line.split) split = line.split
      // 同时有几张在显示时，后出现的盖住先出现的。
      const cgEntry = [...turnImages].reverse().find(e => e.at <= ui && ui <= e.end)
      const cg = cgEntry ? cgEntry.img : null
      // 新一轮的第一句：跟上一拍画面上的地方、段落比，换了才转场、出地点标题；之后每句看导演写的变化。
      let enter = at.moved
      let transition = at.transition
      if (ui === 0) {
        const opened = !shown || placeKey(at.scene) !== placeKey(shown.scene) || at.scene.bg !== shown.scene.bg || at.mode !== shown.mode
        enter = !shown || at.scene.location !== shown.scene.location || at.mode !== shown.mode
        const opening = scene.transition && scene.transition !== 'none' ? scene.transition : 'dissolve'
        transition = !opened ? '' : at.transition || (at.mode && (!shown || at.mode !== shown.mode) ? MODE_TRANSITION[at.mode] : enter ? opening : 'fade')
      }
      shown = at
      if (enter) set += 1
      for (const name of [...speakers, ...steps[ui].entered]) active.set(name, beats.length)
      const recall = recalls[ui]
      // 导演没写基调的闪回：进闪回那一句按闪回里的情绪（自定义情绪看它的基础情绪）和这一刻的场景基调挑
      if (recall && !recall.tone) recall.tone = autoRecallTone(recall.emos.map(e => ((view.emotions || []).find(x => x.id === e) || {}).base || e), at.scene.mood)
      // 短闪回里开口的人用回忆里的声音（老脚本写的是回声，一并换掉）
      const voice = recall && type !== 'narration' && (!line.voice || line.voice === 'echo') ? 'memory' : line.voice
      const recallEdge = recall === recalled ? '' : recall ? 'in' : 'out'
      recalled = recall
      beats.push({
        key: `${t.turn}:${unit.id}`,
        turn: t.turn,
        textVersion: t.textVersion,
        unitId: unit.id,
        type,
        text: unit.text,
        ...(unit.orig ? { orig: unit.orig } : {}), // 双语对照的原文（剧场上方小字）
        speaker,
        ...(speakers.length > 1 ? { speakers } : {}), // 齐声：几个人一起高亮
        ...(voice ? { voice } : {}), // 声音的样子：电话里、广播、心灵感应……
        ...(split ? { split } : {}),
        alias: line.as || '',
        emo: line.emo || '',
        sym: line.sym || '',
        cam: line.cam || '',
        say: line.say || '',
        stress: line.stress || '',
        card: line.card || '',
        scene: at.scene,
        mode: at.mode,
        ...(at.layer && at.layer.then ? { then: at.layer.then } : {}), // 段落里的人当时的样子（回忆里还没受伤、穿着当时的衣服……）
        ...(ahead[ui] ? { ahead: ahead[ui] } : {}), // 这一轮后面才变的样子（之后才缠上发带、才换衣服）：这一拍按变化之前的
        ...(at.cut ? { cut: at.cut } : {}),
        ...(recall ? { recall } : {}), // 短闪回：现在的画面压暗，这一段开口的人以当时的样子浮在前面
        ...(recallEdge ? { recallEdge } : {}),
        bgm: at.bgm,
        amb: at.amb,
        sfx: line.sfx || '',
        ...(line.pause ? { pause: line.pause } : {}), // 「間」：这句的字出来之前先停一下
        sceneEnter: enter,
        set,
        transition,
        cast: steps[ui].cast,
        recent: steps[ui].cast.map(c => c.name).sort((a, b) => (active.get(b) ?? -1) - (active.get(a) ?? -1)), // 台上的人，最近有动静的在前
        entered: steps[ui].entered,
        left: steps[ui].left,
        emotions: { ...emotions },
        cg,
        cgAnchor: Boolean(cgEntry && cgEntry.at === ui),
        directed: Boolean(script),
        status: t.status,
        error: t.error,
        lastOfTurn: ui === units.length - 1,
        lastTurn: ti === turns.length - 1,
        choices: ti === turns.length - 1 && ui === units.length - 1 && script ? script.choices || [] : [],
      })
    })
    // 一轮结束：现实里的场景、配乐接着往下一轮带；还在段落里的先记着，下一轮第一句接着演同一种段落才留着。
    const last = scenes[scenes.length - 1]
    if (last) { scene = { ...last.real.scene, transition: 'dissolve' }; bgm = last.real.bgm; amb = last.real.amb; layer = last.layer }
    else layer = null
  })
  return { beats, byKey: new Map(beats.map((b, i) => [b.key, i])) }
}

export function actorX(pos) { return POS_X[pos] ?? 50 }

/**
 * 切分时从引号前后猜的说话人（弱提示，导演没给这句写 sp 时才用）：认得的名字照用；
 * 「宋棠打断她，」这样连动作一起截进来的，取开头那个认得的名字；认不出、又不像名字（超过四个字，比如「秦语气没什么起伏」）的，当作上一位接着说。
 */
export function hintedSpeaker(hint, known, last) {
  if (!hint) return ''
  if (known.includes(hint)) return hint
  const head = known.filter(name => name && hint.startsWith(name)).sort((a, b) => b.length - a.length)[0]
  if (head) return head
  return [...hint].length > 4 ? last || '' : hint
}

/** 同屏最多站几个人：超出的，最久没说话、没登场的先下场（还算在场，轮到他说话就回来）。临时上台说一两句的（extra）不算在内。max 为 0 不限。 */
export function onStage(cast, recent, max) {
  const main = cast.filter(c => !c.extra)
  if (!max || main.length <= max) return cast
  const keep = new Set((recent || []).filter(name => main.some(c => c.name === name)).concat(main.map(c => c.name)).slice(0, max))
  return cast.filter(c => c.extra || keep.has(c.name))
}

// 两个人以上时从中间往两边排开的半宽（舞台宽度的百分比），以及人多时立绘缩小的比例（像站远了一点）。
const SPREAD = [0, 0, 20, 30, 36, 38]
const SHRINK = [1, 1, 1, 1, 0.92, 0.84, 0.76, 0.7, 0.64]

/** 站位：一个人照导演写的站；两个人以上按站位从左到右均匀排开，人越多立绘越小，不挤成一团。返回带 x（百分比）和 scale 的条目。 */
export function stageLayout(cast) {
  const n = cast.length
  if (n <= 1) return cast.map(c => ({ ...c, x: actorX(c.pos), scale: 1 }))
  const half = SPREAD[Math.min(n, SPREAD.length - 1)]
  const scale = SHRINK[Math.min(n, SHRINK.length - 1)]
  const order = cast.map((c, i) => ({ name: c.name, x: actorX(c.pos), i })).sort((a, b) => a.x - b.x || a.i - b.i).map(c => c.name)
  return cast.map(c => ({ ...c, x: Math.round((50 - half + (2 * half * order.indexOf(c.name)) / (n - 1)) * 10) / 10, scale }))
}

/** 舞台的宽高比：默认跟横版插画一样（NovelAI 常用的 1216×832），插画正好铺满；也可以选 16:9。 */
export function stageRatio(cfg) {
  if (cfg && cfg.ui && cfg.ui.ratio === 'wide') return 16 / 9
  const { width, height } = sizeFor(cfg, 'landscape')
  const ratio = width / height
  return ratio >= 1 && ratio <= 2.5 ? ratio : 16 / 9
}

export function cgSrc(img, assetUrl) {
  return imageReady(img) ? assetUrl(img.versions[img.current].assetId) : ''
}

// ───────────── 插画 ─────────────
/**
 * 插画怎么出现、收起，演多久（毫秒）。照 galgame 的做法，默认就是溶入、溶回场景；
 * 导演没写时快慢跟着这一刻的基调走：感伤、感动、静谧这类余韵长的慢一点，滑稽、轻快、激战快一点。
 * 老存档里的花哨写法（光扫、照片落下、碎裂……）按 lib/vocab.js 换成最接近的一种。样式在 theater.css，时长要对上。
 */
export const CG_IN_MS = { dissolve: 800, quick: 400, slow: 1500, black: 1800, flash: 600, focus: 1500, cut: 0, impact: 600 }
export const CG_OUT_MS = { dissolve: 800, quick: 400, slow: 1500, black: 1500, flash: 600, cut: 0 }
const SLOW_MOODS = new Set(['sad', 'touching', 'calm', 'solemn', 'despair', 'silence'])
const QUICK_MOODS = new Set(['comic', 'cheerful', 'battle'])
const paced = mood => (SLOW_MOODS.has(mood) ? 'slow' : QUICK_MOODS.has(mood) ? 'quick' : 'dissolve')
export const cgEntrance = (img, mood) => cgIn(img && img.enter) || paced(mood)
export const cgExit = (img, mood) => cgOut(img && img.leave) || paced(mood)
export const cgStay = img => cgMotion(img && img.motion) || 'still'
/**
 * 这张插画出现时对话框让开多久（毫秒）：像 galgame 那样先藏起对话框，画面出来了就接着念——
 * 原版脚本里插画出来后几乎从不另加等待，转场本身就是那一拍；这里只多留一点让对话框淡回来。
 */
const CG_BEAT_MS = 150
export function cgHoldMs(img, mood) {
  return CG_IN_MS[cgEntrance(img, mood)] + CG_BEAT_MS
}

// ───────────── 「間」：字出来之前先停一下 ─────────────
/** 转场演多久（毫秒），样式在 Stage.jsx 的 TRANSITION / theater.css，时长要对上。 */
export const TRANSITION_MS = { dissolve: 1100, fade: 2600, cinematic: 1500, wipe: 1000, iris: 1200, strips: 800, black: 1800, flash: 1000, blink: 1500, glitch: 700, swirl: 1900, haze: 2600, wake: 1900, none: 0 }
/** 导演写的停顿：beat 顿一拍（对话框留着，先不出字），silence 沉默（对话框让开，只剩画面和环境声）。 */
export const PAUSE_MS = { beat: 900, silence: 2400 }
/** 换了地方：转场演完再停这么久才出字。 */
const SCENE_BEAT_MS = 300
/**
 * 从回忆里醒过来（上一拍还在回忆里，这一拍回到了别处）：回忆的画面先慢慢褪白、配乐停下，
 * 白到最浓时（WAKE_SWAP_MS）才换成现在的画面，再从白里慢慢清晰过来，WAKE_MS 时对话框回来出字。样式在 theater.css 的 .fg-flash.is-wake。
 */
export const WAKE_SWAP_MS = 1700
export const WAKE_MS = 3600
// 导演挑了别的出法（直接切断、白闪、画面撕裂、闭眼……）的照导演的，只有慢慢化开的这几种换成醒过来
const WAKE_FROM = new Set(['haze', 'dissolve', 'fade'])

/**
 * 这一拍的字出来之前停多久、对话框要不要先让开：{ ms, away }。
 * - 插画这一句才出现：对话框让开，出现的过程 + 一拍（cgHoldMs）；
 * - 换了地方（转场不是直接切）：对话框让开，转场 + 一拍。进出回忆这类特殊段落不在这里算；
 * - 导演写了 pause：beat 顿一拍，silence 让开对话框沉默一会儿；
 * - 从回忆里醒过来（导演没挑别的出法时）：对话框让开，等回忆褪白、现在的画面清晰过来（WAKE_MS），这时多一个 wake: true。
 * 几样同时有取最长的。有过场字卡的那一句字卡本身就是停顿，插画、换场和醒过来都不再另停。
 * cg：这一拍画面上的插画（还没画好为空）；was：上一拍画面上的 { cg, place, mode }（刚打开剧场时为空）。
 */
export function beatHold(beat, { cg = '', was = {} } = {}) {
  let ms = 0, away = false
  if (cg && cg !== was.cg && !beat.cut) { ms = Math.max(ms, cgHoldMs(beat.cg, beat.scene.mood)); away = true }
  const sameLayer = (beat.mode || '') === (was.mode || '')
  const moved = beat.sceneEnter && beat.scene.location !== was.place && sameLayer
  if (moved && !beat.cut && TRANSITION_MS[beat.transition]) { ms = Math.max(ms, TRANSITION_MS[beat.transition] + SCENE_BEAT_MS); away = true }
  if (PAUSE_MS[beat.pause]) { ms = Math.max(ms, PAUSE_MS[beat.pause]); if (beat.pause === 'silence') away = true }
  const wake = was.mode === 'memory' && (beat.mode || '') !== 'memory' && !beat.cut && WAKE_FROM.has(beat.transition)
  if (wake) { ms = Math.max(ms, WAKE_MS); away = true }
  return { ms, away, ...(wake ? { wake } : {}) }
}

// ───────────── 我的配乐 ─────────────
/**
 * 这一拍该放的曲子。导演选过（beat.bgm 是编号或 none）就照办；还没整理到的轮次按描述粗配：
 * 曲名、描述、标签里出现场景的情绪、时段、天气、地点词越多越优先，同分按地点 + 情绪散列，换场才换歌。
 */
export function pickTrack(beat, tracks, urlOf) {
  if (!beat || !tracks || !tracks.length || beat.bgm === 'none') return null
  const asTrack = t => ({ id: t.id, name: t.name, url: urlOf(t.assetId) })
  const chosen = beat.bgm && tracks.find(t => t.id === beat.bgm)
  if (chosen) return asTrack(chosen)
  const scene = beat.scene || {}
  if (scene.mood === 'silence') return null
  const loc = String(scene.location || '')
  const words = [MOOD_LABEL[scene.mood], TIME_LABEL[scene.time], WEATHER_LABEL[scene.weather], scene.mood, ...loc.match(/[\u4e00-\u9fff]{2}|[a-z]{3,}/gi) || []].filter(Boolean)
  const score = t => { const text = `${t.name} ${t.description} ${(t.tags || []).join(' ')}`; return words.filter(w => text.includes(w)).length }
  const best = Math.max(...tracks.map(score))
  const pool = tracks.filter(t => score(t) === best)
  let h = 0
  for (const ch of loc + (scene.mood || '')) h = (h * 33 + ch.codePointAt(0)) >>> 0
  return asTrack(pool[h % pool.length])
}

/** 程序化天空：没有背景图时用时段渐变撑场面。 */
export const SKY = {
  dawn: ['#2a2350', '#9a5c8f', '#f6a58f', 'rgba(255, 190, 170, .7)', '70%', '62%'],
  morning: ['#5aa6e8', '#a9d3f5', '#f4f1e2', 'rgba(255, 250, 220, .6)', '78%', '20%'],
  noon: ['#3e8fe0', '#8cc5f2', '#dff0ff', 'rgba(255, 255, 240, .55)', '60%', '12%'],
  afternoon: ['#4c8fd6', '#a7c9ec', '#fbe3c0', 'rgba(255, 230, 190, .6)', '75%', '30%'],
  dusk: ['#2b1d4f', '#b14f6e', '#ffb067', 'rgba(255, 170, 100, .85)', '72%', '64%'],
  evening: ['#1b1740', '#4f2f78', '#e17a8d', 'rgba(255, 140, 160, .5)', '20%', '70%'],
  night: ['#05081c', '#121a44', '#2a2d6a', 'rgba(200, 210, 255, .35)', '78%', '18%'],
  midnight: ['#020410', '#070b24', '#141842', 'rgba(170, 180, 255, .25)', '80%', '14%'],
}
