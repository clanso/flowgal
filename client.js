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
var import_react14 = __toESM(require("react"), 1);

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
async function httpCall(path, body, { method, signal }) {
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
async function httpUpload(path, file2) {
  const res = await fetch(API + path, { method: "POST", cache: "no-store", headers: { "x-flowgal-request": "1", "content-type": file2.type || "application/octet-stream" }, body: file2 });
  let data = null;
  try {
    data = await res.json();
  } catch {
  }
  if (!res.ok || !data || data.ok === false) throw new Error(data && data.error || `HTTP ${res.status}`);
  return data;
}
var transport = {
  call: httpCall,
  upload: httpUpload,
  assetUrl: (id) => `${API}/asset?id=${encodeURIComponent(id)}`,
  visionFiles: API + "/vision-files/",
  visionLoader: null,
  host: "dsh"
};
var hostName = () => transport.host;
var visionFiles = () => transport.visionFiles;
var visionLoader = () => transport.visionLoader;
var assetUrl = (id) => id ? transport.assetUrl(id) : "";
function call(path, body, { method = body ? "POST" : "GET", signal } = {}) {
  return transport.call(path, body, { method, signal });
}
var uploadFile = (path, file2) => transport.upload(path, file2);
var api = {
  game: (gameId, since, signal) => call(`/game?gameId=${encodeURIComponent(gameId)}${since ? `&since=${since}` : ""}`, null, { signal }),
  direct: (gameId, turn, force = false) => call("/direct", { gameId, turn, force }),
  replan: (gameId, turn) => call("/replan", { gameId, turn }),
  render: (gameId, imageId, overrides) => call("/image/render", { gameId, imageId, overrides }),
  rewrite: (gameId, imageId, instruction) => call("/image/rewrite", { gameId, imageId, instruction }),
  version: (gameId, imageId, index) => call("/image/version", { gameId, imageId, index }),
  until: (gameId, imageId, until) => call("/image/until", { gameId, imageId, until }),
  openLibrary: (gameId) => call("/library/open", { gameId }),
  sampleStyle: (id) => call("/style/sample", { id }),
  deleteImage: (gameId, imageId) => call("/image/delete", { gameId, imageId }),
  addImage: (gameId, turn, after, plan) => call("/image/add", { gameId, turn, after, plan }),
  cancel: (gameId, kind, id) => call("/cancel", { gameId, kind, id }),
  directorLog: (gameId, since, signal) => call(`/director-log?gameId=${encodeURIComponent(gameId)}${since ? `&since=${since}` : ""}`, null, { signal }),
  directorEntry: (gameId, id) => call(`/director-log?gameId=${encodeURIComponent(gameId)}&id=${encodeURIComponent(id)}`),
  place: (gameId, key) => call("/place/render", { gameId, key }),
  cast: (gameId, action, input) => call("/cast", { gameId, action, ...input }),
  /** 逆转式立绘工作台：一次局部重绘，回 { image: 重画后的整张图 data URL, seed }。 */
  aaInpaint: (input) => call("/aa/inpaint", input),
  fill: (gameId, opts = {}) => call("/fill", { gameId, ...opts }),
  emotion: (action, input) => call("/emotions", { action, ...input }),
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
  async uploadTrack(file2) {
    return (await uploadFile(`/music/upload?name=${encodeURIComponent(file2.name || "")}`, file2)).track;
  },
  /** 某一种音效换成自己的文件（最大 5 MB）；返回最新设置。 */
  uploadSound: (slot, file2) => uploadFile(`/sound/upload?slot=${encodeURIComponent(slot)}&name=${encodeURIComponent(file2.name || "")}`, file2),
  removeSound: (slot) => call("/sound", { action: "remove", slot })
};
function fillText(r) {
  const parts = [r.cg && `插画 ${r.cg} 张`, r.bg && `背景 ${r.bg} 张`, r.sprite && `立绘差分 ${r.sprite} 张`].filter(Boolean);
  const tail = r.undirected ? `；还有 ${r.undirected} 轮没整理，先在场景卡上点「重新整理」` : "";
  return (parts.length ? `已排队补画：${parts.join("、")}` : "没有缺的图") + tail;
}
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
function rememberGame2(gameId) {
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

// src/client/shell.jsx
var import_react12 = __toESM(require("react"), 1);

// src/client/styles/theater.css
var theater_default = '/* ───────────── 沉浸式 Galgame · 剧场 ─────────────\n   所有类名以 fg- 开头；皮肤只改 data-skin 上的变量与少量装饰。\n   舞台是 16:9 的容器（container-type:size），字号用 cqw 随舞台缩放。 */\n\n.fg-theater {\n  --accent: #ff7eb6; --accent2: #9b7bff; --accent3: #5ee7ff;\n  --ink: #f5f3ff; --ink-dim: rgba(235, 232, 255, .62);\n  --box-bg: linear-gradient(180deg, rgba(18, 16, 40, .66), rgba(8, 8, 24, .86));\n  --box-border: rgba(255, 255, 255, .14);\n  --box-radius: 1.4cqw;\n  --box-blur: blur(18px) saturate(1.5);\n  --name-ink: #fff;\n  --panel-bg: rgba(10, 10, 26, .82);\n  --chip-bg: rgba(10, 10, 28, .5);\n  --font-body: "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", system-ui, sans-serif;\n  --font-display: "Noto Serif SC", "Source Han Serif SC", "Songti SC", "STSong", serif;\n  --font-latin: "Cormorant Garamond", "Playfair Display", Georgia, serif;\n  --wait-glyph: "◆";\n  /* 宽高写死成视口大小：酒馆给 <html> 加了 transform，fixed 层的「inset: 0」会跟着 html（高 0）算 */\n  position: fixed; inset: 0; width: 100vw; height: 100vh; height: 100dvh; z-index: 2147483000; overflow: hidden; overflow: clip;\n  display: flex; align-items: center; justify-content: center;\n  background: #05040c; color: var(--ink);\n  font-family: var(--font-body);\n  -webkit-font-smoothing: antialiased;\n  user-select: none; -webkit-user-select: none;\n  animation: fg-fade-in .5s ease both;\n}\n.fg-theater *, .fg-theater *::before, .fg-theater *::after { box-sizing: border-box; }\n:where(.fg-theater) button { font: inherit; color: inherit; background: none; border: 0; cursor: pointer; padding: 0; }\n.fg-theater.is-closing { animation: fg-fade-out .35s ease both; }\n\n.fg-stage {\n  position: relative; overflow: hidden; overflow: clip;\n  /* 宽高比由剧场根节点的 --stage-ar 给（默认跟横版插画一样，NovelAI 的 1216×832）。 */\n  width: min(100vw, calc(100vh * var(--stage-ar, 1.4615))); height: min(100vh, calc(100vw / var(--stage-ar, 1.4615)));\n  container-type: size; container-name: stage;\n  background: #000;\n  box-shadow: 0 0 120px rgba(0, 0, 0, .8);\n}\n@media (max-aspect-ratio: 4/5) {\n  /* 竖屏手机：舞台铺满，立绘居中放大，对话框加高。 */\n  .fg-stage { width: 100vw; height: 100vh; }\n}\n.fg-camera { position: absolute; inset: 0; transform-origin: 50% 45%; }\n\n/* ── 背景层 ── */\n.fg-bg { position: absolute; inset: -3%; background-size: cover; background-position: center 42%; will-change: transform, opacity; }\n.fg-bg.is-image { animation: fg-kenburns 38s ease-in-out infinite alternate; }\n.fg-bg.is-enter { animation: var(--enter-anim, fg-dissolve) var(--enter-dur, 1.1s) cubic-bezier(.6, .05, .3, 1) both, fg-kenburns 38s ease-in-out infinite alternate; }\n.fg-bg.is-leave { animation: fg-fade-out .9s ease both; }\n@keyframes fg-kenburns { from { transform: scale(1.02) translate(0, 0); } to { transform: scale(1.1) translate(-1.6%, -1.2%); } }\n@keyframes fg-dissolve { from { opacity: 0; filter: blur(8px) brightness(1.3); } to { opacity: 1; filter: none; } }\n@keyframes fg-wipe { from { clip-path: inset(0 100% 0 0); } to { clip-path: inset(0 0 0 0); } }\n@keyframes fg-iris { from { clip-path: circle(0% at 50% 50%); } to { clip-path: circle(80% at 50% 50%); } }\n@keyframes fg-cinematic { 0% { clip-path: inset(50% 0 50% 0); filter: brightness(2); } 60% { clip-path: inset(8% 0 8% 0); } 100% { clip-path: inset(0 0 0 0); filter: none; } }\n@keyframes fg-strips { from { -webkit-mask-size: 100% 0%; mask-size: 100% 0%; } to { -webkit-mask-size: 100% 100%; mask-size: 100% 100%; } }\n.fg-bg.is-enter[data-tr="strips"] { -webkit-mask-image: repeating-linear-gradient(90deg, #000 0 8%, transparent 8% 8.0001%); mask-image: linear-gradient(#000, #000); -webkit-mask-repeat: no-repeat; }\n@keyframes fg-flash-in { 0% { opacity: 0; filter: brightness(4); } 30% { opacity: 1; filter: brightness(3); } 100% { filter: none; } }\n@keyframes fg-black-in { 0%, 45% { opacity: 0; } 100% { opacity: 1; } }\n\n/* 没有背景图时的程序化舞台：天色渐变 + 远景剪影 + 光斑。 */\n.fg-sky { position: absolute; inset: 0; transition: background 1.6s ease; }\n.fg-sky::before { content: ""; position: absolute; left: -10%; right: -10%; bottom: 0; height: 46%;\n  background:\n    radial-gradient(60% 120% at 20% 100%, rgba(0, 0, 0, .55), transparent 70%),\n    radial-gradient(50% 90% at 78% 100%, rgba(0, 0, 0, .5), transparent 70%);\n}\n.fg-sky::after { content: ""; position: absolute; inset: 0;\n  background: radial-gradient(40% 30% at var(--sun-x, 70%) var(--sun-y, 30%), var(--sun, rgba(255, 220, 180, .55)), transparent 70%);\n  mix-blend-mode: screen; animation: fg-breathe-light 9s ease-in-out infinite;\n}\n.fg-skyline { position: absolute; left: 0; right: 0; bottom: 0; height: 38%; opacity: .9; }\n@keyframes fg-breathe-light { 0%, 100% { opacity: .75; } 50% { opacity: 1; } }\n\n/* 时段调色：叠一层渐变，混合模式按时段变化。 */\n.fg-grade { position: absolute; inset: 0; pointer-events: none; transition: background 1.4s ease, opacity 1.4s ease; mix-blend-mode: soft-light; }\n.fg-grade[data-time="dawn"] { background: linear-gradient(180deg, rgba(255, 170, 200, .55), rgba(120, 140, 255, .35)); }\n.fg-grade[data-time="morning"] { background: linear-gradient(180deg, rgba(255, 245, 220, .35), rgba(255, 255, 255, 0)); }\n.fg-grade[data-time="noon"] { opacity: 0; }\n.fg-grade[data-time="afternoon"] { background: linear-gradient(180deg, rgba(255, 220, 160, .35), rgba(255, 200, 120, .15)); }\n.fg-grade[data-time="dusk"] { background: linear-gradient(180deg, rgba(255, 120, 60, .7), rgba(140, 40, 120, .55)); mix-blend-mode: overlay; }\n.fg-grade[data-time="evening"] { background: linear-gradient(180deg, rgba(90, 60, 200, .6), rgba(255, 110, 120, .35)); mix-blend-mode: overlay; }\n.fg-grade[data-time="night"] { background: linear-gradient(180deg, rgba(10, 20, 80, .78), rgba(20, 10, 60, .7)); mix-blend-mode: multiply; }\n.fg-grade[data-time="midnight"] { background: linear-gradient(180deg, rgba(4, 6, 40, .86), rgba(10, 4, 30, .8)); mix-blend-mode: multiply; }\n.fg-vignette { position: absolute; inset: 0; pointer-events: none; background: radial-gradient(120% 90% at 50% 45%, transparent 55%, rgba(0, 0, 0, .55)); }\n.fg-letterbox::before, .fg-letterbox::after { content: ""; position: absolute; left: 0; right: 0; height: 9%; background: #000; z-index: 30; animation: fg-bars .8s cubic-bezier(.6, 0, .2, 1) both; }\n.fg-letterbox::before { top: 0; transform-origin: top; } .fg-letterbox::after { bottom: 0; transform-origin: bottom; }\n@keyframes fg-bars { from { transform: scaleY(0); } }\n\n.fg-particles { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; z-index: 8; }\n\n/* ── 立绘 ── */\n.fg-cast { position: absolute; inset: 0; z-index: 5; pointer-events: none; }\n.fg-actor {\n  position: absolute; bottom: -2%; height: 92%; width: 34%;\n  left: var(--x, 50%); transform: translateX(-50%);\n  transition: left .55s cubic-bezier(.4, .1, .2, 1), filter .4s ease, opacity .45s ease;\n  filter: brightness(.7) saturate(.78);\n  animation: fg-actor-in .6s cubic-bezier(.2, .7, .2, 1) both;\n}\n.fg-actor.is-speaking { filter: brightness(1.04) saturate(1.05) drop-shadow(0 0 1.4cqw rgba(255, 255, 255, .18)); z-index: 2; }\n.fg-actor.is-leaving { animation: fg-actor-out .45s ease both; }\n.fg-actor-body { position: absolute; inset: 0; transform-origin: 50% 100%; animation: fg-breathe 4.8s ease-in-out infinite; }\n.fg-actor.is-speaking .fg-actor-body { animation: fg-speak-hop .42s cubic-bezier(.3, 1.6, .5, 1), fg-breathe 4.8s ease-in-out .42s infinite; }\n/* 逆转式立绘自带一顿一顿的呼吸，去掉平滑呼吸，只留说话时的轻跳 */\n.fg-actor.is-aa .fg-actor-body { animation: none; }\n.fg-actor.is-aa.is-speaking .fg-actor-body { animation: fg-speak-hop .42s cubic-bezier(.3, 1.6, .5, 1); }\n.fg-actor img, .fg-actor .fg-aa { position: absolute; left: 50%; bottom: 0; height: 100%; width: auto; max-width: none; transform: translateX(-50%);\n  -webkit-mask-image: linear-gradient(180deg, #000 78%, transparent 99%), radial-gradient(120% 100% at 50% 40%, #000 62%, transparent 82%);\n  -webkit-mask-composite: source-in; mask-image: linear-gradient(180deg, #000 78%, transparent 99%); }\n.fg-actor.is-upload img, .fg-actor.is-upload .fg-aa { -webkit-mask-image: none; mask-image: none; }\n.fg-actor img.is-swap { animation: fg-expr-swap .25s ease; }\n/* 登场从靠近的一侧滑进来，退场往同一侧淡出（--side 由站位决定）。 */\n@keyframes fg-actor-in { from { opacity: 0; transform: translateX(calc(-50% + var(--side, 0%))) translateY(3%); } }\n@keyframes fg-actor-out { to { opacity: 0; transform: translateX(calc(-50% + var(--side, 0%))) translateY(2%); } }\n@keyframes fg-breathe { 0%, 100% { transform: scaleY(1); } 50% { transform: scaleY(1.008) translateY(-.25%); } }\n@keyframes fg-speak-hop { 0% { transform: translateY(0); } 40% { transform: translateY(-1.6%); } 100% { transform: translateY(0); } }\n@keyframes fg-expr-swap { from { opacity: .4; filter: brightness(1.4); } }\n\n/* 没有立绘时的剪影立绘：角色色渐变 + 轮廓光。 */\n.fg-silhouette { position: absolute; left: 50%; bottom: 0; height: 94%; aspect-ratio: 0.52; transform: translateX(-50%); }\n.fg-silhouette svg { width: 100%; height: 100%; overflow: visible; }\n.fg-silhouette .sil-rim { fill: none; stroke: color-mix(in oklab, var(--c) 55%, #fff); stroke-width: 2.4; opacity: .85; filter: drop-shadow(0 0 5px var(--c)) drop-shadow(0 0 14px var(--c)); stroke-dasharray: 1400; animation: fg-rim-draw 2.4s cubic-bezier(.4, 0, .2, 1) both; }\n@keyframes fg-rim-draw { from { stroke-dashoffset: 1400; } to { stroke-dashoffset: 0; } }\n.fg-silhouette-name { position: absolute; left: 50%; top: 50%; transform: translateX(-50%); font-family: var(--font-display); font-size: 5.4cqw; font-weight: 900; letter-spacing: .25em; color: transparent; -webkit-text-stroke: 1px color-mix(in oklab, var(--c) 40%, #fff); opacity: .5; writing-mode: vertical-rl; white-space: nowrap; }\n.fg-silhouette-tag { position: absolute; left: 50%; bottom: 30%; transform: translateX(-50%); font-family: var(--font-latin); font-size: .75cqw; letter-spacing: .5em; white-space: nowrap; color: rgba(255, 255, 255, .55); }\n.fg-symbol-anchor { position: absolute; left: 50%; top: 9%; width: 0; height: 0; z-index: 4; }\n/* 漫画符号：外层管弹出与淡出（--life），内层按种类循环一个小动作。 */\n.fg-symbol { position: absolute; left: 3cqw; top: -2cqw; width: 6cqw; height: 6cqw; pointer-events: none; transform-origin: 30% 90%; animation: fg-sym-life var(--life, 2.6s) cubic-bezier(.2, .9, .3, 1.2) both; }\n.fg-symbol-art, .fg-symbol-art svg { display: block; width: 100%; height: 100%; }\n.fg-symbol-art { filter: drop-shadow(0 .3cqw .5cqw rgba(0, 0, 0, .45)); transform-origin: 50% 60%; }\n.fg-symbol[data-kind="heart"] .fg-symbol-art, .fg-symbol[data-kind="bloom"] .fg-symbol-art { animation: fg-sym-beat .7s ease-in-out .3s infinite; }\n.fg-symbol[data-kind="anger"] .fg-symbol-art { animation: fg-sym-throb .32s ease-in-out .2s infinite alternate; }\n.fg-symbol[data-kind="sweat"] .fg-symbol-art { animation: fg-sym-drip 1.4s ease-in .25s infinite; }\n.fg-symbol[data-kind="sparkle"] .fg-symbol-art { animation: fg-sym-twinkle 1.1s ease-in-out infinite; }\n.fg-symbol[data-kind="surprise"] .fg-symbol-art { animation: fg-sym-jolt .5s cubic-bezier(.3, 1.6, .5, 1) .05s 2; }\n.fg-symbol[data-kind="gloom"] { left: -3cqw; top: -4cqw; width: 8cqw; }\n.fg-symbol[data-kind="gloom"] .fg-symbol-art { animation: fg-sym-sink 2.4s ease-out both; }\n.fg-symbol[data-kind="note"] .fg-symbol-art { animation: fg-sym-sway 1.2s ease-in-out infinite; }\n.fg-symbol[data-kind="zzz"] .fg-symbol-art { animation: fg-sym-drift 2.2s ease-in-out infinite; }\n.fg-symbol[data-kind="bulb"] .fg-symbol-art { animation: fg-sym-flicker 1s steps(1) both; }\n.fg-symbol[data-kind="heartbreak"] .fg-symbol-art { animation: fg-sym-crack .9s cubic-bezier(.4, 0, .6, 1) .25s both; }\n.fg-symbol[data-kind="sigh"] .fg-symbol-art { animation: fg-sym-puff 2s ease-out both; }\n.fg-symbol[data-kind="dizzy"] .fg-symbol-art { animation: fg-sym-spin 1.4s linear infinite; transform-origin: 50% 50%; }\n.fg-symbol[data-kind="fire"] .fg-symbol-art { animation: fg-sym-flame .18s ease-in-out infinite alternate; transform-origin: 50% 95%; }\n.fg-symbol[data-kind="blush"] { left: -3.5cqw; top: 6cqw; width: 7cqw; height: 3.4cqw; }\n.fg-symbol[data-kind="blush"] .fg-symbol-art { animation: fg-sym-glow 1.6s ease-in-out infinite alternate; }\n.fg-symbol[data-kind="bloom"] .fg-symbol-art svg { animation: fg-sym-spin 6s linear infinite; }\n.fg-symbol[data-kind="silence"] .fg-symbol-art { animation: fg-sym-bob 1.2s ease-in-out infinite; }\n@keyframes fg-sym-life {\n  0% { opacity: 0; transform: scale(.2) rotate(-14deg); }\n  12% { opacity: 1; transform: scale(1.18) rotate(4deg); }\n  20% { transform: scale(.94) rotate(-2deg); }\n  28%, 82% { opacity: 1; transform: scale(1) rotate(0); }\n  100% { opacity: 0; transform: scale(.9) translateY(-1cqw); }\n}\n@keyframes fg-sym-beat { 0%, 100% { transform: scale(1); } 15% { transform: scale(1.16); } 30% { transform: scale(.98); } 45% { transform: scale(1.1); } }\n@keyframes fg-sym-throb { from { transform: scale(.92) rotate(-3deg); } to { transform: scale(1.12) rotate(3deg); } }\n@keyframes fg-sym-drip { 0% { transform: translateY(0); opacity: 1; } 80% { transform: translateY(1.6cqw); opacity: 1; } 100% { transform: translateY(2cqw); opacity: 0; } }\n@keyframes fg-sym-twinkle { 0%, 100% { transform: scale(1) rotate(0); filter: brightness(1); } 50% { transform: scale(1.12) rotate(18deg); filter: brightness(1.35); } }\n@keyframes fg-sym-jolt { 0% { transform: translateY(0); } 30% { transform: translateY(-1.2cqw) scale(1.08); } 60% { transform: translateY(.3cqw); } 100% { transform: translateY(0); } }\n@keyframes fg-sym-sink { from { transform: translateY(-1.4cqw); opacity: 0; } to { transform: translateY(0); opacity: .95; } }\n@keyframes fg-sym-sway { 0%, 100% { transform: translate(0, 0) rotate(-8deg); } 50% { transform: translate(.8cqw, -.8cqw) rotate(8deg); } }\n@keyframes fg-sym-drift { 0% { transform: translate(0, .6cqw); opacity: .4; } 50% { opacity: 1; } 100% { transform: translate(1.2cqw, -1.6cqw); opacity: .4; } }\n@keyframes fg-sym-flicker { 0% { filter: brightness(.4); } 15% { filter: brightness(1.5); } 22% { filter: brightness(.6); } 30%, 100% { filter: brightness(1.15); } }\n@keyframes fg-sym-crack { 0%, 40% { transform: none; } 50% { transform: translateX(-.3cqw) rotate(-4deg); } 60% { transform: translateX(.3cqw) rotate(4deg); } 100% { transform: translateY(1.2cqw) rotate(-6deg); opacity: .7; } }\n@keyframes fg-sym-puff { from { transform: translateX(-1cqw) scale(.7); opacity: 0; } 40% { opacity: 1; } to { transform: translateX(1.6cqw) scale(1.1); opacity: .6; } }\n@keyframes fg-sym-spin { to { transform: rotate(360deg); } }\n@keyframes fg-sym-flame { from { transform: scale(1, .94) skewX(-2deg); } to { transform: scale(.96, 1.06) skewX(2deg); } }\n@keyframes fg-sym-glow { from { opacity: .55; } to { opacity: 1; } }\n@keyframes fg-sym-bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-.6cqw); } }\n\n/* ── CG ── */\n.fg-cg { position: absolute; inset: 0; z-index: 6; background-size: cover; background-position: center; animation: fg-cg-in 1.2s cubic-bezier(.5, 0, .2, 1) both; }\n.fg-cg.is-leaving { animation: fg-cg-out .8s ease both; pointer-events: none; }\n@keyframes fg-cg-out { from { opacity: 1; } to { opacity: 0; filter: brightness(1.15); } }\n.fg-cg::after { content: ""; position: absolute; inset: 0; background: linear-gradient(180deg, transparent 60%, rgba(0, 0, 0, .45)); }\n.fg-cg-img { position: absolute; inset: -2%; background-size: cover; background-position: center; animation: fg-kenburns 30s ease-in-out infinite alternate; }\n/* 竖版插画：模糊的同图垫底，前景铺满宽度，顶 → 底 → 拉远看全貌，再倒放回来。 */\n.fg-cg.is-tall { background: #000; }\n.fg-cg-back { position: absolute; inset: -6%; background-size: cover; background-position: center; filter: blur(2.4cqw) brightness(.5) saturate(1.15); }\n.fg-cg-pan { position: absolute; left: 0; top: 0; width: 100%; height: auto; transform-origin: 50% 0; box-shadow: 0 0 5cqw rgba(0, 0, 0, .65); animation: fg-cg-pan var(--pan, 26s) ease-in-out infinite alternate; will-change: transform; user-select: none; }\n@keyframes fg-cg-pan {\n  0%, 10% { transform: translateY(0) scale(1); }\n  55%, 64% { transform: translateY(calc((var(--r) - 1) * 100%)) scale(1); }\n  90%, 100% { transform: translateY(0) scale(var(--r)); }\n}\n.fg-cg-caption { position: absolute; right: 4%; top: 12%; flex-direction: row-reverse; z-index: 2; display: flex; align-items: center; gap: 1cqw; font-family: var(--font-latin); letter-spacing: .3em; font-size: 1.1cqw; color: rgba(255, 255, 255, .85); text-shadow: 0 2px 8px rgba(0, 0, 0, .6); animation: fg-slide-in 1.2s .4s ease both; }\n.fg-cg-caption b { font-family: var(--font-display); font-size: 1.9cqw; letter-spacing: .18em; font-weight: 700; }\n.fg-cg-caption i { width: 4cqw; height: 1px; background: linear-gradient(270deg, var(--accent), transparent); }\n@keyframes fg-cg-in { 0% { opacity: 0; clip-path: polygon(0 0, 0 0, 0 100%, 0 100%); filter: brightness(2.2); } 55% { opacity: 1; } 100% { clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%); filter: none; } }\n.fg-cg-wait { position: absolute; right: 2.4%; top: 12%; z-index: 20; display: flex; align-items: center; gap: .6cqw; font-size: 1cqw; padding: .5cqw 1cqw; border-radius: 99px; background: var(--chip-bg); backdrop-filter: blur(8px); color: var(--ink-dim); }\n.fg-cg-wait i { width: .7cqw; height: .7cqw; border-radius: 50%; background: var(--accent); animation: fg-pulse 1.2s ease-in-out infinite; }\n\n/* ── 镜头 ── */\n.fg-camera[data-cam="shake"] { animation: fg-shake .5s linear; }\n.fg-camera[data-cam="zoom"] { animation: fg-zoom 1.6s cubic-bezier(.2, .7, .2, 1) both; }\n.fg-camera[data-cam="zoomout"] { animation: fg-zoomout 1.6s cubic-bezier(.2, .7, .2, 1) both; }\n.fg-camera[data-cam="pan"] { animation: fg-pan 3s ease-in-out both; }\n.fg-camera[data-cam="tilt"] { animation: fg-tilt 1.2s ease both; }\n.fg-camera[data-cam="blur"] { animation: fg-blur 2.2s ease both; }\n@keyframes fg-shake { 0%, 100% { transform: translate(0, 0); } 15% { transform: translate(-1.2%, .6%); } 30% { transform: translate(1%, -.8%); } 45% { transform: translate(-.8%, .4%); } 60% { transform: translate(.6%, .6%); } 80% { transform: translate(-.3%, -.2%); } }\n@keyframes fg-zoom { from { transform: scale(1); } to { transform: scale(1.12); } }\n@keyframes fg-zoomout { from { transform: scale(1.14); } to { transform: scale(1); } }\n@keyframes fg-pan { 0% { transform: translateX(2%) scale(1.06); } 100% { transform: translateX(-2%) scale(1.06); } }\n@keyframes fg-tilt { 0% { transform: rotate(0); } 40% { transform: rotate(-2.4deg) scale(1.05); } 100% { transform: rotate(-1.4deg) scale(1.04); } }\n@keyframes fg-blur { 0% { filter: blur(0); } 30% { filter: blur(6px); } 100% { filter: blur(0); } }\n.fg-flash { position: absolute; inset: 0; z-index: 40; pointer-events: none; background: #fff; animation: fg-flash .7s ease-out both; }\n.fg-flash.is-red { background: radial-gradient(circle, rgba(255, 40, 60, .2), rgba(160, 0, 20, .75)); }\n.fg-flash.is-black { background: #000; animation: fg-black 1.6s ease both; }\n@keyframes fg-flash { from { opacity: .95; } to { opacity: 0; } }\n/* 落字特效的闪光层：平时透明，由演出计划在某个字上点亮（Stage.jsx 的 useHits） */\n.fg-hitflash { position: absolute; inset: 0; z-index: 41; pointer-events: none; opacity: 0; background: #fff; }\n.fg-hitflash.is-red { background: radial-gradient(circle, rgba(255, 40, 60, .25), rgba(160, 0, 20, .8)); }\n@keyframes fg-black { 0% { opacity: 0; } 35%, 60% { opacity: 1; } 100% { opacity: 0; } }\n\n/* ── 地点标题卡 ── */\n.fg-titlecard { position: absolute; left: 6%; top: 34%; z-index: 25; pointer-events: none; animation: fg-titlecard 3.2s ease both; }\n.fg-titlecard-line { width: 26cqw; height: 1px; background: linear-gradient(90deg, var(--accent), var(--accent2), transparent); transform-origin: left; animation: fg-line 1s .1s cubic-bezier(.6, 0, .2, 1) both; }\n.fg-titlecard-name { font-family: var(--font-display); font-size: 4.6cqw; font-weight: 700; letter-spacing: .32em; margin: .8cqw 0 .4cqw; text-shadow: 0 0 2cqw rgba(0, 0, 0, .8), 0 0 4cqw var(--accent2); }\n.fg-titlecard-sub { font-family: var(--font-latin); font-size: 1.3cqw; letter-spacing: .5em; color: rgba(255, 255, 255, .75); text-transform: uppercase; }\n@keyframes fg-titlecard { 0% { opacity: 0; transform: translateX(-2%); } 15% { opacity: 1; transform: none; } 80% { opacity: 1; } 100% { opacity: 0; transform: translateX(1%); } }\n@keyframes fg-line { from { transform: scaleX(0); } }\n\n/* ── HUD ── */\n.fg-hud { position: absolute; left: 2.2%; top: 3.2%; z-index: 20; display: flex; align-items: stretch; gap: .9cqw; transition: opacity .3s; }\n.fg-hud-bar { width: .28cqw; border-radius: 9px; background: linear-gradient(180deg, var(--accent), var(--accent2)); box-shadow: 0 0 1cqw var(--accent); }\n.fg-hud-place { font-family: var(--font-display); font-size: 1.55cqw; font-weight: 700; letter-spacing: .14em; text-shadow: 0 1px 6px rgba(0, 0, 0, .7); }\n.fg-hud-meta { margin-top: .25cqw; font-size: .95cqw; letter-spacing: .14em; color: var(--ink-dim); text-shadow: 0 1px 4px rgba(0, 0, 0, .7); display: flex; gap: .8cqw; }\n.fg-topright { position: absolute; right: 2%; top: 3%; z-index: 22; display: flex; gap: .6cqw; align-items: center; }\n.fg-pill { display: inline-flex; align-items: center; gap: .5cqw; padding: .45cqw 1cqw; border-radius: 99px; background: var(--chip-bg); border: 1px solid var(--box-border); backdrop-filter: blur(10px); font-size: .95cqw; letter-spacing: .08em; color: var(--ink); }\n.fg-pill.is-busy::before { content: ""; width: .7cqw; height: .7cqw; border-radius: 50%; border: 2px solid var(--accent); border-right-color: transparent; animation: fg-spin .8s linear infinite; }\n.fg-iconbtn { width: 2.6cqw; height: 2.6cqw; border-radius: 50%; display: grid; place-items: center; background: var(--chip-bg); border: 1px solid var(--box-border); backdrop-filter: blur(10px); font-size: 1.2cqw; transition: transform .2s, background .2s; }\n.fg-iconbtn:hover { transform: rotate(90deg); background: rgba(255, 255, 255, .14); }\n\n/* ── 对话框 ── */\n.fg-dialog { position: absolute; left: 4%; right: 4%; bottom: 3.6%; height: 27%; z-index: 20; transition: opacity .3s, transform .3s; }\n.fg-ui-hidden .fg-dialog, .fg-ui-hidden .fg-hud, .fg-ui-hidden .fg-topright, .fg-ui-hidden .fg-quick { opacity: 0; pointer-events: none; }\n.fg-box { position: absolute; inset: 0; border-radius: var(--box-radius); background: var(--box-bg); border: 1px solid var(--box-border); backdrop-filter: var(--box-blur); -webkit-backdrop-filter: var(--box-blur); box-shadow: 0 1.4cqw 4cqw rgba(0, 0, 0, .45), inset 0 1px 0 rgba(255, 255, 255, .08); overflow: hidden; }\n.fg-box::before { content: ""; position: absolute; left: 0; right: 0; top: 0; height: 2px; background: linear-gradient(90deg, transparent, var(--accent), var(--accent2), var(--accent3), transparent); background-size: 200% 100%; animation: fg-shimmer 6s linear infinite; opacity: .9; }\n.fg-box::after { content: ""; position: absolute; right: -6cqw; bottom: -10cqw; width: 26cqw; height: 26cqw; border-radius: 50%; background: radial-gradient(circle, color-mix(in oklab, var(--speaker, var(--accent)) 28%, transparent), transparent 65%); pointer-events: none; transition: background .6s; }\n@keyframes fg-shimmer { from { background-position: 200% 0; } to { background-position: 0 0; } }\n.fg-name { position: absolute; left: 3.2%; top: -2.3cqw; z-index: 2; display: flex; align-items: flex-end; gap: .8cqw; animation: fg-name-in .35s cubic-bezier(.2, .8, .2, 1) both; }\n.fg-name-plate { position: relative; padding: .5cqw 2.4cqw .55cqw 1.6cqw; font-family: var(--font-display); font-weight: 700; font-size: 1.75cqw; letter-spacing: .2em; color: var(--name-ink);\n  background: linear-gradient(100deg, var(--speaker, var(--accent)), color-mix(in oklab, var(--speaker, var(--accent)) 55%, var(--accent2)));\n  clip-path: polygon(0 0, 100% 0, calc(100% - 1.2cqw) 100%, 0 100%); box-shadow: 0 .4cqw 1.6cqw rgba(0, 0, 0, .35); text-shadow: 0 1px 2px rgba(0, 0, 0, .35); }\n.fg-name-plate::after { content: ""; position: absolute; left: 1.6cqw; right: 2.4cqw; bottom: .3cqw; height: 1px; background: rgba(255, 255, 255, .55); }\n.fg-name-sub { font-family: var(--font-latin); font-size: 1cqw; letter-spacing: .32em; color: var(--ink-dim); padding-bottom: .4cqw; text-transform: uppercase; }\n@keyframes fg-name-in { from { opacity: 0; transform: translateX(-1.2cqw); } }\n.fg-text { position: absolute; left: 4.2%; right: 5%; top: 23%; bottom: 20%; font-size: 1.95cqw; line-height: 1.78; letter-spacing: .04em; text-shadow: 0 1px 2px rgba(0, 0, 0, .45); overflow: hidden; }\n.fg-text.is-narration { color: color-mix(in oklab, var(--ink) 92%, var(--accent3)); }\n.fg-text.is-thought { font-style: italic; color: color-mix(in oklab, var(--ink) 70%, var(--accent2)); }\n.fg-text.is-cardhint { color: var(--ink-dim); font-size: 1.3cqw; letter-spacing: .4em; text-align: center; }\n.fg-text.is-thought::before { content: "（"; } .fg-text.is-thought::after { content: "）"; }\n.fg-char { opacity: 0; animation: fg-char-in .22s ease forwards; animation-delay: var(--d); display: inline; }\n.fg-text.is-done .fg-char { animation: none; opacity: 1; }\n.fg-text.is-wait .fg-char { animation: none; }\n@keyframes fg-char-in { from { opacity: 0; filter: blur(3px); } to { opacity: 1; filter: none; } }\n/* ── 台词演法与重音（lib/typing.js）：字的样子。要做位移、缩放的字改成 inline-block，空格照样占位 ── */\n.fg-text[class*="say-"] .fg-char, .fg-char.is-stress { display: inline-block; white-space: pre; }\n.fg-text.say-menace .fg-char { animation-name: fg-char-stamp; animation-duration: .2s; }\n.fg-text.say-excited .fg-char { animation-name: fg-char-hop; animation-duration: .14s; }\n.fg-text.say-shout .fg-char { animation-name: fg-char-pop; animation-duration: .28s; font-size: 1.16em; font-weight: 700; }\n.fg-text.say-hesitant .fg-char { animation-duration: .32s; }\n.fg-text.say-whisper { opacity: .8; }\n.fg-text.say-whisper .fg-char { font-size: .9em; animation-duration: .45s; }\n.fg-text.say-breakdown .fg-char { color: color-mix(in oklab, var(--ink) 72%, #ff3b5c); animation: fg-char-in .12s ease forwards var(--d), fg-char-quake .2s linear infinite var(--d); }\n.fg-char.is-stress { color: var(--stress, #ff4d5e); font-weight: 700; font-size: 1.1em; text-shadow: 0 0 .6cqw rgba(255, 60, 80, .45); animation-name: fg-char-stamp; animation-duration: .24s; }\n/* 点一下打完 / 等字体时：和普通台词一样立刻全显示、或先不动（要比上面的演法规则更具体才压得住） */\n.fg-text.is-done[class*="say-"] .fg-char, .fg-text.is-done .fg-char.is-stress { animation: none; opacity: 1; }\n.fg-text.is-wait[class*="say-"] .fg-char, .fg-text.is-wait .fg-char.is-stress { animation: none; }\n.fg-text.is-done.say-breakdown .fg-char { animation: fg-char-quake .2s linear infinite; opacity: 1; }\n@keyframes fg-char-stamp { from { opacity: 0; transform: translateY(-.35em) scale(1.4); } 60% { opacity: 1; transform: translateY(0) scale(.95); } to { opacity: 1; transform: none; } }\n@keyframes fg-char-pop { from { opacity: 0; transform: scale(1.9); } 55% { opacity: 1; transform: scale(.92); } to { opacity: 1; transform: none; } }\n@keyframes fg-char-hop { from { opacity: 0; transform: translateY(.3em); } to { opacity: 1; transform: none; } }\n@keyframes fg-char-quake { 0%, 100% { opacity: 1; transform: translate(0, 0); } 25% { opacity: 1; transform: translate(.05em, -.04em); } 50% { opacity: 1; transform: translate(-.04em, .05em); } 75% { opacity: 1; transform: translate(.04em, .03em); } }\n.fg-wait { position: absolute; right: 2.6%; bottom: 20%; font-size: 1.2cqw; color: var(--accent); text-shadow: 0 0 .8cqw var(--accent); animation: fg-wait 1.1s ease-in-out infinite; }\n.fg-wait::before { content: var(--wait-glyph); }\n@keyframes fg-wait { 0%, 100% { transform: translateY(0) rotate(0); opacity: .9; } 50% { transform: translateY(-.35cqw) rotate(45deg); opacity: .5; } }\n.fg-quick { position: absolute; right: 2.4%; bottom: 7%; display: flex; gap: 1.5cqw; font-family: var(--font-latin); font-size: .98cqw; font-weight: 600; letter-spacing: .2em; z-index: 3; }\n.fg-quick button { color: var(--ink-dim); transition: color .2s, text-shadow .2s; position: relative; }\n.fg-quick button:hover, .fg-quick button.is-on { color: var(--ink); text-shadow: 0 0 .8cqw var(--accent); }\n.fg-quick button.is-on::after { content: ""; position: absolute; left: 0; right: .2em; bottom: -.3cqw; height: 1px; background: var(--accent); }\n.fg-progress { position: absolute; left: 4.2%; right: 30%; bottom: 8.6%; height: 2px; border-radius: 2px; background: rgba(255, 255, 255, .08); overflow: hidden; }\n.fg-progress i { position: absolute; left: 0; top: 0; bottom: 0; background: linear-gradient(90deg, var(--accent), var(--accent2)); box-shadow: 0 0 6px var(--accent); transition: width .4s ease; }\n.fg-status { position: absolute; left: 4.2%; bottom: 7%; font-size: .9cqw; letter-spacing: .1em; color: var(--ink-dim); display: flex; align-items: center; gap: .5cqw; }\n.fg-status::before { content: ""; width: .6cqw; height: .6cqw; border-radius: 50%; background: var(--accent3); box-shadow: 0 0 .6cqw var(--accent3); animation: fg-pulse 1.4s ease-in-out infinite; }\n\n/* ── 情境卡片（短信、信件……） ── */\n.fg-card { position: absolute; left: 50%; top: 42%; z-index: 21; width: 40cqw; transform: translate(-50%, -50%); animation: fg-card-in .7s cubic-bezier(.2, .8, .2, 1) both; font-size: 1.6cqw; line-height: 1.7; }\n@keyframes fg-card-in { from { opacity: 0; transform: translate(-50%, -42%) rotateX(35deg) scale(.9); } }\n.fg-card[data-card="sms"] { padding: 1.6cqw; border-radius: 2cqw; background: rgba(250, 250, 255, .94); color: #1b1d2a; box-shadow: 0 2cqw 5cqw rgba(0, 0, 0, .5); }\n.fg-card[data-card="sms"] .fg-card-head { font-size: 1cqw; color: #6b7280; text-align: center; margin-bottom: 1cqw; letter-spacing: .1em; }\n.fg-card[data-card="sms"] .fg-card-body { display: inline-block; max-width: 90%; padding: 1cqw 1.4cqw; border-radius: 1.6cqw 1.6cqw 1.6cqw .4cqw; background: #e8ebf4; }\n.fg-card[data-card="letter"], .fg-card[data-card="diary"] { padding: 3cqw 3.4cqw; background: repeating-linear-gradient(180deg, #fbf5e6 0 2.6cqw, #e9dcc0 2.6cqw calc(2.6cqw + 1px)), #fbf5e6; color: #4a3626; font-family: var(--font-display); box-shadow: 0 2cqw 5cqw rgba(0, 0, 0, .55); transform-origin: 50% 0; transform: translate(-50%, -50%) rotate(-1.2deg); }\n.fg-card[data-card="note"] { width: 28cqw; padding: 2.4cqw; background: #fff59d; color: #3b3200; font-family: var(--font-display); box-shadow: 0 1.4cqw 3cqw rgba(0, 0, 0, .45); transform: translate(-50%, -50%) rotate(2deg); }\n.fg-card[data-card="note"]::before { content: ""; position: absolute; left: 38%; top: -1cqw; width: 8cqw; height: 2cqw; background: rgba(255, 255, 255, .55); transform: rotate(-3deg); }\n.fg-card[data-card="news"] { padding: 2.4cqw; background: #f3f0e8; color: #111; font-family: var(--font-display); border-top: .6cqw double #111; box-shadow: 0 2cqw 5cqw rgba(0, 0, 0, .55); }\n.fg-card[data-card="news"] .fg-card-head { font-size: 2.6cqw; font-weight: 900; letter-spacing: .3em; border-bottom: 1px solid #111; margin-bottom: 1cqw; }\n.fg-card[data-card="terminal"] { padding: 2cqw; border-radius: .8cqw; background: rgba(4, 16, 8, .92); color: #67ff9a; font-family: "JetBrains Mono", "Cascadia Code", monospace; box-shadow: 0 0 3cqw rgba(60, 255, 140, .25), inset 0 0 2cqw rgba(60, 255, 140, .08); text-shadow: 0 0 .6cqw rgba(60, 255, 140, .7); }\n.fg-card[data-card="terminal"] .fg-card-body::after { content: "▌"; animation: fg-pulse 1s steps(2) infinite; }\n.fg-card[data-card="notice"], .fg-card[data-card="scroll"] { padding: 3cqw; background: linear-gradient(90deg, #c9a46a, #f1dcae 8%, #f6e7c4 50%, #f1dcae 92%, #c9a46a); color: #3a2410; font-family: var(--font-display); text-align: center; box-shadow: 0 2cqw 5cqw rgba(0, 0, 0, .55); }\n.fg-card[data-card="notice"]::after { content: "印"; position: absolute; right: 2cqw; bottom: 1.4cqw; width: 4cqw; height: 4cqw; border: .25cqw solid #b3261e; color: #b3261e; display: grid; place-items: center; font-size: 2cqw; transform: rotate(-12deg); animation: fg-stamp .4s .5s cubic-bezier(.3, 1.6, .5, 1) both; }\n@keyframes fg-stamp { from { opacity: 0; transform: scale(2.2) rotate(-12deg); } }\n\n/* ── 选项 ── */\n.fg-choices { position: absolute; inset: 0; z-index: 26; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1.3cqw; background: radial-gradient(70% 60% at 50% 45%, rgba(0, 0, 0, .25), rgba(0, 0, 0, .6)); animation: fg-fade-in .4s ease both; }\n.fg-choices-title { font-family: var(--font-latin); letter-spacing: .6em; font-size: 1.05cqw; color: var(--ink-dim); margin-bottom: .6cqw; }\n.fg-choice { position: relative; width: 46cqw; padding: 1.25cqw 2.4cqw 1.25cqw 6cqw; text-align: left; font-size: 1.7cqw; letter-spacing: .08em; border-radius: 99px; background: var(--box-bg); border: 1px solid var(--box-border); backdrop-filter: var(--box-blur); box-shadow: 0 .8cqw 2.4cqw rgba(0, 0, 0, .35); transition: transform .25s cubic-bezier(.2, .8, .2, 1), border-color .25s, box-shadow .25s; animation: fg-choice-in .55s cubic-bezier(.2, .8, .2, 1) both; animation-delay: calc(var(--i) * 90ms + 150ms); overflow: hidden; }\n.fg-choice::before { content: attr(data-n); position: absolute; left: 2.2cqw; top: 50%; transform: translateY(-50%); font-family: var(--font-latin); font-size: 1.5cqw; font-weight: 700; color: var(--accent); letter-spacing: .1em; }\n.fg-choice::after { content: ""; position: absolute; inset: 0; background: linear-gradient(100deg, transparent 30%, rgba(255, 255, 255, .16) 50%, transparent 70%); transform: translateX(-100%); transition: transform .6s ease; }\n.fg-choice:hover { transform: translateX(1.2cqw) scale(1.02); border-color: var(--accent); box-shadow: 0 0 2.4cqw color-mix(in oklab, var(--accent) 45%, transparent); }\n.fg-choice:hover::after { transform: translateX(100%); }\n@keyframes fg-choice-in { from { opacity: 0; transform: translateY(1.4cqw); } }\n.fg-free { display: flex; gap: .8cqw; width: 46cqw; animation: fg-choice-in .55s cubic-bezier(.2, .8, .2, 1) both; animation-delay: calc(var(--i) * 90ms + 150ms); }\n.fg-free input { flex: 1; min-width: 0; padding: 1cqw 1.8cqw; font: inherit; font-size: 1.45cqw; color: var(--ink); border-radius: 99px; border: 1px dashed var(--box-border); background: rgba(0, 0, 0, .35); outline: none; user-select: text; }\n.fg-free input:focus { border-color: var(--accent); border-style: solid; }\n.fg-free button { padding: 0 2cqw; border-radius: 99px; background: linear-gradient(100deg, var(--accent), var(--accent2)); font-size: 1.4cqw; font-weight: 700; letter-spacing: .2em; color: #fff; }\n\n/* ── 标题画面 ── */\n.fg-title { position: absolute; inset: 0; z-index: 50; display: flex; flex-direction: column; justify-content: center; padding-left: 8%; background: linear-gradient(90deg, rgba(4, 4, 14, .86) 0%, rgba(4, 4, 14, .55) 42%, transparent 75%); animation: fg-fade-in 1s ease both; }\n.fg-title-kicker { font-family: var(--font-latin); font-size: 1.1cqw; letter-spacing: .7em; color: var(--accent3); text-transform: uppercase; animation: fg-slide-in 1s .2s ease both; }\n.fg-title-logo { font-family: var(--font-display); font-weight: 900; font-size: 6cqw; line-height: 1.15; letter-spacing: .12em; margin: 1cqw 0 .6cqw; background: linear-gradient(100deg, #fff 10%, var(--accent) 45%, var(--accent2) 70%, var(--accent3)); -webkit-background-clip: text; background-clip: text; color: transparent; filter: drop-shadow(0 0 2.4cqw color-mix(in oklab, var(--accent2) 60%, transparent)); animation: fg-logo-in 1.4s .3s cubic-bezier(.2, .8, .2, 1) both; max-width: 60cqw; }\n.fg-title-sub { font-size: 1.2cqw; letter-spacing: .3em; color: var(--ink-dim); margin-bottom: 3.4cqw; animation: fg-slide-in 1s .6s ease both; }\n.fg-title-menu { display: flex; flex-direction: column; gap: .4cqw; align-items: flex-start; }\n.fg-title-menu button { font-family: var(--font-display); font-size: 1.75cqw; letter-spacing: .3em; padding: .45cqw 0; color: var(--ink-dim); position: relative; transition: color .2s, letter-spacing .3s, padding .3s; animation: fg-slide-in .8s ease both; animation-delay: calc(var(--i) * 80ms + 800ms); }\n.fg-title-menu button span { font-family: var(--font-latin); font-size: .9cqw; letter-spacing: .4em; margin-left: 1.2cqw; opacity: .55; }\n.fg-title-menu button.is-new { color: var(--ink); }\n.fg-title-menu button.is-new::after { content: "NEW"; position: absolute; top: .2cqw; right: -3.4cqw; padding: .1cqw .5cqw; border-radius: 99px; font-family: var(--font-latin); font-size: .7cqw; letter-spacing: .12em; color: #fff; background: linear-gradient(100deg, var(--accent), var(--accent2)); animation: fg-pulse 1.6s ease-in-out infinite; }\n.fg-title-menu button:hover { color: #fff; letter-spacing: .42em; padding-left: 1.6cqw; }\n.fg-title-menu button:hover::before { content: ""; position: absolute; left: 0; top: 50%; width: .9cqw; height: .9cqw; transform: translateY(-50%) rotate(45deg); background: var(--accent); box-shadow: 0 0 1cqw var(--accent); }\n.fg-title-foot { position: absolute; left: 8%; bottom: 5%; font-size: .85cqw; letter-spacing: .2em; color: rgba(255, 255, 255, .35); }\n@keyframes fg-logo-in { from { opacity: 0; letter-spacing: .5em; filter: blur(10px); } }\n@keyframes fg-slide-in { from { opacity: 0; transform: translateX(-1.6cqw); } }\n\n/* ── 面板（回想 / 鉴赏 / 人物志 / 设置） ── */\n.fg-panel { position: absolute; inset: 0; z-index: 60; display: flex; flex-direction: column; background: linear-gradient(135deg, rgba(8, 6, 22, .94), rgba(16, 10, 34, .92)); backdrop-filter: blur(16px); animation: fg-panel-in .35s cubic-bezier(.2, .8, .2, 1) both; user-select: text; }\n@keyframes fg-panel-in { from { opacity: 0; transform: scale(1.02); } }\n.fg-panel-head { display: flex; align-items: center; gap: 1.4cqw; padding: 2.2cqw 3cqw 1.2cqw; }\n.fg-panel-title { font-family: var(--font-display); font-size: 2.4cqw; font-weight: 700; letter-spacing: .24em; }\n.fg-panel-en { font-family: var(--font-latin); font-size: 1cqw; letter-spacing: .5em; color: var(--accent); text-transform: uppercase; }\n.fg-panel-head .fg-spacer { flex: 1; }\n.fg-panel-body { position: relative; flex: 1; overflow: auto; padding: 0 3cqw 2.4cqw; scrollbar-width: thin; scrollbar-color: var(--accent2) transparent; }\n.fg-tabs { display: flex; gap: .4cqw; padding: 0 3cqw 1cqw; flex-wrap: wrap; }\n.fg-tab { padding: .55cqw 1.4cqw; border-radius: 99px; font-size: 1.05cqw; letter-spacing: .12em; color: var(--ink-dim); border: 1px solid transparent; }\n.fg-tab.is-on { color: #fff; border-color: var(--box-border); background: linear-gradient(100deg, color-mix(in oklab, var(--accent) 35%, transparent), color-mix(in oklab, var(--accent2) 35%, transparent)); }\n\n.fg-log-item { display: grid; grid-template-columns: 9cqw 1fr; gap: 1.4cqw; padding: 1cqw 0; border-bottom: 1px solid rgba(255, 255, 255, .06); cursor: pointer; font-size: 1.35cqw; line-height: 1.7; }\n.fg-log-item:hover { background: linear-gradient(90deg, rgba(255, 255, 255, .04), transparent); }\n.fg-log-name { font-family: var(--font-display); font-weight: 700; text-align: right; letter-spacing: .1em; }\n.fg-log-turn { grid-column: 1 / -1; font-family: var(--font-latin); font-size: .95cqw; letter-spacing: .5em; color: var(--accent); padding-top: 1.4cqw; }\n\n/* 导演日志：左边历次记录，右边详情（实时输出 / 整理结果 / 原始输出 / 提示词）。两栏各自滚动。 */\n.fg-dlog { display: grid; grid-template-columns: 22cqw minmax(0, 1fr); gap: 2cqw; height: 100%; }\n.fg-dlog-side, .fg-dlog-detail { min-height: 0; overflow: auto; scrollbar-width: thin; scrollbar-color: var(--accent2) transparent; }\n.fg-dlog-side { display: flex; flex-direction: column; gap: .6cqw; padding-right: .4cqw; }\n.fg-dlog-detail { padding-right: .6cqw; }\n.fg-dlog-row { display: block; width: 100%; flex: none; text-align: left; padding: 1cqw 1.2cqw; border-radius: .8cqw; border: 1px solid var(--box-border); background: rgba(255, 255, 255, .03); transition: background .2s, border-color .2s; }\n.fg-dlog-row:hover { background: rgba(255, 255, 255, .07); }\n.fg-dlog-row.is-on { border-color: var(--accent); background: linear-gradient(100deg, color-mix(in oklab, var(--accent) 18%, transparent), color-mix(in oklab, var(--accent2) 8%, transparent)); }\n.fg-dlog-row-head { display: flex; align-items: center; justify-content: space-between; gap: .6cqw; font-size: 1.15cqw; letter-spacing: .08em; }\n.fg-dlog-row-meta { margin-top: .3cqw; font-size: .85cqw; color: var(--ink-dim); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }\n.fg-dlog-row-sum { margin-top: .4cqw; font-size: .95cqw; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }\n.fg-dlog-status { padding: .1cqw .7cqw; border-radius: 99px; border: 1px solid currentColor; font-size: .8cqw; letter-spacing: .1em; white-space: nowrap; }\n.fg-dlog-status.is-running { color: var(--accent); animation: fg-pulse 1.4s ease-in-out infinite; }\n.fg-dlog-status.is-ok { color: #6ef0a8; }\n.fg-dlog-status.is-failed { color: #ff8a8a; }\n.fg-dlog-status.is-cancelled { color: var(--ink-dim); }\n.fg-dlog-head { padding: 1.2cqw 1.4cqw; border-radius: 1cqw; background: rgba(255, 255, 255, .035); border: 1px solid var(--box-border); }\n.fg-dlog-title { display: flex; align-items: center; gap: 1cqw; margin-bottom: .8cqw; font-family: var(--font-display); font-size: 1.7cqw; letter-spacing: .16em; }\n.fg-dlog-title .fg-spacer, .fg-dlog-label .fg-spacer { flex: 1; }\n.fg-dlog-facts { display: grid; grid-template-columns: repeat(auto-fill, minmax(30cqw, 1fr)); gap: .3cqw 2cqw; font-size: 1cqw; line-height: 1.6; }\n.fg-dlog-facts i { margin-right: .8cqw; font-style: normal; color: var(--ink-dim); letter-spacing: .08em; }\n.fg-dlog-notice { margin-top: .6cqw; font-size: .95cqw; color: #ffd27a; }\n.fg-dlog-error { margin: .6cqw 0; font-size: 1cqw; white-space: pre-wrap; word-break: break-word; }\n.fg-dlog-tabs { padding: 1.2cqw 0 .4cqw; }\n.fg-dlog-block { margin: 1cqw 0; }\n.fg-dlog-label { display: flex; align-items: center; gap: .8cqw; margin-bottom: .5cqw; font-size: .95cqw; letter-spacing: .12em; color: var(--accent); }\n.fg-btn.is-mini { padding: .2cqw .9cqw; font-size: .85cqw; white-space: nowrap; }\n.fg-dlog-pre { margin: 0; max-height: 34cqw; overflow: auto; padding: 1cqw 1.2cqw; border-radius: .8cqw; background: rgba(0, 0, 0, .42); border: 1px solid var(--box-border); font-family: "JetBrains Mono", Consolas, monospace; font-size: .95cqw; line-height: 1.6; white-space: pre-wrap; word-break: break-word; color: var(--ink); scrollbar-width: thin; }\n.fg-dlog-pre.has-cursor::after { content: "▍"; color: var(--accent); animation: fg-pulse 1s steps(2) infinite; }\n.fg-dlog-meter { display: flex; align-items: center; gap: .8cqw; margin: .4cqw 0; font-size: 1cqw; color: var(--ink-dim); }\n.fg-dlog-dot { width: .8cqw; height: .8cqw; border-radius: 50%; background: var(--accent); box-shadow: 0 0 1cqw var(--accent); animation: fg-pulse 1s ease-in-out infinite; }\n.fg-dlog-think summary { margin: .4cqw 0; cursor: pointer; font-size: .95cqw; color: var(--ink-dim); }\n.fg-dlog-chips { display: flex; flex-wrap: wrap; gap: .5cqw; }\n.fg-dlog-chip { display: inline-flex; align-items: center; gap: .5cqw; padding: .2cqw .8cqw; border-radius: 99px; font-size: .9cqw; background: rgba(255, 255, 255, .06); border: 1px solid var(--box-border); }\n.fg-dlog-chip i { font-style: normal; font-size: .8cqw; color: var(--ink-dim); }\n.fg-dlog-lines { border-radius: .8cqw; border: 1px solid var(--box-border); overflow: hidden; }\n.fg-dlog-line { display: grid; grid-template-columns: 4cqw minmax(0, 1fr) minmax(0, 24cqw); gap: 1.2cqw; align-items: start; padding: .7cqw 1cqw; border-bottom: 1px solid rgba(255, 255, 255, .06); font-size: 1cqw; line-height: 1.6; }\n.fg-dlog-line:last-child { border-bottom: 0; }\n.fg-dlog-line.is-plain { opacity: .6; }\n.fg-dlog-line.is-skipped { opacity: .42; }\n.fg-dlog-line.is-skipped .fg-dlog-utext { text-decoration: line-through; text-decoration-color: rgba(255, 255, 255, .35); }\n.fg-dlog-uid { padding-top: .15cqw; font-family: var(--font-latin); font-size: .85cqw; letter-spacing: .1em; color: var(--accent); }\n.fg-dlog-card { margin-bottom: .6cqw; padding: .8cqw 1cqw; border-radius: .8cqw; background: rgba(255, 255, 255, .035); border: 1px solid var(--box-border); font-size: 1cqw; line-height: 1.6; }\n.fg-dlog-mono { margin-top: .4cqw; font-family: "JetBrains Mono", Consolas, monospace; font-size: .9cqw; word-break: break-word; }\n.fg-dlog-k { display: inline-block; margin-right: .6cqw; padding: 0 .5cqw; border-radius: .3cqw; font-style: normal; font-family: var(--font-body); font-size: .8cqw; letter-spacing: .08em; color: var(--ink-dim); border: 1px solid var(--box-border); }\n.fg-dlog-cgchar { margin-top: .4cqw; padding-left: .8cqw; border-left: 2px solid var(--box-border); }\n.fg-dlog-list-plain { margin: 0; padding-left: 2cqw; font-size: 1.05cqw; line-height: 1.8; }\n.fg-pill.is-link { cursor: pointer; transition: border-color .2s; }\n.fg-pill.is-link:hover { border-color: var(--accent); }\n\n.fg-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(20cqw, 1fr)); gap: 1.4cqw; }\n.fg-thumb { position: relative; aspect-ratio: 16 / 10; border-radius: 1cqw; overflow: hidden; background: rgba(255, 255, 255, .04); border: 1px solid var(--box-border); cursor: zoom-in; transition: transform .25s, box-shadow .25s; }\n.fg-thumb:hover { transform: translateY(-.4cqw); box-shadow: 0 1cqw 3cqw rgba(0, 0, 0, .5), 0 0 0 1px var(--accent); }\n.fg-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }\n.fg-thumb-cap { position: absolute; left: 0; right: 0; bottom: 0; padding: 2cqw 1cqw .7cqw; font-size: 1cqw; letter-spacing: .1em; background: linear-gradient(transparent, rgba(0, 0, 0, .75)); }\n.fg-thumb.is-locked { cursor: default; display: grid; place-items: center; color: var(--ink-dim); font-size: 1cqw; background: repeating-linear-gradient(45deg, rgba(255, 255, 255, .03) 0 1cqw, transparent 1cqw 2cqw); }\n\n.fg-person { display: grid; grid-template-columns: 13cqw 1fr; gap: 2cqw; padding: 1.6cqw; margin-bottom: 1.4cqw; border-radius: 1.2cqw; background: rgba(255, 255, 255, .035); border: 1px solid var(--box-border); }\n.fg-track { display: grid; grid-template-columns: 4.2cqw 1fr; gap: 1.4cqw; padding: 1.2cqw 1.4cqw; margin-bottom: 1cqw; border-radius: 1cqw; background: rgba(255, 255, 255, .035); border: 1px solid var(--box-border); }\n.fg-track-body { display: grid; gap: .6cqw; min-width: 0; }\n.fg-track-play { width: 4.2cqw; height: 4.2cqw; border-radius: 50%; border: 1px solid var(--box-border); background: rgba(0, 0, 0, .3); color: var(--ink); font-size: 1.3cqw; cursor: pointer; transition: background .2s, border-color .2s, box-shadow .2s; }\n.fg-track-play:hover { border-color: var(--accent); }\n.fg-track-play.is-on { background: var(--accent); border-color: var(--accent); color: #111; box-shadow: 0 0 1.4cqw color-mix(in oklab, var(--accent) 55%, transparent); }\n.fg-track-desc { min-height: 4.6cqw; font-family: var(--font-body); font-size: 1.05cqw; }\n.fg-person-art { position: relative; height: 19cqw; border-radius: .8cqw; overflow: hidden; background: radial-gradient(circle at 50% 30%, color-mix(in oklab, var(--c) 40%, transparent), rgba(0, 0, 0, .3)); }\n.fg-person-art img { width: 100%; height: 100%; object-fit: cover; object-position: top; }\n.fg-person-art .fg-silhouette { height: 100%; }\n.fg-person h3 { margin: 0 0 .6cqw; font-family: var(--font-display); font-size: 2cqw; letter-spacing: .2em; display: flex; align-items: center; gap: 1cqw; }\n.fg-person h3 small { font-family: var(--font-body); font-size: .9cqw; letter-spacing: .1em; padding: .2cqw .7cqw; border-radius: 99px; border: 1px solid var(--box-border); color: var(--ink-dim); }\n.fg-emos { display: flex; flex-wrap: wrap; gap: .5cqw; margin: .8cqw 0; }\n.fg-emo { position: relative; width: 5.4cqw; height: 6.6cqw; border-radius: .6cqw; overflow: hidden; border: 1px solid var(--box-border); background: rgba(0, 0, 0, .3); font-size: .78cqw; color: var(--ink-dim); cursor: pointer; transition: border-color .2s, transform .2s; }\n.fg-emo img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: top; }\n.fg-emo span { position: absolute; left: 0; right: 0; bottom: 0; padding: 1.4cqw .2cqw .3cqw; line-height: 1.2; text-align: center; text-shadow: 0 1px 3px #000; background: linear-gradient(transparent, rgba(0, 0, 0, .78) 70%); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }\n.fg-emo.is-busy::after { content: ""; position: absolute; inset: 0; background: linear-gradient(100deg, transparent 20%, rgba(255, 255, 255, .25), transparent 80%); background-size: 200% 100%; animation: fg-skeleton 1.2s linear infinite; }\n.fg-emo:hover { border-color: var(--accent); transform: translateY(-.2cqw); }\n.fg-emo.is-on { border-color: var(--accent); box-shadow: 0 0 0 1px var(--accent), 0 0 1.2cqw color-mix(in oklab, var(--accent) 45%, transparent); }\n.fg-emo.is-custom { border-style: dashed; }\n.fg-emo.is-custom span { color: var(--ink); }\n.fg-person-main { min-width: 0; }\n.fg-person-tags { font-family: "JetBrains Mono", Consolas, monospace; font-size: .9cqw; color: var(--ink-dim); line-height: 1.5; margin-bottom: .6cqw; word-break: break-word; }\n.fg-person-folds .fg-btn.is-on, .fg-btn.is-on { border-color: var(--accent); background: color-mix(in oklab, var(--accent) 22%, transparent); }\n.fg-person-form { margin: .8cqw 0; padding: 1cqw 1.2cqw; border-radius: .9cqw; background: rgba(0, 0, 0, .22); border: 1px solid var(--box-border); }\n.fg-person-form .fg-field { grid-template-columns: 9cqw 1fr; }\n.fg-textarea.is-short { min-height: 4cqw; }\n/* 固定外貌按字段：两列格子，「其他」占一整行；人物卡片上每个字段一个小标签 */\n.fg-look-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .6cqw .9cqw; }\n.fg-look-field { display: flex; flex-direction: column; gap: .25cqw; }\n.fg-look-field > span { font-size: .85cqw; color: var(--ink-dim); letter-spacing: .08em; }\n.fg-look-field.is-wide { grid-column: 1 / -1; }\n.fg-look-chip { display: inline-flex; gap: .35em; margin: 0 .35cqw .35cqw 0; padding: .1cqw .55cqw; border-radius: 99px; background: rgba(255, 255, 255, .07); border: 1px solid rgba(255, 255, 255, .1); }\n.fg-look-chip i { font-style: normal; opacity: .55; }\n.fg-cg-chars { display: grid; gap: .9cqw; margin: .9cqw 0 .9cqw 15.2cqw; }\n.fg-cg-char { display: grid; gap: .6cqw; padding: 1cqw; border-radius: .9cqw; border: 1px solid var(--box-border); background: rgba(0, 0, 0, .18); }\n.fg-sent { user-select: text; margin-top: .4cqw; display: grid; gap: .3cqw; word-break: break-word; }\n.fg-wardrobe { display: grid; gap: .5cqw; margin-bottom: .6cqw; }\n.fg-outfit { display: grid; grid-template-columns: 8cqw 1fr auto auto; gap: .7cqw; align-items: center; padding: .4cqw .6cqw; border-radius: .7cqw; border: 1px solid transparent; }\n.fg-outfit b { font-size: 1.1cqw; letter-spacing: .1em; }\n.fg-outfit.is-on { border-color: color-mix(in oklab, var(--accent) 60%, transparent); background: color-mix(in oklab, var(--accent) 10%, transparent); }\n.fg-outfit.is-new { grid-template-columns: 8cqw 1fr auto; }\n.fg-state { display: inline-flex; align-items: center; gap: .4cqw; padding: .3cqw .5cqw .3cqw .9cqw; border-radius: 99px; font-size: 1cqw; background: color-mix(in oklab, var(--accent2) 22%, transparent); border: 1px solid color-mix(in oklab, var(--accent2) 55%, transparent); }\n.fg-state button { width: 1.5cqw; height: 1.5cqw; border-radius: 50%; font-size: .8cqw; color: var(--ink-dim); }\n.fg-state button:hover { color: #fff; background: rgba(255, 255, 255, .15); }\n.fg-looks { display: flex; flex-wrap: wrap; align-items: center; gap: .5cqw; margin-top: 1cqw; }\n.fg-look { display: inline-flex; align-items: center; gap: .5cqw; padding: .45cqw 1.1cqw; border-radius: 99px; font-size: 1cqw; letter-spacing: .08em; border: 1px solid var(--box-border); color: var(--ink-dim); background: rgba(255, 255, 255, .04); }\n.fg-look i { font-style: normal; font-size: .8cqw; padding: .05cqw .5cqw; border-radius: 99px; background: var(--accent); color: #111; }\n.fg-look.is-on { color: #fff; border-color: var(--accent); background: color-mix(in oklab, var(--accent) 22%, transparent); }\n.fg-variant { display: grid; grid-template-columns: 11cqw 1fr; gap: 1.4cqw; margin: .4cqw 0 1cqw; padding: 1cqw; border-radius: .9cqw; background: rgba(0, 0, 0, .25); border: 1px solid color-mix(in oklab, var(--accent) 45%, var(--box-border)); animation: fg-pop .25s ease-out; }\n.fg-variant-art { height: 15cqw; border-radius: .7cqw; overflow: hidden; display: grid; place-items: center; font-size: 1cqw; color: var(--ink-dim); background: repeating-conic-gradient(rgba(255, 255, 255, .05) 0 25%, transparent 0 50%) 0 0 / 1.4cqw 1.4cqw; }\n.fg-variant-art img { width: 100%; height: 100%; object-fit: contain; object-position: top; }\n.fg-row > .fg-spacer, .fg-looks > .fg-spacer { flex: 1; }\n/* 管理立绘：格子多选、批量删除 */\n.fg-manage { margin: .4cqw 0; padding: .6cqw 1cqw; border-radius: .8cqw; background: rgba(0, 0, 0, .25); border: 1px dashed var(--box-border); }\n.fg-emo.is-picked { border-color: #ff6b6b; box-shadow: 0 0 0 2px #ff6b6b; }\n.fg-emo.is-picked::before { content: "✓"; position: absolute; top: .3cqw; right: .3cqw; z-index: 1; width: 1.4cqw; height: 1.4cqw; border-radius: 50%; background: #ff6b6b; color: #111; font-size: .9cqw; line-height: 1.4cqw; text-align: center; }\n.fg-emo:disabled { opacity: .35; cursor: default; transform: none; }\n.fg-btn.fg-danger:not(:disabled) { border-color: #ff6b6b; color: #ffb3b3; }\n/* 逆转式立绘工作台：左边勾差分，右边框眼睛和嘴、看效果 */\n.fg-aa-bench { padding: 1.4cqw; border-radius: 1.2cqw; background: rgba(255, 255, 255, .035); border: 1px solid var(--box-border); }\n.fg-aa-grid { display: grid; grid-template-columns: 24cqw 1fr; gap: 1.6cqw; margin-top: 1cqw; }\n.fg-aa-list { display: flex; flex-direction: column; gap: .5cqw; max-height: 44cqw; overflow: auto; padding-right: .4cqw; scrollbar-width: thin; }\n.fg-aa-item { display: grid; grid-template-columns: auto 4cqw 1fr; align-items: center; gap: .7cqw; padding: .4cqw .6cqw; border-radius: .7cqw; border: 1px solid var(--box-border); background: rgba(0, 0, 0, .22); cursor: pointer; }\n.fg-aa-item.is-on { border-color: var(--accent); background: color-mix(in oklab, var(--accent) 16%, rgba(0, 0, 0, .3)); }\n.fg-aa-item img { width: 4cqw; height: 5cqw; object-fit: cover; object-position: top; border-radius: .4cqw; }\n.fg-aa-item b { display: block; font-size: 1cqw; }\n.fg-aa-item small { display: block; font-size: .8cqw; color: var(--ink-dim); }\n.fg-aa-stage { min-width: 0; display: flex; flex-direction: column; gap: .7cqw; }\n.fg-aa-frame, .fg-aa-play { position: relative; width: 100%; height: 34cqw; border-radius: .8cqw; overflow: hidden; background: repeating-conic-gradient(rgba(255, 255, 255, .06) 0 25%, transparent 0 50%) 0 0 / 1.4cqw 1.4cqw; }\n.fg-aa-frame { touch-action: none; user-select: none; }\n.fg-aa-box rect { fill: rgba(255, 255, 255, .1); stroke: currentColor; stroke-width: 2; vector-effect: non-scaling-stroke; cursor: move; }\n.fg-aa-box rect.fg-aa-handle { fill: currentColor; cursor: nwse-resize; }\n.fg-aa-box.is-eyes { color: #5fd3ff; }\n.fg-aa-box.is-mouth { color: #ff8ad8; }\n.fg-aa-box.is-face { color: #ffd166; }\n.fg-face-info { gap: .6cqw; margin: .4cqw 0; }\n.fg-face-editor { margin: .6cqw 0; }\n.fg-face-editor .fg-aa-frame { height: 28cqw; }\n.fg-pose-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: .8cqw; width: 100%; }\n.fg-pose-col { display: flex; flex-direction: column; gap: .3cqw; padding: .6cqw; border-radius: .6cqw; background: rgba(255, 255, 255, .05); }\n.fg-pose-item { display: flex; align-items: center; justify-content: space-between; gap: .4cqw; font-size: .92em; }\n.fg-pose-item i { opacity: .7; font-style: normal; }\n.fg-pose-item select { max-width: 50%; }\n.fg-aa-box text { fill: currentColor; paint-order: stroke; stroke: rgba(0, 0, 0, .75); stroke-width: 3px; pointer-events: none; }\n.fg-aa-play > canvas, .fg-aa-play > img { position: absolute; left: 50%; top: 0; height: 100%; width: auto; transform: translateX(-50%); }\n.fg-aa-play.is-close { width: 34cqw; height: auto; aspect-ratio: 1; align-self: center; }\n.fg-aa-play.is-close canvas, .fg-aa-play.is-close img { display: block; width: 100%; height: auto; }\n.fg-aa-states { display: grid; grid-template-columns: repeat(3, 1fr); gap: .8cqw; }\n.fg-aa-state { display: flex; flex-direction: column; align-items: center; gap: .3cqw; font-size: .9cqw; }\n.fg-aa-thumb { width: 100%; height: auto; border-radius: .5cqw; background: repeating-conic-gradient(rgba(255, 255, 255, .06) 0 25%, transparent 0 50%) 0 0 / 1cqw 1cqw; }\n.fg-aa-actions { margin-top: 1.2cqw; }\n/* 自动框：认脸模型条、列表里的结果标记 */\n.fg-aa-vision { display: grid; gap: .5cqw; margin-top: .9cqw; padding: .7cqw 1cqw; border-radius: .8cqw; background: rgba(0, 0, 0, .2); border: 1px solid var(--box-border); font-size: .95cqw; }\n.fg-aa-vision select { font: inherit; color: var(--ink); background: rgba(0, 0, 0, .35); border: 1px solid var(--box-border); border-radius: .4cqw; padding: .1cqw .4cqw; }\n.fg-aa-vision progress { flex: 1; min-width: 10cqw; height: .7cqw; accent-color: var(--accent); }\n.fg-aa-vision .fg-check { display: inline-flex; align-items: center; gap: .4cqw; cursor: pointer; }\n.fg-aa-badge { margin-left: .5cqw; padding: 0 .5cqw; border-radius: 99px; font-style: normal; font-size: .75cqw; font-weight: normal; vertical-align: middle; }\n.fg-aa-badge.is-ok { background: rgba(110, 240, 168, .2); color: #6ef0a8; }\n.fg-aa-badge.is-warn { background: rgba(255, 210, 110, .2); color: #ffd26e; }\n.fg-aa-badge.is-bad { background: rgba(255, 138, 138, .2); color: #ff8a8a; }\n/* 人物志里的立绘小图：做过逆转式动态的直接动；点一下放大 */\n.fg-sprite-art { position: relative; display: block; width: 100%; height: 100%; padding: 0; border: 0; background: none; cursor: zoom-in; }\n.fg-sprite-art img, .fg-sprite-art canvas { display: block; width: 100%; height: 100%; object-fit: cover; object-position: top; }\n.fg-variant-art .fg-sprite-art img, .fg-variant-art .fg-sprite-art canvas { object-fit: contain; }\n.fg-sprite-art i { position: absolute; top: .4cqw; left: .4cqw; padding: .05cqw .5cqw; border-radius: 99px; font-style: normal; font-size: .8cqw; background: var(--accent); color: #111; }\n.fg-sprite-art span { position: absolute; right: .4cqw; bottom: .4cqw; font-size: 1cqw; opacity: 0; transition: opacity .2s; text-shadow: 0 1px 3px #000; }\n.fg-sprite-art:hover span { opacity: 1; }\n/* 放大看立绘 */\n.fg-viewer-stage { display: flex; align-items: center; justify-content: center; max-width: 92%; height: min(46cqw, 76cqh); }\n.fg-viewer-stage > img { max-width: 100%; max-height: 100%; object-fit: contain; box-shadow: 0 0 6cqw rgba(0, 0, 0, .8); }\n.fg-aa-play.is-big { width: 60cqw; height: min(46cqw, 76cqh); background: none; }\n.fg-aa-play.is-big.is-close { width: min(46cqw, 76cqh); height: auto; aspect-ratio: 1; }\n.fg-variant-body { display: grid; gap: .6cqw; align-content: start; min-width: 0; }\n.fg-variant-body b { font-size: 1.15cqw; letter-spacing: .08em; }\n.fg-emotion-row { display: grid; grid-template-columns: 12cqw 1fr 9cqw auto auto; gap: .8cqw; align-items: center; padding: .6cqw 0; border-bottom: 1px solid rgba(255, 255, 255, .05); }\n.fg-emotion-row b { font-size: 1.15cqw; letter-spacing: .06em; }\n.fg-emotion-row.is-new { grid-template-columns: 12cqw 1fr 9cqw auto; border-bottom: 0; margin-top: .6cqw; }\n.fg-chip small { margin-left: .3em; opacity: .55; font-size: .85em; }\n\n/* 表单 */\n.fg-field { display: grid; grid-template-columns: 14cqw 1fr; gap: 1.2cqw; align-items: center; margin: .9cqw 0; font-size: 1.1cqw; }\n.fg-field > label { color: var(--ink-dim); letter-spacing: .08em; }\n.fg-field small { grid-column: 2; color: var(--ink-dim); font-size: .9cqw; margin-top: -.6cqw; }\n.fg-input, .fg-select, .fg-textarea { width: 100%; padding: .7cqw 1cqw; font: inherit; font-size: 1.1cqw; color: var(--ink); background: rgba(0, 0, 0, .35); border: 1px solid var(--box-border); border-radius: .6cqw; outline: none; }\n.fg-select option { background: #14122a; }\n.fg-textarea { min-height: 7cqw; resize: vertical; line-height: 1.5; font-family: "JetBrains Mono", Consolas, monospace; font-size: 1cqw; }\n.fg-input:focus, .fg-select:focus, .fg-textarea:focus { border-color: var(--accent); }\n.fg-btn { display: inline-flex; align-items: center; gap: .5cqw; padding: .6cqw 1.4cqw; border-radius: 99px; font-size: 1.05cqw; letter-spacing: .1em; border: 1px solid var(--box-border); background: rgba(255, 255, 255, .05); transition: background .2s, border-color .2s; }\n.fg-btn:hover { background: rgba(255, 255, 255, .12); border-color: var(--accent); }\n.fg-btn.is-primary { background: linear-gradient(100deg, var(--accent), var(--accent2)); border-color: transparent; color: #fff; font-weight: 700; }\n.fg-btn[disabled] { opacity: .45; pointer-events: none; }\n.fg-row { display: flex; gap: .8cqw; flex-wrap: wrap; align-items: center; }\n.fg-switch { position: relative; width: 3.4cqw; height: 1.9cqw; border-radius: 99px; background: rgba(255, 255, 255, .14); transition: background .2s; }\n.fg-switch::after { content: ""; position: absolute; left: .25cqw; top: .25cqw; width: 1.4cqw; height: 1.4cqw; border-radius: 50%; background: #fff; transition: transform .25s cubic-bezier(.3, 1.4, .5, 1); }\n.fg-switch.is-on { background: linear-gradient(100deg, var(--accent), var(--accent2)); }\n.fg-switch.is-on::after { transform: translateX(1.5cqw); }\n.fg-note { font-size: .95cqw; color: var(--ink-dim); line-height: 1.6; }\n.fg-ok { color: #6ef0a8; } .fg-err { color: #ff8a8a; }\n.fg-section { margin: 1.6cqw 0 .6cqw; font-family: var(--font-display); font-size: 1.4cqw; letter-spacing: .2em; display: flex; align-items: center; gap: .8cqw; }\n.fg-section::after { content: ""; flex: 1; height: 1px; background: linear-gradient(90deg, var(--box-border), transparent); }\n.fg-skins { display: grid; grid-template-columns: repeat(auto-fill, minmax(15cqw, 1fr)); gap: 1cqw; }\n.fg-skin { padding: 1cqw; border-radius: 1cqw; border: 1px solid var(--box-border); text-align: left; transition: transform .2s; }\n.fg-skin:hover { transform: translateY(-.3cqw); }\n.fg-skin.is-on { box-shadow: 0 0 0 2px var(--accent); }\n.fg-skin-swatch { height: 4cqw; border-radius: .6cqw; margin-bottom: .6cqw; }\n.fg-skin b { display: block; font-size: 1.1cqw; letter-spacing: .1em; } .fg-skin span { font-size: .85cqw; color: var(--ink-dim); }\n.fg-style { display: flex; flex-direction: column; min-width: 0; }\n.fg-style > span { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; word-break: break-all; }\n.fg-styles { grid-template-columns: repeat(auto-fill, minmax(12cqw, 1fr)); }\n/* 样图是竖版（试画按竖版尺寸画），卡片封面也竖着放。 */\n.fg-style-cover { display: grid; place-items: center; aspect-ratio: 832 / 1216; margin-bottom: .6cqw; border-radius: .6cqw; background: linear-gradient(160deg, rgba(255, 255, 255, .09), rgba(255, 255, 255, .02)) center top / cover no-repeat; font-size: .85cqw; color: var(--ink-dim); }\n.fg-style-cover span { font-size: inherit; color: inherit; }\n.fg-style.is-new .fg-style-cover { font-size: 3cqw; border: 1px dashed var(--box-border); background: none; }\n.fg-sent i { opacity: .7; }\n\n.fg-update-done { margin: .8cqw 0; padding: .9cqw 1.2cqw; border-radius: .8cqw; font-size: 1.05cqw; line-height: 1.6; color: #6ef0a8; background: rgba(110, 240, 168, .08); border: 1px solid rgba(110, 240, 168, .3); }\n/* 文件更新了、DSH 还没重启：网页新、后台旧，提醒重启 */\n.fg-restart { margin: 0 3cqw .8cqw; padding: .7cqw 1.1cqw; border-radius: .8cqw; font-size: 1cqw; line-height: 1.55; color: #ffd59a; background: rgba(217, 130, 43, .14); border: 1px solid rgba(217, 130, 43, .55); }\n.fg-restart b { color: #fff0d6; }\n.fg-restart.is-floating { position: absolute; top: 1.2cqw; left: 50%; transform: translateX(-50%); z-index: 40; width: max-content; max-width: 70cqw; margin: 0; background: rgba(40, 24, 8, .86); backdrop-filter: blur(6px); }\n.fg-changes { margin: .4cqw 0 0 15.2cqw; border-radius: .8cqw; border: 1px solid var(--box-border); overflow: hidden; }\n.fg-changes > div { display: grid; grid-template-columns: 6cqw 1fr auto; gap: 1cqw; padding: .6cqw 1cqw; font-size: 1cqw; line-height: 1.5; border-bottom: 1px solid rgba(255, 255, 255, .06); }\n.fg-changes > div:last-child { border-bottom: 0; }\n.fg-changes code, .fg-note code { font-family: "JetBrains Mono", Consolas, monospace; color: var(--accent); }\n.fg-changes small { color: var(--ink-dim); white-space: nowrap; }\n\n.fg-lightbox { position: fixed; inset: 0; width: 100vw; height: 100vh; height: 100dvh; z-index: 80; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1.2cqw; background: rgba(0, 0, 0, .9); animation: fg-fade-in .25s ease both; cursor: zoom-out; }\n.fg-lightbox img { max-width: 92%; max-height: 82%; object-fit: contain; box-shadow: 0 0 6cqw rgba(0, 0, 0, .8); cursor: default; }\n.fg-lightbox .fg-row { cursor: default; }\n\n@keyframes fg-fade-in { from { opacity: 0; } }\n@keyframes fg-fade-out { to { opacity: 0; } }\n@keyframes fg-spin { to { transform: rotate(360deg); } }\n@keyframes fg-pulse { 0%, 100% { opacity: 1; } 50% { opacity: .3; } }\n@keyframes fg-skeleton { from { background-position: 200% 0; } to { background-position: -200% 0; } }\n@keyframes fg-pop { from { opacity: 0; transform: translateY(-.4cqw); } to { opacity: 1; transform: none; } }\n\n@media (prefers-reduced-motion: reduce) {\n  .fg-bg, .fg-cg-img, .fg-actor-body, .fg-box::before, .fg-sky::after, .fg-symbol-art, .fg-symbol-art svg { animation: none !important; }\n  .fg-cg-pan { animation: none !important; transform: scale(var(--r)); }\n  .fg-text[class*="say-"] .fg-char, .fg-char.is-stress { animation: fg-char-in .22s ease forwards var(--d) !important; }\n  .fg-text.is-done .fg-char { animation: none !important; opacity: 1; }\n  .fg-text.is-wait .fg-char { animation: none !important; }\n}\n@container stage (max-aspect-ratio: 4/5) {\n  .fg-actor { width: 60%; height: 60%; bottom: 23%; }\n  .fg-dialog { left: 3%; right: 3%; height: 22%; }\n  .fg-text { font-size: 4.6cqw; top: 18%; bottom: 26%; }\n  .fg-progress { bottom: 12%; right: 4.2%; }\n  .fg-quick { bottom: 5%; left: 4.2%; justify-content: space-between; font-size: 2.4cqw; gap: 3cqw; }\n  .fg-wait { bottom: 28%; }\n  .fg-status { display: none; }\n  .fg-name-plate { font-size: 4cqw; } .fg-name { top: -5cqw; }\n  .fg-iconbtn { width: 9cqw; height: 9cqw; font-size: 4cqw; }\n  .fg-hud-place { font-size: 4cqw; } .fg-hud-meta { font-size: 2.6cqw; }\n  .fg-choice, .fg-free { width: 88cqw; font-size: 4cqw; }\n  .fg-title-logo { font-size: 11cqw; max-width: 90cqw; } .fg-title-menu button { font-size: 4.4cqw; }\n  .fg-dlog { grid-template-columns: 1fr; grid-template-rows: auto minmax(0, 1fr); }\n  .fg-dlog-side { flex-direction: row; overflow-x: auto; padding: 0 0 1cqw; }\n  .fg-dlog-row { width: 46cqw; }\n  .fg-dlog-row-head, .fg-dlog-title { font-size: 3.6cqw; }\n  .fg-dlog-row-meta, .fg-dlog-row-sum, .fg-dlog-status, .fg-dlog-label, .fg-dlog-meter, .fg-dlog-think summary, .fg-dlog-chip, .fg-dlog-chip i, .fg-btn.is-mini { font-size: 2.8cqw; }\n  .fg-dlog-facts, .fg-dlog-notice, .fg-dlog-error, .fg-dlog-pre, .fg-dlog-line, .fg-dlog-card, .fg-dlog-mono, .fg-dlog-list-plain { font-size: 3cqw; }\n  .fg-dlog-facts { grid-template-columns: 1fr; }\n  .fg-dlog-pre { max-height: 90cqw; }\n  .fg-dlog-line { grid-template-columns: 9cqw minmax(0, 1fr); }\n  .fg-dlog-line > .fg-dlog-chips { grid-column: 2; }\n  .fg-dlog .fg-note, .fg-dlog-uid { font-size: 2.6cqw; }\n  .fg-dlog-list-plain { padding-left: 6cqw; }\n  .fg-panel-title { font-size: 6cqw; } .fg-panel-en { font-size: 2.2cqw; }\n  .fg-tab { padding: 1.2cqw 3cqw; font-size: 3.2cqw; }\n  .fg-pill { padding: .8cqw 2.2cqw; font-size: 2.6cqw; }\n  .fg-person { grid-template-columns: 1fr; }\n  .fg-person-art { height: 50cqw; }\n  .fg-person h3 { font-size: 5cqw; flex-wrap: wrap; } .fg-person h3 small { font-size: 2.6cqw; }\n  .fg-person-tags, .fg-note { font-size: 2.8cqw; }\n  .fg-look-grid { grid-template-columns: 1fr; } .fg-look-field > span { font-size: 2.6cqw; }\n  .fg-btn, .fg-look, .fg-state { font-size: 3cqw; padding: 1cqw 2.4cqw; }\n  .fg-emo { width: 15cqw; height: 18cqw; font-size: 2.4cqw; }\n  .fg-field, .fg-person-form .fg-field { grid-template-columns: 1fr; font-size: 3cqw; }\n  .fg-input, .fg-select, .fg-textarea { font-size: 3cqw; }\n  .fg-outfit, .fg-outfit.is-new, .fg-emotion-row, .fg-emotion-row.is-new { grid-template-columns: 1fr; }\n  .fg-variant { grid-template-columns: 1fr; } .fg-variant-art { height: 50cqw; }\n  .fg-aa-grid { grid-template-columns: 1fr; } .fg-aa-list { max-height: 50cqw; }\n  .fg-aa-vision { font-size: 2.6cqw; } .fg-aa-badge { font-size: 2.2cqw; } .fg-aa-vision progress { height: 1.6cqw; }\n  .fg-pose-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }\n  .fg-face-editor .fg-aa-frame { height: 80cqw; }\n  .fg-aa-frame, .fg-aa-play { height: 90cqw; } .fg-aa-play.is-close { width: 90cqw; }\n  .fg-aa-item img { width: 9cqw; height: 11cqw; } .fg-aa-item { grid-template-columns: auto 9cqw 1fr; }\n  .fg-track { grid-template-columns: 9cqw 1fr; gap: 2cqw; padding: 2cqw; }\n  .fg-track-play { width: 9cqw; height: 9cqw; font-size: 3cqw; }\n  .fg-track-desc { min-height: 12cqw; font-size: 3cqw; }\n}\n';

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
var chat_default = '/* ───────────── 聊天里的场景卡与插画（Tavern 正文下方） ───────────── */\n.fg-chat { --accent: #ff7eb6; --accent2: #9b7bff; --accent3: #5ee7ff; font-family: inherit; color: inherit; margin: 10px 0; max-width: 680px; }\n.fg-chat *, .fg-chat *::before, .fg-chat *::after { box-sizing: border-box; }\n.fg-chat button { font: inherit; cursor: pointer; }\n\n.fg-scene { position: relative; display: grid; grid-template-columns: 112px 1fr; min-height: 108px; border-radius: 14px; overflow: hidden; color: #f5f3ff; background: #110e24; border: 1px solid rgba(255, 255, 255, .1); box-shadow: 0 10px 30px rgba(0, 0, 0, .25); isolation: isolate; }\n.fg-scene-bg { position: absolute; inset: 0; z-index: -2; background-size: cover; background-position: center; filter: saturate(1.1); transform: scale(1.05); transition: transform 6s ease; }\n.fg-scene:hover .fg-scene-bg { transform: scale(1.12); }\n.fg-scene::before { content: ""; position: absolute; inset: 0; z-index: -1; background: linear-gradient(90deg, rgba(10, 8, 26, .2) 0, rgba(10, 8, 26, .78) 112px, rgba(10, 8, 26, .9)); }\n.fg-scene-clock { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; padding: 10px; font-family: "Cormorant Garamond", Georgia, serif; text-shadow: 0 1px 6px rgba(0, 0, 0, .8); }\n.fg-scene-clock b { font-size: 30px; line-height: 1; font-weight: 700; letter-spacing: .02em; }\n.fg-scene-clock span { font-size: 10px; letter-spacing: .35em; opacity: .8; text-transform: uppercase; }\n.fg-scene-main { padding: 12px 14px 12px 4px; display: flex; flex-direction: column; gap: 6px; min-width: 0; }\n.fg-scene-loc { font-size: 17px; font-weight: 700; letter-spacing: .12em; display: flex; align-items: center; gap: 8px; }\n.fg-scene-loc::before { content: ""; width: 3px; height: 16px; border-radius: 3px; background: linear-gradient(180deg, var(--accent), var(--accent2)); box-shadow: 0 0 8px var(--accent); }\n.fg-scene-chips { display: flex; flex-wrap: wrap; gap: 5px; }\n.fg-chip { display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 99px; font-size: 11px; letter-spacing: .06em; background: rgba(255, 255, 255, .09); border: 1px solid rgba(255, 255, 255, .12); }\n.fg-chip i { width: 7px; height: 7px; border-radius: 50%; background: var(--c, var(--accent)); box-shadow: 0 0 6px var(--c, var(--accent)); }\n.fg-scene-sum { font-size: 12.5px; opacity: .78; line-height: 1.5; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }\n.fg-scene-actions { display: flex; gap: 6px; margin-top: auto; flex-wrap: wrap; }\n.fg-play { display: inline-flex; align-items: center; gap: 6px; padding: 5px 14px 5px 10px; border-radius: 99px; border: 0; color: #fff; font-weight: 700; font-size: 12.5px; letter-spacing: .1em; background: linear-gradient(100deg, var(--accent), var(--accent2)); box-shadow: 0 4px 16px rgba(255, 126, 182, .35); transition: transform .2s, box-shadow .2s; }\n.fg-play:hover { transform: translateY(-1px); box-shadow: 0 6px 22px rgba(255, 126, 182, .5); }\n.fg-play::before { content: ""; width: 0; height: 0; border-left: 8px solid #fff; border-top: 5px solid transparent; border-bottom: 5px solid transparent; }\n.fg-ghost { padding: 5px 12px; border-radius: 99px; font-size: 12px; color: inherit; background: rgba(255, 255, 255, .08); border: 1px solid rgba(255, 255, 255, .16); transition: background .2s; }\n.fg-ghost:hover { background: rgba(255, 255, 255, .16); }\n.fg-scene.is-pending .fg-scene-main::after { content: ""; position: absolute; inset: 0; background: linear-gradient(100deg, transparent 30%, rgba(255, 255, 255, .08) 50%, transparent 70%); background-size: 200% 100%; animation: fg-skeleton 1.4s linear infinite; pointer-events: none; }\n.fg-scene-err { font-size: 12px; color: #ffb4b4; }\n.fg-dots::after { content: "…"; display: inline-block; animation: fg-dots 1.2s steps(4) infinite; width: 1.2em; overflow: hidden; vertical-align: bottom; }\n@keyframes fg-dots { from { width: 0; } to { width: 1.2em; } }\n\n.fg-cgcard { position: relative; border-radius: 14px; overflow: hidden; background: #0d0b1c; box-shadow: 0 12px 34px rgba(0, 0, 0, .3); border: 1px solid rgba(255, 255, 255, .08); }\n.fg-cgcard img { display: block; width: 100%; height: auto; max-height: min(70vh, 520px); object-fit: cover; cursor: zoom-in; animation: fg-cgcard-in .9s cubic-bezier(.2, .8, .2, 1) both; }\n.fg-cgcard.is-tall { width: min(100%, 360px); }\n.fg-cgcard.is-tall img { max-height: none; }\n@keyframes fg-cgcard-in { from { opacity: 0; filter: blur(12px) brightness(1.4); transform: scale(1.03); } }\n.fg-cgcard-wait { position: relative; display: grid; place-items: center; color: rgba(255, 255, 255, .78); font-size: 13px; letter-spacing: .1em; background: radial-gradient(120% 120% at 30% 20%, rgba(155, 123, 255, .35), transparent 60%), radial-gradient(100% 100% at 80% 90%, rgba(255, 126, 182, .3), transparent 60%), #120f26; overflow: hidden; }\n.fg-cgcard-wait::before { content: ""; position: absolute; inset: 0; background: linear-gradient(100deg, transparent 30%, rgba(255, 255, 255, .12) 50%, transparent 70%); background-size: 200% 100%; animation: fg-skeleton 1.6s linear infinite; }\n.fg-cgcard-wait span { position: relative; display: flex; align-items: center; gap: 8px; }\n.fg-cgcard-wait span::before { content: ""; width: 14px; height: 14px; border-radius: 50%; border: 2px solid var(--accent); border-right-color: transparent; animation: fg-spin .8s linear infinite; }\n.fg-cgcard-fail { padding: 14px 16px; font-size: 13px; color: #ffcdcd; display: flex; gap: 10px; align-items: center; flex-wrap: wrap; background: #1e1020; }\n.fg-cgcard-bar { position: absolute; left: 0; right: 0; bottom: 0; display: flex; align-items: center; gap: 6px; padding: 26px 10px 8px; color: #fff; background: linear-gradient(transparent, rgba(0, 0, 0, .72)); opacity: 0; transform: translateY(6px); transition: opacity .25s, transform .25s; }\n.fg-cgcard:hover .fg-cgcard-bar, .fg-cgcard:focus-within .fg-cgcard-bar { opacity: 1; transform: none; }\n.fg-cgcard-bar .fg-cap { flex: 1; min-width: 0; font-size: 12.5px; letter-spacing: .12em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }\n.fg-cgcard-bar button { padding: 3px 10px; border-radius: 99px; font-size: 12px; color: #fff; background: rgba(255, 255, 255, .14); border: 1px solid rgba(255, 255, 255, .2); backdrop-filter: blur(6px); }\n.fg-cgcard-bar button:hover { background: rgba(255, 255, 255, .26); }\n.fg-cgcard-bar button[disabled] { opacity: .35; pointer-events: none; }\n@media (hover: none) { .fg-cgcard-bar { opacity: 1; transform: none; } }\n\n.fg-chat-lightbox { position: fixed; inset: 0; width: 100vw; height: 100vh; height: 100dvh; z-index: 2147483100; display: grid; place-items: center; background: rgba(0, 0, 0, .9); cursor: zoom-out; animation: fg-fade-in .2s ease both; }\n.fg-chat-lightbox img { max-width: 94vw; max-height: 92vh; object-fit: contain; }\n\n.fg-toast { position: fixed; left: 50%; top: 93vh; top: 93dvh; z-index: 2147483200; transform: translate(-50%, -100%); padding: 10px 18px; border-radius: 99px; font-size: 13.5px; letter-spacing: .04em; color: #fff; background: rgba(18, 14, 40, .92); border: 1px solid rgba(255, 255, 255, .14); box-shadow: 0 10px 30px rgba(0, 0, 0, .4); backdrop-filter: blur(10px); animation: fg-toast-in .35s cubic-bezier(.2, .8, .2, 1) both; max-width: 86vw; }\n.fg-toast.is-error { border-color: rgba(255, 120, 120, .6); }\n@keyframes fg-toast-in { from { opacity: 0; transform: translate(-50%, calc(-100% + 10px)); } }\n\n.fg-settings-card { display: grid; gap: 12px; padding: 18px; border-radius: 14px; border: 1px solid rgba(127, 127, 127, .25); background: linear-gradient(135deg, rgba(155, 123, 255, .08), rgba(255, 126, 182, .06)); }\n.fg-settings-card h3 { margin: 0; font-size: 16px; display: flex; align-items: center; gap: 8px; }\n.fg-settings-card p { margin: 0; font-size: 13px; opacity: .75; line-height: 1.6; }\n.fg-settings-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; font-size: 13px; }\n';

// src/client/theater/Theater.jsx
var import_react11 = __toESM(require("react"), 1);

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
var POSES = {
  daily: { label: "日常", anchor: "neutral" },
  arms: { label: "抱臂", anchor: "cold" },
  chest: { label: "手在胸前", anchor: "worried" },
  chin: { label: "托腮", anchor: "thinking" },
  // 原生侧身立绘：底图整张按侧身构图画（侧脸、看向一旁，见 image/style.js），不是转头动画
  side: { label: "侧身", anchor: "pout" }
};
var EMOTION_POSE = {
  neutral: "daily",
  smile: "daily",
  happy: "daily",
  laugh: "daily",
  sad: "daily",
  cry: "daily",
  serious: "daily",
  tired: "daily",
  cold: "arms",
  angry: "arms",
  smug: "arms",
  pout: "side",
  worried: "chest",
  shy: "chest",
  blush: "chest",
  love: "chest",
  scared: "chest",
  surprised: "chest",
  determined: "chest",
  thinking: "chin",
  confused: "chin",
  teasing: "chin"
};
var CG_MAX_CHARACTERS = 6;
var DAYPART = { dawn: "day", morning: "day", noon: "day", afternoon: "day", dusk: "dusk", evening: "night", night: "night", midnight: "night" };
var daypart = (time) => DAYPART[time] || "day";
var placeKey = (scene) => `${String(scene?.location || "").trim() || "未知地点"}|${daypart(scene?.time)}`;

// lib/staging.js
var SLOTS = ["center", "left", "right", "farleft", "farright"];
function playedUnits(units, script) {
  const skip = new Set(script?.skip || []);
  return skip.size ? (units || []).filter((u) => !skip.has(u.id)) : units || [];
}
function stageSteps(script, units, carry = []) {
  if (!script) return units.map(() => ({ cast: carry, entered: [], left: [] }));
  const lines = script.lines || {};
  const home = new Map((script.cast || []).map((c) => [c.name, c.pos]));
  const first = /* @__PURE__ */ new Map();
  for (const u of units) {
    for (const name2 of lines[u.id]?.exit || []) if (!first.has(name2)) first.set(name2, "exit");
    for (const e of lines[u.id]?.enter || []) if (!first.has(e.name)) first.set(e.name, "enter");
  }
  let cast = (script.cast || []).filter((c) => first.get(c.name) !== "enter");
  return units.map((u) => {
    const line = lines[u.id] || {};
    const left = (line.exit || []).filter((name2) => cast.some((c) => c.name === name2));
    if (left.length) cast = cast.filter((c) => !left.includes(c.name));
    const entered = [];
    for (const e of line.enter || []) {
      if (cast.some((c) => c.name === e.name)) continue;
      const want = e.pos || home.get(e.name);
      const pos = want && !cast.some((c) => c.pos === want) ? want : SLOTS.find((p2) => !cast.some((c) => c.pos === p2)) || want || "center";
      cast = [...cast, { name: e.name, pos }];
      entered.push(e.name);
    }
    return { cast, entered, left };
  });
}

// lib/look.js
function fnv1a(text) {
  let h = 2166136261;
  for (const ch of String(text || "")) h = Math.imul(h ^ ch.codePointAt(0), 16777619) >>> 0;
  return h;
}
var shortHash = (text) => fnv1a(text).toString(36);
function entryAt(timeline, turn = Infinity) {
  let chosen = null;
  for (const entry of timeline || []) if (Number(entry.fromTurn) <= Number(turn)) chosen = entry;
  return chosen;
}
function lookKey(look) {
  const states = (look?.states || []).map((s) => s.name).filter(Boolean).sort().join("+");
  return `${shortHash(look?.appearance)}|${look?.outfit || ""}|${states}`;
}
var variantKey = (look, emotion) => `${lookKey(look)}|${emotion || "neutral"}`;
function lookLabel(look) {
  const parts = [look?.outfit, ...(look?.states || []).map((s) => s.name)].filter(Boolean);
  return parts.length ? parts.join(" · ") : "基础";
}
var LOOK_FIELDS = ["fandom", "sex", "hair", "eyes", "skin", "body", "extra", "other"];
var LOOK_FIELD_LABELS = { fandom: "同人身份", sex: "性别人数", hair: "头发", eyes: "眼睛", skin: "肤色", body: "体型", extra: "标志特征", other: "其他" };
var joinLook = (fields) => LOOK_FIELDS.map((f) => fields?.[f]).filter(Boolean).join(", ");
var lookFieldsOf = (entry) => entry?.fields ? { ...entry.fields } : entry?.tags ? { other: entry.tags } : {};
var tagSet = (text) => String(text || "").split(/[,，\n]/).map((t) => t.trim().toLowerCase()).filter(Boolean).sort().join("\n");
var lookTags = (fields, before = "") => {
  const joined = joinLook(fields);
  return before && tagSet(before) === tagSet(joined) ? before : joined;
};
function formatLook(fields) {
  const filled = LOOK_FIELDS.filter((f) => fields?.[f]);
  if (filled.length === 1 && filled[0] === "other") return fields.other;
  return filled.map((f) => `${LOOK_FIELD_LABELS[f]} ${fields[f]}`).join("；");
}
function lookAt(timeline, turn = Infinity) {
  const outfit = entryAt(timeline?.wear, turn)?.outfit || "";
  const face = entryAt(timeline?.appearance, turn);
  return {
    appearance: face?.tags || "",
    appearanceFields: lookFieldsOf(face),
    outfit,
    outfitTags: outfit && timeline?.outfits?.[outfit]?.tags || "",
    states: entryAt(timeline?.states, turn)?.list || []
  };
}
function pickSprite(sprites, look, emotion, base = "") {
  const all = sprites || {};
  const asset = (key) => all[key]?.assetId || "";
  for (const emo of [emotion, base, "neutral"]) {
    const hit = emo && asset(variantKey(look, emo));
    if (hit) return hit;
    const from = emo && all[variantKey(look, emo)]?.face?.from;
    if (from && asset(from)) return asset(from);
  }
  const firstWith = (prefix) => {
    const k = Object.keys(all).find((key) => key.startsWith(prefix) && all[key]?.assetId);
    return k ? all[k].assetId : "";
  };
  const same = firstWith(lookKey(look) + "|");
  if (same) return same;
  const outfitPrefix = `${shortHash(look?.appearance)}|${look?.outfit || ""}|`;
  const calm = Object.keys(all).find((k) => k.startsWith(outfitPrefix) && k.endsWith("|neutral") && all[k]?.assetId);
  return calm ? all[calm].assetId : firstWith(outfitPrefix);
}
function findLookTurn(timeline, key) {
  const turns = /* @__PURE__ */ new Set([0]);
  for (const list2 of [timeline?.appearance, timeline?.wear, timeline?.states]) for (const e of list2 || []) turns.add(Number(e.fromTurn) || 0);
  let found = null;
  for (const t of [...turns].sort((a, b) => a - b)) if (lookKey(lookAt(timeline, t)) === key) found = t;
  return found;
}

// lib/sounds.js
var p = (wave, f, dur, gain, more = {}) => ({ wave, f, dur, gain, ...more });
var VOICES = Object.freeze([
  { id: "classic", label: "经典哔哔", desc: "逆转裁判式的三角波哔哔声", gender: "", parts: [p("triangle", 420, 0.05, 0.045, { attack: 4e-3 })] },
  { id: "bell", label: "清亮铃音", desc: "干净透亮，带一点泛音", gender: "female", parts: [p("sine", 660, 0.07, 0.05, { attack: 3e-3 }), p("sine", 1320, 0.04, 0.015, { attack: 3e-3 })] },
  { id: "chirp", label: "少女啾啾", desc: "每个字往上一挑，活泼", gender: "female", parts: [p("triangle", 520, 0.05, 0.045, { to: 640, attack: 4e-3 })] },
  { id: "soft", label: "温柔气声", desc: "软一点、带气息", gender: "female", parts: [p("sine", 480, 0.07, 0.04, { attack: 0.012 }), p("noise", 2400, 0.05, 0.025, { q: 1.5, attack: 0.01 })] },
  { id: "cool", label: "冷淡御姐", desc: "短促、偏方的音色，压着说", gender: "female", parts: [p("square", 400, 0.045, 0.02, { attack: 3e-3, lp: 1600 })] },
  { id: "bubble", label: "元气泡泡", desc: "每个字往下一落，像吐泡泡", gender: "female", parts: [p("sine", 760, 0.06, 0.055, { to: 560, attack: 3e-3 })] },
  { id: "boy", label: "少年清亮", desc: "中音，干脆", gender: "male", parts: [p("triangle", 330, 0.05, 0.05, { attack: 4e-3 }), p("sine", 660, 0.03, 0.012)] },
  { id: "deep", label: "低沉男声", desc: "厚实的低音", gender: "male", parts: [p("sawtooth", 150, 0.06, 0.035, { attack: 5e-3, lp: 900 })] },
  { id: "gruff", label: "粗犷大叔", desc: "更低、带点沙哑", gender: "male", parts: [p("square", 118, 0.06, 0.03, { attack: 4e-3, lp: 700 }), p("noise", 500, 0.04, 0.03, { q: 0.8 })] },
  { id: "elder", label: "老者", desc: "低、慢慢往下沉，有点颤", gender: "male", parts: [p("triangle", 190, 0.07, 0.05, { to: 175, attack: 6e-3 }), p("triangle", 193, 0.07, 0.03, { to: 178, attack: 6e-3 })] },
  { id: "kid", label: "孩童", desc: "很高、往上挑", gender: "", parts: [p("sine", 880, 0.045, 0.05, { to: 980, attack: 3e-3 })] },
  { id: "wood", label: "木琴", desc: "敲击感，圆润", gender: "", parts: [p("sine", 520, 0.09, 0.06, { attack: 2e-3 }), p("sine", 2080, 0.02, 0.02, { attack: 1e-3 })] },
  { id: "retro", label: "8-bit 掌机", desc: "老游戏机的方波", gender: "", parts: [p("square", 523, 0.04, 0.022, { attack: 2e-3 })] },
  { id: "robot", label: "机械电子", desc: "金属感，像机器人", gender: "", parts: [p("sawtooth", 300, 0.05, 0.025, { attack: 2e-3, lp: 2200 }), p("square", 603, 0.05, 0.012, { attack: 2e-3 })] },
  { id: "typewriter", label: "打字机", desc: "咔嗒咔嗒，适合旁白", gender: "", parts: [p("noise", 3200, 0.025, 0.09, { q: 2 }), p("square", 1800, 0.012, 0.01, { attack: 1e-3 })] },
  { id: "whisper", label: "耳语", desc: "只有气声，像凑在耳边", gender: "", parts: [p("noise", 1800, 0.06, 0.05, { q: 3, attack: 0.01 })] }
]);
var VOICE_IDS = new Set(VOICES.map((v) => v.id));
var voiceById = (id) => VOICES.find((v) => v.id === id) || null;
var VOICE_POOLS = { female: ["bell", "chirp", "soft", "cool", "bubble"], male: ["boy", "deep", "gruff", "elder"], other: ["classic", "kid", "wood", "robot"], "": ["classic"] };
var VOICE_PITCH_LIMIT = 6;
var SOUND_SLOTS = Object.freeze([
  {
    id: "impact",
    label: "重音落地",
    hint: "重音字砸下来的那一下",
    group: "stage",
    presets: [
      { id: "thud", label: "闷咚", parts: [p("sine", 150, 0.28, 0.22, { to: 52 }), p("noise", 900, 0.07, 0.08, { q: 0.8 })] },
      { id: "boom", label: "低音炮", parts: [p("sine", 90, 0.5, 0.3, { to: 38 }), p("noise", 200, 0.15, 0.08, { q: 0.5 })] },
      { id: "gavel", label: "法槌", parts: [p("triangle", 420, 0.09, 0.18, { to: 300, attack: 1e-3 }), p("noise", 2200, 0.05, 0.15, { q: 2 }), p("sine", 180, 0.2, 0.12, { to: 90 })] },
      { id: "punch", label: "重拳", parts: [p("noise", 1200, 0.09, 0.22, { q: 0.5 }), p("sine", 110, 0.22, 0.25, { to: 45 })] },
      { id: "taiko", label: "太鼓", parts: [p("sine", 120, 0.6, 0.28, { to: 80, attack: 2e-3 }), p("noise", 600, 0.05, 0.08, { q: 1 }), p("sine", 240, 0.15, 0.06, { to: 160 })] }
    ]
  },
  {
    id: "slam",
    label: "怒吼拍桌",
    hint: "吼出来的台词",
    group: "stage",
    presets: [
      { id: "desk", label: "拍桌", parts: [p("triangle", 95, 0.35, 0.28, { to: 40 }), p("noise", 1600, 0.18, 0.2, { q: 0.6 }), p("noise", 300, 0.25, 0.18, { q: 0.7, at: 0.01 })] },
      { id: "crash", label: "碎裂", parts: [p("noise", 3500, 0.5, 0.18, { q: 0.4 }), p("noise", 800, 0.3, 0.15, { q: 0.6 }), p("triangle", 80, 0.3, 0.2, { to: 40 })] },
      { id: "thunder", label: "雷鸣", parts: [p("noise", 200, 1.1, 0.3, { q: 0.5, attack: 0.02 }), p("sine", 60, 0.9, 0.25, { to: 35 })] },
      { id: "hammer", label: "重锤", parts: [p("square", 70, 0.3, 0.12, { to: 35, lp: 500 }), p("noise", 1e3, 0.12, 0.25, { q: 0.7 })] },
      { id: "gong", label: "铜锣", parts: [p("sine", 180, 1.4, 0.12, { attack: 5e-3 }), p("sine", 267, 1.2, 0.08), p("sine", 413, 0.9, 0.05), p("noise", 1500, 0.08, 0.08, { q: 0.8 })] }
    ]
  },
  {
    id: "stab",
    label: "刺中要害",
    hint: "被戳中、崩溃的那一下",
    group: "stage",
    presets: [
      { id: "stab", label: "尖刺", parts: [p("sawtooth", 1400, 0.32, 0.08, { to: 180 }), p("square", 700, 0.4, 0.05, { to: 90 }), p("noise", 2500, 0.12, 0.12, { q: 1.2 })] },
      { id: "glass", label: "玻璃碎", parts: [p("noise", 5e3, 0.35, 0.12, { q: 1 }), p("sine", 2637, 0.3, 0.04), p("sine", 3520, 0.25, 0.03, { at: 0.02 })] },
      { id: "zap", label: "电击", parts: [p("sawtooth", 2200, 0.25, 0.06, { to: 120 }), p("square", 60, 0.25, 0.04, { lp: 1200 }), p("noise", 4e3, 0.1, 0.06, { q: 1 })] },
      { id: "strings", label: "惊愕弦乐", parts: [p("sawtooth", 622, 0.6, 0.03, { attack: 0.01, lp: 3e3 }), p("sawtooth", 659, 0.6, 0.03, { attack: 0.01, lp: 3e3 }), p("sawtooth", 932, 0.6, 0.025, { attack: 0.01, lp: 3e3 })] },
      { id: "heart", label: "心跳骤停", parts: [p("sine", 70, 0.15, 0.3, { to: 50 }), p("sine", 70, 0.18, 0.3, { to: 50, at: 0.22 })] }
    ]
  },
  {
    id: "ding",
    label: "灵光一闪",
    hint: "漫画符号是灯泡时",
    group: "stage",
    presets: [
      { id: "ding", label: "叮", parts: [p("sine", 1568, 0.6, 0.08), p("sine", 2093, 0.7, 0.07, { at: 0.07 })] },
      { id: "sparkle", label: "闪光", parts: [p("sine", 2093, 0.25, 0.05), p("sine", 2637, 0.25, 0.045, { at: 0.05 }), p("sine", 3136, 0.35, 0.04, { at: 0.1 })] },
      { id: "chime", label: "风铃", parts: [p("sine", 1760, 1, 0.05), p("sine", 2217, 0.9, 0.04, { at: 0.12 }), p("sine", 2637, 0.8, 0.035, { at: 0.24 })] },
      { id: "pop", label: "啵", parts: [p("sine", 500, 0.09, 0.12, { to: 1500, attack: 2e-3 })] },
      { id: "arp", label: "上行琶音", parts: [p("triangle", 784, 0.18, 0.06), p("triangle", 988, 0.18, 0.06, { at: 0.06 }), p("triangle", 1175, 0.18, 0.06, { at: 0.12 }), p("triangle", 1568, 0.4, 0.06, { at: 0.18 })] }
    ]
  },
  {
    id: "select",
    label: "点按钮",
    hint: "菜单、选项、快捷键",
    group: "ui",
    presets: [
      { id: "pop", label: "双音", parts: [p("sine", 660, 0.18, 0.05, { attack: 0.01 }), p("sine", 990, 0.18, 0.05, { attack: 0.01, at: 0.06 })] },
      { id: "click", label: "轻点", parts: [p("noise", 4e3, 0.02, 0.1, { q: 3 }), p("sine", 1200, 0.03, 0.02, { attack: 1e-3 })] },
      { id: "wood", label: "木鱼", parts: [p("sine", 880, 0.08, 0.08, { to: 700, attack: 1e-3 })] },
      { id: "bubble", label: "水泡", parts: [p("sine", 400, 0.07, 0.07, { to: 900, attack: 2e-3 })] },
      { id: "retro", label: "8-bit", parts: [p("square", 988, 0.05, 0.025, { attack: 1e-3 }), p("square", 1319, 0.08, 0.025, { attack: 1e-3, at: 0.05 })] }
    ]
  },
  {
    id: "hover",
    label: "指到按钮",
    hint: "鼠标移到选项上",
    group: "ui",
    presets: [
      { id: "tick", label: "轻响", parts: [p("sine", 880, 0.18, 0.018, { attack: 0.01 })] },
      { id: "soft", label: "更轻", parts: [p("sine", 660, 0.12, 0.012, { attack: 0.02 })] },
      { id: "wood", label: "木", parts: [p("sine", 1320, 0.04, 0.025, { to: 1100, attack: 1e-3 })] },
      { id: "glass", label: "玻璃", parts: [p("sine", 2637, 0.12, 0.01, { attack: 2e-3 })] },
      { id: "retro", label: "8-bit", parts: [p("square", 1760, 0.02, 0.01, { attack: 1e-3 })] }
    ]
  },
  {
    id: "page",
    label: "翻页",
    hint: "翻到下一句",
    group: "ui",
    presets: [
      { id: "tone", label: "单音", parts: [p("sine", 520, 0.18, 0.05, { attack: 0.01 })] },
      { id: "paper", label: "纸张沙沙", parts: [p("noise", 3e3, 0.16, 0.06, { q: 0.6, attack: 0.03 })] },
      { id: "swish", label: "嗖", parts: [p("noise", 1200, 0.2, 0.07, { to: 4e3, q: 1.2, attack: 0.05 })] },
      { id: "wood", label: "木", parts: [p("sine", 660, 0.1, 0.05, { to: 520, attack: 1e-3 })] },
      { id: "retro", label: "8-bit", parts: [p("square", 660, 0.04, 0.02, { attack: 1e-3 }), p("square", 880, 0.04, 0.02, { attack: 1e-3, at: 0.04 })] }
    ]
  },
  {
    id: "open",
    label: "开始 / 继续",
    hint: "标题画面进入剧情",
    group: "ui",
    presets: [
      { id: "arp", label: "三连音", parts: [p("sine", 440, 0.18, 0.05, { attack: 0.01 }), p("sine", 660, 0.18, 0.05, { attack: 0.01, at: 0.06 }), p("sine", 880, 0.18, 0.05, { attack: 0.01, at: 0.12 })] },
      { id: "chime", label: "风铃", parts: [p("sine", 1047, 0.6, 0.04), p("sine", 1319, 0.6, 0.035, { at: 0.08 }), p("sine", 1568, 0.7, 0.03, { at: 0.16 })] },
      { id: "swell", label: "渐起", parts: [p("triangle", 330, 0.4, 0.05, { to: 660, attack: 0.25 })] },
      { id: "retro", label: "8-bit", parts: [p("square", 523, 0.06, 0.02), p("square", 659, 0.06, 0.02, { at: 0.06 }), p("square", 784, 0.06, 0.02, { at: 0.12 }), p("square", 1047, 0.12, 0.02, { at: 0.18 })] },
      { id: "bell", label: "钟声", parts: [p("sine", 880, 1, 0.05, { attack: 2e-3 }), p("sine", 2200, 0.5, 0.015)] }
    ]
  }
]);
var SLOT_IDS = new Set(SOUND_SLOTS.map((s) => s.id));
var slotById = (id) => SOUND_SLOTS.find((s) => s.id === id) || null;
var DEFAULT_SOUNDS = Object.freeze(Object.fromEntries(SOUND_SLOTS.map((s) => [s.id, s.presets[0].id])));
var MAX_SOUND_BYTES = 5 * 1024 * 1024;
function soundFor(ui2, slot) {
  const def = slotById(slot);
  if (!def) return null;
  const choice = ui2?.sounds?.[slot] || def.presets[0].id;
  if (choice === "off") return null;
  if (choice === "custom") return ui2?.customSounds?.[slot]?.assetId ? { assetId: ui2.customSounds[slot].assetId } : { parts: def.presets[0].parts };
  return { parts: (def.presets.find((x) => x.id === choice) || def.presets[0]).parts };
}
var clamp = (v, lo, hi, d) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d;
};
var clampPitch = (v) => Math.round(clamp(v, -VOICE_PITCH_LIMIT, VOICE_PITCH_LIMIT, 0));
function cleanVoice(value) {
  const v = String(value ?? "").trim();
  return v === "off" || VOICE_IDS.has(v) ? v : "";
}
function nameHash(name2) {
  let h = 0;
  for (const ch of String(name2 || "")) h = h * 31 + ch.codePointAt(0) >>> 0;
  return h;
}
function poolOf(person, ui2) {
  return VOICE_IDS.has(ui2?.voiceDefault) ? [ui2.voiceDefault] : VOICE_POOLS[person?.gender] || VOICE_POOLS[""];
}
function autoVoice(id, name2, pitch) {
  const h = nameHash(name2);
  const spread = id === "classic" ? 12 * Math.log2((420 + h % 7 * 38) / 420) : (h >>> 8) % 5 - 2;
  return { id, pitch: pitch + spread, auto: true };
}
function resolveVoice(person, name2, ui2) {
  const chosen = cleanVoice(person?.voice);
  if (chosen === "off") return null;
  const pitch = clampPitch(person?.voicePitch);
  if (chosen) return { id: chosen, pitch, auto: false };
  const pool = poolOf(person, ui2);
  return autoVoice(pool[nameHash(name2) % pool.length], name2, pitch);
}
function castVoices(people, ui2) {
  const list2 = [...people || []].sort((a, b) => (a.createdTurn ?? -1) - (b.createdTurn ?? -1) || String(a.name).localeCompare(String(b.name)));
  const voices = new Map(list2.map((p2) => [p2.name, resolveVoice(p2, p2.name, ui2)]));
  const taken = new Set([...voices.values()].filter((v) => v && !v.auto).map((v) => v.id));
  for (const p2 of list2) {
    const voice = voices.get(p2.name);
    if (!voice || !voice.auto) continue;
    const pool = poolOf(p2, ui2);
    const start = pool.indexOf(voice.id);
    const free = pool.map((_, i) => pool[(start + i) % pool.length]).find((id) => !taken.has(id));
    if (free && free !== voice.id) voices.set(p2.name, autoVoice(free, p2.name, clampPitch(p2.voicePitch)));
    taken.add(voices.get(p2.name).id);
  }
  return voices;
}
function lineVoice(type, speaker, voices, ui2) {
  if (type === "narration" || !speaker) {
    return ui2?.narrationVoice === "off" ? null : { id: VOICE_IDS.has(ui2?.narrationVoice) ? ui2.narrationVoice : "classic", pitch: clampPitch(ui2?.narrationPitch ?? -6), auto: false };
  }
  const voice = voices?.has?.(speaker) ? voices.get(speaker) : resolveVoice(null, speaker, ui2);
  return voice && type === "thought" ? { ...voice, gain: 0.7 } : voice;
}

// lib/cast.js
var NAME_COLORS = ["#f2739b", "#7aa2ff", "#ffb35c", "#5fd3b3", "#c58bff", "#ff7a6b", "#59c3ff", "#e5c34f", "#9be36b", "#ff8ad8"];
var nameColor = (name2) => NAME_COLORS[fnv1a(name2) % NAME_COLORS.length];

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
var preset = (p2) => ({ positive: null, negative: null, cfg: null, cfgRescale: null, cover: "", ...p2 });
var BUILTIN_STYLES = [
  preset({ id: "none", name: "不加画师串", artist: "" }),
  preset({ id: "galgame", name: "Galgame 赛璐璐", artist: "official art, visual novel cg, game cg, anime coloring, clean lineart, soft lighting" }),
  preset({ id: "watercolor", name: "水彩绘本", artist: "watercolor (medium), traditional media, soft colors, pastel colors, painterly" }),
  preset({ id: "cinematic", name: "电影感厚涂", artist: "cinematic lighting, depth of field, dramatic lighting, detailed background, painterly, thick painting" }),
  preset({ id: "retro90s", name: "90 年代复古", artist: "1990s (style), retro artstyle, cel shading, film grain" })
];
var MAX_STYLES = 100;
function currentStyle(style) {
  const presets = Array.isArray(style?.presets) ? style.presets : BUILTIN_STYLES;
  return presets.find((p2) => p2.id === style?.current) || presets[0] || BUILTIN_STYLES[0];
}
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
  const custom = currentStyle(style).positive;
  return typeof custom === "string" ? custom : DEFAULT_QUALITY[presetKey(key)];
}
function negativeFor(style, key) {
  const custom = currentStyle(style).negative;
  return typeof custom === "string" ? custom : DEFAULT_NEGATIVE[presetKey(key)];
}
function sizeFor(config, shape) {
  const sizes = config?.images?.sizes || {};
  const defaults = { landscape: [1216, 832], portrait: [832, 1216], square: [1024, 1024] };
  const [w, h] = Array.isArray(sizes[shape]) ? sizes[shape] : defaults[shape] || defaults.landscape;
  return { width: Number(w) || 1216, height: Number(h) || 832 };
}

// lib/emotions.js
var LABEL_TO_KEY = new Map(Object.entries(EMOTIONS).map(([k, v]) => [v, k]));
var isBuiltinEmotion = (id) => Object.prototype.hasOwnProperty.call(EMOTIONS, id);
var emotionLabel = (id) => isBuiltinEmotion(id) ? EMOTIONS[id] : String(id || "");
function emotionEntry(id, custom = []) {
  if (isBuiltinEmotion(id)) return { id, label: EMOTIONS[id], desc: "", base: "", builtin: true };
  const found = custom.find((e) => e.id === id);
  return found ? { ...found, label: found.id, base: found.base || "", builtin: false } : { id, label: id, desc: "", base: "", builtin: false };
}
function allEmotions(custom = []) {
  return [
    ...Object.keys(EMOTIONS).map((id) => emotionEntry(id)),
    ...custom.filter((e) => e && e.id && !isBuiltinEmotion(e.id)).map((e) => emotionEntry(e.id, custom))
  ];
}
function personEmotions(name2, custom = [], { used = [], drawn = [] } = {}) {
  const usedSet = new Set(used);
  const drawnSet = new Set(drawn);
  return allEmotions(custom).filter((e) => e.builtin || e.source === "user" && !e.who?.length || e.who?.includes(name2) || usedSet.has(e.id) || drawnSet.has(e.id));
}

// src/client/theater/playback.js
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
    if (script) scene = { ...EMPTY_SCENE, ...script.scene };
    const changed = beats.length === 0 || placeKey(scene) !== prevKey;
    const all = t.units || [];
    const units = playedUnits(all, script);
    const steps = stageSteps(script, units, cast);
    if (steps.length) cast = steps[steps.length - 1].cast;
    const unitIndex = new Map(units.map((u, i) => [u.id, i]));
    const indexOf = (id) => {
      for (let i = all.findIndex((u) => u.id === id); i >= 0; i--) if (unitIndex.has(all[i].id)) return unitIndex.get(all[i].id);
      return -1;
    };
    const turnImages = images.filter((img) => img.turn === t.turn && img.textVersion === t.textVersion && !img.retired).map((img) => {
      const at2 = img.after && all.some((u) => u.id === img.after) ? Math.max(0, indexOf(img.after)) : units.length - 1;
      const end = img.until && all.some((u) => u.id === img.until) ? Math.max(at2, indexOf(img.until)) : units.length - 1;
      return { img, at: at2, end };
    }).sort((a, b) => a.at - b.at);
    let lastSpeaker = "";
    units.forEach((unit, ui2) => {
      const line = script && script.lines && script.lines[unit.id] || {};
      if (line.bgm) bgm2 = line.bgm;
      let speaker = "";
      const type = line.type || unit.type;
      if (type === "dialogue") {
        speaker = line.sp || (line.type ? "" : unit.hint) || lastSpeaker;
        lastSpeaker = speaker;
      } else if (type === "thought") speaker = line.sp || "我";
      else if (line.sp) speaker = line.sp;
      if (speaker && line.emo) emotions[speaker] = line.emo;
      const cgEntry = [...turnImages].reverse().find((e) => e.at <= ui2 && ui2 <= e.end);
      const cg = cgEntry ? cgEntry.img : null;
      beats.push({
        key: `${t.turn}:${unit.id}`,
        turn: t.turn,
        textVersion: t.textVersion,
        unitId: unit.id,
        type,
        text: unit.text,
        speaker,
        alias: line.as || "",
        emo: line.emo || "",
        sym: line.sym || "",
        cam: line.cam || "",
        say: line.say || "",
        stress: line.stress || "",
        card: line.card || "",
        scene,
        bgm: bgm2,
        sceneEnter: ui2 === 0 && changed,
        transition: ui2 === 0 && changed ? scene.transition || "dissolve" : "none",
        cast: steps[ui2].cast,
        entered: steps[ui2].entered,
        left: steps[ui2].left,
        emotions: { ...emotions },
        cg,
        cgAnchor: Boolean(cgEntry && cgEntry.at === ui2),
        directed: Boolean(script),
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
function stageRatio(cfg) {
  if (cfg && cfg.ui && cfg.ui.ratio === "wide") return 16 / 9;
  const { width, height } = sizeFor(cfg, "landscape");
  const ratio = width / height;
  return ratio >= 1 && ratio <= 2.5 ? ratio : 16 / 9;
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
var import_react4 = __toESM(require("react"), 1);

// src/client/theater/particles.js
var import_react2 = __toESM(require("react"), 1);
var COUNTS = { rain: 220, storm: 380, snow: 140, sakura: 70, leaves: 40, fireflies: 46, embers: 90, dust: 60, bokeh: 26, stars: 160, fog: 6 };
var rand = (a, b) => a + Math.random() * (b - a);
function spawn(kind, w, h, initial) {
  const p2 = { x: rand(0, w), y: initial ? rand(0, h) : rand(-h * 0.2, -10), life: 0 };
  switch (kind) {
    case "rain":
    case "storm":
      return { ...p2, vx: kind === "storm" ? -7 : -2.4, vy: rand(16, 26) * (kind === "storm" ? 1.25 : 1), len: rand(12, 26), a: rand(0.18, 0.45) };
    case "snow":
      return { ...p2, vx: rand(-0.4, 0.4), vy: rand(0.5, 1.6), r: rand(1, 3.6), a: rand(0.5, 0.95), ph: rand(0, 6.28) };
    case "sakura":
    case "leaves":
      return { ...p2, x: rand(-w * 0.2, w), vx: rand(0.6, 1.8), vy: rand(0.7, 1.7), r: rand(5, 10) * (kind === "leaves" ? 1.3 : 1), rot: rand(0, 6.28), vr: rand(-0.05, 0.05), ph: rand(0, 6.28), hue: kind === "leaves" ? rand(18, 44) : rand(330, 352) };
    case "fireflies":
      return { ...p2, y: initial ? rand(h * 0.3, h) : rand(h * 0.4, h), vx: rand(-0.3, 0.3), vy: rand(-0.3, 0.2), r: rand(1.2, 2.6), ph: rand(0, 6.28) };
    case "embers":
      return { ...p2, y: initial ? rand(0, h) : h + 10, vx: rand(-0.4, 0.6), vy: -rand(0.6, 2.2), r: rand(0.8, 2.2), ph: rand(0, 6.28) };
    case "dust":
      return { ...p2, y: rand(0, h), vx: rand(-0.15, 0.15), vy: rand(-0.12, 0.12), r: rand(0.6, 1.6), ph: rand(0, 6.28) };
    case "bokeh":
      return { ...p2, y: rand(0, h), vx: rand(-0.12, 0.12), vy: rand(-0.18, -0.04), r: rand(14, 46), hue: rand(0, 360), ph: rand(0, 6.28) };
    case "stars":
      return { ...p2, y: rand(0, h * 0.65), r: rand(0.4, 1.5), ph: rand(0, 6.28), sp: rand(0.01, 0.05) };
    case "fog":
      return { ...p2, y: rand(h * 0.35, h * 0.9), vx: rand(0.15, 0.4), r: rand(w * 0.25, w * 0.45), a: rand(0.06, 0.13) };
    default:
      return p2;
  }
}
function step(kind, p2, w, h, t, ctx2) {
  switch (kind) {
    case "rain":
    case "storm": {
      p2.x += p2.vx;
      p2.y += p2.vy;
      ctx2.strokeStyle = `rgba(200, 220, 255, ${p2.a})`;
      ctx2.lineWidth = 1;
      ctx2.beginPath();
      ctx2.moveTo(p2.x, p2.y);
      ctx2.lineTo(p2.x + p2.vx * 1.6, p2.y - p2.len);
      ctx2.stroke();
      return p2.y < h + 30;
    }
    case "snow": {
      p2.ph += 0.02;
      p2.x += p2.vx + Math.sin(p2.ph) * 0.4;
      p2.y += p2.vy;
      ctx2.fillStyle = `rgba(255, 255, 255, ${p2.a})`;
      ctx2.beginPath();
      ctx2.arc(p2.x, p2.y, p2.r, 0, 6.283);
      ctx2.fill();
      return p2.y < h + 10;
    }
    case "sakura":
    case "leaves": {
      p2.ph += 0.03;
      p2.rot += p2.vr;
      p2.x += p2.vx + Math.sin(p2.ph) * 0.8;
      p2.y += p2.vy;
      ctx2.save();
      ctx2.translate(p2.x, p2.y);
      ctx2.rotate(p2.rot);
      ctx2.scale(1, Math.abs(Math.sin(p2.ph)) * 0.6 + 0.4);
      ctx2.fillStyle = kind === "leaves" ? `hsla(${p2.hue}, 75%, 48%, .85)` : `hsla(${p2.hue}, 90%, 86%, .9)`;
      ctx2.beginPath();
      ctx2.moveTo(0, -p2.r);
      ctx2.bezierCurveTo(p2.r, -p2.r * 0.6, p2.r * 0.7, p2.r * 0.6, 0, p2.r);
      ctx2.bezierCurveTo(-p2.r * 0.7, p2.r * 0.6, -p2.r, -p2.r * 0.6, 0, -p2.r);
      ctx2.fill();
      ctx2.restore();
      return p2.y < h + 20 && p2.x < w + 30;
    }
    case "fireflies": {
      p2.ph += 0.03;
      p2.x += p2.vx + Math.sin(p2.ph * 0.7) * 0.3;
      p2.y += p2.vy + Math.cos(p2.ph * 0.5) * 0.2;
      const a = 0.35 + Math.sin(p2.ph * 2) * 0.35;
      const g = ctx2.createRadialGradient(p2.x, p2.y, 0, p2.x, p2.y, p2.r * 6);
      g.addColorStop(0, `rgba(230, 255, 150, ${a})`);
      g.addColorStop(1, "rgba(230, 255, 150, 0)");
      ctx2.fillStyle = g;
      ctx2.beginPath();
      ctx2.arc(p2.x, p2.y, p2.r * 6, 0, 6.283);
      ctx2.fill();
      return p2.x > -20 && p2.x < w + 20 && p2.y > -20 && p2.y < h + 20;
    }
    case "embers": {
      p2.ph += 0.05;
      p2.x += p2.vx + Math.sin(p2.ph) * 0.5;
      p2.y += p2.vy;
      ctx2.fillStyle = `rgba(255, ${140 + Math.sin(p2.ph) * 60}, 60, ${0.5 + Math.sin(p2.ph * 1.7) * 0.4})`;
      ctx2.beginPath();
      ctx2.arc(p2.x, p2.y, p2.r, 0, 6.283);
      ctx2.fill();
      return p2.y > -10;
    }
    case "dust": {
      p2.ph += 0.01;
      p2.x += p2.vx;
      p2.y += p2.vy;
      ctx2.fillStyle = `rgba(255, 245, 220, ${0.25 + Math.sin(p2.ph * 3) * 0.2})`;
      ctx2.beginPath();
      ctx2.arc(p2.x, p2.y, p2.r, 0, 6.283);
      ctx2.fill();
      return p2.x > -10 && p2.x < w + 10 && p2.y > -10 && p2.y < h + 10;
    }
    case "bokeh": {
      p2.ph += 0.01;
      p2.x += p2.vx;
      p2.y += p2.vy;
      const g = ctx2.createRadialGradient(p2.x, p2.y, 0, p2.x, p2.y, p2.r);
      const a = 0.08 + Math.sin(p2.ph) * 0.05;
      g.addColorStop(0, `hsla(${p2.hue}, 90%, 75%, ${a + 0.06})`);
      g.addColorStop(0.7, `hsla(${p2.hue}, 90%, 70%, ${a})`);
      g.addColorStop(1, `hsla(${p2.hue}, 90%, 70%, 0)`);
      ctx2.fillStyle = g;
      ctx2.beginPath();
      ctx2.arc(p2.x, p2.y, p2.r, 0, 6.283);
      ctx2.fill();
      return p2.y > -p2.r;
    }
    case "stars": {
      p2.ph += p2.sp;
      ctx2.fillStyle = `rgba(255, 255, 255, ${0.3 + Math.abs(Math.sin(p2.ph)) * 0.7})`;
      ctx2.beginPath();
      ctx2.arc(p2.x, p2.y, p2.r, 0, 6.283);
      ctx2.fill();
      return true;
    }
    case "fog": {
      p2.x += p2.vx;
      const g = ctx2.createRadialGradient(p2.x, p2.y, 0, p2.x, p2.y, p2.r);
      g.addColorStop(0, `rgba(230, 235, 245, ${p2.a})`);
      g.addColorStop(1, "rgba(230, 235, 245, 0)");
      ctx2.fillStyle = g;
      ctx2.fillRect(p2.x - p2.r, p2.y - p2.r, p2.r * 2, p2.r * 2);
      if (p2.x - p2.r > w) p2.x = -p2.r;
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
    let list2 = Array.from({ length: target }, () => spawn(kind, w, h, true));
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
      for (const p2 of list2) if (step(kind, p2, w, h, t, ctx2)) next.push(p2);
      while (next.length < target) next.push(spawn(kind, w, h, false));
      list2 = next;
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

// src/client/theater/AaSprite.jsx
var import_react3 = __toESM(require("react"), 1);

// lib/typing.js
var PAUSE = [
  [/^[，、,；;：:]$/u, 6],
  [/^[。！？!?.]$/u, 12],
  [/^[…—～~]$/u, 5]
];
var DOTTED = /^[…—～~]$/u;
var CLOSER = /^[”’」』）)\]】》〉"']$/u;
var SILENT = /[\s，、,；;：:。！？!?.…—～~“”‘’「」『』（）()\[\]【】《》〈〉"']/u;
var BANG = /^[！!]$/u;
function pauseFactor(ch) {
  for (const [re, f] of PAUSE) if (re.test(ch)) return f;
  return 0;
}
function pausesAfter(chars, speed) {
  const out = new Array(chars.length).fill(0);
  let pending = 0;
  for (let i = 0; i < chars.length; i += 1) {
    const ch = chars[i];
    if (DOTTED.test(ch)) {
      out[i] = speed * pauseFactor(ch);
      pending = 0;
      continue;
    }
    pending = Math.max(pending, pauseFactor(ch));
    if (!pending) continue;
    const next = chars[i + 1];
    const joins = next !== void 0 && (CLOSER.test(next) || pauseFactor(next) > 0 && !DOTTED.test(next));
    if (!joins) {
      out[i] = speed * pending;
      pending = 0;
    }
  }
  return out;
}
var STYLES = {
  "": { gap: 1, pause: 1, blip: { every: 2, pitch: 1, gain: 1 }, mouth: "loop" },
  menace: { gap: 4, min: 110, pause: 1.6, blip: { every: 1, pitch: 0.78, gain: 1.1 }, mouth: "syllable" },
  excited: { gap: 0.55, pause: 0.5, blip: { every: 2, pitch: 1.18, gain: 1 }, mouth: "loop" },
  shout: { gap: 1.1, chunk: 3, pause: 0.7, blip: { every: 1, pitch: 1.1, gain: 1.3 }, mouth: "wide" },
  hesitant: { gap: 1.35, pause: 1.8, stall: true, blip: { every: 3, pitch: 0.95, gain: 0.8 }, mouth: "loop" },
  whisper: { gap: 1.25, pause: 1.2, blip: { every: 2, pitch: 0.9, gain: 0.35 }, mouth: "soft" },
  breakdown: { gap: 0.8, jitter: true, pause: 0.6, blip: { every: 1, pitch: 1.25, gain: 1.2 }, mouth: "wide" }
};
var IMPACT = {
  "": [["shake", 1], ["sound", "impact"]],
  menace: [["shake", 2], ["sound", "impact"]],
  excited: [["shake", 1], ["flash", 1], ["sound", "impact"]],
  shout: [["shake", 3], ["box", 3], ["flash", 2], ["sound", "slam"]],
  hesitant: [["sound", "impact"]],
  whisper: [],
  breakdown: [["shake", 3], ["redflash", 2], ["sound", "stab"]]
};
function seeded(seed) {
  let h = 2166136261;
  for (const ch of String(seed)) h = Math.imul(h ^ ch.codePointAt(0), 16777619) >>> 0;
  return () => {
    h = h + 1831565813 >>> 0;
    let x = Math.imul(h ^ h >>> 15, 1 | h);
    x = x + Math.imul(x ^ x >>> 7, 61 | x) ^ x;
    return ((x ^ x >>> 14) >>> 0) / 4294967296;
  };
}
var HESITANT_EMO = /* @__PURE__ */ new Set(["worried", "shy", "blush", "scared", "sad", "confused"]);
var EXCITED_EMO = /* @__PURE__ */ new Set(["surprised", "scared", "laugh", "happy"]);
function inferDelivery(text, emo = "", type = "dialogue") {
  if (type !== "dialogue") return "";
  const bangs = (text.match(/[！!]/gu) || []).length;
  const dots = (text.match(/[…]|\.{3}/gu) || []).length;
  const stammer = new RegExp("(\\p{L})[、，,…]+\\1", "u").test(text);
  if (bangs && emo === "angry") return "shout";
  if (bangs >= 2 || bangs && EXCITED_EMO.has(emo)) return "excited";
  if (stammer || dots >= 4 || dots >= 2 && HESITANT_EMO.has(emo)) return "hesitant";
  return "";
}
function planLine(chars, speed, { say = "", stress = "", emo = "", type = "dialogue", seed = "" } = {}) {
  const n = chars.length;
  const text = chars.join("");
  const spoken = type === "dialogue" || type === "thought";
  const style = !spoken ? "" : say && STYLES[say] ? say : inferDelivery(text, emo, type);
  const S = STYLES[style];
  const base = Math.max(speed * S.gap, S.min || 0);
  const plan = { times: [], marks: new Array(n).fill(""), say: style, gap: S.chunk ? base * S.chunk : base, mouth: S.mouth, blip: S.blip, fx: [] };
  if (!n) return plan;
  if (!(speed > 0)) {
    plan.times = new Array(n).fill(0);
    return plan;
  }
  let s0 = -1;
  let s1 = -1;
  const at2 = stress && spoken ? text.indexOf(stress) : -1;
  if (at2 >= 0) {
    s0 = Array.from(text.slice(0, at2)).length;
    s1 = s0 + Array.from(stress).length - 1;
    for (let i = s0; i <= s1; i += 1) plan.marks[i] = "stress";
  }
  const inStress = (i) => s0 >= 0 && i >= s0 && i <= s1;
  const rand2 = seeded(`${seed}|${style}|${text}`);
  const pauses = pausesAfter(chars, speed);
  let t = 0;
  for (let i = 0; i < n; i += 1) {
    if (i > 0) {
      const prev = chars[i - 1];
      let gap = base;
      if (S.chunk && !inStress(i)) gap = i % S.chunk === 0 || SILENT.test(prev) || inStress(i - 1) ? base * S.chunk : 0;
      if (S.jitter) gap = base * (0.4 + rand2() * 1.4) + (rand2() < 0.12 ? speed * 5 : 0);
      gap += pauses[i - 1] * S.pause;
      if (S.stall && !SILENT.test(prev) && !SILENT.test(chars[i]) && rand2() < 0.2) gap += Math.max(speed * 4, 90);
      if (i === s0) gap += speed * 8;
      if (i > s0 && i <= s1) gap = Math.max(gap, base, speed * 3.5, 100);
      if (s0 >= 0 && i === s1 + 1) gap += speed * 4;
      t += gap;
    }
    plan.times.push(Math.round(t));
  }
  const fx = plan.fx;
  const push = (time, list2) => {
    for (const [kind, v] of list2) fx.push(kind === "sound" ? { at: time, kind, sound: v } : { at: time, kind, power: v });
  };
  if (s0 >= 0) push(plan.times[s1], IMPACT[style]);
  else if (style === "shout") push(0, IMPACT.shout);
  if (style === "breakdown") {
    if (s0 !== 0) push(0, IMPACT.breakdown);
  }
  if (style === "excited" || style === "breakdown") {
    let left = 3;
    chars.forEach((ch, i) => {
      if (left > 0 && BANG.test(ch) && !BANG.test(chars[i - 1] || "")) {
        fx.push({ at: plan.times[i], kind: "box", power: style === "breakdown" ? 2 : 1 });
        left -= 1;
      }
    });
  }
  fx.sort((a, b) => a.at - b.at);
  return plan;
}

// lib/aa-motion.js
var SENTENCE_END = /[。！？!?…]/u;
var KANA_ROWS = [
  ["A", "あかさたなはまやらわがざだばぱぁゃゎアカサタナハマヤラワガザダバパァャヮ"],
  ["I", "いきしちにひみりぎじぢびぴぃイキシチニヒミリギジヂビピィ"],
  ["U", "うくすつぬふむゆるぐずづぶぷぅゅゔウクスツヌフムユルグズヅブプゥュヴ"],
  ["E", "えけせてねへめれげぜでべぺぇエケセテネヘメレゲゼデベペェ"],
  ["O", "おこそとのほもよろをごぞどぼぽぉょオコソトノホモヨロヲゴゾドボポォョ"],
  ["N", "んっンッ"]
];
var KANA = new Map(KANA_ROWS.flatMap(([cls, s]) => [...s].map((ch) => [ch, cls])));
var LATIN = { a: "A", e: "E", i: "I", y: "I", o: "O", u: "U", w: "U", m: "N", b: "N", p: "N" };
var HAN_WEIGHTS = [["A", 0.3], ["E", 0.25], ["I", 0.2], ["O", 0.12], ["U", 0.13]];
function hash01(s) {
  let h = 2166136261;
  for (const ch of String(s)) h = Math.imul(h ^ ch.codePointAt(0), 16777619) >>> 0;
  h ^= h >>> 13;
  h = Math.imul(h, 1540483477) >>> 0;
  h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}
function visemeOf(ch) {
  if (!ch || SILENT.test(ch)) return null;
  if (ch === "ー" || ch === "〜") return "";
  if (KANA.has(ch)) return KANA.get(ch);
  const low = ch.toLowerCase();
  if (/^[a-z]$/.test(low)) return LATIN[low] || "E";
  if (/^[0-9０-９]$/.test(ch)) return "I";
  let r = hash01(ch);
  for (const [cls, w] of HAN_WEIGHTS) {
    if (r < w) return cls;
    r -= w;
  }
  return "E";
}
var clamp2 = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
function mouthTrack(talk, plan) {
  const chars = plan?.chars || [];
  const times = plan?.times || [];
  if (!talk || !chars.length || times.length !== chars.length) return [];
  const gap = plan.gap > 0 ? plan.gap : 30;
  const [beatMin, beatMax] = talk.beat_ms || [95, 160];
  const target = Math.max(beatMin, Math.min(gap, beatMax));
  const level = plan.mouth === "soft" ? "soft" : plan.mouth === "wide" || plan.mouth === "syllable" ? "loud" : "normal";
  const shapes = talk.shapes || {};
  const release = talk.release || {};
  const attack = clamp2(talk.attack ?? 0.6, 0.3, 0.9);
  const keys = [];
  let prevPeak = "";
  let cls = "A";
  const phrases = [];
  let s = -1;
  for (let i = 0; i < chars.length; i += 1) {
    const voiced = visemeOf(chars[i]) !== null;
    if (voiced && s < 0) s = i;
    const next = times[i + 1];
    const longWait = next !== void 0 && next - times[i] > gap * 2.2 && next - times[i] > beatMin;
    if (s >= 0 && (!voiced || longWait || i === chars.length - 1)) {
      const e = voiced ? i : i - 1;
      if (e >= s) phrases.push([s, e]);
      s = -1;
    }
  }
  for (const [ps, pe] of phrases) {
    const end = times[pe] + Math.max(gap, beatMin * attack + 30);
    const beats = [];
    let start = ps;
    for (let i = ps + 1; i <= pe; i += 1) {
      if (times[i] - times[start] >= target) {
        beats.push([start, i]);
        start = i;
      }
    }
    beats.push([start, pe + 1]);
    beats.forEach(([b0, b1], k) => {
      const at2 = times[b0];
      const until = b1 <= pe ? times[b1] : end;
      const c = visemeOf(chars[b0]);
      if (c) cls = c;
      const stressed = plan.marks?.[b0] === "stress";
      const lv = stressed ? level === "soft" ? "normal" : "loud" : level;
      let peak = shapes[lv]?.[cls] || "half";
      const alts = talk.accent?.[lv] || [];
      if (peak === prevPeak && alts.length) {
        const alt = alts[Math.floor(hash01(`${chars[b0]}|${b0}|${k}`) * alts.length)];
        if (alt !== peak) peak = alt;
      }
      const cur = keys.length ? keys[keys.length - 1].mouth : "closed";
      if (peak === cur && lv !== "soft") peak = talk.bump?.[peak] || peak;
      prevPeak = peak;
      keys.push({ at: at2, mouth: peak });
      const dur = Math.max(until - at2, 1);
      const rel = release[peak] || "closed";
      if (dur * (1 - attack) >= 30) keys.push({ at: at2 + dur * attack, mouth: rel });
    });
    keys.push({ at: end, mouth: "closed" });
  }
  keys.sort((a, b) => a.at - b.at);
  return keys.filter((k, i) => i === 0 || k.mouth !== keys[i - 1].mouth);
}
function mouthOnTrack(track, elapsed) {
  let state2 = "closed";
  for (const k of track || []) {
    if (k.at > elapsed) break;
    state2 = k.mouth;
  }
  return state2;
}
function blinkSteps(blink, { double = false, slow = false } = {}) {
  const close = blink?.close || [{ eyes: "half", ms: 40 }, { eyes: "closed", ms: 70 }];
  const open = blink?.open || [{ eyes: "half", ms: 90 }];
  const hold = slow ? [{ eyes: "closed", ms: 120 }] : [];
  if (!double) return [...close, ...hold, ...open];
  const shut = close[close.length - 1];
  const again = { eyes: shut.eyes, ms: Math.max(1, Math.round(shut.ms * 0.8)) };
  return [...close, { eyes: blink?.double_eyes || "half", ms: blink?.double_gap_ms ?? 60 }, again, ...hold, ...open];
}
function fitBlink(blink, has) {
  const b = { ...MOTION_DEFAULTS.blink, ...blink || {} };
  const ok = (s) => s.eyes === "open" || has.has(s.eyes);
  if (b.close.every(ok) && b.open.every(ok)) return b;
  let close = b.close.filter(ok);
  if (!close.length && has.has("closed")) close = [{ eyes: "closed", ms: 110 }];
  close = close.map((s) => s.eyes === "closed" ? { ...s, ms: Math.max(s.ms, 110) } : s);
  const half = has.has("half");
  return { ...b, close, open: b.open.filter(ok), double_eyes: half ? "half" : "open", double_gap_ms: half ? b.double_gap_ms : Math.max(70, b.double_gap_ms || 0) };
}
var MOUTH_SIZE = { closed: 0, narrow: 1, round: 2, half: 2, open: 3 };
function fitTalk(talk, has) {
  const t = { ...MOTION_DEFAULTS.talk, ...talk || {} };
  const avail = Object.keys(MOUTH_SIZE).filter((s) => s !== "closed" && has.has(s));
  if (["narrow", "half", "open", "round"].every((s) => has.has(s))) return t;
  const peak = (s) => {
    if (s === "closed" || has.has(s) || !avail.length) return avail.length ? s : "closed";
    return avail.reduce((best, a) => {
      const d = Math.abs(MOUTH_SIZE[a] - MOUTH_SIZE[s]), bd = Math.abs(MOUTH_SIZE[best] - MOUTH_SIZE[s]);
      return d < bd || d === bd && MOUTH_SIZE[a] < MOUTH_SIZE[best] ? a : best;
    });
  };
  const shrink = (from) => {
    const smaller = avail.filter((a) => MOUTH_SIZE[a] < MOUTH_SIZE[from]);
    return smaller.sort((a, b) => MOUTH_SIZE[b] - MOUTH_SIZE[a])[0] || "closed";
  };
  const mapObj = (o, f) => Object.fromEntries(Object.entries(o || {}).map(([k, v]) => [k, f(v, k)]));
  return {
    ...t,
    shapes: mapObj(t.shapes, (level) => mapObj(level, peak)),
    accent: mapObj(t.accent, (list2) => [...new Set(list2.map(peak))]),
    release: Object.fromEntries([...avail, "closed"].map((s) => [s, has.has(t.release?.[s]) ? t.release[s] : shrink(s)])),
    bump: mapObj(t.bump, peak)
  };
}
function nextBlinkGap(blink, random = Math.random) {
  const [a, b] = blink?.interval_ms || [2200, 5600];
  return a + random() * Math.max(0, b - a);
}
function stepAt(steps, t) {
  let r = t;
  for (const s of steps) {
    if (r < s.ms) return s;
    r -= s.ms;
  }
  return null;
}
function seeded2(seed) {
  let h = Math.floor(hash01(seed) * 4294967296) >>> 0;
  return () => {
    h = h + 1831565813 >>> 0;
    let x = Math.imul(h ^ h >>> 15, 1 | h);
    x = x + Math.imul(x ^ x >>> 7, 61 | x) ^ x;
    return ((x ^ x >>> 14) >>> 0) / 4294967296;
  };
}
function createActor(pack, { seed = "actor", now = 0 } = {}) {
  const rand2 = seeded2(seed);
  const pose = pack.default_pose || Object.keys(pack.poses || {})[0] || "front";
  const parts = pack.poses?.[pose]?.parts || {};
  const blink = fitBlink(pack.blink, new Set(Object.keys(parts.eyes || {})));
  const talk = fitTalk(pack.talk, new Set(Object.keys(parts.mouth || {})));
  const st = {
    pose,
    blink: null,
    // { steps, start }
    nextBlink: now + nextBlinkGap(blink, rand2),
    queued: [],
    // 计划好的眨眼时刻（句末、开口）
    line: null
    // { track, start, end }
  };
  const startBlink = (t, opts = {}) => {
    if (st.blink) return;
    const double = opts.double ?? rand2() < (blink.double_chance ?? 0);
    st.blink = { steps: blinkSteps(blink, { double, slow: opts.slow }), start: t };
  };
  return {
    get pose() {
      return st.pose;
    },
    say(plan, startAt) {
      const track = plan?.type && plan.type !== "dialogue" ? [] : mouthTrack(talk, plan);
      const end = startAt + (track.length ? track[track.length - 1].at : 0);
      st.line = { track, start: startAt, end };
      st.queued = [];
      const lr = seeded2(`${seed}|${(plan.chars || []).join("")}`);
      if (lr() < (blink.line_start_chance ?? 0)) st.queued.push(startAt + 40 + lr() * 120);
      (plan.chars || []).forEach((ch, i) => {
        if (SENTENCE_END.test(ch) && i < plan.chars.length - 1 && lr() < (blink.sentence_end_chance ?? 0)) {
          st.queued.push(startAt + plan.times[i] + 60 + lr() * 80);
        }
      });
      return end;
    },
    hush() {
      st.line = null;
      st.queued = [];
    },
    /** 立刻眨一下（预览、调试用）；double 连眨两下。 */
    blinkNow(now2, { double = false } = {}) {
      st.blink = null;
      startBlink(now2, { double });
    },
    frame(now2) {
      while (st.queued.length && st.queued[0] <= now2) {
        st.queued.shift();
        startBlink(now2, { double: false });
      }
      if (!st.blink && now2 >= st.nextBlink) startBlink(now2);
      let eyes = "open";
      if (st.blink) {
        const s = stepAt(st.blink.steps, now2 - st.blink.start);
        if (s) eyes = s.eyes;
        else {
          st.blink = null;
          st.nextBlink = now2 + nextBlinkGap(blink, rand2);
        }
      }
      let mouth = "closed";
      if (st.line) {
        mouth = mouthOnTrack(st.line.track, now2 - st.line.start);
        if (now2 > st.line.end + 50) st.line = null;
      }
      return { pose: st.pose, eyes, mouth };
    }
  };
}
function motionLayers(pack, f) {
  const pose = pack.poses[f.pose];
  const out = [{ file: pose.base, x: 0, y: 0 }];
  const eye = pose.parts?.eyes?.[f.eyes];
  if (eye) out.push(eye);
  const mouth = pose.parts?.mouth?.[f.mouth];
  if (mouth) out.push(mouth);
  return out;
}
var MOTION_DEFAULTS = {
  blink: {
    close: [{ eyes: "half", ms: 40 }, { eyes: "closed", ms: 70 }],
    open: [{ eyes: "half", ms: 90 }],
    interval_ms: [2200, 5600],
    double_chance: 0.18,
    double_gap_ms: 60,
    sentence_end_chance: 0.5,
    line_start_chance: 0.3
  },
  talk: {
    beat_ms: [95, 160],
    attack: 0.6,
    shapes: {
      normal: { A: "half", E: "half", I: "narrow", O: "round", U: "round", N: "narrow" },
      loud: { A: "open", E: "open", I: "half", O: "round", U: "round", N: "half" },
      soft: { A: "narrow", E: "narrow", I: "narrow", O: "narrow", U: "narrow", N: "closed" }
    },
    accent: { normal: ["half", "open"], loud: ["open"], soft: ["narrow"] },
    release: { open: "half", half: "narrow", round: "narrow", narrow: "closed" },
    bump: { narrow: "half", half: "round", round: "half", open: "half", closed: "narrow" }
  }
};

// lib/aa-sprite.js
function breathFrame(breath, t) {
  const steps = breath?.steps || [];
  const cycle = steps.reduce((s, x) => s + x.ms, 0);
  if (!(cycle > 0)) return 0;
  let r = (t % cycle + cycle) % cycle;
  for (const s of steps) {
    if (r < s.ms) return s.frame;
    r -= s.ms;
  }
  return steps[steps.length - 1].frame;
}
function blinkGap(blink, random = Math.random) {
  const [a, b] = blink?.interval_ms || [2e3, 5e3];
  return a + random() * (Math.max(a, b) - a);
}
function blinkAt(blink, t) {
  let r = t;
  for (const s of blink?.sequence || []) {
    if (r < s.ms) return s.eyes;
    r -= s.ms;
  }
  return null;
}
function mouthAt(loop, talk, now) {
  if (!talk || talk.done || talk.type !== "dialogue" || !(talk.speed > 0) || !talk.chars?.length || !loop?.length) return "closed";
  if (!Number.isFinite(talk.startedAt)) return "closed";
  const { chars, times } = talk;
  const gap = talk.gap > 0 ? talk.gap : talk.speed;
  const mode = talk.mouth || "loop";
  const elapsed = now - talk.startedAt;
  if (!times || elapsed < times[0]) return "closed";
  let i = 0;
  while (i + 1 < times.length && times[i + 1] <= elapsed) i += 1;
  if (SILENT.test(chars[i])) return "closed";
  const since = elapsed - times[i];
  const last = i >= chars.length - 1;
  if (last && since > gap) return "closed";
  const next = last ? gap : times[i + 1] - times[i];
  if (next > gap * 2.2 && since > gap) return "closed";
  if (mode === "syllable") {
    const slot = Math.max(next, 1);
    return since < slot * 0.5 ? "open" : since < slot * 0.75 ? "half" : "closed";
  }
  let start = i;
  while (start > 0 && !SILENT.test(chars[start - 1]) && times[start] - times[start - 1] <= gap * 2.2) start -= 1;
  const t = elapsed - times[start];
  if (mode === "wide") return t < 40 ? "half" : "open";
  const factor = Math.min(1.4, Math.max(0.8, gap / 35));
  const total = loop.reduce((s, x) => s + x.ms * factor, 0);
  let r = t % total;
  let state2 = loop[loop.length - 1].mouth;
  for (const step2 of loop) {
    const ms = step2.ms * factor;
    if (r < ms) {
      state2 = step2.mouth;
      break;
    }
    r -= ms;
  }
  return mode === "soft" && state2 === "open" ? "half" : state2;
}
var PACK_FILE = /^(?!\/)(?!.*(?:^|\/)\.\.(?:\/|$))[^\\:*?"<>|\u0000-\u001f]{1,200}$/;
var PART_STATE = /^[a-z_]{1,16}$/;
var int = (v, lo, hi, what) => {
  const n = Number(v);
  if (!Number.isInteger(n) || n < lo || n > hi) throw new Error(`素材包的 ${what} 不对（要 ${lo}~${hi} 的整数，拿到 ${JSON.stringify(v)}）`);
  return n;
};
var file = (v, what) => {
  if (typeof v !== "string" || !PACK_FILE.test(v)) throw new Error(`素材包的 ${what} 文件名不对：${JSON.stringify(v)}`);
  return v;
};
var list = (v, what) => {
  if (!Array.isArray(v)) throw new Error(`素材包缺 ${what}`);
  return v;
};
function cleanPack(raw) {
  if (raw && typeof raw === "object" && Number(raw.version) === 2) return cleanMotionPack(raw);
  if (!raw || typeof raw !== "object") throw new Error("sprite.json 不是一个对象");
  const size = list(raw.size, "size（宽、高）");
  const w = int(size[0], 1, 8192, "宽"), h = int(size[1], 1, 8192, "高");
  const frames = list(raw.breath?.frames, "breath.frames（呼吸帧）").map((f, i) => file(f, `第 ${i + 1} 张呼吸帧`));
  if (!frames.length || frames.length > 12) throw new Error("呼吸帧要 1~12 张");
  const lifts = frames.map((_, i) => int(raw.breath.lifts?.[i] ?? 0, -512, 512, `第 ${i + 1} 张呼吸帧的上移`));
  const steps = (raw.breath.steps?.length ? raw.breath.steps : [{ frame: 0, ms: 1e3 }]).slice(0, 32).map((s, i) => ({ frame: int(s?.frame, 0, frames.length - 1, `呼吸第 ${i + 1} 步的帧号`), ms: int(s?.ms, 10, 6e4, `呼吸第 ${i + 1} 步的时长`) }));
  const parts = {};
  for (const part of ["eyes", "mouth"]) {
    const states = raw.parts?.[part];
    if (!states) continue;
    parts[part] = {};
    for (const [state2, p2] of Object.entries(states)) {
      if (!PART_STATE.test(state2)) throw new Error(`素材包的 ${part} 差分名不对：${state2}`);
      parts[part][state2] = { file: file(p2?.file, `${part}.${state2}`), x: int(p2?.x, -w, w, `${part}.${state2} 的 x`), y: int(p2?.y, -h, h, `${part}.${state2} 的 y`) };
    }
  }
  const pack = { name: String(raw.name || "").slice(0, 60), size: [w, h], breath: { frames, lifts, steps }, parts };
  if (raw.blink) {
    pack.blink = {
      sequence: list(raw.blink.sequence, "blink.sequence").slice(0, 16).map((s, i) => ({ eyes: String(s?.eyes || ""), ms: int(s?.ms, 1, 5e3, `眨眼第 ${i + 1} 步的时长`) })),
      interval_ms: [int(raw.blink.interval_ms?.[0] ?? 2e3, 100, 6e4, "眨眼最短间隔"), int(raw.blink.interval_ms?.[1] ?? 5e3, 100, 6e4, "眨眼最长间隔")]
    };
  }
  if (raw.talk?.mouth_loop) {
    pack.talk = { mouth_loop: list(raw.talk.mouth_loop, "talk.mouth_loop").slice(0, 16).map((s, i) => ({ mouth: String(s?.mouth || ""), ms: int(s?.ms, 1, 5e3, `口型第 ${i + 1} 步的时长`) })) };
  }
  return pack;
}
function packFiles(pack) {
  if (!pack) return [];
  if (pack.version === 2) {
    const files2 = [];
    for (const p2 of Object.values(pack.poses || {})) {
      files2.push(p2.base);
      for (const states of Object.values(p2.parts || {})) for (const v of Object.values(states)) files2.push(v.file);
    }
    return [...new Set(files2)];
  }
  const parts = Object.values(pack.parts || {}).flatMap((states) => Object.values(states).map((p2) => p2.file));
  return [.../* @__PURE__ */ new Set([...pack.breath?.frames || [], ...parts])];
}
var POSE_NAME = /^[a-z_]{1,16}$/;
var EYE_STATES = ["lower", "half", "closed"];
var MOUTH_STATES = ["narrow", "half", "open", "round"];
var VISEMES = ["A", "E", "I", "O", "U", "N"];
var timedSteps = (v, what, key, allowed, fallback) => {
  if (!Array.isArray(v)) return fallback;
  const out = v.slice(0, 12).map((s, i) => {
    const state2 = String(s?.[key] || "");
    if (!allowed.includes(state2)) throw new Error(`素材包的${what}第 ${i + 1} 步状态不对：${JSON.stringify(s?.[key])}`);
    return { [key]: state2, ms: int(s?.ms, 1, 5e3, `${what}第 ${i + 1} 步的时长`) };
  });
  return out.length ? out : fallback;
};
var chance = (v, fallback, what) => {
  if (v === void 0) return fallback;
  const n = Number(v);
  if (!(n >= 0 && n <= 1)) throw new Error(`素材包的 ${what} 要在 0~1 之间`);
  return n;
};
var stateMap = (v, keys, values, fallback, what) => {
  if (!v || typeof v !== "object") return fallback;
  const out = { ...fallback };
  for (const [k, x] of Object.entries(v)) {
    if (!keys.includes(k)) continue;
    if (!values.includes(x)) throw new Error(`素材包的 ${what}.${k} 不对：${JSON.stringify(x)}`);
    out[k] = x;
  }
  return out;
};
function cleanMotionPack(raw) {
  const size = list(raw.size, "size（宽、高）");
  const w = int(size[0], 1, 8192, "宽"), h = int(size[1], 1, 8192, "高");
  const all = Object.keys(raw.poses || {});
  if (!all.length) throw new Error("素材包缺 poses（整图和眼嘴贴片）");
  const defaultPose = all.includes(raw.default_pose) ? raw.default_pose : all[0];
  const poses = {};
  for (const name2 of [defaultPose]) {
    if (!POSE_NAME.test(name2)) throw new Error("素材包的姿势名不对：" + name2);
    const p2 = raw.poses[name2] || {};
    const parts = {};
    for (const [part, allowed] of [["eyes", EYE_STATES], ["mouth", MOUTH_STATES]]) {
      parts[part] = {};
      for (const [state2, v] of Object.entries(p2.parts?.[part] || {})) {
        if (!allowed.includes(state2)) throw new Error(`素材包「${name2}」的 ${part} 差分名不对：${state2}`);
        parts[part][state2] = { file: file(v?.file, `${name2}.${part}.${state2}`), x: int(v?.x, -w, w, `${name2}.${part}.${state2} 的 x`), y: int(v?.y, -h, h, `${name2}.${part}.${state2} 的 y`) };
      }
    }
    poses[name2] = { label: String(p2.label || "").slice(0, 20), base: file(p2.base, `姿势「${name2}」的整图`), parts };
  }
  const D = MOTION_DEFAULTS;
  const eyesAll = ["open", ...EYE_STATES];
  const mouthAll = ["closed", ...MOUTH_STATES];
  const B = raw.blink || {};
  const blink = {
    close: timedSteps(B.close, "闭眼", "eyes", eyesAll, D.blink.close),
    open: timedSteps(B.open, "睁眼", "eyes", eyesAll, D.blink.open),
    interval_ms: [int(B.interval_ms?.[0] ?? D.blink.interval_ms[0], 100, 6e4, "眨眼最短间隔"), int(B.interval_ms?.[1] ?? D.blink.interval_ms[1], 100, 6e4, "眨眼最长间隔")],
    double_chance: chance(B.double_chance, D.blink.double_chance, "double_chance"),
    double_gap_ms: int(B.double_gap_ms ?? D.blink.double_gap_ms, 1, 2e3, "连眨间隔"),
    sentence_end_chance: chance(B.sentence_end_chance, D.blink.sentence_end_chance, "sentence_end_chance"),
    line_start_chance: chance(B.line_start_chance, D.blink.line_start_chance, "line_start_chance")
  };
  const T = raw.talk || {};
  const shapes = {};
  const accent = {};
  for (const lv of ["normal", "loud", "soft"]) {
    shapes[lv] = stateMap(T.shapes?.[lv], VISEMES, mouthAll, D.talk.shapes[lv], `talk.shapes.${lv}`);
    const a = Array.isArray(T.accent?.[lv]) ? T.accent[lv].filter((x) => mouthAll.includes(x)).slice(0, 4) : [];
    accent[lv] = a.length ? a : D.talk.accent[lv];
  }
  const talk = {
    beat_ms: [int(T.beat_ms?.[0] ?? D.talk.beat_ms[0], 30, 1e3, "一拍最短"), int(T.beat_ms?.[1] ?? D.talk.beat_ms[1], 30, 2e3, "一拍最长")],
    attack: chance(T.attack, D.talk.attack, "talk.attack"),
    shapes,
    accent,
    release: stateMap(T.release, mouthAll, mouthAll, D.talk.release, "talk.release"),
    bump: stateMap(T.bump, mouthAll, mouthAll, D.talk.bump, "talk.bump")
  };
  return { version: 2, name: String(raw.name || "").slice(0, 60), size: [w, h], poses, default_pose: defaultPose, blink, talk };
}
var AA_PARTS = {
  eyes: {
    label: "眼睛",
    states: {
      half: { label: "半闭眼", add: "half-closed eyes", neg: "closed eyes, wide-eyed", drop: [/^wide[- ]eyed$/i, /^open eyes$/i] },
      closed: { label: "闭眼", add: "closed eyes", neg: "open eyes, eyelashes up", drop: [/^wide[- ]eyed$/i, /^open eyes$/i, /^looking at viewer$/i, /^(?!closed\b)[\w\s-]* eyes$/i] }
    }
  },
  // 嘴照「扁长框」的办法：框多高，嘴最多张多大（含蓄）；不要 small mouth（会画成一个点）。圆嘴的框往下多出半个框高。
  mouth: {
    label: "嘴",
    states: {
      narrow: { label: "齿缝", add: "parted lips", neg: "open mouth, :o, round mouth, teeth, tongue, smile", drop: [/^closed mouth$/i, /smile$/i, /^(grin|smirk|:\)|:3)$/i] },
      half: { label: "小开", add: "open mouth, talking, calm", neg: "wide open mouth, :d, :o, round mouth, teeth, tongue, laughing, surprised, shouting", drop: [/^closed mouth$/i, /smile$/i, /^(grin|smirk|:\)|:3)$/i] },
      open: { label: "开", add: "open mouth, talking", neg: "wide open mouth, :d, :o, round mouth, tongue, laughing, surprised, shouting", drop: [/^closed mouth$/i, /smile$/i, /^(grin|smirk|:\)|:3)$/i] },
      round: { label: "圆（o、u）", add: ":o, open mouth, talking", neg: "teeth, tongue, :d, wide mouth, laughing, shouting", drop: [/^closed mouth$/i, /smile$/i, /^(grin|smirk|:\)|:3)$/i] }
    }
  }
};
var AA_STEPS = [["eyes", "half"], ["eyes", "closed"], ["mouth", "narrow"], ["mouth", "half"], ["mouth", "open"], ["mouth", "round"]];
var AA_STEPS_LITE = [["eyes", "closed"], ["mouth", "half"]];
function stateRects(rects, part, state2, height = Infinity) {
  const list2 = rects[part] || [];
  if (part !== "mouth" || state2 !== "round") return list2;
  return list2.map(([x0, y0, x1, y1]) => [x0, y0, x1, Math.min(height, y1 + Math.max(8, snap8((y1 - y0) / 2)))]);
}
var snap8 = (v) => Math.round(v / 8) * 8;
function rectsBox(list2) {
  return [Math.min(...list2.map((r) => r[0])), Math.min(...list2.map((r) => r[1])), Math.max(...list2.map((r) => r[2])), Math.max(...list2.map((r) => r[3]))];
}
function defaultRects(width, height) {
  const at2 = (fx0, fy0, fx1, fy1) => [snap8(width * fx0), snap8(height * fy0), snap8(width * fx1), snap8(height * fy1)];
  return { eyes: [at2(0.385, 0.176, 0.471, 0.229), at2(0.51, 0.171, 0.606, 0.224)], mouth: [at2(0.471, 0.257, 0.519, 0.27)] };
}
function motionPack({ name: name2, width, height, still, patches }) {
  return { version: 2, name: name2, size: [width, height], poses: { front: { base: still, parts: patches } }, default_pose: "front" };
}
var packLevel = (pack) => pack?.version === 2 && pack.poses?.[pack.default_pose]?.parts?.eyes?.half ? "full" : pack?.version === 2 ? "lite" : "v1";

// src/client/theater/AaSprite.jsx
var packs = /* @__PURE__ */ new Map();
var loadImage = (src) => new Promise((resolve, reject) => {
  const img = new Image();
  img.onload = () => resolve(img);
  img.onerror = () => reject(new Error("aa sprite image: " + src));
  img.src = src;
});
var packKey = (aa) => aa.pack ? "pack:" + JSON.stringify(aa.pack) : aa.manifest || "";
function loadAaPack(aa) {
  const key = packKey(aa);
  if (!packs.has(key)) {
    const task = (async () => {
      let m, at2;
      if (aa.pack) {
        m = aa.pack;
        at2 = assetUrl;
      } else {
        const base = new URL(aa.manifest, location.href);
        const res = await fetch(base);
        if (!res.ok) throw new Error("aa sprite manifest: " + res.status);
        m = await res.json();
        at2 = (file2) => new URL(file2, base).href;
      }
      if (m.version === 2) {
        const images = new Map(await Promise.all(packFiles(m).map(async (f) => [f, await loadImage(at2(f))])));
        return { m, v2: true, images, w: m.size[0], h: m.size[1] };
      }
      const frames = await Promise.all(m.breath.frames.map((f) => loadImage(at2(f))));
      const parts = {};
      for (const [part, states] of Object.entries(m.parts || {})) {
        parts[part] = {};
        for (const [state2, v] of Object.entries(states)) parts[part][state2] = { img: await loadImage(at2(v.file)), x: v.x, y: v.y };
      }
      return { m, frames, parts, w: m.size[0], h: m.size[1] };
    })();
    task.catch(() => packs.delete(key));
    packs.set(key, task);
  }
  return packs.get(key);
}
var reduced = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
function AaSprite({ aa, talk, fallback, className, label }) {
  const [pack, setPack] = import_react3.default.useState(null);
  const canvas = import_react3.default.useRef(null);
  const talkRef = import_react3.default.useRef(talk);
  talkRef.current = talk;
  const key = packKey(aa);
  import_react3.default.useEffect(() => {
    let live = true;
    loadAaPack(aa).then((p2) => {
      if (live) setPack(p2);
    }, () => {
    });
    return () => {
      live = false;
    };
  }, [key]);
  import_react3.default.useLayoutEffect(() => {
    const el = canvas.current;
    if (!pack || !el) return void 0;
    el.width = pack.w;
    el.height = pack.h;
    const g = el.getContext("2d");
    const draw = pack.v2 ? motionDrawer(pack, g, { talkRef, label }) : breathDrawer(pack, g, talkRef);
    draw(performance.now());
    let raf = requestAnimationFrame(function tick(now) {
      raf = requestAnimationFrame(tick);
      draw(now);
    });
    return () => cancelAnimationFrame(raf);
  }, [pack]);
  if (!pack) return fallback || null;
  return /* @__PURE__ */ import_react3.default.createElement("canvas", { ref: canvas, className, role: "img", "aria-label": label });
}
function breathDrawer(pack, g, talkRef) {
  const { m } = pack;
  const begin = performance.now();
  let nextBlink = begin + blinkGap(m.blink);
  let blinkStart = -1;
  let drawn = "";
  return (now) => {
    const still = reduced();
    const b = still ? 0 : breathFrame(m.breath, now - begin);
    let eyes = "open";
    if (!still) {
      if (blinkStart < 0 && now >= nextBlink) blinkStart = now;
      if (blinkStart >= 0) {
        eyes = blinkAt(m.blink, now - blinkStart);
        if (!eyes) {
          eyes = "open";
          blinkStart = -1;
          nextBlink = now + blinkGap(m.blink);
        }
      }
    }
    const mouth = mouthAt(m.talk?.mouth_loop, talkRef.current, now);
    const key = `${b}|${eyes}|${mouth}`;
    if (key === drawn) return;
    drawn = key;
    g.clearRect(0, 0, pack.w, pack.h);
    g.drawImage(pack.frames[b], 0, 0);
    const lift = m.breath.lifts?.[b] || 0;
    for (const [part, state2] of [["eyes", eyes], ["mouth", mouth]]) {
      const p2 = pack.parts[part]?.[state2];
      if (p2) g.drawImage(p2.img, p2.x, p2.y - lift);
    }
  };
}
function motionDrawer(pack, g, { talkRef, label }) {
  const { m, images } = pack;
  const actor = createActor(m, { seed: label || "aa", now: performance.now() });
  let said = "";
  let drawn = "";
  return (now) => {
    const still = reduced();
    if (still) actor.hush();
    const t = talkRef.current;
    const sayKey = t && t.type === "dialogue" && t.speed > 0 && !t.done && Number.isFinite(t.startedAt) ? `${t.key}|${t.startedAt}` : "";
    if (sayKey !== said) {
      said = sayKey;
      if (sayKey && !still) actor.say({ chars: t.chars, times: t.times, gap: t.gap, mouth: t.mouth, marks: t.marks }, t.startedAt);
      else actor.hush();
    }
    const f = still ? { pose: m.default_pose, eyes: "open", mouth: "closed" } : actor.frame(now);
    const key = `${f.eyes}|${f.mouth}`;
    if (key === drawn) return;
    drawn = key;
    g.clearRect(0, 0, pack.w, pack.h);
    for (const l of motionLayers(m, f)) {
      const img = images.get(l.file);
      if (img) g.drawImage(img, l.x, l.y);
    }
  };
}

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
  const p2 = preview;
  preview = null;
  p2.el.pause();
  p2.el.src = "";
  if (bgm) fade(bgm.el, bgm.volume, 800);
  if (p2.onEnd) p2.onEnd();
}
var sounds = { blipVolume: 1, sfx: true, sfxVolume: 1, sounds: DEFAULT_SOUNDS, customSounds: {} };
function configureSounds(ui2) {
  if (!ui2) return;
  sounds = ui2;
  for (const file2 of Object.values(ui2.customSounds || {})) fetchFile(file2.assetId).catch(() => {
  });
}
var noiseBuffer = null;
function noise(ac) {
  if (!noiseBuffer) {
    noiseBuffer = ac.createBuffer(1, Math.floor(ac.sampleRate * 0.5), ac.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
  }
  return noiseBuffer;
}
function playParts(ac, parts, { rate = 1, volume = 1, at: at2 = ac.currentTime } = {}) {
  if (!(volume > 0)) return;
  for (const part of parts) {
    const t = at2 + (part.at || 0);
    const end = t + part.dur;
    const g = ac.createGain();
    const peak = Math.max(2e-4, part.gain * volume);
    const attack = part.attack ?? (part.wave === "noise" ? 0 : 6e-3);
    if (attack > 0) {
      g.gain.setValueAtTime(1e-4, t);
      g.gain.exponentialRampToValueAtTime(peak, t + attack);
    } else g.gain.setValueAtTime(peak, t);
    g.gain.exponentialRampToValueAtTime(1e-4, end);
    let src, head;
    if (part.wave === "noise") {
      src = ac.createBufferSource();
      src.buffer = noise(ac);
      src.loop = true;
      head = ac.createBiquadFilter();
      head.type = "bandpass";
      head.Q.value = part.q ?? 1;
      src.connect(head);
    } else {
      src = ac.createOscillator();
      src.type = part.wave;
      head = src;
    }
    const freq = part.wave === "noise" ? head.frequency : src.frequency;
    freq.setValueAtTime(part.f * rate, t);
    if (part.to && part.to !== part.f) freq.exponentialRampToValueAtTime(part.to * rate, end);
    if (part.lp) {
      const lp = ac.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = part.lp;
      head.connect(lp);
      head = lp;
    }
    head.connect(g).connect(ac.destination);
    src.start(t);
    src.stop(end + 0.02);
  }
}
var MAX_FILE_SECONDS = 4;
var files = /* @__PURE__ */ new Map();
var buffers = /* @__PURE__ */ new Map();
function fetchFile(id) {
  if (!files.has(id)) {
    const p2 = fetch(assetUrl(id)).then((r) => {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.arrayBuffer();
    });
    p2.catch(() => files.delete(id));
    files.set(id, p2);
  }
  return files.get(id);
}
function decoded(ac, id) {
  if (!buffers.has(id)) {
    const p2 = fetchFile(id).then((bytes) => ac.decodeAudioData(bytes.slice(0)));
    p2.catch(() => buffers.delete(id));
    buffers.set(id, p2);
  }
  return buffers.get(id);
}
function playFile(ac, id, volume) {
  if (!(volume > 0)) return;
  decoded(ac, id).then((buffer) => {
    const src = ac.createBufferSource();
    const g = ac.createGain();
    const t = ac.currentTime;
    src.buffer = buffer;
    g.gain.setValueAtTime(volume, t);
    src.connect(g).connect(ac.destination);
    src.start(t);
    if (buffer.duration > MAX_FILE_SECONDS) {
      g.gain.setValueAtTime(volume, t + MAX_FILE_SECONDS - 0.3);
      g.gain.linearRampToValueAtTime(0, t + MAX_FILE_SECONDS);
      src.stop(t + MAX_FILE_SECONDS);
    }
  }).catch(() => {
  });
}
function playSound(sound, volume) {
  const ac = sound && audioCtx();
  if (!ac) return;
  if (sound.assetId) playFile(ac, sound.assetId, volume);
  else playParts(ac, sound.parts, { volume });
}
function blip(voice, { pitch = 1, gain = 1 } = {}) {
  const v = voice && voiceById(voice.id);
  const ac = v && audioCtx();
  if (!ac) return;
  const rate = 2 ** ((voice.pitch || 0) / 12) * pitch * (0.96 + Math.random() * 0.08);
  playParts(ac, v.parts, { rate, volume: (sounds.blipVolume ?? 1) * gain * (voice.gain ?? 1) });
}
function previewVoice(voice, ui2 = sounds) {
  const v = voice && voiceById(voice.id);
  const ac = v && audioCtx();
  if (!ac) return;
  const base = 2 ** ((voice.pitch || 0) / 12);
  const t0 = ac.currentTime + 0.02;
  for (const dt of [0, 0.09, 0.18, 0.42, 0.51, 0.6, 0.69]) playParts(ac, v.parts, { rate: base * (0.96 + Math.random() * 0.08), volume: ui2.blipVolume ?? 1, at: t0 + dt });
}
function stinger(kind) {
  if (sounds.sfx !== false) playSound(soundFor(sounds, kind), sounds.sfxVolume ?? 1);
}
function sfx(kind = "select") {
  stinger(kind === "back" ? "select" : kind);
}
function previewSound(slot, choice, ui2 = sounds) {
  const def = slotById(slot);
  if (!def || choice === "off") return;
  const file2 = choice === "custom" && ui2.customSounds && ui2.customSounds[slot];
  const sound = file2 ? { assetId: file2.assetId } : { parts: (def.presets.find((x) => x.id === choice) || def.presets[0]).parts };
  playSound(sound, ui2.sfxVolume ?? 1);
}

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
  return /* @__PURE__ */ import_react4.default.createElement("svg", { className: "fg-skyline", viewBox: "0 0 1000 400", preserveAspectRatio: "none", "aria-hidden": "true" }, /* @__PURE__ */ import_react4.default.createElement("defs", null, /* @__PURE__ */ import_react4.default.createElement("linearGradient", { id: "fg-skyline-g", x1: "0", y1: "0", x2: "0", y2: "1" }, /* @__PURE__ */ import_react4.default.createElement("stop", { offset: "0", stopColor: night ? "#0b0f2a" : "#2a2440", stopOpacity: ".92" }), /* @__PURE__ */ import_react4.default.createElement("stop", { offset: "1", stopColor: "#05040c" }))), /* @__PURE__ */ import_react4.default.createElement("path", { d: `M0 400 L0 ${260 + h % 40} Q250 ${200 + h % 60} 500 ${250 + h % 30} T1000 ${230 + h % 50} L1000 400 Z`, fill: "#000", opacity: ".28" }), blocks.map((b, k) => /* @__PURE__ */ import_react4.default.createElement("rect", { key: k, x: b.x, y: b.top, width: b.w, height: 400 - b.top, fill: "url(#fg-skyline-g)" })), windows.map((w, k) => /* @__PURE__ */ import_react4.default.createElement("rect", { key: "w" + k, x: w.x, y: w.y, width: "6", height: "9", fill: "#ffd98a", opacity: 0.5 + k % 5 * 0.1 })));
}
function Sky({ scene }) {
  const [top, mid, low, sun, sx, sy] = SKY[scene.time] || SKY.afternoon;
  return /* @__PURE__ */ import_react4.default.createElement("div", { className: "fg-sky", style: { background: `linear-gradient(180deg, ${top} 0%, ${mid} 55%, ${low} 100%)`, "--sun": sun, "--sun-x": sx, "--sun-y": sy } }, /* @__PURE__ */ import_react4.default.createElement(Skyline, { seed: scene.location || "x", time: scene.time }));
}
function Backdrop({ scene, view, transition = "dissolve" }) {
  const bg = backgroundFor(scene, view);
  const id = bg.src || "sky:" + scene.time + ":" + scene.location;
  const [layers, setLayers] = import_react4.default.useState(() => [{ id, bg, scene, enter: false }]);
  import_react4.default.useEffect(() => {
    setLayers((list2) => {
      if (list2[list2.length - 1].id === id) return list2.map((l, i) => i === list2.length - 1 ? { ...l, scene } : l);
      return [...list2.slice(-1).map((l) => ({ ...l, leaving: true })), { id, bg, scene, enter: true, tr: transition }];
    });
  }, [id, scene.time]);
  import_react4.default.useEffect(() => {
    if (layers.length < 2) return void 0;
    const t = setTimeout(() => setLayers((list2) => list2.filter((l) => !l.leaving)), 1900);
    return () => clearTimeout(t);
  }, [layers]);
  return /* @__PURE__ */ import_react4.default.createElement(import_react4.default.Fragment, null, layers.map((layer) => {
    const [anim, dur] = TRANSITION[layer.tr] || TRANSITION.dissolve;
    const cls = ["fg-bg", layer.bg.src ? "is-image" : "", layer.enter && layer.tr !== "none" ? "is-enter" : "", layer.leaving ? "is-leave" : ""].join(" ");
    return /* @__PURE__ */ import_react4.default.createElement("div", { key: layer.id, className: cls, "data-tr": layer.tr, style: { "--enter-anim": anim, "--enter-dur": dur, backgroundImage: layer.bg.src ? `url("${layer.bg.src}")` : void 0 } }, !layer.bg.src && /* @__PURE__ */ import_react4.default.createElement(Sky, { scene: layer.scene }));
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
  return /* @__PURE__ */ import_react4.default.createElement("div", { className: "fg-silhouette", style: { "--c": color } }, /* @__PURE__ */ import_react4.default.createElement("svg", { viewBox: "0 0 200 400", "aria-hidden": "true" }, /* @__PURE__ */ import_react4.default.createElement("defs", null, /* @__PURE__ */ import_react4.default.createElement("linearGradient", { id: gid, x1: "0", y1: "0", x2: "0", y2: "1" }, /* @__PURE__ */ import_react4.default.createElement("stop", { offset: "0", stopColor: color, stopOpacity: ".95" }), /* @__PURE__ */ import_react4.default.createElement("stop", { offset: ".55", stopColor: color, stopOpacity: ".5" }), /* @__PURE__ */ import_react4.default.createElement("stop", { offset: "1", stopColor: color, stopOpacity: "0" })), /* @__PURE__ */ import_react4.default.createElement("linearGradient", { id: gid + "h", x1: "0", y1: "0", x2: "0", y2: "1" }, /* @__PURE__ */ import_react4.default.createElement("stop", { offset: "0", stopColor: st.hair, stopOpacity: ".95" }), /* @__PURE__ */ import_react4.default.createElement("stop", { offset: "1", stopColor: st.hair, stopOpacity: ".55" })), /* @__PURE__ */ import_react4.default.createElement("radialGradient", { id: gid + "f", cx: ".5", cy: ".42", r: ".62" }, /* @__PURE__ */ import_react4.default.createElement("stop", { offset: "0", stopColor: "#fff", stopOpacity: ".5" }), /* @__PURE__ */ import_react4.default.createElement("stop", { offset: "1", stopColor: "#fff", stopOpacity: ".06" }))), st.tails > 0 && /* @__PURE__ */ import_react4.default.createElement("path", { d: SIL.tailR, fill: `url(#${gid}h)` }), st.tails > 1 && /* @__PURE__ */ import_react4.default.createElement("path", { d: SIL.tailL, fill: `url(#${gid}h)` }), /* @__PURE__ */ import_react4.default.createElement("path", { d: hairPath, fill: `url(#${gid}h)` }), /* @__PURE__ */ import_react4.default.createElement("path", { d: bodyPath, fill: `url(#${gid})` }), /* @__PURE__ */ import_react4.default.createElement("path", { d: SIL.neck, fill: color, opacity: ".55" }), /* @__PURE__ */ import_react4.default.createElement("path", { d: SIL.face, fill: color, opacity: ".8" }), /* @__PURE__ */ import_react4.default.createElement("path", { d: SIL.face, fill: `url(#${gid}f)` }), /* @__PURE__ */ import_react4.default.createElement("path", { d: SIL.bangs, fill: st.hair, opacity: ".92" }), /* @__PURE__ */ import_react4.default.createElement("path", { d: st.short ? SIL.lockShortL : SIL.lockL, fill: st.hair, opacity: ".85" }), /* @__PURE__ */ import_react4.default.createElement("path", { d: st.short ? SIL.lockShortR : SIL.lockR, fill: st.hair, opacity: ".85" }), /* @__PURE__ */ import_react4.default.createElement("path", { d: SIL.collar, fill: "none", stroke: "#fff", strokeOpacity: ".5", strokeWidth: "2.5", strokeLinecap: "round" }), /* @__PURE__ */ import_react4.default.createElement("path", { className: "sil-rim", d: st.short ? SIL.rimShort : SIL.rimLong }), /* @__PURE__ */ import_react4.default.createElement("path", { className: "sil-rim", d: bodyPath })), /* @__PURE__ */ import_react4.default.createElement("div", { className: "fg-silhouette-name" }, name2));
}
function MangaSymbol({ kind, life = 2.6 }) {
  const svg2 = SYMBOL_SVG[kind];
  if (!svg2) return null;
  return /* @__PURE__ */ import_react4.default.createElement("span", { className: "fg-symbol", "data-kind": kind, style: { "--life": life + "s" } }, /* @__PURE__ */ import_react4.default.createElement("span", { className: "fg-symbol-art", dangerouslySetInnerHTML: { __html: svg2 } }));
}
function spriteFor(person, turn, emo, emotions) {
  if (!person || !person.timeline) return "";
  const custom = (emotions || []).find((e) => e.id === emo);
  return pickSprite(person.sprites, lookAt(person.timeline, turn), emo, custom ? custom.base : "");
}
var SIDE = { farleft: "-40%", left: "-28%", center: "0%", right: "28%", farright: "40%" };
function Actor({ entry, person, beat, emo, emotions, leaving = false, talk = null }) {
  const speaking = !leaving && beat.speaker === entry.name;
  const sprite = spriteFor(person, beat.turn, emo, emotions);
  const src = sprite ? assetUrl(sprite) : "";
  const color = person && person.color || "#9b7bff";
  const [shown, setShown] = import_react4.default.useState(src);
  const [swap, setSwap] = import_react4.default.useState(false);
  import_react4.default.useEffect(() => {
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
  const uploaded = Boolean(person && Object.values(person.sprites || {}).some((r) => r && r.assetId === sprite && r.uploaded));
  const aa = (person && Object.values(person.sprites || {}).find((r) => r && r.assetId === sprite && (r.aa?.pack || r.aa?.manifest)))?.aa || null;
  const still = shown ? /* @__PURE__ */ import_react4.default.createElement("img", { src: shown, alt: entry.name, className: swap ? "is-swap" : "", draggable: "false" }) : /* @__PURE__ */ import_react4.default.createElement(Silhouette, { name: entry.name, color, appearance: person && person.appearance, gender: person && person.gender });
  return /* @__PURE__ */ import_react4.default.createElement("div", { className: `fg-actor${speaking ? " is-speaking" : ""}${uploaded ? " is-upload" : ""}${leaving ? " is-leaving" : ""}${aa ? " is-aa" : ""}`, style: { "--x": actorX(entry.pos) + "%", "--side": SIDE[entry.pos] || "0%" }, "data-name": entry.name }, /* @__PURE__ */ import_react4.default.createElement("div", { className: "fg-actor-body" }, aa ? /* @__PURE__ */ import_react4.default.createElement(AaSprite, { aa, talk: speaking && talk && talk.key === beat.key ? talk : null, fallback: still, className: "fg-aa", label: entry.name }) : still), speaking && beat.sym && /* @__PURE__ */ import_react4.default.createElement("div", { className: "fg-symbol-anchor" }, /* @__PURE__ */ import_react4.default.createElement(MangaSymbol, { key: beat.key, kind: beat.sym })));
}
var LEAVE_MS = 450;
function useLeaving(cast) {
  const prev = import_react4.default.useRef([]);
  const leaving = import_react4.default.useRef(/* @__PURE__ */ new Map());
  const [, refresh] = import_react4.default.useReducer((n) => n + 1, 0);
  const now = Date.now();
  for (const p2 of prev.current) if (!cast.some((c) => c.name === p2.name) && !leaving.current.has(p2.name)) leaving.current.set(p2.name, { entry: p2, at: now });
  for (const c of cast) leaving.current.delete(c.name);
  prev.current = cast;
  const pending = leaving.current.size;
  import_react4.default.useEffect(() => {
    if (!pending) return void 0;
    const t = setTimeout(() => {
      const cut = Date.now() - LEAVE_MS;
      for (const [name2, l] of leaving.current) if (l.at <= cut) leaving.current.delete(name2);
      refresh();
    }, LEAVE_MS);
    return () => clearTimeout(t);
  });
  return [...leaving.current.values()].map((l) => l.entry);
}
function Cast({ beat, view, talk }) {
  const people = new Map((view && view.cast || []).map((p2) => [p2.name, p2]));
  let cast = beat.cast || [];
  if (!beat.directed && !cast.length && beat.speaker && beat.speaker !== "我" && people.has(beat.speaker)) cast = [{ name: beat.speaker, pos: "center" }];
  const leaving = useLeaving(cast);
  return /* @__PURE__ */ import_react4.default.createElement("div", { className: "fg-cast" }, cast.map((entry) => /* @__PURE__ */ import_react4.default.createElement(Actor, { key: entry.name, entry, person: people.get(entry.name), beat, emo: beat.emotions[entry.name] || "neutral", emotions: view && view.emotions, talk })), leaving.map((entry) => /* @__PURE__ */ import_react4.default.createElement(Actor, { key: entry.name, entry, person: people.get(entry.name), beat, emo: beat.emotions[entry.name] || "neutral", emotions: view && view.emotions, leaving: true })));
}
var PAN_BELOW = 0.85;
function usePanRatio(ref, src, version) {
  const [state2, setState] = import_react4.default.useState({ src: "", ratio: 0 });
  const w = version && version.width;
  const h = version && version.height;
  import_react4.default.useLayoutEffect(() => {
    if (!src) return void 0;
    let off = false;
    let dims = w && h ? [w, h] : null;
    const measure = () => {
      const el = ref.current;
      if (off || !el || !dims || !el.clientWidth) return;
      const ratio = el.clientHeight / el.clientWidth / (dims[1] / dims[0]);
      setState({ src, ratio: ratio < PAN_BELOW ? ratio : 0 });
    };
    if (!dims) {
      const probe = new Image();
      probe.onload = () => {
        dims = [probe.naturalWidth, probe.naturalHeight];
        measure();
      };
      probe.src = src;
    }
    measure();
    const ro = typeof ResizeObserver === "function" ? new ResizeObserver(measure) : null;
    if (ro && ref.current) ro.observe(ref.current);
    return () => {
      off = true;
      if (ro) ro.disconnect();
    };
  }, [src, w, h]);
  return state2.src === src ? state2.ratio : 0;
}
var CG_LEAVE_MS = 800;
function CgLayer({ beat }) {
  const img = beat.cg;
  const src = cgSrc(img, assetUrl);
  const last = import_react4.default.useRef(null);
  const [, refresh] = import_react4.default.useReducer((n) => n + 1, 0);
  if (src) last.current = { img, src };
  const shown = src ? { img, src } : last.current;
  import_react4.default.useEffect(() => {
    if (src || !last.current) return void 0;
    const t = setTimeout(() => {
      last.current = null;
      refresh();
    }, CG_LEAVE_MS);
    return () => clearTimeout(t);
  }, [src]);
  const box = import_react4.default.useRef(null);
  const ratio = usePanRatio(box, shown ? shown.src : "", shown && shown.img.versions && shown.img.versions[shown.img.current]);
  if (!shown) {
    if (!img || img.status === "failed" || img.status === "cancelled") return null;
    return /* @__PURE__ */ import_react4.default.createElement("div", { className: "fg-cg-wait" }, /* @__PURE__ */ import_react4.default.createElement("i", null), img.status === "writing" ? "插画分镜中" : "插画绘制中", img.title ? `「${img.title}」` : "");
  }
  const pan = ratio ? { "--r": ratio.toFixed(4), "--pan": `${Math.round(16 + (1 - ratio) * 16)}s` } : null;
  const title = shown.img.title;
  return /* @__PURE__ */ import_react4.default.createElement("div", { className: `fg-cg${ratio ? " is-tall" : ""}${src ? "" : " is-leaving"}`, key: shown.img.id + ":" + shown.img.current, ref: box, style: pan }, ratio ? /* @__PURE__ */ import_react4.default.createElement(import_react4.default.Fragment, null, /* @__PURE__ */ import_react4.default.createElement("div", { className: "fg-cg-back", style: { backgroundImage: `url("${shown.src}")` } }), /* @__PURE__ */ import_react4.default.createElement("img", { className: "fg-cg-pan", src: shown.src, alt: "", draggable: false })) : /* @__PURE__ */ import_react4.default.createElement("div", { className: "fg-cg-img", style: { backgroundImage: `url("${shown.src}")` } }), title && /* @__PURE__ */ import_react4.default.createElement("div", { className: "fg-cg-caption" }, /* @__PURE__ */ import_react4.default.createElement("i", null), /* @__PURE__ */ import_react4.default.createElement("span", null, "CG"), /* @__PURE__ */ import_react4.default.createElement("b", null, title)));
}
function TitleCard({ beat }) {
  if (!beat.sceneEnter || !beat.scene.location) return null;
  return /* @__PURE__ */ import_react4.default.createElement("div", { className: "fg-titlecard", key: beat.key }, /* @__PURE__ */ import_react4.default.createElement("div", { className: "fg-titlecard-line" }), /* @__PURE__ */ import_react4.default.createElement("div", { className: "fg-titlecard-name" }, beat.scene.location), /* @__PURE__ */ import_react4.default.createElement("div", { className: "fg-titlecard-sub" }, [TIME_LABEL[beat.scene.time], WEATHER_LABEL[beat.scene.weather]].filter(Boolean).join(" · "), " — Turn ", beat.turn), /* @__PURE__ */ import_react4.default.createElement("div", { className: "fg-titlecard-line", style: { width: "14cqw", marginTop: "1cqw" } }));
}
var QUAKE = [[0, 0], [0.6, 300], [1.2, 420], [2, 560]];
function quake(el, power) {
  const [amp, ms] = QUAKE[power] || QUAKE[1];
  const path = [0, -1, 0.8, -0.7, 0.5, -0.3, 0.15, 0];
  el.animate(path.map((k, i) => ({ transform: `translate(${(k * amp).toFixed(3)}%, ${((i % 2 ? -0.6 : 0.6) * k * amp).toFixed(3)}%)` })), { duration: ms, easing: "linear" });
}
function useHits(stageRef, flashRef, soundOn) {
  const sound = import_react4.default.useRef(soundOn);
  sound.current = soundOn;
  return import_react4.default.useCallback((f) => {
    if (f.kind === "sound") {
      if (sound.current) stinger(f.sound);
      return;
    }
    if (typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const stage = stageRef.current;
    if (!stage || typeof stage.animate !== "function") return;
    if (f.kind === "shake") quake(stage, f.power);
    else if (f.kind === "box") {
      const box = stage.querySelector(".fg-dialog");
      if (box) quake(box, f.power);
    } else if (f.kind === "flash" || f.kind === "redflash") {
      const el = flashRef.current;
      if (!el) return;
      el.classList.toggle("is-red", f.kind === "redflash");
      el.animate([{ opacity: 0.25 + 0.25 * f.power }, { opacity: 0 }], { duration: 260 + 120 * f.power, easing: "ease-out" });
    }
  }, [stageRef, flashRef]);
}
function useCamera(beat) {
  const [cam, setCam] = import_react4.default.useState("");
  import_react4.default.useEffect(() => {
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
  return /* @__PURE__ */ import_react4.default.createElement("div", { key: beat.key, className: `fg-flash ${cls}` });
}

// src/client/theater/Dialog.jsx
var import_react5 = __toESM(require("react"), 1);
var CARD_HEAD = { sms: "新消息", letter: "", note: "", news: "号外", terminal: "> SYSTEM", notice: "告示", diary: "", scroll: "" };
function useTypewriter(beat, speed, { sound = true, voice = null, hold = false, onFx = null } = {}) {
  const key = beat ? beat.key : "";
  const chars = import_react5.default.useMemo(() => Array.from(beat && beat.text || ""), [key, beat && beat.text]);
  const emo = beat && beat.speaker ? beat.emotions && beat.emotions[beat.speaker] || beat.emo : "";
  const say = beat ? beat.say : "";
  const stress = beat ? beat.stress : "";
  const type = beat ? beat.type : "narration";
  const plan = import_react5.default.useMemo(() => planLine(chars, speed || 0, { say, stress, emo, type, seed: key }), [chars, speed, say, stress, emo, type, key]);
  const [shown, setShown] = import_react5.default.useState({ key, done: false });
  const [start, setStart] = import_react5.default.useState({ key: "", at: NaN });
  if (shown.key !== key) setShown({ key, done: false });
  const done = !speed || !chars.length || shown.key === key && shown.done;
  const fxRef = import_react5.default.useRef(onFx);
  fxRef.current = onFx;
  const voiceRef = import_react5.default.useRef(voice);
  voiceRef.current = voice;
  const pending = import_react5.default.useRef([]);
  const dropPending = () => {
    pending.current.forEach(clearTimeout);
    pending.current = [];
  };
  import_react5.default.useEffect(() => {
    if (!speed || !chars.length || hold) return void 0;
    const t0 = performance.now();
    setStart({ key, at: t0 });
    const { times, blip: delivery, fx } = plan;
    const finish = setTimeout(() => setShown({ key, done: true }), times[times.length - 1] + speed + 220);
    pending.current = fx.map((f) => setTimeout(() => {
      if (fxRef.current) fxRef.current(f);
    }, f.at));
    let next = 0;
    const tick = sound ? setInterval(() => {
      const now = performance.now() - t0;
      for (; next < chars.length && times[next] <= now; next += 1) {
        const sameBurst = next > 0 && times[next] === times[next - 1];
        if (next % delivery.every === 0 && !sameBurst && !SILENT.test(chars[next])) blip(voiceRef.current, delivery);
      }
      if (next >= chars.length) clearInterval(tick);
    }, Math.max(8, Math.min(speed, plan.gap))) : null;
    return () => {
      clearTimeout(finish);
      dropPending();
      if (tick) clearInterval(tick);
    };
  }, [key, chars, plan, speed, sound, hold]);
  import_react5.default.useEffect(() => {
    if (done) dropPending();
  }, [done]);
  return [done, chars, () => setShown({ key, done: true }), start.key === key ? start.at : NaN, plan];
}
function DialogBox({ beat, chars, plan, done, waiting, color, quick, progress, status, hiddenText }) {
  const speaker = beat.alias || beat.speaker;
  const showName = speaker && beat.type !== "narration";
  const speed = quick.speed;
  const times = plan ? plan.times : null;
  const marks = plan ? plan.marks : [];
  return /* @__PURE__ */ import_react5.default.createElement("div", { className: "fg-dialog", style: { "--speaker": color || void 0 } }, /* @__PURE__ */ import_react5.default.createElement("div", { className: "fg-box" }), showName && /* @__PURE__ */ import_react5.default.createElement("div", { className: "fg-name", key: beat.speaker + beat.alias }, /* @__PURE__ */ import_react5.default.createElement("div", { className: "fg-name-plate" }, speaker), beat.emo && quick.emoLabel && /* @__PURE__ */ import_react5.default.createElement("div", { className: "fg-name-sub" }, quick.emoLabel)), hiddenText && /* @__PURE__ */ import_react5.default.createElement("div", { className: "fg-text is-cardhint" }, "〔 ", CARD_LABEL[beat.card] || "卡片", " 〕"), !hiddenText && /* @__PURE__ */ import_react5.default.createElement("div", { className: `fg-text is-${beat.type}${plan && plan.say ? " say-" + plan.say : ""}${done ? " is-done" : waiting ? " is-wait" : ""}`, key: beat.key, "aria-live": "polite" }, chars.map((ch, i) => /* @__PURE__ */ import_react5.default.createElement("span", { key: i, className: marks[i] ? "fg-char is-" + marks[i] : "fg-char", style: { "--d": (times ? times[i] : i * speed) + "ms" } }, ch))), done && /* @__PURE__ */ import_react5.default.createElement("div", { className: "fg-wait", "aria-hidden": "true" }), status && /* @__PURE__ */ import_react5.default.createElement("div", { className: "fg-status" }, status), /* @__PURE__ */ import_react5.default.createElement("div", { className: "fg-progress" }, /* @__PURE__ */ import_react5.default.createElement("i", { style: { width: Math.round(progress * 100) + "%" } })), /* @__PURE__ */ import_react5.default.createElement("div", { className: "fg-quick", onClick: (e) => e.stopPropagation() }, quick.items.map((item) => /* @__PURE__ */ import_react5.default.createElement("button", { key: item.id, type: "button", className: item.on ? "is-on" : "", title: item.title, onClick: () => {
    sfx("select");
    item.run();
  }, onMouseEnter: () => sfx("hover") }, item.label))));
}
function SceneCard({ beat }) {
  const kind = beat.card;
  return /* @__PURE__ */ import_react5.default.createElement("div", { className: "fg-card", "data-card": kind, key: beat.key }, CARD_HEAD[kind] ? /* @__PURE__ */ import_react5.default.createElement("div", { className: "fg-card-head" }, CARD_HEAD[kind], kind === "sms" && beat.speaker ? ` · ${beat.alias || beat.speaker}` : "") : null, /* @__PURE__ */ import_react5.default.createElement("div", { className: "fg-card-body" }, beat.text));
}
function Choices({ choices, onChoose, onBack, waiting }) {
  const [free, setFree] = import_react5.default.useState("");
  const list2 = choices || [];
  return /* @__PURE__ */ import_react5.default.createElement("div", { className: "fg-choices", onClick: (e) => e.stopPropagation() }, /* @__PURE__ */ import_react5.default.createElement("div", { className: "fg-choices-title" }, list2.length ? "CHOICE" : waiting ? "TO BE CONTINUED" : "YOUR TURN"), list2.map((text, i) => /* @__PURE__ */ import_react5.default.createElement("button", { key: text, type: "button", className: "fg-choice", "data-n": String(i + 1).padStart(2, "0"), style: { "--i": i }, onMouseEnter: () => sfx("hover"), onClick: () => {
    sfx("select");
    onChoose(text);
  } }, text)), /* @__PURE__ */ import_react5.default.createElement("form", { className: "fg-free", style: { "--i": list2.length }, onSubmit: (e) => {
    e.preventDefault();
    if (free.trim()) {
      sfx("select");
      onChoose(free.trim());
    }
  } }, /* @__PURE__ */ import_react5.default.createElement("input", { value: free, onChange: (e) => setFree(e.target.value), placeholder: list2.length ? "或者，自己写下一步……" : "写下你的下一步……", onKeyDown: (e) => e.stopPropagation() }), /* @__PURE__ */ import_react5.default.createElement("button", { type: "submit" }, "GO")), /* @__PURE__ */ import_react5.default.createElement("button", { type: "button", className: "fg-btn", style: { marginTop: "1cqw" }, onClick: onBack }, "回到聊天"));
}

// src/client/theater/Panels.jsx
var import_react9 = __toESM(require("react"), 1);

// src/client/theater/AaWorkbench.jsx
var import_react7 = __toESM(require("react"), 1);

// src/client/theater/AaPreview.jsx
var import_react6 = __toESM(require("react"), 1);
function useDemoTalk(on) {
  const [talk, setTalk] = import_react6.default.useState(null);
  import_react6.default.useEffect(() => {
    if (!on) {
      setTalk(null);
      return void 0;
    }
    const chars = Array.from("你终于来了，我等了你好久。");
    const plan = planLine(chars, 40, {});
    let timer = null;
    const say = () => {
      setTalk({ key: "demo" + Date.now(), type: "dialogue", chars, times: plan.times, gap: plan.gap, mouth: plan.mouth, speed: 40, startedAt: performance.now(), done: false });
      timer = setTimeout(say, plan.times[plan.times.length - 1] + 1600);
    };
    say();
    return () => clearTimeout(timer);
  }, [on]);
  return talk;
}
function closeUpBox(rects, size) {
  if (!rects || !rects.eyes || !rects.eyes.length || !rects.mouth || !rects.mouth.length) return null;
  const [x0, y0, x1, y1] = rectsBox([...rects.eyes, ...rects.mouth]);
  const side = Math.min(size.w, size.h, Math.max(x1 - x0, y1 - y0) * 2.4);
  return { x: Math.max(0, Math.min(size.w - side, (x0 + x1) / 2 - side / 2)), y: Math.max(0, Math.min(size.h - side, (y0 + y1) / 2 - side / 2)), side };
}
function PlayView({ aa, talk, label, still, size, rects, close, className = "" }) {
  const fallback = /* @__PURE__ */ import_react6.default.createElement("img", { src: still, alt: "" });
  const box = close ? closeUpBox(rects, size) : null;
  if (!box) return /* @__PURE__ */ import_react6.default.createElement("div", { className: `fg-aa-play ${className}` }, /* @__PURE__ */ import_react6.default.createElement(AaSprite, { aa, talk, label, fallback }));
  return /* @__PURE__ */ import_react6.default.createElement("div", { className: `fg-aa-play is-close ${className}` }, /* @__PURE__ */ import_react6.default.createElement("div", { style: { position: "absolute", width: `${size.w / box.side * 100}%`, left: `${-box.x / box.side * 100}%`, top: `${-box.y / box.side * 100}%` } }, /* @__PURE__ */ import_react6.default.createElement(AaSprite, { aa, talk, label, fallback })));
}
var packSize = (record) => {
  const s = record && record.aa && record.aa.pack && record.aa.pack.size;
  return s ? { w: s[0], h: s[1] } : { w: 832, h: 1216 };
};
function SpriteArt({ record, label, onOpen }) {
  const talk = useDemoTalk(Boolean(record && record.aa));
  if (!record || !record.assetId) return null;
  const still = assetUrl(record.assetId);
  return /* @__PURE__ */ import_react6.default.createElement("button", { type: "button", className: "fg-sprite-art", title: "点一下放大看", onClick: onOpen }, record.aa ? /* @__PURE__ */ import_react6.default.createElement(AaSprite, { aa: record.aa, talk, label, fallback: /* @__PURE__ */ import_react6.default.createElement("img", { src: still, alt: label }), className: "fg-aa" }) : /* @__PURE__ */ import_react6.default.createElement("img", { src: still, alt: label }), record.aa && /* @__PURE__ */ import_react6.default.createElement("i", null, "动"), /* @__PURE__ */ import_react6.default.createElement("span", null, "🔍"));
}
function SpriteViewer({ record, label, onClose, children }) {
  const animated = Boolean(record && record.aa);
  const rects = animated ? record.aa.rects : null;
  const [close, setClose] = import_react6.default.useState(false);
  const [talking, setTalking] = import_react6.default.useState(true);
  const talk = useDemoTalk(animated && talking);
  import_react6.default.useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose]);
  if (!record || !record.assetId) return null;
  const still = assetUrl(record.assetId);
  return /* @__PURE__ */ import_react6.default.createElement("div", { className: "fg-lightbox fg-sprite-viewer", onClick: onClose }, /* @__PURE__ */ import_react6.default.createElement("div", { className: "fg-viewer-stage", onClick: (e) => e.stopPropagation() }, animated ? /* @__PURE__ */ import_react6.default.createElement(PlayView, { aa: record.aa, talk, label, still, size: packSize(record), rects, close, className: "is-big" }) : /* @__PURE__ */ import_react6.default.createElement("img", { src: still, alt: label })), /* @__PURE__ */ import_react6.default.createElement("div", { className: "fg-row", onClick: (e) => e.stopPropagation() }, /* @__PURE__ */ import_react6.default.createElement("span", { className: "fg-pill" }, label, animated ? " · 逆转式动态" : ""), animated && closeUpBox(rects, packSize(record)) && /* @__PURE__ */ import_react6.default.createElement("button", { type: "button", className: "fg-btn", onClick: () => setClose(!close) }, close ? "看全身" : "看脸部特写"), animated && /* @__PURE__ */ import_react6.default.createElement("button", { type: "button", className: "fg-btn", onClick: () => setTalking(!talking) }, talking ? "别说话（只眨眼）" : "说一句"), children, /* @__PURE__ */ import_react6.default.createElement("button", { type: "button", className: "fg-btn", onClick: onClose }, "关闭")));
}

// lib/detect.js
function fitSize(w, h, max = 640, align = 32, min = 0) {
  let r = Math.min(1, max / Math.max(w, h));
  if (min && Math.max(w, h) * r < min) r = min / Math.max(w, h);
  return { w: Math.max(align, Math.ceil(w * r / align) * align), h: Math.max(align, Math.ceil(h * r / align) * align) };
}
function imageTensor(img, box, size) {
  const [x0, y0, x1, y1] = box;
  const { w, h } = size;
  const out = new Float32Array(3 * w * h);
  const sx = (x1 - x0) / w, sy = (y1 - y0) / h;
  const plane = w * h;
  const px = (x, y, c) => {
    if (x < 0 || y < 0 || x >= img.width || y >= img.height) return 1;
    const i = (y * img.width + x) * 4;
    const a = img.data[i + 3] / 255;
    return img.data[i + c] / 255 * a + (1 - a);
  };
  for (let j = 0; j < h; j++) {
    const fy = y0 + (j + 0.5) * sy - 0.5;
    const yA = Math.floor(fy), ty = fy - yA;
    for (let i = 0; i < w; i++) {
      const fx = x0 + (i + 0.5) * sx - 0.5;
      const xA = Math.floor(fx), tx = fx - xA;
      for (let c = 0; c < 3; c++) {
        const top = px(xA, yA, c) * (1 - tx) + px(xA + 1, yA, c) * tx;
        const bottom = px(xA, yA + 1, c) * (1 - tx) + px(xA + 1, yA + 1, c) * tx;
        out[c * plane + j * w + i] = top * (1 - ty) + bottom * ty;
      }
    }
  }
  return out;
}
function iou(a, b) {
  const w = Math.min(a[2], b[2]) - Math.max(a[0], b[0]);
  const h = Math.min(a[3], b[3]) - Math.max(a[1], b[1]);
  if (w <= 0 || h <= 0) return 0;
  const inter = w * h;
  return inter / ((a[2] - a[0]) * (a[3] - a[1]) + (b[2] - b[0]) * (b[3] - b[1]) - inter);
}
function nms(list2, limit = 0.7) {
  const kept = [];
  for (const d of [...list2].sort((a, b) => b.score - a.score)) if (kept.every((k) => iou(k.box, d.box) <= limit)) kept.push(d);
  return kept;
}
function parseYolo(data, dims, { threshold = 0.25, box, size, iouLimit = 0.7 }) {
  const n = dims[2], classes = dims[1] - 4;
  const kx = (box[2] - box[0]) / size.w, ky = (box[3] - box[1]) / size.h;
  const list2 = [];
  for (let i = 0; i < n; i++) {
    let score = 0;
    for (let c = 0; c < classes; c++) score = Math.max(score, data[(4 + c) * n + i]);
    if (score < threshold) continue;
    const cx = data[i], cy = data[n + i], w = data[2 * n + i], h = data[3 * n + i];
    list2.push({ score, box: [box[0] + (cx - w / 2) * kx, box[1] + (cy - h / 2) * ky, box[0] + (cx + w / 2) * kx, box[1] + (cy + h / 2) * ky] });
  }
  return nms(list2, iouLimit);
}
var center = (b) => [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2];
var area = (b) => Math.max(0, b[2] - b[0]) * Math.max(0, b[3] - b[1]);
var grow = (b, kx, ky = kx) => {
  const [cx, cy] = center(b), w = (b[2] - b[0]) * kx, h = (b[3] - b[1]) * ky;
  return [cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2];
};
var clampBox = (b, w, h) => [Math.max(0, b[0]), Math.max(0, b[1]), Math.min(w, b[2]), Math.min(h, b[3])];
var at = ([cx, cy], w, h) => [cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2];
function mainFace(faces, width, height) {
  let best = null, bestScore = -1;
  for (const f of faces) {
    const [cx, cy] = center(f.box);
    const s = f.score * Math.sqrt(area(f.box) / (width * height)) * (1 - Math.abs(cx / width - 0.5)) * (1 - 0.5 * cy / height);
    if (s > bestScore) {
      best = f;
      bestScore = s;
    }
  }
  return best;
}
function pickEyes(eyes, face) {
  const fw = face[2] - face[0], fh = face[3] - face[1];
  const inside = eyes.filter((e) => {
    const [cx, cy] = center(e.box);
    return cx > face[0] - fw * 0.1 && cx < face[2] + fw * 0.1 && cy > face[1] - fh * 0.05 && cy < face[1] + fh * 0.8;
  });
  let pair = null, best = -1;
  for (let i = 0; i < inside.length; i++) {
    for (let j = i + 1; j < inside.length; j++) {
      const [a, b] = [inside[i], inside[j]];
      const [ax, ay] = center(a.box), [bx, by] = center(b.box);
      const dx = Math.abs(ax - bx), dy = Math.abs(ay - by);
      if (dx < fw * 0.2 || dy > dx * 0.6) continue;
      const s = a.score + b.score;
      if (s > best) {
        best = s;
        pair = ax < bx ? [a, b] : [b, a];
      }
    }
  }
  if (pair) return pair;
  return inside.length ? [inside.sort((a, b) => b.score - a.score)[0]] : [];
}
function eyesFromFace(face, known = null) {
  const fw = face[2] - face[0], fh = face[3] - face[1];
  const size = [fw * 0.26, fh * 0.2];
  if (known) {
    const [kx, ky] = center(known);
    const mirror = face[0] + face[2] - kx;
    const other = Math.abs(mirror - kx) < fw * 0.25 ? kx + (kx < (face[0] + face[2]) / 2 ? 1 : -1) * fw * 0.4 : mirror;
    const kw = known[2] - known[0], kh = known[3] - known[1];
    return [known, at([other, ky], kw, kh)].sort((a, b) => a[0] - b[0]);
  }
  return [at([face[0] + fw * 0.3, face[1] + fh * 0.45], ...size), at([face[0] + fw * 0.7, face[1] + fh * 0.45], ...size)];
}
function faceFromHead(head) {
  const hw = head[2] - head[0], hh = head[3] - head[1];
  return [head[0] + hw * 0.18, head[1] + hh * 0.32, head[2] - hw * 0.18, head[3] - hh * 0.02];
}
function mouthGuess(eyes) {
  const [a, b] = eyes.map(center);
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const d = Math.hypot(dx, dy);
  const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  let nx = -dy / d, ny = dx / d;
  if (ny < 0) {
    nx = -nx;
    ny = -ny;
  }
  return { center: [mid[0] + nx * d * 0.7, mid[1] + ny * d * 0.7], d, angle: Math.atan2(dy, dx) };
}
function findMouth(img, guess, chin = Infinity) {
  const { d } = guess;
  const [gx, gy] = guess.center;
  const win = clampBox([gx - d * 0.55, gy - d * 0.3, gx + d * 0.55, Math.min(gy + d * 0.62, chin - d * 0.05)].map(Math.round), img.width, img.height);
  const W = win[2] - win[0], H = win[3] - win[1];
  if (W < 6 || H < 6) return null;
  const pix = (x, y) => {
    const i = (y * img.width + x) * 4;
    const a = img.data[i + 3] / 255;
    const r = img.data[i] * a + 255 * (1 - a), g = img.data[i + 1] * a + 255 * (1 - a), b = img.data[i + 2] * a + 255 * (1 - a);
    return [0.299 * r + 0.587 * g + 0.114 * b, r - (g + b) / 2, a];
  };
  const skinL = [], skinR = [];
  for (let y = Math.round(gy - d * 0.42); y < Math.round(gy - d * 0.22); y++) {
    for (let x = Math.round(gx - d * 0.25); x < Math.round(gx + d * 0.25); x++) {
      if (x < 0 || y < 0 || x >= img.width || y >= img.height) continue;
      const [L, R, A] = pix(x, y);
      if (A > 0.9) {
        skinL.push(L);
        skinR.push(R);
      }
    }
  }
  if (skinL.length < 10) return null;
  const median2 = (v) => v.sort((p2, q) => p2 - q)[v.length >> 1];
  const sL = median2(skinL), sR = median2(skinR);
  const score = new Float32Array(W * H);
  let max = 0;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const [L, R, A] = pix(win[0] + x, win[1] + y);
      const s = A < 0.5 ? 0 : Math.max(0, sL - L - 18) + Math.max(0, R - sR - 12) * 1.5;
      score[y * W + x] = s;
      if (s > max && Math.abs(win[0] + x - gx) < d * 0.25) max = s;
    }
  }
  if (max < 25) return null;
  const on = score.map((s) => s >= max * 0.3 ? 1 : 0);
  const seen = new Uint8Array(W * H);
  const blobs = [];
  for (let start = 0; start < W * H; start++) {
    if (!on[start] || seen[start]) continue;
    const stack = [start];
    seen[start] = 1;
    let x0 = W, y0 = H, x1 = 0, y1 = 0, mass = 0, n = 0, sx = 0, sy = 0;
    while (stack.length) {
      const k = stack.pop();
      const x = k % W, y = (k - x) / W;
      x0 = Math.min(x0, x);
      x1 = Math.max(x1, x);
      y0 = Math.min(y0, y);
      y1 = Math.max(y1, y);
      mass += score[k];
      n++;
      sx += x;
      sy += y;
      for (const nb of [k - 1, k + 1, k - W, k + W]) {
        if (nb < 0 || nb >= W * H || seen[nb] || !on[nb]) continue;
        if (nb === k - 1 && x === 0 || nb === k + 1 && x === W - 1) continue;
        seen[nb] = 1;
        stack.push(nb);
      }
    }
    if (n < 4) continue;
    const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
    if (x0 === 0 || y0 === 0 || x1 === W - 1 || y1 === H - 1) continue;
    if (bw > d * 0.95 || bh > d * 0.7 || bh > bw * 1.6) continue;
    const ox = (win[0] + sx / n - gx) / d, oy = (win[1] + sy / n - gy) / d;
    if (Math.abs(ox) > 0.4) continue;
    const value = mass * Math.min(2.5, bw / bh) * Math.exp(-((ox / 0.18) ** 2) / 2) * Math.exp(-(((oy - 0.12) / 0.24) ** 2) / 2);
    blobs.push({ box: [win[0] + x0, win[1] + y0, win[0] + x1 + 1, win[1] + y1 + 1], value });
  }
  if (!blobs.length) return null;
  blobs.sort((a, b) => b.value - a.value);
  let box = blobs[0].box;
  for (const b of blobs.slice(1)) {
    const near = b.box[0] < box[2] + d * 0.15 && b.box[2] > box[0] - d * 0.15 && b.box[1] < box[3] + d * 0.12 && b.box[3] > box[1] - d * 0.12;
    const merged = [Math.min(box[0], b.box[0]), Math.min(box[1], b.box[1]), Math.max(box[2], b.box[2]), Math.max(box[3], b.box[3])];
    if (near && b.value > blobs[0].value * 0.05 && merged[2] - merged[0] <= d * 0.95 && merged[3] - merged[1] <= d * 0.7) box = merged;
  }
  return box;
}
function framesFrom({ eyes, mouth, d }, width, height) {
  const eyeBoxes = eyes.map((e) => {
    const [cx, cy] = center(e);
    const w = Math.max((e[2] - e[0]) * 1.25, d * 0.55), h = Math.max((e[3] - e[1]) * 1.3, d * 0.42);
    return clampBox(at([cx, cy], w, h), width, height);
  });
  const [mx, my] = center(mouth);
  const fh = mouth[3] - mouth[1];
  const mw = Math.max(mouth[2] - mouth[0] + d * 0.15, d * 0.45), mh = Math.max(fh + d * 0.14, d * 0.28);
  let mouthBox = at([mx, my + (mh - fh) * 0.2], mw, mh);
  const eyeBottom = Math.max(...eyeBoxes.map((e) => e[3]));
  if (mouthBox[1] < eyeBottom + 2) mouthBox = [mouthBox[0], eyeBottom + 2, mouthBox[2], Math.max(eyeBottom + 10, mouthBox[3])];
  return { eyes: eyeBoxes, mouth: [clampBox(mouthBox, width, height)] };
}
var squareAround = (b, k) => at(center(b), Math.max(b[2] - b[0], b[3] - b[1]) * k, Math.max(b[2] - b[0], b[3] - b[1]) * k);
function readGrounding(list2, view) {
  const vw = view[2] - view[0], vh = view[3] - view[1];
  const whole = (b) => b[2] - b[0] > vw * 0.97 && b[3] - b[1] > vh * 0.97;
  const small = (b) => area(b) < vw * vh * 0.5;
  const of = (re) => list2.filter((g) => re.test(g.label) && !whole(g.box)).map((g) => g.box);
  const faces = of(/face|head/i);
  const eyeBoxes = of(/eye/i).filter(small);
  const singles = eyeBoxes.filter((b) => !eyeBoxes.some((o) => o !== b && o[0] >= b[0] - 2 && o[2] <= b[2] + 2 && o[1] >= b[1] - 2 && o[3] <= b[3] + 2));
  let eyes = [];
  if (singles.length >= 2) {
    const [a, b] = [...singles].sort((p2, q) => area(q) - area(p2));
    eyes = iou(a, b) > 0.3 ? [a] : [a, b].sort((p2, q) => p2[0] - q[0]);
  } else if (singles.length === 1) eyes = [singles[0]];
  if (eyes.length === 1 && eyes[0][2] - eyes[0][0] > (eyes[0][3] - eyes[0][1]) * 2.2) {
    const [x0, y0, x1, y1] = eyes[0];
    const cx = (x0 + x1) / 2, gap = (x1 - x0) * 0.06;
    eyes = [[x0, y0, cx - gap, y1], [cx + gap, y0, x1, y1]];
  }
  return { face: faces.sort((p2, q) => area(q) - area(p2))[0] || null, eyes, mouths: of(/mouth|lip/i).filter(small) };
}
function plausibleMouth(m, eyes) {
  const [a, b] = eyes.map(center);
  const d = Math.hypot(b[0] - a[0], b[1] - a[1]);
  if (!(d > 0)) return false;
  const tx = (b[0] - a[0]) / d, ty = (b[1] - a[1]) / d;
  let nx = -ty, ny = tx;
  if (ny < 0) {
    nx = -nx;
    ny = -ny;
  }
  const [mx, my] = center(m);
  const vx = mx - (a[0] + b[0]) / 2, vy = my - (a[1] + b[1]) / 2;
  const down = vx * nx + vy * ny, side = vx * tx + vy * ty;
  return down >= d * 0.3 && down <= d * 1.6 && Math.abs(side) <= d * 0.55 && m[2] - m[0] <= d * 2 && m[3] - m[1] <= d * 1.4;
}
async function autoFrame(img, run, { ground = null, fine = false } = {}) {
  const notes = [];
  const W = img.width, H = img.height;
  const whole = [0, 0, W, H];
  const pct = (s) => Math.round(s * 100) + "%";
  let face = null, faceScore = 0, view = null, big = false;
  const f = mainFace(await run("face", whole, fitSize(W, H)), W, H);
  if (f && f.score >= 0.5) {
    face = f.box;
    faceScore = f.score;
    notes.push(`认到脸（把握 ${pct(f.score)}）`);
  } else {
    const h = mainFace(await run("head", whole, fitSize(W, H)), W, H);
    if (ground) {
      const look = h ? squareAround(h.box, 1.4) : [W * 0.2, 0, W * 0.8, W * 0.6];
      const g2 = readGrounding(await ground(look, "face"), look);
      big = true;
      if (g2.face) {
        face = g2.face;
        faceScore = 0.6;
        view = squareAround(g2.face, 1.1);
        notes.push("大模型找到了脸");
      }
    }
    if (!face && h) {
      face = faceFromHead(h.box);
      faceScore = h.score * 0.7;
      notes.push(`没认准脸，按头的位置估（把握 ${pct(h.score)}）`);
    }
    if (!face && f) {
      face = f.box;
      faceScore = f.score;
      notes.push(`认到脸，但把握不大（${pct(f.score)}）`);
    }
    if (!face) return null;
  }
  const around = clampBox(grow(face, 1.6, 1.5), W, H);
  const crop = fitSize(around[2] - around[0], around[3] - around[1], 640, 32, 384);
  const eyes = pickEyes(await run("eye", around, crop), face);
  let g = null;
  if (ground && (fine || faceScore < 0.5 || eyes.length < 2 || view)) {
    const v = view || squareAround(face, 1.5);
    g = readGrounding(await ground(v, "eyes and mouth"), v);
    big = true;
  }
  let eyeBoxes;
  let confidence = faceScore >= 0.5 ? "high" : "mid";
  if (eyes.length === 2) {
    eyeBoxes = eyes.map((e) => e.box);
    notes.push("认到两只眼睛");
  } else if (g && g.eyes.length === 2) {
    eyeBoxes = g.eyes;
    notes.push("大模型认到两只眼睛");
  } else if (eyes.length === 1 || g && g.eyes.length === 1) {
    eyeBoxes = eyesFromFace(face, eyes.length === 1 ? eyes[0].box : g.eyes[0]);
    confidence = "mid";
    notes.push("只认到一只眼睛，另一只按脸对称估");
  } else {
    eyeBoxes = eyesFromFace(face);
    confidence = "low";
    notes.push("没认出眼睛，按脸的比例估");
  }
  const guess = mouthGuess(eyeBoxes);
  const bigMouth = g ? g.mouths.find((m) => plausibleMouth(m, eyeBoxes)) : null;
  const found = findMouth(img, guess, face[3]);
  let mouth;
  if (bigMouth) {
    mouth = bigMouth;
    const fc = found && center(found);
    const line = found && found[3] - found[1] < guess.d * 0.12 && found[2] - found[0] > (found[3] - found[1]) * 2;
    if (line && fc[0] > bigMouth[0] && fc[0] < bigMouth[2] && fc[1] > bigMouth[1] && fc[1] < bigMouth[3]) mouth = [bigMouth[0], Math.max(bigMouth[1], found[1] - guess.d * 0.1), bigMouth[2], bigMouth[3]];
    notes.push("大模型找到了嘴");
  } else if (found) {
    mouth = found;
    notes.push("嘴在图上找到了");
  } else {
    mouth = at([guess.center[0], guess.center[1] + guess.d * 0.1], guess.d * 0.4, guess.d * 0.3);
    if (confidence === "high") confidence = "mid";
    notes.push("嘴没找到明显的线条，按眼睛的位置估");
  }
  return { rects: framesFrom({ eyes: eyeBoxes, mouth, d: guess.d }, W, H), confidence, notes, face, big };
}
function grayOf(img, step2 = 1) {
  const w = Math.floor(img.width / step2), h = Math.floor(img.height / step2);
  const data = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sum = 0;
      for (let j = 0; j < step2; j++) {
        for (let i = 0; i < step2; i++) {
          const k = ((y * step2 + j) * img.width + x * step2 + i) * 4;
          const a = img.data[k + 3] / 255;
          sum += (0.299 * img.data[k] + 0.587 * img.data[k + 1] + 0.114 * img.data[k + 2]) * a + 255 * (1 - a);
        }
      }
      data[y * w + x] = sum / (step2 * step2);
    }
  }
  return { width: w, height: h, data };
}
function sample(g, x, y, w, h, scale) {
  const out = new Float32Array(w * h);
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const fx = Math.min(g.width - 1.001, Math.max(0, x + i * scale)), fy = Math.min(g.height - 1.001, Math.max(0, y + j * scale));
      const x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0;
      const a = g.data[y0 * g.width + x0], b = g.data[y0 * g.width + x0 + 1], c = g.data[(y0 + 1) * g.width + x0], d = g.data[(y0 + 1) * g.width + x0 + 1];
      out[j * w + i] = (a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty;
    }
  }
  return out;
}
function ncc(t, tw, th, norm, g, x, y) {
  let sum = 0, sq = 0, dot = 0;
  for (let j = 0; j < th; j++) {
    const row = (y + j) * g.width + x;
    for (let i = 0; i < tw; i++) {
      const v = g.data[row + i];
      sum += v;
      sq += v * v;
      dot += v * t[j * tw + i];
    }
  }
  const n = tw * th;
  const varP = sq - sum * sum / n;
  return varP <= 1e-6 || norm <= 1e-6 ? 0 : dot / (norm * Math.sqrt(varP));
}
function zeroMean(t) {
  let mean = 0;
  for (const v of t) mean += v;
  mean /= t.length;
  let norm = 0;
  for (let k = 0; k < t.length; k++) {
    t[k] -= mean;
    norm += t[k] * t[k];
  }
  return Math.sqrt(norm);
}
function followFrame(ref, refRects, img) {
  const boxes = [...refRects.eyes, ...refRects.mouth];
  const inner = [Math.min(...boxes.map((b) => b[0])), Math.min(...boxes.map((b) => b[1])), Math.max(...boxes.map((b) => b[2])), Math.max(...boxes.map((b) => b[3]))];
  const T = clampBox(grow(inner, 1.7, 1.9).map(Math.round), ref.width, ref.height);
  const Tw = T[2] - T[0], Th = T[3] - T[1];
  const step2 = Math.max(1, Math.round(Tw / 48));
  const gRef = grayOf(ref, step2), gImg = grayOf(img, step2);
  const ox = Math.round(T[0] / step2), oy = Math.round(T[1] / step2);
  const tw = Math.max(4, Math.floor(Tw / step2)), th = Math.max(4, Math.floor(Th / step2));
  const rx = Math.round(img.width * 0.2 / step2), ry = Math.round(img.height * 0.12 / step2);
  let best = null;
  for (const scale of [0.9, 1, 1.1]) {
    const sw = Math.max(4, Math.round(tw * scale)), sh = Math.max(4, Math.round(th * scale));
    const t = sample(gRef, ox, oy, sw, sh, 1 / scale);
    const norm = zeroMean(t);
    const cx = ox + (tw - sw) / 2, cy = oy + (th - sh) / 2;
    for (let dy = -ry; dy <= ry; dy++) {
      for (let dx = -rx; dx <= rx; dx++) {
        const x = Math.round(cx + dx), y = Math.round(cy + dy);
        if (x < 0 || y < 0 || x + sw > gImg.width || y + sh > gImg.height) continue;
        const s = ncc(t, sw, sh, norm, gImg, x, y);
        if (!best || s > best.score) best = { score: s, x, y, scale };
      }
    }
  }
  if (!best) return { rects: refRects, score: 0 };
  let origin = [ox * step2, oy * step2], at2 = [best.x * step2, best.y * step2], score = best.score;
  if (step2 > 1) {
    const k = Math.max(1, Math.round(Tw / 96));
    const fx = Math.round(T[0] / k), fy = Math.round(T[1] / k);
    const fw = Math.max(4, Math.floor(Tw * best.scale / k)), fh = Math.max(4, Math.floor(Th * best.scale / k));
    const t = sample(grayOf(ref, k), fx, fy, fw, fh, 1 / best.scale);
    const norm = zeroMean(t);
    const target = grayOf(img, k);
    const gx = (best.x * step2 + (fx * k - origin[0]) * best.scale) / k, gy = (best.y * step2 + (fy * k - origin[1]) * best.scale) / k;
    const r = Math.ceil(step2 / k) + 1;
    let top = null;
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const x = Math.round(gx + dx), y = Math.round(gy + dy);
        if (x < 0 || y < 0 || x + fw > target.width || y + fh > target.height) continue;
        const s = ncc(t, fw, fh, norm, target, x, y);
        if (!top || s > top.score) top = { score: s, x, y };
      }
    }
    if (top) {
      origin = [fx * k, fy * k];
      at2 = [top.x * k, top.y * k];
      score = top.score;
    }
  }
  const map = (b) => clampBox([at2[0] + (b[0] - origin[0]) * best.scale, at2[1] + (b[1] - origin[1]) * best.scale, at2[0] + (b[2] - origin[0]) * best.scale, at2[1] + (b[3] - origin[1]) * best.scale], img.width, img.height);
  return { rects: { eyes: refRects.eyes.map(map), mouth: refRects.mouth.map(map) }, score: Math.max(0, Math.min(1, score)) };
}

// src/client/theater/vision.js
var FILES = () => visionFiles();
var loader = () => visionLoader();
var visionApi = {
  status: () => call("/vision"),
  download: (pack) => call("/vision", { action: "download", pack }),
  cancel: () => call("/vision", { action: "cancel" }),
  remove: (pack) => call("/vision", { action: "remove", pack })
};
var ortLoad = null;
var florenceLoad = null;
var sessions = {};
function loadOrt(status) {
  if (!ortLoad) {
    const L = loader();
    ortLoad = (async () => {
      const ort = await /* 运行时才知道地址，打包时不碰它 */
      (L ? import(await L.moduleUrl(status.paths.ort)) : import(FILES() + status.paths.ort));
      ort.env.wasm.wasmPaths = L ? await L.wasmPaths(status.paths.ortDir) : FILES() + status.paths.ortDir;
      ort.env.wasm.numThreads = 1;
      return ort;
    })();
    ortLoad.catch(() => {
      ortLoad = null;
    });
  }
  return ortLoad;
}
async function session(status, model) {
  if (!sessions[model]) {
    const L = loader();
    sessions[model] = loadOrt(status).then(async (ort) => ort.InferenceSession.create(L ? new Uint8Array(await L.bytes(status.models[model].path)) : FILES() + status.models[model].path, { executionProviders: ["wasm"] }));
    sessions[model].catch(() => {
      delete sessions[model];
    });
  }
  return sessions[model];
}
function loadFlorence(status) {
  if (!florenceLoad) {
    const L = loader();
    florenceLoad = (async () => {
      const tjs = await (L ? import(await L.moduleUrl(status.paths.tjs)) : import(FILES() + status.paths.tjs));
      let revision = "main";
      if (L) {
        revision = (await L.florence(tjs)).revision;
        tjs.env.backends.onnx.wasm.wasmPaths = await L.wasmPaths(status.paths.tjsDir, true);
      } else {
        tjs.env.allowRemoteModels = false;
        tjs.env.allowLocalModels = true;
        tjs.env.localModelPath = FILES();
        tjs.env.useBrowserCache = false;
        tjs.env.backends.onnx.wasm.wasmPaths = FILES() + status.paths.tjsDir;
      }
      tjs.env.backends.onnx.wasm.numThreads = 1;
      const id = status.paths.florence;
      const [model, processor, tokenizer] = await Promise.all([
        tjs.Florence2ForConditionalGeneration.from_pretrained(id, { dtype: "q8", device: "wasm", revision }),
        tjs.AutoProcessor.from_pretrained(id, { revision }),
        tjs.AutoTokenizer.from_pretrained(id, { revision })
      ]);
      return { tjs, model, processor, tokenizer };
    })();
    florenceLoad.catch(() => {
      florenceLoad = null;
    });
  }
  return florenceLoad;
}
var loadImage2 = (src) => new Promise((resolve, reject) => {
  const img = new Image();
  img.onload = () => resolve(img);
  img.onerror = () => reject(new Error("图片读不出来"));
  img.src = src;
});
async function pixelsOf(src) {
  const img = await loadImage2(src);
  const c = document.createElement("canvas");
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const g = c.getContext("2d", { willReadFrequently: true });
  g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 0, c.width, c.height);
  return { width: d.width, height: d.height, data: d.data, image: img };
}
function runner(status, img) {
  return async (model, box, size) => {
    const [ort, s] = await Promise.all([loadOrt(status), session(status, model)]);
    const tensor = new ort.Tensor("float32", imageTensor(img, box, size), [1, 3, size.h, size.w]);
    const out = (await s.run({ images: tensor })).output0;
    return parseYolo(out.data, out.dims, { threshold: status.models[model].threshold, box, size });
  };
}
function grounder(status, img) {
  return async (view, phrase) => {
    const { tjs, model, processor, tokenizer } = await loadFlorence(status);
    const S = 768;
    const c = document.createElement("canvas");
    c.width = c.height = S;
    const g = c.getContext("2d");
    g.fillStyle = "#fff";
    g.fillRect(0, 0, S, S);
    const [x0, y0, x1, y1] = view;
    g.drawImage(img.image, x0, y0, x1 - x0, y1 - y0, 0, 0, S, S);
    const task = "<CAPTION_TO_PHRASE_GROUNDING>";
    const textInputs = tokenizer(processor.construct_prompts(task + phrase));
    const visionInputs = await processor(tjs.RawImage.fromCanvas(c).rgb());
    const ids = await model.generate({ ...textInputs, ...visionInputs, max_new_tokens: 80 });
    const text = tokenizer.batch_decode(ids, { skip_special_tokens: false })[0];
    const out = processor.post_process_generation(text, task, [S, S])[task] || { bboxes: [], labels: [] };
    const kx = (x1 - x0) / S, ky = (y1 - y0) / S;
    return (out.bboxes || []).map((b, i) => ({ label: String(out.labels[i] || ""), box: [x0 + b[0] * kx, y0 + b[1] * ky, x0 + b[2] * kx, y0 + b[3] * ky] }));
  };
}
async function frameSprite(status, src, { big = true, fine = false } = {}) {
  const img = await pixelsOf(src);
  const ground = big && status.packs.fine && status.packs.fine.ready ? grounder(status, img) : null;
  if (!ground) return autoFrame(img, runner(status, img));
  try {
    return await autoFrame(img, runner(status, img), { ground, fine });
  } catch (error) {
    const r = await autoFrame(img, runner(status, img));
    if (r) r.notes.push("大模型没跑起来（" + String(error && error.message || error).slice(0, 80) + "），这次只用了小模型");
    return r;
  }
}
var releaseTimer = null;
function holdVision() {
  clearTimeout(releaseTimer);
}
function releaseVisionLater(ms = 12e4) {
  clearTimeout(releaseTimer);
  releaseTimer = setTimeout(() => {
    const fl = florenceLoad;
    florenceLoad = null;
    if (fl) fl.then((f) => f.model.dispose && f.model.dispose(), () => {
    });
    for (const key of Object.keys(sessions)) {
      const s = sessions[key];
      delete sessions[key];
      s.then((x) => x.release && x.release(), () => {
      });
    }
  }, ms);
}
async function followSprite(refSrc, refRects, src) {
  const [ref, img] = await Promise.all([pixelsOf(refSrc), pixelsOf(src)]);
  return followFrame(ref, refRects, img);
}

// lib/aa-patch.js
var WHITE = [0.95047, 1, 1.08883];
var lin = (c) => {
  c /= 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};
var unlin = (c) => 255 * (c <= 31308e-7 ? c * 12.92 : 1.055 * Math.max(0, c) ** (1 / 2.4) - 0.055);
var LIN = Array.from({ length: 256 }, (_, i) => lin(i));
var fLab = (t) => t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116;
var fInv = (f) => f ** 3 > 216 / 24389 ? f ** 3 : (116 * f - 16) / (24389 / 27);
function rgbToLab(r, g, b) {
  const R = LIN[r | 0], G = LIN[g | 0], B = LIN[b | 0];
  const x = fLab((0.4124564 * R + 0.3575761 * G + 0.1804375 * B) / WHITE[0]);
  const y = fLab(0.2126729 * R + 0.7151522 * G + 0.072175 * B);
  const z = fLab((0.0193339 * R + 0.119192 * G + 0.9503041 * B) / WHITE[2]);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}
function labToRgb(L, a, b) {
  const fy = (L + 16) / 116;
  const X = fInv(fy + a / 500) * WHITE[0], Y = fInv(fy), Z = fInv(fy - b / 200) * WHITE[2];
  const out = [3.2404542 * X - 1.5371385 * Y - 0.4985314 * Z, -0.969266 * X + 1.8760108 * Y + 0.041556 * Z, 0.0556434 * X - 0.2040259 * Y + 1.0572252 * Z];
  return out.map((c) => Math.max(0, Math.min(255, Math.round(unlin(c)))));
}
function classWeights(L, a, b) {
  const iris = Math.min(1, Math.max(0, (Math.hypot(a, b) - 6) / 8)) * Math.min(1, Math.max(0, (-b - 4) / 8));
  const line = Math.min(1, Math.max(0, (55 - L) / 15)) * (1 - iris);
  return [iris, line, Math.max(0, 1 - iris - line)];
}
function rankFilter(src, w, h, size, pick) {
  const r = size >> 1;
  const tmp = new Float32Array(w * h), out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let v = src[y * w + x];
      for (let k = Math.max(0, x - r); k <= Math.min(w - 1, x + r); k++) v = pick(v, src[y * w + k]);
      tmp[y * w + x] = v;
    }
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let v = tmp[y * w + x];
      for (let k = Math.max(0, y - r); k <= Math.min(h - 1, y + r); k++) v = pick(v, tmp[k * w + x]);
      out[y * w + x] = v;
    }
  }
  return out;
}
var maxF = (m, w, h, size) => rankFilter(m, w, h, size, Math.max);
var minF = (m, w, h, size) => rankFilter(m, w, h, size, Math.min);
function blur(m, w, h, sigma) {
  if (!(sigma > 0)) return m;
  const r = Math.ceil(sigma * 3);
  const k = Array.from({ length: 2 * r + 1 }, (_, i) => Math.exp(-((i - r) ** 2) / (2 * sigma * sigma)));
  const pass = (src, dx, dy) => {
    const out = new Float32Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let s = 0, ws = 0;
        for (let i = -r; i <= r; i++) {
          const X = x + i * dx, Y = y + i * dy;
          if (X < 0 || Y < 0 || X >= w || Y >= h) continue;
          s += src[Y * w + X] * k[i + r];
          ws += k[i + r];
        }
        out[y * w + x] = s / ws;
      }
    }
    return out;
  };
  return pass(pass(m, 1, 0), 0, 1);
}
function hairMask(lab, w, h) {
  let m = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) m[i] = lab[i * 3 + 2] > 10.5 && lab[i * 3] > 58 ? 1 : 0;
  m = minF(maxF(m, w, h, 3), w, h, 3);
  m = maxF(minF(m, w, h, 5), w, h, 5);
  return blur(maxF(m, w, h, 7), w, h, 1);
}
var median = (values) => {
  if (!values.length) return 0;
  const s = Float64Array.from(values).sort();
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};
function cleanPatch(base, gen, rects, { classes = true, keepHair = false, threshold = 7, grow: grow2 = 2, feather = 1.5 } = {}) {
  const x0 = Math.max(0, Math.min(...rects.map((r) => r[0]))), y0 = Math.max(0, Math.min(...rects.map((r) => r[1])));
  const x1 = Math.min(base.width, Math.max(...rects.map((r) => r[2]))), y1 = Math.min(base.height, Math.max(...rects.map((r) => r[3])));
  const w = x1 - x0, h = y1 - y0;
  if (w <= 0 || h <= 0) throw new Error("框在图外");
  if (gen.width < x1 || gen.height < y1) throw new Error("重画结果比原图小，对不上");
  const n = w * h;
  const bl = new Float32Array(n * 3), gl = new Float32Array(n * 3), inside = new Uint8Array(n), alpha = new Float32Array(n);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const X = x0 + x, Y = y0 + y;
      const bi = (Y * base.width + X) * 4, gi = (Y * gen.width + X) * 4;
      const a = base.data[bi + 3] / 255;
      alpha[i] = a;
      const lb = rgbToLab(base.data[bi] * a + 255 * (1 - a), base.data[bi + 1] * a + 255 * (1 - a), base.data[bi + 2] * a + 255 * (1 - a));
      const lg = rgbToLab(gen.data[gi], gen.data[gi + 1], gen.data[gi + 2]);
      bl.set(lb, i * 3);
      gl.set(lg, i * 3);
      inside[i] = rects.some((r) => X >= r[0] && X < r[2] && Y >= r[1] && Y < r[3]) ? 1 : 0;
    }
  }
  const de = (i) => Math.hypot(gl[i * 3] - bl[i * 3], gl[i * 3 + 1] - bl[i * 3 + 1], gl[i * 3 + 2] - bl[i * 3 + 2]);
  const calm = [[], [], []];
  for (let i = 0; i < n; i++) if (inside[i] && de(i) < 12) for (let c = 0; c < 3; c++) calm[c].push(bl[i * 3 + c] - gl[i * 3 + c]);
  const offset = calm[0].length > 50 ? calm.map(median) : [0, 0, 0];
  const g2 = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) for (let c = 0; c < 3; c++) g2[i * 3 + c] = gl[i * 3 + c] + offset[c];
  const wb = new Float32Array(n * 3), wg = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    wb.set(classWeights(bl[i * 3], bl[i * 3 + 1], bl[i * 3 + 2]), i * 3);
    wg.set(classWeights(g2[i * 3], g2[i * 3 + 1], g2[i * 3 + 2]), i * 3);
  }
  const stats = (lab, wts, k) => {
    let s = 0;
    const mu = [0, 0, 0], sd = [0, 0, 0];
    for (let i = 0; i < n; i++) {
      const v = wts[i * 3 + k] * inside[i];
      s += v;
      for (let c = 0; c < 3; c++) mu[c] += lab[i * 3 + c] * v;
    }
    if (s < 20) return null;
    for (let c = 0; c < 3; c++) mu[c] /= s;
    for (let i = 0; i < n; i++) {
      const v = wts[i * 3 + k] * inside[i];
      for (let c = 0; c < 3; c++) sd[c] += (lab[i * 3 + c] - mu[c]) ** 2 * v;
    }
    return { mu, sd: sd.map((x) => Math.max(0.5, Math.sqrt(x / s))) };
  };
  const maps = classes ? [0, 1].map((k) => {
    const sb = stats(bl, wb, k), sg = stats(g2, wg, k);
    return sb && sg ? { sb, sg } : null;
  }) : [null, null];
  const fixed = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    for (let c = 0; c < 3; c++) {
      let v = g2[i * 3 + c] * wg[i * 3 + 2];
      for (let k = 0; k < 2; k++) {
        const m = maps[k];
        const mapped = m ? (g2[i * 3 + c] - m.sg.mu[c]) * (m.sb.sd[c] / m.sg.sd[c]) + m.sb.mu[c] : g2[i * 3 + c];
        v += mapped * wg[i * 3 + k];
      }
      fixed[i * 3 + c] = v;
    }
  }
  let used = new Float32Array(n);
  for (let i = 0; i < n; i++) used[i] = inside[i] && de(i) > threshold ? 1 : 0;
  used = maxF(minF(maxF(used, w, h, grow2 * 2 + 1), w, h, 3), w, h, 3);
  used = blur(used, w, h, feather);
  const hair = keepHair ? hairMask(bl, w, h) : null;
  for (let i = 0; i < n; i++) used[i] = Math.min(1, used[i]) * inside[i] * (hair ? 1 - hair[i] : 1);
  const data = new Uint8ClampedArray(n * 4);
  for (let i = 0; i < n; i++) {
    if (used[i] <= 4e-3) continue;
    const rgb = labToRgb(fixed[i * 3], fixed[i * 3 + 1], fixed[i * 3 + 2]);
    data[i * 4] = rgb[0];
    data[i * 4 + 1] = rgb[1];
    data[i * 4 + 2] = rgb[2];
    data[i * 4 + 3] = Math.round(255 * used[i] * alpha[i]);
  }
  return { x: x0, y: y0, width: w, height: h, data, used };
}

// src/client/theater/AaWorkbench.jsx
var BOX_NAMES = { eyes: ["左眼", "右眼"], mouth: ["嘴"] };
var loadImage3 = (src) => new Promise((resolve, reject) => {
  const img = new Image();
  img.onload = () => resolve(img);
  img.onerror = () => reject(new Error("图片读不出来"));
  img.src = src;
});
var makeCanvas = (w, h) => {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
};
var readBlob = (blob) => new Promise((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(r.result);
  r.onerror = reject;
  r.readAsDataURL(blob);
});
var assetDataUrl = async (id) => readBlob(await (await fetch(assetUrl(id))).blob());
function cleanToPatch(gen, prep, rects, part, state2) {
  const c = makeCanvas(prep.padW, prep.padH);
  const g = c.getContext("2d");
  g.drawImage(gen, 0, 0, prep.padW, prep.padH);
  const p2 = cleanPatch(prep.src, g.getImageData(0, 0, prep.padW, prep.padH), stateRects(rects, part, state2, prep.h), { classes: part === "eyes", keepHair: part === "eyes" });
  const out = makeCanvas(p2.width, p2.height);
  out.getContext("2d").putImageData(new ImageData(p2.data, p2.width, p2.height), 0, 0);
  return { dataUrl: out.toDataURL("image/png"), x: p2.x, y: p2.y };
}
function packSteps(pack) {
  const parts = pack && pack.version === 2 ? (pack.poses[pack.default_pose] || {}).parts || {} : null;
  return parts ? AA_STEPS.filter(([part, state2]) => parts[part] && parts[part][state2]) : [];
}
async function prepare(record) {
  const img = await loadImage3(assetUrl(record.assetId));
  const w = img.naturalWidth, h = img.naturalHeight;
  const padW = Math.ceil(w / 64) * 64, padH = Math.ceil(h / 64) * 64;
  const flat = makeCanvas(padW, padH);
  const fg = flat.getContext("2d");
  fg.fillStyle = "#fff";
  fg.fillRect(0, 0, padW, padH);
  fg.drawImage(img, 0, 0);
  const raw = makeCanvas(w, h).getContext("2d");
  raw.drawImage(img, 0, 0);
  return { w, h, padW, padH, image: flat.toDataURL("image/png"), src: raw.getImageData(0, 0, w, h) };
}
async function storedPatches(record) {
  const pack = record.aa && record.aa.pack;
  const out = {};
  for (const [part, state2] of packSteps(pack)) {
    const p2 = pack.poses[pack.default_pose].parts[part][state2];
    out[`${part}_${state2}`] = { dataUrl: await assetDataUrl(p2.file), x: p2.x, y: p2.y };
  }
  return out;
}
async function savePack(gameId, person, key, record, size, rects, patches, steps) {
  const parts = {};
  const files2 = {};
  for (const [part, state2] of steps) {
    const p2 = patches[`${part}_${state2}`];
    if (!p2) throw new Error(`还缺「${AA_PARTS[part].states[state2].label}」`);
    const file2 = `${part}_${state2}.png`;
    parts[part] = { ...parts[part] || {}, [state2]: { file: file2, x: p2.x, y: p2.y } };
    files2[file2] = p2.dataUrl;
  }
  const manifest = motionPack({ name: `${person.name}·${emotionLabel(record.emotion || key.split("|").pop())}`, width: size.w, height: size.h, still: "still.png", patches: parts });
  await api.cast(gameId, "aa-pack", { name: person.name, key, keepImage: true, manifest, files: files2, rects });
}
function RectEditor({ src, width, height, rects, onChange, zoom, parts = ["eyes", "mouth"], names = BOX_NAMES }) {
  const svg2 = import_react7.default.useRef(null);
  const drag = import_react7.default.useRef(null);
  const [frozen, setFrozen] = import_react7.default.useState(null);
  const point = (e) => {
    const el = svg2.current;
    const pt = el.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    return pt.matrixTransform(el.getScreenCTM().inverse());
  };
  const snap = (v) => Math.round(v / 8) * 8;
  const begin = (e, part, i, mode) => {
    e.preventDefault();
    e.stopPropagation();
    svg2.current.setPointerCapture(e.pointerId);
    drag.current = { part, i, mode, from: point(e), rect: rects[part][i] };
    setFrozen(view);
  };
  const move = (e) => {
    const d = drag.current;
    if (!d) return;
    const p2 = point(e);
    const dx = snap(p2.x - d.from.x), dy = snap(p2.y - d.from.y);
    const [x0, y0, x1, y1] = d.rect;
    const next = d.mode === "move" ? [x0 + dx, y0 + dy, x1 + dx, y1 + dy].map((v, k) => Math.max(0, Math.min(k % 2 ? height : width, v))) : [x0, y0, Math.max(x0 + 8, Math.min(width, x1 + dx)), Math.max(y0 + 8, Math.min(height, y1 + dy))];
    onChange({ ...rects, [d.part]: rects[d.part].map((r, k) => k === d.i ? next : r) });
  };
  const end = () => {
    drag.current = null;
    setFrozen(null);
  };
  let view = [0, 0, width, height];
  if (frozen) view = frozen;
  else if (zoom) {
    const [x0, y0, x1, y1] = rectsBox(parts.flatMap((part) => rects[part]));
    const size = Math.max(256, Math.max(x1 - x0, y1 - y0) * 3);
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    const vx = Math.max(0, Math.min(width - size, cx - size / 2)), vy = Math.max(0, Math.min(height - size, cy - size / 2));
    view = [vx, vy, Math.min(size, width), Math.min(size, height)];
  }
  const unit = Math.max(6, view[2] / 40);
  return /* @__PURE__ */ import_react7.default.createElement("svg", { ref: svg2, className: "fg-aa-frame", viewBox: view.join(" "), preserveAspectRatio: "xMidYMid meet", onPointerMove: move, onPointerUp: end, onPointerCancel: end }, /* @__PURE__ */ import_react7.default.createElement("image", { href: src, x: "0", y: "0", width, height }), parts.flatMap((part) => rects[part].map((r, i) => {
    const handle = Math.max(4, Math.min(unit, (r[2] - r[0]) / 2, (r[3] - r[1]) / 2));
    return /* @__PURE__ */ import_react7.default.createElement("g", { key: part + i, className: `fg-aa-box is-${part}` }, /* @__PURE__ */ import_react7.default.createElement("rect", { x: r[0], y: r[1], width: r[2] - r[0], height: r[3] - r[1], onPointerDown: (e) => begin(e, part, i, "move") }), /* @__PURE__ */ import_react7.default.createElement("rect", { className: "fg-aa-handle", x: r[2] - handle / 2, y: r[3] - handle / 2, width: handle, height: handle, onPointerDown: (e) => begin(e, part, i, "size") }), /* @__PURE__ */ import_react7.default.createElement("text", { x: r[0], y: r[1] - unit / 2, fontSize: unit * 1.6 }, names[part][i]));
  })));
}
var mb = (n) => `${(n / 1048576).toFixed(n >= 100 * 1048576 ? 0 : 1)} MB`;
var SOURCES = [["auto", "自动（先官网，连不上换镜像）"], ["official", "只用官网"], ["mirror", "先用镜像"]];
var AUTO_BADGE = { high: ["准", "is-ok"], mid: ["看一眼", "is-warn"], low: ["不准", "is-bad"], none: ["没认出", "is-bad"] };
function VisionBar({ status, setStatus, fine, setFine }) {
  const act = (promise) => promise.then(setStatus, (e) => toast(e.message, "error"));
  if (!status) return /* @__PURE__ */ import_react7.default.createElement("div", { className: "fg-note" }, "正在看认脸模型下好没有…");
  const { basic, fine: big } = status.packs;
  const job = status.job;
  const busy = job && job.state === "running";
  const label = (pack) => status.packs[pack] ? status.packs[pack].label : pack;
  return /* @__PURE__ */ import_react7.default.createElement("div", { className: "fg-aa-vision" }, /* @__PURE__ */ import_react7.default.createElement("div", { className: "fg-row" }, /* @__PURE__ */ import_react7.default.createElement("b", null, "自动框"), basic.ready ? /* @__PURE__ */ import_react7.default.createElement("span", { className: "fg-pill" }, "✓ 认脸小模型") : !busy && /* @__PURE__ */ import_react7.default.createElement("button", { type: "button", className: "fg-btn is-mini is-primary", onClick: () => act(visionApi.download("basic")) }, "下载认脸小模型（", mb(basic.missing), "）"), big.ready ? /* @__PURE__ */ import_react7.default.createElement("label", { className: "fg-check", title: big.note }, /* @__PURE__ */ import_react7.default.createElement("input", { type: "checkbox", checked: fine, onChange: (e) => setFine(e.target.checked) }), "精细模式（每张都让大模型找嘴，多 7~15 秒）") : basic.ready && !busy && /* @__PURE__ */ import_react7.default.createElement("button", { type: "button", className: "fg-btn is-mini", title: big.note, onClick: () => act(visionApi.download("fine")) }, "下载精细模式大模型（", mb(big.missing), "）"), /* @__PURE__ */ import_react7.default.createElement("span", { className: "fg-spacer" }), /* @__PURE__ */ import_react7.default.createElement("label", { className: "fg-note" }, "下载来源 ", /* @__PURE__ */ import_react7.default.createElement("select", { value: status.source, onChange: (e) => api.patchConfig({ vision: { source: e.target.value } }).then(() => act(visionApi.status()), (err) => toast(err.message, "error")) }, SOURCES.map(([v, t]) => /* @__PURE__ */ import_react7.default.createElement("option", { key: v, value: v }, t)))), big.ready && /* @__PURE__ */ import_react7.default.createElement("button", { type: "button", className: "fg-btn is-mini", title: "删掉大模型的文件，腾出约 300 MB", onClick: () => act(visionApi.remove("fine")) }, "删掉大模型")), busy && /* @__PURE__ */ import_react7.default.createElement("div", { className: "fg-row" }, /* @__PURE__ */ import_react7.default.createElement("span", { className: "fg-pill is-busy" }, "下载", label(job.pack), "：", mb(job.received), " / ", mb(job.total), job.source ? ` · 来自 ${job.source}` : ""), /* @__PURE__ */ import_react7.default.createElement("progress", { max: job.total || 1, value: job.received }), /* @__PURE__ */ import_react7.default.createElement("button", { type: "button", className: "fg-btn is-mini", onClick: () => act(visionApi.cancel()) }, "取消")), job && job.state === "failed" && /* @__PURE__ */ import_react7.default.createElement("div", { className: "fg-note fg-err" }, "下载", label(job.pack), "失败：", job.error, "（可以换个下载来源再点下载，下好的部分不会重下）"), !basic.ready && !busy && /* @__PURE__ */ import_react7.default.createElement("div", { className: "fg-note" }, "自动框要先下载认脸小模型：二次元的脸、头、眼睛识别（deepghs，MIT / OpenRAIL 许可），只下一次，存在", hostName() === "st" ? "这个浏览器的缓存里（换浏览器、清浏览器数据要重下）" : " FlowGal 数据目录的 models 文件夹", "，在你自己电脑上跑、不上传图片。"));
}
function StateThumb({ still, patch, box }) {
  const ref = import_react7.default.useRef(null);
  import_react7.default.useEffect(() => {
    let live = true;
    Promise.all([loadImage3(still), loadImage3(patch.src)]).then(([a, b]) => {
      const c = ref.current;
      if (!live || !c) return;
      const [x0, y0, x1, y1] = box;
      c.width = x1 - x0;
      c.height = y1 - y0;
      const g = c.getContext("2d");
      g.drawImage(a, x0, y0, x1 - x0, y1 - y0, 0, 0, x1 - x0, y1 - y0);
      g.drawImage(b, patch.x - x0, patch.y - y0);
    }, () => {
    });
    return () => {
      live = false;
    };
  }, [still, patch.src, patch.x, patch.y, box.join(",")]);
  return /* @__PURE__ */ import_react7.default.createElement("canvas", { ref, className: "fg-aa-thumb" });
}
function AaWorkbench({ gameId, person, onClose }) {
  const variants = import_react7.default.useMemo(() => Object.entries(person.sprites || {}).filter(([, r]) => r && r.assetId).map(([key, r]) => ({ key, record: r, label: emotionLabel(r.emotion || key.split("|").pop()), look: [r.outfit, ...r.states || []].filter(Boolean).join(" · ") })).sort((a, b) => Number(b.look === person.outfit) - Number(a.look === person.outfit) || a.label.localeCompare(b.label, "zh-CN")), [person]);
  const [picked, setPicked] = import_react7.default.useState(() => /* @__PURE__ */ new Set());
  const [focus, setFocus] = import_react7.default.useState(variants[0] ? variants[0].key : "");
  const [sizes, setSizes] = import_react7.default.useState({});
  const [frames, setFrames] = import_react7.default.useState({});
  const [jobs, setJobs] = import_react7.default.useState({});
  const [running, setRunning] = import_react7.default.useState(false);
  const [zoom, setZoom] = import_react7.default.useState(true);
  const [close, setClose] = import_react7.default.useState(true);
  const [tab, setTab] = import_react7.default.useState("frame");
  const [viewing, setViewing] = import_react7.default.useState(null);
  const [vision, setVision] = import_react7.default.useState(null);
  const [fine, setFineState] = import_react7.default.useState(() => {
    try {
      return localStorage.getItem("flowgal.aa.fine") === "1";
    } catch {
      return false;
    }
  });
  const [lite, setLiteState] = import_react7.default.useState(() => {
    try {
      return localStorage.getItem("flowgal.aa.lite") === "1";
    } catch {
      return false;
    }
  });
  const [auto, setAuto] = import_react7.default.useState({});
  const [framing, setFraming] = import_react7.default.useState("");
  const touched = import_react7.default.useRef(/* @__PURE__ */ new Set());
  const stop = import_react7.default.useRef(false);
  const job = (key, patch) => setJobs((j) => ({ ...j, [key]: { ...j[key] || {}, ...patch } }));
  const setFine = (on) => {
    setFineState(on);
    try {
      localStorage.setItem("flowgal.aa.fine", on ? "1" : "0");
    } catch {
    }
  };
  const setLite = (on) => {
    setLiteState(on);
    try {
      localStorage.setItem("flowgal.aa.lite", on ? "1" : "0");
    } catch {
    }
  };
  const steps = lite ? AA_STEPS_LITE : AA_STEPS;
  import_react7.default.useEffect(() => {
    visionApi.status().then(setVision, () => {
    });
  }, []);
  import_react7.default.useEffect(() => {
    holdVision();
    return () => releaseVisionLater();
  }, []);
  const downloading = Boolean(vision && vision.job && vision.job.state === "running");
  import_react7.default.useEffect(() => {
    if (!downloading) return void 0;
    const timer = setInterval(() => visionApi.status().then(setVision, () => {
    }), 1e3);
    return () => clearInterval(timer);
  }, [downloading]);
  const visionReady = Boolean(vision && vision.packs.basic.ready);
  const current = variants.find((v) => v.key === focus) || null;
  const lastRects = import_react7.default.useMemo(() => {
    const done = variants.filter((v) => v.record.aa && v.record.aa.rects).sort((a, b) => (b.record.at || 0) - (a.record.at || 0))[0];
    return done ? done.record.aa.rects : null;
  }, [variants]);
  const sizeOf = (key) => sizes[key] || { w: 832, h: 1216 };
  const rectsOf = (key) => frames[key] || (variants.find((v) => v.key === key) || {}).record?.aa?.rects || lastRects || defaultRects(sizeOf(key).w, sizeOf(key).h);
  import_react7.default.useEffect(() => {
    if (!current || sizes[current.key]) return;
    loadImage3(assetUrl(current.record.assetId)).then((img) => setSizes((s) => ({ ...s, [current.key]: { w: img.naturalWidth, h: img.naturalHeight } })), () => {
    });
  }, [current && current.key]);
  import_react7.default.useEffect(() => {
    setTab(current && current.record.aa ? "play" : "frame");
  }, [current && current.key]);
  const packOf = current && current.record.aa && current.record.aa.pack;
  const lastPack = import_react7.default.useRef(packOf);
  import_react7.default.useEffect(() => {
    if (packOf && packOf !== lastPack.current && lastPack.current !== void 0) setTab("play");
    lastPack.current = packOf;
  }, [packOf]);
  const toggle = (key) => setPicked((p2) => {
    const n = new Set(p2);
    if (n.has(key)) n.delete(key);
    else n.add(key);
    return n;
  });
  const applyToPicked = () => {
    const r = rectsOf(focus);
    setFrames((f) => {
      const n = { ...f };
      for (const key of picked) n[key] = r;
      return n;
    });
    setAuto((a) => {
      const n = { ...a };
      for (const key of picked) delete n[key];
      return n;
    });
    for (const key of picked) touched.current.add(key);
    toast(`已把这张的框套用到所选的 ${picked.size} 张`);
  };
  const refFor = (v) => {
    const hand = variants.find((o) => o.key !== v.key && touched.current.has(o.key) && frames[o.key]);
    if (hand) return { ...hand, rects: frames[hand.key] };
    const done = variants.filter((o) => o.key !== v.key && o.record.aa && o.record.aa.rects).sort((a, b) => (b.record.at || 0) - (a.record.at || 0))[0];
    return done ? { ...done, rects: done.record.aa.rects } : null;
  };
  const autoFrameList = async (list2) => {
    if (!visionReady) {
      toast("先下载认脸小模型", "error");
      return {};
    }
    if (framing || running || !list2.length) return {};
    stop.current = false;
    const out = {};
    let weak = 0;
    for (const v of list2) {
      if (stop.current) break;
      setFraming(v.key);
      const src = assetUrl(v.record.assetId);
      let info;
      try {
        let r = await frameSprite(vision, src, { fine });
        const ref = !r && refFor(v);
        if (ref) {
          const f = await followSprite(assetUrl(ref.record.assetId), ref.rects, src);
          if (f.score >= 0.25) r = { rects: f.rects, confidence: "low", notes: [`没认准，照「${ref.label}」框好的位置在这张里找同一张脸（相似度 ${Math.round(f.score * 100)}%），位置可能偏，拖一下`] };
        }
        info = r ? { confidence: r.confidence, notes: r.notes } : { confidence: "none", notes: ["没认出脸。手动框好这个角色的一张，再点自动框，其它的会照着那张找"] };
        if (r) {
          const rects = { eyes: r.rects.eyes.map((b) => b.map(Math.round)), mouth: r.rects.mouth.map((b) => b.map(Math.round)) };
          out[v.key] = { rects, confidence: r.confidence };
          touched.current.delete(v.key);
          setFrames((fr) => ({ ...fr, [v.key]: rects }));
        }
      } catch (e) {
        info = { confidence: "none", notes: ["出错了：" + String(e && e.message || e)] };
      }
      if (info.confidence === "low" || info.confidence === "none") weak++;
      setAuto((a) => ({ ...a, [v.key]: info }));
    }
    setFraming("");
    const done = Object.keys(out).length;
    toast(`自动框好 ${done} / ${list2.length} 张${weak ? `，其中 ${weak} 张没认准，标红的点开看一眼` : ""}`, weak ? "error" : void 0);
    return out;
  };
  const autoAndMake = async () => {
    const list2 = pickedList.filter((v) => !touched.current.has(v.key));
    const results = await autoFrameList(list2);
    const ok = pickedList.filter((v) => touched.current.has(v.key) || results[v.key] && results[v.key].confidence !== "low");
    if (stop.current || !ok.length) return;
    const skipped = pickedList.length - ok.length;
    if (skipped) toast(`${skipped} 张没认准，先不生成；调好框再点「生成所选」`, "error");
    await run(ok, null, Object.fromEntries(Object.entries(results).map(([k, r]) => [k, r.rects])));
  };
  const make = async (v, only = null, given = null) => {
    const rects = given || rectsOf(v.key);
    job(v.key, { status: "running", step: 0, error: "" });
    const prep = await prepare(v.record);
    setSizes((s) => ({ ...s, [v.key]: { w: prep.w, h: prep.h } }));
    const patches = only ? await storedPatches(v.record) : {};
    const todo = only ? [only] : steps;
    for (let i = 0; i < todo.length; i++) {
      if (stop.current) throw new Error("已停止");
      const [part, state2] = todo[i];
      job(v.key, { step: i + 1, total: todo.length, now: AA_PARTS[part].states[state2].label });
      const res = await api.aaInpaint({ gameId, name: person.name, key: v.key, part, state: state2, rects, image: prep.image, ...only ? { seed: Math.floor(Math.random() * 2 ** 31) } : {} });
      patches[`${part}_${state2}`] = cleanToPatch(await loadImage3(res.image), prep, rects, part, state2);
    }
    await savePack(gameId, person, v.key, v.record, prep, rects, patches, only ? packSteps(v.record.aa && v.record.aa.pack) : steps);
    setFrames((f) => {
      const n = { ...f };
      delete n[v.key];
      return n;
    });
    job(v.key, { status: "done", error: "" });
  };
  const run = async (list2, only = null, given = {}) => {
    if (running || !list2.length) return;
    setRunning(true);
    stop.current = false;
    let ok = 0;
    for (const v of list2) {
      if (stop.current) break;
      try {
        await make(v, only, given[v.key] || null);
        ok++;
      } catch (e) {
        job(v.key, { status: "failed", error: String(e && e.message || e) });
      }
    }
    setRunning(false);
    toast(stop.current ? `已停止：做好了 ${ok} 张` : `做好了 ${ok} / ${list2.length} 张`, ok === list2.length ? void 0 : "error");
  };
  const removeAa = (list2) => list2.length && api.cast(gameId, "aa-remove", { name: person.name, keys: list2.map((v) => v.key) }).then(() => toast(`已取消 ${list2.length} 张的动态，图留着`), (e) => toast(e.message, "error"));
  const pickedList = variants.filter((v) => picked.has(v.key));
  const talk = useDemoTalk(tab === "play");
  const statusText = (v) => {
    if (framing === v.key) return "正在自动框…";
    const j = jobs[v.key];
    if (j && j.status === "running") return `生成中 ${j.step || 0}/${j.total || steps.length}${j.now ? " · " + j.now : ""}`;
    if (j && j.status === "failed") return "失败：" + j.error;
    const level = packLevel(v.record.aa && v.record.aa.pack);
    return !v.record.aa ? "静态" : level === "lite" ? "已动（精简版）" : level === "v1" ? "已动（旧版，重做升级）" : "已动";
  };
  const pack = current && current.record.aa && current.record.aa.pack;
  const box = current ? (() => {
    const r = rectsOf(current.key);
    const [x0, y0, x1, y1] = rectsBox([...r.eyes, ...r.mouth]);
    const m = 24;
    return [Math.max(0, x0 - m), Math.max(0, y0 - m), x1 + m, y1 + m];
  })() : null;
  return /* @__PURE__ */ import_react7.default.createElement("div", { className: "fg-aa-bench" }, /* @__PURE__ */ import_react7.default.createElement("div", { className: "fg-row" }, /* @__PURE__ */ import_react7.default.createElement("b", null, person.name, " · 逆转式立绘工作台"), /* @__PURE__ */ import_react7.default.createElement("span", { className: "fg-spacer" }), /* @__PURE__ */ import_react7.default.createElement("button", { type: "button", className: "fg-btn", onClick: onClose }, "返回人物列表")), /* @__PURE__ */ import_react7.default.createElement("div", { className: "fg-note" }, "给差分做眨眼和说话的口型：框好两只眼睛和嘴，每张差分用 NovelAI 局部重绘 6 次（眼睛半闭、闭；嘴齿缝、小开、开、圆），只重画框里那一小块，原图不动； 重画的结果会洗干净（颜色对齐原图、刘海用原图），眨眼时不闪色、头发不跳。路人可以勾「精简版」：只做闭眼和一个张嘴，每张 2 次。 同一个角色的差分姿势相同，框一次可以「套用到所选」。嘴框尽量扁：框多高，嘴最多张多大。生成要用 NovelAI 的额度（试的时候没扣 Anlas，以你的账户为准）；生成时别关这个面板。"), variants.length > 0 && /* @__PURE__ */ import_react7.default.createElement(VisionBar, { status: vision, setStatus: setVision, fine, setFine }), !variants.length && /* @__PURE__ */ import_react7.default.createElement("div", { className: "fg-note", style: { marginTop: "1cqw" } }, "这个角色还没有画好的差分。先在人物志里画几张。"), variants.length > 0 && /* @__PURE__ */ import_react7.default.createElement("div", { className: "fg-aa-grid" }, /* @__PURE__ */ import_react7.default.createElement("div", { className: "fg-aa-list" }, /* @__PURE__ */ import_react7.default.createElement("div", { className: "fg-row" }, /* @__PURE__ */ import_react7.default.createElement("button", { type: "button", className: "fg-btn is-mini", onClick: () => setPicked(new Set(variants.map((v) => v.key))) }, "全选"), /* @__PURE__ */ import_react7.default.createElement("button", { type: "button", className: "fg-btn is-mini", onClick: () => setPicked(/* @__PURE__ */ new Set()) }, "全不选"), /* @__PURE__ */ import_react7.default.createElement("button", { type: "button", className: "fg-btn is-mini", onClick: () => setPicked(new Set(variants.filter((v) => !v.record.aa).map((v) => v.key))) }, "选还没做的"), /* @__PURE__ */ import_react7.default.createElement("span", { className: "fg-note" }, "已选 ", picked.size), /* @__PURE__ */ import_react7.default.createElement("button", { type: "button", className: "fg-btn is-mini", disabled: !visionReady || !picked.size || running || Boolean(framing), title: visionReady ? "用认脸模型给所选的差分框好眼睛和嘴" : "先在上面下载认脸小模型", onClick: () => autoFrameList(pickedList) }, "🪄 自动框所选")), variants.map((v) => /* @__PURE__ */ import_react7.default.createElement("div", { key: v.key, className: `fg-aa-item${v.key === focus ? " is-on" : ""}`, onClick: () => setFocus(v.key) }, /* @__PURE__ */ import_react7.default.createElement("input", { type: "checkbox", checked: picked.has(v.key), onClick: (e) => e.stopPropagation(), onChange: () => toggle(v.key), "aria-label": `选择 ${v.label}` }), /* @__PURE__ */ import_react7.default.createElement("img", { src: assetUrl(v.record.assetId), alt: "", loading: "lazy", title: "双击放大看", onDoubleClick: (e) => {
    e.stopPropagation();
    setViewing(v);
  } }), /* @__PURE__ */ import_react7.default.createElement("div", null, /* @__PURE__ */ import_react7.default.createElement("b", null, v.label, auto[v.key] && /* @__PURE__ */ import_react7.default.createElement("i", { className: `fg-aa-badge ${AUTO_BADGE[auto[v.key].confidence][1]}`, title: auto[v.key].notes.join("；") }, "自动框·", AUTO_BADGE[auto[v.key].confidence][0])), /* @__PURE__ */ import_react7.default.createElement("small", null, v.look), /* @__PURE__ */ import_react7.default.createElement("small", { className: jobs[v.key] && jobs[v.key].status === "failed" ? "fg-err" : "" }, statusText(v)))))), /* @__PURE__ */ import_react7.default.createElement("div", { className: "fg-aa-stage" }, current && /* @__PURE__ */ import_react7.default.createElement(import_react7.default.Fragment, null, /* @__PURE__ */ import_react7.default.createElement("div", { className: "fg-row" }, /* @__PURE__ */ import_react7.default.createElement("button", { type: "button", className: `fg-btn is-mini${tab === "frame" ? " is-on" : ""}`, onClick: () => setTab("frame") }, "框眼睛和嘴"), /* @__PURE__ */ import_react7.default.createElement("button", { type: "button", className: `fg-btn is-mini${tab === "play" ? " is-on" : ""}`, disabled: !current.record.aa, title: current.record.aa ? "" : "这张还没做，生成后才能看动起来的样子", onClick: () => setTab("play") }, "看效果"), /* @__PURE__ */ import_react7.default.createElement("button", { type: "button", className: "fg-btn is-mini", onClick: () => setViewing(current) }, "🔍 放大看"), /* @__PURE__ */ import_react7.default.createElement("span", { className: "fg-note" }, current.label, current.look ? " · " + current.look : "")), tab === "frame" && /* @__PURE__ */ import_react7.default.createElement(import_react7.default.Fragment, null, /* @__PURE__ */ import_react7.default.createElement(RectEditor, { src: assetUrl(current.record.assetId), width: sizeOf(current.key).w, height: sizeOf(current.key).h, rects: rectsOf(current.key), zoom, onChange: (r) => {
    touched.current.add(current.key);
    setFrames((f) => ({ ...f, [current.key]: r }));
  } }), auto[current.key] && /* @__PURE__ */ import_react7.default.createElement("div", { className: `fg-note ${auto[current.key].confidence === "high" ? "" : "fg-err"}` }, "自动框：", auto[current.key].notes.join("；"), auto[current.key].confidence === "high" ? "" : "。框不对就拖一下（拖过的这张会被当成样子，其它认不出的照它找）"), /* @__PURE__ */ import_react7.default.createElement("div", { className: "fg-row" }, /* @__PURE__ */ import_react7.default.createElement("button", { type: "button", className: "fg-btn is-mini", onClick: () => setZoom(!zoom) }, zoom ? "看全图（找不到脸时）" : "放大看脸"), /* @__PURE__ */ import_react7.default.createElement("button", { type: "button", className: "fg-btn is-mini", disabled: !visionReady || running || Boolean(framing), title: visionReady ? "" : "先在上面下载认脸小模型", onClick: () => autoFrameList([current]) }, framing === current.key ? "认脸中…" : "🪄 自动框这张"), /* @__PURE__ */ import_react7.default.createElement("button", { type: "button", className: "fg-btn is-mini", onClick: () => setFrames((f) => ({ ...f, [current.key]: defaultRects(sizeOf(current.key).w, sizeOf(current.key).h) })) }, "框放回默认位置"), /* @__PURE__ */ import_react7.default.createElement("button", { type: "button", className: "fg-btn is-mini", disabled: !picked.size, onClick: applyToPicked }, "把这张的框套用到所选")), /* @__PURE__ */ import_react7.default.createElement("div", { className: "fg-note" }, "拖框移动，拖右下角的小方块改大小。框住整只眼睛（含睫毛）和嘴，别框太大：框外的地方一点都不会变。")), tab === "play" && pack && /* @__PURE__ */ import_react7.default.createElement(import_react7.default.Fragment, null, /* @__PURE__ */ import_react7.default.createElement(PlayView, { aa: current.record.aa, talk, label: current.label, still: assetUrl(current.record.assetId), size: sizeOf(current.key), rects: rectsOf(current.key), close }), /* @__PURE__ */ import_react7.default.createElement("div", { className: "fg-row" }, /* @__PURE__ */ import_react7.default.createElement("button", { type: "button", className: "fg-btn is-mini", onClick: () => setClose(!close) }, close ? "看全身" : "看脸部特写")), !packSteps(pack).length && /* @__PURE__ */ import_react7.default.createElement("div", { className: "fg-note" }, "这张是旧版素材包（半张、张开两种嘴）。整张重做一次就升级成新版（更细的嘴、洗过的眼睛）。"), /* @__PURE__ */ import_react7.default.createElement("div", { className: "fg-aa-states" }, packSteps(pack).map(([part, state2]) => {
    const p2 = pack.poses[pack.default_pose].parts[part][state2];
    return /* @__PURE__ */ import_react7.default.createElement("div", { key: part + state2, className: "fg-aa-state" }, p2 && box ? /* @__PURE__ */ import_react7.default.createElement(StateThumb, { still: assetUrl(current.record.assetId), patch: { src: assetUrl(p2.file), x: p2.x, y: p2.y }, box }) : /* @__PURE__ */ import_react7.default.createElement("span", { className: "fg-note" }, "没有"), /* @__PURE__ */ import_react7.default.createElement("span", null, AA_PARTS[part].states[state2].label), /* @__PURE__ */ import_react7.default.createElement("button", { type: "button", className: "fg-btn is-mini", disabled: running, onClick: () => run([current], [part, state2]) }, "重画这个"));
  })), /* @__PURE__ */ import_react7.default.createElement("div", { className: "fg-note" }, "会一直眨眼，嘴跟着一句台词开合", packLevel(pack) === "lite" ? "（精简版：眨眼是睁 → 闭 → 睁，嘴在闭和开之间来回）" : "", "。哪个状态不像就单独重画（换个随机种子），框不准就回「框眼睛和嘴」调好再整张重做。"))))), variants.length > 0 && /* @__PURE__ */ import_react7.default.createElement("div", { className: "fg-row fg-aa-actions" }, /* @__PURE__ */ import_react7.default.createElement("label", { className: "fg-check", title: "路人、不重要的角色：只做闭眼和一个张嘴（每张 2 次局部重绘），眨眼是睁 → 闭 → 睁，嘴在闭和开之间来回" }, /* @__PURE__ */ import_react7.default.createElement("input", { type: "checkbox", checked: lite, disabled: running, onChange: (e) => setLite(e.target.checked) }), "精简版（省额度）"), !running && !framing && /* @__PURE__ */ import_react7.default.createElement("button", { type: "button", className: "fg-btn is-primary", disabled: !picked.size, onClick: () => run(pickedList) }, "生成所选（", picked.size, " 张 × ", steps.length, " 次局部重绘）"), !running && !framing && /* @__PURE__ */ import_react7.default.createElement("button", { type: "button", className: "fg-btn", disabled: !picked.size || !visionReady, title: visionReady ? "先自动框（手动调过的不动），认准了的直接生成，没认准的留下来" : "先在上面下载认脸小模型", onClick: autoAndMake }, "🪄 自动框并生成所选"), framing && /* @__PURE__ */ import_react7.default.createElement("button", { type: "button", className: "fg-btn", onClick: () => {
    stop.current = true;
  } }, "停止自动框"), !running && !framing && current && /* @__PURE__ */ import_react7.default.createElement("button", { type: "button", className: "fg-btn", onClick: () => run([current]) }, "只做这一张"), running && /* @__PURE__ */ import_react7.default.createElement("button", { type: "button", className: "fg-btn", onClick: () => {
    stop.current = true;
  } }, "停止（做完手上这次就停）"), /* @__PURE__ */ import_react7.default.createElement("button", { type: "button", className: "fg-btn", disabled: running || !pickedList.some((v) => v.record.aa), onClick: () => removeAa(pickedList.filter((v) => v.record.aa)) }, "取消所选的动态")), viewing && /* @__PURE__ */ import_react7.default.createElement(SpriteViewer, { record: (variants.find((v) => v.key === viewing.key) || viewing).record, label: `${person.name} · ${viewing.label}`, onClose: () => setViewing(null) }));
}

// src/client/theater/faceFramer.js
var import_react8 = __toESM(require("react"), 1);
function facesToFrame(view) {
  const out = [];
  for (const p2 of view && view.cast || []) {
    for (const [key, st] of Object.entries(p2.spriteStatus || {})) {
      if (!st || st.status !== "face") continue;
      const record = (p2.sprites || {})[key];
      const from = record && record.face && record.face.from;
      const body = from && p2.sprites[from];
      if (body && body.assetId && !body.faceBox && !out.some((w) => w.assetId === body.assetId)) out.push({ name: p2.name, key: from, assetId: body.assetId });
    }
  }
  return out;
}
var tried = /* @__PURE__ */ new Map();
var framedResult = (assetId) => tried.get(assetId) || "";
var noModelAt = 0;
function useFaceFramer(gameId, view) {
  const busy = import_react8.default.useRef(false);
  import_react8.default.useEffect(() => {
    if (!gameId || !view || view.gameId !== gameId || busy.current) return;
    const work = facesToFrame(view).filter((w) => !tried.has(w.assetId));
    if (!work.length || Date.now() - noModelAt < 6e4) return;
    busy.current = true;
    (async () => {
      const status = await visionApi.status().catch(() => null);
      if (!status || !status.packs.basic.ready) {
        noModelAt = Date.now();
        return;
      }
      holdVision();
      try {
        for (const w of work) {
          let r = null;
          try {
            r = await frameSprite(status, assetUrl(w.assetId));
          } catch {
          }
          if (r && r.confidence !== "low") {
            try {
              await api.cast(gameId, "face-box", { name: w.name, key: w.key, rects: r.rects });
              tried.set(w.assetId, "ok");
            } catch (e) {
              tried.set(w.assetId, "miss");
              toast(`${w.name} 的脸框没存上：${e.message}`, "error");
            }
          } else {
            tried.set(w.assetId, "miss");
            toast(`没认准 ${w.name} 的脸：在人物志里点开那张动作底图框一下脸，同组表情就会换好`, "error");
          }
        }
      } finally {
        releaseVisionLater();
      }
    })().finally(() => {
      busy.current = false;
    });
  }, [gameId, view]);
}

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
  const pending = skin.fonts.flatMap((key) => FONT_PACKS[key].css.map((file2) => {
    const href = `${root}${FONT_PACKS[key].pkg}/${file2}`;
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

// lib/face.js
var POSE_IDS = Object.keys(POSES);
function poseOf(emotion, custom = [], overrides = {}) {
  if (POSES[overrides?.[emotion]]) return overrides[emotion];
  if (EMOTION_POSE[emotion]) return EMOTION_POSE[emotion];
  const base = emotionEntry(emotion, custom).base;
  if (base && POSES[overrides?.[base]]) return overrides[base];
  return EMOTION_POSE[base] || "daily";
}
function anchorOf(pose, custom = [], overrides = {}) {
  const preset2 = POSES[pose]?.anchor;
  if (preset2 && poseOf(preset2, custom, overrides) === pose) return preset2;
  return Object.keys(EMOTIONS).find((e) => poseOf(e, custom, overrides) === pose) || "";
}
var poseMembers = (pose, custom = [], overrides = {}) => Object.keys(EMOTIONS).filter((e) => poseOf(e, custom, overrides) === pose);
var FACE_PART = new RegExp([
  "\\b(?:smil(?:e|ing)|smirk(?:ing)?|grin(?:ning)?|frown(?:ing)?|pout(?:ing)?|blush(?:ing)?|tears?|teary|crying|sobbing|laugh(?:ing)?)\\b",
  "\\b(?:teeth|lips?|mouth|tongue|fangs?|cheeks?|eyebrows?|brows?|glar(?:e|ing)|wink(?:ing)?|star(?:e|ing)|gaze|glance|pupils|sweat(?:drop|ing)?|expression(?:less)?)\\b",
  "\\b(?:closed|half-closed|narrowed|downcast|squinting|sparkling|empty|half-lidded|watery|teary|rolling|averted|crazy|shaded|cold|gentle|sleepy|tired|wide)[ -]eyes?\\b",
  "\\beyes? (?:closed|open)\\b",
  "wide-eyed",
  "bags under eyes",
  "eye contact",
  "^looking (?:at viewer|at another|away|down|up|to the side|back|afar)$",
  "^sideways glance$",
  "^[:;=>^@x-][a-z3<>^_;@\\-o]{0,2}$"
].join("|"));
var snap82 = (v) => Math.round(v / 8) * 8;
function cleanFaceBox(box, width, height) {
  const [x0, y0, x1, y1] = (Array.isArray(box) ? box : []).map(Number);
  if (![x0, y0, x1, y1, width, height].every(Number.isFinite)) return null;
  const b = [Math.max(0, snap82(Math.min(x0, x1))), Math.max(0, snap82(Math.min(y0, y1))), Math.min(width, snap82(Math.max(x0, x1))), Math.min(height, snap82(Math.max(y0, y1)))];
  if (b[2] - b[0] < 32 || b[3] - b[1] < 32) return null;
  if ((b[2] - b[0]) * (b[3] - b[1]) > width * height / 6) return null;
  return b;
}
function faceBoxFrom(rects, width, height) {
  const ok = (r) => Array.isArray(r) && r.length === 4 && r.every(Number.isFinite) && r[2] > r[0] && r[3] > r[1];
  const eyes = (rects?.eyes || []).filter(ok).slice(0, 2);
  if (!eyes.length) return null;
  const mouth = (rects?.mouth || []).find(ok);
  const cx = (r) => (r[0] + r[2]) / 2, cy = (r) => (r[1] + r[3]) / 2;
  const d = eyes.length === 2 ? Math.hypot(cx(eyes[1]) - cx(eyes[0]), cy(eyes[1]) - cy(eyes[0])) : (eyes[0][2] - eyes[0][0]) * 1.5;
  const eyeBottom = Math.max(...eyes.map((r) => r[3]));
  const bottom = mouth ? Math.max(mouth[3], eyeBottom) : eyeBottom + 0.75 * d;
  return cleanFaceBox([Math.min(...eyes.map((r) => r[0])) - 0.15 * d, Math.min(...eyes.map((r) => r[1])) - 0.22 * d, Math.max(...eyes.map((r) => r[2])) + 0.15 * d, bottom + 0.22 * d], width, height);
}

// src/client/theater/Panels.jsx
var STATUS_LABEL = { writing: "分镜中", queued: "排队中", running: "绘制中", failed: "失败", cancelled: "已取消", ready: "" };
function RestartNotice({ floating = false }) {
  const u = useUpdate();
  if (!u || !u.restartRequired) return null;
  return /* @__PURE__ */ import_react9.default.createElement("div", { className: `fg-restart${floating ? " is-floating" : ""}`, role: "alert", onClick: (e) => e.stopPropagation() }, "FlowGal 已经更新，但 DSH 还在用旧的后台：", /* @__PURE__ */ import_react9.default.createElement("b", null, "关掉 DSH 再打开"), "（光刷新网页不够）。重启前改的设置和档案，有的会存不上。");
}
function Panel({ title, en, onClose, tabs, tab, onTab, children, actions }) {
  return /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-panel", onClick: (e) => e.stopPropagation(), onKeyDown: (e) => e.stopPropagation() }, /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-panel-head" }, /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-panel-title" }, title), /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-panel-en" }, en), /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-spacer" }), actions, /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", className: "fg-iconbtn", title: "返回", onClick: onClose }, "✕")), /* @__PURE__ */ import_react9.default.createElement(RestartNotice, null), tabs && /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-tabs" }, tabs.map((t) => /* @__PURE__ */ import_react9.default.createElement("button", { key: t.id, type: "button", className: `fg-tab${tab === t.id ? " is-on" : ""}`, onClick: () => onTab(t.id) }, t.label))), /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-panel-body" }, children));
}
function useBusy() {
  const [busy, setBusy] = import_react9.default.useState("");
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
  const ref = import_react9.default.useRef(null);
  import_react9.default.useEffect(() => {
    const box = ref.current && ref.current.closest(".fg-panel-body");
    const el = ref.current && ref.current.querySelector(".is-current");
    if (box && el) box.scrollTop = el.offsetTop - box.clientHeight / 2;
  }, []);
  let lastTurn = null;
  return /* @__PURE__ */ import_react9.default.createElement(Panel, { title: "回想", en: "Backlog", onClose }, /* @__PURE__ */ import_react9.default.createElement("div", { ref }, beats.map((b, i) => {
    const head = b.turn !== lastTurn;
    lastTurn = b.turn;
    return /* @__PURE__ */ import_react9.default.createElement(import_react9.default.Fragment, { key: b.key }, head && /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-log-turn fg-row" }, /* @__PURE__ */ import_react9.default.createElement("span", null, "TURN ", b.turn, " · ", b.scene.location || "—", " · ", TIME_LABEL[b.scene.time] || ""), /* @__PURE__ */ import_react9.default.createElement("span", { style: { flex: 1 } }), b.status === "directing" && /* @__PURE__ */ import_react9.default.createElement("span", { className: "fg-pill is-busy" }, "导演整理中"), b.status === "failed" && /* @__PURE__ */ import_react9.default.createElement("span", { className: "fg-pill fg-err", title: b.error }, "整理失败"), /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", className: "fg-btn", disabled: busy === "r" + b.turn, onClick: (e) => {
      e.stopPropagation();
      run("r" + b.turn, () => api.replan(gameId, b.turn), "已重新整理这一轮");
    } }, "重新整理")), /* @__PURE__ */ import_react9.default.createElement("div", { className: `fg-log-item${i === index ? " is-current" : ""}`, onClick: () => onJump(i), style: i === index ? { background: "rgba(255,255,255,.06)" } : null }, /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-log-name" }, b.type === "narration" ? "" : b.alias || b.speaker), /* @__PURE__ */ import_react9.default.createElement("div", { style: b.type === "thought" ? { fontStyle: "italic", opacity: 0.8 } : null }, b.type === "dialogue" ? `「${b.text}」` : b.type === "thought" ? `（${b.text}）` : b.text)));
  }), !beats.length && /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-note" }, "还没有可以回想的内容。")));
}
var CG_WRITER_LABEL = { ai: "插画分镜师写的", fallback: "按档案拼的（分镜师没写出来）", user: "你改的", director: "导演写的（旧版）" };
var blankCharacter = () => ({ name: "", tag: "", nl: "" });
function ImageEditor({ gameId, image, units = [], onClose }) {
  const pick = (img) => ({ tags: img.tags || "", desc: img.desc || "", characters: (img.characters || []).map((c) => ({ ...c })), negativeExtra: img.negativeExtra || "", shape: img.shape || "landscape", seed: "", style: img.style || "" });
  const data = useConfig();
  const styles = data ? data.config.style.presets : [];
  const currentName = (styles.find((x) => x.id === (data && data.config.style.current)) || {}).name || "";
  const [draft, setDraft] = import_react9.default.useState(() => pick(image));
  const [instruction, setInstruction] = import_react9.default.useState("");
  const [busy, run] = useBusy();
  const set = (patch) => setDraft((d) => ({ ...d, ...patch }));
  const setChar = (i, patch) => setDraft((d) => ({ ...d, characters: d.characters.map((c, j) => j === i ? { ...c, ...patch } : c) }));
  const version = image.versions[image.current];
  const stop = (e) => e.stopPropagation();
  return /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-person fg-cg-editor", style: { gridTemplateColumns: "1fr" }, onKeyDown: stop }, /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-section", style: { marginTop: 0 } }, "改提示词 · ", image.title || "第 " + image.turn + " 轮插画", image.writer && /* @__PURE__ */ import_react9.default.createElement("span", { className: "fg-pill", style: { marginLeft: "1cqw" } }, CG_WRITER_LABEL[image.writer] || image.writer)), image.moment && /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-note", style: { marginBottom: ".6cqw" } }, "导演挑的瞬间：", image.moment, image.who && image.who.length ? `（入画：${image.who.join("、")}）` : ""), /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-field" }, /* @__PURE__ */ import_react9.default.createElement("label", null, "画面 Base"), /* @__PURE__ */ import_react9.default.createElement("textarea", { className: "fg-textarea", placeholder: "人数、构图、镜头、地点、光线、时代锚……用英文 tag", value: draft.tags, onChange: (e) => set({ tags: e.target.value }) })), /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-field" }, /* @__PURE__ */ import_react9.default.createElement("label", null, "画面描述"), /* @__PURE__ */ import_react9.default.createElement("textarea", { className: "fg-textarea is-short", placeholder: "一两句英文，补 tag 说不清的空间关系和氛围", value: draft.desc, onChange: (e) => set({ desc: e.target.value }) })), /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-cg-chars" }, draft.characters.map((c, i) => /* @__PURE__ */ import_react9.default.createElement("div", { key: i, className: "fg-cg-char" }, /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-row" }, /* @__PURE__ */ import_react9.default.createElement("input", { className: "fg-input", style: { width: "12cqw" }, placeholder: "人物名", value: c.name, onChange: (e) => setChar(i, { name: e.target.value }) }), /* @__PURE__ */ import_react9.default.createElement("span", { className: "fg-note", style: { flex: 1 } }, "角色块 ", i + 1, c.name ? "：出图前补上档案里的固定外貌" : ""), /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", className: "fg-btn", onClick: () => set({ characters: draft.characters.filter((_, j) => j !== i) }) }, "移除")), /* @__PURE__ */ import_react9.default.createElement("textarea", { className: "fg-textarea is-short", placeholder: "girl, 表情, 视线, 动作, 衣服指纹……", value: c.tag, onChange: (e) => setChar(i, { tag: e.target.value }) }), /* @__PURE__ */ import_react9.default.createElement("textarea", { className: "fg-textarea is-short", placeholder: "一句英文：姿态、动作的来龙去脉、视线落在哪", value: c.nl, onChange: (e) => setChar(i, { nl: e.target.value }) }))), /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-row" }, /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", className: "fg-btn", disabled: draft.characters.length >= CG_MAX_CHARACTERS, onClick: () => set({ characters: [...draft.characters, blankCharacter()] }) }, "＋ 加一个人"), /* @__PURE__ */ import_react9.default.createElement("small", { className: "fg-note", style: { flex: 1 } }, "名字只用来对上档案，不会发出去：tag 和描述里的人名出图前会被删掉。NovelAI V4 以上每人一块分开发；其他渠道合并成一段。旧写法 @名字 也还能用。"))), /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-field" }, /* @__PURE__ */ import_react9.default.createElement("label", null, "额外负面"), /* @__PURE__ */ import_react9.default.createElement("input", { className: "fg-input", value: draft.negativeExtra, onChange: (e) => set({ negativeExtra: e.target.value }) })), units.length > 0 && /* @__PURE__ */ import_react9.default.createElement(CgSpan, { gameId, image, units }), /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-field" }, /* @__PURE__ */ import_react9.default.createElement("label", null, "画幅 / 种子"), /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-row" }, /* @__PURE__ */ import_react9.default.createElement("select", { className: "fg-select", style: { width: "auto" }, value: draft.shape, onChange: (e) => set({ shape: e.target.value }) }, /* @__PURE__ */ import_react9.default.createElement("option", { value: "portrait" }, "竖版（剧场里会摇镜）"), /* @__PURE__ */ import_react9.default.createElement("option", { value: "landscape" }, "横版"), /* @__PURE__ */ import_react9.default.createElement("option", { value: "square" }, "方形")), /* @__PURE__ */ import_react9.default.createElement("input", { className: "fg-input", style: { width: "14cqw" }, placeholder: "随机", value: draft.seed, onChange: (e) => set({ seed: e.target.value.replace(/\D/g, "") }) }), version && /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", className: "fg-btn", onClick: () => set({ seed: String(version.seed ?? "") }) }, "沿用当前种子"))), /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-field" }, /* @__PURE__ */ import_react9.default.createElement("label", null, "画风"), /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-row" }, /* @__PURE__ */ import_react9.default.createElement("select", { className: "fg-select", style: { width: "auto" }, value: styles.some((x) => x.id === draft.style) ? draft.style : "", onChange: (e) => set({ style: e.target.value }) }, /* @__PURE__ */ import_react9.default.createElement("option", { value: "" }, "跟着当前画风（", currentName, "）"), styles.map((x) => /* @__PURE__ */ import_react9.default.createElement("option", { key: x.id, value: x.id }, x.name))), /* @__PURE__ */ import_react9.default.createElement("span", { className: "fg-note" }, "只换这一张；画师串、正负面词、CFG 都按选的那套。"))), /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-field" }, /* @__PURE__ */ import_react9.default.createElement("label", null, "AI 改写"), /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-row" }, /* @__PURE__ */ import_react9.default.createElement("input", { className: "fg-input", style: { flex: 1, width: "auto" }, placeholder: "例如：改成雨夜、她在哭、镜头拉远……留空则让分镜师重读正文", value: instruction, onChange: (e) => setInstruction(e.target.value) }), /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", className: "fg-btn", disabled: busy === "rw", onClick: () => run("rw", async () => {
    const { draft: d } = await api.rewrite(gameId, image.id, instruction);
    set({ tags: d.tags || "", desc: d.desc || "", characters: (d.characters || []).map((c) => ({ ...c })), shape: d.shape || draft.shape });
  }, "已改写，确认后点「按此重画」") }, busy === "rw" ? "分镜师在写…" : "改写"))), version && /* @__PURE__ */ import_react9.default.createElement("details", { className: "fg-note", style: { margin: "0.6cqw 0" } }, /* @__PURE__ */ import_react9.default.createElement("summary", null, "当前版本实际发出的提示词"), /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-sent" }, /* @__PURE__ */ import_react9.default.createElement("div", null, "＋ ", version.positive), (version.characters || []).map((c, i) => /* @__PURE__ */ import_react9.default.createElement("div", { key: i }, "角色 ", i + 1, "：", c)), /* @__PURE__ */ import_react9.default.createElement("div", null, "－ ", version.negative), /* @__PURE__ */ import_react9.default.createElement("div", null, version.backend, " · ", version.model, version.style ? ` · 画风 ${version.style}` : "", " · seed ", version.seed, version.width ? ` · ${version.width}×${version.height}` : ""))), /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-row", style: { justifyContent: "flex-end" } }, /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", className: "fg-btn", onClick: onClose }, "取消"), /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", className: "fg-btn is-primary", onClick: () => run("go", async () => {
    await api.render(gameId, image.id, { tags: draft.tags, desc: draft.desc, characters: draft.characters, negativeExtra: draft.negativeExtra, shape: draft.shape, style: styles.some((x) => x.id === draft.style) ? draft.style : "", ...draft.seed ? { seed: Number(draft.seed) } : {} });
    onClose();
  }, "已加入出图队列") }, "按此重画")));
}
function CgSpan({ gameId, image, units }) {
  const [busy, run] = useBusy();
  const from = Math.max(0, units.findIndex((u) => u.id === image.after));
  const label = (u) => `${u.id} · ${u.text.length > 26 ? u.text.slice(0, 26) + "…" : u.text}`;
  return /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-field" }, /* @__PURE__ */ import_react9.default.createElement("label", null, "剧场里显示"), /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-row" }, /* @__PURE__ */ import_react9.default.createElement("span", { className: "fg-note" }, "从「", units[from] ? label(units[from]) : image.after, "」到"), /* @__PURE__ */ import_react9.default.createElement("select", { className: "fg-select", style: { flex: 1, width: "auto" }, disabled: busy === "u", value: image.until || "", onChange: (e) => run("u", () => api.until(gameId, image.id, e.target.value), "已改好，剧场里马上生效") }, /* @__PURE__ */ import_react9.default.createElement("option", { value: "" }, "这一轮结束"), units.slice(from).map((u) => /* @__PURE__ */ import_react9.default.createElement("option", { key: u.id, value: u.id }, label(u))))));
}
function Lightbox({ src, onClose, children }) {
  return /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-lightbox", onClick: onClose }, /* @__PURE__ */ import_react9.default.createElement("img", { src, alt: "", onClick: (e) => e.stopPropagation() }), /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-row", onClick: (e) => e.stopPropagation() }, children));
}
function openLibrary(gameId) {
  return api.openLibrary(gameId).then((r) => {
    const added = r.added ? `，补存了 ${r.added} 张` : "";
    if (r.opened) return toast(`已打开图片文件夹${added}`);
    try {
      navigator.clipboard.writeText(r.path).catch(() => {
      });
    } catch {
    }
    toast(`图片在 ${r.path}${added}（路径已复制）`);
  });
}
function CgTile({ gameId, image, onOpen, onEdit }) {
  const [busy, run] = useBusy();
  const src = cgSrc(image, assetUrl);
  const pending = ["writing", "queued", "running"].includes(image.status);
  return /* @__PURE__ */ import_react9.default.createElement("div", null, /* @__PURE__ */ import_react9.default.createElement("div", { className: `fg-thumb${src ? "" : " is-locked"}`, onClick: () => src && onOpen(image) }, src ? /* @__PURE__ */ import_react9.default.createElement("img", { src, alt: image.title, loading: "lazy" }) : /* @__PURE__ */ import_react9.default.createElement("span", null, pending ? (image.status === "writing" ? "✍ " : "🎨 ") + STATUS_LABEL[image.status] : image.status === "failed" ? "⚠ " + (image.error || "失败") : "未生成"), pending && src && /* @__PURE__ */ import_react9.default.createElement("span", { className: "fg-pill is-busy", style: { position: "absolute", right: ".6cqw", top: ".6cqw" } }, image.status === "writing" ? "分镜中" : "重画中"), /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-thumb-cap" }, image.title || "第 " + image.turn + " 轮插画", image.versions.length > 1 ? ` · ${image.current + 1}/${image.versions.length}` : "", image.retired ? " · 重新整理前的" : "")), /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-row", style: { marginTop: ".6cqw" } }, pending ? /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", className: "fg-btn", onClick: () => run("c", () => api.cancel(gameId, "cg", image.id), "已取消") }, "取消") : /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", className: "fg-btn", disabled: busy === "r", onClick: () => run("r", () => api.render(gameId, image.id, {}), "已加入出图队列") }, "重画"), /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", className: "fg-btn", onClick: () => onEdit(image) }, "改词"), /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", className: "fg-btn", onClick: () => {
    if (window.confirm("删除这张插画和它的所有版本？图片文件夹里另存的那份不会删。")) run("d", () => api.deleteImage(gameId, image.id), "已删除");
  } }, "删除")), image.status === "failed" && image.error && /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-note fg-err", style: { marginTop: ".4cqw" } }, image.error));
}
function Gallery({ view, gameId, onClose, focusId }) {
  const [tab, setTab] = import_react9.default.useState("cg");
  const [open, setOpen] = import_react9.default.useState(null);
  const [edit, setEdit] = import_react9.default.useState(() => focusId && view && view.images.find((i) => i.id === focusId) || null);
  const [busy, run] = useBusy();
  const images = view && view.images || [];
  const places = Object.values(view && view.places || {});
  const live = open && images.find((i) => i.id === open.id);
  const editTurn = edit && (view && view.turns || []).find((t) => t.textVersion === edit.textVersion);
  return /* @__PURE__ */ import_react9.default.createElement(
    Panel,
    {
      title: "鉴赏",
      en: "Gallery",
      onClose,
      tabs: [{ id: "cg", label: `插画 CG · ${images.length}` }, { id: "bg", label: `背景 · ${places.length}` }],
      tab,
      onTab: setTab,
      actions: /* @__PURE__ */ import_react9.default.createElement(import_react9.default.Fragment, null, /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", className: "fg-btn", title: "画好的图按「卡名 / 插画 / 第几轮 标题」另存在这里，在文件夹里改图、删图不影响剧场", disabled: busy === "lib", onClick: () => run("lib", () => openLibrary(gameId)) }, "打开图片文件夹"), /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", className: "fg-btn", title: "当时没填 Key、关着自动出图、出图失败或被中断的插画、背景和立绘差分，一次补上", disabled: busy === "fill", onClick: () => run("fill", () => api.fill(gameId).then((r) => toast(fillText(r)))) }, "补齐缺的图"))
    },
    edit && /* @__PURE__ */ import_react9.default.createElement(ImageEditor, { key: edit.id, gameId, image: images.find((i) => i.id === edit.id) || edit, units: editTurn ? playedUnits(editTurn.units, editTurn.script) : [], onClose: () => setEdit(null) }),
    tab === "cg" && /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-grid" }, [...images].sort((a, b) => Number(a.retired) - Number(b.retired)).map((img) => /* @__PURE__ */ import_react9.default.createElement(CgTile, { key: img.id, gameId, image: img, onOpen: setOpen, onEdit: setEdit })), !images.length && /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-note" }, "还没有插画。导演会在值得画的地方自动安排；也可以在聊天里点每条消息下方的「🎬 配一张」。")),
    tab === "bg" && /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-grid" }, places.map((p2) => /* @__PURE__ */ import_react9.default.createElement("div", { key: p2.key }, /* @__PURE__ */ import_react9.default.createElement("div", { className: `fg-thumb${p2.assetId ? "" : " is-locked"}`, onClick: () => p2.assetId && setOpen({ place: p2 }) }, p2.assetId ? /* @__PURE__ */ import_react9.default.createElement("img", { src: assetUrl(p2.assetId), alt: p2.location, loading: "lazy" }) : /* @__PURE__ */ import_react9.default.createElement("span", null, STATUS_LABEL[p2.status] || p2.error || "未生成"), /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-thumb-cap" }, p2.location, " · ", TIME_LABEL[p2.time] || p2.time)), /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-row", style: { marginTop: ".6cqw" } }, /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", className: "fg-btn", disabled: busy === p2.key, onClick: () => run(p2.key, () => api.place(gameId, p2.key), "已加入出图队列") }, "重画背景")), p2.status === "failed" && /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-note fg-err" }, p2.error))), !places.length && /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-note" }, "新地点出现时会自动生成背景（设置里可关）；没有生成时用程序化天空（按时段、天气变化）。")),
    live && cgSrc(live, assetUrl) && /* @__PURE__ */ import_react9.default.createElement(Lightbox, { src: cgSrc(live, assetUrl), onClose: () => setOpen(null) }, /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", className: "fg-btn", disabled: live.current <= 0, onClick: () => run("v", () => api.version(gameId, live.id, live.current - 1)) }, "‹ 上一版"), /* @__PURE__ */ import_react9.default.createElement("span", { className: "fg-pill" }, live.current + 1, " / ", live.versions.length), /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", className: "fg-btn", disabled: live.current >= live.versions.length - 1, onClick: () => run("v", () => api.version(gameId, live.id, live.current + 1)) }, "下一版 ›"), /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", className: "fg-btn", onClick: () => {
      setOpen(null);
      setEdit(live);
    } }, "改词重画"), /* @__PURE__ */ import_react9.default.createElement("a", { className: "fg-btn", href: cgSrc(live, assetUrl), download: `${live.title || live.id}.png` }, "下载")),
    open && open.place && /* @__PURE__ */ import_react9.default.createElement(Lightbox, { src: assetUrl(open.place.assetId), onClose: () => setOpen(null) }, /* @__PURE__ */ import_react9.default.createElement("span", { className: "fg-pill" }, open.place.location))
  );
}
var SPRITE_STATUS = { writing: "写词中", queued: "排队中", running: "绘制中", failed: "失败", cancelled: "已取消", face: "等认脸" };
var WRITER_LABEL = { ai: "立绘设计师写的", fallback: "按档案拼的（模型没写出来）", user: "你改的", upload: "你上传的" };
var LOG_ACTION = { create: "AI 建档", change: "外貌变化", temp: "临时状态", edit: "手动修改", wear: "换装", states: "长期状态", outfit: "新衣服" };
var GENDERS = [["", "未知"], ["female", "女"], ["male", "男"], ["other", "其他"]];
function readFile(file2) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file2);
  });
}
async function readAaFolder(files2) {
  const path = (f) => f.webkitRelativePath || f.name;
  const json = files2.filter((f) => f.name === "motion.json" || f.name === "sprite.json").sort((a, b) => path(a).length - path(b).length || (a.name === "motion.json" ? -1 : 1))[0];
  if (!json) throw new Error("这个文件夹里没有 motion.json 或 sprite.json：选素材包所在的那个文件夹");
  const dir = path(json).slice(0, -json.name.length);
  let manifest;
  try {
    manifest = JSON.parse(await json.text());
  } catch {
    throw new Error(json.name + " 不是合法的 JSON");
  }
  const pack = cleanPack(manifest);
  const byPath = new Map(files2.map((f) => [path(f), f]));
  const images = {};
  let total = 0;
  for (const name2 of packFiles(pack)) {
    const file2 = byPath.get(dir + name2);
    if (!file2) throw new Error("素材包缺文件：" + name2);
    total += file2.size;
    if (total > 11 * 1024 * 1024) throw new Error("素材包里的图片加起来超过 11MB，先压缩一下");
    images[name2] = await readFile(file2);
  }
  return { manifest, files: images };
}
function lookGroups(person) {
  const now = lookAt(person.timeline, Infinity);
  const groups = /* @__PURE__ */ new Map([[lookKey(now), { key: lookKey(now), look: now, current: true }]]);
  for (const [key, r] of Object.entries(person.sprites || {})) {
    const prefix = key.split("|").slice(0, 3).join("|");
    if (!groups.has(prefix)) groups.set(prefix, { key: prefix, look: { outfit: r.outfit || "", states: (r.states || []).map((name2) => ({ name: name2 })) }, current: false });
  }
  return [...groups.values()];
}
var VOICE_GROUPS = [["female", "女声"], ["male", "男声"], ["", "不分男女"]];
var PITCHES = Array.from({ length: VOICE_PITCH_LIMIT * 2 + 1 }, (_, i) => i - VOICE_PITCH_LIMIT).map((n) => [String(n), n > 0 ? `音高 +${n}` : n < 0 ? `音高 ${n}` : "音高 原调"]);
var voiceText = (voice) => voice ? voiceById(voice.id).label : "不出声";
var LOOK_HINTS = {
  fandom: "同人角色填 character name (copyright)；原创留空",
  sex: "1girl / 1boy",
  hair: "long black hair, ponytail",
  eyes: "blue eyes",
  skin: "pale skin（普通的不填）",
  body: "slender, petite",
  extra: "glasses, mole under eye（可不填）",
  other: "分不进上面各格的 tag。旧档案的一整串在这里，照常出图；想整理就挪进上面各格，tag 没变的话已经画好的立绘不用重画"
};
function ProfileEditor({ gameId, person, cast }) {
  const pick = (p2) => ({
    look: Object.fromEntries(LOOK_FIELDS.map((f) => [f, (p2.appearanceFields || {})[f] || ""])),
    gender: p2.gender || "",
    note: p2.note || "",
    negative: p2.negative || "",
    seed: p2.seedCustom ? String(p2.seed) : "",
    voice: p2.voice || "",
    voicePitch: String(p2.voicePitch || 0)
  });
  const [form, setForm] = import_react9.default.useState(() => pick(person));
  const [busy, run] = useBusy();
  const cfg = useConfig();
  const ui2 = cfg ? cfg.config.ui : null;
  import_react9.default.useEffect(() => {
    setForm(pick(person));
  }, [person.appearance, JSON.stringify(person.appearanceFields || {}), person.gender, person.note, person.negative, person.seed, person.seedCustom, person.voice, person.voicePitch]);
  const dirty = JSON.stringify(form) !== JSON.stringify(pick(person));
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const setLook = (f) => (e) => setForm({ ...form, look: { ...form.look, [f]: e.target.value } });
  const save = () => {
    const { look, ...rest } = form;
    return run("save", () => api.cast(gameId, person.global ? "global-save" : "save", { name: person.name, patch: { ...rest, appearanceFields: look, appearance: lookTags(look, person.appearance), seed: form.seed === "" ? null : Number(form.seed), voicePitch: Number(form.voicePitch) } }), "档案已保存");
  };
  const others = (cast || []).filter((p2) => p2.name !== person.name);
  const draft = { ...person, gender: form.gender, voice: form.voice, voicePitch: Number(form.voicePitch) };
  const voiceNow = castVoices([...others, draft], ui2).get(person.name);
  const autoVoice2 = castVoices([...others, { ...draft, voice: "" }], ui2).get(person.name);
  return /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-person-form" }, /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-field" }, /* @__PURE__ */ import_react9.default.createElement("label", null, "固定外貌"), /* @__PURE__ */ import_react9.default.createElement("div", null, /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-look-grid" }, LOOK_FIELDS.map((f) => /* @__PURE__ */ import_react9.default.createElement("label", { key: f, className: `fg-look-field${f === "other" ? " is-wide" : ""}` }, /* @__PURE__ */ import_react9.default.createElement("span", null, LOOK_FIELD_LABELS[f]), f === "other" ? /* @__PURE__ */ import_react9.default.createElement("textarea", { className: "fg-textarea is-short", value: form.look[f], onChange: setLook(f), onKeyDown: (e) => e.stopPropagation(), placeholder: LOOK_HINTS[f] }) : /* @__PURE__ */ import_react9.default.createElement("input", { className: "fg-input", value: form.look[f], onChange: setLook(f), onKeyDown: (e) => e.stopPropagation(), placeholder: LOOK_HINTS[f] })))), /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-note", style: { marginTop: ".5cqw" } }, "出图时用：", lookTags(form.look, person.appearance) || "（空）", person.appearance && lookTags(form.look, person.appearance) === person.appearance ? "（tag 没变，已画好的立绘照用）" : "", "　衣服不写在这里，走「衣橱与状态」。"))), /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-field" }, /* @__PURE__ */ import_react9.default.createElement("label", null, "性别 / 种子"), /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-row" }, /* @__PURE__ */ import_react9.default.createElement("select", { className: "fg-select", style: { width: "auto" }, value: form.gender, onChange: set("gender") }, GENDERS.map(([v, l]) => /* @__PURE__ */ import_react9.default.createElement("option", { key: v, value: v }, l))), /* @__PURE__ */ import_react9.default.createElement("input", { className: "fg-input", style: { width: "12cqw" }, inputMode: "numeric", value: form.seed, placeholder: `默认 ${person.seed}`, onChange: (e) => setForm({ ...form, seed: e.target.value.replace(/\D/g, "") }), onKeyDown: (e) => e.stopPropagation() }), /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", className: "fg-btn", title: "换一个随机种子", onClick: () => setForm({ ...form, seed: String(Math.floor(Math.random() * 2 ** 31)) }) }, "🎲"), /* @__PURE__ */ import_react9.default.createElement("span", { className: "fg-note" }, "所有立绘差分共用这个种子"))), /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-field" }, /* @__PURE__ */ import_react9.default.createElement("label", null, "声音"), /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-row" }, /* @__PURE__ */ import_react9.default.createElement("select", { className: "fg-select", style: { width: "auto" }, value: form.voice, onChange: set("voice"), "aria-label": "打字音音色" }, /* @__PURE__ */ import_react9.default.createElement("option", { value: "" }, "自动（", voiceText(autoVoice2), "）"), /* @__PURE__ */ import_react9.default.createElement("option", { value: "off" }, "不出声"), VOICE_GROUPS.map(([g, label]) => /* @__PURE__ */ import_react9.default.createElement("optgroup", { key: g, label }, VOICES.filter((v) => v.gender === g).map((v) => /* @__PURE__ */ import_react9.default.createElement("option", { key: v.id, value: v.id }, v.label))))), /* @__PURE__ */ import_react9.default.createElement("select", { className: "fg-select", style: { width: "auto" }, value: form.voicePitch, onChange: set("voicePitch"), "aria-label": "音高", title: "升降几个半音" }, PITCHES.map(([v, l]) => /* @__PURE__ */ import_react9.default.createElement("option", { key: v, value: v }, l))), /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", className: "fg-btn", disabled: !voiceNow, onClick: () => previewVoice(voiceNow, ui2 || void 0) }, "▶ 试听"), /* @__PURE__ */ import_react9.default.createElement("span", { className: "fg-note" }, "这个角色说话时的打字音"))), /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-field" }, /* @__PURE__ */ import_react9.default.createElement("label", null, "立绘备注"), /* @__PURE__ */ import_react9.default.createElement("textarea", { className: "fg-textarea is-short", value: form.note, onChange: set("note"), onKeyDown: (e) => e.stopPropagation(), placeholder: "写给立绘设计师，比如「右眼下有泪痣」「笑起来露虎牙」「总是抱着一本书」" })), /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-field" }, /* @__PURE__ */ import_react9.default.createElement("label", null, "不要出现"), /* @__PURE__ */ import_react9.default.createElement("input", { className: "fg-input", value: form.negative, onChange: set("negative"), onKeyDown: (e) => e.stopPropagation(), placeholder: "glasses, ponytail（每张立绘都加进负面词）" })), /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-row", style: { justifyContent: "flex-end" } }, /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", className: "fg-btn is-primary", disabled: !dirty || busy === "save", onClick: save }, "保存档案")));
}
function WardrobeEditor({ gameId, person }) {
  const [, run] = useBusy();
  const [draft, setDraft] = import_react9.default.useState({ name: "", tags: "" });
  const [stateDraft, setStateDraft] = import_react9.default.useState({ name: "", tags: "" });
  const look = (patch) => api.cast(gameId, "look", { name: person.name, patch });
  const outfits = Object.entries(person.timeline && person.timeline.outfits || {});
  const states = person.states || [];
  return /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-person-form" }, /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-wardrobe" }, outfits.map(([name2, o]) => /* @__PURE__ */ import_react9.default.createElement("div", { key: name2, className: `fg-outfit${person.outfit === name2 ? " is-on" : ""}` }, /* @__PURE__ */ import_react9.default.createElement("b", null, name2), /* @__PURE__ */ import_react9.default.createElement(Text, { value: o.tags || "", placeholder: "这套衣服的英文 tag", onCommit: (v) => run("o" + name2, () => look({ outfits: { [name2]: v } }), "已保存") }), person.outfit === name2 ? /* @__PURE__ */ import_react9.default.createElement("span", { className: "fg-pill" }, "正在穿") : /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", className: "fg-btn", onClick: () => run("w" + name2, () => look({ wear: name2 }), `${person.name} 换上了${name2}`) }, "穿上"), /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", className: "fg-btn", title: "从衣橱删掉", onClick: () => run("d" + name2, () => look({ outfits: { [name2]: null } })) }, "✕"))), !outfits.length && /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-note" }, "衣橱还是空的。导演会在角色登场、换衣服时记下来；也可以自己加。"), /* @__PURE__ */ import_react9.default.createElement("form", { className: "fg-outfit is-new", onSubmit: (e) => {
    e.preventDefault();
    if (draft.name.trim()) run("add", () => look({ outfits: { [draft.name.trim()]: draft.tags } }), "已加进衣橱").then(() => setDraft({ name: "", tags: "" }));
  } }, /* @__PURE__ */ import_react9.default.createElement("input", { className: "fg-input", placeholder: "新衣服名", value: draft.name, onChange: (e) => setDraft({ ...draft, name: e.target.value }), onKeyDown: (e) => e.stopPropagation() }), /* @__PURE__ */ import_react9.default.createElement("input", { className: "fg-input", placeholder: "pajamas, striped", value: draft.tags, onChange: (e) => setDraft({ ...draft, tags: e.target.value }), onKeyDown: (e) => e.stopPropagation() }), /* @__PURE__ */ import_react9.default.createElement("button", { type: "submit", className: "fg-btn" }, "加进衣橱"))), /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-field" }, /* @__PURE__ */ import_react9.default.createElement("label", null, "长期状态"), /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-row" }, states.map((st) => /* @__PURE__ */ import_react9.default.createElement("span", { key: st.name, className: "fg-state", title: st.tags }, st.name, /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", onClick: () => run("s" + st.name, () => look({ states: states.filter((x) => x.name !== st.name) }), `${st.name} 结束了`) }, "✕"))), !states.length && /* @__PURE__ */ import_react9.default.createElement("span", { className: "fg-note" }, "无"), /* @__PURE__ */ import_react9.default.createElement("form", { className: "fg-row", onSubmit: (e) => {
    e.preventDefault();
    if (stateDraft.name.trim()) run("sa", () => look({ states: [...states, { name: stateDraft.name.trim(), tags: stateDraft.tags }] }), "已加上").then(() => setStateDraft({ name: "", tags: "" }));
  } }, /* @__PURE__ */ import_react9.default.createElement("input", { className: "fg-input", style: { width: "10cqw" }, placeholder: "怀孕", value: stateDraft.name, onChange: (e) => setStateDraft({ ...stateDraft, name: e.target.value }), onKeyDown: (e) => e.stopPropagation() }), /* @__PURE__ */ import_react9.default.createElement("input", { className: "fg-input", style: { width: "16cqw" }, placeholder: "pregnant, round belly", value: stateDraft.tags, onChange: (e) => setStateDraft({ ...stateDraft, tags: e.target.value }), onKeyDown: (e) => e.stopPropagation() }), /* @__PURE__ */ import_react9.default.createElement("button", { type: "submit", className: "fg-btn" }, "加上")))), /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-field" }, /* @__PURE__ */ import_react9.default.createElement("label", null, "临时状态"), /* @__PURE__ */ import_react9.default.createElement(Text, { value: person.temp || "", placeholder: "wet hair, bandaged arm（只影响插画）", onCommit: (v) => run("t", () => look({ temp: v }), "已保存") })), /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-note" }, "长期状态和换装从最新一轮起生效，立绘按「服装 × 长期状态 × 情绪」各画一套；临时状态只进插画。"));
}
function FaceBoxEditor({ gameId, person, bodyKey, record, onDone }) {
  const [size, setSize] = import_react9.default.useState(null);
  const [box, setBox] = import_react9.default.useState(null);
  const [busy, run] = useBusy();
  const src = assetUrl(record.assetId);
  import_react9.default.useEffect(() => {
    let live = true;
    const img = new Image();
    img.onload = () => {
      if (!live) return;
      const w = img.naturalWidth, h = img.naturalHeight;
      setSize({ w, h });
      setBox(record.faceBox || record.aa && record.aa.rects && faceBoxFrom(record.aa.rects, w, h) || faceBoxFrom(defaultRects(w, h), w, h) || [0, 0, 64, 64]);
    };
    img.src = src;
    return () => {
      live = false;
    };
  }, [src]);
  if (!size || !box) return /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-note" }, "读图中…");
  const auto = () => run("auto", async () => {
    const status = await visionApi.status();
    if (!status.packs.basic.ready) throw new Error("先在逆转式工作台下载认脸小模型");
    const r = await frameSprite(status, src);
    const found = r && faceBoxFrom(r.rects, size.w, size.h);
    if (!found) throw new Error("没认出脸，手动拖一下框");
    setBox(found);
    if (r.confidence === "low") toast("认得没把握，看一眼框对不对", "error");
  });
  const save = () => run("save", async () => {
    const ok = cleanFaceBox(box, size.w, size.h);
    if (!ok) throw new Error("框太小或太大：框住眉毛到嘴就够（不超过整张图的六分之一）");
    const r = await api.cast(gameId, "face-box", { name: person.name, key: bodyKey, box: ok, by: "hand" });
    toast(r.redo ? `脸框已存，同组 ${r.redo} 张表情重换中` : "脸框已存");
    onDone();
  });
  return /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-face-editor" }, /* @__PURE__ */ import_react9.default.createElement(RectEditor, { src, width: size.w, height: size.h, rects: { face: [box] }, parts: ["face"], names: { face: ["脸"] }, zoom: true, onChange: (r) => setBox(r.face[0]) }), /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-row" }, /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", className: "fg-btn is-mini is-primary", disabled: busy === "save", onClick: save }, "存下并重换同组表情"), /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", className: "fg-btn is-mini", disabled: busy === "auto", onClick: auto }, busy === "auto" ? "认脸中…" : "🪄 自动认脸"), /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", className: "fg-btn is-mini", onClick: onDone }, "取消")), /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-note" }, "框住眉毛到嘴、两颊（下巴轮廓和头发外沿别框进去）。拖框移动，拖右下角改大小；框外的地方换脸时一点都不会变。"));
}
function FaceInfo({ gameId, person, group, emotionKey, record, emotions }) {
  const [busy, run] = useBusy();
  const [framing, setFraming] = import_react9.default.useState(false);
  const sprites = person.sprites || {};
  if (record && record.face) {
    const body = sprites[record.face.from];
    const bodyLabel = body ? emotionEntry(body.emotion || record.face.from.split("|").pop(), emotions).label : record.face.from.split("|").pop();
    return /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-row fg-face-info" }, /* @__PURE__ */ import_react9.default.createElement("span", { className: "fg-note" }, "只换脸：在「", bodyLabel, "」这张「", (POSES[record.face.pose] || {}).label || "动作", "」底图上重画脸，身体衣服跟底图一样", Number.isInteger(record.face.seed) ? ` · 脸的种子 ${record.face.seed}` : ""), record.assetId && /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", className: "fg-btn is-mini", disabled: busy === "redo", onClick: () => run("redo", () => api.cast(gameId, "face-redo", { name: person.name, key: emotionKey }), "换个种子重画脸") }, "换个种子重画脸"));
  }
  const deps = Object.values(sprites).filter((r) => r && r.face && r.face.from === emotionKey);
  if (!record || !record.assetId || !deps.length && !record.pose) return null;
  const auto = framedResult(record.assetId);
  const boxText = record.faceBox ? record.faceBy === "hand" ? "脸框：你框的" : "脸框：自动认出" : auto === "miss" ? "脸框：自动没认准，框一下" : "脸框：还没认（剧场开着、认脸小模型下好时自动认）";
  return /* @__PURE__ */ import_react9.default.createElement(import_react9.default.Fragment, null, /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-row fg-face-info" }, /* @__PURE__ */ import_react9.default.createElement("span", { className: "fg-note" }, "「", (POSES[record.pose] || {}).label || "动作", "」动作底图：同组 ", deps.length, " 张表情在它上面只换脸，重画或上传这张，它们会跟着重换。", boxText), /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", className: "fg-btn is-mini", onClick: () => setFraming(!framing) }, framing ? "收起" : record.faceBox ? "调整脸框" : "框脸")), framing && /* @__PURE__ */ import_react9.default.createElement(FaceBoxEditor, { gameId, person, bodyKey: emotionKey, record, onDone: () => setFraming(false) }));
}
function VariantEditor({ gameId, person, group, emotion, emotions, turn, onClose }) {
  const key = `${group.key}|${emotion}`;
  const record = (person.sprites || {})[key] || null;
  const st = (person.spriteStatus || {})[key];
  const [tags, setTags] = import_react9.default.useState(record ? record.tags || "" : "");
  const [busy, run] = useBusy();
  const fileRef = import_react9.default.useRef(null);
  const aaRef = import_react9.default.useRef(null);
  import_react9.default.useEffect(() => {
    setTags(record ? record.tags || "" : "");
  }, [key, record && record.tags]);
  const entry = emotionEntry(emotion, emotions);
  const reachable = group.current || turn != null;
  const at2 = group.current ? {} : { turn };
  const label = `${person.name} · ${lookLabel(group.look)} · ${entry.label}`;
  const [viewing, setViewing] = import_react9.default.useState(false);
  return /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-variant" }, /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-variant-art" }, record && record.assetId ? /* @__PURE__ */ import_react9.default.createElement(SpriteArt, { record, label, onOpen: () => setViewing(true) }) : /* @__PURE__ */ import_react9.default.createElement("span", null, st ? SPRITE_STATUS[st.status] : "还没画")), viewing && /* @__PURE__ */ import_react9.default.createElement(SpriteViewer, { record, label, onClose: () => setViewing(false) }), /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-variant-body" }, /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-row" }, /* @__PURE__ */ import_react9.default.createElement("b", null, label), /* @__PURE__ */ import_react9.default.createElement("span", { className: "fg-spacer" }), /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", className: "fg-btn is-mini", onClick: onClose }, "收起")), entry.desc && /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-note" }, "情绪：", entry.desc, entry.base ? `（接近${emotionLabel(entry.base)}）` : ""), st && st.error && /* @__PURE__ */ import_react9.default.createElement("div", { className: `fg-note${st.status === "face" ? "" : " fg-err"}` }, st.error), /* @__PURE__ */ import_react9.default.createElement(FaceInfo, { gameId, person, group, emotionKey: key, record, emotions }), /* @__PURE__ */ import_react9.default.createElement("textarea", { className: "fg-textarea", value: tags, onChange: (e) => setTags(e.target.value), onKeyDown: (e) => e.stopPropagation(), placeholder: record && record.face ? "只换脸：这里只写表情（眉、眼、嘴、脸红、泪、视线）" : "还没有提示词：点「让设计师写」，它会读完资料和剧情来写" }), /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-note" }, record && record.writer ? WRITER_LABEL[record.writer] || record.writer : "", record && record.seed != null ? ` · 种子 ${record.seed}` : "", !reachable ? " · 这套样子在剧情里已经不会再出现（外貌改过），只能删除或上传" : ""), /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-row" }, /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", className: "fg-btn is-primary", disabled: !reachable || busy === "w", onClick: () => run("w", () => api.cast(gameId, "sprite", { name: person.name, emotion, rewrite: true, ...at2 }), "已交给立绘设计师：写好词就画") }, record && record.assetId ? "让设计师重写并重画" : "让设计师写并画"), /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", className: "fg-btn", disabled: !reachable || !tags.trim() || busy === "u", onClick: () => run("u", () => api.cast(gameId, "sprite", { name: person.name, emotion, tags, ...at2 }), "已排队：按这些词画") }, "按这些词画"), /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", className: "fg-btn", disabled: !reachable, onClick: () => fileRef.current && fileRef.current.click() }, "上传到这张"), record && /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", className: "fg-btn", onClick: () => run("d", () => api.cast(gameId, "sprite-delete", { name: person.name, key }), "已删除").then(onClose) }, "删除"), /* @__PURE__ */ import_react9.default.createElement("input", { ref: fileRef, type: "file", accept: "image/png,image/jpeg,image/webp", hidden: true, onChange: async (e) => {
    const file2 = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file2) return;
    const dataUrl = await readFile(file2);
    run("up", () => api.cast(gameId, "upload", { name: person.name, emotion, dataUrl, ...at2 }), "立绘已上传");
  } })), /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-row" }, /* @__PURE__ */ import_react9.default.createElement("span", { className: "fg-note" }, record && record.aa ? `逆转式素材包${record.aa.pack && record.aa.pack.name ? `「${record.aa.pack.name}」` : ""}：${record.aa.pack && record.aa.pack.version === 2 ? `会眨眼，说话时按字动嘴${Object.keys(record.aa.pack.poses || {}).length > 1 ? "，导演让他侧头时会转过去" : ""}` : "会呼吸、眨眼，说话时动嘴"}` : "逆转式立绘：导入素材包文件夹（motion.json 或 sprite.json 加图片），这张就会眨眼、动嘴（新版还会侧头）；图会换成素材包自带的那张"), /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", className: "fg-btn", disabled: !reachable || busy === "aa", onClick: () => aaRef.current && aaRef.current.click() }, busy === "aa" ? "导入中…" : record && record.aa ? "换素材包" : "导入素材包"), record && record.aa && record.aa.pack && /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", className: "fg-btn", disabled: busy === "aa-rm", onClick: () => run("aa-rm", () => api.cast(gameId, "aa-remove", { name: person.name, key }), "已取消动态，图留着") }, "取消动态"), /* @__PURE__ */ import_react9.default.createElement("input", { ref: aaRef, type: "file", webkitdirectory: "", multiple: true, hidden: true, onChange: (e) => {
    const files2 = [...e.target.files || []];
    e.target.value = "";
    if (files2.length) run("aa", async () => {
      const { manifest, files: images } = await readAaFolder(files2);
      await api.cast(gameId, "aa-pack", { name: person.name, emotion, manifest, files: images, ...at2 });
    }, "素材包已导入：这张立绘会呼吸、眨眼、动嘴了");
  } }))));
}
function PersonCard({ gameId, person, emotions, cast, voice, used, onBench }) {
  const [busy, run] = useBusy();
  const groups = import_react9.default.useMemo(() => lookGroups(person), [person]);
  const [groupKey, setGroupKey] = import_react9.default.useState("");
  const [emotion, setEmotion] = import_react9.default.useState("");
  const [fold, setFold] = import_react9.default.useState("");
  const [manage, setManage] = import_react9.default.useState(false);
  const [picked, setPicked] = import_react9.default.useState(() => /* @__PURE__ */ new Set());
  const group = groups.find((g) => g.key === groupKey) || groups[0];
  const turn = group.current ? null : findLookTurn(person.timeline, group.key);
  const now = lookAt(person.timeline, Infinity);
  const main = pickSprite(person.sprites, now, "neutral");
  const drawnEmotions = Object.keys(person.sprites || {}).map((k) => k.split("|").pop());
  const tiles = personEmotions(person.name, emotions, { used, drawn: drawnEmotions }).map((e) => ({ ...e, key: `${group.key}|${e.id}`, record: (person.sprites || {})[`${group.key}|${e.id}`], st: (person.spriteStatus || {})[`${group.key}|${e.id}`] }));
  tiles.sort((a, b) => Number(Boolean(b.record && b.record.assetId)) - Number(Boolean(a.record && a.record.assetId)));
  const drawn = tiles.filter((t) => t.record && t.record.assetId).length;
  const deletable = tiles.filter((t) => t.record);
  const pick = (key) => setPicked((p2) => {
    const n = new Set(p2);
    if (n.has(key)) n.delete(key);
    else n.add(key);
    return n;
  });
  const endManage = () => {
    setManage(false);
    setPicked(/* @__PURE__ */ new Set());
  };
  const removePicked = () => {
    const keys = [...picked];
    if (!keys.length || !window.confirm(`删除 ${person.name} 的 ${keys.length} 张立绘？${person.global ? "这是全局角色，所有对局里都会少这几张。" : ""}删掉后可以再画。`)) return;
    run("del", () => api.cast(gameId, "sprite-delete", { name: person.name, keys }).then(endManage), `已删除 ${keys.length} 张`);
  };
  const mainRecord = main ? Object.values(person.sprites || {}).find((r) => r && r.assetId === main) : null;
  const [viewing, setViewing] = import_react9.default.useState(false);
  return /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-person", style: { "--c": person.color } }, /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-person-art" }, mainRecord ? /* @__PURE__ */ import_react9.default.createElement(SpriteArt, { record: mainRecord, label: person.name, onOpen: () => setViewing(true) }) : /* @__PURE__ */ import_react9.default.createElement(Silhouette, { name: person.name, color: person.color, appearance: person.appearance, gender: person.gender })), viewing && mainRecord && /* @__PURE__ */ import_react9.default.createElement(SpriteViewer, { record: mainRecord, label: `${person.name} · ${lookLabel(now)}`, onClose: () => setViewing(false) }), /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-person-main" }, /* @__PURE__ */ import_react9.default.createElement("h3", null, /* @__PURE__ */ import_react9.default.createElement("span", { style: { color: person.color } }, person.name), person.global ? /* @__PURE__ */ import_react9.default.createElement("small", null, "全局 · 外貌冻结") : /* @__PURE__ */ import_react9.default.createElement("small", null, "本局", person.createdTurn != null ? ` · 第 ${person.createdTurn} 轮登场` : ""), /* @__PURE__ */ import_react9.default.createElement("small", { title: "此刻的样子" }, lookLabel(now)), person.temp && /* @__PURE__ */ import_react9.default.createElement("small", { title: "临时状态，只进插画" }, "临时：", person.temp)), /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-person-tags" }, person.appearance ? LOOK_FIELDS.filter((f) => (person.appearanceFields || {})[f]).map((f) => /* @__PURE__ */ import_react9.default.createElement("span", { key: f, className: "fg-look-chip", title: LOOK_FIELD_LABELS[f] }, f === "other" ? null : /* @__PURE__ */ import_react9.default.createElement("i", null, LOOK_FIELD_LABELS[f]), person.appearanceFields[f])) : "（还没有固定外貌）", person.outfitTags ? /* @__PURE__ */ import_react9.default.createElement("span", { className: "fg-look-chip", title: "这身衣服" }, /* @__PURE__ */ import_react9.default.createElement("i", null, person.outfit || "衣服"), person.outfitTags) : null), /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-row fg-person-folds" }, /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", className: `fg-btn${fold === "profile" ? " is-on" : ""}`, onClick: () => setFold(fold === "profile" ? "" : "profile") }, "档案 · 种子 ", person.seed, " · 声音 ", voiceText(voice), voice && voice.auto ? "（自动）" : ""), /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", className: `fg-btn${fold === "wardrobe" ? " is-on" : ""}`, onClick: () => setFold(fold === "wardrobe" ? "" : "wardrobe") }, "衣橱与状态 · ", Object.keys(person.timeline && person.timeline.outfits || {}).length, " 套")), fold === "profile" && /* @__PURE__ */ import_react9.default.createElement(ProfileEditor, { gameId, person, cast }), fold === "wardrobe" && /* @__PURE__ */ import_react9.default.createElement(WardrobeEditor, { gameId, person }), /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-looks" }, groups.map((g) => /* @__PURE__ */ import_react9.default.createElement("button", { key: g.key, type: "button", className: `fg-look${g.key === group.key ? " is-on" : ""}`, onClick: () => {
    setGroupKey(g.key);
    setEmotion("");
    setPicked(/* @__PURE__ */ new Set());
  } }, lookLabel(g.look), g.current ? /* @__PURE__ */ import_react9.default.createElement("i", null, "现在") : null)), /* @__PURE__ */ import_react9.default.createElement("span", { className: "fg-note" }, "已画 ", drawn, " 种情绪"), /* @__PURE__ */ import_react9.default.createElement("span", { className: "fg-spacer" }), !manage && /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", className: "fg-btn is-mini", disabled: !deletable.length, onClick: () => {
    setManage(true);
    setEmotion("");
  } }, "管理立绘")), manage && /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-row fg-manage" }, /* @__PURE__ */ import_react9.default.createElement("span", { className: "fg-note" }, "点格子选中要删的（只能选画过或记过提示词的），已选 ", picked.size), /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", className: "fg-btn is-mini", onClick: () => setPicked(new Set(deletable.map((t) => t.key))) }, "全选"), /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", className: "fg-btn is-mini", onClick: () => setPicked(/* @__PURE__ */ new Set()) }, "全不选"), /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", className: "fg-btn is-mini fg-danger", disabled: !picked.size || busy === "del", onClick: removePicked }, "删除所选（", picked.size, "）"), /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", className: "fg-btn is-mini", onClick: endManage }, "完成")), /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-emos" }, tiles.map((t) => /* @__PURE__ */ import_react9.default.createElement(
    "button",
    {
      key: t.id,
      type: "button",
      title: t.st && t.st.error ? t.st.error : t.desc || t.label,
      disabled: manage && !t.record,
      className: `fg-emo${t.st && ["writing", "queued", "running"].includes(t.st.status) ? " is-busy" : ""}${!manage && emotion === t.id ? " is-on" : ""}${manage && picked.has(t.key) ? " is-picked" : ""}${t.builtin ? "" : " is-custom"}`,
      onClick: () => manage ? pick(t.key) : setEmotion(emotion === t.id ? "" : t.id)
    },
    t.record && t.record.assetId && /* @__PURE__ */ import_react9.default.createElement("img", { src: assetUrl(t.record.assetId), alt: "", loading: "lazy" }),
    /* @__PURE__ */ import_react9.default.createElement("span", null, t.label, t.record && t.record.face ? " · 脸" : "", t.record && t.record.aa ? " · 动" : "", t.st && t.st.status === "failed" ? " ⚠" : t.st && t.st.status === "face" ? " …" : "")
  ))), emotion && !manage && /* @__PURE__ */ import_react9.default.createElement(VariantEditor, { key: group.key + emotion, gameId, person, group, emotion, emotions, turn, onClose: () => setEmotion("") }), /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-row" }, /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", className: "fg-btn", disabled: busy === "fill", onClick: () => run("fill", () => api.cast(gameId, "fill", { name: person.name }).then((r) => toast(fillText(r)))) }, "补齐剧情里用到的差分"), /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", className: "fg-btn", disabled: !drawn && !Object.values(person.sprites || {}).some((r) => r && r.assetId), onClick: onBench }, "逆转式工作台（眨眼、口型）"), !person.global && /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", className: "fg-btn", onClick: () => run("g", () => api.cast(gameId, "promote", { name: person.name }), "已提升为全局角色：所有对局共用，AI 不再改它的固定外貌") }, "提升为全局"), person.global && /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", className: "fg-btn", onClick: () => run("l", () => api.cast(gameId, "copy-local", { name: person.name }), "已复制到本局，可单独修改") }, "复制到本局"), person.global && /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", className: "fg-btn", onClick: () => {
    if (window.confirm("从全局库移除？各对局里的副本不受影响。")) run("u", () => api.cast(gameId, "unglobal", { name: person.name }), "已移出全局库");
  } }, "移出全局"), !person.global && /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", className: "fg-btn", onClick: () => {
    if (window.confirm(`删除 ${person.name} 的本局档案和立绘记录？`)) run("d", () => api.cast(gameId, "delete", { name: person.name }), "已删除");
  } }, "删除")), person.versions && person.versions.length > 1 && /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-note", style: { marginTop: ".6cqw" } }, "外貌时间线：", person.versions.map((v) => `第 ${v.fromTurn} 轮起「${String(v.tags).slice(0, 40)}${String(v.tags).length > 40 ? "…" : ""}」`).join(" → "))));
}
function EmotionLibrary({ emotions }) {
  const [busy, run] = useBusy();
  const [draft, setDraft] = import_react9.default.useState({ id: "", desc: "", base: "" });
  const builtin = allEmotions([]).filter((e) => e.builtin);
  const custom = emotions || [];
  const baseOptions = [["", "（无）"], ...builtin.map((e) => [e.id, e.label])];
  const save = (id, patch) => run("e" + id, () => api.emotion("save", { id, ...patch }), "已保存");
  return /* @__PURE__ */ import_react9.default.createElement(import_react9.default.Fragment, null, /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-note" }, "导演给每句台词标情绪；库里没有贴切的词时，它会自创一个（可以是复合情绪，比如「带着烦躁思考」），写一句神情姿态，加进这里。导演新造的情绪只挂在用过它的角色下面，谁用到了才给谁画差分；你自己加的大家都能用。所有对局共用。"), /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-section" }, "新加的情绪 · ", custom.length), custom.map((e) => /* @__PURE__ */ import_react9.default.createElement("div", { key: e.id, className: "fg-emotion-row" }, /* @__PURE__ */ import_react9.default.createElement("b", null, e.id), /* @__PURE__ */ import_react9.default.createElement(Text, { value: e.desc || "", placeholder: "神情与姿态：眉眼、嘴角、脸色、手和身体", onCommit: (v) => save(e.id, { desc: v }) }), /* @__PURE__ */ import_react9.default.createElement(Select, { value: e.base || "", options: baseOptions, onChange: (v) => save(e.id, { base: v }) }), /* @__PURE__ */ import_react9.default.createElement("span", { className: "fg-note" }, e.source === "user" ? "你加的 · 大家都能用" : `导演加的${e.turn != null ? ` · 第 ${e.turn} 轮` : ""}${e.who && e.who.length ? ` · 用于 ${e.who.join("、")}` : ""}`), /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", className: "fg-btn", disabled: busy === "x" + e.id, onClick: () => run("x" + e.id, () => api.emotion("delete", { id: e.id }), "已删除（画好的立绘还在）") }, "删除"))), !custom.length && /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-note" }, "还没有。导演遇到内置情绪表达不了的瞬间时会自己加。"), /* @__PURE__ */ import_react9.default.createElement("form", { className: "fg-emotion-row is-new", onSubmit: (e) => {
    e.preventDefault();
    if (draft.id.trim()) run("add", () => api.emotion("save", draft), "已加进情绪库").then(() => setDraft({ id: "", desc: "", base: "" }));
  } }, /* @__PURE__ */ import_react9.default.createElement("input", { className: "fg-input", placeholder: "苦闷地表白", value: draft.id, onChange: (e) => setDraft({ ...draft, id: e.target.value }), onKeyDown: (e) => e.stopPropagation() }), /* @__PURE__ */ import_react9.default.createElement("input", { className: "fg-input", placeholder: "眉头紧锁却脸红，攥着衣角，视线躲开", value: draft.desc, onChange: (e) => setDraft({ ...draft, desc: e.target.value }), onKeyDown: (e) => e.stopPropagation() }), /* @__PURE__ */ import_react9.default.createElement(Select, { value: draft.base, options: baseOptions, onChange: (v) => setDraft({ ...draft, base: v }) }), /* @__PURE__ */ import_react9.default.createElement("button", { type: "submit", className: "fg-btn is-primary" }, "加进情绪库")), /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-section" }, "内置 · ", builtin.length), /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-row" }, builtin.map((e) => /* @__PURE__ */ import_react9.default.createElement("span", { key: e.id, className: "fg-chip" }, e.label, /* @__PURE__ */ import_react9.default.createElement("small", null, e.id)))));
}
function CastPanel({ view, gameId, onClose }) {
  const [tab, setTab] = import_react9.default.useState("people");
  const [busy, run] = useBusy();
  const [name2, setName] = import_react9.default.useState("");
  const cast = view && view.cast || [];
  const log = view && view.castLog || [];
  const emotions = view && view.emotions || [];
  const cfg = useConfig();
  const voices = castVoices(cast, cfg ? cfg.config.ui : null);
  const [bench, setBench] = import_react9.default.useState("");
  const benchPerson = bench && cast.find((p2) => p2.name === bench);
  const used = import_react9.default.useMemo(() => {
    const map = /* @__PURE__ */ new Map();
    for (const t of view && view.turns || []) {
      for (const line of Object.values(t.script && t.script.lines || {})) if (line.sp && line.emo) map.set(line.sp, [...map.get(line.sp) || [], line.emo]);
    }
    return map;
  }, [view && view.turns]);
  return /* @__PURE__ */ import_react9.default.createElement(
    Panel,
    {
      title: "人物志",
      en: "Characters",
      onClose,
      tabs: [{ id: "people", label: `人物 · ${cast.length}` }, { id: "emotions", label: `情绪库 · ${allEmotions(emotions).length}` }, { id: "log", label: `档案变更 · ${log.length}` }],
      tab,
      onTab: setTab,
      actions: tab === "people" && /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-row" }, /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", className: "fg-btn", disabled: busy === "fill", onClick: () => run("fill", () => api.fill(gameId, { kinds: ["sprite"] }).then((r) => toast(fillText(r)))) }, "补齐所有立绘"), /* @__PURE__ */ import_react9.default.createElement("form", { className: "fg-row", onSubmit: (e) => {
        e.preventDefault();
        if (name2.trim()) run("new", () => api.cast(gameId, "save", { name: name2.trim(), patch: {} }), "已新建").then(() => setName(""));
      } }, /* @__PURE__ */ import_react9.default.createElement("input", { className: "fg-input", style: { width: "14cqw" }, placeholder: "新人物名字", value: name2, onChange: (e) => setName(e.target.value), onKeyDown: (e) => e.stopPropagation() }), /* @__PURE__ */ import_react9.default.createElement("button", { type: "submit", className: "fg-btn" }, "新建")))
    },
    tab === "people" && benchPerson && /* @__PURE__ */ import_react9.default.createElement(AaWorkbench, { key: bench, gameId, person: benchPerson, onClose: () => setBench("") }),
    tab === "people" && !benchPerson && cast.map((p2) => /* @__PURE__ */ import_react9.default.createElement(PersonCard, { key: p2.name, gameId, person: p2, emotions, cast, voice: voices.get(p2.name), used: used.get(p2.name) || [], onBench: () => setBench(p2.name) })),
    tab === "people" && !cast.length && /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-note" }, "有名字的角色第一次出场时，导演会自动给他建档：固定外貌、身上的衣服。之后插画里写 @名字 都会换成这份档案，长相不再漂移；立绘按「服装 × 长期状态 × 情绪」各画一套，同一个种子。"),
    tab === "emotions" && /* @__PURE__ */ import_react9.default.createElement(EmotionLibrary, { emotions }),
    tab === "log" && log.map((e) => /* @__PURE__ */ import_react9.default.createElement("div", { key: e.index, className: "fg-log-item", style: { gridTemplateColumns: "12cqw 1fr auto", cursor: "default" } }, /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-log-name" }, e.name), /* @__PURE__ */ import_react9.default.createElement("div", null, /* @__PURE__ */ import_react9.default.createElement("b", { style: { color: "var(--accent)" } }, LOG_ACTION[e.action] || e.action), e.turn != null ? ` · 第 ${e.turn} 轮` : "", e.source === "user" ? " · 手动" : "", /* @__PURE__ */ import_react9.default.createElement("br", null), /* @__PURE__ */ import_react9.default.createElement("span", { className: "fg-note" }, e.action === "outfit" ? `${e.outfit}：` : "", e.before ? `${e.before} → ` : "", e.after || (e.action === "temp" || e.action === "states" ? "（解除）" : ""))), e.rolledBack ? /* @__PURE__ */ import_react9.default.createElement("span", { className: "fg-note" }, "已回滚") : /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", className: "fg-btn", disabled: busy === "rb" + e.index, onClick: () => run("rb" + e.index, () => api.cast(gameId, "rollback", { index: e.index }), "已回滚") }, "回滚"))),
    tab === "log" && !log.length && /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-note" }, "AI 每次建档、改外貌、换装、加长期 / 临时状态都会记在这里，可以一键回滚。")
  );
}
function Field({ label, hint, children }) {
  return /* @__PURE__ */ import_react9.default.createElement(import_react9.default.Fragment, null, /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-field" }, /* @__PURE__ */ import_react9.default.createElement("label", null, label), /* @__PURE__ */ import_react9.default.createElement("div", null, children)), hint && /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-note", style: { margin: "-0.5cqw 0 0.6cqw 15.2cqw" } }, hint));
}
function Toggle({ value, onChange }) {
  return /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", className: `fg-switch${value ? " is-on" : ""}`, "aria-pressed": Boolean(value), onClick: () => onChange(!value) });
}
function Text({ value, onCommit, type = "text", placeholder, style }) {
  const [v, setV] = import_react9.default.useState(value ?? "");
  import_react9.default.useEffect(() => {
    setV(value ?? "");
  }, [value]);
  const commit = () => {
    if (String(v) !== String(value ?? "")) onCommit(type === "number" ? Number(v) : v);
  };
  return /* @__PURE__ */ import_react9.default.createElement("input", { className: "fg-input", type, value: v, placeholder, style, onChange: (e) => setV(e.target.value), onBlur: commit, onKeyDown: (e) => {
    e.stopPropagation();
    if (e.key === "Enter") commit();
  } });
}
function Select({ value, options, onChange, style }) {
  return /* @__PURE__ */ import_react9.default.createElement("select", { className: "fg-select", value, style, onChange: (e) => onChange(e.target.value) }, options.map(([v, l]) => /* @__PURE__ */ import_react9.default.createElement("option", { key: v, value: v }, l)));
}
var INLINE = { width: "auto" };
function ModelField({ value, options, onCommit, placeholder, emptyLabel }) {
  const [manual, setManual] = import_react9.default.useState(false);
  if (manual || !options.length) {
    return /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-row" }, /* @__PURE__ */ import_react9.default.createElement(Text, { value, placeholder, style: { flex: 1, width: "auto" }, onCommit }), options.length > 0 && /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", className: "fg-btn", onClick: () => setManual(false) }, "从列表选"));
  }
  const known = !value || options.some((o) => o.id === value);
  const opts = [
    ...emptyLabel ? [["", emptyLabel]] : [],
    ...known ? [] : [[value, value + "（当前）"]],
    ...options.map((o) => [o.id, o.name]),
    ["__manual", "手动填写…"]
  ];
  return /* @__PURE__ */ import_react9.default.createElement(Select, { value, options: opts, onChange: (v) => v === "__manual" ? setManual(true) : onCommit(v) });
}
function listOptions(list2, value, emptyLabel) {
  const opts = (list2 || []).map((v) => [v, v]);
  if (value && !(list2 || []).includes(value)) opts.unshift([value, value + "（当前）"]);
  if (emptyLabel) opts.unshift(["", emptyLabel]);
  return opts;
}
function KeyInput({ backend, endpoint, has }) {
  const [value, setValue] = import_react9.default.useState("");
  const [busy, run] = useBusy();
  return /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-row" }, /* @__PURE__ */ import_react9.default.createElement("input", { className: "fg-input", style: { flex: 1, width: "auto" }, type: "password", autoComplete: "off", placeholder: has ? "已保存（不会回显）；填新的会覆盖" : "粘贴 Key", value, onChange: (e) => setValue(e.target.value), onKeyDown: (e) => e.stopPropagation() }), /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", className: "fg-btn is-primary", disabled: !value || busy === "s", onClick: () => run("s", async () => {
    setConfig(await api.secret(backend, endpoint, value));
    setValue("");
  }, "Key 已保存在宿主，不会发到浏览器") }, "保存"), has && /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", className: "fg-btn", onClick: () => run("c", async () => setConfig(await api.secret(backend, endpoint, "")), "已清除") }, "清除"), /* @__PURE__ */ import_react9.default.createElement("span", { className: has ? "fg-ok" : "fg-note" }, has ? "✓ 已保存" : "未填写"));
}
function BackendSection({ data }) {
  const cfg = data.config;
  const backend = cfg.images.backend;
  const [busy, run] = useBusy();
  const [test, setTest] = import_react9.default.useState(null);
  const [list2, setList] = import_react9.default.useState(null);
  const [relay, setRelay] = import_react9.default.useState({ name: "", baseURL: "" });
  const p2 = (section, patch) => patchConfig({ [section]: patch }).catch((e) => toast(e.message, "error"));
  const source = backend === "novelai" ? "" : [cfg[backend].baseURL, cfg[backend].authType, data.keys[backend]].join("|");
  const loadList = () => run("m", async () => setList(await api.models()));
  import_react9.default.useEffect(() => {
    setList(null);
    loadList();
  }, [backend, source]);
  const models = list2 && list2.backend === backend && list2.models || [];
  const samplers = list2 && list2.backend === backend && list2.samplers || [];
  const schedulers = list2 && list2.backend === backend && list2.schedulers || [];
  const modelHint = list2 ? list2.note : "正在读取模型列表…";
  const refresh = /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", className: "fg-btn", disabled: busy === "m", onClick: loadList }, busy === "m" ? "读取中…" : "刷新列表");
  const doTest = () => run("t", async () => {
    setTest(await api.test());
    if (backend !== "novelai") loadList();
  });
  const nai = naiModelInfo(cfg.novelai.model) || {};
  const auth = (section) => /* @__PURE__ */ import_react9.default.createElement(Field, { label: "鉴权" }, /* @__PURE__ */ import_react9.default.createElement(Select, { value: cfg[section].authType, onChange: (v) => p2(section, { authType: v }), options: [["none", "无"], ["bearer", "Bearer Token"], ["basic", "Basic（用户名:密码）"]] }));
  return /* @__PURE__ */ import_react9.default.createElement(import_react9.default.Fragment, null, /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-section" }, "生图渠道"), /* @__PURE__ */ import_react9.default.createElement(Field, { label: "渠道" }, /* @__PURE__ */ import_react9.default.createElement(Select, { value: backend, onChange: (v) => p2("images", { backend: v }), options: [["novelai", "NovelAI"], ["comfyui", "ComfyUI"], ["openai", "OpenAI 兼容（gpt-image / 聊天出图）"], ["webui", "SD WebUI / Forge"]] })), backend === "novelai" && /* @__PURE__ */ import_react9.default.createElement(import_react9.default.Fragment, null, /* @__PURE__ */ import_react9.default.createElement(Field, { label: "接入点", hint: "官方站与第三方中转站各存一条，各记各的 Key；换站不影响模型与画风。" }, /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-row" }, /* @__PURE__ */ import_react9.default.createElement(Select, { value: cfg.novelai.endpoint, onChange: (v) => p2("novelai", { endpoint: v }), options: cfg.novelai.endpoints.map((e) => [e.id, e.name]) }), cfg.novelai.endpoint !== "official" && /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", className: "fg-btn", onClick: () => p2("novelai", { endpoint: "official", endpoints: cfg.novelai.endpoints.filter((e) => e.id !== cfg.novelai.endpoint) }) }, "删除此站"))), /* @__PURE__ */ import_react9.default.createElement(Field, { label: "添加中转站" }, /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-row" }, /* @__PURE__ */ import_react9.default.createElement("input", { className: "fg-input", style: { width: "12cqw" }, placeholder: "名称", value: relay.name, onChange: (e) => setRelay((r) => ({ ...r, name: e.target.value })), onKeyDown: (e) => e.stopPropagation() }), /* @__PURE__ */ import_react9.default.createElement("input", { className: "fg-input", style: { flex: 1, width: "auto" }, placeholder: "https://…", value: relay.baseURL, onChange: (e) => setRelay((r) => ({ ...r, baseURL: e.target.value })), onKeyDown: (e) => e.stopPropagation() }), /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", className: "fg-btn", disabled: !/^https?:\/\//.test(relay.baseURL), onClick: () => {
    const id = "relay" + Date.now().toString(36).slice(-5);
    p2("novelai", { endpoints: [...cfg.novelai.endpoints, { id, name: relay.name || id, baseURL: relay.baseURL }], endpoint: id });
    setRelay({ name: "", baseURL: "" });
  } }, "添加"))), /* @__PURE__ */ import_react9.default.createElement(Field, { label: "Key" }, /* @__PURE__ */ import_react9.default.createElement(KeyInput, { backend: "novelai", endpoint: cfg.novelai.endpoint, has: data.keys["novelai:" + cfg.novelai.endpoint] })), /* @__PURE__ */ import_react9.default.createElement(Field, { label: "模型", hint: modelHint }, /* @__PURE__ */ import_react9.default.createElement(ModelField, { value: cfg.novelai.model, options: models, placeholder: "nai-diffusion-…", onCommit: (v) => p2("novelai", { model: v }) })), /* @__PURE__ */ import_react9.default.createElement(Field, { label: "采样器" }, /* @__PURE__ */ import_react9.default.createElement(Select, { value: cfg.novelai.sampler, onChange: (v) => p2("novelai", { sampler: v }), options: listOptions(samplers, cfg.novelai.sampler) })), /* @__PURE__ */ import_react9.default.createElement(Field, { label: "步数 / 提示词引导", hint: "当前画风里填了 CFG 时，以画风的为准。" }, /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-row" }, /* @__PURE__ */ import_react9.default.createElement(Text, { type: "number", style: { width: "8cqw" }, value: cfg.novelai.steps, onCommit: (v) => p2("novelai", { steps: v }) }), /* @__PURE__ */ import_react9.default.createElement(Text, { type: "number", style: { width: "8cqw" }, value: cfg.novelai.scale, onCommit: (v) => p2("novelai", { scale: v }) }))), /* @__PURE__ */ import_react9.default.createElement(Field, { label: "引导缩放", hint: "Prompt Guidance Rescale，0–1。提示词引导调高后画面发灰、过饱和时往上加一点。当前画风里填了 CFG Rescale 时，以画风的为准。" }, /* @__PURE__ */ import_react9.default.createElement("input", { type: "range", min: "0", max: "1", step: "0.02", value: cfg.novelai.cfgRescale, onChange: (e) => p2("novelai", { cfgRescale: Number(e.target.value) }), style: { width: "24cqw" } }), /* @__PURE__ */ import_react9.default.createElement("span", { className: "fg-note", style: { marginLeft: "1cqw" } }, Number(cfg.novelai.cfgRescale).toFixed(2))), nai.v5 ? /* @__PURE__ */ import_react9.default.createElement(Field, { label: "透明底立绘", hint: "V5 才有：立绘按透明背景生成，站在场景里不会带一块白底。CG 和背景不受影响。" }, /* @__PURE__ */ import_react9.default.createElement(Toggle, { value: cfg.images.transparentSprites, onChange: (v) => p2("images", { transparentSprites: v }) })) : /* @__PURE__ */ import_react9.default.createElement(import_react9.default.Fragment, null, /* @__PURE__ */ import_react9.default.createElement(Field, { label: "噪声调度" }, /* @__PURE__ */ import_react9.default.createElement(Select, { value: cfg.novelai.noiseSchedule, onChange: (v) => p2("novelai", { noiseSchedule: v }), options: listOptions(schedulers, cfg.novelai.noiseSchedule) })), nai.v4 && /* @__PURE__ */ import_react9.default.createElement(Field, { label: "Variety+", hint: "前几步不跟提示词，构图更多样；代价是没那么听话。" }, /* @__PURE__ */ import_react9.default.createElement(Toggle, { value: cfg.novelai.variety, onChange: (v) => p2("novelai", { variety: v }) })))), backend === "comfyui" && /* @__PURE__ */ import_react9.default.createElement(import_react9.default.Fragment, null, /* @__PURE__ */ import_react9.default.createElement(Field, { label: "地址" }, /* @__PURE__ */ import_react9.default.createElement(Text, { value: cfg.comfyui.baseURL, onCommit: (v) => p2("comfyui", { baseURL: v }) })), auth("comfyui"), cfg.comfyui.authType !== "none" && /* @__PURE__ */ import_react9.default.createElement(Field, { label: "Token" }, /* @__PURE__ */ import_react9.default.createElement(KeyInput, { backend: "comfyui", has: data.keys.comfyui })), /* @__PURE__ */ import_react9.default.createElement(Field, { label: "模式" }, /* @__PURE__ */ import_react9.default.createElement(Select, { value: cfg.comfyui.mode, onChange: (v) => p2("comfyui", { mode: v }), options: [["simple", "简单（只选底模）"], ["workflow", "导入工作流（API 格式 JSON）"]] })), cfg.comfyui.mode === "simple" ? /* @__PURE__ */ import_react9.default.createElement(import_react9.default.Fragment, null, /* @__PURE__ */ import_react9.default.createElement(Field, { label: "底模", hint: modelHint }, /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-row" }, /* @__PURE__ */ import_react9.default.createElement("div", { style: { flex: 1 } }, /* @__PURE__ */ import_react9.default.createElement(ModelField, { value: cfg.comfyui.checkpoint, options: models, emptyLabel: "（请选择）", placeholder: "xxx.safetensors", onCommit: (v) => p2("comfyui", { checkpoint: v }) })), refresh)), samplers.length > 0 && /* @__PURE__ */ import_react9.default.createElement(Field, { label: "采样器 / 调度器" }, /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-row" }, /* @__PURE__ */ import_react9.default.createElement(Select, { value: cfg.comfyui.sampler, onChange: (v) => p2("comfyui", { sampler: v }), options: listOptions(samplers, cfg.comfyui.sampler) }), /* @__PURE__ */ import_react9.default.createElement(Select, { value: cfg.comfyui.scheduler, onChange: (v) => p2("comfyui", { scheduler: v }), options: listOptions(schedulers, cfg.comfyui.scheduler) }))), /* @__PURE__ */ import_react9.default.createElement(Field, { label: "步数 / CFG", hint: "当前画风里填了 CFG 时，以画风的为准。" }, /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-row" }, /* @__PURE__ */ import_react9.default.createElement(Text, { type: "number", style: { width: "8cqw" }, value: cfg.comfyui.steps, onCommit: (v) => p2("comfyui", { steps: v }) }), /* @__PURE__ */ import_react9.default.createElement(Text, { type: "number", style: { width: "8cqw" }, value: cfg.comfyui.cfg, onCommit: (v) => p2("comfyui", { cfg: v }) })))) : /* @__PURE__ */ import_react9.default.createElement(Field, { label: "工作流", hint: "支持 %prompt% %negative% %width% %height% %seed% %steps% %cfg% 占位符；没有占位符时自动找正负提示词、尺寸和采样节点。" }, /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-row" }, cfg.comfyui.workflows.length > 0 && /* @__PURE__ */ import_react9.default.createElement(Select, { value: cfg.comfyui.workflow || cfg.comfyui.workflows[0].id, onChange: (v) => p2("comfyui", { workflow: v }), options: cfg.comfyui.workflows.map((w) => [w.id, w.name]) }), /* @__PURE__ */ import_react9.default.createElement("label", { className: "fg-btn" }, "导入 JSON", /* @__PURE__ */ import_react9.default.createElement("input", { type: "file", accept: "application/json,.json", hidden: true, onChange: async (e) => {
    const file2 = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file2) return;
    try {
      const graph = JSON.parse(await file2.text());
      if (!graph || typeof graph !== "object" || Array.isArray(graph) || graph.nodes) throw new Error("需要 ComfyUI「导出（API）」格式的 JSON");
      const id = "wf" + Date.now().toString(36);
      await patchConfig({ comfyui: { workflows: [...cfg.comfyui.workflows, { id, name: file2.name.replace(/\.json$/i, ""), graph }], workflow: id } });
      toast("工作流已导入");
    } catch (err) {
      toast(String(err.message || err), "error");
    }
  } })), cfg.comfyui.workflows.length > 0 && /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", className: "fg-btn", onClick: () => p2("comfyui", { workflows: cfg.comfyui.workflows.filter((w) => w.id !== (cfg.comfyui.workflow || cfg.comfyui.workflows[0].id)), workflow: "" }) }, "删除当前")))), backend === "openai" && /* @__PURE__ */ import_react9.default.createElement(import_react9.default.Fragment, null, /* @__PURE__ */ import_react9.default.createElement(Field, { label: "API 地址" }, /* @__PURE__ */ import_react9.default.createElement(Text, { value: cfg.openai.baseURL, onCommit: (v) => p2("openai", { baseURL: v }) })), /* @__PURE__ */ import_react9.default.createElement(Field, { label: "Key" }, /* @__PURE__ */ import_react9.default.createElement(KeyInput, { backend: "openai", has: data.keys.openai })), /* @__PURE__ */ import_react9.default.createElement(Field, { label: "接口" }, /* @__PURE__ */ import_react9.default.createElement(Select, { value: cfg.openai.mode, onChange: (v) => p2("openai", { mode: v }), options: [["images", "/images/generations"], ["chat", "/chat/completions（回复里带图的模型）"]] })), /* @__PURE__ */ import_react9.default.createElement(Field, { label: "模型", hint: modelHint }, /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-row" }, /* @__PURE__ */ import_react9.default.createElement("div", { style: { flex: 1 } }, /* @__PURE__ */ import_react9.default.createElement(ModelField, { value: cfg.openai.model, options: models, emptyLabel: "（请选择）", placeholder: "gpt-image-1", onCommit: (v) => p2("openai", { model: v }) })), refresh)), /* @__PURE__ */ import_react9.default.createElement(Field, { label: "横 / 竖 / 方尺寸" }, /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-row" }, /* @__PURE__ */ import_react9.default.createElement(Text, { style: { width: "10cqw" }, value: cfg.openai.landscapeSize, onCommit: (v) => p2("openai", { landscapeSize: v }) }), /* @__PURE__ */ import_react9.default.createElement(Text, { style: { width: "10cqw" }, value: cfg.openai.portraitSize, onCommit: (v) => p2("openai", { portraitSize: v }) }), /* @__PURE__ */ import_react9.default.createElement(Text, { style: { width: "10cqw" }, value: cfg.openai.squareSize, onCommit: (v) => p2("openai", { squareSize: v }) })))), backend === "webui" && /* @__PURE__ */ import_react9.default.createElement(import_react9.default.Fragment, null, /* @__PURE__ */ import_react9.default.createElement(Field, { label: "地址" }, /* @__PURE__ */ import_react9.default.createElement(Text, { value: cfg.webui.baseURL, onCommit: (v) => p2("webui", { baseURL: v }) })), auth("webui"), cfg.webui.authType !== "none" && /* @__PURE__ */ import_react9.default.createElement(Field, { label: "凭据" }, /* @__PURE__ */ import_react9.default.createElement(KeyInput, { backend: "webui", has: data.keys.webui })), /* @__PURE__ */ import_react9.default.createElement(Field, { label: "底模", hint: modelHint }, /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-row" }, /* @__PURE__ */ import_react9.default.createElement("div", { style: { flex: 1 } }, /* @__PURE__ */ import_react9.default.createElement(ModelField, { value: cfg.webui.model, options: models, emptyLabel: "跟随服务器当前底模", placeholder: "模型标题", onCommit: (v) => p2("webui", { model: v }) })), refresh)), samplers.length > 0 && /* @__PURE__ */ import_react9.default.createElement(Field, { label: "采样器 / 调度器" }, /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-row" }, /* @__PURE__ */ import_react9.default.createElement(Select, { value: cfg.webui.sampler, onChange: (v) => p2("webui", { sampler: v }), options: listOptions(samplers, cfg.webui.sampler) }), /* @__PURE__ */ import_react9.default.createElement(Select, { value: cfg.webui.scheduler, onChange: (v) => p2("webui", { scheduler: v }), options: listOptions(schedulers, cfg.webui.scheduler, "自动") }))), /* @__PURE__ */ import_react9.default.createElement(Field, { label: "步数 / CFG", hint: "当前画风里填了 CFG 时，以画风的为准。" }, /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-row" }, /* @__PURE__ */ import_react9.default.createElement(Text, { type: "number", style: { width: "8cqw" }, value: cfg.webui.steps, onCommit: (v) => p2("webui", { steps: v }) }), /* @__PURE__ */ import_react9.default.createElement(Text, { type: "number", style: { width: "8cqw" }, value: cfg.webui.cfg, onCommit: (v) => p2("webui", { cfg: v }) })))), /* @__PURE__ */ import_react9.default.createElement(Field, { label: "种子", hint: "-1 表示每张随机；填一个数字后所有图都用它，方便复现同一种构图。单张图可以在鉴赏的「改词」里另外指定。" }, /* @__PURE__ */ import_react9.default.createElement(Text, { type: "number", style: { width: "16cqw" }, value: cfg.images.seed, onCommit: (v) => p2("images", { seed: v === "" ? -1 : v }) })), /* @__PURE__ */ import_react9.default.createElement(Field, { label: "连接" }, /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-row" }, /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", className: "fg-btn", disabled: busy === "t", onClick: doTest }, busy === "t" ? "测试中…" : "测试连接"), test && /* @__PURE__ */ import_react9.default.createElement("span", { className: test.ok ? "fg-ok" : "fg-err" }, test.message), !test && /* @__PURE__ */ import_react9.default.createElement("span", { className: data.ready ? "fg-ok" : "fg-note" }, data.ready ? "✓ 可以出图" : data.readyReason))));
}
var newStyleId = () => "s" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
var exportStyle = (st) => ({ name: st.name, artist: st.artist, positive: st.positive, negative: st.negative, cfg: st.cfg, cfgRescale: st.cfgRescale });
function parseStyles(text) {
  const raw = String(text || "").trim();
  if (!raw) return [];
  try {
    const data = JSON.parse(raw);
    const list2 = Array.isArray(data) ? data : Array.isArray(data?.styles) ? data.styles : [data];
    return list2.filter((x) => x && typeof x === "object").map((x) => ({ ...exportStyle(x), artist: String(x.artist ?? x.text ?? ""), name: String(x.name || "导入的画风") }));
  } catch {
    return [{ name: "导入的画风", artist: raw, positive: null, negative: null, cfg: null, cfgRescale: null }];
  }
}
var blankNumber = (v) => String(v).trim() === "" || !Number.isFinite(Number(v)) ? null : Number(v);
function backendGuidance(cfg) {
  const b = cfg.images.backend;
  if (b === "novelai") return { cfg: cfg.novelai.scale, rescale: cfg.novelai.cfgRescale };
  if (b === "comfyui" || b === "webui") return { cfg: cfg[b].cfg, rescale: null };
  return { cfg: null, rescale: null };
}
var styleQueue = Promise.resolve();
function saveStyle(make, msg) {
  styleQueue = styleQueue.then(async () => {
    const latest = (await loadConfig()).config.style;
    const patch = make(latest);
    if (!patch) return;
    await patchConfig({ style: patch });
    if (msg) toast(msg);
  }).catch((e) => toast(e.message, "error"));
  return styleQueue;
}
function Area({ value, onCommit, placeholder, disabled, short }) {
  const [v, setV] = import_react9.default.useState(value ?? "");
  import_react9.default.useEffect(() => {
    setV(value ?? "");
  }, [value]);
  return /* @__PURE__ */ import_react9.default.createElement("textarea", { className: `fg-textarea${short ? " is-short" : ""}`, value: v, placeholder, disabled, onChange: (e) => setV(e.target.value), onBlur: () => {
    if (v !== (value ?? "")) onCommit(v);
  }, onKeyDown: (e) => e.stopPropagation() });
}
function StyleSection({ data }) {
  const cfg = data.config;
  const styles = cfg.style.presets;
  const st = styles.find((x) => x.id === cfg.style.current) || styles[0];
  const key = modelKey(cfg.images.backend, cfg);
  const own = backendGuidance(cfg);
  const [importText, setImportText] = import_react9.default.useState(null);
  const [busy, run] = useBusy();
  import_react9.default.useEffect(() => {
    loadConfig(true).catch(() => {
    });
  }, []);
  const id = st.id;
  const edit = (patch) => saveStyle((s) => ({ presets: s.presets.map((x) => x.id === id ? { ...x, ...patch } : x) }));
  const add = (list2, msg) => saveStyle((s) => {
    const fresh = list2.slice(0, MAX_STYLES - s.presets.length).map((x) => ({ ...x, id: newStyleId() }));
    if (!fresh.length) {
      toast(`画风最多存 ${MAX_STYLES} 套`, "error");
      return null;
    }
    const at2 = s.presets.findIndex((x) => x.id === id) + 1;
    return { presets: [...s.presets.slice(0, at2), ...fresh, ...s.presets.slice(at2)], current: fresh[0].id };
  }, msg);
  const remove = () => {
    if (styles.length <= 1 || !window.confirm(`删除画风「${st.name}」？`)) return;
    saveStyle((s) => {
      const at2 = s.presets.findIndex((x) => x.id === id);
      const rest = s.presets.filter((x) => x.id !== id);
      return rest.length ? { presets: rest, current: rest[Math.min(Math.max(at2, 0), rest.length - 1)].id } : null;
    }, "已删除");
  };
  const builtins = data.presets?.styles || [];
  const missing = builtins.filter((b) => !styles.some((x) => x.id === b.id));
  const copy2 = (text) => {
    try {
      navigator.clipboard.writeText(text).then(() => toast("已复制到剪贴板"), () => toast("复制失败", "error"));
    } catch {
      toast("复制失败", "error");
    }
  };
  const artistPreview = st.artist ? st.artist : "（不加画师串）";
  const positive = qualityFor(cfg.style, key);
  return /* @__PURE__ */ import_react9.default.createElement(import_react9.default.Fragment, null, /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-section" }, "画风"), /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-skins fg-styles" }, styles.map((x) => /* @__PURE__ */ import_react9.default.createElement("button", { key: x.id, type: "button", className: `fg-skin fg-style${x.id === st.id ? " is-on" : ""}`, onClick: () => x.id !== st.id && saveStyle(() => ({ current: x.id })), title: x.artist || "不加画师串" }, /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-style-cover", style: x.cover ? { backgroundImage: `url(${assetUrl(x.cover)})` } : void 0 }, !x.cover && /* @__PURE__ */ import_react9.default.createElement("span", null, "还没试画")), /* @__PURE__ */ import_react9.default.createElement("b", null, x.name), /* @__PURE__ */ import_react9.default.createElement("span", null, x.artist || "不加画师串"))), /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", className: "fg-skin fg-style is-new", onClick: () => add([{ name: "新画风", artist: "", positive: null, negative: null, cfg: null, cfgRescale: null }], "已新建，下面填画师串") }, /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-style-cover" }, /* @__PURE__ */ import_react9.default.createElement("span", null, "＋")), /* @__PURE__ */ import_react9.default.createElement("b", null, "新建画风"), /* @__PURE__ */ import_react9.default.createElement("span", null, "从空白开始"))), /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-section" }, "编辑「", st.name, "」"), /* @__PURE__ */ import_react9.default.createElement(Field, { label: "名字" }, /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-row" }, /* @__PURE__ */ import_react9.default.createElement(Text, { value: st.name, style: { width: "18cqw" }, onCommit: (v) => edit({ name: v }) }), /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", className: "fg-btn", onClick: () => add([{ ...exportStyle(st), name: st.name.slice(0, 36) + " 副本" }], "已复制一份") }, "复制一份"), /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", className: "fg-btn", disabled: styles.length <= 1, onClick: remove }, "删除"))), /* @__PURE__ */ import_react9.default.createElement(Field, { label: "画师串", hint: "放在提示词最前面。NovelAI 写 artist:xxx，权重写 1.2::artist:xxx::（发给 SD 时自动换成括号写法）。" }, /* @__PURE__ */ import_react9.default.createElement(Area, { value: st.artist, placeholder: "artist:xxx, artist:yyy, 1.2::artist:zzz::, …", onCommit: (v) => edit({ artist: v }) })), /* @__PURE__ */ import_react9.default.createElement(Field, { label: "正面词", hint: st.positive === null ? `跟着当前模型（${key}）用默认质量词，放在提示词最后。` : "放在提示词最后。留空就是不加。" }, /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-row", style: { marginBottom: ".5cqw" } }, /* @__PURE__ */ import_react9.default.createElement(Toggle, { value: st.positive === null, onChange: (v) => edit({ positive: v ? null : positive }) }), /* @__PURE__ */ import_react9.default.createElement("span", { className: "fg-note" }, "用模型默认的质量词")), /* @__PURE__ */ import_react9.default.createElement(Area, { short: true, value: positive, disabled: st.positive === null, onCommit: (v) => edit({ positive: v }) })), /* @__PURE__ */ import_react9.default.createElement(Field, { label: "负面词", hint: st.negative === null ? `跟着当前模型（${key}）用默认负面词。` : "每张图都带上。" }, /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-row", style: { marginBottom: ".5cqw" } }, /* @__PURE__ */ import_react9.default.createElement(Toggle, { value: st.negative === null, onChange: (v) => edit({ negative: v ? null : negativeFor(cfg.style, key) }) }), /* @__PURE__ */ import_react9.default.createElement("span", { className: "fg-note" }, "用模型默认的负面词")), /* @__PURE__ */ import_react9.default.createElement(Area, { short: true, value: negativeFor(cfg.style, key), disabled: st.negative === null, onCommit: (v) => edit({ negative: v }) })), /* @__PURE__ */ import_react9.default.createElement(Field, { label: "CFG", hint: "留空就用「生图渠道」里的设置。CFG Rescale 只有 NovelAI 用（0～1）；OpenAI 渠道两个都不用。" }, /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-row" }, /* @__PURE__ */ import_react9.default.createElement(Text, { style: { width: "11cqw" }, value: st.cfg ?? "", placeholder: own.cfg != null ? `跟随渠道（${own.cfg}）` : "跟随渠道", onCommit: (v) => edit({ cfg: blankNumber(v) }) }), /* @__PURE__ */ import_react9.default.createElement("span", { className: "fg-note" }, "CFG Rescale"), /* @__PURE__ */ import_react9.default.createElement(Text, { style: { width: "11cqw" }, value: st.cfgRescale ?? "", placeholder: own.rescale != null ? `跟随渠道（${own.rescale}）` : "跟随渠道", onCommit: (v) => edit({ cfgRescale: blankNumber(v) }) }), (st.cfg !== null || st.cfgRescale !== null) && /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", className: "fg-btn", onClick: () => edit({ cfg: null, cfgRescale: null }) }, "都跟随渠道"))), /* @__PURE__ */ import_react9.default.createElement(Field, { label: "发出去的样子", hint: "插画、背景、立绘都按这个顺序拼。" }, /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-sent fg-note" }, /* @__PURE__ */ import_react9.default.createElement("div", null, "＋ ", artistPreview, ", ", /* @__PURE__ */ import_react9.default.createElement("i", null, "画面内容……"), positive ? ", " + positive : ""), /* @__PURE__ */ import_react9.default.createElement("div", null, "－ ", negativeFor(cfg.style, key) || "（无）"), /* @__PURE__ */ import_react9.default.createElement("div", null, "CFG ", st.cfg ?? own.cfg ?? "—", cfg.images.backend === "novelai" ? ` · CFG Rescale ${st.cfgRescale ?? own.rescale ?? 0}` : ""))), /* @__PURE__ */ import_react9.default.createElement(Field, { label: "试画", hint: "用下面的「试画内容」和固定种子画一张竖版样图，当这套画风卡片的封面。几套都试画过，放在一起就好比较。" }, /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-row" }, /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", className: "fg-btn is-primary", disabled: busy === "sample:" + id || !data.ready, onClick: () => run("sample:" + id, () => api.sampleStyle(id).then(() => loadConfig(true)), "样图画好了") }, busy === "sample:" + id ? "正在画…" : st.cover ? "重新试画" : "试画一张"), !data.ready && /* @__PURE__ */ import_react9.default.createElement("span", { className: "fg-note" }, data.readyReason))), /* @__PURE__ */ import_react9.default.createElement(Field, { label: "试画内容" }, /* @__PURE__ */ import_react9.default.createElement(Text, { value: cfg.style.sample, onCommit: (v) => saveStyle(() => ({ sample: v })) })), /* @__PURE__ */ import_react9.default.createElement(Field, { label: "分享" }, /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-row" }, /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", className: "fg-btn", onClick: () => copy2(JSON.stringify(exportStyle(st), null, 1)) }, "导出这套"), /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", className: "fg-btn", onClick: () => copy2(JSON.stringify({ styles: styles.map(exportStyle) }, null, 1)) }, "导出全部"), /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", className: "fg-btn", onClick: () => setImportText(importText === null ? "" : null) }, "导入"), missing.length > 0 && /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", className: "fg-btn", onClick: () => saveStyle((s) => ({ presets: [...s.presets, ...builtins.filter((b) => !s.presets.some((x) => x.id === b.id))] }), "已加回内置画风") }, "加回内置画风（", missing.length, "）"))), importText !== null && /* @__PURE__ */ import_react9.default.createElement(Field, { label: "", hint: "粘贴导出的画风（一套或几套），也可以直接粘贴一串画师串。" }, /* @__PURE__ */ import_react9.default.createElement("textarea", { className: "fg-textarea", value: importText, placeholder: '{"name": "…", "artist": "artist:xxx, …"}', onChange: (e) => setImportText(e.target.value), onKeyDown: (e) => e.stopPropagation() }), /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-row", style: { justifyContent: "flex-end", marginTop: ".5cqw" } }, /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", className: "fg-btn", onClick: () => setImportText(null) }, "取消"), /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", className: "fg-btn is-primary", disabled: !importText.trim(), onClick: () => {
    const list2 = parseStyles(importText);
    if (list2.length) {
      add(list2, `已导入 ${list2.length} 套`);
      setImportText(null);
    }
  } }, "导入并使用"))));
}
function DirectorSection({ data, onDirectorLog }) {
  const cfg = data.config;
  const [llm, setLlm] = import_react9.default.useState({ providers: [], models: [] });
  import_react9.default.useEffect(() => {
    api.llm(cfg.director.provider).then(setLlm).catch(() => {
    });
  }, [cfg.director.provider]);
  const p2 = (patch) => patchConfig({ director: patch }).catch((e) => toast(e.message, "error"));
  return /* @__PURE__ */ import_react9.default.createElement(import_react9.default.Fragment, null, /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-section" }, "导演（后台整理）", onDirectorLog && /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", className: "fg-btn", onClick: onDirectorLog }, "查看导演日志")), /* @__PURE__ */ import_react9.default.createElement(Field, { label: "自动整理", hint: "每轮正文写完后，后台模型把它整理成场景：说话人、表情、站位、镜头、天气、选项、插画分镜。正文一字不改。" }, /* @__PURE__ */ import_react9.default.createElement(Toggle, { value: cfg.director.auto, onChange: (v) => p2({ auto: v }) })), /* @__PURE__ */ import_react9.default.createElement(Field, { label: "模型", hint: hostName() === "st" ? "默认跟着酒馆当前的连接；也可以选一套连接配置（在酒馆「API 连接」里存的）专门给导演用，整理用便宜的小模型就够。" : "留空跟随 Tavern 的后台模型。整理用的是便宜的小模型就够。" }, /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-row" }, /* @__PURE__ */ import_react9.default.createElement(Select, { value: cfg.director.provider, onChange: (v) => p2({ provider: v, model: "" }), options: [["", hostName() === "st" ? "跟着酒馆当前的连接" : "跟随 Tavern"], ...llm.providers.map((x) => [x.id, x.name])] }), cfg.director.provider && (llm.models.length ? /* @__PURE__ */ import_react9.default.createElement(Select, { value: cfg.director.model, onChange: (v) => p2({ model: v }), options: [["", "（请选择）"], ...llm.models.map((m) => [m.id, m.name])] }) : /* @__PURE__ */ import_react9.default.createElement(Text, { value: cfg.director.model, placeholder: "模型 ID", onCommit: (v) => p2({ model: v }) })))), /* @__PURE__ */ import_react9.default.createElement(Field, { label: "最大输出 / 温度", hint: "默认 128000（当前主流大模型的输出上限）。模型窗口装不下时自动往下收；模型拒绝这个值时按它报的上限重试一次。导演日志里能看到实际用了多少。" }, /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-row" }, /* @__PURE__ */ import_react9.default.createElement(Text, { type: "number", style: { width: "9cqw" }, value: cfg.director.maxTokens, onCommit: (v) => p2({ maxTokens: v }) }), /* @__PURE__ */ import_react9.default.createElement(Text, { type: "number", style: { width: "7cqw" }, value: cfg.director.temperature, onCommit: (v) => p2({ temperature: v }) }))), /* @__PURE__ */ import_react9.default.createElement(Field, { label: "资料长度", hint: "给导演看多少人物卡 / 世界书（字），用来判断人物外貌。默认 1000000，等于不截断；超出模型窗口时自动缩短。" }, /* @__PURE__ */ import_react9.default.createElement(Text, { type: "number", value: cfg.director.contextChars, onCommit: (v) => p2({ contextChars: v }) })), /* @__PURE__ */ import_react9.default.createElement(Field, { label: "自定义提示词", hint: "留空用内置导演提示词。可用 {{maxImages}} {{styleHint}}。情绪库、配乐曲库附在用户消息里，自定义时也生效。" }, /* @__PURE__ */ import_react9.default.createElement("textarea", { className: "fg-textarea", defaultValue: cfg.director.systemPrompt, onKeyDown: (e) => e.stopPropagation(), onBlur: (e) => {
    if (e.target.value !== cfg.director.systemPrompt) p2({ systemPrompt: e.target.value });
  } })), /* @__PURE__ */ import_react9.default.createElement(Field, { label: "立绘设计师提示词", hint: '留空用内置的。可用 {{styleHint}}。输出格式必须是 {"sprites":[{"key","tags","negative"}]}。' }, /* @__PURE__ */ import_react9.default.createElement("textarea", { className: "fg-textarea", defaultValue: cfg.director.spritePrompt, onKeyDown: (e) => e.stopPropagation(), onBlur: (e) => {
    if (e.target.value !== cfg.director.spritePrompt) p2({ spritePrompt: e.target.value });
  } })), /* @__PURE__ */ import_react9.default.createElement(Field, { label: "插画分镜师提示词", hint: '留空用内置的（Base + 每人一个角色块的写法）。可用 {{styleHint}}。输出格式必须是 {"images":[{"key","tag","nl","characters":[{"name","tag","nl"}],"size"}]}。' }, /* @__PURE__ */ import_react9.default.createElement("textarea", { className: "fg-textarea", defaultValue: cfg.director.cgPrompt, onKeyDown: (e) => e.stopPropagation(), onBlur: (e) => {
    if (e.target.value !== cfg.director.cgPrompt) p2({ cgPrompt: e.target.value });
  } })));
}
function PoseGroups({ poses, onChange }) {
  const changed = Object.keys(poses).length > 0;
  return /* @__PURE__ */ import_react9.default.createElement(Field, { label: "动作组", hint: "每组整张画一张底图（标「底图」的情绪），同组其余情绪在它上面只换脸。想让某个情绪换个动作，就把它挪到别的组；导演新造的情绪跟着它最接近的内置情绪走。改了只影响之后画的。" }, /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-pose-grid" }, POSE_IDS.map((pose) => /* @__PURE__ */ import_react9.default.createElement("div", { key: pose, className: "fg-pose-col" }, /* @__PURE__ */ import_react9.default.createElement("b", null, POSES[pose].label), poseMembers(pose, [], poses).map((e) => /* @__PURE__ */ import_react9.default.createElement("label", { key: e, className: "fg-pose-item" }, /* @__PURE__ */ import_react9.default.createElement("span", null, EMOTIONS[e], anchorOf(pose, [], poses) === e ? /* @__PURE__ */ import_react9.default.createElement("i", null, " · 底图") : null), /* @__PURE__ */ import_react9.default.createElement("select", { value: pose, onChange: (ev) => onChange({ [e]: ev.target.value === EMOTION_POSE[e] ? null : ev.target.value }) }, POSE_IDS.map((id) => /* @__PURE__ */ import_react9.default.createElement("option", { key: id, value: id }, POSES[id].label))))), !poseMembers(pose, [], poses).length && /* @__PURE__ */ import_react9.default.createElement("span", { className: "fg-note" }, "（空着：这组不画）")))), changed && /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", className: "fg-btn is-mini", onClick: () => onChange(Object.fromEntries(Object.keys(poses).map((k) => [k, null]))) }, "恢复默认分组"));
}
var SIZE_SHAPES = [["landscape", "横版"], ["portrait", "竖版"], ["square", "方形"]];
var parseSize = (text) => {
  const m = /^\s*(\d{3,4})\s*[×xX*，, ]\s*(\d{3,4})\s*$/.exec(String(text));
  return m ? [Number(m[1]), Number(m[2])] : null;
};
function ImagesSection({ data }) {
  const cfg = data.config;
  const p2 = (patch) => patchConfig({ images: patch }).catch((e) => toast(e.message, "error"));
  return /* @__PURE__ */ import_react9.default.createElement(import_react9.default.Fragment, null, /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-section" }, "自动配图"), /* @__PURE__ */ import_react9.default.createElement(Field, { label: "自动插画", hint: "导演判断值得画的地方自动出 CG，挂在正文对应段落后。" }, /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-row" }, /* @__PURE__ */ import_react9.default.createElement(Toggle, { value: cfg.images.auto, onChange: (v) => p2({ auto: v }) }), /* @__PURE__ */ import_react9.default.createElement("span", { className: "fg-note" }, "每轮最多"), /* @__PURE__ */ import_react9.default.createElement(Text, { type: "number", style: { width: "6cqw" }, value: cfg.images.maxPerTurn, onCommit: (v) => p2({ maxPerTurn: v }) }), /* @__PURE__ */ import_react9.default.createElement("span", { className: "fg-note" }, "张"))), /* @__PURE__ */ import_react9.default.createElement(Field, { label: "新地点背景" }, /* @__PURE__ */ import_react9.default.createElement(Toggle, { value: cfg.images.backgrounds, onChange: (v) => p2({ backgrounds: v }) })), /* @__PURE__ */ import_react9.default.createElement(Field, { label: "立绘", hint: "角色登场、换装、长期状态变化时，画这一套的平静立绘。" }, /* @__PURE__ */ import_react9.default.createElement(Toggle, { value: cfg.images.portraits, onChange: (v) => p2({ portraits: v }) })), /* @__PURE__ */ import_react9.default.createElement(Field, { label: "情绪差分", hint: "导演用到这一套还没有的情绪时补画（包括它自创的新情绪）。漏掉的可以在人物志里一键补齐。" }, /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-row" }, /* @__PURE__ */ import_react9.default.createElement(Toggle, { value: cfg.images.expressions, onChange: (v) => p2({ expressions: v }) }), /* @__PURE__ */ import_react9.default.createElement("span", { className: "fg-note" }, "每轮最多"), /* @__PURE__ */ import_react9.default.createElement(Text, { type: "number", style: { width: "6cqw" }, value: cfg.images.expressionsPerTurn, onCommit: (v) => p2({ expressionsPerTurn: v }) }), /* @__PURE__ */ import_react9.default.createElement("span", { className: "fg-note" }, "张"))), /* @__PURE__ */ import_react9.default.createElement(Field, { label: "表情只换脸", hint: "galgame 的「一个动作 + 一套表情」：同一套衣服每个动作组整张画一张底图，同组其余情绪用 NovelAI 局部重绘只重画脸（眉、眼、两颊、嘴），身体和衣服一个像素都不动。底图画好后要认一次脸：剧场开着、认脸小模型下好时自动认，认不准的在人物志里点开底图框一下。只对 NovelAI 有效；关掉就像以前一样每个情绪整张画。已经画好的立绘不会自动重画。" }, /* @__PURE__ */ import_react9.default.createElement(Toggle, { value: cfg.images.faceSwap, onChange: (v) => p2({ faceSwap: v }) })), cfg.images.faceSwap && /* @__PURE__ */ import_react9.default.createElement(PoseGroups, { poses: cfg.images.poses || {}, onChange: (poses) => p2({ poses }) }), /* @__PURE__ */ import_react9.default.createElement(Field, { label: "立绘设计师", hint: "立绘提示词由后台模型读完人物卡、世界书和到这一轮为止的全部剧情来写，一个角色一次写一批差分（用导演的模型和资料长度设置；窗口装不下时从最早的剧情删起）。关掉则按档案机械拼。" }, /* @__PURE__ */ import_react9.default.createElement(Toggle, { value: cfg.images.spriteWriter, onChange: (v) => p2({ spriteWriter: v }) })), /* @__PURE__ */ import_react9.default.createElement(Field, { label: "并发" }, /* @__PURE__ */ import_react9.default.createElement(Text, { type: "number", style: { width: "6cqw" }, value: cfg.images.concurrency, onCommit: (v) => p2({ concurrency: v }) })), /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-section" }, "尺寸"), /* @__PURE__ */ import_react9.default.createElement(Field, { label: "插画、背景、立绘", hint: "宽×高，按 64 取整。默认是 NovelAI 常用的三种；超过 1024×1024 面积的尺寸在 NovelAI 上要扣点数。剧场画面默认跟横版一样的比例。" }, /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-row" }, SIZE_SHAPES.map(([shape, label]) => /* @__PURE__ */ import_react9.default.createElement("label", { key: shape, className: "fg-row", style: { gap: ".4em" } }, /* @__PURE__ */ import_react9.default.createElement("span", { className: "fg-note" }, label), /* @__PURE__ */ import_react9.default.createElement(Text, { style: { width: "9cqw" }, value: cfg.images.sizes[shape].join("×"), onCommit: (v) => {
    const size = parseSize(v);
    if (size) p2({ sizes: { ...cfg.images.sizes, [shape]: size } });
    else toast("写成「宽×高」，比如 1216×832", "error");
  } }))))), /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-section" }, "图片文件夹"), /* @__PURE__ */ import_react9.default.createElement(Field, { label: "另存一份", hint: "画好的插画、背景、立绘按「卡名 / 插画 / 第 3 轮 标题」这样的名字复制一份，方便在文件夹里找。那里的图改了、删了都不影响剧场；删局、重新整理也不会删它们。" }, /* @__PURE__ */ import_react9.default.createElement(Toggle, { value: cfg.images.library, onChange: (v) => p2({ library: v }) })), hostName() === "st" ? /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-note" }, "酒馆版存在酒馆的 data/<用户>/user/images/FlowGal-<卡名>/ 里（浏览器没法选别的文件夹），酒馆自带的「图库」也能看到。") : /* @__PURE__ */ import_react9.default.createElement(Field, { label: "位置", hint: `现在是 ${data.paths && data.paths.library || "数据目录下的「图片」"}。留空用数据目录下的「图片」；要换地方就填绝对路径，比如 D:\\Pictures\\FlowGal。` }, /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-row" }, /* @__PURE__ */ import_react9.default.createElement(Text, { value: cfg.images.libraryDir, placeholder: "留空用默认位置", style: { flex: 1 }, onCommit: (v) => p2({ libraryDir: v }) }), /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", className: "fg-btn", onClick: () => openLibrary("").catch((e) => toast(e.message, "error")) }, "打开"))));
}
var landscapeSize = (cfg) => {
  const { width, height } = sizeFor(cfg, "landscape");
  return `${width}×${height}`;
};
function LookSection({ data }) {
  const cfg = data.config;
  const p2 = (patch) => patchConfig({ ui: patch }).catch((e) => toast(e.message, "error"));
  return /* @__PURE__ */ import_react9.default.createElement(import_react9.default.Fragment, null, /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-section" }, "界面皮肤"), /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-skins" }, SKINS.map((s) => /* @__PURE__ */ import_react9.default.createElement("button", { key: s.id, type: "button", className: `fg-skin${cfg.ui.skin === s.id ? " is-on" : ""}`, onClick: () => p2({ skin: s.id }) }, /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-skin-swatch", style: { background: s.swatch } }), /* @__PURE__ */ import_react9.default.createElement("b", null, s.name), /* @__PURE__ */ import_react9.default.createElement("span", null, s.desc)))), /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-section" }, "画面"), /* @__PURE__ */ import_react9.default.createElement(Field, { label: "画面比例", hint: "跟横版插画一样时，插画正好铺满舞台（默认就是 NovelAI 常用的 1216×832；横版尺寸在「画风与配图 → 尺寸」里改）。" }, /* @__PURE__ */ import_react9.default.createElement("select", { className: "fg-select", style: { width: "auto" }, value: cfg.ui.ratio, onChange: (e) => p2({ ratio: e.target.value }) }, /* @__PURE__ */ import_react9.default.createElement("option", { value: "cg" }, "跟横版插画一样（", landscapeSize(data.config), "）"), /* @__PURE__ */ import_react9.default.createElement("option", { value: "wide" }, "16:9 宽屏"))), /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-section" }, "演出"), /* @__PURE__ */ import_react9.default.createElement(Field, { label: "文字速度", hint: "每字毫秒，0 为瞬间显示。" }, /* @__PURE__ */ import_react9.default.createElement("input", { type: "range", min: "0", max: "80", value: cfg.ui.textSpeed, onChange: (e) => p2({ textSpeed: Number(e.target.value) }), style: { width: "100%" } })), /* @__PURE__ */ import_react9.default.createElement(Field, { label: "自动播放间隔" }, /* @__PURE__ */ import_react9.default.createElement("input", { type: "range", min: "400", max: "4000", step: "100", value: cfg.ui.autoDelay, onChange: (e) => p2({ autoDelay: Number(e.target.value) }), style: { width: "100%" } })), /* @__PURE__ */ import_react9.default.createElement(Field, { label: "天气粒子" }, /* @__PURE__ */ import_react9.default.createElement(Toggle, { value: cfg.ui.particles, onChange: (v) => p2({ particles: v }) })), /* @__PURE__ */ import_react9.default.createElement(Field, { label: "写完自动打开剧场" }, /* @__PURE__ */ import_react9.default.createElement(Toggle, { value: cfg.ui.autoOpen, onChange: (v) => p2({ autoOpen: v }) })), /* @__PURE__ */ import_react9.default.createElement(Field, { label: "字体地址", hint: "皮肤字体从这里按 npm 包名加载（默认 jsDelivr 上的 @fontsource 官方包）；连不上时可以换成 unpkg 或自己的镜像，地址以 / 结尾。立绘工作台的认脸模型也从这里下它的运行库。" }, /* @__PURE__ */ import_react9.default.createElement(Text, { value: cfg.ui.fontBase, onCommit: (v) => p2({ fontBase: v }) })), /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-section" }, "认脸模型（立绘工作台的自动框）"), /* @__PURE__ */ import_react9.default.createElement(Field, { label: "下载来源", hint: "模型在 HuggingFace：自动是先连官网、连不上换镜像；只下一次，存在数据目录的 models 文件夹。" }, /* @__PURE__ */ import_react9.default.createElement("select", { className: "fg-select", style: { width: "auto" }, value: cfg.vision.source, onChange: (e) => patchConfig({ vision: { source: e.target.value } }).catch((err) => toast(err.message, "error")) }, /* @__PURE__ */ import_react9.default.createElement("option", { value: "auto" }, "自动（先官网，连不上换镜像）"), /* @__PURE__ */ import_react9.default.createElement("option", { value: "official" }, "只用官网"), /* @__PURE__ */ import_react9.default.createElement("option", { value: "mirror" }, "先用镜像"))), /* @__PURE__ */ import_react9.default.createElement(Field, { label: "镜像地址", hint: "HuggingFace 的镜像站，默认 hf-mirror.com；路径规则要跟官网一样（…/仓库/resolve/版本/文件）。" }, /* @__PURE__ */ import_react9.default.createElement(Text, { value: cfg.vision.mirror, onCommit: (v) => patchConfig({ vision: { mirror: v } }).catch((err) => toast(err.message, "error")) })));
}
var VOICE_GENDER = { female: "女声", male: "男声", "": "不分男女" };
var SOUND_GROUPS = [["stage", "落字音效", "台词演出里的重音、怒吼、崩溃、灵光一闪"], ["ui", "界面音", "按钮、选项、翻页"]];
function SoundSection({ data }) {
  const ui2 = data.config.ui;
  const p2 = (patch) => patchConfig({ ui: patch }).catch((e) => toast(e.message, "error"));
  const [busy, run] = useBusy();
  const fileRef = import_react9.default.useRef(null);
  const slotRef = import_react9.default.useRef("");
  const pick = (slot) => {
    slotRef.current = slot;
    if (fileRef.current) fileRef.current.click();
  };
  const upload = (file2) => {
    const slot = slotRef.current;
    run("up" + slot, async () => {
      setConfig(await api.uploadSound(slot, file2));
    }, "已换成你的音效");
  };
  const remove = (slot) => run("rm" + slot, async () => {
    setConfig(await api.removeSound(slot));
  }, "已删掉，退回默认的那个");
  const narration = ui2.narrationVoice === "off" ? null : { id: ui2.narrationVoice, pitch: ui2.narrationPitch };
  return /* @__PURE__ */ import_react9.default.createElement(import_react9.default.Fragment, null, /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-section" }, "打字音"), /* @__PURE__ */ import_react9.default.createElement(Field, { label: "打字音" }, /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-row" }, /* @__PURE__ */ import_react9.default.createElement(Toggle, { value: ui2.blip, onChange: (v) => p2({ blip: v }) }), /* @__PURE__ */ import_react9.default.createElement("input", { type: "range", min: "0", max: "2", step: "0.1", value: ui2.blipVolume, "aria-label": "打字音音量", onChange: (e) => p2({ blipVolume: Number(e.target.value) }), style: { flex: 1 } }))), /* @__PURE__ */ import_react9.default.createElement(Field, { label: "没指定的角色", hint: "每个角色的声音可以在「人物志 → 档案」里单独挑、调音高。自动：女性、男性各从一组音色里按名字分一个，同一局里先登场的先挑、后来的避开已经有人用的；一组用完了才重复，靠音高错开。没标性别的用经典哔哔。" }, /* @__PURE__ */ import_react9.default.createElement(Select, { value: ui2.voiceDefault, options: [["auto", "自动（按性别分）"], ...VOICES.map((v) => [v.id, `都用「${v.label}」`])], onChange: (v) => p2({ voiceDefault: v }) })), /* @__PURE__ */ import_react9.default.createElement(Field, { label: "旁白" }, /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-row" }, /* @__PURE__ */ import_react9.default.createElement(Select, { value: ui2.narrationVoice, options: [...VOICES.map((v) => [v.id, v.label]), ["off", "不出声"]], style: INLINE, onChange: (v) => p2({ narrationVoice: v }) }), /* @__PURE__ */ import_react9.default.createElement(Select, { value: String(ui2.narrationPitch), options: PITCHES, style: INLINE, onChange: (v) => p2({ narrationPitch: Number(v) }) }), /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", className: "fg-btn", disabled: !narration, onClick: () => previewVoice(narration, ui2) }, "▶ 试听"))), /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-section" }, "音色一览 · ", VOICES.length, " 个（点一下试听）"), /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-skins fg-voices" }, VOICES.map((v) => /* @__PURE__ */ import_react9.default.createElement("button", { key: v.id, type: "button", className: "fg-skin", onClick: () => previewVoice({ id: v.id, pitch: 0 }, ui2) }, /* @__PURE__ */ import_react9.default.createElement("b", null, "▶ ", v.label), /* @__PURE__ */ import_react9.default.createElement("span", null, VOICE_GENDER[v.gender], " · ", v.desc)))), /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-section" }, "音效"), /* @__PURE__ */ import_react9.default.createElement(Field, { label: "音效" }, /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-row" }, /* @__PURE__ */ import_react9.default.createElement(Toggle, { value: ui2.sfx, onChange: (v) => p2({ sfx: v }) }), /* @__PURE__ */ import_react9.default.createElement("input", { type: "range", min: "0", max: "2", step: "0.1", value: ui2.sfxVolume, "aria-label": "音效音量", onChange: (e) => p2({ sfxVolume: Number(e.target.value) }), style: { flex: 1 } }))), SOUND_GROUPS.map(([group, title, note]) => /* @__PURE__ */ import_react9.default.createElement(import_react9.default.Fragment, { key: group }, /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-section" }, title), /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-note" }, note, "。换一个版本会马上响一下；「用自己的」可以传 mp3、m4a、ogg、wav、flac（最大 5 MB，只放前 4 秒）。"), SOUND_SLOTS.filter((s) => s.group === group).map((slot) => {
    const mine = ui2.customSounds[slot.id];
    const options = [...slot.presets.map((x, i) => [x.id, i ? x.label : `${x.label}（默认）`]), ...mine ? [["custom", `我的：${mine.name || "上传的文件"}`]] : [], ["off", "关掉"]];
    return /* @__PURE__ */ import_react9.default.createElement(Field, { key: slot.id, label: slot.label, hint: slot.hint }, /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-row" }, /* @__PURE__ */ import_react9.default.createElement(Select, { value: ui2.sounds[slot.id], options, style: INLINE, onChange: (v) => {
      p2({ sounds: { [slot.id]: v } });
      previewSound(slot.id, v, ui2);
    } }), /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", className: "fg-btn", disabled: ui2.sounds[slot.id] === "off", onClick: () => previewSound(slot.id, ui2.sounds[slot.id], ui2) }, "▶ 试听"), /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", className: "fg-btn", disabled: busy === "up" + slot.id, onClick: () => pick(slot.id) }, busy === "up" + slot.id ? "上传中…" : mine ? "换文件" : "用自己的"), mine && /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", className: "fg-btn", disabled: busy === "rm" + slot.id, onClick: () => remove(slot.id) }, "删掉文件")));
  }))), /* @__PURE__ */ import_react9.default.createElement("input", { ref: fileRef, type: "file", accept: "audio/*", hidden: true, onChange: (e) => {
    const file2 = e.target.files && e.target.files[0];
    e.target.value = "";
    if (file2) upload(file2);
  } }));
}
var sizeMB = (bytes) => (bytes / 1048576).toFixed(1) + " MB";
function TrackCard({ track, playing, onPlay }) {
  const [busy, run] = useBusy();
  const save = (patch) => run("s", async () => {
    await api.updateTrack(track.id, patch);
    await loadMusic();
  });
  return /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-track" }, /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", className: `fg-track-play${playing ? " is-on" : ""}`, title: playing ? "停止试听" : "试听", onClick: onPlay }, playing ? "■" : "▶"), /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-track-body" }, /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-row" }, /* @__PURE__ */ import_react9.default.createElement(Text, { value: track.name, style: { flex: 1, width: "auto", fontWeight: 600 }, onCommit: (v) => save({ name: v }) }), /* @__PURE__ */ import_react9.default.createElement("span", { className: "fg-note", title: track.file }, sizeMB(track.bytes)), /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", className: "fg-btn", disabled: busy === "d", onClick: () => {
    if (window.confirm(`从曲库删除「${track.name}」？电脑上的原文件不受影响。`)) run("d", async () => {
      await api.removeTrack(track.id);
      await loadMusic();
    }, "已删除");
  } }, "删除")), /* @__PURE__ */ import_react9.default.createElement(TextArea, { value: track.description, placeholder: "听起来什么样、适合什么场面。例如：慢板萨克斯和雨声，深夜独处、心事重重，也适合告白前的沉默", onCommit: (v) => save({ description: v }) }), /* @__PURE__ */ import_react9.default.createElement(Text, { value: (track.tags || []).join("、"), placeholder: "标签，用顿号或逗号隔开：深夜、城市、雨、怀旧", style: { width: "100%" }, onCommit: (v) => save({ tags: v }) })));
}
function TextArea({ value, onCommit, placeholder }) {
  const [v, setV] = import_react9.default.useState(value ?? "");
  import_react9.default.useEffect(() => {
    setV(value ?? "");
  }, [value]);
  return /* @__PURE__ */ import_react9.default.createElement("textarea", { className: "fg-textarea fg-track-desc", value: v, placeholder, onChange: (e) => setV(e.target.value), onBlur: () => {
    if (v !== (value ?? "")) onCommit(v);
  }, onKeyDown: (e) => e.stopPropagation() });
}
function MusicSection({ data }) {
  const cfg = data.config;
  const tracks = useMusic();
  const [playing, setPlaying] = import_react9.default.useState("");
  const [progress, setProgress] = import_react9.default.useState("");
  const folderRef = import_react9.default.useRef(null);
  const filesRef = import_react9.default.useRef(null);
  const p2 = (patch) => patchConfig({ ui: patch }).catch((e) => toast(e.message, "error"));
  import_react9.default.useEffect(() => () => stopPreview(), []);
  const play = (track) => {
    if (playing === track.id) {
      stopPreview();
      return;
    }
    previewTrack({ id: track.id, url: assetUrl(track.assetId) }, () => setPlaying((id) => id === track.id ? "" : id));
    setPlaying(track.id);
  };
  const importFiles = async (list2) => {
    const files2 = [...list2 || []];
    if (!files2.length) return;
    let meta = /* @__PURE__ */ new Map();
    const sidecar = files2.find((f) => f.name === MUSIC_SIDECAR);
    if (sidecar) {
      try {
        meta = readSidecar(await sidecar.text());
      } catch (e) {
        toast(`描述文件没读成：${e.message}。先只导入音频`, "error");
      }
    }
    const audio = files2.filter((f) => AUDIO_FILE.test(f.name)).sort((a, b) => a.name.localeCompare(b.name, "zh-CN", { numeric: true }));
    if (!audio.length) {
      toast("没找到音频文件（mp3、m4a、aac、ogg、opus、wav、flac）", "error");
      return;
    }
    const failed = [];
    let described = 0;
    for (let i = 0; i < audio.length; i++) {
      const file2 = audio[i];
      setProgress(`导入中 ${i + 1} / ${audio.length}：${file2.name}`);
      try {
        const track = await api.uploadTrack(file2);
        const m = meta.get(file2.name);
        if (m) {
          await api.updateTrack(track.id, m);
          described++;
        }
      } catch (e) {
        failed.push(`${file2.name}：${e.message}`);
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
  return /* @__PURE__ */ import_react9.default.createElement(import_react9.default.Fragment, null, /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-section" }, "播放"), /* @__PURE__ */ import_react9.default.createElement(Field, { label: "配乐" }, /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-row" }, /* @__PURE__ */ import_react9.default.createElement(Toggle, { value: cfg.ui.bgm, onChange: (v) => p2({ bgm: v }) }), /* @__PURE__ */ import_react9.default.createElement("input", { type: "range", min: "0", max: "1", step: "0.05", value: cfg.ui.bgmVolume, onChange: (e) => p2({ bgmVolume: Number(e.target.value) }), style: { flex: 1 } }))), /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-section" }, "我的曲库", tracks ? ` · ${tracks.length} 首` : ""), /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-note" }, "后台导演整理每一轮时会读到下面每首的描述和标签，自己决定这一幕放哪首、哪句话换歌。描述随便写：听感、乐器、适合的场面和情绪都行，越具体导演选得越准。导演还没整理完的轮次会先按描述粗配一首。"), /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-row", style: { margin: "1cqw 0" } }, /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", className: "fg-btn is-primary", disabled: Boolean(progress), onClick: () => folderRef.current && folderRef.current.click() }, "导入文件夹"), /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", className: "fg-btn", disabled: Boolean(progress), onClick: () => filesRef.current && filesRef.current.click() }, "添加曲子"), /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", className: "fg-btn", disabled: !tracks || !tracks.some((t) => t.file), onClick: exportSidecar }, "导出描述"), progress && /* @__PURE__ */ import_react9.default.createElement("span", { className: "fg-pill is-busy" }, progress), /* @__PURE__ */ import_react9.default.createElement("input", { ref: folderRef, type: "file", webkitdirectory: "", multiple: true, hidden: true, onChange: (e) => {
    importFiles(e.target.files);
    e.target.value = "";
  } }), /* @__PURE__ */ import_react9.default.createElement("input", { ref: filesRef, type: "file", accept: `audio/*,${MUSIC_SIDECAR}`, multiple: true, hidden: true, onChange: (e) => {
    importFiles(e.target.files);
    e.target.value = "";
  } })), /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-note" }, "文件夹里放一份 ", /* @__PURE__ */ import_react9.default.createElement("code", null, MUSIC_SIDECAR), "（就是「导出描述」得到的文件），导入时会按文件名自动带上描述；同一首再导入不会重复存，但描述会以这个文件为准。"), !tracks && /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-note" }, "读取中…"), tracks && !tracks.length && /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-note", style: { marginTop: "1cqw" } }, "曲库还是空的。没有曲子时剧场不放音乐。"), tracks && tracks.map((t) => /* @__PURE__ */ import_react9.default.createElement(TrackCard, { key: t.id, track: t, playing: playing === t.id, onPlay: () => play(t) })));
}
var stamp = (t) => new Date(t).toLocaleString("zh-CN", { year: "numeric", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
function UpdateSection({ data }) {
  const u = useUpdate();
  const [busy, run] = useBusy();
  const act = (id, action, ok) => run(id, async () => setUpdate((await api.runUpdate(action)).update), ok);
  const last = u && u.last;
  return /* @__PURE__ */ import_react9.default.createElement(import_react9.default.Fragment, null, /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-section" }, "版本与更新"), !u && /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-note" }, "读取中…"), u && !u.managed && hostName() === "st" && /* @__PURE__ */ import_react9.default.createElement(import_react9.default.Fragment, null, /* @__PURE__ */ import_react9.default.createElement(Field, { label: "当前版本" }, "v", "0.2.0"), /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-note" }, "酒馆版的更新由酒馆管：扩展 → 管理扩展 → FlowGal → 更新（也可以打开它的自动更新）。更新后刷新网页就用上新版本。")), u && !u.managed && hostName() !== "st" && /* @__PURE__ */ import_react9.default.createElement(import_react9.default.Fragment, null, /* @__PURE__ */ import_react9.default.createElement(Field, { label: "当前版本" }, "v", "0.2.0"), /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-note" }, u.reason, " 想在这里一键更新：在 DSH 终端里 ", /* @__PURE__ */ import_react9.default.createElement("code", null, "git clone https://github.com/clanso/flowgal.git"), "，", /* @__PURE__ */ import_react9.default.createElement("code", null, "dsh plugin --profile tavern remove flowgal"), " 后再 ", /* @__PURE__ */ import_react9.default.createElement("code", null, "dsh plugin --profile tavern add"), " 这个文件夹，然后重启 DSH。")), u && u.managed && /* @__PURE__ */ import_react9.default.createElement(import_react9.default.Fragment, null, /* @__PURE__ */ import_react9.default.createElement(Field, { label: "当前版本", hint: u.current.subject }, "v", "0.2.0", " · ", u.current.sha, " · ", stamp(u.current.time)), /* @__PURE__ */ import_react9.default.createElement(Field, { label: "跟踪分支" }, u.current.tracking), u.restartRequired && /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-update-done" }, "✓ 新版本已经下载好了。重启 DSH（关掉再打开）后刷新网页，就会用上新版本。"), /* @__PURE__ */ import_react9.default.createElement(Field, { label: "远端" }, !last ? /* @__PURE__ */ import_react9.default.createElement("span", { className: "fg-note" }, "还没检查") : last.error ? /* @__PURE__ */ import_react9.default.createElement("span", { className: "fg-err" }, last.error, last.fallback ? `；可以改跟 ${last.fallback} 分支` : "") : last.behind ? /* @__PURE__ */ import_react9.default.createElement("b", { className: "fg-ok" }, "有新版本：", last.commits.length || last.behind, " 个更新（", last.target, "）") : /* @__PURE__ */ import_react9.default.createElement("span", { className: "fg-ok" }, "已是最新"), last && /* @__PURE__ */ import_react9.default.createElement("span", { className: "fg-note" }, "　检查于 ", stamp(last.checkedAt))), last && last.commits.length > 0 && /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-changes" }, last.commits.map((c) => /* @__PURE__ */ import_react9.default.createElement("div", { key: c.sha }, /* @__PURE__ */ import_react9.default.createElement("code", null, c.sha), /* @__PURE__ */ import_react9.default.createElement("span", null, c.subject), /* @__PURE__ */ import_react9.default.createElement("small", null, stamp(c.time))))), /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-row", style: { margin: "1cqw 0 0 15.2cqw" } }, /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", className: "fg-btn", disabled: Boolean(busy), onClick: () => run("check", () => loadUpdate("force")) }, busy === "check" ? "检查中…" : "检查更新"), updateAvailable(u) && /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", className: "fg-btn is-primary", disabled: Boolean(busy), onClick: () => act("apply", "apply", "已更新，重启 DSH 后生效") }, busy === "apply" ? "更新中…" : "立即更新"), last && last.gone && last.fallback && /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", className: "fg-btn is-primary", disabled: Boolean(busy), onClick: () => act("switch", "switch", `已切到 ${last.fallback}，重启 DSH 后生效`) }, busy === "switch" ? "切换中…" : `改跟 ${last.fallback} 并更新`)), /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-note", style: { margin: "0.8cqw 0 0 15.2cqw" } }, "只做快进更新：你本地改过的文件不会被覆盖，有冲突时会停下来把原因写在这里。")), /* @__PURE__ */ import_react9.default.createElement(Field, { label: "自动检查", hint: "打开剧场时顺便看一眼有没有新版本，最多 12 小时一次。" }, /* @__PURE__ */ import_react9.default.createElement(Toggle, { value: data.config.ui.updateCheck, onChange: (v) => patchConfig({ ui: { updateCheck: v } }).catch((e) => toast(e.message, "error")) })));
}
function Settings({ onClose, onDirectorLog = null, initialTab = "look" }) {
  const data = useConfig();
  const [tab, setTab] = import_react9.default.useState(initialTab);
  return /* @__PURE__ */ import_react9.default.createElement(
    Panel,
    {
      title: "设置",
      en: "Config",
      onClose,
      tabs: [{ id: "look", label: "外观与演出" }, { id: "sound", label: "声音" }, { id: "music", label: "配乐" }, { id: "director", label: "导演" }, { id: "images", label: "生图渠道" }, { id: "style", label: "画风与配图" }, { id: "about", label: "版本与更新" }],
      tab,
      onTab: setTab,
      actions: data && /* @__PURE__ */ import_react9.default.createElement("span", { className: `fg-pill${data.ready ? "" : " fg-err"}` }, data.ready ? "生图已就绪" : data.readyReason)
    },
    !data && /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-note" }, "读取设置中…"),
    data && tab === "look" && /* @__PURE__ */ import_react9.default.createElement(LookSection, { data }),
    data && tab === "sound" && /* @__PURE__ */ import_react9.default.createElement(SoundSection, { data }),
    data && tab === "music" && /* @__PURE__ */ import_react9.default.createElement(MusicSection, { data }),
    data && tab === "director" && /* @__PURE__ */ import_react9.default.createElement(DirectorSection, { data, onDirectorLog }),
    data && tab === "images" && /* @__PURE__ */ import_react9.default.createElement(BackendSection, { data }),
    data && tab === "style" && /* @__PURE__ */ import_react9.default.createElement(import_react9.default.Fragment, null, /* @__PURE__ */ import_react9.default.createElement(StyleSection, { data }), /* @__PURE__ */ import_react9.default.createElement(ImagesSection, { data })),
    data && tab === "about" && /* @__PURE__ */ import_react9.default.createElement(UpdateSection, { data }),
    data && /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-note", style: { marginTop: "2cqw" } }, hostName() === "st" ? /* @__PURE__ */ import_react9.default.createElement(import_react9.default.Fragment, null, "Key 存在", data.secretStorage, "，出图时由这个页面直接带去请求；别把酒馆的数据文件夹发给别人。") : /* @__PURE__ */ import_react9.default.createElement(import_react9.default.Fragment, null, "Key 只存在 DSH 宿主（优先存进 DSH 凭据库：", data.secretStorage, "），浏览器只看得到「有没有填」。"))
  );
}

// src/client/theater/DirectorLog.jsx
var import_react10 = __toESM(require("react"), 1);
var lookText = (v) => typeof v === "string" ? v : v ? formatLook(v) : "";
var STATUS = { running: ["进行中", "is-running"], ok: ["完成", "is-ok"], failed: ["失败", "is-failed"], cancelled: ["已停止", "is-cancelled"] };
var REASON = { auto: "正文写完后自动整理", force: "手动重新整理", sprite: "写立绘提示词", cg: "写插画提示词" };
var WRITER = { ai: "模型写的", fallback: "按档案拼的", user: "玩家改的" };
var sourceLabel = (source) => ({ tavern: hostName() === "st" ? "跟着酒馆当前的连接" : "跟随 Tavern 后台模型", plugin: "插件设置里指定" })[source];
var USAGE_LABEL = { inputTokens: "输入", outputTokens: "输出", reasoningTokens: "思考", cachedInputTokens: "缓存命中", cacheReadTokens: "缓存读", cacheWriteTokens: "缓存写", totalTokens: "合计" };
var SHAPE_LABEL = { landscape: "横版", portrait: "竖版", square: "方形" };
var entryTitle = (e) => e.kind === "sprite" ? `立绘 · ${e.name}` : e.kind === "cg" ? `插画 · 第 ${e.turn} 轮` : `第 ${e.turn} 轮`;
var num = (n) => Number(n || 0).toLocaleString("en-US");
var secs = (ms) => ms >= 6e4 ? `${Math.floor(ms / 6e4)} 分 ${Math.round(ms % 6e4 / 1e3)} 秒` : `${(ms / 1e3).toFixed(1)} 秒`;
var clock = (at2) => new Date(at2).toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" });
var usageText = (usage) => Object.entries(usage || {}).map(([k, v]) => `${USAGE_LABEL[k] || k} ${num(v)}`).join(" · ");
function useNow(active) {
  const [now, setNow] = import_react10.default.useState(Date.now());
  import_react10.default.useEffect(() => {
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
  const ref = import_react10.default.useRef(null);
  const pinned = import_react10.default.useRef(true);
  import_react10.default.useLayoutEffect(() => {
    if (follow && pinned.current && ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [text, follow]);
  return /* @__PURE__ */ import_react10.default.createElement(
    "pre",
    {
      ref,
      className: `fg-dlog-pre${cursor ? " has-cursor" : ""}`,
      onScroll: (e) => {
        const el = e.currentTarget;
        pinned.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
      }
    },
    text || /* @__PURE__ */ import_react10.default.createElement("span", { className: "fg-note" }, empty)
  );
}
function Block({ label, text, children, actions }) {
  return /* @__PURE__ */ import_react10.default.createElement("div", { className: "fg-dlog-block" }, /* @__PURE__ */ import_react10.default.createElement("div", { className: "fg-dlog-label" }, /* @__PURE__ */ import_react10.default.createElement("span", null, label), /* @__PURE__ */ import_react10.default.createElement("span", { className: "fg-spacer" }), actions, text != null && /* @__PURE__ */ import_react10.default.createElement("button", { type: "button", className: "fg-btn is-mini", onClick: () => copy(text) }, "复制")), children);
}
function StatusPill({ status }) {
  const [label, cls] = STATUS[status] || [status, ""];
  return /* @__PURE__ */ import_react10.default.createElement("span", { className: `fg-dlog-status ${cls}` }, label);
}
function LogRow({ e, on, onClick }) {
  return /* @__PURE__ */ import_react10.default.createElement("button", { type: "button", className: `fg-dlog-row${on ? " is-on" : ""}`, onClick }, /* @__PURE__ */ import_react10.default.createElement("div", { className: "fg-dlog-row-head" }, /* @__PURE__ */ import_react10.default.createElement("b", null, entryTitle(e)), /* @__PURE__ */ import_react10.default.createElement(StatusPill, { status: e.status })), /* @__PURE__ */ import_react10.default.createElement("div", { className: "fg-dlog-row-meta" }, clock(e.at), " · ", e.status === "running" ? "进行中" : secs(e.ms), e.attempts > 1 ? ` · ${e.attempts} 次尝试` : ""), /* @__PURE__ */ import_react10.default.createElement("div", { className: "fg-dlog-row-meta" }, e.model || "（没有模型）"), e.summary && /* @__PURE__ */ import_react10.default.createElement("div", { className: "fg-dlog-row-sum" }, e.summary), e.error && /* @__PURE__ */ import_react10.default.createElement("div", { className: "fg-dlog-row-sum fg-err" }, e.error));
}
var TYPE_LABEL = { dialogue: "台词", narration: "旁白", thought: "心声" };
function Chip({ k, children }) {
  return /* @__PURE__ */ import_react10.default.createElement("span", { className: "fg-dlog-chip" }, k && /* @__PURE__ */ import_react10.default.createElement("i", null, k), children);
}
function ScriptView({ script, units }) {
  if (!script) return /* @__PURE__ */ import_react10.default.createElement("div", { className: "fg-note" }, "这次没有得到可用的脚本，看「原始输出」里模型回了什么。");
  const s = script.scene;
  const tagged = units.filter((u) => script.lines[u.id] && Object.keys(script.lines[u.id]).length).length;
  const skipped = new Set(script.skip || []);
  return /* @__PURE__ */ import_react10.default.createElement(import_react10.default.Fragment, null, /* @__PURE__ */ import_react10.default.createElement(Block, { label: "场景" }, /* @__PURE__ */ import_react10.default.createElement("div", { className: "fg-dlog-chips" }, /* @__PURE__ */ import_react10.default.createElement(Chip, { k: "地点" }, s.location || "—"), /* @__PURE__ */ import_react10.default.createElement(Chip, { k: "时段" }, TIME_LABEL[s.time] || s.time), /* @__PURE__ */ import_react10.default.createElement(Chip, { k: "天气" }, WEATHER_LABEL[s.weather] || s.weather), /* @__PURE__ */ import_react10.default.createElement(Chip, { k: "配乐" }, MOOD_LABEL[s.mood] || s.mood), /* @__PURE__ */ import_react10.default.createElement(Chip, { k: "转场" }, TRANSITION_LABEL[s.transition] || s.transition)), s.bg && /* @__PURE__ */ import_react10.default.createElement("div", { className: "fg-note" }, "背景提示词：", s.bg)), /* @__PURE__ */ import_react10.default.createElement(Block, { label: `出场 · ${script.cast.length}` }, /* @__PURE__ */ import_react10.default.createElement("div", { className: "fg-dlog-chips" }, script.cast.map((c) => /* @__PURE__ */ import_react10.default.createElement(Chip, { key: c.name, k: POS_LABEL[c.pos] || c.pos }, c.name)), !script.cast.length && /* @__PURE__ */ import_react10.default.createElement("span", { className: "fg-note" }, "没有人物上场"))), /* @__PURE__ */ import_react10.default.createElement(Block, { label: `逐句标注 · ${tagged} / ${units.length - skipped.size} 句${skipped.size ? ` · 不演 ${skipped.size} 句` : ""}` }, /* @__PURE__ */ import_react10.default.createElement("div", { className: "fg-dlog-lines" }, units.map((u) => {
    const l = script.lines[u.id] || {};
    if (skipped.has(u.id)) return /* @__PURE__ */ import_react10.default.createElement("div", { key: u.id, className: "fg-dlog-line is-skipped" }, /* @__PURE__ */ import_react10.default.createElement("span", { className: "fg-dlog-uid" }, u.id), /* @__PURE__ */ import_react10.default.createElement("div", { className: "fg-dlog-utext" }, u.text), /* @__PURE__ */ import_react10.default.createElement("div", { className: "fg-dlog-chips" }, /* @__PURE__ */ import_react10.default.createElement("span", { className: "fg-note" }, "不是故事 · 不演")));
    const marks = [
      l.type && /* @__PURE__ */ import_react10.default.createElement(Chip, { key: "type", k: "改判" }, TYPE_LABEL[l.type] || l.type),
      l.sp && /* @__PURE__ */ import_react10.default.createElement(Chip, { key: "sp", k: "说话" }, l.sp, l.as ? `（显示为 ${l.as}）` : ""),
      l.emo && /* @__PURE__ */ import_react10.default.createElement(Chip, { key: "emo", k: "情绪" }, emotionLabel(l.emo)),
      l.sym && /* @__PURE__ */ import_react10.default.createElement(Chip, { key: "sym", k: "符号" }, SYMBOL_LABEL[l.sym] || l.sym),
      l.cam && /* @__PURE__ */ import_react10.default.createElement(Chip, { key: "cam", k: "镜头" }, CAMERA_LABEL[l.cam] || l.cam),
      l.card && /* @__PURE__ */ import_react10.default.createElement(Chip, { key: "card", k: "卡片" }, CARD_LABEL[l.card] || l.card),
      l.enter && /* @__PURE__ */ import_react10.default.createElement(Chip, { key: "in", k: "登场" }, l.enter.map((e) => e.name + (e.pos ? `（${POS_LABEL[e.pos] || e.pos}）` : "")).join("、")),
      l.exit && /* @__PURE__ */ import_react10.default.createElement(Chip, { key: "out", k: "退场" }, l.exit.join("、"))
    ].filter(Boolean);
    return /* @__PURE__ */ import_react10.default.createElement("div", { key: u.id, className: `fg-dlog-line${marks.length ? "" : " is-plain"}` }, /* @__PURE__ */ import_react10.default.createElement("span", { className: "fg-dlog-uid" }, u.id), /* @__PURE__ */ import_react10.default.createElement("div", { className: "fg-dlog-utext" }, (l.type || u.type) === "dialogue" ? `「${u.text}」` : (l.type || u.type) === "thought" ? `（${u.text}）` : u.text), /* @__PURE__ */ import_react10.default.createElement("div", { className: "fg-dlog-chips" }, marks.length ? marks : /* @__PURE__ */ import_react10.default.createElement("span", { className: "fg-note" }, "旁白 · 无演出")));
  }))), script.choices.length > 0 && /* @__PURE__ */ import_react10.default.createElement(Block, { label: `选项 · ${script.choices.length}` }, /* @__PURE__ */ import_react10.default.createElement("ol", { className: "fg-dlog-list-plain" }, script.choices.map((c, i) => /* @__PURE__ */ import_react10.default.createElement("li", { key: i }, c)))), /* @__PURE__ */ import_react10.default.createElement(Block, { label: `插画分镜 · ${script.images.length}` }, script.images.map((img, i) => /* @__PURE__ */ import_react10.default.createElement("div", { key: i, className: "fg-dlog-card" }, /* @__PURE__ */ import_react10.default.createElement("div", { className: "fg-dlog-chips" }, /* @__PURE__ */ import_react10.default.createElement(Chip, { k: "标题" }, img.title || "—"), /* @__PURE__ */ import_react10.default.createElement(Chip, { k: "显示" }, img.after, img.until && img.until !== img.after ? ` → ${img.until}` : img.until ? "" : " → 本轮结束"), img.who && img.who.length ? /* @__PURE__ */ import_react10.default.createElement(Chip, { k: "入画" }, img.who.join("、")) : null, img.shape && /* @__PURE__ */ import_react10.default.createElement(Chip, { k: "画幅" }, SHAPE_LABEL[img.shape] || img.shape)), img.moment && /* @__PURE__ */ import_react10.default.createElement("div", null, img.moment), img.tags && /* @__PURE__ */ import_react10.default.createElement("div", { className: "fg-dlog-mono" }, img.tags), img.desc && /* @__PURE__ */ import_react10.default.createElement("div", { className: "fg-note" }, img.desc))), !script.images.length && /* @__PURE__ */ import_react10.default.createElement("div", { className: "fg-note" }, "导演觉得这一轮不需要插画（或设置里关了自动插画）。")), script.emotions && script.emotions.length > 0 && /* @__PURE__ */ import_react10.default.createElement(Block, { label: `新加进情绪库 · ${script.emotions.length}` }, script.emotions.map((e) => /* @__PURE__ */ import_react10.default.createElement("div", { key: e.name, className: "fg-dlog-card" }, /* @__PURE__ */ import_react10.default.createElement("b", null, e.name), e.base ? /* @__PURE__ */ import_react10.default.createElement("span", { className: "fg-note" }, " · 接近 ", emotionLabel(e.base)) : null, e.desc && /* @__PURE__ */ import_react10.default.createElement("div", { className: "fg-note" }, e.desc)))), /* @__PURE__ */ import_react10.default.createElement(Block, { label: `角色档案更新 · ${script.people.length}` }, script.people.map((p2, i) => /* @__PURE__ */ import_react10.default.createElement("div", { key: i, className: "fg-dlog-card" }, /* @__PURE__ */ import_react10.default.createElement("b", null, p2.name), p2.gender ? /* @__PURE__ */ import_react10.default.createElement("span", { className: "fg-note" }, " · ", p2.gender) : null, lookText(p2.appearance) && /* @__PURE__ */ import_react10.default.createElement("div", { className: "fg-dlog-mono" }, "建档：", lookText(p2.appearance)), lookText(p2.change) && /* @__PURE__ */ import_react10.default.createElement("div", { className: "fg-dlog-mono" }, "永久变化：", lookText(p2.change)), p2.outfit && /* @__PURE__ */ import_react10.default.createElement("div", { className: "fg-dlog-mono" }, "换装：", p2.outfit, p2.outfitTags ? `（${p2.outfitTags}）` : ""), p2.states && /* @__PURE__ */ import_react10.default.createElement("div", { className: "fg-dlog-mono" }, "长期状态：", p2.states.length ? p2.states.map((s2) => `${s2.name}${s2.tags ? `（${s2.tags}）` : ""}`).join("、") : "全部结束"), p2.temp && /* @__PURE__ */ import_react10.default.createElement("div", { className: "fg-dlog-mono" }, "临时状态：", p2.temp))), !script.people.length && /* @__PURE__ */ import_react10.default.createElement("div", { className: "fg-note" }, "这一轮没有新建或修改档案。")));
}
function SpritesView({ sprites }) {
  if (!sprites || !sprites.length) return /* @__PURE__ */ import_react10.default.createElement("div", { className: "fg-note" }, "这次没有写出提示词，看「原始输出」里模型回了什么。");
  return /* @__PURE__ */ import_react10.default.createElement(Block, { label: `差分提示词 · ${sprites.length}` }, sprites.map((sp) => /* @__PURE__ */ import_react10.default.createElement("div", { key: sp.key, className: "fg-dlog-card" }, /* @__PURE__ */ import_react10.default.createElement("div", { className: "fg-dlog-chips" }, /* @__PURE__ */ import_react10.default.createElement(Chip, { k: "差分" }, sp.label), sp.writer && /* @__PURE__ */ import_react10.default.createElement(Chip, { k: "来源" }, WRITER[sp.writer] || sp.writer)), /* @__PURE__ */ import_react10.default.createElement("div", { className: "fg-dlog-mono" }, sp.tags || "—"), sp.negative && /* @__PURE__ */ import_react10.default.createElement("div", { className: "fg-note" }, "额外负面：", sp.negative))));
}
function CgsView({ cgs }) {
  if (!cgs || !cgs.length) return /* @__PURE__ */ import_react10.default.createElement("div", { className: "fg-note" }, "这次没有写出提示词，看「原始输出」里模型回了什么。");
  return /* @__PURE__ */ import_react10.default.createElement(Block, { label: `插画提示词 · ${cgs.length}` }, cgs.map((cg) => /* @__PURE__ */ import_react10.default.createElement("div", { key: cg.key, className: "fg-dlog-card" }, /* @__PURE__ */ import_react10.default.createElement("div", { className: "fg-dlog-chips" }, /* @__PURE__ */ import_react10.default.createElement(Chip, { k: "插画" }, cg.label), cg.shape && /* @__PURE__ */ import_react10.default.createElement(Chip, { k: "画幅" }, SHAPE_LABEL[cg.shape] || cg.shape), cg.writer && /* @__PURE__ */ import_react10.default.createElement(Chip, { k: "来源" }, WRITER[cg.writer] || cg.writer)), cg.tags || cg.characters?.length ? /* @__PURE__ */ import_react10.default.createElement(import_react10.default.Fragment, null, /* @__PURE__ */ import_react10.default.createElement("div", { className: "fg-dlog-mono" }, /* @__PURE__ */ import_react10.default.createElement("i", { className: "fg-dlog-k" }, "Base"), cg.tags || "—"), cg.desc && /* @__PURE__ */ import_react10.default.createElement("div", { className: "fg-note" }, cg.desc), (cg.characters || []).map((c, i) => /* @__PURE__ */ import_react10.default.createElement("div", { key: i, className: "fg-dlog-cgchar" }, /* @__PURE__ */ import_react10.default.createElement("div", { className: "fg-dlog-mono" }, /* @__PURE__ */ import_react10.default.createElement("i", { className: "fg-dlog-k" }, c.name || `角色 ${i + 1}`), c.tag || "—"), c.nl && /* @__PURE__ */ import_react10.default.createElement("div", { className: "fg-note" }, c.nl)))) : /* @__PURE__ */ import_react10.default.createElement("div", { className: "fg-note" }, "没写出来，出图时按档案拼。"))));
}
function Attempts({ attempts }) {
  if (!attempts.length) return /* @__PURE__ */ import_react10.default.createElement("div", { className: "fg-note" }, "还没有发出请求。");
  return attempts.map((a, i) => /* @__PURE__ */ import_react10.default.createElement(Block, { key: i, text: a.output, label: /* @__PURE__ */ import_react10.default.createElement(import_react10.default.Fragment, null, "第 ", i + 1, " 次", a.note ? ` · ${a.note}` : "", " · 最大输出 ", num(a.maxTokens), " · ", secs(a.ms), a.usage ? ` · ${usageText(a.usage)}` : "") }, a.error && /* @__PURE__ */ import_react10.default.createElement("div", { className: "fg-err fg-dlog-error" }, a.error), a.reasoning && /* @__PURE__ */ import_react10.default.createElement("details", { className: "fg-dlog-think" }, /* @__PURE__ */ import_react10.default.createElement("summary", null, "模型思考 · ", num(a.reasoning.length), " 字"), /* @__PURE__ */ import_react10.default.createElement(Pre, { text: a.reasoning })), /* @__PURE__ */ import_react10.default.createElement(Pre, { text: a.output, empty: "（模型没有输出文字）" })));
}
function LogDetail({ gameId, summary }) {
  const running = summary.status === "running";
  const [entry, setEntry] = import_react10.default.useState(null);
  const [loadError, setLoadError] = import_react10.default.useState("");
  const [tab, setTab] = import_react10.default.useState(running ? "live" : "result");
  const [stopping, setStopping] = import_react10.default.useState(false);
  const now = useNow(running);
  import_react10.default.useEffect(() => {
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
  import_react10.default.useEffect(() => {
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
  const sprite = summary.kind === "sprite";
  const cg = summary.kind === "cg";
  const writer = sprite || cg;
  const tabs = running ? [["live", "实时输出"], ["prompt", "提示词"]] : [["result", writer ? "写出的提示词" : "整理结果"], ["raw", `原始输出${summary.attempts > 1 ? ` · ${summary.attempts} 次` : ""}`], ["prompt", "提示词"]];
  const live = summary.live || { output: "", reasoning: "", chars: 0, note: "" };
  const elapsed = running ? Math.max(summary.ms, now - summary.at) : summary.ms;
  return /* @__PURE__ */ import_react10.default.createElement("div", { className: "fg-dlog-detail" }, /* @__PURE__ */ import_react10.default.createElement("div", { className: "fg-dlog-head" }, /* @__PURE__ */ import_react10.default.createElement("div", { className: "fg-dlog-title" }, sprite ? `立绘 · ${summary.name}（读到第 ${summary.turn} 轮）` : entryTitle(summary), " ", /* @__PURE__ */ import_react10.default.createElement(StatusPill, { status: summary.status }), /* @__PURE__ */ import_react10.default.createElement("span", { className: "fg-spacer" }), running && /* @__PURE__ */ import_react10.default.createElement("button", { type: "button", className: "fg-btn", disabled: stopping, onClick: stop }, writer ? "停止" : "停止整理")), /* @__PURE__ */ import_react10.default.createElement("div", { className: "fg-dlog-facts" }, /* @__PURE__ */ import_react10.default.createElement("div", null, /* @__PURE__ */ import_react10.default.createElement("i", null, "模型"), summary.model || "—", summary.provider ? /* @__PURE__ */ import_react10.default.createElement("span", { className: "fg-note" }, " · ", summary.provider) : null, sourceLabel() ? /* @__PURE__ */ import_react10.default.createElement("span", { className: "fg-note" }, "（", sourceLabel(), "）") : null), /* @__PURE__ */ import_react10.default.createElement("div", null, /* @__PURE__ */ import_react10.default.createElement("i", null, "时间"), clock(summary.at), " · ", secs(elapsed), " · ", REASON[summary.reason] || summary.reason), /* @__PURE__ */ import_react10.default.createElement("div", null, /* @__PURE__ */ import_react10.default.createElement("i", null, "最大输出"), num(summary.maxTokens), " token", entry && entry.temperature != null ? ` · 温度 ${entry.temperature}` : ""), /* @__PURE__ */ import_react10.default.createElement("div", null, /* @__PURE__ */ import_react10.default.createElement("i", null, "模型窗口"), summary.window ? `${num(summary.window)} token` : "宿主没给窗口大小，按设置原样发", entry && entry.outputDefault ? /* @__PURE__ */ import_react10.default.createElement("span", { className: "fg-note" }, " · 模型默认输出 ", num(entry.outputDefault)) : null), entry && /* @__PURE__ */ import_react10.default.createElement("div", null, /* @__PURE__ */ import_react10.default.createElement("i", null, "资料"), entry.contextLength ? `发了 ${num(entry.contextChars)} 字（人物卡与世界书共 ${num(entry.contextLength)} 字）` : "这张卡没有人物卡 / 世界书资料"), entry && writer && /* @__PURE__ */ import_react10.default.createElement("div", null, /* @__PURE__ */ import_react10.default.createElement("i", null, "剧情"), `发了 ${num(entry.storyChars)} 字（到这一轮为止共 ${num(entry.storyLength)} 字）`), summary.usage && /* @__PURE__ */ import_react10.default.createElement("div", null, /* @__PURE__ */ import_react10.default.createElement("i", null, "用量"), usageText(summary.usage))), summary.notes.map((n, i) => /* @__PURE__ */ import_react10.default.createElement("div", { key: i, className: "fg-dlog-notice" }, "⚠ ", n)), summary.error && /* @__PURE__ */ import_react10.default.createElement("div", { className: "fg-err fg-dlog-error" }, summary.error)), /* @__PURE__ */ import_react10.default.createElement("div", { className: "fg-tabs fg-dlog-tabs" }, tabs.map(([id, label]) => /* @__PURE__ */ import_react10.default.createElement("button", { key: id, type: "button", className: `fg-tab${tab === id ? " is-on" : ""}`, onClick: () => setTab(id) }, label))), loadError && /* @__PURE__ */ import_react10.default.createElement("div", { className: "fg-err" }, loadError), tab === "live" && /* @__PURE__ */ import_react10.default.createElement(import_react10.default.Fragment, null, /* @__PURE__ */ import_react10.default.createElement("div", { className: "fg-dlog-meter" }, /* @__PURE__ */ import_react10.default.createElement("span", { className: "fg-dlog-dot" }), live.note || `第 ${summary.attempts || 1} 次请求`, " · 已收到 ", num(live.chars), " 字", live.chars ? "" : live.reasoning ? " · 模型在思考" : " · 等模型开口…"), live.reasoning && /* @__PURE__ */ import_react10.default.createElement(Block, { label: "模型思考（实时）" }, /* @__PURE__ */ import_react10.default.createElement(Pre, { text: live.reasoning, follow: true })), /* @__PURE__ */ import_react10.default.createElement(Block, { label: "模型输出（实时）" }, /* @__PURE__ */ import_react10.default.createElement(Pre, { text: live.output, follow: true, cursor: true, empty: "还没有输出" }))), tab === "result" && (entry ? sprite ? /* @__PURE__ */ import_react10.default.createElement(SpritesView, { sprites: entry.sprites }) : cg ? /* @__PURE__ */ import_react10.default.createElement(CgsView, { cgs: entry.cgs }) : /* @__PURE__ */ import_react10.default.createElement(ScriptView, { script: entry.script, units: entry.units || [] }) : /* @__PURE__ */ import_react10.default.createElement("div", { className: "fg-note" }, "读取中…")), tab === "raw" && (entry ? /* @__PURE__ */ import_react10.default.createElement(Attempts, { attempts: entry.attempts || [] }) : /* @__PURE__ */ import_react10.default.createElement("div", { className: "fg-note" }, "读取中…")), tab === "prompt" && (entry ? /* @__PURE__ */ import_react10.default.createElement(import_react10.default.Fragment, null, /* @__PURE__ */ import_react10.default.createElement(Block, { label: `系统提示词 · ${num((entry.system || "").length)} 字`, text: entry.system }, /* @__PURE__ */ import_react10.default.createElement(Pre, { text: entry.system })), /* @__PURE__ */ import_react10.default.createElement(Block, { label: `用户消息 · ${num((entry.user || "").length)} 字${sprite ? "（资料 + 全部剧情 + 角色档案 + 要画的差分）" : cg ? "（资料 + 此前的剧情 + 本轮正文 + 角色档案 + 要画的插画）" : "（资料 + 上一幕 + 角色档案 + 情绪库 + 本轮正文单元）"}`, text: entry.user }, /* @__PURE__ */ import_react10.default.createElement(Pre, { text: entry.user }))) : /* @__PURE__ */ import_react10.default.createElement("div", { className: "fg-note" }, "读取中…")));
}
function DirectorLog({ gameId, onClose, focusTurn = null }) {
  const { log, error } = useDirectorLog(gameId);
  const [selected, setSelected] = import_react10.default.useState("");
  const items = log ? [...log.running, ...log.entries] : [];
  const current = items.find((e) => e.id === selected) || focusTurn != null && items.find((e) => e.turn === focusTurn && (e.kind || "director") === "director") || items[0];
  import_react10.default.useEffect(() => {
    if (!selected && current) setSelected(current.id);
  }, [current && current.id]);
  return /* @__PURE__ */ import_react10.default.createElement(
    Panel,
    {
      title: "导演日志",
      en: "Director",
      onClose,
      actions: log && /* @__PURE__ */ import_react10.default.createElement("span", { className: "fg-pill" }, log.running.length ? `${log.running.length} 个整理中 · ` : "", "保留最近 ", log.keep, " 次")
    },
    !log && /* @__PURE__ */ import_react10.default.createElement("div", { className: "fg-note" }, error ? "读取失败：" + error : "读取中…"),
    log && !items.length && /* @__PURE__ */ import_react10.default.createElement("div", { className: "fg-note" }, "这一局还没有导演记录。每轮正文写完后，后台导演把它整理成场景：谁在说话、情绪、站位、镜头、插画分镜、选项；立绘设计师读完资料和剧情写立绘提示词。全过程都会记在这里。"),
    current && /* @__PURE__ */ import_react10.default.createElement("div", { className: "fg-dlog" }, /* @__PURE__ */ import_react10.default.createElement("div", { className: "fg-dlog-side" }, items.map((e) => /* @__PURE__ */ import_react10.default.createElement(LogRow, { key: e.id, e, on: e.id === current.id, onClick: () => setSelected(e.id) }))), /* @__PURE__ */ import_react10.default.createElement(LogDetail, { key: current.id, gameId, summary: current }))
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
var glyphsOf = (list2) => ({
  body: list2.map((b) => b.text).join(""),
  display: list2.map((b) => (b.alias || b.speaker) + b.scene.location + (b.card ? b.text : "")).join("")
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
  useFaceFramer(gameId, view);
  const maxTurn = view && view.turns.length ? view.turns[view.turns.length - 1].turn : -1;
  const seen = import_react11.default.useRef({ gameId: "", turn: -1 });
  import_react11.default.useEffect(() => {
    if (!view || view.gameId !== gameId) return;
    if (seen.current.gameId !== gameId) {
      seen.current = { gameId, turn: maxTurn };
    }
    const isNew = maxTurn > seen.current.turn;
    seen.current.turn = Math.max(seen.current.turn, maxTurn);
    if (s.open || !isNew) return;
    if (s.resume && s.resume.gameId === gameId && maxTurn > s.resume.afterTurn || cfg && cfg.ui.autoOpen) openTheater(gameId, { turn: maxTurn });
  }, [view, maxTurn, s.open]);
  import_react11.default.useEffect(() => {
    if (!s.open) stopBgm();
  }, [s.open]);
  if (!s.open) return null;
  return /* @__PURE__ */ import_react11.default.createElement(Theater, { key: s.gameId, gameId: s.gameId, view, viewError: error, cfg, startTurn: s.startTurn, panel: s.panel, panelArg: s.panelArg });
}
function Theater({ gameId, view, viewError, cfg, startTurn, panel: initialPanel, panelArg }) {
  const ui0 = cfg && cfg.ui || { skin: "stellar", textSpeed: 30, autoDelay: 1400, blip: true, bgm: true, bgmVolume: 0.45, particles: true, fontBase: "" };
  const { beats, byKey } = import_react11.default.useMemo(() => buildBeats(view), [view]);
  const [index, setIndex] = import_react11.default.useState(-1);
  const [title, setTitle] = import_react11.default.useState(startTurn == null && !initialPanel);
  const [panel, setPanel] = import_react11.default.useState(initialPanel || "");
  const [settingsTab, setSettingsTab] = import_react11.default.useState(initialPanel === "settings" && typeof panelArg === "string" ? panelArg : "look");
  const update = useUpdate(Boolean(cfg && cfg.ui.updateCheck));
  const [auto, setAuto] = import_react11.default.useState(false);
  const [skip, setSkip] = import_react11.default.useState(false);
  const [hidden, setHidden] = import_react11.default.useState(false);
  const [choosing, setChoosing] = import_react11.default.useState(false);
  const [closing, setClosing] = import_react11.default.useState(false);
  const anchor = import_react11.default.useRef("");
  const rootRef = import_react11.default.useRef(null);
  const [glyphKey, setGlyphKey] = import_react11.default.useState("");
  const placed = import_react11.default.useRef(false);
  const waits = import_react11.default.useRef(0);
  import_react11.default.useEffect(() => {
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
  import_react11.default.useEffect(() => {
    if (!placed.current || !anchor.current) return;
    const i = byKey.get(anchor.current);
    if (i != null && i !== index) setIndex(i);
  }, [byKey]);
  const beat = index >= 0 ? beats[index] : null;
  const speed = skip ? 0 : ui0.textSpeed;
  const holdText = Boolean(beat) && glyphKey !== beat.key;
  const typeSpeed = title || panel ? 0 : speed;
  const blipOn = Boolean(ui0.blip) && !skip && !title;
  const sfxOn = ui0.sfx !== false && !skip && !title;
  import_react11.default.useEffect(() => {
    configureSounds(cfg && cfg.ui);
  }, [cfg]);
  const stageRef = import_react11.default.useRef(null);
  const flashRef = import_react11.default.useRef(null);
  const hit = useHits(stageRef, flashRef, sfxOn);
  const people = import_react11.default.useMemo(() => new Map((view && view.cast || []).map((p2) => [p2.name, p2])), [view]);
  const voices = import_react11.default.useMemo(() => castVoices(view && view.cast || [], ui0), [view, ui0]);
  const voice = import_react11.default.useMemo(() => beat ? lineVoice(beat.type, beat.speaker, voices, ui0) : null, [beat && beat.type, beat && beat.speaker, voices, ui0]);
  const [done, chars, finish, typedAt, typed] = useTypewriter(beat, typeSpeed, { sound: blipOn, voice, hold: holdText, onFx: title ? null : hit });
  const talk = import_react11.default.useMemo(() => beat ? { key: beat.key, type: beat.type, chars, times: typed.times, gap: typed.gap, mouth: typed.mouth, marks: typed.marks, speed: typeSpeed, startedAt: typedAt, done } : null, [beat, chars, typed, typeSpeed, typedAt, done]);
  import_react11.default.useEffect(() => {
    if (beat && beat.sym === "bulb" && sfxOn) stinger("ding");
  }, [beat && beat.key]);
  const cam = useCamera(title ? null : beat);
  const atEnd = beat && index === beats.length - 1;
  import_react11.default.useEffect(() => {
    loadSkinFonts(ui0.skin, ui0.fontBase);
  }, [ui0.skin, ui0.fontBase]);
  import_react11.default.useEffect(() => {
    if (!beat) return void 0;
    let live = true;
    loadSkinFonts(ui0.skin, ui0.fontBase).then(() => loadGlyphs(rootRef.current, glyphsOf([beat]), GLYPH_WAIT)).then(() => {
      if (live) setGlyphKey(beat.key);
    });
    return () => {
      live = false;
    };
  }, [beat && beat.key, ui0.skin, ui0.fontBase]);
  import_react11.default.useEffect(() => {
    if (index < 0) return;
    loadSkinFonts(ui0.skin, ui0.fontBase).then(() => loadGlyphs(rootRef.current, glyphsOf(beats.slice(index + 1, index + 1 + GLYPH_AHEAD))));
  }, [index, beats, ui0.skin, ui0.fontBase]);
  const scene = beat ? beat.scene : (beats[beats.length - 1] || {}).scene;
  const tracks = useMusic();
  const musicBeat = beat || beats[beats.length - 1];
  const track = import_react11.default.useMemo(() => ui0.bgm ? pickTrack(musicBeat, tracks, assetUrl) : null, [ui0.bgm, tracks, musicBeat && musicBeat.bgm, scene && scene.mood, scene && scene.location]);
  import_react11.default.useEffect(() => {
    if (track || !ui0.bgm) playBgm(track, ui0.bgmVolume);
  }, [track && track.id, ui0.bgm, ui0.bgmVolume]);
  const go = import_react11.default.useCallback((i) => {
    if (!beats.length) return;
    const next = Math.max(0, Math.min(beats.length - 1, i));
    anchor.current = beats[next].key;
    writePos(gameId, beats[next].key);
    setIndex(next);
  }, [beats, gameId]);
  const advance = import_react11.default.useCallback(() => {
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
  import_react11.default.useEffect(() => {
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
  const prevLen = import_react11.default.useRef(beats.length);
  import_react11.default.useEffect(() => {
    if (beats.length > prevLen.current && choosing && index === prevLen.current - 1) {
      setChoosing(false);
      go(index + 1);
    }
    prevLen.current = beats.length;
  }, [beats.length]);
  const close = import_react11.default.useCallback(() => {
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
  import_react11.default.useEffect(() => {
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
    emoLabel: beat && beat.emo ? emotionLabel(beat.emo) : "",
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
  return /* @__PURE__ */ import_react11.default.createElement("div", { ref: rootRef, className: `fg-theater${closing ? " is-closing" : ""}${hidden ? " fg-ui-hidden" : ""}`, "data-skin": ui0.skin, style: { "--stage-ar": stageRatio(cfg) }, role: "dialog", "aria-label": "FlowGal 剧场" }, /* @__PURE__ */ import_react11.default.createElement(
    "div",
    {
      className: "fg-stage",
      ref: stageRef,
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
    /* @__PURE__ */ import_react11.default.createElement("div", { className: "fg-camera", "data-cam": cam }, /* @__PURE__ */ import_react11.default.createElement(Backdrop, { scene: stageScene, view, transition: stageBeat ? stageBeat.sceneEnter ? stageBeat.transition : "dissolve" : "dissolve" }), /* @__PURE__ */ import_react11.default.createElement("div", { className: "fg-grade", "data-time": stageScene.time }), stageBeat && /* @__PURE__ */ import_react11.default.createElement(Cast, { beat: title ? { ...stageBeat, speaker: "", sym: "" } : stageBeat, view, talk: title ? null : talk }), stageBeat && !title && /* @__PURE__ */ import_react11.default.createElement(CgLayer, { beat: stageBeat }), /* @__PURE__ */ import_react11.default.createElement(Particles, { weather: stageScene.weather, enabled: ui0.particles !== false }), /* @__PURE__ */ import_react11.default.createElement("div", { className: "fg-vignette" })),
    beat && !title && /* @__PURE__ */ import_react11.default.createElement(Flash, { beat }),
    /* @__PURE__ */ import_react11.default.createElement("div", { className: "fg-hitflash", ref: flashRef, "aria-hidden": "true" }),
    !panel && /* @__PURE__ */ import_react11.default.createElement(RestartNotice, { floating: true }),
    beat && !title && /* @__PURE__ */ import_react11.default.createElement(TitleCard, { beat }),
    !title && beat && /* @__PURE__ */ import_react11.default.createElement("div", { className: "fg-hud" }, /* @__PURE__ */ import_react11.default.createElement("div", { className: "fg-hud-bar" }), /* @__PURE__ */ import_react11.default.createElement("div", null, /* @__PURE__ */ import_react11.default.createElement("div", { className: "fg-hud-place" }, beat.scene.location || `第 ${beat.turn} 轮`), /* @__PURE__ */ import_react11.default.createElement("div", { className: "fg-hud-meta" }, /* @__PURE__ */ import_react11.default.createElement("span", null, TIME_LABEL[beat.scene.time] || ""), beat.scene.weather && beat.scene.weather !== "clear" && /* @__PURE__ */ import_react11.default.createElement("span", null, WEATHER_LABEL[beat.scene.weather]), beat.scene.mood && /* @__PURE__ */ import_react11.default.createElement("span", null, "♪ ", MOOD_LABEL[beat.scene.mood])))),
    !title && /* @__PURE__ */ import_react11.default.createElement("div", { className: "fg-topright", onClick: (e) => e.stopPropagation() }, directing && /* @__PURE__ */ import_react11.default.createElement("button", { type: "button", className: "fg-pill is-busy is-link", title: "看导演正在写什么", onClick: () => setPanel("director") }, "导演整理中 ›"), drawing > 0 && /* @__PURE__ */ import_react11.default.createElement("span", { className: "fg-pill is-busy" }, "出图 ", drawing), track && /* @__PURE__ */ import_react11.default.createElement("span", { className: "fg-pill", title: track.name }, "♪ ", track.name), viewError && /* @__PURE__ */ import_react11.default.createElement("span", { className: "fg-pill fg-err", title: viewError }, "连接中断，重连中"), /* @__PURE__ */ import_react11.default.createElement("button", { type: "button", className: "fg-iconbtn", title: "回到聊天（Esc）", onClick: close }, "✕")),
    beat && !title && beat.card && /* @__PURE__ */ import_react11.default.createElement(SceneCard, { beat }),
    beat && !title && /* @__PURE__ */ import_react11.default.createElement(DialogBox, { beat, chars, plan: typed, done, waiting: holdText, color, quick, progress: progressInTurn, status, hiddenText: Boolean(beat.card) }),
    !beat && !title && /* @__PURE__ */ import_react11.default.createElement("div", { className: "fg-choices" }, /* @__PURE__ */ import_react11.default.createElement("div", { className: "fg-choices-title" }, view ? "这一局还没有可以演的内容" : "读取中")),
    choosing && beat && /* @__PURE__ */ import_react11.default.createElement(Choices, { choices: beat.choices, waiting: directing, onChoose: choose, onBack: close }),
    title && /* @__PURE__ */ import_react11.default.createElement("div", { className: "fg-title", onClick: (e) => e.stopPropagation() }, /* @__PURE__ */ import_react11.default.createElement("div", { className: "fg-title-kicker" }, "FlowGal · ", hostName() === "st" ? "SillyTavern" : "DSH Tavern"), /* @__PURE__ */ import_react11.default.createElement("div", { className: "fg-title-logo" }, cardTitle), /* @__PURE__ */ import_react11.default.createElement("div", { className: "fg-title-sub" }, latest ? `第 ${latest.turn} 轮 · ${latest.scene.location || "—"} · ${TIME_LABEL[latest.scene.time] || ""}` : gameId ? "开场白还没有整理" : "先在聊天里打开一局"), /* @__PURE__ */ import_react11.default.createElement("div", { className: "fg-title-menu" }, titleMenu.map((m, i) => /* @__PURE__ */ import_react11.default.createElement("button", { key: m.id, type: "button", className: m.badge ? "is-new" : void 0, style: { "--i": i }, onMouseEnter: () => sfx("hover"), onClick: () => {
      sfx("select");
      m.run();
    } }, m.label, /* @__PURE__ */ import_react11.default.createElement("span", null, m.en)))), /* @__PURE__ */ import_react11.default.createElement("div", { className: "fg-title-foot" }, "FlowGal · 字体 思源 / 霞鹜文楷 / 马善政 / Cormorant（SIL OFL）")),
    panel === "log" && /* @__PURE__ */ import_react11.default.createElement(Backlog, { beats, index, gameId, onClose: () => setPanel(""), onJump: (i) => {
      go(i);
      setPanel("");
      setTitle(false);
    } }),
    panel === "gallery" && /* @__PURE__ */ import_react11.default.createElement(Gallery, { view, gameId, focusId: panelArg, onClose: () => setPanel("") }),
    panel === "cast" && /* @__PURE__ */ import_react11.default.createElement(CastPanel, { view, gameId, onClose: () => setPanel("") }),
    panel === "director" && /* @__PURE__ */ import_react11.default.createElement(DirectorLog, { gameId, focusTurn: panelArg, onClose: () => setPanel("") }),
    panel === "settings" && /* @__PURE__ */ import_react11.default.createElement(Settings, { initialTab: settingsTab, onClose: () => setPanel(""), onDirectorLog: gameId ? () => setPanel("director") : null })
  ));
}
function Toast() {
  const s = useUi();
  if (!s.toast) return null;
  return /* @__PURE__ */ import_react11.default.createElement("div", { className: `fg-toast${s.toast.tone === "error" ? " is-error" : ""}`, key: s.toast.at }, s.toast.text);
}

// src/client/shell.jsx
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
  return /* @__PURE__ */ import_react12.default.createElement(import_react12.default.Fragment, null, /* @__PURE__ */ import_react12.default.createElement(TheaterRoot, null), /* @__PURE__ */ import_react12.default.createElement(Toast, null));
}
function UpdateLine() {
  const u = useUpdate();
  const text = !u ? "" : !u.managed ? "" : u.restartRequired ? "新版本已下载，重启 DSH 后生效" : updateAvailable(u) ? `有新版本（${u.last.commits.length || u.last.behind} 个更新）` : "";
  return /* @__PURE__ */ import_react12.default.createElement("div", { className: "fg-settings-row" }, /* @__PURE__ */ import_react12.default.createElement("span", { style: { opacity: 0.7 } }, "v", "0.2.0", u && u.managed ? ` · ${u.current.sha}` : ""), text && /* @__PURE__ */ import_react12.default.createElement("span", { style: { color: "#d9822b" } }, "● ", text), hostName() === "st" ? /* @__PURE__ */ import_react12.default.createElement("span", { style: { opacity: 0.7 } }, "更新：酒馆「扩展 → 管理扩展」里点 FlowGal 的更新") : /* @__PURE__ */ import_react12.default.createElement("button", { type: "button", className: "fg-ghost", onClick: () => openTheater("", { panel: "settings", panelArg: "about" }) }, "版本与更新"));
}
function SettingsSection() {
  const data = useConfig();
  if (!data) return /* @__PURE__ */ import_react12.default.createElement("div", { className: "fg-settings-card" }, "读取中…");
  const cfg = data.config;
  const toggle = (section, key) => patchConfig(section ? { [section]: { [key]: !cfg[section][key] } } : { [key]: !cfg[key] }).catch((e) => toast(e.message, "error"));
  const box = { display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer" };
  return /* @__PURE__ */ import_react12.default.createElement("div", { className: "fg-settings-card" }, /* @__PURE__ */ import_react12.default.createElement("h3", null, "🎬 FlowGal ", /* @__PURE__ */ import_react12.default.createElement("span", { style: { fontSize: 12, opacity: 0.6, fontWeight: 400 } }, "v", "0.2.0")), /* @__PURE__ */ import_react12.default.createElement("p", null, "正文照常流式输出；每轮写完后，后台导演把它整理成视觉小说场景（说话人、表情、站位、镜头、天气、选项），并按柏宝绘的方式自动配插画、背景和立绘。打开剧场就能当 galgame 看。"), /* @__PURE__ */ import_react12.default.createElement("div", { className: "fg-settings-row" }, /* @__PURE__ */ import_react12.default.createElement("label", { style: box }, /* @__PURE__ */ import_react12.default.createElement("input", { type: "checkbox", checked: cfg.enabled, onChange: () => toggle("", "enabled") }), "启用"), /* @__PURE__ */ import_react12.default.createElement("label", { style: box }, /* @__PURE__ */ import_react12.default.createElement("input", { type: "checkbox", checked: cfg.director.auto, onChange: () => toggle("director", "auto") }), "每轮自动整理"), /* @__PURE__ */ import_react12.default.createElement("label", { style: box }, /* @__PURE__ */ import_react12.default.createElement("input", { type: "checkbox", checked: cfg.images.auto, onChange: () => toggle("images", "auto") }), "自动配图"), /* @__PURE__ */ import_react12.default.createElement("label", { style: box }, /* @__PURE__ */ import_react12.default.createElement("input", { type: "checkbox", checked: cfg.ui.autoOpen, onChange: () => toggle("ui", "autoOpen") }), "写完自动打开剧场")), /* @__PURE__ */ import_react12.default.createElement("div", { className: "fg-settings-row" }, /* @__PURE__ */ import_react12.default.createElement("span", { style: { color: data.ready ? "#4caf7a" : "#d9822b" } }, data.ready ? "● 生图已就绪" : "● " + data.readyReason), /* @__PURE__ */ import_react12.default.createElement("button", { type: "button", className: "fg-play", onClick: () => openTheater("", { panel: "settings" }) }, "打开完整设置")), /* @__PURE__ */ import_react12.default.createElement(UpdateLine, null));
}
async function openTurnInTheater(c) {
  rememberGame2(c.gameId);
  openTheater(c.gameId, { turn: c.turn });
  api.direct(c.gameId, c.turn).catch((error) => toast("整理失败：" + (error && error.message), "error"));
}
async function illustrateTurn(c) {
  try {
    await api.direct(c.gameId, c.turn);
    await api.addImage(c.gameId, c.turn, "", {});
    toast("已安排一张插画，画好后出现在这条消息里");
  } catch (error) {
    toast("配图失败：" + (error && error.message), "error");
  }
}

// src/client/chat/ChatCards.jsx
var import_react13 = __toESM(require("react"), 1);
var CLOCK = { dawn: "05:40", morning: "07:30", noon: "12:00", afternoon: "15:20", dusk: "17:50", evening: "19:30", night: "22:10", midnight: "00:40" };
var TIME_TINT = { dawn: "#9a5c8f", morning: "#5aa6e8", noon: "#3e8fe0", afternoon: "#c58b4a", dusk: "#b14f6e", evening: "#4f2f78", night: "#121a44", midnight: "#070b24" };
function SceneCardInline({ item, gameId, turn }) {
  rememberGame2(gameId);
  const [busy, setBusy] = import_react13.default.useState(false);
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
  const [filling, setFilling] = import_react13.default.useState(false);
  const fill = async () => {
    setFilling(true);
    try {
      toast(fillText(await api.fill(gameId, { turn: t })));
    } catch (e) {
      toast(String(e.message || e), "error");
    } finally {
      setFilling(false);
    }
  };
  return /* @__PURE__ */ import_react13.default.createElement("div", { className: "fg-chat" }, /* @__PURE__ */ import_react13.default.createElement("div", { className: `fg-scene${pending ? " is-pending" : ""}` }, /* @__PURE__ */ import_react13.default.createElement("div", { className: "fg-scene-bg", style: { backgroundImage: `linear-gradient(135deg, ${TIME_TINT[data.time] || "#2a2350"}, #0d0b1c)` } }), /* @__PURE__ */ import_react13.default.createElement("div", { className: "fg-scene-clock" }, /* @__PURE__ */ import_react13.default.createElement("b", null, CLOCK[data.time] || "--:--"), /* @__PURE__ */ import_react13.default.createElement("span", null, data.time ? TIME_LABEL[data.time] || data.time : "scene")), /* @__PURE__ */ import_react13.default.createElement("div", { className: "fg-scene-main" }, pending ? /* @__PURE__ */ import_react13.default.createElement(import_react13.default.Fragment, null, /* @__PURE__ */ import_react13.default.createElement("div", { className: "fg-scene-loc" }, /* @__PURE__ */ import_react13.default.createElement("span", { className: "fg-dots" }, "导演正在整理这一幕")), /* @__PURE__ */ import_react13.default.createElement("div", { className: "fg-scene-sum" }, "正文已经可以读了。说话人、表情、站位、镜头和插画在后台排，整理好后剧场里会自动更新。"), /* @__PURE__ */ import_react13.default.createElement("div", { className: "fg-scene-actions" }, /* @__PURE__ */ import_react13.default.createElement("button", { type: "button", className: "fg-play", onClick: () => openTheater(gameId, { turn: t }) }, "先看起来"), /* @__PURE__ */ import_react13.default.createElement("button", { type: "button", className: "fg-ghost", onClick: () => openTheater(gameId, { panel: "director", panelArg: t }) }, "看导演在写什么"))) : data.error ? /* @__PURE__ */ import_react13.default.createElement(import_react13.default.Fragment, null, /* @__PURE__ */ import_react13.default.createElement("div", { className: "fg-scene-loc" }, "这一幕没整理好"), /* @__PURE__ */ import_react13.default.createElement("div", { className: "fg-scene-err" }, String(data.error).slice(0, 160)), /* @__PURE__ */ import_react13.default.createElement("div", { className: "fg-scene-actions" }, /* @__PURE__ */ import_react13.default.createElement("button", { type: "button", className: "fg-play", onClick: () => openTheater(gameId, { turn: t }) }, "照原文演"), /* @__PURE__ */ import_react13.default.createElement("button", { type: "button", className: "fg-ghost", disabled: busy, onClick: retry }, busy ? "整理中…" : "重试"), /* @__PURE__ */ import_react13.default.createElement("button", { type: "button", className: "fg-ghost", onClick: () => openTheater(gameId, { panel: "director", panelArg: t }) }, "导演日志"))) : /* @__PURE__ */ import_react13.default.createElement(import_react13.default.Fragment, null, /* @__PURE__ */ import_react13.default.createElement("div", { className: "fg-scene-loc" }, data.location || `第 ${t} 轮`), /* @__PURE__ */ import_react13.default.createElement("div", { className: "fg-scene-chips" }, data.weather && data.weather !== "clear" && /* @__PURE__ */ import_react13.default.createElement("span", { className: "fg-chip" }, WEATHER_LABEL[data.weather] || data.weather), data.mood && /* @__PURE__ */ import_react13.default.createElement("span", { className: "fg-chip" }, "♪ ", MOOD_LABEL[data.mood] || data.mood), (data.cast || []).map((n) => /* @__PURE__ */ import_react13.default.createElement("span", { key: n, className: "fg-chip", style: { "--c": nameColor(n) } }, /* @__PURE__ */ import_react13.default.createElement("i", null), n)), data.choices > 0 && /* @__PURE__ */ import_react13.default.createElement("span", { className: "fg-chip" }, "◆ ", data.choices, " 个选项")), data.summary && /* @__PURE__ */ import_react13.default.createElement("div", { className: "fg-scene-sum" }, data.summary), /* @__PURE__ */ import_react13.default.createElement("div", { className: "fg-scene-actions" }, /* @__PURE__ */ import_react13.default.createElement("button", { type: "button", className: "fg-play", onClick: () => openTheater(gameId, { turn: t }) }, "进入剧场"), /* @__PURE__ */ import_react13.default.createElement("button", { type: "button", className: "fg-ghost", onClick: () => openTheater(gameId, { panel: "cast" }) }, "人物志"), /* @__PURE__ */ import_react13.default.createElement("button", { type: "button", className: "fg-ghost", disabled: busy, onClick: retry }, busy ? "整理中…" : "重新整理"), /* @__PURE__ */ import_react13.default.createElement("button", { type: "button", className: "fg-ghost", title: "这一轮错过的插画、背景、立绘差分补上", disabled: filling, onClick: fill }, filling ? "补图中…" : "补图"))))));
}
var RATIO = { landscape: "1216 / 832", portrait: "832 / 1216", square: "1 / 1" };
function CgCardInline({ item, gameId }) {
  rememberGame2(gameId);
  const data = item && item.data || {};
  const [zoom, setZoom] = import_react13.default.useState(false);
  const [busy, setBusy] = import_react13.default.useState("");
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
  const tall = data.shape === "portrait" ? " is-tall" : "";
  if (item && item.status === "failed" && !src) {
    return /* @__PURE__ */ import_react13.default.createElement("div", { className: "fg-chat" }, /* @__PURE__ */ import_react13.default.createElement("div", { className: "fg-cgcard" }, /* @__PURE__ */ import_react13.default.createElement("div", { className: "fg-cgcard-fail" }, /* @__PURE__ */ import_react13.default.createElement("span", null, "🎨 插画没画成：", String(item.error || "未知原因").slice(0, 140)), /* @__PURE__ */ import_react13.default.createElement("button", { type: "button", className: "fg-ghost", disabled: busy === "r", onClick: redraw }, "重画"), /* @__PURE__ */ import_react13.default.createElement("button", { type: "button", className: "fg-ghost", onClick: () => openTheater(gameId, { panel: "gallery", panelArg: data.imageId }) }, "改词"))));
  }
  if (!src || item && item.status === "pending" && !src) {
    return /* @__PURE__ */ import_react13.default.createElement("div", { className: "fg-chat" }, /* @__PURE__ */ import_react13.default.createElement("div", { className: `fg-cgcard${tall}` }, /* @__PURE__ */ import_react13.default.createElement("div", { className: "fg-cgcard-wait", style: { aspectRatio: RATIO[data.shape] || RATIO.landscape } }, /* @__PURE__ */ import_react13.default.createElement("span", null, data.writing ? "插画分镜师在构思" : "正在绘制", item && item.caption ? `「${item.caption}」` : "插画"))));
  }
  return /* @__PURE__ */ import_react13.default.createElement("div", { className: "fg-chat" }, /* @__PURE__ */ import_react13.default.createElement("div", { className: `fg-cgcard${tall}` }, /* @__PURE__ */ import_react13.default.createElement("img", { key: src, src, alt: item && item.caption || "插画", loading: "lazy", onClick: () => setZoom(true) }), /* @__PURE__ */ import_react13.default.createElement("div", { className: "fg-cgcard-bar" }, /* @__PURE__ */ import_react13.default.createElement("span", { className: "fg-cap" }, item && item.caption || "CG", versions > 1 ? ` · ${current + 1}/${versions}` : "", item && item.status === "pending" ? " · 重画中…" : ""), versions > 1 && /* @__PURE__ */ import_react13.default.createElement("button", { type: "button", disabled: current <= 0 || busy === "v", onClick: () => act("v", () => api.version(gameId, data.imageId, current - 1)) }, "‹"), versions > 1 && /* @__PURE__ */ import_react13.default.createElement("button", { type: "button", disabled: current >= versions - 1 || busy === "v", onClick: () => act("v", () => api.version(gameId, data.imageId, current + 1)) }, "›"), /* @__PURE__ */ import_react13.default.createElement("button", { type: "button", disabled: busy === "r" || item && item.status === "pending", onClick: redraw }, "重画"), /* @__PURE__ */ import_react13.default.createElement("button", { type: "button", onClick: () => openTheater(gameId, { panel: "gallery", panelArg: data.imageId }) }, "改词"))), zoom && /* @__PURE__ */ import_react13.default.createElement("div", { className: "fg-chat-lightbox", onClick: () => setZoom(false) }, /* @__PURE__ */ import_react13.default.createElement("img", { src, alt: "" })));
}

// src/client/index.jsx
var PLUGIN = "flowgal";
var KIND_SCENE = PLUGIN + "/scene";
var KIND_CG = PLUGIN + "/cg";
function Launcher(props) {
  const wide = !props || props.wide !== false;
  return /* @__PURE__ */ import_react14.default.createElement(
    "button",
    {
      type: "button",
      title: "FlowGal：把对话当 galgame 看",
      onClick: () => openTheater(),
      style: { display: "flex", alignItems: "center", gap: 8, justifyContent: wide ? "flex-start" : "center", width: "100%", margin: "2px 0", background: "transparent", border: "none", color: "inherit", cursor: "pointer", padding: wide ? "8px 10px" : "8px 0", borderRadius: 8, fontSize: 13, textAlign: "left" }
    },
    /* @__PURE__ */ import_react14.default.createElement("span", { style: { fontSize: 15, lineHeight: 1 } }, "🎬"),
    wide ? /* @__PURE__ */ import_react14.default.createElement("span", null, "FlowGal") : null
  );
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
    keep(ui2.registerMediaRenderer(KIND_SCENE, guard(({ item, gameId, turn }) => /* @__PURE__ */ import_react14.default.createElement(SceneCardInline, { item, gameId, turn }))), `${PLUGIN}: scene card`);
    keep(ui2.registerMediaRenderer(KIND_CG, guard(({ item, gameId }) => /* @__PURE__ */ import_react14.default.createElement(CgCardInline, { item, gameId }))), `${PLUGIN}: cg card`);
    keep(ui2.registerMessageAction({
      id: PLUGIN + "-theater",
      label: "🎬 剧场",
      when: (c) => Boolean(c && c.gameId) && c.settled !== false,
      run: openTurnInTheater
    }), `${PLUGIN}: message action theater`);
    keep(ui2.registerMessageAction({
      id: PLUGIN + "-illustrate",
      label: "🖼 配一张",
      when: (c) => Boolean(c && c.gameId) && c.settled !== false,
      run: illustrateTurn
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
