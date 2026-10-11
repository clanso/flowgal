// 音效库：导入（带描述文件）、去重、改、删；按正文给导演挑候选；导演配环境音和音效；剧场按拍放。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm, readdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createStore } from '../lib/dsh/store.js'
import { createSoundLib, soundCandidates, MAX_SFX_PER_TURN } from '../lib/soundlib.js'
import { readSoundSidecar, writeSoundSidecar, soundMatcher, SOUND_SIDECAR } from '../lib/soundlib-sidecar.js'
import { createApi } from '../lib/api.js'
import { normalizeScript, ambienceAfter, direct } from '../lib/director.js'
import { segmentTurn } from '../lib/segment.js'
import { buildBeats } from '../src/client/theater/playback.js'
import { DEFAULT_CONFIG, resolveConfig } from '../lib/config.js'

const OGG = Buffer.concat([Buffer.from('OggS'), Buffer.alloc(64, 3)])
const OGG2 = Buffer.concat([Buffer.from('OggS'), Buffer.alloc(80, 4)])

test('gate: 音效库：导入带上描述，没描述时名字取文件名、分类取文件夹；同一个文件再导入只更新描述；一次删一批连文件一起删', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'flowgal-soundlib-'))
  try {
    const lib = createSoundLib({ store: createStore(dir) })
    await assert.rejects(lib.add(Buffer.from('not audio at all'), 'x.ogg'), /认不出/)
    const plain = await lib.add(OGG, '门窗/敲门 木门 01.ogg')
    assert.deepEqual([plain.name, plain.kind, plain.category, plain.volume], ['敲门 木门 01', 'sfx', '门窗', 1])
    const rain = await lib.add(OGG2, '环境音/天气/小雨.ogg', { name: '小雨（打在窗上）', kind: 'ambience', category: ' 天气 / 雨 / 多余的一层', tags: '雨，下雨、窗', volume: 5, description: '细雨\u0007敲窗' })
    assert.deepEqual([rain.kind, rain.category, rain.tags, rain.volume, rain.description], ['ambience', '天气/雨', ['雨', '下雨', '窗'], 2, '细雨敲窗'])
    // 同路径同大小：不重复存，按新描述更新
    const again = await lib.add(OGG2, '环境音/天气/小雨.ogg', { tags: ['雨', '雨夜'] })
    assert.equal(again.id, rain.id)
    assert.deepEqual(again.tags, ['雨', '雨夜'])
    assert.equal((await lib.list()).length, 2)
    assert.equal((await readdir(join(dir, 'assets'))).length, 2)
    const edited = await lib.update(plain.id, { kind: 'loop?', category: '', name: '  ' })
    assert.deepEqual([edited.kind, edited.category, edited.name], ['sfx', '未分类', '敲门 木门 01'], '认不出的种类、空名字不改；空分类是未分类')
    assert.equal(await lib.remove([plain.id, rain.id, 'nope']), 2)
    assert.deepEqual(await lib.list(), [])
    assert.equal((await readdir(join(dir, 'assets'))).length, 0)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('gate: 描述文件：按离得最近的那一份、相对路径对上；没对上的去掉所选文件夹那一层；导出再读回不丢', () => {
  const top = readSoundSidecar(JSON.stringify({ format: 'flowgal-sounds', version: 1, sounds: [{ file: '音效/门窗/开门.ogg', name: '开门', kind: 'sfx', category: '门窗/开门', tags: ['开门'] }] }))
  const sub = readSoundSidecar(writeSoundSidecar([{ file: '雨/小雨.ogg', name: '小雨', kind: 'ambience', category: '天气/雨', description: '', tags: ['雨'], volume: 0.5 }, { file: '', name: '没有路径的不导出' }]))
  const match = soundMatcher([{ path: 'FlowGal素材/' + SOUND_SIDECAR, map: top }, { path: 'FlowGal素材/环境音/' + SOUND_SIDECAR, map: sub }])
  assert.deepEqual(match('FlowGal素材/音效/门窗/开门.ogg'), { file: '音效/门窗/开门.ogg', meta: { name: '开门', kind: 'sfx', category: '门窗/开门', tags: ['开门'] } })
  assert.deepEqual(match('FlowGal素材/环境音/雨/小雨.ogg').meta, { name: '小雨', kind: 'ambience', category: '天气/雨', description: '', tags: ['雨'], volume: 0.5 })
  assert.equal(match('FlowGal素材/环境音/雨/小雨.ogg').file, '雨/小雨.ogg')
  assert.deepEqual(match('FlowGal素材/别的/x.ogg'), { file: '别的/x.ogg', meta: null })
  assert.throws(() => readSoundSidecar('{"tracks":[]}'), /不是 FlowGal 的音效描述文件/)
})

const S = (id, kind, category, name, tags = [], description = '') => ({ id, kind, category, name, tags, description })

test('gate: 给导演挑候选：标签、名字、分类在正文里出现的才进，越长越靠前，每类有上限，上一幕的环境音一定在；库小时全给', () => {
  const sounds = [
    S('rain', 'ambience', '天气/雨', '小雨', ['雨', '下雨']),
    S('cicada', 'ambience', '自然/虫', '夏日蝉鸣', ['蝉', '蝉鸣', '夏天']),
    S('station', 'ambience', '城市/车站', '车站广播', ['车站', '站台', '电车']),
    S('door1', 'sfx', '门窗/开门', '推开木门', ['推开门', '开门', '门']),
    S('door2', 'sfx', '门窗/开门', '拉开拉门', ['拉门', '门']),
    S('door3', 'sfx', '门窗/开门', '开门 吱呀', ['门']),
    S('phone', 'sfx', '手机/震动', '手机震动', ['手机', '震动']),
    S('glass', 'sfx', '物品/玻璃', '杯子摔碎', ['杯子', '摔碎', '玻璃']),
  ]
  const text = '下雨了，雨下个不停。她推开门，手机在口袋里震动。蝉早就不叫了。'
  const all = soundCandidates(sounds, text)
  assert.equal(all.ambience.length, 3, '库小于名额时全给')
  const picked = soundCandidates(sounds, text, { sfx: 3, ambience: 2, perCategory: 2, keep: ['station'] })
  assert.deepEqual(picked.ambience.map(s => s.id), ['station', 'rain'], '上一幕的一定在，其余按得分')
  const ids = picked.sfx.map(s => s.id)
  assert.deepEqual(ids.slice(0, 2), ['door1', 'phone'], '推开门最具体排第一')
  assert.ok(['door2', 'door3'].includes(ids[2]) && ids.length === 3, '开门这一类最多两个；没提到的杯子不进')
})

test('gate: 导演配环境音和音效：编号 / none / keep 规整，中途换环境音一轮一次，音效只收库里的、一轮最多几个；库空时不写', async () => {
  const units = segmentTurn('雨下个不停。\n她推开门。\n“你来了。”\n手机震动了一下。\n雷声。\n杯子掉了。\n门又开了。\n有人敲窗。\n风更大了。')
  const sfxIds = ['door', 'phone', 'thunder', 'glass', 'knock', 'wind']
  const raw = {
    scene: { amb: 'rain' },
    lines: [{ u: 'U2', sfx: 'door' }, { u: 'U3', sfx: 'ghost', amb: 'rain' }, { u: 'U4', sfx: 'phone', amb: 'storm' }, { u: 'U5', sfx: 'thunder', amb: 'rain' },
      { u: 'U6', sfx: 'glass' }, { u: 'U7', sfx: 'door' }, { u: 'U8', sfx: 'knock' }, { u: 'U9', sfx: 'wind' }],
  }
  const s = normalizeScript(raw, units, { ambienceIds: ['rain', 'storm'], sfxIds })
  assert.equal(s.scene.amb, 'rain')
  assert.equal(s.lines.U3.sfx, undefined, '库里没有的音效丢掉')
  assert.equal(s.lines.U3.amb, undefined, '换成同一个不算换')
  assert.equal(s.lines.U4.amb, 'storm')
  assert.equal(s.lines.U5.amb, undefined, '一轮只换一次')
  assert.equal(ambienceAfter(s), 'storm')
  assert.equal(Object.values(s.lines).filter(l => l.sfx).length, MAX_SFX_PER_TURN)
  assert.equal(s.lines.U9.sfx, undefined, '超出的按正文顺序丢掉后面的')
  // keep、乱写沿用上一幕结束时的；上一幕的被删了就不沿用
  assert.equal(normalizeScript({ scene: { amb: 'keep' } }, units, { previous: s, ambienceIds: ['storm'] }).scene.amb, 'storm')
  assert.equal(normalizeScript({ scene: {} }, units, { previous: s, ambienceIds: ['rain'] }).scene.amb, '')
  assert.equal(normalizeScript({ scene: { amb: 'none' } }, units, { previous: s, ambienceIds: ['rain'] }).scene.amb, 'none')
  const none = normalizeScript(raw, units, {})
  assert.equal(none.scene.amb, undefined)
  assert.equal(none.lines.U2.sfx, undefined)

  // 提示词里只有按正文挑出的候选，和上一幕的环境音
  const prompts = []
  const llm = { stream(request) { prompts.push(request); return (async function* () { yield { type: 'text-delta', text: '{"scene":{"amb":"keep"},"lines":[{"u":"U2","sfx":"door"}]}' }; yield { type: 'finish', reason: { kind: 'stop' } } })() } }
  const many = [
    { id: 'storm', kind: 'ambience', category: '天气/雨', name: '暴雨', tags: ['雨', '暴雨'] },
    { id: 'door', kind: 'sfx', category: '门窗/开门', name: '推开门', tags: ['推开门', '门'], description: '木门被推开，吱呀一声' },
    ...Array.from({ length: 60 }, (_, i) => ({ id: 'x' + i, kind: 'sfx', category: '无关/' + i, name: '无关' + i, tags: ['不会出现的词' + i] })),
  ]
  const out = await direct({ llm, provider: 'fake', model: 'fake-1', units, previous: s, castList: [], context: {}, config: DEFAULT_CONFIG, backend: 'novelai', sounds: many })
  const user = prompts[0].messages.map(m => JSON.stringify(m)).join('')
  assert.match(user, /【音效库候选】/)
  assert.match(user, /door｜推开门｜门窗\/开门｜木门被推开，吱呀一声/)
  assert.doesNotMatch(user, /无关1\b/)
  assert.match(user, /上一幕结束时的环境音：storm（暴雨）/)
  assert.equal(out.script.scene.amb, 'storm')
  assert.equal(out.script.lines.U2.sfx, 'door')
  prompts.length = 0
  await direct({ llm, provider: 'fake', model: 'fake-1', units, previous: null, castList: [], context: {}, config: DEFAULT_CONFIG, backend: 'novelai', sounds: [] })
  assert.doesNotMatch(JSON.stringify(prompts[0]), /音效库候选/)
})

test('gate: 剧场每一拍带着当前的环境音（没整理的轮次沿用）和这句的音效；环境音、剧情音效的开关和音量有默认值', () => {
  const unit = (id, text) => ({ id, type: 'narration', text })
  const view = {
    turns: [
      { turn: 1, units: [unit('U1', '一'), unit('U2', '二')], script: { scene: { location: '车站', amb: 'station' }, lines: { U2: { amb: 'rain', sfx: 'door' } } } },
      { turn: 2, units: [unit('U1', '三')], script: null },
      { turn: 3, units: [unit('U1', '四')], script: { scene: { location: '家', amb: 'none' }, lines: {} } },
    ],
  }
  const { beats } = buildBeats(view)
  assert.deepEqual(beats.map(b => b.amb), ['station', 'rain', 'rain', 'none'])
  assert.deepEqual(beats.map(b => b.sfx), ['', 'door', '', ''])
  const ui = resolveConfig({ ui: { ambVolume: 9, storySfxVolume: -1, amb: 0 } }).ui
  assert.deepEqual([ui.amb, ui.ambVolume, ui.storySfx, ui.storySfxVolume], [false, 1, true, 0])
})

test('gate: 接口：导入时 meta 跟着 query 走，列表、改、整批删', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'flowgal-soundlib-'))
  try {
    const soundlib = createSoundLib({ store: createStore(dir) })
    const { call } = createApi({ engine: { subscribe() {} }, music: {}, soundlib })
    const meta = encodeURIComponent(JSON.stringify({ kind: 'ambience', category: '自然/虫', tags: ['蝉'] }))
    const { sound } = await call('POST', `/soundlib/upload?name=${encodeURIComponent('自然/蝉鸣.ogg')}&meta=${meta}`, OGG)
    assert.deepEqual([sound.kind, sound.category, sound.tags, sound.file], ['ambience', '自然/虫', ['蝉'], '自然/蝉鸣.ogg'])
    await assert.rejects(call('POST', '/soundlib/upload?name=x.ogg&meta=%7Bbad', OGG), /不是合法的 JSON/)
    await call('POST', '/soundlib', { action: 'update', id: sound.id, patch: { name: '盛夏蝉鸣' } })
    assert.equal((await call('GET', '/soundlib')).sounds[0].name, '盛夏蝉鸣')
    assert.equal((await call('POST', '/soundlib', { action: 'remove', ids: [sound.id] })).removed, 1)
    await assert.rejects(createApi({ engine: { subscribe() {} }, music: {} }).call('GET', '/soundlib'), /没有音效库/)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})
