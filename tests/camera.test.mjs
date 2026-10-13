// 镜头：新的几种镜头、对准谁、一轮的上限，以及推近 / 特写时脸停在画面哪里。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { normalizeScript } from '../lib/director.js'
import { aimCamera, CAM_CENTER } from '../lib/camera.js'
import { MAX_CAMS_PER_TURN } from '../lib/vocab.js'
import { buildBeats } from '../src/client/theater/playback.js'

test('gate: 导演写的镜头：新镜头收下；camOn 只给对准人的镜头留，写的就是说话人时省掉；一轮有上限', () => {
  const units = ['U1', 'U2', 'U3', 'U4'].map(id => ({ id, type: 'dialogue', text: id }))
  const script = normalizeScript({
    scene: {}, cast: [],
    lines: [
      { u: 'U1', sp: '林岚', cam: 'closeup', camOn: '苏晴' },
      { u: 'U2', sp: '林岚', cam: 'lowangle', camOn: '林岚' },
      { u: 'U3', sp: '林岚', cam: 'whip', camOn: '苏晴' },
      { u: 'U4', sp: '林岚', cam: 'spin' },
    ],
  }, units)
  assert.deepEqual([script.lines.U1.cam, script.lines.U1.camOn], ['closeup', '苏晴'])
  assert.deepEqual([script.lines.U2.cam, script.lines.U2.camOn], ['lowangle', undefined])
  assert.deepEqual([script.lines.U3.cam, script.lines.U3.camOn], ['whip', undefined], '甩镜不对准人')
  assert.equal(script.lines.U4.cam, undefined)

  const many = Array.from({ length: MAX_CAMS_PER_TURN + 5 }, (_, i) => ({ id: 'U' + (i + 1), type: 'dialogue', text: '句' + i }))
  const crowded = normalizeScript({ scene: {}, cast: [], lines: many.map(u => ({ u: u.id, sp: '林岚', cam: 'empty' })) }, many)
  assert.equal(Object.values(crowded.lines).filter(l => l.cam).length, MAX_CAMS_PER_TURN)
  assert.equal(crowded.lines['U' + (MAX_CAMS_PER_TURN + 1)].cam, undefined, '按正文顺序留前面的')
})

test('gate: 移焦是整个画面的镜头，不对准人；窗光、漏光、逆光和「褪成回忆」导演写了就收下', () => {
  const units = ['U1', 'U2', 'U3'].map(id => ({ id, type: 'dialogue', text: id }))
  const script = normalizeScript({
    scene: { light: 'sunbeam', weather: 'dust' }, cast: [],
    lines: [
      { u: 'U1', sp: '林岚', cam: 'rackfocus', camOn: '苏晴' },
      { u: 'U2', sp: '林岚', scene: { light: 'leak' } },
      { u: 'U3', sp: '林岚', cam: 'fadeblack', scene: { light: 'flare', fx: 'fading' } },
    ],
  }, units)
  assert.deepEqual([script.lines.U1.cam, script.lines.U1.camOn], ['rackfocus', undefined])
  assert.equal(script.scene.light, 'sunbeam')
  assert.equal(script.lines.U2.scene.light, 'leak')
  assert.deepEqual([script.lines.U3.scene.light, script.lines.U3.scene.fx], ['flare', 'fading'])
})

// 推完以后脸在画面上的位置：transform: scale(zs) translate(tx, ty)，原点在框中心
const onScreen = (face, aim) => [0, 1].map(i => 50 + aim['--zs'] * (face[i] + parseFloat(aim[i ? '--ty' : '--tx']) - 50))

test('gate: 特写把脸推到画面中上；脸太靠边时推到不出框为止；推近只往那边挪一点；人不在台上时对着中间推', () => {
  const face = [60, 45]
  const close = aimCamera('closeup', face)
  assert.equal(close['--zs'], 1.6)
  assert.deepEqual(onScreen(face, close).map(v => Math.round(v * 10) / 10), CAM_CENTER)

  const edge = aimCamera('closeup', [92, 12])
  const half = 50 / 1.6
  assert.ok(Math.abs(parseFloat(edge['--tx'])) <= 50 - half + 0.01 && Math.abs(parseFloat(edge['--ty'])) <= 50 - half + 0.01, '看到的那一块不出框')
  const [ex, ey] = onScreen([92, 12], edge)
  assert.ok(ex > 50 && ey < CAM_CENTER[1], '靠边的脸停在离中间最近、又不出框的地方')

  const zoom = aimCamera('zoom', [25, 30])
  const [zx] = onScreen([25, 30], zoom)
  assert.ok(zx > 25 && zx < 50, '推近时往说话的人那边靠一点，不推到正中')

  assert.deepEqual(aimCamera('closeup', null), { '--zs': 1.6, '--tx': '0%', '--ty': '0%' })
  assert.equal(aimCamera('shake', face), null, '不对准人的镜头不算')
})

test('gate: 镜头对准谁跟着这一拍走', () => {
  const units = [{ id: 'U1', type: 'dialogue', text: '你来了' }, { id: 'U2', type: 'dialogue', text: '嗯' }]
  const script = { scene: {}, cast: [{ name: '林岚', pos: 'left' }, { name: '苏晴', pos: 'right' }], lines: { U1: { sp: '林岚', cam: 'closeup', camOn: '苏晴' }, U2: { sp: '苏晴', cam: 'zoom' } } }
  const { beats } = buildBeats({ turns: [{ turn: 1, textVersion: 'v1', units, script }], images: [] })
  assert.deepEqual([beats[0].cam, beats[0].camOn], ['closeup', '苏晴'])
  assert.deepEqual([beats[1].cam, beats[1].camOn], ['zoom', undefined])
})
