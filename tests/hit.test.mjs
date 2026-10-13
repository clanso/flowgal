// 打斗：一次出手（招式名、命中 / 暴击 / 闪避 / 格挡 / 击倒 / 治疗）；被击倒的人倒在那里。不出开战、胜负的卡片。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { normalizeScript } from '../lib/director.js'
const MAX_HITS_PER_TURN = 12 // 设置里限了数时（默认不限）
import { buildBeats, beatHold, HIT_LEAD_MS } from '../src/client/theater/playback.js'

test('gate: 导演写的出手要有目标或招式名，效果认不出按命中；一轮有上限；写了开战、结束也不留', () => {
  const units = ['U1', 'U2', 'U3', 'U4'].map(id => ({ id, type: 'dialogue', text: id }))
  const script = normalizeScript({
    scene: {}, cast: [],
    lines: [
      { u: 'U1', sp: '林岚', battle: { foe: '怨灵', title: '旧校舍的琴声' } },
      { u: 'U2', sp: '林岚', battle: 'end', hit: { from: '林岚', to: '怨灵', move: '月下一闪', effect: 'crit' } },
      { u: 'U3', sp: '林岚', hit: { from: '林岚', effect: 'down' } },
      { u: 'U4', sp: '林岚', hit: { to: '我', effect: 'explode' } },
    ],
  }, units)
  const L = script.lines
  assert.equal(L.U1.battle, undefined, '开战卡已经去掉了')
  assert.equal(L.U2.battle, undefined)
  assert.deepEqual(L.U2.hit, { from: '林岚', to: '怨灵', move: '月下一闪', effect: 'crit' })
  assert.equal(L.U3.hit, undefined, '不知道打谁、也没招式名的不演')
  assert.deepEqual(L.U4.hit, { to: '我', effect: 'hit' })

  const many = Array.from({ length: MAX_HITS_PER_TURN + 3 }, (_, i) => ({ id: 'U' + (i + 1), type: 'dialogue', text: '句' + i }))
  const raw = { scene: {}, cast: [], lines: many.map(u => ({ u: u.id, sp: '林岚', hit: { to: '我', move: '斩' } })) }
  assert.equal(Object.values(normalizeScript(raw, many).lines).filter(l => l.hit).length, many.length, '默认不限')
  const crowded = normalizeScript(raw, many, { limits: { hits: MAX_HITS_PER_TURN } })
  assert.equal(Object.values(crowded.lines).filter(l => l.hit).length, MAX_HITS_PER_TURN)
})

const play = (turns, cast = [{ name: '林岚', pos: 'left' }, { name: '苏晴', pos: 'right' }]) => buildBeats({
  turns: turns.map(([lines, scene = { location: '旧校舍' }], i) => {
    const units = lines.map(([text], j) => ({ id: `U${j + 1}`, type: 'dialogue', text }))
    return { turn: i + 1, textVersion: 'v1', units, script: { scene, cast, lines: Object.fromEntries(lines.map(([, line], j) => [`U${j + 1}`, line])) } }
  }),
  images: [],
}).beats

test('gate: 出手记在这一拍上；被击倒的人倒在那里，到他开口或被治疗才站起来；字等打中以后再出', () => {
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
  assert.ok(beats.every(b => b.battle === undefined && b.battleEdge === undefined), '不挂「交战」、不出开战卡和胜负卡')

  const was = { place: beats[1].scene.location, mode: '' }
  assert.equal(beatHold(beats[0], { was }).ms, HIT_LEAD_MS)
  assert.equal(beatHold(beats[1], { was }).ms, 0)
  const fight = play([[[['来吧', { sp: '林岚', battle: { foe: '怨灵' } }], ['赢了', { sp: '林岚', battle: { end: 'win' } }]]]])
  const w = { place: fight[0].scene.location, mode: '' }
  assert.deepEqual([beatHold(fight[0], { was: w }).ms, beatHold(fight[1], { was: w }).ms], [0, 0], '旧存档里写着开战、结束的句子也不停')
})

test('gate: 被击倒的人：旁白写到他（sp 是他）、所有人一起走位都不会让他站起来；他自己的心声、自己走位会', () => {
  const beats = play([[[
    ['倒下', { sp: '林岚', hit: { from: '林岚', to: '苏晴', effect: 'down' } }],
    ['苏晴一动不动地倒在地上', { type: 'narration', sp: '苏晴' }],
    ['所有人都往后退了一步', { type: 'narration', move: [{ name: '*', act: 'back' }] }],
    ['……好疼', { type: 'thought', sp: '苏晴' }],
    ['再倒一次', { sp: '林岚', hit: { to: '苏晴', effect: 'down' } }],
    ['她撑着站了起来', { type: 'narration', move: [{ name: '苏晴', act: 'forward' }] }],
  ]]])
  const down = b => Boolean(b.poses && b.poses['苏晴'] && b.poses['苏晴'].down)
  assert.deepEqual(beats.map(down), [true, true, true, false, true, false])
  assert.equal(beats[2].poses['林岚'].depth, -1, '站着的人照样后退')
  assert.equal(beats[2].poses['苏晴'].depth, undefined, '倒着的人跟不上')
})
