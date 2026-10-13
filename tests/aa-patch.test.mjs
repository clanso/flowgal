import test from 'node:test'
import assert from 'node:assert/strict'
import { cleanPatch, rgbToLab, labToRgb } from '../lib/aa-patch.js'
import { composePrompt } from '../lib/image/style.js'
import { poseOf } from '../lib/face.js'
import { POSES } from '../lib/vocab.js'
import { createActor, fitBlink, fitTalk, blinkSteps } from '../lib/aa-motion.js'

/** 造一张图：皮肤底，一块浅灰蓝的虹膜，左上一缕偏黄的刘海。 */
const SKIN = [246, 214, 208], IRIS = [190, 203, 221], HAIR = [221, 174, 150]
function picture(w, h, paint) {
  const data = new Uint8ClampedArray(w * h * 4)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const c = paint(x, y)
    data.set([...c, 255], (y * w + x) * 4)
  }
  return { width: w, height: h, data }
}
const at = (img, x, y) => Array.from(img.data.slice((y * img.width + x) * 4, (y * img.width + x) * 4 + 4))

test('gate: Lab 来回转颜色不变', () => {
  for (const c of [SKIN, IRIS, HAIR, [0, 0, 0], [255, 255, 255], [120, 60, 50]]) {
    assert.deepEqual(labToRgb(...rgbToLab(...c)), c)
  }
})

test('gate: 洗贴片：只留变了的像素；虹膜颜色拉回原图；刘海用原图；嘴不分类、暗处不被压黑', () => {
  const W = 96, H = 64
  const iris = (x, y) => (x - 48) ** 2 + (y - 36) ** 2 < 14 ** 2
  const hair = (x, y) => x < 22 && y < 30
  const base = picture(W, H, (x, y) => (hair(x, y) ? HAIR : iris(x, y) ? IRIS : SKIN))
  // 重画：虹膜变深变蓝（半闭眼的通病），上半个眼睛盖上眼皮（皮肤色），刘海也被改了几笔，整体偏暗一点
  const gen = picture(W, H, (x, y) => {
    if (hair(x, y)) return x % 3 ? [200, 150, 130] : [120, 80, 70]
    if (iris(x, y)) return y < 34 ? [236, 204, 198] : [130, 148, 167]
    return [240, 208, 202]
  })
  const p = cleanPatch(base, gen, [[8, 8, 88, 60]], { classes: true, keepHair: true })
  assert.deepEqual([p.x, p.y, p.width, p.height], [8, 8, 80, 52])
  const px = (x, y) => at(p, x - p.x, y - p.y)
  assert.equal(px(80, 50)[3], 0, '没变的皮肤不用重画的（透明，露出原图）')
  assert.equal(px(12, 12)[3], 0, '刘海用原图')
  const lower = px(48, 44)
  assert.ok(lower[3] > 200, '虹膜下半（变了）用重画的')
  assert.ok(Math.abs(lower[0] - IRIS[0]) < 25 && Math.abs(lower[2] - IRIS[2]) < 25, '虹膜颜色拉回原图：' + lower)
  // 嘴：不分类时颜色只补整体偏色，暗的地方不会被压黑
  const lips = picture(40, 16, (x, y) => (y === 8 && x > 8 && x < 32 ? [120, 60, 50] : SKIN))
  const open = picture(40, 16, (x, y) => (y >= 6 && y <= 10 && x > 10 && x < 30 ? [150, 70, 70] : SKIN))
  const m = cleanPatch(lips, open, [[0, 0, 40, 16]], { classes: false })
  const inside = at(m, 20, 8)
  assert.ok(Math.abs(inside[0] - 150) < 6 && inside[3] > 200, '嘴里的颜色保持：' + inside)
})

test('gate: 腮红跟头发同色时，闭眼不留原来的下睫毛；青绿色的眼睛算虹膜，颜色拉回原图、不会更艳', () => {
  const W = 96, H = 64
  const BLUSH = [221, 174, 164] // 跟头发一个颜色（真实遇到的：浅米粉的头发 + 明显的腮红）
  const AQUA = [140, 215, 200], LASH = [90, 50, 40]
  const iris = (x, y) => (x - 48) ** 2 + (y - 32) ** 2 < 11 ** 2
  const base = picture(W, H, (x, y) => (y === 46 && x % 4 < 2 && x > 30 && x < 66 ? LASH : y > 42 ? BLUSH : iris(x, y) ? AQUA : SKIN))
  // 闭眼：眼线画在中间，下面整片是腮红（原来的下睫毛没了）
  const closed = picture(W, H, (x, y) => (y >= 30 && y <= 33 && x > 26 && x < 70 ? LASH : y > 42 ? BLUSH : SKIN))
  const c = cleanPatch(base, closed, [[16, 12, 80, 56]], { classes: true, keepHair: true })
  const dot = at(c, 32 - c.x, 46 - c.y)
  assert.ok(dot[3] > 200 && dot[0] > 180, '原来的下睫毛被盖掉了：' + dot)
  // 半闭：重画的虹膜更深更艳，洗完往原图拉回
  const half = picture(W, H, (x, y) => (iris(x, y) ? (y < 28 ? SKIN : [40, 200, 185]) : y > 42 ? BLUSH : SKIN))
  const h = cleanPatch(base, half, [[16, 12, 80, 56]], { classes: true, keepHair: true })
  const px = at(h, 48 - h.x, 36 - h.y)
  const [, ga, gb] = rgbToLab(40, 200, 185), [, ba, bb] = rgbToLab(...AQUA), [, oa, ob] = rgbToLab(px[0], px[1], px[2])
  assert.ok(Math.hypot(oa, ob) <= Math.hypot(ga, gb) + 1, '没有更艳')
  assert.ok(Math.hypot(oa - ba, ob - bb) < Math.hypot(ga - ba, gb - bb), '比重画的更接近原图的青绿：' + px)
})

test('gate: 侧身动作组去掉了：赌气归抱臂那组，立绘都按正面构图画（以前标着侧身的也一样）', () => {
  assert.equal(poseOf('pout'), 'arms')
  assert.equal(poseOf('cold'), 'arms', '别的情绪不动')
  assert.ok(!('side' in POSES))
  assert.equal(poseOf('pout', [], { pout: 'side' }), 'arms', '设置里存过的「侧身」不认，回到默认分组')
  const person = { gender: 'female', appearance: '1girl, long black hair, blue eyes', appearanceFields: {}, outfitTags: 'school uniform', states: [] }
  const config = { images: { backend: 'novelai', transparentSprites: true }, novelai: { model: 'nai-diffusion-5-full' }, style: {} }
  const pout = composePrompt({ kind: 'sprite', tags: 'pout, puffed cheeks, looking at viewer', person, emotion: 'pout', backend: 'novelai', config, pose: 'side' })
  assert.doesNotMatch(pout.positive + pout.characters[0], /from side|profile/)
  assert.match(pout.positive, /facing viewer, looking at viewer, straight-on/)
  assert.equal(pout.characterNegatives[0], '', '负面只用画风里带的，插件不自己加')
})

test('gate: 精简版（只有闭眼和一个张嘴）：眨眼是睁 → 闭 → 睁，连眨中间整个睁开；嘴在闭和开之间来回', () => {
  const lite = { version: 2, size: [832, 1216], default_pose: 'front', poses: { front: { base: 'b.webp', parts: { eyes: { closed: { file: 'c.png', x: 0, y: 0 } }, mouth: { half: { file: 'h.png', x: 0, y: 0 } } } } } }
  const blink = fitBlink(undefined, new Set(['closed']))
  assert.deepEqual(blinkSteps(blink).map(s => [s.eyes, s.ms]), [['closed', 110]])
  assert.deepEqual(blinkSteps(blink, { double: true }).map(s => s.eyes), ['closed', 'open', 'closed'])
  const talk = fitTalk(undefined, new Set(['half']))
  assert.ok(Object.values(talk.shapes).every(lv => Object.values(lv).every(s => s === 'half' || s === 'closed')), '只用有的那个张嘴（低语的鼻音本来就闭嘴）')
  assert.equal(talk.release.half, 'closed')
  const a = createActor(lite, { seed: 'l', now: 0 })
  a.say({ chars: Array.from('今天天气真不错我们走吧'), times: Array.from({ length: 11 }, (_, i) => i * 30), gap: 30, mouth: 'loop', marks: [] }, 100)
  const seen = new Set()
  let eyes = new Set()
  for (let t = 100; t < 20000; t += 10) { const f = a.frame(t); seen.add(f.mouth); eyes.add(f.eyes) }
  assert.deepEqual([...seen].sort(), ['closed', 'half'])
  assert.deepEqual([...eyes].sort(), ['closed', 'open'])
  // 完整版不受影响
  const full = fitBlink(undefined, new Set(['half', 'closed']))
  assert.deepEqual(blinkSteps(full).map(s => s.eyes), ['half', 'closed', 'half'])
})
