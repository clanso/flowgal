// 舞台：背景（生成图 / 程序化天空）、时段调色、天气粒子、立绘、漫画符号、CG、镜头与闪光、地点标题卡，
// 以及逐句可变的气氛：基调色调、光线、画面效果、特殊段落的滤镜、过场字卡。
import React from 'react'
import { assetUrl } from '../api.js'
import { Particles } from './particles.js'
import { SKY, placeKey, actorX, onStage, stageLayout, cgSrc, cgEntrance, cgExit, cgStay, CG_OUT_MS, TRANSITION_MS, TIME_LABEL, WEATHER_LABEL, MODE_LABEL, CUT_LABEL } from './playback.js'
import { SYMBOL_SVG } from './symbols.js'
import { lookAt, pickSprite, thenLook } from '../../../lib/look.js'
import { AaSprite } from './AaSprite.jsx'
import { stinger } from './audio.js'

/** 转场的动画；时长在 playback.js 的 TRANSITION_MS（换场时对话框按它让开）。 */
const TRANSITION_ANIM = {
  dissolve: 'fg-dissolve', fade: 'fg-fade-slow', cinematic: 'fg-cinematic', wipe: 'fg-wipe', iris: 'fg-iris',
  strips: 'fg-wipe', black: 'fg-black-in', flash: 'fg-flash-in', blink: 'fg-blink-in', glitch: 'fg-glitch-in',
  swirl: 'fg-swirl-in', haze: 'fg-haze-in', none: 'none',
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

/** 背景层：换图时新层带转场进入，旧层淡出后移除。 */
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
    const t = setTimeout(() => setLayers(list => list.filter(l => !l.leaving)), 1900)
    return () => clearTimeout(t)
  }, [layers])
  return (
    <>
      {layers.map(layer => {
        const [anim, dur] = TRANSITION[layer.tr] || TRANSITION.dissolve
        const cls = ['fg-bg', layer.bg.src ? 'is-image' : '', layer.enter && layer.tr !== 'none' ? 'is-enter' : '', layer.leaving ? 'is-leave' : ''].join(' ')
        return (
          <div key={layer.id} className={cls} data-tr={layer.tr} data-out={layer.leaving ? layer.out : undefined} style={{ '--enter-anim': anim, '--enter-dur': dur, backgroundImage: layer.bg.src ? `url("${layer.bg.src}")` : undefined }}>
            {!layer.bg.src && <Sky scene={layer.scene} />}
          </div>
        )
      })}
    </>
  )
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

/** 漫画符号：弹出、按种类做小动作（爱心跳、怒筋抖、Zzz 往上飘……），life 秒后淡掉。 */
export function MangaSymbol({ kind, life = 2.6 }) {
  const svg = SYMBOL_SVG[kind]
  if (!svg) return null
  return <span className="fg-symbol" data-kind={kind} style={{ '--life': life + 's' }}><span className="fg-symbol-art" dangerouslySetInnerHTML={{ __html: svg }} /></span>
}

/**
 * 这一拍该用的立绘：按这一轮的样子（外貌、服装、长期状态）找对应情绪的差分，新情绪没画好时先用它的基础情绪。
 * 段落里导演写了这个人当时的样子（then）就按当时的找；还没画好时先显示剪影，不借现在那套。
 */
function spriteFor(person, turn, emo, emotions, then = null) {
  if (!person || !person.timeline) return ''
  const custom = (emotions || []).find(e => e.id === emo)
  const now = lookAt(person.timeline, turn)
  const look = then ? thenLook(now, then, person.timeline.outfits) : now
  return pickSprite(person.sprites, look, emo, custom ? custom.base : '', { strict: Boolean(then) })
}

/** 登场从靠近的那一侧滑进来，退场往同一侧淡出。 */
const SIDE = { farleft: '-40%', left: '-28%', center: '0%', right: '28%', farright: '40%' }

function Actor({ entry, person, beat, emo, emotions, leaving = false, talk = null }) {
  const speaking = !leaving && (beat.speakers ? beat.speakers.includes(entry.name) : beat.speaker === entry.name)
  const sprite = spriteFor(person, beat.turn, emo, emotions, beat.then && beat.then[entry.name])
  const src = sprite ? assetUrl(sprite) : ''
  const color = (person && person.color) || '#9b7bff'
  const [shown, setShown] = React.useState(src)
  const [swap, setSwap] = React.useState(false)
  React.useEffect(() => {
    if (src === shown) return undefined
    if (!src) { setShown(''); return undefined }
    // 先在后台加载好再换，避免表情切换时闪白。
    const img = new Image()
    img.onload = () => { setShown(src); setSwap(true) }
    img.src = src
    const t = setTimeout(() => setSwap(false), 300)
    return () => clearTimeout(t)
  }, [src])
  const uploaded = Boolean(person && Object.values(person.sprites || {}).some(r => r && r.assetId === sprite && r.uploaded))
  // 立绘记录带逆转式素材包时，用分层画布（眨眼 + 口型），原图作读包前的后备
  const aa = (person && Object.values(person.sprites || {}).find(r => r && r.assetId === sprite && (r.aa?.pack || r.aa?.manifest)))?.aa || null
  const still = shown ? <img src={shown} alt={entry.name} className={swap ? 'is-swap' : ''} draggable="false" /> : <Silhouette name={entry.name} color={color} appearance={person && person.appearance} gender={person && person.gender} />
  return (
    <div className={`fg-actor${speaking ? ' is-speaking' : ''}${uploaded ? ' is-upload' : ''}${leaving ? ' is-leaving' : ''}${aa ? ' is-aa' : ''}`} style={{ '--x': (entry.x ?? actorX(entry.pos)) + '%', '--s': entry.scale ?? 1, '--side': SIDE[entry.pos] || '0%' }} data-name={entry.name}>
      <div className="fg-actor-body">
        {aa ? <AaSprite aa={aa} talk={speaking && talk && talk.key === beat.key ? talk : null} fallback={still} className="fg-aa" label={entry.name} /> : still}
      </div>
      {speaking && beat.sym && (
        <div className="fg-symbol-anchor"><MangaSymbol key={beat.key} kind={beat.sym} /></div>
      )}
    </div>
  )
}

const LEAVE_MS = 450

/** 刚离开舞台的人：再留 LEAVE_MS 毫秒演完退场动画。渲染时就算好，避免先消失一帧再淡出。 */
function useLeaving(cast) {
  const prev = React.useRef([])
  const leaving = React.useRef(new Map())
  const [, refresh] = React.useReducer(n => n + 1, 0)
  const now = Date.now()
  for (const p of prev.current) if (!cast.some(c => c.name === p.name) && !leaving.current.has(p.name)) leaving.current.set(p.name, { entry: p, at: now })
  for (const c of cast) leaving.current.delete(c.name)
  prev.current = cast
  const pending = leaving.current.size
  React.useEffect(() => {
    if (!pending) return undefined
    const t = setTimeout(() => {
      const cut = Date.now() - LEAVE_MS
      for (const [name, l] of leaving.current) if (l.at <= cut) leaving.current.delete(name)
      refresh()
    }, LEAVE_MS)
    return () => clearTimeout(t)
  })
  return [...leaving.current.values()].map(l => l.entry)
}

export function Cast({ beat, view, talk, max = 5 }) {
  const people = new Map(((view && view.cast) || []).map(p => [p.name, p]))
  let cast = beat.cast || []
  // 导演还没整理、也没有上一幕站位时：说话的已知人物临时站到中间。整理过的轮次台上没人就是没人（便条、画外音）。
  if (!beat.directed && !cast.length && beat.speaker && beat.speaker !== '我' && people.has(beat.speaker)) cast = [{ name: beat.speaker, pos: 'center' }]
  // 分屏时另一头的人只在分屏里出现，主舞台的人往左挪让出右边
  const split = beat.split || null
  if (split) cast = cast.filter(c => !split.who.includes(c.name))
  // 人太多时最久没动静的先下场，剩下的按站位均匀排开
  cast = stageLayout(onStage(cast, beat.recent, max))
  const leaving = useLeaving(cast)
  // 插画全屏盖住舞台：立绘照常在下面，插画收起时直接露出来。
  return (
    <div className="fg-cast" data-split={split ? 'on' : undefined}>
      {cast.map(entry => (
        <Actor key={entry.name} entry={entry} person={people.get(entry.name)} beat={beat} emo={beat.emotions[entry.name] || 'neutral'} emotions={view && view.emotions} talk={talk} />
      ))}
      {leaving.map(entry => (
        <Actor key={entry.name} entry={entry} person={people.get(entry.name)} beat={beat} emo={beat.emotions[entry.name] || 'neutral'} emotions={view && view.emotions} leaving />
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
            <Actor key={name} entry={{ name, pos: slots[i] || 'center' }} person={people.get(name)} beat={beat} emo={beat.emotions[name] || 'neutral'} emotions={view && view.emotions} talk={talk} />
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

/**
 * 短闪回：现在的画面（背景、在场的人、插画、分屏）压暗、褪色、模糊，这一段开口的人以当时的样子半透明浮在前面，说话的亮一点。
 * 进出时起一层薄雾（Flash 按 recallEdge），离开时淡出。没有档案的人（路人、「我」）不浮出来。
 */
export function RecallLayer({ beat, view, talk }) {
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
  const people = new Map(((view && view.cast) || []).map(p => [p.name, p]))
  const ghosts = stageLayout(shown.recall.who.filter(name => people.has(name)).map(name => ({ name, pos: 'center' })))
  const ghostBeat = { ...shown.beat, then: shown.recall.then, ...(leaving ? { speaker: '', speakers: null, sym: '' } : {}) }
  return (
    <div className={`fg-recall${leaving ? ' is-leave' : ''}`} style={{ '--fade': (leaving ? RECALL_LEAVE_MS : RECALL_IN_MS) + 'ms' }} aria-hidden="true">
      <div className="fg-recall-veil" />
      {ghosts.map(entry => (
        <Actor key={entry.name} entry={entry} person={people.get(entry.name)} beat={ghostBeat} emo={shown.beat.emotions[entry.name] || 'neutral'} emotions={view && view.emotions} talk={leaving ? null : talk} />
      ))}
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

/** 镜头：每一拍重新触发一次动画。 */
export function useCamera(beat) {
  const [cam, setCam] = React.useState('')
  React.useEffect(() => {
    setCam('')
    if (!beat || !beat.cam) return undefined
    const raf = requestAnimationFrame(() => setCam(beat.cam))
    return () => cancelAnimationFrame(raf)
  }, [beat && beat.key])
  return cam
}

const TRANSITION_OVERLAY = { flash: '', black: 'is-black', blink: 'is-blink', glitch: 'is-glitch', haze: 'is-haze' }

export function Flash({ beat }) {
  if (!beat) return null
  const kind = beat.cam === 'flash' ? '' : beat.cam === 'redflash' ? 'is-red' : beat.cam === 'fadeblack' ? 'is-black' : null
  const tr = TRANSITION_OVERLAY[beat.transition] ?? null
  const cls = kind ?? tr ?? (beat.recallEdge ? 'is-mist' : null)
  if (cls === null) return null
  return <div key={beat.key} className={`fg-flash ${cls}`} />
}

export { Particles }
