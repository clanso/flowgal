// 把 src/client 打成 DSH 浏览器插件格式的 client.js：
// window.__ModuleLoader__.load({ id, factory: require => module.exports })
// react 由宿主提供（require('react')），不打进包里。
import { build } from 'esbuild'
import { writeFile, readFile } from 'node:fs/promises'
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
