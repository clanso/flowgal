// 声音：打字音音色、落字音效和界面音的配方，角色的声音怎么分，设置校验，上传自己的音效。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { VOICES, SOUND_SLOTS, DEFAULT_SOUNDS, resolveVoice, castVoices, lineVoice, soundFor } from '../lib/sounds.js'
import { resolveConfig, applyPatch } from '../lib/config.js'
import { editPerson, effectivePerson } from '../lib/cast.js'
import { createStore } from '../lib/dsh/store.js'
import { createEngine } from '../lib/engine.js'

const WAVES = new Set(['sine', 'triangle', 'square', 'sawtooth', 'noise'])
const positive = v => Number.isFinite(v) && v > 0

test('gate: 声音目录：每个音色和音效版本都能照配方发声，编号不重复，默认版本就是以前的声音', () => {
  const recipes = [...VOICES.map(v => ['音色 ' + v.id, v.parts]), ...SOUND_SLOTS.flatMap(s => s.presets.map(x => [`${s.id}/${x.id}`, x.parts]))]
  for (const [name, parts] of recipes) {
    assert.ok(parts.length > 0, name)
    for (const part of parts) {
      assert.ok(WAVES.has(part.wave), `${name} 的波形`)
      assert.ok(positive(part.f) && positive(part.dur) && positive(part.gain) && part.gain <= 0.4, `${name} 的频率 / 时长 / 音量`)
      for (const key of ['to', 'q', 'lp']) if (part[key] !== undefined) assert.ok(positive(part[key]), `${name} 的 ${key}`)
      for (const key of ['at', 'attack']) if (part[key] !== undefined) assert.ok(Number.isFinite(part[key]) && part[key] >= 0 && part[key] < part.dur + 0.5, `${name} 的 ${key}`)
    }
  }
  const unique = list => new Set(list).size === list.length
  assert.ok(unique(VOICES.map(v => v.id)))
  assert.ok(unique(SOUND_SLOTS.map(s => s.id)))
  for (const s of SOUND_SLOTS) assert.ok(unique(s.presets.map(x => x.id)) && s.presets.length >= 5, s.id)
  assert.ok(VOICES.length >= 15)
  assert.ok(VOICES.filter(v => v.gender === 'female').length >= 5 && VOICES.filter(v => v.gender === 'male').length >= 4)
  // 默认版本照搬以前写死的声音：没改过设置的人听到的跟原来一样。
  assert.deepEqual(DEFAULT_SOUNDS, { impact: 'thud', slam: 'desk', stab: 'stab', ding: 'ding', select: 'pop', hover: 'tick', page: 'tone', open: 'arp' })
  assert.deepEqual(soundFor({}, 'impact').parts, [{ wave: 'sine', f: 150, to: 52, dur: 0.28, gain: 0.22 }, { wave: 'noise', f: 900, q: 0.8, dur: 0.07, gain: 0.08 }])
  assert.deepEqual(VOICES.find(v => v.id === 'classic').parts, [{ wave: 'triangle', f: 420, dur: 0.05, gain: 0.045, attack: 0.004 }])
  // 选了哪个就放哪个；关掉是 null；「用自己的」有文件放文件，没文件放默认。
  assert.equal(soundFor({ sounds: { slam: 'gong' } }, 'slam').parts, SOUND_SLOTS[1].presets.find(x => x.id === 'gong').parts)
  assert.equal(soundFor({ sounds: { slam: 'off' } }, 'slam'), null)
  assert.deepEqual(soundFor({ sounds: { slam: 'custom' }, customSounds: { slam: { assetId: 'a.wav' } } }, 'slam'), { assetId: 'a.wav' })
  assert.equal(soundFor({ sounds: { slam: 'custom' } }, 'slam').parts, SOUND_SLOTS[1].presets[0].parts)
  assert.equal(soundFor({}, 'nope'), null)
})

test('gate: 角色的声音：档案指定的优先；没指定按性别从一组里按名字固定分；没标性别用经典哔哔，音高跟以前一样', () => {
  assert.deepEqual(resolveVoice({ voice: 'deep', voicePitch: 3 }, '林岚', {}), { id: 'deep', pitch: 3, auto: false })
  assert.equal(resolveVoice({ voice: 'off' }, '林岚', {}), null)
  // 认不出的音色当作没指定。
  assert.equal(resolveVoice({ voice: 'nope', gender: 'female' }, '林岚', {}).auto, true)
  const female = new Set(VOICES.filter(v => v.gender === 'female').map(v => v.id))
  const male = new Set(VOICES.filter(v => v.gender === 'male').map(v => v.id))
  const girls = ['林岚', '苏晓', '白雪', '千夏', '真昼', '小雨', '阿紫', '青葉']
  for (const name of girls) assert.ok(female.has(resolveVoice({ gender: 'female' }, name, {}).id), name)
  for (const name of ['成步堂', '御剑', '王泥喜', '老陈']) assert.ok(male.has(resolveVoice({ gender: 'male' }, name, {}).id), name)
  assert.ok(new Set(girls.map(n => resolveVoice({ gender: 'female' }, n, {}).id)).size >= 3, '不同角色天然分到不同音色')
  assert.deepEqual(resolveVoice({ gender: 'female' }, '林岚', {}), resolveVoice({ gender: 'female' }, '林岚', {}), '同一个人每次都一样')
  // 没标性别：经典哔哔，音高 = 以前的 420Hz + 按名字每档 38Hz。
  for (const name of ['林岚', '路人甲', 'Alice']) {
    let h = 0
    for (const ch of name) h = (h * 31 + ch.codePointAt(0)) >>> 0
    const voice = resolveVoice({}, name, {})
    assert.equal(voice.id, 'classic')
    assert.ok(Math.abs(420 * 2 ** (voice.pitch / 12) - (420 + (h % 7) * 38)) < 1e-6, name)
  }
  // 设置里统一定了某个音色：没指定的都用它；档案里指定的照旧。
  assert.equal(resolveVoice({ gender: 'female' }, '林岚', { voiceDefault: 'robot' }).id, 'robot')
  assert.equal(resolveVoice({ voice: 'bell' }, '林岚', { voiceDefault: 'robot' }).id, 'bell')
  // 一句话由谁念：旁白按设置（默认经典哔哔降 6 个半音，接近以前的 300Hz），心声轻一点；没档案的人按名字自动分。
  const voices = castVoices([{ name: '林岚', voice: 'soft' }], {})
  assert.deepEqual(lineVoice('narration', '', voices, resolveConfig({}).ui), { id: 'classic', pitch: -6, auto: false })
  assert.equal(lineVoice('narration', '', voices, { narrationVoice: 'off' }), null)
  assert.deepEqual(lineVoice('dialogue', '林岚', voices, {}), { id: 'soft', pitch: 0, auto: false })
  assert.deepEqual(lineVoice('thought', '林岚', voices, {}), { id: 'soft', pitch: 0, auto: false, gain: 0.7 })
  assert.deepEqual(lineVoice('dialogue', '路人甲', voices, {}), resolveVoice(null, '路人甲', {}))
})

test('gate: 一局里自动分的声音尽量不撞：先登场的先挑，避开手动指定的，一组用完才重复；后来的人不改先来的', () => {
  const girls = ['林岚', '苏晴', '苏晓', '白雪', '千夏', '真昼', '小雨', '阿紫', '青葉', '美咲', '夏帆', '若菜']
  const alone = name => resolveVoice({ gender: 'female' }, name, {}).id
  // 找两个单独分会撞同一个音色的名字。
  const [a, b] = girls.flatMap((x, i) => girls.slice(i + 1).map(y => [x, y])).find(([x, y]) => alone(x) === alone(y))
  const pair = castVoices([{ name: b, gender: 'female', createdTurn: 2 }, { name: a, gender: 'female', createdTurn: 1 }], {})
  assert.equal(pair.get(a).id, alone(a), '先登场的保持自己的')
  assert.notEqual(pair.get(b).id, pair.get(a).id, '后来的换一个没人用的')
  assert.equal(pair.get(b).auto, true)
  // 再来一个人，前两个不变。
  const three = castVoices([{ name: a, gender: 'female', createdTurn: 1 }, { name: b, gender: 'female', createdTurn: 2 }, { name: '路人乙', gender: 'female', createdTurn: 5 }], {})
  assert.deepEqual([three.get(a), three.get(b)], [pair.get(a), pair.get(b)])
  // 手动指定的音色别人自动分时避开。
  const manual = castVoices([{ name: '主角', gender: 'female', voice: alone(a), createdTurn: 9 }, { name: a, gender: 'female', createdTurn: 1 }], {})
  assert.equal(manual.get('主角').id, alone(a))
  assert.notEqual(manual.get(a).id, alone(a))
  // 女声一组 5 个：5 个人各不相同，第 6 个才重复。
  const six = castVoices(girls.slice(0, 6).map((name, i) => ({ name, gender: 'female', createdTurn: i })), {})
  assert.equal(new Set(girls.slice(0, 5).map(n => six.get(n).id)).size, 5)
  assert.ok(VOICES.find(v => v.id === six.get(girls[5]).id).gender === 'female')
  // 不出声的、没标性别的照旧。
  const misc = castVoices([{ name: '哑巴', voice: 'off' }, { name: '路人甲' }, { name: '路人丙' }], {})
  assert.equal(misc.get('哑巴'), null)
  assert.deepEqual([misc.get('路人甲').id, misc.get('路人丙').id], ['classic', 'classic'])
})

test('gate: 声音设置校验：音量夹住，认不出的音色和版本退回默认，没文件的「用自己的」退回默认，浏览器改不了上传记录', () => {
  const defaults = resolveConfig({}).ui
  assert.deepEqual(defaults.sounds, DEFAULT_SOUNDS)
  assert.deepEqual([defaults.blip, defaults.blipVolume, defaults.sfx, defaults.sfxVolume, defaults.voiceDefault, defaults.narrationVoice, defaults.narrationPitch], [true, 1, true, 1, 'auto', 'classic', -6])
  const ui = resolveConfig({
    ui: {
      blipVolume: 9, sfxVolume: -1, voiceDefault: 'nope', narrationVoice: 'nope', narrationPitch: 99,
      sounds: { impact: 'boom', slam: 'nope', stab: 'custom', ding: 'off', page: 'custom' },
      customSounds: { page: { assetId: 'aaaabbbbccccddddeeeeffff00001111.wav', name: 'page.wav' }, hover: { assetId: '../../secrets.json' }, nope: { assetId: 'aaaabbbbccccddddeeeeffff00001111.wav' } },
    },
  }).ui
  assert.deepEqual([ui.blipVolume, ui.sfxVolume, ui.voiceDefault, ui.narrationVoice, ui.narrationPitch], [2, 0, 'auto', 'classic', 6])
  assert.deepEqual(ui.sounds, { ...DEFAULT_SOUNDS, impact: 'boom', ding: 'off', page: 'custom' })
  assert.deepEqual(ui.customSounds, { page: { assetId: 'aaaabbbbccccddddeeeeffff00001111.wav', name: 'page.wav' } })
  const patched = applyPatch({ ui: { customSounds: { page: { assetId: 'aaaabbbbccccddddeeeeffff00001111.wav' } } } }, { ui: { sfx: false, customSounds: { impact: { assetId: 'ffffeeeeddddccccbbbbaaaa00001111.wav' } } } })
  assert.deepEqual(patched.ui, { customSounds: { page: { assetId: 'aaaabbbbccccddddeeeeffff00001111.wav' } }, sfx: false })
})

test('gate: 档案里的声音可改可清空；提升为全局、复制回本局都带着走', async () => {
  const game = { cast: {}, looks: {} }
  editPerson(game, '林岚', { appearance: '1girl', voice: 'bubble', voicePitch: 2 })
  assert.deepEqual([game.cast['林岚'].voice, game.cast['林岚'].voicePitch], ['bubble', 2])
  const person = effectivePerson(game, { cast: {} }, '林岚')
  assert.deepEqual([person.voice, person.voicePitch], ['bubble', 2])
  editPerson(game, '林岚', { voice: 'nope', voicePitch: 0 })
  assert.equal('voice' in game.cast['林岚'] || 'voicePitch' in game.cast['林岚'], false, '认不出的、原调都不存')
  editPerson(game, '林岚', { voice: 'off', voicePitch: 40 })
  assert.deepEqual([game.cast['林岚'].voice, game.cast['林岚'].voicePitch], ['off', 6])

  const dir = await mkdtemp(join(tmpdir(), 'flowgal-'))
  try {
    const engine = createEngine({ store: createStore(dir), services: {}, logger: { warn() {}, info() {} } })
    await engine.castAction('g', 'save', { name: '林岚', patch: { appearance: '1girl', voice: 'cool', voicePitch: -2 } })
    await engine.castAction('g', 'promote', { name: '林岚' })
    let lin = (await engine.gameView('g')).cast.find(p => p.name === '林岚')
    assert.deepEqual([lin.global, lin.voice, lin.voicePitch], [true, 'cool', -2])
    await engine.castAction('g', 'global-save', { name: '林岚', patch: { voice: 'bell', voicePitch: 1 } })
    await engine.castAction('g', 'copy-local', { name: '林岚' })
    lin = (await engine.gameView('g')).cast.find(p => p.name === '林岚')
    assert.deepEqual([lin.global, lin.voice, lin.voicePitch], [false, 'bell', 1])
    engine.dispose()
  } finally {
    await rm(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 })
  }
})

/** 一段最小的 WAV（44 字节头 + 几个采样）。 */
function wav(samples = 8) {
  const b = Buffer.alloc(44 + samples * 2)
  b.write('RIFF', 0); b.writeUInt32LE(36 + samples * 2, 4); b.write('WAVE', 8); b.write('fmt ', 12)
  b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(8000, 24); b.writeUInt32LE(16000, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34)
  b.write('data', 36); b.writeUInt32LE(samples * 2, 40)
  return b
}

test('gate: 某种音效换成自己的文件：认格式、再换时删掉旧文件、删掉后退回默认版本', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'flowgal-'))
  try {
    const engine = createEngine({ store: createStore(dir), services: {}, logger: { warn() {}, info() {} } })
    let { config } = await engine.uploadSound('impact', wav(), 'my-boom.wav')
    const first = config.ui.customSounds.impact
    assert.equal(config.ui.sounds.impact, 'custom')
    assert.equal(first.name, 'my-boom.wav')
    assert.equal((await engine.readAsset(first.assetId)).mediaType, 'audio/wav')
    ;({ config } = await engine.uploadSound('impact', wav(16), 'louder.wav'))
    assert.notEqual(config.ui.customSounds.impact.assetId, first.assetId)
    assert.equal(await engine.readAsset(first.assetId), null, '换下来的旧文件删掉了')
    // 浏览器发来的普通设置修改动不了上传记录。
    const uploaded = config.ui.customSounds.impact.assetId
    ;({ config } = await engine.patchConfig({ ui: { sounds: { slam: 'gong' }, customSounds: { impact: { assetId: first.assetId } } } }))
    assert.equal(config.ui.sounds.slam, 'gong')
    assert.equal(config.ui.customSounds.impact.assetId, uploaded)
    await assert.rejects(engine.uploadSound('nope', wav(), 'x.wav'), /没有这种音效/)
    await assert.rejects(engine.uploadSound('slam', Buffer.from('not audio at all'), 'x.txt'), /认不出这个音频格式/)
    const kept = uploaded
    ;({ config } = await engine.removeSound('impact'))
    assert.equal(config.ui.sounds.impact, 'thud')
    assert.deepEqual(config.ui.customSounds, {})
    assert.equal(await engine.readAsset(kept), null)
    engine.dispose()
  } finally {
    await rm(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 })
  }
})
