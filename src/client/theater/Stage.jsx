// 舞台：背景（生成图 / 程序化天空）、时段调色、天气粒子、立绘、CG、镜头与闪光、地点标题卡，
// 以及逐句可变的气氛：基调色调、光线、画面效果、特殊段落的滤镜、过场字卡。
import React from 'react'
import { assetUrl } from '../api.js'
import { Particles } from './particles.js'
import { SKY, placeKey, actorX, onStage, stageLayout, blockLayout, HIT_IMPACT_MS, cgSrc, cgEntrance, cgExit, cgStay, CG_OUT_MS, TRANSITION_MS, WAKE_MS, WAKE_SWAP_MS, TIME_LABEL, WEATHER_LABEL, MODE_LABEL, CUT_LABEL, builtinOf } from './playback.js'
import { lookAt, pickSprite, thenLook, undoShifts } from '../../../lib/look.js'
import { faceBoxFrom } from '../../../lib/face.js'
import { resolveEmotion, standIns } from '../../../lib/emotions.js'
import { sheetOf, slotKeys } from '../../../lib/poses.js'
import { heightOf, placeSprite, usualFace, faceCrop, FACE_RATIO } from '../../../lib/stature.js'
import { aimCamera } from '../../../lib/camera.js'
import { reactKind, stackLayers } from '../../../lib/blocking.js'
import { MOMENT_FOLEY, PHONE_FOLEY } from '../../../lib/foley.js'
import { AaSprite } from './AaSprite.jsx'
import { stinger, foley } from './audio.js'

/** 转场的动画；时长在 playback.js 的 TRANSITION_MS（换场时对话框按它让开）。 */
const TRANSITION_ANIM = {
  dissolve: 'fg-dissolve', fade: 'fg-fade-slow', cinematic: 'fg-cinematic', wipe: 'fg-wipe', iris: 'fg-iris',
  strips: 'fg-wipe', black: 'fg-black-in', flash: 'fg-flash-in', blink: 'fg-blink-in', glitch: 'fg-glitch-in',
  swirl: 'fg-swirl-in', haze: 'fg-haze-in', wake: 'fg-haze-in', none: 'none', // wake：从回忆里醒过来，剧场按 beatHold 的 wake 换上，导演不写
}
const TRANSITION = Object.fromEntries(Object.entries(TRANSITION_ANIM).map(([k, anim]) => [k, [anim, TRANSITION_MS[k] / 1000 + 's']]))

export function backgroundFor(scene, view) {
  const place = view && view.places && view.places[placeKey(scene)]
  if (place && place.assetId) return { src: assetUrl(place.assetId), from: 'ai' }
  return { src: '', from: 'sky' }
}

function hashOf(text) { let h = 0; for (const ch of String(text)) h = (h * 31 + ch.codePointAt(0)) >>> 0; return h }

/** 远景剪影：按地名散列出一排楼宇 / 山影，夜里亮几扇窗。 */
function Skyline({ seed, time }) {
  const h = hashOf(seed)
  const night = ['evening', 'night', 'midnight'].includes(time)
  const blocks = []
  let x = 0
  let i = 0
  while (x < 1000) {
    const w = 40 + ((h >> (i % 24)) & 63) + (i * 37) % 50
    const top = 120 + ((h * (i + 3)) % 150)
    blocks.push({ x, w, top })
    x += w + ((i * 13) % 8)
    i += 1
  }
  const windows = []
  if (night) {
    blocks.forEach((b, bi) => {
      for (let wy = b.top + 14; wy < 380; wy += 22) for (let wx = b.x + 8; wx < b.x + b.w - 10; wx += 16) {
        if (((wx * 7 + wy * 13 + bi * 31 + h) % 11) === 0) windows.push({ x: wx, y: wy })
      }
    })
  }
  return (
    <svg className="fg-skyline" viewBox="0 0 1000 400" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="fg-skyline-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={night ? '#0b0f2a' : '#2a2440'} stopOpacity=".92" />
          <stop offset="1" stopColor="#05040c" />
        </linearGradient>
      </defs>
      <path d={`M0 400 L0 ${260 + (h % 40)} Q250 ${200 + (h % 60)} 500 ${250 + (h % 30)} T1000 ${230 + (h % 50)} L1000 400 Z`} fill="#000" opacity=".28" />
      {blocks.map((b, k) => <rect key={k} x={b.x} y={b.top} width={b.w} height={400 - b.top} fill="url(#fg-skyline-g)" />)}
      {windows.map((w, k) => <rect key={'w' + k} x={w.x} y={w.y} width="6" height="9" fill="#ffd98a" opacity={0.5 + (k % 5) * 0.1} />)}
    </svg>
  )
}

function Sky({ scene }) {
  const [top, mid, low, sun, sx, sy] = SKY[scene.time] || SKY.afternoon
  return (
    <div className="fg-sky" style={{ background: `linear-gradient(180deg, ${top} 0%, ${mid} 55%, ${low} 100%)`, '--sun': sun, '--sun-x': sx, '--sun-y': sy }}>
      <Skyline seed={scene.location || 'x'} time={scene.time} />
    </div>
  )
}

/**
 * 背景层：换图时新层带转场盖到旧层上面，旧层不动（不先淡出，免得中途露出底下的黑），新层演完再移除旧层。
 * 慢慢推拉（Ken Burns）在里面那层画上，进出场的动画在外面这层，换场时旧图不会突然弹回原来的大小。
 */
export function Backdrop({ scene, view, transition = 'dissolve' }) {
  const bg = backgroundFor(scene, view)
  const id = bg.src || 'sky:' + scene.time + ':' + scene.location
  const [layers, setLayers] = React.useState(() => [{ id, bg, scene, enter: false }])
  React.useEffect(() => {
    setLayers(list => {
      if (list[list.length - 1].id === id) return list.map((l, i) => (i === list.length - 1 ? { ...l, scene } : l))
      return [...list.slice(-1).map(l => ({ ...l, leaving: true, out: transition })), { id, bg, scene, enter: true, tr: transition }]
    })
  }, [id, scene.time])
  React.useEffect(() => {
    if (layers.length < 2) return undefined
    const top = layers[layers.length - 1]
    const t = setTimeout(() => setLayers(list => list.filter(l => !l.leaving)), (TRANSITION_MS[top.tr] ?? TRANSITION_MS.dissolve) + 300)
    return () => clearTimeout(t)
  }, [layers])
  return (
    <>
      {layers.map(layer => {
        const [anim, dur] = TRANSITION[layer.tr] || TRANSITION.dissolve
        const cls = ['fg-bg', layer.bg.src ? 'is-image' : '', layer.enter && layer.tr !== 'none' ? 'is-enter' : '', layer.leaving ? 'is-leave' : ''].join(' ')
        return (
          <div key={layer.id} className={cls} data-tr={layer.tr} data-out={layer.leaving ? layer.out : undefined} style={{ '--enter-anim': anim, '--enter-dur': dur }}>
            <div className="fg-bg-art" style={layer.bg.src ? { backgroundImage: `url("${layer.bg.src}")` } : undefined}>
              {!layer.bg.src && <Sky scene={layer.scene} />}
            </div>
          </div>
        )
      })}
    </>
  )
}

/**
 * 换场时盖住画面的那一层（playback.js 的 changePlan）：黑、白、眼皮、撕裂、旋涡。
 * state：idle 还没盖（清场时）、up 盖上去、full 盖满（这时在下面换画面）、down 揭开、off 演完或被点掉。
 */
export function SceneCover({ plan, state }) {
  if (!plan || !plan.cover) return null
  const ms = state === 'up' ? plan.up : state === 'down' ? plan.down : 0
  return <div className="fg-cover" data-cover={plan.cover} data-state={state} style={{ '--ms': ms + 'ms' }} aria-hidden="true" />
}

/** 剪影立绘：还没生成立绘的人物，按外貌档案画一个半身剪影（发型、发色）+ 描边光 + 竖排名字占位。 */
const SIL = {
  hairLong: 'M100 22C58 22 36 54 36 98c0 46-4 92-14 150h156c-10-58-14-104-14-150 0-44-22-76-64-76z',
  hairShort: 'M100 22C60 22 38 52 38 96c0 22 2 40 8 58h108c6-18 8-36 8-58 0-44-22-74-62-74z',
  body: 'M100 150c-22 0-44 6-60 20-20 18-28 50-32 92L0 400h200l-8-138c-4-42-12-74-32-92-16-14-38-20-60-20z',
  bodyWide: 'M100 148c-28 0-54 6-70 20-20 18-26 50-30 94l-6 138h212l-6-138c-4-44-10-76-30-94-16-14-42-20-70-20z',
  neck: 'M86 120h28l2 44c-10 8-22 8-32 0z',
  face: 'M100 52c-24 0-38 20-38 46 0 30 16 52 38 52s38-22 38-52c0-26-14-46-38-46z',
  bangs: 'M60 100C56 56 76 36 100 36s44 20 40 64q-6-16-12-30-4 16-12 24-2-16-6-26-6 16-16 24 2-14-2-26-8 16-18 22 4-12 2-22-8 16-16 32z',
  lockL: 'M58 98c-4 48-8 98-20 154l16 4c8-52 12-104 12-156z',
  lockR: 'M142 98c4 48 8 98 20 154l-16 4c-8-52-12-104-12-156z',
  lockShortL: 'M58 98c-2 22-4 38-10 56l14 2c4-18 6-36 6-56z',
  lockShortR: 'M142 98c2 22 4 38 10 56l-14 2c-4-18-6-36-6-56z',
  tailR: 'M146 70c30 6 44 52 36 112-4 30-14 52-24 62 4-34 4-70-2-104-4-26-8-48-10-70z',
  tailL: 'M54 70c-30 6-44 52-36 112 4 30 14 52 24 62-4-34-4-70 2-104 4-26 8-48 10-70z',
  collar: 'M80 172l20 26 20-26',
  rimLong: 'M22 248c10-58 14-104 14-150 0-44 22-76 64-76s64 32 64 76c0 46 4 92 14 150',
  rimShort: 'M46 154c-6-18-8-36-8-58 0-44 22-74 62-74s62 30 62 74c0 22-2 40-8 58',
}
// 发色词后面允许夹几个词（"short brown hair"、"long silver wavy hair"）。
const hairRe = words => new RegExp(`\\b(?:${words})\\b[a-z\\s-]{0,16}\\bhair\\b`)
const HAIR_COLORS = [
  [hairRe('silver|white|grey|gray|platinum'), '#d9dce8'], [hairRe('blonde|golden|yellow'), '#e6c56a'], [hairRe('brown|chestnut'), '#6a4530'],
  [hairRe('red|crimson'), '#b8323a'], [hairRe('pink'), '#f29ac0'], [hairRe('orange'), '#e8873a'], [hairRe('blue|aqua'), '#4a78d8'],
  [hairRe('purple|violet|lavender'), '#8a5fd0'], [hairRe('green'), '#43a070'], [hairRe('black|dark'), '#1b1628'],
]
export function silhouetteStyle(appearance = '', gender = '') {
  const a = String(appearance).toLowerCase()
  const male = gender === 'male' || /\b1boy\b|\bmale\b/.test(a)
  return {
    short: male || hairRe('short|very short').test(a) || /bob cut|pixie cut|buzz cut/.test(a),
    tails: /twintails|twin tails/.test(a) ? 2 : /ponytail/.test(a) ? 1 : 0,
    wide: male,
    hair: (HAIR_COLORS.find(([re]) => re.test(a)) || [, '#1b1628'])[1],
  }
}
export function Silhouette({ name, color, appearance, gender }) {
  const gid = 'fg-sil-' + hashOf(name)
  const st = silhouetteStyle(appearance, gender)
  const hairPath = st.short ? SIL.hairShort : SIL.hairLong
  const bodyPath = st.wide ? SIL.bodyWide : SIL.body
  return (
    <div className="fg-silhouette" style={{ '--c': color }}>
      <svg viewBox="0 0 200 400" aria-hidden="true">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={color} stopOpacity=".95" />
            <stop offset=".55" stopColor={color} stopOpacity=".5" />
            <stop offset="1" stopColor={color} stopOpacity="0" />
          </linearGradient>
          <linearGradient id={gid + 'h'} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={st.hair} stopOpacity=".95" />
            <stop offset="1" stopColor={st.hair} stopOpacity=".55" />
          </linearGradient>
          <radialGradient id={gid + 'f'} cx=".5" cy=".42" r=".62">
            <stop offset="0" stopColor="#fff" stopOpacity=".5" />
            <stop offset="1" stopColor="#fff" stopOpacity=".06" />
          </radialGradient>
        </defs>
        {st.tails > 0 && <path d={SIL.tailR} fill={`url(#${gid}h)`} />}
        {st.tails > 1 && <path d={SIL.tailL} fill={`url(#${gid}h)`} />}
        <path d={hairPath} fill={`url(#${gid}h)`} />
        <path d={bodyPath} fill={`url(#${gid})`} />
        <path d={SIL.neck} fill={color} opacity=".55" />
        <path d={SIL.face} fill={color} opacity=".8" />
        <path d={SIL.face} fill={`url(#${gid}f)`} />
        <path d={SIL.bangs} fill={st.hair} opacity=".92" />
        <path d={st.short ? SIL.lockShortL : SIL.lockL} fill={st.hair} opacity=".85" />
        <path d={st.short ? SIL.lockShortR : SIL.lockR} fill={st.hair} opacity=".85" />
        <path d={SIL.collar} fill="none" stroke="#fff" strokeOpacity=".5" strokeWidth="2.5" strokeLinecap="round" />
        <path className="sil-rim" d={st.short ? SIL.rimShort : SIL.rimLong} />
        <path className="sil-rim" d={bodyPath} />
      </svg>
      <div className="fg-silhouette-name">{name}</div>
    </div>
  )
}

/**
 * 这一拍该用的立绘：按这一轮的样子（外貌、服装、长期状态）找对应情绪的差分，没画好时按情绪库依次先用替身
 * （并进它的情绪以前画的、替身、它那一类的代表情绪、平静，见 standIns）。
 * 段落里导演写了这个人当时的样子（then）就按当时的找；还没画好时先显示剪影，不借现在那套。
 * 这一轮中途才变的样子（pending：后面才缠上发带、才换衣服）还没发生时，按变化之前的样子找。
 * 分动作的人（lib/poses.js）：pose 是他此刻所在的动作（节拍里的 postures），先找这个动作上的这张脸，没画好再看主动作、别的动作上的。
 * groups 是没有设计的人用的通用动作组（视图里的 poseGroups）。off 是这一刻收起了的动作（节拍里的 offPoses）：没画好时不退到它们上面。
 */
function spriteFor(person, turn, emo, emotions, then = null, pending = null, { pose = '', groups = [], off = null } = {}) {
  if (!person || !person.timeline) return ''
  const lib = emotions || []
  const now = lookAt(person.timeline, turn)
  const over = then || (pending ? undoShifts(now, pending) : null)
  const look = over ? thenLook(now, over, person.timeline.outfits) : now
  const sheet = sheetOf(person, groups || [])
  const keys = sheet ? e => slotKeys(person.sprites, look, sheet, pose, e, lib, { off }) : null
  return pickSprite(person.sprites, look, resolveEmotion(emo, lib) || emo, standIns(emo, lib), { strict: Boolean(then), keys })
}

/** 登场从靠近的那一侧滑进来，退场往同一侧淡出。 */
const SIDE = { farleft: '-40%', left: '-28%', center: '0%', right: '28%', farright: '40%' }

/** 立绘里的脸框（像素）：认过脸的底图、换脸的差分（用它底图的框）、逆转式素材包框好的眼睛和嘴。 */
function faceBoxOf(record, size) {
  if (!record) return null
  if (record.faceBox) return record.faceBox
  if (record.face && record.face.box) return record.face.box
  const rects = record.aa && record.aa.rects
  return rects && size ? faceBoxFrom(rects, size[0], size[1]) : null
}

/**
 * 没在说话的人的反应：身子跟着一动（lib/blocking.js 的 reactKind 按情绪挑）。走位时走两步的起伏；转身、回眸见下面的 TURN_FRAMES。
 * 用 Web Animations 动 .fg-actor-react 这一层，不碰呼吸、说话时的轻跳和登场退场。
 */
const REACT_FRAMES = {
  jolt: [[{ transform: 'none' }, { transform: 'translateY(-2.6%) scale(1.012)', offset: 0.22 }, { transform: 'translateY(.5%)', offset: 0.55 }, { transform: 'none' }], 520],
  shrink: [[{ transform: 'none' }, { transform: 'translateY(1%) scale(.988) rotate(-.8deg)', offset: 0.35 }, { transform: 'translateY(.7%) scale(.992) rotate(-.5deg)', offset: 0.7 }, { transform: 'none' }], 1100],
  bounce: [[{ transform: 'none' }, { transform: 'translateY(-1.4%)', offset: 0.2 }, { transform: 'none', offset: 0.4 }, { transform: 'translateY(-.9%)', offset: 0.6 }, { transform: 'none' }], 620],
  droop: [[{ transform: 'none' }, { transform: 'translateY(1.6%) scale(.99)', offset: 0.45 }, { transform: 'translateY(1.2%) scale(.993)', offset: 0.8 }, { transform: 'none' }], 1500],
  shake: [[{ transform: 'none' }, { transform: 'translateX(-.8%)', offset: 0.15 }, { transform: 'translateX(.8%)', offset: 0.35 }, { transform: 'translateX(-.5%)', offset: 0.55 }, { transform: 'translateX(.3%)', offset: 0.75 }, { transform: 'none' }], 460],
  nod: [[{ transform: 'none' }, { transform: 'translateY(.9%)', offset: 0.35 }, { transform: 'none', offset: 0.7 }, { transform: 'none' }], 560],
  tilt: [[{ transform: 'none' }, { transform: 'rotate(2.2deg)', offset: 0.3 }, { transform: 'rotate(1.6deg)', offset: 0.7 }, { transform: 'none' }], 1000],
  step: [[{ transform: 'none' }, { transform: 'translateY(-.9%)', offset: 0.25 }, { transform: 'none', offset: 0.5 }, { transform: 'translateY(-.7%)', offset: 0.75 }, { transform: 'none' }], 560],
}
const STEP_MOVES = new Set(['approach', 'apart', 'forward', 'back', 'hide'])
/**
 * 背过身 / 转回来、回眸：立绘没有背面，不翻面（像纸片一样翻过去很假），身子往外侧一晃、肩膀一沉，一边糊一下一边暗成背影（theater.css 的 .is-away）；
 * 转回来往里一晃、从影子里亮回来，回眸多一下抬头。dir 是往哪边转（站在左半边往左）。
 */
const TURN_FRAMES = {
  turn: dir => [[{ transform: 'none', filter: 'none' }, { transform: `translateX(${dir * 1.8}%) rotate(${dir * 1.2}deg) scale(.985)`, filter: 'blur(2.4px)', offset: 0.4 }, { transform: `translateX(${dir * 0.6}%) translateY(.6%) scale(.99)`, filter: 'blur(.6px)', offset: 0.72 }, { transform: 'none', filter: 'none' }], 820],
  face: dir => [[{ transform: 'none', filter: 'none' }, { transform: `translateX(${-dir * 1.4}%) rotate(${-dir * 0.9}deg)`, filter: 'blur(2px)', offset: 0.38 }, { transform: 'none', filter: 'none' }], 700],
  lookback: dir => [[{ transform: 'none', filter: 'none' }, { transform: `translateX(${-dir * 1.2}%) translateY(-.9%) rotate(${-dir * 1.4}deg)`, filter: 'blur(1.8px)', offset: 0.36 }, { transform: 'translateY(-.3%)', filter: 'none', offset: 0.7 }, { transform: 'none', filter: 'none' }], 760],
}
/** 导演写的情绪符号（sym）不画出来，只让这个人身子跟着一动：一惊、垂下去、气得一抖、高兴得一颤、害羞缩肩、晕得一歪。 */
const SYM_MOTION = { surprise: 'jolt', bulb: 'jolt', sweat: 'droop', gloom: 'droop', sigh: 'droop', heartbreak: 'droop', zzz: 'droop', anger: 'shake', fire: 'shake', heart: 'bounce', note: 'bounce', sparkle: 'bounce', bloom: 'bounce', blush: 'shrink', dizzy: 'tilt' }
/**
 * 战斗里一次出手：被打的人在打中那一刻（HIT_IMPACT_MS）怎么一动（同样动 .fg-actor-react 这一层），出手的人往前冲一下。
 * 命中一震、暴击震得更狠还泛红、闪避侧身一闪、格挡被推开一点、击倒先一震（倒下去的样子在 theater.css 的 .is-down）、治疗泛起绿光。
 */
const HIT_FRAMES = {
  hit: [[{ transform: 'none', filter: 'none' }, { transform: 'translateX(-2.4%) rotate(-1.6deg)', filter: 'brightness(2.2)', offset: 0.12 }, { transform: 'translateX(1.4%) rotate(.6deg)', filter: 'none', offset: 0.4 }, { transform: 'none' }], 420],
  crit: [[{ transform: 'none', filter: 'none' }, { transform: 'translateX(-4%) rotate(-3deg) scale(1.02)', filter: 'brightness(2.4) sepia(1) saturate(5) hue-rotate(-40deg)', offset: 0.1 }, { transform: 'translateX(2.6%) rotate(1.4deg)', filter: 'sepia(.6) saturate(3) hue-rotate(-40deg)', offset: 0.35 }, { transform: 'translateX(-1%)', filter: 'none', offset: 0.65 }, { transform: 'none' }], 640],
  miss: [[{ transform: 'none', opacity: 1, filter: 'none' }, { transform: 'translateX(10%) skewX(-6deg)', opacity: 0.45, filter: 'blur(3px)', offset: 0.25 }, { transform: 'translateX(8%)', opacity: 1, filter: 'none', offset: 0.55 }, { transform: 'none' }], 720],
  block: [[{ transform: 'none', filter: 'none' }, { transform: 'translateX(-3%) scale(.985)', filter: 'brightness(1.5) saturate(.6)', offset: 0.18 }, { transform: 'translateX(-2%)', filter: 'none', offset: 0.5 }, { transform: 'none' }], 520],
  down: [[{ transform: 'none', filter: 'none' }, { transform: 'translateX(-3%) rotate(-3deg)', filter: 'brightness(2)', offset: 0.15 }, { transform: 'translateX(-1%) rotate(-1deg)', filter: 'none', offset: 0.5 }, { transform: 'none' }], 560],
  heal: [[{ filter: 'none' }, { filter: 'brightness(1.35) drop-shadow(0 0 1.6cqw rgba(110, 255, 170, .9))', offset: 0.3 }, { filter: 'brightness(1.15) drop-shadow(0 0 1cqw rgba(110, 255, 170, .6))', offset: 0.7 }, { filter: 'none' }], 1300],
}
const LUNGE = dir => [[{ transform: 'none' }, { transform: `translateX(${dir * 7}%) translateY(-1%)`, offset: 0.35 }, { transform: `translateX(${dir * 5}%)`, offset: 0.6 }, { transform: 'none' }], 620]
/**
 * 小瞬间里被摸头、被戳脸的人（同样动 .fg-actor-react 这一层）：摸头往下一压一压，戳脸往旁边一歪再弹回来。
 */
const TOUCH_FRAMES = {
  pat: [[{ transform: 'none' }, { transform: 'translateY(1.2%) scaleY(.975)', offset: 0.16 }, { transform: 'none', offset: 0.34 }, { transform: 'translateY(1.2%) scaleY(.975)', offset: 0.56 }, { transform: 'none', offset: 0.74 }, { transform: 'none' }], 1000],
  poke: [[{ transform: 'none' }, { transform: 'translateX(-1.6%) rotate(-2.5deg)', offset: 0.15 }, { transform: 'translateX(.8%) rotate(1.4deg)', offset: 0.4 }, { transform: 'translateX(-.3%) rotate(-.5deg)', offset: 0.65 }, { transform: 'none' }], 700],
}
/** 上前 / 退后：立绘放大或缩小多少、脚往下或往上挪多少（占舞台高度）。 */
const DEPTH = { 1: [1.1, '-6%'], [-1]: [0.88, '3%'] }
/** 躲在别人身后的人：比挡在前面的人站得靠后一点，小一圈。 */
const HIDING = [0.95, '1.5%']
/** 退场方式演多久（毫秒），样式在 theater.css 的 data-exit。 */
const EXIT_MS = { storm: 650, run: 420, slow: 1300 }
/** 换立绘（换表情、换动作）时新图淡入、旧图淡出多久（毫秒），样式在 theater.css 的 .is-in / .is-out。 */
const SWAP_MS = 280
/** 立绘图片的原始宽高（按图片地址）：读过的记下来，换回这张时不用再等它读完。 */
const SIZES = new Map()
/** 剧场给台上所有人（主舞台、分屏、短闪回）的开关：aa 逆转式立绘的眨眼和口型（特效开关里关掉了就只显示原图）。 */
export const StageFlags = React.createContext({ aa: true })

function Actor({ entry, person, beat, emo, emotions, groups = [], leaving = false, talk = null }) {
  const flags = React.useContext(StageFlags)
  const speaking = !leaving && (beat.speakers ? beat.speakers.includes(entry.name) : beat.speaker === entry.name)
  const reaction = !leaving && !speaking && beat.reacts ? beat.reacts.find(r => r.name === entry.name) : null
  const move = !leaving && beat.moves ? beat.moves.find(m => m.name === entry.name) : null
  // 怎么进来的（跑进来、慢慢走进来、探头）：上台那一拍定下，之后不再变（换了 animation 会让登场动画重放一遍）
  const [entrance] = React.useState(() => (beat.enterHow && beat.enterHow[entry.name]) || '')
  const reactRef = React.useRef(null)
  const symKind = SYM_MOTION[speaking ? beat.sym : reaction ? reaction.sym : ''] || ''
  React.useEffect(() => {
    const el = reactRef.current
    if (!el || typeof el.animate !== 'function' || (!reaction && !move && !symKind)) return
    if (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches) return
    // 新情绪按它接近的内置情绪（替身一路往下、它那一类的代表情绪）选怎么动
    const base = reaction ? builtinOf(reaction.emo, emotions) : ''
    const turning = move && TURN_FRAMES[move.act] ? TURN_FRAMES[move.act]((entry.x ?? 50) < 50 ? -1 : 1) : null
    const kind = symKind || (reaction && (reaction.emo || !move) ? reactKind(base) : STEP_MOVES.has(move.act) ? 'step' : '')
    const frames = turning || REACT_FRAMES[kind]
    if (frames) el.animate(frames[0], { duration: frames[1], easing: 'cubic-bezier(.3, .7, .3, 1)' })
  }, [beat.key])
  // 战斗里一次出手：出手的人往对面冲一下，被打的人在打中那一刻一动
  const struck = !leaving && beat.hit && beat.hit.to === entry.name ? beat.hit.effect : ''
  const striking = !leaving && beat.hit && beat.hit.from === entry.name && beat.hit.to !== entry.name
  React.useEffect(() => {
    const el = reactRef.current
    if (!el || typeof el.animate !== 'function' || (!struck && !striking)) return undefined
    if (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined
    if (striking) { const [frames, ms] = LUNGE((entry.x ?? 50) < 50 ? 1 : -1); el.animate(frames, { duration: ms, easing: 'cubic-bezier(.3, .7, .3, 1)' }) }
    if (!struck) return undefined
    const t = setTimeout(() => { const [frames, ms] = HIT_FRAMES[struck] || HIT_FRAMES.hit; el.animate(frames, { duration: ms, easing: 'cubic-bezier(.2, .8, .3, 1)' }) }, HIT_IMPACT_MS)
    return () => clearTimeout(t)
  }, [beat.key])
  // 小瞬间：被摸头、被戳脸的人一动
  const touched = !leaving && beat.moment && beat.moment.who === entry.name && TOUCH_FRAMES[beat.moment.kind] ? beat.moment.kind : ''
  React.useEffect(() => {
    const el = reactRef.current
    if (!el || typeof el.animate !== 'function' || !touched) return undefined
    if (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined
    const t = setTimeout(() => { const [frames, ms] = TOUCH_FRAMES[touched]; el.animate(frames, { duration: ms, easing: 'cubic-bezier(.3, .7, .3, 1)' }) }, 150)
    return () => clearTimeout(t)
  }, [beat.key])
  const sprite = spriteFor(person, beat.turn, emo, emotions, beat.then && beat.then[entry.name], beat.ahead && beat.ahead[entry.name], { pose: beat.postures && beat.postures[entry.name], groups, off: beat.offPoses && beat.offPoses[entry.name] })
  const src = sprite ? assetUrl(sprite) : ''
  const color = (person && person.color) || '#9b7bff'
  // 显示中的那张（cur）和刚换下、正在淡出的那张（prev），都带着图的原始宽高（按脸框缩放要用）。
  // 换表情、换动作时先在后台读好新图、量好大小再换上：新图从第一帧起就按自己的脸框摆好，盖在旧图上淡入，不从旧图的大小缩放过去。
  // broken：读不出来的那张（被删了、数据目录搬了），退回剪影，不留一个破图标
  const [pics, setPics] = React.useState(() => ({ cur: src && SIZES.has(src) ? { src, size: SIZES.get(src) } : null, prev: null, broken: '' }))
  React.useEffect(() => {
    if (!src) { setPics({ cur: null, prev: null, broken: '' }); return undefined }
    if (pics.cur && pics.cur.src === src) return undefined
    const show = size => setPics(p => ({ cur: { src, size }, prev: p.cur && p.cur.src !== src ? p.cur : null, broken: '' }))
    if (SIZES.has(src)) { show(SIZES.get(src)); return undefined }
    let live = true
    const img = new Image()
    img.onload = () => {
      if (!live || !img.naturalHeight) return
      SIZES.set(src, [img.naturalWidth, img.naturalHeight])
      show(SIZES.get(src))
    }
    img.onerror = () => { if (live) setPics({ cur: null, prev: null, broken: src }) }
    img.src = src
    return () => { live = false }
  }, [src])
  React.useEffect(() => {
    if (!pics.prev) return undefined
    const t = setTimeout(() => setPics(p => (p.prev ? { ...p, prev: null } : p)), SWAP_MS)
    return () => clearTimeout(t)
  }, [pics.prev])
  const records = Object.values((person && person.sprites) || {})
  const uploaded = records.some(r => r && r.assetId === sprite && r.uploaded)
  // 立绘记录带逆转式素材包时，用分层画布（眨眼 + 口型），原图作读包前的后备
  const aa = (flags.aa && records.find(r => r && r.assetId === sprite && (r.aa?.pack || r.aa?.manifest)))?.aa || null
  // 头一样大、按身高站：每张图按自己的脸框缩放，按这个人的身高抬高或压低（lib/stature.js）；
  // 生成的立绘脸框跟这个人平常的差太多（侧身、低头那张认小了）时按平常的算，换到那张时人不会突然大一圈
  const cm = heightOf(person).cm
  const faces = records.filter(r => r && r.faceBox && !r.uploaded).map(r => r.faceBox)
  const placeOf = pic => {
    const record = pic ? records.find(r => r && pic.src === assetUrl(r.assetId)) : null
    return placeSprite({ box: faceBoxOf(record, pic && pic.size), size: pic && pic.size, cm, usual: record && !record.uploaded ? usualFace(faces, pic.size[1]) : 0 })
  }
  const place = placeOf(pics.cur)
  const picture = pic => {
    const at = pic === pics.cur ? place : placeOf(pic)
    const fade = pic === pics.cur ? (pics.prev ? 'is-in' : '') : 'is-out'
    return <img key={pic.src} src={pic.src} alt={entry.name} className={fade || undefined} style={{ '--k': at.k, '--lift': at.lift }} draggable="false" onError={() => setPics(p => (p.cur && p.cur.src === pic.src ? { cur: null, prev: null, broken: pic.src } : { ...p, prev: null }))} />
  }
  const still = pics.cur ? <>{pics.prev && picture(pics.prev)}{picture(pics.cur)}</>
    : !src || pics.broken === src ? <Silhouette name={entry.name} color={color} appearance={person && person.appearance} gender={person && person.gender} />
      : null // 头一回上台、图还在读：读好再出来，不先按没量过的大小露一下
  const [d, db] = DEPTH[entry.depth] || (entry.behind ? HIDING : [1, '0%'])
  const cls = ['fg-actor', speaking && 'is-speaking', reaction && 'is-reacting', uploaded && 'is-upload', leaving && 'is-leaving', aa && 'is-aa', entry.away && 'is-away', entry.peek && 'is-peek', entry.behind && 'is-hiding', entry.down && 'is-down'].filter(Boolean).join(' ')
  return (
    <div className={cls} style={{ '--x': (entry.x ?? actorX(entry.pos)) + '%', '--s': entry.scale ?? 1, '--d': d, '--db': db, '--side': SIDE[entry.pos] || '0%', '--edge': (entry.x ?? actorX(entry.pos)) < 50 ? '-40%' : '40%', '--k': place.k, '--lift': place.lift, '--head': place.head * 100 + '%', zIndex: entry.z }}
      data-name={entry.name} data-enter={entrance || undefined} data-exit={leaving && entry.how ? entry.how : undefined} data-peek={entry.peek || undefined} data-hide={entry.hide || undefined} data-depth={entry.depth || undefined}>
      <div className="fg-actor-turn">
        <div className="fg-actor-react" ref={reactRef}>
          <div className="fg-actor-body">
            {aa ? <AaSprite aa={aa} talk={speaking && talk && talk.key === beat.key ? talk : null} fallback={still} className="fg-aa" label={entry.name} /> : still}
          </div>
        </div>
        {/* 被击倒的人：上半身沉进一团黑雾里，看不清脸（theater.css 的 .is-down），站起来时散掉 */}
        <div className="fg-down-mist" aria-hidden="true"><i /><i /><i /><i /></div>
      </div>
      {(struck === 'hit' || struck === 'crit' || struck === 'block') && <div className="fg-hit-mark" key={'hit' + beat.key} data-effect={struck} style={{ '--impact': HIT_IMPACT_MS + 'ms' }} aria-hidden="true" />}
    </div>
  )
}

const LEAVE_MS = 450

/**
 * 刚离开舞台的人：再留一会儿演完退场动画（平常 LEAVE_MS 毫秒，甩头离开、跑开、慢慢走远按 EXIT_MS）。渲染时就算好，避免先消失一帧再淡出。
 * 怎么走的看这一拍的 exitHow（告别那句说完、下一拍才走的也记在下一拍上）。
 */
function useLeaving(cast, beat) {
  const prev = React.useRef([])
  const leaving = React.useRef(new Map())
  const [, refresh] = React.useReducer(n => n + 1, 0)
  const now = Date.now()
  for (const p of prev.current) {
    if (cast.some(c => c.id === p.id) || leaving.current.has(p.id)) continue
    const how = (beat && beat.exitHow && beat.exitHow[p.name]) || ''
    leaving.current.set(p.id, { entry: how ? { ...p, how } : p, at: now, ms: EXIT_MS[how] || LEAVE_MS })
  }
  for (const c of cast) leaving.current.delete(c.id)
  prev.current = cast
  const pending = leaving.current.size
  React.useEffect(() => {
    if (!pending) return undefined
    const wait = Math.max(16, Math.min(...[...leaving.current.values()].map(l => l.at + l.ms)) - Date.now())
    const t = setTimeout(() => {
      const at = Date.now() + 16
      for (const [name, l] of leaving.current) if (l.at + l.ms <= at) leaving.current.delete(name)
      refresh()
    }, wait)
    return () => clearTimeout(t)
  })
  return [...leaving.current.values()].map(l => l.entry)
}

export function Cast({ beat, view, talk, max = 8, dof = true }) {
  const people = new Map(((view && view.cast) || []).map(p => [p.name, p]))
  let cast = beat.cast || []
  // 导演还没整理、也没有上一幕站位时：说话的已知人物临时站到中间。整理过的轮次台上没人就是没人（便条、画外音）。
  if (!beat.directed && !cast.length && beat.speaker && beat.speaker !== '我' && people.has(beat.speaker)) cast = [{ name: beat.speaker, pos: 'center' }]
  // 分屏时另一头的人只在分屏里出现，主舞台的人往左挪让出右边
  const split = beat.split || null
  if (split) cast = cast.filter(c => !split.who.includes(c.name))
  // 人太多时最久没动静的先下场，剩下的按站位均匀排开。
  // 换了一堂布景（换地方、进出回忆）时同一个人也算新登场：跟着旧画面一起退，在新画面里重新出来，不从旧站位滑到新站位
  // 退场的人按最后在台上那一拍的样子退（从回忆里退下去的还穿着当时的衣服），不在退场途中换成现在的样子
  // 走位（靠近、拉开、上前、背过身、探头、躲到谁身后）叠在排好的站位上；谁挡在谁前面：说话的人在最前，说完也留在前面，躲着的人开口也还在后面
  // 退场的人带着最后在台上时的图层走
  cast = stackLayers(blockLayout(stageLayout(onStage(cast, beat.recent, max)), beat.poses), beat.front).map(entry => ({ ...entry, id: entry.name + '@' + (beat.set || 0), seen: beat }))
  const leaving = useLeaving(cast, beat)
  // 插画全屏盖住舞台：立绘照常在下面，插画收起时直接露出来。
  // 亲密场面（scene.eros 开着）里立绘退下：有插画演插画，还没有就只留背景，不让两个人站着说话；这段结束再回来。
  const veiled = Boolean(beat.scene && beat.scene.eros && beat.scene.eros !== 'none')
  // 浅景深：台上不止一个人、其中有人在说话时，没说话也没反应的人微微虚一点（theater.css 的 [data-talk]）；旁白时谁都不虚；特效开关关掉了（dof）也不虚
  const talking = dof && cast.length > 1 && cast.some(c => (beat.speakers ? beat.speakers.includes(c.name) : beat.speaker === c.name))
  return (
    <div className="fg-cast" data-split={split ? 'on' : undefined} data-veil={veiled ? '' : undefined} data-talk={talking ? '' : undefined}>
      {cast.map(entry => (
        <Actor key={entry.id} entry={entry} person={people.get(entry.name)} beat={beat} emo={beat.emotions[entry.name] || 'neutral'} emotions={view && view.emotions} groups={view && view.poseGroups} talk={talk} />
      ))}
      {leaving.map(entry => (
        <Actor key={entry.id} entry={entry} person={people.get(entry.name)} beat={entry.seen} emo={entry.seen.emotions[entry.name] || 'neutral'} emotions={view && view.emotions} groups={view && view.poseGroups} leaving />
      ))}
    </div>
  )
}

/** 分屏另一头的背景：那个地点这个时段的背景，没有就用同一地点别的时段，再没有就画天空。 */
function splitBackground(location, time, view) {
  const places = (view && view.places) || {}
  if (!location) return ''
  const exact = places[placeKey({ location, time })]
  if (exact && exact.assetId) return assetUrl(exact.assetId)
  const other = Object.entries(places).find(([key, place]) => key.startsWith(location + '|') && place.assetId)
  return other ? assetUrl(other[1].assetId) : ''
}

const SPLIT_LEAVE_MS = 600
const SPLIT_POS = [['center'], ['left', 'right']]

/**
 * 分屏：电话、视频通话、心灵感应的另一头在画面右边单独一格，斜切着滑进来；有插画时让开。
 * 另一头的人按这一句的情绪换表情，说话时一样高亮、对口型。导演写 split: off 或这一轮结束时收起。
 */
export function SplitPanel({ beat, view, talk }) {
  const split = beat.split || null
  const sig = split ? split.who.join('、') + '|' + (split.location || '') : ''
  const last = React.useRef(null)
  const [, refresh] = React.useReducer(n => n + 1, 0)
  const leaving = !split && Boolean(last.current)
  if (split) last.current = { split, sig }
  React.useEffect(() => {
    if (split || !last.current) return undefined
    const t = setTimeout(() => { last.current = null; refresh() }, SPLIT_LEAVE_MS)
    return () => clearTimeout(t)
  }, [sig])
  const shown = split ? { split, sig } : last.current
  if (!shown) return null
  const people = new Map(((view && view.cast) || []).map(p => [p.name, p]))
  const { who, location } = shown.split
  const src = splitBackground(location, beat.scene.time, view)
  const slots = SPLIT_POS[who.length - 1] || SPLIT_POS[1]
  const covered = Boolean(beat.cg && cgSrc(beat.cg, assetUrl))
  return (
    <div className={`fg-split${leaving ? ' is-leaving' : ''}${covered ? ' is-under' : ''}`} key={shown.sig} aria-hidden="true">
      <div className="fg-split-inner">
        <div className="fg-split-bg" style={src ? { backgroundImage: `url("${src}")` } : null}>{!src && <Sky scene={{ time: beat.scene.time, location: location || who[0] }} />}</div>
        <div className="fg-split-cast">
          {who.map((name, i) => (
            <Actor key={name} entry={{ name, pos: slots[i] || 'center' }} person={people.get(name)} beat={beat} emo={beat.emotions[name] || 'neutral'} emotions={view && view.emotions} groups={view && view.poseGroups} talk={talk} />
          ))}
        </div>
        {location && <div className="fg-split-label"><i />{location}</div>}
      </div>
    </div>
  )
}

// 短闪回慢慢沉进去、慢慢浮出来：现在的画面先暗下去、失焦，闪回里的人再浮出来（样式在 theater.css 的 .fg-recall）
const RECALL_IN_MS = 1200
const RECALL_LEAVE_MS = 1000
// 轻的演法（设置里的 face / text）：画面不动，只是四角换个色调；进出快慢按基调（伤感、朦胧慢慢浮上来，不安、猛然想起一下就到）
const RECALL_LIGHT_MS = { warm: 400, sweet: 500, sad: 900, dread: 200, flash: 150, haze: 900 }

/**
 * 短闪回。设置里选「压暗画面」（ghost）时：现在的画面（背景、在场的人、插画、分屏）压暗、褪色、模糊，这一段开口的人以当时的样子半透明浮在前面，
 * 说话的亮一点；进出时起一层薄雾（Flash 按 recallEdge），离开时淡出。没有档案的人（路人、「我」）不浮出来。
 * 其他演法（light）：画面不动，四角按基调换个色调、起一点颗粒，谁也不浮出来（小头像在对话框那边，见 RecallFace）。
 * 基调（data-tone）：导演写的或剧场挑的（beat.recall.tone），设置里固定了一种时用 tone。色调、颗粒、心跳一样的脉动在 theater.css。
 */
export function RecallLayer({ beat, view, talk, light = false, tone = '' }) {
  const recall = beat.recall || null
  const last = React.useRef(null)
  const [, refresh] = React.useReducer(n => n + 1, 0)
  const leaving = !recall && Boolean(last.current)
  if (recall) last.current = { recall, beat }
  React.useEffect(() => {
    if (recall || !last.current) return undefined
    const t = setTimeout(() => { last.current = null; refresh() }, RECALL_LEAVE_MS)
    return () => clearTimeout(t)
  }, [recall])
  const shown = recall ? { recall, beat } : last.current
  if (!shown) return null
  const mood = tone || shown.recall.tone || 'warm'
  if (light) return <div className={`fg-recall is-light${leaving ? ' is-leave' : ''}`} data-tone={mood} style={{ '--fade': (RECALL_LIGHT_MS[mood] || 400) + 'ms' }} aria-hidden="true"><div className="fg-recall-veil" /></div>
  const people = new Map(((view && view.cast) || []).map(p => [p.name, p]))
  const ghosts = stageLayout(shown.recall.who.filter(name => people.has(name)).map(name => ({ name, pos: 'center' })))
  const ghostBeat = { ...shown.beat, then: shown.recall.then, ...(leaving ? { speaker: '', speakers: null, sym: '' } : {}) }
  return (
    <div className={`fg-recall${leaving ? ' is-leave' : ''}`} data-tone={mood} style={{ '--fade': (leaving ? RECALL_LEAVE_MS : RECALL_IN_MS) + 'ms' }} aria-hidden="true">
      <div className="fg-recall-veil" />
      {ghosts.map(entry => (
        <Actor key={entry.name} entry={entry} person={people.get(entry.name)} beat={ghostBeat} emo={shown.beat.emotions[entry.name] || 'neutral'} emotions={view && view.emotions} groups={view && view.poseGroups} talk={leaving ? null : talk} />
      ))}
    </div>
  )
}

/**
 * 短闪回的小头像：回忆里正在开口的人，按当时的样子（导演写的 then）取这句情绪的立绘，裁出脸，放在对话框右上角，色调和出现的样子跟着基调变。
 * 只在台词、心声上出；旁白、没有档案的人、还没画立绘的人不出。
 */
/** 这个人这一拍的脸（小头像用）：立绘的地址和裁成正方形小格的位置（faceCrop）；没有立绘时 src 为空。 */
function useFace(person, beat, view, then = null) {
  const name = person ? person.name : ''
  const sprite = person ? spriteFor(person, beat.turn, beat.emotions[name] || 'neutral', view && view.emotions, then, null, { pose: beat.postures && beat.postures[name], groups: view && view.poseGroups, off: beat.offPoses && beat.offPoses[name] }) : ''
  const src = sprite ? assetUrl(sprite) : ''
  const [size, setSize] = React.useState(null)
  React.useEffect(() => {
    setSize(null)
    if (!src) return undefined
    let live = true
    const img = new Image()
    img.onload = () => { if (live && img.naturalHeight) setSize([img.naturalWidth, img.naturalHeight]) }
    img.src = src
    return () => { live = false }
  }, [src])
  if (!src) return { src: '', crop: null }
  const record = Object.values(person.sprites || {}).find(r => r && r.assetId === sprite)
  return { src, crop: faceCrop(faceBoxOf(record, size), size) }
}

export function RecallFace({ beat, view, tone = '' }) {
  const recall = beat && beat.recall
  const people = new Map(((view && view.cast) || []).map(p => [p.name, p]))
  const name = recall && beat.type !== 'narration' ? (beat.speakers || [beat.speaker]).find(n => recall.who.includes(n) && people.has(n)) : ''
  const person = name ? people.get(name) : null
  const { src, crop } = useFace(person, beat, view, recall && recall.then && recall.then[name])
  if (!src) return null
  return (
    <div className="fg-recall-face" key={name} data-tone={tone || recall.tone || 'warm'} style={{ '--speaker': person.color || undefined }} aria-hidden="true">
      {crop && <img src={src} alt="" draggable="false" style={{ width: crop.width + '%', left: crop.left + '%', top: crop.top + '%' }} />}
    </div>
  )
}

/**
 * 一次出手（playback.js 的 hit）：有招式名时先「唰」地挥出去，打中那一刻（HIT_IMPACT_MS）按效果响一声、震屏或闪一下。不出横幅、不写字。
 * 被打的不在台上（主角「我」、画外的人）时，整个画面替他挨这一下：命中 / 暴击 / 击倒四周泛红，格挡泛蓝，治疗泛绿，闪避只有「唰」的一声。
 * fx 是剧场的落字特效（useHits）。
 */
const HIT_SOUND = { hit: 'impact', crit: 'slam', miss: 'whoosh', block: 'impact', down: 'slam', heal: 'ding' }
const HIT_SHAKE = { hit: [['shake', 1]], crit: [['shake', 3], ['redflash', 1]], block: [['shake', 1]], down: [['shake', 2]] }
export function HitImpact({ beat, sound = true, fx = null }) {
  const hit = beat.hit
  const onStage = (beat.cast || []).some(c => c.name === hit.to)
  const [impact, setImpact] = React.useState(false)
  React.useEffect(() => {
    if (sound && hit.move && hit.effect !== 'heal') stinger('whoosh') // 治疗不是挥出去的一下
    const t = setTimeout(() => {
      setImpact(true)
      if (sound) stinger(HIT_SOUND[hit.effect] || 'impact')
      if (fx) for (const [kind, power] of HIT_SHAKE[hit.effect] || []) fx({ kind, power })
    }, HIT_IMPACT_MS)
    return () => clearTimeout(t)
  }, [])
  return impact && !onStage && hit.effect !== 'miss' ? <div className="fg-hurt" data-effect={hit.effect} aria-hidden="true" /> : null
}

/**
 * 小瞬间（playback.js 的 moment）：拍照（白闪一下，拍立得的白框框住这一刻，外面压暗，下面写题字）、触碰（一圈圈粉色涟漪）、
 * 干杯（两只杯子从两边碰到一起）、做好一道菜 / 新称呼 / 约定 / 交换联系方式（一张小卡片落下来），各响一声合成的拟音（lib/foley.js）。
 * 摸头、戳脸演在被摸的人身上（Actor），人不在台上时只有声音；烟花在天上（Fireworks）。画面上不写拟声、动作的字。
 */
export const MOMENT_HOLD_MS = { photo: 2700, touch: 2200, pat: 1300, poke: 1100, cheers: 1900, cook: 2600, nickname: 2900, promise: 3000, contact: 2600 }
const CLINK_AT_MS = 520
/** 干杯的杯子：按材质画（玻璃是高脚杯，易拉罐、塑料杯、陶瓷 / 木头 / 金属的马克杯）。 */
function Cup({ kind }) {
  if (kind === 'glass') return (
    <svg viewBox="0 0 40 64" aria-hidden="true"><path d="M7 3h26q1 21-13 27Q6 24 7 3z" fill="rgba(235,245,255,.35)" stroke="#fff" strokeWidth="1.6" /><path d="M8.5 12h23q-1.5 14-11.5 16.5Q10 26 8.5 12z" fill="#e8577a" opacity=".85" /><path d="M19 30h2v22h-2z" fill="#fff" /><ellipse cx="20" cy="54" rx="10" ry="2.6" fill="#fff" /></svg>
  )
  if (kind === 'can') return (
    <svg viewBox="0 0 40 64" aria-hidden="true"><rect x="8" y="6" width="24" height="52" rx="4" fill="#d9534f" stroke="#fff" strokeWidth="1.4" /><ellipse cx="20" cy="7" rx="11" ry="2.6" fill="#e9e9ee" /><rect x="8" y="24" width="24" height="12" fill="#fff" opacity=".85" /></svg>
  )
  if (kind === 'plastic') return (
    <svg viewBox="0 0 40 64" aria-hidden="true"><path d="M6 6h28l-4 52H10z" fill="rgba(255,255,255,.5)" stroke="#fff" strokeWidth="1.4" /><path d="M8.6 20h22.8l-2.6 36H11.2z" fill="#f5b041" opacity=".85" /></svg>
  )
  const fill = { wood: '#a8743f', metal: '#c3c8d2' }[kind] || '#f4f1ea'
  return (
    <svg viewBox="0 0 52 64" aria-hidden="true"><path d="M36 20h6q6 0 6 9v4q0 9-6 9h-6" fill="none" stroke={fill} strokeWidth="4" /><rect x="4" y="10" width="33" height="48" rx="5" fill={fill} stroke="#fff" strokeWidth="1.4" /><path d="M4 14q4-8 8-3 4-7 8-1 5-6 9 0 4-5 8 2v4H4z" fill="#fff8e8" /></svg>
  )
}
export function MomentLayer({ beat, view, sound = true }) {
  const m = beat.moment
  const [gone, setGone] = React.useState(false)
  React.useEffect(() => {
    if (sound) {
      if (m.kind === 'cheers') foley('clink-' + (m.text || 'glass'), CLINK_AT_MS)
      else if (MOMENT_FOLEY[m.kind]) foley(MOMENT_FOLEY[m.kind], m.kind === 'pat' || m.kind === 'poke' ? 150 : 0)
    }
    const t = setTimeout(() => setGone(true), MOMENT_HOLD_MS[m.kind] || 2400)
    return () => clearTimeout(t)
  }, [])
  if (gone || m.kind === 'fireworks') return null
  const hold = { '--hold': (MOMENT_HOLD_MS[m.kind] || 2400) - 450 + 'ms' }
  if (m.kind === 'pat' || m.kind === 'poke') return null // 演在被摸的人身上（Actor）；人不在台上时只有声音
  if (m.kind === 'photo') return (
    <div className="fg-moment" data-kind="photo" style={hold} aria-hidden="true">
      <div className="fg-photo-flash" />
      <div className="fg-photo">{m.text && <div className="fg-photo-caption">{m.text}</div>}</div>
    </div>
  )
  if (m.kind === 'touch') return (
    <div className="fg-moment" data-kind="touch" style={hold} aria-hidden="true">
      <i className="fg-touch-ring" /><i className="fg-touch-ring" style={{ animationDelay: '.45s' }} /><i className="fg-touch-ring" style={{ animationDelay: '.9s' }} />
    </div>
  )
  if (m.kind === 'cheers') return (
    <div className="fg-moment" data-kind="cheers" style={{ ...hold, '--clink': CLINK_AT_MS + 'ms' }} aria-hidden="true">
      <div className="fg-cup is-left"><Cup kind={m.text} /></div>
      <div className="fg-cup is-right"><Cup kind={m.text} /></div>
      <i className="fg-clink" />
    </div>
  )
  const person = m.who ? ((view && view.cast) || []).find(p => p.name === m.who) : null
  const color = (person && person.color) || ''
  return (
    <div className="fg-moment" data-kind={m.kind} style={hold} aria-hidden="true">
      <div className="fg-moment-card" style={color ? { '--who': color } : undefined}>
        {m.kind === 'cook' && <>
          <div className="fg-steam"><i /><i /><i /></div>
          <div className="fg-moment-kicker">COMPLETE</div>
          <div className="fg-moment-main">{m.text}</div>
          <div className="fg-moment-sub">做好了</div>
        </>}
        {m.kind === 'nickname' && <>
          <div className="fg-moment-kicker">NEW NAME</div>
          <div className="fg-moment-main">「{m.text}」</div>
          <div className="fg-moment-sub">{m.who ? `${m.who}第一次这样叫你` : '第一次这样叫你'}</div>
        </>}
        {m.kind === 'promise' && <>
          <div className="fg-moment-kicker">PROMISE</div>
          <div className="fg-moment-sub">约定</div>
          <div className="fg-moment-main">{m.text}</div>
          {m.place && <div className="fg-moment-place">{m.place}</div>}
        </>}
        {m.kind === 'contact' && <>
          <div className="fg-moment-kicker">CONTACT</div>
          <div className="fg-contact">
            <i className="fg-contact-face">{m.who ? Array.from(m.who)[0] : '♪'}</i>
            <div><div className="fg-moment-main">{m.who || '新的联系人'}</div><div className="fg-moment-sub">已交换联系方式</div></div>
          </div>
        </>}
      </div>
    </div>
  )
}

/** 烟花：天上错开炸开三朵（颜色不同），每朵炸开时天上跟着亮一下；咻地升空、砰地炸开、噼里啪啦。在背景和立绘之间。 */
const BURSTS = [{ x: 30, y: 24, hue: 340, at: 0 }, { x: 70, y: 16, hue: 45, at: 650 }, { x: 52, y: 30, hue: 195, at: 1300 }]
const FIREWORK_RISE_MS = 700
export const FIREWORKS_MS = 3800
export function Fireworks({ sound = true }) {
  const [gone, setGone] = React.useState(false)
  React.useEffect(() => {
    if (sound) for (const b of BURSTS) { foley('firework-launch', b.at); foley('firework-boom', b.at + FIREWORK_RISE_MS) }
    const t = setTimeout(() => setGone(true), FIREWORKS_MS)
    return () => clearTimeout(t)
  }, [])
  if (gone) return null
  return (
    <div className="fg-fireworks" aria-hidden="true" style={{ '--rise': FIREWORK_RISE_MS + 'ms' }}>
      {BURSTS.map((b, i) => (
        <div key={i} className="fg-firework" style={{ '--x': b.x + '%', '--y': b.y + '%', '--hue': b.hue, '--at': b.at + 'ms' }}>
          <i className="fg-fw-glow" /><i className="fg-fw-trail" /><i className="fg-fw-burst" /><i className="fg-fw-burst is-inner" />
        </div>
      ))}
    </div>
  )
}

// ───────────── 手机 ─────────────
/**
 * 手机（playback.js 的 call / phone）：来电、拨出时手机从右边滑进来响着（对方的头像、名字，接听 / 拒接），接通后收成右上角的「通话中」和计时，
 * 视频通话再挂一个小窗看着对方的脸（分屏里已经看得到他时不挂）；挂断时出一张小卡（通话结束 / 未接来电 / 拒接 / 对方挂断）；
 * 通知、语音留言从上面滑下来一条横幅，不打断。声音都是 lib/foley.js 合成的。
 */
export const PHONE_END_MS = 2600
export const PHONE_BANNER_MS = { notify: 3800, voicemail: 4800 }
const callClock = new Map() // 每通电话接通的时刻（挂断时那张卡上写通了多久）
const clock = ms => { const s = Math.max(0, Math.round(ms / 1000)); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}` }
const firstChar = name => Array.from(String(name || ''))[0] || '?'
/** 联系人头像：有立绘的裁出脸，没有的写名字的第一个字。 */
function PhoneFace({ person, beat, view, name, className = 'fg-phone-face' }) {
  const { src, crop } = useFace(person, beat, view)
  return (
    <div className={className} style={person && person.color ? { '--who': person.color } : undefined}>
      {src && crop ? <img src={src} alt="" draggable="false" style={{ width: crop.width + '%', left: crop.left + '%', top: crop.top + '%' }} /> : <span>{firstChar(name)}</span>}
    </div>
  )
}
const personOf = (view, name) => (name ? ((view && view.cast) || []).find(p => p.name === name) : null) || null
const HANDSET = <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1z" fill="currentColor" /></svg>
const CAMERA = <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h11a2 2 0 0 1 2 2v1.5l4-2.5v10l-4-2.5V16a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z" fill="currentColor" /></svg>

/** 响着的手机：打来的有接听、拒接两个键、跟着铃声一震一震；拨出去的写「正在呼叫…」，只有挂断键。每一拍还在响就再响一遍。 */
export function PhoneRing({ beat, view, sound = true }) {
  const call = beat.call
  React.useEffect(() => { if (sound) foley(PHONE_FOLEY[call.dir === 'in' ? 'call' : 'dial']) }, [beat.key])
  const person = personOf(view, call.who)
  const incoming = call.dir === 'in'
  const label = incoming ? (call.video ? '视频通话邀请' : '来电') : call.video ? '正在发起视频通话…' : '正在呼叫…'
  return (
    <div className="fg-phone" data-dir={call.dir} data-video={call.video ? '' : undefined} data-side={beat.split ? 'left' : undefined} aria-hidden="true">
      <div className="fg-phone-card">
        <div className="fg-phone-label">{call.video && CAMERA}{label}</div>
        <div className="fg-phone-avatar">{incoming && <><i className="fg-phone-ripple" /><i className="fg-phone-ripple" style={{ animationDelay: '.6s' }} /></>}<PhoneFace person={person} beat={beat} view={view} name={call.who} /></div>
        <div className="fg-phone-name">{call.who || '未知号码'}</div>
        <div className="fg-phone-keys">
          <i className="fg-phone-key is-decline">{HANDSET}</i>
          {incoming && <i className="fg-phone-key is-accept">{call.video ? CAMERA : HANDSET}</i>}
        </div>
      </div>
    </div>
  )
}

/** 接通后右上角的「通话中」：对方的名字和走着的计时，视频通话是摄像机的小标。 */
export function CallChip({ call, sound = true }) {
  const [now, setNow] = React.useState(() => Date.now())
  React.useEffect(() => {
    if (!callClock.has(call.id)) callClock.set(call.id, Date.now())
    if (sound) foley(PHONE_FOLEY.pickup)
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  return (
    <span className="fg-pill fg-call-chip" data-video={call.video ? '' : undefined} title={call.video ? '视频通话中' : '通话中'}>
      <i className="fg-call-dot" />{call.video ? CAMERA : HANDSET}{call.who || '通话中'}<b>{clock(now - (callClock.get(call.id) || now))}</b>
    </span>
  )
}

/** 视频通话的小窗：对方的脸，他说话时边框亮起来。 */
export function VideoPip({ beat, view }) {
  const call = beat.call
  const person = personOf(view, call.who)
  const talking = (beat.speakers || [beat.speaker]).includes(call.who)
  return (
    <div className={`fg-pip${talking ? ' is-talking' : ''}`} aria-hidden="true">
      <PhoneFace person={person} beat={beat} view={view} name={call.who} className="fg-pip-face" />
      <div className="fg-pip-name"><i />{call.who || '视频通话'}</div>
    </div>
  )
}

/** 挂断那一句：一张小卡写怎么结束的（通了多久、没接通、拒接、对方挂断），对方挂断、对方拒接是忙音。 */
const END_TEXT = {
  missed: { in: '未接来电', out: '无人接听' },
  declined: { in: '已拒接', out: '对方已拒接' },
  hungup: { in: '对方挂断了', out: '对方挂断了' },
}
export function PhoneEnd({ beat, view, sound = true }) {
  const end = beat.phone
  const dir = end.dir || 'in'
  const [gone, setGone] = React.useState(false)
  const started = end.live && end.id ? callClock.get(end.id) : 0
  React.useEffect(() => {
    if (sound) foley(end.result === 'hungup' || (end.result === 'declined' && dir === 'out') ? PHONE_FOLEY.busy : end.result === 'missed' && dir === 'in' ? '' : PHONE_FOLEY.end)
    const t = setTimeout(() => setGone(true), PHONE_END_MS)
    return () => clearTimeout(t)
  }, [])
  const [ended] = React.useState(() => Date.now())
  if (gone) return null
  const text = end.result ? END_TEXT[end.result][dir] : '通话结束'
  return (
    <div className="fg-phone is-end" data-result={end.result || 'ended'} style={{ '--hold': PHONE_END_MS - 450 + 'ms' }} aria-hidden="true">
      <div className="fg-phone-card">
        <div className="fg-phone-avatar"><PhoneFace person={personOf(view, end.who)} beat={beat} view={view} name={end.who} /></div>
        <div className="fg-phone-name">{end.who || '通话'}</div>
        <div className="fg-phone-result"><i>{HANDSET}</i>{text}{!end.result && started ? ` · ${clock(ended - started)}` : ''}</div>
      </div>
    </div>
  )
}

/** 通知、语音留言：从上面滑下来一条横幅（发送的人、一句话），叮咚一声，过一会儿自己收回去。 */
export function PhoneBanner({ beat, view, sound = true }) {
  const m = beat.phone
  const [gone, setGone] = React.useState(false)
  const hold = PHONE_BANNER_MS[m.kind] || 3800
  React.useEffect(() => {
    if (sound) foley(PHONE_FOLEY[m.kind])
    const t = setTimeout(() => setGone(true), hold)
    return () => clearTimeout(t)
  }, [])
  if (gone) return null
  const person = personOf(view, m.who)
  const voicemail = m.kind === 'voicemail'
  return (
    <div className="fg-notify" data-kind={m.kind} style={{ '--hold': hold - 500 + 'ms' }} aria-hidden="true">
      <PhoneFace person={person} beat={beat} view={view} name={m.who || (voicemail ? '留' : '通')} className="fg-notify-icon" />
      <div className="fg-notify-body">
        <div className="fg-notify-head"><b>{voicemail ? `语音留言 · ${m.who || '未知号码'}` : m.who || '通知'}</b><span>现在</span></div>
        {voicemail && <div className="fg-notify-wave"><i className="fg-notify-play" />{Array.from({ length: 18 }, (_, i) => <i key={i} style={{ '--h': 30 + ((i * 37) % 70) + '%', animationDelay: -i * 0.09 + 's' }} />)}</div>}
        <div className="fg-notify-text">{voicemail ? `「${m.text}」` : m.text}</div>
      </div>
    </div>
  )
}

/** 竖版插画比舞台高得多时露出的比例（舞台高 ÷ 铺满宽度后的图高）；够矮、用铺满就行的返回 0。 */
const PAN_BELOW = 0.85
function usePanRatio(ref, src, version) {
  const [state, setState] = React.useState({ src: '', ratio: 0 })
  const w = version && version.width
  const h = version && version.height
  React.useLayoutEffect(() => {
    if (!src) return undefined
    let off = false
    let dims = w && h ? [w, h] : null
    const measure = () => {
      const el = ref.current
      if (off || !el || !dims || !el.clientWidth) return
      const ratio = (el.clientHeight / el.clientWidth) / (dims[1] / dims[0])
      setState({ src, ratio: ratio < PAN_BELOW ? ratio : 0 })
    }
    // 旧版本没记尺寸：读一下图片本身。
    if (!dims) {
      const probe = new Image()
      probe.onload = () => { dims = [probe.naturalWidth, probe.naturalHeight]; measure() }
      probe.src = src
    }
    measure()
    const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(measure) : null
    if (ro && ref.current) ro.observe(ref.current)
    return () => { off = true; if (ro) ro.disconnect() }
  }, [src, w, h])
  return state.src === src ? state.ratio : 0
}

/** 一张插画：出现、停留、收起都在同一个元素上演（收起时 leaving 为真，样式换成消失的那段动画）。 */
function CgFrame({ img, src, mood, leaving, sound }) {
  const box = React.useRef(null)
  const enter = cgEntrance(img, mood)
  // 冲击着出现时「咚」一声（跟着音效开关，快进时不响）
  React.useEffect(() => { if (sound && !leaving && enter === 'impact') stinger('impact') }, [])
  const ratio = usePanRatio(box, src, img.versions && img.versions[img.current])
  // 竖版：停在顶上 → 慢慢看到底 → 拉远露出全貌，停在全貌；越长看得越久，只看一遍。横版按导演选的动态（默认静止）。
  const pan = ratio ? { '--r': ratio.toFixed(4), '--pan': `${Math.round(16 + (1 - ratio) * 16)}s` } : null
  return (
    <div className={`fg-cg${ratio ? ' is-tall' : ''}${leaving ? ' is-leaving' : ''}`} ref={box} style={pan}
      data-in={enter} data-out={cgExit(img, mood)} data-motion={cgStay(img)}>
      <div className="fg-cg-art">
        {ratio
          ? <><div className="fg-cg-back" style={{ backgroundImage: `url("${src}")` }} /><img className="fg-cg-pan" src={src} alt="" draggable={false} /></>
          : <div className="fg-cg-img" style={{ backgroundImage: `url("${src}")` }} />}
      </div>
    </div>
  )
}

/**
 * 插画层：出现、消失、停留时的动态按导演给这张插画写的 enter / leave / motion（见 lib/vocab.js 的 CG_INS 等），没写的按基调定快慢。
 * 收起或被下一张顶掉的那张留着演完消失动画再移除；渲染时就记好，免得先空一帧。同一张换了版本直接换，不演消失。
 */
export function CgLayer({ beat, sound = false }) {
  const img = beat.cg
  const src = cgSrc(img, assetUrl)
  const cur = src ? { img, src, key: img.id + ':' + img.current, mood: beat.scene && beat.scene.mood } : null
  const prev = React.useRef(null)
  const ghosts = React.useRef([])
  const [, refresh] = React.useReducer(n => n + 1, 0)
  const was = prev.current
  if (was && (!cur || was.key !== cur.key)) {
    ghosts.current = ghosts.current.filter(g => g.key !== was.key)
    const ms = CG_OUT_MS[cgExit(was.img, was.mood)]
    if (ms && (!cur || was.img.id !== cur.img.id)) ghosts.current.push({ ...was, until: Date.now() + ms })
  }
  prev.current = cur
  if (cur) {
    // 同一张插画接着显示：出现时的基调留着，免得读到中途基调变了、收起的快慢跟着变
    if (was && was.key === cur.key) cur.mood = was.mood
    ghosts.current = ghosts.current.filter(g => g.key !== cur.key)
  }
  const pending = ghosts.current.length
  React.useEffect(() => {
    if (!pending) return undefined
    const wait = Math.max(0, Math.min(...ghosts.current.map(g => g.until)) - Date.now())
    const t = setTimeout(() => { const now = Date.now() + 16; ghosts.current = ghosts.current.filter(g => g.until > now); refresh() }, wait)
    return () => clearTimeout(t)
  })
  const frames = [...ghosts.current.map(g => ({ ...g, leaving: true })), ...(cur ? [{ ...cur, leaving: false }] : [])]
  const waiting = !cur && img && img.status !== 'failed' && img.status !== 'cancelled'
  return (
    <>
      {frames.map(f => <CgFrame key={f.key} img={f.img} src={f.src} mood={f.mood} leaving={f.leaving} sound={sound} />)}
      {waiting && <div className="fg-cg-wait"><i />{img.status === 'writing' ? '插画分镜中' : '插画绘制中'}{img.title ? `「${img.title}」` : ''}</div>}
    </>
  )
}

/** 地点标题卡：换了地方、进出特殊段落时出现；有过场字卡时等字卡收起再出。 */
export function TitleCard({ beat, delay = 0 }) {
  if (!beat.sceneEnter || !beat.scene.location) return null
  return (
    <div className="fg-titlecard" key={beat.key} style={delay ? { animationDelay: delay + 'ms' } : null}>
      <div className="fg-titlecard-line" />
      <div className="fg-titlecard-name">{beat.scene.location}</div>
      <div className="fg-titlecard-sub">{[MODE_LABEL[beat.mode], TIME_LABEL[beat.scene.time], beat.scene.weather !== 'clear' ? WEATHER_LABEL[beat.scene.weather] : ''].filter(Boolean).join(' · ')} — Turn {beat.turn}</div>
      <div className="fg-titlecard-line" style={{ width: '14cqw', marginTop: '1cqw' }} />
    </div>
  )
}

/** 过场字卡停留多久（毫秒）：这段时间里这句先不出字，点一下跳过。 */
export const CUT_MS = 2300

/**
 * 画面在变的时候这句先不出字（毫秒），留一点酝酿情绪的时间，点一下跳过：
 * 起雾转场（进出回忆）等雾散开一些；短闪回沉进去、浮出来时等画面暗下去 / 亮回来。
 */
export const HAZE_MS = 1800
export const RECALL_HOLD_MS = { in: 1100, out: 800 }

/** 过场字卡：时间跳跃、日期、章节、与此同时。全屏压暗，字卡收起后再出这句的字。 */
export function CutCard({ beat, out }) {
  const cut = beat.cut
  if (!cut) return null
  return (
    <div className={`fg-cut${out ? ' is-out' : ''}`} data-kind={cut.kind} key={beat.key} aria-live="polite">
      <div className="fg-cut-inner">
        <div className="fg-cut-kicker"><i />{CUT_LABEL[cut.kind] || ''}<i /></div>
        <div className="fg-cut-text">{cut.text}</div>
      </div>
    </div>
  )
}

/**
 * 气氛层：值变了时新的一层淡入、旧的一层淡出（基调色调、光线、画面效果、特殊段落滤镜都用它）。
 * value 为空就是没有这一层；className 下的 data-v 决定样子，样式在 theater.css。
 */
export function FadeLayer({ name, value, ms = 1200 }) {
  const [layers, setLayers] = React.useState(() => [{ id: 0, value }])
  React.useEffect(() => {
    setLayers(list => {
      const top = list[list.length - 1]
      if (top.value === value) return list
      return [...list.filter(l => !l.leaving).map(l => ({ ...l, leaving: true })), { id: top.id + 1, value }]
    })
  }, [value])
  React.useEffect(() => {
    if (!layers.some(l => l.leaving)) return undefined
    const t = setTimeout(() => setLayers(list => list.filter(l => !l.leaving)), ms)
    return () => clearTimeout(t)
  }, [layers])
  return layers.filter(l => l.value).map(l => (
    <div key={l.id} className={`fg-${name}${l.leaving ? ' is-leave' : ''}`} data-v={l.value} style={{ '--fade': ms + 'ms' }} aria-hidden="true" />
  ))
}

/** 震动强度 1~3：位移（占元素宽高的百分比）和时长。 */
const QUAKE = [[0, 0], [0.6, 300], [1.2, 420], [2, 560]]
function quake(el, power) {
  const [amp, ms] = QUAKE[power] || QUAKE[1]
  const path = [0, -1, 0.8, -0.7, 0.5, -0.3, 0.15, 0]
  el.animate(path.map((k, i) => ({ transform: `translate(${(k * amp).toFixed(3)}%, ${((i % 2 ? -0.6 : 0.6) * k * amp).toFixed(3)}%)` })), { duration: ms, easing: 'linear' })
}

/**
 * 落字特效：演出计划（lib/typing.js）在某个字上要的震屏、震对话框、闪白 / 红闪、音效。
 * 用 Web Animations 直接动舞台和对话框，不碰镜头的推拉摇。系统设了「减少动态效果」时只留声音；声音跟音效开关走。
 */
export function useHits(stageRef, flashRef, soundOn) {
  const sound = React.useRef(soundOn)
  sound.current = soundOn
  return React.useCallback(f => {
    if (f.kind === 'sound') { if (sound.current) stinger(f.sound); return }
    if (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const stage = stageRef.current
    if (!stage || typeof stage.animate !== 'function') return
    if (f.kind === 'shake') quake(stage, f.power)
    else if (f.kind === 'box') { const box = stage.querySelector('.fg-dialog'); if (box) quake(box, f.power) }
    else if (f.kind === 'flash' || f.kind === 'redflash') {
      const el = flashRef.current
      if (!el) return
      el.classList.toggle('is-red', f.kind === 'redflash')
      el.animate([{ opacity: 0.25 + 0.25 * f.power }, { opacity: 0 }], { duration: 260 + 120 * f.power, easing: 'ease-out' })
    }
  }, [stageRef, flashRef])
}

/**
 * 台上某人脸的位置（占镜头框的 %）。按布局算（offsetLeft / offsetTop 不受正在演的反应、转身、镜头本身的缩放影响）：
 * 立绘用 left 定位、translateX(-50%) 居中，所以 offsetLeft 就是中线；脸的中心在额头（--head，lib/stature.js 的 placeSprite）往下
 * 「额头到脸框上沿 + 半个脸框」那么多（按这张图的缩放 --k）。人不在台上返回 null。
 */
export function faceAt(camera, name) {
  if (!camera || !name) return null
  const actor = [...camera.querySelectorAll('.fg-actor:not(.is-leaving)')].find(el => el.dataset.name === name)
  if (!actor || !camera.offsetWidth || !camera.offsetHeight) return null
  let x = actor.offsetLeft
  const head = parseFloat(actor.style.getPropertyValue('--head'))
  const k = parseFloat(actor.style.getPropertyValue('--k')) || 1
  let y = actor.offsetTop + actor.offsetHeight * ((Number.isFinite(head) ? head / 100 : 0.1) + (0.08 + FACE_RATIO / 2) * k)
  for (let el = actor.offsetParent; el && el !== camera && camera.contains(el); el = el.offsetParent) { x += el.offsetLeft; y += el.offsetTop }
  return [x / camera.offsetWidth * 100, y / camera.offsetHeight * 100]
}

/**
 * 镜头：每一拍重新来一次。推近、特写、仰拍这类停在推到的地方，下一拍缓回来（theater.css 的过渡）；
 * 震动、甩镜、闪白这类演一下就完。对准谁看 camOn，不写是说话的人；按这一拍台上的站位算（所以等这一拍的立绘排好、下一帧再动）。
 */
export function useCamera(beat, cameraRef) {
  const [cam, setCam] = React.useState({ kind: '', style: null })
  React.useEffect(() => {
    setCam(c => (c.kind ? { kind: '', style: null } : c))
    if (!beat || !beat.cam) return undefined
    const raf = requestAnimationFrame(() => {
      const who = beat.camOn || (beat.speakers ? beat.speakers[0] : beat.speaker)
      setCam({ kind: beat.cam, style: aimCamera(beat.cam, faceAt(cameraRef && cameraRef.current, who)) })
    })
    return () => cancelAnimationFrame(raf)
  }, [beat && beat.key])
  return cam
}

const TRANSITION_OVERLAY = { flash: '', black: 'is-black', blink: 'is-blink', glitch: 'is-glitch', haze: 'is-haze' }

// 进短闪回时按基调起一下：甜蜜泛起一层粉光、不安画面撕裂泛红、猛然想起白闪一下、朦胧起雾；温暖、伤感的直接慢慢浮上来
const RECALL_ENTRY = { sweet: 'is-bloom', dread: 'is-dread', flash: 'is-snap', haze: 'is-mist' }

/**
 * recallStyle 是设置里短闪回的演法（「压暗画面」进出都起薄雾），tone 是设置里固定的基调（不固定时用导演写的 / 剧场挑的）。
 * wake：从回忆里醒过来的那一句（playback.js 的 beatHold），rising 时回忆正在褪白，之后白慢慢散开、露出现在的画面。
 * changed：这一拍演一次换场（changePlan），黑场、白闪、闭眼这些由 SceneCover 在换场时间线上演，这里不再叠一层。
 * recallFx：短闪回的画面开着（特效开关），关掉了进出闪回时不起光、不起雾。
 */
export function Flash({ beat, recallStyle = 'text', tone = '', wake = false, rising = false, changed = false, recallFx = true }) {
  if (!beat) return null
  if (wake) return <div key={beat.key} className={`fg-flash is-wake${rising ? ' is-rising' : ''}`} style={{ '--rise': WAKE_SWAP_MS + 'ms', '--clear': WAKE_MS - WAKE_SWAP_MS + 'ms' }} />
  const kind = beat.cam === 'flash' ? '' : beat.cam === 'redflash' ? 'is-red' : beat.cam === 'fadeblack' ? 'is-black' : null
  const tr = changed ? null : TRANSITION_OVERLAY[beat.transition] ?? null // 换场时盖住画面的那一层由 SceneCover 演
  const entry = recallFx && beat.recallEdge === 'in' ? RECALL_ENTRY[tone || (beat.recall && beat.recall.tone)] : null
  const cls = kind ?? tr ?? entry ?? (recallFx && beat.recallEdge && recallStyle === 'ghost' ? 'is-mist' : null)
  if (cls === null) return null
  return <div key={beat.key} className={`fg-flash ${cls}`} />
}

export { Particles }
