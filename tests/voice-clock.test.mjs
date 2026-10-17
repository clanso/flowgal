// 打字音的时钟（lib/voice-clock.js）：前瞻排程（字和声音同一个时钟、主线程卡一下不乱）、输出延迟补偿、按站位分左右。
import test from 'node:test'
import assert from 'node:assert/strict'
import { createLookahead, outputDelayMs, voicePan, LOOKAHEAD_S } from '../lib/voice-clock.js'

const notes = (...ats) => ats.map((at, i) => ({ i, at }))

test('gate: 前瞻排程：每次只排接下来一小段里的音，排在音频时钟上的准点，不早不晚、不重复', () => {
  const played = []
  const la = createLookahead(notes(0, 60, 120, 180, 240, 300, 1000), { start: 10, play: (n, when) => played.push([n.i, when]) })
  la.pump(10) // 开始时：排 0~LOOKAHEAD 里的
  assert.deepEqual(played.map(p => p[0]), [0, 1], `前瞻 ${LOOKAHEAD_S}s 里只有两个`)
  assert.equal(played[0][1], 10)
  assert.ok(Math.abs(played[1][1] - 10.06) < 1e-9, '排在音频时钟的准点')
  la.pump(10.05)
  assert.deepEqual(played.map(p => p[0]), [0, 1, 2])
  la.pump(10.05) // 同一时刻再泵一次不重复
  assert.equal(played.length, 3)
  la.pump(10.15)
  la.pump(10.25)
  assert.deepEqual(played.map(p => p[0]), [0, 1, 2, 3, 4, 5])
  assert.equal(la.done(), false)
  la.pump(11)
  assert.equal(played.length, 7)
  assert.equal(la.done(), true)
})

test('gate: 主线程卡住：卡的那段里已经过点的音不补放（不会一下子挤成一团），没过点的照准点排', () => {
  const played = []
  const la = createLookahead(notes(0, 60, 120, 180, 240, 300, 360), { start: 0, play: (n, when) => played.push([n.i, when]) })
  la.pump(0)
  la.pump(0.05)
  // 卡了 200ms：0.13 时才醒，120ms 那个已经过点
  la.pump(0.25)
  la.pump(0.3)
  const late = played.filter(([, when]) => when < 0.25 - 0.03)
  assert.ok(late.every(([i]) => i <= 2), '过点很久的不该排')
  assert.ok(!played.some(([i]) => i === 2) || played.find(([i]) => i === 2)[1] >= 0.12, '要么跳过，要么还在准点')
  const after = played.filter(([i]) => i * 0.06 >= 0.25)
  assert.ok(after.length >= 2 && after.every(([i, when]) => Math.abs(when - i * 0.06) < 1e-9), '卡完之后还没到点的照样准点')
  assert.ok(!played.some(([i]) => i === 3), '过点 70ms 的丢掉')
  const nudged = played.find(([i]) => i === 4)
  assert.ok(nudged && Math.abs(nudged[1] - 0.25) < 1e-9, '过点 10ms 的挪到现在')
  // 同一瞬间不会排出两个以上
  const whens = played.map(p => p[1].toFixed(3))
  assert.equal(new Set(whens).size, whens.length)
})

test('gate: 稍微过点（几毫秒）的照放，挪到现在；过点太久的丢掉', () => {
  const played = []
  const la = createLookahead(notes(0, 50), { start: 1, play: (n, when) => played.push([n.i, when]) })
  la.pump(1.015) // 第一个过点 15ms
  assert.deepEqual(played[0], [0, 1.015])
  const la2 = createLookahead(notes(0, 50), { start: 1, play: (n, when) => played.push(['b' + n.i, when]) })
  la2.pump(1.2) // 都过点很久了
  assert.ok(!played.some(([i]) => i === 'b0' || i === 'b1'))
  assert.equal(la2.done(), true)
})

test('gate: 停下（点一下打完、翻页）之后不再排；暂停时从停的地方接着走', () => {
  const played = []
  const la = createLookahead(notes(0, 150, 250, 350, 450), { start: 0, play: n => played.push(n.i) })
  la.pump(0)
  la.stop()
  la.pump(1)
  assert.deepEqual(played, [0])
  const p2 = []
  const lb = createLookahead(notes(0, 100, 200, 300), { start: 0, play: (n, when) => p2.push([n.i, Math.round(when * 1000)]) })
  lb.pump(0)
  lb.pause(0.05) // 0.05 停下
  lb.pump(0.5) // 停着的时候不排
  assert.deepEqual(p2.map(p => p[0]), [0, 1], '停之前已经排下的（前瞻里的）由外面掐掉')
  lb.resume(2) // 2 秒时接着走：还没排的按原来的间隔往后挪
  for (let t = 2; t <= 2.4; t += 0.025) lb.pump(t) // 跟剧场里一样每 25ms 泵一次
  assert.deepEqual(p2, [[0, 0], [1, 100], [2, 2150], [3, 2250]])
})

test('gate: 输出延迟：声音要晚这么久才真的出来（蓝牙耳机一两百毫秒），字跟着推迟这么久；拿不到时按 0', () => {
  assert.equal(outputDelayMs({ outputLatency: 0.2, baseLatency: 0.01 }), 200)
  assert.equal(outputDelayMs({ baseLatency: 0.012 }), 12)
  assert.equal(outputDelayMs({}), 0)
  assert.equal(outputDelayMs(null), 0)
  assert.equal(outputDelayMs({ outputLatency: 3 }), 400, '离谱的值封顶')
  assert.equal(outputDelayMs({ outputLatency: -1 }), 0)
})

test('gate: 声像：按站位分左右，乘宽度；画外音偏到退场那一侧、心声和电话居中、齐声各在各的位置；特写往中间收', () => {
  assert.equal(voicePan({ pos: 'center' }), 0)
  assert.ok(Math.abs(voicePan({ pos: 'left' }) - (-22 * 0.55 / 36) * 0.7) < 1e-9, '默认宽度 0.7')
  assert.ok(voicePan({ pos: 'farright' }) > voicePan({ pos: 'right' }))
  assert.equal(voicePan({ pos: 'left', width: 0 }), 0, '宽度 0 等于关掉')
  assert.ok(Math.abs(voicePan({ pos: 'farleft', width: 1 }) - -0.55) < 1e-9)
  assert.equal(voicePan({ pos: 'left', type: 'thought' }), 0, '心声在脑子里')
  assert.equal(voicePan({ pos: 'left', style: 'phone' }), 0, '电话是单声道')
  assert.equal(voicePan({ pos: 'left', style: 'telepathy' }), 0)
  assert.equal(voicePan({ pos: 'left', type: 'narration' }), 0)
  assert.ok(voicePan({ pos: '', style: 'offscreen', exitSide: 'right' }) > 0.35, '画外音从退场那边传来')
  assert.ok(voicePan({ pos: '', style: 'offscreen', exitSide: 'left' }) < -0.35)
  assert.ok(voicePan({ pos: 'left', cam: 'closeup' }) > voicePan({ pos: 'left' }), '特写往中间收')
  assert.ok(Math.abs(voicePan({ x: 72 }) - voicePan({ pos: 'right' })) < 1e-9, '给了横向位置（百分比）就按位置算')
  assert.equal(voicePan({}), 0)
})

test('gate: 说话人在台上的横向位置跟立绘一致（排开、走位都算）；不在台上的没有位置；画外音记得从哪边退场', async () => {
  const { speakerX, buildBeats } = await import('../src/client/theater/playback.js')
  const two = { speaker: '苏晴', cast: [{ name: '林岚', pos: 'left' }, { name: '苏晴', pos: 'right' }], recent: ['苏晴', '林岚'] }
  const x = speakerX(two, 8)
  assert.ok(x > 50, `苏晴站右边：${x}`)
  assert.ok(speakerX({ ...two, speaker: '林岚' }, 8) < 50)
  assert.equal(speakerX({ ...two, speaker: '路人' }, 8), null)
  assert.equal(speakerX({ speaker: '', cast: [] }, 8), null)
  // 一个人在台上：照导演写的站位
  assert.equal(speakerX({ speaker: '林岚', cast: [{ name: '林岚', pos: 'farleft' }] }, 8), 14)
  // 走位：靠近对方时往对方那边挪
  const near = speakerX({ ...two, poses: { 苏晴: { near: ['林岚'] } } }, 8)
  assert.ok(near < x)
  // 退场后在画外说话：记得从哪边下去的
  const units = [{ id: 'U1', type: 'dialogue', text: '我先走了' }, { id: 'U2', type: 'dialogue', text: '明天见！' }]
  const script = { scene: {}, cast: [{ name: '苏晴', pos: 'right' }], lines: { U1: { sp: '苏晴', exit: ['苏晴'] }, U2: { sp: '苏晴', voice: 'offscreen' } } }
  const { beats } = buildBeats({ turns: [{ turn: 1, textVersion: 'v1', units, script }], images: [] })
  assert.equal(beats[1].voice, 'offscreen')
  assert.equal(beats[1].exitSide, 'right')
})

test('gate: 设置里的「声像宽度」默认 0.7、能关；「字和声音对齐」默认开', async () => {
  const { resolveConfig } = await import('../lib/config.js')
  const ui = resolveConfig({}).ui
  assert.equal(ui.blipPan, 0.7)
  assert.equal(ui.blipSync, true)
  assert.equal(resolveConfig({ ui: { blipPan: 0 } }).ui.blipPan, 0)
  assert.equal(resolveConfig({ ui: { blipPan: 5 } }).ui.blipPan, 1)
  assert.equal(resolveConfig({ ui: { blipSync: false } }).ui.blipSync, false)
})
