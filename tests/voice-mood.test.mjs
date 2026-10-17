// 情绪进声音：情绪 → 大类与强弱 → 音区（半音）、起伏、语速、音量和声音的质感（lib/voice-mood.js），打字音按它念。
import test from 'node:test'
import assert from 'node:assert/strict'
import { voiceMood, NEUTRAL_MOOD } from '../lib/voice-mood.js'
import { planLine, inferDelivery } from '../lib/typing.js'

const chars = s => Array.from(s)

test('gate: 没有情绪、平静：音区、起伏、语速、音量都不动', () => {
  for (const emo of ['', null, undefined, 'neutral', '平静']) {
    const m = voiceMood(emo)
    assert.equal(m.semis, 0, String(emo))
    assert.equal(m.range, 1)
    assert.equal(m.tempo, 1)
    assert.equal(m.gain, 1)
    assert.equal(m.sob, false)
  }
  assert.equal(NEUTRAL_MOOD.semis, 0)
})

test('gate: 难过类压低、放慢、变轻、带气声；哭比难过更重，还会哽一下', () => {
  const sad = voiceMood('sad')
  const cry = voiceMood('cry')
  assert.equal(sad.category, 'sorrow')
  assert.equal(cry.category, 'sorrow')
  assert.ok(sad.semis <= -1.5 && sad.semis >= -3, `难过低 1.5~3 个半音：${sad.semis}`)
  assert.ok(cry.semis < sad.semis, '哭（强弱 4）比难过（强弱 2）更低')
  assert.ok(sad.tempo > 1 && sad.gain < 1 && sad.range < 1 && sad.breath > 0)
  assert.equal(cry.sob, true)
  assert.equal(sad.sob, false)
  // 委屈（wronged）也算难过一类
  assert.equal(voiceMood('wronged').category, 'sorrow')
  // 写中文名字也认（内置情绪的名字、近义词）
  assert.equal(voiceMood('哭泣').category, 'sorrow')
  assert.equal(voiceMood('抽泣').category, 'sorrow')
})

test('gate: 喜、惊抬高、起伏大；倦、冷压低、起伏小；怒变响、起音变硬', () => {
  const happy = voiceMood('happy'), surprised = voiceMood('surprised'), tired = voiceMood('tired'), cold = voiceMood('cold'), angry = voiceMood('angry')
  assert.ok(happy.semis > 0 && happy.range > 1 && happy.tempo < 1)
  assert.ok(surprised.semis > happy.semis && surprised.range > happy.range)
  assert.ok(tired.semis < 0 && tired.range < 1 && tired.tempo > 1)
  assert.ok(cold.semis < 0 && cold.range < 1)
  assert.ok(angry.gain > 1.1 && angry.attack < 1)
  // 害怕会发颤
  assert.ok(voiceMood('scared').tremor > 0)
})

test('gate: 强弱跟着情绪库：表演设计师给这个人标的强弱优先', () => {
  const two = voiceMood('happy')
  const four = voiceMood('happy', [], { level: 4 })
  const one = voiceMood('happy', [], { level: 1 })
  assert.ok(four.semis > two.semis && two.semis > one.semis)
  assert.ok(four.range > two.range)
  // 情绪库里改了强弱的照库里的
  const lib = { list: [{ id: 'happy', builtin: true, level: 4 }] }
  assert.equal(voiceMood('happy', lib).semis, four.semis)
  // 表演设计师给这个人的这种情绪标了强弱（元气的人开心是 4，高冷的人是 1）
  const acting = { faces: { happy: { tags: 'smile', level: 4 }, sad: { level: 9 } } }
  assert.equal(voiceMood('开心', [], { acting }).semis, four.semis)
  assert.equal(voiceMood('sad', [], { acting }).semis, voiceMood('sad').semis, '标得不对的不算')
})

test('gate: 导演新造、没归类的情绪按字面认，几种情绪掺在一起时声音也掺在一起', () => {
  const sad = voiceMood('sad'), love = voiceMood('love'), happy = voiceMood('happy')
  const choked = voiceMood('哽咽着温柔')
  assert.deepEqual([...choked.cats].sort(), ['love', 'sorrow'])
  assert.ok(choked.semis < love.semis && choked.semis > sad.semis, '介于难过和温柔之间')
  assert.equal(choked.sob, true, '哽咽')
  const joyTears = voiceMood('喜极而泣')
  assert.deepEqual([...joyTears.cats].sort(), ['joy', 'sorrow'])
  assert.ok(joyTears.semis < happy.semis && joyTears.semis > sad.semis)
  assert.deepEqual([...voiceMood('温柔又偏执').cats].sort(), ['cold', 'love'])
  // 长的词先认：「惊恐」是怕，不是惊；「思念」是爱，不是思
  assert.deepEqual(voiceMood('惊恐万分').cats, ['fear'])
  assert.deepEqual(voiceMood('压抑的思念').cats, ['love'])
  // 前面带否定的不算
  assert.equal(voiceMood('一点也不开心').semis <= 0, true)
  assert.deepEqual(voiceMood('不开心').cats, [])
  // 完全认不出的照平常
  assert.equal(voiceMood('某种说不清的东西').semis, 0)
})

test('gate: 情绪库里归了类的新情绪按类别念，字面上另有的情绪只掺一半', () => {
  const lib = { list: [{ id: '强忍泪水微笑', base: 'sad', category: 'sorrow' }] }
  const m = voiceMood('强忍泪水微笑', lib)
  const sad = voiceMood('sad')
  assert.equal(m.category, 'sorrow')
  assert.ok(m.semis < 0, '主要还是难过')
  assert.ok(m.semis > sad.semis, '笑掺进来一点，比纯难过高一点')
  // 只有替身、没写类别的老存档跟着替身的类别
  assert.equal(voiceMood('偷偷抹泪', { list: [{ id: '偷偷抹泪', base: 'cry' }] }).category, 'sorrow')
  // 并进别的情绪的照并进去的那个
  assert.equal(voiceMood('失而复得地痛哭', { list: [{ id: '失而复得地痛哭', mergedInto: 'cry' }] }).sob, true)
})

test('gate: 打字音按情绪念：哭着说的整句压低、放慢、变轻；旁白不带情绪', () => {
  const plain = planLine(chars('好名字。'), 40, { type: 'dialogue' })
  const cry = planLine(chars('好名字。'), 40, { type: 'dialogue', emo: 'cry' })
  assert.ok(cry.blip.pitch < plain.blip.pitch * 0.85, `哭着说低三个半音以上：${cry.blip.pitch}`)
  assert.ok(cry.blip.gain < plain.blip.gain)
  assert.ok(cry.times.at(-1) > plain.times.at(-1), '说得慢一点')
  assert.equal(cry.mood.category, 'sorrow')
  const happy = planLine(chars('好名字。'), 40, { type: 'dialogue', emo: 'happy' })
  assert.ok(happy.blip.pitch > plain.blip.pitch)
  // 心声也带情绪，旁白不带
  assert.ok(planLine(chars('好名字。'), 40, { type: 'thought', emo: 'cry' }).blip.pitch < 1)
  const narr = planLine(chars('好名字。'), 40, { type: 'narration', emo: 'cry' })
  assert.equal(narr.blip.pitch, 1)
  assert.deepEqual(narr.times, planLine(chars('好名字。'), 40, { type: 'narration' }).times)
  // 剧场算好的情绪（带情绪库、带这个人的强弱）直接用
  const given = planLine(chars('好名字。'), 40, { type: 'dialogue', emo: 'cry', mood: voiceMood('happy', [], { level: 4 }) })
  assert.ok(given.blip.pitch > 1)
})

test('gate: 演法和情绪叠起来算，合起来最多偏七个半音', () => {
  const menaceSad = planLine(chars('你以为我会放过你吗'), 30, { say: 'menace', emo: 'cry' })
  const semis = 12 * Math.log2(menaceSad.blip.pitch)
  assert.ok(semis >= -7 - 1e-9, `威压 + 痛哭不低于七个半音：${semis}`)
  assert.ok(semis < 12 * Math.log2(planLine(chars('你以为我会放过你吗'), 30, { say: 'menace' }).blip.pitch), '比单是威压更低')
})

test('gate: 哭、委屈和难过一样，吞吞吐吐的省略号推断成迟疑', () => {
  assert.equal(inferDelivery('我没事……', 'sad'), 'hesitant')
  assert.equal(inferDelivery('我没事……', 'cry', 'dialogue', voiceMood('cry')), 'hesitant')
  assert.equal(inferDelivery('我没事……', 'wronged', 'dialogue', voiceMood('wronged')), 'hesitant')
  assert.equal(planLine(chars('我没事……'), 30, { emo: 'cry' }).say, 'hesitant')
  assert.equal(planLine(chars('我没事……'), 30, { emo: '哽咽着温柔' }).say, 'hesitant')
  // 没情绪、开心的照旧
  assert.equal(planLine(chars('我没事……'), 30, {}).say, '')
  assert.equal(planLine(chars('我没事……'), 30, { emo: 'happy' }).say, '')
})

test('gate: 设置里的「声音带情绪」：默认开、强度 1；关掉或强度 0 时打字音照旧；强度能放大到 2 倍', async () => {
  const { resolveConfig } = await import('../lib/config.js')
  const { scaleMood } = await import('../lib/voice-mood.js')
  const ui = resolveConfig({}).ui
  assert.equal(ui.voiceMood, true)
  assert.equal(ui.voiceMoodAmount, 1)
  assert.equal(resolveConfig({ ui: { voiceMood: false } }).ui.voiceMood, false)
  assert.equal(resolveConfig({ ui: { voiceMoodAmount: 9 } }).ui.voiceMoodAmount, 2)
  assert.equal(resolveConfig({ ui: { voiceMoodAmount: 'x' } }).ui.voiceMoodAmount, 1)
  const cry = voiceMood('cry')
  assert.equal(scaleMood(cry, 1), cry)
  assert.equal(scaleMood(cry, 0), NEUTRAL_MOOD)
  const half = scaleMood(cry, 0.5)
  assert.ok(Math.abs(half.semis - cry.semis / 2) < 1e-9)
  assert.ok(Math.abs(half.tempo - (1 + (cry.tempo - 1) / 2)) < 1e-9)
  assert.equal(half.sob, true)
  const double = scaleMood(cry, 2)
  assert.ok(double.semis < cry.semis && double.semis >= -4.5, '放大也夹在范围里')
  // 关掉之后跟改之前一模一样（旧的节奏和音高）
  const off = planLine(chars('我没事……'), 30, { emo: 'cry', mood: NEUTRAL_MOOD })
  const before = planLine(chars('我没事……'), 30, {})
  assert.deepEqual(off.times, before.times)
  assert.deepEqual(off.blip, before.blip)
})

test('gate: 声音的质感：气声叠一层轻的气息、起音按情绪变软变硬、发颤带一点颤音；平常的配方原样不动', async () => {
  const { shapeBlip } = await import('../lib/voice-mood.js')
  const parts = [{ wave: 'triangle', f: 420, dur: 0.05, gain: 0.045, attack: 0.004 }]
  assert.equal(shapeBlip(parts, NEUTRAL_MOOD), parts, '平常的原样返回（不新建，合成时用缓存）')
  assert.equal(shapeBlip(parts, null), parts)
  const sad = shapeBlip(parts, voiceMood('sad'))
  assert.ok(sad.length === 2 && sad[1].wave === 'noise', '叠一层气息')
  assert.ok(sad[1].gain < parts[0].gain * 0.5, '气息比字轻')
  assert.ok(sad[0].attack > parts[0].attack, '起音软一点')
  assert.ok(sad[0].dur > parts[0].dur, '尾巴长一点')
  const angry = shapeBlip(parts, voiceMood('angry'))
  assert.ok(angry[0].attack < parts[0].attack, '生气起音更硬')
  assert.equal(angry.length, 1, '不带气声')
  const scared = shapeBlip(parts, voiceMood('scared'))
  assert.ok(scared[0].vibrato > 0, '害怕发颤')
  // 本来就是噪声的配方（耳语、打字机）不再叠气息
  const whisper = [{ wave: 'noise', f: 1800, dur: 0.06, gain: 0.05, q: 3 }]
  assert.equal(shapeBlip(whisper, voiceMood('sad')).filter(p => p.wave === 'noise').length, 1)
  // 同一个情绪、同一份配方：给出同一份（缓存），不用每个字新建
  assert.equal(shapeBlip(parts, voiceMood('sad')), sad)
})

test('gate: 哭着说会哽一下：偶尔多停一拍，接着那个字声音一飘；同一句每次一样；不哭的不哽', () => {
  const text = '我一直都很想你，真的好想好想你，每天都在想你'
  const gapsOf = p => p.times.slice(1).map((t, i) => t - p.times[i])
  const cry = planLine(chars(text), 30, { emo: 'cry', seed: 'k' })
  const sad = planLine(chars(text), 30, { emo: 'sad', seed: 'k' })
  const base = cry.gap
  // 标点后的停顿另算：只看字和字之间
  const between = (p, g) => g.filter((x, i) => !/[，。]/u.test(chars(text)[i]))
  const hitches = between(cry, gapsOf(cry)).filter(g => g > base * 3)
  assert.ok(hitches.length >= 1 && hitches.length <= 3, `一句哽一到三下：${hitches.length}`)
  assert.equal(between(sad, gapsOf(sad)).filter(g => g > sad.gap * 3).length, 0, '难过（不到哭）不哽')
  assert.ok(cry.blips && cry.blips.some(b => b && b.gain < 1 && b.pitch > 1), '哽完那个字声音轻、往上飘')
  assert.deepEqual(planLine(chars(text), 30, { emo: 'cry', seed: 'k' }).times, cry.times)
  // 开头两个字不哽，太短的句子不哽
  assert.ok(gapsOf(cry).slice(0, 2).every(g => g <= base * 3))
  const short = planLine(chars('嗯'), 30, { emo: 'cry', seed: 'k' })
  assert.deepEqual(short.times, [0])
  // 旁白不哽
  assert.equal(planLine(chars(text), 30, { type: 'narration', emo: 'cry', seed: 'k' }).blips, null)
})
