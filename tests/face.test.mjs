// 表情差分（只换脸）：动作组整张画一张底图，同组其余情绪在底图上用 NovelAI 局部重绘只重画脸。
// 先测纯函数（PNG 读写、脸框、动作组、表情 tag、提示词换脸、贴回原图），再用假的 NovelAI 把引擎里的整条流程走一遍。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { deflateSync } from 'node:zlib'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { decodePng, encodePng, pngSize } from '../lib/image/png.js'
import { poseOf, anchorOf, poseMembers, cleanPoseMap, isFaceTag, faceTags, faceFor, swapFace, faceBoxFrom, cleanFaceBox, padWhite, blendFace } from '../lib/face.js'
import { EMOTIONS, EMOTION_POSE, EMOTION_FACE, POSES } from '../lib/vocab.js'
import { writeSpritePrompts } from '../lib/sprites.js'
import { resolveConfig } from '../lib/config.js'
import { variantKey, pickSprite } from '../lib/look.js'
import { createStore } from '../lib/dsh/store.js'
import { createEngine } from '../lib/engine.js'
import { fromBase64 } from '../lib/bytes.js'

/** 一张纯色 RGBA 图；alphaAt(x, y) 给透明度。 */
function solid(width, height, [r, g, b], alphaAt = () => 255) {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) data.set([r, g, b, alphaAt(x, y)], (y * width + x) * 4)
  return { width, height, data }
}
const px = (img, x, y) => [...img.data.subarray((y * img.width + x) * 4, (y * img.width + x) * 4 + 4)]

/** 手搓一张别的颜色类型的 PNG（RGB / 调色板），看读得对不对。 */
function rawPng(width, height, color, rows, extra = []) {
  const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0 })
  const crc = buf => { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0 }
  const chunk = (type, data) => { const out = Buffer.alloc(12 + data.length); out.writeUInt32BE(data.length, 0); out.write(type, 4, 'ascii'); data.copy(out, 8); out.writeUInt32BE(crc(out.subarray(4, 8 + data.length)), 8 + data.length); return out }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4); ihdr[8] = 8; ihdr[9] = color
  return new Uint8Array(Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), ...extra.map(([t, d]) => chunk(t, Buffer.from(d))), chunk('IDAT', deflateSync(Buffer.from(rows))), chunk('IEND', Buffer.alloc(0))]))
}

test('gate: PNG 读写：RGBA 写了再读原样回来（每行挑过滤方式）；RGB、调色板带透明也读得对', async () => {
  // 渐变 + 透明边：五种过滤都会被挑到
  const img = { width: 37, height: 23, data: new Uint8ClampedArray(37 * 23 * 4) }
  for (let y = 0; y < 23; y++) for (let x = 0; x < 37; x++) img.data.set([x * 7, y * 11, (x * y) % 256, x < 3 ? 0 : 255 - y], (y * 37 + x) * 4)
  const bytes = await encodePng(img)
  assert.deepEqual(pngSize(bytes), { width: 37, height: 23 })
  const back = await decodePng(bytes)
  assert.deepEqual([back.width, back.height], [37, 23])
  assert.deepEqual([...back.data], [...img.data])
  // RGB，第二行用 Sub 过滤
  const rgb = await decodePng(rawPng(2, 2, 2, [0, 10, 20, 30, 40, 50, 60, 1, 1, 2, 3, 3, 3, 3]))
  assert.deepEqual(px(rgb, 1, 0), [40, 50, 60, 255])
  assert.deepEqual(px(rgb, 0, 1), [1, 2, 3, 255])
  assert.deepEqual(px(rgb, 1, 1), [4, 5, 6, 255], 'Sub：加上左边那个像素')
  // 调色板 + tRNS
  const pal = await decodePng(rawPng(2, 1, 3, [0, 0, 1], [['PLTE', [255, 0, 0, 0, 0, 255]], ['tRNS', [128]]]))
  assert.deepEqual(px(pal, 0, 0), [255, 0, 0, 128])
  assert.deepEqual(px(pal, 1, 0), [0, 0, 255, 255])
  await assert.rejects(decodePng(new Uint8Array([1, 2, 3])), /不是 PNG/)
})

test('gate: 脸框从眼睛和嘴推出来（和服少女那张试出来的框），对齐 8 像素；太小、太大（超过六分之一）不收', () => {
  const rects = { eyes: [[320, 216, 392, 280], [424, 208, 504, 272]], mouth: [[392, 312, 432, 328]] }
  assert.deepEqual(faceBoxFrom(rects, 832, 1216), [304, 184, 520, 352])
  // 只认出一只眼睛、没认出嘴：照眼睛宽度估
  assert.ok(faceBoxFrom({ eyes: [[320, 216, 392, 280]], mouth: [] }, 832, 1216))
  assert.equal(faceBoxFrom({ eyes: [], mouth: [[1, 1, 9, 9]] }, 832, 1216), null)
  assert.deepEqual(cleanFaceBox([10, 10, 101, 99], 832, 1216), [8, 8, 104, 96])
  assert.equal(cleanFaceBox([0, 0, 20, 20], 832, 1216), null, '太小')
  assert.equal(cleanFaceBox([0, 0, 832, 400], 832, 1216), null, '超过整张图的六分之一')
  assert.deepEqual(cleanFaceBox([800, 1200, 900, 1300], 832, 1216), null, '夹进图里后太小')
})

test('gate: 动作组：内置情绪默认分四组，每组底图画代表情绪；设置里改组、新情绪跟着最接近的内置情绪走', () => {
  assert.deepEqual(Object.keys(EMOTION_POSE).sort(), Object.keys(EMOTIONS).sort(), '每个内置情绪都有组')
  assert.deepEqual(Object.keys(EMOTION_FACE).sort(), Object.keys(EMOTIONS).sort(), '每个内置情绪都有只换脸的表情')
  for (const [id, pose] of Object.entries(POSES)) assert.equal(EMOTION_POSE[pose.anchor], id, `${id} 的代表情绪在这组里`)
  assert.equal(poseOf('angry'), 'arms')
  assert.equal(anchorOf('arms'), 'cold')
  assert.deepEqual(poseMembers('chin'), ['confused', 'thinking', 'teasing'])
  const custom = [{ id: '带着烦躁思考', base: 'thinking' }, { id: '怪怪的', base: '' }]
  assert.equal(poseOf('带着烦躁思考', custom), 'chin')
  assert.equal(poseOf('怪怪的', custom), 'daily')
  // 改组：把冷淡挪去日常，抱臂组的底图换成这组剩下的第一个内置情绪
  const moved = cleanPoseMap({ cold: 'daily', thinking: 'arms', bad: 'nowhere', '带着烦躁思考': 'chest' })
  assert.deepEqual(moved, { cold: 'daily', thinking: 'arms', '带着烦躁思考': 'chest' })
  assert.equal(poseOf('cold', [], moved), 'daily')
  assert.equal(anchorOf('arms', [], moved), 'angry')
  assert.equal(poseOf('带着烦躁思考', custom, moved), 'chest', '新情绪自己被改过组')
  assert.equal(poseOf('confused', custom, { thinking: 'arms' }), 'chin', '内置情绪不跟着别人走')
  assert.equal(anchorOf('chin', [], { thinking: 'daily', confused: 'daily', teasing: 'daily' }), '', '一组空了')
})

test('gate: 表情 tag：情绪词、眉眼嘴、脸红、泪、视线算；瞳色、眼型、睫毛、手的动作、构图不算', () => {
  for (const t of ['smile', 'light smile', 'gentle neutral expression', 'expressionless', 'closed eyes', 'half-closed eyes', 'one eye closed', 'wide-eyed', 'open mouth', 'parted lips',
    'clenched teeth', 'v-shaped eyebrows', 'furrowed brow', 'blush', 'full-face blush', 'tears', 'streaming tears', 'looking away', 'looking at viewer', 'sideways glance', 'puffed cheeks',
    'heart-shaped pupils', 'jitome', 'naughty face', 'shy', 'angry', '0.7::frown::', ':d', '>_<', 'sweatdrop', 'bags under eyes', 'cold eyes']) assert.ok(isFaceTag(t), t)
  for (const t of ['lake blue eyes', 'blue eyes', 'tareme', 'long eyelashes', 'soft face', 'pale skin', 'long curly light brown hair', 'hand over mouth', 'hand on own cheek', 'eye-level',
    'facing viewer', 'black haori', 'cowboy shot', 'crossed arms', 'head tilt', 'eyepatch', 'lipstick', 'girl']) assert.ok(!isFaceTag(t), t)
  assert.equal(faceTags('1girl, long black hair, shy, light blush, looking away, hand on own cheek, school uniform'), 'shy, light blush, looking away')
})

test('gate: 换脸的表情：设计师写的里挑脸上的，没有就用内置的；负面里跟这张表情打架的去掉', () => {
  const written = faceFor('angry', '1girl, black hair, angry, glaring, clenched teeth, crossed arms', 'smile, glaring')
  assert.deepEqual(written, { tags: 'angry, glaring, clenched teeth', negative: 'smile', preset: false })
  const preset = faceFor('angry')
  assert.equal(preset.tags, EMOTION_FACE.angry.add)
  assert.equal(preset.preset, true)
  assert.match(preset.negative, /smile/)
  // 新情绪没写：用最接近的内置情绪的
  assert.equal(faceFor('带着烦躁思考', '', '', [{ id: '带着烦躁思考', base: 'thinking' }]).tags, EMOTION_FACE.thinking.add)
  // 自己写了 smile，负面就不能带 smile
  assert.doesNotMatch(faceFor('sad', 'sad, smile, tears').negative, /smile/)
})

test('gate: 底图的提示词换脸：角色块里原来的表情拿掉、新表情放在原来的位置，固定外貌和衣服动作不动；不看镜头时 Base 去掉 looking at viewer', () => {
  const drawn = {
    positive: '<artist>a</artist>, transparent background, cowboy shot, centered, looking at viewer, straight-on',
    negative: 'worst quality',
    characters: ['girl, lake blue eyes, tareme, long curly light brown hair, soft face, pale skin, gentle neutral expression, light smile, black haori, one hand lightly tucking a strand of hair behind ear, cowboy shot, standing'],
    characterNegatives: ['black hair'],
  }
  const angry = swapFace(drawn, faceFor('angry'))
  assert.equal(angry.characters[0], 'girl, lake blue eyes, tareme, long curly light brown hair, soft face, pale skin, angry, v-shaped eyebrows, furrowed brow, glaring, clenched teeth, black haori, one hand lightly tucking a strand of hair behind ear, cowboy shot, standing')
  assert.equal(angry.prompt, drawn.positive, '看镜头的表情 Base 不动')
  assert.match(angry.characterNegatives[0], /^black hair, smile, happy, blush/)
  const shy = swapFace(drawn, faceFor('shy'))
  assert.doesNotMatch(shy.prompt, /looking at viewer/)
  assert.match(shy.characters[0], /looking away/)
  // 老记录没有角色块：改 Base
  const old = swapFace({ positive: '1girl, black hair, smile, school uniform', negative: 'bad' }, faceFor('sad'))
  assert.equal(old.prompt, '1girl, black hair, sad, worried eyebrows, downcast eyes, frown, closed mouth, school uniform')
  assert.equal(old.characters.length, 0)
})

test('gate: 贴回原图：框外一个像素不变，框里换成重画的（框边羽化），透明度沿用原图，半透明处去掉垫的白', () => {
  const src = solid(64, 64, [0, 0, 255], (x, y) => (x < 4 ? 0 : x < 8 ? 128 : 255))
  const flat = padWhite(src)
  assert.deepEqual([flat.width, flat.height], [64, 64])
  assert.deepEqual(px(flat, 0, 0), [255, 255, 255, 255], '透明处垫白')
  assert.deepEqual(px(flat, 5, 0), [127, 127, 255, 255], '半透明处按白底合成')
  // 重画结果：红，补到 128 宽（垫过白、比原图大）
  const gen = solid(128, 128, [255, 0, 0])
  // 半透明那几列的重画结果按白底合成过：贴回时要去掉
  for (let y = 0; y < 64; y++) for (let x = 4; x < 8; x++) gen.data.set([255, 127, 127, 255], (y * 128 + x) * 4)
  const box = [0, 16, 48, 48]
  const out = blendFace(src, gen, box)
  for (const [x, y] of [[20, 10], [20, 50], [60, 30], [47, 15]]) assert.deepEqual(px(out, x, y), px(src, x, y), `框外 (${x},${y}) 不动`)
  assert.deepEqual(px(out, 24, 32), [255, 0, 0, 255], '框中间完全是重画的')
  const edge = px(out, 48 - 2, 32)
  assert.ok(edge[0] > 0 && edge[0] < 255 && edge[2] > 0 && edge[2] < 255, '框边羽化：两边混着')
  assert.equal(px(out, 2, 32)[3], 0, '透明处还是透明')
  const deep = blendFace(src, gen, [0, 16, 48, 48], 1)
  assert.deepEqual(px(deep, 6, 32), [255, 0, 0, 128], '半透明处去掉垫的白，留下重画的颜色，透明度照原图')
  assert.throws(() => blendFace(src, solid(32, 32, [0, 0, 0]), box), /对不上/)
})

test('gate: 立绘设计师：底图说明这一组的姿势和同组情绪，只换脸的只要表情（顺手写的外貌衣服动作去掉）', async () => {
  const calls = []
  const llm = {
    stream(request) {
      calls.push(request)
      const text = JSON.stringify({ sprites: [{ key: 's1', tags: '1girl, black hair, school uniform, crossed arms, expressionless' }, { key: 's2', tags: '1girl, black hair, school uniform, angry, glaring, clenched teeth, crossed arms' }] })
      return (async function* () { yield { type: 'text-delta', text }; yield { type: 'finish', reason: { kind: 'stop' } } })()
    },
  }
  const look = { appearance: '1girl, black hair', outfit: '校服', states: [] }
  const targets = [
    { key: variantKey(look, 'cold'), emotion: 'cold', outfit: '校服', outfitTags: 'school uniform', states: [], pose: { id: 'arms', label: '抱臂', members: ['生气', '赌气', '得意'] } },
    { key: variantKey(look, 'angry'), emotion: 'angry', outfit: '校服', outfitTags: 'school uniform', states: [], face: { from: variantKey(look, 'cold'), pose: 'arms', anchor: 'cold', label: '抱臂' } },
  ]
  const results = await writeSpritePrompts({ llm, provider: 'fake', model: 'fake', config: resolveConfig({}), backend: 'novelai', person: { name: '林岚', gender: 'female', appearance: '1girl, black hair', timeline: {} }, targets })
  const user = calls[0].messages[0].content[0].text
  assert.match(user, /- s1：.*这张是「抱臂」动作组的底图：同组的生气、赌气、得意会在这张上只换脸/)
  assert.match(user, /- s2：只换脸——在「冷淡」那张「抱臂」动作底图上只重画脸.*tags 只写这张脸的表情/)
  assert.match(calls[0].system, /标着「只换脸」的会在同组底图上只重画脸/)
  assert.equal(results.get(targets[0].key).tags, '1girl, black hair, school uniform, crossed arms, expressionless')
  assert.equal(results.get(targets[1].key).tags, 'angry, glaring, clenched teeth')
})

test('gate: 剧场挑图：只换脸的表情还没换好时先用它的动作底图', () => {
  const look = { appearance: 'a', outfit: '校服', states: [] }
  const sprites = { [variantKey(look, 'cold')]: { assetId: 'cold.png' }, [variantKey(look, 'neutral')]: { assetId: 'n.png' }, [variantKey(look, 'angry')]: { face: { from: variantKey(look, 'cold') } } }
  assert.equal(pickSprite(sprites, look, 'angry'), 'cold.png')
  sprites[variantKey(look, 'angry')].assetId = 'angry.png'
  assert.equal(pickSprite(sprites, look, 'angry'), 'angry.png')
})

// ───────────────────────── 引擎：整条流程 ─────────────────────────

const W = 256, H = 384
const EYES = { eyes: [[96, 96, 120, 112], [136, 96, 160, 112]], mouth: [[120, 136, 136, 144]] }
const BOX = [88, 88, 168, 152]

/** 假 NovelAI：正常出图回蓝色（左边 10 列透明）；局部重绘回红色（垫过白，不透明）。记下每次请求。 */
function fakeNai() {
  const requests = []
  const fetchImpl = async (url, init) => {
    const body = JSON.parse(init.body)
    requests.push(body)
    const { width, height } = body.parameters
    const img = body.action === 'infill' ? solid(width, height, [255, 0, 0]) : solid(width, height, [0, 0, 255], x => (x < 10 ? 0 : 255))
    return new Response(await encodePng(img), { status: 200, headers: { 'content-type': 'image/png' } })
  }
  return { requests, fetchImpl }
}

async function settle(engine, gameId, done, what = '') {
  const end = Date.now() + 6000
  for (;;) {
    const view = await engine.gameView(gameId)
    const lin = view.cast.find(p => p.name === '林岚')
    if (lin && done(lin)) return lin
    if (Date.now() > end) throw new Error('等太久：' + what + ' ' + JSON.stringify(lin?.spriteStatus))
    await new Promise(r => setTimeout(r, 20))
  }
}

test('gate: 只换脸整条流程：要「生气」→ 先画抱臂底图「冷淡」→ 等认脸 → 收到脸框换脸（框外和底图一模一样）→ 换种子重画 → 底图重画后跟着重换 → 关掉只换脸就整张画', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'flowgal-face-'))
  try {
    const store = createStore(dir)
    const { requests, fetchImpl } = fakeNai()
    const engine = createEngine({ store, services: {}, fetchImpl, logger: { warn() {}, info() {} } })
    await engine.patchConfig({ images: { auto: false, backgrounds: false, spriteWriter: false, sizes: { portrait: [W, H] } } })
    await engine.setSecret('novelai', 'official', 'k')
    await engine.castAction('g', 'save', { name: '林岚', patch: { appearance: '1girl, long black hair, blue eyes', seed: 7 } })
    const look = { appearance: '1girl, long black hair, blue eyes', outfit: '', states: [] }
    const cold = variantKey(look, 'cold'), angry = variantKey(look, 'angry')

    await engine.castAction('g', 'sprite', { name: '林岚', emotion: 'angry' })
    let lin = await settle(engine, 'g', p => p.sprites[cold]?.assetId && p.spriteStatus[angry]?.status === 'face', '底图画好、生气等认脸')
    assert.equal(requests.length, 1, '只画了底图')
    assert.equal(requests[0].action, 'generate')
    assert.match(requests[0].parameters.v4_prompt.caption.char_captions[0].char_caption, /expressionless, cold eyes/)
    assert.equal(lin.sprites[cold].pose, 'arms')
    assert.deepEqual(lin.sprites[angry].face, { from: cold, pose: 'arms' })
    assert.equal(lin.sprites[angry].tags, EMOTION_FACE.angry.add, '没开设计师：只换脸的拼内置表情')
    assert.equal(pickSprite(lin.sprites, look, 'angry'), lin.sprites[cold].assetId, '换好之前剧场先用底图')

    // 浏览器认出脸：交眼睛和嘴的框，宿主推出脸框，接着换脸
    const set = await engine.castAction('g', 'face-box', { name: '林岚', key: cold, rects: EYES })
    assert.deepEqual([set.box, set.redo], [BOX, 1])
    lin = await settle(engine, 'g', p => p.sprites[angry]?.assetId && !p.spriteStatus[angry], '换好脸')
    const infill = requests[1]
    assert.equal(infill.action, 'infill')
    assert.equal(infill.model, 'nai-diffusion-4-5-full-inpainting')
    assert.equal(infill.parameters.seed, 7, '默认跟底图同一个种子')
    const caption = infill.parameters.v4_prompt.caption.char_captions[0].char_caption
    assert.match(caption, /^long black hair, blue eyes, angry, v-shaped eyebrows/, '没设性别：角色块不加 girl / boy')
    assert.doesNotMatch(caption, /expressionless|cold eyes/)
    const mask = await decodePng(fromBase64(infill.parameters.mask))
    assert.equal(px(mask, 100, 100)[0], 255)
    assert.equal(px(mask, 87, 100)[0], 0)
    assert.equal(px(mask, 100, 152)[0], 0)
    const body = await decodePng((await engine.readAsset(lin.sprites[cold].assetId)).data)
    const face = await decodePng((await engine.readAsset(lin.sprites[angry].assetId)).data)
    for (const [x, y] of [[5, 5], [87, 120], [168, 120], [128, 87], [128, 152], [200, 300]]) assert.deepEqual(px(face, x, y), px(body, x, y), `框外 (${x},${y}) 跟底图一样`)
    assert.deepEqual(px(face, 128, 120), [255, 0, 0, 255], '框里是重画的脸')
    assert.deepEqual(lin.sprites[angry].face, { from: cold, pose: 'arms', body: lin.sprites[cold].assetId, box: BOX })
    assert.match(lin.sprites[angry].characters[0], /angry/, '记下换脸用的提示词（逆转式工作台接着用）')

    // 换个种子重画这张脸
    const redo = await engine.castAction('g', 'face-redo', { name: '林岚', key: angry })
    lin = await settle(engine, 'g', p => requests.length === 3 && !p.spriteStatus[angry], '换种子重画')
    assert.equal(requests[2].parameters.seed, redo.seed)
    assert.equal(lin.sprites[angry].face.seed, redo.seed)

    // 同组再要一个「得意」：底图已经有了，不再整张画，直接换脸
    await engine.castAction('g', 'sprite', { name: '林岚', emotion: 'smug' })
    lin = await settle(engine, 'g', p => p.sprites[variantKey(look, 'smug')]?.assetId && !p.spriteStatus[variantKey(look, 'smug')], '得意')
    assert.equal(requests.length, 4)
    assert.equal(requests[3].action, 'infill')

    // 底图重画：脸框清掉，同组表情标等认脸；浏览器再认一次脸，两张一起重换
    await engine.castAction('g', 'sprite', { name: '林岚', emotion: 'cold', tags: '1girl, crossed arms, expressionless' })
    lin = await settle(engine, 'g', p => requests.length === 5 && p.spriteStatus[angry]?.status === 'face' && p.spriteStatus[variantKey(look, 'smug')]?.status === 'face', '底图重画后等认脸')
    assert.equal(lin.sprites[cold].faceBox, undefined)
    await engine.castAction('g', 'face-box', { name: '林岚', key: cold, rects: EYES })
    lin = await settle(engine, 'g', p => requests.length === 7 && !p.spriteStatus[angry] && !p.spriteStatus[variantKey(look, 'smug')], '跟着重换')
    assert.equal(lin.sprites[angry].face.body, lin.sprites[cold].assetId)

    // 手动框：同组全部重换；框不对报错
    await assert.rejects(engine.castAction('g', 'face-box', { name: '林岚', key: cold, box: [0, 0, W, H], by: 'hand' }), /脸框不对/)
    const hand = await engine.castAction('g', 'face-box', { name: '林岚', key: cold, box: [80, 80, 176, 160], by: 'hand' })
    assert.equal(hand.redo, 2)
    lin = await settle(engine, 'g', p => requests.length === 9 && !p.spriteStatus[angry], '手动框后重换')
    assert.equal(lin.sprites[cold].faceBy, 'hand')

    // 关掉「表情只换脸」：生气整张画，不再是换脸的
    await engine.patchConfig({ images: { faceSwap: false } })
    await engine.castAction('g', 'sprite', { name: '林岚', emotion: 'angry' })
    lin = await settle(engine, 'g', p => requests.length === 10 && !p.spriteStatus[angry], '整张画')
    assert.equal(requests[9].action, 'generate')
    assert.equal(lin.sprites[angry].face, undefined)
    await assert.rejects(engine.castAction('g', 'face-redo', { name: '林岚', key: angry }), /关着/)
    engine.dispose()
  } finally {
    await rm(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 })
  }
})

test('gate: 只换脸：日常组要「微笑」顺带画平静底图；底图是上传的 JPEG 时说清换不了', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'flowgal-face-'))
  try {
    const store = createStore(dir)
    const { requests, fetchImpl } = fakeNai()
    const engine = createEngine({ store, services: {}, fetchImpl, logger: { warn() {}, info() {} } })
    await engine.patchConfig({ images: { auto: false, backgrounds: false, spriteWriter: false, sizes: { portrait: [W, H] } } })
    await engine.setSecret('novelai', 'official', 'k')
    await engine.castAction('g', 'save', { name: '林岚', patch: { appearance: '1girl, long black hair' } })
    const look = { appearance: '1girl, long black hair', outfit: '', states: [] }
    const neutral = variantKey(look, 'neutral'), smile = variantKey(look, 'smile')
    await engine.castAction('g', 'sprite', { name: '林岚', emotion: 'smile' })
    let lin = await settle(engine, 'g', p => p.sprites[neutral]?.assetId && p.spriteStatus[smile]?.status === 'face', '平静底图')
    assert.equal(lin.sprites[neutral].pose, 'daily')
    // 底图换成上传的 JPEG：同组表情标等认脸；再框脸时说清 JPEG 换不了
    const jpeg = 'data:image/jpeg;base64,' + Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 16, 74, 70, 73, 70, 0, 1, 1, 0]).toString('base64')
    await engine.castAction('g', 'upload', { name: '林岚', emotion: 'neutral', dataUrl: jpeg })
    lin = await settle(engine, 'g', p => p.sprites[neutral]?.uploaded, '上传')
    assert.equal(lin.spriteStatus[smile].status, 'face')
    await assert.rejects(engine.castAction('g', 'face-box', { name: '林岚', key: neutral, rects: EYES }), /不是 PNG/)
    assert.equal(requests.filter(r => r.action === 'infill').length, 0)
    engine.dispose()
  } finally {
    await rm(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 })
  }
})

test('gate: 只换脸：底图还在别的请求里忙着时，换脸的等它画完（不报失败、不重画底图）', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'flowgal-face-'))
  try {
    const store = createStore(dir)
    const { requests, fetchImpl } = fakeNai()
    const engine = createEngine({ store, services: {}, fetchImpl, logger: { warn() {}, info() {} } })
    await engine.patchConfig({ images: { auto: false, backgrounds: false, spriteWriter: false, sizes: { portrait: [W, H] } } })
    await engine.setSecret('novelai', 'official', 'k')
    await engine.castAction('g', 'save', { name: '林岚', patch: { appearance: '1girl, long black hair' } })
    const look = { appearance: '1girl, long black hair', outfit: '', states: [] }
    const cold = variantKey(look, 'cold'), angry = variantKey(look, 'angry')
    // 不等第一个：第二个请求进来时冷淡还在写词 / 排队
    await Promise.all([engine.castAction('g', 'sprite', { name: '林岚', emotion: 'cold' }), engine.castAction('g', 'sprite', { name: '林岚', emotion: 'angry' })])
    const lin = await settle(engine, 'g', p => p.sprites[cold]?.assetId && p.spriteStatus[angry]?.status === 'face', '等底图后等认脸')
    assert.equal(requests.filter(r => r.action === 'generate').length, 1, '底图只画一次')
    assert.equal(lin.spriteStatus[angry].status, 'face')
    engine.dispose()
  } finally {
    await rm(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 })
  }
})
