// 让 AI 加动作、不按动作库自由画一张：
//  - 人物志「动作与表情」里让设计师在已有设计上加几个动作（填个数、写追加要求），已有的不动，加好接着画底图；整套设计也能定动作数、写要求；
//  - 画一张差分时可以不按动作库：立绘设计师照要求自由设计动作，画好绑到几个已有动作、或者存成新动作（也可都绑），只画一次、几格共用；
//  - 按动作库画的那张也能写要求。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { cleanActing, addPoses, bindFree, cleanAsk, ASK_CHARS } from '../lib/acting.js'
import { writeActing, writeActingMore, writeSpritePrompts, freePose, bodyFromTags } from '../lib/sprites.js'
import { resolveConfig } from '../lib/config.js'
import { variantKey } from '../lib/look.js'
import { encodePng } from '../lib/image/png.js'
import { createStore } from '../lib/dsh/store.js'
import { createEngine } from '../lib/engine.js'
import { promptItem } from '../lib/prompt-book.js'
import { roleText, userText, ownText } from './roles.mjs'

const SHEET = {
  read: '嘴硬心软的学生会长。',
  poses: [
    { id: 'p1', label: '背手站着', desc: '背着手站得笔直', tags: 'hands behind back', kind: 'self', emotions: ['neutral', 'smile', 'happy'] },
    { id: 'p2', label: '抱着胳膊别过脸', desc: '嘴硬的时候', tags: 'arms crossed', kind: 'self', emotions: ['pout', 'angry'] },
  ],
  faces: [
    { emotion: 'neutral', desc: '没什么表情', tags: 'closed mouth' },
    { emotion: 'smile', desc: '嘴角压不住', tags: 'slight smile' },
    { emotion: 'pout', desc: '鼓着脸', tags: 'pout' },
  ],
}

test('gate: 加动作：只收新动作、最多填的个数；情绪可以已经在别的动作里；表情只补没写过的；原设计不动', () => {
  const sheet = cleanActing(SHEET)
  const { sheet: next, added } = addPoses(sheet, {
    poses: [
      { id: 'p1', label: '改名', emotions: ['angry'] }, // 写成已有编号的：不是新动作
      { id: 'new1', label: '叉腰', desc: '训人的时候', tags: 'hands on hips, smiling', kind: 'self', emotions: ['angry', 'smile', '没有这个'] },
      { id: 'new2', label: '空的', emotions: [] },
      { id: 'new3', label: '掩嘴笑', tags: 'hand over mouth', kind: 'situ', premise: '还在装大小姐', emotions: ['laugh'] },
      { id: 'new4', label: '超出个数', emotions: ['sad'] },
    ],
    faces: [{ emotion: 'smile', tags: 'grin' }, { emotion: 'angry', desc: '训人', tags: 'angry, glaring' }, { emotion: 'laugh', tags: 'laughing' }, { emotion: 'sad', tags: 'sad' }],
  }, { allowed: ['neutral', 'smile', 'happy', 'pout', 'angry', 'laugh', 'sad'], count: 2 })
  assert.deepEqual(added, ['p3', 'p4'])
  assert.deepEqual(next.poses.map(p => [p.id, p.label, p.emotions]), [
    ['p1', '背手站着', ['neutral', 'smile', 'happy']],
    ['p2', '抱着胳膊别过脸', ['pout', 'angry']],
    ['p3', '叉腰', ['angry', 'smile']],
    ['p4', '掩嘴笑', ['laugh']],
  ], '已有的不动；清单外的情绪丢掉；空的不收；超出个数的不收')
  assert.equal(next.poses[2].tags, 'hands on hips', '动作只留身体')
  assert.deepEqual([next.poses[3].kind, next.poses[3].premise], ['situ', '还在装大小姐'])
  assert.equal(next.faces.smile.tags, 'slight smile', '写过的表情不动')
  assert.equal(next.faces.angry.tags, 'angry, narrowed eyes', '没写过的补上（收着画）')
  assert.equal(next.faces.laugh.tags, 'laughing')
  assert.equal(next.faces.sad, undefined, '不在新动作里的不收')
  assert.equal(sheet.poses.length, 2, '原设计不动')
  assert.deepEqual(addPoses(sheet, { poses: [{ id: 'new1', label: 'A', emotions: ['smile'] }] }).added, ['p3'], '不填个数不设上限')
  // 别的世界用过的编号不再用
  assert.deepEqual(addPoses({ ...sheet, usedIds: ['p3'] }, { poses: [{ id: 'new1', label: 'A', emotions: ['smile'] }] }).added, ['p4'])
})

test('gate: 自由画的一张绑进设计：绑到已有动作（情绪放进去），存成新动作（这个情绪是底图、默认本性），也可都绑；还没设计时新开一份', () => {
  const sheet = cleanActing(SHEET)
  const both = bindFree(sheet, 'angry', { into: ['p1', 'p2', 'nope'], pose: { label: '叉着腰训人', desc: '训人', tags: 'hands on hips, angry' } })
  assert.deepEqual(both.into, ['p1', 'p2'])
  assert.equal(both.id, 'p3')
  assert.deepEqual(both.sheet.poses.map(p => [p.id, p.emotions]), [['p1', ['neutral', 'smile', 'happy', 'angry']], ['p2', ['pout', 'angry']], ['p3', ['angry']]])
  assert.deepEqual([both.sheet.poses[2].label, both.sheet.poses[2].tags, both.sheet.poses[2].kind], ['叉着腰训人', 'hands on hips', 'self'])
  assert.deepEqual(sheet.poses[0].emotions, ['neutral', 'smile', 'happy'], '原设计不动')
  const only = bindFree(sheet, 'sad', { into: ['p2'] })
  assert.equal(only.id, '')
  assert.deepEqual(only.sheet.poses[1].emotions, ['pout', 'angry', 'sad'])
  const fresh = bindFree(null, 'smile', { pose: { label: '托腮' } })
  assert.deepEqual(fresh.sheet.poses.map(p => [p.id, p.label, p.emotions]), [['p1', '托腮', ['neutral', 'smile']]], '还没设计：新开一份，平静照规矩放在第一个动作')
  // 设计师另写的动作、从整张的词里摘身体
  assert.deepEqual(freePose({ label: '抱着书本微笑的样子名字太长了', desc: '抱书', tags: 'holding book, smile, blue eyes', kind: '处境' }), { label: '抱着书本微笑的样子名字太', desc: '抱书', tags: 'holding book', kind: 'situ' })
  assert.equal(freePose({}), null)
  assert.equal(bodyFromTags('1girl, long black hair, school uniform, smile, hand on own cheek, head tilt', { appearance: '1girl, long black hair' }, { outfitTags: 'school uniform', states: [] }), 'hand on own cheek, head tilt')
  assert.equal(cleanAsk('  要\u0001求\r\n第二行 '), '要求\n第二行')
  assert.equal(cleanAsk('长'.repeat(ASK_CHARS + 10)).length, ASK_CHARS)
})

const reply = text => ({ stream() { return (async function* () { yield { type: 'text-delta', text }; yield { type: 'finish', reason: { kind: 'stop' } } })() } })
const person = { name: '林岚', gender: 'female', appearance: '1girl, long black hair', outfit: '校服', outfitTags: 'school uniform', states: [], timeline: { outfits: { 校服: { tags: 'school uniform' } } } }

test('gate: 提示词：加动作、整套设计的动作数和追加要求、自由画那一行、对这张的要求都在提示词页里，全文能改', async () => {
  for (const id of ['acting.task.more', 'acting.count', 'acting.ask', 'sprite.line.free', 'sprite.ask']) {
    const item = promptItem(resolveConfig({}), id)
    assert.ok(item && item.text.trim(), id)
  }
  // 整套设计：定了动作数、写了要求
  const calls = []
  const llm = { stream(request) { calls.push(request); return reply(JSON.stringify(SHEET)).stream() } }
  await writeActing({ llm, provider: 'f', model: 'f', config: resolveConfig({}), backend: 'novelai', story: [], turn: 1, person, emotions: ['neutral', 'smile', 'happy', 'pout', 'angry'], count: 3, ask: '多给点和扇子有关的动作' })
  assert.match(userText(calls[0]), /给这个人设计一套动作表[^\n]*\n这次一共设计 3 个动作。\n\n【玩家的要求】\n多给点和扇子有关的动作\n照这些要求来/)
  assert.ok(calls.slice(1).every(c => !/这次一共设计/.test(userText(c)) && /【玩家的要求】\n多给点和扇子有关的动作/.test(userText(c))), '漏写了补要时只带要求、不再带动作数')
  // 不填就没有那两段
  let at = calls.length
  await writeActing({ llm, provider: 'f', model: 'f', config: resolveConfig({}), backend: 'novelai', story: [], turn: 1, person, emotions: ['neutral'] })
  assert.doesNotMatch(userText(calls[at]), /这次一共设计|【玩家的要求】/)
  // 改过的提示词照改过的发
  const custom = resolveConfig({ prompts: { 'acting.ask': { text: '玩家说：{{text}}' } } })
  at = calls.length
  await writeActing({ llm, provider: 'f', model: 'f', config: custom, backend: 'novelai', story: [], turn: 1, person, emotions: ['neutral'], ask: '收着点' })
  assert.match(userText(calls[at]), /玩家说：收着点/)

  // 加动作：带着已有设计，情绪清单写明已在哪些动作里
  const more = []
  const moreLlm = { stream(request) { more.push(request); return reply(JSON.stringify({ poses: [{ id: 'new1', label: '叉腰', tags: 'hands on hips', kind: 'self', emotions: ['angry', 'smile'] }], faces: [{ emotion: 'angry', tags: 'angry' }] })).stream() } }
  const r = await writeActingMore({ llm: moreLlm, provider: 'f', model: 'f', config: resolveConfig({}), backend: 'novelai', story: [], turn: 2, person, current: cleanActing(SHEET), emotions: ['neutral', 'smile', 'happy', 'pout', 'angry'], count: 2, ask: '要有训人的样子' })
  const text = userText(more[0])
  assert.match(text, /【已有的动作与表情设计】[\s\S]*p1「背手站着」[\s\S]*- smile（微笑）[^\n]*已在动作 p1「背手站着」里/)
  assert.match(text, /给这个人新加 2 个动作，已有的动作和表情一概不动[\s\S]*【玩家的要求】\n要有训人的样子/)
  assert.deepEqual([r.added, r.sheet.poses.at(-1).emotions], [['p3'], ['angry', 'smile']])

  // 自由画的那一行、对这张的要求
  const sprites = []
  const spriteLlm = { stream(request) { sprites.push(request); return reply(JSON.stringify({ sprites: [{ key: 's1', tags: '1girl, holding book, smile', pose: { label: '抱着书', desc: '抱着一本书', tags: 'holding book, smile', kind: 'self' } }, { key: 's2', tags: '1girl, smile' }] })).stream() } }
  const look = { appearance: person.appearance, outfit: '校服', states: [] }
  const out = await writeSpritePrompts({
    llm: spriteLlm, provider: 'f', model: 'f', config: resolveConfig({}), backend: 'novelai', person, story: [], turn: 2,
    targets: [
      { key: 'a', emotion: 'smile', free: true, ask: '双手抱着一本书，歪头笑', outfit: '校服', outfitTags: 'school uniform', states: [] },
      { key: variantKey(look, 'happy'), emotion: 'happy', ask: '笑得再收一点', outfit: '校服', outfitTags: 'school uniform', states: [], pose: { id: 'p1', label: '背手站着', desc: '背着手', tags: 'hands behind back', designed: true, members: null } },
    ],
  })
  const own = ownText(sprites[0])
  assert.match(own, /- s1：不按动作库——这一张的动作自由设计[^\n]*情绪「微笑」[^\n]*另写 "pose"[^\n]*；玩家对这张的要求（优先照做，跟上面冲突时以它为准）：双手抱着一本书，歪头笑$/m)
  assert.match(own, /- s2：[^\n]*这个人的动作「背手站着」[^\n]*；玩家对这张的要求（优先照做，跟上面冲突时以它为准）：笑得再收一点$/m)
  assert.deepEqual(out.get('a').pose, { label: '抱着书', desc: '抱着一本书', tags: 'holding book', kind: 'self' }, '收设计师另写的动作（只留身体）')
  assert.equal(out.get(variantKey(look, 'happy')).pose, undefined)
})

// ───────────────────────── 引擎 ─────────────────────────

const W = 256, H = 384
const solid = (width, height, [r, g, b]) => { const data = new Uint8ClampedArray(width * height * 4); for (let i = 0; i < data.length; i += 4) data.set([r, g, b, 255], i); return { width, height, data } }
function fakeNai() {
  const requests = []
  const fetchImpl = async (url, init) => {
    const body = JSON.parse(init.body)
    requests.push(body)
    const { width, height } = body.parameters
    return new Response(await encodePng(solid(width, height, body.action === 'infill' ? [255, 0, 0] : [0, 0, 255])), { status: 200, headers: { 'content-type': 'image/png' } })
  }
  return { requests, fetchImpl }
}
const fakeTavern = () => ({
  apiVersion: 1,
  async attach() { return { id: 'm1' } }, async update() {}, async remove() {}, async list() { return [] },
  async getTurn() { return null },
  async getCardContext() { return { description: '林岚：黑长直的学生会长。', personality: '', scenario: '', lore: [] } },
  async backgroundModel() { return { provider: 'fake', model: 'fake-1' } },
})
function fakeLlm(answer) {
  const calls = []
  return { calls, stream(request) { calls.push(request); const text = answer(request); return (async function* () { yield { type: 'text-delta', text }; yield { type: 'finish', reason: { kind: 'stop' } } })() } }
}
const isActing = request => roleText(request).includes('你是视觉小说的角色表演设计师')
const isSprite = request => roleText(request).includes('立绘设计师')
/** 假立绘设计师：按编号回 tag；自由画的那条另写动作。 */
function spriteReply(request) {
  const lines = [...userText(request).matchAll(/^- (s\d+)：(.*)$/gm)]
  return JSON.stringify({
    sprites: lines.map(([, id, line]) => (line.startsWith('不按动作库——')
      ? { key: id, tags: '1girl, long black hair, holding book, smile', pose: { label: '抱着书', desc: '抱着一本书歪头笑', tags: 'holding book, head tilt' } }
      : line.startsWith('只换脸——') ? { key: id, tags: 'smile, half-closed eyes' } : { key: id, tags: `1girl, long black hair, written-${id}` })),
  })
}
async function until(engine, gameId, done, what = '') {
  const end = Date.now() + 30000
  for (;;) {
    const lin = (await engine.gameView(gameId)).cast.find(p => p.name === '林岚')
    if (lin && done(lin)) return lin
    if (Date.now() > end) throw new Error('等太久：' + what + ' ' + JSON.stringify(lin?.spriteStatus) + ' ' + JSON.stringify(lin?.acting?.poses?.map(p => [p.id, p.label, p.emotions.slice(0, 4)])) + ' ' + Object.keys(lin?.sprites || {}).join(' '))
    await new Promise(r => setTimeout(r, 20))
  }
}
async function withEngine(answer, fn, { faceSwap = false } = {}) {
  const dir = await mkdtemp(join(tmpdir(), 'flowgal-more-'))
  try {
    const store = createStore(dir)
    const llm = fakeLlm(answer)
    const nai = fakeNai()
    const engine = createEngine({ store, services: { tavern: fakeTavern(), llm }, fetchImpl: nai.fetchImpl, logger: { warn() {}, info() {} } })
    await engine.patchConfig({ images: { faceSwap, faceSwapPicked: true, auto: false, backgrounds: false, sizes: { portrait: [W, H] } } })
    await engine.setSecret('novelai', 'official', 'k')
    await engine.castAction('g', 'save', { name: '林岚', patch: { appearance: '1girl, long black hair', gender: 'female', seed: 7 } })
    try { await fn({ engine, llm, requests: nai.requests, store }) } finally { engine.dispose() }
  } finally {
    await rm(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 })
  }
}
const look = { appearance: '1girl, long black hair', outfit: '', states: [] }

test('gate: 让 AI 加动作：在已有设计上加填的个数（带着要求），已有的和玩家改过的都不动，加好画每个新动作的底图；还没设计时整套设计照填的动作数', async () => {
  let moreReply = null
  await withEngine(request => (isActing(request) ? JSON.stringify(userText(request).includes('新加') ? moreReply : SHEET) : isSprite(request) ? spriteReply(request) : '{}'), async ({ engine, llm, requests }) => {
    // 还没设计：整套设计，动作数和要求带上
    await engine.castAction('g', 'acting-more', { name: '林岚', count: 4, ask: '她总拿着扇子' })
    let lin = await until(engine, 'g', p => p.acting && !p.actingBusy, '整套设计')
    const full = llm.calls.filter(isActing)[0]
    assert.match(userText(full), /这次一共设计 4 个动作。[\s\S]*【玩家的要求】\n她总拿着扇子/)
    assert.equal(lin.acting.poses.length, 2)

    // 玩家先改一下（改了第一个动作的描述），再让 AI 加两个
    const edited = structuredClone(lin.acting)
    edited.poses[0].desc = '玩家改的描述'
    await engine.castAction('g', 'acting-save', { name: '林岚', acting: edited })
    moreReply = { poses: [
      { id: 'new1', label: '叉腰', desc: '训人', tags: 'hands on hips', kind: 'self', emotions: ['angry', 'smile'] },
      { id: 'new2', label: '掩嘴笑', tags: 'hand over mouth', kind: 'self', emotions: ['laugh', 'smile'] },
    ], faces: [{ emotion: 'laugh', tags: 'laughing, closed eyes' }] }
    await engine.castAction('g', 'acting-more', { name: '林岚', count: 2, ask: '要有训人的样子', draw: 'base' })
    // 大笑本来就放在第一个动作里（整套设计时没分到的进默认站姿），它在掩嘴笑上的那张另存一格
    const angry3 = variantKey(look, 'angry', 'p3'), laugh4 = variantKey(look, 'laugh', 'p4')
    lin = await until(engine, 'g', p => p.acting.poses.length === 4 && p.sprites[angry3]?.assetId && p.sprites[laugh4]?.assetId, '加动作、画底图')
    const ask = llm.calls.filter(isActing).at(-1)
    assert.match(userText(ask), /新加 2 个动作[\s\S]*【玩家的要求】\n要有训人的样子/)
    assert.match(userText(ask), /p1「背手站着」［本性］：玩家改的描述/, '设计师看到的是玩家改过的')
    assert.deepEqual(lin.acting.poses.map(p => [p.id, p.label, p.emotions.slice(0, 3)]), [
      ['p1', '背手站着', ['neutral', 'smile', 'happy']],
      ['p2', '抱着胳膊别过脸', ['pout', 'angry']],
      ['p3', '叉腰', ['angry', 'smile']],
      ['p4', '掩嘴笑', ['laugh', 'smile']],
    ])
    assert.equal(lin.acting.poses[0].desc, '玩家改的描述', '玩家改过的不冲掉')
    assert.equal(lin.acting.by, 'user', '玩家改过的设计加了动作还算玩家的')
    assert.equal(lin.acting.faces.laugh.tags, 'laughing, closed eyes')
    // 底图：生气在叉腰上、大笑在掩嘴笑上（各自的主动作还是原来的）
    assert.deepEqual([lin.sprites[angry3].poseId, lin.sprites[laugh4].poseId], ['p3', 'p4'])
    assert.equal(requests.length, 2, '只画两个新动作的底图')
    const log = (await engine.directorLog('g')).entries.filter(e => e.kind === 'acting').map(e => e.summary)
    assert.ok(log.some(s => /^动作与表情 · 林岚：加 2 个动作（带着你的要求）/.test(s)))
    assert.ok(log.some(s => /整套设计（\d+ 种情绪，4 个动作，带着你的要求）/.test(s)))
  })
})

test('gate: 不按动作库自由画：设计师照要求自由设计动作，画一次，绑到已有动作和存成新动作的几格共用这张；设计跟着改；按动作库重写时去掉自由画的标记', async () => {
  await withEngine(request => (isActing(request) ? JSON.stringify(SHEET) : isSprite(request) ? spriteReply(request) : '{}'), async ({ engine, llm, requests }) => {
    await engine.castAction('g', 'acting-design', { name: '林岚' })
    let lin = await until(engine, 'g', p => p.acting && !p.actingBusy, '设计')
    await assert.rejects(engine.castAction('g', 'sprite-free', { name: '林岚', emotion: 'smile' }), /选一个要绑的动作/)
    await assert.rejects(engine.castAction('g', 'sprite-free', { name: '林岚', emotion: 'smile', into: ['nope'] }), /选一个要绑的动作/)

    // 微笑：绑到「抱着胳膊别过脸」（原来没有微笑）、同时存成新动作「抱着书」
    const r = await engine.castAction('g', 'sprite-free', { name: '林岚', emotion: 'smile', ask: '双手抱着一本书，歪头笑', into: ['p2'], newPose: { label: '' } })
    const onP2 = variantKey(look, 'smile', 'p2'), onP3 = variantKey(look, 'smile', 'p3')
    assert.deepEqual(r.keys, [onP3, onP2], '新动作那格先画，绑的那格共用')
    lin = await until(engine, 'g', p => p.sprites[onP3]?.assetId && p.sprites[onP2]?.assetId && !p.spriteStatus[onP2], '自由画、共用')
    assert.equal(requests.length, 1, '只画一次')
    assert.equal(lin.sprites[onP2].assetId, lin.sprites[onP3].assetId)
    const writer = llm.calls.filter(isSprite).at(-1)
    assert.match(userText(writer), /- s1：不按动作库——[^\n]*情绪「微笑」[^\n]*；玩家对这张的要求（优先照做，跟上面冲突时以它为准）：双手抱着一本书，歪头笑/)
    assert.match(requests[0].parameters.v4_prompt.caption.char_captions[0].char_caption, /holding book/)
    assert.deepEqual(lin.acting.poses.map(p => [p.id, p.label]), [['p1', '背手站着'], ['p2', '抱着胳膊别过脸'], ['p3', '抱着书']], '新动作用设计师起的名字')
    assert.deepEqual([lin.acting.poses[1].emotions.slice(0, 2), lin.acting.poses[1].emotions.at(-1), lin.acting.poses[2].emotions], [['pout', 'angry'], 'smile', ['smile']], '微笑挂进了绑的动作')
    assert.deepEqual([lin.acting.poses[2].desc, lin.acting.poses[2].tags, lin.acting.poses[2].kind], ['抱着一本书歪头笑', 'holding book, head tilt', 'self'])
    assert.equal(lin.acting.by, 'user')
    assert.deepEqual([lin.sprites[onP3].poseId, lin.sprites[onP2].poseId], ['p3', 'p2'])
    assert.deepEqual(lin.sprites[onP2].free, { ask: '双手抱着一本书，歪头笑' })
    assert.equal(lin.sprites[onP2].tags, '1girl, long black hair, holding book, smile')
    const log = (await engine.directorLog('g')).entries.find(e => /^不按动作库画 · 林岚/.test(e.summary))
    assert.ok(log, '导演日志里记着')

    // 自己写词、只存成新动作，起了名字；不开设计师也照画
    await engine.castAction('g', 'sprite-free', { name: '林岚', emotion: 'pout', tags: '1girl, pout, hands on own cheeks, school uniform', newPose: { label: '捧着脸' } })
    const pout4 = variantKey(look, 'pout', 'p4')
    lin = await until(engine, 'g', p => p.sprites[pout4]?.assetId, '自己写词')
    assert.deepEqual([lin.acting.poses[3].label, lin.acting.poses[3].tags, lin.sprites[pout4].writer], ['捧着脸', 'hands on own cheeks, school uniform', 'user'])

    // 再按动作库让设计师重写「抱着胳膊别过脸」上的微笑，带着要求：不再是自由画的那张
    await engine.castAction('g', 'sprite', { name: '林岚', emotion: 'smile@p2', ask: '笑得再收一点' })
    lin = await until(engine, 'g', p => !p.sprites[onP2].free && p.sprites[onP2].ask && !p.spriteStatus[onP2], '按动作库重写')
    assert.equal(lin.sprites[onP2].ask, '笑得再收一点')
    assert.match(userText(llm.calls.filter(isSprite).at(-1)), /这个人的动作「抱着胳膊别过脸」[^\n]*；玩家对这张的要求（优先照做，跟上面冲突时以它为准）：笑得再收一点/)
    assert.notEqual(lin.sprites[onP2].assetId, lin.sprites[onP3].assetId, '重画了绑的那格，新动作那格不动')
  })
})

test('gate: 没有设计也能自由画：放到这个情绪自己的格子；存成新动作时新开一份设计', async () => {
  await withEngine(request => (isSprite(request) ? spriteReply(request) : '{}'), async ({ engine, requests }) => {
    await engine.patchConfig({ images: { spriteWriter: true } })
    await engine.castAction('g', 'sprite-free', { name: '林岚', emotion: 'happy', ask: '比个剪刀手', bare: true })
    const happy = variantKey(look, 'happy')
    let lin = await until(engine, 'g', p => p.sprites[happy]?.assetId, '放到情绪格子')
    assert.equal(lin.acting, null, '只放格子不动设计')
    assert.deepEqual(lin.sprites[happy].free, { ask: '比个剪刀手' })
    // 存成新动作：新开一份设计；开心的主动作就是它，没记动作的那格（上面那张）算它的，换成这次画的
    const first = lin.sprites[happy].assetId
    await engine.castAction('g', 'sprite-free', { name: '林岚', emotion: 'happy', newPose: { label: '剪刀手' } })
    lin = await until(engine, 'g', p => p.acting && p.sprites[happy]?.poseId === 'p1' && p.sprites[happy].assetId !== first && !p.spriteStatus[happy], '新开设计')
    assert.deepEqual(lin.acting.poses.map(p => [p.id, p.label, p.emotions]), [['p1', '剪刀手', ['neutral', 'happy']]])
    assert.equal(lin.acting.by, 'user')
    assert.equal(requests.length, 2)
  })
})

test('gate: 一个情绪挂在几个动作下：让设计师重写其中一个动作上的那张（顺手重新设计这个表情），那张照它自己的动作写，不拿主动作的词（不然几个动作画出来一样）', async () => {
  // 假立绘设计师：照那一行写的动作写身体；先设计再写的那条照它放进的动作（主动作「背手站着」）写全
  const body = line => (line.match(/这个人的动作「([^」]+)」/) || [])[1] || 'none'
  const reply = request => {
    const text = userText(request)
    const lines = [...text.matchAll(/^- (s\d+)：(.*)$/gm)]
    return JSON.stringify({
      ...(/先设计再写——/.test(text) ? { acting: { poses: [{ id: 'p1', emotions: ['smile'] }], faces: [{ emotion: 'smile', tags: 'gentle smile' }] } } : {}),
      sprites: lines.map(([, id, line]) => ({ key: id, tags: line.startsWith('先设计再写——') ? '1girl, long black hair, hands behind back, gentle smile' : `1girl, long black hair, body-${body(line)}, smile` })),
    })
  }
  await withEngine(request => (isActing(request) ? JSON.stringify(SHEET) : isSprite(request) ? reply(request) : '{}'), async ({ engine, llm, requests }) => {
    await engine.castAction('g', 'acting-design', { name: '林岚' })
    let lin = await until(engine, 'g', p => p.acting && !p.actingBusy, '设计')
    // 微笑也勾进「抱着胳膊别过脸」：两个动作上各画一张
    const sheet = structuredClone(lin.acting)
    sheet.poses[1].emotions.push('smile')
    await engine.castAction('g', 'acting-save', { name: '林岚', acting: sheet })
    const home = variantKey(look, 'smile'), onP2 = variantKey(look, 'smile', 'p2')
    const settled = (p, n) => requests.length >= n && [home, onP2].every(k => p.sprites[k]?.assetId && !p.spriteStatus[k])
    await engine.castAction('g', 'sprite', { name: '林岚', emotions: ['smile', 'smile@p2'], rewrite: false })
    lin = await until(engine, 'g', p => settled(p, 2), '两个动作各画一张')
    assert.match(lin.sprites[home].tags, /body-背手站着/)
    assert.match(lin.sprites[onP2].tags, /body-抱着胳膊别过脸/)
    const homeTags = lin.sprites[home].tags

    // 点开「抱着胳膊别过脸」那格，让设计师重写并重画（没写要求：顺手重新设计微笑的表情）
    const designs = () => llm.calls.filter(r => isSprite(r) && /先设计再写——/.test(userText(r))).length
    await engine.castAction('g', 'sprite', { name: '林岚', emotion: 'smile@p2', rewrite: true })
    lin = await until(engine, 'g', p => settled(p, 3), '重写别的动作上的那张')
    assert.equal(designs(), 1, '顺手重新设计了微笑')
    assert.match(lin.sprites[onP2].tags, /body-抱着胳膊别过脸/, '照它自己的动作写')
    assert.doesNotMatch(lin.sprites[onP2].tags, /hands behind back/, '不拿主动作的词')
    assert.match(userText(llm.calls.filter(isSprite).at(-1)), /这个人的动作「抱着胳膊别过脸」/)
    assert.equal(lin.sprites[home].tags, homeTags, '主动作那张不动')
    assert.equal(requests.length, 3, '只重画这一张')

    // 「按新笔记重写表情」：两个动作上的一起重写，主动作那张用设计时写的，另一张照它的动作另写
    await engine.castAction('g', 'sprite', { name: '林岚', emotions: ['smile', 'smile@p2'], rewrite: true })
    lin = await until(engine, 'g', p => settled(p, 5), '两张一起重写')
    assert.equal(designs(), 2)
    assert.equal(lin.sprites[home].tags, '1girl, long black hair, hands behind back, gentle smile')
    assert.match(lin.sprites[onP2].tags, /body-抱着胳膊别过脸/)
    const prompts = requests.slice(-2).map(r => r.parameters.v4_prompt.caption.char_captions[0].char_caption)
    assert.notEqual(prompts[0], prompts[1], '两个动作发出去的词不一样')
  })
})
