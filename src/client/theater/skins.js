// 界面皮肤：只换变量、字体和少量装饰（styles/skins.css）。
// 字体包的清单在 lib/fonts.js（皮肤用的和设置里能给对话、名牌挑的是同一份），从 npm CDN 读取，不随插件打包。
import { FONT_PACKS, fontFamilyOf, fontPackOf, fileFamily } from '../../../lib/fonts.js'
import { assetUrl } from '../api.js'

export const SKINS = [
  // textFont / nameFont：皮肤自己的对话、名牌字体叫什么（设置里「跟皮肤」时显示）
  { id: 'stellar', name: '星穹', desc: '深空玻璃 · 霓虹渐变', swatch: 'linear-gradient(120deg, #120c2c, #ff7eb6 55%, #5ee7ff)', fonts: ['sans', 'serif', 'latin'], textFont: '思源黑体', nameFont: '思源宋体' },
  { id: 'sakura', name: '樱色', desc: '浅色毛玻璃 · 文楷', swatch: 'linear-gradient(120deg, #fff4f8, #ffb3cf 55%, #c7b8ff)', fonts: ['wenkai', 'latin'], textFont: '霞鹜文楷', nameFont: '霞鹜文楷' },
  { id: 'ink', name: '水墨', desc: '宣纸 · 朱印 · 毛笔', swatch: 'linear-gradient(120deg, #f3ead6, #3a3530 60%, #b3261e)', fonts: ['wenkai', 'brush', 'latin'], textFont: '霞鹜文楷', nameFont: '马善政毛笔楷书' },
  { id: 'noir', name: '夜金', desc: '黑金 · 电影字幕', swatch: 'linear-gradient(120deg, #070707, #2a2318 50%, #d8b26a)', fonts: ['serif', 'latin'], textFont: '思源宋体', nameFont: '思源宋体' },
  { id: 'cyber', name: '赛博', desc: '扫描线 · 终端', swatch: 'linear-gradient(120deg, #031014, #00f0ff 50%, #ff2bd6)', fonts: ['sans', 'mono'], textFont: 'JetBrains Mono + 思源黑体', nameFont: 'JetBrains Mono + 思源黑体' },
]

const sheets = new Map() // 样式表地址 → 加载完成的 Promise
/**
 * 把皮肤要用的字体样式表挂到 <head>，再加上设置里给对话、名牌选的（ui 的 textFont / nameFont，上传的字体也在这里装上）。
 * base 是 npm CDN 前缀（jsDelivr / unpkg 等目录结构相同），空则只用系统字体。返回都加载完（或失败）的 Promise。
 */
export function loadSkinFonts(skinId, base, ui = null) {
  const skin = SKINS.find(s => s.id === skinId) || SKINS[0]
  const chosen = ui ? [ui.textFont, ui.nameFont] : []
  const uploaded = Promise.all(chosen.filter(c => String(c || '').startsWith('file:')).map(c => loadFontFile(String(c).slice(5))))
  if (!base) return uploaded
  const root = base.replace(/\/?$/, '/')
  const packs = [...new Set([...skin.fonts, ...chosen.map(fontPackOf).filter(Boolean)])]
  const pending = packs.flatMap(key => FONT_PACKS[key].css.map(file => {
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
  return Promise.all([...pending, uploaded])
}

const fontFiles = new Map() // 上传的字体编号 → 装好的 Promise
/** 上传的字体：用 FontFace 从素材地址装上（名字见 lib/fonts.js 的 fileFamily），装不上也不报错（退回皮肤字体）。 */
export function loadFontFile(assetId) {
  if (!assetId || typeof FontFace === 'undefined' || typeof document === 'undefined' || !document.fonts) return Promise.resolve()
  if (!fontFiles.has(assetId)) {
    const face = new FontFace(fileFamily(assetId), `url("${assetUrl(assetId)}")`, { display: 'swap' })
    fontFiles.set(assetId, face.load().then(loaded => { document.fonts.add(loaded) }).catch(() => {}))
  }
  return fontFiles.get(assetId)
}

/**
 * 对话框的设置（字体、字号、高度）→ 剧场根节点上的样式变量（theater.css 的 .fg-dialog、.fg-name、.fg-text 读它们）。
 * 都是默认值时一个变量也不写，皮肤自己的样子原封不动。
 */
export function dialogVars(ui) {
  if (!ui) return {}
  const vars = {}
  const text = fontFamilyOf(ui.textFont)
  const name = fontFamilyOf(ui.nameFont)
  if (text) vars['--fg-text-font'] = `${text}, var(--font-body)`
  if (name) vars['--fg-name-font'] = `${name}, var(--font-display)`
  if (Number.isFinite(ui.textScale) && ui.textScale !== 1) vars['--fg-text-scale'] = String(ui.textScale)
  if (Number.isFinite(ui.nameScale) && ui.nameScale !== 1) vars['--fg-name-scale'] = String(ui.nameScale)
  if (Number.isFinite(ui.dialogHeight)) vars['--fg-dlg-h'] = ui.dialogHeight + '%'
  if (Number.isFinite(ui.dialogHeightPortrait)) vars['--fg-dlg-h-p'] = ui.dialogHeightPortrait + '%'
  return vars
}

/**
 * 提前下载这些字所在的字体分片。分片没到时浏览器先用系统字体画、到了再换（font-display: swap），
 * 翻页时就会看到整句「闪一下」。el 是剧场根节点，从它身上读当前皮肤的正文 / 标题字体。
 * limit > 0 时最多等这么久（网络太慢就先用系统字体显示）。
 */
export function loadGlyphs(el, { body = '', display = '' }, limit = 0) {
  if (!el || typeof document === 'undefined' || !document.fonts) return Promise.resolve()
  const style = getComputedStyle(el)
  // 设置里给对话、名牌换了字体时，变量里是「选的字体, 皮肤的字体」，缺字时补字的皮肤字体也一起下
  const jobs = [['--fg-text-font', '--font-body', body, 400], ['--fg-name-font', '--font-display', display, 700]].map(([own, skin, text, weight]) => {
    const family = style.getPropertyValue(own).trim() || style.getPropertyValue(skin).trim()
    return family && text ? document.fonts.load(`${weight} 16px ${family}`, text).catch(() => {}) : null
  }).filter(Boolean)
  const all = Promise.all(jobs)
  return limit > 0 ? Promise.race([all, new Promise(resolve => setTimeout(resolve, limit))]) : all
}
