// 电影黑边：严肃的一段一直挂着上下黑边，写 none 收起，换了地方自动收起。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { normalizeScript, previousBrief } from '../lib/director.js'
import { buildBeats } from '../src/client/theater/playback.js'

const units = ['U1', 'U2', 'U3', 'U4', 'U5'].map(id => ({ id, type: 'dialogue', text: id }))

test('gate: 导演写的黑边：on / none，也认 true / false / off，认不出的丢掉；同一个地方跨轮带着', () => {
  const script = normalizeScript({
    scene: { location: '审讯室', bars: true },
    cast: [],
    lines: [
      { u: 'U1', sp: '林岚', scene: { bars: 'off' } },
      { u: 'U2', sp: '林岚', scene: { bars: 'on' } },
      { u: 'U3', sp: '林岚', scene: { bars: 'wide' } },
    ],
  }, units)
  assert.equal(script.scene.bars, 'on')
  assert.deepEqual([script.lines.U1.scene, script.lines.U2.scene, script.lines.U3.scene], [{ bars: 'none' }, { bars: 'on' }, undefined])
  assert.ok(previousBrief(script).includes('电影黑边：on'))
  assert.equal(normalizeScript({ scene: { location: '审讯室' }, cast: [], lines: [] }, units, { previous: script }).scene.bars, 'on')
  assert.equal(normalizeScript({ scene: { location: '天台' }, cast: [], lines: [] }, units, { previous: script }).scene.bars, 'none')
})

test('gate: 黑边从写的那一句起一直挂着，写 none 收起；换了地方自动收起，换地方那一句再写就接着挂', () => {
  const script = {
    scene: { location: '审讯室' },
    cast: [{ name: '林岚', pos: 'left' }],
    lines: {
      U2: { sp: '林岚', scene: { bars: 'on' } },
      U3: { sp: '林岚', scene: { location: '走廊' } },
      U4: { sp: '林岚', scene: { location: '天台', bars: 'on' } },
      U5: { sp: '林岚', scene: { bars: 'none' } },
    },
  }
  const { beats } = buildBeats({ turns: [{ turn: 1, textVersion: 'v1', units, script }], images: [] })
  assert.deepEqual(beats.map(b => b.scene.bars), ['none', 'on', 'none', 'on', 'none'])
})
