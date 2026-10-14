// 换脸怎么画（lib/face-paint.js）：放大重画、软边遮罩、贴回、比对、按强弱定重绘强度、最激烈的整张画、后台认脸的清单。
// 先测纯函数，再用假的 NovelAI（照发来的图和遮罩改遮罩里那一块）把引擎里的换脸走一遍。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { decodePng, encodePng } from '../lib/image/png.js'
import { cropFor, resample, faceAlpha, maskPixel, blendSoft, shrinkBack, faceDrift, expressionChange, matchTone, nextStrength, betterTry, referenceImage, cleanFaceSettings, DEFAULT_FACE, cleanLevel } from '../lib/face-paint.js'
import { closeUpPrompt } from '../lib/face.js'
import { emotionLevel } from '../lib/emotions.js'
import { actingLevel, cleanActing, actingFace, actingBrief } from '../lib/acting.js'
import { resolveConfig } from '../lib/config.js'
import { buildNaiBody, naiReferenceOk } from '../lib/image/novelai.js'
import { variantKey } from '../lib/look.js'
import { createStore } from '../lib/dsh/store.js'
import { createEngine } from '../lib/engine.js'
import { fromBase64 } from '../lib/bytes.js'

function solid(width, height, [r, g, b], alphaAt = () => 255) {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) data.set([r, g, b, alphaAt(x, y)], (y * width + x) * 4)
  return { width, height, data }
}
const px = (img, x, y) => [...img.data.subarray((y * img.width + x) * 4, (y * img.width + x) * 4 + 4)]
/** 一张有横条纹的图（看缩放有没有走样）。 */
function stripes(width, height) {
  const img = solid(width, height, [0, 0, 0])
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) { const v = Math.floor(y / 8) % 2 ? 220 : 40; img.data.set([v, v, v, 255], (y * width + x) * 4) }
  return img
}

test('gate: 换脸设置：缺的用默认，数值夹在范围里，放大的边长对齐 64；默认全开、比对最多再画 10 次、角色参考默认关', () => {
  assert.deepEqual(cleanFaceSettings(null), JSON.parse(JSON.stringify(DEFAULT_FACE)))
  assert.deepEqual([DEFAULT_FACE.tone, DEFAULT_FACE.check, DEFAULT_FACE.retries, DEFAULT_FACE.expression, DEFAULT_FACE.floor], [true, true, 10, 3, 0.5])
  const c = cleanFaceSettings({ crop: false, cropScale: 9, cropSize: 1000, feather: -1, strength: { 1: 2, 3: 0.33 }, retries: 99, tolerance: 0, reference: true, check: 'x', tone: false, expression: 99, floor: 0 })
  assert.deepEqual([c.crop, c.cropScale, c.cropSize, c.feather, c.retries, c.tolerance, c.reference, c.check, c.tone, c.expression, c.floor], [false, 4, 1024, 0, 10, 0.5, true, true, false, 30, 0.2])
  assert.deepEqual(c.strength, { 1: 1, 2: 0.68, 3: 0.33, 4: 0.9 })
  const cfg = resolveConfig({ images: { face: { retries: 2 } } })
  assert.equal(cfg.images.face.retries, 2)
  assert.equal(cfg.images.face.crop, true)
  assert.deepEqual([cleanLevel(3), cleanLevel('4'), cleanLevel(5), cleanLevel(null)], [3, 4, 0, 0])
})

test('gate: 情绪强弱：内置的有默认（微笑「微」、生气「强」、大笑大哭惊恐「极」），新情绪跟着替身；设计师给这个人标的优先，只标了强弱的不算设计了表情', () => {
  assert.deepEqual(['smile', 'happy', 'angry', 'laugh', 'cry', 'scared'].map(e => emotionLevel(e)), [1, 2, 3, 4, 4, 4])
  const lib = { list: [{ id: '暴怒', base: 'angry' }, { id: '怪怪的' }] }
  assert.equal(emotionLevel('暴怒', lib), 3)
  assert.equal(emotionLevel('怪怪的', lib), 2, '跟不上任何内置情绪：算「中」')
  const acting = cleanActing({ poses: [{ label: '站着', emotions: ['neutral', 'angry', 'happy'] }], faces: [{ emotion: 'angry', tags: 'angry', level: 1 }, { emotion: 'happy', level: 4 }, { emotion: 'neutral', tags: 'calm', level: 9 }] })
  assert.equal(actingLevel(acting, 'angry'), 1, '冷的人生气只是「微」')
  assert.equal(actingLevel(acting, 'happy'), 4)
  assert.equal(actingLevel(acting, 'neutral'), 1, '标坏了的不认')
  assert.equal(acting.faces.neutral.level, undefined)
  assert.equal(actingFace(acting, 'happy'), null, '只标了强弱：表情照内置的画')
  assert.match(actingBrief(acting), /生气［微］：/)
})

test('gate: 放大重画：裁脸框长边 2.2 倍的正方形、放大到 1024；Lanczos 缩放不走样，超出图的地方垫白，透明处按白底', () => {
  const crop = cropFor([88, 88, 168, 152])
  assert.deepEqual(crop, { box: [40, 32, 216, 208], size: 1024 })
  assert.equal(cropFor([0, 0, 600, 600], { scale: 2, size: 1024 }).size, 1216, '脸框本来就大：不缩小，按它的大小对齐 64')
  const img = stripes(64, 64)
  const same = resample(img, [0, 0, 64, 64], 64, 64)
  assert.deepEqual(px(same, 10, 3), [40, 40, 40, 255])
  assert.deepEqual(px(same, 10, 12), [220, 220, 220, 255])
  const big = resample(img, [0, 0, 64, 64], 256, 256)
  assert.ok(Math.abs(px(big, 100, 14)[0] - 40) < 6 && Math.abs(px(big, 100, 46)[0] - 220) < 6, '放大后条纹还在原处')
  const out = resample(img, [-16, -16, 48, 48], 64, 64)
  assert.deepEqual(px(out, 2, 2), [255, 255, 255, 255], '超出图的地方是白')
  const clear = resample(solid(16, 16, [0, 0, 0], () => 0), [0, 0, 16, 16], 16, 16)
  assert.deepEqual(px(clear, 8, 8), [255, 255, 255, 255], '透明处按白底')
  // 放大再缩回去：跟原图差不多
  const back = shrinkBack(resample(img, [0, 0, 64, 64], 256, 256), { box: [0, 0, 64, 64], size: 256 })
  assert.deepEqual(back.at, [0, 0])
  let diff = 0
  for (let y = 4; y < 60; y++) for (let x = 4; x < 60; x++) diff += Math.abs(px(back.image, x, y)[0] - px(img, x, y)[0])
  assert.ok(diff / (56 * 56) < 8, '来回一趟几乎不变（锐利的条纹边上有一点振铃）：' + diff / (56 * 56))
})

test('gate: 软边遮罩：眉眼口和两颊整块重画，往外慢慢过渡到原图，四个角收圆；发给 NovelAI 的遮罩只有黑白、整格 8×8 对齐，盖住所有要用重画的地方', () => {
  const box = [88, 88, 168, 152]
  const a = faceAlpha(box)
  assert.equal(a.at(128, 120), 1, '脸中间')
  assert.equal(a.at(92, 120), 1, '两颊')
  assert.equal(a.at(128, 92), 1, '眉毛')
  assert.equal(a.at(100, 96), 1, '眉毛外头')
  const band = a.at(176, 120)
  assert.ok(band > 0 && band < 1, '框外一点：渐变 ' + band)
  assert.equal(a.at(200, 120), 0, '再往外是原图')
  assert.ok(a.at(88, 88) < 0.5, '角收圆')
  const hard = faceAlpha(box, { soft: false })
  assert.equal(hard.at(176, 120), 0)
  assert.deepEqual(hard.bounds, box)
  const crop = cropFor(box)
  const pixel = maskPixel(crop, a, crop.size, crop.size)
  const k = crop.size / (crop.box[2] - crop.box[0])
  const at = (x, y) => pixel(Math.round((x - crop.box[0]) * k), Math.round((y - crop.box[1]) * k))
  assert.equal(at(128, 120), 255)
  assert.equal(at(176, 120), 255, '渐变那一圈也在遮罩里')
  assert.equal(at(44, 36), 0, '裁下来那块的角上不画')
  for (let gy = 0; gy < crop.size / 8; gy += 7) {
    for (let gx = 0; gx < crop.size / 8; gx += 5) {
      const v = pixel(gx * 8, gy * 8)
      assert.ok(v === 0 || v === 255)
      for (const [dx, dy] of [[7, 0], [0, 7], [7, 7], [3, 5]]) assert.equal(pixel(gx * 8 + dx, gy * 8 + dy), v, '一格里一样')
    }
  }
  // 遮罩里涂白的地方，盖住了贴回时所有用得到重画的点
  for (let y = a.bounds[1]; y < a.bounds[3]; y += 3) for (let x = a.bounds[0]; x < a.bounds[2]; x += 3) if (a.at(x, y) > 0) assert.equal(at(x, y), 255, `(${x},${y})`)
})

test('gate: 贴回：用得到重画的地方按软边混进去，其余和原图一模一样，透明度照原图', () => {
  const src = solid(256, 256, [0, 0, 255], x => (x < 10 ? 0 : 255))
  const gen = solid(120, 120, [255, 0, 0])
  const a = faceAlpha([88, 88, 168, 152])
  const out = blendSoft(src, gen, a, [68, 60])
  assert.deepEqual(px(out, 128, 120), [255, 0, 0, 255])
  assert.deepEqual(px(out, 30, 30), [0, 0, 255, 255])
  const mid = px(out, 176, 120)
  assert.ok(mid[0] > 0 && mid[0] < 255 && mid[2] > 0, '渐变处两边混着')
  assert.equal(px(out, 5, 120)[3], 0)
})

/** 一张画了脸的图：肤色底，两道眉、两只眼（眼线 + 瞳孔）、一道嘴线。face 里能改眉的倾斜、嘴的位置和长短、线条深浅、整体挪几像素。 */
function drawFace({ brow = 0, mouthY = 136, mouthW = 12, ink = [60, 30, 30], dx = 0, size = 256 } = {}) {
  const img = solid(size, size, [220, 180, 160])
  const dot = (x, y) => { x = Math.round(x + dx); y = Math.round(y); if (x >= 0 && y >= 0 && x < size && y < size) img.data.set([...ink, 255], (y * size + x) * 4) }
  for (const [cx, side] of [[110, -1], [146, 1]]) {
    for (let t = -10; t <= 10; t++) for (let k = 0; k < 2; k++) dot(cx + t, 100 + k + brow * side * t / 10) // 眉：brow 往外头低下来
    for (let t = 0; t < 360; t += 2) { const a = t * Math.PI / 180; dot(cx + 9 * Math.cos(a), 114 + 5 * Math.sin(a)) } // 眼线
    for (let y = 111; y <= 117; y++) for (let x = cx - 2; x <= cx + 2; x++) dot(x, y) // 瞳孔
  }
  for (let t = -mouthW; t <= mouthW; t++) for (let k = 0; k < 2; k++) dot(128 + t, mouthY + k)
  return img
}

test('gate: 比对：表情看眉眼口的线条——原样描一遍（挪一点、淡一点）算没换上，眉、嘴换了算换上；整体色调拉回底图；大块明暗变了、软边一圈色差算画风跑偏', () => {
  const box = [96, 88, 160, 152]
  const a = faceAlpha(box)
  const src = drawFace()
  const same = faceDrift(src, src, a)
  assert.deepEqual([same.expr, same.flat, same.ok], [0, true, false], '一模一样：表情没换上')
  // 重画一遍、表情没变：线条挪了一个像素、淡了两成（强度太低时就是这样）
  const traced = drawFace({ dx: 1, ink: [100, 70, 65] })
  const t = faceDrift(src, traced, a)
  assert.ok(t.expr < DEFAULT_FACE.expression && t.flat, '原样描一遍不算换了表情：' + JSON.stringify(t))
  assert.ok(t.change > 1.5, '旧的「变化」量的是整张脸的平均差，描一遍也不小：' + t.change)
  // 眉头往外低下来、嘴往下挪了：表情换了
  const sad = drawFace({ brow: 4, mouthY: 142, mouthW: 8 })
  const good = faceDrift(src, sad, a)
  assert.ok(good.expr > 3 * DEFAULT_FACE.expression && good.ok, JSON.stringify(good))
  assert.equal(expressionChange(src, sad, box), good.expr)
  assert.equal(faceDrift(src, sad, a, [0, 0], { expression: 0 }).flat, false, '表情不查')
  // 整张脸亮了 30：色调拉回来就过；不拉回来算画风跑偏
  const pale = { width: 256, height: 256, data: new Uint8ClampedArray(sad.data) }
  for (let i = 0; i < pale.data.length; i += 4) for (let c = 0; c < 3; c++) pale.data[i + c] = sad.data[i + c] + 30
  const raw = faceDrift(src, pale, a)
  assert.ok(raw.drift > 1 && raw.shade > 11 && !raw.flat, '整体变亮：' + JSON.stringify(raw))
  const toned = matchTone(src, pale, a)
  assert.deepEqual(toned.shift, [-30, -30, -30])
  assert.deepEqual(px(toned.image, 128, 128), px(sad, 128, 128))
  assert.equal(faceDrift(src, toned.image, a).ok, true, '拉回来就过')
  assert.equal(faceDrift(src, pale, a, [0, 0], { tolerance: 20 }).ok, true, '放宽了就过')
  // 左暗右亮的一大块（阴影没了、半边脸变色）：中位数拉不回来，还是跑偏；表情照样认得出换了
  const half = { width: 256, height: 256, data: new Uint8ClampedArray(sad.data) }
  for (let y = 0; y < 256; y++) for (let x = 128; x < 256; x++) for (let c = 0; c < 3; c++) half.data[(y * 256 + x) * 4 + c] = sad.data[(y * 256 + x) * 4 + c] + 60
  const halfToned = matchTone(src, half, a)
  const drift = faceDrift(src, halfToned.image, a)
  assert.ok(drift.drift > 1 && !drift.flat, '半边脸变色：' + JSON.stringify(drift))
  // 调强度：没换上往上（跑偏也先管表情）、跑偏往下但不低于下限、起步就低于下限的不往上抬、定死的不动
  assert.equal(nextStrength(0.55, same), 0.67)
  assert.equal(nextStrength(0.68, { ...drift, flat: true }), 0.8, '没换上又跑偏：先把表情换上')
  assert.equal(nextStrength(0.8, drift), 0.74)
  assert.equal(nextStrength(0.52, drift), 0.5, '最低到下限 0.5')
  assert.equal(nextStrength(0.5, drift, { floor: 0.3 }), 0.44)
  assert.equal(nextStrength(0.4, drift, { start: 0.4 }), 0.4, '起步 0.4 比下限低：不往下也不往上')
  assert.equal(nextStrength(0.5, drift, { fixed: true }), 0.5)
  assert.equal(nextStrength(0.68, good), 0.68)
  // 留哪张：过了的 > 表情换上了、画风没过的 > 表情没换上的（画风再像也不要）；都没换上留变得最多的
  const tGood = { check: good }, tDrift = { check: drift }, tSame = { check: same }, tTraced = { check: t }
  assert.equal(betterTry(betterTry(null, tDrift), tGood), tGood)
  assert.equal(betterTry(tGood, tDrift), tGood)
  assert.equal(betterTry(tSame, tDrift), tDrift, '没换上的排在跑偏的后面')
  assert.equal(betterTry(tDrift, tTraced), tDrift)
  assert.equal(betterTry(tSame, tTraced), t.expr > 0 ? tTraced : tSame)
})

test('gate: 比对拿真图校过：强度 0.3 原样描了一遍的「难过」认得出没换上，以前真换了表情的认得出换了', async () => {
  // 脸框那一块裁下来存成测试图：柯萝伊「坚定」底图和强度 0.3 重画的「难过」（眉眼口原样，玩家报的那张）；
  // 另一套底图（疲惫）和在它上面换过的「严肃」——以前换过的脸里表情变得最少的一张（眼睛从半睁到睁开）
  const read = async name => decodePng(await readFile(new URL(`./fixtures/face/${name}.png`, import.meta.url)))
  const [base, traced, other, serious] = await Promise.all(['determined', 'sad-0.30', 'base-2', 'serious-2'].map(read))
  const whole = img => [0, 0, img.width, img.height]
  const flat = expressionChange(base, traced, whole(base)), changed = expressionChange(other, serious, whole(other))
  assert.ok(flat < DEFAULT_FACE.expression / 2, '强度 0.3 原样描一遍：' + flat)
  assert.ok(changed > DEFAULT_FACE.expression * 1.5, '眼睛睁开了：' + changed)
})

test('gate: 放大重画的提示词：构图词换成 portrait；角色参考图摆成 NovelAI 认的尺寸、四周垫黑；只有 V4.5 能带参考', () => {
  const r = closeUpPrompt({ prompt: 'artist:x, 1girl, cowboy shot, centered, standing, facing viewer', negative: 'bad', characters: ['girl, smile, cowboy shot, standing'], characterNegatives: [''] })
  assert.equal(r.prompt, 'artist:x, 1girl, portrait, facing viewer')
  assert.deepEqual(r.characters, ['girl, smile'])
  const ref = referenceImage(solid(832, 1216, [255, 0, 0]))
  assert.deepEqual([ref.width, ref.height], [1024, 1536])
  assert.deepEqual(px(ref, 512, 768), [255, 0, 0, 255])
  assert.deepEqual(px(ref, 512, 2), [0, 0, 0, 255], '上下垫黑')
  assert.deepEqual([referenceImage(solid(1216, 832, [0, 0, 0])).width, referenceImage(solid(500, 520, [0, 0, 0])).width], [1536, 1472])
  assert.deepEqual(['nai-diffusion-4-5-full', 'nai-diffusion-4-5-curated', 'nai-diffusion-5-full', 'nai-diffusion-4-full'].map(naiReferenceOk), [true, true, false, false])
  assert.ok(buildNaiBody({ prompt: 'a', negative: '', width: 64, height: 64, seed: 1, config: { model: 'nai-diffusion-5-full' } }))
})

// ───────────────────────── 引擎 ─────────────────────────

const W = 256, H = 384
const EYES = { eyes: [[96, 96, 120, 112], [136, 96, 160, 112]], mouth: [[120, 136, 136, 144]] }

/**
 * 假 NovelAI：正常出图回肤色的人（左边 10 列透明）。局部重绘照发来的图改遮罩里的那一块：
 * plan 里 'good' 在遮罩中间画一道深色的嘴线（表情换了、别处不动）；'drift' 也画嘴线，但遮罩里从左到右越来越亮（半边脸变色，色调拉不回来，画风跑偏）；
 * 'flat' 原样回来（表情没换上）；轮完了一直 good。
 */
function fakeNai(plan = []) {
  const requests = []
  const fetchImpl = async (url, init) => {
    const body = JSON.parse(init.body)
    requests.push(body)
    const { width, height } = body.parameters
    if (body.action !== 'infill') return new Response(await encodePng(solid(width, height, [210, 170, 150], x => (x < 10 ? 0 : 255))), { status: 200 })
    const img = await decodePng(fromBase64(body.parameters.image))
    const mask = await decodePng(fromBase64(body.parameters.mask))
    const mode = plan[requests.filter(r => r.action === 'infill').length - 1] || 'good'
    let x0 = width, y0 = height, x1 = 0, y1 = 0
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) if (mask.data[(y * width + x) * 4]) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y) }
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, rx = (x1 - x0) / 2, ry = (y1 - y0) / 2
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const i = (y * width + x) * 4
        if (!mask.data[i]) continue
        if (mode === 'flat') continue
        if (Math.abs(x - cx) < rx * 0.25 && y > cy + ry * 0.2 && y < cy + ry * 0.26) img.data.set([70, 30, 30, 255], i)
        else if (mode === 'drift') { const up = 140 * (x - x0) / Math.max(1, x1 - x0); for (let c = 0; c < 3; c++) img.data[i + c] = Math.min(255, img.data[i + c] + up) }
      }
    }
    return new Response(await encodePng(img), { status: 200 })
  }
  return { requests, fetchImpl }
}

async function settle(engine, gameId, done, what = '') {
  const end = Date.now() + 15000
  for (;;) {
    const view = await engine.gameView(gameId)
    const lin = view.cast.find(p => p.name === '林岚')
    if (lin && done(lin)) return lin
    if (Date.now() > end) throw new Error('等太久：' + what + ' ' + JSON.stringify(lin?.spriteStatus))
    await new Promise(r => setTimeout(r, 20))
  }
}

test('gate: 换脸（默认画法）：等认脸的底图进后台清单 → 放大到 1024 重画、软边贴回 → 第一次跑偏就换种子调低一点强度再画、留过了的那张 → 定死强度的不调 → 表情没换上调高强度 → 「极」的整张画', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'flowgal-facepaint-'))
  try {
    const store = createStore(dir)
    const { requests, fetchImpl } = fakeNai(['drift', 'good', ...Array(11).fill('drift'), 'good', 'flat', 'flat', 'good'])
    const engine = createEngine({ store, services: {}, fetchImpl, logger: { warn() {}, info() {} } })
    await engine.patchConfig({ images: { auto: false, backgrounds: false, spriteWriter: false, sizes: { portrait: [W, H] } } })
    await engine.setSecret('novelai', 'official', 'k')
    await engine.castAction('g', 'save', { name: '林岚', patch: { appearance: '1girl, long black hair, blue eyes', seed: 7 } })
    const look = { appearance: '1girl, long black hair, blue eyes', outfit: '', states: [] }
    const cold = variantKey(look, 'cold'), angry = variantKey(look, 'angry')

    await engine.castAction('g', 'sprite', { name: '林岚', emotion: 'angry' })
    let lin = await settle(engine, 'g', p => p.sprites[cold]?.assetId && p.spriteStatus[angry]?.status === 'face', '底图画好、生气等认脸')
    assert.deepEqual(engine.facesWaiting(), [{ gameId: 'g', name: '林岚', key: cold, assetId: lin.sprites[cold].assetId }], '不用开剧场：浏览器从这里取')

    await engine.castAction('g', 'face-box', { name: '林岚', key: cold, rects: EYES })
    lin = await settle(engine, 'g', p => p.sprites[angry]?.assetId && !p.spriteStatus[angry], '换好脸')
    assert.deepEqual(engine.facesWaiting(), [], '认完就不在清单里')
    const infills = requests.filter(r => r.action === 'infill')
    assert.equal(infills.length, 2, '第一次跑偏，第二次过了')
    const [first, second] = infills
    assert.deepEqual([first.parameters.width, first.parameters.height], [1024, 1024], '头那一块放大到 1024 见方')
    assert.equal(first.parameters.seed, 7, '第一次跟底图同一个种子')
    assert.notEqual(second.parameters.seed, 7, '再画换种子')
    assert.deepEqual([first.parameters.inpaintImg2ImgStrength, second.parameters.inpaintImg2ImgStrength], [0.8, 0.74], '生气「强」0.8，跑偏了调低一点')
    assert.match(first.parameters.v4_prompt.caption.base_caption, /portrait/)
    assert.doesNotMatch(first.parameters.v4_prompt.caption.base_caption + first.parameters.v4_prompt.caption.char_captions[0].char_caption, /cowboy shot/)
    const body = await decodePng((await engine.readAsset(lin.sprites[cold].assetId)).data)
    const face = await decodePng((await engine.readAsset(lin.sprites[angry].assetId)).data)
    for (const [x, y] of [[5, 5], [40, 120], [220, 120], [128, 40], [128, 220], [200, 300]]) assert.deepEqual(px(face, x, y), px(body, x, y), `用不到重画的 (${x},${y}) 跟底图一样`)
    const mouth = Math.min(...[128, 129, 130, 131, 132, 133].map(y => px(face, 128, y)[0]))
    assert.ok(mouth < 120, '嘴换上了：' + mouth)
    const { paint } = lin.sprites[angry].face
    assert.deepEqual([paint.level, paint.strength, paint.tries, paint.crop, paint.soft, paint.check.ok], [3, 0.74, 2, true, true, true])
    assert.ok(paint.check.expr >= DEFAULT_FACE.expression, '表情变化：' + paint.check.expr)
    assert.deepEqual(paint.history.map(t => [t.strength, t.ok, t.flat]), [[0.8, false, false], [0.74, true, false]], '每次的强度和比对都记着')

    // 玩家把这张定死成 0.5：一直跑偏也不调强度，画满 1 + 10 次，留最像的
    const infillCount = () => requests.filter(r => r.action === 'infill').length
    await engine.castAction('g', 'face-redo', { name: '林岚', key: angry, strength: 0.5 })
    lin = await settle(engine, 'g', p => infillCount() === 13 && !p.spriteStatus[angry], '定死强度重画')
    assert.deepEqual(requests.filter(r => r.action === 'infill').slice(2).map(r => r.parameters.inpaintImg2ImgStrength), Array(11).fill(0.5))
    assert.equal(lin.sprites[angry].face.strength, 0.5)
    assert.deepEqual([lin.sprites[angry].face.paint.tries, lin.sprites[angry].face.paint.check.ok, lin.sprites[angry].face.paint.check.flat], [11, false, false])
    // 回到自动
    await engine.castAction('g', 'face-redo', { name: '林岚', key: angry, strength: null })
    lin = await settle(engine, 'g', p => infillCount() === 14 && !p.spriteStatus[angry], '回到自动')
    assert.equal(lin.sprites[angry].face.strength, undefined)
    assert.equal(requests.at(-1).parameters.inpaintImg2ImgStrength, 0.8)
    // 换个种子重画：头两次表情没换上（原样回来），强度往上调，第三次换上了；留换上的那张
    await engine.castAction('g', 'face-redo', { name: '林岚', key: angry })
    lin = await settle(engine, 'g', p => infillCount() === 17 && !p.spriteStatus[angry], '表情没换上')
    assert.deepEqual(requests.filter(r => r.action === 'infill').slice(14).map(r => r.parameters.inpaintImg2ImgStrength), [0.8, 0.92, 1], '没换上就调高')
    const again = lin.sprites[angry].face.paint
    assert.deepEqual([again.strength, again.tries, again.check.ok, again.history.map(t => t.flat)], [1, 3, true, [true, true, false]])

    // 大笑默认「极」：不换脸，整张画（同一个种子）
    const laugh = variantKey(look, 'laugh')
    const before = requests.length
    await engine.castAction('g', 'sprite', { name: '林岚', emotion: 'laugh' })
    lin = await settle(engine, 'g', p => p.sprites[laugh]?.assetId && !p.spriteStatus[laugh], '大笑')
    assert.deepEqual(requests.slice(before).map(r => r.action), ['generate'])
    assert.equal(requests.at(-1).parameters.seed, 7)
    assert.equal(lin.sprites[laugh].face, undefined)
    // 关掉「最激烈的整张画」：大笑也换脸（日常组的平静底图一起画上，等认脸）
    await engine.patchConfig({ images: { face: { wholePeak: false } } })
    const surprised = variantKey(look, 'surprised')
    await engine.castAction('g', 'sprite', { name: '林岚', emotion: 'surprised' })
    lin = await settle(engine, 'g', p => p.spriteStatus[surprised]?.status === 'face' || (p.sprites[surprised]?.face && !p.spriteStatus[surprised]), '惊讶换脸')
    assert.ok(lin.sprites[surprised].face, '惊讶「强」本来就换脸')
    engine.dispose()
  } finally {
    await rm(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 })
  }
})
