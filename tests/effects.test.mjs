// 特效开关：按种类分组、每个单独开关；关掉的那一下剧场不演，别的照常，打开后马上回来（导演照常写，剧场播放时才拿掉）。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { EFFECT_GROUPS, EFFECT_IDS, effectsOff, muteView, muteBeats, muteTransition, offDeliveries, cssOff } from '../src/client/theater/effects.js'
import { buildBeats, beatHold, changePlan } from '../src/client/theater/playback.js'
import { resolveConfig, applyPatch } from '../lib/config.js'
import { CAMERAS, WEATHER, LIGHTS, FX, TRANSITIONS, MOVES, HIT_EFFECTS, MOMENTS, CARDS, VOICES, TEXT_FX, DELIVERIES } from '../lib/vocab.js'
import { planLine } from '../lib/typing.js'

const CAST = [{ name: '林岚', pos: 'left' }, { name: '苏晴', pos: 'right' }]
const viewOf = (turns, images = []) => ({
  turns: turns.map(([lines, scene = { location: '旧校舍' }], i) => {
    const units = lines.map(([text], j) => ({ id: `U${j + 1}`, type: 'dialogue', text }))
    return { turn: i + 1, textVersion: 'v1', units, script: { scene, cast: CAST, lines: Object.fromEntries(lines.map(([, line], j) => [`U${j + 1}`, line])) } }
  }),
  images,
})
const play = (turns, off = [], images = []) => {
  const set = new Set(off)
  return muteBeats(buildBeats(muteView(viewOf(turns, images), set)).beats, set)
}

test('gate: 每一种导演能写的镜头、转场、天气、光线、画面效果……都有自己的开关，编号不重', () => {
  assert.equal(new Set(EFFECT_IDS).size, EFFECT_IDS.length)
  for (const id of EFFECT_IDS) assert.match(id, /^[a-z]+\.[a-z0-9]+$/)
  const has = (prefix, values, skip = []) => { for (const v of values) if (!skip.includes(v)) assert.ok(EFFECT_IDS.includes(`${prefix}.${v}`), `${prefix}.${v}`) }
  has('cam', CAMERAS)
  has('tr', TRANSITIONS, ['none'])
  has('weather', WEATHER, ['clear'])
  has('light', LIGHTS, ['normal'])
  has('fx', FX, ['none'])
  has('move', MOVES, ['reset'])
  has('hit', HIT_EFFECTS)
  has('moment', MOMENTS)
  has('card', CARDS)
  has('voice', VOICES)
  has('textfx', TEXT_FX)
  has('say', DELIVERIES)
  for (const g of EFFECT_GROUPS) {
    assert.ok(g.label && g.hint && g.items.length, g.id)
    for (const item of g.items) assert.ok(item.label, item.id)
  }
})

test('gate: 什么都没关时原样演；关掉的镜头、天气、光线、画面效果、亲密氛围、感官、黑边不演，别的照常', () => {
  const turns = [[[
    ['开始了', { sp: '林岚', cam: 'shake', scene: { weather: 'rain', light: 'candle', fx: 'sway', romance: 'ambiguous', sense: 'ear', bars: 'on' } }],
    ['再近一点', { sp: '苏晴', cam: 'zoom', camOn: '林岚' }],
    ['雪停了', { sp: '林岚', cam: 'closeup', camOn: '苏晴', scene: { weather: 'snow', light: 'moon' } }],
  ]]]
  const view = viewOf(turns)
  assert.equal(muteView(view, new Set()), view, '没关的时候不拷贝视图')
  const all = buildBeats(view).beats
  assert.equal(muteBeats(all, new Set()), all)

  const beats = play(turns, ['cam.shake', 'cam.closeup', 'weather.rain', 'light.candle', 'fx.sway', 'romance.ambiguous', 'sense.ear', 'look.bars'])
  assert.deepEqual(beats.map(b => b.cam), ['', 'zoom', ''])
  assert.equal(beats[1].camOn, '林岚', '开着的镜头还对着原来的人')
  assert.equal(beats[2].camOn, undefined, '关掉的镜头不再对准谁')
  const s = beats[0].scene
  assert.deepEqual([s.weather, s.light, s.fx, s.romance, s.sense, s.bars], ['clear', 'normal', 'none', 'none', 'none', 'none'])
  assert.deepEqual([beats[2].scene.weather, beats[2].scene.light], ['snow', 'moon'], '没关的那几样照常')
  assert.equal(all[0].scene.weather, 'rain', '原来的节拍不被改动')
})

test('gate: 关掉的转场换成溶解，溶解也关了就直接切；从回忆里醒过来的褪白也能关', () => {
  const off = new Set(['tr.glitch'])
  assert.equal(muteTransition('glitch', off), 'dissolve')
  assert.equal(muteTransition('blink', off), 'blink')
  assert.equal(muteTransition('glitch', new Set(['tr.glitch', 'tr.dissolve'])), 'none')
  assert.equal(muteTransition('', off), '')

  const turns = [[[
    ['旧校舍', { sp: '林岚' }],
    ['天台', { sp: '林岚', scene: { location: '天台', transition: 'glitch' } }],
  ]]]
  const beats = play(turns, ['tr.glitch'])
  assert.equal(beats[1].transition, 'dissolve')
  assert.equal(changePlan(beats[1], { place: '旧校舍', mode: '' }).cover, '', '溶解没有盖住画面的那一层')

  // 从回忆里醒过来：开着时演褪白（wake），关掉了当普通的换场演
  const back = { scene: { location: '天台', time: 'afternoon' }, sceneEnter: true, transition: 'dissolve', mode: '' }
  const was = { place: '旧校舍', mode: 'memory' }
  assert.equal(beatHold(back, { was }).wake, true)
  assert.equal(changePlan(back, was), null)
  assert.equal(beatHold(back, { was, wake: false }).wake, undefined)
  assert.ok(changePlan(back, was, { wake: false }), '关掉醒过来后照常换场')
})

test('gate: 打斗、走位、登场退场的样子、手机、分屏、过场字卡、停顿、配乐留白关掉后，后面几句也不受影响', () => {
  const turns = [[[
    ['看招', { sp: '林岚', hit: { from: '林岚', to: '苏晴', effect: 'down' }, enter: [{ name: '苏晴', how: 'run' }] }],
    ['……', { sp: '林岚', move: [{ name: '林岚', act: 'turn' }, { name: '苏晴', act: 'forward' }] }],
    ['电话', { sp: '林岚', phone: { kind: 'call', who: '妈妈' }, split: { who: ['妈妈'] } }],
    ['喂', { sp: '林岚', pause: 'beat', bgm: 'hush' }],
    ['三小时后', { sp: '林岚', cut: { kind: 'time', text: '三小时后' } }],
    ['走了', { sp: '林岚', exitHow: { 林岚: 'storm' } }],
  ]]]
  const on = play(turns)
  assert.ok(on[0].poses['苏晴'].down && on[1].poses['林岚'].away && on[2].call && on[2].split && on[3].pause && on[3].hush && on[4].cut, '开着时照常演')
  assert.deepEqual([on[2].call.state, on[3].call.state], ['ringing', 'live'])

  const beats = play(turns, ['hit.down', 'move.turn', 'enter.run', 'phone.call', 'phone.split', 'pace.beat', 'pace.hush', 'title.time', 'exit.storm'])
  assert.equal(beats[0].hit, undefined)
  assert.ok(!(beats[0].poses && beats[0].poses['苏晴'] && beats[0].poses['苏晴'].down), '没被击倒，不躺在黑雾里')
  assert.equal(beats[0].enterHow, undefined, '平常地滑进来')
  assert.deepEqual(beats[1].moves.map(m => m.act), ['forward'], '背过身不演，上前照常')
  assert.ok(!(beats[1].poses['林岚'] && beats[1].poses['林岚'].away))
  assert.ok(beats.every(b => !b.split), '不开分屏')
  assert.deepEqual([beats[2].call, beats[2].phone], [undefined, undefined], '手机不响')
  assert.equal(beats[3].call.state, 'live', '电话照样接通，右上角挂着通话中')
  assert.equal(play(turns, ['phone.live'])[3].call, undefined, '通话中也能关')
  assert.deepEqual([beats[3].pause, beats[3].hush, beats[4].cut], [undefined, undefined, undefined])
  assert.equal(beatHold(beats[3], { was: { place: '旧校舍', mode: '' } }).ms, 0, '关掉的停顿、留白不让字等')
  assert.ok(beats.every(b => !b.exitHow))
})

test('gate: 关掉转身面对、回眸、治疗时只是不演那一下，背过身的人照样转回来、被打倒的人照样站起来', () => {
  const turns = [[[
    ['哼', { sp: '林岚', move: [{ name: '林岚', act: 'turn' }], hit: { from: '林岚', to: '苏晴', effect: 'down' } }],
    ['……', { sp: '林岚', move: [{ name: '林岚', act: 'face' }], hit: { from: '林岚', to: '苏晴', effect: 'heal' } }],
    ['好了', { sp: '林岚' }],
  ]]]
  const beats = play(turns, ['move.face', 'hit.heal'])
  assert.ok(beats[0].poses['林岚'].away && beats[0].poses['苏晴'].down)
  assert.equal(beats[1].moves, undefined, '转回来的那一下不演')
  assert.equal(beats[1].hit, undefined, '治疗的绿光不演')
  assert.ok(!(beats[1].poses && beats[1].poses['林岚']), '人照样转回来了')
  assert.ok(!(beats[1].poses && beats[1].poses['苏晴']), '苏晴也站起来了')
})

test('gate: 情绪符号、旁人反应、重音、文字效果、声音的样子、情境卡片、小瞬间按开关拿掉', () => {
  const turns = [[[
    ['你说什么！', { sp: '林岚', sym: 'anger', stress: '什么', textfx: [{ text: '你', style: 'shake' }, { text: '说', style: 'big' }], react: [{ name: '苏晴', sym: 'sweat' }, { name: '苏晴', emo: 'scared' }] }],
    ['短信', { sp: '苏晴', card: 'sms', voice: 'phone' }],
    ['咔嚓', { sp: '林岚', moment: { kind: 'photo', text: '合影' } }],
  ]]]
  const on = play(turns)
  assert.equal(on[0].sym, 'anger')
  assert.ok(on[0].reacts && on[0].reacts.length)

  const beats = play(turns, ['actor.sym', 'say.stress', 'textfx.shake', 'card.sms', 'voice.phone', 'moment.photo'])
  assert.equal(beats[0].sym, '')
  assert.ok((beats[0].reacts || []).every(r => !r.sym), '反应里的符号也拿掉')
  assert.equal(beats[0].stress, '')
  assert.deepEqual(beats[0].textfx.map(t => t.style), ['big'])
  assert.deepEqual([beats[1].card, beats[1].voice, beats[2].moment], ['', undefined, undefined])
  assert.equal(beats[0].emotions['苏晴'], on[0].emotions['苏晴'], '反应换的表情不受影响')
  assert.equal(play(turns, ['actor.react'])[0].reacts, undefined, '旁人跟着一动可以整个关掉')
})

test('gate: 插画关掉的出现、收起换成溶入溶出，停留换成静止', () => {
  const img = { id: 'cg1', turn: 1, textVersion: 'v1', after: 'U1', current: 0, versions: [{ assetId: 'a1' }], enter: 'impact', leave: 'flash', motion: 'push' }
  const turns = [[[['看', { sp: '林岚' }], ['好看', { sp: '林岚' }]]]]
  const [beat] = play(turns, ['cgin.impact', 'cgmove.push'], [img])
  assert.deepEqual([beat.cg.enter, beat.cg.leave, beat.cg.motion], ['dissolve', 'flash', 'still'])
  assert.equal(img.enter, 'impact', '原来的插画记录不被改动')
})

test('gate: 设置里只记关掉的；老设置关着「天气粒子」时没单独打开过的天气算关着', () => {
  const fresh = resolveConfig({})
  assert.deepEqual(fresh.ui.effects, {})
  assert.equal('particles' in fresh.ui, false)

  const saved = applyPatch({}, { ui: { effects: { 'cam.shake': false, 'cam.zoom': true, 'bad key': false, 'weather.rain': 'no' } } })
  assert.deepEqual(resolveConfig(saved).ui.effects, { 'cam.shake': false })
  assert.deepEqual([...effectsOff(resolveConfig(saved).ui)], ['cam.shake'])

  const old = { ui: { particles: false } }
  const off = effectsOff(resolveConfig(old).ui)
  assert.ok(off.has('weather.rain') && off.has('weather.sakura') && !off.has('weather.clear'))
  const reopened = applyPatch(old, { ui: { effects: { 'weather.rain': true } } })
  const after = effectsOff(resolveConfig(reopened).ui)
  assert.ok(!after.has('weather.rain') && after.has('weather.snow'), '单独打开的雨回来了，别的天气还关着')
})

test('gate: 关掉的台词演法不用（导演写的、从字面推断的都不用）；几样纯画面的开关交给 theater.css', () => {
  const chars = Array.from('你给我站住！')
  assert.equal(planLine(chars, 30, { emo: 'angry' }).say, 'shout')
  const quiet = planLine(chars, 30, { emo: 'angry', offStyles: offDeliveries(new Set(['say.shout'])) })
  assert.equal(quiet.say, '')
  assert.equal(quiet.fx.length, 0, '没有怒吼砸下来的那一下')
  assert.equal(planLine(chars, 30, { say: 'whisper', offStyles: new Set(['shout']) }).say, 'whisper')
  assert.equal(cssOff(new Set(['look.kenburns', 'actor.hop', 'cam.shake'])), 'kenburns hop')
})
