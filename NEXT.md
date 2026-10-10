---
handoff_schema: tavernweave/next/v1
project_id: flowgal-two-hosts
status: phase-5-driver-acceptance-pending
updated: 2026-10-11
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
  - 没验：DSH / 酒馆真机；逆转式工作台还只做 v1（v2 素材包要在插件外做好再导入）。

## 开放风险

- 一次全搬：驾驶员首次试用要等全部阶段完成。
- 真实酒馆里还没装过：驾驶员的酒馆有柏宝绘、IGS、酒馆数据库生图等扩展，样式和事件冲突只在测试酒馆（无其它扩展）里排除过；真实 NovelAI 请求、真实大模型的导演输出质量未在酒馆版验过（核心与 DSH 版同一份）。
- D1（跟 IGS 共处）未定：现在 FlowGal 只有全局「启用」和「每轮自动整理」开关，开着时每个聊天都会整理。
- 阶段 1 改动的是驾驶员正在用的 DSH 版，靠测试 + 预览冒烟 + 驾驶员 DSH 冒烟兜底。

- 表情只换脸只在剧场开着时认脸：剧场没开、没下认脸小模型时同组表情停在「等认脸」，剧场先用底图顶上。
- 已经画好的旧立绘不会自动改成换脸，要重画才会进动作组。
- 逆转式 v2 现在只能导入：工作台不会做新的眼嘴状态、颜色对齐和刘海保护，也不会画原生侧身立绘。

## 下一道门

驾驶员验收：⓪′ 逆转式立绘 v2：看 blink_new.webp、demo_face*.webp / 本地预览，确认眨眼、口型、原生侧身立绘的手感，再决定工作台要不要直接做 v2；⓪ 表情只换脸在真实 NovelAI 下试一局（看底图 + 同组表情、认脸、框脸、换种子）；① DSH 里检查更新、重启后冒烟（拆核心后的 DSH 版）；② 驾驶员同意后在真实酒馆 D:AI chatsSillyTavern 安装（扩展 → 安装扩展 → https://github.com/clanso/flowgal）并试用；③ 决定 D1（每个聊天单独开关，或别的办法）。

## 一句续接

读取总设计案、蓝图索引和本文件，从「阶段 1 · 拆出核心」继续，不重开项目。
