---
blueprint_schema: tavernweave/blueprint-index/v1
project_id: flowgal-two-hosts
blueprint_id: BP-ROOT
status: active
runtime_persistent_blueprint_budget: 0
updated: 2026-10-10
---

# FlowGal 一套核心两个宿主（DSH + SillyTavern） · 蓝图集索引

## 总体阶段与依赖

| 阶段 | 内容 | 依赖 | 退出条件与证据 |
|---|---|---|---|
| 1 拆出核心 | 核心改用 Web 标准接口；DSH 专用部分归到宿主层；接口表从 HTTP 里拆出来 | — | 原有测试全过；新增「核心不引 node:」检查通过；构建通过；DSH 预览冒烟（整理、出图、剧场、工作台）；推 GitHub 后驾驶员 DSH 冒烟 |
| 2 酒馆宿主层 | 存档（user/files、user/images，缓存+防抖写回）、轮次事件、读聊天与角色卡世界书、大模型流式（连接配置）、Key、出图请求转发 | 1 | 假酒馆上下文的单元测试；在测试酒馆里能跑引擎（整理一轮） |
| 3 酒馆界面 | manifest.json、酒馆版打包、同页接口传输、剧场覆盖层、扩展菜单入口、设置卡、楼层场景卡 / 插画卡与按钮 | 2 | 测试酒馆里：发一轮→场景卡→剧场播放 |
| 4 出图和媒体 | 四种出图渠道、配乐与音效上传、图片文件夹、认脸模型（浏览器缓存）、逆转式工作台 | 2、3 | 测试酒馆里：假出图服务出插画/背景/立绘；上传配乐；工作台自动框 |
| 5 打包与真机验收 | 测试酒馆从仓库地址安装、更新；完整流程；交驾驶员真实酒馆试用 | 1–4 | 测试酒馆全流程截图/日志；驾驶员验收 |

## 已声明蓝图

当前仅声明 `BP-ROOT`（本索引）。不预建空白领域蓝图；某阶段确实形成独立边界、独立交付物、独立验收门且本索引装不下时，提交 rescope proposal 由驾驶员决定是否提取。

## 活动阶段合同

**阶段 1 · 拆出核心**（活动中）

- 输入：FlowGal 7f0cbed（DSH 插件，107 个测试）。
- 输出：`lib/` 核心只用 Web 标准接口；DSH 专用代码归入宿主层；HTTP 路由由「接口表 + HTTP 包装」组成。
- 改动边界：不改功能和界面行为；不动 `C:\Users\admin\flowgal`；不碰用户在用的酒馆；不发 NovelAI 请求；保持各文件换行符；不加依赖。
- 退出条件：见上表阶段 1。

任意活动步骤只允许由真实问题触发的一层临时问题支线；关闭后必须回到父步骤。

## 跨域接口

- 存档接口（两宿主同名同义）：`readConfig/updateConfig`、`readSecrets/updateSecrets`、`readGlobalCast/updateGlobalCast`、`readMusic/updateMusic`、`readEmotions/updateEmotions`、`readGame/updateGame`、`readDirectorLog/updateDirectorLog`、`removeGame`、`saveAsset/readAsset/removeAsset`；`update*` 是串行读改写。
- 宿主服务（注入引擎）：`tavern`（onTurnSettled、getTurn、getCardContext、backgroundModel、attach/update/remove/list）、`llm`（stream、listProviders、listModels）、`credentials`、图片文件夹。
- 接口表：`{ 方法, 路径, handler({ query, body }) }`；DSH 包成 HTTP，酒馆同页直接调用；浏览器界面只认 `api` 对象。

## 停止条件

- 同一问题修 2–3 轮仍不稳：停下，向驾驶员提出改方案或砍功能。
- 发现必须服务端插件才能做的功能：停下提交变更提案（不静默加）。
- 阶段 1 若要改 DSH 用户可见行为：停下确认。

## 下一道门

阶段 1 完成 → 推 GitHub（推送前确认 D2）→ 驾驶员 DSH 冒烟 → 进入阶段 2。
