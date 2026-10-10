import test from 'node:test'
import assert from 'node:assert/strict'
import { planLine } from '../lib/typing.js'
import { visemeOf, mouthTrack, mouthOnTrack, blinkSteps, stepsDuration, createActor, motionLayers, MOTION_DEFAULTS } from '../lib/aa-motion.js'
import { cleanPack, packFiles, packWithAssets, packStill } from '../lib/aa-sprite.js'

// 跟 D:\逆转裁判立绘 那套和服少女 v2 素材包同样的结构（文件名是假的，节奏用默认值）；
// 还留着早期试做的侧头姿势和转头中间帧，用来测「导入时不收」
const part = (file, x, y) => ({ file, x, y })
const RAW = {
  version: 2,
  name: '和服少女',
  size: [832, 1216],
  default_pose: 'front',
  poses: {
    front: { label: '正面', base: 'front.webp', parts: {
      eyes: { half: part('f_eh.png', 320, 200), closed: part('f_ec.png', 320, 200) },
      mouth: { narrow: part('f_mn.png', 392, 312), half: part('f_mh.png', 392, 312), open: part('f_mo.png', 392, 312), round: part('f_mr.png', 392, 312) },
    } },
    side: { label: '侧头', base: 'side.webp', parts: {
      eyes: { half: part('s_eh.png', 296, 216), closed: part('s_ec.png', 296, 216) },
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

test('gate: v2 素材包检查：整图、贴片、节奏补默认值；只收默认姿势（侧头、中间帧不收）；文件、静止图、换素材编号', () => {
  assert.equal(pack.version, 2)
  assert.deepEqual(Object.keys(pack.poses), ['front'])
  assert.equal(pack.turns, undefined)
  assert.deepEqual(pack.blink, MOTION_DEFAULTS.blink)
  assert.deepEqual(pack.talk.shapes, MOTION_DEFAULTS.talk.shapes)
  assert.equal(packStill(pack), 'front.webp')
  const files = packFiles(pack)
  assert.equal(files.length, 1 + 6)
  const stored = packWithAssets(pack, Object.fromEntries(files.map(f => [f, 'id-' + f])))
  assert.equal(packStill(stored), 'id-front.webp')
  assert.equal(stored.poses.front.parts.mouth.round.file, 'id-f_mr.png')
  // 不合法的写法说清哪一项不对
  assert.throws(() => cleanPack({ ...RAW, poses: { front: { base: '../x.png' } } }), /文件名不对/)
  assert.throws(() => cleanPack({ ...RAW, poses: { ...RAW.poses, front: { ...RAW.poses.front, parts: { eyes: { wink: part('a.png', 0, 0) } } } } }), /差分名不对/)
  assert.deepEqual(Object.keys(cleanPack({ ...RAW, default_pose: 'side' }).poses), ['side'])
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

test('gate: 眨眼闭得快睁得慢；连眨两下中间只睁到半闭、不停久，第二下短一点', () => {
  const one = blinkSteps(pack.blink)
  assert.deepEqual(one.map(x => x.eyes), ['half', 'closed', 'half'])
  assert.ok(stepsDuration(pack.blink.open) > stepsDuration(pack.blink.close.slice(0, 1)), '睁得比闭得慢')
  const two = blinkSteps(pack.blink, { double: true })
  assert.deepEqual(two.map(x => x.eyes), ['half', 'closed', 'half', 'closed', 'half'])
  assert.ok(two[2].ms <= 70, '两下之间不在半闭上多停')
  assert.ok(two[3].ms < two[1].ms, '第二下闭得短一点')
  assert.ok(stepsDuration(two) < 400, '连眨一共不到 0.4 秒')
  assert.ok(!two.some(x => x.eyes === 'open'), '两下之间不完全睁开')
})

test('gate: 演员：说话嘴跟轨道，说完闭嘴；旁白不动嘴；待机按间隔眨眼；图层是整图 + 眼 + 嘴', () => {
  const a = createActor(pack, { seed: 't', now: 0 })
  const t = talkOf('我们走吧。')
  a.say(t, 6000)
  assert.notEqual(a.frame(6001).mouth, 'closed')
  assert.equal(a.frame(9000).mouth, 'closed')
  a.say({ ...t, type: 'narration' }, 10000)
  assert.equal(a.frame(10001).mouth, 'closed')
  assert.equal(a.frame(10001).pose, 'front')
  // 一分钟待机：闭眼次数在设定间隔的范围里
  let n = 0
  let was = false
  const idle = createActor(pack, { seed: 'idle', now: 0 })
  for (let ms = 0; ms < 60000; ms += 16) { const c = idle.frame(ms).eyes === 'closed'; if (c && !was) n += 1; was = c }
  assert.ok(n >= 10 && n <= 35, '一分钟闭眼 ' + n)
  assert.deepEqual(motionLayers(pack, { pose: 'front', eyes: 'half', mouth: 'round' }).map(l => l.file), ['front.webp', 'f_eh.png', 'f_mr.png'])
  assert.deepEqual(motionLayers(pack, { pose: 'front', eyes: 'open', mouth: 'closed' }).map(l => l.file), ['front.webp'])
})
