// 把宿主给的视图（每轮的单元 + 导演脚本 + 插画）摊平成一拍一拍的「演出节拍」。
// 导演还没整理完的轮次也能演：用切分时猜出的说话人，沿用上一轮的地点和站位（前台先文本）。
// 立绘按导演标的登场 / 退场逐句增减；插画从 after 那一句显示到 until 那一句（没写就到这一轮结束）。
// 导演标了 skip 的单元（状态栏、网页外壳、作者的话……）不演；导演改判了类型的单元按改判后的演。
import { placeKey } from '../../../lib/vocab.js'
import { stageSteps, playedUnits } from '../../../lib/staging.js'
import { sizeFor } from '../../../lib/image/style.js'

export { placeKey }
export { emotionLabel } from '../../../lib/emotions.js'

export const TIME_LABEL = { dawn: '黎明', morning: '清晨', noon: '正午', afternoon: '午后', dusk: '黄昏', evening: '傍晚', night: '夜', midnight: '深夜' }
export const WEATHER_LABEL = { clear: '晴', rain: '雨', storm: '暴雨', snow: '雪', sakura: '樱吹雪', leaves: '落叶', fireflies: '萤火', fog: '雾', embers: '余烬', dust: '浮尘', bokeh: '光斑', stars: '星空' }
export const MOOD_LABEL = { daily: '日常', cheerful: '轻快', sweet: '甜蜜', calm: '静谧', sad: '感伤', tense: '紧张', battle: '激战', eerie: '诡异', silence: '寂静' }
export const CARD_LABEL = { sms: '短信', letter: '信', note: '便条', news: '报纸', terminal: '终端', notice: '告示', diary: '日记', scroll: '卷轴' }
export const POS_LABEL = { farleft: '最左', left: '左', center: '中', right: '右', farright: '最右' }
export const CAMERA_LABEL = { shake: '震动', zoom: '推近', zoomout: '拉远', flash: '闪白', pan: '平移', blur: '虚焦', fadeblack: '黑场', redflash: '红闪', tilt: '倾斜' }
export const SYMBOL_LABEL = { heart: '爱心', anger: '怒筋', sweat: '汗滴', sparkle: '闪光', surprise: '惊叹', gloom: '阴云', note: '音符', zzz: '睡着', bulb: '灵光', heartbreak: '心碎', sigh: '叹气', dizzy: '眩晕', fire: '燃起', blush: '红晕', bloom: '开花', silence: '无语' }
export const TRANSITION_LABEL = { dissolve: '溶解', cinematic: '电影黑边', wipe: '横扫', iris: '圆形收缩', strips: '百叶', black: '黑场', flash: '白闪', none: '直接切' }
const POS_X = { farleft: 14, left: 28, center: 50, right: 72, farright: 86 }

const EMPTY_SCENE = { location: '', time: 'afternoon', weather: 'clear', mood: 'daily', transition: 'dissolve', bg: '' }

function imageReady(img) { return img && img.current >= 0 && img.versions && img.versions[img.current] }

/**
 * @returns {{ beats: Beat[], byKey: Map<string, number> }}
 */
export function buildBeats(view) {
  const beats = []
  if (!view) return { beats, byKey: new Map() }
  let scene = EMPTY_SCENE
  let cast = [] // 上一轮结束时在场的人：导演还没整理的轮次沿用
  const emotions = {}
  const turns = view.turns || []
  const images = view.images || []
  let bgm = '' // 当前在放的曲子（导演选的编号 / none）；没整理的轮次沿用上一轮
  turns.forEach((t, ti) => {
    const script = t.script
    if (script && script.scene && script.scene.bgm) bgm = script.scene.bgm
    const prevKey = placeKey(scene)
    if (script) scene = { ...EMPTY_SCENE, ...script.scene }
    const changed = beats.length === 0 || placeKey(scene) !== prevKey
    const all = t.units || []
    const units = playedUnits(all, script)
    const steps = stageSteps(script, units, cast)
    if (steps.length) cast = steps[steps.length - 1].cast
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
    units.forEach((unit, ui) => {
      const line = (script && script.lines && script.lines[unit.id]) || {}
      if (line.bgm) bgm = line.bgm
      let speaker = ''
      const type = line.type || unit.type
      // 导演只给换人那一句写说话人：同一人连续说话沿用上一位。旁白写了 sp 表示描写的是谁（立绘高亮、换表情，不显示名牌）。
      if (type === 'dialogue') { speaker = line.sp || (line.type ? '' : unit.hint) || lastSpeaker; lastSpeaker = speaker }
      else if (type === 'thought') speaker = line.sp || '我'
      else if (line.sp) speaker = line.sp
      if (speaker && line.emo) emotions[speaker] = line.emo
      // 同时有几张在显示时，后出现的盖住先出现的。
      const cgEntry = [...turnImages].reverse().find(e => e.at <= ui && ui <= e.end)
      const cg = cgEntry ? cgEntry.img : null
      beats.push({
        key: `${t.turn}:${unit.id}`,
        turn: t.turn,
        textVersion: t.textVersion,
        unitId: unit.id,
        type,
        text: unit.text,
        speaker,
        alias: line.as || '',
        emo: line.emo || '',
        sym: line.sym || '',
        cam: line.cam || '',
        say: line.say || '',
        stress: line.stress || '',
        card: line.card || '',
        scene,
        bgm,
        sceneEnter: ui === 0 && changed,
        transition: ui === 0 && changed ? scene.transition || 'dissolve' : 'none',
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
