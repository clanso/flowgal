// 导演可用的演出词汇。前后端共用：后端用来校验，前端用来渲染。
export const EMOTIONS = {
  neutral: '平静', smile: '微笑', happy: '开心', laugh: '大笑', shy: '害羞', blush: '脸红',
  sad: '难过', cry: '哭泣', angry: '生气', pout: '赌气', surprised: '惊讶', scared: '害怕',
  worried: '担心', smug: '得意', serious: '认真', tired: '疲惫', love: '心动', confused: '困惑',
  thinking: '思考', determined: '坚定', cold: '冷淡', teasing: '调侃',
}

export const EMOTION_TAGS = {
  neutral: 'neutral expression, closed mouth', smile: 'light smile', happy: 'happy, smile, open mouth',
  laugh: 'laughing, closed eyes, open mouth', shy: 'shy, looking away, light blush', blush: 'blush, embarrassed',
  sad: 'sad, frown, downcast eyes', cry: 'crying, tears', angry: 'angry, furrowed brow, frown',
  pout: 'pout, puffed cheeks', surprised: 'surprised, wide eyes, open mouth', scared: 'scared, trembling',
  worried: 'worried, frown', smug: 'smug, smirk', serious: 'serious, expressionless', tired: 'tired, half-closed eyes',
  love: 'blush, heart-shaped pupils, smile', confused: 'confused, head tilt', thinking: 'thinking, hand on chin',
  determined: 'determined, serious', cold: 'expressionless, cold eyes', teasing: 'teasing smile, one eye closed',
}

/**
 * 内置情绪「演到全身」的动作说明，交给立绘设计师参考（照 IGS 表情预设的思路：情绪写进手势、肩线和重心，不只换脸）。
 * 是基准不是模板：设计师按角色性格调幅度。漫画符号（汗滴、怒筋）是剧场特效，立绘里不画。
 */
export const EMOTION_ACTS = {
  neutral: '表情放松，眉眼舒展，嘴角自然，站姿松弛，带一个轻量的日常小动作',
  smile: '嘴角轻轻上扬，眼神柔和，肩膀放松',
  happy: '笑开，眼睛弯起，身体微微前倾或一只手轻轻抬起',
  laugh: '张嘴大笑，眼睛眯成缝，肩膀耸动、身体前倾，手掩着嘴或按着肚子',
  shy: '脸颊泛红，视线躲开，手无意识地碰脸、绕头发或抓衣角，肩膀微微缩起',
  blush: '满脸通红，眼神发慌，手捂脸颊或挡在胸前',
  sad: '低头，眼神暗下来，嘴角下压，肩膀垮下',
  cry: '落泪，眼角和鼻尖发红，手抹眼泪，肩膀发抖',
  angry: '皱起眉头，嘴角往下压，攥着拳，肩膀绷紧（气鼓鼓的，不是凶狠）',
  pout: '鼓脸噘嘴，抱臂，斜眼瞟人，身体侧过去一点',
  surprised: '眼睛睁大，嘴微张，手抬到胸前，身体往后一缩',
  scared: '眼睛睁大，眉毛皱成八字，双手护在胸前，身体往后缩',
  worried: '眉头拧起，嘴唇抿紧，双手握在胸前或搓着手指',
  smug: '抬起下巴，嘴角单边上扬，手叉腰或抱臂',
  serious: '眉眼收紧，嘴唇抿成一线，站得笔直，目光坚定（带一个紧绷的细节，别画成证件照）',
  tired: '半垂着眼，眼下发暗，肩膀耷拉，手揉眼睛或扶着后颈',
  love: '眼神柔软地看着对方，脸红，嘴角含笑，身体微微凑近，手放在胸口',
  confused: '歪头，眉头一高一低，手指点着脸颊或挠头',
  thinking: '手托下巴，视线偏到一边，眉头轻蹙',
  determined: '眉眼压低，嘴角收紧，攥拳放在胸前，重心前倾',
  cold: '视线移开或半垂着眼，面无表情，抱臂，不理人的样子',
  teasing: '坏笑，眯起一只眼，手指点着嘴唇或指向对方，身体歪向一边',
}

/**
 * 动作组（galgame 的「一个动作 + 一套表情」）：同一套衣服每组只整张画一张底图（代表情绪 anchor，按它的动作参考画），
 * 同组其余情绪在这张底图上只重画脸（NovelAI 局部重绘），身体、衣服一个像素不动。代表情绪的动作参考就是这一组的姿势。
 */
export const POSES = {
  daily: { label: '日常', anchor: 'neutral' },
  arms: { label: '抱臂', anchor: 'cold' },
  chest: { label: '手在胸前', anchor: 'worried' },
  chin: { label: '托腮', anchor: 'thinking' },
  // 原生侧身立绘：底图整张按侧身构图画（侧脸、看向一旁，见 image/style.js），不是转头动画
  side: { label: '侧身', anchor: 'pout' },
}
/** 内置情绪默认归哪个动作组（设置里可以改；导演新造的情绪跟着它最接近的内置情绪走）。 */
export const EMOTION_POSE = {
  neutral: 'daily', smile: 'daily', happy: 'daily', laugh: 'daily', sad: 'daily', cry: 'daily', serious: 'daily', tired: 'daily',
  cold: 'arms', angry: 'arms', smug: 'arms',
  pout: 'side',
  worried: 'chest', shy: 'chest', blush: 'chest', love: 'chest', scared: 'chest', surprised: 'chest', determined: 'chest',
  thinking: 'chin', confused: 'chin', teasing: 'chin',
}

/**
 * 只换脸时用的表情 tag：只写脸上的东西（眉、眼、嘴、脸红、泪、视线），不写动作。add 换进角色块（galgame 立绘的表情，收着画）。
 * neg 是以前插件自己加进负面的，现在不用（负面只用画风里带的和玩家写的）。
 * 立绘设计师给这张写了表情时优先用它写的；没写或没开设计师时用这里的。
 */
export const EMOTION_FACE = {
  neutral: { add: 'neutral expression, closed mouth', neg: 'smile, frown, open mouth, tears' },
  smile: { add: 'light smile, closed mouth', neg: 'frown, open mouth, teeth, tears' },
  happy: { add: 'happy, smile, open mouth, raised eyebrows', neg: 'frown, sad, angry, closed eyes, tears' },
  laugh: { add: 'laughing, closed eyes, open mouth, smile', neg: 'frown, sad, angry, tears' },
  shy: { add: 'shy, embarrassed, light blush, looking away, wavy mouth, closed mouth', neg: 'open mouth, teeth, crying' },
  blush: { add: 'blush, embarrassed, wavy mouth, raised eyebrows', neg: 'crying, smile' },
  sad: { add: 'sad, worried eyebrows, downcast eyes, frown, closed mouth', neg: 'smile, happy, open mouth, tears' },
  cry: { add: 'crying, tears, sad, worried eyebrows, frown, open mouth', neg: 'smile, happy, laughing' },
  angry: { add: 'angry, v-shaped eyebrows, furrowed brow, frown, closed mouth', neg: 'smile, happy, blush, scar, bandaid' },
  pout: { add: 'pout, puffed cheeks, v-shaped eyebrows, looking to the side', neg: 'smile, open mouth, teeth' },
  surprised: { add: 'surprised, wide-eyed, raised eyebrows, open mouth, small pupils', neg: 'smile, closed eyes, half-closed eyes, frown' },
  scared: { add: 'scared, wide-eyed, worried eyebrows, open mouth, sweatdrop', neg: 'smile, happy, blush' },
  worried: { add: 'worried, worried eyebrows, frown, closed mouth', neg: 'smile, happy, open mouth, tears' },
  smug: { add: 'smug, smirk, half-closed eyes, raised eyebrow', neg: 'frown, sad, tears, open mouth' },
  serious: { add: 'serious, furrowed brow, closed mouth', neg: 'smile, open mouth, blush, tears' },
  tired: { add: 'tired, half-closed eyes, 0.6::bags under eyes::, closed mouth', neg: 'smile, wide-eyed' },
  love: { add: 'blush, heart-shaped pupils, smile, half-closed eyes', neg: 'frown, angry, tears' },
  confused: { add: 'confused, raised eyebrow, wavy mouth', neg: 'smile, tears' },
  thinking: { add: 'thinking, looking to the side, closed mouth', neg: 'smile, open mouth, tears' },
  determined: { add: 'determined, v-shaped eyebrows, serious, closed mouth', neg: 'smile, tears, blush' },
  cold: { add: 'expressionless, jitome, closed mouth', neg: 'smile, blush, open mouth, tears' },
  teasing: { add: 'naughty face, smirk, one eye closed', neg: 'frown, tears, sad' },
}

/** 情绪符号（漫画符）：在立绘头顶弹出，SVG 在 src/client/theater/symbols.js。 */
export const SYMBOLS = ['heart', 'anger', 'sweat', 'sparkle', 'surprise', 'gloom', 'note', 'zzz', 'bulb', 'heartbreak', 'sigh', 'dizzy', 'fire', 'blush', 'bloom', 'silence']
/**
 * 镜头语言。只管写的那一句，下一句镜头自己缓回来。zoom / closeup / lowangle / slowpush / focus 对准一个人（camOn，默认说话的人）。
 */
export const CAMERAS = ['shake', 'zoom', 'zoomout', 'flash', 'pan', 'blur', 'fadeblack', 'redflash', 'tilt', 'closeup', 'focus', 'whip', 'sink', 'rise', 'lowangle', 'dolly', 'empty', 'slowpush']
export const AIMED_CAMERAS = new Set(['zoom', 'closeup', 'lowangle', 'slowpush', 'focus'])
/** 一轮最多几次镜头（一轮一两百句，大约十几句一次）。 */
export const MAX_CAMS_PER_TURN = 14
/**
 * 「間」：这一句的字出来之前先停一下。beat 顿一拍（对话框留着，先不出字），silence 沉默（对话框让开，只剩画面和环境声）。
 * 多久由剧场定（playback.js 的 PAUSE_MS），导演只说停不停、停多深。
 */
export const PAUSES = ['beat', 'silence']
export const MAX_PAUSES_PER_TURN = 6
/**
 * 同屏的人：没在说话的人对这句的反应（react），和台上的走位（move）。走位从那一句起保持，换了一堂布景、这个人退场或一轮结束时复位。
 * approach 走近某人（两人一起靠近）/ apart 拉开距离 / forward 上前一步 / back 退后一步 / turn 背过身 / face 转回来面对 / lookback 回眸 / reset 回到原位。
 */
export const MOVES = ['approach', 'apart', 'forward', 'back', 'turn', 'face', 'lookback', 'reset']
export const MOVE_LABEL = { approach: '靠近', apart: '拉开', forward: '上前', back: '后退', turn: '背过身', face: '转身面对', lookback: '回眸', reset: '复位' }
/** 登场方式：run 跑进来 / peek 从边上探头 / slow 慢慢走进来。退场方式：storm 甩头离开 / run 跑开 / slow 慢慢走远。不写就是平常的滑进滑出。 */
export const ENTER_HOWS = ['run', 'peek', 'slow']
export const EXIT_HOWS = ['storm', 'run', 'slow']
export const ENTER_HOW_LABEL = { run: '跑进来', peek: '探头', slow: '慢慢走进来' }
export const EXIT_HOW_LABEL = { storm: '甩头离开', run: '跑开', slow: '慢慢走远' }
/** 台词演法：同一句话怎么说出来（语速、停顿、字的样子、落字效果），规则在 lib/typing.js。 */
export const DELIVERIES = ['menace', 'excited', 'shout', 'hesitant', 'whisper', 'breakdown']
export const DELIVERY_LABEL = { menace: '威压', excited: '激动', shout: '怒吼', hesitant: '迟疑', whisper: '低语', breakdown: '崩溃' }
/** 句中文字效果：一句里某几个字的样子（发抖、波浪、放大、吼、越说越大 / 越小、小声、轻淡、发光强调），规则在 lib/typing.js 的 TEXT_FX。 */
export const TEXT_FX = ['shake', 'wave', 'big', 'roar', 'grow', 'dwindle', 'small', 'faint', 'glow']
export const TEXT_FX_LABEL = { shake: '发抖', wave: '波浪', big: '放大', roar: '吼', grow: '越说越大', dwindle: '越说越小', small: '小声', faint: '轻淡', glow: '发光强调' }
/** 一句最多几处文字效果、一轮最多几处（一轮有一两百句，按 IGS 一层两处的密度放宽）。 */
export const MAX_TEXT_FX_PER_LINE = 2
export const MAX_TEXT_FX_PER_TURN = 16
/** 屏幕天气 / 粒子。 */
export const WEATHER = ['clear', 'rain', 'storm', 'snow', 'blizzard', 'wind', 'sakura', 'leaves', 'fireflies', 'fog', 'embers', 'dust', 'bokeh', 'stars', 'sparkles', 'bubbles']
/** 时段：决定背景调色。 */
export const TIMES = ['dawn', 'morning', 'noon', 'afternoon', 'dusk', 'evening', 'night', 'midnight']
/** 转场。fade 是慢慢变过去（天色变了、时间流逝），blink 是闭眼再睁开，glitch 是画面撕裂，swirl 是旋转模糊着进去（入梦、穿越）。 */
export const TRANSITIONS = ['dissolve', 'fade', 'cinematic', 'wipe', 'iris', 'strips', 'black', 'flash', 'blink', 'glitch', 'swirl', 'haze', 'none']
/** 光线：同一个地方的光怎么照（关灯、停电、烛光、手电、霓虹、屏幕光、警报红光……），叠在背景和立绘上。 */
export const LIGHTS = ['normal', 'dim', 'dark', 'black', 'candle', 'spot', 'neon', 'screen', 'alarm', 'moon', 'warm', 'cold', 'glare', 'flicker']
/** 持续的画面效果：在船上摇晃、车里颠簸、手持镜头、缓慢推近、晕眩、热浪、水下、持续震动、速度线、心跳、慢动作、时间停止。 */
export const FX = ['none', 'sway', 'ride', 'handheld', 'drift', 'woozy', 'heat', 'underwater', 'rumble', 'speed', 'heartbeat', 'slowmo', 'timestop']
/** 声音的样子：电话里、广播 / 对讲机、心灵感应、几个人齐声、画外音（门外、远处、看不见的人）、空旷处的回声、机械音。对话框和打字音跟着变。 */
export const VOICES = ['phone', 'radio', 'telepathy', 'chorus', 'offscreen', 'echo', 'memory', 'machine']
/**
 * 插画怎么出现、停留、收起。照 galgame 的做法：绝大多数一张插画就是溶入 → 静止 → 溶回场景，
 * 其他几种按这一刻的分量和节奏选，不按画里画的是什么选（见 notes 里的研究：大厂的 CG 演出）。
 * 出现：dissolve 溶入（默认）、slow 慢慢溶入、black 暗场后浮现、flash 白闪、focus 由虚到实、cut 直接切入、impact 冲击（白闪 + 震动 + 重响）。
 */
export const CG_INS = ['dissolve', 'slow', 'black', 'flash', 'focus', 'cut', 'impact']
/** 收起：dissolve 溶回场景（默认）、slow 慢慢淡去、black 暗下去、flash 白闪、cut 直接切掉。 */
export const CG_OUTS = ['dissolve', 'slow', 'black', 'flash', 'cut']
/** 停留：still 静止（默认）、push 极慢地推近、pan 慢慢横移一遍（横版；竖版插画自己从上往下看一遍）。 */
export const CG_MOTIONS = ['still', 'push', 'pan']
/** 以前那一套花哨的写法（老存档、自定义提示词里还会有）换成现在最接近的一种。 */
const CG_IN_OLD = { sweep: 'dissolve', zoom: 'dissolve', iris: 'dissolve', bloom: 'slow', photo: 'slow', slide: 'cut', glitch: 'cut' }
const CG_OUT_OLD = { fade: 'dissolve', blur: 'slow', pull: 'slow', slide: 'cut', glitch: 'cut', shatter: 'flash' }
const CG_MOTION_OLD = { drift: 'still', breathe: 'still', pull: 'still', shake: 'still' }
const cgWord = (value, list, old) => { const text = String(value ?? '').trim().toLowerCase(); return list.includes(text) ? text : old[text] || '' }
export const cgIn = value => cgWord(value, CG_INS, CG_IN_OLD)
export const cgOut = value => cgWord(value, CG_OUTS, CG_OUT_OLD)
export const cgMotion = value => cgWord(value, CG_MOTIONS, CG_MOTION_OLD)
/**
 * 特殊段落：回忆、梦境、幻觉、想象、主观视角、内心世界、画面里（录像 / 监控 / 直播）、讲述中的故事、预见、虚拟世界。
 * 进入时剧场记下现实的场景、配乐和在场的人，回到现实（real）或这一轮结束时换回来。
 */
export const MODES = ['memory', 'dream', 'illusion', 'imagine', 'pov', 'inner', 'screen', 'tale', 'vision', 'digital']
/** 段落的中文名（剧场、人物志、写立绘提示词时用）。 */
export const MODE_NAMES = { memory: '回忆', dream: '梦境', illusion: '幻觉', imagine: '想象', pov: '主观视角', inner: '内心世界', screen: '画面中', tale: '故事中', vision: '预见', digital: '虚拟世界' }
/**
 * 短闪回的基调：切进闪回的方式、画面的色调、小头像的样子跟着变。导演写在闪回第一句的 recall 上（拿不准写 true），没写时剧场按情绪和氛围挑。
 * warm 温暖的怀念 / sweet 甜蜜心动 / sad 伤感、失去 / dread 不安、恐惧、创伤 / flash 猛然想起、灵光一闪 / haze 朦胧、记不清、像梦一样。
 */
export const RECALL_TONES = ['warm', 'sweet', 'sad', 'dread', 'flash', 'haze']
export const RECALL_TONE_NAMES = { warm: '温暖怀念', sweet: '甜蜜心动', sad: '伤感', dread: '不安', flash: '猛然想起', haze: '朦胧如梦' }
/** 过场字卡：时间跳跃（三小时后）、日期、章节、与此同时。 */
export const CUTS = ['time', 'date', 'chapter', 'meanwhile']
/** 情境卡片：短信、信件等不放在对话框里，单独演出。 */
export const CARDS = ['sms', 'letter', 'note', 'news', 'terminal', 'notice', 'diary', 'scroll']
/** 场景基调：场景卡上显示，剧场按它给画面调一层淡淡的色调，导演没选曲时前端按它粗配；silence 为关键时刻留白（不放音乐）。 */
export const MOODS = ['daily', 'cheerful', 'comic', 'sweet', 'touching', 'calm', 'solemn', 'sad', 'despair', 'tense', 'mystery', 'eerie', 'battle', 'heroic', 'silence']
/** 立绘站位。 */
/** 插画画幅；一张插画最多几个角色块（NovelAI V4.5 的上限）。 */
export const CG_SIZES = ['portrait', 'landscape', 'square']
export const CG_MAX_CHARACTERS = 6

export const POSITIONS = ['left', 'center', 'right', 'farleft', 'farright']

const DAYPART = { dawn: 'day', morning: 'day', noon: 'day', afternoon: 'day', dusk: 'dusk', evening: 'night', night: 'night', midnight: 'night' }
/** 背景只分日 / 黄昏 / 夜三档：同一地点同一档共用一张背景。 */
export const daypart = time => DAYPART[time] || 'day'
/** 几个人齐声说的一句，sp 写成「林岚、苏晴」：拆成每个人。 */
export const speakersOf = sp => String(sp || '').split(/[、，,&＆]/).map(s => s.trim()).filter(Boolean)
export const placeKey = scene => `${String(scene?.location || '').trim() || '未知地点'}|${daypart(scene?.time)}`

export function pick(value, list, fallback) {
  const text = String(value ?? '').trim().toLowerCase()
  return list.includes(text) ? text : fallback
}
