// 逆转式立绘工作台（一个角色）：勾选差分（单选 / 多选 / 全选），在图上框好两只眼睛和嘴，
// 用 NovelAI 局部重绘做出眼睛（半闭、闭）和嘴（齿缝、小开、开、圆）；精简版只做闭眼和一个张嘴（路人省额度）。
// 浏览器把重画结果洗成贴片（只留真正变了的像素、颜色对齐原图、刘海用原图，见 lib/aa-patch.js），
// 拼成 v2 素材包挂到这张差分上（整图就是原图，头部不动）。做好的当场能看它眨眼、说话，哪个状态不满意单独重画。
// 宿主没有图片库：垫白底、洗贴片都在这里做；宿主只负责带着 Key 去请求、按框画遮罩、存素材包。
// 「自动框」用本机下好的认脸模型在浏览器里认眼睛和嘴（vision.js / lib/detect.js），认不准的标出来让人看一眼。
import React from 'react'
import { api, assetUrl, toast, hostName } from '../api.js'
import { PlayView, useDemoTalk, SpriteViewer } from './AaPreview.jsx'
import { emotionLabel } from './playback.js'
import { visionApi, frameSprite, followSprite, holdVision, releaseVisionLater } from './vision.js'
import { AA_PARTS, AA_STEPS, AA_STEPS_LITE, defaultRects, rectsBox, stateRects, motionPack, packLevel } from '../../../lib/aa-sprite.js'
import { cleanPatch } from '../../../lib/aa-patch.js'

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

/**
 * 重画结果洗成贴片：只留真正变了的像素、颜色对齐原图；眼睛的贴片里刘海一律用原图（见 lib/aa-patch.js）。
 * gen 是重画结果（垫过白底、补成 64 的倍数），prep.src 是原图像素（带透明度）。
 */
function cleanToPatch(gen, prep, rects, part, state) {
  const c = makeCanvas(prep.padW, prep.padH)
  const g = c.getContext('2d')
  g.drawImage(gen, 0, 0, prep.padW, prep.padH)
  const p = cleanPatch(prep.src, g.getImageData(0, 0, prep.padW, prep.padH), stateRects(rects, part, state, prep.h), { classes: part === 'eyes', keepHair: part === 'eyes' })
  const out = makeCanvas(p.width, p.height)
  out.getContext('2d').putImageData(new ImageData(p.data, p.width, p.height), 0, 0)
  return { dataUrl: out.toDataURL('image/png'), x: p.x, y: p.y }
}

/** 素材包里有的眼嘴状态（按做的顺序）；旧版（v1）素材包回空，要整张重做一次才升级成新版。 */
function packSteps(pack) {
  const parts = pack && pack.version === 2 ? (pack.poses[pack.default_pose] || {}).parts || {} : null
  return parts ? AA_STEPS.filter(([part, state]) => parts[part] && parts[part][state]) : []
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

/** 这张差分已经做好的贴片（从存着的 v2 素材包里取），重画单个状态时其余的照用。 */
async function storedPatches(record) {
  const pack = record.aa && record.aa.pack
  const out = {}
  for (const [part, state] of packSteps(pack)) {
    const p = pack.poses[pack.default_pose].parts[part][state]
    out[`${part}_${state}`] = { dataUrl: await assetDataUrl(p.file), x: p.x, y: p.y }
  }
  return out
}

/** 把这一套贴片（完整版 6 个，或精简版 2 个）按 v2 素材包存进这张差分（整图沿用原图）。 */
async function savePack(gameId, person, key, record, size, rects, patches, steps) {
  const parts = {}
  const files = {}
  for (const [part, state] of steps) {
    const p = patches[`${part}_${state}`]
    if (!p) throw new Error(`还缺「${AA_PARTS[part].states[state].label}」`)
    const file = `${part}_${state}.png`
    parts[part] = { ...(parts[part] || {}), [state]: { file, x: p.x, y: p.y } }
    files[file] = p.dataUrl
  }
  const manifest = motionPack({ name: `${person.name}·${emotionLabel(record.emotion || key.split('|').pop())}`, width: size.w, height: size.h, still: 'still.png', patches: parts })
  await api.cast(gameId, 'aa-pack', { name: person.name, key, keepImage: true, manifest, files, rects })
}

/**
 * 框眼睛和嘴：在图上拖框移动，拖右下角改大小（对齐 8 像素）。zoom 时只看脸附近。
 * parts / names 换掉就能框别的（人物志里给表情差分的底图框脸：parts=['face']）。
 */
export function RectEditor({ src, width, height, rects, onChange, zoom, parts = ['eyes', 'mouth'], names = BOX_NAMES }) {
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
    const [x0, y0, x1, y1] = rectsBox(parts.flatMap(part => rects[part]))
    const size = Math.max(256, Math.max(x1 - x0, y1 - y0) * 3)
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2
    const vx = Math.max(0, Math.min(width - size, cx - size / 2)), vy = Math.max(0, Math.min(height - size, cy - size / 2))
    view = [vx, vy, Math.min(size, width), Math.min(size, height)]
  }
  const unit = Math.max(6, view[2] / 40)
  return (
    <svg ref={svg} className="fg-aa-frame" viewBox={view.join(' ')} preserveAspectRatio="xMidYMid meet" onPointerMove={move} onPointerUp={end} onPointerCancel={end}>
      <image href={src} x="0" y="0" width={width} height={height} />
      {parts.flatMap(part => rects[part].map((r, i) => {
        // 改大小的小方块不超过框宽高的一半：小框（嘴）中间留给拖动
        const handle = Math.max(4, Math.min(unit, (r[2] - r[0]) / 2, (r[3] - r[1]) / 2))
        return (
          <g key={part + i} className={`fg-aa-box is-${part}`}>
            <rect x={r[0]} y={r[1]} width={r[2] - r[0]} height={r[3] - r[1]} onPointerDown={e => begin(e, part, i, 'move')} />
            <rect className="fg-aa-handle" x={r[2] - handle / 2} y={r[3] - handle / 2} width={handle} height={handle} onPointerDown={e => begin(e, part, i, 'size')} />
            <text x={r[0]} y={r[1] - unit / 2} fontSize={unit * 1.6}>{names[part][i]}</text>
          </g>
        )
      }))}
    </svg>
  )
}

const mb = n => `${(n / 1048576).toFixed(n >= 100 * 1048576 ? 0 : 1)} MB`
const SOURCES = [['auto', '自动（先官网，连不上换镜像）'], ['official', '只用官网'], ['mirror', '先用镜像']]
/** 自动框的结果怎么标：准的绿、要看一眼的黄、不准的红。 */
const AUTO_BADGE = { high: ['准', 'is-ok'], mid: ['看一眼', 'is-warn'], low: ['不准', 'is-bad'], none: ['没认出', 'is-bad'] }

/**
 * 认脸模型：下没下好、下载进度、下载来源。小模型（约 46 MB）是自动框必需的；
 * 精细模式的大模型（约 300 MB）可选，下好后小模型没把握的图自动请它补认，勾上精细模式则每张都用它找嘴。
 */
function VisionBar({ status, setStatus, fine, setFine }) {
  const act = promise => promise.then(setStatus, e => toast(e.message, 'error'))
  if (!status) return <div className="fg-note">正在看认脸模型下好没有…</div>
  const { basic, fine: big } = status.packs
  const job = status.job
  const busy = job && job.state === 'running'
  const label = pack => status.packs[pack] ? status.packs[pack].label : pack
  return (
    <div className="fg-aa-vision">
      <div className="fg-row">
        <b>自动框</b>
        {basic.ready ? <span className="fg-pill">✓ 认脸小模型</span> : !busy && <button type="button" className="fg-btn is-mini is-primary" onClick={() => act(visionApi.download('basic'))}>下载认脸小模型（{mb(basic.missing)}）</button>}
        {big.ready
          ? <label className="fg-check" title={big.note}><input type="checkbox" checked={fine} onChange={e => setFine(e.target.checked)} />精细模式（每张都让大模型找嘴，多 7~15 秒）</label>
          : basic.ready && !busy && <button type="button" className="fg-btn is-mini" title={big.note} onClick={() => act(visionApi.download('fine'))}>下载精细模式大模型（{mb(big.missing)}）</button>}
        <span className="fg-spacer" />
        <label className="fg-note">下载来源 <select value={status.source} onChange={e => api.patchConfig({ vision: { source: e.target.value } }).then(() => act(visionApi.status()), err => toast(err.message, 'error'))}>{SOURCES.map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select></label>
        {big.ready && <button type="button" className="fg-btn is-mini" title="删掉大模型的文件，腾出约 300 MB" onClick={() => act(visionApi.remove('fine'))}>删掉大模型</button>}
      </div>
      {busy && (
        <div className="fg-row">
          <span className="fg-pill is-busy">下载{label(job.pack)}：{mb(job.received)} / {mb(job.total)}{job.source ? ` · 来自 ${job.source}` : ''}</span>
          <progress max={job.total || 1} value={job.received} />
          <button type="button" className="fg-btn is-mini" onClick={() => act(visionApi.cancel())}>取消</button>
        </div>
      )}
      {job && job.state === 'failed' && <div className="fg-note fg-err">下载{label(job.pack)}失败：{job.error}（可以换个下载来源再点下载，下好的部分不会重下）</div>}
      {!basic.ready && !busy && <div className="fg-note">自动框要先下载认脸小模型：二次元的脸、头、眼睛识别（deepghs，MIT / OpenRAIL 许可），只下一次，存在{hostName() === 'st' ? '这个浏览器的缓存里（换浏览器、清浏览器数据要重下）' : ' FlowGal 数据目录的 models 文件夹'}，在你自己电脑上跑、不上传图片。</div>}
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
  const [viewing, setViewing] = React.useState(null) // 放大看的那张差分
  const [vision, setVision] = React.useState(null) // 认脸模型下没下好（visionApi.status）
  const [fine, setFineState] = React.useState(() => { try { return localStorage.getItem('flowgal.aa.fine') === '1' } catch { return false } })
  const [lite, setLiteState] = React.useState(() => { try { return localStorage.getItem('flowgal.aa.lite') === '1' } catch { return false } })
  const [auto, setAuto] = React.useState({}) // key → 自动框的结果 { confidence, notes }
  const [framing, setFraming] = React.useState('') // 正在自动框的那张
  const touched = React.useRef(new Set()) // 手动调过框的差分（自动框认不出时照着它找）
  const stop = React.useRef(false)
  const job = (key, patch) => setJobs(j => ({ ...j, [key]: { ...(j[key] || {}), ...patch } }))
  const setFine = on => { setFineState(on); try { localStorage.setItem('flowgal.aa.fine', on ? '1' : '0') } catch {} }
  const setLite = on => { setLiteState(on); try { localStorage.setItem('flowgal.aa.lite', on ? '1' : '0') } catch {} }
  const steps = lite ? AA_STEPS_LITE : AA_STEPS

  // 认脸模型的状态：打开工作台时看一次，下载中每秒刷新
  React.useEffect(() => { visionApi.status().then(setVision, () => {}) }, [])
  React.useEffect(() => { holdVision(); return () => releaseVisionLater() }, [])
  const downloading = Boolean(vision && vision.job && vision.job.state === 'running')
  React.useEffect(() => {
    if (!downloading) return undefined
    const timer = setInterval(() => visionApi.status().then(setVision, () => {}), 1000)
    return () => clearInterval(timer)
  }, [downloading])
  const visionReady = Boolean(vision && vision.packs.basic.ready)

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
  // 正在看的这张刚做好（素材包换了）：直接切到「看效果」
  const packOf = current && current.record.aa && current.record.aa.pack
  const lastPack = React.useRef(packOf)
  React.useEffect(() => { if (packOf && packOf !== lastPack.current && lastPack.current !== undefined) setTab('play'); lastPack.current = packOf }, [packOf])

  const toggle = key => setPicked(p => { const n = new Set(p); if (n.has(key)) n.delete(key); else n.add(key); return n })
  const applyToPicked = () => {
    const r = rectsOf(focus)
    setFrames(f => { const n = { ...f }; for (const key of picked) n[key] = r; return n })
    setAuto(a => { const n = { ...a }; for (const key of picked) delete n[key]; return n })
    for (const key of picked) touched.current.add(key)
    toast(`已把这张的框套用到所选的 ${picked.size} 张`)
  }

  /** 认不出脸时照着找的那张：这次手动调过框的优先，其次最近做好动态的。 */
  const refFor = v => {
    const hand = variants.find(o => o.key !== v.key && touched.current.has(o.key) && frames[o.key])
    if (hand) return { ...hand, rects: frames[hand.key] }
    const done = variants.filter(o => o.key !== v.key && o.record.aa && o.record.aa.rects).sort((a, b) => (b.record.at || 0) - (a.record.at || 0))[0]
    return done ? { ...done, rects: done.record.aa.rects } : null
  }

  /**
   * 自动框一批差分：认脸模型认眼睛和嘴，认不出（furry、兽头、没下大模型时）就照这个角色手动框好的那张找同一张脸。
   * 框直接放进工作台（还没存，生成时才用），结果标在列表里。回 key → { rects, confidence }。
   */
  const autoFrameList = async list => {
    if (!visionReady) { toast('先下载认脸小模型', 'error'); return {} }
    if (framing || running || !list.length) return {}
    stop.current = false
    const out = {}
    let weak = 0
    for (const v of list) {
      if (stop.current) break
      setFraming(v.key)
      const src = assetUrl(v.record.assetId)
      let info
      try {
        let r = await frameSprite(vision, src, { fine })
        const ref = !r && refFor(v) // 完全没认出脸才照别的差分找（认出脸、只是没把握的，比粗找准）
        if (ref) {
          const f = await followSprite(assetUrl(ref.record.assetId), ref.rects, src)
          // 跟随只是粗找（头一歪就偏），一律标「不准」让人看一眼，「自动框并生成」也不会直接拿它去生成
          if (f.score >= 0.25) r = { rects: f.rects, confidence: 'low', notes: [`没认准，照「${ref.label}」框好的位置在这张里找同一张脸（相似度 ${Math.round(f.score * 100)}%），位置可能偏，拖一下`] }
        }
        info = r ? { confidence: r.confidence, notes: r.notes } : { confidence: 'none', notes: ['没认出脸。手动框好这个角色的一张，再点自动框，其它的会照着那张找'] }
        if (r) {
          const rects = { eyes: r.rects.eyes.map(b => b.map(Math.round)), mouth: r.rects.mouth.map(b => b.map(Math.round)) }
          out[v.key] = { rects, confidence: r.confidence }
          touched.current.delete(v.key)
          setFrames(fr => ({ ...fr, [v.key]: rects }))
        }
      } catch (e) {
        info = { confidence: 'none', notes: ['出错了：' + String((e && e.message) || e)] }
      }
      if (info.confidence === 'low' || info.confidence === 'none') weak++
      setAuto(a => ({ ...a, [v.key]: info }))
    }
    setFraming('')
    const done = Object.keys(out).length
    toast(`自动框好 ${done} / ${list.length} 张${weak ? `，其中 ${weak} 张没认准，标红的点开看一眼` : ''}`, weak ? 'error' : undefined)
    return out
  }

  /** 自动框所选、再直接生成：认准了（标绿、标黄）的才生成，标红的留着让人调好再做。手动调过框的不再自动框。 */
  const autoAndMake = async () => {
    const list = pickedList.filter(v => !touched.current.has(v.key))
    const results = await autoFrameList(list)
    const ok = pickedList.filter(v => touched.current.has(v.key) || (results[v.key] && results[v.key].confidence !== 'low'))
    if (stop.current || !ok.length) return
    const skipped = pickedList.length - ok.length
    if (skipped) toast(`${skipped} 张没认准，先不生成；调好框再点「生成所选」`, 'error')
    await run(ok, null, Object.fromEntries(Object.entries(results).map(([k, r]) => [k, r.rects])))
  }

  /**
   * 做一张差分：各个状态依次局部重绘（完整版 6 次、精简版 2 次；only 只重画其中一个，其余用已经做好的），
   * 洗成贴片，存成 v2 素材包。
   */
  const make = async (v, only = null, given = null) => {
    const rects = given || rectsOf(v.key)
    job(v.key, { status: 'running', step: 0, error: '' })
    const prep = await prepare(v.record)
    setSizes(s => ({ ...s, [v.key]: { w: prep.w, h: prep.h } }))
    const patches = only ? await storedPatches(v.record) : {}
    const todo = only ? [only] : steps
    for (let i = 0; i < todo.length; i++) {
      if (stop.current) throw new Error('已停止')
      const [part, state] = todo[i]
      job(v.key, { step: i + 1, total: todo.length, now: AA_PARTS[part].states[state].label })
      const res = await api.aaInpaint({ gameId, name: person.name, key: v.key, part, state, rects, image: prep.image, ...(only ? { seed: Math.floor(Math.random() * 2 ** 31) } : {}) })
      patches[`${part}_${state}`] = cleanToPatch(await loadImage(res.image), prep, rects, part, state)
    }
    await savePack(gameId, person, v.key, v.record, prep, rects, patches, only ? packSteps(v.record.aa && v.record.aa.pack) : steps)
    setFrames(f => { const n = { ...f }; delete n[v.key]; return n })
    job(v.key, { status: 'done', error: '' })
  }

  const run = async (list, only = null, given = {}) => {
    if (running || !list.length) return
    setRunning(true)
    stop.current = false
    let ok = 0
    for (const v of list) {
      if (stop.current) break
      try { await make(v, only, given[v.key] || null); ok++ } catch (e) { job(v.key, { status: 'failed', error: String((e && e.message) || e) }) }
    }
    setRunning(false)
    toast(stop.current ? `已停止：做好了 ${ok} 张` : `做好了 ${ok} / ${list.length} 张`, ok === list.length ? undefined : 'error')
  }
  const removeAa = list => list.length && api.cast(gameId, 'aa-remove', { name: person.name, keys: list.map(v => v.key) }).then(() => toast(`已取消 ${list.length} 张的动态，图留着`), e => toast(e.message, 'error'))

  const pickedList = variants.filter(v => picked.has(v.key))
  const talk = useDemoTalk(tab === 'play')
  const statusText = v => {
    if (framing === v.key) return '正在自动框…'
    const j = jobs[v.key]
    if (j && j.status === 'running') return `生成中 ${j.step || 0}/${j.total || steps.length}${j.now ? ' · ' + j.now : ''}`
    if (j && j.status === 'failed') return '失败：' + j.error
    const level = packLevel(v.record.aa && v.record.aa.pack)
    return !v.record.aa ? '静态' : level === 'lite' ? '已动（精简版）' : level === 'v1' ? '已动（旧版，重做升级）' : '已动'
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
        给差分做眨眼和说话的口型：框好两只眼睛和嘴，每张差分用 NovelAI 局部重绘 6 次（眼睛半闭、闭；嘴齿缝、小开、开、圆），只重画框里那一小块，原图不动；
        重画的结果会洗干净（颜色对齐原图、刘海用原图），眨眼时不闪色、头发不跳。路人可以勾「精简版」：只做闭眼和一个张嘴，每张 2 次。
        同一个角色的差分姿势相同，框一次可以「套用到所选」。嘴框尽量扁：框多高，嘴最多张多大。生成要用 NovelAI 的额度（试的时候没扣 Anlas，以你的账户为准）；生成时别关这个面板。
      </div>
      {variants.length > 0 && <VisionBar status={vision} setStatus={setVision} fine={fine} setFine={setFine} />}
      {!variants.length && <div className="fg-note" style={{ marginTop: '1cqw' }}>这个角色还没有画好的差分。先在人物志里画几张。</div>}
      {variants.length > 0 && (
        <div className="fg-aa-grid">
          <div className="fg-aa-list">
            <div className="fg-row">
              <button type="button" className="fg-btn is-mini" onClick={() => setPicked(new Set(variants.map(v => v.key)))}>全选</button>
              <button type="button" className="fg-btn is-mini" onClick={() => setPicked(new Set())}>全不选</button>
              <button type="button" className="fg-btn is-mini" onClick={() => setPicked(new Set(variants.filter(v => !v.record.aa).map(v => v.key)))}>选还没做的</button>
              <span className="fg-note">已选 {picked.size}</span>
              <button type="button" className="fg-btn is-mini" disabled={!visionReady || !picked.size || running || Boolean(framing)} title={visionReady ? '用认脸模型给所选的差分框好眼睛和嘴' : '先在上面下载认脸小模型'} onClick={() => autoFrameList(pickedList)}>🪄 自动框所选</button>
            </div>
            {variants.map(v => (
              <div key={v.key} className={`fg-aa-item${v.key === focus ? ' is-on' : ''}`} onClick={() => setFocus(v.key)}>
                <input type="checkbox" checked={picked.has(v.key)} onClick={e => e.stopPropagation()} onChange={() => toggle(v.key)} aria-label={`选择 ${v.label}`} />
                <img src={assetUrl(v.record.assetId)} alt="" loading="lazy" title="双击放大看" onDoubleClick={e => { e.stopPropagation(); setViewing(v) }} />
                <div>
                  <b>{v.label}{auto[v.key] && <i className={`fg-aa-badge ${AUTO_BADGE[auto[v.key].confidence][1]}`} title={auto[v.key].notes.join('；')}>自动框·{AUTO_BADGE[auto[v.key].confidence][0]}</i>}</b>
                  <small>{v.look}</small>
                  <small className={jobs[v.key] && jobs[v.key].status === 'failed' ? 'fg-err' : ''}>{statusText(v)}</small>
                </div>
              </div>
            ))}
          </div>
          <div className="fg-aa-stage">
            {current && (
              <>
                <div className="fg-row">
                  <button type="button" className={`fg-btn is-mini${tab === 'frame' ? ' is-on' : ''}`} onClick={() => setTab('frame')}>框眼睛和嘴</button>
                  <button type="button" className={`fg-btn is-mini${tab === 'play' ? ' is-on' : ''}`} disabled={!current.record.aa} title={current.record.aa ? '' : '这张还没做，生成后才能看动起来的样子'} onClick={() => setTab('play')}>看效果</button>
                  <button type="button" className="fg-btn is-mini" onClick={() => setViewing(current)}>🔍 放大看</button>
                  <span className="fg-note">{current.label}{current.look ? ' · ' + current.look : ''}</span>
                </div>
                {tab === 'frame' && (
                  <>
                    <RectEditor src={assetUrl(current.record.assetId)} width={sizeOf(current.key).w} height={sizeOf(current.key).h} rects={rectsOf(current.key)} zoom={zoom} onChange={r => { touched.current.add(current.key); setFrames(f => ({ ...f, [current.key]: r })) }} />
                    {auto[current.key] && <div className={`fg-note ${auto[current.key].confidence === 'high' ? '' : 'fg-err'}`}>自动框：{auto[current.key].notes.join('；')}{auto[current.key].confidence === 'high' ? '' : '。框不对就拖一下（拖过的这张会被当成样子，其它认不出的照它找）'}</div>}
                    <div className="fg-row">
                      <button type="button" className="fg-btn is-mini" onClick={() => setZoom(!zoom)}>{zoom ? '看全图（找不到脸时）' : '放大看脸'}</button>
                      <button type="button" className="fg-btn is-mini" disabled={!visionReady || running || Boolean(framing)} title={visionReady ? '' : '先在上面下载认脸小模型'} onClick={() => autoFrameList([current])}>{framing === current.key ? '认脸中…' : '🪄 自动框这张'}</button>
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
                    {!packSteps(pack).length && <div className="fg-note">这张是旧版素材包（半张、张开两种嘴）。整张重做一次就升级成新版（更细的嘴、洗过的眼睛）。</div>}
                    <div className="fg-aa-states">
                      {packSteps(pack).map(([part, state]) => {
                        const p = pack.poses[pack.default_pose].parts[part][state]
                        return (
                          <div key={part + state} className="fg-aa-state">
                            {p && box ? <StateThumb still={assetUrl(current.record.assetId)} patch={{ src: assetUrl(p.file), x: p.x, y: p.y }} box={box} /> : <span className="fg-note">没有</span>}
                            <span>{AA_PARTS[part].states[state].label}</span>
                            <button type="button" className="fg-btn is-mini" disabled={running} onClick={() => run([current], [part, state])}>重画这个</button>
                          </div>
                        )
                      })}
                    </div>
                    <div className="fg-note">会一直眨眼，嘴跟着一句台词开合{packLevel(pack) === 'lite' ? '（精简版：眨眼是睁 → 闭 → 睁，嘴在闭和开之间来回）' : ''}。哪个状态不像就单独重画（换个随机种子），框不准就回「框眼睛和嘴」调好再整张重做。</div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}
      {variants.length > 0 && (
        <div className="fg-row fg-aa-actions">
          <label className="fg-check" title="路人、不重要的角色：只做闭眼和一个张嘴（每张 2 次局部重绘），眨眼是睁 → 闭 → 睁，嘴在闭和开之间来回"><input type="checkbox" checked={lite} disabled={running} onChange={e => setLite(e.target.checked)} />精简版（省额度）</label>
          {!running && !framing && <button type="button" className="fg-btn is-primary" disabled={!picked.size} onClick={() => run(pickedList)}>生成所选（{picked.size} 张 × {steps.length} 次局部重绘）</button>}
          {!running && !framing && <button type="button" className="fg-btn" disabled={!picked.size || !visionReady} title={visionReady ? '先自动框（手动调过的不动），认准了的直接生成，没认准的留下来' : '先在上面下载认脸小模型'} onClick={autoAndMake}>🪄 自动框并生成所选</button>}
          {framing && <button type="button" className="fg-btn" onClick={() => { stop.current = true }}>停止自动框</button>}
          {!running && !framing && current && <button type="button" className="fg-btn" onClick={() => run([current])}>只做这一张</button>}
          {running && <button type="button" className="fg-btn" onClick={() => { stop.current = true }}>停止（做完手上这次就停）</button>}
          <button type="button" className="fg-btn" disabled={running || !pickedList.some(v => v.record.aa)} onClick={() => removeAa(pickedList.filter(v => v.record.aa))}>取消所选的动态</button>
        </div>
      )}
      {viewing && <SpriteViewer record={(variants.find(v => v.key === viewing.key) || viewing).record} label={`${person.name} · ${viewing.label}`} onClose={() => setViewing(null)} />}
    </div>
  )
}
