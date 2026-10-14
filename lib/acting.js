// 动作与表情设计（每个角色一份）：画立绘之前，先通读人物卡、世界书、到这一轮为止的全部剧情和角色档案，
// 给这个人设计专属的一套动作（galgame「一个动作 + 一套表情」里的动作），以及每种情绪在他脸上的样子，再照着画底图和表情差分。
// 同样是「生气」，有人咬牙瞪眼，有人只是不说话、眼神冷下来；同样站着，军人背着手，混混插着兜。
// 存在 game.looks[name].acting（提升为全局角色时一起带进全局库）：
//   { read, now, height, poses: [{ id, label, desc, tags, emotions, kind, premise, needs, from, life }], faces: { 情绪: { desc, tags, level } }, at, turn, by: 'ai' | 'user' }
//   poses[].kind 是本性（self）还是处境（situ），处境的写着前提 premise、靠的长期状态 needs；收起 / 放回的记录 life、从哪一句起才有 from（见 lib/pose-life.js）。
//   faces[].level 是这个人这种情绪的强弱（1 微 ~ 4 极，见 lib/face-paint.js）：换脸的重绘强度按它定，「极」的整张画；没标用情绪默认的。
//   read 是设计师起草的表演笔记·本性（这个人本来怎么流露情绪，换个世界也成立）；玩家自己写的存在档案里（actingNote，见 cast.js），锁住，
//   重新设计也不动它，有它时提示词里用它（actingNoteOf）。全局角色的跟着人去每个世界。
//   now 是设计师写的表演笔记·这一局（此刻的处境怎么影响他流露情绪：还在找人、刚团聚、受了伤……），处境变了复盘时重写；
//   玩家自己写的存在这一局的 looks[名].noteHere，锁住（actingHereOf）。不带去别的世界。
//   height 是设计师读资料估的身高（厘米），档案里没写身高时剧场按它站（lib/stature.js）。
//   poses[].emotions 的第一个是这个动作底图画的情绪；一个情绪可以放进好几个动作（第一个有它的是它的主动作，见 lib/poses.js）。
//   平静 neutral 在第一个动作的第一个（登场立绘就是它）。
//   立绘都按正面画：以前的侧身动作（side）不再有，老存档里标着的照正面画。
// 这里是纯函数（宿主、浏览器、测试共用）；请模型设计的那一步在 sprites.js。
import { emotionId, emotionEntry, personEmotions, isBuiltinEmotion, resolveEmotion, standIns, nearestOf, emotionLevel } from './emotions.js'
import { faceTags } from './face.js'
import { softenSprite } from './image/style.js'
import { cleanHeight } from './stature.js'
import { poseTags, settleNeutral as settlePoses, freshPoseId, homePose } from './poses.js'
import { cleanLevel, FACE_LEVEL_LABEL } from './face-paint.js'
import { fillOf, pickOf } from './prompt-words.js'
import { cleanSitu, cleanKind, cleanNeeds, cleanFrom, poseLife, lifeText, KIND_LABEL, WHY_CHARS } from './pose-life.js'

export { poseTags }

/** 表演笔记最长多少字（设计师起草的、玩家写的都一样）。动作数、情绪数不设上限：每个动作至少放一个情绪，自然不会比情绪多。 */
export const NOTE_CHARS = 2000

const clip = (value, n) => String(value ?? '').replace(/[\r\n\t]+/g, ' ').trim().slice(0, n)

/**
 * 要给这个人设计哪些情绪：内置的全部 + 这个人用过、画过、玩家加给大家的新情绪 + 这次要画的。
 * used：这一局里他说话时用过的情绪；drawn：他已经有差分的情绪。
 */
export function actingEmotions(name, custom = [], { used = [], drawn = [], extra = [] } = {}) {
  const list = personEmotions(name, custom, { used, drawn }).map(e => e.id)
  for (const e of extra.map(x => resolveEmotion(x, custom))) if (e && !list.includes(e)) list.push(e)
  return list
}

/** 这个人的表演笔记·本性：玩家写的（档案里的 actingNote）优先，没写用设计师起草的；by 说是谁写的。 */
export function actingNoteOf(person) {
  const own = String(person?.actingNote || '').trim()
  if (own) return { text: own, by: 'user' }
  const draft = String(person?.acting?.read || '').trim()
  return draft ? { text: draft, by: 'ai' } : { text: '', by: '' }
}

/** 这个人的表演笔记·这一局：玩家写的（这一局的 noteHere）优先，没写用设计师写的（acting.now）。 */
export function actingHereOf(person) {
  const own = String(person?.noteHere || '').trim()
  if (own) return { text: own, by: 'user' }
  const draft = String(person?.acting?.now || '').trim()
  return draft ? { text: draft, by: 'ai' } : { text: '', by: '' }
}

/** 设计师接着改的那一份（补设计、复盘……）：动作、表情、两条笔记、身高，深拷贝。 */
export function sheetCopy(acting) {
  if (!acting?.poses?.length) return null
  const { read = '', now = '', nowTurn, height, poses, faces = {}, usedIds } = acting
  return structuredClone({ read, ...(now ? { now, nowTurn } : {}), ...(height ? { height } : {}), poses, faces, ...(usedIds?.length ? { usedIds } : {}) })
}

/** 一个动作：动作名必填；一个动作里同一个情绪只留一次（别的动作里可以再有）。 */
function cleanPose(p, allowed) {
  const label = clip(p?.label, 12)
  if (!label) return null
  const emotions = []
  for (const raw of Array.isArray(p?.emotions) ? p.emotions : []) {
    const e = emotionId(raw)
    if (!e || emotions.includes(e) || (allowed && !allowed.has(e))) continue
    emotions.push(e)
  }
  // 本性还是处境、前提、靠的长期状态（收起放回的记录、从哪一句起才有不从这里收：见 lib/pose-life.js 的 keepLife）
  const { kind, premise, needs } = cleanSitu({ kind: p?.kind, premise: p?.premise, needs: p?.needs })
  return { id: clip(p?.id, 12), label, desc: clip(p?.desc, 200), tags: poseTags(p?.tags), emotions, ...(kind ? { kind } : {}), ...(premise ? { premise } : {}), ...(needs ? { needs } : {}) }
}

function cleanFace(f, soften) {
  const picked = faceTags(f?.tags)
  const tags = (soften ? softenSprite(picked) : picked).slice(0, 400) // 设计师写的表情收着画：吓人、太用力的词去掉或换轻一档
  const level = cleanLevel(f?.level)
  // 只标了强弱、没写表情的也留着（玩家在表里只改了强弱）
  return tags || level ? { desc: clip(f?.desc, 200), tags, ...(level ? { level } : {}) } : null
}

/** 模型或玩家写的 faces：数组 [{emotion, desc, tags}] 或对象 {情绪: {desc, tags}} 都认。 */
function faceEntries(faces) {
  if (Array.isArray(faces)) return faces.map(f => [f?.emotion, f])
  if (faces && typeof faces === 'object') return Object.entries(faces)
  return []
}

/** 新动作的编号：不跟现在的、也不跟没带来这个世界的（usedIds，那些编号画的图是别的动作）重。 */
const nextId = (poses, used = []) => freshPoseId(used.length ? [...poses, ...used.map(id => ({ id }))] : poses, 'p')
const settleNeutral = sheet => { settlePoses(sheet.poses); return sheet }

/**
 * 整理一份设计（模型写的整套、玩家改过的）：一个动作里同一个情绪只留一次（一个情绪可以放进好几个动作）、动作只留身体 tag、表情只留脸上的 tag。
 * allowed：只收这些情绪（不给就都收）；keepIds：保留原来的动作编号（玩家改的），否则按顺序编 p1、p2……
 * keepEmpty：留着还没放情绪的动作（玩家刚加的一列）；模型写的空动作去掉。
 * soften：表情收着画（设计师写的传 true；玩家自己改的照写的存）。
 * 一个有情绪的动作都没有回 null。
 */
export function cleanActing(json, { allowed = null, keepIds = false, keepEmpty = false, soften = false } = {}) {
  const set = allowed ? new Set(allowed) : null
  const poses = []
  for (const p of Array.isArray(json?.poses) ? json.poses : []) {
    const pose = cleanPose(p, set)
    if (!pose || (!pose.emotions.length && !keepEmpty)) continue
    if (!keepIds || !/^p\d{1,4}$/.test(pose.id) || poses.some(x => x.id === pose.id)) pose.id = ''
    poses.push(pose)
  }
  if (!poses.some(p => p.emotions.length)) return null
  for (const p of poses) if (!p.id) p.id = nextId(poses)
  const faces = {}
  for (const [raw, f] of faceEntries(json?.faces)) {
    const e = emotionId(raw)
    const face = e && (!set || set.has(e)) ? cleanFace(f, soften) : null
    if (face) faces[e] = face
  }
  const now = clip(json?.now, NOTE_CHARS)
  return settleNeutral({ read: clip(json?.read, NOTE_CHARS), ...(now ? { now } : {}), ...(cleanHeight(json?.height) ? { height: cleanHeight(json.height) } : {}), poses, faces })
}

/**
 * 往已有的设计里补（新情绪、重新设计几张脸）：已经在哪几个动作里的情绪不挪；新情绪按模型写的动作编号放进去（可以放进好几个），
 * 编号不认识的当作新动作；表情按写的换上。原设计不动，回新的一份和这次写到的情绪。
 * free：情绪不管已经在不在别的动作里都能放（复盘时给收起的动作里的情绪重新安家）；relabel：已有的动作按写的改本性 / 处境、前提、靠的状态；
 * from：新加的动作从哪一句起才有（{ turn, at }，复盘时用）。
 */
export function mergeActing(sheet, json, { allowed = null, free = false, relabel = false, from = null } = {}) {
  const set = allowed ? new Set(allowed) : null
  const next = { ...sheet, poses: sheet.poses.map(p => ({ ...p, emotions: [...p.emotions] })), faces: { ...sheet.faces } }
  // 设计里已经有的情绪不再往别的动作里加（补设计只放新情绪）
  const placed = new Set(free ? [] : next.poses.flatMap(p => p.emotions))
  const touched = new Set()
  for (const p of Array.isArray(json?.poses) ? json.poses : []) {
    const id = clip(p?.id, 12)
    const known = next.poses.find(x => x.id === id)
    if (known && relabel) relabelPose(known, p)
    const fresh = []
    for (const raw of Array.isArray(p?.emotions) ? p.emotions : []) {
      const e = emotionId(raw)
      if (!e || placed.has(e) || fresh.includes(e) || known?.emotions.includes(e) || (set && !set.has(e))) continue
      fresh.push(e)
    }
    if (!fresh.length) continue
    if (known) {
      known.emotions.push(...fresh)
      // 复盘时放进已有动作的：从那一句起才算（之前的轮次重演时还是原来的样子）
      const since = from && cleanFrom(from)
      if (since) known.joins = { ...(known.joins || {}), ...Object.fromEntries(fresh.map(e => [e, since])) }
      continue
    }
    const pose = cleanPose({ ...p, emotions: [] }, null)
    if (pose) next.poses.push({ ...pose, id: nextId(next.poses, sheet.usedIds || []), emotions: fresh, ...(from ? { from: cleanFrom(from) } : {}) })
    else next.poses[0].emotions.push(...fresh.filter(e => !next.poses[0].emotions.includes(e)))
  }
  for (const [raw, f] of faceEntries(json?.faces)) {
    const e = emotionId(raw)
    const face = e && (!set || set.has(e)) ? cleanFace(f, true) : null // 补设计只有设计师写
    if (face) { next.faces[e] = face; touched.add(e) }
  }
  if (!next.read && json?.read) next.read = clip(json.read, NOTE_CHARS)
  if (!next.height && cleanHeight(json?.height)) next.height = cleanHeight(json.height)
  return { sheet: settleNeutral(next), touched }
}

/** 已有的动作按设计师写的改本性 / 处境、前提、靠的长期状态（写了才改）。原地改。 */
function relabelPose(pose, p) {
  const kind = cleanKind(p?.kind)
  if (kind) pose.kind = kind
  if (pose.kind === 'situ' && typeof p?.premise === 'string' && p.premise.trim()) pose.premise = clip(p.premise, 120)
  if (pose.kind === 'self') delete pose.premise
  if (Array.isArray(p?.needs)) { const needs = cleanNeeds(p.needs); if (needs.length) pose.needs = needs; else delete pose.needs }
}

/**
 * 复盘（处境变了）、到了新世界、给老设计标本性和处境：在已有设计上改。task：'review' | 'world' | 'label'。
 *  - 每个动作可以标（改）本性 / 处境、前提、靠的长期状态；
 *  - 新动作（编号不认识的）加进来，from 给了就从那一句起才有；
 *  - 情绪放进已有动作或新动作，不管它已经在不在别的动作里（复盘就是给收起的动作里的情绪重新安家）；
 *  - off：前提已经不成立、要收起的处境动作（复盘、标的时候发现的）；drop：到了新世界不合适的带来的动作，去掉（只有 world 收）；
 *  - now 重写这一局的笔记；read（本性的笔记）只有 label、world 收：把本性的那部分摘出来。
 * 回 { sheet, off: [编号], why（收起的原因）, touched }。没有动作了回的 sheet 为 null。
 */
export function reviseActing(sheet, json, { allowed = null, task = 'review', from = null } = {}) {
  let base = sheet
  if (task === 'world') {
    const drop = new Set((Array.isArray(json?.drop) ? json.drop : []).map(x => clip(typeof x === 'string' ? x : x?.id, 12)).filter(id => sheet.poses.some(p => p.id === id)))
    // 去掉的编号记着：之后的新动作不再用（那些编号画的图是去掉的那个动作）
    if (drop.size) base = { ...sheet, poses: settlePoses(sheet.poses.filter(p => !drop.has(p.id))), usedIds: [...new Set([...(sheet.usedIds || []), ...drop])] }
  }
  if (!base.poses.length) return { sheet: null, off: [], why: '', touched: new Set() }
  const { sheet: next, touched } = mergeActing(base, json, { allowed, free: true, relabel: true, from: task === 'review' ? from : null })
  const off = [...new Set((Array.isArray(json?.off) ? json.off : []).map(x => clip(typeof x === 'string' ? x : x?.id, 12)))]
    .filter(id => next.poses.some(p => p.id === id && p.kind !== 'self'))
  const now = clip(json?.now, NOTE_CHARS)
  if (now) next.now = now
  const read = task !== 'review' ? clip(json?.read, NOTE_CHARS) : ''
  if (read) next.read = read
  return { sheet: next, off, why: clip(json?.why, WHY_CHARS), touched }
}

/** 设计里还没分到动作的情绪：跟着它的替身走（替身的替身、它那一类的代表情绪……），都不在就进第一个动作（默认站姿）。 */
export function completeActing(sheet, emotions = [], custom = []) {
  if (!sheet?.poses?.length) return sheet
  for (const raw of emotions) {
    const e = resolveEmotion(raw, custom)
    if (!e || sheet.poses.some(p => p.emotions.includes(e))) continue
    const near = standIns(e, custom).filter(x => x !== 'neutral')
    const home = near.map(x => sheet.poses.find(p => p.emotions.includes(x))).find(Boolean) || sheet.poses[0]
    home.emotions.push(e)
  }
  return settleNeutral(sheet)
}

/** 情绪在这个人的设计里的主动作：第一个有它的 → 并进它的、它的替身在的（一路往下找）→ 第一个动作。没有设计回 null（用通用动作组）。 */
export const actingPose = (acting, emotion, custom = []) => homePose(acting?.poses?.length ? { poses: acting.poses } : null, emotion, custom)

/** 这个人的这种情绪设计成什么样（只看它自己的，不借别的情绪）；只标了强弱、没写表情的算没设计。 */
export const actingFace = (acting, emotion) => (acting?.faces?.[emotion]?.tags ? acting.faces[emotion] : null)

/** 这个人的这种情绪有多强（1 微 ~ 4 极）：设计里标的 → 情绪默认的（新情绪跟着替身）。 */
export const actingLevel = (acting, emotion, custom = []) => cleanLevel(acting?.faces?.[emotion]?.level) || emotionLevel(emotion, custom)

/** 设计里还没分到动作的情绪（要补设计的）。 */
export const unplacedEmotions = (acting, emotions = []) => emotions.filter(e => !acting?.poses?.some(p => p.emotions?.includes(e)))

const label = (e, custom) => emotionEntry(e, custom).label

/**
 * 给模型看的情绪清单：内置写「键（名字）」，新情绪写词本身和它接近的那个（替身，或者它那一类的代表情绪），后面接用在什么场面；已在设计里的写明只重画脸。
 * 写法在设置 →「提示词」→ 表演设计师 → 情绪清单（config 不给用默认）。
 */
export function actingEmotionLines(emotions, custom = [], acting = null, config = null) {
  return emotions.map(e => {
    const entry = emotionEntry(e, custom)
    const near = nearestOf(e, custom)
    const head = isBuiltinEmotion(e)
      ? fillOf(config, 'acting.line.builtin', { key: e, label: entry.label, use: entry.use })
      : fillOf(config, 'acting.line.custom', { key: e, near: near ? (isBuiltinEmotion(near) ? `${near} ${emotionEntry(near, custom).label}` : near) : '', use: entry.use })
    const poses = (acting?.poses || []).filter(p => p.emotions.includes(e))
    return poses.length ? fillOf(config, 'acting.line.placed', { line: head, poses: poses.map(p => `${p.id}「${p.label}」`).join('、') }) : head
  }).join('\n')
}

/**
 * 给模型看的已有设计（补设计、复盘时用）。withNote：带上设计师起草的表演笔记·本性（档案里有玩家写的时不带，档案那一行就是）；
 * withNow：带上设计师写的这一局的笔记（同样，玩家写了不带）。ctx 给了就写明每个动作此刻在不在（收起的、靠的状态没了的，见 lib/pose-life.js）。
 */
export function actingBrief(acting, custom = [], { withNote = true, withNow = true, config = null, ctx = null } = {}) {
  if (!acting?.poses?.length) return ''
  const blank = key => pickOf(config, 'acting.blanks', key)
  const poses = acting.poses.map(p => fillOf(config, 'acting.current.pose', {
    id: p.id, label: p.label, desc: p.desc || blank('noDesc'), tags: p.tags || '',
    emotions: p.emotions.map((e, i) => label(e, custom) + (i ? '' : blank('base'))).join('、'),
    kind: p.kind ? KIND_LABEL[p.kind] : blank('noKind'),
    premise: p.kind === 'situ' ? p.premise || '' : '',
    needs: (p.needs || []).map(n => n.name).join('、'),
    status: ctx ? lifeText(poseLife(p, ctx), p) : '',
  }))
  const faces = Object.entries(acting.faces || {}).map(([e, f]) => fillOf(config, 'acting.current.face', { label: label(e, custom), level: f.level ? FACE_LEVEL_LABEL[f.level] : '', desc: f.desc || '', tags: f.tags || '' }))
  return fillOf(config, 'acting.current', { read: withNote ? acting.read || '' : '', now: withNow ? acting.now || '' : '', poses: poses.join('\n'), faces: faces.join('\n') }) + '\n'
}
