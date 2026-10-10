// 两份浏览器包：
// 1) DSH 版 client.js：src/client 打成 DSH 浏览器插件格式；
// 2) 酒馆版 dist/st.js：st/index.jsx（核心 + 引擎 + 界面 + React 一起）打成 ES 模块，manifest.json 指向它。
// DSH 版 client.js 的格式：
// window.__ModuleLoader__.load({ id, factory: require => module.exports })
// react 由宿主提供（require('react')），不打进包里。
import { build } from 'esbuild'
import { writeFile, readFile, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'))

const result = await build({
  entryPoints: [join(root, 'src/client/index.jsx')],
  bundle: true,
  write: false,
  format: 'cjs',
  platform: 'browser',
  target: ['chrome110', 'safari16'],
  external: ['react'],
  jsx: 'transform',
  jsxFactory: 'React.createElement',
  jsxFragment: 'React.Fragment',
  loader: { '.css': 'text', '.jsx': 'jsx' },
  define: { __FLOWGAL_VERSION__: JSON.stringify(pkg.version) },
  minify: process.argv.includes('--minify'),
  legalComments: 'none',
  charset: 'utf8',
})
const code = result.outputFiles[0].text
const wrapped = `/* ${pkg.name} ${pkg.version} 浏览器半边 —— 由 scripts/build-client.mjs 从 src/client 生成，请勿手改。 */
window.__ModuleLoader__.load({
  id: '${pkg.name}',
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    try {
${code}
    } catch (error) {
      try { console.warn('[${pkg.name}] 浏览器半边加载失败，已停用：', error && error.message); } catch (_) {}
      module.exports = { name: '${pkg.name}', inject: [], apply: function () {} };
    }
    return module.exports;
  },
});
`
await writeFile(join(root, 'client.js'), wrapped)
console.log(`client.js ${(wrapped.length / 1024).toFixed(1)} KB`)

// ───── 酒馆版：整个打进一个 ES 模块（酒馆用 <script type=module> 和 import() 载入），React 自己带 ─────
const st = await build({
  entryPoints: [join(root, 'st/index.jsx')],
  bundle: true,
  write: false,
  format: 'esm',
  platform: 'browser',
  target: ['chrome110', 'safari16'],
  jsx: 'transform',
  jsxFactory: 'React.createElement',
  jsxFragment: 'React.Fragment',
  loader: { '.css': 'text', '.jsx': 'jsx' },
  define: { __FLOWGAL_VERSION__: JSON.stringify(pkg.version), 'process.env.NODE_ENV': '"production"' },
  minify: true,
  legalComments: 'none',
  charset: 'utf8',
})
const stCode = `/* ${pkg.name} ${pkg.version} 酒馆版（SillyTavern UI 扩展）—— 由 scripts/build-client.mjs 从 st/、src/client、lib 生成，请勿手改。 */
` + st.outputFiles[0].text
await mkdir(join(root, 'dist'), { recursive: true })
await writeFile(join(root, 'dist/st.js'), stCode)
console.log(`dist/st.js ${(stCode.length / 1024).toFixed(1)} KB`)
