// 人物志的整理：逆转式立绘工作台（局部重绘做眨眼和口型）、批量删除立绘、新情绪只挂在用过它的角色下。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { inflateSync } from 'node:zlib'
import { mkdtemp, rm, readdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { aaPrompt, cleanRects, defaultRects, rectsBox, stillPack, cleanPack, packFiles, AA_STEPS } from '../lib/aa-sprite.js'
import { pngSize, maskPng, grayPng } from '../lib/image/png.js'
import { inpaintModel } from '../lib/image/novelai.js'
import { noteEmotionUsers, personEmotions } from '../lib/emotions.js'
import { createStore } from '../lib/store.js'
import { createEngine } from '../lib/engine.js'

const dataUrl = bytes => 'data:image/png;base64,' + Buffer.from(bytes).toString('base64')
/** 灰度 PNG 解回像素（只认 grayPng 写的那种：每行一个 0 号滤波字节）。 */
function grayPixels(png) {
  const b = Buffer.from(png)
  const { width, height } = pngSize(b)
  let at = 8, idat = []
  while (at < b.length) {
    const len = b.readUInt32BE(at), type = b.toString('ascii', at + 4, at + 8)
    if (type === 'IDAT') idat.push(b.subarray(at + 8, at + 8 + len))
    at += 12 + len
  }
  const raw = inflateSync(Buffer.concat(idat))
  return (x, y) => raw[y * (width + 1) + 1 + x]
}

test('gate: 眨眼口型的重画提示词：要的 tag 放最前，打架的拿掉（闭眼连眼睛颜色一起拿掉），负面词补上反面', () => {
  const positive = '1girl, long black hair, blue eyes, looking at viewer, light smile, closed mouth, school uniform, masterpiece'
  const closed = aaPrompt(positive, 'lowres', 'eyes', 'closed')
  assert.match(closed.prompt, /^closed eyes, 1girl, long black hair, /)
  assert.doesNotMatch(closed.prompt, /blue eyes|looking at viewer/)
  assert.match(closed.prompt, /light smile/, '嘴上的不动')
  assert.equal(closed.negative, 'lowres, open eyes, eyelashes up')
  const half = aaPrompt(positive, '', 'eyes', 'half')
  assert.match(half.prompt, /^half-closed eyes, .*blue eyes/, '半闭眼留着眼睛颜色')
  const talk = aaPrompt(positive, '', 'mouth', 'open')
  assert.match(talk.prompt, /^open mouth, talking, /)
  assert.doesNotMatch(talk.prompt, /smile|closed mouth/)
  assert.match(talk.prompt, /blue eyes/, '眼睛上的不动')
  assert.throws(() => aaPrompt(positive, '', 'nose', 'open'), /没有这个状态/)
})

test('gate: 框对齐 8 像素、夹在图里、不能太小太大；遮罩只有框里是白的；局部重绘用对应的 inpainting 模型', () => {
  const rects = cleanRects({ eyes: [[321, 215, 393, 281], [430, 210, 500, 270]], mouth: [[395, 313, 431, 327]] }, 832, 1216)
  assert.deepEqual(rects, { eyes: [[320, 216, 392, 280], [432, 208, 504, 272]], mouth: [[392, 312, 432, 328]] })
  assert.deepEqual(rectsBox(rects.eyes), [320, 208, 504, 280])
  assert.deepEqual(cleanRects({ eyes: [[-50, -50, 40, 40]], mouth: [[820, 1200, 900, 1300]] }, 832, 1216), { eyes: [[0, 0, 40, 40]], mouth: [[824, 1200, 832, 1216]] }, '超出图的部分夹回来')
  assert.throws(() => cleanRects({ eyes: [[0, 0, 3, 3]], mouth: [[0, 0, 16, 16]] }, 832, 1216), /眼睛的框太小/)
  assert.throws(() => cleanRects({ eyes: [[0, 0, 64, 64]] }, 832, 1216), /还没框嘴/)
  assert.throws(() => cleanRects({ eyes: [[0, 0, 832, 600]], mouth: [[0, 0, 16, 16]] }, 832, 1216), /框太大了/)
  // 默认框落在立绘上部正中，本身就合规
  const d = defaultRects(832, 1216)
  assert.deepEqual(cleanRects(d, 832, 1216), d)

  const mask = maskPng(64, 32, [[8, 8, 24, 16]])
  assert.deepEqual(pngSize(mask), { width: 64, height: 32 })
  const px = grayPixels(mask)
  assert.deepEqual([px(8, 8), px(23, 15), px(24, 15), px(7, 8), px(8, 16), px(0, 0)], [255, 255, 0, 0, 0, 0])
  assert.equal(pngSize(Buffer.from('not a png at all, nope')), null)

  assert.equal(inpaintModel('nai-diffusion-4-5-full'), 'nai-diffusion-4-5-full-inpainting')
  assert.equal(inpaintModel('nai-diffusion-5-full'), 'nai-diffusion-5-full-inpainting')
  assert.equal(inpaintModel('nai-diffusion-4-curated-preview'), 'nai-diffusion-4-curated-inpainting')

  // 工作台拼出的素材包（只一帧）过得了导入检查
  const patches = {}
  for (const [part, state] of AA_STEPS) patches[part] = { ...(patches[part] || {}), [state]: { file: `${part}_${state}.png`, x: 8, y: 8 } }
  const pack = cleanPack(stillPack({ name: '林岚·开心', width: 832, height: 1216, still: 'still.png', patches }))
  assert.deepEqual(pack.breath, { frames: ['still.png'], lifts: [0], steps: [{ frame: 0, ms: 1000 }] })
  assert.deepEqual(packFiles(pack), ['still.png', 'eyes_half.png', 'eyes_closed.png', 'mouth_half.png', 'mouth_open.png'])
})

/** 一局里建个林岚，上传一张立绘；返回引擎、这张差分的编号、发给 NovelAI 的请求。 */
async function setup(dir, { backend = 'novelai' } = {}) {
  const requests = []
  const fetchImpl = async (url, init) => {
    const body = JSON.parse(init.body)
    requests.push({ url: String(url), body })
    return new Response(grayPng(body.parameters.width, body.parameters.height, () => 77), { status: 200, headers: { 'content-type': 'image/png' } })
  }
  const store = createStore(dir)
  const engine = createEngine({ store, services: {}, fetchImpl, logger: { warn() {}, info() {} } })
  await engine.patchConfig({ images: { backend } })
  await engine.setSecret('novelai', 'official', 'k')
  await engine.castAction('g', 'save', { name: '林岚', patch: { appearance: '1girl, long black hair, blue eyes', gender: 'female' } })
  const still = grayPng(832, 1216, () => 200)
  await engine.castAction('g', 'upload', { name: '林岚', emotion: 'happy', dataUrl: dataUrl(still) })
  await engine.castAction('g', 'upload', { name: '林岚', emotion: 'sad', dataUrl: dataUrl(still) })
  const lin = () => engine.gameView('g').then(v => v.cast.find(p => p.name === '林岚'))
  const sprites = (await lin()).sprites
  const key = Object.keys(sprites).find(k => k.endsWith('|happy'))
  // 当初画这张差分用的提示词和种子（正常出图会记下）
  await store.updateGame('g', g => Object.assign(g.looks['林岚'].sprites[key], { positive: '1girl, long black hair, blue eyes, light smile, masterpiece', negativePrompt: 'lowres', seed: 4242 }))
  return { store, engine, key, keys: Object.keys(sprites), requests, lin, dir }
}

test('gate: 工作台局部重绘：用画这张时的提示词和种子，按框画遮罩、发给 NovelAI 的 inpainting 模型，回整张重画的图', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'flowgal-'))
  try {
    const { engine, key, requests } = await setup(dir)
    const rects = { eyes: [[320, 216, 392, 280], [424, 208, 504, 272]], mouth: [[392, 312, 432, 328]] }
    const image = dataUrl(grayPng(832, 1216, () => 255))
    const res = await engine.aaInpaint('g', { name: '林岚', key, part: 'eyes', state: 'closed', rects, image })
    assert.match(res.image, /^data:image\/png;base64,/)
    assert.equal(res.seed, 4242)
    const { body } = requests.at(-1)
    assert.equal(body.action, 'infill')
    assert.equal(body.model, 'nai-diffusion-4-5-full-inpainting')
    assert.match(body.input, /^closed eyes, 1girl, long black hair, light smile/)
    assert.doesNotMatch(body.input, /blue eyes/)
    assert.equal(body.parameters.negative_prompt, 'lowres, open eyes, eyelashes up')
    assert.equal(body.parameters.seed, 4242)
    assert.equal(body.parameters.extra_noise_seed, 4242)
    assert.deepEqual([body.parameters.width, body.parameters.height], [832, 1216])
    // 遮罩是宿主按眼睛的框画的：框里白，嘴的框和别处黑
    const px = grayPixels(Buffer.from(body.parameters.mask, 'base64'))
    assert.deepEqual([px(320, 216), px(503, 271), px(400, 240), px(400, 320), px(10, 10)], [255, 255, 0, 0, 0])
    assert.equal(body.parameters.image, image.split(',')[1], '原图原样转发')
    // 指定种子（重画单个状态时换个种子）
    await engine.aaInpaint('g', { name: '林岚', key, part: 'mouth', state: 'half', rects, image, seed: 7 })
    assert.equal(requests.at(-1).body.parameters.seed, 7)
    assert.match(requests.at(-1).body.input, /^parted lips, /)

    await assert.rejects(engine.aaInpaint('g', { name: '林岚', key, part: 'eyes', state: 'closed', rects, image: dataUrl(grayPng(830, 1216, () => 255)) }), /64 的倍数/)
    await assert.rejects(engine.aaInpaint('g', { name: '林岚', key, part: 'eyes', state: 'closed', rects: { eyes: rects.eyes }, image }), /还没框嘴/)
    await assert.rejects(engine.aaInpaint('g', { name: '林岚', key: 'nope', part: 'eyes', state: 'closed', rects, image }), /还没有图/)
    engine.dispose()
  } finally {
    await rm(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 })
  }
})

test('gate: 按柏宝绘写法画的差分（有角色块）：眨眼口型改在角色块里，Base 不动，角色块负面也补上反面', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'flowgal-'))
  try {
    const { engine, key, requests, store } = await setup(dir)
    await store.updateGame('g', g => Object.assign(g.looks['林岚'].sprites[key], {
      positive: '<artist>a</artist>, transparent background, cowboy shot, solo, looking at viewer',
      negativePrompt: 'lowres, outdoors',
      characters: ['girl, long black hair, blue eyes, light smile, looking at viewer, cowboy shot'],
      characterNegatives: ['glasses, full body'],
    }))
    const rects = { eyes: [[320, 216, 392, 280]], mouth: [[392, 312, 432, 328]] }
    await engine.aaInpaint('g', { name: '林岚', key, part: 'eyes', state: 'closed', rects, image: dataUrl(grayPng(832, 1216, () => 255)) })
    const q = requests.at(-1).body.parameters
    assert.equal(requests.at(-1).body.input, '<artist>a</artist>, transparent background, cowboy shot, solo, looking at viewer', 'Base 原样')
    assert.equal(q.v4_prompt.caption.char_captions[0].char_caption, 'closed eyes, girl, long black hair, light smile, cowboy shot')
    assert.equal(q.v4_negative_prompt.caption.char_captions[0].char_caption, 'glasses, full body, open eyes, eyelashes up')
    assert.equal(q.negative_prompt, 'lowres, outdoors')
    assert.equal(q.use_coords, true)
    engine.dispose()
  } finally {
    await rm(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 })
  }
})

test('gate: 局部重绘只走 NovelAI，别的渠道说清楚', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'flowgal-'))
  try {
    const { engine, key } = await setup(dir, { backend: 'webui' })
    await assert.rejects(engine.aaInpaint('g', { name: '林岚', key, part: 'eyes', state: 'closed', rects: defaultRects(832, 1216), image: dataUrl(grayPng(832, 1216, () => 255)) }), /要用 NovelAI 的局部重绘/)
    engine.dispose()
  } finally {
    await rm(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 })
  }
})

test('gate: 工作台做好的素材包：静止帧沿用原图（不另存、不改谁画的），记下框；批量取消动态和批量删除都清掉文件', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'flowgal-'))
  try {
    const { engine, key, keys, lin } = await setup(dir)
    const before = (await lin()).sprites[key]
    const assets = async () => (await readdir(join(dir, 'assets'))).length
    assert.equal(await assets(), 2)
    const patches = {}, files = {}
    for (const [part, state] of AA_STEPS) {
      patches[part] = { ...(patches[part] || {}), [state]: { file: `${part}_${state}.png`, x: part === 'eyes' ? 320 : 392, y: part === 'eyes' ? 208 : 312 } }
      files[`${part}_${state}.png`] = dataUrl(grayPng(16, 8, () => 9))
    }
    const rects = { eyes: [[320, 216, 392, 280]], mouth: [[392, 312, 432, 328]] }
    const manifest = stillPack({ name: '林岚·开心', width: 832, height: 1216, still: 'still.png', patches })
    for (const k of keys) await engine.castAction('g', 'aa-pack', { name: '林岚', key: k, keepImage: true, manifest, files, rects })
    let after = (await lin()).sprites[key]
    assert.equal(after.assetId, before.assetId, '图没换')
    assert.equal(after.aa.pack.breath.frames[0], before.assetId)
    assert.equal(after.writer, before.writer)
    assert.equal(after.positive, '1girl, long black hair, blue eyes, light smile, masterpiece', '记录里别的东西都在')
    assert.deepEqual(after.aa.rects, rects)
    assert.equal(await assets(), 2 + 4 * keys.length, '每张只多存 4 个贴片')
    // 缺贴片时报错、不留半截
    const { 'mouth_open.png': _, ...missing } = files
    await assert.rejects(engine.castAction('g', 'aa-pack', { name: '林岚', key, keepImage: true, manifest, files: missing, rects }), /素材包缺文件：mouth_open\.png/)
    assert.equal(await assets(), 2 + 4 * keys.length)

    await engine.castAction('g', 'aa-remove', { name: '林岚', keys })
    const view = await lin()
    assert.ok(keys.every(k => !view.sprites[k].aa && view.sprites[k].assetId), '动态拿掉了，图还在')
    assert.equal(await assets(), 2)

    const res = await engine.castAction('g', 'sprite-delete', { name: '林岚', keys })
    assert.equal(res.deleted, 2)
    after = await lin()
    assert.deepEqual(Object.keys(after.sprites), [])
    assert.equal(await assets(), 0)
    engine.dispose()
  } finally {
    await rm(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 })
  }
})

test('gate: 全局角色批量删除：全局库里的记录一起删，文件留着（别的对局可能复制过）', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'flowgal-'))
  try {
    const { engine, keys, lin } = await setup(dir)
    await engine.castAction('g', 'promote', { name: '林岚' })
    assert.equal((await lin()).global, true)
    await engine.castAction('g', 'sprite-delete', { name: '林岚', keys })
    assert.deepEqual(Object.keys((await lin()).sprites), [])
    assert.equal((await readdir(join(dir, 'assets'))).length, 2)
    engine.dispose()
  } finally {
    await rm(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 })
  }
})

test('gate: 导演新造的情绪只挂在用过它的角色下面；玩家自己加的大家都能用；老存档按这一局的台词挂', () => {
  const lib = { list: [
    { id: '带着烦躁思考', source: 'director' },
    { id: '苦闷地表白', source: 'director' },
    { id: '偷笑', source: 'user' },
    { id: '老情绪', source: 'director' },
  ] }
  noteEmotionUsers(lib, { U1: { sp: '林岚', emo: '带着烦躁思考' }, U2: { sp: '苏晴', emo: '苦闷地表白' }, U3: { sp: '林岚', emo: 'smile' }, U4: { sp: '苏晴', emo: '偷笑' }, U5: { emo: '带着烦躁思考' } })
  noteEmotionUsers(lib, { U1: { sp: '苏晴', emo: '带着烦躁思考' }, U2: { sp: '林岚', emo: '带着烦躁思考' } })
  assert.deepEqual(lib.list.map(e => [e.id, e.who]), [['带着烦躁思考', ['林岚', '苏晴']], ['苦闷地表白', ['苏晴']], ['偷笑', undefined], ['老情绪', undefined]])
  const custom = id => personEmotions('林岚', lib.list, id).filter(e => !e.builtin).map(e => e.id)
  assert.deepEqual(custom(), ['带着烦躁思考', '偷笑'], '苏晴的「苦闷地表白」不挂到林岚下面')
  assert.deepEqual(custom({ used: ['老情绪'] }), ['带着烦躁思考', '偷笑', '老情绪'], '老存档：这一局林岚说话时用过')
  assert.deepEqual(custom({ drawn: ['苦闷地表白'] }), ['带着烦躁思考', '苦闷地表白', '偷笑'], '已经画过的照样列出来')
  assert.ok(personEmotions('林岚', lib.list).some(e => e.builtin && e.id === 'smile'), '内置情绪全列')
})
