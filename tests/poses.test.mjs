// 动作 2.0：动作能加能删、一个情绪放进好几个动作；剧场身子不动只换脸，导演点名换动作；出图按「动作 × 情绪」用到了才画。
// 先测纯函数（lib/poses.js、编号、挑图、说话人），再用假的 Tavern、模型和 NovelAI 把「导演写 → 要画哪几张 → 剧场挑哪张」走一遍。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  defaultPoseGroups, cleanPoseList, cleanPoseGroups, sheetOf, posesWith, findPose, homePose, fitsPose, poseFor, poseWalker,
  lineSteps, poseToken, tokenFor, parseToken, recordPose, slotKey, slotKeys, poseCells, settleNeutral, freshPoseId,
} from '../lib/poses.js'
import { variantKey, keyEmotion, keyPose, pickSprite, lookAt } from '../lib/look.js'
import { resolveConfig } from '../lib/config.js'
import { followMerge } from '../lib/emotions.js'
import { unitSpeakers, hintedSpeaker } from '../lib/staging.js'
import { reactsOf } from '../lib/blocking.js'
import { castBrief, normalizeScript } from '../lib/director.js'
import { cleanActing, mergeActing } from '../lib/acting.js'
import { buildBeats } from '../src/client/theater/playback.js'
import { encodePng } from '../lib/image/png.js'
import { createStore } from '../lib/dsh/store.js'
import { createEngine } from '../lib/engine.js'

const look = { appearance: '1girl, long black hair', outfit: '', states: [] }
const key = (emo, pose = '') => variantKey(look, emo, pose)
const GROUPS = [
  { id: 'daily', label: '日常', desc: '', tags: '', emotions: ['neutral', 'smile', 'happy'] },
  { id: 'arms', label: '抱臂', desc: '抱着胳膊', tags: 'arms crossed', emotions: ['cold', 'smile'] },
]

test('gate: 通用动作组：默认四组（没有侧身），平静在日常组第一个；老设置里挪过的情绪照搬；存过就按存的（全删了也算）', () => {
  const groups = defaultPoseGroups()
  assert.deepEqual(groups.map(g => g.id), ['daily', 'arms', 'chest', 'chin'])
  assert.equal(groups[0].emotions[0], 'neutral')
  assert.ok(groups.every(g => g.tags && g.desc), '每组都写了样子和身体 tag')
  const moved = defaultPoseGroups({ cold: 'daily', 带着烦躁思考: 'chin' })
  assert.ok(moved[0].emotions.includes('cold'))
  assert.ok(!moved[1].emotions.includes('cold'))
  assert.ok(moved[3].emotions.includes('带着烦躁思考'))
  assert.deepEqual(resolveConfig({ images: { poseGroups: [] } }).images.poseGroups, [], '全删了就是不分动作')
  assert.equal(resolveConfig({}).images.poseGroups.length, 4)
  const saved = cleanPoseGroups([{ id: 'x', label: '叉腰', emotions: ['happy', 'neutral', 'happy'] }, { label: '新动作', emotions: [] }, { label: '' }])
  assert.deepEqual(saved.map(g => [g.id, g.label, g.emotions]), [['x', '叉腰', ['neutral', 'happy']], ['g1', '新动作', []]], '同一组里重复的只留一次，空的一列留着，没名字的去掉，平静排第一')
})

test('gate: 动作表规整：一个情绪能进好几个动作；平静的那个动作排最前；新编号不撞', () => {
  const list = cleanPoseList([
    { id: 'p1', label: '双手交握', emotions: ['shy', 'smile'] },
    { id: 'p1', label: '叉腰', emotions: ['smile', 'neutral', 'happy'] },
  ])
  assert.deepEqual(list.map(p => [p.id, p.emotions]), [['p2', ['neutral', 'smile', 'happy']], ['p1', ['shy', 'smile']]])
  assert.equal(freshPoseId(list), 'p3')
  const poses = [{ id: 'a', emotions: ['cold'] }, { id: 'b', emotions: ['smile'] }]
  settleNeutral(poses)
  assert.deepEqual(poses[0], { id: 'a', emotions: ['neutral', 'cold'] }, '哪都没有平静：放进第一个动作')
  // 设计师写的整套：同一个情绪放进两个动作都留着；空动作去掉，玩家刚加的空列（keepEmpty）留着
  const sheet = cleanActing({ poses: [{ label: '站着', emotions: ['neutral', 'smile'] }, { label: '抱臂', emotions: ['cold', 'smile'] }, { label: '空的', emotions: [] }], faces: [] })
  assert.deepEqual(sheet.poses.map(p => p.emotions), [['neutral', 'smile'], ['cold', 'smile']])
  assert.equal(cleanActing({ poses: [{ label: '站着', emotions: ['neutral'] }, { id: 'p2', label: '空的', emotions: [] }] }, { keepIds: true, keepEmpty: true }).poses.length, 2)
  // 补设计：新情绪可以同时放进好几个已有动作，已经在的不再挪
  const merged = mergeActing(sheet, { poses: [{ id: 'p1', emotions: ['worried', 'smile'] }, { id: 'p2', emotions: ['worried'] }] }).sheet
  assert.deepEqual(merged.poses.map(p => p.emotions), [['neutral', 'smile', 'worried'], ['cold', 'smile', 'worried']])
})

test('gate: 情绪在哪个动作：主动作是第一个有它的；点名的动作演得了才去；新情绪哪个动作都能演（只换脸）', () => {
  const sheet = sheetOf({ acting: { poses: GROUPS } })
  assert.equal(sheet.designed, true)
  assert.equal(sheetOf({}, GROUPS).designed, false, '没有设计时用通用动作组')
  assert.equal(sheetOf({}, []), null, '通用动作组全删了：不分动作')
  assert.deepEqual(posesWith(sheet, 'smile').map(p => p.id), ['daily', 'arms'])
  assert.equal(findPose(sheet, '抱臂').id, 'arms', '导演写动作名也认')
  assert.equal(homePose(sheet, 'smile').id, 'daily')
  assert.equal(homePose(sheet, '不爽', [{ id: '不爽', base: 'cold' }]).id, 'arms', '不在任何动作里的：跟着替身（不爽 → 冷淡）')
  assert.equal(poseFor(sheet, 'smile', 'arms').id, 'arms')
  assert.equal(poseFor(sheet, 'happy', 'arms').id, 'daily', '抱臂里没有开心：去主动作')
  assert.ok(fitsPose(sheet, sheet.poses[1], '带着烦躁思考'), '还没设计的新情绪：当前动作上只换脸')
  assert.deepEqual(poseCells({ poses: GROUPS }).filter(c => c.anchor).map(c => c.emotion), ['neutral', 'cold'])
})

test('gate: 剧场里身子不动只换脸：当前动作里有就不动，没有才去主动作；导演点名的换过去；只写动作按原来的情绪换；跨轮接着走', () => {
  const walker = poseWalker(() => ({ poses: GROUPS }))
  assert.equal(walker.step('林岚', 'cold'), 'arms')
  assert.equal(walker.step('林岚', 'smile'), 'arms', '微笑在抱臂里也有：身子不动')
  assert.equal(walker.step('林岚', 'happy'), 'daily', '抱臂里没有开心：换到日常')
  assert.equal(walker.step('林岚', 'smile'), 'daily')
  assert.equal(walker.step('林岚', 'smile', 'arms'), 'arms', '导演点名换动作')
  assert.equal(walker.step('林岚', 'happy', 'arms'), 'daily', '点名的动作演不了这个情绪：不去')
  assert.equal(walker.step('林岚', '', '抱臂'), 'daily', '只写了动作：按现在的开心算，抱臂演不了')
  walker.step('林岚', 'smile')
  assert.equal(walker.step('林岚', '', '抱臂'), 'arms')
  assert.equal(walker.emo('林岚'), 'smile')
  const next = poseWalker(() => ({ poses: GROUPS }))
  next.load(walker.save())
  assert.equal(next.step('林岚', 'smile'), 'arms', '跨轮接着走')
  assert.equal(poseWalker(() => null).step('路人', 'smile'), '', '不分动作的人')
})

test('gate: 差分编号：主动作那张是「…|情绪」，别的动作加 @；主动作换了以后旧的那张留给它自己的动作；老存档没记动作的算主动作', () => {
  const sheet = { poses: GROUPS }
  assert.equal(slotKey({}, look, sheet, 'daily', 'smile'), key('smile'))
  assert.equal(slotKey({}, look, sheet, 'arms', 'smile'), key('smile', 'arms'))
  assert.equal(slotKey({}, look, null, 'arms', 'smile'), key('smile'), '不分动作')
  // 「…|微笑」是以前在抱臂上画的（后来把微笑也放进了日常、日常排前面）
  const old = { [key('smile')]: { assetId: 'a.png', poseId: 'arms' } }
  assert.equal(slotKey(old, look, sheet, 'arms', 'smile'), key('smile'), '抱臂那张还是它')
  assert.equal(slotKey(old, look, sheet, 'daily', 'smile'), key('smile', 'daily'), '日常的另开一张')
  // 老存档：没记动作，或者记的动作已经删了
  assert.equal(slotKey({ [key('smile')]: { assetId: 'a.png' } }, look, sheet, 'daily', 'smile'), key('smile'))
  assert.equal(slotKey({ [key('smile')]: { assetId: 'a.png', pose: 'side' } }, look, sheet, 'daily', 'smile'), key('smile'))
  assert.equal(recordPose({ face: { pose: 'chest' } }), 'chest')
  assert.deepEqual([keyEmotion(key('smile', 'arms')), keyPose(key('smile', 'arms')), keyPose(key('smile'))], ['smile', 'arms', ''])
  assert.deepEqual(parseToken('带着烦躁思考@p2'), { emotion: '带着烦躁思考', pose: 'p2' })
  assert.equal(poseToken('smile'), 'smile')
  assert.equal(tokenFor(sheet, 'smile', 'daily'), 'smile', '主动作不写')
  assert.equal(tokenFor(sheet, 'smile', 'arms'), 'smile@arms')
})

test('gate: 剧场挑图：先找这个动作上的这张脸，没画好看主动作；换脸还没换好先用这个动作的底图', () => {
  const sheet = { poses: GROUPS }
  const sprites = {
    [key('neutral')]: { assetId: 'n.png' }, [key('smile')]: { assetId: 's.png' }, [key('cold')]: { assetId: 'c.png' },
    [key('smile', 'arms')]: { face: { from: key('cold') } },
  }
  const pick = (emo, pose) => pickSprite(sprites, look, emo, '', { keys: e => slotKeys(sprites, look, sheet, pose, e) })
  assert.equal(pick('smile', 'daily'), 's.png')
  assert.equal(pick('smile', 'arms'), 'c.png', '抱臂上的微笑还在等换脸：先用抱臂底图')
  sprites[key('smile', 'arms')].assetId = 'sa.png'
  assert.equal(pick('smile', 'arms'), 'sa.png')
  delete sprites[key('smile', 'arms')]
  assert.equal(pick('smile', 'arms'), 's.png', '抱臂上的还没要：先用主动作的')
  assert.deepEqual(slotKeys(sprites, look, sheet, 'arms', 'smile'), [key('smile', 'arms'), key('smile')])
})

test('gate: 情绪并掉时：动作里的换成并进去的那个（同一个动作里只留一个），差分编号带着 @ 一起改', () => {
  const holder = {
    sprites: { [key('不爽', 'arms')]: { assetId: 'x.png' }, [key('不爽')]: { assetId: 'y.png' } },
    acting: { poses: [{ id: 'p1', label: '站', emotions: ['neutral', '不爽', 'annoyed'] }, { id: 'p2', label: '抱臂', emotions: ['不爽'] }] },
  }
  followMerge(holder, ['不爽'], 'annoyed')
  assert.ok(holder.sprites[key('annoyed', 'arms')]?.assetId)
  assert.deepEqual(holder.acting.poses.map(p => p.emotions), [['neutral', 'annoyed'], ['annoyed']])
})

test('gate: 说话人、谁换了情绪或动作：台词没写 sp 按切分猜的、再沿用上一位；react 和点名换动作一起算', () => {
  const units = [{ id: 'U1', type: 'dialogue', hint: '林岚' }, { id: 'U2', type: 'dialogue' }, { id: 'U3', type: 'narration' }, { id: 'U4', type: 'thought' }]
  const script = { lines: { U2: { emo: 'smile' }, U3: { sp: '苏晴' } } }
  assert.deepEqual(unitSpeakers(units, script, ['林岚', '苏晴']), ['林岚', '林岚', '苏晴', '我'])
  assert.equal(hintedSpeaker('林岚打断她', ['林岚'], ''), '林岚')
  const line = { emo: 'cold', pose: 'arms', react: [{ name: '*', emo: 'surprised' }, { name: '苏晴', pose: 'p2' }] }
  const reacts = reactsOf(line, ['林岚', '苏晴', '宋棠'], ['林岚'])
  assert.deepEqual(lineSteps(line, ['林岚'], reacts), [
    { name: '林岚', emo: 'cold', pose: 'arms' }, { name: '苏晴', emo: 'surprised', pose: '' }, { name: '宋棠', emo: 'surprised', pose: '' },
  ], '* 先展开了苏晴，后面单写的苏晴不重复')
  assert.deepEqual(lineSteps({ pose: 'p2' }, ['林岚'], []), [{ name: '林岚', emo: '', pose: 'p2' }], '只点名换动作')
})

test('gate: 导演：角色档案里列每个人的动作和里面的情绪；pose 和 react 的 pose 收下（写了竖线和 @ 的去掉）', () => {
  const brief = castBrief([{ name: '林岚', appearance: 'a', acting: { poses: GROUPS } }, { name: '苏晴', appearance: 'b' }], { poseGroups: [] })
  assert.match(brief, /林岚.*动作：daily 日常（平静、微笑、开心） \/ arms 抱臂（冷淡、微笑）/)
  assert.doesNotMatch(brief.split('\n')[1], /动作：/, '苏晴没有设计、也没有通用动作组')
  assert.match(castBrief([{ name: '苏晴', appearance: 'b' }], { poseGroups: GROUPS }), /动作：daily/)
  const units = [{ id: 'U1', type: 'dialogue', text: '“嗯。”' }, { id: 'U2', type: 'dialogue', text: '“好啊。”' }]
  const script = normalizeScript({ cast: [{ name: '林岚' }, { name: '苏晴' }], lines: [{ u: 'U1', sp: '林岚', emo: 'cold', pose: 'arms' }, { u: 'U2', sp: '苏晴', emo: 'smile', react: [{ name: '林岚', pose: 'da@ily|' }] }] }, units)
  assert.equal(script.lines.U1.pose, 'arms')
  assert.deepEqual(script.lines.U2.react, [{ name: '林岚', pose: 'daily' }], '只换动作的反应也收')
})

// ───────────────────────── 引擎：导演写 → 要画哪几张 → 剧场挑哪张 ─────────────────────────

function fakeTavern() {
  const turns = new Map()
  const items = new Map()
  let seq = 0
  return {
    apiVersion: 1, turns,
    async attach({ gameId, turn, textVersion, item }) { const id = 'm' + ++seq; items.set(id, { id, gameId, turn, textVersion, ...item, current: true }); return { id } },
    async update(id, changes) { Object.assign(items.get(id), changes) },
    async list({ gameId }) { return [...items.values()].filter(i => i.gameId === gameId) },
    async getTurn({ gameId, turn }) { return turns.get(gameId + ':' + turn) || null },
    async getCardContext() { return null },
    async backgroundModel() { return { provider: 'fake', model: 'fake-1' } },
  }
}
function fakeLlm(text) {
  return { stream() { return (async function* () { yield { type: 'text-delta', text }; yield { type: 'finish', reason: { kind: 'stop' } } })() } }
}
function fakeNai() {
  const requests = []
  const fetchImpl = async (url, init) => {
    const body = JSON.parse(init.body)
    requests.push(body)
    const { width, height } = body.parameters
    return new Response(await encodePng({ width, height, data: new Uint8ClampedArray(width * height * 4).fill(200) }), { status: 200, headers: { 'content-type': 'image/png' } })
  }
  return { requests, fetchImpl }
}

test('gate: 引擎：身子不动只换脸，用到了哪个「动作 × 情绪」才画哪张；剧场按同一套走、挑同一张', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'flowgal-poses-'))
  try {
    const store = createStore(dir)
    const tavern = fakeTavern()
    const { requests, fetchImpl } = fakeNai()
    const director = {
      scene: { location: '教室', time: 'noon' },
      cast: [{ name: '林岚', pos: 'center' }],
      people: [{ name: '林岚', gender: 'female', appearance: { sex: '1girl', hair: 'long black hair' } }],
      lines: [
        { u: 'U1', sp: '林岚', emo: 'cold' }, // 抱臂
        { u: 'U2', emo: 'smile' }, // 同一人接着说，微笑在抱臂里也有：留在抱臂
        { u: 'U3', sp: '林岚', emo: 'smile', pose: 'daily' }, // 导演点名换回日常
        { u: 'U4', sp: '林岚', emo: 'happy' },
      ],
    }
    const engine = createEngine({ store, services: { tavern, llm: fakeLlm(JSON.stringify(director)) }, fetchImpl, logger: { warn() {}, info() {} } })
    await engine.patchConfig({ images: { auto: false, backgrounds: false, spriteWriter: false, maxPerTurn: 0, portraits: true, expressions: true, poseGroups: GROUPS, sizes: { portrait: [64, 96] } } })
    await engine.setSecret('novelai', 'official', 'k')
    const text = '“哼。”\n“……也不是不行。”\n“那就这样吧。”\n“太好了！”'
    const turn = { gameId: 'g', turn: 1, textVersion: 'v1', text, rawText: text, card: { name: '林岚' } }
    tavern.turns.set('g:1', turn)
    await engine.onTurnSettled(turn)

    const settle = async (done, what) => {
      for (const end = Date.now() + 6000; ;) {
        const view = await engine.gameView('g')
        const p = view.cast.find(x => x.name === '林岚')
        if (p && done(p)) return { view, p }
        if (Date.now() > end) throw new Error('等太久：' + what + ' ' + JSON.stringify(p && Object.keys(p.sprites)))
        await new Promise(r => setTimeout(r, 20))
      }
    }
    const now = { appearance: '1girl, long black hair', outfit: '', states: [] }
    const k = (emo, pose = '') => variantKey(now, emo, pose)
    const { view, p } = await settle(p => p.sprites[k('neutral')]?.assetId && p.sprites[k('cold')]?.assetId && p.sprites[k('smile', 'arms')] && p.sprites[k('smile')] && p.sprites[k('happy')], '五张')
    assert.deepEqual(Object.keys(p.sprites).sort(), [k('cold'), k('happy'), k('neutral'), k('smile'), k('smile', 'arms')].sort(), '没用到的组合不画（开心不在抱臂里，平静没在抱臂上用过）')
    assert.equal(requests.filter(r => r.action === 'generate').length, 2, '两张底图：平静（日常）、冷淡（抱臂）')
    assert.deepEqual([p.sprites[k('smile', 'arms')].face.from, p.sprites[k('smile', 'arms')].poseId], [k('cold'), 'arms'], '抱臂上的微笑在冷淡那张底图上换脸')
    assert.deepEqual([p.sprites[k('smile')].face.from, p.sprites[k('smile')].poseId], [k('neutral'), 'daily'])
    assert.equal(p.sprites[k('cold')].pose, 'arms', '底图记着是哪个动作的')
    assert.deepEqual(view.poseGroups.map(g => g.id), ['daily', 'arms'])

    // 剧场：一拍一拍走到的动作跟出图一样；抱臂上的微笑换好脸之前先用抱臂的底图
    const { beats } = buildBeats({ turns: view.turns, images: [], cast: view.cast, emotions: view.emotions, poseGroups: view.poseGroups })
    assert.deepEqual(beats.map(b => b.postures?.林岚), ['arms', 'arms', 'daily', 'daily'])
    const sheet = sheetOf(p, view.poseGroups)
    const shown = beats.map(b => pickSprite(p.sprites, lookAt(p.timeline, 1), b.emotions.林岚, '', { keys: e => slotKeys(p.sprites, now, sheet, b.postures.林岚, e) }))
    assert.deepEqual(shown, [p.sprites[k('cold')].assetId, p.sprites[k('cold')].assetId, p.sprites[k('neutral')].assetId, p.sprites[k('neutral')].assetId], '第二句身子没动')

    // 设置里把平静也勾进抱臂，「一键补足」按「情绪@动作」要勾上了还没画的
    await engine.patchConfig({ images: { poseGroups: [GROUPS[0], { ...GROUPS[1], emotions: ['cold', 'smile', 'neutral'] }] } })
    const before = Object.keys(p.sprites).length
    await engine.castAction('g', 'sprite', { name: '林岚', emotions: ['neutral@arms'], rewrite: false })
    const { p: after } = await settle(x => Object.keys(x.sprites).length > before, '平静放到抱臂上')
    assert.equal(after.sprites[k('neutral', 'arms')].face.from, k('cold'))
    engine.dispose()
  } finally {
    await rm(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 })
  }
})
