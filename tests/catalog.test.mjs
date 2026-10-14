// 整理界面：曲库、音效库、环境音库的批量改分类 / 标签、分类改名（子分类跟着走）、批量删；曲库的分类（描述文件、导演看的曲目表、候选分组）。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm, readdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createStore } from '../lib/dsh/store.js'
import { createMusic, musicBrief, musicCandidates } from '../lib/music.js'
import { createSoundLib } from '../lib/soundlib.js'
import { readSidecar, writeSidecar } from '../lib/music-sidecar.js'
import { createApi } from '../lib/api.js'
import { underCategory, renameCategory, retag } from '../lib/catalog.js'

const MP3 = n => Buffer.concat([Buffer.from('ID3'), Buffer.alloc(64 + n, 7)])
const OGG = n => Buffer.concat([Buffer.from('OggS\0\x02\0\0\0\0\0\0\0\0'), Buffer.alloc(32 + n, 1)])
const tmp = () => mkdtemp(join(tmpdir(), 'flowgal-catalog-'))

test('gate: 分类改名连子分类、不碰名字只是前缀相同的；加标签不重复、去标签', () => {
  assert.ok(underCategory('日常/校园', '日常') && underCategory('日常', '日常'))
  assert.ok(!underCategory('日常生活', '日常') && !underCategory('日常', ''))
  assert.equal(renameCategory('日常/校园', '日常', '平常'), '平常/校园')
  assert.equal(renameCategory('日常/校园', '日常/校园', '学校'), '学校')
  assert.equal(renameCategory('日常生活', '日常', '平常'), null)
  assert.deepEqual(retag(['雨', '夜'], ['夜', '城市'], ['雨']), ['夜', '城市'])
})

test('gate: 曲库整理：分类最多两层、空的就是没分类；一批改分类、加去标签；分类改名子分类跟着走；一批删连文件', async () => {
  const dir = await tmp()
  try {
    const music = createMusic({ store: createStore(dir) })
    const { call } = createApi({ engine: { subscribe() {} }, music })
    const post = body => call('POST', '/music', body)
    const [a, b, c] = [await music.add(MP3(1), 'a.mp3'), await music.add(MP3(2), 'b.mp3'), await music.add(MP3(3), 'c.mp3')]
    assert.equal(a.category, '')
    assert.equal((await music.update(a.id, { category: ' 日常 / 校园 / 午后 ' })).category, '日常/校园', '多出来的层去掉')
    assert.equal((await music.update(a.id, { category: '' })).category, '', '空的就是没分类')
    assert.equal((await post({ action: 'update-many', ids: [a.id, b.id], patch: { category: '日常/校园', addTags: '雨、夜', name: '不许一起改名' } })).updated, 2)
    assert.equal((await post({ action: 'update-many', ids: [b.id, c.id], patch: { category: '日常', addTags: ['夜', '城市'], removeTags: ['雨'] } })).updated, 2)
    let list = await music.list()
    const byId = id => list.find(t => t.id === id)
    assert.deepEqual([byId(a.id).category, byId(a.id).tags, byId(a.id).name], ['日常/校园', ['雨', '夜'], 'a'])
    assert.deepEqual([byId(b.id).category, byId(b.id).tags], ['日常', ['夜', '城市']])
    assert.deepEqual([byId(c.id).category, byId(c.id).tags], ['日常', ['夜', '城市']])
    assert.equal((await post({ action: 'rename-category', from: '日常', to: '平常' })).renamed, 3)
    list = await music.list()
    assert.deepEqual(list.map(t => t.category).sort(), ['平常', '平常', '平常/校园'])
    await assert.rejects(post({ action: 'rename-category', from: '平常', to: ' / ' }), /不能是空的/)
    assert.equal((await post({ action: 'remove-many', ids: [a.id, c.id, 'nope'] })).removed, 2)
    assert.deepEqual((await music.list()).map(t => t.id), [b.id])
    assert.deepEqual(await readdir(join(dir, 'assets')), [b.assetId])
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('gate: 曲库分类进描述文件、导演看的曲目表；曲子多时按分类分组挑候选', () => {
  const tracks = [{ id: 'x', name: '雨夜', file: 'x.mp3', category: '日常/夜晚', description: '慢', tags: ['雨', '夜晚'] }, { id: 'y', name: '无题', file: 'y.mp3', description: '', tags: [] }]
  const back = readSidecar(writeSidecar(tracks))
  assert.equal(back.get('x.mp3').category, '日常/夜晚')
  assert.equal('category' in back.get('y.mp3'), false, '没分类的不写，读回来也不会把已有的分类清掉')
  assert.equal(musicBrief(tracks), '- x｜雨夜｜慢｜日常、夜晚、雨\n- y｜无题')
  const cats = ['日常', '恋爱', '悲伤', '战斗']
  const many = Array.from({ length: 100 }, (_, i) => ({ id: 't' + i, name: `曲${i}`, category: `${cats[i % 4]}/子${i % 3}`, tags: ['同一个标签'] }))
  const picked = musicCandidates(many, '没有关键词。', { limit: 20 })
  for (const cat of cats) assert.equal(picked.filter(t => t.category.startsWith(cat + '/')).length, 5, cat + ' 分到五首')
})

test('gate: 音效库整理：一批改种类 / 分类 / 音量 / 加去标签；分类改名只改给定的种类；改成空分类就是未分类', async () => {
  const dir = await tmp()
  try {
    const soundlib = createSoundLib({ store: createStore(dir) })
    const { call } = createApi({ engine: { subscribe() {} }, music: {}, soundlib })
    const post = body => call('POST', '/soundlib', body)
    const knock = await soundlib.add(OGG(1), '门窗/敲门.ogg', { tags: ['敲门'] })
    const door = await soundlib.add(OGG(2), '门窗/推拉/拉门.ogg')
    const wind = await soundlib.add(OGG(3), '门窗/风声.ogg', { kind: 'ambience' })
    assert.equal((await post({ action: 'update-many', ids: [knock.id, door.id], patch: { addTags: '门', volume: 2, name: 'x' } })).updated, 2)
    assert.equal((await post({ action: 'rename-category', from: '门窗', to: '家/门', kinds: ['sfx', 'blip'] })).renamed, 2)
    let list = await soundlib.list()
    const byId = id => list.find(s => s.id === id)
    assert.deepEqual([byId(knock.id).category, byId(knock.id).tags, byId(knock.id).volume, byId(knock.id).name], ['家/门', ['敲门', '门'], 2, '敲门'])
    assert.equal(door.category, '门窗/推拉', '没描述文件时分类取前两层文件夹')
    assert.equal(byId(door.id).category, '家/门', '「门窗/推拉」改成「家/门/推拉」，只留两层')
    assert.equal(byId(wind.id).category, '门窗', '环境音不在给定的种类里，不动')
    await post({ action: 'update-many', ids: [door.id], patch: { kind: 'blip', gender: 'male', category: '', removeTags: ['门'] } })
    list = await soundlib.list()
    assert.deepEqual([byId(door.id).kind, byId(door.id).gender, byId(door.id).category, byId(door.id).tags], ['blip', 'male', '未分类', []])
    assert.equal((await post({ action: 'rename-category', from: '门窗', to: '天气' })).renamed, 1, '不给种类时改全部')
    await assert.rejects(post({ action: 'rename-category', from: '', to: '天气' }), /不能是空的/)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})
