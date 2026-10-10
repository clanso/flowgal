// 浏览器 ↔ 宿主的接口，以及一个极小的全局状态（剧场开关、当前对局）。
// 怎么跟宿主说话是可换的「传输」：DSH 默认走 HTTP（/plugins/flowgal/api/*）；酒馆版（st/index.jsx）启动时换成同页直接调用接口表。
import React from 'react'

function originBase() {
  const candidates = []
  try { if (window.top && window.top.location && window.top.location.origin) candidates.push(window.top.location.origin) } catch {}
  try { if (location.origin) candidates.push(location.origin) } catch {}
  const origin = candidates.find(o => o && o !== 'null' && /^https?:/i.test(o))
  return origin || ''
}

const API = originBase() + '/plugins/flowgal/api'

async function httpCall(path, body, { method, signal }) {
  const init = { method, signal, cache: 'no-store', headers: { 'x-flowgal-request': '1' } }
  if (method === 'POST') { init.headers['content-type'] = 'application/json'; init.body = JSON.stringify(body || {}) }
  const res = await fetch(API + path, init)
  let data = null
  try { data = await res.json() } catch {}
  if (!res.ok || !data || data.ok === false) throw new Error((data && data.error) || `HTTP ${res.status}`)
  return data
}

async function httpUpload(path, file) {
  const res = await fetch(API + path, { method: 'POST', cache: 'no-store', headers: { 'x-flowgal-request': '1', 'content-type': file.type || 'application/octet-stream' }, body: file })
  let data = null
  try { data = await res.json() } catch {}
  if (!res.ok || !data || data.ok === false) throw new Error((data && data.error) || `HTTP ${res.status}`)
  return data
}

/**
 * 传输：call(路径, 请求体, { method, signal }) 回 { ok, ...结果 }；upload(路径, 文件) 上传原始字节；
 * assetUrl(素材编号) 是浏览器能直接读的地址；visionFiles 是认脸模型文件的根地址（以 / 结尾）；
 * visionLoader 是另一种给模型文件的办法（酒馆版：从浏览器缓存给 blob 地址和字节，见 st/vision.js），有它就不用 visionFiles。
 */
const transport = {
  call: httpCall,
  upload: httpUpload,
  assetUrl: id => `${API}/asset?id=${encodeURIComponent(id)}`,
  visionFiles: API + '/vision-files/',
  visionLoader: null,
  host: 'dsh',
}
/** 换传输（酒馆版启动时调用一次）。 */
export function setTransport(patch) { Object.assign(transport, patch) }
export const hostName = () => transport.host
export const visionFiles = () => transport.visionFiles
export const visionLoader = () => transport.visionLoader
export const assetUrl = id => (id ? transport.assetUrl(id) : '')

export function call(path, body, { method = body ? 'POST' : 'GET', signal } = {}) {
  return transport.call(path, body, { method, signal })
}
const uploadFile = (path, file) => transport.upload(path, file)

export const api = {
  game: (gameId, since, signal) => call(`/game?gameId=${encodeURIComponent(gameId)}${since ? `&since=${since}` : ''}`, null, { signal }),
  direct: (gameId, turn, force = false) => call('/direct', { gameId, turn, force }),
  replan: (gameId, turn) => call('/replan', { gameId, turn }),
  render: (gameId, imageId, overrides) => call('/image/render', { gameId, imageId, overrides }),
  rewrite: (gameId, imageId, instruction) => call('/image/rewrite', { gameId, imageId, instruction }),
  version: (gameId, imageId, index) => call('/image/version', { gameId, imageId, index }),
  until: (gameId, imageId, until) => call('/image/until', { gameId, imageId, until }),
  openLibrary: gameId => call('/library/open', { gameId }),
  sampleStyle: id => call('/style/sample', { id }),
  deleteImage: (gameId, imageId) => call('/image/delete', { gameId, imageId }),
  addImage: (gameId, turn, after, plan) => call('/image/add', { gameId, turn, after, plan }),
  cancel: (gameId, kind, id) => call('/cancel', { gameId, kind, id }),
  directorLog: (gameId, since, signal) => call(`/director-log?gameId=${encodeURIComponent(gameId)}${since ? `&since=${since}` : ''}`, null, { signal }),
  directorEntry: (gameId, id) => call(`/director-log?gameId=${encodeURIComponent(gameId)}&id=${encodeURIComponent(id)}`),
  place: (gameId, key) => call('/place/render', { gameId, key }),
  cast: (gameId, action, input) => call('/cast', { gameId, action, ...input }),
  /** 逆转式立绘工作台：一次局部重绘，回 { image: 重画后的整张图 data URL, seed }。 */
  aaInpaint: input => call('/aa/inpaint', input),
  fill: (gameId, opts = {}) => call('/fill', { gameId, ...opts }),
  emotion: (action, input) => call('/emotions', { action, ...input }),
  config: () => call('/config'),
  patchConfig: patch => call('/config', { patch }),
  secret: (backend, endpoint, value) => call('/secret', { backend, endpoint, value }),
  test: () => call('/test', {}),
  models: () => call('/models'),
  llm: provider => call(`/llm?provider=${encodeURIComponent(provider || '')}`),
  update: check => call(`/update${check ? `?check=${check}` : ''}`),
  runUpdate: action => call('/update', { action }),
  music: () => call('/music'),
  updateTrack: (id, patch) => call('/music', { action: 'update', id, patch }),
  removeTrack: id => call('/music', { action: 'remove', id }),
  /** 上传一首配乐：请求体直接是文件字节（最大 50 MB），不走 JSON。 */
  async uploadTrack(file) {
    return (await uploadFile(`/music/upload?name=${encodeURIComponent(file.name || '')}`, file)).track
  },
  /** 某一种音效换成自己的文件（最大 5 MB）；返回最新设置。 */
  uploadSound: (slot, file) => uploadFile(`/sound/upload?slot=${encodeURIComponent(slot)}&name=${encodeURIComponent(file.name || '')}`, file),
  removeSound: slot => call('/sound', { action: 'remove', slot }),
}


/** 补图结果的一句话说明。 */
export function fillText(r) {
  const parts = [r.cg && `插画 ${r.cg} 张`, r.bg && `背景 ${r.bg} 张`, r.sprite && `立绘差分 ${r.sprite} 张`].filter(Boolean)
  const tail = r.undirected ? `；还有 ${r.undirected} 轮没整理，先在场景卡上点「重新整理」` : ''
  return (parts.length ? `已排队补画：${parts.join('、')}` : '没有缺的图') + tail
}

// ───────────── 全局状态：剧场是否打开、看哪一局、从哪一轮开始 ─────────────
const state = { open: false, gameId: '', startTurn: null, panel: '', panelArg: null, lastGameId: '', resume: null, toast: null, configVersion: 0 }
const listeners = new Set()
export const ui = {
  get: () => state,
  set(patch) { Object.assign(state, patch); for (const fn of [...listeners]) fn() },
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn) },
}
let snapshot = { ...state }
ui.subscribe(() => { snapshot = { ...state } })
export function useUi() {
  return React.useSyncExternalStore(ui.subscribe, () => snapshot, () => snapshot)
}
export function openTheater(gameId, opts = {}) {
  if (!gameId) gameId = state.lastGameId
  if (!gameId && opts.panel !== 'settings') { toast('先打开一局对话，再进剧场'); return }
  ui.set({ open: true, gameId, startTurn: opts.turn ?? null, panel: opts.panel || '', panelArg: opts.panelArg ?? null, resume: null })
}
/** 聊天里的卡片渲染时记下当前对局；异步通知，避免在别人的 render 里触发更新。 */
export function rememberGame(gameId) {
  if (gameId && state.lastGameId !== gameId) { state.lastGameId = gameId; setTimeout(() => ui.set({}), 0) }
}
let toastTimer = null
export function toast(text, tone = 'info') {
  clearTimeout(toastTimer)
  ui.set({ toast: { text, tone, at: Date.now() } })
  toastTimer = setTimeout(() => ui.set({ toast: null }), 3600)
}

// ───────────── 设置（整个页面共用一份） ─────────────
let configCache = null
let configPromise = null
const configListeners = new Set()
export function loadConfig(force = false) {
  if (configCache && !force) return Promise.resolve(configCache)
  if (!configPromise || force) {
    configPromise = api.config().then(data => { setConfig(data); return data }).finally(() => { configPromise = null })
  }
  return configPromise
}
export function setConfig(data) { configCache = data; for (const fn of [...configListeners]) fn() }
export function useConfig() {
  const [, force] = React.useReducer(x => x + 1, 0)
  React.useEffect(() => { configListeners.add(force); if (!configCache) loadConfig().catch(() => {}); return () => configListeners.delete(force) }, [])
  return configCache
}
export async function patchConfig(patch) {
  const data = await api.patchConfig(patch)
  setConfig(data)
  return data
}

// ───────────── 我的配乐（整个页面共用一份） ─────────────
let musicCache = null
const musicListeners = new Set()
export function setMusic(tracks) { musicCache = tracks; for (const fn of [...musicListeners]) fn() }
export function loadMusic() { return api.music().then(r => { setMusic(r.tracks); return r.tracks }) }
export function useMusic() {
  const [, force] = React.useReducer(x => x + 1, 0)
  React.useEffect(() => { musicListeners.add(force); if (!musicCache) loadMusic().catch(() => {}); return () => musicListeners.delete(force) }, [])
  return musicCache
}

// ───────────── 插件更新状态（整个页面共用一份；自动检查由宿主限频） ─────────────
let updateState = null
const updateListeners = new Set()
export function setUpdate(update) { updateState = update; for (const fn of [...updateListeners]) fn() }
export function loadUpdate(check) { return api.update(check).then(r => { setUpdate(r.update); return r.update }) }
/** 订阅更新状态；autoCheck 为真时（设置里开着自动检查）首次挂载顺便让宿主检查一次远端。 */
export function useUpdate(autoCheck = false) {
  const [, force] = React.useReducer(x => x + 1, 0)
  React.useEffect(() => {
    updateListeners.add(force)
    if (!updateState || autoCheck) loadUpdate(autoCheck ? 'auto' : '').catch(() => {})
    return () => updateListeners.delete(force)
  }, [autoCheck])
  return updateState
}
/** 有新版本可装（且还没装上等重启）。 */
export const updateAvailable = u => Boolean(u && u.managed && u.last && u.last.behind > 0 && !u.restartRequired)

/** 长轮询：fetchOnce(since, signal) 返回 { rev, ... }；修订号变了才更新。active=false 时不连。 */
function useLongPoll(key, active, fetchOnce) {
  const [data, setData] = React.useState(null)
  const [error, setError] = React.useState('')
  React.useEffect(() => {
    if (!key || !active) return undefined
    let stopped = false
    const controller = new AbortController()
    let rev = 0
    let failures = 0
    ;(async () => {
      while (!stopped) {
        try {
          const next = await fetchOnce(rev, controller.signal)
          if (stopped) return
          failures = 0
          setError('')
          if (next.rev !== rev || !rev) { rev = next.rev; setData(next) }
        } catch (e) {
          if (stopped) return
          failures += 1
          setError(String(e && e.message || e))
          await new Promise(r => setTimeout(r, Math.min(15000, 800 * 2 ** failures)))
        }
      }
    })()
    return () => { stopped = true; controller.abort() }
  }, [key, active])
  return { data, error }
}

/** 订阅一局的视图。 */
export function useGameView(gameId, active = true) {
  const { data, error } = useLongPoll(gameId, active, (since, signal) => api.game(gameId, since, signal))
  return { view: data ? data.view : null, error }
}

/** 订阅一局的导演日志（列表 + 正在跑的实时输出）。 */
export function useDirectorLog(gameId, active = true) {
  const { data, error } = useLongPoll(gameId, active, (since, signal) => api.directorLog(gameId, since, signal))
  return { log: data, error }
}
