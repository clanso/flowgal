// 「动作 × 情绪」的表（规则见 lib/poses.js）：设置里的通用动作组。
// 上面一排动作卡片：改名、写这个动作什么样、身体 tag、删；「＋ 加动作」。
// 下面的表一列一个动作、一行一个情绪（按类别折叠）：格子里打勾 = 这个情绪放进这个动作，☆ 设为这个动作的底图（整张画的那张，其余在它上面只换脸）；
// 每一行「全部动作」一下放进每一列，每一列「全选」把表里的情绪都放进来。
import React from 'react'
import { confirmBox } from '../ask.jsx'
import { emotionEntry, groupEmotions } from '../../../lib/emotions.js'
import { freshPoseId } from '../../../lib/poses.js'

const stop = e => e.stopPropagation()

/**
 * poses：现在的动作表；rows：表里列哪些情绪（编号，按情绪库的顺序）；lib：情绪库；onChange(新的动作表)。
 * prefix：新动作的编号前缀（通用动作组 g）；word：「动作」或「组」（提示里用）。
 */
export function PoseMatrix({ poses, rows, lib, onChange, prefix = 'p', word = '动作', newLabel = '新动作' }) {
  const [closed, setClosed] = React.useState(() => new Set())
  const label = e => emotionEntry(e, lib).label
  const placed = new Set(poses.flatMap(p => p.emotions))
  const homes = poses.length && poses[0].emotions[0] === 'neutral' ? poses[0].id : ''
  const set = next => onChange(next)
  const patchPose = (id, patch) => set(poses.map(p => (p.id === id ? { ...p, ...patch } : p)))
  // 平静在第一个动作的底图上（登场立绘就是它），那一格锁着
  const lockedCell = (p, e) => e === 'neutral' && p.id === homes
  const toggle = (p, e) => {
    if (p.emotions.includes(e)) {
      if (lockedCell(p, e)) return
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
  const fold = id => setClosed(c => { const n = new Set(c); if (n.has(id)) n.delete(id); else n.add(id); return n })
  const input = (value, onChange, placeholder, className = '') => <input className={`fg-input ${className}`} value={value || ''} placeholder={placeholder} onChange={e => onChange(e.target.value)} onKeyDown={stop} />
  return (
    <div className="fg-pm">
      <div className="fg-pm-poses">
        {poses.map((p, i) => (
          <div key={p.id} className="fg-pm-pose">
            <div className="fg-row">
              <small className="fg-pm-id" title={`${word}编号：导演点名换${word}时写它`}>{p.id}</small>
              {input(p.label, v => patchPose(p.id, { label: v.slice(0, 12) }), `${word}名`, 'fg-pm-label')}
              <button type="button" className="fg-btn is-mini" title={`删掉这个${word}`} onClick={() => dropPose(p)}>✕</button>
            </div>
            {input(p.desc, v => patchPose(p.id, { desc: v.slice(0, 200) }), `这个${word}什么样${i === 0 ? '（平时最常有的样子）' : ''}`)}
            {input(p.tags, v => patchPose(p.id, { tags: v }), '身体的英文 tag：hands behind back, weight on one leg')}
            <span className="fg-note">{p.emotions.length ? `${p.emotions.length} 种情绪 · 底图「${label(p.emotions[0])}」` : '还没放情绪：在下面的表里勾'}</span>
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
                  <th key={p.id}>
                    <div className="fg-pm-head"><b title={p.desc || p.label}>{p.label || p.id}</b>
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
                        <tr key={e} className={`fg-pm-row${placed.has(e) ? '' : ' is-loose'}`}>
                          <th className="fg-pm-emo">
                            <span className="fg-pm-name">{entry.label}</span>
                            {!placed.has(e) && <small title={`不在任何${word}里：跟着替身的${word}只换脸`}>没放</small>}
                            <button type="button" className="fg-btn is-mini" disabled={inAll} title={`放进每一个${word}`} onClick={() => intoAll(e)}>全部{word}</button>
                          </th>
                          {poses.map(p => {
                            const on = p.emotions.includes(e)
                            const anchor = on && p.emotions[0] === e
                            const locked = on && lockedCell(p, e)
                            return (
                              <td key={p.id} className={`fg-pm-cell${on ? ' is-on' : ''}${anchor ? ' is-anchor' : ''}`}>
                                <label title={locked ? '平静总在第一个动作的底图上（登场立绘就是它）' : on ? `从「${p.label}」拿掉` : `放进「${p.label}」`}>
                                  <input type="checkbox" checked={on} disabled={locked} onChange={() => toggle(p, e)} />
                                </label>
                                {on && <button type="button" className="fg-pm-star" disabled={anchor || p.id === homes} title={anchor ? '这个动作的底图：整张画这一张，其余情绪在它上面只换脸' : p.id === homes ? '第一个动作的底图是平静' : '设为这个动作的底图'} onClick={() => star(p, e)}>{anchor ? '★' : '☆'}</button>}
                              </td>
                            )
                          })}
                        </tr>
                      )
                    })}
                  </React.Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
