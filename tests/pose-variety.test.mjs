// 同一个情绪画在几个动作上，动作要真的不一样：
//  - 每个动作各用一个种子（第一个动作用这个人自己的种子，别的动作按编号错开一个固定的；同一个动作里的表情种子一样）；
//  - 照动作画的立绘，动作的身体 tag 提到角色块最前面、加重（设置里能调权重、能关掉分种子）；
//  - 自由画的、玩家自己写词的不提前（它们的身体是自己的）。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { poseSeed } from '../lib/poses.js'
import { spriteCharacterTags, composePrompt, handClash } from '../lib/image/style.js'
import { cleanActing } from '../lib/acting.js'
import { tagReport } from '../lib/sprites.js'
import { resolveConfig, POSE_WEIGHT } from '../lib/config.js'
import { variantKey } from '../lib/look.js'
import { encodePng } from '../lib/image/png.js'
import { createStore } from '../lib/dsh/store.js'
import { createEngine } from '../lib/engine.js'
import { roleText, userText } from './roles.mjs'

const SHEET = {
  read: '嘴硬心软的学生会长。',
  poses: [
    { id: 'p1', label: '背手站着', desc: '背着手站得笔直', tags: 'hands behind back', kind: 'self', emotions: ['neutral', 'smile', 'sad'] },
    { id: 'p2', label: '抱着胳膊别过脸', desc: '嘴硬的时候', tags: 'arms crossed, head turned away', kind: 'self', emotions: ['pout', 'sad'] },
    { id: 'p3', label: '抱膝坐着', desc: '一个人难过的时候', tags: 'sitting, hugging own legs', kind: 'self', emotions: ['sad'] },
  ],
  faces: [{ emotion: 'sad', desc: '眼眶红了', tags: 'sad, teary eyes' }],
}

test('gate: 动作的种子：第一个动作用这个人的种子，别的动作各错开一个固定的；随机种子、没分动作的不动', () => {
  const sheet = { poses: SHEET.poses }
  assert.equal(poseSeed(7, sheet, 'p1'), 7, '第一个动作（登场立绘那个）不变')
  const s2 = poseSeed(7, sheet, 'p2'), s3 = poseSeed(7, sheet, 'p3')
  assert.notEqual(s2, 7)
  assert.notEqual(s3, 7)
  assert.notEqual(s2, s3, '不同动作不同种子')
  assert.equal(poseSeed(7, sheet, 'p2'), s2, '同一个动作每次一样（重画、同动作的表情都同一个种子）')
  assert.ok(Number.isInteger(s2) && s2 >= 0 && s2 < 2 ** 31)
  assert.notEqual(poseSeed(8, sheet, 'p2'), s2, '跟着这个人的种子走')
  assert.equal(poseSeed(2 ** 31 - 1, sheet, 'p3') < 2 ** 31, true)
  assert.equal(poseSeed(-1, sheet, 'p2'), -1, '随机种子照旧随机')
  assert.equal(poseSeed(undefined, sheet, 'p2'), undefined)
  assert.equal(poseSeed(7, sheet, ''), 7, '没分动作')
  assert.equal(poseSeed(7, null, 'p2'), 7)
})

test('gate: 照动作画的立绘：动作的身体 tag 排在角色块最前面、加重，设计师写的同样的词不重复，构图词照样去掉；1 = 只提前', () => {
  const person = { appearance: '1girl, long black hair, blue eyes', gender: 'female' }
  const tags = '1girl, long black hair, school uniform, sad, teary eyes, sitting, cowboy shot'
  const pose = { tags: 'sitting, hugging own legs, cowboy shot, simple background', weight: 1.3 }
  const lifted = spriteCharacterTags(person, tags, 'sad', { soften: false, pose })
  assert.match(lifted, /^1\.3::sitting::, 1\.3::hugging own legs::, long black hair, blue eyes/)
  assert.equal(lifted.split(', ').filter(t => /sitting/.test(t)).length, 1, '设计师写过的 sitting 不再重复')
  assert.doesNotMatch(lifted, /cowboy shot|simple background/, '构图、背景归插件管')
  assert.equal(spriteCharacterTags(person, tags, 'sad', { soften: false, pose: { ...pose, weight: 1 } }).split(', ').slice(0, 2).join(', '), 'sitting, hugging own legs', '权重 1：只提前不加重')
  assert.equal(spriteCharacterTags(person, tags, 'sad', { soften: false, pose: { tags: '1.5::sitting::', weight: 1.2 } }).split(', ')[0], '1.2::sitting::', '动作里自己写了权重的，按设置的权重')
  assert.doesNotMatch(spriteCharacterTags(person, tags, 'sad', { soften: false }), /::/, '不照动作画的不变')

  const cfg = resolveConfig({ images: { backend: 'novelai' } })
  const nai = composePrompt({ kind: 'sprite', tags, person, emotion: 'sad', backend: 'novelai', config: cfg, soften: false, pose })
  assert.match(nai.characters[0], /^girl, 1\.3::sitting::, 1\.3::hugging own legs::/, 'NovelAI：角色块最前面（性别词插件补在开头）')
  assert.doesNotMatch(nai.characters[0], /\bstanding\b/, '坐着的动作：构图词里的 standing 拿掉')
  const standing = composePrompt({ kind: 'sprite', tags, person, emotion: 'sad', backend: 'novelai', config: cfg, soften: false, pose: { tags: 'arms crossed', weight: 1.3 } })
  assert.match(standing.characters[0], /^girl, 1\.3::arms crossed::, .*, sitting, .*\bcowboy shot\b/, '设计师写了 sitting 也算')
  assert.doesNotMatch(standing.characters[0], /\bstanding\b/)
  const plain = composePrompt({ kind: 'sprite', tags: '1girl, smile', person, emotion: 'smile', backend: 'novelai', config: cfg, soften: false, pose: { tags: 'hands behind back', weight: 1.3 } })
  assert.match(plain.characters[0], /\bstanding\b/, '站着的照旧带 standing')
  const sd = composePrompt({ kind: 'sprite', tags, person, emotion: 'sad', backend: 'webui', config: resolveConfig({ images: { backend: 'webui' } }), soften: false, pose })
  assert.match(sd.positive, /\(sitting:1\.3\), \(hugging own legs:1\.3\)/, 'WebUI：换成 (tag:1.3)')
})

test('gate: 动作写了手怎么放（指尖轻掩唇边）：设计师另写的手（按着胸口、握着手腕）跟动作打架，拿掉；臂环手套这些不算；动作没写手时照留', () => {
  // 玩家贴出来的那张「哀」：动作是「指尖轻掩唇边」，设计师写的手却是按着胸口
  const person = { appearance: '1girl, 0.7::brest_(azur_lane)::, alternate hairstyle, blonde hair, green eyes, 0.8::tareme::, large breasts, mature, elf, pointy ears, very long hair', gender: 'female' }
  const raw = '1girl, 0.7::brest_(azur_lane)::, girl, alternate hairstyle, blonde hair, green eyes, 0.8::tareme::, large breasts, mature, alternate costume, elf, pointy ears, very long hair, white robe, loose flowing robe, long sleeves, pale lavender sash, robe neatly closed, mithril chain necklace, glowing white gemstone pendant, monster girl, scylla, pale tentacles with faint purple markings, sad, faint sad smile, drooping eyebrows, eyebrows drawn together, half-closed eyes, closed mouth, looking down, hand on own chest, other hand holding own wrist, shoulders slightly drawn in, slight head tilt'
  const pose = { tags: 'fingertips on lips, hand to own mouth', weight: 1.3 }
  const sent = spriteCharacterTags(person, raw, 'sad', { pose })
  assert.match(sent, /^1\.3::fingertips on lips::, 1\.3::hand to own mouth::, /, '动作的手排最前、加重')
  assert.doesNotMatch(sent, /hand on own chest|holding own wrist/, '跟动作打架的手拿掉')
  assert.match(sent, /sad, faint sad smile, drooping eyebrows.*shoulders slightly drawn in, slight head tilt/, '表情、肩、头照留')
  assert.match(spriteCharacterTags(person, raw, 'sad', { pose: { tags: 'sitting', weight: 1.3 } }), /hand on own chest, other hand holding own wrist/, '动作没写手：设计师写的手照留')
  assert.match(spriteCharacterTags(person, raw, 'sad'), /hand on own chest/, '不照动作画的不变')
  const clash = handClash({ tags: 'arms crossed' })
  assert.deepEqual(['hand on own cheek', 'arm warmers', 'white gloves', 'bandaged arm', 'arms crossed', 'crossed arms', 'clenched fist', 'shoulders drawn in'].map(clash), [true, false, false, false, false, true, true, false])
  assert.equal(handClash(null)('hand on own chest'), false)
  // 导演日志里说清为什么拿掉
  const report = tagReport(raw, { emotion: 'sad', pose: { label: '指尖轻掩唇边' } }, person, [], pose)
  assert.deepEqual(report.removed.filter(r => /动作/.test(r.why)).map(r => r.tag), ['hand on own chest', 'other hand holding own wrist'])
  assert.match(report.removed[report.removed.length - 1].why, /手照动作「指尖轻掩唇边」画/)
})

test('gate: 动作的身体 tag 里写指尖、手腕、手掌的（fingertips on lips）不当成脸上的表情删掉', () => {
  const sheet = cleanActing({ poses: [{ id: 'p1', label: '指尖轻掩唇边', tags: 'fingertips on lips, palm on own cheek, thumb on lips, hand on own wrist, closed eyes, smile', emotions: ['neutral'] }] })
  assert.equal(sheet.poses[0].tags, 'fingertips on lips, palm on own cheek, thumb on lips, hand on own wrist', '手留着，脸上的表情照样去掉')
})

test('gate: 设置：每个动作各用一个种子默认开、动作词加重默认 1.3，能调能关，超出范围夹回来', () => {
  const d = resolveConfig({})
  assert.equal(d.images.poseSeeds, true)
  assert.equal(d.images.poseWeight, 1.3)
  assert.deepEqual(POSE_WEIGHT, [0.1, 5])
  const set = resolveConfig({ images: { poseSeeds: false, poseWeight: 2.456 } })
  assert.equal(set.images.poseSeeds, false)
  assert.equal(set.images.poseWeight, 2.46)
  assert.equal(resolveConfig({ images: { poseWeight: 99 } }).images.poseWeight, 5)
  assert.equal(resolveConfig({ images: { poseWeight: 0 } }).images.poseWeight, 0.1)
  assert.equal(resolveConfig({ images: { poseWeight: 'x' } }).images.poseWeight, 1.3)
})

const W = 256, H = 384
function solid(width, height, [r, g, b]) {
  const data = new Uint8Array(width * height * 4)
  for (let i = 0; i < data.length; i += 4) { data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = 255 }
  return { width, height, data }
}
function fakeNai() {
  const requests = []
  const fetchImpl = async (url, init) => {
    const body = JSON.parse(init.body)
    requests.push(body)
    const { width, height } = body.parameters
    return new Response(await encodePng(solid(width, height, [0, 0, 255])), { status: 200, headers: { 'content-type': 'image/png' } })
  }
  return { requests, fetchImpl }
}
const fakeTavern = () => ({
  apiVersion: 1,
  async attach() { return { id: 'm1' } }, async update() {}, async remove() {}, async list() { return [] },
  async getTurn() { return null },
  async getCardContext() { return { description: '林岚：黑长直的学生会长。', personality: '', scenario: '', lore: [] } },
  async backgroundModel() { return { provider: 'fake', model: 'fake-1' } },
})
function fakeLlm(answer) {
  const calls = []
  return { calls, stream(request) { calls.push(request); const text = answer(request); return (async function* () { yield { type: 'text-delta', text }; yield { type: 'finish', reason: { kind: 'stop' } } })() } }
}
const isActing = request => roleText(request).includes('你是视觉小说的角色表演设计师')
const isSprite = request => roleText(request).includes('立绘设计师')
/** 假立绘设计师：跟真的一样，动作的词写在最后（以前发出去就是这样，动作压不过种子）。 */
function spriteReply(request) {
  const lines = [...userText(request).matchAll(/^- (s\d+)：(.*)$/gm)]
  return JSON.stringify({ sprites: lines.map(([, id]) => ({ key: id, tags: '1girl, long black hair, school uniform, sad, teary eyes' })) })
}
async function until(engine, gameId, done, what = '') {
  const end = Date.now() + 30000
  for (;;) {
    const lin = (await engine.gameView(gameId)).cast.find(p => p.name === '林岚')
    if (lin && done(lin)) return lin
    if (Date.now() > end) throw new Error('等太久：' + what + ' ' + JSON.stringify(lin?.spriteStatus))
    await new Promise(r => setTimeout(r, 20))
  }
}
const look = { appearance: '1girl, long black hair', outfit: '', states: [] }

test('gate: 同一个情绪在三个动作上：各用各的种子，动作词排最前加重；关掉分种子、权重调成 1 照设置画；玩家自己写的词不提前', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'flowgal-variety-'))
  try {
    const store = createStore(dir)
    const llm = fakeLlm(request => (isActing(request) ? JSON.stringify(SHEET) : isSprite(request) ? spriteReply(request) : '{}'))
    const nai = fakeNai()
    const requests = nai.requests
    const engine = createEngine({ store, services: { tavern: fakeTavern(), llm }, fetchImpl: nai.fetchImpl, logger: { warn() {}, info() {} } })
    try {
      await engine.patchConfig({ images: { faceSwap: false, faceSwapPicked: true, auto: false, backgrounds: false, sizes: { portrait: [W, H] } } })
      await engine.setSecret('novelai', 'official', 'k')
      await engine.castAction('g', 'save', { name: '林岚', patch: { appearance: '1girl, long black hair', gender: 'female', seed: 7 } })
      await engine.castAction('g', 'acting-design', { name: '林岚' })
      await until(engine, 'g', p => p.acting && !p.actingBusy, '设计')
      const keys = [variantKey(look, 'sad'), variantKey(look, 'sad', 'p2'), variantKey(look, 'sad', 'p3')]
      const settled = (p, n) => requests.length >= n && keys.every(k => p.sprites[k]?.assetId && !p.spriteStatus[k])
      await engine.castAction('g', 'sprite', { name: '林岚', emotions: ['sad', 'sad@p2', 'sad@p3'], rewrite: false })
      let lin = await until(engine, 'g', p => settled(p, 3), '三个动作各画一张')
      const caption = r => r.parameters.v4_prompt.caption.char_captions[0].char_caption
      const byPose = Object.fromEntries(requests.slice(0, 3).map(r => [/hands behind/.test(caption(r)) ? 'p1' : /arms crossed/.test(caption(r)) ? 'p2' : 'p3', r]))
      const sheet = { poses: lin.acting.poses }
      assert.deepEqual(Object.keys(byPose).sort(), ['p1', 'p2', 'p3'])
      assert.equal(byPose.p1.parameters.seed, 7, '第一个动作用这个人的种子')
      assert.equal(byPose.p2.parameters.seed, poseSeed(7, sheet, 'p2'))
      assert.equal(byPose.p3.parameters.seed, poseSeed(7, sheet, 'p3'))
      assert.equal(new Set(Object.values(byPose).map(r => r.parameters.seed)).size, 3, '三个动作三个种子')
      assert.match(caption(byPose.p1), /^girl, 1\.3::hands behind back::, long black hair/)
      assert.match(caption(byPose.p2), /^girl, 1\.3::arms crossed::, 1\.3::head turned away::, long black hair/)
      assert.match(caption(byPose.p3), /^girl, 1\.3::sitting::, 1\.3::hugging own legs::, long black hair/)
      assert.doesNotMatch(caption(byPose.p3), /\bstanding\b/, '坐着的不再被 standing 拉回站着')
      assert.equal(lin.sprites[keys[1]].seed, poseSeed(7, sheet, 'p2'), '存下来的种子就是这个动作的')

      // 关掉分种子、权重调成 1：都用这个人的种子，动作词只提前不加重
      await engine.patchConfig({ images: { poseSeeds: false, poseWeight: 1 } })
      await engine.castAction('g', 'sprite', { name: '林岚', emotion: 'sad@p2', rewrite: false })
      lin = await until(engine, 'g', p => settled(p, 4), '照设置重画')
      assert.equal(requests[3].parameters.seed, 7)
      assert.match(caption(requests[3]), /^girl, arms crossed, head turned away, long black hair/)

      // 玩家自己写的词：照写的画，不提前动作的词；种子还是这个动作的
      await engine.patchConfig({ images: { poseSeeds: true, poseWeight: 1.3 } })
      await engine.castAction('g', 'sprite', { name: '林岚', emotion: 'sad@p3', tags: '1girl, long black hair, lying on bed, sad', rewrite: false })
      lin = await until(engine, 'g', p => settled(p, 5) && lin.sprites[keys[2]].writer !== p.sprites[keys[2]].writer, '玩家写的')
      assert.equal(lin.sprites[keys[2]].writer, 'user')
      assert.doesNotMatch(caption(requests[4]), /::sitting::|hugging own legs/)
      assert.equal(requests[4].parameters.seed, poseSeed(7, sheet, 'p3'))
    } finally { engine.dispose() }
  } finally {
    await rm(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 })
  }
})
