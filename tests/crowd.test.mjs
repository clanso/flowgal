// 台上人多时：同屏最多站几个人，超出的最久没动静的先下场；剩下的按站位均匀排开，人越多立绘越小。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildBeats, onStage, stageLayout } from '../src/client/theater/playback.js'
import { resolveConfig } from '../lib/config.js'

const names = list => list.map(c => c.name).join('+')

test('gate: 同屏最多几人：超出的最久没说话、没登场的先下场，轮到他说话再回来；都没动静的按导演排的顺序留', () => {
  const ids = ['U1', 'U2', 'U3', 'U4', 'U5']
  const units = ids.map(id => ({ id, type: 'dialogue', text: id }))
  const cast = ['甲', '乙', '丙', '丁', '戊', '己', '庚'].map((name, i) => ({ name, pos: ['center', 'left', 'right', 'farleft', 'farright', 'center', 'left'][i] }))
  const script = { scene: {}, cast, lines: { U1: { sp: '庚' }, U2: { sp: '己' }, U3: { sp: '甲' }, U4: { type: 'narration' }, U5: { sp: '戊' } } }
  const { beats } = buildBeats({ turns: [{ turn: 1, textVersion: 'v1', units, script }], images: [] })
  assert.equal(beats[0].cast.length, 7, '在场的人照旧都算')
  const shown = beats.map(b => names(onStage(b.cast, b.recent, 5)))
  assert.deepEqual(shown, ['甲+乙+丙+丁+庚', '甲+乙+丙+己+庚', '甲+乙+丙+己+庚', '甲+乙+丙+己+庚', '甲+乙+戊+己+庚'])
  assert.equal(names(onStage(beats[4].cast, beats[4].recent, 0)), '甲+乙+丙+丁+戊+己+庚', '0 不限')
  assert.equal(names(onStage(cast.slice(0, 3), null, 5)), '甲+乙+丙')
})

test('gate: 站位：一个人照导演写的站；两个人以上按站位从左到右均匀排开，人越多立绘越小；同一个站位的不叠在一起', () => {
  assert.deepEqual(stageLayout([{ name: '甲', pos: 'left' }]), [{ name: '甲', pos: 'left', x: 28, scale: 1 }])
  const two = stageLayout([{ name: '甲', pos: 'center' }, { name: '乙', pos: 'left' }])
  assert.deepEqual(two.map(c => [c.name, c.x, c.scale]), [['甲', 70, 1], ['乙', 30, 1]], '左边的站左边')
  const five = stageLayout(['farright', 'center', 'left', 'right', 'farleft'].map((pos, i) => ({ name: '甲乙丙丁戊'[i], pos })))
  assert.deepEqual(five.map(c => c.x), [88, 50, 31, 69, 12])
  assert.equal(five[0].scale, 0.84)
  const same = stageLayout([{ name: '甲', pos: 'center' }, { name: '乙', pos: 'center' }, { name: '丙', pos: 'center' }])
  assert.deepEqual(same.map(c => c.x), [20, 50, 80], '同一个站位按出场顺序排开')
  const xs = stageLayout(Array.from({ length: 8 }, (_, i) => ({ name: 'p' + i, pos: 'center' }))).map(c => c.x)
  assert.ok(xs.every((x, i) => i === 0 || x > xs[i - 1]) && xs[0] >= 10 && xs[7] <= 90)
})

test('gate: 设置里的同屏人数：2~8 或 0（不限），填坏了用 5', () => {
  assert.equal(resolveConfig({}).ui.maxOnStage, 5)
  assert.equal(resolveConfig({ ui: { maxOnStage: 3 } }).ui.maxOnStage, 3)
  assert.equal(resolveConfig({ ui: { maxOnStage: 0 } }).ui.maxOnStage, 0)
  assert.equal(resolveConfig({ ui: { maxOnStage: 12 } }).ui.maxOnStage, 5)
  assert.equal(resolveConfig({ ui: { maxOnStage: '4' } }).ui.maxOnStage, 5)
})
