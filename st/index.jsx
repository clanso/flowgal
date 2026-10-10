// FlowGal 酒馆版入口（SillyTavern UI 扩展，manifest.json 的 hooks.activate 指向 onActivate）。
// 核心、引擎都在这个页面里跑（st/host.js）；界面跟 DSH 版是同一套（src/client/），只是挂的位置换成酒馆的：
//   · 剧场覆盖层：页面最上层的一个 div
//   · 入口：魔杖菜单（#extensionsMenu）里「FlowGal 剧场」
//   · 设置卡：扩展面板（#extensions_settings2）里一个可折叠的「FlowGal」
//   · 楼层：AI 楼层正文下面挂场景卡、插画卡；楼层的「…」按钮里加「剧场」「配一张」
import React from 'react'
import { createRoot } from 'react-dom/client'
import { setTransport, openTheater, rememberGame, toast } from '../src/client/api.js'
import { injectStyles, Overlay, SettingsSection, openTurnInTheater, illustrateTurn } from '../src/client/shell.jsx'
import { SceneCardInline, CgCardInline } from '../src/client/chat/ChatCards.jsx'
import { KIND_SCENE, KIND_CG } from '../lib/engine.js'
import { createStHost } from './host.js'
import { stAssetUrl } from './store.js'
import { TURN_FIELD } from './tavern.js'

const ctx = () => globalThis.SillyTavern.getContext()
let host = null
const roots = [] // 自己建的 React 根（关掉扩展时卸载）
const cleanups = []

/** 在一个元素上挂 React（同一个元素只建一次根）。 */
function mount(el, node) {
  if (!el._fgRoot) { el._fgRoot = createRoot(el); roots.push(el._fgRoot) }
  el._fgRoot.render(node)
}

// ───────── 楼层：场景卡、插画卡、按钮 ─────────
let items = [] // 当前这一局的卡片（tavern.list）
let itemsGame = ''
async function refreshItems() {
  const gameId = host.tavern.currentGameId()
  itemsGame = gameId
  items = gameId ? await host.tavern.list({ gameId }).catch(() => []) : []
  renderChat()
}

function renderChat() {
  const gameId = host.tavern.currentGameId()
  if (!gameId || gameId !== itemsGame) return
  const chat = ctx().chat || []
  for (const mes of document.querySelectorAll('#chat .mes[mesid]')) {
    const message = chat[Number(mes.getAttribute('mesid'))]
    const turn = message?.extra?.[TURN_FIELD]
    const block = mes.querySelector('.mes_block')
    if (!block) continue
    let box = block.querySelector(':scope > .fg-st-cards')
    if (!message || message.is_user || message.is_system || !Number.isInteger(turn)) { if (box) box.remove(); continue }
    addButtons(mes)
    const mine = items.filter(i => i.turn === turn && i.current !== false)
      .sort((a, b) => (a.kind === KIND_SCENE ? -1 : 0) - (b.kind === KIND_SCENE ? -1 : 0) || (a.at || 0) - (b.at || 0))
    if (!mine.length) { if (box) box.remove(); continue }
    if (!box) {
      box = document.createElement('div')
      box.className = 'fg-st-cards'
      block.appendChild(box)
    }
    mount(box, (
      <>
        {mine.map(item => (item.kind === KIND_SCENE
          ? <SceneCardInline key={item.id} item={item} gameId={gameId} turn={turn} />
          : item.kind === KIND_CG ? <CgCardInline key={item.id} item={item} gameId={gameId} /> : null))}
      </>
    ))
  }
}

function addButtons(mes) {
  const extra = mes.querySelector('.extraMesButtons')
  if (!extra || extra.querySelector('.fg-st-theater')) return
  for (const [cls, icon, title] of [['fg-st-theater', 'fa-clapperboard', 'FlowGal：在剧场里看这一轮'], ['fg-st-illustrate', 'fa-image', 'FlowGal：给这一轮配一张插画']]) {
    const button = document.createElement('div')
    button.className = `mes_button fa-solid ${icon} ${cls}`
    button.title = title
    extra.prepend(button)
  }
}

function onChatClick(event) {
  const button = event.target.closest('.fg-st-theater, .fg-st-illustrate')
  if (!button) return
  const message = ctx().chat?.[Number(button.closest('.mes')?.getAttribute('mesid'))]
  host.tavern.ensureTurns()
  const turn = message?.extra?.[TURN_FIELD]
  const gameId = host.tavern.currentGameId()
  if (!gameId || !Number.isInteger(turn)) return toast('这一层不是 AI 的回复', 'error')
  if (button.classList.contains('fg-st-theater')) openTurnInTheater({ gameId, turn })
  else illustrateTurn({ gameId, turn })
}

// ───────── 入口、设置卡、剧场 ─────────
function addWandItem() {
  const menu = document.getElementById('extensionsMenu')
  if (!menu || document.getElementById('flowgal_wand')) return
  const item = document.createElement('div')
  item.id = 'flowgal_wand'
  item.className = 'list-group-item flex-container flexGap5'
  item.innerHTML = '<div class="fa-solid fa-film extensionsMenuExtensionButton"></div><span>FlowGal 剧场</span>'
  item.addEventListener('click', () => {
    const gameId = host.tavern.currentGameId()
    if (gameId) rememberGame(gameId)
    openTheater(gameId || '')
  })
  menu.appendChild(item)
  cleanups.push(() => item.remove())
}

function addSettings() {
  const panel = document.getElementById('extensions_settings2')
  if (!panel || document.getElementById('flowgal_settings')) return
  const drawer = document.createElement('div')
  drawer.id = 'flowgal_settings'
  drawer.className = 'inline-drawer'
  drawer.innerHTML = '<div class="inline-drawer-toggle inline-drawer-header"><b>🎬 FlowGal</b><div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div></div><div class="inline-drawer-content"></div>'
  panel.appendChild(drawer)
  mount(drawer.querySelector('.inline-drawer-content'), <SettingsSection />)
  cleanups.push(() => drawer.remove())
}

function addOverlay() {
  const el = document.createElement('div')
  el.id = 'flowgal_root'
  document.body.appendChild(el)
  mount(el, <Overlay />)
  cleanups.push(() => el.remove())
}

function onChatChanged() {
  const gameId = host.tavern.currentGameId()
  if (gameId) { host.tavern.ensureTurns(); rememberGame(gameId) }
  refreshItems()
}

export async function onActivate() {
  if (host) return
  host = createStHost({ getContext: ctx })
  setTransport({
    host: 'st',
    call: (path, body, { method }) => host.api.call(method, path, body),
    upload: async (path, file) => host.api.call('POST', path, new Uint8Array(await file.arrayBuffer())),
    assetUrl: stAssetUrl,
    visionLoader: host.vision ? host.vision.loader : null,
  })
  cleanups.push(injectStyles())
  const { eventSource, eventTypes } = ctx()
  // 楼层重画（换回复、编辑、加载更多、切聊天）后，卡片和按钮要重新挂上
  const rerender = () => requestAnimationFrame(renderChat)
  const events = [
    [eventTypes.CHAT_CHANGED, onChatChanged],
    [eventTypes.CHARACTER_MESSAGE_RENDERED, rerender],
    [eventTypes.MESSAGE_UPDATED, rerender],
    [eventTypes.MESSAGE_SWIPED, () => refreshItems()],
    [eventTypes.MESSAGE_EDITED, () => refreshItems()],
    [eventTypes.MESSAGE_DELETED, rerender],
    [eventTypes.MORE_MESSAGES_LOADED, rerender],
  ]
  for (const [type, fn] of events) { eventSource.on(type, fn); cleanups.push(() => eventSource.removeListener(type, fn)) }
  cleanups.push(host.tavern.onItemsChanged(gameId => { if (gameId === host.tavern.currentGameId()) refreshItems() }))
  // 界面在酒馆准备好以后再挂（APP_READY 已经过了的话会马上叫）
  eventSource.once(eventTypes.APP_READY, () => {
    addOverlay()
    addWandItem()
    addSettings()
    const chat = document.getElementById('chat')
    chat?.addEventListener('click', onChatClick)
    cleanups.push(() => chat?.removeEventListener('click', onChatClick))
    onChatChanged()
  })
}

export async function onDisable() {
  for (const fn of cleanups.splice(0)) { try { fn() } catch {} }
  for (const root of roots.splice(0)) { try { root.unmount() } catch {} }
  document.querySelectorAll('.fg-st-cards, .fg-st-theater, .fg-st-illustrate').forEach(el => el.remove())
  host?.dispose()
  host = null
}
