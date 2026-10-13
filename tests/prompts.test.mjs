// 提示词页（第五批）：每一段提示词都在注册表里有默认、有说明；改了存成 { text, base }，内置更新了提示「有新版」；
// 共用开头把几位的规矩挪进用户消息、开头一字不差；补设计合进写词；导演日志里每张立绘的去掉 / 换掉；预览不发给模型。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fill, templateVars } from '../lib/template.js'
import { TEXT_DEFAULTS, cleanPrompts, useWordRules, lastFill, mapOf } from '../lib/prompt-words.js'
import { PROMPTS, PROMPT_GROUPS, promptItem, promptView, editPrompt, fingerprint, defaultOf } from '../lib/prompt-book.js'
import { resolveConfig } from '../lib/config.js'
import { softenSprite, composePrompt } from '../lib/image/style.js'
import { isFaceTag, faceTags } from '../lib/face.js'
import { writeSpritePrompts, writeSpritesAndDesign, writeActing, tagReport, designedTags } from '../lib/sprites.js'
import { direct } from '../lib/director.js'
import { segmentTurn } from '../lib/segment.js'
import { createStore } from '../lib/dsh/store.js'
import { createEngine } from '../lib/engine.js'
import { createApi } from '../lib/api.js'

/** 只记下请求、一个字都不回的假模型（回 reply 给的）。 */
function fakeLlm(reply = () => '{}') {
  const calls = []
  return { calls, stream(request) { calls.push(request); const text = reply(request); return (async function* () { yield { type: 'text-delta', text }; yield { type: 'finish', reason: { kind: 'stop' } } })() } }
}
const userOf = request => request.messages[0].content[0].text
const person = { name: '林岚', gender: 'female', appearance: '1girl, long black hair, blue eyes', outfit: '校服', outfitTags: 'school uniform', states: [], timeline: { outfits: { 校服: { tags: 'school uniform' } } } }
const context = { description: '林岚是钢琴社社长。', lore: [] }
const story = [{ turn: 1, text: '“你终于来了。”林岚回过头。' }]

test('gate: 模板：{{变量}} 换成值、没有的空着；[[ ]] 里有变量是空的整截不要；填进去的值不再当模板读', () => {
  assert.equal(fill('a{{x}}b{{y}}c', { x: 1 }), 'a1bc')
  assert.equal(fill('名字：{{name}}[[（{{gender}}）]]', { name: '林岚', gender: '女' }), '名字：林岚（女）')
  assert.equal(fill('名字：{{name}}[[（{{gender}}）]]', { name: '林岚', gender: '' }), '名字：林岚')
  assert.equal(fill('[[；{{a}}和{{b}}]]', { a: 1 }), '', '一截里有一个空的就整截不要')
  assert.equal(fill('{{x}}', { x: '{{y}}[[{{z}}]]', y: '不该出现' }), '{{y}}[[{{z}}]]')
  assert.deepEqual(templateVars('{{a}} {{b}} {{a}}'), ['a', 'b'])
})

test('gate: 注册表：每一段都有默认、分组、说明；默认里用到的变量都有说明；大段默认里没有 [[ ]]', () => {
  const groups = new Set(PROMPT_GROUPS.map(g => g.id))
  for (const id of Object.keys(TEXT_DEFAULTS)) assert.ok(PROMPTS.has(id), '内置的小段都要列在提示词页里：' + id)
  const config = resolveConfig({})
  for (const [id, e] of PROMPTS) {
    assert.ok(groups.has(e.group), id)
    assert.ok(e.label && e.section, id)
    assert.ok(defaultOf(id).trim(), '有默认：' + id)
    const item = promptItem(config, id)
    assert.deepEqual(item.vars.filter(v => v.unknown).map(v => v.name), [], '默认里的变量都有说明：' + id)
    assert.equal(item.edited, false)
    assert.equal(item.text, item.def)
    if (/\.(system|user)$/.test(id) || /^(director\.(music|sounds|eros)|acting\.task\.)/.test(id)) assert.ok(!defaultOf(id).includes('[['), '大段默认没有可省的一截：' + id)
  }
  const view = promptView(config)
  assert.equal(view.items.length, PROMPTS.size)
  assert.equal(view.shared, true, '共用开头默认开')
  assert.deepEqual(view.groups.map(g => g.id), ['director', 'acting', 'sprite', 'cg', 'shared', 'image', 'filter'])
})

test('gate: 改提示词：存成 { text, base }，跟默认一样的不存；内置更新了标「有新版」，保留我的不再提示；恢复默认；老设置的四个大框搬进来', () => {
  const saved = { director: { systemPrompt: '老的导演提示词 {{styleHint}}', model: 'x' } }
  // 读设置时就搬过来（不知道当时内置是哪一版：base 空着，标老设置搬来的）
  const read = resolveConfig(saved)
  assert.deepEqual(read.prompts['director.system'], { text: '老的导演提示词 {{styleHint}}', base: '', legacy: true })
  let item = promptItem(read, 'director.system')
  assert.deepEqual([item.edited, item.legacy, item.stale], [true, true, false])
  assert.equal('systemPrompt' in read.director, true, '读的时候不改存着的')

  editPrompt(saved, 'sprite.line.face', { text: defaultOf('sprite.line.face') + '；眼神接上一张' })
  assert.equal(saved.director.systemPrompt, undefined, '存的时候老字段清掉')
  assert.equal(saved.director.model, 'x')
  assert.equal(saved.prompts['director.system'].text, '老的导演提示词 {{styleHint}}', '搬进 prompts 里')
  assert.equal(saved.prompts['sprite.line.face'].base, fingerprint(defaultOf('sprite.line.face')))
  item = promptItem(resolveConfig(saved), 'sprite.line.face')
  assert.deepEqual([item.edited, item.stale, item.legacy], [true, false, false])
  assert.ok(item.text.endsWith('眼神接上一张'))

  // 内置后来改过：改的时候记下的那版对不上了
  saved.prompts['sprite.line.face'].base = 'old'
  item = promptItem(resolveConfig(saved), 'sprite.line.face')
  assert.equal(item.stale, true)
  editPrompt(saved, 'sprite.line.face', { keep: true })
  assert.equal(promptItem(resolveConfig(saved), 'sprite.line.face').stale, false, '保留我的：不再提示')
  assert.ok(saved.prompts['sprite.line.face'].text.endsWith('眼神接上一张'))

  editPrompt(saved, 'sprite.line.face', { reset: true })
  assert.equal(saved.prompts['sprite.line.face'], undefined)
  editPrompt(saved, 'cg.noCast', { text: defaultOf('cg.noCast') })
  assert.equal(saved.prompts['cg.noCast'], undefined, '跟默认一字不差的当没改')
  assert.throws(() => editPrompt(saved, 'no.such', { text: 'x' }), /没有这段提示词/)
  assert.deepEqual(cleanPrompts({ 'BAD ID': { text: 'x' }, 'a.b': { text: 3 }, 'c.d': { text: 'ok', base: 'zz' } }), { 'c.d': { text: 'ok', base: 'zz' } })
})

test('gate: 改过的提示词真的发出去：导演的系统提示词、档案的写法、出图固定词；变量填了什么记下来', async () => {
  const config = resolveConfig({ director: { sharedPrefix: false }, prompts: {
    'director.system': { text: '我自己的导演规矩（{{styleHint}}）', base: '' },
    'shared.person.outfit': { text: '* {{name}} = {{tags}}', base: '' },
    'image.spriteBg': { text: 'pink background', base: '' },
  } })
  const llm = fakeLlm(() => '{"scene":{"location":"琴房"}}')
  await direct({ llm, provider: 'p', model: 'm', units: segmentTurn('“你来了。”'), previous: null, castList: [], context: null, config, backend: 'novelai' })
  assert.match(llm.calls[0].system, /^我自己的导演规矩（目标模型是 NovelAI/)
  const writer = fakeLlm(() => JSON.stringify({ sprites: [{ key: 's1', tags: '1girl, smile' }] }))
  await writeSpritePrompts({ llm: writer, provider: 'p', model: 'm', config, backend: 'novelai', context, story, turn: 1, person, targets: [{ key: 'k', emotion: 'smile', outfit: '校服', states: [] }] })
  assert.match(userOf(writer.calls[0]), /^\* 校服 = school uniform$/m)
  assert.equal(lastFill('shared.person.outfit').values.tags, 'school uniform')
  const sprite = composePrompt({ kind: 'sprite', tags: '1girl, smile', backend: 'novelai', config, person, emotion: 'smile' })
  assert.match(sprite.positive, /pink background/)
  assert.doesNotMatch(sprite.positive, /white background/)
})

test('gate: 过滤规则能改：吓人的词、换轻一档、算不算表情、构图词（* 和 # 通配）都照设置走', () => {
  try {
    useWordRules(resolveConfig({ prompts: {
      'filter.harsh': { text: 'evil grin', base: '' },
      'filter.softer': { text: 'wide smile → smile', base: '' },
      'filter.face.exact': { text: 'derp', base: '' },
      'filter.spriteDrop': { text: 'solo\n#girl\nsimple *', base: '' },
    } }))
    assert.equal(softenSprite('evil grin, wide smile, clenched teeth'), 'smile, clenched teeth', '只按改过的名单收')
    assert.equal(isFaceTag('derp'), true)
    assert.equal(faceTags('derp, school uniform'), 'derp')
    const report = tagReport('1girl, simple background, red hair, evil grin', { key: 'k', emotion: 'smile' }, person)
    assert.deepEqual(report.removed.map(r => r.tag), ['1girl', 'simple background', 'red hair', 'evil grin'])
  } finally {
    useWordRules(resolveConfig({}))
  }
  assert.equal(softenSprite('evil grin, clenched teeth'), 'evil grin', '恢复默认名单')
})

test('gate: 设计师写的 → 实际发出的：去掉哪些（为什么）、换掉哪些；先设计再写的按定下的动作收', () => {
  useWordRules(resolveConfig({}))
  const whole = tagReport('1girl, cowboy shot, red hair, school uniform, glaring, constricted pupils, arms crossed', { key: 'k', emotion: 'angry' }, person)
  assert.deepEqual(whole.removed, [
    { tag: '1girl', why: '构图、背景、人数归插件管' },
    { tag: 'cowboy shot', why: '构图、背景、人数归插件管' },
    { tag: 'red hair', why: '跟档案的发色瞳色不一样' },
    { tag: 'constricted pupils', why: '画出来吓人，收掉' },
  ])
  assert.deepEqual(whole.replaced, [{ from: 'glaring', to: 'narrowed eyes' }])
  assert.match(whole.sent, /long black hair, blue eyes.*school uniform, narrowed eyes, arms crossed/)
  const face = tagReport('school uniform, smile, blush, arms crossed', { key: 'k', emotion: 'smile', face: { from: 'b' } }, person)
  assert.deepEqual(face.removed.map(r => [r.tag, r.why]), [['school uniform', '不是脸上的（只换脸只留表情）'], ['arms crossed', '不是脸上的（只换脸只留表情）']])
  assert.equal(face.sent.includes('smile') && face.sent.includes('blush'), true)
  assert.equal(designedTags('1girl, school uniform, smile, blush', { face: { from: 'b' } }), 'smile, blush')
  assert.equal(designedTags('smile, blush', {}), '', '整张画的只写了表情：不算写了')
  assert.equal(designedTags('1girl, school uniform, smile', {}), '1girl, school uniform, smile')
})

test('gate: 共用开头：系统提示词是同一句，规矩挪进【你的工作】；表演设计师和立绘设计师的开头（资料、剧情、档案）一字不差；关掉照以前', async () => {
  const config = resolveConfig({})
  const acting = fakeLlm(() => '{}')
  await writeActing({ llm: acting, provider: 'p', model: 'm', config, backend: 'novelai', context, story, turn: 1, person, emotions: ['neutral'] })
  const sprite = fakeLlm(() => '{}')
  await writeSpritePrompts({ llm: sprite, provider: 'p', model: 'm', config, backend: 'novelai', context, story, turn: 1, person, targets: [{ key: 'k', emotion: 'smile', outfit: '校服', states: [] }] })
  const director = fakeLlm(() => '{}')
  await direct({ llm: director, provider: 'p', model: 'm', units: segmentTurn('“你来了。”'), previous: null, castList: [], context, config, backend: 'novelai' }).catch(() => {})
  const shared = defaultOf('shared.system')
  for (const c of [acting.calls[0], sprite.calls[0], director.calls[0]]) assert.equal(c.system, shared)
  const a = userOf(acting.calls[0]), s = userOf(sprite.calls[0]), d = userOf(director.calls[0])
  assert.match(a, /【你的工作】\n你是视觉小说的角色表演设计师/)
  assert.match(s, /【角色档案】[\s\S]*【你的工作】\n你是视觉小说的立绘设计师[\s\S]*【要画的差分】/)
  assert.match(d, /^【资料[\s\S]*钢琴社社长[\s\S]*【你的工作】\n你是视觉小说（Galgame）的后台导演/)
  const head = a.slice(0, a.indexOf('【你的工作】'))
  assert.ok(head.includes('【剧情') && head.includes('【角色档案】') && head.includes('固定外貌：1girl, long black hair, blue eyes'))
  assert.equal(s.slice(0, head.length), head, '资料、剧情、档案一字不差：模型接口能缓存')
  assert.equal(d.slice(0, d.indexOf('【你的工作】')), head.slice(0, d.indexOf('【你的工作】')), '导演和设计师的资料那一截也一样')

  const off = fakeLlm(() => '{}')
  await writeSpritePrompts({ llm: off, provider: 'p', model: 'm', config: resolveConfig({ director: { sharedPrefix: false } }), backend: 'novelai', context, story, turn: 1, person, targets: [{ key: 'k', emotion: 'smile', outfit: '校服', states: [] }] })
  assert.match(off.calls[0].system, /^你是视觉小说的立绘设计师/)
  assert.doesNotMatch(userOf(off.calls[0]), /【你的工作】/)
})

test('gate: 补设计合进写词：一次请求带着表演设计师的规矩和已有设计，回的设计并进去，先设计再写的收原样', async () => {
  const current = { read: '安静', poses: [{ id: 'p1', label: '站着', desc: '', tags: 'hands at sides', emotions: ['neutral', 'smile'] }], faces: { neutral: { desc: '', tags: 'closed mouth' } } }
  const llm = fakeLlm(() => JSON.stringify({
    acting: { poses: [{ id: 'p1', emotions: ['sad'] }], faces: [{ emotion: 'sad', desc: '低着眼', tags: 'downcast eyes, frown' }] },
    sprites: [{ key: 's1', tags: '1girl, smile' }, { key: 's2', tags: '1girl, school uniform, downcast eyes, frown' }],
  }))
  const targets = [{ key: 'k1', emotion: 'smile', outfit: '校服', states: [] }, { key: 'design:sad', emotion: 'sad', design: true, outfit: '校服', states: [] }]
  const { results, sheet } = await writeSpritesAndDesign({ llm, provider: 'p', model: 'm', config: resolveConfig({}), backend: 'novelai', context, story, turn: 1, person: { ...person, acting: current }, targets, design: { emotions: ['sad'], current } })
  assert.equal(llm.calls.length, 1)
  const user = userOf(llm.calls[0])
  assert.match(user, /【先补设计】[\s\S]*你是视觉小说的角色表演设计师[\s\S]*【已有的动作与表情设计】[\s\S]*【要先设计的情绪】\n- sad（难过）/)
  assert.match(user, /- s2：先设计再写——情绪「难过」/)
  assert.match(user, /\{"acting":\{表演设计师要输出的那个对象/)
  assert.ok(sheet.poses[0].emotions.includes('sad'))
  assert.equal(sheet.faces.sad.tags, 'downcast eyes, frown')
  assert.equal(results.get('design:sad').raw, '1girl, school uniform, downcast eyes, frown')
  assert.equal(results.get('k1').tags, '1girl, smile')
})

test('gate: 宿主：提示词页的接口（看、改、恢复、上次填的、预览）；设置那边不带 prompts、不收老字段；预览不发给模型', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'flowgal-prompts-'))
  try {
    const store = createStore(dir)
    const llm = fakeLlm(() => '{}')
    const tavern = {
      apiVersion: 1, async attach() { return { id: 'm1' } }, async update() {}, async remove() {}, async list() { return [] },
      async getTurn() { return null }, async getCardContext() { return context }, async backgroundModel() { return { provider: 'fake', model: 'fake-1' } },
    }
    const engine = createEngine({ store, services: { tavern, llm }, logger: { warn() {}, info() {} } })
    const api = createApi({ engine, music: { list: async () => [] } })
    const route = (method, path) => api.endpoints.find(r => r.path === path && r.methods.includes(method)).handler
    const view = await route('GET', '/prompts')({ method: 'GET', query: {}, body: {} })
    assert.equal(view.items.length, PROMPTS.size)
    const { item } = await route('POST', '/prompts')({ method: 'POST', query: {}, body: { id: 'cg.noCast', text: '（没人）' } })
    assert.deepEqual([item.edited, item.text], [true, '（没人）'])
    const file = JSON.parse(await readFile(join(dir, 'config.json'), 'utf8').catch(async () => readFile(store.configPath?.() || join(dir, 'config.json'), 'utf8')))
    assert.equal(file.prompts['cg.noCast'].text, '（没人）')
    // 设置这边：不带 prompts，也不收 prompts 和老的四个大框
    const pub = await engine.patchConfig({ prompts: { 'cg.noCast': { text: 'x' } }, director: { cgPrompt: '老的', temperature: 0.5 } })
    assert.equal('prompts' in pub.config, false)
    assert.equal(pub.config.director.temperature, 0.5)
    assert.equal((await engine.prompts()).items.find(i => i.id === 'cg.noCast').text, '（没人）')
    assert.equal((await engine.prompts()).items.find(i => i.id === 'cg.system').edited, false)
    await route('POST', '/prompts')({ method: 'POST', query: {}, body: { id: 'cg.noCast', reset: true } })
    assert.equal((await engine.prompts()).items.find(i => i.id === 'cg.noCast').edited, false)

    // 预览：照这一局拼，不发给模型
    await engine.castAction('g', 'save', { name: '林岚', patch: { appearance: '1girl, long black hair', gender: 'female' } })
    await assert.rejects(engine.previewPrompt('g', 'director'), /还没有正文/)
    const before = llm.calls.length
    const { preview } = await route('POST', '/prompts/preview')({ method: 'POST', query: {}, body: { gameId: 'g', role: 'sprite', name: '林岚' } })
    assert.equal(llm.calls.length, before, '预览不发给模型')
    assert.equal(preview.system, defaultOf('shared.system'))
    assert.match(preview.user, /林岚是钢琴社社长[\s\S]*名字：林岚（女）[\s\S]*【你的工作】\n你是视觉小说的立绘设计师[\s\S]*- s1：.*情绪「平静」/)
    const acting = await engine.previewPrompt('g', 'acting', { name: '林岚' })
    assert.match(acting.user, /你是视觉小说的角色表演设计师[\s\S]*【要设计的情绪】\n- neutral（平静）/)
    await assert.rejects(engine.previewPrompt('g', 'sprite', { name: '没这个人' }), /没有 没这个人/)
    const last = await route('GET', '/prompts/last')({ method: 'GET', query: { id: 'shared.person' }, body: {} })
    assert.equal(last.last.values.name, '林岚')
    engine.dispose()
  } finally {
    await rm(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 })
  }
})
