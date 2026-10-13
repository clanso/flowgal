// 动作与表情设计（每个角色一份）：画立绘之前，先通读人物卡、世界书、到这一轮为止的全部剧情和角色档案，
// 给这个人设计专属的一套动作（galgame「一个动作 + 一套表情」里的动作），以及每种情绪在他脸上的样子，再照着画底图和表情差分。
// 同样是「生气」，有人咬牙瞪眼，有人只是不说话、眼神冷下来；同样站着，军人背着手，混混插着兜。
// 存在 game.looks[name].acting（提升为全局角色时一起带进全局库）：
//   { read, height, poses: [{ id, label, desc, tags, emotions }], faces: { 情绪: { desc, tags, level } }, at, turn, by: 'ai' | 'user' }
//   faces[].level 是这个人这种情绪的强弱（1 微 ~ 4 极，见 lib/face-paint.js）：换脸的重绘强度按它定，「极」的整张画；没标用情绪默认的。
//   read 是设计师起草的表演笔记（这个人怎么流露情绪）；玩家自己写的表演笔记存在档案里（actingNote，见 cast.js），锁住，重新设计也不动它，
//   有它时提示词里用它（actingNoteOf）。
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

/** 这个人的表演笔记：玩家写的（档案里的 actingNote）优先，没写用设计师起草的；by 说是谁写的。 */
export function actingNoteOf(person) {
  const own = String(person?.actingNote || '').trim()
  if (own) return { text: own, by: 'user' }
  const draft = String(person?.acting?.read || '').trim()
  return draft ? { text: draft, by: 'ai' } : { text: '', by: '' }
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
  return { id: clip(p?.id, 12), label, desc: clip(p?.desc, 200), tags: poseTags(p?.tags), emotions }
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

const nextId = poses => freshPoseId(poses, 'p')
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
  return settleNeutral({ read: clip(json?.read, NOTE_CHARS), ...(cleanHeight(json?.height) ? { height: cleanHeight(json.height) } : {}), poses, faces })
}

/**
 * 往已有的设计里补（新情绪、重新设计几张脸）：已经在哪几个动作里的情绪不挪；新情绪按模型写的动作编号放进去（可以放进好几个），
 * 编号不认识的当作新动作；表情按写的换上。原设计不动，回新的一份和这次写到的情绪。
 */
export function mergeActing(sheet, json, { allowed = null } = {}) {
  const set = allowed ? new Set(allowed) : null
  const next = { ...sheet, poses: sheet.poses.map(p => ({ ...p, emotions: [...p.emotions] })), faces: { ...sheet.faces } }
  // 设计里已经有的情绪不再往别的动作里加（补设计只放新情绪）
  const placed = new Set(next.poses.flatMap(p => p.emotions))
  const touched = new Set()
  for (const p of Array.isArray(json?.poses) ? json.poses : []) {
    const id = clip(p?.id, 12)
    const known = next.poses.find(x => x.id === id)
    const fresh = []
    for (const raw of Array.isArray(p?.emotions) ? p.emotions : []) {
      const e = emotionId(raw)
      if (!e || placed.has(e) || fresh.includes(e) || known?.emotions.includes(e) || (set && !set.has(e))) continue
      fresh.push(e)
    }
    if (!fresh.length) continue
    if (known) { known.emotions.push(...fresh); continue }
    const pose = cleanPose({ ...p, emotions: [] }, null)
    if (pose) next.poses.push({ ...pose, id: nextId(next.poses), emotions: fresh })
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
 * 给模型看的情绪清单：内置写「键（名字）」，新情绪写词本身和它接近的那个（替身，或者它那一类的代表情绪）；已在设计里的写明只重画脸。
 * 写法在设置 →「提示词」→ 表演设计师 → 情绪清单（config 不给用默认）。
 */
export function actingEmotionLines(emotions, custom = [], acting = null, config = null) {
  return emotions.map(e => {
    const entry = emotionEntry(e, custom)
    const near = nearestOf(e, custom)
    const head = isBuiltinEmotion(e)
      ? fillOf(config, 'acting.line.builtin', { key: e, label: entry.label })
      : fillOf(config, 'acting.line.custom', { key: e, near: near ? (isBuiltinEmotion(near) ? `${near} ${emotionEntry(near, custom).label}` : near) : '' })
    const poses = (acting?.poses || []).filter(p => p.emotions.includes(e))
    return poses.length ? fillOf(config, 'acting.line.placed', { line: head, poses: poses.map(p => `${p.id}「${p.label}」`).join('、') }) : head
  }).join('\n')
}

/** 给模型看的已有设计（补设计时用）。withNote：带上设计师起草的表演笔记（档案里有玩家写的时不带，档案那一行就是）。 */
export function actingBrief(acting, custom = [], { withNote = true, config = null } = {}) {
  if (!acting?.poses?.length) return ''
  const blank = key => pickOf(config, 'acting.blanks', key)
  const poses = acting.poses.map(p => fillOf(config, 'acting.current.pose', { id: p.id, label: p.label, desc: p.desc || blank('noDesc'), tags: p.tags || '', emotions: p.emotions.map((e, i) => label(e, custom) + (i ? '' : blank('base'))).join('、') }))
  const faces = Object.entries(acting.faces || {}).map(([e, f]) => fillOf(config, 'acting.current.face', { label: label(e, custom), level: f.level ? FACE_LEVEL_LABEL[f.level] : '', desc: f.desc || '', tags: f.tags || '' }))
  return fillOf(config, 'acting.current', { read: withNote ? acting.read || '' : '', poses: poses.join('\n'), faces: faces.join('\n') }) + '\n'
}
