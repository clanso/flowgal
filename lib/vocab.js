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
