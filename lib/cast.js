// 角色外貌档案（移植柏宝绘的核心机制）：
// - 有名角色首次出场自动建档；导演只写 @名字，出图前机械替换成档案外貌，外貌不漂移。
// - 永久变化按剧情位置生效：变化之前的轮次用旧外貌，之后用新外貌。
// - 临时状态（湿身、包扎）单独记录，不污染档案，解除时清掉。
// - 每次 AI 改动都记日志，可一键回滚；全局角色是冻结档案，AI 永不修改。

const NAME_COLORS = ['#f2739b', '#7aa2ff', '#ffb35c', '#5fd3b3', '#c58bff', '#ff7a6b', '#59c3ff', '#e5c34f', '#9be36b', '#ff8ad8']

export function nameColor(name) {
  // FNV-1a：常见两字中文名也能分散到不同颜色。
  let h = 0x811c9dc5
  for (const ch of String(name)) h = Math.imul(h ^ ch.codePointAt(0), 0x01000193) >>> 0
  return NAME_COLORS[h % NAME_COLORS.length]
}

function versionAt(person, turn) {
  const versions = person.versions || []
  let chosen = versions[0]
  for (const v of versions) if (Number(v.fromTurn) <= Number(turn)) chosen = v
  return chosen
}

/** 某人在某一轮的有效档案；本局档案优先，其次全局档案。 */
export function effectivePerson(game, globalCast, name, turn = Infinity) {
  const local = game.cast?.[name]
  if (local) {
    const v = versionAt(local, turn)
    const temp = local.temp && Number(local.temp.turn) <= Number(turn) ? local.temp.tags : ''
    return { name, gender: local.gender || '', appearance: v?.tags || '', temp, sprites: { ...(globalCast?.cast?.[name]?.sprites || {}), ...(local.sprites || {}) }, color: local.color || nameColor(name), global: false }
  }
  const g = globalCast?.cast?.[name]
  if (g) return { name, gender: g.gender || '', appearance: g.tags || '', temp: '', sprites: { ...(g.sprites || {}) }, color: g.color || nameColor(name), global: true }
  return null
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

/** 应用导演给的 people 更新。返回实际变动的人名。 */
export function applyPeople(game, globalCast, people, turn) {
  game.cast = game.cast || {}
  const changed = []
  for (const p of people || []) {
    const name = p.name
    const local = game.cast[name]
    if (!local && globalCast?.cast?.[name]) continue // 全局档案冻结
    if (!local) {
      const tags = p.appearance || p.change
      if (!tags) continue
      game.cast[name] = { name, gender: p.gender || '', color: nameColor(name), createdTurn: turn, versions: [{ fromTurn: 0, tags, source: 'ai', at: Date.now() }], temp: null, sprites: {} }
      log(game, { turn, name, action: 'create', after: tags })
      changed.push(name)
    } else {
      if (p.gender && !local.gender) local.gender = p.gender
      const current = versionAt(local, turn)?.tags || ''
      if (p.change && p.change !== current) {
        local.versions = (local.versions || []).filter(v => Number(v.fromTurn) !== Number(turn))
        local.versions.push({ fromTurn: turn, tags: p.change, source: 'ai', at: Date.now() })
        local.versions.sort((a, b) => a.fromTurn - b.fromTurn)
        log(game, { turn, name, action: 'change', before: current, after: p.change })
        // 外貌变了，旧立绘不再可信：只清本局生成的，用户上传的保留。
        for (const [emo, asset] of Object.entries(local.sprites || {})) if (!local.uploaded?.[emo]) delete local.sprites[emo]
        changed.push(name)
      }
    }
    const person = game.cast[name]
    if (person && p.temp) {
      const before = person.temp?.tags || ''
      if (/^none$/i.test(p.temp)) { if (before) { person.temp = null; log(game, { turn, name, action: 'temp', before, after: '' }) } }
      else if (p.temp !== before) { person.temp = { tags: p.temp, turn }; log(game, { turn, name, action: 'temp', before, after: p.temp }) }
    }
  }
  return changed
}

/** 用户手动编辑档案（写入当前轮次之后生效的版本，或直接改基础外貌）。 */
export function editPerson(game, name, patch, turn = 0) {
  game.cast = game.cast || {}
  const person = game.cast[name] || (game.cast[name] = { name, gender: '', color: nameColor(name), createdTurn: turn, versions: [], temp: null, sprites: {} })
  if (typeof patch.gender === 'string') person.gender = patch.gender
  if (typeof patch.color === 'string' && /^#[0-9a-f]{6}$/i.test(patch.color)) person.color = patch.color
  if (typeof patch.appearance === 'string') {
    const before = versionAt(person, Infinity)?.tags || ''
    if (patch.appearance !== before) {
      const base = Number(patch.fromTurn ?? 0)
      person.versions = (person.versions || []).filter(v => Number(v.fromTurn) !== base)
      person.versions.push({ fromTurn: base, tags: patch.appearance, source: 'user', at: Date.now() })
      person.versions.sort((a, b) => a.fromTurn - b.fromTurn)
      log(game, { turn, name, action: 'edit', before, after: patch.appearance })
    }
  }
  if (typeof patch.temp === 'string') person.temp = patch.temp.trim() ? { tags: patch.temp.trim(), turn } : null
  return person
}

/** 回滚一条 AI 改动日志。 */
export function rollback(game, index) {
  const entry = game.castLog?.[index]
  if (!entry || entry.rolledBack) throw new Error('找不到这条改动，或已回滚')
  const person = game.cast?.[entry.name]
  if (entry.action === 'create') delete game.cast[entry.name]
  else if (entry.action === 'change' || entry.action === 'edit') {
    if (person) {
      const at = person.versions.findIndex(v => v.tags === entry.after)
      if (at > 0) person.versions.splice(at, 1)
      else if (at === 0) person.versions[0] = { ...person.versions[0], tags: entry.before || person.versions[0].tags }
    }
  } else if (entry.action === 'temp' && person) {
    person.temp = entry.before ? { tags: entry.before, turn: entry.turn } : null
  }
  entry.rolledBack = true
}

function escapeRe(text) { return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') }

/**
 * 把 tag 里的 @名字 替换成外貌。名字按长度降序匹配，避免「林」吃掉「林岚」。
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
      return [person.appearance, person.temp].filter(Boolean).join(', ')
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
