// 导演日志：后台导演每次整理的完整记录。
// 正在跑的那次实时滚动模型输出（有思考就一起显示），可以中途停止；
// 历史记录能看实际发出去的提示词、每次尝试的原始输出 / 用量 / 报错，以及解析后逐句的演出标注。
import React from 'react'
import { api, toast, useDirectorLog } from '../api.js'
import { Panel } from './Panels.jsx'
import { EMOTION_LABEL, TIME_LABEL, WEATHER_LABEL, MOOD_LABEL, CARD_LABEL, POS_LABEL, CAMERA_LABEL, SYMBOL_LABEL, TRANSITION_LABEL } from './playback.js'

const STATUS = { running: ['整理中', 'is-running'], ok: ['完成', 'is-ok'], failed: ['失败', 'is-failed'], cancelled: ['已停止', 'is-cancelled'] }
const REASON = { auto: '正文写完后自动整理', force: '手动重新整理' }
const SOURCE = { tavern: '跟随 Tavern 后台模型', plugin: '插件设置里指定' }
const USAGE_LABEL = { inputTokens: '输入', outputTokens: '输出', reasoningTokens: '思考', cachedInputTokens: '缓存命中', cacheReadTokens: '缓存读', cacheWriteTokens: '缓存写', totalTokens: '合计' }
const SHAPE_LABEL = { landscape: '横版', portrait: '竖版', square: '方形' }

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
      <div className="fg-dlog-row-head"><b>第 {e.turn} 轮</b><StatusPill status={e.status} /></div>
      <div className="fg-dlog-row-meta">{clock(e.at)} · {e.status === 'running' ? '进行中' : secs(e.ms)}{e.attempts > 1 ? ` · ${e.attempts} 次尝试` : ''}</div>
      <div className="fg-dlog-row-meta">{e.model || '（没有模型）'}</div>
      {e.summary && <div className="fg-dlog-row-sum">{e.summary}</div>}
      {e.error && <div className="fg-dlog-row-sum fg-err">{e.error}</div>}
    </button>
  )
}

function Chip({ k, children }) {
  return <span className="fg-dlog-chip">{k && <i>{k}</i>}{children}</span>
}

/** 解析后的脚本：场景、站位，以及每个正文单元被标成了谁说、什么表情、什么演出。 */
function ScriptView({ script, units }) {
  if (!script) return <div className="fg-note">这次没有得到可用的脚本，看「原始输出」里模型回了什么。</div>
  const s = script.scene
  const tagged = units.filter(u => script.lines[u.id] && Object.keys(script.lines[u.id]).length).length
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
      <Block label={`在场 · ${script.cast.length}`}>
        <div className="fg-dlog-chips">
          {script.cast.map(c => <Chip key={c.name} k={POS_LABEL[c.pos] || c.pos}>{c.name}</Chip>)}
          {!script.cast.length && <span className="fg-note">没有人物上场</span>}
        </div>
      </Block>
      <Block label={`逐句标注 · ${tagged} / ${units.length} 句`}>
        <div className="fg-dlog-lines">
          {units.map(u => {
            const l = script.lines[u.id] || {}
            const marks = [
              l.sp && <Chip key="sp" k="说话">{l.sp}{l.as ? `（显示为 ${l.as}）` : ''}</Chip>,
              l.emo && <Chip key="emo" k="表情">{EMOTION_LABEL[l.emo] || l.emo}</Chip>,
              l.sym && <Chip key="sym" k="符号">{SYMBOL_LABEL[l.sym] || l.sym}</Chip>,
              l.cam && <Chip key="cam" k="镜头">{CAMERA_LABEL[l.cam] || l.cam}</Chip>,
              l.card && <Chip key="card" k="卡片">{CARD_LABEL[l.card] || l.card}</Chip>,
            ].filter(Boolean)
            return (
              <div key={u.id} className={`fg-dlog-line${marks.length ? '' : ' is-plain'}`}>
                <span className="fg-dlog-uid">{u.id}</span>
                <div className="fg-dlog-utext">{u.type === 'dialogue' ? `「${u.text}」` : u.type === 'thought' ? `（${u.text}）` : u.text}</div>
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
            <div className="fg-dlog-chips"><Chip k="标题">{img.title || '—'}</Chip><Chip k="位置">{img.after} 之后</Chip><Chip k="画幅">{SHAPE_LABEL[img.shape] || img.shape}</Chip></div>
            <div className="fg-dlog-mono">{img.tags}</div>
            {img.desc && <div className="fg-note">{img.desc}</div>}
          </div>
        ))}
        {!script.images.length && <div className="fg-note">导演觉得这一轮不需要插画（或设置里关了自动插画）。</div>}
      </Block>
      <Block label={`外貌档案更新 · ${script.people.length}`}>
        {script.people.map((p, i) => (
          <div key={i} className="fg-dlog-card">
            <b>{p.name}</b>{p.gender ? <span className="fg-note"> · {p.gender}</span> : null}
            {p.appearance && <div className="fg-dlog-mono">建档：{p.appearance}</div>}
            {p.change && <div className="fg-dlog-mono">永久变化：{p.change}</div>}
            {p.temp && <div className="fg-dlog-mono">临时状态：{p.temp}</div>}
          </div>
        ))}
        {!script.people.length && <div className="fg-note">这一轮没有新建或修改档案。</div>}
      </Block>
    </>
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
  const tabs = running ? [['live', '实时输出'], ['prompt', '提示词']] : [['result', '整理结果'], ['raw', `原始输出${summary.attempts > 1 ? ` · ${summary.attempts} 次` : ''}`], ['prompt', '提示词']]
  const live = summary.live || { output: '', reasoning: '', chars: 0, note: '' }
  const elapsed = running ? Math.max(summary.ms, now - summary.at) : summary.ms
  return (
    <div className="fg-dlog-detail">
      <div className="fg-dlog-head">
        <div className="fg-dlog-title">第 {summary.turn} 轮 <StatusPill status={summary.status} /><span className="fg-spacer" />
          {running && <button type="button" className="fg-btn" disabled={stopping} onClick={stop}>停止整理</button>}
        </div>
        <div className="fg-dlog-facts">
          <div><i>模型</i>{summary.model || '—'}{summary.provider ? <span className="fg-note"> · {summary.provider}</span> : null}{SOURCE[summary.source] ? <span className="fg-note">（{SOURCE[summary.source]}）</span> : null}</div>
          <div><i>时间</i>{clock(summary.at)} · {secs(elapsed)} · {REASON[summary.reason] || summary.reason}</div>
          <div><i>最大输出</i>{num(summary.maxTokens)} token{entry && entry.temperature != null ? ` · 温度 ${entry.temperature}` : ''}</div>
          <div><i>模型窗口</i>{summary.window ? `${num(summary.window)} token` : 'DSH 没给窗口大小，按设置原样发'}{entry && entry.outputDefault ? <span className="fg-note"> · 模型默认输出 {num(entry.outputDefault)}</span> : null}</div>
          {entry && <div><i>资料</i>{entry.contextLength ? `发了 ${num(entry.contextChars)} 字（人物卡与世界书共 ${num(entry.contextLength)} 字）` : '这张卡没有人物卡 / 世界书资料'}</div>}
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
      {tab === 'result' && (entry ? <ScriptView script={entry.script} units={entry.units || []} /> : <div className="fg-note">读取中…</div>)}
      {tab === 'raw' && (entry ? <Attempts attempts={entry.attempts || []} /> : <div className="fg-note">读取中…</div>)}
      {tab === 'prompt' && (entry ? (
        <>
          <Block label={`系统提示词 · ${num((entry.system || '').length)} 字`} text={entry.system}><Pre text={entry.system} /></Block>
          <Block label={`用户消息 · ${num((entry.user || '').length)} 字（资料 + 上一幕 + 外貌档案 + 本轮正文单元）`} text={entry.user}><Pre text={entry.user} /></Block>
        </>
      ) : <div className="fg-note">读取中…</div>)}
    </div>
  )
}

export function DirectorLog({ gameId, onClose, focusTurn = null }) {
  const { log, error } = useDirectorLog(gameId)
  const [selected, setSelected] = React.useState('')
  const items = log ? [...log.running, ...log.entries] : []
  const current = items.find(e => e.id === selected) || (focusTurn != null && items.find(e => e.turn === focusTurn)) || items[0]
  return (
    <Panel title="导演日志" en="Director" onClose={onClose}
      actions={log && <span className="fg-pill">{log.running.length ? `${log.running.length} 个整理中 · ` : ''}保留最近 {log.keep} 次</span>}>
      {!log && <div className="fg-note">{error ? '读取失败：' + error : '读取中…'}</div>}
      {log && !items.length && <div className="fg-note">这一局还没有导演记录。每轮正文写完后，后台导演把它整理成场景：谁在说话、表情、站位、镜头、插画分镜、选项。整理的全过程都会记在这里。</div>}
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
