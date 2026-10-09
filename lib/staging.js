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

/**
 * 按正文顺序走一遍这一轮。
 * script 为 null（导演还没整理）时，整轮沿用 carry（上一轮结束时在场的人）。
 * @returns {{ cast: {name, pos}[], entered: string[], left: string[] }[]} 每个单元播放时在场的人，以及这一句登场 / 退场的名字。
 */
export function stageSteps(script, units, carry = []) {
  if (!script) return units.map(() => ({ cast: carry, entered: [], left: [] }))
  const lines = script.lines || {}
  const home = new Map((script.cast || []).map(c => [c.name, c.pos]))
  // 这一轮第一次出现在 enter 里（之前没 exit 过）的人，开场时不在台上。
  const first = new Map()
  for (const u of units) {
    for (const name of lines[u.id]?.exit || []) if (!first.has(name)) first.set(name, 'exit')
    for (const e of lines[u.id]?.enter || []) if (!first.has(e.name)) first.set(e.name, 'enter')
  }
  let cast = (script.cast || []).filter(c => first.get(c.name) !== 'enter')
  return units.map(u => {
    const line = lines[u.id] || {}
    const left = (line.exit || []).filter(name => cast.some(c => c.name === name))
    if (left.length) cast = cast.filter(c => !left.includes(c.name))
    const entered = []
    for (const e of line.enter || []) {
      if (cast.some(c => c.name === e.name)) continue
      // 想站的位置被人占了就找个空位。
      const want = e.pos || home.get(e.name)
      const pos = want && !cast.some(c => c.pos === want) ? want : SLOTS.find(p => !cast.some(c => c.pos === p)) || want || 'center'
      cast = [...cast, { name: e.name, pos }]
      entered.push(e.name)
    }
    return { cast, entered, left }
  })
}

/** 一幕结束时还在场的人（给下一轮的导演看）。脚本里只存了有标注的单元，按编号排好走一遍就够了。 */
export function castAtEnd(script) {
  if (!script) return []
  const units = Object.keys(script.lines || {}).sort((a, b) => unitNumber(a) - unitNumber(b)).map(id => ({ id }))
  const steps = stageSteps(script, units)
  return steps.length ? steps[steps.length - 1].cast : stageSteps(script, [{ id: '' }])[0].cast
}
