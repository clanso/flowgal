// 画风：画师串 + 正面词 + 负面词 + CFG + CFG Rescale 整套存、切换、编辑、复制、试画；旧版设置自动搬过来；鉴赏里单张换画风。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { resolveConfig } from '../lib/config.js'
import { normalizeStyle, composePrompt, applyGuidance, BUILTIN_STYLES, DEFAULT_SAMPLE, SAMPLE_SEED, DEFAULT_QUALITY, DEFAULT_NEGATIVE } from '../lib/image/style.js'
import { createStore } from '../lib/store.js'
import { createEngine } from '../lib/engine.js'

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')
const MINE = { id: 'mine', name: '我的厚涂', artist: 'artist:foo, 1.2::artist:bar::', positive: 'masterpiece, best quality', negative: 'lowres, bad hands', cfg: 6.5, cfgRescale: 0.2 }

test('gate: 旧版的画师串和按模型改过的质量词、负面词搬成一套套画风，选中的那套还是选中', () => {
  const style = resolveConfig({
    novelai: { model: 'nai-diffusion-4-5-full' },
    style: { artist: 'a1', artists: [{ id: 'a1', name: '我的', text: 'artist:foo' }], quality: { 'nai-diffusion-4-5-full': 'masterpiece', sd: 'x' }, negative: { 'nai-diffusion-3': 'old' } },
  }).style
  assert.equal(style.current, 'a1')
  assert.deepEqual(style.presets.map(p => p.id), [...BUILTIN_STYLES.map(p => p.id), 'a1'])
  const mine = style.presets.find(p => p.id === 'a1')
  assert.deepEqual(mine, { id: 'a1', name: '我的', artist: 'artist:foo', positive: 'masterpiece', negative: null, cfg: null, cfgRescale: null, cover: '' })
  assert.ok(style.presets.every(p => p.positive === 'masterpiece'), '当时这个模型改过的质量词每套都带上')
  assert.equal(style.sample, DEFAULT_SAMPLE)
  // 关掉过质量词的：每套的正面词都是空的。
  assert.ok(resolveConfig({ style: { useQuality: false } }).style.presets.every(p => p.positive === ''))
  // 没存过的：内置几套，用 Galgame 赛璐璐。
  assert.equal(resolveConfig({}).style.current, 'galgame')
})

test('gate: 画风校验：坏 id、重复的丢掉，名字和数值收拾好，空着的 CFG 跟随渠道，一套都没有时换回内置', () => {
  const style = normalizeStyle({
    current: 'gone',
    presets: [
      { id: 'a', name: '  一套\n画风  ', artist: ' artist:x ', positive: '', negative: null, cfg: '', cfgRescale: 3 },
      { id: 'a', name: '重复' },
      { id: 'bad id!', name: '坏的' },
      { id: 'b', name: '', cfg: 99, cfgRescale: -1, cover: '../x' },
      null,
    ],
    sample: '   ',
  })
  assert.deepEqual(style.presets, [
    { id: 'a', name: '一套 画风', artist: 'artist:x', positive: '', negative: null, cfg: null, cfgRescale: 1, cover: '' },
    { id: 'b', name: '未命名画风', artist: '', positive: null, negative: null, cfg: 30, cfgRescale: 0, cover: '' },
  ])
  assert.equal(style.current, 'a', '选中的那套没了就用第一套')
  assert.equal(style.sample, DEFAULT_SAMPLE)
  assert.deepEqual(normalizeStyle({ presets: [] }).presets.map(p => p.id), BUILTIN_STYLES.map(p => p.id))
})

test('gate: 出图按当前画风整套拼：画师串在前、正面词在后、负面词换成这套的；没填的跟着模型默认；CFG 盖过渠道设置', () => {
  const config = resolveConfig({ style: { current: 'mine', presets: [MINE, { id: 'plain', name: '默认', artist: '' }] } })
  const p = composePrompt({ kind: 'cg', tags: '1girl, rooftop', backend: 'novelai', config })
  assert.equal(p.positive, '1girl, artist:foo, 1.2::artist:bar::, rooftop, masterpiece, best quality')
  assert.equal(p.negative, 'lowres, bad hands')
  const sd = composePrompt({ kind: 'cg', tags: '1girl, rooftop', backend: 'webui', config })
  assert.match(sd.positive, /artist:foo, \(artist:bar:1\.2\), rooftop/)
  // 一组 tag 一起加权也认。
  assert.match(composePrompt({ kind: 'cg', tags: '0.8::rain, night::, street', backend: 'webui', config }).positive, /\(rain, night:0\.8\), street/)
  // 没填正面词、负面词的那套：跟着当前模型用默认的（换模型就换）。
  const plain = { ...config, style: { ...config.style, current: 'plain' } }
  assert.ok(composePrompt({ kind: 'cg', tags: 'x', backend: 'novelai', config: plain }).positive.endsWith(DEFAULT_QUALITY['nai-diffusion-4-5-full']))
  const v3 = { ...plain, novelai: { ...plain.novelai, model: 'nai-diffusion-3' } }
  assert.equal(composePrompt({ kind: 'cg', tags: 'x', backend: 'novelai', config: v3 }).negative, DEFAULT_NEGATIVE['nai-diffusion-3'])
  // CFG：NovelAI 是 scale + cfgRescale；SD 系是 cfg；没填就用渠道自己的。
  assert.deepEqual(applyGuidance('novelai', { scale: 5, cfgRescale: 0, steps: 23 }, config.style), { scale: 6.5, cfgRescale: 0.2, steps: 23 })
  assert.deepEqual(applyGuidance('webui', { cfg: 7 }, config.style), { cfg: 6.5 })
  assert.deepEqual(applyGuidance('openai', { model: 'x' }, config.style), { model: 'x' })
  assert.deepEqual(applyGuidance('novelai', { scale: 5, cfgRescale: 0.1 }, plain.style), { scale: 5, cfgRescale: 0.1 })
})

function setup(dir) {
  const store = createStore(dir)
  const requests = []
  const fetchImpl = async (url, init) => {
    requests.push(JSON.parse(init.body))
    return new Response(PNG, { status: 200, headers: { 'content-type': 'image/png' } })
  }
  const tavern = { apiVersion: 1, async list() { return [] }, async getTurn() { return null }, async getCardContext() { return null }, async backgroundModel() { return { provider: 'fake', model: 'fake' } } }
  const engine = createEngine({ store, services: { tavern, llm: null, credentials: null }, fetchImpl, logger: { warn() {}, info() {} } })
  return { store, engine, requests }
}
const exists = path => stat(path).then(() => true, () => false)

test('gate: 改名、复制、删除整套存；样图只由试画改，浏览器传来的不算；试画用固定内容、固定种子和这套的 CFG，换下来的样图删掉', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'flowgal-'))
  const { engine, requests } = setup(dir)
  try {
    await engine.setSecret('novelai', 'official', 'pst-test-key')
    let data = await engine.patchConfig({ style: { presets: [...BUILTIN_STYLES, MINE], current: 'mine' } })
    assert.equal(data.config.style.current, 'mine')
    assert.deepEqual(data.presets.styles.map(p => p.id), BUILTIN_STYLES.map(p => p.id), '界面「加回内置画风」用')

    const first = await engine.sampleStyle('mine')
    const body = requests.at(-1)
    assert.equal(body.parameters.seed, SAMPLE_SEED)
    assert.equal(body.parameters.scale, 6.5)
    assert.equal(body.parameters.cfg_rescale, 0.2)
    assert.equal(body.parameters.negative_prompt, 'lowres, bad hands')
    assert.ok(body.input.startsWith('1girl, solo, artist:foo, 1.2::artist:bar::, long hair'), body.input)
    assert.deepEqual([body.parameters.width, body.parameters.height], [832, 1216], '竖版')
    data = await engine.publicConfig()
    assert.equal(data.config.style.presets.find(p => p.id === 'mine').cover, first.assetId)

    // 浏览器改名、复制一份（带着旧的或乱写的 cover）：样图按 id 留在原来那套上，副本没有样图。
    const mine = data.config.style.presets.find(p => p.id === 'mine')
    data = await engine.patchConfig({ style: { presets: [...data.config.style.presets.map(p => (p.id === 'mine' ? { ...p, name: '改了名', cover: 'evil.png' } : p)), { ...mine, id: 'copy', name: '改了名 副本' }], current: 'copy' } })
    const byId = id => data.config.style.presets.find(p => p.id === id)
    assert.equal(byId('mine').name, '改了名')
    assert.equal(byId('mine').cover, first.assetId)
    assert.equal(byId('copy').cover, '')
    assert.equal(byId('copy').artist, MINE.artist)
    assert.equal(data.config.style.current, 'copy')

    // 重新试画：新样图替换旧的，旧文件删掉。
    const second = await engine.sampleStyle('mine')
    assert.notEqual(second.assetId, first.assetId)
    assert.equal(await exists(join(dir, 'assets', first.assetId)), false)
    // 删掉这套：它的样图也删掉。
    data = await engine.publicConfig()
    await engine.patchConfig({ style: { presets: data.config.style.presets.filter(p => p.id !== 'mine') } })
    assert.equal(await exists(join(dir, 'assets', second.assetId)), false)
    await assert.rejects(engine.sampleStyle('mine'), /没有这套画风/)
  } finally {
    engine.dispose()
    await rm(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 })
  }
})

test('gate: 鉴赏里单张换一套画风重画：这张记住用哪套，版本里写着画风名；改回空就跟着当前画风', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'flowgal-'))
  const { store, engine, requests } = setup(dir)
  try {
    await engine.setSecret('novelai', 'official', 'pst-test-key')
    await engine.patchConfig({ style: { presets: [...BUILTIN_STYLES, MINE], current: 'galgame' } })
    await store.updateGame('g', g => {
      g.images = { i1: { id: 'i1', kind: 'cg', turn: 1, textVersion: 'v1', mediaId: null, after: 'U1', title: '天台', tags: '1girl, rooftop', desc: '', characters: [], shape: 'landscape', versions: [], current: -1, status: 'ready', at: 1 } }
    })
    await engine.renderCg('g', 'i1', { style: 'mine' })
    let image = (await store.readGame('g')).images.i1
    assert.equal(image.style, 'mine')
    assert.equal(image.versions[0].style, '我的厚涂')
    assert.ok(requests.at(-1).input.includes('artist:foo'))
    assert.equal(requests.at(-1).parameters.scale, 6.5)
    // 再点「重画」不带画风：还用记住的那套。
    await engine.renderCg('g', 'i1')
    assert.ok(requests.at(-1).input.includes('artist:foo'))
    // 不认识的画风不改；空字符串改回跟着当前画风。
    await engine.renderCg('g', 'i1', { style: 'nope' })
    assert.equal((await store.readGame('g')).images.i1.style, 'mine')
    await engine.renderCg('g', 'i1', { style: '' })
    image = (await store.readGame('g')).images.i1
    assert.equal(image.style, '')
    assert.equal(image.versions.at(-1).style, 'Galgame 赛璐璐')
    assert.ok(requests.at(-1).input.includes('official art'))
    assert.equal((await engine.gameView('g')).images[0].versions.at(-1).style, 'Galgame 赛璐璐')
  } finally {
    engine.dispose()
    await rm(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 })
  }
})
