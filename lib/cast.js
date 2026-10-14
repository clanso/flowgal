// 角色档案（移植柏宝绘的核心机制，并按服装、长期状态分立绘差分）：
// - 有名角色首次出场自动建档；导演只写 @名字，出图前机械替换成「固定外貌 + 当前服装 + 长期状态 + 临时状态」，长相不漂移。
// - 固定外貌（脸、发、瞳、体型）的永久变化按剧情位置生效：变化之前的轮次用旧外貌，之后用新外貌。
// - 服装（衣橱 + 哪一轮起穿哪套）、长期状态（怀孕、骨折打石膏……）同样按剧情位置生效；立绘按「外貌 × 服装 × 长期状态 × 情绪」分差分。
// - 临时状态（湿身、沾了奶油）单独记录，只进插画，解除时清掉。
// - 每个角色一个固定种子，所有立绘差分共用。
// - 每次 AI 改动都记日志，可一键回滚；全局角色的固定外貌冻结，AI 永不修改（换装和状态仍按每局剧情记）。
//
// 存档：
//   game.cast[name]   本局档案：gender, color, createdTurn, versions[{fromTurn,tags,fields?}], seed?, voice?, voicePitch?, note, negative,
//                     actingNote（玩家写的表演笔记：这个人怎么流露情绪；锁住，设计师不改它，见 acting.js）
//   game.looks[name]  本局剧情里的样子（全局角色也有）：outfits{名:{tags}}, wear[{fromTurn,outfit}], states[{fromTurn,list}], temp, sprites{差分:记录}, spriteStatus,
//                     acting（动作与表情设计，见 acting.js）；
//                     全局角色：hiddenOutfits[名]（全局库带来的衣服，这一局从衣橱删掉了）、noDefaultWear（这一局不从第 0 轮起穿全局库的默认服装）
//   globalCast.cast[name] 全局档案：gender, color, tags, fields?, seed?, voice?, voicePitch?, note, negative, actingNote, outfits, outfit（默认服装）, sprites, acting?
//   固定外貌的 fields 是分格的字段（见 look.js），tags 是拼好的出图用的一串；老档案只有 tags。
import { fnv1a, nameSeed, entryAt, lookAt, thenLook, cleanName, cleanLookFields, joinLook, lookTags, lookFieldsOf } from './look.js'
import { cleanVoice, clampPitch } from './sounds.js'
import { cleanHeight } from './stature.js'
import { orderedLines } from './scenes.js'
import { NOTE_CHARS } from './acting.js'

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

/**
 * 全局角色在这一局用的全局库衣橱和默认服装：这一局删掉的那几套（hiddenOutfits）不带，不穿默认服装（noDefaultWear）时没有默认服装。
 * 本局角色两样都没有。
 */
export function sharedLook(game, globalCast, name) {
  const global = !game.cast?.[name] ? globalCast?.cast?.[name] : null
  if (!global) return { outfits: {}, outfit: '' }
  const look = game.looks?.[name] || {}
  const hidden = new Set(look.hiddenOutfits || [])
  return {
    outfits: Object.fromEntries(Object.entries(global.outfits || {}).filter(([outfit]) => !hidden.has(outfit))),
    outfit: !look.noDefaultWear && global.outfit ? global.outfit : '',
  }
}

/** 一个人的完整时间线（前后端算某一轮的样子都用它）。全局角色的默认服装从第 0 轮起，本局换装接在后面。 */
export function timelineOf(game, globalCast, name) {
  const local = game.cast?.[name]
  const global = globalCast?.cast?.[name]
  if (!local && !global) return null
  const look = game.looks?.[name] || {}
  const shared = sharedLook(game, globalCast, name)
  return {
    appearance: local
      ? (local.versions || []).map(v => ({ fromTurn: Number(v.fromTurn) || 0, tags: v.tags, ...(v.fields ? { fields: v.fields } : {}) }))
      : [{ fromTurn: 0, tags: global.tags || '', ...(global.fields ? { fields: global.fields } : {}) }],
    outfits: { ...shared.outfits, ...(look.outfits || {}) },
    wear: [...(shared.outfit ? [{ fromTurn: 0, outfit: shared.outfit }] : []), ...(look.wear || [])],
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
    actingNote: source.actingNote || '',
    negative: source.negative || '',
    height: cleanHeight(source.height), // 档案里写的身高（厘米）；没写时剧场按设计师估的或性别外貌估（lib/stature.js）
    sprites: { ...(local ? {} : global.sprites || {}), ...(look.sprites || {}) },
    // 动作与表情设计：这一局的；全局角色这一局还没有时用全局库里带来的（提升时只带了本性动作，见 lib/pose-life.js 的 worldCarry）。
    // actingFrom：'game' 这一局的，'world' 从全局库带来、还没按这个世界设计过处境动作的
    acting: look.acting || (local ? null : global.acting) || null,
    actingFrom: look.acting ? (look.acting.carried ? 'world' : 'game') : !local && global.acting ? 'world' : '',
    noteHere: look.noteHere || '', // 玩家写的表演笔记·这一局（只管这一局，不带去别的世界）
    eyeRef: look.eyeRef || null, // 瞳色基准：别的立绘照哪张补瞳色（{ key, assetId, by, eyes }，见 lib/eye-color.js 的 paletteOf）
    // 全局角色的全局库衣橱：有哪几套、默认服装，这一局删掉了哪几套、穿不穿默认服装（人物志里删、放回用）；本局角色为 null
    library: local ? null : { outfits: Object.keys(global.outfits || {}), outfit: global.outfit || '', hidden: look.hiddenOutfits || [], noDefaultWear: Boolean(look.noDefaultWear) },
    timeline,
  }
}

/** 某人在段落里当时的样子（档案 + 导演写的 then）：立绘、插画用。临时状态不带进段落。 */
export function personThen(person, entry) {
  if (!person || !entry) return person
  return { ...person, ...thenLook(person, entry, person.timeline?.outfits), temp: '' }
}

/** 段落里当时穿的衣服记进衣橱（不改现在穿的）：之后的回忆还能用同一套，玩家也能在衣橱里改它的 tag。 */
export function rememberThenOutfits(game, globalCast, entries, turn) {
  for (const e of entries || []) {
    if (!e?.outfit || !e.outfitTags) continue
    const timeline = timelineOf(game, globalCast, e.name)
    if (!timeline || timeline.outfits[e.outfit]) continue
    looksOf(game, e.name).outfits[e.outfit] = { tags: e.outfitTags, source: 'ai', at: Date.now() }
    log(game, { turn, name: e.name, action: 'outfit', outfit: e.outfit, after: e.outfitTags })
  }
}

/**
 * 一轮里中途变的样子（导演在变化那一句写的 look）跟 people 对齐，在 applyPeople 之前调，原地改 script：
 * - people 记这一轮结束时的样子（档案时间线按轮记，下一轮接着它）。导演把 people 写成这一轮开头的样子、或者没写，都按变化往后推到结束时。
 * - 每条变化记下换之前穿的（from）、摘下的状态的 tag，没变的（本来就戴着又写戴上）去掉：剧场、立绘、插画按这一句之前 / 之后分开（look.js 的 undoShifts）。
 * 返回要记进衣橱的衣服（中途换上的新衣服、一开头穿的那套），applyPeople 之后交给 rememberThenOutfits。
 */
export function settleShifts(game, globalCast, script, turn) {
  const byName = new Map()
  const lines = orderedLines(script)
  for (const line of lines) for (const s of line.look || []) byName.set(s.name, [...(byName.get(s.name) || []), s])
  const wardrobe = []
  if (!byName.size) return wardrobe
  script.people = Array.isArray(script.people) ? script.people : []
  const prev = Math.max(0, Number(turn) - 1)
  const has = (list, name) => list.some(x => x.name === name)
  for (const [name, shifts] of byName) {
    const timeline = timelineOf(game, globalCast, name)
    let p = script.people.find(x => x.name === name)
    if (!timeline && !p) continue
    if (!p) script.people.push((p = { name }))
    // 长期状态：从开头往后推一遍，去掉没变的；people 写的是结束时的样子（推不出变化）时从上一轮的样子推，只去掉上一轮就有的「戴上」
    if (shifts.some(s => s.on?.length || s.off?.length)) {
      const before = timeline ? entryAt(timeline.states, prev)?.list || [] : []
      const given = Array.isArray(p.states) ? normalizeStates(p.states) : null
      const isEnd = Boolean(given) && !shifts.some(s => (s.on || []).some(x => !has(given, x.name)) || (s.off || []).some(x => has(given, x.name)))
      const tags = new Map([...before, ...(given || []), ...shifts.flatMap(s => s.on || [])].map(x => [x.name, x.tags]))
      let list = isEnd ? before : given || before
      for (const s of shifts) {
        if (s.on) s.on = s.on.filter(x => !has(list, x.name))
        list = [...list, ...(s.on || [])]
        if (s.off) s.off = s.off.filter(x => isEnd || has(list, x.name)).map(x => ({ name: x.name, tags: x.tags || tags.get(x.name) || '' }))
        list = list.filter(x => !(s.off || []).some(y => y.name === x.name))
      }
      p.states = normalizeStates(isEnd ? given : list)
    }
    // 衣服：people 写的跟最后换上的不一样，就是一开头穿的那套；一样（或没写）时一开头穿上一轮的
    const wears = shifts.filter(s => s.outfit)
    if (wears.length) {
      const last = wears[wears.length - 1].outfit
      const was = timeline ? entryAt(timeline.wear, prev)?.outfit || '' : ''
      const first = p.outfit && p.outfit !== last ? p.outfit : was
      if (first && first === p.outfit && p.outfitTags) wardrobe.push({ name, outfit: first, outfitTags: p.outfitTags })
      let now = first
      for (const s of wears) {
        if (s.outfitTags) wardrobe.push({ name, outfit: s.outfit, outfitTags: s.outfitTags })
        if (s.outfit === now) { delete s.outfit; delete s.outfitTags; continue }
        if (now) s.from = now
        now = s.outfit
      }
      if (now && now !== p.outfit) {
        p.outfit = now
        const tagged = [...wears].reverse().find(s => s.outfit === now && s.outfitTags)
        if (tagged) p.outfitTags = tagged.outfitTags
        else delete p.outfitTags
      }
    }
  }
  // 去掉推完什么都没变的
  for (const line of lines) {
    if (!line.look) continue
    line.look = line.look.filter(s => s.outfit || s.on?.length || s.off?.length)
    for (const s of line.look) { if (s.on && !s.on.length) delete s.on; if (s.off && !s.off.length) delete s.off }
    if (!line.look.length) delete line.look
  }
  return wardrobe
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
      const fields = cleanLookFields(Object.keys(cleanLookFields(p.appearance)).length ? p.appearance : p.change)
      const tags = joinLook(fields)
      if (!tags) continue
      local = game.cast[name] = { name, gender: p.gender || '', color: nameColor(name), createdTurn: turn, versions: [{ fromTurn: 0, tags, fields, source: 'ai', at: Date.now() }] }
      log(game, { turn, name, action: 'create', after: tags })
      changed.add(name)
    } else if (local) {
      if (p.gender && !local.gender) local.gender = p.gender
      // change 是变化后的完整外貌（字段或一整串），整条替换。
      const fields = cleanLookFields(p.change)
      const entry = entryAt(local.versions, turn)
      const current = entry?.tags || ''
      const tags = lookTags(fields, current)
      if (tags && tags !== current) {
        local.versions = setAt(local.versions, turn, { tags, fields, source: 'ai' })
        log(game, { turn, name, action: 'change', before: current, after: tags, fieldsBefore: lookFieldsOf(entry) })
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

/** 档案里的身高（厘米）：剧场按它让高的人站得高、矮的站得低。空的不存，按设计师估的或性别外貌估。本局档案和全局档案共用。 */
export function editHeight(person, patch) {
  if (patch.height === undefined) return
  const cm = cleanHeight(patch.height)
  if (cm) person.height = cm
  else delete person.height
}

/** 玩家写的表演笔记：最长 NOTE_CHARS 字，可以分段；写空就是不写了（回到设计师起草的那条）。本局档案和全局档案共用。 */
export function editActingNote(person, patch) {
  if (typeof patch.actingNote !== 'string') return
  const text = patch.actingNote.replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000b-\u001f]/g, '').trim().slice(0, NOTE_CHARS)
  if (text) person.actingNote = text
  else delete person.actingNote
}

/** 用户手动编辑本局档案：固定外貌（写进 fromTurn 起生效的版本）、性别、颜色、种子、身高、声音、立绘备注、表演笔记、立绘负面词。 */
export function editPerson(game, name, patch, turn = 0) {
  game.cast = game.cast || {}
  const person = game.cast[name] || (game.cast[name] = { name, gender: '', color: nameColor(name), createdTurn: turn, versions: [] })
  if (typeof patch.gender === 'string') person.gender = patch.gender
  if (typeof patch.color === 'string' && /^#[0-9a-f]{6}$/i.test(patch.color)) person.color = patch.color
  if (typeof patch.note === 'string') person.note = patch.note.trim().slice(0, 1000)
  if (typeof patch.negative === 'string') person.negative = patch.negative.trim().slice(0, 600)
  editActingNote(person, patch)
  editHeight(person, patch)
  editVoice(person, patch)
  if (patch.seed === null || patch.seed === '') delete person.seed
  else if (Number.isInteger(Number(patch.seed)) && Number(patch.seed) >= 0) person.seed = Math.min(Number(patch.seed), 2 ** 31 - 1)
  // 固定外貌：appearanceFields 是分格写的字段；只给 appearance（一整串）时整串放进「其他」。
  // appearanceTags 是已有的那一串（复制全局角色时带过来）：tag 一样就沿用它，已经画好的立绘编号不变。
  const fields = patch.appearanceFields && typeof patch.appearanceFields === 'object' ? cleanLookFields(patch.appearanceFields)
    : typeof patch.appearance === 'string' ? cleanLookFields(patch.appearance) : null
  if (fields) {
    const base = Number(patch.fromTurn ?? 0)
    const entry = entryAt(person.versions, base)
    const before = entry?.tags || ''
    const after = lookTags(fields, typeof patch.appearanceTags === 'string' && patch.appearanceTags ? patch.appearanceTags : before)
    if (after !== before || JSON.stringify(lookFieldsOf(entry)) !== JSON.stringify(fields)) {
      person.versions = setAt(person.versions, base, { tags: after, fields, source: 'user' })
      log(game, { turn, name, action: 'edit', before, after, fieldsBefore: lookFieldsOf(entry) })
    }
  }
  return person
}

/**
 * 用户手动编辑剧情里的样子：衣橱（outfits: {名: tag 或 null 删除}）、从 turn 起换哪套（wear）、
 * 从 turn 起的长期状态（states: [{name,tags}]）、临时状态（temp）。全局角色也可以，写在本局。
 * global 是全局角色的全局档案（本局角色不给）：删掉全局库带来的那套只在这一局不带它（restoreOutfits 放回）；
 * defaultWear: false 这一局不从第 0 轮起穿全局库的默认服装，true 放回。全局库里的不动（要全局库也删见 editGlobalWardrobe）。
 */
export function editLook(game, name, patch, turn = 0, global = null) {
  const look = looksOf(game, name)
  const hidden = new Set(look.hiddenOutfits || [])
  for (const [raw, tags] of Object.entries(patch.outfits || {})) {
    const outfit = cleanName(raw)
    if (!outfit) continue
    if (tags === null) {
      delete look.outfits[outfit]
      if (global?.outfits?.[outfit]) hidden.add(outfit)
    } else {
      look.outfits[outfit] = { tags: String(tags).trim().slice(0, 600), source: 'user', at: Date.now() }
      hidden.delete(outfit)
    }
  }
  for (const raw of Array.isArray(patch.restoreOutfits) ? patch.restoreOutfits : []) hidden.delete(cleanName(raw))
  if (hidden.size) look.hiddenOutfits = [...hidden]
  else delete look.hiddenOutfits
  if (patch.defaultWear === false) look.noDefaultWear = true
  else if (patch.defaultWear === true) delete look.noDefaultWear
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
  // 改以前的轮次：某个长期状态哪几轮有（stateSpans），某次换装从哪一轮起（wearMove）、删掉某次换装（wearDrop）
  if (patch.stateSpans && typeof patch.stateSpans === 'object') {
    const name0 = cleanName(patch.stateSpans.name)
    if (name0) {
      const before = look.states
      look.states = setStateSpans(look.states, name0, String(patch.stateSpans.tags ?? '').trim().slice(0, 300), patch.stateSpans.spans)
      log(game, { turn: null, name, action: 'span', before: spansText(stateSpans(before)[name0]), after: `${name0}：${spansText(stateSpans(look.states)[name0])}`, timeline: before, source: 'user' })
    }
  }
  if (patch.wearMove && Number.isFinite(Number(patch.wearMove.from)) && Number.isFinite(Number(patch.wearMove.to))) {
    const from = Number(patch.wearMove.from), to = Math.max(0, Math.round(Number(patch.wearMove.to)))
    const entry = look.wear.find(e => Number(e.fromTurn) === from)
    if (entry && from !== to) {
      const before = look.wear
      look.wear = [...look.wear.filter(e => e !== entry && Number(e.fromTurn) !== to), { ...entry, fromTurn: to, source: 'user', at: Date.now() }].sort((a, b) => a.fromTurn - b.fromTurn)
      log(game, { turn: to, name, action: 'wear-edit', before: `第 ${from} 轮起穿${entry.outfit}`, after: `第 ${to} 轮起穿${entry.outfit}`, timeline: before, source: 'user' })
    }
  }
  if (patch.wearDrop != null && Number.isFinite(Number(patch.wearDrop))) {
    const at = Number(patch.wearDrop)
    const entry = look.wear.find(e => Number(e.fromTurn) === at)
    if (entry) {
      const before = look.wear
      look.wear = look.wear.filter(e => e !== entry)
      log(game, { turn: at, name, action: 'wear-edit', before: `第 ${at} 轮起穿${entry.outfit}`, after: '（删掉这次换装）', timeline: before, source: 'user' })
    }
  }
  return look
}

/**
 * 全局库里的衣橱（所有对局共用）：outfits: {名: tag 或 null 删除}。删掉的正好是默认服装时默认服装一起去掉，
 * 各对局里第 0 轮起就不再穿它（之后的换装照旧）。
 */
export function editGlobalWardrobe(person, patch) {
  person.outfits = person.outfits || {}
  for (const [raw, tags] of Object.entries(patch.outfits || {})) {
    const outfit = cleanName(raw)
    if (!outfit) continue
    if (tags === null) {
      delete person.outfits[outfit]
      if (person.outfit === outfit) delete person.outfit
    } else person.outfits[outfit] = { tags: String(tags).trim().slice(0, 600), source: 'user', at: Date.now() }
  }
  return person
}

/**
 * 长期状态的时间线摊成每个状态的起止：{ 名字: [{ from, to, tags }] }，to 是第一轮没有它的轮次（一直有为 null）。
 * 时间线是「从第几轮起是这一串状态」，所以一个状态可以断断续续出现几段。
 */
export function stateSpans(timeline) {
  const out = {}
  const open = new Map()
  for (const entry of [...(timeline || [])].sort((a, b) => a.fromTurn - b.fromTurn)) {
    const at = Number(entry.fromTurn) || 0
    const names = new Set((entry.list || []).map(s => s.name))
    for (const [name, span] of open) if (!names.has(name)) { span.to = at; open.delete(name) }
    for (const st of entry.list || []) {
      if (open.has(st.name)) continue
      const span = { from: at, to: null, tags: st.tags || '' }
      ;(out[st.name] = out[st.name] || []).push(span)
      open.set(st.name, span)
    }
  }
  return out
}

const spansText = spans => (spans || []).map(s => (s.to == null ? `第 ${s.from} 轮起` : `第 ${s.from}–${s.to - 1} 轮`)).join('、') || '没有'

/**
 * 把某个长期状态改成只在这几段里有：spans 是 [[from, to]]，to 是第一轮没有它的轮次（空 = 一直有）；空列表 = 哪一轮都没有。
 * 别的状态不动；前后两条一样的合并，开头空着的不记。
 */
export function setStateSpans(timeline, name, tags, spans) {
  const ranges = (Array.isArray(spans) ? spans : [])
    .map(([a, b]) => [Math.max(0, Math.round(Number(a) || 0)), b == null || b === '' ? null : Math.round(Number(b))])
    .filter(([a, b]) => b == null || b > a)
  const old = timeline || []
  const has = t => ranges.some(([a, b]) => t >= a && (b == null || t < b))
  const bounds = [...new Set([0, ...old.map(e => Number(e.fromTurn) || 0), ...ranges.flatMap(([a, b]) => (b == null ? [a] : [a, b]))])].sort((a, b) => a - b)
  const known = old.flatMap(e => e.list || []).find(s => s.name === name)
  const state = { name, tags: tags || known?.tags || '' }
  const next = []
  for (const t of bounds) {
    const entry = entryAt(old, t)
    const list = (entry?.list || []).filter(s => s.name !== name)
    if (has(t)) {
      const at = (entry?.list || []).findIndex(s => s.name === name)
      list.splice(at >= 0 ? at : list.length, 0, state)
    }
    const prev = next[next.length - 1]
    if (prev ? sameStates(prev.list, list) : !list.length) continue
    const same = entry && Number(entry.fromTurn) === t && sameStates(entry.list, list)
    next.push(same ? entry : { fromTurn: t, list, source: 'user', at: Date.now() })
  }
  return next
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
      else if (i === 0) {
        // 第一条被改过：连字段一起还原（老日志没记字段时整串当作「其他」）。
        const { fields, ...rest } = person.versions[0]
        const tags = entry.before || rest.tags
        person.versions[0] = { ...rest, tags, ...(entry.fieldsBefore && Object.keys(entry.fieldsBefore).length ? { fields: entry.fieldsBefore } : {}) }
      }
    }
  } else if (entry.action === 'temp' && look) {
    look.temp = entry.before ? { tags: entry.before, turn: entry.turn } : null
  } else if (entry.action === 'wear' && look) {
    look.wear = look.wear.filter(e => !(Number(e.fromTurn) === at && e.outfit === entry.after))
  } else if (entry.action === 'states' && look) {
    look.states = look.states.filter(e => !(Number(e.fromTurn) === at && sameStates(e.list, entry.list)))
  } else if (entry.action === 'span' && look && Array.isArray(entry.timeline)) {
    look.states = entry.timeline
  } else if (entry.action === 'wear-edit' && look && Array.isArray(entry.timeline)) {
    look.wear = entry.timeline
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
