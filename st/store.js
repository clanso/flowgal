// 酒馆宿主：FlowGal 的存档（跟 DSH 的 lib/dsh/store.js 同一组方法，引擎不知道自己在哪个宿主）。
//   JSON 文档 → 酒馆的 user/files/flowgal-*.json（/api/files/upload 写，/user/files/… 读；文件名只许字母数字 _-.）
//   图片素材 → user/images/flowgal/<编号>.png（/api/images/upload）；配乐、音效 → user/files/flowgal-a-<编号>.mp3
//   Key     → 扩展设置 extensionSettings.flowgal_secrets（跟柏宝绘一样存在 settings.json，不进文件夹）
//   「图片文件夹」→ user/images/FlowGal-<卡名>/<分类> <名字>.png（酒馆的图片上传只能建一层子文件夹）
// 读：第一次从酒馆取，之后用内存里的；写：每次改完立刻写回（同一份文档同时只写一次，写的过程中又改了就接着再写一次）。
// 每次读都给一份拷贝（跟 DSH 每次从文件读一样），引擎改了读出来的对象不会悄悄改到存档。
import { toBase64, utf8, randomId, MIME_EXT, sniffImage } from '../lib/bytes.js'
import { fileName, gameAssetIds } from '../lib/library.js'

const IMAGE_FOLDER = 'flowgal'
const EMPTY_GAME = { version: 1, scenes: {}, images: {}, cast: {}, looks: {}, castLog: [], places: {}, style: null }
const ASSET_ID = new RegExp(`^[a-f0-9]{32}\\.(${Object.values(MIME_EXT).join('|')})$`)
const isImageId = id => /\.(png|jpg|webp|gif)$/.test(id)

/** 素材在酒馆里的地址（浏览器直接读，不用经过插件）。 */
export function stAssetUrl(id) {
  const text = String(id || '')
  if (!ASSET_ID.test(text)) return ''
  return isImageId(text) ? `/user/images/${IMAGE_FOLDER}/${text}` : `/user/files/flowgal-a-${text}`
}

/** 局号（酒馆的聊天名，带空格、中文、@）→ 文件名里用的一段：SHA-256 前 32 位。 */
async function gameKey(gameId) {
  const digest = await crypto.subtle.digest('SHA-256', utf8(String(gameId)))
  return [...new Uint8Array(digest).slice(0, 16)].map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * fetchImpl：发请求（测试换假的）；headers()：酒馆的请求头（带 CSRF 令牌，getContext().getRequestHeaders）；
 * settings：扩展设置的根对象（getContext().extensionSettings）；saveSettings：保存设置（saveSettingsDebounced）。
 */
export function createStStore({ fetchImpl = (...a) => fetch(...a), headers = () => ({ 'Content-Type': 'application/json' }), settings = {}, saveSettings = () => {} } = {}) {
  const post = async (url, body) => {
    const res = await fetchImpl(url, { method: 'POST', headers: headers(), body: JSON.stringify(body) })
    if (!res.ok) throw new Error(`酒馆拒绝了 ${url}：HTTP ${res.status}${await res.text().then(t => (t ? ' ' + t.slice(0, 160) : ''), () => '')}`)
    return res
  }
  const get = async url => {
    const res = await fetchImpl(url, { cache: 'no-store' })
    if (res.status === 404) return null
    if (!res.ok) throw new Error(`读不到 ${url}：HTTP ${res.status}`)
    return new Uint8Array(await res.arrayBuffer())
  }
  const exists = async url => {
    const res = await post('/api/files/verify', { urls: [url] }).catch(() => null)
    if (!res) return true // 问不了就直接读（读不到按没有算）
    return Boolean((await res.json().catch(() => ({})))[url])
  }
  const uploadFile = (name, bytes) => post('/api/files/upload', { name, data: toBase64(bytes) })
  const deleteFile = name => post('/api/files/delete', { path: `/user/files/${name}` }).catch(() => {})

  // ───── JSON 文档：内存一份 + 写回 ─────
  const docs = new Map() // 文件名 → { value, writing, again }
  const tails = new Map() // 文件名 → 串行读改写的尾巴
  async function load(name, fallback) {
    let doc = docs.get(name)
    if (!doc) {
      doc = { value: undefined, loading: null, writing: null, again: false }
      docs.set(name, doc)
    }
    if (doc.value === undefined) {
      // 先问酒馆有没有这个文件（没有就不去读，免得控制台一片 404）
      doc.loading = doc.loading || exists(`/user/files/${name}`).then(yes => (yes ? get(`/user/files/${name}`) : null)).then(bytes => {
        if (!bytes || !bytes.length) return structuredClone(fallback)
        try { return JSON.parse(new TextDecoder().decode(bytes)) } catch { return structuredClone(fallback) }
      })
      try { doc.value = await doc.loading } finally { doc.loading = null }
    }
    return doc
  }
  function persist(name, doc) {
    if (doc.writing) { doc.again = true; return doc.writing }
    doc.writing = (async () => {
      try {
        do {
          doc.again = false
          await uploadFile(name, utf8(JSON.stringify(doc.value)))
        } while (doc.again)
      } finally { doc.writing = null }
    })()
    return doc.writing
  }
  const readJson = async (name, fallback) => structuredClone((await load(name, fallback)).value)
  function update(name, fallback, mutate) {
    const prev = tails.get(name) || Promise.resolve()
    const next = prev.then(async () => {
      const doc = await load(name, fallback)
      const value = structuredClone(doc.value)
      const result = await mutate(value)
      doc.value = value
      // 写回不挡调用方（跟 DSH 一样改完就返回），出错只记一下：下次再改会连同这次一起写上去
      persist(name, doc).catch(error => console.warn('[flowgal] 存档写回失败：', name, error?.message || error))
      return result === undefined ? structuredClone(value) : result
    })
    tails.set(name, next.catch(() => {}))
    return next
  }
  const gameFile = async gameId => `flowgal-game-${await gameKey(gameId)}.json`
  const logFile = async gameId => `flowgal-dlog-${await gameKey(gameId)}.json`

  // ───── Key：扩展设置里 ─────
  const SECRETS = 'flowgal_secrets'

  return {
    root: '酒馆 user/files（flowgal-*.json）与 user/images/flowgal',
    secretsLabel: '酒馆的扩展设置（settings.json）',
    readConfig: () => readJson('flowgal-config.json', {}),
    updateConfig: mutate => update('flowgal-config.json', {}, mutate),
    async readSecrets() { return structuredClone(settings[SECRETS] || {}) },
    async updateSecrets(mutate) {
      const value = structuredClone(settings[SECRETS] || {})
      const result = await mutate(value)
      settings[SECRETS] = value
      saveSettings()
      return result === undefined ? value : result
    },
    readGlobalCast: () => readJson('flowgal-global-cast.json', { cast: {} }),
    updateGlobalCast: mutate => update('flowgal-global-cast.json', { cast: {} }, mutate),
    readMusic: () => readJson('flowgal-music.json', { tracks: [] }),
    updateMusic: mutate => update('flowgal-music.json', { tracks: [] }, mutate),
    readEmotions: () => readJson('flowgal-emotions.json', { list: [] }),
    updateEmotions: mutate => update('flowgal-emotions.json', { list: [] }, mutate),
    readGame: async gameId => readJson(await gameFile(gameId), EMPTY_GAME),
    updateGame: async (gameId, mutate) => update(await gameFile(gameId), EMPTY_GAME, mutate),
    readDirectorLog: async gameId => readJson(await logFile(gameId), { entries: [] }),
    updateDirectorLog: async (gameId, mutate) => update(await logFile(gameId), { entries: [] }, mutate),
    /** 酒馆版的局里还有聊天楼层上挂的卡片（tavern.js 用），也是一份 JSON 文档。 */
    readDoc: (name, fallback) => readJson(name, fallback),
    updateDoc: (name, fallback, mutate) => update(name, fallback, mutate),

    async removeGame(gameId) {
      const [game, global] = await Promise.all([this.readGame(gameId), this.readGlobalCast()])
      await Promise.all(gameAssetIds(game, global).map(id => this.removeAsset(id)))
      for (const name of [await gameFile(gameId), await logFile(gameId)]) {
        docs.delete(name)
        await deleteFile(name)
      }
    },

    async saveAsset(bytes, mediaType) {
      const ext = MIME_EXT[mediaType] || 'png'
      const id = randomId(32) + '.' + ext
      if (isImageId(id)) await post('/api/images/upload', { image: toBase64(bytes), format: ext, ch_name: IMAGE_FOLDER, filename: id.replace(/\.[a-z0-9]+$/, '') })
      else await uploadFile(`flowgal-a-${id}`, bytes)
      return id
    },
    async readAsset(id) {
      const url = stAssetUrl(id)
      if (!url) return null
      const data = await get(url).catch(() => null)
      if (!data) return null
      const ext = id.split('.').pop()
      return { data, mediaType: Object.entries(MIME_EXT).find(([, e]) => e === ext)?.[0] || 'application/octet-stream' }
    },
    async removeAsset(id) {
      const url = stAssetUrl(id)
      if (!url) return
      if (isImageId(id)) await post('/api/images/delete', { path: url }).catch(() => {})
      else await deleteFile(`flowgal-a-${id}`)
    },

    // ───── 图片文件夹：浏览器里打不开资源管理器，只把图复制到酒馆的图片目录 ─────
    libraryRoot: () => '酒馆 data/<用户>/user/images/FlowGal-<卡名>/',
    async libraryFolder(dir, folder) { return `酒馆 data/<用户>/user/images/${libraryFolderName(folder)}/` },
    /** 复制一份：parts = [卡名, 分类, …, 名字]；同名的已经有了就加「 (2)」。回存好的地址。 */
    async exportAsset(id, parts) {
      const asset = await this.readAsset(id)
      if (!asset || !sniffImage(asset.data)) return ''
      const folder = libraryFolderName(parts[0])
      const base = parts.slice(1).map(p => fileName(p)).join(' ')
      const ext = id.split('.').pop()
      const res = await post('/api/images/list', { folder }).catch(() => null)
      const taken = new Set(res ? (await res.json().catch(() => [])).map(f => String(f).split('/').pop()) : [])
      for (let n = 1; n <= 50; n++) {
        const name = `${base}${n > 1 ? ` (${n})` : ''}`
        if (taken.has(`${name}.${ext}`)) continue
        const out = await post('/api/images/upload', { image: toBase64(asset.data), format: ext, ch_name: folder, filename: name })
        return (await out.json().catch(() => ({}))).path || `/user/images/${folder}/${name}.${ext}`
      }
      return ''
    },
  }
}

const libraryFolderName = card => fileName('FlowGal-' + (card || '未命名'))
