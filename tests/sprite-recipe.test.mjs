// 立绘照柏宝绘 / IGS 的写法组装：Base 只放画风和构图，这个人单独一个居中的角色块，负面分两份，请求参数跟柏宝绘一致。
// 对照的是 D:\逆转裁判立绘 那张和服立绘（柏宝绘画风、NovelAI V5 原图里存的请求）。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { composePrompt, spriteCharacterTags, mergeTags, tagKey } from '../lib/image/style.js'
import { buildNaiBody } from '../lib/image/novelai.js'

const ARTIST = '<artist> 0.5::hiten_(hitenkei)::, 0.5::betabeet::, rella, -1::artist collaboration:: </artist>'
const QUALITY = '<style>HDR, masterpiece, very aesthetic, best quality, no_text, </style>'
const STYLE_NEGATIVE = 'worst quality, bad quality, bad anatomy, bad hands, text, logo'
const config = (model = 'nai-diffusion-5-full', transparentSprites = true) => ({
  images: { transparentSprites },
  novelai: { model, sampler: 'k_euler_ancestral', steps: 28, scale: 6, cfgRescale: 0.34 },
  style: { current: 's', presets: [{ id: 's', name: '常用', artist: ARTIST, positive: QUALITY, negative: STYLE_NEGATIVE }] },
})
const lin = { gender: 'female', appearance: '1girl, long curly light brown hair, lake blue eyes, tareme, soft face, pale skin', negative: 'glasses' }
// 立绘设计师写的：混进了构图、背景、人数和一个跟档案冲突的发色，插件要收拾掉
const written = '1girl, black hair, edo-period daily kimono, muted grey-blue kimono, black haori, white obi sash, gentle neutral expression, light smile, looking at viewer, one hand lightly tucking a strand of hair behind ear, upper body, white background, solo'

test('gate: 立绘 V5 透明底：Base 是画师串 → 质量词 → 透明底 → 构图，角色块是 girl → 固定外貌 → 衣服表情动作 → 正面直立', () => {
  const p = composePrompt({ kind: 'sprite', tags: written, person: lin, backend: 'novelai', config: config(), extraNegative: 'glasses, wings' })
  assert.equal(p.positive, `${ARTIST}, ${QUALITY}, transparent background, cowboy shot, centered, standing, facing forward, eye-level, no props, solo, facing viewer, looking at viewer, straight-on`)
  assert.equal(p.characters.length, 1)
  assert.equal(p.characters[0], 'girl, long curly light brown hair, lake blue eyes, tareme, soft face, pale skin, edo-period daily kimono, muted grey-blue kimono, black haori, white obi sash, gentle neutral expression, light smile, looking at viewer, one hand lightly tucking a strand of hair behind ear, cowboy shot, standing, facing forward, eye-level, facing viewer, straight-on')
  // 整张图的负面：画风那套 + 立绘专用（背景、景别、机位、多人、文字边框）+ 透明底时连纯色底也不要
  for (const tag of ['worst quality', 'outdoors', 'floor', 'full body', 'from below', 'dutch angle', 'multiple people', 'upper body', 'head out of frame', 'props', 'drop shadow', 'border', 'solid background', 'white background']) assert.ok(p.negative.split(', ').includes(tag), tag)
  // 这个人的负面：档案「不要出现」+ 这张额外的 + 不要全身侧身大动作
  assert.equal(p.characterNegatives[0], 'glasses, wings, full body, feet, side view, off-center, tilted, dynamic pose, hands raised high, holding object, weapon, multiple people, dutch angle, from side, profile')
})

test('gate: 立绘请求参数跟柏宝绘 / IGS 一致：V5 用 params_version 4、角色块居中按坐标画、透明底带 straight_alpha、布朗噪声', () => {
  const p = composePrompt({ kind: 'sprite', tags: written, person: lin, backend: 'novelai', config: config() })
  const body = buildNaiBody({ prompt: p.positive, negative: p.negative, characters: p.characters, characterNegatives: p.characterNegatives, coords: true, width: 832, height: 1216, seed: 2233168981, transparent: true, config: config().novelai })
  const q = body.parameters
  assert.equal(body.model, 'nai-diffusion-5-full')
  assert.deepEqual([q.params_version, q.steps, q.scale, q.cfg_rescale, q.sampler, q.noise_schedule], [4, 28, 6, 0.34, 'k_euler_ancestral', 'karras'])
  assert.deepEqual([q.prefer_brownian, q.deliberate_euler_ancestral_bug, q.straight_alpha, q.tag_hint_transparent_background], [true, false, true, true])
  assert.equal(q.use_coords, true)
  assert.equal(q.v4_prompt.use_coords, true)
  assert.deepEqual(q.v4_prompt.caption.char_captions, [{ char_caption: p.characters[0], centers: [{ x: 0.5, y: 0.5 }] }])
  assert.deepEqual(q.v4_negative_prompt.caption.char_captions, [{ char_caption: p.characterNegatives[0], centers: [{ x: 0.5, y: 0.5 }] }])
  assert.equal(q.characterPrompts[0].uc, p.characterNegatives[0])
  // 插画照旧：不按坐标画，角色块负面留空
  const cg = buildNaiBody({ prompt: 'scene', negative: 'bad', characters: ['girl, a', 'boy, b'], width: 1216, height: 832, seed: 1, config: config().novelai })
  assert.equal(cg.parameters.use_coords, false)
  assert.deepEqual(cg.parameters.v4_negative_prompt.caption.char_captions.map(c => c.char_caption), ['', ''])
  // V4.5 没有透明底，也不是 params_version 4
  const v45 = buildNaiBody({ prompt: 'x', negative: '', width: 832, height: 1216, seed: 1, transparent: true, config: { model: 'nai-diffusion-4-5-full' } })
  assert.equal(v45.parameters.params_version, 3)
  assert.equal(v45.parameters.straight_alpha, undefined)
})

test('gate: 立绘：别的视线时 Base 不再 looking at viewer；不是 V5 就白底、负面不排白底；合成一段的渠道也用新构图', () => {
  const shy = composePrompt({ kind: 'sprite', tags: '1girl, school uniform, blush, looking away, hand on own cheek', person: lin, backend: 'novelai', config: config() })
  assert.doesNotMatch(shy.positive, /looking at viewer/)
  assert.match(shy.characters[0], /looking away/)

  const white = composePrompt({ kind: 'sprite', tags: written, person: lin, backend: 'novelai', config: config('nai-diffusion-4-5-full') })
  assert.match(white.positive, /simple background, white background, cowboy shot/)
  assert.doesNotMatch(white.negative, /white background|solid background/)
  const off = composePrompt({ kind: 'sprite', tags: written, person: lin, backend: 'novelai', config: config('nai-diffusion-5-full', false) })
  assert.match(off.positive, /white background/)

  // SD 渠道合成一段：人数在最前，画师串、角色内容、构图、白底，质量词在最后；负面合成一份
  const sd = composePrompt({ kind: 'sprite', tags: written, person: lin, backend: 'webui', config: config(), extraNegative: 'glasses' })
  assert.equal(sd.characters.length, 0)
  assert.match(sd.positive, /^1girl, solo, /)
  assert.match(sd.positive, /long curly light brown hair, lake blue eyes.*edo-period daily kimono.*cowboy shot, centered, standing.*simple background, white background/)
  assert.doesNotMatch(sd.positive, /upper body|black hair/)
  assert.match(sd.negative, /outdoors.*glasses|glasses.*outdoors/s)
  const gpt = composePrompt({ kind: 'sprite', tags: written, person: lin, backend: 'openai', config: config() })
  assert.match(gpt.positive, /thighs up, standing upright/)
  assert.doesNotMatch(gpt.positive, /upper body/)
})

test('gate: 角色块里固定外貌在最前，跟档案冲突的发色瞳色、设计师写的构图背景人数都去掉；tag 去重不看权重写法', () => {
  assert.equal(spriteCharacterTags(lin, '1girl, black hair, red eyes, 0.8::tareme::, long hair, smile, cowboy shot, standing, grey background'), 'long curly light brown hair, lake blue eyes, tareme, soft face, pale skin, long hair, smile')
  // 档案没定发色时，设计师写的发色留着
  assert.equal(spriteCharacterTags({ appearance: 'tareme' }, 'black hair, smile'), 'tareme, black hair, smile')
  // 没写 tags 时按档案和情绪机械拼
  assert.equal(spriteCharacterTags(lin, '', 'thinking'), 'long curly light brown hair, lake blue eyes, tareme, soft face, pale skin, thinking, hand on chin')
  assert.equal(mergeTags('a, 1.2::b::', 'B, c', '{a}'), 'a, 1.2::b::, c')
  assert.equal(tagKey(' 0.8::Lake Blue  Eyes:: '), 'lake blue eyes')
})
