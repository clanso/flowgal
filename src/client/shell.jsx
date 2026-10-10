// 两个宿主共用的界面件：样式、剧场覆盖层、设置卡、消息上的「剧场」「配一张」。
// 各宿主的入口（DSH：src/client/index.jsx；酒馆：st/index.jsx）只管把它们挂到自己的界面上。
import React from 'react'
import theaterCss from './styles/theater.css'
import skinsCss from './styles/skins.css'
import chatCss from './styles/chat.css'
import { api, openTheater, rememberGame, toast, useConfig, patchConfig, useUpdate, updateAvailable, hostName } from './api.js'
import { TheaterRoot, Toast } from './theater/Theater.jsx'

export function injectStyles() {
  if (document.getElementById('fg-styles')) return () => {}
  const style = document.createElement('style')
  style.id = 'fg-styles'
  style.textContent = [theaterCss, skinsCss, chatCss].join('\n')
  document.head.appendChild(style)
  return () => style.remove()
}

export function Overlay() {
  return <><TheaterRoot /><Toast /></>
}

/** 设置卡里的一行版本信息：有新版本 / 已下载待重启时提示，点进剧场的「版本与更新」页。 */
export function UpdateLine() {
  const u = useUpdate()
  const text = !u ? '' : !u.managed ? '' : u.restartRequired ? '新版本已下载，重启 DSH 后生效' : updateAvailable(u) ? `有新版本（${u.last.commits.length || u.last.behind} 个更新）` : ''
  return (
    <div className="fg-settings-row">
      <span style={{ opacity: 0.7 }}>v{__FLOWGAL_VERSION__}{u && u.managed ? ` · ${u.current.sha}` : ''}</span>
      {text && <span style={{ color: '#d9822b' }}>● {text}</span>}
      {hostName() === 'st'
        ? <span style={{ opacity: 0.7 }}>更新：酒馆「扩展 → 管理扩展」里点 FlowGal 的更新</span>
        : <button type="button" className="fg-ghost" onClick={() => openTheater('', { panel: 'settings', panelArg: 'about' })}>版本与更新</button>}
    </div>
  )
}

export function SettingsSection() {
  const data = useConfig()
  if (!data) return <div className="fg-settings-card">读取中…</div>
  const cfg = data.config
  const toggle = (section, key) => patchConfig(section ? { [section]: { [key]: !cfg[section][key] } } : { [key]: !cfg[key] }).catch(e => toast(e.message, 'error'))
  const box = { display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }
  return (
    <div className="fg-settings-card">
      <h3>🎬 FlowGal <span style={{ fontSize: 12, opacity: 0.6, fontWeight: 400 }}>v{__FLOWGAL_VERSION__}</span></h3>
      <p>正文照常流式输出；每轮写完后，后台导演把它整理成视觉小说场景（说话人、表情、站位、镜头、天气、选项），并按柏宝绘的方式自动配插画、背景和立绘。打开剧场就能当 galgame 看。</p>
      <div className="fg-settings-row">
        <label style={box}><input type="checkbox" checked={cfg.enabled} onChange={() => toggle('', 'enabled')} />启用</label>
        <label style={box}><input type="checkbox" checked={cfg.director.auto} onChange={() => toggle('director', 'auto')} />每轮自动整理</label>
        <label style={box}><input type="checkbox" checked={cfg.images.auto} onChange={() => toggle('images', 'auto')} />自动配图</label>
        <label style={box}><input type="checkbox" checked={cfg.ui.autoOpen} onChange={() => toggle('ui', 'autoOpen')} />写完自动打开剧场</label>
      </div>
      <div className="fg-settings-row">
        <span style={{ color: data.ready ? '#4caf7a' : '#d9822b' }}>{data.ready ? '● 生图已就绪' : '● ' + data.readyReason}</span>
        <button type="button" className="fg-play" onClick={() => openTheater('', { panel: 'settings' })}>打开完整设置</button>
      </div>
      <UpdateLine />
    </div>
  )
}

/** 消息上的「🎬 剧场」：打开剧场到这一轮；没整理过的顺手整理。c = { gameId, turn }。 */
export async function openTurnInTheater(c) {
  rememberGame(c.gameId)
  openTheater(c.gameId, { turn: c.turn })
  // 没整理过的轮次（开场白、关掉自动整理时）顺手整理；已整理的直接返回。
  api.direct(c.gameId, c.turn).catch(error => toast('整理失败：' + (error && error.message), 'error'))
}

/** 消息上的「🖼 配一张」：先整理这一轮，再加一张插画。 */
export async function illustrateTurn(c) {
  try {
    await api.direct(c.gameId, c.turn)
    await api.addImage(c.gameId, c.turn, '', {})
    toast('已安排一张插画，画好后出现在这条消息里')
  } catch (error) { toast('配图失败：' + (error && error.message), 'error') }
}
