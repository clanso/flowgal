// 动作（galgame「一个动作 + 一套表情」里的动作）：设置里的通用动作组（config.images.poseGroups，开着「表情只换脸」时才用），大家共用一套。
// [{ id, label, desc, tags, emotions }]：emotions 是这个动作里有的情绪，第一个是这个动作的底图（整张画），其余在底图上只换脸。
// 一个情绪可以放进好几个动作。它的「主动作」是第一个有它的动作；不在任何动作里的（新情绪还没放进去）跟着替身走。
// 剧场里身子不动只换脸：这一句的情绪在当前动作里有就留在当前动作，没有才换到它的主动作；导演在情绪转折那句点名换（line.pose、react[].pose）。
// 出图也按同一套走（engine 的 spriteWants 用 poseWalker），哪个「动作 × 情绪」真用到了才画哪张。
// 差分编号：情绪在主动作里那张是「…|情绪」，在别的动作里的是「…|情绪@动作编号」（look.js 的 variantKey）。
// 前后端共用这里的纯函数。
import { POSES } from './vocab.js'
import { anchorOf, poseMembers, cleanPoseMap, isFaceTag } from './face.js'
import { emotionId, isBuiltinEmotion, resolveEmotion, standIns } from './emotions.js'
import { variantKey } from './look.js'
import { splitTags, tagKey } from './image/style.js'
import { wordRules } from './prompt-words.js'

const clip = (value, n) => String(value ?? '').replace(/[\r\n\t]+/g, ' ').trim().slice(0, n)
const tidy = list => { const seen = new Set(); return list.filter(t => { const k = tagKey(t); if (!k || seen.has(k)) return false; seen.add(k); return true }) }
/** 动作编号：小写字母开头，最多 12 个字母数字（通用动作组的 daily、g1……）。 */
export const POSE_ID = /^[a-z][a-z0-9_-]{0,11}$/

// 构图、景别、背景、人数归插件管；道具立绘不拿。动作的 tag 里写了也去掉（filter.poseDrop）。
// 发色、瞳色这类固定外貌也不是动作（filter.lookWords、filter.colors；「手插进头发里」这种带 hair 的动作留着）
/** 动作的 tag：只留身体（站姿、重心、肩、手和手臂、头的倾斜），脸、构图去掉。 */
export function poseTags(text) {
  const { poseDrop, lookWord } = wordRules()
  return tidy(splitTags(text).filter(t => !isFaceTag(t) && !poseDrop.test(tagKey(t)) && !lookWord.test(tagKey(t)))).join(', ').slice(0, 400)
}

/** 新动作的编号：prefix 加最小的没用过的数。 */
export const freshPoseId = (poses, prefix = 'p') => { let n = 1; while (poses.some(p => p.id === prefix + n)) n++; return prefix + n }

/**
 * 平静放在第一个动作的第一个（登场立绘就是它）：哪个动作都没有平静就放进第一个动作；第一个有平静的动作挪到最前，平静排第一。
 * 别的动作里也可以有平静（在那个动作上的平静脸）。原地改。
 */
export function settleNeutral(poses) {
  if (!poses.length) return poses
  let at = poses.findIndex(p => p.emotions.includes('neutral'))
  if (at < 0) { poses[0].emotions.unshift('neutral'); at = 0 }
  const [pose] = poses.splice(at, 1)
  pose.emotions = ['neutral', ...pose.emotions.filter(e => e !== 'neutral')]
  poses.unshift(pose)
  return poses
}

// 通用动作组默认的四组：以前写死的分组，加上一句描述和身体 tag（设置里都能改、能加能删）。
const GROUP_LOOKS = {
  daily: { desc: '平时自然站着的样子', tags: 'arms at sides, relaxed posture' },
  arms: { desc: '抱着胳膊：冷下来、较劲、不服气的时候', tags: 'arms crossed' },
  chest: { desc: '一只手放在胸前：不安、害羞、心动的时候', tags: 'hand on own chest' },
  chin: { desc: '一只手托着下巴：想事情、犯嘀咕的时候', tags: 'hand on own chin' },
}

/** 通用动作组的默认样子。legacy 是老设置里「情绪 → 动作组」的改动（images.poses），照搬进来。 */
export function defaultPoseGroups(legacy = {}) {
  const moved = cleanPoseMap(legacy)
  const groups = Object.keys(POSES).map(id => {
    const anchor = anchorOf(id, [], moved)
    const members = poseMembers(id, [], moved).filter(e => e !== anchor)
    return { id, label: POSES[id].label, desc: GROUP_LOOKS[id]?.desc || '', tags: GROUP_LOOKS[id]?.tags || '', emotions: anchor ? [anchor, ...members] : members }
  })
  // 老设置里给新情绪改过的组
  for (const [e, id] of Object.entries(moved)) {
    if (isBuiltinEmotion(e)) continue
    const group = groups.find(g => g.id === id)
    if (group && !group.emotions.includes(e)) group.emotions.push(e)
  }
  return settleNeutral(groups)
}

/**
 * 一套动作（通用动作组）规整一遍：动作名必填；编号不对、重复的重新编；一个动作里同一个情绪只留一次（不同动作里可以重复）。
 * keepEmpty：留着还没放情绪的动作（玩家刚加的一列）；不留就去掉。prefix 是新编号的前缀。
 */
export function cleanPoseList(raw, { keepEmpty = true, prefix = 'p', keepIds = true } = {}) {
  const out = []
  for (const p of (Array.isArray(raw) ? raw : []).slice(0, 64)) {
    const label = clip(p?.label, 12)
    if (!label) continue
    const emotions = [...new Set((Array.isArray(p?.emotions) ? p.emotions : []).map(emotionId).filter(Boolean))]
    if (!emotions.length && !keepEmpty) continue
    const id = clip(p?.id, 12)
    out.push({ id: keepIds && POSE_ID.test(id) && !out.some(x => x.id === id) ? id : '', label, desc: clip(p?.desc, 200), tags: poseTags(p?.tags), emotions })
  }
  for (const p of out) if (!p.id) p.id = freshPoseId(out, prefix)
  return settleNeutral(out)
}

/** 设置里的通用动作组：存过（数组，空的也算：全删了）就按存的，没存过用默认的（带上老设置里的改动）。 */
export const cleanPoseGroups = (raw, legacy = {}) => (Array.isArray(raw) ? cleanPoseList(raw, { prefix: 'g' }) : defaultPoseGroups(legacy))

/** 用哪套动作：通用动作组；groups 空着（没开换脸、或者全删了）回 null：每个情绪整张画，不分动作。 */
export function sheetOf(groups = []) {
  return Array.isArray(groups) && groups.length ? { poses: groups } : null
}

/** 有这个情绪的那些动作。 */
export const posesWith = (sheet, emotion) => (sheet?.poses || []).filter(p => p.emotions?.includes(emotion))

/** 按编号或动作名找动作（导演写的 pose 两种都认）。 */
export function findPose(sheet, ref) {
  const text = String(ref ?? '').trim()
  if (!text || !sheet?.poses?.length) return null
  return sheet.poses.find(p => p.id === text) || sheet.poses.find(p => p.label === text) || null
}

/** 情绪的主动作：第一个有它的 → 并进它的、它的替身在的（一路往下找，不找到平静）→ 第一个动作。没有动作回 null。 */
export function homePose(sheet, emotion, custom = []) {
  const poses = sheet?.poses
  if (!Array.isArray(poses) || !poses.length) return null
  const find = e => e && poses.find(p => p.emotions?.includes(e))
  const id = resolveEmotion(emotion, custom) || emotion
  return find(id) || find(emotion) || standIns(id, custom).filter(x => x !== 'neutral').map(find).find(Boolean) || poses[0]
}

/** 这个情绪能不能在这个动作上演：动作里有它；或者它还不在任何动作里（新情绪），那就哪个动作都行，身子不动只换脸。 */
export const fitsPose = (sheet, pose, emotion) => Boolean(pose) && (pose.emotions?.includes(emotion) || !posesWith(sheet, emotion).length)

/** 要在 ref 这个动作上演这个情绪：演得了就是它，演不了（或者没写）用主动作。 */
export function poseFor(sheet, emotion, ref = '', custom = []) {
  const id = resolveEmotion(emotion, custom) || emotion
  const named = findPose(sheet, ref)
  return named && fitsPose(sheet, named, id) ? named : homePose(sheet, id, custom)
}

/**
 * 剧场里每个人此刻在哪个动作（剧场的节拍和出图共用，两边一样才「用到了才画」得上）：
 * step(名字, 这一句的情绪, 导演点名的动作) → 动作编号（这个人不分动作时回 ''）。
 * 导演点名的演得了这个情绪就换过去；不然当前的动作演得了就不动；都不行换到这个情绪的主动作。
 * 只写了动作没写情绪：按他现在的情绪换。sheetFor(名字) 给这个人的那套动作（sheetOf）。
 */
export function poseWalker(sheetFor, custom = []) {
  const now = new Map() // 名字 → { pose, emo }
  return {
    step(name, emo = '', ref = '') {
      const sheet = sheetFor(name)
      const state = now.get(name) || {}
      const e = resolveEmotion(emo || state.emo || 'neutral', custom) || 'neutral'
      if (!sheet?.poses?.length) { now.set(name, { pose: '', emo: e }); return '' }
      const named = findPose(sheet, ref)
      const cur = state.pose ? sheet.poses.find(p => p.id === state.pose) : null
      const pose = named && fitsPose(sheet, named, e) ? named : cur && fitsPose(sheet, cur, e) ? cur : homePose(sheet, e, custom)
      now.set(name, { pose: pose.id, emo: e })
      return pose.id
    },
    /** 这个人现在在哪个动作（还没走过一步回 ''）。 */
    get: name => now.get(name)?.pose || '',
    /** 这个人现在的情绪（走到过的；还没走过回 ''）。 */
    emo: name => now.get(name)?.emo || '',
    /** 存一下 / 接着走（跨轮带着）：{ 名字: { pose, emo } }。 */
    save: () => Object.fromEntries(now),
    load(state) { for (const [name, s] of Object.entries(state || {})) if (s?.pose || s?.emo) now.set(name, { pose: s.pose || '', emo: s.emo || '' }) },
  }
}

/**
 * 这一句里换了情绪、或者被导演点名换动作的人：[{ name, emo, pose }]（emo 为空是只点名换了动作）。
 * speakers 是这一句说话的人（lib/staging.js 的 unitSpeakers 拆开），reacts 是 lib/blocking.js 的 reactsOf。剧场和出图都用它喂 poseWalker。
 */
export function lineSteps(line, speakers = [], reacts = []) {
  const out = []
  if (line?.emo || line?.pose) for (const name of speakers) out.push({ name, emo: line.emo || '', pose: line.pose || '' })
  for (const r of reacts) if (r.emo || r.pose) out.push({ name: r.name, emo: r.emo || '', pose: r.pose || '' })
  return out
}

/** 要画哪一张的写法：「情绪」是主动作里的，「情绪@动作」是那个动作里的。 */
export const poseToken = (emotion, pose = '') => (pose ? `${emotion}@${pose}` : String(emotion))
/** 同上，动作就是这个情绪的主动作时不写（同一张不会要两遍）。 */
export function tokenFor(sheet, emotion, pose = '', custom = []) {
  const home = pose && homePose(sheet, emotion, custom)
  return poseToken(emotion, home && home.id !== pose ? pose : '')
}
export function parseToken(token) {
  const text = String(token ?? '')
  const at = text.lastIndexOf('@')
  return at > 0 ? { emotion: text.slice(0, at), pose: text.slice(at + 1) } : { emotion: text, pose: '' }
}

/** 一张差分是在哪个动作上画的：新记录记 poseId；老记录里底图记 pose，换脸的记 face.pose。 */
export const recordPose = record => record?.poseId || record?.pose || record?.face?.pose || ''

/**
 * 「这个动作里的这个情绪」存在哪个编号（画、找都用它）。sheet 为 null（不分动作）时就是「…|情绪」。
 * 主动作里的那张是「…|情绪」，别的动作的是「…|情绪@动作」。「…|情绪」已经存着在别的动作上画的那张（后来主动作换了）时，
 * 主动作的这张也加 @，旧的那张留给它自己的动作用。老存档里没记动作、或者记的动作已经不在这套里的「…|情绪」，算主动作的。
 */
export function slotKey(sprites, look, sheet, pose, emotion, custom = []) {
  const bare = variantKey(look, emotion)
  if (!sheet?.poses?.length || !pose) return bare
  const home = homePose(sheet, emotion, custom)?.id
  const record = sprites?.[bare]
  const drawnIn = recordPose(record)
  if (record && drawnIn === pose) return bare
  if (pose !== home) return variantKey(look, emotion, pose)
  return !record || !drawnIn || !sheet.poses.some(p => p.id === drawnIn) ? bare : variantKey(look, emotion, pose)
}

/**
 * 剧场找「这个动作里的这个情绪」时依次看的编号：这个动作里的 → 主动作里的 → 别的动作里的 → 「…|情绪」和存着的其余 @ 那几张。
 * 给 pickSprite 的 keys 用：keys = emo => slotKeys(sprites, look, sheet, pose, emo, custom)。
 */
export function slotKeys(sprites, look, sheet, pose, emotion, custom = []) {
  const keys = []
  const add = k => { if (k && !keys.includes(k)) keys.push(k) }
  if (sheet?.poses?.length) {
    if (pose) add(slotKey(sprites, look, sheet, pose, emotion, custom))
    const home = homePose(sheet, emotion, custom)
    if (home) add(slotKey(sprites, look, sheet, home.id, emotion, custom))
    for (const p of posesWith(sheet, emotion)) add(slotKey(sprites, look, sheet, p.id, emotion, custom))
  }
  const bare = variantKey(look, emotion)
  add(bare)
  for (const k of Object.keys(sprites || {})) if (k.startsWith(bare + '@')) add(k)
  return keys
}

/**
 * 一套动作的「表」：每个情绪在哪几个动作里（界面的表格、补足所有表情用）。回 [{ pose, emotion, anchor }]，按动作、动作里的顺序。
 */
export function poseCells(sheet) {
  const out = []
  for (const pose of sheet?.poses || []) pose.emotions.forEach((emotion, i) => out.push({ pose: pose.id, emotion, anchor: i === 0 }))
  return out
}
