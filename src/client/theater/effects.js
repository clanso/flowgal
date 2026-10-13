// 特效开关：剧场里的演出按种类分组，每一个都能单独关掉（设置 → 特效）。关掉的那一下不演，别的照常；打开后马上回来，老的轮次也一样。
// 导演照常写，剧场播放时才拿掉：导演写在某一句上、会影响后面几句的（击倒、分屏、走位、登场退场的样子、过场字卡、停顿、配乐留白）
// 在摊平成节拍之前从脚本里拿掉（muteView），只管这一拍的（镜头、转场、天气、光线、手机的画面……）摊平之后拿掉（muteBeats），
// 不是导演写的（呼吸、视差、暗角……）由 Theater 和 theater.css 按 effectsOff 的结果直接不演。
// 设置里存的是 ui.effects：{ 'cam.shake': false }，没写的都开着（lib/config.js 收拾）。
import {
  CAMERAS, TRANSITIONS, WEATHER, LIGHTS, FX, MODES, MODE_NAMES, ROMANCE, ROMANCE_LABEL, SENSES, SENSE_LABEL,
  MOVES, MOVE_LABEL, ENTER_HOWS, ENTER_HOW_LABEL, EXIT_HOWS, EXIT_HOW_LABEL, HIT_EFFECTS, HIT_EFFECT_LABEL, MOMENTS, MOMENT_LABEL,
  PHONE_KINDS, PHONE_LABEL, DELIVERIES, DELIVERY_LABEL, TEXT_FX, TEXT_FX_LABEL, VOICES, CARDS, CUTS, PAUSES,
  CG_INS, CG_OUTS, CG_MOTIONS, cgIn, cgOut, cgMotion,
} from '../../../lib/vocab.js'
import { CAMERA_LABEL, TRANSITION_LABEL, WEATHER_LABEL, LIGHT_LABEL, FX_LABEL, VOICE_LABEL, CARD_LABEL, CG_IN_LABEL, CG_OUT_LABEL, CG_MOTION_LABEL } from './playback.js'

const list = (prefix, values, labels, skip = []) => values.filter(v => !skip.includes(v)).map(v => ({ id: `${prefix}.${v}`, label: labels[v] || v }))
// 名字在别处太短、这里单看容易误会的几个
const TR_NAME = { cinematic: '黑边收放', none: '直接切' }
const FX_NAME = { sway: '摇晃（船上）', ride: '颠簸（车里）', handheld: '手持镜头', drift: '缓缓推近', rumble: '持续震动', speed: '速度线' }
const CUT_NAME = { time: '时间跳跃', date: '日期', chapter: '章节', meanwhile: '与此同时' }
const PAUSE_NAME = { beat: '顿一拍', silence: '沉默（对话框让开）' }
const PHONE_NAME = { call: '来电响铃', dial: '拨出等接通', end: '挂断小卡', notify: '通知横幅', voicemail: '语音留言横幅' }
/** 只是把前面的样子收回来的走位：关掉了照样收回来（不然背过身的人一直背着），只是不演那一下。 */
const RESTORING = new Set(['face', 'lookback'])

/**
 * 分组：{ id, label, hint, items: [{ id, label }] }。item 的 id 是「种类.值」，值大多就是导演写的词（lib/vocab.js），
 * 以后 vocab 里加了新的镜头、转场、光线，这里自动多出一个开关。
 */
export const EFFECT_GROUPS = [
  { id: 'cam', label: '镜头', hint: '导演给某一句写的运镜。关掉的那一下画面不动。', items: list('cam', CAMERAS, CAMERA_LABEL) },
  {
    id: 'tr', label: '换场转场', hint: '换地方、进出回忆时怎么转过去。关掉的换成溶解；溶解也关了就直接切。',
    items: [...list('tr', TRANSITIONS, { ...TRANSITION_LABEL, ...TR_NAME }, ['none']), { id: 'tr.wake', label: '从回忆里醒来（褪白）' }, { id: 'tr.open', label: '打开剧场时从黑里亮起' }],
  },
  {
    id: 'title', label: '地点标题与过场字卡', hint: '换了地方时的地点标题，「三小时后」「第二天」这类全屏字卡。',
    items: [{ id: 'title.place', label: '地点标题' }, ...list('title', CUTS, CUT_NAME)],
  },
  {
    id: 'weather', label: '天气粒子', hint: '雨雪、花瓣、萤火这些飘在画面上的东西。',
    items: [...list('weather', WEATHER, WEATHER_LABEL, ['clear']), { id: 'weather.depth', label: '粒子分远近' }, { id: 'weather.gust', label: '一阵一阵的风' }],
  },
  { id: 'light', label: '光线', hint: '关灯、烛光、霓虹、窗光、漏光……关掉的照常亮着。', items: list('light', LIGHTS, LIGHT_LABEL, ['normal']) },
  { id: 'fx', label: '画面效果', hint: '一整段挂着的晃动、热浪、水下、心跳、慢动作……', items: list('fx', FX, { ...FX_LABEL, ...FX_NAME }, ['none']) },
  {
    id: 'look', label: '画面色调与质感', hint: '不是导演写的，一直在的那几层。',
    items: [
      { id: 'look.tone', label: '按基调调色' }, { id: 'look.time', label: '按时段调色' }, { id: 'look.vignette', label: '四角暗角' },
      { id: 'look.kenburns', label: '背景缓缓推拉' }, { id: 'look.parallax', label: '鼠标视差' }, { id: 'look.bars', label: '电影黑边（整段挂着）' },
    ],
  },
  {
    id: 'mode', label: '回忆与梦境', hint: '特殊段落的画面滤镜。关掉后照样换到段落里演，只是画面不加滤镜。',
    items: [...list('mode', MODES, MODE_NAMES), { id: 'mode.recall', label: '短闪回的画面' }],
  },
  {
    id: 'mood', label: '亲密氛围与感官', hint: '暧昧的柔光、亲密时的心跳暗角，蒙眼、耳边、发烫这些感官主导的一段。',
    items: [...list('romance', ROMANCE, ROMANCE_LABEL, ['none']), ...list('sense', SENSES, SENSE_LABEL, ['none'])],
  },
  {
    id: 'actor', label: '立绘', hint: '台上的人自己的小动作和登场、退场的样子。关掉的登场退场换成平常的滑进滑出。',
    items: [
      { id: 'actor.breathe', label: '呼吸起伏' }, { id: 'actor.hop', label: '开口时轻轻一跳' }, { id: 'actor.dof', label: '没说话的人微微虚化' },
      { id: 'actor.react', label: '旁人跟着一动' }, { id: 'actor.sym', label: '情绪符号的小动作' }, { id: 'actor.aa', label: '逆转式立绘眨眼、对口型' },
      ...list('enter', ENTER_HOWS, ENTER_HOW_LABEL), ...list('exit', EXIT_HOWS, EXIT_HOW_LABEL),
    ],
  },
  { id: 'move', label: '走位', hint: '靠近、拉开、背过身、躲到身后……关掉的那一下人站着不动；转身面对、回眸关掉了照样转回来，只是不演那一下。', items: list('move', MOVES, MOVE_LABEL, ['reset']) },
  { id: 'hit', label: '打斗', hint: '出手时被打的人一震、震屏、泛红。关掉击倒就不倒下去；关掉治疗，倒下的人照样站起来，只是不泛绿光。', items: list('hit', HIT_EFFECTS, HIT_EFFECT_LABEL) },
  { id: 'moment', label: '小瞬间', hint: '拍照、牵手、干杯、烟花、约定这些一下就过去的小演出。', items: list('moment', MOMENTS, MOMENT_LABEL) },
  {
    id: 'phone', label: '手机与分屏', hint: '手机在画面上的样子和电话另一头的分屏。关掉响铃时电话照样接通，电话里的声音照常。',
    items: [...list('phone', PHONE_KINDS, { ...PHONE_LABEL, ...PHONE_NAME }), { id: 'phone.live', label: '通话中计时、视频小窗' }, { id: 'phone.split', label: '分屏' }],
  },
  {
    id: 'say', label: '台词演法', hint: '一句话怎么说出来：语速、停顿、成块砸出来……关掉的按平常的速度念。',
    items: [...list('say', DELIVERIES, DELIVERY_LABEL), { id: 'say.stress', label: '重音一字一顿' }, { id: 'say.impact', label: '落字时震屏、闪光' }],
  },
  { id: 'textfx', label: '文字效果', hint: '句子里某几个字发抖、放大、越说越小……关掉的那几个字照常显示。', items: list('textfx', TEXT_FX, TEXT_FX_LABEL) },
  { id: 'voice', label: '声音的样子', hint: '电话里、广播、心灵感应这些：对话框和打字音跟着变。关掉的按当面说话演。', items: list('voice', VOICES, VOICE_LABEL) },
  { id: 'card', label: '情境卡片', hint: '短信、信、报纸这类单独一张的卡片。关掉的放回对话框里显示。', items: list('card', CARDS, CARD_LABEL) },
  {
    id: 'cg', label: '插画进出', hint: '插画怎么出现、停留、收起。关掉的出现、收起换成溶入溶出，停留换成静止。',
    items: [
      ...CG_INS.filter(v => v !== 'dissolve').map(v => ({ id: `cgin.${v}`, label: `出现：${CG_IN_LABEL[v] || v}` })),
      ...CG_OUTS.filter(v => v !== 'dissolve').map(v => ({ id: `cgout.${v}`, label: `收起：${CG_OUT_LABEL[v] || v}` })),
      ...CG_MOTIONS.filter(v => v !== 'still').map(v => ({ id: `cgmove.${v}`, label: `停留：${CG_MOTION_LABEL[v] || v}` })),
    ],
  },
  {
    id: 'pace', label: '停顿与留白', hint: '字出来之前先停一下，屏住呼吸时配乐停下。',
    items: [...list('pace', PAUSES, PAUSE_NAME), { id: 'pace.hush', label: '配乐留白' }],
  },
]

export const EFFECT_IDS = EFFECT_GROUPS.flatMap(g => g.items.map(i => i.id))

/** 设置里关掉了哪些（Set）。ui 是设置的 ui 那一节。 */
export function effectsOff(ui) {
  const saved = ui && ui.effects
  return new Set(saved && typeof saved === 'object' ? Object.keys(saved).filter(id => saved[id] === false) : [])
}

// ───────────── 摊平之前：从导演的脚本里拿掉 ─────────────
/**
 * 一句的标注里拿掉关掉的：击倒（倒下去要躺到他再开口）、分屏、走位、登场退场的方式、过场字卡、停顿、配乐留白。没有要拿的原样返回。
 * 别的出手、治疗、手机只管这一拍，摊平之后再拿（治疗关掉了，被打倒的人照样站起来）。
 */
function muteLine(line, off) {
  if (!line || typeof line !== 'object') return line
  let out = line
  const own = () => { if (out === line) out = { ...line } }
  const drop = key => { own(); delete out[key] }
  if (line.hit && line.hit.effect === 'down' && off.has('hit.down')) drop('hit')
  if (line.split && off.has('phone.split')) drop('split')
  if (line.cut && off.has('title.' + line.cut.kind)) drop('cut')
  if (line.pause && off.has('pace.' + line.pause)) drop('pause')
  if (line.bgm === 'hush' && off.has('pace.hush')) drop('bgm')
  const still = m => m && off.has('move.' + m.act) && !RESTORING.has(m.act)
  if (Array.isArray(line.move) && line.move.some(still)) { own(); out.move = line.move.filter(m => !still(m)) }
  if (Array.isArray(line.enter) && line.enter.some(e => e && e.how && off.has('enter.' + e.how))) {
    own()
    out.enter = line.enter.map(e => {
      if (!(e && e.how && off.has('enter.' + e.how))) return e
      const { how, ...rest } = e
      return rest
    })
  }
  if (line.exitHow && Object.values(line.exitHow).some(how => off.has('exit.' + how))) {
    const kept = Object.fromEntries(Object.entries(line.exitHow).filter(([, how]) => !off.has('exit.' + how)))
    if (Object.keys(kept).length) { own(); out.exitHow = kept } else drop('exitHow')
  }
  return out
}

function muteScript(script, off) {
  if (!script || !script.lines) return script
  let changed = false
  const lines = {}
  for (const [id, line] of Object.entries(script.lines)) {
    lines[id] = muteLine(line, off)
    if (lines[id] !== line) changed = true
  }
  return changed ? { ...script, lines } : script
}

/** 插画进出：关掉的出现、收起换成溶入溶出，停留换成静止。 */
function muteImage(img, off) {
  if (!img) return img
  const enter = cgIn(img.enter), leave = cgOut(img.leave), motion = cgMotion(img.motion)
  const patch = {
    ...(enter && off.has('cgin.' + enter) ? { enter: 'dissolve' } : {}),
    ...(leave && off.has('cgout.' + leave) ? { leave: 'dissolve' } : {}),
    ...(motion && off.has('cgmove.' + motion) ? { motion: 'still' } : {}),
  }
  return Object.keys(patch).length ? { ...img, ...patch } : img
}

/** 给 buildBeats 的视图：每一轮的脚本、每张插画拿掉关掉的演出。什么都没关时原样返回。 */
export function muteView(view, off) {
  if (!view || !off || !off.size) return view
  return {
    ...view,
    turns: (view.turns || []).map(t => {
      const script = muteScript(t.script, off)
      return script === t.script ? t : { ...t, script }
    }),
    images: (view.images || []).map(img => muteImage(img, off)),
  }
}

// ───────────── 摊平之后：只管这一拍的 ─────────────
/** 转场：关掉的换成溶解，溶解也关了就直接切。 */
export function muteTransition(tr, off) {
  if (!tr || tr === 'none' || !off.has('tr.' + tr)) return tr
  return off.has('tr.dissolve') ? 'none' : 'dissolve'
}

const SCENE_FIELDS = [['weather', 'clear'], ['light', 'normal'], ['fx', 'none'], ['romance', 'none'], ['sense', 'none']]
/** 场景上一整段挂着的：天气、光线、画面效果、亲密氛围、感官、电影黑边。 */
function muteScene(scene, off) {
  if (!scene) return scene
  let out = scene
  for (const [field, none] of SCENE_FIELDS) {
    if (scene[field] && scene[field] !== none && off.has(field + '.' + scene[field])) { if (out === scene) out = { ...scene }; out[field] = none }
  }
  if (scene.bars === 'on' && off.has('look.bars')) { if (out === scene) out = { ...scene }; out.bars = 'none' }
  return out
}

/**
 * 摊平后的每一拍拿掉关掉的：镜头、转场、情绪符号、旁人的反应、转身面对和回眸的那一下、出手、手机的画面、
 * 重音、文字效果、声音的样子、情境卡片、小瞬间、场景上挂着的那几样。
 */
export function muteBeats(beats, off) {
  if (!off || !off.size) return beats
  const scenes = new Map() // 同一个场景对象只换一次：连着几拍共用一份，换出来的也共用一份
  const sceneOf = scene => { if (!scenes.has(scene)) scenes.set(scene, muteScene(scene, off)); return scenes.get(scene) }
  return beats.map(b => {
    const out = { ...b, scene: sceneOf(b.scene), transition: muteTransition(b.transition, off) }
    if (b.cam && off.has('cam.' + b.cam)) { out.cam = ''; delete out.camOn }
    if (off.has('actor.sym')) {
      out.sym = ''
      // 只带着符号、没换表情的反应整个不要（不然没了符号还会点一下头）
      if (out.reacts) out.reacts = out.reacts.filter(r => r.emo).map(r => (r.sym ? { ...r, sym: '' } : r))
    }
    if (out.reacts && !out.reacts.length) delete out.reacts
    if (out.reacts && off.has('actor.react')) delete out.reacts
    if (b.moves && b.moves.some(m => off.has('move.' + m.act))) {
      const kept = b.moves.filter(m => !off.has('move.' + m.act))
      if (kept.length) out.moves = kept; else delete out.moves
    }
    if (b.hit && off.has('hit.' + b.hit.effect)) delete out.hit
    // 手机：响着的、接通后挂着的、挂断小卡和横幅各自一个开关；关掉响铃时电话照样接通
    if (b.call && off.has(b.call.state === 'live' ? 'phone.live' : b.call.dir === 'out' ? 'phone.dial' : 'phone.call')) delete out.call
    if (b.phone && off.has('phone.' + b.phone.kind)) delete out.phone
    if (b.stress && off.has('say.stress')) out.stress = ''
    if (b.textfx) {
      const kept = b.textfx.filter(t => !off.has('textfx.' + t.style))
      if (kept.length !== b.textfx.length) { if (kept.length) out.textfx = kept; else delete out.textfx }
    }
    if (b.voice && off.has('voice.' + b.voice)) delete out.voice
    if (b.card && off.has('card.' + b.card)) out.card = ''
    if (b.moment && off.has('moment.' + b.moment.kind)) delete out.moment
    return out
  })
}

/** 台词演法里关掉的那几种（lib/typing.js 的 planLine：导演写的、从字面推断的都不用）。 */
export function offDeliveries(off) {
  return new Set(DELIVERIES.filter(d => off.has('say.' + d)))
}

/** theater.css 按 .fg-theater 上的 data-off 关掉的几样（背景推拉、呼吸、开口一跳）。 */
const CSS_OFF = { 'look.kenburns': 'kenburns', 'actor.breathe': 'breathe', 'actor.hop': 'hop' }
export function cssOff(off) {
  return Object.entries(CSS_OFF).filter(([id]) => off.has(id)).map(([, word]) => word).join(' ')
}
