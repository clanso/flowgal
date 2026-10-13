// 亲密场面（R18）的声音与演出：触手、性爱场面里的音效、一段持续的节奏底、高潮和射精那一下的演出。
// 照小黄油 / 拔作的做法分三层（研究见 notes/R18音效与演出研究.md）：
//   一下一下的音效（插入、顶到最深处、射精、触手缠紧……）——导演写在那一句的 sfx 上，跟别的剧情音效一样读到那句时响；
//   节奏底（ループSE）——导演在场景上写 eros（爱抚、慢、快、激烈、余韵）和 tentacle（触手在暗处蠕动），剧场按拍子一直合成，节奏越来越快；
//   高潮那一下——导演在那一句写 peak（climax 高潮 / cum 射精 / both 一起），画面柔和地白一下、射精时一下一下地脉动。
// 画面上不出拟声字、不出爱心和漫画符号；声音都压在人声（打字音）和配乐下面。只用于成年人之间（导演提示词里写明）。
// 配方格式跟 lib/sounds.js 一样（纯数据，前端 src/client/theater/audio.js 现场合成），不需要音频文件。

const p = (wave, f, dur, gain, more = {}) => ({ wave, f, dur, gain, ...more })

/** 固定的伪随机（每个配方自己一个种子）：湿响里一团小水泡的音高、时间、响度错落开，但每次合成都一样。 */
function rng(seed) {
  let s = seed >>> 0
  return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296
}
/** 一个小水泡：正弦往上一挑，很短（黏液、水声的那一点「啾」）。 */
const bubble = (f, at, gain, dur = 0.045) => p('sine', f, dur, gain, { to: f * 2.2, attack: 0.003, at })
/** 一团湿响：n 个小水泡散在 start 起 spread 秒里，音高在 lo~hi 之间。 */
function wet(seed, n, start, spread, lo, hi, gain) {
  const r = rng(seed)
  return Array.from({ length: n }, () => bubble(lo + (hi - lo) * r(), start + spread * r(), gain * (0.55 + 0.45 * r()), 0.03 + 0.04 * r()))
}
/** 一下湿的挤压：窄带噪声滑过去（咕啾、噗啾）。带宽窄、能量小，所以 gain 要比宽带的大。 */
const squish = (from, to, at, gain, dur = 0.1, q = 3) => p('noise', from, dur, gain, { to, q, attack: 0.01, at })
/** 闷在身体里的一下低音（顶到最深处、被撞得一震、脉动）。 */
const thump = (f, at, gain, dur = 0.16) => p('sine', f, dur, gain, { to: f * 0.62, attack: 0.004, at })
/** 一下心跳（扑通）：重的一拍 + 轻的一拍，各带一点闷的「咚」（不然手机、笔记本的小喇叭放不出这么低的音）。 */
const lubdub = (at, gain) => [thump(64, at, gain, 0.15), p('noise', 210, 0.07, gain * 0.5, { q: 1.2, at }), thump(58, at + 0.19, gain * 0.72, 0.17), p('noise', 190, 0.07, gain * 0.35, { q: 1.2, at: at + 0.19 })]
/**
 * 整体调响度：配方写好后离线渲染一遍（Chromium 的 OfflineAudioContext，跟剧场同一套合成），
 * 去掉 250Hz 以下（小喇叭放不出来的）再量最响的 50 毫秒，对齐到跟内置拟声（啾、滴答、啪）差不多，乘的就是这个数。
 */
const level = (k, parts) => parts.map(x => ({ ...x, gain: +(x.gain * k).toFixed(4) }))

export const EROS_FOLEY = Object.freeze({
  // ── 性爱 ──
  // 深吻：两下湿的唇音，中间一点吸吮
  kiss: level(1.4, [squish(2400, 1500, 0, 0.5, 0.05, 4), bubble(900, 0.01, 0.06), squish(1900, 900, 0.17, 0.32, 0.16, 5), ...wet(11, 3, 0.2, 0.12, 700, 1300, 0.035)]),
  // 舔：湿的一下往上抹
  lick: level(1.6, [squish(1100, 2500, 0, 0.42, 0.22, 4.5), ...wet(12, 3, 0.08, 0.16, 800, 1600, 0.03)]),
  // 水声：手指、爱抚时咕啾咕啾的细碎湿响
  rub: level(1.3, [squish(1500, 900, 0, 0.3, 0.28, 3), ...wet(13, 7, 0.02, 0.32, 500, 1400, 0.035)]),
  // 插入：慢慢挤进去的压迫感（ぬぷ……ずぷぷ）——低的推挤 + 黏的摩擦 + 一串水泡，最后落到底
  insert: [p('noise', 420, 0.95, 0.5, { to: 230, q: 2.2, attack: 0.18 }), squish(1500, 700, 0.06, 0.3, 0.7, 5), ...wet(14, 6, 0.08, 0.6, 280, 700, 0.04), thump(85, 0.72, 0.12, 0.2)],
  // 顶到最深处：隔着身体闷闷的一下（こつん）
  deep: [thump(150, 0, 0.26, 0.2), p('triangle', 280, 0.09, 0.07, { to: 190, attack: 0.002, lp: 650 }), squish(700, 420, 0.01, 0.22, 0.08, 2.5)],
  // 抽插的一下（ずちゅ）：湿的挤压 + 一点低音，节奏底一拍一拍用它
  thrust: level(1.3, [squish(950, 360, 0, 0.55, 0.14, 2.6), squish(2300, 1300, 0.01, 0.2, 0.06, 5), ...wet(15, 3, 0, 0.08, 400, 900, 0.04), thump(100, 0.04, 0.09, 0.12)]),
  // 往回抽的那一下，轻一点（节奏底的反拍）
  draw: level(2.0, [squish(500, 1100, 0, 0.32, 0.12, 3), ...wet(16, 2, 0.04, 0.06, 600, 1100, 0.03)]),
  // 激烈时更重、更湿的一下
  'thrust-hard': [squish(1100, 320, 0, 0.7, 0.13, 2.2), squish(2600, 1200, 0, 0.26, 0.07, 4), ...wet(17, 4, 0, 0.07, 350, 1000, 0.05), thump(92, 0.02, 0.15, 0.13)],
  // 撞击（肉贴肉的啪）：比巴掌闷、短
  clap: [p('noise', 1500, 0.06, 0.3, { q: 0.9 }), p('noise', 650, 0.1, 0.18, { q: 0.8 }), thump(170, 0, 0.08, 0.07)],
  // 射精：一下一下的脉动（どくっ、どくっ），每一下低音 + 黏稠的涌出，越来越弱；时间跟画面的脉动（EROS_PULSES）对上
  cum: [0, 0.38, 0.78, 1.22].flatMap((at, i) => [thump(62, at, 0.3 - i * 0.055, 0.22), p('noise', 650, 0.24, 0.42 - i * 0.07, { to: 280, q: 1.8, attack: 0.012, at }), ...wet(20 + i, 3, at + 0.03, 0.12, 200, 480, 0.045 - i * 0.007)]),
  // 灌满、溢出来：低低的咕噜
  flood: level(1.4, [p('noise', 520, 0.55, 0.3, { to: 380, q: 2, attack: 0.04 }), ...wet(18, 9, 0, 0.6, 150, 420, 0.05)]),
  // 潮吹：一阵细的喷溅，后面几滴
  squirt: level(0.55, [p('noise', 3000, 0.5, 0.28, { to: 1700, q: 0.9, attack: 0.012 }), p('noise', 6000, 0.3, 0.1, { q: 1.2, attack: 0.008 }), ...wet(19, 5, 0.42, 0.5, 1200, 2400, 0.022)]),
  // 拔出来：啵的一声吸出（ぬぽっ）
  pull: level(0.75, [squish(600, 1500, 0, 0.36, 0.13, 3.5), bubble(300, 0.11, 0.12, 0.07), ...wet(30, 2, 0.15, 0.1, 500, 900, 0.03)]),
  // 吞咽：咕咚
  gulp: level(0.8, [p('sine', 230, 0.13, 0.13, { to: 120, attack: 0.006, lp: 900 }), squish(320, 220, 0, 0.3, 0.1, 2), bubble(260, 0.06, 0.06, 0.06)]),
  // 衣物摩擦、脱衣：沙沙的一下
  cloth: level(1.3, [p('noise', 3400, 0.36, 0.09, { to: 2400, q: 0.7, attack: 0.07 }), p('noise', 5200, 0.24, 0.05, { q: 1, attack: 0.04, at: 0.14 })]),
  // 床响：木头吱的一声（比门的吱呀低、短）
  bed: level(1.6, [p('sawtooth', 165, 0.26, 0.03, { to: 205, lp: 900, attack: 0.03 }), squish(900, 1100, 0.02, 0.18, 0.2, 7)]),
  // 锁链、镣铐：一串细的金属碰响
  chain: level(1.8, [...[2900, 3500, 2500, 3200, 2700].map((f, i) => p('sine', f, 0.12, 0.022, { attack: 0.001, at: i * 0.045 + (i % 2) * 0.012 })), p('noise', 4200, 0.06, 0.22, { q: 2 }), p('noise', 3600, 0.05, 0.16, { q: 2, at: 0.13 })]),
  // 喘息：两下气声（呼——哈）
  breath: level(0.8, [p('noise', 1100, 0.62, 0.16, { q: 0.8, attack: 0.25, hold: 0.08 }), p('noise', 2700, 0.5, 0.05, { q: 1.4, attack: 0.22 }), p('noise', 1000, 0.55, 0.12, { q: 0.8, attack: 0.2, at: 0.78 })]),
  // 心跳（没有铃声的那种，沉一点）
  pulse: lubdub(0, 0.3),
  // ── 触手 ──
  // 触手爬过：湿的长长一道滑过去（ずるり）
  slither: level(0.8, [p('noise', 380, 1, 0.45, { to: 720, q: 2.2, attack: 0.25 }), squish(1200, 1800, 0.05, 0.2, 0.8, 6), ...wet(31, 6, 0.1, 0.8, 250, 600, 0.03), thump(70, 0.85, 0.06, 0.2)]),
  // 小的扭动（节奏底里一下一下的）
  squirm: level(1.8, [squish(700, 1100, 0, 0.28, 0.22, 4), ...wet(32, 3, 0.04, 0.18, 300, 700, 0.03)]),
  // 缠紧、勒住：绷紧的吱声 + 黏的挤压
  coil: level(1.4, [p('sawtooth', 120, 0.32, 0.035, { to: 92, lp: 520, attack: 0.04 }), squish(720, 440, 0, 0.42, 0.32, 3), squish(2400, 2600, 0.12, 0.12, 0.12, 8), ...wet(33, 3, 0.05, 0.2, 260, 560, 0.035)]),
  // 黏液拉丝、黏糊糊的（ぬちゃ）
  goo: level(1.5, [squish(900, 480, 0, 0.42, 0.26, 6), ...wet(34, 3, 0.16, 0.14, 300, 650, 0.04), p('sine', 520, 0.08, 0.035, { to: 250, at: 0.2 })]),
  // 刺入：尖的一下，然后注入的咕噜
  prick: level(1.5, [p('noise', 5200, 0.025, 0.22, { q: 3 }), p('sine', 2200, 0.05, 0.03, { to: 1200, attack: 0.002 }), p('noise', 480, 0.42, 0.22, { q: 2, attack: 0.1, at: 0.08 }), bubble(300, 0.3, 0.05, 0.06)]),
  // 喷出甜腻的雾：嘶——
  mist: level(0.7, [p('noise', 4500, 0.85, 0.12, { to: 3000, q: 0.9, attack: 0.03, hold: 0.3 }), p('noise', 1200, 0.5, 0.08, { q: 1, attack: 0.05 })]),
  // 吸盘吸住又拉开：啵
  suck: level(0.7, [squish(500, 1200, 0, 0.32, 0.15, 3), bubble(260, 0.13, 0.13, 0.07)]),
  // 触手抽打：破风 + 湿的一下
  lash: [p('noise', 800, 0.2, 0.2, { to: 3500, q: 1.5, attack: 0.08 }), p('noise', 1800, 0.07, 0.36, { q: 0.8, at: 0.18 }), p('noise', 500, 0.14, 0.16, { q: 0.7, at: 0.18 }), ...wet(35, 3, 0.2, 0.08, 400, 900, 0.035)],
  // 人倒下：咚的一下闷响 + 衣服的沙沙（ドサ）
  collapse: [thump(92, 0, 0.3, 0.3), p('noise', 420, 0.25, 0.2, { q: 0.6 }), p('noise', 2600, 0.2, 0.05, { q: 0.8, attack: 0.02, at: 0.04 })],
  // ── 高潮那一下（peak）──
  // 高潮：心跳一下比一下快、底下一股往上涌的低音，耳边很轻的一声长鸣（脑子一片空白）
  climax: [...lubdub(0, 0.24), ...lubdub(0.36, 0.28), ...lubdub(0.66, 0.32), p('sine', 52, 2.2, 0.14, { attack: 0.5, to: 46 }), p('noise', 300, 1.8, 0.12, { q: 0.5, attack: 0.6 }), p('sine', 3150, 2.8, 0.011, { attack: 0.5, hold: 0.5 }), p('sine', 3520, 2.4, 0.007, { attack: 0.6 })],
})

/**
 * 导演写在 sfx 上的名字 → 配方。group 是设置里试听时分的组。
 * 正文里常见的日文拟声（小黄油的 [SE：ぬぷ……ずぷぷ……]）和别的写法见 EROS_ALIAS。
 */
export const EROS_SFX = Object.freeze({
  亲吻: { id: 'kiss', group: 'body' }, 舔: { id: 'lick', group: 'body' }, 水声: { id: 'rub', group: 'body' }, 插入: { id: 'insert', group: 'body' },
  顶到最深: { id: 'deep', group: 'body' }, 抽插: { id: 'thrust', group: 'body' }, 撞击: { id: 'clap', group: 'body' }, 射精: { id: 'cum', group: 'body' },
  灌满: { id: 'flood', group: 'body' }, 潮吹: { id: 'squirt', group: 'body' }, 拔出: { id: 'pull', group: 'body' }, 吞咽: { id: 'gulp', group: 'body' },
  衣物: { id: 'cloth', group: 'body' }, 床响: { id: 'bed', group: 'body' }, 锁链: { id: 'chain', group: 'body' }, 喘息: { id: 'breath', group: 'body' }, 心跳: { id: 'pulse', group: 'body' },
  触手爬过: { id: 'slither', group: 'tentacle' }, 缠紧: { id: 'coil', group: 'tentacle' }, 黏液: { id: 'goo', group: 'tentacle' }, 刺入: { id: 'prick', group: 'tentacle' },
  喷雾: { id: 'mist', group: 'tentacle' }, 吸附: { id: 'suck', group: 'tentacle' }, 抽打: { id: 'lash', group: 'tentacle' }, 倒下: { id: 'collapse', group: 'tentacle' },
})
/** 别的写法：中文近义词、小黄油里的日文拟声（平假名、片假名都认），换成上面的名字。 */
export const EROS_ALIAS = {
  深吻: '亲吻', 接吻: '亲吻', ちゅぷ: '亲吻', ちゅる: '亲吻', ちゅっ: '亲吻',
  舔舐: '舔', れろ: '舔', ぺろ: '舔', ぺろっ: '舔',
  爱抚: '水声', くちゅ: '水声', くちゅくちゅ: '水声', ちゅく: '水声', にちゅ: '水声',
  进入: '插入', ぬぷ: '插入', ずぷ: '插入', ずぷぷ: '插入', ずぶ: '插入', ずぶり: '插入', にゅぷ: '插入', ぐぷ: '插入', ぐぷっ: '插入',
  顶到: '顶到最深', 最深处: '顶到最深', こつん: '顶到最深', ごりっ: '顶到最深', ごちゅ: '顶到最深',
  ずちゅ: '抽插', ぐちゅ: '抽插', じゅぷ: '抽插', じゅぽ: '抽插', ぬちゅ: '抽插', ずちゅん: '抽插', ずちゅんっ: '抽插',
  ぱんっ: '撞击', ぱん: '撞击', ぱちゅん: '撞击',
  内射: '射精', 注入: '射精', どぷ: '射精', どぷっ: '射精', どぴゅ: '射精', びゅる: '射精', びゅるる: '射精', びゅくっ: '射精', どくどく: '射精', どくっ: '射精', びゅっ: '射精',
  溢出: '灌满', ごぽ: '灌满', ごぷ: '灌满', こぽ: '灌满', ごぼっ: '灌满',
  ぷしゃ: '潮吹', ぷしゃあ: '潮吹', ぷしゃっ: '潮吹',
  ぬぽっ: '拔出', ぬぽ: '拔出', ちゅぽん: '拔出',
  ごくっ: '吞咽', ごくん: '吞咽', こくん: '吞咽',
  脱衣: '衣物', 衣擦れ: '衣物', しゅる: '衣物', するっ: '衣物',
  床: '床响', ぎしっ: '床响', ぎし: '床响', ぎしぎし: '床响',
  镣铐: '锁链', じゃら: '锁链', じゃらっ: '锁链',
  喘气: '喘息', 吐息: '喘息', はぁ: '喘息',
  どくん: '心跳', 心音: '心跳', 心跳声: '心跳',
  触手: '触手爬过', 蠕动: '触手爬过', 爬行: '触手爬过', ずるり: '触手爬过', ずる: '触手爬过', ずるずる: '触手爬过', ずりゅ: '触手爬过', にゅる: '触手爬过', にゅるにゅる: '触手爬过',
  缠绕: '缠紧', 勒紧: '缠紧', ぎちっ: '缠紧', ぎちぎち: '缠紧', きゅっ: '缠紧', ぎゅっ: '缠紧',
  ぬちゃ: '黏液', にちゃ: '黏液', ねちゃ: '黏液', ぬるっ: '黏液', どろっ: '黏液',
  ちくっ: '刺入', ぷすっ: '刺入', ぷつっ: '刺入', 注射: '刺入',
  しゅー: '喷雾', ぷしゅー: '喷雾', 喷出: '喷雾',
  吸盘: '吸附', ちゅぱ: '吸附', きゅぽ: '吸附',
  ひゅっ: '抽打', ばしっ: '抽打', ぴしっ: '抽打',
  どさ: '倒下', どさっ: '倒下', どさり: '倒下', 倒地: '倒下',
}
const KATA = /[\u30a1-\u30f6]/g
const SEP = /[!！?？~～。.…、,，\s'"「」“”—―\-♡♥]+/
/** 日文拟声长的先认：「ずちゅんっ」「どくどくどくっ」这类拖了尾巴、连写的，按最长的那个开头认（中文的名字要写全）。 */
const KEYS = Object.keys(EROS_ALIAS).filter(k => /^[\u3041-\u309f\u30fc]{2,}$/.test(k)).sort((a, b) => b.length - a.length)
const nameOf = key => (EROS_SFX[key] ? key : EROS_ALIAS[key])
/**
 * 导演写的亲密场面音效认成上面的哪个名字：去掉标点、省略号、破折号，片假名当平假名认；
 * 一整句的舞台指示（「ずるり、と。湿った何かが床を這う音」）取第一个认得出的词；认不出为空。
 */
export function erosSfx(text) {
  const raw = String(text ?? '').replace(KATA, c => String.fromCharCode(c.charCodeAt(0) - 0x60))
  for (const word of raw.split(SEP).filter(Boolean)) {
    if (EROS_SFX[word] || EROS_ALIAS[word]) return nameOf(word)
    const key = KEYS.find(k => word.startsWith(k))
    if (key) return nameOf(key)
  }
  return ''
}
/** 导演写的名字本身就是上面列着的（不是别的写法）：跟内置拟声词撞了时它优先。 */
export const isErosName = text => Boolean(EROS_SFX[String(text ?? '').trim()])

/**
 * 节奏底（scene.eros）：一段持续的区间，从写的那一句起一直响，写 none 收起，换了地方、这一轮结束也收起。
 * tease 爱抚、前戏（不规则的细碎水声）/ slow 慢慢地（一下一下）/ fast 加快 / frantic 激烈（又快又重，带撞击）/ afterglow 余韵（心跳慢下来、喘息）。
 */
export const EROS_PACES = ['none', 'tease', 'slow', 'fast', 'frantic', 'afterglow']
export const EROS_LABEL = { none: '', tease: '爱抚', slow: '缓慢', fast: '加快', frantic: '激烈', afterglow: '余韵' }
/**
 * 触手（scene.tentacle）：画面边上有影子在蠕动，底下一直有湿的爬动声。idle 潜伏（偶尔一道）/ writhe 蠕动、缠绕（不停）/ none 收起。
 * 跟 eros 一起写时，抽插的那一下换成触手的（更黏、没有撞击声）。
 */
export const TENTACLE = ['none', 'idle', 'writhe']
export const TENTACLE_LABEL = { none: '', idle: '触手潜伏', writhe: '触手蠕动' }

/**
 * 节奏底的拍子：beat 一拍多少秒；hits 每拍里响的 [配方, 在这一拍的哪里（0~1）, 音量, 每几拍响一次]；
 * swing 每一下的时间随机前后晃多少（占一拍的比例），不那么机械。frantic 用 thrust-hard 加撞击。
 */
export const EROS_LOOPS = Object.freeze({
  tease: { beat: 1.7, swing: 0.3, hits: [['rub', 0, 0.75], ['lick', 0.55, 0.4, 3], ['kiss', 0.3, 0.45, 4]] },
  slow: { beat: 1.25, swing: 0.06, hits: [['thrust', 0, 0.8], ['draw', 0.5, 0.35], ['bed', 0.02, 0.4, 4]] },
  fast: { beat: 0.68, swing: 0.05, hits: [['thrust', 0, 0.78], ['draw', 0.5, 0.28], ['bed', 0.02, 0.35, 3]] },
  frantic: { beat: 0.44, swing: 0.04, hits: [['thrust-hard', 0, 0.85], ['clap', 0, 0.55], ['bed', 0.03, 0.4, 2]] },
  afterglow: { beat: 1.15, swing: 0.03, hits: [['pulse', 0, 0.5], ['breath', 0.3, 0.55, 4]] },
})
/** 触手的抽插：换掉肉贴肉的撞击和床响，抽插那一下后面多带一点黏液。 */
export const TENTACLE_SWAP = Object.freeze({ clap: 'squirm', bed: 'goo', draw: 'squirm' })
/** 触手的蠕动底：每隔 every 秒（在这个区间里随机）从 pool 里挑一个 [配方, 音量]。 */
export const TENTACLE_LOOPS = Object.freeze({
  idle: { every: [2.6, 6], pool: [['slither', 0.45], ['goo', 0.3], ['squirm', 0.3]] },
  writhe: { every: [0.45, 1.3], pool: [['squirm', 0.5], ['goo', 0.4], ['slither', 0.45], ['coil', 0.3]] },
})

/**
 * 高潮那一下（line.peak）：climax 高潮（画面柔和地白一下再慢慢回来，心跳、耳鸣）/ cum 射精（画面一下一下地脉动，跟声音的四下对上）/
 * both 一起（两样同时）。导演写成中文、日文的也认。
 */
export const PEAKS = ['climax', 'cum', 'both']
export const PEAK_LABEL = { climax: '高潮', cum: '射精', both: '一起高潮' }
const PEAK_ALIAS = { 高潮: 'climax', 绝顶: 'climax', 絶頂: 'climax', イく: 'climax', orgasm: 'climax', 射精: 'cum', 内射: 'cum', 注入: 'cum', ejaculation: 'cum', 一起: 'both', 同时: 'both', 一起高潮: 'both' }
export const peakOf = value => { const v = String(value ?? '').trim(); return PEAKS.includes(v.toLowerCase()) ? v.toLowerCase() : PEAK_ALIAS[v] || '' }
/** 各自响哪几个配方。 */
export const PEAK_FOLEY = Object.freeze({ climax: ['climax'], cum: ['cum'], both: ['climax', 'cum'] })
/** 射精时画面脉动的时间（毫秒），跟 cum 配方的四下对上。 */
export const EROS_PULSES = Object.freeze([0, 380, 780, 1220])
