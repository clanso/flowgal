// 插件自己的持久化：只写 $DSH_HOME/flowgal/ 下的文件，不碰 Tavern 数据目录。
//   config.json        插件设置（不含密钥）
//   secrets.json       没有 DSH 凭据服务时的后备密钥存储（0600）
//   global-cast.json   全局角色库（柏宝绘「提升为全局」）
//   music.json         我的配乐：曲名、描述、标签
//   emotions.json      情绪库里新加的情绪（导演自创的、玩家加的）
//   games/<id>.json    每局的场景脚本、角色档案、图片记录
//   assets/<id>.<ext>  生成的图片（CG、背景、立绘）和上传的配乐
import { homedir } from 'node:os'
import { join } from 'node:path'
import { mkdir, readFile, writeFile, rename, rm, chmod, stat } from 'node:fs/promises'
import { randomUUID, createHash } from 'node:crypto'

const dshHome = env => (env.DSH_HOME && env.DSH_HOME.length ? env.DSH_HOME : join(homedir(), '.dsh'))
export function dataRoot(env = process.env) { return join(dshHome(env), 'flowgal') }

const SAFE_ID = /^[A-Za-z0-9._-]{1,128}$/
const MIME_EXT = {
  'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif',
  'audio/mpeg': 'mp3', 'audio/ogg': 'ogg', 'audio/wav': 'wav', 'audio/flac': 'flac', 'audio/mp4': 'm4a', 'audio/aac': 'aac',
}
const ASSET_ID = new RegExp(`^[a-f0-9]{32}\\.(${Object.values(MIME_EXT).join('|')})$`)
export function safeId(id) {
  const text = String(id ?? '')
  if (SAFE_ID.test(text) && text !== '.' && text !== '..') return text
  // gameId 来自 DSH，通常已经安全；万一带了奇怪字符就哈希成文件名。
  return 'h-' + createHash('sha256').update(text).digest('hex').slice(0, 32)
}

async function atomicWrite(file, data, mode) {
  const tmp = file + '.' + randomUUID().slice(0, 8) + '.tmp'
  await writeFile(tmp, data, mode ? { mode } : undefined)
  await renameOver(tmp, file)
  if (mode) { try { await chmod(file, mode) } catch {} }
}

/**
 * 改名覆盖。Windows 上目标文件正被别处打开（前端轮询正在读这一局、杀毒软件在扫）时会报 EPERM / EACCES / EBUSY，
 * 读完就放开了：稍等重试，最多等 2 秒。还不行就删掉临时文件、照常报错。
 */
async function renameOver(tmp, file) {
  const end = Date.now() + 2000
  for (let wait = 5; ; wait = Math.min(wait * 2, 100)) {
    try { return await rename(tmp, file) } catch (error) {
      const busy = process.platform === 'win32' && ['EPERM', 'EACCES', 'EBUSY'].includes(error?.code)
      if (!busy || Date.now() > end) { await rm(tmp, { force: true }).catch(() => {}); throw error }
    }
    await new Promise(r => setTimeout(r, wait))
  }
}

/** 同一文件的读改写串行化，避免并发任务互相覆盖。 */
function createLocks() {
  const tails = new Map()
  return function lock(key, fn) {
    const prev = tails.get(key) || Promise.resolve()
    const next = prev.then(fn, fn)
    const tail = next.catch(() => {})
    tails.set(key, tail)
    tail.then(() => { if (tails.get(key) === tail) tails.delete(key) })
    return next
  }
}

export function createStore(root = dataRoot()) {
  const lock = createLocks()
  const ready = (async () => {
    await mkdir(join(root, 'games'), { recursive: true })
    await mkdir(join(root, 'assets'), { recursive: true })
  })()

  async function readJson(file, fallback) {
    await ready
    try { return JSON.parse(await readFile(file, 'utf8')) } catch { return structuredClone(fallback) }
  }
  async function writeJson(file, value, mode) {
    await ready
    await atomicWrite(file, JSON.stringify(value, null, 1), mode)
  }
  function update(file, fallback, mutate, mode) {
    return lock(file, async () => {
      const value = await readJson(file, fallback)
      const result = await mutate(value)
      await writeJson(file, value, mode)
      return result === undefined ? value : result
    })
  }

  const gameFile = gameId => join(root, 'games', safeId(gameId) + '.json')
  // 导演日志单独一个文件：提示词和原始输出比较大，不拖慢每次读写场景。
  const directorLogFile = gameId => join(root, 'games', safeId(gameId) + '.director.json')
  const EMPTY_GAME = { version: 1, scenes: {}, images: {}, cast: {}, looks: {}, castLog: [], places: {}, style: null }

  return {
    root,
    readConfig: () => readJson(join(root, 'config.json'), {}),
    updateConfig: mutate => update(join(root, 'config.json'), {}, mutate),
    readSecrets: () => readJson(join(root, 'secrets.json'), {}),
    updateSecrets: mutate => update(join(root, 'secrets.json'), {}, mutate, 0o600),
    readGlobalCast: () => readJson(join(root, 'global-cast.json'), { cast: {} }),
    updateGlobalCast: mutate => update(join(root, 'global-cast.json'), { cast: {} }, mutate),
    readMusic: () => readJson(join(root, 'music.json'), { tracks: [] }),
    updateMusic: mutate => update(join(root, 'music.json'), { tracks: [] }, mutate),
    readEmotions: () => readJson(join(root, 'emotions.json'), { list: [] }),
    updateEmotions: mutate => update(join(root, 'emotions.json'), { list: [] }, mutate),
    readGame: gameId => readJson(gameFile(gameId), EMPTY_GAME),
    updateGame: (gameId, mutate) => update(gameFile(gameId), EMPTY_GAME, mutate),
    readDirectorLog: gameId => readJson(directorLogFile(gameId), { entries: [] }),
    updateDirectorLog: (gameId, mutate) => update(directorLogFile(gameId), { entries: [] }, mutate),
    async removeGame(gameId) {
      const game = await readJson(gameFile(gameId), EMPTY_GAME)
      const assets = new Set()
      for (const image of Object.values(game.images || {})) for (const v of image.versions || []) if (v.assetId) assets.add(v.assetId)
      for (const place of Object.values(game.places || {})) if (place.assetId) assets.add(place.assetId)
      for (const look of Object.values(game.looks || {})) for (const r of Object.values(look.sprites || {})) if (r?.assetId) assets.add(r.assetId)
      // 提升为全局的角色和本局共用立绘文件：全局库还在用的不删。
      const global = await readJson(join(root, 'global-cast.json'), { cast: {} })
      for (const person of Object.values(global.cast || {})) for (const r of Object.values(person.sprites || {})) assets.delete(r?.assetId)
      await Promise.all([...assets].map(id => this.removeAsset(id)))
      await rm(gameFile(gameId), { force: true })
      await rm(directorLogFile(gameId), { force: true })
    },
    async saveAsset(bytes, mediaType) {
      await ready
      const ext = MIME_EXT[mediaType] || 'png'
      const id = randomUUID().replace(/-/g, '') + '.' + ext
      await atomicWrite(join(root, 'assets', id), bytes)
      return id
    },
    async readAsset(id) {
      await ready
      if (!ASSET_ID.test(String(id))) return null
      const file = join(root, 'assets', id)
      try {
        const [data, info] = await Promise.all([readFile(file), stat(file)])
        const ext = id.split('.').pop()
        const mediaType = Object.entries(MIME_EXT).find(([, e]) => e === ext)?.[0] || 'application/octet-stream'
        return { data, mediaType, mtime: info.mtimeMs }
      } catch { return null }
    },
    async removeAsset(id) {
      if (!ASSET_ID.test(String(id))) return
      await rm(join(root, 'assets', id), { force: true })
    },
  }
}

/** 检测图片真实格式（不信任上游声明的 content-type）。 */
export function sniffImage(bytes) {
  const b = bytes
  if (!b || b.length < 12) return null
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png'
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg'
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return 'image/webp'
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) return 'image/gif'
  return null
}

/** 检测音频真实格式：mp3（ID3 标签或帧同步）、aac（ADTS）、ogg / opus、wav、flac、m4a。认不出返回 null。 */
export function sniffAudio(bytes) {
  const b = bytes
  if (!b || b.length < 12) return null
  const ascii = (at, text) => [...text].every((ch, i) => b[at + i] === ch.charCodeAt(0))
  if (b[0] === 0xff && (b[1] & 0xf6) === 0xf0) return 'audio/aac'
  if (ascii(0, 'ID3') || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0)) return 'audio/mpeg'
  if (ascii(0, 'OggS')) return 'audio/ogg'
  if (ascii(0, 'RIFF') && ascii(8, 'WAVE')) return 'audio/wav'
  if (ascii(0, 'fLaC')) return 'audio/flac'
  if (ascii(4, 'ftyp') && ['M4A', 'M4B', 'mp4', 'iso', 'dash'].some(brand => ascii(8, brand))) return 'audio/mp4'
  return null
}
