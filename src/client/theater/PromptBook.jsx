// 设置 →「提示词」：FlowGal 用到的每一段提示词都在这里，全文显示、能改、单段恢复默认（规则和默认值见 lib/prompt-book.js、lib/prompt-words.js）。
// 每段写着它是做什么的、能用哪些变量（上一次填进去的是什么）、改过没有；内置的更新了而你改过的，标「内置有新版」，对照着选换成新版或者保留自己的。
// 「预览完整提示词」照这一局现在的资料、剧情和档案，把导演和几位设计师这次会发出去的系统提示词和用户消息拼出来（不发给模型、不花额度）。
import React from 'react'
import { api, toast, useUi, useConfig, patchConfig } from '../api.js'
import { confirmBox } from '../ask.jsx'

function useBusy() {
  const [busy, setBusy] = React.useState('')
  const run = async (id, fn, ok) => {
    setBusy(id)
    try { const r = await fn(); if (ok) toast(ok); return r } catch (e) { toast(String(e && e.message || e), 'error') } finally { setBusy('') }
  }
  return [busy, run]
}

const KIND_HINT = { tags: '逗号隔开的英文 tag', list: '一行一个', pairs: '一行「原词 → 换成」', map: '一行「编号：内容」' }
const ROLES = [['director', '导演'], ['listen', '听音师'], ['sprite', '立绘设计师'], ['cg', '插画分镜师']]
const FILTERS = [['all', '全部'], ['edited', '改过的'], ['stale', '内置有新版的']]
const num = n => Number(n || 0).toLocaleString()

/** 逐行对照：先去掉两头相同的行，中间按最长公共子序列对；太长对不过来时整段算换掉。回 [{ op: ' ' | '-' | '+', text }]。 */
export function lineDiff(a, b) {
  const x = String(a).split('\n'), y = String(b).split('\n')
  let head = 0
  while (head < x.length && head < y.length && x[head] === y[head]) head++
  let tail = 0
  while (tail < x.length - head && tail < y.length - head && x[x.length - 1 - tail] === y[y.length - 1 - tail]) tail++
  const xs = x.slice(head, x.length - tail), ys = y.slice(head, y.length - tail)
  const mid = []
  if (xs.length * ys.length > 4000000) {
    for (const t of xs) mid.push({ op: '-', text: t })
    for (const t of ys) mid.push({ op: '+', text: t })
  } else {
    const n = xs.length, m = ys.length
    const dp = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1))
    for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = xs[i] === ys[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
    let i = 0, j = 0
    while (i < n && j < m) {
      if (xs[i] === ys[j]) { mid.push({ op: ' ', text: xs[i] }); i++; j++ } else if (dp[i + 1][j] >= dp[i][j + 1]) mid.push({ op: '-', text: xs[i++] })
      else mid.push({ op: '+', text: ys[j++] })
    }
    while (i < n) mid.push({ op: '-', text: xs[i++] })
    while (j < m) mid.push({ op: '+', text: ys[j++] })
  }
  return [...x.slice(0, head).map(text => ({ op: ' ', text })), ...mid, ...x.slice(x.length - tail).map(text => ({ op: ' ', text }))]
}

/** 对照显示：相同的连着好几行只留前后各两行。 */
function Diff({ from, to, fromLabel, toLabel }) {
  const lines = React.useMemo(() => lineDiff(from, to), [from, to])
  const shown = []
  for (let i = 0; i < lines.length;) {
    if (lines[i].op !== ' ') { shown.push(lines[i++]); continue }
    let j = i
    while (j < lines.length && lines[j].op === ' ') j++
    const run = lines.slice(i, j)
    const before = i ? 2 : 0, after = j < lines.length ? 2 : 0
    if (run.length > before + after + 1) shown.push(...run.slice(0, before), { op: '…', text: `相同的 ${run.length - before - after} 行` }, ...run.slice(run.length - after))
    else shown.push(...run)
    i = j
  }
  const changed = lines.some(l => l.op !== ' ')
  // 一行删、一行加挨着的：标出这一行里改了的那一截
  const marks = new Map()
  for (let i = 0; i + 1 < shown.length; i++) {
    if (shown[i].op !== '-' || shown[i + 1].op !== '+' || shown[i - 1]?.op === '-' || shown[i + 2]?.op === '+') continue
    const a = shown[i].text, b = shown[i + 1].text
    let head = 0
    while (head < a.length && head < b.length && a[head] === b[head]) head++
    let tail = 0
    while (tail < a.length - head && tail < b.length - head && a[a.length - 1 - tail] === b[b.length - 1 - tail]) tail++
    marks.set(i, [head, a.length - tail]).set(i + 1, [head, b.length - tail])
  }
  const body = (l, i) => {
    const m = marks.get(i)
    return m && m[1] > m[0] ? <>{l.text.slice(0, m[0])}<mark>{l.text.slice(m[0], m[1])}</mark>{l.text.slice(m[1])}</> : l.text
  }
  return (
    <div className="fg-pb-diff">
      <div className="fg-note"><span className="fg-pb-del">－ {fromLabel}</span>　<span className="fg-pb-add">＋ {toLabel}</span></div>
      {changed ? (
        <pre>{shown.map((l, i) => (
          <div key={i} className={l.op === '-' ? 'fg-pb-del' : l.op === '+' ? 'fg-pb-add' : l.op === '…' ? 'fg-pb-skip' : ''}>
            <i>{l.op === '-' ? '－' : l.op === '+' ? '＋' : ''}</i><span>{l.op === '…' ? `… ${l.text} …` : body(l, i)}</span>
          </div>
        ))}</pre>
      ) : <div className="fg-note">两边一字不差。</div>}
    </div>
  )
}

/** 多行框跟着内容长高（太长的在框里滚）。 */
function useGrow(text) {
  const ref = React.useRef(null)
  React.useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = el.scrollHeight + 2 + 'px'
  }, [text])
  return ref
}

/** 一段提示词：全文（失焦保存）、恢复默认、和默认对照、内置有新版时换成新版或保留自己的、变量说明和上一次填进去的。 */
function PromptItem({ item, onSaved }) {
  const [text, setText] = React.useState(item.text)
  const [diff, setDiff] = React.useState(false)
  const [last, setLast] = React.useState(null)
  const [busy, run] = useBusy()
  const grow = useGrow(text)
  React.useEffect(() => { setText(item.text) }, [item.text])
  const save = (input, ok) => run(input.reset ? 'reset' : input.keep ? 'keep' : 'save', async () => { const r = await api.setPrompt({ id: item.id, ...input }); onSaved(r.item); return r }, ok)
  const commit = () => { if (text !== item.text) save({ text }, text === item.def ? '跟默认一样，按默认算' : '已保存') }
  const reset = async () => { if (await confirmBox(`「${item.label}」恢复成内置的？你改的这段会丢掉。`, { ok: '恢复默认' })) save({ reset: true }, '已恢复默认') }
  const loadLast = () => run('last', async () => setLast((await api.promptLast(item.id)).last || { values: {} }))
  const dirty = text !== item.text
  return (
    <div className={`fg-pb-item${item.edited ? ' is-edited' : ''}${item.stale ? ' is-stale' : ''}`} id={'fg-pb-' + item.id}>
      <div className="fg-pb-head">
        <b>{item.label}</b>
        {item.edited && <span className="fg-pb-badge">已改</span>}
        {item.stale && <span className="fg-pb-badge is-new">内置有新版</span>}
        {item.legacy && <span className="fg-pb-badge is-old">从老设置搬来的</span>}
        {dirty && <span className="fg-pb-badge is-dirty">没保存（点别处保存）</span>}
        <code>{item.id}</code>
        <span className="fg-spacer" />
        {item.edited && <button type="button" className="fg-btn is-mini" onClick={() => setDiff(!diff)}>{diff ? '收起对照' : '和内置对照'}</button>}
        {item.edited && <button type="button" className="fg-btn is-mini" disabled={Boolean(busy)} onClick={reset}>{busy === 'reset' ? '恢复中…' : '恢复默认'}</button>}
      </div>
      {item.desc && <div className="fg-note">{item.desc}</div>}
      {item.stale && (
        <div className="fg-pb-stale">
          <div>内置的这段在你改过之后更新了。下面是你的和新版的对照：换成新版会丢掉你的改动；保留自己的就不再提示，等内置下次更新再说。</div>
          <Diff from={item.text} to={item.def} fromLabel="你的" toLabel="内置新版" />
          <div className="fg-row">
            <button type="button" className="fg-btn is-primary" disabled={Boolean(busy)} onClick={async () => { if (await confirmBox(`「${item.label}」换成内置新版？你改的这段会丢掉。`, { ok: '换成新版' })) save({ reset: true }, '已换成内置新版') }}>换成新版</button>
            <button type="button" className="fg-btn" disabled={Boolean(busy)} onClick={() => save({ keep: true }, '保留你的')}>{busy === 'keep' ? '保存中…' : '保留我的'}</button>
          </div>
        </div>
      )}
      {item.legacy && <div className="fg-note">这段是以前在「导演」页填的，不知道当时内置是哪一版，所以不提示有没有新版；点「和内置对照」能看出跟现在内置的差在哪。</div>}
      {diff && !item.stale && <Diff from={item.def} to={item.text} fromLabel="内置" toLabel="你的" />}
      <textarea ref={grow} className="fg-textarea fg-pb-text" value={text} spellCheck={false} rows={2}
        onChange={e => setText(e.target.value)} onBlur={commit} onKeyDown={e => e.stopPropagation()} />
      <div className="fg-pb-foot">
        <span className="fg-note">{num(text.length)} 字{KIND_HINT[item.kind] ? ` · ${KIND_HINT[item.kind]}` : ''}</span>
        {item.vars.length > 0 && (
          <div className="fg-pb-vars">
            {item.vars.map(v => (
              <span key={v.name} className={`fg-pb-var${v.used ? '' : ' is-unused'}${v.unknown ? ' is-unknown' : ''}`} title={v.unknown ? '不认识的变量：会填成空的' : v.used ? '' : '这段里没用上：想用就写进去'}>
                <code>{`{{${v.name}}}`}</code>{v.unknown ? '不认识，会填成空的' : v.desc}{item.last?.sizes?.[v.name] != null && <small>上次 {num(item.last.sizes[v.name])} 字</small>}
              </span>
            ))}
          </div>
        )}
        {item.last && <button type="button" className="fg-btn is-mini" disabled={busy === 'last'} onClick={() => (last ? setLast(null) : loadLast())}>{last ? '收起上次填进去的' : busy === 'last' ? '读取中…' : '看上次填进去的'}</button>}
      </div>
      {last && (
        <div className="fg-pb-last">
          {last.at ? <div className="fg-note">上次用这段：{new Date(last.at).toLocaleString()}</div> : <div className="fg-note">插件重启以后还没用过这段。</div>}
          {Object.entries(last.values || {}).map(([k, v]) => (
            <details key={k}><summary><code>{`{{${k}}}`}</code> {num(v.length)} 字</summary><pre>{v || '（空）'}</pre></details>
          ))}
        </div>
      )}
    </div>
  )
}

/** 预览完整提示词：选一位（立绘设计师再选一个人），照这一局现在的样子拼出来。 */
function Preview({ gameId }) {
  const [role, setRole] = React.useState('director')
  const [name, setName] = React.useState('')
  const [cast, setCast] = React.useState([])
  const [result, setResult] = React.useState(null)
  const [busy, run] = useBusy()
  React.useEffect(() => {
    if (!gameId) return
    api.game(gameId).then(r => { const names = (r.view?.cast || []).map(p => p.name); setCast(names); setName(n => n || names[0] || '') }).catch(() => {})
  }, [gameId])
  if (!gameId) return <div className="fg-note">先打开一局对话（进一次剧场），就能照那一局的资料、剧情和档案预览。</div>
  const person = role === 'sprite'
  const copy = text => navigator.clipboard?.writeText(text).then(() => toast('已复制'), () => toast('复制失败', 'error'))
  return (
    <div className="fg-pb-preview">
      <div className="fg-row">
        <select className="fg-select" value={role} onChange={e => { setRole(e.target.value); setResult(null) }}>{ROLES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        {person && <select className="fg-select" value={name} onChange={e => { setName(e.target.value); setResult(null) }}>{cast.length ? cast.map(n => <option key={n} value={n}>{n}</option>) : <option value="">（这一局还没有人建档）</option>}</select>}
        <button type="button" className="fg-btn is-primary" disabled={Boolean(busy) || (person && !name)} onClick={() => run('p', async () => setResult((await api.previewPrompt(gameId, role, person ? name : '')).preview))}>{busy ? '拼装中…' : '拼出来看看'}</button>
      </div>
      <div className="fg-note">走的是真的拼装：用现在存着的提示词（改了没保存的先点别处保存）、这一局最新的资料、剧情和档案，按模型窗口截短的也照截。不发给模型，不花额度。{role === 'sprite' ? '立绘设计师按这个人每个动作的底图拼（开着「表情只换脸」时按通用动作组，不然画平静）。' : role === 'cg' ? '插画分镜师按最新一轮导演挑的插画拼。' : role === 'listen' ? '听音师按最新一轮拼（音效库比候选多、开着「先听一遍」时，整理前先发它）。' : '导演按最新一轮拼。'}</div>
      {result && (
        <>
          <div className="fg-note">第 {result.turn} 轮 · {result.model || '宿主默认模型'}{result.provider ? `（${result.provider}）` : ''}</div>
          {result.notes.map((n, i) => <div key={i} className="fg-dlog-notice">⚠ {n}</div>)}
          {[['系统提示词', result.system], ['用户消息', result.user]].map(([label, text]) => (
            <div key={label} className="fg-pb-out">
              <div className="fg-pb-head"><b>{label}</b><span className="fg-note">{num(text.length)} 字</span><span className="fg-spacer" /><button type="button" className="fg-btn is-mini" onClick={() => copy(text)}>复制</button></div>
              <pre>{text || '（空）'}</pre>
            </div>
          ))}
        </>
      )}
    </div>
  )
}

export function PromptBook({ onTab = null }) {
  const ui = useUi()
  const gameId = ui.gameId || ui.lastGameId || ''
  const data = useConfig()
  const [book, setBook] = React.useState(null)
  const [error, setError] = React.useState('')
  const [query, setQuery] = React.useState('')
  const [filter, setFilter] = React.useState('all')
  const [open, setOpen] = React.useState(() => new Set())
  const [preview, setPreview] = React.useState(false)
  React.useEffect(() => { api.prompts().then(setBook).catch(e => setError(String(e && e.message || e))) }, [])
  const put = item => setBook(b => ({ ...b, items: b.items.map(x => (x.id === item.id ? item : x)) }))
  if (!book) return <div className="fg-note">{error ? '读取失败：' + error : '读取中…'}</div>
  const cfg = data && data.config
  const director = patch => patchConfig({ director: patch }).catch(e => toast(e.message, 'error'))
  const q = query.trim().toLowerCase()
  const match = item => (filter === 'all' || (filter === 'edited' ? item.edited : item.stale))
    && (!q || [item.label, item.id, item.desc, item.section, item.text].some(s => String(s || '').toLowerCase().includes(q)))
  const items = book.items.filter(match)
  const toggle = id => setOpen(s => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })
  const stale = book.items.filter(i => i.stale).length
  return (
    <div className="fg-pb">
      <div className="fg-note">导演、听音师、立绘设计师、插画分镜师用的每一段提示词，连插件自己加的出图固定词和过滤规则，都在这里全文显示、能改。改完点别处就保存，改坏了点「恢复默认」。变量写成 {'{{名字}}'}，每段下面列着能用哪些；用 [[ … ]] 括起来的一截，里面有变量是空的就整截不要。</div>
      <div className="fg-note">
        画风的质量词和负面词在每套画风里定{onTab && <button type="button" className="fg-btn is-mini" onClick={() => onTab('style')}>去画风与配图</button>}；
        每种情绪默认的表情 tag 在人物志 → 情绪库。
      </div>
      {cfg && (
        <div className="fg-pb-flow">
          <label><button type="button" className={`fg-switch${cfg.director.sharedPrefix ? ' is-on' : ''}`} aria-pressed={Boolean(cfg.director.sharedPrefix)} onClick={() => director({ sharedPrefix: !cfg.director.sharedPrefix })} />共用开头</label>
          <span className="fg-note">导演和几位设计师的系统提示词都换成「共用 → 共用的系统提示词」那一句，各自的规矩放进用户消息的【你的工作】一节，资料和剧情放在最前面一字不差：会自动缓存的模型接口（DeepSeek 等）第二次读就便宜、快。</span>
        </div>
      )}
      <div className="fg-pb-sticky">
        <div className="fg-row">
          <input className="fg-input" value={query} placeholder="搜名字、编号、说明或正文" onChange={e => setQuery(e.target.value)} onKeyDown={e => e.stopPropagation()} />
          <select className="fg-select" value={filter} onChange={e => setFilter(e.target.value)}>{FILTERS.map(([v, l]) => <option key={v} value={v}>{l}{v === 'stale' && stale ? `（${stale}）` : ''}</option>)}</select>
          <button type="button" className={`fg-btn${preview ? ' is-primary' : ''}`} onClick={() => setPreview(!preview)}>{preview ? '收起预览' : '预览完整提示词'}</button>
        </div>
        {stale > 0 && filter !== 'stale' && <div className="fg-pb-alert">有 {stale} 段你改过的，内置已经更新了 <button type="button" className="fg-btn is-mini" onClick={() => setFilter('stale')}>只看这几段</button></div>}
      </div>
      {preview && <Preview gameId={gameId} />}
      {book.groups.map(g => {
        const all = book.items.filter(i => i.group === g.id)
        const list = items.filter(i => i.group === g.id)
        if (!list.length && (q || filter !== 'all')) return null
        const shown = open.has(g.id) || Boolean(q) || filter !== 'all'
        const sections = [...new Set(list.map(i => i.section))]
        const edited = all.filter(i => i.edited).length
        return (
          <div key={g.id} className="fg-pb-group">
            <div className="fg-emo-group-head">
              <button type="button" onClick={() => toggle(g.id)}>
                <span className="fg-emo-caret">{shown ? '▾' : '▸'}</span><b>{g.label}</b>
                <span className="fg-note">{all.length} 段{edited ? ` · 改过 ${edited}` : ''}{all.some(i => i.stale) ? ` · ${all.filter(i => i.stale).length} 段内置有新版` : ''}</span>
              </button>
            </div>
            <div className="fg-note fg-pb-gdesc">{g.desc}</div>
            {shown && sections.map(sec => (
              <div key={sec} className="fg-pb-section">
                <div className="fg-pb-stitle">{sec}</div>
                {list.filter(i => i.section === sec).map(i => <PromptItem key={i.id} item={i} onSaved={put} />)}
              </div>
            ))}
          </div>
        )
      })}
      {!items.length && <div className="fg-note">没有对得上的。</div>}
    </div>
  )
}
