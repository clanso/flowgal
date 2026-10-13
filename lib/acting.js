// 动作与表情设计（每个角色一份）：画立绘之前，先通读人物卡、世界书、到这一轮为止的全部剧情和角色档案，
// 给这个人设计专属的一套动作（galgame「一个动作 + 一套表情」里的动作），以及每种情绪在他脸上的样子，再照着画底图和表情差分。
// 同样是「生气」，有人咬牙瞪眼，有人只是不说话、眼神冷下来；同样站着，军人背着手，混混插着兜。
// 存在 game.looks[name].acting（提升为全局角色时一起带进全局库）：
//   { read, height, poses: [{ id, label, desc, tags, emotions }], faces: { 情绪: { desc, tags } }, at, turn, by: 'ai' | 'user' }
//   read 是设计师起草的表演笔记（这个人怎么流露情绪）；玩家自己写的表演笔记存在档案里（actingNote，见 cast.js），锁住，重新设计也不动它，
//   有它时提示词里用它（actingNoteOf）。
//   height 是设计师读资料估的身高（厘米），档案里没写身高时剧场按它站（lib/stature.js）。
//   poses[].emotions 的第一个是这个动作底图画的情绪；每个情绪只在一个动作里。平静 neutral 在第一个动作的第一个（登场立绘就是它）。
//   立绘都按正面画：以前的侧身动作（side）不再有，老存档里标着的照正面画。
// 这里是纯函数（宿主、浏览器、测试共用）；请模型设计的那一步在 sprites.js。
import { emotionId, emotionEntry, personEmotions, isBuiltinEmotion, resolveEmotion, standIns, nearestOf } from './emotions.js'
import { isFaceTag, faceTags } from './face.js'
import { splitTags, tagKey, softenSprite } from './image/style.js'
import { cleanHeight } from './stature.js'

/** 表演笔记最长多少字（设计师起草的、玩家写的都一样）。动作数、情绪数不设上限：每个动作至少放一个情绪，自然不会比情绪多。 */
export const NOTE_CHARS = 2000

// 构图、景别、背景、人数归插件管；道具立绘不拿。动作的 tag 里写了也去掉。
const NOT_BODY = /^(?:solo|\d?(?:girls?|boys?|others?)|upper body|cowboy shot|full body|portrait|close-up|standing|centered|facing viewer|facing forward|straight-on|eye-level|no props|from side|profile|side view|[\w\s-]*background)$/
// 发色、瞳色这类固定外貌也不是动作（「手插进头发里」这种带 hair 的动作留着）
const LOOK_WORD = /\b(?:long|short|medium|very long|black|blonde|blond|brown|red|blue|green|pink|purple|violet|white|silver|grey|gray|orange|aqua|yellow|golden|heterochromia)\b.*\b(?:hair|eyes)$/
const clip = (value, n) => String(value ?? '').replace(/[\r\n\t]+/g, ' ').trim().slice(0, n)
const tidy = list => { const seen = new Set(); return list.filter(t => { const k = tagKey(t); if (!k || seen.has(k)) return false; seen.add(k); return true }) }

/** 动作的 tag：只留身体（站姿、重心、肩、手和手臂、头的倾斜），脸、构图去掉。 */
export const poseTags = text => tidy(splitTags(text).filter(t => !isFaceTag(t) && !NOT_BODY.test(tagKey(t)) && !LOOK_WORD.test(tagKey(t)))).join(', ').slice(0, 400)

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

function cleanPose(p, allowed, taken) {
  const label = clip(p?.label, 12)
  if (!label) return null
  const emotions = []
  for (const raw of Array.isArray(p?.emotions) ? p.emotions : []) {
    const e = emotionId(raw)
    if (!e || taken.has(e) || (allowed && !allowed.has(e))) continue
    taken.add(e)
    emotions.push(e)
  }
  return { id: clip(p?.id, 12), label, desc: clip(p?.desc, 200), tags: poseTags(p?.tags), emotions }
}

function cleanFace(f, soften) {
  const picked = faceTags(f?.tags)
  const tags = (soften ? softenSprite(picked) : picked).slice(0, 400) // 设计师写的表情收着画：吓人、太用力的词去掉或换轻一档
  return tags ? { desc: clip(f?.desc, 200), tags } : null
}

/** 模型或玩家写的 faces：数组 [{emotion, desc, tags}] 或对象 {情绪: {desc, tags}} 都认。 */
function faceEntries(faces) {
  if (Array.isArray(faces)) return faces.map(f => [f?.emotion, f])
  if (faces && typeof faces === 'object') return Object.entries(faces)
  return []
}

const nextId = poses => { let n = 1; while (poses.some(p => p.id === 'p' + n)) n++; return 'p' + n }

/** 平静放在第一个动作的第一个：没分到就放进第一个动作；分在别的动作里就把那个动作挪到最前。 */
function settleNeutral(sheet) {
  if (!sheet.poses.length) return sheet
  let at = sheet.poses.findIndex(p => p.emotions.includes('neutral'))
  if (at < 0) { sheet.poses[0].emotions.unshift('neutral'); at = 0 }
  const [pose] = sheet.poses.splice(at, 1)
  pose.emotions = ['neutral', ...pose.emotions.filter(e => e !== 'neutral')]
  sheet.poses.unshift(pose)
  return sheet
}

/**
 * 整理一份设计（模型写的整套、玩家改过的）：每个情绪只在一个动作里、动作只留身体 tag、表情只留脸上的 tag。
 * allowed：只收这些情绪（不给就都收）；keepIds：保留原来的动作编号（玩家改的），否则按顺序编 p1、p2……
 * soften：表情收着画（设计师写的传 true；玩家自己改的照写的存）。
 * 一个能用的动作都没有回 null。
 */
export function cleanActing(json, { allowed = null, keepIds = false, soften = false } = {}) {
  const set = allowed ? new Set(allowed) : null
  const taken = new Set()
  const poses = []
  for (const p of Array.isArray(json?.poses) ? json.poses : []) {
    const pose = cleanPose(p, set, taken)
    if (!pose || !pose.emotions.length) continue
    if (!keepIds || !/^p\d{1,4}$/.test(pose.id) || poses.some(x => x.id === pose.id)) pose.id = ''
    poses.push(pose)
  }
  if (!poses.length) return null
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
 * 往已有的设计里补（新情绪、重新设计几张脸）：已经在某个动作里的情绪不挪；新情绪按模型写的动作编号放进去，
 * 编号不认识的当作新动作；表情按写的换上。原设计不动，回新的一份和这次写到的情绪。
 */
export function mergeActing(sheet, json, { allowed = null } = {}) {
  const set = allowed ? new Set(allowed) : null
  const next = { ...sheet, poses: sheet.poses.map(p => ({ ...p, emotions: [...p.emotions] })), faces: { ...sheet.faces } }
  const taken = new Set(next.poses.flatMap(p => p.emotions))
  const touched = new Set()
  for (const p of Array.isArray(json?.poses) ? json.poses : []) {
    const id = clip(p?.id, 12)
    const known = next.poses.find(x => x.id === id)
    const fresh = []
    for (const raw of Array.isArray(p?.emotions) ? p.emotions : []) {
      const e = emotionId(raw)
      if (!e || taken.has(e) || (set && !set.has(e))) continue
      taken.add(e)
      fresh.push(e)
    }
    if (!fresh.length) continue
    if (known) { known.emotions.push(...fresh); continue }
    const pose = cleanPose({ ...p, emotions: [] }, null, new Set())
    if (pose) next.poses.push({ ...pose, id: nextId(next.poses), emotions: fresh })
    else next.poses[0].emotions.push(...fresh)
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

/** 情绪在这个人的设计里归哪个动作：自己在的 → 并进它的、它的替身在的（一路往下找）→ 第一个动作。没有设计回 null（用通用动作组）。 */
export function actingPose(acting, emotion, custom = []) {
  const poses = acting?.poses
  if (!Array.isArray(poses) || !poses.length) return null
  const find = e => e && poses.find(p => p.emotions?.includes(e))
  const id = resolveEmotion(emotion, custom) || emotion
  return find(id) || find(emotion) || standIns(id, custom).filter(x => x !== 'neutral').map(find).find(Boolean) || poses[0]
}

/** 这个人的这种情绪设计成什么样（只看它自己的，不借别的情绪）。 */
export const actingFace = (acting, emotion) => acting?.faces?.[emotion] || null

/** 设计里还没分到动作的情绪（要补设计的）。 */
export const unplacedEmotions = (acting, emotions = []) => emotions.filter(e => !acting?.poses?.some(p => p.emotions?.includes(e)))

const label = (e, custom) => emotionEntry(e, custom).label

/** 给模型看的情绪清单：内置写「键（名字）」，新情绪写词本身和它接近的那个（替身，或者它那一类的代表情绪）；已在设计里的写明只重画脸。 */
export function actingEmotionLines(emotions, custom = [], acting = null) {
  return emotions.map(e => {
    const entry = emotionEntry(e, custom)
    const near = nearestOf(e, custom)
    const nearText = near ? `，接近 ${isBuiltinEmotion(near) ? `${near} ${emotionEntry(near, custom).label}` : near}` : ''
    const head = isBuiltinEmotion(e) ? `- ${e}（${entry.label}）` : `- ${e}（新情绪${nearText}）`
    const pose = acting?.poses?.find(p => p.emotions.includes(e))
    return pose ? `${head}：已在动作 ${pose.id}「${pose.label}」里，只重新设计表情` : head
  }).join('\n')
}

/** 给模型看的已有设计（补设计时用）。withNote：带上设计师起草的表演笔记（档案里有玩家写的时不带，档案那一行就是）。 */
export function actingBrief(acting, custom = [], { withNote = true } = {}) {
  if (!acting?.poses?.length) return ''
  const poses = acting.poses.map(p => `- ${p.id}「${p.label}」：${p.desc || '（没写描述）'}${p.tags ? `；身体 ${p.tags}` : ''}；情绪：${p.emotions.map((e, i) => label(e, custom) + (i ? '' : '（底图）')).join('、')}`)
  const faces = Object.entries(acting.faces || {}).map(([e, f]) => `- ${label(e, custom)}：${f.desc || ''}${f.tags ? `（${f.tags}）` : ''}`)
  return `【已有的动作与表情设计】\n${withNote && acting.read ? `表演笔记：${acting.read}\n` : ''}动作：\n${poses.join('\n')}${faces.length ? `\n表情：\n${faces.join('\n')}` : ''}\n`
}
