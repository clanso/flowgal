// 动作与表情设计：画立绘之前先读完资料和剧情，给每个人设计专属的动作和每种情绪的表情，再照着画底图和换脸。
// 先测纯函数（整理、补设计、归哪个动作），再测设计师的提示词，最后用假的 NovelAI 和假模型把引擎里的整条流程走一遍。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { cleanActing, mergeActing, completeActing, actingPose, actingFace, actingEmotions, actingNoteOf, poseTags, unplacedEmotions, NOTE_CHARS } from '../lib/acting.js'
import { writeActing, writeActingNote, writeSpritePrompts, writerBatch } from '../lib/sprites.js'
import { resolveConfig } from '../lib/config.js'
import { variantKey } from '../lib/look.js'
import { encodePng } from '../lib/image/png.js'
import { createStore } from '../lib/dsh/store.js'
import { createEngine } from '../lib/engine.js'
import { roleText, rulesText, userText, ownText } from './roles.mjs'

// 假的 Tavern 和模型（跟 engine.test.mjs 的一样，那边有自己的测试，不从它引）
const fakeTavern = () => ({
  apiVersion: 1,
  async attach() { return { id: 'm1' } }, async update() {}, async remove() {}, async list() { return [] },
  async getTurn() { return null },
  async getCardContext() { return { description: '林岚：黑长直，蓝眼睛的学姐。', personality: '', scenario: '', lore: [] } },
  async backgroundModel() { return { provider: 'fake', model: 'fake-1' } },
})
function fakeLlm(answer) {
  const calls = []
  return { calls, stream(request) { calls.push(request); const text = answer(request); return (async function* () { yield { type: 'text-delta', text }; yield { type: 'finish', reason: { kind: 'stop' } } })() } }
}
const isActingWriter = request => roleText(request).includes('你是视觉小说的角色表演设计师')
/**
 * 假的立绘设计师：按「要画的差分」里的编号逐条回 tag。
 * 只换脸的：以设计好的脸为底，再按「此刻的处境」添一笔（这里固定添 half-closed eyes，看得出是它写的）。
 */
function spriteReply(request, acting = null) {
  const lines = [...request.messages[0].content[0].text.matchAll(/^- (s\d+)：(.*)$/gm)]
  // 补设计合进写词：先设计再写的那几条照它这次设计的脸写（同样添一笔 half-closed eyes）
  const designed = line => {
    const face = (acting?.faces || []).find(f => line.includes(`情绪「${f.emotion}」`) || line.includes(`情绪「${{ angry: '生气' }[f.emotion]}」`))
    return { tags: `${face?.tags || 'light frown'}, half-closed eyes` }
  }
  return JSON.stringify({
    ...(acting ? { acting } : {}),
    sprites: lines.map(([, id, line]) => (line.startsWith('只换脸——')
      ? { key: id, tags: `${line.match(/（脸 ([^）]*)）/)?.[1] || 'light frown'}, half-closed eyes` }
      : line.startsWith('先设计再写——') ? { key: id, ...designed(line) }
      : { key: id, tags: `1girl, long black hair, written-${id}` })),
  })
}

// 嘴硬心软的学生会长：平时背着手，嘴硬时抱着胳膊别过脸，担心时按着胸口。（第二个动作标着老存档里的侧身，整理时去掉）
const SHEET = {
  read: '嘴硬心软的学生会长：情绪不上脸，开心时嘴角压不住，生气时反而安静下来。',
  poses: [
    { id: 'x', label: '背手站着', desc: '学生会长的习惯：背着手站得笔直', tags: 'hands behind back, straight posture, smiling, long black hair, cowboy shot', side: false, emotions: ['smile', 'neutral', 'happy', 'sad'] },
    { id: 'y', label: '抱着胳膊别过脸', desc: '嘴硬的时候', tags: 'arms crossed, head turned away', side: true, emotions: ['pout', 'angry', 'shy'] },
    { id: 'z', label: '按着胸口', desc: '心里没底的时候', tags: 'hand on own chest', emotions: ['worried', 'neutral', '没有这个情绪'] },
  ],
  faces: [
    { emotion: 'neutral', desc: '没什么表情，嘴角微微收着', tags: 'closed mouth, calm' },
    { emotion: 'angry', desc: '生气时反而不说话，眼神冷下来', tags: 'expressionless, narrowed eyes, cold eyes, closed mouth, hands on hips, long black hair' },
    { emotion: 'smile', desc: '嘴角压不住，又马上收回去', tags: 'slight smile, closed mouth, looking away' },
    { emotion: 'pout', desc: '鼓着脸不看人', tags: 'pout, puffed cheeks, looking to the side' },
  ],
}

test('gate: 整理设计：动作不设上限、一个情绪能放进好几个动作、平静在第一个动作的第一个；动作只留身体，表情只留脸；侧身标记去掉', () => {
  const sheet = cleanActing(SHEET, { allowed: ['neutral', 'smile', 'happy', 'sad', 'pout', 'angry', 'shy', 'worried'] })
  assert.deepEqual(sheet.poses.map(p => [p.id, p.label, p.emotions]), [
    ['p1', '背手站着', ['neutral', 'smile', 'happy', 'sad']],
    ['p2', '抱着胳膊别过脸', ['pout', 'angry', 'shy']],
    ['p3', '按着胸口', ['worried', 'neutral']],
  ], '编号按顺序重编；平静挪到第一个；别的动作里的平静留着（那个动作上的平静脸）；清单外的情绪丢掉')
  assert.deepEqual(cleanActing({ poses: [{ label: 'A', emotions: ['neutral', 'smile', 'smile'] }] }).poses[0].emotions, ['neutral', 'smile'], '一个动作里只留一次')
  assert.deepEqual(cleanActing({ poses: [{ label: 'A', emotions: ['neutral'] }, { label: '空的', emotions: [] }] }, { keepEmpty: true }).poses.map(p => p.label), ['A', '空的'], '玩家刚加的空动作留着')
  assert.ok(sheet.poses.every(p => !('side' in p)), '立绘都按正面画')
  assert.equal(sheet.poses[0].tags, 'hands behind back, straight posture', '动作里的表情、外貌、构图去掉')
  assert.equal(sheet.faces.angry.tags, 'expressionless, narrowed eyes, cold eyes, closed mouth', '表情里的手、外貌去掉')
  assert.equal(sheet.faces.angry.desc, '生气时反而不说话，眼神冷下来')
  assert.match(sheet.read, /嘴硬心软/)
  // 平静分在别的动作里：那个动作挪到最前
  const moved = cleanActing({ poses: [{ label: 'A', emotions: ['angry'] }, { label: 'B', emotions: ['smile', 'neutral'] }] })
  assert.deepEqual(moved.poses.map(p => [p.label, p.emotions]), [['B', ['neutral', 'smile']], ['A', ['angry']]])
  // 没分平静：放进第一个动作
  assert.deepEqual(cleanActing({ poses: [{ label: 'A', emotions: ['angry'] }] }).poses[0].emotions, ['neutral', 'angry'])
  const many = cleanActing({ poses: Array.from({ length: 30 }, (_, i) => ({ label: '动作' + i, emotions: ['e' + i] })) })
  assert.equal(many.poses.length, 30, '动作数不设上限')
  assert.equal(cleanActing({ read: '长'.repeat(5000), poses: [{ label: 'A', emotions: ['neutral'] }] }).read.length, NOTE_CHARS, '表演笔记 2000 字')
  assert.equal(cleanActing({ poses: [{ label: '', emotions: ['smile'] }, { label: 'A', emotions: [] }] }), null, '一个能用的动作都没有')
  assert.equal(cleanActing(null), null)
  // 玩家改过的：留着原来的编号
  assert.deepEqual(cleanActing({ poses: [{ id: 'p3', label: 'A', emotions: ['neutral'] }, { id: 'p3', label: 'B', emotions: ['angry'] }] }, { keepIds: true }).poses.map(p => p.id), ['p3', 'p1'])
})

test('gate: 补设计：已经在动作里的不挪；新情绪按写的动作编号放，不认识的编号新加一个动作（不设上限）；没分到的跟着最接近的内置情绪', () => {
  const sheet = cleanActing(SHEET)
  const { sheet: next, touched } = mergeActing(sheet, {
    poses: [{ id: 'p2', emotions: ['angry', '赌气地道谢'] }, { id: 'new1', label: '捂着脸', tags: 'hands on own face', emotions: ['blush'] }],
    faces: [{ emotion: '赌气地道谢', desc: '嘴上说谢谢，脸别过去', tags: 'pout, blush, looking away' }, { emotion: 'angry', tags: 'angry, glaring' }],
  })
  assert.deepEqual(next.poses.find(p => p.id === 'p2').emotions, ['pout', 'angry', 'shy', '赌气地道谢'], '生气本来就在，不重复')
  assert.deepEqual(next.poses.at(-1), { id: 'p4', label: '捂着脸', desc: '', tags: 'hands on own face', emotions: ['blush'] })
  assert.equal(next.faces.angry.tags, 'angry, narrowed eyes', '重写了表情（太用力的词换轻一档）')
  assert.deepEqual([...touched].sort(), ['angry', '赌气地道谢'])
  assert.equal(sheet.poses.length, 4 - 1, '原设计不动')
  // 已经有很多个动作：照样新加一个
  const full = cleanActing({ poses: Array.from({ length: 12 }, (_, i) => ({ label: '动作' + i, emotions: [i ? 'e' + i : 'neutral'] })) })
  const grown = mergeActing(full, { poses: [{ id: 'new1', label: '再来一个', emotions: ['cry'] }] }).sheet
  assert.deepEqual([grown.poses.length, grown.poses.at(-1).label, grown.poses.at(-1).emotions], [13, '再来一个', ['cry']])
  // 设计里没分到的：新情绪跟着最接近的内置情绪，内置的进默认站姿
  const custom = [{ id: '苦笑', base: 'smile' }, { id: '委屈', base: 'pout' }]
  const done = completeActing(cleanActing(SHEET), ['苦笑', '委屈', 'laugh'], custom)
  assert.ok(done.poses[1].emotions.includes('委屈'))
  assert.ok(done.poses[0].emotions.includes('苦笑') && done.poses[0].emotions.includes('laugh'))
  // 找动作：自己在的 → 最接近的内置情绪在的 → 默认站姿；没有设计回 null
  assert.equal(actingPose(done, 'angry').id, 'p2')
  assert.equal(actingPose(cleanActing(SHEET), '委屈', custom).id, 'p2')
  assert.equal(actingPose(cleanActing(SHEET), 'laugh').id, 'p1')
  assert.equal(actingPose(null, 'angry'), null)
  assert.equal(actingFace(done, 'angry').tags, 'expressionless, narrowed eyes, cold eyes, closed mouth')
  assert.equal(actingFace(done, 'laugh'), null, '不借别的情绪的脸')
  assert.deepEqual(unplacedEmotions(done, ['angry', '新的']), ['新的'])
  // 要设计哪些情绪：内置的全部 + 这个人用过、画过的新情绪 + 这次要的；别人的新情绪不算
  const list = actingEmotions('林岚', [{ id: '苦笑', who: ['林岚'], source: 'director' }, { id: '冷笑', who: ['苏晴'], source: 'director' }], { extra: ['强忍泪水微笑'] })
  assert.ok(list.includes('neutral') && list.includes('苦笑') && list.includes('强忍泪水微笑') && !list.includes('冷笑'))
  assert.equal(poseTags('hand in own hair, blonde hair, frown, standing'), 'hand in own hair', '手插进头发是动作，发色不是')
})

const reply = text => ({ stream() { const out = typeof text === 'function' ? text() : text; return (async function* () { yield { type: 'text-delta', text: out }; yield { type: 'finish', reason: { kind: 'stop' } } })() } })

test('gate: 动作与表情设计师：读完资料、剧情和档案再设计；补设计时带着已有设计，已在动作里的只重写表情', async () => {
  const calls = []
  const llm = { stream(request) { calls.push(request); return reply(JSON.stringify(SHEET)).stream() } }
  const person = { name: '林岚', gender: 'female', appearance: '1girl, long black hair', outfit: '校服', states: [], note: '别画眼镜', timeline: { outfits: { 校服: { tags: 'school uniform' } } } }
  const context = { description: '林岚：学生会长，嘴硬心软。', lore: [{ title: '过去', content: '小时候被同学孤立过。' }] }
  const story = [{ turn: 1, text: '“哼，我才没有在等你。”林岚别过脸。' }]
  const sheet = await writeActing({ llm, provider: 'f', model: 'f', config: resolveConfig({}), backend: 'novelai', context, story, turn: 1, person, emotions: ['neutral', 'smile', 'happy', 'sad', 'pout', 'angry', 'shy', 'worried', '赌气地道谢'], custom: [{ id: '赌气地道谢', desc: '老存档里导演写的描述', base: 'pout' }] })
  const system = rulesText(calls[0])
  const user = ownText(calls[0])
  assert.match(system, /角色表演设计师[\s\S]*先读人[\s\S]*动作表 poses[\s\S]*表情表 faces/)
  assert.match(system, /不设上限/)
  assert.doesNotMatch(system, /"side"|side: true|侧身/)
  assert.match(system, /表演笔记·本性（玩家写的，必须遵守）」时[\s\S]*read 照抄那一条/)
  for (const part of [/学生会长，嘴硬心软/, /被同学孤立过/, /我才没有在等你/, /名字：林岚（女）/, /立绘备注（玩家写的，必须遵守）：别画眼镜/, /- angry（生气）/, /- 赌气地道谢（新情绪，接近 pout 赌气）/, /给这个人设计一套动作表/]) assert.match(user, part)
  assert.doesNotMatch(user, /老存档里导演写的描述/, '情绪库的描述不进提示词')
  assert.doesNotMatch(user, /已有的动作与表情设计/)
  assert.deepEqual(sheet.poses.map(p => p.emotions[0]), ['neutral', 'pout', 'worried'])
  assert.ok(sheet.poses[0].emotions.includes('赌气地道谢') === false && sheet.poses[1].emotions.includes('赌气地道谢'), '没分到的新情绪跟着最接近的赌气')
  assert.equal(calls.length, 2, '漏写表情的几种情绪补要一次')
  assert.match(calls[1].messages[0].content[0].text, /【已有的动作与表情设计】[\s\S]*只重新设计表情/)

  // 往已有设计里补：带着已有设计；只要它补的那几条
  const more = []
  const llm2 = { stream(request) { more.push(request); return reply(JSON.stringify({ poses: [{ id: 'p2', emotions: ['委屈'] }], faces: [{ emotion: '委屈', desc: '咬着嘴唇不吭声', tags: 'biting lip, teary eyes, looking down' }, { emotion: 'angry', desc: '冷下来', tags: 'cold eyes, closed mouth' }] })).stream() } }
  const next = await writeActing({ llm: llm2, provider: 'f', model: 'f', config: resolveConfig({}), backend: 'novelai', context, story, turn: 2, person, emotions: ['委屈', 'angry'], current: sheet, custom: [] })
  const addUser = more[0].messages[0].content[0].text
  assert.match(addUser, /【已有的动作与表情设计】\n表演笔记·本性：嘴硬心软的学生会长[\s\S]*- p2「抱着胳膊别过脸」［没标本性还是处境］：嘴硬的时候；身体 arms crossed, head turned away；情绪：赌气（底图）、生气、害羞/)
  assert.doesNotMatch(addUser, /新加一个动作（id 写 new1，总共不超过/)
  assert.match(addUser, /- 委屈（新情绪）\n- angry（生气）：已在动作 p2「抱着胳膊别过脸」里，只重新设计表情/)
  assert.match(addUser, /还没分组的放进最合适的已有动作/)
  assert.equal(more.length, 1)
  assert.ok(next.poses[1].emotions.includes('委屈'))
  assert.equal(next.faces.angry.tags, 'cold eyes, closed mouth')
  assert.equal(sheet.faces.angry.tags, 'expressionless, narrowed eyes, cold eyes, closed mouth', '原设计不动')

  // 玩家写了表演笔记：设计师那边当硬规矩，已有设计里设计师起草的那条不再带
  const noted = []
  const llm3 = { stream(request) { noted.push(request); return reply(JSON.stringify({ faces: [{ emotion: 'angry', tags: 'cold eyes' }] })).stream() } }
  await writeActing({ llm: llm3, provider: 'f', model: 'f', config: resolveConfig({}), backend: 'novelai', context, story, turn: 2, person: { ...person, actingNote: '生气时会笑，越生气笑得越甜' }, emotions: ['angry'], current: sheet, custom: [] })
  const notedUser = noted[0].messages[0].content[0].text
  assert.match(notedUser, /表演笔记·本性（玩家写的，必须遵守）：生气时会笑，越生气笑得越甜/)
  assert.doesNotMatch(notedUser, /表演笔记·本性：嘴硬心软/)

  // 写不出能用的：回 null（调用方按已有的或通用动作组画）
  assert.equal(await writeActing({ llm: { stream: () => reply('{}').stream() }, provider: 'f', model: 'f', config: resolveConfig({}), backend: 'novelai', person, emotions: ['neutral'] }), null)
})

test('gate: 表演笔记：玩家写的优先、设计师起草的垫底；让设计师重写时只要 read，玩家写的那条不给它看', async () => {
  assert.deepEqual(actingNoteOf({ actingNote: ' 我写的 ', acting: { read: '设计师的' } }), { text: '我写的', by: 'user' })
  assert.deepEqual(actingNoteOf({ acting: { read: '设计师的' } }), { text: '设计师的', by: 'ai' })
  assert.deepEqual(actingNoteOf({}), { text: '', by: '' })
  const calls = []
  const llm = { stream(request) { calls.push(request); return reply(JSON.stringify({ read: '新的笔记：嘴硬，眼神先软下来。', poses: [{ id: 'p9', label: '不该收', emotions: ['cry'] }] })).stream() } }
  const sheet = cleanActing(SHEET)
  const person = { name: '林岚', gender: 'female', appearance: '1girl', states: [], actingNote: '玩家写的旧笔记', acting: sheet, timeline: {} }
  const read = await writeActingNote({ llm, provider: 'f', model: 'f', config: resolveConfig({}), backend: 'novelai', context: {}, story: [], turn: 3, person, current: sheet })
  assert.equal(read, '新的笔记：嘴硬，眼神先软下来。')
  const user = calls[0].messages[0].content[0].text
  assert.match(user, /这次只重写这个人的表演笔记·本性（read）/)
  assert.match(user, /【已有的动作与表情设计】[\s\S]*- p2「抱着胳膊别过脸」/)
  assert.doesNotMatch(user, /玩家写的旧笔记|表演笔记·本性：嘴硬心软/)
  assert.equal(calls.length, 1)
})

test('gate: 立绘设计师一次写几张：按最大输出算，默认一次一百多张；填了小的最大输出就分批', () => {
  assert.equal(writerBatch(resolveConfig({})), 128)
  assert.equal(writerBatch(resolveConfig({ director: { maxTokens: 8192 } })), 8)
  assert.equal(writerBatch(resolveConfig({ director: { maxTokens: 1000 } })), 1)
})

test('gate: 立绘设计师照设计写：底图写这个人的动作和表情，不再给通用动作参考；档案里带上他的表演笔记', async () => {
  const calls = []
  const llm = { stream(request) { calls.push(request); return reply(JSON.stringify({ sprites: [{ key: 's1', tags: '1girl, long black hair, arms crossed' }, { key: 's2', tags: '1girl, smile' }] })).stream() } }
  const acting = cleanActing(SHEET)
  const look = { appearance: '1girl, long black hair', outfit: '校服', states: [] }
  const targets = [
    { key: variantKey(look, 'pout'), emotion: 'pout', outfit: '校服', outfitTags: 'school uniform', states: [], look: acting.faces.pout, pose: { id: 'p2', label: '抱着胳膊别过脸', desc: '嘴硬的时候', tags: 'arms crossed, head turned away', designed: true, members: ['生气', '害羞'] } },
    { key: variantKey(look, 'happy'), emotion: 'happy', outfit: '校服', outfitTags: 'school uniform', states: [], pose: { id: 'p1', label: '背手站着', desc: '背着手站得笔直', tags: 'hands behind back', designed: true, members: null } },
  ]
  await writeSpritePrompts({ llm, provider: 'f', model: 'f', config: resolveConfig({}), backend: 'novelai', person: { name: '林岚', gender: 'female', appearance: '1girl, long black hair', acting, timeline: {} }, targets })
  const user = ownText(calls[0])
  assert.match(user, /表演笔记·本性（表演设计师读完资料写的）：嘴硬心软的学生会长/)
  assert.match(user, /- s1：.*情绪「赌气」；这个人的动作「抱着胳膊别过脸」：嘴硬的时候（身体 arms crossed, head turned away）；这个人的表情：鼓着脸不看人（脸 pout, puffed cheeks, looking to the side）；这张是「抱着胳膊别过脸」动作的底图：同一个动作的生气、害羞会在这张上只换脸/)
  assert.match(user, /- s2：.*情绪「开心」；这个人的动作「背手站着」：背着手站得笔直（身体 hands behind back）$/m, '整张画（不换脸）的也照设计的动作，没设计表情的不硬塞')
  assert.doesNotMatch(user, /动作参考/)
  assert.match(rulesText(calls[0]), /写了「这个人的动作」「这个人的表情」的，是读完资料和剧情专门为他设计好的/)
  // 玩家写了表演笔记：用玩家的，当硬规矩
  await writeSpritePrompts({ llm, provider: 'f', model: 'f', config: resolveConfig({}), backend: 'novelai', person: { name: '林岚', gender: 'female', appearance: '1girl, long black hair', acting, actingNote: '笑的时候总先低头', timeline: {} }, targets })
  assert.match(calls[1].messages[0].content[0].text, /表演笔记·本性（玩家写的，必须遵守）：笑的时候总先低头/)
  assert.doesNotMatch(calls[1].messages[0].content[0].text, /嘴硬心软的学生会长/)
})

// ───────────────────────── 引擎：整条流程 ─────────────────────────

const W = 256, H = 384
const EYES = { eyes: [[96, 96, 120, 112], [136, 96, 160, 112]], mouth: [[120, 136, 136, 144]] }
const solid = (width, height, [r, g, b]) => { const data = new Uint8ClampedArray(width * height * 4); for (let i = 0; i < data.length; i += 4) data.set([r, g, b, 255], i); return { width, height, data } }

/** 假 NovelAI：正常出图回蓝色，局部重绘回红色。记下每次请求。 */
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

async function settle(engine, gameId, done, what = '') {
  const end = Date.now() + 6000
  for (;;) {
    const view = await engine.gameView(gameId)
    const lin = view.cast.find(p => p.name === '林岚')
    if (lin && done(lin)) return lin
    if (Date.now() > end) throw new Error('等太久：' + what + ' ' + JSON.stringify(lin?.spriteStatus))
    await new Promise(r => setTimeout(r, 20))
  }
}

const charOf = r => r.parameters?.v4_prompt?.caption?.char_captions?.[0]?.char_caption || ''

test('gate: 只换脸整条流程按设计走：要「生气」→ 先设计整套 → 画这个人「抱着胳膊别过脸」的底图（正面） → 生气的脸由立绘设计师以设计好的为底写、再换 → 新情绪补设计 → 玩家改设计 → 重写表情时重新设计那张脸', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'flowgal-acting-'))
  try {
    const store = createStore(dir)
    const tavern = fakeTavern()
    let addReply = null
    const llm = fakeLlm(request => {
      if (isActingWriter(request)) return request.messages[0].content[0].text.includes('【已有的动作与表情设计】') ? JSON.stringify(addReply) : JSON.stringify(SHEET)
      if (roleText(request).includes('立绘设计师')) return spriteReply(request, userText(request).includes('【先补设计】') ? addReply : null)
      return '{}'
    })
    const combined = () => llm.calls.filter(c => userText(c).includes('【先补设计】'))
    const { requests, fetchImpl } = fakeNai()
    const engine = createEngine({ store, services: { tavern, llm }, fetchImpl, logger: { warn() {}, info() {} } })
    await engine.patchConfig({ images: { auto: false, backgrounds: false, sizes: { portrait: [W, H] } } })
    await engine.setSecret('novelai', 'official', 'k')
    await engine.castAction('g', 'save', { name: '林岚', patch: { appearance: '1girl, long black hair, blue eyes', gender: 'female', seed: 7 } })
    const look = { appearance: '1girl, long black hair, blue eyes', outfit: '', states: [] }
    const pout = variantKey(look, 'pout'), angry = variantKey(look, 'angry'), neutral = variantKey(look, 'neutral')

    await engine.castAction('g', 'sprite', { name: '林岚', emotion: 'angry' })
    let lin = await settle(engine, 'g', p => p.sprites[pout]?.assetId && p.spriteStatus[angry]?.status === 'face', '底图画好、生气等认脸')
    const acting = llm.calls.filter(isActingWriter)
    assert.equal(acting.length, 2, '先设计整套（漏写表情的补要一次）')
    assert.match(acting[0].messages[0].content[0].text, /黑长直，蓝眼睛的学姐[\s\S]*- angry（生气）/)
    assert.deepEqual(lin.acting.poses.map(p => [p.id, p.label, p.emotions[0]]), [['p1', '背手站着', 'neutral'], ['p2', '抱着胳膊别过脸', 'pout'], ['p3', '按着胸口', 'worried']])
    assert.equal(lin.acting.by, 'ai')
    assert.ok(lin.acting.poses.flatMap(p => p.emotions).includes('cry'), '没分到的内置情绪也有归处')
    // 立绘设计师一次写底图（赌气）和只换脸的生气：只换脸的也读完资料和剧情写，设计好的脸是底
    const writer = llm.calls.filter(c => roleText(c).includes('立绘设计师'))
    assert.equal(writer.length, 1)
    const writerUser = writer[0].messages[0].content[0].text
    assert.match(writerUser, /- s1：只换脸——在「赌气」那张「抱着胳膊别过脸」动作底图上只重画脸.*情绪「生气」.*这个人的表情：生气时反而不说话，眼神冷下来（脸 expressionless, narrowed eyes, cold eyes, closed mouth）/)
    assert.match(writerUser, /- s2：.*情绪「赌气」；这个人的动作「抱着胳膊别过脸」：嘴硬的时候（身体 arms crossed, head turned away）；这个人的表情：鼓着脸不看人.*同一个动作的生气、害羞、脸红会在这张上只换脸/, '没分到的脸红跟着它那一类（羞）的害羞走')
    assert.match(writerUser, /【剧情（到第/)
    assert.match(rulesText(writer[0]), /标着「只换脸」的.*跟整张画的一样读完资料和剧情再写，不要照抄设计好的表情/)
    assert.equal(requests.length, 1)
    assert.doesNotMatch(charOf(requests[0]), /from side|profile/, '老存档里标着侧身的动作也按正面画')
    assert.deepEqual([lin.sprites[pout].pose, lin.sprites[pout].side, lin.sprites[pout].poseLabel], ['p2', undefined, '抱着胳膊别过脸'])
    assert.deepEqual(lin.sprites[angry].face, { from: pout, pose: 'p2' })
    assert.deepEqual([lin.sprites[angry].tags, lin.sprites[angry].writer], ['expressionless, narrowed eyes, cold eyes, closed mouth, half-closed eyes', 'ai'])

    // 认出脸：生气换上设计师写的脸
    await engine.castAction('g', 'face-box', { name: '林岚', key: pout, rects: EYES })
    lin = await settle(engine, 'g', p => p.sprites[angry]?.assetId && !p.spriteStatus[angry], '换好脸')
    assert.equal(requests[1].action, 'infill')
    assert.match(charOf(requests[1]), /expressionless, narrowed eyes, cold eyes, closed mouth, half-closed eyes/)
    assert.doesNotMatch(charOf(requests[1]), /puffed cheeks/)

    // 导演新造的情绪：补进设计（不重新设计整套）和写词一次请求做完，再在默认站姿（平静）的底图上换脸
    addReply = { poses: [{ id: 'p1', emotions: ['强忍泪水微笑'] }], faces: [{ emotion: '强忍泪水微笑', desc: '笑着，眼眶红了', tags: 'smile, tearing up, trembling lips' }] }
    const tearful = variantKey(look, '强忍泪水微笑')
    const writes = llm.calls.length
    await engine.castAction('g', 'sprite', { name: '林岚', emotion: '强忍泪水微笑' })
    lin = await settle(engine, 'g', p => p.sprites[neutral]?.assetId && p.spriteStatus[tearful]?.status === 'face', '补设计、画平静底图')
    assert.equal(llm.calls.length, writes + 1, '补设计和写词（连平静的底图）一次请求')
    const added = userText(combined().at(-1))
    assert.match(added, /【先补设计】[\s\S]*你是视觉小说的角色表演设计师[\s\S]*【已有的动作与表情设计】[\s\S]*- 强忍泪水微笑（新情绪）/)
    assert.match(added, /- s\d：先设计再写——情绪「强忍泪水微笑」/)
    assert.match(added, /- s\d：.*情绪「平静」；这个人的动作「背手站着」/, '要换脸的底图在同一次里写')
    assert.match(added, /\{"acting":\{表演设计师要输出的那个对象/)
    assert.equal(llm.calls.filter(isActingWriter).length, 2, '不再单独补设计')
    assert.ok(lin.acting.poses[0].emotions.includes('强忍泪水微笑'))
    assert.deepEqual([lin.sprites[tearful].face.from, lin.sprites[tearful].tags], [neutral, 'smile, tearing up, trembling lips, half-closed eyes'])
    assert.equal(lin.sprites[neutral].side, undefined)
    assert.doesNotMatch(charOf(requests.at(-1)), /from side/)

    // 玩家改设计：把开心挪进「按着胸口」，改生气的脸；编号留着
    const edited = structuredClone(lin.acting)
    edited.poses[0].emotions = edited.poses[0].emotions.filter(e => e !== 'happy')
    edited.poses[2].emotions.push('happy')
    edited.faces.angry = { desc: '气到发抖', tags: 'angry, clenched teeth' }
    await engine.castAction('g', 'acting-save', { name: '林岚', acting: edited })
    lin = (await engine.gameView('g')).cast.find(p => p.name === '林岚')
    assert.equal(lin.acting.by, 'user')
    assert.deepEqual(lin.acting.poses.map(p => p.id), ['p1', 'p2', 'p3'])
    assert.ok(lin.acting.poses[2].emotions.includes('happy') && !lin.acting.poses[0].emotions.includes('happy'))
    assert.equal(lin.acting.faces.angry.tags, 'angry, clenched teeth')
    assert.match(lin.acting.read, /嘴硬心软/, '动作与表情这边存不改表演笔记')
    await assert.rejects(engine.castAction('g', 'acting-save', { name: '林岚', acting: { poses: [] } }), /至少要有一个/)
    // 边改边存：编辑器里那份是旧的（少了后来补进来的情绪和表情），存的时候补进来的不丢
    const stalePoses = structuredClone(edited)
    stalePoses.poses[0].emotions = stalePoses.poses[0].emotions.filter(e => e !== '强忍泪水微笑')
    delete stalePoses.faces['强忍泪水微笑']
    await engine.castAction('g', 'acting-save', { name: '林岚', acting: stalePoses })
    lin = (await engine.gameView('g')).cast.find(p => p.name === '林岚')
    assert.ok(lin.acting.poses.flatMap(p => p.emotions).includes('强忍泪水微笑'))
    assert.equal(lin.acting.faces['强忍泪水微笑'].tags, 'smile, tearing up, trembling lips')

    // 「让设计师重写并重画」生气：只重新设计这张脸（不挪动作），再在原来的底图上换
    addReply = { faces: [{ emotion: 'angry', desc: '咬着嘴唇忍着', tags: 'biting lip, glaring' }] }
    const before = requests.length
    await engine.castAction('g', 'sprite', { name: '林岚', emotion: 'angry' })
    // 设计师写的 glaring 发出去收成 narrowed eyes（立绘表情收着画），设计里也存收过的；上面玩家自己写的 clenched teeth 照存
    lin = await settle(engine, 'g', p => requests.length > before && p.sprites[angry]?.tags === 'biting lip, glaring, half-closed eyes' && !p.spriteStatus[angry], '重新设计这张脸')
    assert.match(userText(combined().at(-1)), /- angry（生气）：已在动作 p2「抱着胳膊别过脸」里，只重新设计表情/)
    assert.equal(requests.at(-1).action, 'infill')
    assert.match(charOf(requests.at(-1)), /biting lip, narrowed eyes/)
    assert.doesNotMatch(charOf(requests.at(-1)), /glaring/)
    assert.equal(lin.acting.faces.angry.tags, 'biting lip, narrowed eyes')

    // 导演日志里有设计这一步；补设计合进写词的那两次记在立绘那边，带着补好的设计，先设计再写的那条换成了实际的差分
    const log = (await engine.directorLog('g')).entries
    const entries = log.filter(e => e.kind === 'acting').map(e => e.summary)
    assert.equal(entries.length, 1)
    assert.match(entries[0], /^动作与表情 · 林岚：整套设计/)
    const both = log.filter(e => /^补设计并写立绘/.test(e.summary))
    assert.deepEqual(both.map(e => e.summary), ['补设计并写立绘 · 林岚：补 生气', '补设计并写立绘 · 林岚：补 强忍泪水微笑；另写 基础 · 平静'])
    const { entry: redone } = await engine.directorEntry('g', both[0].id)
    assert.equal(redone.acting.faces.angry.tags, 'biting lip, narrowed eyes')
    const row = redone.sprites.find(r => r.key === angry)
    assert.ok(row && !redone.sprites.some(r => r.key.startsWith('design:')))
    assert.equal(row.raw, 'biting lip, glaring, half-closed eyes')
    assert.deepEqual(row.replaced, [{ from: 'glaring', to: 'narrowed eyes' }])
    assert.match(row.sent, /biting lip, narrowed eyes/)
    engine.dispose()
  } finally {
    await rm(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 })
  }
})

test('gate: 设计不出来时按通用动作组画；关掉立绘设计师不设计；「重新设计」整套重来；按这套设计重画不重设计表情', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'flowgal-acting-'))
  try {
    const store = createStore(dir)
    let actingReply = '{}'
    const llm = fakeLlm(request => (isActingWriter(request) ? actingReply : roleText(request).includes('立绘设计师') ? spriteReply(request) : '{}'))
    const { requests, fetchImpl } = fakeNai()
    const engine = createEngine({ store, services: { tavern: fakeTavern(), llm }, fetchImpl, logger: { warn() {}, info() {} } })
    await engine.patchConfig({ images: { auto: false, backgrounds: false, sizes: { portrait: [W, H] } } })
    await engine.setSecret('novelai', 'official', 'k')
    await engine.castAction('g', 'save', { name: '林岚', patch: { appearance: '1girl, long black hair', gender: 'female' } })
    const look = { appearance: '1girl, long black hair', outfit: '', states: [] }
    const cold = variantKey(look, 'cold'), angry = variantKey(look, 'angry')

    // 设计不出来：生气照通用的「抱臂」组，底图冷淡
    await engine.castAction('g', 'sprite', { name: '林岚', emotion: 'angry' })
    let lin = await settle(engine, 'g', p => p.sprites[cold]?.assetId && p.spriteStatus[angry]?.status === 'face', '通用动作组')
    assert.equal(lin.acting, null)
    assert.deepEqual([lin.sprites[cold].pose, lin.sprites[angry].face.pose], ['arms', 'arms'])
    assert.match(llm.calls.filter(c => roleText(c).includes('立绘设计师'))[0].messages[0].content[0].text, /动作组的底图/)
    const failed = (await engine.directorLog('g')).entries.find(e => e.kind === 'acting')
    assert.equal(failed.status, 'failed')
    assert.match(failed.error, /先按通用动作组画/)

    // 「重新设计」：整套重来，后台跑
    actingReply = JSON.stringify(SHEET)
    await engine.castAction('g', 'acting-design', { name: '林岚' })
    lin = await settle(engine, 'g', p => p.acting && !p.actingBusy, '重新设计')
    assert.equal(lin.acting.poses[1].label, '抱着胳膊别过脸')

    // 按这套设计重画（keepFaces）：生气改到「抱着胳膊别过脸」上换脸、表情由立绘设计师以设计好的为底再写，不再设计
    const designs = llm.calls.filter(isActingWriter).length
    const pout = variantKey(look, 'pout')
    await engine.castAction('g', 'sprite', { name: '林岚', emotions: ['cold', 'angry'], keepFaces: true })
    const neutral = variantKey(look, 'neutral')
    lin = await settle(engine, 'g', p => p.sprites[pout]?.assetId && p.sprites[neutral]?.assetId && p.sprites[angry]?.face?.from === pout && p.sprites[cold]?.face?.from === neutral, '按新设计重画')
    assert.equal(llm.calls.filter(isActingWriter).length, designs, '不重新设计')
    assert.equal(lin.sprites[angry].tags, 'expressionless, narrowed eyes, cold eyes, closed mouth, half-closed eyes')
    assert.deepEqual([lin.sprites[cold].side, lin.sprites[cold].poseLabel], [undefined, '背手站着'], '冷淡在设计里没分到：进默认站姿，在平静的底图上换脸')
    assert.ok(!requests.some(r => /from side/.test(charOf(r))), '没有侧身底图')

    // 关掉立绘设计师：不再设计，已有的设计照用
    await engine.patchConfig({ images: { spriteWriter: false } })
    const calls = llm.calls.length
    await engine.castAction('g', 'sprite', { name: '林岚', emotion: '委屈' })
    lin = await settle(engine, 'g', p => p.sprites[variantKey(look, '委屈')]?.face, '关掉设计师')
    assert.equal(llm.calls.length, calls)
    assert.equal(lin.sprites[variantKey(look, '委屈')].face.pose, 'p1', '没设计到的情绪进默认站姿')
    // 关掉设计师时只换脸的直接用设计好的脸（按档案拼的保底）
    await engine.castAction('g', 'sprite', { name: '林岚', emotion: 'smile', rewrite: true })
    lin = await settle(engine, 'g', p => p.sprites[variantKey(look, 'smile')]?.writer === 'fallback', '关掉设计师的保底')
    assert.equal(lin.sprites[variantKey(look, 'smile')].tags, 'slight smile, closed mouth, looking away')
    assert.equal(llm.calls.length, calls)
    engine.dispose()
  } finally {
    await rm(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 })
  }
})
