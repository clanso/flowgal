// 剧场里的四个面板：回想（Backlog）、鉴赏（CG / 背景 / 重画 / 改词 / 补图）、人物志（档案、衣橱、立绘差分、情绪库）、设置（含声音、「我的配乐」）。导演日志在 DirectorLog.jsx。
import React from 'react'
import { api, assetUrl, toast, fillText, useConfig, loadConfig, patchConfig, setConfig, useUpdate, loadUpdate, setUpdate, updateAvailable, useMusic, loadMusic, useSoundlib, loadSoundlib, soundlibNow, configNow, hostName } from '../api.js'
import { confirmBox, promptBox, choiceBox } from '../ask.jsx'
import { emotionLabel, shownLib, TIME_LABEL, WEATHER_LABEL, MOOD_LABEL, MODE_LABEL, RECALL_TONES, RECALL_TONE_LABEL, cgSrc } from './playback.js'
import { playedUnits } from '../../../lib/staging.js'
import { allEmotions, emotionEntry, personEmotions, nearestOf, emotionLevel } from '../../../lib/emotions.js'
import { EmotionLibrary } from './EmotionLibrary.jsx'
import { PoseMatrix } from './PoseMatrix.jsx'
import { PromptBook } from './PromptBook.jsx'
import { settleNeutral, slotKey, tokenFor, parseToken, cleanPoseGroups, sheetOf, homePose, poseFor } from '../../../lib/poses.js'
import { poseLife, lifeText, KIND_LABEL as POSE_KIND_LABEL, knownStates, unlabeled } from '../../../lib/pose-life.js'
import { ASK_CHARS } from '../../../lib/acting.js'
import { AaWorkbench, RectEditor } from './AaWorkbench.jsx'
import { visionApi, frameSprite } from './vision.js'
import { framedResult } from './faceFramer.js'
import { SpriteArt, SpriteViewer } from './AaPreview.jsx'
import { lookAt, lookKey, lookLabel, pickSprite, findLookTurn, LOOK_FIELDS, LOOK_FIELD_LABELS, lookTags, keyEmotion } from '../../../lib/look.js'
import { Silhouette } from './Stage.jsx'
import { stateSpans } from '../../../lib/cast.js'
import { SKINS, loadFontFile } from './skins.js'
import { FONT_PACKS, FONT_GROUPS, LOCAL_FONTS, DIALOG_LIMITS, cleanFontName, fontFamilyOf, skinDialogHeight } from '../../../lib/fonts.js'
import { CORNER_ITEMS, CORNER_DEFAULTS } from '../../../lib/corner.js'
import { EFFECT_GROUPS, EFFECT_IDS } from './effects.js'
import { previewTrack, stopPreview, previewVoice, previewSound, erosFoley, previewEros, erosPeak } from './audio.js'
import { EROS_SFX, EROS_PACES, EROS_LABEL, TENTACLE, TENTACLE_LABEL, PEAKS, PEAK_LABEL } from '../../../lib/eros.js'
import { VOICES, SOUND_SLOTS, VOICE_PITCH_LIMIT, castVoices, libraryBlips, voiceLabel, isLibRef, libRef, libIdOf, LIBRARY_VOICES, AA_VOICES, libraryPreset, builtinPreset, aaPreset, narrationPatch, customRef, isCustomRef } from '../../../lib/sounds.js'
import { VoiceMaker, VoicePools, VOICE_GENDERS } from './VoiceMaker.jsx'
import { cleanPack, packFiles } from '../../../lib/aa-sprite.js'
import { MUSIC_SIDECAR, AUDIO_FILE, readSidecar, writeSidecar } from '../../../lib/music-sidecar.js'
import { SOUND_SIDECAR, MAX_SOUND_VOLUME, readSoundSidecar, soundMatcher, writeSoundSidecar } from '../../../lib/soundlib-sidecar.js'
import { modelKey, qualityFor, negativeFor, sizeFor, MAX_STYLES } from '../../../lib/image/style.js'
import { naiModelInfo } from '../../../lib/image/nai-models.js'
import { naiReferenceOk } from '../../../lib/image/novelai.js'
import { DEFAULT_FACE, FACE_LEVELS, FACE_LEVEL_LABEL, FACE_LIMITS } from '../../../lib/face-paint.js'
import { CG_MAX_CHARACTERS, POSES } from '../../../lib/vocab.js'
import { faceBoxFrom, cleanFaceBox } from '../../../lib/face.js'
import { heightOf } from '../../../lib/stature.js'
import { DIRECTOR_LIMITS } from '../../../lib/limits.js'
import { STAGE_SIZES, imageConcurrency } from '../../../lib/config.js'
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
              {!head && (b.sceneEnter || b.cut) && (
                <div className="fg-log-scene">{[b.cut && b.cut.text, MODE_LABEL[b.mode], b.sceneEnter && b.scene.location].filter(Boolean).join(' · ') || MODE_LABEL.real}</div>
              )}
              <div className={`fg-log-item${i === index ? ' is-current' : ''}`} onClick={() => onJump(i)} style={i === index ? { background: 'rgba(255,255,255,.06)' } : null}>
                <div className="fg-log-name">{b.type === 'narration' ? '' : b.alias || b.speaker}</div>
                <div className="fg-log-text" style={b.type === 'thought' ? { fontStyle: 'italic', opacity: 0.8 } : null}>
                  {b.orig && <div className="fg-orig">{b.orig}</div>}
                  {b.type === 'dialogue' ? `「${b.text}」` : b.type === 'thought' ? `（${b.text}）` : b.text}
                </div>
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
  const pick = img => ({ tags: img.tags || '', desc: img.desc || '', characters: (img.characters || []).map(c => ({ ...c })), negativeExtra: img.negativeExtra || '', shape: img.shape || 'landscape', seed: '', style: img.style || '', nsfw: Boolean(img.nsfw) })
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
      <div className="fg-field"><label>NSFW</label>
        <div className="fg-row"><Toggle value={draft.nsfw} onChange={v => set({ nsfw: v })} /><span className="fg-note">露骨的画面。标上后 Base 里一定带 nsfw（分镜师漏写也补上），鉴赏里显示标记。</span></div>
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
            set({ tags: d.tags || '', desc: d.desc || '', characters: (d.characters || []).map(c => ({ ...c })), shape: d.shape || draft.shape, nsfw: Boolean(d.nsfw || draft.nsfw) })
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
          await api.render(gameId, image.id, { tags: draft.tags, desc: draft.desc, characters: draft.characters, negativeExtra: draft.negativeExtra, shape: draft.shape, nsfw: draft.nsfw, style: styles.some(x => x.id === draft.style) ? draft.style : '', ...(draft.seed ? { seed: Number(draft.seed) } : {}) })
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

export function Lightbox({ src, onClose, children, className = '' }) {
  return (
    <div className={`fg-lightbox${className ? ' ' + className : ''}`} onClick={onClose}>
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
        {image.nsfw && <span className="fg-pill is-nsfw" style={{ position: 'absolute', left: '.6cqw', top: '.6cqw' }}>NSFW</span>}
        <div className="fg-thumb-cap">{image.title || '第 ' + image.turn + ' 轮插画'}{image.versions.length > 1 ? ` · ${image.current + 1}/${image.versions.length}` : ''}{image.retired ? ' · 重新整理前的' : ''}</div>
      </div>
      <div className="fg-row" style={{ marginTop: '.6cqw' }}>
        {pending
          ? <button type="button" className="fg-btn" onClick={() => run('c', () => api.cancel(gameId, 'cg', image.id), '已取消')}>取消</button>
          : <button type="button" className="fg-btn" disabled={busy === 'r'} onClick={() => run('r', () => api.render(gameId, image.id, {}), '已加入出图队列')}>重画</button>}
        <button type="button" className="fg-btn" onClick={() => onEdit(image)}>改词</button>
        <button type="button" className="fg-btn" onClick={async () => { if (await confirmBox('删除这张插画和它的所有版本？图片文件夹里另存的那份不会删。', { ok: '删除', danger: true })) run('d', () => api.deleteImage(gameId, image.id), '已删除') }}>删除</button>
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
const WRITER_LABEL = { ai: '立绘设计师写的', fallback: '按档案拼的（模型没写出来）', user: '你改的', upload: '你上传的', acting: '照这个人的动作与表情设计' }
const LOG_ACTION = { create: 'AI 建档', change: '外貌变化', temp: '临时状态', edit: '手动修改', wear: '换装', states: '长期状态', outfit: '新衣服', span: '状态改轮次', 'wear-edit': '换装改轮次' }
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

/** 一个人的各套样子：当前这套在最前，其余是已经有立绘的；回忆、梦境里当时的那套标上段落（era），一轮中途变样子之前的那套标 earlier。 */
function lookGroups(person) {
  const now = lookAt(person.timeline, Infinity)
  const groups = new Map([[lookKey(now), { key: lookKey(now), look: now, current: true }]])
  for (const [key, r] of Object.entries(person.sprites || {})) {
    const prefix = key.split('|').slice(0, 3).join('|')
    const era = r && r.then ? r.era || 'memory' : ''
    const group = groups.get(prefix)
    if (!group) groups.set(prefix, { key: prefix, look: { outfit: r.outfit || '', states: (r.states || []).map(name => ({ name })) }, current: false, era })
    else if (!era) group.era = '' // 平时也用到这一套（比如回忆里的样子和以前某一轮一样），不算回忆里的
  }
  return [...groups.values()]
}

// 声音：音色按男女分组；音高上下各几个半音。
const VOICE_GROUPS = [['female', '女声'], ['male', '男声'], ['', '不分男女']]
const PITCHES = Array.from({ length: VOICE_PITCH_LIMIT * 2 + 1 }, (_, i) => i - VOICE_PITCH_LIMIT).map(n => [String(n), n > 0 ? `音高 +${n}` : n < 0 ? `音高 ${n}` : '音高 原调'])
const voiceText = voice => (voice ? voiceLabel(voice.id, libraryBlips(soundlibNow()), configNow()?.config?.ui) : '不出声')
/** 自己做的音色，当下拉框里的一组：[[my:编号, 名字], …]；当前选着、但已经删了的也留一项。 */
const customOptions = (ui, current) => [
  ...(ui?.customVoices || []).map(v => [customRef(v.id), v.label]),
  ...(isCustomRef(current) && !(ui?.customVoices || []).some(v => customRef(v.id) === current) ? [[current, '已删除的自己的音色（放经典哔哔）']] : []),
]
/** 音效库里的打字音，当下拉框里的一组：[[lib:编号, 名字], …]；当前选着、但库里已经删了的也留一项。 */
const blipOptions = (blips, current) => [
  ...blips.map(b => [libRef(b.id), b.name]),
  ...(isLibRef(current) && !blips.some(b => b.id === libIdOf(current)) ? [[current, '音效库里已删除的打字音']] : []),
]

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

/** 档案：固定外貌（按字段）、性别、种子、身高、声音、给立绘设计师的备注、表演笔记（自己存）和负面词。全局角色改的是全局库。cast 是这一局的全部人物（自动分声音时避开别人）。 */
function ProfileEditor({ gameId, person, cast, group, turn }) {
  const pick = p => ({
    look: Object.fromEntries(LOOK_FIELDS.map(f => [f, (p.appearanceFields || {})[f] || ''])),
    gender: p.gender || '', note: p.note || '', negative: p.negative || '', seed: p.seedCustom ? String(p.seed) : '', height: p.height ? String(p.height) : '', voice: p.voice || '', voicePitch: String(p.voicePitch || 0),
  })
  const [form, setForm] = React.useState(() => pick(person))
  const [busy, run] = useBusy()
  const cfg = useConfig()
  const ui = cfg ? cfg.config.ui : null
  const blips = libraryBlips(useSoundlib())
  React.useEffect(() => { setForm(pick(person)) }, [person.appearance, JSON.stringify(person.appearanceFields || {}), person.gender, person.note, person.negative, person.seed, person.seedCustom, person.height, person.voice, person.voicePitch])
  const dirty = JSON.stringify(form) !== JSON.stringify(pick(person))
  const set = k => e => setForm({ ...form, [k]: e.target.value })
  const setLook = f => e => setForm({ ...form, look: { ...form.look, [f]: e.target.value } })
  const save = () => {
    const { look, ...rest } = form
    // 一整串（appearance）也带上：后台按分格存；碰上还没重启、不认分格的旧后台时，至少这一串能存下，不会悄悄丢
    return run('save', () => api.cast(gameId, person.global ? 'global-save' : 'save', { name: person.name, patch: { ...rest, appearanceFields: look, appearance: lookTags(look, person.appearance), seed: form.seed === '' ? null : Number(form.seed), height: form.height === '' ? null : Number(form.height), voicePitch: Number(form.voicePitch) } }), '档案已保存')
  }
  // 按表单里还没保存的选择试听；「自动」显示实际会分到哪个音色（跟着表单里的性别变）。
  const others = (cast || []).filter(p => p.name !== person.name)
  const draft = { ...person, gender: form.gender, voice: form.voice, voicePitch: Number(form.voicePitch) }
  const voiceNow = castVoices([...others, draft], ui, blips).get(person.name)
  const guess = heightOf({ ...person, gender: form.gender, height: null })
  const autoVoice = castVoices([...others, { ...draft, voice: '' }], ui, blips).get(person.name)
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
      <div className="fg-field"><label>身高</label>
        <div className="fg-row">
          <input className="fg-input" style={{ width: '12cqw' }} inputMode="numeric" value={form.height} placeholder={`约 ${guess.cm}`} onChange={e => setForm({ ...form, height: e.target.value.replace(/\D/g, '').slice(0, 3) })} onKeyDown={e => e.stopPropagation()} />
          <span className="fg-note">厘米。剧场里大家的头缩放到一样大，高的人站得高、矮的站得低。留空用{guess.from === 'acting' ? '设计师读资料估的' : '按性别和外貌估的'}（{guess.cm}）。</span>
        </div>
      </div>
      <div className="fg-field"><label>声音</label>
        <div className="fg-row">
          <select className="fg-select" style={{ width: 'auto' }} value={form.voice} onChange={set('voice')} aria-label="打字音音色">
            <option value="">自动（{voiceText(autoVoice)}）</option>
            <option value="off">不出声</option>
            {VOICE_GROUPS.map(([g, label]) => <optgroup key={g} label={label}>{VOICES.filter(v => v.gender === g).map(v => <option key={v.id} value={v.id}>{v.label}</option>)}</optgroup>)}
            {customOptions(ui, form.voice).length > 0 && <optgroup label="自己的音色">{customOptions(ui, form.voice).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</optgroup>}
            {blipOptions(blips, form.voice).length > 0 && <optgroup label="音效库里的打字音">{blipOptions(blips, form.voice).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</optgroup>}
          </select>
          <select className="fg-select" style={{ width: 'auto' }} value={form.voicePitch} onChange={set('voicePitch')} aria-label="音高" title="升降几个半音">{PITCHES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
          <button type="button" className="fg-btn" disabled={!voiceNow} onClick={() => previewVoice(voiceNow, ui || undefined)}>▶ 试听</button>
          <span className="fg-note">这个角色说话时的打字音</span>
        </div>
      </div>
      <div className="fg-field"><label>立绘备注</label><textarea className="fg-textarea is-short" value={form.note} onChange={set('note')} onKeyDown={e => e.stopPropagation()} placeholder="写给表演设计师和立绘设计师（都必须遵守），比如「右眼下有泪痣」「笑起来露虎牙」「不要伸出手的动作」" /></div>
      <ActingNote gameId={gameId} person={person} group={group} turn={turn} />
      <ActingNote gameId={gameId} person={person} group={group} turn={turn} here />
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
  // 全局角色从全局库带来的衣服：删的时候问只删这一局还是全局库也删；这一局删掉的能放回
  const lib = person.library
  const shared = name => Boolean(lib && lib.outfits.includes(name))
  const hiddenHere = lib ? lib.hidden.filter(shared) : []
  const drop = async name => {
    if (!shared(name)) return run('d' + name, () => look({ outfits: { [name]: null } }))
    const isDefault = lib.outfit === name
    const where = await choiceBox(
      `「${name}」是${person.name}从全局库带来的衣服${isDefault ? '，也是每一局一开头穿的默认服装' : ''}。\n\n只这一局：这一局的衣橱里不再有它${isDefault ? '，一开头也不穿它' : ''}，别的对局照旧，下面随时能放回。\n全局库也删：所有对局都没有它了${isDefault ? '，默认服装一起去掉' : ''}。`,
      [{ value: 'here', label: '只这一局' }, { value: 'all', label: '全局库也删', danger: true }],
      { title: `删掉${name}` })
    if (where === 'here') run('d' + name, () => look({ outfits: { [name]: null }, ...(isDefault ? { defaultWear: false } : {}) }), `这一局不带${name}了`)
    else if (where === 'all') run('d' + name, async () => { await api.cast(gameId, 'global-wardrobe', { name: person.name, patch: { outfits: { [name]: null } } }); await look({ outfits: { [name]: null } }) }, `已从全局库删掉${name}`)
  }
  return (
    <div className="fg-person-form">
      <div className="fg-wardrobe">
        {outfits.map(([name, o]) => (
          <div key={name} className={`fg-outfit${person.outfit === name ? ' is-on' : ''}`}>
            <b title={shared(name) ? '从全局库带来的' : undefined}>{name}</b>
            <Text value={o.tags || ''} placeholder="这套衣服的英文 tag" onCommit={v => run('o' + name, () => look({ outfits: { [name]: v } }), '已保存')} />
            {person.outfit === name ? <span className="fg-pill">正在穿</span> : <button type="button" className="fg-btn" onClick={() => run('w' + name, () => look({ wear: name }), `${person.name} 换上了${name}`)}>穿上</button>}
            <button type="button" className="fg-btn" title={shared(name) ? '从衣橱删掉（全局库带来的：问你只删这一局还是全局库也删）' : '从衣橱删掉'} onClick={() => drop(name)}>✕</button>
          </div>
        ))}
        {!outfits.length && <div className="fg-note">衣橱还是空的。导演会在角色登场、换衣服时记下来；也可以自己加。</div>}
        {hiddenHere.length > 0 && (
          <div className="fg-row">
            <span className="fg-note">这一局删掉的全局库衣服：</span>
            {hiddenHere.map(name => (
              <button key={name} type="button" className="fg-btn" title="放回这一局的衣橱" onClick={() => run('r' + name, () => look({ restoreOutfits: [name], ...(lib.outfit === name ? { defaultWear: true } : {}) }), `${name}放回衣橱了`)}>放回{name}</button>
            ))}
          </div>
        )}
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
      <LookTimeline gameId={gameId} person={person} />
      <div className="fg-note">上面加减的长期状态和换装从最新一轮起生效；以前的轮次在「哪几轮有」「哪一轮起穿」里改。立绘按「服装 × 长期状态 × 情绪」各画一套，改了以前的轮次，用到的那几套会按新样子补画；临时状态只进插画。</div>
    </div>
  )
}

/**
 * 状态和换装的时间线：每个长期状态哪几轮有（可以断断续续几段），每次换装从哪一轮起。
 * 导演按资料把后来才有的饰物提前加上了、或者记错了轮次，就在这里改；结束那一格空着表示一直到现在。
 */
function LookTimeline({ gameId, person }) {
  const [, run] = useBusy()
  const look = patch => api.cast(gameId, 'look', { name: person.name, patch })
  const timeline = person.timeline || {}
  const spans = stateSpans(timeline.states)
  const names = Object.keys(spans)
  const turnOf = v => { const t = String(v).trim(); return t === '' || !Number.isFinite(Number(t)) ? null : Math.max(0, Math.round(Number(t))) }
  const setSpans = (name, list) => run('sp' + name, () => look({ stateSpans: { name, spans: list.map(sp => [sp.from, sp.to]) } }), '已改，用到的立绘会按新样子补画')
  const edit = (name, i, change) => setSpans(name, spans[name].map((sp, j) => (j === i ? { ...sp, ...change } : sp)))
  const wear = timeline.wear || []
  const lib = person.library
  return (
    <>
      <div className="fg-field"><label>状态哪几轮有</label>
        <div className="fg-spans">
          {names.map(name => spans[name].map((sp, i) => (
            <div key={name + i} className="fg-span">
              <b title={sp.tags}>{name}</b>
              <span>第</span>
              <Text value={sp.from} style={{ width: '5cqw' }} onCommit={v => { const t = turnOf(v); if (t != null) edit(name, i, { from: t }) }} />
              <span>轮到第</span>
              <Text value={sp.to == null ? '' : sp.to - 1} placeholder="现在" style={{ width: '5cqw' }} onCommit={v => { const t = turnOf(v); edit(name, i, { to: t == null ? null : t + 1 }) }} />
              <span>轮</span>
              <button type="button" className="fg-btn is-mini" title="这一段没有" onClick={() => setSpans(name, spans[name].filter((_, j) => j !== i))}>✕</button>
            </div>
          )))}
          {!names.length && <span className="fg-note">还没有长期状态</span>}
        </div>
      </div>
      <div className="fg-field"><label>哪一轮起穿</label>
        <div className="fg-spans">
          {lib && lib.noDefaultWear && lib.outfit && (
            <div className="fg-span">
              <b>{lib.outfit}</b>
              <span className="fg-note">全局角色的默认服装，这一局一开头不穿</span>
              <button type="button" className="fg-btn is-mini" title="这一局一开头照旧穿默认服装" onClick={() => run('wr', () => look({ defaultWear: true, restoreOutfits: [lib.outfit] }), `一开头照旧穿${lib.outfit}`)}>放回</button>
            </div>
          )}
          {wear.map((w, i) => (
            <div key={w.fromTurn + '|' + w.outfit} className="fg-span">
              <b>{w.outfit}</b>
              {person.global && i === 0 && !w.source ? (
                <>
                  <span className="fg-note">全局角色的默认服装，第 0 轮起</span>
                  <button type="button" className="fg-btn is-mini" title="这一局一开头不穿它（全局库和别的对局不变）" onClick={() => run('wd' + i, () => look({ defaultWear: false }), '这一局一开头不穿默认服装了')}>✕</button>
                </>
              ) : (
                <>
                  <span>第</span>
                  <Text value={w.fromTurn} style={{ width: '5cqw' }} onCommit={v => { const t = turnOf(v); if (t != null && t !== w.fromTurn) run('w' + i, () => look({ wearMove: { from: w.fromTurn, to: t } }), '已改') }} />
                  <span>轮起</span>
                  <button type="button" className="fg-btn is-mini" title="删掉这次换装" onClick={() => run('wd' + i, () => look({ wearDrop: w.fromTurn }), '已删掉这次换装')}>✕</button>
                </>
              )}
            </div>
          ))}
          {!wear.length && !(lib && lib.noDefaultWear && lib.outfit) && <span className="fg-note">还没有换装记录</span>}
        </div>
      </div>
    </>
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
  const [look, setLook] = React.useState(-1) // 放大看的是第几次画的
  const sprites = person.sprites || {}
  if (record && record.face) {
    const body = sprites[record.face.from]
    const bodyLabel = emotionEntry((body && body.emotion) || keyEmotion(record.face.from), emotions).label
    const paint = record.face.paint
    const fixed = typeof record.face.strength === 'number'
    const redo = strength => run('redo', () => api.cast(gameId, 'face-redo', { name: person.name, key: emotionKey, ...(strength === undefined ? {} : { strength }) }), strength === undefined ? '换个种子重画脸' : '按这个强度重画脸')
    const how = paint ? [
      `强弱「${FACE_LEVEL_LABEL[paint.level] || '?'}」`,
      `重绘强度 ${Number(paint.strength).toFixed(2)}${fixed ? '（你定的）' : ''}`,
      paint.crop ? '放大重画' : '',
      paint.soft ? '软边' : '',
      paint.reference ? '带角色参考' : '',
      paint.tone && paint.tone.some(Boolean) ? `色调拉回 ${paint.tone.map(v => (v > 0 ? '+' : '') + v).join('/')}` : '',
      eyeText(paint.eyes),
      paint.check ? `比对：${Number.isFinite(paint.check.expr) ? `表情变化 ${paint.check.expr}、` : ''}接缝 ${paint.check.seam}、明暗 ${paint.check.shade}${Number.isFinite(paint.check.eye) ? `、瞳色 ${paint.check.eye}` : ''}${paint.tries > 1 ? `（画了 ${paint.tries} 次，${paint.check.ok ? '这张过了' : paint.check.flat ? '表情都没换上，留了变得最多的' : '表情换上了，画风都没完全过，留了最像的'}）` : paint.check.ok ? '' : paint.check.flat ? '（表情没换上）' : '（画风没过）'}` : '',
    ].filter(Boolean).join(' · ') : ''
    // 每次画的强度和比对：哪次表情没换上、哪次画风跑偏；每次画的脸都留着（以前画的只有分数），点开能换成那次的
    const tries = paint && Array.isArray(paint.history) ? paint.history : []
    const tryText = (t, i) => `第 ${i + 1} 次 ${Number(t.strength).toFixed(2)}：表情 ${t.expr}、接缝 ${t.seam}、明暗 ${t.shade}${Number.isFinite(t.eye) ? `、瞳色 ${t.eye}` : ''}${t.ok ? '，过了' : t.flat ? '，表情没换上' : '，画风跑偏'}`
    const pickable = tries.length > 0 && tries.every(t => t && t.assetId) && Array.isArray(paint.rect)
    const current = paint && Number.isInteger(paint.pick) ? paint.pick : -1
    const history = !pickable && tries.length > 1 ? tries.map(tryText).join('；') : ''
    const pick = i => run('pick', () => api.cast(gameId, 'face-pick', { name: person.name, key: emotionKey, index: i }), `换成第 ${i + 1} 次画的了`).then(() => setLook(-1))
    return (
      <div className="fg-face-info">
        <div className="fg-row">
          <span className="fg-note">只换脸：在「{bodyLabel}」这张「{record.poseLabel || (POSES[record.face.pose] || {}).label || '动作'}」底图上重画脸，身体衣服跟底图一样{Number.isInteger(record.face.seed) ? ` · 脸的种子 ${record.face.seed}` : ''}</span>
          {record.assetId && <button type="button" className="fg-btn is-mini" disabled={busy === 'redo'} onClick={() => redo(undefined)}>换个种子重画脸</button>}
        </div>
        {how && <div className="fg-note">{how}</div>}
        {record.eyeFix && record.eyeFix.original && <div className="fg-note">底图照瞳色基准补过色，这张跟着照新底图补了瞳色（{eyeText(record.eyeFix.eyes, '')}）</div>}
        {history && <div className="fg-note">{history}</div>}
        {pickable && (
          <>
            <span className="fg-note">每次画的脸（点开放大，看中哪次就换成哪次；比对只认线条和色调，认不出表情对不对，以你看到的为准）</span>
            <div className="fg-face-tries">
              {tries.map((t, i) => (
                <button type="button" key={i} className={`fg-face-try${i === current ? ' is-on' : ''}${t.ok ? '' : t.flat ? ' is-flat' : ' is-drift'}`} title={tryText(t, i)} onClick={() => setLook(i)}>
                  <img src={assetUrl(t.assetId)} alt="" loading="lazy" />
                  <span>{i + 1} · {Number(t.strength).toFixed(2)}{i === current ? ' · 在用' : t.ok ? ' · 过了' : t.flat ? ' · 没换上' : ' · 跑偏'}</span>
                </button>
              ))}
            </div>
          </>
        )}
        {record.positive && (
          <details>
            <summary className="fg-note">这张实际发出去的提示词</summary>
            <div className="fg-note">Base：{record.positive}</div>
            {(record.characters || []).map((c, i) => <div key={i} className="fg-note">角色 {i + 1}：{c}</div>)}
            {record.negativePrompt && <div className="fg-note">负面：{record.negativePrompt}</div>}
            {(record.characterNegatives || []).map((c, i) => (c ? <div key={'n' + i} className="fg-note">角色 {i + 1} 负面：{c}</div> : null))}
          </details>
        )}
        {look >= 0 && tries[look] && tries[look].assetId && (
          <Lightbox className="is-face" src={assetUrl(tries[look].assetId)} onClose={() => setLook(-1)}>
            <span className="fg-pill">{tryText(tries[look], look)}{look === current ? '（在用）' : ''}</span>
            {look > 0 && <button type="button" className="fg-btn is-mini" onClick={() => setLook(look - 1)}>上一次</button>}
            {look < tries.length - 1 && <button type="button" className="fg-btn is-mini" onClick={() => setLook(look + 1)}>下一次</button>}
            {look !== current && <button type="button" className="fg-btn" disabled={busy === 'pick'} onClick={() => pick(look)}>用这次的</button>}
          </Lightbox>
        )}
        {record.assetId && (
          <div className="fg-row">
            <span className="fg-note">这张的重绘强度</span>
            <Select value={fixed ? record.face.strength.toFixed(2) : ''} style={INLINE} onChange={v => redo(v === '' ? null : Number(v))}
              options={[['', '自动（按强弱）'], ...[...new Set([0.3, 0.4, 0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95, 1, ...(fixed ? [record.face.strength] : [])])].sort((a, b) => a - b).map(n => [n.toFixed(2), n.toFixed(2) + (n <= 0.5 ? '（改得少，留住画风）' : n >= 0.95 ? '（从零重画）' : '')])]} />
            <span className="fg-note">改了就按它重画这张（定死了就不自动调）；表情没换上调高，画风跑偏调低</span>
          </div>
        )}
      </div>
    )
  }
  const deps = Object.values(sprites).filter(r => r && r.face && r.face.from === emotionKey)
  if (!record || !record.assetId || (!deps.length && !record.pose)) return null
  const auto = framedResult(record.assetId)
  const boxText = record.faceBox ? (record.faceBy === 'hand' ? '脸框：你框的' : '脸框：自动认出') : auto === 'miss' ? '脸框：自动没认准，框一下' : '脸框：还没认（开着 FlowGal 的页面、认脸小模型下好时自动认）'
  return (
    <>
      <div className="fg-row fg-face-info">
        <span className="fg-note">「{record.poseLabel || (POSES[record.pose] || {}).label || '动作'}」动作底图：同一个动作的 {deps.length} 张表情在它上面只换脸，重画或上传这张，它们会跟着重换。{boxText}</span>
        <button type="button" className="fg-btn is-mini" onClick={() => setFraming(!framing)}>{framing ? '收起' : record.faceBox ? '调整脸框' : '框脸'}</button>
      </div>
      {framing && <FaceBoxEditor gameId={gameId} person={person} bodyKey={emotionKey} record={record} onDone={() => setFraming(false)} />}
    </>
  )
}

// 两只眼睛补瞳色的结果（lib/eye-color.js 的 status）
const EYE_STATUS = { same: '颜色本来就一样', closed: '闭着没补', gray: '灰黑色不补', none: '没认出虹膜', nobase: '基准上这只没量出' }
/** 「瞳色：左 补前差 12、右 闭着没补」；两只都没量的回 ''。 */
function eyeText(eyes, lead = '瞳色：') {
  if (!Array.isArray(eyes) || !eyes.some(e => e && (e.status === 'fixed' || e.status === 'same'))) return ''
  return lead + eyes.map((e, i) => `${i ? '右' : '左'} ${!e ? '?' : e.status === 'fixed' ? (e.fixed === false ? `差 ${e.before}（没开补色）` : `补前差 ${e.before}、补后 ${e.after}`) : EYE_STATUS[e.status] || e.status}`).join('、')
}

/**
 * 不同立绘瞳色统一（整张画的立绘）：这张是不是瞳色基准、照基准补过没有；能把它设成基准、换回原图、让别的照它补一遍。
 * 换脸的差分照自己的底图补，不在这里显示。
 */
function EyeInfo({ gameId, person, spriteKey, record, emotions }) {
  const [busy, run] = useBusy()
  if (!record || !record.assetId || record.face) return null
  const ref = person.eyeRef
  const sprites = person.sprites || {}
  const refRecord = ref && sprites[ref.key]
  const refLabel = ref ? (refRecord ? `${emotionEntry(refRecord.emotion || keyEmotion(ref.key), emotions).label}${refRecord.poseLabel ? ` · ${refRecord.poseLabel}` : ''}` : '（那张已经删了，颜色还记着）') : ''
  const isRef = Boolean(ref && ref.key === spriteKey)
  const cmd = (action, extra, ok) => run(action, () => api.cast(gameId, action, { name: person.name, ...extra }), ok)
  let text
  if (isRef) text = '瞳色基准：这个角色别的整张立绘都照这张补瞳色（换脸的差分照自己的底图补）。'
  else if (record.eyeKeep) text = '瞳色：这张用原图，不照基准补。'
  else if (record.uploaded) text = '上传的立绘不补瞳色（可以设成基准）。'
  else if (record.aa) text = '做了逆转式动态的立绘不补瞳色（补了贴片会对不上）。'
  else if (!record.faceBox) text = '瞳色：量好脸框后照基准补（开着剧场时自动量，也可以框一下脸）。'
  else if (!ref) text = '瞳色：这个角色还没有瞳色基准（最早画的那张量好脸框后自动当基准）。'
  else if (record.eyeFix) text = record.eyeFix.original ? `瞳色：照基准「${refLabel}」补过（${eyeText(record.eyeFix.eyes, '') || '没补'}）。` : `瞳色：跟基准「${refLabel}」比过，没补（${(record.eyeFix.eyes || []).map((e, i) => `${i ? '右' : '左'} ${EYE_STATUS[e && e.status] || '颜色一样'}`).join('、')}）。`
  else text = `瞳色：还没照基准「${refLabel}」补（「统一瞳色」关着时不自动补，点下面补）。`
  return (
    <div className="fg-row fg-face-info">
      <span className="fg-note">{text}</span>
      {isRef && <button type="button" className="fg-btn is-mini" disabled={busy === 'eye-unify'} onClick={() => cmd('eye-unify', {}, '别的立绘都照它补了一遍瞳色')}>别的立绘照它补一遍</button>}
      {!isRef && record.faceBox && <button type="button" className="fg-btn is-mini" disabled={busy === 'eye-ref'} onClick={() => cmd('eye-ref', { key: spriteKey }, '已设成瞳色基准，别的立绘照它补了一遍')}>设成瞳色基准</button>}
      {!isRef && !record.uploaded && !record.aa && record.faceBox && ref && (record.eyeKeep
        ? <button type="button" className="fg-btn is-mini" disabled={busy === 'eye-keep'} onClick={() => cmd('eye-keep', { key: spriteKey, keep: false }, '照基准补了瞳色')}>照基准补瞳色</button>
        : (record.eyeFix && record.eyeFix.original ? <button type="button" className="fg-btn is-mini" disabled={busy === 'eye-keep'} onClick={() => cmd('eye-keep', { key: spriteKey, keep: true }, '换回原图了，这张不再照基准补')}>这张用原图</button>
          : !record.eyeFix && <button type="button" className="fg-btn is-mini" disabled={busy === 'eye-keep'} onClick={() => cmd('eye-keep', { key: spriteKey, keep: false }, '照基准补了瞳色')}>照基准补瞳色</button>))}
    </div>
  )
}

/**
 * 选中的一张差分：看 / 改提示词，让立绘设计师重写，按自己的词画，上传，删除。
 * token 是「情绪」（在它的主动作上）或「情绪@动作」（动作与表情的表里点开的那一格，lib/poses.js）；sheet 是这个人的那套动作（不分动作为 null）。
 */
function VariantEditor({ gameId, person, group, emotion: token, emotions, sheet = null, turn, onClose }) {
  const { emotion, pose: ref } = parseToken(token)
  const pose = sheet ? poseFor(sheet, emotion, ref, emotions) : null
  const key = slotKey(person.sprites || {}, group.key, sheet, pose ? pose.id : '', emotion, emotions)
  const record = (person.sprites || {})[key] || null
  const boxRef = React.useRef(null)
  React.useEffect(() => { if (boxRef.current && boxRef.current.scrollIntoView) boxRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' }) }, [token])
  const st = (person.spriteStatus || {})[key]
  const [tags, setTags] = React.useState(record ? record.tags || '' : '')
  const [busy, run] = useBusy()
  const fileRef = React.useRef(null)
  const aaRef = React.useRef(null)
  React.useEffect(() => { setTags(record ? record.tags || '' : '') }, [key, record && record.tags])
  const entry = emotionEntry(emotion, emotions)
  // 段落里当时的那套不在时间线上：按那套立绘记着的样子画（look 是这套的差分前缀）
  const reachable = group.current || turn != null || Boolean(group.era)
  const at = group.current ? {} : group.era ? { look: group.key } : { turn }
  const label = `${person.name} · ${lookLabel(group.look)} · ${entry.label}${pose && sheet && sheet.poses.length > 1 ? ` · ${pose.label}` : ''}`
  const [viewing, setViewing] = React.useState(false)
  // 给设计师的要求（接在这张差分那一行后面）；不按动作库：动作照要求自由设计，画好绑到勾的动作 / 这个情绪的格子，或者另存成新动作（都行）
  const designed = Boolean(sheet && sheet.designed)
  const [ask, setAsk] = React.useState(() => (record ? record.ask || (record.free && record.free.ask) || '' : ''))
  const [free, setFree] = React.useState(() => Boolean(record && record.free))
  const [into, setInto] = React.useState(() => (designed && pose ? [pose.id] : []))
  const [bare, setBare] = React.useState(!designed)
  const [asPose, setAsPose] = React.useState(false)
  const [poseName, setPoseName] = React.useState('')
  const toggleInto = id => setInto(list => (list.includes(id) ? list.filter(x => x !== id) : [...list, id]))
  const bound = (designed ? into.length : bare) || asPose
  // 存成了新动作就把那一项收起来（再点一次不会又存一个）
  const drawFree = (id, extra, ok) => run(id, async () => {
    await api.cast(gameId, 'sprite-free', { name: person.name, emotion, ask, into: designed ? into : [], bare: !designed && bare, newPose: asPose ? { label: poseName.trim() } : null, ...extra, ...at })
    setAsPose(false)
    setPoseName('')
  }, ok)
  const whereText = () => {
    const names = designed ? sheet.poses.filter(p => into.includes(p.id)).map(p => `「${p.label}」`) : bare ? [`「${entry.label}」这一格`] : []
    const parts = [...(names.length ? [`放进${names.join('、')}`] : []), ...(asPose ? [`存成新动作${poseName.trim() ? `「${poseName.trim()}」` : ''}`] : [])]
    return parts.length ? `画一张，${parts.join('，再')}（共用同一张图）` : '还没选：勾一个动作，或者存成新动作'
  }
  return (
    <div className="fg-variant" ref={boxRef}>
      {/* 做过逆转式动态的直接动起来；点一下放大看 */}
      <div className="fg-variant-art">{record && record.assetId ? <SpriteArt record={record} label={label} onOpen={() => setViewing(true)} /> : <span>{st ? SPRITE_STATUS[st.status] : '还没画'}</span>}</div>
      {viewing && <SpriteViewer record={record} label={label} onClose={() => setViewing(false)} />}
      <div className="fg-variant-body">
        <div className="fg-row"><b>{label}</b><span className="fg-spacer" /><button type="button" className="fg-btn is-mini" onClick={onClose}>收起</button></div>
        {emotion !== 'neutral' && <div className="fg-note">替身「{emotionLabel(nearestOf(emotion, emotions) || 'neutral', emotions)}」：这张还没画好时先用那张（情绪库里能改）{entry.off ? ' · 这种情绪停用了，导演不再用它' : ''}</div>}
        {st && st.error && <div className={`fg-note${st.status === 'face' || st.status === 'writing' ? '' : ' fg-err'}`}>{st.error}</div>}
        <FaceInfo gameId={gameId} person={person} group={group} emotionKey={key} record={record} emotions={emotions} />
        <EyeInfo gameId={gameId} person={person} spriteKey={key} record={record} emotions={emotions} />
        <div className="fg-row">
          <span className="fg-note">画法</span>
          <button type="button" className={`fg-btn is-mini${!free ? ' is-on' : ''}`} onClick={() => setFree(false)}>按动作库</button>
          <button type="button" className={`fg-btn is-mini${free ? ' is-on' : ''}`} onClick={() => setFree(true)}>不按动作库</button>
          <span className="fg-note">{free ? '这一张的动作照你的要求自由设计（不写要求设计师自己发挥），画好绑到下面选的地方' : pose && designed ? `动作照「${pose.label}」画` : '动作照设置里的通用动作组画'}</span>
        </div>
        {free && (
          <div className="fg-askbox">
            {designed ? (
              <div className="fg-ticks">
                <span className="fg-note">绑到</span>
                {sheet.poses.map(p => (
                  <label key={p.id} className={`fg-tick${into.includes(p.id) ? ' is-on' : ''}`} title={p.emotions.includes(emotion) ? `画好放进「${p.label} × ${entry.label}」这一格` : `「${p.label}」里还没有「${entry.label}」：放进去`}>
                    <input type="checkbox" checked={into.includes(p.id)} onChange={() => toggleInto(p.id)} />{p.label}{p.emotions.includes(emotion) ? null : <small>＋{entry.label}</small>}
                  </label>
                ))}
              </div>
            ) : (
              <div className="fg-ticks">
                <label className={`fg-tick${bare ? ' is-on' : ''}`}><input type="checkbox" checked={bare} onChange={e => setBare(e.target.checked)} />放到「{entry.label}」这一格</label>
              </div>
            )}
            <div className="fg-ticks">
              <label className={`fg-tick${asPose ? ' is-on' : ''}`} title="这张当底图，另存成一个新动作（这个情绪放进去）；之后这个动作里的别的情绪在它上面画"><input type="checkbox" checked={asPose} onChange={e => setAsPose(e.target.checked)} />另存成新动作</label>
              {asPose && <input className="fg-input fg-posename" maxLength={12} value={poseName} placeholder="动作名（不填设计师起）" onChange={e => setPoseName(e.target.value)} onKeyDown={e => e.stopPropagation()} />}
            </div>
            <div className="fg-note">{whereText()}{asPose && !designed ? '。他还没有动作设计：会以这个动作开一份设计（平静也放进来），别的情绪之后由表演设计师补进来' : ''}</div>
          </div>
        )}
        <textarea className="fg-textarea" value={tags} onChange={e => setTags(e.target.value)} onKeyDown={e => e.stopPropagation()} placeholder={record && record.face ? '只换脸：这里只写表情（眉、眼、嘴、脸红、泪、视线）' : '还没有提示词：点「让设计师写」，它会读完资料和剧情来写'} />
        <textarea className="fg-textarea is-short fg-askline" maxLength={ASK_CHARS} value={ask} onChange={e => setAsk(e.target.value)} onKeyDown={e => e.stopPropagation()}
          placeholder={free ? '你的要求（可以不写，设计师自己发挥）：这一张想要什么动作、什么感觉，比如「坐在窗台上抱着膝盖往外看」「举着剑回头」' : '你的要求（可以不写）：比如「表情再收着一点」「手里拿着那封信」「视线往下」'} />
        <div className="fg-note">{record && record.writer ? WRITER_LABEL[record.writer] || record.writer : ''}{record && record.seed != null ? ` · 种子 ${record.seed}` : ''}{record && record.free ? ` · 不按动作库自由画的${record.free.ask ? `：${record.free.ask}` : ''}` : record && record.ask ? ` · 带着你的要求：${record.ask}` : ''}{!reachable ? ' · 这套样子在剧情里已经不会再出现（外貌改过），只能删除或上传' : ''}</div>
        <div className="fg-note">要求接在提示词本「立绘设计师 · 你对这张的要求」那条里发给设计师（那条能改），跟规矩冲突时以你的为准；「按这些词画」只照上面的词。</div>
        <div className="fg-row">
          {free ? <>
            <button type="button" className="fg-btn is-primary" disabled={!reachable || !bound || busy === 'fw'} title={bound ? '' : '先选绑到哪，或者存成新动作'} onClick={() => drawFree('fw', {}, '已交给立绘设计师：自由设计这一张的动作，写好词就画')}>让设计师自由设计并画</button>
            <button type="button" className="fg-btn" disabled={!reachable || !bound || !tags.trim() || busy === 'fu'} title={bound ? '照上面的词画，动作也照词里写的' : '先选绑到哪，或者存成新动作'} onClick={() => drawFree('fu', { tags }, '已排队：按这些词画')}>按这些词画</button>
          </> : <>
            <button type="button" className="fg-btn is-primary" disabled={!reachable || busy === 'w'} onClick={() => run('w', () => api.cast(gameId, 'sprite', { name: person.name, emotion: token, rewrite: true, ask, ...at }), ask.trim() ? '已交给立绘设计师：照你的要求写好词就画' : '已交给立绘设计师：写好词就画')}>{record && record.assetId ? '让设计师重写并重画' : '让设计师写并画'}</button>
            <button type="button" className="fg-btn" disabled={!reachable || !tags.trim() || busy === 'u'} onClick={() => run('u', () => api.cast(gameId, 'sprite', { name: person.name, emotion: token, tags, ...at }), '已排队：按这些词画')}>按这些词画</button>
          </>}
          <button type="button" className="fg-btn" disabled={!reachable} onClick={() => fileRef.current && fileRef.current.click()}>上传到这张</button>
          {record && <button type="button" className="fg-btn" onClick={() => run('d', () => api.cast(gameId, 'sprite-delete', { name: person.name, key }), '已删除').then(onClose)}>删除</button>}
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={async e => {
            const file = e.target.files && e.target.files[0]
            e.target.value = ''
            if (!file) return
            const dataUrl = await readFile(file)
            run('up', () => api.cast(gameId, 'upload', { name: person.name, emotion: token, dataUrl, ...at }), '立绘已上传')
          }} />
        </div>
        <div className="fg-row">
          <span className="fg-note">{record && record.aa ? `逆转式素材包${record.aa.pack && record.aa.pack.name ? `「${record.aa.pack.name}」` : ''}：${record.aa.pack && record.aa.pack.version === 2 ? `会眨眼，说话时按字动嘴${Object.keys(record.aa.pack.poses || {}).length > 1 ? '，导演让他侧头时会转过去' : ''}` : '会呼吸、眨眼，说话时动嘴'}` : '逆转式立绘：导入素材包文件夹（motion.json 或 sprite.json 加图片），这张就会眨眼、动嘴（新版还会侧头）；图会换成素材包自带的那张'}</span>
          <button type="button" className="fg-btn" disabled={!reachable || busy === 'aa'} onClick={() => aaRef.current && aaRef.current.click()}>{busy === 'aa' ? '导入中…' : record && record.aa ? '换素材包' : '导入素材包'}</button>
          {record && record.aa && record.aa.pack && <button type="button" className="fg-btn" disabled={busy === 'aa-rm'} onClick={() => run('aa-rm', () => api.cast(gameId, 'aa-remove', { name: person.name, key }), '已取消动态，图留着')}>取消动态</button>}
          <input ref={aaRef} type="file" webkitdirectory="" multiple hidden onChange={e => {
            const files = [...(e.target.files || [])]
            e.target.value = ''
            if (files.length) run('aa', async () => { const { manifest, files: images } = await readAaFolder(files); await api.cast(gameId, 'aa-pack', { name: person.name, emotion: token, key, manifest, files: images, ...at }) }, '素材包已导入：这张立绘会呼吸、眨眼、动嘴了')
          }} />
        </div>
      </div>
    </div>
  )
}

/** 玩家填的动作数：正整数，没填或填错了是 0（不设上限）。 */
const countValue = v => { const n = Math.floor(Number(v)); return Number.isFinite(n) && n > 0 ? n : 0 }

/**
 * 这一身已经画过、或者记过提示词的情绪（「按这套设计重画」「按新笔记重写表情」重画它们）。
 * at 是画它们要带的参数：现在这一身不用带；段落里当时的样子带 look；以前那一轮的样子带 turn。
 */
function drawnIn(person, group, turn) {
  const drawn = Object.entries(person.sprites || {}).filter(([key, r]) => key.startsWith(group.key + '|') && r && (r.assetId || r.tags)).map(([key]) => key.split('|').pop())
  const reachable = group.current || turn != null || Boolean(group.era)
  return { drawn, reachable, at: group.current ? {} : group.era ? { look: group.key } : { turn } }
}

/**
 * 表演笔记，分两条（lib/acting.js）：
 *  - 本性：这个人本来怎么流露情绪（性格、经历让他把情绪藏起来还是摆在脸上），换个世界也成立，全局角色跟着人去每个世界。
 *    设计师读完资料写一份（acting.read）；玩家写了就用玩家的（actingNote），锁住，重新设计也不改它；清空了回到设计师写的。
 *  - 这一局：此刻的处境怎么影响他流露情绪（还在找人、刚团聚、受了伤），只管这一局。设计师按处境写（acting.now，处境变了复盘时重写）；
 *    玩家写了就用玩家的（这一局的 noteHere），锁住。
 * 表演设计师设计动作和表情、立绘设计师写差分都照它们。失焦就存。正在改的时候设计师写了新的，不冲掉正在改的，提示一下。
 */
function ActingNote({ gameId, person, group, turn, here = false }) {
  const [busy, run] = useBusy()
  const acting = person.acting
  const ai = (acting && (here ? acting.now : acting.read)) || ''
  const mine = (here ? person.noteHere : person.actingNote) || ''
  const shown = mine || ai
  const [v, setV] = React.useState(shown)
  const [editing, setEditing] = React.useState(false)
  const [fresh, setFresh] = React.useState(false) // 改着的时候设计师写了新的一版
  React.useEffect(() => {
    if (editing && v !== shown) { setFresh(true); return }
    setV(shown)
    setFresh(false)
  }, [shown])
  const commit = () => {
    setEditing(false)
    const text = v.trim()
    if (text === shown.trim()) { setV(shown); return }
    if (!text && !mine) { setV(shown); return }
    const save = here
      ? api.cast(gameId, 'acting-here', { name: person.name, text })
      : api.cast(gameId, person.global ? 'global-save' : 'save', { name: person.name, patch: { actingNote: text } })
    run('note', () => save, text ? `表演笔记·${here ? '这一局' : '本性'}已保存：之后设计和画差分都照你写的` : ai ? '已清空，回到设计师写的那份' : '已清空')
  }
  const designing = person.actingBusy || busy === 'rewrite'
  const rewrite = async () => {
    if (here) {
      run('rewrite', () => api.cast(gameId, 'acting-review', { name: person.name }), '已交给表演设计师：按到最新一轮的处境复盘，重写这一局的笔记（导演日志里能看进度）')
      return
    }
    if (mine && !(await confirmBox(`换掉你写的表演笔记·本性，让表演设计师重新读一遍资料、剧情和档案，给${person.name}写一份？`, { ok: '重新写' }))) return
    run('rewrite', () => api.cast(gameId, 'acting-note', { name: person.name, replace: true }), acting ? '已交给表演设计师：读完资料就写好（导演日志里能看进度）' : '还没设计动作与表情：已交给设计师整套设计，表演笔记一起写')
  }
  const { drawn, reachable, at } = drawnIn(person, group, turn)
  const redraw = async () => {
    if (!(await confirmBox(`让立绘设计师按现在的表演笔记，重新设计${person.name}「${lookLabel(group.look)}」这 ${drawn.length} 种表情、重写提示词再画？动作不变。`, { ok: '重画' }))) return
    run('redraw', () => api.cast(gameId, 'sprite', { name: person.name, emotions: drawn, rewrite: true, ...at }), '已排队：按新的表演笔记重写表情')
  }
  const readTurn = acting ? (here ? (acting.nowTurn != null ? acting.nowTurn : acting.turn) : (acting.readTurn != null ? acting.readTurn : acting.turn)) : null
  const whose = here
    ? (mine ? '你写的，只管这一局（锁住：复盘也不会改它；清空就回到设计师写的）'
      : ai ? `表演设计师按第 ${readTurn != null ? readTurn : '?'} 轮的处境写的，处境变了复盘时重写；改了就算你写的`
      : '还没写。处境变了、设计师复盘时会写；也可以自己写。只管这一局，不带去别的世界')
    : (mine ? `你写的（锁住：重新设计也不会改它；清空就回到设计师写的）${person.global ? '。全局角色：跟着人去每个世界' : ''}`
      : ai ? `表演设计师读到第 ${readTurn != null ? readTurn : '?'} 轮写的，改了就算你写的`
      : '还没写。第一次设计动作与表情时，表演设计师会读完资料写一份；你也可以自己先写')
  return (
    <div className="fg-field"><label>{here ? '表演笔记·这一局' : '表演笔记·本性'}</label>
      <div>
        <textarea className="fg-textarea" value={v} disabled={busy === 'note'} onFocus={() => setEditing(true)} onChange={e => setV(e.target.value)} onBlur={commit} onKeyDown={e => e.stopPropagation()}
          placeholder={here ? '此刻的处境怎么影响他流露情绪：比如「刚和阿黛尔重逢，不安少了，摸坠子时是在笑」「左手受了伤，抬手时会护着」'
            : '这个人本来怎么流露情绪（换个世界也成立的）：比如「嘴硬心软，难过时反而笑，只有眼眶会红；生气时声音变轻、不看人」'} />
        {fresh && (
          <div className="fg-row fg-note">
            设计师刚写了新的一版，你正在改的没有冲掉。
            <button type="button" className="fg-btn is-mini" onClick={() => { setV(shown); setFresh(false) }}>换成设计师的新版</button>
          </div>
        )}
        <div className="fg-row">
          <span className="fg-note">{whose}</span>
          <span className="fg-spacer" />
          {here
            ? <button type="button" className="fg-btn is-mini" disabled={designing || !acting} title={acting ? '设计师读到最新一轮，按他现在的处境复盘：收起的动作里的情绪重新安家，需要时设计新动作，重写这一条（你写了的照你写的）' : '还没设计动作与表情'} onClick={rewrite}>{designing ? '设计师在写…' : '让设计师按现在的处境复盘'}</button>
            : <button type="button" className="fg-btn is-mini" disabled={designing} onClick={rewrite}>{designing ? '设计师在写…' : '让设计师重写'}</button>}
          {!here && <button type="button" className="fg-btn is-mini" disabled={!reachable || !drawn.length || busy === 'redraw'} title="动作不变，按现在的表演笔记重新设计这些表情、重写提示词再画" onClick={redraw}>按新笔记重写表情{drawn.length ? `（「${lookLabel(group.look)}」${drawn.length} 张）` : ''}</button>}
        </div>
      </div>
    </div>
  )
}

/**
 * 动作与表情设计：表演设计师读完资料和剧情给这个人设计的专属动作（每个动作整张画一张底图），和每种情绪在他脸上的样子。
 * 一张「动作 × 情绪」的表（PoseMatrix.jsx）：加删动作、改名字描述身体 tag，一个情绪勾进好几个动作、设底图，展开一行改表情；改了自动存。
 * 能让设计师重新设计，能按这套设计把这一身重画，能把勾上了还没画的组合一键补足；点格子里的小图打开那张差分。
 * 表演笔记（怎么流露情绪）在档案里改。
 * 边改边存：后台的设计变了时，是自己刚存的那版就不管；设计师新写的、这边也没有没存的修改就换上；有没存的修改就提示，不冲掉。
 */
function ActingEditor({ gameId, person, emotions, group, turn, used, onOpen, situNeeds = true }) {
  const [busy, run] = useBusy()
  const acting = person.acting
  // 收起 / 放回的记录、从哪一句起才有不在这里改（以后台存的为准，下面的按钮另外发）
  const bare = p => { const { life, from, joins, ...rest } = p; return rest }
  const copy = a => (a ? JSON.parse(JSON.stringify({ ...(a.height ? { height: a.height } : {}), poses: (a.poses || []).map(bare), faces: a.faces || {} })) : null)
  const [draft, setDraft] = React.useState(() => copy(acting))
  const sent = React.useRef(JSON.stringify(copy(acting))) // 最后存上的（或从后台拿到的）那版
  const ownAt = React.useRef(null) // 自己刚存的那版的 at
  const inflight = React.useRef(false)
  const latest = React.useRef(draft)
  latest.current = draft
  const [saving, setSaving] = React.useState('') // '' | 'saving' | 'saved' | 出错的原因
  const [incoming, setIncoming] = React.useState(false) // 改着的时候设计师写了新的一版
  const [form, setForm] = React.useState('') // 开着的那块：'more' 让 AI 加动作，'full' 重新设计整套（都能定动作数、写要求）
  const [counts, setCounts] = React.useState({ more: '2', full: '' }) // 加几个 / 整套设计几个（空着由设计师定）
  const [ask, setAsk] = React.useState('')
  const [draw, setDraw] = React.useState('base')
  const unsaved = d => Boolean(d) && JSON.stringify(d) !== sent.current
  const pending = unsaved(draft) || saving === 'saving'
  React.useEffect(() => {
    if (!acting) { setDraft(null); sent.current = JSON.stringify(null); setIncoming(false); return }
    if (inflight.current || acting.at === ownAt.current) return
    const next = copy(acting)
    const text = JSON.stringify(next)
    if (text === sent.current) return
    if (!unsaved(draft)) { setDraft(next); sent.current = text; setIncoming(false) }
    else setIncoming(true)
  }, [acting && acting.at])
  const push = (sheet, text) => {
    inflight.current = true
    setSaving('saving')
    return api.cast(gameId, 'acting-save', { name: person.name, acting: sheet })
      .then(r => { sent.current = text; ownAt.current = r && r.at; setSaving('saved'); setIncoming(false) })
      .catch(e => setSaving(e.message || '没存上'))
      .finally(() => { inflight.current = false })
  }
  // 停手 1.2 秒就存；折起来、关掉人物志时没存的也存上
  React.useEffect(() => {
    if (!unsaved(draft)) return undefined
    const text = JSON.stringify(draft)
    const timer = setTimeout(() => push(draft, text), 1200)
    return () => clearTimeout(timer)
  }, [draft])
  React.useEffect(() => () => { const d = latest.current; if (unsaved(d) && !inflight.current) api.cast(gameId, 'acting-save', { name: person.name, acting: d }).catch(() => {}) }, [])
  const label = e => emotionEntry(e, emotions).label
  // 每个动作此刻在不在（lib/pose-life.js）：按最新一轮的样子算
  const ctx = { turn: Infinity, index: Infinity, states: situNeeds ? lookAt(person.timeline, Infinity).states : null }
  const stored = id => ((acting && acting.poses) || []).find(p => p.id === id)
  const lifeOf = id => { const p = stored(id); return p ? poseLife(p, ctx) : { live: true, why: '' } }
  const states = knownStates(person)
  const patchDraft = (id, patch) => setDraft(d => ({ ...d, poses: d.poses.map(p => (p.id === id ? { ...p, ...patch } : p)) }))
  const SRC = { director: '导演', review: '设计师复盘', label: '设计师', world: '设计师', user: '你' }
  const retire = async pose => {
    const why = await promptBox(`从最新一轮起收起「${pose.label}」：为什么？（可以不写）\n收起不删图，回忆、梦里照旧能用；设计师会把只在它里面的情绪放进现在合适的动作。`, '', { ok: '收起', placeholder: '比如：受伤了，暂时不能这样站' })
    if (why === null) return
    run('life', () => api.cast(gameId, 'pose-life', { name: person.name, pose: pose.id, on: false, why }), `已收起「${pose.label}」`)
  }
  const restore = pose => run('life', () => api.cast(gameId, 'pose-life', { name: person.name, pose: pose.id, on: true }), `已放回「${pose.label}」：从最新一轮起又能用`)
  const dropEvent = (pose, i, dropped) => run('life', () => api.cast(gameId, 'pose-life-drop', { name: person.name, pose: pose.id, index: i, dropped }), dropped ? '已撤回这一条' : '已恢复这一条')
  const extra = pose => {
    const p = stored(pose.id)
    const life = lifeOf(pose.id)
    const needs = pose.needs || []
    const hasNeed = n => needs.some(x => x.name === n)
    const toggleNeed = n => patchDraft(pose.id, { needs: hasNeed(n) ? needs.filter(x => x.name !== n) : [...needs, { name: n }] })
    const choices = [...new Set([...states.map(x => x.name), ...needs.map(x => x.name)])]
    const events = (p && p.life) || []
    return (
      <div className="fg-pm-situ">
        <div className="fg-row">
          <span className="fg-pm-kind">
            {['self', 'situ'].map(k => (
              <button key={k} type="button" className={`fg-btn is-mini${pose.kind === k ? ' is-on' : ''}`}
                title={k === 'self' ? '本性：从性格、教养、习惯来，换个世界、过多少年都还是他；导演不收它，全局角色带去别的世界' : '处境：从眼下的处境来（一段关系、一件信物、一道伤），写着前提；剧情跨过前提时收起'}
                onClick={() => patchDraft(pose.id, k === 'self' ? { kind: pose.kind === 'self' ? undefined : 'self', premise: undefined } : { kind: pose.kind === 'situ' ? undefined : 'situ' })}>{POSE_KIND_LABEL[k]}</button>
            ))}
          </span>
          {!pose.kind && <span className="fg-note">没标（导演会当处境看）</span>}
          <span className="fg-spacer" />
          {p && <span className={`fg-pm-status${life.live ? '' : ' is-off'}`}>{life.live ? '在用' : lifeText(life, p)}</span>}
          {p && life.live && pose.kind !== 'self' && <button type="button" className="fg-btn is-mini" disabled={busy === 'life'} title="从最新一轮起不再用这个动作（不删图）" onClick={() => retire(pose)}>收起</button>}
          {p && !life.live && life.why === 'off' && <button type="button" className="fg-btn is-mini" disabled={busy === 'life'} title="从最新一轮起又能用" onClick={() => restore(pose)}>放回</button>}
        </div>
        {pose.kind === 'situ' && <input className="fg-input" value={pose.premise || ''} placeholder="前提：它成立的处境（比如「还没找到阿黛尔，坠子是两人唯一的联系」）" onChange={e => patchDraft(pose.id, { premise: e.target.value.slice(0, 120) })} onKeyDown={e => e.stopPropagation()} />}
        {choices.length > 0 && (
          <div className="fg-pm-needs" title="这个动作要靠身上的这个东西才画得出来：长期状态里没了就自动收起，回来了放回">
            <span className="fg-note">靠</span>
            {choices.map(n => <button key={n} type="button" className={`fg-btn is-mini${hasNeed(n) ? ' is-on' : ''}`} onClick={() => toggleNeed(n)}>{n}</button>)}
          </div>
        )}
        {events.length > 0 && (
          <ul className="fg-pm-life">
            {events.map((e, i) => (
              <li key={i} className={e.dropped ? 'is-dropped' : ''}>
                <span>第 {e.turn} 轮起{e.on ? '放回' : '收起'}{e.why ? `：${e.why}` : ''}（{SRC[e.src] || '设计师'}）</span>
                <button type="button" className="fg-btn is-mini" disabled={busy === 'life'} onClick={() => dropEvent(pose, i, !e.dropped)}>{e.dropped ? '恢复' : '撤回'}</button>
              </li>
            ))}
          </ul>
        )}
      </div>
    )
  }
  const off = {}
  for (const p of draft ? draft.poses : []) { const life = lifeOf(p.id); if (!life.live) off[p.id] = lifeText(life, stored(p.id)) }
  const review = () => run('review', () => api.cast(gameId, 'acting-review', { name: person.name }), '已交给表演设计师：按到最新一轮的处境复盘（导演日志里能看进度）')
  const labelAll = () => run('label', () => api.cast(gameId, 'acting-label', { name: person.name }), '已交给表演设计师：给每个动作标本性和处境，表演笔记分成两条')
  // 整套设计（第一次 / 重新设计）可以定动作数、写要求；不填动作数设计师自己定
  const design = async () => {
    if (acting && !(await confirmBox(`让表演设计师重新读一遍资料和剧情，给${person.name}重新设计整套动作和表情？你改过的动作和表情会被换掉（表演笔记里你写的那条不动）；已经画好的立绘不动，要换成新设计就点「按这套设计重画」。`, { ok: '重新设计' }))) return
    const n = countValue(counts.full)
    run('design', async () => { await api.cast(gameId, 'acting-design', { name: person.name, ...(n ? { count: n } : {}), ask }); setForm(''); setAsk('') }, `已交给表演设计师：读完资料和剧情就设计好${n ? `（${n} 个动作）` : ''}（导演日志里能看进度）`)
  }
  const designing = person.actingBusy || busy === 'design' || busy === 'more'
  const { drawn, reachable, at } = drawnIn(person, group, turn)
  // 让 AI 加动作：已有的不动，只往上加 count 个；加好以后按 draw 画人物志里选着的这一身
  const more = () => {
    const n = countValue(counts.more) || 1
    const paint = reachable ? draw : ''
    run('more', async () => { await api.cast(gameId, 'acting-more', { name: person.name, count: n, ask, draw: paint, ...at }); setForm(''); setAsk('') }, `已交给表演设计师：加 ${n} 个动作${paint ? '，加好就画' : ''}（导演日志里能看进度）`)
  }
  const askBox = mode => (
    <div className="fg-askbox">
      <div className="fg-row">
        <b>{mode === 'more' ? '让 AI 加动作' : acting ? '重新设计整套' : '设计动作与表情'}</b>
        <span className="fg-note">{mode === 'more' ? '已有的动作和表情一概不动，只往上加新的动作（新动作里放哪些情绪、各自的表情，设计师一起设计）' : '设计师读完资料和剧情设计整套动作和每种情绪的表情'}</span>
      </div>
      <div className="fg-field"><label>{mode === 'more' ? '加几个动作' : '设计几个动作'}</label>
        <div className="fg-row">
          <input className="fg-input fg-count" type="number" min="1" step="1" value={counts[mode]} placeholder={mode === 'more' ? '1' : '设计师定'} onChange={e => { const v = e.target.value; setCounts(c => ({ ...c, [mode]: v })) }} onKeyDown={e => e.stopPropagation()} />
          <span className="fg-note">{mode === 'more' ? '想加多少写多少' : '不填由设计师按人设和剧情自己定；填了就照这个数设计'}</span>
        </div>
      </div>
      <div className="fg-field"><label>你的要求</label>
        <textarea className="fg-textarea is-short" maxLength={ASK_CHARS} value={ask} onChange={e => setAsk(e.target.value)} onKeyDown={e => e.stopPropagation()}
          placeholder={mode === 'more' ? '可以不写。比如：加一个坐着的、一个跟阿黛尔有关的；要有拿着坠子的；别再要抱臂类的了' : '可以不写。比如：动作要安静克制一点；多设计几个和剑有关的；要有一个躺着的'} />
      </div>
      {mode === 'more' && (
        <div className="fg-field"><label>加好以后</label>
          <div className="fg-row">
            <select className="fg-select" value={reachable ? draw : ''} disabled={!reachable} onChange={e => setDraw(e.target.value)}>
              <option value="">先不画（用到了再画）</option>
              <option value="base">画每个新动作的底图</option>
              <option value="all">新动作里的表情全画出来</option>
            </select>
            <span className="fg-note">{reachable ? `画「${lookLabel(group.look)}」这一身` : '这套样子在剧情里已经不会再出现，只加不画'}</span>
          </div>
        </div>
      )}
      <div className="fg-row">
        <span className="fg-note">要求接在提示词本「表演设计师 · 追加要求」那条里发给设计师（那条能改），跟规矩冲突时以你的为准。</span>
        <span className="fg-spacer" />
        {acting && <button type="button" className="fg-btn is-mini" onClick={() => setForm('')}>收起</button>}
        {mode === 'more'
          ? <button type="button" className="fg-btn is-mini is-primary" disabled={designing || pending} title={pending ? '等修改存好' : ''} onClick={more}>{designing ? '设计中…' : `让设计师加 ${countValue(counts.more) || 1} 个动作`}</button>
          : <button type="button" className={`fg-btn is-primary${acting ? ' is-mini' : ''}`} disabled={designing} onClick={design}>{designing ? '设计中…' : acting ? '重新设计' : '现在设计'}</button>}
      </div>
    </div>
  )
  if (!draft) {
    return (
      <div className="fg-person-form fg-acting">
        <div className="fg-note">还没设计。第一次给{person.name}画立绘之前，表演设计师会先读完人物卡、世界书、到这一轮为止的全部剧情和档案，写一份表演笔记（这个人怎么流露情绪，在「档案」里能看能改），按人设、经历和在故事里的处境设计专属的动作，以及每种情绪在脸上的样子；之后的底图和表情差分都照着画。没开立绘设计师、或者设计不出来时，用设置里的通用动作组。</div>
        {askBox('full')}
      </div>
    )
  }
  // 表里改的：平静总在第一个动作的底图上（跟存的时候规整的一样，免得删了第一个动作以后表上看不出来）
  const setPoses = poses => setDraft(d => ({ ...d, poses: settleNeutral(poses.map(p => ({ ...p, emotions: [...p.emotions] }))) }))
  const setFace = (e, patch) => setDraft(d => ({ ...d, faces: { ...d.faces, [e]: { desc: '', tags: '', ...(d.faces[e] || {}), ...patch } } }))
  const redraw = async () => {
    if (!(await confirmBox(`按这套设计重画${person.name}「${lookLabel(group.look)}」的 ${drawn.length} 张差分？每个动作的底图整张重画，其余表情在新底图上换脸。`, { ok: '重画' }))) return
    run('redraw', () => api.cast(gameId, 'sprite', { name: person.name, emotions: drawn, rewrite: true, keepFaces: true, ...at }), '已排队：照这套设计重画')
  }
  // 这一身里每一格存在哪张差分（lib/poses.js 的 slotKey）：勾上了还没画的，「一键补足」一起画
  const sprites = person.sprites || {}
  const sheet = { poses: draft.poses, designed: true }
  const slot = (pose, e) => slotKey(sprites, group.key, sheet, pose.id, e, emotions)
  const BUSY = ['writing', 'queued', 'running']
  const missing = draft.poses.flatMap(p => p.emotions.map(e => ({ p, e, key: slot(p, e) })))
    .filter(c => !(sprites[c.key] && sprites[c.key].assetId) && !BUSY.includes(((person.spriteStatus || {})[c.key] || {}).status))
  const fillAll = async () => {
    if (!(await confirmBox(`把${person.name}「${lookLabel(group.look)}」勾上了还没画的 ${missing.length} 个「动作 × 表情」都画出来？每个动作没有底图的先整张画底图，其余在底图上只换脸。`, { ok: '都画出来' }))) return
    run('fill', () => api.cast(gameId, 'sprite', { name: person.name, emotions: [...new Set(missing.map(c => tokenFor(sheet, c.e, c.p.id, emotions)))], rewrite: false, ...at }), `已排队：${missing.length} 张`)
  }
  const cell = (pose, e) => {
    const key = slot(pose, e)
    const record = sprites[key]
    const st = (person.spriteStatus || {})[key]
    const title = `${lookLabel(group.look)} · ${pose.label} · ${emotionEntry(e, emotions).label}${st && st.error ? '：' + st.error : record && record.assetId ? '（点开看、改、重画）' : '：还没画，点开能单独画'}`
    return (
      <button type="button" className={`fg-pm-thumb${st && BUSY.includes(st.status) ? ' is-busy' : ''}${st && st.status === 'failed' ? ' is-failed' : ''}`} title={title} onClick={() => onOpen && onOpen(tokenFor(sheet, e, pose.id, emotions))}>
        {record && record.assetId ? <img src={assetUrl(record.assetId)} alt="" loading="lazy" /> : <span>{st ? (st.status === 'face' ? '…' : st.status === 'failed' ? '⚠' : '·') : '＋'}</span>}
      </button>
    )
  }
  const faceRow = e => {
    const face = draft.faces[e] || {}
    return (
      <div className="fg-pm-face">
        <b>{emotionEntry(e, emotions).label}：他的这种情绪什么样</b>
        <input className="fg-input" value={face.desc || ''} placeholder="他的这种情绪什么样（中文一句）" onChange={ev => setFace(e, { desc: ev.target.value })} onKeyDown={ev => ev.stopPropagation()} />
        <input className="fg-input" value={face.tags || ''} placeholder="脸上的英文 tag（没写就用情绪库里的）" onChange={ev => setFace(e, { tags: ev.target.value })} onKeyDown={ev => ev.stopPropagation()} />
        <div className="fg-pm-level">
          <span className="fg-note">强弱</span>
          {FACE_LEVELS.map(l => <button key={l} type="button" className={`fg-btn is-mini${(face.level || 0) === l ? ' is-on' : ''}`} title={LEVEL_HINT[l]} onClick={() => setFace(e, { level: face.level === l ? undefined : l })}>{FACE_LEVEL_LABEL[l]}</button>)}
          <span className="fg-note">{face.level ? '' : `没标：按情绪默认的「${FACE_LEVEL_LABEL[emotionLevel(e, emotions)]}」。`}换脸时强弱定重绘强度（越强改得越多），「极」的在这个动作上整张画（设置 → 画风与配图里能调）</span>
        </div>
      </div>
    )
  }
  // 表里列：设计里有的情绪，加上这个人在人物志里列的那些（还没放进动作的可以在这里勾进去）
  const listed = new Set([...draft.poses.flatMap(p => p.emotions), ...personEmotions(person.name, emotions, { used, drawn: Object.keys(sprites).map(keyEmotion) }).map(x => x.id)])
  const rows = [...allEmotions(emotions).map(x => x.id).filter(e => listed.has(e)), ...[...listed].filter(e => !allEmotions(emotions).some(x => x.id === e))]
  const status = pending ? '正在存…' : saving === 'saved' ? '✓ 已自动保存' : saving ? `⚠ 没存上：${saving}` : ''
  return (
    <div className="fg-person-form fg-acting">
      <div className="fg-row">
        <span className="fg-note">{acting.by === 'user' ? '你改过的设计' : `表演设计师读到第 ${acting.turn != null ? acting.turn : '?'} 轮设计的`} · {draft.poses.length} 个动作{acting.height ? ` · 估的身高 ${acting.height} 厘米${person.height ? `（档案里写的 ${person.height} 优先）` : '（档案里能改）'}` : ''}</span>
        <span className="fg-spacer" />
        <button type="button" className={`fg-btn is-mini${form === 'more' ? ' is-on' : ''}`} title="已有的动作和表情不动，让设计师照你的要求再加几个动作" onClick={() => setForm(form === 'more' ? '' : 'more')}>让 AI 加动作</button>
        <button type="button" className={`fg-btn is-mini${form === 'full' ? ' is-on' : ''}`} onClick={() => setForm(form === 'full' ? '' : 'full')}>{designing ? '设计中…' : '重新设计'}</button>
        <button type="button" className="fg-btn is-mini" disabled={!reachable || pending || !drawn.length || busy === 'redraw'} title={pending ? '等修改存好' : ''} onClick={redraw}>按这套设计重画「{lookLabel(group.look)}」{drawn.length ? `（${drawn.length} 张）` : ''}</button>
        <button type="button" className="fg-btn is-mini is-primary" disabled={!reachable || pending || !missing.length || busy === 'fill'} title={pending ? '等修改存好' : '平时用到了才画；这里把勾上了还没画的组合全部画出来'} onClick={fillAll}>一键补足所有表情{missing.length ? `（${missing.length} 张）` : ''}</button>
      </div>
      {form && askBox(form)}
      {incoming && (
        <div className="fg-row fg-note">
          设计师刚改了这份设计，你正在改的没有冲掉（接着改会存成你的这版）。
          <button type="button" className="fg-btn is-mini" onClick={() => { const next = copy(acting); setDraft(next); sent.current = JSON.stringify(next); setIncoming(false) }}>换成设计师的新版</button>
        </div>
      )}
      <div className="fg-note">一个情绪可以放进好几个动作：剧场里身子不动只换脸，这句的情绪在当前动作里有就留在当前动作，没有才换到它的第一个动作；导演会在情绪转折的那句点名换动作。勾上的组合用到了才画，小图是「{lookLabel(group.look)}」这一身画好的；点情绪名改他的这种表情。表演笔记在「档案」里。</div>
      <div className="fg-acting-situ">
        <span className="fg-note">本性的动作跟着人走（全局角色带去别的世界）；处境的写着前提，剧情跨过前提时从那一句起收起，回到那种处境时放回。收起不删图，回忆、梦里照旧能用。{Object.keys(off).length ? `此刻收起了 ${Object.keys(off).length} 个。` : ''}</span>
        <span className="fg-spacer" />
        {unlabeled(acting) && <button type="button" className="fg-btn is-mini" disabled={designing || busy === 'label'} title="设计师读一遍资料和剧情，给每个动作标本性还是处境、写前提，表演笔记分成本性和这一局两条" onClick={labelAll}>让设计师标出本性和处境</button>}
        <button type="button" className="fg-btn is-mini" disabled={designing || busy === 'review'} title="设计师读到最新一轮，按他现在的处境复盘：前提不成立的处境动作收起，收起的动作里的情绪重新安家，需要时设计新动作，重写表演笔记·这一局" onClick={review}>{designing ? '设计中…' : '让设计师按现在的处境复盘'}</button>
      </div>
      <PoseMatrix poses={draft.poses} rows={rows} lib={emotions} onChange={setPoses} prefix="p" lockLast keepOne cell={cell} rowOpen={faceRow} extra={extra} off={off} />
      <div className="fg-row" style={{ justifyContent: 'flex-end' }}>
        <span className="fg-note">改了自动存，只影响之后画的；平静总在第一个动作的底图上（登场立绘就是它）。</span>
        {status && <span className="fg-note">{status}</span>}
      </div>
    </div>
  )
}

function PersonCard({ gameId, person, emotions, poseGroups = [], cast, voice, used, onBench, situNeeds = true }) {
  const [busy, run] = useBusy()
  const groups = React.useMemo(() => lookGroups(person), [person])
  const [groupKey, setGroupKey] = React.useState('')
  const [emotion, setEmotion] = React.useState('')
  const [fold, setFold] = React.useState('')
  const [manage, setManage] = React.useState(false) // 管理立绘：格子变成多选，批量删除
  const [picked, setPicked] = React.useState(() => new Set())
  const [clearing, setClearing] = React.useState(false) // 清空立绘：确认那一行开着
  const [dropActing, setDropActing] = React.useState(true)
  const group = groups.find(g => g.key === groupKey) || groups[0]
  const turn = group.current ? null : findLookTurn(person.timeline, group.key)
  const now = lookAt(person.timeline, Infinity)
  const main = pickSprite(person.sprites, now, 'neutral')
  // 情绪格子：内置的、这个人用过或画过的新情绪（别人的新情绪不挂过来）；这套样子已经有图的排前面。
  // 分动作的人每格是这个情绪在它主动作上的那张（别的动作上的在「动作与表情」的表里）
  const drawnEmotions = Object.keys(person.sprites || {}).map(keyEmotion)
  const sheet = sheetOf(person, poseGroups)
  const homeKey = e => slotKey(person.sprites || {}, group.key, sheet, sheet ? (homePose(sheet, e, emotions) || {}).id : '', e, emotions)
  const tiles = personEmotions(person.name, emotions, { used, drawn: drawnEmotions }).map(e => { const key = homeKey(e.id); return { ...e, key, record: (person.sprites || {})[key], st: (person.spriteStatus || {})[key] } })
  tiles.sort((a, b) => Number(Boolean(b.record && b.record.assetId)) - Number(Boolean(a.record && a.record.assetId)))
  const drawn = tiles.filter(t => t.record && t.record.assetId).length
  const deletable = tiles.filter(t => t.record)
  const pick = key => setPicked(p => { const n = new Set(p); if (n.has(key)) n.delete(key); else n.add(key); return n })
  const endManage = () => { setManage(false); setPicked(new Set()) }
  const removePicked = async () => {
    const keys = [...picked]
    if (!keys.length || !(await confirmBox(`删除 ${person.name} 的 ${keys.length} 张立绘？${person.global ? '这是全局角色，所有对局里都会少这几张。' : ''}删掉后可以再画。`, { ok: '删除', danger: true }))) return
    run('del', () => api.cast(gameId, 'sprite-delete', { name: person.name, keys }).then(endManage), `已删除 ${keys.length} 张`)
  }
  // 清空立绘：这个人每一身、每种情绪的立绘全删，测试时反复重画用；默认连动作与表情设计一起清（你改过的设计默认留着）
  const records = Object.values(person.sprites || {}).filter(Boolean)
  const painted = records.filter(r => r.assetId).length
  const openClear = () => { endManage(); setEmotion(''); setDropActing(!(person.acting && person.acting.by === 'user')); setClearing(true) }
  const clearAll = () => {
    const acting = Boolean(person.acting) && dropActing
    run('clear', () => api.cast(gameId, 'sprite-clear', { name: person.name, acting }).then(() => setClearing(false)), acting ? '已清空立绘和动作与表情设计' : '已清空立绘')
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
          <button type="button" className={`fg-btn${fold === 'acting' ? ' is-on' : ''}`} onClick={() => setFold(fold === 'acting' ? '' : 'acting')}>动作与表情 · {person.actingBusy ? '设计中…' : person.acting ? `${person.acting.poses.length} 个动作` : '还没设计'}</button>
        </div>
        {fold === 'profile' && <ProfileEditor gameId={gameId} person={person} cast={cast} group={group} turn={turn} />}
        {fold === 'wardrobe' && <WardrobeEditor gameId={gameId} person={person} />}
        {fold === 'acting' && <ActingEditor gameId={gameId} person={person} emotions={emotions} group={group} turn={turn} used={used} situNeeds={situNeeds} onOpen={token => { setManage(false); setEmotion(token) }} />}
        <div className="fg-looks">
          {groups.map(g => (
            <button key={g.key} type="button" className={`fg-look${g.key === group.key ? ' is-on' : ''}`} onClick={() => { setGroupKey(g.key); setEmotion(''); setPicked(new Set()) }}>
              {g.era === 'earlier' ? <i>变化之前</i> : g.era ? <i>{MODE_LABEL[g.era] || '回忆'}里</i> : null}{lookLabel(g.look)}{g.current ? <i>现在</i> : null}
            </button>
          ))}
          <span className="fg-note">已画 {drawn} 种情绪</span>
          <span className="fg-spacer" />
          {!manage && !clearing && <button type="button" className="fg-btn is-mini" disabled={!deletable.length} onClick={() => { setManage(true); setEmotion('') }}>管理立绘</button>}
          {!manage && !clearing && <button type="button" className="fg-btn is-mini fg-danger" disabled={!records.length && !person.acting} title="删掉这个人每一身、每种情绪的立绘，从头再画" onClick={openClear}>清空立绘</button>}
        </div>
        {clearing && (
          <div className="fg-row fg-manage">
            <span className="fg-note">清空 {person.name} 每一身、每种情绪的立绘（已画好 {painted} 张），连提示词、眨眼口型一起删{person.global ? '；这是全局角色，所有对局里都会清掉' : ''}；正在画的会停下。</span>
            {person.acting && <label className="fg-row fg-note" style={{ gap: '.3em' }}><input type="checkbox" checked={dropActing} onChange={e => setDropActing(e.target.checked)} />动作与表情设计也清掉，下次画先重新设计{person.acting.by === 'user' ? '（这份你改过）' : ''}</label>}
            <span className="fg-spacer" />
            <button type="button" className="fg-btn is-mini fg-danger" disabled={busy === 'clear'} onClick={clearAll}>确认清空</button>
            <button type="button" className="fg-btn is-mini" onClick={() => setClearing(false)}>取消</button>
          </div>
        )}
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
            <button key={t.id} type="button" title={t.st && t.st.error ? t.st.error : t.label} disabled={manage && !t.record}
              className={`fg-emo${t.st && ['writing', 'queued', 'running'].includes(t.st.status) ? ' is-busy' : ''}${!manage && emotion === t.id ? ' is-on' : ''}${manage && picked.has(t.key) ? ' is-picked' : ''}${t.builtin ? '' : ' is-custom'}`}
              onClick={() => (manage ? pick(t.key) : setEmotion(emotion === t.id ? '' : t.id))}>
              {t.record && t.record.assetId && <img src={assetUrl(t.record.assetId)} alt="" loading="lazy" />}
              <span>{t.label}{t.record && t.record.face ? ' · 脸' : ''}{t.record && t.record.aa ? ' · 动' : ''}{t.st && t.st.status === 'failed' ? ' ⚠' : t.st && t.st.status === 'face' ? ' …' : ''}</span>
            </button>
          ))}
        </div>
        {emotion && !manage && <VariantEditor key={group.key + emotion} gameId={gameId} person={person} group={group} emotion={emotion} emotions={emotions} sheet={sheet} turn={turn} onClose={() => setEmotion('')} />}
        <div className="fg-row">
          <button type="button" className="fg-btn" disabled={busy === 'fill'} onClick={() => run('fill', () => api.cast(gameId, 'fill', { name: person.name }).then(r => toast(fillText(r))))}>补齐剧情里用到的差分</button>
          <button type="button" className="fg-btn" disabled={!drawn && !Object.values(person.sprites || {}).some(r => r && r.assetId)} onClick={onBench}>逆转式工作台（眨眼、口型）</button>
          {!person.global && <button type="button" className="fg-btn" onClick={() => run('g', () => api.cast(gameId, 'promote', { name: person.name }), '已提升为全局角色：所有对局共用，AI 不再改它的固定外貌')}>提升为全局</button>}
          {person.global && <button type="button" className="fg-btn" onClick={() => run('l', () => api.cast(gameId, 'copy-local', { name: person.name }), '已复制到本局，可单独修改')}>复制到本局</button>}
          {person.global && <button type="button" className="fg-btn" onClick={async () => { if (await confirmBox('从全局库移除？各对局里的副本不受影响。', { ok: '移出全局' })) run('u', () => api.cast(gameId, 'unglobal', { name: person.name }), '已移出全局库') }}>移出全局</button>}
          {!person.global && <button type="button" className="fg-btn" onClick={async () => { if (await confirmBox(`删除 ${person.name} 的本局档案和立绘记录？`, { ok: '删除', danger: true })) run('d', () => api.cast(gameId, 'delete', { name: person.name }), '已删除') }}>删除</button>}
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
  const emotions = (view && view.emotions) || []
  const cfg = useConfig()
  const voices = castVoices(cast, cfg ? cfg.config.ui : null, libraryBlips(useSoundlib()))
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
      {tab === 'people' && !benchPerson && cast.map(p => <PersonCard key={p.name} gameId={gameId} person={p} emotions={emotions} poseGroups={view.poseGroups || []} situNeeds={view.situNeeds !== false} cast={cast} voice={voices.get(p.name)} used={used.get(p.name) || []} onBench={() => setBench(p.name)} />)}
      {tab === 'people' && !cast.length && <div className="fg-note">有名字的角色第一次出场时，导演会自动给他建档：固定外貌、身上的衣服。之后插画里写 @名字 都会换成这份档案，长相不再漂移；立绘按「服装 × 长期状态 × 情绪」各画一套，同一个种子。</div>}
      {tab === 'emotions' && <EmotionLibrary emotions={emotions} view={view} gameId={gameId} />}
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
function Toggle({ value, onChange, disabled = false }) {
  return <button type="button" className={`fg-switch${value ? ' is-on' : ''}`} aria-pressed={Boolean(value)} disabled={disabled} onClick={() => onChange(!value)} />
}
/** 文本框：失焦或回车时才提交。list 是候选列表（datalist）的编号。 */
function Text({ value, onCommit, type = 'text', placeholder, style, list }) {
  const [v, setV] = React.useState(value ?? '')
  React.useEffect(() => { setV(value ?? '') }, [value])
  const commit = () => { if (String(v) !== String(value ?? '')) onCommit(type === 'number' ? Number(v) : v) }
  return <input className="fg-input" type={type} value={v} placeholder={placeholder} style={style} list={list} onChange={e => setV(e.target.value)} onBlur={commit} onKeyDown={e => { e.stopPropagation(); if (e.key === 'Enter') commit() }} />
}
/**
 * 上限：一个数，或者勾上「不限」（存 null，后台就不设上限）。从不限改回限制时先填 fallback（以前写死的那个数）。
 * free 是勾选框的字：大多是「不限」，并发、最大输出是「自动」。
 */
function Limit({ value, onCommit, fallback, min = 0, unit, free = '不限', width = '6cqw' }) {
  const open = value === null || value === undefined
  const shown = open ? '' : String(value)
  const [v, setV] = React.useState(shown)
  React.useEffect(() => { setV(shown) }, [shown])
  const commit = () => {
    const n = Math.max(min, Math.trunc(Number(v)))
    if (String(v).trim() === '' || !Number.isFinite(n)) { setV(shown); return }
    if (n !== value) onCommit(n)
    else setV(shown)
  }
  return (
    <span className="fg-row" style={{ gap: '.5em' }}>
      {!open && <input className="fg-input" type="number" min={min} style={{ width }} value={v} onChange={e => setV(e.target.value)} onBlur={commit} onKeyDown={e => { e.stopPropagation(); if (e.key === 'Enter') commit() }} />}
      {!open && unit && <span className="fg-note">{unit}</span>}
      <label className="fg-row fg-note" style={{ gap: '.3em' }}><input type="checkbox" checked={open} onChange={e => onCommit(e.target.checked ? null : fallback)} />{free}</label>
    </span>
  )
}
/** 下拉框：options 是 [值, 文字]；也可以夹着 { group: 组名, options: [...] } 分组（空组不显示）。 */
function Select({ value, options, onChange, style }) {
  const one = ([v, l]) => <option key={v} value={v}>{l}</option>
  return (
    <select className="fg-select" value={value} style={style} onChange={e => onChange(e.target.value)}>
      {options.map(o => (Array.isArray(o) ? one(o) : o.options.length ? <optgroup key={o.group} label={o.group}>{o.options.map(one)}</optgroup> : null))}
    </select>
  )
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
  const remove = async () => {
    if (styles.length <= 1 || !(await confirmBox(`删除画风「${st.name}」？`, { ok: '删除', danger: true }))) return
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

/** 导演的模型下拉里「自定义接口」那一项（宿主的模型 id 不会长这样）。 */
const CUSTOM_LLM = '__flowgal_custom__'

function DirectorSection({ data, onDirectorLog, onTab = null }) {
  const cfg = data.config
  const d = cfg.director
  const custom = d.source === 'custom'
  const [llm, setLlm] = React.useState({ providers: [], models: [] })
  React.useEffect(() => { api.llm(d.provider).then(setLlm).catch(() => {}) }, [d.provider])
  const p = patch => patchConfig({ director: patch }).catch(e => toast(e.message, 'error'))
  // 换到自定义接口时宿主那边选的留着（模型名先带过去，同一个中转多半一样），换回来还是原来那个
  const pickSource = v => (v === CUSTOM_LLM ? p({ source: 'custom' }) : p({ source: '', provider: v, model: '' }))
  return (
    <>
      <div className="fg-section">导演（后台整理）{onDirectorLog && <button type="button" className="fg-btn" onClick={onDirectorLog}>查看导演日志</button>}</div>
      <Field label="自动整理" hint="每轮正文写完后，后台模型把它整理成场景：说话人、表情、站位、镜头、天气、选项、插画分镜。正文一字不改。"><Toggle value={d.auto} onChange={v => p({ auto: v })} /></Field>
      <Field label="模型" hint={`${hostName() === 'st' ? '默认跟着酒馆当前的连接；也可以选一套连接配置（在酒馆「API 连接」里存的）专门给导演用，整理用便宜的小模型就够。' : '留空跟随 Tavern 的后台模型。整理用的是便宜的小模型就够。'}也可以自己接一个 OpenAI 兼容接口（填 /chat/completions 前面那段地址，DeepSeek、OpenRouter、各家中转、本机的 LM Studio / Ollama 都行）。立绘设计师、表演设计师也用这个模型。`}>
        <div className="fg-row">
          <Select value={custom ? CUSTOM_LLM : d.provider} onChange={pickSource} options={[['', hostName() === 'st' ? '跟着酒馆当前的连接' : '跟随 Tavern'], ...llm.providers.map(x => [x.id, x.name]), [CUSTOM_LLM, '自定义接口（OpenAI 兼容）']]} />
          {!custom && d.provider && (llm.models.length
            ? <Select value={d.model} onChange={v => p({ model: v })} options={[['', '（请选择）'], ...llm.models.map(m => [m.id, m.name])]} />
            : <Text value={d.model} placeholder="模型 ID" onCommit={v => p({ model: v })} />)}
        </div>
      </Field>
      {custom && <CustomModelFields data={data} own={d} which="director" secret="directorllm" window="这个模型一次能读多少 token。剧情太长时按它从最早的删起，最大输出也按它往下收。接口报出更小的输出上限时自动按它重试。" onPatch={p} />}
      <StreamField data={data} own={d} custom={custom} also="插画分镜师、听音师选「跟导演一样」时也照这个。" onPatch={p} />
      <Field label="最大输出" hint="自动：模型报了输出上限就用它报的，没报按 128000（当前主流大模型的输出上限）。模型窗口装不下时自动往下收；模型拒绝这个值时按它报的上限重试一次。导演日志里能看到实际用了多少。导演、立绘设计师、插画分镜师都用这一个。"><Limit value={cfg.director.maxTokens} fallback={128000} min={1000} width="9cqw" free="自动" onCommit={v => p({ maxTokens: v })} /></Field>
      <Field label="温度"><Text type="number" style={{ width: '7cqw' }} value={cfg.director.temperature} onCommit={v => p({ temperature: v })} /></Field>
      <Field label="资料长度" hint="给导演看多少人物卡 / 世界书（字），用来判断人物外貌。默认不限，整份给；超出模型窗口时自动缩短。"><Limit value={cfg.director.contextChars} fallback={1000000} width="9cqw" unit="字" onCommit={v => p({ contextChars: v })} /></Field>
      <OwnModelFields data={data} providers={llm.providers} which="cg" />
      <OwnModelFields data={data} providers={llm.providers} which="listen" />
      <div className="fg-section">每轮上限</div>
      <div className="fg-note">导演一轮里最多写几次。默认都不限：提示词里「只给真正需要的地方」「平常的句子不写」那几句一直在，靠它让导演自己收着用。限了数的，提示词里会写上这个数，导演写多了也只按正文顺序留前面那么多。</div>
      <div className="fg-limits">
        {DIRECTOR_LIMITS.map(l => (
          <Field key={l.key} label={l.label}><Limit value={cfg.director.limits?.[l.key] ?? null} fallback={l.was} unit={l.unit} onCommit={v => p({ limits: { [l.key]: v } })} /></Field>
        ))}
      </div>
      <div className="fg-section">提示词{onTab && <button type="button" className="fg-btn" onClick={() => onTab('prompts')}>打开提示词页</button>}</div>
      <div className="fg-note">导演、听音师、情绪归类、表演设计师、立绘设计师、插画分镜师的每一段提示词，连出图固定词和过滤规则，都在「提示词」页全文显示、能改、能单段恢复默认，还能照这一局预览完整的提示词。</div>
      <Field label="共用开头" hint="导演和几位设计师的系统提示词都换成同一句，各自的规矩放进用户消息的【你的工作】一节，资料和剧情放在最前面一字不差：会自动缓存的模型接口（DeepSeek 等）第二次读就便宜、快。关掉就照以前，规矩放在系统提示词里。"><Toggle value={cfg.director.sharedPrefix} onChange={v => p({ sharedPrefix: v })} /></Field>
      <Field label="补设计合进写词" hint="已经设计过的人要画还没设计的情绪（或重新设计表情）时，补设计和写立绘提示词一次请求做完，资料和剧情只读一遍。关掉就先单独补设计、再写词。第一次整套设计一直是单独一次。"><Toggle value={cfg.director.combineDesign} onChange={v => p({ combineDesign: v })} /></Field>
      <Field label="新情绪先归类" hint="导演造了情绪库里没有、也不是哪种近义词的情绪词时，先让导演用的模型判断：画出来跟库里某一种几乎一样的（「强忍泪水」和委屈），归进那一种，记成它的别名，之后写到它就用那张，不多画一张；确实不一样的才新开一种，只挂在用过它的角色下面。归到哪一种在人物志 → 情绪库最下面「并掉的」里看得到，归错了能拆出来。这一步的提示词在「提示词」页 → 情绪归类，跑的过程记在导演日志里。关掉就像以前，每个新词各成一种。"><Toggle value={cfg.director.judgeEmotions} onChange={v => p({ judgeEmotions: v })} /></Field>
      <div className="fg-section">动作跟着剧情和世界线变</div>
      <div className="fg-note">表演设计师把每个动作分成「本性」（从性格、习惯来，换个世界也还是他）和「处境」（从一段关系、一件信物、一道伤来，写着前提）。剧情跨过前提时处境动作收起，回到那种处境时放回；收起不删图，回忆、梦里照旧能用。人物志 → 动作与表情里能看、能改、能撤回。</div>
      <Field label="导演按剧情收起处境动作" hint="导演读剧情时看着每个处境动作的前提：跨过了（找到了要找的人、伤好了）就从那一句起收起，又回到那种处境时放回。关掉就只看下面的长期状态和你手动收起的。"><Toggle value={cfg.director.situPoses} onChange={v => p({ situPoses: v })} /></Field>
      <Field label="靠的长期状态没了自动收起" hint="动作要靠身上看得见的东西才画得出来（攥着项链、护着缠绷带的手腕）：长期状态里那一项没了就收起，回来了就放回，不用问模型。关掉就不看长期状态。"><Toggle value={cfg.director.situNeeds} onChange={v => p({ situNeeds: v })} /></Field>
      <Field label="收起后设计师复盘" hint="有动作收起了（或者导演说这个人的处境转了）：表演设计师读到这一轮的剧情，把收起的动作里的情绪放进现在合适的动作，重写表演笔记·这一局。这一轮的立绘等它复盘完再排。"><Toggle value={cfg.director.situReview} onChange={v => p({ situReview: v })} /></Field>
      <Field label="复盘时设计新动作" hint="复盘时新的处境里他有新的样子（团聚后坠子从不安时的支撑变成纪念），设计师给他设计新动作，从变化那一句起才有，用到了才画。关掉就只在已有的动作里重新安家。"><Toggle value={cfg.director.situNewPoses} onChange={v => p({ situNewPoses: v })} /></Field>
      <Field label="全局角色到新世界只带本性" hint="提升为全局时只带本性动作和本性的那条表演笔记；在新的一局第一次画他时，设计师读这个世界的人物卡、世界书和开场，设计这个世界的处境动作。关掉就照以前，整套设计带到每个世界。"><Toggle value={cfg.director.situWorld} onChange={v => p({ situWorld: v })} /></Field>
      <Field label="老设计自动标本性和处境" hint="以前设计的、还没分本性和处境的：这个人下次登场时让设计师标上（每局一次），表演笔记分成本性和这一局两条。人物志里也能手动点。"><Toggle value={cfg.director.situLabel} onChange={v => p({ situLabel: v })} /></Field>
    </>
  )
}

/**
 * 流式开关。自定义接口、酒馆的连接配置照它走；DSH 的模型服务只走流式（它的接口没有不流式这一项），开关灰掉，说明怎么换。
 * 默认开着（跟以前一样）。
 */
function StreamField({ data, own, custom, also = '', onPatch }) {
  const works = custom || data.hostStreamSwitch
  const hint = works
    ? `开着：模型边写边传回来，导演日志里能看实时输出。关掉：等模型整段写完一次拿回，日志里写完才看得到；有的中转流式不稳（吞字、半路断、只回几个字），关掉试试。默认开着。${also}`
    : `DSH 的模型服务只走流式，这里关不掉。要不流式：上面选「自定义接口（OpenAI 兼容）」，把同一个中转的地址、Key 和模型填进来。${also}`
  return (
    <Field label="流式输出" hint={hint}>
      <div className="fg-row">
        <Toggle value={works ? own.stream !== false : true} disabled={!works} onChange={v => onPatch({ stream: v })} />
        <span className="fg-note">{!works ? 'DSH 的模型只走流式' : own.stream === false ? '不流式：整段写完一次拿回' : '流式：边写边传'}</span>
      </div>
    </Field>
  )
}

/**
 * 自己接的 OpenAI 兼容接口：地址、Key（存在宿主）、模型（从接口读列表，也能手填）、上下文窗口。
 * which 是读模型列表时说是谁的（director / cg / listen），secret 是 Key 存在哪。
 */
function CustomModelFields({ data, own, which, secret, window, onPatch }) {
  const [busy, run] = useBusy()
  const [list, setList] = React.useState(null)
  const loadList = () => run('m', async () => setList(await api.ownModels(which)))
  // 地址或 Key 换了就重新读模型列表
  React.useEffect(() => { setList(null); if (own.baseURL) loadList() }, [own.baseURL, data.keys[secret]])
  return (
    <>
      <Field label="接口地址"><Text value={own.baseURL} placeholder="https://api.deepseek.com/v1" style={{ flex: 1, width: '100%' }} onCommit={v => onPatch({ baseURL: String(v).trim() })} /></Field>
      <Field label="Key" hint={`存在宿主（${data.secretStorage || '插件目录'}），不会发到浏览器。本机的接口不要 Key 就空着。`}><KeyInput backend={secret} has={data.keys[secret]} /></Field>
      <Field label="模型" hint={list ? list.note : own.baseURL ? '正在读取模型列表…' : '先填接口地址'}>
        <div className="fg-row">
          <ModelField value={own.model} options={(list && list.models) || []} placeholder="模型 ID" onCommit={v => onPatch({ model: v, ...((list?.models || []).find(m => m.id === v)?.window ? { contextWindow: list.models.find(m => m.id === v).window } : {}) })} />
          <button type="button" className="fg-btn" disabled={busy === 'm' || !own.baseURL} onClick={loadList}>{busy === 'm' ? '读取中…' : '刷新列表'}</button>
        </div>
      </Field>
      <Field label="上下文窗口" hint={window}><Text type="number" style={{ width: '9cqw' }} value={own.contextWindow} onCommit={v => onPatch({ contextWindow: v })} /></Field>
    </>
  )
}

/** 插画分镜师（cg）、听音师（listen）各自能单独用的模型：跟导演一样 / 宿主里另选一个 / 自己接一个 OpenAI 兼容接口（Key 存在宿主）。 */
const OWN_MODEL = {
  cg: { field: 'cgLlm', secret: 'cgllm', window: '这个模型一次能读多少 token。剧情太长时按它从最早的删起，最大输出也按它往下收；最大输出、温度、资料长度跟导演用同一套设置。接口报出更小的输出上限时自动按它重试。', label: '插画分镜师的模型', hint: '写 CG 提示词的模型可以和导演分开。有的模型不肯把露骨的画面写具体，就给分镜师单独换一个；自定义接口填 /chat/completions 前面那段地址，DeepSeek、OpenRouter、各家中转、本机的 LM Studio / Ollama 都行。' },
  listen: { field: 'listenLlm', secret: 'listenllm', window: '这个模型一次能读多少 token，最大输出按它往下收（听音师最多要 16000）；温度跟导演用同一个。接口报出更小的输出上限时自动按它重试。', label: '听音师的模型', hint: '音效库或曲库比每轮给导演看的候选多时（设置 → 音效库、配乐 →「先听一遍」），导演之前先让听音师读一遍正文、列出听得见的声音和该放什么样的配乐，候选照它列的找。活很简单，可以换个便宜、快的模型，省钱也少等一会儿；自定义接口同上。' },
}
function OwnModelFields({ data, providers, which }) {
  const meta = OWN_MODEL[which]
  const own = data.config.director[meta.field]
  const [hostModels, setHostModels] = React.useState([])
  const p = patch => patchConfig({ director: { [meta.field]: patch } }).catch(e => toast(e.message, 'error'))
  React.useEffect(() => {
    if (own.source !== 'host' || !own.provider) return setHostModels([])
    api.llm(own.provider).then(r => setHostModels(r.models || [])).catch(() => setHostModels([]))
  }, [own.source, own.provider])
  const sources = [['', '跟导演一样'], ['host', hostName() === 'st' ? '另选一套酒馆连接配置' : '另选一个 Tavern 里的模型'], ['custom', '自定义接口（OpenAI 兼容）']]
  return (
    <>
      <Field label={meta.label} hint={meta.hint}>
        <div className="fg-row">
          <Select value={own.source} style={INLINE} onChange={v => p({ source: v, provider: '', model: '' })} options={sources} />
          {own.source === 'host' && <Select value={own.provider} style={INLINE} onChange={v => p({ provider: v, model: '' })} options={[['', '（选一个）'], ...providers.map(x => [x.id, x.name])]} />}
          {own.source === 'host' && own.provider && (hostModels.length
            ? <Select value={own.model} style={INLINE} onChange={v => p({ model: v })} options={[['', '（请选择）'], ...hostModels.map(m => [m.id, m.name])]} />
            : <Text value={own.model} placeholder="模型 ID" onCommit={v => p({ model: v })} />)}
        </div>
      </Field>
      {own.source === 'custom' && <CustomModelFields data={data} own={own} which={which} secret={meta.secret} window={meta.window} onPatch={p} />}
      {own.source && <StreamField data={data} own={own} custom={own.source === 'custom'} onPatch={p} />}
    </>
  )
}

/** 动作组：每个内置情绪归哪组。改回默认组时写 null（设置里删掉这条改动）。 */
/**
 * 设置里的通用动作组：没有专属设计的人（没开立绘设计师、或者还没设计出来）用这一张「动作 × 情绪」的表。
 * 跟人物志里的一样能加删动作、一个情绪勾进好几组、设底图（PoseMatrix.jsx）；全删了就不分动作，每个情绪整张画。
 * 改了直接存（patch 整张表）；恢复默认连老设置里挪过的情绪（images.poses）一起清掉。
 */
function PoseGroups({ cfg, onPatch }) {
  const lib = shownLib()
  const groups = cfg.images.poseGroups || []
  const [draft, setDraft] = React.useState(groups)
  const text = JSON.stringify(groups)
  const edited = Object.keys(cfg.images.poses || {}).length > 0 || text !== JSON.stringify(cleanPoseGroups(null))
  React.useEffect(() => { setDraft(groups) }, [text])
  // 打字时先改在表上，停手 0.8 秒再存（不然每个字都往回写一次设置）
  React.useEffect(() => {
    if (JSON.stringify(draft) === text) return undefined
    const timer = setTimeout(() => onPatch({ poseGroups: draft }), 800)
    return () => clearTimeout(timer)
  }, [draft])
  const listed = new Set([...draft.flatMap(g => g.emotions), ...allEmotions(lib).filter(e => !e.off).map(e => e.id)])
  const rows = [...allEmotions(lib).map(e => e.id).filter(e => listed.has(e)), ...[...listed].filter(e => !allEmotions(lib).some(x => x.id === e))]
  const reset = async () => {
    if (!(await confirmBox('通用动作组恢复成默认的四组（日常、抱臂、手在胸前、托腮）？你加的组、改的分法都会去掉。', { ok: '恢复默认' }))) return
    onPatch({ poseGroups: null, poses: Object.fromEntries(Object.keys(cfg.images.poses || {}).map(k => [k, null])) })
  }
  return (
    <Field label="通用动作组">
      <div className="fg-pose-groups">
        <div className="fg-note">没开立绘设计师、或者还没给某个人设计出专属动作时用这张表：每组整张画一张底图（★ 那个情绪），同组其余情绪在它上面只换脸。一个情绪可以勾进好几组：剧场里身子不动只换脸，这句的情绪在当前这组里有就不换组。不在任何一组里的情绪跟着替身走。组能加能删，全删了就不分组、每个情绪整张画。改了只影响之后画的。</div>
        <PoseMatrix poses={draft} rows={rows} lib={lib} onChange={next => setDraft(settleNeutral(next.map(g => ({ ...g, emotions: [...g.emotions] }))))} prefix="g" word="组" newLabel="新动作组" />
        <div className="fg-row">
          {!draft.length && <span className="fg-note">一组都没有：每个情绪整张画，不分动作</span>}
          <span className="fg-spacer" />
          <button type="button" className="fg-btn is-mini" disabled={!edited} onClick={reset}>恢复默认分组</button>
        </div>
      </div>
    </Field>
  )
}

/** 滑块：拖的时候只改显示，松手（或键盘改完）才存。 */
function Dial({ value, min, max, step, onCommit, digits = 2, label = '' }) {
  const [v, setV] = React.useState(value)
  React.useEffect(() => { setV(value) }, [value])
  const commit = () => { if (Number(v) !== Number(value)) onCommit(Number(v)) }
  return (
    <span className="fg-row fg-dial" style={{ gap: '.6em' }}>
      <input type="range" min={min} max={max} step={step} value={v} aria-label={label} onChange={e => setV(Number(e.target.value))} onPointerUp={commit} onKeyUp={commit} onBlur={commit} />
      <span className="fg-note">{Number(v).toFixed(digits)}</span>
    </span>
  )
}

const LEVEL_HINT = { 1: '微：微笑、害羞这类小变化', 2: '中：开心、难过、担心', 3: '强：生气、惊讶', 4: '极：大笑、大哭、惊恐' }

/** 换脸怎么画（lib/face-paint.js）：放大重画、软边遮罩、每档强弱的重绘强度、最激烈的整张画、色调对齐、画完比对、角色参考。 */
function FaceSettings({ cfg, onPatch }) {
  const f = cfg.images.face || DEFAULT_FACE
  const set = patch => onPatch({ face: patch })
  const refOk = naiReferenceOk(cfg.novelai && cfg.novelai.model)
  const edited = JSON.stringify(f) !== JSON.stringify(DEFAULT_FACE)
  const reset = async () => { if (await confirmBox('换脸的这些设置都回到默认？', { ok: '恢复默认' })) set(JSON.parse(JSON.stringify(DEFAULT_FACE))) }
  const [lo, hi] = FACE_LIMITS.strength
  return (
    <>
      <Field label="放大重画" hint={`照 SD 里 ADetailer 的做法：把头那一块（脸框长边的 ${f.cropScale} 倍，带上头发和脸的轮廓）裁出来放大到 ${f.cropSize}×${f.cropSize} 再重画，画完缩回去贴上。脸在整张立绘里只有一两百像素见方，放大了模型才有足够的像素照底图的画法画眼睛。NovelAI Opus 会员 1024×1024 以内不花 Anlas，再大要扣。关掉就像以前一样整张图上原尺寸重画。`}>
        <div className="fg-row">
          <Toggle value={f.crop} onChange={v => set({ crop: v })} />
          {f.crop && <><span className="fg-note">裁脸框的</span><Dial value={f.cropScale} min={FACE_LIMITS.cropScale[0]} max={FACE_LIMITS.cropScale[1]} step={0.1} digits={1} label="裁多大" onCommit={v => set({ cropScale: v })} /><span className="fg-note">倍，放大到</span>
            <Select value={String(f.cropSize)} options={[512, 640, 768, 896, 1024, 1152, 1280, 1408, 1536].map(n => [String(n), `${n}×${n}${n > 1024 ? '（扣 Anlas）' : ''}`])} onChange={v => set({ cropSize: Number(v) })} style={INLINE} /></>}
        </div>
      </Field>
      <Field label="软边遮罩" hint="重画的范围是围着眉眼口和两颊的圆角，往外一圈慢慢过渡到底图，不再是看得出框边的硬方框，脸边的头发尽量留原图。宽度是脸框半边长的几成：宽一点接缝更看不出，窄一点头发动得更少。关掉是以前的硬方框（框边 8 像素羽化）。">
        <div className="fg-row"><Toggle value={f.soft} onChange={v => set({ soft: v })} />{f.soft && <><span className="fg-note">过渡宽度</span><Dial value={f.feather} min={FACE_LIMITS.feather[0]} max={FACE_LIMITS.feather[1]} step={0.05} label="过渡宽度" onCommit={v => set({ feather: v })} /></>}</div>
      </Field>
      <Field label="重绘强度" hint="按这个人这种情绪的强弱定（表演设计师给每种情绪标微 / 中 / 强 / 极，人物志「动作与表情」里点情绪名能改）。低的留住底图原来的线条、颜色和光影，只动得了眉眼嘴；高的改得动大表情，但越高越可能跑出底图的画风。人物志里点开一张换脸的差分还能单独定这张的强度。">
        <div className="fg-face-levels">
          {FACE_LEVELS.map(l => (
            <label key={l} className="fg-row" title={LEVEL_HINT[l]}>
              <b>{FACE_LEVEL_LABEL[l]}</b>
              <Dial value={f.strength[l]} min={lo} max={hi} step={0.01} label={`${FACE_LEVEL_LABEL[l]}的重绘强度`} onCommit={v => set({ strength: { [l]: v } })} />
              {l === 4 && f.wholePeak && <span className="fg-note">（开着「最激烈的整张画」时不用）</span>}
            </label>
          ))}
        </div>
      </Field>
      <Field label="最激烈的整张画" hint="强弱是「极」的情绪（大笑、大哭、惊恐这类五官都在用力的）不换脸，在同一个动作上、用同一个种子整张画：脸由主模型画，画风跟底图自然一致，身子会跟着情绪动一点。"><Toggle value={f.wholePeak} onChange={v => set({ wholePeak: v })} /></Field>
      <Field label="压住原来的表情" hint={`换脸是照着底图描的：强度不到 1 时原来的眉眼还在，模型往往只在上面添几滴泪、一点红晕。打开时，底图原来的表情里这张没有的（情绪词、眉、眼；嘴和视线只在这张写了时才压；泪、红晕、汗这张也有就不压）写进这张的负面，比如「坚定」换「难过」时负面加上 determined, serious, slightly furrowed brow, calm eyes。表情词加重：这张的表情词写成「${f.emphasis}::sad::」，1 不加重，越高越听表情词（太高会用力过头）。人物志里点开一张换脸的差分，「这张实际发出去的提示词」里能看到。`}>
        <div className="fg-row">
          <Toggle value={f.oldNegative} onChange={v => set({ oldNegative: v })} /><span className="fg-note">原来的表情写进负面</span>
          <span className="fg-note">表情词加重</span><Dial value={f.emphasis} min={FACE_LIMITS.emphasis[0]} max={FACE_LIMITS.emphasis[1]} step={0.05} label="表情词加重" onCommit={v => set({ emphasis: v })} />
        </div>
      </Field>
      <Field label="色调对齐底图" hint="重画的脸整体偏亮、偏暗、偏色时，按底图的肤色拉回来再贴：每个颜色通道取脸上「底图减重画」的中位数，整块加上它（最多拉 40 级）。中位数跟着大片皮肤走，所以红晕、泪、眉眼口这些小块的变化不会被抹掉。关掉就照重画的原样贴。"><Toggle value={f.tone} onChange={v => set({ tone: v })} /></Field>
      <Field label="瞳色对齐底图" hint="提示词里只有「blue eyes」这种粗词，每次重画模型都自己挑一种蓝，渐变和高光也重画一遍，换完的脸眼睛颜色常跟底图对不上。打开时，在底图和重画的脸上各找出虹膜（眼睛里有彩度、不是皮肤也不是眼白的那一团；提示词写了瞳色就只在那个色相附近找，压在眼睛上的头发不算），把底图虹膜从上到下分三层量好亮度、彩度、色相，重画的虹膜每层照着拉过去：只换颜色，眼形、高光、瞳孔大小这些表情是重画自己的。两只眼分开量，异色瞳也对得上；闭着、被头发挡住、灰黑色的眼睛不动。不出图、不花 Anlas。"><Toggle value={f.eyeColor} onChange={v => set({ eyeColor: v })} /></Field>
      <Field label="不同立绘瞳色统一" hint="别的动作、别的衣服、整张画的「极」各自是整张画的，眼睛颜色也会各画各的。打开时，每个角色最早画的那张（量好脸框的整张立绘；闭着眼、认不出虹膜的往后找）当瞳色基准，别的整张立绘量好脸框后照它补瞳色（脸的大小位置不一样，分层按各自的虹膜分），换脸的差分照自己的底图补。补过的原图都留着：人物志里点开一张能换成基准（别的全照它重补）、能这张用原图。上传的、做了逆转式动态的不补。不出图、不花 Anlas。"><Toggle value={f.eyeUnify} onChange={v => set({ eyeUnify: v })} /></Field>
      <Field label="画完自动比对" hint={`换完量三样，没过就换个种子再画，留最像的那张（每次重来都是一次出图）。①表情换上没有：脸框分成 4×4 格，比每格里眉、眼线、瞳孔、嘴线这些线条，挪了一两个像素、深浅差三成以内的不算，新长出来和没了的占这格线条的百分之几，取变得最多的那格。少于「表情至少变」就算没换上，下次调高强度。拿以前换过的脸实测：真换了表情的 6~30，强度 0.3 原样描一遍的不到 1。填 0 不查。②画风跑偏没有：软边那一圈新旧大块色调差太多（看得出一圈色差），或者脸上大块明暗变了（原来的阴影、排线没了），就换个种子再画。「跑偏时强度最多降」默认 0：只换种子不降强度，因为强度一降眉眼就改不动了，换上的只剩泪和红晕；调大了每次跑偏降 0.06，最多比起步低这么多，也不会降回已经试出表情没换上的强度。③瞳色跑偏没有：虹膜跟底图的色差（Lab，开着「瞳色对齐底图」时量补色之后的，一般不到 3；关着量重画原样的），差到「瞳色差到」就换个种子再画，填 0 不查。宽严管②③：小于 1 更严、更容易重来，大于 1 更松。表情没换上的那几张排在最后，不会被留下。每次画的脸都留着，人物志里点开那张差分能挑。`}>
        <div className="fg-row">
          <Toggle value={f.check} onChange={v => set({ check: v })} />
          {f.check && <><span className="fg-note">没过最多再画</span><Select value={String(f.retries)} options={Array.from({ length: FACE_LIMITS.retries[1] + 1 }, (_, n) => [String(n), `${n} 次`])} onChange={v => set({ retries: Number(v) })} style={INLINE} />
            <span className="fg-note">表情至少变</span><Dial value={f.expression} min={FACE_LIMITS.expression[0]} max={FACE_LIMITS.expression[1]} step={0.5} digits={1} label="表情至少变多少" onCommit={v => set({ expression: v })} /></>}
        </div>
        {f.check && (
          <div className="fg-row">
            <span className="fg-note">画风宽严</span><Dial value={f.tolerance} min={FACE_LIMITS.tolerance[0]} max={FACE_LIMITS.tolerance[1]} step={0.1} digits={1} label="画风比对的宽严" onCommit={v => set({ tolerance: v })} />
            <span className="fg-note">跑偏时强度最多降</span><Dial value={f.drop} min={FACE_LIMITS.drop[0]} max={FACE_LIMITS.drop[1]} step={0.02} label="画风跑偏时强度最多往下调多少" onCommit={v => set({ drop: v })} />
            <span className="fg-note">瞳色差到</span><Dial value={f.eyeLimit} min={FACE_LIMITS.eyeLimit[0]} max={FACE_LIMITS.eyeLimit[1]} step={1} digits={0} label="瞳色差多少算跑偏" onCommit={v => set({ eyeLimit: v })} /><span className="fg-note">算跑偏</span>
          </div>
        )}
      </Field>
      <Field label="底图当角色参考" hint={`把整张底图当 NovelAI 的角色参考（Precise Reference，人物和画风一起参考）跟换脸一起发，锁住画风。NovelAI 只给 V4.5 训了带参考的重绘模型，V5 还没有；每张多花 5 Anlas。${refOk ? '' : `现在用的模型（${(cfg.novelai && cfg.novelai.model) || ''}）不支持，开着也不会带。`}接口不认时自动不带。`}><Toggle value={f.reference} onChange={v => set({ reference: v })} /></Field>
      <div className="fg-row" style={{ justifyContent: 'flex-end' }}><button type="button" className="fg-btn is-mini" disabled={!edited} onClick={reset}>换脸设置恢复默认</button></div>
    </>
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
      <Field label="自动插画" hint="导演判断值得画的地方自动出 CG，挂在正文对应段落后。"><div className="fg-row"><Toggle value={cfg.images.auto} onChange={v => p({ auto: v })} /><span className="fg-note">每轮最多</span><Limit value={cfg.images.maxPerTurn} fallback={4} unit="张" onCommit={v => p({ maxPerTurn: v })} /></div></Field>
      <Field label="插画方向" hint="横图铺满舞台；竖图在剧场里镜头从上往下慢慢看一遍。交给 AI 时插画分镜师按构图挑（多人铺开、远景出横图，单人、特写、两人贴近出竖图）。只管自动配的插画，鉴赏里还能单张改。">
        <select className="fg-select" style={{ width: 'auto' }} value={cfg.images.cgShape || 'auto'} onChange={e => p({ cgShape: e.target.value })}>
          <option value="auto">AI 自己判断</option>
          <option value="landscape">都出横图</option>
          <option value="portrait">都出竖图</option>
        </select>
      </Field>
      <Field label="新地点背景"><Toggle value={cfg.images.backgrounds} onChange={v => p({ backgrounds: v })} /></Field>
      <Field label="立绘" hint="角色登场、换装、长期状态变化时，画这一套的平静立绘。"><Toggle value={cfg.images.portraits} onChange={v => p({ portraits: v })} /></Field>
      <Field label="情绪差分" hint="导演用到这一套还没有的情绪时补画（包括它自创的新情绪）。漏掉的可以在人物志里一键补齐。"><div className="fg-row"><Toggle value={cfg.images.expressions} onChange={v => p({ expressions: v })} /><span className="fg-note">每轮最多</span><Limit value={cfg.images.expressionsPerTurn} fallback={12} unit="张" onCommit={v => p({ expressionsPerTurn: v })} /></div></Field>
      <Field label="表情只换脸" hint="galgame 的「一个动作 + 一套表情」：同一套衣服每个动作整张画一张底图，同一个动作的其余情绪用 NovelAI 局部重绘只重画脸（眉、眼、两颊、嘴），身体和衣服一个像素都不动。每个人有哪些动作、哪种情绪归哪个动作、脸上什么样，是立绘设计师读完资料和剧情给他设计的（人物志 →「动作与表情」）。底图画好后要认一次脸：开着 FlowGal 的页面（聊天页、剧场都行）、认脸模型下好时自动认（下了认脸大模型就一律用大模型），认不准的在人物志里点开底图框一下。只对 NovelAI 有效；关掉就像以前一样每个情绪整张画。已经画好的立绘不会自动重画。"><Toggle value={cfg.images.faceSwap} onChange={v => p({ faceSwap: v, faceSwapPicked: true })} /></Field>
      {cfg.images.faceSwap && cfg.images.backend === 'novelai' && <FaceSettings cfg={cfg} onPatch={p} />}
      {cfg.images.faceSwap && <PoseGroups cfg={cfg} onPatch={p} />}
      <Field label="立绘设计师" hint="给一个人画第一张立绘之前，先读完人物卡、世界书和到这一轮为止的全部剧情，按他的人设和经历设计专属的几个动作和每种情绪的表情（人物志 →「动作与表情」里能看能改）；之后每张差分的提示词也由它读完资料来写，照设计画，只换脸的表情直接用设计好的。一个角色一次写一批差分（用导演的模型和资料长度设置；窗口装不下时从最早的剧情删起）。关掉则按档案机械拼、用通用动作组。"><Toggle value={cfg.images.spriteWriter} onChange={v => p({ spriteWriter: v })} /></Field>
      {cfg.images.backend === 'novelai' && (cfg.novelai?.endpoint || 'official') === 'official'
        ? <Field label="并发"><span className="fg-note">一次画 1 张：NovelAI 官方接口一个账号同时只能画一张（多发的会被它拒绝）。换成自建接入点、ComfyUI、WebUI、OpenAI 兼容时这里能调。</span></Field>
        : <Field label="并发" hint={`同时画几张。自动：OpenAI 兼容的同时 4 张，本地的 ComfyUI / WebUI 一张（一块显卡本来就一张张画，多发了只是在它那边排队）。现在是 ${imageConcurrency(cfg)} 张。`}><Limit value={cfg.images.concurrency} fallback={imageConcurrency(cfg)} min={1} unit="张" free="自动" onCommit={v => p({ concurrency: v })} /></Field>}
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

// ───────────────────────── 对话框：字体、字号、高度 ─────────────────────────
let localFamilies = null // 「读取电脑里的字体」读到的字体名（这次打开网页期间记着）
const OTHER_FONT = '__other__'
const PREVIEW_LINE = '好巧啊。今天的月色真美，要不要一起走一段？'

/** 一个百分比：滑块 + 数字框，松手 / 回车才存；改过了显示「恢复默认」。value 为 null 时显示 empty（跟皮肤）。 */
function Percent({ value, fallback, min, max, step = 1, onCommit, onReset, changed, label, empty = '' }) {
  const shown = value ?? fallback
  const [v, setV] = React.useState(shown)
  React.useEffect(() => { setV(shown) }, [shown])
  const commit = next => { const n = Math.min(max, Math.max(min, Number(next))); if (Number.isFinite(n) && n !== value) onCommit(n); else setV(shown) }
  return (
    <span className="fg-row fg-pct">
      <input type="range" min={min} max={max} step={step} value={v} aria-label={label} onChange={e => setV(Number(e.target.value))} onPointerUp={e => commit(e.target.value)} onKeyUp={e => commit(e.target.value)} />
      <input className="fg-input" type="number" min={min} max={max} step={1} value={v} aria-label={label} onChange={e => setV(e.target.value)} onBlur={e => commit(e.target.value)} onKeyDown={e => { e.stopPropagation(); if (e.key === 'Enter') commit(e.target.value) }} />
      <span className="fg-note">%{value == null && empty ? ` · ${empty}` : ''}</span>
      {changed && <button type="button" className="fg-btn is-mini" onClick={onReset}>恢复默认</button>}
    </span>
  )
}

/** 选字体：跟皮肤 / 网页字体 / 电脑里的 / 上传的 / 自己填名字；旁边能直接上传一个字体用在这里。 */
function FontField({ label, hint, value, skinFont, fonts, families, onPick, onUpload, busy }) {
  const [typing, setTyping] = React.useState(false)
  const fileRef = React.useRef(null)
  const local = value.startsWith('local:') ? value.slice(6) : ''
  const known = new Set([...LOCAL_FONTS.map(([f]) => f), ...(families || [])])
  const options = [
    ['', `跟皮肤（${skinFont}）`],
    ...FONT_GROUPS.map(([g, name]) => ({ group: name, options: Object.entries(FONT_PACKS).filter(([, f]) => f.group === g).map(([key, f]) => ['pack:' + key, f.name]) })),
    { group: '上传的字体', options: fonts.map(f => ['file:' + f.assetId, f.name]) },
    { group: '电脑里常见的（装了才有）', options: LOCAL_FONTS.map(([f, name]) => ['local:' + f, `${name}（${f}）`]) },
    { group: `这台电脑里的字体（${(families || []).length} 个）`, options: (families || []).map(f => ['local:' + f, f]) },
    ...(local && !known.has(local) ? [['local:' + local, `${local}（自己填的）`]] : []),
    [OTHER_FONT, '其他字体：自己填名字…'],
  ]
  return (
    <Field label={label} hint={hint}>
      <div className="fg-row">
        <Select value={typing ? OTHER_FONT : value} options={options} style={INLINE} onChange={v => { if (v === OTHER_FONT) setTyping(true); else { setTyping(false); onPick(v) } }} />
        {typing && <Text value={local} placeholder="字体名，比如 方正兰亭黑_GBK" style={{ width: '16cqw' }} onCommit={v => { const name = cleanFontName(v); if (name) { onPick('local:' + name); setTyping(false) } }} />}
        <button type="button" className="fg-btn is-mini" disabled={busy} onClick={() => fileRef.current && fileRef.current.click()}>{busy ? '上传中…' : '上传字体用在这里'}</button>
        {value && <button type="button" className="fg-btn is-mini" onClick={() => { setTyping(false); onPick('') }}>恢复默认</button>}
        <input ref={fileRef} type="file" accept=".ttf,.otf,.woff,.woff2,font/ttf,font/otf,font/woff,font/woff2" hidden onChange={e => { const file = e.target.files && e.target.files[0]; e.target.value = ''; if (file) onUpload(file) }} />
      </div>
    </Field>
  )
}

/** 对话框的样子在设置里的缩小版：跟剧场同一套样式（舞台的 cqw 换成这个小框的宽），字体、字号、高度改了马上看到。 */
function DialogPreview({ emotion = true }) {
  return (
    <div className="fg-dlg-preview" aria-hidden="true">
      <div className="fg-dialog">
        <div className="fg-box" />
        <div className="fg-name"><div className="fg-name-plate">苏晴</div>{emotion && <div className="fg-name-sub">调侃</div>}</div>
        <div className="fg-text is-dialogue is-done"><span className="fg-line">{PREVIEW_LINE}</span></div>
        <div className="fg-wait" />
        <div className="fg-progress"><i style={{ width: '40%' }} /></div>
        <div className="fg-quick">{['AUTO', 'SKIP', 'LOG', 'CONFIG'].map(t => <button key={t} type="button" tabIndex={-1}>{t}</button>)}</div>
      </div>
    </div>
  )
}

/**
 * 设置 → 外观与演出 → 对话框：对话字体、名牌字体（网页字体、电脑里装的、上传的、自己填名字）、对话字号、名牌字号、对话框高度（横屏、竖屏）。
 * 每一项都能恢复默认；默认就是皮肤原来的样子。上传的字体存在素材目录，在这里能删。
 */
function DialogSection({ data }) {
  const ui = data.config.ui
  const p = patch => patchConfig({ ui: patch }).catch(e => toast(e.message, 'error'))
  const [busy, run] = useBusy()
  const [families, setFamilies] = React.useState(localFamilies)
  const fonts = ui.customFonts || []
  const skin = SKINS.find(s => s.id === ui.skin) || SKINS[0]
  // 上传的字体都装上，下面的清单里每个名字用它自己的字体显示
  React.useEffect(() => { for (const f of fonts) loadFontFile(f.assetId) }, [fonts.map(f => f.assetId).join()])
  const upload = (file, slot) => run('font' + slot, async () => {
    const res = await api.uploadFont(file)
    setConfig(res)
    if (slot && res.font) await patchConfig({ ui: { [slot]: 'file:' + res.font.assetId } })
  }, slot ? '已上传，正在用这个字体' : '已上传')
  const readLocal = () => run('local', async () => {
    if (typeof window === 'undefined' || typeof window.queryLocalFonts !== 'function') throw new Error('这个浏览器不让网页读字体清单（Chrome / Edge 103 以上可以）。可以在下拉框里选「其他字体」直接填名字')
    const list = await window.queryLocalFonts()
    localFamilies = [...new Set(list.map(f => cleanFontName(f.family)).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'zh'))
    setFamilies(localFamilies)
    if (!localFamilies.length) throw new Error('没读到字体：浏览器问要不要让网页看字体时要点「允许」')
    return localFamilies.length
  }, '已读取这台电脑里的字体，在下拉框最后一组')
  const land = skinDialogHeight(skin.id, 'landscape')
  const port = skinDialogHeight(skin.id, 'portrait')
  const allDefault = !ui.textFont && !ui.nameFont && ui.textScale === 1 && ui.nameScale === 1 && ui.dialogHeight == null && ui.dialogHeightPortrait == null
  return (
    <>
      <div className="fg-section">对话框</div>
      <DialogPreview emotion={ui.showEmotion} />
      <div className="fg-row" style={{ justifyContent: 'flex-end', marginTop: '.6cqw' }}>
        <span className="fg-note" style={{ flex: 1 }}>上面是现在的样子（皮肤「{skin.name}」）。改完马上生效，剧场里正在读的那句也会跟着变。</span>
        <button type="button" className="fg-btn is-mini" disabled={busy === 'local'} onClick={readLocal}>{busy === 'local' ? '读取中…' : families ? `重新读取电脑里的字体（${families.length} 个）` : '读取电脑里的字体'}</button>
        <button type="button" className="fg-btn is-mini" disabled={allDefault} onClick={() => p({ textFont: '', nameFont: '', textScale: 1, nameScale: 1, dialogHeight: null, dialogHeightPortrait: null })}>对话框全部恢复默认</button>
      </div>
      <FontField label="对话字体" hint="对话框里的台词和旁白，也用在选项和回想里。选的字体缺字时（比如日文字体里没有的简体字）用皮肤的字体补上。电脑里的字体只在装了它的电脑上生效；上传的字体每台设备都能用。"
        value={ui.textFont || ''} skinFont={skin.textFont} fonts={fonts} families={families} busy={busy === 'fonttextFont'} onPick={v => p({ textFont: v })} onUpload={file => upload(file, 'textFont')} />
      <FontField label="名牌字体" hint="说话人的名字，也用在回想里的名字上。"
        value={ui.nameFont || ''} skinFont={skin.nameFont} fonts={fonts} families={families} busy={busy === 'fontnameFont'} onPick={v => p({ nameFont: v })} onUpload={file => upload(file, 'nameFont')} />
      <Field label="对话字号" hint={`皮肤原来的大小是 100%。调大以后一屏放不下的话，把下面的对话框高度也调高。`}>
        <Percent value={Math.round(ui.textScale * 100)} fallback={100} min={DIALOG_LIMITS.textScale.min * 100} max={DIALOG_LIMITS.textScale.max * 100} step={DIALOG_LIMITS.textScale.step * 100} label="对话字号"
          changed={ui.textScale !== 1} onCommit={n => p({ textScale: Math.round(n) / 100 })} onReset={() => p({ textScale: 1 })} />
      </Field>
      <Field label="名牌字号" hint="名牌整块跟着放大缩小，往上长，不压到台词。">
        <Percent value={Math.round(ui.nameScale * 100)} fallback={100} min={DIALOG_LIMITS.nameScale.min * 100} max={DIALOG_LIMITS.nameScale.max * 100} step={DIALOG_LIMITS.nameScale.step * 100} label="名牌字号"
          changed={ui.nameScale !== 1} onCommit={n => p({ nameScale: Math.round(n) / 100 })} onReset={() => p({ nameScale: 1 })} />
      </Field>
      <Field label="对话框高度" hint={`占画面高度的百分比；「${skin.name}」原来是 ${land}%。调高时名牌、台词离上边的距离不变，多出来的地方都给台词。`}>
        <Percent value={ui.dialogHeight} fallback={land} min={DIALOG_LIMITS.dialogHeight.min} max={DIALOG_LIMITS.dialogHeight.max} step={DIALOG_LIMITS.dialogHeight.step} label="对话框高度" empty="跟皮肤"
          changed={ui.dialogHeight != null} onCommit={n => p({ dialogHeight: n })} onReset={() => p({ dialogHeight: null })} />
      </Field>
      <Field label="竖屏时的高度" hint={`手机竖着拿时单独算（画面是竖的，同样的百分比看起来不一样）；「${skin.name}」原来是 ${port}%。`}>
        <Percent value={ui.dialogHeightPortrait} fallback={port} min={DIALOG_LIMITS.dialogHeight.min} max={DIALOG_LIMITS.dialogHeight.max} step={DIALOG_LIMITS.dialogHeight.step} label="竖屏时的对话框高度" empty="跟皮肤"
          changed={ui.dialogHeightPortrait != null} onCommit={n => p({ dialogHeightPortrait: n })} onReset={() => p({ dialogHeightPortrait: null })} />
      </Field>
      {fonts.length > 0 && (
        <Field label="上传的字体" hint="存在数据目录的素材里，删掉后正用着它的地方回到皮肤的字体。">
          <div className="fg-fontlist">
            {fonts.map(f => (
              <div key={f.assetId} className="fg-row fg-fontitem">
                <span className="fg-fontname" style={{ fontFamily: `${fontFamilyOf('file:' + f.assetId)}, var(--font-body)` }}>{f.name} · {PREVIEW_LINE.slice(0, 8)}</span>
                <span className="fg-spacer" />
                <button type="button" className="fg-btn is-mini" disabled={ui.textFont === 'file:' + f.assetId} onClick={() => p({ textFont: 'file:' + f.assetId })}>用作对话</button>
                <button type="button" className="fg-btn is-mini" disabled={ui.nameFont === 'file:' + f.assetId} onClick={() => p({ nameFont: 'file:' + f.assetId })}>用作名牌</button>
                <button type="button" className="fg-btn is-mini" disabled={busy === 'rm' + f.assetId} onClick={() => run('rm' + f.assetId, async () => setConfig(await api.removeFont(f.assetId)), '已删掉')}>删除</button>
              </div>
            ))}
          </div>
        </Field>
      )}
    </>
  )
}

const CORNER_GROUPS = [
  { side: 'left', label: '左上角', hint: '地点和这一幕的场景标签，点一下开关一样。地点没写时显示「第几轮」；别的标签只在这一幕有这一样时出现（晴天、正常光线不显示）。换地方时出来的那张地点标题不归这里管，在「特效 → 地点标题与过场字卡」里关。' },
  { side: 'right', label: '右上角', hint: '导演整理中可以点进去看导演正在写什么；出图进度是还在画的图有几张；通话中是接通电话后对方的名字和计时，关掉后接通的声音照旧。右上角的关闭按钮一直在。' },
]
/** 剧场左上角、右上角每一样的开关（lib/corner.js），样子和「特效」页一样：一组一个总开关，下面每样一个。 */
function CornerSection({ corner }) {
  const p = patch => patchConfig({ ui: { corner: patch } }).catch(e => toast(e.message, 'error'))
  const changed = CORNER_ITEMS.some(i => corner[i.id] !== i.on)
  return (
    <>
      {CORNER_GROUPS.map(g => {
        const items = CORNER_ITEMS.filter(i => i.side === g.side)
        const count = items.filter(i => corner[i.id]).length
        return (
          <div key={g.side} className="fg-fx-group">
            <div className="fg-fx-head">
              <b>{g.label}</b>
              <span className={`fg-fx-count${count && count < items.length ? ' is-part' : ''}`}>{count === items.length ? '全显示' : count ? `显示 ${count} / ${items.length}` : '全不显示'}</span>
              <div className="fg-spacer" />
              <Toggle value={count === items.length} onChange={() => p(Object.fromEntries(items.map(i => [i.id, count !== items.length])))} />
            </div>
            <div className="fg-note">{g.hint}</div>
            <div className="fg-fx-items">
              {items.map(i => {
                const on = Boolean(corner[i.id])
                return <button key={i.id} type="button" className={`fg-fx-chip${on ? ' is-on' : ''}`} aria-pressed={on} title={on ? '点一下不显示' : '点一下显示'} onClick={() => p({ [i.id]: !on })}><i />{i.label}</button>
              })}
            </div>
          </div>
        )
      })}
      <div className="fg-row" style={{ justifyContent: 'flex-end', marginTop: '.4cqw' }}>
        <button type="button" className="fg-btn is-mini" disabled={!changed} onClick={() => p({ ...CORNER_DEFAULTS })}>角落恢复默认</button>
      </div>
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
      <DialogSection data={data} />
      <div className="fg-section">调试信息</div>
      <div className="fg-note" style={{ marginBottom: '.6cqw' }}>看导演判断得对不对时打开，平常读剧情可以都关着。改完剧场里马上生效。</div>
      <Field label="名牌旁的情绪" hint="说话人名字旁边的小字（调侃、得意……），是导演给这句标的情绪。立绘的表情照样跟着换，只是不写出来。">
        <Toggle value={cfg.ui.showEmotion} onChange={v => p({ showEmotion: v })} />
      </Field>
      <CornerSection corner={cfg.ui.corner || CORNER_DEFAULTS} />
      <div className="fg-section">画面</div>
      <Field label="画面比例" hint="跟横版插画一样时，插画正好铺满舞台（默认就是 NovelAI 常用的 1216×832；横版尺寸在「画风与配图 → 尺寸」里改）。">
        <select className="fg-select" style={{ width: 'auto' }} value={cfg.ui.ratio} onChange={e => p({ ratio: e.target.value })}>
          <option value="cg">跟横版插画一样（{landscapeSize(data.config)}）</option>
          <option value="wide">16:9 宽屏</option>
        </select>
      </Field>
      <Field label="同屏最多几人" hint="台上的人多于这个数时，最久没说话、没登场的先下场，轮到他说话再回来。人越多立绘越小，按站位从左到右排开。">
        <select className="fg-select" style={{ width: 'auto' }} value={String(cfg.ui.maxOnStage ?? 8)} onChange={e => p({ maxOnStage: Number(e.target.value) })}>
          {STAGE_SIZES.filter(Boolean).map(n => <option key={n} value={String(n)}>{n} 人</option>)}
          <option value="0">不限</option>
        </select>
      </Field>
      <div className="fg-section">演出</div>
      <Field label="短闪回" hint="正文里一两句的回忆（「她说过：……」）怎么演。要换到当时的地方慢慢演的长回忆，导演会换成整段回忆场景，不受这里影响。">
        <select className="fg-select" style={{ width: 'auto' }} value={cfg.ui.recall || 'text'} onChange={e => p({ recall: e.target.value })}>
          <option value="text">画面不动，对话框换成回忆的样子</option>
          <option value="ghost">画面压暗，回忆里的人浮到台前</option>
          <option value="portrait">对话框换样子，旁边再出说话人的小头像</option>
        </select>
      </Field>
      <Field label="短闪回的名牌" hint="回忆里说话的人的名字。模糊压暗时认得出是谁，又像隔着一层看不清。">
        <select className="fg-select" style={{ width: 'auto' }} value={cfg.ui.recallName || 'blur'} onChange={e => p({ recallName: e.target.value })}>
          <option value="blur">模糊、压暗</option>
          <option value="hide">不显示</option>
          <option value="show">照常显示</option>
        </select>
      </Field>
      <Field label="短闪回的基调" hint="切进闪回的方式和色调，对话框和回忆里的声音也跟着变：温暖怀念慢慢泛黄，甜蜜泛起粉光，伤感褪成冷灰，不安画面撕裂泛红、像心跳一样一暗一暗，猛然想起白闪一下，朦胧如梦起雾。自动时导演按剧情选，没选的按闪回里的情绪和当时的氛围挑。">
        <select className="fg-select" style={{ width: 'auto' }} value={cfg.ui.recallTone || 'auto'} onChange={e => p({ recallTone: e.target.value })}>
          <option value="auto">自动（按剧情和氛围）</option>
          {RECALL_TONES.map(t => <option key={t} value={t}>都用「{RECALL_TONE_LABEL[t]}」</option>)}
        </select>
      </Field>
      <Field label="文字速度" hint="每字毫秒，0 为瞬间显示。"><input type="range" min="0" max="80" value={cfg.ui.textSpeed} onChange={e => p({ textSpeed: Number(e.target.value) })} style={{ width: '100%' }} /></Field>
      <Field label="自动播放间隔"><input type="range" min="400" max="4000" step="100" value={cfg.ui.autoDelay} onChange={e => p({ autoDelay: Number(e.target.value) })} style={{ width: '100%' }} /></Field>
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

// ───────────────────────── 特效 ─────────────────────────
/**
 * 特效开关：按种类分组（effects.js 的 EFFECT_GROUPS），每一个单独开关，每组一个总开关（全开时关掉整组，不然整组打开）。
 * 存进 ui.effects，打开的写 true、关掉的写 false（老设置「天气粒子」关着时，没单独打开过的天气算关着，见 lib/config.js）。
 */
function EffectsSection({ data }) {
  const saved = data.config.ui.effects || {}
  const isOn = id => saved[id] !== false
  const p = effects => patchConfig({ ui: { effects } }).catch(e => toast(e.message, 'error'))
  const setAll = (ids, value) => p(Object.fromEntries(ids.map(id => [id, value])))
  const offCount = EFFECT_IDS.filter(id => !isOn(id)).length
  return (
    <>
      <div className="fg-fx-top">
        <div className="fg-note">关掉的那一下剧场不演，别的照常；再打开马上回来，以前的轮次也一样。导演照常写，不用重新整理。</div>
        <span className="fg-pill">{offCount ? `关着 ${offCount} 个` : '全都开着'}</span>
        <button type="button" className="fg-btn" disabled={!offCount} onClick={() => setAll(EFFECT_IDS, true)}>全部打开</button>
      </div>
      {EFFECT_GROUPS.map(g => {
        const ids = g.items.map(i => i.id)
        const count = ids.filter(isOn).length
        return (
          <div key={g.id} className="fg-fx-group">
            <div className="fg-fx-head">
              <b>{g.label}</b>
              <span className={`fg-fx-count${count < ids.length ? ' is-part' : ''}`}>{count === ids.length ? '全开' : count ? `开着 ${count} / ${ids.length}` : '全关'}</span>
              <div className="fg-spacer" />
              <Toggle value={count === ids.length} onChange={() => setAll(ids, count !== ids.length)} />
            </div>
            <div className="fg-note">{g.hint}</div>
            <div className="fg-fx-items">
              {g.items.map(item => {
                const on = isOn(item.id)
                return <button key={item.id} type="button" className={`fg-fx-chip${on ? ' is-on' : ''}`} aria-pressed={on} title={on ? '点一下关掉' : '点一下打开'} onClick={() => p({ [item.id]: !on })}><i />{item.label}</button>
              })}
            </div>
          </div>
        )
      })}
    </>
  )
}

// ───────────────────────── 声音 ─────────────────────────
const VOICE_GENDER = { female: '女声', male: '男声', '': '不分男女' }
const SOUND_GROUPS = [['stage', '落字音效', '台词演出里的重音、怒吼、崩溃，打斗的出手'], ['ui', '界面音', '按钮、选项、翻页']]

/**
 * 打字音和音效：试听每个音色、定没指定声音的角色怎么分、旁白用什么；每种音效选版本、试听、换成自己的文件或音效库里的声音。
 * 音效库里种类是「打字音」的声音也是音色；标了推荐用途的（比如逆转裁判音效包）可以一键套用。
 */
function SoundSection({ data }) {
  const ui = data.config.ui
  const p = patch => patchConfig({ ui: patch }).catch(e => toast(e.message, 'error'))
  const [busy, run] = useBusy()
  const [picking, setPicking] = React.useState('') // 正在从音效库里给哪个槽挑声音
  const fileRef = React.useRef(null)
  const slotRef = React.useRef('')
  const library = useSoundlib() || []
  const blips = libraryBlips(library)
  const pick = slot => { slotRef.current = slot; if (fileRef.current) fileRef.current.click() }
  const upload = file => { const slot = slotRef.current; run('up' + slot, async () => { setConfig(await api.uploadSound(slot, file)) }, '已换成你的音效') }
  const remove = slot => run('rm' + slot, async () => { setConfig(await api.removeSound(slot)) }, '已删掉，退回默认的那个')
  const narration = ui.narrationVoice === 'off' ? null : { id: ui.narrationVoice, pitch: ui.narrationPitch }
  const preset = libraryPreset(library)
  const builtin = builtinPreset(ui)
  const aa = aaPreset(ui)
  const usable = library.filter(s => s.use).length
  const choose = (slot, value) => { p({ sounds: { [slot]: value } }); previewSound(slot, value, ui) }
  const defaultOptions = [['auto', '自动（按性别分）'], [AA_VOICES, '逆转式（女性都用逆转女声、男性都用逆转男声）'], ...(blips.length || ui.voiceDefault === LIBRARY_VOICES ? [[LIBRARY_VOICES, '音效库里的打字音（按性别分）']] : []), ...VOICES.map(v => [v.id, `都用「${v.label}」`]), { group: '都用自己的', options: customOptions(ui, ui.voiceDefault).map(([v, l]) => [v, `都用「${l}」`]) }, { group: '都用音效库里的', options: blipOptions(blips, ui.voiceDefault).map(([v, l]) => [v, `都用「${l}」`]) }]
  // 自动分配能用的所有音色（内置的、自己的、音效库的打字音）
  const allVoices = [...VOICES.map(v => [v.id, v.label]), ...customOptions(ui), ...blipOptions(blips)]
  return (
    <>
      {(aa || preset || builtin) && (
        <div className="fg-note fg-libpreset">
          {aa && <>逆转裁判那样的打字音：内置的逆转男声 / 女声 / 打字机，不用导入。</>}
          {aa && <button type="button" className="fg-btn is-primary" onClick={() => { p(aa); toast('已换成逆转式：男女各一个声音，旁白用逆转打字机') }}>套用逆转式</button>}
          {usable > 0 && <>音效库里有 {usable} 个标了用途的声音（比如逆转裁判音效包里的男声 / 女声哔哔、打字机、拍桌子、法槌）。</>}
          {preset && <button type="button" className="fg-btn is-primary" onClick={() => { p(preset); toast('已套用音效库里的声音') }}>一键套用</button>}
          {builtin && <button type="button" className="fg-btn" onClick={() => { p(builtin); toast('已换回内置的声音') }}>换回内置</button>}
        </div>
      )}
      <div className="fg-section">打字音</div>
      <Field label="打字音"><div className="fg-row"><Toggle value={ui.blip} onChange={v => p({ blip: v })} /><input type="range" min="0" max="2" step="0.1" value={ui.blipVolume} aria-label="打字音音量" onChange={e => p({ blipVolume: Number(e.target.value) })} style={{ flex: 1 }} /></div></Field>
      <Field label="没指定的角色" hint="每个角色的声音可以在「人物志 → 档案」里单独挑、调音高。自动：女性、男性各从一组音色里按名字分一个，同一局里先登场的先挑、后来的避开已经有人用的；一组用完了才重复，靠音高错开。没标性别的用经典哔哔。逆转式：女性都用逆转女声、男性都用逆转男声，跟逆转裁判一样同性别的人一个声音，没标性别的按名字二选一。音效库里的打字音（按性别分）：女性用标了女声的，男性用标了男声的，跟逆转裁判一样同性别的人一个声音；库里没有这个性别的就照自动分。">
        <Select value={ui.voiceDefault} options={defaultOptions} onChange={v => p({ voiceDefault: v })} />
      </Field>
      {ui.voiceDefault === 'auto' && (
        <Field label="自动分配的音色" hint="选「自动」时每种性别从这一组里按名字挑一个（同一局里尽量不撞）。可以加减，内置的、自己做的、音效库里的打字音都能放进来；改了只影响还没指定声音的角色。">
          <VoicePools ui={ui} p={p} options={allVoices} />
        </Field>
      )}
      <Field label="旁白">
        <div className="fg-row">
          <Select value={ui.narrationVoice} options={[...VOICES.map(v => [v.id, v.label]), { group: '自己的音色', options: customOptions(ui, ui.narrationVoice) }, { group: '音效库里的打字音', options: blipOptions(blips, ui.narrationVoice) }, ['off', '不出声']]} style={INLINE} onChange={v => p(narrationPatch(ui, v))} />
          <Select value={String(ui.narrationPitch)} options={PITCHES} style={INLINE} onChange={v => p({ narrationPitch: Number(v) })} />
          <button type="button" className="fg-btn" disabled={!narration} onClick={() => previewVoice(narration, ui)}>▶ 试听</button>
        </div>
      </Field>
      <div className="fg-section">音色一览 · {VOICES.length + (ui.customVoices || []).length + blips.length} 个（点一下试听）</div>
      {VOICE_GENDERS.filter(([g]) => g !== 'other').map(([g, label]) => (
        <React.Fragment key={g}>
          <div className="fg-note fg-voice-group">{label} · {VOICES.filter(v => v.gender === g).length} 个</div>
          <div className="fg-skins fg-voices">
            {VOICES.filter(v => v.gender === g).map(v => (
              <button key={v.id} type="button" className="fg-skin" onClick={() => previewVoice({ id: v.id, pitch: 0 }, ui)}>
                <b>▶ {v.label}</b><span>{v.desc}</span>
              </button>
            ))}
          </div>
        </React.Fragment>
      ))}
      {blips.length > 0 && <div className="fg-note fg-voice-group">音效库里的打字音 · {blips.length} 个</div>}
      <div className="fg-skins fg-voices">
        {blips.map(b => (
          <button key={b.id} type="button" className="fg-skin" onClick={() => previewVoice({ id: libRef(b.id), pitch: 0 }, ui)}>
            <b>▶ {b.name}</b><span>音效库 · {VOICE_GENDER[b.gender || '']}{b.use === 'narration' ? ' · 旁白用' : ''}{b.description ? ' · ' + b.description : ''}</span>
          </button>
        ))}
      </div>
      {!blips.length && <div className="fg-note">逆转女声、逆转男声、逆转打字机是照逆转裁判的声音合成的，不用导入。想用原版录音：把逆转裁判音效包（或别的打字音）导进「音效库」，种类选「打字音」，它就会出现在这里、档案和上面的下拉框里。</div>}
      <VoiceMaker ui={ui} p={p} />
      <div className="fg-section">音效</div>
      <Field label="音效"><div className="fg-row"><Toggle value={ui.sfx} onChange={v => p({ sfx: v })} /><input type="range" min="0" max="2" step="0.1" value={ui.sfxVolume} aria-label="音效音量" onChange={e => p({ sfxVolume: Number(e.target.value) })} style={{ flex: 1 }} /></div></Field>
      {SOUND_GROUPS.map(([group, title, note]) => (
        <React.Fragment key={group}>
          <div className="fg-section">{title}</div>
          <div className="fg-note">{note}。换一个版本会马上响一下；「用自己的」可以传 mp3、m4a、ogg、wav、flac（最大 5 MB，只放前 4 秒）；也可以从音效库里挑一个。自己的文件和音效库的声音都按默认版本的响度放。</div>
          {SOUND_SLOTS.filter(s => s.group === group).map(slot => {
            const mine = ui.customSounds[slot.id]
            const current = ui.sounds[slot.id]
            const suggested = library.filter(s => s.use === slot.id)
            const chosen = isLibRef(current) && !suggested.some(s => s.id === libIdOf(current)) ? library.find(s => s.id === libIdOf(current)) : null
            const libOptions = [...suggested, ...(chosen ? [chosen] : [])].map(s => [libRef(s.id), `${s.name}（${s.category}）`])
            if (isLibRef(current) && !library.some(s => s.id === libIdOf(current))) libOptions.push([current, '音效库里已删除的声音（放默认的）'])
            const options = [...slot.presets.map((x, i) => [x.id, i ? x.label : `${x.label}（默认）`]), ...(mine ? [['custom', `我的：${mine.name || '上传的文件'}`]] : []), { group: '音效库', options: libOptions }, ['off', '关掉']]
            return (
              <Field key={slot.id} label={slot.label} hint={slot.hint}>
                <div className="fg-row">
                  <Select value={current} options={options} style={INLINE} onChange={v => choose(slot.id, v)} />
                  <button type="button" className="fg-btn" disabled={current === 'off'} onClick={() => previewSound(slot.id, current, ui)}>▶ 试听</button>
                  <button type="button" className={`fg-btn${picking === slot.id ? ' is-on' : ''}`} disabled={!library.length} title={library.length ? '' : '音效库是空的'} onClick={() => setPicking(k => (k === slot.id ? '' : slot.id))}>从音效库挑</button>
                  <button type="button" className="fg-btn" disabled={busy === 'up' + slot.id} onClick={() => pick(slot.id)}>{busy === 'up' + slot.id ? '上传中…' : mine ? '换文件' : '用自己的'}</button>
                  {mine && <button type="button" className="fg-btn" disabled={busy === 'rm' + slot.id} onClick={() => remove(slot.id)}>删掉文件</button>}
                </div>
                {picking === slot.id && <LibPicker sounds={library} slot={slot.id} current={current} ui={ui} onPick={v => { choose(slot.id, v); setPicking('') }} />}
              </Field>
            )
          })}
        </React.Fragment>
      ))}
      <input ref={fileRef} type="file" accept="audio/*" hidden onChange={e => { const file = e.target.files && e.target.files[0]; e.target.value = ''; if (file) upload(file) }} />
    </>
  )
}

/** 从音效库里给落字音效 / 界面音挑一个：搜名字、分类、标签、描述，标了这个用途的排最前；点名字试听，点「用这个」选上。 */
const PICKER_SHOWN = 40
function LibPicker({ sounds, slot, current, ui, onPick }) {
  const [query, setQuery] = React.useState('')
  const words = query.trim().split(/\s+/).filter(Boolean)
  const found = sounds
    .filter(s => s.kind !== 'ambience' && words.every(w => `${s.name} ${s.category} ${(s.tags || []).join(' ')} ${s.description}`.includes(w)))
    .sort((a, b) => Number(b.use === slot) - Number(a.use === slot) || String(a.category).localeCompare(String(b.category), 'zh-CN') || String(a.name).localeCompare(String(b.name), 'zh-CN'))
  return (
    <div className="fg-libpicker">
      <input className="fg-input" style={{ width: '100%' }} value={query} autoFocus placeholder="搜名字、分类、标签、描述（空格隔开几个词）" onChange={e => setQuery(e.target.value)} onKeyDown={e => e.stopPropagation()} />
      <div className="fg-libpicker-list">
        {found.slice(0, PICKER_SHOWN).map(s => (
          <div key={s.id} className={`fg-row fg-libpicker-item${current === libRef(s.id) ? ' is-on' : ''}`}>
            <button type="button" className="fg-btn" title="试听" onClick={() => previewSound(slot, libRef(s.id), ui)}>▶</button>
            <span className="fg-libpicker-name">{s.name}<small>{s.category}{s.use === slot ? ' · 推荐' : ''}</small></span>
            <button type="button" className="fg-btn" disabled={current === libRef(s.id)} onClick={() => onPick(libRef(s.id))}>{current === libRef(s.id) ? '正在用' : '用这个'}</button>
          </div>
        ))}
        {!found.length && <div className="fg-note">没找到。</div>}
        {found.length > PICKER_SHOWN && <div className="fg-note">还有 {found.length - PICKER_SHOWN} 个，多打几个字缩小范围。</div>}
      </div>
    </div>
  )
}

// ───────────────────────── 我的配乐 ─────────────────────────
const sizeMB = bytes => (bytes / 1048576).toFixed(1) + ' MB'
const MUSIC_LIST = 'fg-music-cats'

/** 展开的一首曲子：改名、分类、描述、标签（失焦保存）、删除。 */
function TrackEditor({ track }) {
  const [busy, run] = useBusy()
  const save = patch => run('s', async () => { await api.updateTrack(track.id, patch); await loadMusic() })
  return (
    <>
      <div className="fg-row">
        <Text value={track.name} style={{ flex: 2, width: 'auto', fontWeight: 600 }} onCommit={v => save({ name: v })} />
        <Text value={track.category} list={MUSIC_LIST} placeholder="分类，两层用 / 隔开：日常/校园" style={{ flex: 1, width: 'auto' }} onCommit={v => save({ category: v })} />
        <button type="button" className="fg-btn is-mini fg-danger" disabled={busy === 'd'} onClick={async () => { if (await confirmBox(`从曲库删除「${track.name}」？电脑上的原文件不受影响。`, { ok: '删除', danger: true })) run('d', async () => { await api.removeTrack(track.id); await loadMusic() }, '已删除') }}>删除</button>
      </div>
      <TextArea value={track.description} placeholder="听起来什么样、适合什么场面。例如：慢板萨克斯和雨声，深夜独处、心事重重，也适合告白前的沉默" onCommit={v => save({ description: v })} />
      <Text value={(track.tags || []).join('、')} placeholder="标签，用顿号或逗号隔开：深夜、城市、雨、怀旧" style={{ width: '100%' }} onCommit={v => save({ tags: v })} />
      {track.file && <div className="fg-note">文件：{track.file}</div>}
    </>
  )
}
const trackSummary = t => [(t.tags || []).join('、'), t.description].filter(Boolean).join(' · ') || '（还没有描述和标签）'

/** 多行文本：失焦时才提交。 */
function TextArea({ value, onCommit, placeholder }) {
  const [v, setV] = React.useState(value ?? '')
  React.useEffect(() => { setV(value ?? '') }, [value])
  return <textarea className="fg-textarea fg-track-desc" value={v} placeholder={placeholder} onChange={e => setV(e.target.value)} onBlur={() => { if (v !== (value ?? '')) onCommit(v) }} onKeyDown={e => e.stopPropagation()} />
}

/** 导入文件夹时，曲子所在的子文件夹（最多两层）当分类：「我的歌/日常/校园/a.mp3」→「日常/校园」。直接选的文件没有。 */
const folderCategory = file => String(file.webkitRelativePath || '').split('/').slice(1, -1).slice(0, 2).join('/')

// ───────────────────────── 整理界面（曲库、音效库、环境音库共用） ─────────────────────────
const NO_CAT = '\u0000未分类' // 分类树里「未分类」那一项
const LIB_PAGE_SIZE = 200 // 一次列出多少条，再多点「再显示」
const catOf = item => (item.category && item.category !== '未分类' ? item.category : '')
const underCat = (item, cat) => { const c = catOf(item); return cat === NO_CAT ? !c : !cat || c === cat || c.startsWith(cat + '/') }
const fmtBytes = bytes => (bytes >= 1073741824 ? (bytes / 1073741824).toFixed(1) + ' GB' : sizeMB(bytes))
// 一行里的大小：音效常常只有几十 KB，不到 1 MB 的按 KB 写
const rowSize = bytes => (bytes >= 1048576 ? sizeMB(bytes) : Math.max(1, Math.round(bytes / 1024)) + ' KB')
const byZh = (a, b) => String(a).localeCompare(String(b), 'zh-CN', { numeric: true })
const LIB_SORTS = [['name', '按名字'], ['new', '最近导入的在前'], ['size', '文件大的在前']]
const LIB_FILTERS = [['all', '全部'], ['notag', '没标签的'], ['nodesc', '没描述的']]
const splitTags = text => String(text || '').split(/[,，、\s]+/).filter(Boolean)

/**
 * 整理界面：左边分类树（两层，带数量；全部、未分类），右边按分类、搜索、筛选列出一行行条目，点一行展开编辑。
 * 勾选（按住 Shift 连选一串）后底部一条批量操作：移到分类、加 / 去标签、删除，再加上 extras（音效库的改种类、音量……）。
 * 分类可以改名（子分类跟着走，改成已有的名字就是并进去）、整类删。
 *   items     这一页的条目（曲子或声音），都有 id、name、category、tags、description、bytes、addedAt
 *   kinds     种类筛选 [[值, 名字]…]（音效库页的音效 / 打字音），没有就不显示；选了种类时分类树也只数这一种
 *   editor    展开一行时的编辑区：item => JSX
 *   summary   一行里名字下面那行小字：item => 文字
 *   ops       { update(ids, patch), remove(ids), rename(from, to, kind) }：都回 Promise，做完自己刷新列表
 *   extras    批量操作里多出来的一行：({ ids, run, busy }) => JSX
 *   listId    分类输入框的候选列表（datalist）编号，编辑区的分类框也用它
 */
function LibBrowser({ items, unit = '个', kinds = null, playing, onPlay, editor, summary, ops, extras = null, listId }) {
  const [cat, setCat] = React.useState('')
  const [query, setQuery] = React.useState('')
  const [filter, setFilter] = React.useState('all')
  const [kind, setKind] = React.useState('')
  const [sort, setSort] = React.useState('name')
  const [selected, setSelected] = React.useState(() => new Set())
  const [open, setOpen] = React.useState('')
  const [limit, setLimit] = React.useState(LIB_PAGE_SIZE)
  const [renaming, setRenaming] = React.useState(false)
  const [moveTo, setMoveTo] = React.useState('')
  const [tagText, setTagText] = React.useState('')
  const [busy, run] = useBusy()
  const last = React.useRef(-1)

  const pool = React.useMemo(() => (kind ? items.filter(it => (it.kind || 'sfx') === kind) : items), [items, kind])
  // 分类树：第一层（数量连子分类）→ 第二层
  const tree = React.useMemo(() => {
    const tops = new Map()
    let none = 0
    for (const it of pool) {
      const c = catOf(it)
      if (!c) { none++; continue }
      const [top, sub] = c.split('/')
      if (!tops.has(top)) tops.set(top, { n: 0, subs: new Map() })
      const t = tops.get(top)
      t.n++
      if (sub) t.subs.set(sub, (t.subs.get(sub) || 0) + 1)
    }
    return { none, tops: [...tops.entries()].sort((a, b) => byZh(a[0], b[0])).map(([name, t]) => ({ name, n: t.n, subs: [...t.subs.entries()].sort((a, b) => byZh(a[0], b[0])) })) }
  }, [pool])
  const allCats = React.useMemo(() => [...new Set(items.map(catOf).filter(Boolean).flatMap(c => [c.split('/')[0], c]))].sort(byZh), [items])

  const list = React.useMemo(() => {
    const words = query.trim().split(/\s+/).filter(Boolean)
    const out = pool.filter(it => {
      if (!underCat(it, cat)) return false
      if (filter === 'notag' && (it.tags || []).length) return false
      if (filter === 'nodesc' && it.description) return false
      if (words.length) {
        const text = `${it.name} ${catOf(it)} ${(it.tags || []).join(' ')} ${it.description || ''} ${it.file || ''}`
        if (!words.every(w => text.includes(w))) return false
      }
      return true
    })
    const cmp = { name: (a, b) => byZh(a.name, b.name), new: (a, b) => (b.addedAt || 0) - (a.addedAt || 0), size: (a, b) => (b.bytes || 0) - (a.bytes || 0) }[sort]
    return out.sort(cmp)
  }, [pool, cat, filter, sort, query])
  React.useEffect(() => { setLimit(LIB_PAGE_SIZE); last.current = -1 }, [cat, kind, filter, sort, query])
  React.useEffect(() => { setRenaming(false) }, [cat])
  // 删掉了的不再算选中；选着的分类空了就回到全部
  React.useEffect(() => {
    const have = new Set(items.map(it => it.id))
    setSelected(s => { const n = new Set([...s].filter(id => have.has(id))); return n.size === s.size ? s : n })
    if (cat && !pool.some(it => underCat(it, cat))) setCat('')
  }, [items, pool])

  const pick = (index, e) => {
    const id = list[index].id
    // 上一次点的那个先记下来：setSelected 的更新函数可能等到下一次渲染才跑，那时 last 已经是这一次了
    const from = e && e.shiftKey && last.current >= 0 && last.current < list.length ? last.current : -1
    setSelected(s => {
      const n = new Set(s)
      const on = !n.has(id)
      if (from >= 0) {
        for (let i = Math.min(from, index); i <= Math.max(from, index); i++) on ? n.add(list[i].id) : n.delete(list[i].id)
      } else if (on) n.add(id)
      else n.delete(id)
      return n
    })
    last.current = index
  }
  const allPicked = list.length > 0 && list.every(it => selected.has(it.id))
  const pickAll = () => setSelected(s => { const n = new Set(s); for (const it of list) allPicked ? n.delete(it.id) : n.add(it.id); return n })
  const ids = [...selected]

  const moveSelected = () => {
    const to = moveTo.trim()
    run('move', () => ops.update(ids, { category: to }).then(() => toast(to ? `已把 ${ids.length} ${unit}移到「${to}」` : `已把 ${ids.length} ${unit}改成未分类`)))
  }
  const tagSelected = mode => {
    const tags = splitTags(tagText)
    if (!tags.length) return
    run('tag', () => ops.update(ids, mode === 'add' ? { addTags: tags } : { removeTags: tags }).then(() => toast(mode === 'add' ? `已给 ${ids.length} ${unit}加上「${tags.join('、')}」` : `已从 ${ids.length} ${unit}去掉「${tags.join('、')}」`)))
  }
  const removeSelected = async () => {
    if (!(await confirmBox(`删掉选中的 ${ids.length} ${unit}？存进 FlowGal 的音频一起删，电脑上的原文件不受影响。`, { ok: '删除', danger: true }))) return
    run('del', () => ops.remove(ids).then(() => { setSelected(new Set()); toast(`已删除 ${ids.length} ${unit}`) }))
  }
  const named = cat && cat !== NO_CAT
  const inCat = named ? pool.filter(it => underCat(it, cat)) : []
  const renameCat = to => {
    const name = String(to || '').trim().split(/[\\/]/).map(s => s.trim()).filter(Boolean).slice(0, 2).join('/')
    if (!name || name === cat) { setRenaming(false); return }
    run('rename', () => ops.rename(cat, name, kind).then(() => { setCat(name); toast(`「${cat}」改名为「${name}」`) }))
  }
  const removeCat = async () => {
    if (!(await confirmBox(`把「${cat}」这一类的 ${inCat.length} ${unit}都删掉${cat.includes('/') ? '' : '（连子分类）'}？存进 FlowGal 的音频一起删，电脑上的原文件不受影响。`, { ok: '删除', danger: true }))) return
    run('delcat', () => ops.remove(inCat.map(it => it.id)).then(() => { setCat(''); toast(`已删除「${cat}」这一类`) }))
  }

  const catButton = (value, label, n, sub = false) => (
    <button key={value || '*'} type="button" className={`fg-libcat${sub ? ' is-sub' : ''}${cat === value ? ' is-on' : ''}`} title={label} onClick={() => setCat(value)}>
      <span>{label}</span><i>{n}</i>
    </button>
  )
  const shown = list.slice(0, limit)
  return (
    <div className="fg-lib">
      <datalist id={listId}>{allCats.map(c => <option key={c} value={c} />)}</datalist>
      <nav className="fg-lib-tree">
        {catButton('', '全部', pool.length)}
        {tree.tops.map(t => (
          <React.Fragment key={t.name}>
            {catButton(t.name, t.name, t.n)}
            {(cat === t.name || cat.startsWith(t.name + '/')) && t.subs.map(([sub, n]) => catButton(`${t.name}/${sub}`, sub, n, true))}
          </React.Fragment>
        ))}
        {tree.none > 0 && catButton(NO_CAT, '未分类', tree.none)}
      </nav>
      <div className="fg-lib-main">
        <div className="fg-row fg-lib-tools">
          <input className="fg-input fg-lib-search" value={query} placeholder="搜索名字、分类、标签、描述、文件名（空格隔开几个词）" onChange={e => setQuery(e.target.value)} onKeyDown={e => e.stopPropagation()} />
          {kinds && <Select value={kind} options={kinds} style={INLINE} onChange={setKind} />}
          <Select value={filter} options={LIB_FILTERS} style={INLINE} onChange={setFilter} />
          <Select value={sort} options={LIB_SORTS} style={INLINE} onChange={setSort} />
        </div>
        {named && (
          <div className="fg-row fg-lib-cathead">
            {renaming
              ? <><span className="fg-note">「{cat}」改名为</span><Text value={cat} list={listId} style={{ flex: 1, width: 'auto' }} onCommit={renameCat} /><button type="button" className="fg-btn is-mini" onClick={() => setRenaming(false)}>取消</button></>
              : <><b>{cat}</b><span className="fg-note">{inCat.length} {unit}</span><span className="fg-spacer" />
                <button type="button" className="fg-btn is-mini" disabled={Boolean(busy)} title="子分类跟着走；改成已有的分类名就是并进去" onClick={() => setRenaming(true)}>改名</button>
                <button type="button" className="fg-btn is-mini fg-danger" disabled={Boolean(busy)} onClick={removeCat}>删除这一类</button></>}
          </div>
        )}
        <div className="fg-row fg-lib-count">
          <label className="fg-row"><input type="checkbox" checked={allPicked} disabled={!list.length} onChange={pickAll} /><span className="fg-note">全选这 {list.length} {unit}</span></label>
          <span className="fg-spacer" />
          <span className="fg-note">按住 Shift 点勾选框能连着选一串；点名字展开编辑</span>
        </div>
        {!list.length && <div className="fg-note fg-lib-empty">{pool.length ? '没有符合条件的。' : '还是空的。'}</div>}
        {shown.map((it, i) => (
          <React.Fragment key={it.id}>
            <div className={`fg-librow${selected.has(it.id) ? ' is-picked' : ''}${open === it.id ? ' is-open' : ''}`}>
              <input type="checkbox" checked={selected.has(it.id)} onChange={() => {}} onClick={e => pick(i, e)} aria-label={`选中 ${it.name}`} />
              <button type="button" className={`fg-librow-play${playing === it.id ? ' is-on' : ''}`} title={playing === it.id ? '停止试听' : '试听'} onClick={() => onPlay(it)}>{playing === it.id ? '■' : '▶'}</button>
              <button type="button" className="fg-librow-main" title={open === it.id ? '收起' : '点开编辑'} onClick={() => setOpen(o => (o === it.id ? '' : it.id))}>
                <b>{it.name}</b>
                <span>{summary(it)}</span>
              </button>
              <button type="button" className={`fg-libchip${catOf(it) ? '' : ' is-none'}`} title="只看这一类" onClick={() => setCat(catOf(it) || NO_CAT)}>{catOf(it) || '未分类'}</button>
              <span className="fg-librow-size" title={it.file}>{rowSize(it.bytes || 0)}</span>
            </div>
            {open === it.id && <div className="fg-libedit">{editor(it)}</div>}
          </React.Fragment>
        ))}
        {list.length > limit && <button type="button" className="fg-btn fg-lib-more" onClick={() => setLimit(n => n + LIB_PAGE_SIZE)}>再显示 {Math.min(LIB_PAGE_SIZE, list.length - limit)} {unit}（还有 {list.length - limit} {unit}没列出来）</button>}
        {ids.length > 0 && (
          <div className="fg-lib-bar">
            <div className="fg-row">
              <b>已选 {ids.length} {unit}</b>
              <span className="fg-spacer" />
              <button type="button" className="fg-btn is-mini fg-danger" disabled={Boolean(busy)} onClick={removeSelected}>删除</button>
              <button type="button" className="fg-btn is-mini" onClick={() => setSelected(new Set())}>取消选择</button>
            </div>
            <div className="fg-row">
              <span className="fg-note">移到分类</span>
              <input className="fg-input" list={listId} style={{ flex: 1, width: 'auto' }} value={moveTo} placeholder="两层用 / 隔开，比如 日常/校园；空着就是未分类" onChange={e => setMoveTo(e.target.value)} onKeyDown={e => { e.stopPropagation(); if (e.key === 'Enter') moveSelected() }} />
              <button type="button" className="fg-btn is-mini" disabled={Boolean(busy)} onClick={moveSelected}>移过去</button>
            </div>
            <div className="fg-row">
              <span className="fg-note">标签</span>
              <input className="fg-input" style={{ flex: 1, width: 'auto' }} value={tagText} placeholder="一个或几个标签，用顿号或空格隔开" onChange={e => setTagText(e.target.value)} onKeyDown={e => { e.stopPropagation(); if (e.key === 'Enter') tagSelected('add') }} />
              <button type="button" className="fg-btn is-mini" disabled={Boolean(busy) || !tagText.trim()} onClick={() => tagSelected('add')}>都加上</button>
              <button type="button" className="fg-btn is-mini" disabled={Boolean(busy) || !tagText.trim()} onClick={() => tagSelected('remove')}>都去掉</button>
            </div>
            {extras && extras({ ids, run, busy })}
          </div>
        )}
      </div>
    </div>
  )
}


/**
 * 配乐页的「导演怎么挑」：每轮给导演看几首，和「先听一遍」（跟音效库、环境音库是同一个开关）。
 * 曲子没超过这个数时全给导演看；超过了，开着先听一遍就先让听音师说这一轮该放什么样的音乐、照它找，关着只按分组轮流挑。
 */
function MusicPicking({ cfg, count }) {
  const quota = cfg.director.musicCandidates
  const listen = cfg.director.listen
  const pd = patch => patchConfig({ director: patch }).catch(e => toast(e.message, 'error'))
  const state = count <= quota
    ? `现在曲库有 ${count} 首，没超过 ${quota}：每轮整张曲目表都给导演看，不用找。`
    : listen
      ? `现在曲库有 ${count} 首，比 ${quota} 多：每轮导演之前先让听音师读一遍正文，说出这一轮该放什么样的音乐（情绪、场面、节奏），拿这些词去对每首的标签、描述、曲名和分类，最像的先给导演看（最多占三分之二）；剩下的名额按分类轮流挑，保证各种情绪都有。`
      : `现在曲库有 ${count} 首，比 ${quota} 多：每轮按分类的第一层（没分类的按第一个标签）分组轮流挑 ${quota} 首，正文和上一幕基调里出现的标签、曲名优先。分类随手分的话容易挑不准，建议开着「先听一遍」。`
  return (
    <>
      <div className="fg-section">导演怎么挑</div>
      <div className="fg-note">{state}</div>
      <Field label="每轮候选" hint="后台导演每一轮能看到几首（编号、曲名、描述、分类和标签各一行，每首大约一百字）。曲库没超过这个数时全给它看。填得很大时提示词会很长，超出模型窗口时先缩人物卡资料。">
        <div className="fg-row"><Text type="number" style={{ width: '7cqw' }} value={quota} onCommit={v => { const n = Math.trunc(Number(v)); if (n >= 1) pd({ musicCandidates: n }) }} /><span className="fg-note">首，最多 5000（填到曲库的首数就是整张都给）</span></div>
      </Field>
      <Field label="先听一遍" hint="曲子比候选多时，导演之前先让听音师读一遍这一轮正文，说出该放什么样的音乐（开头的基调，中途情绪转折再各一段），连同找它们的词（会参照曲库里常用的标签）。候选照它说的去对标签和描述，跟你怎么分类没关系。每轮多一次模型调用（跟音效共用这一次），听音师的模型在「导演」页换，提示词在「提示词 → 听音师」里改。它出错时退回按分组轮流挑。音效库、环境音库和配乐共用这一个开关。">
        <Toggle value={listen} onChange={v => pd({ listen: v })} />
      </Field>
    </>
  )
}

/** 配乐页：开关音量、导演怎么挑、导入整个音乐文件夹（带上里面的描述文件）、按分类整理、导出描述、清空。 */
function MusicSection({ data }) {
  const cfg = data.config
  const tracks = useMusic()
  const [playing, setPlaying] = React.useState('')
  const [progress, setProgress] = React.useState('')
  const [clearing, setClearing] = React.useState(false) // 清空曲库：确认那一行开着
  const [busy, run] = useBusy()
  const folderRef = React.useRef(null)
  const filesRef = React.useRef(null)
  const p = patch => patchConfig({ ui: patch }).catch(e => toast(e.message, 'error'))
  React.useEffect(() => () => stopPreview(), [])

  const play = track => {
    if (playing === track.id) { stopPreview(); return }
    previewTrack({ id: track.id, url: assetUrl(track.assetId) }, () => setPlaying(id => (id === track.id ? '' : id)))
    setPlaying(track.id)
  }

  /**
   * 逐首上传；文件夹里有描述文件时（子文件夹里各有一份也行），按文件名把曲名、分类、描述、标签写上（描述文件优先）。
   * 描述文件没写分类、曲子也还没分类的，用所在的子文件夹当分类。
   */
  const importFiles = async list => {
    const files = [...(list || [])]
    if (!files.length) return
    const meta = new Map()
    for (const sidecar of files.filter(f => f.name === MUSIC_SIDECAR)) {
      try { for (const [file, m] of readSidecar(await sidecar.text())) meta.set(file, m) } catch (e) { toast(`${sidecar.webkitRelativePath || sidecar.name} 没读成：${e.message}。这份先不用`, 'error') }
    }
    const audio = files.filter(f => AUDIO_FILE.test(f.name)).sort((a, b) => (a.webkitRelativePath || a.name).localeCompare(b.webkitRelativePath || b.name, 'zh-CN', { numeric: true }))
    if (!audio.length) { toast('没找到音频文件（mp3、m4a、aac、ogg、opus、wav、flac）', 'error'); return }
    const failed = []
    let described = 0
    for (let i = 0; i < audio.length; i++) {
      const file = audio[i]
      setProgress(`导入中 ${i + 1} / ${audio.length}：${file.name}`)
      try {
        const track = await api.uploadTrack(file)
        const m = meta.get(file.name)
        const folder = folderCategory(file)
        const patch = { ...(m || {}), ...(folder && !track.category && (!m || m.category === undefined) ? { category: folder } : {}) }
        if (Object.keys(patch).length) await api.updateTrack(track.id, patch)
        if (m) described++
      } catch (e) {
        failed.push(`${file.name}：${e.message}`)
      }
    }
    setProgress('')
    await loadMusic().catch(() => {})
    const done = audio.length - failed.length
    toast(`导入了 ${done} 首${described ? `，其中 ${described} 首带上了描述` : ''}${failed.length ? `；${failed.length} 首失败：${failed.slice(0, 3).join('；')}` : ''}`, failed.length ? 'error' : undefined)
  }

  const exportSidecar = () => saveText(writeSidecar(tracks || []), MUSIC_SIDECAR)

  // 清空曲库：重新选曲时一次删光，曲目表和存进来的音频一起删，电脑上的原文件不动。
  const totalBytes = (tracks || []).reduce((n, t) => n + (t.bytes || 0), 0)
  const clearAll = () => run('clear', async () => {
    stopPreview()
    setPlaying('')
    const { cleared } = await api.clearMusic()
    await loadMusic().catch(() => {})
    setClearing(false)
    toast(`已清空曲库：删掉 ${cleared.tracks} 首${cleared.failed ? `；${cleared.failed} 个文件没删掉（可能正被占用），曲库里已经没有它们了` : ''}`, cleared.failed ? 'error' : undefined)
  })
  const ops = {
    update: (ids, patch) => api.updateTracks(ids, patch).then(() => loadMusic()),
    remove: ids => { if (ids.includes(playing)) stopPreview(); return api.removeTracks(ids).then(() => loadMusic()) },
    rename: (from, to) => api.renameMusicCategory(from, to).then(() => loadMusic()),
  }

  return (
    <>
      <div className="fg-section">播放</div>
      <Field label="配乐"><div className="fg-row"><Toggle value={cfg.ui.bgm} onChange={v => p({ bgm: v })} /><input type="range" min="0" max="1" step="0.05" value={cfg.ui.bgmVolume} onChange={e => p({ bgmVolume: Number(e.target.value) })} style={{ flex: 1 }} /></div></Field>
      <MusicPicking cfg={cfg} count={(tracks || []).length} />
      <div className="fg-section">我的曲库{tracks ? ` · ${tracks.length} 首` : ''}</div>
      <div className="fg-note">后台导演整理每一轮时会读到每首的分类、描述和标签，自己决定这一幕放哪首、哪句话换歌。描述随便写：听感、乐器、适合的场面和情绪都行，越具体导演选得越准。导演还没整理完的轮次会先按描述粗配一首。分类怎么分都行（按游戏、专辑、心情都可以），只用来整理；曲子多的时候导演看到哪些主要靠标签和描述，标签建议写上情绪（日常、温馨、甜蜜、感伤、紧张、悬疑、诡异、战斗、热血、壮阔、滑稽）、场面（校园、夜晚、追逐、告白、回忆）和节奏乐器（舒缓、快节奏、钢琴、弦乐）。</div>
      <div className="fg-row" style={{ margin: '1cqw 0' }}>
        <button type="button" className="fg-btn is-primary" disabled={Boolean(progress)} onClick={() => folderRef.current && folderRef.current.click()}>导入文件夹</button>
        <button type="button" className="fg-btn" disabled={Boolean(progress)} onClick={() => filesRef.current && filesRef.current.click()}>添加曲子</button>
        <button type="button" className="fg-btn" disabled={!tracks || !tracks.some(t => t.file)} onClick={exportSidecar}>导出描述</button>
        {!clearing && <button type="button" className="fg-btn fg-danger" disabled={!tracks || !tracks.length || Boolean(progress)} title="把整个曲库删光，重新选曲" onClick={() => setClearing(true)}>清空曲库</button>}
        {progress && <span className="fg-pill is-busy">{progress}</span>}
        <input ref={folderRef} type="file" webkitdirectory="" multiple hidden onChange={e => { importFiles(e.target.files); e.target.value = '' }} />
        <input ref={filesRef} type="file" accept={`audio/*,${MUSIC_SIDECAR}`} multiple hidden onChange={e => { importFiles(e.target.files); e.target.value = '' }} />
      </div>
      {clearing && tracks && tracks.length > 0 && (
        <div className="fg-row fg-manage">
          <span className="fg-note">删掉曲库里全部 {tracks.length} 首（{fmtBytes(totalBytes)}），分类、描述、标签和存进 FlowGal 的音频一起删；电脑上的原文件不受影响。描述想留着的话先点「导出描述」。</span>
          <span className="fg-spacer" />
          <button type="button" className="fg-btn is-mini fg-danger" disabled={busy === 'clear'} onClick={clearAll}>{busy === 'clear' ? '清空中…' : '确认清空'}</button>
          <button type="button" className="fg-btn is-mini" disabled={busy === 'clear'} onClick={() => setClearing(false)}>取消</button>
        </div>
      )}
      <div className="fg-note">导入文件夹时，分了子文件夹的按子文件夹分类（最多两层，「日常/校园」）。文件夹里放一份 <code>{MUSIC_SIDECAR}</code>（就是「导出描述」得到的文件；每个子文件夹各放一份也行），导入时会按文件名自动带上分类和描述；同一首再导入不会重复存，但描述会以这个文件为准。</div>
      {!tracks && <div className="fg-note">读取中…</div>}
      {tracks && !tracks.length && <div className="fg-note" style={{ marginTop: '1cqw' }}>曲库还是空的。没有曲子时剧场不放音乐。</div>}
      {tracks && tracks.length > 0 && <LibBrowser items={tracks} unit="首" listId={MUSIC_LIST} playing={playing} onPlay={play} editor={t => <TrackEditor track={t} />} summary={trackSummary} ops={ops} />}
    </>
  )
}

/** 存成文件让玩家下载（导出描述文件用）。 */
function saveText(text, name) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}

const KIND_LABEL = { ambience: '环境音', blip: '打字音', sfx: '音效' }
/** 推荐用途：「声音」页一键套用时，标了哪个槽就放进哪个槽，标了旁白的打字音给旁白。 */
const USE_OPTIONS = [['', '没有'], ...SOUND_SLOTS.map(s => [s.id, `${s.group === 'ui' ? '界面音' : '落字音效'} · ${s.label}`]), ['narration', '旁白的打字音']]
// 单个声音的音量按分贝拖（-30 dB 到 +24 dB，最左是静音）：能放大到 16 倍，按倍数拖的话 1 倍以下挤在最左边一小段。
const VOLUME_DB = [-30, 20 * Math.log10(MAX_SOUND_VOLUME)]
const volumeDb = v => (v > 0 ? Math.min(VOLUME_DB[1], Math.max(VOLUME_DB[0], 20 * Math.log10(v))) : VOLUME_DB[0])
const dbVolume = db => (db <= VOLUME_DB[0] ? 0 : Math.min(MAX_SOUND_VOLUME, Math.round(10 ** (db / 20) * 100) / 100))
const volumeText = v => (v > 0 ? `${Number(v.toFixed(2))} 倍` : '静音')

const KIND_OPTIONS = [['sfx', '音效（响一次）'], ['ambience', '环境音（循环）'], ['blip', '打字音（一个字一下）']]
const GENDER_OPTIONS = [['', '不分男女'], ['female', '女声'], ['male', '男声']]
const useText = use => (USE_OPTIONS.find(([v]) => v === use) || [])[1] || use
const soundSummary = s => [s.kind === 'blip' ? `打字音 · ${VOICE_GENDER[s.gender || '']}` : (s.tags || []).join('、'), s.use ? `推荐用途：${useText(s.use)}` : '', (s.volume ?? 1) !== 1 ? `音量 ${volumeText(s.volume ?? 1)}` : '', s.description].filter(Boolean).join(' · ') || '（还没有描述和标签）'

/** 展开的一个声音：改名字 / 种类 / 分类 / 音量 / 推荐用途 / 标签 / 描述、删除。 */
function LibSoundEditor({ sound, listId }) {
  const [busy, run] = useBusy()
  const save = patch => run('s', async () => { await api.updateLibSound(sound.id, patch); await loadSoundlib() })
  return (
    <>
      <div className="fg-row">
        <Text value={sound.name} style={{ flex: 2, width: 'auto', fontWeight: 600 }} onCommit={v => save({ name: v })} />
        <Text value={catOf(sound)} list={listId} placeholder="分类，两层用 / 隔开：门窗/敲门" style={{ flex: 1, width: 'auto' }} onCommit={v => save({ category: v })} />
        <button type="button" className="fg-btn is-mini fg-danger" disabled={busy === 'd'} onClick={async () => { if (await confirmBox(`从音效库删除「${sound.name}」？电脑上的原文件不受影响。`, { ok: '删除', danger: true })) run('d', async () => { await api.removeLibSounds([sound.id]); await loadSoundlib() }, '已删除') }}>删除</button>
      </div>
      <div className="fg-row">
        <Select value={sound.kind} options={KIND_OPTIONS} style={INLINE} onChange={v => save({ kind: v })} />
        {sound.kind === 'blip' && <Select value={sound.gender || ''} options={GENDER_OPTIONS} style={INLINE} onChange={v => save({ gender: v })} />}
        <span className="fg-note">音量</span>
        <input type="range" min={VOLUME_DB[0]} max={VOLUME_DB[1]} step="any" value={volumeDb(sound.volume ?? 1)} onChange={e => save({ volume: dbVolume(Number(e.target.value)) })} style={{ width: '8cqw' }} />
        <span className="fg-note">{volumeText(sound.volume ?? 1)}</span>
      </div>
      <div className="fg-row">
        <span className="fg-note">推荐用途</span>
        <Select value={sound.use || ''} options={USE_OPTIONS} style={INLINE} onChange={v => save({ use: v })} />
        <span className="fg-note">「声音」页一键套用时用</span>
      </div>
      {sound.kind !== 'blip' && <Text value={(sound.tags || []).join('、')} placeholder="标签：正文里会出现的词，用顿号隔开。导演按它们挑候选，例如：敲门、咚咚、门" style={{ width: '100%' }} onCommit={v => save({ tags: v })} />}
      <TextArea value={sound.description} placeholder="听起来什么样、什么时候用。例如：木门被轻轻敲了两下，礼貌、迟疑" onCommit={v => save({ description: v })} />
      {sound.file && <div className="fg-note">文件：{sound.file}</div>}
    </>
  )
}

/** 音效库、环境音库勾选后多出来的批量操作：改种类、统一音量，音效库页还有打字音的男女。 */
function SoundBatch({ ids, run, busy, kind }) {
  const [to, setTo] = React.useState(kind === 'sfx' ? 'blip' : 'sfx')
  const [gender, setGender] = React.useState('female')
  const [db, setDb] = React.useState(0)
  const go = (patch, text) => run('batch', async () => { await api.updateLibSounds(ids, patch); await loadSoundlib(); toast(text) })
  const pageOf = k => (k === 'ambience' ? 'ambience' : 'sfx')
  const moved = pageOf(to) !== kind ? `，挪到了${LIB_PAGE[pageOf(to)].title}` : ''
  return (
    <>
      <div className="fg-row">
        <span className="fg-note">种类改成</span>
        <Select value={to} options={KIND_OPTIONS} style={INLINE} onChange={setTo} />
        <button type="button" className="fg-btn is-mini" disabled={Boolean(busy)} onClick={() => go({ kind: to }, `已把 ${ids.length} 个改成${KIND_LABEL[to]}${moved}`)}>改</button>
        {kind === 'sfx' && <>
          <span className="fg-note">打字音的男女</span>
          <Select value={gender} options={GENDER_OPTIONS} style={INLINE} onChange={setGender} />
          <button type="button" className="fg-btn is-mini" disabled={Boolean(busy)} onClick={() => go({ gender }, `已把 ${ids.length} 个标成${VOICE_GENDER[gender]}`)}>标上</button>
        </>}
      </div>
      <div className="fg-row">
        <span className="fg-note">音量</span>
        <input type="range" min={VOLUME_DB[0]} max={VOLUME_DB[1]} step="any" value={db} onChange={e => setDb(Number(e.target.value))} style={{ flex: 1 }} />
        <span className="fg-note">{volumeText(dbVolume(db))}</span>
        <button type="button" className="fg-btn is-mini" disabled={Boolean(busy)} onClick={() => go({ volume: dbVolume(db) }, `已把 ${ids.length} 个的音量都设成 ${volumeText(dbVolume(db))}`)}>都设成这个音量</button>
      </div>
    </>
  )
}

/** 亲密场面（lib/eros.js）：开关，和一排合成兜底音的试听（节奏底、触手、高潮、一下一下的音效）。声音先用音效库里的，音量跟剧情音效走。 */
function ErosField({ cfg, p }) {
  const [open, setOpen] = React.useState(false)
  const volume = (cfg.ui.storySfxVolume ?? 0.8) / 0.8
  const row = { gap: '.5cqw', marginTop: '.6cqw' }
  return (
    <Field label="亲密场面" hint="成年人之间的亲密戏。声音先用这个音效库里的：插入、射精、触手这些一下一下的，导演从候选里挑；一直在响的节奏底也直接循环库里十秒以上的录音（抽插、套弄、触手蠕动，按快慢换，描述里写上「约 1 分钟」这样的时长才认得出多长）。库里找不到合适的，才用剧场现场合成的兜底，「试听合成的」听的就是这些。画面跟着节奏：边上泛起潮红，有触手时边上有暗影在动；高潮时画面柔和地白一下，射精时一下一下地亮；用合成的节奏时镜头还跟着每一下轻轻地送。正文里的 [SE：…] 提示和日文拟声（ぬぷ、こつん、どくどく……）也认得。音量跟剧情音效走，画面上不出字。">
      <div className="fg-row"><Toggle value={cfg.ui.eros} onChange={v => p({ eros: v })} /><button type="button" className="fg-btn" onClick={() => setOpen(v => !v)}>{open ? '收起试听' : '试听合成的'}</button></div>
      {open && (
        <>
          <div className="fg-row" style={row}>
            {EROS_PACES.filter(k => k !== 'none').map(k => <button key={k} type="button" className="fg-btn" onClick={() => previewEros(k, '', volume)}>{EROS_LABEL[k]}</button>)}
            {TENTACLE.filter(k => k !== 'none').map(k => <button key={k} type="button" className="fg-btn" onClick={() => previewEros('', k, volume)}>{TENTACLE_LABEL[k]}</button>)}
            {PEAKS.map(k => <button key={k} type="button" className="fg-btn" onClick={() => erosPeak(k, volume)}>{PEAK_LABEL[k]}</button>)}
          </div>
          <div className="fg-row" style={row}>
            {Object.keys(EROS_SFX).map(name => <button key={name} type="button" className="fg-btn" onClick={() => erosFoley(EROS_SFX[name].id, volume)}>{name}</button>)}
          </div>
        </>
      )}
    </Field>
  )
}

// 音效库和环境音库各一页：开关音量、导入整个文件夹（带上里面的描述文件）、按分类整理（分类树、搜索、勾选批量改）、试听、逐个改、导出描述、清空。
// 音效库页列音效和打字音，环境音库页列环境音；导演挑候选时本来就分开挑。清空只清这一页的音效或环境音，
// 打字音和「声音」页正在用的（落字音效、界面音的槽，旁白、默认音色）留着。
const LIB_PAGE = {
  sfx: { kinds: ['sfx', 'blip'], title: '音效库', unit: '个音效', filter: [['', '音效和打字音'], ['sfx', '只看音效'], ['blip', '只看打字音']], other: '环境音库', empty: '音效库还是空的。剧情音效先用内置的拟声音效（砰、咚、叮……现场合成）。', note: '推门、手机震动、杯子摔碎这类响一次的声音。库再大也没关系：后台导演整理每一轮时只看几十个候选，再决定哪句配什么音效。候选怎么挑见下面「导演怎么挑」；标签写正文里会出现的说法最稳。' },
  ambience: { kinds: ['ambience'], title: '环境音库', unit: '个环境音', other: '音效库', empty: '环境音库还是空的。没有环境音时剧场不放环境音。', note: '雨声、蝉鸣、车站广播这类循环的底。后台导演整理每一轮时从一批候选里给每一幕挑一个，跨轮沿用。候选怎么挑见下面「导演怎么挑」；标签写地点、天气、时段这类词最管用。' },
}

/**
 * 导演怎么挑候选：每轮给导演看几个（这一页的种类），和「先听一遍」（音效库、环境音库两页是同一个开关）。
 * 库没超过名额时全给导演看，用不着找；超过了，开着先听一遍就先让听音师列出听得见的声音、照它找，关着只按正文对词。
 */
function PickingFields({ cfg, kind, count }) {
  const quota = cfg.director.soundCandidates[kind]
  const listen = cfg.director.listen
  const pd = patch => patchConfig({ director: patch }).catch(e => toast(e.message, 'error'))
  const word = KIND_LABEL[kind]
  const state = count <= quota
    ? `现在${word}有 ${count} 个，没超过 ${quota}：每轮全给导演看，不用找。`
    : listen
      ? `现在${word}有 ${count} 个，比 ${quota} 多：每轮导演之前先听一遍，照听到的声音找，剩下的名额按正文对词补。`
      : `现在${word}有 ${count} 个，比 ${quota} 多：每轮按正文对词挑 ${quota} 个（标签、名字、分类要在正文里原样出现）。`
  return (
    <>
      <div className="fg-section">导演怎么挑</div>
      <div className="fg-note">{state}</div>
      <Field label="每轮候选" hint={`后台导演每一轮能看到几个${word}（编号、名字、分类和描述各一行，越多提示词越长）。库没超过这个数时全给它看。`}>
        <div className="fg-row"><Text type="number" style={{ width: '7cqw' }} value={quota} onCommit={v => { const n = Math.trunc(Number(v)); if (n >= 1) pd({ soundCandidates: { [kind]: n } }) }} /><span className="fg-note">个，最多 300</span></div>
      </Field>
      <Field label="先听一遍" hint={'库比候选多时，导演之前先让听音师读一遍这一轮正文，列出听得见的声音和找它们的近义词（「砸了杯子」会去找摔碎、打碎、玻璃……），候选照它列的找，正文里没有原词的声音也找得到。每轮多一次模型调用，会慢一点；听音师可以在「导演」页单独换个便宜、快的模型，提示词在「提示词 → 听音师」里改。它出错时退回按正文对词，导演照常整理。音效库、环境音库和配乐共用这一个开关。'}>
        <Toggle value={listen} onChange={v => pd({ listen: v })} />
      </Field>
    </>
  )
}

function SoundLibSection({ data, kind = 'sfx' }) {
  const cfg = data.config
  const page = LIB_PAGE[kind]
  const all = useSoundlib()
  const sounds = React.useMemo(() => (all ? all.filter(s => page.kinds.includes(s.kind || 'sfx')) : null), [all, page])
  const otherKind = kind === 'sfx' ? 'ambience' : 'sfx'
  const [playing, setPlaying] = React.useState('')
  const [progress, setProgress] = React.useState('')
  const [clearing, setClearing] = React.useState(false) // 清空这一库：确认那一行开着
  const [busy, run] = useBusy()
  const folderRef = React.useRef(null)
  const p = patch => patchConfig({ ui: patch }).catch(e => toast(e.message, 'error'))
  React.useEffect(() => () => stopPreview(), [])
  React.useEffect(() => { setClearing(false) }, [kind])

  const play = s => {
    if (playing === s.id) { stopPreview(); return }
    previewTrack({ id: s.id, url: assetUrl(s.assetId), volume: 0.7 * (s.volume ?? 1) }, () => setPlaying(id => (id === s.id ? '' : id)))
    setPlaying(s.id)
  }

  /**
   * 逐个导入；文件夹里的描述文件（可以有好几份）按相对路径给每个声音带上名字、种类、分类、描述、标签。已经在库里的只更新描述。
   * 种类按描述文件写的；描述文件没写的，算这一页的（在环境音库导入的就是环境音）。
   */
  const importFiles = async list => {
    const files = [...(list || [])]
    if (!files.length) return
    const pathOf = f => f.webkitRelativePath || f.name
    const sidecars = []
    for (const f of files.filter(f => f.name === SOUND_SIDECAR)) {
      try { sidecars.push({ path: pathOf(f), map: readSoundSidecar(await f.text()) }) } catch (e) { toast(`${pathOf(f)} 没读成：${e.message}`, 'error') }
    }
    const match = soundMatcher(sidecars)
    const audio = files.filter(f => AUDIO_FILE.test(f.name)).sort((a, b) => pathOf(a).localeCompare(pathOf(b), 'zh-CN', { numeric: true }))
    if (!audio.length) { toast('没找到音频文件（mp3、m4a、aac、ogg、opus、wav、flac）', 'error'); return }
    const have = new Map((all || []).map(s => [`${s.file}|${s.bytes}`, s]))
    const failed = []
    let added = 0, updated = 0, useful = 0, elsewhere = 0
    for (let i = 0; i < audio.length; i++) {
      const f = audio[i]
      const { file, meta } = match(pathOf(f))
      if (meta && (meta.use || meta.kind === 'blip')) useful++
      setProgress(`导入中 ${i + 1} / ${audio.length}：${file}`)
      try {
        const old = have.get(`${file}|${f.size}`)
        if (old) { if (meta) { await api.updateLibSound(old.id, meta); updated++ } continue }
        const sound = await api.uploadLibSound(f, file, { kind, ...(meta || {}) })
        added++
        if (sound && !page.kinds.includes(sound.kind)) elsewhere++
      } catch (e) {
        failed.push(`${file}：${e.message}`)
      }
    }
    setProgress('')
    await loadSoundlib().catch(() => {})
    toast(`新导入 ${added} 个${elsewhere ? `（其中 ${elsewhere} 个描述文件写的是${KIND_LABEL[otherKind]}，放进了${LIB_PAGE[otherKind].title}）` : ''}${updated ? `，更新了 ${updated} 个的描述` : ''}${failed.length ? `；${failed.length} 个失败：${failed.slice(0, 3).join('；')}` : ''}${useful && !failed.length ? '。里面有打字音和标了用途的声音，到「声音」页可以一键套用' : ''}`, failed.length ? 'error' : undefined)
  }

  const ops = {
    update: (ids, patch) => api.updateLibSounds(ids, patch).then(() => loadSoundlib()),
    remove: ids => { if (ids.includes(playing)) stopPreview(); return api.removeLibSounds(ids).then(() => loadSoundlib()) },
    rename: (from, to, only) => api.renameLibCategory(from, to, only ? [only] : page.kinds).then(() => loadSoundlib()),
  }
  const listId = `fg-lib-cats-${kind}`
  // 清空这一库：重新整理时一次删光，只删这一种，另一库不动；电脑上的原文件不动。打字音和「声音」页正在用的留着（服务端也按设置留）。
  const inUse = new Set([...Object.values(cfg.ui.sounds || {}), cfg.ui.narrationVoice, cfg.ui.voiceDefault].map(libIdOf).filter(Boolean))
  const doomed = (sounds || []).filter(s => s.kind === kind && !inUse.has(s.id))
  const kept = { blips: (sounds || []).filter(s => s.kind === 'blip').length, used: (sounds || []).filter(s => s.kind === kind && inUse.has(s.id)).length }
  const totalBytes = doomed.reduce((n, s) => n + (s.bytes || 0), 0)
  const clearAll = () => run('clear', async () => {
    stopPreview()
    setPlaying('')
    const { cleared } = await api.clearLibSounds(kind)
    await loadSoundlib().catch(() => {})
    setClearing(false)
    toast(`已清空${page.title}：删掉 ${cleared.sounds} 个${cleared.kept ? `，留着「声音」页正在用的 ${cleared.kept} 个` : ''}${cleared.failed ? `；${cleared.failed} 个文件没删掉（可能正被占用），库里已经没有它们了` : ''}`, cleared.failed ? 'error' : undefined)
  })

  return (
    <>
      <div className="fg-section">播放</div>
      {kind === 'ambience' && <Field label="环境音" hint="雨声、蝉鸣、车站的嘈杂……导演按地点、天气给每一幕配，循环播放。"><div className="fg-row"><Toggle value={cfg.ui.amb} onChange={v => p({ amb: v })} /><input type="range" min="0" max="1" step="0.05" value={cfg.ui.ambVolume} onChange={e => p({ ambVolume: Number(e.target.value) })} style={{ flex: 1 }} /></div></Field>}
      {kind === 'sfx' && <Field label="剧情音效" hint="推门、手机震动、杯子摔碎……导演给正文里写到的声音配，读到那句时响一次。音效库里没有合适的（或者库是空的）时，用内置的拟声音效：砰、咚、叮、哗、咔嚓、轰……现场合成。"><div className="fg-row"><Toggle value={cfg.ui.storySfx} onChange={v => p({ storySfx: v })} /><input type="range" min="0" max="2" step="0.05" value={cfg.ui.storySfxVolume} onChange={e => p({ storySfxVolume: Number(e.target.value) })} style={{ flex: 1 }} /></div></Field>}
      {kind === 'sfx' && <ErosField cfg={cfg} p={p} />}
      <PickingFields cfg={cfg} kind={kind} count={(sounds || []).filter(s => s.kind === kind).length} />
      <div className="fg-section">我的{page.title}{sounds ? ` · ${sounds.length} 个` : ''}</div>
      <div className="fg-note">{page.note}</div>
      <div className="fg-row" style={{ margin: '1cqw 0' }}>
        <button type="button" className="fg-btn is-primary" disabled={Boolean(progress)} onClick={() => folderRef.current && folderRef.current.click()}>导入文件夹</button>
        <button type="button" className="fg-btn" disabled={!sounds || !sounds.some(s => s.file)} onClick={() => saveText(writeSoundSidecar(sounds || []), SOUND_SIDECAR)}>导出描述</button>
        {!clearing && <button type="button" className="fg-btn fg-danger" disabled={!doomed.length || Boolean(progress)} title={`把${page.title}删光，重新整理；${page.other}${kind === 'sfx' ? '、打字音' : ''}和「声音」页正在用的不动`} onClick={() => setClearing(true)}>清空{page.title}</button>}
        {progress && <span className="fg-pill is-busy">{progress}</span>}
        <input ref={folderRef} type="file" webkitdirectory="" multiple hidden onChange={e => { importFiles(e.target.files); e.target.value = '' }} />
      </div>
      {clearing && doomed.length > 0 && (
        <div className="fg-row fg-manage">
          <span className="fg-note">删掉{page.title}里的 {doomed.length} {page.unit}（{fmtBytes(totalBytes)}），名字、分类、标签和存进 FlowGal 的音频一起删；{page.other}不动{kept.blips ? `，${kept.blips} 个打字音留着` : ''}{kept.used ? `，「声音」页正在用的 ${kept.used} 个留着` : ''}，电脑上的原文件也不受影响。描述想留着的话先点「导出描述」。</span>
          <span className="fg-spacer" />
          <button type="button" className="fg-btn is-mini fg-danger" disabled={busy === 'clear'} onClick={clearAll}>{busy === 'clear' ? '清空中…' : '确认清空'}</button>
          <button type="button" className="fg-btn is-mini" disabled={busy === 'clear'} onClick={() => setClearing(false)}>取消</button>
        </div>
      )}
      <div className="fg-note">文件夹最上面放一份 <code>{SOUND_SIDECAR}</code>（就是「导出描述」得到的文件，子文件夹里也可以各放一份），导入时按路径自动带上名字、种类、分类和标签（打字音还有男声 / 女声，以及推荐用途）；没有描述文件时名字取文件名、分类取所在的文件夹（最多两层），在这一页导入的算{KIND_LABEL[kind]}。同一个文件再导入不会重复存，但描述会以描述文件为准。{kind === 'sfx' ? '种类是「打字音」的不给导演用，而是出现在「声音」页和人物档案的音色里。' : ''}</div>
      {!sounds && <div className="fg-note">读取中…</div>}
      {sounds && !sounds.length && <div className="fg-note" style={{ marginTop: '1cqw' }}>{page.empty}</div>}
      {sounds && sounds.length > 0 && (
        <LibBrowser key={kind} items={sounds} unit="个" kinds={page.filter || null} listId={listId} playing={playing} onPlay={play} ops={ops}
          editor={s => <LibSoundEditor sound={s} listId={listId} />} summary={soundSummary}
          extras={args => <SoundBatch {...args} kind={kind} />} />
      )}
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
    <Panel title="设置" en="Config" onClose={onClose} tabs={[{ id: 'look', label: '外观与演出' }, { id: 'effects', label: '特效' }, { id: 'sound', label: '声音' }, { id: 'music', label: '配乐' }, { id: 'soundlib', label: '音效库' }, { id: 'ambience', label: '环境音库' }, { id: 'director', label: '导演' }, { id: 'prompts', label: '提示词' }, { id: 'images', label: '生图渠道' }, { id: 'style', label: '画风与配图' }, { id: 'about', label: '版本与更新' }]} tab={tab} onTab={setTab}
      actions={data && <span className={`fg-pill${data.ready ? '' : ' fg-err'}`}>{data.ready ? '生图已就绪' : data.readyReason}</span>}>
      {!data && <div className="fg-note">读取设置中…</div>}
      {data && tab === 'look' && <LookSection data={data} />}
      {data && tab === 'effects' && <EffectsSection data={data} />}
      {data && tab === 'sound' && <SoundSection data={data} />}
      {data && tab === 'music' && <MusicSection data={data} />}
      {data && tab === 'soundlib' && <SoundLibSection data={data} kind="sfx" />}
      {data && tab === 'ambience' && <SoundLibSection data={data} kind="ambience" />}
      {data && tab === 'director' && <DirectorSection data={data} onDirectorLog={onDirectorLog} onTab={setTab} />}
      {data && tab === 'prompts' && <PromptBook onTab={setTab} />}
      {data && tab === 'images' && <BackendSection data={data} />}
      {data && tab === 'style' && <><StyleSection data={data} /><ImagesSection data={data} /></>}
      {data && tab === 'about' && <UpdateSection data={data} />}
      {data && <div className="fg-note" style={{ marginTop: '2cqw' }}>{hostName() === 'st' ? <>Key 存在{data.secretStorage}，出图时由这个页面直接带去请求；别把酒馆的数据文件夹发给别人。</> : <>Key 只存在 DSH 宿主（优先存进 DSH 凭据库：{data.secretStorage}），浏览器只看得到「有没有填」。</>}</div>}
    </Panel>
  )
}

export { MOOD_LABEL, WEATHER_LABEL }
