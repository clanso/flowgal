// 提示词里的小段（档案、差分、上一幕这些怎么写给模型看）、出图固定词和过滤规则（设置 →「提示词」里都能改）。
// 这里只放默认值和玩家改过的那份怎么读、怎么填、怎么编译（浏览器和宿主共用；几位设计师的大段系统提示词在 lib/prompts.js，
// 每一段的名字、说明、变量在 lib/prompt-book.js）。
// 改过的存在设置的 prompts 里：{ 编号: { text, base } }，base 是改的时候内置那版的指纹（内置更新了能提示）。
import { fill } from './template.js'
import { DIRECTOR_LIMITS } from './limits.js'

// ───────────────────────── 提示词里的小段 ─────────────────────────
// [[ ]] 包起来的一段：里面的变量有一个空着就整段不发（见 lib/template.js）。

/** 各渠道的一句话说明（{{styleHint}}）。 */
export const STYLE_HINTS = Object.freeze({
  novelai: '目标模型是 NovelAI，使用 Danbooru 风格 tag。',
  comfyui: '目标模型是本地 Stable Diffusion / Anima / Illustrious 类模型，使用 Danbooru 风格 tag。',
  webui: '目标模型是本地 Stable Diffusion，使用 Danbooru 风格 tag。',
  openai: '目标是通用图像模型：插件会把英文描述和 tag 合并成一段话发出去，tag 仍用简洁的英文。',
})
const mapText = entries => entries.map(([k, v]) => `${k}：${v}`).join('\n')

const FRAGMENTS = {
  // 共用
  'shared.system': '你在视觉小说插件 FlowGal 的后台工作。下面先给你资料、剧情和档案，再在【你的工作】里写明你这次是谁、要做什么、照什么规矩写；照它做，只输出它要求的 JSON。',
  'shared.role': '【你的工作】\n{{rules}}',
  'shared.styleHint': mapText(Object.entries(STYLE_HINTS)),
  'shared.context': '【资料（仅供判断人物与外貌，勿复述）】\n{{text}}',
  'shared.story.turn': '〔第 {{turn}} 轮〕\n{{text}}',
  'shared.story.dropped': '（更早的 {{n}} 轮因模型窗口装不下略去）',
  'shared.story.empty': '（还没有剧情）',
  'shared.retry': '上一次输出无法使用（{{error}}）。只输出一个合法 JSON 对象。',
  'shared.missing': '（上一次漏写了这几条，只补写它们。）',
  'shared.person': [
    '名字：{{name}}[[（{{gender}}）]]',
    '固定外貌：{{appearance}}[[',
    '衣橱：',
    '{{wardrobe}}]][[',
    '此刻穿着：{{outfit}}]]',
    '长期状态：{{states}}[[',
    '临时状态（只影响插画，立绘不要画）：{{temp}}]][[',
    '表演笔记·本性（玩家写的，必须遵守）：{{userNote}}]][[',
    '表演笔记·本性（表演设计师读完资料写的）：{{aiNote}}]][[',
    '表演笔记·这一局（玩家写的，必须遵守）：{{userHere}}]][[',
    '表演笔记·这一局（表演设计师按此刻的处境写的）：{{aiHere}}]][[',
    '立绘备注（玩家写的，必须遵守）：{{note}}]][[',
    '不要出现：{{negative}}]]',
  ].join('\n'),
  'shared.person.outfit': '- {{name}}：{{tags}}',
  'shared.person.state': '{{name}}（{{tags}}）',
  'shared.person.blanks': mapText([['female', '女'], ['male', '男'], ['other', '其他'], ['noLook', '（未建档）'], ['noTags', '（没写 tag，按名字和剧情推断）'], ['noStateTags', '按名字推断'], ['none', '无']]),
  // 导演
  'director.noImages': '本次不需要插画：images 给空数组。',
  'director.retry': '上一次输出无法解析（{{error}}）。只输出一个合法 JSON 对象，该写的字段（join、dual、lines……）照常写全，不要因为重来就省掉。',
  'director.imageLimit': '最多 {{n}} 张（有露骨的性场面时照上面标 nsfw 那一条，可以到 {{nsfwMax}} 张）。',
  'director.imageFree': '张数不设上限：值得定格的瞬间都画，多张时彼此要明显不同；没有值得画的就不画。',
  'director.nsfwRoom': '这时这一轮一共可以到 {{nsfwMax}} 张，名额不够时先让给露骨的这几张。',
  'director.limits': mapText(DIRECTOR_LIMITS.map(l => [l.key, l.phrase('{{n}}')])),
  'director.previous': '地点：{{location}}；时段：{{time}}；天气：{{weather}}；基调：{{mood}}[[；光线：{{light}}]][[；画面效果：{{fx}}]][[；亲密氛围：{{romance}}]][[；感官：{{sense}}（不会带到这一轮，还在这样就再写一次）]][[；电影黑边：{{bars}}]][[；亲密场面的节奏：{{eros}}（不会带到这一轮，还在继续就再写一次）]][[；触手：{{tentacle}}（不会带到这一轮，还在就再写一次）]]；结束时在场：{{who}}[[；结束时还在特殊段落 {{layer}} 里（{{layerPlace}}）：这一轮接着演就在第一句写同样的 mode，不写就回到现实]][[；结束时还在跟{{caller}}通话：这一轮还在通话就不用再写 call，挂断那一句写 phone end]][[；剧情：{{summary}}]]',
  'director.previous.first': '（这是第一幕）',
  'director.cast': '- {{name}}[[（{{global}}，固定外貌冻结）]]：固定外貌：{{appearance}}[[；衣橱：{{wardrobe}}]][[；正在穿：{{outfit}}]][[；长期状态：{{states}}]][[；临时：{{temp}}]][[；动作：{{poses}}]]',
  'director.cast.none': '（暂无）',
  'director.cast.pose': '{{id}} {{label}}{{situ}}[[（{{emotions}}）]]',
  'director.cast.situ': '［处境[[：{{premise}}]][[；靠 {{needs}}]]］',
  'director.cast.self': '[[［靠 {{needs}}］]]',
  'director.cast.off': '；收起了的：{{list}}',
  'director.cast.offPose': '{{id}} {{label}}［{{why}}］',
  'director.situ': '- situ 动作跟着处境走：【角色档案】里一个人的动作标着［处境：前提］的，是从他眼下的处境来的（一段关系、一件信物、一道伤、一个心结）。剧情跨过了这个前提（找到了要找的人、和好了、伤好了、那件信物不再是那个意思了）的那一句，写 situ：name 写这个人，off 写不再合适的动作编号，why 写一句什么变了；又回到那种处境时（又分开了、又受伤了）写 on 放回，【角色档案】里「收起了的」就是已经收起的。标着「靠」某个长期状态的不用写：长期状态变了会自动收起、放回。本性的动作（没标处境的）不收。他的处境大变、整个人的样子该跟着变（重逢、决裂、失去亲人、换了身份），但没有动作要收起时，只写 name 和 why，设计师会按新的处境复盘他的动作。一个人往往很多轮才有一次，平常不写。',
  'director.emotions': '写左边的编号：内置情绪是英文键，新加的就是原词本身。\n{{list}}',
  'director.emotions.empty': '（这一类还没有情绪：新造的可以归进来）',
  'director.raw': '【本轮原文（模型写的原样，含标签。下面的单元就是从它切出来的；用它看清每句话在原文的什么位置，被状态栏、面板、变量这类标签包着的单元写进 skip）】\n{{raw}}',
  'director.music.now': '上一幕结束时在放：{{id}}（{{name}}）。',
  'director.music.silent': '上一幕结束时没有放音乐。',
  'director.sounds.now': '上一幕结束时的环境音：{{id}}（{{name}}）。',
  'director.sounds.silent': '上一幕结束时没有环境音。',
  'director.sounds.none': '（没有合适的）',
  // 听音师
  'listen.first': '这是第一幕，没有上一幕。',
  'listen.noCats': '（库里还没分类）',
  // 表演设计师
  'acting.noEmotions': '（这次不设计表情）',
  'acting.line.builtin': '- {{key}}（{{label}}）',
  'acting.line.custom': '- {{key}}（新情绪[[，接近 {{near}}]]）',
  'acting.line.placed': '{{line}}：已在动作 {{poses}}里，只重新设计表情',
  'acting.current': '【已有的动作与表情设计】\n[[表演笔记·本性：{{read}}\n]][[表演笔记·这一局：{{now}}\n]]动作：\n{{poses}}[[\n表情：\n{{faces}}]]',
  'acting.current.pose': '- {{id}}「{{label}}」［{{kind}}[[：{{premise}}]][[；靠 {{needs}}]]］：{{desc}}[[；身体 {{tags}}]]；情绪：{{emotions}}[[（现在{{status}}）]]',
  'acting.current.face': '- {{label}}[[［{{level}}］]]：{{desc}}[[（{{tags}}）]]',
  'acting.blanks': mapText([['noDesc', '（没写描述）'], ['base', '（底图）'], ['noKind', '没标本性还是处境']]),
  'acting.change': '- [[「{{quote}}」这一句起：]]{{what}}[[（{{why}}）]]',
  'acting.change.off': '收起 {{poses}}',
  'acting.change.on': '放回 {{poses}}',
  'acting.change.shift': '处境变了，没有动作要收起',
  'acting.change.needs': '长期状态里没有「{{states}}」了',
  'acting.change.manual': '- 玩家让你按他现在的处境复盘一次',
  'acting.noNewPoses': '这次不加新动作：设置里关了「复盘时设计新动作」，情绪都放进已有的动作。',
  // 立绘设计师
  'sprite.references': '【已经画好的立绘（固定外貌的写法要和它们一致）】\n{{list}}',
  'sprite.line.face': '- {{id}}：只换脸——在「{{anchor}}」那张「{{pose}}」动作底图上只重画脸，身体、衣服不动；情绪「{{emotion}}」[[；接近 {{near}}]]{{look}}；tags 只写这张脸的表情（情绪词 + 眉、眼、嘴的细节，需要时脸红、泪、汗、视线），不写外貌、衣服和动作',
  'sprite.line.whole': '- {{id}}：服装 {{outfit}}；长期状态 {{states}}；情绪「{{emotion}}」[[；接近 {{near}}]]{{guide}}{{base}}{{era}}',
  'sprite.look': '；这个人的表情：{{desc}}（脸 {{tags}}）',
  'sprite.lookTags': '；这个人的表情：{{tags}}',
  'sprite.faceAct': '；神情参考：{{act}}',
  'sprite.guide.designed': '；这个人的动作「{{pose}}」：{{desc}}[[（身体 {{tags}}）]]',
  'sprite.guide.group': '；动作组「{{pose}}」：{{desc}}[[（身体 {{tags}}）]]',
  'sprite.guide.act': '；动作参考：{{act}}',
  'sprite.base.designed': '；这张是「{{pose}}」动作的底图[[：同一个动作的{{members}}会在这张上只换脸，动作就定成这一个姿势，这些情绪都要能在这个姿势上成立]]',
  'sprite.base.group': '；这张是「{{pose}}」动作组的底图[[：同组的{{members}}会在这张上只换脸，动作就定成这一个姿势，这些情绪都要能在这个姿势上成立]]',
  'sprite.era.earlier': '；这一套是这个人这一轮早些时候、样子变化之前的样子，只画这里写的服装和状态，不要画剧情里后来才换的衣服、才戴上的饰物、才受的伤',
  'sprite.era.then': '；这一套是「{{mode}}」里当时的样子，只画这里写的服装和状态，不要画现在才有的伤病、饰物和神色',
  'sprite.blanks': mapText([['noOutfit', '（档案没写，按固定外貌和剧情推断）'], ['poseDesc', '照身体 tag'], ['none', '无']]),
  'sprite.design': [
    '【先补设计】',
    '下面「先设计再写」的几种情绪还没放进这个人的动作与表情设计里（或者要重新设计表情）。这一次先做表演设计师的活、再做立绘设计师的活，两份一起输出。表演设计师的规矩：',
    '{{rules}}',
    '{{current}}',
    '【要先设计的情绪】',
    '{{emotions}}',
    '',
    '{{task}}',
  ].join('\n'),
  'sprite.combo': '这一次输出一个 JSON 对象：{"acting":{表演设计师要输出的那个对象，只写这次要设计的情绪相关的部分},"sprites":[{"key":"差分编号","tags":"英文 tag"}]}。sprites 照立绘设计师的规矩写，【要画的差分】里每个编号一条，「先设计再写」的那几条也要写。',
  'sprite.line.design': '- {{id}}：先设计再写——情绪「{{emotion}}」[[；接近 {{near}}]]：先在 acting 里给它设计好（放进哪个动作、脸上什么样、强弱 level），再写这张：放进已有动作、level 1～3 的会在那个动作的底图上只换脸，tags 只写脸上的表情；新开一个动作（它就是新动作的底图）或者 level 标 4 的整张画，tags 照整张画写全；服装 {{outfit}}；长期状态 {{states}}{{era}}',
  // 插画分镜师
  'cg.person': [
    '- {{name}}[[（{{gender}}）]]',
    '  固定外貌：{{appearance}}',
    '  此刻穿着：{{outfit}}[[',
    '  衣橱里还有：{{others}}]]',
    '  长期状态：{{states}}[[',
    '  临时状态：{{temp}}]][[',
    '  备注（玩家写的）：{{note}}]]',
  ].join('\n'),
  'cg.noCast': '（还没有建档的人物，入画的人按正文和设定补全外貌）',
  'cg.references': '【已经画过的插画（时代锚和衣服指纹沿用这些写法）】\n{{list}}',
  'cg.line': '- {{id}}：插在 {{after}}[[（「{{quote}}」）]]之后[[；标题「{{title}}」]]；画什么：{{moment}}[[；入画：{{who}}]][[；露骨（{{nsfw}}）：照第七节如实画]][[；画幅已经定了：{{shape}}（size 写 {{size}}，按这个方向构图）]]',
  'cg.era.earlier': '这一张在下面这些人样子变化之前（这一轮后面才换的衣服、才戴上的饰物、才受的伤都不画），他们这时的样子以这里为准：',
  'cg.era.then': '这一张在「{{mode}}」里，下面这些人是当时的样子（以这里为准，不照上面档案里现在的；现在才有的伤病、饰物、神色都不画）：',
  'cg.era.person': '- {{name}}：固定外貌 {{appearance}}；穿着 {{outfit}}；长期状态 {{states}}',
  'cg.current': '现在的提示词：',
  'cg.instruction': '玩家的修改意见：{{text}}（按意见改，意见没提到的部分保持原样）',
  'cg.blanks': mapText([['female', '女'], ['male', '男'], ['other', '其他'], ['noLook', '（未建档，按设定补全）'], ['noTags', '（没写 tag，按名字和剧情补全指纹）'], ['noOutfit', '（档案没写，按剧情和设定补全）'], ['none', '无'], ['anyMoment', '从这一轮里挑最值得画的一个瞬间'], ['end', '最后'], ['eraLook', '（照档案）'], ['eraOutfit', '（按剧情补全）'], ['portrait', '竖图'], ['landscape', '横图']]),
}

// ───────────────────────── 出图固定词 ─────────────────────────

const SPRITE_FRAME = 'cowboy shot, centered, standing, facing forward, eye-level, no props, solo, facing viewer, looking at viewer, straight-on'
const SPRITE_CHAR_FRAME = 'cowboy shot, standing, facing forward, eye-level, facing viewer, straight-on'
const BG_SUFFIX = 'scenery, no humans, wide shot, detailed background, visual novel background'
const TIME_TAGS = [
  ['dawn', 'dawn, early morning, soft light'], ['morning', 'morning, daylight'], ['noon', 'noon, bright sunlight'], ['afternoon', 'afternoon, warm light'],
  ['dusk', 'sunset, dusk, orange sky'], ['evening', 'evening, twilight, purple sky'], ['night', 'night, moonlight, dark'], ['midnight', 'midnight, night sky, stars, dark'],
]
const WEATHER_TAGS = [
  ['rain', 'rain, wet ground, overcast'], ['storm', 'storm, heavy rain, lightning, dark clouds'], ['snow', 'snow, snowing, winter'], ['sakura', 'cherry blossoms, falling petals, spring'],
  ['leaves', 'autumn leaves, falling leaves'], ['fog', 'fog, mist'], ['fireflies', 'fireflies, night'], ['stars', 'starry sky'],
  ['blizzard', 'blizzard, heavy snow, snowstorm'], ['wind', 'strong wind, windy'],
]

// ───────────────────────── 过滤规则 ─────────────────────────
// 名单一行一个；「几个词」那种按整词找（连字符当空格，hand 不会认成 handsome）。
// 构图词那两份是整个 tag 对上才算：* 是任意几个字，# 是任意几位数字（#girls 认 1girl、2girls）。

const lines = (...words) => words.join('\n')

const SPRITE_DROP = lines('solo', '#girl', '#girls', '#boy', '#boys', '#other', '#others', 'upper body', 'cowboy shot', 'full body', 'portrait', 'close-up', 'standing', 'centered', 'facing viewer', 'facing forward', 'straight-on', 'eye-level', 'no props', '*background')
const POSE_DROP = lines('solo', '#girl', '#girls', '#boy', '#boys', '#other', '#others', 'upper body', 'cowboy shot', 'full body', 'portrait', 'close-up', 'standing', 'centered', 'facing viewer', 'facing forward', 'straight-on', 'eye-level', 'no props', 'from side', 'profile', 'side view', '*background')
const CLOSE_UP_DROP = lines('cowboy shot', 'upper body', 'full body', 'standing', 'centered', 'no props')
const COLORS = lines('blonde', 'blond', 'black', 'brown', 'red', 'blue', 'green', 'pink', 'purple', 'violet', 'white', 'silver', 'grey', 'gray', 'orange', 'aqua', 'yellow', 'golden', 'gold', 'platinum')
const LOOK_WORDS = lines('long', 'short', 'medium', 'very long', 'heterochromia')
const HARSH = lines('empty eyes', 'dull eyes', 'glazed eyes', 'dead eyes', 'hollow eyes', 'lifeless eyes', 'constricted pupils', 'shrinking pupils', 'pinpoint pupils', 'shaded face', 'crazy eyes', 'crazy smile', 'clenched teeth', 'gritted teeth', 'bloodshot eyes')
const SOFTER = lines(
  'streaming tears → tears', 'full-face blush → blush', 'heavy blush → blush', 'glaring → narrowed eyes', 'glare → narrowed eyes',
  'sweat → sweatdrop', 'sweating → sweatdrop', 'flying sweatdrops → sweatdrop', 'dark circles → 0.6::dark circles::', 'bags under eyes → 0.6::bags under eyes::',
)
const OTHER_GAZE = lines('looking away', 'looking to the side', 'looking down', 'looking up', 'looking back', 'looking afar', 'sideways glance', 'closed eyes', 'eyes closed')
const FACE_EXACT = lines(
  'happy', 'sad', 'angry', 'annoyed', 'surprised', 'shocked', 'scared', 'afraid', 'frightened', 'shy', 'embarrassed', 'flustered',
  'nervous', 'worried', 'anxious', 'serious', 'smug', 'confused', 'thinking', 'determined', 'tired', 'sleepy', 'excited', 'calm',
  'gentle', 'neutral', 'cold', 'love', 'lovestruck', 'jealous', 'disgusted', 'bored', 'pensive', 'sorrow', 'relieved', 'proud',
  'crying', 'laughing', 'expressionless', 'naughty face', 'trembling', 'panicking', 'teasing', 'doyagao', 'jitome', 'yandere',
  'sulking', 'sulky', 'despair', 'melancholy', 'wistful', 'lonely', 'resigned', 'troubled', 'pained', 'guilty', 'dejected', 'frustrated',
  'irritated', 'exasperated', 'disappointed', 'bashful', 'sheepish', 'mischievous', 'seductive', 'sly', 'dazed', 'stunned', 'horrified',
  'terrified', 'panicked', 'ecstatic', 'content', 'serene', 'longing', 'nostalgic', 'contempt', 'disdain', 'flushed', 'tsundere face',
  'looking at viewer', 'looking at another', 'looking away', 'looking down', 'looking up', 'looking to the side', 'looking back', 'looking afar', 'sideways glance',
)
const FACE_WORDS = lines(
  'smile', 'smiling', 'smirk', 'smirking', 'grin', 'grinning', 'frown', 'frowning', 'pout', 'pouting', 'blush', 'blushing', 'tear', 'tears', 'teary', 'tearing up',
  'teardrop', 'teardrops', 'crying', 'sobbing', 'laugh', 'laughing', 'giggle', 'giggling', 'scowl', 'scowling', 'sneer', 'sneering', 'wince', 'wincing',
  'sigh', 'sighing', 'gasp', 'gasping', 'squint', 'squinting', 'yawn', 'yawning',
  'teeth', 'lip', 'lips', 'mouth', 'tongue', 'fang', 'fangs', 'cheek', 'cheeks', 'eyebrow', 'eyebrows', 'brow', 'brows', 'glare', 'glaring', 'wink', 'winking',
  'stare', 'staring', 'gaze', 'glance', 'pupils', 'sweat', 'sweatdrop', 'sweating', 'expression', 'expressionless',
  'wide-eyed', 'bags under eyes', 'eye contact',
)
const FACE_EYE_BEFORE = lines(
  'closed', 'half-closed', 'narrowed', 'downcast', 'squinting', 'sparkling', 'empty', 'half-lidded', 'watery', 'teary', 'rolling', 'averted', 'averting', 'crazy', 'shaded', 'cold', 'gentle', 'sleepy', 'tired', 'wide', 'dull', 'glazed', 'shining', 'soft', 'lowered',
  'calm', 'serious', 'determined', 'sad', 'kind', 'fierce', 'stern', 'focused', 'tearful', 'misty', 'glistening', 'unfocused', 'distant', 'hopeful', 'pleading',
  'worried', 'nervous', 'happy', 'smiling', 'loving', 'lustful', 'seductive', 'bedroom', 'upturned', 'puppy',
)
const FACE_EYE_AFTER = lines('closed', 'open', 'widened', 'narrowed', 'shut', 'lowered')
const FACE_NOT = lines('hair', 'hand', 'hands', 'finger', 'fingers', 'arm', 'arms', 'holding', 'covering', 'eye-level', 'eyewear', 'eyepatch', 'eyeshadow', 'eyeliner', 'mascara', 'lipstick', 'eyelashes', 'facing', 'mask', 'paint', 'mark', 'whisker', 'whiskers')

/** 小段、出图固定词和过滤规则的默认值（编号 → 文字）。几位设计师的大段系统提示词不在这里（lib/prompt-book.js）。 */
export const TEXT_DEFAULTS = Object.freeze({
  ...FRAGMENTS,
  'image.spriteFrame': SPRITE_FRAME,
  'image.spriteCharFrame': SPRITE_CHAR_FRAME,
  'image.spriteBg': 'simple background, white background',
  'image.spriteBgClear': 'transparent background',
  'image.bgSuffix': BG_SUFFIX,
  'image.time': TIME_TAGS.map(([k, v]) => `${k}：${v}`).join('\n'),
  'image.weather': WEATHER_TAGS.map(([k, v]) => `${k}：${v}`).join('\n'),
  'image.closeUp': 'portrait',
  'image.openai.bg': 'A visual novel background illustration with no people.',
  'image.openai.cg': 'A visual novel event CG illustration.',
  'image.openai.sprite': 'A visual novel character sprite: a single character from the thighs up, standing upright and facing the viewer, centered, eye level, no props, on a plain white background.',
  'image.openai.style': 'Style: anime, clean lineart, soft lighting.',
  'filter.spriteDrop': SPRITE_DROP,
  'filter.poseDrop': POSE_DROP,
  'filter.closeUpDrop': CLOSE_UP_DROP,
  'filter.colors': COLORS,
  'filter.lookWords': LOOK_WORDS,
  'filter.harsh': HARSH,
  'filter.softer': SOFTER,
  'filter.otherGaze': OTHER_GAZE,
  'filter.face.exact': FACE_EXACT,
  'filter.face.words': FACE_WORDS,
  'filter.face.eyeBefore': FACE_EYE_BEFORE,
  'filter.face.eyeAfter': FACE_EYE_AFTER,
  'filter.face.not': FACE_NOT,
})

// ───────────────────────── 读设置 ─────────────────────────

const isObject = v => Boolean(v) && typeof v === 'object' && !Array.isArray(v)
/** 提示词编号：小写字母开头，字母数字和 . _ -。 */
export const PROMPT_ID = /^[a-z][\w.-]{0,63}$/
/** 一段提示词最长多少字（导演的系统提示词两万多字，留足余量）。 */
export const PROMPT_MAX = 200000

/** 这一段现在用的文字：玩家改过用改过的，没改用默认。 */
export function promptOf(config, id, fallback = TEXT_DEFAULTS[id] ?? '') {
  const own = config?.prompts?.[id]
  return own && typeof own.text === 'string' ? own.text : fallback
}

// 每一段上一次填进去的变量（提示词页里看「上一次实际展开成了什么」）：只在这次启动里记，最长的也只留前 20 万字
const lastFills = new Map()
const LAST_CHARS = 200000
/** 记下这一段这次填的变量。 */
export function noteFill(id, values) {
  const kept = {}
  for (const [k, v] of Object.entries(values || {})) if (v !== undefined && v !== null) kept[k] = String(v).slice(0, LAST_CHARS)
  lastFills.set(id, { at: Date.now(), values: kept })
}
/** 这一段上一次填的变量：{ at, values }，这次启动后还没用过的回 null。 */
export const lastFill = id => lastFills.get(id) || null
/** 按这一段现在的文字填变量（顺手记下这次的变量）。 */
export function fillOf(config, id, values = {}, fallback) {
  noteFill(id, values)
  return fill(promptOf(config, id, fallback), values)
}
/** 「编号：内容」那种表（各渠道说明、时段 tag、空着时的说法……）里的一项。 */
export const pickOf = (config, id, key) => mapOf(promptOf(config, id))[key] ?? mapOf(TEXT_DEFAULTS[id])[key] ?? ''

// 以前设置 → 导演里的四个大框（空着用内置）：搬进 prompts，原来的字段之后不再用
export const LEGACY_PROMPTS = Object.freeze({ systemPrompt: 'director.system', spritePrompt: 'sprite.system', actingPrompt: 'acting.system', cgPrompt: 'cg.system' })

/**
 * 设置里存的提示词改动规整一遍：{ 编号: { text, base } }，认不出的形状丢掉。
 * 老设置在导演那节填过的四个大框（director.systemPrompt 这些）没搬过来的，搬进来（base 为空：不知道当时内置是哪一版）。
 */
export function cleanPrompts(raw, director = null) {
  const out = {}
  if (isObject(raw)) {
    for (const [id, v] of Object.entries(raw).slice(0, 500)) {
      if (!PROMPT_ID.test(id) || !isObject(v) || typeof v.text !== 'string') continue
      out[id] = { text: v.text.slice(0, PROMPT_MAX), base: typeof v.base === 'string' ? v.base.slice(0, 16) : '' }
    }
  }
  for (const [field, id] of Object.entries(LEGACY_PROMPTS)) {
    const text = director?.[field]
    if (typeof text === 'string' && text.trim() && !out[id]) out[id] = { text: text.slice(0, PROMPT_MAX), base: '', legacy: true }
  }
  return out
}

/** 名单：一行一个，前后空白去掉、空行不算。逗号隔开写在一行里的也拆开。 */
export const listOf = text => String(text || '').split(/[\n,，]+/).map(s => s.trim()).filter(Boolean)
/** 换词表：一行「原词 → 换成」（-> 和 => 也认）。 */
export const pairsOf = text => String(text || '').split('\n').map(line => line.split(/\s*(?:→|->|=>)\s*/)).filter(p => p.length === 2 && p[0].trim()).map(([a, b]) => [a.trim(), b.trim()])
/** 一行「编号：内容」（中英文冒号都认）：→ { 编号: 内容 }。 */
export function mapOf(text) {
  const out = {}
  for (const line of String(text || '').split('\n')) {
    const m = /^\s*([\w-]+)\s*[：:]\s?(.*)$/.exec(line)
    if (m) out[m[1]] = m[2]
  }
  return out
}

// ───────────────────────── 编译规则 ─────────────────────────

const escapeRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
/** 比较用：小写、连字符和下划线当空格、多余空格合并。 */
export const wordsKey = text => String(text || '').toLowerCase().replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim()
/** 整个 tag 对上的名单（* 任意几个字，# 任意几位数字）→ 正则。 */
function wholeTags(list) {
  const parts = listOf(list).map(t => escapeRe(t.toLowerCase()).replace(/\\\*/g, '.*').replace(/#/g, '\\d*'))
  return parts.length ? new RegExp(`^(?:${parts.join('|')})$`) : /(?!)/
}
/** 按整词找的名单 → 正则（连字符当空格）。 */
function anyWords(list) {
  const parts = listOf(list).map(t => escapeRe(wordsKey(t)).replace(/ /g, '\\s+'))
  return parts.length ? new RegExp(`(?:^|[^a-z0-9])(?:${parts.join('|')})(?![a-z0-9])`) : /(?!)/
}

function compile(config) {
  const get = id => promptOf(config, id)
  const colors = listOf(get('filter.colors')).map(c => escapeRe(c.toLowerCase())).join('|') || '(?!)'
  const looks = [...listOf(get('filter.lookWords')), ...listOf(get('filter.colors'))].map(c => escapeRe(c.toLowerCase())).join('|') || '(?!)'
  const eyeBefore = listOf(get('filter.face.eyeBefore')).map(w => escapeRe(wordsKey(w)).replace(/ /g, '\\s+')).join('|')
  const eyeAfter = listOf(get('filter.face.eyeAfter')).map(w => escapeRe(wordsKey(w)).replace(/ /g, '\\s+')).join('|')
  return {
    spriteDrop: wholeTags(get('filter.spriteDrop')),
    poseDrop: wholeTags(get('filter.poseDrop')),
    closeUpDrop: wholeTags(get('filter.closeUpDrop')),
    closeUp: get('image.closeUp').trim(),
    // 发色、瞳色：颜色词前后可以夹别的词（long curly light brown hair、lake blue eyes）
    colorFeature: new RegExp(`^(?:[\\w-]+\\s+)*?(?:${colors})(?:\\s+[\\w-]+)*?\\s+(hair|eyes)$`),
    lookWord: new RegExp(`\\b(?:${looks})\\b.*\\b(?:hair|eyes)$`),
    harsh: new Set(listOf(get('filter.harsh')).map(t => t.toLowerCase().replace(/\s+/g, ' '))),
    softer: new Map(pairsOf(get('filter.softer')).map(([a, b]) => [a.toLowerCase().replace(/\s+/g, ' '), b])),
    otherGaze: new Set(listOf(get('filter.otherGaze')).map(wordsKey)),
    face: {
      exact: new Set(listOf(get('filter.face.exact')).map(wordsKey)),
      words: anyWords(get('filter.face.words')),
      eyes: new RegExp([eyeBefore && `(?:^|[^a-z0-9])(?:${eyeBefore})\\s+eyes?(?![a-z0-9])`, eyeAfter && `(?:^|[^a-z0-9])eyes?\\s+(?:${eyeAfter})(?![a-z0-9])`].filter(Boolean).join('|') || '(?!)'),
      not: anyWords(get('filter.face.not')),
    },
  }
}

const RULE_IDS = Object.keys(TEXT_DEFAULTS).filter(id => id.startsWith('filter.') || id === 'image.closeUp')
let rules = compile(null)
let ruleSig = ''
/**
 * 过滤规则跟着设置走：宿主读到新设置时调一次（没改的不重编）。
 * 判断「算不算表情」「要不要收轻」的地方很多（换脸、动作、设计师写的表情），都从这里取，不用一路传设置。
 */
export function useWordRules(config) {
  const sig = JSON.stringify(RULE_IDS.map(id => config?.prompts?.[id]?.text ?? null))
  if (sig === ruleSig) return rules
  ruleSig = sig
  return (rules = compile(config))
}
/** 现在的过滤规则（编译好的）。 */
export const wordRules = () => rules
