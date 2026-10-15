// 提示词本：FlowGal 发给模型的每一段提示词（导演、表演设计师、立绘设计师、插画分镜师的系统提示词和用户消息、
// 里面档案和差分那些小段的写法、出图固定词、过滤规则），设置 →「提示词」里全文可见、能改、单段恢复默认。
// 每段一个编号；玩家改过的存在设置的 prompts 里（{ text, base }，base 是改的时候内置那版的指纹：内置更新了能提示「内置有新版」）。
// 大段的默认值在 lib/prompts.js，小段、固定词、过滤规则的默认值在 lib/prompt-words.js（浏览器也要用）。
import { DIRECTOR_SYSTEM, DIRECTOR_USER, DIRECTOR_MUSIC, DIRECTOR_SOUNDS, DIRECTOR_EROS, LISTEN_SYSTEM, LISTEN_USER, JUDGE_SYSTEM, JUDGE_USER, SPRITE_SYSTEM, SPRITE_USER, ACTING_SYSTEM, ACTING_USER, ACTING_TASK_FULL, ACTING_TASK_ADD, ACTING_TASK_NOTE, ACTING_TASK_REVIEW, ACTING_TASK_WORLD, ACTING_TASK_LABEL, ACTING_TASK_MORE, CG_SYSTEM, CG_USER } from './prompts.js'
import { TEXT_DEFAULTS, promptOf, fillOf, pickOf, lastFill, cleanPrompts, LEGACY_PROMPTS, PROMPT_MAX } from './prompt-words.js'
import { templateVars } from './template.js'
import { DIRECTOR_LIMITS } from './limits.js'
import { fnv1a } from './look.js'

const BIG = {
  'director.system': DIRECTOR_SYSTEM,
  'director.user': DIRECTOR_USER,
  'director.music': DIRECTOR_MUSIC,
  'director.sounds': DIRECTOR_SOUNDS,
  'director.eros': DIRECTOR_EROS,
  'listen.system': LISTEN_SYSTEM,
  'listen.user': LISTEN_USER,
  'judge.system': JUDGE_SYSTEM,
  'judge.user': JUDGE_USER,
  'acting.system': ACTING_SYSTEM,
  'acting.user': ACTING_USER,
  'acting.task.full': ACTING_TASK_FULL,
  'acting.task.add': ACTING_TASK_ADD,
  'acting.task.note': ACTING_TASK_NOTE,
  'acting.task.review': ACTING_TASK_REVIEW,
  'acting.task.world': ACTING_TASK_WORLD,
  'acting.task.label': ACTING_TASK_LABEL,
  'acting.task.more': ACTING_TASK_MORE,
  'sprite.system': SPRITE_SYSTEM,
  'sprite.user': SPRITE_USER,
  'cg.system': CG_SYSTEM,
  'cg.user': CG_USER,
}

/** 这一段的内置默认。 */
export const defaultOf = id => BIG[id] ?? TEXT_DEFAULTS[id] ?? ''
/** 这一段现在用的文字（改过用改过的）。 */
export const textOf = (config, id) => promptOf(config, id, defaultOf(id))
/** 按这一段现在的文字填变量（顺手记下这次的变量，提示词页里看得到）。 */
export const fillBook = (config, id, values = {}) => fillOf(config, id, values, defaultOf(id))
/** 内置那版的指纹：玩家改的时候记下，内置更新了就对不上。 */
export const fingerprint = text => fnv1a(String(text)).toString(36)

/** 这一渠道的一句话说明（{{styleHint}}）：没有这个渠道的按 NovelAI 的。 */
export const styleHintOf = (config, backend) => pickOf(config, 'shared.styleHint', backend) || pickOf(config, 'shared.styleHint', 'novelai')

/** 共用开头（默认开）：几位设计师的系统提示词都换成同一句，各自的规矩挪进用户消息里资料和剧情的后面，开头一字不差，会自动缓存的模型接口第二次读就便宜、快。 */
export const sharedPrefix = config => config?.director?.sharedPrefix !== false
/**
 * 这位设计师的规矩（rules：填好的系统提示词）怎么放：共用开头时系统提示词是共用的那句、规矩放进用户消息（role，包成【你的工作】一节）；
 * 关着时照以前，规矩就是系统提示词，role 为空。
 */
export function placeRules(config, rules) {
  if (!sharedPrefix(config)) return { system: rules, role: '' }
  return { system: textOf(config, 'shared.system'), role: fillBook(config, 'shared.role', { rules }) }
}

// ───────────────────────── 每一段的名字、说明、变量 ─────────────────────────

export const PROMPT_GROUPS = [
  { id: 'director', label: '导演', desc: '每轮正文写完后，把它搬上舞台：谁在场、什么表情、镜头、配乐音效、挑哪些瞬间画插画。' },
  { id: 'judge', label: '情绪归类', desc: '导演造了情绪库里没有、也不是哪种近义词的情绪词时，交给导演用的模型判断：画出来跟库里某一种几乎一样的归进那一种（之后写到它就用那张），确实不一样的才新开一种，只挂在用过它的角色下面（设置 → 导演 →「新情绪先归类」）。' },
  { id: 'listen', label: '听音师', desc: '音效库比每轮给导演看的候选多时，导演之前先读一遍正文，列出听得见的声音和去库里找它们的词；候选照它列的找，正文里没写原词的声音也找得到（设置 → 音效库 →「先听一遍」）。' },
  { id: 'acting', label: '表演设计师', desc: '画一个人的第一张立绘之前，读完资料和剧情，给他设计专属的动作和每种情绪的表情（人物志 →「动作与表情」）。' },
  { id: 'sprite', label: '立绘设计师', desc: '每张立绘差分的英文 tag：照表演设计，按这个人此刻的处境写。' },
  { id: 'cg', label: '插画分镜师', desc: '导演挑好的瞬间写成插画的生图提示词（Base + 每人一个角色块）。' },
  { id: 'shared', label: '共用', desc: '几位都用的：开头那句系统提示词、资料和剧情的写法、角色档案的写法、出错重来时补的话。' },
  { id: 'image', label: '出图固定词', desc: '插件自己加进生图提示词的词：立绘构图、底色、背景后缀、时段天气。质量词和负面词在「画风与配图」里每套画风自己定。' },
  { id: 'filter', label: '过滤规则', desc: '设计师写的 tag 发出去之前，插件去掉或换掉哪些（导演日志里每张立绘都列了去掉、换掉的词）。' },
]

const LIMIT_VARS = Object.fromEntries(DIRECTOR_LIMITS.map(l => [l.key + 'Limit', `${l.label}的上限：设置 → 导演 → 每轮上限里限了数是「${l.phrase('N')}」这半句，不限时是空的`]))
const STYLE_HINT = { styleHint: '这一渠道的一句话说明（共用 → 各渠道说明）' }
const ROLE = { role: '开着「共用开头」时，这位设计师的系统提示词放在这里（包成【你的工作】一节）；关着时是空的' }

/** kind：text 一段话（模板）；tags 逗号隔开的英文 tag；list 一行一个；pairs 一行「原词 → 换成」；map 一行「编号：内容」。 */
const ENTRIES = [
  // 导演
  { id: 'director.system', group: 'director', section: '主提示词', label: '系统提示词', desc: '导演的全部规矩：怎么切单元、谁在场、表情、镜头、特效、插画挑哪些瞬间……输出格式也在这里。', vars: { ...STYLE_HINT, situ: '动作跟着处境收起、放回那一条（见「动作跟着处境走」；设置里关了时是空的）', imageLimit: '插画张数那一句（设置里限了张数是「最多 N 张……」，不限是「张数不设上限……」，见下面「插画张数」）', nsfwRoom: '有露骨场面时名额怎么放宽的那一句（不限张数时是空的）', maxImages: '每轮最多几张插画（不限写「不限」）', nsfwMin: '露骨场面至少给几张', nsfwMax: '有露骨场面时最多几张', ...LIMIT_VARS } },
  { id: 'director.user', group: 'director', section: '主提示词', label: '每轮的用户消息', desc: '每轮发给导演的材料。', vars: { context: '人物卡和世界书（共用 → 资料的写法）', ...ROLE, previous: '上一幕结束时的样子（见「上一幕的写法」）', cast: '角色档案（见「角色档案的写法」）', emotions: '情绪库（见「情绪库的列法」）', raw: '本轮原文（模型写的原样，含标签；见「本轮原文」）', units: '本轮正文切成的单元：一行「[编号|说话人] 原文」', music: '配乐一节（有曲库时，见「配乐」）', sounds: '音效一节（有音效库时，见「音效」）', eros: 'R18 演出一节（设置里开着时，见「亲密场面」）' } },
  { id: 'director.noImages', group: 'director', section: '主提示词', label: '这一轮不要插画时', desc: '每轮插画限成 0 张时，接在系统提示词后面。', vars: {} },
  { id: 'director.retry', group: 'director', section: '主提示词', label: '输出坏了重要一次', desc: '导演第一次的输出解析不了时，带着这句再要一次。', vars: { error: '解析失败的原因' } },
  { id: 'director.imageLimit', group: 'director', section: '插画张数', label: '限了张数', desc: '{{imageLimit}}：设置里限了每轮插画张数时。', vars: { n: '每轮最多几张', nsfwMax: '有露骨场面时最多几张' } },
  { id: 'director.imageFree', group: 'director', section: '插画张数', label: '不限张数', desc: '{{imageLimit}}：不限张数时（默认）。', vars: {} },
  { id: 'director.nsfwRoom', group: 'director', section: '插画张数', label: '露骨场面放宽名额', desc: '{{nsfwRoom}}：限了张数时。', vars: { nsfwMax: '有露骨场面时最多几张' } },
  { id: 'director.limits', group: 'director', section: '每轮上限', label: '上限写进提示词的那半句', kind: 'map', desc: `每行「编号：那半句」，{{n}} 是设置里填的数；不限的不写。编号：${DIRECTOR_LIMITS.map(l => `${l.key} ${l.label}`).join('、')}。`, vars: { n: '设置里填的上限' } },
  { id: 'director.previous', group: 'director', section: '上一幕的写法', label: '上一幕', desc: '{{previous}}：上一幕结束时的现实场景（中途换过的按换完的算）、在场的人、还没结束的特殊段落和通话。', vars: { location: '地点', time: '时段', weather: '天气', mood: '基调', light: '光线（普通时空着）', fx: '画面效果（没有时空着）', romance: '亲密氛围（没有时空着）', sense: '感官效果（没有时空着）', bars: '电影黑边（开着是 on）', eros: '亲密场面的节奏（没有时空着）', tentacle: '触手（没有时空着）', who: '结束时在场的人：名字@位置', layer: '结束时还在的特殊段落（回忆、梦……），没有空着', layerPlace: '特殊段落的地点', caller: '结束时还在通话的人（视频通话后面带「视频」），没有空着', summary: '上一幕的剧情摘要' } },
  { id: 'director.previous.first', group: 'director', section: '上一幕的写法', label: '第一幕', desc: '还没有上一幕时。', vars: {} },
  { id: 'director.cast', group: 'director', section: '角色档案的写法', label: '每个人一行', desc: '{{cast}}：给导演看的简表，一个人一行。', vars: { name: '名字', global: '全局人物写「全局」（固定外貌冻结），本局的空着', appearance: '固定外貌（按字段写）', wardrobe: '衣橱里的衣服名', outfit: '正在穿的', states: '长期状态', temp: '临时状态', poses: '这个人的动作（只有一个动作时空着）：每个动作见「一个动作」，后面接收起了的' } },
  { id: 'director.cast.none', group: 'director', section: '角色档案的写法', label: '还没有人建档', desc: '', vars: {} },
  { id: 'director.cast.pose', group: 'director', section: '角色档案的写法', label: '一个动作', desc: '{{poses}} 里的每个动作（用 / 隔开）。', vars: { id: '动作编号', label: '动作名', situ: '处境的那一截（见下面两条）', emotions: '里面的情绪' } },
  { id: 'director.cast.situ', group: 'director', section: '角色档案的写法', label: '处境动作的那一截', desc: '处境动作：它的前提、靠哪个长期状态。', vars: { premise: '前提', needs: '靠的长期状态' } },
  { id: 'director.cast.self', group: 'director', section: '角色档案的写法', label: '本性动作靠长期状态时', desc: '本性的（和老设计里还没标的）动作靠某个长期状态时。', vars: { needs: '靠的长期状态' } },
  { id: 'director.cast.off', group: 'director', section: '角色档案的写法', label: '收起了的动作', desc: '接在动作列表后面；没有收起的不写。', vars: { list: '收起了的动作（见下一条），用 / 隔开' } },
  { id: 'director.cast.offPose', group: 'director', section: '角色档案的写法', label: '一个收起了的动作', desc: '', vars: { id: '动作编号', label: '动作名', why: '第几轮起、为什么收起（或者靠的长期状态没了）' } },
  { id: 'director.situ', group: 'director', section: '动作跟着处境走', label: '收起、放回处境动作', desc: '{{situ}}：设置 → 导演里开着「动作跟着处境收起」时接在 pose 那一条后面。', vars: {} },
  { id: 'director.emotions', group: 'director', section: '情绪库的列法', label: '情绪库', desc: '{{emotions}}：按类别分组，每种一行（见「每种情绪一行」）。', vars: { list: '按类别列好的情绪：「【类别】」一行，下面每种一行' } },
  { id: 'director.emotions.item', group: 'director', section: '情绪库的列法', label: '每种情绪一行', desc: '情绪库里的每一种（停用、删掉的不列）。新情绪归类那一步（情绪归类）看的情绪库也按这一行写。', vars: { key: '编号：内置的是英文键，新加的是词本身', label: '内置的中文名（新加的空着）', use: '用在什么场面（情绪库里写的；没写空着）', words: '近义词，加上并进它的旧名字（模型归进来的、你合并的）' } },
  { id: 'director.emotions.empty', group: 'director', section: '情绪库的列法', label: '空的类别', desc: '情绪库里一种情绪都没有（或者都停用了）的类别，这一类后面写这句。', vars: {} },
  { id: 'director.raw', group: 'director', section: '本轮原文', label: '本轮原文', desc: '{{raw}}：没有原文时整节不发。', vars: { raw: '模型写的原样' } },
  { id: 'director.music', group: 'director', section: '配乐', label: '配乐一节', desc: '{{music}}：有配乐曲库时。', vars: { tracks: '按这一轮挑出的一批曲子：编号｜曲名｜描述｜标签', playing: '上一幕结束时在放什么（见下面两条）', hushLimit: '留白次数的上限（不限时空着）' } },
  { id: 'director.music.now', group: 'director', section: '配乐', label: '上一幕在放', desc: '', vars: { id: '曲子编号', name: '曲名' } },
  { id: 'director.music.silent', group: 'director', section: '配乐', label: '上一幕没放音乐', desc: '', vars: {} },
  { id: 'director.sounds', group: 'director', section: '音效', label: '音效一节', desc: '{{sounds}}：有音效库时。', vars: { ambience: '挑出的环境音：编号｜名字｜分类｜说明', sfx: '挑出的音效', ambNow: '上一幕结束时的环境音（见下面两条）', sfxLimit: '音效的上限（不限时空着）' } },
  { id: 'director.sounds.now', group: 'director', section: '音效', label: '上一幕的环境音', desc: '', vars: { id: '环境音编号', name: '名字' } },
  { id: 'director.sounds.silent', group: 'director', section: '音效', label: '上一幕没有环境音', desc: '', vars: {} },
  { id: 'director.sounds.none', group: 'director', section: '音效', label: '没挑出合适的', desc: '', vars: {} },
  { id: 'director.eros', group: 'director', section: '亲密场面', label: 'R18 演出一节', desc: '{{eros}}：设置 → 音效库里开着亲密场面时。', vars: { beds: '节奏底候选（见下一条；这一轮不像亲密场面、或者库里没有对得上的长录音时空着）', erosSfxLimit: 'R18 音效的上限', peaksLimit: '高潮次数的上限' } },
  { id: 'director.eros.beds', group: 'director', section: '亲密场面', label: '节奏底候选', desc: '{{beds}}：这一轮正文像亲密场面（或者上一幕还在）时，从音效库、环境音库里十秒以上的录音按正文挑的一批。', vars: { beds: '挑出的录音：编号｜名字｜分类｜说明' } },
  // 听音师
  { id: 'listen.system', group: 'listen', section: '主提示词', label: '系统提示词', desc: '列哪些声音、每条怎么写、输出格式。', vars: {} },
  { id: 'listen.user', group: 'listen', section: '主提示词', label: '用户消息', desc: '', vars: { scene: '上一幕结束时的地点、天气、时段、基调（第一幕时见「第一幕」）', ambCats: '环境音库里的分类：按大类一组，「大类：小类、小类」', sfxCats: '音效库里的分类，同上', bgm: '曲库的分类和常用标签（见「曲库」）；不用找配乐时见「不用找配乐」', units: '本轮正文切成的单元：一行「[编号|类型] 原文」' } },
  { id: 'listen.first', group: 'listen', section: '主提示词', label: '第一幕', desc: '{{scene}}：还没有上一幕时。', vars: {} },
  { id: 'listen.noCats', group: 'listen', section: '主提示词', label: '库里没分类', desc: '{{ambCats}} {{sfxCats}}：这一种的声音都没分类时。', vars: {} },
  { id: 'listen.bgm', group: 'listen', section: '配乐', label: '曲库', desc: '{{bgm}}：曲子比导演每轮看的候选多时。', vars: { cats: '曲库的分类：按大类一组（没分类时见「库里没分类」）', tags: '曲库里用得最多的标签（最多 80 个）' } },
  { id: 'listen.noBgm', group: 'listen', section: '配乐', label: '不用找配乐', desc: '{{bgm}}：曲库没超过候选数、或者没有曲子时（导演全看得到，不用找）。', vars: {} },
  // 情绪归类
  { id: 'judge.system', group: 'judge', section: '主提示词', label: '系统提示词', desc: '怎么判断归进已有的还是新开、输出格式。', vars: {} },
  { id: 'judge.user', group: 'judge', section: '主提示词', label: '用户消息', desc: '', vars: { emotions: '情绪库（见下面「情绪库」，每种一行照导演那边「每种情绪一行」的写法）', items: '这一轮新造的词，一个一行（见「每个新词一行」）' } },
  { id: 'judge.emotions', group: 'judge', section: '情绪库', label: '情绪库', desc: '{{emotions}}：按类别分组，每种一行；空的类别后面写导演那边「空的类别」那句。', vars: { list: '按类别列好的情绪' } },
  { id: 'judge.item', group: 'judge', section: '每个新词一行', label: '每个新词一行', desc: '', vars: { name: '新词', base: '导演写的最接近的那种（没写空着）', uses: '用到它的台词（见下面两条），用；隔开' } },
  { id: 'judge.use', group: 'judge', section: '每个新词一行', label: '一句台词', desc: '用到这个词的一句（一个词最多列三句）。', vars: { who: '谁的情绪（说话的人，或者有反应的人）', text: '这一句的原文（最多 80 字）' } },
  { id: 'judge.noUse', group: 'judge', section: '每个新词一行', label: '没找到台词', desc: '这一轮的台词里没找到用这个词的。', vars: {} },
  // 表演设计师
  { id: 'acting.system', group: 'acting', section: '主提示词', label: '系统提示词', desc: '怎么设计动作和表情、本性和处境怎么分、强弱 level 怎么标、输出格式。read、now 是人物志里的两条表演笔记（本性、这一局）。', vars: STYLE_HINT },
  { id: 'acting.user', group: 'acting', section: '主提示词', label: '用户消息', desc: '', vars: { context: '人物卡和世界书', turn: '读到第几轮', story: '到这一轮为止的全部剧情（共用 → 剧情的写法）', person: '角色档案（共用 → 角色档案的写法）', ...ROLE, current: '已有的设计（补设计时，见「已有设计的写法」）', emotions: '要设计的情绪（见「情绪清单」）', task: '这次的任务（整套 / 补上 / 复盘 / 到了新世界 / 标本性和处境 / 只重写表演笔记）' } },
  { id: 'acting.task.full', group: 'acting', section: '任务', label: '整套设计', desc: '第一次给这个人设计。', vars: {} },
  { id: 'acting.task.add', group: 'acting', section: '任务', label: '补上几种情绪', desc: '已有设计、要补上新情绪或重新设计几种表情时（立绘设计师顺手补设计时也用这一段）。', vars: {} },
  { id: 'acting.task.note', group: 'acting', section: '任务', label: '只重写表演笔记·本性', desc: '人物志里点「让设计师重写」表演笔记·本性时。', vars: {} },
  { id: 'acting.task.review', group: 'acting', section: '任务', label: '处境变了，复盘', desc: '导演写了收起、放回或者处境转了的那一轮之后（或者人物志里点「让设计师复盘」）：收起的动作里的情绪重新安家，需要时给新处境设计新动作，重写这一局的笔记。', vars: { turn: '第几轮', changes: '这一轮这个人的变化（见「处境的变化」）', newPoses: '设置里关了「复盘时设计新动作」时那一句（见「这次不加新动作」），开着时是空的' } },
  { id: 'acting.task.world', group: 'acting', section: '任务', label: '到了新世界', desc: '全局角色在新的一局第一次要设计时：带来的只有本性动作，按这个世界设计处境动作。', vars: {} },
  { id: 'acting.task.label', group: 'acting', section: '任务', label: '给老设计标本性和处境', desc: '以前设计的、还没分本性和处境的：每个动作标上，两条笔记分开。', vars: {} },
  { id: 'acting.task.more', group: 'acting', section: '任务', label: '让 AI 加动作', desc: '人物志 →「动作与表情」里点「让 AI 加动作」时：在已有设计上新加几个动作，已有的不动。你写的要求接在后面（见「玩家的要求」）。', vars: { count: '要加几个动作（你在人物志里填的数）' } },
  { id: 'acting.count', group: 'acting', section: '玩家的要求', label: '整套设计时定了动作数', desc: '人物志里「现在设计」「重新设计」时填了动作数，接在「整套设计」那段后面；没填（设计师自己定）时不发。', vars: { count: '你填的动作数' } },
  { id: 'acting.ask', group: 'acting', section: '玩家的要求', label: '追加要求', desc: '人物志里设计、加动作时你写的追加要求，接在这次任务的最后；没写时不发。', vars: { text: '你写的要求' } },
  { id: 'acting.change', group: 'acting', section: '处境的变化', label: '一处变化', desc: '{{changes}} 的每一行。', vars: { quote: '那一句的开头（玩家在人物志里收起的没有）', what: '收起、放回了什么（见下面几条）', why: '为什么：导演写的原因，玩家写的，或者靠的长期状态没了' } },
  { id: 'acting.change.off', group: 'acting', section: '处境的变化', label: '收起', desc: '', vars: { poses: '收起的动作：编号「名字」' } },
  { id: 'acting.change.on', group: 'acting', section: '处境的变化', label: '放回', desc: '', vars: { poses: '放回的动作' } },
  { id: 'acting.change.shift', group: 'acting', section: '处境的变化', label: '只说处境变了', desc: '导演只写了原因、没收起动作时的 {{what}}。', vars: {} },
  { id: 'acting.change.needs', group: 'acting', section: '处境的变化', label: '靠的长期状态没了', desc: '动作靠的长期状态这一轮没了（项链摘了、伤好了）时的 {{why}}。', vars: { states: '没了的长期状态' } },
  { id: 'acting.change.manual', group: 'acting', section: '处境的变化', label: '玩家点的复盘', desc: '人物志里点「让设计师复盘」时，{{changes}} 写这一句。', vars: {} },
  { id: 'acting.noNewPoses', group: 'acting', section: '处境的变化', label: '这次不加新动作', desc: '{{newPoses}}：设置里关了「复盘时设计新动作」时。', vars: {} },
  { id: 'acting.noEmotions', group: 'acting', section: '任务', label: '这次不设计表情', desc: '只重写表演笔记时，情绪清单写这个。', vars: {} },
  { id: 'acting.line.builtin', group: 'acting', section: '情绪清单', label: '内置情绪', desc: '', vars: { key: '英文键', label: '名字', use: '用在什么场面（情绪库里写的）' } },
  { id: 'acting.line.custom', group: 'acting', section: '情绪清单', label: '新情绪', desc: '', vars: { key: '情绪词本身', near: '接近的那个（替身，或者它那一类的代表情绪）', use: '用在什么场面（情绪库里写了的话）' } },
  { id: 'acting.line.placed', group: 'acting', section: '情绪清单', label: '已在动作里的', desc: '', vars: { line: '上面两条写出来的那一行', poses: '它在哪些动作里：编号「名字」' } },
  { id: 'acting.current', group: 'acting', section: '已有设计的写法', label: '已有的设计', desc: '{{current}}', vars: { read: '表演笔记·本性（档案里有玩家写的那条时不带）', now: '表演笔记·这一局（玩家写了时不带）', poses: '每个动作一行（见下一条）', faces: '每种表情一行' } },
  { id: 'acting.current.pose', group: 'acting', section: '已有设计的写法', label: '一个动作', desc: '', vars: { id: '动作编号', label: '名字', kind: '本性 / 处境（没标时见「空着时的说法」）', premise: '处境动作的前提', needs: '靠的长期状态', desc: '描述', tags: '身体 tag', emotions: '里面的情绪（第一个是底图）', status: '此刻不在的原因（收起了、靠的长期状态没了；复盘时写）' } },
  { id: 'acting.current.face', group: 'acting', section: '已有设计的写法', label: '一种表情', desc: '', vars: { label: '情绪名', level: '强弱（微 / 中 / 强 / 极）', desc: '描述', tags: '脸上的 tag' } },
  { id: 'acting.blanks', group: 'acting', section: '已有设计的写法', label: '空着时的说法', kind: 'map', desc: 'noDesc 动作没写描述，base 标在底图情绪后面，noKind 老设计里还没标本性还是处境。', vars: {} },
  // 立绘设计师
  { id: 'sprite.system', group: 'sprite', section: '主提示词', label: '系统提示词', desc: '立绘 tag 怎么写、输出格式。', vars: STYLE_HINT },
  { id: 'sprite.user', group: 'sprite', section: '主提示词', label: '用户消息', desc: '', vars: { context: '人物卡和世界书', turn: '读到第几轮', story: '到这一轮为止的全部剧情', person: '角色档案', ...ROLE, design: '顺手补设计时的那一节（见「顺手补设计」；不补时空着）', references: '已经画好的立绘（见下面「已经画好的」）', targets: '要画的差分，一张一行（见「每张差分那一行」）' } },
  { id: 'sprite.references', group: 'sprite', section: '主提示词', label: '已经画好的', desc: '{{references}}：同一套固定外貌已经画好的几张，给设计师对齐写法。', vars: { list: '一张一行：差分名：tag' } },
  { id: 'sprite.line.whole', group: 'sprite', section: '每张差分那一行', label: '整张画的', desc: '底图、不换脸的差分。', vars: { id: '差分编号', outfit: '服装', states: '长期状态', emotion: '情绪名', use: '这种情绪用在什么场面（情绪库里写的）', near: '新情绪接近哪个（内置的空着）', guide: '动作（见下面几条）', base: '是底图时的那一句（见下面）', era: '段落里当时的样子、变化之前的样子（见下面）' } },
  { id: 'sprite.line.face', group: 'sprite', section: '每张差分那一行', label: '只换脸的', desc: '在同一个动作的底图上只重画脸。', vars: { id: '差分编号', anchor: '底图的情绪', pose: '动作名', emotion: '情绪名', use: '这种情绪用在什么场面', near: '新情绪接近哪个', look: '设计好的表情，或者没设计时情绪的神情参考' } },
  { id: 'sprite.line.design', group: 'sprite', section: '每张差分那一行', label: '先设计再写的（开着只换脸）', desc: '顺手补设计时，还没设计的情绪那一行；设置里开着「表情只换脸」时用这条。', vars: { id: '差分编号', emotion: '情绪名', use: '这种情绪用在什么场面', near: '新情绪接近哪个', outfit: '服装', states: '长期状态', era: '段落里当时的样子（见下面）' } },
  { id: 'sprite.line.free', group: 'sprite', section: '每张差分那一行', label: '不按动作库的（自由画）', desc: '人物志里画一张差分时选了「不按动作库」：动作照你的要求自由设计，另外写这个动作的名字、描述和身体 tag（存成新动作、绑到别的动作时用）。', vars: { id: '差分编号', outfit: '服装', states: '长期状态', emotion: '情绪名', use: '这种情绪用在什么场面', near: '新情绪接近哪个', look: '设计好的这个人的这种表情（没设计时空着）', era: '段落里当时的样子（见下面）' } },
  { id: 'sprite.ask', group: 'sprite', section: '每张差分那一行', label: '你对这张的要求', desc: '人物志里画一张差分时写了要求（按动作库、不按动作库都能写），接在那一行最后；没写时不发。', vars: { text: '你写的要求' } },
  { id: 'sprite.line.designWhole', group: 'sprite', section: '每张差分那一行', label: '先设计再写的（整张画）', desc: '同上，表情整张画时（默认）用这条。', vars: { id: '差分编号', emotion: '情绪名', use: '这种情绪用在什么场面', near: '新情绪接近哪个', outfit: '服装', states: '长期状态', era: '段落里当时的样子（见下面）' } },
  { id: 'sprite.look', group: 'sprite', section: '每张差分那一行', label: '设计好的表情', desc: '', vars: { desc: '表情描述', tags: '脸上的 tag' } },
  { id: 'sprite.lookTags', group: 'sprite', section: '每张差分那一行', label: '设计好的表情（没写描述）', desc: '', vars: { tags: '脸上的 tag' } },
  { id: 'sprite.faceAct', group: 'sprite', section: '每张差分那一行', label: '只换脸、没设计表情时', desc: '给情绪库里这种情绪的动作说明当参考。', vars: { act: '情绪库里的动作说明' } },
  { id: 'sprite.guide.designed', group: 'sprite', section: '每张差分那一行', label: '设计好的动作', desc: '', vars: { pose: '动作名', desc: '描述（没写时「照身体 tag」）', tags: '身体 tag' } },
  { id: 'sprite.guide.group', group: 'sprite', section: '每张差分那一行', label: '通用动作组', desc: '没给这个人设计动作时用的通用动作组（写了样子的）。', vars: { pose: '动作组名', desc: '描述', tags: '身体 tag' } },
  { id: 'sprite.guide.act', group: 'sprite', section: '每张差分那一行', label: '只有情绪的动作参考', desc: '', vars: { act: '情绪库里的动作说明' } },
  { id: 'sprite.base.designed', group: 'sprite', section: '每张差分那一行', label: '是这个动作的底图', desc: '', vars: { pose: '动作名', members: '同一个动作里会在这张上只换脸的情绪' } },
  { id: 'sprite.base.group', group: 'sprite', section: '每张差分那一行', label: '是通用动作组的底图', desc: '', vars: { pose: '动作组名', members: '同组会在这张上只换脸的情绪' } },
  { id: 'sprite.era.earlier', group: 'sprite', section: '每张差分那一行', label: '变化之前的样子', desc: '这一轮中途才换衣服、戴上饰物之前的那一套。', vars: {} },
  { id: 'sprite.era.then', group: 'sprite', section: '每张差分那一行', label: '段落里当时的样子', desc: '回忆、梦这类段落里当时的样子。', vars: { mode: '段落名（回忆、梦……）' } },
  { id: 'sprite.blanks', group: 'sprite', section: '每张差分那一行', label: '空着时的说法', kind: 'map', desc: 'noOutfit 档案没写服装，poseDesc 动作没写描述，none 没有长期状态。', vars: {} },
  { id: 'sprite.design', group: 'sprite', section: '顺手补设计', label: '补设计那一节', desc: '{{design}}：已经给这个人设计过、这次要画的情绪里有没设计的（或者要重新设计表情）时，补设计合进这一次写词：同一个请求里先补设计、再写词，资料和剧情只读一遍。', vars: { rules: '表演设计师的系统提示词', current: '已有的设计', emotions: '要先设计的情绪', task: '表演设计师的「补上几种情绪」' } },
  { id: 'sprite.combo', group: 'sprite', section: '顺手补设计', label: '两份一起输出', desc: '接在用户消息最后。', vars: {} },
  // 插画分镜师
  { id: 'cg.system', group: 'cg', section: '主提示词', label: '系统提示词', desc: 'Base + 每人一个角色块的写法、NSFW、输出格式。', vars: STYLE_HINT },
  { id: 'cg.user', group: 'cg', section: '主提示词', label: '用户消息', desc: '', vars: { context: '人物卡和世界书', story: '此前的剧情', turn: '第几轮', units: '这一轮的正文单元', cast: '入画的人的档案（见「角色档案的写法」）', ...ROLE, references: '已经画过的插画（见下面）', targets: '要画的插画，一张一条（见「每张插画那一条」）' } },
  { id: 'cg.references', group: 'cg', section: '主提示词', label: '已经画过的', desc: '{{references}}', vars: { list: '已经画过的几张：名字 + Base 和每人一行' } },
  { id: 'cg.person', group: 'cg', section: '角色档案的写法', label: '一个人', desc: '', vars: { name: '名字', gender: '性别', appearance: '固定外貌', outfit: '此刻穿着', others: '衣橱里还有的', states: '长期状态', temp: '临时状态', note: '玩家写的备注' } },
  { id: 'cg.noCast', group: 'cg', section: '角色档案的写法', label: '还没有人建档', desc: '', vars: {} },
  { id: 'cg.line', group: 'cg', section: '每张插画那一条', label: '一张插画', desc: '', vars: { id: '编号', after: '插在哪个单元后面', quote: '那个单元的开头', title: '标题', moment: '画什么', who: '入画的人', nsfw: '露骨的写 nsfw，不是的空着', shape: '画幅已经定了的写竖图 / 横图', size: 'portrait / landscape' } },
  { id: 'cg.era.earlier', group: 'cg', section: '每张插画那一条', label: '变化之前', desc: '这一张在一些人样子变化之前。', vars: {} },
  { id: 'cg.era.then', group: 'cg', section: '每张插画那一条', label: '段落里', desc: '这一张在回忆、梦这类段落里。', vars: { mode: '段落名' } },
  { id: 'cg.era.person', group: 'cg', section: '每张插画那一条', label: '当时的样子', desc: '', vars: { name: '名字', appearance: '固定外貌', outfit: '穿着', states: '长期状态' } },
  { id: 'cg.current', group: 'cg', section: '每张插画那一条', label: '现在的提示词', desc: '鉴赏里改写一张时，先给它看现在的。', vars: {} },
  { id: 'cg.instruction', group: 'cg', section: '每张插画那一条', label: '玩家的修改意见', desc: '', vars: { text: '玩家写的意见' } },
  { id: 'cg.blanks', group: 'cg', section: '每张插画那一条', label: '空着时的说法', kind: 'map', desc: 'female / male / other 性别，noLook 没建档，noTags 衣服没写 tag，noOutfit 档案没写穿着，none 没有长期状态，anyMoment 导演没说画什么，end 插在最后，eraLook / eraOutfit 当时的样子空着，portrait / landscape 画幅。', vars: {} },
  // 共用
  { id: 'shared.system', group: 'shared', section: '共用开头', label: '共用的系统提示词', desc: '开着「共用开头」时（设置 → 导演），导演和几位设计师都用这一句当系统提示词，各自的规矩放进用户消息的【你的工作】一节。', vars: {} },
  { id: 'shared.role', group: 'shared', section: '共用开头', label: '【你的工作】一节', desc: '包住这位的规矩。', vars: { rules: '这位的系统提示词（填好变量的）' } },
  { id: 'shared.styleHint', group: 'shared', section: '各渠道说明', label: '{{styleHint}}', kind: 'map', desc: '每行「渠道：一句话」：novelai、comfyui、webui、openai。', vars: {} },
  { id: 'shared.context', group: 'shared', section: '资料和剧情的写法', label: '资料', desc: '{{context}}：人物卡和世界书。没有资料时整节不发；装不下模型窗口时从后面截短。', vars: { text: '人物卡、性格、情境、世界书条目' } },
  { id: 'shared.story.turn', group: 'shared', section: '资料和剧情的写法', label: '剧情的一轮', desc: '{{story}} 里的每一轮。', vars: { turn: '第几轮', text: '这一轮的正文' } },
  { id: 'shared.story.dropped', group: 'shared', section: '资料和剧情的写法', label: '早的剧情装不下', desc: '剧情太长、从最早的轮次删起时，写在最前面。', vars: { n: '略去了几轮' } },
  { id: 'shared.story.empty', group: 'shared', section: '资料和剧情的写法', label: '还没有剧情', desc: '', vars: {} },
  { id: 'shared.person', group: 'shared', section: '角色档案的写法', label: '角色档案', desc: '{{person}}：给表演设计师和立绘设计师看的全部设定。', vars: { name: '名字', gender: '性别', appearance: '固定外貌', wardrobe: '衣橱，一套一行（见下一条）', outfit: '此刻穿着', states: '长期状态', temp: '临时状态', userNote: '玩家写的表演笔记·本性', aiNote: '设计师写的表演笔记·本性（有玩家写的就不带这条）', userHere: '玩家写的表演笔记·这一局', aiHere: '设计师写的表演笔记·这一局（有玩家写的就不带这条）', note: '玩家写的立绘备注', negative: '不要出现的' } },
  { id: 'shared.person.outfit', group: 'shared', section: '角色档案的写法', label: '衣橱里的一套', desc: '', vars: { name: '衣服名', tags: '这套的 tag' } },
  { id: 'shared.person.state', group: 'shared', section: '角色档案的写法', label: '一个长期状态', desc: '', vars: { name: '状态名', tags: '它的 tag' } },
  { id: 'shared.person.blanks', group: 'shared', section: '角色档案的写法', label: '空着时的说法', kind: 'map', desc: 'female / male / other 性别，noLook 没建档，noTags 衣服没写 tag，noStateTags 状态没写 tag，none 没有长期状态。', vars: {} },
  { id: 'shared.retry', group: 'shared', section: '出错重来', label: '输出坏了重要一次', desc: '几位设计师第一次的输出用不了时。', vars: { error: '用不了的原因' } },
  { id: 'shared.missing', group: 'shared', section: '出错重来', label: '漏写了几条', desc: '接在只列漏掉那几条的用户消息后面。', vars: {} },
  // 出图固定词
  { id: 'image.spriteFrame', group: 'image', section: '立绘', label: '立绘构图（Base）', kind: 'tags', desc: '立绘整张图的构图词。角色块里写了不看镜头的视线时，其中的 looking at viewer 自动拿掉。', vars: {} },
  { id: 'image.spriteCharFrame', group: 'image', section: '立绘', label: '立绘构图（角色块末尾）', kind: 'tags', desc: 'NovelAI V4 起，这个人的角色块末尾再补一遍正面直立。', vars: {} },
  { id: 'image.spriteBg', group: 'image', section: '立绘', label: '立绘底色', kind: 'tags', desc: '', vars: {} },
  { id: 'image.spriteBgClear', group: 'image', section: '立绘', label: '立绘透明底', kind: 'tags', desc: '开着透明底、模型是 NovelAI V5 时。', vars: {} },
  { id: 'image.closeUp', group: 'image', section: '立绘', label: '换脸放大重画的景别词', kind: 'tags', desc: '放大重画只裁了头那一块，构图词换成这个（去掉哪些见过滤规则）。', vars: {} },
  { id: 'image.bgSuffix', group: 'image', section: '背景', label: '背景后缀', kind: 'tags', desc: '', vars: {} },
  { id: 'image.time', group: 'image', section: '背景', label: '时段', kind: 'map', desc: '每行「时段：tag」：dawn 黎明、morning 早上、noon 中午、afternoon 下午、dusk 黄昏、evening 傍晚、night 夜里、midnight 深夜。', vars: {} },
  { id: 'image.weather', group: 'image', section: '背景', label: '天气', kind: 'map', desc: '每行「天气：tag」：rain 雨、storm 暴风雨、snow 雪、sakura 樱花、leaves 落叶、fog 雾、fireflies 萤火虫、stars 星空、blizzard 暴风雪、wind 大风。', vars: {} },
  { id: 'image.openai.cg', group: 'image', section: 'OpenAI 兼容渠道', label: '插画的开头', desc: '通用图像模型读的是一段英文，插画以这句开头。', vars: {} },
  { id: 'image.openai.bg', group: 'image', section: 'OpenAI 兼容渠道', label: '背景的开头', desc: '', vars: {} },
  { id: 'image.openai.sprite', group: 'image', section: 'OpenAI 兼容渠道', label: '立绘的开头', desc: '', vars: {} },
  { id: 'image.openai.style', group: 'image', section: 'OpenAI 兼容渠道', label: '画风没填时', desc: '画风里没填画师串时补的一句。', vars: {} },
  // 过滤规则
  { id: 'filter.spriteDrop', group: 'filter', section: '立绘', label: '构图词归插件管', kind: 'list', desc: '立绘设计师写了也去掉（一行一个，整个 tag 对上才算；* 是任意几个字，# 是任意几位数字）。', vars: {} },
  { id: 'filter.spriteFeet', group: 'filter', section: '立绘', label: '衣橱里画不到的鞋', kind: 'list', desc: '立绘只画到大腿（cowboy shot），衣橱里这套衣服锁进立绘时，这些鞋袜的 tag 不带（一行一个，整个 tag 对上才算；* 是任意几个字）。插画照常带。', vars: {} },
  { id: 'filter.colors', group: 'filter', section: '立绘', label: '发色瞳色的颜色词', kind: 'list', desc: '档案定了发色、瞳色的，设计师写成别的颜色（带这些颜色词的 … hair / … eyes）就去掉；衣橱里这套衣服定了的那一件（比如 white shirt），设计师写成别的颜色（blue shirt）也去掉。', vars: {} },
  { id: 'filter.harsh', group: 'filter', section: '收轻', label: '吓人的词，去掉', kind: 'list', desc: '立绘表情收着画：这些整个去掉（玩家自己写的那张不收）。', vars: {} },
  { id: 'filter.softer', group: 'filter', section: '收轻', label: '太用力的词，换轻一档', kind: 'pairs', desc: '一行「原词 → 换成」。自己写了权重的照写的来。', vars: {} },
  { id: 'filter.face.exact', group: 'filter', section: '只换脸：算表情的', label: '整个是这个词', kind: 'list', desc: '只换脸时只留脸上的表情：tag 整个是这些词的算表情。', vars: {} },
  { id: 'filter.face.words', group: 'filter', section: '只换脸：算表情的', label: '带这些词', kind: 'list', desc: 'tag 里带着这些词（整词，连字符当空格）的算表情。颜文字（:d、>_<）也算。', vars: {} },
  { id: 'filter.face.eyeBefore', group: 'filter', section: '只换脸：算表情的', label: '这些词 + eyes', kind: 'list', desc: '「closed eyes」「half-closed eyes」这种：这些词后面接 eye / eyes 的算表情。', vars: {} },
  { id: 'filter.face.eyeAfter', group: 'filter', section: '只换脸：算表情的', label: 'eyes + 这些词', kind: 'list', desc: '「eyes closed」这种：eye / eyes 后面接这些词的算表情。', vars: {} },
  { id: 'filter.face.not', group: 'filter', section: '只换脸：算表情的', label: '带这些词的不算', kind: 'list', desc: '外貌、手、构图（hand over mouth、long eyelashes、eye-level、facing viewer），还有角色设定里的瞳孔（slit pupils 竖瞳、star-shaped pupils 星星瞳）：带这些词的不算表情，换脸时照底图留着。心形瞳 heart-shaped pupils 多是情绪，默认还算表情。', vars: {} },
  { id: 'filter.otherGaze', group: 'filter', section: '只换脸：算表情的', label: '不看镜头的视线', kind: 'list', desc: '表情里有这些时，构图词里的 looking at viewer 拿掉。', vars: {} },
  { id: 'filter.poseDrop', group: 'filter', section: '动作', label: '动作 tag 里去掉的', kind: 'list', desc: '设计好的动作只留身体：这些构图、侧身词去掉（写法同上面的构图词）；脸上的表情也去掉。', vars: {} },
  { id: 'filter.lookWords', group: 'filter', section: '动作', label: '外貌词', kind: 'list', desc: '带这些词（或上面的颜色词）的 … hair / … eyes 是固定外貌，不是动作，去掉。', vars: {} },
  { id: 'filter.closeUpDrop', group: 'filter', section: '换脸', label: '放大重画时去掉的构图词', kind: 'list', desc: '放大重画只裁了头，这些构图词去掉，换上出图固定词里的景别词。', vars: {} },
]

export const PROMPTS = new Map(ENTRIES.map(e => [e.id, { kind: 'text', ...e }]))
for (const id of PROMPTS.keys()) if (!(id in BIG) && !(id in TEXT_DEFAULTS)) throw new Error('提示词没有默认值：' + id)

// ───────────────────────── 提示词页 ─────────────────────────

const ownOf = (config, id) => config?.prompts?.[id] || null

/** 一段的样子：现在的全文、默认、改没改、内置有没有新版、变量说明（文字里用了没说明的变量也列出来）、上一次填了什么（只给长度）。 */
export function promptItem(config, id) {
  const e = PROMPTS.get(id)
  if (!e) return null
  const def = defaultOf(id)
  const own = ownOf(config, id)
  const text = own ? own.text : def
  const edited = Boolean(own) && own.text !== def
  const used = templateVars(text)
  const vars = [...Object.entries(e.vars || {}).map(([name, desc]) => ({ name, desc, used: used.includes(name) })), ...used.filter(v => !(v in (e.vars || {}))).map(name => ({ name, desc: '', unknown: true, used: true }))]
  const last = lastFill(id)
  return {
    id, group: e.group, section: e.section, label: e.label, desc: e.desc, kind: e.kind, vars, def, text, edited,
    // 改的时候内置是另一版：内置更新过（老设置搬过来的不知道当时是哪一版）
    stale: edited && Boolean(own.base) && own.base !== fingerprint(def),
    legacy: edited && !own.base,
    last: last ? { at: last.at, sizes: Object.fromEntries(Object.entries(last.values).map(([k, v]) => [k, v.length])) } : null,
  }
}

export function promptView(config) {
  return { groups: PROMPT_GROUPS, shared: sharedPrefix(config), items: [...PROMPTS.keys()].map(id => promptItem(config, id)) }
}

/** 上一次这一段填进去的变量（全文）。 */
export const promptLast = id => lastFill(id)

/**
 * 改一段：text 存成玩家的（跟默认一字不差就当没改）；reset 恢复默认；keep「内置有新版」时保留自己的（不再提示）。
 * 原地改设置文件里存的那份（saved），老设置在导演那节的四个大框一并搬进来、原来的字段清掉。
 */
export function editPrompt(saved, id, { text, reset = false, keep = false } = {}) {
  if (!PROMPTS.has(id)) throw new Error('没有这段提示词')
  const prompts = cleanPrompts(saved.prompts, saved.director)
  for (const v of Object.values(prompts)) delete v.legacy
  const def = defaultOf(id)
  if (reset) delete prompts[id]
  else if (keep) { if (prompts[id]) prompts[id].base = fingerprint(def) }
  else {
    if (typeof text !== 'string') throw new Error('提示词要是一段文字')
    const t = text.replace(/\r\n?/g, '\n').slice(0, PROMPT_MAX)
    if (t === def) delete prompts[id]
    else prompts[id] = { text: t, base: fingerprint(def) }
  }
  saved.prompts = prompts
  if (saved.director && typeof saved.director === 'object') for (const field of Object.keys(LEGACY_PROMPTS)) delete saved.director[field]
  return prompts
}
