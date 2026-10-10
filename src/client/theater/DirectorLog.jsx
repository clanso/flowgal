// 导演日志：后台导演每次整理的完整记录，以及立绘设计师、插画分镜师每次写提示词的记录。
// 正在跑的那次实时滚动模型输出（有思考就一起显示），可以中途停止；
// 历史记录能看实际发出去的提示词、每次尝试的原始输出 / 用量 / 报错，以及解析后逐句的演出标注。
import React from 'react'
import { api, toast, useDirectorLog, hostName } from '../api.js'
import { Panel } from './Panels.jsx'
import { formatLook } from '../../../lib/look.js'
import { emotionLabel, TIME_LABEL, WEATHER_LABEL, MOOD_LABEL, CARD_LABEL, POS_LABEL, CAMERA_LABEL, SYMBOL_LABEL, TRANSITION_LABEL } from './playback.js'

/** 导演写的外貌：新版是字段，老日志里是一整串。 */
const lookText = v => (typeof v === 'string' ? v : v ? formatLook(v) : '')

const STATUS = { running: ['进行中', 'is-running'], ok: ['完成', 'is-ok'], failed: ['失败', 'is-failed'], cancelled: ['已停止', 'is-cancelled'] }
const REASON = { auto: '正文写完后自动整理', force: '手动重新整理', sprite: '写立绘提示词', cg: '写插画提示词' }
const WRITER = { ai: '模型写的', fallback: '按档案拼的', user: '玩家改的' }
// 宿主在启动后才定（酒馆版换了传输），所以现取
const sourceLabel = source => ({ tavern: hostName() === 'st' ? '跟着酒馆当前的连接' : '跟随 Tavern 后台模型', plugin: '插件设置里指定' })[source]
const USAGE_LABEL = { inputTokens: '输入', outputTokens: '输出', reasoningTokens: '思考', cachedInputTokens: '缓存命中', cacheReadTokens: '缓存读', cacheWriteTokens: '缓存写', totalTokens: '合计' }
const SHAPE_LABEL = { landscape: '横版', portrait: '竖版', square: '方形' }
/** 一条记录的标题：导演按轮次，立绘按人，插画按轮次。 */
const entryTitle = e => (e.kind === 'sprite' ? `立绘 · ${e.name}` : e.kind === 'cg' ? `插画 · 第 ${e.turn} 轮` : `第 ${e.turn} 轮`)

const num = n => Number(n || 0).toLocaleString('en-US')
const secs = ms => (ms >= 60000 ? `${Math.floor(ms / 60000)} 分 ${Math.round((ms % 60000) / 1000)} 秒` : `${(ms / 1000).toFixed(1)} 秒`)
const clock = at => new Date(at).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })
const usageText = usage => Object.entries(usage || {}).map(([k, v]) => `${USAGE_LABEL[k] || k} ${num(v)}`).join(' · ')

function useNow(active) {
  const [now, setNow] = React.useState(Date.now())
  React.useEffect(() => {
    if (!active) return undefined
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [active])
  return now
}

function copy(text) {
  try { navigator.clipboard.writeText(text).then(() => toast('已复制'), () => toast('复制失败', 'error')) } catch { toast('复制失败', 'error') }
}

/** 等宽文本块。follow：内容变长时跟到底部（用户往上翻了就不打扰）。 */
function Pre({ text, follow = false, cursor = false, empty = '（空）' }) {
  const ref = React.useRef(null)
  const pinned = React.useRef(true)
  React.useLayoutEffect(() => { if (follow && pinned.current && ref.current) ref.current.scrollTop = ref.current.scrollHeight }, [text, follow])
  return (
    <pre ref={ref} className={`fg-dlog-pre${cursor ? ' has-cursor' : ''}`}
      onScroll={e => { const el = e.currentTarget; pinned.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40 }}>
      {text || <span className="fg-note">{empty}</span>}
    </pre>
  )
}

function Block({ label, text, children, actions }) {
  return (
    <div className="fg-dlog-block">
      <div className="fg-dlog-label">
        <span>{label}</span>
        <span className="fg-spacer" />
        {actions}
        {text != null && <button type="button" className="fg-btn is-mini" onClick={() => copy(text)}>复制</button>}
      </div>
      {children}
    </div>
  )
}

function StatusPill({ status }) {
  const [label, cls] = STATUS[status] || [status, '']
  return <span className={`fg-dlog-status ${cls}`}>{label}</span>
}

function LogRow({ e, on, onClick }) {
  return (
    <button type="button" className={`fg-dlog-row${on ? ' is-on' : ''}`} onClick={onClick}>
      <div className="fg-dlog-row-head"><b>{entryTitle(e)}</b><StatusPill status={e.status} /></div>
      <div className="fg-dlog-row-meta">{clock(e.at)} · {e.status === 'running' ? '进行中' : secs(e.ms)}{e.attempts > 1 ? ` · ${e.attempts} 次尝试` : ''}</div>
      <div className="fg-dlog-row-meta">{e.model || '（没有模型）'}</div>
      {e.summary && <div className="fg-dlog-row-sum">{e.summary}</div>}
      {e.error && <div className="fg-dlog-row-sum fg-err">{e.error}</div>}
    </button>
  )
}

const TYPE_LABEL = { dialogue: '台词', narration: '旁白', thought: '心声' }

function Chip({ k, children }) {
  return <span className="fg-dlog-chip">{k && <i>{k}</i>}{children}</span>
}

/** 解析后的脚本：场景、站位，以及每个正文单元被标成了谁说、什么表情、什么演出。 */
function ScriptView({ script, units }) {
  if (!script) return <div className="fg-note">这次没有得到可用的脚本，看「原始输出」里模型回了什么。</div>
  const s = script.scene
  const tagged = units.filter(u => script.lines[u.id] && Object.keys(script.lines[u.id]).length).length
  const skipped = new Set(script.skip || [])
  return (
    <>
      <Block label="场景">
        <div className="fg-dlog-chips">
          <Chip k="地点">{s.location || '—'}</Chip>
          <Chip k="时段">{TIME_LABEL[s.time] || s.time}</Chip>
          <Chip k="天气">{WEATHER_LABEL[s.weather] || s.weather}</Chip>
          <Chip k="配乐">{MOOD_LABEL[s.mood] || s.mood}</Chip>
          <Chip k="转场">{TRANSITION_LABEL[s.transition] || s.transition}</Chip>
        </div>
        {s.bg && <div className="fg-note">背景提示词：{s.bg}</div>}
      </Block>
      <Block label={`出场 · ${script.cast.length}`}>
        <div className="fg-dlog-chips">
          {script.cast.map(c => <Chip key={c.name} k={POS_LABEL[c.pos] || c.pos}>{c.name}</Chip>)}
          {!script.cast.length && <span className="fg-note">没有人物上场</span>}
        </div>
      </Block>
      <Block label={`逐句标注 · ${tagged} / ${units.length - skipped.size} 句${skipped.size ? ` · 不演 ${skipped.size} 句` : ''}`}>
        <div className="fg-dlog-lines">
          {units.map(u => {
            const l = script.lines[u.id] || {}
            if (skipped.has(u.id)) return (
              <div key={u.id} className="fg-dlog-line is-skipped">
                <span className="fg-dlog-uid">{u.id}</span>
                <div className="fg-dlog-utext">{u.text}</div>
                <div className="fg-dlog-chips"><span className="fg-note">不是故事 · 不演</span></div>
              </div>
            )
            const marks = [
              l.type && <Chip key="type" k="改判">{TYPE_LABEL[l.type] || l.type}</Chip>,
              l.sp && <Chip key="sp" k="说话">{l.sp}{l.as ? `（显示为 ${l.as}）` : ''}</Chip>,
              l.emo && <Chip key="emo" k="情绪">{emotionLabel(l.emo)}</Chip>,
              l.sym && <Chip key="sym" k="符号">{SYMBOL_LABEL[l.sym] || l.sym}</Chip>,
              l.cam && <Chip key="cam" k="镜头">{CAMERA_LABEL[l.cam] || l.cam}</Chip>,
              l.card && <Chip key="card" k="卡片">{CARD_LABEL[l.card] || l.card}</Chip>,
              l.enter && <Chip key="in" k="登场">{l.enter.map(e => e.name + (e.pos ? `（${POS_LABEL[e.pos] || e.pos}）` : '')).join('、')}</Chip>,
              l.exit && <Chip key="out" k="退场">{l.exit.join('、')}</Chip>,
            ].filter(Boolean)
            return (
              <div key={u.id} className={`fg-dlog-line${marks.length ? '' : ' is-plain'}`}>
                <span className="fg-dlog-uid">{u.id}</span>
                <div className="fg-dlog-utext">{(l.type || u.type) === 'dialogue' ? `「${u.text}」` : (l.type || u.type) === 'thought' ? `（${u.text}）` : u.text}</div>
                <div className="fg-dlog-chips">{marks.length ? marks : <span className="fg-note">旁白 · 无演出</span>}</div>
              </div>
            )
          })}
        </div>
      </Block>
      {script.choices.length > 0 && (
        <Block label={`选项 · ${script.choices.length}`}>
          <ol className="fg-dlog-list-plain">{script.choices.map((c, i) => <li key={i}>{c}</li>)}</ol>
        </Block>
      )}
      <Block label={`插画分镜 · ${script.images.length}`}>
        {script.images.map((img, i) => (
          <div key={i} className="fg-dlog-card">
            <div className="fg-dlog-chips"><Chip k="标题">{img.title || '—'}</Chip><Chip k="显示">{img.after}{img.until && img.until !== img.after ? ` → ${img.until}` : img.until ? '' : ' → 本轮结束'}</Chip>{img.who && img.who.length ? <Chip k="入画">{img.who.join('、')}</Chip> : null}{img.shape && <Chip k="画幅">{SHAPE_LABEL[img.shape] || img.shape}</Chip>}</div>
            {img.moment && <div>{img.moment}</div>}
            {img.tags && <div className="fg-dlog-mono">{img.tags}</div>}
            {img.desc && <div className="fg-note">{img.desc}</div>}
          </div>
        ))}
        {!script.images.length && <div className="fg-note">导演觉得这一轮不需要插画（或设置里关了自动插画）。</div>}
      </Block>
      {script.emotions && script.emotions.length > 0 && (
        <Block label={`新加进情绪库 · ${script.emotions.length}`}>
          {script.emotions.map(e => (
            <div key={e.name} className="fg-dlog-card">
              <b>{e.name}</b>{e.base ? <span className="fg-note"> · 接近 {emotionLabel(e.base)}</span> : null}
              {e.desc && <div className="fg-note">{e.desc}</div>}
            </div>
          ))}
        </Block>
      )}
      <Block label={`角色档案更新 · ${script.people.length}`}>
        {script.people.map((p, i) => (
          <div key={i} className="fg-dlog-card">
            <b>{p.name}</b>{p.gender ? <span className="fg-note"> · {p.gender}</span> : null}
            {lookText(p.appearance) && <div className="fg-dlog-mono">建档：{lookText(p.appearance)}</div>}
            {lookText(p.change) && <div className="fg-dlog-mono">永久变化：{lookText(p.change)}</div>}
            {p.outfit && <div className="fg-dlog-mono">换装：{p.outfit}{p.outfitTags ? `（${p.outfitTags}）` : ''}</div>}
            {p.states && <div className="fg-dlog-mono">长期状态：{p.states.length ? p.states.map(s => `${s.name}${s.tags ? `（${s.tags}）` : ''}`).join('、') : '全部结束'}</div>}
            {p.temp && <div className="fg-dlog-mono">临时状态：{p.temp}</div>}
          </div>
        ))}
        {!script.people.length && <div className="fg-note">这一轮没有新建或修改档案。</div>}
      </Block>
    </>
  )
}

/** 立绘设计师这次写出的每张差分。 */
function SpritesView({ sprites }) {
  if (!sprites || !sprites.length) return <div className="fg-note">这次没有写出提示词，看「原始输出」里模型回了什么。</div>
  return (
    <Block label={`差分提示词 · ${sprites.length}`}>
      {sprites.map(sp => (
        <div key={sp.key} className="fg-dlog-card">
          <div className="fg-dlog-chips"><Chip k="差分">{sp.label}</Chip>{sp.writer && <Chip k="来源">{WRITER[sp.writer] || sp.writer}</Chip>}</div>
          <div className="fg-dlog-mono">{sp.tags || '—'}</div>
          {sp.negative && <div className="fg-note">额外负面：{sp.negative}</div>}
        </div>
      ))}
    </Block>
  )
}

/** 插画分镜师这次写出的每张插画：Base 一块，每人一块。 */
function CgsView({ cgs }) {
  if (!cgs || !cgs.length) return <div className="fg-note">这次没有写出提示词，看「原始输出」里模型回了什么。</div>
  return (
    <Block label={`插画提示词 · ${cgs.length}`}>
      {cgs.map(cg => (
        <div key={cg.key} className="fg-dlog-card">
          <div className="fg-dlog-chips"><Chip k="插画">{cg.label}</Chip>{cg.shape && <Chip k="画幅">{SHAPE_LABEL[cg.shape] || cg.shape}</Chip>}{cg.writer && <Chip k="来源">{WRITER[cg.writer] || cg.writer}</Chip>}</div>
          {cg.tags || cg.characters?.length ? (
            <>
              <div className="fg-dlog-mono"><i className="fg-dlog-k">Base</i>{cg.tags || '—'}</div>
              {cg.desc && <div className="fg-note">{cg.desc}</div>}
              {(cg.characters || []).map((c, i) => (
                <div key={i} className="fg-dlog-cgchar">
                  <div className="fg-dlog-mono"><i className="fg-dlog-k">{c.name || `角色 ${i + 1}`}</i>{c.tag || '—'}</div>
                  {c.nl && <div className="fg-note">{c.nl}</div>}
                </div>
              ))}
            </>
          ) : <div className="fg-note">没写出来，出图时按档案拼。</div>}
        </div>
      ))}
    </Block>
  )
}

function Attempts({ attempts }) {
  if (!attempts.length) return <div className="fg-note">还没有发出请求。</div>
  return attempts.map((a, i) => (
    <Block key={i} text={a.output} label={
      <>第 {i + 1} 次{a.note ? ` · ${a.note}` : ''} · 最大输出 {num(a.maxTokens)} · {secs(a.ms)}{a.usage ? ` · ${usageText(a.usage)}` : ''}</>
    }>
      {a.error && <div className="fg-err fg-dlog-error">{a.error}</div>}
      {a.reasoning && <details className="fg-dlog-think"><summary>模型思考 · {num(a.reasoning.length)} 字</summary><Pre text={a.reasoning} /></details>}
      <Pre text={a.output} empty="（模型没有输出文字）" />
    </Block>
  ))
}

function LogDetail({ gameId, summary }) {
  const running = summary.status === 'running'
  const [entry, setEntry] = React.useState(null)
  const [loadError, setLoadError] = React.useState('')
  const [tab, setTab] = React.useState(running ? 'live' : 'result')
  const [stopping, setStopping] = React.useState(false)
  const now = useNow(running)
  // 完整记录（提示词、各次尝试）：打开时取一次；跑完、或者重试换了一次尝试时再取。
  React.useEffect(() => {
    let off = false
    api.directorEntry(gameId, summary.id).then(r => { if (!off) { setEntry(r.entry); setLoadError('') } }, e => { if (!off) setLoadError(String(e.message || e)) })
    return () => { off = true }
  }, [gameId, summary.id, summary.status, running ? summary.attempts : 0])
  React.useEffect(() => { if (!running && tab === 'live') setTab('result') }, [running])

  const stop = async () => {
    setStopping(true)
    try { await api.cancel(gameId, 'director', summary.id); toast('已停止这次整理') } catch (e) { toast(String(e.message || e), 'error') } finally { setStopping(false) }
  }
  const sprite = summary.kind === 'sprite'
  const cg = summary.kind === 'cg'
  const writer = sprite || cg
  const tabs = running ? [['live', '实时输出'], ['prompt', '提示词']] : [['result', writer ? '写出的提示词' : '整理结果'], ['raw', `原始输出${summary.attempts > 1 ? ` · ${summary.attempts} 次` : ''}`], ['prompt', '提示词']]
  const live = summary.live || { output: '', reasoning: '', chars: 0, note: '' }
  const elapsed = running ? Math.max(summary.ms, now - summary.at) : summary.ms
  return (
    <div className="fg-dlog-detail">
      <div className="fg-dlog-head">
        <div className="fg-dlog-title">{sprite ? `立绘 · ${summary.name}（读到第 ${summary.turn} 轮）` : entryTitle(summary)} <StatusPill status={summary.status} /><span className="fg-spacer" />
          {running && <button type="button" className="fg-btn" disabled={stopping} onClick={stop}>{writer ? '停止' : '停止整理'}</button>}
        </div>
        <div className="fg-dlog-facts">
          <div><i>模型</i>{summary.model || '—'}{summary.provider ? <span className="fg-note"> · {summary.provider}</span> : null}{sourceLabel() ? <span className="fg-note">（{sourceLabel()}）</span> : null}</div>
          <div><i>时间</i>{clock(summary.at)} · {secs(elapsed)} · {REASON[summary.reason] || summary.reason}</div>
          <div><i>最大输出</i>{num(summary.maxTokens)} token{entry && entry.temperature != null ? ` · 温度 ${entry.temperature}` : ''}</div>
          <div><i>模型窗口</i>{summary.window ? `${num(summary.window)} token` : '宿主没给窗口大小，按设置原样发'}{entry && entry.outputDefault ? <span className="fg-note"> · 模型默认输出 {num(entry.outputDefault)}</span> : null}</div>
          {entry && <div><i>资料</i>{entry.contextLength ? `发了 ${num(entry.contextChars)} 字（人物卡与世界书共 ${num(entry.contextLength)} 字）` : '这张卡没有人物卡 / 世界书资料'}</div>}
          {entry && writer && <div><i>剧情</i>{`发了 ${num(entry.storyChars)} 字（到这一轮为止共 ${num(entry.storyLength)} 字）`}</div>}
          {summary.usage && <div><i>用量</i>{usageText(summary.usage)}</div>}
        </div>
        {summary.notes.map((n, i) => <div key={i} className="fg-dlog-notice">⚠ {n}</div>)}
        {summary.error && <div className="fg-err fg-dlog-error">{summary.error}</div>}
      </div>
      <div className="fg-tabs fg-dlog-tabs">
        {tabs.map(([id, label]) => <button key={id} type="button" className={`fg-tab${tab === id ? ' is-on' : ''}`} onClick={() => setTab(id)}>{label}</button>)}
      </div>
      {loadError && <div className="fg-err">{loadError}</div>}
      {tab === 'live' && (
        <>
          <div className="fg-dlog-meter"><span className="fg-dlog-dot" />{live.note || `第 ${summary.attempts || 1} 次请求`} · 已收到 {num(live.chars)} 字{live.chars ? '' : live.reasoning ? ' · 模型在思考' : ' · 等模型开口…'}</div>
          {live.reasoning && <Block label="模型思考（实时）"><Pre text={live.reasoning} follow /></Block>}
          <Block label="模型输出（实时）"><Pre text={live.output} follow cursor empty="还没有输出" /></Block>
        </>
      )}
      {tab === 'result' && (entry ? (sprite ? <SpritesView sprites={entry.sprites} /> : cg ? <CgsView cgs={entry.cgs} /> : <ScriptView script={entry.script} units={entry.units || []} />) : <div className="fg-note">读取中…</div>)}
      {tab === 'raw' && (entry ? <Attempts attempts={entry.attempts || []} /> : <div className="fg-note">读取中…</div>)}
      {tab === 'prompt' && (entry ? (
        <>
          <Block label={`系统提示词 · ${num((entry.system || '').length)} 字`} text={entry.system}><Pre text={entry.system} /></Block>
          <Block label={`用户消息 · ${num((entry.user || '').length)} 字${sprite ? '（资料 + 全部剧情 + 角色档案 + 要画的差分）' : cg ? '（资料 + 此前的剧情 + 本轮正文 + 角色档案 + 要画的插画）' : '（资料 + 上一幕 + 角色档案 + 情绪库 + 本轮正文单元）'}`} text={entry.user}><Pre text={entry.user} /></Block>
        </>
      ) : <div className="fg-note">读取中…</div>)}
    </div>
  )
}

export function DirectorLog({ gameId, onClose, focusTurn = null }) {
  const { log, error } = useDirectorLog(gameId)
  const [selected, setSelected] = React.useState('')
  const items = log ? [...log.running, ...log.entries] : []
  const current = items.find(e => e.id === selected) || (focusTurn != null && items.find(e => e.turn === focusTurn && (e.kind || 'director') === 'director')) || items[0]
  // 打开时看的那一条就钉住：之后立绘设计师、插画分镜师开跑排到最上面，也不会把正在看的那条换掉。
  React.useEffect(() => { if (!selected && current) setSelected(current.id) }, [current && current.id])
  return (
    <Panel title="导演日志" en="Director" onClose={onClose}
      actions={log && <span className="fg-pill">{log.running.length ? `${log.running.length} 个整理中 · ` : ''}保留最近 {log.keep} 次</span>}>
      {!log && <div className="fg-note">{error ? '读取失败：' + error : '读取中…'}</div>}
      {log && !items.length && <div className="fg-note">这一局还没有导演记录。每轮正文写完后，后台导演把它整理成场景：谁在说话、情绪、站位、镜头、插画分镜、选项；立绘设计师读完资料和剧情写立绘提示词。全过程都会记在这里。</div>}
      {current && (
        <div className="fg-dlog">
          <div className="fg-dlog-side">
            {items.map(e => <LogRow key={e.id} e={e} on={e.id === current.id} onClick={() => setSelected(e.id)} />)}
          </div>
          <LogDetail key={current.id} gameId={gameId} summary={current} />
        </div>
      )}
    </Panel>
  )
}
