// 角色档案（移植柏宝绘的核心机制，并按服装、长期状态分立绘差分）：
// - 有名角色首次出场自动建档；导演只写 @名字，出图前机械替换成「固定外貌 + 当前服装 + 长期状态 + 临时状态」，长相不漂移。
// - 固定外貌（脸、发、瞳、体型）的永久变化按剧情位置生效：变化之前的轮次用旧外貌，之后用新外貌。
// - 服装（衣橱 + 哪一轮起穿哪套）、长期状态（怀孕、骨折打石膏……）同样按剧情位置生效；立绘按「外貌 × 服装 × 长期状态 × 情绪」分差分。
// - 临时状态（湿身、沾了奶油）单独记录，只进插画，解除时清掉。
// - 每个角色一个固定种子，所有立绘差分共用。
// - 每次 AI 改动都记日志，可一键回滚；全局角色的固定外貌冻结，AI 永不修改（换装和状态仍按每局剧情记）。
//
// 存档：
//   game.cast[name]   本局档案：gender, color, createdTurn, versions[{fromTurn,tags}], seed?, voice?, voicePitch?, note, negative
//   game.looks[name]  本局剧情里的样子（全局角色也有）：outfits{名:{tags}}, wear[{fromTurn,outfit}], states[{fromTurn,list}], temp, sprites{差分:记录}, spriteStatus
//   globalCast.cast[name] 全局档案：gender, color, tags, seed?, voice?, voicePitch?, note, negative, outfits, outfit（默认服装）, sprites
import { fnv1a, nameSeed, entryAt, lookAt, cleanName } from './look.js'
import { cleanVoice, clampPitch } from './sounds.js'

const NAME_COLORS = ['#f2739b', '#7aa2ff', '#ffb35c', '#5fd3b3', '#c58bff', '#ff7a6b', '#59c3ff', '#e5c34f', '#9be36b', '#ff8ad8']

export const nameColor = name => NAME_COLORS[fnv1a(name) % NAME_COLORS.length]

/** 本局剧情里的样子；没有就建一份空的。 */
export function looksOf(game, name) {
  game.looks = game.looks || {}
  const look = game.looks[name] || (game.looks[name] = {})
  look.outfits = look.outfits || {}
  look.wear = look.wear || []
  look.states = look.states || []
  look.sprites = look.sprites || {}
  look.spriteStatus = look.spriteStatus || {}
  return look
}

/** 时间线上在 turn 这一轮写入一条（同一轮的旧条目被替换），按轮次排好。 */
function setAt(timeline, turn, entry) {
  const at = Number(turn) || 0
  return [...(timeline || []).filter(e => Number(e.fromTurn) !== at), { fromTurn: at, ...entry, at: Date.now() }].sort((a, b) => a.fromTurn - b.fromTurn)
}

/** 一个人的完整时间线（前后端算某一轮的样子都用它）。全局角色的默认服装从第 0 轮起，本局换装接在后面。 */
export function timelineOf(game, globalCast, name) {
  const local = game.cast?.[name]
  const global = globalCast?.cast?.[name]
  if (!local && !global) return null
  const look = game.looks?.[name] || {}
  return {
    appearance: local ? (local.versions || []).map(v => ({ fromTurn: Number(v.fromTurn) || 0, tags: v.tags })) : [{ fromTurn: 0, tags: global.tags || '' }],
    outfits: { ...(local ? {} : global.outfits || {}), ...(look.outfits || {}) },
    wear: [...(!local && global.outfit ? [{ fromTurn: 0, outfit: global.outfit }] : []), ...(look.wear || [])],
    states: look.states || [],
  }
}

/** 某人在某一轮的有效档案；本局档案优先，其次全局档案。 */
export function effectivePerson(game, globalCast, name, turn = Infinity) {
  const timeline = timelineOf(game, globalCast, name)
  if (!timeline) return null
  const local = game.cast?.[name]
  const global = globalCast?.cast?.[name]
  const source = local || global
  const look = game.looks?.[name] || {}
  const now = lookAt(timeline, turn)
  return {
    name,
    gender: source.gender || '',
    color: source.color || nameColor(name),
    global: !local,
    ...now,
    temp: look.temp && Number(look.temp.turn) <= Number(turn) ? look.temp.tags : '',
    seed: Number.isInteger(source.seed) && source.seed >= 0 ? source.seed : nameSeed(name),
    voice: cleanVoice(source.voice),
    voicePitch: clampPitch(source.voicePitch),
    note: source.note || '',
    negative: source.negative || '',
    sprites: { ...(local ? {} : global.sprites || {}), ...(look.sprites || {}) },
    timeline,
  }
}

export function allNames(game, globalCast) {
  return [...new Set([...Object.keys(game.cast || {}), ...Object.keys(globalCast?.cast || {})])]
}

export function castListAt(game, globalCast, turn) {
  return allNames(game, globalCast).map(n => effectivePerson(game, globalCast, n, turn)).filter(Boolean)
}

function log(game, entry) {
  game.castLog = Array.isArray(game.castLog) ? game.castLog : []
  game.castLog.push({ at: Date.now(), ...entry })
  if (game.castLog.length > 500) game.castLog.splice(0, game.castLog.length - 500)
}

const stateNames = list => (list || []).map(s => s.name).join('、')
const sameStates = (a, b) => JSON.stringify((a || []).map(s => [s.name, s.tags])) === JSON.stringify((b || []).map(s => [s.name, s.tags]))

/** 应用导演给的 people 更新。返回实际变动的人名。 */
export function applyPeople(game, globalCast, people, turn) {
  game.cast = game.cast || {}
  const changed = new Set()
  for (const p of people || []) {
    const name = p.name
    let local = game.cast[name]
    const global = !local ? globalCast?.cast?.[name] : null
    if (!local && !global) {
      const tags = p.appearance || p.change
      if (!tags) continue
      local = game.cast[name] = { name, gender: p.gender || '', color: nameColor(name), createdTurn: turn, versions: [{ fromTurn: 0, tags, source: 'ai', at: Date.now() }] }
      log(game, { turn, name, action: 'create', after: tags })
      changed.add(name)
    } else if (local) {
      if (p.gender && !local.gender) local.gender = p.gender
      const current = entryAt(local.versions, turn)?.tags || ''
      if (p.change && p.change !== current) {
        local.versions = setAt(local.versions, turn, { tags: p.change, source: 'ai' })
        log(game, { turn, name, action: 'change', before: current, after: p.change })
        changed.add(name)
      }
    }
    // 服装、长期状态、临时状态：本局角色和全局角色都按剧情记。
    const timeline = timelineOf(game, globalCast, name)
    const look = looksOf(game, name)
    const outfit = cleanName(p.outfit)
    if (outfit) {
      const known = timeline.outfits[outfit]
      if (p.outfitTags && !known) {
        look.outfits[outfit] = { tags: p.outfitTags, source: 'ai', at: Date.now() }
        log(game, { turn, name, action: 'outfit', outfit, after: p.outfitTags })
        changed.add(name)
      }
      const wearing = entryAt(timeline.wear, turn)?.outfit || ''
      if (outfit !== wearing) {
        look.wear = setAt(look.wear, turn, { outfit, source: 'ai' })
        log(game, { turn, name, action: 'wear', before: wearing, after: outfit })
        changed.add(name)
      }
    }
    if (Array.isArray(p.states)) {
      const before = entryAt(look.states, turn)?.list || []
      if (!sameStates(before, p.states)) {
        look.states = setAt(look.states, turn, { list: p.states, source: 'ai' })
        log(game, { turn, name, action: 'states', before: stateNames(before), after: stateNames(p.states), list: p.states })
        changed.add(name)
      }
    }
    if (p.temp) {
      const before = look.temp?.tags || ''
      if (/^none$/i.test(p.temp)) { if (before) { look.temp = null; log(game, { turn, name, action: 'temp', before, after: '' }) } }
      else if (p.temp !== before) { look.temp = { tags: p.temp, turn }; log(game, { turn, name, action: 'temp', before, after: p.temp }) }
    }
  }
  return [...changed]
}

/** 档案里的声音（打字音音色、升降几个半音）：空的不存，按自动分配。本局档案和全局档案共用。 */
export function editVoice(person, patch) {
  if (typeof patch.voice === 'string') { const voice = cleanVoice(patch.voice); if (voice) person.voice = voice; else delete person.voice }
  if (patch.voicePitch !== undefined) { const pitch = clampPitch(patch.voicePitch); if (pitch) person.voicePitch = pitch; else delete person.voicePitch }
}

/** 用户手动编辑本局档案：固定外貌（写进 fromTurn 起生效的版本）、性别、颜色、种子、声音、立绘备注、立绘负面词。 */
export function editPerson(game, name, patch, turn = 0) {
  game.cast = game.cast || {}
  const person = game.cast[name] || (game.cast[name] = { name, gender: '', color: nameColor(name), createdTurn: turn, versions: [] })
  if (typeof patch.gender === 'string') person.gender = patch.gender
  if (typeof patch.color === 'string' && /^#[0-9a-f]{6}$/i.test(patch.color)) person.color = patch.color
  if (typeof patch.note === 'string') person.note = patch.note.trim().slice(0, 1000)
  if (typeof patch.negative === 'string') person.negative = patch.negative.trim().slice(0, 600)
  editVoice(person, patch)
  if (patch.seed === null || patch.seed === '') delete person.seed
  else if (Number.isInteger(Number(patch.seed)) && Number(patch.seed) >= 0) person.seed = Math.min(Number(patch.seed), 2 ** 31 - 1)
  if (typeof patch.appearance === 'string') {
    const base = Number(patch.fromTurn ?? 0)
    const before = entryAt(person.versions, base)?.tags || ''
    if (patch.appearance !== before) {
      person.versions = setAt(person.versions, base, { tags: patch.appearance, source: 'user' })
      log(game, { turn, name, action: 'edit', before, after: patch.appearance })
    }
  }
  return person
}

/**
 * 用户手动编辑剧情里的样子：衣橱（outfits: {名: tag 或 null 删除}）、从 turn 起换哪套（wear）、
 * 从 turn 起的长期状态（states: [{name,tags}]）、临时状态（temp）。全局角色也可以，写在本局。
 */
export function editLook(game, name, patch, turn = 0) {
  const look = looksOf(game, name)
  for (const [raw, tags] of Object.entries(patch.outfits || {})) {
    const outfit = cleanName(raw)
    if (!outfit) continue
    if (tags === null) delete look.outfits[outfit]
    else look.outfits[outfit] = { tags: String(tags).trim().slice(0, 600), source: 'user', at: Date.now() }
  }
  if (typeof patch.wear === 'string') {
    const outfit = cleanName(patch.wear)
    look.wear = outfit ? setAt(look.wear, turn, { outfit, source: 'user' }) : look.wear.filter(e => Number(e.fromTurn) !== Number(turn))
    log(game, { turn, name, action: 'wear', after: outfit, source: 'user' })
  }
  if (Array.isArray(patch.states)) {
    const list = normalizeStates(patch.states)
    look.states = setAt(look.states, turn, { list, source: 'user' })
    log(game, { turn, name, action: 'states', after: stateNames(list), list, source: 'user' })
  }
  if (typeof patch.temp === 'string') look.temp = patch.temp.trim() ? { tags: patch.temp.trim(), turn } : null
  return look
}

/** 长期状态列表：名字去重，最多 6 个。 */
export function normalizeStates(list) {
  const out = []
  for (const s of Array.isArray(list) ? list : []) {
    const name = cleanName(s?.name)
    if (!name || out.some(x => x.name === name)) continue
    out.push({ name, tags: String(s?.tags || '').trim().slice(0, 300) })
    if (out.length >= 6) break
  }
  return out
}

/** 回滚一条 AI 改动日志。 */
export function rollback(game, index) {
  const entry = game.castLog?.[index]
  if (!entry || entry.rolledBack) throw new Error('找不到这条改动，或已回滚')
  const person = game.cast?.[entry.name]
  const look = game.looks?.[entry.name]
  const at = Number(entry.turn) || 0
  if (entry.action === 'create') { delete game.cast[entry.name]; if (game.looks) delete game.looks[entry.name] }
  else if (entry.action === 'change' || entry.action === 'edit') {
    if (person) {
      const i = person.versions.findIndex(v => v.tags === entry.after)
      if (i > 0) person.versions.splice(i, 1)
      else if (i === 0) person.versions[0] = { ...person.versions[0], tags: entry.before || person.versions[0].tags }
    }
  } else if (entry.action === 'temp' && look) {
    look.temp = entry.before ? { tags: entry.before, turn: entry.turn } : null
  } else if (entry.action === 'wear' && look) {
    look.wear = look.wear.filter(e => !(Number(e.fromTurn) === at && e.outfit === entry.after))
  } else if (entry.action === 'states' && look) {
    look.states = look.states.filter(e => !(Number(e.fromTurn) === at && sameStates(e.list, entry.list)))
  } else if (entry.action === 'outfit' && look) {
    if (look.outfits[entry.outfit]?.tags === entry.after) delete look.outfits[entry.outfit]
  }
  entry.rolledBack = true
}

function escapeRe(text) { return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') }

/** @名字 展开成的外观：固定外貌、身上的衣服、长期状态、临时状态。 */
export const personTags = person => [person.appearance, person.outfitTags, ...(person.states || []).map(s => s.tags), person.temp].filter(Boolean).join(', ')

/**
 * 把 tag 里的 @名字 替换成外观。名字按长度降序匹配，避免「林」吃掉「林岚」。
 * @returns {{ text: string, people: string[] }}
 */
export function expandMentions(tags, resolve, names) {
  const people = []
  const sorted = [...names].sort((a, b) => b.length - a.length)
  let text = String(tags || '')
  if (sorted.length) {
    const re = new RegExp('@\\{?(' + sorted.map(escapeRe).join('|') + ')\\}?', 'gu')
    text = text.replace(re, (_, name) => {
      const person = resolve(name)
      if (!person) return name
      people.push(name)
      return personTags(person)
    })
  }
  // 档案里没有的 @名字：去掉 @，保留名字本身。
  text = text.replace(/@\{?([^\s,，{}]+)\}?/gu, '$1')
  return { text: tidyTags(text), people }
}

export function tidyTags(text) {
  const seen = new Set()
  return String(text).split(/[,，\n]+/).map(t => t.trim()).filter(t => {
    if (!t) return false
    const key = t.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  }).join(', ')
}

/** 人数 tag（1girl, 2girls, 1boy...）放到最前面，NovelAI / Danbooru 模型更听话。 */
export function hoistCountTags(text) {
  const tags = String(text).split(', ')
  const counts = tags.filter(t => /^(\d\+?(girls?|boys?|others?)|multiple (girls|boys)|no humans|solo)$/i.test(t))
  return [...counts, ...tags.filter(t => !counts.includes(t))].join(', ')
}
