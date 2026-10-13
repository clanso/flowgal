// 换场：像 galgame 那样一步一步换过去（playback.js 的 changePlan）
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { changePlan, changePhase, beatHold, buildBeats, COVERS, SCENE_CLEAR_MS, SCENE_CAST_MS, TRANSITION_MS } from '../src/client/theater/playback.js'
import { walkScenes } from '../lib/scenes.js'

const at = (location, more = {}) => ({ key: 't:U2', turn: 1, scene: { location, mood: 'daily', time: 'afternoon' }, mode: '', sceneEnter: true, transition: 'dissolve', ...more })
const phases = plan => plan.steps.map(([name]) => name)

test('溶解换地方：先清场，新背景在旧背景上过渡完，人再上来，停一小拍才出字；换画面在清完场的那一刻', () => {
  const plan = changePlan(at('天台'), { place: '教室', mode: '' })
  assert.deepEqual(phases(plan), ['clear', 'down', 'cast', 'settle'])
  assert.equal(plan.cover, '')
  assert.equal(plan.swap, SCENE_CLEAR_MS)
  assert.equal(plan.total, SCENE_CLEAR_MS + TRANSITION_MS.dissolve + SCENE_CAST_MS + 300)
  assert.equal(changePhase(plan, 0), 'clear')
  assert.equal(changePhase(plan, SCENE_CLEAR_MS + 10), 'down')
  assert.equal(changePhase(plan, plan.total), '', '演完了')
  const slow = changePlan(at('天台', { transition: 'fade' }), { place: '教室', mode: '' })
  assert.ok(slow.total > plan.total, '慢慢变化慢一些')
})

test('黑场：清场 → 暗下去 → 黑里换画面、停一下 → 亮起来 → 人上来；新地方的人和标题不会先在旧画面上冒出来', () => {
  const plan = changePlan(at('第九十九层', { transition: 'black' }), { place: '第九十八层', mode: '' })
  assert.deepEqual(phases(plan), ['clear', 'up', 'hold', 'down', 'cast', 'settle'])
  assert.equal(plan.cover, 'black')
  assert.equal(plan.swap, SCENE_CLEAR_MS + COVERS.black.up, '盖满的那一刻才换')
  assert.equal(changePhase(plan, plan.swap - 1), 'up')
  assert.equal(changePhase(plan, plan.swap), 'hold')
  assert.ok(plan.total >= 3000 && plan.total <= 4000, '整段三秒多，跟大厂「停、黑、起」差不多')
})

test('白闪、闭眼、撕裂是一下子的事：不先清场，人跟着画面一起换；闭眼合上了才换', () => {
  for (const tr of ['flash', 'blink', 'glitch']) {
    const plan = changePlan(at('巢穴', { transition: tr }), { place: '大厅', mode: '' })
    assert.equal(plan.clear, false, tr)
    assert.ok(!phases(plan).includes('clear') && !phases(plan).includes('cast'), tr)
    assert.equal(plan.swap, COVERS[tr].up, tr)
  }
  assert.equal(changePlan(at('巢穴', { transition: 'blink' }), { place: '大厅', mode: '' }).cover, 'lids')
})

test('没有换场的时候不演：直接切、同一个地方、往回翻到已经在画面上的地方、进出回忆的起雾和醒过来另有演法', () => {
  assert.equal(changePlan(at('天台', { transition: 'none' }), { place: '教室', mode: '' }), null)
  assert.equal(changePlan(at('天台'), { place: '天台', mode: '' }), null)
  assert.equal(changePlan({ ...at('天台'), sceneEnter: false }, { place: '教室', mode: '' }), null)
  assert.equal(changePlan(at('音乐教室（三年前）', { mode: 'memory', transition: 'haze' }), { place: '走廊', mode: '' }), null)
  assert.equal(changePlan(at('走廊', { transition: 'dissolve' }), { place: '音乐教室（三年前）', mode: 'memory' }), null, '醒过来')
  assert.equal(beatHold(at('走廊', { transition: 'dissolve' }), { was: { place: '音乐教室（三年前）', mode: 'memory' } }).wake, true)
  // 进梦境（不是回忆）走换场：旋涡盖满了才换
  const dream = changePlan(at('梦里的花海', { mode: 'dream', transition: 'swirl' }), { place: '卧室', mode: '' })
  assert.equal(dream.cover, 'swirl')
})

test('过场字卡：暗下去，字卡在黑里停一会儿，再亮起来；同一个地方也演', () => {
  const plan = changePlan({ ...at('教室', { cut: { kind: 'time', text: '三小时后' } }), sceneEnter: false }, { place: '教室', mode: '' })
  assert.equal(plan.cut, true)
  assert.equal(plan.cover, 'black')
  assert.deepEqual(phases(plan), ['clear', 'up', 'hold', 'down', 'cast', 'settle'])
  assert.ok(plan.steps.find(([n]) => n === 'down')[1] - plan.swap >= 2000, '字卡停够两秒多')
})

test('剧场刚打开：从黑里亮起来，人再上来；导演写了直接切就直接出来', () => {
  const plan = changePlan({ ...at('教室'), sceneEnter: false }, {}, { opening: true })
  assert.equal(plan.opening, true)
  assert.equal(plan.swap, 0, '一开始就是盖满的')
  assert.deepEqual(phases(plan), ['hold', 'down', 'cast', 'settle'])
  assert.equal(changePlan({ ...at('教室'), transition: 'none' }, {}, { opening: true }), null)
  const card = changePlan({ ...at('教室'), cut: { kind: 'chapter', text: '第一章' } }, {}, { opening: true })
  assert.equal(card.cut, true)
  assert.equal(card.up, 0, '开场本来就是黑的，不用再暗下去')
  assert.ok(card.hold >= 2000, '开场的章节字卡也停够')
  assert.equal(beatHold({ ...at('教室'), sceneEnter: false }, { was: {}, opening: true }).away, true)
})

test('按玩家存档：一轮里从第九十八层走到第九十九层（黑场）、第一百层（没写转场按溶解）、昏过去醒在巢穴（闭眼），每一处都演换场', () => {
  const units = ['U1', 'U2', 'U3', 'U4', 'U5', 'U6', 'U7'].map(id => ({ id, type: 'narration', text: id }))
  const script = {
    scene: { location: '第九十八层·崩塌神殿', time: 'dawn', transition: 'black' },
    cast: [{ name: '柯萝伊', pos: 'center' }],
    lines: {
      U3: { scene: { location: '第九十九层·地下宫殿', transition: 'black' } },
      U5: { scene: { location: '第一百层·牛头之间' } },
      U7: { scene: { location: '阿黛尔的巢穴', transition: 'blink' } },
    },
  }
  const { beats } = buildBeats({ turns: [{ turn: 2, textVersion: 'v', units, script }], images: [] })
  const plans = []
  beats.forEach((b, i) => {
    const prev = beats[i - 1]
    const plan = changePlan(b, prev ? { place: prev.scene.location, mode: prev.mode } : {}, { opening: !prev })
    if (plan) plans.push([b.unitId, plan.tr || plan.cover])
  })
  assert.deepEqual(plans, [['U1', 'black'], ['U3', 'black'], ['U5', 'dissolve'], ['U7', 'blink']])
})

test('换场默认的转场：同一时段里走到别处溶解，时段也变了（隔了一段时间）黑场，写了的照写的', () => {
  const start = { scene: { location: '教室', time: 'afternoon' } }
  const steps = walkScenes(start, [
    {},
    { scene: { location: '走廊' } },
    { scene: { location: '天台', time: 'dusk' } },
    { scene: { location: '车站', time: 'night', transition: 'dissolve' } },
    { mode: 'dream', scene: { location: '花田', time: 'morning' } },
    { mode: 'real', scene: { location: '卧室', time: 'morning' } },
  ])
  assert.deepEqual(steps.map(s => s.transition), ['', 'dissolve', 'black', 'dissolve', 'swirl', 'dissolve'])
})
