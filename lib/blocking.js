// 同屏的人：没在说话的人对这句的反应（react），台上的走位（move），登场、退场的方式。剧场演出和引擎（要画哪些差分）共用。
import { speakersOf } from './vocab.js'

/** react / move 的 name 写这些表示台上所有人（反应时不算说话的人）。 */
const ALL = new Set(['*', '全员', '全部', '所有人', 'all'])
export const isEveryone = name => ALL.has(String(name || '').trim())

/**
 * 这一句里没在说话、但有反应的人：[{ name, emo, sym, pose }]（pose 是导演点名换的动作，见 lib/poses.js）。name 写 * 的展开成台上除说话人以外的所有人；
 * 说话的人自己（导演把说话人也写进了 react）跳过，他的表情看 emo。onStage 是这一拍台上的人名。
 */
export function reactsOf(line, onStage = [], speakers = []) {
  const out = []
  const seen = new Set(speakers)
  for (const r of (line && line.react) || []) {
    const names = isEveryone(r.name) ? onStage : [r.name]
    for (const name of names) {
      if (!name || seen.has(name)) continue
      seen.add(name)
      out.push({ name, ...(r.emo ? { emo: r.emo } : {}), ...(r.sym ? { sym: r.sym } : {}), ...(r.pose ? { pose: r.pose } : {}) })
    }
  }
  return out
}

/** 这一句里换了表情的人：说话的人（emo）和有反应的人（react），{ name, emo }[]。onStage 用来展开 *（引擎传这一轮 cast 里的人）。 */
export function lineFeelings(line, onStage = []) {
  if (!line) return []
  const speakers = speakersOf(line.sp)
  const out = line.emo ? speakers.map(name => ({ name, emo: line.emo })) : []
  for (const r of reactsOf(line, onStage, speakers)) if (r.emo) out.push({ name: r.name, emo: r.emo })
  return out
}

/**
 * 情绪 → 反应时身体怎么一动（剧场的动画在 Stage.jsx 的 REACT_FRAMES）：jolt 一惊往上一缩 / shrink 害羞缩肩 / bounce 笑得一颤 /
 * droop 垂下去 / shake 气得一抖 / nod 轻轻点头 / tilt 歪头。自定义情绪看它的基础情绪。
 */
const REACT_KIND = {
  surprised: 'jolt', scared: 'jolt',
  shy: 'shrink', blush: 'shrink', love: 'shrink',
  happy: 'bounce', laugh: 'bounce', smug: 'bounce', teasing: 'bounce',
  sad: 'droop', cry: 'droop', tired: 'droop', worried: 'droop',
  angry: 'shake', pout: 'shake', cold: 'shake',
  confused: 'tilt', thinking: 'tilt',
}
export const reactKind = base => REACT_KIND[base] || 'nod'

/**
 * 走位的状态机：一拍一拍往前走，记下每个人现在的样子 { near 靠近的人, far 拉开的人, depth -1 退后 / 0 / 1 上前, away 背对, peek 在边上探头,
 * down 被击倒（到他再开口、自己走位或被治疗为止；剧场传进来的 speakers 不含旁白写到的人）, behind 躲在谁身后（开口也还躲着，
 * 到他自己上前、走开、复位，或挡在前面的人下台为止）}。
 * newSet() 换了一堂布景（换地方、进出段落）、新一轮开始时调用，全部复位。
 */
export function poseTracker() {
  let poses = new Map()
  const get = name => {
    if (!poses.has(name)) poses.set(name, { near: [], far: [], depth: 0, away: false, peek: false, down: false, behind: '' })
    return poses.get(name)
  }
  const unlink = (a, b) => {
    for (const [x, y] of [[a, b], [b, a]]) {
      const p = poses.get(x)
      if (p) { p.near = p.near.filter(n => n !== y); p.far = p.far.filter(n => n !== y) }
    }
  }
  const clear = name => {
    poses.delete(name)
    for (const p of poses.values()) { p.near = p.near.filter(n => n !== name); p.far = p.far.filter(n => n !== name); if (p.behind === name) p.behind = '' }
  }
  return {
    newSet() { poses = new Map() },
    /**
     * 这一拍：onStage 台上的人，left 这一拍下台的，speakers 说话的人，moves 导演写的走位，peeks 这一拍探头登场的人，
     * downs 这一拍被击倒的人，heals 这一拍被治疗的人（被击倒的站起来）。
     * 返回这一拍的 { poses: { 名字: 样子 }（只列跟平常不一样的）, moves: [{ name, act }]（这一拍发生的走位，剧场按它演一下）}。
     */
    step({ onStage = [], left = [], speakers = [], moves = [], peeks = [], downs = [], heals = [] }) {
      for (const name of left) clear(name)
      const here = new Set(onStage)
      // 探头的人：开口或走位时才进来；被击倒的人：开口、走位或被治疗时站起来（「所有人」一起走位不算，倒着的人跟不上）
      for (const name of [...speakers, ...heals]) { const p = poses.get(name); if (p) { p.peek = false; p.down = false } }
      const done = []
      for (const m of moves) {
        const names = isEveryone(m.name) ? [...here].filter(name => !(poses.get(name) && poses.get(name).down)) : [m.name]
        for (const name of names) {
          if (!here.has(name)) continue
          const p = get(name)
          p.peek = false
          p.down = false
          const to = m.to && m.to !== name && here.has(m.to) ? m.to : ''
          if (m.act === 'reset') { clear(name); done.push({ name, act: 'reset' }); continue }
          // 上前、走近谁、跟谁拉开，就是从躲着的那个人身后走出来了
          if (m.act === 'forward' || m.act === 'approach' || (m.act === 'apart' && to)) p.behind = ''
          // 躲到某人身后：站到他背后、从他肩旁探出半个身子，跟别人的远近不算了
          if (m.act === 'hide' && to) {
            for (const other of [...p.near, ...p.far]) unlink(name, other)
            p.behind = to
            if (get(to).behind === name) get(to).behind = ''
          } else if (m.act === 'approach' && to) {
            unlink(name, to)
            p.near.push(to); get(to).near.push(name)
          } else if (m.act === 'apart' && to) {
            unlink(name, to)
            p.far.push(to); get(to).far.push(name)
          } else if (m.act === 'approach' || m.act === 'forward') p.depth = Math.min(1, p.depth + 1)
          else if (m.act === 'apart' || m.act === 'back') p.depth = Math.max(-1, p.depth - 1)
          else if (m.act === 'turn') p.away = true
          else if (m.act === 'face' || m.act === 'lookback') { p.away = false; if (to && m.act === 'face') get(to).away = false }
          else continue
          done.push(to ? { name, act: m.act, to } : { name, act: m.act })
        }
      }
      for (const name of peeks) if (here.has(name)) get(name).peek = true
      for (const name of downs) if (here.has(name)) get(name).down = true
      const out = {}
      for (const [name, p] of poses) {
        if (!here.has(name)) continue
        const near = p.near.filter(n => here.has(n))
        const far = p.far.filter(n => here.has(n))
        const behind = p.behind && here.has(p.behind) ? p.behind : ''
        if (!near.length && !far.length && !p.depth && !p.away && !p.peek && !p.down && !behind) continue
        out[name] = { ...(near.length ? { near } : {}), ...(far.length ? { far } : {}), ...(p.depth ? { depth: p.depth } : {}), ...(p.away ? { away: true } : {}), ...(p.peek ? { peek: true } : {}), ...(p.down ? { down: true } : {}), ...(behind ? { behind } : {}) }
      }
      return { poses: out, moves: done }
    },
  }
}

/** 靠近的人往对方那边挪的比例（两人各挪这么多，间距剩一半）；拉开时各往外挪的距离（舞台宽度的百分比）。 */
const NEAR_SHARE = 0.25
const FAR_STEP = 9
/** 探头的人站在舞台边上。 */
const PEEK_X = { left: 5, right: 95 }
/** 躲在别人身后的人跟挡在前面的人错开多少（舞台宽度的百分比）：从他肩旁探出半个身子。 */
const HIDE_STEP = 9

/**
 * 按走位挪站位：stageLayout 排好的 [{ name, x, ... }] → 加上 dx 之后的 x，以及 depth（上前 / 退后）、away（背对）、peek（探头时在哪一边）、down（被击倒）、
 * behind（躲在谁身后）和 hide（从他哪一边探出来：原来站在他哪边就是哪边，挡在前面的人走位时跟着他走）。
 */
export function blockLayout(entries, poses) {
  if (!poses) return entries
  const at = new Map(entries.map(e => [e.name, e.x]))
  const placed = new Map(entries.map(e => {
    const p = poses[e.name]
    if (!p) return [e.name, e]
    let x = e.x
    for (const other of p.near || []) if (at.has(other)) x += (at.get(other) - e.x) * NEAR_SHARE
    for (const other of p.far || []) if (at.has(other)) x += (e.x === at.get(other) ? (e.x < 50 ? -1 : 1) : Math.sign(e.x - at.get(other))) * FAR_STEP
    const peek = p.peek ? (e.x <= 50 ? 'left' : 'right') : ''
    if (peek) x = PEEK_X[peek]
    x = Math.round(Math.max(peek ? 4 : 10, Math.min(peek ? 96 : 90, x)) * 10) / 10
    return [e.name, { ...e, x, ...(p.depth ? { depth: p.depth } : {}), ...(p.away ? { away: true } : {}), ...(peek ? { peek } : {}), ...(p.down ? { down: true } : {}) }]
  }))
  // 躲着的人站到挡在前面的人旁边一点（挡在前面的人自己也躲在别人身后时，先排他）
  const hidden = new Set()
  const taken = new Map() // 挡在前面的人哪一边已经躲了几个
  const hide = (name, path = new Set()) => {
    const e = placed.get(name)
    const front = poses[name] && poses[name].behind
    if (!front || hidden.has(name) || !placed.has(front) || path.has(front)) return e
    path.add(name)
    const x0 = hide(front, path).x
    // 原来站在他哪边就从哪边探出来（站在同一处的往舞台中间那边）；那边出了舞台、或已经有人躲着时换一边，两边都有人就再错开一点
    const fits = side => x0 + side * HIDE_STEP >= 10 && x0 + side * HIDE_STEP <= 90
    const count = side => taken.get(front + (side < 0 ? '<' : '>')) || 0
    const away = Math.sign(at.get(name) - at.get(front)) || (x0 < 50 ? 1 : -1)
    const side = [away, -away].filter(fits).sort((a, b) => count(a) - count(b))[0] || away
    const x = Math.round(Math.max(10, Math.min(90, x0 + side * HIDE_STEP * (count(side) + 1))) * 10) / 10
    taken.set(front + (side < 0 ? '<' : '>'), count(side) + 1)
    hidden.add(name)
    placed.set(name, { ...e, x, behind: front, hide: side < 0 ? 'left' : 'right' })
    return placed.get(name)
  }
  for (const e of entries) hide(e.name)
  return entries.map(e => placed.get(e.name))
}

/**
 * 谁挡在谁前面：给每个人一个图层（z，越大越靠前）。说话的人站到最前，说完也留在前面，直到别人开口；
 * front 是台上开过口的人，最近开口的在前（playback.js 的 beat.front）。上前一步的总在没上前的前面、退后的总在后面；
 * 还没开过口的人在开过口的人后面，离舞台中间近的在前。躲在别人身后的人（behind）紧贴在那个人后面，开口也不出来。
 */
export function stackLayers(entries, front = []) {
  const own = name => { const i = front.indexOf(name); return i < 0 ? Infinity : i }
  const byName = new Map(entries.map(e => [e.name, e]))
  const hides = e => Boolean(e.behind) && e.behind !== e.name && byName.has(e.behind)
  // 躲着的人开口时，挡在他前面的那个人跟着站到前面来，躲着的人才露得出来
  const group = new Map(entries.map(e => [e.name, own(e.name)]))
  for (const e of entries.filter(hides)) {
    let at = e
    for (const seen = new Set([e.name]); hides(at) && !seen.has(at.behind); seen.add(at.name)) at = byName.get(at.behind)
    group.set(at.name, Math.min(group.get(at.name), own(e.name)))
  }
  const recent = name => group.get(name)
  // 从后往前排
  const backToFront = (a, b) => (a.e.depth || 0) - (b.e.depth || 0) || recent(b.e.name) - recent(a.e.name) || Math.abs((b.e.x ?? 50) - 50) - Math.abs((a.e.x ?? 50) - 50) || a.i - b.i
  const sorted = entries.map((e, i) => ({ e, i })).sort(backToFront).map(o => o.e)
  const order = sorted.filter(e => !hides(e)).map(e => e.name)
  let waiting = sorted.filter(hides)
  while (waiting.length) {
    const ready = waiting.filter(e => order.includes(e.behind))
    if (!ready.length) { order.unshift(...waiting.map(e => e.name)); break } // 互相躲（走位那边不会排出这种）：放到最后面
    for (const e of ready) order.splice(order.indexOf(e.behind), 0, e.name)
    waiting = waiting.filter(e => !ready.includes(e))
  }
  return entries.map(e => ({ ...e, z: order.indexOf(e.name) + 1 }))
}
