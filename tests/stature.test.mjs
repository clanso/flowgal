// 立绘在剧场里的大小和高低：按脸框把大家的头缩放到一样大，按身高抬高或压低；身高从档案来，没写按性别外貌估。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { guessHeight, heightOf, cleanHeight, placeSprite, usualFace, faceHeight, genderOf, faceCrop, FACE_RATIO, FACE_SPREAD } from '../lib/stature.js'
import { poseTags } from '../lib/poses.js'
import { composePrompt } from '../lib/image/style.js'
import { resolveConfig } from '../lib/config.js'
import { encodePng } from '../lib/image/png.js'
import { createStore } from '../lib/dsh/store.js'
import { createEngine } from '../lib/engine.js'

const H = [832, 1216]
const faceAt = (ratio, center) => [300, (center - ratio / 2) * H[1], 520, (center + ratio / 2) * H[1]]

test('gate: 身高：档案写的优先，没写按性别和外貌 tag 估（矮人、孩子、矮小、高挑）', () => {
  assert.equal(guessHeight({ gender: 'female', appearance: '1girl, long hair' }), 160)
  assert.equal(guessHeight({ gender: 'male', appearance: '1boy, short hair' }), 172, 'short hair 不算矮')
  assert.equal(guessHeight({ appearance: '1girl, orange hair, dwarf, short, stocky' }), 125)
  assert.equal(guessHeight({ appearance: 'girl, long pale blonde hair, petite, teen' }), 146)
  assert.equal(guessHeight({ gender: 'male', appearance: '1boy, tall, 1.1::very tall::' }), 188, '权重写法也认')
  assert.equal(guessHeight({ appearance: 'little girl, twintails' }), 128)
  assert.equal(genderOf({ appearance: '1boy, white hair' }), 'male', '档案没写性别按 1boy / 1girl 猜')
  assert.equal(genderOf({ appearance: 'silver hair' }), 'other')
  assert.deepEqual(heightOf({ gender: 'female', appearance: '1girl', acting: { height: 150 } }), { cm: 160, from: 'guess' }, '老存档里设计师估的不再读')
  assert.deepEqual(heightOf({ gender: 'female', appearance: '1girl', height: 171 }), { cm: 171, from: 'user' })
  assert.deepEqual(heightOf({ gender: 'male', appearance: '1boy', height: 'abc' }), { cm: 172, from: 'guess' })
  assert.equal(cleanHeight('158.6'), 159)
  assert.equal(cleanHeight(9999), null)
  assert.equal(cleanHeight(''), null)
})

test('gate: 头一样大：脸框占图比例不同的立绘缩放后脸一样高；高的人脸在上面，矮的在下面', () => {
  const near = placeSprite({ box: faceAt(0.17, 0.3), size: H, cm: 160 })
  const far = placeSprite({ box: faceAt(0.11, 0.22), size: H, cm: 160 })
  assert.ok(Math.abs(near.k * 0.17 - far.k * 0.11) < 0.002, '缩放后脸框高度一样')
  assert.ok(Math.abs(near.k * 0.17 - FACE_RATIO) < 0.002)
  const faceMid = (p, ratio, center) => p.lift + (1 - center) * p.k // 脸的中心离框底多高
  assert.ok(Math.abs(faceMid(near, 0.17, 0.3) - faceMid(far, 0.11, 0.22)) < 0.002, '同样的身高，脸的中心一样高')
  const tall = placeSprite({ box: faceAt(0.13, 0.24), size: H, cm: 182 })
  const short = placeSprite({ box: faceAt(0.13, 0.24), size: H, cm: 125 })
  assert.ok(faceMid(tall, 0.13, 0.24) > faceMid(near, 0.17, 0.3) + 0.05, '高个子的脸更高')
  assert.ok(faceMid(short, 0.13, 0.24) < faceMid(near, 0.17, 0.3) - 0.1, '矮人的脸更低')
  assert.ok(tall.head < short.head, '漫画符号跟着头走')
  // 认不出脸：不缩放，只按身高抬
  const unknown = placeSprite({ cm: 172 })
  assert.equal(unknown.k, 1)
  assert.ok(unknown.lift > 0)
  assert.deepEqual(placeSprite({ cm: 160 }), { k: 1, lift: -0.03, head: 0.125 }, '参照身高、参照构图：比参照立绘低一点，给高个子留出头顶')
  // 画得太离谱的不硬掰
  assert.equal(placeSprite({ box: faceAt(0.4, 0.4), size: H, cm: 160 }).k, 0.6)
})

test('gate: 高个子明显高出一截：186 的骑士和 162 的药师站在一起，脸差出大半个头；再高、再矮的往回收，不出画、不沉到对话框里', () => {
  // 格伦（186，抱臂那张）和柯萝伊（162，攥着坠子那张）：以前 186 被顶到 176 那么高，两人的脸只差 0.088 框高，几乎一样高
  const faceMid = (box, cm) => { const p = placeSprite({ box, size: H, cm }); return p.lift + (1 - (box[1] + box[3]) / 2 / H[1]) * p.k }
  const glenn = faceMid([336, 184, 488, 344], 186), chloe = faceMid([320, 248, 536, 416], 162)
  assert.ok(glenn - chloe > 0.17, '差出大半个头（头一样大时一个脸框约 0.13 框高）')
  assert.ok(faceHeight(186) > faceHeight(182) && faceHeight(195) > faceHeight(186), '高个子之间也分得出高矮')
  assert.ok(faceHeight(186) - faceHeight(172) > 0.08, '186 比普通男性（172）也高一截')
  assert.ok(faceHeight(230) <= 0.98, '巨人头顶不出画')
  assert.ok(faceHeight(108) >= 0.42 && faceHeight(128) > faceHeight(108), '孩子、矮人不沉到对话框里，也分得出高矮')
  for (let cm = 60; cm < 260; cm++) assert.ok(faceHeight(cm + 1) >= faceHeight(cm), '越高脸越高')
})

test('gate: 同一个人换动作：侧身、低头那张脸框认小了，按他平常的脸框算，不会突然大一圈；正常的远近不一照常缩放', () => {
  // 柯萝伊（832×1216）整张画的立绘：双手交握身前（几套衣服各一张）、攥着胸前坠子、挺直攥拳、侧身捂着衣领（侧着脸，只框到半张脸）
  const clasp = [352, 184, 528, 328], pendant = [320, 248, 536, 416], fist = [344, 184, 512, 320], aside = [480, 232, 616, 328]
  const usual = usualFace([[352, 176, 520, 320], [336, 224, 528, 368], [352, 176, 528, 328], clasp, aside, pendant, [352, 184, 528, 328], fist], H[1])
  assert.ok(Math.abs(usual - 144 / H[1]) < 1e-9, '取中位数')
  const at = box => placeSprite({ box, size: H, cm: 162, usual })
  const raw = box => placeSprite({ box, size: H, cm: 162 })
  assert.equal(raw(aside).k, 1.4, '以前：按认小了的框放大到顶，比平常那张大三成')
  assert.ok(at(aside).k / at(clasp).k <= FACE_SPREAD + 0.01, '现在：最多比平常大 FACE_SPREAD 倍')
  assert.deepEqual(at(clasp), raw(clasp), '平常的不动')
  assert.deepEqual(at(fist), raw(fist))
  assert.ok(Math.abs(at(pendant).k - raw(pendant).k) < 0.02, '贴得近一点（脸框大一成多）的差不多照常缩小')
  assert.equal(usualFace([clasp], H[1]), 0, '只有一张看不出谁偏了')
  assert.equal(usualFace([], H[1]), 0)
  assert.deepEqual(placeSprite({ box: aside, size: H, cm: 162, usual: 0 }), raw(aside), '没有参照就照旧')
})

test('gate: 演出型立绘可以前倾、弯腰（设计师决定，插件不拦）', () => {
  assert.equal(poseTags('clenched fist on own chest, leaning forward slightly, shoulders squared, cowboy shot'), 'clenched fist on own chest, leaning forward slightly, shoulders squared', '构图还是归插件管')
  assert.equal(poseTags('bent over, hands on knees, bending forward'), 'bent over, hands on knees, bending forward')
  const cfg = resolveConfig({ images: { backend: 'novelai' } })
  const p = composePrompt({ kind: 'sprite', tags: 'girl, smile, leaning forward, hands behind back', person: { appearance: '1girl', gender: 'female' }, emotion: 'smile', backend: 'novelai', config: cfg })
  assert.match(p.characters[0], /leaning forward, hands behind back/, '设计师写了前倾就照画')
  assert.equal(p.characterNegatives[0], '', '负面不自己加')
})

test('gate: 档案里的身高：本局、全局都能写，清空回到估的；提升为全局、复制回本局时带着', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'flowgal-stature-'))
  try {
    const store = createStore(dir)
    const engine = createEngine({ store, services: {}, logger: { warn() {}, info() {} } })
    await engine.castAction('g', 'save', { name: '布琳希尔德', patch: { appearance: '1girl, dwarf', gender: 'female', height: '131' } })
    const person = async () => (await engine.gameView('g')).cast.find(p => p.name === '布琳希尔德')
    assert.equal((await person()).height, 131)
    await engine.castAction('g', 'save', { name: '布琳希尔德', patch: { height: 'x' } })
    assert.equal((await person()).height, null, '写错了就当没写')
    await engine.castAction('g', 'save', { name: '布琳希尔德', patch: { height: 129 } })
    await engine.castAction('g', 'promote', { name: '布琳希尔德' })
    assert.equal((await store.readGlobalCast()).cast['布琳希尔德'].height, 129)
    await engine.castAction('g', 'global-save', { name: '布琳希尔德', patch: { height: 133 } })
    assert.equal((await person()).height, 133)
    await engine.castAction('g', 'global-save', { name: '布琳希尔德', patch: { height: null } })
    assert.equal((await person()).height, null)
    await engine.castAction('g', 'global-save', { name: '布琳希尔德', patch: { height: 127 } })
    await engine.castAction('g', 'copy-local', { name: '布琳希尔德' })
    assert.equal((await store.readGame('g')).cast['布琳希尔德'].height, 127)
    engine.dispose?.()
  } finally { await rm(dir, { recursive: true, force: true }) }
})

test('gate: 剧场量脸框（measure）：整张画的立绘记下脸框；换脸的表情不跟着重换', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'flowgal-stature-'))
  try {
    const store = createStore(dir)
    const engine = createEngine({ store, services: {}, logger: { warn() {}, info() {} } })
    await engine.castAction('g', 'save', { name: '马科斯', patch: { appearance: '1boy, old man', gender: 'male' } })
    const png = await encodePng({ width: 832, height: 1216, data: new Uint8ClampedArray(832 * 1216 * 4).fill(200) })
    const body = await store.saveAsset(png, 'image/png')
    const smile = await store.saveAsset(png, 'image/png')
    await store.updateGame('g', g => {
      g.looks = { 马科斯: { outfits: {}, wear: [], states: [], sprites: {
        'a||neutral': { emotion: 'neutral', assetId: body, tags: '1boy', pose: 'p1' },
        'a||smile': { emotion: 'smile', assetId: smile, tags: 'smile', face: { from: 'a||neutral', pose: 'p1', body: 'old-body', box: [300, 200, 500, 400] } },
      }, spriteStatus: {} } }
    })
    const rects = { eyes: [[340, 300, 390, 330], [440, 300, 490, 330]], mouth: [[395, 380, 435, 395]] }
    const r = await engine.castAction('g', 'face-box', { name: '马科斯', key: 'a||neutral', rects, measure: true })
    assert.equal(r.redo, 0, '换脸的表情底图对不上也不重换（只是量一下）')
    const g = await store.readGame('g')
    assert.ok(g.looks['马科斯'].sprites['a||neutral'].faceBox, '记下了脸框')
    assert.equal(g.looks['马科斯'].sprites['a||smile'].face.body, 'old-body')
    engine.dispose?.()
  } finally { await rm(dir, { recursive: true, force: true }) }
})

test('gate: 短闪回的小头像从立绘里裁脸：认过脸按脸框裁，脸在格子正中；没认脸按参照立绘的脸框位置估；图还没读到尺寸不裁', () => {
  // 照玩家存档里阿黛尔那张立绘（832×1216，认过脸）
  const crop = faceCrop([304, 184, 488, 328], [832, 1216])
  const side = 100 / crop.width * 832 // 格子边长（像素）
  const center = [(304 + 488) / 2, (184 + 328) / 2]
  assert.ok(Math.abs(-crop.left / 100 * side + side / 2 - center[0]) < 1, '脸在格子水平正中')
  assert.ok(Math.abs((328 - 184) / side - 0.48) < 0.01, '脸占格子高度的一半不到')
  const guess = faceCrop(null, [832, 1216])
  assert.ok(Math.abs(guess.width / 100 - 832 / ((FACE_RATIO * 1216) / 0.48)) < 0.01)
  assert.equal(faceCrop([0, 0, 10, 10], null), null)
  assert.ok(faceCrop([0, 0, 830, 1210], [832, 1216]).width >= 100, '脸框大得离谱时格子不超过整张图')
})
