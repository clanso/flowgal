// 「动作 × 情绪」的表（规则见 lib/poses.js）：人物志「动作与表情」里每个人的设计、设置里的通用动作组共用这一张。
// 上面一排动作卡片：改名、写这个动作什么样、身体 tag、删；「＋ 加动作」。
// 下面的表一列一个动作、一行一个情绪（按类别折叠）：格子里打勾 = 这个情绪放进这个动作，★ 是这个动作先画的那张（表情只换脸时是底图，其余在它上面只换脸），点 ☆ 换成这个情绪；
// 表下面一行字写着星星是什么意思（按开没开「表情只换脸」说）；
// 每一行「全部动作」一下放进每一列，每一列「全选」把表里的情绪都放进来。cell 给了就在格子里显示这一格画好的小图（人物志用）。
import React from 'react'
import { confirmBox } from '../ask.jsx'
import { emotionEntry, groupEmotions } from '../../../lib/emotions.js'
import { freshPoseId } from '../../../lib/poses.js'

const stop = e => e.stopPropagation()

/**
 * poses：现在的动作表；rows：表里列哪些情绪（编号，按情绪库的顺序）；lib：情绪库；onChange(新的动作表)。
 * prefix：新动作的编号前缀（设计里 p，通用动作组 g）；word：「动作」或「组」（提示里用）。
 * lockLast：每个放进过动作的情绪至少留在一个动作里（人物志：设计里的情绪不能一个动作都不在）；keepOne：至少留一个动作。
 * cell(pose, emotion)：格子里多显示的东西（小图）；rowOpen(emotion)：点情绪名展开的那一行（表情设计），不给就不能展开。
 * extra(pose)：动作卡片下面多显示的东西（人物志：本性还是处境、前提、靠的长期状态、收起放回）；off：此刻收起了的动作 { 编号: 为什么 }，那一列暗下来。
 * swap：开着「表情只换脸」（★ 是底图，其余只换脸）；关着时每种表情整张画，★ 只是这个动作先画的那张。
 */
export function PoseMatrix({ poses, rows, lib, onChange, prefix = 'p', word = '动作', lockLast = false, keepOne = false, cell = null, rowOpen = null, newLabel = '新动作', extra = null, off = null, swap = true }) {
  const [closed, setClosed] = React.useState(() => new Set())
  const [open, setOpen] = React.useState('')
  const label = e => emotionEntry(e, lib).label
  const placed = new Set(poses.flatMap(p => p.emotions))
  const homes = poses.length && poses[0].emotions[0] === 'neutral' ? poses[0].id : ''
  const set = next => onChange(next)
  const patchPose = (id, patch) => set(poses.map(p => (p.id === id ? { ...p, ...patch } : p)))
  // 平静在第一个动作的底图上（登场立绘就是它），那一格锁着
  const lockedCell = (p, e) => e === 'neutral' && p.id === homes
  const lastOne = e => lockLast && poses.filter(p => p.emotions.includes(e)).length <= 1
  const toggle = (p, e) => {
    if (p.emotions.includes(e)) {
      if (lockedCell(p, e) || lastOne(e)) return
      patchPose(p.id, { emotions: p.emotions.filter(x => x !== e) })
    } else patchPose(p.id, { emotions: [...p.emotions, e] })
  }
  const star = (p, e) => { if (p.emotions.includes(e) && p.id !== homes) patchPose(p.id, { emotions: [e, ...p.emotions.filter(x => x !== e)] }) }
  const intoAll = e => set(poses.map(p => (p.emotions.includes(e) ? p : { ...p, emotions: [...p.emotions, e] })))
  const fillPose = p => patchPose(p.id, { emotions: [...p.emotions, ...rows.filter(e => !p.emotions.includes(e))] })
  const addPose = () => set([...poses, { id: freshPoseId(poses, prefix), label: newLabel, desc: '', tags: '', emotions: [] }])
  const dropPose = async p => {
    const alone = p.emotions.filter(e => !poses.some(q => q !== p && q.emotions.includes(e)))
    const tail = alone.length ? `只在这个${word}里的 ${alone.length} 种情绪（${alone.slice(0, 6).map(label).join('、')}${alone.length > 6 ? '……' : ''}）之后跟着替身走。` : ''
    if (!(await confirmBox(`删掉「${p.label}」？${tail}已经画好的立绘不删。`, { ok: '删除', danger: true }))) return
    set(poses.filter(q => q !== p))
  }
  const groups = groupEmotions(rows.map(e => emotionEntry(e, lib)), lib).filter(g => g.list.length)
  const starText = swap
    ? `★ 这个${word}的底图：先整张画这一张，同一列别的表情都在它身上只重画脸（身体、衣服一点不动）`
    : `★ 这个${word}先画的那张：设计好、加${word}时先画它，让你看到这个${word}什么样。现在每种表情都整张画，星星不影响别的表情怎么画`
  const fold = id => setClosed(c => { const n = new Set(c); if (n.has(id)) n.delete(id); else n.add(id); return n })
  const input = (value, onChange, placeholder, className = '') => <input className={`fg-input ${className}`} value={value || ''} placeholder={placeholder} onChange={e => onChange(e.target.value)} onKeyDown={stop} />
  return (
    <div className="fg-pm">
      <div className="fg-pm-poses">
        {poses.map((p, i) => (
          <div key={p.id} className={`fg-pm-pose${off && off[p.id] ? ' is-off' : ''}`}>
            <div className="fg-row">
              <small className="fg-pm-id" title={`${word}编号：导演点名换${word}时写它`}>{p.id}</small>
              {input(p.label, v => patchPose(p.id, { label: v.slice(0, 12) }), `${word}名`, 'fg-pm-label')}
              <button type="button" className="fg-btn is-mini" disabled={keepOne && poses.length <= 1} title={keepOne && poses.length <= 1 ? `至少要留一个${word}` : `删掉这个${word}`} onClick={() => dropPose(p)}>✕</button>
            </div>
            {input(p.desc, v => patchPose(p.id, { desc: v.slice(0, 200) }), `这个${word}什么样${i === 0 ? '（平时最常有的样子）' : ''}`)}
            {input(p.tags, v => patchPose(p.id, { tags: v }), '身体的英文 tag：hands behind back, weight on one leg')}
            {!String(p.tags || '').trim() && p.emotions.length > 0 && <small className="fg-pm-warn">还没写身体 tag：画的时候没有动作的词能排到最前面，动作容易被画成别的。照上面那句写几个英文 tag（比如 fingertips on lips）。</small>}
            <span className="fg-note">{p.emotions.length ? `${p.emotions.length} 种情绪 · ★「${label(p.emotions[0])}」${swap ? '是底图' : '先画'}` : '还没放情绪：在下面的表里勾'}</span>
            {extra ? extra(p) : null}
          </div>
        ))}
        <button type="button" className="fg-pm-add" onClick={addPose}>＋ 加{word}</button>
      </div>
      {poses.length > 0 && (
        <div className="fg-pm-scroll">
          <table className="fg-pm-table">
            <thead>
              <tr>
                <th className="fg-pm-corner">情绪 \ {word}</th>
                {poses.map(p => (
                  <th key={p.id} className={off && off[p.id] ? 'is-off' : ''} title={off && off[p.id] ? `此刻不用：${off[p.id]}` : undefined}>
                    <div className="fg-pm-head"><b title={p.desc || p.label}>{p.label || p.id}</b>{off && off[p.id] ? <small className="fg-pm-offtag">收起</small> : null}
                      <button type="button" className="fg-btn is-mini" disabled={rows.every(e => p.emotions.includes(e))} title={`把表里的情绪都放进「${p.label}」`} onClick={() => fillPose(p)}>全选</button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {groups.map(g => {
                const id = g.category ? g.category.id : ''
                const isClosed = closed.has(id)
                return (
                  <React.Fragment key={id || '_'}>
                    <tr className="fg-pm-cat">
                      <td colSpan={poses.length + 1}>
                        <button type="button" onClick={() => fold(id)}>
                          <span className="fg-emo-caret">{isClosed ? '▸' : '▾'}</span>
                          <b>{g.category ? g.category.label : '未分类'}</b>
                          <span className="fg-note">{g.list.length} 种 · 放进了{word}的 {g.list.filter(e => placed.has(e.id)).length} 种</span>
                        </button>
                      </td>
                    </tr>
                    {!isClosed && g.list.map(entry => {
                      const e = entry.id
                      const inAll = poses.every(p => p.emotions.includes(e))
                      return (
                        <React.Fragment key={e}>
                          <tr className={`fg-pm-row${placed.has(e) ? '' : ' is-loose'}${open === e ? ' is-open' : ''}`}>
                            <th className="fg-pm-emo">
                              {rowOpen ? <button type="button" className="fg-pm-name" title="展开：他的这种情绪什么样" onClick={() => setOpen(open === e ? '' : e)}>{entry.label}</button> : <span className="fg-pm-name">{entry.label}</span>}
                              {!placed.has(e) && <small title={`不在任何${word}里：跟着替身的${word}只换脸`}>没放</small>}
                              <button type="button" className="fg-btn is-mini" disabled={inAll} title={`放进每一个${word}`} onClick={() => intoAll(e)}>全部{word}</button>
                            </th>
                            {poses.map(p => {
                              const on = p.emotions.includes(e)
                              const anchor = on && p.emotions[0] === e
                              const locked = on && (lockedCell(p, e) || lastOne(e))
                              return (
                                <td key={p.id} className={`fg-pm-cell${on ? ' is-on' : ''}${anchor ? ' is-anchor' : ''}${off && off[p.id] ? ' is-off' : ''}`}>
                                  <label title={locked ? (lockedCell(p, e) ? '平静总在第一个动作的底图上（登场立绘就是它）' : `至少留在一个${word}里`) : on ? `从「${p.label}」拿掉` : `放进「${p.label}」`}>
                                    <input type="checkbox" checked={on} disabled={locked} onChange={() => toggle(p, e)} />
                                  </label>
                                  {on && <button type="button" className="fg-pm-star" disabled={anchor || p.id === homes} title={anchor ? starText : p.id === homes ? `第一个${word}的星星固定是平静（登场立绘就是它）` : swap ? '点一下：改成这个情绪当底图' : `点一下：改成先画这一张`} onClick={() => star(p, e)}>{anchor ? '★' : '☆'}</button>}
                                  {on && cell ? cell(p, e) : null}
                                </td>
                              )
                            })}
                          </tr>
                          {open === e && rowOpen && <tr className="fg-pm-open"><td colSpan={poses.length + 1}>{rowOpen(e)}</td></tr>}
                        </React.Fragment>
                      )
                    })}
                  </React.Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      {poses.length > 0 && (
        <div className="fg-note fg-pm-legend">
          <b>★ 是什么：</b>{swap
            ? `每个${word}的底图。先整张画 ★ 这一张，同一列里别的表情都在它身上只重画脸，身体和衣服一点不动；想换哪个表情当底图，点它那格的 ☆。`
            : `每个${word}先画的那一张。设计好、让 AI 加${word}时先画 ★ 那张，让你看到这个${word}长什么样。现在每种表情都是整张画、各自照这个${word}的身体 tag 画，星星不影响别的表情；打开设置里的「表情只换脸」后，同一列别的表情才会在 ★ 那张身上只重画脸。点别的格子的 ☆ 能换成它。`}
          第一个{word}的星星固定是平静（登场立绘就是它）。
        </div>
      )}
    </div>
  )
}
