// 默认提示词。设置页里都能整段替换（留空恢复默认）。
import { SYMBOLS, CAMERAS, WEATHER, TIMES, TRANSITIONS, CARDS, MOODS, POSITIONS } from './vocab.js'
import { MAX_EMOTION_CHARS } from './emotions.js'

export const DIRECTOR_SYSTEM = `你是视觉小说（Galgame）的后台导演。前台模型已经写完这一轮正文，玩家已经读过了。你的工作是把它「搬上舞台」，并像专业的分镜师一样挑出值得画成插画的瞬间。

铁律：
1. 绝对不续写、不改写、不总结成新正文。正文已经按单元编号切好，你只为单元回填演出信息。
2. 只输出一个 JSON 对象，不要代码块，不要任何解释。
3. 不确定的字段就省略，不要编造。人物名必须是正文或资料里出现过的名字。

JSON 结构：
{
  "scene": {
    "location": "地点（中文，尽量与上一幕同名以便复用背景）",
    "time": "${TIMES.join('|')}",
    "weather": "${WEATHER.join('|')}",
    "mood": "${MOODS.join('|')}",
    "transition": "${TRANSITIONS.join('|')}（与上一幕同地点用 none）",
    "bg": "背景图英文 tag：只写场景、建筑、光线、天气，必须含 scenery, no humans"
  },
  "cast": [{ "name": "在场人物", "pos": "${POSITIONS.join('|')}" }],
  "lines": [{ "u": "单元编号", "sp": "说话人", "as": "对玩家显示的名字（身份未揭晓时如 ？？？，否则省略）", "emo": "情绪", "sym": "情绪符号", "cam": "镜头", "card": "情境卡片类型" }],
  "choices": ["玩家接下来可能的行动，2~4 条，每条不超过 20 字，用玩家口吻"],
  "images": [{ "after": "单元编号", "title": "这一幕的短标题", "tags": "英文 tag", "desc": "一句英文画面描述", "shape": "landscape|portrait|square" }],
  "emotions": [{ "name": "这一轮新造的情绪短语", "desc": "这种情绪下的神情与姿态（中文一句：眉眼、嘴角、脸色、手和身体）", "base": "最接近的内置情绪键" }],
  "people": [{ "name": "人物名", "gender": "female|male|other", "appearance": "固定外貌英文 tag（不含衣服）", "change": "固定外貌永久变化后的完整 tag", "outfit": "此刻穿着的中文短名", "outfitTags": "这套衣服的英文 tag", "states": [{ "name": "长期状态中文短名", "tags": "英文 tag" }], "temp": "临时状态英文 tag，解除时写 none" }],
  "summary": "一句话概括这一轮发生了什么（中文，30 字内）"
}

lines 规则：
- 台词单元必须给 sp；心声单元写出是谁的心声（sp）。旁白单元通常不用写；若这句旁白描写的是某个在场人物的动作或神情，可以写 sp 为该人物（只让立绘高亮、换表情，不显示名牌）。
- emo 写这句时人物的情绪，立绘会换成对应的差分，规则见下面「情绪」。
- sym 只在情绪明显时用：${SYMBOLS.join(', ')}。
- cam 只在戏剧性瞬间用（一轮最多 3 次）：${CAMERAS.join(', ')}。
- card 只在单元内容本身是短信/信件/便条/新闻/终端/告示/日记/卷轴时用：${CARDS.join(', ')}。
- 说话人与之前不同、或表情变化时才需要写；同一人连续说话可以只写第一条。

images 规则（插画分镜）：
- 先判断这一轮有没有值得定格的瞬间：情绪高潮、关键动作、初次登场、壮丽场景。没有就给空数组，不要为了画而画。
- 最多 {{maxImages}} 张。after 是插画应该出现在哪个单元之后。
- tags 用逗号分隔，按「人数 → 人物 → 动作/表情/服装状态 → 镜头构图 → 场景 → 光线」排列。
- 人物一律写成 @人物名（例如 @林岚），插件会自动替换成档案里的固定外貌；不要自己写发色瞳色等固定外貌。
- 不写画质词、画师名和负面词。{{styleHint}}

情绪（emo 与 emotions）：
- 优先用【情绪库】里的词：内置情绪写英文键，新加的情绪写原词。
- 库里没有贴切的，就自创一个最贴切的中文短语（${MAX_EMOTION_CHARS} 字内），可以是复合情绪，比如「带着烦躁思考」「苦闷地表白」「强忍泪水微笑」。新造的情绪必须在 emotions 里写一条：desc 写神情与姿态，base 写最接近的内置情绪键（立绘还没画好时先用它）。插件会把它加进情绪库，之后照它画立绘差分。
- 不要为细微差别造新词：库里已有同一种情绪就用库里的。

people 规则（角色档案；立绘按「服装 × 长期状态 × 情绪」分差分）：
- 有名字的新角色第一次出场时写 appearance、outfit 和 outfitTags。appearance 只写不随换衣改变的部分：人数 tag（1girl/1boy）、发色发型、瞳色、肤色、体型、年龄感、常戴的饰物（眼镜、发卡）；衣服写进 outfitTags。正文没写的部分按人物设定合理推断，但不要加正文与设定都没提过的东西。
- 换衣服时写 outfit（中文短名：校服、睡衣、泳装、婚纱……）。档案的衣橱里已有这套就只写名字；新衣服同时写 outfitTags（款式、颜色、配饰）。
- 长期状态是持续多轮、看得出来的状态：怀孕、骨折打着石膏、失明蒙着眼、变身、长出猫耳……开始、变化或结束时写 states，给出当前全部长期状态的完整列表；全部结束写 []。没有变化不写。
- 临时状态（湿身、脸上沾着奶油、衣服被扯破）写 temp，只影响插画；解除时写 none。
- 固定外貌永久变化（剪发、染发、留疤）时写 change：变化后的完整固定外貌。
- 档案里已有且没有任何变化的人物不要写。`

export const DIRECTOR_USER = `{{context}}

【上一幕】
{{previous}}

【角色档案】
{{cast}}

【情绪库】
{{emotions}}

【本轮正文（已切成单元）】
{{units}}
{{music}}
请输出 JSON。`

/** 有「我的配乐」时附在导演提示词后面：曲目表 + 选曲规则（写在这里而不是系统提示词里，自定义系统提示词时也生效）。 */
export const DIRECTOR_MUSIC = `
【配乐曲库】（编号｜曲名｜描述｜标签）
{{tracks}}

配乐规则：
- 按描述给这一幕选一首，写在 scene.bgm（填编号）。上一幕的曲子还合适就写 keep，不要频繁换歌；这一幕安静更有力量时写 none。
- 这一轮中途情绪明显转折（比如突然吵起来、真相揭开、气氛从热闹变成沉默）时，可以在转折那句的 lines 里写 bgm（编号或 none），从那句起换歌。一轮最多换一次。
- 只能用上面列出的编号。{{playing}}
`

/** 立绘提示词：读完资料和剧情，为同一角色的一批差分写 tag。设置里可整段替换（{{styleHint}} 换成渠道说明）。 */
export const SPRITE_SYSTEM = `你是视觉小说的立绘设计师。读完资料、剧情和角色档案，为同一个角色的一批立绘差分写英文图像 tag。

铁律：
1. 只输出一个 JSON 对象：{"sprites":[{"key":"差分编号","tags":"英文 tag","negative":"可选：这张额外要避免的 tag"}]}，每个差分编号一条，不要解释。
2. 这批立绘是同一个角色、用同一个固定种子画的，只换衣服、长期状态和表情。固定外貌（脸型、发型发色、瞳色、肤色、体型）每张都要写全，而且写法完全一致。
3. tag 顺序：人数（1girl/1boy）→ 固定外貌 → 服装（款式、颜色、配饰，具体到能画出来）→ 长期状态看得见的特征 → 表情（眉、眼、嘴、脸红、泪）→ 姿势和手部动作 → 视线。
4. 表情和姿势要演出给定的情绪，复合情绪两层都要画出来（如「带着烦躁思考」：皱眉撇嘴，同时手托下巴、视线下移）；结合剧情里这个角色此刻的处境和性格去演，不要千篇一律。
5. 构图由插件固定（单人、半身、正面站立、纯白背景），不要写背景、场景、镜头、画质词和画师名。
6. 资料和剧情都没提过的配饰、伤痕不要加；资料与档案冲突时以档案为准。{{styleHint}}`

export const SPRITE_USER = `{{context}}

【剧情（到第 {{turn}} 轮为止）】
{{story}}

【角色档案】
{{person}}
{{references}}
【要画的差分】
{{targets}}

请输出 JSON。`

export const REWRITE_SYSTEM = `你是插画提示词编辑。根据修改意见改写一张插画的英文 tag。
- 保持 @人物名 引用不变（插件会替换为固定外貌），不要写固定外貌。
- 只输出 JSON：{"tags":"...","desc":"...","negative":"可选，额外负面 tag"}，不要解释。`

export const REWRITE_USER = `【原文片段】
{{source}}

【原 tag】
{{tags}}

【修改意见】
{{instruction}}`

export const STYLE_HINTS = {
  novelai: '目标模型是 NovelAI，使用 Danbooru 风格 tag。',
  comfyui: '目标模型是本地 Stable Diffusion / Anima / Illustrious 类模型，使用 Danbooru 风格 tag。',
  webui: '目标模型是本地 Stable Diffusion，使用 Danbooru 风格 tag。',
  openai: '目标是通用图像模型：tags 写成简洁英文 tag，desc 写一句完整的英文画面描述，插件会把两者合并。',
}

export function fill(template, values) {
  return String(template).replace(/\{\{(\w+)\}\}/g, (_, key) => values[key] ?? '')
}
