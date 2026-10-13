import { speakersOf } from './vocab.js'

// 站位：这一轮谁一开场就在、谁在哪一句登场 / 退场。剧场演出和导演（「上一幕结束时在场」）共用。
// 导演在 cast 里列出这一轮会出现在画面里的所有人；第一次出现就是 enter 的人开场时不在，到那一句才上场；
// 写了 exit 的人从那一句起离开画面（之后再说话只显示名牌），同一轮里还能再 enter 回来；他自己开口的那句写了自己 exit 的，说完这句再走。
// 没列进 cast、已经有立绘的人在现实里当面开口，那几句临时上台、别人接话时退下，不挤掉列着的人（剧场传 walkOn 时）。

const SLOTS = ['center', 'left', 'right', 'farleft', 'farright']
const unitNumber = id => Number(String(id).replace(/\D/g, '')) || 0

/** 要演的单元：去掉导演标了 skip 的（状态栏、网页外壳、作者的话……）。还没整理的轮次全都演。 */
export function playedUnits(units, script) {
  const skip = new Set(script?.skip || [])
  return skip.size ? (units || []).filter(u => !skip.has(u.id)) : units || []
}

/**
 * 切分时从引号前后猜的说话人（弱提示，导演没给这句写 sp 时才用）：认得的名字照用；
 * 「宋棠打断她，」这样连动作一起截进来的，取开头那个认得的名字；认不出、又不像名字（超过四个字，比如「秦语气没什么起伏」）的，当作上一位接着说。
 */
export function hintedSpeaker(hint, known, last) {
  if (!hint) return ''
  if (known.includes(hint)) return hint
  const head = known.filter(name => name && hint.startsWith(name)).sort((a, b) => b.length - a.length)[0]
  if (head) return head
  return [...hint].length > 4 ? last || '' : hint
}

/**
 * 这一轮每个要演的单元是谁在说（剧场的节拍和出图共用）：台词没写 sp 时按切分猜的说话人，再不行沿用上一位；心声没写是「我」；
 * 旁白写了 sp 是描写的那个人。known 是认得的名字。回每个单元的说话人（齐声是「林岚、苏晴」这样一串，用 speakersOf 拆）。
 */
export function unitSpeakers(units, script, known = []) {
  let last = ''
  return (units || []).map(unit => {
    const line = script?.lines?.[unit.id] || {}
    const type = line.type || unit.type
    let speaker = ''
    if (type === 'dialogue') { speaker = line.sp || (line.type ? '' : hintedSpeaker(unit.hint, known, last)) || last; last = speaker }
    else if (type === 'thought') speaker = line.sp || '我'
    else if (line.sp) speaker = line.sp
    return speaker
  })
}

/** exit 里写 "*"（或「全部」）表示在场的人都离开。 */
const ALL = new Set(['*', '全部', '所有人', 'all'])

/**
 * 按正文顺序走一遍这一轮。
 * script 为 null（导演还没整理）时，整轮沿用 carry（上一轮结束时在场的人）。
 * 进入特殊段落（回忆、梦境……，line.mode）时记下在场的人，回到现实（mode: real）时把他们放回来，再按那一句的 exit / enter 增减。
 * inside 是上一轮结束时段落里在场的人：这一轮第一句接着演同一种段落时由调用方传进来，段落里接着是他们，回到现实时才换回开场在场的人。
 * walkOn：已经有立绘的人（名字集合）。导演没把他列进 cast、他却在现实里当面开口时（导演漏列了在场的配角），从那一句起临时上台（extra: true，
 *   同屏人数上限不算他），到别人开口时退下；身份没揭晓（as）的那句不算。
 * calling：上一轮没挂的电话那头的人。电话那头的人（这一轮打来、拨出的也算，挂断那一句还在电话里）开口不算当面说话，直到他走进画面。
 * @returns {{ steps: { cast: {name, pos}[], entered: string[], left: string[] }[], end: {name, pos}[], inside: {name, pos}[] | null }}
 *   steps 是每个单元播放时在场的人，以及这一句登场 / 退场的名字；end 是一幕结束时现实里在场的人（段落在一轮结束时收起）；
 *   inside 是一幕结束时还在段落里的话，段落里在场的人（下一轮接着演时用），不在段落里为 null。
 */
export function stageWalk(script, units, carry = [], inside = null, { walkOn = null, calling = '' } = {}) {
  if (!script) return { steps: units.map(() => ({ cast: carry, entered: [], left: [] })), end: carry, inside: null }
  const lines = script.lines || {}
  const home = new Map((script.cast || []).map(c => [c.name, c.pos]))
  // 这一轮第一次出现在 enter 里（之前没 exit 过）的人，开场时不在台上。
  // 段落（回忆、梦境……）里的进出不算：进段落那一句常写「全部离开」再让段落里的人登场，开场时在不在要看段落外面。
  // 只在段落里进出过的人：进段落时点名离开的、上一轮结束时在场的、段落之前当面说过话的，开场时在台上；不然他只在段落里出现。
  // 当面说话：台词、心声，不隔着电话、广播、画外、回响（段落之前引一句回忆里的人说过的话不算他在场），不是短闪回（recall），也不在分屏那头、不是电话那头的人；旁白写的 sp 只是描写的是谁。
  // 没写进出、上一轮也不在、只在段落里开过口的人（导演漏了 enter）：开场不在，进那个段落时跟着登场；
  // 上一轮也不在、只在短闪回里开过口的人（导演把闪回里的人也列进了 cast）不上台，只在闪回里浮出来。
  // 回到现实那一句的进出也不算：导演常写「全部离开」再让回到现实时在场的人 enter，这些人进段落前本来就在。
  // 在第一次 enter 之前就在现实里当面说过话的人，开场就在：导演常漏写他的登场，只在后面换场「全部离开」再让他 enter（主角整轮都在）。
  // 只算现实里第一次清场（全部离开）、换地方之前开的口：之后才开口的只说明他在新的这一堂里，比如醒过来先听见背后应了一声、两句后才看见她。
  const first = new Map()
  const firstAt = new Map() // 名字 → 第一次出现在 first 里的那个单元
  const spokeAt = new Map() // 名字 → 第一次在现实里当面说话的那个单元（开场那一堂里）
  const inLayer = new Map()
  const back = new Map() // 回到现实那一句里的进出
  const early = new Set() // 第一个段落之前当面说过话的
  const realVoices = new Set() // 段落外当面说过话的
  const layerVoices = new Map() // 名字 → 他第一次在段落里开口的那个段落从第几个单元开始
  const recallVoices = new Set() // 在短闪回里开过口的（闪回里的人浮在前面，不上台）
  const listed = new Set((script.cast || []).map(c => c.name))
  const walkOns = new Map() // 第几个单元 → 没列进 cast、有立绘、在现实里当面开口的人（从那一句起上台）
  const ownExit = new Map() // 第几个单元 → 这一句说完才走的人：导演把告别那句的说话人写进了同一句的 exit
  let layer = false, layerSeen = false, layerStart = -1, split = null, caller = calling || ''
  let place = script.scene?.location || '', reset = false // 现实里的地点；现实里清过场、换过地方没有
  units.forEach((u, i) => {
    const line = lines[u.id] || {}
    const returning = line.mode === 'real' && layer
    if (line.mode === 'real') layer = false
    else if (line.mode) { if (!layer) layerStart = i; layer = layerSeen = true }
    if (!layer) {
      const moved = Boolean(line.scene?.location) && line.scene.location !== place
      if (i > 0 && !returning && (moved || (line.exit || []).some(n => ALL.has(n)))) reset = true
      if (line.scene?.location) place = line.scene.location
    }
    if (line.split === 'off') split = null
    else if (line.split) split = line.split
    const phone = line.phone && line.phone.kind
    if (phone === 'call' || phone === 'dial') caller = line.phone.who || ''
    if (caller && (line.enter || []).some(e => e.name === caller)) caller = ''
    const onPhone = caller
    if (phone === 'end') caller = ''
    const note = (name, kind) => {
      const seen = returning ? back : layer ? inLayer : first
      if (seen.has(name)) return
      seen.set(name, kind)
      if (seen === first) firstAt.set(name, i)
    }
    for (const name of line.exit || []) note(name, 'exit')
    for (const e of line.enter || []) note(e.name, 'enter')
    const type = line.type || u.type
    const speakers = type === 'narration' ? [] : speakersOf(line.sp)
    if (line.recall) for (const name of speakers) recallVoices.add(name)
    const inPerson = !line.recall && (!line.voice || line.voice === 'chorus')
    for (const name of inPerson ? speakers : []) {
      if ((split && split.who?.includes(name)) || name === onPhone) continue
      if (layer) { if (!layerVoices.has(name)) layerVoices.set(name, layerStart) }
      else {
        realVoices.add(name); if (!layerSeen) early.add(name); if (!reset && !spokeAt.has(name)) spokeAt.set(name, i)
        if (walkOn && walkOn.has(name) && !listed.has(name) && !line.as) walkOns.set(i, [...(walkOns.get(i) || []), name])
      }
    }
    // 「……我去透透气」同一句写了自己 exit：说完这句再走，不在开口那一拍就消失。清场（*）、换地方、进出段落的那句照旧当场生效。
    const leaving = inPerson && !line.mode && !line.scene?.location ? speakers.filter(name => (line.exit || []).includes(name)) : []
    if (leaving.length) ownExit.set(i, leaving)
  })
  const carried = new Set(carry.map(c => c.name))
  // 接着演上一轮没演完的段落：段落里接着是上一轮结束时段落里的人，现实里的人等回到现实再上来；
  // 只在段落里的人（上一轮结束时现实里不在、这一轮在段落外也没进出过）不算开场在现实里。
  const opening = units.length ? lines[units[0].id]?.mode : ''
  const goingOn = inside && opening && opening !== 'real' ? inside : null
  const onlyInside = new Set((goingOn || []).map(c => c.name).filter(name => !carried.has(name)))
  const implicit = new Map() // 第几个单元 → 进段落时跟着登场的人
  const onAtStart = name => {
    if (first.has(name)) return first.get(name) === 'exit' || spokeAt.get(name) < firstAt.get(name)
    if (onlyInside.has(name)) return false
    if (carried.has(name)) return true
    if (back.has(name)) return true
    if (inLayer.has(name)) return inLayer.get(name) === 'exit' || early.has(name)
    if (layerVoices.has(name) && !realVoices.has(name)) {
      const at = layerVoices.get(name)
      implicit.set(at, [...(implicit.get(at) || []), { name }])
      return false
    }
    // 上一轮的在场名单在手时才这样判：第一幕没有名单，现在在场、只是这一轮只在闪回里开口的人不能因此下台
    if (carry.length && recallVoices.has(name) && !realVoices.has(name)) return false
    return true
  }
  let cast = (script.cast || []).filter(c => onAtStart(c.name))
  let saved = null // 进入段落前在场的人
  if (goingOn) { saved = cast; cast = goingOn }
  let after = [] // 上一句说完才走的人
  let lastSaid = [] // 上一句台词的说话人：导演没写 sp 的台词沿用
  const steps = units.map((u, i) => {
    const line = lines[u.id] || {}
    const before = cast
    if (after.length) { cast = cast.filter(c => !after.includes(c.name)); after = [] }
    if (line.mode === 'real') { if (saved) { cast = saved; saved = null } }
    else if (line.mode && !saved) saved = cast
    after = ownExit.get(i) || []
    const exits = (line.exit || []).filter(n => !after.includes(n))
    cast = exits.some(n => ALL.has(n)) ? [] : cast.filter(c => !exits.includes(c.name))
    // 临时上台的人：别人开口时退下
    const type = line.type || u.type
    const said = type === 'narration' ? null : line.sp ? speakersOf(line.sp) : type === 'dialogue' ? lastSaid : ['我']
    if (type === 'dialogue') lastSaid = said
    if (said) cast = cast.filter(c => !c.extra || said.includes(c.name))
    for (const e of [...(line.enter || []), ...(implicit.get(i) || []), ...(walkOns.get(i) || []).map(name => ({ name, extra: true }))]) {
      if (cast.some(c => c.name === e.name)) continue
      // 想站的位置被人占了就找个空位。
      const want = e.pos || home.get(e.name)
      const pos = want && !cast.some(c => c.pos === want) ? want : SLOTS.find(p => !cast.some(c => c.pos === p)) || want || 'center'
      cast = [...cast, e.extra ? { name: e.name, pos, extra: true } : { name: e.name, pos }]
    }
    const left = before.filter(c => !cast.some(x => x.name === c.name)).map(c => c.name)
    const entered = cast.filter(c => !before.some(x => x.name === c.name)).map(c => c.name)
    return { cast, entered, left }
  })
  cast = cast.filter(c => !after.includes(c.name) && !c.extra)
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
