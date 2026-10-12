// 漫画式切入：决定性的一句，这个人的脸部特写从侧面冲进来。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { normalizeScript } from '../lib/director.js'
import { bandCrop, CUTIN_FILL, CUTIN_AT } from '../lib/stature.js'
import { MAX_CUTINS_PER_TURN } from '../lib/vocab.js'
import { buildBeats, beatHold, CUTIN_LEAD_MS } from '../src/client/theater/playback.js'

test('gate: 导演写的切入：true 是说话的人，写名字切那个人，写的就是说话人时记成 true；一轮有上限', () => {
  const units = ['U1', 'U2', 'U3', 'U4'].map(id => ({ id, type: 'dialogue', text: id }))
  const script = normalizeScript({
    scene: {}, cast: [],
    lines: [
      { u: 'U1', sp: '林岚', cutin: true },
      { u: 'U2', sp: '林岚', cutin: '苏晴' },
      { u: 'U3', sp: '林岚', cutin: '林岚' },
      { u: 'U4', sp: '林岚', cutin: false },
    ],
  }, units)
  assert.deepEqual(['U1', 'U2', 'U3', 'U4'].map(u => script.lines[u].cutin), [true, '苏晴', true, undefined])

  const many = Array.from({ length: MAX_CUTINS_PER_TURN + 3 }, (_, i) => ({ id: 'U' + (i + 1), type: 'dialogue', text: '句' + i }))
  const crowded = normalizeScript({ scene: {}, cast: [], lines: many.map(u => ({ u: u.id, sp: '林岚', cutin: 'true' })) }, many)
  assert.equal(Object.values(crowded.lines).filter(l => l.cutin).length, MAX_CUTINS_PER_TURN)
})

test('gate: 切入切谁记在这一拍上；旁白没说话的人、短闪回里不切；字等带子冲进来再出', () => {
  const units = [
    { id: 'U1', type: 'dialogue', text: '我决定了' },
    { id: 'U2', type: 'dialogue', text: '我喜欢你' },
    { id: 'U3', type: 'narration', text: '风停了' },
    { id: 'U4', type: 'dialogue', text: '那时候的你' },
  ]
  const script = {
    scene: {}, cast: [{ name: '林岚', pos: 'left' }, { name: '苏晴', pos: 'right' }],
    lines: { U1: { sp: '林岚', cutin: true }, U2: { sp: '林岚', cutin: '苏晴' }, U3: { cutin: true }, U4: { sp: '林岚', cutin: true, recall: true } },
  }
  const { beats } = buildBeats({ turns: [{ turn: 1, textVersion: 'v1', units, script }], images: [] })
  assert.deepEqual(beats.map(b => b.cutin), ['林岚', '苏晴', undefined, undefined])
  const was = { place: beats[1].scene.location, mode: '' }
  assert.deepEqual(beatHold(beats[1], { was }), { ms: CUTIN_LEAD_MS, away: false }, '对话框不让开，字晚一点出')
  assert.equal(beatHold(beats[2], { was }).ms, 0)
})

test('gate: 带子里的脸：脸框撑满带子高度的九成，中心落在带子左边三成、偏下一点', () => {
  const size = [1000, 2000]
  const box = [400, 300, 600, 460]
  const aspect = 4
  const c = bandCrop(box, size, aspect)
  // 换回带子里的坐标量一下：图宽 c.width% × 带宽，左上角在 c.left%、c.top%
  const scale = (c.width / 100) * aspect / size[0] // 每个像素是带子高度的多少
  assert.ok(Math.abs((box[3] - box[1]) * scale - CUTIN_FILL) < 0.01)
  const cx = (c.left / 100) * aspect + ((box[0] + box[2]) / 2) * scale
  const cy = c.top / 100 + ((box[1] + box[3]) / 2) * scale
  assert.ok(Math.abs(cx / aspect - CUTIN_AT[0]) < 0.01 && Math.abs(cy - CUTIN_AT[1]) < 0.01)
  // 认不出脸时按参照立绘估，照样给位置；尺寸不对时不出
  assert.ok(bandCrop(null, size, aspect).width > 0)
  assert.equal(bandCrop(box, null, aspect), null)
})
