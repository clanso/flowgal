// 亲密氛围（暧昧 / 亲密）和感官主导的一段（蒙眼、耳边、触碰……）：怎么收、怎么带、什么时候收起。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { normalizeScript, previousBrief } from '../lib/director.js'
import { buildBeats } from '../src/client/theater/playback.js'

const units = ['U1', 'U2', 'U3', 'U4', 'U5'].map(id => ({ id, type: 'dialogue', text: id }))

test('gate: 导演写的氛围和感官：认得的收下，认不出的丢掉；开头没写就是没有', () => {
  const script = normalizeScript({
    scene: { location: '琴房', romance: 'ambiguous', sense: 'perfume' },
    cast: [],
    lines: [
      { u: 'U1', sp: '林岚', scene: { romance: 'intimate', sense: 'ear' } },
      { u: 'U2', sp: '林岚', scene: { romance: 'lewd' } },
      { u: 'U3', sp: '林岚', scene: { sense: 'none', romance: 'none' } },
    ],
  }, units)
  assert.equal(script.scene.romance, 'ambiguous')
  assert.equal(script.scene.sense, 'none', '认不出的感官不演')
  assert.deepEqual(script.lines.U1.scene, { romance: 'intimate', sense: 'ear' })
  assert.equal(script.lines.U2.scene, undefined, '只写了认不出的就是没变')
  assert.deepEqual(script.lines.U3.scene, { sense: 'none', romance: 'none' })
  assert.equal(normalizeScript({ scene: { location: '琴房' }, cast: [], lines: [] }, units).scene.romance, 'none')
})

test('gate: 下一轮还在同一个地方，亲密氛围接着用，感官不带；换了地方都收起；导演看得到上一幕停在什么氛围', () => {
  const previous = normalizeScript({ scene: { location: '琴房' }, cast: [], lines: [{ u: 'U2', sp: '林岚', scene: { romance: 'intimate', sense: 'blind' } }] }, units)
  const same = normalizeScript({ scene: { location: '琴房' }, cast: [], lines: [] }, units, { previous })
  assert.deepEqual([same.scene.romance, same.scene.sense], ['intimate', 'none'])
  const moved = normalizeScript({ scene: { location: '天台' }, cast: [], lines: [] }, units, { previous })
  assert.equal(moved.scene.romance, 'none')
  const brief = previousBrief(previous)
  assert.ok(brief.includes('亲密氛围：intimate') && brief.includes('感官：blind'))
})

test('gate: 氛围从写的那一句起一直在，写 none 收起；换了地方，氛围和感官都收起', () => {
  const script = {
    scene: { location: '琴房', romance: 'ambiguous' },
    cast: [{ name: '林岚', pos: 'left' }],
    lines: {
      U1: { sp: '林岚' },
      U2: { sp: '林岚', scene: { romance: 'intimate', sense: 'ear' } },
      U3: { sp: '林岚', scene: { sense: 'none' } },
      U4: { sp: '林岚', scene: { sense: 'heat' } },
      U5: { sp: '林岚', scene: { location: '走廊' } },
    },
  }
  const { beats } = buildBeats({ turns: [{ turn: 1, textVersion: 'v1', units, script }], images: [] })
  assert.deepEqual(beats.map(b => b.scene.romance), ['ambiguous', 'intimate', 'intimate', 'intimate', 'none'])
  assert.deepEqual(beats.map(b => b.scene.sense), ['none', 'ear', 'none', 'heat', 'none'])
})
