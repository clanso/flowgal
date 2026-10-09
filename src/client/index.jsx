// FlowGal 浏览器半边。
// 只用 DSH 与 Tavern 的公开接口：
//   · slots：shell.overlay（剧场 + 提示）、sidebar.footer.action（入口）、settings.section（设置页）
//   · tavernUi：registerMediaRenderer（场景卡 / 插画）、registerMessageAction（剧场 / 配一张）、registerComposerAction（剧场）
import React from 'react'
import theaterCss from './styles/theater.css'
import skinsCss from './styles/skins.css'
import chatCss from './styles/chat.css'
import { api, openTheater, rememberGame, toast, useConfig, patchConfig, useUpdate, updateAvailable } from './api.js'
import { TheaterRoot, Toast } from './theater/Theater.jsx'
import { SceneCardInline, CgCardInline } from './chat/ChatCards.jsx'

const PLUGIN = 'flowgal'
// 卡片类型，和宿主半边 lib/engine.js 的 KIND_SCENE / KIND_CG 一致。
const KIND_SCENE = PLUGIN + '/scene'
const KIND_CG = PLUGIN + '/cg'

function injectStyles() {
  if (document.getElementById('fg-styles')) return () => {}
  const style = document.createElement('style')
  style.id = 'fg-styles'
  style.textContent = [theaterCss, skinsCss, chatCss].join('\n')
  document.head.appendChild(style)
  return () => style.remove()
}

function Overlay() {
  return <><TheaterRoot /><Toast /></>
}

function Launcher(props) {
  const wide = !props || props.wide !== false
  return (
    <button type="button" title="FlowGal：把对话当 galgame 看" onClick={() => openTheater()}
      style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: wide ? 'flex-start' : 'center', width: '100%', margin: '2px 0', background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', padding: wide ? '8px 10px' : '8px 0', borderRadius: 8, fontSize: 13, textAlign: 'left' }}>
      <span style={{ fontSize: 15, lineHeight: 1 }}>🎬</span>
      {wide ? <span>FlowGal</span> : null}
    </button>
  )
}

/** 设置卡里的一行版本信息：有新版本 / 已下载待重启时提示，点进剧场的「版本与更新」页。 */
function UpdateLine() {
  const u = useUpdate()
  const text = !u ? '' : !u.managed ? '' : u.restartRequired ? '新版本已下载，重启 DSH 后生效' : updateAvailable(u) ? `有新版本（${u.last.commits.length || u.last.behind} 个更新）` : ''
  return (
    <div className="fg-settings-row">
      <span style={{ opacity: 0.7 }}>v{__FLOWGAL_VERSION__}{u && u.managed ? ` · ${u.current.sha}` : ''}</span>
      {text && <span style={{ color: '#d9822b' }}>● {text}</span>}
      <button type="button" className="fg-ghost" onClick={() => openTheater('', { panel: 'settings', panelArg: 'about' })}>版本与更新</button>
    </div>
  )
}

function SettingsSection() {
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

export const name = PLUGIN
export const inject = ['slots']

export function apply(ctx) {
  const effect = (fn, label) => (typeof ctx.effect === 'function' ? ctx.effect(fn, label) : fn())
  effect(injectStyles, `${PLUGIN}: styles`)
  const seat = (slot, options, Component) => {
    try { ctx.slots && ctx.slots.inject && ctx.slots.inject(slot, () => ctx.slots.register({ name: slot, ...options }, Component)) } catch (error) {
      try { console.warn(`[${PLUGIN}] ${slot} 注册失败：`, error && error.message) } catch {}
    }
  }
  seat('shell.overlay', { id: PLUGIN + '-theater', order: 96 }, Overlay)
  seat('sidebar.footer.action', { id: PLUGIN + '-launcher', order: 47, label: 'FlowGal' }, Launcher)
  seat('settings.section', { id: PLUGIN, order: 46, label: () => 'FlowGal' }, SettingsSection)

  if (typeof ctx.inject !== 'function') return
  ctx.inject(['tavernUi'], owner => {
    const ui = owner.tavernUi
    if (!ui || !(ui.apiVersion >= 1)) { try { console.warn(`[${PLUGIN}] 当前 Tavern 没有 tavernUi 接口，剧场入口不可用`) } catch {} return }
    const keep = (off, label) => { if (typeof off === 'function') (owner.effect ? owner.effect(() => off, label) : null) }
    const guard = render => args => { try { return render(args || {}) } catch (error) { try { console.warn(`[${PLUGIN}] 渲染失败：`, error && error.message) } catch {} return null } }
    keep(ui.registerMediaRenderer(KIND_SCENE, guard(({ item, gameId, turn }) => <SceneCardInline item={item} gameId={gameId} turn={turn} />)), `${PLUGIN}: scene card`)
    keep(ui.registerMediaRenderer(KIND_CG, guard(({ item, gameId }) => <CgCardInline item={item} gameId={gameId} />)), `${PLUGIN}: cg card`)
    keep(ui.registerMessageAction({
      id: PLUGIN + '-theater',
      label: '🎬 剧场',
      when: c => Boolean(c && c.gameId) && c.settled !== false,
      run: async c => {
        rememberGame(c.gameId)
        openTheater(c.gameId, { turn: c.turn })
        // 没整理过的轮次（开场白、关掉自动整理时）顺手整理；已整理的直接返回。
        api.direct(c.gameId, c.turn).catch(error => toast('整理失败：' + (error && error.message), 'error'))
      },
    }), `${PLUGIN}: message action theater`)
    keep(ui.registerMessageAction({
      id: PLUGIN + '-illustrate',
      label: '🖼 配一张',
      when: c => Boolean(c && c.gameId) && c.settled !== false,
      run: async c => {
        try {
          await api.direct(c.gameId, c.turn)
          await api.addImage(c.gameId, c.turn, '', {})
          toast('已安排一张插画，画好后出现在这条消息里')
        } catch (error) { toast('配图失败：' + (error && error.message), 'error') }
      },
    }), `${PLUGIN}: message action illustrate`)
    if (typeof ui.registerComposerAction === 'function') {
      keep(ui.registerComposerAction({
        id: PLUGIN + '-theater',
        label: '🎬 剧场',
        when: c => Boolean(c && c.gameId),
        run: c => { rememberGame(c.gameId); openTheater(c.gameId, { turn: c.turn }) },
      }), `${PLUGIN}: composer action`)
    }
  })
}
