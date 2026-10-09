import test from 'node:test'
import assert from 'node:assert/strict'
import { breathFrame, blinkAt, blinkGap, mouthAt } from '../lib/aa-sprite.js'
import { typeTimes } from '../lib/typing.js'

const BREATH = { steps: [{ frame: 0, ms: 1100 }, { frame: 1, ms: 150 }, { frame: 2, ms: 900 }, { frame: 1, ms: 150 }] }
const BLINK = { sequence: [{ eyes: 'half', ms: 60 }, { eyes: 'closed', ms: 90 }, { eyes: 'half', ms: 60 }], interval_ms: [2000, 5000] }
const LOOP = [{ mouth: 'half', ms: 70 }, { mouth: 'open', ms: 90 }, { mouth: 'half', ms: 70 }, { mouth: 'closed', ms: 70 }]
const talk = (text, extra = {}) => {
  const chars = Array.from(text)
  return { chars, times: typeTimes(chars, 30), speed: 30, startedAt: 1000, done: false, type: 'dialogue', ...extra }
}

test('gate: 呼吸帧按 steps 循环；只有一帧时不呼吸', () => {
  assert.deepEqual([0, 1099, 1100, 1250, 2200, 2300].map(t => breathFrame(BREATH, t)), [0, 0, 1, 2, 1, 0])
  assert.equal(breathFrame({ steps: [{ frame: 0, ms: 1000 }] }, 777), 0)
  assert.equal(breathFrame({ steps: [] }, 500), 0)
})

test('gate: 眨眼半闭 → 闭 → 半闭，眨完返回 null；间隔落在区间内', () => {
  assert.deepEqual([0, 59, 60, 149, 150, 209].map(t => blinkAt(BLINK, t)), ['half', 'half', 'closed', 'closed', 'half', 'half'])
  assert.equal(blinkAt(BLINK, 210), null)
  assert.equal(blinkGap(BLINK, () => 0), 2000)
  assert.equal(blinkGap(BLINK, () => 1), 5000)
})

test('gate: 嘴型只在台词出字时动；打完、旁白、心里话、还没开始都闭嘴', () => {
  const t = talk('你好啊呀')
  assert.equal(mouthAt(LOOP, t, 1000), 'half') // 第一个字出现：从半张开始
  assert.equal(mouthAt(LOOP, t, 1000 + 75), 'open')
  assert.equal(mouthAt(LOOP, t, 1000 + 3 * 30), 'closed') // 最后一个字出现：说完了
  assert.equal(mouthAt(LOOP, t, 999), 'closed')
  assert.equal(mouthAt(LOOP, { ...t, startedAt: NaN }, 1010), 'closed')
  assert.equal(mouthAt(LOOP, { ...t, done: true }, 1010), 'closed')
  assert.equal(mouthAt(LOOP, { ...t, type: 'narration' }, 1010), 'closed')
  assert.equal(mouthAt(LOOP, { ...t, type: 'thought' }, 1010), 'closed')
  assert.equal(mouthAt(LOOP, null, 1010), 'closed')
})

test('gate: 嘴型跟着时间轴的停顿：标点停顿整段闭嘴，下一个字出来重新从半张开口', () => {
  const t = talk('那天晚上，你真的在家吗？')
  const comma = t.times[4] // “，”出现
  const resume = t.times[5] // “你”出现（逗号后停了 180ms）
  assert.equal(resume - comma, 30 + 180)
  assert.equal(mouthAt(LOOP, t, 1000 + comma + 1), 'closed')
  assert.equal(mouthAt(LOOP, t, 1000 + resume - 1), 'closed')
  assert.equal(mouthAt(LOOP, t, 1000 + resume), 'half')
  // 开头的省略号一直闭嘴，“这”出现才开口
  const dots = talk('……这件事')
  assert.equal(mouthAt(LOOP, dots, 1000 + 1), 'closed')
  assert.equal(mouthAt(LOOP, dots, 1000 + dots.times[2] - 1), 'closed')
  assert.equal(mouthAt(LOOP, dots, 1000 + dots.times[2]), 'half')
})
