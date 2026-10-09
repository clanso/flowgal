// 用假的 Tavern / llm / 生图服务跑通一整轮：正文 → 场景卡占位 → 导演 → 外貌档案 → CG / 背景 / 立绘 → 挂回正文。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm, access } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createStore } from '../lib/store.js'
import { createEngine, KIND_SCENE, KIND_CG } from '../lib/engine.js'

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
  images: [{ after: 'U2', title: '天台的等待', tags: '1girl, @林岚, smile, looking back, wind, petals', desc: 'a girl looking back on a rooftop at sunset', shape: 'landscape' }],
  people: [{ name: '林岚', gender: 'female', appearance: '1girl, long black hair, blue eyes, school uniform' }],
  summary: '林岚在天台等我。',
})

test('gate: 一整轮的后台整理与出图', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'flowgal-'))
  try {
    const store = createStore(dir)
    const tavern = fakeTavern()
    const llm = fakeLlm(DIRECTOR_REPLY)
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
    await engine.onTurnSettled(turn)
    const scene = [...tavern.items.values()].find(i => i.kind === KIND_SCENE)
    assert.equal(scene.status, 'ready')
    assert.equal(scene.data.location, '学园天台')
    // 等出图队列跑完。
    for (let i = 0; i < 50; i++) {
      const view = await engine.gameView('g1')
      if (view.images[0]?.status === 'ready' && view.places['学园天台|dusk']?.assetId && view.cast[0]?.sprites?.neutral && view.cast[0]?.sprites?.smile) break
      await new Promise(r => setTimeout(r, 20))
    }
    const view = await engine.gameView('g1')
    assert.equal(view.turns.length, 1)
    assert.equal(view.turns[0].script.lines.U2.sp, '林岚')
    const cg = [...tavern.items.values()].find(i => i.kind === KIND_CG)
    assert.equal(cg.status, 'ready')
    assert.equal(cg.anchor, '你终于来了。')
    assert.equal(view.images[0].versions.length, 1)
    assert.ok(view.places['学园天台|dusk'].assetId, '新地点生成背景')
    assert.ok(view.cast[0].sprites.neutral, '首次登场生成立绘')
    assert.ok(view.cast[0].sprites.smile, '表情差分')
    // @林岚 被替换成档案外貌，Key 只发给 NovelAI。
    const cgReq = requests.find(r => r.body?.input?.includes('looking back'))
    assert.match(cgReq.body.input, /long black hair, blue eyes/)
    assert.doesNotMatch(cgReq.body.input, /@/)
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
    await rm(dir, { recursive: true, force: true })
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
    await rm(dir, { recursive: true, force: true })
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
    assert.equal(live.window, 1000000)
    await until(async () => (await engine.directorLog('g')).running[0]?.live.output)
    const midway = (await engine.directorLog('g')).running[0]
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
    await rm(dir, { recursive: true, force: true })
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
    await rm(dir, { recursive: true, force: true })
  }
})

test('gate: 改名后第一次启动把旧数据目录整个搬到新目录，已有新目录时不动旧的', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'flowgal-rename-'))
  try {
    const legacy = join(dir, 'dsh-tavern-igs')
    const root = join(dir, 'flowgal')
    const old = createStore(legacy)
    await old.updateConfig(c => { c.ui = { skin: 'ink' } })
    await old.updateGame('g1', g => { g.scenes.v1 = { turn: 1, textVersion: 'v1', units: [] } })

    const store = createStore(root, { legacy })
    assert.equal((await store.readConfig()).ui.skin, 'ink')
    assert.ok((await store.readGame('g1')).scenes.v1)
    await assert.rejects(access(legacy), '旧目录已经搬走')

    // 新目录已经在用：再出现旧目录也不合并、不覆盖。
    const again = createStore(legacy)
    await again.updateConfig(c => { c.ui = { skin: 'noir' } })
    const reopened = createStore(root, { legacy })
    assert.equal((await reopened.readConfig()).ui.skin, 'ink')
    await access(legacy)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})
