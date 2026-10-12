// 战斗：开战卡、结束卡、左上角的「交战」，一次出手（招式名、命中 / 暴击 / 闪避 / 格挡 / 击倒 / 治疗）。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { normalizeScript } from '../lib/director.js'
import { MAX_HITS_PER_TURN } from '../lib/vocab.js'
import { buildBeats, beatHold, BATTLE_CARD_MS, HIT_LEAD_MS } from '../src/client/theater/playback.js'

test('gate: 导演写的战斗：开战要有对手，结束认 end / result / "end"，结果认不出就是没分胜负；出手要有目标或招式名，效果认不出按命中；一轮有上限', () => {
  const units = ['U1', 'U2', 'U3', 'U4', 'U5', 'U6', 'U7'].map(id => ({ id, type: 'dialogue', text: id }))
  const script = normalizeScript({
    scene: {}, cast: [],
    lines: [
      { u: 'U1', sp: '林岚', battle: { foe: '怨灵', title: '旧校舍的琴声' } },
      { u: 'U2', sp: '林岚', battle: { title: '没有对手' } },
      { u: 'U3', sp: '林岚', battle: { end: 'win' } },
      { u: 'U4', sp: '林岚', battle: { result: 'draw' } },
      { u: 'U5', sp: '林岚', battle: 'end', hit: { from: '林岚', to: '怨灵', move: '月下一闪', effect: 'crit' } },
      { u: 'U6', sp: '林岚', hit: { from: '林岚', effect: 'down' } },
      { u: 'U7', sp: '林岚', hit: { to: '我', effect: 'explode' } },
    ],
  }, units)
  const L = script.lines
  assert.deepEqual(L.U1.battle, { foe: '怨灵', title: '旧校舍的琴声' })
  assert.equal(L.U2.battle, undefined)
  assert.deepEqual([L.U3.battle, L.U4.battle, L.U5.battle], [{ end: 'win' }, { end: true }, { end: true }])
  assert.deepEqual(L.U5.hit, { from: '林岚', to: '怨灵', move: '月下一闪', effect: 'crit' })
  assert.equal(L.U6.hit, undefined, '不知道打谁、也没招式名的不演')
  assert.deepEqual(L.U7.hit, { to: '我', effect: 'hit' })

  const many = Array.from({ length: MAX_HITS_PER_TURN + 3 }, (_, i) => ({ id: 'U' + (i + 1), type: 'dialogue', text: '句' + i }))
  const crowded = normalizeScript({ scene: {}, cast: [], lines: many.map(u => ({ u: u.id, sp: '林岚', hit: { to: '我', move: '斩' } })) }, many)
  assert.equal(Object.values(crowded.lines).filter(l => l.hit).length, MAX_HITS_PER_TURN)
})

const play = (turns, cast = [{ name: '林岚', pos: 'left' }, { name: '苏晴', pos: 'right' }]) => buildBeats({
  turns: turns.map(([lines, scene = { location: '旧校舍' }], i) => {
    const units = lines.map(([text], j) => ({ id: `U${j + 1}`, type: 'dialogue', text }))
    return { turn: i + 1, textVersion: 'v1', units, script: { scene, cast, lines: Object.fromEntries(lines.map(([, line], j) => [`U${j + 1}`, line])) } }
  }),
  images: [],
}).beats

test('gate: 开战以后每一拍都挂着「交战」，跨轮带着；结束那一拍出结束卡、「交战」收起；换了地方当打完了', () => {
  const beats = play([
    [[['来吧', { sp: '林岚', battle: { foe: '怨灵', title: '旧校舍的琴声' } }], ['呜——', { sp: '苏晴' }]]],
    [[['还没完', { sp: '林岚' }], ['结束了', { sp: '林岚', battle: { end: 'win' } }], ['走吧', { sp: '苏晴' }]]],
  ])
  assert.deepEqual(beats[0].battleEdge, { kind: 'start', foe: '怨灵', title: '旧校舍的琴声' })
  assert.deepEqual(beats.map(b => b.battle && b.battle.foe), ['怨灵', '怨灵', '怨灵', undefined, undefined])
  assert.deepEqual(beats[3].battleEdge, { kind: 'end', result: 'win', foe: '怨灵' })
  assert.equal(beats[4].battleEdge, undefined)

  const moved = play([
    [[['来吧', { sp: '林岚', battle: { foe: '怨灵' } }]]],
    [[['这里是哪', { sp: '林岚' }]], { location: '天台' }],
  ])
  assert.equal(moved[1].battle, undefined, '换了地方就不挂「交战」了')
  const draw = play([[[['停手吧', { sp: '林岚', battle: { end: true } }]]]])
  assert.deepEqual(draw[0].battleEdge, { kind: 'end' }, '没开过战、没分胜负也能收场')
})

test('gate: 出手记在这一拍上；被击倒的人倒在那里，到他开口或被治疗才站起来；字等开战卡收起、等打中以后再出', () => {
  const beats = play([[[
    ['看招', { sp: '林岚', hit: { from: '林岚', to: '苏晴', move: '月下一闪', effect: 'down' } }],
    ['……', { sp: '林岚' }],
    ['别睡啊', { sp: '林岚', hit: { from: '林岚', to: '苏晴', move: '回春', effect: 'heal' } }],
    ['我又倒了', { sp: '林岚', hit: { to: '苏晴', effect: 'down' } }],
    ['我还能打', { sp: '苏晴' }],
  ]]])
  assert.deepEqual(beats[0].hit, { from: '林岚', to: '苏晴', move: '月下一闪', effect: 'down' })
  const down = b => Boolean(b.poses && b.poses['苏晴'] && b.poses['苏晴'].down)
  assert.deepEqual(beats.map(down), [true, true, false, true, false])
  assert.equal(beats[1].hit, undefined)

  const was = { place: beats[1].scene.location, mode: '' }
  assert.equal(beatHold(beats[0], { was }).ms, HIT_LEAD_MS)
  assert.equal(beatHold(beats[1], { was }).ms, 0)
  const fight = play([[[['来吧', { sp: '林岚', battle: { foe: '怨灵' } }], ['赢了', { sp: '林岚', battle: { end: 'win' } }]]]])
  const w = { place: fight[0].scene.location, mode: '' }
  assert.equal(beatHold(fight[0], { was: w }).ms, BATTLE_CARD_MS.start)
  assert.equal(beatHold(fight[1], { was: w }).ms, BATTLE_CARD_MS.end)
  assert.equal(beatHold(fight[1], { was: w }).away, false, '对话框不让开')
})
