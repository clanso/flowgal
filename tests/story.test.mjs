// 只演故事本身：切单元前剥掉思考、变量更新、网页外壳和装饰；导演把状态栏、目录、作者的话这些标成不演；剧场和写词的都只读要演的部分。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { cleanTurnText } from '../lib/clean.js'
import { segmentTurn, joinUnits, pairUnits } from '../lib/segment.js'
import { normalizeScript, rawSection, scriptScenes, sceneAfter, playingAfter, previousBrief } from '../lib/director.js'
import { playedUnits, castAtEnd, stageWalk } from '../lib/staging.js'
import { buildBeats, onStage, hintedSpeaker, cgEntrance, cgExit, cgStay, cgHoldMs, CG_IN_MS, beatHold, PAUSE_MS, TRANSITION_MS, WAKE_MS, WAKE_SWAP_MS } from '../src/client/theater/playback.js'
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

test('gate: 双语对照照着导演标的样子配：一整轮「原文（翻译）」只标几句也全配好，太长分页切开的合回一句；中文括号、看不出是外文的不乱配', async () => {
  const long = 'それが何を意味するか、俺にはわからない。わかるのは、下に何かいるってことだけだ。九十層から先、魔物の数が減ってる。ありえないくらいにな'
  const longTr = '那意味着什么，我不知道。我只知道，下面有什么东西。从第九十层开始，魔物的数量在减少。少得不正常'
  const text = ['格伦端着碗走过来。', '「毒見済みか？（试过毒了？）」', '「グレン、それ三回目だよ（格伦，这是第三次问了）」', `格伦说：「${long}（${longTr}）」`, '「……本気？（……认真的？）」', '她笑了（其实是苦笑）。', '「好啊，走吧（小声）」'].join('\n')
  const units = segmentTurn(text)
  // 太长的台词分页切开：后几页记着 cont，原文和翻译跨在两页上
  assert.deepEqual(units.slice(3, 5).map(u => [u.id, u.hint, Boolean(u.cont)]), [['U4', '格伦', false], ['U5', '格伦', true]])
  const rows = list => list.map(u => [u.id, u.type, u.hint || '', u.text, u.orig || ''])
  const expected = [
    ['U1', 'narration', '', '格伦端着碗走过来。', ''],
    ['U2', 'dialogue', '', '试过毒了？', '毒見済みか？'],
    ['U3', 'dialogue', '', '格伦，这是第三次问了', 'グレン、それ三回目だよ'],
    ['U4', 'dialogue', '格伦', longTr, long],
    ['U6', 'dialogue', '', '……本気？（……认真的？）', ''],
    ['U7', 'narration', '', '她笑了（其实是苦笑）。', ''],
    ['U8', 'dialogue', '', '好啊，走吧（小声）', ''],
  ]
  // 只标一句做样子：排法一样的都配好，分页的两页合回一句台词；全是汉字的日语、中文里的括号不配
  const one = pairUnits(units, [{ u: 'U2', orig: '毒見済みか？', tr: '（试过毒了？）' }])
  assert.deepEqual(rows(one.units), expected)
  assert.deepEqual([...one.alias], [['U5', 'U4']])
  assert.ok(one.units.filter(u => u.orig).every(u => !('cont' in u) && !('src' in u)))
  // 导演直接标分页切开的那句（u 写第一页）也认得，同样当样子
  assert.deepEqual(rows(pairUnits(units, [{ u: 'U4', orig: long, tr: longTr }]).units), expected)
  // 全是汉字的那句导演单独标了就配上
  assert.equal(pairUnits(units, [{ u: 'U2', orig: '毒見済みか？', tr: '试过毒了？' }, { u: 'U6', orig: '……本気？', tr: '……认真的？' }]).units.find(u => u.id === 'U6').orig, '……本気？')
  // 导演还是用 join 把分页并回去：仍是这个人的台词，再标 dual 照样配
  const joined = joinUnits(units, ['U4-U5'])
  assert.deepEqual(joined.units[3], { id: 'U4', type: 'dialogue', text: long + '（' + longTr + '）', para: 3, hint: '格伦', src: `格伦说：「${long}（${longTr}）」` })
  assert.equal(pairUnits(joined.units, [{ u: 'U4', orig: long, tr: longTr }], joined.alias).units[3].orig, long)
  // 别的排法照样：斜杠隔开、翻译在前
  assert.deepEqual(pairUnits(segmentTurn('Hello / 你好\nGood night / 晚安\n今天 / 明天'), [{ u: 'U1', orig: 'Hello', tr: '你好' }]).units.map(u => [u.text, u.orig || '']), [['你好', 'Hello'], ['晚安', 'Good night'], ['今天 / 明天', '']])
  assert.deepEqual(pairUnits(segmentTurn('「你好（こんにちは）」\n「谢谢（ありがとう）」'), [{ u: 'U1', orig: 'こんにちは', tr: '你好' }]).units.map(u => [u.text, u.orig]), [['你好', 'こんにちは'], ['谢谢', 'ありがとう']])

  // 引擎里走一遍：导演只标一句，剧场里每句都是上方原文、下方翻译，长句是格伦的一句台词
  const dir = await mkdtemp(join(tmpdir(), 'flowgal-'))
  try {
    const store = createStore(dir)
    const tavern = fakeTavern()
    const reply = JSON.stringify({ dual: [{ u: 'U2', orig: '毒見済みか？', tr: '试过毒了？' }], cast: [{ name: '格伦', pos: 'center' }], lines: [{ u: 'U2', sp: '格伦' }, { u: 'U5', sp: '格伦', emo: 'smile' }], choices: [], images: [], people: [] })
    const engine = createEngine({ store, services: { tavern, llm: fakeLlm(reply) }, logger: { warn() {}, info() {} } })
    const turn = { gameId: 'g', turn: 1, textVersion: 'v1', text, rawText: text, card: { name: '格伦' } }
    tavern.turns.set('g:1', turn)
    await engine.onTurnSettled(turn)
    const view = await engine.gameView('g')
    const { beats } = buildBeats({ turns: view.turns, images: [] })
    assert.deepEqual(beats.map(b => [b.unitId, b.text, b.orig || '']), expected.map(([id, , , tr, orig]) => [id, tr, orig]))
    const line = beats.find(b => b.unitId === 'U4')
    assert.equal(line.speaker, '格伦')
    assert.equal(view.turns[0].script.lines.U4.emo, 'smile', '写在第二页上的标注跟到合并后的那句')
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
  assert.ok(beats[1].sceneEnter && beats[1].transition === 'haze', '进回忆默认起雾')
  assert.ok(beats[4].sceneEnter && beats[4].transition === 'haze', '从回忆里出来也是起雾')
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

test('gate: 进回忆那一句写「全部离开」再让段落里的人登场：开场就在的人不会从回忆前的几句里消失，只在回忆里的人开场不在', () => {
  const units = ['U1', 'U2', 'U3', 'U4', 'U5', 'U6'].map(id => ({ id }))
  const script = {
    cast: [{ name: '柯萝伊', pos: 'center' }, { name: '阿黛尔', pos: 'left' }, { name: '卡西安', pos: 'right' }, { name: '晓铃', pos: 'farleft' }],
    lines: {
      U1: { sp: '柯萝伊' },
      U3: { mode: 'memory', exit: ['*'], enter: [{ name: '阿黛尔' }, { name: '卡西安' }, { name: '柯萝伊' }, { name: '晓铃' }] },
      U4: { sp: '卡西安' },
      U5: { mode: 'real' },
    },
  }
  const who = steps => steps.map(s => s.cast.map(c => c.name).join('+') || '-')
  // 晓铃上一轮结束时在场（没开口也在）；阿黛尔、卡西安只在回忆里
  const walk = stageWalk(script, units, [{ name: '晓铃', pos: 'farleft' }])
  assert.deepEqual(who(walk.steps), ['柯萝伊+晓铃', '柯萝伊+晓铃', '阿黛尔+卡西安+柯萝伊+晓铃', '阿黛尔+卡西安+柯萝伊+晓铃', '柯萝伊+晓铃', '柯萝伊+晓铃'])
  assert.deepEqual(castAtEnd(script).map(c => c.name), ['柯萝伊'], '给下一轮导演看的：回忆前就有戏的人')
  // 段落外写了 enter 的照旧：开场不在，到那一句才上场
  const later = { ...script, lines: { ...script.lines, U6: { enter: [{ name: '阿黛尔' }] } } }
  assert.deepEqual(who(stageWalk(later, units).steps).at(-1), '柯萝伊+阿黛尔')
})

test('gate: 只在回忆里出场的人不会在开头站上台：回忆之前只是被描写到、隔着回响引一句他说过的话、导演漏写了 enter 都不算他开场就在', () => {
  const units = ['narration', 'dialogue', 'dialogue', 'narration', 'dialogue', 'narration', 'dialogue'].map((type, i) => ({ id: 'U' + (i + 1), type }))
  const who = steps => steps.map(s => s.cast.map(c => c.name).join('+') || '-')
  const script = {
    cast: [{ name: '柯萝伊', pos: 'center' }, { name: '阿黛尔', pos: 'left' }],
    lines: {
      U1: { sp: '阿黛尔' }, // 旁白：「字是阿黛尔刻的」
      U2: { sp: '阿黛尔', voice: 'echo' }, // 引一句她以前说过的话
      U3: { sp: '柯萝伊' },
      U4: { mode: 'memory', exit: ['*'], enter: [{ name: '阿黛尔' }, { name: '柯萝伊' }] },
      U5: { sp: '阿黛尔' },
      U6: { mode: 'real' },
      U7: { sp: '柯萝伊' },
    },
  }
  assert.deepEqual(who(stageWalk(script, units).steps), ['柯萝伊', '柯萝伊', '柯萝伊', '阿黛尔+柯萝伊', '阿黛尔+柯萝伊', '柯萝伊', '柯萝伊'])
  // 回忆前当面说过话的照旧算开场就在
  const spoke = { ...script, lines: { ...script.lines, U2: { sp: '阿黛尔' } } }
  assert.deepEqual(who(stageWalk(spoke, units).steps).slice(0, 3), ['柯萝伊+阿黛尔', '柯萝伊+阿黛尔', '柯萝伊+阿黛尔'])
  // 导演漏写了阿黛尔的 enter：她只在回忆里开口，进回忆时跟着登场，回到现实就不在
  const missed = { ...script, lines: { ...script.lines, U4: { mode: 'memory' } } }
  assert.deepEqual(who(stageWalk(missed, units).steps), ['柯萝伊', '柯萝伊', '柯萝伊', '柯萝伊+阿黛尔', '柯萝伊+阿黛尔', '柯萝伊', '柯萝伊'])
  // 电话那头、分屏那头的人也不算在场
  const phone = { ...script, lines: { ...script.lines, U2: { sp: '阿黛尔', voice: 'phone' } } }
  assert.equal(who(stageWalk(phone, units).steps)[0], '柯萝伊')
  const split = { ...script, lines: { ...script.lines, U2: { sp: '阿黛尔', split: { who: ['阿黛尔'] } }, U3: { sp: '柯萝伊', split: 'off' } } }
  assert.equal(who(stageWalk(split, units).steps)[0], '柯萝伊')
  // 上一轮结束时在场的照旧在
  assert.equal(who(stageWalk(script, units, [{ name: '阿黛尔', pos: 'left' }]).steps)[0], '柯萝伊+阿黛尔')
})

test('gate: 回到现实那一句写「全部离开」再让现实里的人 enter：这些人开场就在，不会从回忆前消失', () => {
  // 照玩家存档里的一轮：主角开场就在，布琳希尔德后来登场，回忆里有阿黛尔，回到现实那一句清场再让大家 enter
  const units = ['narration', 'dialogue', 'dialogue', 'dialogue', 'dialogue', 'narration', 'dialogue'].map((type, i) => ({ id: 'U' + (i + 1), type }))
  const script = {
    cast: [{ name: '柯萝伊', pos: 'center' }, { name: '布琳希尔德', pos: 'left' }, { name: '伊薇特', pos: 'right' }, { name: '阿黛尔', pos: 'center' }],
    lines: {
      U2: { sp: '阿黛尔', voice: 'echo' },
      U3: { sp: '柯萝伊' },
      U4: { sp: '布琳希尔德', enter: [{ name: '布琳希尔德', pos: 'left' }] },
      U5: { sp: '布琳希尔德', mode: 'memory', exit: ['*'], enter: [{ name: '阿黛尔' }, { name: '布琳希尔德' }, { name: '柯萝伊', pos: 'right' }] },
      U6: { mode: 'real', exit: ['*'], enter: [{ name: '柯萝伊', pos: 'center' }, { name: '布琳希尔德', pos: 'left' }, { name: '伊薇特', pos: 'right' }] },
    },
  }
  const who = steps => steps.map(s => s.cast.map(c => c.name).sort().join('+') || '-')
  assert.deepEqual(who(stageWalk(script, units).steps), [
    '伊薇特+柯萝伊', '伊薇特+柯萝伊', '伊薇特+柯萝伊', '伊薇特+布琳希尔德+柯萝伊',
    '布琳希尔德+柯萝伊+阿黛尔', '伊薇特+布琳希尔德+柯萝伊', '伊薇特+布琳希尔德+柯萝伊',
  ])
  // 没进过段落时写的 real 照常算现实里的进出
  const stray = { cast: [{ name: '柯萝伊' }], lines: { U3: { mode: 'real', enter: [{ name: '柯萝伊' }] } } }
  assert.equal(who(stageWalk(stray, units).steps)[0], '-')
})

test('gate: 导演漏写了主角开场就在、只在后面换场时「全部离开」再让她 enter：她在那之前当面说过话，开场就在', () => {
  // 照玩家存档里的一轮：柯萝伊整轮都在（开头就在说话），导演只在换到泉之间那一句清场再让她 enter；中间有一段回忆
  const units = ['narration', 'dialogue', 'dialogue', 'narration', 'narration', 'dialogue', 'narration', 'dialogue'].map((type, i) => ({ id: 'U' + (i + 1), type }))
  const script = {
    cast: [{ name: '柯萝伊', pos: 'center' }, { name: '布琳希尔德', pos: 'left' }, { name: '阿黛尔', pos: 'center' }],
    lines: {
      U1: { sp: '柯萝伊' }, // 旁白描写她（不算开口）
      U2: { sp: '柯萝伊', say: 'whisper' },
      U3: { sp: '布琳希尔德', enter: [{ name: '布琳希尔德', pos: 'left' }] },
      U4: { mode: 'memory', exit: ['*'], enter: [{ name: '阿黛尔' }, { name: '柯萝伊', pos: 'left' }] },
      U5: { mode: 'real' },
      U7: { exit: ['*'], enter: [{ name: '柯萝伊', pos: 'left' }] },
    },
  }
  const who = steps => steps.map(s => s.cast.map(c => c.name).sort().join('+') || '-')
  assert.deepEqual(who(stageWalk(script, units).steps), [
    '柯萝伊', '柯萝伊', '布琳希尔德+柯萝伊', '柯萝伊+阿黛尔', '布琳希尔德+柯萝伊', '布琳希尔德+柯萝伊', '柯萝伊', '柯萝伊',
  ])
  // 在登场那一句才开口的照旧到那一句才上场；之前只被旁白描写到的也一样
  assert.equal(who(stageWalk(script, units).steps)[1], '柯萝伊', '布琳希尔德到 U3 才上场')
  const described = { ...script, lines: { ...script.lines, U2: { sp: '柯萝伊', voice: 'phone' } } }
  assert.equal(who(stageWalk(described, units).steps)[0], '-', '只被描写、隔着电话说话的：开场不在，到 U4 才进回忆')
})

test('gate: 清场、换地方之后才在登场前开口的人不算开场就在：醒过来先听见背后应了一声，两句后才看见她', () => {
  // 照玩家存档：营地、柱厅里只有柯萝伊和同伴；换到巢穴那一句清场再让柯萝伊 enter，阿黛尔先在背后说话（第二句导演没写画外音），两句后才登场
  const units = ['dialogue', 'dialogue', 'narration', 'dialogue', 'dialogue', 'dialogue', 'narration'].map((type, i) => ({ id: 'U' + (i + 1), type }))
  const script = {
    scene: { location: '营地' },
    cast: [{ name: '柯萝伊', pos: 'center' }, { name: '米尔特', pos: 'right' }, { name: '阿黛尔', pos: 'right' }],
    lines: {
      U1: { sp: '柯萝伊' },
      U2: { sp: '米尔特' },
      U3: { scene: { location: '巢穴' }, exit: ['*'], enter: [{ name: '柯萝伊', pos: 'center' }] },
      U4: { sp: '阿黛尔', as: '？？？', voice: 'offscreen' },
      U5: { sp: '柯萝伊' },
      U6: { sp: '阿黛尔' },
      U7: { enter: [{ name: '阿黛尔', pos: 'right', how: 'slow' }] },
    },
  }
  const who = steps => steps.map(s => s.cast.map(c => c.name).join('+') || '-')
  assert.deepEqual(who(stageWalk(script, units).steps), ['柯萝伊+米尔特', '柯萝伊+米尔特', '柯萝伊', '柯萝伊', '柯萝伊', '柯萝伊', '柯萝伊+阿黛尔'])
  // 导演换地方时没写清场也一样：在新地方才开口的，说明不了开场时他在旧地方
  const moved = { ...script, lines: { ...script.lines, U3: { scene: { location: '巢穴' }, exit: ['米尔特'] } } }
  assert.deepEqual(who(stageWalk(moved, units).steps), ['柯萝伊+米尔特', '柯萝伊+米尔特', '柯萝伊', '柯萝伊', '柯萝伊', '柯萝伊', '柯萝伊+阿黛尔'])
  // 清场之前就当面说过话的照旧开场就在
  const spoke = { ...script, lines: { ...script.lines, U2: { sp: '阿黛尔' } } }
  assert.deepEqual(who(stageWalk(spoke, units).steps).slice(0, 2), ['柯萝伊+米尔特+阿黛尔', '柯萝伊+米尔特+阿黛尔'])
  // 第一句就写了地点（跟开场一样或不一样）不算换过地方
  const opening = { ...script, lines: { ...script.lines, U1: { sp: '柯萝伊', scene: { location: '柱厅' } }, U2: { sp: '阿黛尔' } } }
  assert.equal(who(stageWalk(opening, units).steps)[0], '柯萝伊+米尔特+阿黛尔')
})

test('gate: 导演把告别那句的说话人写进了同一句的 exit：说完这句再走，不在开口那一拍就消失；清场、换地方的那句照旧当场生效', () => {
  // 照玩家存档：「……抱歉。我去透透气」这一句同时写了阿黛尔 exit
  const units = ['dialogue', 'dialogue', 'narration', 'dialogue'].map((type, i) => ({ id: 'U' + (i + 1), type }))
  const script = {
    cast: [{ name: '柯萝伊', pos: 'center' }, { name: '阿黛尔', pos: 'left' }],
    lines: { U1: { sp: '柯萝伊' }, U2: { sp: '阿黛尔', exit: ['阿黛尔'] }, U4: { sp: '柯萝伊' } },
  }
  const who = steps => steps.map(s => s.cast.map(c => c.name).join('+') || '-')
  const walk = stageWalk(script, units)
  assert.deepEqual(who(walk.steps), ['柯萝伊+阿黛尔', '柯萝伊+阿黛尔', '柯萝伊', '柯萝伊'])
  assert.deepEqual(walk.steps[2].left, ['阿黛尔'], '下一拍才退场')
  assert.deepEqual(stageWalk({ ...script, lines: { ...script.lines, U4: undefined } }, units.slice(0, 2)).end.map(c => c.name), ['柯萝伊'], '一轮最后一句说完就走的，不留到下一轮')
  // 别人的 exit、清场、换地方照旧当场生效
  const other = { ...script, lines: { ...script.lines, U2: { sp: '阿黛尔', exit: ['柯萝伊'] } } }
  assert.deepEqual(who(stageWalk(other, units).steps).slice(0, 2), ['柯萝伊+阿黛尔', '阿黛尔'])
  const clear = { ...script, lines: { ...script.lines, U2: { sp: '阿黛尔', exit: ['*'] } } }
  assert.equal(who(stageWalk(clear, units).steps)[1], '-')
  const moved = { ...script, lines: { ...script.lines, U2: { sp: '阿黛尔', exit: ['阿黛尔'], scene: { location: '檐廊' } } } }
  assert.equal(who(stageWalk(moved, units).steps)[1], '柯萝伊')
})

test('gate: 导演漏列进 cast 的配角：已经有立绘、在现实里当面开口时临时上台，别人接话时退下，不挤掉列着的人', () => {
  // 照玩家存档：台上五个人，伊薇特的队员罗伊（画过立绘）插了两句话，导演没把他列进 cast
  const units = ['dialogue', 'dialogue', 'narration', 'dialogue', 'dialogue', 'dialogue', 'dialogue', 'dialogue'].map((type, i) => ({ id: 'U' + (i + 1), type, text: 'U' + (i + 1) }))
  const five = ['柯萝伊', '布琳希尔德', '伊薇特', '卡西安', '马科斯']
  const script = {
    scene: {},
    cast: five.map((name, i) => ({ name, pos: ['center', 'left', 'right', 'farright', 'farleft'][i] })),
    lines: { U1: { sp: '卡西安' }, U2: { sp: '罗伊' }, U4: {}, U5: { sp: '马科斯' }, U6: { sp: '罗伊', as: '？？？' }, U7: { sp: '罗伊', voice: 'offscreen' }, U8: { sp: '艾拉' } },
  }
  const who = steps => steps.map(s => s.cast.map(c => c.name).join('+'))
  const drawn = new Set([...five, '罗伊'])
  const walk = stageWalk(script, units, [], null, { walkOn: drawn })
  assert.deepEqual(who(walk.steps).map(w => w.replace(five.join('+'), '五人')), ['五人', '五人+罗伊', '五人+罗伊', '五人+罗伊', '五人', '五人', '五人', '五人'],
    '描写他的旁白、他接着说的那句（没写 sp）都还在；身份没揭晓、隔着门喊的不上台；没画过立绘的艾拉不上台')
  assert.equal(walk.steps[1].cast.find(c => c.name === '罗伊').extra, true)
  assert.deepEqual(who(stageWalk(script, units).steps)[1], five.join('+'), '不传 walkOn（导演那边）照旧')
  // 剧场：同屏五人的上限不算他，主角不会被他挤下去
  const { beats } = buildBeats({ turns: [{ turn: 1, textVersion: 'v1', units, script }], images: [], cast: [...drawn].map(name => ({ name, sprites: { k: { assetId: name + '.png' } } })) })
  assert.deepEqual(onStage(beats[1].cast, beats[1].recent, 5).map(c => c.name), [...five, '罗伊'])
  assert.equal(stageWalk(script, units.slice(0, 2), [], null, { walkOn: drawn }).end.length, 5, '临时上台的不带到下一轮')
})

test('gate: 导演没给台词写 sp 时用切分猜的说话人：「宋棠打断她」取认得的名字，认不出的长串当作上一位接着说', () => {
  const known = ['宋棠', '唐小满', '秦国栋']
  assert.equal(hintedSpeaker('宋棠打断她', known, '唐小满'), '宋棠')
  assert.equal(hintedSpeaker('秦语气没什么起伏', known, '秦国栋'), '秦国栋')
  assert.equal(hintedSpeaker('唐小满', known, '宋棠'), '唐小满')
  assert.equal(hintedSpeaker('路人玩家', known, '宋棠'), '路人玩家', '短的照旧当名字（没建档的路人）')
  assert.equal(hintedSpeaker('', known, '宋棠'), '')
  const units = [{ id: 'U1', type: 'dialogue', text: '看了一眼不算数。' }, { id: 'U2', type: 'narration', text: '宋棠打断她，' }, { id: 'U3', type: 'dialogue', text: '别在心里念数字。', hint: '宋棠打断她' }]
  const script = { scene: {}, cast: [{ name: '宋棠', pos: 'center' }, { name: '唐小满', pos: 'left' }], lines: { U1: { sp: '唐小满' } } }
  const { beats } = buildBeats({ turns: [{ turn: 1, textVersion: 'v1', units, script }], images: [] })
  assert.equal(beats[2].speaker, '宋棠', '名牌不再是「宋棠打断她」')
})

test('gate: 回忆演到下一轮：接着演的那几句台上还是回忆里的人，现在的人等回到现实再上来', () => {
  const first = segmentTurn('“走吧。”\n“嗯。”\n三年前。\n“这是中奖了吧？”')
  const second = segmentTurn('“嗯。”\n“你也来了？”\n她回过神来。\n“发什么呆？”')
  const turns = [
    { turn: 1, textVersion: 'v1', units: first, script: { scene: { location: '楼梯' }, cast: [{ name: '柯萝伊', pos: 'center' }, { name: '阿黛尔', pos: 'left' }, { name: '少女', pos: 'right' }], lines: {
      U1: { sp: '阿黛尔' },
      U2: { sp: '柯萝伊' },
      U3: { mode: 'memory', scene: { location: '深层（三年前）' }, exit: ['*'], enter: [{ name: '少女', pos: 'right' }, { name: '柯萝伊', pos: 'left' }] },
      U4: { sp: '少女' },
    } } },
    // 第二轮：导演把回忆里的人也列进 cast，第一句接着写 memory，没再写 exit / enter
    { turn: 2, textVersion: 'v1', units: second, script: { scene: { location: '楼梯' }, cast: [{ name: '少女', pos: 'right' }, { name: '柯萝伊', pos: 'center' }, { name: '阿黛尔', pos: 'left' }], lines: {
      U1: { mode: 'memory', sp: '少女' },
      U2: { sp: '柯萝伊' },
      U3: { mode: 'real' },
      U4: { sp: '阿黛尔' },
    } } },
  ]
  const { beats } = buildBeats({ turns, images: [] })
  assert.deepEqual(beats.map(b => [b.turn, b.mode, b.cast.map(c => `${c.name}@${c.pos}`).sort().join('+')]), [
    [1, '', '柯萝伊@center+阿黛尔@left'],
    [1, '', '柯萝伊@center+阿黛尔@left'],
    [1, 'memory', '少女@right+柯萝伊@left'],
    [1, 'memory', '少女@right+柯萝伊@left'],
    [2, 'memory', '少女@right+柯萝伊@left'],
    [2, 'memory', '少女@right+柯萝伊@left'],
    [2, '', '柯萝伊@center+阿黛尔@left'],
    [2, '', '柯萝伊@center+阿黛尔@left'],
  ])
  // 第二轮没接着演回忆：照常是现实里的人
  const real = buildBeats({ turns: [turns[0], { ...turns[1], script: { ...turns[1].script, lines: { U4: { sp: '阿黛尔' } } } }], images: [] }).beats
  assert.deepEqual(real.slice(4).map(b => b.cast.map(c => c.name).sort().join('+')), ['少女+柯萝伊+阿黛尔', '少女+柯萝伊+阿黛尔', '少女+柯萝伊+阿黛尔', '少女+柯萝伊+阿黛尔'])
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

test('gate: 声音的样子、分屏、慢动作和时间停止、插画的出现消失方式：导演写了才收，写错的不收；剧场里分屏一直开到 off', () => {
  const units = segmentTurn(['林岚拨通了电话。', '“喂？”', '“我们一起说！”', '门外传来脚步声。', '“系统启动。”', '“再见。”', '她挂断了电话，世界静止了。'].join('\n'))
  const raw = {
    scene: { location: '房间', time: 'night' },
    cast: [{ name: '林岚', pos: 'center' }],
    lines: [
      { u: 'U1', sp: '林岚', split: { who: ['苏晴', '苏晴', ''], location: '咖啡店', bg: 'cafe interior, scenery, no humans' } },
      { u: 'U2', sp: '苏晴', voice: 'phone', emo: 'happy' },
      { u: 'U3', sp: '林岚、苏晴', voice: 'chorus', emo: 'laugh' },
      { u: 'U4', sp: '门外的人', voice: 'offscreen' },
      { u: 'U5', sp: '机器', voice: 'robot', scene: { fx: 'slowmo' } },
      { u: 'U6', sp: '苏晴', voice: 'phone', split: 'off', scene: { fx: 'timestop' } },
    ],
    images: [
      { after: 'U3', until: 'U4', title: '两头', moment: '两人隔着电话笑', in: 'slow', motion: 'push', out: 'black' },
      { after: 'U6', title: '静止', moment: '世界静止', in: 'spin', out: 'cut' },
      { after: 'U1', title: '老写法', moment: '以前那套花哨的写法', in: 'bloom', motion: 'breathe', out: 'shatter' },
    ],
  }
  const s = normalizeScript(raw, units, { maxImages: 3 })
  assert.deepEqual(s.lines.U1.split, { who: ['苏晴'], location: '咖啡店', bg: 'cafe interior, scenery, no humans' }, '重复和空的名字去掉')
  assert.equal(s.lines.U2.voice, 'phone')
  assert.equal(s.lines.U5.voice, undefined, '不认得的声音样子不收')
  assert.equal(s.lines.U5.scene.fx, 'slowmo')
  assert.equal(s.lines.U6.split, 'off')
  assert.equal(s.lines.U6.scene.fx, 'timestop')
  assert.deepEqual([s.images[0].enter, s.images[0].motion, s.images[0].leave], ['slow', 'push', 'black'])
  assert.deepEqual([s.images[1].enter, s.images[1].motion, s.images[1].leave], [undefined, undefined, 'cut'], '写错的出现方式不收，用默认')
  assert.deepEqual([s.images[2].enter, s.images[2].motion, s.images[2].leave], ['slow', 'still', 'flash'], '以前那套花哨的写法换成最接近的一种')
  // 分屏另一头的地方也要出背景
  assert.deepEqual(scriptScenes(s).map(x => `${x.location}|${x.time}|${x.bg}`), ['房间|night|', '咖啡店|night|cafe interior, scenery, no humans'])

  const { beats } = buildBeats({ turns: [{ turn: 1, textVersion: 'v1', units, script: s }], images: [] })
  assert.deepEqual(beats.map(b => b.split ? b.split.who.join('、') : ''), ['苏晴', '苏晴', '苏晴', '苏晴', '苏晴', '', ''], '分屏一直开到写 off 那句')
  assert.deepEqual(beats.map(b => b.voice || ''), ['', 'phone', 'chorus', 'offscreen', '', 'phone', ''])
  assert.deepEqual(beats[2].speakers, ['林岚', '苏晴'], '齐声的几个人一起高亮')
  assert.equal(beats[2].emotions['林岚'], 'laugh')
  assert.equal(beats[2].emotions['苏晴'], 'laugh')
  assert.equal(beats[1].speakers, undefined)
  assert.deepEqual(beats.map(b => b.scene.fx), ['none', 'none', 'none', 'none', 'slowmo', 'timestop', 'timestop'])
})

test('插画像 galgame 那样出现：默认溶入、静止，快慢跟着基调；对话框先让开，画面出来就接着念；老存档的花哨写法换成最接近的', () => {
  assert.equal(cgEntrance({}, 'daily'), 'dissolve')
  assert.equal(cgEntrance({}, 'sad'), 'slow', '感伤：慢慢溶入')
  assert.equal(cgEntrance({}, 'comic'), 'quick', '滑稽：快一点')
  assert.equal(cgExit({}, 'touching'), 'slow')
  assert.equal(cgEntrance({ enter: 'flash' }, 'sad'), 'flash', '导演写了就照写的')
  assert.equal(cgStay({}), 'still')
  // 老存档
  assert.equal(cgEntrance({ enter: 'sweep' }, 'daily'), 'dissolve')
  assert.equal(cgEntrance({ enter: 'photo' }, 'daily'), 'slow')
  assert.equal(cgEntrance({ enter: 'glitch' }, 'daily'), 'cut')
  assert.equal(cgExit({ leave: 'shatter' }, 'daily'), 'flash')
  assert.equal(cgExit({ leave: 'fade' }, 'sad'), 'dissolve')
  assert.equal(cgStay({ motion: 'breathe' }), 'still')
  assert.equal(cgStay({ motion: 'push' }), 'push')
  // 对话框让开的时间：出现的过程，再多一点点让对话框淡回来——原版脚本里插画出来后不另加等待
  const extra = cgHoldMs({}, 'daily') - CG_IN_MS.dissolve
  assert.ok(extra > 0 && extra <= 300, '只多留一小点')
  assert.equal(cgHoldMs({}, 'sad'), CG_IN_MS.slow + extra)
  assert.equal(cgHoldMs({ enter: 'cut' }, 'daily'), extra, '直接切入只停那一小点')
})

test('gate: 「間」——导演写的停顿只收 beat / silence，写在不演的舞台指示上挪到下一句，一轮最多 6 处', () => {
  const units = segmentTurn(['【沉默】', '“……我知道了。”', '她笑了一下。', ...Array.from({ length: 8 }, (_, i) => `第${i + 1}句。`)].join('\n'))
  const raw = {
    skip: ['U1'],
    lines: [
      { u: 'U1', pause: 'silence' },
      { u: 'U3', pause: 'forever' },
      ...units.slice(3).map(u => ({ u: u.id, pause: 'beat' })),
    ],
  }
  const s = normalizeScript(raw, units)
  assert.equal(s.lines.U2.pause, 'silence', '舞台指示上的停顿挪到下一句要演的')
  assert.equal(s.lines.U3.pause, undefined, '不认得的停顿不收')
  assert.equal(Object.values(s.lines).filter(l => l.pause).length, 6)
  const { beats } = buildBeats({ turns: [{ turn: 1, textVersion: 'v1', units, script: s }], images: [] })
  assert.equal(beats[0].pause, 'silence')
  assert.equal(beats[1].pause, undefined)
})

test('「間」：插画这一句才出现、换了地方时对话框先让开，等画面出来再接着念；导演的 silence 也让开，beat 只顿一下；进出回忆另算', () => {
  const base = { key: 't:U2', scene: { location: '教室', mood: 'daily' }, mode: '', sceneEnter: false, transition: '' }
  const img = { id: 'cg1' }
  // 插画这一句才出现
  assert.deepEqual(beatHold({ ...base, cg: img }, { cg: 'cg1', was: { cg: '', place: '教室', mode: '' } }), { ms: cgHoldMs(img, 'daily'), away: true })
  // 插画已经在画面上（往回翻）：不停
  assert.deepEqual(beatHold({ ...base, cg: img }, { cg: 'cg1', was: { cg: 'cg1', place: '教室', mode: '' } }), { ms: 0, away: false })
  // 有过场字卡：字卡就是停顿
  assert.equal(beatHold({ ...base, cg: img, cut: { kind: 'time' } }, { cg: 'cg1', was: { cg: '', place: '教室' } }).ms, 0)
  // 换了地方
  const moved = { ...base, scene: { location: '天台', mood: 'daily' }, sceneEnter: true, transition: 'dissolve' }
  const sceneHold = beatHold(moved, { was: { place: '教室', mode: '' } })
  assert.equal(sceneHold.away, true)
  assert.ok(sceneHold.ms > TRANSITION_MS.dissolve && sceneHold.ms <= TRANSITION_MS.dissolve + 500, '转场演完再停一小拍')
  assert.equal(beatHold({ ...moved, transition: 'none' }, { was: { place: '教室', mode: '' } }).ms, 0, '直接切不等')
  assert.equal(beatHold(moved, { was: { place: '天台', mode: '' } }).ms, 0, '往回翻到换场那一句，画面没变就不等')
  assert.equal(beatHold({ ...moved, mode: 'memory' }, { was: { place: '教室', mode: '' } }).ms, 0, '进回忆的转场另算')
  // 导演写的停顿
  assert.deepEqual(beatHold({ ...base, pause: 'silence' }, { was: { place: '教室' } }), { ms: PAUSE_MS.silence, away: true })
  assert.deepEqual(beatHold({ ...base, pause: 'beat' }, { was: { place: '教室' } }), { ms: PAUSE_MS.beat, away: false })
  // 几样同时有取最长的
  assert.equal(beatHold({ ...base, cg: img, pause: 'silence' }, { cg: 'cg1', was: { place: '教室' } }).ms, Math.max(PAUSE_MS.silence, cgHoldMs(img, 'daily')))
})

test('gate: 从回忆里醒过来：对话框让开，等回忆褪白、现在的画面清晰过来再出字；同一个人回忆里和现在都在，算两堂布景，跟着画面退场再登场，不从回忆的站位滑过去', () => {
  const back = { key: 't:U4', scene: { location: '螺旋回廊', mood: 'mystery' }, mode: '', sceneEnter: true, transition: 'haze' }
  assert.deepEqual(beatHold(back, { was: { place: '水晶洞窟（三年前）', mode: 'memory' } }), { ms: WAKE_MS, away: true, wake: true })
  assert.ok(WAKE_SWAP_MS < WAKE_MS, '白透了才换画面，之后还要慢慢散开')
  assert.equal(beatHold({ ...back, cut: { kind: 'time' } }, { was: { mode: 'memory' } }).wake, undefined, '有过场字卡的，字卡就是停顿')
  assert.equal(beatHold({ ...back, mode: 'memory' }, { was: { mode: 'memory' } }).wake, undefined, '还在回忆里')
  assert.equal(beatHold(back, { was: { place: '长楼梯', mode: '' } }).wake, undefined, '本来就在现在')
  assert.equal(beatHold({ ...back, transition: 'dissolve' }, { was: { mode: 'memory' } }).wake, true)
  assert.equal(beatHold({ ...back, transition: 'none' }, { was: { mode: 'memory' } }).wake, undefined, '导演要的是一下切断（琴声戛然而止）')
  assert.equal(beatHold({ ...back, transition: 'glitch' }, { was: { mode: 'memory' } }).wake, undefined)
  // 照玩家存档：长楼梯 → 回忆（水晶洞窟，布琳希尔德也在）→ 回到螺旋回廊
  const units = ['U1', 'U2', 'U3', 'U4', 'U5'].map(id => ({ id, type: 'dialogue' }))
  const script = {
    scene: { location: '长楼梯' },
    cast: [{ name: '柯萝伊', pos: 'center' }, { name: '布琳希尔德', pos: 'left' }],
    lines: {
      U1: { sp: '布琳希尔德' },
      U2: { sp: '阿黛尔', mode: 'memory', scene: { location: '水晶洞窟（三年前）' }, exit: ['*'], enter: [{ name: '阿黛尔', pos: 'center' }, { name: '布琳希尔德', pos: 'right' }] },
      U3: { sp: '布琳希尔德' },
      U4: { mode: 'real', scene: { location: '螺旋回廊', transition: 'haze' }, sp: '柯萝伊' },
      U5: { sp: '布琳希尔德' },
    },
  }
  const { beats } = buildBeats({ turns: [{ turn: 1, textVersion: 'v1', units, script }], images: [] })
  const sets = beats.map(b => b.set)
  assert.notEqual(sets[1], sets[0], '进回忆换一堂布景')
  assert.equal(sets[2], sets[1], '回忆里接着说不换')
  assert.notEqual(sets[3], sets[2], '回到现在换一堂布景')
  assert.equal(sets[4], sets[3])
  assert.ok(beats[2].cast.some(c => c.name === '布琳希尔德') && beats[3].cast.some(c => c.name === '布琳希尔德'), '布琳希尔德两边都在')
})
