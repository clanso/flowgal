// 清空单角色立绘：测试时反复从头画。每一身、每种情绪的立绘全删（文件一起）；
// 正在写词、排队、在画的停掉，清空之前要的晚到了也不写回；清完马上能重新画。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm, readdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { variantKey } from '../lib/look.js'
import { encodePng } from '../lib/image/png.js'
import { createStore } from '../lib/dsh/store.js'
import { createEngine } from '../lib/engine.js'
import { roleText } from './roles.mjs'

const W = 256, H = 384
const LOOK = { appearance: '1girl, long black hair, blue eyes', outfit: '', states: [] }
const fakeTavern = () => ({
  apiVersion: 1,
  async attach() { return { id: 'm1' } }, async update() {}, async remove() {}, async list() { return [] },
  async getTurn() { return null },
  async getCardContext() { return { description: '林岚：黑长直，蓝眼睛的学姐。', personality: '', scenario: '', lore: [] } },
  async backgroundModel() { return { provider: 'fake', model: 'fake-1' } },
})

/** 一道闸：open() 之前 wait() 一直挂着。 */
function gate() {
  let open
  const p = new Promise(r => { open = r })
  return { wait: () => p, open: () => open() }
}

/**
 * 假模型：立绘设计师按编号回 tag。hold 给了就等闸开了才回（不理会停止，模拟晚到的结果）。
 */
function fakeLlm(hold = null) {
  const calls = []
  return {
    calls,
    stream(request) {
      calls.push(request)
      const text = roleText(request).includes('立绘设计师') ? JSON.stringify({ sprites: [...request.messages[0].content[0].text.matchAll(/^- (s\d+)：/gm)].map(([, id]) => ({ key: id, tags: `1girl, long black hair, written-${id}` })) })
        : '{}'
      return (async function* () { if (hold) await hold.wait(); yield { type: 'text-delta', text }; yield { type: 'finish', reason: { kind: 'stop' } } })()
    },
  }
}

/** 假 NovelAI：回一张蓝图。hold 给了就等闸开了才回（不理会取消，模拟取消不及、图晚到）。 */
function fakeNai(hold = null) {
  const requests = []
  const fetchImpl = async (url, init) => {
    const body = JSON.parse(init.body)
    requests.push(body)
    if (hold) await hold.wait()
    const { width, height } = body.parameters
    const data = new Uint8ClampedArray(width * height * 4).fill(255)
    return new Response(await encodePng({ width, height, data }), { status: 200, headers: { 'content-type': 'image/png' } })
  }
  return { requests, fetchImpl }
}

async function until(check, what) {
  const end = Date.now() + 6000
  for (;;) {
    const value = await check()
    if (value) return value
    if (Date.now() > end) throw new Error('等太久：' + what)
    await new Promise(r => setTimeout(r, 20))
  }
}

async function setup(dir, { llm = fakeLlm(), nai = fakeNai() } = {}) {
  const store = createStore(dir)
  const engine = createEngine({ store, services: { tavern: fakeTavern(), llm }, fetchImpl: nai.fetchImpl, logger: { warn() {}, info() {} } })
  await engine.patchConfig({ images: { auto: false, backgrounds: false, faceSwap: false, sizes: { portrait: [W, H] } } })
  await engine.setSecret('novelai', 'official', 'k')
  await engine.castAction('g', 'save', { name: '林岚', patch: { appearance: LOOK.appearance, gender: 'female' } })
  await engine.castAction('g', 'save', { name: '苏晴', patch: { appearance: '1girl, short brown hair', gender: 'female' } })
  const person = name => engine.gameView('g').then(v => v.cast.find(p => p.name === name))
  const assets = async () => (await readdir(join(dir, 'assets')).catch(() => [])).length
  return { store, engine, llm, nai, lin: () => person('林岚'), su: () => person('苏晴'), assets }
}

const png = async () => 'data:image/png;base64,' + Buffer.from(await encodePng({ width: 8, height: 8, data: new Uint8ClampedArray(256).fill(200) })).toString('base64')

test('gate: 清空立绘：每一身、每种情绪全删，文件一起清；别人不动；老存档里以前的动作与表情设计原样留着', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'flowgal-clear-'))
  try {
    const { store, engine, lin, su, assets } = await setup(dir)
    for (const emotion of ['neutral', 'happy']) await engine.castAction('g', 'upload', { name: '林岚', emotion, dataUrl: await png() })
    await engine.castAction('g', 'upload', { name: '苏晴', emotion: 'neutral', dataUrl: await png() })
    // 另一身衣服的一张（换装后画的）；老存档里还留着以前的动作与表情设计
    const other = (await store.saveAsset(new Uint8Array([1, 2, 3]), 'image/png'))
    const old = { poses: [{ id: 'x', label: '背手站着', emotions: ['neutral'] }], faces: {} }
    await store.updateGame('g', g => { g.looks['林岚'].sprites['abc|校服|-|smile'] = { emotion: 'smile', outfit: '校服', assetId: other, tags: 'x' }; g.looks['林岚'].acting = old })
    assert.equal(Object.keys((await lin()).sprites).length, 3)
    assert.equal(await assets(), 4)

    const res = await engine.castAction('g', 'sprite-clear', { name: '林岚' })
    assert.equal(res.cleared, 3)
    const after = await lin()
    assert.deepEqual(after.sprites, {})
    assert.deepEqual(after.spriteStatus, {})
    assert.equal(after.acting, undefined, '视图里不再有设计')
    assert.deepEqual((await store.readGame('g')).looks['林岚'].acting, old, '存档里的老数据不动')
    assert.equal(await assets(), 1, '林岚的三张文件都删了，苏晴的留着')
    assert.equal(Object.keys((await su()).sprites).length, 1)

    const again = await engine.castAction('g', 'sprite-clear', { name: '林岚' })
    assert.equal(again.cleared, 0)
    await assert.rejects(engine.castAction('g', 'sprite-clear', { name: '没这人' }), /没有这个人物/)
    engine.dispose()
  } finally {
    await rm(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 })
  }
})

test('gate: 全局角色清空：全局库里的记录一起清（所有对局都少），文件留着', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'flowgal-clear-'))
  try {
    const { store, engine, lin, assets } = await setup(dir)
    await engine.castAction('g', 'upload', { name: '林岚', emotion: 'neutral', dataUrl: await png() })
    await engine.castAction('g', 'promote', { name: '林岚' })
    // 提升之后在这一局又画了一张（存在这一局）
    await engine.castAction('g', 'upload', { name: '林岚', emotion: 'happy', dataUrl: await png() })
    const before = await lin()
    assert.equal(before.global, true)
    assert.equal(Object.keys(before.sprites).length, 2)
    const res = await engine.castAction('g', 'sprite-clear', { name: '林岚' })
    assert.equal(res.cleared, 2)
    const after = await lin()
    assert.deepEqual(after.sprites, {})
    const global = (await store.readGlobalCast()).cast['林岚']
    assert.deepEqual(global.sprites, {})
    assert.equal(await assets(), 2, '全局角色的文件留着（别的对局可能复制过）')
    engine.dispose()
  } finally {
    await rm(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 })
  }
})

test('gate: 正在画的时候清空：停下来，晚到的图不写回、文件删掉，状态不留；清完马上能重新画', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'flowgal-clear-'))
  try {
    const hold = gate()
    const { engine, llm, nai, lin, assets } = await setup(dir, { nai: fakeNai(hold) })
    await engine.castAction('g', 'sprite', { name: '林岚', emotion: 'neutral' })
    await until(() => nai.requests.length === 1, '写词、开始画')
    assert.equal((await lin()).spriteStatus[variantKey(LOOK, 'neutral')].status, 'running')
    assert.equal(llm.calls.length, 1, '直接交给立绘设计师写词，不先设计')

    await engine.castAction('g', 'sprite-clear', { name: '林岚' })
    hold.open() // 图在取消之后才回来
    await new Promise(r => setTimeout(r, 200))
    const after = await lin()
    assert.deepEqual([after.sprites, after.spriteStatus], [{}, {}])
    assert.equal(await assets(), 0, '晚到的图没留下')

    // 清完马上重新画：写词、画
    await engine.castAction('g', 'sprite', { name: '林岚', emotion: 'neutral' })
    const redrawn = await until(async () => { const p = await lin(); return p.sprites[variantKey(LOOK, 'neutral')]?.assetId && p }, '重新画')
    assert.equal(llm.calls.length, 2)
    assert.deepEqual(redrawn.spriteStatus, {})
    assert.equal(await assets(), 1)
    engine.dispose()
  } finally {
    await rm(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 })
  }
})

test('gate: 写词的时候清空：写好的词作废、不出图；排队等写词的也不再写', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'flowgal-clear-'))
  try {
    const hold = gate()
    const { engine, llm, nai, lin, assets } = await setup(dir, { llm: fakeLlm(hold) })
    // 交给立绘设计师写词；第二批排在后面等
    await engine.castAction('g', 'sprite', { name: '林岚', emotion: 'neutral' })
    await until(() => llm.calls.length === 1, '开始写词')
    await engine.castAction('g', 'sprite', { name: '林岚', emotion: 'happy' })
    await until(async () => (await lin()).spriteStatus[variantKey(LOOK, 'happy')]?.status === 'writing', '第二批排队等写词')

    await engine.castAction('g', 'sprite-clear', { name: '林岚' })
    hold.open()
    await new Promise(r => setTimeout(r, 200))
    const after = await lin()
    assert.deepEqual([after.sprites, after.spriteStatus], [{}, {}])
    assert.equal(llm.calls.length, 1, '排队的那批没再写')
    assert.equal(nai.requests.length, 0, '没出图')
    assert.equal(await assets(), 0)

    await engine.castAction('g', 'sprite', { name: '林岚', emotion: 'neutral' })
    await until(async () => (await lin()).sprites[variantKey(LOOK, 'neutral')]?.assetId, '清完重新画')
    assert.equal(nai.requests.length, 1)
    engine.dispose()
  } finally {
    await rm(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 })
  }
})
