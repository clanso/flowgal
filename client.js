/* flowgal 0.2.0 浏览器半边 —— 由 scripts/build-client.mjs 从 src/client 生成，请勿手改。 */
window.__ModuleLoader__.load({
  id: 'flowgal',
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    try {
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name2 in all)
    __defProp(target, name2, { get: all[name2], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/client/index.jsx
var index_exports = {};
__export(index_exports, {
  apply: () => apply,
  inject: () => inject,
  name: () => name
});
module.exports = __toCommonJS(index_exports);
var import_react9 = __toESM(require("react"), 1);

// src/client/styles/theater.css
var theater_default = '/* ───────────── 沉浸式 Galgame · 剧场 ─────────────\n   所有类名以 fg- 开头；皮肤只改 data-skin 上的变量与少量装饰。\n   舞台是 16:9 的容器（container-type:size），字号用 cqw 随舞台缩放。 */\n\n.fg-theater {\n  --accent: #ff7eb6; --accent2: #9b7bff; --accent3: #5ee7ff;\n  --ink: #f5f3ff; --ink-dim: rgba(235, 232, 255, .62);\n  --box-bg: linear-gradient(180deg, rgba(18, 16, 40, .66), rgba(8, 8, 24, .86));\n  --box-border: rgba(255, 255, 255, .14);\n  --box-radius: 1.4cqw;\n  --box-blur: blur(18px) saturate(1.5);\n  --name-ink: #fff;\n  --panel-bg: rgba(10, 10, 26, .82);\n  --chip-bg: rgba(10, 10, 28, .5);\n  --font-body: "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", system-ui, sans-serif;\n  --font-display: "Noto Serif SC", "Source Han Serif SC", "Songti SC", "STSong", serif;\n  --font-latin: "Cormorant Garamond", "Playfair Display", Georgia, serif;\n  --wait-glyph: "◆";\n  position: fixed; inset: 0; z-index: 2147483000; overflow: hidden; overflow: clip;\n  display: flex; align-items: center; justify-content: center;\n  background: #05040c; color: var(--ink);\n  font-family: var(--font-body);\n  -webkit-font-smoothing: antialiased;\n  user-select: none; -webkit-user-select: none;\n  animation: fg-fade-in .5s ease both;\n}\n.fg-theater *, .fg-theater *::before, .fg-theater *::after { box-sizing: border-box; }\n:where(.fg-theater) button { font: inherit; color: inherit; background: none; border: 0; cursor: pointer; padding: 0; }\n.fg-theater.is-closing { animation: fg-fade-out .35s ease both; }\n\n.fg-stage {\n  position: relative; overflow: hidden; overflow: clip;\n  width: min(100vw, calc(100vh * 16 / 9)); height: min(100vh, calc(100vw * 9 / 16));\n  container-type: size; container-name: stage;\n  background: #000;\n  box-shadow: 0 0 120px rgba(0, 0, 0, .8);\n}\n@media (max-aspect-ratio: 4/5) {\n  /* 竖屏手机：舞台铺满，立绘居中放大，对话框加高。 */\n  .fg-stage { width: 100vw; height: 100vh; }\n}\n.fg-camera { position: absolute; inset: 0; transform-origin: 50% 45%; }\n\n/* ── 背景层 ── */\n.fg-bg { position: absolute; inset: -3%; background-size: cover; background-position: center 42%; will-change: transform, opacity; }\n.fg-bg.is-image { animation: fg-kenburns 38s ease-in-out infinite alternate; }\n.fg-bg.is-enter { animation: var(--enter-anim, fg-dissolve) var(--enter-dur, 1.1s) cubic-bezier(.6, .05, .3, 1) both, fg-kenburns 38s ease-in-out infinite alternate; }\n.fg-bg.is-leave { animation: fg-fade-out .9s ease both; }\n@keyframes fg-kenburns { from { transform: scale(1.02) translate(0, 0); } to { transform: scale(1.1) translate(-1.6%, -1.2%); } }\n@keyframes fg-dissolve { from { opacity: 0; filter: blur(8px) brightness(1.3); } to { opacity: 1; filter: none; } }\n@keyframes fg-wipe { from { clip-path: inset(0 100% 0 0); } to { clip-path: inset(0 0 0 0); } }\n@keyframes fg-iris { from { clip-path: circle(0% at 50% 50%); } to { clip-path: circle(80% at 50% 50%); } }\n@keyframes fg-cinematic { 0% { clip-path: inset(50% 0 50% 0); filter: brightness(2); } 60% { clip-path: inset(8% 0 8% 0); } 100% { clip-path: inset(0 0 0 0); filter: none; } }\n@keyframes fg-strips { from { -webkit-mask-size: 100% 0%; mask-size: 100% 0%; } to { -webkit-mask-size: 100% 100%; mask-size: 100% 100%; } }\n.fg-bg.is-enter[data-tr="strips"] { -webkit-mask-image: repeating-linear-gradient(90deg, #000 0 8%, transparent 8% 8.0001%); mask-image: linear-gradient(#000, #000); -webkit-mask-repeat: no-repeat; }\n@keyframes fg-flash-in { 0% { opacity: 0; filter: brightness(4); } 30% { opacity: 1; filter: brightness(3); } 100% { filter: none; } }\n@keyframes fg-black-in { 0%, 45% { opacity: 0; } 100% { opacity: 1; } }\n\n/* 没有背景图时的程序化舞台：天色渐变 + 远景剪影 + 光斑。 */\n.fg-sky { position: absolute; inset: 0; transition: background 1.6s ease; }\n.fg-sky::before { content: ""; position: absolute; left: -10%; right: -10%; bottom: 0; height: 46%;\n  background:\n    radial-gradient(60% 120% at 20% 100%, rgba(0, 0, 0, .55), transparent 70%),\n    radial-gradient(50% 90% at 78% 100%, rgba(0, 0, 0, .5), transparent 70%);\n}\n.fg-sky::after { content: ""; position: absolute; inset: 0;\n  background: radial-gradient(40% 30% at var(--sun-x, 70%) var(--sun-y, 30%), var(--sun, rgba(255, 220, 180, .55)), transparent 70%);\n  mix-blend-mode: screen; animation: fg-breathe-light 9s ease-in-out infinite;\n}\n.fg-skyline { position: absolute; left: 0; right: 0; bottom: 0; height: 38%; opacity: .9; }\n@keyframes fg-breathe-light { 0%, 100% { opacity: .75; } 50% { opacity: 1; } }\n\n/* 时段调色：叠一层渐变，混合模式按时段变化。 */\n.fg-grade { position: absolute; inset: 0; pointer-events: none; transition: background 1.4s ease, opacity 1.4s ease; mix-blend-mode: soft-light; }\n.fg-grade[data-time="dawn"] { background: linear-gradient(180deg, rgba(255, 170, 200, .55), rgba(120, 140, 255, .35)); }\n.fg-grade[data-time="morning"] { background: linear-gradient(180deg, rgba(255, 245, 220, .35), rgba(255, 255, 255, 0)); }\n.fg-grade[data-time="noon"] { opacity: 0; }\n.fg-grade[data-time="afternoon"] { background: linear-gradient(180deg, rgba(255, 220, 160, .35), rgba(255, 200, 120, .15)); }\n.fg-grade[data-time="dusk"] { background: linear-gradient(180deg, rgba(255, 120, 60, .7), rgba(140, 40, 120, .55)); mix-blend-mode: overlay; }\n.fg-grade[data-time="evening"] { background: linear-gradient(180deg, rgba(90, 60, 200, .6), rgba(255, 110, 120, .35)); mix-blend-mode: overlay; }\n.fg-grade[data-time="night"] { background: linear-gradient(180deg, rgba(10, 20, 80, .78), rgba(20, 10, 60, .7)); mix-blend-mode: multiply; }\n.fg-grade[data-time="midnight"] { background: linear-gradient(180deg, rgba(4, 6, 40, .86), rgba(10, 4, 30, .8)); mix-blend-mode: multiply; }\n.fg-vignette { position: absolute; inset: 0; pointer-events: none; background: radial-gradient(120% 90% at 50% 45%, transparent 55%, rgba(0, 0, 0, .55)); }\n.fg-letterbox::before, .fg-letterbox::after { content: ""; position: absolute; left: 0; right: 0; height: 9%; background: #000; z-index: 30; animation: fg-bars .8s cubic-bezier(.6, 0, .2, 1) both; }\n.fg-letterbox::before { top: 0; transform-origin: top; } .fg-letterbox::after { bottom: 0; transform-origin: bottom; }\n@keyframes fg-bars { from { transform: scaleY(0); } }\n\n.fg-particles { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; z-index: 8; }\n\n/* ── 立绘 ── */\n.fg-cast { position: absolute; inset: 0; z-index: 5; pointer-events: none; }\n.fg-actor {\n  position: absolute; bottom: -2%; height: 92%; width: 34%;\n  left: var(--x, 50%); transform: translateX(-50%);\n  transition: left .55s cubic-bezier(.4, .1, .2, 1), filter .4s ease, opacity .45s ease;\n  filter: brightness(.7) saturate(.78);\n  animation: fg-actor-in .6s cubic-bezier(.2, .7, .2, 1) both;\n}\n.fg-actor.is-speaking { filter: brightness(1.04) saturate(1.05) drop-shadow(0 0 1.4cqw rgba(255, 255, 255, .18)); z-index: 2; }\n.fg-actor.is-leaving { animation: fg-actor-out .45s ease both; }\n.fg-actor-body { position: absolute; inset: 0; transform-origin: 50% 100%; animation: fg-breathe 4.8s ease-in-out infinite; }\n.fg-actor.is-speaking .fg-actor-body { animation: fg-speak-hop .42s cubic-bezier(.3, 1.6, .5, 1), fg-breathe 4.8s ease-in-out .42s infinite; }\n.fg-actor img { position: absolute; left: 50%; bottom: 0; height: 100%; width: auto; max-width: none; transform: translateX(-50%);\n  -webkit-mask-image: linear-gradient(180deg, #000 78%, transparent 99%), radial-gradient(120% 100% at 50% 40%, #000 62%, transparent 82%);\n  -webkit-mask-composite: source-in; mask-image: linear-gradient(180deg, #000 78%, transparent 99%); }\n.fg-actor.is-upload img { -webkit-mask-image: none; mask-image: none; }\n.fg-actor img.is-swap { animation: fg-expr-swap .25s ease; }\n@keyframes fg-actor-in { from { opacity: 0; transform: translateX(-50%) translateY(4%); } }\n@keyframes fg-actor-out { to { opacity: 0; transform: translateX(-50%) translateY(3%); } }\n@keyframes fg-breathe { 0%, 100% { transform: scaleY(1); } 50% { transform: scaleY(1.008) translateY(-.25%); } }\n@keyframes fg-speak-hop { 0% { transform: translateY(0); } 40% { transform: translateY(-1.6%); } 100% { transform: translateY(0); } }\n@keyframes fg-expr-swap { from { opacity: .4; filter: brightness(1.4); } }\n\n/* 没有立绘时的剪影立绘：角色色渐变 + 轮廓光。 */\n.fg-silhouette { position: absolute; left: 50%; bottom: 0; height: 94%; aspect-ratio: 0.52; transform: translateX(-50%); }\n.fg-silhouette svg { width: 100%; height: 100%; overflow: visible; }\n.fg-silhouette .sil-rim { fill: none; stroke: color-mix(in oklab, var(--c) 55%, #fff); stroke-width: 2.4; opacity: .85; filter: drop-shadow(0 0 5px var(--c)) drop-shadow(0 0 14px var(--c)); stroke-dasharray: 1400; animation: fg-rim-draw 2.4s cubic-bezier(.4, 0, .2, 1) both; }\n@keyframes fg-rim-draw { from { stroke-dashoffset: 1400; } to { stroke-dashoffset: 0; } }\n.fg-silhouette-name { position: absolute; left: 50%; top: 50%; transform: translateX(-50%); font-family: var(--font-display); font-size: 5.4cqw; font-weight: 900; letter-spacing: .25em; color: transparent; -webkit-text-stroke: 1px color-mix(in oklab, var(--c) 40%, #fff); opacity: .5; writing-mode: vertical-rl; white-space: nowrap; }\n.fg-silhouette-tag { position: absolute; left: 50%; bottom: 30%; transform: translateX(-50%); font-family: var(--font-latin); font-size: .75cqw; letter-spacing: .5em; white-space: nowrap; color: rgba(255, 255, 255, .55); }\n.fg-symbol-anchor { position: absolute; left: 50%; top: 9%; width: 0; height: 0; z-index: 4; }\n/* 漫画符号：外层管弹出与淡出（--life），内层按种类循环一个小动作。 */\n.fg-symbol { position: absolute; left: 3cqw; top: -2cqw; width: 6cqw; height: 6cqw; pointer-events: none; transform-origin: 30% 90%; animation: fg-sym-life var(--life, 2.6s) cubic-bezier(.2, .9, .3, 1.2) both; }\n.fg-symbol-art, .fg-symbol-art svg { display: block; width: 100%; height: 100%; }\n.fg-symbol-art { filter: drop-shadow(0 .3cqw .5cqw rgba(0, 0, 0, .45)); transform-origin: 50% 60%; }\n.fg-symbol[data-kind="heart"] .fg-symbol-art, .fg-symbol[data-kind="bloom"] .fg-symbol-art { animation: fg-sym-beat .7s ease-in-out .3s infinite; }\n.fg-symbol[data-kind="anger"] .fg-symbol-art { animation: fg-sym-throb .32s ease-in-out .2s infinite alternate; }\n.fg-symbol[data-kind="sweat"] .fg-symbol-art { animation: fg-sym-drip 1.4s ease-in .25s infinite; }\n.fg-symbol[data-kind="sparkle"] .fg-symbol-art { animation: fg-sym-twinkle 1.1s ease-in-out infinite; }\n.fg-symbol[data-kind="surprise"] .fg-symbol-art { animation: fg-sym-jolt .5s cubic-bezier(.3, 1.6, .5, 1) .05s 2; }\n.fg-symbol[data-kind="gloom"] { left: -3cqw; top: -4cqw; width: 8cqw; }\n.fg-symbol[data-kind="gloom"] .fg-symbol-art { animation: fg-sym-sink 2.4s ease-out both; }\n.fg-symbol[data-kind="note"] .fg-symbol-art { animation: fg-sym-sway 1.2s ease-in-out infinite; }\n.fg-symbol[data-kind="zzz"] .fg-symbol-art { animation: fg-sym-drift 2.2s ease-in-out infinite; }\n.fg-symbol[data-kind="bulb"] .fg-symbol-art { animation: fg-sym-flicker 1s steps(1) both; }\n.fg-symbol[data-kind="heartbreak"] .fg-symbol-art { animation: fg-sym-crack .9s cubic-bezier(.4, 0, .6, 1) .25s both; }\n.fg-symbol[data-kind="sigh"] .fg-symbol-art { animation: fg-sym-puff 2s ease-out both; }\n.fg-symbol[data-kind="dizzy"] .fg-symbol-art { animation: fg-sym-spin 1.4s linear infinite; transform-origin: 50% 50%; }\n.fg-symbol[data-kind="fire"] .fg-symbol-art { animation: fg-sym-flame .18s ease-in-out infinite alternate; transform-origin: 50% 95%; }\n.fg-symbol[data-kind="blush"] { left: -3.5cqw; top: 6cqw; width: 7cqw; height: 3.4cqw; }\n.fg-symbol[data-kind="blush"] .fg-symbol-art { animation: fg-sym-glow 1.6s ease-in-out infinite alternate; }\n.fg-symbol[data-kind="bloom"] .fg-symbol-art svg { animation: fg-sym-spin 6s linear infinite; }\n.fg-symbol[data-kind="silence"] .fg-symbol-art { animation: fg-sym-bob 1.2s ease-in-out infinite; }\n@keyframes fg-sym-life {\n  0% { opacity: 0; transform: scale(.2) rotate(-14deg); }\n  12% { opacity: 1; transform: scale(1.18) rotate(4deg); }\n  20% { transform: scale(.94) rotate(-2deg); }\n  28%, 82% { opacity: 1; transform: scale(1) rotate(0); }\n  100% { opacity: 0; transform: scale(.9) translateY(-1cqw); }\n}\n@keyframes fg-sym-beat { 0%, 100% { transform: scale(1); } 15% { transform: scale(1.16); } 30% { transform: scale(.98); } 45% { transform: scale(1.1); } }\n@keyframes fg-sym-throb { from { transform: scale(.92) rotate(-3deg); } to { transform: scale(1.12) rotate(3deg); } }\n@keyframes fg-sym-drip { 0% { transform: translateY(0); opacity: 1; } 80% { transform: translateY(1.6cqw); opacity: 1; } 100% { transform: translateY(2cqw); opacity: 0; } }\n@keyframes fg-sym-twinkle { 0%, 100% { transform: scale(1) rotate(0); filter: brightness(1); } 50% { transform: scale(1.12) rotate(18deg); filter: brightness(1.35); } }\n@keyframes fg-sym-jolt { 0% { transform: translateY(0); } 30% { transform: translateY(-1.2cqw) scale(1.08); } 60% { transform: translateY(.3cqw); } 100% { transform: translateY(0); } }\n@keyframes fg-sym-sink { from { transform: translateY(-1.4cqw); opacity: 0; } to { transform: translateY(0); opacity: .95; } }\n@keyframes fg-sym-sway { 0%, 100% { transform: translate(0, 0) rotate(-8deg); } 50% { transform: translate(.8cqw, -.8cqw) rotate(8deg); } }\n@keyframes fg-sym-drift { 0% { transform: translate(0, .6cqw); opacity: .4; } 50% { opacity: 1; } 100% { transform: translate(1.2cqw, -1.6cqw); opacity: .4; } }\n@keyframes fg-sym-flicker { 0% { filter: brightness(.4); } 15% { filter: brightness(1.5); } 22% { filter: brightness(.6); } 30%, 100% { filter: brightness(1.15); } }\n@keyframes fg-sym-crack { 0%, 40% { transform: none; } 50% { transform: translateX(-.3cqw) rotate(-4deg); } 60% { transform: translateX(.3cqw) rotate(4deg); } 100% { transform: translateY(1.2cqw) rotate(-6deg); opacity: .7; } }\n@keyframes fg-sym-puff { from { transform: translateX(-1cqw) scale(.7); opacity: 0; } 40% { opacity: 1; } to { transform: translateX(1.6cqw) scale(1.1); opacity: .6; } }\n@keyframes fg-sym-spin { to { transform: rotate(360deg); } }\n@keyframes fg-sym-flame { from { transform: scale(1, .94) skewX(-2deg); } to { transform: scale(.96, 1.06) skewX(2deg); } }\n@keyframes fg-sym-glow { from { opacity: .55; } to { opacity: 1; } }\n@keyframes fg-sym-bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-.6cqw); } }\n\n/* ── CG ── */\n.fg-cg { position: absolute; inset: 0; z-index: 6; background-size: cover; background-position: center; animation: fg-cg-in 1.2s cubic-bezier(.5, 0, .2, 1) both; }\n.fg-cg::after { content: ""; position: absolute; inset: 0; background: linear-gradient(180deg, transparent 60%, rgba(0, 0, 0, .45)); }\n.fg-cg-img { position: absolute; inset: -2%; background-size: cover; background-position: center; animation: fg-kenburns 30s ease-in-out infinite alternate; }\n.fg-cg-caption { position: absolute; right: 4%; top: 12%; flex-direction: row-reverse; z-index: 2; display: flex; align-items: center; gap: 1cqw; font-family: var(--font-latin); letter-spacing: .3em; font-size: 1.1cqw; color: rgba(255, 255, 255, .85); text-shadow: 0 2px 8px rgba(0, 0, 0, .6); animation: fg-slide-in 1.2s .4s ease both; }\n.fg-cg-caption b { font-family: var(--font-display); font-size: 1.9cqw; letter-spacing: .18em; font-weight: 700; }\n.fg-cg-caption i { width: 4cqw; height: 1px; background: linear-gradient(270deg, var(--accent), transparent); }\n@keyframes fg-cg-in { 0% { opacity: 0; clip-path: polygon(0 0, 0 0, 0 100%, 0 100%); filter: brightness(2.2); } 55% { opacity: 1; } 100% { clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%); filter: none; } }\n.fg-cg-wait { position: absolute; right: 2.4%; top: 12%; z-index: 20; display: flex; align-items: center; gap: .6cqw; font-size: 1cqw; padding: .5cqw 1cqw; border-radius: 99px; background: var(--chip-bg); backdrop-filter: blur(8px); color: var(--ink-dim); }\n.fg-cg-wait i { width: .7cqw; height: .7cqw; border-radius: 50%; background: var(--accent); animation: fg-pulse 1.2s ease-in-out infinite; }\n\n/* ── 镜头 ── */\n.fg-camera[data-cam="shake"] { animation: fg-shake .5s linear; }\n.fg-camera[data-cam="zoom"] { animation: fg-zoom 1.6s cubic-bezier(.2, .7, .2, 1) both; }\n.fg-camera[data-cam="zoomout"] { animation: fg-zoomout 1.6s cubic-bezier(.2, .7, .2, 1) both; }\n.fg-camera[data-cam="pan"] { animation: fg-pan 3s ease-in-out both; }\n.fg-camera[data-cam="tilt"] { animation: fg-tilt 1.2s ease both; }\n.fg-camera[data-cam="blur"] { animation: fg-blur 2.2s ease both; }\n@keyframes fg-shake { 0%, 100% { transform: translate(0, 0); } 15% { transform: translate(-1.2%, .6%); } 30% { transform: translate(1%, -.8%); } 45% { transform: translate(-.8%, .4%); } 60% { transform: translate(.6%, .6%); } 80% { transform: translate(-.3%, -.2%); } }\n@keyframes fg-zoom { from { transform: scale(1); } to { transform: scale(1.12); } }\n@keyframes fg-zoomout { from { transform: scale(1.14); } to { transform: scale(1); } }\n@keyframes fg-pan { 0% { transform: translateX(2%) scale(1.06); } 100% { transform: translateX(-2%) scale(1.06); } }\n@keyframes fg-tilt { 0% { transform: rotate(0); } 40% { transform: rotate(-2.4deg) scale(1.05); } 100% { transform: rotate(-1.4deg) scale(1.04); } }\n@keyframes fg-blur { 0% { filter: blur(0); } 30% { filter: blur(6px); } 100% { filter: blur(0); } }\n.fg-flash { position: absolute; inset: 0; z-index: 40; pointer-events: none; background: #fff; animation: fg-flash .7s ease-out both; }\n.fg-flash.is-red { background: radial-gradient(circle, rgba(255, 40, 60, .2), rgba(160, 0, 20, .75)); }\n.fg-flash.is-black { background: #000; animation: fg-black 1.6s ease both; }\n@keyframes fg-flash { from { opacity: .95; } to { opacity: 0; } }\n@keyframes fg-black { 0% { opacity: 0; } 35%, 60% { opacity: 1; } 100% { opacity: 0; } }\n\n/* ── 地点标题卡 ── */\n.fg-titlecard { position: absolute; left: 6%; top: 34%; z-index: 25; pointer-events: none; animation: fg-titlecard 3.2s ease both; }\n.fg-titlecard-line { width: 26cqw; height: 1px; background: linear-gradient(90deg, var(--accent), var(--accent2), transparent); transform-origin: left; animation: fg-line 1s .1s cubic-bezier(.6, 0, .2, 1) both; }\n.fg-titlecard-name { font-family: var(--font-display); font-size: 4.6cqw; font-weight: 700; letter-spacing: .32em; margin: .8cqw 0 .4cqw; text-shadow: 0 0 2cqw rgba(0, 0, 0, .8), 0 0 4cqw var(--accent2); }\n.fg-titlecard-sub { font-family: var(--font-latin); font-size: 1.3cqw; letter-spacing: .5em; color: rgba(255, 255, 255, .75); text-transform: uppercase; }\n@keyframes fg-titlecard { 0% { opacity: 0; transform: translateX(-2%); } 15% { opacity: 1; transform: none; } 80% { opacity: 1; } 100% { opacity: 0; transform: translateX(1%); } }\n@keyframes fg-line { from { transform: scaleX(0); } }\n\n/* ── HUD ── */\n.fg-hud { position: absolute; left: 2.2%; top: 3.2%; z-index: 20; display: flex; align-items: stretch; gap: .9cqw; transition: opacity .3s; }\n.fg-hud-bar { width: .28cqw; border-radius: 9px; background: linear-gradient(180deg, var(--accent), var(--accent2)); box-shadow: 0 0 1cqw var(--accent); }\n.fg-hud-place { font-family: var(--font-display); font-size: 1.55cqw; font-weight: 700; letter-spacing: .14em; text-shadow: 0 1px 6px rgba(0, 0, 0, .7); }\n.fg-hud-meta { margin-top: .25cqw; font-size: .95cqw; letter-spacing: .14em; color: var(--ink-dim); text-shadow: 0 1px 4px rgba(0, 0, 0, .7); display: flex; gap: .8cqw; }\n.fg-topright { position: absolute; right: 2%; top: 3%; z-index: 22; display: flex; gap: .6cqw; align-items: center; }\n.fg-pill { display: inline-flex; align-items: center; gap: .5cqw; padding: .45cqw 1cqw; border-radius: 99px; background: var(--chip-bg); border: 1px solid var(--box-border); backdrop-filter: blur(10px); font-size: .95cqw; letter-spacing: .08em; color: var(--ink); }\n.fg-pill.is-busy::before { content: ""; width: .7cqw; height: .7cqw; border-radius: 50%; border: 2px solid var(--accent); border-right-color: transparent; animation: fg-spin .8s linear infinite; }\n.fg-iconbtn { width: 2.6cqw; height: 2.6cqw; border-radius: 50%; display: grid; place-items: center; background: var(--chip-bg); border: 1px solid var(--box-border); backdrop-filter: blur(10px); font-size: 1.2cqw; transition: transform .2s, background .2s; }\n.fg-iconbtn:hover { transform: rotate(90deg); background: rgba(255, 255, 255, .14); }\n\n/* ── 对话框 ── */\n.fg-dialog { position: absolute; left: 4%; right: 4%; bottom: 3.6%; height: 27%; z-index: 20; transition: opacity .3s, transform .3s; }\n.fg-ui-hidden .fg-dialog, .fg-ui-hidden .fg-hud, .fg-ui-hidden .fg-topright, .fg-ui-hidden .fg-quick { opacity: 0; pointer-events: none; }\n.fg-box { position: absolute; inset: 0; border-radius: var(--box-radius); background: var(--box-bg); border: 1px solid var(--box-border); backdrop-filter: var(--box-blur); -webkit-backdrop-filter: var(--box-blur); box-shadow: 0 1.4cqw 4cqw rgba(0, 0, 0, .45), inset 0 1px 0 rgba(255, 255, 255, .08); overflow: hidden; }\n.fg-box::before { content: ""; position: absolute; left: 0; right: 0; top: 0; height: 2px; background: linear-gradient(90deg, transparent, var(--accent), var(--accent2), var(--accent3), transparent); background-size: 200% 100%; animation: fg-shimmer 6s linear infinite; opacity: .9; }\n.fg-box::after { content: ""; position: absolute; right: -6cqw; bottom: -10cqw; width: 26cqw; height: 26cqw; border-radius: 50%; background: radial-gradient(circle, color-mix(in oklab, var(--speaker, var(--accent)) 28%, transparent), transparent 65%); pointer-events: none; transition: background .6s; }\n@keyframes fg-shimmer { from { background-position: 200% 0; } to { background-position: 0 0; } }\n.fg-name { position: absolute; left: 3.2%; top: -2.3cqw; z-index: 2; display: flex; align-items: flex-end; gap: .8cqw; animation: fg-name-in .35s cubic-bezier(.2, .8, .2, 1) both; }\n.fg-name-plate { position: relative; padding: .5cqw 2.4cqw .55cqw 1.6cqw; font-family: var(--font-display); font-weight: 700; font-size: 1.75cqw; letter-spacing: .2em; color: var(--name-ink);\n  background: linear-gradient(100deg, var(--speaker, var(--accent)), color-mix(in oklab, var(--speaker, var(--accent)) 55%, var(--accent2)));\n  clip-path: polygon(0 0, 100% 0, calc(100% - 1.2cqw) 100%, 0 100%); box-shadow: 0 .4cqw 1.6cqw rgba(0, 0, 0, .35); text-shadow: 0 1px 2px rgba(0, 0, 0, .35); }\n.fg-name-plate::after { content: ""; position: absolute; left: 1.6cqw; right: 2.4cqw; bottom: .3cqw; height: 1px; background: rgba(255, 255, 255, .55); }\n.fg-name-sub { font-family: var(--font-latin); font-size: 1cqw; letter-spacing: .32em; color: var(--ink-dim); padding-bottom: .4cqw; text-transform: uppercase; }\n@keyframes fg-name-in { from { opacity: 0; transform: translateX(-1.2cqw); } }\n.fg-text { position: absolute; left: 4.2%; right: 5%; top: 23%; bottom: 20%; font-size: 1.95cqw; line-height: 1.78; letter-spacing: .04em; text-shadow: 0 1px 2px rgba(0, 0, 0, .45); overflow: hidden; }\n.fg-text.is-narration { color: color-mix(in oklab, var(--ink) 92%, var(--accent3)); }\n.fg-text.is-thought { font-style: italic; color: color-mix(in oklab, var(--ink) 70%, var(--accent2)); }\n.fg-text.is-cardhint { color: var(--ink-dim); font-size: 1.3cqw; letter-spacing: .4em; text-align: center; }\n.fg-text.is-thought::before { content: "（"; } .fg-text.is-thought::after { content: "）"; }\n.fg-char { opacity: 0; animation: fg-char-in .22s ease forwards; animation-delay: var(--d); display: inline; }\n.fg-text.is-done .fg-char { animation: none; opacity: 1; }\n.fg-text.is-wait .fg-char { animation: none; }\n@keyframes fg-char-in { from { opacity: 0; filter: blur(3px); } to { opacity: 1; filter: none; } }\n.fg-wait { position: absolute; right: 2.6%; bottom: 20%; font-size: 1.2cqw; color: var(--accent); text-shadow: 0 0 .8cqw var(--accent); animation: fg-wait 1.1s ease-in-out infinite; }\n.fg-wait::before { content: var(--wait-glyph); }\n@keyframes fg-wait { 0%, 100% { transform: translateY(0) rotate(0); opacity: .9; } 50% { transform: translateY(-.35cqw) rotate(45deg); opacity: .5; } }\n.fg-quick { position: absolute; right: 2.4%; bottom: 7%; display: flex; gap: 1.5cqw; font-family: var(--font-latin); font-size: .98cqw; font-weight: 600; letter-spacing: .2em; z-index: 3; }\n.fg-quick button { color: var(--ink-dim); transition: color .2s, text-shadow .2s; position: relative; }\n.fg-quick button:hover, .fg-quick button.is-on { color: var(--ink); text-shadow: 0 0 .8cqw var(--accent); }\n.fg-quick button.is-on::after { content: ""; position: absolute; left: 0; right: .2em; bottom: -.3cqw; height: 1px; background: var(--accent); }\n.fg-progress { position: absolute; left: 4.2%; right: 30%; bottom: 8.6%; height: 2px; border-radius: 2px; background: rgba(255, 255, 255, .08); overflow: hidden; }\n.fg-progress i { position: absolute; left: 0; top: 0; bottom: 0; background: linear-gradient(90deg, var(--accent), var(--accent2)); box-shadow: 0 0 6px var(--accent); transition: width .4s ease; }\n.fg-status { position: absolute; left: 4.2%; bottom: 7%; font-size: .9cqw; letter-spacing: .1em; color: var(--ink-dim); display: flex; align-items: center; gap: .5cqw; }\n.fg-status::before { content: ""; width: .6cqw; height: .6cqw; border-radius: 50%; background: var(--accent3); box-shadow: 0 0 .6cqw var(--accent3); animation: fg-pulse 1.4s ease-in-out infinite; }\n\n/* ── 情境卡片（短信、信件……） ── */\n.fg-card { position: absolute; left: 50%; top: 42%; z-index: 21; width: 40cqw; transform: translate(-50%, -50%); animation: fg-card-in .7s cubic-bezier(.2, .8, .2, 1) both; font-size: 1.6cqw; line-height: 1.7; }\n@keyframes fg-card-in { from { opacity: 0; transform: translate(-50%, -42%) rotateX(35deg) scale(.9); } }\n.fg-card[data-card="sms"] { padding: 1.6cqw; border-radius: 2cqw; background: rgba(250, 250, 255, .94); color: #1b1d2a; box-shadow: 0 2cqw 5cqw rgba(0, 0, 0, .5); }\n.fg-card[data-card="sms"] .fg-card-head { font-size: 1cqw; color: #6b7280; text-align: center; margin-bottom: 1cqw; letter-spacing: .1em; }\n.fg-card[data-card="sms"] .fg-card-body { display: inline-block; max-width: 90%; padding: 1cqw 1.4cqw; border-radius: 1.6cqw 1.6cqw 1.6cqw .4cqw; background: #e8ebf4; }\n.fg-card[data-card="letter"], .fg-card[data-card="diary"] { padding: 3cqw 3.4cqw; background: repeating-linear-gradient(180deg, #fbf5e6 0 2.6cqw, #e9dcc0 2.6cqw calc(2.6cqw + 1px)), #fbf5e6; color: #4a3626; font-family: var(--font-display); box-shadow: 0 2cqw 5cqw rgba(0, 0, 0, .55); transform-origin: 50% 0; transform: translate(-50%, -50%) rotate(-1.2deg); }\n.fg-card[data-card="note"] { width: 28cqw; padding: 2.4cqw; background: #fff59d; color: #3b3200; font-family: var(--font-display); box-shadow: 0 1.4cqw 3cqw rgba(0, 0, 0, .45); transform: translate(-50%, -50%) rotate(2deg); }\n.fg-card[data-card="note"]::before { content: ""; position: absolute; left: 38%; top: -1cqw; width: 8cqw; height: 2cqw; background: rgba(255, 255, 255, .55); transform: rotate(-3deg); }\n.fg-card[data-card="news"] { padding: 2.4cqw; background: #f3f0e8; color: #111; font-family: var(--font-display); border-top: .6cqw double #111; box-shadow: 0 2cqw 5cqw rgba(0, 0, 0, .55); }\n.fg-card[data-card="news"] .fg-card-head { font-size: 2.6cqw; font-weight: 900; letter-spacing: .3em; border-bottom: 1px solid #111; margin-bottom: 1cqw; }\n.fg-card[data-card="terminal"] { padding: 2cqw; border-radius: .8cqw; background: rgba(4, 16, 8, .92); color: #67ff9a; font-family: "JetBrains Mono", "Cascadia Code", monospace; box-shadow: 0 0 3cqw rgba(60, 255, 140, .25), inset 0 0 2cqw rgba(60, 255, 140, .08); text-shadow: 0 0 .6cqw rgba(60, 255, 140, .7); }\n.fg-card[data-card="terminal"] .fg-card-body::after { content: "▌"; animation: fg-pulse 1s steps(2) infinite; }\n.fg-card[data-card="notice"], .fg-card[data-card="scroll"] { padding: 3cqw; background: linear-gradient(90deg, #c9a46a, #f1dcae 8%, #f6e7c4 50%, #f1dcae 92%, #c9a46a); color: #3a2410; font-family: var(--font-display); text-align: center; box-shadow: 0 2cqw 5cqw rgba(0, 0, 0, .55); }\n.fg-card[data-card="notice"]::after { content: "印"; position: absolute; right: 2cqw; bottom: 1.4cqw; width: 4cqw; height: 4cqw; border: .25cqw solid #b3261e; color: #b3261e; display: grid; place-items: center; font-size: 2cqw; transform: rotate(-12deg); animation: fg-stamp .4s .5s cubic-bezier(.3, 1.6, .5, 1) both; }\n@keyframes fg-stamp { from { opacity: 0; transform: scale(2.2) rotate(-12deg); } }\n\n/* ── 选项 ── */\n.fg-choices { position: absolute; inset: 0; z-index: 26; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1.3cqw; background: radial-gradient(70% 60% at 50% 45%, rgba(0, 0, 0, .25), rgba(0, 0, 0, .6)); animation: fg-fade-in .4s ease both; }\n.fg-choices-title { font-family: var(--font-latin); letter-spacing: .6em; font-size: 1.05cqw; color: var(--ink-dim); margin-bottom: .6cqw; }\n.fg-choice { position: relative; width: 46cqw; padding: 1.25cqw 2.4cqw 1.25cqw 6cqw; text-align: left; font-size: 1.7cqw; letter-spacing: .08em; border-radius: 99px; background: var(--box-bg); border: 1px solid var(--box-border); backdrop-filter: var(--box-blur); box-shadow: 0 .8cqw 2.4cqw rgba(0, 0, 0, .35); transition: transform .25s cubic-bezier(.2, .8, .2, 1), border-color .25s, box-shadow .25s; animation: fg-choice-in .55s cubic-bezier(.2, .8, .2, 1) both; animation-delay: calc(var(--i) * 90ms + 150ms); overflow: hidden; }\n.fg-choice::before { content: attr(data-n); position: absolute; left: 2.2cqw; top: 50%; transform: translateY(-50%); font-family: var(--font-latin); font-size: 1.5cqw; font-weight: 700; color: var(--accent); letter-spacing: .1em; }\n.fg-choice::after { content: ""; position: absolute; inset: 0; background: linear-gradient(100deg, transparent 30%, rgba(255, 255, 255, .16) 50%, transparent 70%); transform: translateX(-100%); transition: transform .6s ease; }\n.fg-choice:hover { transform: translateX(1.2cqw) scale(1.02); border-color: var(--accent); box-shadow: 0 0 2.4cqw color-mix(in oklab, var(--accent) 45%, transparent); }\n.fg-choice:hover::after { transform: translateX(100%); }\n@keyframes fg-choice-in { from { opacity: 0; transform: translateY(1.4cqw); } }\n.fg-free { display: flex; gap: .8cqw; width: 46cqw; animation: fg-choice-in .55s cubic-bezier(.2, .8, .2, 1) both; animation-delay: calc(var(--i) * 90ms + 150ms); }\n.fg-free input { flex: 1; min-width: 0; padding: 1cqw 1.8cqw; font: inherit; font-size: 1.45cqw; color: var(--ink); border-radius: 99px; border: 1px dashed var(--box-border); background: rgba(0, 0, 0, .35); outline: none; user-select: text; }\n.fg-free input:focus { border-color: var(--accent); border-style: solid; }\n.fg-free button { padding: 0 2cqw; border-radius: 99px; background: linear-gradient(100deg, var(--accent), var(--accent2)); font-size: 1.4cqw; font-weight: 700; letter-spacing: .2em; color: #fff; }\n\n/* ── 标题画面 ── */\n.fg-title { position: absolute; inset: 0; z-index: 50; display: flex; flex-direction: column; justify-content: center; padding-left: 8%; background: linear-gradient(90deg, rgba(4, 4, 14, .86) 0%, rgba(4, 4, 14, .55) 42%, transparent 75%); animation: fg-fade-in 1s ease both; }\n.fg-title-kicker { font-family: var(--font-latin); font-size: 1.1cqw; letter-spacing: .7em; color: var(--accent3); text-transform: uppercase; animation: fg-slide-in 1s .2s ease both; }\n.fg-title-logo { font-family: var(--font-display); font-weight: 900; font-size: 6cqw; line-height: 1.15; letter-spacing: .12em; margin: 1cqw 0 .6cqw; background: linear-gradient(100deg, #fff 10%, var(--accent) 45%, var(--accent2) 70%, var(--accent3)); -webkit-background-clip: text; background-clip: text; color: transparent; filter: drop-shadow(0 0 2.4cqw color-mix(in oklab, var(--accent2) 60%, transparent)); animation: fg-logo-in 1.4s .3s cubic-bezier(.2, .8, .2, 1) both; max-width: 60cqw; }\n.fg-title-sub { font-size: 1.2cqw; letter-spacing: .3em; color: var(--ink-dim); margin-bottom: 3.4cqw; animation: fg-slide-in 1s .6s ease both; }\n.fg-title-menu { display: flex; flex-direction: column; gap: .4cqw; align-items: flex-start; }\n.fg-title-menu button { font-family: var(--font-display); font-size: 1.75cqw; letter-spacing: .3em; padding: .45cqw 0; color: var(--ink-dim); position: relative; transition: color .2s, letter-spacing .3s, padding .3s; animation: fg-slide-in .8s ease both; animation-delay: calc(var(--i) * 80ms + 800ms); }\n.fg-title-menu button span { font-family: var(--font-latin); font-size: .9cqw; letter-spacing: .4em; margin-left: 1.2cqw; opacity: .55; }\n.fg-title-menu button.is-new { color: var(--ink); }\n.fg-title-menu button.is-new::after { content: "NEW"; position: absolute; top: .2cqw; right: -3.4cqw; padding: .1cqw .5cqw; border-radius: 99px; font-family: var(--font-latin); font-size: .7cqw; letter-spacing: .12em; color: #fff; background: linear-gradient(100deg, var(--accent), var(--accent2)); animation: fg-pulse 1.6s ease-in-out infinite; }\n.fg-title-menu button:hover { color: #fff; letter-spacing: .42em; padding-left: 1.6cqw; }\n.fg-title-menu button:hover::before { content: ""; position: absolute; left: 0; top: 50%; width: .9cqw; height: .9cqw; transform: translateY(-50%) rotate(45deg); background: var(--accent); box-shadow: 0 0 1cqw var(--accent); }\n.fg-title-foot { position: absolute; left: 8%; bottom: 5%; font-size: .85cqw; letter-spacing: .2em; color: rgba(255, 255, 255, .35); }\n@keyframes fg-logo-in { from { opacity: 0; letter-spacing: .5em; filter: blur(10px); } }\n@keyframes fg-slide-in { from { opacity: 0; transform: translateX(-1.6cqw); } }\n\n/* ── 面板（回想 / 鉴赏 / 人物志 / 设置） ── */\n.fg-panel { position: absolute; inset: 0; z-index: 60; display: flex; flex-direction: column; background: linear-gradient(135deg, rgba(8, 6, 22, .94), rgba(16, 10, 34, .92)); backdrop-filter: blur(16px); animation: fg-panel-in .35s cubic-bezier(.2, .8, .2, 1) both; user-select: text; }\n@keyframes fg-panel-in { from { opacity: 0; transform: scale(1.02); } }\n.fg-panel-head { display: flex; align-items: center; gap: 1.4cqw; padding: 2.2cqw 3cqw 1.2cqw; }\n.fg-panel-title { font-family: var(--font-display); font-size: 2.4cqw; font-weight: 700; letter-spacing: .24em; }\n.fg-panel-en { font-family: var(--font-latin); font-size: 1cqw; letter-spacing: .5em; color: var(--accent); text-transform: uppercase; }\n.fg-panel-head .fg-spacer { flex: 1; }\n.fg-panel-body { position: relative; flex: 1; overflow: auto; padding: 0 3cqw 2.4cqw; scrollbar-width: thin; scrollbar-color: var(--accent2) transparent; }\n.fg-tabs { display: flex; gap: .4cqw; padding: 0 3cqw 1cqw; flex-wrap: wrap; }\n.fg-tab { padding: .55cqw 1.4cqw; border-radius: 99px; font-size: 1.05cqw; letter-spacing: .12em; color: var(--ink-dim); border: 1px solid transparent; }\n.fg-tab.is-on { color: #fff; border-color: var(--box-border); background: linear-gradient(100deg, color-mix(in oklab, var(--accent) 35%, transparent), color-mix(in oklab, var(--accent2) 35%, transparent)); }\n\n.fg-log-item { display: grid; grid-template-columns: 9cqw 1fr; gap: 1.4cqw; padding: 1cqw 0; border-bottom: 1px solid rgba(255, 255, 255, .06); cursor: pointer; font-size: 1.35cqw; line-height: 1.7; }\n.fg-log-item:hover { background: linear-gradient(90deg, rgba(255, 255, 255, .04), transparent); }\n.fg-log-name { font-family: var(--font-display); font-weight: 700; text-align: right; letter-spacing: .1em; }\n.fg-log-turn { grid-column: 1 / -1; font-family: var(--font-latin); font-size: .95cqw; letter-spacing: .5em; color: var(--accent); padding-top: 1.4cqw; }\n\n/* 导演日志：左边历次记录，右边详情（实时输出 / 整理结果 / 原始输出 / 提示词）。两栏各自滚动。 */\n.fg-dlog { display: grid; grid-template-columns: 22cqw minmax(0, 1fr); gap: 2cqw; height: 100%; }\n.fg-dlog-side, .fg-dlog-detail { min-height: 0; overflow: auto; scrollbar-width: thin; scrollbar-color: var(--accent2) transparent; }\n.fg-dlog-side { display: flex; flex-direction: column; gap: .6cqw; padding-right: .4cqw; }\n.fg-dlog-detail { padding-right: .6cqw; }\n.fg-dlog-row { display: block; width: 100%; flex: none; text-align: left; padding: 1cqw 1.2cqw; border-radius: .8cqw; border: 1px solid var(--box-border); background: rgba(255, 255, 255, .03); transition: background .2s, border-color .2s; }\n.fg-dlog-row:hover { background: rgba(255, 255, 255, .07); }\n.fg-dlog-row.is-on { border-color: var(--accent); background: linear-gradient(100deg, color-mix(in oklab, var(--accent) 18%, transparent), color-mix(in oklab, var(--accent2) 8%, transparent)); }\n.fg-dlog-row-head { display: flex; align-items: center; justify-content: space-between; gap: .6cqw; font-size: 1.15cqw; letter-spacing: .08em; }\n.fg-dlog-row-meta { margin-top: .3cqw; font-size: .85cqw; color: var(--ink-dim); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }\n.fg-dlog-row-sum { margin-top: .4cqw; font-size: .95cqw; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }\n.fg-dlog-status { padding: .1cqw .7cqw; border-radius: 99px; border: 1px solid currentColor; font-size: .8cqw; letter-spacing: .1em; white-space: nowrap; }\n.fg-dlog-status.is-running { color: var(--accent); animation: fg-pulse 1.4s ease-in-out infinite; }\n.fg-dlog-status.is-ok { color: #6ef0a8; }\n.fg-dlog-status.is-failed { color: #ff8a8a; }\n.fg-dlog-status.is-cancelled { color: var(--ink-dim); }\n.fg-dlog-head { padding: 1.2cqw 1.4cqw; border-radius: 1cqw; background: rgba(255, 255, 255, .035); border: 1px solid var(--box-border); }\n.fg-dlog-title { display: flex; align-items: center; gap: 1cqw; margin-bottom: .8cqw; font-family: var(--font-display); font-size: 1.7cqw; letter-spacing: .16em; }\n.fg-dlog-title .fg-spacer, .fg-dlog-label .fg-spacer { flex: 1; }\n.fg-dlog-facts { display: grid; grid-template-columns: repeat(auto-fill, minmax(30cqw, 1fr)); gap: .3cqw 2cqw; font-size: 1cqw; line-height: 1.6; }\n.fg-dlog-facts i { margin-right: .8cqw; font-style: normal; color: var(--ink-dim); letter-spacing: .08em; }\n.fg-dlog-notice { margin-top: .6cqw; font-size: .95cqw; color: #ffd27a; }\n.fg-dlog-error { margin: .6cqw 0; font-size: 1cqw; white-space: pre-wrap; word-break: break-word; }\n.fg-dlog-tabs { padding: 1.2cqw 0 .4cqw; }\n.fg-dlog-block { margin: 1cqw 0; }\n.fg-dlog-label { display: flex; align-items: center; gap: .8cqw; margin-bottom: .5cqw; font-size: .95cqw; letter-spacing: .12em; color: var(--accent); }\n.fg-btn.is-mini { padding: .2cqw .9cqw; font-size: .85cqw; white-space: nowrap; }\n.fg-dlog-pre { margin: 0; max-height: 34cqw; overflow: auto; padding: 1cqw 1.2cqw; border-radius: .8cqw; background: rgba(0, 0, 0, .42); border: 1px solid var(--box-border); font-family: "JetBrains Mono", Consolas, monospace; font-size: .95cqw; line-height: 1.6; white-space: pre-wrap; word-break: break-word; color: var(--ink); scrollbar-width: thin; }\n.fg-dlog-pre.has-cursor::after { content: "▍"; color: var(--accent); animation: fg-pulse 1s steps(2) infinite; }\n.fg-dlog-meter { display: flex; align-items: center; gap: .8cqw; margin: .4cqw 0; font-size: 1cqw; color: var(--ink-dim); }\n.fg-dlog-dot { width: .8cqw; height: .8cqw; border-radius: 50%; background: var(--accent); box-shadow: 0 0 1cqw var(--accent); animation: fg-pulse 1s ease-in-out infinite; }\n.fg-dlog-think summary { margin: .4cqw 0; cursor: pointer; font-size: .95cqw; color: var(--ink-dim); }\n.fg-dlog-chips { display: flex; flex-wrap: wrap; gap: .5cqw; }\n.fg-dlog-chip { display: inline-flex; align-items: center; gap: .5cqw; padding: .2cqw .8cqw; border-radius: 99px; font-size: .9cqw; background: rgba(255, 255, 255, .06); border: 1px solid var(--box-border); }\n.fg-dlog-chip i { font-style: normal; font-size: .8cqw; color: var(--ink-dim); }\n.fg-dlog-lines { border-radius: .8cqw; border: 1px solid var(--box-border); overflow: hidden; }\n.fg-dlog-line { display: grid; grid-template-columns: 4cqw minmax(0, 1fr) minmax(0, 24cqw); gap: 1.2cqw; align-items: start; padding: .7cqw 1cqw; border-bottom: 1px solid rgba(255, 255, 255, .06); font-size: 1cqw; line-height: 1.6; }\n.fg-dlog-line:last-child { border-bottom: 0; }\n.fg-dlog-line.is-plain { opacity: .6; }\n.fg-dlog-uid { padding-top: .15cqw; font-family: var(--font-latin); font-size: .85cqw; letter-spacing: .1em; color: var(--accent); }\n.fg-dlog-card { margin-bottom: .6cqw; padding: .8cqw 1cqw; border-radius: .8cqw; background: rgba(255, 255, 255, .035); border: 1px solid var(--box-border); font-size: 1cqw; line-height: 1.6; }\n.fg-dlog-mono { margin-top: .4cqw; font-family: "JetBrains Mono", Consolas, monospace; font-size: .9cqw; word-break: break-word; }\n.fg-dlog-list-plain { margin: 0; padding-left: 2cqw; font-size: 1.05cqw; line-height: 1.8; }\n.fg-pill.is-link { cursor: pointer; transition: border-color .2s; }\n.fg-pill.is-link:hover { border-color: var(--accent); }\n\n.fg-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(20cqw, 1fr)); gap: 1.4cqw; }\n.fg-thumb { position: relative; aspect-ratio: 16 / 10; border-radius: 1cqw; overflow: hidden; background: rgba(255, 255, 255, .04); border: 1px solid var(--box-border); cursor: zoom-in; transition: transform .25s, box-shadow .25s; }\n.fg-thumb:hover { transform: translateY(-.4cqw); box-shadow: 0 1cqw 3cqw rgba(0, 0, 0, .5), 0 0 0 1px var(--accent); }\n.fg-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }\n.fg-thumb-cap { position: absolute; left: 0; right: 0; bottom: 0; padding: 2cqw 1cqw .7cqw; font-size: 1cqw; letter-spacing: .1em; background: linear-gradient(transparent, rgba(0, 0, 0, .75)); }\n.fg-thumb.is-locked { cursor: default; display: grid; place-items: center; color: var(--ink-dim); font-size: 1cqw; background: repeating-linear-gradient(45deg, rgba(255, 255, 255, .03) 0 1cqw, transparent 1cqw 2cqw); }\n\n.fg-person { display: grid; grid-template-columns: 13cqw 1fr; gap: 2cqw; padding: 1.6cqw; margin-bottom: 1.4cqw; border-radius: 1.2cqw; background: rgba(255, 255, 255, .035); border: 1px solid var(--box-border); }\n.fg-track { display: grid; grid-template-columns: 4.2cqw 1fr; gap: 1.4cqw; padding: 1.2cqw 1.4cqw; margin-bottom: 1cqw; border-radius: 1cqw; background: rgba(255, 255, 255, .035); border: 1px solid var(--box-border); }\n.fg-track-body { display: grid; gap: .6cqw; min-width: 0; }\n.fg-track-play { width: 4.2cqw; height: 4.2cqw; border-radius: 50%; border: 1px solid var(--box-border); background: rgba(0, 0, 0, .3); color: var(--ink); font-size: 1.3cqw; cursor: pointer; transition: background .2s, border-color .2s, box-shadow .2s; }\n.fg-track-play:hover { border-color: var(--accent); }\n.fg-track-play.is-on { background: var(--accent); border-color: var(--accent); color: #111; box-shadow: 0 0 1.4cqw color-mix(in oklab, var(--accent) 55%, transparent); }\n.fg-track-desc { min-height: 4.6cqw; font-family: var(--font-body); font-size: 1.05cqw; }\n.fg-person-art { position: relative; height: 19cqw; border-radius: .8cqw; overflow: hidden; background: radial-gradient(circle at 50% 30%, color-mix(in oklab, var(--c) 40%, transparent), rgba(0, 0, 0, .3)); }\n.fg-person-art img { width: 100%; height: 100%; object-fit: cover; object-position: top; }\n.fg-person-art .fg-silhouette { height: 100%; }\n.fg-person h3 { margin: 0 0 .6cqw; font-family: var(--font-display); font-size: 2cqw; letter-spacing: .2em; display: flex; align-items: center; gap: 1cqw; }\n.fg-person h3 small { font-family: var(--font-body); font-size: .9cqw; letter-spacing: .1em; padding: .2cqw .7cqw; border-radius: 99px; border: 1px solid var(--box-border); color: var(--ink-dim); }\n.fg-emos { display: flex; flex-wrap: wrap; gap: .5cqw; margin: .8cqw 0; }\n.fg-emo { position: relative; width: 4.6cqw; height: 4.6cqw; border-radius: .6cqw; overflow: hidden; border: 1px solid var(--box-border); background: rgba(0, 0, 0, .3); font-size: .78cqw; display: grid; place-items: end center; padding-bottom: .2cqw; color: var(--ink-dim); }\n.fg-emo img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: top; }\n.fg-emo span { position: relative; text-shadow: 0 1px 3px #000; }\n.fg-emo.is-busy::after { content: ""; position: absolute; inset: 0; background: linear-gradient(100deg, transparent 20%, rgba(255, 255, 255, .25), transparent 80%); background-size: 200% 100%; animation: fg-skeleton 1.2s linear infinite; }\n\n/* 表单 */\n.fg-field { display: grid; grid-template-columns: 14cqw 1fr; gap: 1.2cqw; align-items: center; margin: .9cqw 0; font-size: 1.1cqw; }\n.fg-field > label { color: var(--ink-dim); letter-spacing: .08em; }\n.fg-field small { grid-column: 2; color: var(--ink-dim); font-size: .9cqw; margin-top: -.6cqw; }\n.fg-input, .fg-select, .fg-textarea { width: 100%; padding: .7cqw 1cqw; font: inherit; font-size: 1.1cqw; color: var(--ink); background: rgba(0, 0, 0, .35); border: 1px solid var(--box-border); border-radius: .6cqw; outline: none; }\n.fg-select option { background: #14122a; }\n.fg-textarea { min-height: 7cqw; resize: vertical; line-height: 1.5; font-family: "JetBrains Mono", Consolas, monospace; font-size: 1cqw; }\n.fg-input:focus, .fg-select:focus, .fg-textarea:focus { border-color: var(--accent); }\n.fg-btn { display: inline-flex; align-items: center; gap: .5cqw; padding: .6cqw 1.4cqw; border-radius: 99px; font-size: 1.05cqw; letter-spacing: .1em; border: 1px solid var(--box-border); background: rgba(255, 255, 255, .05); transition: background .2s, border-color .2s; }\n.fg-btn:hover { background: rgba(255, 255, 255, .12); border-color: var(--accent); }\n.fg-btn.is-primary { background: linear-gradient(100deg, var(--accent), var(--accent2)); border-color: transparent; color: #fff; font-weight: 700; }\n.fg-btn[disabled] { opacity: .45; pointer-events: none; }\n.fg-row { display: flex; gap: .8cqw; flex-wrap: wrap; align-items: center; }\n.fg-switch { position: relative; width: 3.4cqw; height: 1.9cqw; border-radius: 99px; background: rgba(255, 255, 255, .14); transition: background .2s; }\n.fg-switch::after { content: ""; position: absolute; left: .25cqw; top: .25cqw; width: 1.4cqw; height: 1.4cqw; border-radius: 50%; background: #fff; transition: transform .25s cubic-bezier(.3, 1.4, .5, 1); }\n.fg-switch.is-on { background: linear-gradient(100deg, var(--accent), var(--accent2)); }\n.fg-switch.is-on::after { transform: translateX(1.5cqw); }\n.fg-note { font-size: .95cqw; color: var(--ink-dim); line-height: 1.6; }\n.fg-ok { color: #6ef0a8; } .fg-err { color: #ff8a8a; }\n.fg-section { margin: 1.6cqw 0 .6cqw; font-family: var(--font-display); font-size: 1.4cqw; letter-spacing: .2em; display: flex; align-items: center; gap: .8cqw; }\n.fg-section::after { content: ""; flex: 1; height: 1px; background: linear-gradient(90deg, var(--box-border), transparent); }\n.fg-skins { display: grid; grid-template-columns: repeat(auto-fill, minmax(15cqw, 1fr)); gap: 1cqw; }\n.fg-skin { padding: 1cqw; border-radius: 1cqw; border: 1px solid var(--box-border); text-align: left; transition: transform .2s; }\n.fg-skin:hover { transform: translateY(-.3cqw); }\n.fg-skin.is-on { box-shadow: 0 0 0 2px var(--accent); }\n.fg-skin-swatch { height: 4cqw; border-radius: .6cqw; margin-bottom: .6cqw; }\n.fg-skin b { display: block; font-size: 1.1cqw; letter-spacing: .1em; } .fg-skin span { font-size: .85cqw; color: var(--ink-dim); }\n\n.fg-update-done { margin: .8cqw 0; padding: .9cqw 1.2cqw; border-radius: .8cqw; font-size: 1.05cqw; line-height: 1.6; color: #6ef0a8; background: rgba(110, 240, 168, .08); border: 1px solid rgba(110, 240, 168, .3); }\n.fg-changes { margin: .4cqw 0 0 15.2cqw; border-radius: .8cqw; border: 1px solid var(--box-border); overflow: hidden; }\n.fg-changes > div { display: grid; grid-template-columns: 6cqw 1fr auto; gap: 1cqw; padding: .6cqw 1cqw; font-size: 1cqw; line-height: 1.5; border-bottom: 1px solid rgba(255, 255, 255, .06); }\n.fg-changes > div:last-child { border-bottom: 0; }\n.fg-changes code, .fg-note code { font-family: "JetBrains Mono", Consolas, monospace; color: var(--accent); }\n.fg-changes small { color: var(--ink-dim); white-space: nowrap; }\n\n.fg-lightbox { position: fixed; inset: 0; z-index: 80; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1.2cqw; background: rgba(0, 0, 0, .9); animation: fg-fade-in .25s ease both; cursor: zoom-out; }\n.fg-lightbox img { max-width: 92%; max-height: 82%; object-fit: contain; box-shadow: 0 0 6cqw rgba(0, 0, 0, .8); cursor: default; }\n.fg-lightbox .fg-row { cursor: default; }\n\n@keyframes fg-fade-in { from { opacity: 0; } }\n@keyframes fg-fade-out { to { opacity: 0; } }\n@keyframes fg-spin { to { transform: rotate(360deg); } }\n@keyframes fg-pulse { 0%, 100% { opacity: 1; } 50% { opacity: .3; } }\n@keyframes fg-skeleton { from { background-position: 200% 0; } to { background-position: -200% 0; } }\n\n@media (prefers-reduced-motion: reduce) {\n  .fg-bg, .fg-cg-img, .fg-actor-body, .fg-box::before, .fg-sky::after, .fg-symbol-art, .fg-symbol-art svg { animation: none !important; }\n}\n@container stage (max-aspect-ratio: 4/5) {\n  .fg-actor { width: 60%; height: 60%; bottom: 23%; }\n  .fg-dialog { left: 3%; right: 3%; height: 22%; }\n  .fg-text { font-size: 4.6cqw; top: 18%; bottom: 26%; }\n  .fg-progress { bottom: 12%; right: 4.2%; }\n  .fg-quick { bottom: 5%; left: 4.2%; justify-content: space-between; font-size: 2.4cqw; gap: 3cqw; }\n  .fg-wait { bottom: 28%; }\n  .fg-status { display: none; }\n  .fg-name-plate { font-size: 4cqw; } .fg-name { top: -5cqw; }\n  .fg-iconbtn { width: 9cqw; height: 9cqw; font-size: 4cqw; }\n  .fg-hud-place { font-size: 4cqw; } .fg-hud-meta { font-size: 2.6cqw; }\n  .fg-choice, .fg-free { width: 88cqw; font-size: 4cqw; }\n  .fg-title-logo { font-size: 11cqw; max-width: 90cqw; } .fg-title-menu button { font-size: 4.4cqw; }\n  .fg-dlog { grid-template-columns: 1fr; grid-template-rows: auto minmax(0, 1fr); }\n  .fg-dlog-side { flex-direction: row; overflow-x: auto; padding: 0 0 1cqw; }\n  .fg-dlog-row { width: 46cqw; }\n  .fg-dlog-row-head, .fg-dlog-title { font-size: 3.6cqw; }\n  .fg-dlog-row-meta, .fg-dlog-row-sum, .fg-dlog-status, .fg-dlog-label, .fg-dlog-meter, .fg-dlog-think summary, .fg-dlog-chip, .fg-dlog-chip i, .fg-btn.is-mini { font-size: 2.8cqw; }\n  .fg-dlog-facts, .fg-dlog-notice, .fg-dlog-error, .fg-dlog-pre, .fg-dlog-line, .fg-dlog-card, .fg-dlog-mono, .fg-dlog-list-plain { font-size: 3cqw; }\n  .fg-dlog-facts { grid-template-columns: 1fr; }\n  .fg-dlog-pre { max-height: 90cqw; }\n  .fg-dlog-line { grid-template-columns: 9cqw minmax(0, 1fr); }\n  .fg-dlog-line > .fg-dlog-chips { grid-column: 2; }\n  .fg-dlog .fg-note, .fg-dlog-uid { font-size: 2.6cqw; }\n  .fg-dlog-list-plain { padding-left: 6cqw; }\n  .fg-panel-title { font-size: 6cqw; } .fg-panel-en { font-size: 2.2cqw; }\n  .fg-tab { padding: 1.2cqw 3cqw; font-size: 3.2cqw; }\n  .fg-pill { padding: .8cqw 2.2cqw; font-size: 2.6cqw; }\n  .fg-track { grid-template-columns: 9cqw 1fr; gap: 2cqw; padding: 2cqw; }\n  .fg-track-play { width: 9cqw; height: 9cqw; font-size: 3cqw; }\n  .fg-track-desc { min-height: 12cqw; font-size: 3cqw; }\n}\n';

// src/client/styles/skins.css
var skins_default = `/* ───────────── 皮肤 ───────────── */
.fg-theater, .fg-chat {
  --font-latin: "Cormorant Garamond", Georgia, serif;
}

/* 星穹（默认）：深空玻璃 + 粉紫青霓虹。 */
.fg-theater[data-skin="stellar"] {
  --font-body: "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif;
  --font-display: "Noto Serif SC", "Songti SC", "SimSun", serif;
}

/* 樱色：浅色毛玻璃、圆角、文楷。 */
.fg-theater[data-skin="sakura"] {
  --accent: #ff6fa5; --accent2: #b28dff; --accent3: #7fd8ff;
  --ink: #4a2b3d; --ink-dim: rgba(90, 50, 75, .62);
  --box-bg: linear-gradient(180deg, rgba(255, 250, 253, .82), rgba(255, 238, 246, .9));
  --box-border: rgba(255, 160, 200, .55);
  --box-radius: 2.4cqw;
  --name-ink: #fff;
  --chip-bg: rgba(255, 245, 250, .72);
  --font-body: "LXGW WenKai", "PingFang SC", "Microsoft YaHei", sans-serif;
  --font-display: "LXGW WenKai", "Songti SC", serif;
  --wait-glyph: "❀";
}
.fg-theater[data-skin="sakura"] .fg-text { text-shadow: none; }
.fg-theater[data-skin="sakura"] .fg-name-plate { border-radius: 99px; clip-path: none; padding: .5cqw 2cqw; }
.fg-theater[data-skin="sakura"] .fg-name-plate::after { display: none; }
.fg-theater[data-skin="sakura"] .fg-box::before { height: .5cqw; background: repeating-linear-gradient(90deg, #ffc2da 0 1.2cqw, #fff 1.2cqw 2.4cqw); opacity: .8; animation: none; }
.fg-theater[data-skin="sakura"] .fg-hud-place, .fg-theater[data-skin="sakura"] .fg-hud-meta { color: #fff; }
.fg-theater[data-skin="sakura"] .fg-panel { background: linear-gradient(135deg, rgba(255, 246, 250, .96), rgba(245, 236, 255, .95)); color: var(--ink); }
.fg-theater[data-skin="sakura"] .fg-input, .fg-theater[data-skin="sakura"] .fg-select, .fg-theater[data-skin="sakura"] .fg-textarea { background: rgba(255, 255, 255, .7); }
.fg-theater[data-skin="sakura"] .fg-choice { color: var(--ink); }
.fg-theater[data-skin="sakura"] .fg-free input { background: rgba(255, 255, 255, .7); color: var(--ink); }
.fg-theater[data-skin="sakura"] .fg-title { background: linear-gradient(90deg, rgba(255, 240, 248, .9), rgba(255, 240, 248, .55) 42%, transparent 75%); color: var(--ink); }
.fg-theater[data-skin="sakura"] .fg-title-menu button:hover { color: var(--accent); }
.fg-theater[data-skin="sakura"] .fg-title-logo { background: linear-gradient(100deg, #ff4f93, #b28dff 60%, #6fc7ff); -webkit-background-clip: text; background-clip: text; filter: drop-shadow(0 .3cqw 1cqw rgba(255, 120, 170, .35)); }

/* 水墨：宣纸对话框、毛笔名牌、朱印。 */
.fg-theater[data-skin="ink"] {
  --accent: #b3261e; --accent2: #3a3530; --accent3: #8a7a5c;
  --ink: #2b2620; --ink-dim: rgba(60, 50, 40, .62);
  --box-bg: linear-gradient(180deg, rgba(246, 239, 222, .95), rgba(236, 226, 202, .96));
  --box-border: rgba(80, 60, 40, .35);
  --box-radius: .2cqw;
  --box-blur: none;
  --chip-bg: rgba(246, 239, 222, .85);
  --font-body: "LXGW WenKai", "Songti SC", serif;
  --font-display: "Ma Shan Zheng", "LXGW WenKai", "KaiTi", serif;
  --wait-glyph: "❖";
}
.fg-theater[data-skin="ink"] .fg-box { background-image: radial-gradient(120% 140% at 0% 100%, rgba(120, 90, 50, .14), transparent 55%), var(--box-bg); box-shadow: 0 1cqw 3cqw rgba(0, 0, 0, .45); }
.fg-theater[data-skin="ink"] .fg-box::before { height: .25cqw; background: linear-gradient(90deg, transparent, #3a3530 20%, #3a3530 80%, transparent); animation: none; }
.fg-theater[data-skin="ink"] .fg-box::after { display: none; }
.fg-theater[data-skin="ink"] .fg-text { text-shadow: none; }
.fg-theater[data-skin="ink"] .fg-name-plate { background: #2b2620; clip-path: polygon(2% 10%, 100% 0, 96% 90%, 0 100%); color: #f6efde; letter-spacing: .3em; }
.fg-theater[data-skin="ink"] .fg-name-plate::after { background: #b3261e; height: .2cqw; }
.fg-theater[data-skin="ink"] .fg-hud-place, .fg-theater[data-skin="ink"] .fg-hud-meta { color: #f6efde; }
.fg-theater[data-skin="ink"] .fg-hud-bar { background: #b3261e; box-shadow: none; }
.fg-theater[data-skin="ink"] .fg-panel { background: linear-gradient(135deg, rgba(242, 234, 214, .97), rgba(232, 220, 196, .97)); color: var(--ink); }
.fg-theater[data-skin="ink"] .fg-input, .fg-theater[data-skin="ink"] .fg-select, .fg-theater[data-skin="ink"] .fg-textarea { background: rgba(255, 252, 244, .7); }
.fg-theater[data-skin="ink"] .fg-choice { border-radius: .2cqw; color: var(--ink); }
.fg-theater[data-skin="ink"] .fg-free input { border-radius: .2cqw; background: rgba(255, 252, 244, .7); color: var(--ink); }
.fg-theater[data-skin="ink"] .fg-title { background: linear-gradient(90deg, rgba(240, 232, 212, .92), rgba(240, 232, 212, .6) 42%, transparent 78%); color: var(--ink); }
.fg-theater[data-skin="ink"] .fg-title-logo { background: none; color: #1e1a16; -webkit-text-fill-color: #1e1a16; filter: none; text-shadow: .2cqw .2cqw 0 rgba(179, 38, 30, .25); }
.fg-theater[data-skin="ink"] .fg-title-menu button:hover { color: #b3261e; }
.fg-theater[data-skin="ink"] .fg-titlecard-name { writing-mode: vertical-rl; font-size: 5cqw; text-shadow: 0 0 2cqw rgba(0, 0, 0, .7); }
.fg-theater[data-skin="ink"] .fg-grade { filter: sepia(.2); }

/* 夜金：黑底金字、电影字幕式对话框。 */
.fg-theater[data-skin="noir"] {
  --accent: #d8b26a; --accent2: #8c6a2f; --accent3: #f3e2b8;
  --ink: #f3ead6; --ink-dim: rgba(243, 234, 214, .55);
  --box-bg: linear-gradient(180deg, rgba(0, 0, 0, 0), rgba(0, 0, 0, .82) 40%, rgba(0, 0, 0, .92));
  --box-border: transparent;
  --box-radius: 0;
  --box-blur: none;
  --font-body: "Noto Serif SC", "Songti SC", "SimSun", serif;
  --font-display: "Noto Serif SC", "Songti SC", "SimSun", serif;
  --wait-glyph: "▼";
}
.fg-theater[data-skin="noir"] .fg-dialog { left: 0; right: 0; bottom: 0; height: 31%; }
.fg-theater[data-skin="noir"] .fg-box { box-shadow: none; }
.fg-theater[data-skin="noir"] .fg-box::before { top: 26%; left: 20%; right: 20%; height: 1px; background: linear-gradient(90deg, transparent, var(--accent), transparent); animation: none; }
.fg-theater[data-skin="noir"] .fg-box::after { display: none; }
.fg-theater[data-skin="noir"] .fg-name { left: 0; right: 0; top: 10%; justify-content: center; }
.fg-theater[data-skin="noir"] .fg-name-plate { background: none; clip-path: none; box-shadow: none; color: var(--accent); font-size: 1.5cqw; letter-spacing: .6em; padding: 0; }
.fg-theater[data-skin="noir"] .fg-name-plate::after { display: none; }
.fg-theater[data-skin="noir"] .fg-text { left: 14%; right: 14%; top: 36%; text-align: center; font-size: 2.05cqw; }
.fg-theater[data-skin="noir"] .fg-progress { left: 30%; right: 30%; }
.fg-theater[data-skin="noir"] .fg-stage::after { content: ""; position: absolute; inset: 0; z-index: 45; pointer-events: none; background: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence baseFrequency='.9' numOctaves='2'/></filter><rect width='120' height='120' filter='url(%23n)' opacity='.06'/></svg>"); mix-blend-mode: overlay; }
.fg-theater[data-skin="noir"] .fg-camera { filter: saturate(.75) contrast(1.06); }

/* 赛博：扫描线、等宽、青品红。 */
.fg-theater[data-skin="cyber"] {
  --accent: #00f0ff; --accent2: #ff2bd6; --accent3: #c6ff00;
  --ink: #e8fbff; --ink-dim: rgba(160, 230, 255, .6);
  --box-bg: linear-gradient(180deg, rgba(2, 16, 24, .82), rgba(4, 8, 20, .92));
  --box-border: rgba(0, 240, 255, .45);
  --box-radius: 0;
  --font-body: "JetBrains Mono", "Noto Sans SC", "Microsoft YaHei", monospace;
  --font-display: "JetBrains Mono", "Noto Sans SC", "Microsoft YaHei", monospace;
  --font-latin: "JetBrains Mono", "Cascadia Code", Consolas, monospace;
  --wait-glyph: "▍";
}
.fg-theater[data-skin="cyber"] .fg-box { clip-path: polygon(0 0, calc(100% - 2cqw) 0, 100% 2cqw, 100% 100%, 2cqw 100%, 0 calc(100% - 2cqw)); box-shadow: inset 0 0 2cqw rgba(0, 240, 255, .12); }
.fg-theater[data-skin="cyber"] .fg-box::after { background: repeating-linear-gradient(0deg, rgba(0, 240, 255, .06) 0 1px, transparent 1px 4px); width: auto; height: auto; inset: 0; border-radius: 0; right: 0; bottom: 0; }
.fg-theater[data-skin="cyber"] .fg-name-plate { background: var(--accent2); clip-path: polygon(0 0, 100% 0, calc(100% - 1cqw) 100%, 0 100%); text-shadow: .1cqw 0 #00f0ff, -.1cqw 0 #ff2bd6; }
.fg-theater[data-skin="cyber"] .fg-text { text-shadow: 0 0 .5cqw rgba(0, 240, 255, .35); }
.fg-theater[data-skin="cyber"] .fg-choice { border-radius: 0; clip-path: polygon(0 0, calc(100% - 1.4cqw) 0, 100% 50%, calc(100% - 1.4cqw) 100%, 0 100%); }
.fg-theater[data-skin="cyber"] .fg-title-logo { font-family: var(--font-display); animation: fg-logo-in 1.4s .3s both, fg-glitch 3.4s 2s steps(1) infinite; }
.fg-theater[data-skin="cyber"] .fg-stage::after { content: ""; position: absolute; inset: 0; z-index: 45; pointer-events: none; background: repeating-linear-gradient(0deg, rgba(0, 0, 0, .18) 0 1px, transparent 1px 3px); }
@keyframes fg-glitch { 0%, 92%, 100% { transform: none; } 93% { transform: translate(.3cqw, -.2cqw) skewX(8deg); } 95% { transform: translate(-.4cqw, .1cqw); } 97% { transform: translate(.1cqw, .2cqw) skewX(-6deg); } }
`;

// src/client/styles/chat.css
var chat_default = '/* ───────────── 聊天里的场景卡与插画（Tavern 正文下方） ───────────── */\n.fg-chat { --accent: #ff7eb6; --accent2: #9b7bff; --accent3: #5ee7ff; font-family: inherit; color: inherit; margin: 10px 0; max-width: 680px; }\n.fg-chat *, .fg-chat *::before, .fg-chat *::after { box-sizing: border-box; }\n.fg-chat button { font: inherit; cursor: pointer; }\n\n.fg-scene { position: relative; display: grid; grid-template-columns: 112px 1fr; min-height: 108px; border-radius: 14px; overflow: hidden; color: #f5f3ff; background: #110e24; border: 1px solid rgba(255, 255, 255, .1); box-shadow: 0 10px 30px rgba(0, 0, 0, .25); isolation: isolate; }\n.fg-scene-bg { position: absolute; inset: 0; z-index: -2; background-size: cover; background-position: center; filter: saturate(1.1); transform: scale(1.05); transition: transform 6s ease; }\n.fg-scene:hover .fg-scene-bg { transform: scale(1.12); }\n.fg-scene::before { content: ""; position: absolute; inset: 0; z-index: -1; background: linear-gradient(90deg, rgba(10, 8, 26, .2) 0, rgba(10, 8, 26, .78) 112px, rgba(10, 8, 26, .9)); }\n.fg-scene-clock { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; padding: 10px; font-family: "Cormorant Garamond", Georgia, serif; text-shadow: 0 1px 6px rgba(0, 0, 0, .8); }\n.fg-scene-clock b { font-size: 30px; line-height: 1; font-weight: 700; letter-spacing: .02em; }\n.fg-scene-clock span { font-size: 10px; letter-spacing: .35em; opacity: .8; text-transform: uppercase; }\n.fg-scene-main { padding: 12px 14px 12px 4px; display: flex; flex-direction: column; gap: 6px; min-width: 0; }\n.fg-scene-loc { font-size: 17px; font-weight: 700; letter-spacing: .12em; display: flex; align-items: center; gap: 8px; }\n.fg-scene-loc::before { content: ""; width: 3px; height: 16px; border-radius: 3px; background: linear-gradient(180deg, var(--accent), var(--accent2)); box-shadow: 0 0 8px var(--accent); }\n.fg-scene-chips { display: flex; flex-wrap: wrap; gap: 5px; }\n.fg-chip { display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 99px; font-size: 11px; letter-spacing: .06em; background: rgba(255, 255, 255, .09); border: 1px solid rgba(255, 255, 255, .12); }\n.fg-chip i { width: 7px; height: 7px; border-radius: 50%; background: var(--c, var(--accent)); box-shadow: 0 0 6px var(--c, var(--accent)); }\n.fg-scene-sum { font-size: 12.5px; opacity: .78; line-height: 1.5; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }\n.fg-scene-actions { display: flex; gap: 6px; margin-top: auto; flex-wrap: wrap; }\n.fg-play { display: inline-flex; align-items: center; gap: 6px; padding: 5px 14px 5px 10px; border-radius: 99px; border: 0; color: #fff; font-weight: 700; font-size: 12.5px; letter-spacing: .1em; background: linear-gradient(100deg, var(--accent), var(--accent2)); box-shadow: 0 4px 16px rgba(255, 126, 182, .35); transition: transform .2s, box-shadow .2s; }\n.fg-play:hover { transform: translateY(-1px); box-shadow: 0 6px 22px rgba(255, 126, 182, .5); }\n.fg-play::before { content: ""; width: 0; height: 0; border-left: 8px solid #fff; border-top: 5px solid transparent; border-bottom: 5px solid transparent; }\n.fg-ghost { padding: 5px 12px; border-radius: 99px; font-size: 12px; color: inherit; background: rgba(255, 255, 255, .08); border: 1px solid rgba(255, 255, 255, .16); transition: background .2s; }\n.fg-ghost:hover { background: rgba(255, 255, 255, .16); }\n.fg-scene.is-pending .fg-scene-main::after { content: ""; position: absolute; inset: 0; background: linear-gradient(100deg, transparent 30%, rgba(255, 255, 255, .08) 50%, transparent 70%); background-size: 200% 100%; animation: fg-skeleton 1.4s linear infinite; pointer-events: none; }\n.fg-scene-err { font-size: 12px; color: #ffb4b4; }\n.fg-dots::after { content: "…"; display: inline-block; animation: fg-dots 1.2s steps(4) infinite; width: 1.2em; overflow: hidden; vertical-align: bottom; }\n@keyframes fg-dots { from { width: 0; } to { width: 1.2em; } }\n\n.fg-cgcard { position: relative; border-radius: 14px; overflow: hidden; background: #0d0b1c; box-shadow: 0 12px 34px rgba(0, 0, 0, .3); border: 1px solid rgba(255, 255, 255, .08); }\n.fg-cgcard img { display: block; width: 100%; height: auto; max-height: min(70vh, 520px); object-fit: cover; cursor: zoom-in; animation: fg-cgcard-in .9s cubic-bezier(.2, .8, .2, 1) both; }\n@keyframes fg-cgcard-in { from { opacity: 0; filter: blur(12px) brightness(1.4); transform: scale(1.03); } }\n.fg-cgcard-wait { position: relative; display: grid; place-items: center; color: rgba(255, 255, 255, .78); font-size: 13px; letter-spacing: .1em; background: radial-gradient(120% 120% at 30% 20%, rgba(155, 123, 255, .35), transparent 60%), radial-gradient(100% 100% at 80% 90%, rgba(255, 126, 182, .3), transparent 60%), #120f26; overflow: hidden; }\n.fg-cgcard-wait::before { content: ""; position: absolute; inset: 0; background: linear-gradient(100deg, transparent 30%, rgba(255, 255, 255, .12) 50%, transparent 70%); background-size: 200% 100%; animation: fg-skeleton 1.6s linear infinite; }\n.fg-cgcard-wait span { position: relative; display: flex; align-items: center; gap: 8px; }\n.fg-cgcard-wait span::before { content: ""; width: 14px; height: 14px; border-radius: 50%; border: 2px solid var(--accent); border-right-color: transparent; animation: fg-spin .8s linear infinite; }\n.fg-cgcard-fail { padding: 14px 16px; font-size: 13px; color: #ffcdcd; display: flex; gap: 10px; align-items: center; flex-wrap: wrap; background: #1e1020; }\n.fg-cgcard-bar { position: absolute; left: 0; right: 0; bottom: 0; display: flex; align-items: center; gap: 6px; padding: 26px 10px 8px; color: #fff; background: linear-gradient(transparent, rgba(0, 0, 0, .72)); opacity: 0; transform: translateY(6px); transition: opacity .25s, transform .25s; }\n.fg-cgcard:hover .fg-cgcard-bar, .fg-cgcard:focus-within .fg-cgcard-bar { opacity: 1; transform: none; }\n.fg-cgcard-bar .fg-cap { flex: 1; min-width: 0; font-size: 12.5px; letter-spacing: .12em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }\n.fg-cgcard-bar button { padding: 3px 10px; border-radius: 99px; font-size: 12px; color: #fff; background: rgba(255, 255, 255, .14); border: 1px solid rgba(255, 255, 255, .2); backdrop-filter: blur(6px); }\n.fg-cgcard-bar button:hover { background: rgba(255, 255, 255, .26); }\n.fg-cgcard-bar button[disabled] { opacity: .35; pointer-events: none; }\n@media (hover: none) { .fg-cgcard-bar { opacity: 1; transform: none; } }\n\n.fg-chat-lightbox { position: fixed; inset: 0; z-index: 2147483100; display: grid; place-items: center; background: rgba(0, 0, 0, .9); cursor: zoom-out; animation: fg-fade-in .2s ease both; }\n.fg-chat-lightbox img { max-width: 94vw; max-height: 92vh; object-fit: contain; }\n\n.fg-toast { position: fixed; left: 50%; bottom: 7vh; z-index: 2147483200; transform: translateX(-50%); padding: 10px 18px; border-radius: 99px; font-size: 13.5px; letter-spacing: .04em; color: #fff; background: rgba(18, 14, 40, .92); border: 1px solid rgba(255, 255, 255, .14); box-shadow: 0 10px 30px rgba(0, 0, 0, .4); backdrop-filter: blur(10px); animation: fg-toast-in .35s cubic-bezier(.2, .8, .2, 1) both; max-width: 86vw; }\n.fg-toast.is-error { border-color: rgba(255, 120, 120, .6); }\n@keyframes fg-toast-in { from { opacity: 0; transform: translate(-50%, 10px); } }\n\n.fg-settings-card { display: grid; gap: 12px; padding: 18px; border-radius: 14px; border: 1px solid rgba(127, 127, 127, .25); background: linear-gradient(135deg, rgba(155, 123, 255, .08), rgba(255, 126, 182, .06)); }\n.fg-settings-card h3 { margin: 0; font-size: 16px; display: flex; align-items: center; gap: 8px; }\n.fg-settings-card p { margin: 0; font-size: 13px; opacity: .75; line-height: 1.6; }\n.fg-settings-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; font-size: 13px; }\n';

// src/client/api.js
var import_react = __toESM(require("react"), 1);
function originBase() {
  const candidates = [];
  try {
    if (window.top && window.top.location && window.top.location.origin) candidates.push(window.top.location.origin);
  } catch {
  }
  try {
    if (location.origin) candidates.push(location.origin);
  } catch {
  }
  const origin = candidates.find((o) => o && o !== "null" && /^https?:/i.test(o));
  return origin || "";
}
var API = originBase() + "/plugins/flowgal/api";
var assetUrl = (id) => id ? `${API}/asset?id=${encodeURIComponent(id)}` : "";
async function call(path, body, { method = body ? "POST" : "GET", signal } = {}) {
  const init = { method, signal, cache: "no-store", headers: { "x-flowgal-request": "1" } };
  if (method === "POST") {
    init.headers["content-type"] = "application/json";
    init.body = JSON.stringify(body || {});
  }
  const res = await fetch(API + path, init);
  let data = null;
  try {
    data = await res.json();
  } catch {
  }
  if (!res.ok || !data || data.ok === false) throw new Error(data && data.error || `HTTP ${res.status}`);
  return data;
}
var api = {
  game: (gameId, since, signal) => call(`/game?gameId=${encodeURIComponent(gameId)}${since ? `&since=${since}` : ""}`, null, { signal }),
  direct: (gameId, turn, force = false) => call("/direct", { gameId, turn, force }),
  replan: (gameId, turn) => call("/replan", { gameId, turn }),
  render: (gameId, imageId, overrides) => call("/image/render", { gameId, imageId, overrides }),
  rewrite: (gameId, imageId, instruction) => call("/image/rewrite", { gameId, imageId, instruction }),
  version: (gameId, imageId, index) => call("/image/version", { gameId, imageId, index }),
  deleteImage: (gameId, imageId) => call("/image/delete", { gameId, imageId }),
  addImage: (gameId, turn, after, plan) => call("/image/add", { gameId, turn, after, plan }),
  cancel: (gameId, kind, id) => call("/cancel", { gameId, kind, id }),
  directorLog: (gameId, since, signal) => call(`/director-log?gameId=${encodeURIComponent(gameId)}${since ? `&since=${since}` : ""}`, null, { signal }),
  directorEntry: (gameId, id) => call(`/director-log?gameId=${encodeURIComponent(gameId)}&id=${encodeURIComponent(id)}`),
  place: (gameId, key) => call("/place/render", { gameId, key }),
  cast: (gameId, action, input) => call("/cast", { gameId, action, ...input }),
  config: () => call("/config"),
  patchConfig: (patch) => call("/config", { patch }),
  secret: (backend, endpoint, value) => call("/secret", { backend, endpoint, value }),
  test: () => call("/test", {}),
  models: () => call("/models"),
  llm: (provider) => call(`/llm?provider=${encodeURIComponent(provider || "")}`),
  update: (check) => call(`/update${check ? `?check=${check}` : ""}`),
  runUpdate: (action) => call("/update", { action }),
  music: () => call("/music"),
  updateTrack: (id, patch) => call("/music", { action: "update", id, patch }),
  removeTrack: (id) => call("/music", { action: "remove", id }),
  /** 上传一首配乐：请求体直接是文件字节（最大 50 MB），不走 JSON。 */
  async uploadTrack(file) {
    const res = await fetch(`${API}/music/upload?name=${encodeURIComponent(file.name || "")}`, { method: "POST", cache: "no-store", headers: { "x-flowgal-request": "1", "content-type": file.type || "application/octet-stream" }, body: file });
    let data = null;
    try {
      data = await res.json();
    } catch {
    }
    if (!res.ok || !data || data.ok === false) throw new Error(data && data.error || `HTTP ${res.status}`);
    return data.track;
  }
};
var state = { open: false, gameId: "", startTurn: null, panel: "", panelArg: null, lastGameId: "", resume: null, toast: null, configVersion: 0 };
var listeners = /* @__PURE__ */ new Set();
var ui = {
  get: () => state,
  set(patch) {
    Object.assign(state, patch);
    for (const fn of [...listeners]) fn();
  },
  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }
};
var snapshot = { ...state };
ui.subscribe(() => {
  snapshot = { ...state };
});
function useUi() {
  return import_react.default.useSyncExternalStore(ui.subscribe, () => snapshot, () => snapshot);
}
function openTheater(gameId, opts = {}) {
  if (!gameId) gameId = state.lastGameId;
  if (!gameId && opts.panel !== "settings") {
    toast("先打开一局对话，再进剧场");
    return;
  }
  ui.set({ open: true, gameId, startTurn: opts.turn ?? null, panel: opts.panel || "", panelArg: opts.panelArg ?? null, resume: null });
}
function rememberGame(gameId) {
  if (gameId && state.lastGameId !== gameId) {
    state.lastGameId = gameId;
    setTimeout(() => ui.set({}), 0);
  }
}
var toastTimer = null;
function toast(text, tone = "info") {
  clearTimeout(toastTimer);
  ui.set({ toast: { text, tone, at: Date.now() } });
  toastTimer = setTimeout(() => ui.set({ toast: null }), 3600);
}
var configCache = null;
var configPromise = null;
var configListeners = /* @__PURE__ */ new Set();
function loadConfig(force = false) {
  if (configCache && !force) return Promise.resolve(configCache);
  if (!configPromise || force) {
    configPromise = api.config().then((data) => {
      setConfig(data);
      return data;
    }).finally(() => {
      configPromise = null;
    });
  }
  return configPromise;
}
function setConfig(data) {
  configCache = data;
  for (const fn of [...configListeners]) fn();
}
function useConfig() {
  const [, force] = import_react.default.useReducer((x) => x + 1, 0);
  import_react.default.useEffect(() => {
    configListeners.add(force);
    if (!configCache) loadConfig().catch(() => {
    });
    return () => configListeners.delete(force);
  }, []);
  return configCache;
}
async function patchConfig(patch) {
  const data = await api.patchConfig(patch);
  setConfig(data);
  return data;
}
var musicCache = null;
var musicListeners = /* @__PURE__ */ new Set();
function setMusic(tracks) {
  musicCache = tracks;
  for (const fn of [...musicListeners]) fn();
}
function loadMusic() {
  return api.music().then((r) => {
    setMusic(r.tracks);
    return r.tracks;
  });
}
function useMusic() {
  const [, force] = import_react.default.useReducer((x) => x + 1, 0);
  import_react.default.useEffect(() => {
    musicListeners.add(force);
    if (!musicCache) loadMusic().catch(() => {
    });
    return () => musicListeners.delete(force);
  }, []);
  return musicCache;
}
var updateState = null;
var updateListeners = /* @__PURE__ */ new Set();
function setUpdate(update) {
  updateState = update;
  for (const fn of [...updateListeners]) fn();
}
function loadUpdate(check) {
  return api.update(check).then((r) => {
    setUpdate(r.update);
    return r.update;
  });
}
function useUpdate(autoCheck = false) {
  const [, force] = import_react.default.useReducer((x) => x + 1, 0);
  import_react.default.useEffect(() => {
    updateListeners.add(force);
    if (!updateState || autoCheck) loadUpdate(autoCheck ? "auto" : "").catch(() => {
    });
    return () => updateListeners.delete(force);
  }, [autoCheck]);
  return updateState;
}
var updateAvailable = (u) => Boolean(u && u.managed && u.last && u.last.behind > 0 && !u.restartRequired);
function useLongPoll(key, active, fetchOnce) {
  const [data, setData] = import_react.default.useState(null);
  const [error, setError] = import_react.default.useState("");
  import_react.default.useEffect(() => {
    if (!key || !active) return void 0;
    let stopped = false;
    const controller = new AbortController();
    let rev = 0;
    let failures = 0;
    (async () => {
      while (!stopped) {
        try {
          const next = await fetchOnce(rev, controller.signal);
          if (stopped) return;
          failures = 0;
          setError("");
          if (next.rev !== rev || !rev) {
            rev = next.rev;
            setData(next);
          }
        } catch (e) {
          if (stopped) return;
          failures += 1;
          setError(String(e && e.message || e));
          await new Promise((r) => setTimeout(r, Math.min(15e3, 800 * 2 ** failures)));
        }
      }
    })();
    return () => {
      stopped = true;
      controller.abort();
    };
  }, [key, active]);
  return { data, error };
}
function useGameView(gameId, active = true) {
  const { data, error } = useLongPoll(gameId, active, (since, signal) => api.game(gameId, since, signal));
  return { view: data ? data.view : null, error };
}
function useDirectorLog(gameId, active = true) {
  const { data, error } = useLongPoll(gameId, active, (since, signal) => api.directorLog(gameId, since, signal));
  return { log: data, error };
}

// src/client/theater/Theater.jsx
var import_react7 = __toESM(require("react"), 1);

// lib/vocab.js
var EMOTIONS = {
  neutral: "平静",
  smile: "微笑",
  happy: "开心",
  laugh: "大笑",
  shy: "害羞",
  blush: "脸红",
  sad: "难过",
  cry: "哭泣",
  angry: "生气",
  pout: "赌气",
  surprised: "惊讶",
  scared: "害怕",
  worried: "担心",
  smug: "得意",
  serious: "认真",
  tired: "疲惫",
  love: "心动",
  confused: "困惑",
  thinking: "思考",
  determined: "坚定",
  cold: "冷淡",
  teasing: "调侃"
};
var DAYPART = { dawn: "day", morning: "day", noon: "day", afternoon: "day", dusk: "dusk", evening: "night", night: "night", midnight: "night" };
var daypart = (time) => DAYPART[time] || "day";
var placeKey = (scene) => `${String(scene?.location || "").trim() || "未知地点"}|${daypart(scene?.time)}`;

// src/client/theater/playback.js
var EMOTION_LABEL = EMOTIONS;
var TIME_LABEL = { dawn: "黎明", morning: "清晨", noon: "正午", afternoon: "午后", dusk: "黄昏", evening: "傍晚", night: "夜", midnight: "深夜" };
var WEATHER_LABEL = { clear: "晴", rain: "雨", storm: "暴雨", snow: "雪", sakura: "樱吹雪", leaves: "落叶", fireflies: "萤火", fog: "雾", embers: "余烬", dust: "浮尘", bokeh: "光斑", stars: "星空" };
var MOOD_LABEL = { daily: "日常", cheerful: "轻快", sweet: "甜蜜", calm: "静谧", sad: "感伤", tense: "紧张", battle: "激战", eerie: "诡异", silence: "寂静" };
var CARD_LABEL = { sms: "短信", letter: "信", note: "便条", news: "报纸", terminal: "终端", notice: "告示", diary: "日记", scroll: "卷轴" };
var POS_LABEL = { farleft: "最左", left: "左", center: "中", right: "右", farright: "最右" };
var CAMERA_LABEL = { shake: "震动", zoom: "推近", zoomout: "拉远", flash: "闪白", pan: "平移", blur: "虚焦", fadeblack: "黑场", redflash: "红闪", tilt: "倾斜" };
var SYMBOL_LABEL = { heart: "爱心", anger: "怒筋", sweat: "汗滴", sparkle: "闪光", surprise: "惊叹", gloom: "阴云", note: "音符", zzz: "睡着", bulb: "灵光", heartbreak: "心碎", sigh: "叹气", dizzy: "眩晕", fire: "燃起", blush: "红晕", bloom: "开花", silence: "无语" };
var TRANSITION_LABEL = { dissolve: "溶解", cinematic: "电影黑边", wipe: "横扫", iris: "圆形收缩", strips: "百叶", black: "黑场", flash: "白闪", none: "直接切" };
var POS_X = { farleft: 14, left: 28, center: 50, right: 72, farright: 86 };
var EMPTY_SCENE = { location: "", time: "afternoon", weather: "clear", mood: "daily", transition: "dissolve", bg: "" };
function imageReady(img) {
  return img && img.current >= 0 && img.versions && img.versions[img.current];
}
function buildBeats(view) {
  const beats = [];
  if (!view) return { beats, byKey: /* @__PURE__ */ new Map() };
  let scene = EMPTY_SCENE;
  let cast = [];
  const emotions = {};
  const turns = view.turns || [];
  const images = view.images || [];
  let bgm2 = "";
  turns.forEach((t, ti) => {
    const script = t.script;
    if (script && script.scene && script.scene.bgm) bgm2 = script.scene.bgm;
    const prevKey = placeKey(scene);
    if (script) {
      scene = { ...EMPTY_SCENE, ...script.scene };
      cast = script.cast || [];
    }
    const changed = beats.length === 0 || placeKey(scene) !== prevKey;
    const units = t.units || [];
    const unitIndex = new Map(units.map((u, i) => [u.id, i]));
    const turnImages = images.filter((img) => img.turn === t.turn && img.textVersion === t.textVersion).map((img) => ({ img, at: unitIndex.has(img.after) ? unitIndex.get(img.after) : units.length - 1 })).sort((a, b) => a.at - b.at);
    let lastSpeaker = "";
    units.forEach((unit, ui2) => {
      const line = script && script.lines && script.lines[unit.id] || {};
      if (line.bgm) bgm2 = line.bgm;
      let speaker = "";
      if (unit.type === "dialogue") {
        speaker = line.sp || unit.hint || lastSpeaker;
        lastSpeaker = speaker;
      } else if (unit.type === "thought") speaker = line.sp || "我";
      else if (line.sp) speaker = line.sp;
      if (speaker && line.emo) emotions[speaker] = line.emo;
      const cgEntry = [...turnImages].reverse().find((e) => e.at <= ui2);
      const cg = cgEntry ? cgEntry.img : null;
      beats.push({
        key: `${t.turn}:${unit.id}`,
        turn: t.turn,
        textVersion: t.textVersion,
        unitId: unit.id,
        type: unit.type,
        text: unit.text,
        speaker,
        alias: line.as || "",
        emo: line.emo || "",
        sym: line.sym || "",
        cam: line.cam || "",
        card: line.card || "",
        scene,
        bgm: bgm2,
        sceneEnter: ui2 === 0 && changed,
        transition: ui2 === 0 && changed ? scene.transition || "dissolve" : "none",
        cast,
        emotions: { ...emotions },
        cg,
        cgAnchor: Boolean(cgEntry && cgEntry.at === ui2),
        status: t.status,
        error: t.error,
        lastOfTurn: ui2 === units.length - 1,
        lastTurn: ti === turns.length - 1,
        choices: ti === turns.length - 1 && ui2 === units.length - 1 && script ? script.choices || [] : []
      });
    });
  });
  return { beats, byKey: new Map(beats.map((b, i) => [b.key, i])) };
}
function actorX(pos) {
  return POS_X[pos] ?? 50;
}
function cgSrc(img, assetUrl2) {
  return imageReady(img) ? assetUrl2(img.versions[img.current].assetId) : "";
}
function pickTrack(beat, tracks, urlOf) {
  if (!beat || !tracks || !tracks.length || beat.bgm === "none") return null;
  const asTrack = (t) => ({ id: t.id, name: t.name, url: urlOf(t.assetId) });
  const chosen = beat.bgm && tracks.find((t) => t.id === beat.bgm);
  if (chosen) return asTrack(chosen);
  const scene = beat.scene || {};
  if (scene.mood === "silence") return null;
  const loc = String(scene.location || "");
  const words = [MOOD_LABEL[scene.mood], TIME_LABEL[scene.time], WEATHER_LABEL[scene.weather], scene.mood, ...loc.match(/[\u4e00-\u9fff]{2}|[a-z]{3,}/gi) || []].filter(Boolean);
  const score = (t) => {
    const text = `${t.name} ${t.description} ${(t.tags || []).join(" ")}`;
    return words.filter((w) => text.includes(w)).length;
  };
  const best = Math.max(...tracks.map(score));
  const pool = tracks.filter((t) => score(t) === best);
  let h = 0;
  for (const ch of loc + (scene.mood || "")) h = h * 33 + ch.codePointAt(0) >>> 0;
  return asTrack(pool[h % pool.length]);
}
var SKY = {
  dawn: ["#2a2350", "#9a5c8f", "#f6a58f", "rgba(255, 190, 170, .7)", "70%", "62%"],
  morning: ["#5aa6e8", "#a9d3f5", "#f4f1e2", "rgba(255, 250, 220, .6)", "78%", "20%"],
  noon: ["#3e8fe0", "#8cc5f2", "#dff0ff", "rgba(255, 255, 240, .55)", "60%", "12%"],
  afternoon: ["#4c8fd6", "#a7c9ec", "#fbe3c0", "rgba(255, 230, 190, .6)", "75%", "30%"],
  dusk: ["#2b1d4f", "#b14f6e", "#ffb067", "rgba(255, 170, 100, .85)", "72%", "64%"],
  evening: ["#1b1740", "#4f2f78", "#e17a8d", "rgba(255, 140, 160, .5)", "20%", "70%"],
  night: ["#05081c", "#121a44", "#2a2d6a", "rgba(200, 210, 255, .35)", "78%", "18%"],
  midnight: ["#020410", "#070b24", "#141842", "rgba(170, 180, 255, .25)", "80%", "14%"]
};

// src/client/theater/Stage.jsx
var import_react3 = __toESM(require("react"), 1);

// src/client/theater/particles.js
var import_react2 = __toESM(require("react"), 1);
var COUNTS = { rain: 220, storm: 380, snow: 140, sakura: 70, leaves: 40, fireflies: 46, embers: 90, dust: 60, bokeh: 26, stars: 160, fog: 6 };
var rand = (a, b) => a + Math.random() * (b - a);
function spawn(kind, w, h, initial) {
  const p = { x: rand(0, w), y: initial ? rand(0, h) : rand(-h * 0.2, -10), life: 0 };
  switch (kind) {
    case "rain":
    case "storm":
      return { ...p, vx: kind === "storm" ? -7 : -2.4, vy: rand(16, 26) * (kind === "storm" ? 1.25 : 1), len: rand(12, 26), a: rand(0.18, 0.45) };
    case "snow":
      return { ...p, vx: rand(-0.4, 0.4), vy: rand(0.5, 1.6), r: rand(1, 3.6), a: rand(0.5, 0.95), ph: rand(0, 6.28) };
    case "sakura":
    case "leaves":
      return { ...p, x: rand(-w * 0.2, w), vx: rand(0.6, 1.8), vy: rand(0.7, 1.7), r: rand(5, 10) * (kind === "leaves" ? 1.3 : 1), rot: rand(0, 6.28), vr: rand(-0.05, 0.05), ph: rand(0, 6.28), hue: kind === "leaves" ? rand(18, 44) : rand(330, 352) };
    case "fireflies":
      return { ...p, y: initial ? rand(h * 0.3, h) : rand(h * 0.4, h), vx: rand(-0.3, 0.3), vy: rand(-0.3, 0.2), r: rand(1.2, 2.6), ph: rand(0, 6.28) };
    case "embers":
      return { ...p, y: initial ? rand(0, h) : h + 10, vx: rand(-0.4, 0.6), vy: -rand(0.6, 2.2), r: rand(0.8, 2.2), ph: rand(0, 6.28) };
    case "dust":
      return { ...p, y: rand(0, h), vx: rand(-0.15, 0.15), vy: rand(-0.12, 0.12), r: rand(0.6, 1.6), ph: rand(0, 6.28) };
    case "bokeh":
      return { ...p, y: rand(0, h), vx: rand(-0.12, 0.12), vy: rand(-0.18, -0.04), r: rand(14, 46), hue: rand(0, 360), ph: rand(0, 6.28) };
    case "stars":
      return { ...p, y: rand(0, h * 0.65), r: rand(0.4, 1.5), ph: rand(0, 6.28), sp: rand(0.01, 0.05) };
    case "fog":
      return { ...p, y: rand(h * 0.35, h * 0.9), vx: rand(0.15, 0.4), r: rand(w * 0.25, w * 0.45), a: rand(0.06, 0.13) };
    default:
      return p;
  }
}
function step(kind, p, w, h, t, ctx2) {
  switch (kind) {
    case "rain":
    case "storm": {
      p.x += p.vx;
      p.y += p.vy;
      ctx2.strokeStyle = `rgba(200, 220, 255, ${p.a})`;
      ctx2.lineWidth = 1;
      ctx2.beginPath();
      ctx2.moveTo(p.x, p.y);
      ctx2.lineTo(p.x + p.vx * 1.6, p.y - p.len);
      ctx2.stroke();
      return p.y < h + 30;
    }
    case "snow": {
      p.ph += 0.02;
      p.x += p.vx + Math.sin(p.ph) * 0.4;
      p.y += p.vy;
      ctx2.fillStyle = `rgba(255, 255, 255, ${p.a})`;
      ctx2.beginPath();
      ctx2.arc(p.x, p.y, p.r, 0, 6.283);
      ctx2.fill();
      return p.y < h + 10;
    }
    case "sakura":
    case "leaves": {
      p.ph += 0.03;
      p.rot += p.vr;
      p.x += p.vx + Math.sin(p.ph) * 0.8;
      p.y += p.vy;
      ctx2.save();
      ctx2.translate(p.x, p.y);
      ctx2.rotate(p.rot);
      ctx2.scale(1, Math.abs(Math.sin(p.ph)) * 0.6 + 0.4);
      ctx2.fillStyle = kind === "leaves" ? `hsla(${p.hue}, 75%, 48%, .85)` : `hsla(${p.hue}, 90%, 86%, .9)`;
      ctx2.beginPath();
      ctx2.moveTo(0, -p.r);
      ctx2.bezierCurveTo(p.r, -p.r * 0.6, p.r * 0.7, p.r * 0.6, 0, p.r);
      ctx2.bezierCurveTo(-p.r * 0.7, p.r * 0.6, -p.r, -p.r * 0.6, 0, -p.r);
      ctx2.fill();
      ctx2.restore();
      return p.y < h + 20 && p.x < w + 30;
    }
    case "fireflies": {
      p.ph += 0.03;
      p.x += p.vx + Math.sin(p.ph * 0.7) * 0.3;
      p.y += p.vy + Math.cos(p.ph * 0.5) * 0.2;
      const a = 0.35 + Math.sin(p.ph * 2) * 0.35;
      const g = ctx2.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 6);
      g.addColorStop(0, `rgba(230, 255, 150, ${a})`);
      g.addColorStop(1, "rgba(230, 255, 150, 0)");
      ctx2.fillStyle = g;
      ctx2.beginPath();
      ctx2.arc(p.x, p.y, p.r * 6, 0, 6.283);
      ctx2.fill();
      return p.x > -20 && p.x < w + 20 && p.y > -20 && p.y < h + 20;
    }
    case "embers": {
      p.ph += 0.05;
      p.x += p.vx + Math.sin(p.ph) * 0.5;
      p.y += p.vy;
      ctx2.fillStyle = `rgba(255, ${140 + Math.sin(p.ph) * 60}, 60, ${0.5 + Math.sin(p.ph * 1.7) * 0.4})`;
      ctx2.beginPath();
      ctx2.arc(p.x, p.y, p.r, 0, 6.283);
      ctx2.fill();
      return p.y > -10;
    }
    case "dust": {
      p.ph += 0.01;
      p.x += p.vx;
      p.y += p.vy;
      ctx2.fillStyle = `rgba(255, 245, 220, ${0.25 + Math.sin(p.ph * 3) * 0.2})`;
      ctx2.beginPath();
      ctx2.arc(p.x, p.y, p.r, 0, 6.283);
      ctx2.fill();
      return p.x > -10 && p.x < w + 10 && p.y > -10 && p.y < h + 10;
    }
    case "bokeh": {
      p.ph += 0.01;
      p.x += p.vx;
      p.y += p.vy;
      const g = ctx2.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
      const a = 0.08 + Math.sin(p.ph) * 0.05;
      g.addColorStop(0, `hsla(${p.hue}, 90%, 75%, ${a + 0.06})`);
      g.addColorStop(0.7, `hsla(${p.hue}, 90%, 70%, ${a})`);
      g.addColorStop(1, `hsla(${p.hue}, 90%, 70%, 0)`);
      ctx2.fillStyle = g;
      ctx2.beginPath();
      ctx2.arc(p.x, p.y, p.r, 0, 6.283);
      ctx2.fill();
      return p.y > -p.r;
    }
    case "stars": {
      p.ph += p.sp;
      ctx2.fillStyle = `rgba(255, 255, 255, ${0.3 + Math.abs(Math.sin(p.ph)) * 0.7})`;
      ctx2.beginPath();
      ctx2.arc(p.x, p.y, p.r, 0, 6.283);
      ctx2.fill();
      return true;
    }
    case "fog": {
      p.x += p.vx;
      const g = ctx2.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
      g.addColorStop(0, `rgba(230, 235, 245, ${p.a})`);
      g.addColorStop(1, "rgba(230, 235, 245, 0)");
      ctx2.fillStyle = g;
      ctx2.fillRect(p.x - p.r, p.y - p.r, p.r * 2, p.r * 2);
      if (p.x - p.r > w) p.x = -p.r;
      return true;
    }
    default:
      return false;
  }
}
function Particles({ weather, enabled = true }) {
  const ref = import_react2.default.useRef(null);
  import_react2.default.useEffect(() => {
    const canvas = ref.current;
    const kind = weather;
    if (!canvas || !enabled || !COUNTS[kind]) return void 0;
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return void 0;
    const ctx2 = canvas.getContext("2d");
    let w = 0, h = 0, raf = 0, flash = 0;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const resize = () => {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx2.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = typeof ResizeObserver === "function" ? new ResizeObserver(resize) : null;
    ro && ro.observe(canvas);
    const target = Math.round(COUNTS[kind] * Math.min(1.4, Math.max(0.5, w / 1200)));
    let list = Array.from({ length: target }, () => spawn(kind, w, h, true));
    const frame = (t) => {
      raf = requestAnimationFrame(frame);
      if (document.hidden) return;
      ctx2.clearRect(0, 0, w, h);
      if (kind === "storm") {
        if (flash <= 0 && Math.random() < 4e-3) flash = 1;
        if (flash > 0) {
          ctx2.fillStyle = `rgba(220, 230, 255, ${flash * 0.35})`;
          ctx2.fillRect(0, 0, w, h);
          flash -= 0.06;
        }
      }
      const next = [];
      for (const p of list) if (step(kind, p, w, h, t, ctx2)) next.push(p);
      while (next.length < target) next.push(spawn(kind, w, h, false));
      list = next;
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      ro && ro.disconnect();
      ctx2.clearRect(0, 0, w, h);
    };
  }, [weather, enabled]);
  return import_react2.default.createElement("canvas", { ref, className: "fg-particles", "aria-hidden": true });
}

// src/client/theater/symbols.js
var OUTLINE = 'stroke="#fff" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"';
var HEART = "M50 86C20 64 8 48 8 32C8 18 19 9 31 9C40 9 46 14 50 21C54 14 60 9 69 9C81 9 92 18 92 32C92 48 80 64 50 86Z";
var svg = (body) => `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${body}</svg>`;
var round = (n) => Math.round(n * 10) / 10;
function star(cx, cy, r) {
  return `M${cx} ${cy - r}Q${cx} ${cy} ${cx + r} ${cy}Q${cx} ${cy} ${cx} ${cy + r}Q${cx} ${cy} ${cx - r} ${cy}Q${cx} ${cy} ${cx} ${cy - r}Z`;
}
function burst(points, outer, inner) {
  const out = [];
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 ? inner : outer;
    const a = Math.PI * i / points - Math.PI / 2;
    out.push(`${round(50 + r * Math.cos(a))} ${round(50 + r * Math.sin(a))}`);
  }
  return "M" + out.join("L") + "Z";
}
function spiral(turns, maxR) {
  const out = [];
  const steps = turns * 24;
  for (let i = 0; i <= steps; i++) {
    const a = i / 24 * Math.PI * 2;
    const r = i / steps * maxR;
    out.push(`${round(50 + r * Math.cos(a))} ${round(50 + r * Math.sin(a))}`);
  }
  return "M" + out.join("L");
}
function zed(x, y, size) {
  return `M${x} ${y}H${x + size}L${x} ${y + size}H${x + size}`;
}
var CRACK = "L44 70L54 56L44 43L53 31L50 21";
var SYMBOL_SVG = {
  heart: svg(`<path d="${HEART}" fill="#ff4f7b" ${OUTLINE}/><path d="M24 27C27 21 32 18 37 19" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".85"/>`),
  anger: svg(["M40 12Q42 38 14 40", "M60 12Q58 38 86 40", "M40 88Q42 62 14 60", "M60 88Q58 62 86 60"].map((d) => `<path d="${d}" fill="none" stroke="#fff" stroke-width="16" stroke-linecap="round"/>`).join("") + ["M40 12Q42 38 14 40", "M60 12Q58 38 86 40", "M40 88Q42 62 14 60", "M60 88Q58 62 86 60"].map((d) => `<path d="${d}" fill="none" stroke="#e8283c" stroke-width="9" stroke-linecap="round"/>`).join("")),
  sweat: svg(`<path d="M50 8C50 8 22 46 22 64C22 80 35 92 50 92C65 92 78 80 78 64C78 46 50 8 50 8Z" fill="#7cc8ff" ${OUTLINE}/><path d="M35 63C35 72 40 78 47 80" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".9"/>`),
  sparkle: svg(`<path d="${star(42, 52, 36)}" fill="#ffe36e" stroke="#fff" stroke-width="3" stroke-linejoin="round"/><path d="${star(80, 18, 14)}" fill="#fff6b8" stroke="#fff" stroke-width="2"/><path d="${star(82, 80, 9)}" fill="#fff6b8" stroke="#fff" stroke-width="2"/>`),
  surprise: svg(`<path d="${burst(11, 48, 31)}" fill="#fff" stroke="#ff4f4f" stroke-width="3" stroke-linejoin="round"/><rect x="43" y="22" width="14" height="38" rx="7" fill="#ff4f4f"/><circle cx="50" cy="73" r="7.5" fill="#ff4f4f"/>`),
  gloom: svg(`<g stroke-linecap="round">${[[14, 62], [27, 82], [40, 70], [53, 90], [66, 74], [79, 84], [90, 58]].map(([x, len]) => `<path d="M${x} 8V${len}" stroke="#fff" stroke-width="9" opacity=".55"/><path d="M${x} 8V${len}" stroke="#5c4d8a" stroke-width="5"/>`).join("")}</g>`),
  note: svg(`<g ${OUTLINE}><ellipse cx="30" cy="76" rx="13" ry="9.5" transform="rotate(-22 30 76)" fill="#ff8fcf"/><path d="M41 72V16Q58 22 64 38Q56 30 41 30" fill="#ff8fcf"/><ellipse cx="74" cy="58" rx="9" ry="6.5" transform="rotate(-22 74 58)" fill="#8fd6ff"/><path d="M82 55V22Q90 26 93 34" fill="none" stroke="#8fd6ff"/></g><path d="M41 72V16M82 55V22Q90 26 93 34" fill="none" stroke="#1d1d2b" stroke-width="2.5" stroke-linecap="round" opacity=".35"/>`),
  zzz: svg([[12, 68, 16], [34, 42, 22], [60, 10, 30]].map(([x, y, s]) => `<path d="${zed(x, y, s)}" fill="none" stroke="#fff" stroke-width="12" stroke-linejoin="round" stroke-linecap="round"/><path d="${zed(x, y, s)}" fill="none" stroke="#8fa8ff" stroke-width="6" stroke-linejoin="round" stroke-linecap="round"/>`).join("")),
  bulb: svg(`<g stroke="#ffd94a" stroke-width="5" stroke-linecap="round">${[-150, -120, -90, -60, -30].map((deg) => {
    const a = deg * Math.PI / 180;
    return `<path d="M${round(50 + 32 * Math.cos(a))} ${round(42 + 32 * Math.sin(a))}L${round(50 + 44 * Math.cos(a))} ${round(42 + 44 * Math.sin(a))}"/>`;
  }).join("")}</g><circle cx="50" cy="44" r="22" fill="#fff36b" ${OUTLINE}/><path d="M41 66H59V78Q59 84 53 84H47Q41 84 41 78Z" fill="#c8c9d8" ${OUTLINE}/><path d="M42 72H58" stroke="#8e90a6" stroke-width="3"/><path d="M40 38Q42 30 50 28" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round"/>`),
  heartbreak: svg(`<path d="M50 21C46 14 40 9 31 9C19 9 8 18 8 32C8 48 20 64 50 86${CRACK}Z" transform="translate(-5 3) rotate(-7 30 50)" fill="#ff4f7b" ${OUTLINE}/><path d="M50 21C54 14 60 9 69 9C81 9 92 18 92 32C92 48 80 64 50 86${CRACK}Z" transform="translate(5 3) rotate(7 70 50)" fill="#e83d68" ${OUTLINE}/>`),
  sigh: svg(`<g fill="#eef2ff" stroke="#9aa6c8" stroke-width="4"><circle cx="62" cy="52" r="18"/><circle cx="80" cy="44" r="13"/><circle cx="78" cy="64" r="11"/><circle cx="62" cy="52" r="16" stroke="none"/></g><path d="M8 50H36M14 63H38M16 37H36" fill="none" stroke="#c7d0ee" stroke-width="5" stroke-linecap="round"/>`),
  dizzy: svg(`<path d="${spiral(3, 36)}" fill="none" stroke="#fff" stroke-width="10" stroke-linecap="round"/><path d="${spiral(3, 36)}" fill="none" stroke="#ffb84a" stroke-width="5" stroke-linecap="round"/><path d="${star(14, 14, 9)}" fill="#ffe36e" stroke="#fff" stroke-width="2"/><path d="${star(88, 84, 8)}" fill="#ffe36e" stroke="#fff" stroke-width="2"/>`),
  fire: svg(`<path d="M50 6C62 26 82 36 80 62C78 82 64 94 50 94C36 94 22 82 20 62C19 46 30 38 34 24C38 34 42 38 46 40C44 28 46 16 50 6Z" fill="#ff6a2b" ${OUTLINE}/><path d="M50 44C58 56 66 62 64 74C62 86 56 90 50 90C44 90 38 86 36 76C35 66 42 60 50 44Z" fill="#ffd24a"/>`),
  blush: svg(`<ellipse cx="50" cy="52" rx="44" ry="20" fill="#ff8fb0" opacity=".42"/><g stroke="#ff5c8a" stroke-width="5" stroke-linecap="round">${[20, 34, 48, 62, 76].map((x) => `<path d="M${x} 64L${x + 8} 40"/>`).join("")}</g>`),
  bloom: svg(`<g fill="#ffb7d5" ${OUTLINE}>${[0, 72, 144, 216, 288].map((deg) => `<ellipse cx="50" cy="27" rx="15" ry="22" transform="rotate(${deg} 50 50)"/>`).join("")}</g><circle cx="50" cy="50" r="12" fill="#ffe066" ${OUTLINE}/>`),
  silence: svg(`<path d="M14 18H86Q94 18 94 26V62Q94 70 86 70H44L28 86V70H14Q6 70 6 62V26Q6 18 14 18Z" fill="#fff" stroke="#6d6f86" stroke-width="4" stroke-linejoin="round"/><g fill="#6d6f86"><circle cx="32" cy="44" r="6"/><circle cx="50" cy="44" r="6"/><circle cx="68" cy="44" r="6"/></g>`)
};

// src/client/theater/Stage.jsx
var TRANSITION = {
  dissolve: ["fg-dissolve", "1.1s"],
  cinematic: ["fg-cinematic", "1.5s"],
  wipe: ["fg-wipe", "1s"],
  iris: ["fg-iris", "1.2s"],
  strips: ["fg-wipe", ".8s"],
  black: ["fg-black-in", "1.8s"],
  flash: ["fg-flash-in", "1s"],
  none: ["none", "0s"]
};
function backgroundFor(scene, view) {
  const place = view && view.places && view.places[placeKey(scene)];
  if (place && place.assetId) return { src: assetUrl(place.assetId), from: "ai" };
  return { src: "", from: "sky" };
}
function hashOf(text) {
  let h = 0;
  for (const ch of String(text)) h = h * 31 + ch.codePointAt(0) >>> 0;
  return h;
}
function Skyline({ seed, time }) {
  const h = hashOf(seed);
  const night = ["evening", "night", "midnight"].includes(time);
  const blocks = [];
  let x = 0;
  let i = 0;
  while (x < 1e3) {
    const w = 40 + (h >> i % 24 & 63) + i * 37 % 50;
    const top = 120 + h * (i + 3) % 150;
    blocks.push({ x, w, top });
    x += w + i * 13 % 8;
    i += 1;
  }
  const windows = [];
  if (night) {
    blocks.forEach((b, bi) => {
      for (let wy = b.top + 14; wy < 380; wy += 22) for (let wx = b.x + 8; wx < b.x + b.w - 10; wx += 16) {
        if ((wx * 7 + wy * 13 + bi * 31 + h) % 11 === 0) windows.push({ x: wx, y: wy });
      }
    });
  }
  return /* @__PURE__ */ import_react3.default.createElement("svg", { className: "fg-skyline", viewBox: "0 0 1000 400", preserveAspectRatio: "none", "aria-hidden": "true" }, /* @__PURE__ */ import_react3.default.createElement("defs", null, /* @__PURE__ */ import_react3.default.createElement("linearGradient", { id: "fg-skyline-g", x1: "0", y1: "0", x2: "0", y2: "1" }, /* @__PURE__ */ import_react3.default.createElement("stop", { offset: "0", stopColor: night ? "#0b0f2a" : "#2a2440", stopOpacity: ".92" }), /* @__PURE__ */ import_react3.default.createElement("stop", { offset: "1", stopColor: "#05040c" }))), /* @__PURE__ */ import_react3.default.createElement("path", { d: `M0 400 L0 ${260 + h % 40} Q250 ${200 + h % 60} 500 ${250 + h % 30} T1000 ${230 + h % 50} L1000 400 Z`, fill: "#000", opacity: ".28" }), blocks.map((b, k) => /* @__PURE__ */ import_react3.default.createElement("rect", { key: k, x: b.x, y: b.top, width: b.w, height: 400 - b.top, fill: "url(#fg-skyline-g)" })), windows.map((w, k) => /* @__PURE__ */ import_react3.default.createElement("rect", { key: "w" + k, x: w.x, y: w.y, width: "6", height: "9", fill: "#ffd98a", opacity: 0.5 + k % 5 * 0.1 })));
}
function Sky({ scene }) {
  const [top, mid, low, sun, sx, sy] = SKY[scene.time] || SKY.afternoon;
  return /* @__PURE__ */ import_react3.default.createElement("div", { className: "fg-sky", style: { background: `linear-gradient(180deg, ${top} 0%, ${mid} 55%, ${low} 100%)`, "--sun": sun, "--sun-x": sx, "--sun-y": sy } }, /* @__PURE__ */ import_react3.default.createElement(Skyline, { seed: scene.location || "x", time: scene.time }));
}
function Backdrop({ scene, view, transition = "dissolve" }) {
  const bg = backgroundFor(scene, view);
  const id = bg.src || "sky:" + scene.time + ":" + scene.location;
  const [layers, setLayers] = import_react3.default.useState(() => [{ id, bg, scene, enter: false }]);
  import_react3.default.useEffect(() => {
    setLayers((list) => {
      if (list[list.length - 1].id === id) return list.map((l, i) => i === list.length - 1 ? { ...l, scene } : l);
      return [...list.slice(-1).map((l) => ({ ...l, leaving: true })), { id, bg, scene, enter: true, tr: transition }];
    });
  }, [id, scene.time]);
  import_react3.default.useEffect(() => {
    if (layers.length < 2) return void 0;
    const t = setTimeout(() => setLayers((list) => list.filter((l) => !l.leaving)), 1900);
    return () => clearTimeout(t);
  }, [layers]);
  return /* @__PURE__ */ import_react3.default.createElement(import_react3.default.Fragment, null, layers.map((layer) => {
    const [anim, dur] = TRANSITION[layer.tr] || TRANSITION.dissolve;
    const cls = ["fg-bg", layer.bg.src ? "is-image" : "", layer.enter && layer.tr !== "none" ? "is-enter" : "", layer.leaving ? "is-leave" : ""].join(" ");
    return /* @__PURE__ */ import_react3.default.createElement("div", { key: layer.id, className: cls, "data-tr": layer.tr, style: { "--enter-anim": anim, "--enter-dur": dur, backgroundImage: layer.bg.src ? `url("${layer.bg.src}")` : void 0 } }, !layer.bg.src && /* @__PURE__ */ import_react3.default.createElement(Sky, { scene: layer.scene }));
  }));
}
var SIL = {
  hairLong: "M100 22C58 22 36 54 36 98c0 46-4 92-14 150h156c-10-58-14-104-14-150 0-44-22-76-64-76z",
  hairShort: "M100 22C60 22 38 52 38 96c0 22 2 40 8 58h108c6-18 8-36 8-58 0-44-22-74-62-74z",
  body: "M100 150c-22 0-44 6-60 20-20 18-28 50-32 92L0 400h200l-8-138c-4-42-12-74-32-92-16-14-38-20-60-20z",
  bodyWide: "M100 148c-28 0-54 6-70 20-20 18-26 50-30 94l-6 138h212l-6-138c-4-44-10-76-30-94-16-14-42-20-70-20z",
  neck: "M86 120h28l2 44c-10 8-22 8-32 0z",
  face: "M100 52c-24 0-38 20-38 46 0 30 16 52 38 52s38-22 38-52c0-26-14-46-38-46z",
  bangs: "M60 100C56 56 76 36 100 36s44 20 40 64q-6-16-12-30-4 16-12 24-2-16-6-26-6 16-16 24 2-14-2-26-8 16-18 22 4-12 2-22-8 16-16 32z",
  lockL: "M58 98c-4 48-8 98-20 154l16 4c8-52 12-104 12-156z",
  lockR: "M142 98c4 48 8 98 20 154l-16 4c-8-52-12-104-12-156z",
  lockShortL: "M58 98c-2 22-4 38-10 56l14 2c4-18 6-36 6-56z",
  lockShortR: "M142 98c2 22 4 38 10 56l-14 2c-4-18-6-36-6-56z",
  tailR: "M146 70c30 6 44 52 36 112-4 30-14 52-24 62 4-34 4-70-2-104-4-26-8-48-10-70z",
  tailL: "M54 70c-30 6-44 52-36 112 4 30 14 52 24 62-4-34-4-70 2-104 4-26 8-48 10-70z",
  collar: "M80 172l20 26 20-26",
  rimLong: "M22 248c10-58 14-104 14-150 0-44 22-76 64-76s64 32 64 76c0 46 4 92 14 150",
  rimShort: "M46 154c-6-18-8-36-8-58 0-44 22-74 62-74s62 30 62 74c0 22-2 40-8 58"
};
var hairRe = (words) => new RegExp(`\\b(?:${words})\\b[a-z\\s-]{0,16}\\bhair\\b`);
var HAIR_COLORS = [
  [hairRe("silver|white|grey|gray|platinum"), "#d9dce8"],
  [hairRe("blonde|golden|yellow"), "#e6c56a"],
  [hairRe("brown|chestnut"), "#6a4530"],
  [hairRe("red|crimson"), "#b8323a"],
  [hairRe("pink"), "#f29ac0"],
  [hairRe("orange"), "#e8873a"],
  [hairRe("blue|aqua"), "#4a78d8"],
  [hairRe("purple|violet|lavender"), "#8a5fd0"],
  [hairRe("green"), "#43a070"],
  [hairRe("black|dark"), "#1b1628"]
];
function silhouetteStyle(appearance = "", gender = "") {
  const a = String(appearance).toLowerCase();
  const male = gender === "male" || /\b1boy\b|\bmale\b/.test(a);
  return {
    short: male || hairRe("short|very short").test(a) || /bob cut|pixie cut|buzz cut/.test(a),
    tails: /twintails|twin tails/.test(a) ? 2 : /ponytail/.test(a) ? 1 : 0,
    wide: male,
    hair: (HAIR_COLORS.find(([re]) => re.test(a)) || [, "#1b1628"])[1]
  };
}
function Silhouette({ name: name2, color, appearance, gender }) {
  const gid = "fg-sil-" + hashOf(name2);
  const st = silhouetteStyle(appearance, gender);
  const hairPath = st.short ? SIL.hairShort : SIL.hairLong;
  const bodyPath = st.wide ? SIL.bodyWide : SIL.body;
  return /* @__PURE__ */ import_react3.default.createElement("div", { className: "fg-silhouette", style: { "--c": color } }, /* @__PURE__ */ import_react3.default.createElement("svg", { viewBox: "0 0 200 400", "aria-hidden": "true" }, /* @__PURE__ */ import_react3.default.createElement("defs", null, /* @__PURE__ */ import_react3.default.createElement("linearGradient", { id: gid, x1: "0", y1: "0", x2: "0", y2: "1" }, /* @__PURE__ */ import_react3.default.createElement("stop", { offset: "0", stopColor: color, stopOpacity: ".95" }), /* @__PURE__ */ import_react3.default.createElement("stop", { offset: ".55", stopColor: color, stopOpacity: ".5" }), /* @__PURE__ */ import_react3.default.createElement("stop", { offset: "1", stopColor: color, stopOpacity: "0" })), /* @__PURE__ */ import_react3.default.createElement("linearGradient", { id: gid + "h", x1: "0", y1: "0", x2: "0", y2: "1" }, /* @__PURE__ */ import_react3.default.createElement("stop", { offset: "0", stopColor: st.hair, stopOpacity: ".95" }), /* @__PURE__ */ import_react3.default.createElement("stop", { offset: "1", stopColor: st.hair, stopOpacity: ".55" })), /* @__PURE__ */ import_react3.default.createElement("radialGradient", { id: gid + "f", cx: ".5", cy: ".42", r: ".62" }, /* @__PURE__ */ import_react3.default.createElement("stop", { offset: "0", stopColor: "#fff", stopOpacity: ".5" }), /* @__PURE__ */ import_react3.default.createElement("stop", { offset: "1", stopColor: "#fff", stopOpacity: ".06" }))), st.tails > 0 && /* @__PURE__ */ import_react3.default.createElement("path", { d: SIL.tailR, fill: `url(#${gid}h)` }), st.tails > 1 && /* @__PURE__ */ import_react3.default.createElement("path", { d: SIL.tailL, fill: `url(#${gid}h)` }), /* @__PURE__ */ import_react3.default.createElement("path", { d: hairPath, fill: `url(#${gid}h)` }), /* @__PURE__ */ import_react3.default.createElement("path", { d: bodyPath, fill: `url(#${gid})` }), /* @__PURE__ */ import_react3.default.createElement("path", { d: SIL.neck, fill: color, opacity: ".55" }), /* @__PURE__ */ import_react3.default.createElement("path", { d: SIL.face, fill: color, opacity: ".8" }), /* @__PURE__ */ import_react3.default.createElement("path", { d: SIL.face, fill: `url(#${gid}f)` }), /* @__PURE__ */ import_react3.default.createElement("path", { d: SIL.bangs, fill: st.hair, opacity: ".92" }), /* @__PURE__ */ import_react3.default.createElement("path", { d: st.short ? SIL.lockShortL : SIL.lockL, fill: st.hair, opacity: ".85" }), /* @__PURE__ */ import_react3.default.createElement("path", { d: st.short ? SIL.lockShortR : SIL.lockR, fill: st.hair, opacity: ".85" }), /* @__PURE__ */ import_react3.default.createElement("path", { d: SIL.collar, fill: "none", stroke: "#fff", strokeOpacity: ".5", strokeWidth: "2.5", strokeLinecap: "round" }), /* @__PURE__ */ import_react3.default.createElement("path", { className: "sil-rim", d: st.short ? SIL.rimShort : SIL.rimLong }), /* @__PURE__ */ import_react3.default.createElement("path", { className: "sil-rim", d: bodyPath })), /* @__PURE__ */ import_react3.default.createElement("div", { className: "fg-silhouette-name" }, name2));
}
function MangaSymbol({ kind, life = 2.6 }) {
  const svg2 = SYMBOL_SVG[kind];
  if (!svg2) return null;
  return /* @__PURE__ */ import_react3.default.createElement("span", { className: "fg-symbol", "data-kind": kind, style: { "--life": life + "s" } }, /* @__PURE__ */ import_react3.default.createElement("span", { className: "fg-symbol-art", dangerouslySetInnerHTML: { __html: svg2 } }));
}
function spriteFor(person, emo) {
  const s = person && person.sprites || {};
  return s[emo] || s.neutral || Object.values(s).find(Boolean) || "";
}
function Actor({ entry, person, beat, emo }) {
  const speaking = beat.speaker === entry.name;
  const sprite = spriteFor(person, emo);
  const src = sprite ? assetUrl(sprite) : "";
  const color = person && person.color || "#9b7bff";
  const [shown, setShown] = import_react3.default.useState(src);
  const [swap, setSwap] = import_react3.default.useState(false);
  import_react3.default.useEffect(() => {
    if (src === shown) return void 0;
    if (!src) {
      setShown("");
      return void 0;
    }
    const img = new Image();
    img.onload = () => {
      setShown(src);
      setSwap(true);
    };
    img.src = src;
    const t = setTimeout(() => setSwap(false), 300);
    return () => clearTimeout(t);
  }, [src]);
  const uploaded = person && person.uploaded;
  return /* @__PURE__ */ import_react3.default.createElement("div", { className: `fg-actor${speaking ? " is-speaking" : ""}${uploaded ? " is-upload" : ""}`, style: { "--x": actorX(entry.pos) + "%" }, "data-name": entry.name }, /* @__PURE__ */ import_react3.default.createElement("div", { className: "fg-actor-body" }, shown ? /* @__PURE__ */ import_react3.default.createElement("img", { src: shown, alt: entry.name, className: swap ? "is-swap" : "", draggable: "false" }) : /* @__PURE__ */ import_react3.default.createElement(Silhouette, { name: entry.name, color, appearance: person && person.appearance, gender: person && person.gender })), speaking && beat.sym && /* @__PURE__ */ import_react3.default.createElement("div", { className: "fg-symbol-anchor" }, /* @__PURE__ */ import_react3.default.createElement(MangaSymbol, { key: beat.key, kind: beat.sym })));
}
function Cast({ beat, view }) {
  const people = new Map((view && view.cast || []).map((p) => [p.name, p]));
  let cast = beat.cast || [];
  if (!cast.length && beat.speaker && beat.speaker !== "我" && people.has(beat.speaker)) cast = [{ name: beat.speaker, pos: "center" }];
  const hideForCg = Boolean(beat.cg && cgSrc(beat.cg, assetUrl));
  if (hideForCg) return null;
  return /* @__PURE__ */ import_react3.default.createElement("div", { className: "fg-cast" }, cast.map((entry) => /* @__PURE__ */ import_react3.default.createElement(Actor, { key: entry.name, entry, person: people.get(entry.name), beat, emo: beat.emotions[entry.name] || "neutral" })));
}
function CgLayer({ beat }) {
  const img = beat.cg;
  const src = cgSrc(img, assetUrl);
  if (!img) return null;
  if (!src) {
    if (img.status === "failed" || img.status === "cancelled") return null;
    return /* @__PURE__ */ import_react3.default.createElement("div", { className: "fg-cg-wait" }, /* @__PURE__ */ import_react3.default.createElement("i", null), "插画绘制中", img.title ? `「${img.title}」` : "");
  }
  return /* @__PURE__ */ import_react3.default.createElement("div", { className: "fg-cg", key: img.id + ":" + img.current }, /* @__PURE__ */ import_react3.default.createElement("div", { className: "fg-cg-img", style: { backgroundImage: `url("${src}")` } }), img.title && /* @__PURE__ */ import_react3.default.createElement("div", { className: "fg-cg-caption" }, /* @__PURE__ */ import_react3.default.createElement("i", null), /* @__PURE__ */ import_react3.default.createElement("span", null, "CG"), /* @__PURE__ */ import_react3.default.createElement("b", null, img.title)));
}
function TitleCard({ beat }) {
  if (!beat.sceneEnter || !beat.scene.location) return null;
  return /* @__PURE__ */ import_react3.default.createElement("div", { className: "fg-titlecard", key: beat.key }, /* @__PURE__ */ import_react3.default.createElement("div", { className: "fg-titlecard-line" }), /* @__PURE__ */ import_react3.default.createElement("div", { className: "fg-titlecard-name" }, beat.scene.location), /* @__PURE__ */ import_react3.default.createElement("div", { className: "fg-titlecard-sub" }, [TIME_LABEL[beat.scene.time], WEATHER_LABEL[beat.scene.weather]].filter(Boolean).join(" · "), " — Turn ", beat.turn), /* @__PURE__ */ import_react3.default.createElement("div", { className: "fg-titlecard-line", style: { width: "14cqw", marginTop: "1cqw" } }));
}
function useCamera(beat) {
  const [cam, setCam] = import_react3.default.useState("");
  import_react3.default.useEffect(() => {
    setCam("");
    if (!beat || !beat.cam) return void 0;
    const raf = requestAnimationFrame(() => setCam(beat.cam));
    return () => cancelAnimationFrame(raf);
  }, [beat && beat.key]);
  return cam;
}
function Flash({ beat }) {
  if (!beat) return null;
  const kind = beat.cam === "flash" ? "" : beat.cam === "redflash" ? "is-red" : beat.cam === "fadeblack" ? "is-black" : null;
  const tr = beat.transition === "flash" ? "" : beat.transition === "black" ? "is-black" : null;
  const cls = kind ?? tr;
  if (cls === null) return null;
  return /* @__PURE__ */ import_react3.default.createElement("div", { key: beat.key, className: `fg-flash ${cls}` });
}

// src/client/theater/Dialog.jsx
var import_react4 = __toESM(require("react"), 1);

// src/client/theater/audio.js
var bgm = null;
var preview = null;
var ctx = null;
function audioCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === "suspended") ctx.resume().catch(() => {
  });
  return ctx;
}
function fade(el, to, ms, done) {
  const from = el.volume;
  const start = performance.now();
  const tick = (now) => {
    const k = Math.min(1, (now - start) / ms);
    el.volume = Math.max(0, Math.min(1, from + (to - from) * k));
    if (k < 1) requestAnimationFrame(tick);
    else if (done) done();
  };
  requestAnimationFrame(tick);
}
function playBgm(track, volume = 0.45) {
  if (!track) {
    stopBgm();
    return;
  }
  const audible = preview ? 0 : volume;
  if (bgm && bgm.id === track.id) {
    bgm.volume = volume;
    bgm.el.volume = Math.min(bgm.el.volume, audible);
    fade(bgm.el, audible, 400);
    return;
  }
  const old = bgm;
  const el = new Audio();
  el.src = track.url;
  el.loop = true;
  el.volume = 0;
  el.play().then(() => fade(el, preview ? 0 : volume, 1800)).catch(() => {
  });
  bgm = { el, id: track.id, volume };
  if (old) fade(old.el, 0, 1400, () => {
    old.el.pause();
    old.el.src = "";
  });
}
function stopBgm() {
  if (!bgm) return;
  const old = bgm;
  bgm = null;
  fade(old.el, 0, 900, () => {
    old.el.pause();
    old.el.src = "";
  });
}
function previewTrack(track, onEnd) {
  stopPreview();
  if (!track) return;
  const el = new Audio(track.url);
  el.volume = bgm ? bgm.volume : 0.6;
  preview = { el, id: track.id, onEnd };
  el.onended = () => {
    if (preview && preview.el === el) stopPreview();
  };
  if (bgm) fade(bgm.el, 0, 500);
  el.play().catch(() => {
    if (preview && preview.el === el) stopPreview();
  });
}
function stopPreview() {
  if (!preview) return;
  const p = preview;
  preview = null;
  p.el.pause();
  p.el.src = "";
  if (bgm) fade(bgm.el, bgm.volume, 800);
  if (p.onEnd) p.onEnd();
}
function blip(seed = "", type = "dialogue") {
  const ac = audioCtx();
  if (!ac) return;
  let h = 0;
  for (const ch of String(seed)) h = h * 31 + ch.codePointAt(0) >>> 0;
  const base = type === "narration" ? 300 : 420 + h % 7 * 38;
  const t = ac.currentTime;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type === "thought" ? "sine" : "triangle";
  osc.frequency.setValueAtTime(base * (0.96 + Math.random() * 0.08), t);
  gain.gain.setValueAtTime(1e-4, t);
  gain.gain.exponentialRampToValueAtTime(0.045, t + 4e-3);
  gain.gain.exponentialRampToValueAtTime(1e-4, t + 0.05);
  osc.connect(gain).connect(ac.destination);
  osc.start(t);
  osc.stop(t + 0.06);
}
function sfx(kind = "select") {
  const ac = audioCtx();
  if (!ac) return;
  const t = ac.currentTime;
  const notes = { hover: [880], select: [660, 990], page: [520], open: [440, 660, 880], back: [660, 440] }[kind] || [660];
  notes.forEach((f, i) => {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(f, t + i * 0.06);
    gain.gain.setValueAtTime(1e-4, t + i * 0.06);
    gain.gain.exponentialRampToValueAtTime(kind === "hover" ? 0.018 : 0.05, t + i * 0.06 + 0.01);
    gain.gain.exponentialRampToValueAtTime(1e-4, t + i * 0.06 + 0.18);
    osc.connect(gain).connect(ac.destination);
    osc.start(t + i * 0.06);
    osc.stop(t + i * 0.06 + 0.2);
  });
}

// src/client/theater/Dialog.jsx
var CARD_HEAD = { sms: "新消息", letter: "", note: "", news: "号外", terminal: "> SYSTEM", notice: "告示", diary: "", scroll: "" };
function useTypewriter(beat, speed, { sound = true, hold = false } = {}) {
  const key = beat ? beat.key : "";
  const chars = import_react4.default.useMemo(() => Array.from(beat && beat.text || ""), [key, beat && beat.text]);
  const [shown, setShown] = import_react4.default.useState({ key, done: false });
  if (shown.key !== key) setShown({ key, done: false });
  const done = !speed || !chars.length || shown.key === key && shown.done;
  import_react4.default.useEffect(() => {
    if (!speed || !chars.length || hold) return void 0;
    const finish = setTimeout(() => setShown({ key, done: true }), chars.length * speed + 220);
    let i = 0;
    const tick = sound ? setInterval(() => {
      i += 2;
      if (i >= chars.length) {
        clearInterval(tick);
        return;
      }
      if (!/[\s，。、…！？,.!?]/.test(chars[i])) blip(beat.speaker, beat.type);
    }, speed * 2) : null;
    return () => {
      clearTimeout(finish);
      if (tick) clearInterval(tick);
    };
  }, [key, chars, speed, sound, hold]);
  return [done, chars, () => setShown({ key, done: true })];
}
function DialogBox({ beat, chars, done, waiting, color, quick, progress, status, hiddenText }) {
  const speaker = beat.alias || beat.speaker;
  const showName = speaker && beat.type !== "narration";
  const speed = quick.speed;
  return /* @__PURE__ */ import_react4.default.createElement("div", { className: "fg-dialog", style: { "--speaker": color || void 0 } }, /* @__PURE__ */ import_react4.default.createElement("div", { className: "fg-box" }), showName && /* @__PURE__ */ import_react4.default.createElement("div", { className: "fg-name", key: beat.speaker + beat.alias }, /* @__PURE__ */ import_react4.default.createElement("div", { className: "fg-name-plate" }, speaker), beat.emo && quick.emoLabel && /* @__PURE__ */ import_react4.default.createElement("div", { className: "fg-name-sub" }, quick.emoLabel)), hiddenText && /* @__PURE__ */ import_react4.default.createElement("div", { className: "fg-text is-cardhint" }, "〔 ", CARD_LABEL[beat.card] || "卡片", " 〕"), !hiddenText && /* @__PURE__ */ import_react4.default.createElement("div", { className: `fg-text is-${beat.type}${done ? " is-done" : waiting ? " is-wait" : ""}`, key: beat.key, "aria-live": "polite" }, chars.map((ch, i) => /* @__PURE__ */ import_react4.default.createElement("span", { key: i, className: "fg-char", style: { "--d": i * speed + "ms" } }, ch))), done && /* @__PURE__ */ import_react4.default.createElement("div", { className: "fg-wait", "aria-hidden": "true" }), status && /* @__PURE__ */ import_react4.default.createElement("div", { className: "fg-status" }, status), /* @__PURE__ */ import_react4.default.createElement("div", { className: "fg-progress" }, /* @__PURE__ */ import_react4.default.createElement("i", { style: { width: Math.round(progress * 100) + "%" } })), /* @__PURE__ */ import_react4.default.createElement("div", { className: "fg-quick", onClick: (e) => e.stopPropagation() }, quick.items.map((item) => /* @__PURE__ */ import_react4.default.createElement("button", { key: item.id, type: "button", className: item.on ? "is-on" : "", title: item.title, onClick: () => {
    sfx("select");
    item.run();
  }, onMouseEnter: () => sfx("hover") }, item.label))));
}
function SceneCard({ beat }) {
  const kind = beat.card;
  return /* @__PURE__ */ import_react4.default.createElement("div", { className: "fg-card", "data-card": kind, key: beat.key }, CARD_HEAD[kind] ? /* @__PURE__ */ import_react4.default.createElement("div", { className: "fg-card-head" }, CARD_HEAD[kind], kind === "sms" && beat.speaker ? ` · ${beat.alias || beat.speaker}` : "") : null, /* @__PURE__ */ import_react4.default.createElement("div", { className: "fg-card-body" }, beat.text));
}
function Choices({ choices, onChoose, onBack, waiting }) {
  const [free, setFree] = import_react4.default.useState("");
  const list = choices || [];
  return /* @__PURE__ */ import_react4.default.createElement("div", { className: "fg-choices", onClick: (e) => e.stopPropagation() }, /* @__PURE__ */ import_react4.default.createElement("div", { className: "fg-choices-title" }, list.length ? "CHOICE" : waiting ? "TO BE CONTINUED" : "YOUR TURN"), list.map((text, i) => /* @__PURE__ */ import_react4.default.createElement("button", { key: text, type: "button", className: "fg-choice", "data-n": String(i + 1).padStart(2, "0"), style: { "--i": i }, onMouseEnter: () => sfx("hover"), onClick: () => {
    sfx("select");
    onChoose(text);
  } }, text)), /* @__PURE__ */ import_react4.default.createElement("form", { className: "fg-free", style: { "--i": list.length }, onSubmit: (e) => {
    e.preventDefault();
    if (free.trim()) {
      sfx("select");
      onChoose(free.trim());
    }
  } }, /* @__PURE__ */ import_react4.default.createElement("input", { value: free, onChange: (e) => setFree(e.target.value), placeholder: list.length ? "或者，自己写下一步……" : "写下你的下一步……", onKeyDown: (e) => e.stopPropagation() }), /* @__PURE__ */ import_react4.default.createElement("button", { type: "submit" }, "GO")), /* @__PURE__ */ import_react4.default.createElement("button", { type: "button", className: "fg-btn", style: { marginTop: "1cqw" }, onClick: onBack }, "回到聊天"));
}

// src/client/theater/Panels.jsx
var import_react5 = __toESM(require("react"), 1);

// src/client/theater/skins.js
var FONT_PACKS = {
  sans: { pkg: "@fontsource/noto-sans-sc@5.3.0", css: ["400.css"] },
  // 思源黑体（Noto Sans SC）
  serif: { pkg: "@fontsource/noto-serif-sc@5.3.0", css: ["400.css", "700.css"] },
  // 思源宋体（Noto Serif SC）
  wenkai: { pkg: "lxgw-wenkai-webfont@1.7.0", css: ["lxgwwenkai-regular.css"] },
  // 霞鹜文楷
  brush: { pkg: "@fontsource/ma-shan-zheng@5.3.1", css: ["400.css"] },
  // 马善政毛笔楷书
  mono: { pkg: "@fontsource/jetbrains-mono@5.3.0", css: ["400.css"] },
  latin: { pkg: "@fontsource/cormorant-garamond@5.3.0", css: ["400.css", "600.css"] }
};
var SKINS = [
  { id: "stellar", name: "星穹", desc: "深空玻璃 · 霓虹渐变", swatch: "linear-gradient(120deg, #120c2c, #ff7eb6 55%, #5ee7ff)", fonts: ["sans", "serif", "latin"] },
  { id: "sakura", name: "樱色", desc: "浅色毛玻璃 · 文楷", swatch: "linear-gradient(120deg, #fff4f8, #ffb3cf 55%, #c7b8ff)", fonts: ["wenkai", "latin"] },
  { id: "ink", name: "水墨", desc: "宣纸 · 朱印 · 毛笔", swatch: "linear-gradient(120deg, #f3ead6, #3a3530 60%, #b3261e)", fonts: ["wenkai", "brush", "latin"] },
  { id: "noir", name: "夜金", desc: "黑金 · 电影字幕", swatch: "linear-gradient(120deg, #070707, #2a2318 50%, #d8b26a)", fonts: ["serif", "latin"] },
  { id: "cyber", name: "赛博", desc: "扫描线 · 终端", swatch: "linear-gradient(120deg, #031014, #00f0ff 50%, #ff2bd6)", fonts: ["sans", "mono"] }
];
var sheets = /* @__PURE__ */ new Map();
function loadSkinFonts(skinId, base) {
  const skin = SKINS.find((s) => s.id === skinId) || SKINS[0];
  if (!base) return Promise.resolve();
  const root = base.replace(/\/?$/, "/");
  const pending = skin.fonts.flatMap((key) => FONT_PACKS[key].css.map((file) => {
    const href = `${root}${FONT_PACKS[key].pkg}/${file}`;
    if (!sheets.has(href)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = href;
      link.dataset.flowgal = "font";
      sheets.set(href, new Promise((resolve) => {
        link.onload = resolve;
        link.onerror = resolve;
      }));
      document.head.appendChild(link);
    }
    return sheets.get(href);
  }));
  return Promise.all(pending);
}
function loadGlyphs(el, { body = "", display = "" }, limit = 0) {
  if (!el || typeof document === "undefined" || !document.fonts) return Promise.resolve();
  const style = getComputedStyle(el);
  const jobs = [["--font-body", body], ["--font-display", display]].map(([name2, text]) => {
    const family = style.getPropertyValue(name2).trim();
    return family && text ? document.fonts.load(`${name2 === "--font-display" ? 700 : 400} 16px ${family}`, text).catch(() => {
    }) : null;
  }).filter(Boolean);
  const all = Promise.all(jobs);
  return limit > 0 ? Promise.race([all, new Promise((resolve) => setTimeout(resolve, limit))]) : all;
}

// lib/music-sidecar.js
var MUSIC_SIDECAR = "flowgal-music.json";
var FORMAT = "flowgal-music";
var AUDIO_FILE = /\.(mp3|ogg|oga|opus|wav|flac|m4a|aac)$/i;
function readSidecar(text) {
  const data = JSON.parse(text);
  if (!data || data.format !== FORMAT || !Array.isArray(data.tracks)) throw new Error(`${MUSIC_SIDECAR} 不是 FlowGal 的配乐描述文件`);
  const out = /* @__PURE__ */ new Map();
  for (const t of data.tracks) {
    if (!t || typeof t.file !== "string" || !t.file) continue;
    out.set(t.file, { name: t.name, description: t.description, tags: t.tags });
  }
  return out;
}
function writeSidecar(tracks, note = "") {
  return JSON.stringify({
    format: FORMAT,
    version: 1,
    ...note ? { note } : {},
    tracks: (tracks || []).filter((t) => t.file).map((t) => ({ file: t.file, name: t.name, description: t.description || "", tags: t.tags || [] }))
  }, null, 2) + "\n";
}

// lib/cast.js
var NAME_COLORS = ["#f2739b", "#7aa2ff", "#ffb35c", "#5fd3b3", "#c58bff", "#ff7a6b", "#59c3ff", "#e5c34f", "#9be36b", "#ff8ad8"];
function nameColor(name2) {
  let h = 2166136261;
  for (const ch of String(name2)) h = Math.imul(h ^ ch.codePointAt(0), 16777619) >>> 0;
  return NAME_COLORS[h % NAME_COLORS.length];
}

// lib/image/style.js
var DEFAULT_QUALITY = {
  "nai-diffusion-4-5-full": "very aesthetic, masterpiece, no text",
  "nai-diffusion-4-5-curated": "very aesthetic, masterpiece, no text, rating:general",
  "nai-diffusion-4-full": "no text, best quality, very aesthetic, absurdres",
  "nai-diffusion-4-curated-preview": "rating:general, best quality, very aesthetic, absurdres",
  "nai-diffusion-3": "best quality, amazing quality, very aesthetic, absurdres",
  "nai-diffusion-furry-3": "best quality, amazing quality, very aesthetic, absurdres",
  sd: "masterpiece, best quality, amazing quality, very aesthetic, absurdres, newest",
  openai: ""
};
var DEFAULT_NEGATIVE = {
  "nai-diffusion-4-5-full": "blurry, lowres, error, film grain, scan artifacts, worst quality, bad quality, jpeg artifacts, very displeasing, chromatic aberration, multiple views, logo, too many watermarks, white blank page, blank page",
  "nai-diffusion-4-5-curated": "blurry, lowres, upscaled, artistic error, film grain, scan artifacts, worst quality, bad quality, jpeg artifacts, very displeasing, chromatic aberration, halftone, multiple views, logo, too many watermarks, negative space, blank page",
  "nai-diffusion-4-full": "blurry, lowres, error, film grain, scan artifacts, worst quality, bad quality, jpeg artifacts, very displeasing, chromatic aberration, logo, dated, signature, multiple views, gigantic breasts",
  "nai-diffusion-4-curated-preview": "blurry, lowres, error, film grain, scan artifacts, worst quality, bad quality, jpeg artifacts, very displeasing, chromatic aberration, logo, dated, signature, multiple views",
  "nai-diffusion-3": "lowres, bad anatomy, bad hands, text, error, missing fingers, extra digit, fewer digits, cropped, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark, username, blurry",
  "nai-diffusion-furry-3": "lowres, bad anatomy, bad hands, text, error, missing fingers, worst quality, low quality, jpeg artifacts, signature, watermark, blurry",
  sd: "lowres, worst quality, bad quality, bad anatomy, bad hands, extra digits, fewer digits, jpeg artifacts, signature, watermark, username, text, blurry, multiple views",
  openai: "text, watermark, logo, extra fingers, deformed hands"
};
function modelKey(backend, config) {
  if (backend === "novelai") return config?.novelai?.model || "nai-diffusion-4-5-full";
  if (backend === "openai") return "openai";
  return "sd";
}
function presetKey(key) {
  if (key in DEFAULT_QUALITY) return key;
  return key !== "sd" && key !== "openai" ? "nai-diffusion-4-5-full" : "sd";
}
function qualityFor(style, key) {
  const custom = style?.quality?.[key];
  return typeof custom === "string" ? custom : DEFAULT_QUALITY[presetKey(key)];
}
function negativeFor(style, key) {
  const custom = style?.negative?.[key];
  return typeof custom === "string" ? custom : DEFAULT_NEGATIVE[presetKey(key)];
}

// lib/image/nai-models.js
var NAI_MODELS = {
  "nai-diffusion-5-full": { label: "V5 Full", scale: 5, v4: true, v5: true },
  "nai-diffusion-5-curated": { label: "V5 Curated", scale: 5, v4: true, v5: true },
  "nai-diffusion-4-5-full": { label: "V4.5 Full", scale: 5, v4: true },
  "nai-diffusion-4-5-curated": { label: "V4.5 Curated", scale: 5, v4: true },
  "nai-diffusion-4-full": { label: "V4 Full", scale: 5.5, v4: true },
  "nai-diffusion-4-curated-preview": { label: "V4 Curated", scale: 5.5, v4: true },
  "nai-diffusion-3": { label: "Anime V3", scale: 5, v4: false },
  "nai-diffusion-furry-3": { label: "Furry V3", scale: 5, v4: false }
};
var MODEL_ID = /^[a-z0-9][a-z0-9._-]{1,63}$/i;
function naiModelInfo(model) {
  const id = String(model || "").trim();
  if (NAI_MODELS[id]) return { id, ...NAI_MODELS[id] };
  if (!MODEL_ID.test(id)) return null;
  const version = Number((id.match(/^nai-diffusion(?:-furry)?-(\d+)/i) || [])[1]);
  const legacy = /^nai-diffusion(-furry)?$/i.test(id) || version > 0 && version < 4;
  return { id, label: id, scale: 5, v4: !legacy, v5: version >= 5 };
}

// src/client/theater/Panels.jsx
var STATUS_LABEL = { queued: "排队中", running: "绘制中", failed: "失败", cancelled: "已取消", ready: "" };
function Panel({ title, en, onClose, tabs, tab, onTab, children, actions }) {
  return /* @__PURE__ */ import_react5.default.createElement("div", { className: "fg-panel", onClick: (e) => e.stopPropagation(), onKeyDown: (e) => e.stopPropagation() }, /* @__PURE__ */ import_react5.default.createElement("div", { className: "fg-panel-head" }, /* @__PURE__ */ import_react5.default.createElement("div", { className: "fg-panel-title" }, title), /* @__PURE__ */ import_react5.default.createElement("div", { className: "fg-panel-en" }, en), /* @__PURE__ */ import_react5.default.createElement("div", { className: "fg-spacer" }), actions, /* @__PURE__ */ import_react5.default.createElement("button", { type: "button", className: "fg-iconbtn", title: "返回", onClick: onClose }, "✕")), tabs && /* @__PURE__ */ import_react5.default.createElement("div", { className: "fg-tabs" }, tabs.map((t) => /* @__PURE__ */ import_react5.default.createElement("button", { key: t.id, type: "button", className: `fg-tab${tab === t.id ? " is-on" : ""}`, onClick: () => onTab(t.id) }, t.label))), /* @__PURE__ */ import_react5.default.createElement("div", { className: "fg-panel-body" }, children));
}
function useBusy() {
  const [busy, setBusy] = import_react5.default.useState("");
  const run = async (id, fn, ok) => {
    setBusy(id);
    try {
      const r = await fn();
      if (ok) toast(ok);
      return r;
    } catch (e) {
      toast(String(e && e.message || e), "error");
    } finally {
      setBusy("");
    }
  };
  return [busy, run];
}
function Backlog({ beats, index, onJump, onClose, gameId }) {
  const [busy, run] = useBusy();
  const ref = import_react5.default.useRef(null);
  import_react5.default.useEffect(() => {
    const box = ref.current && ref.current.closest(".fg-panel-body");
    const el = ref.current && ref.current.querySelector(".is-current");
    if (box && el) box.scrollTop = el.offsetTop - box.clientHeight / 2;
  }, []);
  let lastTurn = null;
  return /* @__PURE__ */ import_react5.default.createElement(Panel, { title: "回想", en: "Backlog", onClose }, /* @__PURE__ */ import_react5.default.createElement("div", { ref }, beats.map((b, i) => {
    const head = b.turn !== lastTurn;
    lastTurn = b.turn;
    return /* @__PURE__ */ import_react5.default.createElement(import_react5.default.Fragment, { key: b.key }, head && /* @__PURE__ */ import_react5.default.createElement("div", { className: "fg-log-turn fg-row" }, /* @__PURE__ */ import_react5.default.createElement("span", null, "TURN ", b.turn, " · ", b.scene.location || "—", " · ", TIME_LABEL[b.scene.time] || ""), /* @__PURE__ */ import_react5.default.createElement("span", { style: { flex: 1 } }), b.status === "directing" && /* @__PURE__ */ import_react5.default.createElement("span", { className: "fg-pill is-busy" }, "导演整理中"), b.status === "failed" && /* @__PURE__ */ import_react5.default.createElement("span", { className: "fg-pill fg-err", title: b.error }, "整理失败"), /* @__PURE__ */ import_react5.default.createElement("button", { type: "button", className: "fg-btn", disabled: busy === "r" + b.turn, onClick: (e) => {
      e.stopPropagation();
      run("r" + b.turn, () => api.replan(gameId, b.turn), "已重新整理这一轮");
    } }, "重新整理")), /* @__PURE__ */ import_react5.default.createElement("div", { className: `fg-log-item${i === index ? " is-current" : ""}`, onClick: () => onJump(i), style: i === index ? { background: "rgba(255,255,255,.06)" } : null }, /* @__PURE__ */ import_react5.default.createElement("div", { className: "fg-log-name" }, b.type === "narration" ? "" : b.alias || b.speaker), /* @__PURE__ */ import_react5.default.createElement("div", { style: b.type === "thought" ? { fontStyle: "italic", opacity: 0.8 } : null }, b.type === "dialogue" ? `「${b.text}」` : b.type === "thought" ? `（${b.text}）` : b.text)));
  }), !beats.length && /* @__PURE__ */ import_react5.default.createElement("div", { className: "fg-note" }, "还没有可以回想的内容。")));
}
function ImageEditor({ gameId, image, onClose }) {
  const [draft, setDraft] = import_react5.default.useState({ tags: image.tags || "", desc: image.desc || "", negativeExtra: image.negativeExtra || "", shape: image.shape || "landscape", seed: "" });
  const [instruction, setInstruction] = import_react5.default.useState("");
  const [busy, run] = useBusy();
  const set = (patch) => setDraft((d) => ({ ...d, ...patch }));
  const version = image.versions[image.current];
  return /* @__PURE__ */ import_react5.default.createElement("div", { className: "fg-person", style: { gridTemplateColumns: "1fr" } }, /* @__PURE__ */ import_react5.default.createElement("div", { className: "fg-section", style: { marginTop: 0 } }, "改提示词 · ", image.title || image.id), /* @__PURE__ */ import_react5.default.createElement("div", { className: "fg-field" }, /* @__PURE__ */ import_react5.default.createElement("label", null, "画面 Tag"), /* @__PURE__ */ import_react5.default.createElement("textarea", { className: "fg-textarea", value: draft.tags, onChange: (e) => set({ tags: e.target.value }) })), /* @__PURE__ */ import_react5.default.createElement("small", { className: "fg-note", style: { display: "block", margin: "-0.4cqw 0 0 15.2cqw" } }, "人物写 @名字，出图前自动换成外貌档案（柏宝绘的 @ 外貌库）。"), /* @__PURE__ */ import_react5.default.createElement("div", { className: "fg-field" }, /* @__PURE__ */ import_react5.default.createElement("label", null, "画面说明"), /* @__PURE__ */ import_react5.default.createElement("textarea", { className: "fg-textarea", style: { minHeight: "4cqw" }, value: draft.desc, onChange: (e) => set({ desc: e.target.value }) })), /* @__PURE__ */ import_react5.default.createElement("div", { className: "fg-field" }, /* @__PURE__ */ import_react5.default.createElement("label", null, "额外负面"), /* @__PURE__ */ import_react5.default.createElement("input", { className: "fg-input", value: draft.negativeExtra, onChange: (e) => set({ negativeExtra: e.target.value }) })), /* @__PURE__ */ import_react5.default.createElement("div", { className: "fg-field" }, /* @__PURE__ */ import_react5.default.createElement("label", null, "画幅 / 种子"), /* @__PURE__ */ import_react5.default.createElement("div", { className: "fg-row" }, /* @__PURE__ */ import_react5.default.createElement("select", { className: "fg-select", style: { width: "auto" }, value: draft.shape, onChange: (e) => set({ shape: e.target.value }) }, /* @__PURE__ */ import_react5.default.createElement("option", { value: "landscape" }, "横版"), /* @__PURE__ */ import_react5.default.createElement("option", { value: "portrait" }, "竖版"), /* @__PURE__ */ import_react5.default.createElement("option", { value: "square" }, "方形")), /* @__PURE__ */ import_react5.default.createElement("input", { className: "fg-input", style: { width: "14cqw" }, placeholder: "随机", value: draft.seed, onChange: (e) => set({ seed: e.target.value.replace(/\D/g, "") }) }), version && /* @__PURE__ */ import_react5.default.createElement("button", { type: "button", className: "fg-btn", onClick: () => set({ seed: String(version.seed ?? "") }) }, "沿用当前种子"))), /* @__PURE__ */ import_react5.default.createElement("div", { className: "fg-field" }, /* @__PURE__ */ import_react5.default.createElement("label", null, "AI 改写"), /* @__PURE__ */ import_react5.default.createElement("div", { className: "fg-row" }, /* @__PURE__ */ import_react5.default.createElement("input", { className: "fg-input", style: { flex: 1, width: "auto" }, placeholder: "例如：改成雨夜、她在哭、镜头拉远……留空则重读原文", value: instruction, onChange: (e) => setInstruction(e.target.value) }), /* @__PURE__ */ import_react5.default.createElement("button", { type: "button", className: "fg-btn", disabled: busy === "rw", onClick: () => run("rw", async () => {
    const r = await api.rewrite(gameId, image.id, instruction);
    set({ tags: r.draft.tags, desc: r.draft.desc, negativeExtra: r.draft.negativeExtra || draft.negativeExtra });
  }, "已改写，确认后点「按此重画」") }, busy === "rw" ? "改写中…" : "改写"))), version && /* @__PURE__ */ import_react5.default.createElement("details", { className: "fg-note", style: { margin: "0.6cqw 0" } }, /* @__PURE__ */ import_react5.default.createElement("summary", null, "当前版本实际发出的提示词"), /* @__PURE__ */ import_react5.default.createElement("div", { style: { userSelect: "text", marginTop: "0.4cqw" } }, "＋ ", version.positive, /* @__PURE__ */ import_react5.default.createElement("br", null), "－ ", version.negative, /* @__PURE__ */ import_react5.default.createElement("br", null), version.backend, " · ", version.model, " · seed ", version.seed)), /* @__PURE__ */ import_react5.default.createElement("div", { className: "fg-row", style: { justifyContent: "flex-end" } }, /* @__PURE__ */ import_react5.default.createElement("button", { type: "button", className: "fg-btn", onClick: onClose }, "取消"), /* @__PURE__ */ import_react5.default.createElement("button", { type: "button", className: "fg-btn is-primary", onClick: () => run("go", async () => {
    await api.render(gameId, image.id, { tags: draft.tags, desc: draft.desc, negativeExtra: draft.negativeExtra, shape: draft.shape, ...draft.seed ? { seed: Number(draft.seed) } : {} });
    onClose();
  }, "已加入出图队列") }, "按此重画")));
}
function Lightbox({ src, onClose, children }) {
  return /* @__PURE__ */ import_react5.default.createElement("div", { className: "fg-lightbox", onClick: onClose }, /* @__PURE__ */ import_react5.default.createElement("img", { src, alt: "", onClick: (e) => e.stopPropagation() }), /* @__PURE__ */ import_react5.default.createElement("div", { className: "fg-row", onClick: (e) => e.stopPropagation() }, children));
}
function CgTile({ gameId, image, onOpen, onEdit }) {
  const [busy, run] = useBusy();
  const src = cgSrc(image, assetUrl);
  const pending = image.status === "queued" || image.status === "running";
  return /* @__PURE__ */ import_react5.default.createElement("div", null, /* @__PURE__ */ import_react5.default.createElement("div", { className: `fg-thumb${src ? "" : " is-locked"}`, onClick: () => src && onOpen(image) }, src ? /* @__PURE__ */ import_react5.default.createElement("img", { src, alt: image.title, loading: "lazy" }) : /* @__PURE__ */ import_react5.default.createElement("span", null, pending ? "🎨 " + STATUS_LABEL[image.status] : image.status === "failed" ? "⚠ " + (image.error || "失败") : "未生成"), pending && src && /* @__PURE__ */ import_react5.default.createElement("span", { className: "fg-pill is-busy", style: { position: "absolute", right: ".6cqw", top: ".6cqw" } }, "重画中"), /* @__PURE__ */ import_react5.default.createElement("div", { className: "fg-thumb-cap" }, image.title || "第 " + image.turn + " 轮插画", image.versions.length > 1 ? ` · ${image.current + 1}/${image.versions.length}` : "")), /* @__PURE__ */ import_react5.default.createElement("div", { className: "fg-row", style: { marginTop: ".6cqw" } }, pending ? /* @__PURE__ */ import_react5.default.createElement("button", { type: "button", className: "fg-btn", onClick: () => run("c", () => api.cancel(gameId, "cg", image.id), "已取消") }, "取消") : /* @__PURE__ */ import_react5.default.createElement("button", { type: "button", className: "fg-btn", disabled: busy === "r", onClick: () => run("r", () => api.render(gameId, image.id, {}), "已加入出图队列") }, "重画"), /* @__PURE__ */ import_react5.default.createElement("button", { type: "button", className: "fg-btn", onClick: () => onEdit(image) }, "改词"), /* @__PURE__ */ import_react5.default.createElement("button", { type: "button", className: "fg-btn", onClick: () => {
    if (window.confirm("删除这张插画和它的所有版本？")) run("d", () => api.deleteImage(gameId, image.id), "已删除");
  } }, "删除")), image.status === "failed" && image.error && /* @__PURE__ */ import_react5.default.createElement("div", { className: "fg-note fg-err", style: { marginTop: ".4cqw" } }, image.error));
}
function Gallery({ view, gameId, onClose, focusId }) {
  const [tab, setTab] = import_react5.default.useState("cg");
  const [open, setOpen] = import_react5.default.useState(null);
  const [edit, setEdit] = import_react5.default.useState(() => focusId && view && view.images.find((i) => i.id === focusId) || null);
  const [busy, run] = useBusy();
  const images = view && view.images || [];
  const places = Object.values(view && view.places || {});
  const live = open && images.find((i) => i.id === open.id);
  return /* @__PURE__ */ import_react5.default.createElement(Panel, { title: "鉴赏", en: "Gallery", onClose, tabs: [{ id: "cg", label: `插画 CG · ${images.length}` }, { id: "bg", label: `背景 · ${places.length}` }], tab, onTab: setTab }, edit && /* @__PURE__ */ import_react5.default.createElement(ImageEditor, { key: edit.id, gameId, image: images.find((i) => i.id === edit.id) || edit, onClose: () => setEdit(null) }), tab === "cg" && /* @__PURE__ */ import_react5.default.createElement("div", { className: "fg-grid" }, images.map((img) => /* @__PURE__ */ import_react5.default.createElement(CgTile, { key: img.id, gameId, image: img, onOpen: setOpen, onEdit: setEdit })), !images.length && /* @__PURE__ */ import_react5.default.createElement("div", { className: "fg-note" }, "还没有插画。导演会在值得画的地方自动安排；也可以在聊天里点每条消息下方的「🎬 配一张」。")), tab === "bg" && /* @__PURE__ */ import_react5.default.createElement("div", { className: "fg-grid" }, places.map((p) => /* @__PURE__ */ import_react5.default.createElement("div", { key: p.key }, /* @__PURE__ */ import_react5.default.createElement("div", { className: `fg-thumb${p.assetId ? "" : " is-locked"}`, onClick: () => p.assetId && setOpen({ place: p }) }, p.assetId ? /* @__PURE__ */ import_react5.default.createElement("img", { src: assetUrl(p.assetId), alt: p.location, loading: "lazy" }) : /* @__PURE__ */ import_react5.default.createElement("span", null, STATUS_LABEL[p.status] || p.error || "未生成"), /* @__PURE__ */ import_react5.default.createElement("div", { className: "fg-thumb-cap" }, p.location, " · ", TIME_LABEL[p.time] || p.time)), /* @__PURE__ */ import_react5.default.createElement("div", { className: "fg-row", style: { marginTop: ".6cqw" } }, /* @__PURE__ */ import_react5.default.createElement("button", { type: "button", className: "fg-btn", disabled: busy === p.key, onClick: () => run(p.key, () => api.place(gameId, p.key), "已加入出图队列") }, "重画背景")), p.status === "failed" && /* @__PURE__ */ import_react5.default.createElement("div", { className: "fg-note fg-err" }, p.error))), !places.length && /* @__PURE__ */ import_react5.default.createElement("div", { className: "fg-note" }, "新地点出现时会自动生成背景（设置里可关）；没有生成时用程序化天空（按时段、天气变化）。")), live && cgSrc(live, assetUrl) && /* @__PURE__ */ import_react5.default.createElement(Lightbox, { src: cgSrc(live, assetUrl), onClose: () => setOpen(null) }, /* @__PURE__ */ import_react5.default.createElement("button", { type: "button", className: "fg-btn", disabled: live.current <= 0, onClick: () => run("v", () => api.version(gameId, live.id, live.current - 1)) }, "‹ 上一版"), /* @__PURE__ */ import_react5.default.createElement("span", { className: "fg-pill" }, live.current + 1, " / ", live.versions.length), /* @__PURE__ */ import_react5.default.createElement("button", { type: "button", className: "fg-btn", disabled: live.current >= live.versions.length - 1, onClick: () => run("v", () => api.version(gameId, live.id, live.current + 1)) }, "下一版 ›"), /* @__PURE__ */ import_react5.default.createElement("button", { type: "button", className: "fg-btn", onClick: () => {
    setOpen(null);
    setEdit(live);
  } }, "改词重画"), /* @__PURE__ */ import_react5.default.createElement("a", { className: "fg-btn", href: cgSrc(live, assetUrl), download: `${live.title || live.id}.png` }, "下载")), open && open.place && /* @__PURE__ */ import_react5.default.createElement(Lightbox, { src: assetUrl(open.place.assetId), onClose: () => setOpen(null) }, /* @__PURE__ */ import_react5.default.createElement("span", { className: "fg-pill" }, open.place.location)));
}
var EMO_KEYS = Object.keys(EMOTION_LABEL);
function readFile(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}
function PersonCard({ gameId, person }) {
  const [appearance, setAppearance] = import_react5.default.useState(person.appearance || "");
  const [gender, setGender] = import_react5.default.useState(person.gender || "");
  const [uploadEmo, setUploadEmo] = import_react5.default.useState("neutral");
  const [busy, run] = useBusy();
  const fileRef = import_react5.default.useRef(null);
  import_react5.default.useEffect(() => {
    setAppearance(person.appearance || "");
    setGender(person.gender || "");
  }, [person.appearance, person.gender]);
  const main = person.sprites && (person.sprites.neutral || Object.values(person.sprites).find(Boolean));
  const dirty = appearance !== (person.appearance || "") || gender !== (person.gender || "");
  const save = () => run("save", () => api.cast(gameId, person.global ? "global-save" : "save", { name: person.name, patch: { appearance, gender } }), "档案已保存");
  return /* @__PURE__ */ import_react5.default.createElement("div", { className: "fg-person", style: { "--c": person.color } }, /* @__PURE__ */ import_react5.default.createElement("div", { className: "fg-person-art" }, main ? /* @__PURE__ */ import_react5.default.createElement("img", { src: assetUrl(main), alt: person.name }) : /* @__PURE__ */ import_react5.default.createElement(Silhouette, { name: person.name, color: person.color, appearance: person.appearance, gender: person.gender })), /* @__PURE__ */ import_react5.default.createElement("div", null, /* @__PURE__ */ import_react5.default.createElement("h3", null, /* @__PURE__ */ import_react5.default.createElement("span", { style: { color: person.color } }, person.name), person.global ? /* @__PURE__ */ import_react5.default.createElement("small", null, "全局 · 冻结") : /* @__PURE__ */ import_react5.default.createElement("small", null, "本局", person.createdTurn != null ? ` · 第 ${person.createdTurn} 轮登场` : ""), person.temp && /* @__PURE__ */ import_react5.default.createElement("small", { title: "临时状态，不写进档案" }, "临时：", person.temp)), /* @__PURE__ */ import_react5.default.createElement("div", { className: "fg-field", style: { gridTemplateColumns: "8cqw 1fr" } }, /* @__PURE__ */ import_react5.default.createElement("label", null, "外貌"), /* @__PURE__ */ import_react5.default.createElement("textarea", { className: "fg-textarea", value: appearance, onChange: (e) => setAppearance(e.target.value), placeholder: "1girl, long black hair, blue eyes, school uniform" })), /* @__PURE__ */ import_react5.default.createElement("div", { className: "fg-field", style: { gridTemplateColumns: "8cqw 1fr" } }, /* @__PURE__ */ import_react5.default.createElement("label", null, "性别"), /* @__PURE__ */ import_react5.default.createElement("div", { className: "fg-row" }, /* @__PURE__ */ import_react5.default.createElement("select", { className: "fg-select", style: { width: "auto" }, value: gender, onChange: (e) => setGender(e.target.value) }, /* @__PURE__ */ import_react5.default.createElement("option", { value: "" }, "未知"), /* @__PURE__ */ import_react5.default.createElement("option", { value: "female" }, "女"), /* @__PURE__ */ import_react5.default.createElement("option", { value: "male" }, "男"), /* @__PURE__ */ import_react5.default.createElement("option", { value: "other" }, "其他")), /* @__PURE__ */ import_react5.default.createElement("button", { type: "button", className: "fg-btn is-primary", disabled: !dirty || busy === "save", onClick: save }, "保存档案"))), /* @__PURE__ */ import_react5.default.createElement("div", { className: "fg-emos" }, EMO_KEYS.map((emo) => {
    const id = person.sprites && person.sprites[emo];
    const st = person.spriteStatus && person.spriteStatus[emo];
    return /* @__PURE__ */ import_react5.default.createElement(
      "button",
      {
        key: emo,
        type: "button",
        className: `fg-emo${st && (st.status === "queued" || st.status === "running") ? " is-busy" : ""}`,
        title: st && st.error ? st.error : id ? "点击重画" : "点击生成这个表情",
        onClick: () => run("e" + emo, () => api.cast(gameId, "sprite", { name: person.name, emotion: emo }), `已排队：${person.name}·${EMOTION_LABEL[emo]}`)
      },
      id && /* @__PURE__ */ import_react5.default.createElement("img", { src: assetUrl(id), alt: "", loading: "lazy" }),
      /* @__PURE__ */ import_react5.default.createElement("span", null, EMOTION_LABEL[emo], st && st.status === "failed" ? " ⚠" : "")
    );
  })), /* @__PURE__ */ import_react5.default.createElement("div", { className: "fg-row" }, /* @__PURE__ */ import_react5.default.createElement("select", { className: "fg-select", style: { width: "auto" }, value: uploadEmo, onChange: (e) => setUploadEmo(e.target.value) }, EMO_KEYS.map((e) => /* @__PURE__ */ import_react5.default.createElement("option", { key: e, value: e }, EMOTION_LABEL[e]))), /* @__PURE__ */ import_react5.default.createElement("button", { type: "button", className: "fg-btn", onClick: () => fileRef.current && fileRef.current.click() }, "上传立绘"), /* @__PURE__ */ import_react5.default.createElement("input", { ref: fileRef, type: "file", accept: "image/png,image/jpeg,image/webp", hidden: true, onChange: async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    const dataUrl = await readFile(file);
    run("up", () => api.cast(gameId, "upload", { name: person.name, emotion: uploadEmo, dataUrl }), "立绘已上传");
  } }), !person.global && /* @__PURE__ */ import_react5.default.createElement("button", { type: "button", className: "fg-btn", onClick: () => run("g", () => api.cast(gameId, "promote", { name: person.name }), "已提升为全局角色：所有对局共用，AI 不再改它") }, "提升为全局"), person.global && /* @__PURE__ */ import_react5.default.createElement("button", { type: "button", className: "fg-btn", onClick: () => run("l", () => api.cast(gameId, "copy-local", { name: person.name }), "已复制到本局，可单独修改") }, "复制到本局"), person.global && /* @__PURE__ */ import_react5.default.createElement("button", { type: "button", className: "fg-btn", onClick: () => {
    if (window.confirm("从全局库移除？各对局里的副本不受影响。")) run("u", () => api.cast(gameId, "unglobal", { name: person.name }), "已移出全局库");
  } }, "移出全局"), !person.global && /* @__PURE__ */ import_react5.default.createElement("button", { type: "button", className: "fg-btn", onClick: () => {
    if (window.confirm(`删除 ${person.name} 的本局档案？`)) run("d", () => api.cast(gameId, "delete", { name: person.name }), "已删除");
  } }, "删除")), person.versions && person.versions.length > 1 && /* @__PURE__ */ import_react5.default.createElement("div", { className: "fg-note", style: { marginTop: ".6cqw" } }, "外貌时间线：", person.versions.map((v) => `第 ${v.fromTurn} 轮起「${String(v.tags).slice(0, 40)}${String(v.tags).length > 40 ? "…" : ""}」`).join(" → "))));
}
function CastPanel({ view, gameId, onClose }) {
  const [tab, setTab] = import_react5.default.useState("people");
  const [busy, run] = useBusy();
  const [name2, setName] = import_react5.default.useState("");
  const cast = view && view.cast || [];
  const log = view && view.castLog || [];
  const ACTION = { create: "AI 建档", change: "外貌变化", temp: "临时状态", edit: "手动修改" };
  return /* @__PURE__ */ import_react5.default.createElement(
    Panel,
    {
      title: "人物志",
      en: "Characters",
      onClose,
      tabs: [{ id: "people", label: `人物 · ${cast.length}` }, { id: "log", label: `档案变更 · ${log.length}` }],
      tab,
      onTab: setTab,
      actions: tab === "people" && /* @__PURE__ */ import_react5.default.createElement("form", { className: "fg-row", onSubmit: (e) => {
        e.preventDefault();
        if (name2.trim()) run("new", () => api.cast(gameId, "save", { name: name2.trim(), patch: {} }), "已新建").then(() => setName(""));
      } }, /* @__PURE__ */ import_react5.default.createElement("input", { className: "fg-input", style: { width: "14cqw" }, placeholder: "新人物名字", value: name2, onChange: (e) => setName(e.target.value) }), /* @__PURE__ */ import_react5.default.createElement("button", { type: "submit", className: "fg-btn" }, "新建"))
    },
    tab === "people" && cast.map((p) => /* @__PURE__ */ import_react5.default.createElement(PersonCard, { key: p.name, gameId, person: p })),
    tab === "people" && !cast.length && /* @__PURE__ */ import_react5.default.createElement("div", { className: "fg-note" }, "有名字的角色第一次出场时，导演会自动给他建外貌档案；之后所有插画里写 @名字 都会换成这份外貌，长相不再漂移。"),
    tab === "log" && log.map((e) => /* @__PURE__ */ import_react5.default.createElement("div", { key: e.index, className: "fg-log-item", style: { gridTemplateColumns: "12cqw 1fr auto", cursor: "default" } }, /* @__PURE__ */ import_react5.default.createElement("div", { className: "fg-log-name" }, e.name), /* @__PURE__ */ import_react5.default.createElement("div", null, /* @__PURE__ */ import_react5.default.createElement("b", { style: { color: "var(--accent)" } }, ACTION[e.action] || e.action), e.turn != null ? ` · 第 ${e.turn} 轮` : "", /* @__PURE__ */ import_react5.default.createElement("br", null), /* @__PURE__ */ import_react5.default.createElement("span", { className: "fg-note" }, e.before ? `${e.before} → ` : "", e.after || (e.action === "temp" ? "（解除）" : ""))), /* @__PURE__ */ import_react5.default.createElement("button", { type: "button", className: "fg-btn", disabled: busy === "rb" + e.index, onClick: () => run("rb" + e.index, () => api.cast(gameId, "rollback", { index: e.index }), "已回滚") }, "回滚"))),
    tab === "log" && !log.length && /* @__PURE__ */ import_react5.default.createElement("div", { className: "fg-note" }, "AI 每次建档、改外貌、加临时状态都会记在这里，可以一键回滚。")
  );
}
function Field({ label, hint, children }) {
  return /* @__PURE__ */ import_react5.default.createElement(import_react5.default.Fragment, null, /* @__PURE__ */ import_react5.default.createElement("div", { className: "fg-field" }, /* @__PURE__ */ import_react5.default.createElement("label", null, label), /* @__PURE__ */ import_react5.default.createElement("div", null, children)), hint && /* @__PURE__ */ import_react5.default.createElement("div", { className: "fg-note", style: { margin: "-0.5cqw 0 0.6cqw 15.2cqw" } }, hint));
}
function Toggle({ value, onChange }) {
  return /* @__PURE__ */ import_react5.default.createElement("button", { type: "button", className: `fg-switch${value ? " is-on" : ""}`, "aria-pressed": Boolean(value), onClick: () => onChange(!value) });
}
function Text({ value, onCommit, type = "text", placeholder, style }) {
  const [v, setV] = import_react5.default.useState(value ?? "");
  import_react5.default.useEffect(() => {
    setV(value ?? "");
  }, [value]);
  const commit = () => {
    if (String(v) !== String(value ?? "")) onCommit(type === "number" ? Number(v) : v);
  };
  return /* @__PURE__ */ import_react5.default.createElement("input", { className: "fg-input", type, value: v, placeholder, style, onChange: (e) => setV(e.target.value), onBlur: commit, onKeyDown: (e) => {
    e.stopPropagation();
    if (e.key === "Enter") commit();
  } });
}
function Select({ value, options, onChange }) {
  return /* @__PURE__ */ import_react5.default.createElement("select", { className: "fg-select", value, onChange: (e) => onChange(e.target.value) }, options.map(([v, l]) => /* @__PURE__ */ import_react5.default.createElement("option", { key: v, value: v }, l)));
}
function ModelField({ value, options, onCommit, placeholder, emptyLabel }) {
  const [manual, setManual] = import_react5.default.useState(false);
  if (manual || !options.length) {
    return /* @__PURE__ */ import_react5.default.createElement("div", { className: "fg-row" }, /* @__PURE__ */ import_react5.default.createElement(Text, { value, placeholder, style: { flex: 1, width: "auto" }, onCommit }), options.length > 0 && /* @__PURE__ */ import_react5.default.createElement("button", { type: "button", className: "fg-btn", onClick: () => setManual(false) }, "从列表选"));
  }
  const known = !value || options.some((o) => o.id === value);
  const opts = [
    ...emptyLabel ? [["", emptyLabel]] : [],
    ...known ? [] : [[value, value + "（当前）"]],
    ...options.map((o) => [o.id, o.name]),
    ["__manual", "手动填写…"]
  ];
  return /* @__PURE__ */ import_react5.default.createElement(Select, { value, options: opts, onChange: (v) => v === "__manual" ? setManual(true) : onCommit(v) });
}
function listOptions(list, value, emptyLabel) {
  const opts = (list || []).map((v) => [v, v]);
  if (value && !(list || []).includes(value)) opts.unshift([value, value + "（当前）"]);
  if (emptyLabel) opts.unshift(["", emptyLabel]);
  return opts;
}
function KeyInput({ backend, endpoint, has }) {
  const [value, setValue] = import_react5.default.useState("");
  const [busy, run] = useBusy();
  return /* @__PURE__ */ import_react5.default.createElement("div", { className: "fg-row" }, /* @__PURE__ */ import_react5.default.createElement("input", { className: "fg-input", style: { flex: 1, width: "auto" }, type: "password", autoComplete: "off", placeholder: has ? "已保存（不会回显）；填新的会覆盖" : "粘贴 Key", value, onChange: (e) => setValue(e.target.value), onKeyDown: (e) => e.stopPropagation() }), /* @__PURE__ */ import_react5.default.createElement("button", { type: "button", className: "fg-btn is-primary", disabled: !value || busy === "s", onClick: () => run("s", async () => {
    setConfig(await api.secret(backend, endpoint, value));
    setValue("");
  }, "Key 已保存在宿主，不会发到浏览器") }, "保存"), has && /* @__PURE__ */ import_react5.default.createElement("button", { type: "button", className: "fg-btn", onClick: () => run("c", async () => setConfig(await api.secret(backend, endpoint, "")), "已清除") }, "清除"), /* @__PURE__ */ import_react5.default.createElement("span", { className: has ? "fg-ok" : "fg-note" }, has ? "✓ 已保存" : "未填写"));
}
function BackendSection({ data }) {
  const cfg = data.config;
  const backend = cfg.images.backend;
  const [busy, run] = useBusy();
  const [test, setTest] = import_react5.default.useState(null);
  const [list, setList] = import_react5.default.useState(null);
  const [relay, setRelay] = import_react5.default.useState({ name: "", baseURL: "" });
  const p = (section, patch) => patchConfig({ [section]: patch }).catch((e) => toast(e.message, "error"));
  const source = backend === "novelai" ? "" : [cfg[backend].baseURL, cfg[backend].authType, data.keys[backend]].join("|");
  const loadList = () => run("m", async () => setList(await api.models()));
  import_react5.default.useEffect(() => {
    setList(null);
    loadList();
  }, [backend, source]);
  const models = list && list.backend === backend && list.models || [];
  const samplers = list && list.backend === backend && list.samplers || [];
  const schedulers = list && list.backend === backend && list.schedulers || [];
  const modelHint = list ? list.note : "正在读取模型列表…";
  const refresh = /* @__PURE__ */ import_react5.default.createElement("button", { type: "button", className: "fg-btn", disabled: busy === "m", onClick: loadList }, busy === "m" ? "读取中…" : "刷新列表");
  const doTest = () => run("t", async () => {
    setTest(await api.test());
    if (backend !== "novelai") loadList();
  });
  const nai = naiModelInfo(cfg.novelai.model) || {};
  const auth = (section) => /* @__PURE__ */ import_react5.default.createElement(Field, { label: "鉴权" }, /* @__PURE__ */ import_react5.default.createElement(Select, { value: cfg[section].authType, onChange: (v) => p(section, { authType: v }), options: [["none", "无"], ["bearer", "Bearer Token"], ["basic", "Basic（用户名:密码）"]] }));
  return /* @__PURE__ */ import_react5.default.createElement(import_react5.default.Fragment, null, /* @__PURE__ */ import_react5.default.createElement("div", { className: "fg-section" }, "生图渠道"), /* @__PURE__ */ import_react5.default.createElement(Field, { label: "渠道" }, /* @__PURE__ */ import_react5.default.createElement(Select, { value: backend, onChange: (v) => p("images", { backend: v }), options: [["novelai", "NovelAI"], ["comfyui", "ComfyUI"], ["openai", "OpenAI 兼容（gpt-image / 聊天出图）"], ["webui", "SD WebUI / Forge"]] })), backend === "novelai" && /* @__PURE__ */ import_react5.default.createElement(import_react5.default.Fragment, null, /* @__PURE__ */ import_react5.default.createElement(Field, { label: "接入点", hint: "官方站与第三方中转站各存一条，各记各的 Key；换站不影响模型与画风。" }, /* @__PURE__ */ import_react5.default.createElement("div", { className: "fg-row" }, /* @__PURE__ */ import_react5.default.createElement(Select, { value: cfg.novelai.endpoint, onChange: (v) => p("novelai", { endpoint: v }), options: cfg.novelai.endpoints.map((e) => [e.id, e.name]) }), cfg.novelai.endpoint !== "official" && /* @__PURE__ */ import_react5.default.createElement("button", { type: "button", className: "fg-btn", onClick: () => p("novelai", { endpoint: "official", endpoints: cfg.novelai.endpoints.filter((e) => e.id !== cfg.novelai.endpoint) }) }, "删除此站"))), /* @__PURE__ */ import_react5.default.createElement(Field, { label: "添加中转站" }, /* @__PURE__ */ import_react5.default.createElement("div", { className: "fg-row" }, /* @__PURE__ */ import_react5.default.createElement("input", { className: "fg-input", style: { width: "12cqw" }, placeholder: "名称", value: relay.name, onChange: (e) => setRelay((r) => ({ ...r, name: e.target.value })), onKeyDown: (e) => e.stopPropagation() }), /* @__PURE__ */ import_react5.default.createElement("input", { className: "fg-input", style: { flex: 1, width: "auto" }, placeholder: "https://…", value: relay.baseURL, onChange: (e) => setRelay((r) => ({ ...r, baseURL: e.target.value })), onKeyDown: (e) => e.stopPropagation() }), /* @__PURE__ */ import_react5.default.createElement("button", { type: "button", className: "fg-btn", disabled: !/^https?:\/\//.test(relay.baseURL), onClick: () => {
    const id = "relay" + Date.now().toString(36).slice(-5);
    p("novelai", { endpoints: [...cfg.novelai.endpoints, { id, name: relay.name || id, baseURL: relay.baseURL }], endpoint: id });
    setRelay({ name: "", baseURL: "" });
  } }, "添加"))), /* @__PURE__ */ import_react5.default.createElement(Field, { label: "Key" }, /* @__PURE__ */ import_react5.default.createElement(KeyInput, { backend: "novelai", endpoint: cfg.novelai.endpoint, has: data.keys["novelai:" + cfg.novelai.endpoint] })), /* @__PURE__ */ import_react5.default.createElement(Field, { label: "模型", hint: modelHint }, /* @__PURE__ */ import_react5.default.createElement(ModelField, { value: cfg.novelai.model, options: models, placeholder: "nai-diffusion-…", onCommit: (v) => p("novelai", { model: v }) })), /* @__PURE__ */ import_react5.default.createElement(Field, { label: "采样器" }, /* @__PURE__ */ import_react5.default.createElement(Select, { value: cfg.novelai.sampler, onChange: (v) => p("novelai", { sampler: v }), options: listOptions(samplers, cfg.novelai.sampler) })), /* @__PURE__ */ import_react5.default.createElement(Field, { label: "步数 / 提示词引导" }, /* @__PURE__ */ import_react5.default.createElement("div", { className: "fg-row" }, /* @__PURE__ */ import_react5.default.createElement(Text, { type: "number", style: { width: "8cqw" }, value: cfg.novelai.steps, onCommit: (v) => p("novelai", { steps: v }) }), /* @__PURE__ */ import_react5.default.createElement(Text, { type: "number", style: { width: "8cqw" }, value: cfg.novelai.scale, onCommit: (v) => p("novelai", { scale: v }) }))), /* @__PURE__ */ import_react5.default.createElement(Field, { label: "引导缩放", hint: "Prompt Guidance Rescale，0–1。提示词引导调高后画面发灰、过饱和时往上加一点。" }, /* @__PURE__ */ import_react5.default.createElement("input", { type: "range", min: "0", max: "1", step: "0.02", value: cfg.novelai.cfgRescale, onChange: (e) => p("novelai", { cfgRescale: Number(e.target.value) }), style: { width: "24cqw" } }), /* @__PURE__ */ import_react5.default.createElement("span", { className: "fg-note", style: { marginLeft: "1cqw" } }, Number(cfg.novelai.cfgRescale).toFixed(2))), nai.v5 ? /* @__PURE__ */ import_react5.default.createElement(Field, { label: "透明底立绘", hint: "V5 才有：立绘按透明背景生成，站在场景里不会带一块白底。CG 和背景不受影响。" }, /* @__PURE__ */ import_react5.default.createElement(Toggle, { value: cfg.images.transparentSprites, onChange: (v) => p("images", { transparentSprites: v }) })) : /* @__PURE__ */ import_react5.default.createElement(import_react5.default.Fragment, null, /* @__PURE__ */ import_react5.default.createElement(Field, { label: "噪声调度" }, /* @__PURE__ */ import_react5.default.createElement(Select, { value: cfg.novelai.noiseSchedule, onChange: (v) => p("novelai", { noiseSchedule: v }), options: listOptions(schedulers, cfg.novelai.noiseSchedule) })), nai.v4 && /* @__PURE__ */ import_react5.default.createElement(Field, { label: "Variety+", hint: "前几步不跟提示词，构图更多样；代价是没那么听话。" }, /* @__PURE__ */ import_react5.default.createElement(Toggle, { value: cfg.novelai.variety, onChange: (v) => p("novelai", { variety: v }) })))), backend === "comfyui" && /* @__PURE__ */ import_react5.default.createElement(import_react5.default.Fragment, null, /* @__PURE__ */ import_react5.default.createElement(Field, { label: "地址" }, /* @__PURE__ */ import_react5.default.createElement(Text, { value: cfg.comfyui.baseURL, onCommit: (v) => p("comfyui", { baseURL: v }) })), auth("comfyui"), cfg.comfyui.authType !== "none" && /* @__PURE__ */ import_react5.default.createElement(Field, { label: "Token" }, /* @__PURE__ */ import_react5.default.createElement(KeyInput, { backend: "comfyui", has: data.keys.comfyui })), /* @__PURE__ */ import_react5.default.createElement(Field, { label: "模式" }, /* @__PURE__ */ import_react5.default.createElement(Select, { value: cfg.comfyui.mode, onChange: (v) => p("comfyui", { mode: v }), options: [["simple", "简单（只选底模）"], ["workflow", "导入工作流（API 格式 JSON）"]] })), cfg.comfyui.mode === "simple" ? /* @__PURE__ */ import_react5.default.createElement(import_react5.default.Fragment, null, /* @__PURE__ */ import_react5.default.createElement(Field, { label: "底模", hint: modelHint }, /* @__PURE__ */ import_react5.default.createElement("div", { className: "fg-row" }, /* @__PURE__ */ import_react5.default.createElement("div", { style: { flex: 1 } }, /* @__PURE__ */ import_react5.default.createElement(ModelField, { value: cfg.comfyui.checkpoint, options: models, emptyLabel: "（请选择）", placeholder: "xxx.safetensors", onCommit: (v) => p("comfyui", { checkpoint: v }) })), refresh)), samplers.length > 0 && /* @__PURE__ */ import_react5.default.createElement(Field, { label: "采样器 / 调度器" }, /* @__PURE__ */ import_react5.default.createElement("div", { className: "fg-row" }, /* @__PURE__ */ import_react5.default.createElement(Select, { value: cfg.comfyui.sampler, onChange: (v) => p("comfyui", { sampler: v }), options: listOptions(samplers, cfg.comfyui.sampler) }), /* @__PURE__ */ import_react5.default.createElement(Select, { value: cfg.comfyui.scheduler, onChange: (v) => p("comfyui", { scheduler: v }), options: listOptions(schedulers, cfg.comfyui.scheduler) }))), /* @__PURE__ */ import_react5.default.createElement(Field, { label: "步数 / CFG" }, /* @__PURE__ */ import_react5.default.createElement("div", { className: "fg-row" }, /* @__PURE__ */ import_react5.default.createElement(Text, { type: "number", style: { width: "8cqw" }, value: cfg.comfyui.steps, onCommit: (v) => p("comfyui", { steps: v }) }), /* @__PURE__ */ import_react5.default.createElement(Text, { type: "number", style: { width: "8cqw" }, value: cfg.comfyui.cfg, onCommit: (v) => p("comfyui", { cfg: v }) })))) : /* @__PURE__ */ import_react5.default.createElement(Field, { label: "工作流", hint: "支持 %prompt% %negative% %width% %height% %seed% %steps% %cfg% 占位符；没有占位符时自动找正负提示词、尺寸和采样节点。" }, /* @__PURE__ */ import_react5.default.createElement("div", { className: "fg-row" }, cfg.comfyui.workflows.length > 0 && /* @__PURE__ */ import_react5.default.createElement(Select, { value: cfg.comfyui.workflow || cfg.comfyui.workflows[0].id, onChange: (v) => p("comfyui", { workflow: v }), options: cfg.comfyui.workflows.map((w) => [w.id, w.name]) }), /* @__PURE__ */ import_react5.default.createElement("label", { className: "fg-btn" }, "导入 JSON", /* @__PURE__ */ import_react5.default.createElement("input", { type: "file", accept: "application/json,.json", hidden: true, onChange: async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    try {
      const graph = JSON.parse(await file.text());
      if (!graph || typeof graph !== "object" || Array.isArray(graph) || graph.nodes) throw new Error("需要 ComfyUI「导出（API）」格式的 JSON");
      const id = "wf" + Date.now().toString(36);
      await patchConfig({ comfyui: { workflows: [...cfg.comfyui.workflows, { id, name: file.name.replace(/\.json$/i, ""), graph }], workflow: id } });
      toast("工作流已导入");
    } catch (err) {
      toast(String(err.message || err), "error");
    }
  } })), cfg.comfyui.workflows.length > 0 && /* @__PURE__ */ import_react5.default.createElement("button", { type: "button", className: "fg-btn", onClick: () => p("comfyui", { workflows: cfg.comfyui.workflows.filter((w) => w.id !== (cfg.comfyui.workflow || cfg.comfyui.workflows[0].id)), workflow: "" }) }, "删除当前")))), backend === "openai" && /* @__PURE__ */ import_react5.default.createElement(import_react5.default.Fragment, null, /* @__PURE__ */ import_react5.default.createElement(Field, { label: "API 地址" }, /* @__PURE__ */ import_react5.default.createElement(Text, { value: cfg.openai.baseURL, onCommit: (v) => p("openai", { baseURL: v }) })), /* @__PURE__ */ import_react5.default.createElement(Field, { label: "Key" }, /* @__PURE__ */ import_react5.default.createElement(KeyInput, { backend: "openai", has: data.keys.openai })), /* @__PURE__ */ import_react5.default.createElement(Field, { label: "接口" }, /* @__PURE__ */ import_react5.default.createElement(Select, { value: cfg.openai.mode, onChange: (v) => p("openai", { mode: v }), options: [["images", "/images/generations"], ["chat", "/chat/completions（回复里带图的模型）"]] })), /* @__PURE__ */ import_react5.default.createElement(Field, { label: "模型", hint: modelHint }, /* @__PURE__ */ import_react5.default.createElement("div", { className: "fg-row" }, /* @__PURE__ */ import_react5.default.createElement("div", { style: { flex: 1 } }, /* @__PURE__ */ import_react5.default.createElement(ModelField, { value: cfg.openai.model, options: models, emptyLabel: "（请选择）", placeholder: "gpt-image-1", onCommit: (v) => p("openai", { model: v }) })), refresh)), /* @__PURE__ */ import_react5.default.createElement(Field, { label: "横 / 竖 / 方尺寸" }, /* @__PURE__ */ import_react5.default.createElement("div", { className: "fg-row" }, /* @__PURE__ */ import_react5.default.createElement(Text, { style: { width: "10cqw" }, value: cfg.openai.landscapeSize, onCommit: (v) => p("openai", { landscapeSize: v }) }), /* @__PURE__ */ import_react5.default.createElement(Text, { style: { width: "10cqw" }, value: cfg.openai.portraitSize, onCommit: (v) => p("openai", { portraitSize: v }) }), /* @__PURE__ */ import_react5.default.createElement(Text, { style: { width: "10cqw" }, value: cfg.openai.squareSize, onCommit: (v) => p("openai", { squareSize: v }) })))), backend === "webui" && /* @__PURE__ */ import_react5.default.createElement(import_react5.default.Fragment, null, /* @__PURE__ */ import_react5.default.createElement(Field, { label: "地址" }, /* @__PURE__ */ import_react5.default.createElement(Text, { value: cfg.webui.baseURL, onCommit: (v) => p("webui", { baseURL: v }) })), auth("webui"), cfg.webui.authType !== "none" && /* @__PURE__ */ import_react5.default.createElement(Field, { label: "凭据" }, /* @__PURE__ */ import_react5.default.createElement(KeyInput, { backend: "webui", has: data.keys.webui })), /* @__PURE__ */ import_react5.default.createElement(Field, { label: "底模", hint: modelHint }, /* @__PURE__ */ import_react5.default.createElement("div", { className: "fg-row" }, /* @__PURE__ */ import_react5.default.createElement("div", { style: { flex: 1 } }, /* @__PURE__ */ import_react5.default.createElement(ModelField, { value: cfg.webui.model, options: models, emptyLabel: "跟随服务器当前底模", placeholder: "模型标题", onCommit: (v) => p("webui", { model: v }) })), refresh)), samplers.length > 0 && /* @__PURE__ */ import_react5.default.createElement(Field, { label: "采样器 / 调度器" }, /* @__PURE__ */ import_react5.default.createElement("div", { className: "fg-row" }, /* @__PURE__ */ import_react5.default.createElement(Select, { value: cfg.webui.sampler, onChange: (v) => p("webui", { sampler: v }), options: listOptions(samplers, cfg.webui.sampler) }), /* @__PURE__ */ import_react5.default.createElement(Select, { value: cfg.webui.scheduler, onChange: (v) => p("webui", { scheduler: v }), options: listOptions(schedulers, cfg.webui.scheduler, "自动") }))), /* @__PURE__ */ import_react5.default.createElement(Field, { label: "步数 / CFG" }, /* @__PURE__ */ import_react5.default.createElement("div", { className: "fg-row" }, /* @__PURE__ */ import_react5.default.createElement(Text, { type: "number", style: { width: "8cqw" }, value: cfg.webui.steps, onCommit: (v) => p("webui", { steps: v }) }), /* @__PURE__ */ import_react5.default.createElement(Text, { type: "number", style: { width: "8cqw" }, value: cfg.webui.cfg, onCommit: (v) => p("webui", { cfg: v }) })))), /* @__PURE__ */ import_react5.default.createElement(Field, { label: "种子", hint: "-1 表示每张随机；填一个数字后所有图都用它，方便复现同一种构图。单张图可以在鉴赏的「改词」里另外指定。" }, /* @__PURE__ */ import_react5.default.createElement(Text, { type: "number", style: { width: "16cqw" }, value: cfg.images.seed, onCommit: (v) => p("images", { seed: v === "" ? -1 : v }) })), /* @__PURE__ */ import_react5.default.createElement(Field, { label: "连接" }, /* @__PURE__ */ import_react5.default.createElement("div", { className: "fg-row" }, /* @__PURE__ */ import_react5.default.createElement("button", { type: "button", className: "fg-btn", disabled: busy === "t", onClick: doTest }, busy === "t" ? "测试中…" : "测试连接"), test && /* @__PURE__ */ import_react5.default.createElement("span", { className: test.ok ? "fg-ok" : "fg-err" }, test.message), !test && /* @__PURE__ */ import_react5.default.createElement("span", { className: data.ready ? "fg-ok" : "fg-note" }, data.ready ? "✓ 可以出图" : data.readyReason))));
}
function StyleSection({ data }) {
  const cfg = data.config;
  const presets = data.presets || {};
  const artists = [...presets.artists || [], ...cfg.style.artists || []];
  const current = artists.find((a) => a.id === cfg.style.artist);
  const [draft, setDraft] = import_react5.default.useState({ name: "", text: "" });
  const key = modelKey(cfg.images.backend, cfg);
  const p = (patch) => patchConfig({ style: patch }).catch((e) => toast(e.message, "error"));
  const quality = qualityFor(cfg.style, key);
  const negative = negativeFor(cfg.style, key);
  return /* @__PURE__ */ import_react5.default.createElement(import_react5.default.Fragment, null, /* @__PURE__ */ import_react5.default.createElement("div", { className: "fg-section" }, "画风"), /* @__PURE__ */ import_react5.default.createElement(Field, { label: "画师串", hint: current && current.text ? current.text : "不加画师串" }, /* @__PURE__ */ import_react5.default.createElement("div", { className: "fg-row" }, /* @__PURE__ */ import_react5.default.createElement(Select, { value: cfg.style.artist, onChange: (v) => p({ artist: v }), options: artists.map((a) => [a.id, a.name]) }), (cfg.style.artists || []).some((a) => a.id === cfg.style.artist) && /* @__PURE__ */ import_react5.default.createElement("button", { type: "button", className: "fg-btn", onClick: () => p({ artists: cfg.style.artists.filter((a) => a.id !== cfg.style.artist), artist: "galgame" }) }, "删除这套"))), /* @__PURE__ */ import_react5.default.createElement(Field, { label: "存一套新的" }, /* @__PURE__ */ import_react5.default.createElement("div", { className: "fg-row" }, /* @__PURE__ */ import_react5.default.createElement("input", { className: "fg-input", style: { width: "12cqw" }, placeholder: "名字", value: draft.name, onChange: (e) => setDraft((d) => ({ ...d, name: e.target.value })), onKeyDown: (e) => e.stopPropagation() }), /* @__PURE__ */ import_react5.default.createElement("input", { className: "fg-input", style: { flex: 1, width: "auto" }, placeholder: "artist:xxx, artist:yyy, …", value: draft.text, onChange: (e) => setDraft((d) => ({ ...d, text: e.target.value })), onKeyDown: (e) => e.stopPropagation() }), /* @__PURE__ */ import_react5.default.createElement("button", { type: "button", className: "fg-btn", disabled: !draft.text.trim(), onClick: () => {
    const id = "a" + Date.now().toString(36);
    p({ artists: [...cfg.style.artists || [], { id, name: draft.name || "我的画风", text: draft.text.trim() }], artist: id });
    setDraft({ name: "", text: "" });
  } }, "保存并使用"))), /* @__PURE__ */ import_react5.default.createElement(Field, { label: "质量词" }, /* @__PURE__ */ import_react5.default.createElement("div", { className: "fg-row" }, /* @__PURE__ */ import_react5.default.createElement(Toggle, { value: cfg.style.useQuality, onChange: (v) => p({ useQuality: v }) }), /* @__PURE__ */ import_react5.default.createElement("span", { className: "fg-note" }, "当前模型：", key))), cfg.style.useQuality && /* @__PURE__ */ import_react5.default.createElement(Field, { label: "质量词内容" }, /* @__PURE__ */ import_react5.default.createElement(Text, { value: quality, onCommit: (v) => p({ quality: { ...cfg.style.quality || {}, [key]: v } }) })), /* @__PURE__ */ import_react5.default.createElement(Field, { label: "负面词" }, /* @__PURE__ */ import_react5.default.createElement(Text, { value: negative, onCommit: (v) => p({ negative: { ...cfg.style.negative || {}, [key]: v } }) })), /* @__PURE__ */ import_react5.default.createElement(Field, { label: "" }, /* @__PURE__ */ import_react5.default.createElement("button", { type: "button", className: "fg-btn", onClick: () => {
    const q = { ...cfg.style.quality || {} };
    const n = { ...cfg.style.negative || {} };
    delete q[key];
    delete n[key];
    patchConfig({ style: { quality: q, negative: n } });
  } }, "恢复这个模型的默认质量词与负面词")));
}
function DirectorSection({ data, onDirectorLog }) {
  const cfg = data.config;
  const [llm, setLlm] = import_react5.default.useState({ providers: [], models: [] });
  import_react5.default.useEffect(() => {
    api.llm(cfg.director.provider).then(setLlm).catch(() => {
    });
  }, [cfg.director.provider]);
  const p = (patch) => patchConfig({ director: patch }).catch((e) => toast(e.message, "error"));
  return /* @__PURE__ */ import_react5.default.createElement(import_react5.default.Fragment, null, /* @__PURE__ */ import_react5.default.createElement("div", { className: "fg-section" }, "导演（后台整理）", onDirectorLog && /* @__PURE__ */ import_react5.default.createElement("button", { type: "button", className: "fg-btn", onClick: onDirectorLog }, "查看导演日志")), /* @__PURE__ */ import_react5.default.createElement(Field, { label: "自动整理", hint: "每轮正文写完后，后台模型把它整理成场景：说话人、表情、站位、镜头、天气、选项、插画分镜。正文一字不改。" }, /* @__PURE__ */ import_react5.default.createElement(Toggle, { value: cfg.director.auto, onChange: (v) => p({ auto: v }) })), /* @__PURE__ */ import_react5.default.createElement(Field, { label: "模型", hint: "留空跟随 Tavern 的后台模型。整理用的是便宜的小模型就够。" }, /* @__PURE__ */ import_react5.default.createElement("div", { className: "fg-row" }, /* @__PURE__ */ import_react5.default.createElement(Select, { value: cfg.director.provider, onChange: (v) => p({ provider: v, model: "" }), options: [["", "跟随 Tavern"], ...llm.providers.map((x) => [x.id, x.name])] }), cfg.director.provider && (llm.models.length ? /* @__PURE__ */ import_react5.default.createElement(Select, { value: cfg.director.model, onChange: (v) => p({ model: v }), options: [["", "（请选择）"], ...llm.models.map((m) => [m.id, m.name])] }) : /* @__PURE__ */ import_react5.default.createElement(Text, { value: cfg.director.model, placeholder: "模型 ID", onCommit: (v) => p({ model: v }) })))), /* @__PURE__ */ import_react5.default.createElement(Field, { label: "最大输出 / 温度", hint: "默认 128000（Claude Opus / Sonnet 5.5 的输出上限）。模型窗口装不下时自动往下收；模型拒绝这个值时按它报的上限重试一次。导演日志里能看到实际用了多少。" }, /* @__PURE__ */ import_react5.default.createElement("div", { className: "fg-row" }, /* @__PURE__ */ import_react5.default.createElement(Text, { type: "number", style: { width: "9cqw" }, value: cfg.director.maxTokens, onCommit: (v) => p({ maxTokens: v }) }), /* @__PURE__ */ import_react5.default.createElement(Text, { type: "number", style: { width: "7cqw" }, value: cfg.director.temperature, onCommit: (v) => p({ temperature: v }) }))), /* @__PURE__ */ import_react5.default.createElement(Field, { label: "资料长度", hint: "给导演看多少人物卡 / 世界书（字），用来判断人物外貌。默认 1000000，等于不截断；超出模型窗口时自动缩短。" }, /* @__PURE__ */ import_react5.default.createElement(Text, { type: "number", value: cfg.director.contextChars, onCommit: (v) => p({ contextChars: v }) })), /* @__PURE__ */ import_react5.default.createElement(Field, { label: "自定义提示词", hint: "留空用内置导演提示词。可用 {{maxImages}} {{styleHint}}。" }, /* @__PURE__ */ import_react5.default.createElement("textarea", { className: "fg-textarea", defaultValue: cfg.director.systemPrompt, onKeyDown: (e) => e.stopPropagation(), onBlur: (e) => {
    if (e.target.value !== cfg.director.systemPrompt) p({ systemPrompt: e.target.value });
  } })));
}
function ImagesSection({ data }) {
  const cfg = data.config;
  const p = (patch) => patchConfig({ images: patch }).catch((e) => toast(e.message, "error"));
  return /* @__PURE__ */ import_react5.default.createElement(import_react5.default.Fragment, null, /* @__PURE__ */ import_react5.default.createElement("div", { className: "fg-section" }, "自动配图"), /* @__PURE__ */ import_react5.default.createElement(Field, { label: "自动插画", hint: "导演判断值得画的地方自动出 CG，挂在正文对应段落后。" }, /* @__PURE__ */ import_react5.default.createElement("div", { className: "fg-row" }, /* @__PURE__ */ import_react5.default.createElement(Toggle, { value: cfg.images.auto, onChange: (v) => p({ auto: v }) }), /* @__PURE__ */ import_react5.default.createElement("span", { className: "fg-note" }, "每轮最多"), /* @__PURE__ */ import_react5.default.createElement(Text, { type: "number", style: { width: "6cqw" }, value: cfg.images.maxPerTurn, onCommit: (v) => p({ maxPerTurn: v }) }), /* @__PURE__ */ import_react5.default.createElement("span", { className: "fg-note" }, "张"))), /* @__PURE__ */ import_react5.default.createElement(Field, { label: "新地点背景" }, /* @__PURE__ */ import_react5.default.createElement(Toggle, { value: cfg.images.backgrounds, onChange: (v) => p({ backgrounds: v }) })), /* @__PURE__ */ import_react5.default.createElement(Field, { label: "首次登场立绘" }, /* @__PURE__ */ import_react5.default.createElement(Toggle, { value: cfg.images.portraits, onChange: (v) => p({ portraits: v }) })), /* @__PURE__ */ import_react5.default.createElement(Field, { label: "表情差分", hint: "导演用到新表情时补画一张，费用较高。" }, /* @__PURE__ */ import_react5.default.createElement("div", { className: "fg-row" }, /* @__PURE__ */ import_react5.default.createElement(Toggle, { value: cfg.images.expressions, onChange: (v) => p({ expressions: v }) }), /* @__PURE__ */ import_react5.default.createElement("span", { className: "fg-note" }, "每轮最多"), /* @__PURE__ */ import_react5.default.createElement(Text, { type: "number", style: { width: "6cqw" }, value: cfg.images.expressionsPerTurn, onCommit: (v) => p({ expressionsPerTurn: v }) }), /* @__PURE__ */ import_react5.default.createElement("span", { className: "fg-note" }, "张"))), /* @__PURE__ */ import_react5.default.createElement(Field, { label: "并发" }, /* @__PURE__ */ import_react5.default.createElement(Text, { type: "number", style: { width: "6cqw" }, value: cfg.images.concurrency, onCommit: (v) => p({ concurrency: v }) })));
}
function LookSection({ data }) {
  const cfg = data.config;
  const p = (patch) => patchConfig({ ui: patch }).catch((e) => toast(e.message, "error"));
  return /* @__PURE__ */ import_react5.default.createElement(import_react5.default.Fragment, null, /* @__PURE__ */ import_react5.default.createElement("div", { className: "fg-section" }, "界面皮肤"), /* @__PURE__ */ import_react5.default.createElement("div", { className: "fg-skins" }, SKINS.map((s) => /* @__PURE__ */ import_react5.default.createElement("button", { key: s.id, type: "button", className: `fg-skin${cfg.ui.skin === s.id ? " is-on" : ""}`, onClick: () => p({ skin: s.id }) }, /* @__PURE__ */ import_react5.default.createElement("div", { className: "fg-skin-swatch", style: { background: s.swatch } }), /* @__PURE__ */ import_react5.default.createElement("b", null, s.name), /* @__PURE__ */ import_react5.default.createElement("span", null, s.desc)))), /* @__PURE__ */ import_react5.default.createElement("div", { className: "fg-section" }, "演出"), /* @__PURE__ */ import_react5.default.createElement(Field, { label: "文字速度", hint: "每字毫秒，0 为瞬间显示。" }, /* @__PURE__ */ import_react5.default.createElement("input", { type: "range", min: "0", max: "80", value: cfg.ui.textSpeed, onChange: (e) => p({ textSpeed: Number(e.target.value) }), style: { width: "100%" } })), /* @__PURE__ */ import_react5.default.createElement(Field, { label: "自动播放间隔" }, /* @__PURE__ */ import_react5.default.createElement("input", { type: "range", min: "400", max: "4000", step: "100", value: cfg.ui.autoDelay, onChange: (e) => p({ autoDelay: Number(e.target.value) }), style: { width: "100%" } })), /* @__PURE__ */ import_react5.default.createElement(Field, { label: "天气粒子" }, /* @__PURE__ */ import_react5.default.createElement(Toggle, { value: cfg.ui.particles, onChange: (v) => p({ particles: v }) })), /* @__PURE__ */ import_react5.default.createElement(Field, { label: "打字音" }, /* @__PURE__ */ import_react5.default.createElement(Toggle, { value: cfg.ui.blip, onChange: (v) => p({ blip: v }) })), /* @__PURE__ */ import_react5.default.createElement(Field, { label: "写完自动打开剧场" }, /* @__PURE__ */ import_react5.default.createElement(Toggle, { value: cfg.ui.autoOpen, onChange: (v) => p({ autoOpen: v }) })), /* @__PURE__ */ import_react5.default.createElement(Field, { label: "字体地址", hint: "皮肤字体从这里按 npm 包名加载（默认 jsDelivr 上的 @fontsource 官方包）；连不上时可以换成 unpkg 或自己的镜像，地址以 / 结尾。" }, /* @__PURE__ */ import_react5.default.createElement(Text, { value: cfg.ui.fontBase, onCommit: (v) => p({ fontBase: v }) })));
}
var sizeMB = (bytes) => (bytes / 1048576).toFixed(1) + " MB";
function TrackCard({ track, playing, onPlay }) {
  const [busy, run] = useBusy();
  const save = (patch) => run("s", async () => {
    await api.updateTrack(track.id, patch);
    await loadMusic();
  });
  return /* @__PURE__ */ import_react5.default.createElement("div", { className: "fg-track" }, /* @__PURE__ */ import_react5.default.createElement("button", { type: "button", className: `fg-track-play${playing ? " is-on" : ""}`, title: playing ? "停止试听" : "试听", onClick: onPlay }, playing ? "■" : "▶"), /* @__PURE__ */ import_react5.default.createElement("div", { className: "fg-track-body" }, /* @__PURE__ */ import_react5.default.createElement("div", { className: "fg-row" }, /* @__PURE__ */ import_react5.default.createElement(Text, { value: track.name, style: { flex: 1, width: "auto", fontWeight: 600 }, onCommit: (v) => save({ name: v }) }), /* @__PURE__ */ import_react5.default.createElement("span", { className: "fg-note", title: track.file }, sizeMB(track.bytes)), /* @__PURE__ */ import_react5.default.createElement("button", { type: "button", className: "fg-btn", disabled: busy === "d", onClick: () => {
    if (window.confirm(`从曲库删除「${track.name}」？电脑上的原文件不受影响。`)) run("d", async () => {
      await api.removeTrack(track.id);
      await loadMusic();
    }, "已删除");
  } }, "删除")), /* @__PURE__ */ import_react5.default.createElement(TextArea, { value: track.description, placeholder: "听起来什么样、适合什么场面。例如：慢板萨克斯和雨声，深夜独处、心事重重，也适合告白前的沉默", onCommit: (v) => save({ description: v }) }), /* @__PURE__ */ import_react5.default.createElement(Text, { value: (track.tags || []).join("、"), placeholder: "标签，用顿号或逗号隔开：深夜、城市、雨、怀旧", style: { width: "100%" }, onCommit: (v) => save({ tags: v }) })));
}
function TextArea({ value, onCommit, placeholder }) {
  const [v, setV] = import_react5.default.useState(value ?? "");
  import_react5.default.useEffect(() => {
    setV(value ?? "");
  }, [value]);
  return /* @__PURE__ */ import_react5.default.createElement("textarea", { className: "fg-textarea fg-track-desc", value: v, placeholder, onChange: (e) => setV(e.target.value), onBlur: () => {
    if (v !== (value ?? "")) onCommit(v);
  }, onKeyDown: (e) => e.stopPropagation() });
}
function MusicSection({ data }) {
  const cfg = data.config;
  const tracks = useMusic();
  const [playing, setPlaying] = import_react5.default.useState("");
  const [progress, setProgress] = import_react5.default.useState("");
  const folderRef = import_react5.default.useRef(null);
  const filesRef = import_react5.default.useRef(null);
  const p = (patch) => patchConfig({ ui: patch }).catch((e) => toast(e.message, "error"));
  import_react5.default.useEffect(() => () => stopPreview(), []);
  const play = (track) => {
    if (playing === track.id) {
      stopPreview();
      return;
    }
    previewTrack({ id: track.id, url: assetUrl(track.assetId) }, () => setPlaying((id) => id === track.id ? "" : id));
    setPlaying(track.id);
  };
  const importFiles = async (list) => {
    const files = [...list || []];
    if (!files.length) return;
    let meta = /* @__PURE__ */ new Map();
    const sidecar = files.find((f) => f.name === MUSIC_SIDECAR);
    if (sidecar) {
      try {
        meta = readSidecar(await sidecar.text());
      } catch (e) {
        toast(`描述文件没读成：${e.message}。先只导入音频`, "error");
      }
    }
    const audio = files.filter((f) => AUDIO_FILE.test(f.name)).sort((a, b) => a.name.localeCompare(b.name, "zh-CN", { numeric: true }));
    if (!audio.length) {
      toast("没找到音频文件（mp3、m4a、aac、ogg、opus、wav、flac）", "error");
      return;
    }
    const failed = [];
    let described = 0;
    for (let i = 0; i < audio.length; i++) {
      const file = audio[i];
      setProgress(`导入中 ${i + 1} / ${audio.length}：${file.name}`);
      try {
        const track = await api.uploadTrack(file);
        const m = meta.get(file.name);
        if (m) {
          await api.updateTrack(track.id, m);
          described++;
        }
      } catch (e) {
        failed.push(`${file.name}：${e.message}`);
      }
    }
    setProgress("");
    await loadMusic().catch(() => {
    });
    const done = audio.length - failed.length;
    toast(`导入了 ${done} 首${described ? `，其中 ${described} 首带上了描述` : ""}${failed.length ? `；${failed.length} 首失败：${failed.slice(0, 3).join("；")}` : ""}`, failed.length ? "error" : void 0);
  };
  const exportSidecar = () => {
    const blob = new Blob([writeSidecar(tracks || [])], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = MUSIC_SIDECAR;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1e3);
  };
  return /* @__PURE__ */ import_react5.default.createElement(import_react5.default.Fragment, null, /* @__PURE__ */ import_react5.default.createElement("div", { className: "fg-section" }, "播放"), /* @__PURE__ */ import_react5.default.createElement(Field, { label: "配乐" }, /* @__PURE__ */ import_react5.default.createElement("div", { className: "fg-row" }, /* @__PURE__ */ import_react5.default.createElement(Toggle, { value: cfg.ui.bgm, onChange: (v) => p({ bgm: v }) }), /* @__PURE__ */ import_react5.default.createElement("input", { type: "range", min: "0", max: "1", step: "0.05", value: cfg.ui.bgmVolume, onChange: (e) => p({ bgmVolume: Number(e.target.value) }), style: { flex: 1 } }))), /* @__PURE__ */ import_react5.default.createElement("div", { className: "fg-section" }, "我的曲库", tracks ? ` · ${tracks.length} 首` : ""), /* @__PURE__ */ import_react5.default.createElement("div", { className: "fg-note" }, "后台导演整理每一轮时会读到下面每首的描述和标签，自己决定这一幕放哪首、哪句话换歌。描述随便写：听感、乐器、适合的场面和情绪都行，越具体导演选得越准。导演还没整理完的轮次会先按描述粗配一首。"), /* @__PURE__ */ import_react5.default.createElement("div", { className: "fg-row", style: { margin: "1cqw 0" } }, /* @__PURE__ */ import_react5.default.createElement("button", { type: "button", className: "fg-btn is-primary", disabled: Boolean(progress), onClick: () => folderRef.current && folderRef.current.click() }, "导入文件夹"), /* @__PURE__ */ import_react5.default.createElement("button", { type: "button", className: "fg-btn", disabled: Boolean(progress), onClick: () => filesRef.current && filesRef.current.click() }, "添加曲子"), /* @__PURE__ */ import_react5.default.createElement("button", { type: "button", className: "fg-btn", disabled: !tracks || !tracks.some((t) => t.file), onClick: exportSidecar }, "导出描述"), progress && /* @__PURE__ */ import_react5.default.createElement("span", { className: "fg-pill is-busy" }, progress), /* @__PURE__ */ import_react5.default.createElement("input", { ref: folderRef, type: "file", webkitdirectory: "", multiple: true, hidden: true, onChange: (e) => {
    importFiles(e.target.files);
    e.target.value = "";
  } }), /* @__PURE__ */ import_react5.default.createElement("input", { ref: filesRef, type: "file", accept: `audio/*,${MUSIC_SIDECAR}`, multiple: true, hidden: true, onChange: (e) => {
    importFiles(e.target.files);
    e.target.value = "";
  } })), /* @__PURE__ */ import_react5.default.createElement("div", { className: "fg-note" }, "文件夹里放一份 ", /* @__PURE__ */ import_react5.default.createElement("code", null, MUSIC_SIDECAR), "（就是「导出描述」得到的文件），导入时会按文件名自动带上描述；同一首再导入不会重复存，但描述会以这个文件为准。"), !tracks && /* @__PURE__ */ import_react5.default.createElement("div", { className: "fg-note" }, "读取中…"), tracks && !tracks.length && /* @__PURE__ */ import_react5.default.createElement("div", { className: "fg-note", style: { marginTop: "1cqw" } }, "曲库还是空的。没有曲子时剧场不放音乐。"), tracks && tracks.map((t) => /* @__PURE__ */ import_react5.default.createElement(TrackCard, { key: t.id, track: t, playing: playing === t.id, onPlay: () => play(t) })));
}
var stamp = (t) => new Date(t).toLocaleString("zh-CN", { year: "numeric", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
function UpdateSection({ data }) {
  const u = useUpdate();
  const [busy, run] = useBusy();
  const act = (id, action, ok) => run(id, async () => setUpdate((await api.runUpdate(action)).update), ok);
  const last = u && u.last;
  return /* @__PURE__ */ import_react5.default.createElement(import_react5.default.Fragment, null, /* @__PURE__ */ import_react5.default.createElement("div", { className: "fg-section" }, "版本与更新"), !u && /* @__PURE__ */ import_react5.default.createElement("div", { className: "fg-note" }, "读取中…"), u && !u.managed && /* @__PURE__ */ import_react5.default.createElement(import_react5.default.Fragment, null, /* @__PURE__ */ import_react5.default.createElement(Field, { label: "当前版本" }, "v", "0.2.0"), /* @__PURE__ */ import_react5.default.createElement("div", { className: "fg-note" }, u.reason, " 想在这里一键更新：在 DSH 终端里 ", /* @__PURE__ */ import_react5.default.createElement("code", null, "git clone https://github.com/clanso/flowgal.git"), "，", /* @__PURE__ */ import_react5.default.createElement("code", null, "dsh plugin --profile tavern remove flowgal"), " 后再 ", /* @__PURE__ */ import_react5.default.createElement("code", null, "dsh plugin --profile tavern add"), " 这个文件夹，然后重启 DSH。")), u && u.managed && /* @__PURE__ */ import_react5.default.createElement(import_react5.default.Fragment, null, /* @__PURE__ */ import_react5.default.createElement(Field, { label: "当前版本", hint: u.current.subject }, "v", "0.2.0", " · ", u.current.sha, " · ", stamp(u.current.time)), /* @__PURE__ */ import_react5.default.createElement(Field, { label: "跟踪分支" }, u.current.tracking), u.restartRequired && /* @__PURE__ */ import_react5.default.createElement("div", { className: "fg-update-done" }, "✓ 新版本已经下载好了。重启 DSH（关掉再打开）后刷新网页，就会用上新版本。"), /* @__PURE__ */ import_react5.default.createElement(Field, { label: "远端" }, !last ? /* @__PURE__ */ import_react5.default.createElement("span", { className: "fg-note" }, "还没检查") : last.error ? /* @__PURE__ */ import_react5.default.createElement("span", { className: "fg-err" }, last.error, last.fallback ? `；可以改跟 ${last.fallback} 分支` : "") : last.behind ? /* @__PURE__ */ import_react5.default.createElement("b", { className: "fg-ok" }, "有新版本：", last.commits.length || last.behind, " 个更新（", last.target, "）") : /* @__PURE__ */ import_react5.default.createElement("span", { className: "fg-ok" }, "已是最新"), last && /* @__PURE__ */ import_react5.default.createElement("span", { className: "fg-note" }, "　检查于 ", stamp(last.checkedAt))), last && last.commits.length > 0 && /* @__PURE__ */ import_react5.default.createElement("div", { className: "fg-changes" }, last.commits.map((c) => /* @__PURE__ */ import_react5.default.createElement("div", { key: c.sha }, /* @__PURE__ */ import_react5.default.createElement("code", null, c.sha), /* @__PURE__ */ import_react5.default.createElement("span", null, c.subject), /* @__PURE__ */ import_react5.default.createElement("small", null, stamp(c.time))))), /* @__PURE__ */ import_react5.default.createElement("div", { className: "fg-row", style: { margin: "1cqw 0 0 15.2cqw" } }, /* @__PURE__ */ import_react5.default.createElement("button", { type: "button", className: "fg-btn", disabled: Boolean(busy), onClick: () => run("check", () => loadUpdate("force")) }, busy === "check" ? "检查中…" : "检查更新"), updateAvailable(u) && /* @__PURE__ */ import_react5.default.createElement("button", { type: "button", className: "fg-btn is-primary", disabled: Boolean(busy), onClick: () => act("apply", "apply", "已更新，重启 DSH 后生效") }, busy === "apply" ? "更新中…" : "立即更新"), last && last.gone && last.fallback && /* @__PURE__ */ import_react5.default.createElement("button", { type: "button", className: "fg-btn is-primary", disabled: Boolean(busy), onClick: () => act("switch", "switch", `已切到 ${last.fallback}，重启 DSH 后生效`) }, busy === "switch" ? "切换中…" : `改跟 ${last.fallback} 并更新`)), /* @__PURE__ */ import_react5.default.createElement("div", { className: "fg-note", style: { margin: "0.8cqw 0 0 15.2cqw" } }, "只做快进更新：你本地改过的文件不会被覆盖，有冲突时会停下来把原因写在这里。")), /* @__PURE__ */ import_react5.default.createElement(Field, { label: "自动检查", hint: "打开剧场时顺便看一眼有没有新版本，最多 12 小时一次。" }, /* @__PURE__ */ import_react5.default.createElement(Toggle, { value: data.config.ui.updateCheck, onChange: (v) => patchConfig({ ui: { updateCheck: v } }).catch((e) => toast(e.message, "error")) })));
}
function Settings({ onClose, onDirectorLog = null, initialTab = "look" }) {
  const data = useConfig();
  const [tab, setTab] = import_react5.default.useState(initialTab);
  return /* @__PURE__ */ import_react5.default.createElement(
    Panel,
    {
      title: "设置",
      en: "Config",
      onClose,
      tabs: [{ id: "look", label: "外观与演出" }, { id: "music", label: "配乐" }, { id: "director", label: "导演" }, { id: "images", label: "生图渠道" }, { id: "style", label: "画风与配图" }, { id: "about", label: "版本与更新" }],
      tab,
      onTab: setTab,
      actions: data && /* @__PURE__ */ import_react5.default.createElement("span", { className: `fg-pill${data.ready ? "" : " fg-err"}` }, data.ready ? "生图已就绪" : data.readyReason)
    },
    !data && /* @__PURE__ */ import_react5.default.createElement("div", { className: "fg-note" }, "读取设置中…"),
    data && tab === "look" && /* @__PURE__ */ import_react5.default.createElement(LookSection, { data }),
    data && tab === "music" && /* @__PURE__ */ import_react5.default.createElement(MusicSection, { data }),
    data && tab === "director" && /* @__PURE__ */ import_react5.default.createElement(DirectorSection, { data, onDirectorLog }),
    data && tab === "images" && /* @__PURE__ */ import_react5.default.createElement(BackendSection, { data }),
    data && tab === "style" && /* @__PURE__ */ import_react5.default.createElement(import_react5.default.Fragment, null, /* @__PURE__ */ import_react5.default.createElement(StyleSection, { data }), /* @__PURE__ */ import_react5.default.createElement(ImagesSection, { data })),
    data && tab === "about" && /* @__PURE__ */ import_react5.default.createElement(UpdateSection, { data }),
    data && /* @__PURE__ */ import_react5.default.createElement("div", { className: "fg-note", style: { marginTop: "2cqw" } }, "Key 只存在 DSH 宿主（优先存进 DSH 凭据库：", data.secretStorage, "），浏览器只看得到「有没有填」。")
  );
}

// src/client/theater/DirectorLog.jsx
var import_react6 = __toESM(require("react"), 1);
var STATUS = { running: ["整理中", "is-running"], ok: ["完成", "is-ok"], failed: ["失败", "is-failed"], cancelled: ["已停止", "is-cancelled"] };
var REASON = { auto: "正文写完后自动整理", force: "手动重新整理" };
var SOURCE = { tavern: "跟随 Tavern 后台模型", plugin: "插件设置里指定" };
var USAGE_LABEL = { inputTokens: "输入", outputTokens: "输出", reasoningTokens: "思考", cachedInputTokens: "缓存命中", cacheReadTokens: "缓存读", cacheWriteTokens: "缓存写", totalTokens: "合计" };
var SHAPE_LABEL = { landscape: "横版", portrait: "竖版", square: "方形" };
var num = (n) => Number(n || 0).toLocaleString("en-US");
var secs = (ms) => ms >= 6e4 ? `${Math.floor(ms / 6e4)} 分 ${Math.round(ms % 6e4 / 1e3)} 秒` : `${(ms / 1e3).toFixed(1)} 秒`;
var clock = (at) => new Date(at).toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" });
var usageText = (usage) => Object.entries(usage || {}).map(([k, v]) => `${USAGE_LABEL[k] || k} ${num(v)}`).join(" · ");
function useNow(active) {
  const [now, setNow] = import_react6.default.useState(Date.now());
  import_react6.default.useEffect(() => {
    if (!active) return void 0;
    const t = setInterval(() => setNow(Date.now()), 1e3);
    return () => clearInterval(t);
  }, [active]);
  return now;
}
function copy(text) {
  try {
    navigator.clipboard.writeText(text).then(() => toast("已复制"), () => toast("复制失败", "error"));
  } catch {
    toast("复制失败", "error");
  }
}
function Pre({ text, follow = false, cursor = false, empty = "（空）" }) {
  const ref = import_react6.default.useRef(null);
  const pinned = import_react6.default.useRef(true);
  import_react6.default.useLayoutEffect(() => {
    if (follow && pinned.current && ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [text, follow]);
  return /* @__PURE__ */ import_react6.default.createElement(
    "pre",
    {
      ref,
      className: `fg-dlog-pre${cursor ? " has-cursor" : ""}`,
      onScroll: (e) => {
        const el = e.currentTarget;
        pinned.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
      }
    },
    text || /* @__PURE__ */ import_react6.default.createElement("span", { className: "fg-note" }, empty)
  );
}
function Block({ label, text, children, actions }) {
  return /* @__PURE__ */ import_react6.default.createElement("div", { className: "fg-dlog-block" }, /* @__PURE__ */ import_react6.default.createElement("div", { className: "fg-dlog-label" }, /* @__PURE__ */ import_react6.default.createElement("span", null, label), /* @__PURE__ */ import_react6.default.createElement("span", { className: "fg-spacer" }), actions, text != null && /* @__PURE__ */ import_react6.default.createElement("button", { type: "button", className: "fg-btn is-mini", onClick: () => copy(text) }, "复制")), children);
}
function StatusPill({ status }) {
  const [label, cls] = STATUS[status] || [status, ""];
  return /* @__PURE__ */ import_react6.default.createElement("span", { className: `fg-dlog-status ${cls}` }, label);
}
function LogRow({ e, on, onClick }) {
  return /* @__PURE__ */ import_react6.default.createElement("button", { type: "button", className: `fg-dlog-row${on ? " is-on" : ""}`, onClick }, /* @__PURE__ */ import_react6.default.createElement("div", { className: "fg-dlog-row-head" }, /* @__PURE__ */ import_react6.default.createElement("b", null, "第 ", e.turn, " 轮"), /* @__PURE__ */ import_react6.default.createElement(StatusPill, { status: e.status })), /* @__PURE__ */ import_react6.default.createElement("div", { className: "fg-dlog-row-meta" }, clock(e.at), " · ", e.status === "running" ? "进行中" : secs(e.ms), e.attempts > 1 ? ` · ${e.attempts} 次尝试` : ""), /* @__PURE__ */ import_react6.default.createElement("div", { className: "fg-dlog-row-meta" }, e.model || "（没有模型）"), e.summary && /* @__PURE__ */ import_react6.default.createElement("div", { className: "fg-dlog-row-sum" }, e.summary), e.error && /* @__PURE__ */ import_react6.default.createElement("div", { className: "fg-dlog-row-sum fg-err" }, e.error));
}
function Chip({ k, children }) {
  return /* @__PURE__ */ import_react6.default.createElement("span", { className: "fg-dlog-chip" }, k && /* @__PURE__ */ import_react6.default.createElement("i", null, k), children);
}
function ScriptView({ script, units }) {
  if (!script) return /* @__PURE__ */ import_react6.default.createElement("div", { className: "fg-note" }, "这次没有得到可用的脚本，看「原始输出」里模型回了什么。");
  const s = script.scene;
  const tagged = units.filter((u) => script.lines[u.id] && Object.keys(script.lines[u.id]).length).length;
  return /* @__PURE__ */ import_react6.default.createElement(import_react6.default.Fragment, null, /* @__PURE__ */ import_react6.default.createElement(Block, { label: "场景" }, /* @__PURE__ */ import_react6.default.createElement("div", { className: "fg-dlog-chips" }, /* @__PURE__ */ import_react6.default.createElement(Chip, { k: "地点" }, s.location || "—"), /* @__PURE__ */ import_react6.default.createElement(Chip, { k: "时段" }, TIME_LABEL[s.time] || s.time), /* @__PURE__ */ import_react6.default.createElement(Chip, { k: "天气" }, WEATHER_LABEL[s.weather] || s.weather), /* @__PURE__ */ import_react6.default.createElement(Chip, { k: "配乐" }, MOOD_LABEL[s.mood] || s.mood), /* @__PURE__ */ import_react6.default.createElement(Chip, { k: "转场" }, TRANSITION_LABEL[s.transition] || s.transition)), s.bg && /* @__PURE__ */ import_react6.default.createElement("div", { className: "fg-note" }, "背景提示词：", s.bg)), /* @__PURE__ */ import_react6.default.createElement(Block, { label: `在场 · ${script.cast.length}` }, /* @__PURE__ */ import_react6.default.createElement("div", { className: "fg-dlog-chips" }, script.cast.map((c) => /* @__PURE__ */ import_react6.default.createElement(Chip, { key: c.name, k: POS_LABEL[c.pos] || c.pos }, c.name)), !script.cast.length && /* @__PURE__ */ import_react6.default.createElement("span", { className: "fg-note" }, "没有人物上场"))), /* @__PURE__ */ import_react6.default.createElement(Block, { label: `逐句标注 · ${tagged} / ${units.length} 句` }, /* @__PURE__ */ import_react6.default.createElement("div", { className: "fg-dlog-lines" }, units.map((u) => {
    const l = script.lines[u.id] || {};
    const marks = [
      l.sp && /* @__PURE__ */ import_react6.default.createElement(Chip, { key: "sp", k: "说话" }, l.sp, l.as ? `（显示为 ${l.as}）` : ""),
      l.emo && /* @__PURE__ */ import_react6.default.createElement(Chip, { key: "emo", k: "表情" }, EMOTION_LABEL[l.emo] || l.emo),
      l.sym && /* @__PURE__ */ import_react6.default.createElement(Chip, { key: "sym", k: "符号" }, SYMBOL_LABEL[l.sym] || l.sym),
      l.cam && /* @__PURE__ */ import_react6.default.createElement(Chip, { key: "cam", k: "镜头" }, CAMERA_LABEL[l.cam] || l.cam),
      l.card && /* @__PURE__ */ import_react6.default.createElement(Chip, { key: "card", k: "卡片" }, CARD_LABEL[l.card] || l.card)
    ].filter(Boolean);
    return /* @__PURE__ */ import_react6.default.createElement("div", { key: u.id, className: `fg-dlog-line${marks.length ? "" : " is-plain"}` }, /* @__PURE__ */ import_react6.default.createElement("span", { className: "fg-dlog-uid" }, u.id), /* @__PURE__ */ import_react6.default.createElement("div", { className: "fg-dlog-utext" }, u.type === "dialogue" ? `「${u.text}」` : u.type === "thought" ? `（${u.text}）` : u.text), /* @__PURE__ */ import_react6.default.createElement("div", { className: "fg-dlog-chips" }, marks.length ? marks : /* @__PURE__ */ import_react6.default.createElement("span", { className: "fg-note" }, "旁白 · 无演出")));
  }))), script.choices.length > 0 && /* @__PURE__ */ import_react6.default.createElement(Block, { label: `选项 · ${script.choices.length}` }, /* @__PURE__ */ import_react6.default.createElement("ol", { className: "fg-dlog-list-plain" }, script.choices.map((c, i) => /* @__PURE__ */ import_react6.default.createElement("li", { key: i }, c)))), /* @__PURE__ */ import_react6.default.createElement(Block, { label: `插画分镜 · ${script.images.length}` }, script.images.map((img, i) => /* @__PURE__ */ import_react6.default.createElement("div", { key: i, className: "fg-dlog-card" }, /* @__PURE__ */ import_react6.default.createElement("div", { className: "fg-dlog-chips" }, /* @__PURE__ */ import_react6.default.createElement(Chip, { k: "标题" }, img.title || "—"), /* @__PURE__ */ import_react6.default.createElement(Chip, { k: "位置" }, img.after, " 之后"), /* @__PURE__ */ import_react6.default.createElement(Chip, { k: "画幅" }, SHAPE_LABEL[img.shape] || img.shape)), /* @__PURE__ */ import_react6.default.createElement("div", { className: "fg-dlog-mono" }, img.tags), img.desc && /* @__PURE__ */ import_react6.default.createElement("div", { className: "fg-note" }, img.desc))), !script.images.length && /* @__PURE__ */ import_react6.default.createElement("div", { className: "fg-note" }, "导演觉得这一轮不需要插画（或设置里关了自动插画）。")), /* @__PURE__ */ import_react6.default.createElement(Block, { label: `外貌档案更新 · ${script.people.length}` }, script.people.map((p, i) => /* @__PURE__ */ import_react6.default.createElement("div", { key: i, className: "fg-dlog-card" }, /* @__PURE__ */ import_react6.default.createElement("b", null, p.name), p.gender ? /* @__PURE__ */ import_react6.default.createElement("span", { className: "fg-note" }, " · ", p.gender) : null, p.appearance && /* @__PURE__ */ import_react6.default.createElement("div", { className: "fg-dlog-mono" }, "建档：", p.appearance), p.change && /* @__PURE__ */ import_react6.default.createElement("div", { className: "fg-dlog-mono" }, "永久变化：", p.change), p.temp && /* @__PURE__ */ import_react6.default.createElement("div", { className: "fg-dlog-mono" }, "临时状态：", p.temp))), !script.people.length && /* @__PURE__ */ import_react6.default.createElement("div", { className: "fg-note" }, "这一轮没有新建或修改档案。")));
}
function Attempts({ attempts }) {
  if (!attempts.length) return /* @__PURE__ */ import_react6.default.createElement("div", { className: "fg-note" }, "还没有发出请求。");
  return attempts.map((a, i) => /* @__PURE__ */ import_react6.default.createElement(Block, { key: i, text: a.output, label: /* @__PURE__ */ import_react6.default.createElement(import_react6.default.Fragment, null, "第 ", i + 1, " 次", a.note ? ` · ${a.note}` : "", " · 最大输出 ", num(a.maxTokens), " · ", secs(a.ms), a.usage ? ` · ${usageText(a.usage)}` : "") }, a.error && /* @__PURE__ */ import_react6.default.createElement("div", { className: "fg-err fg-dlog-error" }, a.error), a.reasoning && /* @__PURE__ */ import_react6.default.createElement("details", { className: "fg-dlog-think" }, /* @__PURE__ */ import_react6.default.createElement("summary", null, "模型思考 · ", num(a.reasoning.length), " 字"), /* @__PURE__ */ import_react6.default.createElement(Pre, { text: a.reasoning })), /* @__PURE__ */ import_react6.default.createElement(Pre, { text: a.output, empty: "（模型没有输出文字）" })));
}
function LogDetail({ gameId, summary }) {
  const running = summary.status === "running";
  const [entry, setEntry] = import_react6.default.useState(null);
  const [loadError, setLoadError] = import_react6.default.useState("");
  const [tab, setTab] = import_react6.default.useState(running ? "live" : "result");
  const [stopping, setStopping] = import_react6.default.useState(false);
  const now = useNow(running);
  import_react6.default.useEffect(() => {
    let off = false;
    api.directorEntry(gameId, summary.id).then((r) => {
      if (!off) {
        setEntry(r.entry);
        setLoadError("");
      }
    }, (e) => {
      if (!off) setLoadError(String(e.message || e));
    });
    return () => {
      off = true;
    };
  }, [gameId, summary.id, summary.status, running ? summary.attempts : 0]);
  import_react6.default.useEffect(() => {
    if (!running && tab === "live") setTab("result");
  }, [running]);
  const stop = async () => {
    setStopping(true);
    try {
      await api.cancel(gameId, "director", summary.id);
      toast("已停止这次整理");
    } catch (e) {
      toast(String(e.message || e), "error");
    } finally {
      setStopping(false);
    }
  };
  const tabs = running ? [["live", "实时输出"], ["prompt", "提示词"]] : [["result", "整理结果"], ["raw", `原始输出${summary.attempts > 1 ? ` · ${summary.attempts} 次` : ""}`], ["prompt", "提示词"]];
  const live = summary.live || { output: "", reasoning: "", chars: 0, note: "" };
  const elapsed = running ? Math.max(summary.ms, now - summary.at) : summary.ms;
  return /* @__PURE__ */ import_react6.default.createElement("div", { className: "fg-dlog-detail" }, /* @__PURE__ */ import_react6.default.createElement("div", { className: "fg-dlog-head" }, /* @__PURE__ */ import_react6.default.createElement("div", { className: "fg-dlog-title" }, "第 ", summary.turn, " 轮 ", /* @__PURE__ */ import_react6.default.createElement(StatusPill, { status: summary.status }), /* @__PURE__ */ import_react6.default.createElement("span", { className: "fg-spacer" }), running && /* @__PURE__ */ import_react6.default.createElement("button", { type: "button", className: "fg-btn", disabled: stopping, onClick: stop }, "停止整理")), /* @__PURE__ */ import_react6.default.createElement("div", { className: "fg-dlog-facts" }, /* @__PURE__ */ import_react6.default.createElement("div", null, /* @__PURE__ */ import_react6.default.createElement("i", null, "模型"), summary.model || "—", summary.provider ? /* @__PURE__ */ import_react6.default.createElement("span", { className: "fg-note" }, " · ", summary.provider) : null, SOURCE[summary.source] ? /* @__PURE__ */ import_react6.default.createElement("span", { className: "fg-note" }, "（", SOURCE[summary.source], "）") : null), /* @__PURE__ */ import_react6.default.createElement("div", null, /* @__PURE__ */ import_react6.default.createElement("i", null, "时间"), clock(summary.at), " · ", secs(elapsed), " · ", REASON[summary.reason] || summary.reason), /* @__PURE__ */ import_react6.default.createElement("div", null, /* @__PURE__ */ import_react6.default.createElement("i", null, "最大输出"), num(summary.maxTokens), " token", entry && entry.temperature != null ? ` · 温度 ${entry.temperature}` : ""), /* @__PURE__ */ import_react6.default.createElement("div", null, /* @__PURE__ */ import_react6.default.createElement("i", null, "模型窗口"), summary.window ? `${num(summary.window)} token` : "DSH 没给窗口大小，按设置原样发", entry && entry.outputDefault ? /* @__PURE__ */ import_react6.default.createElement("span", { className: "fg-note" }, " · 模型默认输出 ", num(entry.outputDefault)) : null), entry && /* @__PURE__ */ import_react6.default.createElement("div", null, /* @__PURE__ */ import_react6.default.createElement("i", null, "资料"), entry.contextLength ? `发了 ${num(entry.contextChars)} 字（人物卡与世界书共 ${num(entry.contextLength)} 字）` : "这张卡没有人物卡 / 世界书资料"), summary.usage && /* @__PURE__ */ import_react6.default.createElement("div", null, /* @__PURE__ */ import_react6.default.createElement("i", null, "用量"), usageText(summary.usage))), summary.notes.map((n, i) => /* @__PURE__ */ import_react6.default.createElement("div", { key: i, className: "fg-dlog-notice" }, "⚠ ", n)), summary.error && /* @__PURE__ */ import_react6.default.createElement("div", { className: "fg-err fg-dlog-error" }, summary.error)), /* @__PURE__ */ import_react6.default.createElement("div", { className: "fg-tabs fg-dlog-tabs" }, tabs.map(([id, label]) => /* @__PURE__ */ import_react6.default.createElement("button", { key: id, type: "button", className: `fg-tab${tab === id ? " is-on" : ""}`, onClick: () => setTab(id) }, label))), loadError && /* @__PURE__ */ import_react6.default.createElement("div", { className: "fg-err" }, loadError), tab === "live" && /* @__PURE__ */ import_react6.default.createElement(import_react6.default.Fragment, null, /* @__PURE__ */ import_react6.default.createElement("div", { className: "fg-dlog-meter" }, /* @__PURE__ */ import_react6.default.createElement("span", { className: "fg-dlog-dot" }), live.note || `第 ${summary.attempts || 1} 次请求`, " · 已收到 ", num(live.chars), " 字", live.chars ? "" : live.reasoning ? " · 模型在思考" : " · 等模型开口…"), live.reasoning && /* @__PURE__ */ import_react6.default.createElement(Block, { label: "模型思考（实时）" }, /* @__PURE__ */ import_react6.default.createElement(Pre, { text: live.reasoning, follow: true })), /* @__PURE__ */ import_react6.default.createElement(Block, { label: "模型输出（实时）" }, /* @__PURE__ */ import_react6.default.createElement(Pre, { text: live.output, follow: true, cursor: true, empty: "还没有输出" }))), tab === "result" && (entry ? /* @__PURE__ */ import_react6.default.createElement(ScriptView, { script: entry.script, units: entry.units || [] }) : /* @__PURE__ */ import_react6.default.createElement("div", { className: "fg-note" }, "读取中…")), tab === "raw" && (entry ? /* @__PURE__ */ import_react6.default.createElement(Attempts, { attempts: entry.attempts || [] }) : /* @__PURE__ */ import_react6.default.createElement("div", { className: "fg-note" }, "读取中…")), tab === "prompt" && (entry ? /* @__PURE__ */ import_react6.default.createElement(import_react6.default.Fragment, null, /* @__PURE__ */ import_react6.default.createElement(Block, { label: `系统提示词 · ${num((entry.system || "").length)} 字`, text: entry.system }, /* @__PURE__ */ import_react6.default.createElement(Pre, { text: entry.system })), /* @__PURE__ */ import_react6.default.createElement(Block, { label: `用户消息 · ${num((entry.user || "").length)} 字（资料 + 上一幕 + 外貌档案 + 本轮正文单元）`, text: entry.user }, /* @__PURE__ */ import_react6.default.createElement(Pre, { text: entry.user }))) : /* @__PURE__ */ import_react6.default.createElement("div", { className: "fg-note" }, "读取中…")));
}
function DirectorLog({ gameId, onClose, focusTurn = null }) {
  const { log, error } = useDirectorLog(gameId);
  const [selected, setSelected] = import_react6.default.useState("");
  const items = log ? [...log.running, ...log.entries] : [];
  const current = items.find((e) => e.id === selected) || focusTurn != null && items.find((e) => e.turn === focusTurn) || items[0];
  return /* @__PURE__ */ import_react6.default.createElement(
    Panel,
    {
      title: "导演日志",
      en: "Director",
      onClose,
      actions: log && /* @__PURE__ */ import_react6.default.createElement("span", { className: "fg-pill" }, log.running.length ? `${log.running.length} 个整理中 · ` : "", "保留最近 ", log.keep, " 次")
    },
    !log && /* @__PURE__ */ import_react6.default.createElement("div", { className: "fg-note" }, error ? "读取失败：" + error : "读取中…"),
    log && !items.length && /* @__PURE__ */ import_react6.default.createElement("div", { className: "fg-note" }, "这一局还没有导演记录。每轮正文写完后，后台导演把它整理成场景：谁在说话、表情、站位、镜头、插画分镜、选项。整理的全过程都会记在这里。"),
    current && /* @__PURE__ */ import_react6.default.createElement("div", { className: "fg-dlog" }, /* @__PURE__ */ import_react6.default.createElement("div", { className: "fg-dlog-side" }, items.map((e) => /* @__PURE__ */ import_react6.default.createElement(LogRow, { key: e.id, e, on: e.id === current.id, onClick: () => setSelected(e.id) }))), /* @__PURE__ */ import_react6.default.createElement(LogDetail, { key: current.id, gameId, summary: current }))
  );
}

// src/client/theater/Theater.jsx
var POS_KEY = (gameId) => "flowgal:pos:" + gameId;
var readPos = (gameId) => {
  try {
    return localStorage.getItem(POS_KEY(gameId)) || "";
  } catch {
    return "";
  }
};
var writePos = (gameId, key) => {
  try {
    localStorage.setItem(POS_KEY(gameId), key);
  } catch {
  }
};
var GLYPH_AHEAD = 12;
var GLYPH_WAIT = 1200;
var glyphsOf = (list) => ({
  body: list.map((b) => b.text).join(""),
  display: list.map((b) => (b.alias || b.speaker) + b.scene.location + (b.card ? b.text : "")).join("")
});
function fillComposer(text) {
  try {
    navigator.clipboard && navigator.clipboard.writeText(text).catch(() => {
    });
  } catch {
  }
  const candidates = [...document.querySelectorAll('textarea, [contenteditable="true"]')].filter((el2) => !el2.closest(".fg-theater") && el2.getClientRects().length);
  const el = candidates.sort((a, b) => b.getBoundingClientRect().bottom - a.getBoundingClientRect().bottom)[0];
  if (!el) return false;
  try {
    if (el.tagName === "TEXTAREA") {
      const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value").set;
      setter.call(el, text);
      el.dispatchEvent(new Event("input", { bubbles: true }));
    } else {
      el.focus();
      document.execCommand("selectAll", false);
      document.execCommand("insertText", false, text);
    }
    setTimeout(() => {
      try {
        el.focus();
      } catch {
      }
    }, 60);
    return true;
  } catch {
    return false;
  }
}
function firstBeatOfTurn(beats, turn) {
  const i = beats.findIndex((b) => b.turn === turn);
  return i < 0 ? -1 : i;
}
function TheaterRoot() {
  const s = useUi();
  const data = useConfig();
  const cfg = data && data.config;
  const watching = s.open || Boolean(s.resume) || Boolean(cfg && cfg.ui.autoOpen && s.lastGameId);
  const gameId = s.open ? s.gameId : s.resume && s.resume.gameId || s.lastGameId;
  const { view, error } = useGameView(gameId, watching);
  const maxTurn = view && view.turns.length ? view.turns[view.turns.length - 1].turn : -1;
  const seen = import_react7.default.useRef({ gameId: "", turn: -1 });
  import_react7.default.useEffect(() => {
    if (!view || view.gameId !== gameId) return;
    if (seen.current.gameId !== gameId) {
      seen.current = { gameId, turn: maxTurn };
    }
    const isNew = maxTurn > seen.current.turn;
    seen.current.turn = Math.max(seen.current.turn, maxTurn);
    if (s.open || !isNew) return;
    if (s.resume && s.resume.gameId === gameId && maxTurn > s.resume.afterTurn || cfg && cfg.ui.autoOpen) openTheater(gameId, { turn: maxTurn });
  }, [view, maxTurn, s.open]);
  import_react7.default.useEffect(() => {
    if (!s.open) stopBgm();
  }, [s.open]);
  if (!s.open) return null;
  return /* @__PURE__ */ import_react7.default.createElement(Theater, { key: s.gameId, gameId: s.gameId, view, viewError: error, cfg, startTurn: s.startTurn, panel: s.panel, panelArg: s.panelArg });
}
function Theater({ gameId, view, viewError, cfg, startTurn, panel: initialPanel, panelArg }) {
  const ui0 = cfg && cfg.ui || { skin: "stellar", textSpeed: 30, autoDelay: 1400, blip: true, bgm: true, bgmVolume: 0.45, particles: true, fontBase: "" };
  const { beats, byKey } = import_react7.default.useMemo(() => buildBeats(view), [view]);
  const [index, setIndex] = import_react7.default.useState(-1);
  const [title, setTitle] = import_react7.default.useState(startTurn == null && !initialPanel);
  const [panel, setPanel] = import_react7.default.useState(initialPanel || "");
  const [settingsTab, setSettingsTab] = import_react7.default.useState(initialPanel === "settings" && typeof panelArg === "string" ? panelArg : "look");
  const update = useUpdate(Boolean(cfg && cfg.ui.updateCheck));
  const [auto, setAuto] = import_react7.default.useState(false);
  const [skip, setSkip] = import_react7.default.useState(false);
  const [hidden, setHidden] = import_react7.default.useState(false);
  const [choosing, setChoosing] = import_react7.default.useState(false);
  const [closing, setClosing] = import_react7.default.useState(false);
  const anchor = import_react7.default.useRef("");
  const rootRef = import_react7.default.useRef(null);
  const [glyphKey, setGlyphKey] = import_react7.default.useState("");
  const placed = import_react7.default.useRef(false);
  const waits = import_react7.default.useRef(0);
  import_react7.default.useEffect(() => {
    if (placed.current || !beats.length) return;
    let i = -1;
    if (startTurn != null) i = firstBeatOfTurn(beats, Number(startTurn));
    if (i < 0 && startTurn != null && waits.current++ < 1) return;
    placed.current = true;
    if (i < 0) {
      const saved = byKey.get(readPos(gameId));
      if (saved != null) i = saved;
    }
    if (i < 0) i = firstBeatOfTurn(beats, beats[beats.length - 1].turn);
    anchor.current = beats[i].key;
    setIndex(i);
  }, [beats]);
  import_react7.default.useEffect(() => {
    if (!placed.current || !anchor.current) return;
    const i = byKey.get(anchor.current);
    if (i != null && i !== index) setIndex(i);
  }, [byKey]);
  const beat = index >= 0 ? beats[index] : null;
  const speed = skip ? 0 : ui0.textSpeed;
  const holdText = Boolean(beat) && glyphKey !== beat.key;
  const [done, chars, finish] = useTypewriter(beat, title || panel ? 0 : speed, { sound: ui0.blip && !skip && !title, hold: holdText });
  const cam = useCamera(title ? null : beat);
  const people = import_react7.default.useMemo(() => new Map((view && view.cast || []).map((p) => [p.name, p])), [view]);
  const atEnd = beat && index === beats.length - 1;
  import_react7.default.useEffect(() => {
    loadSkinFonts(ui0.skin, ui0.fontBase);
  }, [ui0.skin, ui0.fontBase]);
  import_react7.default.useEffect(() => {
    if (!beat) return void 0;
    let live = true;
    loadSkinFonts(ui0.skin, ui0.fontBase).then(() => loadGlyphs(rootRef.current, glyphsOf([beat]), GLYPH_WAIT)).then(() => {
      if (live) setGlyphKey(beat.key);
    });
    return () => {
      live = false;
    };
  }, [beat && beat.key, ui0.skin, ui0.fontBase]);
  import_react7.default.useEffect(() => {
    if (index < 0) return;
    loadSkinFonts(ui0.skin, ui0.fontBase).then(() => loadGlyphs(rootRef.current, glyphsOf(beats.slice(index + 1, index + 1 + GLYPH_AHEAD))));
  }, [index, beats, ui0.skin, ui0.fontBase]);
  const scene = beat ? beat.scene : (beats[beats.length - 1] || {}).scene;
  const tracks = useMusic();
  const musicBeat = beat || beats[beats.length - 1];
  const track = import_react7.default.useMemo(() => ui0.bgm ? pickTrack(musicBeat, tracks, assetUrl) : null, [ui0.bgm, tracks, musicBeat && musicBeat.bgm, scene && scene.mood, scene && scene.location]);
  import_react7.default.useEffect(() => {
    if (track || !ui0.bgm) playBgm(track, ui0.bgmVolume);
  }, [track && track.id, ui0.bgm, ui0.bgmVolume]);
  const go = import_react7.default.useCallback((i) => {
    if (!beats.length) return;
    const next = Math.max(0, Math.min(beats.length - 1, i));
    anchor.current = beats[next].key;
    writePos(gameId, beats[next].key);
    setIndex(next);
  }, [beats, gameId]);
  const advance = import_react7.default.useCallback(() => {
    if (!beat) return;
    if (!done) {
      finish();
      return;
    }
    if (atEnd) {
      setAuto(false);
      setSkip(false);
      setChoosing(true);
      return;
    }
    sfx("page");
    go(index + 1);
  }, [beat, done, atEnd, index, go, finish]);
  import_react7.default.useEffect(() => {
    if (title || panel || choosing || !beat) return void 0;
    if (skip) {
      const t = setTimeout(() => atEnd ? setSkip(false) : go(index + 1), 70);
      return () => clearTimeout(t);
    }
    if (auto && done && !atEnd) {
      const t = setTimeout(() => go(index + 1), ui0.autoDelay + chars.length * 18);
      return () => clearTimeout(t);
    }
    return void 0;
  }, [auto, skip, done, index, title, panel, choosing, atEnd]);
  const prevLen = import_react7.default.useRef(beats.length);
  import_react7.default.useEffect(() => {
    if (beats.length > prevLen.current && choosing && index === prevLen.current - 1) {
      setChoosing(false);
      go(index + 1);
    }
    prevLen.current = beats.length;
  }, [beats.length]);
  const close = import_react7.default.useCallback(() => {
    setClosing(true);
    stopBgm();
    setTimeout(() => ui.set({ open: false }), 320);
  }, []);
  const choose = (text) => {
    const ok = fillComposer(text);
    toast(ok ? "已填进输入框，发送后剧场会自动接着演" : "已复制到剪贴板，粘贴到输入框发送即可");
    ui.set({ resume: { gameId, afterTurn: beat ? beat.turn : -1 } });
    setChoosing(false);
    close();
  };
  import_react7.default.useEffect(() => {
    const onKey = (e) => {
      if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.isContentEditable)) return;
      if (e.key === "Escape") {
        e.preventDefault();
        if (panel) setPanel("");
        else if (choosing) setChoosing(false);
        else if (hidden) setHidden(false);
        else close();
        return;
      }
      if (panel || title) return;
      if (e.key === " " || e.key === "Enter" || e.key === "ArrowRight" || e.key === "PageDown") {
        e.preventDefault();
        if (hidden) setHidden(false);
        else if (!choosing) advance();
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        go(index - 1);
      } else if (e.key === "a" || e.key === "A") setAuto((v) => !v);
      else if (e.key === "h" || e.key === "H") setHidden((v) => !v);
      else if (e.key === "l" || e.key === "L") setPanel("log");
      else if (e.key === "Control") setSkip(true);
    };
    const onUp = (e) => {
      if (e.key === "Control") setSkip(false);
    };
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("keyup", onUp, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("keyup", onUp, true);
    };
  }, [advance, go, index, panel, title, choosing, hidden, close]);
  const directing = view && view.turns.some((t) => t.status === "directing");
  const queue = view && view.queue || { running: [], waiting: [] };
  const drawing = queue.running.filter((id) => id.includes(":" + gameId + ":")).length + queue.waiting.filter((id) => id.includes(":" + gameId + ":")).length;
  const speakerPerson = beat && people.get(beat.speaker);
  const color = beat && beat.speaker === "我" ? "var(--accent2)" : speakerPerson ? speakerPerson.color : "";
  const progressInTurn = beat ? (() => {
    const all = beats.filter((b) => b.turn === beat.turn);
    return (all.indexOf(beat) + 1) / all.length;
  })() : 0;
  const status = beat ? beat.status === "directing" ? `第 ${beat.turn} 轮 · 导演整理中，先按原文演` : beat.status === "failed" ? `第 ${beat.turn} 轮 · 没整理好，按原文演` : "" : "";
  const quick = {
    speed,
    emoLabel: beat && beat.emo ? EMOTION_LABEL[beat.emo] : "",
    items: [
      { id: "auto", label: "AUTO", title: "自动播放（A）", on: auto, run: () => {
        setAuto((v) => !v);
        setSkip(false);
      } },
      { id: "skip", label: "SKIP", title: "快进（按住 Ctrl）", on: skip, run: () => {
        setSkip((v) => !v);
        setAuto(false);
      } },
      { id: "log", label: "LOG", title: "回想（L）", run: () => setPanel("log") },
      { id: "director", label: "DIR", title: "导演日志：每次后台整理的提示词、实时输出和结果", run: () => setPanel("director") },
      { id: "cg", label: "CG", title: "鉴赏", run: () => setPanel("gallery") },
      { id: "cast", label: "CAST", title: "人物志", run: () => setPanel("cast") },
      { id: "hide", label: "HIDE", title: "隐藏界面（H）", run: () => setHidden(true) },
      { id: "config", label: "CONFIG", title: "设置", run: () => setPanel("settings") }
    ]
  };
  const stageBeat = beat || (beats.length ? beats[beats.length - 1] : null);
  const stageScene = stageBeat ? stageBeat.scene : { location: "", time: "night", weather: "stars", mood: "calm" };
  const latest = beats.length ? beats[beats.length - 1] : null;
  const cardTitle = view && view.card && view.card.name || "FlowGal";
  const titleMenu = [
    beats.length && readPos(gameId) ? { id: "continue", label: "继续", en: "Continue", run: () => {
      setTitle(false);
      sfx("open");
    } } : null,
    latest ? { id: "latest", label: "最新一幕", en: "Latest", run: () => {
      go(firstBeatOfTurn(beats, latest.turn));
      setTitle(false);
      sfx("open");
    } } : null,
    !beats.length && gameId ? { id: "opening", label: "整理开场白", en: "Prologue", run: async () => {
      try {
        await api.direct(gameId, 0).catch(() => api.direct(gameId, 1));
        toast("开场已整理");
        setTitle(false);
      } catch (e) {
        toast(String(e.message || e), "error");
      }
    } } : null,
    beats.length ? { id: "log", label: "回想", en: "Backlog", run: () => setPanel("log") } : null,
    gameId ? { id: "director", label: "导演日志", en: "Director", run: () => setPanel("director") } : null,
    { id: "gallery", label: "鉴赏", en: "Gallery", run: () => setPanel("gallery") },
    { id: "cast", label: "人物志", en: "Characters", run: () => setPanel("cast") },
    updateAvailable(update) ? { id: "update", label: "更新插件", en: "New version", badge: true, run: () => {
      setSettingsTab("about");
      setPanel("settings");
    } } : null,
    { id: "settings", label: "设置", en: "Config", run: () => {
      setSettingsTab("look");
      setPanel("settings");
    } },
    { id: "quit", label: "回到聊天", en: "Return", run: close }
  ].filter(Boolean);
  return /* @__PURE__ */ import_react7.default.createElement("div", { ref: rootRef, className: `fg-theater${closing ? " is-closing" : ""}${hidden ? " fg-ui-hidden" : ""}`, "data-skin": ui0.skin, role: "dialog", "aria-label": "FlowGal 剧场" }, /* @__PURE__ */ import_react7.default.createElement(
    "div",
    {
      className: "fg-stage",
      onClick: () => {
        if (hidden) {
          setHidden(false);
          return;
        }
        if (!title && !panel && !choosing) advance();
      },
      onWheel: (e) => {
        if (!title && !panel && e.deltaY < -30) setPanel("log");
      }
    },
    /* @__PURE__ */ import_react7.default.createElement("div", { className: "fg-camera", "data-cam": cam }, /* @__PURE__ */ import_react7.default.createElement(Backdrop, { scene: stageScene, view, transition: stageBeat ? stageBeat.sceneEnter ? stageBeat.transition : "dissolve" : "dissolve" }), /* @__PURE__ */ import_react7.default.createElement("div", { className: "fg-grade", "data-time": stageScene.time }), stageBeat && /* @__PURE__ */ import_react7.default.createElement(Cast, { beat: title ? { ...stageBeat, speaker: "", sym: "" } : stageBeat, view }), stageBeat && !title && /* @__PURE__ */ import_react7.default.createElement(CgLayer, { beat: stageBeat }), /* @__PURE__ */ import_react7.default.createElement(Particles, { weather: stageScene.weather, enabled: ui0.particles !== false }), /* @__PURE__ */ import_react7.default.createElement("div", { className: "fg-vignette" })),
    beat && !title && /* @__PURE__ */ import_react7.default.createElement(Flash, { beat }),
    beat && !title && /* @__PURE__ */ import_react7.default.createElement(TitleCard, { beat }),
    !title && beat && /* @__PURE__ */ import_react7.default.createElement("div", { className: "fg-hud" }, /* @__PURE__ */ import_react7.default.createElement("div", { className: "fg-hud-bar" }), /* @__PURE__ */ import_react7.default.createElement("div", null, /* @__PURE__ */ import_react7.default.createElement("div", { className: "fg-hud-place" }, beat.scene.location || `第 ${beat.turn} 轮`), /* @__PURE__ */ import_react7.default.createElement("div", { className: "fg-hud-meta" }, /* @__PURE__ */ import_react7.default.createElement("span", null, TIME_LABEL[beat.scene.time] || ""), beat.scene.weather && beat.scene.weather !== "clear" && /* @__PURE__ */ import_react7.default.createElement("span", null, WEATHER_LABEL[beat.scene.weather]), beat.scene.mood && /* @__PURE__ */ import_react7.default.createElement("span", null, "♪ ", MOOD_LABEL[beat.scene.mood])))),
    !title && /* @__PURE__ */ import_react7.default.createElement("div", { className: "fg-topright", onClick: (e) => e.stopPropagation() }, directing && /* @__PURE__ */ import_react7.default.createElement("button", { type: "button", className: "fg-pill is-busy is-link", title: "看导演正在写什么", onClick: () => setPanel("director") }, "导演整理中 ›"), drawing > 0 && /* @__PURE__ */ import_react7.default.createElement("span", { className: "fg-pill is-busy" }, "出图 ", drawing), track && /* @__PURE__ */ import_react7.default.createElement("span", { className: "fg-pill", title: track.name }, "♪ ", track.name), viewError && /* @__PURE__ */ import_react7.default.createElement("span", { className: "fg-pill fg-err", title: viewError }, "连接中断，重连中"), /* @__PURE__ */ import_react7.default.createElement("button", { type: "button", className: "fg-iconbtn", title: "回到聊天（Esc）", onClick: close }, "✕")),
    beat && !title && beat.card && /* @__PURE__ */ import_react7.default.createElement(SceneCard, { beat }),
    beat && !title && /* @__PURE__ */ import_react7.default.createElement(DialogBox, { beat, chars, done, waiting: holdText, color, quick, progress: progressInTurn, status, hiddenText: Boolean(beat.card) }),
    !beat && !title && /* @__PURE__ */ import_react7.default.createElement("div", { className: "fg-choices" }, /* @__PURE__ */ import_react7.default.createElement("div", { className: "fg-choices-title" }, view ? "这一局还没有可以演的内容" : "读取中")),
    choosing && beat && /* @__PURE__ */ import_react7.default.createElement(Choices, { choices: beat.choices, waiting: directing, onChoose: choose, onBack: close }),
    title && /* @__PURE__ */ import_react7.default.createElement("div", { className: "fg-title", onClick: (e) => e.stopPropagation() }, /* @__PURE__ */ import_react7.default.createElement("div", { className: "fg-title-kicker" }, "FlowGal · DSH Tavern"), /* @__PURE__ */ import_react7.default.createElement("div", { className: "fg-title-logo" }, cardTitle), /* @__PURE__ */ import_react7.default.createElement("div", { className: "fg-title-sub" }, latest ? `第 ${latest.turn} 轮 · ${latest.scene.location || "—"} · ${TIME_LABEL[latest.scene.time] || ""}` : gameId ? "开场白还没有整理" : "先在聊天里打开一局"), /* @__PURE__ */ import_react7.default.createElement("div", { className: "fg-title-menu" }, titleMenu.map((m, i) => /* @__PURE__ */ import_react7.default.createElement("button", { key: m.id, type: "button", className: m.badge ? "is-new" : void 0, style: { "--i": i }, onMouseEnter: () => sfx("hover"), onClick: () => {
      sfx("select");
      m.run();
    } }, m.label, /* @__PURE__ */ import_react7.default.createElement("span", null, m.en)))), /* @__PURE__ */ import_react7.default.createElement("div", { className: "fg-title-foot" }, "FlowGal · 字体 思源 / 霞鹜文楷 / 马善政 / Cormorant（SIL OFL）")),
    panel === "log" && /* @__PURE__ */ import_react7.default.createElement(Backlog, { beats, index, gameId, onClose: () => setPanel(""), onJump: (i) => {
      go(i);
      setPanel("");
      setTitle(false);
    } }),
    panel === "gallery" && /* @__PURE__ */ import_react7.default.createElement(Gallery, { view, gameId, focusId: panelArg, onClose: () => setPanel("") }),
    panel === "cast" && /* @__PURE__ */ import_react7.default.createElement(CastPanel, { view, gameId, onClose: () => setPanel("") }),
    panel === "director" && /* @__PURE__ */ import_react7.default.createElement(DirectorLog, { gameId, focusTurn: panelArg, onClose: () => setPanel("") }),
    panel === "settings" && /* @__PURE__ */ import_react7.default.createElement(Settings, { initialTab: settingsTab, onClose: () => setPanel(""), onDirectorLog: gameId ? () => setPanel("director") : null })
  ));
}
function Toast() {
  const s = useUi();
  if (!s.toast) return null;
  return /* @__PURE__ */ import_react7.default.createElement("div", { className: `fg-toast${s.toast.tone === "error" ? " is-error" : ""}`, key: s.toast.at }, s.toast.text);
}

// src/client/chat/ChatCards.jsx
var import_react8 = __toESM(require("react"), 1);
var CLOCK = { dawn: "05:40", morning: "07:30", noon: "12:00", afternoon: "15:20", dusk: "17:50", evening: "19:30", night: "22:10", midnight: "00:40" };
var TIME_TINT = { dawn: "#9a5c8f", morning: "#5aa6e8", noon: "#3e8fe0", afternoon: "#c58b4a", dusk: "#b14f6e", evening: "#4f2f78", night: "#121a44", midnight: "#070b24" };
function SceneCardInline({ item, gameId, turn }) {
  rememberGame(gameId);
  const [busy, setBusy] = import_react8.default.useState(false);
  const data = item && item.data || {};
  const t = data.turn ?? turn;
  const pending = item && item.status === "pending";
  const retry = async () => {
    setBusy(true);
    try {
      await api.direct(gameId, t, true);
      toast("已重新整理");
    } catch (e) {
      toast(String(e.message || e), "error");
    } finally {
      setBusy(false);
    }
  };
  return /* @__PURE__ */ import_react8.default.createElement("div", { className: "fg-chat" }, /* @__PURE__ */ import_react8.default.createElement("div", { className: `fg-scene${pending ? " is-pending" : ""}` }, /* @__PURE__ */ import_react8.default.createElement("div", { className: "fg-scene-bg", style: { backgroundImage: `linear-gradient(135deg, ${TIME_TINT[data.time] || "#2a2350"}, #0d0b1c)` } }), /* @__PURE__ */ import_react8.default.createElement("div", { className: "fg-scene-clock" }, /* @__PURE__ */ import_react8.default.createElement("b", null, CLOCK[data.time] || "--:--"), /* @__PURE__ */ import_react8.default.createElement("span", null, data.time ? TIME_LABEL[data.time] || data.time : "scene")), /* @__PURE__ */ import_react8.default.createElement("div", { className: "fg-scene-main" }, pending ? /* @__PURE__ */ import_react8.default.createElement(import_react8.default.Fragment, null, /* @__PURE__ */ import_react8.default.createElement("div", { className: "fg-scene-loc" }, /* @__PURE__ */ import_react8.default.createElement("span", { className: "fg-dots" }, "导演正在整理这一幕")), /* @__PURE__ */ import_react8.default.createElement("div", { className: "fg-scene-sum" }, "正文已经可以读了。说话人、表情、站位、镜头和插画在后台排，整理好后剧场里会自动更新。"), /* @__PURE__ */ import_react8.default.createElement("div", { className: "fg-scene-actions" }, /* @__PURE__ */ import_react8.default.createElement("button", { type: "button", className: "fg-play", onClick: () => openTheater(gameId, { turn: t }) }, "先看起来"), /* @__PURE__ */ import_react8.default.createElement("button", { type: "button", className: "fg-ghost", onClick: () => openTheater(gameId, { panel: "director", panelArg: t }) }, "看导演在写什么"))) : data.error ? /* @__PURE__ */ import_react8.default.createElement(import_react8.default.Fragment, null, /* @__PURE__ */ import_react8.default.createElement("div", { className: "fg-scene-loc" }, "这一幕没整理好"), /* @__PURE__ */ import_react8.default.createElement("div", { className: "fg-scene-err" }, String(data.error).slice(0, 160)), /* @__PURE__ */ import_react8.default.createElement("div", { className: "fg-scene-actions" }, /* @__PURE__ */ import_react8.default.createElement("button", { type: "button", className: "fg-play", onClick: () => openTheater(gameId, { turn: t }) }, "照原文演"), /* @__PURE__ */ import_react8.default.createElement("button", { type: "button", className: "fg-ghost", disabled: busy, onClick: retry }, busy ? "整理中…" : "重试"), /* @__PURE__ */ import_react8.default.createElement("button", { type: "button", className: "fg-ghost", onClick: () => openTheater(gameId, { panel: "director", panelArg: t }) }, "导演日志"))) : /* @__PURE__ */ import_react8.default.createElement(import_react8.default.Fragment, null, /* @__PURE__ */ import_react8.default.createElement("div", { className: "fg-scene-loc" }, data.location || `第 ${t} 轮`), /* @__PURE__ */ import_react8.default.createElement("div", { className: "fg-scene-chips" }, data.weather && data.weather !== "clear" && /* @__PURE__ */ import_react8.default.createElement("span", { className: "fg-chip" }, WEATHER_LABEL[data.weather] || data.weather), data.mood && /* @__PURE__ */ import_react8.default.createElement("span", { className: "fg-chip" }, "♪ ", MOOD_LABEL[data.mood] || data.mood), (data.cast || []).map((n) => /* @__PURE__ */ import_react8.default.createElement("span", { key: n, className: "fg-chip", style: { "--c": nameColor(n) } }, /* @__PURE__ */ import_react8.default.createElement("i", null), n)), data.choices > 0 && /* @__PURE__ */ import_react8.default.createElement("span", { className: "fg-chip" }, "◆ ", data.choices, " 个选项")), data.summary && /* @__PURE__ */ import_react8.default.createElement("div", { className: "fg-scene-sum" }, data.summary), /* @__PURE__ */ import_react8.default.createElement("div", { className: "fg-scene-actions" }, /* @__PURE__ */ import_react8.default.createElement("button", { type: "button", className: "fg-play", onClick: () => openTheater(gameId, { turn: t }) }, "进入剧场"), /* @__PURE__ */ import_react8.default.createElement("button", { type: "button", className: "fg-ghost", onClick: () => openTheater(gameId, { panel: "cast" }) }, "人物志"), /* @__PURE__ */ import_react8.default.createElement("button", { type: "button", className: "fg-ghost", disabled: busy, onClick: retry }, busy ? "整理中…" : "重新整理"))))));
}
var RATIO = { landscape: "1216 / 832", portrait: "832 / 1216", square: "1 / 1" };
function CgCardInline({ item, gameId }) {
  rememberGame(gameId);
  const data = item && item.data || {};
  const [zoom, setZoom] = import_react8.default.useState(false);
  const [busy, setBusy] = import_react8.default.useState("");
  const src = data.assetId ? assetUrl(data.assetId) : item && item.url;
  const versions = Number(data.v) || 0;
  const current = Number.isInteger(data.current) ? data.current : versions - 1;
  const act = async (id, fn, ok) => {
    setBusy(id);
    try {
      await fn();
      if (ok) toast(ok);
    } catch (e) {
      toast(String(e.message || e), "error");
    } finally {
      setBusy("");
    }
  };
  const redraw = () => act("r", () => api.render(gameId, data.imageId, {}), "已加入出图队列");
  if (item && item.status === "failed" && !src) {
    return /* @__PURE__ */ import_react8.default.createElement("div", { className: "fg-chat" }, /* @__PURE__ */ import_react8.default.createElement("div", { className: "fg-cgcard" }, /* @__PURE__ */ import_react8.default.createElement("div", { className: "fg-cgcard-fail" }, /* @__PURE__ */ import_react8.default.createElement("span", null, "🎨 插画没画成：", String(item.error || "未知原因").slice(0, 140)), /* @__PURE__ */ import_react8.default.createElement("button", { type: "button", className: "fg-ghost", disabled: busy === "r", onClick: redraw }, "重画"), /* @__PURE__ */ import_react8.default.createElement("button", { type: "button", className: "fg-ghost", onClick: () => openTheater(gameId, { panel: "gallery", panelArg: data.imageId }) }, "改词"))));
  }
  if (!src || item && item.status === "pending" && !src) {
    return /* @__PURE__ */ import_react8.default.createElement("div", { className: "fg-chat" }, /* @__PURE__ */ import_react8.default.createElement("div", { className: "fg-cgcard" }, /* @__PURE__ */ import_react8.default.createElement("div", { className: "fg-cgcard-wait", style: { aspectRatio: RATIO[data.shape] || RATIO.landscape } }, /* @__PURE__ */ import_react8.default.createElement("span", null, "正在绘制", item && item.caption ? `「${item.caption}」` : "插画"))));
  }
  return /* @__PURE__ */ import_react8.default.createElement("div", { className: "fg-chat" }, /* @__PURE__ */ import_react8.default.createElement("div", { className: "fg-cgcard" }, /* @__PURE__ */ import_react8.default.createElement("img", { key: src, src, alt: item && item.caption || "插画", loading: "lazy", onClick: () => setZoom(true) }), /* @__PURE__ */ import_react8.default.createElement("div", { className: "fg-cgcard-bar" }, /* @__PURE__ */ import_react8.default.createElement("span", { className: "fg-cap" }, item && item.caption || "CG", versions > 1 ? ` · ${current + 1}/${versions}` : "", item && item.status === "pending" ? " · 重画中…" : ""), versions > 1 && /* @__PURE__ */ import_react8.default.createElement("button", { type: "button", disabled: current <= 0 || busy === "v", onClick: () => act("v", () => api.version(gameId, data.imageId, current - 1)) }, "‹"), versions > 1 && /* @__PURE__ */ import_react8.default.createElement("button", { type: "button", disabled: current >= versions - 1 || busy === "v", onClick: () => act("v", () => api.version(gameId, data.imageId, current + 1)) }, "›"), /* @__PURE__ */ import_react8.default.createElement("button", { type: "button", disabled: busy === "r" || item && item.status === "pending", onClick: redraw }, "重画"), /* @__PURE__ */ import_react8.default.createElement("button", { type: "button", onClick: () => openTheater(gameId, { panel: "gallery", panelArg: data.imageId }) }, "改词"))), zoom && /* @__PURE__ */ import_react8.default.createElement("div", { className: "fg-chat-lightbox", onClick: () => setZoom(false) }, /* @__PURE__ */ import_react8.default.createElement("img", { src, alt: "" })));
}

// src/client/index.jsx
var PLUGIN = "flowgal";
var KIND_SCENE = PLUGIN + "/scene";
var KIND_CG = PLUGIN + "/cg";
function injectStyles() {
  if (document.getElementById("fg-styles")) return () => {
  };
  const style = document.createElement("style");
  style.id = "fg-styles";
  style.textContent = [theater_default, skins_default, chat_default].join("\n");
  document.head.appendChild(style);
  return () => style.remove();
}
function Overlay() {
  return /* @__PURE__ */ import_react9.default.createElement(import_react9.default.Fragment, null, /* @__PURE__ */ import_react9.default.createElement(TheaterRoot, null), /* @__PURE__ */ import_react9.default.createElement(Toast, null));
}
function Launcher(props) {
  const wide = !props || props.wide !== false;
  return /* @__PURE__ */ import_react9.default.createElement(
    "button",
    {
      type: "button",
      title: "FlowGal：把对话当 galgame 看",
      onClick: () => openTheater(),
      style: { display: "flex", alignItems: "center", gap: 8, justifyContent: wide ? "flex-start" : "center", width: "100%", margin: "2px 0", background: "transparent", border: "none", color: "inherit", cursor: "pointer", padding: wide ? "8px 10px" : "8px 0", borderRadius: 8, fontSize: 13, textAlign: "left" }
    },
    /* @__PURE__ */ import_react9.default.createElement("span", { style: { fontSize: 15, lineHeight: 1 } }, "🎬"),
    wide ? /* @__PURE__ */ import_react9.default.createElement("span", null, "FlowGal") : null
  );
}
function UpdateLine() {
  const u = useUpdate();
  const text = !u ? "" : !u.managed ? "" : u.restartRequired ? "新版本已下载，重启 DSH 后生效" : updateAvailable(u) ? `有新版本（${u.last.commits.length || u.last.behind} 个更新）` : "";
  return /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-settings-row" }, /* @__PURE__ */ import_react9.default.createElement("span", { style: { opacity: 0.7 } }, "v", "0.2.0", u && u.managed ? ` · ${u.current.sha}` : ""), text && /* @__PURE__ */ import_react9.default.createElement("span", { style: { color: "#d9822b" } }, "● ", text), /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", className: "fg-ghost", onClick: () => openTheater("", { panel: "settings", panelArg: "about" }) }, "版本与更新"));
}
function SettingsSection() {
  const data = useConfig();
  if (!data) return /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-settings-card" }, "读取中…");
  const cfg = data.config;
  const toggle = (section, key) => patchConfig(section ? { [section]: { [key]: !cfg[section][key] } } : { [key]: !cfg[key] }).catch((e) => toast(e.message, "error"));
  const box = { display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer" };
  return /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-settings-card" }, /* @__PURE__ */ import_react9.default.createElement("h3", null, "🎬 FlowGal ", /* @__PURE__ */ import_react9.default.createElement("span", { style: { fontSize: 12, opacity: 0.6, fontWeight: 400 } }, "v", "0.2.0")), /* @__PURE__ */ import_react9.default.createElement("p", null, "正文照常流式输出；每轮写完后，后台导演把它整理成视觉小说场景（说话人、表情、站位、镜头、天气、选项），并按柏宝绘的方式自动配插画、背景和立绘。打开剧场就能当 galgame 看。"), /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-settings-row" }, /* @__PURE__ */ import_react9.default.createElement("label", { style: box }, /* @__PURE__ */ import_react9.default.createElement("input", { type: "checkbox", checked: cfg.enabled, onChange: () => toggle("", "enabled") }), "启用"), /* @__PURE__ */ import_react9.default.createElement("label", { style: box }, /* @__PURE__ */ import_react9.default.createElement("input", { type: "checkbox", checked: cfg.director.auto, onChange: () => toggle("director", "auto") }), "每轮自动整理"), /* @__PURE__ */ import_react9.default.createElement("label", { style: box }, /* @__PURE__ */ import_react9.default.createElement("input", { type: "checkbox", checked: cfg.images.auto, onChange: () => toggle("images", "auto") }), "自动配图"), /* @__PURE__ */ import_react9.default.createElement("label", { style: box }, /* @__PURE__ */ import_react9.default.createElement("input", { type: "checkbox", checked: cfg.ui.autoOpen, onChange: () => toggle("ui", "autoOpen") }), "写完自动打开剧场")), /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-settings-row" }, /* @__PURE__ */ import_react9.default.createElement("span", { style: { color: data.ready ? "#4caf7a" : "#d9822b" } }, data.ready ? "● 生图已就绪" : "● " + data.readyReason), /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", className: "fg-play", onClick: () => openTheater("", { panel: "settings" }) }, "打开完整设置")), /* @__PURE__ */ import_react9.default.createElement(UpdateLine, null));
}
var name = PLUGIN;
var inject = ["slots"];
function apply(ctx2) {
  const effect = (fn, label) => typeof ctx2.effect === "function" ? ctx2.effect(fn, label) : fn();
  effect(injectStyles, `${PLUGIN}: styles`);
  const seat = (slot, options, Component) => {
    try {
      ctx2.slots && ctx2.slots.inject && ctx2.slots.inject(slot, () => ctx2.slots.register({ name: slot, ...options }, Component));
    } catch (error) {
      try {
        console.warn(`[${PLUGIN}] ${slot} 注册失败：`, error && error.message);
      } catch {
      }
    }
  };
  seat("shell.overlay", { id: PLUGIN + "-theater", order: 96 }, Overlay);
  seat("sidebar.footer.action", { id: PLUGIN + "-launcher", order: 47, label: "FlowGal" }, Launcher);
  seat("settings.section", { id: PLUGIN, order: 46, label: () => "FlowGal" }, SettingsSection);
  if (typeof ctx2.inject !== "function") return;
  ctx2.inject(["tavernUi"], (owner) => {
    const ui2 = owner.tavernUi;
    if (!ui2 || !(ui2.apiVersion >= 1)) {
      try {
        console.warn(`[${PLUGIN}] 当前 Tavern 没有 tavernUi 接口，剧场入口不可用`);
      } catch {
      }
      return;
    }
    const keep = (off, label) => {
      if (typeof off === "function") owner.effect ? owner.effect(() => off, label) : null;
    };
    const guard = (render) => (args) => {
      try {
        return render(args || {});
      } catch (error) {
        try {
          console.warn(`[${PLUGIN}] 渲染失败：`, error && error.message);
        } catch {
        }
        return null;
      }
    };
    keep(ui2.registerMediaRenderer(KIND_SCENE, guard(({ item, gameId, turn }) => /* @__PURE__ */ import_react9.default.createElement(SceneCardInline, { item, gameId, turn }))), `${PLUGIN}: scene card`);
    keep(ui2.registerMediaRenderer(KIND_CG, guard(({ item, gameId }) => /* @__PURE__ */ import_react9.default.createElement(CgCardInline, { item, gameId }))), `${PLUGIN}: cg card`);
    keep(ui2.registerMessageAction({
      id: PLUGIN + "-theater",
      label: "🎬 剧场",
      when: (c) => Boolean(c && c.gameId) && c.settled !== false,
      run: async (c) => {
        rememberGame(c.gameId);
        openTheater(c.gameId, { turn: c.turn });
        api.direct(c.gameId, c.turn).catch((error) => toast("整理失败：" + (error && error.message), "error"));
      }
    }), `${PLUGIN}: message action theater`);
    keep(ui2.registerMessageAction({
      id: PLUGIN + "-illustrate",
      label: "🖼 配一张",
      when: (c) => Boolean(c && c.gameId) && c.settled !== false,
      run: async (c) => {
        try {
          await api.direct(c.gameId, c.turn);
          await api.addImage(c.gameId, c.turn, "", {});
          toast("已安排一张插画，画好后出现在这条消息里");
        } catch (error) {
          toast("配图失败：" + (error && error.message), "error");
        }
      }
    }), `${PLUGIN}: message action illustrate`);
    if (typeof ui2.registerComposerAction === "function") {
      keep(ui2.registerComposerAction({
        id: PLUGIN + "-theater",
        label: "🎬 剧场",
        when: (c) => Boolean(c && c.gameId),
        run: (c) => {
          rememberGame(c.gameId);
          openTheater(c.gameId, { turn: c.turn });
        }
      }), `${PLUGIN}: composer action`);
    }
  });
}

    } catch (error) {
      try { console.warn('[flowgal] 浏览器半边加载失败，已停用：', error && error.message); } catch (_) {}
      module.exports = { name: 'flowgal', inject: [], apply: function () {} };
    }
    return module.exports;
  },
});
