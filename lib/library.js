// 图片文件夹：画好的插画、背景、立绘按人能看懂的名字另存一份，方便在资源管理器里找。
//   <图片文件夹>/<卡名>/插画/第 3 轮 萤火与信封.png（重画的版本依次加 (2)、(3)）
//   <图片文件夹>/<卡名>/背景/城市街道（夜）.png
//   <图片文件夹>/<卡名>/立绘/林岚/校服 · 微笑.png
// 剧场用的还是 assets/ 里的原件；这里是复制出来的，在文件夹里改图、删图都不影响剧场。
// 每张图只存一次（记在存档的 library 里）：玩家在文件夹里删掉的不会再冒出来。
// 打开文件夹（资源管理器）由宿主提供：DSH 能打开本机文件夹，酒馆版在浏览器里打不开（open 返回 false）。
import { variantLabel } from './sprites.js'
import { daypart } from './vocab.js'

const DAYPART_LABEL = { day: '白天', dusk: '黄昏', night: '夜' }

/** 文件、文件夹名：去掉 Windows 不许用的字符和结尾的点、空格，太长截断；空的叫「未命名」。 */
export function fileName(text, max = 60) {
  const name = String(text ?? '').replace(/[\\/:*?"<>|\u0000-\u001f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max).replace(/[. ]+$/, '')
  if (!name) return '未命名'
  return /^(con|prn|aux|nul|com\d|lpt\d)$/i.test(name) ? name + '_' : name
}

/** 这一局的文件夹名：最近一轮正文所属的角色卡。 */
export function gameFolder(game) {
  const scene = Object.values(game?.scenes || {}).filter(s => s.card?.name).sort((a, b) => b.at - a.at)[0]
  return fileName(scene?.card?.name || '未命名')
}

export const cgName = image => ['插画', `第 ${image.turn} 轮 ${image.title || '插画'}`]
export const placeName = place => ['背景', `${place.location || '背景'}（${DAYPART_LABEL[daypart(place.time)]}）`]
export const spriteName = (name, record, custom) => ['立绘', name, variantLabel({ outfit: record.outfit, states: (record.states || []).map(n => ({ name: n })), emotion: record.emotion }, custom)]

/** 一局里所有画好的图（插画的每个版本、背景、不是玩家上传的立绘），按画好的先后。 */
export function libraryItems(game, custom = []) {
  const items = []
  for (const image of Object.values(game.images || {})) for (const v of image.versions || []) items.push({ assetId: v.assetId, at: v.at || image.at || 0, parts: cgName(image) })
  for (const place of Object.values(game.places || {})) if (place.assetId) items.push({ assetId: place.assetId, at: 0, parts: placeName(place) })
  for (const [name, look] of Object.entries(game.looks || {})) {
    for (const record of Object.values(look.sprites || {})) if (record?.assetId && !record.uploaded) items.push({ assetId: record.assetId, at: record.at || 0, parts: spriteName(name, record, custom) })
  }
  return items.sort((a, b) => a.at - b.at)
}

export function createLibrary({ store, config, log = () => {}, open = async () => false }) {
  /** 存进图片文件夹。items: [{ assetId, parts }]，parts 不含卡名那一层。force：设置里关掉了也存（玩家点了「打开图片文件夹」）。 */
  async function save(gameId, items, { force = false } = {}) {
    const cfg = await config()
    if (!cfg.images.library && !force) return 0
    const game = await store.readGame(gameId)
    const done = game.library || {}
    const folder = gameFolder(game)
    const saved = {}
    for (const { assetId, parts } of items) {
      if (!assetId || done[assetId] || saved[assetId]) continue
      try { if (await store.exportAsset(assetId, [folder, ...parts], cfg.images.libraryDir)) saved[assetId] = 1 } catch (error) { log('warn', '存进图片文件夹失败：' + String(error?.message || error)) }
    }
    const count = Object.keys(saved).length
    if (count) await store.updateGame(gameId, g => { g.library = { ...(g.library || {}), ...saved } })
    return count
  }

  /** 打开图片文件夹：先把这一局还没存过的图补进去，再打开这一局的那一层（没有局就打开最外层）。 */
  async function openFor(gameId) {
    const cfg = await config()
    let folder = ''
    let added = 0
    if (gameId) {
      const game = await store.readGame(gameId)
      added = await save(gameId, libraryItems(game, (await store.readEmotions()).list), { force: true })
      folder = gameFolder(game)
    }
    const path = await store.libraryFolder(cfg.images.libraryDir, folder)
    return { path, added, opened: await open(path) }
  }

  return { save, openFor }
}
