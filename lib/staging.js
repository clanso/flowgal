import { speakersOf } from './vocab.js'

// 站位：这一轮谁一开场就在、谁在哪一句登场 / 退场。剧场演出和导演（「上一幕结束时在场」）共用。
// 导演在 cast 里列出这一轮会出现在画面里的所有人；第一次出现就是 enter 的人开场时不在，到那一句才上场；
// 写了 exit 的人从那一句起离开画面（之后再说话只显示名牌），同一轮里还能再 enter 回来。

const SLOTS = ['center', 'left', 'right', 'farleft', 'farright']
const unitNumber = id => Number(String(id).replace(/\D/g, '')) || 0

/** 要演的单元：去掉导演标了 skip 的（状态栏、网页外壳、作者的话……）。还没整理的轮次全都演。 */
export function playedUnits(units, script) {
  const skip = new Set(script?.skip || [])
  return skip.size ? (units || []).filter(u => !skip.has(u.id)) : units || []
}

/** exit 里写 "*"（或「全部」）表示在场的人都离开。 */
const ALL = new Set(['*', '全部', '所有人', 'all'])

/**
 * 按正文顺序走一遍这一轮。
 * script 为 null（导演还没整理）时，整轮沿用 carry（上一轮结束时在场的人）。
 * 进入特殊段落（回忆、梦境……，line.mode）时记下在场的人，回到现实（mode: real）时把他们放回来，再按那一句的 exit / enter 增减。
 * inside 是上一轮结束时段落里在场的人：这一轮第一句接着演同一种段落时由调用方传进来，段落里接着是他们，回到现实时才换回开场在场的人。
 * @returns {{ steps: { cast: {name, pos}[], entered: string[], left: string[] }[], end: {name, pos}[], inside: {name, pos}[] | null }}
 *   steps 是每个单元播放时在场的人，以及这一句登场 / 退场的名字；end 是一幕结束时现实里在场的人（段落在一轮结束时收起）；
 *   inside 是一幕结束时还在段落里的话，段落里在场的人（下一轮接着演时用），不在段落里为 null。
 */
export function stageWalk(script, units, carry = [], inside = null) {
  if (!script) return { steps: units.map(() => ({ cast: carry, entered: [], left: [] })), end: carry, inside: null }
  const lines = script.lines || {}
  const home = new Map((script.cast || []).map(c => [c.name, c.pos]))
  // 这一轮第一次出现在 enter 里（之前没 exit 过）的人，开场时不在台上。
  // 段落（回忆、梦境……）里的进出不算：进段落那一句常写「全部离开」再让段落里的人登场，开场时在不在要看段落外面。
  // 只在段落里进出过的人：进段落时点名离开的、上一轮结束时在场的、段落之前就有他的戏（sp）的，开场时在台上；不然他只在段落里出现。
  const first = new Map()
  const inLayer = new Map()
  const early = new Set()
  let layer = false, layerSeen = false
  for (const u of units) {
    const line = lines[u.id] || {}
    if (line.mode === 'real') layer = false
    else if (line.mode) layer = layerSeen = true
    const note = (name, kind) => { const seen = layer ? inLayer : first; if (!seen.has(name)) seen.set(name, kind) }
    for (const name of line.exit || []) note(name, 'exit')
    for (const e of line.enter || []) note(e.name, 'enter')
    if (!layerSeen) for (const name of speakersOf(line.sp)) early.add(name)
  }
  const carried = new Set(carry.map(c => c.name))
  // 接着演上一轮没演完的段落：段落里接着是上一轮结束时段落里的人，现实里的人等回到现实再上来；
  // 只在段落里的人（上一轮结束时现实里不在、这一轮在段落外也没进出过）不算开场在现实里。
  const opening = units.length ? lines[units[0].id]?.mode : ''
  const goingOn = inside && opening && opening !== 'real' ? inside : null
  const onlyInside = new Set((goingOn || []).map(c => c.name).filter(name => !carried.has(name)))
  const onAtStart = name => (first.has(name) ? first.get(name) === 'exit' : !onlyInside.has(name) && (!inLayer.has(name) || inLayer.get(name) === 'exit' || carried.has(name) || early.has(name)))
  let cast = (script.cast || []).filter(c => onAtStart(c.name))
  let saved = null // 进入段落前在场的人
  if (goingOn) { saved = cast; cast = goingOn }
  const steps = units.map(u => {
    const line = lines[u.id] || {}
    const before = cast
    if (line.mode === 'real') { if (saved) { cast = saved; saved = null } }
    else if (line.mode && !saved) saved = cast
    const exits = line.exit || []
    cast = exits.some(n => ALL.has(n)) ? [] : cast.filter(c => !exits.includes(c.name))
    for (const e of line.enter || []) {
      if (cast.some(c => c.name === e.name)) continue
      // 想站的位置被人占了就找个空位。
      const want = e.pos || home.get(e.name)
      const pos = want && !cast.some(c => c.pos === want) ? want : SLOTS.find(p => !cast.some(c => c.pos === p)) || want || 'center'
      cast = [...cast, { name: e.name, pos }]
    }
    const left = before.filter(c => !cast.some(x => x.name === c.name)).map(c => c.name)
    const entered = cast.filter(c => !before.some(x => x.name === c.name)).map(c => c.name)
    return { cast, entered, left }
  })
  return { steps, end: saved || cast, inside: saved ? cast : null }
}

/** 每个单元播放时在场的人（见 stageWalk）。 */
export function stageSteps(script, units, carry = []) {
  return stageWalk(script, units, carry).steps
}

/** 一幕结束时还在场的人（给下一轮的导演看）。脚本里只存了有标注的单元，按编号排好走一遍就够了。 */
export function castAtEnd(script) {
  if (!script) return []
  const units = Object.keys(script.lines || {}).sort((a, b) => unitNumber(a) - unitNumber(b)).map(id => ({ id }))
  return stageWalk(script, units.length ? units : [{ id: '' }]).end
}
