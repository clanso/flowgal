// 手机：来电、拨出、视频通话、挂断（没接通 / 拒接 / 对方挂断）、通知横幅、语音留言。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { normalizeScript, previousBrief, callAtEnd } from '../lib/director.js'
const MAX_PHONE_PER_TURN = 8 // 设置里限了数时（默认不限）
import { FOLEY, PHONE_FOLEY } from '../lib/foley.js'
import { buildBeats, beatHold, PHONE_LEAD_MS } from '../src/client/theater/playback.js'

const unitsOf = n => Array.from({ length: n }, (_, i) => ({ id: 'U' + (i + 1), type: 'dialogue', text: '句' + i }))

test('gate: 导演写的手机：认得的种类才收，video 当视频来电，中文的挂断结果也认；通知、留言没写内容不收', () => {
  const list = [
    { kind: 'call', who: '林岚' },
    { kind: 'video', who: '苏晴' },
    { kind: 'dial', who: '林岚', video: 'true' },
    { kind: 'end', result: '对方挂断' },
    { kind: 'end', result: 'missed', text: '不该有字' },
    { kind: 'notify', who: '外卖平台', text: '您的订单已送达' },
    { kind: 'notify', who: '林岚' },
    { kind: 'voicemail', who: '林岚', text: '看到回我电话' },
    { kind: 'selfie', who: '林岚' },
    'call',
  ]
  const units = unitsOf(list.length)
  const script = normalizeScript({ scene: {}, cast: [], lines: list.map((phone, i) => ({ u: 'U' + (i + 1), sp: '林岚', phone })) }, units)
  assert.deepEqual(units.map(u => script.lines[u.id].phone), [
    { kind: 'call', who: '林岚' },
    { kind: 'call', who: '苏晴', video: true },
    { kind: 'dial', who: '林岚', video: true },
    { kind: 'end', result: 'hungup' },
    { kind: 'end', result: 'missed' },
    { kind: 'notify', who: '外卖平台', text: '您的订单已送达' },
    undefined,
    { kind: 'voicemail', who: '林岚', text: '看到回我电话' },
    undefined,
    undefined,
  ])
})

test('gate: 一轮最多几个手机上的事；标在不演的单元上的挪到下一句；上一幕没挂的电话导演看得到', () => {
  const units = unitsOf(MAX_PHONE_PER_TURN + 2)
  const raw = { scene: {}, cast: [], lines: units.map(u => ({ u: u.id, sp: '林岚', phone: { kind: 'notify', who: '群聊', text: '新消息' } })) }
  assert.equal(Object.values(normalizeScript(raw, units).lines).filter(l => l.phone).length, units.length, '默认不限')
  const crowded = normalizeScript(raw, units, { limits: { phone: MAX_PHONE_PER_TURN } })
  assert.equal(Object.values(crowded.lines).filter(l => l.phone).length, MAX_PHONE_PER_TURN)

  const three = unitsOf(3)
  const carried = normalizeScript({ scene: { location: '宿舍' }, cast: [], skip: ['U1'], lines: [{ u: 'U1', phone: { kind: 'call', who: '林岚', video: true } }, { u: 'U2', sp: '林岚' }] }, three)
  assert.deepEqual(carried.lines.U2.phone, { kind: 'call', who: '林岚', video: true })
  assert.deepEqual(callAtEnd(carried), { who: '林岚', video: true })
  assert.ok(previousBrief(carried).includes('还在跟林岚视频通话'))
  const hung = normalizeScript({ scene: { location: '宿舍' }, cast: [], lines: [{ u: 'U1', sp: '林岚', phone: { kind: 'dial', who: '林岚' } }, { u: 'U3', sp: '林岚', phone: { kind: 'end' } }] }, three)
  assert.equal(callAtEnd(hung), null)
  assert.ok(!previousBrief(hung).includes('通话'))
})

const play = (lines, { cast = [{ name: '我', pos: 'left' }], n = 5, turns = [] } = {}) => {
  const units = unitsOf(n)
  return buildBeats({ turns: [{ turn: 1, textVersion: 'v1', units, script: { scene: { location: '宿舍' }, cast, lines } }, ...turns], images: [] }).beats
}

test('gate: 打来的那一句响着，下一句起接通；电话那头的人开口按电话里的声音演，挂断那一句出挂断卡', () => {
  const beats = play({
    U1: { type: 'narration', phone: { kind: 'call', who: '林岚', video: true } },
    U2: { sp: '林岚' },
    U3: { sp: '我' },
    U4: { sp: '林岚', phone: { kind: 'end' } },
    U5: { sp: '我' },
  })
  assert.deepEqual(beats.map(b => b.call && b.call.state), ['ringing', 'live', 'live', undefined, undefined])
  assert.deepEqual(beats[0].call, { who: '林岚', video: true, dir: 'in', id: '1:U1', state: 'ringing' })
  assert.deepEqual(beats.map(b => b.voice), [undefined, 'phone', undefined, 'phone', undefined], '电话那头的人说的话（挂断那一句也是）')
  assert.deepEqual(beats[3].phone, { kind: 'end', who: '林岚', id: '1:U1', dir: 'in', video: true, live: true })
})

test('gate: 接下来写的是没接通、被拒接的，一直响到那一句；通知、留言不算电话', () => {
  const beats = play({
    U1: { type: 'narration', phone: { kind: 'dial', who: '林岚' } },
    U2: { type: 'narration', phone: { kind: 'notify', who: '外卖平台', text: '已送达' } },
    U3: { type: 'narration', phone: { kind: 'end', result: 'missed' } },
    U4: { type: 'narration', phone: { kind: 'voicemail', who: '林岚', text: '回我电话' } },
  })
  assert.deepEqual(beats.map(b => b.call && b.call.state), ['ringing', 'ringing', undefined, undefined, undefined])
  assert.deepEqual(beats[2].phone, { kind: 'end', who: '林岚', id: '1:U1', dir: 'out', result: 'missed' })
  assert.deepEqual(beats.map(b => b.phone && b.phone.kind), ['dial', 'notify', 'end', 'voicemail', undefined])
  const was = { place: '宿舍', mode: '' }
  assert.equal(beatHold(beats[0], { was }).ms, PHONE_LEAD_MS.dial)
  assert.deepEqual(beatHold(beats[1], { was }), { ms: 0, away: false }, '通知不打断')
})

test('gate: 没挂的电话带到下一轮（已经接通），那一轮里电话那头没动静就当挂了；电话那头的人走进画面，电话收起', () => {
  const next = (turn, lines) => ({ turn, textVersion: 'v1', units: unitsOf(2), script: { scene: { location: '宿舍' }, cast: [{ name: '我', pos: 'left' }], lines } })
  const beats = play({ U1: { type: 'narration', phone: { kind: 'call', who: '林岚' } }, U2: { sp: '林岚' } }, { n: 2, turns: [
    next(2, { U1: { sp: '林岚' }, U2: { sp: '我' } }),
    next(3, { U1: { sp: '我' }, U2: { sp: '我' } }),
  ] })
  assert.deepEqual(beats.map(b => b.call && b.call.state), ['ringing', 'live', 'live', 'live', undefined, undefined])
  assert.equal(beats[2].voice, 'phone')

  const arrived = play({
    U1: { type: 'narration', phone: { kind: 'call', who: '林岚' } },
    U2: { sp: '林岚' },
    U3: { sp: '林岚', enter: [{ name: '林岚' }] },
  }, { n: 3 })
  assert.deepEqual(arrived.map(b => b.call && b.call.state), ['ringing', 'live', undefined])
  assert.equal(arrived[2].voice, undefined, '站在面前说话不是电话声')
})

test('gate: 有立绘的人在电话里开口不会被当成漏列、自己走上台；挂断之后当面开口才上台', () => {
  const units = unitsOf(4)
  const script = { scene: { location: '宿舍' }, cast: [{ name: '我', pos: 'left' }], lines: {
    U1: { type: 'narration', phone: { kind: 'call', who: '林岚' } },
    U2: { sp: '林岚' },
    U3: { sp: '林岚', phone: { kind: 'end' } },
    U4: { sp: '林岚' },
  } }
  const view = { turns: [{ turn: 1, textVersion: 'v1', units, script }], images: [], cast: [{ name: '林岚', sprites: { neutral: { assetId: 'a1' } } }] }
  const { beats } = buildBeats(view)
  assert.deepEqual(beats.map(b => b.cast.some(c => c.name === '林岚')), [false, false, false, true])
  assert.deepEqual(beats.map(b => b.call && b.call.state), ['ringing', 'live', undefined, undefined])
  assert.deepEqual(beats.map(b => b.voice), [undefined, 'phone', 'phone', undefined])
})

test('gate: 手机的每种事都有声音；拉长的音稳住的时间比整段短', () => {
  for (const id of Object.values(PHONE_FOLEY)) assert.ok(FOLEY[id], id)
  for (const [id, parts] of Object.entries(FOLEY)) for (const part of parts) assert.ok(!part.hold || part.hold < part.dur, id)
})
