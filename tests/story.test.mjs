// 只演故事本身：切单元前剥掉思考、变量更新、网页外壳和装饰；导演把状态栏、目录、作者的话这些标成不演；剧场和写词的都只读要演的部分。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { cleanTurnText } from '../lib/clean.js'
import { segmentTurn, joinUnits, pairUnits } from '../lib/segment.js'
import { normalizeScript, rawSection, scriptScenes, sceneAfter, playingAfter, previousBrief } from '../lib/director.js'
import { playedUnits, castAtEnd } from '../lib/staging.js'
import { buildBeats } from '../src/client/theater/playback.js'
import { createStore } from '../lib/dsh/store.js'
import { createEngine } from '../lib/engine.js'

/** 只要导演那一步：Tavern 记轮次和挂上去的场景卡，模型每次回同一份 JSON。 */
function fakeTavern() {
  const turns = new Map()
  const items = new Map()
  let seq = 0
  return {
    apiVersion: 1,
    turns,
    async attach({ gameId, turn, textVersion, item }) { const id = 'm' + ++seq; items.set(id, { id, gameId, turn, textVersion, ...item, current: true }); return { id } },
    async update(id, changes) { Object.assign(items.get(id), changes) },
    async list({ gameId }) { return [...items.values()].filter(i => i.gameId === gameId) },
    async getTurn({ gameId, turn }) { return turns.get(gameId + ':' + turn) || null },
    async getCardContext() { return null },
    async backgroundModel() { return { provider: 'fake', model: 'fake-1' } },
  }
}
function fakeLlm(text) {
  const calls = []
  return { calls, stream(request) { calls.push(request); return (async function* () { yield { type: 'text-delta', text }; yield { type: 'finish', reason: { kind: 'stop' } } })() } }
}

const WIKI = `<thinking>用户想看回想剧本，用 wiki 样式输出。</thinking>
\`\`\`html
<!DOCTYPE html><html><head><title>回想剧本 - 星屑Wiki</title><style>.toc{color:red}</style></head><body>
<nav><a href="#">首页</a> · <a href="#">角色</a> · <a href="#">剧情</a></nav>
<h1>第三章「雨夜的约定」回想剧本</h1>
<div class="toc"><b>目录</b><ul><li>1 简介</li><li>2 剧本</li></ul></div>
<table class="infobox"><tr><th>章节</th><td>第三章</td></tr></table>
<h2>剧本</h2>
<p><span class="name">林岚</span>「你来了啊，{{user}}。」</p>
<dl><dt>苏晴</dt><dd>学姐，我也在哦！</dd></dl>
<p>林岚轻轻按下一个琴键，余音在雨声里散开。&nbsp;</p>
<footer>本页面最后编辑于 2026 年 10 月 9 日</footer>
</body></html>
\`\`\`
<UpdateVariable>_.set('好感度.林岚', 52)</UpdateVariable>`
/** Tavern 给插件的 text：宏换好、去掉 script / style 和全部标签（不补换行）。 */
const tavernText = raw => raw.replaceAll('{{user}}', '阿哲').replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '').replace(/<[^>]+>/g, '').trim()

test('gate: 网页式正文按结构拆成一行一行，导航、页脚、思考、变量更新整块去掉，{{user}} 换成名字', () => {
  const text = cleanTurnText({ text: tavernText(WIKI), rawText: WIKI, card: { name: '林岚' } })
  const lines = text.split('\n')
  for (const junk of ['用户想看', 'DOCTYPE', '```', '星屑Wiki', 'color:red', '首页 · 角色', '最后编辑', '好感度.林岚', '&nbsp;']) assert.ok(!text.includes(junk), junk)
  assert.ok(lines.includes('林岚「你来了啊，阿哲。」'))
  assert.ok(lines.includes('苏晴：学姐，我也在哦！'), '定义列表的名字和台词合成一行')
  assert.ok(lines.includes('章节 | 第三章'), '表格一行里的格子不粘在一起')
  assert.ok(lines.includes('目录') && lines.includes('1 简介'), '目录这类拿不准的留给导演')
  assert.ok(lines.includes('林岚轻轻按下一个琴键，余音在雨声里散开。'))
})

test('gate: 原文有对不上的宏时用 Tavern 的 text，并把思考、变量更新、页面外壳的字删掉', () => {
  const raw = WIKI.replace('{{user}}', '{{getvar::name}}')
  const text = cleanTurnText({ text: tavernText(raw).replace('{{getvar::name}}', '阿哲'), rawText: raw })
  for (const junk of ['用户想看', '星屑Wiki', '最后编辑', '好感度.林岚', '```']) assert.ok(!text.includes(junk), junk)
  assert.ok(text.includes('林岚「你来了啊，阿哲。」'))
  // 原文比 text 多出一大截：Tavern 的正则把东西藏起来了，跟 Tavern 走。
  const hidden = '<p>正文。</p>\n' + '<div class="secret">' + '藏起来的设定。'.repeat(40) + '</div>'
  assert.equal(cleanTurnText({ text: '正文。', rawText: hidden }), '正文。')
})

test('gate: 分隔线、代码块标记、Markdown 记号和 HTML 实体收拾干净，没有正文时为空', () => {
  const text = cleanTurnText({ text: '# 第一章\n**她**回过头&hellip;\n————————\n```\n- 林岚：你好。\n|---|---|\n> 苏晴：嗯。\n“……”\n...\n[链接](https://x.example)' })
  assert.deepEqual(text.split('\n'), ['第一章', '她回过头…', '林岚：你好。', '苏晴：嗯。', '“……”', '...', '链接'])
  assert.equal(cleanTurnText({ text: '  ', rawText: '<div>x</div>' }), '')
})

test('gate: 切单元不替导演判断状态栏：标签包着的状态栏照样切出来，导演读带标签的完整原文自己判断；中文名的标签不原样留在字里', () => {
  // 角色卡的状态栏：一个标签套着几个字段，最后一个字段写得像心里话（卡片上默认被盖住的「未归档记录」）。
  const story = '江行止看见了。他当时想，戴在这只手腕上，宽度刚好。\n\n他等你的回答。'
  const panel = '<江行止状态>\n<位置>老城区，无名法餐厅。</位置>\n<暗流>\n宽度刚好。\n（删除。）\n覆盆子太红了。\n</暗流>\n</江行止状态>'
  const raw = story + '\n\n' + panel
  const lines = cleanTurnText({ text: tavernText(raw), rawText: raw }).split('\n')
  assert.ok(lines.includes('老城区，无名法餐厅。') && lines.includes('覆盆子太红了。'), '状态栏的字照样切成单元，演不演由导演定')
  const section = rawSection(raw)
  assert.ok(section.startsWith('【本轮原文'))
  assert.ok(section.includes('<江行止状态>') && section.includes('<暗流>') && section.includes(story), '导演看到的是带标签的原样')
  assert.equal(rawSection('  '), '', '没有原文时不附这一节')
  // 原文里同时有网页标签时按结构拆：<旁白> 这种中文名的标签也去掉符号，字留下。
  const prose = '<div><p>她回过头。</p><p>“走吧。”</p></div><旁白>雨停了。</旁白>'
  assert.deepEqual(cleanTurnText({ text: tavernText(prose), rawText: prose }).split('\n'), ['她回过头。', '“走吧。”', '雨停了。'])
})

test('gate: 切单元认得【名字】和表格一行；引号前只有名字的不再单独演一句；一行几项的状态栏不当台词', () => {
  const units = segmentTurn([
    '【林岚】你来了。', '苏晴 | 学姐！', '身高 | 160cm | 体重', '林岚说：“坐吧。”', '林岚低声道，“别出声。”',
    '我愣了一下：「抱歉。」', '时间：19:40 ｜ 地点：屋檐下', '好感度：林岚 52 ｜ 苏晴 47',
  ].join('\n'))
  const brief = units.map(u => [u.type, u.hint || '', u.text])
  assert.deepEqual(brief, [
    ['dialogue', '林岚', '你来了。'],
    ['dialogue', '苏晴', '学姐！'],
    ['dialogue', '身高', '160cm　体重'],
    ['dialogue', '林岚', '坐吧。'],
    ['dialogue', '林岚', '别出声。'],
    ['narration', '', '我愣了一下：'],
    ['dialogue', '我', '抱歉。'],
    ['narration', '', '时间：19:40 ｜ 地点：屋檐下'],
    ['narration', '', '好感度：林岚 52 ｜ 苏晴 47'],
  ])
})

const TURN = ['状态栏', '时间：19:40 ｜ 地点：屋檐下', '雨下大了。', '林岚', '你来了啊。', '（她低下头。）', '我们走吧。', '—— 第三章 · 完 ——'].join('\n')

test('gate: 导演标的 skip 可以写区间；不演的单元不留标注，插画挂到前面最近一句要演的；全都不演等于没写', () => {
  const units = segmentTurn(TURN)
  assert.deepEqual(units.map(u => u.text), ['状态栏', '时间：19:40 ｜ 地点：屋檐下', '雨下大了。', '林岚', '你来了啊。', '她低下头。', '我们走吧。', '—— 第三章 · 完 ——'])
  const raw = {
    skip: ['U1-U2', 'u4', 'U8', 'U99', 'U6~U3x'],
    cast: [{ name: '林岚', pos: 'center' }],
    lines: [
      { u: 'U2', sp: '林岚' },
      { u: 'U5', type: 'dialogue', sp: '林岚', emo: 'smile' },
      { u: 'U6', type: 'narration' },
      { u: 'U7', type: 'narration' },
      { u: 'U3', type: 'weird' },
    ],
    images: [{ after: 'U8', until: 'U4', moment: '雨里的林岚' }, { after: 'U4', moment: '林岚回头' }],
  }
  const s = normalizeScript(raw, units, { maxImages: 2 })
  assert.deepEqual(s.skip, ['U1', 'U2', 'U4', 'U8'])
  assert.equal(s.lines.U2, undefined)
  assert.deepEqual(s.lines.U5, { type: 'dialogue', sp: '林岚', emo: 'smile' })
  assert.deepEqual(s.lines.U6, { type: 'narration' }, '括号里的舞台指示改判成旁白')
  assert.equal(s.lines.U7.type, undefined, '改判成原来的类型等于没写')
  assert.equal(s.lines.U3.type, undefined)
  assert.equal(s.images[0].after, 'U7')
  assert.equal(s.images[0].until, undefined, '收起的那句挪到了 after 前面，就显示到这一轮结束')
  assert.equal(s.images[1].after, 'U3')
  assert.deepEqual(playedUnits(units, s).map(u => u.id), ['U3', 'U5', 'U6', 'U7'])
  assert.equal(normalizeScript({ skip: ['U1-U8'] }, units).skip, undefined)
  assert.deepEqual(playedUnits(units, null), units)
})

test('gate: 剧场跳过不演的单元，按改判后的类型演；挂在不演单元上的旧插画算到前一句', () => {
  const units = segmentTurn(TURN)
  const script = normalizeScript({ skip: ['U1-U2', 'U4', 'U8'], cast: [{ name: '林岚', pos: 'center' }], lines: [{ u: 'U5', type: 'dialogue', sp: '林岚' }, { u: 'U6', type: 'narration' }], choices: ['跟上去'] }, units)
  const image = { id: 'i1', turn: 1, textVersion: 'v1', after: 'U4', current: 0, versions: [{ assetId: 'a' }] }
  const { beats } = buildBeats({ turns: [{ turn: 1, textVersion: 'v1', units, script }], images: [image] })
  assert.deepEqual(beats.map(b => b.unitId), ['U3', 'U5', 'U6', 'U7'])
  assert.deepEqual(beats.map(b => b.type), ['narration', 'dialogue', 'narration', 'narration'])
  assert.equal(beats[1].speaker, '林岚')
  assert.equal(beats[0].cg, image, '插画挂在 U4（不演）上，从前一句 U3 开始显示')
  assert.ok(beats[0].sceneEnter && beats[3].lastOfTurn)
  assert.deepEqual(beats[3].choices, ['跟上去'])
})

test('gate: 引擎按原文切单元，导演看得到状态栏并标成不演；整理过的轮次再登记时沿用存下的单元', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'flowgal-'))
  try {
    const store = createStore(dir)
    const tavern = fakeTavern()
    const reply = JSON.stringify({ skip: ['U1'], cast: [{ name: '林岚', pos: 'center' }], lines: [{ u: 'U2', sp: '林岚' }], choices: [], images: [], people: [] })
    const llm = fakeLlm(reply)
    const engine = createEngine({ store, services: { tavern, llm }, logger: { warn() {}, info() {} } })
    const rawText = '<div class="status">时间：19:40 ｜ 地点：屋檐下</div><p>“你来了。”</p><UpdateVariable>_.set("x", 1)</UpdateVariable>'
    const turn = { gameId: 'g', turn: 1, textVersion: 'v1', text: tavernText(rawText), rawText, card: { name: '林岚' } }
    tavern.turns.set('g:1', turn)
    await engine.onTurnSettled(turn)
    let view = await engine.gameView('g')
    assert.deepEqual(view.turns[0].units.map(u => u.text), ['时间：19:40 ｜ 地点：屋檐下', '你来了。'])
    assert.deepEqual(view.turns[0].script.skip, ['U1'])
    const prompt = llm.calls[0].messages[0].content[0].text
    assert.ok(prompt.includes('[U1|旁白] 时间：19:40'), '导演看得到状态栏，自己判断不演')
    assert.ok(prompt.includes('【本轮原文') && prompt.includes(rawText), '导演同时读到带标签的完整原文')
    assert.ok(prompt.indexOf(rawText) < prompt.indexOf('[U1|旁白]'), '原文在单元前面')
    // 同一轮再来一次（比如重新载入）：不重切，脚本里的编号还对得上。
    await engine.onTurnSettled({ ...turn, rawText: '<p>开场白。</p>' + rawText })
    view = await engine.gameView('g')
    assert.equal(view.turns[0].units.length, 2)
    assert.equal(llm.calls.length, 1)
    engine.dispose()
  } finally {
    await rm(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 })
  }
})

test('gate: 嵌在旁白里的引号（引用、强调、刻的字）留在这句旁白里，不拆成单独一行；整行【】舞台标注不拆', () => {
  const units = segmentTurn([
    '【BGM：「深層の静寂」—— 只有低音弦乐】【SE：远处滴水声……滴答……】',
    '最先告诉她“早上了”的，是那只怀表。表盖内侧刻着一行小字：「致晓铃全员——给总是迷路的你们。」字是阿黛尔刻的。',
    '迷宫开始“不安定”之后，楼层每隔几天就会改变。最后人们改为记录“哪些东西不会变”。',
    '布琳希尔德「おう。二人がかりだ」（好。两个人一起上。）',
    '“走吧”她说。', '林岚说：“好”。', '……',
  ].join('\n'))
  assert.deepEqual(units.map(u => [u.type, u.hint || '', u.text]), [
    ['narration', '', '【BGM：「深層の静寂」—— 只有低音弦乐】【SE：远处滴水声……滴答……】'],
    ['narration', '', '最先告诉她“早上了”的，是那只怀表。表盖内侧刻着一行小字：「致晓铃全员——给总是迷路的你们。」字是阿黛尔刻的。'],
    ['narration', '', '迷宫开始“不安定”之后，楼层每隔几天就会改变。最后人们改为记录“哪些东西不会变”。'],
    ['dialogue', '布琳希尔德', 'おう。二人がかりだ'],
    ['narration', '', '（好。两个人一起上。）'],
    ['dialogue', '', '走吧'],
    ['narration', '', '她说。'],
    ['dialogue', '林岚', '好'],
    ['narration', '', '……'],
  ])
})

test('gate: 导演用 join 把切断的一句合并回旁白：按原文一字不改拼回（带引号和被省掉的提示），编号用第一个，旧编号的插画和台词跟过去', async () => {
  const text = '雨停了。\n门口立着块牌子上“闲人免进，违者后果自负”几个大字。\n“走吧。”'
  const units = segmentTurn(text)
  assert.deepEqual(units.map(u => u.text), ['雨停了。', '门口立着块牌子上', '闲人免进，违者后果自负', '几个大字。', '走吧。'])
  const { units: joined, alias } = joinUnits(units, ['U2-U4', 'U1-U2', 'U4-U5', 'U9-U10'])
  assert.deepEqual(joined.map(u => [u.id, u.type, u.text]), [
    ['U1', 'narration', '雨停了。'],
    ['U2', 'narration', '门口立着块牌子上“闲人免进，违者后果自负”几个大字。'],
    ['U5', 'dialogue', '走吧。'],
  ], '重叠的、跨段的、编号不存在的 join 不算')
  assert.deepEqual([...alias], [['U3', 'U2'], ['U4', 'U2']])
  assert.equal(joinUnits(units, []).units, units, '没写 join 原样返回')
  // 被省掉的说话人提示也拼回去
  const cue = segmentTurn('布琳希尔德「おう」（好。）')
  assert.equal(joinUnits(cue, 'U1-U2').units[0].text, '布琳希尔德「おう」（好。）')

  const dir = await mkdtemp(join(tmpdir(), 'flowgal-'))
  try {
    const store = createStore(dir)
    const tavern = fakeTavern()
    const reply = JSON.stringify({ join: ['U2-U4'], cast: [{ name: '林岚', pos: 'center' }], lines: [{ u: 'U3', sp: '林岚', emo: 'smile' }, { u: 'U5', sp: '林岚' }], choices: [], images: [{ after: 'U4', moment: '门口的牌子' }], people: [] })
    const llm = fakeLlm(reply)
    const engine = createEngine({ store, services: { tavern, llm }, logger: { warn() {}, info() {} } })
    const turn = { gameId: 'g', turn: 1, textVersion: 'v1', text, rawText: text, card: { name: '林岚' } }
    tavern.turns.set('g:1', turn)
    await engine.onTurnSettled(turn)
    const view = await engine.gameView('g')
    assert.deepEqual(view.turns[0].units.map(u => u.id + ' ' + u.text), ['U1 雨停了。', 'U2 门口立着块牌子上“闲人免进，违者后果自负”几个大字。', 'U5 走吧。'])
    const script = view.turns[0].script
    assert.equal(script.lines.U2.sp, '林岚', '写在被并掉的编号上的 lines 挪到合并后的编号')
    assert.equal(script.images[0].after, 'U2')
    const { beats } = buildBeats({ turns: view.turns, images: [] })
    assert.deepEqual(beats.map(b => b.unitId), ['U1', 'U2', 'U5'])
    engine.dispose()
  } finally {
    await rm(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 })
  }
})

test('gate: 双语对照由导演标 dual：原文、翻译合成一句（text 是翻译、orig 是原文），格式不限，标的必须是原文里有的', async () => {
  const text = '门开了。\n罗伊「……なんか、いい匂いしないか？」 （……是不是有股香味？）\nI love you.\n我爱你。\nHello / 你好'
  const units = segmentTurn(text)
  const { units: paired, alias } = pairUnits(units, [
    { orig: 'U2', tr: 'U3' },
    { tr: 'U5', orig: 'U4' },
    { u: 'U6', orig: 'Hello', tr: '你好' },
    { orig: 'U1', tr: 'U2' }, // 跟上面重叠，不算
    { u: 'U1', orig: '门', tr: '编造的翻译' }, // 不是原文照抄，不算
  ])
  assert.deepEqual(paired.map(u => [u.id, u.type, u.hint || '', u.text, u.orig || '']), [
    ['U1', 'narration', '', '门开了。', ''],
    ['U2', 'dialogue', '罗伊', '……是不是有股香味？', '……なんか、いい匂いしないか？'],
    ['U4', 'narration', '', '我爱你。', 'I love you.'],
    ['U6', 'narration', '', '你好', 'Hello'],
  ])
  assert.deepEqual([...alias], [['U3', 'U2'], ['U5', 'U4']])
  assert.equal(pairUnits(units, undefined).units, units)

  const dir = await mkdtemp(join(tmpdir(), 'flowgal-'))
  try {
    const store = createStore(dir)
    const tavern = fakeTavern()
    const reply = JSON.stringify({ dual: [{ orig: 'U2', tr: 'U3' }], cast: [{ name: '罗伊', pos: 'center' }], lines: [{ u: 'U3', sp: '罗伊', emo: 'smile' }], choices: [], images: [], people: [] })
    const llm = fakeLlm(reply)
    const engine = createEngine({ store, services: { tavern, llm }, logger: { warn() {}, info() {} } })
    const turn = { gameId: 'g', turn: 1, textVersion: 'v1', text, rawText: text, card: { name: '罗伊' } }
    tavern.turns.set('g:1', turn)
    await engine.onTurnSettled(turn)
    const view = await engine.gameView('g')
    const { beats } = buildBeats({ turns: view.turns, images: [] })
    const line = beats.find(b => b.unitId === 'U2')
    assert.equal(line.text, '……是不是有股香味？')
    assert.equal(line.orig, '……なんか、いい匂いしないか？')
    assert.equal(line.speaker, '罗伊')
    assert.equal(view.turns[0].script.lines.U2.emo, 'smile', '写在翻译那个编号上的也跟过来')
    engine.dispose()
  } finally {
    await rm(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 })
  }
})

test('gate: 特殊段落：进入回忆换场景和配乐、在场的人，写 real 时场景、配乐、在场的人自动换回来；一轮结束也回到现实', () => {
  const units = segmentTurn(['长楼梯上，她一直握着那颗宝石。', '三年前。', '“稍等一下哦。”', '“那一方死了会怎样？”', '她回过神来。', '下一句。'].join('\n'))
  const raw = {
    scene: { location: '第88层·长楼梯', time: 'night', bgm: 'T1' },
    cast: [{ name: '柯萝伊', pos: 'center' }],
    lines: [
      { u: 'U2', mode: 'memory', scene: { location: '第60层·深层（三年前）', time: 'weird', bg: 'cave, crystals, scenery, no humans' }, bgm: 'T2', exit: ['*'], enter: [{ name: '阿黛尔', pos: 'left' }] },
      { u: 'U3', sp: '阿黛尔' },
      { u: 'U4', sp: '布琳希尔德', bgm: 'T3' },
      { u: 'U5', mode: 'real' },
      { u: 'U6', mode: 'sideways' },
    ],
  }
  const s = normalizeScript(raw, units, { trackIds: ['T1', 'T2', 'T3'] })
  assert.deepEqual(s.lines.U2.scene, { location: '第60层·深层（三年前）', bg: 'cave, crystals, scenery, no humans' }, '写错的时段不收')
  assert.equal(s.lines.U2.bgm, 'T2', '进段落换的歌不占名额')
  assert.equal(s.lines.U4.bgm, 'T3', '段落外一轮还能换一次')
  assert.equal(s.lines.U6.mode, undefined, '认不得的段落不收')
  assert.deepEqual(scriptScenes(s).map(x => x.location), ['第88层·长楼梯', '第60层·深层（三年前）'])
  assert.equal(scriptScenes(s)[1].time, 'night', '段落里没写的项沿用现在的')
  assert.equal(playingAfter(s), 'T1', '段落里换的歌不算一幕结束时在放的')

  const { beats } = buildBeats({ turns: [{ turn: 1, textVersion: 'v1', units, script: s }, { turn: 2, textVersion: 'v2', units: segmentTurn('第二轮。'), script: null }], images: [] })
  assert.deepEqual(beats.map(b => [b.unitId, b.scene.location, b.mode, b.bgm, b.cast.map(c => c.name).join()]), [
    ['U1', '第88层·长楼梯', '', 'T1', '柯萝伊'],
    ['U2', '第60层·深层（三年前）', 'memory', 'T2', '阿黛尔'],
    ['U3', '第60层·深层（三年前）', 'memory', 'T2', '阿黛尔'],
    ['U4', '第60层·深层（三年前）', 'memory', 'T3', '阿黛尔'],
    ['U5', '第88层·长楼梯', '', 'T1', '柯萝伊'],
    ['U6', '第88层·长楼梯', '', 'T1', '柯萝伊'],
    ['U1', '第88层·长楼梯', '', 'T1', '柯萝伊'],
  ])
  assert.ok(beats[1].sceneEnter && beats[1].transition === 'flash', '进回忆默认白闪')
  assert.ok(beats[4].sceneEnter && beats[4].transition === 'dissolve')
  assert.deepEqual([beats[4].entered, beats[4].left], [['柯萝伊'], ['阿黛尔']])
  // 段落没写 real：一轮结束时回到现实，下一轮没接着演就是现实
  const open = normalizeScript({ scene: { location: '楼梯', bgm: 'T1' }, cast: [{ name: '柯萝伊' }], lines: [{ u: 'U2', mode: 'dream', bgm: 'T2', exit: ['柯萝伊'] }] }, units, { trackIds: ['T1', 'T2'] })
  assert.deepEqual(castAtEnd(open).map(c => c.name), ['柯萝伊'], '给下一轮看的是现实里在场的人')
  assert.match(previousBrief(open), /结束时还在特殊段落 dream 里/)
  const two = (second, script) => buildBeats({ turns: [{ turn: 1, textVersion: 'v1', units, script: open }, { turn: 2, textVersion: 'v2', units: segmentTurn(second), script }], images: [] }).beats
  const back = two('第二轮。', null).at(-1)
  assert.deepEqual([back.mode, back.bgm, back.sceneEnter], ['', 'T1', true])
  // 下一轮第一句接着演同一种段落：不转场、不出标题卡，接着在梦里
  const still = two('还在梦里。\n醒了。', { scene: { location: '楼梯', bgm: 'T1' }, cast: [], lines: { U1: { mode: 'dream' }, U2: { mode: 'real', scene: { transition: 'blink' } } } })
  assert.deepEqual(still.slice(-2).map(b => [b.mode, b.bgm, b.sceneEnter, b.transition]), [['dream', 'T2', false, ''], ['', 'T1', true, 'blink']])
})

test('gate: 场景逐句变：换地方、天色变化、天气光线基调、画面效果、过场字卡；不演的舞台指示上的变化挪到下一句', () => {
  const units = segmentTurn(['教室里只剩两个人。', '【场景：走廊】', '她们走到走廊。', '窗外的天渐渐黑了。', '啪，灯灭了。', '三小时后。', '回到教室，雨已经下起来了。', '“与此同时……”'].join('\n'))
  const raw = {
    scene: { location: '教室', time: 'afternoon', mood: 'daily', bg: 'classroom, scenery, no humans', bgm: 'T1', light: 'warm' },
    skip: ['U2'],
    cast: [{ name: '晓铃', pos: 'left' }, { name: '林岚', pos: 'right' }],
    lines: [
      { u: 'U2', scene: { location: '走廊', bg: 'school hallway, scenery, no humans' }, bgm: 'T2' },
      { u: 'U3', sp: '晓铃', scene: { fx: 'drift' } },
      { u: 'U4', scene: { time: 'dusk' } },
      { u: 'U5', scene: { light: 'dark', mood: 'eerie' }, bgm: 'T3', exit: ['*'] },
      { u: 'U6', cut: '三小时后', scene: { location: '教室', time: 'night', weather: 'rain', light: 'bogus' } },
      { u: 'U7', bgm: 'T1' },
      { u: 'U8', cut: { kind: 'meanwhile' } },
    ],
  }
  const s = normalizeScript(raw, units, { trackIds: ['T1', 'T2', 'T3'] })
  assert.equal(s.scene.light, 'warm')
  assert.equal(s.scene.fx, 'none')
  assert.deepEqual(s.lines.U3.scene, { location: '走廊', bg: 'school hallway, scenery, no humans', fx: 'drift' }, '舞台指示上的场景挪到下一句要演的')
  assert.equal(s.lines.U3.bgm, 'T2')
  assert.equal(s.lines.U5.bgm, 'T3', '基调转折那句可以换歌')
  assert.deepEqual(s.lines.U6.cut, { kind: 'time', text: '三小时后' })
  assert.equal(s.lines.U6.scene.light, undefined, '写错的光线不收')
  assert.equal(s.lines.U7.bgm, 'T1', '平常的句子一轮还能换一次')
  assert.deepEqual(s.lines.U8.cut, { kind: 'meanwhile', text: '与此同时' })

  const { beats } = buildBeats({ turns: [{ turn: 1, textVersion: 'v1', units, script: s }], images: [] })
  assert.deepEqual(beats.map(b => [b.unitId, b.scene.location, b.scene.time, b.scene.light, b.scene.fx, b.scene.mood, b.sceneEnter, b.transition]), [
    ['U1', '教室', 'afternoon', 'warm', 'none', 'daily', true, 'dissolve'],
    ['U3', '走廊', 'afternoon', 'normal', 'drift', 'daily', true, 'dissolve'],
    ['U4', '走廊', 'dusk', 'normal', 'drift', 'daily', false, 'fade'],
    ['U5', '走廊', 'dusk', 'dark', 'drift', 'eerie', false, ''],
    ['U6', '教室', 'night', 'normal', 'none', 'eerie', true, 'dissolve'],
    ['U7', '教室', 'night', 'normal', 'none', 'eerie', false, ''],
    ['U8', '教室', 'night', 'normal', 'none', 'eerie', false, ''],
  ])
  assert.equal(beats[4].scene.bg, 'classroom, scenery, no humans', '回到这一轮去过的地方，背景接着用')
  assert.equal(beats[4].scene.weather, 'rain')
  assert.deepEqual(beats[4].cut, { kind: 'time', text: '三小时后' })
  assert.deepEqual(beats[3].cast, [], '全部离开')
  assert.deepEqual(beats.map(b => b.bgm), ['T1', 'T2', 'T2', 'T3', 'T3', 'T1', 'T1'])
  // 出背景图：开场、换过去的走廊、走廊黄昏（同一处换了时段要另一张）、夜里的教室
  assert.deepEqual(scriptScenes(s).map(x => `${x.location}|${x.time}`), ['教室|afternoon', '走廊|afternoon', '走廊|dusk', '教室|night'])
  // 下一轮接着上一轮最后的样子演
  assert.deepEqual([sceneAfter(s).location, sceneAfter(s).time, sceneAfter(s).weather], ['教室', 'night', 'rain'])
  assert.match(previousBrief(s), /地点：教室；时段：night；天气：rain；基调：eerie/)
  const next = normalizeScript({ scene: {} }, segmentTurn('第二天。'), { previous: s, trackIds: ['T1', 'T2', 'T3'] })
  assert.deepEqual([next.scene.location, next.scene.time, next.scene.bg, next.scene.bgm, next.scene.transition], ['教室', 'night', 'classroom, scenery, no humans', 'T1', 'none'])
})
