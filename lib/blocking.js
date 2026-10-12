// 同屏的人：没在说话的人对这句的反应（react），台上的走位（move），登场、退场的方式。剧场演出和引擎（要画哪些差分）共用。
import { speakersOf } from './vocab.js'

/** react / move 的 name 写这些表示台上所有人（反应时不算说话的人）。 */
const ALL = new Set(['*', '全员', '全部', '所有人', 'all'])
export const isEveryone = name => ALL.has(String(name || '').trim())

/**
 * 这一句里没在说话、但有反应的人：[{ name, emo, sym }]。name 写 * 的展开成台上除说话人以外的所有人；
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
      out.push({ name, ...(r.emo ? { emo: r.emo } : {}), ...(r.sym ? { sym: r.sym } : {}) })
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
 * 走位的状态机：一拍一拍往前走，记下每个人现在的样子 { near 靠近的人, far 拉开的人, depth -1 退后 / 0 / 1 上前, away 背对, peek 在边上探头 }。
 * newSet() 换了一堂布景（换地方、进出段落）、新一轮开始时调用，全部复位。
 */
export function poseTracker() {
  let poses = new Map()
  const get = name => {
    if (!poses.has(name)) poses.set(name, { near: [], far: [], depth: 0, away: false, peek: false })
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
    for (const p of poses.values()) { p.near = p.near.filter(n => n !== name); p.far = p.far.filter(n => n !== name) }
  }
  return {
    newSet() { poses = new Map() },
    /**
     * 这一拍：onStage 台上的人，left 这一拍下台的，speakers 说话的人，moves 导演写的走位，peeks 这一拍探头登场的人。
     * 返回这一拍的 { poses: { 名字: 样子 }（只列跟平常不一样的）, moves: [{ name, act }]（这一拍发生的走位，剧场按它演一下）}。
     */
    step({ onStage = [], left = [], speakers = [], moves = [], peeks = [] }) {
      for (const name of left) clear(name)
      const here = new Set(onStage)
      // 探头的人：开口或走位时才进来
      for (const name of speakers) { const p = poses.get(name); if (p && p.peek) p.peek = false }
      const done = []
      for (const m of moves) {
        const names = isEveryone(m.name) ? [...here] : [m.name]
        for (const name of names) {
          if (!here.has(name)) continue
          const p = get(name)
          p.peek = false
          const to = m.to && m.to !== name && here.has(m.to) ? m.to : ''
          if (m.act === 'reset') { clear(name); done.push({ name, act: 'reset' }); continue }
          if (m.act === 'approach' && to) {
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
      const out = {}
      for (const [name, p] of poses) {
        if (!here.has(name)) continue
        const near = p.near.filter(n => here.has(n))
        const far = p.far.filter(n => here.has(n))
        if (!near.length && !far.length && !p.depth && !p.away && !p.peek) continue
        out[name] = { ...(near.length ? { near } : {}), ...(far.length ? { far } : {}), ...(p.depth ? { depth: p.depth } : {}), ...(p.away ? { away: true } : {}), ...(p.peek ? { peek: true } : {}) }
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

/**
 * 按走位挪站位：stageLayout 排好的 [{ name, x, ... }] → 加上 dx 之后的 x，以及 depth（上前 / 退后）、away（背对）、peek（探头时在哪一边）。
 */
export function blockLayout(entries, poses) {
  if (!poses) return entries
  const at = new Map(entries.map(e => [e.name, e.x]))
  return entries.map(e => {
    const p = poses[e.name]
    if (!p) return e
    let x = e.x
    for (const other of p.near || []) if (at.has(other)) x += (at.get(other) - e.x) * NEAR_SHARE
    for (const other of p.far || []) if (at.has(other)) x += (e.x === at.get(other) ? (e.x < 50 ? -1 : 1) : Math.sign(e.x - at.get(other))) * FAR_STEP
    const peek = p.peek ? (e.x <= 50 ? 'left' : 'right') : ''
    if (peek) x = PEEK_X[peek]
    x = Math.round(Math.max(peek ? 4 : 10, Math.min(peek ? 96 : 90, x)) * 10) / 10
    return { ...e, x, ...(p.depth ? { depth: p.depth } : {}), ...(p.away ? { away: true } : {}), ...(peek ? { peek } : {}) }
  })
}
