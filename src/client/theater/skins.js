// 界面皮肤：只换变量、字体和少量装饰（styles/skins.css）。
// 字体用各字体项目在 npm 上发布的网页字体包（按字切片，只下载用到的字），从 CDN 读取，不随插件打包。
/** 字体包：npm 包名@版本 + 要加载的样式表。所有字体都是 SIL OFL 授权。 */
const FONT_PACKS = {
  sans: { pkg: '@fontsource/noto-sans-sc@5.3.0', css: ['400.css'] },               // 思源黑体（Noto Sans SC）
  serif: { pkg: '@fontsource/noto-serif-sc@5.3.0', css: ['400.css', '700.css'] },   // 思源宋体（Noto Serif SC）
  wenkai: { pkg: 'lxgw-wenkai-webfont@1.7.0', css: ['lxgwwenkai-regular.css'] },    // 霞鹜文楷
  brush: { pkg: '@fontsource/ma-shan-zheng@5.3.1', css: ['400.css'] },             // 马善政毛笔楷书
  mono: { pkg: '@fontsource/jetbrains-mono@5.3.0', css: ['400.css'] },
  latin: { pkg: '@fontsource/cormorant-garamond@5.3.0', css: ['400.css', '600.css'] },
}

export const SKINS = [
  { id: 'stellar', name: '星穹', desc: '深空玻璃 · 霓虹渐变', swatch: 'linear-gradient(120deg, #120c2c, #ff7eb6 55%, #5ee7ff)', fonts: ['sans', 'serif', 'latin'] },
  { id: 'sakura', name: '樱色', desc: '浅色毛玻璃 · 文楷', swatch: 'linear-gradient(120deg, #fff4f8, #ffb3cf 55%, #c7b8ff)', fonts: ['wenkai', 'latin'] },
  { id: 'ink', name: '水墨', desc: '宣纸 · 朱印 · 毛笔', swatch: 'linear-gradient(120deg, #f3ead6, #3a3530 60%, #b3261e)', fonts: ['wenkai', 'brush', 'latin'] },
  { id: 'noir', name: '夜金', desc: '黑金 · 电影字幕', swatch: 'linear-gradient(120deg, #070707, #2a2318 50%, #d8b26a)', fonts: ['serif', 'latin'] },
  { id: 'cyber', name: '赛博', desc: '扫描线 · 终端', swatch: 'linear-gradient(120deg, #031014, #00f0ff 50%, #ff2bd6)', fonts: ['sans', 'mono'] },
]

const sheets = new Map() // 样式表地址 → 加载完成的 Promise
/** 把皮肤要用的字体样式表挂到 <head>。base 是 npm CDN 前缀（jsDelivr / unpkg 等目录结构相同），空则只用系统字体。返回都加载完（或失败）的 Promise。 */
export function loadSkinFonts(skinId, base) {
  const skin = SKINS.find(s => s.id === skinId) || SKINS[0]
  if (!base) return Promise.resolve()
  const root = base.replace(/\/?$/, '/')
  const pending = skin.fonts.flatMap(key => FONT_PACKS[key].css.map(file => {
    const href = `${root}${FONT_PACKS[key].pkg}/${file}`
    if (!sheets.has(href)) {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = href
      link.dataset.flowgal = 'font'
      sheets.set(href, new Promise(resolve => { link.onload = resolve; link.onerror = resolve }))
      document.head.appendChild(link)
    }
    return sheets.get(href)
  }))
  return Promise.all(pending)
}

/**
 * 提前下载这些字所在的字体分片。分片没到时浏览器先用系统字体画、到了再换（font-display: swap），
 * 翻页时就会看到整句「闪一下」。el 是剧场根节点，从它身上读当前皮肤的正文 / 标题字体。
 * limit > 0 时最多等这么久（网络太慢就先用系统字体显示）。
 */
export function loadGlyphs(el, { body = '', display = '' }, limit = 0) {
  if (!el || typeof document === 'undefined' || !document.fonts) return Promise.resolve()
  const style = getComputedStyle(el)
  const jobs = [['--font-body', body], ['--font-display', display]].map(([name, text]) => {
    const family = style.getPropertyValue(name).trim()
    return family && text ? document.fonts.load(`${name === '--font-display' ? 700 : 400} 16px ${family}`, text).catch(() => {}) : null
  }).filter(Boolean)
  const all = Promise.all(jobs)
  return limit > 0 ? Promise.race([all, new Promise(resolve => setTimeout(resolve, limit))]) : all
}
