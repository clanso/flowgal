// 我的配乐：曲库存取、导演选曲、剧场放曲、描述文件、Range 播放；以及 Key 的存取。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm, readdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createStore, sniffAudio } from '../lib/store.js'
import { createMusic, musicBrief } from '../lib/music.js'
import { normalizeScript, playingAfter, direct } from '../lib/director.js'
import { segmentTurn } from '../lib/segment.js'
import { readSidecar, writeSidecar, AUDIO_FILE, MUSIC_SIDECAR } from '../lib/music-sidecar.js'
import { createSecrets } from '../lib/secrets.js'
import { secretRef } from '../lib/image/index.js'
import { createRoutes, BASE } from '../lib/routes.js'
import { buildBeats, pickTrack } from '../src/client/theater/playback.js'
import { DEFAULT_CONFIG } from '../lib/config.js'

const MP3 = Buffer.concat([Buffer.from('ID3'), Buffer.alloc(64, 7)])
const tmp = () => mkdtemp(join(tmpdir(), 'flowgal-music-'))

test('gate: 配乐认文件头，不认扩展名', () => {
  assert.equal(sniffAudio(MP3), 'audio/mpeg')
  assert.equal(sniffAudio(Buffer.from([0xff, 0xfb, 0x90, 0x64, 0, 0, 0, 0, 0, 0, 0, 0])), 'audio/mpeg')
  assert.equal(sniffAudio(Buffer.from([0xff, 0xf1, 0x50, 0x80, 0, 0, 0, 0, 0, 0, 0, 0])), 'audio/aac')
  assert.equal(sniffAudio(Buffer.from('OggS\0\x02\0\0\0\0\0\0\0\0')), 'audio/ogg')
  assert.equal(sniffAudio(Buffer.from('RIFF\0\0\0\0WAVEfmt ')), 'audio/wav')
  assert.equal(sniffAudio(Buffer.from('fLaC\0\0\0\x22\0\0\0\0')), 'audio/flac')
  assert.equal(sniffAudio(Buffer.from('\0\0\0\x20ftypM4A \0\0\0\0')), 'audio/mp4')
  assert.equal(sniffAudio(Buffer.from('<html><body>hi</body></html>')), null)
  assert.ok(AUDIO_FILE.test('01 Central.MP3') && !AUDIO_FILE.test('cover.jpg') && !AUDIO_FILE.test(MUSIC_SIDECAR))
})

test('gate: 曲库：上传、同名同大小不重复存、改描述标签、删除连文件一起删', async () => {
  const dir = await tmp()
  try {
    const store = createStore(dir)
    const music = createMusic({ store })
    await assert.rejects(music.add(Buffer.from('not audio at all'), 'x.mp3'), /认不出/)
    const a = await music.add(MP3, '07 2:30 AM.mp3')
    assert.equal(a.name, '07 2:30 AM')
    assert.equal((await music.add(MP3, '07 2:30 AM.mp3')).id, a.id)
    const edited = await music.update(a.id, { name: '凌晨两点半', description: '合成器慢板，城市深夜独处', tags: '深夜，城市、 怀旧,深夜' })
    assert.equal(edited.name, '凌晨两点半')
    assert.deepEqual(edited.tags, ['深夜', '城市', '怀旧'])
    assert.equal((await music.list()).length, 1)
    assert.equal(musicBrief(await music.list()), `- ${a.id}｜凌晨两点半｜合成器慢板，城市深夜独处｜深夜、城市、怀旧`)
    assert.equal((await readdir(join(dir, 'assets'))).length, 1)
    await music.remove(a.id)
    assert.deepEqual(await music.list(), [])
    assert.equal((await readdir(join(dir, 'assets'))).length, 0)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('gate: 导演选曲：编号 / none / keep 规整，一轮最多换一次，没有曲库时不写配乐', async () => {
  const units = segmentTurn('雨下个不停。\n“你还在等吗？”林岚问。\n我没有回答。\n“那我先走了。”')
  const raw = { scene: { location: '车站', bgm: 'night' }, lines: [{ u: 'U2', bgm: 'rain' }, { u: 'U4', bgm: 'none' }, { u: 'U3', bgm: 'ghost' }] }
  const s = normalizeScript(raw, units, { trackIds: ['night', 'rain'] })
  assert.equal(s.scene.bgm, 'night')
  assert.equal(s.lines.U2.bgm, 'rain')
  assert.equal(s.lines.U3.bgm, undefined)
  assert.equal(s.lines.U4.bgm, undefined)
  assert.equal(playingAfter(s), 'rain')

  // keep、乱写都沿用上一幕结束时的曲子；上一幕的曲子被删了就不沿用。
  assert.equal(normalizeScript({ scene: { bgm: 'keep' } }, units, { previous: s, trackIds: ['night', 'rain'] }).scene.bgm, 'rain')
  assert.equal(normalizeScript({ scene: {} }, units, { previous: s, trackIds: ['night'] }).scene.bgm, '')
  assert.equal(normalizeScript({ scene: { bgm: 'none' } }, units, { previous: s, trackIds: ['rain'] }).scene.bgm, 'none')
  // 换回开场同一首不算换歌。
  assert.equal(normalizeScript({ scene: { bgm: 'rain' }, lines: [{ u: 'U2', bgm: 'rain' }] }, units, { trackIds: ['rain'] }).lines.U2.bgm, undefined)
  const none = normalizeScript(raw, units, {})
  assert.equal(none.scene.bgm, undefined)
  assert.equal(none.lines.U2.bgm, undefined)

  // 曲目表和「上一幕在放什么」写进用户提示词（自定义系统提示词时也在）。
  const prompts = []
  const llm = { stream(request) { prompts.push(request); return (async function* () { yield { type: 'text-delta', text: '{"scene":{"bgm":"keep"}}' }; yield { type: 'finish', reason: { kind: 'stop' } } })() } }
  const tracks = [{ id: 'rain', name: 'Neon Rain', description: '雨夜霓虹，慢速合成器', tags: ['雨', '夜'] }]
  const config = { ...DEFAULT_CONFIG, director: { ...DEFAULT_CONFIG.director, systemPrompt: '自定义：只输出 JSON' } }
  const out = await direct({ llm, provider: 'fake', model: 'fake-1', units, previous: s, castList: [], context: {}, config, backend: 'novelai', music: tracks })
  const user = JSON.stringify(prompts[0])
  assert.match(user, /【配乐曲库】/)
  assert.match(user, /rain｜Neon Rain｜雨夜霓虹，慢速合成器｜雨、夜/)
  assert.match(user, /上一幕结束时在放：rain（Neon Rain）/)
  assert.equal(out.script.scene.bgm, 'rain')
})

test('gate: 剧场放导演选的曲子，句中换歌从那句起生效，没整理的轮次沿用；没选过时按描述粗配', () => {
  const tracks = [
    { id: 'a', name: 'Club Ruby', description: '热闹的夜店，轻快的放克', tags: ['轻快', '夜'], assetId: 'a.mp3' },
    { id: 'b', name: 'Falling asleep to the sound of rain', description: '雨声与钢琴，感伤、安静', tags: ['雨', '感伤', '深夜'], assetId: 'b.mp3' },
  ]
  const url = id => '/asset?id=' + id
  const unit = (id, text) => ({ id, type: 'narration', text })
  const view = {
    turns: [
      { turn: 1, units: [unit('U1', '一'), unit('U2', '二')], script: { scene: { location: '酒吧', bgm: 'a' }, lines: { U2: { bgm: 'b' } } } },
      { turn: 2, units: [unit('U1', '三')], script: null },
      { turn: 3, units: [unit('U1', '四')], script: { scene: { location: '酒吧', bgm: 'none' }, lines: {} } },
    ],
  }
  const { beats } = buildBeats(view)
  assert.deepEqual(beats.map(b => b.bgm), ['a', 'b', 'b', 'none'])
  assert.equal(pickTrack(beats[0], tracks, url).url, '/asset?id=a.mp3')
  assert.equal(pickTrack(beats[2], tracks, url).id, 'b')
  assert.equal(pickTrack(beats[3], tracks, url), null)

  const rainy = { bgm: '', scene: { location: '公寓', mood: 'sad', time: 'midnight', weather: 'rain' } }
  assert.equal(pickTrack(rainy, tracks, url).id, 'b')
  assert.equal(pickTrack({ bgm: '', scene: { mood: 'silence' } }, tracks, url), null)
  assert.equal(pickTrack({ bgm: 'deleted', scene: { mood: 'cheerful', time: 'night' } }, tracks, url).id, 'a')
  assert.equal(pickTrack(rainy, [], url), null)
})

test('gate: 描述文件按文件名对上曲子，导出再读回不丢内容', () => {
  const text = writeSidecar([
    { file: '14 Neon Rain.mp3', name: 'Neon Rain', description: '雨夜霓虹', tags: ['雨', '夜'] },
    { file: '', name: '没有原文件名的不导出', description: '', tags: [] },
  ], '可以随便改')
  const data = JSON.parse(text)
  assert.equal(data.format, 'flowgal-music')
  assert.equal(data.tracks.length, 1)
  const map = readSidecar(text)
  assert.deepEqual(map.get('14 Neon Rain.mp3'), { name: 'Neon Rain', description: '雨夜霓虹', tags: ['雨', '夜'] })
  assert.throws(() => readSidecar('{"tracks":[]}'), /不是 FlowGal 的配乐描述文件/)
})

test('gate: /asset 支持 Range（Safari 放音频、拖进度条要用）', async () => {
  const data = Buffer.from('0123456789')
  const engine = { subscribe() {}, readAsset: async id => (id === 'x' ? { data, mediaType: 'audio/mpeg' } : null) }
  const route = createRoutes({ engine, music: {}, updater: {}, logger: {} }).find(r => r.path === BASE + '/asset')
  const hit = async (range, id = 'x') => {
    const res = { status: 0, headers: {}, body: null, writeHead(s, h = {}) { this.status = s; this.headers = h }, end(b) { this.body = b ? Buffer.from(b) : null } }
    await route.handler({ url: '/asset?id=' + id, headers: range ? { range } : {} }, res)
    return res
  }
  const full = await hit('')
  assert.equal(full.status, 200)
  assert.equal(full.headers['accept-ranges'], 'bytes')
  const part = await hit('bytes=2-4')
  assert.equal(part.status, 206)
  assert.equal(part.headers['content-range'], 'bytes 2-4/10')
  assert.equal(part.body.toString(), '234')
  assert.equal((await hit('bytes=7-')).body.toString(), '789')
  assert.equal((await hit('bytes=-3')).body.toString(), '789')
  assert.equal((await hit('bytes=20-')).status, 416)
  assert.equal((await hit('', 'nope')).status, 404)
})

test('gate: Key 存在凭据服务或 0600 文件里，清空后读不到', async () => {
  const dir = await tmp()
  try {
    const store = createStore(dir)
    const ref = secretRef('novelai', { novelai: { endpoint: 'official' } })
    assert.equal(ref, 'FLOWGAL_NOVELAI_OFFICIAL_KEY')
    const secrets = createSecrets({ store })
    await secrets.set(ref, 'file-key')
    assert.equal(await secrets.get(ref), 'file-key')
    await secrets.set(ref, '')
    assert.equal(await secrets.has(ref), false)

    // 有 DSH 凭据服务时存进去，文件里的副本清掉。
    await store.updateSecrets(s => { s[ref] = 'stale' })
    const vault = new Map()
    const credentials = { resolve: async name => ({ value: vault.get(name) || '' }), set: async (name, value) => { vault.set(name, value) } }
    const withVault = createSecrets({ store, getCredentials: () => credentials })
    await withVault.set(ref, 'vault-key')
    assert.equal(vault.get(ref), 'vault-key')
    assert.equal(await withVault.get(ref), 'vault-key')
    assert.deepEqual(await store.readSecrets(), {})
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})
