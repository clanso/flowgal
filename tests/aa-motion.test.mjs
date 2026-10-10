import test from 'node:test'
import assert from 'node:assert/strict'
import { planLine } from '../lib/typing.js'
import { visemeOf, mouthTrack, mouthOnTrack, blinkSteps, turnSteps, turnFrames, stepsDuration, createActor, motionLayers, turnWaitMs, MOTION_DEFAULTS } from '../lib/aa-motion.js'
import { cleanPack, packFiles, packWithAssets, packStill } from '../lib/aa-sprite.js'
import { normalizeScript } from '../lib/director.js'
import { segmentTurn } from '../lib/segment.js'
import { buildBeats } from '../src/client/theater/playback.js'

// 跟 D:\逆转裁判立绘 那套和服少女 v2 素材包同样的结构（文件名是假的，节奏用默认值）
const part = (file, x, y) => ({ file, x, y })
const RAW = {
  version: 2,
  name: '和服少女',
  size: [832, 1216],
  default_pose: 'front',
  poses: {
    front: { label: '正面', base: 'front.webp', parts: {
      eyes: { lower: part('f_el.png', 320, 200), half: part('f_eh.png', 320, 200), closed: part('f_ec.png', 320, 200) },
      mouth: { narrow: part('f_mn.png', 392, 312), half: part('f_mh.png', 392, 312), open: part('f_mo.png', 392, 312), round: part('f_mr.png', 392, 312) },
    } },
    side: { label: '侧头', base: 'side.webp', parts: {
      eyes: { lower: part('s_el.png', 296, 216), half: part('s_eh.png', 296, 216), closed: part('s_ec.png', 296, 216) },
      mouth: { narrow: part('s_mn.png', 336, 304), half: part('s_mh.png', 336, 304), open: part('s_mo.png', 336, 304), round: part('s_mr.png', 336, 304) },
    } },
  },
  turns: { 'front>side': ['turn_mid.webp'] },
}
const pack = cleanPack(RAW)
const talkOf = (text, opts = {}, speed = 30) => {
  const chars = Array.from(text)
  const p = planLine(chars, speed, { seed: 'k', ...opts })
  return { chars, times: p.times, gap: p.gap, mouth: p.mouth, marks: p.marks }
}

test('gate: v2 素材包检查：姿势、贴片、转头、节奏补默认值；文件、静止图、换素材编号', () => {
  assert.equal(pack.version, 2)
  assert.deepEqual(Object.keys(pack.poses), ['front', 'side'])
  assert.deepEqual(pack.blink, MOTION_DEFAULTS.blink)
  assert.deepEqual(pack.talk.shapes, MOTION_DEFAULTS.talk.shapes)
  assert.equal(packStill(pack), 'front.webp')
  const files = packFiles(pack)
  assert.equal(files.length, 2 + 14 + 1)
  const stored = packWithAssets(pack, Object.fromEntries(files.map(f => [f, 'id-' + f])))
  assert.equal(packStill(stored), 'id-front.webp')
  assert.deepEqual(stored.turns['front>side'], ['id-turn_mid.webp'])
  assert.equal(stored.poses.side.parts.mouth.round.file, 'id-s_mr.png')
  // 不合法的写法说清哪一项不对
  assert.throws(() => cleanPack({ ...RAW, poses: { front: { base: '../x.png' } } }), /文件名不对/)
  assert.throws(() => cleanPack({ ...RAW, poses: { ...RAW.poses, front: { ...RAW.poses.front, parts: { eyes: { wink: part('a.png', 0, 0) } } } } }), /差分名不对/)
  assert.throws(() => cleanPack({ ...RAW, turns: { 'front>back': ['a.png'] } }), /转头写法不对/)
  assert.throws(() => cleanPack({ ...RAW, talk: { shapes: { normal: { A: 'scream' } } } }), /talk\.shapes\.normal\.A/)
  // 老的 v1 素材包照旧
  const v1 = cleanPack({ size: [10, 10], breath: { frames: ['a.webp'] }, parts: {} })
  assert.equal(packStill(v1), 'a.webp')
})

test('gate: 口型类：假名、字母按元音，标点不发声，同一个汉字永远同一类、比例不偏', () => {
  assert.deepEqual(['か', 'し', 'ん', 'o', 'M', '，', 'ー'].map(visemeOf), ['A', 'I', 'N', 'O', 'N', null, ''])
  assert.equal(visemeOf('我'), visemeOf('我'))
  const count = {}
  for (let c = 0x4e00; c < 0x4e00 + 3000; c += 1) { const v = visemeOf(String.fromCodePoint(c)); count[v] = (count[v] || 0) + 1 }
  assert.ok(count.A > 700 && count.A < 1100 && count.O > 250 && count.U > 250, JSON.stringify(count))
})

test('gate: 嘴：拍子落在出字时刻，一拍至少 95ms，标点闭嘴，嘴不会卡住不动', () => {
  const t = talkOf('这是一句很长很长的没有标点的台词用来看拍子是不是稳定的')
  const track = mouthTrack(pack.talk, t)
  for (let i = 1; i < track.length; i += 1) {
    const k = track[i]
    assert.ok(k.at - track[i - 1].at >= 30, '关键帧太密')
    assert.ok(t.times.includes(k.at) || pack.talk.release[track[i - 1].mouth] === k.mouth || k.mouth === 'closed', '关键帧来路不明：' + JSON.stringify(k))
  }
  const beats = track.filter(k => t.times.includes(k.at))
  assert.ok(beats.length >= 6 && beats.length <= 9, '拍数 ' + beats.length)
  assert.ok(Math.max(...track.slice(1).map((k, i) => k.at - track[i].at)) <= 100)
  const c = talkOf('你好，今天天气不错。')
  const tc = mouthTrack(pack.talk, c)
  assert.notEqual(mouthOnTrack(tc, 0), 'closed')
  assert.equal(mouthOnTrack(tc, c.times[2] + 100), 'closed') // 逗号停顿里
  assert.notEqual(mouthOnTrack(tc, c.times[3]), 'closed')
  assert.equal(mouthOnTrack(tc, c.times.at(-1) + 600), 'closed')
})

test('gate: 嘴跟着演法：威压一字一拍张大，低语只用齿缝，重音字开大一号', () => {
  const m = talkOf('你给我听好了', { say: 'menace' })
  const tm = mouthTrack(pack.talk, m)
  for (const at of m.times) assert.ok(tm.some(k => Math.abs(k.at - at) < 1), `${at}ms 那个字没开口`)
  assert.ok(tm.some(k => k.mouth === 'open'))
  const w = mouthTrack(pack.talk, talkOf('悄悄告诉你一件事情吧', { say: 'whisper' }))
  assert.ok(w.every(k => ['narrow', 'closed'].includes(k.mouth)), JSON.stringify(w))
  const s = talkOf('凶手就是你，林岚。', { stress: '就是你' })
  const ts = mouthTrack(pack.talk, s)
  assert.ok(['open', 'round'].includes(mouthOnTrack(ts, s.times[2] + 1)))
})

test('gate: 眨眼闭得快睁得慢、偶尔连眨；转头先闭眼、中间帧闭眼、到位才睁开，反方向倒着播', () => {
  const one = blinkSteps(pack.blink)
  assert.equal(one[0].eyes, 'lower')
  assert.equal(blinkSteps(pack.blink, { double: true }).filter(s => s.eyes === 'closed').length, 2)
  const steps = turnSteps(pack, 'front', 'side')
  const i = steps.findIndex(s => s.frame)
  assert.ok(i > 0 && steps.slice(0, i).some(s => s.eyes === 'closed' && s.pose === 'front'))
  assert.equal(steps.at(-1).pose, 'side')
  assert.notEqual(steps.at(-1).eyes, 'closed')
  assert.deepEqual(turnFrames(pack, 'side', 'front'), ['turn_mid.webp'])
  assert.equal(turnWaitMs(pack, 'front', 'side'), stepsDuration(steps) + 120)
  assert.equal(turnWaitMs(pack, 'front', 'front'), 0)
  assert.equal(turnWaitMs(pack, 'front', 'back'), 0)
})

test('gate: 演员：转头时不动嘴不眨眼、转完停在新姿势；说话嘴跟轨道；旁白不动嘴；换素材包接着原姿势', () => {
  const a = createActor(pack, { seed: 't', now: 0 })
  const d = a.turn('side', 1000)
  assert.ok(d > 0)
  const mid = a.frame(1000 + d / 2)
  assert.deepEqual([mid.mouth, mid.turning], ['closed', true])
  assert.equal(a.frame(1000 + d + 1).pose, 'side')
  assert.equal(a.turn('side', 5000), 0)
  const t = talkOf('我们走吧。')
  a.say(t, 6000)
  assert.notEqual(a.frame(6001).mouth, 'closed')
  assert.equal(a.frame(9000).mouth, 'closed')
  a.say({ ...t, type: 'narration' }, 10000)
  assert.equal(a.frame(10001).mouth, 'closed')
  const b = createActor(pack, { seed: 't', now: 0, pose: 'side' })
  assert.equal(b.frame(1).pose, 'side')
  // 一分钟待机：闭眼次数在设定间隔的范围里
  let n = 0
  let was = false
  const idle = createActor(pack, { seed: 'idle', now: 0 })
  for (let ms = 0; ms < 60000; ms += 16) { const c = idle.frame(ms).eyes === 'closed'; if (c && !was) n += 1; was = c }
  assert.ok(n >= 10 && n <= 35, '一分钟闭眼 ' + n)
  // 图层：姿势整图 + 眼 + 嘴；中间帧只画整图
  assert.deepEqual(motionLayers(pack, { pose: 'side', frame: null, eyes: 'half', mouth: 'round' }).map(l => l.file), ['side.webp', 's_eh.png', 's_mr.png'])
  assert.deepEqual(motionLayers(pack, { pose: 'side', frame: 'turn_mid.webp', eyes: 'closed', mouth: 'closed' }).map(l => l.file), ['turn_mid.webp'])
})

test('gate: 导演写朝向：只收 side / front；剧场按说话人记朝向，写 front 转回来，新一轮回正面', () => {
  const units = segmentTurn('“你怎么来了？”\n\n“……没什么。”\n\n“好吧，我说就是了。”')
  const raw = { scene: { location: '走廊' }, cast: [{ name: '林岚', pos: 'center' }], lines: [
    { u: 'U1', sp: '林岚', emo: 'surprised' },
    { u: 'U2', facing: 'side' }, // 同一人连着说，sp 省略
    { u: 'U3', facing: 'Front' },
  ] }
  const s = normalizeScript(raw, units)
  assert.equal(s.lines.U2.facing, 'side')
  assert.equal(s.lines.U3.facing, 'front')
  assert.equal(normalizeScript({ lines: [{ u: 'U1', sp: '林岚', facing: 'back' }] }, units).lines.U1.facing, undefined)
  const { beats } = buildBeats({ turns: [{ turn: 1, textVersion: 'v1', units, script: s }, { turn: 2, textVersion: 'v1', units, script: { ...s, lines: { U1: { sp: '林岚' } } } }] })
  assert.deepEqual(beats.slice(0, 3).map(b => b.facing['林岚'] || ''), ['', 'side', ''])
  assert.equal(beats[3].facing['林岚'], undefined)
})
