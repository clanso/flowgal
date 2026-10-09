import { test } from 'node:test'
import assert from 'node:assert/strict'
import { deflateRawSync } from 'node:zlib'
import { segmentTurn, unitsForPrompt, anchorFor } from '../lib/segment.js'
import { extractJson, normalizeScript, direct, retryMaxTokens } from '../lib/director.js'
import { applyPeople, effectivePerson, expandMentions, rollback, allNames, editPerson, editLook } from '../lib/cast.js'
import { variantKey, lookAt, pickSprite, nameSeed } from '../lib/look.js'
import { emotionId } from '../lib/emotions.js'
import { fillWorkflow, locateNodes, simpleWorkflow, comfyModels } from '../lib/image/comfyui.js'
import { webuiModels, generateWebUI } from '../lib/image/webui.js'
import { buildNaiBody } from '../lib/image/novelai.js'
import { BACKENDS, generateImage } from '../lib/image/index.js'
import { firstImageFromZip } from '../lib/image/http.js'
import { composePrompt, qualityFor, applyWeights } from '../lib/image/style.js'
import { resolveCgPrompt, girlify, fallbackCg } from '../lib/illustrator.js'
import { resolveConfig, applyPatch } from '../lib/config.js'
import { imageFromChat, openaiModels } from '../lib/image/openai.js'

const TEXT = `夕阳把天台染成了橘红色。林岚靠在栏杆上，风吹乱了她的长发。
“你终于来了。”林岚回过头，嘴角带着笑。
我愣了一下：「抱歉，社团活动拖得有点久。」
（她今天……好像有点不一样。）
苏晴：我也来了！`

test('gate: 正文切成旁白、台词、心声，并猜出说话人', () => {
  const units = segmentTurn(TEXT)
  assert.deepEqual(units.map(u => u.type), ['narration', 'dialogue', 'narration', 'narration', 'dialogue', 'thought', 'dialogue'])
  assert.equal(units[4].hint, '我')
  const quote = units.find(u => u.text === '你终于来了。')
  assert.equal(quote.type, 'dialogue')
  assert.equal(quote.hint, '林岚')
  const script = units.find(u => u.text === '我也来了！')
  assert.equal(script.hint, '苏晴')
  assert.ok(units.find(u => u.type === 'thought' && u.text.includes('不一样')))
  assert.match(unitsForPrompt(units), /\[U1\|旁白\]/)
  assert.equal(anchorFor(units, 'U1'), '夕阳把天台染成了橘红色。')
})

test('gate: 长旁白按句子分页', () => {
  const long = '这是一句很长的话。'.repeat(30)
  const units = segmentTurn(long)
  assert.ok(units.length > 2)
  assert.ok(units.every(u => u.text.length <= 100))
})

test('gate: 导演 JSON 容错与规整', () => {
  const units = segmentTurn(TEXT)
  const raw = extractJson('好的：```json\n{"scene":{"location":"天台","time":"dusk","weather":"sakura","mood":"sweet","bg":"rooftop, sunset, scenery, no humans"},"cast":[{"name":"林岚"},{"name":"苏晴","pos":"right"}],"lines":[{"u":"U3","sp":"林岚","emo":"smile","sym":"heart","cam":"zoom"},{"u":"U99","sp":"x"},{"u":"U4","emo":"weird"}],"choices":["走过去","开个玩笑",""],"images":[{"after":"U3","tags":"@林岚, 1girl, smile","shape":"wide"},{"after":"U1","tags":"x"}],"people":[{"name":"林岚","gender":"female","appearance":"1girl, long black hair"}],}\n```')
  const s = normalizeScript(raw, units, { maxImages: 1 })
  assert.equal(units[2].id, 'U3')
  assert.equal(s.scene.time, 'dusk')
  assert.equal(s.cast[0].pos, 'left')
  assert.equal(s.cast[1].pos, 'right')
  assert.equal(s.lines.U3.emo, 'smile')
  assert.equal(s.lines.U99, undefined)
  assert.equal(s.lines.U4.emo, undefined)
  assert.deepEqual(s.choices, ['走过去', '开个玩笑'])
  assert.equal(s.images.length, 1)
  assert.equal(s.images[0].shape, 'landscape')
})

function scriptedLlm(replies, info) {
  const calls = []
  return {
    calls,
    ...(info ? { resolveModelInfo: async () => info } : {}),
    stream(request) {
      calls.push(request)
      const reply = replies[Math.min(calls.length, replies.length) - 1]
      return (async function* () {
        if (reply.error) { yield { type: 'finish', reason: { kind: 'error', failure: { message: reply.error } } }; return }
        yield { type: 'text-delta', text: reply }
        yield { type: 'finish', reason: { kind: 'stop' } }
      })()
    },
  }
}

test('gate: 导演最大输出与资料长度默认拉满（128000 / 1000000），超出范围收回上限', () => {
  const cfg = resolveConfig({})
  assert.equal(cfg.director.maxTokens, 128000)
  assert.equal(cfg.director.contextChars, 1000000)
  const over = resolveConfig({ director: { maxTokens: 999999, contextChars: 5e6 } })
  assert.equal(over.director.maxTokens, 128000)
  assert.equal(over.director.contextChars, 1000000)
})

test('gate: 导演按模型窗口收紧资料和最大输出，不知道窗口时按设置原样发', async () => {
  const units = segmentTurn(TEXT)
  const lore = '设定'.repeat(30000)
  const context = { description: '林岚：黑长直。', lore: [{ title: '世界观', content: lore }] }
  const config = resolveConfig({})
  const ok = '{"scene":{"location":"天台"}}'

  const small = scriptedLlm([ok], { context: { contextWindow: 20000 }, defaultMaxTokens: 8192 })
  const trace = {}
  await direct({ llm: small, provider: 'p', model: 'm', units, previous: null, castList: [], context, config, backend: 'novelai', trace })
  const sent = small.calls[0]
  assert.ok(sent.maxTokens >= 4096 && sent.maxTokens < 18000, String(sent.maxTokens))
  assert.ok(sent.messages[0].content[0].text.length < 20000)
  assert.ok(trace.contextChars < trace.contextLength)
  assert.equal(trace.notes.length, 2)
  assert.equal(trace.attempts[0].maxTokens, sent.maxTokens)

  const unknown = scriptedLlm([ok])
  await direct({ llm: unknown, provider: 'p', model: 'm', units, previous: null, castList: [], context, config, backend: 'novelai' })
  assert.equal(unknown.calls[0].maxTokens, 128000)
  assert.ok(unknown.calls[0].messages[0].content[0].text.includes(lore))
})

test('gate: 模型拒绝最大输出时按它报的上限重试一次，并记在导演日志里', async () => {
  const units = segmentTurn(TEXT)
  const llm = scriptedLlm([{ error: 'max_tokens is too large: 128000. This model supports at most 16384 completion tokens, whereas you provided 128000.' }, '{"scene":{"location":"天台"}}'])
  const trace = {}
  const { script } = await direct({ llm, provider: 'p', model: 'm', units, previous: null, castList: [], context: null, config: resolveConfig({}), backend: 'novelai', trace })
  assert.equal(script.scene.location, '天台')
  assert.deepEqual(llm.calls.map(c => c.maxTokens), [128000, 16384])
  assert.match(trace.attempts[0].error, /too large/)
  assert.match(trace.attempts[1].note, /16384/)

  assert.equal(retryMaxTokens(new Error('Invalid max_tokens value, the valid range of max_tokens is [1, 8192]'), 128000), 8192)
  assert.equal(retryMaxTokens(new Error('max_tokens: 128000 > 64000, which is the maximum allowed number of output tokens for this model'), 128000), 64000)
  assert.equal(retryMaxTokens(new Error("This model's maximum context length is 131072 tokens. However, you requested 140000 tokens (12000 in the messages, 128000 in the completion)."), 128000, { defaultMaxTokens: 8192 }), 8192)
  assert.equal(retryMaxTokens(new Error('rate limited'), 128000), 0)
})

test('gate: 外貌档案按剧情位置生效，可回滚，全局冻结', () => {
  const game = { cast: {}, castLog: [] }
  const global = { cast: { 主角: { name: '主角', tags: '1boy, short black hair' } } }
  applyPeople(game, global, [{ name: '林岚', gender: 'female', appearance: '1girl, long black hair, blue eyes' }, { name: '主角', change: '1boy, blonde hair' }], 2)
  assert.ok(game.cast.林岚)
  assert.equal(game.cast.主角, undefined, '全局角色不被 AI 修改')
  applyPeople(game, global, [{ name: '林岚', change: '1girl, short black hair, blue eyes' }], 5)
  assert.equal(effectivePerson(game, global, '林岚', 3).appearance, '1girl, long black hair, blue eyes')
  assert.equal(effectivePerson(game, global, '林岚', 6).appearance, '1girl, short black hair, blue eyes')
  applyPeople(game, global, [{ name: '林岚', temp: 'wet hair' }], 6)
  assert.equal(effectivePerson(game, global, '林岚', 6).temp, 'wet hair')
  const names = allNames(game, global)
  const { text, people } = expandMentions('@林岚, @主角, @路人, holding hands', n => effectivePerson(game, global, n, 6), names)
  assert.deepEqual(people, ['林岚', '主角'])
  assert.match(text, /short black hair, blue eyes, wet hair/)
  assert.match(text, /路人/)
  const changeIndex = game.castLog.findIndex(e => e.action === 'change')
  rollback(game, changeIndex)
  assert.equal(effectivePerson(game, global, '林岚', 9).appearance, '1girl, long black hair, blue eyes')
  editPerson(game, '林岚', { appearance: '1girl, silver hair' })
  assert.equal(effectivePerson(game, global, '林岚', 0).appearance, '1girl, silver hair')
})

test('gate: 换装和长期状态按剧情位置生效，差分编号跟着变，可回滚；全局角色也能按剧情换装', () => {
  const game = { cast: {}, castLog: [] }
  const global = { cast: { 主角: { name: '主角', tags: '1boy, short black hair', outfits: { 便服: { tags: 'hoodie' } }, outfit: '便服' } } }
  applyPeople(game, global, [{ name: '林岚', gender: 'female', appearance: '1girl, long black hair', outfit: '校服', outfitTags: 'school uniform' }], 1)
  applyPeople(game, global, [{ name: '林岚', outfit: '睡衣', outfitTags: 'pajamas', states: [{ name: '怀孕', tags: 'pregnant' }] }, { name: '主角', outfit: '西装', outfitTags: 'black suit' }], 5)
  applyPeople(game, global, [{ name: '林岚', outfit: '校服', states: [] }], 9)
  const at = t => effectivePerson(game, global, '林岚', t)
  assert.deepEqual([at(2).outfit, at(2).outfitTags, at(2).states], ['校服', 'school uniform', []])
  assert.deepEqual([at(6).outfit, at(6).outfitTags, at(6).states.map(s => s.name)], ['睡衣', 'pajamas', ['怀孕']])
  assert.deepEqual([at(9).outfit, at(9).states], ['校服', []])
  assert.notEqual(variantKey(at(2), 'smile'), variantKey(at(6), 'smile'))
  assert.equal(variantKey(at(2), 'smile'), variantKey(at(9), 'smile'), '换回校服、状态结束后用回原来那套差分')
  // 同一个种子：按名字算，玩家可以改。
  assert.equal(at(6).seed, nameSeed('林岚'))
  editPerson(game, '林岚', { seed: 7 })
  assert.equal(at(6).seed, 7)
  // 前端按时间线算出同样的样子。
  assert.deepEqual(lookAt(at(Infinity).timeline, 6), { appearance: '1girl, long black hair', outfit: '睡衣', outfitTags: 'pajamas', states: [{ name: '怀孕', tags: 'pregnant' }] })
  // @名字 展开带上衣服和长期状态。
  const { text } = expandMentions('@林岚, sitting', n => effectivePerson(game, global, n, 6), allNames(game, global))
  assert.equal(text, '1girl, long black hair, pajamas, pregnant, sitting')
  // 全局角色：固定外貌冻结，衣服按本局剧情换。
  assert.equal(game.cast.主角, undefined)
  assert.deepEqual([effectivePerson(game, global, '主角', 2).outfitTags, effectivePerson(game, global, '主角', 6).outfitTags], ['hoodie', 'black suit'])
  // 回滚第 5 轮的换装。
  rollback(game, game.castLog.findIndex(e => e.action === 'wear' && e.name === '林岚' && e.turn === 5))
  assert.equal(at(6).outfit, '校服')
  // 玩家手动改：从第 12 轮起穿泳装（衣橱里新加），带上新的长期状态。
  editLook(game, '林岚', { outfits: { 泳装: 'swimsuit' }, wear: '泳装', states: [{ name: '右臂骨折', tags: 'arm cast' }] }, 12)
  assert.deepEqual([at(12).outfitTags, at(12).states[0].tags], ['swimsuit', 'arm cast'])
})

test('gate: 立绘按「同一套样子」退：基础情绪 → 平静 → 任意表情 → 同身衣服；不跨服装借图', () => {
  const school = { appearance: 'a', outfit: '校服', states: [] }
  const pregnant = { appearance: 'a', outfit: '校服', states: [{ name: '怀孕' }] }
  const pajamas = { appearance: 'a', outfit: '睡衣', states: [] }
  const sprites = {
    [variantKey(school, 'neutral')]: { assetId: 'n' },
    [variantKey(school, 'thinking')]: { assetId: 't' },
    [variantKey(pregnant, 'smile')]: { assetId: 'p' },
  }
  assert.equal(pickSprite(sprites, school, 'thinking'), 't')
  assert.equal(pickSprite(sprites, school, '带着烦躁思考', 'thinking'), 't')
  assert.equal(pickSprite(sprites, school, 'angry'), 'n')
  assert.equal(pickSprite(sprites, pregnant, 'angry'), 'p')
  assert.equal(pickSprite({ [variantKey(school, 'neutral')]: { assetId: 'n' } }, pregnant, 'angry'), 'n', '状态不同时退到同身衣服的平静立绘')
  assert.equal(pickSprite(sprites, pajamas, 'smile'), '', '睡衣还没画时不拿校服顶替')
  assert.equal(emotionId('微笑'), 'smile')
  assert.equal(emotionId('  苦闷地表白|"'), '苦闷地表白')
})

test('gate: ComfyUI 占位符与自动定位', () => {
  const placeholder = { 1: { class_type: 'CLIPTextEncode', inputs: { text: 'masterpiece, %prompt%' } }, 2: { class_type: 'KSampler', inputs: { seed: '%seed%', steps: 20 } } }
  const filled = fillWorkflow(placeholder, { prompt: 'cat', seed: 7, width: 1, height: 1, negative: '' })
  assert.equal(filled[1].inputs.text, 'masterpiece, cat')
  assert.equal(filled[2].inputs.seed, 7)
  const graph = simpleWorkflow({ checkpoint: 'a', prompt: 'old', negative: 'bad', width: 1, height: 1, seed: 1, steps: 1, cfg: 1 })
  const map = locateNodes(graph)
  assert.equal(map.positive, '6')
  assert.equal(map.negative, '7')
  const auto = fillWorkflow(graph, { prompt: 'new', negative: 'worse', width: 640, height: 960, seed: 42, steps: 30, cfg: 5 })
  assert.equal(auto['6'].inputs.text, 'new')
  assert.equal(auto['5'].inputs.height, 960)
  assert.equal(auto['3'].inputs.seed, 42)
  assert.equal(graph['6'].inputs.text, 'old', '不改原工作流')
})

test('gate: NovelAI V4.5 请求体与 ZIP 解包', () => {
  const body = buildNaiBody({ prompt: '1girl', negative: 'bad', width: 1210, height: 830, seed: 5, config: { model: 'nai-diffusion-4-5-full' } })
  assert.equal(body.parameters.width, 1216)
  assert.equal(body.parameters.v4_prompt.caption.base_caption, '1girl')
  assert.equal(body.parameters.v4_negative_prompt.caption.base_caption, 'bad')
  const v3 = buildNaiBody({ prompt: 'x', negative: '', width: 512, height: 512, seed: 1, config: { model: 'nai-diffusion-3' } })
  assert.equal(v3.parameters.v4_prompt, undefined)
  // 构造一个最小 ZIP（deflate）。
  const png = Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex')
  const zip = makeZip('image_0.png', png)
  assert.deepEqual(Buffer.from(firstImageFromZip(new Uint8Array(zip))), png)
})

test('gate: NovelAI 新出的模型填 ID 就能用，按版本号选协议和默认质量词', () => {
  const v5 = buildNaiBody({ prompt: '1girl', negative: '', width: 832, height: 1216, seed: 1, config: { model: 'nai-diffusion-5-full' } })
  assert.equal(v5.model, 'nai-diffusion-5-full')
  assert.ok(v5.parameters.v4_prompt)
  assert.equal(buildNaiBody({ prompt: 'x', negative: '', width: 512, height: 512, seed: 1, config: { model: 'nai-diffusion-2' } }).parameters.v4_prompt, undefined)
  assert.equal(buildNaiBody({ prompt: 'x', negative: '', width: 512, height: 512, seed: 1, config: { model: 'bad id!' } }).model, 'nai-diffusion-4-5-full')
  assert.equal(qualityFor({}, 'nai-diffusion-6-full'), qualityFor({}, 'nai-diffusion-4-5-full'))
  assert.equal(buildNaiBody({ prompt: 'x', negative: '', width: 512, height: 512, seed: 1, config: { model: 'nai-diffusion-6-full', noiseSchedule: 'exponential' } }).parameters.noise_schedule, 'karras')
})

test('gate: NovelAI V5 透明底立绘、V4.5 的 Variety+ 与引导缩放', () => {
  const sprite = '1girl, solo, upper body, simple background, white background'
  const clear = buildNaiBody({ prompt: sprite, negative: '', width: 832, height: 1216, seed: 1, transparent: true, config: { model: 'nai-diffusion-5-full', cfgRescale: 0.4 } })
  assert.equal(clear.input, '1girl, solo, upper body, transparent background')
  assert.equal(clear.parameters.v4_prompt.caption.base_caption, clear.input)
  assert.equal(clear.parameters.tag_hint_transparent_background, true)
  assert.equal(clear.parameters.cfg_rescale, 0.4)
  assert.equal(clear.parameters.skip_cfg_above_sigma, undefined)
  // V4.5 不支持透明底：原样发送，不带提示位。
  const v45 = buildNaiBody({ prompt: sprite, negative: '', width: 832, height: 1216, seed: 1, transparent: true, config: { model: 'nai-diffusion-4-5-full', variety: true, cfgRescale: 5 } })
  assert.equal(v45.input, sprite)
  assert.equal(v45.parameters.tag_hint_transparent_background, undefined)
  assert.equal(v45.parameters.cfg_rescale, 1)
  assert.equal(Math.round(v45.parameters.skip_cfg_above_sigma), 58)
})

test('gate: 种子：单张指定优先，其次设置里的固定种子，-1 每张随机', async () => {
  const seen = []
  const fake = { run: async ({ seed }) => { seen.push(seed); return {} } }
  BACKENDS.fake = fake
  try {
    await generateImage({ backend: 'fake', config: { images: { seed: 42 } } })
    await generateImage({ backend: 'fake', config: { images: { seed: 42 } }, seed: 7 })
    await generateImage({ backend: 'fake', config: { images: { seed: -1 } } })
  } finally { delete BACKENDS.fake }
  assert.deepEqual(seen, [42, 7, undefined])
  assert.equal(resolveConfig({ images: { seed: 'abc' } }).images.seed, -1)
})

const jsonFetch = routes => async url => {
  const hit = Object.entries(routes).find(([path]) => url.endsWith(path))
  return hit ? new Response(JSON.stringify(hit[1]), { status: 200 }) : new Response('not found', { status: 404 })
}

test('gate: 模型列表从 ComfyUI / WebUI / OpenAI 接口实时读取', async () => {
  const comfy = await comfyModels({ baseURL: 'http://c', authType: 'none' }, '', jsonFetch({
    '/object_info/CheckpointLoaderSimple': { CheckpointLoaderSimple: { input: { required: { ckpt_name: [['a.safetensors', 'b.safetensors'], {}] } } } },
    '/object_info/KSampler': { KSampler: { input: { required: { sampler_name: [['euler', 'dpmpp_2m']], scheduler: [['normal', 'karras']] } } } },
  }))
  assert.deepEqual(comfy.models.map(m => m.id), ['a.safetensors', 'b.safetensors'])
  assert.deepEqual(comfy.schedulers, ['normal', 'karras'])

  const webui = await webuiModels({ baseURL: 'http://w', authType: 'none' }, '', jsonFetch({
    '/sdapi/v1/sd-models': [{ title: 'anything.safetensors [abc]', model_name: 'anything' }],
    '/sdapi/v1/samplers': [{ name: 'Euler a' }],
  }))
  assert.deepEqual(webui.models, [{ id: 'anything.safetensors [abc]', name: 'anything' }])
  assert.deepEqual(webui.samplers, ['Euler a'])
  assert.deepEqual(webui.schedulers, [])

  const openai = await openaiModels({ baseURL: 'http://o/v1' }, 'k', jsonFetch({ '/models': { data: [{ id: 'gpt-4o' }, { id: 'gpt-image-1' }, { id: 'flux-dev' }] } }))
  assert.deepEqual(openai.models.map(m => m.id), ['flux-dev', 'gpt-image-1', 'gpt-4o'])
})

test('gate: WebUI 选了底模只对这次请求生效', async () => {
  let sent = null
  const fetchImpl = async (url, init) => { sent = JSON.parse(init.body); return new Response(JSON.stringify({ images: [Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64').toString('base64')] }), { status: 200 }) }
  await generateWebUI({ prompt: 'p', negative: 'n', width: 512, height: 512, seed: 1, config: { baseURL: 'http://w', model: 'anything.safetensors [abc]' }, key: '', fetchImpl })
  assert.deepEqual(sent.override_settings, { sd_model_checkpoint: 'anything.safetensors [abc]' })
  assert.equal(sent.override_settings_restore_afterwards, true)
  await generateWebUI({ prompt: 'p', negative: 'n', width: 512, height: 512, seed: 1, config: { baseURL: 'http://w', model: '' }, key: '', fetchImpl })
  assert.equal(sent.override_settings, undefined)
})

test('gate: 提示词组合：画师串在前、质量词在后、人数 tag 置顶', () => {
  const config = resolveConfig({ style: { artist: 'galgame' } })
  const p = composePrompt({ kind: 'cg', tags: 'smile, 1girl, rooftop', backend: 'novelai', config })
  assert.ok(p.positive.startsWith('1girl, official art'))
  assert.match(p.positive, /very aesthetic, masterpiece/)
  const bg = composePrompt({ kind: 'bg', tags: 'classroom', backend: 'novelai', config, scene: { time: 'dusk', weather: 'rain' } })
  assert.match(bg.positive, /no humans/)
  assert.match(bg.negative, /1girl/)
  const sprite = composePrompt({ kind: 'sprite', person: { gender: 'female', appearance: 'silver hair' }, emotion: 'shy', backend: 'openai', config })
  assert.match(sprite.positive, /character sprite/)
})

test('gate: 插画提示词：人名不发出去，固定外貌补进角色块，Base 补人数，权重按渠道换写法', () => {
  const people = {
    林岚: { name: '林岚', gender: 'female', appearance: '1girl, long black hair, blue eyes' },
    Mia: { name: 'Mia', gender: 'female', appearance: 'hatsune miku (vocaloid), 1girl, twintails' },
    阿哲: { name: '阿哲', gender: 'male', appearance: '1boy, short brown hair' },
  }
  const lookup = name => people[name] || null
  const names = Object.keys(people)
  assert.equal(girlify('1girl, long hair'), 'girl, long hair')
  const image = {
    tags: 'indoors, 林岚, bedroom, warm colors, small table',
    desc: "林岚 and Mia sit by the window while 阿哲's cat sleeps; 林岚说话.",
    characters: [
      { name: '林岚', tag: 'girl, pregnant, smile, looking at another', nl: '林岚 rests a hand on her belly.' },
      { name: 'Mia', tag: 'girl, flat stomach, -1::pregnant::, 0.7::frown::, Mia, looking at another', nl: "Mia glances at her friend; Mia's twintails sway." },
      { name: '阿哲', tag: 'boy, 阿哲, sleeping', nl: '' },
    ],
  }
  const r = resolveCgPrompt(image, lookup, names)
  // 人数按角色块的性别补，Base 里混进来的人名 tag 删掉；small 不会被 Mia 误伤。
  assert.equal(r.tags, '2girls, 1boy, indoors, bedroom, warm colors, small table')
  assert.equal(r.nl, "the girl and the girl sit by the window while the boy's cat sleeps; the girl.")
  // 固定外貌在角色块最前面（1girl → girl，重复的 girl 去掉），同人身份 tag 保留在第一位。
  assert.equal(r.characters[0].tag, 'girl, long black hair, blue eyes, pregnant, smile, looking at another')
  assert.equal(r.characters[0].nl, 'the girl rests a hand on her belly.')
  assert.match(r.characters[1].tag, /^hatsune miku \(vocaloid\), girl, twintails, flat stomach, -1::pregnant::, 0\.7::frown::, looking at another$/)
  assert.equal(r.characters[1].nl, "the girl glances at her friend; the girl's twintails sway.")
  assert.equal(r.characters[2].tag, 'boy, short brown hair, sleeping')
  assert.doesNotMatch(JSON.stringify([r.tags, r.nl, r.characters.map(c => [c.tag, c.nl])]), /林岚|阿哲|Mia/, '名字只留在 name 上')
  // 已经写了人数就不再补。
  assert.equal(resolveCgPrompt({ tags: 'solo, 1girl, park', characters: [{ name: '林岚', tag: 'smile' }] }, lookup, names).tags, 'solo, 1girl, park')

  // 权重：NovelAI V4 起原样；SD 写成 (tag:w)；旧 NovelAI 用括号；不认权重的去掉数字；负权重只有 NovelAI V4 起保留。
  const text = 'flat stomach, -1::pregnant::, 0.7::frown::, 1.2::angry::'
  assert.equal(applyWeights(text, 'nai'), text)
  assert.equal(applyWeights(text, 'sd'), 'flat stomach, , (frown:0.7), (angry:1.2)')
  assert.equal(applyWeights(text, 'nai3'), 'flat stomach, , [frown], {angry}')
  assert.equal(applyWeights(text, 'plain'), 'flat stomach, , frown, angry')

  // NovelAI V4.5：Base 一段 + 每人一条；SD 合并成一段，角色块开头的 girl / boy 去掉，负权重删掉。
  const config = resolveConfig({ style: { artist: '', useQuality: false } })
  const nai = composePrompt({ kind: 'cg', tags: r.tags, desc: r.nl, characters: r.characters, backend: 'novelai', config })
  assert.match(nai.positive, /^2girls, 1boy, indoors, bedroom, warm colors, small table, the girl and the girl/)
  assert.equal(nai.characters.length, 3)
  assert.equal(nai.characters[1], "hatsune miku (vocaloid), girl, twintails, flat stomach, -1::pregnant::, 0.7::frown::, looking at another, the girl glances at her friend; the girl's twintails sway.")
  const sd = composePrompt({ kind: 'cg', tags: r.tags, desc: r.nl, characters: r.characters, backend: 'webui', config })
  assert.deepEqual(sd.characters, [])
  assert.match(sd.positive, /^2girls, 1boy, indoors, bedroom, warm colors, small table, long black hair, blue eyes, pregnant/)
  assert.match(sd.positive, /flat stomach, \(frown:0\.7\)/)
  assert.doesNotMatch(sd.positive, /pregnant::|(^|, )girl(,|$)|the girl/)

  // 分镜师写不出来时：场景 tag（去掉 no humans）+ 入画的人此刻的衣服和状态。
  const fb = fallbackCg({ who: ['林岚', '路人'], shape: 'portrait' }, n => (n === '林岚' ? { ...people.林岚, outfitTags: 'school uniform, red ribbon', states: [{ name: '怀孕', tags: 'pregnant' }], temp: 'wet clothes' } : null), { bg: 'school rooftop, sunset, scenery, no humans' })
  assert.equal(fb.tags, 'school rooftop, sunset')
  assert.deepEqual(fb.characters, [{ name: '林岚', tag: 'school uniform, red ribbon, pregnant, wet clothes', nl: '' }])
  assert.equal(fb.writer, 'fallback')
})

test('gate: 设置校验：未知键丢弃、非法地址回落、NAI 官方接入点常在', () => {
  const saved = applyPatch({}, { evil: 1, comfyui: { baseURL: 'javascript:alert(1)' }, novelai: { endpoints: [{ id: 'relay', name: '中转', baseURL: 'https://relay.example' }], endpoint: 'relay' } })
  assert.equal(saved.evil, undefined)
  const cfg = resolveConfig(saved)
  assert.equal(cfg.comfyui.baseURL, 'http://127.0.0.1:8188')
  assert.equal(cfg.novelai.endpoints[0].id, 'official')
  assert.equal(cfg.novelai.endpoint, 'relay')
})

test('gate: 聊天生图回复里取图', async () => {
  const png = Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex').toString('base64')
  const bytes = await imageFromChat({ choices: [{ message: { content: `好的 ![x](data:image/png;base64,${png})` } }] })
  assert.equal(bytes[0], 0x89)
})

function makeZip(name, data) {
  const compressed = deflateRawSync(data)
  const nameBuf = Buffer.from(name)
  const local = Buffer.alloc(30)
  local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(8, 8); local.writeUInt32LE(compressed.length, 18); local.writeUInt32LE(data.length, 22); local.writeUInt16LE(nameBuf.length, 26)
  const central = Buffer.alloc(46)
  central.writeUInt32LE(0x02014b50, 0); central.writeUInt16LE(8, 10); central.writeUInt32LE(compressed.length, 20); central.writeUInt32LE(data.length, 24); central.writeUInt16LE(nameBuf.length, 28); central.writeUInt32LE(0, 42)
  const localPart = Buffer.concat([local, nameBuf, compressed])
  const centralPart = Buffer.concat([central, nameBuf])
  const eocd = Buffer.alloc(22)
  eocd.writeUInt32LE(0x06054b50, 0); eocd.writeUInt16LE(1, 8); eocd.writeUInt16LE(1, 10); eocd.writeUInt32LE(centralPart.length, 12); eocd.writeUInt32LE(localPart.length, 16)
  return Buffer.concat([localPart, centralPart, eocd])
}

test('gate: 每个接口路径只注册一次', async () => {
  const { createRoutes } = await import('../lib/routes.js')
  const routes = createRoutes({ engine: { subscribe() {} }, logger: {} })
  const paths = routes.map(r => r.path)
  assert.equal(new Set(paths).size, paths.length)
})
