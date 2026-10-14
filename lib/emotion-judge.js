// 情绪归类：导演造了情绪库里没有、也不是哪种近义词的情绪词时，交给导演用的那个模型判断——
// 画出来跟库里某一种几乎一样的，归进那一种（记成它的别名，之后写到它就用那张，不多画一张）；
// 确实画出来不一样的才新开一种（照以前进情绪库，只挂在用过它的角色下面）。
// 提示词在设置 →「提示词」→ 情绪归类里全文可见、能改（lib/prompt-book.js）；跑的过程记进导演日志。
import { runWriter } from './writer.js'
import { textOf, fillBook } from './prompt-book.js'
import { emotionBrief, emotionId, emotionEntry, resolveEmotion, isBuiltinEmotion, categoryOf, libOf } from './emotions.js'
import { speakersOf } from './vocab.js'

const clip = (value, n) => String(value ?? '').replace(/[\r\n\t]+/g, ' ').trim().slice(0, n)
/** 一个词最多列几句用到它的台词、每句多长。 */
const USES = 3
const USE_CHARS = 80

/** 库里能用的一种（内置的没删没停，新加的没并掉没停）：回编号，不能用回 ''。 */
function usable(value, lib) {
  const id = resolveEmotion(value, lib.list)
  if (!id) return ''
  if (isBuiltinEmotion(id)) { const e = emotionEntry(id, lib); return e.deleted || e.off ? '' : id }
  const own = lib.list.find(e => e.id === id && !e.mergedInto)
  return own && !own.off ? id : ''
}

/** 这一轮导演新造的词里，到现在还算新的（库里没有、也不是哪种的近义词或别名）。 */
export function newPhrases(entries, custom) {
  const lib = libOf(custom)
  const out = []
  for (const e of entries || []) {
    const id = emotionId(e?.name)
    if (!id || isBuiltinEmotion(id) || out.some(x => x.name === id)) continue
    if (resolveEmotion(id, lib.list) !== id || lib.list.some(x => x.id === id)) continue
    out.push({ name: id, base: e?.base || '', ...(e?.category ? { category: e.category } : {}) })
  }
  return out
}

/** 一个词在这一轮哪几句用到（说话的人、有反应的人），回 [{ who, text }]。units 是这一轮的单元（id、text）。 */
export function phraseUses(name, script, units = [], custom = []) {
  const list = libOf(custom).list
  const said = id => clip(units.find(u => u.id === id)?.text, USE_CHARS)
  const out = []
  for (const [id, line] of Object.entries(script?.lines || {})) {
    const same = emo => emo && (emo === name || resolveEmotion(emo, list) === name)
    if (same(line?.emo)) for (const who of speakersOf(line.sp)) out.push({ who, text: said(id) })
    for (const r of line?.react || []) if (same(r?.emo) && r.name && r.name !== '*') out.push({ who: r.name, text: said(id) })
    if (out.length >= USES) break
  }
  return out.slice(0, USES)
}

/**
 * 请模型给这几个新词归类。entries：newPhrases 的结果；custom：现在的情绪库；script、units：这一轮的剧本和单元（看用在哪几句）。
 * trace 照导演日志的形状记下提示词和每次尝试。
 * @returns {Promise<Map<string, { into: string } | { into: '', base: string, category: string, use: string }>>} 模型漏写的词不在里面（调用方照以前新开）
 */
export async function judgeEmotions({ llm, provider, model, config, entries, custom, script, units = [], signal, trace = {}, onProgress }) {
  const lib = libOf(custom)
  const verdicts = new Map()
  const label = id => (isBuiltinEmotion(id) ? `${id} ${emotionEntry(id, lib).label}` : id)
  const items = entries.map(e => ({ ...e, id: e.name }))
  const emotions = emotionBrief(lib, textOf(config, 'judge.emotions'), textOf(config, 'director.emotions.empty'), textOf(config, 'director.emotions.item'))
  await runWriter({
    llm, provider, model, config, signal, trace, onProgress, items,
    system: textOf(config, 'judge.system'),
    render: ({ list }) => fillBook(config, 'judge.user', {
      emotions,
      items: list.map(e => {
        const uses = phraseUses(e.name, script, units, lib)
        const near = usable(e.base, lib)
        return fillBook(config, 'judge.item', {
          name: e.name, base: near ? label(near) : '',
          uses: uses.length ? uses.map(u => fillBook(config, 'judge.use', u)).join('；') : textOf(config, 'judge.noUse'),
        })
      }).join('\n'),
    }),
    accept: json => {
      const got = []
      for (const v of Array.isArray(json?.emotions) ? json.emotions : []) {
        const item = items.find(t => t.name === emotionId(v?.name))
        if (!item || got.includes(item.id)) continue
        const into = usable(v?.into, lib)
        if (into && into !== item.name) verdicts.set(item.name, { into })
        else verdicts.set(item.name, { into: '', base: usable(v?.base, lib) || usable(item.base, lib), category: categoryOf(v?.category, lib) || '', use: clip(v?.use, 200) })
        got.push(item.id)
      }
      return got
    },
  })
  return verdicts
}
