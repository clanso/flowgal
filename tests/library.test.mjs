// 图片文件夹（画好的图按名字另存一份）、重新整理时撤下旧插画、剧场画面比例。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm, readdir, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createStore } from '../lib/dsh/store.js'
import { fileName } from '../lib/library.js'
import { createLibrary, libraryItems, gameFolder } from '../lib/library.js'
import { createEngine, KIND_CG } from '../lib/engine.js'
import { stageRatio, buildBeats } from '../src/client/theater/playback.js'
import { resolveConfig } from '../lib/config.js'

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')

async function withDir(fn) {
  const dir = await mkdtemp(join(tmpdir(), 'flowgal-'))
  try { return await fn(dir) } finally { await rm(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 }) }
}

function fakeTavern() {
  const items = new Map()
  const turns = new Map()
  let seq = 0
  return {
    apiVersion: 1,
    items,
    turns,
    async attach({ gameId, turn, textVersion, item }) { const id = 'm' + ++seq; items.set(id, { id, gameId, turn, textVersion, ...item, current: true }); return { id } },
    async update(id, changes) { const item = items.get(id); if (item) Object.assign(item, changes); return item },
    async remove(id) { return items.delete(id) },
    async list({ gameId }) { return [...items.values()].filter(i => i.gameId === gameId) },
    async getTurn({ gameId, turn }) { return turns.get(gameId + ':' + turn) || null },
    async getCardContext() { return null },
    async backgroundModel() { return { provider: 'fake', model: 'fake-1' } },
  }
}

async function settle(engine, gameId, done, ms = 5000) {
  const end = Date.now() + ms
  for (;;) {
    const view = await engine.gameView(gameId)
    if (done(view)) return view
    if (Date.now() > end) throw new Error('等出图超时：' + JSON.stringify(view.images.map(i => [i.title, i.status, i.error])))
    await new Promise(r => setTimeout(r, 20))
  }
}

test('gate: 文件名去掉 Windows 不许用的字符、结尾的点和保留名，空的叫未命名', () => {
  assert.equal(fileName('雨夜/约定: "她"?'), '雨夜 约定 她')
  assert.equal(fileName('  末尾的点...  '), '末尾的点')
  assert.equal(fileName('CON'), 'CON_')
  assert.equal(fileName('<>|'), '未命名')
  assert.equal(fileName('长'.repeat(80)).length, 60)
})

test('gate: 另存一份到图片文件夹：按名字复制，重名加 (2)，同一张图不存第二份；设置里填了绝对路径就存那儿', () => withDir(async dir => {
  const store = createStore(join(dir, 'data'))
  const a = await store.saveAsset(PNG, 'image/png')
  const b = await store.saveAsset(Buffer.concat([PNG, Buffer.from([0])]), 'image/png')
  const first = await store.exportAsset(a, ['学园', '插画', '第 2 轮 天台'])
  assert.equal(first, join(dir, 'data', '图片', '学园', '插画', '第 2 轮 天台.png'))
  assert.deepEqual(await readFile(first), PNG)
  assert.equal(await store.exportAsset(a, ['学园', '插画', '第 2 轮 天台']), first, '同一张图已经在那儿')
  assert.equal(await store.exportAsset(b, ['学园', '插画', '第 2 轮 天台']), join(dir, 'data', '图片', '学园', '插画', '第 2 轮 天台 (2).png'))
  assert.equal(await store.exportAsset('missing.png', ['学园', '插画', 'x']), '')
  const custom = join(dir, '我的图')
  assert.equal(store.libraryRoot(custom), custom)
  assert.equal(store.libraryRoot('相对路径'), join(dir, 'data', '图片'), '相对路径不认，免得存到奇怪的地方')
  assert.equal(await store.exportAsset(a, ['学园', '背景', '天台（黄昏）'], custom), join(custom, '学园', '背景', '天台（黄昏）.png'))
}))

test('gate: 每张图只存一次，玩家在文件夹里删掉的不会再冒出来；关掉另存后只有点「打开图片文件夹」才补', () => withDir(async dir => {
  const store = createStore(dir)
  const asset = await store.saveAsset(PNG, 'image/png')
  const place = await store.saveAsset(Buffer.concat([PNG, Buffer.from([1])]), 'image/png')
  await store.updateGame('g', g => {
    g.scenes = { v1: { turn: 1, textVersion: 'v1', at: 1, card: { name: '学园' } } }
    g.images = { i1: { id: 'i1', turn: 3, title: '萤火与信封', versions: [{ assetId: asset, at: 5 }] } }
    g.places = { 'k': { location: '城市街道', time: 'night', assetId: place } }
  })
  let cfg = { images: { library: true, libraryDir: '' } }
  const opened = []
  const library = createLibrary({ store, config: async () => cfg, open: async path => { opened.push(path); return true } })
  const game = await store.readGame('g')
  assert.equal(gameFolder(game), '学园')
  assert.deepEqual(libraryItems(game).map(i => i.parts), [['背景', '城市街道（夜）'], ['插画', '第 3 轮 萤火与信封']])
  assert.equal(await library.save('g', [{ assetId: asset, parts: ['插画', '第 3 轮 萤火与信封'] }]), 1)
  const file = join(dir, '图片', '学园', '插画', '第 3 轮 萤火与信封.png')
  await rm(file)
  assert.equal(await library.save('g', [{ assetId: asset, parts: ['插画', '第 3 轮 萤火与信封'] }]), 0)
  await assert.rejects(readFile(file), '删掉的不再存回来')
  cfg = { images: { library: false, libraryDir: '' } }
  assert.equal(await library.save('g', [{ assetId: place, parts: ['背景', '城市街道（夜）'] }]), 0, '设置里关了')
  const out = await library.openFor('g')
  assert.deepEqual(out, { path: join(dir, '图片', '学园'), added: 1, opened: true })
  assert.deepEqual(await readdir(join(dir, '图片', '学园', '背景')), ['城市街道（夜）.png'])
  assert.deepEqual(opened, [join(dir, '图片', '学园')])
}))

test('gate: 重新整理后新脚本里没有的插画从聊天里撤下：画好的留在鉴赏和图片文件夹，没画的删掉，玩家加的不动，同一张不排两遍', () => withDir(async dir => {
  const store = createStore(dir)
  const tavern = fakeTavern()
  let plan = [{ after: 'U2', title: '天台的等待', moment: '林岚在天台回过头' }, { after: 'U1', title: '放学', moment: '放学铃响' }]
  const reply = () => JSON.stringify({ scene: { location: '学园天台', time: 'dusk' }, cast: [], lines: [], choices: [], images: plan, people: [] })
  // 插画分镜师按「要画的插画」里的编号各回一份 Base。
  const cgReply = request => JSON.stringify({ images: [...request.messages[0].content[0].text.matchAll(/^- (c\d+)：/gm)].map(m => ({ key: m[1], tag: 'school rooftop, sunset', nl: 'A rooftop.', characters: [] })) })
  const llm = { stream(request) { const text = request.system.includes('你是视觉小说的插画分镜师') ? cgReply(request) : reply(); return (async function* () { yield { type: 'text-delta', text }; yield { type: 'finish', reason: { kind: 'stop' } } })() } }
  let opened = ''
  const engine = createEngine({
    store, services: { tavern, llm, credentials: null, openFolder: async path => { opened = path; return false } },
    fetchImpl: async () => new Response(PNG, { status: 200, headers: { 'content-type': 'image/png' } }), logger: { warn() {}, info() {} },
  })
  try {
    await engine.patchConfig({ images: { maxPerTurn: 2, backgrounds: false, portraits: false, expressions: false } })
    await engine.setSecret('novelai', 'official', 'pst-test-key')
    const turn = { gameId: 'g', turn: 1, textVersion: 'v1', text: '放学铃响了。\n“你终于来了。”林岚回过头。', card: { id: 'c', name: '学园' } }
    tavern.turns.set('g:1', turn)
    await engine.onTurnSettled(turn)
    let view = await settle(engine, 'g', v => v.images.length === 2 && v.images.every(i => i.status === 'ready'))
    const old = view.images.find(i => i.title === '放学')
    const kept = view.images.find(i => i.title === '天台的等待')
    // 玩家「配一张」加的，和一张还没画出来的导演插画。
    const userId = await engine.addImageAt('g', 1, 'U1', { title: '我加的', tags: 'classroom' })
    view = await settle(engine, 'g', v => v.images.find(i => i.id === userId)?.status === 'ready')
    await store.updateGame('g', g => { g.images.pending = { ...g.images[kept.id], id: 'pending', title: '没画完', moment: '还没画', versions: [], current: -1, status: 'queued', mediaId: null } })
    const oldMedia = [...tavern.items.values()].find(i => i.kind === KIND_CG && i.caption === '放学')?.id
    assert.ok(oldMedia, '聊天里挂着「放学」')
    const library = join(dir, '图片', '学园', '插画')
    assert.deepEqual((await readdir(library)).sort(), ['第 1 轮 天台的等待.png', '第 1 轮 我加的.png', '第 1 轮 放学.png'])

    plan = [{ after: 'U2', title: '天台的等待', moment: '林岚在天台回过头' }, { after: 'U2', title: '新的一张', moment: '林岚伸出手' }]
    assert.deepEqual(await engine.replanTurn('g', 1), { queued: 0 })
    view = await settle(engine, 'g', v => v.images.some(i => i.title === '新的一张' && i.status === 'ready'))
    const byTitle = t => view.images.filter(i => i.title === t)
    assert.equal(byTitle('天台的等待').length, 1, '新脚本里还在的不重画、不重复')
    assert.equal(byTitle('新的一张').length, 1)
    assert.equal(byTitle('没画完').length, 0, '没画出来的直接删')
    assert.equal(byTitle('我加的')[0].retired, false, '玩家加的不动')
    const retired = byTitle('放学')[0]
    assert.ok(retired.retired && retired.versions.length, '画好的留在鉴赏里')
    assert.ok(!tavern.items.has(oldMedia), '从聊天里撤下')
    assert.equal([...tavern.items.values()].filter(i => i.kind === KIND_CG).length, 3)
    assert.ok((await readdir(library)).includes('第 1 轮 放学.png'), '文件夹里的文件留着')
    assert.ok(!buildBeats(view).beats.some(b => b.cg?.id === retired.id), '剧场不再演')
    // 再补图也不会把撤下的画回来。
    await engine.fillMissing('g')
    assert.equal((await engine.gameView('g')).images.filter(i => i.title === '放学').length, 1)

    const out = await engine.openLibrary('g')
    assert.equal(out.path, join(dir, '图片', '学园'))
    assert.equal(out.opened, false, '打不开时告诉界面，界面给出路径')
    assert.equal(opened, out.path)
    assert.equal((await engine.publicConfig()).paths.library, join(dir, '图片'))
  } finally {
    engine.dispose()
  }
}))

test('gate: 剧场画面默认跟横版插画一样的比例（NovelAI 1216×832），可选 16:9，尺寸填得离谱时退回 16:9；出图尺寸按 64 取整', () => {
  const sizes = resolveConfig({ images: { sizes: { landscape: [1200, 800], portrait: [99999, 'x'], square: [100, 3000] } } }).images.sizes
  assert.deepEqual(sizes, { landscape: [1216, 832], portrait: [832, 1216], square: [256, 2048] })
  assert.equal(resolveConfig({ ui: { ratio: 'tall' } }).ui.ratio, 'cg')
  assert.equal(stageRatio(undefined), 1216 / 832)
  assert.equal(stageRatio({ ui: { ratio: 'cg' }, images: { sizes: { landscape: [1344, 768] } } }), 1344 / 768)
  assert.equal(stageRatio({ ui: { ratio: 'wide' } }), 16 / 9)
  assert.equal(stageRatio({ images: { sizes: { landscape: [832, 1216] } } }), 16 / 9)
})
