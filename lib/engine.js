// 每轮流程编排：
//   正文写完（Tavern 已流式显示给玩家）→ 切单元、挂「场景卡」占位 → 后台导演整理 →
//   更新外貌档案 → 插画 / 背景 / 立绘排队生成 → 挂回正文、剧场里实时出现。
import { randomUUID } from 'node:crypto'
import { segmentTurn, anchorFor } from './segment.js'
import { direct, callModel, extractJson } from './director.js'
import { REWRITE_SYSTEM, REWRITE_USER, fill } from './prompts.js'
import { applyPeople, castListAt, effectivePerson, allNames, expandMentions, editPerson, rollback, nameColor } from './cast.js'
import { composePrompt, sizeFor, BUILTIN_ARTISTS } from './image/style.js'
import { NAI_MODELS, NAI_SAMPLERS, NAI_NOISE_SCHEDULES } from './image/nai-models.js'
import { generateImage, createQueue, secretRef, backendNeedsKey } from './image/index.js'
import { comfyModels, comfyStats } from './image/comfyui.js'
import { openaiModels } from './image/openai.js'
import { webuiModels } from './image/webui.js'
import { resolveConfig, applyPatch } from './config.js'
import { createSecrets } from './secrets.js'
import { EMOTIONS, placeKey } from './vocab.js'

export const PLUGIN = 'flowgal'
/**
 * 在 Tavern 里的插件身份（改名前的名字）。Tavern 按它记录每张场景卡、插画卡归谁，只让归属插件列出和修改；
 * 改名前挂的卡都记在这个名字下，跟着改的话旧对局在剧场里就看不到了。
 */
export const OWNER = 'dsh-tavern-igs'
export const KIND_SCENE = OWNER + '/scene'
export const KIND_CG = OWNER + '/cg'

const shortError = error => String(error?.message || error || '未知错误').slice(0, 300)

// 导演日志：每局保留最近这么多次；每段提示词 / 输出最多存这么多字。
const DIRECTOR_LOG_KEEP = 30
const DIRECTOR_LOG_TEXT = 200000
const capText = text => {
  const s = String(text || '')
  return s.length > DIRECTOR_LOG_TEXT ? s.slice(0, DIRECTOR_LOG_TEXT) + `\n…（日志只保留前 ${DIRECTOR_LOG_TEXT} 字，原文共 ${s.length} 字）` : s
}
/** 各次尝试的用量加总（只加数字字段，字段名照 DSH 给的）。 */
function sumUsage(attempts) {
  const total = {}
  for (const a of attempts) for (const [k, v] of Object.entries(a.usage || {})) if (Number.isFinite(v)) total[k] = (total[k] || 0) + v
  return Object.keys(total).length ? total : null
}
/** 导演日志的长轮询频道与对局视图分开：流式输出刷得勤，不该让整局视图跟着重读。 */
export const directorChannel = gameId => 'director:' + gameId

export function createEngine({ store, services, logger = console, fetchImpl = fetch }) {
  const log = (level, msg) => { try { logger[level]?.(`[${PLUGIN}] ${msg}`) } catch {} }
  const secrets = createSecrets({ store, getCredentials: () => services.credentials })
  let configCache = null
  const directing = new Map() // textVersion → Promise
  const directorRuns = new Map() // textVersion → 正在跑的导演（日志实时输出、可停止）
  const listeners = new Set()
  const queue = createQueue({ concurrency: () => configCache?.images?.concurrency || 1, onChange: () => notify('queue') })

  function notify(gameId) { for (const fn of listeners) { try { fn(gameId) } catch {} } }

  async function config() {
    if (!configCache) configCache = resolveConfig(await store.readConfig())
    return configCache
  }

  function tavern() {
    const t = services.tavern
    if (!t || typeof t.attach !== 'function') throw new Error('当前 Tavern 没有插件接口（需要 DSH Tavern 2.5 以上）')
    return t
  }

  async function pickModel(gameId, cfg) {
    if (cfg.director.provider && cfg.director.model) return { provider: cfg.director.provider, model: cfg.director.model, source: 'plugin' }
    const bg = await services.tavern?.backgroundModel?.({ gameId }).catch?.(() => null)
    return bg ? { ...bg, source: 'tavern' } : {}
  }

  // ───────────────────────── 场景 ─────────────────────────

  async function previousScript(game, turn) {
    let best = null
    for (const s of Object.values(game.scenes || {})) {
      if (s.script && s.turn < turn && (!best || s.turn > best.turn || (s.turn === best.turn && s.at > best.at))) best = s
    }
    return best?.script || null
  }

  /** 登记一轮正文：先存单元（前台先文本），挂场景卡占位。 */
  async function registerTurn(turnInfo, { attachCard = true, status = 'directing' } = {}) {
    const { gameId, turn, textVersion, text } = turnInfo
    const units = segmentTurn(text)
    let mediaId = null
    const game = await store.readGame(gameId)
    const existing = game.scenes?.[textVersion]
    if (existing?.mediaId) mediaId = existing.mediaId
    else if (attachCard) {
      try {
        const res = await tavern().attach({ gameId, turn, textVersion, item: { kind: KIND_SCENE, status: status === 'raw' ? 'ready' : 'pending', data: { turn } } })
        mediaId = res?.id || null
      } catch (error) { log('warn', '挂场景卡失败：' + shortError(error)) }
    }
    await store.updateGame(gameId, g => {
      g.scenes[textVersion] = { ...(g.scenes[textVersion] || {}), turn, textVersion, units, mediaId, at: Date.now(), status: g.scenes[textVersion]?.script ? 'ready' : status, card: turnInfo.card || null }
    })
    notify(gameId)
    return { units, mediaId }
  }

  async function runDirector(turnInfo, { force = false } = {}) {
    const { gameId, turn, textVersion } = turnInfo
    if (directing.has(textVersion)) return directing.get(textVersion)
    const job = (async () => {
      const cfg = await config()
      const { units, mediaId } = await registerTurn(turnInfo)
      let game = await store.readGame(gameId)
      if (game.scenes[textVersion]?.script && !force) return game.scenes[textVersion]
      const globalCast = await store.readGlobalCast()
      const { provider, model, source } = await pickModel(gameId, cfg)
      let context = null
      try { context = await services.tavern?.getCardContext?.({ gameId, turn }) } catch {}
      const run = { id: randomUUID().replace(/-/g, '').slice(0, 12), gameId, turn, textVersion, at: Date.now(), reason: force ? 'force' : 'auto', source: source || '', trace: { provider, model }, controller: new AbortController() }
      directorRuns.set(textVersion, run)
      // 流式输出时最多每 250ms 推一次日志面板，最后一段不会漏。
      let pushTimer = null
      const progress = () => { if (!pushTimer) pushTimer = setTimeout(() => { pushTimer = null; notify(directorChannel(gameId)) }, 250) }
      notify(directorChannel(gameId))
      let script = null, failure = null
      try {
        ;({ script } = await direct({
          llm: services.llm, provider, model, units,
          previous: await previousScript(game, turn),
          castList: castListAt(game, globalCast, turn),
          context, config: cfg, backend: cfg.images.backend, music: (await store.readMusic()).tracks,
          signal: run.controller.signal, trace: run.trace, onProgress: progress,
        }))
      } catch (error) { failure = run.controller.signal.aborted ? new Error('已手动停止整理') : error }
      clearTimeout(pushTimer)
      directorRuns.delete(textVersion)
      await saveDirectorLog(run, { script, error: failure }).catch(error => log('warn', '写导演日志失败：' + shortError(error)))
      notify(directorChannel(gameId))
      try {
        if (failure) throw failure
        await store.updateGame(gameId, g => {
          applyPeople(g, globalCast, script.people, turn)
          const scene = g.scenes[textVersion]
          scene.script = script
          scene.status = 'ready'
          scene.error = ''
          scene.summary = script.summary
        })
        if (mediaId) await tavern().update(mediaId, { status: 'ready', data: { turn, summary: script.summary, location: script.scene.location, time: script.scene.time, weather: script.scene.weather, mood: script.scene.mood, cast: script.cast.map(c => c.name), choices: script.choices.length } }).catch(() => {})
        notify(gameId)
        // 出图不阻塞场景就绪。
        planImages(gameId, textVersion).catch(error => log('warn', '排图失败：' + shortError(error)))
        return (await store.readGame(gameId)).scenes[textVersion]
      } catch (error) {
        log('warn', `导演失败（第 ${turn} 轮）：${shortError(error)}`)
        await store.updateGame(gameId, g => { const s = g.scenes[textVersion]; if (s) { s.status = s.script ? 'ready' : 'failed'; s.error = shortError(error) } })
        if (mediaId) await tavern().update(mediaId, { status: 'ready', data: { turn, error: shortError(error) } }).catch(() => {})
        notify(gameId)
        throw error
      }
    })()
    directing.set(textVersion, job)
    try { return await job } finally { directing.delete(textVersion) }
  }

  // ───────────────────────── 导演日志 ─────────────────────────

  async function saveDirectorLog(run, { script, error }) {
    const t = run.trace
    const entry = {
      id: run.id, turn: run.turn, textVersion: run.textVersion, at: run.at, ms: Date.now() - run.at, reason: run.reason, source: run.source,
      status: error ? (run.controller.signal.aborted ? 'cancelled' : 'failed') : 'ok', error: error ? shortError(error) : '',
      provider: t.provider || '', model: t.model || '', window: t.window || 0, outputDefault: t.outputDefault || 0,
      maxTokens: t.maxTokens || 0, temperature: t.temperature ?? null, contextLength: t.contextLength || 0, contextChars: t.contextChars || 0, notes: t.notes || [],
      system: capText(t.system), user: capText(t.user),
      attempts: (t.attempts || []).map(a => ({ ...a, output: capText(a.output), reasoning: capText(a.reasoning) })),
      script,
    }
    await store.updateDirectorLog(run.gameId, log => {
      log.entries = [...(log.entries || []), entry].slice(-DIRECTOR_LOG_KEEP)
    })
  }

  /** 列表用的摘要：不带提示词和完整输出（点开再取）。跑着的那次带上当前输出的末尾，面板里实时滚动。 */
  function logSummary(e, running) {
    const attempts = e.attempts || e.trace?.attempts || []
    const t = e.trace || e
    const last = attempts.at(-1)
    return {
      id: e.id, turn: e.turn, at: e.at, ms: running ? Date.now() - e.at : e.ms, reason: e.reason, source: e.source,
      status: running ? 'running' : e.status, error: e.error || '',
      provider: t.provider || '', model: t.model || '', maxTokens: t.maxTokens || 0, window: t.window || 0, notes: t.notes || [],
      attempts: attempts.length, usage: sumUsage(attempts), summary: e.script?.summary || '',
      ...(running ? { live: { output: (last?.output || '').slice(-20000), reasoning: (last?.reasoning || '').slice(-8000), chars: last?.output.length || 0, note: last?.note || '' } } : {}),
    }
  }

  async function directorLog(gameId) {
    const running = [...directorRuns.values()].filter(r => r.gameId === gameId).map(r => logSummary(r, true))
    const { entries = [] } = await store.readDirectorLog(gameId)
    return { running, entries: entries.slice().reverse().map(e => logSummary(e, false)), keep: DIRECTOR_LOG_KEEP }
  }

  /** 一次导演的完整记录：发出去的提示词、每次尝试的原始输出 / 思考 / 用量 / 错误、解析后的脚本，以及这一轮的正文单元。 */
  async function directorEntry(gameId, id) {
    const run = [...directorRuns.values()].find(r => r.gameId === gameId && r.id === id)
    const entry = run
      ? { ...logSummary(run, true), ...run.trace, attempts: run.trace.attempts || [], script: null }
      : ((await store.readDirectorLog(gameId)).entries || []).find(e => e.id === id)
    if (!entry) throw new Error('这条导演日志已经不在了')
    const scene = (await store.readGame(gameId)).scenes?.[entry.textVersion || run?.textVersion]
    return { entry: { ...entry, units: scene?.units || [] } }
  }

  function stopDirector(gameId, id) {
    const run = [...directorRuns.values()].find(r => r.gameId === gameId && r.id === id)
    if (!run) return false
    run.controller.abort()
    return true
  }

  async function onTurnSettled(turnInfo) {
    const cfg = await config()
    if (!cfg.enabled) return
    if (!cfg.director.auto) { await registerTurn(turnInfo, { status: 'raw' }); return }
    await runDirector(turnInfo).catch(() => {})
  }

  /** 手动：开场白（不触发 onTurnSettled）、或者重新整理某一轮。 */
  async function directTurn({ gameId, turn, force = false }) {
    const info = await tavern().getTurn({ gameId, turn: Number(turn) })
    if (!info) throw new Error('这一轮还没写完或不存在')
    return runDirector(info, { force })
  }

  // ───────────────────────── 图片 ─────────────────────────

  async function backendReady(cfg) {
    const backend = cfg.images.backend
    const key = await secrets.get(secretRef(backend, cfg))
    if (backendNeedsKey(backend, cfg) && !key) return { ok: false, key, reason: '生图渠道还没填 Key' }
    if (backend === 'comfyui' && cfg.comfyui.mode !== 'workflow' && !cfg.comfyui.checkpoint) return { ok: false, key, reason: 'ComfyUI 还没选底模' }
    return { ok: true, key }
  }

  async function planImages(gameId, textVersion, { manual = false } = {}) {
    const cfg = await config()
    const ready = await backendReady(cfg)
    if (!ready.ok) { log('info', '跳过出图：' + ready.reason); return { queued: 0, reason: ready.reason } }
    const game = await store.readGame(gameId)
    const scene = game.scenes[textVersion]
    const script = scene?.script
    if (!script) return { queued: 0, reason: '场景还没整理好' }
    let queued = 0
    if (cfg.images.auto || manual) {
      for (const plan of script.images) {
        const already = Object.values(game.images || {}).some(i => i.textVersion === textVersion && i.after === plan.after && i.tags === plan.tags)
        if (already && !manual) continue
        await createCg(gameId, scene, plan)
        queued++
      }
    }
    if (cfg.images.backgrounds && script.scene.bg) {
      const key = placeKey(script.scene)
      const place = game.places?.[key]
      if (!place?.assetId && place?.status !== 'running') { ensurePlace(gameId, key, script.scene).catch(() => {}); queued++ }
    }
    const globalCast = await store.readGlobalCast()
    if (cfg.images.portraits) {
      for (const member of script.cast) {
        const person = effectivePerson(game, globalCast, member.name, scene.turn)
        if (person?.appearance && !person.sprites?.neutral) { ensureSprite(gameId, member.name, 'neutral').catch(() => {}); queued++ }
      }
    }
    if (cfg.images.expressions) {
      let budget = cfg.images.expressionsPerTurn
      const onStage = new Set(script.cast.map(c => c.name))
      for (const line of Object.values(script.lines)) {
        if (budget <= 0) break
        if (!line.sp || !line.emo || line.emo === 'neutral' || !onStage.has(line.sp)) continue
        const person = effectivePerson(game, globalCast, line.sp, scene.turn)
        if (person?.appearance && !person.sprites?.[line.emo] && !queue.has(`sprite:${gameId}:${line.sp}:${line.emo}`)) {
          ensureSprite(gameId, line.sp, line.emo).catch(() => {}); budget--; queued++
        }
      }
    }
    return { queued }
  }

  async function createCg(gameId, scene, plan) {
    const id = randomUUID().slice(0, 12)
    const anchor = anchorFor(scene.units, plan.after)
    let mediaId = null
    try {
      const res = await tavern().attach({ gameId, turn: scene.turn, textVersion: scene.textVersion, item: { kind: KIND_CG, status: 'pending', anchor, caption: plan.title || '', data: { imageId: id, shape: plan.shape || 'landscape' } } })
      mediaId = res?.id || null
    } catch (error) { log('warn', '挂插画占位失败：' + shortError(error)) }
    await store.updateGame(gameId, g => {
      g.images[id] = { id, kind: 'cg', turn: scene.turn, textVersion: scene.textVersion, mediaId, after: plan.after, anchor, title: plan.title, tags: plan.tags, desc: plan.desc, shape: plan.shape, versions: [], current: -1, status: 'queued', error: '', at: Date.now() }
    })
    notify(gameId)
    renderCg(gameId, id).catch(() => {})
    return id
  }

  /** 生成（或重画）一张 CG。overrides 可改 tags / desc / negativeExtra / shape / seed。 */
  async function renderCg(gameId, imageId, overrides = {}) {
    const cfg = await config()
    const ready = await backendReady(cfg)
    const jobId = `cg:${gameId}:${imageId}`
    const setStatus = (status, extra = {}) => store.updateGame(gameId, g => { const img = g.images[imageId]; if (img) Object.assign(img, { status, ...extra }) }).then(() => notify(gameId))
    let image = (await store.readGame(gameId)).images[imageId]
    if (!image) throw new Error('找不到这张图')
    if (!ready.ok) { await setStatus('failed', { error: ready.reason }); await syncMedia(image, 'failed', ready.reason); throw new Error(ready.reason) }
    const fields = ['tags', 'desc', 'negativeExtra', 'shape']
    const changed = {}
    for (const f of fields) if (typeof overrides[f] === 'string') changed[f] = overrides[f].slice(0, 2000)
    await setStatus('queued', { error: '', ...changed })
    image = { ...image, ...changed }
    await syncMedia(image, 'pending')
    try {
      const result = await queue.enqueue(jobId, async signal => {
        await setStatus('running')
        const game = await store.readGame(gameId)
        const globalCast = await store.readGlobalCast()
        const names = allNames(game, globalCast)
        const { text } = expandMentions(image.tags, n => effectivePerson(game, globalCast, n, image.turn), names)
        const sceneScript = game.scenes[image.textVersion]?.script
        const prompt = composePrompt({ kind: 'cg', tags: text, desc: image.desc, backend: cfg.images.backend, config: cfg, scene: sceneScript?.scene, extraNegative: image.negativeExtra })
        const { width, height } = sizeFor(cfg, image.shape)
        const seed = Number.isInteger(overrides.seed) ? overrides.seed : undefined
        const out = await generateImage({ backend: cfg.images.backend, config: cfg, key: ready.key, signal, fetchImpl, prompt: prompt.positive, negative: prompt.negative, width, height, seed })
        const assetId = await store.saveAsset(out.bytes, out.mediaType)
        return { assetId, seed: out.seed, model: out.model || '', backend: out.backend, positive: prompt.positive, negative: prompt.negative, width, height, at: Date.now() }
      }, { onRetry: (error, n) => log('info', `限流重试 ${n}：${shortError(error)}`) })
      let latest
      await store.updateGame(gameId, g => {
        const img = g.images[imageId]
        if (!img) return
        img.versions.push(result)
        if (img.versions.length > 12) { const [old] = img.versions.splice(0, 1); store.removeAsset(old.assetId).catch(() => {}) }
        img.current = img.versions.length - 1
        img.status = 'ready'
        img.error = ''
        latest = img
      })
      if (latest) await syncMedia(latest, 'ready')
      notify(gameId)
      return result
    } catch (error) {
      const aborted = error?.code === 'aborted'
      await setStatus(aborted ? 'cancelled' : 'failed', { error: aborted ? '已取消' : shortError(error) })
      const img = (await store.readGame(gameId)).images[imageId]
      if (img) await syncMedia(img, img.versions.length ? 'ready' : aborted ? 'failed' : 'failed', aborted ? '已取消' : shortError(error))
      throw error
    }
  }

  async function syncMedia(image, status, error = '') {
    if (!image?.mediaId) return
    try {
      await tavern().update(image.mediaId, { status, caption: image.title || '', ...(error ? { error: error.slice(0, 200) } : {}), data: { imageId: image.id, v: image.versions?.length || 0, current: image.current, assetId: image.versions?.[image.current]?.assetId || '', shape: image.shape || 'landscape' } })
    } catch (e) { log('warn', '更新插画状态失败：' + shortError(e)) }
  }

  async function ensurePlace(gameId, key, scene, { force = false } = {}) {
    const cfg = await config()
    const ready = await backendReady(cfg)
    if (!ready.ok) throw new Error(ready.reason)
    const jobId = `bg:${gameId}:${key}`
    await store.updateGame(gameId, g => { g.places[key] = { ...(g.places[key] || {}), key, location: scene.location, time: scene.time, weather: scene.weather, bg: scene.bg || g.places[key]?.bg || '', status: 'queued', error: '' } })
    notify(gameId)
    try {
      const out = await queue.enqueue(jobId, async signal => {
        const place = (await store.readGame(gameId)).places[key]
        const prompt = composePrompt({ kind: 'bg', tags: place.bg || place.location, backend: cfg.images.backend, config: cfg, scene: place })
        const { width, height } = sizeFor(cfg, 'landscape')
        const res = await generateImage({ backend: cfg.images.backend, config: cfg, key: ready.key, signal, fetchImpl, prompt: prompt.positive, negative: prompt.negative, width, height })
        return { assetId: await store.saveAsset(res.bytes, res.mediaType), prompt: prompt.positive }
      })
      await store.updateGame(gameId, g => {
        const old = g.places[key]?.assetId
        if (old && force) store.removeAsset(old).catch(() => {})
        g.places[key] = { ...g.places[key], assetId: out.assetId, prompt: out.prompt, status: 'ready', error: '' }
      })
    } catch (error) {
      await store.updateGame(gameId, g => { if (g.places[key]) Object.assign(g.places[key], { status: 'failed', error: shortError(error) }) })
    }
    notify(gameId)
  }

  async function ensureSprite(gameId, name, emotion = 'neutral') {
    const cfg = await config()
    const ready = await backendReady(cfg)
    if (!ready.ok) throw new Error(ready.reason)
    const emo = EMOTIONS[emotion] ? emotion : 'neutral'
    const jobId = `sprite:${gameId}:${name}:${emo}`
    const mark = (status, error = '') => store.updateGame(gameId, g => {
      const p = g.cast[name]
      if (p) { p.spriteStatus = { ...(p.spriteStatus || {}), [emo]: status === 'ready' ? undefined : { status, error } } }
    }).then(() => notify(gameId))
    await mark('queued')
    try {
      const assetId = await queue.enqueue(jobId, async signal => {
        await mark('running')
        const game = await store.readGame(gameId)
        const person = effectivePerson(game, await store.readGlobalCast(), name)
        if (!person?.appearance) throw new Error(`${name} 还没有外貌档案`)
        const prompt = composePrompt({ kind: 'sprite', person, emotion: emo, backend: cfg.images.backend, config: cfg })
        const { width, height } = sizeFor(cfg, 'portrait')
        const res = await generateImage({ backend: cfg.images.backend, config: cfg, key: ready.key, signal, fetchImpl, prompt: prompt.positive, negative: prompt.negative, width, height, transparent: cfg.images.transparentSprites })
        return store.saveAsset(res.bytes, res.mediaType)
      })
      await store.updateGame(gameId, g => {
        if (!g.cast[name]) {
          // 全局角色：立绘存在本局覆盖层，不改冻结的全局档案。
          g.spriteOverrides = g.spriteOverrides || {}
          g.spriteOverrides[name] = { ...(g.spriteOverrides[name] || {}), [emo]: assetId }
          return
        }
        const p = g.cast[name]
        p.sprites = { ...(p.sprites || {}), [emo]: assetId }
        if (p.spriteStatus) delete p.spriteStatus[emo]
      })
      notify(gameId)
      return assetId
    } catch (error) {
      await mark(error?.code === 'aborted' ? 'cancelled' : 'failed', shortError(error))
      throw error
    }
  }

  // ───────────────────────── 给浏览器的视图 ─────────────────────────

  async function gameView(gameId) {
    const game = await store.readGame(gameId)
    const globalCast = await store.readGlobalCast()
    let items = []
    try { items = await tavern().list({ gameId }) } catch (error) { log('warn', 'list 失败：' + shortError(error)) }
    const current = new Set(items.filter(i => i.current).map(i => i.id))
    const turns = []
    for (const scene of Object.values(game.scenes || {})) {
      if (scene.mediaId && !current.has(scene.mediaId)) continue
      if (!scene.mediaId) {
        // 没挂卡的轮次（手动关闭自动导演）：同一轮只保留最新的一份。
        const newer = Object.values(game.scenes).some(s => s.turn === scene.turn && s.at > scene.at)
        if (newer) continue
      }
      turns.push({ turn: scene.turn, textVersion: scene.textVersion, status: scene.status, error: scene.error || '', units: scene.units, script: scene.script || null })
    }
    turns.sort((a, b) => a.turn - b.turn)
    const latest = Object.values(game.scenes || {}).sort((a, b) => b.at - a.at)[0]
    const images = Object.values(game.images || {})
      .filter(i => !i.mediaId || current.has(i.mediaId))
      .map(i => ({ id: i.id, turn: i.turn, textVersion: i.textVersion, after: i.after, title: i.title, tags: i.tags, desc: i.desc, shape: i.shape, negativeExtra: i.negativeExtra || '', status: queue.has(`cg:${gameId}:${i.id}`) ? (i.status === 'queued' ? 'queued' : 'running') : i.status, error: i.error, current: i.current, versions: i.versions.map(v => ({ assetId: v.assetId, seed: v.seed, model: v.model, backend: v.backend, positive: v.positive, negative: v.negative, at: v.at })) }))
    const names = allNames(game, globalCast)
    const cast = names.map(n => {
      const p = effectivePerson(game, globalCast, n)
      const overrides = game.spriteOverrides?.[n] || {}
      const local = game.cast?.[n]
      return { ...p, sprites: { ...p.sprites, ...overrides }, spriteStatus: local?.spriteStatus || {}, versions: local?.versions || [], createdTurn: local?.createdTurn ?? null }
    })
    return {
      gameId,
      card: latest?.card || null,
      turns,
      images,
      cast,
      castLog: (game.castLog || []).map((e, index) => ({ ...e, index })).slice(-60).reverse(),
      places: game.places || {},
      queue: queue.state(),
    }
  }

  // ───────────────────────── 操作 ─────────────────────────

  async function rewritePrompt(gameId, imageId, instruction) {
    const cfg = await config()
    const game = await store.readGame(gameId)
    const image = game.images[imageId]
    if (!image) throw new Error('找不到这张图')
    const scene = game.scenes[image.textVersion]
    const at = scene?.units?.findIndex(u => u.id === image.after) ?? -1
    const source = (scene?.units || []).slice(Math.max(0, at - 4), at + 2).map(u => u.text).join('\n')
    const { provider, model } = await pickModel(gameId, cfg)
    const res = await callModel(services.llm, {
      provider, model, maxTokens: 2000, temperature: 0.6,
      system: REWRITE_SYSTEM,
      user: fill(REWRITE_USER, { source: source || '（无）', tags: image.tags, instruction: String(instruction || '重新读一遍原文，把画面写得更准确').slice(0, 1000) }),
    })
    const json = extractJson(res.text)
    return { tags: String(json.tags || image.tags).slice(0, 1500), desc: String(json.desc || image.desc || '').slice(0, 600), negativeExtra: String(json.negative || '').slice(0, 500) }
  }

  async function replanTurn(gameId, turn) {
    const info = await tavern().getTurn({ gameId, turn: Number(turn) })
    if (!info) throw new Error('这一轮不存在')
    const scene = await runDirector(info, { force: true })
    return planImages(gameId, scene.textVersion, { manual: true })
  }

  async function selectVersion(gameId, imageId, index) {
    let image
    await store.updateGame(gameId, g => {
      const img = g.images[imageId]
      if (!img || !img.versions[index]) throw new Error('没有这个版本')
      img.current = index
      image = img
    })
    await syncMedia(image, 'ready')
    notify(gameId)
  }

  async function deleteImage(gameId, imageId) {
    let image
    await store.updateGame(gameId, g => { image = g.images[imageId]; delete g.images[imageId] })
    if (!image) return
    queue.cancel(`cg:${gameId}:${imageId}`)
    for (const v of image.versions || []) await store.removeAsset(v.assetId)
    if (image.mediaId) await tavern().remove(image.mediaId).catch(() => {})
    notify(gameId)
  }

  async function addImageAt(gameId, turn, after, plan = {}) {
    const game = await store.readGame(gameId)
    const scene = Object.values(game.scenes).filter(s => s.turn === Number(turn)).sort((a, b) => b.at - a.at)[0]
    if (!scene) throw new Error('这一轮还没有场景')
    const unit = scene.units.find(u => u.id === after) || scene.units[scene.units.length - 1]
    let tags = plan.tags
    if (!tags) {
      const draft = await rewriteFromText(gameId, unit.text)
      tags = draft.tags
      plan.desc = plan.desc || draft.desc
    }
    return createCg(gameId, scene, { after: unit.id, title: plan.title || '', tags, desc: plan.desc || '', shape: plan.shape || 'landscape' })
  }

  async function rewriteFromText(gameId, text) {
    const cfg = await config()
    const { provider, model } = await pickModel(gameId, cfg)
    const res = await callModel(services.llm, { provider, model, maxTokens: 1500, temperature: 0.6, system: REWRITE_SYSTEM, user: fill(REWRITE_USER, { source: text, tags: '（空）', instruction: '为这段文字写一张插画的 tag，人物用 @名字' }) })
    const json = extractJson(res.text)
    return { tags: String(json.tags || '').slice(0, 1500), desc: String(json.desc || '').slice(0, 600) }
  }

  async function saveUpload(gameId, name, emotion, dataUrl) {
    const m = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl || ''))
    if (!m) throw new Error('只支持 PNG / JPEG / WebP 图片')
    const bytes = new Uint8Array(Buffer.from(m[2], 'base64'))
    if (bytes.byteLength > 12 * 1024 * 1024) throw new Error('图片超过 12MB')
    const assetId = await store.saveAsset(bytes, m[1])
    const emo = EMOTIONS[emotion] ? emotion : 'neutral'
    await store.updateGame(gameId, g => {
      if (!g.cast[name]) editPerson(g, name, {})
      const p = g.cast[name]
      p.sprites = { ...(p.sprites || {}), [emo]: assetId }
      p.uploaded = { ...(p.uploaded || {}), [emo]: true }
    })
    notify(gameId)
    return assetId
  }

  async function castAction(gameId, action, input) {
    const name = String(input?.name || '').trim().slice(0, 24)
    if (!name && action !== 'rollback') throw new Error('缺少人物名')
    switch (action) {
      case 'save':
        await store.updateGame(gameId, g => { editPerson(g, name, input.patch || {}, Number(input.turn) || 0) })
        break
      case 'rollback':
        await store.updateGame(gameId, g => { rollback(g, Number(input.index)) })
        break
      case 'delete':
        await store.updateGame(gameId, g => { delete g.cast[name] })
        break
      case 'promote': {
        // 提升为全局：冻结档案，所有对局共用；AI 不再修改它。
        const game = await store.readGame(gameId)
        const person = effectivePerson(game, await store.readGlobalCast(), name)
        if (!person) throw new Error('没有这个人物')
        await store.updateGlobalCast(gc => { gc.cast[name] = { name, gender: person.gender, tags: person.appearance, sprites: person.sprites, color: person.color || nameColor(name) } })
        await store.updateGame(gameId, g => { delete g.cast[name] })
        break
      }
      case 'unglobal':
        await store.updateGlobalCast(gc => { delete gc.cast[name] })
        break
      case 'copy-local': {
        // 某局想让全局角色长得不一样：复制回本局即可覆盖。
        const gc = await store.readGlobalCast()
        const g0 = gc.cast[name]
        if (!g0) throw new Error('全局库里没有这个人物')
        await store.updateGame(gameId, g => { editPerson(g, name, { appearance: g0.tags, gender: g0.gender }); g.cast[name].sprites = { ...(g0.sprites || {}) } })
        break
      }
      case 'global-save':
        await store.updateGlobalCast(gc => { const p = gc.cast[name] || (gc.cast[name] = { name, sprites: {}, color: nameColor(name) }); if (typeof input.patch?.appearance === 'string') p.tags = input.patch.appearance; if (typeof input.patch?.gender === 'string') p.gender = input.patch.gender })
        break
      case 'sprite':
        ensureSprite(gameId, name, input.emotion || 'neutral').catch(() => {})
        break
      case 'upload':
        await saveUpload(gameId, name, input.emotion, input.dataUrl)
        break
      default:
        throw new Error('未知操作')
    }
    notify(gameId)
    return { ok: true }
  }

  // ───────────────────────── 设置 ─────────────────────────

  async function publicConfig() {
    const cfg = await config()
    const keys = {}
    for (const backend of ['novelai', 'comfyui', 'openai', 'webui']) {
      if (backend === 'novelai') {
        for (const e of cfg.novelai.endpoints) keys['novelai:' + e.id] = await secrets.has(secretRef('novelai', { novelai: { endpoint: e.id } }))
      } else keys[backend] = await secrets.has(secretRef(backend, cfg))
    }
    const ready = await backendReady(cfg)
    const presets = { artists: BUILTIN_ARTISTS }
    return { config: cfg, keys, ready: ready.ok, readyReason: ready.reason || '', secretStorage: secrets.storage(), presets }
  }

  async function patchConfig(patch) {
    const next = await store.updateConfig(saved => {
      const merged = applyPatch(saved, patch)
      for (const k of Object.keys(saved)) delete saved[k]
      Object.assign(saved, merged)
    })
    configCache = resolveConfig(next)
    return publicConfig()
  }

  async function setSecret(backend, endpoint, value) {
    if (!['novelai', 'comfyui', 'openai', 'webui'].includes(backend)) throw new Error('未知渠道')
    const cfg = await config()
    const ref = backend === 'novelai' ? secretRef('novelai', { novelai: { endpoint: endpoint || cfg.novelai.endpoint } }) : secretRef(backend, cfg)
    await secrets.set(ref, value)
    return publicConfig()
  }

  async function testBackend() {
    const cfg = await config()
    const backend = cfg.images.backend
    const key = await secrets.get(secretRef(backend, cfg))
    if (backend === 'comfyui') {
      const stats = await comfyStats(cfg.comfyui, key, fetchImpl)
      return { ok: true, message: `在线 ${stats.version} ${stats.device} ${stats.vram}`.trim() }
    }
    if (backend === 'webui') {
      const res = await fetchImpl(cfg.webui.baseURL.replace(/\/+$/, '') + '/sdapi/v1/options', { signal: AbortSignal.timeout(5000) })
      return { ok: res.ok, message: res.ok ? '在线' : 'HTTP ' + res.status }
    }
    if (backend === 'novelai') {
      const endpoint = cfg.novelai.endpoints.find(e => e.id === cfg.novelai.endpoint)
      if (!key) return { ok: false, message: '还没填 Key' }
      if (endpoint.id !== 'official') return { ok: true, message: '第三方站点不提供只读校验，已填写 Key；实际出图时才能确认' }
      const res = await fetchImpl('https://api.novelai.net/user/subscription', { headers: { authorization: 'Bearer ' + key }, signal: AbortSignal.timeout(6000) })
      if (!res.ok) return { ok: false, message: 'Key 校验失败：HTTP ' + res.status }
      const sub = await res.json().catch(() => ({}))
      return { ok: true, message: `Key 有效${sub?.trainingStepsLeft ? `，剩余 Anlas ${(sub.trainingStepsLeft.fixedTrainingStepsLeft || 0) + (sub.trainingStepsLeft.purchasedTrainingSteps || 0)}` : ''}` }
    }
    const res = await fetchImpl(cfg.openai.baseURL.replace(/\/+$/, '') + '/models', { headers: key ? { authorization: 'Bearer ' + key } : {}, signal: AbortSignal.timeout(6000) })
    return { ok: res.ok, message: res.ok ? '地址可用，Key 被接受' : 'HTTP ' + res.status }
  }

  /**
   * 当前渠道可选的模型 / 采样器 / 调度器。ComfyUI、WebUI、OpenAI 兼容接口从服务器实时读取；
   * NovelAI 没有公开的模型列表接口，给内置预设（新模型可以手填 ID）。读取失败时 live=false，附原因。
   */
  async function listModels() {
    const cfg = await config()
    const backend = cfg.images.backend
    if (backend === 'novelai') return { backend, live: false, models: Object.entries(NAI_MODELS).map(([id, m]) => ({ id, name: m.label })), samplers: NAI_SAMPLERS, schedulers: NAI_NOISE_SCHEDULES, note: 'NovelAI 没有公开的模型列表接口，这里是内置的已知模型；官方出了新模型，选「手动填写」填它的模型 ID 即可。' }
    const key = await secrets.get(secretRef(backend, cfg))
    const read = { comfyui: () => comfyModels(cfg.comfyui, key, fetchImpl), webui: () => webuiModels(cfg.webui, key, fetchImpl), openai: () => openaiModels(cfg.openai, key, fetchImpl) }[backend]
    try {
      const list = await read()
      return { backend, live: true, samplers: [], schedulers: [], ...list, note: list.models.length ? `已从服务器读取 ${list.models.length} 个模型` : '服务器没有返回任何模型' }
    } catch (error) {
      return { backend, live: false, models: [], samplers: [], schedulers: [], note: '读取模型列表失败：' + shortError(error) + '。可以先手动填写。' }
    }
  }

  async function llmModels(provider) {
    const llm = services.llm
    if (!llm?.listProviders) return { providers: [], models: [] }
    const providers = (llm.listProviders() || []).map(p => ({ id: String(p.id), name: String(p.name || p.id) }))
    let models = []
    if (provider) { try { models = (await llm.listModels(provider) || []).map(m => ({ id: String(m.id || m.model || m), name: String(m.name || m.id || m) })) } catch {} }
    return { providers, models }
  }

  async function removeGame(gameId) {
    for (const run of directorRuns.values()) if (run.gameId === gameId) run.controller.abort()
    for (const id of [...queue.state().running, ...queue.state().waiting]) if (id.includes(':' + gameId + ':')) queue.cancel(id)
    await store.removeGame(gameId)
  }

  return {
    onTurnSettled, directTurn, gameView, planImages, renderCg, rewritePrompt, replanTurn, selectVersion, deleteImage, addImageAt,
    ensurePlace: async (gameId, key) => {
      const game = await store.readGame(gameId)
      const place = game.places[key]
      if (!place) throw new Error('没有这个地点')
      ensurePlace(gameId, key, place, { force: true }).catch(() => {})
    },
    cancel: (gameId, kind, id) => (kind === 'director' ? stopDirector(gameId, id) : queue.cancel(`${kind}:${gameId}:${id}`)),
    directorLog, directorEntry,
    castAction, publicConfig, patchConfig, setSecret, testBackend, listModels, llmModels, removeGame,
    readAsset: id => store.readAsset(id),
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn) },
    dispose() { queue.dispose(); for (const run of directorRuns.values()) run.controller.abort(); listeners.clear() },
  }
}
