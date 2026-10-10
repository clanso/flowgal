---
handoff_schema: tavernweave/next/v1
project_id: flowgal-two-hosts
status: phase-1-exit-pending-push
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
- 阶段 1 · 拆出核心（2026-10-10，本地提交，未推送）：
  - 核心改用 Web 标准接口：新增 lib/bytes.js（base64、随机数、压缩、格式识别）；png.js、http.js（ZIP）、四个出图渠道、engine、music、library 不再用 Buffer / node:*。生成 PNG、解 ZIP 改成异步。
  - DSH 专用代码归入 lib/dsh/（plugin、store、routes、updater、vision 下载）；lib/index.js 只是 DSH 入口的转接；接口表拆成核心的 lib/api.js（含同页直接调用 call()），DSH 只包 HTTP。
  - 自动化：npm test 108/108（含新增 tests/hosts.test.mjs：核心不许用 node:、Buffer、process、require，界面不许引 DSH 宿主层）；npm run build 通过，client.js 不含 node:。
  - DSH 预览冒烟（flowgal-aa-vision，真立绘）：导演整理、插画 ready、两个角色立绘、配乐 3 首、认脸模型状态、工作台自动框、只做这一张（假局部重绘）全部正常。

## 开放风险

- 一次全搬：驾驶员首次试用要等全部阶段完成。
- 阶段 1 改动的是驾驶员正在用的 DSH 版，靠测试 + 预览冒烟 + 驾驶员 DSH 冒烟兜底。

## 下一道门

推送前问驾驶员 D2（权威文件是否公开）→ 推 GitHub → 驾驶员在 DSH 里「检查更新」+ 重启后冒烟 → 进入阶段 2（酒馆宿主层）。

## 一句续接

读取总设计案、蓝图索引和本文件，从「阶段 1 · 拆出核心」继续，不重开项目。
