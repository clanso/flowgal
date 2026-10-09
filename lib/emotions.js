// 情绪库：内置情绪（vocab.js 的 EMOTIONS，英文键）+ 导演和玩家新加的情绪。
// 新情绪用它的中文短语本身当键，可以是复合情绪（「带着烦躁思考」「苦闷地表白」）。
// 存在 $DSH_HOME/flowgal/emotions.json，所有对局共用；前后端共用这个文件里的纯函数。
import { EMOTIONS } from './vocab.js'

const LABEL_TO_KEY = new Map(Object.entries(EMOTIONS).map(([k, v]) => [v, k]))
export const MAX_EMOTION_CHARS = 16
/** 一轮最多新加这么多情绪，防止模型刷屏。 */
export const MAX_NEW_PER_TURN = 6

/** 规整一个情绪写法：内置键、内置中文名归到内置键；其余当作新情绪短语（去掉分隔符和引号，最多 16 字）。 */
export function emotionId(value) {
  const text = String(value ?? '').replace(/[|"“”'‘’\r\n\t]/g, '').trim().slice(0, MAX_EMOTION_CHARS)
  if (!text) return ''
  const lower = text.toLowerCase()
  if (EMOTIONS[lower]) return lower
  return LABEL_TO_KEY.get(text) || text
}

export const isBuiltinEmotion = id => Object.prototype.hasOwnProperty.call(EMOTIONS, id)
export const emotionLabel = id => (isBuiltinEmotion(id) ? EMOTIONS[id] : String(id || ''))

/** 情绪库里的一条：内置情绪没有存档，按需造出来。base 是新情绪最接近的内置情绪（立绘没画好时先用它）。 */
export function emotionEntry(id, custom = []) {
  if (isBuiltinEmotion(id)) return { id, label: EMOTIONS[id], desc: '', base: '', builtin: true }
  const found = custom.find(e => e.id === id)
  return found ? { ...found, label: found.id, base: found.base || '', builtin: false } : { id, label: id, desc: '', base: '', builtin: false }
}

/** 全部情绪（内置在前，新加的按加入先后），给人物志和设置页列出。 */
export function allEmotions(custom = []) {
  return [
    ...Object.keys(EMOTIONS).map(id => emotionEntry(id)),
    ...custom.filter(e => e && e.id && !isBuiltinEmotion(e.id)).map(e => emotionEntry(e.id, custom)),
  ]
}

/** 给导演看的情绪库：内置写「键 中文」，新加的写「短语：神情描述」。 */
export function emotionBrief(custom = []) {
  const builtin = Object.entries(EMOTIONS).map(([k, v]) => `${k} ${v}`).join('，')
  const extra = custom.filter(e => e && e.id && !isBuiltinEmotion(e.id)).map(e => `- ${e.id}${e.desc ? '：' + e.desc : ''}`)
  return `内置：${builtin}${extra.length ? '\n新加的（直接写原词）：\n' + extra.join('\n') : ''}`
}

/**
 * 把新情绪并进情绪库（原地修改 lib.list）。已有的只补上空着的描述，不覆盖。
 * @param {{ list: object[] }} lib
 * @param {{ name: string, desc?: string, base?: string }[]} entries
 * @returns {string[]} 真正新加的情绪
 */
export function mergeEmotions(lib, entries, meta = {}) {
  lib.list = Array.isArray(lib.list) ? lib.list : []
  const added = []
  for (const e of entries || []) {
    const id = emotionId(e?.name)
    if (!id || isBuiltinEmotion(id)) continue
    const desc = String(e?.desc || '').trim().slice(0, 200)
    const base = emotionId(e?.base)
    const found = lib.list.find(x => x.id === id)
    if (found) {
      if (!found.desc && desc) found.desc = desc
      if (!found.base && isBuiltinEmotion(base)) found.base = base
      continue
    }
    lib.list.push({ id, desc, base: isBuiltinEmotion(base) ? base : '', source: meta.source || 'director', at: Date.now(), ...(meta.gameId ? { gameId: meta.gameId, turn: meta.turn } : {}) })
    added.push(id)
  }
  return added
}
