// 提前把要用的图下载、解码好：换场时新背景在盖满 / 清完场的那一刻已经能画出来，不会转场演完了图才突然冒出来。
const cache = new Map() // src → { promise, ready }

/** 开始下载并解码；返回解码好（或失败）时 resolve 的 promise。 */
export function preloadImage(src) {
  if (!src) return Promise.resolve()
  let entry = cache.get(src)
  if (!entry) {
    entry = { ready: false }
    const img = new Image()
    img.decoding = 'async'
    img.src = src
    entry.img = img // 留着引用，浏览器才会把解码好的图留在缓存里
    entry.promise = (img.decode ? img.decode() : new Promise((ok, fail) => { img.onload = ok; img.onerror = fail }))
      .catch(() => {})
      .then(() => { entry.ready = true })
    cache.set(src, entry)
    if (cache.size > 64) cache.delete(cache.keys().next().value)
  }
  return entry.promise
}

export function imageReady(src) { return !src || Boolean(cache.get(src)?.ready) }

/** 等这张图好，最多等 ms 毫秒（下载失败、太慢就不等了，照常往下演）。 */
export function whenImageReady(src, ms) {
  if (imageReady(src)) return Promise.resolve()
  return Promise.race([preloadImage(src), new Promise(ok => setTimeout(ok, ms))])
}
