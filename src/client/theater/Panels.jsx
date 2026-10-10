// 剧场里的四个面板：回想（Backlog）、鉴赏（CG / 背景 / 重画 / 改词 / 补图）、人物志（档案、衣橱、立绘差分、情绪库）、设置（含声音、「我的配乐」）。导演日志在 DirectorLog.jsx。
import React from 'react'
import { api, assetUrl, toast, fillText, useConfig, loadConfig, patchConfig, setConfig, useUpdate, loadUpdate, setUpdate, updateAvailable, useMusic, loadMusic, hostName } from '../api.js'
import { emotionLabel, TIME_LABEL, WEATHER_LABEL, MOOD_LABEL, cgSrc } from './playback.js'
import { playedUnits } from '../../../lib/staging.js'
import { allEmotions, emotionEntry, personEmotions } from '../../../lib/emotions.js'
import { AaWorkbench, RectEditor } from './AaWorkbench.jsx'
import { visionApi, frameSprite } from './vision.js'
import { framedResult } from './faceFramer.js'
import { SpriteArt, SpriteViewer } from './AaPreview.jsx'
import { lookAt, lookKey, lookLabel, pickSprite, findLookTurn, LOOK_FIELDS, LOOK_FIELD_LABELS, lookTags } from '../../../lib/look.js'
import { Silhouette } from './Stage.jsx'
import { SKINS } from './skins.js'
import { previewTrack, stopPreview, previewVoice, previewSound } from './audio.js'
import { VOICES, SOUND_SLOTS, VOICE_PITCH_LIMIT, voiceById, castVoices } from '../../../lib/sounds.js'
import { cleanPack, packFiles } from '../../../lib/aa-sprite.js'
import { MUSIC_SIDECAR, AUDIO_FILE, readSidecar, writeSidecar } from '../../../lib/music-sidecar.js'
import { modelKey, qualityFor, negativeFor, sizeFor, MAX_STYLES } from '../../../lib/image/style.js'
import { naiModelInfo } from '../../../lib/image/nai-models.js'
import { CG_MAX_CHARACTERS, EMOTIONS, EMOTION_POSE, POSES } from '../../../lib/vocab.js'
import { POSE_IDS, poseMembers, anchorOf, faceBoxFrom, cleanFaceBox } from '../../../lib/face.js'
import { defaultRects } from '../../../lib/aa-sprite.js'

const STATUS_LABEL = { writing: '分镜中', queued: '排队中', running: '绘制中', failed: '失败', cancelled: '已取消', ready: '' }

/**
 * 插件文件已经更新、DSH 还没重启时的提示：这时网页是新的、后台还是旧的，新加的字段旧后台不认，
 * 保存时会悄悄丢掉（比如分格的固定外貌）。光刷新网页不够，要关掉 DSH 再打开。
 */
export function RestartNotice({ floating = false }) {
  const u = useUpdate()
  if (!u || !u.restartRequired) return null
  return (
    <div className={`fg-restart${floating ? ' is-floating' : ''}`} role="alert" onClick={e => e.stopPropagation()}>
      FlowGal 已经更新，但 DSH 还在用旧的后台：<b>关掉 DSH 再打开</b>（光刷新网页不够）。重启前改的设置和档案，有的会存不上。
    </div>
  )
}

export function Panel({ title, en, onClose, tabs, tab, onTab, children, actions }) {
  return (
    <div className="fg-panel" onClick={e => e.stopPropagation()} onKeyDown={e => e.stopPropagation()}>
      <div className="fg-panel-head">
        <div className="fg-panel-title">{title}</div>
        <div className="fg-panel-en">{en}</div>
        <div className="fg-spacer" />
        {actions}
        <button type="button" className="fg-iconbtn" title="返回" onClick={onClose}>✕</button>
      </div>
      <RestartNotice />
      {tabs && (
        <div className="fg-tabs">
          {tabs.map(t => <button key={t.id} type="button" className={`fg-tab${tab === t.id ? ' is-on' : ''}`} onClick={() => onTab(t.id)}>{t.label}</button>)}
        </div>
      )}
      <div className="fg-panel-body">{children}</div>
    </div>
  )
}

function useBusy() {
  const [busy, setBusy] = React.useState('')
  const run = async (id, fn, ok) => {
    setBusy(id)
    try { const r = await fn(); if (ok) toast(ok); return r } catch (e) { toast(String(e && e.message || e), 'error') } finally { setBusy('') }
  }
  return [busy, run]
}

// ───────────────────────── 回想 ─────────────────────────
export function Backlog({ beats, index, onJump, onClose, gameId }) {
  const [busy, run] = useBusy()
  const ref = React.useRef(null)
  // 只滚面板自己：scrollIntoView 会连带滚动外层舞台。
  React.useEffect(() => {
    const box = ref.current && ref.current.closest('.fg-panel-body')
    const el = ref.current && ref.current.querySelector('.is-current')
    if (box && el) box.scrollTop = el.offsetTop - box.clientHeight / 2
  }, [])
  let lastTurn = null
  return (
    <Panel title="回想" en="Backlog" onClose={onClose}>
      <div ref={ref}>
        {beats.map((b, i) => {
          const head = b.turn !== lastTurn
          lastTurn = b.turn
          return (
            <React.Fragment key={b.key}>
              {head && (
                <div className="fg-log-turn fg-row">
                  <span>TURN {b.turn} · {b.scene.location || '—'} · {TIME_LABEL[b.scene.time] || ''}</span>
                  <span style={{ flex: 1 }} />
                  {b.status === 'directing' && <span className="fg-pill is-busy">导演整理中</span>}
                  {b.status === 'failed' && <span className="fg-pill fg-err" title={b.error}>整理失败</span>}
                  <button type="button" className="fg-btn" disabled={busy === 'r' + b.turn} onClick={e => { e.stopPropagation(); run('r' + b.turn, () => api.replan(gameId, b.turn), '已重新整理这一轮') }}>重新整理</button>
                </div>
              )}
              <div className={`fg-log-item${i === index ? ' is-current' : ''}`} onClick={() => onJump(i)} style={i === index ? { background: 'rgba(255,255,255,.06)' } : null}>
                <div className="fg-log-name">{b.type === 'narration' ? '' : b.alias || b.speaker}</div>
                <div style={b.type === 'thought' ? { fontStyle: 'italic', opacity: 0.8 } : null}>{b.type === 'dialogue' ? `「${b.text}」` : b.type === 'thought' ? `（${b.text}）` : b.text}</div>
              </div>
            </React.Fragment>
          )
        })}
        {!beats.length && <div className="fg-note">还没有可以回想的内容。</div>}
      </div>
    </Panel>
  )
}

// ───────────────────────── 鉴赏 ─────────────────────────
const CG_WRITER_LABEL = { ai: '插画分镜师写的', fallback: '按档案拼的（分镜师没写出来）', user: '你改的', director: '导演写的（旧版）' }
const blankCharacter = () => ({ name: '', tag: '', nl: '' })

/** 改词：Base（画面）+ 每人一个角色块（柏宝绘的 NovelAI V4.5 分人写法）。名字只是标签，出图前换成档案外貌并删掉。 */
function ImageEditor({ gameId, image, units = [], onClose }) {
  const pick = img => ({ tags: img.tags || '', desc: img.desc || '', characters: (img.characters || []).map(c => ({ ...c })), negativeExtra: img.negativeExtra || '', shape: img.shape || 'landscape', seed: '', style: img.style || '' })
  const data = useConfig()
  const styles = data ? data.config.style.presets : []
  const currentName = (styles.find(x => x.id === (data && data.config.style.current)) || {}).name || ''
  const [draft, setDraft] = React.useState(() => pick(image))
  const [instruction, setInstruction] = React.useState('')
  const [busy, run] = useBusy()
  const set = patch => setDraft(d => ({ ...d, ...patch }))
  const setChar = (i, patch) => setDraft(d => ({ ...d, characters: d.characters.map((c, j) => (j === i ? { ...c, ...patch } : c)) }))
  const version = image.versions[image.current]
  const stop = e => e.stopPropagation()
  return (
    <div className="fg-person fg-cg-editor" style={{ gridTemplateColumns: '1fr' }} onKeyDown={stop}>
      <div className="fg-section" style={{ marginTop: 0 }}>改提示词 · {image.title || '第 ' + image.turn + ' 轮插画'}{image.writer && <span className="fg-pill" style={{ marginLeft: '1cqw' }}>{CG_WRITER_LABEL[image.writer] || image.writer}</span>}</div>
      {image.moment && <div className="fg-note" style={{ marginBottom: '.6cqw' }}>导演挑的瞬间：{image.moment}{image.who && image.who.length ? `（入画：${image.who.join('、')}）` : ''}</div>}
      <div className="fg-field"><label>画面 Base</label><textarea className="fg-textarea" placeholder="人数、构图、镜头、地点、光线、时代锚……用英文 tag" value={draft.tags} onChange={e => set({ tags: e.target.value })} /></div>
      <div className="fg-field"><label>画面描述</label><textarea className="fg-textarea is-short" placeholder="一两句英文，补 tag 说不清的空间关系和氛围" value={draft.desc} onChange={e => set({ desc: e.target.value })} /></div>
      <div className="fg-cg-chars">
        {draft.characters.map((c, i) => (
          <div key={i} className="fg-cg-char">
            <div className="fg-row">
              <input className="fg-input" style={{ width: '12cqw' }} placeholder="人物名" value={c.name} onChange={e => setChar(i, { name: e.target.value })} />
              <span className="fg-note" style={{ flex: 1 }}>角色块 {i + 1}{c.name ? '：出图前补上档案里的固定外貌' : ''}</span>
              <button type="button" className="fg-btn" onClick={() => set({ characters: draft.characters.filter((_, j) => j !== i) })}>移除</button>
            </div>
            <textarea className="fg-textarea is-short" placeholder="girl, 表情, 视线, 动作, 衣服指纹……" value={c.tag} onChange={e => setChar(i, { tag: e.target.value })} />
            <textarea className="fg-textarea is-short" placeholder="一句英文：姿态、动作的来龙去脉、视线落在哪" value={c.nl} onChange={e => setChar(i, { nl: e.target.value })} />
          </div>
        ))}
        <div className="fg-row">
          <button type="button" className="fg-btn" disabled={draft.characters.length >= CG_MAX_CHARACTERS} onClick={() => set({ characters: [...draft.characters, blankCharacter()] })}>＋ 加一个人</button>
          <small className="fg-note" style={{ flex: 1 }}>名字只用来对上档案，不会发出去：tag 和描述里的人名出图前会被删掉。NovelAI V4 以上每人一块分开发；其他渠道合并成一段。旧写法 @名字 也还能用。</small>
        </div>
      </div>
      <div className="fg-field"><label>额外负面</label><input className="fg-input" value={draft.negativeExtra} onChange={e => set({ negativeExtra: e.target.value })} /></div>
      {units.length > 0 && <CgSpan gameId={gameId} image={image} units={units} />}
      <div className="fg-field"><label>画幅 / 种子</label>
        <div className="fg-row">
          <select className="fg-select" style={{ width: 'auto' }} value={draft.shape} onChange={e => set({ shape: e.target.value })}>
            <option value="portrait">竖版（剧场里会摇镜）</option><option value="landscape">横版</option><option value="square">方形</option>
          </select>
          <input className="fg-input" style={{ width: '14cqw' }} placeholder="随机" value={draft.seed} onChange={e => set({ seed: e.target.value.replace(/\D/g, '') })} />
          {version && <button type="button" className="fg-btn" onClick={() => set({ seed: String(version.seed ?? '') })}>沿用当前种子</button>}
        </div>
      </div>
      <div className="fg-field"><label>画风</label>
        <div className="fg-row">
          <select className="fg-select" style={{ width: 'auto' }} value={styles.some(x => x.id === draft.style) ? draft.style : ''} onChange={e => set({ style: e.target.value })}>
            <option value="">跟着当前画风（{currentName}）</option>
            {styles.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}
          </select>
          <span className="fg-note">只换这一张；画师串、正负面词、CFG 都按选的那套。</span>
        </div>
      </div>
      <div className="fg-field"><label>AI 改写</label>
        <div className="fg-row">
          <input className="fg-input" style={{ flex: 1, width: 'auto' }} placeholder="例如：改成雨夜、她在哭、镜头拉远……留空则让分镜师重读正文" value={instruction} onChange={e => setInstruction(e.target.value)} />
          <button type="button" className="fg-btn" disabled={busy === 'rw'} onClick={() => run('rw', async () => {
            const { draft: d } = await api.rewrite(gameId, image.id, instruction)
            set({ tags: d.tags || '', desc: d.desc || '', characters: (d.characters || []).map(c => ({ ...c })), shape: d.shape || draft.shape })
          }, '已改写，确认后点「按此重画」')}>{busy === 'rw' ? '分镜师在写…' : '改写'}</button>
        </div>
      </div>
      {version && (
        <details className="fg-note" style={{ margin: '0.6cqw 0' }}>
          <summary>当前版本实际发出的提示词</summary>
          <div className="fg-sent">
            <div>＋ {version.positive}</div>
            {(version.characters || []).map((c, i) => <div key={i}>角色 {i + 1}：{c}</div>)}
            <div>－ {version.negative}</div>
            <div>{version.backend} · {version.model}{version.style ? ` · 画风 ${version.style}` : ''} · seed {version.seed}{version.width ? ` · ${version.width}×${version.height}` : ''}</div>
          </div>
        </details>
      )}
      <div className="fg-row" style={{ justifyContent: 'flex-end' }}>
        <button type="button" className="fg-btn" onClick={onClose}>取消</button>
        <button type="button" className="fg-btn is-primary" onClick={() => run('go', async () => {
          await api.render(gameId, image.id, { tags: draft.tags, desc: draft.desc, characters: draft.characters, negativeExtra: draft.negativeExtra, shape: draft.shape, style: styles.some(x => x.id === draft.style) ? draft.style : '', ...(draft.seed ? { seed: Number(draft.seed) } : {}) })
          onClose()
        }, '已加入出图队列')}>按此重画</button>
      </div>
    </div>
  )
}

/** 剧场里这张插画从哪一句显示到哪一句。改了马上生效，不用重画。 */
function CgSpan({ gameId, image, units }) {
  const [busy, run] = useBusy()
  const from = Math.max(0, units.findIndex(u => u.id === image.after))
  const label = u => `${u.id} · ${u.text.length > 26 ? u.text.slice(0, 26) + '…' : u.text}`
  return (
    <div className="fg-field"><label>剧场里显示</label>
      <div className="fg-row">
        <span className="fg-note">从「{units[from] ? label(units[from]) : image.after}」到</span>
        <select className="fg-select" style={{ flex: 1, width: 'auto' }} disabled={busy === 'u'} value={image.until || ''} onChange={e => run('u', () => api.until(gameId, image.id, e.target.value), '已改好，剧场里马上生效')}>
          <option value="">这一轮结束</option>
          {units.slice(from).map(u => <option key={u.id} value={u.id}>{label(u)}</option>)}
        </select>
      </div>
    </div>
  )
}

export function Lightbox({ src, onClose, children }) {
  return (
    <div className="fg-lightbox" onClick={onClose}>
      <img src={src} alt="" onClick={e => e.stopPropagation()} />
      <div className="fg-row" onClick={e => e.stopPropagation()}>{children}</div>
    </div>
  )
}

/** 打开图片文件夹；插件跑在别的机器上打不开时，把路径复制下来告诉玩家。 */
function openLibrary(gameId) {
  return api.openLibrary(gameId).then(r => {
    const added = r.added ? `，补存了 ${r.added} 张` : ''
    if (r.opened) return toast(`已打开图片文件夹${added}`)
    try { navigator.clipboard.writeText(r.path).catch(() => {}) } catch {}
    toast(`图片在 ${r.path}${added}（路径已复制）`)
  })
}

function CgTile({ gameId, image, onOpen, onEdit }) {
  const [busy, run] = useBusy()
  const src = cgSrc(image, assetUrl)
  const pending = ['writing', 'queued', 'running'].includes(image.status)
  return (
    <div>
      <div className={`fg-thumb${src ? '' : ' is-locked'}`} onClick={() => src && onOpen(image)}>
        {src ? <img src={src} alt={image.title} loading="lazy" /> : <span>{pending ? (image.status === 'writing' ? '✍ ' : '🎨 ') + STATUS_LABEL[image.status] : image.status === 'failed' ? '⚠ ' + (image.error || '失败') : '未生成'}</span>}
        {pending && src && <span className="fg-pill is-busy" style={{ position: 'absolute', right: '.6cqw', top: '.6cqw' }}>{image.status === 'writing' ? '分镜中' : '重画中'}</span>}
        <div className="fg-thumb-cap">{image.title || '第 ' + image.turn + ' 轮插画'}{image.versions.length > 1 ? ` · ${image.current + 1}/${image.versions.length}` : ''}{image.retired ? ' · 重新整理前的' : ''}</div>
      </div>
      <div className="fg-row" style={{ marginTop: '.6cqw' }}>
        {pending
          ? <button type="button" className="fg-btn" onClick={() => run('c', () => api.cancel(gameId, 'cg', image.id), '已取消')}>取消</button>
          : <button type="button" className="fg-btn" disabled={busy === 'r'} onClick={() => run('r', () => api.render(gameId, image.id, {}), '已加入出图队列')}>重画</button>}
        <button type="button" className="fg-btn" onClick={() => onEdit(image)}>改词</button>
        <button type="button" className="fg-btn" onClick={() => { if (window.confirm('删除这张插画和它的所有版本？图片文件夹里另存的那份不会删。')) run('d', () => api.deleteImage(gameId, image.id), '已删除') }}>删除</button>
      </div>
      {image.status === 'failed' && image.error && <div className="fg-note fg-err" style={{ marginTop: '.4cqw' }}>{image.error}</div>}
    </div>
  )
}

export function Gallery({ view, gameId, onClose, focusId }) {
  const [tab, setTab] = React.useState('cg')
  const [open, setOpen] = React.useState(null)
  const [edit, setEdit] = React.useState(() => (focusId && view && view.images.find(i => i.id === focusId)) || null)
  const [busy, run] = useBusy()
  const images = (view && view.images) || []
  const places = Object.values((view && view.places) || {})
  const live = open && images.find(i => i.id === open.id)
  const editTurn = edit && ((view && view.turns) || []).find(t => t.textVersion === edit.textVersion)
  return (
    <Panel title="鉴赏" en="Gallery" onClose={onClose} tabs={[{ id: 'cg', label: `插画 CG · ${images.length}` }, { id: 'bg', label: `背景 · ${places.length}` }]} tab={tab} onTab={setTab}
      actions={<>
        <button type="button" className="fg-btn" title="画好的图按「卡名 / 插画 / 第几轮 标题」另存在这里，在文件夹里改图、删图不影响剧场" disabled={busy === 'lib'} onClick={() => run('lib', () => openLibrary(gameId))}>打开图片文件夹</button>
        <button type="button" className="fg-btn" title="当时没填 Key、关着自动出图、出图失败或被中断的插画、背景和立绘差分，一次补上" disabled={busy === 'fill'} onClick={() => run('fill', () => api.fill(gameId).then(r => toast(fillText(r))))}>补齐缺的图</button>
      </>}>
      {edit && <ImageEditor key={edit.id} gameId={gameId} image={images.find(i => i.id === edit.id) || edit} units={editTurn ? playedUnits(editTurn.units, editTurn.script) : []} onClose={() => setEdit(null)} />}
      {tab === 'cg' && (
        <div className="fg-grid">
          {/* 重新整理前的插画排在后面：聊天和剧场里已经撤下了，文件还在。 */}
          {[...images].sort((a, b) => Number(a.retired) - Number(b.retired)).map(img => <CgTile key={img.id} gameId={gameId} image={img} onOpen={setOpen} onEdit={setEdit} />)}
          {!images.length && <div className="fg-note">还没有插画。导演会在值得画的地方自动安排；也可以在聊天里点每条消息下方的「🎬 配一张」。</div>}
        </div>
      )}
      {tab === 'bg' && (
        <div className="fg-grid">
          {places.map(p => (
            <div key={p.key}>
              <div className={`fg-thumb${p.assetId ? '' : ' is-locked'}`} onClick={() => p.assetId && setOpen({ place: p })}>
                {p.assetId ? <img src={assetUrl(p.assetId)} alt={p.location} loading="lazy" /> : <span>{STATUS_LABEL[p.status] || p.error || '未生成'}</span>}
                <div className="fg-thumb-cap">{p.location} · {TIME_LABEL[p.time] || p.time}</div>
              </div>
              <div className="fg-row" style={{ marginTop: '.6cqw' }}>
                <button type="button" className="fg-btn" disabled={busy === p.key} onClick={() => run(p.key, () => api.place(gameId, p.key), '已加入出图队列')}>重画背景</button>
              </div>
              {p.status === 'failed' && <div className="fg-note fg-err">{p.error}</div>}
            </div>
          ))}
          {!places.length && <div className="fg-note">新地点出现时会自动生成背景（设置里可关）；没有生成时用程序化天空（按时段、天气变化）。</div>}
        </div>
      )}
      {live && cgSrc(live, assetUrl) && (
        <Lightbox src={cgSrc(live, assetUrl)} onClose={() => setOpen(null)}>
          <button type="button" className="fg-btn" disabled={live.current <= 0} onClick={() => run('v', () => api.version(gameId, live.id, live.current - 1))}>‹ 上一版</button>
          <span className="fg-pill">{live.current + 1} / {live.versions.length}</span>
          <button type="button" className="fg-btn" disabled={live.current >= live.versions.length - 1} onClick={() => run('v', () => api.version(gameId, live.id, live.current + 1))}>下一版 ›</button>
          <button type="button" className="fg-btn" onClick={() => { setOpen(null); setEdit(live) }}>改词重画</button>
          <a className="fg-btn" href={cgSrc(live, assetUrl)} download={`${live.title || live.id}.png`}>下载</a>
        </Lightbox>
      )}
      {open && open.place && <Lightbox src={assetUrl(open.place.assetId)} onClose={() => setOpen(null)}><span className="fg-pill">{open.place.location}</span></Lightbox>}
    </Panel>
  )
}

// ───────────────────────── 人物志 ─────────────────────────
const SPRITE_STATUS = { writing: '写词中', queued: '排队中', running: '绘制中', failed: '失败', cancelled: '已取消', face: '等认脸' }
const WRITER_LABEL = { ai: '立绘设计师写的', fallback: '按档案拼的（模型没写出来）', user: '你改的', upload: '你上传的' }
const LOG_ACTION = { create: 'AI 建档', change: '外貌变化', temp: '临时状态', edit: '手动修改', wear: '换装', states: '长期状态', outfit: '新衣服' }
const GENDERS = [['', '未知'], ['female', '女'], ['male', '男'], ['other', '其他']]

function readFile(file) {
  return new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(r.result); r.onerror = reject; r.readAsDataURL(file) })
}

/** 读一个逆转式素材包文件夹：找到 sprite.json（选了上一层文件夹也行），先检查格式，再按它收齐要用的图片（data URL）。 */
async function readAaFolder(files) {
  const path = f => f.webkitRelativePath || f.name
  // v2 的 motion.json（会侧头）优先；同一层两个都有时用 motion.json
  const json = files.filter(f => f.name === 'motion.json' || f.name === 'sprite.json')
    .sort((a, b) => path(a).length - path(b).length || (a.name === 'motion.json' ? -1 : 1))[0]
  if (!json) throw new Error('这个文件夹里没有 motion.json 或 sprite.json：选素材包所在的那个文件夹')
  const dir = path(json).slice(0, -json.name.length)
  let manifest
  try { manifest = JSON.parse(await json.text()) } catch { throw new Error(json.name + ' 不是合法的 JSON') }
  const pack = cleanPack(manifest)
  const byPath = new Map(files.map(f => [path(f), f]))
  const images = {}
  let total = 0
  for (const name of packFiles(pack)) {
    const file = byPath.get(dir + name)
    if (!file) throw new Error('素材包缺文件：' + name)
    total += file.size
    if (total > 11 * 1024 * 1024) throw new Error('素材包里的图片加起来超过 11MB，先压缩一下')
    images[name] = await readFile(file)
  }
  return { manifest, files: images }
}

/** 一个人的各套样子：当前这套在最前，其余是已经有立绘的。 */
function lookGroups(person) {
  const now = lookAt(person.timeline, Infinity)
  const groups = new Map([[lookKey(now), { key: lookKey(now), look: now, current: true }]])
  for (const [key, r] of Object.entries(person.sprites || {})) {
    const prefix = key.split('|').slice(0, 3).join('|')
    if (!groups.has(prefix)) groups.set(prefix, { key: prefix, look: { outfit: r.outfit || '', states: (r.states || []).map(name => ({ name })) }, current: false })
  }
  return [...groups.values()]
}

// 声音：音色按男女分组；音高上下各几个半音。
const VOICE_GROUPS = [['female', '女声'], ['male', '男声'], ['', '不分男女']]
const PITCHES = Array.from({ length: VOICE_PITCH_LIMIT * 2 + 1 }, (_, i) => i - VOICE_PITCH_LIMIT).map(n => [String(n), n > 0 ? `音高 +${n}` : n < 0 ? `音高 ${n}` : '音高 原调'])
const voiceText = voice => (voice ? voiceById(voice.id).label : '不出声')

// 固定外貌各字段的提示（照柏宝绘的写法）。
const LOOK_HINTS = {
  fandom: '同人角色填 character name (copyright)；原创留空',
  sex: '1girl / 1boy',
  hair: 'long black hair, ponytail',
  eyes: 'blue eyes',
  skin: 'pale skin（普通的不填）',
  body: 'slender, petite',
  extra: 'glasses, mole under eye（可不填）',
  other: '分不进上面各格的 tag。旧档案的一整串在这里，照常出图；想整理就挪进上面各格，tag 没变的话已经画好的立绘不用重画',
}

/** 档案：固定外貌（按字段）、性别、种子、声音、给立绘设计师的备注和负面词。全局角色改的是全局库。cast 是这一局的全部人物（自动分声音时避开别人）。 */
function ProfileEditor({ gameId, person, cast }) {
  const pick = p => ({
    look: Object.fromEntries(LOOK_FIELDS.map(f => [f, (p.appearanceFields || {})[f] || ''])),
    gender: p.gender || '', note: p.note || '', negative: p.negative || '', seed: p.seedCustom ? String(p.seed) : '', voice: p.voice || '', voicePitch: String(p.voicePitch || 0),
  })
  const [form, setForm] = React.useState(() => pick(person))
  const [busy, run] = useBusy()
  const cfg = useConfig()
  const ui = cfg ? cfg.config.ui : null
  React.useEffect(() => { setForm(pick(person)) }, [person.appearance, JSON.stringify(person.appearanceFields || {}), person.gender, person.note, person.negative, person.seed, person.seedCustom, person.voice, person.voicePitch])
  const dirty = JSON.stringify(form) !== JSON.stringify(pick(person))
  const set = k => e => setForm({ ...form, [k]: e.target.value })
  const setLook = f => e => setForm({ ...form, look: { ...form.look, [f]: e.target.value } })
  const save = () => {
    const { look, ...rest } = form
    // 一整串（appearance）也带上：后台按分格存；碰上还没重启、不认分格的旧后台时，至少这一串能存下，不会悄悄丢
    return run('save', () => api.cast(gameId, person.global ? 'global-save' : 'save', { name: person.name, patch: { ...rest, appearanceFields: look, appearance: lookTags(look, person.appearance), seed: form.seed === '' ? null : Number(form.seed), voicePitch: Number(form.voicePitch) } }), '档案已保存')
  }
  // 按表单里还没保存的选择试听；「自动」显示实际会分到哪个音色（跟着表单里的性别变）。
  const others = (cast || []).filter(p => p.name !== person.name)
  const draft = { ...person, gender: form.gender, voice: form.voice, voicePitch: Number(form.voicePitch) }
  const voiceNow = castVoices([...others, draft], ui).get(person.name)
  const autoVoice = castVoices([...others, { ...draft, voice: '' }], ui).get(person.name)
  return (
    <div className="fg-person-form">
      <div className="fg-field"><label>固定外貌</label>
        <div>
          <div className="fg-look-grid">
            {LOOK_FIELDS.map(f => (
              <label key={f} className={`fg-look-field${f === 'other' ? ' is-wide' : ''}`}>
                <span>{LOOK_FIELD_LABELS[f]}</span>
                {f === 'other'
                  ? <textarea className="fg-textarea is-short" value={form.look[f]} onChange={setLook(f)} onKeyDown={e => e.stopPropagation()} placeholder={LOOK_HINTS[f]} />
                  : <input className="fg-input" value={form.look[f]} onChange={setLook(f)} onKeyDown={e => e.stopPropagation()} placeholder={LOOK_HINTS[f]} />}
              </label>
            ))}
          </div>
          <div className="fg-note" style={{ marginTop: '.5cqw' }}>出图时用：{lookTags(form.look, person.appearance) || '（空）'}{person.appearance && lookTags(form.look, person.appearance) === person.appearance ? '（tag 没变，已画好的立绘照用）' : ''}　衣服不写在这里，走「衣橱与状态」。</div>
        </div>
      </div>
      <div className="fg-field"><label>性别 / 种子</label>
        <div className="fg-row">
          <select className="fg-select" style={{ width: 'auto' }} value={form.gender} onChange={set('gender')}>{GENDERS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
          <input className="fg-input" style={{ width: '12cqw' }} inputMode="numeric" value={form.seed} placeholder={`默认 ${person.seed}`} onChange={e => setForm({ ...form, seed: e.target.value.replace(/\D/g, '') })} onKeyDown={e => e.stopPropagation()} />
          <button type="button" className="fg-btn" title="换一个随机种子" onClick={() => setForm({ ...form, seed: String(Math.floor(Math.random() * 2 ** 31)) })}>🎲</button>
          <span className="fg-note">所有立绘差分共用这个种子</span>
        </div>
      </div>
      <div className="fg-field"><label>声音</label>
        <div className="fg-row">
          <select className="fg-select" style={{ width: 'auto' }} value={form.voice} onChange={set('voice')} aria-label="打字音音色">
            <option value="">自动（{voiceText(autoVoice)}）</option>
            <option value="off">不出声</option>
            {VOICE_GROUPS.map(([g, label]) => <optgroup key={g} label={label}>{VOICES.filter(v => v.gender === g).map(v => <option key={v.id} value={v.id}>{v.label}</option>)}</optgroup>)}
          </select>
          <select className="fg-select" style={{ width: 'auto' }} value={form.voicePitch} onChange={set('voicePitch')} aria-label="音高" title="升降几个半音">{PITCHES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
          <button type="button" className="fg-btn" disabled={!voiceNow} onClick={() => previewVoice(voiceNow, ui || undefined)}>▶ 试听</button>
          <span className="fg-note">这个角色说话时的打字音</span>
        </div>
      </div>
      <div className="fg-field"><label>立绘备注</label><textarea className="fg-textarea is-short" value={form.note} onChange={set('note')} onKeyDown={e => e.stopPropagation()} placeholder="写给立绘设计师，比如「右眼下有泪痣」「笑起来露虎牙」「总是抱着一本书」" /></div>
      <div className="fg-field"><label>不要出现</label><input className="fg-input" value={form.negative} onChange={set('negative')} onKeyDown={e => e.stopPropagation()} placeholder="glasses, ponytail（每张立绘都加进负面词）" /></div>
      <div className="fg-row" style={{ justifyContent: 'flex-end' }}><button type="button" className="fg-btn is-primary" disabled={!dirty || busy === 'save'} onClick={save}>保存档案</button></div>
    </div>
  )
}

/** 衣橱与状态：衣服的 tag、现在穿哪套、长期状态、临时状态。从最新一轮起生效；全局角色写在本局。 */
function WardrobeEditor({ gameId, person }) {
  const [, run] = useBusy()
  const [draft, setDraft] = React.useState({ name: '', tags: '' })
  const [stateDraft, setStateDraft] = React.useState({ name: '', tags: '' })
  const look = patch => api.cast(gameId, 'look', { name: person.name, patch })
  const outfits = Object.entries((person.timeline && person.timeline.outfits) || {})
  const states = person.states || []
  return (
    <div className="fg-person-form">
      <div className="fg-wardrobe">
        {outfits.map(([name, o]) => (
          <div key={name} className={`fg-outfit${person.outfit === name ? ' is-on' : ''}`}>
            <b>{name}</b>
            <Text value={o.tags || ''} placeholder="这套衣服的英文 tag" onCommit={v => run('o' + name, () => look({ outfits: { [name]: v } }), '已保存')} />
            {person.outfit === name ? <span className="fg-pill">正在穿</span> : <button type="button" className="fg-btn" onClick={() => run('w' + name, () => look({ wear: name }), `${person.name} 换上了${name}`)}>穿上</button>}
            <button type="button" className="fg-btn" title="从衣橱删掉" onClick={() => run('d' + name, () => look({ outfits: { [name]: null } }))}>✕</button>
          </div>
        ))}
        {!outfits.length && <div className="fg-note">衣橱还是空的。导演会在角色登场、换衣服时记下来；也可以自己加。</div>}
        <form className="fg-outfit is-new" onSubmit={e => { e.preventDefault(); if (draft.name.trim()) run('add', () => look({ outfits: { [draft.name.trim()]: draft.tags } }), '已加进衣橱').then(() => setDraft({ name: '', tags: '' })) }}>
          <input className="fg-input" placeholder="新衣服名" value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} onKeyDown={e => e.stopPropagation()} />
          <input className="fg-input" placeholder="pajamas, striped" value={draft.tags} onChange={e => setDraft({ ...draft, tags: e.target.value })} onKeyDown={e => e.stopPropagation()} />
          <button type="submit" className="fg-btn">加进衣橱</button>
        </form>
      </div>
      <div className="fg-field"><label>长期状态</label>
        <div className="fg-row">
          {states.map(st => (
            <span key={st.name} className="fg-state" title={st.tags}>{st.name}<button type="button" onClick={() => run('s' + st.name, () => look({ states: states.filter(x => x.name !== st.name) }), `${st.name} 结束了`)}>✕</button></span>
          ))}
          {!states.length && <span className="fg-note">无</span>}
          <form className="fg-row" onSubmit={e => { e.preventDefault(); if (stateDraft.name.trim()) run('sa', () => look({ states: [...states, { name: stateDraft.name.trim(), tags: stateDraft.tags }] }), '已加上').then(() => setStateDraft({ name: '', tags: '' })) }}>
            <input className="fg-input" style={{ width: '10cqw' }} placeholder="怀孕" value={stateDraft.name} onChange={e => setStateDraft({ ...stateDraft, name: e.target.value })} onKeyDown={e => e.stopPropagation()} />
            <input className="fg-input" style={{ width: '16cqw' }} placeholder="pregnant, round belly" value={stateDraft.tags} onChange={e => setStateDraft({ ...stateDraft, tags: e.target.value })} onKeyDown={e => e.stopPropagation()} />
            <button type="submit" className="fg-btn">加上</button>
          </form>
        </div>
      </div>
      <div className="fg-field"><label>临时状态</label><Text value={person.temp || ''} placeholder="wet hair, bandaged arm（只影响插画）" onCommit={v => run('t', () => look({ temp: v }), '已保存')} /></div>
      <div className="fg-note">长期状态和换装从最新一轮起生效，立绘按「服装 × 长期状态 × 情绪」各画一套；临时状态只进插画。</div>
    </div>
  )
}

/**
 * 给动作底图框脸（表情只换脸用）：一个框盖住眉毛到嘴、两颊，框外一点都不会变。
 * 打开时用存着的框；没有就照逆转式工作台框好的眼睛和嘴推，再没有就按立绘常见构图估一个。
 */
function FaceBoxEditor({ gameId, person, bodyKey, record, onDone }) {
  const [size, setSize] = React.useState(null)
  const [box, setBox] = React.useState(null)
  const [busy, run] = useBusy()
  const src = assetUrl(record.assetId)
  React.useEffect(() => {
    let live = true
    const img = new Image()
    img.onload = () => {
      if (!live) return
      const w = img.naturalWidth, h = img.naturalHeight
      setSize({ w, h })
      setBox(record.faceBox || (record.aa && record.aa.rects && faceBoxFrom(record.aa.rects, w, h)) || faceBoxFrom(defaultRects(w, h), w, h) || [0, 0, 64, 64])
    }
    img.src = src
    return () => { live = false }
  }, [src])
  if (!size || !box) return <div className="fg-note">读图中…</div>
  const auto = () => run('auto', async () => {
    const status = await visionApi.status()
    if (!status.packs.basic.ready) throw new Error('先在逆转式工作台下载认脸小模型')
    const r = await frameSprite(status, src)
    const found = r && faceBoxFrom(r.rects, size.w, size.h)
    if (!found) throw new Error('没认出脸，手动拖一下框')
    setBox(found)
    if (r.confidence === 'low') toast('认得没把握，看一眼框对不对', 'error')
  })
  const save = () => run('save', async () => {
    const ok = cleanFaceBox(box, size.w, size.h)
    if (!ok) throw new Error('框太小或太大：框住眉毛到嘴就够（不超过整张图的六分之一）')
    const r = await api.cast(gameId, 'face-box', { name: person.name, key: bodyKey, box: ok, by: 'hand' })
    toast(r.redo ? `脸框已存，同组 ${r.redo} 张表情重换中` : '脸框已存')
    onDone()
  })
  return (
    <div className="fg-face-editor">
      <RectEditor src={src} width={size.w} height={size.h} rects={{ face: [box] }} parts={['face']} names={{ face: ['脸'] }} zoom onChange={r => setBox(r.face[0])} />
      <div className="fg-row">
        <button type="button" className="fg-btn is-mini is-primary" disabled={busy === 'save'} onClick={save}>存下并重换同组表情</button>
        <button type="button" className="fg-btn is-mini" disabled={busy === 'auto'} onClick={auto}>{busy === 'auto' ? '认脸中…' : '🪄 自动认脸'}</button>
        <button type="button" className="fg-btn is-mini" onClick={onDone}>取消</button>
      </div>
      <div className="fg-note">框住眉毛到嘴、两颊（下巴轮廓和头发外沿别框进去）。拖框移动，拖右下角改大小；框外的地方换脸时一点都不会变。</div>
    </div>
  )
}

/** 表情只换脸：这张是换脸的（在哪张底图上换）、或者是动作底图（几张表情在它上面换、脸框认好没有）。 */
function FaceInfo({ gameId, person, group, emotionKey, record, emotions }) {
  const [busy, run] = useBusy()
  const [framing, setFraming] = React.useState(false)
  const sprites = person.sprites || {}
  if (record && record.face) {
    const body = sprites[record.face.from]
    const bodyLabel = body ? emotionEntry(body.emotion || record.face.from.split('|').pop(), emotions).label : record.face.from.split('|').pop()
    return (
      <div className="fg-row fg-face-info">
        <span className="fg-note">只换脸：在「{bodyLabel}」这张「{(POSES[record.face.pose] || {}).label || '动作'}」底图上重画脸，身体衣服跟底图一样{Number.isInteger(record.face.seed) ? ` · 脸的种子 ${record.face.seed}` : ''}</span>
        {record.assetId && <button type="button" className="fg-btn is-mini" disabled={busy === 'redo'} onClick={() => run('redo', () => api.cast(gameId, 'face-redo', { name: person.name, key: emotionKey }), '换个种子重画脸')}>换个种子重画脸</button>}
      </div>
    )
  }
  const deps = Object.values(sprites).filter(r => r && r.face && r.face.from === emotionKey)
  if (!record || !record.assetId || (!deps.length && !record.pose)) return null
  const auto = framedResult(record.assetId)
  const boxText = record.faceBox ? (record.faceBy === 'hand' ? '脸框：你框的' : '脸框：自动认出') : auto === 'miss' ? '脸框：自动没认准，框一下' : '脸框：还没认（剧场开着、认脸小模型下好时自动认）'
  return (
    <>
      <div className="fg-row fg-face-info">
        <span className="fg-note">「{(POSES[record.pose] || {}).label || '动作'}」动作底图：同组 {deps.length} 张表情在它上面只换脸，重画或上传这张，它们会跟着重换。{boxText}</span>
        <button type="button" className="fg-btn is-mini" onClick={() => setFraming(!framing)}>{framing ? '收起' : record.faceBox ? '调整脸框' : '框脸'}</button>
      </div>
      {framing && <FaceBoxEditor gameId={gameId} person={person} bodyKey={emotionKey} record={record} onDone={() => setFraming(false)} />}
    </>
  )
}

/** 选中的一张差分：看 / 改提示词，让立绘设计师重写，按自己的词画，上传，删除。 */
function VariantEditor({ gameId, person, group, emotion, emotions, turn, onClose }) {
  const key = `${group.key}|${emotion}`
  const record = (person.sprites || {})[key] || null
  const st = (person.spriteStatus || {})[key]
  const [tags, setTags] = React.useState(record ? record.tags || '' : '')
  const [busy, run] = useBusy()
  const fileRef = React.useRef(null)
  const aaRef = React.useRef(null)
  React.useEffect(() => { setTags(record ? record.tags || '' : '') }, [key, record && record.tags])
  const entry = emotionEntry(emotion, emotions)
  const reachable = group.current || turn != null
  const at = group.current ? {} : { turn }
  const label = `${person.name} · ${lookLabel(group.look)} · ${entry.label}`
  const [viewing, setViewing] = React.useState(false)
  return (
    <div className="fg-variant">
      {/* 做过逆转式动态的直接动起来；点一下放大看 */}
      <div className="fg-variant-art">{record && record.assetId ? <SpriteArt record={record} label={label} onOpen={() => setViewing(true)} /> : <span>{st ? SPRITE_STATUS[st.status] : '还没画'}</span>}</div>
      {viewing && <SpriteViewer record={record} label={label} onClose={() => setViewing(false)} />}
      <div className="fg-variant-body">
        <div className="fg-row"><b>{label}</b><span className="fg-spacer" /><button type="button" className="fg-btn is-mini" onClick={onClose}>收起</button></div>
        {entry.desc && <div className="fg-note">情绪：{entry.desc}{entry.base ? `（接近${emotionLabel(entry.base)}）` : ''}</div>}
        {st && st.error && <div className={`fg-note${st.status === 'face' ? '' : ' fg-err'}`}>{st.error}</div>}
        <FaceInfo gameId={gameId} person={person} group={group} emotionKey={key} record={record} emotions={emotions} />
        <textarea className="fg-textarea" value={tags} onChange={e => setTags(e.target.value)} onKeyDown={e => e.stopPropagation()} placeholder={record && record.face ? '只换脸：这里只写表情（眉、眼、嘴、脸红、泪、视线）' : '还没有提示词：点「让设计师写」，它会读完资料和剧情来写'} />
        <div className="fg-note">{record && record.writer ? WRITER_LABEL[record.writer] || record.writer : ''}{record && record.seed != null ? ` · 种子 ${record.seed}` : ''}{!reachable ? ' · 这套样子在剧情里已经不会再出现（外貌改过），只能删除或上传' : ''}</div>
        <div className="fg-row">
          <button type="button" className="fg-btn is-primary" disabled={!reachable || busy === 'w'} onClick={() => run('w', () => api.cast(gameId, 'sprite', { name: person.name, emotion, rewrite: true, ...at }), '已交给立绘设计师：写好词就画')}>{record && record.assetId ? '让设计师重写并重画' : '让设计师写并画'}</button>
          <button type="button" className="fg-btn" disabled={!reachable || !tags.trim() || busy === 'u'} onClick={() => run('u', () => api.cast(gameId, 'sprite', { name: person.name, emotion, tags, ...at }), '已排队：按这些词画')}>按这些词画</button>
          <button type="button" className="fg-btn" disabled={!reachable} onClick={() => fileRef.current && fileRef.current.click()}>上传到这张</button>
          {record && <button type="button" className="fg-btn" onClick={() => run('d', () => api.cast(gameId, 'sprite-delete', { name: person.name, key }), '已删除').then(onClose)}>删除</button>}
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={async e => {
            const file = e.target.files && e.target.files[0]
            e.target.value = ''
            if (!file) return
            const dataUrl = await readFile(file)
            run('up', () => api.cast(gameId, 'upload', { name: person.name, emotion, dataUrl, ...at }), '立绘已上传')
          }} />
        </div>
        <div className="fg-row">
          <span className="fg-note">{record && record.aa ? `逆转式素材包${record.aa.pack && record.aa.pack.name ? `「${record.aa.pack.name}」` : ''}：${record.aa.pack && record.aa.pack.version === 2 ? `会眨眼，说话时按字动嘴${Object.keys(record.aa.pack.poses || {}).length > 1 ? '，导演让他侧头时会转过去' : ''}` : '会呼吸、眨眼，说话时动嘴'}` : '逆转式立绘：导入素材包文件夹（motion.json 或 sprite.json 加图片），这张就会眨眼、动嘴（新版还会侧头）；图会换成素材包自带的那张'}</span>
          <button type="button" className="fg-btn" disabled={!reachable || busy === 'aa'} onClick={() => aaRef.current && aaRef.current.click()}>{busy === 'aa' ? '导入中…' : record && record.aa ? '换素材包' : '导入素材包'}</button>
          {record && record.aa && record.aa.pack && <button type="button" className="fg-btn" disabled={busy === 'aa-rm'} onClick={() => run('aa-rm', () => api.cast(gameId, 'aa-remove', { name: person.name, key }), '已取消动态，图留着')}>取消动态</button>}
          <input ref={aaRef} type="file" webkitdirectory="" multiple hidden onChange={e => {
            const files = [...(e.target.files || [])]
            e.target.value = ''
            if (files.length) run('aa', async () => { const { manifest, files: images } = await readAaFolder(files); await api.cast(gameId, 'aa-pack', { name: person.name, emotion, manifest, files: images, ...at }) }, '素材包已导入：这张立绘会呼吸、眨眼、动嘴了')
          }} />
        </div>
      </div>
    </div>
  )
}

function PersonCard({ gameId, person, emotions, cast, voice, used, onBench }) {
  const [busy, run] = useBusy()
  const groups = React.useMemo(() => lookGroups(person), [person])
  const [groupKey, setGroupKey] = React.useState('')
  const [emotion, setEmotion] = React.useState('')
  const [fold, setFold] = React.useState('')
  const [manage, setManage] = React.useState(false) // 管理立绘：格子变成多选，批量删除
  const [picked, setPicked] = React.useState(() => new Set())
  const group = groups.find(g => g.key === groupKey) || groups[0]
  const turn = group.current ? null : findLookTurn(person.timeline, group.key)
  const now = lookAt(person.timeline, Infinity)
  const main = pickSprite(person.sprites, now, 'neutral')
  // 情绪格子：内置的、这个人用过或画过的新情绪（别人的新情绪不挂过来）；这套样子已经有图的排前面。
  const drawnEmotions = Object.keys(person.sprites || {}).map(k => k.split('|').pop())
  const tiles = personEmotions(person.name, emotions, { used, drawn: drawnEmotions }).map(e => ({ ...e, key: `${group.key}|${e.id}`, record: (person.sprites || {})[`${group.key}|${e.id}`], st: (person.spriteStatus || {})[`${group.key}|${e.id}`] }))
  tiles.sort((a, b) => Number(Boolean(b.record && b.record.assetId)) - Number(Boolean(a.record && a.record.assetId)))
  const drawn = tiles.filter(t => t.record && t.record.assetId).length
  const deletable = tiles.filter(t => t.record)
  const pick = key => setPicked(p => { const n = new Set(p); if (n.has(key)) n.delete(key); else n.add(key); return n })
  const endManage = () => { setManage(false); setPicked(new Set()) }
  const removePicked = () => {
    const keys = [...picked]
    if (!keys.length || !window.confirm(`删除 ${person.name} 的 ${keys.length} 张立绘？${person.global ? '这是全局角色，所有对局里都会少这几张。' : ''}删掉后可以再画。`)) return
    run('del', () => api.cast(gameId, 'sprite-delete', { name: person.name, keys }).then(endManage), `已删除 ${keys.length} 张`)
  }
  const mainRecord = main ? Object.values(person.sprites || {}).find(r => r && r.assetId === main) : null
  const [viewing, setViewing] = React.useState(false)
  return (
    <div className="fg-person" style={{ '--c': person.color }}>
      <div className="fg-person-art">{mainRecord ? <SpriteArt record={mainRecord} label={person.name} onOpen={() => setViewing(true)} /> : <Silhouette name={person.name} color={person.color} appearance={person.appearance} gender={person.gender} />}</div>
      {viewing && mainRecord && <SpriteViewer record={mainRecord} label={`${person.name} · ${lookLabel(now)}`} onClose={() => setViewing(false)} />}
      <div className="fg-person-main">
        <h3>
          <span style={{ color: person.color }}>{person.name}</span>
          {person.global ? <small>全局 · 外貌冻结</small> : <small>本局{person.createdTurn != null ? ` · 第 ${person.createdTurn} 轮登场` : ''}</small>}
          <small title="此刻的样子">{lookLabel(now)}</small>
          {person.temp && <small title="临时状态，只进插画">临时：{person.temp}</small>}
        </h3>
        <div className="fg-person-tags">
          {person.appearance ? LOOK_FIELDS.filter(f => (person.appearanceFields || {})[f]).map(f => (
            <span key={f} className="fg-look-chip" title={LOOK_FIELD_LABELS[f]}>{f === 'other' ? null : <i>{LOOK_FIELD_LABELS[f]}</i>}{person.appearanceFields[f]}</span>
          )) : '（还没有固定外貌）'}
          {person.outfitTags ? <span className="fg-look-chip" title="这身衣服"><i>{person.outfit || '衣服'}</i>{person.outfitTags}</span> : null}
        </div>
        <div className="fg-row fg-person-folds">
          <button type="button" className={`fg-btn${fold === 'profile' ? ' is-on' : ''}`} onClick={() => setFold(fold === 'profile' ? '' : 'profile')}>档案 · 种子 {person.seed} · 声音 {voiceText(voice)}{voice && voice.auto ? '（自动）' : ''}</button>
          <button type="button" className={`fg-btn${fold === 'wardrobe' ? ' is-on' : ''}`} onClick={() => setFold(fold === 'wardrobe' ? '' : 'wardrobe')}>衣橱与状态 · {Object.keys((person.timeline && person.timeline.outfits) || {}).length} 套</button>
        </div>
        {fold === 'profile' && <ProfileEditor gameId={gameId} person={person} cast={cast} />}
        {fold === 'wardrobe' && <WardrobeEditor gameId={gameId} person={person} />}
        <div className="fg-looks">
          {groups.map(g => (
            <button key={g.key} type="button" className={`fg-look${g.key === group.key ? ' is-on' : ''}`} onClick={() => { setGroupKey(g.key); setEmotion(''); setPicked(new Set()) }}>
              {lookLabel(g.look)}{g.current ? <i>现在</i> : null}
            </button>
          ))}
          <span className="fg-note">已画 {drawn} 种情绪</span>
          <span className="fg-spacer" />
          {!manage && <button type="button" className="fg-btn is-mini" disabled={!deletable.length} onClick={() => { setManage(true); setEmotion('') }}>管理立绘</button>}
        </div>
        {manage && (
          <div className="fg-row fg-manage">
            <span className="fg-note">点格子选中要删的（只能选画过或记过提示词的），已选 {picked.size}</span>
            <button type="button" className="fg-btn is-mini" onClick={() => setPicked(new Set(deletable.map(t => t.key)))}>全选</button>
            <button type="button" className="fg-btn is-mini" onClick={() => setPicked(new Set())}>全不选</button>
            <button type="button" className="fg-btn is-mini fg-danger" disabled={!picked.size || busy === 'del'} onClick={removePicked}>删除所选（{picked.size}）</button>
            <button type="button" className="fg-btn is-mini" onClick={endManage}>完成</button>
          </div>
        )}
        <div className="fg-emos">
          {tiles.map(t => (
            <button key={t.id} type="button" title={t.st && t.st.error ? t.st.error : t.desc || t.label} disabled={manage && !t.record}
              className={`fg-emo${t.st && ['writing', 'queued', 'running'].includes(t.st.status) ? ' is-busy' : ''}${!manage && emotion === t.id ? ' is-on' : ''}${manage && picked.has(t.key) ? ' is-picked' : ''}${t.builtin ? '' : ' is-custom'}`}
              onClick={() => (manage ? pick(t.key) : setEmotion(emotion === t.id ? '' : t.id))}>
              {t.record && t.record.assetId && <img src={assetUrl(t.record.assetId)} alt="" loading="lazy" />}
              <span>{t.label}{t.record && t.record.face ? ' · 脸' : ''}{t.record && t.record.aa ? ' · 动' : ''}{t.st && t.st.status === 'failed' ? ' ⚠' : t.st && t.st.status === 'face' ? ' …' : ''}</span>
            </button>
          ))}
        </div>
        {emotion && !manage && <VariantEditor key={group.key + emotion} gameId={gameId} person={person} group={group} emotion={emotion} emotions={emotions} turn={turn} onClose={() => setEmotion('')} />}
        <div className="fg-row">
          <button type="button" className="fg-btn" disabled={busy === 'fill'} onClick={() => run('fill', () => api.cast(gameId, 'fill', { name: person.name }).then(r => toast(fillText(r))))}>补齐剧情里用到的差分</button>
          <button type="button" className="fg-btn" disabled={!drawn && !Object.values(person.sprites || {}).some(r => r && r.assetId)} onClick={onBench}>逆转式工作台（眨眼、口型）</button>
          {!person.global && <button type="button" className="fg-btn" onClick={() => run('g', () => api.cast(gameId, 'promote', { name: person.name }), '已提升为全局角色：所有对局共用，AI 不再改它的固定外貌')}>提升为全局</button>}
          {person.global && <button type="button" className="fg-btn" onClick={() => run('l', () => api.cast(gameId, 'copy-local', { name: person.name }), '已复制到本局，可单独修改')}>复制到本局</button>}
          {person.global && <button type="button" className="fg-btn" onClick={() => { if (window.confirm('从全局库移除？各对局里的副本不受影响。')) run('u', () => api.cast(gameId, 'unglobal', { name: person.name }), '已移出全局库') }}>移出全局</button>}
          {!person.global && <button type="button" className="fg-btn" onClick={() => { if (window.confirm(`删除 ${person.name} 的本局档案和立绘记录？`)) run('d', () => api.cast(gameId, 'delete', { name: person.name }), '已删除') }}>删除</button>}
        </div>
        {person.versions && person.versions.length > 1 && (
          <div className="fg-note" style={{ marginTop: '.6cqw' }}>
            外貌时间线：{person.versions.map(v => `第 ${v.fromTurn} 轮起「${String(v.tags).slice(0, 40)}${String(v.tags).length > 40 ? '…' : ''}」`).join(' → ')}
          </div>
        )}
      </div>
    </div>
  )
}

/** 情绪库：内置情绪 + 导演自创的、你加的。新情绪写一句神情姿态，立绘设计师照着画。 */
function EmotionLibrary({ emotions }) {
  const [busy, run] = useBusy()
  const [draft, setDraft] = React.useState({ id: '', desc: '', base: '' })
  const builtin = allEmotions([]).filter(e => e.builtin)
  const custom = (emotions || [])
  const baseOptions = [['', '（无）'], ...builtin.map(e => [e.id, e.label])]
  const save = (id, patch) => run('e' + id, () => api.emotion('save', { id, ...patch }), '已保存')
  return (
    <>
      <div className="fg-note">导演给每句台词标情绪；库里没有贴切的词时，它会自创一个（可以是复合情绪，比如「带着烦躁思考」），写一句神情姿态，加进这里。导演新造的情绪只挂在用过它的角色下面，谁用到了才给谁画差分；你自己加的大家都能用。所有对局共用。</div>
      <div className="fg-section">新加的情绪 · {custom.length}</div>
      {custom.map(e => (
        <div key={e.id} className="fg-emotion-row">
          <b>{e.id}</b>
          <Text value={e.desc || ''} placeholder="神情与姿态：眉眼、嘴角、脸色、手和身体" onCommit={v => save(e.id, { desc: v })} />
          <Select value={e.base || ''} options={baseOptions} onChange={v => save(e.id, { base: v })} />
          <span className="fg-note">{e.source === 'user' ? '你加的 · 大家都能用' : `导演加的${e.turn != null ? ` · 第 ${e.turn} 轮` : ''}${e.who && e.who.length ? ` · 用于 ${e.who.join('、')}` : ''}`}</span>
          <button type="button" className="fg-btn" disabled={busy === 'x' + e.id} onClick={() => run('x' + e.id, () => api.emotion('delete', { id: e.id }), '已删除（画好的立绘还在）')}>删除</button>
        </div>
      ))}
      {!custom.length && <div className="fg-note">还没有。导演遇到内置情绪表达不了的瞬间时会自己加。</div>}
      <form className="fg-emotion-row is-new" onSubmit={e => { e.preventDefault(); if (draft.id.trim()) run('add', () => api.emotion('save', draft), '已加进情绪库').then(() => setDraft({ id: '', desc: '', base: '' })) }}>
        <input className="fg-input" placeholder="苦闷地表白" value={draft.id} onChange={e => setDraft({ ...draft, id: e.target.value })} onKeyDown={e => e.stopPropagation()} />
        <input className="fg-input" placeholder="眉头紧锁却脸红，攥着衣角，视线躲开" value={draft.desc} onChange={e => setDraft({ ...draft, desc: e.target.value })} onKeyDown={e => e.stopPropagation()} />
        <Select value={draft.base} options={baseOptions} onChange={v => setDraft({ ...draft, base: v })} />
        <button type="submit" className="fg-btn is-primary">加进情绪库</button>
      </form>
      <div className="fg-section">内置 · {builtin.length}</div>
      <div className="fg-row">{builtin.map(e => <span key={e.id} className="fg-chip">{e.label}<small>{e.id}</small></span>)}</div>
    </>
  )
}

export function CastPanel({ view, gameId, onClose }) {
  const [tab, setTab] = React.useState('people')
  const [busy, run] = useBusy()
  const [name, setName] = React.useState('')
  const cast = (view && view.cast) || []
  const log = (view && view.castLog) || []
  const emotions = (view && view.emotions) || []
  const cfg = useConfig()
  const voices = castVoices(cast, cfg ? cfg.config.ui : null)
  const [bench, setBench] = React.useState('') // 打开了谁的逆转式工作台
  const benchPerson = bench && cast.find(p => p.name === bench)
  // 这一局里每个人说话时用过哪些情绪（老存档的新情绪还没记是谁用的，按这个挂）
  const used = React.useMemo(() => {
    const map = new Map()
    for (const t of (view && view.turns) || []) {
      for (const line of Object.values((t.script && t.script.lines) || {})) if (line.sp && line.emo) map.set(line.sp, [...(map.get(line.sp) || []), line.emo])
    }
    return map
  }, [view && view.turns])
  return (
    <Panel title="人物志" en="Characters" onClose={onClose} tabs={[{ id: 'people', label: `人物 · ${cast.length}` }, { id: 'emotions', label: `情绪库 · ${allEmotions(emotions).length}` }, { id: 'log', label: `档案变更 · ${log.length}` }]} tab={tab} onTab={setTab}
      actions={tab === 'people' && (
        <div className="fg-row">
          <button type="button" className="fg-btn" disabled={busy === 'fill'} onClick={() => run('fill', () => api.fill(gameId, { kinds: ['sprite'] }).then(r => toast(fillText(r))))}>补齐所有立绘</button>
          <form className="fg-row" onSubmit={e => { e.preventDefault(); if (name.trim()) run('new', () => api.cast(gameId, 'save', { name: name.trim(), patch: {} }), '已新建').then(() => setName('')) }}>
            <input className="fg-input" style={{ width: '14cqw' }} placeholder="新人物名字" value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.stopPropagation()} />
            <button type="submit" className="fg-btn">新建</button>
          </form>
        </div>
      )}>
      {tab === 'people' && benchPerson && <AaWorkbench key={bench} gameId={gameId} person={benchPerson} onClose={() => setBench('')} />}
      {tab === 'people' && !benchPerson && cast.map(p => <PersonCard key={p.name} gameId={gameId} person={p} emotions={emotions} cast={cast} voice={voices.get(p.name)} used={used.get(p.name) || []} onBench={() => setBench(p.name)} />)}
      {tab === 'people' && !cast.length && <div className="fg-note">有名字的角色第一次出场时，导演会自动给他建档：固定外貌、身上的衣服。之后插画里写 @名字 都会换成这份档案，长相不再漂移；立绘按「服装 × 长期状态 × 情绪」各画一套，同一个种子。</div>}
      {tab === 'emotions' && <EmotionLibrary emotions={emotions} />}
      {tab === 'log' && log.map(e => (
        <div key={e.index} className="fg-log-item" style={{ gridTemplateColumns: '12cqw 1fr auto', cursor: 'default' }}>
          <div className="fg-log-name">{e.name}</div>
          <div><b style={{ color: 'var(--accent)' }}>{LOG_ACTION[e.action] || e.action}</b>{e.turn != null ? ` · 第 ${e.turn} 轮` : ''}{e.source === 'user' ? ' · 手动' : ''}<br /><span className="fg-note">{e.action === 'outfit' ? `${e.outfit}：` : ''}{e.before ? `${e.before} → ` : ''}{e.after || (e.action === 'temp' || e.action === 'states' ? '（解除）' : '')}</span></div>
          {e.rolledBack ? <span className="fg-note">已回滚</span> : <button type="button" className="fg-btn" disabled={busy === 'rb' + e.index} onClick={() => run('rb' + e.index, () => api.cast(gameId, 'rollback', { index: e.index }), '已回滚')}>回滚</button>}
        </div>
      ))}
      {tab === 'log' && !log.length && <div className="fg-note">AI 每次建档、改外貌、换装、加长期 / 临时状态都会记在这里，可以一键回滚。</div>}
    </Panel>
  )
}

// ───────────────────────── 设置 ─────────────────────────
function Field({ label, hint, children }) {
  return (
    <>
      <div className="fg-field"><label>{label}</label><div>{children}</div></div>
      {hint && <div className="fg-note" style={{ margin: '-0.5cqw 0 0.6cqw 15.2cqw' }}>{hint}</div>}
    </>
  )
}
function Toggle({ value, onChange }) {
  return <button type="button" className={`fg-switch${value ? ' is-on' : ''}`} aria-pressed={Boolean(value)} onClick={() => onChange(!value)} />
}
/** 文本框：失焦或回车时才提交。 */
function Text({ value, onCommit, type = 'text', placeholder, style }) {
  const [v, setV] = React.useState(value ?? '')
  React.useEffect(() => { setV(value ?? '') }, [value])
  const commit = () => { if (String(v) !== String(value ?? '')) onCommit(type === 'number' ? Number(v) : v) }
  return <input className="fg-input" type={type} value={v} placeholder={placeholder} style={style} onChange={e => setV(e.target.value)} onBlur={commit} onKeyDown={e => { e.stopPropagation(); if (e.key === 'Enter') commit() }} />
}
function Select({ value, options, onChange, style }) {
  return <select className="fg-select" value={value} style={style} onChange={e => onChange(e.target.value)}>{options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
}
// 和按钮排在同一行的下拉框：按内容宽，不占满一行。
const INLINE = { width: 'auto' }

/** 模型选择：有列表时下拉选（列表里没有的当前值也保留），随时可以切到手动填写。 */
function ModelField({ value, options, onCommit, placeholder, emptyLabel }) {
  const [manual, setManual] = React.useState(false)
  if (manual || !options.length) {
    return (
      <div className="fg-row">
        <Text value={value} placeholder={placeholder} style={{ flex: 1, width: 'auto' }} onCommit={onCommit} />
        {options.length > 0 && <button type="button" className="fg-btn" onClick={() => setManual(false)}>从列表选</button>}
      </div>
    )
  }
  const known = !value || options.some(o => o.id === value)
  const opts = [
    ...(emptyLabel ? [['', emptyLabel]] : []),
    ...(known ? [] : [[value, value + '（当前）']]),
    ...options.map(o => [o.id, o.name]),
    ['__manual', '手动填写…'],
  ]
  return <Select value={value} options={opts} onChange={v => (v === '__manual' ? setManual(true) : onCommit(v))} />
}
/** 列表里的字符串选项；当前值不在列表里时保留并标注。 */
function listOptions(list, value, emptyLabel) {
  const opts = (list || []).map(v => [v, v])
  if (value && !(list || []).includes(value)) opts.unshift([value, value + '（当前）'])
  if (emptyLabel) opts.unshift(['', emptyLabel])
  return opts
}

function KeyInput({ backend, endpoint, has }) {
  const [value, setValue] = React.useState('')
  const [busy, run] = useBusy()
  return (
    <div className="fg-row">
      <input className="fg-input" style={{ flex: 1, width: 'auto' }} type="password" autoComplete="off" placeholder={has ? '已保存（不会回显）；填新的会覆盖' : '粘贴 Key'} value={value} onChange={e => setValue(e.target.value)} onKeyDown={e => e.stopPropagation()} />
      <button type="button" className="fg-btn is-primary" disabled={!value || busy === 's'} onClick={() => run('s', async () => { setConfig(await api.secret(backend, endpoint, value)); setValue('') }, 'Key 已保存在宿主，不会发到浏览器')}>保存</button>
      {has && <button type="button" className="fg-btn" onClick={() => run('c', async () => setConfig(await api.secret(backend, endpoint, '')), '已清除')}>清除</button>}
      <span className={has ? 'fg-ok' : 'fg-note'}>{has ? '✓ 已保存' : '未填写'}</span>
    </div>
  )
}

function BackendSection({ data }) {
  const cfg = data.config
  const backend = cfg.images.backend
  const [busy, run] = useBusy()
  const [test, setTest] = React.useState(null)
  const [list, setList] = React.useState(null)
  const [relay, setRelay] = React.useState({ name: '', baseURL: '' })
  const p = (section, patch) => patchConfig({ [section]: patch }).catch(e => toast(e.message, 'error'))
  // 模型列表跟着渠道、地址和 Key 走：换了任何一个就重新读。
  const source = backend === 'novelai' ? '' : [cfg[backend].baseURL, cfg[backend].authType, data.keys[backend]].join('|')
  const loadList = () => run('m', async () => setList(await api.models()))
  React.useEffect(() => { setList(null); loadList() }, [backend, source])
  const models = (list && list.backend === backend && list.models) || []
  const samplers = (list && list.backend === backend && list.samplers) || []
  const schedulers = (list && list.backend === backend && list.schedulers) || []
  const modelHint = list ? list.note : '正在读取模型列表…'
  const refresh = <button type="button" className="fg-btn" disabled={busy === 'm'} onClick={loadList}>{busy === 'm' ? '读取中…' : '刷新列表'}</button>
  const doTest = () => run('t', async () => { setTest(await api.test()); if (backend !== 'novelai') loadList() })
  // V5 起固定 karras、没有 Variety+、支持透明底；没见过的模型按名字里的版本号判断（与宿主一致）。
  const nai = naiModelInfo(cfg.novelai.model) || {}
  const auth = section => (
    <Field label="鉴权"><Select value={cfg[section].authType} onChange={v => p(section, { authType: v })} options={[['none', '无'], ['bearer', 'Bearer Token'], ['basic', 'Basic（用户名:密码）']]} /></Field>
  )
  return (
    <>
      <div className="fg-section">生图渠道</div>
      <Field label="渠道">
        <Select value={backend} onChange={v => p('images', { backend: v })} options={[['novelai', 'NovelAI'], ['comfyui', 'ComfyUI'], ['openai', 'OpenAI 兼容（gpt-image / 聊天出图）'], ['webui', 'SD WebUI / Forge']]} />
      </Field>
      {backend === 'novelai' && (
        <>
          <Field label="接入点" hint="官方站与第三方中转站各存一条，各记各的 Key；换站不影响模型与画风。">
            <div className="fg-row">
              <Select value={cfg.novelai.endpoint} onChange={v => p('novelai', { endpoint: v })} options={cfg.novelai.endpoints.map(e => [e.id, e.name])} />
              {cfg.novelai.endpoint !== 'official' && <button type="button" className="fg-btn" onClick={() => p('novelai', { endpoint: 'official', endpoints: cfg.novelai.endpoints.filter(e => e.id !== cfg.novelai.endpoint) })}>删除此站</button>}
            </div>
          </Field>
          <Field label="添加中转站">
            <div className="fg-row">
              <input className="fg-input" style={{ width: '12cqw' }} placeholder="名称" value={relay.name} onChange={e => setRelay(r => ({ ...r, name: e.target.value }))} onKeyDown={e => e.stopPropagation()} />
              <input className="fg-input" style={{ flex: 1, width: 'auto' }} placeholder="https://…" value={relay.baseURL} onChange={e => setRelay(r => ({ ...r, baseURL: e.target.value }))} onKeyDown={e => e.stopPropagation()} />
              <button type="button" className="fg-btn" disabled={!/^https?:\/\//.test(relay.baseURL)} onClick={() => {
                const id = 'relay' + Date.now().toString(36).slice(-5)
                p('novelai', { endpoints: [...cfg.novelai.endpoints, { id, name: relay.name || id, baseURL: relay.baseURL }], endpoint: id })
                setRelay({ name: '', baseURL: '' })
              }}>添加</button>
            </div>
          </Field>
          <Field label="Key"><KeyInput backend="novelai" endpoint={cfg.novelai.endpoint} has={data.keys['novelai:' + cfg.novelai.endpoint]} /></Field>
          <Field label="模型" hint={modelHint}><ModelField value={cfg.novelai.model} options={models} placeholder="nai-diffusion-…" onCommit={v => p('novelai', { model: v })} /></Field>
          <Field label="采样器"><Select value={cfg.novelai.sampler} onChange={v => p('novelai', { sampler: v })} options={listOptions(samplers, cfg.novelai.sampler)} /></Field>
          <Field label="步数 / 提示词引导" hint="当前画风里填了 CFG 时，以画风的为准。">
            <div className="fg-row"><Text type="number" style={{ width: '8cqw' }} value={cfg.novelai.steps} onCommit={v => p('novelai', { steps: v })} /><Text type="number" style={{ width: '8cqw' }} value={cfg.novelai.scale} onCommit={v => p('novelai', { scale: v })} /></div>
          </Field>
          <Field label="引导缩放" hint="Prompt Guidance Rescale，0–1。提示词引导调高后画面发灰、过饱和时往上加一点。当前画风里填了 CFG Rescale 时，以画风的为准。">
            <input type="range" min="0" max="1" step="0.02" value={cfg.novelai.cfgRescale} onChange={e => p('novelai', { cfgRescale: Number(e.target.value) })} style={{ width: '24cqw' }} /><span className="fg-note" style={{ marginLeft: '1cqw' }}>{Number(cfg.novelai.cfgRescale).toFixed(2)}</span>
          </Field>
          {nai.v5 ? (
            <Field label="透明底立绘" hint="V5 才有：立绘按透明背景生成，站在场景里不会带一块白底。CG 和背景不受影响。"><Toggle value={cfg.images.transparentSprites} onChange={v => p('images', { transparentSprites: v })} /></Field>
          ) : (
            <>
              <Field label="噪声调度"><Select value={cfg.novelai.noiseSchedule} onChange={v => p('novelai', { noiseSchedule: v })} options={listOptions(schedulers, cfg.novelai.noiseSchedule)} /></Field>
              {nai.v4 && <Field label="Variety+" hint="前几步不跟提示词，构图更多样；代价是没那么听话。"><Toggle value={cfg.novelai.variety} onChange={v => p('novelai', { variety: v })} /></Field>}
            </>
          )}
        </>
      )}
      {backend === 'comfyui' && (
        <>
          <Field label="地址"><Text value={cfg.comfyui.baseURL} onCommit={v => p('comfyui', { baseURL: v })} /></Field>
          {auth('comfyui')}
          {cfg.comfyui.authType !== 'none' && <Field label="Token"><KeyInput backend="comfyui" has={data.keys.comfyui} /></Field>}
          <Field label="模式"><Select value={cfg.comfyui.mode} onChange={v => p('comfyui', { mode: v })} options={[['simple', '简单（只选底模）'], ['workflow', '导入工作流（API 格式 JSON）']]} /></Field>
          {cfg.comfyui.mode === 'simple' ? (
            <>
              <Field label="底模" hint={modelHint}>
                <div className="fg-row"><div style={{ flex: 1 }}><ModelField value={cfg.comfyui.checkpoint} options={models} emptyLabel="（请选择）" placeholder="xxx.safetensors" onCommit={v => p('comfyui', { checkpoint: v })} /></div>{refresh}</div>
              </Field>
              {samplers.length > 0 && <Field label="采样器 / 调度器"><div className="fg-row"><Select value={cfg.comfyui.sampler} onChange={v => p('comfyui', { sampler: v })} options={listOptions(samplers, cfg.comfyui.sampler)} /><Select value={cfg.comfyui.scheduler} onChange={v => p('comfyui', { scheduler: v })} options={listOptions(schedulers, cfg.comfyui.scheduler)} /></div></Field>}
              <Field label="步数 / CFG" hint="当前画风里填了 CFG 时，以画风的为准。"><div className="fg-row"><Text type="number" style={{ width: '8cqw' }} value={cfg.comfyui.steps} onCommit={v => p('comfyui', { steps: v })} /><Text type="number" style={{ width: '8cqw' }} value={cfg.comfyui.cfg} onCommit={v => p('comfyui', { cfg: v })} /></div></Field>
            </>
          ) : (
            <Field label="工作流" hint="支持 %prompt% %negative% %width% %height% %seed% %steps% %cfg% 占位符；没有占位符时自动找正负提示词、尺寸和采样节点。">
              <div className="fg-row">
                {cfg.comfyui.workflows.length > 0 && <Select value={cfg.comfyui.workflow || cfg.comfyui.workflows[0].id} onChange={v => p('comfyui', { workflow: v })} options={cfg.comfyui.workflows.map(w => [w.id, w.name])} />}
                <label className="fg-btn">导入 JSON<input type="file" accept="application/json,.json" hidden onChange={async e => {
                  const file = e.target.files && e.target.files[0]
                  e.target.value = ''
                  if (!file) return
                  try {
                    const graph = JSON.parse(await file.text())
                    if (!graph || typeof graph !== 'object' || Array.isArray(graph) || graph.nodes) throw new Error('需要 ComfyUI「导出（API）」格式的 JSON')
                    const id = 'wf' + Date.now().toString(36)
                    await patchConfig({ comfyui: { workflows: [...cfg.comfyui.workflows, { id, name: file.name.replace(/\.json$/i, ''), graph }], workflow: id } })
                    toast('工作流已导入')
                  } catch (err) { toast(String(err.message || err), 'error') }
                }} /></label>
                {cfg.comfyui.workflows.length > 0 && <button type="button" className="fg-btn" onClick={() => p('comfyui', { workflows: cfg.comfyui.workflows.filter(w => w.id !== (cfg.comfyui.workflow || cfg.comfyui.workflows[0].id)), workflow: '' })}>删除当前</button>}
              </div>
            </Field>
          )}
        </>
      )}
      {backend === 'openai' && (
        <>
          <Field label="API 地址"><Text value={cfg.openai.baseURL} onCommit={v => p('openai', { baseURL: v })} /></Field>
          <Field label="Key"><KeyInput backend="openai" has={data.keys.openai} /></Field>
          <Field label="接口"><Select value={cfg.openai.mode} onChange={v => p('openai', { mode: v })} options={[['images', '/images/generations'], ['chat', '/chat/completions（回复里带图的模型）']]} /></Field>
          <Field label="模型" hint={modelHint}>
            <div className="fg-row"><div style={{ flex: 1 }}><ModelField value={cfg.openai.model} options={models} emptyLabel="（请选择）" placeholder="gpt-image-1" onCommit={v => p('openai', { model: v })} /></div>{refresh}</div>
          </Field>
          <Field label="横 / 竖 / 方尺寸"><div className="fg-row"><Text style={{ width: '10cqw' }} value={cfg.openai.landscapeSize} onCommit={v => p('openai', { landscapeSize: v })} /><Text style={{ width: '10cqw' }} value={cfg.openai.portraitSize} onCommit={v => p('openai', { portraitSize: v })} /><Text style={{ width: '10cqw' }} value={cfg.openai.squareSize} onCommit={v => p('openai', { squareSize: v })} /></div></Field>
        </>
      )}
      {backend === 'webui' && (
        <>
          <Field label="地址"><Text value={cfg.webui.baseURL} onCommit={v => p('webui', { baseURL: v })} /></Field>
          {auth('webui')}
          {cfg.webui.authType !== 'none' && <Field label="凭据"><KeyInput backend="webui" has={data.keys.webui} /></Field>}
          <Field label="底模" hint={modelHint}>
            <div className="fg-row"><div style={{ flex: 1 }}><ModelField value={cfg.webui.model} options={models} emptyLabel="跟随服务器当前底模" placeholder="模型标题" onCommit={v => p('webui', { model: v })} /></div>{refresh}</div>
          </Field>
          {samplers.length > 0 && <Field label="采样器 / 调度器"><div className="fg-row"><Select value={cfg.webui.sampler} onChange={v => p('webui', { sampler: v })} options={listOptions(samplers, cfg.webui.sampler)} /><Select value={cfg.webui.scheduler} onChange={v => p('webui', { scheduler: v })} options={listOptions(schedulers, cfg.webui.scheduler, '自动')} /></div></Field>}
          <Field label="步数 / CFG" hint="当前画风里填了 CFG 时，以画风的为准。"><div className="fg-row"><Text type="number" style={{ width: '8cqw' }} value={cfg.webui.steps} onCommit={v => p('webui', { steps: v })} /><Text type="number" style={{ width: '8cqw' }} value={cfg.webui.cfg} onCommit={v => p('webui', { cfg: v })} /></div></Field>
        </>
      )}
      <Field label="种子" hint="-1 表示每张随机；填一个数字后所有图都用它，方便复现同一种构图。单张图可以在鉴赏的「改词」里另外指定。">
        <Text type="number" style={{ width: '16cqw' }} value={cfg.images.seed} onCommit={v => p('images', { seed: v === '' ? -1 : v })} />
      </Field>
      <Field label="连接">
        <div className="fg-row">
          <button type="button" className="fg-btn" disabled={busy === 't'} onClick={doTest}>{busy === 't' ? '测试中…' : '测试连接'}</button>
          {test && <span className={test.ok ? 'fg-ok' : 'fg-err'}>{test.message}</span>}
          {!test && <span className={data.ready ? 'fg-ok' : 'fg-note'}>{data.ready ? '✓ 可以出图' : data.readyReason}</span>}
        </div>
      </Field>
    </>
  )
}

const newStyleId = () => 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
/** 导出、导入用的样子：不带 id 和样图。 */
const exportStyle = st => ({ name: st.name, artist: st.artist, positive: st.positive, negative: st.negative, cfg: st.cfg, cfgRescale: st.cfgRescale })
/** 粘贴进来的：一套或几套画风的 JSON；不是 JSON 就当成一串画师串。 */
function parseStyles(text) {
  const raw = String(text || '').trim()
  if (!raw) return []
  try {
    const data = JSON.parse(raw)
    const list = Array.isArray(data) ? data : Array.isArray(data?.styles) ? data.styles : [data]
    return list.filter(x => x && typeof x === 'object').map(x => ({ ...exportStyle(x), artist: String(x.artist ?? x.text ?? ''), name: String(x.name || '导入的画风') }))
  } catch {
    return [{ name: '导入的画风', artist: raw, positive: null, negative: null, cfg: null, cfgRescale: null }]
  }
}
/** 空着 = 跟随渠道（null）；填了数字就用数字。 */
const blankNumber = v => (String(v).trim() === '' || !Number.isFinite(Number(v)) ? null : Number(v))
/** 渠道自己的 CFG / CFG Rescale（画风里没填时用它）。 */
function backendGuidance(cfg) {
  const b = cfg.images.backend
  if (b === 'novelai') return { cfg: cfg.novelai.scale, rescale: cfg.novelai.cfgRescale }
  if (b === 'comfyui' || b === 'webui') return { cfg: cfg[b].cfg, rescale: null }
  return { cfg: null, rescale: null }
}

let styleQueue = Promise.resolve()
/** 画风的修改一个接一个发，每次都在最新的设置上改（连着改两处不会互相盖掉）。make(最新的 style) 返回要改的部分。 */
function saveStyle(make, msg) {
  styleQueue = styleQueue.then(async () => {
    const latest = (await loadConfig()).config.style
    const patch = make(latest)
    if (!patch) return
    await patchConfig({ style: patch })
    if (msg) toast(msg)
  }).catch(e => toast(e.message, 'error'))
  return styleQueue
}

/** 多行文字，离开输入框时保存。 */
function Area({ value, onCommit, placeholder, disabled, short }) {
  const [v, setV] = React.useState(value ?? '')
  React.useEffect(() => { setV(value ?? '') }, [value])
  return <textarea className={`fg-textarea${short ? ' is-short' : ''}`} value={v} placeholder={placeholder} disabled={disabled} onChange={e => setV(e.target.value)} onBlur={() => { if (v !== (value ?? '')) onCommit(v) }} onKeyDown={e => e.stopPropagation()} />
}

/** 画风：一套 = 画师串 + 正面词 + 负面词 + CFG + CFG Rescale。点卡片切换，下面编辑正在用的这套。 */
function StyleSection({ data }) {
  const cfg = data.config
  const styles = cfg.style.presets
  const st = styles.find(x => x.id === cfg.style.current) || styles[0]
  const key = modelKey(cfg.images.backend, cfg)
  const own = backendGuidance(cfg)
  const [importText, setImportText] = React.useState(null)
  const [busy, run] = useBusy()
  // 打开这一页时拿一次最新的（别处试画完的样图）。
  React.useEffect(() => { loadConfig(true).catch(() => {}) }, [])
  const id = st.id
  const edit = patch => saveStyle(s => ({ presets: s.presets.map(x => (x.id === id ? { ...x, ...patch } : x)) }))
  /** 加几套（新建、复制、导入）：插在正在编辑的这套后面，并切到第一套新的。 */
  const add = (list, msg) => saveStyle(s => {
    const fresh = list.slice(0, MAX_STYLES - s.presets.length).map(x => ({ ...x, id: newStyleId() }))
    if (!fresh.length) { toast(`画风最多存 ${MAX_STYLES} 套`, 'error'); return null }
    const at = s.presets.findIndex(x => x.id === id) + 1
    return { presets: [...s.presets.slice(0, at), ...fresh, ...s.presets.slice(at)], current: fresh[0].id }
  }, msg)
  const remove = () => {
    if (styles.length <= 1 || !window.confirm(`删除画风「${st.name}」？`)) return
    saveStyle(s => {
      const at = s.presets.findIndex(x => x.id === id)
      const rest = s.presets.filter(x => x.id !== id)
      return rest.length ? { presets: rest, current: rest[Math.min(Math.max(at, 0), rest.length - 1)].id } : null
    }, '已删除')
  }
  const builtins = data.presets?.styles || []
  const missing = builtins.filter(b => !styles.some(x => x.id === b.id))
  const copy = text => { try { navigator.clipboard.writeText(text).then(() => toast('已复制到剪贴板'), () => toast('复制失败', 'error')) } catch { toast('复制失败', 'error') } }
  const artistPreview = st.artist ? st.artist : '（不加画师串）'
  const positive = qualityFor(cfg.style, key)
  return (
    <>
      <div className="fg-section">画风</div>
      <div className="fg-skins fg-styles">
        {styles.map(x => (
          <button key={x.id} type="button" className={`fg-skin fg-style${x.id === st.id ? ' is-on' : ''}`} onClick={() => x.id !== st.id && saveStyle(() => ({ current: x.id }))} title={x.artist || '不加画师串'}>
            <div className="fg-style-cover" style={x.cover ? { backgroundImage: `url(${assetUrl(x.cover)})` } : undefined}>{!x.cover && <span>还没试画</span>}</div>
            <b>{x.name}</b><span>{x.artist || '不加画师串'}</span>
          </button>
        ))}
        <button type="button" className="fg-skin fg-style is-new" onClick={() => add([{ name: '新画风', artist: '', positive: null, negative: null, cfg: null, cfgRescale: null }], '已新建，下面填画师串')}>
          <div className="fg-style-cover"><span>＋</span></div><b>新建画风</b><span>从空白开始</span>
        </button>
      </div>

      <div className="fg-section">编辑「{st.name}」</div>
      <Field label="名字">
        <div className="fg-row">
          <Text value={st.name} style={{ width: '18cqw' }} onCommit={v => edit({ name: v })} />
          <button type="button" className="fg-btn" onClick={() => add([{ ...exportStyle(st), name: st.name.slice(0, 36) + ' 副本' }], '已复制一份')}>复制一份</button>
          <button type="button" className="fg-btn" disabled={styles.length <= 1} onClick={remove}>删除</button>
        </div>
      </Field>
      <Field label="画师串" hint="放在提示词最前面。NovelAI 写 artist:xxx，权重写 1.2::artist:xxx::（发给 SD 时自动换成括号写法）。">
        <Area value={st.artist} placeholder="artist:xxx, artist:yyy, 1.2::artist:zzz::, …" onCommit={v => edit({ artist: v })} />
      </Field>
      <Field label="正面词" hint={st.positive === null ? `跟着当前模型（${key}）用默认质量词，放在提示词最后。` : '放在提示词最后。留空就是不加。'}>
        <div className="fg-row" style={{ marginBottom: '.5cqw' }}><Toggle value={st.positive === null} onChange={v => edit({ positive: v ? null : positive })} /><span className="fg-note">用模型默认的质量词</span></div>
        <Area short value={positive} disabled={st.positive === null} onCommit={v => edit({ positive: v })} />
      </Field>
      <Field label="负面词" hint={st.negative === null ? `跟着当前模型（${key}）用默认负面词。` : '每张图都带上。'}>
        <div className="fg-row" style={{ marginBottom: '.5cqw' }}><Toggle value={st.negative === null} onChange={v => edit({ negative: v ? null : negativeFor(cfg.style, key) })} /><span className="fg-note">用模型默认的负面词</span></div>
        <Area short value={negativeFor(cfg.style, key)} disabled={st.negative === null} onCommit={v => edit({ negative: v })} />
      </Field>
      <Field label="CFG" hint="留空就用「生图渠道」里的设置。CFG Rescale 只有 NovelAI 用（0～1）；OpenAI 渠道两个都不用。">
        <div className="fg-row">
          <Text style={{ width: '11cqw' }} value={st.cfg ?? ''} placeholder={own.cfg != null ? `跟随渠道（${own.cfg}）` : '跟随渠道'} onCommit={v => edit({ cfg: blankNumber(v) })} />
          <span className="fg-note">CFG Rescale</span>
          <Text style={{ width: '11cqw' }} value={st.cfgRescale ?? ''} placeholder={own.rescale != null ? `跟随渠道（${own.rescale}）` : '跟随渠道'} onCommit={v => edit({ cfgRescale: blankNumber(v) })} />
          {(st.cfg !== null || st.cfgRescale !== null) && <button type="button" className="fg-btn" onClick={() => edit({ cfg: null, cfgRescale: null })}>都跟随渠道</button>}
        </div>
      </Field>
      <Field label="发出去的样子" hint="插画、背景、立绘都按这个顺序拼。">
        <div className="fg-sent fg-note">
          <div>＋ {artistPreview}, <i>画面内容……</i>{positive ? ', ' + positive : ''}</div>
          <div>－ {negativeFor(cfg.style, key) || '（无）'}</div>
          <div>CFG {st.cfg ?? own.cfg ?? '—'}{cfg.images.backend === 'novelai' ? ` · CFG Rescale ${st.cfgRescale ?? own.rescale ?? 0}` : ''}</div>
        </div>
      </Field>
      <Field label="试画" hint="用下面的「试画内容」和固定种子画一张竖版样图，当这套画风卡片的封面。几套都试画过，放在一起就好比较。">
        <div className="fg-row">
          <button type="button" className="fg-btn is-primary" disabled={busy === 'sample:' + id || !data.ready} onClick={() => run('sample:' + id, () => api.sampleStyle(id).then(() => loadConfig(true)), '样图画好了')}>{busy === 'sample:' + id ? '正在画…' : st.cover ? '重新试画' : '试画一张'}</button>
          {!data.ready && <span className="fg-note">{data.readyReason}</span>}
        </div>
      </Field>
      <Field label="试画内容"><Text value={cfg.style.sample} onCommit={v => saveStyle(() => ({ sample: v }))} /></Field>
      <Field label="分享">
        <div className="fg-row">
          <button type="button" className="fg-btn" onClick={() => copy(JSON.stringify(exportStyle(st), null, 1))}>导出这套</button>
          <button type="button" className="fg-btn" onClick={() => copy(JSON.stringify({ styles: styles.map(exportStyle) }, null, 1))}>导出全部</button>
          <button type="button" className="fg-btn" onClick={() => setImportText(importText === null ? '' : null)}>导入</button>
          {missing.length > 0 && <button type="button" className="fg-btn" onClick={() => saveStyle(s => ({ presets: [...s.presets, ...builtins.filter(b => !s.presets.some(x => x.id === b.id))] }), '已加回内置画风')}>加回内置画风（{missing.length}）</button>}
        </div>
      </Field>
      {importText !== null && (
        <Field label="" hint="粘贴导出的画风（一套或几套），也可以直接粘贴一串画师串。">
          <textarea className="fg-textarea" value={importText} placeholder='{"name": "…", "artist": "artist:xxx, …"}' onChange={e => setImportText(e.target.value)} onKeyDown={e => e.stopPropagation()} />
          <div className="fg-row" style={{ justifyContent: 'flex-end', marginTop: '.5cqw' }}>
            <button type="button" className="fg-btn" onClick={() => setImportText(null)}>取消</button>
            <button type="button" className="fg-btn is-primary" disabled={!importText.trim()} onClick={() => { const list = parseStyles(importText); if (list.length) { add(list, `已导入 ${list.length} 套`); setImportText(null) } }}>导入并使用</button>
          </div>
        </Field>
      )}
    </>
  )
}

function DirectorSection({ data, onDirectorLog }) {
  const cfg = data.config
  const [llm, setLlm] = React.useState({ providers: [], models: [] })
  React.useEffect(() => { api.llm(cfg.director.provider).then(setLlm).catch(() => {}) }, [cfg.director.provider])
  const p = patch => patchConfig({ director: patch }).catch(e => toast(e.message, 'error'))
  return (
    <>
      <div className="fg-section">导演（后台整理）{onDirectorLog && <button type="button" className="fg-btn" onClick={onDirectorLog}>查看导演日志</button>}</div>
      <Field label="自动整理" hint="每轮正文写完后，后台模型把它整理成场景：说话人、表情、站位、镜头、天气、选项、插画分镜。正文一字不改。"><Toggle value={cfg.director.auto} onChange={v => p({ auto: v })} /></Field>
      <Field label="模型" hint={hostName() === 'st' ? '默认跟着酒馆当前的连接；也可以选一套连接配置（在酒馆「API 连接」里存的）专门给导演用，整理用便宜的小模型就够。' : '留空跟随 Tavern 的后台模型。整理用的是便宜的小模型就够。'}>
        <div className="fg-row">
          <Select value={cfg.director.provider} onChange={v => p({ provider: v, model: '' })} options={[['', hostName() === 'st' ? '跟着酒馆当前的连接' : '跟随 Tavern'], ...llm.providers.map(x => [x.id, x.name])]} />
          {cfg.director.provider && (llm.models.length
            ? <Select value={cfg.director.model} onChange={v => p({ model: v })} options={[['', '（请选择）'], ...llm.models.map(m => [m.id, m.name])]} />
            : <Text value={cfg.director.model} placeholder="模型 ID" onCommit={v => p({ model: v })} />)}
        </div>
      </Field>
      <Field label="最大输出 / 温度" hint="默认 128000（当前主流大模型的输出上限）。模型窗口装不下时自动往下收；模型拒绝这个值时按它报的上限重试一次。导演日志里能看到实际用了多少。"><div className="fg-row"><Text type="number" style={{ width: '9cqw' }} value={cfg.director.maxTokens} onCommit={v => p({ maxTokens: v })} /><Text type="number" style={{ width: '7cqw' }} value={cfg.director.temperature} onCommit={v => p({ temperature: v })} /></div></Field>
      <Field label="资料长度" hint="给导演看多少人物卡 / 世界书（字），用来判断人物外貌。默认 1000000，等于不截断；超出模型窗口时自动缩短。"><Text type="number" value={cfg.director.contextChars} onCommit={v => p({ contextChars: v })} /></Field>
      <Field label="自定义提示词" hint="留空用内置导演提示词。可用 {{maxImages}} {{styleHint}}。情绪库、配乐曲库附在用户消息里，自定义时也生效。">
        <textarea className="fg-textarea" defaultValue={cfg.director.systemPrompt} onKeyDown={e => e.stopPropagation()} onBlur={e => { if (e.target.value !== cfg.director.systemPrompt) p({ systemPrompt: e.target.value }) }} />
      </Field>
      <Field label="立绘设计师提示词" hint="留空用内置的。可用 {{styleHint}}。输出格式必须是 {&quot;sprites&quot;:[{&quot;key&quot;,&quot;tags&quot;,&quot;negative&quot;}]}。">
        <textarea className="fg-textarea" defaultValue={cfg.director.spritePrompt} onKeyDown={e => e.stopPropagation()} onBlur={e => { if (e.target.value !== cfg.director.spritePrompt) p({ spritePrompt: e.target.value }) }} />
      </Field>
      <Field label="插画分镜师提示词" hint="留空用内置的（Base + 每人一个角色块的写法）。可用 {{styleHint}}。输出格式必须是 {&quot;images&quot;:[{&quot;key&quot;,&quot;tag&quot;,&quot;nl&quot;,&quot;characters&quot;:[{&quot;name&quot;,&quot;tag&quot;,&quot;nl&quot;}],&quot;size&quot;}]}。">
        <textarea className="fg-textarea" defaultValue={cfg.director.cgPrompt} onKeyDown={e => e.stopPropagation()} onBlur={e => { if (e.target.value !== cfg.director.cgPrompt) p({ cgPrompt: e.target.value }) }} />
      </Field>
    </>
  )
}

/** 动作组：每个内置情绪归哪组。改回默认组时写 null（设置里删掉这条改动）。 */
function PoseGroups({ poses, onChange }) {
  const changed = Object.keys(poses).length > 0
  return (
    <Field label="动作组" hint="每组整张画一张底图（标「底图」的情绪），同组其余情绪在它上面只换脸。想让某个情绪换个动作，就把它挪到别的组；导演新造的情绪跟着它最接近的内置情绪走。改了只影响之后画的。">
      <div className="fg-pose-grid">
        {POSE_IDS.map(pose => (
          <div key={pose} className="fg-pose-col">
            <b>{POSES[pose].label}</b>
            {poseMembers(pose, [], poses).map(e => (
              <label key={e} className="fg-pose-item">
                <span>{EMOTIONS[e]}{anchorOf(pose, [], poses) === e ? <i> · 底图</i> : null}</span>
                <select value={pose} onChange={ev => onChange({ [e]: ev.target.value === EMOTION_POSE[e] ? null : ev.target.value })}>
                  {POSE_IDS.map(id => <option key={id} value={id}>{POSES[id].label}</option>)}
                </select>
              </label>
            ))}
            {!poseMembers(pose, [], poses).length && <span className="fg-note">（空着：这组不画）</span>}
          </div>
        ))}
      </div>
      {changed && <button type="button" className="fg-btn is-mini" onClick={() => onChange(Object.fromEntries(Object.keys(poses).map(k => [k, null])))}>恢复默认分组</button>}
    </Field>
  )
}

const SIZE_SHAPES = [['landscape', '横版'], ['portrait', '竖版'], ['square', '方形']]
/** 「1216×832」「1216x832」「1216 832」都认。 */
const parseSize = text => { const m = /^\s*(\d{3,4})\s*[×xX*，, ]\s*(\d{3,4})\s*$/.exec(String(text)); return m ? [Number(m[1]), Number(m[2])] : null }

function ImagesSection({ data }) {
  const cfg = data.config
  const p = patch => patchConfig({ images: patch }).catch(e => toast(e.message, 'error'))
  return (
    <>
      <div className="fg-section">自动配图</div>
      <Field label="自动插画" hint="导演判断值得画的地方自动出 CG，挂在正文对应段落后。"><div className="fg-row"><Toggle value={cfg.images.auto} onChange={v => p({ auto: v })} /><span className="fg-note">每轮最多</span><Text type="number" style={{ width: '6cqw' }} value={cfg.images.maxPerTurn} onCommit={v => p({ maxPerTurn: v })} /><span className="fg-note">张</span></div></Field>
      <Field label="新地点背景"><Toggle value={cfg.images.backgrounds} onChange={v => p({ backgrounds: v })} /></Field>
      <Field label="立绘" hint="角色登场、换装、长期状态变化时，画这一套的平静立绘。"><Toggle value={cfg.images.portraits} onChange={v => p({ portraits: v })} /></Field>
      <Field label="情绪差分" hint="导演用到这一套还没有的情绪时补画（包括它自创的新情绪）。漏掉的可以在人物志里一键补齐。"><div className="fg-row"><Toggle value={cfg.images.expressions} onChange={v => p({ expressions: v })} /><span className="fg-note">每轮最多</span><Text type="number" style={{ width: '6cqw' }} value={cfg.images.expressionsPerTurn} onCommit={v => p({ expressionsPerTurn: v })} /><span className="fg-note">张</span></div></Field>
      <Field label="表情只换脸" hint="galgame 的「一个动作 + 一套表情」：同一套衣服每个动作组整张画一张底图，同组其余情绪用 NovelAI 局部重绘只重画脸（眉、眼、两颊、嘴），身体和衣服一个像素都不动。底图画好后要认一次脸：剧场开着、认脸小模型下好时自动认，认不准的在人物志里点开底图框一下。只对 NovelAI 有效；关掉就像以前一样每个情绪整张画。已经画好的立绘不会自动重画。"><Toggle value={cfg.images.faceSwap} onChange={v => p({ faceSwap: v })} /></Field>
      {cfg.images.faceSwap && <PoseGroups poses={cfg.images.poses || {}} onChange={poses => p({ poses })} />}
      <Field label="立绘设计师" hint="立绘提示词由后台模型读完人物卡、世界书和到这一轮为止的全部剧情来写，一个角色一次写一批差分（用导演的模型和资料长度设置；窗口装不下时从最早的剧情删起）。关掉则按档案机械拼。"><Toggle value={cfg.images.spriteWriter} onChange={v => p({ spriteWriter: v })} /></Field>
      <Field label="并发"><Text type="number" style={{ width: '6cqw' }} value={cfg.images.concurrency} onCommit={v => p({ concurrency: v })} /></Field>
      <div className="fg-section">尺寸</div>
      <Field label="插画、背景、立绘" hint="宽×高，按 64 取整。默认是 NovelAI 常用的三种；超过 1024×1024 面积的尺寸在 NovelAI 上要扣点数。剧场画面默认跟横版一样的比例。">
        <div className="fg-row">
          {SIZE_SHAPES.map(([shape, label]) => (
            <label key={shape} className="fg-row" style={{ gap: '.4em' }}><span className="fg-note">{label}</span>
              <Text style={{ width: '9cqw' }} value={cfg.images.sizes[shape].join('×')} onCommit={v => { const size = parseSize(v); if (size) p({ sizes: { ...cfg.images.sizes, [shape]: size } }); else toast('写成「宽×高」，比如 1216×832', 'error') }} />
            </label>
          ))}
        </div>
      </Field>
      <div className="fg-section">图片文件夹</div>
      <Field label="另存一份" hint="画好的插画、背景、立绘按「卡名 / 插画 / 第 3 轮 标题」这样的名字复制一份，方便在文件夹里找。那里的图改了、删了都不影响剧场；删局、重新整理也不会删它们。"><Toggle value={cfg.images.library} onChange={v => p({ library: v })} /></Field>
      {hostName() === 'st' ? <div className="fg-note">酒馆版存在酒馆的 data/&lt;用户&gt;/user/images/FlowGal-&lt;卡名&gt;/ 里（浏览器没法选别的文件夹），酒馆自带的「图库」也能看到。</div> : (
      <Field label="位置" hint={`现在是 ${(data.paths && data.paths.library) || '数据目录下的「图片」'}。留空用数据目录下的「图片」；要换地方就填绝对路径，比如 D:\\Pictures\\FlowGal。`}>
        <div className="fg-row"><Text value={cfg.images.libraryDir} placeholder="留空用默认位置" style={{ flex: 1 }} onCommit={v => p({ libraryDir: v })} /><button type="button" className="fg-btn" onClick={() => openLibrary('').catch(e => toast(e.message, 'error'))}>打开</button></div>
      </Field>
      )}
    </>
  )
}

const landscapeSize = cfg => { const { width, height } = sizeFor(cfg, 'landscape'); return `${width}×${height}` }

export function LookSection({ data }) {
  const cfg = data.config
  const p = patch => patchConfig({ ui: patch }).catch(e => toast(e.message, 'error'))
  return (
    <>
      <div className="fg-section">界面皮肤</div>
      <div className="fg-skins">
        {SKINS.map(s => (
          <button key={s.id} type="button" className={`fg-skin${cfg.ui.skin === s.id ? ' is-on' : ''}`} onClick={() => p({ skin: s.id })}>
            <div className="fg-skin-swatch" style={{ background: s.swatch }} />
            <b>{s.name}</b><span>{s.desc}</span>
          </button>
        ))}
      </div>
      <div className="fg-section">画面</div>
      <Field label="画面比例" hint="跟横版插画一样时，插画正好铺满舞台（默认就是 NovelAI 常用的 1216×832；横版尺寸在「画风与配图 → 尺寸」里改）。">
        <select className="fg-select" style={{ width: 'auto' }} value={cfg.ui.ratio} onChange={e => p({ ratio: e.target.value })}>
          <option value="cg">跟横版插画一样（{landscapeSize(data.config)}）</option>
          <option value="wide">16:9 宽屏</option>
        </select>
      </Field>
      <div className="fg-section">演出</div>
      <Field label="文字速度" hint="每字毫秒，0 为瞬间显示。"><input type="range" min="0" max="80" value={cfg.ui.textSpeed} onChange={e => p({ textSpeed: Number(e.target.value) })} style={{ width: '100%' }} /></Field>
      <Field label="自动播放间隔"><input type="range" min="400" max="4000" step="100" value={cfg.ui.autoDelay} onChange={e => p({ autoDelay: Number(e.target.value) })} style={{ width: '100%' }} /></Field>
      <Field label="天气粒子"><Toggle value={cfg.ui.particles} onChange={v => p({ particles: v })} /></Field>
      <Field label="写完自动打开剧场"><Toggle value={cfg.ui.autoOpen} onChange={v => p({ autoOpen: v })} /></Field>
      <Field label="字体地址" hint="皮肤字体从这里按 npm 包名加载（默认 jsDelivr 上的 @fontsource 官方包）；连不上时可以换成 unpkg 或自己的镜像，地址以 / 结尾。立绘工作台的认脸模型也从这里下它的运行库。"><Text value={cfg.ui.fontBase} onCommit={v => p({ fontBase: v })} /></Field>
      <div className="fg-section">认脸模型（立绘工作台的自动框）</div>
      <Field label="下载来源" hint="模型在 HuggingFace：自动是先连官网、连不上换镜像；只下一次，存在数据目录的 models 文件夹。">
        <select className="fg-select" style={{ width: 'auto' }} value={cfg.vision.source} onChange={e => patchConfig({ vision: { source: e.target.value } }).catch(err => toast(err.message, 'error'))}>
          <option value="auto">自动（先官网，连不上换镜像）</option>
          <option value="official">只用官网</option>
          <option value="mirror">先用镜像</option>
        </select>
      </Field>
      <Field label="镜像地址" hint="HuggingFace 的镜像站，默认 hf-mirror.com；路径规则要跟官网一样（…/仓库/resolve/版本/文件）。"><Text value={cfg.vision.mirror} onCommit={v => patchConfig({ vision: { mirror: v } }).catch(err => toast(err.message, 'error'))} /></Field>
    </>
  )
}

// ───────────────────────── 声音 ─────────────────────────
const VOICE_GENDER = { female: '女声', male: '男声', '': '不分男女' }
const SOUND_GROUPS = [['stage', '落字音效', '台词演出里的重音、怒吼、崩溃、灵光一闪'], ['ui', '界面音', '按钮、选项、翻页']]

/** 打字音和音效：试听每个音色、定没指定声音的角色怎么分、旁白用什么；每种音效选版本、试听、换成自己的文件。 */
function SoundSection({ data }) {
  const ui = data.config.ui
  const p = patch => patchConfig({ ui: patch }).catch(e => toast(e.message, 'error'))
  const [busy, run] = useBusy()
  const fileRef = React.useRef(null)
  const slotRef = React.useRef('')
  const pick = slot => { slotRef.current = slot; if (fileRef.current) fileRef.current.click() }
  const upload = file => { const slot = slotRef.current; run('up' + slot, async () => { setConfig(await api.uploadSound(slot, file)) }, '已换成你的音效') }
  const remove = slot => run('rm' + slot, async () => { setConfig(await api.removeSound(slot)) }, '已删掉，退回默认的那个')
  const narration = ui.narrationVoice === 'off' ? null : { id: ui.narrationVoice, pitch: ui.narrationPitch }
  return (
    <>
      <div className="fg-section">打字音</div>
      <Field label="打字音"><div className="fg-row"><Toggle value={ui.blip} onChange={v => p({ blip: v })} /><input type="range" min="0" max="2" step="0.1" value={ui.blipVolume} aria-label="打字音音量" onChange={e => p({ blipVolume: Number(e.target.value) })} style={{ flex: 1 }} /></div></Field>
      <Field label="没指定的角色" hint="每个角色的声音可以在「人物志 → 档案」里单独挑、调音高。自动：女性、男性各从一组音色里按名字分一个，同一局里先登场的先挑、后来的避开已经有人用的；一组用完了才重复，靠音高错开。没标性别的用经典哔哔。">
        <Select value={ui.voiceDefault} options={[['auto', '自动（按性别分）'], ...VOICES.map(v => [v.id, `都用「${v.label}」`])]} onChange={v => p({ voiceDefault: v })} />
      </Field>
      <Field label="旁白">
        <div className="fg-row">
          <Select value={ui.narrationVoice} options={[...VOICES.map(v => [v.id, v.label]), ['off', '不出声']]} style={INLINE} onChange={v => p({ narrationVoice: v })} />
          <Select value={String(ui.narrationPitch)} options={PITCHES} style={INLINE} onChange={v => p({ narrationPitch: Number(v) })} />
          <button type="button" className="fg-btn" disabled={!narration} onClick={() => previewVoice(narration, ui)}>▶ 试听</button>
        </div>
      </Field>
      <div className="fg-section">音色一览 · {VOICES.length} 个（点一下试听）</div>
      <div className="fg-skins fg-voices">
        {VOICES.map(v => (
          <button key={v.id} type="button" className="fg-skin" onClick={() => previewVoice({ id: v.id, pitch: 0 }, ui)}>
            <b>▶ {v.label}</b><span>{VOICE_GENDER[v.gender]} · {v.desc}</span>
          </button>
        ))}
      </div>
      <div className="fg-section">音效</div>
      <Field label="音效"><div className="fg-row"><Toggle value={ui.sfx} onChange={v => p({ sfx: v })} /><input type="range" min="0" max="2" step="0.1" value={ui.sfxVolume} aria-label="音效音量" onChange={e => p({ sfxVolume: Number(e.target.value) })} style={{ flex: 1 }} /></div></Field>
      {SOUND_GROUPS.map(([group, title, note]) => (
        <React.Fragment key={group}>
          <div className="fg-section">{title}</div>
          <div className="fg-note">{note}。换一个版本会马上响一下；「用自己的」可以传 mp3、m4a、ogg、wav、flac（最大 5 MB，只放前 4 秒）。</div>
          {SOUND_SLOTS.filter(s => s.group === group).map(slot => {
            const mine = ui.customSounds[slot.id]
            const options = [...slot.presets.map((x, i) => [x.id, i ? x.label : `${x.label}（默认）`]), ...(mine ? [['custom', `我的：${mine.name || '上传的文件'}`]] : []), ['off', '关掉']]
            return (
              <Field key={slot.id} label={slot.label} hint={slot.hint}>
                <div className="fg-row">
                  <Select value={ui.sounds[slot.id]} options={options} style={INLINE} onChange={v => { p({ sounds: { [slot.id]: v } }); previewSound(slot.id, v, ui) }} />
                  <button type="button" className="fg-btn" disabled={ui.sounds[slot.id] === 'off'} onClick={() => previewSound(slot.id, ui.sounds[slot.id], ui)}>▶ 试听</button>
                  <button type="button" className="fg-btn" disabled={busy === 'up' + slot.id} onClick={() => pick(slot.id)}>{busy === 'up' + slot.id ? '上传中…' : mine ? '换文件' : '用自己的'}</button>
                  {mine && <button type="button" className="fg-btn" disabled={busy === 'rm' + slot.id} onClick={() => remove(slot.id)}>删掉文件</button>}
                </div>
              </Field>
            )
          })}
        </React.Fragment>
      ))}
      <input ref={fileRef} type="file" accept="audio/*" hidden onChange={e => { const file = e.target.files && e.target.files[0]; e.target.value = ''; if (file) upload(file) }} />
    </>
  )
}

// ───────────────────────── 我的配乐 ─────────────────────────
const sizeMB = bytes => (bytes / 1048576).toFixed(1) + ' MB'

/** 一首曲子：试听、改名、描述、标签（失焦保存）、删除。 */
function TrackCard({ track, playing, onPlay }) {
  const [busy, run] = useBusy()
  const save = patch => run('s', async () => { await api.updateTrack(track.id, patch); await loadMusic() })
  return (
    <div className="fg-track">
      <button type="button" className={`fg-track-play${playing ? ' is-on' : ''}`} title={playing ? '停止试听' : '试听'} onClick={onPlay}>{playing ? '■' : '▶'}</button>
      <div className="fg-track-body">
        <div className="fg-row">
          <Text value={track.name} style={{ flex: 1, width: 'auto', fontWeight: 600 }} onCommit={v => save({ name: v })} />
          <span className="fg-note" title={track.file}>{sizeMB(track.bytes)}</span>
          <button type="button" className="fg-btn" disabled={busy === 'd'} onClick={() => { if (window.confirm(`从曲库删除「${track.name}」？电脑上的原文件不受影响。`)) run('d', async () => { await api.removeTrack(track.id); await loadMusic() }, '已删除') }}>删除</button>
        </div>
        <TextArea value={track.description} placeholder="听起来什么样、适合什么场面。例如：慢板萨克斯和雨声，深夜独处、心事重重，也适合告白前的沉默" onCommit={v => save({ description: v })} />
        <Text value={(track.tags || []).join('、')} placeholder="标签，用顿号或逗号隔开：深夜、城市、雨、怀旧" style={{ width: '100%' }} onCommit={v => save({ tags: v })} />
      </div>
    </div>
  )
}

/** 多行文本：失焦时才提交。 */
function TextArea({ value, onCommit, placeholder }) {
  const [v, setV] = React.useState(value ?? '')
  React.useEffect(() => { setV(value ?? '') }, [value])
  return <textarea className="fg-textarea fg-track-desc" value={v} placeholder={placeholder} onChange={e => setV(e.target.value)} onBlur={() => { if (v !== (value ?? '')) onCommit(v) }} onKeyDown={e => e.stopPropagation()} />
}

/** 配乐页：开关音量、导入整个音乐文件夹（带上里面的描述文件）、逐首编辑、导出描述。 */
function MusicSection({ data }) {
  const cfg = data.config
  const tracks = useMusic()
  const [playing, setPlaying] = React.useState('')
  const [progress, setProgress] = React.useState('')
  const folderRef = React.useRef(null)
  const filesRef = React.useRef(null)
  const p = patch => patchConfig({ ui: patch }).catch(e => toast(e.message, 'error'))
  React.useEffect(() => () => stopPreview(), [])

  const play = track => {
    if (playing === track.id) { stopPreview(); return }
    previewTrack({ id: track.id, url: assetUrl(track.assetId) }, () => setPlaying(id => (id === track.id ? '' : id)))
    setPlaying(track.id)
  }

  /** 逐首上传；文件夹里有描述文件时，按文件名把曲名、描述、标签写上（描述文件优先）。 */
  const importFiles = async list => {
    const files = [...(list || [])]
    if (!files.length) return
    let meta = new Map()
    const sidecar = files.find(f => f.name === MUSIC_SIDECAR)
    if (sidecar) {
      try { meta = readSidecar(await sidecar.text()) } catch (e) { toast(`描述文件没读成：${e.message}。先只导入音频`, 'error') }
    }
    const audio = files.filter(f => AUDIO_FILE.test(f.name)).sort((a, b) => a.name.localeCompare(b.name, 'zh-CN', { numeric: true }))
    if (!audio.length) { toast('没找到音频文件（mp3、m4a、aac、ogg、opus、wav、flac）', 'error'); return }
    const failed = []
    let described = 0
    for (let i = 0; i < audio.length; i++) {
      const file = audio[i]
      setProgress(`导入中 ${i + 1} / ${audio.length}：${file.name}`)
      try {
        const track = await api.uploadTrack(file)
        const m = meta.get(file.name)
        if (m) { await api.updateTrack(track.id, m); described++ }
      } catch (e) {
        failed.push(`${file.name}：${e.message}`)
      }
    }
    setProgress('')
    await loadMusic().catch(() => {})
    const done = audio.length - failed.length
    toast(`导入了 ${done} 首${described ? `，其中 ${described} 首带上了描述` : ''}${failed.length ? `；${failed.length} 首失败：${failed.slice(0, 3).join('；')}` : ''}`, failed.length ? 'error' : undefined)
  }

  const exportSidecar = () => {
    const blob = new Blob([writeSidecar(tracks || [])], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = MUSIC_SIDECAR
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  }

  return (
    <>
      <div className="fg-section">播放</div>
      <Field label="配乐"><div className="fg-row"><Toggle value={cfg.ui.bgm} onChange={v => p({ bgm: v })} /><input type="range" min="0" max="1" step="0.05" value={cfg.ui.bgmVolume} onChange={e => p({ bgmVolume: Number(e.target.value) })} style={{ flex: 1 }} /></div></Field>
      <div className="fg-section">我的曲库{tracks ? ` · ${tracks.length} 首` : ''}</div>
      <div className="fg-note">后台导演整理每一轮时会读到下面每首的描述和标签，自己决定这一幕放哪首、哪句话换歌。描述随便写：听感、乐器、适合的场面和情绪都行，越具体导演选得越准。导演还没整理完的轮次会先按描述粗配一首。</div>
      <div className="fg-row" style={{ margin: '1cqw 0' }}>
        <button type="button" className="fg-btn is-primary" disabled={Boolean(progress)} onClick={() => folderRef.current && folderRef.current.click()}>导入文件夹</button>
        <button type="button" className="fg-btn" disabled={Boolean(progress)} onClick={() => filesRef.current && filesRef.current.click()}>添加曲子</button>
        <button type="button" className="fg-btn" disabled={!tracks || !tracks.some(t => t.file)} onClick={exportSidecar}>导出描述</button>
        {progress && <span className="fg-pill is-busy">{progress}</span>}
        <input ref={folderRef} type="file" webkitdirectory="" multiple hidden onChange={e => { importFiles(e.target.files); e.target.value = '' }} />
        <input ref={filesRef} type="file" accept={`audio/*,${MUSIC_SIDECAR}`} multiple hidden onChange={e => { importFiles(e.target.files); e.target.value = '' }} />
      </div>
      <div className="fg-note">文件夹里放一份 <code>{MUSIC_SIDECAR}</code>（就是「导出描述」得到的文件），导入时会按文件名自动带上描述；同一首再导入不会重复存，但描述会以这个文件为准。</div>
      {!tracks && <div className="fg-note">读取中…</div>}
      {tracks && !tracks.length && <div className="fg-note" style={{ marginTop: '1cqw' }}>曲库还是空的。没有曲子时剧场不放音乐。</div>}
      {tracks && tracks.map(t => <TrackCard key={t.id} track={t} playing={playing === t.id} onPlay={() => play(t)} />)}
    </>
  )
}

const stamp = t => new Date(t).toLocaleString('zh-CN', { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })

/** 版本与更新：插件目录是 git 克隆时，检查远端、一键快进；更新后提示重启 DSH。 */
function UpdateSection({ data }) {
  const u = useUpdate()
  const [busy, run] = useBusy()
  const act = (id, action, ok) => run(id, async () => setUpdate((await api.runUpdate(action)).update), ok)
  const last = u && u.last
  return (
    <>
      <div className="fg-section">版本与更新</div>
      {!u && <div className="fg-note">读取中…</div>}
      {u && !u.managed && hostName() === 'st' && (
        <>
          <Field label="当前版本">v{__FLOWGAL_VERSION__}</Field>
          <div className="fg-note">酒馆版的更新由酒馆管：扩展 → 管理扩展 → FlowGal → 更新（也可以打开它的自动更新）。更新后刷新网页就用上新版本。</div>
        </>
      )}
      {u && !u.managed && hostName() !== 'st' && (
        <>
          <Field label="当前版本">v{__FLOWGAL_VERSION__}</Field>
          <div className="fg-note">{u.reason} 想在这里一键更新：在 DSH 终端里 <code>git clone https://github.com/clanso/flowgal.git</code>，<code>dsh plugin --profile tavern remove flowgal</code> 后再 <code>dsh plugin --profile tavern add</code> 这个文件夹，然后重启 DSH。</div>
        </>
      )}
      {u && u.managed && (
        <>
          <Field label="当前版本" hint={u.current.subject}>v{__FLOWGAL_VERSION__} · {u.current.sha} · {stamp(u.current.time)}</Field>
          <Field label="跟踪分支">{u.current.tracking}</Field>
          {u.restartRequired && <div className="fg-update-done">✓ 新版本已经下载好了。重启 DSH（关掉再打开）后刷新网页，就会用上新版本。</div>}
          <Field label="远端">
            {!last ? <span className="fg-note">还没检查</span>
              : last.error ? <span className="fg-err">{last.error}{last.fallback ? `；可以改跟 ${last.fallback} 分支` : ''}</span>
                : last.behind ? <b className="fg-ok">有新版本：{last.commits.length || last.behind} 个更新（{last.target}）</b>
                  : <span className="fg-ok">已是最新</span>}
            {last && <span className="fg-note">　检查于 {stamp(last.checkedAt)}</span>}
          </Field>
          {last && last.commits.length > 0 && (
            <div className="fg-changes">
              {last.commits.map(c => <div key={c.sha}><code>{c.sha}</code><span>{c.subject}</span><small>{stamp(c.time)}</small></div>)}
            </div>
          )}
          <div className="fg-row" style={{ margin: '1cqw 0 0 15.2cqw' }}>
            <button type="button" className="fg-btn" disabled={Boolean(busy)} onClick={() => run('check', () => loadUpdate('force'))}>{busy === 'check' ? '检查中…' : '检查更新'}</button>
            {updateAvailable(u) && <button type="button" className="fg-btn is-primary" disabled={Boolean(busy)} onClick={() => act('apply', 'apply', '已更新，重启 DSH 后生效')}>{busy === 'apply' ? '更新中…' : '立即更新'}</button>}
            {last && last.gone && last.fallback && <button type="button" className="fg-btn is-primary" disabled={Boolean(busy)} onClick={() => act('switch', 'switch', `已切到 ${last.fallback}，重启 DSH 后生效`)}>{busy === 'switch' ? '切换中…' : `改跟 ${last.fallback} 并更新`}</button>}
          </div>
          <div className="fg-note" style={{ margin: '0.8cqw 0 0 15.2cqw' }}>只做快进更新：你本地改过的文件不会被覆盖，有冲突时会停下来把原因写在这里。</div>
        </>
      )}
      <Field label="自动检查" hint="打开剧场时顺便看一眼有没有新版本，最多 12 小时一次。"><Toggle value={data.config.ui.updateCheck} onChange={v => patchConfig({ ui: { updateCheck: v } }).catch(e => toast(e.message, 'error'))} /></Field>
    </>
  )
}

export function Settings({ onClose, onDirectorLog = null, initialTab = 'look' }) {
  const data = useConfig()
  const [tab, setTab] = React.useState(initialTab)
  return (
    <Panel title="设置" en="Config" onClose={onClose} tabs={[{ id: 'look', label: '外观与演出' }, { id: 'sound', label: '声音' }, { id: 'music', label: '配乐' }, { id: 'director', label: '导演' }, { id: 'images', label: '生图渠道' }, { id: 'style', label: '画风与配图' }, { id: 'about', label: '版本与更新' }]} tab={tab} onTab={setTab}
      actions={data && <span className={`fg-pill${data.ready ? '' : ' fg-err'}`}>{data.ready ? '生图已就绪' : data.readyReason}</span>}>
      {!data && <div className="fg-note">读取设置中…</div>}
      {data && tab === 'look' && <LookSection data={data} />}
      {data && tab === 'sound' && <SoundSection data={data} />}
      {data && tab === 'music' && <MusicSection data={data} />}
      {data && tab === 'director' && <DirectorSection data={data} onDirectorLog={onDirectorLog} />}
      {data && tab === 'images' && <BackendSection data={data} />}
      {data && tab === 'style' && <><StyleSection data={data} /><ImagesSection data={data} /></>}
      {data && tab === 'about' && <UpdateSection data={data} />}
      {data && <div className="fg-note" style={{ marginTop: '2cqw' }}>{hostName() === 'st' ? <>Key 存在{data.secretStorage}，出图时由这个页面直接带去请求；别把酒馆的数据文件夹发给别人。</> : <>Key 只存在 DSH 宿主（优先存进 DSH 凭据库：{data.secretStorage}），浏览器只看得到「有没有填」。</>}</div>}
    </Panel>
  )
}

export { MOOD_LABEL, WEATHER_LABEL }
