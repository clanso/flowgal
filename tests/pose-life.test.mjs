// 动作跟着剧情和世界线变（lib/pose-life.js）：动作分本性和处境，剧情跨过前提时收起，设计师跟着复盘；平行世界只带本性。
// 先测纯函数（整理、此刻在不在、导演写的收起、带去别的世界），再测出图和剧场找图的编号，最后用假模型把导演 → 收起 → 复盘 → 剧场走一遍。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  cleanKind, cleanNeeds, cleanSituList, applySitu, poseLife, liveSheet, offPoses, lineCtx, unitOrder,
  keepLife, linkNeeds, worldCarry, lifeText, unlabeled, retirable, missingNeeds,
} from '../lib/pose-life.js'
import { poseWalker, tokenFor, parseToken, poseFor, slotKey, slotKeys, fullSheet, sheetOf } from '../lib/poses.js'
import { reviseActing, actingBrief, cleanActing } from '../lib/acting.js'
import { castBrief, normalizeScript } from '../lib/director.js'
import { variantKey } from '../lib/look.js'
import { createStore } from '../lib/dsh/store.js'
import { createEngine } from '../lib/engine.js'
import { buildBeats } from '../src/client/theater/playback.js'
import { roleText, rulesText, userText } from './roles.mjs'

// 柯萝伊：平时双手轻握身前；还在找阿黛尔时，一难过就攥紧胸前的坠子（靠剧情）；诅咒纹会疼时缩肩护着左腕（靠长期状态）
const PREMISE = '还在找阿黛尔，坠子是两人唯一的联系'
const SHEET = () => ({
  designed: true,
  poses: [
    { id: 'p1', label: '双手轻握身前', kind: 'self', emotions: ['neutral', 'smile', 'happy'] },
    { id: 'p2', label: '握紧胸前坠子', kind: 'situ', premise: PREMISE, emotions: ['sad', 'worried'] },
    { id: 'p3', label: '缩肩护着左腕', kind: 'situ', premise: '诅咒纹还在、会疼', needs: [{ name: '诅咒纹', tags: 'curse mark, glowing tattoo' }], emotions: ['scared'] },
  ],
})
const OFF = { turn: 2, at: 'U2', on: false, why: '和阿黛尔重逢', by: 'ai', src: 'director' }
const ORDER = unitOrder([{ id: 'U1' }, { id: 'U2' }, { id: 'U3' }])

test('gate: 整理：本性 / 处境中文也认；靠的状态去重；导演写的 situ 只收写了名字和变化的，同一个动作不会又收又放', () => {
  assert.deepEqual(['self', '本性', 'situ', '处境', 'x', ''].map(cleanKind), ['self', 'self', 'situ', 'situ', '', ''])
  assert.deepEqual(cleanNeeds(['秘银项链', { name: '秘银项链' }, { name: '诅咒纹', tags: 'curse mark' }]), [{ name: '秘银项链' }, { name: '诅咒纹', tags: 'curse mark' }])
  assert.deepEqual(cleanSituList([
    { name: '柯萝伊', off: ['p2', 'p2', 'a|b'], on: ['p2', 'p4'], why: '和阿黛尔重逢' },
    { name: '柯萝伊', off: ['p3'] }, // 同一个人只收第一条
    { name: '阿黛尔' }, // 什么都没写
    { off: ['p1'] }, // 没写名字
  ]), [{ name: '柯萝伊', off: ['p2', 'ab'], on: ['p4'], why: '和阿黛尔重逢' }])
  assert.deepEqual(cleanSituList({ name: '柯萝伊', why: '和阿黛尔和好了' }), [{ name: '柯萝伊', why: '和阿黛尔和好了' }], '只写了原因也收（处境转了，设计师复盘）')
  assert.equal(unlabeled({ poses: [{ id: 'p1' }, { id: 'p2' }] }), true)
  assert.equal(unlabeled(SHEET()), false)
  assert.deepEqual(SHEET().poses.map(retirable), [false, true, true], '本性的不收，处境的和没标的收')
})

test('gate: 导演写的收起记在动作上：本性的不收、认不出的不记、动作名也认；重新整理这一轮先去掉上次导演记的，玩家记的留着', () => {
  const acting = SHEET()
  const lines = [{ id: 'U1', situ: [] }, { id: 'U2', situ: [{ name: '柯萝伊', off: ['p1', '握紧胸前坠子', 'p9'], why: '和阿黛尔重逢' }, { name: '阿黛尔', off: ['p2'] }] }]
  const changes = applySitu(acting, '柯萝伊', 2, lines)
  assert.deepEqual(changes, [{ at: 'U2', off: ['p2'], on: [], why: '和阿黛尔重逢' }])
  assert.deepEqual(acting.poses[1].life, [OFF])
  assert.equal(acting.poses[0].life, undefined, '本性动作不收')
  // 玩家在人物志里手动放回过一次；重新整理第 2 轮、导演这次没写：导演那条去掉，玩家那条留着
  acting.poses[1].life.push({ turn: 2, at: 'U3', on: true, why: '', by: 'user', src: 'user' })
  assert.deepEqual(applySitu(acting, '柯萝伊', 2, [{ id: 'U2', situ: [] }]), [])
  assert.deepEqual(acting.poses[1].life.map(e => e.src), ['user'])
  // 只写了原因：这一轮这个人的处境转了，交给设计师复盘
  assert.deepEqual(applySitu(SHEET(), '柯萝伊', 3, [{ id: 'U1', situ: [{ name: '柯萝伊', why: '离开了村子' }] }]), [{ at: 'U1', off: [], on: [], why: '离开了村子' }])
})

test('gate: 此刻在不在：从收起那一句起不在；回忆、梦里照旧；重新整理这一轮时导演上次记的不算；放回、玩家撤回、玩家后写的都认', () => {
  const p2 = { ...SHEET().poses[1], life: [OFF] }
  const at = (turn, index, extra = {}) => poseLife(p2, { turn, index, order: ORDER, ...extra })
  assert.equal(at(1, Infinity).live, true, '更早的轮次照旧')
  assert.equal(at(2, 0).live, true, '那一句之前照旧')
  assert.deepEqual(at(2, 1), { live: false, why: 'off', event: OFF })
  assert.equal(at(5, -1).live, false, '之后的轮次一直收着')
  assert.equal(lifeText(at(2, 1), p2), '第 2 轮起收起：和阿黛尔重逢')
  assert.equal(at(3, 0, { segment: true }).live, true, '回忆、梦里还是那时候的处境')
  assert.equal(at(2, -1, { before: true }).live, true, '导演重新整理第 2 轮：上次记的这一轮的收起不算（这次重写）')
  assert.equal(at(3, -1, { before: true }).live, false, '整理第 3 轮时第 2 轮的照算')
  // 又分开了：第 4 轮放回
  const back = { ...p2, life: [OFF, { turn: 4, at: 'U1', on: true, why: '又分开了', by: 'ai', src: 'director' }] }
  assert.deepEqual([3, 4].map(turn => poseLife(back, { turn, index: Infinity, order: ORDER }).live), [false, true])
  // 玩家撤回了那一条；同一句上玩家写的算后写的
  assert.equal(poseLife({ ...p2, life: [{ ...OFF, dropped: true }] }, { turn: 3 }).live, true)
  assert.equal(poseLife({ ...p2, life: [{ ...OFF, by: 'user', on: true, src: 'user' }, OFF] }, { turn: 2, index: 1, order: ORDER }).live, true)
  // 不知道单元顺序（导演的档案里看一轮开头）：写在那一轮中间算 0
  assert.equal(poseLife(p2, { turn: 2, index: -1 }).live, true)
})

test('gate: 靠的长期状态：名字包含、或者记下的 tag 对得上就算还在；不给状态不看；从哪一句起才有的、复盘时才放进来的情绪在那之前不算', () => {
  const p3 = SHEET().poses[2]
  assert.equal(poseLife(p3, { turn: 1, states: [{ name: '左腕的诅咒纹' }] }).live, true, '名字包着')
  assert.equal(poseLife(p3, { turn: 1, states: [{ name: '黑色刺青', tags: 'glowing tattoo, forearm' }] }).live, true, '导演改了状态名，tag 对得上')
  assert.deepEqual(poseLife(p3, { turn: 1, states: [{ name: '秘银项链' }] }), { live: false, why: 'needs', missing: ['诅咒纹'] })
  assert.equal(lifeText(poseLife(p3, { turn: 1, states: [] }), p3), '长期状态里没有「诅咒纹」')
  assert.equal(poseLife(p3, { turn: 1, states: null }).live, true, '设置里关了：不看')
  assert.deepEqual(missingNeeds(p3, [{ name: '诅咒纹' }]), [])

  const sheet = SHEET()
  sheet.poses[0] = { ...sheet.poses[0], emotions: [...sheet.poses[0].emotions, 'sad'], joins: { sad: { turn: 2, at: 'U2' } } }
  sheet.poses.push({ id: 'p4', label: '指尖轻碰坠子微笑', kind: 'situ', emotions: ['love'], from: { turn: 2, at: 'U2' } })
  sheet.poses[1].life = [OFF]
  const ids = live => live.poses.map(p => [p.id, p.emotions.join(' ')])
  const states = [{ name: '诅咒纹' }]
  assert.deepEqual(ids(liveSheet(sheet, { turn: 1, index: Infinity, states })), [['p1', 'neutral smile happy'], ['p2', 'sad worried'], ['p3', 'scared']], '第 1 轮：坠子还在，难过还没放进 p1，p4 还没有')
  assert.equal(lifeText(poseLife(sheet.poses[3], { turn: 1 }), sheet.poses[3]), '第 2 轮起才有')
  const after = liveSheet(sheet, { turn: 2, index: 1, order: ORDER, states })
  assert.deepEqual(ids(after), [['p1', 'neutral smile happy sad'], ['p3', 'scared'], ['p4', 'love']])
  assert.equal(after.full, sheet.poses, '整套带着（差分编号、主动作按整套算）')
  assert.deepEqual(offPoses(after), ['p2'])
  assert.equal(liveSheet(SHEET(), { turn: 1, states }).poses.length, 3)
  const same = SHEET()
  assert.equal(liveSheet(same, { turn: 9, states }), same, '什么都没变：原样')
  const groups = { poses: [{ id: 'g1', emotions: ['neutral'], life: [OFF] }], designed: false }
  assert.equal(liveSheet(groups, { turn: 9 }), groups, '通用动作组不收')
  // 平静原来那个动作收起了：站到还在的第一个动作上
  const first = { designed: true, poses: [{ id: 'p1', kind: 'situ', emotions: ['neutral', 'sad'], life: [OFF] }, { id: 'p2', kind: 'self', emotions: ['smile'] }] }
  assert.deepEqual(ids(liveSheet(first, { turn: 3 })), [['p2', 'smile neutral']])
  // 全都用不了：留第一个
  assert.deepEqual(ids(liveSheet({ designed: true, poses: [first.poses[0]] }, { turn: 3 })), [['p1', 'neutral sad']])
})

test('gate: 一句里的 ctx：回忆、梦、短闪回里算段落；设置里关了长期状态不看', () => {
  const person = { name: '柯萝伊' }
  assert.deepEqual(lineCtx(person, { turn: 2, index: 1, order: ORDER }), { turn: 2, index: 1, order: ORDER, states: null, segment: false })
  assert.equal(lineCtx(person, { turn: 2, index: 1, layer: { mode: 'memory' } }).segment, true)
  assert.equal(lineCtx(person, { turn: 2, index: 1, layer: { recall: { from: 'U1' } } }).segment, true)
  assert.equal(lineCtx(person, { turn: 2, index: 1, layer: { mode: '' } }).segment, false)
})

test('gate: 出图和剧场找图：收起后留在当前动作只换脸写「情绪@动作!」；编号按整套算，早先在坠子上画的那张留给坠子；收起了的动作上的图不拿来顶', () => {
  const full = SHEET()
  full.poses[1].life = [OFF]
  const live = liveSheet(full, { turn: 2, index: 1, order: ORDER })
  // 难过原来在坠子上（收起了）：剧场让她留在 p1，画「难过@p1!」
  assert.equal(tokenFor(live, 'sad', 'p1'), 'sad@p1!')
  assert.deepEqual(parseToken('sad@p1!'), { emotion: 'sad', pose: 'p1', force: true })
  assert.deepEqual(parseToken('sad@p1'), { emotion: 'sad', pose: 'p1' })
  assert.equal(tokenFor(live, 'smile', 'p1'), 'smile', '主动作上的照旧')
  assert.equal(tokenFor(full, 'sad', 'p2'), 'sad', '整套里难过的主动作就是坠子')
  assert.equal(poseFor(full, 'sad', 'p1', [], true).id, 'p1', '「!」：就在这个动作上')
  assert.equal(poseFor(full, 'sad', 'p1').id, 'p2', '不带「!」：难过演不了 p1，回主动作')

  const look = { appearance: '1girl, silver hair', outfit: '', states: [] }
  const bare = variantKey(look, 'sad')
  const drawn = { [bare]: { assetId: 'a1', poseId: 'p2' } }
  assert.equal(slotKey(drawn, look, live, 'p1', 'sad'), variantKey(look, 'sad', 'p1'), 'p1 上的难过另存，坠子上那张留着')
  assert.equal(slotKey(drawn, look, full, 'p2', 'sad'), bare, '重演更早的轮次：还是坠子上那张')
  assert.ok(slotKeys(drawn, look, live, 'p1', 'sad').includes(bare), '不告诉它收起了哪些：照旧退到坠子那张')
  assert.ok(!slotKeys(drawn, look, live, 'p1', 'sad', [], { off: ['p2'] }).includes(bare), '收起了：不退到坠子上那张（用替身的表情）')
  // 带去别的世界时没带的编号：那些编号画的图是别的世界的动作
  const carried = { poses: [{ id: 'p1', emotions: ['neutral', 'sad'] }], designed: true, usedIds: ['p2'] }
  assert.equal(slotKey(drawn, look, carried, 'p1', 'sad'), variantKey(look, 'sad', 'p1'))
  assert.equal(slotKey(drawn, look, { poses: carried.poses, designed: true }, 'p1', 'sad'), bare, '老存档（没记用过的编号）照旧')
  assert.deepEqual(sheetOf({ acting: { poses: carried.poses, usedIds: ['p2'] } }).usedIds, ['p2'])
  assert.equal(fullSheet(live).poses, full.poses)

  // 剧场一句一句走：她攥着坠子难过；坠子收起的那一句，站着的动作没了，换到还在的动作上
  let sheet = full
  const walker = poseWalker(() => sheet)
  sheet = liveSheet(full, { turn: 2, index: 0, order: ORDER })
  assert.equal(walker.step('柯萝伊', 'sad'), 'p2')
  assert.equal(walker.settle('柯萝伊'), '', '还在：不动')
  sheet = live
  assert.equal(walker.settle('柯萝伊'), 'p1')
  assert.equal(walker.get('柯萝伊'), 'p1')
  assert.deepEqual(walker.names(), ['柯萝伊'])
})

test('gate: 导演的角色档案：处境动作写前提和靠的状态；收起了的列在后面，写为什么；关掉时不写；重新整理这一轮时上次记的收起不算', () => {
  const person = { name: '柯萝伊', appearance: '1girl', acting: { poses: SHEET().poses.map((p, i) => (i === 1 ? { ...p, life: [OFF] } : p)) }, states: [{ name: '诅咒纹' }] }
  const third = castBrief([person], { turn: 3, situ: true })
  assert.match(third, /p1 双手轻握身前（平静、微笑、开心） \/ p3 缩肩护着左腕［处境：诅咒纹还在、会疼；靠 诅咒纹］（害怕）；收起了的：p2 握紧胸前坠子［第 2 轮起收起：和阿黛尔重逢］/)
  assert.match(castBrief([person], { turn: 2, situ: true }), new RegExp(`p2 握紧胸前坠子［处境：${PREMISE}］（难过、担心）`), '重新整理第 2 轮：上次记的不算')
  const off = castBrief([person], { turn: 3, situ: false })
  assert.doesNotMatch(off, /处境|收起了的|p2/, '关了：不写处境，收起了的也不列')
  // 诅咒解了：靠的状态没了的也算收起；设置里关了「靠的长期状态没了自动收起」时照列
  const healed = { ...person, states: [] }
  assert.match(castBrief([healed], { turn: 3, situ: true }), /收起了的：.*p3 缩肩护着左腕［长期状态里没有「诅咒纹」］/)
  assert.match(castBrief([healed], { turn: 3, situ: true, needs: false }), /p3 缩肩护着左腕［处境/)

  const units = [{ id: 'U1', type: 'narration', text: '门开了。' }, { id: 'U2', type: 'dialogue', text: '“阿黛尔！”' }]
  const script = normalizeScript({ cast: [{ name: '柯萝伊' }], lines: [{ u: 'U2', sp: '柯萝伊', emo: 'happy', situ: [{ name: '柯萝伊', off: ['p2'], on: 'p4', why: '和阿黛尔重逢' }] }] }, units)
  assert.deepEqual(script.lines.U2.situ, [{ name: '柯萝伊', off: ['p2'], on: ['p4'], why: '和阿黛尔重逢' }])
})

test('gate: 设计师复盘 / 到了新世界 / 给老设计标：情绪重新安家记着从哪一句起，新动作避开别的世界用过的编号，本性的不收', () => {
  const sheet = cleanActing({ read: '温柔、怕给人添麻烦', poses: SHEET().poses })
  assert.deepEqual(sheet.poses.map(p => [p.id, p.kind || '']), [['p1', 'self'], ['p2', 'situ'], ['p3', 'situ']])
  // 复盘：难过放进 p1、新动作装爱意；设计师说 p1 也要收起（本性的不收）
  const from = { turn: 2, at: 'U2' }
  const review = reviseActing(sheet, {
    poses: [{ id: 'p1', emotions: ['sad'] }, { id: 'new1', label: '指尖轻碰坠子微笑', kind: 'situ', premise: '和阿黛尔团聚了，坠子成了纪念', tags: 'touching own necklace', emotions: ['love'] }],
    faces: [{ emotion: 'love', desc: '眼里带笑', tags: 'gentle smile, half-closed eyes' }],
    off: ['p1', 'p3'], why: '诅咒也解了', now: '团聚以后不再攥着坠子', read: '复盘不改本性',
  }, { task: 'review', from })
  assert.deepEqual(review.sheet.poses.find(p => p.id === 'p1').emotions, ['neutral', 'smile', 'happy', 'sad'])
  assert.deepEqual(review.sheet.poses.find(p => p.id === 'p1').joins, { sad: from })
  assert.deepEqual(review.sheet.poses.at(-1), { id: 'p4', label: '指尖轻碰坠子微笑', desc: '', tags: 'touching own necklace', kind: 'situ', premise: '和阿黛尔团聚了，坠子成了纪念', emotions: ['love'], from })
  assert.deepEqual([review.off, review.why, review.sheet.now, review.sheet.read], [['p3'], '诅咒也解了', '团聚以后不再攥着坠子', '温柔、怕给人添麻烦'])
  assert.ok(review.touched.has('love'))
  assert.deepEqual(sheet.poses[0].emotions, ['neutral', 'smile', 'happy'], '原设计不动')

  // 新世界：坠子在这里不成立（去掉，编号记着），设计这个世界的处境动作
  const world = reviseActing({ ...sheet, usedIds: ['p5'] }, { drop: ['p2', 'p9'], poses: [{ id: 'new1', label: '提着裙摆小跑', kind: 'situ', premise: '在王城当侍女', emotions: ['worried'] }], read: '温柔', now: '在王城当侍女' }, { task: 'world', from })
  assert.deepEqual(world.sheet.poses.map(p => p.id), ['p1', 'p3', 'p4'], '新动作不用 p2（去掉的）、p5（别的世界用过的）')
  assert.deepEqual(world.sheet.usedIds, ['p5', 'p2'])
  assert.equal(world.sheet.poses.at(-1).from, undefined, '到了新世界的动作从一开始就有')
  assert.deepEqual([world.sheet.read, world.sheet.now], ['温柔', '在王城当侍女'])
  assert.equal(reviseActing(sheet, { drop: ['p1', 'p2', 'p3'] }, { task: 'world' }).sheet, null)

  // 老设计：标本性和处境，靠的状态写名字
  const old = cleanActing({ poses: SHEET().poses.map(({ kind, premise, needs, ...p }) => p) })
  assert.equal(unlabeled(old), true)
  const label = reviseActing(old, { poses: [{ id: 'p1', kind: '本性', premise: '不收' }, { id: 'p2', kind: 'situ', premise: PREMISE, needs: ['秘银项链'] }], read: '温柔', now: '在找阿黛尔' }, { task: 'label' })
  assert.deepEqual(label.sheet.poses.map(p => [p.id, p.kind || '', p.premise || '', (p.needs || []).map(n => n.name).join()]), [['p1', 'self', '', ''], ['p2', 'situ', PREMISE, '秘银项链'], ['p3', '', '', '']])
  assert.deepEqual([label.sheet.read, label.sheet.now], ['温柔', '在找阿黛尔'])
  // 靠的状态记下 tag（导演之后改了状态名也认得出）
  linkNeeds(label.sheet, { timeline: { states: [{ list: [{ name: '秘银项链', tags: 'silver necklace, pendant' }] }] } })
  assert.deepEqual(label.sheet.poses[1].needs, [{ name: '秘银项链', tags: 'silver necklace, pendant' }])

  // 给设计师看的已有设计：写明此刻收起了
  const brief = actingBrief({ ...sheet, poses: sheet.poses.map(p => (p.id === 'p2' ? { ...p, life: [OFF] } : p)), now: '还在找阿黛尔' }, [], { ctx: { turn: 3, states: [{ name: '诅咒纹' }] } })
  assert.match(brief, /表演笔记·本性：温柔、怕给人添麻烦\n表演笔记·这一局：还在找阿黛尔/)
  assert.match(brief, new RegExp(`- p2「握紧胸前坠子」［处境：${PREMISE}］：.*（现在第 2 轮起收起：和阿黛尔重逢）`))
  assert.match(brief, /- p3「缩肩护着左腕」［处境：诅咒纹还在、会疼；靠 诅咒纹］/)
  assert.match(brief, /- p1「双手轻握身前」［本性］/)
})

test('gate: 写回时收起记录以存着的为准，这次复盘的另记；平行世界只带本性动作，不带这一局的笔记和记录', () => {
  const stored = SHEET()
  stored.poses[1].life = [OFF]
  stored.poses[0].joins = { sad: { turn: 2, at: 'U2' }, cry: { turn: 2, at: 'U2' } }
  const next = { poses: SHEET().poses.map(p => (p.id === 'p1' ? { ...p, emotions: [...p.emotions, 'sad'] } : p)) }
  keepLife(next, stored, [{ pose: 'p3', turn: 2, at: 'U3', on: false, why: '诅咒也解了', by: 'ai', src: 'review' }])
  assert.deepEqual(next.poses[1].life, [OFF], '设计师拿的是旧的一份：导演刚记的不丢')
  assert.deepEqual(next.poses[2].life, [{ turn: 2, at: 'U3', on: false, why: '诅咒也解了', by: 'ai', src: 'review' }])
  assert.deepEqual(next.poses[0].joins, { sad: { turn: 2, at: 'U2' } }, '已经不在这个动作里的情绪不记')

  const acting = { ...SHEET(), read: '温柔', now: '还在找阿黛尔', nowTurn: 3 }
  acting.poses.push({ id: 'p4', label: '老设计没标的', emotions: ['shy'], life: [OFF], from: { turn: 1, at: '' }, joins: { shy: { turn: 1, at: '' } } })
  const carry = worldCarry(acting)
  assert.deepEqual(carry.poses.map(p => p.id), ['p1', 'p4'], '处境的留在这一局；没标的带上，到了新世界让设计师标')
  assert.deepEqual(carry.usedIds, ['p2', 'p3'])
  assert.equal(carry.read, '温柔')
  assert.ok(!('now' in carry) && !('nowTurn' in carry))
  assert.deepEqual(carry.poses[1], { id: 'p4', label: '老设计没标的', emotions: ['shy'] })
  assert.equal(worldCarry({ poses: [SHEET().poses[1]] }), null, '只有处境动作：什么都不带')
})

// ───────────────────────── 引擎：导演收起 → 设计师复盘 → 剧场一句一句换 ─────────────────────────

function fakeTavern() {
  const turns = new Map()
  const items = new Map()
  let seq = 0
  return {
    apiVersion: 1, turns,
    async attach({ gameId, turn, textVersion, item }) { const id = 'm' + ++seq; items.set(id, { id, gameId, turn, textVersion, ...item, current: true }); return { id } },
    async update(id, changes) { Object.assign(items.get(id), changes) },
    async remove(id) { return items.delete(id) },
    async list({ gameId }) { return [...items.values()].filter(i => i.gameId === gameId) },
    async getTurn({ gameId, turn }) { return turns.get(gameId + ':' + turn) || null },
    async getCardContext() { return { description: '柯萝伊：银发的少女，一直在找失散的姐姐阿黛尔。', personality: '', scenario: '', lore: [] } },
    async backgroundModel() { return { provider: 'fake', model: 'fake-1' } },
  }
}
function fakeLlm(answer) {
  const calls = []
  return { calls, stream(request) { calls.push(request); const text = answer(request); return (async function* () { yield { type: 'text-delta', text }; yield { type: 'finish', reason: { kind: 'stop' } } })() } }
}
const isActingWriter = request => roleText(request).includes('你是视觉小说的角色表演设计师')
const isDirector = request => !isActingWriter(request) && !roleText(request).includes('立绘设计师')

test('gate: 引擎：导演在重逢那一句收起坠子 → 设计师复盘（难过搬回双手轻握、加新动作）→ 剧场从那一句起换；更早的轮次重演照旧；下一轮导演看得到收起了的', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'flowgal-pose-life-'))
  try {
    const store = createStore(dir)
    const tavern = fakeTavern()
    const TURNS = [
      { text: '柯萝伊望着窗外。\n“阿黛尔，你到底在哪里……”', lines: [{ u: 'U2', sp: '柯萝伊', emo: 'sad' }] },
      {
        text: '“又是一个人的早晨……”\n“阿黛尔！你回来了！”\n“我好想你……”',
        lines: [
          { u: 'U1', sp: '柯萝伊', emo: 'sad' },
          { u: 'U2', sp: '柯萝伊', emo: 'happy', situ: [{ name: '柯萝伊', off: ['p2'], why: '和阿黛尔重逢' }] },
          { u: 'U3', sp: '柯萝伊', emo: 'sad' },
        ],
      },
      { text: '“今天也一起去市集吧。”', lines: [{ u: 'U1', sp: '柯萝伊', emo: 'love' }] },
    ]
    const REVIEW = {
      poses: [{ id: 'p1', emotions: ['sad'] }, { id: 'new1', label: '指尖轻碰坠子微笑', kind: 'situ', premise: '和阿黛尔团聚了，坠子成了纪念', tags: 'touching own necklace', emotions: ['love'] }],
      faces: [{ emotion: 'love', desc: '眼里带笑', tags: 'gentle smile' }],
      now: '和阿黛尔团聚以后，不再攥着坠子',
    }
    const llm = fakeLlm(request => {
      if (isActingWriter(request)) return userText(request).includes('处境在第') ? JSON.stringify(REVIEW) : '{}'
      if (!isDirector(request)) return '{}'
      // 导演：按这一轮正文认是哪一轮（之前的剧情也在提示词里，从后往前认）
      const i = [2, 1, 0].find(k => userText(request).includes(TURNS[k].text.split('\n').at(-1)))
      return JSON.stringify({ scene: { location: '小屋', time: 'morning' }, cast: [{ name: '柯萝伊', pos: 'center' }], lines: TURNS[i].lines, summary: '第' + (i + 1) + '轮' })
    })
    const engine = createEngine({ store, services: { tavern, llm }, logger: { warn() {}, info() {} } })
    await engine.patchConfig({ images: { auto: false, backgrounds: false } })
    await engine.castAction('g', 'save', { name: '柯萝伊', patch: { appearance: '1girl, silver hair', gender: 'female' } })
    // 引擎这边只测剧情上的收起（靠长期状态的上面测过了）：护着左腕不挂诅咒纹
    await engine.castAction('g', 'acting-save', { name: '柯萝伊', acting: { poses: SHEET().poses.map(({ needs, ...p }) => p) } })
    const view = async () => { const v = await engine.gameView('g'); return { v, p: v.cast.find(x => x.name === '柯萝伊') } }
    const until = async (done, what) => {
      for (const end = Date.now() + 6000; ;) {
        const got = await view()
        if (got.p && done(got.p)) return got
        if (Date.now() > end) throw new Error('等太久：' + what)
        await new Promise(r => setTimeout(r, 20))
      }
    }
    const play = async n => {
      const turn = { gameId: 'g', turn: n, textVersion: 'v' + n, text: TURNS[n - 1].text, card: { name: '柯萝伊' } }
      tavern.turns.set('g:' + n, turn)
      await engine.onTurnSettled(turn)
    }
    await play(1)
    await play(2)
    // 导演第 2 轮看到的：处境动作写着前提；说明了 situ 怎么写
    const second = llm.calls.filter(isDirector)[1]
    assert.match(userText(second), new RegExp(`p2 握紧胸前坠子［处境：${PREMISE}］`))
    assert.match(rulesText(second), /situ 动作跟着处境走/)

    // 收起记在坠子上；设计师复盘：难过从重逢那一句起放进双手轻握，新动作从那一句起才有，这一局的笔记重写
    let { p } = await until(x => x.acting.now, '设计师复盘')
    assert.deepEqual(p.acting.poses.find(x => x.id === 'p2').life, [OFF])
    const p1 = p.acting.poses.find(x => x.id === 'p1')
    assert.ok(p1.emotions.includes('sad'))
    assert.deepEqual(p1.joins, { sad: { turn: 2, at: 'U2' } })
    assert.deepEqual(p.acting.poses.at(-1), { id: 'p4', label: '指尖轻碰坠子微笑', desc: '', tags: 'touching own necklace', kind: 'situ', premise: '和阿黛尔团聚了，坠子成了纪念', emotions: ['love'], from: { turn: 2, at: 'U2' } })
    assert.equal(p.acting.now, '和阿黛尔团聚以后，不再攥着坠子')
    const reviewCall = llm.calls.filter(isActingWriter).find(c => userText(c).includes('处境在第'))
    assert.match(userText(reviewCall), /这个人的处境在第 2 轮变了：\n- 「阿黛尔！你回来了！」这一句起：收起 p2「握紧胸前坠子」（和阿黛尔重逢）/)
    assert.match(userText(reviewCall), /- p2「握紧胸前坠子」［处境：[^］]*］：.*（现在第 2 轮起收起：和阿黛尔重逢）/)
    assert.match(userText(reviewCall), /【要设计的情绪】[\s\S]*- sad（难过）/)
    const log = (await engine.directorLog('g')).entries.filter(e => e.kind === 'acting').map(e => e.summary)
    assert.deepEqual(log, ['动作与表情 · 柯萝伊：复盘（第 2 轮）'])

    // 第 3 轮：导演看得到收起了的那个和新动作
    await play(3)
    const third = userText(llm.calls.filter(isDirector)[2])
    assert.match(third, /p4 指尖轻碰坠子微笑［处境：和阿黛尔团聚了，坠子成了纪念］（心动）/)
    assert.match(third, /收起了的：p2 握紧胸前坠子［第 2 轮起收起：和阿黛尔重逢］/)

    // 剧场：第 1 轮重演照旧攥着坠子难过；第 2 轮重逢那一句起换到双手轻握，之后难过也在那里；第 3 轮的爱意在新动作上
    ;({ p } = await view())
    const v = (await view()).v
    const { beats } = buildBeats({ turns: v.turns, images: [], cast: v.cast, emotions: v.emotions, poseGroups: v.poseGroups, situNeeds: v.situNeeds })
    const said = beats.filter(b => b.speaker === '柯萝伊')
    assert.deepEqual(said.map(b => [b.turn, b.unitId, b.postures?.柯萝伊]), [[1, 'U2', 'p2'], [2, 'U1', 'p2'], [2, 'U2', 'p1'], [2, 'U3', 'p1'], [3, 'U1', 'p4']])
    assert.deepEqual(said[2].offPoses?.柯萝伊, ['p2'])
    // 找图：第 2 轮双手轻握上的难过另存一张，第 1 轮坠子上画的那张留给坠子
    const look = { appearance: '1girl, silver hair', outfit: '', states: [] }
    const drawn = { [variantKey(look, 'sad')]: { assetId: 'a1', poseId: 'p2' } }
    const sheet = sheetOf(p)
    assert.equal(slotKey(drawn, look, sheet, said[0].postures.柯萝伊, 'sad'), variantKey(look, 'sad'))
    assert.equal(slotKey(drawn, look, sheet, said[3].postures.柯萝伊, 'sad'), variantKey(look, 'sad', 'p1'))
    assert.ok(!slotKeys(drawn, look, sheet, 'p1', 'sad', [], { off: said[3].offPoses.柯萝伊 }).includes(variantKey(look, 'sad')))

    // 人物志里撤回这一条：坠子回来，剧场照旧攥着
    await engine.castAction('g', 'pose-life-drop', { name: '柯萝伊', pose: 'p2', index: 0, dropped: true })
    ;({ p } = await view())
    assert.equal(p.acting.poses.find(x => x.id === 'p2').life[0].dropped, true)
    const again = buildBeats({ turns: v.turns, images: [], cast: [p], emotions: v.emotions, poseGroups: v.poseGroups }).beats.filter(b => b.speaker === '柯萝伊')
    assert.equal(again[1 + 1].offPoses, undefined, '没有收起的了')
    engine.dispose()
  } finally {
    await rm(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 })
  }
})

test('gate: 引擎：提升为全局只带本性动作；新开一局时设计师按这个世界设计处境动作，新动作不占别的世界用过的编号，全局库不跟着变', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'flowgal-pose-world-'))
  try {
    const store = createStore(dir)
    const tavern = fakeTavern()
    const WORLD = {
      poses: [{ id: 'p1', kind: 'self' }, { id: 'new1', label: '提着裙摆小跑', kind: 'situ', premise: '在王城当侍女，总在赶时间', tags: 'holding skirt, running', emotions: ['worried', 'sad'] }],
      faces: [{ emotion: 'worried', desc: '眉头轻轻皱着', tags: 'worried, furrowed brow' }],
      read: '温柔、怕给人添麻烦', now: '在王城当侍女，没有失散的姐姐',
    }
    const llm = fakeLlm(request => {
      if (isActingWriter(request)) return userText(request).includes('从别的世界') ? JSON.stringify(WORLD) : '{}'
      if (!isDirector(request)) return '{}'
      return JSON.stringify({ scene: { location: '王城', time: 'morning' }, cast: [{ name: '柯萝伊', pos: 'center' }], lines: [{ u: 'U1', sp: '柯萝伊', emo: 'worried' }], summary: '王城的早晨' })
    })
    const engine = createEngine({ store, services: { tavern, llm }, logger: { warn() {}, info() {} } })
    await engine.patchConfig({ images: { auto: false, backgrounds: false } })
    await engine.castAction('a', 'save', { name: '柯萝伊', patch: { appearance: '1girl, silver hair', gender: 'female' } })
    await engine.castAction('a', 'acting-save', { name: '柯萝伊', acting: { poses: SHEET().poses.map(({ needs, ...p }) => p) } })
    await engine.castAction('a', 'promote', { name: '柯萝伊' })
    const held = (await engine.gameView('a')).cast.find(x => x.name === '柯萝伊')
    assert.deepEqual(held.acting.poses.map(p => p.id), ['p1', 'p2', 'p3'], '原来那一局的处境动作留着')

    const turn = { gameId: 'b', turn: 1, textVersion: 'v1', text: '“得快点把茶送过去……”', card: { name: '王城' } }
    tavern.turns.set('b:1', turn)
    await engine.onTurnSettled(turn)
    let p = null
    for (const end = Date.now() + 6000; !(p?.acting?.now); ) {
      p = (await engine.gameView('b')).cast.find(x => x.name === '柯萝伊')
      if (Date.now() > end) throw new Error('等太久：按这个世界设计')
      await new Promise(r => setTimeout(r, 20))
    }
    const world = llm.calls.filter(isActingWriter)
    assert.equal(world.length, 1)
    assert.match(userText(world[0]), /从别的世界/)
    assert.match(userText(world[0]), /- p1「双手轻握身前」［本性］/)
    assert.doesNotMatch(userText(world[0]), /握紧胸前坠子|缩肩护着左腕/, '处境动作没带过来')
    assert.deepEqual(p.acting.poses.map(p => [p.id, p.label]), [['p1', '双手轻握身前'], ['p4', '提着裙摆小跑']], '新动作不用 p2、p3（别的世界里是坠子和护腕）')
    assert.equal(p.acting.poses[1].from, undefined)
    assert.deepEqual([p.acting.read, p.acting.now, p.acting.carried, p.actingFrom], ['温柔、怕给人添麻烦', '在王城当侍女，没有失散的姐姐', undefined, 'game'])
    assert.deepEqual(p.acting.usedIds, ['p2', 'p3'])
    const global = (await store.readGlobalCast()).cast.柯萝伊
    assert.deepEqual(global.acting.poses.map(p => p.id), ['p1'], '全局库只有本性动作，不跟着这个世界变')
    // 下一轮不再按这个世界设计一次
    const next = { gameId: 'b', turn: 2, textVersion: 'v2', text: '“好了。”', card: { name: '王城' } }
    tavern.turns.set('b:2', next)
    await engine.onTurnSettled(next)
    await new Promise(r => setTimeout(r, 100))
    assert.equal(llm.calls.filter(isActingWriter).length, 1)
    engine.dispose()
  } finally {
    await rm(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 })
  }
})
