// 一套核心两个宿主：lib/ 里除了 DSH 宿主层（lib/dsh/、入口 lib/index.js）都是两个宿主共用的核心，
// 酒馆版会把它们打包进浏览器，所以不许用 Node 专用的东西（node: 模块、Buffer、process、require）；酒馆宿主层（st/）同理。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import { join, relative, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
async function walk(dir) {
  const out = []
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...await walk(path))
    else if (/\.jsx?$/.test(entry.name)) out.push(path)
  }
  return out
}
const rel = file => relative(root, file).split('\\').join('/')
const NODE_ONLY = [
  [/from ['"]node:/, 'node: 模块'],
  [/\bBuffer\./, 'Buffer'],
  [/\bprocess\./, 'process'],
  [/\brequire\(/, 'require'],
]

test('gate: 核心（lib/ 除了 DSH 宿主层）和酒馆宿主层（st/）不用 Node 专用的东西，浏览器界面也不碰 DSH 宿主层', async () => {
  const core = (await walk(join(root, 'lib'))).filter(f => !rel(f).startsWith('lib/dsh/') && rel(f) !== 'lib/index.js')
  assert.ok(core.length > 30, '核心文件应该有几十个')
  // 酒馆宿主层整个跑在浏览器里，也一样
  core.push(...await walk(join(root, 'st')))
  const bad = []
  for (const file of core) {
    const text = await readFile(file, 'utf8')
    for (const [re, what] of NODE_ONLY) if (re.test(text)) bad.push(`${rel(file)} 用了 ${what}`)
  }
  for (const file of await walk(join(root, 'src'))) {
    if (/lib\/dsh\//.test(await readFile(file, 'utf8'))) bad.push(`${rel(file)} 引用了 DSH 宿主层`)
  }
  assert.deepEqual(bad, [])
})
