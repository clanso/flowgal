import test from 'node:test'
import assert from 'node:assert/strict'
import { pausesAfter, typeTimes } from '../lib/typing.js'

const chars = s => Array.from(s)
const gaps = (s, speed = 30) => { const t = typeTimes(chars(s), speed); return t.slice(1).map((v, i) => v - t[i]) }

test('gate: 普通字匀速，第一个字在 0', () => {
  assert.deepEqual(typeTimes(chars('你好啊'), 30), [0, 30, 60])
  assert.deepEqual(typeTimes(chars('你好'), 0), [0, 0])
  assert.deepEqual(typeTimes([], 30), [])
})

test('gate: 逗号短停、句末长停、省略号一个一停', () => {
  // 停顿夹在标点和下一个字之间：“，”照常出现，“你”晚 6 × 30 毫秒
  assert.deepEqual(gaps('那天，你'), [30, 30, 30 + 180])
  assert.deepEqual(gaps('好。再'), [30, 30 + 360])
  assert.deepEqual(gaps('……这'), [30 + 150, 30 + 150])
  // 停顿随字速等比缩放
  assert.deepEqual(gaps('好，再', 60), [60, 60 + 360])
})

test('gate: 连着的标点和收尾引号合成一次停顿，停在最后一个后面', () => {
  assert.deepEqual(pausesAfter(chars('真的？！好'), 30), [0, 0, 0, 360, 0])
  assert.deepEqual(pausesAfter(chars('好。」嗯'), 30), [0, 0, 360, 0])
  assert.deepEqual(pausesAfter(chars('嗯，」好'), 30), [0, 0, 180, 0])
  // 最后一个字后面不用停，时间轴到最后一个字出现就结束
  assert.deepEqual(typeTimes(chars('好。'), 30), [0, 30])
})
