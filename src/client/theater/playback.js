// 把宿主给的视图（每轮的单元 + 导演脚本 + 插画）摊平成一拍一拍的「演出节拍」。
// 导演还没整理完的轮次也能演：用切分时猜出的说话人，沿用上一轮的地点和站位（前台先文本）。
// 立绘按导演标的登场 / 退场逐句增减；插画从 after 那一句显示到 until 那一句（没写就到这一轮结束）。
// 场景逐句变：导演在某一句写的地点、时段、天气、光线、基调、画面效果从那一句起生效，特殊段落（回忆、梦境……）进出见 lib/scenes.js。
// 导演标了 skip 的单元（状态栏、网页外壳、作者的话……）不演；导演改判了类型的单元按改判后的演。
import { placeKey, speakersOf, MODE_NAMES, RECALL_TONES, RECALL_TONE_NAMES, cgIn, cgOut, cgMotion } from '../../../lib/vocab.js'
import { stageWalk, playedUnits } from '../../../lib/staging.js'
import { walkScenes, recallRuns, markRecalls, autoRecallTone, intimateRuns, holdIntimateCgs, SCENE_DEFAULTS, MODE_TRANSITION } from '../../../lib/scenes.js'
import { sizeFor } from '../../../lib/image/style.js'
import { shiftsAhead } from '../../../lib/look.js'
import { reactsOf, poseTracker, blockLayout } from '../../../lib/blocking.js'

export { placeKey, blockLayout }
import { emotionLabel as labelIn, resolveEmotion, standIns, isBuiltinEmotion } from '../../../lib/emotions.js'

// 剧场拿到的情绪库（所有对局共用）：内置情绪改过名的按新名字显示，并掉的显示并进去的那个。Theater 每次拿到视图时记一下。
let shownEmotions = []
export function showEmotions(lib) { if (lib) shownEmotions = lib }
/** 情绪显示的名字；不给情绪库就用剧场最近拿到的那份。 */
export const emotionLabel = (id, custom) => labelIn(id, custom || shownEmotions)
/** 一种情绪对应的内置情绪（内置的就是它自己；新情绪按替身那一串找第一个内置的）。 */
export const builtinOf = (emo, custom = []) => [resolveEmotion(emo, custom || []), ...standIns(emo, custom || [])].find(isBuiltinEmotion) || emo

export const TIME_LABEL = { dawn: '黎明', morning: '清晨', noon: '正午', afternoon: '午后', dusk: '黄昏', evening: '傍晚', night: '夜', midnight: '深夜' }
export const WEATHER_LABEL = { clear: '晴', rain: '雨', storm: '暴雨', snow: '雪', blizzard: '暴风雪', wind: '狂风', sakura: '樱吹雪', leaves: '落叶', fireflies: '萤火', fog: '雾', embers: '余烬', dust: '浮尘', bokeh: '光斑', stars: '星空', sparkles: '光点', bubbles: '气泡' }
export const MOOD_LABEL = { daily: '日常', cheerful: '轻快', comic: '滑稽', sweet: '甜蜜', touching: '感动', calm: '静谧', solemn: '庄严', sad: '感伤', despair: '绝望', tense: '紧张', mystery: '悬疑', eerie: '诡异', battle: '激战', heroic: '热血', silence: '寂静' }
export const LIGHT_LABEL = { normal: '', dim: '昏暗', dark: '熄灯', black: '漆黑', candle: '烛光', spot: '聚光', neon: '霓虹', screen: '屏幕光', alarm: '警报红光', moon: '月光', warm: '暖光', cold: '冷光', glare: '强光', flicker: '灯光闪烁', sunbeam: '窗光', leak: '漏光', flare: '逆光' }
export const FX_LABEL = { none: '', sway: '摇晃', ride: '颠簸', handheld: '手持', drift: '推近', woozy: '晕眩', heat: '热浪', underwater: '水下', rumble: '震动', speed: '疾驰', heartbeat: '心跳', slowmo: '慢动作', timestop: '时间停止', fading: '褪成回忆' }
export const MODE_LABEL = { ...MODE_NAMES, real: '回到现实' }
export { RECALL_TONES, RECALL_TONE_NAMES as RECALL_TONE_LABEL }
export const CUT_LABEL = { time: 'Time Skip', date: 'Date', chapter: 'Chapter', meanwhile: 'Meanwhile' }
export const VOICE_LABEL = { phone: '电话', radio: '广播', telepathy: '心灵感应', chorus: '齐声', offscreen: '画外音', echo: '回声', memory: '回忆', machine: '机械音' }
export const CG_IN_LABEL = { dissolve: '溶入', slow: '慢慢溶入', black: '暗场后浮现', flash: '白闪', focus: '由虚到实', cut: '直接切入', impact: '冲击' }
export const CG_OUT_LABEL = { dissolve: '溶回场景', slow: '慢慢淡去', black: '暗下去', flash: '白闪', cut: '直接切掉' }
export const CG_MOTION_LABEL = { still: '静止', push: '极慢推近', pan: '横移一遍' }
export const CARD_LABEL = { sms: '短信', letter: '信', note: '便条', news: '报纸', terminal: '终端', notice: '告示', diary: '日记', scroll: '卷轴' }
export const POS_LABEL = { farleft: '最左', left: '左', center: '中', right: '右', farright: '最右' }
export const CAMERA_LABEL = { shake: '震动', zoom: '推近', zoomout: '拉远', flash: '闪白', pan: '平移', blur: '虚焦', fadeblack: '黑场', redflash: '红闪', tilt: '倾斜', closeup: '特写', focus: '背景虚化', whip: '甩镜', sink: '下沉', rise: '升起', lowangle: '仰拍', dolly: '希区柯克变焦', empty: '空镜', slowpush: '缓推', rackfocus: '移焦' }
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
  const spoke = new Map() // 每个人最近一次开口（或旁白写到他、立绘高亮）是第几拍：说话的人站到最前，说完也留在前面
  let recalled = null // 上一拍所在的短闪回：进出闪回时白闪一下
  let call = null // 正在打的电话 { who, video, dir, id, live, unanswered }：跨轮带着，挂断、电话那头的人走进画面时收起
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
    // 上一轮没挂的电话：这一轮里还有电话那头的动静（手机、电话里的声音、分屏、对方开口）才接着通，接着通的就是已经接通了；不然当作挂了
    if (call && !(script && lines.some(l => l.phone || l.voice === 'phone' || l.split || (call.who && speakersOf(l.sp).includes(call.who))))) call = null
    if (call) call = { ...call, live: true, unanswered: false }
    const walk = stageWalk(script, units, cast, keep ? inside : null, { walkOn: drawn, calling: call ? call.who : '' })
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
        return { img, at, end, pinned: Boolean(img.untilByUser) }
      })
      .sort((a, b) => a.at - b.at)
    // 亲密场面由插画来演：这段里出来的插画一直显示到这段结束（导演整理时已经这样改了，这里让老脚本也一样；玩家在改词里定了显示到哪一句的照他的）
    holdIntimateCgs(turnImages, intimateRuns(scenes))
    let lastSpeaker = ''
    let hush = 0 // 配乐留白还剩几拍：写了换歌（写回原来的曲子也算）、换了地方、进出段落、过场字卡就提前回来；不跨轮
    let split = null // 分屏：电话另一头的人在画面一侧，写 off 或这一轮结束时收起
    const blocking = poseTracker() // 走位：每一轮、每换一堂布景从原位开始
    const exitWay = {} // 写了怎么走、还没走的人（告别那句说完下一拍才走）
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
      if (enter) { set += 1; blocking.newSet() }
      // 没在说话的人的反应：换表情（从这句起保持）、身子一动
      const onStageNames = steps[ui].cast.map(c => c.name)
      const reacts = reactsOf(line, onStageNames, speakers)
      for (const r of reacts) if (r.emo) emotions[r.name] = r.emo
      // 走位和进出的样子
      const ways = Object.fromEntries((line.enter || []).filter(e => e.how && steps[ui].entered.includes(e.name)).map(e => [e.name, e.how]))
      Object.assign(exitWay, line.exitHow || {})
      const gone = {}
      for (const name of steps[ui].left) if (exitWay[name]) { gone[name] = exitWay[name]; delete exitWay[name] }
      // 一次出手：被击倒的人倒在那里，到他自己开口（台词、心声；旁白写到他不算）、走位或被治疗为止
      const hit = line.hit || null
      const target = hit && hit.to && onStageNames.includes(hit.to) ? [hit.to] : []
      const block = blocking.step({ onStage: onStageNames, left: steps[ui].left, speakers: type === 'narration' ? [] : speakers, moves: line.move || [], peeks: Object.keys(ways).filter(name => ways[name] === 'peek'), downs: hit && hit.effect === 'down' ? target : [], heals: hit && hit.effect === 'heal' ? target : [] })
      for (const name of [...speakers, ...steps[ui].entered, ...reacts.map(r => r.name), ...block.moves.map(m => m.name), ...(hit ? [hit.from, hit.to].filter(n => n && onStageNames.includes(n)) : [])]) active.set(name, beats.length)
      for (const name of speakers) spoke.set(name, beats.length)
      const front = onStageNames.filter(name => spoke.has(name)).sort((a, b) => spoke.get(b) - spoke.get(a))
      const recall = recalls[ui]
      // 导演没写基调的闪回：进闪回那一句按闪回里的情绪（新情绪看它替身那一串里第一个内置情绪）和这一刻的场景基调挑
      if (recall && !recall.tone) recall.tone = autoRecallTone(recall.emos.map(e => builtinOf(e, view.emotions)), at.scene.mood)
      // 手机：打来、拨出的那一句响起；这一轮里接下来写的是没接通、被拒接，就一直响到那一句，不然下一句起就接通了，右上角挂着「通话中」
      const phone = line.phone || null
      if (call && call.who && steps[ui].entered.includes(call.who)) call = null // 电话那头的人走进了画面：不用再打了
      const before = call
      let phoneEdge = null
      if (phone && (phone.kind === 'call' || phone.kind === 'dial')) {
        const next = lines.slice(ui + 1).find(l => l.phone && ['call', 'dial', 'end'].includes(l.phone.kind))
        const unanswered = Boolean(next && next.phone.kind === 'end' && (next.phone.result === 'missed' || next.phone.result === 'declined'))
        call = { who: phone.who || '', ...(phone.video ? { video: true } : {}), dir: phone.kind === 'call' ? 'in' : 'out', id: `${t.turn}:${unit.id}`, live: false, unanswered }
        phoneEdge = phone
      } else if (phone && phone.kind === 'end') {
        const was = call || {}
        if (call || phone.who) phoneEdge = { kind: 'end', who: phone.who || was.who || '', ...(was.id ? { id: was.id } : {}), ...(was.dir ? { dir: was.dir } : {}), ...(was.video ? { video: true } : {}), ...(was.live ? { live: true } : {}), ...(phone.result ? { result: phone.result } : {}) }
        call = null
      } else if (phone) phoneEdge = phone
      const calling = call ? { who: call.who, ...(call.video ? { video: true } : {}), dir: call.dir, id: call.id, state: call.live ? 'live' : 'ringing' } : null
      if (call && !call.unanswered) call.live = true
      // 通话里电话那头的人开口（人不在台上）：导演没写声音的样子也按电话里的声音演
      const caller = (before || calling || {}).who
      const onPhone = Boolean(caller) && type === 'dialogue' && speakers.includes(caller) && !onStageNames.includes(caller)
      // 短闪回里开口的人用回忆里的声音（老脚本写的是回声，一并换掉）
      const voice = recall && type !== 'narration' && (!line.voice || line.voice === 'echo') ? 'memory' : line.voice || (onPhone ? 'phone' : '')
      const recallEdge = recall === recalled ? '' : recall ? 'in' : 'out'
      recalled = recall
      if (hush && (line.bgm || at.moved || at.cut)) hush = 0
      if (line.bgm === 'hush') hush = HUSH_BEATS
      const hushed = hush ? (hush === HUSH_BEATS ? 'start' : 'on') : ''
      if (hush) hush--
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
        ...(line.camOn ? { camOn: line.camOn } : {}), // 镜头对准谁（不写是说话的人）
        ...(hit ? { hit } : {}), // 一次出手：被打的人一震
        ...(line.moment ? { moment: line.moment } : {}), // 小瞬间：拍照、摸头、干杯、约定……
        ...(calling ? { call: calling } : {}), // 正在打的电话：响着（ringing）还是接通了（live）
        ...(phoneEdge ? { phone: phoneEdge } : {}), // 手机这一句的事：来电、拨出、挂断、通知、语音留言
        say: line.say || '',
        stress: line.stress || '',
        ...(line.textfx ? { textfx: line.textfx } : {}), // 句中文字效果：某几个字发抖、放大、越说越小……
        card: line.card || '',
        scene: at.scene,
        mode: at.mode,
        ...(at.layer && at.layer.then ? { then: at.layer.then } : {}), // 段落里的人当时的样子（回忆里还没受伤、穿着当时的衣服……）
        ...(ahead[ui] ? { ahead: ahead[ui] } : {}), // 这一轮后面才变的样子（之后才缠上发带、才换衣服）：这一拍按变化之前的
        ...(at.cut ? { cut: at.cut } : {}),
        ...(recall ? { recall } : {}), // 短闪回：现在的画面压暗，这一段开口的人以当时的样子浮在前面
        ...(recallEdge ? { recallEdge } : {}),
        bgm: at.bgm,
        ...(hushed ? { hush: hushed } : {}), // 配乐留白：start 是停下的那一句，on 是还没回来
        amb: at.amb,
        sfx: line.sfx || '',
        ...(line.peak ? { peak: line.peak } : {}), // 高潮那一下：climax / cum / both（lib/eros.js）
        ...(line.pause ? { pause: line.pause } : {}), // 「間」：这句的字出来之前先停一下
        sceneEnter: enter,
        set,
        transition,
        cast: steps[ui].cast,
        recent: steps[ui].cast.map(c => c.name).sort((a, b) => (active.get(b) ?? -1) - (active.get(a) ?? -1)), // 台上的人，最近有动静的在前
        ...(front.length ? { front } : {}), // 台上开过口的人，最近开口的在前：谁挡在谁前面（lib/blocking.js 的 stackLayers）
        entered: steps[ui].entered,
        left: steps[ui].left,
        ...(reacts.length ? { reacts } : {}), // 没在说话的人的反应 [{ name, emo, sym }]
        ...(Object.keys(block.poses).length ? { poses: block.poses } : {}), // 走位：每个人现在的样子（靠近谁、上前、背对……）
        ...(block.moves.length ? { moves: block.moves } : {}), // 这一拍发生的走位
        ...(Object.keys(ways).length ? { enterHow: ways } : {}), // 跑进来、探头、慢慢走进来
        ...(Object.keys(gone).length ? { exitHow: gone } : {}), // 甩头离开、跑开、慢慢走远
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
    // 亲密场面的节奏底、触手只管这一轮（导演下一轮还在继续会再写），还没整理的下一轮先不带着
    if (last) { scene = { ...last.real.scene, eros: 'none', tentacle: 'none', transition: 'dissolve' }; bgm = last.real.bgm; amb = last.real.amb; layer = last.layer }
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
/** 出手时打中的那一刻（HIT_IMPACT_MS），字等打中之后再出。 */
export const HIT_IMPACT_MS = 420
export const HIT_LEAD_MS = 700
/** 小瞬间：拍照的白闪、烟花升空、卡片落下来之后字再出；摸头、戳脸、触碰、干杯跟着字一起演。 */
export const MOMENT_LEAD_MS = { photo: 650, fireworks: 900, cook: 450, nickname: 600, promise: 600, contact: 450 }
/** 手机：来电、拨出时手机先响一下（滑进来、响第一声）字再出；挂断、通知、留言不打断。 */
export const PHONE_LEAD_MS = { call: 1000, dial: 800 }
/**
 * 配乐留白（导演写 bgm: hush 的那一句）：配乐先淡出、静一下（HUSH_LEAD_MS）字再出，
 * 连这一句在内 HUSH_BEATS 拍里不放配乐，之后从停下的地方淡回来（淡出淡入的快慢在 audio.js）。
 */
export const HUSH_BEATS = 5
export const HUSH_LEAD_MS = 700
/** 高潮那一下（lib/eros.js 的 PEAKS）：白光先起来、射精的第一下脉动过去，字再出。 */
export const PEAK_LEAD_MS = { climax: 650, cum: 420, both: 650 }
/** 换场演完（新画面里的人上来之后）再停这么久才出字。 */
const SCENE_BEAT_MS = 300
/**
 * 从回忆里醒过来（上一拍还在回忆里，这一拍回到了别处）：回忆的画面先慢慢褪白、配乐停下，
 * 白到最浓时（WAKE_SWAP_MS）才换成现在的画面，再从白里慢慢清晰过来，WAKE_MS 时对话框回来出字。样式在 theater.css 的 .fg-flash.is-wake。
 */
export const WAKE_SWAP_MS = 1700
export const WAKE_MS = 3600
// 导演挑了别的出法（直接切断、白闪、画面撕裂、闭眼……）的照导演的，只有慢慢化开的这几种换成醒过来
const WAKE_FROM = new Set(['haze', 'dissolve', 'fade'])

// ───────────── 换场：像 galgame 那样一步一步换过去 ─────────────
/** 换场时台上的人先退下去、新画面出来后再上来（毫秒）。 */
export const SCENE_CLEAR_MS = 350
export const SCENE_CAST_MS = 450
/**
 * 会把画面整个盖住的转场：盖上去（up）、盖满停一下（hold）、揭开（down）。换场在盖满的那一刻才换，旧画面上不会先冒出新地方的人和标题。
 * clear：盖之前先清场（台上的人退下去）。白闪、闭眼、撕裂是一下子的事，人跟着画面一起换，不先退。
 */
export const COVERS = {
  black: { cover: 'black', clear: true, up: 700, hold: 400, down: 900 },
  flash: { cover: 'white', clear: false, up: 120, hold: 150, down: 650 },
  blink: { cover: 'lids', clear: false, up: 800, hold: 300, down: 1400 },
  glitch: { cover: 'glitch', clear: false, up: 300, hold: 0, down: 400 },
  swirl: { cover: 'swirl', clear: true, up: 900, hold: 200, down: 900 },
}
/** 过场字卡（三小时后、第二天……）：暗下去，字卡在黑里出来、停一会儿收起，再亮起新的画面。 */
const CUT_COVER = { cover: 'black', clear: true, up: 700, hold: 2300, down: 1000 }
/** 剧场刚打开（或从标题画面进来）：从黑里亮起来。 */
const OPEN_COVER = { cover: 'black', clear: true, up: 0, hold: 300, down: 1000 }
// 进出回忆的起雾、醒过来另有演法（beatHold 的 wake、Theater 的 HAZE_MS）
const OWN_WAY = new Set(['haze', 'wake'])

/**
 * 这一拍要不要演一次换场、怎么演：换了地方、进出特殊段落、有过场字卡、剧场刚打开。没有换场时为 null。
 * 时间线（毫秒，从这一拍开始算）：clear 清场 → up 盖上 → swap 换成新画面 → hold 盖满停一下 → down 揭开（没有盖的转场是新背景在旧背景上过渡）
 * → cast 新画面里的人上来、出地点标题 → 停一小拍 → 出字。整段对话框让开，点鼠标、按键不跳过，快进时不演。
 * 没有盖的转场（溶解、慢慢变化、横扫……）也先清场：旧背景上的人退下去，新背景过渡完，人再上来。
 * was：故事里上一拍的 { place, mode }（从 log 跳过来时也是故事里的上一拍，这一句的进场照样演）；opening：剧场刚打开、这是画面上的第一拍。
 * wake：从回忆里出来时演「醒过来」（设置的特效开关里关掉了就当普通的换场演）。
 * 返回 { tr, cover, clear, up, hold, down, steps: [[阶段, 开始的毫秒]...], swap 换画面的时刻, total, cut, opening }。
 */
export function changePlan(beat, was = {}, { opening = false, wake = true } = {}) {
  if (!beat || !beat.scene) return null
  const moved = !opening && beat.sceneEnter && (beat.scene.location !== was.place || (beat.mode || '') !== (was.mode || ''))
  const tr = beat.transition || ''
  if (!opening && !beat.cut && (!moved || tr === 'none' || OWN_WAY.has(tr))) return null
  if (wake && !opening && !beat.cut && was.mode === 'memory' && (beat.mode || '') !== 'memory' && WAKE_FROM.has(tr)) return null // 从回忆里醒过来
  if (opening && tr === 'none' && !beat.cut) return null
  // 开场就是过场字卡（第一章……）：从黑里直接出字卡，字卡照样停够
  const shape = opening ? (beat.cut ? { ...CUT_COVER, up: 0 } : OPEN_COVER) : beat.cut ? CUT_COVER : COVERS[tr] || { cover: '', clear: true, up: 0, hold: 0, down: TRANSITION_MS[tr] || TRANSITION_MS.dissolve }
  const steps = []
  let t = 0
  const step = (name, ms) => { if (ms > 0) { steps.push([name, t]); t += ms } }
  if (!opening) step('clear', shape.clear ? SCENE_CLEAR_MS : 0)
  step('up', shape.up)
  const swap = t
  step('hold', shape.hold)
  step('down', shape.down)
  step('cast', shape.clear ? SCENE_CAST_MS : 0)
  step('settle', SCENE_BEAT_MS)
  return { tr: opening && !COVERS[tr] ? 'black' : tr, cover: shape.cover, clear: shape.clear, up: shape.up, hold: shape.hold, down: shape.down, steps, swap, total: t, ...(beat.cut ? { cut: true } : {}), ...(opening ? { opening: true } : {}) }
}

/** 换场演到第 ms 毫秒时在哪一段（'' 是还没开始或已经演完）。 */
export function changePhase(plan, ms) {
  if (!plan || ms >= plan.total) return ''
  let phase = ''
  for (const [name, at] of plan.steps) if (ms >= at) phase = name
  return phase
}

/**
 * 这一拍的字出来之前停多久、对话框要不要先让开：{ ms, away }。
 * - 插画这一句才出现：对话框让开，出现的过程 + 一拍（cgHoldMs）；
 * - 换场（changePlan：换了地方、进出段落、过场字卡、剧场刚打开）：对话框让开，整段换场演完再出字，这时多一个 change。进出回忆的起雾、醒过来另算；
 * - 导演写了 pause：beat 顿一拍，silence 让开对话框沉默一会儿；
 * - 从回忆里醒过来（导演没挑别的出法时）：对话框让开，等回忆褪白、现在的画面清晰过来（WAKE_MS），这时多一个 wake: true。
 * 几样同时有取最长的。有过场字卡的那一句字卡在换场里演（暗下去、字卡、亮起来），插画和醒过来都不再另停。
 * cg：这一拍画面上的插画（还没画好为空）；was：上一拍画面上的 { cg, place, mode }；opening：剧场刚打开、画面上还没有上一拍；eros：亲密场面的演出开着（关了高潮那一下不等）；
 * wake：醒过来的演法开着（特效开关）。
 */
export function beatHold(beat, { cg = '', was = {}, eros = true, opening = false, wake: waking = true } = {}) {
  let ms = 0, away = false
  if (cg && cg !== was.cg && !beat.cut) { ms = Math.max(ms, cgHoldMs(beat.cg, beat.scene.mood)); away = true }
  const change = changePlan(beat, was, { opening, wake: waking })
  if (change) { ms = Math.max(ms, change.total); away = true }
  if (PAUSE_MS[beat.pause]) { ms = Math.max(ms, PAUSE_MS[beat.pause]); if (beat.pause === 'silence') away = true }
  if (beat.hit) ms = Math.max(ms, HIT_LEAD_MS)
  if (beat.moment) ms = Math.max(ms, MOMENT_LEAD_MS[beat.moment.kind] || 0)
  if (beat.phone) ms = Math.max(ms, PHONE_LEAD_MS[beat.phone.kind] || 0)
  if (beat.hush === 'start') ms = Math.max(ms, HUSH_LEAD_MS)
  if (eros && beat.peak) ms = Math.max(ms, PEAK_LEAD_MS[beat.peak] || 0)
  const wake = waking && !opening && was.mode === 'memory' && (beat.mode || '') !== 'memory' && !beat.cut && WAKE_FROM.has(beat.transition)
  if (wake) { ms = Math.max(ms, WAKE_MS); away = true }
  return { ms, away, ...(wake ? { wake } : {}), ...(change ? { change } : {}) }
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
