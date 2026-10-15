// 曲子多时选曲：听音师说这一轮该放什么样的音乐，候选照它去对标签、描述、曲名、分类（跟怎么分类没关系），最多占三分之二，
// 剩下的按分组轮流补；听音师没跑时上一幕的基调也参与对词；每轮候选数能调；导演日志记下每段配乐找到了哪些。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { musicCandidates, musicQuota, tagBrief, musicCategoryBrief, moodWords, MUSIC_CANDIDATES, MAX_MUSIC_CANDIDATES } from '../lib/music.js'
import { cleanHeard } from '../lib/soundlib.js'
import { direct, wantsListen } from '../lib/director.js'
import { segmentTurn } from '../lib/segment.js'
import { DEFAULT_CONFIG, resolveConfig } from '../lib/config.js'

const T = (id, category, name, tags, description = '') => ({ id, category, name, tags, description })
const MOODS = ['日常', '甜蜜', '感伤', '战斗', '悬疑', '壮阔']
// 按游戏分类的曲库：每个游戏里各种情绪都有；情绪只写在标签和描述里
const GAMES = ['地平线原声', '塞尔达原声', '女神异闻录原声']
const LIBRARY = [
  T('chase', '地平线原声', 'Machine Strike', ['紧张', '追逐', '快节奏'], '急促的鼓点，被机械兽追赶'),
  T('creep', '塞尔达原声', 'Shrine', ['神秘'], '低沉的弦乐，紧张不安，像有东西在暗处'),
  T('flee', '女神异闻录原声', 'Run', [], '一路狂奔的追逐戏，急促'),
  ...Array.from({ length: 150 }, (_, i) => T('t' + i, GAMES[i % 3], `曲${i}`, [MOODS[i % MOODS.length]], `${MOODS[i % MOODS.length]}的一首`)),
]
const TEXT = '身后传来金属摩擦的声音。\n她拉起他的手就跑，心跳快得要炸开。'
const units = segmentTurn(TEXT)
const BGM = cleanHeard({ bgm: [{ at: 'U1', what: '紧张的追逐', words: ['紧张', '追逐', '急促', '音乐'], cats: [] }] }, units).bgm

test('gate: 照听音师说的配乐找：标签、描述里有情绪词的先进，分类按游戏分也不影响；最多占三分之二，剩下的轮流补；上一幕的在最前', () => {
  assert.deepEqual(BGM[0].words, ['紧张', '追逐', '急促'], '「音乐」这种空词去掉')
  // 不带 heard：形状照旧，是数组；按游戏分组轮流挑，标签里没有正文的词，三首追逐曲大概率进不来
  const plain = musicCandidates(LIBRARY, TEXT, { limit: 30 })
  assert.ok(Array.isArray(plain) && plain.length === 30)
  const { tracks, found } = musicCandidates(LIBRARY, TEXT, { limit: 30, keep: 't5', heard: BGM })
  assert.equal(tracks.length, 30)
  assert.equal(tracks[0].id, 't5', '上一幕在放的一定在、在最前')
  assert.deepEqual(tracks.slice(1, 4).map(t => t.id).sort(), ['chase', 'creep', 'flee'], '标签对上的、只在描述里写着的都找得到')
  assert.deepEqual(found[0].slice(0, 3), ['chase', 'flee', 'creep'], '标签和描述都对上的最像')
  assert.equal(new Set(tracks.map(t => t.id)).size, 30, '不重复')
  assert.ok(found[0].length <= 20, '照听音师找的最多占三分之二')
  for (const mood of MOODS) assert.ok(tracks.some(t => t.tags[0] === mood), mood + ' 剩下的名额里各种情绪都有')
  // 曲库没超过名额：全给，found 照样算
  const small = musicCandidates(LIBRARY.slice(0, 10), TEXT, { heard: BGM })
  assert.equal(small.tracks.length, 10)
  assert.equal(small.found[0][0], 'chase')
})

test('gate: 听音师没跑时上一幕的基调也参与对词；候选数照设置、填坏了用默认；给听音师看的常用标签和分类', () => {
  assert.match(moodWords('tense'), /紧张/)
  const tense = musicCandidates(LIBRARY, moodWords('battle'), { limit: 12 })
  assert.ok(tense.filter(t => t.tags.includes('战斗')).length >= 3, '基调「激战」对上标着战斗的')
  assert.equal(musicQuota(null), MUSIC_CANDIDATES)
  assert.equal(MUSIC_CANDIDATES, 300, '默认按最高档给：300 首')
  assert.equal(musicQuota({ director: { musicCandidates: 999 } }), 999)
  assert.equal(musicQuota({ director: { musicCandidates: 99999 } }), MAX_MUSIC_CANDIDATES, '最多填到曲库上限（整张都给）')
  assert.equal(resolveConfig({ director: { musicCandidates: '120' } }).director.musicCandidates, 120)
  assert.equal(resolveConfig({ director: { musicCandidates: 0 } }).director.musicCandidates, MUSIC_CANDIDATES)
  assert.match(tagBrief(LIBRARY), /^(日常|甜蜜|感伤|战斗|悬疑|壮阔)、/, '用得多的标签在前')
  assert.equal(tagBrief(LIBRARY, 3).split('、').length, 3)
  assert.match(musicCategoryBrief(LIBRARY), /地平线原声；/)
  assert.equal(musicCategoryBrief([T('a', '', 'a', [])]), '')
})

test('gate: 曲子比候选多时先听一遍：听音师看到曲库的分类和常用标签，导演的曲目表里有它找到的；日志记下配乐找到了哪些；曲子不多时告诉它不用找', async () => {
  const calls = []
  const llm = {
    stream(request) {
      calls.push(request)
      const isListen = String(request.system || '').includes('你是视觉小说的拟音师')
      const text = isListen ? JSON.stringify({ amb: [], sfx: [], bgm: [{ at: 'U1', what: '紧张的追逐', words: ['紧张', '追逐', '急促'], cats: [] }] }) : '{"scene":{"bgm":"chase"},"lines":[]}'
      return (async function* () { yield { type: 'text-delta', text }; yield { type: 'finish', reason: { kind: 'stop' } } })()
    },
  }
  const userOf = request => request.messages[0].content[0].text
  const previous = { scene: { location: '废墟', time: 'night', weather: 'clear', mood: 'tense' }, lines: [] }
  const trace = {}
  // 默认 300 首，这个 153 首的曲库导演全看得到；调成 60 首才超
  const config = resolveConfig({ director: { musicCandidates: 60 } })
  assert.equal(wantsListen(DEFAULT_CONFIG, [], LIBRARY), false, '默认 300 首，曲库没超就不用为配乐先听')
  assert.equal(wantsListen(config, [], LIBRARY), true, '只有曲库超了也要先听')
  assert.equal(wantsListen(config, [], LIBRARY.slice(0, 10)), false)
  assert.equal(wantsListen(resolveConfig({ director: { musicCandidates: 200 } }), [], LIBRARY), false)
  await direct({ llm, provider: 'fake', model: 'fake-1', units, previous, castList: [], context: {}, config, backend: 'novelai', music: LIBRARY, trace })
  assert.equal(calls.length, 2)
  const listenUser = userOf(calls[0])
  assert.match(listenUser, /【上一幕结束时】废墟 夜 基调紧张/)
  assert.match(listenUser, /【曲库】\n分类：(地平线原声|塞尔达原声|女神异闻录原声)；/)
  assert.match(listenUser, /常用标签：.*战斗/)
  const director = userOf(calls[1])
  const music = director.slice(director.indexOf('【配乐曲库】'), director.indexOf('配乐规则'))
  assert.match(music, /chase｜Machine Strike｜急促的鼓点，被机械兽追赶｜地平线原声、紧张、追逐、快节奏/)
  assert.match(music, /flee｜Run/)
  assert.equal(music.split('\n').filter(l => l.startsWith('- ')).length, 60)
  assert.deepEqual(trace.listen.heard.bgm.map(h => [h.what, h.found.slice(0, 2)]), [['紧张的追逐', ['Machine Strike', 'Run']]])
  // 曲子不多（导演全看得到）、音效超了：照样听音效，但告诉它配乐不用找
  const quiet = []
  const llm2 = { stream(request) { quiet.push(request); return llm.stream(request) } }
  const sounds = Array.from({ length: 50 }, (_, i) => ({ id: 's' + i, kind: 'sfx', category: '杂/类' + i, name: '声' + i, tags: ['词' + i] }))
  await direct({ llm: llm2, provider: 'fake', model: 'fake-1', units, previous, castList: [], context: {}, config, backend: 'novelai', music: LIBRARY.slice(0, 10), sounds, trace: {} })
  assert.match(userOf(quiet[0]), /【曲库】这一轮不用找配乐/)
})

test('gate: 一轮选几首默认不限：听音师找几段配乐不限、设置里能限；转折点以外换歌的上限写进导演提示词', async () => {
  const many = Array.from({ length: 6 }, (_, i) => ({ at: 'U1', what: '段' + i, words: ['紧张', '词' + i] }))
  assert.equal(cleanHeard({ bgm: many }, units).bgm.length, 6, '默认不限几段')
  assert.equal(cleanHeard({ bgm: many }, units, { bgm: 2 }).bgm.length, 2)
  assert.equal(DEFAULT_CONFIG.director.listenBgm, null)
  assert.equal(resolveConfig({ director: { listenBgm: '4' } }).director.listenBgm, 4)
  assert.equal(resolveConfig({ director: { listenBgm: 'x' } }).director.listenBgm, null)
  assert.deepEqual([DEFAULT_CONFIG.director.limits.bgmSwaps, DEFAULT_CONFIG.director.limits.ambSwaps], [null, null])

  const run = async director => {
    const calls = []
    const llm = {
      stream(request) {
        calls.push(request)
        const isListen = String(request.system || '').includes('你是视觉小说的拟音师')
        const text = isListen ? JSON.stringify({ amb: [], sfx: [], bgm: many }) : '{"scene":{"bgm":"chase"},"lines":[]}'
        return (async function* () { yield { type: 'text-delta', text }; yield { type: 'finish', reason: { kind: 'stop' } } })()
      },
    }
    const trace = {}
    await direct({ llm, provider: 'fake', model: 'fake-1', units, previous: null, castList: [], context: {}, config: resolveConfig({ director: { musicCandidates: 60, ...director } }), backend: 'novelai', music: LIBRARY, trace })
    return { listen: calls[0].messages[0].content[0].text, director: calls[1].messages[0].content[0].text, heard: trace.listen.heard.bgm }
  }
  const free = await run({})
  assert.doesNotMatch(free.listen, /配乐一轮最多写/)
  assert.equal(free.heard.length, 6)
  assert.match(free.director, /除了这些转折点，只在气氛真的变了的地方换/)
  const capped = await run({ listenBgm: 2, limits: { bgmSwaps: 2 } })
  assert.match(capped.listen, /配乐一轮最多写 2 条。/)
  assert.equal(capped.heard.length, 2)
  assert.match(capped.director, /除了这些转折点，一轮最多再换 2 次，只在气氛真的变了的地方换/)
})
