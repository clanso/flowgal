// 动作跟着剧情和世界线变：每个人的动作分「本性」和「处境」两种。
//  - 本性（self）：从性格、教养、习惯来，换个世界、过多少年都还是他。全局角色库只带这一种去别的世界。
//  - 处境（situ）：从当下的处境来（一段关系、一件信物、一道伤），写着前提 premise；靠某个长期状态的写在 needs 里。
//    前提不成立了就收起：靠的长期状态没了（项链摘了、诅咒解了）代码直接判断；靠剧情的由导演在跨过前提的那一句写 situ 收起，
//    又回到那种处境时写放回。收起不是删除：已画好的图留着，回忆、梦这类段落里照旧能用。
//  - 没标的（老设计）当本性用，导演不收起它；引擎会让设计师补标。
// 一个动作上的记录（存在 acting.poses[] 上，跟着这个动作走）：
//   kind: 'self' | 'situ'；premise：前提（中文一句）；needs：[{ name, tags }] 靠的长期状态（tags 是记下时那个状态的 tag，导演改了状态名也认得出）；
//   from：{ turn, at } 这个动作从哪一句起才有（复盘时为新处境设计的）；
//   joins：{ 情绪: { turn, at } } 复盘时从哪一句起才放进这个动作的情绪（之前的轮次重演时还是原来的样子）；
//   life：[{ turn, at, on, why, by: 'ai' | 'user', src: 'director' | 'review' | 'label' | 'user', dropped? }]
//     第 turn 轮 at 这一句（单元编号；空着是那一轮开头）起收起（on false）或放回（on true）。dropped 是玩家撤回的（不算）。
// 剧场和出图一句一句走（lib/poses.js 的 poseWalker），每一句按这里算出这个人此刻还能用的那几个动作（liveSheet）。
// 前后端共用这里的纯函数。
import { splitTags, tagKey } from './image/style.js'
import { settleNeutral } from './poses.js'
import { lookAt, thenLook, undoShifts } from './look.js'

export const POSE_KINDS = ['self', 'situ']
export const KIND_LABEL = { self: '本性', situ: '处境' }
export const PREMISE_CHARS = 120
export const WHY_CHARS = 60
const SOURCES = ['director', 'review', 'label', 'world', 'user']

const clip = (value, n) => String(value ?? '').replace(/[\r\n\t]+/g, ' ').trim().slice(0, n)
const stateName = value => clip(typeof value === 'string' ? value : value?.name, 16).replace(/[|+"]/g, '')
const turnOf = value => (Number.isInteger(Number(value)) && Number(value) >= 0 ? Number(value) : null)

/** 种类：认得的才收（「本性」「处境」中文也认）。 */
export function cleanKind(value) {
  const v = String(value ?? '').trim().toLowerCase()
  if (POSE_KINDS.includes(v)) return v
  if (v === '本性' || v === 'trait' || v === 'core') return 'self'
  if (v === '处境' || v === 'situation' || v === 'state') return 'situ'
  return ''
}

/** 靠的长期状态：名字（和记下时的 tag），同名的只留一个，最多 6 个。 */
export function cleanNeeds(raw) {
  const out = []
  for (const n of Array.isArray(raw) ? raw : raw ? [raw] : []) {
    const name = stateName(n)
    if (!name || out.some(x => x.name === name)) continue
    const tags = clip(typeof n === 'object' ? n?.tags : '', 400)
    out.push(tags ? { name, tags } : { name })
    if (out.length >= 6) break
  }
  return out
}

export function cleanFrom(raw) {
  const turn = turnOf(raw?.turn)
  return turn == null ? null : { turn, at: clip(raw.at, 16) }
}

/** 收起 / 放回的记录：轮次必须有；最多留 64 条（最早的先丢）。 */
export function cleanLife(raw) {
  const out = []
  for (const e of Array.isArray(raw) ? raw : []) {
    const turn = turnOf(e?.turn)
    if (turn == null) continue
    const by = e.by === 'user' ? 'user' : 'ai'
    out.push({
      turn, at: clip(e.at, 16), on: e.on === true, why: clip(e.why, WHY_CHARS), by,
      src: SOURCES.includes(e.src) ? e.src : by === 'user' ? 'user' : 'director',
      ...(e.dropped ? { dropped: true } : {}),
    })
  }
  return out.slice(-64)
}

/** 一个动作上「本性 / 处境」那几样，整理好（给 cleanPose 用）：没有的不写。 */
export function cleanSitu(p) {
  const kind = cleanKind(p?.kind)
  const premise = kind === 'situ' ? clip(p?.premise, PREMISE_CHARS) : ''
  const needs = cleanNeeds(p?.needs)
  const from = cleanFrom(p?.from)
  const life = cleanLife(p?.life)
  return { ...(kind ? { kind } : {}), ...(premise ? { premise } : {}), ...(needs.length ? { needs } : {}), ...(from ? { from } : {}), ...(life.length ? { life } : {}) }
}

/** 老设计：一个动作都没标本性还是处境（让设计师补标）。 */
export const unlabeled = acting => Boolean(acting?.poses?.length) && acting.poses.every(p => !p.kind)

/** 导演能不能收起它：处境的，和老设计里还没标的；本性的不收。 */
export const retirable = pose => pose?.kind !== 'self'

// ───────────────────────── 此刻在不在台上 ─────────────────────────

/**
 * 一条记录在这一轮里的位置：更早的轮次 -∞，之后的 +∞；这一轮里按单元的顺序（order：单元编号 → 第几句），
 * 写在那一轮开头（at 空着）或单元找不到了（不演的、合并掉的）算开头 -1；不知道单元顺序时算这一轮中间 0。
 */
function posOf(turn, at, ctx) {
  if (turn < ctx.turn) return -Infinity
  if (turn > ctx.turn) return Infinity
  if (!at) return -1
  if (!ctx.order) return 0
  return ctx.order.has(at) ? ctx.order.get(at) : -1
}

/** 按 [轮次, 句子, 谁写的, 先后] 比：a 在 b 之后。 */
function later(a, b) {
  for (let k = 0; k < a.length; k++) if (a[k] !== b[k]) return a[k] > b[k]
  return false
}

/** 两个长期状态是不是同一个：名字一样、一个名字包着另一个，或者记下的 tag 有一个对得上（导演改了状态名也认得出）。 */
function sameState(need, state) {
  const a = need.name, b = String(state?.name || '')
  if (!b) return false
  if (a === b || (a.length >= 2 && b.includes(a)) || (b.length >= 2 && a.includes(b))) return true
  if (!need.tags || !state.tags) return false
  const want = new Set(splitTags(need.tags).map(tagKey).filter(Boolean))
  return splitTags(state.tags).some(t => want.has(tagKey(t)))
}

/** 这个动作靠的长期状态里，此刻没有的那几个（states 不给就不看）。 */
export function missingNeeds(pose, states) {
  if (!Array.isArray(states) || !pose?.needs?.length) return []
  return pose.needs.filter(n => !states.some(s => sameState(n, s))).map(n => n.name)
}

/**
 * 这个动作此刻能不能用，和为什么不能。
 * ctx：{ turn, index（这一轮第几句，-1 开头、Infinity 结尾）, order（单元编号 → 第几句）, states（此刻的长期状态，不给不看）,
 *        segment（在回忆、梦这类段落里：剧情上的收起不算，那时候还是那个处境）, before（导演整理第 turn 轮前：这一轮和之后 AI 写的收起不算，这次重写） }
 * 回 { live, why: '' | 'later'（这一句还没有它） | 'off'（收起了，event 是那一条） | 'needs'（靠的长期状态没了，missing 是哪几个）, event, missing }
 */
export function poseLife(pose, ctx = {}) {
  const at = { turn: Number.isFinite(ctx.turn) ? ctx.turn : Infinity, index: ctx.index ?? Infinity, order: ctx.order || null }
  if (pose?.from && posOf(pose.from.turn, pose.from.at, at) > at.index) return { live: false, why: 'later' }
  if (!ctx.segment && pose?.life?.length) {
    let last = null, lastKey = null
    pose.life.forEach((e, i) => {
      if (e.dropped || (ctx.before && e.by === 'ai' && e.turn >= at.turn)) return
      const pos = posOf(e.turn, e.at, at)
      if (pos > at.index) return
      // 先后：轮次、句子；同一句上玩家的算后写的
      const key = [e.turn, pos, e.by === 'user' ? 1 : 0, i]
      if (!lastKey || later(key, lastKey)) { last = e; lastKey = key }
    })
    if (last && !last.on) return { live: false, why: 'off', event: last }
  }
  const missing = missingNeeds(pose, ctx.states)
  if (missing.length) return { live: false, why: 'needs', missing }
  return { live: true, why: '' }
}

/** 一个动作里此刻还没放进来的情绪（joins 里从后面那一句起才放进来的）。 */
function lateEmotions(pose, ctx) {
  if (!pose?.joins) return []
  const at = { turn: Number.isFinite(ctx.turn) ? ctx.turn : Infinity, order: ctx.order || null }
  const index = ctx.index ?? Infinity
  return Object.entries(pose.joins).filter(([, f]) => f && posOf(f.turn, f.at, at) > index).map(([e]) => e)
}

/**
 * 一套动作此刻的样子：去掉此刻用不了的（收起的、靠的状态没了的、还没有的），复盘时才放进来的情绪在那之前不算。
 * 不是设计（通用动作组）的、或者什么都没变的原样返回；全都用不了时留第一个（人总得有个站法）。
 * full 是原来那一整套（差分编号、主动作按整套算，跟出图那边一样，见 lib/poses.js）。
 */
export function liveSheet(sheet, ctx = {}) {
  if (!sheet?.designed || !sheet.poses?.length) return sheet
  let changed = false
  const poses = []
  for (const p of sheet.poses) {
    if (!poseLife(p, ctx).live) { changed = true; continue }
    const late = lateEmotions(p, ctx)
    if (!late.length) { poses.push(p); continue }
    changed = true
    const emotions = p.emotions.filter(e => !late.includes(e))
    if (emotions.length) poses.push({ ...p, emotions })
  }
  if (!changed) return sheet
  if (!poses.length) poses.push(sheet.poses[0])
  // 平静（登场的样子）原来那个动作收起了：站到还在的第一个动作上
  if (!poses.some(p => p.emotions.includes('neutral'))) poses[0] = { ...poses[0], emotions: [...poses[0].emotions, 'neutral'] }
  return { ...sheet, poses, full: sheet.full || sheet.poses }
}

/** 这一刻收起了的动作编号（liveSheet 去掉的那几个；节拍里记下，剧场找图时不退到它们上面）。 */
export const offPoses = live => (live?.full ? live.full.filter(p => !live.poses.some(x => x.id === p.id)).map(p => p.id) : [])

/**
 * 一句里这个人的 ctx（poseLife、liveSheet 用；剧场和出图一样算）。person 带着时间线（timeline）。
 * layer：这一句所在的段落（回忆、梦……，短闪回也算）：段落里剧情上的收起不算，长期状态按段落里当时的样子；
 * pending：这一轮后面才变的样子（还没摘下项链）；needs：看不看长期状态（设置里关了「靠的长期状态没了自动收起」时不看）。
 */
export function lineCtx(person, { turn, index, order = null, layer = null, pending = null, needs = true }) {
  const then = layer?.then?.[person?.name] || null
  let states = null
  if (needs && person?.timeline) {
    const now = lookAt(person.timeline, turn)
    const over = then || (pending ? undoShifts(now, pending) : null)
    states = (over ? thenLook(now, over, person.timeline.outfits) : now).states
  }
  return { turn, index, order, states, segment: Boolean(layer?.mode || layer?.recall) }
}

/** 单元编号 → 第几句（这一轮要演的单元）：poseLife 的 ctx.order。 */
export const unitOrder = units => new Map((units || []).map((u, i) => [u.id, i]))

// ───────────────────────── 导演写的收起 / 放回 ─────────────────────────

/** 导演在一句上写的 situ：[{ name, off: [动作], on: [动作], why }]（动作写编号或动作名），只收写了名字和变化（或原因）的。 */
export function cleanSituList(value) {
  const out = []
  const refs = v => [...new Set((Array.isArray(v) ? v : v ? [v] : []).map(x => clip(typeof x === 'string' ? x : x?.id || x?.label, 16).replace(/[|@]/g, '')).filter(Boolean))].slice(0, 8)
  for (const e of Array.isArray(value) ? value : value && typeof value === 'object' ? [value] : []) {
    const name = clip(e?.name, 24)
    if (!name || out.some(x => x.name === name)) continue
    const off = refs(e.off), on = refs(e.on).filter(r => !off.includes(r))
    const why = clip(e.why, WHY_CHARS)
    if (!off.length && !on.length && !why) continue
    out.push({ name, ...(off.length ? { off } : {}), ...(on.length ? { on } : {}), ...(why ? { why } : {}) })
    if (out.length >= 6) break
  }
  return out
}

const findRef = (poses, ref) => poses.find(p => p.id === ref) || poses.find(p => p.label === ref) || null

/**
 * 把导演这一轮写的收起 / 放回记到这个人的设计上（原地改 acting）：先去掉这一轮以前导演记的（重新整理这一轮），再按这一轮的脚本记。
 * lines：[{ id: 单元编号, situ }]，按正文顺序。只收处境的（和老设计里还没标的）；认不出的动作不记。
 * 回这一轮这个人的变化 [{ at, off: [编号], on: [编号], why }]（只写了原因、没收起放回的也算：处境转了，设计师复盘）。
 */
export function applySitu(acting, name, turn, lines) {
  if (!acting?.poses?.length) return []
  for (const p of acting.poses) if (p.life) { p.life = p.life.filter(e => !(e.src === 'director' && e.turn === turn)); if (!p.life.length) delete p.life }
  const changes = []
  for (const line of lines) {
    for (const s of line.situ || []) {
      if (s.name !== name) continue
      const change = { at: line.id, off: [], on: [], why: s.why || '' }
      for (const [list, on] of [[s.off || [], false], [s.on || [], true]]) {
        for (const ref of list) {
          const pose = findRef(acting.poses, ref)
          if (!pose || !retirable(pose)) continue
          pose.life = [...(pose.life || []), { turn, at: line.id, on, why: change.why, by: 'ai', src: 'director' }]
          ;(on ? change.on : change.off).push(pose.id)
        }
      }
      if (change.off.length || change.on.length || change.why) changes.push(change)
    }
  }
  return changes
}

/** 设计重写回去时（补设计、复盘……）收起 / 放回的记录以存着的那份为准（设计师拿的是旧的一份，导演可能刚记了新的）；extra 是这次复盘新记的。 */
export function keepLife(next, stored, extra = []) {
  if (!next?.poses) return next
  const byId = new Map((stored?.poses || []).map(p => [p.id, p]))
  for (const p of next.poses) {
    const old = byId.get(p.id)
    const life = [...(old?.life || []), ...extra.filter(e => e.pose === p.id).map(({ pose, ...e }) => e)]
    if (life.length) p.life = life
    else delete p.life
    if (old?.from && !p.from) p.from = old.from
    // 复盘时放进来的情绪记着从哪一句起：还在这个动作里的接着记（这次新放的，调用方已经记在 next 上）
    const joins = { ...(old?.joins || {}), ...(p.joins || {}) }
    for (const e of Object.keys(joins)) if (!p.emotions.includes(e)) delete joins[e]
    if (Object.keys(joins).length) p.joins = joins
    else delete p.joins
  }
  return next
}

/** 这个人的全部长期状态（时间线上出现过的，按名字去重），给 needs 记 tag、人物志里挑「靠的长期状态」用。 */
export function knownStates(person) {
  const out = new Map()
  for (const e of person?.timeline?.states || []) for (const s of e.list || []) if (s?.name && !out.has(s.name)) out.set(s.name, s)
  for (const s of person?.states || []) if (s?.name && !out.has(s.name)) out.set(s.name, s)
  return [...out.values()]
}

/** needs 里只写了名字的，按这个人的长期状态记下 tag（导演之后改了状态名也认得出）。原地改。 */
export function linkNeeds(acting, person) {
  const states = knownStates(person)
  for (const p of acting?.poses || []) {
    if (!p.needs?.length) continue
    p.needs = p.needs.map(n => {
      if (n.tags) return n
      const hit = states.find(s => s.name === n.name) || states.find(s => s.name.includes(n.name) || n.name.includes(s.name))
      return hit?.tags ? { name: n.name, tags: hit.tags } : n
    })
  }
  return acting
}

/** 带去别的世界的那一份（提升为全局、新开一局时）：只留本性的动作（老设计里没标的也带上，到了新世界让设计师标），不带这一局的处境笔记和收起记录。 */
export function worldCarry(acting) {
  if (!acting?.poses?.length) return acting || null
  const poses = acting.poses.filter(p => p.kind !== 'situ').map(({ life, from, joins, premise, ...p }) => ({ ...p, emotions: [...p.emotions] }))
  if (!poses.length) return null
  const { now, nowTurn, ...rest } = acting
  // 没带过去的动作编号记着：新世界里设计的新动作不再用这些编号（全局库里那些编号画的图是别的世界的动作）
  const usedIds = [...new Set([...(acting.usedIds || []), ...acting.poses.filter(p => !poses.some(x => x.id === p.id)).map(p => p.id)])]
  return { ...rest, poses: settleNeutral(poses), ...(usedIds.length ? { usedIds } : {}) }
}

/** 给人看的一句：这个动作此刻为什么不在（人物志、导演用）。 */
export function lifeText(life, pose) {
  if (!life || life.live) return ''
  if (life.why === 'later') return `第 ${pose.from.turn} 轮起才有`
  if (life.why === 'needs') return `长期状态里没有「${life.missing.join('」「')}」`
  const e = life.event
  return `第 ${e.turn} 轮起收起${e.why ? `：${e.why}` : ''}`
}
