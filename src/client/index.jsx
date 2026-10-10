// FlowGal 浏览器半边。
// 只用 DSH 与 Tavern 的公开接口：
//   · slots：shell.overlay（剧场 + 提示）、sidebar.footer.action（入口）、settings.section（设置页）
//   · tavernUi：registerMediaRenderer（场景卡 / 插画）、registerMessageAction（剧场 / 配一张）、registerComposerAction（剧场）
import React from 'react'
import { openTheater } from './api.js'
import { injectStyles, Overlay, SettingsSection, openTurnInTheater, illustrateTurn } from './shell.jsx'
import { SceneCardInline, CgCardInline } from './chat/ChatCards.jsx'

const PLUGIN = 'flowgal'
// 卡片类型，和宿主半边 lib/engine.js 的 KIND_SCENE / KIND_CG 一致。
const KIND_SCENE = PLUGIN + '/scene'
const KIND_CG = PLUGIN + '/cg'

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
      run: openTurnInTheater,
    }), `${PLUGIN}: message action theater`)
    keep(ui.registerMessageAction({
      id: PLUGIN + '-illustrate',
      label: '🖼 配一张',
      when: c => Boolean(c && c.gameId) && c.settled !== false,
      run: illustrateTurn,
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
