// 剧场里的四个面板：回想（Backlog）、鉴赏（CG / 背景 / 重画 / 改词）、人物志（外貌档案）、设置（含「我的配乐」）。导演日志在 DirectorLog.jsx。
import React from 'react'
import { api, assetUrl, toast, useConfig, patchConfig, setConfig, useUpdate, loadUpdate, setUpdate, updateAvailable, useMusic, loadMusic } from '../api.js'
import { EMOTION_LABEL, TIME_LABEL, WEATHER_LABEL, MOOD_LABEL, cgSrc } from './playback.js'
import { Silhouette } from './Stage.jsx'
import { SKINS } from './skins.js'
import { previewTrack, stopPreview } from './audio.js'
import { MUSIC_SIDECAR, AUDIO_FILE, readSidecar, writeSidecar } from '../../../lib/music-sidecar.js'
import { modelKey, qualityFor, negativeFor } from '../../../lib/image/style.js'
import { naiModelInfo } from '../../../lib/image/nai-models.js'

const STATUS_LABEL = { queued: '排队中', running: '绘制中', failed: '失败', cancelled: '已取消', ready: '' }

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
function ImageEditor({ gameId, image, onClose }) {
  const [draft, setDraft] = React.useState({ tags: image.tags || '', desc: image.desc || '', negativeExtra: image.negativeExtra || '', shape: image.shape || 'landscape', seed: '' })
  const [instruction, setInstruction] = React.useState('')
  const [busy, run] = useBusy()
  const set = patch => setDraft(d => ({ ...d, ...patch }))
  const version = image.versions[image.current]
  return (
    <div className="fg-person" style={{ gridTemplateColumns: '1fr' }}>
      <div className="fg-section" style={{ marginTop: 0 }}>改提示词 · {image.title || image.id}</div>
      <div className="fg-field"><label>画面 Tag</label><textarea className="fg-textarea" value={draft.tags} onChange={e => set({ tags: e.target.value })} /></div>
      <small className="fg-note" style={{ display: 'block', margin: '-0.4cqw 0 0 15.2cqw' }}>人物写 @名字，出图前自动换成外貌档案（柏宝绘的 @ 外貌库）。</small>
      <div className="fg-field"><label>画面说明</label><textarea className="fg-textarea" style={{ minHeight: '4cqw' }} value={draft.desc} onChange={e => set({ desc: e.target.value })} /></div>
      <div className="fg-field"><label>额外负面</label><input className="fg-input" value={draft.negativeExtra} onChange={e => set({ negativeExtra: e.target.value })} /></div>
      <div className="fg-field"><label>画幅 / 种子</label>
        <div className="fg-row">
          <select className="fg-select" style={{ width: 'auto' }} value={draft.shape} onChange={e => set({ shape: e.target.value })}>
            <option value="landscape">横版</option><option value="portrait">竖版</option><option value="square">方形</option>
          </select>
          <input className="fg-input" style={{ width: '14cqw' }} placeholder="随机" value={draft.seed} onChange={e => set({ seed: e.target.value.replace(/\D/g, '') })} />
          {version && <button type="button" className="fg-btn" onClick={() => set({ seed: String(version.seed ?? '') })}>沿用当前种子</button>}
        </div>
      </div>
      <div className="fg-field"><label>AI 改写</label>
        <div className="fg-row">
          <input className="fg-input" style={{ flex: 1, width: 'auto' }} placeholder="例如：改成雨夜、她在哭、镜头拉远……留空则重读原文" value={instruction} onChange={e => setInstruction(e.target.value)} />
          <button type="button" className="fg-btn" disabled={busy === 'rw'} onClick={() => run('rw', async () => { const r = await api.rewrite(gameId, image.id, instruction); set({ tags: r.draft.tags, desc: r.draft.desc, negativeExtra: r.draft.negativeExtra || draft.negativeExtra }) }, '已改写，确认后点「按此重画」')}>{busy === 'rw' ? '改写中…' : '改写'}</button>
        </div>
      </div>
      {version && (
        <details className="fg-note" style={{ margin: '0.6cqw 0' }}>
          <summary>当前版本实际发出的提示词</summary>
          <div style={{ userSelect: 'text', marginTop: '0.4cqw' }}>＋ {version.positive}<br />－ {version.negative}<br />{version.backend} · {version.model} · seed {version.seed}</div>
        </details>
      )}
      <div className="fg-row" style={{ justifyContent: 'flex-end' }}>
        <button type="button" className="fg-btn" onClick={onClose}>取消</button>
        <button type="button" className="fg-btn is-primary" onClick={() => run('go', async () => {
          await api.render(gameId, image.id, { tags: draft.tags, desc: draft.desc, negativeExtra: draft.negativeExtra, shape: draft.shape, ...(draft.seed ? { seed: Number(draft.seed) } : {}) })
          onClose()
        }, '已加入出图队列')}>按此重画</button>
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

function CgTile({ gameId, image, onOpen, onEdit }) {
  const [busy, run] = useBusy()
  const src = cgSrc(image, assetUrl)
  const pending = image.status === 'queued' || image.status === 'running'
  return (
    <div>
      <div className={`fg-thumb${src ? '' : ' is-locked'}`} onClick={() => src && onOpen(image)}>
        {src ? <img src={src} alt={image.title} loading="lazy" /> : <span>{pending ? '🎨 ' + STATUS_LABEL[image.status] : image.status === 'failed' ? '⚠ ' + (image.error || '失败') : '未生成'}</span>}
        {pending && src && <span className="fg-pill is-busy" style={{ position: 'absolute', right: '.6cqw', top: '.6cqw' }}>重画中</span>}
        <div className="fg-thumb-cap">{image.title || '第 ' + image.turn + ' 轮插画'}{image.versions.length > 1 ? ` · ${image.current + 1}/${image.versions.length}` : ''}</div>
      </div>
      <div className="fg-row" style={{ marginTop: '.6cqw' }}>
        {pending
          ? <button type="button" className="fg-btn" onClick={() => run('c', () => api.cancel(gameId, 'cg', image.id), '已取消')}>取消</button>
          : <button type="button" className="fg-btn" disabled={busy === 'r'} onClick={() => run('r', () => api.render(gameId, image.id, {}), '已加入出图队列')}>重画</button>}
        <button type="button" className="fg-btn" onClick={() => onEdit(image)}>改词</button>
        <button type="button" className="fg-btn" onClick={() => { if (window.confirm('删除这张插画和它的所有版本？')) run('d', () => api.deleteImage(gameId, image.id), '已删除') }}>删除</button>
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
  return (
    <Panel title="鉴赏" en="Gallery" onClose={onClose} tabs={[{ id: 'cg', label: `插画 CG · ${images.length}` }, { id: 'bg', label: `背景 · ${places.length}` }]} tab={tab} onTab={setTab}>
      {edit && <ImageEditor key={edit.id} gameId={gameId} image={images.find(i => i.id === edit.id) || edit} onClose={() => setEdit(null)} />}
      {tab === 'cg' && (
        <div className="fg-grid">
          {images.map(img => <CgTile key={img.id} gameId={gameId} image={img} onOpen={setOpen} onEdit={setEdit} />)}
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
const EMO_KEYS = Object.keys(EMOTION_LABEL)

function readFile(file) {
  return new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(r.result); r.onerror = reject; r.readAsDataURL(file) })
}

function PersonCard({ gameId, person }) {
  const [appearance, setAppearance] = React.useState(person.appearance || '')
  const [gender, setGender] = React.useState(person.gender || '')
  const [uploadEmo, setUploadEmo] = React.useState('neutral')
  const [busy, run] = useBusy()
  const fileRef = React.useRef(null)
  React.useEffect(() => { setAppearance(person.appearance || ''); setGender(person.gender || '') }, [person.appearance, person.gender])
  const main = person.sprites && (person.sprites.neutral || Object.values(person.sprites).find(Boolean))
  const dirty = appearance !== (person.appearance || '') || gender !== (person.gender || '')
  const save = () => run('save', () => api.cast(gameId, person.global ? 'global-save' : 'save', { name: person.name, patch: { appearance, gender } }), '档案已保存')
  return (
    <div className="fg-person" style={{ '--c': person.color }}>
      <div className="fg-person-art">{main ? <img src={assetUrl(main)} alt={person.name} /> : <Silhouette name={person.name} color={person.color} appearance={person.appearance} gender={person.gender} />}</div>
      <div>
        <h3>
          <span style={{ color: person.color }}>{person.name}</span>
          {person.global ? <small>全局 · 冻结</small> : <small>本局{person.createdTurn != null ? ` · 第 ${person.createdTurn} 轮登场` : ''}</small>}
          {person.temp && <small title="临时状态，不写进档案">临时：{person.temp}</small>}
        </h3>
        <div className="fg-field" style={{ gridTemplateColumns: '8cqw 1fr' }}><label>外貌</label><textarea className="fg-textarea" value={appearance} onChange={e => setAppearance(e.target.value)} placeholder="1girl, long black hair, blue eyes, school uniform" /></div>
        <div className="fg-field" style={{ gridTemplateColumns: '8cqw 1fr' }}><label>性别</label>
          <div className="fg-row">
            <select className="fg-select" style={{ width: 'auto' }} value={gender} onChange={e => setGender(e.target.value)}><option value="">未知</option><option value="female">女</option><option value="male">男</option><option value="other">其他</option></select>
            <button type="button" className="fg-btn is-primary" disabled={!dirty || busy === 'save'} onClick={save}>保存档案</button>
          </div>
        </div>
        <div className="fg-emos">
          {EMO_KEYS.map(emo => {
            const id = person.sprites && person.sprites[emo]
            const st = person.spriteStatus && person.spriteStatus[emo]
            return (
              <button key={emo} type="button" className={`fg-emo${st && (st.status === 'queued' || st.status === 'running') ? ' is-busy' : ''}`} title={st && st.error ? st.error : id ? '点击重画' : '点击生成这个表情'}
                onClick={() => run('e' + emo, () => api.cast(gameId, 'sprite', { name: person.name, emotion: emo }), `已排队：${person.name}·${EMOTION_LABEL[emo]}`)}>
                {id && <img src={assetUrl(id)} alt="" loading="lazy" />}
                <span>{EMOTION_LABEL[emo]}{st && st.status === 'failed' ? ' ⚠' : ''}</span>
              </button>
            )
          })}
        </div>
        <div className="fg-row">
          <select className="fg-select" style={{ width: 'auto' }} value={uploadEmo} onChange={e => setUploadEmo(e.target.value)}>{EMO_KEYS.map(e => <option key={e} value={e}>{EMOTION_LABEL[e]}</option>)}</select>
          <button type="button" className="fg-btn" onClick={() => fileRef.current && fileRef.current.click()}>上传立绘</button>
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={async e => {
            const file = e.target.files && e.target.files[0]
            e.target.value = ''
            if (!file) return
            const dataUrl = await readFile(file)
            run('up', () => api.cast(gameId, 'upload', { name: person.name, emotion: uploadEmo, dataUrl }), '立绘已上传')
          }} />
          {!person.global && <button type="button" className="fg-btn" onClick={() => run('g', () => api.cast(gameId, 'promote', { name: person.name }), '已提升为全局角色：所有对局共用，AI 不再改它')}>提升为全局</button>}
          {person.global && <button type="button" className="fg-btn" onClick={() => run('l', () => api.cast(gameId, 'copy-local', { name: person.name }), '已复制到本局，可单独修改')}>复制到本局</button>}
          {person.global && <button type="button" className="fg-btn" onClick={() => { if (window.confirm('从全局库移除？各对局里的副本不受影响。')) run('u', () => api.cast(gameId, 'unglobal', { name: person.name }), '已移出全局库') }}>移出全局</button>}
          {!person.global && <button type="button" className="fg-btn" onClick={() => { if (window.confirm(`删除 ${person.name} 的本局档案？`)) run('d', () => api.cast(gameId, 'delete', { name: person.name }), '已删除') }}>删除</button>}
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

export function CastPanel({ view, gameId, onClose }) {
  const [tab, setTab] = React.useState('people')
  const [busy, run] = useBusy()
  const [name, setName] = React.useState('')
  const cast = (view && view.cast) || []
  const log = (view && view.castLog) || []
  const ACTION = { create: 'AI 建档', change: '外貌变化', temp: '临时状态', edit: '手动修改' }
  return (
    <Panel title="人物志" en="Characters" onClose={onClose} tabs={[{ id: 'people', label: `人物 · ${cast.length}` }, { id: 'log', label: `档案变更 · ${log.length}` }]} tab={tab} onTab={setTab}
      actions={tab === 'people' && (
        <form className="fg-row" onSubmit={e => { e.preventDefault(); if (name.trim()) run('new', () => api.cast(gameId, 'save', { name: name.trim(), patch: {} }), '已新建').then(() => setName('')) }}>
          <input className="fg-input" style={{ width: '14cqw' }} placeholder="新人物名字" value={name} onChange={e => setName(e.target.value)} />
          <button type="submit" className="fg-btn">新建</button>
        </form>
      )}>
      {tab === 'people' && cast.map(p => <PersonCard key={p.name} gameId={gameId} person={p} />)}
      {tab === 'people' && !cast.length && <div className="fg-note">有名字的角色第一次出场时，导演会自动给他建外貌档案；之后所有插画里写 @名字 都会换成这份外貌，长相不再漂移。</div>}
      {tab === 'log' && log.map(e => (
        <div key={e.index} className="fg-log-item" style={{ gridTemplateColumns: '12cqw 1fr auto', cursor: 'default' }}>
          <div className="fg-log-name">{e.name}</div>
          <div><b style={{ color: 'var(--accent)' }}>{ACTION[e.action] || e.action}</b>{e.turn != null ? ` · 第 ${e.turn} 轮` : ''}<br /><span className="fg-note">{e.before ? `${e.before} → ` : ''}{e.after || (e.action === 'temp' ? '（解除）' : '')}</span></div>
          {<button type="button" className="fg-btn" disabled={busy === 'rb' + e.index} onClick={() => run('rb' + e.index, () => api.cast(gameId, 'rollback', { index: e.index }), '已回滚')}>回滚</button>}
        </div>
      ))}
      {tab === 'log' && !log.length && <div className="fg-note">AI 每次建档、改外貌、加临时状态都会记在这里，可以一键回滚。</div>}
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
function Select({ value, options, onChange }) {
  return <select className="fg-select" value={value} onChange={e => onChange(e.target.value)}>{options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
}

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
          <Field label="步数 / 提示词引导">
            <div className="fg-row"><Text type="number" style={{ width: '8cqw' }} value={cfg.novelai.steps} onCommit={v => p('novelai', { steps: v })} /><Text type="number" style={{ width: '8cqw' }} value={cfg.novelai.scale} onCommit={v => p('novelai', { scale: v })} /></div>
          </Field>
          <Field label="引导缩放" hint="Prompt Guidance Rescale，0–1。提示词引导调高后画面发灰、过饱和时往上加一点。">
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
              <Field label="步数 / CFG"><div className="fg-row"><Text type="number" style={{ width: '8cqw' }} value={cfg.comfyui.steps} onCommit={v => p('comfyui', { steps: v })} /><Text type="number" style={{ width: '8cqw' }} value={cfg.comfyui.cfg} onCommit={v => p('comfyui', { cfg: v })} /></div></Field>
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
          <Field label="步数 / CFG"><div className="fg-row"><Text type="number" style={{ width: '8cqw' }} value={cfg.webui.steps} onCommit={v => p('webui', { steps: v })} /><Text type="number" style={{ width: '8cqw' }} value={cfg.webui.cfg} onCommit={v => p('webui', { cfg: v })} /></div></Field>
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

function StyleSection({ data }) {
  const cfg = data.config
  const presets = data.presets || {}
  const artists = [...(presets.artists || []), ...(cfg.style.artists || [])]
  const current = artists.find(a => a.id === cfg.style.artist)
  const [draft, setDraft] = React.useState({ name: '', text: '' })
  const key = modelKey(cfg.images.backend, cfg)
  const p = patch => patchConfig({ style: patch }).catch(e => toast(e.message, 'error'))
  const quality = qualityFor(cfg.style, key)
  const negative = negativeFor(cfg.style, key)
  return (
    <>
      <div className="fg-section">画风</div>
      <Field label="画师串" hint={current && current.text ? current.text : '不加画师串'}>
        <div className="fg-row">
          <Select value={cfg.style.artist} onChange={v => p({ artist: v })} options={artists.map(a => [a.id, a.name])} />
          {(cfg.style.artists || []).some(a => a.id === cfg.style.artist) && <button type="button" className="fg-btn" onClick={() => p({ artists: cfg.style.artists.filter(a => a.id !== cfg.style.artist), artist: 'galgame' })}>删除这套</button>}
        </div>
      </Field>
      <Field label="存一套新的">
        <div className="fg-row">
          <input className="fg-input" style={{ width: '12cqw' }} placeholder="名字" value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} onKeyDown={e => e.stopPropagation()} />
          <input className="fg-input" style={{ flex: 1, width: 'auto' }} placeholder="artist:xxx, artist:yyy, …" value={draft.text} onChange={e => setDraft(d => ({ ...d, text: e.target.value }))} onKeyDown={e => e.stopPropagation()} />
          <button type="button" className="fg-btn" disabled={!draft.text.trim()} onClick={() => { const id = 'a' + Date.now().toString(36); p({ artists: [...(cfg.style.artists || []), { id, name: draft.name || '我的画风', text: draft.text.trim() }], artist: id }); setDraft({ name: '', text: '' }) }}>保存并使用</button>
        </div>
      </Field>
      <Field label="质量词"><div className="fg-row"><Toggle value={cfg.style.useQuality} onChange={v => p({ useQuality: v })} /><span className="fg-note">当前模型：{key}</span></div></Field>
      {cfg.style.useQuality && <Field label="质量词内容"><Text value={quality} onCommit={v => p({ quality: { ...(cfg.style.quality || {}), [key]: v } })} /></Field>}
      <Field label="负面词"><Text value={negative} onCommit={v => p({ negative: { ...(cfg.style.negative || {}), [key]: v } })} /></Field>
      <Field label="">
        <button type="button" className="fg-btn" onClick={() => { const q = { ...(cfg.style.quality || {}) }; const n = { ...(cfg.style.negative || {}) }; delete q[key]; delete n[key]; patchConfig({ style: { quality: q, negative: n } }) }}>恢复这个模型的默认质量词与负面词</button>
      </Field>
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
      <Field label="模型" hint="留空跟随 Tavern 的后台模型。整理用的是便宜的小模型就够。">
        <div className="fg-row">
          <Select value={cfg.director.provider} onChange={v => p({ provider: v, model: '' })} options={[['', '跟随 Tavern'], ...llm.providers.map(x => [x.id, x.name])]} />
          {cfg.director.provider && (llm.models.length
            ? <Select value={cfg.director.model} onChange={v => p({ model: v })} options={[['', '（请选择）'], ...llm.models.map(m => [m.id, m.name])]} />
            : <Text value={cfg.director.model} placeholder="模型 ID" onCommit={v => p({ model: v })} />)}
        </div>
      </Field>
      <Field label="最大输出 / 温度" hint="默认 128000（Claude Opus / Sonnet 5.5 的输出上限）。模型窗口装不下时自动往下收；模型拒绝这个值时按它报的上限重试一次。导演日志里能看到实际用了多少。"><div className="fg-row"><Text type="number" style={{ width: '9cqw' }} value={cfg.director.maxTokens} onCommit={v => p({ maxTokens: v })} /><Text type="number" style={{ width: '7cqw' }} value={cfg.director.temperature} onCommit={v => p({ temperature: v })} /></div></Field>
      <Field label="资料长度" hint="给导演看多少人物卡 / 世界书（字），用来判断人物外貌。默认 1000000，等于不截断；超出模型窗口时自动缩短。"><Text type="number" value={cfg.director.contextChars} onCommit={v => p({ contextChars: v })} /></Field>
      <Field label="自定义提示词" hint="留空用内置导演提示词。可用 {{maxImages}} {{styleHint}}。">
        <textarea className="fg-textarea" defaultValue={cfg.director.systemPrompt} onKeyDown={e => e.stopPropagation()} onBlur={e => { if (e.target.value !== cfg.director.systemPrompt) p({ systemPrompt: e.target.value }) }} />
      </Field>
    </>
  )
}

function ImagesSection({ data }) {
  const cfg = data.config
  const p = patch => patchConfig({ images: patch }).catch(e => toast(e.message, 'error'))
  return (
    <>
      <div className="fg-section">自动配图</div>
      <Field label="自动插画" hint="导演判断值得画的地方自动出 CG，挂在正文对应段落后。"><div className="fg-row"><Toggle value={cfg.images.auto} onChange={v => p({ auto: v })} /><span className="fg-note">每轮最多</span><Text type="number" style={{ width: '6cqw' }} value={cfg.images.maxPerTurn} onCommit={v => p({ maxPerTurn: v })} /><span className="fg-note">张</span></div></Field>
      <Field label="新地点背景"><Toggle value={cfg.images.backgrounds} onChange={v => p({ backgrounds: v })} /></Field>
      <Field label="首次登场立绘"><Toggle value={cfg.images.portraits} onChange={v => p({ portraits: v })} /></Field>
      <Field label="表情差分" hint="导演用到新表情时补画一张，费用较高。"><div className="fg-row"><Toggle value={cfg.images.expressions} onChange={v => p({ expressions: v })} /><span className="fg-note">每轮最多</span><Text type="number" style={{ width: '6cqw' }} value={cfg.images.expressionsPerTurn} onCommit={v => p({ expressionsPerTurn: v })} /><span className="fg-note">张</span></div></Field>
      <Field label="并发"><Text type="number" style={{ width: '6cqw' }} value={cfg.images.concurrency} onCommit={v => p({ concurrency: v })} /></Field>
    </>
  )
}

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
      <div className="fg-section">演出</div>
      <Field label="文字速度" hint="每字毫秒，0 为瞬间显示。"><input type="range" min="0" max="80" value={cfg.ui.textSpeed} onChange={e => p({ textSpeed: Number(e.target.value) })} style={{ width: '100%' }} /></Field>
      <Field label="自动播放间隔"><input type="range" min="400" max="4000" step="100" value={cfg.ui.autoDelay} onChange={e => p({ autoDelay: Number(e.target.value) })} style={{ width: '100%' }} /></Field>
      <Field label="天气粒子"><Toggle value={cfg.ui.particles} onChange={v => p({ particles: v })} /></Field>
      <Field label="打字音"><Toggle value={cfg.ui.blip} onChange={v => p({ blip: v })} /></Field>
      <Field label="写完自动打开剧场"><Toggle value={cfg.ui.autoOpen} onChange={v => p({ autoOpen: v })} /></Field>
      <Field label="字体地址" hint="皮肤字体从这里按 npm 包名加载（默认 jsDelivr 上的 @fontsource 官方包）；连不上时可以换成 unpkg 或自己的镜像，地址以 / 结尾。"><Text value={cfg.ui.fontBase} onCommit={v => p({ fontBase: v })} /></Field>
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
      {u && !u.managed && (
        <>
          <Field label="当前版本">v{__FLOWGAL_VERSION__}</Field>
          <div className="fg-note">{u.reason} 手动更新：在终端里进 clone 下来的 flowgal 文件夹执行 <code>git pull</code>，再重新执行一遍安装命令，然后重启 DSH。</div>
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
    <Panel title="设置" en="Config" onClose={onClose} tabs={[{ id: 'look', label: '外观与演出' }, { id: 'music', label: '配乐' }, { id: 'director', label: '导演' }, { id: 'images', label: '生图渠道' }, { id: 'style', label: '画风与配图' }, { id: 'about', label: '版本与更新' }]} tab={tab} onTab={setTab}
      actions={data && <span className={`fg-pill${data.ready ? '' : ' fg-err'}`}>{data.ready ? '生图已就绪' : data.readyReason}</span>}>
      {!data && <div className="fg-note">读取设置中…</div>}
      {data && tab === 'look' && <LookSection data={data} />}
      {data && tab === 'music' && <MusicSection data={data} />}
      {data && tab === 'director' && <DirectorSection data={data} onDirectorLog={onDirectorLog} />}
      {data && tab === 'images' && <BackendSection data={data} />}
      {data && tab === 'style' && <><StyleSection data={data} /><ImagesSection data={data} /></>}
      {data && tab === 'about' && <UpdateSection data={data} />}
      {data && <div className="fg-note" style={{ marginTop: '2cqw' }}>Key 只存在 DSH 宿主（优先存进 DSH 凭据库：{data.secretStorage}），浏览器只看得到「有没有填」。</div>}
    </Panel>
  )
}

export { MOOD_LABEL, WEATHER_LABEL }
