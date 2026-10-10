// 工作台的自动框：认脸模型的前后处理、框怎么推、大模型（Florence-2）结果怎么读、同一角色跟随。
// 模型本身不在测试里跑（在浏览器里跑），这里用假的 run / ground 喂结果。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  fitSize, imageTensor, parseYolo, nms, pickEyes, mouthGuess, findMouth, framesFrom,
  readGrounding, plausibleMouth, autoFrame, followFrame, squareAround,
} from '../lib/detect.js'
import { cleanRects } from '../lib/aa-sprite.js'

/** 纯色 RGBA 图；paint(x, y) 可以改某些像素，回 [r, g, b, a] 或 null（不改）。 */
function image(width, height, base = [240, 210, 190, 255], paint = () => null) {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) data.set(paint(x, y) || base, (y * width + x) * 4)
  }
  return { width, height, data }
}
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}：${a} 跟 ${b} 差太多`)
const centerOf = b => [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2]

test('gate: 送进模型的尺寸按长边缩到 640、对齐 32，小块可以放大；透明处垫白', () => {
  assert.deepEqual(fitSize(832, 1216), { w: 448, h: 640 })
  assert.deepEqual(fitSize(300, 200), { w: 320, h: 224 }) // 只缩不放
  assert.deepEqual(fitSize(200, 180, 640, 32, 384), { w: 384, h: 352 }) // 眼睛的裁块放大了认
  const img = image(2, 1, [255, 0, 0, 255], x => (x === 1 ? [0, 0, 0, 0] : null))
  const t = imageTensor(img, [0, 0, 2, 1], { w: 2, h: 1 })
  assert.deepEqual([...t], [1, 1, 0, 1, 0, 1]) // R 平面：红、白；G：0、1；B：0、1
})

test('gate: YOLO 输出按分数线读出、换回原图坐标，重叠的框只留分数高的', () => {
  // 3 个候选：[中心x, 中心y, 宽, 高, 分数]，在 64×64 的输入里
  const cand = [[32, 32, 16, 16, 0.9], [33, 32, 16, 16, 0.6], [10, 10, 4, 4, 0.1]]
  const n = cand.length
  const data = new Float32Array(5 * n)
  cand.forEach((c, i) => c.forEach((v, k) => { data[k * n + i] = v }))
  const out = parseYolo(data, [1, 5, n], { threshold: 0.25, box: [100, 200, 228, 328], size: { w: 64, h: 64 } })
  assert.equal(out.length, 1)
  assert.equal(out[0].score, Number(Float32Array.of(0.9)[0]))
  assert.deepEqual(out[0].box, [148, 248, 180, 280]) // (32±8)×2 + 偏移
  assert.equal(nms([{ box: [0, 0, 10, 10], score: 0.5 }, { box: [20, 0, 30, 10], score: 0.4 }]).length, 2)
})

test('gate: 脸里挑左右分开的一对眼睛，按从左到右排；嘴在两眼下方 0.7 个眼距', () => {
  const face = [100, 100, 300, 300]
  const eyes = pickEyes([
    { box: [210, 170, 250, 200], score: 0.8 },
    { box: [140, 172, 180, 202], score: 0.7 },
    { box: [190, 280, 200, 290], score: 0.9 }, // 下巴上的误认（太靠下）
  ], face)
  assert.deepEqual(eyes.map(e => e.box), [[140, 172, 180, 202], [210, 170, 250, 200]])
  const g = mouthGuess([[100, 90, 140, 110], [200, 90, 240, 110]])
  assert.equal(g.d, 100)
  assert.deepEqual(g.center.map(Math.round), [170, 170])
})

test('gate: 在肤色上找嘴：认出嘴的那条线，碰到取景边的下巴轮廓不算', () => {
  const guess = { center: [200, 200], d: 100, angle: 0 }
  // 肤色底上画一条嘴线（195~205 行之间、180~220 列），再画一条横穿整个取景的下巴线
  const img = image(400, 400, undefined, (x, y) => {
    if (y >= 198 && y <= 201 && x >= 182 && x <= 218) return [120, 60, 60, 255]
    if (y >= 240 && y <= 242) return [60, 40, 40, 255]
    return null
  })
  const m = findMouth(img, guess, 300)
  assert.ok(m, '要找到嘴')
  near(centerOf(m)[0], 200, 3, '嘴的横向位置')
  near(centerOf(m)[1], 200, 3, '嘴的纵向位置')
  // 没有嘴线时找不到（只有一条横穿的轮廓线）
  const blank = image(400, 400, undefined, (x, y) => (y >= 240 && y <= 242 ? [60, 40, 40, 255] : null))
  assert.equal(findMouth(blank, guess, 300), null)
})

test('gate: 交给工作台的框把眼睛放大一圈、给张嘴留出地方，过得了工作台的检查', () => {
  const r = framesFrom({ eyes: [[300, 230, 360, 270], [430, 225, 490, 265]], mouth: [385, 320, 425, 326], d: 130 }, 832, 1216)
  assert.equal(r.eyes.length, 2)
  assert.ok(r.eyes[0][2] - r.eyes[0][0] >= 60 * 1.25 - 0.01)
  const [m] = r.mouth
  assert.ok(m[3] - m[1] >= 130 * 0.28 - 0.01, '嘴框至少 0.28 个眼距高')
  assert.ok(m[1] >= Math.max(r.eyes[0][3], r.eyes[1][3]), '嘴框不压到眼睛框')
  assert.doesNotThrow(() => cleanRects(r, 832, 1216))
})

test('gate: 大模型的结果：丢掉框住整块取景的，合起来的眼睛框换成单只的或从中间劈开，嘴要在眼睛下面才算', () => {
  const view = [0, 0, 768, 768]
  const g = readGrounding([
    { label: 'face', box: [1, 1, 767, 767] }, // 找不到时给的整块
    { label: 'eyes', box: [200, 260, 560, 380] }, // 两眼合起来
    { label: 'eyes', box: [204, 300, 325, 380] },
    { label: 'eyes', box: [427, 266, 561, 328] },
    { label: 'mouth', box: [354, 467, 445, 499] },
  ], view)
  assert.equal(g.face, null)
  assert.deepEqual(g.eyes, [[204, 300, 325, 380], [427, 266, 561, 328]])
  assert.equal(g.mouths.length, 1)
  const split = readGrounding([{ label: 'eyes', box: [200, 500, 540, 560] }], view)
  assert.equal(split.eyes.length, 2)
  assert.ok(split.eyes[0][2] < split.eyes[1][0], '劈开的两只中间留缝')
  const eyes = [[300, 300, 340, 320], [400, 300, 440, 320]]
  assert.ok(plausibleMouth([350, 370, 390, 390], eyes))
  assert.ok(!plausibleMouth([150, 370, 190, 390], eyes), '偏到一边的不是嘴')
  assert.ok(!plausibleMouth([350, 250, 390, 270], eyes), '在眼睛上面的不是嘴')
  assert.deepEqual(squareAround([0, 0, 100, 50], 1), [0, -25, 100, 75])
})

test('gate: 自动框——小模型认准了就不用大模型；没认出脸时请大模型找脸、眼睛、嘴（furry、兽头）', async () => {
  const img = image(832, 1216)
  const calls = []
  // 小模型：脸 0.9，两只眼睛
  const good = async (model, box) => {
    calls.push(model)
    if (model === 'face') return [{ box: [280, 150, 540, 410], score: 0.9 }]
    if (model === 'eye') return [{ box: [320, 240, 370, 275], score: 0.8 }, { box: [440, 236, 490, 271], score: 0.8 }]
    return []
  }
  const grounds = []
  const ground = async (view, phrase) => { grounds.push(phrase); return [] }
  const r = await autoFrame(img, good, { ground })
  assert.equal(r.confidence, 'mid') // 纯色图上找不到嘴线，嘴按位置估
  assert.deepEqual(grounds, [], '小模型认准了不叫大模型')
  assert.equal(r.rects.eyes.length, 2)
  assert.deepEqual(calls, ['face', 'eye'])

  // 兽头：小模型什么都没认出，大模型找到脸，再找到眼睛和嘴
  const none = async () => []
  const furry = async (view, phrase) => {
    grounds.push(phrase)
    if (phrase === 'face') return [{ label: 'face', box: [250, 40, 600, 420] }]
    return [{ label: 'eyes', box: [330, 200, 380, 235] }, { label: 'eyes', box: [470, 202, 520, 236] }, { label: 'mouth', box: [370, 300, 480, 340] }]
  }
  grounds.length = 0
  const f = await autoFrame(img, none, { ground: furry })
  assert.deepEqual(grounds, ['face', 'eyes and mouth'])
  assert.equal(f.big, true)
  assert.equal(f.confidence, 'high')
  assert.ok(f.notes.includes('大模型找到了嘴'))
  near(centerOf(f.rects.mouth[0])[0], 425, 2, '嘴框跟着大模型找到的嘴')
  // 没有大模型、什么都没认出：回 null（让人手动框一张，其它的跟着找）
  assert.equal(await autoFrame(img, none), null)
  // 精细模式：小模型认准了也请大模型找嘴
  grounds.length = 0
  await autoFrame(img, good, { ground, fine: true })
  assert.deepEqual(grounds, ['eyes and mouth'])
  // 大模型把口鼻部整个当成嘴（框到了鼻子），图上有一条闭着的嘴线：框的上边收到嘴线上方，鼻子不重画
  const lined = image(832, 1216, undefined, (x, y) => (y >= 338 && y <= 340 && x >= 392 && x <= 420 ? [120, 60, 60, 255] : null))
  const muzzle = async () => [{ label: 'mouth', box: [360, 290, 450, 380] }]
  const m = await autoFrame(lined, good, { ground: muzzle, fine: true })
  const [mx0, my0, , my1] = m.rects.mouth[0]
  assert.ok(m.notes.includes('大模型找到了嘴'))
  assert.ok(my0 > 310 && my0 < 338 && my1 > 340, `嘴框收到嘴线上方：${m.rects.mouth[0]}`)
  assert.ok(mx0 <= 360, '左右照大模型的框')
})

test('gate: 同一角色跟随：照参考图上框好的脸，在挪了位置的另一张里找到同一张脸', () => {
  // 有纹理的「脸」：一块图案，参考图里在 (300, 200)，另一张挪到 (324, 216)
  const pattern = (x, y) => [(x * 37 + y * 11) % 200 + 30, (x * 13 + y * 29) % 180 + 40, (x * 7 + y * 53) % 160 + 50, 255]
  const draw = (ox, oy) => image(832, 1216, [255, 255, 255, 0], (x, y) => (x >= ox && x < ox + 240 && y >= oy && y < oy + 200 ? pattern(x - ox, y - oy) : null))
  const ref = draw(300, 200)
  const img = draw(324, 216)
  const rects = { eyes: [[340, 260, 390, 290], [440, 260, 490, 290]], mouth: [[400, 330, 440, 350]] }
  const f = followFrame(ref, rects, img)
  assert.ok(f.score > 0.9, '同一张脸相似度要高：' + f.score)
  for (const [a, b] of [[f.rects.eyes[0], rects.eyes[0]], [f.rects.mouth[0], rects.mouth[0]]]) {
    near(a[0] - b[0], 24, 3, '横着挪了 24')
    near(a[1] - b[1], 16, 3, '竖着挪了 16')
  }
})
