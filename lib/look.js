// 角色此刻的样子：固定外貌 + 身上这套衣服 + 长期状态（怀孕、骨折打石膏……）+ 临时状态。
// 立绘差分按「外貌 × 服装 × 长期状态 × 情绪」区分，前后端共用这里的纯函数算差分编号。
// 临时状态（湿身、沾了奶油）只进插画，不分立绘。

/** FNV-1a：常见两字中文名也能分散开。 */
export function fnv1a(text) {
  let h = 0x811c9dc5
  for (const ch of String(text || '')) h = Math.imul(h ^ ch.codePointAt(0), 0x01000193) >>> 0
  return h
}
/** 短散列（36 进制）：外貌改了，差分编号跟着变，旧立绘不会被当成新外貌的。 */
export const shortHash = text => fnv1a(text).toString(36)
/** 角色的默认立绘种子：按名字算，同名角色每局都一样；玩家可以在人物志里改。 */
export const nameSeed = name => fnv1a('seed:' + name) % 2 ** 31

/** 名字类字段（服装名、状态名）去掉分隔符，最多 n 字。 */
export const cleanName = (value, n = 16) => String(value ?? '').replace(/[|+\r\n\t"]/g, '').trim().slice(0, n)

/** 时间线上某一轮生效的那一条（fromTurn 不超过 turn 的最后一条）。 */
export function entryAt(timeline, turn = Infinity) {
  let chosen = null
  for (const entry of timeline || []) if (Number(entry.fromTurn) <= Number(turn)) chosen = entry
  return chosen
}

/**
 * 差分编号：外貌散列 | 服装名 | 长期状态名（排序后用 + 连起来）| 情绪。
 * @param {{ appearance: string, outfit: string, states: { name: string }[] }} look
 */
export function lookKey(look) {
  const states = (look?.states || []).map(s => s.name).filter(Boolean).sort().join('+')
  return `${shortHash(look?.appearance)}|${look?.outfit || ''}|${states}`
}
export const variantKey = (look, emotion) => `${lookKey(look)}|${emotion || 'neutral'}`

/** 一套样子的中文说明：「校服 · 怀孕」，没有服装和状态时是「基础」。 */
export function lookLabel(look) {
  const parts = [look?.outfit, ...(look?.states || []).map(s => s.name)].filter(Boolean)
  return parts.length ? parts.join(' · ') : '基础'
}

// ───────────────────────── 固定外貌的字段 ─────────────────────────
// 跟柏宝绘一样按字段记：导演建档、改外貌时按字段写，人物志里分格编辑。出图用的还是拼好的一串（tags），按下面的顺序拼。
// other 放分不进字段的 tag：旧档案只有一整串时，整串原样放在 other，照常出图，不替玩家猜着拆。
// 固定着装不在这里：衣服按剧情换，走衣橱。

export const LOOK_FIELDS = ['fandom', 'sex', 'hair', 'eyes', 'skin', 'body', 'extra', 'other']
export const LOOK_FIELD_LABELS = { fandom: '同人身份', sex: '性别人数', hair: '头发', eyes: '眼睛', skin: '肤色', body: '体型', extra: '标志特征', other: '其他' }

/** 外貌字段：只留认识的字段、去掉首尾空白；给的是一串字（旧档案、导演只写了一串）就整串放进 other，原样不动。 */
export function cleanLookFields(value) {
  const out = {}
  if (typeof value === 'string') {
    const s = value.trim().slice(0, 1200)
    if (s) out.other = s
    return out
  }
  if (!value || typeof value !== 'object') return out
  for (const f of LOOK_FIELDS) {
    const s = String(value[f] ?? '').trim().replace(/^[,，\s]+|[,，\s]+$/g, '').slice(0, 600)
    if (s && !/^none$/i.test(s)) out[f] = s
  }
  return out
}

/** 按字段顺序拼成出图用的一串。 */
export const joinLook = fields => LOOK_FIELDS.map(f => fields?.[f]).filter(Boolean).join(', ')

/** 时间线上一条外貌记录的字段：旧记录只有 tags，就当作整串放在 other。 */
export const lookFieldsOf = entry => (entry?.fields ? { ...entry.fields } : entry?.tags ? { other: entry.tags } : {})

const tagSet = text => String(text || '').split(/[,，\n]/).map(t => t.trim().toLowerCase()).filter(Boolean).sort().join('\n')

/**
 * 字段存进档案时用的那一串：tag 和原来那串完全一样、只是挪了格子或换了顺序时沿用原串——
 * 立绘差分编号是按这串算的，只是整理字段不该让立绘全部重画。真有增删改才用新拼的。
 */
export const lookTags = (fields, before = '') => {
  const joined = joinLook(fields)
  return before && tagSet(before) === tagSet(joined) ? before : joined
}

/** 给人看的外貌：按字段写「头发 long black hair；眼睛 blue eyes」；只有整串时就是那一串。 */
export function formatLook(fields) {
  const filled = LOOK_FIELDS.filter(f => fields?.[f])
  if (filled.length === 1 && filled[0] === 'other') return fields.other
  return filled.map(f => `${LOOK_FIELD_LABELS[f]} ${fields[f]}`).join('；')
}

/**
 * 时间线形状：{ appearance: [{fromTurn,tags,fields?}], wear: [{fromTurn,outfit}], states: [{fromTurn,list:[{name,tags}]}], outfits: {名:{tags}} }。
 * 返回某一轮的样子：固定外貌（拼好的一串和字段）、服装名和它的 tag、长期状态列表。
 */
export function lookAt(timeline, turn = Infinity) {
  const outfit = entryAt(timeline?.wear, turn)?.outfit || ''
  const face = entryAt(timeline?.appearance, turn)
  return {
    appearance: face?.tags || '',
    appearanceFields: lookFieldsOf(face),
    outfit,
    outfitTags: (outfit && timeline?.outfits?.[outfit]?.tags) || '',
    states: entryAt(timeline?.states, turn)?.list || [],
  }
}

/**
 * 段落（回忆、梦境……）里「当时的样子」：导演在段落里给这个人写的 then（只写和现在不同的）叠在这一轮的样子上。
 * change 是当时的完整固定外貌（年纪、发型不同时）；outfit 是当时穿的（tag 先看衣橱，没有用 then 里写的）；states 是当时的全部长期状态。
 */
export function thenLook(base, entry, outfits = {}) {
  if (!entry) return base
  const fields = entry.change ? cleanLookFields(entry.change) : {}
  const changed = Object.keys(fields).length > 0
  return {
    appearance: changed ? lookTags(fields, base.appearance) : base.appearance,
    appearanceFields: changed ? fields : base.appearanceFields,
    outfit: entry.outfit || base.outfit,
    outfitTags: entry.outfit ? outfits?.[entry.outfit]?.tags || entry.outfitTags || '' : base.outfitTags,
    states: Array.isArray(entry.states) ? entry.states : base.states,
  }
}

/**
 * 一轮里中途变的样子：导演在变化发生的那一句写 look（[{ name, outfit?, from?, on?: [{name,tags}], off?: [{name,tags}] }]），
 * 从那一句起生效；档案的时间线按轮记的是这一轮结束时的样子。lines 是每个要演的单元的标注，按正文顺序。
 * 返回每一句还没发生的变化 { 名字: [变化…（按先后）] }，后面都不再变的为 null。
 */
export function shiftsAhead(lines) {
  const out = new Array(lines.length).fill(null)
  let ahead = null
  for (let i = lines.length - 1; i >= 0; i--) {
    out[i] = ahead
    const list = lines[i]?.look
    if (!Array.isArray(list) || !list.length) continue
    ahead = { ...(ahead || {}) }
    for (const s of list) if (s?.name) ahead[s.name] = [s, ...(ahead[s.name] || [])]
  }
  return out
}

/**
 * 变化之前的样子：把还没发生的变化从这一轮结束时的样子（base）上倒回去——后来戴上的摘掉、后来摘下的戴回去、换上的衣服换回原来那套。
 * 返回叠在 base 上用的 then（写法同段落里当时的样子，shift 标明是这一轮早些时候）；倒回去跟 base 一样时返回 null。
 */
export function undoShifts(base, pending) {
  if (!base || !pending?.length) return null
  let states = [...(base.states || [])]
  for (const s of [...pending].reverse()) {
    const on = new Set((s.on || []).map(x => x.name))
    states = states.filter(x => !on.has(x.name))
    for (const x of s.off || []) if (x?.name && !states.some(y => y.name === x.name)) states.push({ name: x.name, tags: x.tags || '' })
  }
  const entry = { name: pending[0].name, shift: true }
  const wear = pending.find(s => s.outfit)
  if (wear?.from && wear.from !== base.outfit) entry.outfit = wear.from
  const names = list => list.map(x => x.name).sort().join('+')
  if (names(states) !== names(base.states || [])) entry.states = states
  return entry.outfit || entry.states ? entry : null
}

/**
 * 某张差分该用哪张图。同一套样子（外貌、服装、长期状态都一样）里：完全对上 → 替身（base：一个，或者按先后的一串，见 emotions.js 的 standIns）→ 平静 → 任意表情；
 * 再退到同一身衣服、长期状态不同的平静 / 任意一张。不跨服装借图：穿着睡衣时不拿校服立绘顶替，宁可先显示剪影等它画好。
 * strict（段落里当时的样子）：只在同一套样子里找，不借现在的（回忆里不该先顶着现在的黑眼圈）。
 */
export function pickSprite(sprites, look, emotion, base = '', { strict = false } = {}) {
  const all = sprites || {}
  const asset = key => all[key]?.assetId || ''
  for (const emo of [emotion, ...[].concat(base || []), 'neutral']) {
    const hit = emo && asset(variantKey(look, emo))
    if (hit) return hit
    // 只换脸的表情还没换好（等认脸、排队中）：先用它的动作底图，姿势已经对了
    const from = emo && all[variantKey(look, emo)]?.face?.from
    if (from && asset(from)) return asset(from)
  }
  const firstWith = prefix => { const k = Object.keys(all).find(key => key.startsWith(prefix) && all[key]?.assetId); return k ? all[k].assetId : '' }
  const same = firstWith(lookKey(look) + '|')
  if (same || strict) return same
  const outfitPrefix = `${shortHash(look?.appearance)}|${look?.outfit || ''}|`
  const calm = Object.keys(all).find(k => k.startsWith(outfitPrefix) && k.endsWith('|neutral') && all[k]?.assetId)
  return calm ? all[calm].assetId : firstWith(outfitPrefix)
}

/** 时间线上哪一轮是这套样子（取最近的一次）；外貌改过、这套已经不会再出现时返回 null。 */
export function findLookTurn(timeline, key) {
  const turns = new Set([0])
  for (const list of [timeline?.appearance, timeline?.wear, timeline?.states]) for (const e of list || []) turns.add(Number(e.fromTurn) || 0)
  let found = null
  for (const t of [...turns].sort((a, b) => a - b)) if (lookKey(lookAt(timeline, t)) === key) found = t
  return found
}
