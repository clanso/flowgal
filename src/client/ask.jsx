// 页面里自己画的确认框、输入框，代替浏览器原生的 window.confirm / window.prompt。
// DSH 桌面版（Electron）在 Windows 上：原生对话框一关，网页常常拿不回键盘焦点——输入框点了没光标、打不进字，
// 下拉框点不开，要切到别的窗口再切回来才好（electron/electron#31917）；window.prompt 在 Electron 里干脆不支持。
// 所以 FlowGal 的界面一律走这里：confirmBox 回 true / false，promptBox 回填的字或 null（取消），choiceBox 回选的那一项或 null（取消）。
import React from 'react'

let queue = [] // 排着队的对话框：同时弹好几个时一个一个来
let seq = 0
let returnFocus = null // 第一个对话框弹出来之前焦点在哪，全部关掉后放回去
const listeners = new Set()
const subscribe = fn => { listeners.add(fn); return () => listeners.delete(fn) }
const current = () => queue[0] || null
const emit = () => { for (const fn of [...listeners]) fn() }

function ask(opts) {
  return new Promise(resolve => {
    if (!queue.length) returnFocus = document.activeElement
    queue = [...queue, { ...opts, id: ++seq, resolve }]
    emit()
  })
}

function settle(answer) {
  const [head, ...rest] = queue
  if (!head) return
  queue = rest
  emit()
  if (!queue.length) {
    const el = returnFocus
    returnFocus = null
    try { if (el && el.isConnected && el !== document.body) el.focus({ preventScroll: true }) } catch {}
  }
  head.resolve(answer)
}

/** 有对话框开着：剧场、大图这些全局快捷键先让开。 */
export const asking = () => queue.length > 0

/**
 * 确认框。opts：title 标题、ok / cancel 按钮字、danger 确认键标红（删除这类）。
 * @returns {Promise<boolean>}
 */
export const confirmBox = (text, opts = {}) => ask({ ...opts, text })

/**
 * 输入框。value 是一开始填好的字；opts 同确认框，另有 placeholder。
 * @returns {Promise<string|null>} 取消时是 null
 */
export const promptBox = (text, value = '', opts = {}) => ask({ ...opts, text, input: { value: value == null ? '' : String(value) } })

/**
 * 几选一：choices 是 [{ value, label, danger? }]，按顺序排在「取消」后面；opts 同确认框（cancel 改取消键的字）。
 * @returns {Promise<any|null>} 选的那一项的 value，取消时是 null
 */
export const choiceBox = (text, choices, opts = {}) => ask({ ...opts, text, choices })

export function AskHost() {
  const item = React.useSyncExternalStore(subscribe, current, current)
  return item ? <AskDialog key={item.id} item={item} /> : null
}

function AskDialog({ item }) {
  const [value, setValue] = React.useState(item.input ? item.input.value : '')
  const boxRef = React.useRef(null)
  const firstRef = React.useRef(null)
  const downOutside = React.useRef(false)
  const yes = () => settle(item.input ? value : true)
  const no = () => settle(item.input || item.choices ? null : false)
  React.useEffect(() => {
    const el = firstRef.current
    if (!el) return
    try { el.focus({ preventScroll: true }) } catch {}
    if (item.input && el.select) el.select()
  }, [])
  const onKey = e => {
    // 宿主的全局快捷键（Esc 关面板这些）不跟着响
    e.stopPropagation()
    if (e.nativeEvent.isComposing || e.keyCode === 229) return // 输入法还在选字：回车是上屏，Esc 是取消选字
    if (e.key === 'Escape') { e.preventDefault(); no() }
    else if (e.key === 'Enter' && e.target.tagName === 'INPUT') { e.preventDefault(); yes() }
    else if (e.key === 'Tab') {
      // 焦点只在框里转
      const list = [...boxRef.current.querySelectorAll('input, button')].filter(el => !el.disabled)
      if (!list.length) return
      const at = list.indexOf(document.activeElement)
      const next = e.shiftKey ? (at <= 0 ? list.length - 1 : at - 1) : (at < 0 || at === list.length - 1 ? 0 : at + 1)
      e.preventDefault()
      list[next].focus()
    }
  }
  const titleId = `fg-ask-title-${item.id}`
  const textId = `fg-ask-text-${item.id}`
  return (
    <div className="fg-ask" role="presentation"
      onPointerDown={e => { downOutside.current = e.target === e.currentTarget }}
      // 在框里按下、拖到外面才松手（选字时常有）不算点外面
      onClick={e => { if (e.target === e.currentTarget && downOutside.current) no() }}
      onKeyDown={onKey}>
      <div ref={boxRef} className={`fg-ask-box${item.danger ? ' is-danger' : ''}`} role="alertdialog" aria-modal="true"
        aria-labelledby={item.title ? titleId : undefined} aria-describedby={textId}>
        {item.title && <div className="fg-ask-title" id={titleId}>{item.title}</div>}
        <div className="fg-ask-text" id={textId}>{item.text}</div>
        {item.input && (
          <input ref={firstRef} className="fg-ask-input" value={value} placeholder={item.placeholder || ''} aria-labelledby={textId}
            onChange={e => setValue(e.target.value)} />
        )}
        <div className="fg-ask-row">
          <button type="button" className="fg-ask-btn" onClick={no}>{item.cancel || '取消'}</button>
          {item.choices ? item.choices.map((c, i) => (
            <button key={i} type="button" ref={i === 0 ? firstRef : undefined} className={`fg-ask-btn is-yes${c.danger ? ' is-danger' : ''}`} onClick={() => settle(c.value)}>{c.label}</button>
          )) : <button type="button" ref={item.input ? undefined : firstRef} className="fg-ask-btn is-yes" onClick={yes}>{item.ok || '确定'}</button>}
        </div>
      </div>
    </div>
  )
}
