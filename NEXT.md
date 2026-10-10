---
handoff_schema: tavernweave/next/v1
project_id: flowgal-two-hosts
status: phase-5-active
updated: 2026-10-10
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

## 开放风险

- 一次全搬：驾驶员首次试用要等全部阶段完成。
- 阶段 1 改动的是驾驶员正在用的 DSH 版，靠测试 + 预览冒烟 + 驾驶员 DSH 冒烟兜底。

## 下一道门

阶段 5：测试酒馆从 GitHub 地址安装（不用联接）、更新；README 写酒馆版安装说明；之后交驾驶员在真实酒馆安装试用（安装另行授权）。驾驶员 DSH 冒烟（daa2abf 起）结果待回。

## 一句续接

读取总设计案、蓝图索引和本文件，从「阶段 1 · 拆出核心」继续，不重开项目。
