// 瞳色对齐（lib/eye-color.js）：换脸后照底图补瞳色、不同立绘照瞳色基准补，再用假的 NovelAI 把引擎里的流程走一遍。
// 图是画出来的假脸：肤色底、眼白、虹膜（从上到下由深到浅的渐变）、瞳孔、高光、上睫毛、一缕压过左眼的头发、嘴线。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { decodePng, encodePng } from '../lib/image/png.js'
import { rgbToLab, labToRgb } from '../lib/aa-patch.js'
import { matchEyes, matchPalette, paletteOf, eyeHues, eyeRects } from '../lib/eye-color.js'
import { faceAlpha, faceDrift, cleanFaceSettings, DEFAULT_FACE } from '../lib/face-paint.js'
import { isFaceTag, faceBoxFrom, swapFace } from '../lib/face.js'
import { variantKey } from '../lib/look.js'
import { createStore } from '../lib/dsh/store.js'
import { createEngine } from '../lib/engine.js'
import { fromBase64 } from '../lib/bytes.js'

const W = 256, H = 384
const EYES = { eyes: [[96, 96, 120, 112], [136, 96, 160, 112]], mouth: [[120, 136, 136, 144]] }
const BOX = faceBoxFrom(EYES, W, H)
const SKIN = [236, 206, 190]
const lch = (L, C, h) => labToRgb(L, C * Math.cos(h / 57.2958), C * Math.sin(h / 57.2958))

/**
 * 一张假脸。hue：虹膜色相（一个数，或 [左, 右]）；chroma：彩度；open：睁开多少（1 全睁，0 闭眼：上眼皮盖下来）；
 * eyes：两只眼睛的框；scale、shift：整张脸缩放、挪动（别的立绘，脸的大小位置不一样）。
 */
function drawFace({ hue = 250, chroma = 34, open = 1, eyes = EYES.eyes, width = W, height = H } = {}) {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) data.set([...SKIN, x < 10 ? 0 : 255], (y * width + x) * 4)
  const put = (x, y, rgb) => { if (x >= 0 && y >= 0 && x < width && y < height) data.set([...rgb, 255], (y * width + x) * 4) }
  eyes.forEach((r, k) => {
    const h = Array.isArray(hue) ? hue[k] : hue
    const cx = (r[0] + r[2]) / 2, cy = (r[1] + r[3]) / 2, rx = (r[2] - r[0]) / 2, ry = (r[3] - r[1]) / 2
    const lid = r[1] + (1 - open) * (r[3] - r[1]) // 上眼皮盖到哪
    const ir = ry * 0.95
    for (let y = r[1] - 3; y < r[3] + 2; y++) for (let x = r[0] - 2; x < r[2] + 2; x++) {
      const e = ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2
      if (e > 1) continue
      if (y < lid) continue // 眼皮（肤色）
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy)
      if (d > ir) { put(x, y, [250, 250, 252]); continue } // 眼白
      if (d < ir * 0.3) { put(x, y, [25, 20, 30]); continue } // 瞳孔
      const t = (y + 0.5 - (cy - ir)) / (2 * ir) // 虹膜从上（深）到下（浅）
      put(x, y, lch(38 + 30 * t, chroma, h))
    }
    if (open > 0.05) { put(Math.round(cx - ir * 0.4), Math.round(cy - ir * 0.4), [255, 255, 255]); put(Math.round(cx - ir * 0.4) + 1, Math.round(cy - ir * 0.4), [255, 255, 255]) } // 高光
    for (let x = r[0] - 2; x < r[2] + 2; x++) for (let t = 0; t < 2; t++) put(x, Math.round(lid) - 1 + t, [45, 30, 30]) // 上睫毛（压在眼皮下沿）
  })
  // 一缕头发斜着压过左眼（一像素宽）
  const [l] = eyes
  for (let t = 0; t <= 40; t++) put(Math.round(l[0] - 6 + t * (l[2] - l[0] + 12) / 40), Math.round(l[1] - 8 + t * (l[3] - l[1] + 16) / 40), [70, 50, 45])
  for (let x = 120; x < 136; x++) put(x, 140, [140, 70, 70]) // 嘴
  return { width, height, data }
}

const px = (img, x, y) => [...img.data.subarray((y * img.width + x) * 4, (y * img.width + x) * 4 + 3)]
/** 一只眼睛虹膜的平均 Lab（按画的时候的位置挑：眼框里不是眼白、瞳孔、睫毛、肤色的）。 */
function irisMean(img, rect) {
  let s = [0, 0, 0], n = 0
  for (let y = rect[1]; y < rect[3]; y++) for (let x = rect[0]; x < rect[2]; x++) {
    const [L, a, b] = rgbToLab(...px(img, x, y))
    if (Math.hypot(a, b) < 15 || L > 85 || L < 30) continue
    if (Math.hypot(...[L, a, b].map((v, i) => v - rgbToLab(...SKIN)[i])) < 12) continue
    s = s.map((v, i) => v + [L, a, b][i]); n++
  }
  return n ? s.map(v => v / n) : null
}
const dE = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])
const isIris = (img, x, y) => { const [L, a, b] = rgbToLab(...px(img, x, y)); return Math.hypot(a, b) >= 15 && L > 30 && L < 85 && dE([L, a, b], rgbToLab(...SKIN)) >= 12 }
/** 同一个地方的虹膜像素逐个比（两张都是虹膜的像素，平均色差）：半闭眼只露下半截，平均色跟整只眼本来就不一样，逐个比才公平。 */
function pixelGap(want, got, rect) {
  let s = 0, n = 0
  for (let y = rect[1]; y < rect[3]; y++) for (let x = rect[0]; x < rect[2]; x++) {
    if (!isIris(got, x, y) || !isIris(want, x, y)) continue
    s += dE(rgbToLab(...px(want, x, y)), rgbToLab(...px(got, x, y))); n++
  }
  return s / n
}

test('gate: 提示词里的瞳色认得出（带权重、带深浅、异色瞳两个都认），黑灰白不限色相；竖瞳、星星瞳算外貌，心形瞳、缩瞳还算表情', () => {
  assert.deepEqual(eyeHues('1girl, long black hair, blue eyes'), [[195, 310]])
  assert.deepEqual(eyeHues('1.2::light blue eyes::, smile'), [[195, 310]])
  assert.deepEqual(eyeHues('heterochromia, red eyes, blue eyes'), [[10, 65], [195, 310]])
  assert.deepEqual(eyeHues('aqua_eyes'), [[165, 250]])
  assert.deepEqual(eyeHues('black eyes, grey eyes, closed eyes, blue hair'), [])
  assert.deepEqual(eyeHues('golden eyes', 'green eyes'), [[60, 115], [105, 180]])
  for (const t of ['slit pupils', 'star-shaped pupils', 'cross-shaped pupils', 'bright pupils']) assert.equal(isFaceTag(t), false, t)
  for (const t of ['heart-shaped pupils', 'symbol-shaped pupils', 'constricted pupils', 'closed eyes', 'half-closed eyes']) assert.equal(isFaceTag(t), true, t)
  // 角色块里的竖瞳换脸时照留着，也不压进负面
  const swapped = swapFace({ positive: 'masterpiece', characters: ['girl, silver hair, red eyes, slit pupils, expressionless'], characterNegatives: [''] }, { tags: 'smile', negative: '' }, { oldNegative: true })
  assert.match(swapped.characters[0], /slit pupils/)
  assert.match(swapped.characters[0], /smile/)
  assert.doesNotMatch(swapped.characterNegatives[0], /slit pupils/)
  assert.match(swapped.characterNegatives[0], /expressionless/)
})

test('gate: 眼框：认脸认出的两个直接用（左边的在前），没有就照脸框倒推，推出来的盖得住真眼睛', () => {
  assert.deepEqual(eyeRects(BOX, [EYES.eyes[1], EYES.eyes[0]]), EYES.eyes)
  const guess = eyeRects(BOX, null)
  for (const [k, r] of guess.entries()) {
    const real = EYES.eyes[k]
    const cx = (real[0] + real[2]) / 2, cy = (real[1] + real[3]) / 2
    assert.ok(cx > r[0] && cx < r[2] && cy > r[1] - 4 && cy < r[3] + 4, `估的第 ${k + 1} 只眼框 ${r} 盖住了真眼睛的中心`)
  }
  assert.equal(eyeRects(BOX, [[0, 0, 5, 5], [1, 1, 6, 6]]).length, 2, '脸框外面的眼框不认，按脸框估')
})

test('gate: 换脸补瞳色：重画的虹膜换了一种蓝、眼睛半闭，补完跟底图一样；眼白、瞳孔、睫毛、压着的头发、皮肤一个像素都不动', () => {
  const src = drawFace({ hue: 250 })
  const gen = drawFace({ hue: 292, chroma: 46, open: 0.6 })
  const hues = eyeHues('blue eyes')
  for (const tags of [hues, []]) {
    const res = matchEyes(src, gen, BOX, [0, 0], { eyes: EYES.eyes, hues: tags })
    assert.deepEqual(res.eyes.map(e => e.status), ['fixed', 'fixed'], JSON.stringify(res.eyes))
    for (const e of res.eyes) assert.ok(e.before > 12 && e.after < 3, `补之前差得多、补完差不多一样：${JSON.stringify(e)}`)
    assert.ok(res.diff < 3)
    for (const [k, r] of EYES.eyes.entries()) {
      const was = pixelGap(src, gen, r), got = pixelGap(src, res.image, r)
      assert.ok(was > 20 && got < 2, `第 ${k + 1} 只：补前 ${was.toFixed(1)}、补后 ${got.toFixed(1)}`)
    }
    // 不是虹膜的地方原样
    let moved = 0
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (isIris(gen, x, y)) continue
      if (px(res.image, x, y).some((v, c) => Math.abs(v - px(gen, x, y)[c]) > 2)) moved++
    }
    assert.equal(moved, 0, '眼白、瞳孔、睫毛、头发、皮肤、嘴没动')
  }
  // 补完再量一遍：已经一样了就几乎不动
  const once = matchEyes(src, gen, BOX, [0, 0], { eyes: EYES.eyes, hues }).image
  const twice = matchEyes(src, once, BOX, [0, 0], { eyes: EYES.eyes, hues })
  assert.ok(twice.eyes.every(e => e.before < 3), JSON.stringify(twice.eyes))
})

test('gate: 换脸补瞳色：重画的闭着眼不补、灰黑色的眼睛不补、底图上认不准的不补（不补比补错好）；异色瞳两只各照各的', () => {
  const src = drawFace({ hue: 250 })
  const closed = drawFace({ hue: 292, open: 0 })
  const res = matchEyes(src, closed, BOX, [0, 0], { eyes: EYES.eyes, hues: eyeHues('blue eyes') })
  assert.deepEqual(res.eyes.map(e => e.status), ['closed', 'closed'])
  assert.equal(res.image, closed, '一个像素都没改')
  const gray = matchEyes(drawFace({ chroma: 3 }), drawFace({ chroma: 3, hue: 100 }), BOX, [0, 0], { eyes: EYES.eyes })
  assert.ok(gray.eyes.every(e => e.status === 'gray' || e.status === 'none'), JSON.stringify(gray.eyes))
  // 左蓝右棕：淡棕色跟皮肤、头发是一族，提示词没写认不准 → 不补；写了就补。鲜红的跟皮肤分得开，不写也补
  const hetero = drawFace({ hue: [250, 55], chroma: 22 })
  const drift = drawFace({ hue: [290, 75], chroma: 22 })
  const unsure = matchEyes(hetero, drift, BOX, [0, 0], { eyes: EYES.eyes })
  assert.deepEqual(unsure.eyes.map(e => e.status), ['fixed', 'none'])
  const sure = matchEyes(hetero, drift, BOX, [0, 0], { eyes: EYES.eyes, hues: eyeHues('heterochromia, blue eyes, brown eyes') })
  assert.deepEqual(sure.eyes.map(e => e.status), ['fixed', 'fixed'])
  for (const [k, r] of EYES.eyes.entries()) assert.ok(pixelGap(hetero, sure.image, r) < 2, `第 ${k + 1} 只照自己那只补`)
  const red = matchEyes(drawFace({ hue: 35, chroma: 45 }), drawFace({ hue: 10, chroma: 50 }), BOX, [0, 0], { eyes: EYES.eyes })
  assert.deepEqual(red.eyes.map(e => e.status), ['fixed', 'fixed'])
  for (const r of EYES.eyes) assert.ok(pixelGap(drawFace({ hue: 35, chroma: 45 }), red.image, r) < 2)
})

test('gate: 别的立绘照瞳色基准补：脸的大小、位置不一样也对得上；比对里瞳色差到线就算跑偏，填 0 不查', () => {
  const ref = drawFace({ hue: 250 })
  const palette = paletteOf(ref, BOX, { eyes: EYES.eyes, hues: eyeHues('blue eyes') })
  assert.ok(palette.every(Boolean), '两只眼都量出来了')
  assert.ok(Math.abs(palette[0].hue - 250) < 8, '基准的色相：' + palette[0].hue)
  // 另一个动作：脸往右下挪了、眼睛大了三成，颜色偏青
  const eyes2 = EYES.eyes.map(r => [r[0] + 14, r[1] + 20, r[0] + 14 + (r[2] - r[0]) * 1.3, r[1] + 20 + (r[3] - r[1]) * 1.3].map(Math.round))
  const other = drawFace({ hue: 205, chroma: 26, eyes: eyes2 })
  const box2 = faceBoxFrom({ eyes: eyes2 }, W, H)
  const res = matchPalette(other, box2, palette, { eyes: eyes2, hues: eyeHues('blue eyes') })
  assert.deepEqual(res.eyes.map(e => e.status), ['fixed', 'fixed'])
  for (const [k, r] of eyes2.entries()) assert.ok(dE(irisMean(ref, EYES.eyes[k]), irisMean(res.image, r)) < 6, `第 ${k + 1} 只照基准补了`)
  assert.deepEqual(matchPalette(other, box2, [null, palette[1]], { eyes: eyes2 }).eyes.map(e => e.status), ['nobase', 'fixed'], '基准上没量出的那只不补')

  const alpha = faceAlpha(BOX)
  const same = faceDrift(ref, ref, alpha, [0, 0], { expression: 0, eye: 0, eyeLimit: 10 })
  assert.ok(same.ok)
  const off = faceDrift(ref, ref, alpha, [0, 0], { expression: 0, eye: 15, eyeLimit: 10 })
  assert.deepEqual([off.eye, off.ok], [15, false])
  assert.ok(off.drift > 1)
  assert.ok(faceDrift(ref, ref, alpha, [0, 0], { expression: 0, eye: 15, eyeLimit: 0 }).ok, '0 不查')
  assert.ok(faceDrift(ref, ref, alpha, [0, 0], { expression: 0, eye: 15, eyeLimit: 10, tolerance: 2 }).ok, '宽严也管瞳色')
  // 设置：默认都开，差 10 算跑偏，0~40
  assert.deepEqual([DEFAULT_FACE.eyeColor, DEFAULT_FACE.eyeUnify, DEFAULT_FACE.eyeLimit], [true, true, 10])
  assert.deepEqual([cleanFaceSettings({ eyeLimit: 99 }).eyeLimit, cleanFaceSettings({ eyeLimit: -3 }).eyeLimit, cleanFaceSettings({ eyeColor: false }).eyeColor], [40, 0, false])
})

// ───────── 引擎里走一遍 ─────────

/**
 * 假 NovelAI：整张画按顺序画 wholes 里的假脸（默认第一张底图蓝眼睛，第二张大笑整张画偏青）；
 * 局部重绘把发来的图里的虹膜换一种蓝（色相 +40，跑色），再画一道嘴线（表情换了）。
 */
function fakeNai(wholes = [{ hue: 250, chroma: 34 }, { hue: 205, chroma: 26 }]) {
  const requests = []
  let whole = 0
  const fetchImpl = async (url, init) => {
    const body = JSON.parse(init.body)
    requests.push(body)
    const { width, height } = body.parameters
    if (body.action !== 'infill') return new Response(await encodePng(drawFace({ ...wholes[Math.min(whole++, wholes.length - 1)], width, height })), { status: 200 })
    const img = await decodePng(fromBase64(body.parameters.image))
    const mask = await decodePng(fromBase64(body.parameters.mask))
    let y0 = height, y1 = 0, x0 = width, x1 = 0
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      if (!mask.data[i]) continue
      x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y)
      const [L, a, b] = rgbToLab(img.data[i], img.data[i + 1], img.data[i + 2])
      const C = Math.hypot(a, b)
      if (C < 15 || L < 30 || L > 85 || dE([L, a, b], rgbToLab(...SKIN)) < 12) continue
      img.data.set(lch(L, C * 1.25, Math.atan2(b, a) * 57.2958 + 40), i)
    }
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, rx = (x1 - x0) / 2, ry = (y1 - y0) / 2
    for (let y = Math.round(cy + ry * 0.2); y < cy + ry * 0.26; y++) for (let x = Math.round(cx - rx * 0.25); x < cx + rx * 0.25; x++) img.data.set([70, 30, 30, 255], (y * width + x) * 4)
    return new Response(await encodePng(img), { status: 200 })
  }
  return { requests, fetchImpl }
}

async function settle(engine, done, what = '') {
  const end = Date.now() + 15000
  for (;;) {
    const lin = (await engine.gameView('g')).cast.find(p => p.name === '林岚')
    if (lin && done(lin)) return lin
    if (Date.now() > end) throw new Error('等太久：' + what + ' ' + JSON.stringify(lin?.spriteStatus))
    await new Promise(r => setTimeout(r, 20))
  }
}

test('gate: 引擎：换脸照底图补瞳色 → 第一张量好脸框的当瞳色基准 → 别的整张立绘量好脸框照它补（原图留着）→ 这张用原图 / 再补 → 换基准别的全重补（换脸的跟着底图补，不重画）→ 清空立绘基准跟着清', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'flowgal-eyes-'))
  try {
    const store = createStore(dir)
    const { requests, fetchImpl } = fakeNai()
    const engine = createEngine({ store, services: {}, fetchImpl, logger: { warn() {}, info() {} } })
    await engine.patchConfig({ images: { auto: false, backgrounds: false, spriteWriter: false, sizes: { portrait: [W, H] } } })
    await engine.setSecret('novelai', 'official', 'k')
    await engine.castAction('g', 'save', { name: '林岚', patch: { appearance: '1girl, long black hair, blue eyes', seed: 7 } })
    const look = { appearance: '1girl, long black hair, blue eyes', outfit: '', states: [] }
    const cold = variantKey(look, 'cold'), angry = variantKey(look, 'angry'), laugh = variantKey(look, 'laugh')
    const img = async id => decodePng((await engine.readAsset(id)).data)
    const [L, R] = EYES.eyes

    // 底图（蓝眼睛）→ 认脸 → 它是第一张，当瞳色基准；生气换脸：重画的虹膜跑了色，照底图补回来
    await engine.castAction('g', 'sprite', { name: '林岚', emotion: 'angry' })
    await settle(engine, p => p.sprites[cold]?.assetId && p.spriteStatus[angry]?.status === 'face', '底图画好')
    await engine.castAction('g', 'face-box', { name: '林岚', key: cold, rects: EYES })
    let lin = await settle(engine, p => p.sprites[angry]?.assetId && !p.spriteStatus[angry], '换好脸')
    assert.equal(lin.eyeRef.key, cold, '第一张量好脸框的当基准')
    assert.deepEqual(lin.sprites[cold].faceEyes, EYES.eyes, '认脸的眼框记着')
    assert.equal(lin.sprites[cold].eyeFix, undefined, '基准自己不补')
    const body = await img(lin.sprites[cold].assetId)
    const face = await img(lin.sprites[angry].assetId)
    for (const r of [L, R]) assert.ok(dE(irisMean(body, r), irisMean(face, r)) < 6, '换脸的瞳色跟底图一样')
    const paint = lin.sprites[angry].face.paint
    assert.ok(paint.eyes.every(e => e.status === 'fixed' && e.before > 10), JSON.stringify(paint.eyes))
    assert.ok(paint.check.eye < 3, '比对的瞳色差是补完的：' + paint.check.eye)
    assert.ok(paint.history.every(t => Number.isFinite(t.eye)))

    // 大笑「极」整张画，眼睛偏青 → 剧场量脸框 → 照基准补；原图留着
    await engine.castAction('g', 'sprite', { name: '林岚', emotion: 'laugh' })
    lin = await settle(engine, p => p.sprites[laugh]?.assetId && !p.spriteStatus[laugh], '大笑')
    const laughRaw = lin.sprites[laugh].assetId
    assert.ok(dE(irisMean(body, L), irisMean(await img(laughRaw), L)) > 15, '整张画的眼睛颜色跑了')
    await engine.castAction('g', 'face-box', { name: '林岚', key: laugh, rects: EYES, measure: true })
    lin = await settle(engine, p => p.sprites[laugh].eyeFix, '大笑补瞳色')
    assert.equal(lin.sprites[laugh].eyeFix.original, laughRaw)
    assert.equal(lin.sprites[laugh].eyeFix.ref, lin.sprites[cold].assetId)
    assert.ok(lin.sprites[laugh].eyeFix.eyes.every(e => e.status === 'fixed'))
    const laughFixed = lin.sprites[laugh].assetId
    for (const r of [L, R]) assert.ok(dE(irisMean(body, r), irisMean(await img(laughFixed), r)) < 6, '大笑的瞳色照基准补了')
    assert.ok(await engine.readAsset(laughRaw), '原图留着')

    // 这张用原图 → 换回原图、补过的删掉；再照基准补
    await engine.castAction('g', 'eye-keep', { name: '林岚', key: laugh, keep: true })
    lin = await settle(engine, p => p.sprites[laugh].eyeKeep, '用原图')
    assert.deepEqual([lin.sprites[laugh].assetId, lin.sprites[laugh].eyeFix], [laughRaw, undefined])
    assert.equal(await engine.readAsset(laughFixed), null, '补过的那张删了')
    await engine.castAction('g', 'eye-keep', { name: '林岚', key: laugh, keep: false })
    lin = await settle(engine, p => !p.sprites[laugh].eyeKeep && p.sprites[laugh].eyeFix?.original === laughRaw, '再补')

    // 把大笑设成基准：它换回原图，底图照它补，底图上换的脸跟着底图补（不重画）
    const infills = requests.filter(r => r.action === 'infill').length
    const angryWas = lin.sprites[angry].assetId
    await engine.castAction('g', 'eye-ref', { name: '林岚', key: laugh })
    lin = await settle(engine, p => p.eyeRef.key === laugh && p.sprites[cold].eyeFix?.original, '换基准')
    assert.deepEqual([lin.eyeRef.by, lin.sprites[laugh].assetId, lin.sprites[laugh].eyeFix], ['hand', laughRaw, undefined], '基准用原图')
    const newBody = await img(lin.sprites[cold].assetId), laughImg = await img(laughRaw)
    for (const r of [L, R]) assert.ok(dE(irisMean(laughImg, r), irisMean(newBody, r)) < 6, '底图照新基准补了')
    assert.equal(lin.sprites[angry].face.body, lin.sprites[cold].assetId, '换脸的跟着认新底图，不算底图换过')
    assert.notEqual(lin.sprites[angry].assetId, angryWas)
    assert.equal(lin.sprites[angry].eyeFix.original, angryWas)
    for (const r of [L, R]) assert.ok(dE(irisMean(laughImg, r), irisMean(await img(lin.sprites[angry].assetId), r)) < 6, '换脸的瞳色跟着补了')
    assert.equal(requests.filter(r => r.action === 'infill').length, infills, '没重画、不花 Anlas')
    await assert.rejects(engine.castAction('g', 'eye-ref', { name: '林岚', key: angry }), /换脸的差分/)

    // 清空立绘：基准跟着清
    await engine.castAction('g', 'sprite-clear', { name: '林岚' })
    lin = await settle(engine, p => !p.eyeRef, '清空')
    assert.deepEqual(lin.sprites, {})
    engine.dispose()
  } finally {
    await rm(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 })
  }
})

test('gate: 引擎：第一张立绘闭着眼认不出虹膜，往后找第一张认得出的当基准；闭着眼的那张不补也不白存图', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'flowgal-eyes-'))
  try {
    const { fetchImpl } = fakeNai([{ hue: 250, open: 0 }, { hue: 250 }])
    const engine = createEngine({ store: createStore(dir), services: {}, fetchImpl, logger: { warn() {}, info() {} } })
    await engine.patchConfig({ images: { auto: false, backgrounds: false, spriteWriter: false, sizes: { portrait: [W, H] }, faceSwap: false } })
    await engine.setSecret('novelai', 'official', 'k')
    await engine.castAction('g', 'save', { name: '林岚', patch: { appearance: '1girl, long black hair, blue eyes', seed: 7 } })
    const look = { appearance: '1girl, long black hair, blue eyes', outfit: '', states: [] }
    const cold = variantKey(look, 'cold'), laugh = variantKey(look, 'laugh')
    await engine.castAction('g', 'sprite', { name: '林岚', emotion: 'cold' })
    let lin = await settle(engine, p => p.sprites[cold]?.assetId && !p.spriteStatus[cold], '第一张')
    await engine.castAction('g', 'face-box', { name: '林岚', key: cold, rects: EYES, measure: true })
    await new Promise(r => setTimeout(r, 200))
    lin = await settle(engine, p => p.sprites[cold].faceBox, '量好脸框')
    assert.equal(lin.eyeRef, null, '闭着眼认不出虹膜，先不定基准')
    await engine.castAction('g', 'sprite', { name: '林岚', emotion: 'laugh' })
    lin = await settle(engine, p => p.sprites[laugh]?.assetId && !p.spriteStatus[laugh], '第二张')
    const coldId = lin.sprites[cold].assetId
    await engine.castAction('g', 'face-box', { name: '林岚', key: laugh, rects: EYES, measure: true })
    lin = await settle(engine, p => p.eyeRef, '定基准')
    assert.deepEqual([lin.eyeRef.key, lin.eyeRef.by], [laugh, 'auto'])
    lin = await settle(engine, p => p.sprites[cold].eyeFix, '闭着眼那张比过')
    assert.equal(lin.sprites[cold].assetId, coldId, '没换图')
    assert.equal(lin.sprites[cold].eyeFix.original, undefined)
    assert.deepEqual(lin.sprites[cold].eyeFix.eyes.map(e => e.status), ['closed', 'closed'])
    engine.dispose()
  } finally {
    await rm(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 })
  }
})
