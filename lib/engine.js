// 每轮流程编排：
//   正文写完（Tavern 已流式显示给玩家）→ 切单元、挂「场景卡」占位 → 后台导演整理 →
//   更新角色档案（外貌、换装、长期状态）、情绪库 → 插画 / 背景 / 立绘排队生成 → 挂回正文、剧场里实时出现。
// 立绘：后台模型读完资料和全部剧情，为同一角色一批写差分提示词（服装 × 长期状态 × 情绪），同一个种子画。
// 插画：导演只挑瞬间，插画分镜师再读资料和剧情，写成 Base + 每人一个角色块；人名只当标签，出图前补上固定外貌。
import { randomUUID } from 'node:crypto'
import { segmentTurn, anchorFor } from './segment.js'
import { cleanTurnText } from './clean.js'
import { direct } from './director.js'
import { writeCgPrompts, fallbackCg, resolveCgPrompt } from './illustrator.js'
import { applyPeople, castListAt, effectivePerson, allNames, expandMentions, editPerson, editLook, editVoice, looksOf, rollback, nameColor } from './cast.js'
import { writeSpritePrompts, fallbackTags, variantLabel, WRITER_BATCH } from './sprites.js'
import { emotionId, mergeEmotions, isBuiltinEmotion } from './emotions.js'
import { variantKey, lookKey, shortHash } from './look.js'
import { playedUnits } from './staging.js'
import { createLibrary, cgName, placeName, spriteName } from './library.js'
import { composePrompt, sizeFor, BUILTIN_STYLES, withStyle, currentStyle, SAMPLE_SEED } from './image/style.js'
import { NAI_MODELS, NAI_SAMPLERS, NAI_NOISE_SCHEDULES } from './image/nai-models.js'
import { generateImage, createQueue, secretRef, backendNeedsKey } from './image/index.js'
import { comfyModels, comfyStats } from './image/comfyui.js'
import { openaiModels } from './image/openai.js'
import { webuiModels } from './image/webui.js'
import { resolveConfig, applyPatch } from './config.js'
import { SLOT_IDS, MAX_SOUND_BYTES } from './sounds.js'
import { cleanPack, packFiles, packWithAssets } from './aa-sprite.js'
import { sniffAudio, sniffImage } from './store.js'
import { createSecrets } from './secrets.js'
import { placeKey, CG_SIZES, CG_MAX_CHARACTERS } from './vocab.js'

/** 插件名：Tavern 按它记录每张场景卡、插画卡归谁，也是接口路径和数据目录的名字。 */
export const PLUGIN = 'flowgal'
export const KIND_SCENE = PLUGIN + '/scene'
export const KIND_CG = PLUGIN + '/cg'

const shortError = error => String(error?.message || error || '未知错误').slice(0, 300)
const spriteJob = (gameId, name, key) => `sprite:${gameId}:${name}:${key}`
const cgJob = (gameId, id) => `cg:${gameId}:${id}`
/** 导演挑的同一个瞬间：同一个单元之后、同一句描述（自己写 tag 的老式导演按 tag 认）。 */
const samePlan = (image, plan) => image.after === plan.after && (image.moment || image.tags) === (plan.moment || plan.tags)
const BUSY = new Set(['queued', 'running', 'writing'])
const INTERRUPTED = '中断了（可能是 DSH 重启过），点一下重画'

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
  const library = createLibrary({ store, config: () => config(), log, open: services.openFolder })
  const toLibrary = (gameId, items) => library.save(gameId, items).catch(error => log('warn', '存进图片文件夹失败：' + shortError(error)))
  let configCache = null
  const directing = new Map() // textVersion → Promise
  const directorRuns = new Map() // textVersion → 正在跑的导演（日志实时输出、可停止）
  const listeners = new Set()
  const queue = createQueue({ concurrency: () => configCache?.images?.concurrency || 1, onChange: () => notify('queue') })
  const writing = new Set() // 正在写提示词的立绘（任务编号同出图队列）
  // 立绘设计师一次读全部资料和剧情，请求很大：同一时间只跑一个。
  let writerTail = Promise.resolve()
  let disposed = false
  const oneWriter = fn => {
    const run = writerTail.then(() => { if (disposed) throw new Error('插件已停止'); return fn() })
    writerTail = run.catch(() => {})
    return run
  }

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

  /**
   * 登记一轮正文：先存单元（前台先文本），挂场景卡占位。
   * 已经整理过的轮次沿用存下的单元，免得切法改了以后脚本里的单元编号对不上；重新整理（resegment）时才重切。
   */
  async function registerTurn(turnInfo, { attachCard = true, status = 'directing', resegment = false } = {}) {
    const { gameId, turn, textVersion } = turnInfo
    let mediaId = null
    const game = await store.readGame(gameId)
    const existing = game.scenes?.[textVersion]
    const units = existing?.script && existing.units?.length && !resegment ? existing.units : segmentTurn(cleanTurnText(turnInfo))
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
      // 重新整理会按现在的切法重切；万一失败，旧脚本还配着旧单元。
      const before = force ? (await store.readGame(gameId)).scenes?.[textVersion]?.units : null
      const { units, mediaId } = await registerTurn(turnInfo, { resegment: force })
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
          llm: services.llm, provider, model, units, rawText: turnInfo.rawText || turnInfo.text || '',
          previous: await previousScript(game, turn),
          castList: castListAt(game, globalCast, turn),
          context, config: cfg, backend: cfg.images.backend, music: (await store.readMusic()).tracks, emotions: (await store.readEmotions()).list,
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
        if (script.emotions?.length) await store.updateEmotions(lib => { mergeEmotions(lib, script.emotions, { source: 'director', gameId, turn }) })
        if (mediaId) await tavern().update(mediaId, { status: 'ready', data: { turn, summary: script.summary, location: script.scene.location, time: script.scene.time, weather: script.scene.weather, mood: script.scene.mood, cast: script.cast.map(c => c.name), choices: script.choices.length } }).catch(() => {})
        if (force) await retireCgs(gameId, textVersion, script)
        notify(gameId)
        // 出图不阻塞场景就绪。
        planImages(gameId, textVersion).catch(error => log('warn', '排图失败：' + shortError(error)))
        return (await store.readGame(gameId)).scenes[textVersion]
      } catch (error) {
        log('warn', `导演失败（第 ${turn} 轮）：${shortError(error)}`)
        await store.updateGame(gameId, g => { const s = g.scenes[textVersion]; if (s) { s.status = s.script ? 'ready' : 'failed'; s.error = shortError(error); if (s.script && before) s.units = before } })
        if (mediaId) await tavern().update(mediaId, { status: 'ready', data: { turn, error: shortError(error) } }).catch(() => {})
        notify(gameId)
        throw error
      }
    })()
    directing.set(textVersion, job)
    try { return await job } finally { directing.delete(textVersion) }
  }

  // ───────────────────────── 导演日志 ─────────────────────────

  async function saveDirectorLog(run, { script = null, error, sprites = null, cgs = null }) {
    const t = run.trace
    const entry = {
      id: run.id, kind: run.kind || 'director', name: run.name || '', summary: run.summary || '', sprites, cgs,
      turn: run.turn, textVersion: run.textVersion, at: run.at, ms: Date.now() - run.at, reason: run.reason, source: run.source,
      status: error ? (run.controller.signal.aborted ? 'cancelled' : 'failed') : 'ok', error: error ? shortError(error) : '',
      provider: t.provider || '', model: t.model || '', window: t.window || 0, outputDefault: t.outputDefault || 0,
      maxTokens: t.maxTokens || 0, temperature: t.temperature ?? null, contextLength: t.contextLength || 0, contextChars: t.contextChars || 0, notes: t.notes || [],
      storyLength: t.storyLength || 0, storyChars: t.storyChars || 0,
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
      id: e.id, kind: e.kind || 'director', name: e.name || '', turn: e.turn, at: e.at, ms: running ? Date.now() - e.at : e.ms, reason: e.reason, source: e.source,
      status: running ? 'running' : e.status, error: e.error || '',
      provider: t.provider || '', model: t.model || '', maxTokens: t.maxTokens || 0, window: t.window || 0, notes: t.notes || [],
      attempts: attempts.length, usage: sumUsage(attempts), summary: e.script?.summary || e.summary || '',
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

  /** 取消一张插画：在排队 / 在画的撤出队列；还在等分镜师的，停掉写它的那一批。 */
  function cancelCg(gameId, imageId) {
    const run = [...directorRuns.values()].find(r => r.gameId === gameId && r.kind === 'cg' && r.keys?.includes(imageId))
    if (run) run.controller.abort()
    return queue.cancel(cgJob(gameId, imageId)) || Boolean(run)
  }

  /**
   * 重新整理以后，上一版脚本排的插画新脚本里没有了：从聊天里撤下，剧场也不再演。
   * 画好的留在鉴赏和图片文件夹里（文件不删），还没画出来的直接删掉。玩家「配一张」加的不动。
   */
  async function retireCgs(gameId, textVersion, script) {
    const game = await store.readGame(gameId)
    const mine = image => image.source === 'user' || (!image.source && image.writer === 'user') // 早先没记来源的：改过词的也当玩家的
    const stale = Object.values(game.images || {})
      .filter(i => i.textVersion === textVersion && !i.retired && !mine(i) && !script.images.some(p => samePlan(i, p)))
    if (!stale.length) return
    for (const image of stale) cancelCg(gameId, image.id)
    await store.updateGame(gameId, g => {
      for (const { id } of stale) {
        const image = g.images[id]
        if (!image) continue
        if (image.versions?.length) Object.assign(image, { retired: Date.now(), mediaId: null })
        else delete g.images[id]
      }
    })
    for (const image of stale) if (image.mediaId) await tavern().remove(image.mediaId).catch(() => {})
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

  /** 按脚本排插画、背景和立绘。manual：设置里关了自动配图也排（玩家手动点的）。 */
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
      const ids = []
      const untils = new Map()
      for (const plan of script.images) {
        const already = Object.values(game.images || {}).find(i => i.textVersion === textVersion && !i.retired && samePlan(i, plan))
        // 重新整理同一版正文：已有的这张不重画，只跟着新脚本改收起的位置。
        if (already) { untils.set(already.id, plan.until || ''); continue }
        ids.push(await createCg(gameId, scene, plan))
      }
      if (untils.size) await store.updateGame(gameId, g => { for (const [id, until] of untils) if (g.images[id]) g.images[id].until = until })
      drawCgs(gameId, ids).catch(error => log('warn', '插画失败：' + shortError(error)))
      queued += ids.length
    }
    if (cfg.images.backgrounds && script.scene.bg) {
      const key = placeKey(script.scene)
      const place = game.places?.[key]
      if (!place?.assetId && place?.status !== 'running') { ensurePlace(gameId, key, script.scene).catch(() => {}); queued++ }
    }
    if (cfg.images.portraits || cfg.images.expressions) {
      // 立绘：登场、换装、长期状态变了时补这一套的平静立绘；用到这一套还没有的情绪时补差分（每轮有上限）。
      const globalCast = await store.readGlobalCast()
      const want = new Map()
      const need = (name, emo) => {
        const person = effectivePerson(game, globalCast, name, scene.turn)
        if (!person?.appearance || person.sprites[variantKey(person, emo)]?.assetId || want.get(name)?.has(emo)) return false
        want.set(name, (want.get(name) || new Set()).add(emo))
        return true
      }
      if (cfg.images.portraits) for (const member of script.cast) need(member.name, 'neutral')
      if (cfg.images.expressions) {
        let budget = cfg.images.expressionsPerTurn
        const onStage = new Set(script.cast.map(c => c.name))
        for (const line of Object.values(script.lines)) {
          if (budget <= 0) break
          if (line.sp && line.emo && line.emo !== 'neutral' && onStage.has(line.sp) && need(line.sp, line.emo)) budget--
        }
      }
      for (const [name, emotions] of want) {
        requestSprites(gameId, name, { turn: scene.turn, emotions: [...emotions] }).catch(error => log('warn', `立绘失败（${name}）：${shortError(error)}`))
        queued += emotions.size
      }
    }
    return { queued }
  }

  /** 记下一张要画的插画、在正文里挂好占位；画由 drawCgs 负责（还没有提示词的先交给插画分镜师）。 */
  async function createCg(gameId, scene, plan) {
    const id = randomUUID().slice(0, 12)
    const anchor = anchorFor(scene.units, plan.after)
    const written = Boolean(plan.tags || plan.characters?.length)
    let mediaId = null
    try {
      const res = await tavern().attach({ gameId, turn: scene.turn, textVersion: scene.textVersion, item: { kind: KIND_CG, status: 'pending', anchor, caption: plan.title || '', data: { imageId: id, shape: plan.shape || 'landscape', ...(written ? {} : { writing: true }) } } })
      mediaId = res?.id || null
    } catch (error) { log('warn', '挂插画占位失败：' + shortError(error)) }
    await store.updateGame(gameId, g => {
      g.images[id] = {
        id, kind: 'cg', turn: scene.turn, textVersion: scene.textVersion, mediaId, after: plan.after, until: plan.until || '', anchor, title: plan.title || '',
        moment: plan.moment || '', who: plan.who || [], tags: plan.tags || '', desc: plan.desc || '', characters: plan.characters || [], shape: plan.shape || 'landscape',
        writer: written ? plan.writer || 'director' : '', source: plan.source || 'director', versions: [], current: -1, status: written ? 'queued' : 'writing', error: '', at: Date.now(),
      }
    })
    if (!written) writing.add(cgJob(gameId, id)) // drawCgs 马上接手；先记上，界面不会闪成「中断」
    notify(gameId)
    return id
  }

  const needsPrompt = image => !image.tags && !image.characters?.length

  /** 画一批插画：还没有提示词的按轮次交给插画分镜师一起写，写好（或保底）后各自排队出图。 */
  async function drawCgs(gameId, ids) {
    if (!ids.length) return
    let stopped = new Set()
    try {
      const game = await store.readGame(gameId)
      const toWrite = ids.filter(id => game.images[id] && needsPrompt(game.images[id]))
      if (toWrite.length) {
        await writeCgs(gameId, toWrite).catch(error => {
          stopped = new Set(toWrite)
          log('warn', '插画分镜失败：' + shortError(error))
        })
      }
    } finally {
      for (const id of ids) writing.delete(cgJob(gameId, id))
    }
    for (const id of ids) if (!stopped.has(id)) renderCg(gameId, id, {}, { write: false }).catch(() => {})
  }

  /**
   * 让插画分镜师给这些插画写提示词并存下。save=false 时只返回草稿（改写预览用）。
   * 写不出来的按档案保底，不会让插画卡在「写词中」。
   * @returns {Promise<Map<string, object>>} 插画编号 → { tags, desc, characters, shape, writer }
   */
  async function writeCgs(gameId, ids, { instruction = '', save = true } = {}) {
    const cfg = await config()
    const game = await store.readGame(gameId)
    const globalCast = await store.readGlobalCast()
    const images = ids.map(id => game.images[id]).filter(Boolean)
    const jobs = images.map(i => cgJob(gameId, i.id))
    const drafts = new Map()
    if (save) {
      jobs.forEach(j => writing.add(j))
      await store.updateGame(gameId, g => { for (const i of images) if (g.images[i.id]) Object.assign(g.images[i.id], { status: 'writing', error: '' }) })
      notify(gameId)
    }
    try {
      // 同一轮的插画一次写完：分镜师一起看，时代锚和衣服指纹更一致。
      const byScene = new Map()
      for (const image of images) byScene.set(image.textVersion, [...(byScene.get(image.textVersion) || []), image])
      for (const [textVersion, list] of byScene) {
        const scene = game.scenes[textVersion]
        if (!scene) continue
        const targets = list.map(i => ({ key: i.id, after: i.after, title: i.title, moment: i.moment, who: i.who || [], ...(instruction ? { instruction, current: i } : {}) }))
        let results = new Map()
        try { results = await oneWriter(() => runCgWriter(gameId, scene, targets, cfg)) } catch (error) {
          if (/已手动停止/.test(error?.message)) throw error
          log('warn', '插画分镜失败，按档案拼：' + shortError(error))
        }
        const lookup = name => effectivePerson(game, globalCast, name, scene.turn)
        for (const image of list) drafts.set(image.id, results.get(image.id) || (instruction ? null : fallbackCg(image, lookup, scene.script?.scene)))
      }
    } catch (error) {
      if (save) {
        jobs.forEach(j => writing.delete(j))
        await store.updateGame(gameId, g => { for (const i of images) if (g.images[i.id]) Object.assign(g.images[i.id], { status: 'cancelled', error: shortError(error) }) })
        for (const i of images) await syncMedia(i, i.versions?.length ? 'ready' : 'failed', shortError(error))
        notify(gameId)
      }
      throw error
    }
    if (save) {
      await store.updateGame(gameId, g => {
        for (const [id, d] of drafts) {
          const img = g.images[id]
          if (!img) continue
          if (!d) { Object.assign(img, { status: 'failed', error: '插画分镜师没有写出来' }); continue }
          Object.assign(img, { tags: d.tags, desc: d.desc, characters: d.characters, shape: d.shape, writer: d.writer, writtenAt: Date.now(), status: 'queued' })
        }
      })
      jobs.forEach(j => writing.delete(j))
      notify(gameId)
    }
    return drafts
  }

  /** 插画分镜师跑一次：读资料、此前的剧情、这一轮正文和相关人物的档案。跑的过程记进导演日志（可看实时输出、可停止）。 */
  async function runCgWriter(gameId, scene, targets, cfg) {
    const { provider, model, source } = await pickModel(gameId, cfg)
    const game = await store.readGame(gameId)
    const globalCast = await store.readGlobalCast()
    let context = null
    try { context = await services.tavern?.getCardContext?.({ gameId, turn: scene.turn }) } catch {}
    const story = await storyTurns(gameId, scene.turn - 1)
    // 相关人物：要入画的、这一幕在场的、说过话的；都没有档案时给全部档案。
    const script = scene.script || {}
    const wanted = new Set([...targets.flatMap(t => t.who || []), ...(script.cast || []).map(c => c.name), ...Object.values(script.lines || {}).map(l => l.sp).filter(Boolean)])
    const everyone = castListAt(game, globalCast, scene.turn).filter(p => p.appearance)
    const people = everyone.filter(p => wanted.has(p.name))
    // 这一局已经画过的插画：给分镜师对齐时代锚和衣服指纹。
    const references = Object.values(game.images || {})
      .filter(i => !targets.some(t => t.key === i.id) && (i.characters?.length || i.tags) && i.versions?.length)
      .sort((a, b) => b.turn - a.turn || b.at - a.at)
      .slice(0, 3)
      .map(i => ({ label: `第 ${i.turn} 轮「${i.title || '插画'}」`, tags: i.tags, desc: i.desc, characters: i.characters || [] }))
    const run = {
      id: randomUUID().replace(/-/g, '').slice(0, 12), kind: 'cg', name: '', keys: targets.map(t => t.key), gameId, turn: scene.turn, textVersion: scene.textVersion, at: Date.now(), reason: 'cg', source: source || '',
      summary: `插画提示词 · 第 ${scene.turn} 轮：${targets.map(t => t.title || t.moment || '插画').join('、')}`.slice(0, 120),
      trace: { provider, model }, controller: new AbortController(),
    }
    directorRuns.set('cg:' + run.id, run)
    let pushTimer = null
    const progress = () => { if (!pushTimer) pushTimer = setTimeout(() => { pushTimer = null; notify(directorChannel(gameId)) }, 250) }
    notify(directorChannel(gameId))
    let results = null, failure = null
    try {
      results = await writeCgPrompts({
        llm: services.llm, provider, model, config: cfg, backend: cfg.images.backend, context, story, turn: scene.turn, units: playedUnits(scene.units, scene.script),
        people: people.length ? people : everyone.slice(0, 12), targets, references, signal: run.controller.signal, trace: run.trace, onProgress: progress,
      })
    } catch (error) { failure = run.controller.signal.aborted ? new Error('已手动停止') : error }
    clearTimeout(pushTimer)
    directorRuns.delete('cg:' + run.id)
    const cgs = targets.map(t => ({ key: t.key, label: t.title || t.moment || '插画', ...(results?.get(t.key) || {}) }))
    const problem = failure || (run.trace.error ? new Error(run.trace.error + '（已按档案拼了一份）') : null)
    await saveDirectorLog(run, { error: problem, cgs }).catch(error => log('warn', '写导演日志失败：' + shortError(error)))
    notify(directorChannel(gameId))
    if (failure) throw failure
    return results
  }

  /** 玩家在改词里改过的角色块：只收 name / tag / nl 三个字符串。 */
  const cleanCharacters = list => (Array.isArray(list) ? list : []).slice(0, CG_MAX_CHARACTERS)
    .map(c => ({ name: String(c?.name || '').trim().slice(0, 24), tag: String(c?.tag || '').slice(0, 1500), nl: String(c?.nl || '').slice(0, 800) }))
    .filter(c => c.tag.trim() || c.nl.trim())

  /**
   * 生成（或重画）一张 CG。overrides 可改 tags / desc / characters / negativeExtra / shape / seed（改过就记成玩家写的）。
   * 还没有提示词的先交给插画分镜师（write: false 时不再找分镜师，直接报错）。
   */
  async function renderCg(gameId, imageId, overrides = {}, { write = true } = {}) {
    const cfg = await config()
    const ready = await backendReady(cfg)
    const jobId = cgJob(gameId, imageId)
    const setStatus = (status, extra = {}) => store.updateGame(gameId, g => { const img = g.images[imageId]; if (img) Object.assign(img, { status, ...extra }) }).then(() => notify(gameId))
    let image = (await store.readGame(gameId)).images[imageId]
    if (!image) throw new Error('找不到这张图')
    if (!ready.ok) { await setStatus('failed', { error: ready.reason }); await syncMedia(image, 'failed', ready.reason); throw new Error(ready.reason) }
    const changed = {}
    for (const f of ['tags', 'desc', 'negativeExtra']) if (typeof overrides[f] === 'string') changed[f] = overrides[f].slice(0, 2000)
    if (CG_SIZES.includes(overrides.shape)) changed.shape = overrides.shape
    if (Array.isArray(overrides.characters)) changed.characters = cleanCharacters(overrides.characters)
    // 单张指定的画风：空字符串 = 跟着当前画风。
    if (typeof overrides.style === 'string' && (!overrides.style || cfg.style.presets.some(p => p.id === overrides.style))) changed.style = overrides.style
    if (changed.tags !== undefined || changed.desc !== undefined || changed.characters) changed.writer = 'user'
    image = { ...image, ...changed }
    if (needsPrompt(image)) {
      if (!write) {
        const reason = '没有可用的提示词，点「改词」写一份'
        await setStatus('failed', { error: reason })
        await syncMedia(image, image.versions?.length ? 'ready' : 'failed', reason)
        throw new Error('没有可用的提示词')
      }
      await writeCgs(gameId, [imageId])
      return renderCg(gameId, imageId, overrides, { write: false })
    }
    await setStatus('queued', { error: '', ...changed })
    await syncMedia(image, 'pending')
    try {
      const result = await queue.enqueue(jobId, async signal => {
        await setStatus('running')
        const game = await store.readGame(gameId)
        const globalCast = await store.readGlobalCast()
        const names = allNames(game, globalCast)
        const lookup = n => effectivePerson(game, globalCast, n, image.turn)
        // 老式的 @名字 写法先换成外貌；然后补固定外貌、去掉人名、补人数。
        const { text } = expandMentions(image.tags, lookup, names)
        const resolved = resolveCgPrompt({ ...image, tags: text }, lookup, names)
        const styled = withStyle(cfg, image.style)
        const prompt = composePrompt({ kind: 'cg', tags: resolved.tags, desc: resolved.nl, characters: resolved.characters, backend: cfg.images.backend, config: styled, extraNegative: image.negativeExtra })
        const { width, height } = sizeFor(cfg, image.shape)
        const seed = Number.isInteger(overrides.seed) ? overrides.seed : undefined
        const out = await generateImage({ backend: cfg.images.backend, config: styled, key: ready.key, signal, fetchImpl, prompt: prompt.positive, negative: prompt.negative, characters: prompt.characters, width, height, seed })
        const assetId = await store.saveAsset(out.bytes, out.mediaType)
        return { assetId, seed: out.seed, model: out.model || '', backend: out.backend, style: currentStyle(styled.style).name, positive: prompt.positive, negative: prompt.negative, characters: prompt.characters, width, height, at: Date.now() }
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
      if (latest) { await syncMedia(latest, 'ready'); toLibrary(gameId, [{ assetId: result.assetId, parts: cgName(latest) }]) }
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
      toLibrary(gameId, [{ assetId: out.assetId, parts: placeName(scene) }])
    } catch (error) {
      await store.updateGame(gameId, g => { if (g.places[key]) Object.assign(g.places[key], { status: 'failed', error: shortError(error) }) })
    }
    notify(gameId)
  }

  // ───────────────────────── 立绘 ─────────────────────────

  /**
   * 到某一轮为止的全部剧情。整理过的轮次用导演标了要演的单元（去掉状态栏、网页外壳这些）；
   * 没整理过的（含插件装上之前的轮次）问 Tavern 拿正文，按切单元前的办法清洗；都拿不到用存下的正文单元。
   */
  async function storyTurns(gameId, upto) {
    const game = await store.readGame(gameId)
    const stored = new Map()
    for (const scene of Object.values(game.scenes || {})) {
      const prev = stored.get(scene.turn)
      if (!prev || scene.at > prev.at) stored.set(scene.turn, scene)
    }
    const last = Number.isFinite(upto) ? upto : Math.max(0, ...stored.keys())
    const turns = []
    for (let t = 0; t <= last && t <= 5000; t++) {
      let info = null
      try { info = await services.tavern?.getTurn?.({ gameId, turn: t }) } catch {}
      const scene = (info?.textVersion && game.scenes?.[info.textVersion]) || stored.get(t)
      const unitsText = s => playedUnits(s.units, s.script).map(u => u.text).join('\n')
      let text = scene?.script ? unitsText(scene) : ''
      if (!text && info) text = cleanTurnText(info)
      if (!text && scene) text = unitsText(scene)
      if (text) turns.push({ turn: t, text })
    }
    return turns
  }

  const latestTurn = game => Math.max(0, ...Object.values(game.scenes || {}).map(s => Number(s.turn) || 0))

  /** 立绘设计师：读资料、全部剧情和档案，为一批差分写提示词。跑的过程记进导演日志（可看实时输出、可停止）。 */
  async function runSpriteWriter(gameId, name, person, targets, turn, cfg, custom) {
    const { provider, model, source } = await pickModel(gameId, cfg)
    let context = null
    try { context = await services.tavern?.getCardContext?.({ gameId, turn }) } catch {}
    const story = await storyTurns(gameId, turn)
    // 已经画好的同一套固定外貌的立绘：给设计师对齐写法。
    const prefix = shortHash(person.appearance) + '|'
    const references = Object.entries(person.sprites)
      .filter(([key, r]) => key.startsWith(prefix) && r?.tags && r.assetId && r.writer !== 'fallback' && !targets.some(t => t.key === key))
      .slice(-4)
      .map(([, r]) => ({ label: variantLabel({ outfit: r.outfit, states: (r.states || []).map(n => ({ name: n })), emotion: r.emotion }, custom), tags: r.tags }))
    const run = {
      id: randomUUID().replace(/-/g, '').slice(0, 12), kind: 'sprite', name, gameId, turn, textVersion: '', at: Date.now(), reason: 'sprite', source: source || '',
      summary: `立绘提示词 · ${name}：${targets.map(t => variantLabel(t, custom)).join('、')}`.slice(0, 120),
      trace: { provider, model }, controller: new AbortController(),
    }
    directorRuns.set('sprite:' + run.id, run)
    let pushTimer = null
    const progress = () => { if (!pushTimer) pushTimer = setTimeout(() => { pushTimer = null; notify(directorChannel(gameId)) }, 250) }
    notify(directorChannel(gameId))
    let results = null, failure = null
    try {
      results = await writeSpritePrompts({
        llm: services.llm, provider, model, config: cfg, backend: cfg.images.backend, context, story, turn, person, targets, references, custom,
        signal: run.controller.signal, trace: run.trace, onProgress: progress,
      })
    } catch (error) { failure = run.controller.signal.aborted ? new Error('已手动停止') : error }
    clearTimeout(pushTimer)
    directorRuns.delete('sprite:' + run.id)
    const sprites = targets.map(t => ({ key: t.key, label: variantLabel(t, custom), ...(results?.get(t.key) || {}) }))
    const problem = failure || (run.trace.error ? new Error(run.trace.error + '（已按档案拼了一份）') : null)
    await saveDirectorLog(run, { error: problem, sprites }).catch(error => log('warn', '写导演日志失败：' + shortError(error)))
    notify(directorChannel(gameId))
    if (failure) throw failure
    return results
  }

  async function markSprites(gameId, name, keys, status, error = '') {
    await store.updateGame(gameId, g => {
      const look = looksOf(g, name)
      for (const key of keys) {
        if (status === 'ready') delete look.spriteStatus[key]
        else look.spriteStatus[key] = { status, error }
      }
    })
    notify(gameId)
  }

  /**
   * 为某人在某一轮的样子要一批情绪差分。
   * 还没有提示词的（或 rewrite）先交给立绘设计师写，再按角色的固定种子排队出图；edit 给了就按玩家改好的词画。
   */
  async function requestSprites(gameId, name, { turn = Infinity, emotions = ['neutral'], rewrite = false, edit = null } = {}) {
    const cfg = await config()
    const ready = await backendReady(cfg)
    if (!ready.ok) throw new Error(ready.reason)
    const game = await store.readGame(gameId)
    const person = effectivePerson(game, await store.readGlobalCast(), name, turn)
    if (!person?.appearance) throw new Error(`${name} 还没有外貌档案`)
    const custom = (await store.readEmotions()).list
    const busy = key => queue.has(spriteJob(gameId, name, key)) || writing.has(spriteJob(gameId, name, key))
    const targets = [...new Set(emotions.map(emotionId).filter(Boolean))]
      .map(emotion => ({ key: variantKey(person, emotion), emotion, outfit: person.outfit, outfitTags: person.outfitTags, states: person.states }))
      .filter(t => !busy(t.key))
    if (!targets.length) return { queued: 0 }
    const toWrite = edit ? [] : targets.filter(t => rewrite || !person.sprites[t.key]?.tags)
    // 进出图队列之前都算「在忙」，同一张不会被重复要。
    const jobs = targets.map(t => spriteJob(gameId, name, t.key))
    jobs.forEach(j => writing.add(j))
    const written = new Map()
    try {
      await markSprites(gameId, name, targets.map(t => t.key), 'queued')
      if (toWrite.length) await markSprites(gameId, name, toWrite.map(t => t.key), 'writing')
      if (edit) written.set(targets[0].key, { tags: String(edit.tags || '').slice(0, 2000), negative: String(edit.negative || '').slice(0, 600), writer: 'user' })
      if (toWrite.length && cfg.images.spriteWriter) {
        for (let i = 0; i < toWrite.length; i += WRITER_BATCH) {
          const batch = toWrite.slice(i, i + WRITER_BATCH)
          const results = await oneWriter(() => runSpriteWriter(gameId, name, person, batch, Number.isFinite(turn) ? turn : latestTurn(game), cfg, custom))
          for (const [key, value] of results) written.set(key, value)
        }
      }
      // 没开立绘设计师、或者没写出来：已有提示词的沿用，没有的按档案拼。
      for (const t of toWrite) if (!written.has(t.key) && !person.sprites[t.key]?.tags) written.set(t.key, { tags: fallbackTags(person, t, custom), negative: '', writer: 'fallback' })
    } catch (error) {
      jobs.forEach(j => writing.delete(j))
      await markSprites(gameId, name, targets.map(t => t.key), /已手动停止/.test(error?.message) ? 'cancelled' : 'failed', shortError(error))
      throw error
    }
    await store.updateGame(gameId, g => {
      const look = looksOf(g, name)
      for (const t of targets) {
        const w = written.get(t.key)
        look.sprites[t.key] = {
          ...(person.sprites[t.key] || {}), ...(look.sprites[t.key] || {}),
          emotion: t.emotion, outfit: t.outfit, states: t.states.map(s => s.name),
          ...(w ? { tags: w.tags, negative: w.negative || '', writer: w.writer, writtenAt: Date.now(), turn: Number.isFinite(turn) ? turn : null } : {}),
        }
      }
    })
    for (const t of targets) paintSprite(gameId, name, t.key, ready).catch(() => {})
    jobs.forEach(j => writing.delete(j))
    return { queued: targets.length }
  }

  /** 按存好的提示词画一张差分：角色的固定种子；成功后换掉旧图（玩家上传的、全局库在用的不删文件）。 */
  async function paintSprite(gameId, name, key, ready) {
    const mark = (status, error = '') => markSprites(gameId, name, [key], status, error)
    // 同步进队列，调用方一返回 queue.has 就是真的。
    const job = queue.enqueue(spriteJob(gameId, name, key), async signal => {
      const cfg = await config()
      await mark('running')
      const game = await store.readGame(gameId)
      const person = effectivePerson(game, await store.readGlobalCast(), name)
      const record = game.looks?.[name]?.sprites?.[key]
      if (!person || !record?.tags) throw new Error('这张立绘还没有提示词')
      const prompt = composePrompt({ kind: 'sprite', tags: record.tags, person, backend: cfg.images.backend, config: cfg, extraNegative: [person.negative, record.negative].filter(Boolean).join(', ') })
      const { width, height } = sizeFor(cfg, 'portrait')
      const res = await generateImage({ backend: cfg.images.backend, config: cfg, key: ready.key, signal, fetchImpl, prompt: prompt.positive, negative: prompt.negative, width, height, seed: person.seed, transparent: cfg.images.transparentSprites })
      return { assetId: await store.saveAsset(res.bytes, res.mediaType), seed: res.seed, model: res.model || '', positive: prompt.positive, negativePrompt: prompt.negative }
    }, { onRetry: (error, n) => log('info', `限流重试 ${n}：${shortError(error)}`) })
    try {
      const out = await job
      let old = [], saved = null
      await store.updateGame(gameId, g => {
        const look = looksOf(g, name)
        const record = look.sprites[key] || (look.sprites[key] = {})
        old = recordAssets(record)
        Object.assign(record, out, { at: Date.now(), uploaded: false })
        delete record.aa // 换了新图，逆转式素材包的贴片对不上了
        delete look.spriteStatus[key]
        saved = { ...record }
      })
      await releaseAssets(gameId, old, [out.assetId])
      toLibrary(gameId, [{ assetId: out.assetId, parts: spriteName(name, saved, (await store.readEmotions()).list) }])
      notify(gameId)
      return out.assetId
    } catch (error) {
      await mark(error?.code === 'aborted' ? 'cancelled' : 'failed', error?.code === 'aborted' ? '已取消' : shortError(error))
      throw error
    }
  }

  /** 一条立绘记录用到的全部文件：图本身，加上逆转式素材包的呼吸帧和差分贴片。 */
  const recordAssets = record => [record?.assetId, ...packFiles(record?.aa?.pack)].filter(Boolean)

  /** 删掉一批立绘文件（keep 里的留着）。 */
  async function releaseAssets(gameId, ids, keep = []) {
    for (const id of new Set(ids)) if (!keep.includes(id)) await releaseAsset(gameId, id)
  }

  /** 删一张立绘文件：本局别处或全局库还在用就留着。 */
  async function releaseAsset(gameId, id) {
    const uses = sprites => Object.values(sprites || {}).some(r => recordAssets(r).includes(id))
    const global = await store.readGlobalCast()
    if (Object.values(global.cast || {}).some(p => uses(p.sprites))) return
    const game = await store.readGame(gameId)
    if (Object.values(game.looks || {}).some(l => uses(l.sprites))) return
    await store.removeAsset(id)
  }

  // ───────────────────────── 补图 ─────────────────────────

  /** 当前版本的场景（改写过的旧版本不算），按轮次排好；顺带给出 Tavern 里还挂着的卡片编号。 */
  async function currentScenes(gameId, game) {
    let items = []
    try { items = await tavern().list({ gameId }) } catch (error) { log('warn', 'list 失败：' + shortError(error)) }
    const current = new Set(items.filter(i => i.current).map(i => i.id))
    const all = Object.values(game.scenes || {})
    // 没挂卡的轮次（手动关闭自动导演）：同一轮只保留最新的一份。
    const scenes = all.filter(scene => (scene.mediaId ? current.has(scene.mediaId) : !all.some(s => s.turn === scene.turn && s.at > scene.at)))
    return { scenes: scenes.sort((a, b) => a.turn - b.turn), current }
  }

  /**
   * 补图：把错过的插画、背景、立绘差分补上（当时还没填 Key、关着自动出图、出图失败或被中断）。
   * turn 给了只补那一轮；name 给了只补这个人的立绘。立绘按每一轮的样子补齐用到的所有情绪。
   * 没指定 kinds 时跟着设置走（关掉的背景 / 立绘 / 情绪差分不补）；指定了（人物志里点的）就照指定的补。
   */
  async function fillMissing(gameId, { turn = null, name = '', kinds = null } = {}) {
    const cfg = await config()
    const ready = await backendReady(cfg)
    if (!ready.ok) throw new Error(ready.reason)
    const explicit = Array.isArray(kinds)
    if (!explicit) kinds = ['cg', ...(cfg.images.backgrounds ? ['bg'] : []), ...(cfg.images.portraits ? ['sprite'] : [])]
    const withEmotions = explicit || cfg.images.expressions
    const game = await store.readGame(gameId)
    const globalCast = await store.readGlobalCast()
    const { scenes } = await currentScenes(gameId, game)
    const counts = { cg: 0, bg: 0, sprite: 0, undirected: 0 }
    const places = new Set()
    const sprites = new Map()
    for (const scene of scenes) {
      if (turn != null && scene.turn !== Number(turn)) continue
      const script = scene.script
      if (!script) { counts.undirected++; continue }
      if (kinds.includes('cg')) {
        const ids = []
        const mine = Object.values(game.images || {}).filter(i => i.textVersion === scene.textVersion && !i.retired)
        for (const plan of script.images || []) if (!mine.some(i => samePlan(i, plan))) ids.push(await createCg(gameId, scene, plan))
        // 导演排的和玩家「配一张」加的：一张都没画出来、也不在队列里的重画（没提示词的先找分镜师写）。
        for (const image of mine) {
          const job = cgJob(gameId, image.id)
          if (!image.versions?.length && !queue.has(job) && !writing.has(job)) ids.push(image.id)
        }
        if (ids.length) { drawCgs(gameId, ids).catch(error => log('warn', '补插画失败：' + shortError(error))); counts.cg += ids.length }
      }
      if (kinds.includes('bg') && script.scene.bg) {
        const key = placeKey(script.scene)
        if (!game.places?.[key]?.assetId && !queue.has(`bg:${gameId}:${key}`) && !places.has(key)) { places.add(key); ensurePlace(gameId, key, script.scene).catch(() => {}); counts.bg++ }
      }
      if (kinds.includes('sprite')) {
        const need = (who, emo) => {
          if (name && who !== name) return
          const person = effectivePerson(game, globalCast, who, scene.turn)
          if (!person?.appearance || person.sprites[variantKey(person, emo)]?.assetId) return
          const id = who + '\n' + lookKey(person)
          const entry = sprites.get(id) || { name: who, turn: scene.turn, emotions: new Set() }
          entry.turn = Math.max(entry.turn, scene.turn)
          entry.emotions.add(emo)
          sprites.set(id, entry)
        }
        const onStage = new Set(script.cast.map(c => c.name))
        for (const member of script.cast) need(member.name, 'neutral')
        if (withEmotions) for (const line of Object.values(script.lines)) if (line.sp && line.emo && onStage.has(line.sp)) need(line.sp, line.emo)
      }
    }
    for (const entry of sprites.values()) {
      requestSprites(gameId, entry.name, { turn: entry.turn, emotions: [...entry.emotions] }).catch(error => log('warn', `补立绘失败（${entry.name}）：${shortError(error)}`))
      counts.sprite += entry.emotions.size
    }
    return counts
  }

  // ───────────────────────── 给浏览器的视图 ─────────────────────────

  async function gameView(gameId) {
    const game = await store.readGame(gameId)
    const globalCast = await store.readGlobalCast()
    const { scenes, current } = await currentScenes(gameId, game)
    const turns = scenes.map(scene => ({ turn: scene.turn, textVersion: scene.textVersion, status: scene.status, error: scene.error || '', units: scene.units, script: scene.script || null }))
    const latest = Object.values(game.scenes || {}).sort((a, b) => b.at - a.at)[0]
    // 记着在排队 / 在画、但队列里已经没有了（DSH 重启过）：显示成失败，点一下能重画。
    const liveStatus = (job, status, error) => (BUSY.has(status) && !queue.has(job) && !writing.has(job) ? ['failed', INTERRUPTED] : [status, error])
    const images = Object.values(game.images || {})
      .filter(i => !i.mediaId || current.has(i.mediaId))
      .map(i => {
        const job = cgJob(gameId, i.id)
        const [status, error] = queue.has(job) ? [i.status === 'queued' ? 'queued' : 'running', ''] : liveStatus(job, i.status, i.error)
        return {
          id: i.id, turn: i.turn, textVersion: i.textVersion, after: i.after, until: i.until || '', title: i.title, moment: i.moment || '', who: i.who || [],
          tags: i.tags, desc: i.desc, characters: i.characters || [], shape: i.shape, writer: i.writer || '', style: i.style || '', retired: Boolean(i.retired), negativeExtra: i.negativeExtra || '', status, error, current: i.current,
          versions: i.versions.map(v => ({ assetId: v.assetId, seed: v.seed, model: v.model, backend: v.backend, style: v.style || '', positive: v.positive, negative: v.negative, characters: v.characters || [], width: v.width || 0, height: v.height || 0, at: v.at })),
        }
      })
    const cast = allNames(game, globalCast).map(n => {
      const person = effectivePerson(game, globalCast, n)
      const local = game.cast?.[n]
      const spriteStatus = {}
      for (const [key, st] of Object.entries(game.looks?.[n]?.spriteStatus || {})) {
        const [status, error] = liveStatus(spriteJob(gameId, n, key), st.status, st.error)
        spriteStatus[key] = { status, error }
      }
      const source = local || globalCast.cast[n]
      return { ...person, seedCustom: Number.isInteger(source.seed), spriteStatus, versions: local?.versions || [], createdTurn: local?.createdTurn ?? null }
    })
    return {
      gameId,
      card: latest?.card || null,
      turns,
      latestTurn: latestTurn(game),
      images,
      cast,
      emotions: (await store.readEmotions()).list,
      castLog: (game.castLog || []).map((e, index) => ({ ...e, index })).slice(-60).reverse(),
      places: game.places || {},
      queue: queue.state(),
    }
  }

  // ───────────────────────── 操作 ─────────────────────────

  /** AI 改写：插画分镜师按玩家的一句话改现有的提示词（留空就重读正文重写），只返回草稿，玩家确认后才重画。 */
  async function rewritePrompt(gameId, imageId, instruction) {
    const game = await store.readGame(gameId)
    if (!game.images[imageId]) throw new Error('找不到这张图')
    const text = String(instruction || '').trim().slice(0, 1000) || '重新读一遍正文，把这一瞬间写得更准确'
    const drafts = await writeCgs(gameId, [imageId], { instruction: text, save: false })
    const draft = drafts.get(imageId)
    if (!draft) throw new Error('插画分镜师没有写出来，换个说法再试一次')
    return { tags: draft.tags, desc: draft.desc, characters: draft.characters, shape: draft.shape }
  }

  async function replanTurn(gameId, turn) {
    const info = await tavern().getTurn({ gameId, turn: Number(turn) })
    if (!info) throw new Error('这一轮不存在')
    const scene = await runDirector(info, { force: true })
    // 开着自动配图时 runDirector 已经排过了；再排一次会把同一张图排两遍。
    if ((await config()).images.auto) return { queued: 0 }
    return planImages(gameId, scene.textVersion, { manual: true })
  }

  /** 剧场里这张插画显示到哪一句（空 = 这一轮结束）。只改演出，不重画。 */
  async function setImageUntil(gameId, imageId, until) {
    const game = await store.readGame(gameId)
    const image = game.images[imageId]
    if (!image) throw new Error('找不到这张图')
    const units = game.scenes[image.textVersion]?.units || []
    const at = units.findIndex(u => u.id === until)
    if (until && (at < 0 || at < units.findIndex(u => u.id === image.after))) throw new Error('只能选这张插画出现之后的句子')
    await store.updateGame(gameId, g => { if (g.images[imageId]) g.images[imageId].until = until || '' })
    notify(gameId)
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
    queue.cancel(cgJob(gameId, imageId))
    for (const v of image.versions || []) await store.removeAsset(v.assetId)
    if (image.mediaId) await tavern().remove(image.mediaId).catch(() => {})
    notify(gameId)
  }

  /** 「配一张」：在某一轮（某个单元之后）加一张插画。没给提示词就交给插画分镜师，没指定单元就让它挑这一轮最值得画的瞬间。 */
  async function addImageAt(gameId, turn, after, plan = {}) {
    const game = await store.readGame(gameId)
    const scene = Object.values(game.scenes).filter(s => s.turn === Number(turn)).sort((a, b) => b.at - a.at)[0]
    if (!scene) throw new Error('这一轮还没有场景')
    const unit = scene.units.find(u => u.id === after) || scene.units[scene.units.length - 1]
    const moment = String(plan.moment || '').slice(0, 300) || (after && unit ? `画这一段：「${unit.text.slice(0, 120)}」` : '')
    const id = await createCg(gameId, scene, {
      after: unit.id, title: String(plan.title || '').slice(0, 40), moment, who: [],
      tags: String(plan.tags || '').slice(0, 1500), desc: String(plan.desc || '').slice(0, 1200), shape: CG_SIZES.includes(plan.shape) ? plan.shape : 'landscape', writer: 'user', source: 'user',
    })
    drawCgs(gameId, [id]).catch(error => log('warn', '插画失败：' + shortError(error)))
    return id
  }

  /** 上传立绘：放进某一轮（默认最新）那套样子的某个情绪差分。没有档案的人物先建一份空档案。 */
  async function saveUpload(gameId, name, emotion, dataUrl, turn = Infinity) {
    const m = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl || ''))
    if (!m) throw new Error('只支持 PNG / JPEG / WebP 图片')
    const bytes = new Uint8Array(Buffer.from(m[2], 'base64'))
    if (bytes.byteLength > 12 * 1024 * 1024) throw new Error('图片超过 12MB')
    const assetId = await store.saveAsset(bytes, m[1])
    const emo = emotionId(emotion) || 'neutral'
    const globalCast = await store.readGlobalCast()
    let old = []
    await store.updateGame(gameId, g => {
      if (!g.cast?.[name] && !globalCast.cast?.[name]) editPerson(g, name, {})
      const person = effectivePerson(g, globalCast, name, turn)
      const key = variantKey(person, emo)
      const look = looksOf(g, name)
      old = recordAssets(look.sprites[key])
      const { aa, ...rest } = look.sprites[key] || {} // 换了图，原来挂的逆转式素材包对不上了
      look.sprites[key] = { ...rest, emotion: emo, outfit: person.outfit, states: person.states.map(s => s.name), assetId, uploaded: true, writer: rest.writer || 'upload', at: Date.now() }
      delete look.spriteStatus[key]
    })
    await releaseAssets(gameId, old, [assetId])
    notify(gameId)
    return assetId
  }

  /**
   * 给一张差分导入逆转式素材包（sprite.json + 图片，files：文件名 → data URL）：检查格式、收齐文件，
   * 这张差分的图换成素材包的第一张呼吸帧（眼睛、嘴巴的贴片是照这张图的坐标做的），剧场里就会呼吸、眨眼、动嘴。
   */
  async function saveAaPack(gameId, name, emotion, manifest, files, turn = Infinity) {
    const pack = cleanPack(manifest)
    const ids = {}
    try {
      for (const file of packFiles(pack)) {
        const m = /^data:[^;,]*;base64,([A-Za-z0-9+/=]+)$/.exec(String(files?.[file] || ''))
        if (!m) throw new Error('素材包缺文件：' + file)
        const bytes = new Uint8Array(Buffer.from(m[1], 'base64'))
        if (bytes.byteLength > 12 * 1024 * 1024) throw new Error(`${file} 超过 12MB`)
        const type = sniffImage(bytes)
        if (!type || type === 'image/gif') throw new Error(`${file} 不是 PNG / JPEG / WebP 图片`)
        ids[file] = await store.saveAsset(bytes, type)
      }
    } catch (error) {
      for (const id of Object.values(ids)) await store.removeAsset(id).catch(() => {})
      throw error
    }
    const stored = packWithAssets(pack, ids)
    const emo = emotionId(emotion) || 'neutral'
    const globalCast = await store.readGlobalCast()
    let old = []
    await store.updateGame(gameId, g => {
      if (!g.cast?.[name] && !globalCast.cast?.[name]) editPerson(g, name, {})
      const person = effectivePerson(g, globalCast, name, turn)
      const key = variantKey(person, emo)
      const look = looksOf(g, name)
      old = recordAssets(look.sprites[key])
      look.sprites[key] = {
        ...(look.sprites[key] || {}), emotion: emo, outfit: person.outfit, states: person.states.map(s => s.name),
        assetId: stored.breath.frames[0], uploaded: true, writer: 'upload', aa: { pack: stored }, at: Date.now(),
      }
      delete look.spriteStatus[key]
    })
    await releaseAssets(gameId, old, Object.values(ids))
    notify(gameId)
  }

  /** 取消一张差分的逆转式素材包：图留着（就是素材包的第一张呼吸帧），不再动。 */
  async function removeAaPack(gameId, name, key) {
    let old = []
    await store.updateGame(gameId, g => {
      const record = looksOf(g, name).sprites[key]
      if (!record?.aa) return
      old = recordAssets(record)
      delete record.aa
    })
    const game = await store.readGame(gameId)
    await releaseAssets(gameId, old, [game.looks?.[name]?.sprites?.[key]?.assetId])
  }

  async function castAction(gameId, action, input) {
    const name = String(input?.name || '').trim().slice(0, 24)
    if (!name && action !== 'rollback' && action !== 'fill') throw new Error('缺少人物名')
    const turn = input?.turn == null || input.turn === '' ? Infinity : Number(input.turn)
    let result = { ok: true }
    switch (action) {
      case 'save':
        await store.updateGame(gameId, g => { editPerson(g, name, input.patch || {}, Number.isFinite(turn) ? turn : 0) })
        break
      case 'look':
        // 换装、衣橱、长期状态、临时状态：从 turn（默认最新一轮）起生效；全局角色也写在本局。
        await store.updateGame(gameId, g => { editLook(g, name, input.patch || {}, Number.isFinite(turn) ? turn : latestTurn(g)) })
        break
      case 'rollback':
        await store.updateGame(gameId, g => { rollback(g, Number(input.index)) })
        break
      case 'delete':
        await store.updateGame(gameId, g => { delete g.cast[name]; if (g.looks) delete g.looks[name] })
        break
      case 'promote': {
        // 提升为全局：冻结固定外貌，所有对局共用（连同衣橱、正在穿的那套、种子和已画好的立绘）；AI 不再改它。
        const game = await store.readGame(gameId)
        const person = effectivePerson(game, await store.readGlobalCast(), name)
        if (!person) throw new Error('没有这个人物')
        await store.updateGlobalCast(gc => {
          gc.cast[name] = { name, gender: person.gender, color: person.color || nameColor(name), tags: person.appearance, seed: person.seed, note: person.note, negative: person.negative, outfits: person.timeline.outfits, outfit: person.outfit, sprites: person.sprites }
          editVoice(gc.cast[name], person)
        })
        await store.updateGame(gameId, g => { delete g.cast[name] })
        break
      }
      case 'unglobal':
        await store.updateGlobalCast(gc => { delete gc.cast[name] })
        break
      case 'copy-local': {
        // 某局想让全局角色长得不一样：复制回本局即可覆盖（衣橱和立绘一起带过来）。
        const g0 = (await store.readGlobalCast()).cast[name]
        if (!g0) throw new Error('全局库里没有这个人物')
        await store.updateGame(gameId, g => {
          editPerson(g, name, { appearance: g0.tags || '', gender: g0.gender || '', note: g0.note || '', negative: g0.negative || '', voice: g0.voice || '', voicePitch: g0.voicePitch || 0, ...(Number.isInteger(g0.seed) ? { seed: g0.seed } : {}) })
          const look = looksOf(g, name)
          look.outfits = { ...(g0.outfits || {}), ...look.outfits }
          if (g0.outfit && !look.wear.some(e => Number(e.fromTurn) === 0)) look.wear.unshift({ fromTurn: 0, outfit: g0.outfit })
          look.sprites = { ...(g0.sprites || {}), ...look.sprites }
        })
        break
      }
      case 'global-save':
        await store.updateGlobalCast(gc => {
          const p = gc.cast[name] || (gc.cast[name] = { name, sprites: {}, color: nameColor(name) })
          const patch = input.patch || {}
          if (typeof patch.appearance === 'string') p.tags = patch.appearance
          for (const field of ['gender', 'note', 'negative']) if (typeof patch[field] === 'string') p[field] = patch[field].trim().slice(0, 1000)
          editVoice(p, patch)
          if (patch.seed === null || patch.seed === '') delete p.seed
          else if (Number.isInteger(Number(patch.seed)) && Number(patch.seed) >= 0) p.seed = Math.min(Number(patch.seed), 2 ** 31 - 1)
        })
        break
      case 'sprite': {
        // 画（或重画）一张差分：默认让立绘设计师重写提示词；给了 tags 就按玩家改好的词画。
        const edit = typeof input.tags === 'string' && input.tags.trim() ? { tags: input.tags, negative: input.negative || '' } : null
        const emotions = (Array.isArray(input.emotions) ? input.emotions : [input.emotion || 'neutral']).slice(0, 40)
        requestSprites(gameId, name, { turn, emotions, rewrite: input.rewrite !== false, edit }).catch(error => log('warn', `立绘失败（${name}）：${shortError(error)}`))
        break
      }
      case 'sprite-delete': {
        let old = []
        await store.updateGame(gameId, g => {
          const look = looksOf(g, name)
          old = recordAssets(look.sprites[input.key])
          delete look.sprites[input.key]
          delete look.spriteStatus[input.key]
        })
        await releaseAssets(gameId, old)
        break
      }
      case 'fill':
        result = { ok: true, ...(await fillMissing(gameId, { name, kinds: ['sprite'] })) }
        break
      case 'upload':
        await saveUpload(gameId, name, input.emotion, input.dataUrl, turn)
        break
      // 逆转式素材包：aa-pack 给一张差分导入（manifest 是 sprite.json 的内容，files 是文件名 → data URL）；aa-remove 取消
      case 'aa-pack':
        await saveAaPack(gameId, name, input.emotion, input.manifest, input.files, turn)
        break
      case 'aa-remove':
        await removeAaPack(gameId, name, String(input.key || ''))
        break
      default:
        throw new Error('未知操作')
    }
    notify(gameId)
    return result
  }

  /** 情绪库（所有对局共用）：玩家加、改描述、删掉导演加的。 */
  async function emotionAction(action, input = {}) {
    const id = emotionId(input.id)
    if (action === 'save') {
      if (!id || isBuiltinEmotion(id)) throw new Error('内置情绪不能改；新情绪写一个中文短语')
      await store.updateEmotions(lib => {
        mergeEmotions(lib, [{ name: id }], { source: 'user' })
        const entry = lib.list.find(e => e.id === id)
        if (typeof input.desc === 'string') entry.desc = input.desc.trim().slice(0, 200)
        if (typeof input.base === 'string') entry.base = isBuiltinEmotion(input.base) ? input.base : ''
      })
    } else if (action === 'delete') {
      await store.updateEmotions(lib => { lib.list = (lib.list || []).filter(e => e.id !== id) })
    } else throw new Error('未知的情绪库操作')
    notify('queue')
    return { list: (await store.readEmotions()).list }
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
    const presets = { styles: BUILTIN_STYLES }
    return { config: cfg, keys, ready: ready.ok, readyReason: ready.reason || '', secretStorage: secrets.storage(), presets, paths: { data: store.root, library: store.libraryRoot(cfg.images.libraryDir) } }
  }

  async function patchConfig(patch) {
    let before = []
    const next = await store.updateConfig(saved => {
      const old = resolveConfig(saved).style
      before = old.presets
      const merged = applyPatch(saved, patch)
      if (patch && typeof patch.style === 'object') {
        // 画风整节存成校验过的样子（旧版的画师串、按模型的质量词这时一并搬走）。样图只由「试画」改，浏览器传来的不算。
        merged.style = resolveConfig(merged).style
        const covers = new Map(old.presets.map(p => [p.id, p.cover]))
        for (const p of merged.style.presets) p.cover = covers.get(p.id) || ''
      }
      for (const k of Object.keys(saved)) delete saved[k]
      Object.assign(saved, merged)
    })
    configCache = resolveConfig(next)
    await dropCovers(before)
    return publicConfig()
  }

  /** 删掉的画风、换掉的样图：没有哪套画风还用着的样图文件删掉。 */
  async function dropCovers(previous) {
    const used = new Set(configCache.style.presets.map(p => p.cover).filter(Boolean))
    await Promise.all(previous.filter(p => p.cover && !used.has(p.cover)).map(p => store.removeAsset(p.cover).catch(() => {})))
  }

  /** 试画：用这套画风画一张固定内容、固定种子的样图，几套画风放在一起好比较。 */
  async function sampleStyle(styleId) {
    const cfg = await config()
    if (!cfg.style.presets.some(p => p.id === styleId)) throw new Error('没有这套画风')
    const ready = await backendReady(cfg)
    if (!ready.ok) throw new Error(ready.reason)
    const styled = withStyle(cfg, styleId)
    const prompt = composePrompt({ kind: 'cg', tags: cfg.style.sample, backend: cfg.images.backend, config: styled })
    const { width, height } = sizeFor(cfg, 'portrait')
    const assetId = await queue.enqueue('style:' + styleId, async signal => {
      const out = await generateImage({ backend: cfg.images.backend, config: styled, key: ready.key, signal, fetchImpl, prompt: prompt.positive, negative: prompt.negative, width, height, seed: SAMPLE_SEED })
      return store.saveAsset(out.bytes, out.mediaType)
    }, { onRetry: (error, n) => log('info', `限流重试 ${n}：${shortError(error)}`) })
    let before = []
    const next = await store.updateConfig(saved => {
      const style = resolveConfig(saved).style
      before = style.presets.map(p => ({ ...p }))
      const target = style.presets.find(p => p.id === styleId)
      if (target) target.cover = assetId
      saved.style = style
    })
    configCache = resolveConfig(next)
    await dropCovers([...before, { cover: assetId }])
    return { assetId, positive: prompt.positive, negative: prompt.negative }
  }

  /** 上传自己的音效：认格式（不信浏览器声明的类型），存进素材目录，这一种音效改用它；换下来的旧文件删掉。 */
  async function uploadSound(slot, bytes, fileName) {
    if (!SLOT_IDS.has(slot)) throw new Error('没有这种音效')
    if (!bytes || !bytes.length) throw new Error('文件是空的')
    if (bytes.length > MAX_SOUND_BYTES) throw new Error(`音效文件最大 ${MAX_SOUND_BYTES / 1048576} MB`)
    const type = sniffAudio(bytes)
    if (!type) throw new Error('认不出这个音频格式，支持 mp3、m4a、aac、ogg、opus、wav、flac')
    const assetId = await store.saveAsset(bytes, type)
    const name = String(fileName || '').replace(/[\u0000-\u001f]/g, '').trim().slice(0, 80)
    let old = ''
    const next = await store.updateConfig(saved => {
      const ui = (saved.ui = saved.ui && typeof saved.ui === 'object' ? saved.ui : {})
      ui.customSounds = { ...(ui.customSounds || {}) }
      old = ui.customSounds[slot]?.assetId || ''
      ui.customSounds[slot] = { assetId, name }
      ui.sounds = { ...(ui.sounds || {}), [slot]: 'custom' }
    })
    configCache = resolveConfig(next)
    if (old && old !== assetId) await store.removeAsset(old).catch(() => {})
    return publicConfig()
  }

  /** 删掉上传的音效：这一种退回默认版本。 */
  async function removeSound(slot) {
    if (!SLOT_IDS.has(slot)) throw new Error('没有这种音效')
    let old = ''
    const next = await store.updateConfig(saved => {
      const ui = saved.ui && typeof saved.ui === 'object' ? saved.ui : null
      old = ui?.customSounds?.[slot]?.assetId || ''
      if (ui?.customSounds) { ui.customSounds = { ...ui.customSounds }; delete ui.customSounds[slot] }
      if (ui?.sounds?.[slot] === 'custom') { ui.sounds = { ...ui.sounds }; delete ui.sounds[slot] }
    })
    configCache = resolveConfig(next)
    if (old) await store.removeAsset(old).catch(() => {})
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
    onTurnSettled, directTurn, gameView, planImages, fillMissing, renderCg, rewritePrompt, replanTurn, selectVersion, setImageUntil, deleteImage, addImageAt,
    ensurePlace: async (gameId, key) => {
      const game = await store.readGame(gameId)
      const place = game.places[key]
      if (!place) throw new Error('没有这个地点')
      ensurePlace(gameId, key, place, { force: true }).catch(() => {})
    },
    cancel: (gameId, kind, id) => (kind === 'director' ? stopDirector(gameId, id) : kind === 'cg' ? cancelCg(gameId, id) : queue.cancel(`${kind}:${gameId}:${id}`)),
    directorLog, directorEntry,
    castAction, emotionAction, emotions: async () => ({ list: (await store.readEmotions()).list }),
    publicConfig, patchConfig, uploadSound, removeSound, setSecret, testBackend, listModels, llmModels, removeGame,
    readAsset: id => store.readAsset(id),
    openLibrary: gameId => library.openFor(gameId),
    sampleStyle,
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn) },
    dispose() { disposed = true; queue.dispose(); for (const run of directorRuns.values()) run.controller.abort(); listeners.clear() },
  }
}
