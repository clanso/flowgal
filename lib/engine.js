// 每轮流程编排：
//   正文写完（Tavern 已流式显示给玩家）→ 切单元、挂「场景卡」占位 → 后台导演整理 →
//   更新角色档案（外貌、换装、长期状态）、情绪库 → 插画 / 背景 / 立绘排队生成 → 挂回正文、剧场里实时出现。
// 立绘：后台模型读完资料和全部剧情，为同一角色一批写差分提示词（服装 × 长期状态 × 情绪），同一个种子画。
// 插画：导演只挑瞬间，插画分镜师再读资料和剧情，写成 Base + 每人一个角色块；人名只当标签，出图前补上固定外貌。
import { segmentTurn, anchorFor } from './segment.js'
import { cleanTurnText } from './clean.js'
import { direct, scriptScenes, listenSounds, wantsListen } from './director.js'
import { writeCgPrompts, fallbackCg, resolveCgPrompt } from './illustrator.js'
import { applyPeople, settleShifts, castListAt, effectivePerson, personThen, rememberThenOutfits, allNames, expandMentions, editPerson, editLook, editVoice, editHeight, editActingNote, looksOf, rollback, nameColor } from './cast.js'
import { writeSpritePrompts, writeSpritesAndDesign, writeActing, writeActingNote, fallbackTags, variantLabel, writerBatch, designedTags, tagReport } from './sprites.js'
import { actingEmotions, actingFace, actingLevel, unplacedEmotions, cleanActing, completeActing } from './acting.js'
import { sheetOf, poseFor, slotKey, poseWalker, lineSteps, tokenFor, parseToken } from './poses.js'
import { emotionEntry, mergeEmotions, noteEmotionUsers, isBuiltinEmotion, cleanEmotionLib, resolveEmotion, mergedFrom, addEmotion, editEmotion, renameEmotion, resetEmotion, deleteEmotions, restoreBuiltins, mergeInto, saveCategory, deleteCategory, orderCategories, resetCategories, followMerge } from './emotions.js'
import { keyEmotion, lookKey, shortHash, cleanLookFields, lookTags, shiftsAhead, undoShifts } from './look.js'
import { playedUnits, unitSpeakers } from './staging.js'
import { lineFeelings, reactsOf } from './blocking.js'
import { layersByUnit, recallRuns, markRecalls, sceneEnd } from './scenes.js'
import { createLibrary, cgName, placeName, spriteName } from './library.js'
import { composePrompt, sizeFor, BUILTIN_STYLES, withStyle, currentStyle, SAMPLE_SEED, applyGuidance } from './image/style.js'
import { inpaintNovelAI, naiReferenceOk } from './image/novelai.js'
import { pngSize, maskPng, grayPng, decodePng, encodePng } from './image/png.js'
import { faceFor, swapFace, closeUpPrompt, faceBoxFrom, cleanFaceBox, padWhite } from './face.js'
import { useWordRules, LEGACY_PROMPTS } from './prompt-words.js'
import { promptView, promptItem, promptLast, editPrompt } from './prompt-book.js'
import { cropFor, resample, faceAlpha, maskPixel, blendSoft, shrinkBack, faceDrift, nextStrength, betterTry, referenceImage } from './face-paint.js'
import { NAI_MODELS, NAI_SAMPLERS, NAI_NOISE_SCHEDULES } from './image/nai-models.js'
import { generateImage, createQueue, secretRef, backendNeedsKey } from './image/index.js'
import { comfyModels, comfyStats } from './image/comfyui.js'
import { openaiModels } from './image/openai.js'
import { webuiModels } from './image/webui.js'
import { resolveConfig, applyPatch, imageConcurrency } from './config.js'
import { SLOT_IDS, MAX_SOUND_BYTES } from './sounds.js'
import { cleanPack, packFiles, packWithAssets, packStill, AA_PARTS, aaPrompt, cleanRects, stateRects } from './aa-sprite.js'
import { sniffAudio, sniffImage, fromBase64, toBase64, randomId, randomSeed } from './bytes.js'
import { createSecrets } from './secrets.js'
import { createChatLlm, chatModels, CHAT_PROVIDER } from './chat-llm.js'
import { placeKey, speakersOf, CG_SIZES, CG_MAX_CHARACTERS, fixedCgShape } from './vocab.js'
import { capOf } from './limits.js'

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
const INTERRUPTED = '中断了（可能是 DSH 重启过、酒馆页面关过），点一下重画'

// 导演日志：每局保留最近这么多次；每段提示词 / 输出最多存这么多字。
const DIRECTOR_LOG_KEEP = 30
const DIRECTOR_LOG_TEXT = 200000
const capText = text => {
  const s = String(text || '')
  return s.length > DIRECTOR_LOG_TEXT ? s.slice(0, DIRECTOR_LOG_TEXT) + `\n…（日志只保留前 ${DIRECTOR_LOG_TEXT} 字，原文共 ${s.length} 字）` : s
}
/** 分屏另一头出现过的人（他们不写进 cast，立绘一样要画）。 */
function splitPeople(script) {
  return Object.values(script?.lines || {}).flatMap(l => (l.split && l.split !== 'off' ? l.split.who : []))
}

/** 各次尝试的用量加总（只加数字字段，字段名照 DSH 给的）。 */
function sumUsage(attempts) {
  const total = {}
  for (const a of attempts) for (const [k, v] of Object.entries(a.usage || {})) if (Number.isFinite(v)) total[k] = (total[k] || 0) + v
  return Object.keys(total).length ? total : null
}
/** 导演日志的长轮询频道与对局视图分开：流式输出刷得勤，不该让整局视图跟着重读。 */
export const directorChannel = gameId => 'director:' + gameId
/** 等认脸的动作底图有变化时叫醒的频道（浏览器里开着 FlowGal 的页面就认，不用开剧场，见 src/client/theater/faceFramer.js）。 */
export const FACES_CHANNEL = 'faces'

// 一张差分额外的负面只用玩家自己写的：立绘设计师以前写进去的不再用（负面只要画风里带的）
const ownNegative = record => (record?.writer === 'user' ? record.negative || '' : '')
// 表情收着画只管设计师写的（和以前存下的）；玩家自己改的那张照写的画
const softened = record => record?.writer !== 'user'

export function createEngine({ store, services, logger = console, fetchImpl = fetch }) {
  const log = (level, msg) => { try { logger[level]?.(`[${PLUGIN}] ${msg}`) } catch {} }
  const secrets = createSecrets({ store, getCredentials: () => services.credentials })
  const library = createLibrary({ store, config: () => config(), log, open: services.openFolder })
  const toLibrary = (gameId, items) => library.save(gameId, items).catch(error => log('warn', '存进图片文件夹失败：' + shortError(error)))
  let configCache = null
  const directing = new Map() // textVersion → Promise
  const directorRuns = new Map() // textVersion → 正在跑的导演（日志实时输出、可停止）
  const listeners = new Set()
  const queue = createQueue({ concurrency: () => imageConcurrency(configCache), onChange: () => notify('queue') })
  const writing = new Set() // 正在写提示词的立绘（任务编号同出图队列）
  const designing = new Set() // 等着先设计动作与表情的立绘（任务编号同出图队列）
  const actingBusy = new Map() // 「对局\n名字」→ 正在设计（或排着队等设计）动作与表情的次数
  // 清空立绘：每个人清过几次（「对局\n名字」→ 次数；acting 只数连设计一起清的）。清空之前要的立绘、设计作废：停下来的、晚到的都不再写回。
  const cleared = { sprites: new Map(), acting: new Map() }
  /** 记下这个人现在清过几次；回的函数在那之后又清空过时为真。 */
  const sinceClear = (kind, gameId, name) => {
    const id = gameId + '\n' + name, n = cleared[kind].get(id) || 0
    return () => (cleared[kind].get(id) || 0) !== n
  }
  const CLEARED = '立绘已清空'
  // 立绘设计师一次读全部资料和剧情，请求很大：同一时间只跑一个。
  let writerTail = Promise.resolve()
  let disposed = false
  const oneWriter = fn => {
    const run = writerTail.then(() => { if (disposed) throw new Error('插件已停止'); return fn() })
    writerTail = run.catch(() => {})
    return run
  }

  function notify(gameId) { for (const fn of listeners) { try { fn(gameId) } catch {} } }

  /** 情绪库（所有对局共用）：{ list, categories }，老存档补上类别。 */
  const emotionLib = async () => cleanEmotionLib(await store.readEmotions())
  /** 这个人这套样子的这种情绪（在 ref 这个动作上，见 slotOf）画好了没有（并进它的情绪以前画好的也算）。 */
  const drawnAs = (person, emo, lib, sheet = null, ref = '') => [emo, ...mergedFrom(emo, lib)].some(e => person.sprites?.[slotOf(person, sheet, e, ref, lib).key]?.assetId)

  /**
   * 「这个动作里的这个情绪」在这个人身上存在哪个编号（lib/poses.js）：分动作时按 poseFor 找动作（ref 演不了这个情绪就用它的主动作），
   * 不分动作（sheet 为 null）时就是「…|情绪」。回 { pose（不分动作为 null）, key }。
   */
  function slotOf(person, sheet, emotion, ref, lib) {
    const pose = sheet ? poseFor(sheet, emotion, ref, lib) : null
    return { pose, key: slotKey(person?.sprites, person, sheet, pose?.id || '', emotion, lib) }
  }

  /** 这个人用哪套动作（lib/poses.js 的 sheetOf）：有设计用设计；通用动作组只在开着「表情只换脸」时用，不然没有设计的人每个情绪整张画。 */
  const sheetFor = (person, cfg) => sheetOf(person, faceMode(cfg) ? cfg.images.poseGroups : [])

  /** 跟剧场一样记着每个人此刻在哪个动作（lib/poses.js 的 poseWalker）：剧场的节拍和出图走同一套，「用到了才画」才对得上。 */
  function walkerFor(game, globalCast, cfg, lib) {
    const sheets = new Map()
    const sheet = name => { if (!sheets.has(name)) sheets.set(name, sheetFor(effectivePerson(game, globalCast, name), cfg)); return sheets.get(name) }
    return poseWalker(sheet, lib)
  }

  /**
   * 走一轮（剧场在 buildBeats 里一拍一拍走，规则相同）：说话的人按切分猜的补齐，react 的 * 按这一轮在场的人展开。
   * visit(第几个要演的单元, { name, emo, pose })：emo 是这个人这一刻的情绪（只点名换动作时是他原来的），pose 是走到的动作。
   */
  function walkTurn(walker, game, globalCast, scene, visit = null) {
    const script = markRecalls(scene.script, scene.units)
    if (!script) return
    const units = playedUnits(scene.units, script)
    const known = [...new Set([...(script.cast || []).map(c => c.name), ...allNames(game, globalCast)])]
    const onStage = [...new Set([...(script.cast || []).map(c => c.name), ...splitPeople(script)])]
    const speakers = unitSpeakers(units, script, known)
    units.forEach((u, i) => {
      const line = script.lines?.[u.id] || {}
      const who = speakersOf(speakers[i])
      for (const step of lineSteps(line, who, reactsOf(line, onStage, who))) {
        const pose = walker.step(step.name, step.emo, step.pose)
        visit?.(i, { name: step.name, emo: walker.emo(step.name), pose })
      }
    })
  }

  /** 走到 turn 这一轮开头：之前每一轮（同一轮有几份的用最新的那份），按轮次走一遍。 */
  function walkerBefore(game, globalCast, cfg, lib, turn) {
    const walker = walkerFor(game, globalCast, cfg, lib)
    const latest = new Map()
    for (const s of Object.values(game.scenes || {})) if (s.script && s.turn < turn && (!latest.has(s.turn) || s.at > latest.get(s.turn).at)) latest.set(s.turn, s)
    for (const s of [...latest.values()].sort((a, b) => a.turn - b.turn)) walkTurn(walker, game, globalCast, s)
    return walker
  }

  // 过滤规则（算不算表情、收轻哪些词……）跟着设置走：读到新设置就换上（lib/prompt-words.js）
  const settled = cfg => { useWordRules(cfg); return cfg }
  async function config() {
    if (!configCache) configCache = settled(resolveConfig(await store.readConfig()))
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

  /**
   * 插画分镜师、听音师用哪个模型（own 是设置里的 cgLlm / listenLlm，secret 是自定义接口的 Key 存在哪）：默认跟导演一样；
   * 也可以在宿主的模型里另选一个，或者接一个自己的 OpenAI 兼容接口（有的模型不肯写露骨的画面，分镜师可以单独换一个；
   * 听音师的活简单，可以换个便宜、快的）。没填全时 problem 写原因，那一步报错（分镜师按档案拼，听音师退回按正文对词）。
   */
  async function pickOwnModel(gameId, cfg, own, { secret, who, source }) {
    if (own.source === 'host' && own.provider && own.model) return { llm: services.llm, provider: own.provider, model: own.model, source }
    if (own.source === 'custom') {
      const problem = !own.baseURL ? `${who}的自定义接口还没填地址（设置 → 导演）` : !own.model ? `${who}的自定义接口还没填模型（设置 → 导演）` : ''
      const llm = createChatLlm({ baseURL: own.baseURL, key: await secrets.get(secretRef(secret)), contextWindow: own.contextWindow, fetchImpl })
      return { llm, provider: CHAT_PROVIDER, model: own.model, source: 'custom', problem }
    }
    return { llm: services.llm, ...(await pickModel(gameId, cfg)) }
  }
  const pickCgModel = (gameId, cfg) => pickOwnModel(gameId, cfg, cfg.director.cgLlm, { secret: 'cgllm', who: '插画分镜师', source: 'cg' })
  const pickListenModel = (gameId, cfg) => pickOwnModel(gameId, cfg, cfg.director.listenLlm, { secret: 'listenllm', who: '听音师', source: 'listen' })

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
      const run = { id: randomId(12), gameId, turn, textVersion, at: Date.now(), reason: force ? 'force' : 'auto', source: source || '', trace: { provider, model }, controller: new AbortController() }
      directorRuns.set(textVersion, run)
      // 流式输出时最多每 250ms 推一次日志面板，最后一段不会漏。
      let pushTimer = null
      const progress = () => { if (!pushTimer) pushTimer = setTimeout(() => { pushTimer = null; notify(directorChannel(gameId)) }, 250) }
      notify(directorChannel(gameId))
      let script = null, failure = null, joinedUnits = null
      try {
        ;({ script, units: joinedUnits } = await direct({
          llm: services.llm, provider, model, units, rawText: turnInfo.rawText || turnInfo.text || '',
          previous: await previousScript(game, turn),
          // 这一轮开头的样子：重新整理时不看上次整理记下的这一轮结束时的样子（不然以为发带一开头就缠着）
          castList: castListAt(game, globalCast, Math.max(0, turn - 1)),
          context, config: cfg, backend: cfg.images.backend, music: (await store.readMusic()).tracks, sounds: (await store.readSoundLib?.())?.sounds || [], emotions: (await emotionLib()),
          listener: await pickListenModel(gameId, cfg), poseGroups: sheetFor(null, cfg)?.poses || [],
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
          // 一轮中途变的样子（look）先跟 people 对齐：people 记这一轮结束时的样子
          const wardrobe = settleShifts(g, globalCast, script, turn)
          applyPeople(g, globalCast, script.people, turn)
          rememberThenOutfits(g, globalCast, [...Object.values(script.lines || {}).flatMap(l => l.then || []), ...wardrobe], turn)
          const scene = g.scenes[textVersion]
          scene.script = script
          // 导演把切错的单元合并回了一句：存合并后的单元，剧场、插画、锚点都按它来。
          if (joinedUnits) scene.units = joinedUnits
          scene.status = 'ready'
          scene.error = ''
          scene.summary = script.summary
        })
        // 新情绪进情绪库，并记下是谁在用：人物志里只挂在用过它的角色下面。
        if (script.emotions?.length || Object.values(script.lines || {}).some(l => lineFeelings(l).some(f => !isBuiltinEmotion(f.emo)))) {
          await store.updateEmotions(lib => { mergeEmotions(lib, script.emotions, { source: 'director', gameId, turn }); noteEmotionUsers(lib, script.lines) })
        }
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

  async function saveDirectorLog(run, { script = null, error, sprites = null, cgs = null, acting = null }) {
    const t = run.trace
    const entry = {
      id: run.id, kind: run.kind || 'director', name: run.name || '', summary: run.summary || '', sprites, cgs, acting,
      turn: run.turn, textVersion: run.textVersion, at: run.at, ms: Date.now() - run.at, reason: run.reason, source: run.source,
      status: error ? (run.controller.signal.aborted ? 'cancelled' : 'failed') : 'ok', error: error ? shortError(error) : '',
      provider: t.provider || '', model: t.model || '', window: t.window || 0, outputDefault: t.outputDefault || 0,
      maxTokens: t.maxTokens || 0, temperature: t.temperature ?? null, contextLength: t.contextLength || 0, contextChars: t.contextChars || 0, notes: t.notes || [],
      storyLength: t.storyLength || 0, storyChars: t.storyChars || 0,
      system: capText(t.system), user: capText(t.user),
      attempts: (t.attempts || []).map(a => ({ ...a, output: capText(a.output), reasoning: capText(a.reasoning) })),
      listen: t.listen ? { ...t.listen, system: capText(t.listen.system), user: capText(t.listen.user), output: capText(t.listen.output), reasoning: capText(t.listen.reasoning) } : null,
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
    // 听音师在导演之前跑：还没开始整理时，实时输出放它的
    const listen = t.listen || null
    const last = attempts.at(-1) || (running && listen ? { ...listen, note: '先听一遍：列出这一轮听得见的声音' } : null)
    return {
      id: e.id, kind: e.kind || 'director', name: e.name || '', turn: e.turn, at: e.at, ms: running ? Date.now() - e.at : e.ms, reason: e.reason, source: e.source,
      status: running ? 'running' : e.status, error: e.error || '',
      provider: t.provider || '', model: t.model || '', maxTokens: t.maxTokens || 0, window: t.window || 0, notes: t.notes || [],
      attempts: attempts.length, usage: sumUsage(listen ? [listen, ...attempts] : attempts), summary: e.script?.summary || e.summary || '',
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
    if (turnInfo?.gameId) scanFaces(turnInfo.gameId).catch(() => {}) // 重启前就在等认脸的，玩家接着玩时接上
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
      const kept = new Map()
      for (const plan of script.images) {
        const already = Object.values(game.images || {}).find(i => i.textVersion === textVersion && !i.retired && samePlan(i, plan))
        // 重新整理同一版正文：已有的这张不重画，只跟着新脚本改收起的位置和出现、收起的方式。
        if (already) { kept.set(already.id, plan); continue }
        ids.push(await createCg(gameId, scene, plan))
      }
      if (kept.size) await store.updateGame(gameId, g => { for (const [id, plan] of kept) if (g.images[id]) Object.assign(g.images[id], { until: plan.until || '', untilByUser: false, enter: plan.enter || '', leave: plan.leave || '', motion: plan.motion || '', ...(plan.nsfw ? { nsfw: true } : {}) }) })
      drawCgs(gameId, ids).catch(error => log('warn', '插画失败：' + shortError(error)))
      queued += ids.length
    }
    // 这一轮出现过的每个场景都要背景：开场的、中途换过去的地方、天色变了以后的、回忆梦境这些段落里的
    if (cfg.images.backgrounds) {
      for (const place of new Map(scriptScenes(script).filter(s => s.bg).map(s => [placeKey(s), s])).values()) {
        const key = placeKey(place)
        const known = game.places?.[key]
        if (!known?.assetId && known?.status !== 'running') { ensurePlace(gameId, key, place).catch(() => {}); queued++ }
      }
    }
    if (cfg.images.portraits || cfg.images.expressions) {
      // 立绘：登场、换装、长期状态变了时补这一套的平静立绘；用到这一套还没有的情绪时补差分（每轮有上限）。
      const globalCast = await store.readGlobalCast()
      const emotions = await emotionLib()
      const want = new Map()
      // 同一个人同一套样子（现在的、段落里当时的）一起要
      const need = ({ name, emo, pose, then, mode }) => {
        const person = personThen(effectivePerson(game, globalCast, name, scene.turn), then)
        if (!person?.appearance || drawnAs(person, emo, emotions, sheetFor(person, cfg), pose)) return false
        const id = name + '\n' + lookKey(person)
        const entry = want.get(id) || want.set(id, { name, then, mode, emotions: new Set() }).get(id)
        // 「情绪」或「情绪@动作」（lib/poses.js）
        const token = pose ? `${emo}@${pose}` : emo
        if (entry.emotions.has(token)) return false
        entry.emotions.add(token)
        return true
      }
      const wants = await spriteWants(game, scene)
      if (cfg.images.portraits) for (const w of wants) if (w.portrait) need(w)
      if (cfg.images.expressions) {
        // 每轮补几张：设置里没限就不限，这一轮用到的都画
        let budget = capOf(cfg.images.expressionsPerTurn)
        for (const w of wants) if (!w.portrait && budget > 0 && need(w)) budget--
      }
      for (const { name, then, mode, emotions } of want.values()) {
        requestSprites(gameId, name, { turn: scene.turn, emotions: [...emotions], then, mode }).catch(error => log('warn', `立绘失败（${name}）：${shortError(error)}`))
        queued += emotions.size
      }
    }
    return { queued }
  }

  /**
   * 每个要演的单元所在的段落（{ mode, then }，不在段落里为 null）；上一轮结束时还在、这一轮接着演的段落也算上。
   * script 是补上了正文里框起来的闪回（markRecalls）的脚本，跟剧场演的一样。
   */
  async function sceneLayers(game, scene) {
    const script = markRecalls(scene.script, scene.units)
    const units = playedUnits(scene.units, script)
    const carry = sceneEnd(await previousScript(game, scene.turn))?.layer || null
    // 短闪回不换场景，但里面的人跟回忆一样按当时的样子：当成一个回忆段落给立绘、插画用
    const recalls = recallRuns(script, units)
    const layers = layersByUnit(script, units, carry).map((layer, i) => (recalls[i] ? { mode: 'memory', then: recalls[i].then, recall: recalls[i] } : layer))
    // 一轮中途变的样子：每一句还没发生的变化
    const ahead = shiftsAhead(units.map(u => script?.lines?.[u.id] || {}))
    return { units, layers, ahead, script }
  }

  /**
   * 这一句里这个人要按什么样子画（叠在这一轮的样子上的 then 和它的段落）：段落里导演写了当时的样子就按当时的；
   * 不然这一轮中途的变化（戴上发带、换衣服）还没发生时，按变化之前的样子（mode 记 earlier）；都不是为 null。
   */
  function thenAt(game, globalCast, scene, layer, pending, name) {
    const then = layer?.then?.[name]
    if (then) return { then, mode: layer.mode }
    if (!pending?.[name]) return null
    const person = effectivePerson(game, globalCast, name, scene.turn)
    const undo = person && undoShifts(person, pending[name])
    return undo ? { then: undo, mode: 'earlier' } : null
  }

  /**
   * 这一轮要用到的立绘：[{ name, emo, pose, then, mode, portrait }]，按正文顺序（没去重）。
   * 现实里在场的人（含分屏另一头）各要一张平静的；段落里导演写了当时样子的人，按当时的样子各要一张平静的；
   * 有情绪的句子按说话人那时的样子要这个情绪（在段落里、写了当时的样子就是当时的）。
   * pose 是剧场里这一句他所在的动作（跟剧场一样从第一轮一句一句走过来，身子不动只换脸；是这个情绪的主动作时为 ''）：
   * 哪个「动作 × 情绪」真用到了才要哪张。walker 给了就接着它走（补图时按轮次一轮一轮传下去），不给就先走完之前的每一轮。
   */
  async function spriteWants(game, scene, walker = null) {
    const { units, layers, ahead, script } = await sceneLayers(game, scene)
    const globalCast = await store.readGlobalCast()
    const cfg = await config()
    const lib = await emotionLib()
    const walk = walker || walkerBefore(game, globalCast, cfg, lib, scene.turn)
    const onStage = new Set([...script.cast.map(c => c.name), ...splitPeople(script)])
    const out = [...onStage].map(name => ({ name, emo: 'neutral', pose: '', then: null, mode: '', portrait: true }))
    for (const layer of new Set(layers)) for (const then of Object.values(layer?.then || {})) out.push({ name: then.name, emo: 'neutral', pose: '', then, mode: layer.mode, portrait: true })
    // 短闪回里开口的人浮在前面：没写当时样子的按现在的样子
    for (const layer of new Set(layers)) for (const name of layer?.recall?.who || []) if (!layer.then[name]) out.push({ name, emo: 'neutral', pose: '', then: null, mode: '', portrait: true })
    // 这一轮中途变了样子的人：变化之前的那一套也要一张平静的
    for (const pending of new Set(ahead)) {
      for (const name of Object.keys(pending || {})) {
        const t = onStage.has(name) ? thenAt(game, globalCast, scene, null, pending, name) : null
        if (t) out.push({ name, emo: 'neutral', pose: '', then: t.then, mode: t.mode, portrait: true })
      }
    }
    // 说话的人的表情，和没说话的人的反应（react，写 * 的按这一轮在场的人算）；导演点名换了动作的，在新动作上的这张脸
    const sheets = new Map()
    const sheetOfName = name => { if (!sheets.has(name)) sheets.set(name, sheetFor(effectivePerson(game, globalCast, name, scene.turn), cfg)); return sheets.get(name) }
    walkTurn(walk, game, globalCast, scene, (i, { name: who, emo, pose }) => {
      const e = resolveEmotion(emo, lib) || emo
      // 主动作就不写动作（那张是「…|情绪」）
      const at = parseToken(tokenFor(sheetOfName(who), e, pose, lib)).pose
      if (e === 'neutral' && !at) return
      const t = thenAt(game, globalCast, scene, layers[i], ahead[i], who)
      if (t || onStage.has(who) || layers[i]?.recall) out.push({ name: who, emo: e, pose: at, then: t?.then || null, mode: t?.mode || '', portrait: false })
    })
    // 老剧本里并掉的情绪按并进去的那个画
    return out.map(w => ({ ...w, emo: resolveEmotion(w.emo, lib) || w.emo }))
  }

  /** 一张插画挂的那一句里人的样子（{ mode, then }）：所在的段落；这一轮中途的变化还没发生的人按变化之前的（mode 为 earlier）。都没有为 null。 */
  async function imageLayer(game, image) {
    const scene = game.scenes?.[image.textVersion]
    if (!scene?.script) return null
    const { units, layers, ahead } = await sceneLayers(game, scene)
    // 挂在不演的单元上的：算到它前面最近一个要演的单元（跟剧场一样）
    const played = new Map(units.map((u, i) => [u.id, i]))
    const all = scene.units || []
    let k = all.findIndex(u => u.id === image.after)
    while (k >= 0 && !played.has(all[k].id)) k--
    const i = k >= 0 ? played.get(all[k].id) : units.length - 1
    const layer = layers[i] || null
    // 这一轮中途的变化在这一句还没发生的人：按变化之前的样子画
    const pending = ahead[i]
    if (!pending) return layer
    const globalCast = await store.readGlobalCast()
    const then = { ...(layer?.then || {}) }
    for (const name of Object.keys(pending)) if (!then[name]) { const t = thenAt(game, globalCast, scene, null, pending, name); if (t) then[name] = t.then }
    return Object.keys(then).length ? { ...(layer || {}), mode: layer?.mode || 'earlier', then } : layer
  }

  /** 记下一张要画的插画、在正文里挂好占位；画由 drawCgs 负责（还没有提示词的先交给插画分镜师）。 */
  async function createCg(gameId, scene, plan) {
    const id = crypto.randomUUID().slice(0, 12)
    const anchor = anchorFor(scene.units, plan.after)
    const written = Boolean(plan.tags || plan.characters?.length)
    // 设置里定了插画方向的，自动配的都按它；玩家自己加的照他选的
    const shape = (plan.source === 'user' ? '' : fixedCgShape(await config())) || plan.shape || 'landscape'
    let mediaId = null
    try {
      const res = await tavern().attach({ gameId, turn: scene.turn, textVersion: scene.textVersion, item: { kind: KIND_CG, status: 'pending', anchor, caption: plan.title || '', data: { imageId: id, shape, ...(written ? {} : { writing: true }) } } })
      mediaId = res?.id || null
    } catch (error) { log('warn', '挂插画占位失败：' + shortError(error)) }
    await store.updateGame(gameId, g => {
      g.images[id] = {
        id, kind: 'cg', turn: scene.turn, textVersion: scene.textVersion, mediaId, after: plan.after, until: plan.until || '', anchor, title: plan.title || '',
        moment: plan.moment || '', who: plan.who || [], tags: plan.tags || '', desc: plan.desc || '', characters: plan.characters || [], shape,
        enter: plan.enter || '', leave: plan.leave || '', motion: plan.motion || '', nsfw: Boolean(plan.nsfw),
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
    // 设置里定了插画方向的：自动配的插画照它画（玩家自己加的、按意见改词的照原来的）
    const fixedShapeOf = image => (instruction || image.source === 'user' ? '' : fixedCgShape(cfg))
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
        // 挂在回忆、梦境这类段落里的、这一轮中途变样子之前的：画面里的人按当时的样子画
        const layers = new Map()
        for (const i of list) layers.set(i.id, await imageLayer(game, i))
        const thenPeople = layer => Object.values(layer?.then || {}).map(t => personThen(effectivePerson(game, globalCast, t.name, scene.turn), t)).filter(Boolean)
        const targets = list.map(i => {
          const layer = layers.get(i.id)
          const era = layer?.then ? { mode: layer.mode, people: thenPeople(layer) } : null
          return { key: i.id, after: i.after, title: i.title, moment: i.moment, who: i.who || [], ...(i.nsfw ? { nsfw: true } : {}), ...(fixedShapeOf(i) ? { shape: fixedShapeOf(i) } : {}), ...(era?.people.length ? { era } : {}), ...(instruction ? { instruction, current: i } : {}) }
        })
        let results = new Map()
        try { results = await oneWriter(() => runCgWriter(gameId, scene, targets, cfg)) } catch (error) {
          if (/已手动停止/.test(error?.message)) throw error
          log('warn', '插画分镜失败，按档案拼：' + shortError(error))
        }
        for (const image of list) {
          const then = layers.get(image.id)?.then
          const lookup = name => personThen(effectivePerson(game, globalCast, name, scene.turn), then?.[name])
          drafts.set(image.id, results.get(image.id) || (instruction ? null : fallbackCg(image, lookup, scene.script?.scene)))
        }
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
          Object.assign(img, { tags: d.tags, desc: d.desc, characters: d.characters, shape: fixedShapeOf(img) || d.shape, nsfw: Boolean(img.nsfw || d.nsfw), writer: d.writer, writtenAt: Date.now(), status: 'queued' })
        }
      })
      jobs.forEach(j => writing.delete(j))
      notify(gameId)
    }
    return drafts
  }

  /** 插画分镜师跑一次：读资料、此前的剧情、这一轮正文和相关人物的档案。跑的过程记进导演日志（可看实时输出、可停止）。 */
  /** 插画分镜师要读的：资料、此前的剧情、这一轮正文、相关人物的档案、已经画过的插画。 */
  async function cgInputs(gameId, scene, targets) {
    const game = await store.readGame(gameId)
    const globalCast = await store.readGlobalCast()
    let context = null
    try { context = await services.tavern?.getCardContext?.({ gameId, turn: scene.turn }) } catch {}
    const story = await storyTurns(gameId, scene.turn - 1)
    // 相关人物：要入画的、这一幕在场的、说过话的；都没有档案时给全部档案。
    const script = scene.script || {}
    const wanted = new Set([...targets.flatMap(t => t.who || []), ...(script.cast || []).map(c => c.name), ...Object.values(script.lines || {}).flatMap(l => speakersOf(l.sp))])
    const everyone = castListAt(game, globalCast, scene.turn).filter(p => p.appearance)
    const people = everyone.filter(p => wanted.has(p.name))
    // 这一局已经画过的插画：给分镜师对齐时代锚和衣服指纹。
    const references = Object.values(game.images || {})
      .filter(i => !targets.some(t => t.key === i.id) && (i.characters?.length || i.tags) && i.versions?.length)
      .sort((a, b) => b.turn - a.turn || b.at - a.at)
      .slice(0, 3)
      .map(i => ({ label: `第 ${i.turn} 轮「${i.title || '插画'}」`, tags: i.tags, desc: i.desc, characters: i.characters || [] }))
    return { context, story, people: people.length ? people : everyone.slice(0, 12), references, units: playedUnits(scene.units, scene.script) }
  }

  /** 这一轮导演挑的插画排成给分镜师的那几条（writeCgs 里同样的写法；预览用，不看画幅设置和回忆段落）。 */
  const cgTargetsOf = images => images.map(i => ({ key: i.id, after: i.after, title: i.title, moment: i.moment, who: i.who || [], ...(i.nsfw ? { nsfw: true } : {}) }))

  async function runCgWriter(gameId, scene, targets, cfg) {
    const { llm, provider, model, source, problem: unready } = await pickCgModel(gameId, cfg)
    const { context, story, people, references, units } = await cgInputs(gameId, scene, targets)
    const run = {
      id: randomId(12), kind: 'cg', name: '', keys: targets.map(t => t.key), gameId, turn: scene.turn, textVersion: scene.textVersion, at: Date.now(), reason: 'cg', source: source || '',
      summary: `插画提示词 · 第 ${scene.turn} 轮：${targets.map(t => t.title || t.moment || '插画').join('、')}`.slice(0, 120),
      trace: { provider, model }, controller: new AbortController(),
    }
    directorRuns.set('cg:' + run.id, run)
    let pushTimer = null
    const progress = () => { if (!pushTimer) pushTimer = setTimeout(() => { pushTimer = null; notify(directorChannel(gameId)) }, 250) }
    notify(directorChannel(gameId))
    let results = null, failure = null
    try {
      if (unready) throw new Error(unready)
      results = await writeCgPrompts({
        llm, provider, model, config: cfg, backend: cfg.images.backend, context, story, turn: scene.turn, units,
        people, targets, references, signal: run.controller.signal, trace: run.trace, onProgress: progress,
      })
    } catch (error) { failure = run.controller.signal.aborted ? new Error('已手动停止') : error }
    clearTimeout(pushTimer)
    directorRuns.delete('cg:' + run.id)
    const cgs = targets.map(t => ({ key: t.key, label: t.title || t.moment || '插画', ...(t.nsfw ? { nsfw: true } : {}), ...(results?.get(t.key) || {}) }))
    const problem = failure || (run.trace.error ? new Error(run.trace.error + '（已按档案拼了一份）') : null)
    await saveDirectorLog(run, { error: problem, cgs }).catch(error => log('warn', '写导演日志失败：' + shortError(error)))
    notify(directorChannel(gameId))
    if (failure) throw failure
    return results
  }

  /** 玩家在改词里改过的角色块：只收 name / tag / nl 三个字符串。 */
  const cleanCharacters = list => (Array.isArray(list) ? list : []).slice(0, CG_MAX_CHARACTERS)
    .map(c => ({ name: String(c?.name || '').trim().slice(0, 24), tag: String(c?.tag || '').slice(0, 2000), nl: String(c?.nl || '').slice(0, 1600) }))
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
    if (typeof overrides.nsfw === 'boolean') changed.nsfw = overrides.nsfw
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
        const then = (await imageLayer(game, image))?.then
        const lookup = n => personThen(effectivePerson(game, globalCast, n, image.turn), then?.[n])
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

  /** 已经画好的同一套固定外貌的立绘：给设计师对齐写法。 */
  function spriteReferences(person, targets, custom) {
    const prefix = shortHash(person.appearance) + '|'
    return Object.entries(person.sprites || {})
      .filter(([key, r]) => key.startsWith(prefix) && r?.tags && r.assetId && r.writer !== 'fallback' && !r.face && !targets.some(t => t.key === key))
      .slice(-4)
      .map(([, r]) => ({ label: variantLabel({ outfit: r.outfit, states: (r.states || []).map(n => ({ name: n })), emotion: r.emotion }, custom), tags: r.tags }))
  }

  /**
   * 导演日志里的一张差分：设计师写的（raw）、实际发出的（sent），去掉了哪些词、换掉了哪些（lib/sprites.js 的 tagReport）。
   * 先设计再写的那条（design）要等设计定了动作才知道怎么收，先只记原样。
   */
  const spriteRow = (t, result, person, custom) => {
    const report = result?.raw && !t.design ? tagReport(result.raw, t, person, custom) : null
    return {
      key: t.key, emotion: t.emotion, label: t.design ? `先设计再写 · ${emotionEntry(t.emotion, custom).label}` : variantLabel(t, custom), pose: t.poseLabel || '', ...(result || {}),
      ...(report ? { sent: report.sent, removed: report.removed, replaced: report.replaced } : {}),
    }
  }

  /**
   * 立绘设计师：读资料、全部剧情和档案，为一批差分写提示词。跑的过程记进导演日志（可看实时输出、可停止）。
   * design（{ emotions, current }）给了就是补设计合进写词这一次：回 { results, sheet, logId }，不然回 results。
   */
  async function runSpriteWriter(gameId, name, person, targets, turn, cfg, custom, design = null) {
    const { provider, model, source } = await pickModel(gameId, cfg)
    let context = null
    try { context = await services.tavern?.getCardContext?.({ gameId, turn }) } catch {}
    const story = await storyTurns(gameId, turn)
    const references = spriteReferences(person, targets, custom)
    // 同一身衣服、同一种情绪在两个动作上各有一张：带上动作名，不然看着像写重了
    const drawn = targets.filter(t => !t.design)
    const plain = drawn.map(t => variantLabel(t, custom))
    const labels = plain.map((l, i) => plain.indexOf(l) !== plain.lastIndexOf(l) && drawn[i].poseLabel ? `${l}（${drawn[i].poseLabel}）` : l)
    const run = {
      id: randomId(12), kind: 'sprite', name, gameId, turn, textVersion: '', at: Date.now(), reason: 'sprite', source: source || '',
      summary: (design
        ? `补设计并写立绘 · ${name}：补 ${design.emotions.map(e => emotionEntry(e, custom).label).join('、')}${labels.length ? `；另写 ${labels.join('、')}` : ''}`
        : `立绘提示词 · ${name}：${labels.join('、')}`).slice(0, 120),
      trace: { provider, model }, controller: new AbortController(),
    }
    directorRuns.set('sprite:' + run.id, run)
    let pushTimer = null
    const progress = () => { if (!pushTimer) pushTimer = setTimeout(() => { pushTimer = null; notify(directorChannel(gameId)) }, 250) }
    notify(directorChannel(gameId))
    let results = null, sheet = null, failure = null
    try {
      const args = {
        llm: services.llm, provider, model, config: cfg, backend: cfg.images.backend, context, story, turn, person, targets, references, custom,
        signal: run.controller.signal, trace: run.trace, onProgress: progress,
      }
      if (design) ({ results, sheet } = await writeSpritesAndDesign({ ...args, design }))
      else results = await writeSpritePrompts(args)
    } catch (error) { failure = run.controller.signal.aborted ? new Error('已手动停止') : error }
    clearTimeout(pushTimer)
    directorRuns.delete('sprite:' + run.id)
    const sprites = targets.map(t => spriteRow(t, results?.get(t.key), person, custom))
    const problem = failure || (run.trace.error ? new Error(run.trace.error + (design ? '（设计照已有的，没写出来的再要一次）' : '（已按档案拼了一份）')) : null)
    await saveDirectorLog(run, { error: problem, sprites, acting: sheet }).catch(error => log('warn', '写导演日志失败：' + shortError(error)))
    notify(directorChannel(gameId))
    if (failure) throw failure
    return design ? { results, sheet, logId: run.id } : results
  }

  /** 动作与表情设计这一步：读资料、全部剧情和档案，给这个人设计动作表和表情表（current 给了就是往里补）。跑的过程记进导演日志。 */
  async function runActingWriter(gameId, name, person, emotions, current, turn, cfg, custom) {
    const { provider, model, source } = await pickModel(gameId, cfg)
    let context = null
    try { context = await services.tavern?.getCardContext?.({ gameId, turn }) } catch {}
    const story = await storyTurns(gameId, turn)
    const what = current ? `补上 ${emotions.map(e => emotionEntry(e, custom).label).join('、')}` : `整套设计（${emotions.length} 种情绪）`
    const run = {
      id: randomId(12), kind: 'acting', name, gameId, turn, textVersion: '', at: Date.now(), reason: 'acting', source: source || '',
      summary: `动作与表情 · ${name}：${what}`.slice(0, 120),
      trace: { provider, model }, controller: new AbortController(),
    }
    directorRuns.set('acting:' + run.id, run)
    let pushTimer = null
    const progress = () => { if (!pushTimer) pushTimer = setTimeout(() => { pushTimer = null; notify(directorChannel(gameId)) }, 250) }
    notify(directorChannel(gameId))
    let sheet = null, failure = null
    try {
      sheet = await writeActing({
        llm: services.llm, provider, model, config: cfg, backend: cfg.images.backend, context, story, turn, person, emotions, current, custom,
        signal: run.controller.signal, trace: run.trace, onProgress: progress,
      })
    } catch (error) { failure = run.controller.signal.aborted ? new Error('已手动停止') : error }
    clearTimeout(pushTimer)
    directorRuns.delete('acting:' + run.id)
    const fallback = current ? '（先按已有的设计画）' : '（先按通用动作组画）'
    const problem = failure || (!sheet ? new Error((run.trace.error || '没有写出能用的设计') + fallback) : run.trace.error ? new Error(run.trace.error) : null)
    await saveDirectorLog(run, { error: problem, acting: sheet }).catch(error => log('warn', '写导演日志失败：' + shortError(error)))
    notify(directorChannel(gameId))
    if (failure && run.controller.signal.aborted) throw failure
    if (failure) log('warn', `动作与表情设计失败（${name}）：${shortError(failure)}`)
    return sheet
  }

  /** 这一局里这个人说话时用过的情绪（齐声说的算每个人）。 */
  function usedEmotions(game, name) {
    const used = new Set()
    for (const scene of Object.values(game.scenes || {})) {
      const cast = (scene.script?.cast || []).map(c => c.name)
      for (const line of Object.values(scene.script?.lines || {})) for (const f of lineFeelings(line, cast)) if (f.name === name) used.add(f.emo)
    }
    return [...used]
  }

  /**
   * 保证这个人有动作与表情设计、并且盖住要画的情绪：还没有（或 full 重新设计）就读完资料和剧情设计整套，
   * 有但缺了几个情绪就补进去，redo 的情绪重新设计表情。排在写词的队里，同一个人不会同时设计两次。
   * 设计不出来时回已有的（或 null），出图照常走（按已有的设计或通用动作组）。
   */
  function ensureActing(gameId, name, { turn = Infinity, emotions = [], redo = [], full = false } = {}) {
    const id = gameId + '\n' + name
    const stale = sinceClear('acting', gameId, name)
    actingBusy.set(id, (actingBusy.get(id) || 0) + 1)
    notify(gameId)
    const done = oneWriter(async () => {
      if (stale()) return null
      const cfg = await config()
      const game = await store.readGame(gameId)
      const person = effectivePerson(game, await store.readGlobalCast(), name, turn)
      if (!person) throw new Error('没有这个人物')
      const custom = (await emotionLib())
      const current = !full && person.acting?.poses?.length ? person.acting : null
      const wanted = emotions.map(e => resolveEmotion(e, custom)).filter(Boolean)
      let list
      if (current) {
        list = [...new Set([...unplacedEmotions(current, wanted), ...redo.map(e => resolveEmotion(e, custom)).filter(Boolean)])]
        if (!list.length) return current
      } else {
        list = actingEmotions(name, custom, { used: usedEmotions(game, name), drawn: Object.keys(person.sprites || {}).map(keyEmotion), extra: wanted })
      }
      const at = Number.isFinite(turn) ? turn : latestTurn(game)
      const sheet = await runActingWriter(gameId, name, person, list, current, at, cfg, custom)
      if (stale()) return null // 设计中途连设计一起清空了：不写回
      if (!sheet) return current
      // 往玩家改过的设计里补情绪：还算玩家改过的（清空时默认留着它）；整套重新设计才换成设计师的
      const by = current?.by === 'user' ? 'user' : 'ai'
      // readTurn：表演笔记是读到第几轮写的（补设计不重写它，还是原来那轮）
      const readTurn = current ? (current.readTurn ?? current.turn ?? null) : at
      await store.updateGame(gameId, g => { looksOf(g, name).acting = { ...sheet, at: Date.now(), turn: at, readTurn, by } })
      return sheet
    })
    const settle = () => { const n = (actingBusy.get(id) || 1) - 1; if (n > 0) actingBusy.set(id, n); else actingBusy.delete(id); notify(gameId) }
    done.then(settle, settle)
    return done
  }

  /**
   * 「让设计师重写」表演笔记：重新读一遍资料、剧情和档案，只重写这一条（动作和表情不动），写进设计里（acting.read）。
   * replace：玩家写过的那条先去掉（玩家在界面上确认过要换掉）。还没有设计时直接设计整套（整套里也写表演笔记）。
   * 跟设计排在同一个队里；人物志里显示「设计中」。
   */
  function rewriteActingNote(gameId, name, { replace = false } = {}) {
    const id = gameId + '\n' + name
    const stale = sinceClear('acting', gameId, name)
    actingBusy.set(id, (actingBusy.get(id) || 0) + 1)
    notify(gameId)
    const done = (async () => {
      if (replace) await dropActingNote(gameId, name)
      const first = effectivePerson(await store.readGame(gameId), await store.readGlobalCast(), name)
      if (!first) throw new Error('没有这个人物')
      if (!first.acting?.poses?.length) return (await ensureActing(gameId, name, { full: true }))?.read || ''
      return oneWriter(async () => {
        if (stale()) return ''
        // 排队等的时候设计可能又变过：轮到了再读
        const game = await store.readGame(gameId)
        const person = effectivePerson(game, await store.readGlobalCast(), name)
        if (!person?.acting?.poses?.length) return ''
        const cfg = await config()
        const custom = (await emotionLib())
        const turn = latestTurn(game)
        const { provider, model, source } = await pickModel(gameId, cfg)
        let context = null
        try { context = await services.tavern?.getCardContext?.({ gameId, turn }) } catch {}
        const story = await storyTurns(gameId, turn)
        const run = {
          id: randomId(12), kind: 'acting', name, gameId, turn, textVersion: '', at: Date.now(), reason: 'acting', source: source || '',
          summary: `表演笔记 · ${name}：重写`.slice(0, 120), trace: { provider, model }, controller: new AbortController(),
        }
        directorRuns.set('acting:' + run.id, run)
        notify(directorChannel(gameId))
        let read = '', failure = null
        try {
          read = await writeActingNote({
            llm: services.llm, provider, model, config: cfg, backend: cfg.images.backend, context, story, turn, person, current: person.acting, custom,
            signal: run.controller.signal, trace: run.trace, onProgress: () => notify(directorChannel(gameId)),
          })
        } catch (error) { failure = run.controller.signal.aborted ? new Error('已手动停止') : error }
        directorRuns.delete('acting:' + run.id)
        await saveDirectorLog(run, { acting: read ? { read, poses: [] } : null, error: failure || (!read ? new Error(run.trace.error || '没有写出表演笔记') : null) }).catch(error => log('warn', '写导演日志失败：' + shortError(error)))
        notify(directorChannel(gameId))
        if (failure) throw failure
        if (!read || stale()) return ''
        await store.updateGame(gameId, g => {
          const look = looksOf(g, name)
          // 全局角色这一局还没有自己的设计时，从全局库带来的那份上改
          const base = look.acting || person.acting
          look.acting = { ...base, read, readTurn: turn, at: Date.now() }
        })
        return read
      })
    })()
    const settle = () => { const n = (actingBusy.get(id) || 1) - 1; if (n > 0) actingBusy.set(id, n); else actingBusy.delete(id); notify(gameId) }
    done.then(settle, settle)
    return done
  }

  /** 去掉玩家写的表演笔记（本局档案或全局档案里的）：回到设计师起草的那条。 */
  async function dropActingNote(gameId, name) {
    const game = await store.readGame(gameId)
    if (game.cast?.[name]) await store.updateGame(gameId, g => { if (g.cast?.[name]) delete g.cast[name].actingNote })
    else await store.updateGlobalCast(gc => { if (gc.cast?.[name]) delete gc.cast[name].actingNote })
  }

  /** stale 给了、并且在那之后清空过立绘时不写（清空之前要的，状态也不再写回）。 */
  async function markSprites(gameId, name, keys, status, error = '', stale = null) {
    let was = false
    await store.updateGame(gameId, g => {
      if (stale?.()) return
      const look = looksOf(g, name)
      for (const key of keys) {
        if (look.spriteStatus[key]?.status === 'face') was = true
        if (status === 'ready') delete look.spriteStatus[key]
        else look.spriteStatus[key] = { status, error }
      }
    })
    notify(gameId)
    if (status === 'face' || was) await scanFaces(gameId).catch(() => {})
  }

  // 等认脸的动作底图（所有对局）：{ gameId, name, key, assetId }。认脸模型只能在浏览器里跑，
  // 浏览器里只要开着 FlowGal 的页面（聊天页也行，不用开剧场）就来取（facesWaiting），认出来交回 setFaceBox。
  const faceWaits = new Map()
  async function scanFaces(gameId) {
    const game = await store.readGame(gameId)
    const globalCast = await store.readGlobalCast()
    const found = new Map()
    for (const name of Object.keys(game?.looks || {})) {
      const status = game.looks[name]?.spriteStatus || {}
      if (!Object.values(status).some(st => st?.status === 'face')) continue
      const sprites = effectivePerson(game, globalCast, name)?.sprites || {}
      for (const [key, st] of Object.entries(status)) {
        const from = st?.status === 'face' ? sprites[key]?.face?.from : ''
        const body = from && sprites[from]
        if (body?.assetId && !body.faceBox) found.set(`${gameId}|${name}|${from}`, { gameId, name, key: from, assetId: body.assetId })
      }
    }
    let changed = false
    for (const [k, w] of faceWaits) if (w.gameId === gameId && !found.has(k)) { faceWaits.delete(k); changed = true }
    for (const [k, w] of found) if (faceWaits.get(k)?.assetId !== w.assetId) { faceWaits.set(k, w); changed = true }
    if (changed) notify(FACES_CHANNEL)
  }

  /** 表情只换脸：只有 NovelAI 有局部重绘；设置里可以关掉（关掉就像以前一样每个情绪整张画）。 */
  const faceMode = cfg => cfg.images.backend === 'novelai' && cfg.images.faceSwap !== false
  const spriteBusy = (gameId, name, key) => queue.has(spriteJob(gameId, name, key)) || writing.has(spriteJob(gameId, name, key))

  /**
   * 为某人在某一轮的样子要一批情绪差分。
   * 开着立绘设计师时，先保证这个人有「动作与表情设计」（第一次画他、用到设计里还没有的情绪时读完资料和剧情设计；
   * rewrite 时连这几种情绪的表情一起重新设计，keepFaces 不重设计表情），再照设计画。
   * 还没有提示词的（或 rewrite）交给立绘设计师写，再按角色的固定种子排队出图；edit 给了就按玩家改好的词画。
   * 开着「表情只换脸」时按动作分：每个动作的底图情绪整张画，同一个动作的其余情绪等底图画好后在它上面只重画脸
   * （表情用设计好的，不再单独写）；要的情绪所在的动作还没有底图时，底图一起要上。没有设计时用通用动作组。
   * emotions 里每一项是「情绪」（在它的主动作上）或「情绪@动作」（在那个动作上，lib/poses.js；那个动作演不了这个情绪时用主动作）。
   */
  async function requestSprites(gameId, name, { turn = Infinity, emotions = ['neutral'], rewrite = false, keepFaces = false, edit = null, then = null, mode = '' } = {}) {
    const stale = sinceClear('sprites', gameId, name)
    const mark = (keys, status, error = '') => markSprites(gameId, name, keys, status, error, stale)
    const cfg = await config()
    const ready = await backendReady(cfg)
    if (!ready.ok) throw new Error(ready.reason)
    let game = await store.readGame(gameId)
    // 段落里当时的样子（then）：叠在那一轮的样子上，另成一套差分
    const lookNow = async () => personThen(effectivePerson(game, await store.readGlobalCast(), name, turn), then)
    let person = await lookNow()
    if (!person?.appearance) throw new Error(`${name} 还没有外貌档案`)
    const custom = await emotionLib()
    // 要的每一张：情绪（并掉的按并进去的）和点名的动作，同一张只要一次
    const asked = []
    for (const token of emotions) {
      const { emotion, pose } = parseToken(token)
      const e = resolveEmotion(emotion, custom)
      if (e && !asked.some(a => a.emotion === e && a.pose === pose)) asked.push({ emotion: e, pose })
    }
    const wanted = [...new Set(asked.map(a => a.emotion))]
    let marked = []
    // 补设计合进写词那一次先写好的（designAndWrite）
    let early = null
    if (cfg.images.spriteWriter) {
      const redo = rewrite && !edit && !keepFaces ? wanted : []
      if (!person.acting?.poses?.length || unplacedEmotions(person.acting, wanted).length || redo.length) {
        // 设计之前按现在的那套动作算编号标「写词中」；设计完动作变了、编号对不上的那几张，下面再把标记去掉
        const before = sheetFor(person, cfg)
        const keys = [...new Set(asked.map(a => slotOf(person, before, a.emotion, a.pose, custom).key))]
        // 已经设计过的人只是补几种情绪（或重新设计表情）：补设计和写词一次请求做完；第一次整套设计还是单独一次
        if (person.acting?.poses?.length && cfg.director.combineDesign) {
          early = await designAndWrite(gameId, name, keys, { turn, asked, wanted, redo, rewrite, edit, then, mode }, stale)
          marked = early.marked
        } else marked = await designFirst(gameId, name, keys, { turn, emotions: wanted, redo }, stale)
        if (stale()) return { queued: 0 }
        game = await store.readGame(gameId)
        person = await lookNow()
      }
    }
    const { planned, askedKeys } = planSprites(gameId, name, person, cfg, asked, custom, { then, mode })
    // 设计完编号变了的：先前标的「写词中」去掉
    const orphans = (marked || []).filter(k => !planned.some(t => t.key === k) && !spriteBusy(gameId, name, k))
    if (orphans.length) await mark(orphans, 'ready')
    const targets = planned.filter(t => !spriteBusy(gameId, name, t.key))
    if (!targets.length) return { queued: 0 }
    const first = [...askedKeys][0]
    const main = targets[0].key === first ? targets[0] : null
    // 以前只换脸、这次整张画的（强弱改成了「极」、关了只换脸）：原来的词只有脸，要重写
    const toWrite = targets.filter(t => !(edit && t === main) && ((rewrite && askedKeys.has(t.key)) || !person.sprites[t.key]?.tags || (!t.face && person.sprites[t.key]?.face)))
    const written = new Map()
    if (edit && main) written.set(main.key, { tags: String(edit.tags || '').slice(0, 2000), negative: String(edit.negative || '').slice(0, 600), writer: 'user' })
    // 补设计合进写词那一次已经写好的：照定下的设计收。先设计再写的按定下的动作收（只换脸的只留表情，整张画的要有脸以外的词），
    // 收不了的下面照常再要一次；导演日志里那几条换成实际的差分
    if (early) {
      const rows = []
      for (const t of toWrite) {
        if (written.has(t.key)) continue
        const designed = early.byEmotion.get(t.emotion)
        if (designed) {
          const tags = designedTags(designed.raw, t)
          if (tags) written.set(t.key, { ...designed, tags })
          rows.push(spriteRow(t, tags ? { ...designed, tags } : { ...designed, tags: '', note: '只写了脸上的表情，这张整张画，另外再写一次' }, person, custom))
        } else if (early.byKey.has(t.key) && early.faces.get(t.key) === Boolean(t.face)) written.set(t.key, early.byKey.get(t.key))
      }
      if (early.logId && rows.length) await placeDesignRows(gameId, early.logId, rows).catch(error => log('warn', '写导演日志失败：' + shortError(error)))
    }
    // 只换脸的也跟整张画的一样交给立绘设计师读完资料和剧情写（设计好的表情只是底）；没开设计师、没写出来时才直接用设计
    const forWriter = toWrite.filter(t => !written.has(t.key))
    // 进出图队列之前都算「在忙」，同一张不会被重复要。换脸的一直算到它进了出图队列（要等底图画好）。
    const jobs = targets.map(t => spriteJob(gameId, name, t.key))
    jobs.forEach(j => writing.add(j))
    try {
      await mark(targets.map(t => t.key), 'queued')
      if (forWriter.length && cfg.images.spriteWriter) {
        await mark(forWriter.map(t => t.key), 'writing')
        const size = writerBatch(cfg)
        for (let i = 0; i < forWriter.length; i += size) {
          const batch = forWriter.slice(i, i + size)
          // 排着队等写词时清空了：不再写
          const results = await oneWriter(() => { if (stale()) throw new Error(CLEARED); return runSpriteWriter(gameId, name, person, batch, Number.isFinite(turn) ? turn : latestTurn(game), cfg, custom) })
          for (const [key, value] of results) written.set(key, value)
        }
      }
      // 没开立绘设计师、或者没写出来：已有提示词的沿用，没有的按档案拼（有设计的拼设计好的身体和脸，只换脸的拼表情）。
      for (const t of forWriter) if (!written.has(t.key) && !person.sprites[t.key]?.tags) written.set(t.key, { tags: fallbackTags(person, t, custom), negative: '', writer: 'fallback' })
    } catch (error) {
      jobs.forEach(j => writing.delete(j))
      if (stale()) return { queued: 0 }
      await mark(targets.map(t => t.key), /已手动停止/.test(error?.message) ? 'cancelled' : 'failed', shortError(error))
      throw error
    }
    let dropped = false
    await store.updateGame(gameId, g => {
      if ((dropped = stale())) return // 写词时清空了：写好的词作废
      const look = looksOf(g, name)
      for (const t of targets) {
        const w = written.get(t.key)
        const record = look.sprites[t.key] = {
          ...(person.sprites[t.key] || {}), ...(look.sprites[t.key] || {}),
          emotion: t.emotion, outfit: t.outfit, states: t.states.map(s => s.name),
          // 画的时候用这套自己的固定外貌（外貌后来改过、或者是段落里年轻时的样子，都不拿现在的顶替）
          appearance: person.appearance,
          ...(then ? { then, thenTurn: Number.isFinite(turn) ? turn : null, era: mode || 'memory' } : {}),
          ...(w ? { tags: w.tags, negative: w.negative || '', writer: w.writer, writtenAt: Date.now(), turn: Number.isFinite(turn) ? turn : null } : {}),
        }
        // 在哪个动作上画的（lib/poses.js 的 recordPose）；底图另记 pose（人物志里认它是底图）
        if (t.poseId) record.poseId = t.poseId
        else delete record.poseId
        if (t.face) record.face = { ...(record.face || {}), from: t.face.from, pose: t.face.pose }
        if (t.pose?.members) record.pose = t.pose.id
        else delete record.pose
        // 动作名跟着这一次的设计走（重新设计过动作，这张按新的画）；以前的侧身标记去掉，都按正面画
        delete record.side
        if (t.poseLabel) record.poseLabel = t.poseLabel
        else delete record.poseLabel
      }
    })
    if (dropped) { jobs.forEach(j => writing.delete(j)); return { queued: 0 } }
    // 底图（和不换脸的）直接画；换脸的等它的底图画好（这一批里的、或者之前就在画的）。
    const bodies = new Map()
    for (const t of targets) if (!t.face) bodies.set(t.key, paintSprite(gameId, name, t.key, ready, stale))
    for (const t of targets) {
      if (!t.face) continue
      const before = bodies.get(t.face.from) || waitBody(gameId, name, t.face.from)
      before.then(
        () => paintFace(gameId, name, t.key, ready, stale),
        error => { writing.delete(spriteJob(gameId, name, t.key)); return mark([t.key], 'failed', '动作底图没画出来：' + shortError(error)) },
      ).catch(() => {})
    }
    targets.filter(t => !t.face).forEach(t => writing.delete(spriteJob(gameId, name, t.key)))
    for (const p of bodies.values()) p.catch(() => {})
    return { queued: targets.length }
  }

  /**
   * 照这个人现在的设计排要画的差分（requestSprites 用；补设计合进写词时设计前后各排一次）。
   * asked：[{ emotion, pose }]。回 { planned, askedKeys }：planned 每张带编号、情绪、样子，分动作时带 pose，只换脸的带 face（底图编号和动作）。
   */
  function planSprites(gameId, name, person, cfg, asked, custom, { then = null, mode = '' } = {}) {
    // 这个人的那套动作：有设计用设计，没有时（开着只换脸）用通用动作组；不分动作时为 null，每个情绪整张画
    const sheet = sheetFor(person, cfg)
    const acting = person.acting?.poses?.length ? person.acting : null
    const planned = []
    const add = (key, emotion, extra = {}) => {
      if (!planned.some(t => t.key === key)) planned.push({ key, emotion, outfit: person.outfit, outfitTags: person.outfitTags, states: person.states, ...(then ? { era: mode || 'memory' } : {}), ...extra })
    }
    const labels = list => list.map(e => emotionEntry(e, custom).label)
    // look：设计好的这个人的这种表情；pose：给立绘设计师看的动作（members 不为 null 的是底图：同一个动作里在它上面只换脸的那几个情绪）
    const extra = (emotion, pose, anchor) => ({
      look: actingFace(acting, emotion) || undefined, poseId: pose.id, poseLabel: pose.label,
      pose: { id: pose.id, label: pose.label, desc: pose.desc || '', tags: pose.tags || '', designed: Boolean(sheet?.designed), members: anchor ? labels(pose.emotions.slice(1)) : null },
    })
    const slot = (emotion, pose) => slotKey(person.sprites, person, sheet, pose?.id || '', emotion, custom)
    const askedKeys = new Set()
    for (const { emotion, pose: ref } of asked) {
      const pose = sheet ? poseFor(sheet, emotion, ref, custom) : null
      const key = slot(emotion, pose)
      askedKeys.add(key)
      if (!pose) { add(key, emotion); continue }
      if (!faceMode(cfg)) { add(key, emotion, extra(emotion, pose, false)); continue }
      // 这个动作的底图情绪（刚加的空动作里还没有：这一张自己当底图）
      const anchor = pose.emotions[0] || emotion
      if (anchor === emotion) add(key, emotion, extra(emotion, pose, true))
      // 最激烈的（强弱「极」）不换脸：在同一个动作上整张画（同一个种子），脸由主模型画，画风跟底图一致
      else if (cfg.images.face.wholePeak && actingLevel(acting, emotion, custom) >= 4) add(key, emotion, extra(emotion, pose, false))
      else add(key, emotion, { ...extra(emotion, pose, false), face: { from: slot(anchor, pose), pose: pose.id, anchor, label: pose.label } })
    }
    // 同一个动作的底图还没有、也没在画：一起要上（排在后面，edit 只管第一张）
    for (const t of [...planned]) {
      if (t.face && !person.sprites[t.face.from]?.assetId && !spriteBusy(gameId, name, t.face.from)) add(t.face.from, t.face.anchor, extra(t.face.anchor, sheet.poses.find(p => p.id === t.face.pose), true))
    }
    return { planned, askedKeys }
  }

  /**
   * 补设计合进写词：已经给这个人设计过、这次要画的情绪里有没设计的（或者要重新设计表情的），补设计和写词一次请求做完，资料和剧情只读一遍。
   * 照现在的设计排一次：已经在设计里的照常写；要设计的那几种情绪各写一条「先设计再写」（放进哪个动作、整张画还是只换脸，等设计定了再收）。
   * 补好的设计照 ensureActing 的规矩写回。等着的差分标「写词中」，人物志里显示「设计中」；设计师没写出来不挡出图（没写出的照常再要一次）；
   * 手动停止才停，等着的差分标「已取消」。回 { marked: 这次标了「写词中」的编号, byKey, byEmotion, faces, logId }。
   */
  async function designAndWrite(gameId, name, keys, { turn, asked, wanted, redo, rewrite, edit, then, mode }, stale) {
    const id = gameId + '\n' + name
    const actingStale = sinceClear('acting', gameId, name)
    const out = { marked: [], byKey: new Map(), byEmotion: new Map(), faces: new Map(), logId: '' }
    out.marked = keys.filter(k => { const j = spriteJob(gameId, name, k); return !queue.has(j) && !writing.has(j) && !designing.has(j) })
    out.marked.forEach(k => designing.add(spriteJob(gameId, name, k)))
    actingBusy.set(id, (actingBusy.get(id) || 0) + 1)
    notify(gameId)
    try {
      if (out.marked.length) await markSprites(gameId, name, out.marked, 'writing', '补设计并写词', stale)
      await oneWriter(async () => {
        if (stale() || actingStale()) return
        // 排队等的时候设计可能又变过：轮到了再读
        const cfg = await config()
        const game = await store.readGame(gameId)
        const person = personThen(effectivePerson(game, await store.readGlobalCast(), name, turn), then)
        const current = person?.acting?.poses?.length ? person.acting : null
        if (!current) return
        const custom = await emotionLib()
        const list = [...new Set([...unplacedEmotions(current, wanted), ...redo])]
        if (!list.length) return // 别的请求已经补好了：下面照常写
        const { planned, askedKeys } = planSprites(gameId, name, person, cfg, asked, custom, { then, mode })
        const first = [...askedKeys][0]
        const toDesign = new Set(list)
        const era = then ? { era: mode || 'memory' } : {}
        const designs = list.map(e => ({ key: 'design:' + e, emotion: e, design: true, outfit: person.outfit, outfitTags: person.outfitTags, states: person.states, ...era }))
        // 已经在设计里的照常写（跟下面 toWrite 一样的规矩）；一次装不下的留给下面
        const regular = planned
          .filter(t => !toDesign.has(t.emotion) && !spriteBusy(gameId, name, t.key) && !(edit && t.key === first)
            && ((rewrite && askedKeys.has(t.key)) || !person.sprites[t.key]?.tags || (!t.face && person.sprites[t.key]?.face)))
          .slice(0, Math.max(0, writerBatch(cfg) - designs.length))
        const at = Number.isFinite(turn) ? turn : latestTurn(game)
        const r = await runSpriteWriter(gameId, name, person, [...regular, ...designs], at, cfg, custom, { emotions: list, current })
        out.logId = r.logId
        for (const t of regular) {
          const got = r.results.get(t.key)
          if (got?.writer === 'ai') { out.byKey.set(t.key, got); out.faces.set(t.key, Boolean(t.face)) }
        }
        for (const t of designs) { const got = r.results.get(t.key); if (got?.raw) out.byEmotion.set(t.emotion, got) }
        if (!r.sheet || actingStale()) return // 没补出能用的设计（照已有的画），或者补的时候连设计一起清空了：不写回
        // 往玩家改过的设计里补：还算玩家改过的；表演笔记还是原来那轮读的
        const by = current.by === 'user' ? 'user' : 'ai'
        const readTurn = current.readTurn ?? current.turn ?? null
        await store.updateGame(gameId, g => { looksOf(g, name).acting = { ...r.sheet, at: Date.now(), turn: at, readTurn, by } })
      })
    } catch (error) {
      if (/已手动停止/.test(error?.message)) {
        if (stale()) return out
        await markSprites(gameId, name, out.marked, 'cancelled', '已停止补设计和写词')
        throw error
      }
      log('warn', `补设计并写词失败（${name}）：${shortError(error)}`)
    } finally {
      out.marked.forEach(k => designing.delete(spriteJob(gameId, name, k)))
      const n = (actingBusy.get(id) || 1) - 1
      if (n > 0) actingBusy.set(id, n); else actingBusy.delete(id)
      notify(gameId)
    }
    return out
  }

  /** 补设计合进写词：先设计再写的那几条，定了动作以后在导演日志里换成实际的差分（编号、发出去的词、去掉和换掉的词）。 */
  async function placeDesignRows(gameId, logId, rows) {
    const placed = new Set(rows.map(r => 'design:' + r.emotion))
    await store.updateDirectorLog(gameId, log => {
      const entry = (log.entries || []).find(e => e.id === logId)
      if (entry?.sprites) entry.sprites = [...entry.sprites.filter(r => !placed.has(r.key)), ...rows]
    })
    notify(directorChannel(gameId))
  }

  /**
   * 画之前先设计动作与表情：等着的差分标「写词中」（剧场、人物志看得到在忙），设计完接着画。
   * 设计失败不挡出图（按已有的设计或通用动作组画）；手动停止才停，等着的差分标「已取消」。回这次标了「写词中」的编号。
   */
  async function designFirst(gameId, name, keys, options, stale) {
    const mine = keys.filter(k => { const j = spriteJob(gameId, name, k); return !queue.has(j) && !writing.has(j) && !designing.has(j) })
    mine.forEach(k => designing.add(spriteJob(gameId, name, k)))
    try {
      if (mine.length) await markSprites(gameId, name, mine, 'writing', '先设计这个人的动作与表情', stale)
      await ensureActing(gameId, name, options)
      return mine
    } catch (error) {
      if (/已手动停止/.test(error?.message)) {
        if (stale?.()) return [] // 连设计一起清空时停掉的：调用方看 stale 收手
        await markSprites(gameId, name, mine, 'cancelled', '已停止设计动作与表情')
        throw error
      }
      log('warn', `动作与表情设计失败（${name}）：${shortError(error)}`)
      return mine
    } finally {
      mine.forEach(k => designing.delete(spriteJob(gameId, name, k)))
    }
  }

  /** 正在画的整张立绘（底图）：换脸的等它画完。 */
  const painting = new Map()

  /** 底图在别的请求里还在写词、排队或在画：等它画完（画失败也往下走，换脸那边会说清楚）。 */
  async function waitBody(gameId, name, key) {
    const id = spriteJob(gameId, name, key)
    for (let waited = 0; spriteBusy(gameId, name, key) && waited < 30 * 60000; waited += 500) {
      if (painting.has(id)) { await painting.get(id).catch(() => {}); return }
      await new Promise(r => setTimeout(r, 500))
    }
  }

  /** 按存好的提示词整张画一张差分：角色的固定种子；成功后换掉旧图（玩家上传的、全局库在用的不删文件）。 */
  function paintSprite(gameId, name, key, ready, stale) {
    const id = spriteJob(gameId, name, key)
    const done = drawSprite(gameId, name, key, ready, stale)
    painting.set(id, done)
    done.finally(() => { if (painting.get(id) === done) painting.delete(id) }).catch(() => {})
    return done
  }

  async function drawSprite(gameId, name, key, ready, stale = sinceClear('sprites', gameId, name)) {
    const mark = (status, error = '') => markSprites(gameId, name, [key], status, error, stale)
    // 同步进队列，调用方一返回 queue.has 就是真的。
    const job = queue.enqueue(spriteJob(gameId, name, key), async signal => {
      if (stale()) throw new Error(CLEARED)
      const cfg = await config()
      await mark('running')
      const game = await store.readGame(gameId)
      const person = effectivePerson(game, await store.readGlobalCast(), name)
      const record = game.looks?.[name]?.sprites?.[key]
      if (!person || !record?.tags) throw new Error('这张立绘还没有提示词')
      const prompt = composePrompt({ kind: 'sprite', tags: record.tags, person: record.appearance ? { ...person, appearance: record.appearance } : person, emotion: record.emotion, backend: cfg.images.backend, config: cfg, extraNegative: [person.negative, ownNegative(record)].filter(Boolean).join(', '), soften: softened(record) })
      const { width, height } = sizeFor(cfg, 'portrait')
      // NovelAI V4 起这个人单独一个居中的角色块（照柏宝绘 / IGS 的立绘写法）；别的渠道 characters 为空。
      const res = await generateImage({ backend: cfg.images.backend, config: cfg, key: ready.key, signal, fetchImpl, prompt: prompt.positive, negative: prompt.negative, characters: prompt.characters, characterNegatives: prompt.characterNegatives, coords: true, width, height, seed: person.seed, transparent: cfg.images.transparentSprites })
      return { assetId: await store.saveAsset(res.bytes, res.mediaType), seed: res.seed, model: res.model || '', positive: prompt.positive, negativePrompt: prompt.negative, characters: prompt.characters, characterNegatives: prompt.characterNegatives }
    }, { onRetry: (error, n) => log('info', `限流重试 ${n}：${shortError(error)}`) })
    try {
      const out = await job
      let old = [], saved = null, dropped = false
      await store.updateGame(gameId, g => {
        if ((dropped = stale())) return // 画的时候清空了：这张不要了
        const look = looksOf(g, name)
        const record = look.sprites[key] || (look.sprites[key] = {})
        old = recordAssets(record)
        Object.assign(record, out, { at: Date.now(), uploaded: false })
        delete record.aa // 换了新图，逆转式素材包的贴片对不上了
        delete record.face // 整张画的，不再是换脸的
        delete record.faceBox // 底图换了，脸的位置要重新认
        delete record.faceBy
        delete look.spriteStatus[key]
        saved = { ...record }
      })
      if (dropped) { await releaseAsset(gameId, out.assetId); throw new Error(CLEARED) }
      await releaseAssets(gameId, old, [out.assetId])
      toLibrary(gameId, [{ assetId: out.assetId, parts: spriteName(name, saved, (await emotionLib())) }])
      await refreshFaces(gameId, name, key)
      notify(gameId)
      return out.assetId
    } catch (error) {
      await mark(error?.code === 'aborted' ? 'cancelled' : 'failed', error?.code === 'aborted' ? '已取消' : shortError(error))
      throw error
    }
  }

  let noReference = false // 带角色参考的局部重绘被接口拒过：这次启动里不再带
  const FACE_WAIT = '等认脸：开着 FlowGal 的页面（聊天页、剧场都行）时会自动认出底图的脸再换（要先在逆转式工作台下载认脸小模型；下了认脸大模型就都用大模型），也可以在人物志里点开底图手动框脸'

  /** 底图换了（重画、上传）：在它上面换过脸的表情都要在新底图上重换，先标「等认脸」（新底图的脸框到了再换）。 */
  async function refreshFaces(gameId, name, bodyKey) {
    if (!faceMode(await config())) return
    const person = effectivePerson(await store.readGame(gameId), await store.readGlobalCast(), name)
    const deps = Object.keys(person?.sprites || {}).filter(k => person.sprites[k]?.face?.from === bodyKey && !spriteBusy(gameId, name, k))
    if (deps.length) await markSprites(gameId, name, deps, 'face', FACE_WAIT)
  }

  /**
   * 换脸：在动作底图上只重画脸（NovelAI 局部重绘），按软边贴回底图，存成这张差分的图（怎么裁、遮罩、贴回、比对见 lib/face-paint.js）。
   * 放大重画（默认开）：把头那一块裁出来放大到 1024 见方再重画，画完缩回去贴上（ADetailer 的做法），眼睛有足够的像素照底图的画法画。
   * 重绘强度按这个人这种情绪的强弱（设计师标的，没标用情绪默认的）定，玩家在人物志里定过这张的就用定的。
   * 提示词用底图当初那套，只把表情换成这张的；种子默认跟底图一样（「换个种子」时用记下的）。
   * 画完比对（默认开）：软边上有重影、脸上大块明暗变了（画风跑偏）就换个种子、调低强度再来；表情没换上就调高强度再来；留最像的那张。
   * 底图还没有脸框（刚画好、浏览器还没认脸）时先标「等认脸」，脸框到了（setFaceBox）再接着做。
   */
  async function paintFace(gameId, name, key, ready, stale = sinceClear('sprites', gameId, name)) {
    const id = spriteJob(gameId, name, key)
    if (stale()) { writing.delete(id); return null }
    const mark = (status, error = '') => markSprites(gameId, name, [key], status, error, stale)
    const person = effectivePerson(await store.readGame(gameId), await store.readGlobalCast(), name)
    const record = person?.sprites?.[key]
    const body = record?.face ? person.sprites[record.face.from] : null
    if (!body?.assetId) { writing.delete(id); return mark('failed', '动作底图还没画好，先画同组的底图') }
    if (!body.faceBox) { writing.delete(id); return mark('face', FACE_WAIT) }
    const job = queue.enqueue(id, async signal => {
      if (stale()) throw new Error(CLEARED)
      const cfg = await config()
      const fc = cfg.images.face
      const custom = await emotionLib()
      await mark('running')
      const p = effectivePerson(await store.readGame(gameId), await store.readGlobalCast(), name)
      const rec = p?.sprites?.[key]
      const b = rec?.face ? p.sprites[rec.face.from] : null
      if (!b?.assetId || !b.faceBox) throw new Error('动作底图变了，等它重新认脸')
      const asset = await store.readAsset(b.assetId)
      if (!asset || sniffImage(asset.data) !== 'image/png') throw new Error('动作底图不是 PNG（上传的 JPEG / WebP 换不了脸）：重画底图或上传 PNG')
      const src = await decodePng(asset.data)
      const box = cleanFaceBox(b.faceBox, src.width, src.height)
      if (!box) throw new Error('脸框不对，在人物志里重新框一下底图的脸')
      // 底图当初画的那套提示词照用（脸以外跟底图一致）；负面按现在的画风重算，以前插件自己加的不再带上
      const fresh = composePrompt({ kind: 'sprite', tags: b.tags, person: b.appearance ? { ...p, appearance: b.appearance } : p, emotion: b.emotion, backend: 'novelai', config: cfg, extraNegative: [p.negative, ownNegative(b)].filter(Boolean).join(', '), soften: softened(b) })
      const drawn = b.positive ? { ...fresh, positive: b.positive, characters: b.characters || [] } : fresh
      const swapped = swapFace(drawn, faceFor(rec.emotion, rec.tags, ownNegative(rec), custom, { soften: softened(rec) }), { soften: softened(b) })
      // 放大重画：裁下头那一块放大；不放大：整张垫白补到 64 的倍数（以前的做法）
      const alpha = faceAlpha(box, { soft: fc.soft, feather: fc.feather })
      const crop = fc.crop ? cropFor(box, { scale: fc.cropScale, size: fc.cropSize }) : null
      const flat = crop ? resample(src, crop.box, crop.size, crop.size) : padWhite(src)
      const view = crop || { box: [0, 0, flat.width, flat.height] }
      const request = crop ? closeUpPrompt(swapped) : swapped
      const image = await encodePng(flat)
      // 以前的做法（不放大、硬方框）：遮罩就是脸框
      const mask = crop || fc.soft ? await grayPng(flat.width, flat.height, maskPixel(view, alpha, flat.width, flat.height)) : await maskPng(flat.width, flat.height, [box])
      const level = actingLevel(p.acting, rec.emotion, custom)
      const fixed = Number.isFinite(rec.face.strength)
      let strength = fixed ? rec.face.strength : fc.strength[level]
      let seed = Number.isInteger(rec.face.seed) ? rec.face.seed : Number.isInteger(b.seed) ? b.seed : p.seed
      const tries = fc.check ? fc.retries + 1 : 1
      const nai = applyGuidance('novelai', cfg.novelai, cfg.style)
      // 角色参考（设置里打开、模型是 V4.5 时）：把整张底图当参考，锁住人物和画风；接口不认就这次起不带
      let reference = fc.reference && naiReferenceOk(nai.model) && !noReference ? await encodePng(referenceImage(src)) : null
      let best = null, n = 0
      for (; n < tries; n++) {
        if (stale()) throw new Error(CLEARED)
        let out
        try {
          out = await inpaintNovelAI({ ...request, image, mask, width: flat.width, height: flat.height, seed, strength, reference, config: nai, key: ready.key, signal, fetchImpl })
        } catch (error) {
          if (reference && !signal.aborted && !error?.retryable) {
            noReference = true
            reference = null
            log('warn', `NovelAI 不接受带角色参考的局部重绘，之后换脸不带参考：${shortError(error)}`)
            n--
            continue
          }
          // 已经有一张了：后面再画失败（限流、断线）就用已有最好的那张，不整个重来
          if (best && !signal.aborted) { log('info', `换脸第 ${n + 1} 次没画出来，用前面最像的那张：${shortError(error)}`); break }
          throw error
        }
        const gen = await decodePng(out.bytes)
        const back = crop ? shrinkBack(gen, crop) : { image: gen, at: [0, 0] }
        const check = faceDrift(src, back.image, alpha, back.at, { tolerance: fc.tolerance })
        best = betterTry(best, { out, back, check, strength, n: n + 1 })
        if (!fc.check || check.ok) break
        if (n + 1 < tries) log('info', `${name} ${rec.emotion} 换脸第 ${n + 1} 次${check.flat ? '表情没换上' : '跑偏了'}（接缝 ${check.seam}、明暗 ${check.shade}、变化 ${check.change}），换个种子再来`)
        strength = nextStrength(strength, check, { fixed })
        seed = randomSeed(2 ** 31)
      }
      const bytes = await encodePng(blendSoft(src, best.back.image, alpha, best.back.at))
      const paint = { level, strength: best.strength, tries: Math.min(n + 1, tries), check: best.check, crop: Boolean(crop), soft: fc.soft, reference: Boolean(reference) }
      return { assetId: await store.saveAsset(bytes, 'image/png'), seed: best.out.seed, model: best.out.model || '', positive: request.prompt, negativePrompt: request.negative, characters: request.characters, characterNegatives: request.characterNegatives, face: { ...rec.face, body: b.assetId, box, paint } }
    }, { onRetry: (error, n) => log('info', `限流重试 ${n}：${shortError(error)}`) })
    writing.delete(id)
    try {
      const out = await job
      let old = [], saved = null, dropped = false
      await store.updateGame(gameId, g => {
        if ((dropped = stale())) return // 换脸的时候清空了：这张不要了
        const look = looksOf(g, name)
        const rec = look.sprites[key] = { ...(person.sprites[key] || {}), ...(look.sprites[key] || {}) }
        old = recordAssets(rec)
        Object.assign(rec, out, { at: Date.now(), uploaded: false })
        delete rec.aa // 换了新图，逆转式素材包的贴片对不上了
        delete look.spriteStatus[key]
        saved = { ...rec }
      })
      if (dropped) { await releaseAsset(gameId, out.assetId); return null }
      await releaseAssets(gameId, old, [out.assetId])
      toLibrary(gameId, [{ assetId: out.assetId, parts: spriteName(name, saved, (await emotionLib())) }])
      notify(gameId)
      return out.assetId
    } catch (error) {
      await mark(error?.code === 'aborted' ? 'cancelled' : 'failed', error?.code === 'aborted' ? '已取消' : shortError(error))
      return null
    }
  }

  /**
   * 记下动作底图的脸框：浏览器认脸给的眼睛、嘴的框（rects），或者玩家手动框的（box）。
   * 记下后把等着这张底图的表情接着换（等认脸的、还没图的、底图换过的）；手动改了框就把同组表情全部重换。
   */
  async function setFaceBox(gameId, name, key, { rects = null, box = null, by = 'auto', measure = false } = {}) {
    const globalCast = await store.readGlobalCast()
    const person = effectivePerson(await store.readGame(gameId), globalCast, name)
    const body = person?.sprites?.[key]
    if (!body?.assetId) throw new Error('这张底图还没有图')
    const asset = await store.readAsset(body.assetId)
    const size = asset && pngSize(asset.data)
    if (!size) throw new Error('底图不是 PNG（上传的 JPEG / WebP 换不了脸）')
    const face = box ? cleanFaceBox(box, size.width, size.height) : faceBoxFrom(rects, size.width, size.height)
    if (!face) throw new Error('脸框不对：要框住眉毛到嘴，至少 32×32，不能超过整张图的六分之一')
    const hand = by === 'hand'
    await store.updateGame(gameId, g => {
      const look = looksOf(g, name)
      look.sprites[key] = { ...(person.sprites[key] || {}), ...(look.sprites[key] || {}), faceBox: face, faceBy: hand ? 'hand' : 'auto' }
    })
    const game = await store.readGame(gameId)
    const sprites = effectivePerson(game, globalCast, name).sprites
    const waiting = k => game.looks?.[name]?.spriteStatus?.[k]?.status === 'face'
    // measure：剧场只是量一下脸框（按脸框缩放立绘用），只接着换等着认脸的，别的不动
    const deps = Object.keys(sprites).filter(k => sprites[k]?.face?.from === key && !spriteBusy(gameId, name, k) && (measure ? waiting(k) : hand || waiting(k) || !sprites[k].assetId || sprites[k].face.body !== body.assetId))
    if (deps.length) {
      const cfg = await config()
      const ready = await backendReady(cfg)
      if (!ready.ok) await markSprites(gameId, name, deps, 'failed', ready.reason)
      else if (!faceMode(cfg)) await markSprites(gameId, name, deps, 'failed', '「表情只换脸」关着（或者生图渠道不是 NovelAI）：打开它，或者让这几张整张画')
      else for (const k of deps) { writing.add(spriteJob(gameId, name, k)); paintFace(gameId, name, k, ready) }
    }
    notify(gameId)
    await scanFaces(gameId).catch(() => {})
    return { box: face, redo: deps.length }
  }

  /**
   * 换个种子重画一张表情的脸（底图和脸框不动）。strength：这张的重绘强度定死成这个数（0.2~1）；null 回到按强弱自动；不给不变。
   */
  async function redoFace(gameId, name, key, { strength } = {}) {
    const cfg = await config()
    const ready = await backendReady(cfg)
    if (!ready.ok) throw new Error(ready.reason)
    if (!faceMode(cfg)) throw new Error('「表情只换脸」关着（或者生图渠道不是 NovelAI）')
    const person = effectivePerson(await store.readGame(gameId), await store.readGlobalCast(), name)
    const record = person?.sprites?.[key]
    if (!record?.face) throw new Error('这张是整张画的，不是换脸的')
    if (spriteBusy(gameId, name, key)) return { queued: 0 }
    const seed = randomSeed(2 ** 31)
    await store.updateGame(gameId, g => {
      const look = looksOf(g, name)
      const rec = look.sprites[key] = { ...(person.sprites[key] || {}), ...(look.sprites[key] || {}) }
      rec.face = { ...rec.face, seed }
      if (strength === null) delete rec.face.strength
      else if (Number.isFinite(Number(strength)) && strength !== undefined) rec.face.strength = Math.round(Math.min(1, Math.max(0.2, Number(strength))) * 100) / 100
    })
    writing.add(spriteJob(gameId, name, key))
    await markSprites(gameId, name, [key], 'queued')
    paintFace(gameId, name, key, ready)
    return { queued: 1, seed }
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
  async function fillMissing(gameId, { turn = null, name = '', kinds = null, emotions = null } = {}) {
    const cfg = await config()
    const ready = await backendReady(cfg)
    if (!ready.ok) throw new Error(ready.reason)
    const explicit = Array.isArray(kinds)
    if (!explicit) kinds = ['cg', ...(cfg.images.backgrounds ? ['bg'] : []), ...(cfg.images.portraits ? ['sprite'] : [])]
    const withEmotions = emotions ?? (explicit || cfg.images.expressions)
    const game = await store.readGame(gameId)
    const globalCast = await store.readGlobalCast()
    const lib = await emotionLib()
    const { scenes } = await currentScenes(gameId, game)
    const counts = { cg: 0, bg: 0, sprite: 0, undirected: 0 }
    const places = new Set()
    const sprites = new Map()
    // 每个人此刻在哪个动作：跟剧场一样从第一轮一轮一轮走下来（只补某一轮时，之前的几轮也要走过）
    const walker = kinds.includes('sprite') ? walkerFor(game, globalCast, cfg, lib) : null
    for (const scene of scenes) {
      if (turn != null && scene.turn !== Number(turn)) { if (walker && scene.turn < Number(turn)) walkTurn(walker, game, globalCast, scene); continue }
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
      if (kinds.includes('bg')) {
        for (const place of scriptScenes(script).filter(s => s.bg)) {
          const key = placeKey(place)
          if (!game.places?.[key]?.assetId && !queue.has(`bg:${gameId}:${key}`) && !places.has(key)) { places.add(key); ensurePlace(gameId, key, place).catch(() => {}); counts.bg++ }
        }
      }
      if (kinds.includes('sprite')) {
        for (const w of await spriteWants(game, scene, walker)) {
          if ((name && w.name !== name) || (!w.portrait && !withEmotions)) continue
          const person = personThen(effectivePerson(game, globalCast, w.name, scene.turn), w.then)
          if (!person?.appearance || drawnAs(person, w.emo, lib, sheetFor(person, cfg), w.pose)) continue
          const id = w.name + '\n' + lookKey(person)
          const entry = sprites.get(id) || { name: w.name, turn: scene.turn, then: w.then, mode: w.mode, emotions: new Set() }
          // 段落里当时的样子叠在那一轮的样子上算：跟着记下它的那一轮走
          if (!entry.then) entry.turn = Math.max(entry.turn, scene.turn)
          entry.emotions.add(w.pose ? `${w.emo}@${w.pose}` : w.emo)
          sprites.set(id, entry)
        }
      }
    }
    for (const entry of sprites.values()) {
      requestSprites(gameId, entry.name, { turn: entry.turn, emotions: [...entry.emotions], then: entry.then, mode: entry.mode }).catch(error => log('warn', `补立绘失败（${entry.name}）：${shortError(error)}`))
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
    const liveStatus = (job, status, error) => (BUSY.has(status) && !queue.has(job) && !writing.has(job) && !designing.has(job) ? ['failed', INTERRUPTED] : [status, error])
    const images = Object.values(game.images || {})
      .filter(i => !i.mediaId || current.has(i.mediaId))
      .map(i => {
        const job = cgJob(gameId, i.id)
        const [status, error] = queue.has(job) ? [i.status === 'queued' ? 'queued' : 'running', ''] : liveStatus(job, i.status, i.error)
        return {
          id: i.id, turn: i.turn, textVersion: i.textVersion, after: i.after, until: i.until || '', ...(i.untilByUser ? { untilByUser: true } : {}), title: i.title, moment: i.moment || '', who: i.who || [],
          enter: i.enter || '', leave: i.leave || '', motion: i.motion || '', nsfw: Boolean(i.nsfw),
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
      return { ...person, seedCustom: Number.isInteger(source.seed), spriteStatus, versions: local?.versions || [], createdTurn: local?.createdTurn ?? null, actingBusy: Boolean(actingBusy.get(gameId + '\n' + n)) }
    })
    return {
      gameId,
      card: latest?.card || null,
      turns,
      latestTurn: latestTurn(game),
      images,
      cast,
      emotions: (await emotionLib()),
      // 没有动作与表情设计的人用的通用动作组（剧场按它身子不动只换脸）；没开「表情只换脸」时不分动作
      poseGroups: sheetFor(null, await config())?.poses || [],
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
    return { tags: draft.tags, desc: draft.desc, characters: draft.characters, shape: draft.shape, nsfw: Boolean(game.images[imageId].nsfw || draft.nsfw) }
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
    // 记下是玩家定的：剧场在亲密场面里不再替它往后延
    await store.updateGame(gameId, g => { if (g.images[imageId]) Object.assign(g.images[imageId], { until: until || '', untilByUser: true }) })
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

  /** 上传立绘：放进某一轮（默认最新）那套样子的某个情绪差分（emotion 可以写「情绪@动作」：那个动作上的这张）。没有档案的人物先建一份空档案。 */
  async function saveUpload(gameId, name, emotion, dataUrl, turn = Infinity, then = null) {
    const m = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl || ''))
    if (!m) throw new Error('只支持 PNG / JPEG / WebP 图片')
    const bytes = fromBase64(m[2])
    if (bytes.byteLength > 12 * 1024 * 1024) throw new Error('图片超过 12MB')
    const assetId = await store.saveAsset(bytes, m[1])
    const lib = await emotionLib()
    const cfg = await config()
    const asked = parseToken(emotion)
    const emo = resolveEmotion(asked.emotion, lib) || 'neutral'
    const globalCast = await store.readGlobalCast()
    let old = [], uploadedKey = ''
    await store.updateGame(gameId, g => {
      if (!g.cast?.[name] && !globalCast.cast?.[name]) editPerson(g, name, {})
      const person = personThen(effectivePerson(g, globalCast, name, turn), then)
      const { key, pose } = slotOf(person, sheetFor(person, cfg), emo, asked.pose, lib)
      const look = looksOf(g, name)
      old = recordAssets(look.sprites[key])
      // 换了图：原来挂的逆转式素材包、换脸记录、底图的脸框都对不上了
      const { aa, face, faceBox, faceBy, ...rest } = look.sprites[key] || {}
      look.sprites[key] = { ...rest, emotion: emo, outfit: person.outfit, states: person.states.map(s => s.name), appearance: person.appearance, assetId, uploaded: true, writer: rest.writer || 'upload', at: Date.now(), ...(pose ? { poseId: pose.id, poseLabel: pose.label } : {}) }
      delete look.spriteStatus[key]
      uploadedKey = key
    })
    await releaseAssets(gameId, old, [assetId])
    await refreshFaces(gameId, name, uploadedKey)
    notify(gameId)
    return assetId
  }

  /**
   * 给一张差分导入逆转式素材包（sprite.json，或 v2 的 motion.json，加图片；files：文件名 → data URL）：检查格式、收齐文件，
   * 这张差分的图换成素材包的静止图（v1 第一张呼吸帧、v2 默认姿势的整图；眼嘴贴片是照它的坐标做的），剧场里就会眨眼、动嘴（v2 还会侧头）。
   * 工作台做的（keepImage）：静止帧就是这张差分现在的图，不另存、不改「谁画的」，顺带记下框（rects）下次接着用。
   * key 指定哪张差分（工作台按差分挑）；不给就按 emotion + turn 找这一轮这身样子的那张。
   */
  async function saveAaPack(gameId, name, emotion, manifest, files, turn = Infinity, { key: wantKey = '', keepImage = false, rects = null } = {}) {
    const pack = cleanPack(manifest)
    const globalCast = await store.readGlobalCast()
    let keepId = ''
    if (keepImage) {
      keepId = effectivePerson(await store.readGame(gameId), globalCast, name, turn)?.sprites?.[wantKey]?.assetId || ''
      if (!keepId) throw new Error('这张差分还没有图')
    }
    const savedRects = rects ? cleanRects(rects, pack.size[0], pack.size[1]) : null
    const ids = {}
    try {
      for (const file of packFiles(pack)) {
        if (keepId && file === packStill(pack)) { ids[file] = keepId; continue }
        const m = /^data:[^;,]*;base64,([A-Za-z0-9+/=]+)$/.exec(String(files?.[file] || ''))
        if (!m) throw new Error('素材包缺文件：' + file)
        const bytes = fromBase64(m[1])
        if (bytes.byteLength > 12 * 1024 * 1024) throw new Error(`${file} 超过 12MB`)
        const type = sniffImage(bytes)
        if (!type || type === 'image/gif') throw new Error(`${file} 不是 PNG / JPEG / WebP 图片`)
        ids[file] = await store.saveAsset(bytes, type)
      }
    } catch (error) {
      for (const id of Object.values(ids)) if (id !== keepId) await store.removeAsset(id).catch(() => {})
      throw error
    }
    const stored = packWithAssets(pack, ids)
    const lib = await emotionLib()
    const cfg = await config()
    const asked = parseToken(emotion)
    const emo = resolveEmotion(asked.emotion, lib) || 'neutral'
    let old = []
    await store.updateGame(gameId, g => {
      if (!g.cast?.[name] && !globalCast.cast?.[name]) editPerson(g, name, {})
      const person = effectivePerson(g, globalCast, name, turn)
      const key = wantKey && person.sprites[wantKey] ? wantKey : slotOf(person, sheetFor(person, cfg), emo, asked.pose, lib).key
      const look = looksOf(g, name)
      old = recordAssets(look.sprites[key])
      const base = { ...(person.sprites[key] || {}), ...(look.sprites[key] || {}) }
      look.sprites[key] = keepImage
        ? { ...base, aa: { pack: stored, ...(savedRects ? { rects: savedRects } : {}) }, at: Date.now() }
        : { ...base, emotion: emo, outfit: person.outfit, states: person.states.map(s => s.name), assetId: packStill(stored), uploaded: true, writer: 'upload', aa: { pack: stored }, at: Date.now(), face: undefined, faceBox: undefined, faceBy: undefined }
      delete look.spriteStatus[key]
    })
    await releaseAssets(gameId, old, Object.values(ids))
    notify(gameId)
  }

  /**
   * 工作台的一次局部重绘：image 是浏览器垫好白底的这张差分（PNG，宽高 64 的倍数），宿主按框自己画遮罩，
   * 提示词用当初画这张差分的那套（没存的按档案拼），改成这个状态要的样子；模型、CFG 跟着当前设置和画风。
   * 返回重画后的整张图（data URL）。只支持 NovelAI。
   */
  async function aaInpaint(gameId, input = {}) {
    const cfg = await config()
    if (cfg.images.backend !== 'novelai') throw new Error('做眨眼和口型要用 NovelAI 的局部重绘：先在「生图渠道」里选 NovelAI')
    const ready = await backendReady(cfg)
    if (!ready.ok) throw new Error(ready.reason)
    const name = String(input.name || ''), key = String(input.key || ''), part = String(input.part || ''), state = String(input.state || '')
    if (!AA_PARTS[part]?.states?.[state]) throw new Error('没有这个状态')
    const person = effectivePerson(await store.readGame(gameId), await store.readGlobalCast(), name)
    const record = person?.sprites?.[key]
    if (!record?.assetId) throw new Error('这张差分还没有图')
    const m = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(String(input.image || ''))
    if (!m) throw new Error('原图要用 PNG 发过来')
    const image = fromBase64(m[1])
    const size = pngSize(image)
    if (!size || size.width % 64 || size.height % 64 || size.width * size.height > 3_145_728) throw new Error('原图尺寸不对（宽高要是 64 的倍数）')
    const rects = cleanRects(input.rects, size.width, size.height)
    // 负面按现在的画风重算（以前插件自己加的不再带上）
    const fresh = composePrompt({ kind: 'sprite', tags: record.tags, person: record.appearance ? { ...person, appearance: record.appearance } : person, emotion: record.emotion, backend: 'novelai', config: cfg, extraNegative: [person.negative, ownNegative(record)].filter(Boolean).join(', '), soften: softened(record) })
    const drawn = record.positive ? { ...fresh, positive: record.positive, characters: record.characters || [] } : fresh
    // 有角色块时，眼睛和嘴的状态改在角色块里（这是这个人的脸）；老记录整段都在 Base 里，就改 Base。
    let request
    if (drawn.characters?.length) {
      const face = aaPrompt(drawn.characters[0], drawn.characterNegatives?.[0] || '', part, state)
      request = { prompt: drawn.positive, negative: drawn.negative, characters: [face.prompt, ...drawn.characters.slice(1)], characterNegatives: [face.negative, ...(drawn.characterNegatives || []).slice(1)] }
    } else {
      const { prompt, negative } = aaPrompt(drawn.positive, drawn.negative, part, state)
      request = { prompt, negative, characters: [], characterNegatives: [] }
    }
    const seed = Number.isInteger(input.seed) && input.seed >= 0 ? input.seed : Number.isInteger(record.seed) ? record.seed : person.seed
    const mask = await maskPng(size.width, size.height, stateRects(rects, part, state, size.height))
    const out = await queue.enqueue(`aa:${gameId}:${name}|${key}|${part}-${state}`, signal => inpaintNovelAI({
      ...request, image, mask, width: size.width, height: size.height, seed,
      config: applyGuidance('novelai', cfg.novelai, cfg.style), key: ready.key, signal, fetchImpl,
    }), { onRetry: (error, n) => log('info', `限流重试 ${n}：${shortError(error)}`) })
    return { image: `data:${out.mediaType};base64,${toBase64(out.bytes)}`, seed: out.seed }
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

  /**
   * 清空一个人的全部立绘：每一身、每种情绪（底图、换脸的、逆转式素材包），测试时反复重画用；acting 时动作与表情设计也清掉，下次画先重新设计。
   * 正在写词、排队、在画的一起停掉，清空之前要的晚到了也不写回。全局角色清的是全局库里的记录（所有对局都少），文件留着（别的对局可能复制过）。
   */
  async function clearSprites(gameId, name, { acting = false } = {}) {
    const person = effectivePerson(await store.readGame(gameId), await store.readGlobalCast(), name)
    if (!person) throw new Error('没有这个人物')
    const id = gameId + '\n' + name
    for (const kind of acting ? ['sprites', 'acting'] : ['sprites']) cleared[kind].set(id, (cleared[kind].get(id) || 0) + 1)
    const prefix = spriteJob(gameId, name, '')
    const { running, waiting } = queue.state()
    for (const job of [...running, ...waiting]) if (job.startsWith(prefix)) queue.cancel(job)
    for (const run of directorRuns.values()) if (run.gameId === gameId && run.name === name && (run.kind === 'sprite' || (acting && run.kind === 'acting'))) run.controller.abort()
    const old = []
    await store.updateGame(gameId, g => {
      const look = looksOf(g, name)
      for (const record of Object.values(look.sprites)) old.push(...recordAssets(record))
      look.sprites = {}
      look.spriteStatus = {}
      if (acting) delete look.acting
    })
    if (person.global) await store.updateGlobalCast(gc => { const p = gc.cast?.[name]; if (!p) return; p.sprites = {}; if (acting) delete p.acting })
    else await releaseAssets(gameId, old)
    return { cleared: Object.keys(person.sprites).length, acting: acting && Boolean(person.acting) }
  }

  /** 差分前缀（外貌|服装|状态）对应的段落里当时的样子：那套立绘记着 then、记下它的那一轮和段落；不是段落里的为 null。 */
  function lookThen(person, prefix) {
    const record = Object.entries(person?.sprites || {}).find(([key, r]) => key.startsWith(prefix + '|') && r?.then)?.[1]
    return record ? { then: record.then, turn: record.thenTurn ?? Infinity, mode: record.era || 'memory' } : null
  }

  async function castAction(gameId, action, input) {
    const name = String(input?.name || '').trim().slice(0, 24)
    if (!name && action !== 'rollback' && action !== 'fill') throw new Error('缺少人物名')
    const turn = input?.turn == null || input.turn === '' ? Infinity : Number(input.turn)
    // 人物志里点的是段落里当时的那套样子（input.look 是那套的差分前缀）：按记下它时的那一轮和 then 画、传
    const era = input?.look ? lookThen(effectivePerson(await store.readGame(gameId), await store.readGlobalCast(), name), String(input.look)) : null
    let result = { ok: true }
    switch (action) {
      case 'save':
        await store.updateGame(gameId, g => { editPerson(g, name, input.patch || {}, Number.isFinite(turn) ? turn : 0) })
        break
      case 'look':
        // 换装、衣橱、长期状态、临时状态：从 turn（默认最新一轮）起生效；全局角色也写在本局。
        await store.updateGame(gameId, g => { editLook(g, name, input.patch || {}, Number.isFinite(turn) ? turn : latestTurn(g)) })
        // 改了以前轮次的状态、换装：用到的那几套样子变了，按设置补画立绘（没填 Key 之类的就先不画）
        if (input.patch && (input.patch.stateSpans || input.patch.wearMove || input.patch.wearDrop != null)) {
          const cfg = await config()
          if (cfg.images.portraits) fillMissing(gameId, { name, kinds: ['sprite'], emotions: cfg.images.expressions }).catch(() => {})
        }
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
          gc.cast[name] = { name, gender: person.gender, color: person.color || nameColor(name), tags: person.appearance, ...(Object.keys(person.appearanceFields || {}).length ? { fields: person.appearanceFields } : {}), seed: person.seed, note: person.note, ...(person.actingNote ? { actingNote: person.actingNote } : {}), negative: person.negative, outfits: person.timeline.outfits, outfit: person.outfit, sprites: person.sprites, ...(person.acting ? { acting: person.acting } : {}) }
          editVoice(gc.cast[name], person)
          editHeight(gc.cast[name], person)
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
          editPerson(g, name, { appearanceFields: g0.fields || cleanLookFields(g0.tags || ''), appearanceTags: g0.tags || '', gender: g0.gender || '', note: g0.note || '', actingNote: g0.actingNote || '', negative: g0.negative || '', voice: g0.voice || '', voicePitch: g0.voicePitch || 0, height: g0.height ?? null, ...(Number.isInteger(g0.seed) ? { seed: g0.seed } : {}) })
          const look = looksOf(g, name)
          look.outfits = { ...(g0.outfits || {}), ...look.outfits }
          if (g0.outfit && !look.wear.some(e => Number(e.fromTurn) === 0)) look.wear.unshift({ fromTurn: 0, outfit: g0.outfit })
          look.sprites = { ...(g0.sprites || {}), ...look.sprites }
          if (g0.acting && !look.acting) look.acting = g0.acting
        })
        break
      }
      case 'global-save':
        await store.updateGlobalCast(gc => {
          const p = gc.cast[name] || (gc.cast[name] = { name, sprites: {}, color: nameColor(name) })
          const patch = input.patch || {}
          if (patch.appearanceFields && typeof patch.appearanceFields === 'object') {
            const fields = cleanLookFields(patch.appearanceFields)
            p.tags = lookTags(fields, p.tags || '')
            if (Object.keys(fields).length) p.fields = fields
            else delete p.fields
          } else if (typeof patch.appearance === 'string') { p.tags = patch.appearance; delete p.fields }
          for (const field of ['gender', 'note', 'negative']) if (typeof patch[field] === 'string') p[field] = patch[field].trim().slice(0, 1000)
          editActingNote(p, patch)
          editVoice(p, patch)
          editHeight(p, patch)
          if (patch.seed === null || patch.seed === '') delete p.seed
          else if (Number.isInteger(Number(patch.seed)) && Number(patch.seed) >= 0) p.seed = Math.min(Number(patch.seed), 2 ** 31 - 1)
        })
        break
      case 'sprite': {
        // 画（或重画）一张差分：默认让立绘设计师重写提示词；给了 tags 就按玩家改好的词画。
        const edit = typeof input.tags === 'string' && input.tags.trim() ? { tags: input.tags, negative: input.negative || '' } : null
        const emotions = (Array.isArray(input.emotions) ? input.emotions : [input.emotion || 'neutral']).slice(0, 500)
        // keepFaces：「按这套设计重画」——身体让设计师照设计重写，表情直接用设计好的，不再重新设计
        requestSprites(gameId, name, { turn: era ? era.turn : turn, emotions, rewrite: input.rewrite !== false, keepFaces: Boolean(input.keepFaces), edit, then: era?.then, mode: era?.mode }).catch(error => log('warn', `立绘失败（${name}）：${shortError(error)}`))
        break
      }
      // 动作与表情设计：acting-design 让设计师读完资料和剧情重新设计整套（后台跑，导演日志里看进度）；acting-save 存玩家改过的
      case 'acting-design': {
        const person = effectivePerson(await store.readGame(gameId), await store.readGlobalCast(), name)
        if (!person) throw new Error('没有这个人物')
        ensureActing(gameId, name, { full: true }).catch(error => log('warn', `动作与表情设计失败（${name}）：${shortError(error)}`))
        break
      }
      case 'acting-save': {
        const sheet = cleanActing(input.acting, { keepIds: true, keepEmpty: true })
        if (!sheet) throw new Error('至少要有一个放了情绪的动作')
        const old = effectivePerson(await store.readGame(gameId), await store.readGlobalCast(), name)?.acting
        // 边改边存：玩家改的时候设计师刚补进来的情绪、表情不丢（情绪放回它该在的动作，表情照留）；表演笔记不在这里改（在档案里）
        completeActing(sheet, (old?.poses || []).flatMap(p => p.emotions), (await emotionLib()))
        sheet.faces = { ...(old?.faces || {}), ...sheet.faces }
        sheet.read = old?.read || ''
        const at = Date.now()
        await store.updateGame(gameId, g => { looksOf(g, name).acting = { ...sheet, at, turn: old?.turn ?? null, readTurn: old?.readTurn ?? old?.turn ?? null, by: 'user' } })
        // 回 at：人物志边改边存，认得出哪一版是自己刚存的
        result = { ok: true, at }
        break
      }
      // 「让设计师重写」表演笔记（replace：换掉玩家写的那条，界面上问过了）
      case 'acting-note': {
        if (!effectivePerson(await store.readGame(gameId), await store.readGlobalCast(), name)) throw new Error('没有这个人物')
        rewriteActingNote(gameId, name, { replace: input.replace === true }).catch(error => log('warn', `表演笔记重写失败（${name}）：${shortError(error)}`))
        break
      }
      case 'sprite-delete': {
        // 删一张（key）或一批（keys）差分。全局角色的差分存在全局库：记录一起删，文件留着（别的对局可能复制过）。
        const keys = (Array.isArray(input.keys) ? input.keys : [input.key]).map(String).filter(Boolean).slice(0, 500)
        let old = []
        await store.updateGame(gameId, g => {
          const look = looksOf(g, name)
          for (const key of keys) {
            old.push(...recordAssets(look.sprites[key]))
            delete look.sprites[key]
            delete look.spriteStatus[key]
          }
        })
        const isGlobal = !(await store.readGame(gameId)).cast?.[name] && Boolean((await store.readGlobalCast()).cast?.[name])
        if (isGlobal) await store.updateGlobalCast(gc => { const p = gc.cast?.[name]; if (p?.sprites) for (const key of keys) delete p.sprites[key] })
        else await releaseAssets(gameId, old)
        result = { ok: true, deleted: keys.length }
        break
      }
      case 'sprite-clear':
        // 清空这个人的全部立绘（acting：连动作与表情设计一起）
        result = { ok: true, ...(await clearSprites(gameId, name, { acting: Boolean(input.acting) })) }
        break
      case 'fill':
        result = { ok: true, ...(await fillMissing(gameId, { name, kinds: ['sprite'] })) }
        break
      // 表情只换脸：face-box 记下动作底图的脸框（浏览器认脸给 rects，手动框给 box；measure 是剧场量脸框，剧场按它把头缩放到一样大），
      // face-redo 换个种子重画一张表情的脸（strength 定死这张的重绘强度，null 回到按强弱自动）
      case 'face-box':
        result = { ok: true, ...(await setFaceBox(gameId, name, String(input.key || ''), { rects: input.rects || null, box: input.box || null, by: input.by === 'hand' ? 'hand' : 'auto', measure: input.measure === true })) }
        break
      case 'face-redo':
        result = { ok: true, ...(await redoFace(gameId, name, String(input.key || ''), 'strength' in (input || {}) ? { strength: input.strength } : {})) }
        break
      case 'upload':
        await saveUpload(gameId, name, input.emotion, input.dataUrl, era ? era.turn : turn, era?.then)
        break
      // 逆转式素材包：aa-pack 给一张差分导入（manifest 是 sprite.json 的内容，files 是文件名 → data URL）；aa-remove 取消
      case 'aa-pack':
        await saveAaPack(gameId, name, input.emotion, input.manifest, input.files, turn, { key: String(input.key || ''), keepImage: Boolean(input.keepImage), rects: input.rects || null })
        break
      case 'aa-remove':
        // 取消一张（key）或一批（keys）差分的动态
        for (const key of (Array.isArray(input.keys) ? input.keys : [input.key]).map(String).filter(Boolean).slice(0, 500)) await removeAaPack(gameId, name, key)
        break
      default:
        throw new Error('未知操作')
    }
    notify(gameId)
    return result
  }

  /**
   * 情绪库（所有对局共用）：内置的和新加的一样能改名、改类别、改替身、改默认表情 tag、停用、删除、合并；类别能加、改、删、排序。
   * 合并、新情绪改名时，这一局（gameId）和全局角色里画好的立绘、动作与表情设计跟过去；别的对局里的靠情绪库里留的指向（standIns）照用。
   */
  async function emotionAction(action, input = {}) {
    const ids = (Array.isArray(input.ids) ? input.ids : [input.id]).map(String).filter(Boolean).slice(0, 500)
    let merged = null // { from, into }：要让立绘跟过去的
    await store.updateEmotions(raw => {
      const lib = Object.assign(raw, cleanEmotionLib(raw))
      switch (action) {
        case 'add': addEmotion(lib, { name: input.name ?? input.id, category: typeof input.category === 'string' ? input.category : undefined, base: String(input.base || '') }); break
        case 'save': {
          // 老的写法：save 一个库里没有的新词就是加进来
          const id = resolveEmotion(input.id, lib)
          if (!isBuiltinEmotion(id) && !lib.list.some(e => e.id === id)) { addEmotion(lib, { name: id, category: typeof input.category === 'string' ? input.category : undefined, base: String(input.base || '') }); break }
          const patch = {}
          for (const k of ['label', 'category', 'base', 'tags', 'face', 'act', 'react', 'recall']) if (typeof input[k] === 'string') patch[k] = input[k]
          if (input.level !== undefined && input.level !== null) patch.level = Number(input.level) || 0
          if (typeof input.off === 'boolean') patch.off = input.off
          editEmotion(lib, id, patch)
          if (typeof input.rename === 'string' && input.rename.trim() && !isBuiltinEmotion(id)) {
            const next = renameEmotion(lib, id, input.rename)
            if (next !== id) merged = { from: [id], into: next }
          }
          break
        }
        case 'move': for (const id of ids) editEmotion(lib, id, { category: String(input.category || '') }); break
        case 'off': for (const id of ids) editEmotion(lib, id, { off: input.off !== false }); break
        case 'reset': for (const id of ids) resetEmotion(lib, id); break
        case 'delete': deleteEmotions(lib, ids); break
        case 'restore': restoreBuiltins(lib, Array.isArray(input.ids) ? input.ids : null); break
        case 'merge': merged = { from: mergeInto(lib, ids, input.into), into: resolveEmotion(input.into, lib) }; break
        case 'category-save': saveCategory(lib, { id: String(input.category || ''), label: String(input.label || ''), ...(typeof input.rep === 'string' ? { rep: input.rep } : {}) }); break
        case 'category-delete': deleteCategory(lib, String(input.category || '')); break
        case 'category-order': orderCategories(lib, Array.isArray(input.order) ? input.order.map(String) : []); break
        case 'category-reset': resetCategories(lib); break
        default: throw new Error('未知的情绪库操作')
      }
    })
    if (merged?.from.length && merged.into) {
      const gameId = input.gameId ? String(input.gameId) : ''
      if (gameId) await store.updateGame(gameId, g => { for (const look of Object.values(g.looks || {})) followMerge(look, merged.from, merged.into) })
      await store.updateGlobalCast(gc => { for (const p of Object.values(gc.cast || {})) followMerge(p, merged.from, merged.into) })
      if (gameId) notify(gameId)
    }
    notify('queue')
    return emotionLib()
  }

  // ───────────────────────── 设置 ─────────────────────────

  // ───────────────────────── 提示词页 ─────────────────────────

  /** 全部提示词：分组、每段的全文和默认、变量说明、改过没有、内置有没有新版、上一次填进去多少字（lib/prompt-book.js）。 */
  const prompts = async () => promptView(await config())

  /** 改一段（text）、恢复默认（reset）、内置有新版时保留自己的（keep）。回改好的这一段。 */
  async function setPrompt(input = {}) {
    const id = String(input.id || '')
    const next = await store.updateConfig(saved => { editPrompt(saved, id, { text: input.text, reset: input.reset === true, keep: input.keep === true }) })
    configCache = settled(resolveConfig(next))
    return { item: promptItem(configCache, id) }
  }

  const PREVIEW = 'FlowGal 预览：不发给模型'

  /**
   * 「预览完整提示词」：照这一局现在的资料、剧情和档案，拼出这个角色这次会发出去的系统提示词和用户消息（走真的拼装，但不发给模型、不花额度）。
   * role：director（最新一轮的导演）/ acting（这个人的整套动作与表情设计）/ sprite（这个人每个动作的底图，没有设计时画平静）/ cg（最新一轮导演挑的插画）/ listen（最新一轮的听音师）。
   */
  async function previewPrompt(gameId, role, { name = '' } = {}) {
    const cfg = await config()
    const game = await store.readGame(gameId)
    const globalCast = await store.readGlobalCast()
    const custom = await emotionLib()
    const scene = Object.values(game.scenes || {}).filter(s => s.units?.length).sort((a, b) => a.turn - b.turn || a.at - b.at).at(-1)
    const trace = {}
    const capture = host => ({ stream() { throw new Error(PREVIEW) }, resolveModelInfo: (...args) => host?.resolveModelInfo?.(...args) })
    const quiet = run => run.catch(error => { if (!String(error?.message || error).includes(PREVIEW)) throw error })
    const needPerson = () => {
      const person = effectivePerson(game, globalCast, name)
      if (!person) throw new Error(name ? `这一局没有 ${name}` : '先选一个人物')
      return person
    }
    if (role === 'director') {
      if (!scene) throw new Error('这一局还没有正文：玩一轮再预览')
      const { provider, model } = await pickModel(gameId, cfg)
      let context = null, info = null
      try { context = await services.tavern?.getCardContext?.({ gameId, turn: scene.turn }) } catch {}
      try { info = await services.tavern?.getTurn?.({ gameId, turn: scene.turn }) } catch {}
      await quiet(direct({
        llm: capture(services.llm), provider, model, units: scene.units, rawText: info?.rawText || info?.text || scene.units.map(u => u.text).join('\n'),
        previous: await previousScript(game, scene.turn), castList: castListAt(game, globalCast, Math.max(0, scene.turn - 1)),
        context, config: cfg, backend: cfg.images.backend, music: (await store.readMusic()).tracks, sounds: (await store.readSoundLib?.())?.sounds || [], emotions: custom,
        // 听音师照样拼，但不发：候选按正文对词挑（日志里那条「听音师失败」不算数，预览里不显示）
        listener: { ...(await pickListenModel(gameId, cfg)), llm: capture(services.llm), problem: '' },
        poseGroups: sheetFor(null, cfg)?.poses || [], trace,
      }))
      trace.notes = [...(trace.notes || []).filter(n => !n.includes(PREVIEW)), ...(trace.listen ? ['预览不跑听音师，上面的音效候选只按正文对词挑；真整理时先照听音师列的声音找（听音师的提示词在「听音师」里预览）'] : [])]
    } else if (role === 'listen') {
      if (!scene) throw new Error('这一局还没有正文：玩一轮再预览')
      const sounds = ((await store.readSoundLib?.())?.sounds || []).filter(s => s.kind !== 'blip')
      const own = await pickListenModel(gameId, cfg)
      await quiet(listenSounds({ llm: capture(own.llm), provider: own.provider, model: own.model, units: scene.units, previous: await previousScript(game, scene.turn), sounds, config: cfg, trace }))
      const listen = trace.listen || {}
      const notes = [...(own.problem ? [own.problem] : []), ...(!cfg.director.listen ? ['设置里关着「先听一遍」，整理时不会跑听音师'] : !wantsListen(cfg, sounds) ? ['音效和环境音都没超过给导演看的候选数（全给导演看了），整理时不会跑听音师'] : [])]
      return { role, name, turn: scene.turn, provider: listen.provider || '', model: listen.model || '', system: listen.system || '', user: listen.user || '', notes }
    } else if (role === 'acting' || role === 'sprite') {
      const person = needPerson()
      const turn = latestTurn(game)
      const { provider, model } = await pickModel(gameId, cfg)
      let context = null
      try { context = await services.tavern?.getCardContext?.({ gameId, turn }) } catch {}
      const story = await storyTurns(gameId, turn)
      const args = { llm: capture(services.llm), provider, model, config: cfg, backend: cfg.images.backend, context, story, turn, person, custom, trace }
      if (role === 'acting') {
        const emotions = actingEmotions(name, custom, { used: usedEmotions(game, name), drawn: Object.keys(person.sprites || {}).map(keyEmotion), extra: [] })
        await quiet(writeActing({ ...args, emotions }))
      } else {
        // 要画的：设计里每个动作的底图；没有设计时画平静
        const asked = person.acting?.poses?.length ? person.acting.poses.map(p => ({ emotion: p.emotions[0], pose: p.id })).filter(a => a.emotion) : [{ emotion: 'neutral', pose: '' }]
        const { planned } = planSprites(gameId, name, person, cfg, asked, custom)
        await quiet(writeSpritePrompts({ ...args, targets: planned, references: spriteReferences(person, planned, custom) }))
      }
    } else if (role === 'cg') {
      if (!scene?.script) throw new Error('最新一轮还没整理好：等导演整理完再预览')
      const images = Object.values(game.images || {}).filter(i => i.textVersion === scene.textVersion)
      const targets = images.length ? cgTargetsOf(images) : [{ key: 'preview', after: '', moment: '' }]
      const { llm, provider, model } = await pickCgModel(gameId, cfg)
      const { context, story, people, references, units } = await cgInputs(gameId, scene, targets)
      await quiet(writeCgPrompts({ llm: capture(llm), provider, model, config: cfg, backend: cfg.images.backend, context, story, turn: scene.turn, units, people, targets, references, trace }))
    } else throw new Error('没有这个角色')
    return { role, name, turn: role === 'director' || role === 'cg' ? scene.turn : latestTurn(game), provider: trace.provider || '', model: trace.model || '', system: trace.system || '', user: trace.user || '', notes: trace.notes || [] }
  }

  async function publicConfig() {
    const cfg = await config()
    const keys = {}
    for (const backend of ['novelai', 'comfyui', 'openai', 'webui', 'cgllm', 'listenllm']) {
      if (backend === 'novelai') {
        for (const e of cfg.novelai.endpoints) keys['novelai:' + e.id] = await secrets.has(secretRef('novelai', { novelai: { endpoint: e.id } }))
      } else keys[backend] = await secrets.has(secretRef(backend, cfg))
    }
    const ready = await backendReady(cfg)
    const presets = { styles: BUILTIN_STYLES }
    // 提示词的改动（prompts）走提示词页自己的接口（/prompts），设置这边不带
    const { prompts: _prompts, ...shown } = cfg
    return { config: shown, keys, ready: ready.ok, readyReason: ready.reason || '', secretStorage: secrets.storage(), presets, paths: { data: store.root, library: store.libraryRoot(cfg.images.libraryDir) } }
  }

  async function patchConfig(patch) {
    // 提示词只从提示词页改（editPrompt：记着改的时候内置是哪一版）；老界面传来的导演那四个大框也不收
    if (patch && typeof patch === 'object') {
      patch = { ...patch }
      delete patch.prompts
      if (patch.director && typeof patch.director === 'object') { patch.director = { ...patch.director }; for (const field of Object.keys(LEGACY_PROMPTS)) delete patch.director[field] }
    }
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
    configCache = settled(resolveConfig(next))
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
    configCache = settled(resolveConfig(next))
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
    configCache = settled(resolveConfig(next))
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
    configCache = settled(resolveConfig(next))
    if (old) await store.removeAsset(old).catch(() => {})
    return publicConfig()
  }

  async function setSecret(backend, endpoint, value) {
    if (!['novelai', 'comfyui', 'openai', 'webui', 'cgllm', 'listenllm'].includes(backend)) throw new Error('未知渠道')
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

  /** 插画分镜师 / 听音师（which = listen）自定义接口上的模型（GET /models）。读不到时 live=false，附原因，设置页让玩家手填。 */
  async function ownModels(which = 'cg') {
    const cfg = await config()
    const [own, secret] = which === 'listen' ? [cfg.director.listenLlm, 'listenllm'] : [cfg.director.cgLlm, 'cgllm']
    try {
      const models = await chatModels({ baseURL: own.baseURL, key: await secrets.get(secretRef(secret)), fetchImpl })
      return { live: true, models, note: models.length ? `已从接口读取 ${models.length} 个模型` : '接口没有返回任何模型，可以手动填写' }
    } catch (error) {
      return { live: false, models: [], note: '读取模型列表失败：' + shortError(error) + '。可以先手动填写。' }
    }
  }
  const cgModels = () => ownModels('cg')

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
    castAction, aaInpaint, emotionAction, emotions: () => emotionLib(),
    facesWaiting: () => [...faceWaits.values()],
    prompts, setPrompt, promptLast: id => promptLast(String(id || '')), previewPrompt,
    publicConfig, patchConfig, uploadSound, removeSound, setSecret, testBackend, listModels, llmModels, cgModels, ownModels, removeGame,
    readAsset: id => store.readAsset(id),
    openLibrary: gameId => library.openFor(gameId),
    sampleStyle,
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn) },
    dispose() { disposed = true; queue.dispose(); for (const run of directorRuns.values()) run.controller.abort(); listeners.clear() },
  }
}
