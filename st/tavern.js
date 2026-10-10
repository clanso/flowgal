// 酒馆宿主：照 DSH Tavern 插件接口 v1 的样子给引擎用（onTurnSettled / getTurn / getCardContext / backgroundModel /
// attach / update / remove / list / onGameRemoved），引擎不知道自己在哪个宿主。
//   一局 = 酒馆的一个聊天（角色头像 + 聊天名；群聊是 group:<群号> + 聊天名）。
//   一轮 = 一条 AI 楼层。轮次号写在楼层的 extra.flowgal_turn 里，第一次见到时按顺序编（删掉前面的楼层也不会错位）。
//   正文版本 = 轮次 + 第几个回复（swipe）+ 正文哈希：换回复、编辑后就是新版本，导演按版本各整理一份。
//   楼层上挂的卡片（场景卡、插画卡）记在 user/files/flowgal-items-<局号哈希>.json，界面按它画到楼层底下（st/ui.js）。
import { randomId, utf8 } from '../lib/bytes.js'

export const TURN_FIELD = 'flowgal_turn'

/** 正文的短哈希（FNV-1a），区分同一个回复编辑前后。 */
export function textHash(text) {
  let h = 0x811c9dc5
  for (const b of utf8(text)) { h ^= b; h = Math.imul(h, 0x01000193) >>> 0 }
  return h.toString(36)
}

const isStory = m => m && !m.is_user && !m.is_system

export function createStTavern({ getContext = () => globalThis.SillyTavern.getContext(), store, llm, log = () => {} }) {
  const settled = new Set() // onTurnSettled 回调
  const removed = new Set() // onGameRemoved 回调
  const itemListeners = new Set() // 卡片变了（界面重画）
  const index = new Map() // 卡片编号 → 局号
  let saveTimer = null

  /** 现在打开的这一局；没打开聊天时是空。 */
  function currentGameId() {
    const ctx = getContext()
    if (!ctx.chatId) return ''
    if (ctx.groupId) return `group:${ctx.groupId}/${ctx.chatId}`
    const character = ctx.characters?.[ctx.characterId]
    return `${character?.avatar || 'char'}/${ctx.chatId}`
  }
  function card() {
    const ctx = getContext()
    if (ctx.groupId) {
      const group = (ctx.groups || []).find(g => g.id === ctx.groupId)
      return { id: 'group:' + ctx.groupId, name: group?.name || '群聊' }
    }
    const character = ctx.characters?.[ctx.characterId]
    return character ? { id: character.avatar, name: character.name } : null
  }

  /** 给还没有轮次号的 AI 楼层按顺序编号（接在已有的最大号后面），编了就存一下聊天。 */
  function ensureTurns() {
    const ctx = getContext()
    const chat = ctx.chat || []
    let max = 0
    for (const m of chat) if (isStory(m) && Number.isInteger(m.extra?.[TURN_FIELD])) max = Math.max(max, m.extra[TURN_FIELD])
    let changed = false
    for (const m of chat) {
      if (!isStory(m) || Number.isInteger(m.extra?.[TURN_FIELD])) continue
      m.extra = { ...(m.extra || {}), [TURN_FIELD]: ++max }
      changed = true
    }
    if (changed) {
      clearTimeout(saveTimer)
      saveTimer = setTimeout(() => { Promise.resolve(getContext().saveChat?.()).catch(error => log('warn', '存轮次号失败：' + (error?.message || error))) }, 300)
    }
    return chat
  }
  const findTurn = turn => ensureTurns().findIndex(m => isStory(m) && m.extra?.[TURN_FIELD] === turn)
  function turnInfo(message) {
    const turn = message.extra?.[TURN_FIELD]
    const text = String(message.mes ?? '')
    return { gameId: currentGameId(), turn, textVersion: `${turn}.${message.swipe_id || 0}.${textHash(text)}`, text, rawText: text, card: card() }
  }

  // ───── 楼层上的卡片 ─────
  const itemsDoc = async gameId => {
    const digest = await crypto.subtle.digest('SHA-256', utf8(String(gameId)))
    return `flowgal-items-${[...new Uint8Array(digest).slice(0, 16)].map(b => b.toString(16).padStart(2, '0')).join('')}.json`
  }
  const changed = gameId => { for (const fn of itemListeners) { try { fn(gameId) } catch {} } }
  async function editItems(gameId, mutate) {
    const out = await store.updateDoc(await itemsDoc(gameId), { items: {} }, doc => mutate(doc.items))
    changed(gameId)
    return out
  }
  async function gameOf(id) {
    if (index.has(id)) return index.get(id)
    const gameId = currentGameId()
    const doc = await store.readDoc(await itemsDoc(gameId), { items: {} })
    for (const key of Object.keys(doc.items)) index.set(key, gameId)
    return index.get(id) || ''
  }
  /** 这一轮正在显示的版本（只认得打开着的这一局）。 */
  function currentVersion(gameId, turn) {
    if (gameId !== currentGameId()) return null
    const i = findTurn(turn)
    return i < 0 ? null : turnInfo(getContext().chat[i]).textVersion
  }

  // ───── 酒馆事件 → 一轮写完 ─────
  function settle(messageId, why) {
    const message = getContext().chat?.[Number(messageId)]
    if (!isStory(message)) return
    ensureTurns()
    const info = turnInfo(message)
    if (String(info.text).trim().length < 2) return // 换回复时新回复还没写出来
    for (const fn of settled) Promise.resolve().then(() => fn(info)).catch(error => log('warn', `整理第 ${info.turn} 轮失败（${why}）：` + (error?.message || error)))
  }
  const handlers = {
    MESSAGE_RECEIVED: (id, type) => { if (type !== 'impersonate') settle(id, type || 'received') },
    MESSAGE_EDITED: id => settle(id, 'edited'),
    MESSAGE_SWIPED: id => settle(id, 'swiped'),
    CHAT_DELETED: name => {
      const ctx = getContext()
      const character = ctx.characters?.[ctx.characterId]
      const gameId = `${character?.avatar || 'char'}/${String(name).replace(/\.jsonl$/, '')}`
      for (const fn of removed) Promise.resolve(fn({ gameId })).catch(() => {})
    },
  }
  function listen() {
    const { eventSource, eventTypes } = getContext()
    const offs = Object.entries(handlers).map(([name, fn]) => {
      const type = eventTypes[name]
      eventSource.on(type, fn)
      return () => eventSource.removeListener(type, fn)
    })
    return () => offs.forEach(off => off())
  }

  return {
    apiVersion: 1,
    currentGameId,
    ensureTurns,
    listen,
    onItemsChanged(fn) { itemListeners.add(fn); return () => itemListeners.delete(fn) },
    onTurnSettled(fn) { settled.add(fn); return () => settled.delete(fn) },
    onGameRemoved(fn) { removed.add(fn); return () => removed.delete(fn) },

    async getTurn({ gameId, turn }) {
      if (gameId !== currentGameId()) return null
      const i = findTurn(Number(turn))
      return i < 0 ? null : turnInfo(getContext().chat[i])
    },
    /** 角色卡的描述、性格、情境，加上这一局当前触发的世界书条目（只读，不触发世界书事件）。 */
    async getCardContext({ gameId }) {
      if (gameId !== currentGameId()) return null
      const ctx = getContext()
      const fields = ctx.getCharacterCardFields?.() || {}
      const lore = []
      try {
        const chat = (ctx.chat || []).filter(m => !m.is_system).map(m => String(m.mes || '')).reverse()
        const wi = await ctx.getWorldInfoPrompt(chat, Number(ctx.maxContext) || 8192, true, {
          personaDescription: fields.persona || '', characterDescription: fields.description || '', characterPersonality: fields.personality || '',
          characterDepthPrompt: fields.charDepthPrompt || '', scenario: fields.scenario || '', creatorNotes: fields.creatorNotes || '', trigger: 'normal',
        })
        if (wi?.worldInfoString) lore.push({ title: '世界书', content: wi.worldInfoString })
      } catch (error) { log('warn', '读世界书失败：' + (error?.message || error)) }
      return { description: fields.description || '', personality: fields.personality || '', scenario: fields.scenario || '', lore }
    },
    async backgroundModel() { return llm.current() },

    async attach({ gameId, turn, textVersion, item }) {
      const id = randomId(12)
      index.set(id, gameId)
      await editItems(gameId, items => { items[id] = { ...item, id, gameId, turn, textVersion, at: Date.now() } })
      return { id }
    },
    async update(id, changes) {
      const gameId = await gameOf(id)
      if (!gameId) return null
      return editItems(gameId, items => {
        if (!items[id]) return null
        items[id] = { ...items[id], ...changes } // 跟 DSH 一样整项覆盖（引擎每次都给全 data）
        return items[id]
      })
    },
    async remove(id) {
      const gameId = await gameOf(id)
      if (!gameId) return false
      index.delete(id)
      return editItems(gameId, items => { const had = Boolean(items[id]); delete items[id]; return had })
    },
    async list({ gameId }) {
      const doc = await store.readDoc(await itemsDoc(gameId), { items: {} })
      return Object.values(doc.items).map(item => {
        index.set(item.id, gameId)
        const now = currentVersion(gameId, item.turn)
        return { ...item, current: now ? now === item.textVersion : true }
      })
    },
  }
}
