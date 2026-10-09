// 逆转式立绘工作台（一个角色）：勾选差分（单选 / 多选 / 全选），在图上框好两只眼睛和嘴，
// 用 NovelAI 局部重绘做出半闭眼、闭眼、嘴半张、嘴张开四个状态；浏览器把重画的那一小块切成软边贴片，
// 按素材包挂到这张差分上（静止帧就是原图，只做一帧、不呼吸）。做好的当场能看它眨眼、说话，哪个状态不满意单独重画。
// 宿主没有图片库：垫白底、切贴片都在这里用画布做；宿主只负责带着 Key 去请求、按框画遮罩、存素材包。
import React from 'react'
import { api, assetUrl, toast } from '../api.js'
import { AaSprite } from './AaSprite.jsx'
import { emotionLabel } from './playback.js'
import { AA_PARTS, AA_STEPS, defaultRects, rectsBox, stillPack } from '../../../lib/aa-sprite.js'
import { planLine } from '../../../lib/typing.js'

const FEATHER = 3 // 贴片边缘羽化的像素（跟最早的 Python 版一样）
const BOX_NAMES = { eyes: ['左眼', '右眼'], mouth: ['嘴'] }

const loadImage = src => new Promise((resolve, reject) => {
  const img = new Image()
  img.onload = () => resolve(img)
  img.onerror = () => reject(new Error('图片读不出来'))
  img.src = src
})
const makeCanvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c }
const readBlob = blob => new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(r.result); r.onerror = reject; r.readAsDataURL(blob) })
const assetDataUrl = async id => readBlob(await (await fetch(assetUrl(id))).blob())

/** 框边往里的羽化：贴片在框边上全透明，往里 FEATHER 像素后完全不透明（平滑过渡）。 */
function feather(x, y, [x0, y0, x1, y1]) {
  const d = Math.min(x - x0, x1 - 1 - x, y - y0, y1 - 1 - y)
  if (d < 0) return 0
  const t = Math.min(1, Math.max(0, (d - 0.5) / FEATHER))
  return t * t * (3 - 2 * t)
}

/**
 * 从重画后的整张图里切出这个部件的贴片：只取框里，透明度 = 原图透明度 × 羽化，贴回原图正好接上。
 * gen 是重画结果（垫过白底、可能比原图大一圈），src 是原图的像素（取透明度）。
 */
function cutPatch(gen, src, list, padW, padH) {
  const [x0, y0, x1, y1] = rectsBox(list)
  const w = x1 - x0, h = y1 - y0
  const c = makeCanvas(w, h)
  const g = c.getContext('2d')
  const kx = gen.naturalWidth / padW, ky = gen.naturalHeight / padH
  g.drawImage(gen, x0 * kx, y0 * ky, w * kx, h * ky, 0, 0, w, h)
  const d = g.getImageData(0, 0, w, h)
  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      const X = x0 + px, Y = y0 + py
      const soft = Math.max(...list.map(r => feather(X, Y, r)))
      const alpha = X < src.width && Y < src.height ? src.data[(Y * src.width + X) * 4 + 3] / 255 : 0
      d.data[(py * w + px) * 4 + 3] = Math.round(255 * soft * alpha)
    }
  }
  g.putImageData(d, 0, 0)
  return { dataUrl: c.toDataURL('image/png'), x: x0, y: y0 }
}

/** 准备一张差分：原图像素（取透明度）+ 垫白底、补成 64 倍数的 PNG（NovelAI 局部重绘要的）。 */
async function prepare(record) {
  const img = await loadImage(assetUrl(record.assetId))
  const w = img.naturalWidth, h = img.naturalHeight
  const padW = Math.ceil(w / 64) * 64, padH = Math.ceil(h / 64) * 64
  const flat = makeCanvas(padW, padH)
  const fg = flat.getContext('2d')
  fg.fillStyle = '#fff'
  fg.fillRect(0, 0, padW, padH)
  fg.drawImage(img, 0, 0)
  const raw = makeCanvas(w, h).getContext('2d')
  raw.drawImage(img, 0, 0)
  return { w, h, padW, padH, image: flat.toDataURL('image/png'), src: raw.getImageData(0, 0, w, h) }
}

/** 这张差分已经做好的贴片（从存着的素材包里取），重画单个状态时其余三个照用。 */
async function storedPatches(record) {
  const parts = record.aa?.pack?.parts || {}
  const out = {}
  for (const [part, state] of AA_STEPS) {
    const p = parts[part]?.[state]
    if (p) out[`${part}_${state}`] = { dataUrl: await assetDataUrl(p.file), x: p.x, y: p.y }
  }
  return out
}

/** 把四个贴片按素材包存进这张差分（静止帧沿用原图）。 */
async function savePack(gameId, person, key, record, size, rects, patches) {
  const parts = {}
  const files = {}
  for (const [part, state] of AA_STEPS) {
    const p = patches[`${part}_${state}`]
    if (!p) throw new Error(`还缺「${AA_PARTS[part].states[state].label}」`)
    const file = `${part}_${state}.png`
    parts[part] = { ...(parts[part] || {}), [state]: { file, x: p.x, y: p.y } }
    files[file] = p.dataUrl
  }
  const manifest = stillPack({ name: `${person.name}·${emotionLabel(record.emotion || key.split('|').pop())}`, width: size.w, height: size.h, still: 'still.png', patches: parts })
  await api.cast(gameId, 'aa-pack', { name: person.name, key, keepImage: true, manifest, files, rects })
}

/** 预览用的一句台词：循环念，嘴跟着动（跟剧场里一样按演出计划开合）。 */
function useDemoTalk(on) {
  const [talk, setTalk] = React.useState(null)
  React.useEffect(() => {
    if (!on) { setTalk(null); return undefined }
    const chars = Array.from('你终于来了，我等了你好久。')
    const plan = planLine(chars, 40, {})
    let timer = null
    const say = () => {
      setTalk({ key: 'demo' + Date.now(), type: 'dialogue', chars, times: plan.times, gap: plan.gap, mouth: plan.mouth, speed: 40, startedAt: performance.now(), done: false })
      timer = setTimeout(say, plan.times[plan.times.length - 1] + 1600)
    }
    say()
    return () => clearTimeout(timer)
  }, [on])
  return talk
}

/** 框眼睛和嘴：在图上拖框移动，拖右下角改大小（对齐 8 像素）。zoom 时只看脸附近。 */
function RectEditor({ src, width, height, rects, onChange, zoom }) {
  const svg = React.useRef(null)
  const drag = React.useRef(null)
  const [frozen, setFrozen] = React.useState(null) // 拖动时视野不跟着框变（不然图会在鼠标底下跑），松手再重新取景
  const point = e => {
    const el = svg.current
    const pt = el.createSVGPoint()
    pt.x = e.clientX
    pt.y = e.clientY
    return pt.matrixTransform(el.getScreenCTM().inverse())
  }
  const snap = v => Math.round(v / 8) * 8
  const begin = (e, part, i, mode) => {
    e.preventDefault()
    e.stopPropagation()
    svg.current.setPointerCapture(e.pointerId)
    drag.current = { part, i, mode, from: point(e), rect: rects[part][i] }
    setFrozen(view)
  }
  const move = e => {
    const d = drag.current
    if (!d) return
    const p = point(e)
    const dx = snap(p.x - d.from.x), dy = snap(p.y - d.from.y)
    const [x0, y0, x1, y1] = d.rect
    const next = d.mode === 'move'
      ? [x0 + dx, y0 + dy, x1 + dx, y1 + dy].map((v, k) => Math.max(0, Math.min(k % 2 ? height : width, v)))
      : [x0, y0, Math.max(x0 + 8, Math.min(width, x1 + dx)), Math.max(y0 + 8, Math.min(height, y1 + dy))]
    onChange({ ...rects, [d.part]: rects[d.part].map((r, k) => (k === d.i ? next : r)) })
  }
  const end = () => { drag.current = null; setFrozen(null) }
  // 看脸：所有框的外接矩形放大 3 倍，至少 256 见方，夹在图里
  let view = [0, 0, width, height]
  if (frozen) view = frozen
  else if (zoom) {
    const [x0, y0, x1, y1] = rectsBox([...rects.eyes, ...rects.mouth])
    const size = Math.max(256, Math.max(x1 - x0, y1 - y0) * 3)
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2
    const vx = Math.max(0, Math.min(width - size, cx - size / 2)), vy = Math.max(0, Math.min(height - size, cy - size / 2))
    view = [vx, vy, Math.min(size, width), Math.min(size, height)]
  }
  const unit = Math.max(6, view[2] / 40)
  return (
    <svg ref={svg} className="fg-aa-frame" viewBox={view.join(' ')} preserveAspectRatio="xMidYMid meet" onPointerMove={move} onPointerUp={end} onPointerCancel={end}>
      <image href={src} x="0" y="0" width={width} height={height} />
      {['eyes', 'mouth'].flatMap(part => rects[part].map((r, i) => {
        // 改大小的小方块不超过框宽高的一半：小框（嘴）中间留给拖动
        const handle = Math.max(4, Math.min(unit, (r[2] - r[0]) / 2, (r[3] - r[1]) / 2))
        return (
          <g key={part + i} className={`fg-aa-box is-${part}`}>
            <rect x={r[0]} y={r[1]} width={r[2] - r[0]} height={r[3] - r[1]} onPointerDown={e => begin(e, part, i, 'move')} />
            <rect className="fg-aa-handle" x={r[2] - handle / 2} y={r[3] - handle / 2} width={handle} height={handle} onPointerDown={e => begin(e, part, i, 'size')} />
            <text x={r[0]} y={r[1] - unit / 2} fontSize={unit * 1.6}>{BOX_NAMES[part][i]}</text>
          </g>
        )
      }))}
    </svg>
  )
}

/**
 * 看效果：跟剧场里一样的分层画布（眨眼、跟着台词动嘴）。close 时只看脸：眼睛和嘴的外接矩形放大 2.4 倍那一块，
 * 不然整张立绘缩在框里，眼睛只有几个像素，看不出眨没眨。
 */
function PlayView({ aa, talk, label, still, size, rects, close }) {
  const fallback = <img src={still} alt="" />
  if (!close) return <div className="fg-aa-play"><AaSprite aa={aa} talk={talk} label={label} fallback={fallback} /></div>
  const [x0, y0, x1, y1] = rectsBox([...rects.eyes, ...rects.mouth])
  const side = Math.min(size.w, size.h, Math.max(x1 - x0, y1 - y0) * 2.4)
  const bx = Math.max(0, Math.min(size.w - side, (x0 + x1) / 2 - side / 2)), by = Math.max(0, Math.min(size.h - side, (y0 + y1) / 2 - side / 2))
  return (
    <div className="fg-aa-play is-close">
      <div style={{ position: 'absolute', width: `${size.w / side * 100}%`, left: `${-bx / side * 100}%`, top: `${-by / side * 100}%` }}>
        <AaSprite aa={aa} talk={talk} label={label} fallback={fallback} />
      </div>
    </div>
  )
}

/** 一个状态的效果小图：脸附近，原图上贴着这个状态的贴片。 */
function StateThumb({ still, patch, box }) {
  const ref = React.useRef(null)
  React.useEffect(() => {
    let live = true
    Promise.all([loadImage(still), loadImage(patch.src)]).then(([a, b]) => {
      const c = ref.current
      if (!live || !c) return
      const [x0, y0, x1, y1] = box
      c.width = x1 - x0
      c.height = y1 - y0
      const g = c.getContext('2d')
      g.drawImage(a, x0, y0, x1 - x0, y1 - y0, 0, 0, x1 - x0, y1 - y0)
      g.drawImage(b, patch.x - x0, patch.y - y0)
    }, () => {})
    return () => { live = false }
  }, [still, patch.src, patch.x, patch.y, box.join(',')])
  return <canvas ref={ref} className="fg-aa-thumb" />
}

export function AaWorkbench({ gameId, person, onClose }) {
  // 这个角色画好的差分：现在这身样子排前面
  const variants = React.useMemo(() => Object.entries(person.sprites || {})
    .filter(([, r]) => r && r.assetId)
    .map(([key, r]) => ({ key, record: r, label: emotionLabel(r.emotion || key.split('|').pop()), look: [r.outfit, ...(r.states || [])].filter(Boolean).join(' · ') }))
    .sort((a, b) => Number(b.look === person.outfit) - Number(a.look === person.outfit) || a.label.localeCompare(b.label, 'zh-CN')), [person])
  const [picked, setPicked] = React.useState(() => new Set())
  const [focus, setFocus] = React.useState(variants[0] ? variants[0].key : '')
  const [sizes, setSizes] = React.useState({}) // key → { w, h }
  const [frames, setFrames] = React.useState({}) // key → 框（还没存的）
  const [jobs, setJobs] = React.useState({}) // key → { status, step, error }
  const [running, setRunning] = React.useState(false)
  const [zoom, setZoom] = React.useState(true)
  const [close, setClose] = React.useState(true)
  const [tab, setTab] = React.useState('frame')
  const stop = React.useRef(false)
  const job = (key, patch) => setJobs(j => ({ ...j, [key]: { ...(j[key] || {}), ...patch } }))

  const current = variants.find(v => v.key === focus) || null
  // 上次用过的框：这个角色最近做过的那张
  const lastRects = React.useMemo(() => {
    const done = variants.filter(v => v.record.aa && v.record.aa.rects).sort((a, b) => (b.record.at || 0) - (a.record.at || 0))[0]
    return done ? done.record.aa.rects : null
  }, [variants])
  const sizeOf = key => sizes[key] || { w: 832, h: 1216 }
  const rectsOf = key => frames[key] || (variants.find(v => v.key === key) || {}).record?.aa?.rects || lastRects || defaultRects(sizeOf(key).w, sizeOf(key).h)

  // 量出焦点差分的原图尺寸（默认框按尺寸估）
  React.useEffect(() => {
    if (!current || sizes[current.key]) return
    loadImage(assetUrl(current.record.assetId)).then(img => setSizes(s => ({ ...s, [current.key]: { w: img.naturalWidth, h: img.naturalHeight } })), () => {})
  }, [current && current.key])
  React.useEffect(() => { setTab(current && current.record.aa ? 'play' : 'frame') }, [current && current.key])

  const toggle = key => setPicked(p => { const n = new Set(p); if (n.has(key)) n.delete(key); else n.add(key); return n })
  const applyToPicked = () => {
    const r = rectsOf(focus)
    setFrames(f => { const n = { ...f }; for (const key of picked) n[key] = r; return n })
    toast(`已把这张的框套用到所选的 ${picked.size} 张`)
  }

  /** 做一张差分：四个状态依次局部重绘（only 只重画其中一个，其余用已经做好的），切贴片，存成素材包。 */
  const make = async (v, only = null) => {
    const rects = rectsOf(v.key)
    job(v.key, { status: 'running', step: 0, error: '' })
    const prep = await prepare(v.record)
    setSizes(s => ({ ...s, [v.key]: { w: prep.w, h: prep.h } }))
    const patches = only ? await storedPatches(v.record) : {}
    const steps = only ? [only] : AA_STEPS
    for (let i = 0; i < steps.length; i++) {
      if (stop.current) throw new Error('已停止')
      const [part, state] = steps[i]
      job(v.key, { step: i + 1, total: steps.length, now: AA_PARTS[part].states[state].label })
      const res = await api.aaInpaint({ gameId, name: person.name, key: v.key, part, state, rects, image: prep.image, ...(only ? { seed: Math.floor(Math.random() * 2 ** 31) } : {}) })
      patches[`${part}_${state}`] = cutPatch(await loadImage(res.image), prep.src, rects[part], prep.padW, prep.padH)
    }
    await savePack(gameId, person, v.key, v.record, prep, rects, patches)
    setFrames(f => { const n = { ...f }; delete n[v.key]; return n })
    job(v.key, { status: 'done', error: '' })
  }

  const run = async (list, only = null) => {
    if (running || !list.length) return
    setRunning(true)
    stop.current = false
    let ok = 0
    for (const v of list) {
      if (stop.current) break
      try { await make(v, only); ok++ } catch (e) { job(v.key, { status: 'failed', error: String((e && e.message) || e) }) }
    }
    setRunning(false)
    toast(stop.current ? `已停止：做好了 ${ok} 张` : `做好了 ${ok} / ${list.length} 张`, ok === list.length ? undefined : 'error')
  }
  const removeAa = list => list.length && api.cast(gameId, 'aa-remove', { name: person.name, keys: list.map(v => v.key) }).then(() => toast(`已取消 ${list.length} 张的动态，图留着`), e => toast(e.message, 'error'))

  const pickedList = variants.filter(v => picked.has(v.key))
  const talk = useDemoTalk(tab === 'play')
  const statusText = v => {
    const j = jobs[v.key]
    if (j && j.status === 'running') return `生成中 ${j.step || 0}/${j.total || 4}${j.now ? ' · ' + j.now : ''}`
    if (j && j.status === 'failed') return '失败：' + j.error
    return v.record.aa ? '已动' : '静态'
  }
  const pack = current && current.record.aa && current.record.aa.pack
  const box = current ? (() => { const r = rectsOf(current.key); const [x0, y0, x1, y1] = rectsBox([...r.eyes, ...r.mouth]); const m = 24; return [Math.max(0, x0 - m), Math.max(0, y0 - m), x1 + m, y1 + m] })() : null

  return (
    <div className="fg-aa-bench">
      <div className="fg-row">
        <b>{person.name} · 逆转式立绘工作台</b>
        <span className="fg-spacer" />
        <button type="button" className="fg-btn" onClick={onClose}>返回人物列表</button>
      </div>
      <div className="fg-note">
        给差分做眨眼和说话的口型：框好两只眼睛和嘴，每张差分用 NovelAI 局部重绘 4 次（半闭眼、闭眼、嘴半张、嘴张开），只重画框里那一小块，原图不动。
        同一个角色的差分姿势相同，框一次可以「套用到所选」。生成要用 NovelAI 的额度（之前试的时候没扣 Anlas，以你的账户为准）；生成时别关这个面板。
      </div>
      {!variants.length && <div className="fg-note" style={{ marginTop: '1cqw' }}>这个角色还没有画好的差分。先在人物志里画几张。</div>}
      {variants.length > 0 && (
        <div className="fg-aa-grid">
          <div className="fg-aa-list">
            <div className="fg-row">
              <button type="button" className="fg-btn is-mini" onClick={() => setPicked(new Set(variants.map(v => v.key)))}>全选</button>
              <button type="button" className="fg-btn is-mini" onClick={() => setPicked(new Set())}>全不选</button>
              <button type="button" className="fg-btn is-mini" onClick={() => setPicked(new Set(variants.filter(v => !v.record.aa).map(v => v.key)))}>选还没做的</button>
              <span className="fg-note">已选 {picked.size}</span>
            </div>
            {variants.map(v => (
              <div key={v.key} className={`fg-aa-item${v.key === focus ? ' is-on' : ''}`} onClick={() => setFocus(v.key)}>
                <input type="checkbox" checked={picked.has(v.key)} onClick={e => e.stopPropagation()} onChange={() => toggle(v.key)} aria-label={`选择 ${v.label}`} />
                <img src={assetUrl(v.record.assetId)} alt="" loading="lazy" />
                <div><b>{v.label}</b><small>{v.look}</small><small className={jobs[v.key] && jobs[v.key].status === 'failed' ? 'fg-err' : ''}>{statusText(v)}</small></div>
              </div>
            ))}
          </div>
          <div className="fg-aa-stage">
            {current && (
              <>
                <div className="fg-row">
                  <button type="button" className={`fg-btn is-mini${tab === 'frame' ? ' is-on' : ''}`} onClick={() => setTab('frame')}>框眼睛和嘴</button>
                  <button type="button" className={`fg-btn is-mini${tab === 'play' ? ' is-on' : ''}`} disabled={!current.record.aa} onClick={() => setTab('play')}>看效果</button>
                  <span className="fg-note">{current.label}{current.look ? ' · ' + current.look : ''}</span>
                </div>
                {tab === 'frame' && (
                  <>
                    <RectEditor src={assetUrl(current.record.assetId)} width={sizeOf(current.key).w} height={sizeOf(current.key).h} rects={rectsOf(current.key)} zoom={zoom} onChange={r => setFrames(f => ({ ...f, [current.key]: r }))} />
                    <div className="fg-row">
                      <button type="button" className="fg-btn is-mini" onClick={() => setZoom(!zoom)}>{zoom ? '看全图（找不到脸时）' : '放大看脸'}</button>
                      <button type="button" className="fg-btn is-mini" onClick={() => setFrames(f => ({ ...f, [current.key]: defaultRects(sizeOf(current.key).w, sizeOf(current.key).h) }))}>框放回默认位置</button>
                      <button type="button" className="fg-btn is-mini" disabled={!picked.size} onClick={applyToPicked}>把这张的框套用到所选</button>
                    </div>
                    <div className="fg-note">拖框移动，拖右下角的小方块改大小。框住整只眼睛（含睫毛）和嘴，别框太大：框外的地方一点都不会变。</div>
                  </>
                )}
                {tab === 'play' && pack && (
                  <>
                    <PlayView aa={current.record.aa} talk={talk} label={current.label} still={assetUrl(current.record.assetId)} size={sizeOf(current.key)} rects={rectsOf(current.key)} close={close} />
                    <div className="fg-row">
                      <button type="button" className="fg-btn is-mini" onClick={() => setClose(!close)}>{close ? '看全身' : '看脸部特写'}</button>
                    </div>
                    <div className="fg-aa-states">
                      {AA_STEPS.map(([part, state]) => {
                        const p = pack.parts && pack.parts[part] && pack.parts[part][state]
                        return (
                          <div key={part + state} className="fg-aa-state">
                            {p && box ? <StateThumb still={assetUrl(current.record.assetId)} patch={{ src: assetUrl(p.file), x: p.x, y: p.y }} box={box} /> : <span className="fg-note">没有</span>}
                            <span>{AA_PARTS[part].states[state].label}</span>
                            <button type="button" className="fg-btn is-mini" disabled={running} onClick={() => run([current], [part, state])}>重画这个</button>
                          </div>
                        )
                      })}
                    </div>
                    <div className="fg-note">会一直眨眼，嘴跟着一句台词开合。哪个状态不像就单独重画（换个随机种子），框不准就回「框眼睛和嘴」调好再整张重做。</div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}
      {variants.length > 0 && (
        <div className="fg-row fg-aa-actions">
          {!running && <button type="button" className="fg-btn is-primary" disabled={!picked.size} onClick={() => run(pickedList)}>生成所选（{picked.size} 张 × 4 次局部重绘）</button>}
          {!running && current && <button type="button" className="fg-btn" onClick={() => run([current])}>只做这一张</button>}
          {running && <button type="button" className="fg-btn" onClick={() => { stop.current = true }}>停止（做完手上这次就停）</button>}
          <button type="button" className="fg-btn" disabled={running || !pickedList.some(v => v.record.aa)} onClick={() => removeAa(pickedList.filter(v => v.record.aa))}>取消所选的动态</button>
        </div>
      )}
    </div>
  )
}
