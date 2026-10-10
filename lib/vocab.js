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
  sad: 'sad, frown, downcast eyes', cry: 'crying, tears', angry: 'angry, furrowed brow, clenched teeth',
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
  angry: '皱紧眉头瞪眼，咬牙，攥拳，肩膀绷紧、身体前倾',
  pout: '鼓脸噘嘴，抱臂，斜眼瞟人，身体侧过去一点',
  surprised: '眼睛睁大，嘴微张，手抬到胸前，身体往后一缩',
  scared: '瞳孔缩小，脸色发白，双手护在胸前，身体后缩发抖',
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
 * 只换脸时用的表情 tag：只写脸上的东西（眉、眼、嘴、脸红、泪、视线），不写动作。add 换进角色块，neg 加进这个人的负面。
 * 立绘设计师给这张写了表情时优先用它写的；没写或没开设计师时用这里的。
 */
export const EMOTION_FACE = {
  neutral: { add: 'neutral expression, closed mouth', neg: 'smile, frown, open mouth, tears' },
  smile: { add: 'light smile, closed mouth', neg: 'frown, open mouth, teeth, tears' },
  happy: { add: 'happy, smile, open mouth, raised eyebrows', neg: 'frown, sad, angry, closed eyes, tears' },
  laugh: { add: 'laughing, closed eyes, open mouth, smile', neg: 'frown, sad, angry, tears' },
  shy: { add: 'shy, embarrassed, light blush, looking away, wavy mouth, closed mouth', neg: 'open mouth, teeth, crying' },
  blush: { add: 'blush, full-face blush, embarrassed, wavy mouth, raised eyebrows', neg: 'crying, smile' },
  sad: { add: 'sad, worried eyebrows, downcast eyes, frown, closed mouth', neg: 'smile, happy, open mouth, tears' },
  cry: { add: 'crying, tears, streaming tears, sad, worried eyebrows, frown, open mouth', neg: 'smile, happy, laughing' },
  angry: { add: 'angry, v-shaped eyebrows, furrowed brow, glaring, clenched teeth', neg: 'smile, happy, blush, scar, bandaid' },
  pout: { add: 'pout, puffed cheeks, v-shaped eyebrows, looking to the side', neg: 'smile, open mouth, teeth' },
  surprised: { add: 'surprised, wide-eyed, raised eyebrows, open mouth, small pupils', neg: 'smile, closed eyes, half-closed eyes, frown' },
  scared: { add: 'scared, wide-eyed, worried eyebrows, constricted pupils, open mouth, sweat', neg: 'smile, happy, blush' },
  worried: { add: 'worried, worried eyebrows, frown, closed mouth', neg: 'smile, happy, open mouth, tears' },
  smug: { add: 'smug, smirk, half-closed eyes, raised eyebrow', neg: 'frown, sad, tears, open mouth' },
  serious: { add: 'serious, furrowed brow, closed mouth', neg: 'smile, open mouth, blush, tears' },
  tired: { add: 'tired, half-closed eyes, bags under eyes, closed mouth', neg: 'smile, wide-eyed' },
  love: { add: 'blush, heart-shaped pupils, smile, half-closed eyes', neg: 'frown, angry, tears' },
  confused: { add: 'confused, raised eyebrow, wavy mouth', neg: 'smile, tears' },
  thinking: { add: 'thinking, looking to the side, closed mouth', neg: 'smile, open mouth, tears' },
  determined: { add: 'determined, v-shaped eyebrows, serious, closed mouth', neg: 'smile, tears, blush' },
  cold: { add: 'expressionless, jitome, closed mouth', neg: 'smile, blush, open mouth, tears' },
  teasing: { add: 'naughty face, smirk, one eye closed', neg: 'frown, tears, sad' },
}

/** 情绪符号（漫画符）：在立绘头顶弹出，SVG 在 src/client/theater/symbols.js。 */
export const SYMBOLS = ['heart', 'anger', 'sweat', 'sparkle', 'surprise', 'gloom', 'note', 'zzz', 'bulb', 'heartbreak', 'sigh', 'dizzy', 'fire', 'blush', 'bloom', 'silence']
/** 镜头语言。 */
export const CAMERAS = ['shake', 'zoom', 'zoomout', 'flash', 'pan', 'blur', 'fadeblack', 'redflash', 'tilt']
/** 台词演法：同一句话怎么说出来（语速、停顿、字的样子、落字效果），规则在 lib/typing.js。 */
export const DELIVERIES = ['menace', 'excited', 'shout', 'hesitant', 'whisper', 'breakdown']
export const DELIVERY_LABEL = { menace: '威压', excited: '激动', shout: '怒吼', hesitant: '迟疑', whisper: '低语', breakdown: '崩溃' }
/** 屏幕天气 / 粒子。 */
export const WEATHER = ['clear', 'rain', 'storm', 'snow', 'sakura', 'leaves', 'fireflies', 'fog', 'embers', 'dust', 'bokeh', 'stars']
/** 时段：决定背景调色。 */
export const TIMES = ['dawn', 'morning', 'noon', 'afternoon', 'dusk', 'evening', 'night', 'midnight']
/** 转场。 */
export const TRANSITIONS = ['dissolve', 'cinematic', 'wipe', 'iris', 'strips', 'black', 'flash', 'none']
/** 情境卡片：短信、信件等不放在对话框里，单独演出。 */
export const CARDS = ['sms', 'letter', 'note', 'news', 'terminal', 'notice', 'diary', 'scroll']
/** 场景基调：场景卡上显示，导演没选曲时前端按它粗配；silence 为关键时刻留白（不放音乐）。 */
export const MOODS = ['daily', 'cheerful', 'sweet', 'calm', 'sad', 'tense', 'battle', 'eerie', 'silence']
/** 立绘站位。 */
/** 插画画幅；一张插画最多几个角色块（NovelAI V4.5 的上限）。 */
export const CG_SIZES = ['portrait', 'landscape', 'square']
export const CG_MAX_CHARACTERS = 6

export const POSITIONS = ['left', 'center', 'right', 'farleft', 'farright']

const DAYPART = { dawn: 'day', morning: 'day', noon: 'day', afternoon: 'day', dusk: 'dusk', evening: 'night', night: 'night', midnight: 'night' }
/** 背景只分日 / 黄昏 / 夜三档：同一地点同一档共用一张背景。 */
export const daypart = time => DAYPART[time] || 'day'
export const placeKey = scene => `${String(scene?.location || '').trim() || '未知地点'}|${daypart(scene?.time)}`

export function pick(value, list, fallback) {
  const text = String(value ?? '').trim().toLowerCase()
  return list.includes(text) ? text : fallback
}
