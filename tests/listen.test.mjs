// 先听一遍：音效库比候选名额大时，导演之前先让听音师列出这一轮听得见的声音和找它们的词，候选照它找（正文里没有原词也找得到）；
// 听音师失败、没配好模型时退回按正文对词；可以关；能单独换模型（宿主里另选 / 自定义接口）；导演日志、提示词页都看得到。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { soundCandidates, cleanHeard, categoryBrief, overflowing, candidateQuota, SFX_CANDIDATES, AMBIENCE_CANDIDATES } from '../lib/soundlib.js'
import { direct, listenSounds, wantsListen } from '../lib/director.js'
import { segmentTurn } from '../lib/segment.js'
import { DEFAULT_CONFIG, resolveConfig } from '../lib/config.js'
import { createStore } from '../lib/dsh/store.js'
import { createEngine } from '../lib/engine.js'
import { createApi } from '../lib/api.js'

const S = (id, kind, category, name, tags, description = '') => ({ id, kind, category, name, tags, description })
/** 一个比候选名额大的库：几个有用的，加一堆对不上的。 */
const LIBRARY = [
  S('plate', 'sfx', '厨房/餐具', '盘子摔碎', ['摔碎', '盘子', '碗', '打碎', '碎了', '瓷器'], '瓷盘摔在地上碎开'),
  S('glass', 'sfx', '厨房/餐具', '玻璃杯碰撞', ['玻璃杯', '碰杯', '叮'], '两只玻璃杯轻碰'),
  S('slam', 'sfx', '门窗/开关门', '摔门', ['摔门', '砰', '甩门', '关门']),
  S('kick', 'sfx', '打斗/拳脚', '踢中', ['踢', '一脚', '踹']),
  S('buzz', 'sfx', '手机电脑/手机', '手机震动', ['手机', '震动', '嗡嗡']),
  S('class', 'ambience', '公共场所/学校', '学校课间', ['教室', '课间', '学校', '吵闹']),
  S('rainin', 'ambience', '天气/雨', '屋内听雨', ['雨', '下雨', '窗外']),
  ...Array.from({ length: 50 }, (_, i) => S('x' + i, 'sfx', '无关/类' + (i % 5), '无关' + i, ['不会出现的词' + i])),
  ...Array.from({ length: 12 }, (_, i) => S('a' + i, 'ambience', '无关/环境' + (i % 3), '无关环境' + i, ['不会出现的地方' + i])),
]
const TEXT = '“你够了！”他把杯子砸在地上。\n她没说话，转身就走，门在身后狠狠合上。'
const units = segmentTurn(TEXT)
const HEARD_REPLY = JSON.stringify({
  amb: [{ at: 'U1', what: '教室课间', words: ['教室', '课间', '学校'], cats: ['公共场所/学校'] }],
  sfx: [
    { at: 'U2', what: '杯子摔碎', words: ['摔碎', '打碎', '碎裂', '杯子', '玻璃', '音效'], cats: ['厨房/餐具'] },
    { at: 'U4', what: '用力关门', words: ['摔门', '关门', '砰'], cats: ['门窗/开关门'] },
  ],
})

/** 认得出听音师和导演的假模型：听音师回 listen()，导演回一份简单的脚本；calls 记下每次请求。 */
function fakeLlm({ listen = () => HEARD_REPLY, director = () => '{"scene":{"amb":"none"},"lines":[]}' } = {}) {
  const calls = []
  return {
    calls,
    stream(request) {
      calls.push(request)
      const isListen = String(request.system || '').includes('你是视觉小说的拟音师')
      let text
      try { text = isListen ? listen(request) : director(request) } catch (error) { return (async function* () { yield { type: 'finish', reason: { kind: 'error', failure: { message: error.message } } } })() }
      return (async function* () { yield { type: 'text-delta', text }; yield { type: 'usage', usage: { inputTokens: 10, outputTokens: 5 } }; yield { type: 'finish', reason: { kind: 'stop' } } })()
    },
  }
}
const userOf = request => request.messages[0].content[0].text
const directorCall = calls => calls.find(c => !String(c.system || '').includes('你是视觉小说的拟音师'))
const sfxBlock = text => text.slice(text.indexOf('音效（响一次）：'), text.indexOf('音效规则'))

test('gate: 听音师的输出规整：单元编号认 U5 和 5、空词去掉、词去重最多 12 个、分类最多 3 个；没写东西的丢掉', () => {
  const heard = cleanHeard({
    amb: [{ at: 1, what: '教室', words: '教室，课间、学校', cats: ['公共场所/学校', ''] }, { what: '', words: [] }],
    sfx: [
      { at: 'U2', what: '杯子摔碎', words: ['摔碎', '摔碎', '声音', '音效', ' 玻璃 ', ...Array.from({ length: 20 }, (_, i) => '词' + i)], cats: ['厨房/餐具', '厨房\\餐具', 'a/b', 'c/d'] },
      { at: 'U99', what: '敲门', words: ['敲门'] },
      'x',
    ],
  }, units)
  assert.deepEqual(heard.ambience, [{ at: 'U1', what: '教室', words: ['教室', '课间', '学校'], cats: ['公共场所/学校'] }])
  assert.equal(heard.sfx.length, 2)
  assert.deepEqual(heard.sfx[0].words.slice(0, 3), ['摔碎', '玻璃', '词0'])
  assert.equal(heard.sfx[0].words.length, 12)
  assert.deepEqual(heard.sfx[0].cats, ['厨房/餐具', 'a/b', 'c/d'])
  assert.equal(heard.sfx[1].at, '', '对不上的单元编号空着')
  assert.deepEqual(cleanHeard(null, units), { ambience: [], sfx: [] })
})

test('gate: 照听到的声音找：正文没有原词也找得到；每条先保证一个、轮流取；剩下的名额按正文补；上一幕的环境音一定在', () => {
  // 只按正文：「杯子砸在地上」对不上「摔碎」「盘子」，盘子摔碎进不了候选
  const literal = soundCandidates(LIBRARY, TEXT)
  assert.equal(literal.sfx.some(s => s.id === 'plate'), false)
  assert.equal('found' in literal, false, '不带 heard 时形状照旧')
  const heard = cleanHeard(JSON.parse(HEARD_REPLY), units)
  const picked = soundCandidates(LIBRARY, TEXT, { sfx: 4, ambience: 2, keep: ['rainin'], heard })
  assert.deepEqual(picked.sfx.slice(0, 2).map(s => s.id), ['plate', 'slam'], '每条最像的先进，按条目顺序轮流')
  assert.ok(picked.sfx.length <= 4)
  assert.deepEqual(picked.ambience.map(s => s.id), ['rainin', 'class'], '上一幕的在最前，再照听到的找')
  assert.equal(picked.found.sfx[0][0], 'plate')
  assert.equal(picked.found.sfx[1][0], 'slam')
  assert.deepEqual(picked.found.ambience[0], ['class'])
  // 分类对上也算：听音师只给了分类、词都对不上
  const byCat = soundCandidates(LIBRARY, '', { sfx: 3, heard: { ambience: [], sfx: [{ at: '', what: '哐啷', words: ['哐啷'], cats: ['手机电脑/手机'] }] } })
  assert.deepEqual(byCat.sfx.map(s => s.id), ['buzz'])
  // 名额满了就停；库没超过名额时全给，found 照样算
  assert.equal(soundCandidates(LIBRARY, TEXT, { sfx: 1, heard }).sfx.length, 1)
  const small = soundCandidates(LIBRARY.slice(0, 5), TEXT, { heard })
  assert.equal(small.sfx.length, 5)
  assert.equal(small.found.sfx[0][0], 'plate')
})

test('gate: 给听音师看的分类按大类一组、多的在前；超没超名额分开算；候选数照设置、填坏了用默认', () => {
  const brief = categoryBrief(LIBRARY, 'sfx')
  assert.match(brief, /^无关：类0、类1、类2、类3、类4；/)
  assert.match(brief, /厨房：餐具/)
  assert.doesNotMatch(brief, /学校/, '环境音的分类不混进来')
  assert.equal(categoryBrief([S('n', 'sfx', '未分类', 'n', [])], 'sfx'), '')
  assert.deepEqual(overflowing(LIBRARY), { sfx: 55 > SFX_CANDIDATES, ambience: 14 > AMBIENCE_CANDIDATES })
  assert.deepEqual(candidateQuota(null), { sfx: SFX_CANDIDATES, ambience: AMBIENCE_CANDIDATES })
  assert.deepEqual(candidateQuota({ director: { soundCandidates: { sfx: 999, ambience: 0 } } }), { sfx: 300, ambience: AMBIENCE_CANDIDATES })
  const config = resolveConfig({ director: { soundCandidates: { sfx: '80', ambience: -1 }, listen: 0 } })
  assert.deepEqual(config.director.soundCandidates, { sfx: 80, ambience: AMBIENCE_CANDIDATES })
  assert.equal(config.director.listen, true, '只有明确写 false 才关')
  assert.equal(resolveConfig({ director: { listen: false } }).director.listen, false)
  assert.deepEqual(resolveConfig({ director: { listenLlm: { source: 'evil', baseURL: 'file:///x', model: ' m ' } } }).director.listenLlm, { source: '', provider: '', model: 'm', baseURL: '', contextWindow: 128000 })
  // 要不要先听：开着并且有一种超了
  assert.equal(wantsListen(DEFAULT_CONFIG, LIBRARY), true)
  assert.equal(wantsListen(DEFAULT_CONFIG, LIBRARY.slice(0, 7)), false)
  assert.equal(wantsListen(resolveConfig({ director: { listen: false } }), LIBRARY), false)
  assert.equal(wantsListen(resolveConfig({ director: { soundCandidates: { sfx: 100, ambience: 100 } } }), LIBRARY), false)
})

test('gate: 导演之前先听一遍：听音师看分类和正文，导演的候选里有它找到的；日志记下听到什么、找到了哪些', async () => {
  const llm = fakeLlm()
  const trace = {}
  const out = await direct({ llm, provider: 'fake', model: 'fake-1', units, previous: null, castList: [], context: {}, config: DEFAULT_CONFIG, backend: 'novelai', sounds: LIBRARY, trace })
  assert.equal(llm.calls.length, 2)
  const [listen, director] = llm.calls
  assert.match(listen.system, /你是视觉小说的拟音师/)
  assert.match(userOf(listen), /【上一幕结束时】这是第一幕，没有上一幕。/)
  assert.match(userOf(listen), /环境音：无关：环境0、环境1、环境2；/)
  assert.match(userOf(listen), /音效：无关：类0.*厨房：餐具/)
  assert.match(userOf(listen), /\[U2\|旁白\] 他把杯子砸在地上。/)
  assert.ok(listen.maxTokens <= 16000)
  assert.match(sfxBlock(userOf(director)), /plate｜盘子摔碎｜厨房\/餐具｜瓷盘摔在地上碎开/)
  assert.match(sfxBlock(userOf(director)), /slam｜摔门/)
  assert.ok(out.script)
  assert.equal(trace.listen.error, '')
  assert.deepEqual(trace.listen.heard.sfx.map(h => [h.what, h.found[0]]), [['杯子摔碎', '盘子摔碎'], ['用力关门', '摔门']])
  assert.deepEqual(trace.listen.heard.sfx[0].words, ['摔碎', '打碎', '碎裂', '杯子', '玻璃'], '空词去掉了')
  assert.deepEqual(trace.listen.usage, { inputTokens: 10, outputTokens: 5 })
  assert.deepEqual(trace.notes, [])
})

test('gate: 听音师失败、回不出 JSON、没配好模型时退回按正文对词，导演照常整理；关掉或库不大时不跑；停止整理时连它一起停', async () => {
  // 模型报错
  const failing = fakeLlm({ listen: () => { throw new Error('content filtered') } })
  const trace = {}
  const out = await direct({ llm: failing, provider: 'fake', model: 'fake-1', units, previous: null, castList: [], context: {}, config: DEFAULT_CONFIG, backend: 'novelai', sounds: LIBRARY, trace })
  assert.ok(out.script)
  assert.equal(failing.calls.length, 2)
  assert.doesNotMatch(sfxBlock(userOf(directorCall(failing.calls))), /盘子摔碎/, '退回按正文对词')
  assert.match(trace.notes.join(), /听音师失败，音效候选按正文对词挑：content filtered/)
  assert.equal(trace.listen.error, 'content filtered')
  // 回的不是 JSON
  const chatty = fakeLlm({ listen: () => '这一轮有摔杯子的声音。' })
  const t2 = {}
  await direct({ llm: chatty, provider: 'fake', model: 'fake-1', units, previous: null, castList: [], context: {}, config: DEFAULT_CONFIG, backend: 'novelai', sounds: LIBRARY, trace: t2 })
  assert.match(t2.notes.join(), /听音师失败/)
  // 单独选的模型没配好：不发，说一声
  const host = fakeLlm()
  const t3 = {}
  await direct({ llm: host, provider: 'fake', model: 'fake-1', units, previous: null, castList: [], context: {}, config: DEFAULT_CONFIG, backend: 'novelai', sounds: LIBRARY, trace: t3, listener: { problem: '听音师的自定义接口还没填模型（设置 → 导演）' } })
  assert.equal(host.calls.length, 1)
  assert.match(t3.notes.join(), /听音师没跑（听音师的自定义接口还没填模型/)
  // 单独选的模型：听音师走它，导演走自己的
  const own = fakeLlm()
  const director = fakeLlm()
  await direct({ llm: director, provider: 'fake', model: 'fake-1', units, previous: null, castList: [], context: {}, config: DEFAULT_CONFIG, backend: 'novelai', sounds: LIBRARY, listener: { llm: own, provider: 'cheap', model: 'flash', source: 'listen' } })
  assert.deepEqual(own.calls.map(c => [c.provider, c.model]), [['cheap', 'flash']])
  assert.equal(director.calls.length, 1)
  // 关掉、库不大：不跑
  const quiet = fakeLlm()
  await direct({ llm: quiet, provider: 'fake', model: 'fake-1', units, previous: null, castList: [], context: {}, config: resolveConfig({ director: { listen: false } }), backend: 'novelai', sounds: LIBRARY })
  await direct({ llm: quiet, provider: 'fake', model: 'fake-1', units, previous: null, castList: [], context: {}, config: DEFAULT_CONFIG, backend: 'novelai', sounds: LIBRARY.slice(0, 7) })
  assert.equal(quiet.calls.length, 2)
  assert.equal(quiet.calls.some(c => String(c.system).includes('拟音师')), false)
  // 停止整理：听音师那一步就停，不往下整理
  const controller = new AbortController()
  const slow = { calls: [], stream(request) { this.calls.push(request); controller.abort(); return (async function* () { yield { type: 'text-delta', text: '{}' } })() } }
  await assert.rejects(direct({ llm: slow, provider: 'fake', model: 'fake-1', units, previous: null, castList: [], context: {}, config: DEFAULT_CONFIG, backend: 'novelai', sounds: LIBRARY, signal: controller.signal }))
  assert.equal(slow.calls.length, 1)
})

test('gate: 听音师的最大输出：不超过 16000，按模型窗口收；模型拒绝时按它给的上限重试一次', async () => {
  const seen = []
  let first = true
  const llm = {
    resolveModelInfo: async () => ({ context: { contextWindow: 9000 } }),
    stream(request) {
      seen.push(request.maxTokens)
      if (first) { first = false; return (async function* () { yield { type: 'finish', reason: { kind: 'error', failure: { message: 'max_tokens must be at most 2048', code: '' } } } })() }
      return (async function* () { yield { type: 'text-delta', text: HEARD_REPLY }; yield { type: 'finish', reason: { kind: 'stop' } } })()
    },
  }
  const trace = {}
  const heard = await listenSounds({ llm, provider: 'p', model: 'm', units, previous: null, sounds: LIBRARY, config: DEFAULT_CONFIG, trace })
  assert.ok(seen[0] < 9000 && seen[0] > 2048, '按窗口收过：' + seen[0])
  assert.equal(seen[1], 2048)
  assert.equal(trace.listen.maxTokens, 2048)
  assert.equal(heard.sfx.length, 2)
})

test('gate: 宿主：整理时先听一遍（听音师走自己接的接口，Key 不出宿主），导演日志记下这一步、用量算在一起；提示词页能预览听音师', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'flowgal-listen-'))
  try {
    const store = createStore(dir)
    await store.updateSoundLib(lib => { lib.sounds.push(...LIBRARY.map(s => ({ ...s, volume: 1, assetId: 'none', file: '', bytes: 1, addedAt: 1 }))) })
    const tavern = {
      apiVersion: 1, async attach() { return { id: 'm1' } }, async update() {}, async remove() {}, async list() { return [] },
      async getTurn() { return null }, async getCardContext() { return null }, async backgroundModel() { return { provider: 'host', model: 'host-1' } },
    }
    const llm = fakeLlm()
    const chats = []
    const fetchImpl = async (url, init) => {
      url = String(url)
      if (url.endsWith('/models')) return new Response(JSON.stringify({ data: [{ id: 'flash' }] }))
      const body = JSON.parse(init.body)
      chats.push({ url, auth: init.headers.authorization, body })
      return new Response(JSON.stringify({ choices: [{ message: { content: HEARD_REPLY } }], usage: { prompt_tokens: 7, completion_tokens: 3 } }), { headers: { 'content-type': 'application/json' } })
    }
    const engine = createEngine({ store, services: { tavern, llm }, fetchImpl, logger: { warn() {}, info() {} } })
    await engine.patchConfig({ images: { auto: false, backgrounds: false, portraits: false, expressions: false }, director: { listenLlm: { source: 'custom', baseURL: 'https://listen.example.com/v1', model: 'flash', contextWindow: 32000 } } })
    const config = await engine.setSecret('listenllm', '', 'sk-listen')
    assert.equal(config.keys.listenllm, true)
    assert.equal(JSON.stringify(config).includes('sk-listen'), false, 'Key 不出宿主')
    const api = createApi({ engine, music: { list: async () => [] } })
    const route = (method, path) => api.endpoints.find(r => r.path === path && r.methods.includes(method)).handler
    assert.deepEqual((await route('GET', '/own-models')({ method: 'GET', query: { which: 'listen' }, body: {} })).models.map(m => m.id), ['flash'])

    await engine.onTurnSettled({ gameId: 'g', turn: 1, textVersion: 'v1', text: TEXT, card: { id: 'c', name: '学园' } })
    for (let i = 0; i < 200 && !(await engine.directorLog('g')).entries.length; i++) await new Promise(r => setTimeout(r, 20))
    assert.equal(chats.length, 1, '听音师走自定义接口')
    assert.equal(chats[0].auth, 'Bearer sk-listen')
    assert.equal(chats[0].body.model, 'flash')
    assert.equal(llm.calls.length, 1, '宿主只被导演叫了一次')
    assert.match(sfxBlock(userOf(llm.calls[0])), /盘子摔碎/)
    const log = await engine.directorLog('g')
    const summary = log.entries[0]
    assert.equal(summary.status, 'ok')
    assert.deepEqual(summary.usage, { inputTokens: 17, outputTokens: 8 }, '听音师的用量算进这一次')
    const { entry } = await engine.directorEntry('g', summary.id)
    assert.equal(entry.listen.source, 'custom')
    assert.equal(entry.listen.model, 'flash')
    assert.match(entry.listen.user, /【本轮正文】/)
    assert.equal(entry.listen.heard.sfx[0].found[0], '盘子摔碎')

    // 提示词页：预览听音师，不发给模型
    const before = [llm.calls.length, chats.length]
    const preview = await engine.previewPrompt('g', 'listen')
    assert.deepEqual([llm.calls.length, chats.length], before, '预览不发给模型')
    assert.match(preview.system, /你是视觉小说的拟音师/)
    assert.match(preview.user, /\[U2\|旁白\] 他把杯子砸在地上。/)
    assert.equal(preview.model, 'flash')
    assert.deepEqual(preview.notes, [])
    const directorPreview = await engine.previewPrompt('g', 'director')
    assert.deepEqual([llm.calls.length, chats.length], before)
    assert.match(directorPreview.notes.join(), /预览不跑听音师/)
    assert.equal(directorPreview.notes.some(n => n.includes('FlowGal 预览')), false)
    await engine.patchConfig({ director: { listen: false } })
    assert.match((await engine.previewPrompt('g', 'listen')).notes.join(), /关着「先听一遍」/)
    engine.dispose()
  } finally {
    await rm(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 })
  }
})
