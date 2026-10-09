// 只演故事本身：切单元前剥掉思考、变量更新、网页外壳和装饰；导演把状态栏、目录、作者的话这些标成不演；剧场和写词的都只读要演的部分。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { storyText } from '../lib/clean.js'
import { segmentTurn } from '../lib/segment.js'
import { normalizeScript } from '../lib/director.js'
import { playedUnits } from '../lib/staging.js'
import { buildBeats } from '../src/client/theater/playback.js'
import { createStore } from '../lib/store.js'
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
  const text = storyText({ text: tavernText(WIKI), rawText: WIKI, card: { name: '林岚' } })
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
  const text = storyText({ text: tavernText(raw).replace('{{getvar::name}}', '阿哲'), rawText: raw })
  for (const junk of ['用户想看', '星屑Wiki', '最后编辑', '好感度.林岚', '```']) assert.ok(!text.includes(junk), junk)
  assert.ok(text.includes('林岚「你来了啊，阿哲。」'))
  // 原文比 text 多出一大截：Tavern 的正则把东西藏起来了，跟 Tavern 走。
  const hidden = '<p>正文。</p>\n' + '<div class="secret">' + '藏起来的设定。'.repeat(40) + '</div>'
  assert.equal(storyText({ text: '正文。', rawText: hidden }), '正文。')
})

test('gate: 分隔线、代码块标记、Markdown 记号和 HTML 实体收拾干净，没有正文时为空', () => {
  const text = storyText({ text: '# 第一章\n**她**回过头&hellip;\n————————\n```\n- 林岚：你好。\n|---|---|\n> 苏晴：嗯。\n“……”\n...\n[链接](https://x.example)' })
  assert.deepEqual(text.split('\n'), ['第一章', '她回过头…', '林岚：你好。', '苏晴：嗯。', '“……”', '...', '链接'])
  assert.equal(storyText({ text: '  ', rawText: '<div>x</div>' }), '')
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
    assert.ok(llm.calls[0].messages[0].content[0].text.includes('[U1|旁白] 时间：19:40'), '导演看得到状态栏，自己判断不演')
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
