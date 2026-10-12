// 立绘在剧场里的大小和高低：按脸框把大家的头缩放到一样大，按身高抬高或压低；身高从档案、动作与表情设计、性别外貌来。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { guessHeight, heightOf, cleanHeight, placeSprite, genderOf, FACE_RATIO } from '../lib/stature.js'
import { cleanActing, mergeActing, poseTags } from '../lib/acting.js'
import { composePrompt } from '../lib/image/style.js'
import { resolveConfig } from '../lib/config.js'
import { encodePng } from '../lib/image/png.js'
import { createStore } from '../lib/dsh/store.js'
import { createEngine } from '../lib/engine.js'

const H = [832, 1216]
const faceAt = (ratio, center) => [300, (center - ratio / 2) * H[1], 520, (center + ratio / 2) * H[1]]

test('gate: 身高：档案写的优先，其次设计师估的，都没有按性别和外貌 tag 估（矮人、孩子、矮小、高挑）', () => {
  assert.equal(guessHeight({ gender: 'female', appearance: '1girl, long hair' }), 160)
  assert.equal(guessHeight({ gender: 'male', appearance: '1boy, short hair' }), 172, 'short hair 不算矮')
  assert.equal(guessHeight({ appearance: '1girl, orange hair, dwarf, short, stocky' }), 125)
  assert.equal(guessHeight({ appearance: 'girl, long pale blonde hair, petite, teen' }), 146)
  assert.equal(guessHeight({ gender: 'male', appearance: '1boy, tall, 1.1::very tall::' }), 188, '权重写法也认')
  assert.equal(guessHeight({ appearance: 'little girl, twintails' }), 128)
  assert.equal(genderOf({ appearance: '1boy, white hair' }), 'male', '档案没写性别按 1boy / 1girl 猜')
  assert.equal(genderOf({ appearance: 'silver hair' }), 'other')
  assert.deepEqual(heightOf({ gender: 'female', appearance: '1girl', acting: { height: 150 } }), { cm: 150, from: 'acting' })
  assert.deepEqual(heightOf({ gender: 'female', appearance: '1girl', height: 171, acting: { height: 150 } }), { cm: 171, from: 'user' })
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
  assert.deepEqual(placeSprite({ cm: 160 }), { k: 1, lift: 0, head: 0.095 }, '参照身高、参照构图：跟以前一样')
  // 画得太离谱的不硬掰
  assert.equal(placeSprite({ box: faceAt(0.4, 0.4), size: H, cm: 160 }).k, 0.6)
})

test('gate: 设计师估的身高跟着动作与表情设计存；前倾、弯腰这类会把镜头拉近的动作 tag 去掉', () => {
  const sheet = cleanActing({ read: '矮人战士', height: '128', poses: [{ label: '握拳捶胸', tags: 'clenched fist on own chest, leaning forward slightly, shoulders squared', emotions: ['neutral'] }] })
  assert.equal(sheet.height, 128)
  assert.equal(sheet.poses[0].tags, 'clenched fist on own chest, shoulders squared')
  assert.equal(cleanActing({ height: 9000, poses: [{ label: 'A', emotions: ['neutral'] }] }).height, undefined)
  assert.equal(mergeActing(sheet, { height: 150, poses: [] }).sheet.height, 128, '补设计不改已经估好的身高')
  assert.equal(mergeActing({ ...sheet, height: undefined }, { height: 150 }).sheet.height, 150)
  assert.equal(poseTags('bent over, hands on knees, bending forward'), 'hands on knees')
  const cfg = resolveConfig({ images: { backend: 'novelai' } })
  const p = composePrompt({ kind: 'sprite', tags: 'girl, smile, leaning forward, hands behind back', person: { appearance: '1girl', gender: 'female' }, emotion: 'smile', backend: 'novelai', config: cfg })
  assert.doesNotMatch(p.characters[0], /leaning forward/, '设计师写了前倾也不进提示词')
  assert.match(p.characterNegatives[0], /leaning forward/)
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
