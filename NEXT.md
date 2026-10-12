---
handoff_schema: tavernweave/next/v1
project_id: flowgal-two-hosts
status: phase-5-driver-acceptance-pending
updated: 2026-10-12
---

# NEXT · FlowGal 一套核心两个宿主（DSH + SillyTavern）

## 当前权威

- 总设计案：`总设计案.md`
- 活动蓝图：`蓝图集/BLUEPRINT_INDEX.md`（阶段 1 · 拆出核心）
- 执行期持久权威蓝图预算：`0`
- 临时问题支线：无

## 已确认事实

- 驾驶员 2026-10-10 确认设计并「按蓝图开跑」；自测用另装的测试酒馆。
- 起点提交 7f0cbed（origin/main），107 个测试全过。
- DSH 运行时 Electron 43（Node 22.19+ / 24），浏览器标准接口在 Node 侧都有。
- 酒馆 1.19.0：有 ConnectionManagerRequestService（连接配置、流式）、聊天事件、`/api/files/upload`（文件名只许字母数字 `_-.`，平铺）、`/api/images/upload`（一层子文件夹）、请求体上限 500 MB；用户酒馆 `enableCorsProxy: true`、`enableServerPlugins: false`；自带 NovelAI 接口不支持局部重绘。

## 最近证据

- 只读调查（酒馆源码、柏宝绘 / 酒馆数据库生图的 NovelAI 调用方式），见总设计案。
- 阶段 1 · 拆出核心（2026-10-10，提交 9e1792c）：
  - 核心改用 Web 标准接口：新增 lib/bytes.js（base64、随机数、压缩、格式识别）；png.js、http.js（ZIP）、四个出图渠道、engine、music、library 不再用 Buffer / node:*。生成 PNG、解 ZIP 改成异步。
  - DSH 专用代码归入 lib/dsh/（plugin、store、routes、updater、vision 下载）；lib/index.js 只是 DSH 入口的转接；接口表拆成核心的 lib/api.js（含同页直接调用 call()），DSH 只包 HTTP。
  - 自动化：npm test 108/108（含新增 tests/hosts.test.mjs：核心不许用 node:、Buffer、process、require，界面不许引 DSH 宿主层）；npm run build 通过，client.js 不含 node:。
  - DSH 预览冒烟（flowgal-aa-vision，真立绘）：导演整理、插画 ready、两个角色立绘、配乐 3 首、认脸模型状态、工作台自动框、只做这一张（假局部重绘）全部正常。

- 阶段 2 · 酒馆宿主层（2026-10-10）：st/store.js（user/files、user/images、Key 存扩展设置、写回合并）、st/llm.js（连接配置流式 / generateRaw 退路）、st/tavern.js（轮次号写进楼层 extra、正文版本、角色卡 + 世界书、楼层卡片）、st/host.js（装配引擎和接口表）；核心面向用户的文字去掉写死的 DSH。npm test 112/112（新增 tests/st-host.test.mjs 4 组，含「写完一轮 → 导演整理 → 挂场景卡」端到端；边界检查覆盖 st/）。真酒馆里跑引擎并到阶段 3 的测试酒馆冒烟里验。

- 阶段 3、4 · 酒馆界面、出图和媒体（2026-10-10）：界面接口改成可换的传输（src/client/api.js：DSH 走 HTTP，酒馆同页直接调接口表）；共用界面件拆进 src/client/shell.jsx；酒馆版入口 st/index.jsx（魔杖菜单、扩展设置卡、剧场覆盖层、楼层场景卡 / 插画卡、楼层按钮）；manifest.json + dist/st.js（npm run build 一起出）；st/net.js（NovelAI 官方直连，其它走酒馆 /proxy/）；st/vision.js（认脸模型存浏览器缓存、SHA-256、transformers.js 读这份缓存）；全屏层写死视口宽高（酒馆给 html 加了 transform）；界面上宿主说法分开。
  - 自动化：npm test 114/114。
  - 测试酒馆（C:Usersadminst-test，1.19.0，假模型 scripts/st-mock.mjs，开 --corsProxy）：扩展加载；发一轮→导演整理→楼层场景卡；剧场播放；生图渠道加接入点、填 Key→插画、立绘画好存进 user/images/flowgal；配乐上传进 user/files 并播放；认脸小模型和精细模式大模型下到浏览器缓存、自动框（精细模式「大模型找到了嘴」）；工作台只做这一张（假局部重绘）存素材包并播放；导演改走连接配置后流式整理（日志显示 flowgal-mock）；刷新后卡片从存档读回。
  - DSH 预览复查：剧场全屏、楼层卡、出图、导演日志正常。

- 阶段 5 · 打包与测试酒馆验收（2026-10-10）：测试酒馆拆掉开发联接后，从「安装扩展」填 https://github.com/clanso/flowgal 正式安装（克隆 c503c7b 到 data/default-user/extensions/flowgal），不用刷新即加载，旧存档的卡片读回；README 加酒馆版说明（4be4f83）后，在「管理扩展」点更新拉到 4be4f83，提示刷新生效。

- 表情只换脸（2026-10-10，驾驶员新需求，独立于双宿主蓝图）：驾驶员选了「按情绪分几组动作」和「先试再写」。
  - 先试（D:\逆转裁判立绘\scripts\face_nai.py，out/face/）：char_base.png 脸框 [304,184,520,352] 真发 6 次 NovelAI V5 局部重绘（开心、生气、难过、害羞、惊讶、哭）：表情都换出来、人没变，框外 0 像素变化，0 Anlas，V5 额度指标 8%→8%，每张 3~6 秒；生气鼻梁一道红痕、哭的左眼略糊（所以做了「换个种子重画脸」）。
  - 实现：lib/face.js（动作组、脸框、表情 tag、提示词换脸、贴回）；lib/image/png.js 加纯 JS 的 PNG 读写（两宿主都在宿主里贴回）；vocab.js 加 POSES / EMOTION_POSE / EMOTION_FACE；引擎按动作组排底图和换脸、等认脸、face-box / face-redo、底图重画后同组重换；剧场后台认脸（src/client/theater/faceFramer.js）；人物志框脸、设置里开关和动作组。
  - 自动化：npm test 125/125（新增 tests/face.test.mjs 11 条；engine.test.mjs 三条老测试显式关掉只换脸，继续测整张画）；npm run build 通过。核心贴回真实 NovelAI 回图和 Python 原型对比：框外 0 变化，框内平均差 0.7。
  - 预览（flowgal-aa-face，5183，真立绘 + 认脸模型）：两个人 7 张动作底图全部后台自动认出脸，12 张表情换好；人物志「脸」标记、换脸说明、底图的框脸界面、手动框后同组重换、设置里改组 / 恢复默认、窄屏两列都正常。
  - 没验：真实 NovelAI 下的整条流程（预览是假服务）、酒馆版里的换脸（核心同一份，没在测试酒馆跑）、DSH 真机。
- 逆转式立绘 v2（2026-10-11，驾驶员新需求「更细的眨眼、口型」，独立于双宿主蓝图）：
  - 研究：逆转裁判原作动图在浏览器里逐帧解码实测（眨眼 50~150ms/步、说话 130~160ms/帧、摇头 / 转身的中间帧全闭眼），加人眼眨眼、Live2D、Ren'Py、日本动画口パク、Rhubarb 口型的经验，写进 docs/逆转式立绘动画.md。
  - 实现：lib/aa-motion.js（口型类、音节拍子口型轨道、眨眼、演员状态机）；lib/aa-sprite.js 认 v2 素材包（只收默认姿势）；AaSprite.jsx 按 v2 画；人物志导入认 motion.json；预览 --aa-demo 认 v2 目录。
  - 驾驶员反馈后改过：① 眼睛「比旧版退步、颜色不一致」→ 眼睛贴片颜色对齐整图、去掉「略垂」；② 眨眼时头发闪 → 刘海保护；③ 连眨两下像困了 → 两下之间只在半闭停 60ms；④ 转头动画「直接删除，头部保持不动」→ 删掉转头、中间帧、导演 facing、文字等转头；侧身改为另画一张原生侧身立绘（插件外 D:\逆转裁判立绘 的 side_sprite.py 做了 demo）。
  - 素材（插件外做，D:\逆转裁判立绘\out\motion\pack\kimono-girl 正面、kimono-girl-side 原生侧身）：NovelAI V5 共约 97 次请求（含挑候选、试过又删的侧头和中间帧），0 Anlas，V5 额度指标在 8% 到 3% 之间。另查明 V5 局部重绘不认重绘强度参数。
  - 自动化：npm test 132/132；npm run build 通过。
  - 工作台做 v2（2026-10-11，驾驶员「请吧」）：lib/aa-patch.js 洗贴片（颜色对齐、刘海保护，跟 Python 原型逐像素对过；顺带查出原型把嘴的暗处压黑的 bug 并修了）；lib/aa-sprite.js 6 态（眼半闭、闭；嘴齿缝、小开、开、圆，圆嘴框往下多半个框高）和精简版 2 态（闭眼、小开），motionPack 拼 v2；lib/aa-motion.js 的 fitBlink / fitTalk 让缺状态的素材包照样能播；工作台加「精简版（省额度）」开关、按素材包列状态、旧版提示重做升级；「侧身」动作组（默认赌气，底图整张按侧身构图画，style.js），设置页五列。
  - 自动化：npm test 136/136（新增 tests/aa-patch.test.mjs 4 条，workbench 测试改成 v2）；npm run build 通过。
  - 预览（flowgal-aa-sound，5179，假 NovelAI）：工作台完整版「只做这一张」6 个状态、存成 v2、看效果；精简版 2 个状态、标「已动（精简版）」；精简版上单独重画一个状态另一个不丢；设置页「侧身：赌气 · 底图」；控制台无报错。真实 NovelAI：用 FlowGal 自己的拼词和出图代码画了一张侧身组底图，确实是侧身（侧脸、看向一旁），0 Anlas。
  - 没验：DSH / 酒馆真机；工作台在真实 NovelAI 下的整张流程（洗贴片在真实回图上跟原型对过）；侧脸的认脸、换脸效果。
- 动作与表情设计（2026-10-11，驾驶员新需求：动作别所有人共用一套、表情要读完资料按性格设计）：
  - 实现：lib/acting.js（设计的整理、补设计、情绪归哪个动作、给模型看的清单）；prompts.js 加 ACTING_SYSTEM / ACTING_USER（先读人：身份性别经历定站姿和手，性格定幅度；动作 2～5 个、只写身体 tag；表情只写脸 tag）；sprites.js 加 writeActing，立绘设计师的差分清单带上「这个人的动作」「这个人的表情」；engine 画立绘前先保证有设计（第一次画、遇到设计里没有的情绪时补、重画时重新设计这几张脸），底图按设计的动作画、换脸的表情直接用设计；存 game.looks[名].acting，提升全局时带走；通用动作组退成没设计时的保底。人物志「动作与表情」能看能改、重新设计、按设计重画；导演日志「动作与表情 · 名字」；设置 → 导演可换设计提示词。face.js 的表情词白名单补了一批（sulking、tearing up、scowl……）。
  - 自动化：npm test 168/168（新增 tests/acting.test.mjs 6 条：整理 / 补设计、提示词、换脸整条流程、保底和关掉设计师）；npm run build 通过。
  - 预览（假模型给林岚 4 个动作、苏晴 2 个；预览环境连不上 jsDelivr 下不了认脸模型，脸框用接口框的）：设计在立绘前跑完、底图按动作分、补差分后换脸的表情用设计、人物志编辑和窄屏、导演日志的设计结果和提示词都正常。
  - 没验：真实大模型写出来的设计质量、真实 NovelAI 照设计画出来的动作（尤其侧身和手部）、DSH / 酒馆真机。
- 立绘大小和身高（2026-10-12，驾驶员反馈：剧场里大家一样高很死板，要按性别和身高；同样是 cowboy shot，有的头大有的头小）：
  - 查驾驶员 DSH 存档（柯萝伊、布琳希尔德、罗伊、阿黛尔、马科斯）：脸框占图高 11.8%～19.1%，头大的那几张动作 tag 里都有 leaning forward（前倾把镜头拉近）；剧场把每张立绘拉到同一个高度，所以构图差多少头就差多少，也没有身高概念。
  - 实现：lib/stature.js（按性别和外貌 tag 估身高；placeSprite 按脸框把头缩放到同一个比例，再按身高抬高或压低，漫画符号跟着头走）；剧场 Stage 按这张图的脸框和这个人的身高放；faceFramer 顺带给整张画的立绘量脸框（face-box 的 measure，只记框、不重换同组表情）；身高优先级 档案里写的 → 动作与表情设计时设计师估的（ACTING 多一个 height）→ 性别 + 外貌（矮人、孩子、矮小、高挑）；人物志档案加「身高」，本局 / 全局都能写，提升、复制回本局带着；生成侧动作 tag 去掉前倾、弯腰（设计提示词、立绘提示词、tag 过滤、角色负面词）。
  - 自动化：npm test 178/178（新增 tests/stature.test.mjs 5 条）；npm run build 通过。
  - 预览：人物志身高一栏（占位显示估的身高和来源）、剧场两人站位正常。用驾驶员的真立绘离线按新算法排了一张改前改后对比（罗伊、马科斯没在存档里认过脸，脸框是手估的）。
  - 没验：DSH 真机里剧场量脸框后的实际效果；真实大模型估的身高。
- 一轮中途变的样子（2026-10-12，驾驶员反馈：手腕上的发带是剧情中途才缠上的，立绘一开始就带着）：
  - 查驾驶员 DSH 存档：这一章第一幕到终幕在同一轮（549 句），发带第 229 句才捡到、第 328 句前后缠上；衣服、长期状态按轮记，导演把它写进这一轮的长期状态，整轮都带着。重新整理时导演看到的还是上次整理记下的这一轮结束时的样子。
  - 实现：导演在变化那一句写 look（outfit 换上的、on 新加的状态、off 去掉的），people 照样记这一轮结束时的样子；cast.js 的 settleShifts 跟 people 对齐（people 写成开头的样子或没写也推成结束时的，去掉没变的，记下换之前穿的和摘下的 tag）；look.js 的 shiftsAhead / undoShifts 按每一句还没发生的变化倒回去；剧场、立绘（era earlier，设计师提示里写「后来才有的不画」）、插画（挂在变化之前的按变化之前的样子）都按这一句前后分开；导演看这一轮开头的样子（上一轮结束时）；导演日志「从这句起」，人物志标「变化之前」。
  - 自动化：npm test 181/181（新增 tests/shifts.test.mjs 3 条）；npm run build 通过。
  - 预览（临时给第 2 轮林岚加了中途戴上的发夹，没提交）：戴上之前和之后的立绘不同；导演日志那一句显示「从这句起 林岚 +星星发夹」；人物志两套样子都在。
  - 没验：真实大模型会不会照规则在那一句写 look；驾驶员这一局要重新整理那一轮才有。
- 立绘表情收着画、负面只用画师串的、演出型立绘可以前倾（2026-10-12，驾驶员反馈：柯萝伊的脸部差分好可怕、太用力；写词不要自己加负面；演出型立绘可以前倾）：
  - 查驾驶员 DSH 存档：柯萝伊的设计里有 empty eyes（疲惫、压抑的思念、红肿着眼咧嘴笑）、constricted pupils、glaring + clenched teeth、streaming tears、full-face blush、sweat，档案和状态里带 dark circles；拼成一张看，黑眼圈重、眼睛空洞。
  - 实现：style.js 的 softenSprite（吓人的词去掉：empty / dull / hollow eyes、constricted pupils、shaded face、clenched teeth……；太用力的换轻一档：glaring → narrowed eyes、streaming tears → tears、full-face blush → blush、sweat → sweatdrop；dark circles、bags under eyes 压到 0.6），立绘、换脸、工作台都过一遍，玩家自己改过词的那张（writer user）照写的画；动作与表情设计师写的表情存之前就收；内置表情（EMOTION_TAGS、EMOTION_FACE、EMOTION_ACTS）调轻；ACTING、SPRITE 提示词加「表情收着画」一条。负面：去掉插件自己加的立绘负面（整张的背景构图负面、角色块的全身侧身大动作、背景图的人物负面、换脸按表情加的负面），立绘设计师不再写 negative（写了也不收），旧记录里设计师写的负面不再带上；只用画风的负面 + 档案「不要出现」+ 玩家给这张写的 + 插画的「额外负面」；换脸和工作台的负面按现在的画风重算。工作台眨眼口型的状态负面（open eyes 之类）是机械的反面，留着。前倾：动作 tag 不再滤掉 leaning forward / bending，提示词改成「一般不前倾，演出需要的一两个可以」。
  - 自动化：npm test 181/181（acting、face、stature、workbench、sprite-recipe、aa-patch、core 的断言跟着新规则改）；npm run build 通过。用驾驶员存档里柯萝伊的设计过了一遍：10 种表情的词收轻了（如生气 angry, glaring, furrowed brow, clenched teeth → angry, narrowed eyes, furrowed brow）。
  - 没验：真实 NovelAI 照新词画出来的效果；老立绘要在人物志「动作与表情」点「按这套设计重画」（或单张重画）才会换。

## 开放风险

- 一次全搬：驾驶员首次试用要等全部阶段完成。
- 真实酒馆里还没装过：驾驶员的酒馆有柏宝绘、酒馆数据库生图等扩展，样式和事件冲突只在测试酒馆（无其它扩展）里排除过；真实 NovelAI 请求、真实大模型的导演输出质量未在酒馆版验过（核心与 DSH 版同一份）。
- D1 已定（2026-10-11，C7）：不需要 IGS，跟 IGS 脱钩，不做共处开关和联动。FlowGal 开着时每个聊天都会整理（全局「启用」「每轮自动整理」可关）。
- 阶段 1 改动的是驾驶员正在用的 DSH 版，靠测试 + 预览冒烟 + 驾驶员 DSH 冒烟兜底。

- 表情只换脸只在剧场开着时认脸：剧场没开、没下认脸小模型时同组表情停在「等认脸」，剧场先用底图顶上。
- 已经画好的旧立绘不会自动改成换脸，要重画才会进动作组。
- 「侧身」组默认收了赌气：老存档里画在「抱臂」底图上的赌气要重画才会换到侧身底图上；侧脸只露一只眼，认脸和换脸可能要手动框。
- 动作与表情设计只管之后画的：老存档里已经画好的立绘不会自动改，要在人物志「动作与表情」里点「按这套设计重画」；设计多一次大请求（读全部剧情），每人第一次画立绘前跑一次。
- 剧场按脸框缩放要先量过脸：剧场开着、认脸小模型下好时后台量；没量过的立绘只按身高抬高压低，不缩放。量出来的框离谱（占图高约 22% 以上或 9% 以下）时只缩到 0.6～1.4 倍。
- 一轮中途变的样子靠导演在那一句写 look：老存档要重新整理那一轮；导演漏写时跟以前一样整轮按结束时的样子。
- 表情收着画是按词表收的：词表外的吓人写法（比如自造的 tag）挡不住；玩家自己改过词的那张不收。去掉插件自己加的负面后，背景图偶尔可能画进人、立绘偶尔不是大腿以上，要靠画风的负面兜。

## 下一道门

驾驶员验收：⓪′ 逆转式立绘 v2：看 demo_full_vs_lite.webp、blink_full_vs_lite.webp（精简版）和 demo_face*.webp，DSH 里更新后用工作台给一个角色做完整版、给一个路人做精简版，再画一张赌气看侧身底图；⓪ 表情只换脸在真实 NovelAI 下试一局（看底图 + 同组表情、认脸、框脸、换种子）；① DSH 里检查更新、重启后冒烟（拆核心后的 DSH 版）；② 驾驶员同意后在真实酒馆 D:\AI chats\SillyTavern 安装（扩展 → 安装扩展 → https://github.com/clanso/flowgal）并试用。

## 一句续接

读取总设计案、蓝图索引和本文件，从「阶段 1 · 拆出核心」继续，不重开项目。
