// 设置 →「声音」里的两块：自己做音色（从任何一个音色复制一份来改，或从头做；逐段调波形、频率、长短、音量，也能直接改配方 JSON），
// 和自动分配的音色组（没指定声音的角色按性别从哪几个里挑）。配方的写法和范围见 lib/sounds.js（cleanPart）。
import React from 'react'
import { toast } from '../api.js'
import { confirmBox } from '../ask.jsx'
import { previewVoice, loudnessVsClassic } from './audio.js'
import { VOICES, voiceById, cleanPart, customRef, CUSTOM_VOICE_LIMIT, CUSTOM_PART_LIMIT, POOL_GENDERS, DEFAULT_VOICE_POOLS } from '../../../lib/sounds.js'

const WAVES = [['sine', '正弦（圆润）'], ['triangle', '三角（柔和）'], ['square', '方波（游戏机）'], ['sawtooth', '锯齿（亮、带刺）'], ['noise', '噪声（气声、咔嗒）']]
export const VOICE_GENDERS = [['female', '女声'], ['male', '男声'], ['other', '其他性别'], ['', '不分男女']]
const POOL_LABEL = { female: '女性', male: '男性', other: '其他性别', '': '没标性别' }
const newId = () => 'v' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
const r4 = v => Number(Number(v).toFixed(4))
const r1 = v => Math.round(v * 10) / 10 // 频率到 0.1 Hz 就够了，格子里也放得下

/** 数字格：失焦或回车才提交；清空提交 undefined（这一项不写，用默认）。scale 是显示的倍数（秒显示成毫秒）。 */
function Num({ value, onCommit, scale = 1, step = 'any', placeholder, title, width = '5.4cqw' }) {
  const shown = value === undefined || value === null ? '' : String(r4(value * scale))
  const [v, setV] = React.useState(shown)
  React.useEffect(() => { setV(shown) }, [shown])
  const commit = () => { if (v !== shown) onCommit(v.trim() === '' ? undefined : Number(v) / scale) }
  return <input className="fg-input" type="number" step={step} value={v} placeholder={placeholder} title={title} style={{ width }} onChange={e => setV(e.target.value)} onBlur={commit} onKeyDown={e => { e.stopPropagation(); if (e.key === 'Enter') commit() }} />
}

/** 整份配方一起改：音高乘一个倍数、长短乘一个倍数、音量乘一个倍数。 */
const transpose = (parts, k) => parts.map(x => ({ ...x, f: r1(x.f * k), ...(x.to ? { to: r1(x.to * k) } : {}) }))
const stretch = (parts, k) => parts.map(x => ({ ...x, dur: r4(x.dur * k), ...(x.at ? { at: r4(x.at * k) } : {}), ...(x.attack !== undefined ? { attack: r4(x.attack * k) } : {}), ...(x.hold ? { hold: r4(x.hold * k) } : {}) }))
const louder = (parts, k) => parts.map(x => ({ ...x, gain: r4(Math.min(0.4, Math.max(0.0005, x.gain * k))) }))
const clean = parts => parts.map(cleanPart).filter(Boolean)

/** 一段声部：一行格子。 */
function PartRow({ part, index, onChange, onRemove, onPlay, canRemove }) {
  const set = (key, value) => {
    const next = { ...part }
    if (value === undefined || Number.isNaN(value)) delete next[key]
    else next[key] = value
    const fixed = cleanPart(next)
    if (fixed) onChange(fixed)
  }
  const noise = part.wave === 'noise'
  return (
    <div className="fg-vm-part">
      <span className="fg-vm-idx">{index + 1}</span>
      <select className="fg-select" style={{ width: 'auto' }} value={part.wave} aria-label="波形" onChange={e => set('wave', e.target.value)}>{WAVES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
      <button type="button" className="fg-btn is-mini" title="只听这一段" onClick={onPlay}>▶</button>
      <button type="button" className="fg-btn is-mini fg-danger" disabled={!canRemove} title="删掉这一段" onClick={onRemove}>✕</button>
      <label title={noise ? '噪声滤过的中心频率' : '起始频率'}>{noise ? '滤波' : '频率'}<Num value={part.f} onCommit={v => set('f', v ?? 440)} />Hz</label>
      <label title="往这个频率滑过去（指数滑，留空不滑）">滑到<Num value={part.to} placeholder="不滑" onCommit={v => set('to', v)} />Hz</label>
      <label title="从响起到衰减到听不见">时长<Num value={part.dur} width="4.2cqw" scale={1000} onCommit={v => set('dur', v ?? 0.05)} />ms</label>
      <label title="峰值音量，0.0005~0.4；经典哔哔是 0.045">音量<Num value={part.gain} step="0.001" onCommit={v => set('gain', v ?? 0.03)} /></label>
      <label title="起音：从无到峰值用多久（留空：振荡器 6ms、噪声瞬间）">起音<Num value={part.attack} width="4.2cqw" scale={1000} placeholder="默认" onCommit={v => set('attack', v)} />ms</label>
      <label title="到峰值后先稳住多久再开始衰减（留空不稳住）">稳住<Num value={part.hold} width="4.2cqw" scale={1000} placeholder="0" onCommit={v => set('hold', v)} />ms</label>
      <label title="比这个字晚多久响（做两下、三连音用）">延后<Num value={part.at} width="4.2cqw" scale={1000} placeholder="0" onCommit={v => set('at', v)} />ms</label>
      {noise
        ? <label title="噪声滤波器的 Q：越大越像一个音，越小越像沙沙声">Q<Num value={part.q} placeholder="1" width="4cqw" onCommit={v => set('q', v)} /></label>
        : <label title="后面加一道低通，压掉高频的棱角（留空不加）">低通<Num value={part.lp} placeholder="不加" onCommit={v => set('lp', v)} />Hz</label>}
    </div>
  )
}

/** 编辑一个自己的音色（draft 是还没保存的那份）。 */
function VoiceEditor({ draft, setDraft, ui, onSave, onCancel, isNew }) {
  const [json, setJson] = React.useState(false)
  const [text, setText] = React.useState('')
  const parts = draft.parts
  const setParts = next => setDraft({ ...draft, parts: next })
  const base = draft.from ? voiceById(draft.from) : null
  const play = list => previewVoice({ id: customRef(draft.id), parts: list, pitch: 0 }, ui)
  const align = async () => {
    const k = await loudnessVsClassic(parts)
    if (!(k > 0)) return
    setParts(louder(parts, 1 / k))
    toast(`音量${k > 1 ? '调低' : '调高'}了 ${Math.abs(20 * Math.log10(k)).toFixed(1)} dB，跟经典哔哔一样响`)
  }
  const openJson = () => { setText(JSON.stringify(parts, null, 1)); setJson(true) }
  const applyJson = () => {
    try {
      const list = JSON.parse(text)
      if (!Array.isArray(list)) throw new Error('要是一个数组：[{ "wave": "sine", "f": 440, "dur": 0.05, "gain": 0.04 }, …]')
      const fixed = clean(list).slice(0, CUSTOM_PART_LIMIT)
      if (!fixed.length) throw new Error('一段能放的声部都没有（wave 要是 sine / triangle / square / sawtooth / noise）')
      setParts(fixed)
      setJson(false)
      if (fixed.length < list.length) toast(`有 ${list.length - fixed.length} 段认不出，丢掉了`, 'error')
    } catch (e) { toast('配方没读成：' + e.message, 'error') }
  }
  return (
    <div className="fg-vm-editor">
      <div className="fg-row">
        <input className="fg-input" value={draft.label} maxLength={24} placeholder="名字" style={{ width: '10cqw' }} onChange={e => setDraft({ ...draft, label: e.target.value })} onKeyDown={e => e.stopPropagation()} />
        <select className="fg-select" style={{ width: 'auto' }} value={draft.gender} aria-label="性别" onChange={e => setDraft({ ...draft, gender: e.target.value })}>{VOICE_GENDERS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        <input className="fg-input" value={draft.desc} maxLength={120} placeholder="说明（听起来怎么样、适合谁）" style={{ flex: 1 }} onChange={e => setDraft({ ...draft, desc: e.target.value })} onKeyDown={e => e.stopPropagation()} />
      </div>
      <label className="fg-row fg-note" style={{ gap: '.5cqw' }}>
        <input type="checkbox" checked={Boolean(draft.fixed)} onChange={e => setDraft({ ...draft, fixed: e.target.checked || undefined })} />
        照原样放：自动分配时不按名字错开音高（同一个音色的人听起来完全一样），当旁白也不压低
      </label>
      {!json && (
        <div className="fg-vm-parts">
          {parts.map((part, i) => (
            <PartRow key={i} part={part} index={i} canRemove={parts.length > 1}
              onChange={next => setParts(parts.map((x, j) => (j === i ? next : x)))}
              onRemove={() => setParts(parts.filter((_, j) => j !== i))}
              onPlay={() => play([{ ...part, at: 0 }])} />
          ))}
        </div>
      )}
      {json && (
        <textarea className="fg-textarea" value={text} spellCheck={false} style={{ fontFamily: 'monospace', minHeight: '14cqw' }} onChange={e => setText(e.target.value)} onKeyDown={e => e.stopPropagation()} />
      )}
      <div className="fg-row fg-vm-tools">
        {!json && <button type="button" className="fg-btn is-mini" disabled={parts.length >= CUSTOM_PART_LIMIT} onClick={() => setParts([...parts, { wave: 'sine', f: 660, dur: 0.05, gain: 0.03 }])}>＋ 加一段</button>}
        {!json && <span className="fg-note">整体：</span>}
        {!json && <>
          <button type="button" className="fg-btn is-mini" title="所有频率降一个半音" onClick={() => setParts(transpose(parts, 2 ** (-1 / 12)))}>音高 −</button>
          <button type="button" className="fg-btn is-mini" title="所有频率升一个半音" onClick={() => setParts(transpose(parts, 2 ** (1 / 12)))}>音高 ＋</button>
          <button type="button" className="fg-btn is-mini" title="所有时长缩短到 80%" onClick={() => setParts(clean(stretch(parts, 0.8)))}>短一点</button>
          <button type="button" className="fg-btn is-mini" title="所有时长拉长到 125%" onClick={() => setParts(clean(stretch(parts, 1.25)))}>长一点</button>
          <button type="button" className="fg-btn is-mini" title="整体轻 2 dB" onClick={() => setParts(louder(parts, 10 ** (-2 / 20)))}>轻一点</button>
          <button type="button" className="fg-btn is-mini" title="整体响 2 dB" onClick={() => setParts(louder(parts, 10 ** (2 / 20)))}>响一点</button>
          <button type="button" className="fg-btn is-mini" title="按 A 计权响度调到跟经典哔哔一样响" onClick={align}>音量对齐经典哔哔</button>
        </>}
        {json
          ? <><button type="button" className="fg-btn is-mini is-primary" onClick={applyJson}>用这份配方</button><button type="button" className="fg-btn is-mini" onClick={() => setJson(false)}>不改了</button></>
          : <button type="button" className="fg-btn is-mini" title="直接改配方（每段的 wave、f、to、dur、gain、attack、hold、at、q、lp）" onClick={openJson}>改配方 JSON</button>}
        {base && <button type="button" className="fg-btn is-mini" title={`配方换回「${base.label}」原来的样子`} onClick={() => setParts(base.parts.map(x => ({ ...x })))}>恢复成「{base.label}」</button>}
      </div>
      <div className="fg-row">
        <button type="button" className="fg-btn" onClick={() => play(parts)}>▶ 试听</button>
        <span className="fg-spacer" />
        <button type="button" className="fg-btn is-primary" disabled={json} onClick={onSave}>{isNew ? '保存这个音色' : '保存'}</button>
        <button type="button" className="fg-btn" onClick={onCancel}>取消</button>
      </div>
    </div>
  )
}

/** 「自己的音色」一节：列表 + 新建 / 编辑 / 复制 / 删除。保存时整份 customVoices 一起写回设置。 */
export function VoiceMaker({ ui, p }) {
  const mine = ui.customVoices || []
  const [base, setBase] = React.useState('classic')
  const [draft, setDraft] = React.useState(null) // 正在编辑的那份（还没保存）
  const save = list => p({ customVoices: list })
  const start = from => {
    if (mine.length >= CUSTOM_VOICE_LIMIT) { toast(`最多 ${CUSTOM_VOICE_LIMIT} 个自己的音色`, 'error'); return }
    const src = voiceById(from) || mine.find(v => customRef(v.id) === from) || voiceById('classic')
    setDraft({ id: newId(), label: `${src.label}（改）`.slice(0, 24), desc: src.desc || '', gender: src.gender || '', ...(src.fixed ? { fixed: true } : {}), from: voiceById(src.from) ? src.from : voiceById(from) ? from : undefined, parts: src.parts.map(x => ({ ...x })), isNew: true })
  }
  const commit = () => {
    const { isNew, ...voice } = draft
    const clean = { ...voice, label: voice.label.trim() || '我的音色', desc: voice.desc.trim() }
    save(isNew ? [...mine, clean] : mine.map(v => (v.id === clean.id ? clean : v)))
    setDraft(null)
    toast(isNew ? `做好了「${clean.label}」：档案、旁白和上面的下拉框里都能选` : '已保存')
  }
  const remove = async v => {
    if (!(await confirmBox(`删掉自己的音色「${v.label}」？用着它的角色会退回经典哔哔，设置里用着它的退回默认。`, { ok: '删除', danger: true }))) return
    save(mine.filter(x => x.id !== v.id))
    if (draft && draft.id === v.id) setDraft(null)
  }
  const copies = [...VOICES.map(v => [v.id, v.label]), ...mine.map(v => [customRef(v.id), `${v.label}（自己的）`])]
  return (
    <>
      <div className="fg-section">自己的音色 · {mine.length} 个</div>
      <div className="fg-note">从任何一个音色复制一份来改，逐段调波形、频率、长短、音量，或者直接改配方 JSON；改的时候随时试听，保存后在人物档案、旁白、上面的下拉框和自动分配里都能选。</div>
      <div className="fg-row" style={{ margin: '.6cqw 0' }}>
        <span className="fg-note">从</span>
        <select className="fg-select" style={{ width: 'auto' }} value={base} aria-label="从哪个音色复制" onChange={e => setBase(e.target.value)}>{copies.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        <button type="button" className="fg-btn is-primary" disabled={Boolean(draft)} onClick={() => start(base)}>复制一份来改</button>
      </div>
      {draft && draft.isNew && <VoiceEditor draft={draft} setDraft={setDraft} ui={ui} onSave={commit} onCancel={() => setDraft(null)} isNew />}
      <div className="fg-vm-list">
        {mine.map(v => (
          <div key={v.id} className="fg-vm-item">
            <div className="fg-row">
              <button type="button" className="fg-btn is-mini" onClick={() => previewVoice({ id: customRef(v.id), pitch: 0 }, ui)}>▶</button>
              <b>{v.label}</b>
              <span className="fg-note">{(VOICE_GENDERS.find(([g]) => g === v.gender) || [])[1]}{v.fixed ? ' · 照原样放' : ''} · {v.parts.length} 段{v.desc ? ' · ' + v.desc : ''}</span>
              <span className="fg-spacer" />
              <button type="button" className="fg-btn is-mini" disabled={Boolean(draft)} onClick={() => setDraft({ ...v, parts: v.parts.map(x => ({ ...x })), desc: v.desc || '' })}>编辑</button>
              <button type="button" className="fg-btn is-mini" disabled={Boolean(draft)} onClick={() => start(customRef(v.id))}>复制</button>
              <button type="button" className="fg-btn is-mini fg-danger" onClick={() => remove(v)}>删除</button>
            </div>
            {draft && !draft.isNew && draft.id === v.id && <VoiceEditor draft={draft} setDraft={setDraft} ui={ui} onSave={commit} onCancel={() => setDraft(null)} />}
          </div>
        ))}
      </div>
    </>
  )
}

/** 自动分配的音色组：没指定声音的角色按性别从哪几个里挑（按名字固定挑一个，一局里尽量不撞）。options 是所有能选的音色 [[编号, 名字]]。 */
export function VoicePools({ ui, p, options }) {
  const pools = ui.voicePools || DEFAULT_VOICE_POOLS
  const name = id => (options.find(([v]) => v === id) || [id, id])[1]
  const set = (g, list) => p({ voicePools: { [g]: list } })
  return (
    <div className="fg-vm-pools">
      {POOL_GENDERS.map(g => {
        const list = pools[g] || DEFAULT_VOICE_POOLS[g]
        const isDefault = list.join() === DEFAULT_VOICE_POOLS[g].join()
        const rest = options.filter(([v]) => !list.includes(v))
        return (
          <div key={g} className="fg-row fg-vm-pool">
            <span className="fg-vm-pool-label">{POOL_LABEL[g]}</span>
            {list.map(id => (
              <span key={id} className="fg-look-chip">
                <button type="button" className="fg-linkbtn" title="试听" onClick={() => previewVoice({ id, pitch: 0 }, ui)}>▶ {name(id)}</button>
                {list.length > 1 && <button type="button" className="fg-linkbtn" title="从这一组拿掉" onClick={() => set(g, list.filter(x => x !== id))}>✕</button>}
              </span>
            ))}
            <select className="fg-select" style={{ width: 'auto' }} value="" aria-label={`给${POOL_LABEL[g]}加一个音色`} onChange={e => { if (e.target.value) set(g, [...list, e.target.value]) }}>
              <option value="">＋ 加一个</option>
              {rest.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            {!isDefault && <button type="button" className="fg-btn is-mini" onClick={() => set(g, [...DEFAULT_VOICE_POOLS[g]])}>恢复默认</button>}
          </div>
        )
      })}
    </div>
  )
}
