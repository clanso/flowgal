// 人物志 → 情绪库（所有对局共用）。按类别分组，能搜（名字、编号、近义词、并进来的旧名字）、能筛（来源、停用、这一局用没用过、画没画过、某个人的）。
// 每种情绪：改名、改类别、改替身、改「用在」和近义词、看和改它默认的表情 tag（不是空框：显示现在真正在用的那段）、剧场里怎么演（反应动作、闪回基调、强弱）、停用、删除；
// 勾选几种后批量挪类别、停用、启用、删除、合并到某一种；类别能加（顺手加上同名的情绪当代表）、改名、换代表情绪、排顺序、删；删掉的内置情绪能拿回来；
// 并掉的新词（模型归类归进去的、自己合并的）能拆出来单独成一种。
// 规则和存法见 lib/emotions.js，改动都走 api.emotion（lib/engine.js 的 emotionAction）。
import React from 'react'
import { api, toast } from '../api.js'
import { confirmBox } from '../ask.jsx'
import { speakersOf, REACT_KINDS, REACT_NAMES, RECALL_PRIORITY, RECALL_TONE_NAMES } from '../../../lib/vocab.js'
import { keyEmotion } from '../../../lib/look.js'
import { allEmotions, emotionEntry, emotionTags, emotionFace, emotionAct, emotionReact, emotionRecall, emotionLevel, groupEmotions, libOf, mergedFrom, nearestOf, personEmotions, resolveEmotion, standIns } from '../../../lib/emotions.js'

function useBusy() {
  const [busy, setBusy] = React.useState('')
  const run = async (id, fn, ok) => {
    setBusy(id)
    try { const r = await fn(); if (ok) toast(ok); return r } catch (e) { toast(String(e && e.message || e), 'error') } finally { setBusy('') }
  }
  return [busy, run]
}

/** 输入框：失焦或回车时才提交。 */
function Commit({ value, onCommit, placeholder, className = 'fg-input', title }) {
  const [v, setV] = React.useState(value ?? '')
  React.useEffect(() => { setV(value ?? '') }, [value])
  const commit = () => { if (v.trim() && v !== (value ?? '')) onCommit(v.trim()); else setV(value ?? '') }
  return <input className={className} value={v} placeholder={placeholder} title={title} onChange={e => setV(e.target.value)} onBlur={commit} onKeyDown={e => { e.stopPropagation(); if (e.key === 'Enter') e.currentTarget.blur() }} />
}

/** 多行框：失焦时提交（可以提交空的）。 */
function CommitArea({ value, onCommit, placeholder }) {
  const [v, setV] = React.useState(value ?? '')
  React.useEffect(() => { setV(value ?? '') }, [value])
  return <textarea className="fg-textarea is-short" value={v} placeholder={placeholder} onChange={e => setV(e.target.value)} onBlur={() => { if (v !== (value ?? '')) onCommit(v) }} onKeyDown={e => e.stopPropagation()} />
}

const SOURCES = { builtin: '内置', director: '导演造的', user: '你加的' }
const sourceOf = e => (e.builtin ? 'builtin' : e.source === 'user' ? 'user' : 'director')
const FILTERS = [
  ['all', '全部'], ['builtin', '内置'], ['director', '导演造的'], ['user', '你加的'], ['off', '停用的'],
  ['used', '本局用过的'], ['unused', '本局没用过的'], ['drawn', '本局画过的'], ['undrawn', '本局没画过的'],
]
const FIELDS = [
  { key: 'tags', label: '整张画的表情', hint: '立绘设计师没写词时（没开、或者没写出来），整张画这种情绪拼进去的表情 tag。' },
  { key: 'face', label: '只换脸的表情', hint: '在动作底图上只换脸、又没有立绘设计师写的词时，这张脸用的表情 tag。' },
  { key: 'act', label: '动作参考', hint: '交给立绘设计师参考的「演到全身」的样子（基准，不是模板：它按这个人的性格和处境来演）。' },
]

const LEVEL_NAMES = { 1: '微', 2: '中', 3: '强', 4: '极' }
/** 剧场里怎么演：每种情绪都能设，内置的默认照 vocab.js；新情绪没设的跟替身、再跟它那一类的代表情绪。 */
const PLAYS = [
  { key: 'react', label: '有反应时身子怎么动', hint: '没在说话的人对一句话有反应时（导演写了 react），剧场里他身子跟着这样一动。',
    options: REACT_KINDS.map(k => [k, REACT_NAMES[k]]), effective: (id, lib) => emotionReact(id, lib) },
  { key: 'recall', label: '闪回的基调', hint: `短闪回导演没写基调时，闪回里有这种情绪就按它挑切入方式和色调；几种情绪挑得不一样时按 ${RECALL_PRIORITY.map(t => RECALL_TONE_NAMES[t]).join(' > ')}。`,
    options: [['none', '不影响基调'], ...RECALL_PRIORITY.map(t => [t, RECALL_TONE_NAMES[t]])], effective: (id, lib) => emotionRecall(id, lib) || 'none' },
  { key: 'level', label: '默认强弱', hint: '只换脸时重画得多狠；「极」的默认整张画、不换脸（设置里能关）。',
    options: [1, 2, 3, 4].map(n => [n, LEVEL_NAMES[n]]), effective: (id, lib) => emotionLevel(id, lib) },
]
const playName = (f, v) => (f.options.find(o => String(o[0]) === String(v)) || [v, String(v)])[1]

/** 一种情绪在剧场里怎么演的三样：显示现在真正用的（自己没设就是跟替身来的），改了就是它自己的。 */
function EmotionPlays({ e, lib, save }) {
  const chain = standIns(e.id, lib)
  // 跟的是谁的：自己设了就是自己；没设往替身上找（强弱不找到平静）
  const from = key => {
    if (e[key]) return ''
    for (const s of chain) {
      if (key === 'level' && s === 'neutral') break
      if (emotionEntry(s, lib)[key]) return s
    }
    return ''
  }
  return (
    <div className="fg-emo-prompts">
      {PLAYS.map(f => {
        const now = f.effective(e.id, lib)
        const source = from(f.key)
        const own = e[f.key]
        const changed = e.builtin ? own !== e.defaults[f.key] : Boolean(own)
        // 内置的强弱没有「跟替身」（内置的都有自己的强弱）；别的都能改回跟替身
        const follow = !(e.builtin && f.key === 'level') && e.id !== 'neutral'
        const value = own ? String(own) : ''
        return (
          <div key={f.key} className="fg-emo-prompt">
            <div className="fg-row">
              <b>{f.label}</b>
              <span className="fg-note">{source ? `跟着「${emotionEntry(source, lib).label}」的` : own ? (e.builtin ? (changed ? '你改过' : '内置默认') : '它自己的') : '都没设，用默认'}</span>
              <span className="fg-spacer" />
              {e.builtin && changed && <button type="button" className="fg-btn is-mini" onClick={() => save({ [f.key]: e.defaults[f.key] }, '已恢复默认')}>恢复默认</button>}
            </div>
            <select className="fg-select" value={value} onChange={ev => save({ [f.key]: f.key === 'level' ? Number(ev.target.value) || 0 : ev.target.value })}>
              {(follow || !value) && <option value="">{`跟替身（现在：${playName(f, now)}）`}</option>}
              {f.options.map(([v, label]) => <option key={v} value={String(v)}>{label}{e.builtin && String(e.defaults[f.key]) === String(v) ? '（默认）' : ''}</option>)}
            </select>
            <div className="fg-note">{f.hint}</div>
          </div>
        )
      })}
    </div>
  )
}

/** 这一局里每种情绪用了几次、画了几张，按人分开的也记一份（按情绪库认过：并掉的算并进去的那个）。 */
function usageOf(view, lib) {
  const used = new Map()
  const drawn = new Map()
  const byPerson = new Map() // 名字 → { used: [], drawn: [] }
  const bump = (map, id) => map.set(id, (map.get(id) || 0) + 1)
  const person = name => { if (!byPerson.has(name)) byPerson.set(name, { used: [], drawn: [] }); return byPerson.get(name) }
  for (const t of (view && view.turns) || []) {
    for (const line of Object.values((t.script && t.script.lines) || {})) {
      if (line.emo) { const id = resolveEmotion(line.emo, lib); bump(used, id); for (const who of speakersOf(line.sp)) person(who).used.push(id) }
      for (const r of line.react || []) if (r.emo) { const id = resolveEmotion(r.emo, lib); bump(used, id); if (r.name && r.name !== '*') person(r.name).used.push(id) }
    }
  }
  for (const p of (view && view.cast) || []) {
    for (const [key, r] of Object.entries(p.sprites || {})) {
      if (!r || !r.assetId) continue
      const id = resolveEmotion(keyEmotion(key), lib)
      bump(drawn, id)
      person(p.name).drawn.push(id)
    }
  }
  return { used, drawn, byPerson }
}

/**
 * 选一种情绪的下拉框（按类别分组）。情绪多了每一行都塞满选项太重：没碰它时只放当前那一项，指针移上去、聚焦时才放全。
 */
function EmotionSelect({ value, lib, all, exclude = [], empty, onChange, title, style }) {
  const [full, setFull] = React.useState(false)
  const shown = value ? all.find(e => e.id === value) : null
  const groups = full ? groupEmotions(all.filter(e => !exclude.includes(e.id)), lib).filter(g => g.list.length) : []
  const open = () => { if (!full) setFull(true) }
  return (
    <select className="fg-select" value={value || ''} title={title} style={style} onPointerEnter={open} onPointerDown={open} onFocus={open} onChange={ev => onChange(ev.target.value)}>
      <option value="">{empty}</option>
      {!full && shown && <option value={shown.id}>{shown.label}</option>}
      {groups.map(g => (
        <optgroup key={g.category ? g.category.id : '_'} label={g.category ? g.category.label : '未分类'}>
          {g.list.map(e => <option key={e.id} value={e.id}>{e.label}{e.off ? '（停用）' : ''}</option>)}
        </optgroup>
      ))}
    </select>
  )
}

function CategorySelect({ value, lib, onChange, first, style }) {
  return (
    <select className="fg-select" value={value} style={style} onChange={ev => onChange(ev.target.value)}>
      {first && <option value="__">{first}</option>}
      {lib.categories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
      <option value="">未分类</option>
    </select>
  )
}

const WORD_FIELDS = [
  { key: 'use', label: '用在', hint: '这种情绪在什么场面用。导演挑情绪时看它，立绘设计师靠它跟相邻的情绪拉开差别（比如得意和调侃、担心和心虚）。', empty: '空着：导演只看名字挑' },
  { key: 'words', label: '近义词', hint: '正文或导演写到这些词，直接当作这一种，不再新造一种、不多画一张。顿号、逗号、空格隔开都行。并进来的旧名字另算（在最下面「并掉的」里）。', empty: '空着：没有近义词' },
]

/** 用在什么场面、近义词：内置的显示默认那段（改过的显示改过的），能恢复默认。 */
function EmotionWords({ e, lib, save }) {
  // 近义词里有单独成一种的（你加了同名的情绪），那个词不算它的
  const taken = (e.words || '').split('、').filter(w => w && lib.list.some(x => x && x.id === w && resolveEmotion(w, lib.list) !== e.id))
  return (
    <div className="fg-emo-prompts is-words">
      {WORD_FIELDS.map(f => {
        const changed = e.builtin ? e[f.key] !== e.defaults[f.key] : Boolean(e[f.key])
        return (
          <div key={f.key} className="fg-emo-prompt">
            <div className="fg-row">
              <b>{f.label}</b>
              <span className="fg-note">{e.builtin ? (changed ? '你改过' : '内置默认') : e[f.key] ? (e.source === 'user' ? '你写的' : '模型写的（能改）') : ''}</span>
              <span className="fg-spacer" />
              {changed && <button type="button" className="fg-btn is-mini" onClick={() => save({ [f.key]: e.builtin ? e.defaults[f.key] : '' }, e.builtin ? '已恢复默认' : '已清空')}>{e.builtin ? '恢复默认' : '清空'}</button>}
            </div>
            <CommitArea value={e[f.key]} placeholder={f.empty} onCommit={v => save({ [f.key]: v })} />
            {f.key === 'words' && taken.length > 0 && <div className="fg-note">「{taken.join('」「')}」已经单独成一种了，不算它的近义词。</div>}
            <div className="fg-note">{f.hint}</div>
          </div>
        )
      })}
    </div>
  )
}

/** 一种情绪默认的三段 tag：显示现在真正在用的（自己没写就是从替身那里跟来的），改了就是它自己的；能一段一段恢复默认。 */
function EmotionPrompts({ e, lib, save }) {
  const chain = standIns(e.id, lib)
  const effective = {
    tags: emotionTags(e.id, lib, { neutral: e.id === 'neutral' }),
    face: emotionFace(e.id, lib),
    act: emotionAct(e.id, lib),
  }
  // 跟的是谁的：自己写了就是自己；没写往替身上找（动作参考不找到平静）
  const from = key => {
    if (e[key]) return ''
    for (const s of chain) {
      if (key !== 'face' && s === 'neutral' && e.id !== 'neutral') break
      if (emotionEntry(s, lib)[key]) return s
    }
    return key === 'face' && e.id !== 'neutral' ? 'neutral' : ''
  }
  return (
    <div className="fg-emo-prompts">
      {FIELDS.map(f => {
        const source = from(f.key)
        const changed = e.builtin ? e[f.key] !== e.defaults[f.key] : Boolean(e[f.key])
        return (
          <div key={f.key} className="fg-emo-prompt">
            <div className="fg-row">
              <b>{f.label}</b>
              <span className="fg-note">{source ? `跟着「${emotionEntry(source, lib).label}」的（改了就是它自己的）` : e.builtin ? (changed ? '你改过' : '内置默认') : '它自己的'}</span>
              <span className="fg-spacer" />
              {changed && <button type="button" className="fg-btn is-mini" onClick={() => save({ [f.key]: e.builtin ? e.defaults[f.key] : '' }, e.builtin ? '已恢复默认' : '已改回跟替身')}>{e.builtin ? '恢复默认' : '改回跟替身'}</button>}
            </div>
            <CommitArea value={effective[f.key]} placeholder={f.key === 'act' ? '空着：不给动作参考，立绘设计师按情绪词自己想' : '空着：按情绪词自己写'}
              onCommit={v => { if (!e[f.key] && v.trim() === effective[f.key]) return; save({ [f.key]: v }) }} />
            <div className="fg-note">{f.hint}</div>
          </div>
        )
      })}
    </div>
  )
}

function EmotionRow({ e, lib, all, usage, picked, onPick, open, onOpen, run, busy, gameId }) {
  const save = (patch, ok = '已保存') => run('s' + e.id, () => api.emotion('save', { id: e.id, ...patch, gameId }), ok)
  const near = e.id === 'neutral' ? '' : nearestOf(e.id, lib)
  const aliases = mergedFrom(e.id, lib)
  const used = usage.used.get(e.id) || 0
  const drawn = usage.drawn.get(e.id) || 0
  const src = sourceOf(e)
  const meta = [
    src === 'director' ? `导演造的${e.turn != null ? ` · 第 ${e.turn} 轮` : ''}${e.who && e.who.length ? ` · ${e.who.join('、')}` : ''}` : SOURCES[src],
    aliases.length ? `也叫 ${aliases.join('、')}` : '',
    used ? `本局用了 ${used} 次` : '',
    drawn ? `画了 ${drawn} 张` : '',
    e.off ? '停用中：导演不再用它，画好的照用' : '',
  ].filter(Boolean).join(' · ')
  const remove = async () => {
    const text = e.builtin
      ? `删掉「${e.label}」？导演之后不再用它；画好的立绘不删。之后能在「删掉的内置情绪」里拿回来。`
      : `删掉「${e.label}」？导演之后不再用它（以后遇到合适的时候它可能再造一个）；画好的立绘不删。`
    if (await confirmBox(text, { ok: '删除', danger: true })) run('x' + e.id, () => api.emotion('delete', { id: e.id }), '已删除（画好的立绘还在）')
  }
  return (
    <div className={`fg-emo-row${e.off ? ' is-off' : ''}${picked ? ' is-picked' : ''}${open ? ' is-open' : ''}`}>
      <input type="checkbox" checked={picked} onChange={onPick} title="勾上几种，上面能一起挪类别、停用、删除、合并" />
      <div className="fg-emo-name">
        <Commit value={e.label} title={e.builtin ? '改显示的名字（编号不变，老存档照样对得上）' : '改名：等于并进新名字，老剧本里的旧名字、画好的立绘跟过去'} onCommit={v => save(e.builtin ? { label: v } : { rename: v }, '已改名')} />
        {e.builtin && <small>{e.id}</small>}
      </div>
      <CategorySelect value={e.category} lib={lib} onChange={v => save({ category: v })} />
      {e.id === 'neutral'
        ? <span className="fg-note">替身：没有（它是最后的兜底）</span>
        : <EmotionSelect value={e.base} lib={lib} all={all} exclude={[e.id]} empty={`替身：跟类别（${near ? emotionEntry(near, lib).label : '平静'}）`} title="这张立绘还没画好时先用哪张" onChange={v => save({ base: v })} />}
      <span className="fg-note fg-emo-meta">{meta}</span>
      <div className="fg-emo-acts">
        <button type="button" className={`fg-btn is-mini${open ? ' is-on' : ''}`} onClick={onOpen} title="用在什么场面、近义词、默认的表情 tag、剧场里怎么演（反应动作、闪回基调、强弱）">细节</button>
        {e.id !== 'neutral' && <button type="button" className="fg-btn is-mini" disabled={busy === 's' + e.id} onClick={() => save({ off: !e.off }, e.off ? '已启用' : '已停用：导演不再用它')}>{e.off ? '启用' : '停用'}</button>}
        {e.id !== 'neutral' && <button type="button" className="fg-btn is-mini fg-danger" disabled={busy === 'x' + e.id} onClick={remove}>删除</button>}
        {e.builtin && e.edited && <button type="button" className="fg-btn is-mini" onClick={async () => { if (await confirmBox(`「${e.label}」的名字、类别、替身、用在、近义词、tag、演法全部恢复成内置的？`, { ok: '恢复默认' })) run('r' + e.id, () => api.emotion('reset', { id: e.id }), '已恢复默认') }}>全部恢复默认</button>}
      </div>
      {open && <EmotionWords e={e} lib={lib} save={save} />}
      {open && <EmotionPrompts e={e} lib={lib} save={save} />}
      {open && <EmotionPlays e={e} lib={lib} save={save} />}
    </div>
  )
}

/** 类别：加、改名、换代表情绪、排顺序、删、恢复默认。 */
function CategoryManager({ lib, all, run }) {
  const [name, setName] = React.useState('')
  const cats = lib.categories
  const count = id => all.filter(e => e.category === id).length
  const order = (i, d) => { const ids = cats.map(c => c.id); [ids[i], ids[i + d]] = [ids[i + d], ids[i]]; run('order', () => api.emotion('category-order', { order: ids })) }
  return (
    <div className="fg-manage fg-emo-cats">
      <div className="fg-note">导演看情绪库按类别列（空的类别也列，它新造的情绪可以归进去），这里按类别分组。代表情绪是这一类里没写替身的情绪先用哪张立绘（没设就用平静），反应动作、闪回基调、强弱没设的也跟着它：给代表设一次，这一类都跟着。加一类会顺手加上同名的情绪当代表（库里已经有就把它挪进来）。删掉一类，里面的情绪变成未分类，别的不变。</div>
      {cats.map((c, i) => (
        <div key={c.id} className="fg-emo-cat">
          <Commit value={c.label} onCommit={label => run('c' + c.id, () => api.emotion('category-save', { category: c.id, label }), '已改名')} />
          <EmotionSelect value={resolveEmotion(c.rep, lib)} lib={lib} all={all} empty="代表情绪：（没有，用平静）" onChange={rep => run('c' + c.id, () => api.emotion('category-save', { category: c.id, rep }), '已换代表情绪')} />
          <span className="fg-note">{count(c.id)} 种</span>
          <div className="fg-row">
            <button type="button" className="fg-btn is-mini" disabled={i === 0} onClick={() => order(i, -1)} title="往前挪">↑</button>
            <button type="button" className="fg-btn is-mini" disabled={i === cats.length - 1} onClick={() => order(i, 1)} title="往后挪">↓</button>
            <button type="button" className="fg-btn is-mini fg-danger" onClick={async () => { if (await confirmBox(`删掉「${c.label}」这一类？里面的 ${count(c.id)} 种情绪变成未分类。`, { ok: '删除', danger: true })) run('cd' + c.id, () => api.emotion('category-delete', { category: c.id }), '已删除这一类') }}>删除</button>
          </div>
        </div>
      ))}
      <form className="fg-row" onSubmit={ev => { ev.preventDefault(); if (name.trim()) run('cadd', () => api.emotion('category-save', { label: name.trim() }), `已加「${name.trim()}」这一类，同名的情绪当代表`).then(() => setName('')) }}>
        <input className="fg-input" style={{ width: '14cqw' }} placeholder="新类别，比如「恨」" value={name} onChange={ev => setName(ev.target.value)} onKeyDown={ev => ev.stopPropagation()} />
        <button type="submit" className="fg-btn">加一类</button>
        <span className="fg-spacer" />
        <button type="button" className="fg-btn is-mini" onClick={async () => { if (await confirmBox('类别恢复成默认的那一套（平静、喜、怒、哀……）？情绪归哪一类不动；归在你加的类别里的变成未分类。', { ok: '恢复默认' })) run('creset', () => api.emotion('category-reset', {}), '类别已恢复默认') }}>恢复默认类别</button>
      </form>
    </div>
  )
}

export function EmotionLibrary({ emotions, view, gameId }) {
  const [busy, run] = useBusy()
  const lib = React.useMemo(() => libOf(emotions), [emotions])
  const all = React.useMemo(() => allEmotions(lib), [lib])
  const deleted = React.useMemo(() => allEmotions(lib, { withDeleted: true }).filter(e => e.deleted && !lib.list.find(x => x.id === e.id && x.mergedInto)), [lib])
  const merged = lib.list.filter(e => e && e.mergedInto)
  const usage = React.useMemo(() => usageOf(view, lib), [view, lib])
  const people = ((view && view.cast) || []).map(p => p.name)
  const [query, setQuery] = React.useState('')
  const [filter, setFilter] = React.useState('all')
  const [person, setPerson] = React.useState('')
  const [closed, setClosed] = React.useState(() => new Set())
  const [picked, setPicked] = React.useState(() => new Set())
  const [open, setOpen] = React.useState('')
  const [cats, setCats] = React.useState(false)
  const [into, setInto] = React.useState('')
  const [draft, setDraft] = React.useState({ name: '', category: '', base: '' })

  const q = query.trim().toLowerCase()
  const mine = person ? new Set(personEmotions(person, lib, { used: (usage.byPerson.get(person) || {}).used || [], drawn: (usage.byPerson.get(person) || {}).drawn || [] }).map(e => e.id)) : null
  const pass = e => {
    if (mine && !mine.has(e.id)) return false
    if (q && ![e.id, e.label, e.words || '', ...mergedFrom(e.id, lib)].some(s => String(s).toLowerCase().includes(q))) return false
    switch (filter) {
      case 'builtin': case 'director': case 'user': return sourceOf(e) === filter
      case 'off': return e.off
      case 'used': return usage.used.has(e.id)
      case 'unused': return !usage.used.has(e.id)
      case 'drawn': return usage.drawn.has(e.id)
      case 'undrawn': return !usage.drawn.has(e.id)
      default: return true
    }
  }
  const shown = all.filter(pass)
  const narrowed = Boolean(q || mine || filter !== 'all')
  // 筛着的时候空的类别不列；不筛时空的类别也列（知道有这一类）
  const groups = groupEmotions(shown, lib).filter(g => g.list.length || (!narrowed && g.category))
  const pickedIds = [...picked].filter(id => all.some(e => e.id === id))
  const pick = id => setPicked(p => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n })
  const pickMany = (ids, on) => setPicked(p => { const n = new Set(p); for (const id of ids) { if (on) n.add(id); else n.delete(id) } return n })
  const toggle = id => setClosed(c => { const n = new Set(c); if (n.has(id)) n.delete(id); else n.add(id); return n })
  const batch = (action, input, ok) => run('batch', () => api.emotion(action, { ids: pickedIds, ...input, gameId }).then(() => setPicked(new Set())), ok)
  const label = id => emotionEntry(id, lib).label
  const removePicked = async () => {
    if (pickedIds.includes('neutral')) { toast('平静不能删：它是登场立绘，也是最后的兜底', 'error'); return }
    if (await confirmBox(`删掉这 ${pickedIds.length} 种情绪（${pickedIds.map(label).join('、')}）？导演之后不再用它们；画好的立绘不删，内置的能在「删掉的内置情绪」里拿回来。`, { ok: '删除', danger: true })) batch('delete', {}, `已删除 ${pickedIds.length} 种`)
  }
  const mergePicked = async () => {
    const from = pickedIds.filter(id => id !== into)
    if (!into || !from.length) return
    if (from.includes('neutral')) { toast('平静不能并掉：它是登场立绘，也是最后的兜底', 'error'); return }
    if (!(await confirmBox(`把 ${from.map(label).join('、')} 并进「${label(into)}」？\n之后导演写它们、老剧本里的它们都算「${label(into)}」；这一局和全局角色里它们画好的立绘，「${label(into)}」还没画的直接挪给它用。旧名字留作别名，搜得到；新造的词并掉以后能在最下面「并掉的」里拆出来（挪过去的立绘不挪回来），内置的并掉了拆不开。`, { ok: '合并' }))) return
    run('batch', () => api.emotion('merge', { ids: from, into, gameId }).then(() => { setPicked(new Set()); setInto('') }), `已并进「${label(into)}」`)
  }
  const add = ev => {
    ev.preventDefault()
    if (!draft.name.trim()) return
    run('add', () => api.emotion('add', { name: draft.name.trim(), category: draft.category, base: draft.base }), '已加进情绪库').then(r => { if (r) setDraft({ name: '', category: draft.category, base: '' }) })
  }

  return (
    <div className="fg-emo-lib">
      <div className="fg-note">导演给每句台词标情绪；库里没有贴切的词、也不是哪种的近义词时，它会自创一个（可以是复合情绪，比如「带着烦躁思考」）。新造的词先交给导演用的模型归类（设置里能关）：画出来跟库里某一种差不多的，归进那一种（下面「并掉的」里能看到、能拆出来）；确实不一样的才新开一种，只挂在用过它的角色下面。库里只有词本身：这种情绪在谁脸上什么样，由立绘设计师按那个人的性格和此刻的处境来画。导演看库按类别看，新造的情绪会归进它挑的类；替身是这张立绘还没画好时先用哪张，没写替身就用这一类的代表情绪，再没有用平静。点「细节」能改「用在」（什么场面用它）、近义词、默认的表情 tag 和剧场里怎么演（有反应时怎么动、闪回的基调、强弱），没设的跟替身、再跟这一类的代表情绪。停用的导演不再用，画好的照用。所有对局共用。</div>
      <div className="fg-emo-sticky">
      <div className="fg-row fg-emo-tools">
        <input className="fg-input" style={{ flex: '1 1 14cqw', width: 'auto' }} placeholder="搜情绪（名字、编号、近义词、并进来的旧名字）" value={query} onChange={ev => setQuery(ev.target.value)} onKeyDown={ev => ev.stopPropagation()} />
        <select className="fg-select" style={{ width: 'auto' }} value={filter} onChange={ev => setFilter(ev.target.value)}>{FILTERS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        {people.length > 0 && <select className="fg-select" style={{ width: 'auto' }} value={person} onChange={ev => setPerson(ev.target.value)}><option value="">所有人</option>{people.map(n => <option key={n} value={n}>{n}的</option>)}</select>}
        <button type="button" className="fg-btn is-mini" onClick={() => setClosed(closed.size ? new Set() : new Set(groups.map(g => (g.category ? g.category.id : ''))))}>{closed.size ? '全部展开' : '全部收起'}</button>
        <button type="button" className="fg-btn is-mini" disabled={!shown.length} onClick={() => pickMany(shown.map(e => e.id), true)}>全选{narrowed ? '筛出来的' : ''}（{shown.length}）</button>
        <button type="button" className={`fg-btn is-mini${cats ? ' is-on' : ''}`} onClick={() => setCats(!cats)}>管理类别 · {lib.categories.length}</button>
      </div>
      {pickedIds.length > 0 && (
        <div className="fg-row fg-manage fg-emo-batch">
          <b>已选 {pickedIds.length}</b>
          <CategorySelect value="__" lib={lib} first="挪到类别…" style={{ width: 'auto' }} onChange={v => { if (v !== '__') batch('move', { category: v }, '已挪过去') }} />
          <button type="button" className="fg-btn is-mini" disabled={busy === 'batch'} onClick={() => batch('off', { off: true }, '已停用')}>停用</button>
          <button type="button" className="fg-btn is-mini" disabled={busy === 'batch'} onClick={() => batch('off', { off: false }, '已启用')}>启用</button>
          <button type="button" className="fg-btn is-mini fg-danger" disabled={busy === 'batch'} onClick={removePicked}>删除</button>
          <span className="fg-note">合并到</span>
          <EmotionSelect value={into} lib={lib} all={all} empty="选一种…" style={{ width: 'auto' }} onChange={setInto} />
          <button type="button" className="fg-btn is-mini" disabled={!into || busy === 'batch' || !pickedIds.some(id => id !== into)} onClick={mergePicked}>合并</button>
          <span className="fg-spacer" />
          <button type="button" className="fg-btn is-mini" onClick={() => setPicked(new Set())}>取消选择</button>
        </div>
      )}
      </div>
      {cats && <CategoryManager lib={lib} all={all} run={run} />}
      <form className="fg-emo-add" onSubmit={add}>
        <input className="fg-input" placeholder="加一个新情绪，比如「苦闷地表白」（词本身要能看懂）" value={draft.name} onChange={ev => setDraft({ ...draft, name: ev.target.value })} onKeyDown={ev => ev.stopPropagation()} />
        <CategorySelect value={draft.category} lib={lib} onChange={v => setDraft({ ...draft, category: v })} />
        <EmotionSelect value={draft.base} lib={lib} all={all} empty="替身：跟类别" onChange={v => setDraft(d => ({ ...d, base: v, category: d.category || (v ? emotionEntry(v, lib).category : '') }))} />
        <button type="submit" className="fg-btn is-primary" disabled={busy === 'add'}>加进情绪库</button>
      </form>
      {groups.map(g => {
        const id = g.category ? g.category.id : ''
        const isClosed = closed.has(id) && !q
        const ids = g.list.map(e => e.id)
        const all_ = ids.length > 0 && ids.every(x => picked.has(x))
        const rep = g.category && g.category.rep ? emotionEntry(g.category.rep, lib).label : ''
        return (
          <div key={id || '_'} className="fg-emo-group">
            <div className="fg-emo-group-head">
              <input type="checkbox" checked={all_} disabled={!ids.length} onChange={() => pickMany(ids, !all_)} title="勾上这一类全部" />
              <button type="button" onClick={() => toggle(id)}>
                <span className="fg-emo-caret">{isClosed ? '▸' : '▾'}</span>
                <b>{g.category ? g.category.label : '未分类'}</b>
                <span className="fg-note">{g.list.length} 种{rep ? ` · 代表情绪「${rep}」` : ''}</span>
              </button>
            </div>
            {!isClosed && g.list.map(e => (
              <EmotionRow key={e.id} e={e} lib={lib} all={all} usage={usage} picked={picked.has(e.id)} onPick={() => pick(e.id)}
                open={open === e.id} onOpen={() => setOpen(open === e.id ? '' : e.id)} run={run} busy={busy} gameId={gameId} />
            ))}
            {!isClosed && !g.list.length && <div className="fg-note fg-emo-empty">（这一类还没有情绪：勾选几种挪进来，或者加新情绪时选它）</div>}
          </div>
        )
      })}
      {!shown.length && <div className="fg-note">没有对得上的情绪。</div>}
      {deleted.length > 0 && (
        <>
          <div className="fg-section">删掉的内置情绪 · {deleted.length}</div>
          <div className="fg-row">
            {deleted.map(e => (
              <button key={e.id} type="button" className="fg-chip fg-emo-restore" title="拿回来" onClick={() => run('restore', () => api.emotion('restore', { ids: [e.id] }), `已拿回「${e.label}」`)}>{e.label}<small>{e.id}</small> ↺</button>
            ))}
            <button type="button" className="fg-btn is-mini" disabled={busy === 'restore'} onClick={() => run('restore', () => api.emotion('restore', {}), '删掉的内置情绪都拿回来了')}>全部拿回来</button>
          </div>
        </>
      )}
      {merged.length > 0 && (
        <>
          <div className="fg-section">并掉的 · {merged.length}</div>
          <div className="fg-note">导演再写这些词、老剧本里的这些词，都当作箭头后面那个；它们以前画好的立绘，箭头后面那个没画时先用。归错了的新词点 ✂ 拆出来，单独成一种（替身是它原来并进的那个，之后照它自己画）。</div>
          <div className="fg-row">{merged.map(e => (
            <span key={e.id} className="fg-chip" title={e.source === 'judge' ? `模型归类时归进去的${e.turn != null ? `（第 ${e.turn} 轮）` : ''}` : '合并进去的'}>
              {e.builtin ? emotionEntry(e.id, []).label : e.id} → {label(e.mergedInto)}{e.source === 'judge' && <small>模型归的</small>}
              {!e.builtin && <button type="button" className="fg-chip-x" title="拆出来，单独成一种" disabled={busy === 'split' + e.id}
                onClick={async () => { if (await confirmBox(`把「${e.id}」从「${label(e.mergedInto)}」里拆出来，单独成一种？替身是「${label(e.mergedInto)}」，之后写到它就照它自己画（已经挪过去的立绘不挪回来）。`, { ok: '拆出来' })) run('split' + e.id, () => api.emotion('split', { id: e.id, gameId }), `已拆出「${e.id}」`) }}>✂</button>}
            </span>
          ))}</div>
        </>
      )}
    </div>
  )
}
