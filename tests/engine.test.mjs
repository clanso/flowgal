// 用假的 Tavern / llm / 生图服务跑通一整轮：正文 → 场景卡占位 → 导演 → 角色档案 / 情绪库 → 立绘设计师 / 插画分镜师写词 → CG / 背景 / 立绘 → 挂回正文。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm, open, readdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createStore } from '../lib/dsh/store.js'
import { createEngine, KIND_SCENE, KIND_CG } from '../lib/engine.js'
import { variantKey, nameSeed } from '../lib/look.js'

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')

export function fakeTavern() {
  const items = new Map()
  let seq = 0
  const turns = new Map()
  return {
    apiVersion: 1,
    items,
    turns,
    async attach({ gameId, turn, textVersion, item }) { const id = 'm' + ++seq; items.set(id, { id, gameId, turn, textVersion, ...item, current: true }); return { id } },
    async update(id, changes) { const item = items.get(id); Object.assign(item, changes); return item },
    async remove(id) { return items.delete(id) },
    async list({ gameId }) { return [...items.values()].filter(i => i.gameId === gameId) },
    async getTurn({ gameId, turn }) { return turns.get(gameId + ':' + turn) || null },
    async getCardContext() { return { description: '林岚：黑长直，蓝眼睛的学姐。', personality: '', scenario: '', lore: [] } },
    async backgroundModel() { return { provider: 'fake', model: 'fake-1' } },
  }
}

export function fakeLlm(reply) {
  const calls = []
  return {
    calls,
    stream(request) {
      calls.push(request)
      const text = typeof reply === 'function' ? reply(request) : reply
      return (async function* () { yield { type: 'text-delta', text }; yield { type: 'finish', reason: { kind: 'stop' } } })()
    },
  }
}

const DIRECTOR_REPLY = JSON.stringify({
  scene: { location: '学园天台', time: 'dusk', weather: 'sakura', mood: 'sweet', transition: 'dissolve', bg: 'school rooftop, fence, sunset, cherry blossoms, scenery, no humans' },
  cast: [{ name: '林岚', pos: 'center' }],
  lines: [{ u: 'U2', sp: '林岚', emo: 'smile', sym: 'heart', cam: 'zoom' }],
  choices: ['走到她身边', '递上饮料'],
  images: [{ after: 'U2', title: '天台的等待', moment: '夕阳下的天台，林岚扶着栏杆回过头来，风吹起花瓣', who: ['林岚'] }],
  people: [{ name: '林岚', gender: 'female', appearance: '1girl, long black hair, blue eyes', outfit: '校服', outfitTags: 'school uniform, sailor collar, red ribbon' }],
  summary: '林岚在天台等我。',
})

/** 假的立绘设计师：按「要画的差分」里的编号逐条回 tag，tag 里带上编号方便断言。 */
export function spriteReply(request) {
  const user = request.messages[0].content[0].text
  const ids = [...user.matchAll(/^- (s\d+)：/gm)].map(m => m[1])
  return JSON.stringify({ sprites: ids.map(id => ({ key: id, tags: `1girl, long black hair, blue eyes, school uniform, sailor collar, written-${id}` })) })
}
/** 假的插画分镜师：按「要画的插画」里的编号回 Base + 角色块。故意把人名混进 tag 和 nl、Base 不写人数，看插件能不能收拾干净。 */
export function cgReply(request) {
  const user = request.messages[0].content[0].text
  const ids = [...user.matchAll(/^- (c\d+)：/gm)].map(m => m[1])
  return '<thinking>状态账本：林岚穿校服。</thinking>' + JSON.stringify({
    images: ids.map(id => ({
      key: id, size: 'portrait',
      tag: 'school rooftop, sunset, golden hour, cherry blossoms, wind, cowboy shot, warm colors',
      nl: 'A school rooftop at sunset where 林岚 waits.',
      characters: [{ name: '林岚', tag: 'girl, 林岚, school uniform, sailor collar, red ribbon, smile, blush, looking back, hand on railing', nl: "She turns around; 林岚's hair flows in the wind as she smiles at the viewer." }],
    })),
  })
}
const isCgWriter = request => request.system.includes('你是视觉小说的插画分镜师')
/** 导演、立绘设计师和插画分镜师共用一个假模型：按系统提示词分流。 */
export const routedReply = director => request => (request.system.includes('立绘设计师') ? spriteReply(request) : isCgWriter(request) ? cgReply(request) : typeof director === 'function' ? director(request) : director)

test('gate: 一整轮的后台整理与出图', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'flowgal-'))
  try {
    const store = createStore(dir)
    const tavern = fakeTavern()
    const llm = fakeLlm(routedReply(DIRECTOR_REPLY))
    const requests = []
    const fetchImpl = async (url, init) => {
      requests.push({ url: String(url), body: init?.body ? JSON.parse(init.body) : null, auth: init?.headers?.authorization })
      return new Response(PNG, { status: 200, headers: { 'content-type': 'image/png' } })
    }
    const services = { tavern, llm, credentials: null }
    const engine = createEngine({ store, services, fetchImpl, logger: { warn() {}, info() {} } })
    await engine.patchConfig({ images: { expressions: true } })
    await engine.setSecret('novelai', 'official', 'pst-test-key')
    const turn = { gameId: 'g1', turn: 2, textVersion: 'v-a', text: '夕阳下的天台。\n“你终于来了。”林岚回过头。', card: { id: 'c', name: '学园' } }
    tavern.turns.set('g1:1', { text: '放学铃响了，我想起学姐约我去天台。' })
    tavern.turns.set('g1:2', turn)
    await engine.onTurnSettled(turn)
    const scene = [...tavern.items.values()].find(i => i.kind === KIND_SCENE)
    assert.equal(scene.status, 'ready')
    assert.equal(scene.data.location, '学园天台')
    const look = { appearance: '1girl, long black hair, blue eyes', outfit: '校服', states: [] }
    const neutralKey = variantKey(look, 'neutral'), smileKey = variantKey(look, 'smile')
    // 等出图队列跑完：插画（存档和正文占位都到 ready）、背景、平静立绘、微笑差分四样都到位；超时就报出哪一样卡在什么状态。
    const missing = view => {
      const image = view.images[0], place = view.places['学园天台|dusk'], person = view.cast[0]
      const cg = [...tavern.items.values()].find(i => i.kind === KIND_CG)
      const sprite = key => person?.spriteStatus?.[key]
      return [
        !(image?.status === 'ready' && cg?.status === 'ready') && `插画：存档里 ${stateOf(image)}，正文占位 ${stateOf(cg)}`,
        !place?.assetId && `背景「学园天台|dusk」：${stateOf(place)}`,
        !person?.sprites?.[neutralKey]?.assetId && `平静立绘：${stateOf(sprite(neutralKey))}`,
        !person?.sprites?.[smileKey]?.assetId && `微笑差分：${stateOf(sprite(smileKey))}`,
      ].filter(Boolean)
    }
    const view = await settle(engine, 'g1', v => !missing(v).length, 10000, missing)
    assert.equal(view.turns.length, 1)
    assert.equal(view.turns[0].script.lines.U2.sp, '林岚')
    const cg = [...tavern.items.values()].find(i => i.kind === KIND_CG)
    assert.equal(cg.status, 'ready')
    assert.equal(cg.anchor, '你终于来了。')
    assert.equal(view.images[0].versions.length, 1)
    assert.ok(view.places['学园天台|dusk'].assetId, '新地点生成背景')
    const person = view.cast[0]
    assert.equal(person.outfit, '校服')
    assert.ok(person.sprites[neutralKey].assetId, '首次登场生成这身衣服的平静立绘')
    assert.ok(person.sprites[smileKey].assetId, '情绪差分')
    // 立绘设计师一次写完这个人的一批差分，读了资料、之前的剧情和衣橱。
    const writer = llm.calls.filter(c => c.system.includes('立绘设计师'))
    assert.equal(writer.length, 1)
    const writerUser = writer[0].messages[0].content[0].text
    assert.match(writerUser, /黑长直，蓝眼睛的学姐/)
    assert.match(writerUser, /放学铃响了/)
    assert.match(writerUser, /你终于来了/)
    assert.match(writerUser, /校服：school uniform, sailor collar, red ribbon/)
    // 内置情绪带「演到全身」的动作参考（微笑：嘴角轻轻上扬……）
    assert.match(writerUser, /情绪「微笑」；动作参考：嘴角轻轻上扬/)
    // 两张差分用写好的词、同一个种子（按名字算的固定种子）。写好的词进这个人的角色块（照柏宝绘的立绘写法），Base 只有画风和构图。
    const charOf = r => r.body?.parameters?.v4_prompt?.caption?.char_captions?.[0]?.char_caption || ''
    const spriteReqs = requests.filter(r => charOf(r).includes('written-s'))
    assert.equal(spriteReqs.length, 2)
    assert.deepEqual(spriteReqs.map(r => r.body.parameters.seed), [nameSeed('林岚'), nameSeed('林岚')])
    assert.match(charOf(spriteReqs[0]), /^girl, long black hair, blue eyes, school uniform, sailor collar, written-s\d, cowboy shot, standing, facing forward, eye-level, facing viewer, straight-on$/)
    assert.doesNotMatch(spriteReqs[0].body.input, /written-s|long black hair/)
    assert.equal(spriteReqs[0].body.parameters.v4_prompt.use_coords, true)
    assert.equal(person.seed, nameSeed('林岚'))
    // 写词过程记进导演日志。
    const log = await engine.directorLog('g1')
    assert.ok(log.entries.some(e => e.kind === 'sprite' && e.name === '林岚' && e.status === 'ok'))
    // 插画：导演只挑瞬间，插画分镜师读了剧情和档案写 Base + 角色块，记进导演日志。
    const cgWriter = llm.calls.filter(isCgWriter)
    assert.equal(cgWriter.length, 1)
    const cgUser = cgWriter[0].messages[0].content[0].text
    assert.match(cgUser, /放学铃响了/)
    assert.match(cgUser, /扶着栏杆回过头来/)
    assert.match(cgUser, /固定外貌：1girl, long black hair, blue eyes/)
    assert.ok(log.entries.some(e => e.kind === 'cg' && e.status === 'ok' && e.turn === 2))
    assert.equal(view.images[0].writer, 'ai')
    assert.equal(view.images[0].shape, 'portrait')
    assert.equal(view.images[0].characters[0].name, '林岚')
    // NovelAI V4+：Base 进 base_caption（补了人数），角色块进 char_captions（补了固定外貌）；人名一个字都不发。Key 只发给 NovelAI。
    // 立绘也有角色块了：插画按「有角色块、Base 是天台」认（背景也是天台，但没有角色块）
    const cgReq = requests.find(r => r.body?.parameters?.v4_prompt?.caption?.char_captions?.length && /school rooftop/.test(r.body.parameters.v4_prompt.caption.base_caption))
    const caption = cgReq.body.parameters.v4_prompt.caption
    assert.match(caption.base_caption, /^1girl, /)
    assert.match(caption.base_caption, /school rooftop, sunset/)
    assert.match(caption.base_caption, /A school rooftop at sunset where the girl waits\./)
    assert.equal(caption.char_captions.length, 1)
    assert.match(caption.char_captions[0].char_caption, /^girl, long black hair, blue eyes, school uniform, sailor collar, red ribbon, smile/)
    assert.match(caption.char_captions[0].char_caption, /the girl's hair flows/)
    assert.doesNotMatch(JSON.stringify(cgReq.body), /林岚|@/)
    assert.deepEqual([cgReq.body.parameters.width, cgReq.body.parameters.height], [832, 1216])
    assert.equal(view.images[0].versions[0].width, 832)
    assert.equal(cgReq.auth, 'Bearer pst-test-key')
    const config = await engine.publicConfig()
    assert.equal(config.keys['novelai:official'], true)
    assert.equal(JSON.stringify(config).includes('pst-test-key'), false, '密钥不出宿主')

    // 重画：同一张图多一个版本；可切回旧版本。
    await engine.renderCg('g1', view.images[0].id, { tags: '@林岚, crying' })
    const after = await engine.gameView('g1')
    assert.equal(after.images[0].versions.length, 2)
    await engine.selectVersion('g1', view.images[0].id, 0)
    assert.equal((await engine.gameView('g1')).images[0].current, 0)

    // AI 改写：分镜师带着现在的提示词和玩家的意见重写，只回草稿，不动存着的那份。
    const draft = await engine.rewritePrompt('g1', view.images[0].id, '改成雨天')
    assert.equal(draft.characters[0].name, '林岚')
    const rewriteUser = llm.calls.filter(isCgWriter).at(-1).messages[0].content[0].text
    assert.match(rewriteUser, /玩家的修改意见：改成雨天/)
    assert.match(rewriteUser, /现在的提示词：/)
    assert.equal((await engine.gameView('g1')).images[0].writer, 'user')
    // 配一张：指定单元就画那一段，分镜师写好后出图。
    const added = await engine.addImageAt('g1', 2, 'U1', {})
    const withAdded = await settle(engine, 'g1', v => v.images.find(i => i.id === added)?.status === 'ready', 10000)
    assert.equal(withAdded.images.find(i => i.id === added).after, 'U1')
    assert.match(llm.calls.filter(isCgWriter).at(-1).messages[0].content[0].text, /画这一段：「夕阳下的天台。」/)

    // 改写正文后的新版本：旧版本的场景从视图里消失。
    for (const item of tavern.items.values()) item.current = false
    await engine.onTurnSettled({ ...turn, textVersion: 'v-b', text: '“又见面了。”林岚笑了。' })
    const rewritten = await engine.gameView('g1')
    assert.equal(rewritten.turns.length, 1)
    assert.equal(rewritten.turns[0].textVersion, 'v-b')

    await engine.removeGame('g1')
    assert.deepEqual((await engine.gameView('g1')).turns, [])
    engine.dispose()
  } finally {
    await rm(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 })
  }
})

test('gate: 导演输出坏 JSON 时重试一次，再失败则场景标记失败但保留原文单元', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'flowgal-'))
  try {
    const store = createStore(dir)
    const tavern = fakeTavern()
    const llm = fakeLlm('我拒绝')
    const engine = createEngine({ store, services: { tavern, llm }, logger: { warn() {}, info() {} } })
    await engine.onTurnSettled({ gameId: 'g2', turn: 3, textVersion: 'x', text: '“你好。”' })
    assert.equal(llm.calls.length, 2)
    const view = await engine.gameView('g2')
    assert.equal(view.turns[0].status, 'failed')
    assert.equal(view.turns[0].units[0].text, '你好。')
    engine.dispose()
  } finally {
    await rm(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 })
  }
})

async function until(check, ms = 3000) {
  const end = Date.now() + ms
  for (;;) {
    const value = await check()
    if (value) return value
    if (Date.now() > end) throw new Error('等待超时')
    await new Promise(r => setTimeout(r, 5))
  }
}

/** 流式假模型：先思考、吐一半，等放行（或被停止）后吐完。 */
function gatedLlm(reply) {
  const gates = []
  return {
    gates,
    resolveModelInfo: async () => ({ context: { contextWindow: 1000000 }, defaultMaxTokens: 128000 }),
    stream(request) {
      return (async function* () {
        yield { type: 'reasoning-delta', text: '先认说话人。' }
        yield { type: 'text-delta', text: reply.slice(0, 20) }
        await new Promise((resolve, reject) => {
          gates.push(resolve)
          request.signal?.addEventListener('abort', () => reject(request.signal.reason), { once: true })
        })
        yield { type: 'text-delta', text: reply.slice(20) }
        yield { type: 'usage', usage: { inputTokens: 900, outputTokens: 300 } }
        yield { type: 'finish', reason: { kind: 'stop' } }
      })()
    },
  }
}

test('gate: 导演日志：整理中能看到实时输出和思考，整理完留下提示词、原始输出、用量和逐句结果', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'flowgal-'))
  try {
    const store = createStore(dir)
    const tavern = fakeTavern()
    const llm = gatedLlm(DIRECTOR_REPLY)
    const engine = createEngine({ store, services: { tavern, llm }, logger: { warn() {}, info() {} } })
    await engine.patchConfig({ images: { auto: false, backgrounds: false, portraits: false } })
    const settled = engine.onTurnSettled({ gameId: 'g', turn: 1, textVersion: 'v1', text: '夕阳下的天台。\n“你终于来了。”林岚回过头。' })
    const live = await until(async () => (await engine.directorLog('g')).running[0])
    assert.equal(live.status, 'running')
    assert.equal(live.model, 'fake-1')
    assert.equal(live.source, 'tavern')
    await until(async () => (await engine.directorLog('g')).running[0]?.live.output)
    const midway = (await engine.directorLog('g')).running[0]
    // 模型窗口是开始请求前问到的；刚登记那一刻可能还没问完，所以在有输出之后再看。
    assert.equal(midway.window, 1000000)
    assert.equal(midway.live.output, DIRECTOR_REPLY.slice(0, 20))
    assert.equal(midway.live.reasoning, '先认说话人。')
    llm.gates[0]()
    await settled

    const log = await engine.directorLog('g')
    assert.equal(log.running.length, 0)
    assert.equal(log.entries[0].status, 'ok')
    assert.deepEqual(log.entries[0].usage, { inputTokens: 900, outputTokens: 300 })
    assert.equal(log.entries[0].summary, '林岚在天台等我。')
    const { entry } = await engine.directorEntry('g', log.entries[0].id)
    assert.match(entry.system, /后台导演/)
    assert.match(entry.user, /你终于来了/)
    assert.equal(entry.maxTokens, 128000)
    assert.equal(entry.attempts[0].output, DIRECTOR_REPLY)
    assert.equal(entry.attempts[0].reasoning, '先认说话人。')
    assert.equal(entry.script.lines.U2.emo, 'smile')
    assert.equal(entry.units[1].text, '你终于来了。')
    engine.dispose()
  } finally {
    await rm(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 })
  }
})

test('gate: 导演整理到一半可以停止，场景按原文演，日志记为已停止', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'flowgal-'))
  try {
    const store = createStore(dir)
    const tavern = fakeTavern()
    const llm = gatedLlm(DIRECTOR_REPLY)
    const engine = createEngine({ store, services: { tavern, llm }, logger: { warn() {}, info() {} } })
    const settled = engine.onTurnSettled({ gameId: 'g', turn: 2, textVersion: 'v2', text: '“等一下。”' })
    const live = await until(async () => (await engine.directorLog('g')).running[0])
    await until(() => llm.gates.length)
    assert.equal(engine.cancel('g', 'director', live.id), true)
    await settled
    const view = await engine.gameView('g')
    assert.equal(view.turns[0].status, 'failed')
    assert.equal(view.turns[0].error, '已手动停止整理')
    assert.equal(view.turns[0].units[0].text, '等一下。')
    const log = await engine.directorLog('g')
    assert.equal(log.entries[0].status, 'cancelled')
    assert.equal(engine.cancel('g', 'director', live.id), false)
    engine.dispose()
  } finally {
    await rm(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 })
  }
})

/** 反复读对局视图直到 done(view) 成立；超时报错。给了 missing(view)（还没好的各项说明）就把卡住的写进报错。 */
async function settle(engine, gameId, done, ms = 4000, missing) {
  const end = Date.now() + ms
  for (;;) {
    const view = await engine.gameView(gameId)
    if (done(view)) return view
    if (Date.now() > end) throw new Error('等出图超时' + (missing ? `（${ms}ms）：` + missing(view).join('；') : ''))
    await new Promise(r => setTimeout(r, 20))
  }
}

/** 一项东西现在的状态和错误，报超时用。 */
function stateOf(thing) {
  return thing ? (thing.status || '没有状态') + (thing.error ? `（${thing.error}）` : '') : '还没有'
}

test('gate: 存档正被别处读着（Windows 上改名覆盖会被拒）时，写入稍等重试，不丢这一笔', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'flowgal-'))
  try {
    const store = createStore(dir)
    await store.updateGame('g', g => { g.places.a = { status: 'ready' } })
    // 像前端轮询那样把存档开着读，过一会儿才放开。
    const reader = await open(join(dir, 'games', 'g.json'), 'r')
    const release = new Promise(r => setTimeout(r, 100)).then(() => reader.close())
    await store.updateGame('g', g => { g.places.b = { status: 'ready' } })
    await release
    assert.deepEqual(Object.keys((await store.readGame('g')).places), ['a', 'b'])
    assert.deepEqual((await readdir(join(dir, 'games'))).filter(f => f.endsWith('.tmp')), [], '不留临时文件')
  } finally {
    await rm(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 })
  }
})

test('gate: 导演新造的复合情绪进情绪库，按这身衣服和长期状态画差分', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'flowgal-'))
  try {
    const store = createStore(dir)
    const tavern = fakeTavern()
    const reply = JSON.stringify({
      scene: { location: '卧室', time: 'night', weather: 'clear', mood: 'calm' },
      cast: [{ name: '林岚', pos: 'center' }],
      lines: [{ u: 'U1', sp: '林岚', emo: '带着烦躁思考' }, { u: 'U2', sp: '林岚', emo: 'whatever' }],
      emotions: [{ name: '带着烦躁思考', desc: '皱眉撇嘴，手托下巴', base: 'thinking' }],
      people: [{ name: '林岚', gender: 'female', appearance: '1girl, long black hair', outfit: '睡衣', outfitTags: 'pajamas', states: [{ name: '怀孕', tags: 'pregnant, round belly' }] }],
    })
    const llm = fakeLlm(routedReply(reply))
    const requests = []
    const fetchImpl = async (url, init) => { requests.push(JSON.parse(init.body)); return new Response(PNG, { status: 200, headers: { 'content-type': 'image/png' } }) }
    const engine = createEngine({ store, services: { tavern, llm }, fetchImpl, logger: { warn() {}, info() {} } })
    await engine.patchConfig({ images: { auto: false, backgrounds: false } })
    await engine.setSecret('novelai', 'official', 'k')
    await engine.onTurnSettled({ gameId: 'g', turn: 3, textVersion: 'v', text: '“又是这样……”\n“算了。”' })
    const lib = (await engine.emotions()).list
    assert.deepEqual(lib.map(e => [e.id, e.desc, e.base, e.source]), [['带着烦躁思考', '皱眉撇嘴，手托下巴', 'thinking', 'director']])
    const look = { appearance: '1girl, long black hair', outfit: '睡衣', states: [{ name: '怀孕' }] }
    const key = variantKey(look, '带着烦躁思考')
    assert.match(key, /\|睡衣\|怀孕\|带着烦躁思考$/)
    const view = await settle(engine, 'g', v => v.cast[0]?.sprites?.[key]?.assetId && v.cast[0]?.sprites?.[variantKey(look, 'neutral')]?.assetId)
    assert.equal(view.turns[0].script.lines.U1.emo, '带着烦躁思考')
    assert.equal(view.turns[0].script.lines.U2.emo, undefined, '没声明的英文乱词丢掉')
    assert.deepEqual(view.cast[0].states, [{ name: '怀孕', tags: 'pregnant, round belly' }])
    const writer = llm.calls.find(c => c.system.includes('立绘设计师')).messages[0].content[0].text
    assert.match(writer, /睡衣」（pajamas）；长期状态 怀孕（pregnant, round belly）；情绪「带着烦躁思考」：皱眉撇嘴，手托下巴；接近 思考/)
    // 导演下一轮能在情绪库里看到它。
    await engine.onTurnSettled({ gameId: 'g', turn: 4, textVersion: 'v4', text: '“嗯。”' })
    const next = llm.calls.filter(c => !c.system.includes('立绘设计师')).at(-1).messages[0].content[0].text
    assert.match(next, /【情绪库】[\s\S]*- 带着烦躁思考：皱眉撇嘴，手托下巴/)
    engine.dispose()
  } finally {
    await rm(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 })
  }
})

test('gate: 当时没填 Key 错过的插画、背景、立绘差分可以一键补上，补过的不重复', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'flowgal-'))
  try {
    const store = createStore(dir)
    const tavern = fakeTavern()
    const llm = fakeLlm(routedReply(DIRECTOR_REPLY))
    const requests = []
    const fetchImpl = async (url, init) => { requests.push(JSON.parse(init.body)); return new Response(PNG, { status: 200, headers: { 'content-type': 'image/png' } }) }
    const engine = createEngine({ store, services: { tavern, llm }, fetchImpl, logger: { warn() {}, info() {} } })
    // 每轮自动差分上限设成 0，看补图会不会把用到的情绪都补齐；背景关掉，看补图是否跟着设置走。
    await engine.patchConfig({ images: { expressionsPerTurn: 0, backgrounds: false } })
    await engine.onTurnSettled({ gameId: 'g', turn: 1, textVersion: 'v1', text: '夕阳下的天台。\n“你终于来了。”林岚回过头。' })
    let view = await engine.gameView('g')
    assert.equal(view.images.length, 0, '没有 Key 时不出图')
    await assert.rejects(engine.fillMissing('g'), /还没填 Key/)
    await engine.setSecret('novelai', 'official', 'k')
    const counts = await engine.fillMissing('g')
    assert.deepEqual(counts, { cg: 1, bg: 0, sprite: 2, undirected: 0 }, '关掉的背景不补')
    assert.equal((await engine.fillMissing('g', { kinds: ['bg'] })).bg, 1, '点名要补背景时照补')
    const look = { appearance: '1girl, long black hair, blue eyes', outfit: '校服', states: [] }
    view = await settle(engine, 'g', v => v.images[0]?.status === 'ready' && v.places['学园天台|dusk']?.assetId && v.cast[0]?.sprites?.[variantKey(look, 'smile')]?.assetId && v.cast[0]?.sprites?.[variantKey(look, 'neutral')]?.assetId)
    assert.equal(view.images[0].title, '天台的等待')
    assert.deepEqual(await engine.fillMissing('g'), { cg: 0, bg: 0, sprite: 0, undirected: 0 })

    // 重画一张差分：默认让立绘设计师重写词，仍是同一个种子；按玩家改好的词画；上传放进当前这套样子。
    const smile = variantKey(look, 'smile')
    const before = requests.length
    await engine.castAction('g', 'sprite', { name: '林岚', emotion: 'smile' })
    view = await settle(engine, 'g', v => requests.length > before && !v.cast[0].spriteStatus[smile])
    assert.equal(requests.at(-1).parameters.seed, nameSeed('林岚'))
    await engine.castAction('g', 'save', { name: '林岚', patch: { seed: 42 } })
    await engine.castAction('g', 'sprite', { name: '林岚', emotion: 'smile', tags: '1girl, my own tags' })
    view = await settle(engine, 'g', v => v.cast[0].sprites[smile]?.writer === 'user' && !v.cast[0].spriteStatus[smile])
    assert.match(requests.at(-1).parameters.v4_prompt.caption.char_captions[0].char_caption, /my own tags/)
    assert.equal(requests.at(-1).parameters.seed, 42)
    await engine.castAction('g', 'upload', { name: '林岚', emotion: '偷笑', dataUrl: 'data:image/png;base64,' + PNG.toString('base64') })
    view = await engine.gameView('g')
    assert.equal(view.cast[0].sprites[variantKey(look, '偷笑')].uploaded, true)
    engine.dispose()
  } finally {
    await rm(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 })
  }
})

test('gate: 全局角色的外貌也按字段改；只挪格子不改 tag，复制回本局后出图那串和立绘编号不变', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'flowgal-'))
  try {
    const engine = createEngine({ store: createStore(dir), services: {}, logger: { warn() {}, info() {} } })
    await engine.castAction('g', 'save', { name: '林岚', patch: { appearance: '1girl, long black hair, blue eyes' } })
    const before = (await engine.gameView('g')).cast.find(p => p.name === '林岚')
    const key = variantKey(before, 'smile')
    await engine.castAction('g', 'promote', { name: '林岚' })
    await engine.castAction('g', 'global-save', { name: '林岚', patch: { appearanceFields: { sex: '1girl', eyes: 'blue eyes', hair: 'long black hair' } } })
    let lin = (await engine.gameView('g')).cast.find(p => p.name === '林岚')
    assert.equal(lin.global, true)
    assert.equal(lin.appearance, '1girl, long black hair, blue eyes', '只挪了格子：沿用原来那串')
    assert.deepEqual(lin.appearanceFields, { sex: '1girl', hair: 'long black hair', eyes: 'blue eyes' })
    await engine.castAction('g', 'copy-local', { name: '林岚' })
    lin = (await engine.gameView('g')).cast.find(p => p.name === '林岚')
    assert.deepEqual([lin.global, lin.appearance, variantKey(lin, 'smile')], [false, '1girl, long black hair, blue eyes', key])
    assert.deepEqual(lin.appearanceFields, { sex: '1girl', hair: 'long black hair', eyes: 'blue eyes' })
    engine.dispose()
  } finally {
    await rm(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 })
  }
})
