// 28 种默认情绪：每张表都齐；近义词、「用在」、替身那一串；新造的词归进已有的一种（别名）、拆出来；
// 整张画的立绘锁住衣橱里这套衣服；表情默认整张画（老设置里没自己拨过的也改成整张画）。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  resolveEmotion, emotionEntry, emotionWords, emotionUse, emotionBrief, standIns, cleanWords, cleanEmotionLib,
  editEmotion, addEmotion, deleteEmotions, mergeInto, foldEmotion, splitEmotion, mergedFrom, BUILTIN_CATEGORY,
} from '../lib/emotions.js'
import { newPhrases, phraseUses } from '../lib/emotion-judge.js'
import { EMOTIONS, EMOTION_USE, EMOTION_WORDS, EMOTION_BASE, EMOTION_TAGS, EMOTION_ACTS, EMOTION_FACE, EMOTION_LEVEL, EMOTION_REACT, EMOTION_POSE } from '../lib/vocab.js'
import { spriteCharacterTags, wearTags } from '../lib/image/style.js'
import { resolveConfig } from '../lib/config.js'

const fresh = () => cleanEmotionLib({})
const ids = Object.keys(EMOTIONS)

test('emotions: 默认 28 种，每张表都齐；近义词不重复、不跟哪种的名字撞', () => {
  assert.equal(ids.length, 28)
  for (const [name, table] of Object.entries({ EMOTION_USE, EMOTION_WORDS, EMOTION_TAGS, EMOTION_ACTS, EMOTION_FACE, EMOTION_LEVEL, EMOTION_POSE, BUILTIN_CATEGORY })) {
    for (const id of ids) {
      if (id === 'neutral' && (name === 'EMOTION_ACTS' || name === 'BUILTIN_CATEGORY')) continue
      assert.ok(table[id], `${name} 缺 ${id}`)
    }
  }
  for (const id of ['disgust', 'wry', 'guilty', 'wronged', 'suspicious', 'passion']) assert.ok(EMOTION_REACT[id], `新加的 ${id} 没写反应动作`)
  // 每一类的代表（生气、担心、惊讶……）不写替身：没画好直接用平静
  for (const [id, base] of Object.entries(EMOTION_BASE)) assert.ok(ids.includes(id) && ids.includes(base) && base !== id, `${id} 的替身 ${base} 不在库里`)
  for (const id of ['angry', 'worried', 'surprised', 'tired', 'cold']) assert.deepEqual(standIns(id, fresh()), ['neutral'], id)
  const seen = new Map()
  const labels = new Set(Object.values(EMOTIONS))
  for (const [id, words] of Object.entries(EMOTION_WORDS)) {
    for (const w of words.split('、')) {
      assert.ok(!seen.has(w), `「${w}」同时是 ${seen.get(w)} 和 ${id} 的近义词`)
      assert.ok(!labels.has(w), `「${w}」跟一种情绪的名字撞了`)
      seen.set(w, id)
    }
  }
})

test('emotions: 近义词直接认成那一种；改过的近义词按改过的；停用的不认；库里有同名的那一条优先', () => {
  const lib = fresh()
  assert.equal(resolveEmotion('苦笑', lib), 'wry')
  assert.equal(resolveEmotion('憋屈', lib), 'wronged')
  assert.equal(resolveEmotion('面无表情', lib), 'neutral')
  editEmotion(lib, 'wry', { words: '没辙、拿你没办法' })
  assert.equal(resolveEmotion('苦笑', lib), '苦笑', '改掉的近义词不再认')
  assert.equal(resolveEmotion('拿你没办法', lib), 'wry')
  editEmotion(lib, 'wronged', { off: true })
  assert.equal(resolveEmotion('憋屈', lib), '憋屈', '停用的情绪，它的近义词导演写到了另外归类')
  addEmotion(lib, { name: '心神不宁', base: 'worried' })
  assert.equal(resolveEmotion('心神不宁', lib), '心神不宁', '你自己加了同名的一种，就是那一种')
  assert.doesNotMatch(emotionWords('worried', lib), /心神不宁/, '已经单独成一种的不算它的近义词')
  assert.match(emotionWords('worried', lib), /忐忑/)
})

test('emotions: 近义词整理：各种分隔都认、去重、去掉自己的名字；导演看的情绪库带「用在」和近义词', () => {
  assert.equal(cleanWords('苦笑，没辙；没辙 / 叹气|无奈\n认命', ['无奈', 'wry']), '苦笑、没辙、叹气、认命')
  const lib = fresh()
  editEmotion(lib, 'guilty', { use: '撒谎被拆穿的时候' })
  assert.equal(emotionUse('guilty', lib), '撒谎被拆穿的时候')
  const brief = emotionBrief(lib)
  assert.match(brief, /- guilty 心虚：用在撒谎被拆穿的时候；也叫 [^\n]*做贼心虚/)
  assert.match(brief, /- disgust 嫌弃：用在[^\n]+；也叫 [^\n]*鄙视/)
  deleteEmotions(lib, ['suspicious'])
  assert.doesNotMatch(emotionBrief(lib), /suspicious/, '删掉的不给导演看')
})

test('emotions: 替身那一串：替身写平静的直接用平静；别的一层层往回找，再到这一类的代表，最后平静', () => {
  const lib = fresh()
  assert.deepEqual(standIns('smile', lib), ['neutral'])
  assert.deepEqual(standIns('serious', lib), ['neutral'])
  assert.deepEqual(standIns('laugh', lib), ['happy', 'smile', 'neutral'])
  assert.deepEqual(standIns('wronged', lib), ['sad', 'worried', 'neutral'])
  assert.deepEqual(standIns('teasing', lib), ['smug', 'smile', 'neutral'], '调侃 → 得意 → 微笑（也是「喜」的代表）→ 平静')
  assert.deepEqual(standIns('guilty', lib), ['worried', 'scared', 'neutral'], '心虚 → 担心，再到「惧」的代表害怕')
  assert.deepEqual(standIns('passion', lib), ['love', 'shy', 'smile', 'neutral'])
})

test('emotions: 新造的词归进已有的一种记成别名（之后写到它就是那一种），拆出来单独成一种、替身是原来那个', () => {
  const lib = fresh()
  assert.equal(foldEmotion(lib, '强忍泪水', 'wronged', { source: 'judge', gameId: 'g', turn: 3 }), true)
  assert.equal(resolveEmotion('强忍泪水', lib), 'wronged')
  assert.deepEqual(mergedFrom('wronged', lib), ['强忍泪水'])
  assert.match(emotionWords('wronged', lib), /强忍泪水/, '导演看的情绪库里它算委屈的一个叫法')
  assert.equal(foldEmotion(lib, '强忍泪水', 'sad'), false, '已经归过的不再归')
  assert.equal(foldEmotion(lib, '苦笑', 'sad'), false, '本来就是近义词的不归')
  assert.equal(foldEmotion(lib, '咬牙', '不存在的情绪'), false, '只能归进库里有的')
  assert.equal(splitEmotion(lib, '强忍泪水'), '强忍泪水')
  const e = emotionEntry('强忍泪水', lib)
  assert.deepEqual([e.builtin, e.base, e.category, e.source, e.turn], [false, 'wronged', 'sorrow', 'director', 3])
  assert.equal(resolveEmotion('强忍泪水', lib), '强忍泪水')
  assert.deepEqual(standIns('强忍泪水', lib).slice(0, 2), ['wronged', 'sad'])
  assert.throws(() => splitEmotion(lib, 'wronged'), /并掉的新词/)
  mergeInto(lib, ['wronged'], 'sad')
  assert.throws(() => splitEmotion(lib, 'wronged'), /并掉的新词/, '内置的并掉了不能拆')
})

test('emotions: 这一轮新造的词里还算新的才交给模型归类；列出用到它的台词', () => {
  const lib = fresh()
  addEmotion(lib, { name: '笑里藏刀', base: 'smile' })
  const got = newPhrases([{ name: '强忍泪水', base: 'sad' }, { name: '苦笑', base: 'smile' }, { name: '笑里藏刀', base: 'smile' }, { name: 'happy' }, { name: '强忍泪水', base: 'cry' }], lib)
  assert.deepEqual(got, [{ name: '强忍泪水', base: 'sad' }])
  const script = { lines: { u1: { sp: '林岚', emo: '强忍泪水' }, u2: { sp: '苏晴', emo: 'smile', react: [{ name: '林岚', emo: '强忍泪水' }] } } }
  const units = [{ id: 'u1', text: '……没事。' }, { id: 'u2', text: '真的吗？' }]
  assert.deepEqual(phraseUses('强忍泪水', script, units, lib), [{ who: '林岚', text: '……没事。' }, { who: '林岚', text: '真的吗？' }])
})

test('sprites: 整张画锁住衣橱里这套衣服：设计师写成别的颜色的那一件去掉，画不到的鞋不带，长期状态照带', () => {
  const target = { outfitTags: 'white collared shirt, navy blue blazer, red plaid skirt, brown loafers', states: [{ name: '发带', tags: 'red hair ribbon' }] }
  const wear = wearTags(target)
  assert.equal(wear, 'white collared shirt, navy blue blazer, red plaid skirt, brown loafers, red hair ribbon')
  const person = { appearance: '1girl, long black hair, blue eyes', wear }
  const tags = spriteCharacterTags(person, '1girl, long black hair, blue shirt, navy blue blazer, black jacket, smile, looking at viewer', 'smile', { soften: false })
  const list = tags.split(', ')
  assert.ok(list.includes('white collared shirt') && list.includes('red plaid skirt') && list.includes('red hair ribbon'))
  assert.ok(!list.includes('brown loafers'), '立绘只画到大腿，鞋不带')
  assert.ok(!list.includes('blue shirt'), '衣橱里定了白衬衫，写成蓝衬衫的去掉')
  assert.ok(list.includes('black jacket'), '衣橱里没有的那一件不管（blazer 不等于 jacket）')
  assert.equal(list.filter(t => t === 'navy blue blazer').length, 1, '照抄的那件不重复')
  assert.ok(list.indexOf('white collared shirt') < list.indexOf('smile'), '衣服在表情前面')
  assert.equal(spriteCharacterTags({ appearance: 'long black hair' }, 'blue shirt, smile', 'smile', { soften: false }), 'long black hair, blue shirt, smile', '没锁衣服的照设计师写的')
})

test('config: 表情默认整张画；以前存着「只换脸」但没在新设置里自己拨过的，也改成整张画', () => {
  assert.equal(resolveConfig({}).images.faceSwap, false)
  assert.equal(resolveConfig({ images: { faceSwap: true } }).images.faceSwap, false, '老设置里的默认值不算自己选的')
  assert.equal(resolveConfig({ images: { faceSwap: true, faceSwapPicked: true } }).images.faceSwap, true)
  assert.equal(resolveConfig({ images: { faceSwap: false, faceSwapPicked: true } }).images.faceSwap, false)
  assert.equal(resolveConfig({}).director.judgeEmotions, true, '新造的词默认先归类')
  assert.equal(resolveConfig({ director: { judgeEmotions: false } }).director.judgeEmotions, false)
})
