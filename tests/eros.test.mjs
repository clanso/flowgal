// 亲密场面（R18）的声音与演出：节奏底、触手、一下一下的音效、高潮那一下。只给成年人之间的场面用，画面上不出字。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { normalizeScript, direct } from '../lib/director.js'
import { DEFAULT_CONFIG, resolveConfig } from '../lib/config.js'
import { DIRECTOR_EROS } from '../lib/prompts.js'
// 设置里限了数时（默认不限）
const MAX_SFX_PER_TURN = 6, MAX_EROS_SFX_PER_TURN = 14, MAX_PEAKS_PER_TURN = 6
import { ONOMATOPOEIA } from '../lib/foley.js'
import { EROS_FOLEY, EROS_SFX, EROS_ALIAS, EROS_LOOPS, TENTACLE_LOOPS, TENTACLE_SWAP, PEAK_FOLEY, PEAKS, EROS_PACES, TENTACLE, erosSfx, erosCue, peakOf } from '../lib/eros.js'
import { soundSeconds, bedLength, bedCandidates, soundLine, BED_MIN_SECONDS } from '../lib/soundlib.js'
import { buildBeats, beatHold, PEAK_LEAD_MS } from '../src/client/theater/playback.js'

const unitsOf = n => Array.from({ length: n }, (_, i) => ({ id: 'U' + (i + 1), type: 'narration', text: '句' + i }))
const beatsOf = (units, script, turn = 1) => ({ turns: [{ turn, textVersion: 'v1', units, script }], images: [] })

test('gate: 故事里写的音效提示（日文拟声、中文）认成亲密音效；普通的话不认', () => {
  const cues = {
    'ぬぷ……ずぷぷ……': '插入',
    '……こつん': '顶到最深',
    'どぷっ……どくっ、どくどくどくっ……': '射精',
    'ずるり、と。湿った音': '触手爬过',
    'ドサ、ドサ……': '倒下',
    '心音——どくん': '心跳',
    'しゅーっ': '喷雾',
    'ずちゅ、ずちゅっ': '抽插',
    '射精': '射精',
    '触手爬过': '触手爬过',
    '进入房间': '',
    '……ぴちゃ': '',
    '': '',
  }
  for (const [text, name] of Object.entries(cues)) assert.equal(erosSfx(text), name, text)
})

test('gate: 导演写的亲密音效照收（名字、日文拟声），跟普通音效分开算名额；高潮那一下认别的写法，也有上限', () => {
  const n = MAX_EROS_SFX_PER_TURN + MAX_SFX_PER_TURN + 4
  const units = unitsOf(n)
  const lines = units.map((u, i) => ({ u: u.id, sfx: i < MAX_EROS_SFX_PER_TURN + 2 ? (i % 2 ? '插入' : 'ずちゅ') : '砰' }))
  const script = normalizeScript({ scene: {}, cast: [], lines }, units, { limits: { sfx: MAX_SFX_PER_TURN, erosSfx: MAX_EROS_SFX_PER_TURN } })
  const kept = units.map(u => script.lines[u.id] && script.lines[u.id].sfx).filter(Boolean)
  assert.equal(kept.filter(s => EROS_SFX[s]).length, MAX_EROS_SFX_PER_TURN)
  assert.equal(kept.filter(s => ONOMATOPOEIA[s]).length, Math.min(MAX_SFX_PER_TURN, n - MAX_EROS_SFX_PER_TURN - 2))
  assert.deepEqual(['climax', '高潮', '絶頂', 'cum', '内射', 'both', '一起', 'nope', ''].map(peakOf), ['climax', 'climax', 'climax', 'cum', 'cum', 'both', 'both', '', ''])
  const many = unitsOf(MAX_PEAKS_PER_TURN + 2)
  const peaks = normalizeScript({ scene: {}, cast: [], lines: many.map(u => ({ u: u.id, peak: '高潮' })) }, many, { limits: { peaks: MAX_PEAKS_PER_TURN } })
  assert.equal(many.filter(u => peaks.lines[u.id] && peaks.lines[u.id].peak).length, MAX_PEAKS_PER_TURN)
})

test('gate: 写在不演的 [SE] 单元上的音效和高潮挪到后面第一句；场景的节奏和触手照收，乱写的丢掉', () => {
  const units = [{ id: 'U1', type: 'narration', text: '[SE：ぬぷ……ずぷぷ……]' }, { id: 'U2', type: 'narration', text: '一点点被撑开。' }, { id: 'U3', type: 'narration', text: '[SE：どくどく]' }, { id: 'U4', type: 'narration', text: '灌进来了。' }]
  const raw = { scene: { eros: 'slow', tentacle: 'writhe' }, cast: [], skip: ['U1', 'U3'], lines: [{ u: 'U1', sfx: 'ぬぷ' }, { u: 'U2', scene: { eros: 'fast', tentacle: 'nope' } }, { u: 'U3', sfx: '射精', peak: 'cum' }] }
  const script = normalizeScript(raw, units)
  assert.equal(script.scene.eros, 'slow')
  assert.equal(script.scene.tentacle, 'writhe')
  assert.equal(script.lines.U2.sfx, '插入')
  assert.deepEqual(script.lines.U2.scene, { eros: 'fast' })
  assert.equal(script.lines.U4.sfx, '射精')
  assert.equal(script.lines.U4.peak, 'cum')
  assert.equal(normalizeScript({ scene: { eros: 'wild' }, cast: [], lines: [] }, units).scene.eros, 'none')
})

test('gate: 节奏和触手换了地方就收起，不带到下一轮；高潮那一句等白光起来再出字（关了亲密场面就不等）', () => {
  const units = unitsOf(4)
  const first = normalizeScript({ scene: { location: '卧室', eros: 'slow', tentacle: 'idle' }, cast: [], lines: [{ u: 'U2', scene: { eros: 'frantic' }, peak: 'both' }, { u: 'U3', scene: { location: '走廊' } }] }, units)
  const second = normalizeScript({ scene: { location: '走廊' }, cast: [], lines: [] }, unitsOf(1))
  const { beats } = buildBeats({ turns: [{ turn: 1, textVersion: 'v1', units, script: first }, { turn: 2, textVersion: 'v1', units: unitsOf(1), script: second }], images: [] })
  assert.deepEqual(beats.map(b => [b.scene.eros, b.scene.tentacle]), [['slow', 'idle'], ['frantic', 'idle'], ['none', 'none'], ['none', 'none'], ['none', 'none']])
  assert.equal(beats[1].peak, 'both')
  const was = { place: '卧室' }
  assert.equal(beatHold(beats[1], { was }).ms, PEAK_LEAD_MS.both)
  assert.equal(beatHold(beats[1], { was, eros: false }).ms, 0)
  // 上一轮最后还在激烈，这一轮导演没再写：不带过来
  const carried = buildBeats({ turns: [{ turn: 1, textVersion: 'v1', units: unitsOf(1), script: normalizeScript({ scene: { eros: 'frantic' }, cast: [], lines: [] }, unitsOf(1)) }, { turn: 2, textVersion: 'v1', units: unitsOf(1), script: null }], images: [] })
  assert.deepEqual(carried.beats.map(b => b.scene.eros), ['frantic', 'none'])
})

test('gate: 每个亲密音效都有配方、导演的提示词里都列着，别名都指向有的名字，不跟内置拟声词撞名', () => {
  const waves = new Set(['sine', 'triangle', 'square', 'sawtooth', 'noise'])
  const parts = Object.values(EROS_FOLEY).flat()
  for (const p of parts) {
    assert.ok(waves.has(p.wave), p.wave)
    assert.ok(p.f > 0 && p.dur > 0 && p.gain > 0 && p.gain <= 4, JSON.stringify(p))
  }
  for (const [name, { id, group }] of Object.entries(EROS_SFX)) {
    assert.ok(EROS_FOLEY[id], name)
    assert.ok(group === 'body' || group === 'tentacle', name)
    assert.ok(DIRECTOR_EROS.includes(name), `提示词里没有「${name}」`)
    assert.ok(!ONOMATOPOEIA[name], `「${name}」跟内置拟声词撞了`)
  }
  for (const [alias, name] of Object.entries(EROS_ALIAS)) assert.ok(EROS_SFX[name], `${alias} → ${name}`)
  for (const pace of EROS_PACES.filter(k => k !== 'none')) assert.ok(DIRECTOR_EROS.includes(pace), pace)
  for (const kind of TENTACLE.filter(k => k !== 'none')) assert.ok(DIRECTOR_EROS.includes(kind), kind)
  for (const kind of PEAKS) { assert.ok(DIRECTOR_EROS.includes(kind), kind); for (const id of PEAK_FOLEY[kind]) assert.ok(EROS_FOLEY[id], id) }
  // 节奏底和触手用到的每一下都有配方
  for (const loop of Object.values(EROS_LOOPS)) for (const [id] of loop.hits) { assert.ok(EROS_FOLEY[id], id); assert.ok(!TENTACLE_SWAP[id] || EROS_FOLEY[TENTACLE_SWAP[id]], id) }
  for (const loop of Object.values(TENTACLE_LOOPS)) for (const [id] of loop.pool) assert.ok(EROS_FOLEY[id], id)
  // 节奏一级比一级快
  const beats = ['tease', 'slow', 'fast', 'frantic'].map(k => EROS_LOOPS[k].beat)
  assert.deepEqual([...beats].sort((a, b) => b - a), beats)
})

test('gate: 导演的提示词里放着亲密场面这一段；设置里关了就不放', async () => {
  const prompts = []
  const llm = { stream(request) { prompts.push(JSON.stringify(request)); return (async function* () { yield { type: 'text-delta', text: '{"scene":{"eros":"slow"},"lines":[{"u":"U1","sfx":"插入","peak":"climax"}]}' }; yield { type: 'finish', reason: { kind: 'stop' } } })() } }
  const args = { llm, provider: 'fake', model: 'fake-1', units: unitsOf(2), previous: null, castList: [], context: {}, backend: 'novelai' }
  const on = await direct({ ...args, config: DEFAULT_CONFIG })
  assert.match(prompts[0], /亲密场面的声音与演出/)
  assert.equal(on.script.scene.eros, 'slow')
  assert.deepEqual([on.script.lines.U1.sfx, on.script.lines.U1.peak], ['插入', 'climax'])
  assert.equal(resolveConfig({}).ui.eros, true)
  await direct({ ...args, config: resolveConfig({ ui: { eros: false } }) })
  assert.doesNotMatch(prompts[1], /亲密场面的声音与演出/)
})

// 玩家音效包里的亲密音效（名字、分类、描述末尾写着时长，跟 sfx-sort 整理出来的一样）
const PACK = [
  { id: 'kiss1', kind: 'sfx', name: '轻吻·啾 1', category: '亲密/接吻', description: '单次轻吻，嘴唇轻触后分开，短促清脆的“啾”（约 1 秒）', tags: ['轻吻', '亲吻', '接吻'] },
  { id: 'cum1', kind: 'sfx', name: '体内射精 1', category: '亲密/内射', description: '射在体内的噗啾喷射声，精液一股股涌出，湿黏（不到 1 秒）', tags: ['体内射精', '内射', '射精'] },
  { id: 'slow', kind: 'sfx', name: '抽插·慢速', category: '亲密/抽插', description: '缓慢节奏的交合抽插声，进出间隔明显（约 2.3 分钟）', tags: ['抽插', '慢速', '交合'] },
  { id: 'slow2', kind: 'sfx', name: '抽插·慢速 2', category: '亲密/抽插', description: '缓慢节奏的交合抽插声，长段持续（约 2.9 分钟）', tags: ['抽插', '慢速', '交合'] },
  { id: 'slowBin', kind: 'sfx', name: '抽插·慢速（黑耳）', category: '亲密/抽插', description: '缓慢的抽插交合声，节奏舒缓，带湿润黏腻水声；黑耳人头立体声录制（约 1.7 分钟）', tags: ['抽插', '慢速', '交合'] },
  { id: 'fast', kind: 'sfx', name: '抽插·快速', category: '亲密/抽插', description: '快速密集的交合抽插声，节奏激烈（约 2.3 分钟）', tags: ['抽插', '快速', '交合'] },
  { id: 'tent', kind: 'sfx', name: '触手抽插', category: '亲密/触手', description: '黏滑的触手在体内进出的咕啾声（约 24 秒）', tags: ['触手', '抽插', '黏液'] },
  { id: 'tentTap', kind: 'sfx', name: '触手黏液·噗啾', category: '亲密/触手', description: '触手挤出黏液的一下（约 2 秒）', tags: ['触手', '黏液'] },
  { id: 'rainLong', kind: 'sfx', name: '雨打窗户', category: '天气/雨', description: '雨点一直打在玻璃上（约 1 分钟）', tags: ['雨', '窗户'] },
  { id: 'nolen', kind: 'sfx', name: '床吱呀', category: '床铺/摇晃', description: '', tags: ['床', '吱呀'] },
  { id: 'blip', kind: 'blip', name: '女声哔哔', category: '打字音', description: '（约 30 秒）', tags: [] },
  // 放在环境音库里的循环：没写时长也算（环境音本来就是循环的底）
  { id: 'ambTent', kind: 'ambience', name: '触手巢穴', category: '异形/巢穴', description: '满屋子的触手一直在蠕动的湿黏声', tags: ['触手', '蠕动'] },
  { id: 'ambShort', kind: 'ambience', name: '水滴', category: '室内/水', description: '一滴水落下（约 2 秒）', tags: ['水滴'] },
]

test('gate: 音效包里的时长认得出：十秒以上的连续录音能当节奏底，单发的不能；给导演看的那一行截短时时长留着', () => {
  assert.deepEqual(['kiss1', 'cum1', 'slow', 'tent', 'tentTap', 'nolen'].map(id => soundSeconds(PACK.find(s => s.id === id))), [1, 1, 138, 24, 2, null])
  assert.deepEqual(PACK.filter(bedLength).map(s => s.id), ['slow', 'slow2', 'slowBin', 'fast', 'tent', 'rainLong', 'nolen', 'ambTent'], '没写时长的交给导演按名字判断；环境音库里的也算；打字音、写着很短的不算')
  assert.ok(BED_MIN_SECONDS >= 8)
  const long = { id: 'bin', name: '抽插·中速（黑耳）', category: '亲密/抽插', description: '中速稳定节奏的交合抽插声，湿润黏腻的水声一直在，偶尔有床的吱呀；黑耳人头立体声录制，适合戴耳机听（约 2.1 分钟）' }
  const line = soundLine(long)
  assert.match(line, /…（约 2\.1 分钟）$/)
  assert.equal(soundSeconds(long), 126)
  assert.ok(line.length < 100)
  assert.equal(soundLine(PACK[0]), '- kiss1｜轻吻·啾 1｜亲密/接吻｜单次轻吻，嘴唇轻触后分开，短促清脆的“啾”（约 1 秒）')
})

test('gate: 节奏底候选：按正文挑十秒以上的录音，同一种只列一段，音效候选里已经列了的（和同一种的）不重复；日常的段落不列', () => {
  const text = '他压着她慢速地抽插，触手也缠了上来。'
  const picked = bedCandidates(PACK, text).map(s => s.id)
  assert.ok(picked.includes('tent') && picked.includes('fast') && picked.includes('ambTent'), picked.join())
  assert.equal(picked.filter(id => id.startsWith('slow')).length, 1, '抽插·慢速、慢速 2、慢速（黑耳）是同一种')
  assert.ok(!picked.includes('tentTap') && !picked.includes('kiss1'), '单发的不列')
  assert.ok(!picked.includes('rainLong'), '正文没提的不列')
  const rest = bedCandidates(PACK, text, { shown: ['slow2', 'tent'] }).map(s => s.id)
  assert.ok(!rest.some(id => id.startsWith('slow') || id === 'tent'), rest.join())
  assert.deepEqual(bedCandidates(PACK, '下雨了，雨点打在窗户上。').map(s => s.id), ['rainLong'])
  assert.ok(erosCue(text) && erosCue('[SE：ずちゅんっ！ずちゅっ]') && erosCue('どぷっ……どくどく'))
  assert.ok(!erosCue('下雨了，雨点打在窗户上。') && !erosCue('她轻轻叹了口气，はぁ。'))
})

test('gate: 节奏底的录音（erosLoop）只收音效库里够长的，换档沿用、转进余韵或收起时跟着收起、写 none 回到合成的；换地方、下一轮都不带', () => {
  const units = unitsOf(9)
  const ids = { sfxIds: PACK.filter(s => s.kind === 'sfx').map(s => s.id), bedIds: PACK.filter(bedLength).map(s => s.id) }
  const raw = {
    scene: { location: '卧室', erosLoop: 'slow' },
    cast: [],
    lines: [
      { u: 'U2', scene: { eros: 'slow' } },
      { u: 'U3', scene: { eros: 'fast' } },
      { u: 'U4', scene: { eros: 'frantic', erosLoop: 'fast' } },
      { u: 'U5', scene: { eros: 'afterglow' }, peak: 'cum', sfx: 'cum1' },
      { u: 'U6', scene: { eros: 'slow', erosLoop: 'kiss1' } },
      { u: 'U7', scene: { erosLoop: 'tent', tentacle: 'writhe' } },
      { u: 'U8', scene: { erosLoop: 'none' } },
      { u: 'U9', scene: { location: '走廊', eros: 'tease' } },
    ],
  }
  const script = normalizeScript(raw, units, ids)
  assert.equal(script.scene.erosLoop, 'slow', '先写好录音、过几句才开始动的照收')
  assert.equal(script.lines.U5.sfx, 'cum1')
  assert.equal(script.lines.U6.scene.erosLoop, undefined, '一秒的单发不能当节奏底')
  assert.equal(script.lines.U8.scene.erosLoop, 'none')
  assert.equal(normalizeScript({ scene: { erosLoop: 'ghost' }, cast: [], lines: [] }, units, ids).scene.erosLoop, undefined)
  assert.equal(normalizeScript({ scene: { erosLoop: 'ambTent' }, cast: [], lines: [] }, units, ids).scene.erosLoop, 'ambTent', '环境音库里的循环也能当节奏底')
  // 亲密场面里配的库里的声音算进亲密音效的名额，不挤掉日常的音效名额
  const busy = normalizeScript({ scene: { eros: 'slow' }, cast: [], lines: units.map((u, i) => ({ u: u.id, sfx: i < 6 ? 'cum1' : 'kiss1', ...(i === 6 ? { scene: { eros: 'none' } } : {}) })) }, units, { ...ids, limits: { sfx: 1, erosSfx: 5 } })
  assert.deepEqual(units.map(u => busy.lines[u.id]?.sfx || ''), ['cum1', 'cum1', 'cum1', 'cum1', 'cum1', '', 'kiss1', '', ''])
  assert.equal(normalizeScript({ scene: { erosLoop: 'none' }, cast: [], lines: [] }, units, ids).scene.erosLoop, undefined)
  const next = normalizeScript({ scene: { location: '卧室', eros: 'slow' }, cast: [], lines: [] }, unitsOf(1), { ...ids, previous: script })
  const { beats } = buildBeats(beatsOf(units, script, 1).turns.concat({ turn: 2, textVersion: 'v1', units: unitsOf(1), script: next }).reduce((all, t) => ({ ...all, turns: [...all.turns, t] }), { turns: [], images: [] }))
  assert.deepEqual(beats.map(b => [b.scene.eros, b.scene.erosLoop || '']), [
    ['none', 'slow'], ['slow', 'slow'], ['fast', 'slow'], ['frantic', 'fast'], ['afterglow', ''], ['slow', ''],
    ['slow', 'tent'], ['slow', ''], ['tease', ''], ['slow', ''],
  ])
})

test('gate: 导演提示词里声音先用音效库：像亲密场面的一轮另列能当节奏底的长录音，日常的一轮不列；导演写的录音照收', async () => {
  const prompts = []
  const reply = '{"scene":{"eros":"slow","erosLoop":"slow"},"lines":[{"u":"U2","scene":{"eros":"fast","erosLoop":"fast"},"sfx":"cum1","peak":"cum"}]}'
  const llm = { stream(request) { prompts.push(JSON.stringify(request)); return (async function* () { yield { type: 'text-delta', text: reply }; yield { type: 'finish', reason: { kind: 'stop' } } })() } }
  // 库比候选名额大（这里名额设成 2）时，音效候选列不全的长录音另列在节奏底候选里；库小的时候全在音效候选里，不另列
  const config = resolveConfig({ director: { listen: false, soundCandidates: { sfx: 2 } } })
  const args = { llm, provider: 'fake', model: 'fake-1', previous: null, castList: [], context: {}, backend: 'novelai', sounds: PACK, config }
  const hot = [{ id: 'U1', type: 'narration', text: '他慢速地抽插起来。' }, { id: 'U2', type: 'narration', text: '越来越快，触手也缠了上来。' }]
  const out = await direct({ ...args, units: hot })
  const text = JSON.parse(prompts[0]).messages[0].content[0].text
  const beds = text.slice(text.indexOf('【节奏底候选】'), text.indexOf('亲密场面的声音与演出'))
  const sfx = text.slice(text.indexOf('音效（响一次）'), text.indexOf('音效规则'))
  assert.match(beds, /【节奏底候选】/)
  assert.match(beds, /- tent｜触手抽插/)
  for (const id of ['slow', 'slow2', 'slowBin', 'fast', 'tent']) assert.ok(!(sfx.includes(`- ${id}｜`) && beds.includes(`- ${id}｜`)), id + ' 两边重复列了')
  assert.doesNotMatch(beds, /tentTap|kiss1|rainLong/)
  assert.ok(text.includes('- ambTent｜触手巢穴') && !beds.includes('ambTent'), '环境音候选里列过的不在节奏底候选里重复')
  assert.match(text, /声音先用玩家音效库里的录音/)
  assert.equal(out.script.scene.erosLoop, 'slow')
  assert.equal(out.script.lines.U2.scene.erosLoop, 'fast')
  assert.deepEqual([out.script.lines.U2.sfx, out.script.lines.U2.peak], ['cum1', 'cum'])
  await direct({ ...args, units: [{ id: 'U1', type: 'narration', text: '早上好，今天也下雨了。' }] })
  assert.doesNotMatch(prompts[1], /【节奏底候选】/)
  await direct({ ...args, units: hot, config: resolveConfig({ director: { listen: false, soundCandidates: { sfx: 2 } }, ui: { eros: false } }) })
  assert.doesNotMatch(prompts[2], /节奏底/)
})
