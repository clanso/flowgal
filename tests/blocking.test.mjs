// 同屏的人：没说话的人的反应、走位、登场退场的方式。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { normalizeScript } from '../lib/director.js'
import { reactsOf, lineFeelings, poseTracker, blockLayout, stackLayers, reactKind } from '../lib/blocking.js'
import { noteEmotionUsers } from '../lib/emotions.js'
import { buildBeats, stageLayout } from '../src/client/theater/playback.js'

const unitsOf = types => types.map((type, i) => ({ id: 'U' + (i + 1), type, text: '第' + (i + 1) + '句' }))

test('gate: 导演写的反应、走位、进出方式收下；写错的丢掉，退场写成 { name, how } 也认', () => {
  const units = unitsOf(['dialogue', 'dialogue', 'narration', 'dialogue'])
  const raw = {
    scene: {}, cast: [{ name: '林岚', pos: 'left' }, { name: '苏晴', pos: 'right' }],
    lines: [
      { u: 'U1', sp: '林岚', emo: 'smile', react: [{ name: '苏晴', emo: 'blush', sym: 'heart' }, { name: '路人' }, { name: '*', emo: 'surprised' }, { name: '苏晴', emo: '不存在的乱写', sym: 'nope' }] },
      { u: 'U2', sp: '苏晴', move: [{ name: '苏晴', act: 'approach', to: '林岚' }, { name: '林岚', act: 'dance' }, { name: '林岚', act: 'turn', to: '林岚' }] },
      { u: 'U3', enter: [{ name: '阿竹', pos: 'center', how: 'run' }, { name: '阿松', how: 'fly' }] },
      { u: 'U4', sp: '苏晴', exit: [{ name: '苏晴', how: 'storm' }, '阿竹', { name: '阿松', how: 'teleport' }] },
    ],
  }
  const script = normalizeScript(raw, units)
  assert.deepEqual(script.lines.U1.react[0], { name: '苏晴', emo: 'blush', sym: 'heart' })
  assert.deepEqual(script.lines.U1.react[1], { name: '*', emo: 'surprised' }, '只写名字、什么都没写的反应不要')
  assert.equal(script.lines.U1.react.length, 3, '乱写的情绪会被当成新情绪收下（跟 emo 一样），乱写的符号丢掉')
  assert.deepEqual(script.lines.U2.move, [{ name: '苏晴', act: 'approach', to: '林岚' }, { name: '林岚', act: 'turn' }], '不认得的走位丢掉，to 写成自己的去掉')
  assert.deepEqual(script.lines.U3.enter, [{ name: '阿竹', pos: 'center', how: 'run' }, { name: '阿松' }])
  assert.deepEqual(script.lines.U4.exit, ['苏晴', '阿竹', '阿松'])
  assert.deepEqual(script.lines.U4.exitHow, { 苏晴: 'storm' })
})

test('gate: 没说话的人的反应：换表情从这句起保持，* 是台上除说话人以外的所有人；引擎按它补差分', () => {
  assert.deepEqual(reactsOf({ react: [{ name: '*', emo: 'surprised' }] }, ['林岚', '苏晴', '阿竹'], ['林岚']), [{ name: '苏晴', emo: 'surprised' }, { name: '阿竹', emo: 'surprised' }])
  assert.deepEqual(reactsOf({ react: [{ name: '林岚', emo: 'shy' }, { name: '苏晴', sym: 'sweat' }] }, ['林岚', '苏晴'], ['林岚']), [{ name: '苏晴', sym: 'sweat' }], '说话的人自己的反应不算')
  assert.deepEqual(lineFeelings({ sp: '林岚', emo: 'smile', react: [{ name: '*', emo: 'blush' }, { name: '苏晴', sym: 'heart' }] }, ['林岚', '苏晴']), [{ name: '林岚', emo: 'smile' }, { name: '苏晴', emo: 'blush' }])
  assert.equal(reactKind('surprised'), 'jolt')
  assert.equal(reactKind('shy'), 'shrink')
  assert.equal(reactKind('serious'), 'nod', '没列的轻轻点个头')

  const units = unitsOf(['dialogue', 'dialogue', 'dialogue'])
  const script = {
    scene: {}, cast: [{ name: '林岚', pos: 'left' }, { name: '苏晴', pos: 'right' }, { name: '阿竹', pos: 'center' }],
    lines: { U1: { sp: '林岚', emo: 'smile', react: [{ name: '苏晴', emo: 'blush', sym: 'heart' }] }, U2: { sp: '阿竹', react: [{ name: '*', emo: 'surprised' }] }, U3: { sp: '林岚' } },
  }
  const { beats } = buildBeats({ turns: [{ turn: 1, textVersion: 'v1', units, script }], images: [] })
  assert.deepEqual(beats[0].reacts, [{ name: '苏晴', emo: 'blush', sym: 'heart' }])
  assert.equal(beats[0].emotions['苏晴'], 'blush')
  assert.deepEqual(beats[1].reacts.map(r => r.name), ['林岚', '苏晴'], '全员吃惊不算正在说话的阿竹')
  assert.equal(beats[2].emotions['苏晴'], 'surprised', '表情保持到下一次变')
  assert.equal(beats[2].reacts, undefined)

  // 新造的情绪记在有反应的人名下（人物志只挂在用过它的人下面）
  const lib = { list: [{ id: '强忍笑意', source: 'director', who: [] }] }
  noteEmotionUsers(lib, { U1: { sp: '林岚', emo: 'smile', react: [{ name: '苏晴', emo: '强忍笑意' }, { name: '*', emo: '强忍笑意' }] } })
  assert.deepEqual(lib.list[0].who, ['苏晴'])
})

test('gate: 走位从那一句起保持：靠近两人一起挪、背过身、复位；退场的人、换了地方、新一轮都回到原位', () => {
  const t = poseTracker()
  const here = ['林岚', '苏晴', '阿竹']
  let r = t.step({ onStage: here, moves: [{ name: '苏晴', act: 'approach', to: '林岚' }, { name: '阿竹', act: 'turn' }] })
  assert.deepEqual(r.poses, { 苏晴: { near: ['林岚'] }, 林岚: { near: ['苏晴'] }, 阿竹: { away: true } })
  assert.equal(r.moves.length, 2)
  r = t.step({ onStage: here, moves: [{ name: '阿竹', act: 'lookback' }, { name: '林岚', act: 'forward' }] })
  assert.deepEqual(r.poses, { 苏晴: { near: ['林岚'] }, 林岚: { near: ['苏晴'], depth: 1 } }, '回眸转回来了；上前一步')
  r = t.step({ onStage: here, moves: [{ name: '苏晴', act: 'apart', to: '林岚' }] })
  assert.deepEqual(r.poses, { 苏晴: { far: ['林岚'] }, 林岚: { far: ['苏晴'], depth: 1 } }, '拉开距离不再算靠近')
  r = t.step({ onStage: ['林岚', '阿竹'], left: ['苏晴'] })
  assert.deepEqual(r.poses, { 林岚: { depth: 1 } }, '下台的人走位清掉，跟他的远近也清掉')
  r = t.step({ onStage: ['林岚', '阿竹'], moves: [{ name: '*', act: 'reset' }] })
  assert.deepEqual(r.poses, {})
  t.step({ onStage: here, moves: [{ name: '阿竹', act: 'back' }], peeks: ['苏晴'] })
  r = t.step({ onStage: here, speakers: ['苏晴'] })
  assert.deepEqual(r.poses, { 阿竹: { depth: -1 } }, '探头的人开口时走进来')
  t.newSet()
  assert.deepEqual(t.step({ onStage: here }).poses, {})
  assert.deepEqual(t.step({ onStage: here, moves: [{ name: '路人', act: 'turn' }] }).moves, [], '不在台上的人不走位')
})

test('gate: 剧场按走位挪立绘：靠近的两人各往对方挪四分之一，拉开往外让，探头的站到边上；进出的方式记在那一拍上', () => {
  const layout = stageLayout([{ name: '林岚', pos: 'left' }, { name: '苏晴', pos: 'right' }])
  const near = blockLayout(layout, { 林岚: { near: ['苏晴'] }, 苏晴: { near: ['林岚'] } })
  const gap = layout[1].x - layout[0].x
  assert.equal(Math.round((near[1].x - near[0].x) * 10) / 10, Math.round(gap / 2 * 10) / 10)
  const far = blockLayout(layout, { 林岚: { far: ['苏晴'], away: true } })
  assert.ok(far[0].x < layout[0].x)
  assert.equal(far[0].away, true)
  assert.equal(blockLayout(layout, { 苏晴: { peek: true } })[1].peek, 'right')
  assert.equal(blockLayout(layout, null), layout)

  const units = unitsOf(['dialogue', 'narration', 'dialogue', 'dialogue', 'narration'])
  const script = {
    scene: {}, cast: [{ name: '林岚', pos: 'left' }, { name: '苏晴', pos: 'right' }],
    lines: {
      U1: { sp: '林岚', move: [{ name: '林岚', act: 'approach', to: '苏晴' }] },
      U2: { enter: [{ name: '阿竹', how: 'peek' }], scene: {} },
      U3: { sp: '苏晴', exit: ['苏晴'], exitHow: { 苏晴: 'storm' } },
      U4: { sp: '林岚', scene: { location: '走廊' } },
      U5: {},
    },
  }
  script.cast.push({ name: '阿竹', pos: 'center' })
  const { beats } = buildBeats({ turns: [{ turn: 1, textVersion: 'v1', units, script }], images: [] })
  assert.deepEqual(beats[0].poses, { 林岚: { near: ['苏晴'] }, 苏晴: { near: ['林岚'] } })
  assert.deepEqual(beats[0].moves, [{ name: '林岚', act: 'approach', to: '苏晴' }])
  assert.deepEqual(beats[1].enterHow, { 阿竹: 'peek' })
  assert.equal(beats[1].poses['阿竹'].peek, true)
  assert.equal(beats[2].exitHow, undefined, '告别那句说完下一拍才走')
  assert.deepEqual(beats[3].exitHow, { 苏晴: 'storm' })
  assert.equal(beats[3].poses, undefined, '换了地方，走位复位')
})

test('gate: 谁挡在谁前面：说话的人站到最前，说完（旁白、主角开口）也留在前面；没开过口的人在后面，离中间近的在前；上前的总在前面', () => {
  const units = unitsOf(['dialogue', 'narration', 'dialogue', 'thought', 'dialogue'])
  const script = {
    scene: {}, cast: [{ name: '阿竹', pos: 'center' }, { name: '林岚', pos: 'right' }, { name: '苏晴', pos: 'farleft' }],
    lines: { U1: { sp: '林岚' }, U2: {}, U3: { sp: '苏晴' }, U4: {}, U5: { sp: '林岚' } },
  }
  const { beats } = buildBeats({ turns: [{ turn: 1, textVersion: 'v1', units, script }], images: [] })
  assert.deepEqual(beats.map(b => b.front), [['林岚'], ['林岚'], ['苏晴', '林岚'], ['苏晴', '林岚'], ['林岚', '苏晴']])
  const z = (beat, poses) => Object.fromEntries(stackLayers(blockLayout(stageLayout(beat.cast), poses), beat.front).map(e => [e.name, e.z]))
  assert.deepEqual(z(beats[1]), { 苏晴: 1, 阿竹: 2, 林岚: 3 }, '旁白那句林岚还在最前；没开过口的阿竹站在中间，比苏晴靠前')
  assert.deepEqual(z(beats[3]), { 苏晴: 3, 林岚: 2, 阿竹: 1 }, '主角的心声不换人')
  assert.deepEqual(z(beats[4]), { 林岚: 3, 苏晴: 2, 阿竹: 1 })
  assert.deepEqual(z(beats[4], { 阿竹: { depth: 1 } }), { 阿竹: 3, 林岚: 2, 苏晴: 1 }, '上前一步的站在前面')
  assert.deepEqual(z(beats[4], { 林岚: { depth: -1 } }), { 苏晴: 3, 阿竹: 2, 林岚: 1 }, '退后的站在后面')
})

test('gate: 躲到某人身后：站到他旁边一点、图层紧贴在他后面，开口也不出来；上前、复位、他下台时出来', () => {
  const units = unitsOf(['dialogue', 'dialogue', 'dialogue'])
  const raw = { scene: {}, cast: [{ name: '林岚', pos: 'left' }, { name: '苏晴', pos: 'right' }], lines: [{ u: 'U1', move: [{ name: '苏晴', act: 'hide', to: '林岚' }, { name: '林岚', act: 'hide' }, { name: '林岚', act: 'hide', to: '林岚' }] }] }
  assert.deepEqual(normalizeScript(raw, units).lines.U1.move, [{ name: '苏晴', act: 'hide', to: '林岚' }], '没写躲到谁身后的不要')

  const here = ['林岚', '苏晴', '阿竹']
  const t = poseTracker()
  t.step({ onStage: here, moves: [{ name: '苏晴', act: 'approach', to: '阿竹' }] })
  let r = t.step({ onStage: here, moves: [{ name: '苏晴', act: 'hide', to: '林岚' }] })
  assert.deepEqual(r.poses, { 苏晴: { behind: '林岚' } }, '躲起来就不算靠着阿竹了')
  assert.deepEqual(r.moves, [{ name: '苏晴', act: 'hide', to: '林岚' }])
  r = t.step({ onStage: here, speakers: ['苏晴'], moves: [{ name: '苏晴', act: 'turn' }] })
  assert.deepEqual(r.poses, { 苏晴: { behind: '林岚', away: true } }, '开口、背过身都还躲着')
  r = t.step({ onStage: here, moves: [{ name: '林岚', act: 'hide', to: '苏晴' }] })
  assert.deepEqual(r.poses, { 林岚: { behind: '苏晴' }, 苏晴: { away: true } }, '反过来躲，前面那个就不躲了')
  r = t.step({ onStage: here, moves: [{ name: '林岚', act: 'forward' }] })
  assert.deepEqual(r.poses, { 林岚: { depth: 1 }, 苏晴: { away: true } }, '上前一步就走出来了')
  t.step({ onStage: here, moves: [{ name: '阿竹', act: 'hide', to: '林岚' }] })
  r = t.step({ onStage: ['苏晴', '阿竹'], left: ['林岚'] })
  assert.deepEqual(r.poses, { 苏晴: { away: true } }, '挡在前面的人下台，躲着的人露出来')

  const layout = stageLayout([{ name: '林岚', pos: 'left' }, { name: '阿竹', pos: 'center' }, { name: '苏晴', pos: 'right' }])
  const placed = blockLayout(layout, { 苏晴: { behind: '林岚' } })
  assert.equal(placed[2].behind, '林岚')
  assert.equal(placed[2].hide, 'right', '原来站在他右边，从他右肩探出来')
  assert.ok(placed[2].x > placed[0].x && placed[2].x - placed[0].x < 12, '站到林岚旁边一点，大半个身子被挡住')
  const two = blockLayout(layout, { 苏晴: { behind: '林岚' }, 阿竹: { behind: '林岚' } })
  assert.notEqual(two[1].x, two[2].x, '两个人躲在同一个人身后时错开')
  const moved = blockLayout(layout, { 林岚: { near: ['阿竹'] }, 阿竹: { near: ['林岚'] }, 苏晴: { behind: '林岚' } })
  assert.equal(Math.round((moved[2].x - moved[0].x) * 10) / 10, Math.round((placed[2].x - placed[0].x) * 10) / 10, '挡在前面的人走位，躲着的人跟着走')

  const z = front => Object.fromEntries(stackLayers(placed, front).map(e => [e.name, e.z]))
  assert.ok(z(['苏晴'])['苏晴'] < z(['苏晴'])['林岚'], '躲着的人开口也在后面')
  assert.equal(z(['苏晴'])['林岚'], 3, '躲着的人开口时，挡在前面的人跟着站到最前，躲着的人才露得出来')
  assert.deepEqual(z(['阿竹', '苏晴']), { 林岚: 2, 阿竹: 3, 苏晴: 1 })
})
