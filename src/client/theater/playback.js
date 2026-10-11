// 把宿主给的视图（每轮的单元 + 导演脚本 + 插画）摊平成一拍一拍的「演出节拍」。
// 导演还没整理完的轮次也能演：用切分时猜出的说话人，沿用上一轮的地点和站位（前台先文本）。
// 立绘按导演标的登场 / 退场逐句增减；插画从 after 那一句显示到 until 那一句（没写就到这一轮结束）。
// 场景逐句变：导演在某一句写的地点、时段、天气、光线、基调、画面效果从那一句起生效，特殊段落（回忆、梦境……）进出见 lib/scenes.js。
// 导演标了 skip 的单元（状态栏、网页外壳、作者的话……）不演；导演改判了类型的单元按改判后的演。
import { placeKey, speakersOf } from '../../../lib/vocab.js'
import { stageWalk, playedUnits } from '../../../lib/staging.js'
import { walkScenes, SCENE_DEFAULTS, MODE_TRANSITION } from '../../../lib/scenes.js'
import { sizeFor } from '../../../lib/image/style.js'

export { placeKey }
export { emotionLabel } from '../../../lib/emotions.js'

export const TIME_LABEL = { dawn: '黎明', morning: '清晨', noon: '正午', afternoon: '午后', dusk: '黄昏', evening: '傍晚', night: '夜', midnight: '深夜' }
export const WEATHER_LABEL = { clear: '晴', rain: '雨', storm: '暴雨', snow: '雪', blizzard: '暴风雪', wind: '狂风', sakura: '樱吹雪', leaves: '落叶', fireflies: '萤火', fog: '雾', embers: '余烬', dust: '浮尘', bokeh: '光斑', stars: '星空', sparkles: '光点', bubbles: '气泡' }
export const MOOD_LABEL = { daily: '日常', cheerful: '轻快', comic: '滑稽', sweet: '甜蜜', touching: '感动', calm: '静谧', solemn: '庄严', sad: '感伤', despair: '绝望', tense: '紧张', mystery: '悬疑', eerie: '诡异', battle: '激战', heroic: '热血', silence: '寂静' }
export const LIGHT_LABEL = { normal: '', dim: '昏暗', dark: '熄灯', black: '漆黑', candle: '烛光', spot: '聚光', neon: '霓虹', screen: '屏幕光', alarm: '警报红光', moon: '月光', warm: '暖光', cold: '冷光', glare: '强光', flicker: '灯光闪烁' }
export const FX_LABEL = { none: '', sway: '摇晃', ride: '颠簸', handheld: '手持', drift: '推近', woozy: '晕眩', heat: '热浪', underwater: '水下', rumble: '震动', speed: '疾驰', heartbeat: '心跳', slowmo: '慢动作', timestop: '时间停止' }
export const MODE_LABEL = { memory: '回忆', dream: '梦境', illusion: '幻觉', imagine: '想象', pov: '主观视角', inner: '内心世界', screen: '画面中', tale: '故事中', vision: '预见', digital: '虚拟世界', real: '回到现实' }
export const CUT_LABEL = { time: 'Time Skip', date: 'Date', chapter: 'Chapter', meanwhile: 'Meanwhile' }
export const VOICE_LABEL = { phone: '电话', radio: '广播', telepathy: '心灵感应', chorus: '齐声', offscreen: '画外音', echo: '回声', machine: '机械音' }
export const CG_IN_LABEL = { sweep: '光扫入场', dissolve: '溶入', flash: '白闪', black: '从黑暗中浮现', zoom: '从局部拉开', focus: '失焦到对焦', slide: '滑入', iris: '圆形展开', glitch: '画面撕裂', photo: '照片落下', bloom: '柔光渐显', impact: '冲击' }
export const CG_OUT_LABEL = { fade: '淡出', dissolve: '溶回场景', flash: '白闪消失', black: '暗下去', blur: '模糊消散', slide: '滑出', shatter: '碎裂', glitch: '撕裂消失', pull: '拉远消失', cut: '直接切掉' }
export const CG_MOTION_LABEL = { drift: '缓慢推拉', still: '静止', push: '缓慢推近', pull: '缓慢拉远', pan: '横摇', shake: '持续震动', breathe: '轻轻起伏' }
export const CARD_LABEL = { sms: '短信', letter: '信', note: '便条', news: '报纸', terminal: '终端', notice: '告示', diary: '日记', scroll: '卷轴' }
export const POS_LABEL = { farleft: '最左', left: '左', center: '中', right: '右', farright: '最右' }
export const CAMERA_LABEL = { shake: '震动', zoom: '推近', zoomout: '拉远', flash: '闪白', pan: '平移', blur: '虚焦', fadeblack: '黑场', redflash: '红闪', tilt: '倾斜' }
export const SYMBOL_LABEL = { heart: '爱心', anger: '怒筋', sweat: '汗滴', sparkle: '闪光', surprise: '惊叹', gloom: '阴云', note: '音符', zzz: '睡着', bulb: '灵光', heartbreak: '心碎', sigh: '叹气', dizzy: '眩晕', fire: '燃起', blush: '红晕', bloom: '开花', silence: '无语' }
export const TRANSITION_LABEL = { dissolve: '溶解', fade: '慢慢变化', cinematic: '电影黑边', wipe: '横扫', iris: '圆形收缩', strips: '百叶', black: '黑场', flash: '白闪', blink: '闭眼睁眼', glitch: '画面撕裂', swirl: '旋转入梦', none: '直接切' }
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
  const emotions = {}
  const turns = view.turns || []
  const images = view.images || []
  let bgm = '' // 当前在放的曲子（导演选的编号 / none）；没整理的轮次沿用上一轮
  let amb = '' // 当前的环境音，同上
  let shown = null // 上一拍画面上的场景和段落：判断新一轮开场要不要转场
  turns.forEach((t, ti) => {
    const script = t.script
    if (script && script.scene && script.scene.bgm) bgm = script.scene.bgm
    if (script && script.scene && script.scene.amb) amb = script.scene.amb
    if (script) scene = { ...EMPTY_SCENE, ...script.scene }
    const all = t.units || []
    const units = playedUnits(all, script)
    const walk = stageWalk(script, units, cast)
    const steps = walk.steps
    cast = walk.end
    const lines = units.map(u => (script && script.lines && script.lines[u.id]) || {})
    const keep = script && layer && lines.length && lines[0].mode === layer.mode ? layer : null
    const scenes = walkScenes({ scene, bgm, amb, layer: keep }, lines)
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
      if (type === 'dialogue') { speaker = line.sp || (line.type ? '' : unit.hint) || lastSpeaker; lastSpeaker = speaker }
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
        ...(line.voice ? { voice: line.voice } : {}), // 声音的样子：电话里、广播、心灵感应……
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
        ...(at.cut ? { cut: at.cut } : {}),
        bgm: at.bgm,
        amb: at.amb,
        sfx: line.sfx || '',
        sceneEnter: enter,
        transition,
        cast: steps[ui].cast,
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
