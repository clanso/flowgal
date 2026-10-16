// 导演可用的演出词汇。前后端共用：后端用来校验，前端用来渲染。
export const EMOTIONS = {
  neutral: '平静', smile: '微笑', happy: '开心', laugh: '大笑', shy: '害羞', blush: '脸红',
  sad: '难过', cry: '哭泣', angry: '生气', pout: '赌气', surprised: '惊讶', scared: '害怕',
  worried: '担心', smug: '得意', serious: '认真', tired: '疲惫', love: '心动', confused: '困惑',
  thinking: '思考', determined: '坚定', cold: '冷淡', teasing: '调侃',
  disgust: '嫌弃', wry: '无奈', guilty: '心虚', wronged: '委屈', suspicious: '怀疑', passion: '动情',
}

/**
 * 内置情绪「用在」什么场面：导演挑情绪时看它，表演设计师、立绘设计师靠它跟挨得近的情绪拉开差别（得意和调侃、担心和心虚、冷淡和嫌弃）。
 * 照 IGS 的情绪组（每组写明用在哪）。情绪库里能改。
 */
export const EMOTION_USE = {
  neutral: '没有明显情绪的日常对话、刚出场、在一旁听着',
  smile: '日常对话的底色，客气、温和、放下心来',
  happy: '高兴、被逗乐、收到好意、期待成真',
  laugh: '笑到停不下来、气氛最热的时候',
  shy: '被夸、被盯着看、说漏嘴、不好意思',
  blush: '害羞到满脸通红、被说中心事、窘到想躲起来',
  sad: '失落、被拒绝、听到坏消息',
  cry: '忍不住哭、情绪崩溃、喜极而泣',
  angry: '真的发火、吵架、被触到底线',
  pout: '闹小脾气、吃醋、故意不理、撒娇式的不满',
  surprised: '意外的消息、超出预料、被突然搭话',
  scared: '被吓到、遇到危险、恐怖的场面',
  worried: '担心别人、等结果、心里不安',
  smug: '赢了、占上风、被夸了翘尾巴、炫耀',
  serious: '说正事、严肃的话题、专心做事',
  tired: '累了、困了、熬完夜、提不起劲',
  love: '喜欢对方、被打动、想靠近、撒娇',
  confused: '没听懂、摸不着头脑、事情对不上',
  thinking: '想事情、犹豫、回想、在拿主意',
  determined: '下定决心、表态、要去做一件难事',
  cold: '不想理人、好感低、生闷气、敷衍',
  teasing: '逗对方、开玩笑、坏心眼地捉弄',
  disgust: '看不上对方、被恶心到、给人脸色',
  wry: '拿对方没办法、被为难只能硬接、苦笑着认了',
  guilty: '说谎被戳穿、做了亏心事、想蒙混过去',
  wronged: '被冤枉、被凶了、受了气想讨个说法',
  suspicious: '初次见面、来历不明、听到可疑的话、试探',
  passion: '告白前后、接吻前、两个人的距离一下拉近的那一刻',
}

/**
 * 内置情绪的近义词（顿号隔开）：导演或正文写到它们，直接当作这一种（不新造一种、不多画一张），见 lib/emotions.js 的 resolveEmotion。
 * 一个词只归一种。情绪库里能改。
 */
export const EMOTION_WORDS = {
  neutral: '无表情、面无表情、淡然、沉默、发呆、放空、无语',
  smile: '浅笑、含笑、温和、安心、放心、欣慰、释然、从容',
  happy: '高兴、快乐、喜悦、愉快、欣喜、满足、幸福、期待、雀跃、兴奋',
  laugh: '哈哈大笑、捧腹、狂笑、笑出声、爆笑、狂喜',
  shy: '羞涩、腼腆、不好意思、扭捏、难为情、羞怯',
  blush: '羞红、面红耳赤、羞耻、窘迫',
  sad: '伤心、悲伤、失落、沮丧、失望、低落、孤独、黯然',
  cry: '哭、流泪、落泪、哽咽、痛哭、抽泣、泪目、崩溃',
  angry: '愤怒、发火、恼火、火大、气愤、暴怒、怒斥',
  pout: '不满、闹别扭、噘嘴、鼓脸、吃醋、嫉妒、使性子',
  surprised: '吃惊、震惊、错愕、愣住、目瞪口呆、意外、诧异、惊呆',
  scared: '恐惧、惊恐、吓坏、发抖、畏惧、胆怯、惊慌',
  worried: '担忧、不安、焦虑、紧张、忐忑、发愁、心神不宁',
  smug: '骄傲、自豪、自信、炫耀、洋洋得意、神气、显摆',
  serious: '严肃、正经、郑重、专注、一本正经、凝重',
  tired: '疲倦、累、困、乏力、没精神、倦怠、困倦',
  love: '喜欢、爱慕、倾心、怦然心动、宠溺、甜蜜、撒娇、黏人',
  confused: '疑惑、不解、迷惑、茫然、懵、一头雾水',
  thinking: '沉思、琢磨、回忆、思索、犹豫、纠结、斟酌',
  determined: '决心、坚决、毅然、果断、斗志、不服输',
  cold: '冷漠、漠然、疏离、无视、敷衍、爱答不理、高冷',
  teasing: '坏笑、捉弄、揶揄、戏谑、打趣、逗弄、使坏',
  disgust: '厌恶、反感、恶心、鄙视、不屑、白眼、冷哼、膈应',
  wry: '苦笑、没辙、叹气、哭笑不得、尴尬、认命、扶额',
  guilty: '理亏、愧疚、内疚、做贼心虚、装傻、搪塞、支吾、躲闪',
  wronged: '憋屈、冤枉、受气、不甘、欲哭无泪、可怜巴巴',
  suspicious: '猜疑、狐疑、戒备、警惕、审视、试探、半信半疑、提防',
  passion: '情动、迷离、意乱情迷、心醉、沉醉、陶醉',
}

/**
 * 内置情绪默认的替身：这张还没画好时先用哪张，照 IGS 的回退链按同一个方向往回找（委屈 → 难过 → 担心 → 平静）。没列的跟它那一类的代表情绪、再跟平静。
 */
export const EMOTION_BASE = {
  smile: 'neutral', worried: 'neutral', happy: 'smile', laugh: 'happy', shy: 'smile', blush: 'shy',
  sad: 'worried', cry: 'sad', pout: 'angry', scared: 'worried', smug: 'smile', teasing: 'smug',
  serious: 'neutral', determined: 'serious', love: 'shy', confused: 'thinking', thinking: 'neutral',
  disgust: 'cold', wry: 'smile', guilty: 'worried', wronged: 'sad', suspicious: 'cold', passion: 'love',
}

/**
 * 情绪的强弱（换脸用，见 lib/face-paint.js）：1 微（小变化，低重绘强度留住原来的线条和颜色）、2 中、3 强、4 极（最激烈的，默认不换脸、整张画）。
 * 表演设计师按这个人给每种情绪标（同样是开心，元气的人比高冷的人强一档），这里是没标时的默认；新情绪跟着它的替身。
 */
export const EMOTION_LEVEL = {
  neutral: 1, smile: 1, happy: 2, laugh: 4, shy: 1, blush: 2, sad: 2, cry: 4, angry: 3, pout: 2, surprised: 3, scared: 4,
  worried: 2, smug: 1, serious: 1, tired: 1, love: 2, confused: 1, thinking: 1, determined: 1, cold: 1, teasing: 2,
  disgust: 2, wry: 1, guilty: 2, wronged: 2, suspicious: 1, passion: 2,
}

/**
 * 没在说话的人对一句话有反应时，身子怎么一动（剧场的动画在 Stage.jsx 的 REACT_FRAMES）。
 * 每种情绪都能在情绪库里改；新情绪没设的跟着替身、再跟它那一类的代表情绪（lib/emotions.js 的 emotionReact）。
 */
export const REACT_KINDS = ['jolt', 'shrink', 'bounce', 'droop', 'shake', 'nod', 'tilt', 'still']
export const REACT_NAMES = { jolt: '一惊往上一缩', shrink: '害羞缩肩', bounce: '笑得一颤', droop: '垂下去', shake: '气得一抖', nod: '轻轻点头', tilt: '歪头', still: '不动' }
/** 内置情绪默认的反应（没列的轻轻点头）。 */
export const EMOTION_REACT = {
  surprised: 'jolt', scared: 'jolt',
  shy: 'shrink', blush: 'shrink', love: 'shrink', guilty: 'shrink', passion: 'shrink',
  happy: 'bounce', laugh: 'bounce', smug: 'bounce', teasing: 'bounce',
  sad: 'droop', cry: 'droop', tired: 'droop', worried: 'droop', wronged: 'droop', wry: 'droop',
  angry: 'shake', pout: 'shake', cold: 'shake', disgust: 'shake',
  confused: 'tilt', thinking: 'tilt', suspicious: 'tilt',
}
/**
 * 短闪回导演没写基调时，闪回里出现这种情绪就按它挑（lib/scenes.js 的 autoRecallTone）。none：这种情绪不影响基调。
 * 几种情绪挑出的不一样时按 RECALL_PRIORITY 的先后（不安 > 伤感 > 甜蜜 > …）。内置情绪没列的是 none。
 */
export const EMOTION_RECALL = {
  scared: 'dread', angry: 'dread',
  sad: 'sad', cry: 'sad', tired: 'sad', worried: 'sad', wronged: 'sad',
  love: 'sweet', blush: 'sweet', shy: 'sweet', teasing: 'sweet', passion: 'sweet',
}
export const RECALL_PRIORITY = ['dread', 'sad', 'sweet', 'flash', 'haze', 'warm']

export const EMOTION_TAGS = {
  neutral: 'neutral expression, closed mouth', smile: 'light smile', happy: 'happy, smile, open mouth',
  laugh: 'laughing, closed eyes, open mouth', shy: 'shy, looking away, light blush', blush: 'blush, embarrassed',
  sad: 'sad, frown, downcast eyes', cry: 'crying, tears', angry: 'angry, furrowed brow, frown',
  pout: 'pout, puffed cheeks', surprised: 'surprised, wide eyes, open mouth', scared: 'scared, trembling',
  worried: 'worried, frown', smug: 'smug, smirk', serious: 'serious, expressionless', tired: 'tired, half-closed eyes',
  love: 'blush, heart-shaped pupils, smile', confused: 'confused, head tilt', thinking: 'thinking, hand on chin',
  determined: 'determined, serious', cold: 'expressionless, cold eyes', teasing: 'teasing smile, one eye closed',
  disgust: 'disgust, frown, narrowed eyes, sideways glance', wry: 'wry smile, half-closed eyes, sigh',
  guilty: 'nervous smile, looking to the side, sweatdrop', wronged: 'pout, teary eyes, holding back tears, looking up',
  suspicious: 'suspicious, narrowed eyes, raised eyebrow', passion: 'blush, half-closed eyes, parted lips, light smile',
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
  pout: '鼓脸噘嘴，抱臂，斜眼瞟人，头偏开一点',
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
  disgust: '眉头皱起，嘴角撇下去，下巴往后一收，视线斜着带刺，手挡在身前像要推开',
  wry: '苦笑，眉毛八字耷拉，肩膀一垮，一只手挠后脑或摊开手掌',
  guilty: '干笑，眼神飘开不敢看人，手指挠脸颊或背到身后，肩膀缩着',
  wronged: '噘着嘴，眼眶含泪忍着不掉，抬眼看人，手攥着衣角',
  suspicious: '眯起眼盯着对方，眉毛一高一低，抱臂或一只手挡在身前，身子往后留着距离',
  passion: '眼神湿润地看着对方，嘴唇微张，脸红，身子不自觉地凑近，一只手按在胸口',
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
}
/** 内置情绪默认归哪个动作组（设置里可以改；导演新造的情绪跟着它最接近的内置情绪走）。 */
export const EMOTION_POSE = {
  neutral: 'daily', smile: 'daily', happy: 'daily', laugh: 'daily', sad: 'daily', cry: 'daily', serious: 'daily', tired: 'daily',
  cold: 'arms', angry: 'arms', smug: 'arms', pout: 'arms',
  worried: 'chest', shy: 'chest', blush: 'chest', love: 'chest', scared: 'chest', surprised: 'chest', determined: 'chest',
  thinking: 'chin', confused: 'chin', teasing: 'chin',
  disgust: 'arms', suspicious: 'arms', wry: 'daily', guilty: 'chest', wronged: 'chest', passion: 'chest',
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
  disgust: { add: 'disgust, frown, narrowed eyes, closed mouth', neg: 'smile, blush, tears' },
  wry: { add: 'wry smile, half-closed eyes, worried eyebrows', neg: 'open mouth, tears, frown' },
  guilty: { add: 'nervous smile, looking to the side, worried eyebrows, sweatdrop', neg: 'frown, tears, open mouth' },
  wronged: { add: 'pout, teary eyes, worried eyebrows, looking up', neg: 'smile, open mouth, laughing' },
  suspicious: { add: 'suspicious, narrowed eyes, raised eyebrow, closed mouth', neg: 'smile, blush, tears' },
  passion: { add: 'blush, half-closed eyes, parted lips', neg: 'frown, angry, tears' },
}

/** 情绪符号：剧场不画出来，只让这个人身子跟着一动（Stage.jsx 的 SYM_MOTION）。 */
export const SYMBOLS = ['heart', 'anger', 'sweat', 'sparkle', 'surprise', 'gloom', 'note', 'zzz', 'bulb', 'heartbreak', 'sigh', 'dizzy', 'fire', 'blush', 'bloom', 'silence']
/**
 * 镜头语言。只管写的那一句，下一句镜头自己缓回来。zoom / closeup / lowangle / slowpush / focus 对准一个人（camOn，默认说话的人）。
 */
export const CAMERAS = ['shake', 'throb', 'zoom', 'zoomout', 'flash', 'pan', 'blur', 'fadeblack', 'redflash', 'tilt', 'closeup', 'focus', 'whip', 'sink', 'rise', 'lowangle', 'dolly', 'empty', 'slowpush', 'rackfocus']
export const AIMED_CAMERAS = new Set(['zoom', 'closeup', 'lowangle', 'slowpush', 'focus'])
/**
 * 打斗：hit 一次出手（from 出手的人、to 目标，主角写「我」；move 招式名，只记不显示；effect 效果）。不显示伤害数字，不出开战、胜负的卡片。
 */
export const HIT_EFFECTS = ['hit', 'crit', 'miss', 'block', 'down', 'heal']
export const HIT_EFFECT_LABEL = { hit: '命中', crit: '暴击', miss: '闪避', block: '格挡', down: '击倒', heal: '治疗' }
/**
 * 小瞬间：一句里发生的一件具体的小事，剧场演一下就过去（画面、卡片、合成的声音）。
 * photo 拍照（text 照片下的题字）/ touch 心动的触碰（text 动作，如「牵手」）/ pat 摸头（who 被摸的人）/ poke 戳脸（who）/
 * cheers 干杯（text 杯子的材质）/ fireworks 烟花 / cook 做好一道菜（text 菜名）/ nickname 新称呼（who 谁这样叫，text 新称呼）/
 * promise 约定（text 时间，place 地点）/ contact 交换联系方式（who）。
 */
export const MOMENTS = ['photo', 'touch', 'pat', 'poke', 'cheers', 'fireworks', 'cook', 'nickname', 'promise', 'contact']
export const MOMENT_LABEL = { photo: '拍照', touch: '触碰', pat: '摸头', poke: '戳脸', cheers: '干杯', fireworks: '烟花', cook: '做好一道菜', nickname: '新称呼', promise: '约定', contact: '交换联系方式' }
/** 干杯的杯子：玻璃、陶瓷、塑料、易拉罐、木、金属，碰出来的声音不一样。导演写中文也认。 */
export const CHEERS = ['glass', 'ceramic', 'plastic', 'can', 'wood', 'metal']
export const CHEERS_ZH = { 玻璃: 'glass', 陶瓷: 'ceramic', 塑料: 'plastic', 易拉罐: 'can', 木: 'wood', 金属: 'metal' }
/** 一定要写 text 才演得出来的小瞬间。 */
export const MOMENT_NEEDS_TEXT = new Set(['nickname', 'promise', 'cook'])
/** 一轮里只演一次的（第一次才算数）。 */
export const MOMENT_ONCE = new Set(['nickname', 'promise', 'contact'])
/**
 * 手机：call 有人打来（手机响起的那一句，who 是来电的人）/ dial 主角打给别人（who 是打给谁），视频通话写 video；
 * end 挂断（result：missed 没接通 / declined 被拒接 / hungup 对方挂断，正常说完挂掉不写）；
 * notify 弹出一条通知或短消息，不打断叙事（who 发送的人或 App，text 一句话内容）/ voicemail 语音留言（who、text）。
 * 剧场里来电时手机在画面一侧响起，接通后右上角挂着「通话中」和计时，对方的台词按电话里的声音演；通知从上面滑下来一条横幅。
 */
export const PHONE_KINDS = ['call', 'dial', 'end', 'notify', 'voicemail']
export const PHONE_LABEL = { call: '来电', dial: '拨出', end: '挂断', notify: '通知', voicemail: '语音留言' }
export const CALL_ENDS = ['missed', 'declined', 'hungup']
export const CALL_END_LABEL = { missed: '没接通', declined: '拒接', hungup: '对方挂断' }
/** 导演写成中文、或者 IGS 那种写法的也认。 */
export const PHONE_ALIASES = { video: 'call', 'call-end': 'end', hangup: 'end', 来电: 'call', 拨出: 'dial', 挂断: 'end', 通知: 'notify', 短信: 'notify', 语音留言: 'voicemail', 留言: 'voicemail' }
export const CALL_END_ALIASES = { 未接: 'missed', 没接通: 'missed', 无人接听: 'missed', 拒接: 'declined', 对方挂断: 'hungup' }
/** 通知、留言少了内容演不出来。 */
export const PHONE_NEEDS_TEXT = new Set(['notify', 'voicemail'])
/**
 * 「間」：这一句的字出来之前先停一下。beat 顿一拍（对话框留着，先不出字），silence 沉默（对话框让开，只剩画面和环境声）。
 * 多久由剧场定（playback.js 的 PAUSE_MS），导演只说停不停、停多深。
 */
export const PAUSES = ['beat', 'silence']
/**
 * 配乐留白：告白、噩耗、真相揭晓这类要屏住呼吸的那一句，导演在那一句写 bgm: hush——配乐在这句之前停下，
 * 几句之后自己回到原来的曲子（几句由剧场定，playback.js 的 HUSH_BEATS）。不算换歌；一轮几次见设置（lib/limits.js）。导演写成中文的也认。
 */
export const HUSH_ALIASES = ['hush', '留白', '无声', '屏息', '静默']
/**
 * 同屏的人：没在说话的人对这句的反应（react），和台上的走位（move）。走位从那一句起保持，换了一堂布景、这个人退场或一轮结束时复位。
 * approach 走近某人（两人一起靠近）/ apart 拉开距离 / forward 上前一步 / back 退后一步 / turn 背过身 / face 转回来面对 / lookback 回眸 /
 * hide 躲到某人身后（开口也还躲在他后面，上前、走近、拉开、复位时出来）/ reset 回到原位。
 */
export const MOVES = ['approach', 'apart', 'forward', 'back', 'turn', 'face', 'lookback', 'hide', 'reset']
export const MOVE_LABEL = { approach: '靠近', apart: '拉开', forward: '上前', back: '后退', turn: '背过身', face: '转身面对', lookback: '回眸', hide: '躲到身后', reset: '复位' }
/** 登场方式：run 跑进来 / peek 从边上探头 / slow 慢慢走进来。退场方式：storm 甩头离开 / run 跑开 / slow 慢慢走远。不写就是平常的滑进滑出。 */
export const ENTER_HOWS = ['run', 'peek', 'slow']
export const EXIT_HOWS = ['storm', 'run', 'slow']
export const ENTER_HOW_LABEL = { run: '跑进来', peek: '探头', slow: '慢慢走进来' }
export const EXIT_HOW_LABEL = { storm: '甩头离开', run: '跑开', slow: '慢慢走远' }
/** 台词演法：同一句话怎么说出来（语速、停顿、字的样子、落字效果），规则在 lib/typing.js。 */
export const DELIVERIES = ['menace', 'excited', 'shout', 'hesitant', 'whisper', 'breakdown', 'chatter']
export const DELIVERY_LABEL = { menace: '威压', excited: '激动', shout: '怒吼', hesitant: '迟疑', whisper: '低语', breakdown: '崩溃', chatter: '连珠炮' }
/** 句中文字效果：一句里某几个字的样子（发抖、波浪、放大、吼、越说越大 / 越小、小声、轻淡、发光强调、暖意、冰冷、着重号、哽咽、心醉），规则在 lib/typing.js 的 TEXT_FX。 */
export const TEXT_FX = ['shake', 'wave', 'big', 'roar', 'grow', 'dwindle', 'small', 'faint', 'glow', 'warm', 'cold', 'dot', 'choke', 'flutter']
export const TEXT_FX_LABEL = { shake: '发抖', wave: '波浪', big: '放大', roar: '吼', grow: '越说越大', dwindle: '越说越小', small: '小声', faint: '轻淡', glow: '发光强调', warm: '暖意', cold: '冰冷', dot: '着重号', choke: '哽咽', flutter: '心醉' }
/** 屏幕天气 / 粒子。 */
export const WEATHER = ['clear', 'rain', 'storm', 'snow', 'blizzard', 'wind', 'sakura', 'leaves', 'fireflies', 'fog', 'embers', 'dust', 'bokeh', 'stars', 'sparkles', 'bubbles']
/** 时段：决定背景调色。 */
export const TIMES = ['dawn', 'morning', 'noon', 'afternoon', 'dusk', 'evening', 'night', 'midnight']
/** 转场。fade 是慢慢变过去（天色变了、时间流逝），blink 是闭眼再睁开，glitch 是画面撕裂，swirl 是旋转模糊着进去（入梦、穿越）。 */
export const TRANSITIONS = ['dissolve', 'fade', 'cinematic', 'wipe', 'iris', 'strips', 'black', 'flash', 'blink', 'glitch', 'swirl', 'haze', 'none']
/** 光线：同一个地方的光怎么照（关灯、停电、烛光、手电、霓虹、屏幕光、警报红光、窗外斜进来的光柱、胶片漏光、逆光光斑……），叠在背景和立绘上。 */
export const LIGHTS = ['normal', 'dim', 'dark', 'black', 'candle', 'spot', 'neon', 'screen', 'alarm', 'moon', 'warm', 'cold', 'glare', 'flicker', 'sunbeam', 'leak', 'flare']
/** 持续的画面效果：在船上摇晃、车里颠簸、手持镜头、缓慢推近、晕眩、热浪、水下、持续震动、速度线、心跳、慢心跳、急促心跳、慢动作、时间停止、眼前这一幕慢慢褪成回忆。 */
export const FX = ['none', 'sway', 'ride', 'handheld', 'drift', 'woozy', 'heat', 'underwater', 'rumble', 'speed', 'heartbeat', 'pulse', 'palpitate', 'slowmo', 'timestop', 'fading']
/**
 * 亲密氛围：一段持续的区间（跟光线一样从写的那一句起生效，写 none 收起，换了地方自动收起）。
 * ambiguous 暧昧（淡粉的柔光、慢慢飘的光斑）、intimate 亲密（温润的蜜桃暖粉柔光与缓缓流淌的光晕，人离得更近）。只是画面，不加任何露骨的东西。
 */
export const ROMANCE = ['none', 'ambiguous', 'intimate']
export const ROMANCE_LABEL = { none: '', ambiguous: '暧昧', intimate: '亲密' }
/**
 * 感官主导的一段：blind 蒙眼（几乎全黑，只从边上透一点光）、ear 耳边（说话的人那一侧贴近发暖、另一侧糊掉）、touch 触碰（一圈暖光漾开）、
 * heat 发烫（红晕、空气微微扭动）、cold 发凉（冷蓝、边上起霜）、scent 香气（淡淡的雾、飘浮的微光）、breath 屏息（四周收紧、画面停住）、
 * daze 失神（失焦、重影、慢慢晃）、pulse 心音（贴在胸口听见对方沉稳温热的心跳脉搏）。写 none 恢复；不跨轮带着，换了地方也收起。
 */
export const SENSES = ['none', 'blind', 'ear', 'touch', 'heat', 'cold', 'scent', 'breath', 'daze', 'pulse']
export const SENSE_LABEL = { none: '', blind: '蒙眼', ear: '耳边', touch: '触碰', heat: '发烫', cold: '发凉', scent: '香气', breath: '屏息', daze: '失神', pulse: '心音' }
/** 电影黑边：严肃的一段（对峙、真相揭开、告别、决战前夕）一直挂着上下黑边，写 none 收起；换了地方自动收起。导演也可以写 true / false。 */
export const BARS = ['none', 'on']
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
/** 自动插画的方向（设置 → 画风与配图）：auto 插画分镜师按构图挑，landscape 都出横图，portrait 都出竖图。玩家自己加的、鉴赏里单张改的不受它管。 */
export const CG_ORIENTATIONS = ['auto', 'landscape', 'portrait']
/** 设置里定死的方向；交给 AI 判断时为空。 */
export const fixedCgShape = config => (config?.images?.cgShape === 'landscape' || config?.images?.cgShape === 'portrait' ? config.images.cgShape : '')
/** 露骨的场面（nsfw）一轮至少画这么多张：导演只挑了一张时，插件在同一段里补一张。 */
export const NSFW_MIN_IMAGES = 2
/** 导演写的 nsfw 标记：true / "true" / yes 都认。 */
export const isNsfwFlag = value => value === true || /^(true|yes|1|nsfw)$/i.test(String(value ?? '').trim())

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
