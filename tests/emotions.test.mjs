// 情绪库 2.0：内置情绪能改名、改类别、删、合并；类别和替身分开；导演、立绘、剧场都按改过的情绪库认情绪。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  resolveEmotion, emotionEntry, emotionLabel, allEmotions, usableEmotions, groupEmotions, emotionBrief, standIns, nearestOf, mergedFrom,
  emotionTags, emotionFace, emotionAct, cleanEmotionLib, mergeEmotions, personEmotions,
  editEmotion, resetEmotion, addEmotion, deleteEmotions, restoreBuiltins, mergeInto, renameEmotion,
  saveCategory, deleteCategory, orderCategories, resetCategories, followMerge, DEFAULT_CATEGORIES,
} from '../lib/emotions.js'
import { EMOTION_TAGS } from '../lib/vocab.js'
import { normalizeScript } from '../lib/director.js'
import { pickSprite, variantKey } from '../lib/look.js'

const fresh = () => cleanEmotionLib({})

test('emotions: 内置情绪改名只改显示的名字，编号不变；新名字、老名字都认得；恢复默认后条目去掉', () => {
  const lib = fresh()
  editEmotion(lib, 'smile', { label: '浅笑' })
  assert.equal(emotionLabel('smile', lib), '浅笑')
  assert.equal(resolveEmotion('浅笑', lib), 'smile')
  assert.equal(resolveEmotion('微笑', lib), 'smile', '老存档、导演写的默认名字照样对得上')
  assert.throws(() => editEmotion(lib, 'happy', { label: '浅笑' }), /重名/)
  assert.throws(() => editEmotion(lib, 'happy', { label: '生气' }), /重名/, '跟别的内置情绪的名字撞了')
  editEmotion(lib, 'smile', { tags: 'smile, closed mouth' })
  assert.equal(emotionEntry('smile', lib).tags, 'smile, closed mouth')
  assert.ok(emotionEntry('smile', lib).edited)
  resetEmotion(lib, 'smile')
  assert.equal(emotionLabel('smile', lib), '微笑')
  assert.equal(lib.list.length, 0, '什么都没改了就不留条目')
  // 改成跟默认一样也算没改
  editEmotion(lib, 'smile', { tags: EMOTION_TAGS.smile })
  assert.equal(lib.list.length, 0)
})

test('emotions: 平静不能删、不能停用、不能并掉，但能改名', () => {
  const lib = fresh()
  assert.throws(() => deleteEmotions(lib, ['neutral']), /平静不能删/)
  assert.throws(() => editEmotion(lib, 'neutral', { off: true }), /平静不能停用/)
  assert.throws(() => mergeInto(lib, ['neutral'], 'smile'), /平静不能并掉/)
  editEmotion(lib, 'neutral', { label: '面无表情' })
  assert.equal(emotionLabel('neutral', lib), '面无表情')
  assert.equal(resolveEmotion('面无表情', lib), 'neutral')
})

test('emotions: 删掉内置的能拿回来；删掉新情绪整条去掉；拿它当替身的空出来', () => {
  const lib = fresh()
  addEmotion(lib, { name: '强颜欢笑', base: 'laugh' })
  deleteEmotions(lib, ['laugh'])
  assert.ok(!allEmotions(lib).some(e => e.id === 'laugh'))
  assert.ok(allEmotions(lib, { withDeleted: true }).find(e => e.id === 'laugh').deleted)
  assert.equal(emotionEntry('强颜欢笑', lib).base, '', '替身被删了就空出来')
  assert.equal(nearestOf('强颜欢笑', lib), 'smile', '没替身时用它那一类（喜）的代表情绪')
  restoreBuiltins(lib)
  assert.ok(allEmotions(lib).some(e => e.id === 'laugh'))
  assert.ok(!lib.list.some(e => e.id === 'laugh'), '拿回来之后条目去掉')
  deleteEmotions(lib, ['强颜欢笑'])
  assert.ok(!lib.list.some(e => e.id === '强颜欢笑'))
})

test('emotions: 停用的导演不再用，界面照样列', () => {
  const lib = fresh()
  editEmotion(lib, 'pout', { off: true })
  assert.ok(allEmotions(lib).find(e => e.id === 'pout').off)
  assert.ok(!usableEmotions(lib).some(e => e.id === 'pout'))
  assert.doesNotMatch(emotionBrief(lib), /pout/)
  editEmotion(lib, 'pout', { off: false })
  assert.match(emotionBrief(lib), /pout 赌气/)
})

test('emotions: 类别和替身分开：类别只管整理，替身可以是库里任何一种情绪，不能绕回自己', () => {
  const lib = fresh()
  addEmotion(lib, { name: '偷偷开心', category: 'shy' })
  addEmotion(lib, { name: '憋笑', base: '偷偷开心' })
  assert.equal(emotionEntry('偷偷开心', lib).category, 'shy')
  assert.equal(emotionEntry('憋笑', lib).category, 'shy', '没给类别就跟着替身归类')
  editEmotion(lib, '憋笑', { category: 'joy' })
  assert.equal(emotionEntry('憋笑', lib).base, '偷偷开心', '类别和替身各管各的')
  editEmotion(lib, '偷偷开心', { base: 'smile' })
  assert.deepEqual(standIns('憋笑', lib), ['偷偷开心', 'smile', 'neutral'])
  assert.deepEqual(standIns('偷偷开心', lib), ['smile', 'shy', 'neutral'], '替身 → 它那一类的代表情绪 → 平静')
  assert.throws(() => editEmotion(lib, 'smile', { base: '憋笑' }), /绕回/)
  assert.throws(() => editEmotion(lib, '憋笑', { base: '憋笑' }), /绕回|它自己/)
  assert.throws(() => editEmotion(lib, '憋笑', { category: 'nope' }), /没有这个类别/)
  // tag 往替身上找：自己没写就用替身的；动作参考不找到平静
  assert.equal(emotionTags('憋笑', lib), EMOTION_TAGS.smile)
  editEmotion(lib, '偷偷开心', { tags: 'small smile, looking away' })
  assert.equal(emotionTags('憋笑', lib), 'small smile, looking away')
  assert.ok(emotionFace('憋笑', lib))
  addEmotion(lib, { name: '发呆' })
  assert.equal(emotionAct('发呆', lib), '')
})

test('emotions: 合并：并掉的跟到并进去的那个，留作别名；谁用过并过去；拿它当替身的改指过去', () => {
  const lib = fresh()
  mergeEmotions(lib, [{ name: '带着烦躁思考', base: 'thinking' }, { name: '烦躁地想', base: 'thinking' }, { name: '若有所思' }], { gameId: 'g', turn: 2 })
  noteWho(lib, '带着烦躁思考', ['林岚'])
  noteWho(lib, '烦躁地想', ['苏晴'])
  addEmotion(lib, { name: '想不通', base: '烦躁地想' })
  const from = mergeInto(lib, ['烦躁地想', '若有所思'], '带着烦躁思考')
  assert.deepEqual(from, ['烦躁地想', '若有所思'])
  assert.equal(resolveEmotion('烦躁地想', lib), '带着烦躁思考')
  assert.deepEqual(mergedFrom('带着烦躁思考', lib).sort(), ['烦躁地想', '若有所思'].sort())
  assert.deepEqual(emotionEntry('带着烦躁思考', lib).who.sort(), ['林岚', '苏晴'].sort())
  assert.equal(emotionEntry('想不通', lib).base, '带着烦躁思考')
  assert.ok(!allEmotions(lib).some(e => e.id === '烦躁地想'), '并掉的不再单独列')
  // 并掉的那些以前画好的立绘，并进去的那个没画时先用
  assert.deepEqual(standIns('带着烦躁思考', lib).slice(0, 3), ['烦躁地想', '若有所思', 'thinking'])
  // 内置的并掉：标成删掉，「恢复内置情绪」不会把它拿回来
  mergeInto(lib, ['serious'], 'thinking')
  assert.equal(resolveEmotion('serious', lib), 'thinking')
  restoreBuiltins(lib)
  assert.ok(!allEmotions(lib).some(e => e.id === 'serious'))
  // 再并一层也跟得到
  mergeInto(lib, ['带着烦躁思考'], 'thinking')
  assert.equal(resolveEmotion('烦躁地想', lib), 'thinking')
})

function noteWho(lib, id, who) { lib.list.find(e => e.id === id).who = who }

test('emotions: 新情绪改名等于并进新名字：来源、谁用过都留着，旧名字认得', () => {
  const lib = fresh()
  mergeEmotions(lib, [{ name: '苦笑', base: 'smile' }], { gameId: 'g', turn: 3 })
  noteWho(lib, '苦笑', ['林岚'])
  const next = renameEmotion(lib, '苦笑', '无奈地苦笑')
  assert.equal(next, '无奈地苦笑')
  const e = emotionEntry('无奈地苦笑', lib)
  assert.equal(e.source, 'director')
  assert.deepEqual(e.who, ['林岚'])
  assert.equal(e.base, 'smile')
  assert.equal(resolveEmotion('苦笑', lib), '无奈地苦笑')
  assert.throws(() => renameEmotion(lib, '无奈地苦笑', '微笑'), /已经有/)
})

test('emotions: 导演新造的情绪：替身可以是库里的新情绪，类别跟着替身', () => {
  const lib = fresh()
  addEmotion(lib, { name: '偷偷开心', category: 'shy' })
  mergeEmotions(lib, [{ name: '偷偷开心又不敢说', base: '偷偷开心' }, { name: '乱写替身', base: '不存在的' }])
  assert.equal(emotionEntry('偷偷开心又不敢说', lib).base, '偷偷开心')
  assert.equal(emotionEntry('偷偷开心又不敢说', lib).category, 'shy')
  assert.equal(emotionEntry('乱写替身', lib).base, '')
  // 老存档：只有 base（内置的），类别跟着它
  const old = cleanEmotionLib({ list: [{ id: '烦躁', base: 'angry', desc: '咬牙' }] })
  assert.equal(emotionEntry('烦躁', old).category, 'anger')
  assert.equal(emotionEntry('烦躁', old).desc, undefined, '老存档的描述不再带出来')
})

test('emotions: 类别能加、改名、换代表情绪、排顺序、删、恢复默认；导演看的情绪库按类别列', () => {
  const lib = fresh()
  const id = saveCategory(lib, { label: '欲' })
  addEmotion(lib, { name: '情欲难耐', category: id })
  saveCategory(lib, { id, rep: '情欲难耐' })
  assert.throws(() => saveCategory(lib, { label: '喜' }), /已经有/)
  saveCategory(lib, { id: 'joy', label: '乐' })
  orderCategories(lib, [id, 'joy'])
  assert.deepEqual(lib.categories.slice(0, 2).map(c => c.label), ['欲', '乐'])
  editEmotion(lib, 'smile', { label: '浅笑' })
  const brief = emotionBrief(lib)
  assert.ok(brief.indexOf('【欲】情欲难耐') < brief.indexOf('【乐】smile 浅笑'), brief)
  addEmotion(lib, { name: '想入非非', category: id })
  assert.deepEqual(standIns('想入非非', lib), ['情欲难耐', 'neutral'])
  deleteCategory(lib, id)
  assert.equal(emotionEntry('情欲难耐', lib).category, '')
  assert.match(emotionBrief(lib), /【未分类】情欲难耐，想入非非/)
  deleteCategory(lib, 'joy')
  assert.equal(emotionEntry('smile', lib).category, '')
  assert.deepEqual(groupEmotions(allEmotions(lib), lib).at(-1).list.map(e => e.id).slice(0, 3), ['smile', 'happy', 'laugh'])
  resetCategories(lib)
  assert.deepEqual(lib.categories.map(c => c.id), DEFAULT_CATEGORIES.map(c => c.id))
  assert.equal(emotionEntry('smile', lib).category, '', '恢复类别不动情绪归哪一类')
  resetEmotion(lib, 'smile')
  assert.equal(emotionEntry('smile', lib).category, 'joy')
})

test('emotions: 人物志里删掉的内置情绪不再挂格子；并掉的新情绪画过的算到并进去的那个', () => {
  const lib = fresh()
  mergeEmotions(lib, [{ name: '苦笑' }, { name: '无奈' }])
  noteWho(lib, '苦笑', ['林岚'])
  deleteEmotions(lib, ['pout'])
  mergeInto(lib, ['苦笑'], '无奈')
  const ids = personEmotions('林岚', lib, { drawn: ['苦笑'] }).map(e => e.id)
  assert.ok(!ids.includes('pout'))
  assert.ok(ids.includes('无奈'))
  assert.ok(!ids.includes('苦笑'))
})

test('emotions: 合并后立绘跟过去：并进去的那个还没画就把图挪过去，动作与表情设计里也顶替它的位置', () => {
  const holder = {
    sprites: {
      'a|校服||苦笑': { assetId: 'img1', emotion: '苦笑', pose: 'daily' },
      'a|校服||无奈地笑': { assetId: 'img2', emotion: '无奈地笑', face: { from: 'a|校服||苦笑', anchor: '苦笑' } },
      'a|睡衣||苦笑': { assetId: 'img3', emotion: '苦笑' },
      'a|睡衣||无奈': { assetId: 'img4', emotion: '无奈' },
    },
    spriteStatus: { 'a|校服||苦笑': { status: 'done' } },
    acting: { poses: [{ id: 'p1', emotions: ['neutral', '苦笑'] }, { id: 'p2', emotions: ['无奈地笑'] }], faces: { 苦笑: { desc: '嘴角一扯', tags: 'wry smile' } } },
  }
  const moved = followMerge(holder, ['苦笑'], '无奈')
  assert.equal(moved, 1, '睡衣那套「无奈」已经有了，留着旧的不动')
  assert.equal(holder.sprites['a|校服||无奈'].assetId, 'img1')
  assert.equal(holder.sprites['a|校服||无奈'].emotion, '无奈')
  assert.ok(!holder.sprites['a|校服||苦笑'])
  assert.equal(holder.sprites['a|睡衣||苦笑'].assetId, 'img3')
  assert.deepEqual(holder.sprites['a|校服||无奈地笑'].face, { from: 'a|校服||无奈', anchor: '无奈' })
  assert.deepEqual(holder.spriteStatus, { 'a|校服||无奈': { status: 'done' } })
  assert.deepEqual(holder.acting.poses[0].emotions, ['neutral', '无奈'])
  assert.deepEqual(holder.acting.faces, { 无奈: { desc: '嘴角一扯', tags: 'wry smile' } })
})

test('emotions: 剧场找立绘按替身那一串往下找', () => {
  const look = { appearance: 'silver hair', outfit: '校服', states: [] }
  const lib = fresh()
  mergeEmotions(lib, [{ name: '苦笑' }, { name: '无奈', base: 'smile' }])
  mergeInto(lib, ['苦笑'], '无奈')
  // 别的对局里只画过以前的「苦笑」（合并时没挪过去）：「无奈」先用它
  const sprites = { [variantKey(look, '苦笑')]: { assetId: 'old' }, [variantKey(look, 'smile')]: { assetId: 'smile' } }
  assert.equal(pickSprite(sprites, look, '无奈', standIns('无奈', lib)), 'old')
  delete sprites[variantKey(look, '苦笑')]
  assert.equal(pickSprite(sprites, look, '无奈', standIns('无奈', lib)), 'smile')
  assert.equal(pickSprite(sprites, look, '无奈', 'smile'), 'smile', '只给一个替身也行（老写法）')
})

test('emotions: 导演写的情绪按情绪库收：停用的、删掉的不收，改过的名字、并掉的认成库里的那个', () => {
  const lib = fresh()
  editEmotion(lib, 'smile', { label: '浅笑' })
  editEmotion(lib, 'pout', { off: true })
  deleteEmotions(lib, ['laugh'])
  mergeEmotions(lib, [{ name: '苦笑' }, { name: '无奈' }])
  mergeInto(lib, ['苦笑'], '无奈')
  editEmotion(lib, '无奈', { off: false })
  const units = ['甲', '乙', '丙', '丁', '戊', '己'].map((text, i) => ({ id: 'U' + (i + 1), type: 'dialogue', speaker: '林岚', text }))
  const script = normalizeScript({
    scene: {}, cast: [{ name: '林岚' }],
    lines: [
      { u: 'U1', sp: '林岚', emo: '浅笑' },
      { u: 'U2', sp: '林岚', emo: 'pout' },
      { u: 'U3', sp: '林岚', emo: '大笑' },
      { u: 'U4', sp: '林岚', emo: '苦笑' },
      { u: 'U5', sp: '林岚', emo: '若有所思地叹气' },
      { u: 'U6', sp: '林岚', emo: 'thinking' },
    ],
    emotions: [{ name: '若有所思地叹气', base: '无奈' }, { name: '苦笑', base: 'smile' }],
  }, units, { emotions: lib })
  assert.equal(script.lines.U1.emo, 'smile')
  assert.equal(script.lines.U2.emo, undefined, '停用的不收')
  assert.equal(script.lines.U3.emo, undefined, '删掉的内置情绪不收')
  assert.equal(script.lines.U4.emo, '无奈', '并掉的认成并进去的那个')
  assert.equal(script.lines.U5.emo, '若有所思地叹气')
  assert.equal(script.lines.U6.emo, 'thinking')
  assert.deepEqual(script.emotions, [{ name: '若有所思地叹气', base: '无奈' }], '库里已有的（并掉的）不算新加的')
})

test('emotions: 给导演看的情绪库不带描述，按类别列，改过的名字照新的写', () => {
  const lib = cleanEmotionLib({ list: [{ id: '带着烦躁思考', base: 'thinking', desc: '皱眉撇嘴，手托下巴' }] })
  editEmotion(lib, 'thinking', { label: '琢磨' })
  const brief = emotionBrief(lib)
  assert.match(brief, /【思】serious 认真，thinking 琢磨，determined 坚定，带着烦躁思考/)
  assert.doesNotMatch(brief, /皱眉撇嘴/)
})
