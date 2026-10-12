// 预览用的一小段原创剧情（三轮 + 一轮演示「先文本后整理」），以及每轮对应的导演输出和插画分镜。
// 第 2 轮导演自创一个复合情绪「害羞地强装镇定」，第 4 轮林岚换上冬季制服，用来演示立绘差分。
// 第 1 轮的插画是竖版，用来演示剧场里竖图的摇镜；第 2 轮的插画显示三句就收起。
// 登场 / 退场：第 2 轮苏晴中途跑进来，第 3 轮从边上探头、开口时才走进来，又冒雨跑走；第 4 轮林岚在说话那一句才出现。
// 同屏的人：第 2 轮我说「很可疑」时苏晴赌气、林岚偷笑，林岚塞信封时上前一步；第 3 轮苏晴喊「不能去」时上前一步。
// 台词演法与重音：威压（不许走神）、迟疑（抱歉……）、激动（苏晴喊人）、重音（很可疑）、低语（信封那两句），
// 第 3 轮苏晴的怒吼、说说停停和崩溃（旧校舍的事）。
// 漫画式切入：第 3 轮苏晴喊「不行！」那一句、第 4 轮林岚「你来了」。
// 镜头：第 1 轮「你终于来了」推近对准林岚、「不许走神」背景虚化，第 2 轮「只给你一个人」特写，第 3 轮「旧校舍」推近对准右边的苏晴、最后一句空镜，第 4 轮「你来了」仰拍。
// 亲密氛围：第 1 轮林岚回过头起暧昧；感官：第 2 轮「只给你一个人」贴在耳边。
// 电影黑边：第 3 轮苏晴说起旧校舍到她冒雨跑走那一段。
// 句中文字效果：第 1 轮心声「好像有点不一样」越说越小，第 2 轮苏晴「好巧啊」波浪，第 3 轮「旧校舍……那里」「那、那间教室里」发抖、「不行！」吼出来。
// 第 3 轮的原文像很多角色卡那样夹着状态栏、变量更新和章节尾巴（raw），导演把它们标成不演。
// 场景逐句变：第 3 轮闪电那句路灯闪烁、苏晴跑走后暗下来；第 4 轮先出「翌日 放学后」字卡，中途进入三年前的回忆，
// 回到现实时灯一盏盏熄灭（换成诡异、停掉音乐），林岚在黑暗里出现时打上一束光。
// 内置拟声音效：第 1 轮推开琴房的门「吱呀」，第 3 轮闪电「轰」。
// 特效：第 3 轮苏晴说出「掉下去了」时慢动作；手机：林岚打来电话（手机响起、接通后分屏、她的声音隔着电话、她先挂断），最后苏晴发来一条消息；
// 短闪回：第 3 轮苏晴凑过来时，我想起林岚塞信封时的一句话。
// 插画的出现和消失：第 1 轮从局部拉开，第 2 轮柔光渐显、轻轻起伏、溶回场景，第 4 轮的回忆像照片一样落下，回到现实时碎裂。
export const CARD = { id: 'preview-card', name: '放学后的约定' }

export const TURNS = [
  {
    turn: 1,
    user: '（放学后，去琴房找林岚学姐）',
    text: `放学铃响过很久，我才推开琴房的门。午后的阳光斜斜地落在钢琴上，灰尘在光里慢慢浮动。
林岚坐在琴凳上，指尖停在琴键上方，像是在等什么。
“你终于来了。”林岚回过头，嘴角带着笑，“我还以为你忘了今天的约定。”
我挠了挠头：「抱歉，社团活动拖得有点久。」
（她今天……好像有点不一样。）
“那就罚你听我弹完这一首。”她把一缕头发别到耳后，“不许走神。”`,
  },
  {
    turn: 2,
    user: '（陪她弹完琴，一起从后山的竹林小路回家）',
    text: `曲子结束的时候，天已经暗下来了。我们从后山的竹林小径绕路回家，萤火虫在竹叶间一闪一闪。
苏晴：你们俩在这儿啊！我找了你们一路。
苏晴从小路另一头跑过来，气喘吁吁地扶着膝盖。
“好巧啊。”苏晴笑得眯起眼睛，“不过我可不是跟踪你们哦。”
“……这句话本身就很可疑。”
林岚没有说话，只是悄悄把一个小信封塞进我的口袋。
“回家以后再看。”她小声说，“只给你一个人。”`,
  },
  {
    turn: 3,
    user: '（回到街上，忍不住拆开了信封）',
    sig: '走到路口，雨忽然大了起来',
    raw: `<details class="status"><summary>状态栏</summary>
时间：第 3 天 19:40 ｜ 地点：便利店屋檐下 ｜ 天气：暴雨
好感度：林岚 52 ｜ 苏晴 47
</details>
走到路口，雨忽然大了起来。我躲到便利店的屋檐下，还是忍不住拆开了信封。
明天放学后，旧校舍的音乐教室。有件事，只想告诉你。——林岚
苏晴不知什么时候凑了过来，看清字的那一瞬间，表情一下子变了。
我忽然想起竹林里，她把信封塞给我时又补的那一句。
“……别让苏晴看到哦。”
“旧校舍……那里不是三年前就封起来了吗？”
“不行！你绝对不能去那里！”
“……为什么？”
“因为三年前……那、那间教室里……”她的声音一下子乱了，“有人从窗口……掉下去了……”
一道闪电劈开夜空，路灯跟着闪了两下。
苏晴咬了咬嘴唇，什么也没说，撑开伞跑进了雨里。
口袋里的手机震了起来，屏幕上是林岚的名字。
“信，看到了吗？”
“学姐，旧校舍到底……”
“明天你就知道了。”电话那头，琴声隐约响着，“晚安。”
电话挂断了。
（林岚学姐，你到底想告诉我什么？）
<hr>
<p class="tail">—— 第三章 · 完 —— 本轮 312 字</p>
<UpdateVariable>_.set('好感度.苏晴', 47)</UpdateVariable>`,
  },
]

/** Tavern 给插件的 text：去掉 script / style 和全部标签（宏这里没有）。 */
export const tavernText = raw => raw.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '').replace(/<[^>]+>/g, '').trim()
for (const t of TURNS) if (t.raw) t.text = tavernText(t.raw)

// 演示「前台先文本」：截图时临时追加这一轮，导演故意慢一点。
export const LATE_TURN = {
  turn: 4,
  user: '（第二天放学，独自走向旧校舍）',
  text: `第二天放学，我一个人走向旧校舍。走廊尽头的音乐教室里，隐约传来熟悉的琴声。
三年前的那个黄昏，我也听过这首曲子。
“学姐，这是什么曲子？”
“……一首还没写完的曲子。”
琴声戛然而止，走廊的灯一盏接一盏地熄灭了。
“你来了。”`,
}

const find = (units, needle) => {
  const u = units.find(x => x.text.includes(needle))
  if (!u) throw new Error('找不到单元：' + needle)
  return u.id
}

/** 按单元编号写导演输出（和真实导演一样只引用编号，不复述正文）。 */
export function directorReply(turn, units) {
  const L = (needle, line) => ({ u: find(units, needle), ...line })
  if (turn === 1) return {
    scene: { location: '琴房', time: 'afternoon', weather: 'dust', mood: 'sweet', transition: 'cinematic', bg: 'music room, grand piano, afternoon sunlight, dust particles, scenery, no humans' },
    cast: [{ name: '林岚', pos: 'center' }],
    lines: [
      L('放学铃响过很久', { sfx: '吱呀' }),
      L('林岚坐在琴凳上', { sp: '林岚', emo: 'thinking' }),
      L('你终于来了', { sp: '林岚', emo: 'smile', sym: 'sparkle', cam: 'zoom' }),
      L('抱歉，社团活动', { sp: '我', emo: 'neutral', sym: 'sweat', say: 'hesitant' }),
      L('好像有点不一样', { sp: '我', textfx: [{ text: '好像有点不一样', style: 'dwindle' }] }),
      L('林岚回过头', { sp: '林岚', emo: 'smile', scene: { romance: 'ambiguous' } }),
      L('那就罚你', { sp: '林岚', emo: 'teasing', sym: 'heart' }),
      L('她把一缕头发', { sp: '林岚', emo: 'shy' }),
      L('不许走神', { sp: '林岚', emo: 'pout', sym: 'anger', say: 'menace', cam: 'focus' }),
    ],
    choices: [],
    images: [{ after: find(units, '那就罚你'), title: '午后的琴房', moment: '林岚坐在琴凳上回过头，带着捉弄人的笑，要罚我听她弹完这一首', who: ['林岚'] }],
    people: [
      { name: '林岚', gender: 'female', appearance: '1girl, long black hair, blue eyes, hair ornament, slender', outfit: '校服', outfitTags: 'sailor school uniform, navy serafuku, red neckerchief, black pantyhose' },
    ],
    summary: '林岚在琴房等我，罚我听她弹完一首。',
  }
  if (turn === 2) return {
    scene: { location: '竹林小径', time: 'dusk', weather: 'fireflies', mood: 'calm', transition: 'dissolve', bg: 'bamboo forest path, dusk, fireflies, scenery, no humans' },
    cast: [{ name: '林岚', pos: 'left' }, { name: '苏晴', pos: 'right' }],
    lines: [
      L('你们俩在这儿啊', { sp: '苏晴', emo: 'happy', sym: 'surprise', say: 'excited', voice: 'offscreen' }),
      L('好巧啊', { sp: '苏晴', emo: 'teasing', sym: 'note', textfx: [{ text: '好巧啊', style: 'wave' }] }),
      L('这句话本身就很可疑', { sp: '我', sym: 'sweat', stress: '很可疑', react: [{ name: '苏晴', emo: 'pout', sym: 'anger' }, { name: '林岚', emo: 'smile' }] }),
      L('苏晴从小路另一头', { sp: '苏晴', emo: 'tired', sym: 'sweat', enter: [{ name: '苏晴', pos: 'right', how: 'run' }] }),
      L('不过我可不是跟踪', { sp: '苏晴', emo: 'smug' }),
      L('悄悄把一个小信封', { sp: '林岚', emo: '害羞地强装镇定', move: [{ name: '林岚', act: 'forward' }] }),
      L('回家以后再看', { sp: '林岚', emo: 'blush', sym: 'blush', say: 'whisper' }),
      L('只给你一个人', { sp: '林岚', emo: 'love', sym: 'heart', say: 'whisper', stress: '只给你', cam: 'closeup', scene: { sense: 'ear' } }),
    ],
    choices: [],
    emotions: [{ name: '害羞地强装镇定', desc: '脸颊泛红却板着脸，目光移开，嘴唇抿紧，手指捏着衣角', base: 'shy' }],
    images: [{ after: find(units, '悄悄把一个小信封'), until: find(units, '她小声说'), title: '萤火与信封', moment: '萤火虫飞舞的竹林小径，林岚别过脸把信封递过来，苏晴还扶着膝盖喘气，惊讶地看着', who: ['林岚', '苏晴'], in: 'slow' }],
    people: [
      { name: '林岚', temp: 'holding small envelope' },
      { name: '苏晴', gender: 'female', appearance: '1girl, short brown hair, side ponytail, amber eyes', outfit: '开衫校服', outfitTags: 'school uniform, beige cardigan, white shirt, red ribbon' },
    ],
    summary: '回家路上苏晴追了上来，林岚偷偷塞给我一封信。',
  }
  if (turn === 3) return {
    scene: { location: '城市街道', time: 'night', weather: 'storm', mood: 'tense', transition: 'black', bg: 'city street, night, heavy rain, convenience store, scenery, no humans' },
    cast: [{ name: '苏晴', pos: 'right' }],
    lines: [
      L('明天放学后', { sp: '林岚', card: 'note' }),
      L('不知什么时候凑了过来', { sp: '苏晴', emo: 'surprised', enter: [{ name: '苏晴', how: 'peek' }] }),
      L('别让苏晴看到', { sp: '林岚', emo: 'blush', say: 'whisper', recall: true }),
      L('旧校舍……那里', { sp: '苏晴', emo: 'scared', sym: 'surprise', cam: 'zoom', scene: { bars: 'on' }, say: 'hesitant', stress: '三年前', textfx: [{ text: '旧校舍……那里', style: 'shake' }] }),
      L('你绝对不能去那里', { sp: '苏晴', emo: 'angry', sym: 'anger', say: 'shout', textfx: [{ text: '不行！', style: 'roar' }], cutin: true, move: [{ name: '苏晴', act: 'forward' }] }),
      L('……为什么', { sp: '我', emo: 'confused' }),
      L('那、那间教室里', { sp: '苏晴', emo: 'scared', sym: 'sweat', textfx: [{ text: '那、那间教室里', style: 'shake' }] }),
      L('她的声音一下子乱了', { sp: '苏晴', emo: 'scared' }),
      L('有人从窗口', { sp: '苏晴', emo: 'cry', say: 'breakdown', stress: '掉下去了', scene: { fx: 'slowmo' } }),
      L('一道闪电', { cam: 'flash', sfx: '轰', scene: { light: 'flicker', fx: 'none' } }),
      L('撑开伞跑进了雨里', { sp: '苏晴', emo: 'sad', exit: [{ name: '苏晴', how: 'run' }], scene: { light: 'dim', mood: 'sad', bars: 'none' } }),
      L('口袋里的手机震了起来', { phone: { kind: 'call', who: '林岚' } }),
      L('信，看到了吗', { sp: '林岚', emo: 'smile', split: { who: ['林岚'], location: '琴房', bg: 'music room, grand piano, night, moonlight through window, scenery, no humans' } }),
      L('学姐，旧校舍到底', { sp: '我', emo: 'worried', say: 'hesitant' }),
      L('明天你就知道了', { sp: '林岚', emo: 'serious', say: 'whisper' }),
      L('电话挂断了', { split: 'off', phone: { kind: 'end', result: 'hungup' } }),
      L('到底想告诉我什么', { sp: '我', sym: 'gloom', cam: 'empty', phone: { kind: 'notify', who: '苏晴', text: '明天……千万别一个人去。' } }),
    ],
    skip: [find(units, '状态栏'), find(units, '19:40'), find(units, '林岚 52'), find(units, '第三章 · 完')],
    choices: ['答应赴约，一个人去旧校舍', '拉上苏晴一起去', '先打电话问林岚本人'],
    images: [],
    people: [{ name: '林岚', temp: 'none' }],
    summary: '信里约我去封闭三年的旧校舍，苏晴脸色变了。',
  }
  return {
    scene: { location: '旧校舍走廊', time: 'dusk', weather: 'dust', mood: 'eerie', transition: 'iris', bg: 'abandoned school corridor, dusk, dust, scenery, no humans' },
    cast: [{ name: '林岚', pos: 'center' }],
    lines: [
      L('第二天放学', { cut: { kind: 'time', text: '翌日 放学后' } }),
      L('三年前的那个黄昏', { mode: 'memory', scene: { location: '音乐教室（三年前）', time: 'dusk', weather: 'sakura', mood: 'touching', bg: 'school music room, grand piano, sunset through window, cherry blossoms outside, scenery, no humans' }, enter: [{ name: '林岚', pos: 'center' }], then: [{ name: '林岚', outfit: '校服', states: [] }] }),
      L('学姐，这是什么曲子', { sp: '我' }),
      L('一首还没写完的曲子', { sp: '林岚', emo: 'smile' }),
      L('琴声戛然而止', { mode: 'real', scene: { light: 'dark', mood: 'eerie', transition: 'none' } }),
      L('你来了', { sp: '林岚', emo: 'serious', cam: 'lowangle', cutin: true, enter: [{ name: '林岚' }], scene: { light: 'spot', fx: 'drift' } }),
    ],
    choices: ['走进音乐教室', '先在门口叫她的名字'],
    images: [{ after: find(units, '学姐，这是什么曲子'), until: find(units, '一首还没写完的曲子'), title: '三年前的黄昏', moment: '三年前的音乐教室，夕阳和樱花，林岚坐在钢琴前回头微笑', who: ['林岚'] }],
    people: [{ name: '林岚', outfit: '冬季制服', outfitTags: 'winter school uniform, brown duffel coat, red checkered scarf, black pantyhose', states: [{ name: '手腕绷带', tags: 'bandaged wrist' }] }],
    summary: '旧校舍里传来琴声。',
  }
}

/**
 * 假插画分镜师按插画标题回的提示词：Base + 每人一个角色块。真模型会读完剧情和档案自己写。
 * 名字只放在 name 上，固定外貌由插件按档案补；衣服写成指纹，同框两人的颜色分开。
 */
export const CG_DRAFTS = {
  '午后的琴房': {
    size: 'portrait',
    tag: 'indoors, school music room, grand piano, sheet music, afternoon, sunlight through window, light rays, dust particles, cowboy shot, from side, warm colors, detailed background, modern',
    nl: 'A quiet school music room in the afternoon, sunlight slanting across a black grand piano.',
    characters: [{
      name: '林岚',
      tag: 'girl, sitting on piano bench, sailor school uniform, navy serafuku, red neckerchief, black pantyhose, teasing smile, light blush, head tilt, looking back, hands on piano keys',
      nl: 'She turns back from the keys with a teasing smile, as if she had been waiting the whole time.',
    }],
  },
  '三年前的黄昏': {
    size: 'landscape',
    tag: 'indoors, school music room, grand piano, sunset, orange sky, cherry blossoms outside window, petals, medium shot, warm colors, nostalgic, detailed background',
    nl: 'A school music room at sunset three years ago, petals drifting past the window.',
    characters: [{ name: '林岚', tag: 'girl, sailor school uniform, sitting at piano, looking back, gentle smile', nl: 'She looks back from the piano with a gentle smile.' }],
  },
  '萤火与信封': {
    size: 'landscape',
    tag: 'outdoors, bamboo forest, stone path, dusk, fireflies, glowing particles, medium shot, cold colors, soft lighting, detailed background',
    nl: 'A narrow bamboo path at dusk, fireflies drifting between the leaves.',
    characters: [
      { name: '林岚', tag: 'girl, sailor school uniform, navy serafuku, red neckerchief, blush, pursed lips, looking away, holding envelope, arm extended', nl: 'She holds out a small envelope with her face turned away, cheeks red.' },
      { name: '苏晴', tag: 'girl, school uniform, beige cardigan, white shirt, red ribbon, open mouth, wide eyes, looking at another, hand on own knee, leaning forward, out of breath', nl: 'Still catching her breath, she stares at the envelope in surprise.' },
    ],
  },
}
