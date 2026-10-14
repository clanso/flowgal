// 字体：皮肤自带的字体包，和设置里能给对话、名牌挑的字体（设置 → 外观与演出 → 对话框）。
// 网页字体用各字体项目在 npm 上发布的包（按字切片，只下载用到的字），从 CDN 读取，不随插件打包；都是 SIL OFL 授权。
// 选字体存成一个字符串：'' 跟皮肤；pack:<字体包> 网页字体；local:<字体名> 电脑里装的；file:<素材编号> 上传的。
// 选的字缺字时（日文字体没有的简体字这类）用皮肤的字体补上。

/** 字体包：npm 包名@版本 + 要加载的样式表；family 是样式表里的字体名。group 是设置里分在哪一组，latin 是只有西文。 */
export const FONT_PACKS = {
  sans: { pkg: '@fontsource/noto-sans-sc@5.3.0', css: ['400.css'], family: 'Noto Sans SC', name: '思源黑体', group: 'zh' },
  serif: { pkg: '@fontsource/noto-serif-sc@5.3.0', css: ['400.css', '700.css'], family: 'Noto Serif SC', name: '思源宋体', group: 'zh' },
  wenkai: { pkg: 'lxgw-wenkai-webfont@1.7.0', css: ['lxgwwenkai-regular.css'], family: 'LXGW WenKai', name: '霞鹜文楷', group: 'zh' },
  xiaowei: { pkg: '@fontsource/zcool-xiaowei@5.3.0', css: ['400.css'], family: 'ZCOOL XiaoWei', name: '站酷小薇（文艺细宋）', group: 'zh' },
  kuaile: { pkg: '@fontsource/zcool-kuaile@5.3.0', css: ['400.css'], family: 'ZCOOL KuaiLe', name: '站酷快乐体（圆润可爱）', group: 'zh' },
  huangyou: { pkg: '@fontsource/zcool-qingke-huangyou@5.3.0', css: ['400.css'], family: 'ZCOOL QingKe HuangYou', name: '站酷庆科黄油体（方正醒目）', group: 'zh' },
  brush: { pkg: '@fontsource/ma-shan-zheng@5.3.1', css: ['400.css'], family: 'Ma Shan Zheng', name: '马善政毛笔楷书', group: 'zh' },
  longcang: { pkg: '@fontsource/long-cang@5.3.0', css: ['400.css'], family: 'Long Cang', name: '龙藏体（手写行楷）', group: 'zh' },
  zhimang: { pkg: '@fontsource/zhi-mang-xing@5.3.0', css: ['400.css'], family: 'Zhi Mang Xing', name: '志莽行书', group: 'zh' },
  maocao: { pkg: '@fontsource/liu-jian-mao-cao@5.3.0', css: ['400.css'], family: 'Liu Jian Mao Cao', name: '刘建毛草', group: 'zh' },
  wenkaitc: { pkg: '@fontsource/lxgw-wenkai-tc@5.3.1', css: ['400.css', '700.css'], family: 'LXGW WenKai TC', name: '霞鹜文楷 繁体', group: 'tc' },
  seriftc: { pkg: '@fontsource/noto-serif-tc@5.3.1', css: ['400.css', '700.css'], family: 'Noto Serif TC', name: '思源宋体 繁体', group: 'tc' },
  sanstc: { pkg: '@fontsource/noto-sans-tc@5.3.1', css: ['400.css', '700.css'], family: 'Noto Sans TC', name: '思源黑体 繁体', group: 'tc' },
  maru: { pkg: '@fontsource/zen-maru-gothic@5.3.1', css: ['400.css', '700.css'], family: 'Zen Maru Gothic', name: 'Zen 丸ゴシック（圆体）', group: 'jp' },
  rounded: { pkg: '@fontsource/m-plus-rounded-1c@5.3.0', css: ['400.css', '700.css'], family: 'M PLUS Rounded 1c', name: 'M+ Rounded（圆体）', group: 'jp' },
  klee: { pkg: '@fontsource/klee-one@5.3.1', css: ['400.css', '600.css'], family: 'Klee One', name: 'Klee（铅笔手写）', group: 'jp' },
  mincho: { pkg: '@fontsource/zen-old-mincho@5.3.1', css: ['400.css', '700.css'], family: 'Zen Old Mincho', name: 'Zen 旧明朝', group: 'jp' },
  serifjp: { pkg: '@fontsource/noto-serif-jp@5.3.1', css: ['400.css', '700.css'], family: 'Noto Serif JP', name: '思源明朝 日文', group: 'jp' },
  sansjp: { pkg: '@fontsource/noto-sans-jp@5.3.1', css: ['400.css', '700.css'], family: 'Noto Sans JP', name: '思源角黑 日文', group: 'jp' },
  latin: { pkg: '@fontsource/cormorant-garamond@5.3.0', css: ['400.css', '600.css'], family: 'Cormorant Garamond', name: 'Cormorant Garamond', group: 'latin', latin: true },
  mono: { pkg: '@fontsource/jetbrains-mono@5.3.0', css: ['400.css'], family: 'JetBrains Mono', name: 'JetBrains Mono（等宽）', group: 'latin', latin: true },
}

export const FONT_GROUPS = [
  ['zh', '中文网页字体'],
  ['tc', '繁体中文'],
  ['jp', '日文（缺的简体字用皮肤字体补）'],
  ['latin', '西文（中文用皮肤字体）'],
]

/** 电脑里常见的中文字体：装了才有，没装的浏览器用皮肤字体代替。 */
export const LOCAL_FONTS = [
  ['Microsoft YaHei', '微软雅黑'], ['DengXian', '等线'], ['SimSun', '宋体'], ['SimHei', '黑体'], ['KaiTi', '楷体'], ['FangSong', '仿宋'],
  ['STKaiti', '华文楷体'], ['STSong', '华文宋体'], ['STZhongsong', '华文中宋'], ['STXingkai', '华文行楷'], ['YouYuan', '幼圆'], ['LiSu', '隶书'],
  ['PingFang SC', '苹方'], ['Songti SC', '宋体-简（苹果）'], ['Kaiti SC', '楷体-简（苹果）'], ['Hiragino Sans GB', '冬青黑体'],
  ['Yu Mincho', '游明朝'], ['Yu Gothic', '游ゴシック'], ['Meiryo', 'メイリオ'],
]

/** 上传的字体最大多少：中日韩全字库的 otf 也就几十 MB，留足余量。 */
export const MAX_FONT_BYTES = 128 * 1024 * 1024
/** 上传的字体在素材目录里的编号。 */
export const FONT_ASSET_ID = /^[a-f0-9]{32}\.(woff2|woff|ttf|otf)$/
/** 上传的字体在网页里叫什么（同一个文件永远同一个名字）。 */
export const fileFamily = assetId => 'FlowGal ' + String(assetId).slice(0, 12)

/** 检测字体真实格式：woff2、woff、otf（CFF）、ttf。字体集（.ttc）浏览器用不了，单独认出来好提示。 */
export function sniffFont(bytes) {
  const b = bytes
  if (!b || b.length < 12) return null
  const ascii = text => [...text].every((ch, i) => b[i] === ch.charCodeAt(0))
  if (ascii('wOF2')) return 'font/woff2'
  if (ascii('wOFF')) return 'font/woff'
  if (ascii('OTTO')) return 'font/otf'
  if ((b[0] === 0 && b[1] === 1 && b[2] === 0 && b[3] === 0) || ascii('true')) return 'font/ttf'
  if (ascii('ttcf')) return 'collection'
  return null
}

/** 电脑里的字体名：去掉引号、分号、括号这些会弄坏样式的字符。 */
export const cleanFontName = name => String(name || '').replace(/["'\\;{}<>()\u0000-\u001f]/g, '').replace(/\s+/g, ' ').trim().slice(0, 100)

/** 上传的字体清单：编号像样、不重复；name 是显示的名字（文件名）。 */
export function cleanCustomFonts(list) {
  const seen = new Set()
  const out = []
  for (const f of Array.isArray(list) ? list : []) {
    const assetId = String(f?.assetId || '')
    if (!FONT_ASSET_ID.test(assetId) || seen.has(assetId)) continue
    seen.add(assetId)
    out.push({ assetId, name: String(f.name || '').replace(/[\u0000-\u001f]/g, '').trim().slice(0, 80) || '我的字体' })
  }
  return out
}

/** 选的字体：认得的才留，别的回到跟皮肤（''）。上传的字体删掉了也回到跟皮肤。 */
export function cleanFontChoice(value, customFonts = []) {
  const text = String(value || '')
  const at = text.indexOf(':')
  if (at < 0) return ''
  const kind = text.slice(0, at)
  const rest = text.slice(at + 1)
  if (kind === 'pack') return Object.hasOwn(FONT_PACKS, rest) ? text : ''
  if (kind === 'local') { const name = cleanFontName(rest); return name ? 'local:' + name : '' }
  if (kind === 'file') return customFonts.some(f => f.assetId === rest) ? text : ''
  return ''
}

/** 选的字体在样式里写成什么（不含后面补字的皮肤字体）；跟皮肤时是 ''。 */
export function fontFamilyOf(choice) {
  const text = String(choice || '')
  const at = text.indexOf(':')
  if (at < 0) return ''
  const kind = text.slice(0, at)
  const rest = text.slice(at + 1)
  if (kind === 'pack') return FONT_PACKS[rest] ? `"${FONT_PACKS[rest].family}"` : ''
  if (kind === 'local') { const name = cleanFontName(rest); return name ? `"${name}"` : '' }
  if (kind === 'file') return FONT_ASSET_ID.test(rest) ? `"${fileFamily(rest)}"` : ''
  return ''
}

/** 选的字体用到哪个字体包（要加载它的样式表）；不是网页字体时是 ''。 */
export const fontPackOf = choice => (String(choice || '').startsWith('pack:') && FONT_PACKS[String(choice).slice(5)] ? String(choice).slice(5) : '')

/** 对话框的尺寸设置能调的范围：字号是倍数，高度是占画面高的百分比。 */
export const DIALOG_LIMITS = {
  textScale: { min: 0.3, max: 4, step: 0.05, fallback: 1 },
  nameScale: { min: 0.3, max: 4, step: 0.05, fallback: 1 },
  dialogHeight: { min: 5, max: 100, step: 1 },
}
/** 皮肤自己的对话框高度（占画面高的百分比；竖屏另算），设置里「跟皮肤」时显示。 */
export const SKIN_DIALOG_HEIGHT = { landscape: { default: 27, noir: 31 }, portrait: { default: 22, noir: 31 } }
export const skinDialogHeight = (skin, orientation = 'landscape') => SKIN_DIALOG_HEIGHT[orientation][skin] ?? SKIN_DIALOG_HEIGHT[orientation].default
