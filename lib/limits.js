// 上限：默认都开到最高档（不限），玩家想限时在设置里填一个数。只有真有外部限制的地方才写死，并在那里写明为什么
// （NovelAI 一张插画最多 6 个角色块、步数最多 50、一个账号同时只能画一张）。
// 设置里存的值：null 是不限；数字是上限（0 也算一个数：一个都不要）。

/** 一个上限设置的值：没填、填坏了 → 不限（null）；数字取整、不小于 lo。 */
export function cleanLimit(value, lo = 0) {
  if (value === null || value === undefined || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? Math.max(lo, Math.trunc(n)) : null
}

/** 上限设置 → 能拿来比较的数：不限是 Infinity。 */
export const capOf = value => (value === null || value === undefined || !Number.isFinite(Number(value)) ? Infinity : Number(value))

/**
 * 导演每轮各种演出最多几次（设置 → 导演 → 每轮上限）。默认都不限：提示词里「只给真正需要的地方」那几句一直在，
 * 靠它让导演自己收着用；玩家填了数，这里按正文顺序只留前面那么多，提示词里也写上这个数。
 * was 是以前写死的数，设置里从「不限」改成限制时先填它。phrase 是提示词里写这个上限的那半句（不限时那半句空着）。
 */
export const DIRECTOR_LIMITS = [
  { key: 'cams', label: '镜头', unit: '次', was: 14, phrase: n => `一轮最多 ${n} 次，` },
  { key: 'hits', label: '打斗出手', unit: '次', was: 12, phrase: n => `一轮最多 ${n} 次，` },
  { key: 'moments', label: '小瞬间', unit: '个', was: 4, phrase: n => `一轮最多 ${n} 个，` },
  { key: 'phone', label: '手机', unit: '个', was: 8, phrase: n => `一轮最多 ${n} 个。` },
  { key: 'stress', label: '重音', unit: '处', was: 3, phrase: n => `一轮最多 ${n} 处，` },
  { key: 'pauses', label: '停顿', unit: '处', was: 6, phrase: n => `一轮最多 ${n} 处，` },
  { key: 'bgmSwaps', label: '转折点以外换歌', unit: '次', was: 1, phrase: n => `一轮最多再换 ${n} 次，` },
  { key: 'hush', label: '配乐留白', unit: '次', was: 2, phrase: n => `一轮最多 ${n} 次，` },
  { key: 'textFx', label: '文字效果', unit: '处', was: 16, phrase: n => `一轮最多 ${n} 处，` },
  { key: 'textFxPerLine', label: '一句里的文字效果', unit: '处', was: 2, phrase: n => `一句最多 ${n} 处，` },
  { key: 'ambSwaps', label: '变化点以外换环境音', unit: '次', was: 1, phrase: n => `一轮最多再换 ${n} 次，` },
  { key: 'sfx', label: '剧情音效', unit: '个', was: 6, phrase: n => `一轮最多 ${n} 个，` },
  { key: 'erosSfx', label: 'R18 音效', unit: '个', was: 14, phrase: n => `，一轮最多 ${n} 个` },
  { key: 'peaks', label: '高潮', unit: '次', was: 6, phrase: n => `；一轮最多 ${n} 次` },
  { key: 'newEmotions', label: '新造情绪', unit: '个', was: 6, phrase: n => `一轮最多新造 ${n} 个；` },
]

export const DEFAULT_DIRECTOR_LIMITS = Object.freeze(Object.fromEntries(DIRECTOR_LIMITS.map(l => [l.key, null])))

/** 设置里存的导演每轮上限：认得的键，null 不限、数字是上限。 */
export function cleanDirectorLimits(raw) {
  const src = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}
  return Object.fromEntries(DIRECTOR_LIMITS.map(l => [l.key, cleanLimit(src[l.key])]))
}

/** 导演每轮上限 → 能比较的数（不限是 Infinity），normalizeScript 用。 */
export const directorCaps = limits => Object.fromEntries(DIRECTOR_LIMITS.map(l => [l.key, capOf(limits?.[l.key])]))

/**
 * 提示词里的上限变量：{{camsLimit}} 这样，限了是「一轮最多 N 次，」这半句，不限是空的。
 * phrases：设置 →「提示词」里改过的那半句（{ cams: '一轮最多 {{n}} 次，' }，见 lib/prompt-words.js 的 director.limits）。
 */
export function limitPhrases(limits, phrases = null) {
  const caps = directorCaps(limits)
  const say = (l, n) => (typeof phrases?.[l.key] === 'string' ? phrases[l.key].replace(/\{\{n\}\}/g, String(n)) : l.phrase(n))
  return Object.fromEntries(DIRECTOR_LIMITS.map(l => [l.key + 'Limit', Number.isFinite(caps[l.key]) ? say(l, caps[l.key]) : '']))
}
