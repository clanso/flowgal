// 预览用的一小段原创剧情（三轮 + 一轮演示「先文本后整理」），以及每轮对应的导演输出。
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
    text: `走到路口，雨忽然大了起来。我躲到便利店的屋檐下，还是忍不住拆开了信封。
明天放学后，旧校舍的音乐教室。有件事，只想告诉你。——林岚
苏晴不知什么时候凑了过来，看清字的那一瞬间，表情一下子变了。
“旧校舍……那里不是三年前就封起来了吗？”
一道闪电劈开夜空，路灯跟着闪了两下。
（林岚学姐，你到底想告诉我什么？）`,
  },
]

// 演示「前台先文本」：截图时临时追加这一轮，导演故意慢一点。
export const LATE_TURN = {
  turn: 4,
  user: '（第二天放学，独自走向旧校舍）',
  text: `第二天放学，我一个人走向旧校舍。走廊尽头的音乐教室里，隐约传来熟悉的琴声。
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
      L('林岚坐在琴凳上', { sp: '林岚', emo: 'thinking' }),
      L('你终于来了', { sp: '林岚', emo: 'smile', sym: 'sparkle', cam: 'zoom' }),
      L('抱歉，社团活动', { sp: '我', emo: 'neutral', sym: 'sweat' }),
      L('好像有点不一样', { sp: '我' }),
      L('林岚回过头', { sp: '林岚', emo: 'smile' }),
      L('那就罚你', { sp: '林岚', emo: 'teasing', sym: 'heart' }),
      L('她把一缕头发', { sp: '林岚', emo: 'shy' }),
      L('不许走神', { sp: '林岚', emo: 'pout', sym: 'anger' }),
    ],
    choices: [],
    images: [{ after: find(units, '那就罚你'), title: '午后的琴房', tags: '1girl, @林岚, sitting, playing piano, looking back, smile, sunlight, dust particles', desc: 'a girl at a piano looking back with a teasing smile', shape: 'landscape' }],
    people: [
      { name: '林岚', gender: 'female', appearance: '1girl, long black hair, blue eyes, hair ornament, school uniform, black pantyhose' },
    ],
    summary: '林岚在琴房等我，罚我听她弹完一首。',
  }
  if (turn === 2) return {
    scene: { location: '竹林小径', time: 'dusk', weather: 'fireflies', mood: 'calm', transition: 'dissolve', bg: 'bamboo forest path, dusk, fireflies, scenery, no humans' },
    cast: [{ name: '林岚', pos: 'left' }, { name: '苏晴', pos: 'right' }],
    lines: [
      L('你们俩在这儿啊', { sp: '苏晴', emo: 'happy', sym: 'surprise', cam: 'shake' }),
      L('好巧啊', { sp: '苏晴', emo: 'teasing', sym: 'note' }),
      L('这句话本身就很可疑', { sp: '我', sym: 'sweat' }),
      L('苏晴从小路另一头', { sp: '苏晴', emo: 'tired', sym: 'sweat' }),
      L('不过我可不是跟踪', { sp: '苏晴', emo: 'smug' }),
      L('悄悄把一个小信封', { sp: '林岚', emo: 'shy' }),
      L('回家以后再看', { sp: '林岚', emo: 'blush', sym: 'blush' }),
      L('只给你一个人', { sp: '林岚', emo: 'love', sym: 'heart' }),
    ],
    choices: [],
    images: [{ after: find(units, '悄悄把一个小信封'), title: '萤火与信封', tags: '@林岚, @苏晴, 2girls, bamboo forest, fireflies, dusk, holding envelope', desc: 'two girls on a bamboo path among fireflies at dusk', shape: 'landscape' }],
    people: [
      { name: '林岚', temp: 'holding small envelope' },
      { name: '苏晴', gender: 'female', appearance: '1girl, short brown hair, side ponytail, amber eyes, school uniform, cardigan' },
    ],
    summary: '回家路上苏晴追了上来，林岚偷偷塞给我一封信。',
  }
  if (turn === 3) return {
    scene: { location: '城市街道', time: 'night', weather: 'storm', mood: 'tense', transition: 'black', bg: 'city street, night, heavy rain, convenience store, scenery, no humans' },
    cast: [{ name: '苏晴', pos: 'right' }],
    lines: [
      L('明天放学后', { sp: '林岚', card: 'note' }),
      L('不知什么时候凑了过来', { sp: '苏晴', emo: 'surprised' }),
      L('旧校舍……那里', { sp: '苏晴', emo: 'scared', sym: 'surprise', cam: 'zoom' }),
      L('一道闪电', { cam: 'flash' }),
      L('到底想告诉我什么', { sp: '我', sym: 'gloom' }),
    ],
    choices: ['答应赴约，一个人去旧校舍', '拉上苏晴一起去', '先打电话问林岚本人'],
    images: [],
    people: [{ name: '林岚', temp: 'none' }],
    summary: '信里约我去封闭三年的旧校舍，苏晴脸色变了。',
  }
  return {
    scene: { location: '旧校舍走廊', time: 'dusk', weather: 'dust', mood: 'eerie', transition: 'iris', bg: 'abandoned school corridor, dusk, dust, scenery, no humans' },
    cast: [{ name: '林岚', pos: 'center' }],
    lines: [L('你来了', { sp: '林岚', emo: 'serious', cam: 'zoom' })],
    choices: ['走进音乐教室', '先在门口叫她的名字'],
    images: [],
    people: [],
    summary: '旧校舍里传来琴声。',
  }
}
