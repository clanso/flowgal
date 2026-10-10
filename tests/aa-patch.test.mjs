import test from 'node:test'
import assert from 'node:assert/strict'
import { cleanPatch, rgbToLab, labToRgb } from '../lib/aa-patch.js'
import { composePrompt } from '../lib/image/style.js'
import { poseOf, anchorOf } from '../lib/face.js'
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

test('gate: 侧身动作组：底图整张按侧身构图画，同组表情在它上面换脸；正面的照旧', () => {
  assert.equal(poseOf('pout'), 'side')
  assert.equal(anchorOf('side'), 'pout')
  assert.equal(poseOf('cold'), 'arms', '别的情绪不动')
  const person = { gender: 'female', appearance: '1girl, long black hair, blue eyes', appearanceFields: {}, outfitTags: 'school uniform', states: [] }
  const config = { images: { backend: 'novelai', transparentSprites: true }, novelai: { model: 'nai-diffusion-5-full' }, style: {} }
  const side = composePrompt({ kind: 'sprite', tags: 'pout, puffed cheeks, looking at viewer', person, emotion: 'pout', backend: 'novelai', config, pose: 'side' })
  assert.match(side.positive, /from side, profile, looking to the side/)
  assert.doesNotMatch(side.positive, /facing viewer|looking at viewer|straight-on/)
  assert.match(side.characters[0], /from side, profile, looking to the side/)
  assert.doesNotMatch(side.characters[0], /looking at viewer|facing forward/)
  assert.doesNotMatch(side.negative, /\bfrom side\b|\bprofile\b|side view/)
  assert.match(side.characterNegatives[0], /looking at viewer, facing viewer/)
  const front = composePrompt({ kind: 'sprite', tags: 'smile', person, emotion: 'smile', backend: 'novelai', config })
  assert.match(front.positive, /facing viewer, looking at viewer, straight-on/)
  assert.match(front.negative, /from side, profile/)
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
