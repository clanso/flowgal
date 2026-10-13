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
var import_react15 = __toESM(require("react"), 1);

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
  cgModels: () => call("/cg-models"),
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
  removeSound: (slot) => call("/sound", { action: "remove", slot }),
  soundlib: () => call("/soundlib"),
  updateLibSound: (id, patch) => call("/soundlib", { action: "update", id, patch }),
  removeLibSounds: (ids) => call("/soundlib", { action: "remove", ids }),
  /** 往音效库导入一个（最大 20 MB）：path 是相对导入文件夹的路径，meta 是描述文件里这一条。 */
  async uploadLibSound(file2, path, meta) {
    const query = `name=${encodeURIComponent(path || file2.name || "")}${meta ? `&meta=${encodeURIComponent(JSON.stringify(meta))}` : ""}`;
    return (await uploadFile(`/soundlib/upload?${query}`, file2)).sound;
  }
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
var soundlibCache = null;
var soundlibListeners = /* @__PURE__ */ new Set();
function setSoundlib(sounds2) {
  soundlibCache = sounds2;
  for (const fn of [...soundlibListeners]) fn();
}
function loadSoundlib() {
  return api.soundlib().then((r) => {
    setSoundlib(r.sounds);
    return r.sounds;
  });
}
function useSoundlib() {
  const [, force] = import_react.default.useReducer((x) => x + 1, 0);
  import_react.default.useEffect(() => {
    soundlibListeners.add(force);
    if (!soundlibCache) loadSoundlib().catch(() => {
    });
    return () => soundlibListeners.delete(force);
  }, []);
  return soundlibCache;
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
var import_react13 = __toESM(require("react"), 1);

// src/client/styles/theater.css
var theater_default = `/* ───────────── 沉浸式 Galgame · 剧场 ─────────────
   所有类名以 fg- 开头；皮肤只改 data-skin 上的变量与少量装饰。
   舞台是 16:9 的容器（container-type:size），字号用 cqw 随舞台缩放。 */

.fg-theater {
  --accent: #ff7eb6; --accent2: #9b7bff; --accent3: #5ee7ff;
  --ink: #f5f3ff; --ink-dim: rgba(235, 232, 255, .62);
  --box-bg: linear-gradient(180deg, rgba(18, 16, 40, .66), rgba(8, 8, 24, .86));
  --box-border: rgba(255, 255, 255, .14);
  --box-radius: 1.4cqw;
  --box-blur: blur(18px) saturate(1.5);
  --name-ink: #fff;
  --panel-bg: rgba(10, 10, 26, .82);
  --chip-bg: rgba(10, 10, 28, .5);
  --font-body: "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", system-ui, sans-serif;
  --font-display: "Noto Serif SC", "Source Han Serif SC", "Songti SC", "STSong", serif;
  --font-latin: "Cormorant Garamond", "Playfair Display", Georgia, serif;
  --wait-glyph: "◆";
  /* 宽高写死成视口大小：酒馆给 <html> 加了 transform，fixed 层的「inset: 0」会跟着 html（高 0）算 */
  position: fixed; inset: 0; width: 100vw; height: 100vh; height: 100dvh; z-index: 2147483000; overflow: hidden; overflow: clip;
  display: flex; align-items: center; justify-content: center;
  background: #05040c; color: var(--ink);
  font-family: var(--font-body);
  -webkit-font-smoothing: antialiased;
  user-select: none; -webkit-user-select: none;
  animation: fg-fade-in .5s ease both;
}
.fg-theater *, .fg-theater *::before, .fg-theater *::after { box-sizing: border-box; }
:where(.fg-theater) button { font: inherit; color: inherit; background: none; border: 0; cursor: pointer; padding: 0; }
.fg-theater.is-closing { animation: fg-fade-out .35s ease both; }

.fg-stage {
  position: relative; overflow: hidden; overflow: clip;
  /* 宽高比由剧场根节点的 --stage-ar 给（默认跟横版插画一样，NovelAI 的 1216×832）。 */
  width: min(100vw, calc(100vh * var(--stage-ar, 1.4615))); height: min(100vh, calc(100vw / var(--stage-ar, 1.4615)));
  container-type: size; container-name: stage;
  background: #000;
  box-shadow: 0 0 120px rgba(0, 0, 0, .8);
}
@media (max-aspect-ratio: 4/5) {
  /* 竖屏手机：舞台铺满，立绘居中放大，对话框加高。 */
  .fg-stage { width: 100vw; height: 100vh; }
}
.fg-camera { position: absolute; inset: 0; transform-origin: 50% 50%; }

/* ── 背景层 ── */
/* 外层管进出场的转场，里层（.fg-bg-art）画图、慢慢推拉；新层盖在旧层上面演转场，旧层不动，演完才移除（不先淡出，中途不会露出底下的黑） */
.fg-bg { position: absolute; inset: -3%; will-change: transform, opacity; }
.fg-bg-art { position: absolute; inset: 0; background-size: cover; background-position: center 42%; }
.fg-bg.is-image > .fg-bg-art { animation: fg-kenburns 38s ease-in-out infinite alternate; }
.fg-bg.is-enter { animation: var(--enter-anim, fg-dissolve) var(--enter-dur, 1.1s) cubic-bezier(.45, 0, .55, 1) both; }
.fg-bg.is-leave { animation: none; }
@keyframes fg-kenburns { from { transform: scale(1.02) translate(0, 0); } to { transform: scale(1.1) translate(-1.6%, -1.2%); } }
@keyframes fg-dissolve { from { opacity: 0; filter: blur(8px) brightness(1.3); } to { opacity: 1; filter: none; } }
@keyframes fg-wipe { from { clip-path: inset(0 100% 0 0); } to { clip-path: inset(0 0 0 0); } }
@keyframes fg-iris { from { clip-path: circle(0% at 50% 50%); } to { clip-path: circle(80% at 50% 50%); } }
@keyframes fg-cinematic { 0% { clip-path: inset(50% 0 50% 0); filter: brightness(2); } 60% { clip-path: inset(8% 0 8% 0); } 100% { clip-path: inset(0 0 0 0); filter: none; } }
@keyframes fg-strips { from { -webkit-mask-size: 100% 0%; mask-size: 100% 0%; } to { -webkit-mask-size: 100% 100%; mask-size: 100% 100%; } }
.fg-bg.is-enter[data-tr="strips"] { -webkit-mask-image: repeating-linear-gradient(90deg, #000 0 8%, transparent 8% 8.0001%); mask-image: linear-gradient(#000, #000); -webkit-mask-repeat: no-repeat; }
@keyframes fg-flash-in { 0% { opacity: 0; filter: brightness(4); } 30% { opacity: 1; filter: brightness(3); } 100% { filter: none; } }
@keyframes fg-black-in { 0%, 45% { opacity: 0; } 100% { opacity: 1; } }
/* 起雾（进出回忆）：旧画面失焦、泛白着退下去，新画面从一片朦胧里慢慢清晰过来；配合 .fg-flash.is-haze 的白雾 */
@keyframes fg-haze-in { 0% { opacity: 0; filter: blur(18px) brightness(1.5) saturate(.6); } 40% { opacity: 1; filter: blur(10px) brightness(1.3) saturate(.75); } 100% { opacity: 1; filter: none; } }
.fg-bg.is-leave[data-out="haze"] { animation: fg-haze-out 1.4s ease-in both; }
@keyframes fg-haze-out { to { opacity: 0; filter: blur(14px) brightness(1.4) saturate(.7); } }
/* 起雾的那一句：新上台的人等雾起来了再慢慢浮出来，不在旧画面上先冒出来 */
.fg-world-in[data-tr="haze"] .fg-actor:not(.is-leaving) { animation-duration: 1.3s; animation-delay: .8s; }
.fg-world-in[data-tr="haze"] .fg-actor.is-leaving { animation-duration: .9s; }
/* 从回忆里醒过来：换画面时已经白透了，回忆的背景和人直接撤掉（不在白雾散开时又露出来），现在的画面在雾后面从朦胧里清晰过来 */
.fg-bg.is-leave[data-out="wake"], .fg-world-in[data-tr="wake"] .fg-actor.is-leaving, .fg-world-in[data-tr="wake"] .fg-cg.is-leaving { animation: none; opacity: 0; }
.fg-world-in[data-tr="wake"] .fg-actor:not(.is-leaving) { animation-duration: 1.4s; animation-delay: .3s; }

/* 没有背景图时的程序化舞台：天色渐变 + 远景剪影 + 光斑。 */
.fg-sky { position: absolute; inset: 0; transition: background 1.6s ease; }
.fg-sky::before { content: ""; position: absolute; left: -10%; right: -10%; bottom: 0; height: 46%;
  background:
    radial-gradient(60% 120% at 20% 100%, rgba(0, 0, 0, .55), transparent 70%),
    radial-gradient(50% 90% at 78% 100%, rgba(0, 0, 0, .5), transparent 70%);
}
.fg-sky::after { content: ""; position: absolute; inset: 0;
  background: radial-gradient(40% 30% at var(--sun-x, 70%) var(--sun-y, 30%), var(--sun, rgba(255, 220, 180, .55)), transparent 70%);
  mix-blend-mode: screen; animation: fg-breathe-light 9s ease-in-out infinite;
}
.fg-skyline { position: absolute; left: 0; right: 0; bottom: 0; height: 38%; opacity: .9; }
@keyframes fg-breathe-light { 0%, 100% { opacity: .75; } 50% { opacity: 1; } }

/* 时段调色：叠一层渐变，混合模式按时段变化。 */
.fg-grade { position: absolute; inset: 0; pointer-events: none; transition: background 1.4s ease, opacity 1.4s ease; mix-blend-mode: soft-light; }
.fg-grade[data-time="dawn"] { background: linear-gradient(180deg, rgba(255, 170, 200, .55), rgba(120, 140, 255, .35)); }
.fg-grade[data-time="morning"] { background: linear-gradient(180deg, rgba(255, 245, 220, .35), rgba(255, 255, 255, 0)); }
.fg-grade[data-time="noon"] { opacity: 0; }
.fg-grade[data-time="afternoon"] { background: linear-gradient(180deg, rgba(255, 220, 160, .35), rgba(255, 200, 120, .15)); }
.fg-grade[data-time="dusk"] { background: linear-gradient(180deg, rgba(255, 120, 60, .7), rgba(140, 40, 120, .55)); mix-blend-mode: overlay; }
.fg-grade[data-time="evening"] { background: linear-gradient(180deg, rgba(90, 60, 200, .6), rgba(255, 110, 120, .35)); mix-blend-mode: overlay; }
.fg-grade[data-time="night"] { background: linear-gradient(180deg, rgba(10, 20, 80, .78), rgba(20, 10, 60, .7)); mix-blend-mode: multiply; }
.fg-grade[data-time="midnight"] { background: linear-gradient(180deg, rgba(4, 6, 40, .86), rgba(10, 4, 30, .8)); mix-blend-mode: multiply; }
/* 画好的背景本来就按日 / 黄昏 / 夜画过（出图时带着时段）：只在同一档里轻轻推一下，不再压一遍（夜景再压一层夜色就黑透了） */
.fg-grade.is-drawn:is([data-time="dusk"], [data-time="evening"], [data-time="night"]) { opacity: .3; }
.fg-grade.is-drawn[data-time="midnight"] { opacity: .45; }
.fg-vignette { position: absolute; inset: 0; pointer-events: none; background: radial-gradient(120% 90% at 50% 45%, transparent 55%, rgba(0, 0, 0, .55)); }
.fg-letterbox::before, .fg-letterbox::after { content: ""; position: absolute; left: 0; right: 0; height: 9%; background: #000; z-index: 30; animation: fg-bars .8s cubic-bezier(.6, 0, .2, 1) both; }
.fg-letterbox::before { top: 0; transform-origin: top; } .fg-letterbox::after { bottom: 0; transform-origin: bottom; }
@keyframes fg-bars { from { transform: scaleY(0); } }

.fg-particles { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; z-index: 8; }

/* ── 立绘 ── */
.fg-cast { position: absolute; inset: 0; z-index: 5; pointer-events: none; transition: right .65s cubic-bezier(.4, .1, .2, 1), opacity .9s ease, scale 2.6s cubic-bezier(.4, 0, .2, 1); }
.fg-cast[data-split] { right: 34%; }
/* 分屏：右边斜切的一格，另一头的地点和人；白色斜边，滑进滑出；有插画时让开 */
.fg-split { position: absolute; top: 0; bottom: 0; right: 0; width: 42%; z-index: 8; pointer-events: none; animation: fg-split-in .7s cubic-bezier(.2, .8, .2, 1) both; transition: opacity .6s ease; }
.fg-split.is-leaving { animation: fg-split-out .6s cubic-bezier(.6, 0, .8, .3) both; }
.fg-split.is-under { opacity: 0; }
.fg-split::before { content: ""; position: absolute; inset: 0; z-index: 2; background: rgba(255, 255, 255, .92); clip-path: polygon(15.2% 0, 16.4% 0, 1.2% 100%, 0 100%); filter: drop-shadow(0 0 .6cqw rgba(255, 255, 255, .6)); }
.fg-split-inner { position: absolute; inset: 0; overflow: hidden; clip-path: polygon(16% 0, 100% 0, 100% 100%, .8% 100%); background: #0b0d1a; }
.fg-split-bg { position: absolute; inset: 0; background-size: cover; background-position: center; filter: brightness(.82) saturate(.92); }
.fg-split-inner::after { content: ""; position: absolute; inset: 0; background: linear-gradient(90deg, rgba(10, 20, 50, .35), transparent 35%), radial-gradient(110% 90% at 60% 50%, transparent 55%, rgba(0, 0, 0, .45)); pointer-events: none; }
.fg-split-cast { position: absolute; top: 0; bottom: 0; left: 6%; right: 0; }
.fg-split-label { position: absolute; right: 5%; top: 11%; z-index: 3; display: flex; align-items: center; gap: .7cqw; font-family: var(--font-display); font-size: 1.35cqw; letter-spacing: .22em; color: #fff; text-shadow: 0 2px 8px rgba(0, 0, 0, .7); }
.fg-split-label i { width: 3cqw; height: 1px; background: linear-gradient(90deg, transparent, #fff); }
@keyframes fg-split-in { from { transform: translateX(105%); } }
@keyframes fg-split-out { to { transform: translateX(105%); } }
.fg-actor {
  position: absolute; bottom: calc(-2% + var(--db, 0%)); height: calc(92% * var(--s, 1) * var(--d, 1)); width: calc(34% * var(--s, 1) * var(--d, 1));
  left: var(--x, 50%); transform: translateX(-50%);
  transition: left .55s cubic-bezier(.4, .1, .2, 1), height .55s cubic-bezier(.4, .1, .2, 1), width .55s cubic-bezier(.4, .1, .2, 1), bottom .55s cubic-bezier(.4, .1, .2, 1), filter .4s ease, opacity .45s ease;
  filter: brightness(.7) saturate(.78);
  animation: fg-actor-in .6s cubic-bezier(.2, .7, .2, 1) both;
}
/* 谁挡在谁前面由 Stage.jsx 按 stackLayers 写进 z-index（说话的人在最前，说完也留在前面）；这里的 z-index 只给分屏、闪回里的人用 */
.fg-actor.is-speaking { filter: brightness(1.04) saturate(1.05) drop-shadow(0 0 1.4cqw rgba(255, 255, 255, .18)); z-index: 2; }
.fg-actor.is-leaving { animation: fg-actor-out .45s ease both; }
/* 没在说话、但对这句有反应的人：比旁边站着的人亮一点（说话的人更亮） */
.fg-actor.is-reacting { filter: brightness(.9) saturate(.92); }
/* 走位：上前一步的站到前面；背过身：不翻面，身子往外一侧一晃（Stage.jsx 的 TURN_FRAMES），一边糊一下一边暗成一道背影；探头：站在舞台边上，身子往里探；
   躲到谁身后：缩在他背后，从他肩旁往外探出半个身子（站位、图层在 lib/blocking.js） */
.fg-actor[data-depth="-1"] { filter: brightness(.62) saturate(.72); }
.fg-actor-turn, .fg-actor-react { position: absolute; inset: 0; transform-origin: 50% 100%; }
.fg-actor-turn { transform: translateY(var(--drop, 0%)) rotate(var(--lean, 0deg)); transition: transform .5s cubic-bezier(.45, .05, .3, 1), filter .7s ease; }
/* 没有背面的立绘：转过去以后压成一道微微糊开的背影（看不清脸），边上留一圈淡淡的轮廓光；转回来时从影子里亮回来 */
.fg-actor.is-away .fg-actor-turn { filter: brightness(.12) saturate(.25) blur(.12cqw) drop-shadow(0 0 .5cqw rgba(255, 255, 255, .28)); }
.fg-actor.is-peek[data-peek="left"] .fg-actor-turn { --lean: 5deg; }
.fg-actor.is-peek[data-peek="right"] .fg-actor-turn { --lean: -5deg; }
.fg-actor.is-hiding:not(.is-down) .fg-actor-turn { --drop: 2%; }
.fg-actor.is-hiding[data-hide="left"]:not(.is-down) .fg-actor-turn { --lean: -3deg; }
.fg-actor.is-hiding[data-hide="right"]:not(.is-down) .fg-actor-turn { --lean: 3deg; }
/* 被击倒：歪倒、往下沉、暗成一道影子（打中那一下之后才倒），上半身沉进一团黑雾里看不清脸；到他再开口、自己走位或被治疗时站起来、雾散掉。
   雾在 .fg-actor-turn 里，跟着人一起歪倒；不倒的时候 visibility: hidden 不画 */
.fg-actor.is-down .fg-actor-turn { --lean: -11deg; --drop: 14%; filter: brightness(.4) saturate(.35) grayscale(.4); transition-delay: .5s; }
.fg-down-mist { position: absolute; left: 50%; top: calc(var(--head, 9%) - 8%); width: 100%; height: 62%; transform: translateX(-50%); pointer-events: none; visibility: hidden; opacity: 0;
  background: radial-gradient(ellipse 42% 40% at 50% 38%, rgba(5, 3, 9, .98) 0 50%, rgba(5, 3, 9, .85) 68%, transparent 100%); transition: opacity .8s ease, visibility 0s linear .8s; }
.fg-actor.is-down .fg-down-mist { visibility: visible; opacity: 1; transition: opacity 1.4s ease .55s, visibility 0s; }
.fg-down-mist i { position: absolute; border-radius: 50%; background: radial-gradient(circle, rgba(8, 5, 14, .92), rgba(8, 5, 14, .5) 46%, transparent 70%); filter: blur(.7cqw); animation: fg-mist-drift 7s ease-in-out infinite; }
.fg-down-mist i:nth-child(1) { left: 4%; top: 18%; width: 54%; height: 60%; }
.fg-down-mist i:nth-child(2) { left: 42%; top: 8%; width: 54%; height: 64%; animation-duration: 8.5s; animation-delay: -3s; }
.fg-down-mist i:nth-child(3) { left: 20%; top: 44%; width: 62%; height: 56%; animation-duration: 6.2s; animation-delay: -1.5s; }
.fg-down-mist i:nth-child(4) { left: 28%; top: -6%; width: 44%; height: 44%; animation: fg-mist-rise 5.6s ease-in infinite; }
@keyframes fg-mist-drift { 0%, 100% { transform: translate(0, 0) scale(1); } 50% { transform: translate(5%, -7%) scale(1.08); } }
@keyframes fg-mist-rise { 0% { opacity: 0; transform: translateY(24%) scale(.8); } 30% { opacity: .85; } 100% { opacity: 0; transform: translateY(-46%) scale(1.35); } }
/* 打中时身上的一下：命中、暴击是一道斩痕，格挡是一圈光；不写字。在打中那一刻（--impact）出来 */
.fg-hit-mark { position: absolute; left: 50%; top: calc(var(--head, 9%) + 14%); width: 0; height: 0; z-index: 5; pointer-events: none; }
.fg-hit-mark::before { content: ""; position: absolute; left: -9cqw; top: -.25cqw; width: 18cqw; height: .5cqw; border-radius: 1cqw; background: linear-gradient(90deg, transparent, #fff 30%, #fff 70%, transparent); box-shadow: 0 0 1.2cqw rgba(255, 255, 255, .9);
  transform: rotate(-28deg) scaleX(0); opacity: 0; animation: fg-hit-slash .38s cubic-bezier(.2, .9, .3, 1) var(--impact, .4s) both; }
.fg-hit-mark[data-effect="crit"]::before { height: .8cqw; background: linear-gradient(90deg, transparent, #fff 25%, #ff5a5a 50%, #fff 75%, transparent); box-shadow: 0 0 1.6cqw rgba(255, 60, 60, .9); }
.fg-hit-mark:not([data-effect="hit"]):not([data-effect="crit"])::before { display: none; }
.fg-hit-mark[data-effect="block"]::after { content: ""; position: absolute; left: -6cqw; top: -6cqw; width: 12cqw; height: 12cqw; border-radius: 50%; border: .35cqw solid rgba(150, 210, 255, .95); box-shadow: 0 0 2cqw rgba(80, 160, 255, .8), inset 0 0 2cqw rgba(80, 160, 255, .5);
  opacity: 0; animation: fg-hit-ring .5s ease-out var(--impact, .4s) both; }
@keyframes fg-hit-slash { 0% { opacity: 1; transform: rotate(-28deg) scaleX(0); } 45% { opacity: 1; transform: rotate(-28deg) scaleX(1); } 100% { opacity: 0; transform: rotate(-28deg) scaleX(1.1); } }
@keyframes fg-hit-ring { 0% { opacity: 1; transform: scale(.4); } 100% { opacity: 0; transform: scale(1.3); } }
/* 进来的样子：跑进来（从远一点的地方冲进来、刹一下）、慢慢走进来、探头（从边上探出来） */
.fg-actor[data-enter="run"] { animation: fg-actor-run-in .5s cubic-bezier(.2, .8, .3, 1.15) both; }
.fg-actor[data-enter="slow"] { animation: fg-actor-in 1.6s cubic-bezier(.3, .4, .3, 1) both; }
.fg-actor[data-enter="peek"] { animation: fg-actor-peek-in .9s cubic-bezier(.2, .7, .2, 1) both; }
/* 走的样子：甩头离开（一下暗成背影、快步走掉，不翻面）、跑开、慢慢走远（缩小、淡掉）；时长对上 Stage.jsx 的 EXIT_MS */
.fg-actor.is-leaving[data-exit="storm"] { animation: fg-actor-storm .65s cubic-bezier(.5, 0, .8, .4) both; }
.fg-actor.is-leaving[data-exit="storm"] .fg-actor-turn { filter: brightness(.22) saturate(.35) drop-shadow(0 0 .5cqw rgba(255, 255, 255, .2)); transition-duration: .2s; }
.fg-actor.is-leaving[data-exit="run"] { animation: fg-actor-run-out .42s cubic-bezier(.5, 0, .9, .5) both; }
.fg-actor.is-leaving[data-exit="slow"] { animation: fg-actor-slow-out 1.3s ease-in both; }
/* --edge：离这个人近的那一边（站在中间的按他在左半边还是右半边），跑进跑出、探头都从那边来、往那边去 */
@keyframes fg-actor-run-in { 0% { opacity: 0; transform: translateX(calc(-50% + var(--edge, 40%) * 1.6)); } 55% { opacity: 1; } 82% { transform: translateX(calc(-50% - var(--edge, 40%) * .05)); } 100% { transform: translateX(-50%); } }
@keyframes fg-actor-peek-in { from { opacity: 0; transform: translateX(calc(-50% + var(--edge, 40%) * .5)); } }
@keyframes fg-actor-storm { 0%, 22% { opacity: 1; transform: translateX(-50%); } 100% { opacity: 0; transform: translateX(calc(-50% + var(--edge, 40%) * 1.3)); } }
@keyframes fg-actor-run-out { to { opacity: 0; transform: translateX(calc(-50% + var(--edge, 40%) * 1.6)); } }
@keyframes fg-actor-slow-out { to { opacity: 0; transform: translateX(calc(-50% + var(--edge, 40%) * .35)) scale(.92); } }
.fg-actor-body { position: absolute; inset: 0; transform-origin: 50% 100%; animation: fg-breathe 4.8s ease-in-out infinite; }
.fg-actor.is-speaking .fg-actor-body { animation: fg-speak-hop .42s cubic-bezier(.3, 1.6, .5, 1), fg-breathe 4.8s ease-in-out .42s infinite; }
/* 逆转式立绘自带一顿一顿的呼吸，去掉平滑呼吸，只留说话时的轻跳 */
.fg-actor.is-aa .fg-actor-body { animation: none; }
.fg-actor.is-aa.is-speaking .fg-actor-body { animation: fg-speak-hop .42s cubic-bezier(.3, 1.6, .5, 1); }
/* --k 按脸框缩放（头一样大），--lift 按身高抬高或压低（lib/stature.js）；都按立绘框的高度算。每张图带着自己的（Stage.jsx 写在 img 上），
   换图时新图从第一帧起就是自己的大小；过渡只在同一张图后来才量好脸框、改了身高时缓过去 */
.fg-actor img, .fg-actor .fg-aa { position: absolute; left: 50%; bottom: calc(var(--lift, 0) * 100%); height: calc(var(--k, 1) * 100%); width: auto; max-width: none; transform: translateX(-50%);
  transition: height .4s ease, bottom .4s ease;
  -webkit-mask-image: linear-gradient(180deg, #000 78%, transparent 99%), radial-gradient(120% 100% at 50% 40%, #000 62%, transparent 82%);
  -webkit-mask-composite: source-in; mask-image: linear-gradient(180deg, #000 78%, transparent 99%); }
.fg-actor.is-upload img, .fg-actor.is-upload .fg-aa { -webkit-mask-image: none; mask-image: none; }
/* 换立绘（换表情、换动作）：新图盖在旧图上淡入，旧图过了一小半才开始淡出，两张重叠的地方不透出背景。时长对上 Stage.jsx 的 SWAP_MS */
.fg-actor img.is-in { animation: fg-sprite-in .28s ease-out both; }
.fg-actor img.is-out { animation: fg-sprite-out .28s ease-in both; }
/* 登场从靠近的一侧滑进来，退场往同一侧淡出（--side 由站位决定）。 */
@keyframes fg-actor-in { from { opacity: 0; transform: translateX(calc(-50% + var(--side, 0%))) translateY(3%); } }
@keyframes fg-actor-out { to { opacity: 0; transform: translateX(calc(-50% + var(--side, 0%))) translateY(2%); } }
@keyframes fg-breathe { 0%, 100% { transform: scaleY(1); } 50% { transform: scaleY(1.008) translateY(-.25%); } }
@keyframes fg-speak-hop { 0% { transform: translateY(0); } 40% { transform: translateY(-1.6%); } 100% { transform: translateY(0); } }
@keyframes fg-sprite-in { from { opacity: 0; } }
@keyframes fg-sprite-out { 0%, 40% { opacity: 1; } 100% { opacity: 0; } }

/* 没有立绘时的剪影立绘：角色色渐变 + 轮廓光。 */
.fg-silhouette { position: absolute; left: 50%; bottom: calc(var(--lift, 0) * 100%); height: 94%; aspect-ratio: 0.52; transform: translateX(-50%); }
.fg-silhouette svg { width: 100%; height: 100%; overflow: visible; }
.fg-silhouette .sil-rim { fill: none; stroke: color-mix(in oklab, var(--c) 55%, #fff); stroke-width: 2.4; opacity: .85; filter: drop-shadow(0 0 5px var(--c)) drop-shadow(0 0 14px var(--c)); stroke-dasharray: 1400; animation: fg-rim-draw 2.4s cubic-bezier(.4, 0, .2, 1) both; }
@keyframes fg-rim-draw { from { stroke-dashoffset: 1400; } to { stroke-dashoffset: 0; } }
.fg-silhouette-name { position: absolute; left: 50%; top: 50%; transform: translateX(-50%); font-family: var(--font-display); font-size: 5.4cqw; font-weight: 900; letter-spacing: .25em; color: transparent; -webkit-text-stroke: 1px color-mix(in oklab, var(--c) 40%, #fff); opacity: .5; writing-mode: vertical-rl; white-space: nowrap; }
.fg-silhouette-tag { position: absolute; left: 50%; bottom: 30%; transform: translateX(-50%); font-family: var(--font-latin); font-size: .75cqw; letter-spacing: .5em; white-space: nowrap; color: rgba(255, 255, 255, .55); }

/* ── CG ── */
/* 一张插画：照 galgame 的做法，默认溶入 → 静止 → 溶回场景；导演只在这一刻的分量、节奏特别时换（data-in / data-out / data-motion）。
   出现时对话框先让开、等画面出来再回来（Theater.jsx）；时长跟 Stage.jsx 的 CG_IN_MS / CG_OUT_MS 对上。 */
.fg-cg { position: absolute; inset: 0; z-index: 6; overflow: hidden; }
.fg-cg:not(.is-leaving) { animation: var(--cg-in, fg-cg-fade-in) var(--cg-in-dur, .8s) var(--cg-in-ease, ease-in-out) both; }
.fg-cg.is-leaving { pointer-events: none; animation: var(--cg-out, fg-cg-fade-out) var(--cg-out-dur, .8s) var(--cg-out-ease, ease-in-out) both; }
.fg-cg-art { position: absolute; inset: 0; }
.fg-cg::after { content: ""; position: absolute; inset: 0; background: linear-gradient(180deg, transparent 62%, rgba(0, 0, 0, .4)); pointer-events: none; }
.fg-cg-img { position: absolute; inset: 0; background-size: cover; background-position: center; }
/* 竖版插画：模糊的同图垫底，前景铺满宽度；停在顶上 → 慢慢看到底 → 拉远停在全貌，只看一遍（等出现演完再开始）。 */
.fg-cg.is-tall { background: #000; }
.fg-cg-back { position: absolute; inset: -6%; background-size: cover; background-position: center; filter: blur(2.4cqw) brightness(.5) saturate(1.15); }
.fg-cg-pan { position: absolute; left: 0; top: 0; width: 100%; height: auto; transform-origin: 50% 0; box-shadow: 0 0 5cqw rgba(0, 0, 0, .65); animation: fg-cg-pan var(--pan, 26s) cubic-bezier(.45, 0, .55, 1) var(--cg-in-dur, 1s) both; will-change: transform; user-select: none; }
@keyframes fg-cg-pan {
  0%, 12% { transform: translateY(0) scale(1); }
  60%, 68% { transform: translateY(calc((var(--r) - 1) * 100%)) scale(1); }
  100% { transform: translateY(0) scale(var(--r)); }
}
/* 出现：溶入（默认，按基调分快 / 正常 / 慢）、暗场后浮现、白闪、由虚到实、直接切入、冲击 */
.fg-cg[data-in="quick"] { --cg-in-dur: .4s; }
.fg-cg[data-in="slow"] { --cg-in-dur: 1.5s; }
.fg-cg[data-in="black"] { --cg-in: fg-cg-black-in; --cg-in-dur: 1.8s; }
.fg-cg[data-in="flash"] { --cg-in: none; --cg-in-dur: .6s; }
.fg-cg[data-in="focus"] { --cg-in: fg-cg-focus-in; --cg-in-dur: 1.5s; --cg-in-ease: ease-out; }
.fg-cg[data-in="cut"] { --cg-in: none; }
.fg-cg[data-in="impact"] { --cg-in: fg-cg-impact-in; --cg-in-dur: .6s; --cg-in-ease: linear; }
@keyframes fg-cg-fade-in { from { opacity: 0; } to { opacity: 1; } }
/* 暗场：先把画面压成全黑（约半秒）、停一下，再从黑里亮出这张画 */
@keyframes fg-cg-black-in { 0% { opacity: 0; filter: brightness(0); } 28% { opacity: 1; filter: brightness(0); } 45% { filter: brightness(0); } 100% { opacity: 1; filter: brightness(1); } }
/* 白闪：整个画面先白掉，插画从白里显出来。白的那层是 ::before，所以插画本身不淡入，只让画和底部压暗晚一点出现 */
.fg-cg[data-in="flash"]:not(.is-leaving) > .fg-cg-art, .fg-cg[data-in="flash"]:not(.is-leaving)::after { animation: fg-cg-flash-in .6s linear both; }
@keyframes fg-cg-flash-in { 0%, 16% { opacity: 0; } 17%, 100% { opacity: 1; } }
.fg-cg[data-in="flash"]:not(.is-leaving)::before, .fg-cg[data-in="impact"]:not(.is-leaving)::before { content: ""; position: absolute; inset: 0; z-index: 2; background: #fff; pointer-events: none; animation: fg-cg-white var(--cg-in-dur, 1s) ease-out both; }
/* 白闪：0.1 秒白掉，半秒退回来（Ren'Py 的「相机闪光」也是这个节奏）；一秒里最多闪一次 */
@keyframes fg-cg-white { 0% { opacity: 0; } 17% { opacity: 1; } 100% { opacity: 0; } }
@keyframes fg-cg-focus-in { 0% { opacity: 0; filter: blur(24px); transform: scale(1.03); } 35% { opacity: 1; } 100% { opacity: 1; filter: blur(0); transform: none; } }
/* 冲击：白闪一下，画面跟着震几下、越震越小（幅度约画面的 1.5%，跟大厂脚本里的 quake 差不多） */
@keyframes fg-cg-impact-in {
  0% { opacity: 1; transform: none; }
  14% { transform: translate(-1.5%, 1%); }
  28% { transform: translate(1.3%, -.8%); }
  42% { transform: translate(-.9%, .5%); }
  58% { transform: translate(.5%, -.3%); }
  76% { transform: translate(-.2%, .1%); }
  100% { opacity: 1; transform: none; }
}
/* 收起：溶回场景（默认，按基调分快 / 正常 / 慢）、暗下去、白闪；直接切掉（cut）不演 */
.fg-cg[data-out="quick"] { --cg-out-dur: .4s; }
.fg-cg[data-out="slow"] { --cg-out-dur: 1.5s; }
.fg-cg[data-out="black"] { --cg-out: fg-cg-black-out; --cg-out-dur: 1.5s; }
.fg-cg[data-out="flash"] { --cg-out: none; --cg-out-dur: .6s; }
@keyframes fg-cg-fade-out { from { opacity: 1; } to { opacity: 0; } }
/* 暗下去：插画先暗成全黑，再从黑里溶回场景 */
@keyframes fg-cg-black-out { 0% { opacity: 1; filter: brightness(1); } 50% { opacity: 1; filter: brightness(0); } 100% { opacity: 0; filter: brightness(0); } }
/* 白闪消失：画面白掉的那一刻插画没了，白再慢慢退掉露出场景（同样只让画和底部压暗消失，白层 ::before 留到最后） */
.fg-cg.is-leaving[data-out="flash"] > .fg-cg-art, .fg-cg.is-leaving[data-out="flash"]::after { animation: fg-cg-flash-out .6s linear both; }
@keyframes fg-cg-flash-out { 0%, 16% { opacity: 1; } 17%, 100% { opacity: 0; } }
.fg-cg.is-leaving[data-out="flash"]::before { content: ""; position: absolute; inset: 0; z-index: 2; background: #fff; pointer-events: none; animation: fg-cg-white .6s ease-out both; }

/* 停留：静止（默认）、极慢地推近、慢慢横移一遍；都只走一遍，停在最后的样子（竖版插画自己看一遍，不看这个） */
.fg-cg[data-motion="push"] .fg-cg-img { animation: fg-cg-push 24s cubic-bezier(.4, 0, .6, 1) var(--cg-in-dur, 1s) both; }
.fg-cg[data-motion="pan"] .fg-cg-img { animation: fg-cg-panx 24s cubic-bezier(.45, 0, .55, 1) var(--cg-in-dur, 1s) both; }
@keyframes fg-cg-push { from { transform: scale(1); } to { transform: scale(1.08); } }
@keyframes fg-cg-panx { from { transform: scale(1.1) translateX(-4%); } to { transform: scale(1.1) translateX(4%); } }
.fg-cg-wait { position: absolute; right: 2.4%; top: 12%; z-index: 20; display: flex; align-items: center; gap: .6cqw; font-size: 1cqw; padding: .5cqw 1cqw; border-radius: 99px; background: var(--chip-bg); backdrop-filter: blur(8px); color: var(--ink-dim); }
.fg-cg-wait i { width: .7cqw; height: .7cqw; border-radius: 50%; background: var(--accent); animation: fg-pulse 1.2s ease-in-out infinite; }

/* ── 镜头 ──
   推近、特写、仰拍、缓推、背景虚化、倾斜、下沉、升起、空镜、希区柯克变焦：过渡到那个样子停住，下一拍（data-cam 没了）缓回来。
   对准人的那几种由 Stage.jsx 的 aimCamera 给 --zs 放大倍数、--tx / --ty 平移（脸停在画面中上，不推出框）。震动、甩镜、拉远、平移、虚焦演一下就完。 */
.fg-camera { transition: transform 1s cubic-bezier(.4, 0, .2, 1); }
.fg-camera[data-cam="zoom"], .fg-camera[data-cam="closeup"], .fg-camera[data-cam="slowpush"], .fg-camera[data-cam="focus"] { transform: scale(var(--zs, 1.12)) translate(var(--tx, 0%), var(--ty, 0%)); }
.fg-camera[data-cam="zoom"] { transition: transform 1.6s cubic-bezier(.2, .7, .2, 1); }
.fg-camera[data-cam="closeup"] { transition: transform .9s cubic-bezier(.2, .8, .2, 1); }
.fg-camera[data-cam="slowpush"] { transition: transform 7s cubic-bezier(.3, 0, .4, 1); }
.fg-camera[data-cam="focus"] { transition: transform 1.4s ease; }
.fg-camera[data-cam="lowangle"] { transform: perspective(80cqw) rotateX(4deg) scale(var(--zs, 1.24)) translate(var(--tx, 0%), var(--ty, 0%)); transition: transform 1.3s cubic-bezier(.2, .7, .2, 1); }
.fg-camera[data-cam="tilt"] { transform: rotate(-1.6deg) scale(1.05); transition: transform 1.2s ease; }
.fg-camera[data-cam="sink"] { transform: translateY(-5%) scale(1.07); transition: transform 1.6s cubic-bezier(.4, 0, .2, 1); }
.fg-camera[data-cam="rise"] { transform: translateY(5%) scale(1.07); transition: transform 1.6s cubic-bezier(.4, 0, .2, 1); }
.fg-camera[data-cam="empty"] { transform: scale(1.04); transition: transform 3s ease; }
/* 背景虚化只糊背景、人清楚；特写时背景也轻轻糊一点；空镜时人淡出、只剩背景；希区柯克变焦背景往前涌、人不动 */
.fg-bg { transition: filter 1s ease, scale 2.6s cubic-bezier(.4, 0, .2, 1); }
.fg-camera[data-cam="focus"] .fg-bg { filter: blur(6px) brightness(.86); }
.fg-camera[data-cam="closeup"] .fg-bg { filter: blur(2.5px); }
.fg-camera[data-cam="empty"] .fg-cast { opacity: 0; }
.fg-camera[data-cam="dolly"] .fg-bg { scale: 1.28; }
.fg-camera[data-cam="dolly"] .fg-cast { scale: .96; }
.fg-camera[data-cam="shake"] { animation: fg-shake .5s linear; }
.fg-camera[data-cam="whip"] { animation: fg-whip .55s cubic-bezier(.6, 0, .3, 1); }
.fg-camera[data-cam="zoomout"] { animation: fg-zoomout 1.6s cubic-bezier(.2, .7, .2, 1) both; }
.fg-camera[data-cam="pan"] { animation: fg-pan 3s ease-in-out both; }
.fg-camera[data-cam="blur"] { animation: fg-blur 2.2s ease both; }
@keyframes fg-shake { 0%, 100% { transform: translate(0, 0); } 15% { transform: translate(-1.2%, .6%); } 30% { transform: translate(1%, -.8%); } 45% { transform: translate(-.8%, .4%); } 60% { transform: translate(.6%, .6%); } 80% { transform: translate(-.3%, -.2%); } }
@keyframes fg-whip { 0% { transform: none; filter: none; } 35% { transform: translateX(-9%) scale(1.04); filter: blur(10px); } 60% { transform: translateX(2.5%) scale(1.02); filter: blur(3px); } 100% { transform: none; filter: none; } }
@keyframes fg-zoomout { from { transform: scale(1.14); } to { transform: scale(1); } }
@keyframes fg-pan { 0% { transform: translateX(2%) scale(1.06); } 100% { transform: translateX(-2%) scale(1.06); } }
@keyframes fg-blur { 0% { filter: blur(0); } 30% { filter: blur(6px); } 100% { filter: blur(0); } }
/* 小瞬间：拍照、触碰、干杯、卡片。都在对话框下面，演完淡出（--hold 之后）。 */
.fg-moment { position: absolute; inset: 0; z-index: 18; pointer-events: none; animation: fg-fade-out .45s ease var(--hold, 2s) forwards; }
.fg-touch-ring { position: absolute; left: 50%; top: 44%; width: 26cqw; height: 26cqw; border-radius: 50%; transform: translate(-50%, -50%) scale(.2); opacity: 0;
  background: radial-gradient(circle, transparent 46%, rgba(255, 190, 215, .55) 56%, rgba(255, 150, 190, .2) 62%, transparent 70%); animation: fg-touch-ripple-in 1.8s ease-out both; }
@keyframes fg-touch-ripple-in { 0% { opacity: .95; transform: translate(-50%, -50%) scale(.2); } 100% { opacity: 0; transform: translate(-50%, -50%) scale(2.2); } }
/* 拍照：白闪一下，拍立得的白框框住这一刻（框外压暗），下面写题字；最后像存进相册一样往右上角飞走 */
.fg-photo-flash { position: absolute; inset: 0; background: #fff; opacity: 0; animation: fg-photo-flash .5s ease-out both; }
.fg-photo { position: absolute; left: 50%; top: 40%; width: 54%; height: 56%; box-sizing: border-box; border: 1.2cqw solid #fbf8f1; border-bottom-width: 5.2cqw; border-radius: .3cqw;
  box-shadow: 0 0 0 300cqw rgba(8, 6, 14, .5), 0 1.4cqw 3cqw rgba(0, 0, 0, .55), inset 0 0 .6cqw rgba(0, 0, 0, .35);
  transform: translate(-50%, -50%) rotate(-2.4deg); animation: fg-photo-snap .5s cubic-bezier(.2, .9, .3, 1.2) .12s both, fg-photo-away .5s cubic-bezier(.6, 0, .8, .4) calc(var(--hold, 2s) - 150ms) forwards; }
.fg-photo-caption { position: absolute; left: 0; right: 0; bottom: -4.4cqw; text-align: center; font-family: var(--font-display); font-size: 1.7cqw; letter-spacing: .14em; color: #4a3a42; transform: rotate(-.6deg); }
@keyframes fg-photo-flash { 0% { opacity: 0; } 18% { opacity: .95; } 100% { opacity: 0; } }
@keyframes fg-photo-snap { from { opacity: 0; transform: translate(-50%, -50%) rotate(-2.4deg) scale(1.14); } to { opacity: 1; transform: translate(-50%, -50%) rotate(-2.4deg); } }
@keyframes fg-photo-away { to { opacity: 0; transform: translate(10%, -120%) rotate(8deg) scale(.3); box-shadow: 0 0 0 300cqw rgba(8, 6, 14, 0), 0 1.4cqw 3cqw rgba(0, 0, 0, 0); } }
/* 干杯：两只杯子从两边碰到一起，碰上那一刻一闪 */
.fg-cup { position: absolute; top: 34%; width: 6cqw; height: 9.6cqw; filter: drop-shadow(0 .4cqw .8cqw rgba(0, 0, 0, .4)); }
.fg-cup svg { width: 100%; height: 100%; display: block; }
.fg-cup.is-left { left: calc(50% - 6.4cqw); transform-origin: 50% 90%; animation: fg-cup-left var(--clink, .5s) cubic-bezier(.3, .6, .4, 1) both, fg-cup-back-l .5s ease-out var(--clink, .5s) both; }
.fg-cup.is-right { left: calc(50% + .4cqw); transform-origin: 50% 90%; animation: fg-cup-right var(--clink, .5s) cubic-bezier(.3, .6, .4, 1) both, fg-cup-back-r .5s ease-out var(--clink, .5s) both; }
.fg-cup.is-right svg { transform: scaleX(-1); }
.fg-clink { position: absolute; left: 50%; top: 36%; width: 9cqw; height: 9cqw; transform: translate(-50%, -50%) scale(0); opacity: 0;
  background: repeating-conic-gradient(rgba(255, 246, 200, .95) 0 6deg, transparent 6deg 30deg); -webkit-mask-image: radial-gradient(circle, transparent 22%, #000 26%, #000 46%, transparent 50%); mask-image: radial-gradient(circle, transparent 22%, #000 26%, #000 46%, transparent 50%);
  animation: fg-clink .45s ease-out var(--clink, .5s) both; }
@keyframes fg-cup-left { from { opacity: 0; transform: translateX(-22cqw) rotate(-18deg); } to { opacity: 1; transform: rotate(14deg); } }
@keyframes fg-cup-right { from { opacity: 0; transform: translateX(22cqw) rotate(18deg); } to { opacity: 1; transform: rotate(-14deg); } }
@keyframes fg-cup-back-l { from { transform: rotate(14deg); } 30% { transform: translateX(-.8cqw) rotate(6deg); } to { transform: translateX(-.4cqw) rotate(8deg); } }
@keyframes fg-cup-back-r { from { transform: rotate(-14deg); } 30% { transform: translateX(.8cqw) rotate(-6deg); } to { transform: translateX(.4cqw) rotate(-8deg); } }
@keyframes fg-clink { 0% { opacity: 1; transform: translate(-50%, -50%) scale(.3); } 100% { opacity: 0; transform: translate(-50%, -50%) scale(1.5); } }
/* 卡片：做好一道菜、新称呼、约定、交换联系方式。纸一样的小卡片从上面落下来，停一会儿淡出 */
.fg-moment-card { position: absolute; left: 50%; top: 13%; min-width: 22cqw; max-width: 46cqw; box-sizing: border-box; padding: 1.4cqw 2.6cqw 1.6cqw; text-align: center; color: #3b2a33;
  background: linear-gradient(180deg, #fffdf8, #fbf3e8); border-radius: .7cqw; border-top: .45cqw solid var(--who, #ff8fb4); box-shadow: 0 1.2cqw 3cqw rgba(0, 0, 0, .45);
  transform: translateX(-50%) rotate(-1.4deg); animation: fg-moment-card .6s cubic-bezier(.2, .9, .3, 1.15) both; }
.fg-moment-kicker { font-family: var(--font-latin); font-size: 1cqw; letter-spacing: .5em; padding-left: .5em; color: var(--who, #e0789c); opacity: .9; }
.fg-moment-main { font-family: var(--font-display); font-size: 3cqw; font-weight: 800; letter-spacing: .08em; line-height: 1.25; margin: .3cqw 0; }
.fg-moment-sub { font-size: 1.3cqw; letter-spacing: .3em; color: rgba(59, 42, 51, .7); }
.fg-moment-place { margin-top: .4cqw; font-size: 1.5cqw; letter-spacing: .14em; color: rgba(59, 42, 51, .85); }
.fg-moment-place::before { content: ""; display: inline-block; width: .9cqw; height: .9cqw; margin-right: .6cqw; vertical-align: -.05cqw; border-radius: 50% 50% 50% 0; background: var(--who, #ff8fb4); transform: rotate(-45deg); }
.fg-moment[data-kind="cook"] .fg-moment-card { border-top-color: #f5a742; }
.fg-moment[data-kind="cook"] .fg-moment-kicker { color: #e08a2c; }
.fg-moment[data-kind="promise"] .fg-moment-card { border-top-color: #7fb6ff; background: linear-gradient(180deg, #fbfdff, #eef4ff); }
.fg-moment[data-kind="promise"] .fg-moment-kicker { color: #5a8fe0; }
.fg-moment[data-kind="nickname"] .fg-moment-main { color: #d4467a; }
.fg-steam { position: absolute; left: 50%; top: -3.2cqw; width: 6cqw; height: 3.2cqw; transform: translateX(-50%); display: flex; justify-content: space-between; }
.fg-steam i { width: .5cqw; height: 100%; border-radius: 1cqw; background: linear-gradient(0deg, rgba(255, 255, 255, .8), transparent); filter: blur(.12cqw); animation: fg-steam 1.6s ease-in-out infinite; }
.fg-steam i:nth-child(2) { animation-delay: .4s; height: 120%; margin-top: -20%; }
.fg-steam i:nth-child(3) { animation-delay: .8s; }
.fg-contact { display: flex; align-items: center; gap: 1.2cqw; text-align: left; margin-top: .6cqw; }
.fg-contact-face { display: grid; place-items: center; width: 4cqw; height: 4cqw; border-radius: 50%; background: var(--who, #ff8fb4); color: #fff; font-style: normal; font-size: 1.9cqw; font-weight: 700; box-shadow: 0 0 0 .3cqw #fff, 0 .3cqw .8cqw rgba(0, 0, 0, .25); }
.fg-contact .fg-moment-main { font-size: 2.2cqw; margin: 0; }
@keyframes fg-moment-card { from { opacity: 0; transform: translateX(-50%) translateY(-3cqw) rotate(-5deg); } to { opacity: 1; transform: translateX(-50%) rotate(-1.4deg); } }
@keyframes fg-steam { 0% { opacity: 0; transform: translateY(.6cqw) scaleY(.6); } 40% { opacity: .9; } 100% { opacity: 0; transform: translateY(-1.2cqw) translateX(.3cqw) scaleY(1.1); } }
/* 烟花：在背景和立绘之间，天上错开炸开三朵；升空的细线、炸开的光芒、天跟着亮一下 */
.fg-fireworks { position: absolute; inset: 0; z-index: 1; pointer-events: none; overflow: hidden; }
.fg-firework i { position: absolute; display: block; }
.fg-fw-trail { left: var(--x); top: var(--y); width: .25cqw; height: 8cqw; transform: translateX(-50%); background: linear-gradient(0deg, transparent, hsl(var(--hue) 100% 85%)); opacity: 0; animation: fg-fw-rise var(--rise, .7s) cubic-bezier(.2, .6, .4, 1) var(--at) both; }
.fg-fw-burst { left: var(--x); top: var(--y); width: 30cqw; height: 30cqw; border-radius: 50%; transform: translate(-50%, -50%) scale(.1); opacity: 0;
  background: repeating-conic-gradient(hsl(var(--hue) 100% 75%) 0 2.5deg, transparent 2.5deg 12deg); -webkit-mask-image: radial-gradient(circle, transparent 18%, #000 30%, rgba(0, 0, 0, .8) 46%, transparent 50%); mask-image: radial-gradient(circle, transparent 18%, #000 30%, rgba(0, 0, 0, .8) 46%, transparent 50%);
  filter: drop-shadow(0 0 .6cqw hsl(var(--hue) 100% 70%)); animation: fg-fw-burst 1.7s cubic-bezier(.1, .7, .3, 1) calc(var(--at) + var(--rise, .7s)) both; }
.fg-fw-burst.is-inner { width: 16cqw; height: 16cqw; background: repeating-conic-gradient(from 6deg, hsl(calc(var(--hue) + 40) 100% 82%) 0 3deg, transparent 3deg 18deg); animation-duration: 1.3s; }
.fg-fw-glow { left: var(--x); top: var(--y); width: 90cqw; height: 90cqw; border-radius: 50%; transform: translate(-50%, -50%); opacity: 0; background: radial-gradient(circle, hsl(var(--hue) 100% 70% / .3), transparent 60%); animation: fg-fw-glow 1.4s ease-out calc(var(--at) + var(--rise, .7s)) both; }
@keyframes fg-fw-rise { 0% { opacity: 1; top: 100%; } 85% { opacity: 1; } 100% { opacity: 0; top: var(--y); } }
@keyframes fg-fw-burst { 0% { opacity: 1; transform: translate(-50%, -50%) scale(.1); } 60% { opacity: 1; } 100% { opacity: 0; transform: translate(-50%, -40%) scale(1); } }
@keyframes fg-fw-glow { 0% { opacity: 0; } 12% { opacity: 1; } 100% { opacity: 0; } }
/* 手机：来电 / 拨出时右边滑进来一部响着的手机，接通后收成右上角的「通话中」；挂断的小卡；视频通话的小窗；通知横幅 */
.fg-phone { position: absolute; right: 4.5%; top: 13%; z-index: 18; pointer-events: none; animation: fg-phone-in .5s cubic-bezier(.2, .9, .3, 1.1) both; }
.fg-phone-card { width: 17cqw; box-sizing: border-box; padding: 1.5cqw 1.4cqw 1.6cqw; border-radius: 2cqw; text-align: center; color: #fff;
  background: linear-gradient(180deg, rgba(40, 44, 58, .86), rgba(18, 20, 28, .9)); border: 1px solid rgba(255, 255, 255, .16); box-shadow: 0 1.4cqw 3.4cqw rgba(0, 0, 0, .5), inset 0 1px 0 rgba(255, 255, 255, .12);
  backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); }
.fg-phone[data-side="left"] { right: auto; left: 4.5%; } /* 分屏在右边开着时 */
.fg-phone[data-dir="in"] .fg-phone-card { animation: fg-phone-buzz .78s ease-in-out .1s 2; }
.fg-phone-label { display: flex; align-items: center; justify-content: center; gap: .4cqw; font-size: 1.05cqw; letter-spacing: .24em; color: rgba(255, 255, 255, .72); }
.fg-phone-label svg { width: 1.2cqw; height: 1.2cqw; }
.fg-phone-avatar { position: relative; width: 7.4cqw; height: 7.4cqw; margin: 1.2cqw auto .8cqw; }
.fg-phone-face, .fg-pip-face, .fg-notify-icon { position: relative; overflow: hidden; display: grid; place-items: center; color: #fff; font-weight: 700; background: radial-gradient(circle at 50% 35%, color-mix(in oklab, var(--who, #8aa4ff) 70%, #fff), var(--who, #8aa4ff)); }
.fg-phone-face img, .fg-pip-face img, .fg-notify-icon img { position: absolute; max-width: none; height: auto; }
.fg-phone-face { width: 100%; height: 100%; border-radius: 50%; font-size: 3.2cqw; box-shadow: 0 0 0 .25cqw rgba(255, 255, 255, .85), 0 .5cqw 1.4cqw rgba(0, 0, 0, .4); }
.fg-phone-ripple { position: absolute; inset: 0; border-radius: 50%; border: .2cqw solid rgba(140, 255, 190, .8); opacity: 0; animation: fg-phone-ripple 1.2s ease-out infinite; }
.fg-phone-name { font-family: var(--font-display); font-size: 2cqw; font-weight: 700; letter-spacing: .08em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.fg-phone-keys { display: flex; justify-content: center; gap: 3.4cqw; margin-top: 1.4cqw; }
.fg-phone-key { display: grid; place-items: center; width: 3.6cqw; height: 3.6cqw; border-radius: 50%; color: #fff; background: #f2484f; box-shadow: 0 .4cqw 1cqw rgba(0, 0, 0, .35); }
.fg-phone-key svg { width: 55%; height: 55%; }
.fg-phone-key.is-decline svg { transform: rotate(135deg); }
.fg-phone-key.is-accept { background: #34c759; animation: fg-phone-accept 1.1s ease-in-out infinite; }
.fg-phone[data-dir="out"] .fg-phone-label::after { content: ""; display: inline-block; width: 1.6cqw; height: .3cqw; margin-left: .3cqw; background: radial-gradient(circle, currentColor 40%, transparent 45%) 0 50% / .55cqw .3cqw repeat-x; animation: fg-phone-dots 1.2s steps(4) infinite; }
.fg-phone.is-end { animation: fg-phone-in .4s cubic-bezier(.2, .9, .3, 1.1) both, fg-fade-out .45s ease var(--hold, 2s) forwards; }
.fg-phone.is-end .fg-phone-face { filter: grayscale(.6) brightness(.85); }
.fg-phone-result { display: flex; align-items: center; justify-content: center; gap: .5cqw; margin-top: .6cqw; font-size: 1.3cqw; letter-spacing: .12em; color: rgba(255, 255, 255, .8); font-variant-numeric: tabular-nums; }
.fg-phone-result i { display: grid; place-items: center; width: 1.9cqw; height: 1.9cqw; border-radius: 50%; background: #f2484f; }
.fg-phone-result svg { width: 60%; height: 60%; transform: rotate(135deg); color: #fff; }
.fg-phone.is-end[data-result="missed"] .fg-phone-result, .fg-phone.is-end[data-result="declined"] .fg-phone-result, .fg-phone.is-end[data-result="hungup"] .fg-phone-result { color: #ff8a8f; }
@keyframes fg-phone-in { from { opacity: 0; transform: translateX(6cqw) scale(.94); } to { opacity: 1; transform: none; } }
@keyframes fg-phone-buzz { 0%, 46%, 100% { transform: none; } 6%, 18%, 30% { transform: translateX(-.3cqw) rotate(-1.5deg); } 12%, 24%, 36% { transform: translateX(.3cqw) rotate(1.5deg); } }
@keyframes fg-phone-ripple { 0% { opacity: .9; transform: scale(1); } 100% { opacity: 0; transform: scale(1.55); } }
@keyframes fg-phone-accept { 0%, 100% { transform: none; box-shadow: 0 .4cqw 1cqw rgba(0, 0, 0, .35), 0 0 0 0 rgba(52, 199, 89, .6); } 50% { transform: translateY(-.25cqw); box-shadow: 0 .4cqw 1cqw rgba(0, 0, 0, .35), 0 0 0 .8cqw rgba(52, 199, 89, 0); } }
@keyframes fg-phone-dots { from { width: 0; } to { width: 1.65cqw; } }
.fg-call-chip { color: #b8ffd0; border-color: rgba(52, 199, 89, .55); background: rgba(10, 40, 22, .62); animation: fg-call-chip .45s cubic-bezier(.2, .9, .3, 1.2) both; }
.fg-call-chip svg { width: 1.05cqw; height: 1.05cqw; }
.fg-call-chip b { font-weight: 600; font-variant-numeric: tabular-nums; letter-spacing: .06em; color: #fff; }
.fg-call-dot { width: .6cqw; height: .6cqw; border-radius: 50%; background: #34c759; box-shadow: 0 0 .6cqw #34c759; animation: fg-call-dot 1.4s ease-in-out infinite; }
@keyframes fg-call-chip { from { opacity: 0; transform: translateX(3cqw) scale(.8); } to { opacity: 1; transform: none; } }
@keyframes fg-call-dot { 0%, 100% { opacity: 1; } 50% { opacity: .35; } }
.fg-pip { position: absolute; right: 2.2%; top: 10%; z-index: 17; width: 12cqw; aspect-ratio: 3 / 4; border-radius: 1.2cqw; overflow: hidden; pointer-events: none;
  border: .2cqw solid rgba(255, 255, 255, .75); box-shadow: 0 1cqw 2.6cqw rgba(0, 0, 0, .5); background: #111; animation: fg-phone-in .5s cubic-bezier(.2, .9, .3, 1.1) both; transition: border-color .3s, box-shadow .3s; }
.fg-pip.is-talking { border-color: #34c759; box-shadow: 0 1cqw 2.6cqw rgba(0, 0, 0, .5), 0 0 1.4cqw rgba(52, 199, 89, .6); }
.fg-pip-face { position: absolute; inset: 0; font-size: 4cqw; }
.fg-pip-face img { filter: saturate(1.05) contrast(1.03); }
.fg-pip-face::after { content: ""; position: absolute; inset: 0; background: repeating-linear-gradient(0deg, rgba(255, 255, 255, .03) 0 1px, transparent 1px 3px), linear-gradient(180deg, transparent 60%, rgba(0, 0, 0, .55)); }
.fg-pip-name { position: absolute; left: .8cqw; right: .8cqw; bottom: .7cqw; display: flex; align-items: center; gap: .4cqw; font-size: 1.05cqw; letter-spacing: .1em; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.fg-pip-name i { flex: none; width: .55cqw; height: .55cqw; border-radius: 50%; background: #ff453a; animation: fg-call-dot 1.4s ease-in-out infinite; }
.fg-notify { position: absolute; left: 50%; top: 3%; z-index: 23; display: flex; gap: 1cqw; align-items: flex-start; width: 36cqw; box-sizing: border-box; padding: 1cqw 1.3cqw; border-radius: 1.6cqw; pointer-events: none; color: #fff;
  background: rgba(30, 32, 40, .78); border: 1px solid rgba(255, 255, 255, .14); box-shadow: 0 1cqw 2.6cqw rgba(0, 0, 0, .45); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
  transform: translateX(-50%); animation: fg-notify-in .5s cubic-bezier(.2, .9, .3, 1.15) both, fg-notify-out .4s cubic-bezier(.6, 0, .8, .4) var(--hold, 3s) forwards; }
.fg-notify-icon { flex: none; width: 3.4cqw; height: 3.4cqw; border-radius: .9cqw; font-size: 1.7cqw; }
.fg-notify-body { flex: 1; min-width: 0; }
.fg-notify-head { display: flex; justify-content: space-between; gap: 1cqw; font-size: 1.15cqw; }
.fg-notify-head b { font-weight: 700; letter-spacing: .04em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.fg-notify-head span { flex: none; color: rgba(255, 255, 255, .55); font-size: 1cqw; }
.fg-notify-text { margin-top: .2cqw; font-size: 1.3cqw; line-height: 1.45; color: rgba(255, 255, 255, .9); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.fg-notify-wave { display: flex; align-items: center; gap: .22cqw; height: 2cqw; margin-top: .4cqw; }
.fg-notify-wave i { width: .22cqw; height: var(--h, 50%); border-radius: 1px; background: rgba(255, 255, 255, .75); transform-origin: 50% 50%; animation: fg-notify-wave .9s ease-in-out infinite alternate; }
.fg-notify-wave .fg-notify-play { width: 0; height: 0; margin-right: .6cqw; border-radius: 0; background: none; border-left: .9cqw solid #34c759; border-top: .55cqw solid transparent; border-bottom: .55cqw solid transparent; animation: none; }
.fg-notify[data-kind="voicemail"] .fg-notify-head b { color: #b8ffd0; }
@keyframes fg-notify-in { from { opacity: 0; transform: translateX(-50%) translateY(-120%); } to { opacity: 1; transform: translateX(-50%); } }
@keyframes fg-notify-out { to { opacity: 0; transform: translateX(-50%) translateY(-120%); } }
@keyframes fg-notify-wave { from { transform: scaleY(.35); } to { transform: scaleY(1); } }
/* 被打的不在台上（主角、画外的人）：整个画面替他挨这一下 */
.fg-hurt { position: absolute; inset: 0; z-index: 17; pointer-events: none; animation: fg-hurt .7s ease-out both; background: radial-gradient(ellipse at center, transparent 45%, rgba(220, 20, 40, .55)); }
.fg-hurt[data-effect="crit"] { background: radial-gradient(ellipse at center, rgba(255, 40, 40, .12) 30%, rgba(230, 10, 30, .75)); animation-duration: 1s; }
.fg-hurt[data-effect="down"] { background: radial-gradient(ellipse at center, rgba(0, 0, 0, .3) 30%, rgba(120, 0, 20, .85)); animation: fg-hurt-down 2.2s ease-out both; }
.fg-hurt[data-effect="block"] { background: radial-gradient(ellipse at center, transparent 50%, rgba(80, 160, 255, .5)); }
.fg-hurt[data-effect="heal"] { background: radial-gradient(ellipse at center, rgba(120, 255, 170, .1) 30%, rgba(60, 230, 140, .45)); animation-duration: 1.6s; }
@keyframes fg-hurt { 0% { opacity: 0; } 12% { opacity: 1; } 100% { opacity: 0; } }
@keyframes fg-hurt-down { 0% { opacity: 0; } 10% { opacity: 1; } 70% { opacity: .85; } 100% { opacity: 0; } }
.fg-hud-romance { color: #ff9ec4; }
.fg-hud-sense { color: #c9b8ff; }
.fg-flash { position: absolute; inset: 0; z-index: 40; pointer-events: none; background: #fff; animation: fg-flash .7s ease-out both; }
.fg-flash.is-red { background: radial-gradient(circle, rgba(255, 40, 60, .2), rgba(160, 0, 20, .75)); }
.fg-flash.is-black { background: #000; animation: fg-black 1.6s ease both; }
/* 起雾：整个画面慢慢起一层白雾、失焦，再散开（进出回忆）；薄雾是短闪回进出时的淡一层。都在对话框下面 */
.fg-flash.is-haze, .fg-flash.is-mist { z-index: 15; background: radial-gradient(100% 90% at 50% 45%, rgba(255, 251, 242, .95), rgba(255, 238, 214, .75));
  backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); animation: fg-haze-veil 2.6s ease-in-out both; }
.fg-flash.is-mist { backdrop-filter: blur(5px); -webkit-backdrop-filter: blur(5px); animation: fg-mist 1.5s ease-in-out both; }
@keyframes fg-haze-veil { 0% { opacity: 0; } 38% { opacity: .92; } 55% { opacity: .8; } 100% { opacity: 0; } }
@keyframes fg-mist { 0% { opacity: 0; } 40% { opacity: .38; } 100% { opacity: 0; } }
/* 从回忆里醒过来：回忆的画面慢慢褪成一片暖白（这时舞台上还是回忆）；白透了才换成现在，停一下，再慢慢散开（时长见 playback.js 的 WAKE_MS） */
.fg-flash.is-wake { z-index: 15; background: radial-gradient(100% 90% at 50% 45%, rgba(255, 252, 246, .98), rgba(248, 236, 216, .94));
  backdrop-filter: blur(12px) sepia(.35); -webkit-backdrop-filter: blur(12px) sepia(.35); animation: fg-wake-clear var(--clear, 1.9s) ease-in-out both; }
.fg-flash.is-wake.is-rising { animation: fg-wake-rise var(--rise, 1.7s) cubic-bezier(.45, 0, .7, 1) both; }
@keyframes fg-wake-rise { from { opacity: 0; } to { opacity: 1; } }
@keyframes fg-wake-clear { 0%, 22% { opacity: 1; } 100% { opacity: 0; } }
/* 短闪回：现在的画面压暗、褪色、模糊，闪回里开口的人半透明浮在前面 */
/* 滤镜写在这一层自己身上（子元素的 backdrop-filter 会被这一层的淡入淡出截住，滤不到下面的画面），浮出来的人是子元素，不被滤到 */
.fg-recall { position: absolute; inset: 0; z-index: 9; pointer-events: none; animation: fg-layer-in var(--fade, .5s) ease both;
  backdrop-filter: sepia(.65) saturate(.55) brightness(.5) blur(4px); -webkit-backdrop-filter: sepia(.65) saturate(.55) brightness(.5) blur(4px);
  background: radial-gradient(110% 85% at 50% 42%, rgba(255, 236, 205, .12), rgba(24, 14, 4, .5)); }
.fg-recall.is-leave { animation: fg-layer-out var(--fade, .5s) ease both; }
.fg-recall-veil { position: absolute; inset: 0; background-image: var(--fg-noise); opacity: .12; mix-blend-mode: overlay; }
.fg-recall .fg-actor { filter: sepia(.5) brightness(.8) saturate(.8); opacity: .72; }
/* 闪回里的人等画面暗下去了再慢慢浮出来 */
.fg-recall .fg-actor { animation: fg-ghost-in 1.1s .45s ease-out both; }
@keyframes fg-ghost-in { from { opacity: 0; transform: translateX(-50%) translateY(1.5%); } }
.fg-recall .fg-actor.is-speaking { filter: sepia(.32) brightness(1.04) drop-shadow(0 0 2cqw rgba(255, 238, 210, .55)); opacity: .95; }
/* 短闪回（轻的演法）：画面不动，只是四角泛黄、起一点颗粒 */
.fg-recall.is-light { backdrop-filter: none; -webkit-backdrop-filter: none; background: radial-gradient(120% 95% at 50% 45%, transparent 50%, rgba(130, 88, 36, .4)); }
/* 短闪回的小头像：对话框右上角，泛黄，换人时重新浮出来 */
.fg-recall-face { position: absolute; right: 3.2%; bottom: calc(100% - 1.4cqw); z-index: 2; width: 11cqw; aspect-ratio: 1; border-radius: 1.2cqw; overflow: hidden;
  background: radial-gradient(circle at 50% 40%, rgba(120, 86, 46, .5), rgba(30, 20, 10, .75)); border: 1px solid rgba(240, 210, 160, .55);
  box-shadow: 0 .8cqw 2.4cqw rgba(0, 0, 0, .45), 0 0 2cqw rgba(255, 226, 180, .22), inset 0 0 0 2px color-mix(in oklab, var(--speaker, #f0d2a0) 35%, transparent); animation: fg-face-in .45s ease-out both; }
.fg-recall-face img { position: absolute; max-width: none; height: auto; filter: sepia(.45) saturate(.85) brightness(1.03); }
@keyframes fg-face-in { from { opacity: 0; transform: translateY(.8cqw); } }
/* 短闪回的基调（data-tone）：上面的泛黄是 warm（温暖怀念）。轻的演法换四角的色调，压暗画面的演法换整个画面的滤镜，小头像换色调和出现的样子 */
/* 甜蜜：四角泛粉，几点光斑慢慢飘 */
.fg-recall.is-light[data-tone="sweet"] { background: radial-gradient(120% 95% at 50% 45%, transparent 48%, rgba(255, 150, 190, .36)); }
.fg-recall[data-tone="sweet"]::after { content: ""; position: absolute; inset: -4%; pointer-events: none; filter: blur(.5cqw); opacity: .8; animation: fg-bokeh 9s ease-in-out infinite alternate;
  background: radial-gradient(circle at 16% 26%, rgba(255, 224, 236, .5) 0 1.1cqw, transparent 1.5cqw), radial-gradient(circle at 84% 20%, rgba(255, 214, 232, .42) 0 .8cqw, transparent 1.1cqw),
    radial-gradient(circle at 78% 66%, rgba(255, 232, 242, .36) 0 1.5cqw, transparent 1.9cqw), radial-gradient(circle at 24% 72%, rgba(255, 204, 226, .4) 0 .6cqw, transparent .9cqw),
    radial-gradient(circle at 92% 46%, rgba(255, 236, 244, .3) 0 1cqw, transparent 1.3cqw); }
@keyframes fg-bokeh { to { transform: translate(1.5%, -2%); } }
/* 伤感：四周褪成冷灰、泛一点蓝，正中照旧 */
.fg-recall.is-light[data-tone="sad"] { background: rgba(40, 62, 98, .34); backdrop-filter: grayscale(.85) brightness(.85); -webkit-backdrop-filter: grayscale(.85) brightness(.85);
  -webkit-mask-image: radial-gradient(85% 75% at 50% 45%, transparent 28%, #000 85%); mask-image: radial-gradient(85% 75% at 50% 45%, transparent 28%, #000 85%); }
/* 不安：四角暗红，像心跳一样一暗一暗，颗粒重一点 */
.fg-recall.is-light[data-tone="dread"] { background: none; }
.fg-recall[data-tone="dread"]::after { content: ""; position: absolute; inset: 0; pointer-events: none; background: radial-gradient(110% 90% at 50% 45%, transparent 36%, rgba(96, 0, 14, .66)); animation: fg-dread-pulse 1.2s ease-in-out infinite; }
.fg-recall[data-tone="dread"] .fg-recall-veil { opacity: .3; }
@keyframes fg-dread-pulse { 0%, 100% { opacity: .75; } 10% { opacity: 1; } 22% { opacity: .55; } 34% { opacity: .95; } }
/* 猛然想起：四周一圈白、对比强一点 */
.fg-recall.is-light[data-tone="flash"] { background: radial-gradient(120% 95% at 50% 45%, transparent 55%, rgba(255, 255, 255, .26)); backdrop-filter: contrast(1.12) saturate(.88); -webkit-backdrop-filter: contrast(1.12) saturate(.88); }
/* 朦胧如梦：四周起白雾、失焦 */
.fg-recall.is-light[data-tone="haze"] { background: rgba(255, 250, 240, .26); backdrop-filter: blur(3px) brightness(1.06); -webkit-backdrop-filter: blur(3px) brightness(1.06);
  -webkit-mask-image: radial-gradient(90% 80% at 50% 45%, transparent 18%, #000 100%); mask-image: radial-gradient(90% 80% at 50% 45%, transparent 18%, #000 100%); }
/* 压暗画面的演法：整个画面的滤镜和浮出来的人跟着基调换 */
.fg-recall:not(.is-light)[data-tone="sweet"] { backdrop-filter: sepia(.3) saturate(.75) brightness(.58) blur(4px); -webkit-backdrop-filter: sepia(.3) saturate(.75) brightness(.58) blur(4px); background: radial-gradient(110% 85% at 50% 42%, rgba(255, 200, 225, .16), rgba(60, 10, 30, .45)); }
.fg-recall:not(.is-light)[data-tone="sad"] { backdrop-filter: grayscale(.9) brightness(.45) blur(4px); -webkit-backdrop-filter: grayscale(.9) brightness(.45) blur(4px); background: radial-gradient(110% 85% at 50% 42%, rgba(150, 175, 215, .1), rgba(8, 14, 28, .55)); }
.fg-recall:not(.is-light)[data-tone="sad"] .fg-actor { filter: grayscale(.75) brightness(.85); }
.fg-recall:not(.is-light)[data-tone="dread"] { backdrop-filter: grayscale(.5) contrast(1.2) brightness(.35) blur(3px); -webkit-backdrop-filter: grayscale(.5) contrast(1.2) brightness(.35) blur(3px); background: none; }
.fg-recall:not(.is-light)[data-tone="dread"] .fg-actor { filter: grayscale(.6) contrast(1.2) brightness(.8); }
.fg-recall:not(.is-light)[data-tone="flash"] { backdrop-filter: brightness(.7) contrast(1.3) blur(2px); -webkit-backdrop-filter: brightness(.7) contrast(1.3) blur(2px); background: radial-gradient(110% 85% at 50% 42%, rgba(255, 255, 255, .12), rgba(0, 0, 0, .35)); }
.fg-recall:not(.is-light)[data-tone="haze"] { backdrop-filter: brightness(.9) saturate(.7) blur(9px); -webkit-backdrop-filter: brightness(.9) saturate(.7) blur(9px); background: rgba(255, 248, 236, .28); }
/* 小头像：甜蜜粉边柔光；伤感冷灰；不安暗红边、带噪点，时不时错位一下；猛然想起白边、弹出来；朦胧如梦边缘化开、慢慢浮现 */
.fg-recall-face[data-tone="sweet"] { border-color: rgba(255, 182, 212, .75); box-shadow: 0 .8cqw 2.4cqw rgba(0, 0, 0, .4), 0 0 2.6cqw rgba(255, 170, 210, .45); background: radial-gradient(circle at 50% 40%, rgba(255, 190, 215, .45), rgba(60, 20, 36, .7)); }
.fg-recall-face[data-tone="sweet"] img { filter: sepia(.12) saturate(1.05) brightness(1.06); }
.fg-recall-face[data-tone="sad"] { border-color: rgba(172, 192, 222, .55); box-shadow: 0 .8cqw 2.4cqw rgba(0, 0, 0, .5); background: radial-gradient(circle at 50% 40%, rgba(70, 90, 122, .5), rgba(12, 18, 30, .8)); animation-duration: .9s; }
.fg-recall-face[data-tone="sad"] img { filter: grayscale(.85) brightness(.92) contrast(.95); }
.fg-recall-face[data-tone="sad"]::after { content: ""; position: absolute; inset: 0; background: rgba(80, 110, 160, .22); mix-blend-mode: soft-light; }
.fg-recall-face[data-tone="dread"] { border-color: rgba(205, 42, 54, .75); box-shadow: 0 .8cqw 2.4cqw rgba(0, 0, 0, .55), 0 0 2cqw rgba(200, 20, 32, .42); background: #12060a; animation: fg-face-in .2s ease-out both, fg-face-jitter 2.6s steps(1) .4s infinite; }
.fg-recall-face[data-tone="dread"] img { filter: grayscale(.55) contrast(1.25) brightness(.9); }
.fg-recall-face[data-tone="dread"]::after { content: ""; position: absolute; inset: 0; background-image: var(--fg-noise); opacity: .35; mix-blend-mode: overlay; }
@keyframes fg-face-jitter { 0%, 86%, 100% { transform: none; } 88% { transform: translate(.35cqw, -.15cqw); } 91% { transform: translate(-.3cqw, .12cqw); } 94% { transform: translate(.15cqw, 0); } }
.fg-recall-face[data-tone="flash"] { border-color: rgba(255, 255, 255, .85); box-shadow: 0 .8cqw 2.4cqw rgba(0, 0, 0, .45), 0 0 2.4cqw rgba(255, 255, 255, .4); animation: fg-face-snap .35s cubic-bezier(.2, 1.6, .4, 1) both; }
.fg-recall-face[data-tone="flash"] img { filter: contrast(1.15) saturate(.9); }
@keyframes fg-face-snap { from { opacity: 0; transform: scale(.7); } }
.fg-recall-face[data-tone="haze"] { border-color: rgba(255, 250, 240, .35); background: rgba(250, 244, 232, .35); box-shadow: 0 0 3cqw rgba(255, 250, 240, .35); animation-duration: 1.1s; }
.fg-recall-face[data-tone="haze"] img { filter: blur(.6px) brightness(1.1) saturate(.8); -webkit-mask-image: radial-gradient(circle at 50% 48%, #000 45%, transparent 78%); mask-image: radial-gradient(circle at 50% 48%, #000 45%, transparent 78%); }
/* 进短闪回的那一下：甜蜜泛起粉光、不安画面撕裂泛红闪两下、猛然想起白闪一下（都在对话框下面） */
.fg-flash.is-bloom { z-index: 15; background: radial-gradient(90% 80% at 50% 45%, rgba(255, 222, 236, .72), rgba(255, 160, 200, .34)); animation: fg-bloom .9s ease-out both; }
@keyframes fg-bloom { 0% { opacity: 0; } 30% { opacity: .85; } 100% { opacity: 0; } }
.fg-flash.is-dread { z-index: 15; background: linear-gradient(transparent 0 18%, rgba(255, 30, 60, .45) 18% 21%, transparent 21% 57%, rgba(255, 255, 255, .35) 57% 58.5%, transparent 58.5%), radial-gradient(circle, rgba(120, 0, 15, .25), rgba(60, 0, 8, .88)); animation: fg-dread-in .6s steps(5) both; }
@keyframes fg-dread-in { 0% { opacity: 0; } 20% { opacity: 1; } 40% { opacity: .2; } 60% { opacity: .9; transform: translateX(-.6%); } 80% { opacity: .3; transform: translateX(.5%); } 100% { opacity: 0; } }
.fg-flash.is-snap { z-index: 15; animation: fg-flash .35s ease-out both; }
@keyframes fg-flash { from { opacity: .95; } to { opacity: 0; } }
/* 落字特效的闪光层：平时透明，由演出计划在某个字上点亮（Stage.jsx 的 useHits） */
.fg-hitflash { position: absolute; inset: 0; z-index: 41; pointer-events: none; opacity: 0; background: #fff; }
.fg-hitflash.is-red { background: radial-gradient(circle, rgba(255, 40, 60, .25), rgba(160, 0, 20, .8)); }
@keyframes fg-black { 0% { opacity: 0; } 35%, 60% { opacity: 1; } 100% { opacity: 0; } }

/* ── 换场（playback.js 的 changePlan，Theater 按时间线切 data-change）──
   清场：台上的人先退下去，对话框、左上角的地点也让开；盖住画面的那一层盖满时下面才换成新地方，揭开后人再上来、出地点标题 */
.fg-stage[data-change] .fg-cast { transition: right .65s cubic-bezier(.4, .1, .2, 1), opacity .45s ease, scale 2.6s cubic-bezier(.4, 0, .2, 1); }
.fg-stage[data-clearing] .fg-cast { opacity: 0; transition-duration: .65s, .35s, 2.6s; }
.fg-stage[data-change] .fg-hud { opacity: 0; transition: opacity .35s ease; }
.fg-cover { position: absolute; inset: 0; z-index: 19; pointer-events: none; opacity: 0; transition: opacity .25s ease; }
.fg-cover[data-cover="black"] { background: #000; }
.fg-cover[data-cover="white"] { background: #fff; }
.fg-cover[data-cover="swirl"] { background: radial-gradient(120% 100% at 50% 50%, rgba(255, 250, 255, .98), rgba(226, 206, 255, .96) 55%, rgba(120, 96, 200, .94)); }
.fg-cover[data-cover="glitch"] { background: #05040c; }
.fg-cover[data-state="up"] { animation: fg-cover-up var(--ms) cubic-bezier(.4, 0, .6, 1) both; }
.fg-cover[data-state="full"] { opacity: 1; transition: none; }
.fg-cover[data-state="down"] { animation: fg-cover-down var(--ms) cubic-bezier(.35, 0, .4, 1) both; }
@keyframes fg-cover-up { from { opacity: 0; } to { opacity: 1; } }
@keyframes fg-cover-down { from { opacity: 1; } to { opacity: 0; } }
/* 白闪：一下子白透，再慢慢退回来 */
.fg-cover[data-cover="white"][data-state="up"] { animation-timing-function: ease-out; }
/* 闭眼睁眼：像真的眼皮。上眼皮往下走得多、下眼皮只抬一点（眼缝的中线慢慢往下移）；眼皮边缘软、是黑的（不带暗红）；
   合上前眼皮发沉、挣扎着又睁开一点才合上，合着时是黑的；睁开时先睁一条缝、又合上，再睁开一半、眨一下才完全睁开，
   画面一开始是糊的，睁开以后才慢慢对上焦。--eye 是眼缝的高度（95% 全睁开），--eye-y 是眼缝中线的位置，--eye-blur 是看出去有多糊 */
@property --eye { syntax: '<percentage>'; inherits: false; initial-value: 95%; }
@property --eye-y { syntax: '<percentage>'; inherits: false; initial-value: 50%; }
@property --eye-blur { syntax: '<length>'; inherits: false; initial-value: 0px; }
.fg-cover[data-cover="lids"] { opacity: 1; background: none; --eye-blur: 0px; -webkit-backdrop-filter: blur(var(--eye-blur)); backdrop-filter: blur(var(--eye-blur)); }
.fg-cover[data-cover="lids"][data-state] { animation: none; }
.fg-cover[data-cover="lids"][data-state="idle"], .fg-cover[data-cover="lids"][data-state="off"] { opacity: 0; -webkit-backdrop-filter: none; backdrop-filter: none; }
.fg-cover[data-cover="lids"]::before { content: ""; position: absolute; inset: 0; --eye: 95%; --eye-y: 50%; background: radial-gradient(ellipse 72% var(--eye) at 50% var(--eye-y), transparent 70%, rgba(0, 0, 0, .6) 84%, #000 100%); }
.fg-cover[data-cover="lids"][data-state="up"] { animation: fg-eye-blur-in var(--ms) ease-in both; }
.fg-cover[data-cover="lids"][data-state="up"]::before { animation: fg-eye-shut var(--ms) ease-in-out both; }
.fg-cover[data-cover="lids"][data-state="full"]::before { background: #000; }
.fg-cover[data-cover="lids"][data-state="down"] { animation: fg-eye-blur-out var(--ms) ease-out both; }
.fg-cover[data-cover="lids"][data-state="down"]::before { animation: fg-eye-open var(--ms) ease-in-out both; }
@keyframes fg-eye-shut { 0% { --eye: 95%; --eye-y: 50%; } 30% { --eye: 44%; --eye-y: 52%; } 45% { --eye: 56%; --eye-y: 51%; } 75% { --eye: 14%; --eye-y: 57%; } 100% { --eye: 0%; --eye-y: 60%; } }
@keyframes fg-eye-open { 0% { --eye: 0%; --eye-y: 60%; } 18% { --eye: 22%; --eye-y: 56%; } 30% { --eye: 3%; --eye-y: 59%; } 55% { --eye: 50%; --eye-y: 52%; } 66% { --eye: 38%; --eye-y: 53%; } 100% { --eye: 95%; --eye-y: 50%; } }
@keyframes fg-eye-blur-in { from { --eye-blur: 0px; } to { --eye-blur: 6px; } }
@keyframes fg-eye-blur-out { 0% { --eye-blur: 12px; } 55% { --eye-blur: 7px; } 100% { --eye-blur: 0px; } }
/* 画面撕裂：几道色带闪过去，中间一下全黑换画面 */
.fg-cover[data-cover="glitch"][data-state="up"] { animation: fg-cover-glitch var(--ms) steps(4) both; }
.fg-cover[data-cover="glitch"][data-state="down"] { animation: fg-cover-glitch var(--ms) steps(4) reverse both; }
@keyframes fg-cover-glitch {
  0% { opacity: 0; background: linear-gradient(transparent 0 22%, rgba(255, 0, 90, .6) 22% 25%, transparent 25% 51%, rgba(0, 255, 220, .5) 51% 53%, transparent 53%); }
  50% { opacity: .85; background: linear-gradient(#05040c 0 40%, rgba(255, 255, 255, .7) 40% 42%, #05040c 42%); }
  100% { opacity: 1; background: #05040c; }
}

/* ───────────── 气氛：逐句可变 ─────────────
   层次（都在 .fg-world-in 里）：背景 → 时段调色 → 立绘 → 基调色调 .fg-tone → 光线 .fg-light → 亲密氛围 .fg-romance → 插画 → 天气粒子
   → 画面效果叠层 .fg-fxlayer → 暗角；感官 .fg-sense、特殊段落滤镜 .fg-mode 在镜头外面（推镜头时不跟着放大）。每层由 FadeLayer 换值时淡入淡出（--fade）。 */
.fg-world, .fg-world-in { position: absolute; inset: 0; transform-origin: 50% 50%; }
.fg-tone, .fg-light, .fg-romance, .fg-fxlayer, .fg-sense, .fg-mode { position: absolute; inset: 0; pointer-events: none; animation: fg-layer-in var(--fade, 1.2s) ease both; }
.fg-tone.is-leave, .fg-light.is-leave, .fg-romance.is-leave, .fg-fxlayer.is-leave, .fg-sense.is-leave, .fg-mode.is-leave { animation: fg-layer-out var(--fade, 1.2s) ease both; }
.fg-tone::before, .fg-tone::after, .fg-light::before, .fg-light::after, .fg-romance::before, .fg-romance::after, .fg-fxlayer::before, .fg-fxlayer::after, .fg-sense::before, .fg-sense::after, .fg-mode::before, .fg-mode::after { content: ""; position: absolute; inset: 0; pointer-events: none; }
@keyframes fg-layer-in { from { opacity: 0; } }
@keyframes fg-layer-out { to { opacity: 0; } }
.fg-theater { --fg-noise: url("data:image/svg+xml;utf8,<svg xmlns=%27http://www.w3.org/2000/svg%27 width=%27180%27 height=%27180%27><filter id=%27n%27><feTurbulence type=%27fractalNoise%27 baseFrequency=%27.85%27 numOctaves=%272%27 stitchTiles=%27stitch%27/><feColorMatrix values=%270 0 0 0 .5  0 0 0 0 .5  0 0 0 0 .5  0 0 0 .9 0%27/></filter><rect width=%27100%%27 height=%27100%%27 filter=%27url(%23n)%27/></svg>"); }

/* 基调色调：很淡的一层，让「甜」「悲」「诡异」看得出来，不抢戏。立绘也在下面。 */
.fg-tone { z-index: 5; }
.fg-tone[data-v="cheerful"] { backdrop-filter: saturate(1.12) brightness(1.04); -webkit-backdrop-filter: saturate(1.12) brightness(1.04); }
.fg-tone[data-v="comic"] { backdrop-filter: saturate(1.28) brightness(1.06) contrast(1.05); -webkit-backdrop-filter: saturate(1.28) brightness(1.06) contrast(1.05); }
.fg-tone[data-v="sweet"] { backdrop-filter: saturate(1.1) brightness(1.04); -webkit-backdrop-filter: saturate(1.1) brightness(1.04); background: radial-gradient(110% 90% at 50% 45%, rgba(255, 190, 220, .06) 40%, rgba(255, 150, 200, .42)); }
.fg-tone[data-v="touching"] { backdrop-filter: saturate(1.05); -webkit-backdrop-filter: saturate(1.05); background: radial-gradient(80% 70% at 50% 25%, rgba(255, 226, 180, .32), rgba(255, 200, 150, .14) 60%, rgba(120, 70, 40, .22)); }
.fg-tone[data-v="calm"] { backdrop-filter: saturate(.92); -webkit-backdrop-filter: saturate(.92); background: linear-gradient(180deg, rgba(190, 215, 255, .2), rgba(160, 190, 230, .08) 70%); }
.fg-tone[data-v="solemn"] { backdrop-filter: saturate(.82) contrast(1.06); -webkit-backdrop-filter: saturate(.82) contrast(1.06); background: linear-gradient(180deg, rgba(255, 236, 190, .22), transparent 55%); }
.fg-tone[data-v="sad"] { backdrop-filter: saturate(.68) brightness(.95); -webkit-backdrop-filter: saturate(.68) brightness(.95); background: linear-gradient(180deg, rgba(60, 90, 150, .22), rgba(30, 40, 80, .18)); mix-blend-mode: multiply; }
.fg-tone[data-v="despair"] { backdrop-filter: saturate(.4) brightness(.82) contrast(1.12); -webkit-backdrop-filter: saturate(.4) brightness(.82) contrast(1.12); background: radial-gradient(100% 80% at 50% 45%, transparent 35%, rgba(0, 0, 0, .62)); }
.fg-tone[data-v="tense"] { backdrop-filter: saturate(.8) contrast(1.15); -webkit-backdrop-filter: saturate(.8) contrast(1.15); background: radial-gradient(90% 75% at 50% 45%, transparent 35%, rgba(20, 4, 4, .45) 75%, rgba(10, 0, 0, .75)); }
.fg-tone[data-v="mystery"] { backdrop-filter: saturate(.8) brightness(.9); -webkit-backdrop-filter: saturate(.8) brightness(.9); background: radial-gradient(110% 85% at 50% 45%, rgba(70, 50, 140, .12) 30%, rgba(20, 10, 50, .55)); }
.fg-tone[data-v="eerie"] { backdrop-filter: saturate(.55) contrast(1.08); -webkit-backdrop-filter: saturate(.55) contrast(1.08); background: radial-gradient(100% 80% at 50% 45%, rgba(40, 110, 90, .16) 30%, rgba(0, 18, 12, .6)); }
.fg-tone[data-v="battle"] { backdrop-filter: contrast(1.18) saturate(1.18); -webkit-backdrop-filter: contrast(1.18) saturate(1.18); background: radial-gradient(100% 85% at 50% 50%, transparent 40%, rgba(220, 50, 10, .32) 80%, rgba(120, 10, 0, .55)); }
.fg-tone[data-v="heroic"] { backdrop-filter: contrast(1.1) saturate(1.15) brightness(1.04); -webkit-backdrop-filter: contrast(1.1) saturate(1.15) brightness(1.04); background: linear-gradient(0deg, rgba(255, 160, 50, .34), rgba(255, 200, 120, .08) 55%, transparent); }
.fg-tone[data-v="silence"] { backdrop-filter: saturate(.5) brightness(.94); -webkit-backdrop-filter: saturate(.5) brightness(.94); }

/* 光线：关灯、停电、烛光、手电……压在背景和立绘上，插画不受影响。 */
.fg-light { z-index: 5; }
.fg-light[data-v="dim"] { background: rgba(20, 22, 50, .22); mix-blend-mode: multiply; }
.fg-light[data-v="dark"] { background: rgba(8, 12, 40, .74); mix-blend-mode: multiply; backdrop-filter: saturate(.6); -webkit-backdrop-filter: saturate(.6); }
.fg-light[data-v="black"] { background: #000; opacity: .93; }
.fg-light[data-v="black"]::after { background: radial-gradient(40% 30% at 50% 60%, rgba(40, 40, 70, .25), transparent 70%); }
/* 烛光、篝火：人脸被火映成暖色、看得清，暗下去的是画面四角 */
.fg-light[data-v="candle"] { background: radial-gradient(80% 90% at 50% 70%, rgb(255, 234, 204), rgb(232, 168, 112) 55%, rgb(110, 62, 34) 100%); mix-blend-mode: multiply; }
.fg-light[data-v="candle"]::after { background: radial-gradient(34% 40% at 50% 82%, rgba(255, 150, 50, .42), transparent 72%); mix-blend-mode: screen; transform-origin: 50% 82%; animation: fg-candle 2.6s ease-in-out infinite; }
@keyframes fg-candle { 0%, 100% { opacity: .85; transform: scale(1); } 22% { opacity: 1; transform: scale(1.03); } 41% { opacity: .78; } 63% { opacity: .95; transform: scale(.99); } 80% { opacity: .82; } }
.fg-light[data-v="spot"] { background: radial-gradient(30% 62% at 50% 52%, transparent 30%, rgba(0, 0, 0, .55) 70%, rgba(0, 0, 0, .92) 100%); }
.fg-light[data-v="spot"]::after { background: linear-gradient(180deg, rgba(255, 250, 225, .22), rgba(255, 250, 225, 0) 80%); clip-path: polygon(44% 0, 56% 0, 72% 100%, 28% 100%); mix-blend-mode: screen; }
.fg-light[data-v="neon"] { background: rgba(10, 6, 40, .55); mix-blend-mode: multiply; }
.fg-light[data-v="neon"]::after { background: linear-gradient(115deg, rgba(255, 40, 200, .45), transparent 45%, transparent 55%, rgba(30, 220, 255, .45)); mix-blend-mode: screen; animation: fg-breathe-light 5s ease-in-out infinite; }
.fg-light[data-v="screen"] { background: rgba(4, 8, 30, .78); mix-blend-mode: multiply; }
.fg-light[data-v="screen"]::after { background: radial-gradient(45% 55% at 50% 85%, rgba(120, 180, 255, .55), transparent 75%); mix-blend-mode: screen; animation: fg-screenglow 3.2s steps(1) infinite; }
@keyframes fg-screenglow { 0%, 100% { opacity: .9; } 30% { opacity: .75; } 31% { opacity: 1; } 70% { opacity: .82; } }
.fg-light[data-v="alarm"] { background: rgba(20, 0, 0, .55); mix-blend-mode: multiply; }
.fg-light[data-v="alarm"]::after { background: radial-gradient(120% 90% at 50% 0%, rgba(255, 30, 30, .6), rgba(160, 0, 0, .25) 70%); mix-blend-mode: screen; animation: fg-alarm 1.3s ease-in-out infinite; }
@keyframes fg-alarm { 0%, 100% { opacity: .15; } 50% { opacity: 1; } }
.fg-light[data-v="moon"] { background: linear-gradient(180deg, rgba(40, 60, 150, .55), rgba(10, 20, 70, .7)); mix-blend-mode: multiply; }
.fg-light[data-v="moon"]::after { background: radial-gradient(60% 50% at 70% 15%, rgba(190, 210, 255, .35), transparent 70%); mix-blend-mode: screen; }
.fg-light[data-v="warm"] { background: linear-gradient(180deg, rgb(255, 214, 160), rgb(255, 176, 110)); mix-blend-mode: multiply; opacity: .55; }
.fg-light[data-v="warm"]::after { background: radial-gradient(60% 55% at 35% 30%, rgba(255, 190, 110, .35), transparent 70%); mix-blend-mode: screen; }
.fg-light[data-v="cold"] { background: linear-gradient(180deg, rgb(170, 200, 255), rgb(130, 160, 230)); mix-blend-mode: multiply; opacity: .6; backdrop-filter: saturate(.75); -webkit-backdrop-filter: saturate(.75); }
.fg-light[data-v="glare"] { background: radial-gradient(70% 60% at 50% 40%, rgba(255, 255, 255, .75), rgba(255, 255, 255, .15) 80%); mix-blend-mode: screen; backdrop-filter: brightness(1.15) contrast(.9); -webkit-backdrop-filter: brightness(1.15) contrast(.9); }
.fg-light[data-v="flicker"] { background: rgba(6, 8, 24, .78); mix-blend-mode: multiply; }
.fg-light[data-v="flicker"]:not(.is-leave) { animation: fg-layer-in var(--fade) ease both, fg-flicker 4.5s steps(1) infinite; }
@keyframes fg-flicker { 0%, 100% { opacity: 1; } 8% { opacity: .25; } 9% { opacity: 1; } 11% { opacity: .35; } 12% { opacity: 1; } 47% { opacity: 1; } 48% { opacity: .15; } 50% { opacity: .9; } 51% { opacity: .3; } 53% { opacity: 1; } 78% { opacity: .45; } 79% { opacity: 1; } }

/* 亲密氛围：暧昧是淡粉的柔光和慢慢往上飘的光斑；亲密更暖，人离得更近一点，四角像心跳一样一明一暗。压在背景和立绘上，插画不受影响。 */
.fg-romance { z-index: 5; }
.fg-romance[data-v="ambiguous"] { background: radial-gradient(120% 95% at 50% 40%, rgba(255, 215, 235, .05) 35%, rgba(255, 150, 195, .3)); backdrop-filter: brightness(1.05) saturate(1.08) contrast(.94); -webkit-backdrop-filter: brightness(1.05) saturate(1.08) contrast(.94); }
.fg-romance[data-v="ambiguous"]::before { bottom: -100%; background:
    radial-gradient(circle at 10% 82%, rgba(255, 205, 228, .5) 0 1.4cqw, transparent 2.4cqw), radial-gradient(circle at 27% 34%, rgba(255, 238, 246, .42) 0 .8cqw, transparent 1.6cqw),
    radial-gradient(circle at 46% 66%, rgba(255, 185, 215, .32) 0 2cqw, transparent 3.2cqw), radial-gradient(circle at 63% 18%, rgba(255, 228, 242, .45) 0 1.1cqw, transparent 2cqw),
    radial-gradient(circle at 80% 54%, rgba(255, 195, 222, .38) 0 1.6cqw, transparent 2.6cqw), radial-gradient(circle at 93% 90%, rgba(255, 236, 246, .4) 0 .9cqw, transparent 1.7cqw);
  background-size: 100% 50%; filter: blur(.2cqw); animation: fg-bokeh-rise 24s linear infinite, fg-bokeh-twinkle 4.5s ease-in-out infinite alternate; }
.fg-romance[data-v="ambiguous"]::after { background: radial-gradient(70% 45% at 50% 0%, rgba(255, 232, 242, .28), transparent 72%); }
.fg-romance[data-v="intimate"] { background: radial-gradient(110% 90% at 50% 45%, rgba(255, 190, 150, .14) 25%, rgba(235, 95, 125, .42)); backdrop-filter: saturate(1.18) brightness(1.02) sepia(.22); -webkit-backdrop-filter: saturate(1.18) brightness(1.02) sepia(.22); }
.fg-romance[data-v="intimate"]::after { background: radial-gradient(90% 76% at 50% 46%, transparent 40%, rgba(110, 0, 40, .5) 78%, rgba(80, 0, 30, .72)); animation: fg-romance-beat 1.15s ease-out infinite; }
[data-romance="intimate"] .fg-cast { scale: 1.035; }
@keyframes fg-bokeh-rise { to { transform: translateY(-50%); } }
@keyframes fg-bokeh-twinkle { from { opacity: .55; } to { opacity: .95; } }
@keyframes fg-romance-beat { 0%, 100% { opacity: .55; } 12% { opacity: 1; } 24% { opacity: .7; } 36% { opacity: .9; } 62% { opacity: .55; } }
/* 感官主导的一段：蒙眼、耳边、触碰、发烫、发凉、香气、屏息、失神。在镜头外面（特写时不跟着放大），叠在插画和天气上面（眼睛被蒙住时什么都看不见），对话框不受影响。 */
.fg-sense { z-index: 9; }
.fg-sense[data-v="blind"] { background: #050307; opacity: .95; }
.fg-sense[data-v="blind"]::before { background: radial-gradient(46% 12% at 50% 70%, rgba(255, 222, 192, .16), transparent 70%), radial-gradient(48% 10% at 50% 0%, rgba(255, 222, 192, .1), transparent 70%); animation: fg-blind-breathe 4.8s ease-in-out infinite; }
.fg-sense[data-v="blind"]::after { background-image: var(--fg-noise); opacity: .05; }
.fg-sense[data-v^="ear"]::before { backdrop-filter: blur(3px) brightness(.85); -webkit-backdrop-filter: blur(3px) brightness(.85); -webkit-mask-image: linear-gradient(90deg, #000 8%, transparent 62%); mask-image: linear-gradient(90deg, #000 8%, transparent 62%); }
.fg-sense[data-v^="ear"]::after { background: repeating-radial-gradient(circle at 100% 45%, transparent 0 4.4cqw, rgba(255, 214, 226, .14) 4.6cqw 4.9cqw, transparent 5.1cqw 6.2cqw), radial-gradient(55% 75% at 100% 45%, rgba(255, 172, 192, .6), rgba(255, 150, 172, .18) 55%, transparent 75%);
  -webkit-mask-image: linear-gradient(270deg, #000 15%, transparent 55%); mask-image: linear-gradient(270deg, #000 15%, transparent 55%); transform-origin: 100% 45%; animation: fg-ear-breath 3.6s ease-in-out infinite; }
.fg-sense[data-v="ear-left"]::before { -webkit-mask-image: linear-gradient(270deg, #000 8%, transparent 62%); mask-image: linear-gradient(270deg, #000 8%, transparent 62%); }
.fg-sense[data-v="ear-left"]::after { background: repeating-radial-gradient(circle at 0% 45%, transparent 0 4.4cqw, rgba(255, 214, 226, .14) 4.6cqw 4.9cqw, transparent 5.1cqw 6.2cqw), radial-gradient(55% 75% at 0% 45%, rgba(255, 172, 192, .6), rgba(255, 150, 172, .18) 55%, transparent 75%); transform-origin: 0 45%;
  -webkit-mask-image: linear-gradient(90deg, #000 15%, transparent 55%); mask-image: linear-gradient(90deg, #000 15%, transparent 55%); }
.fg-sense[data-v="touch"] { background: radial-gradient(40% 36% at 50% 55%, rgba(255, 226, 210, .22), transparent 70%), radial-gradient(100% 85% at 50% 50%, transparent 50%, rgba(255, 170, 160, .26)); backdrop-filter: saturate(1.1) brightness(1.03); -webkit-backdrop-filter: saturate(1.1) brightness(1.03); }
.fg-sense[data-v="touch"]::before, .fg-sense[data-v="touch"]::after { inset: auto; left: 50%; top: 55%; width: 32cqw; height: 32cqw; border-radius: 50%;
  transform: translate(-50%, -50%); background: radial-gradient(circle, transparent 30%, rgba(255, 232, 214, .55) 52%, rgba(255, 190, 178, .22) 60%, transparent 70%); animation: fg-touch-ripple 3.2s ease-out infinite; }
.fg-sense[data-v="touch"]::after { animation-delay: 1.6s; }
.fg-sense[data-v="heat"] { background: radial-gradient(110% 90% at 50% 50%, rgba(255, 120, 80, .1) 30%, rgba(220, 50, 40, .36)); backdrop-filter: saturate(1.25) contrast(1.04) sepia(.15); -webkit-backdrop-filter: saturate(1.25) contrast(1.04) sepia(.15); }
.fg-sense[data-v="heat"]::before { backdrop-filter: blur(1px); -webkit-backdrop-filter: blur(1px); -webkit-mask-image: linear-gradient(180deg, transparent, rgba(0, 0, 0, .7) 50%, transparent); mask-image: linear-gradient(180deg, transparent, rgba(0, 0, 0, .7) 50%, transparent);
  -webkit-mask-size: 100% 3.6cqw; mask-size: 100% 3.6cqw; animation: fg-heat-rise 1.8s linear infinite; }
.fg-sense[data-v="heat"]::after { background: radial-gradient(70% 40% at 50% 100%, rgba(255, 140, 90, .3), transparent 70%); animation: fg-blind-breathe 2.8s ease-in-out infinite; }
.fg-sense[data-v="cold"] { background: linear-gradient(180deg, rgba(150, 190, 255, .2), rgba(90, 130, 210, .26)); backdrop-filter: saturate(.6) brightness(.96); -webkit-backdrop-filter: saturate(.6) brightness(.96); }
.fg-sense[data-v="cold"]::before { background: radial-gradient(120% 100% at 50% 50%, transparent 55%, rgba(225, 240, 255, .5) 85%, rgba(242, 249, 255, .78)); filter: blur(.3cqw); }
.fg-sense[data-v="cold"]::after { background: radial-gradient(60% 22% at 30% 100%, rgba(230, 242, 255, .3), transparent 70%), radial-gradient(50% 18% at 75% 100%, rgba(230, 242, 255, .24), transparent 70%); animation: fg-scent-drift 8s ease-in-out infinite alternate; }
.fg-sense[data-v="scent"] { background: radial-gradient(110% 90% at 50% 45%, rgba(255, 244, 236, .12) 30%, rgba(255, 214, 236, .34)); backdrop-filter: brightness(1.07) saturate(1.08) contrast(.94) blur(.5px); -webkit-backdrop-filter: brightness(1.07) saturate(1.08) contrast(.94) blur(.5px); }
.fg-sense[data-v="scent"]::before { bottom: -100%; background:
    radial-gradient(circle at 14% 70%, rgba(255, 248, 232, .85) 0 .35cqw, transparent .9cqw), radial-gradient(circle at 33% 22%, rgba(255, 238, 248, .8) 0 .3cqw, transparent .8cqw),
    radial-gradient(circle at 52% 84%, rgba(255, 248, 232, .8) 0 .4cqw, transparent 1cqw), radial-gradient(circle at 71% 40%, rgba(255, 238, 248, .8) 0 .32cqw, transparent .85cqw),
    radial-gradient(circle at 88% 12%, rgba(255, 248, 232, .75) 0 .38cqw, transparent .95cqw), radial-gradient(circle at 23% 46%, rgba(255, 238, 248, .7) 0 .25cqw, transparent .7cqw),
    radial-gradient(circle at 62% 6%, rgba(255, 248, 232, .7) 0 .28cqw, transparent .75cqw), radial-gradient(circle at 80% 76%, rgba(255, 238, 248, .7) 0 .3cqw, transparent .8cqw);
  background-size: 100% 50%; animation: fg-bokeh-rise 30s linear infinite, fg-bokeh-twinkle 3s ease-in-out infinite alternate; }
.fg-sense[data-v="scent"]::after { background: radial-gradient(46% 18% at 30% 66%, rgba(255, 240, 248, .42), transparent 70%), radial-gradient(40% 16% at 70% 38%, rgba(255, 244, 232, .38), transparent 70%), radial-gradient(34% 12% at 52% 14%, rgba(255, 240, 248, .3), transparent 70%); filter: blur(.6cqw); animation: fg-scent-drift 9s ease-in-out infinite alternate; }
.fg-sense[data-v="breath"] { backdrop-filter: saturate(.75); -webkit-backdrop-filter: saturate(.75); }
.fg-sense[data-v="breath"]::before { background: radial-gradient(70% 60% at 50% 44%, transparent 30%, rgba(0, 0, 0, .62) 72%, rgba(0, 0, 0, .9)); animation: fg-breath-close 1.8s cubic-bezier(.2, .7, .2, 1) both; }
.fg-world-in[data-sense="breath"] :is(.fg-actor-body, .fg-down-mist i) { animation-play-state: paused !important; }
.fg-sense[data-v="daze"] { background: radial-gradient(100% 80% at 50% 50%, rgba(255, 255, 255, .05) 30%, rgba(228, 222, 255, .24)); backdrop-filter: blur(1.6px) saturate(.8) brightness(1.06); -webkit-backdrop-filter: blur(1.6px) saturate(.8) brightness(1.06); }
.fg-world-in[data-sense="daze"] .fg-cast { filter: drop-shadow(1.4cqw 0 0 rgba(255, 120, 160, .26)) drop-shadow(-1.4cqw 0 0 rgba(120, 200, 255, .26)); animation: fg-daze-sway 6s ease-in-out infinite; }
@keyframes fg-blind-breathe { 0%, 100% { opacity: .5; } 50% { opacity: 1; } }
@keyframes fg-ear-breath { 0%, 100% { opacity: .55; transform: scale(.96); } 45% { opacity: 1; transform: scale(1.04); } }
@keyframes fg-touch-ripple { from { transform: translate(-50%, -50%) scale(.3); opacity: .9; } to { transform: translate(-50%, -50%) scale(2.4); opacity: 0; } }
@keyframes fg-heat-rise { to { -webkit-mask-position: 0 -3.6cqw; mask-position: 0 -3.6cqw; } }
@keyframes fg-scent-drift { from { transform: translateX(-3%); } to { transform: translateX(3%); } }
@keyframes fg-breath-close { from { transform: scale(1.6); opacity: 0; } to { transform: none; opacity: 1; } }
@keyframes fg-daze-sway { 0%, 100% { translate: -.8% 0; rotate: -.5deg; } 50% { translate: .8% .4%; rotate: .5deg; } }

/* 电影黑边：严肃的一段一直挂着上下黑边（在镜头外面，推镜头时不动），收起时慢慢退出去。左上角的地点、右上角的按钮压在黑边上。 */
.fg-bars { position: absolute; inset: 0; z-index: 12; pointer-events: none; }
.fg-bars::before, .fg-bars::after { content: ""; position: absolute; left: 0; right: 0; height: 0; background: #000; transition: height 1.2s cubic-bezier(.6, 0, .2, 1); }
.fg-bars::before { top: 0; }
.fg-bars::after { bottom: 0; }
.fg-bars[data-on]::before, .fg-bars[data-on]::after { height: 10.5%; }

/* 画面效果：整个画面持续地动（.fg-world），有的再叠一层（.fg-fxlayer）。系统设了减少动态效果时不动。 */
.fg-world[data-fx="sway"] { animation: fg-fx-sway 7s ease-in-out infinite; }
.fg-world[data-fx="ride"] { animation: fg-fx-ride 1.7s ease-in-out infinite; }
.fg-world[data-fx="handheld"] { animation: fg-fx-handheld 6.5s ease-in-out infinite; }
.fg-world[data-fx="drift"] { animation: fg-fx-drift 26s ease-in-out infinite alternate; }
.fg-world[data-fx="woozy"] { animation: fg-fx-woozy 5.5s ease-in-out infinite; }
.fg-world[data-fx="heat"] { animation: fg-fx-heat 2.6s ease-in-out infinite; }
.fg-world[data-fx="underwater"] { animation: fg-fx-water 6s ease-in-out infinite; }
.fg-world[data-fx="rumble"] { animation: fg-fx-rumble .16s linear infinite; }
.fg-world[data-fx="heartbeat"] { animation: fg-fx-beat 1.05s ease-out infinite; }
/* 慢动作：画面极慢地推近，粒子几乎停住（见 Particles 的 speed）；时间停止：画面褪成灰、一切静止（立绘不呼吸、插画不动） */
.fg-world { transition: filter .9s ease; }
.fg-world[data-fx="slowmo"] { animation: fg-fx-slowmo 10s ease-in-out infinite alternate; }
.fg-world[data-fx="timestop"] { filter: grayscale(.92) contrast(1.18) brightness(.9); }
.fg-world[data-fx="timestop"] :is(.fg-actor-body, .fg-cg-img, .fg-cg-pan, .fg-cg-art, .fg-down-mist i) { animation-play-state: paused !important; }
@keyframes fg-fx-slowmo { from { transform: scale(1.01); } to { transform: scale(1.05) translateY(-.4%); } }
@keyframes fg-fx-sway { 0%, 100% { transform: scale(1.05) rotate(-.7deg) translateY(-.5%); } 50% { transform: scale(1.05) rotate(.7deg) translateY(.5%); } }
@keyframes fg-fx-ride { 0%, 100% { transform: scale(1.03) translateY(0); } 18% { transform: scale(1.03) translateY(-.35%); } 30% { transform: scale(1.03) translateY(.1%); } 62% { transform: scale(1.03) translateY(-.15%); } 74% { transform: scale(1.03) translateY(.12%); } }
@keyframes fg-fx-handheld { 0%, 100% { transform: scale(1.045) translate(0, 0) rotate(0); } 20% { transform: scale(1.045) translate(-.5%, .3%) rotate(-.25deg); } 45% { transform: scale(1.045) translate(.4%, -.35%) rotate(.2deg); } 70% { transform: scale(1.045) translate(-.25%, -.2%) rotate(-.1deg); } 85% { transform: scale(1.045) translate(.3%, .3%) rotate(.15deg); } }
@keyframes fg-fx-drift { from { transform: scale(1); } to { transform: scale(1.09); } }
@keyframes fg-fx-woozy { 0%, 100% { transform: scale(1.05) rotate(-1deg); filter: blur(.4px); } 35% { transform: scale(1.07) rotate(.8deg) translateX(.6%); filter: blur(1.8px) saturate(1.2); } 65% { transform: scale(1.05) rotate(-.4deg) translateX(-.5%); filter: blur(.8px); } }
@keyframes fg-fx-heat { 0%, 100% { transform: scale(1.02) skewX(0); } 25% { transform: scale(1.02) skewX(.35deg) scaleY(1.004); } 75% { transform: scale(1.02) skewX(-.35deg); } }
@keyframes fg-fx-water { 0%, 100% { transform: scale(1.05) skewX(-.6deg) translateY(.4%); } 50% { transform: scale(1.05) skewX(.6deg) translateY(-.4%); } }
@keyframes fg-fx-rumble { 0% { transform: scale(1.03) translate(.25%, -.2%); } 25% { transform: scale(1.03) translate(-.3%, .15%); } 50% { transform: scale(1.03) translate(.2%, .25%); } 75% { transform: scale(1.03) translate(-.15%, -.25%); } 100% { transform: scale(1.03) translate(.25%, -.2%); } }
@keyframes fg-fx-beat { 0%, 100% { transform: scale(1); } 12% { transform: scale(1.022); } 24% { transform: scale(1.004); } 36% { transform: scale(1.014); } 60% { transform: scale(1); } }
.fg-fxlayer { z-index: 8; }
.fg-fxlayer[data-v="slowmo"] { background: radial-gradient(100% 85% at 50% 50%, transparent 45%, rgba(10, 24, 48, .5)); backdrop-filter: saturate(.72) contrast(1.06); -webkit-backdrop-filter: saturate(.72) contrast(1.06); }
.fg-fxlayer[data-v="slowmo"]::before { backdrop-filter: blur(3px); -webkit-backdrop-filter: blur(3px); -webkit-mask-image: radial-gradient(75% 65% at 50% 50%, transparent 50%, #000 95%); mask-image: radial-gradient(75% 65% at 50% 50%, transparent 50%, #000 95%); }
.fg-fxlayer[data-v="slowmo"]::after { background: repeating-radial-gradient(circle at 50% 50%, transparent 0 9cqw, rgba(200, 230, 255, .1) 9cqw 9.3cqw, transparent 9.3cqw 18cqw); mix-blend-mode: screen; animation: fg-slowmo-rings 7s linear infinite; }
@keyframes fg-slowmo-rings { from { transform: scale(1); opacity: .9; } to { transform: scale(1.6); opacity: .3; } }
/* 时间停止：进入时一圈反色的冲击波扩散开，之后四周泛紫、正中一圈表盘刻度 */
.fg-fxlayer[data-v="timestop"] { background: radial-gradient(100% 85% at 50% 50%, rgba(120, 90, 255, .08) 30%, rgba(40, 16, 90, .55)); }
.fg-fxlayer[data-v="timestop"]::before { backdrop-filter: invert(1) hue-rotate(180deg); -webkit-backdrop-filter: invert(1) hue-rotate(180deg); clip-path: circle(0% at 50% 48%); animation: fg-timestop-wave 1.3s cubic-bezier(.2, .6, .3, 1) both; }
@keyframes fg-timestop-wave { 0% { clip-path: circle(0% at 50% 48%); opacity: 1; } 45% { clip-path: circle(80% at 50% 48%); opacity: 1; } 100% { clip-path: circle(90% at 50% 48%); opacity: 0; } }
.fg-fxlayer[data-v="timestop"]::after { inset: auto; left: 50%; top: 48%; width: 46cqw; height: 46cqw; transform: translate(-50%, -50%); border-radius: 50%;
  background: radial-gradient(circle, transparent 63.3%, rgba(220, 210, 255, .5) 63.6%, transparent 64%), repeating-conic-gradient(from -1deg, rgba(220, 210, 255, .55) 0 2deg, transparent 2deg 30deg);
  -webkit-mask-image: radial-gradient(circle, transparent 60%, #000 61%, #000 66%, transparent 67%); mask-image: radial-gradient(circle, transparent 60%, #000 61%, #000 66%, transparent 67%);
  box-shadow: 0 0 0 1px rgba(220, 210, 255, .18); opacity: .55; animation: fg-fade-in 1.4s .5s ease both; }
.fg-fxlayer[data-v="speed"] { background: repeating-conic-gradient(from 0deg at 50% 50%, transparent 0deg 3.4deg, rgba(255, 255, 255, .5) 3.4deg 3.9deg, transparent 3.9deg 7.1deg, rgba(255, 255, 255, .28) 7.1deg 7.4deg);
  -webkit-mask-image: radial-gradient(42% 46% at 50% 50%, transparent 55%, #000 100%); mask-image: radial-gradient(42% 46% at 50% 50%, transparent 55%, #000 100%); }
.fg-fxlayer[data-v="speed"]:not(.is-leave) { animation: fg-layer-in var(--fade) ease both, fg-speedlines .24s steps(3) infinite; }
@keyframes fg-speedlines { 0% { transform: rotate(0); } 100% { transform: rotate(6deg); } }
.fg-fxlayer[data-v="underwater"] { background: linear-gradient(180deg, rgba(40, 170, 200, .35), rgba(10, 40, 90, .55)); mix-blend-mode: multiply; }
.fg-fxlayer[data-v="underwater"]::before { inset: -20%; background: radial-gradient(14% 9% at 30% 30%, rgba(200, 255, 255, .5), transparent 70%), radial-gradient(10% 7% at 70% 20%, rgba(200, 255, 255, .45), transparent 70%), radial-gradient(18% 10% at 55% 60%, rgba(200, 255, 255, .35), transparent 70%), radial-gradient(12% 8% at 15% 75%, rgba(200, 255, 255, .35), transparent 70%); background-size: 50% 50%; mix-blend-mode: screen; animation: fg-caustics 9s ease-in-out infinite alternate; }
.fg-fxlayer[data-v="underwater"]::after { background: linear-gradient(170deg, rgba(220, 255, 255, .3), transparent 40%); clip-path: polygon(20% 0, 30% 0, 50% 100%, 35% 100%, 55% 0, 62% 0, 80% 100%, 70% 100%); mix-blend-mode: screen; opacity: .6; animation: fg-breathe-light 6s ease-in-out infinite; }
@keyframes fg-caustics { from { transform: translate(0, 0) rotate(0); } to { transform: translate(6%, 4%) rotate(4deg); } }
.fg-fxlayer[data-v="heat"] { background: linear-gradient(0deg, rgba(255, 140, 40, .22), transparent 55%); mix-blend-mode: screen; }
.fg-fxlayer[data-v="heat"]:not(.is-leave) { animation: fg-layer-in var(--fade) ease both, fg-breathe-light 2.6s ease-in-out infinite; }
.fg-fxlayer[data-v="woozy"] { backdrop-filter: blur(.5px); -webkit-backdrop-filter: blur(.5px); background: radial-gradient(100% 80% at 50% 50%, transparent 40%, rgba(80, 40, 90, .35)); }
.fg-fxlayer[data-v="heartbeat"] { background: radial-gradient(95% 80% at 50% 48%, transparent 38%, rgba(140, 0, 24, .5) 75%, rgba(90, 0, 14, .85)); }
.fg-fxlayer[data-v="heartbeat"]:not(.is-leave) { animation: fg-layer-in var(--fade) ease both, fg-beat-vignette 1.05s ease-out infinite; }
@keyframes fg-beat-vignette { 0%, 60%, 100% { opacity: .45; } 12% { opacity: 1; } 24% { opacity: .6; } 36% { opacity: .85; } }
.fg-fxlayer[data-v="rumble"] { background: radial-gradient(110% 90% at 50% 50%, transparent 55%, rgba(0, 0, 0, .35)); }
.fg-fxlayer[data-v="drift"], .fg-fxlayer[data-v="sway"], .fg-fxlayer[data-v="ride"], .fg-fxlayer[data-v="handheld"] { display: none; }

/* 特殊段落：回忆、梦境、幻觉、想象、主观视角、内心世界、画面里、故事中、预见、虚拟世界。盖住插画在内的整个画面。 */
.fg-mode { z-index: 9; }
.fg-mode[data-v="memory"] { backdrop-filter: sepia(.8) saturate(.7) contrast(.9) brightness(1.08); -webkit-backdrop-filter: sepia(.8) saturate(.7) contrast(.9) brightness(1.08); background: radial-gradient(115% 85% at 50% 45%, transparent 48%, rgba(255, 240, 214, .55)), linear-gradient(rgba(255, 210, 150, .1), rgba(255, 210, 150, .1)); }
.fg-mode[data-v="memory"]::before { backdrop-filter: blur(2.5px); -webkit-backdrop-filter: blur(2.5px); -webkit-mask-image: radial-gradient(85% 75% at 50% 45%, transparent 55%, #000 100%); mask-image: radial-gradient(85% 75% at 50% 45%, transparent 55%, #000 100%); }
.fg-mode[data-v="memory"]::after, .fg-mode[data-v="tale"]::after { background-image: var(--fg-noise); opacity: .16; mix-blend-mode: overlay; animation: fg-grain .5s steps(4) infinite; }
@keyframes fg-grain { 0% { transform: translate(0, 0); } 25% { transform: translate(-2%, 1%); } 50% { transform: translate(1%, -2%); } 75% { transform: translate(2%, 2%); } 100% { transform: translate(0, 0); } }
.fg-mode[data-v="dream"] { backdrop-filter: saturate(1.2) brightness(1.08) contrast(.9) hue-rotate(-12deg); -webkit-backdrop-filter: saturate(1.2) brightness(1.08) contrast(.9) hue-rotate(-12deg); background: radial-gradient(110% 85% at 50% 45%, transparent 42%, rgba(235, 215, 255, .6)), linear-gradient(160deg, rgba(255, 190, 230, .12), rgba(160, 200, 255, .14)); }
.fg-mode[data-v="dream"]::before { backdrop-filter: blur(5px); -webkit-backdrop-filter: blur(5px); -webkit-mask-image: radial-gradient(80% 70% at 50% 45%, transparent 45%, #000 95%); mask-image: radial-gradient(80% 70% at 50% 45%, transparent 45%, #000 95%); }
.fg-mode[data-v="dream"]::after { inset: -10%; background: radial-gradient(30% 22% at 20% 30%, rgba(255, 255, 255, .28), transparent 70%), radial-gradient(26% 20% at 78% 64%, rgba(255, 230, 255, .24), transparent 70%), radial-gradient(22% 18% at 60% 18%, rgba(220, 240, 255, .22), transparent 70%); mix-blend-mode: screen; animation: fg-haze 14s ease-in-out infinite alternate; }
@keyframes fg-haze { from { transform: translate(-3%, 2%) scale(1); } to { transform: translate(3%, -2%) scale(1.08); } }
.fg-mode[data-v="illusion"] { background: linear-gradient(90deg, rgba(255, 0, 120, .16), transparent 25%, transparent 75%, rgba(0, 255, 200, .16)); }
.fg-mode[data-v="illusion"]:not(.is-leave) { animation: fg-layer-in var(--fade) ease both, fg-hueshift 7s ease-in-out infinite; }
@keyframes fg-hueshift { 0%, 100% { backdrop-filter: saturate(1.5) contrast(1.1) hue-rotate(0deg); -webkit-backdrop-filter: saturate(1.5) contrast(1.1) hue-rotate(0deg); } 33% { backdrop-filter: saturate(1.7) contrast(1.15) hue-rotate(45deg); -webkit-backdrop-filter: saturate(1.7) contrast(1.15) hue-rotate(45deg); } 66% { backdrop-filter: saturate(1.4) contrast(1.05) hue-rotate(-35deg); -webkit-backdrop-filter: saturate(1.4) contrast(1.05) hue-rotate(-35deg); } }
.fg-mode[data-v="illusion"]::before { background: radial-gradient(100% 80% at 50% 50%, transparent 45%, rgba(40, 0, 60, .55)); animation: fg-breathe-light 2.4s ease-in-out infinite; }
.fg-mode[data-v="imagine"] { backdrop-filter: saturate(1.4) brightness(1.1); -webkit-backdrop-filter: saturate(1.4) brightness(1.1); background: radial-gradient(76% 70% at 50% 46%, transparent 72%, rgba(255, 255, 255, .92) 88%); }
.fg-mode[data-v="imagine"]::after { background: radial-gradient(1.2% 1.6% at 18% 22%, #fff, transparent), radial-gradient(1% 1.4% at 82% 30%, #fff, transparent), radial-gradient(.8% 1.1% at 70% 78%, #fff, transparent), radial-gradient(1.1% 1.5% at 26% 70%, #fff, transparent), radial-gradient(.7% 1% at 50% 12%, #fff, transparent); animation: fg-breathe-light 2.2s ease-in-out infinite; }
.fg-mode[data-v="pov"] { background: radial-gradient(92% 68% at 50% 50%, transparent 52%, rgba(0, 0, 0, .55) 80%, rgba(0, 0, 0, .95) 100%); }
.fg-mode[data-v="pov"]::before { backdrop-filter: blur(3px); -webkit-backdrop-filter: blur(3px); -webkit-mask-image: radial-gradient(85% 65% at 50% 50%, transparent 55%, #000 95%); mask-image: radial-gradient(85% 65% at 50% 50%, transparent 55%, #000 95%); }
.fg-mode[data-v="inner"] { backdrop-filter: grayscale(.55) brightness(.58) contrast(1.12); -webkit-backdrop-filter: grayscale(.55) brightness(.58) contrast(1.12); background: radial-gradient(42% 58% at 50% 56%, rgba(130, 150, 255, .1), rgba(2, 2, 16, .78) 100%); }
.fg-mode[data-v="screen"] { backdrop-filter: contrast(1.12) saturate(.75) brightness(1.04); -webkit-backdrop-filter: contrast(1.12) saturate(.75) brightness(1.04); background: repeating-linear-gradient(0deg, rgba(0, 0, 0, .2) 0 1px, transparent 1px 3px), radial-gradient(110% 100% at 50% 50%, transparent 60%, rgba(0, 0, 0, .6)); }
.fg-mode[data-v="screen"]:not(.is-leave) { animation: fg-layer-in var(--fade) ease both, fg-screenflick 4s steps(1) infinite; }
@keyframes fg-screenflick { 0%, 100% { opacity: 1; } 40% { opacity: .93; } 41% { opacity: 1; } 77% { opacity: .96; } }
.fg-mode[data-v="screen"]::before { content: "● REC"; inset: auto auto auto auto; left: 4%; top: 5%; font: 700 1.7cqw/1 var(--font-latin); letter-spacing: .2em; color: #ff3b3b; text-shadow: 0 0 .6cqw rgba(255, 0, 0, .7); animation: fg-pulse 1.4s steps(1) infinite; }
.fg-mode[data-v="screen"]::after { inset: 3%; background:
  linear-gradient(#fff, #fff) top left / 3cqw 2px no-repeat, linear-gradient(#fff, #fff) top left / 2px 3cqw no-repeat,
  linear-gradient(#fff, #fff) top right / 3cqw 2px no-repeat, linear-gradient(#fff, #fff) top right / 2px 3cqw no-repeat,
  linear-gradient(#fff, #fff) bottom left / 3cqw 2px no-repeat, linear-gradient(#fff, #fff) bottom left / 2px 3cqw no-repeat,
  linear-gradient(#fff, #fff) bottom right / 3cqw 2px no-repeat, linear-gradient(#fff, #fff) bottom right / 2px 3cqw no-repeat; opacity: .7; }
.fg-mode[data-v="tale"] { backdrop-filter: sepia(.4) saturate(.8) contrast(1.06); -webkit-backdrop-filter: sepia(.4) saturate(.8) contrast(1.06); background: radial-gradient(100% 85% at 50% 48%, transparent 50%, rgba(70, 40, 10, .62)); box-shadow: inset 0 0 0 1.2cqw rgba(40, 24, 8, .35), inset 0 0 0 1.4cqw rgba(220, 190, 140, .35); }
.fg-mode[data-v="vision"] { backdrop-filter: grayscale(.7) brightness(1.1) contrast(1.22); -webkit-backdrop-filter: grayscale(.7) brightness(1.1) contrast(1.22); background: radial-gradient(110% 90% at 50% 50%, rgba(140, 240, 255, .14) 40%, rgba(220, 255, 255, .55)); }
.fg-mode[data-v="vision"]::after { background: repeating-linear-gradient(0deg, transparent 0 22px, rgba(180, 255, 255, .25) 22px 23px); animation: fg-scan 3s linear infinite; }
@keyframes fg-scan { from { background-position: 0 0; } to { background-position: 0 92px; } }
.fg-mode[data-v="digital"] { backdrop-filter: saturate(1.3) contrast(1.08) hue-rotate(-12deg); -webkit-backdrop-filter: saturate(1.3) contrast(1.08) hue-rotate(-12deg); background: linear-gradient(rgba(0, 255, 230, .2) 1px, transparent 1px) 0 0 / 100% 6%, linear-gradient(90deg, rgba(0, 255, 230, .2) 1px, transparent 1px) 0 0 / 4% 100%, radial-gradient(110% 90% at 50% 50%, transparent 55%, rgba(0, 30, 50, .55)); }
.fg-mode[data-v="digital"]::after { background: linear-gradient(180deg, transparent 0, rgba(120, 255, 240, .22) 50%, transparent 100%) 0 0 / 100% 18% no-repeat; animation: fg-sweep 4s linear infinite; }
@keyframes fg-sweep { from { background-position: 0 -20%; } to { background-position: 0 120%; } }
/* 段落里整个画面也跟着动：梦里轻飘、幻觉里扭曲、主观视角随呼吸起伏 */
.fg-world-in[data-mode="dream"] { animation: fg-mode-float 9s ease-in-out infinite; }
.fg-world-in[data-mode="illusion"] { animation: fg-mode-warp 4.4s ease-in-out infinite; }
.fg-world-in[data-mode="pov"] { animation: fg-mode-breath 4.2s ease-in-out infinite; }
@keyframes fg-mode-float { 0%, 100% { transform: scale(1.04) translateY(-.4%); } 50% { transform: scale(1.04) translateY(.5%); } }
@keyframes fg-mode-warp { 0%, 100% { transform: scale(1.05) skew(0, 0); } 25% { transform: scale(1.07) skew(1.2deg, -.4deg); } 50% { transform: scale(1.05) skew(-.6deg, .6deg); } 75% { transform: scale(1.06) skew(-1deg, -.3deg); } }
@keyframes fg-mode-breath { 0%, 100% { transform: scale(1.035) translateY(0); } 50% { transform: scale(1.035) translateY(-.45%); } }
@media (prefers-reduced-motion: reduce) {
  .fg-world, .fg-world-in, .fg-fxlayer, .fg-mode, .fg-light { animation: none !important; }
}

/* 转场：慢慢变过去（时间流逝）、闭眼睁眼、画面撕裂、旋转入梦。 */
@keyframes fg-fade-slow { from { opacity: 0; } to { opacity: 1; } }
@keyframes fg-blink-in { 0%, 42% { opacity: 0; } 50%, 100% { opacity: 1; } }
@keyframes fg-glitch-in { 0% { opacity: 0; transform: translateX(3%); filter: hue-rotate(90deg) contrast(2); } 20% { opacity: 1; transform: translateX(-2%); } 40% { transform: translateX(1.5%) skewX(4deg); filter: hue-rotate(-60deg) contrast(1.6); } 60% { transform: translateX(-.8%); } 80% { transform: none; filter: hue-rotate(20deg); } 100% { filter: none; } }
@keyframes fg-swirl-in { from { opacity: 0; transform: rotate(-14deg) scale(1.45); filter: blur(16px) brightness(1.4); } to { opacity: 1; transform: none; filter: none; } }
.fg-flash.is-blink { background: none; animation: fg-eye-blink-blur 1.5s ease-in-out both; -webkit-backdrop-filter: blur(var(--eye-blur)); backdrop-filter: blur(var(--eye-blur)); }
.fg-flash.is-blink::before { content: ""; position: absolute; inset: 0; background: radial-gradient(ellipse 72% var(--eye) at 50% var(--eye-y), transparent 70%, rgba(0, 0, 0, .6) 84%, #000 100%); animation: fg-eye-blink 1.5s ease-in-out both; }
@keyframes fg-eye-blink { 0% { --eye: 95%; --eye-y: 50%; } 30%, 45% { --eye: 0%; --eye-y: 60%; } 62% { --eye: 30%; --eye-y: 55%; } 72% { --eye: 16%; --eye-y: 57%; } 100% { --eye: 95%; --eye-y: 50%; } }
@keyframes fg-eye-blink-blur { 0% { --eye-blur: 0px; } 30%, 45% { --eye-blur: 6px; } 62% { --eye-blur: 9px; } 100% { --eye-blur: 0px; } }
.fg-flash.is-glitch { background: linear-gradient(transparent 0 22%, rgba(255, 0, 90, .5) 22% 25%, transparent 25% 51%, rgba(0, 255, 220, .45) 51% 53%, transparent 53% 78%, rgba(255, 255, 255, .6) 78% 79.5%, transparent 79.5%); mix-blend-mode: screen; animation: fg-glitch .7s steps(6) both; }
@keyframes fg-glitch { 0% { opacity: 1; transform: translate(0, 0); } 30% { transform: translate(-4%, 8%); } 60% { transform: translate(5%, -12%); opacity: .8; } 100% { opacity: 0; transform: translate(0, 20%); } }

/* 过场字卡：时间跳跃、日期、章节、与此同时。 */
.fg-cut { position: absolute; inset: 0; z-index: 30; display: flex; align-items: center; justify-content: center; background: #05040c; animation: fg-cut-in .5s ease both; pointer-events: none; }
.fg-cut.is-out { animation: fg-cut-out .6s ease both; }
.fg-cut[data-kind="meanwhile"] { background: linear-gradient(100deg, rgba(5, 4, 12, .96) 0 58%, rgba(5, 4, 12, .9)); }
.fg-cut-inner { text-align: center; animation: fg-cut-text 2.3s ease both; }
.fg-cut-kicker { display: flex; align-items: center; justify-content: center; gap: 1.2cqw; font-family: var(--font-latin); font-size: 1.15cqw; letter-spacing: .6em; text-transform: uppercase; color: rgba(255, 255, 255, .6); }
.fg-cut-kicker i { width: 6cqw; height: 1px; background: linear-gradient(90deg, transparent, var(--accent2)); }
.fg-cut-kicker i:last-child { background: linear-gradient(270deg, transparent, var(--accent2)); }
.fg-cut-text { margin-top: 1.4cqw; font-family: var(--font-display); font-size: 3.6cqw; font-weight: 700; letter-spacing: .3em; color: var(--ink); text-shadow: 0 0 3cqw rgba(155, 123, 255, .45); }
.fg-cut[data-kind="chapter"] .fg-cut-text { font-size: 4.4cqw; }
.fg-cut[data-kind="date"] .fg-cut-text { font-family: var(--font-latin), var(--font-display); letter-spacing: .18em; }
.fg-cut[data-kind="meanwhile"] .fg-cut-inner { text-align: left; transform: translateX(-12%); }
@keyframes fg-cut-in { from { opacity: 0; } }
@keyframes fg-cut-out { to { opacity: 0; } }
@keyframes fg-cut-text { 0% { opacity: 0; transform: translateY(.8cqw); letter-spacing: .5em; } 30% { opacity: 1; transform: none; } 100% { letter-spacing: .3em; } }
.fg-hud-mode { color: var(--accent); }

/* ── 地点标题卡 ── */
.fg-titlecard { position: absolute; left: 6%; top: 34%; z-index: 25; pointer-events: none; animation: fg-titlecard 3.2s ease both; }
.fg-titlecard-line { width: 26cqw; height: 1px; background: linear-gradient(90deg, var(--accent), var(--accent2), transparent); transform-origin: left; animation: fg-line 1s .1s cubic-bezier(.6, 0, .2, 1) both; }
.fg-titlecard-name { font-family: var(--font-display); font-size: 4.6cqw; font-weight: 700; letter-spacing: .32em; margin: .8cqw 0 .4cqw; text-shadow: 0 0 2cqw rgba(0, 0, 0, .8), 0 0 4cqw var(--accent2); }
.fg-titlecard-sub { font-family: var(--font-latin); font-size: 1.3cqw; letter-spacing: .5em; color: rgba(255, 255, 255, .75); text-transform: uppercase; }
@keyframes fg-titlecard { 0% { opacity: 0; transform: translateX(-2%); } 15% { opacity: 1; transform: none; } 80% { opacity: 1; } 100% { opacity: 0; transform: translateX(1%); } }
@keyframes fg-line { from { transform: scaleX(0); } }

/* ── HUD ── */
.fg-hud { position: absolute; left: 2.2%; top: 3.2%; z-index: 20; display: flex; align-items: stretch; gap: .9cqw; transition: opacity .3s; }
.fg-hud-bar { width: .28cqw; border-radius: 9px; background: linear-gradient(180deg, var(--accent), var(--accent2)); box-shadow: 0 0 1cqw var(--accent); }
.fg-hud-place { font-family: var(--font-display); font-size: 1.55cqw; font-weight: 700; letter-spacing: .14em; text-shadow: 0 1px 6px rgba(0, 0, 0, .7); }
.fg-hud-meta { margin-top: .25cqw; font-size: .95cqw; letter-spacing: .14em; color: var(--ink-dim); text-shadow: 0 1px 4px rgba(0, 0, 0, .7); display: flex; gap: .8cqw; }
.fg-topright { position: absolute; right: 2%; top: 3%; z-index: 22; display: flex; gap: .6cqw; align-items: center; }
.fg-pill { display: inline-flex; align-items: center; gap: .5cqw; padding: .45cqw 1cqw; border-radius: 99px; background: var(--chip-bg); border: 1px solid var(--box-border); backdrop-filter: blur(10px); font-size: .95cqw; letter-spacing: .08em; color: var(--ink); transition: opacity 1.2s; }
.fg-pill.is-busy::before { content: ""; width: .7cqw; height: .7cqw; border-radius: 50%; border: 2px solid var(--accent); border-right-color: transparent; animation: fg-spin .8s linear infinite; }
.fg-iconbtn { width: 2.6cqw; height: 2.6cqw; border-radius: 50%; display: grid; place-items: center; background: var(--chip-bg); border: 1px solid var(--box-border); backdrop-filter: blur(10px); font-size: 1.2cqw; transition: transform .2s, background .2s; }
.fg-iconbtn:hover { transform: rotate(90deg); background: rgba(255, 255, 255, .14); }

/* ── 对话框 ── */
.fg-dialog { position: absolute; left: 4%; right: 4%; bottom: 3.6%; height: 27%; z-index: 20; transition: opacity .3s, transform .3s; }
.fg-ui-hidden .fg-dialog, .fg-ui-hidden .fg-hud, .fg-ui-hidden .fg-topright, .fg-ui-hidden .fg-quick { opacity: 0; pointer-events: none; }
/* 插画出现时对话框先让开（淡出、往下沉一点），画面出来后再回来 */
.fg-dialog.is-away { opacity: 0; transform: translateY(1.2cqw); pointer-events: none; }
.fg-box { position: absolute; inset: 0; border-radius: var(--box-radius); background: var(--box-bg); border: 1px solid var(--box-border); backdrop-filter: var(--box-blur); -webkit-backdrop-filter: var(--box-blur); box-shadow: 0 1.4cqw 4cqw rgba(0, 0, 0, .45), inset 0 1px 0 rgba(255, 255, 255, .08); overflow: hidden; }
.fg-box::before { content: ""; position: absolute; left: 0; right: 0; top: 0; height: 2px; background: linear-gradient(90deg, transparent, var(--accent), var(--accent2), var(--accent3), transparent); background-size: 200% 100%; animation: fg-shimmer 6s linear infinite; opacity: .9; }
.fg-box::after { content: ""; position: absolute; right: -6cqw; bottom: -10cqw; width: 26cqw; height: 26cqw; border-radius: 50%; background: radial-gradient(circle, color-mix(in oklab, var(--speaker, var(--accent)) 28%, transparent), transparent 65%); pointer-events: none; transition: background .6s; }
@keyframes fg-shimmer { from { background-position: 200% 0; } to { background-position: 0 0; } }
.fg-name { position: absolute; left: 3.2%; top: -2.3cqw; z-index: 2; display: flex; align-items: flex-end; gap: .8cqw; animation: fg-name-in .35s cubic-bezier(.2, .8, .2, 1) both; }
.fg-name-plate { position: relative; padding: .5cqw 2.4cqw .55cqw 1.6cqw; font-family: var(--font-display); font-weight: 700; font-size: 1.75cqw; letter-spacing: .2em; color: var(--name-ink);
  background: linear-gradient(100deg, var(--speaker, var(--accent)), color-mix(in oklab, var(--speaker, var(--accent)) 55%, var(--accent2)));
  clip-path: polygon(0 0, 100% 0, calc(100% - 1.2cqw) 100%, 0 100%); box-shadow: 0 .4cqw 1.6cqw rgba(0, 0, 0, .35); text-shadow: 0 1px 2px rgba(0, 0, 0, .35); }
.fg-name-plate::after { content: ""; position: absolute; left: 1.6cqw; right: 2.4cqw; bottom: .3cqw; height: 1px; background: rgba(255, 255, 255, .55); }
.fg-name-sub { font-family: var(--font-latin); font-size: 1cqw; letter-spacing: .32em; color: var(--ink-dim); padding-bottom: .4cqw; text-transform: uppercase; }
@keyframes fg-name-in { from { opacity: 0; transform: translateX(-1.2cqw); } }
/* 声音的样子：名牌旁的小标（三根跳动的音量条 + 字），对话框和字跟着换样子 */
.fg-voice-chip { display: flex; align-items: center; gap: .25cqw; margin-bottom: .3cqw; padding: .35cqw .9cqw .35cqw .7cqw; border-radius: 99px; font-size: 1.15cqw; font-weight: 600; letter-spacing: .18em; color: #fff; background: rgba(0, 0, 0, .55); border: 1px solid rgba(255, 255, 255, .25); backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); }
.fg-voice-chip span { margin-left: .4cqw; }
.fg-voice-chip i { width: .25cqw; height: 1.05cqw; border-radius: 1px; background: currentColor; transform-origin: 50% 100%; animation: fg-voice-bar .7s ease-in-out infinite alternate; }
.fg-voice-chip i:nth-child(2) { animation-delay: -.25s; } .fg-voice-chip i:nth-child(3) { animation-delay: -.5s; }
@keyframes fg-voice-bar { from { transform: scaleY(.3); } to { transform: scaleY(1); } }
.fg-voice-chip[data-voice="phone"] { color: #9fe8ff; border-color: rgba(120, 220, 255, .45); }
.fg-voice-chip[data-voice="radio"] { color: #ffd27a; border-color: rgba(255, 200, 100, .45); }
.fg-voice-chip[data-voice="telepathy"] { color: #e0b8ff; border-color: rgba(210, 160, 255, .55); box-shadow: 0 0 1cqw rgba(190, 120, 255, .45); }
.fg-voice-chip[data-voice="chorus"] { color: #ffe6f2; border-color: rgba(255, 190, 220, .45); }
.fg-voice-chip[data-voice="offscreen"] { color: rgba(255, 255, 255, .75); border-style: dashed; }
.fg-voice-chip[data-voice="echo"] { color: #c6e0ff; border-color: rgba(170, 210, 255, .4); }
.fg-voice-chip[data-voice="memory"] { color: #f2dcb4; border-color: rgba(240, 210, 160, .4); }
.fg-voice-chip[data-voice="machine"] { color: #7dffd8; border-color: rgba(90, 255, 200, .5); border-radius: .2cqw; font-family: ui-monospace, Menlo, Consolas, monospace; }
.fg-voice-chip[data-voice="machine"] i { animation-timing-function: steps(3); }
/* 电话：字偏冷、对话框里一道道细横纹，像隔着听筒 */
.fg-dialog[data-voice="phone"] .fg-text { color: color-mix(in oklab, var(--ink) 80%, #9fe8ff); }
.fg-dialog[data-voice="phone"] .fg-box { background: repeating-linear-gradient(0deg, rgba(160, 230, 255, .05) 0 2px, transparent 2px 5px), var(--box-bg); }
/* 广播 / 对讲机：字微微闪、带一点颗粒 */
.fg-dialog[data-voice="radio"] .fg-text { color: color-mix(in oklab, var(--ink) 82%, #ffd27a); animation: fg-voice-radio 2.4s steps(1) infinite; }
.fg-dialog[data-voice="radio"] .fg-box { background: repeating-linear-gradient(0deg, rgba(255, 220, 140, .06) 0 1px, transparent 1px 3px), var(--box-bg); }
@keyframes fg-voice-radio { 0%, 100% { opacity: 1; } 31% { opacity: .82; } 32% { opacity: 1; } 67% { opacity: .9; } 68% { opacity: 1; } }
/* 心灵感应：字发光、轻轻浮动，对话框边缘泛紫 */
.fg-dialog[data-voice="telepathy"] .fg-text { color: color-mix(in oklab, var(--ink) 72%, #b070ff); text-shadow: 0 0 .7cqw rgba(200, 140, 255, .85), 0 0 1.8cqw rgba(160, 100, 255, .45); }
.fg-dialog[data-voice="telepathy"] .fg-line { display: inline-block; animation: fg-voice-float 3.2s ease-in-out infinite; }
.fg-dialog[data-voice="telepathy"] .fg-box { box-shadow: 0 1.4cqw 4cqw rgba(0, 0, 0, .45), inset 0 0 3cqw rgba(170, 110, 255, .35); border-color: rgba(200, 150, 255, .5); }
@keyframes fg-voice-float { 0%, 100% { transform: translateY(0); filter: blur(0); } 50% { transform: translateY(-.25cqw); filter: blur(.3px); } }
/* 齐声：字叠着两层错开的影子，像几个人同时开口 */
.fg-dialog[data-voice="chorus"] .fg-text { text-shadow: .14cqw .1cqw 0 rgba(255, 190, 220, .4), -.14cqw -.08cqw 0 rgba(170, 210, 255, .4), 0 1px 2px rgba(0, 0, 0, .45); font-weight: 600; }
/* 画外音：人不在画面里，字淡一点、名牌虚线框 */
.fg-dialog[data-voice="offscreen"] .fg-text { opacity: .86; }
.fg-dialog[data-voice="offscreen"] .fg-name-plate { outline: 1px dashed rgba(255, 255, 255, .5); outline-offset: .2cqw; opacity: .85; }
/* 回声：每个字后面拖着两层渐远的影子 */
.fg-dialog[data-voice="echo"] .fg-text { text-shadow: .35cqw 0 0 rgba(255, 255, 255, .2), .75cqw 0 .1cqw rgba(255, 255, 255, .1), 0 1px 2px rgba(0, 0, 0, .45); }
/* 回忆：字泛旧纸的暖色，外面一圈很淡的光晕，像隔着一层时间 */
.fg-dialog[data-voice="memory"] .fg-text { color: color-mix(in oklab, var(--ink) 74%, #f0d2a0); text-shadow: 0 0 .9cqw rgba(255, 220, 170, .3), 0 1px 2px rgba(0, 0, 0, .45); }
/* 机械音：等宽字、青色、扫描线 */
.fg-dialog[data-voice="machine"] .fg-text { font-family: ui-monospace, Menlo, Consolas, monospace; color: color-mix(in oklab, var(--ink) 55%, #10d0a0); letter-spacing: .08em; text-shadow: 0 0 .5cqw rgba(60, 255, 200, .5); }
.fg-dialog[data-voice="machine"] .fg-box { background: repeating-linear-gradient(0deg, rgba(80, 255, 200, .07) 0 1px, transparent 1px 3px), var(--box-bg); }
/* ── 短闪回里的对话框（data-recall 是基调，Dialog.jsx 的 DialogBox）：不加头像、不贴「回忆」标签，对话框自己换个样子 ──
   共通：框染上基调的颜色（用整块的内阴影，换进换出能慢慢过渡）、左右两头化开、顶上那道彩色细线收起，字慢慢洇出来。
   名牌默认模糊压暗：认得出是谁，又像隔着一层看不清（data-recall-name="blur"；hide 时不渲染名牌）。
   前面加 .fg-theater 是为了压过皮肤里的同名规则；字的出场（.fg-char）不加，好让后面的「打完」「等着」和台词演法照常压过它 */
@property --fg-feather { syntax: '<percentage>'; inherits: false; initial-value: 0%; }
.fg-box { transition: box-shadow .8s ease, border-color .8s ease, --fg-feather .8s ease; }
.fg-box::before { transition: opacity .8s ease; }
.fg-theater .fg-dialog[data-recall] .fg-box { --fg-feather: 9%; --tint: rgba(110, 72, 28, .34); border-color: rgba(240, 210, 160, .3);
  box-shadow: 0 1.4cqw 4cqw rgba(0, 0, 0, .4), inset 0 0 0 100vmax var(--tint), inset 0 0 3cqw rgba(0, 0, 0, .35);
  --fade-x: linear-gradient(90deg, transparent, #000 var(--fg-feather), #000 calc(100% - var(--fg-feather)), transparent);
  --fade-y: linear-gradient(180deg, transparent, #000 calc(var(--fg-feather) * 1.6), #000 calc(100% - var(--fg-feather) * .8), transparent);
  -webkit-mask-image: var(--fade-x), var(--fade-y); -webkit-mask-composite: source-in; mask-image: var(--fade-x), var(--fade-y); mask-composite: intersect; }
.fg-theater .fg-dialog[data-recall] .fg-box::before { opacity: 0; }
.fg-theater .fg-dialog[data-recall] .fg-box::after { background: radial-gradient(circle, rgba(255, 206, 140, .2), transparent 65%); }
.fg-theater .fg-dialog[data-recall] .fg-text { color: color-mix(in oklab, var(--ink) 70%, #f0d2a0); text-shadow: 0 0 .9cqw rgba(255, 214, 160, .35), 0 1px 2px rgba(0, 0, 0, .5); }
.fg-dialog[data-recall] .fg-char { animation-name: fg-char-recall; animation-duration: .6s; }
@keyframes fg-char-recall { from { opacity: 0; filter: blur(4px); } to { opacity: 1; filter: none; } }
.fg-theater .fg-dialog[data-recall-name="blur"] .fg-name-plate { background: color-mix(in oklab, var(--speaker, var(--accent)) 22%, rgba(16, 12, 8, .82)); color: rgba(255, 255, 255, .7);
  box-shadow: none; text-shadow: none; filter: blur(.13cqw); opacity: .74; animation: fg-name-recall 4.6s ease-in-out infinite; }
.fg-theater .fg-dialog[data-recall-name="blur"] .fg-name-plate::after { opacity: .25; }
@keyframes fg-name-recall { 0%, 100% { filter: blur(.1cqw); opacity: .78; } 50% { filter: blur(.2cqw); opacity: .62; } }
/* 甜蜜：泛粉，框里几点光斑慢慢飘，字带一圈粉色的光 */
.fg-theater .fg-dialog[data-recall="sweet"] .fg-box { --tint: rgba(140, 48, 90, .3); border-color: rgba(255, 190, 215, .35); }
.fg-theater .fg-dialog[data-recall="sweet"] .fg-box::after { display: block; inset: -10%; width: auto; height: auto; border-radius: 0; filter: blur(.35cqw); animation: fg-bokeh 8s ease-in-out infinite alternate;
  background: radial-gradient(circle at 12% 30%, rgba(255, 190, 220, .22) 0 .6cqw, transparent 1cqw), radial-gradient(circle at 38% 78%, rgba(255, 180, 214, .18) 0 .4cqw, transparent .7cqw),
    radial-gradient(circle at 70% 22%, rgba(255, 200, 226, .2) 0 .8cqw, transparent 1.2cqw), radial-gradient(circle at 90% 70%, rgba(255, 186, 218, .22) 0 .5cqw, transparent .8cqw); }
.fg-theater .fg-dialog[data-recall="sweet"] .fg-text { color: color-mix(in oklab, var(--ink) 72%, #ffd0e2); text-shadow: 0 0 1cqw rgba(255, 170, 205, .5), 0 1px 2px rgba(0, 0, 0, .45); }
/* 伤感：冷灰泛蓝，字褪色、出得慢 */
.fg-theater .fg-dialog[data-recall="sad"] .fg-box { --tint: rgba(18, 30, 50, .52); border-color: rgba(160, 180, 210, .2); }
.fg-theater .fg-dialog[data-recall="sad"] .fg-box::after { background: radial-gradient(circle, rgba(140, 170, 220, .14), transparent 65%); }
.fg-theater .fg-dialog[data-recall="sad"] .fg-text { color: color-mix(in oklab, var(--ink) 60%, #aebdd2); text-shadow: 0 1px 2px rgba(0, 0, 0, .5); }
.fg-dialog[data-recall="sad"] .fg-char { animation-name: fg-char-fade; animation-duration: 1s; }
@keyframes fg-char-fade { from { opacity: 0; filter: blur(1.5px); } to { opacity: 1; filter: none; } }
/* 不安：暗红，框的四边像心跳一样一暗一暗（跟画面四角的节奏一样），字带红青两层错开的影子，时不时抖一下 */
.fg-theater .fg-dialog[data-recall="dread"] .fg-box { --tint: rgba(28, 0, 6, .6); border-color: rgba(200, 30, 45, .45); transition-duration: .25s; }
.fg-theater .fg-dialog[data-recall="dread"] .fg-box::after { display: block; inset: 0; width: auto; height: auto; border-radius: 0; filter: none;
  background: radial-gradient(120% 140% at 50% 50%, transparent 45%, rgba(150, 0, 18, .5)); animation: fg-dread-pulse 1.2s ease-in-out infinite; }
.fg-theater .fg-dialog[data-recall="dread"] .fg-text { color: color-mix(in oklab, var(--ink) 82%, #ffd2d2); text-shadow: .09cqw 0 0 rgba(255, 40, 64, .55), -.09cqw 0 0 rgba(70, 200, 255, .3), 0 1px 2px rgba(0, 0, 0, .6); }
.fg-theater .fg-dialog[data-recall="dread"] .fg-line { display: inline-block; animation: fg-line-jitter 3.4s steps(1) infinite; }
.fg-dialog[data-recall="dread"] .fg-char { animation-name: fg-char-flicker; animation-duration: .32s; animation-timing-function: steps(4); }
@keyframes fg-line-jitter { 0%, 90%, 100% { transform: none; } 91% { transform: translate(.2cqw, -.08cqw); } 93% { transform: translate(-.16cqw, .06cqw); } 95% { transform: translate(.08cqw, 0); } }
@keyframes fg-char-flicker { 0% { opacity: 0; } 25% { opacity: .9; } 50% { opacity: .2; } 75%, 100% { opacity: 1; } }
/* 猛然想起：白边、亮一下，字很清楚，后面拖一层白色残影 */
.fg-theater .fg-dialog[data-recall="flash"] .fg-box { --fg-feather: 4%; --tint: rgba(255, 255, 255, .07); border-color: rgba(255, 255, 255, .7); transition-duration: .2s; animation: fg-box-snap .6s ease-out; }
.fg-theater .fg-dialog[data-recall="flash"] .fg-box::after { background: radial-gradient(circle, rgba(255, 255, 255, .16), transparent 65%); }
@keyframes fg-box-snap { from { box-shadow: 0 0 3cqw rgba(255, 255, 255, .6), inset 0 0 0 100vmax rgba(255, 255, 255, .55); } }
.fg-theater .fg-dialog[data-recall="flash"] .fg-text { color: #fff; text-shadow: .3cqw 0 .05cqw rgba(255, 255, 255, .22), 0 1px 2px rgba(0, 0, 0, .55); }
.fg-dialog[data-recall="flash"] .fg-char { animation-name: fg-char-snap; animation-duration: .3s; }
@keyframes fg-char-snap { from { opacity: 0; text-shadow: 0 0 1cqw #fff, 0 0 2cqw #fff; } }
/* 朦胧如梦：框几乎化开成一团雾，字发着光、慢慢浮出来，整行轻轻失焦又对上焦 */
.fg-theater .fg-dialog[data-recall="haze"] .fg-box { --tint: rgba(255, 248, 236, .14); border-color: transparent; box-shadow: inset 0 0 0 100vmax var(--tint);
  -webkit-mask-image: radial-gradient(62% 110% at 50% 50%, #000 45%, transparent 100%); mask-image: radial-gradient(62% 110% at 50% 50%, #000 45%, transparent 100%); }
.fg-theater .fg-dialog[data-recall="haze"] .fg-box::after { background: radial-gradient(circle, rgba(255, 250, 240, .22), transparent 65%); }
.fg-theater .fg-dialog[data-recall="haze"] .fg-text { color: color-mix(in oklab, var(--ink) 80%, #fff6e6); text-shadow: 0 0 1.2cqw rgba(255, 248, 232, .6), 0 1px 2px rgba(0, 0, 0, .35); }
.fg-theater .fg-dialog[data-recall="haze"] .fg-line { display: inline-block; animation: fg-line-haze 5s ease-in-out infinite; }
.fg-dialog[data-recall="haze"] .fg-char { animation-name: fg-char-mist; animation-duration: 1.1s; }
@keyframes fg-line-haze { 0%, 100% { filter: none; } 50% { filter: blur(.5px); } }
@keyframes fg-char-mist { from { opacity: 0; filter: blur(7px); } to { opacity: 1; filter: none; } }
.fg-text { position: absolute; left: 4.2%; right: 5%; top: 23%; bottom: 20%; font-size: 1.95cqw; line-height: 1.78; letter-spacing: .04em; text-shadow: 0 1px 2px rgba(0, 0, 0, .45); overflow: hidden; }
.fg-text.is-narration { color: color-mix(in oklab, var(--ink) 92%, var(--accent3)); }
.fg-text.is-thought { font-style: italic; color: color-mix(in oklab, var(--ink) 70%, var(--accent2)); }
.fg-text.is-cardhint { color: var(--ink-dim); font-size: 1.3cqw; letter-spacing: .4em; text-align: center; }
.fg-text.is-thought .fg-line::before { content: "（"; } .fg-text.is-thought .fg-line::after { content: "）"; }
/* 双语对照：像注音一样，上方小字原文，下方是打出来的翻译；原文的字跟着翻译的进度一起出（Dialog.jsx 的 origChars） */
.fg-orig { font-size: .62em; line-height: 1.45; letter-spacing: .02em; opacity: .72; margin-bottom: .2em; font-style: normal; font-weight: normal; }
.fg-char { opacity: 0; animation: fg-char-in .22s ease forwards; animation-delay: var(--d); display: inline; }
.fg-text.is-done .fg-char { animation: none; opacity: 1; }
.fg-text.is-wait .fg-char { animation: none; }
@keyframes fg-char-in { from { opacity: 0; filter: blur(3px); } to { opacity: 1; filter: none; } }
/* ── 台词演法与重音（lib/typing.js）：字的样子。要做位移、缩放的字改成 inline-block，空格照样占位 ── */
.fg-text[class*="say-"] .fg-char, .fg-char.is-stress { display: inline-block; white-space: pre; }
.fg-text.say-menace .fg-char { animation-name: fg-char-stamp; animation-duration: .2s; }
.fg-text.say-excited .fg-char { animation-name: fg-char-hop; animation-duration: .14s; }
.fg-text.say-shout .fg-char { animation-name: fg-char-pop; animation-duration: .28s; font-size: 1.16em; font-weight: 700; }
.fg-text.say-hesitant .fg-char { animation-duration: .32s; }
.fg-text.say-whisper { opacity: .8; }
.fg-text.say-whisper .fg-char { font-size: .9em; animation-duration: .45s; }
.fg-text.say-breakdown .fg-char { color: color-mix(in oklab, var(--ink) 72%, #ff3b5c); animation: fg-char-in .12s ease forwards var(--d), fg-char-quake .2s linear infinite var(--d); }
.fg-char.is-stress { color: var(--stress, #ff4d5e); font-weight: 700; font-size: 1.1em; text-shadow: 0 0 .6cqw rgba(255, 60, 80, .45); animation-name: fg-char-stamp; animation-duration: .24s; }
/* 点一下打完 / 等字体时：和普通台词一样立刻全显示、或先不动（要比上面的演法规则更具体才压得住） */
.fg-text.is-done[class*="say-"] .fg-char, .fg-text.is-done .fg-char.is-stress { animation: none; opacity: 1; }
.fg-text.is-wait[class*="say-"] .fg-char, .fg-text.is-wait .fg-char.is-stress { animation: none; }
.fg-text.is-done.say-breakdown .fg-char { animation: fg-char-quake .2s linear infinite; opacity: 1; }
@keyframes fg-char-stamp { from { opacity: 0; transform: translateY(-.35em) scale(1.4); } 60% { opacity: 1; transform: translateY(0) scale(.95); } to { opacity: 1; transform: none; } }
@keyframes fg-char-pop { from { opacity: 0; transform: scale(1.9); } 55% { opacity: 1; transform: scale(.92); } to { opacity: 1; transform: none; } }
@keyframes fg-char-hop { from { opacity: 0; transform: translateY(.3em); } to { opacity: 1; transform: none; } }
@keyframes fg-char-quake { 0%, 100% { opacity: 1; transform: translate(0, 0); } 25% { opacity: 1; transform: translate(.05em, -.04em); } 50% { opacity: 1; transform: translate(-.04em, .05em); } 75% { opacity: 1; transform: translate(.04em, .03em); } }
/* ── 句中文字效果（导演 textfx，节奏和打字音在 lib/typing.js 的 TEXT_STYLES）：某几个字的样子。
   比台词演法（.fg-text.say-*）更具体，同一句里两者都有时以这几个字为准；字号变大的把行高收紧，免得一行被撑高、对话框装不下；越说越大 / 越小按 --k（这段走到几成）变，波浪按 --i（第几个字）错开 ── */
.fg-text .fg-char[class*="tx-"] { display: inline-block; white-space: pre; }
.fg-text .fg-char.tx-shake { animation: fg-char-in .22s ease forwards var(--d), fg-tx-shake .16s steps(2) infinite var(--d); }
.fg-text .fg-char.tx-wave { animation: fg-char-in .3s ease forwards var(--d), fg-tx-wave 1.3s ease-in-out infinite calc(var(--i) * -.13s); }
.fg-text .fg-char.tx-big { font-size: 1.32em; font-weight: 700; line-height: 1.1; animation-name: fg-char-pop; animation-duration: .26s; }
.fg-text .fg-char.tx-roar { font-size: 1.62em; font-weight: 900; line-height: 1; letter-spacing: -.02em; color: color-mix(in oklab, currentColor 80%, #ff5a4a); text-shadow: .06em .06em 0 rgba(0, 0, 0, .55), 0 0 .5em rgba(255, 70, 50, .45); animation-name: fg-tx-slam; animation-duration: .3s; }
.fg-text .fg-char.tx-grow { font-size: calc(1em + var(--k) * .6em); font-weight: calc(500 + var(--k) * 400); line-height: 1; animation-name: fg-char-pop; animation-duration: .22s; }
.fg-text .fg-char.tx-dwindle { font-size: calc(1em - var(--k) * .34em); color: color-mix(in oklab, currentColor calc(100% - var(--k) * 62%), transparent); animation-duration: .45s; }
.fg-text .fg-char.tx-small { font-size: .8em; color: color-mix(in oklab, currentColor 72%, transparent); }
.fg-text .fg-char.tx-faint { color: color-mix(in oklab, currentColor 50%, transparent); letter-spacing: .08em; text-shadow: 0 0 .35em rgba(255, 255, 255, .35); animation-duration: .7s; }
.fg-text .fg-char.tx-glow { color: color-mix(in oklab, var(--accent) 40%, #fff6d8); font-weight: 700; text-shadow: 0 0 .45em color-mix(in oklab, var(--accent) 70%, transparent), 0 0 1em color-mix(in oklab, var(--accent) 40%, transparent); animation: fg-char-in .3s ease forwards var(--d), fg-tx-glow 2.4s ease-in-out infinite calc(var(--d) + var(--i) * .08s); }
/* 打完之后：别的不再重放，发抖、波浪、发光接着动；等字体时先不动 */
.fg-text.is-done .fg-char[class*="tx-"] { animation: none; opacity: 1; }
.fg-text.is-done .fg-char.tx-shake { animation: fg-tx-shake .16s steps(2) infinite; }
.fg-text.is-done .fg-char.tx-wave { animation: fg-tx-wave 1.3s ease-in-out infinite calc(var(--i) * -.13s); }
.fg-text.is-done .fg-char.tx-glow { animation: fg-tx-glow 2.4s ease-in-out infinite calc(var(--i) * .08s); }
.fg-text.is-wait .fg-char[class*="tx-"] { animation: none; }
@keyframes fg-tx-shake { 0%, 100% { transform: translate(0, 0); } 25% { transform: translate(.045em, -.035em) rotate(-1deg); } 50% { transform: translate(-.04em, .04em) rotate(.8deg); } 75% { transform: translate(.035em, .03em); } }
@keyframes fg-tx-wave { 0%, 100% { transform: translateY(.1em); } 50% { transform: translateY(-.16em); } }
@keyframes fg-tx-slam { from { opacity: 0; transform: scale(2.6) rotate(-4deg); } 50% { opacity: 1; transform: scale(.88); } 75% { opacity: 1; transform: scale(1.06); } to { opacity: 1; transform: none; } }
@keyframes fg-tx-glow { 0%, 100% { filter: brightness(1); } 50% { filter: brightness(1.35); } }
.fg-wait { position: absolute; right: 2.6%; bottom: 20%; font-size: 1.2cqw; color: var(--accent); text-shadow: 0 0 .8cqw var(--accent); animation: fg-wait 1.1s ease-in-out infinite; }
.fg-wait::before { content: var(--wait-glyph); }
@keyframes fg-wait { 0%, 100% { transform: translateY(0) rotate(0); opacity: .9; } 50% { transform: translateY(-.35cqw) rotate(45deg); opacity: .5; } }
.fg-quick { position: absolute; right: 2.4%; bottom: 7%; display: flex; gap: 1.5cqw; font-family: var(--font-latin); font-size: .98cqw; font-weight: 600; letter-spacing: .2em; z-index: 3; }
.fg-quick button { color: var(--ink-dim); transition: color .2s, text-shadow .2s; position: relative; }
.fg-quick button:hover, .fg-quick button.is-on { color: var(--ink); text-shadow: 0 0 .8cqw var(--accent); }
.fg-quick button.is-on::after { content: ""; position: absolute; left: 0; right: .2em; bottom: -.3cqw; height: 1px; background: var(--accent); }
.fg-progress { position: absolute; left: 4.2%; right: 30%; bottom: 8.6%; height: 2px; border-radius: 2px; background: rgba(255, 255, 255, .08); overflow: hidden; }
.fg-progress i { position: absolute; left: 0; top: 0; bottom: 0; background: linear-gradient(90deg, var(--accent), var(--accent2)); box-shadow: 0 0 6px var(--accent); transition: width .4s ease; }
.fg-status { position: absolute; left: 4.2%; bottom: 7%; font-size: .9cqw; letter-spacing: .1em; color: var(--ink-dim); display: flex; align-items: center; gap: .5cqw; }
.fg-status::before { content: ""; width: .6cqw; height: .6cqw; border-radius: 50%; background: var(--accent3); box-shadow: 0 0 .6cqw var(--accent3); animation: fg-pulse 1.4s ease-in-out infinite; }

/* ── 情境卡片（短信、信件……） ── */
.fg-card { position: absolute; left: 50%; top: 42%; z-index: 21; width: 40cqw; transform: translate(-50%, -50%); animation: fg-card-in .7s cubic-bezier(.2, .8, .2, 1) both; font-size: 1.6cqw; line-height: 1.7; }
@keyframes fg-card-in { from { opacity: 0; transform: translate(-50%, -42%) rotateX(35deg) scale(.9); } }
.fg-card[data-card="sms"] { padding: 1.6cqw; border-radius: 2cqw; background: rgba(250, 250, 255, .94); color: #1b1d2a; box-shadow: 0 2cqw 5cqw rgba(0, 0, 0, .5); }
.fg-card[data-card="sms"] .fg-card-head { font-size: 1cqw; color: #6b7280; text-align: center; margin-bottom: 1cqw; letter-spacing: .1em; }
.fg-card[data-card="sms"] .fg-card-body { display: inline-block; max-width: 90%; padding: 1cqw 1.4cqw; border-radius: 1.6cqw 1.6cqw 1.6cqw .4cqw; background: #e8ebf4; }
.fg-card[data-card="letter"], .fg-card[data-card="diary"] { padding: 3cqw 3.4cqw; background: repeating-linear-gradient(180deg, #fbf5e6 0 2.6cqw, #e9dcc0 2.6cqw calc(2.6cqw + 1px)), #fbf5e6; color: #4a3626; font-family: var(--font-display); box-shadow: 0 2cqw 5cqw rgba(0, 0, 0, .55); transform-origin: 50% 0; transform: translate(-50%, -50%) rotate(-1.2deg); }
.fg-card[data-card="note"] { width: 28cqw; padding: 2.4cqw; background: #fff59d; color: #3b3200; font-family: var(--font-display); box-shadow: 0 1.4cqw 3cqw rgba(0, 0, 0, .45); transform: translate(-50%, -50%) rotate(2deg); }
.fg-card[data-card="note"]::before { content: ""; position: absolute; left: 38%; top: -1cqw; width: 8cqw; height: 2cqw; background: rgba(255, 255, 255, .55); transform: rotate(-3deg); }
.fg-card[data-card="news"] { padding: 2.4cqw; background: #f3f0e8; color: #111; font-family: var(--font-display); border-top: .6cqw double #111; box-shadow: 0 2cqw 5cqw rgba(0, 0, 0, .55); }
.fg-card[data-card="news"] .fg-card-head { font-size: 2.6cqw; font-weight: 900; letter-spacing: .3em; border-bottom: 1px solid #111; margin-bottom: 1cqw; }
.fg-card[data-card="terminal"] { padding: 2cqw; border-radius: .8cqw; background: rgba(4, 16, 8, .92); color: #67ff9a; font-family: "JetBrains Mono", "Cascadia Code", monospace; box-shadow: 0 0 3cqw rgba(60, 255, 140, .25), inset 0 0 2cqw rgba(60, 255, 140, .08); text-shadow: 0 0 .6cqw rgba(60, 255, 140, .7); }
.fg-card[data-card="terminal"] .fg-card-body::after { content: "▌"; animation: fg-pulse 1s steps(2) infinite; }
.fg-card[data-card="notice"], .fg-card[data-card="scroll"] { padding: 3cqw; background: linear-gradient(90deg, #c9a46a, #f1dcae 8%, #f6e7c4 50%, #f1dcae 92%, #c9a46a); color: #3a2410; font-family: var(--font-display); text-align: center; box-shadow: 0 2cqw 5cqw rgba(0, 0, 0, .55); }
.fg-card[data-card="notice"]::after { content: "印"; position: absolute; right: 2cqw; bottom: 1.4cqw; width: 4cqw; height: 4cqw; border: .25cqw solid #b3261e; color: #b3261e; display: grid; place-items: center; font-size: 2cqw; transform: rotate(-12deg); animation: fg-stamp .4s .5s cubic-bezier(.3, 1.6, .5, 1) both; }
@keyframes fg-stamp { from { opacity: 0; transform: scale(2.2) rotate(-12deg); } }

/* ── 选项 ── */
.fg-choices { position: absolute; inset: 0; z-index: 26; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1.3cqw; background: radial-gradient(70% 60% at 50% 45%, rgba(0, 0, 0, .25), rgba(0, 0, 0, .6)); animation: fg-fade-in .4s ease both; }
.fg-choices-title { font-family: var(--font-latin); letter-spacing: .6em; font-size: 1.05cqw; color: var(--ink-dim); margin-bottom: .6cqw; }
.fg-choice { position: relative; width: 46cqw; padding: 1.25cqw 2.4cqw 1.25cqw 6cqw; text-align: left; font-size: 1.7cqw; letter-spacing: .08em; border-radius: 99px; background: var(--box-bg); border: 1px solid var(--box-border); backdrop-filter: var(--box-blur); box-shadow: 0 .8cqw 2.4cqw rgba(0, 0, 0, .35); transition: transform .25s cubic-bezier(.2, .8, .2, 1), border-color .25s, box-shadow .25s; animation: fg-choice-in .55s cubic-bezier(.2, .8, .2, 1) both; animation-delay: calc(var(--i) * 90ms + 150ms); overflow: hidden; }
.fg-choice::before { content: attr(data-n); position: absolute; left: 2.2cqw; top: 50%; transform: translateY(-50%); font-family: var(--font-latin); font-size: 1.5cqw; font-weight: 700; color: var(--accent); letter-spacing: .1em; }
.fg-choice::after { content: ""; position: absolute; inset: 0; background: linear-gradient(100deg, transparent 30%, rgba(255, 255, 255, .16) 50%, transparent 70%); transform: translateX(-100%); transition: transform .6s ease; }
.fg-choice:hover { transform: translateX(1.2cqw) scale(1.02); border-color: var(--accent); box-shadow: 0 0 2.4cqw color-mix(in oklab, var(--accent) 45%, transparent); }
.fg-choice:hover::after { transform: translateX(100%); }
@keyframes fg-choice-in { from { opacity: 0; transform: translateY(1.4cqw); } }
.fg-free { display: flex; gap: .8cqw; width: 46cqw; animation: fg-choice-in .55s cubic-bezier(.2, .8, .2, 1) both; animation-delay: calc(var(--i) * 90ms + 150ms); }
.fg-free input { flex: 1; min-width: 0; padding: 1cqw 1.8cqw; font: inherit; font-size: 1.45cqw; color: var(--ink); border-radius: 99px; border: 1px dashed var(--box-border); background: rgba(0, 0, 0, .35); outline: none; user-select: text; }
.fg-free input:focus { border-color: var(--accent); border-style: solid; }
.fg-free button { padding: 0 2cqw; border-radius: 99px; background: linear-gradient(100deg, var(--accent), var(--accent2)); font-size: 1.4cqw; font-weight: 700; letter-spacing: .2em; color: #fff; }

/* ── 标题画面 ── */
.fg-title { position: absolute; inset: 0; z-index: 50; display: flex; flex-direction: column; justify-content: center; padding-left: 8%; background: linear-gradient(90deg, rgba(4, 4, 14, .86) 0%, rgba(4, 4, 14, .55) 42%, transparent 75%); animation: fg-fade-in 1s ease both; }
.fg-title-kicker { font-family: var(--font-latin); font-size: 1.1cqw; letter-spacing: .7em; color: var(--accent3); text-transform: uppercase; animation: fg-slide-in 1s .2s ease both; }
.fg-title-logo { font-family: var(--font-display); font-weight: 900; font-size: 6cqw; line-height: 1.15; letter-spacing: .12em; margin: 1cqw 0 .6cqw; background: linear-gradient(100deg, #fff 10%, var(--accent) 45%, var(--accent2) 70%, var(--accent3)); -webkit-background-clip: text; background-clip: text; color: transparent; filter: drop-shadow(0 0 2.4cqw color-mix(in oklab, var(--accent2) 60%, transparent)); animation: fg-logo-in 1.4s .3s cubic-bezier(.2, .8, .2, 1) both; max-width: 60cqw; }
.fg-title-sub { font-size: 1.2cqw; letter-spacing: .3em; color: var(--ink-dim); margin-bottom: 3.4cqw; animation: fg-slide-in 1s .6s ease both; }
.fg-title-menu { display: flex; flex-direction: column; gap: .4cqw; align-items: flex-start; }
.fg-title-menu button { font-family: var(--font-display); font-size: 1.75cqw; letter-spacing: .3em; padding: .45cqw 0; color: var(--ink-dim); position: relative; transition: color .2s, letter-spacing .3s, padding .3s; animation: fg-slide-in .8s ease both; animation-delay: calc(var(--i) * 80ms + 800ms); }
.fg-title-menu button span { font-family: var(--font-latin); font-size: .9cqw; letter-spacing: .4em; margin-left: 1.2cqw; opacity: .55; }
.fg-title-menu button.is-new { color: var(--ink); }
.fg-title-menu button.is-new::after { content: "NEW"; position: absolute; top: .2cqw; right: -3.4cqw; padding: .1cqw .5cqw; border-radius: 99px; font-family: var(--font-latin); font-size: .7cqw; letter-spacing: .12em; color: #fff; background: linear-gradient(100deg, var(--accent), var(--accent2)); animation: fg-pulse 1.6s ease-in-out infinite; }
.fg-title-menu button:hover { color: #fff; letter-spacing: .42em; padding-left: 1.6cqw; }
.fg-title-menu button:hover::before { content: ""; position: absolute; left: 0; top: 50%; width: .9cqw; height: .9cqw; transform: translateY(-50%) rotate(45deg); background: var(--accent); box-shadow: 0 0 1cqw var(--accent); }
.fg-title-foot { position: absolute; left: 8%; bottom: 5%; font-size: .85cqw; letter-spacing: .2em; color: rgba(255, 255, 255, .35); }
@keyframes fg-logo-in { from { opacity: 0; letter-spacing: .5em; filter: blur(10px); } }
@keyframes fg-slide-in { from { opacity: 0; transform: translateX(-1.6cqw); } }

/* ── 面板（回想 / 鉴赏 / 人物志 / 设置） ── */
.fg-panel { position: absolute; inset: 0; z-index: 60; display: flex; flex-direction: column; background: linear-gradient(135deg, rgba(8, 6, 22, .94), rgba(16, 10, 34, .92)); backdrop-filter: blur(16px); animation: fg-panel-in .35s cubic-bezier(.2, .8, .2, 1) both; user-select: text; }
@keyframes fg-panel-in { from { opacity: 0; transform: scale(1.02); } }
.fg-panel-head { display: flex; align-items: center; gap: 1.4cqw; padding: 2.2cqw 3cqw 1.2cqw; }
.fg-panel-title { font-family: var(--font-display); font-size: 2.4cqw; font-weight: 700; letter-spacing: .24em; }
.fg-panel-en { font-family: var(--font-latin); font-size: 1cqw; letter-spacing: .5em; color: var(--accent); text-transform: uppercase; }
.fg-panel-head .fg-spacer { flex: 1; }
.fg-panel-body { position: relative; flex: 1; overflow: auto; padding: 0 3cqw 2.4cqw; scrollbar-width: thin; scrollbar-color: var(--accent2) transparent; }
.fg-tabs { display: flex; gap: .4cqw; padding: 0 3cqw 1cqw; flex-wrap: wrap; }
.fg-tab { padding: .55cqw 1.4cqw; border-radius: 99px; font-size: 1.05cqw; letter-spacing: .12em; color: var(--ink-dim); border: 1px solid transparent; }
.fg-tab.is-on { color: #fff; border-color: var(--box-border); background: linear-gradient(100deg, color-mix(in oklab, var(--accent) 35%, transparent), color-mix(in oklab, var(--accent2) 35%, transparent)); }

.fg-log-item { display: grid; grid-template-columns: 9cqw 1fr; gap: 1.4cqw; padding: 1cqw 0; border-bottom: 1px solid rgba(255, 255, 255, .06); cursor: pointer; font-size: 1.35cqw; line-height: 1.7; }
.fg-log-item:hover { background: linear-gradient(90deg, rgba(255, 255, 255, .04), transparent); }
.fg-log-name { font-family: var(--font-display); font-weight: 700; text-align: right; letter-spacing: .1em; }
.fg-log-turn { grid-column: 1 / -1; font-family: var(--font-latin); font-size: .95cqw; letter-spacing: .5em; color: var(--accent); padding-top: 1.4cqw; }
.fg-log-scene { grid-column: 1 / -1; display: flex; align-items: center; gap: 1cqw; font-size: .9cqw; letter-spacing: .3em; color: var(--ink-dim); padding: .6cqw 0 .2cqw; }
.fg-log-scene::before, .fg-log-scene::after { content: ""; flex: 1; height: 1px; background: linear-gradient(90deg, transparent, rgba(255, 255, 255, .18), transparent); }

/* 导演日志：左边历次记录，右边详情（实时输出 / 整理结果 / 原始输出 / 提示词）。两栏各自滚动。 */
.fg-dlog { display: grid; grid-template-columns: 22cqw minmax(0, 1fr); gap: 2cqw; height: 100%; }
.fg-dlog-side, .fg-dlog-detail { min-height: 0; overflow: auto; scrollbar-width: thin; scrollbar-color: var(--accent2) transparent; }
.fg-dlog-side { display: flex; flex-direction: column; gap: .6cqw; padding-right: .4cqw; }
.fg-dlog-detail { padding-right: .6cqw; }
.fg-dlog-row { display: block; width: 100%; flex: none; text-align: left; padding: 1cqw 1.2cqw; border-radius: .8cqw; border: 1px solid var(--box-border); background: rgba(255, 255, 255, .03); transition: background .2s, border-color .2s; }
.fg-dlog-row:hover { background: rgba(255, 255, 255, .07); }
.fg-dlog-row.is-on { border-color: var(--accent); background: linear-gradient(100deg, color-mix(in oklab, var(--accent) 18%, transparent), color-mix(in oklab, var(--accent2) 8%, transparent)); }
.fg-dlog-row-head { display: flex; align-items: center; justify-content: space-between; gap: .6cqw; font-size: 1.15cqw; letter-spacing: .08em; }
.fg-dlog-row-meta { margin-top: .3cqw; font-size: .85cqw; color: var(--ink-dim); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.fg-dlog-row-sum { margin-top: .4cqw; font-size: .95cqw; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.fg-dlog-status { padding: .1cqw .7cqw; border-radius: 99px; border: 1px solid currentColor; font-size: .8cqw; letter-spacing: .1em; white-space: nowrap; }
.fg-dlog-status.is-running { color: var(--accent); animation: fg-pulse 1.4s ease-in-out infinite; }
.fg-dlog-status.is-ok { color: #6ef0a8; }
.fg-dlog-status.is-failed { color: #ff8a8a; }
.fg-dlog-status.is-cancelled { color: var(--ink-dim); }
.fg-dlog-head { padding: 1.2cqw 1.4cqw; border-radius: 1cqw; background: rgba(255, 255, 255, .035); border: 1px solid var(--box-border); }
.fg-dlog-title { display: flex; align-items: center; gap: 1cqw; margin-bottom: .8cqw; font-family: var(--font-display); font-size: 1.7cqw; letter-spacing: .16em; }
.fg-dlog-title .fg-spacer, .fg-dlog-label .fg-spacer { flex: 1; }
.fg-dlog-facts { display: grid; grid-template-columns: repeat(auto-fill, minmax(30cqw, 1fr)); gap: .3cqw 2cqw; font-size: 1cqw; line-height: 1.6; }
.fg-dlog-facts i { margin-right: .8cqw; font-style: normal; color: var(--ink-dim); letter-spacing: .08em; }
.fg-dlog-notice { margin-top: .6cqw; font-size: .95cqw; color: #ffd27a; }
.fg-dlog-error { margin: .6cqw 0; font-size: 1cqw; white-space: pre-wrap; word-break: break-word; }
.fg-dlog-tabs { padding: 1.2cqw 0 .4cqw; }
.fg-dlog-block { margin: 1cqw 0; }
.fg-dlog-label { display: flex; align-items: center; gap: .8cqw; margin-bottom: .5cqw; font-size: .95cqw; letter-spacing: .12em; color: var(--accent); }
.fg-btn.is-mini { padding: .2cqw .9cqw; font-size: .85cqw; white-space: nowrap; }
.fg-dlog-pre { margin: 0; max-height: 34cqw; overflow: auto; padding: 1cqw 1.2cqw; border-radius: .8cqw; background: rgba(0, 0, 0, .42); border: 1px solid var(--box-border); font-family: "JetBrains Mono", Consolas, monospace; font-size: .95cqw; line-height: 1.6; white-space: pre-wrap; word-break: break-word; color: var(--ink); scrollbar-width: thin; }
.fg-dlog-pre.has-cursor::after { content: "▍"; color: var(--accent); animation: fg-pulse 1s steps(2) infinite; }
.fg-dlog-meter { display: flex; align-items: center; gap: .8cqw; margin: .4cqw 0; font-size: 1cqw; color: var(--ink-dim); }
.fg-dlog-dot { width: .8cqw; height: .8cqw; border-radius: 50%; background: var(--accent); box-shadow: 0 0 1cqw var(--accent); animation: fg-pulse 1s ease-in-out infinite; }
.fg-dlog-think summary { margin: .4cqw 0; cursor: pointer; font-size: .95cqw; color: var(--ink-dim); }
.fg-dlog-chips { display: flex; flex-wrap: wrap; gap: .5cqw; }
.fg-dlog-chip { display: inline-flex; align-items: center; gap: .5cqw; padding: .2cqw .8cqw; border-radius: 99px; font-size: .9cqw; background: rgba(255, 255, 255, .06); border: 1px solid var(--box-border); }
.fg-dlog-chip i { font-style: normal; font-size: .8cqw; color: var(--ink-dim); }
.fg-dlog-lines { border-radius: .8cqw; border: 1px solid var(--box-border); overflow: hidden; }
.fg-dlog-line { display: grid; grid-template-columns: 4cqw minmax(0, 1fr) minmax(0, 24cqw); gap: 1.2cqw; align-items: start; padding: .7cqw 1cqw; border-bottom: 1px solid rgba(255, 255, 255, .06); font-size: 1cqw; line-height: 1.6; }
.fg-dlog-line:last-child { border-bottom: 0; }
.fg-dlog-line.is-plain { opacity: .6; }
.fg-dlog-line.is-skipped { opacity: .42; }
.fg-dlog-line.is-skipped .fg-dlog-utext { text-decoration: line-through; text-decoration-color: rgba(255, 255, 255, .35); }
.fg-dlog-uid { padding-top: .15cqw; font-family: var(--font-latin); font-size: .85cqw; letter-spacing: .1em; color: var(--accent); }
.fg-dlog-card { margin-bottom: .6cqw; padding: .8cqw 1cqw; border-radius: .8cqw; background: rgba(255, 255, 255, .035); border: 1px solid var(--box-border); font-size: 1cqw; line-height: 1.6; }
.fg-dlog-mono { margin-top: .4cqw; font-family: "JetBrains Mono", Consolas, monospace; font-size: .9cqw; word-break: break-word; }
.fg-dlog-k { display: inline-block; margin-right: .6cqw; padding: 0 .5cqw; border-radius: .3cqw; font-style: normal; font-family: var(--font-body); font-size: .8cqw; letter-spacing: .08em; color: var(--ink-dim); border: 1px solid var(--box-border); }
.fg-dlog-cgchar { margin-top: .4cqw; padding-left: .8cqw; border-left: 2px solid var(--box-border); }
.fg-dlog-list-plain { margin: 0; padding-left: 2cqw; font-size: 1.05cqw; line-height: 1.8; }
.fg-pill.is-link { cursor: pointer; transition: border-color .2s, opacity 1.2s; }
/* 配乐留白：曲名暗下去，回来时再亮 */
.fg-pill.is-hushed { opacity: .35; transition-duration: .5s; }
.fg-pill.is-link:hover { border-color: var(--accent); }

.fg-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(20cqw, 1fr)); gap: 1.4cqw; }
.fg-thumb { position: relative; aspect-ratio: 16 / 10; border-radius: 1cqw; overflow: hidden; background: rgba(255, 255, 255, .04); border: 1px solid var(--box-border); cursor: zoom-in; transition: transform .25s, box-shadow .25s; }
.fg-thumb:hover { transform: translateY(-.4cqw); box-shadow: 0 1cqw 3cqw rgba(0, 0, 0, .5), 0 0 0 1px var(--accent); }
.fg-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
.fg-thumb-cap { position: absolute; left: 0; right: 0; bottom: 0; padding: 2cqw 1cqw .7cqw; font-size: 1cqw; letter-spacing: .1em; background: linear-gradient(transparent, rgba(0, 0, 0, .75)); }
.fg-thumb.is-locked { cursor: default; display: grid; place-items: center; color: var(--ink-dim); font-size: 1cqw; background: repeating-linear-gradient(45deg, rgba(255, 255, 255, .03) 0 1cqw, transparent 1cqw 2cqw); }

.fg-person { display: grid; grid-template-columns: 13cqw 1fr; gap: 2cqw; padding: 1.6cqw; margin-bottom: 1.4cqw; border-radius: 1.2cqw; background: rgba(255, 255, 255, .035); border: 1px solid var(--box-border); }
.fg-track { display: grid; grid-template-columns: 4.2cqw 1fr; gap: 1.4cqw; padding: 1.2cqw 1.4cqw; margin-bottom: 1cqw; border-radius: 1cqw; background: rgba(255, 255, 255, .035); border: 1px solid var(--box-border); }
.fg-track-body { display: grid; gap: .6cqw; min-width: 0; }
.fg-track-play { width: 4.2cqw; height: 4.2cqw; border-radius: 50%; border: 1px solid var(--box-border); background: rgba(0, 0, 0, .3); color: var(--ink); font-size: 1.3cqw; cursor: pointer; transition: background .2s, border-color .2s, box-shadow .2s; }
.fg-track-play:hover { border-color: var(--accent); }
.fg-track-play.is-on { background: var(--accent); border-color: var(--accent); color: #111; box-shadow: 0 0 1.4cqw color-mix(in oklab, var(--accent) 55%, transparent); }
.fg-track-desc { min-height: 4.6cqw; font-family: var(--font-body); font-size: 1.05cqw; }
.fg-libgroup { margin-bottom: .6cqw; }
.fg-libgroup-head { padding: .5cqw .8cqw; border-radius: .8cqw; background: rgba(255, 255, 255, .03); border: 1px solid var(--box-border); }
.fg-libgroup-head + .fg-track, .fg-libgroup-head + .fg-note { margin-top: .8cqw; }
.fg-libsound { padding: .8cqw 1.2cqw; margin-bottom: .6cqw; }
.fg-libsound-tags { overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.fg-person-art { position: relative; height: 19cqw; border-radius: .8cqw; overflow: hidden; background: radial-gradient(circle at 50% 30%, color-mix(in oklab, var(--c) 40%, transparent), rgba(0, 0, 0, .3)); }
.fg-person-art img { width: 100%; height: 100%; object-fit: cover; object-position: top; }
.fg-person-art .fg-silhouette { height: 100%; }
.fg-person h3 { margin: 0 0 .6cqw; font-family: var(--font-display); font-size: 2cqw; letter-spacing: .2em; display: flex; align-items: center; gap: 1cqw; }
.fg-person h3 small { font-family: var(--font-body); font-size: .9cqw; letter-spacing: .1em; padding: .2cqw .7cqw; border-radius: 99px; border: 1px solid var(--box-border); color: var(--ink-dim); }
.fg-emos { display: flex; flex-wrap: wrap; gap: .5cqw; margin: .8cqw 0; }
.fg-emo { position: relative; width: 5.4cqw; height: 6.6cqw; border-radius: .6cqw; overflow: hidden; border: 1px solid var(--box-border); background: rgba(0, 0, 0, .3); font-size: .78cqw; color: var(--ink-dim); cursor: pointer; transition: border-color .2s, transform .2s; }
.fg-emo img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: top; }
.fg-emo span { position: absolute; left: 0; right: 0; bottom: 0; padding: 1.4cqw .2cqw .3cqw; line-height: 1.2; text-align: center; text-shadow: 0 1px 3px #000; background: linear-gradient(transparent, rgba(0, 0, 0, .78) 70%); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.fg-emo.is-busy::after { content: ""; position: absolute; inset: 0; background: linear-gradient(100deg, transparent 20%, rgba(255, 255, 255, .25), transparent 80%); background-size: 200% 100%; animation: fg-skeleton 1.2s linear infinite; }
.fg-emo:hover { border-color: var(--accent); transform: translateY(-.2cqw); }
.fg-emo.is-on { border-color: var(--accent); box-shadow: 0 0 0 1px var(--accent), 0 0 1.2cqw color-mix(in oklab, var(--accent) 45%, transparent); }
.fg-emo.is-custom { border-style: dashed; }
.fg-emo.is-custom span { color: var(--ink); }
.fg-person-main { min-width: 0; }
.fg-person-tags { font-family: "JetBrains Mono", Consolas, monospace; font-size: .9cqw; color: var(--ink-dim); line-height: 1.5; margin-bottom: .6cqw; word-break: break-word; }
.fg-person-folds .fg-btn.is-on, .fg-btn.is-on { border-color: var(--accent); background: color-mix(in oklab, var(--accent) 22%, transparent); }
.fg-person-form { margin: .8cqw 0; padding: 1cqw 1.2cqw; border-radius: .9cqw; background: rgba(0, 0, 0, .22); border: 1px solid var(--box-border); }
.fg-person-form .fg-field { grid-template-columns: 9cqw 1fr; }
.fg-textarea.is-short { min-height: 4cqw; }
/* 固定外貌按字段：两列格子，「其他」占一整行；人物卡片上每个字段一个小标签 */
.fg-look-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .6cqw .9cqw; }
.fg-look-field { display: flex; flex-direction: column; gap: .25cqw; }
.fg-look-field > span { font-size: .85cqw; color: var(--ink-dim); letter-spacing: .08em; }
.fg-look-field.is-wide { grid-column: 1 / -1; }
.fg-look-chip { display: inline-flex; gap: .35em; margin: 0 .35cqw .35cqw 0; padding: .1cqw .55cqw; border-radius: 99px; background: rgba(255, 255, 255, .07); border: 1px solid rgba(255, 255, 255, .1); }
.fg-look-chip i { font-style: normal; opacity: .55; }
.fg-cg-chars { display: grid; gap: .9cqw; margin: .9cqw 0 .9cqw 15.2cqw; }
.fg-cg-char { display: grid; gap: .6cqw; padding: 1cqw; border-radius: .9cqw; border: 1px solid var(--box-border); background: rgba(0, 0, 0, .18); }
.fg-sent { user-select: text; margin-top: .4cqw; display: grid; gap: .3cqw; word-break: break-word; }
.fg-wardrobe { display: grid; gap: .5cqw; margin-bottom: .6cqw; }
.fg-outfit { display: grid; grid-template-columns: 8cqw 1fr auto auto; gap: .7cqw; align-items: center; padding: .4cqw .6cqw; border-radius: .7cqw; border: 1px solid transparent; }
.fg-outfit b { font-size: 1.1cqw; letter-spacing: .1em; }
.fg-outfit.is-on { border-color: color-mix(in oklab, var(--accent) 60%, transparent); background: color-mix(in oklab, var(--accent) 10%, transparent); }
.fg-outfit.is-new { grid-template-columns: 8cqw 1fr auto; }
.fg-state { display: inline-flex; align-items: center; gap: .4cqw; padding: .3cqw .5cqw .3cqw .9cqw; border-radius: 99px; font-size: 1cqw; background: color-mix(in oklab, var(--accent2) 22%, transparent); border: 1px solid color-mix(in oklab, var(--accent2) 55%, transparent); }
.fg-state button { width: 1.5cqw; height: 1.5cqw; border-radius: 50%; font-size: .8cqw; color: var(--ink-dim); }
.fg-state button:hover { color: #fff; background: rgba(255, 255, 255, .15); }
.fg-spans { display: flex; flex-direction: column; gap: .5cqw; }
.fg-span { display: flex; align-items: center; gap: .6cqw; font-size: 1cqw; color: var(--ink-dim); }
.fg-span b { min-width: 9cqw; color: var(--ink); font-weight: 600; }
.fg-span .fg-input { text-align: center; padding-inline: .4cqw; }
.fg-looks { display: flex; flex-wrap: wrap; align-items: center; gap: .5cqw; margin-top: 1cqw; }
.fg-look { display: inline-flex; align-items: center; gap: .5cqw; padding: .45cqw 1.1cqw; border-radius: 99px; font-size: 1cqw; letter-spacing: .08em; border: 1px solid var(--box-border); color: var(--ink-dim); background: rgba(255, 255, 255, .04); }
.fg-look i { font-style: normal; font-size: .8cqw; padding: .05cqw .5cqw; border-radius: 99px; background: var(--accent); color: #111; }
.fg-look.is-on { color: #fff; border-color: var(--accent); background: color-mix(in oklab, var(--accent) 22%, transparent); }
.fg-variant { display: grid; grid-template-columns: 11cqw 1fr; gap: 1.4cqw; margin: .4cqw 0 1cqw; padding: 1cqw; border-radius: .9cqw; background: rgba(0, 0, 0, .25); border: 1px solid color-mix(in oklab, var(--accent) 45%, var(--box-border)); animation: fg-pop .25s ease-out; }
.fg-variant-art { height: 15cqw; border-radius: .7cqw; overflow: hidden; display: grid; place-items: center; font-size: 1cqw; color: var(--ink-dim); background: repeating-conic-gradient(rgba(255, 255, 255, .05) 0 25%, transparent 0 50%) 0 0 / 1.4cqw 1.4cqw; }
.fg-variant-art img { width: 100%; height: 100%; object-fit: contain; object-position: top; }
.fg-row > .fg-spacer, .fg-looks > .fg-spacer { flex: 1; }
/* 管理立绘：格子多选、批量删除 */
.fg-manage { margin: .4cqw 0; padding: .6cqw 1cqw; border-radius: .8cqw; background: rgba(0, 0, 0, .25); border: 1px dashed var(--box-border); }
.fg-emo.is-picked { border-color: #ff6b6b; box-shadow: 0 0 0 2px #ff6b6b; }
.fg-emo.is-picked::before { content: "✓"; position: absolute; top: .3cqw; right: .3cqw; z-index: 1; width: 1.4cqw; height: 1.4cqw; border-radius: 50%; background: #ff6b6b; color: #111; font-size: .9cqw; line-height: 1.4cqw; text-align: center; }
.fg-emo:disabled { opacity: .35; cursor: default; transform: none; }
.fg-btn.fg-danger:not(:disabled) { border-color: #ff6b6b; color: #ffb3b3; }
/* 逆转式立绘工作台：左边勾差分，右边框眼睛和嘴、看效果 */
.fg-aa-bench { padding: 1.4cqw; border-radius: 1.2cqw; background: rgba(255, 255, 255, .035); border: 1px solid var(--box-border); }
.fg-aa-grid { display: grid; grid-template-columns: 24cqw 1fr; gap: 1.6cqw; margin-top: 1cqw; }
.fg-aa-list { display: flex; flex-direction: column; gap: .5cqw; max-height: 44cqw; overflow: auto; padding-right: .4cqw; scrollbar-width: thin; }
.fg-aa-item { display: grid; grid-template-columns: auto 4cqw 1fr; align-items: center; gap: .7cqw; padding: .4cqw .6cqw; border-radius: .7cqw; border: 1px solid var(--box-border); background: rgba(0, 0, 0, .22); cursor: pointer; }
.fg-aa-item.is-on { border-color: var(--accent); background: color-mix(in oklab, var(--accent) 16%, rgba(0, 0, 0, .3)); }
.fg-aa-item img { width: 4cqw; height: 5cqw; object-fit: cover; object-position: top; border-radius: .4cqw; }
.fg-aa-item b { display: block; font-size: 1cqw; }
.fg-aa-item small { display: block; font-size: .8cqw; color: var(--ink-dim); }
.fg-aa-stage { min-width: 0; display: flex; flex-direction: column; gap: .7cqw; }
.fg-aa-frame, .fg-aa-play { position: relative; width: 100%; height: 34cqw; border-radius: .8cqw; overflow: hidden; background: repeating-conic-gradient(rgba(255, 255, 255, .06) 0 25%, transparent 0 50%) 0 0 / 1.4cqw 1.4cqw; }
.fg-aa-frame { touch-action: none; user-select: none; }
.fg-aa-box rect { fill: rgba(255, 255, 255, .1); stroke: currentColor; stroke-width: 2; vector-effect: non-scaling-stroke; cursor: move; }
.fg-aa-box rect.fg-aa-handle { fill: currentColor; cursor: nwse-resize; }
.fg-aa-box.is-eyes { color: #5fd3ff; }
.fg-aa-box.is-mouth { color: #ff8ad8; }
.fg-aa-box.is-face { color: #ffd166; }
.fg-face-info { gap: .6cqw; margin: .4cqw 0; }
.fg-face-editor { margin: .6cqw 0; }
.fg-face-editor .fg-aa-frame { height: 28cqw; }
/* 动作与表情设计：一个动作一块，块里每个情绪一行（名字、归哪个动作、他的这种表情） */
.fg-acting { display: grid; gap: .7cqw; }
.fg-acting .fg-field { grid-template-columns: 9cqw 1fr; }
.fg-acting-pose { display: grid; gap: .45cqw; padding: .8cqw; border-radius: .8cqw; background: rgba(255, 255, 255, .04); border: 1px solid var(--box-border); }
.fg-acting-head { display: flex; align-items: center; gap: .6cqw; }
.fg-acting-emo { display: grid; grid-template-columns: 9cqw 11cqw 1fr 1fr 6cqw; gap: .5cqw; align-items: center; font-size: .95em; }
.fg-acting-emo b { font-weight: 600; letter-spacing: .04em; }
.fg-acting-emo b i { font-style: normal; font-size: .75em; margin-left: .4em; padding: .05em .45em; border-radius: 99px; background: var(--accent); color: #111; }
.fg-pose-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: .8cqw; width: 100%; }
.fg-pose-col { display: flex; flex-direction: column; gap: .3cqw; padding: .6cqw; border-radius: .6cqw; background: rgba(255, 255, 255, .05); }
.fg-pose-item { display: flex; align-items: center; justify-content: space-between; gap: .4cqw; font-size: .92em; }
.fg-pose-item i { opacity: .7; font-style: normal; }
.fg-pose-item select { max-width: 50%; }
.fg-aa-box text { fill: currentColor; paint-order: stroke; stroke: rgba(0, 0, 0, .75); stroke-width: 3px; pointer-events: none; }
.fg-aa-play > canvas, .fg-aa-play > img { position: absolute; left: 50%; top: 0; height: 100%; width: auto; transform: translateX(-50%); }
.fg-aa-play.is-close { width: 34cqw; height: auto; aspect-ratio: 1; align-self: center; }
.fg-aa-play.is-close canvas, .fg-aa-play.is-close img { display: block; width: 100%; height: auto; }
.fg-aa-states { display: grid; grid-template-columns: repeat(3, 1fr); gap: .8cqw; }
.fg-aa-state { display: flex; flex-direction: column; align-items: center; gap: .3cqw; font-size: .9cqw; }
.fg-aa-thumb { width: 100%; height: auto; border-radius: .5cqw; background: repeating-conic-gradient(rgba(255, 255, 255, .06) 0 25%, transparent 0 50%) 0 0 / 1cqw 1cqw; }
.fg-aa-actions { margin-top: 1.2cqw; }
/* 自动框：认脸模型条、列表里的结果标记 */
.fg-aa-vision { display: grid; gap: .5cqw; margin-top: .9cqw; padding: .7cqw 1cqw; border-radius: .8cqw; background: rgba(0, 0, 0, .2); border: 1px solid var(--box-border); font-size: .95cqw; }
.fg-aa-vision select { font: inherit; color: var(--ink); background: rgba(0, 0, 0, .35); border: 1px solid var(--box-border); border-radius: .4cqw; padding: .1cqw .4cqw; }
.fg-aa-vision progress { flex: 1; min-width: 10cqw; height: .7cqw; accent-color: var(--accent); }
.fg-aa-vision .fg-check { display: inline-flex; align-items: center; gap: .4cqw; cursor: pointer; }
.fg-aa-badge { margin-left: .5cqw; padding: 0 .5cqw; border-radius: 99px; font-style: normal; font-size: .75cqw; font-weight: normal; vertical-align: middle; }
.fg-aa-badge.is-ok { background: rgba(110, 240, 168, .2); color: #6ef0a8; }
.fg-aa-badge.is-warn { background: rgba(255, 210, 110, .2); color: #ffd26e; }
.fg-aa-badge.is-bad { background: rgba(255, 138, 138, .2); color: #ff8a8a; }
/* 人物志里的立绘小图：做过逆转式动态的直接动；点一下放大 */
.fg-sprite-art { position: relative; display: block; width: 100%; height: 100%; padding: 0; border: 0; background: none; cursor: zoom-in; }
.fg-sprite-art img, .fg-sprite-art canvas { display: block; width: 100%; height: 100%; object-fit: cover; object-position: top; }
.fg-variant-art .fg-sprite-art img, .fg-variant-art .fg-sprite-art canvas { object-fit: contain; }
.fg-sprite-art i { position: absolute; top: .4cqw; left: .4cqw; padding: .05cqw .5cqw; border-radius: 99px; font-style: normal; font-size: .8cqw; background: var(--accent); color: #111; }
.fg-sprite-art span { position: absolute; right: .4cqw; bottom: .4cqw; font-size: 1cqw; opacity: 0; transition: opacity .2s; text-shadow: 0 1px 3px #000; }
.fg-sprite-art:hover span { opacity: 1; }
/* 放大看立绘 */
.fg-viewer-stage { display: flex; align-items: center; justify-content: center; max-width: 92%; height: min(46cqw, 76cqh); }
.fg-viewer-stage > img { max-width: 100%; max-height: 100%; object-fit: contain; box-shadow: 0 0 6cqw rgba(0, 0, 0, .8); }
.fg-aa-play.is-big { width: 60cqw; height: min(46cqw, 76cqh); background: none; }
.fg-aa-play.is-big.is-close { width: min(46cqw, 76cqh); height: auto; aspect-ratio: 1; }
.fg-variant-body { display: grid; gap: .6cqw; align-content: start; min-width: 0; }
.fg-variant-body b { font-size: 1.15cqw; letter-spacing: .08em; }
.fg-emotion-row { display: grid; grid-template-columns: 12cqw 1fr 9cqw auto auto; gap: .8cqw; align-items: center; padding: .6cqw 0; border-bottom: 1px solid rgba(255, 255, 255, .05); }
.fg-emotion-row b { font-size: 1.15cqw; letter-spacing: .06em; }
.fg-emotion-row.is-new { grid-template-columns: 12cqw 1fr 9cqw auto; border-bottom: 0; margin-top: .6cqw; }
.fg-chip small { margin-left: .3em; opacity: .55; font-size: .85em; }

/* 表单 */
.fg-field { display: grid; grid-template-columns: 14cqw 1fr; gap: 1.2cqw; align-items: center; margin: .9cqw 0; font-size: 1.1cqw; }
.fg-field > label { color: var(--ink-dim); letter-spacing: .08em; }
.fg-field small { grid-column: 2; color: var(--ink-dim); font-size: .9cqw; margin-top: -.6cqw; }
.fg-input, .fg-select, .fg-textarea { width: 100%; padding: .7cqw 1cqw; font: inherit; font-size: 1.1cqw; color: var(--ink); background: rgba(0, 0, 0, .35); border: 1px solid var(--box-border); border-radius: .6cqw; outline: none; }
.fg-select option { background: #14122a; }
.fg-textarea { min-height: 7cqw; resize: vertical; line-height: 1.5; font-family: "JetBrains Mono", Consolas, monospace; font-size: 1cqw; }
.fg-input:focus, .fg-select:focus, .fg-textarea:focus { border-color: var(--accent); }
.fg-btn { display: inline-flex; align-items: center; gap: .5cqw; padding: .6cqw 1.4cqw; border-radius: 99px; font-size: 1.05cqw; letter-spacing: .1em; border: 1px solid var(--box-border); background: rgba(255, 255, 255, .05); transition: background .2s, border-color .2s; }
.fg-btn:hover { background: rgba(255, 255, 255, .12); border-color: var(--accent); }
.fg-btn.is-primary { background: linear-gradient(100deg, var(--accent), var(--accent2)); border-color: transparent; color: #fff; font-weight: 700; }
.fg-btn[disabled] { opacity: .45; pointer-events: none; }
.fg-row { display: flex; gap: .8cqw; flex-wrap: wrap; align-items: center; }
.fg-switch { position: relative; width: 3.4cqw; height: 1.9cqw; border-radius: 99px; background: rgba(255, 255, 255, .14); transition: background .2s; }
.fg-switch::after { content: ""; position: absolute; left: .25cqw; top: .25cqw; width: 1.4cqw; height: 1.4cqw; border-radius: 50%; background: #fff; transition: transform .25s cubic-bezier(.3, 1.4, .5, 1); }
.fg-switch.is-on { background: linear-gradient(100deg, var(--accent), var(--accent2)); }
.fg-switch.is-on::after { transform: translateX(1.5cqw); }
.fg-note { font-size: .95cqw; color: var(--ink-dim); line-height: 1.6; }
.fg-ok { color: #6ef0a8; } .fg-err { color: #ff8a8a; }
.fg-section { margin: 1.6cqw 0 .6cqw; font-family: var(--font-display); font-size: 1.4cqw; letter-spacing: .2em; display: flex; align-items: center; gap: .8cqw; }
.fg-section::after { content: ""; flex: 1; height: 1px; background: linear-gradient(90deg, var(--box-border), transparent); }
.fg-skins { display: grid; grid-template-columns: repeat(auto-fill, minmax(15cqw, 1fr)); gap: 1cqw; }
.fg-skin { padding: 1cqw; border-radius: 1cqw; border: 1px solid var(--box-border); text-align: left; transition: transform .2s; }
.fg-skin:hover { transform: translateY(-.3cqw); }
.fg-skin.is-on { box-shadow: 0 0 0 2px var(--accent); }
.fg-skin-swatch { height: 4cqw; border-radius: .6cqw; margin-bottom: .6cqw; }
.fg-skin b { display: block; font-size: 1.1cqw; letter-spacing: .1em; } .fg-skin span { font-size: .85cqw; color: var(--ink-dim); }
.fg-style { display: flex; flex-direction: column; min-width: 0; }
.fg-style > span { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; word-break: break-all; }
.fg-styles { grid-template-columns: repeat(auto-fill, minmax(12cqw, 1fr)); }
/* 样图是竖版（试画按竖版尺寸画），卡片封面也竖着放。 */
.fg-style-cover { display: grid; place-items: center; aspect-ratio: 832 / 1216; margin-bottom: .6cqw; border-radius: .6cqw; background: linear-gradient(160deg, rgba(255, 255, 255, .09), rgba(255, 255, 255, .02)) center top / cover no-repeat; font-size: .85cqw; color: var(--ink-dim); }
.fg-style-cover span { font-size: inherit; color: inherit; }
.fg-style.is-new .fg-style-cover { font-size: 3cqw; border: 1px dashed var(--box-border); background: none; }
.fg-sent i { opacity: .7; }

.fg-update-done { margin: .8cqw 0; padding: .9cqw 1.2cqw; border-radius: .8cqw; font-size: 1.05cqw; line-height: 1.6; color: #6ef0a8; background: rgba(110, 240, 168, .08); border: 1px solid rgba(110, 240, 168, .3); }
/* 文件更新了、DSH 还没重启：网页新、后台旧，提醒重启 */
.fg-restart { margin: 0 3cqw .8cqw; padding: .7cqw 1.1cqw; border-radius: .8cqw; font-size: 1cqw; line-height: 1.55; color: #ffd59a; background: rgba(217, 130, 43, .14); border: 1px solid rgba(217, 130, 43, .55); }
.fg-restart b { color: #fff0d6; }
.fg-restart.is-floating { position: absolute; top: 1.2cqw; left: 50%; transform: translateX(-50%); z-index: 40; width: max-content; max-width: 70cqw; margin: 0; background: rgba(40, 24, 8, .86); backdrop-filter: blur(6px); }
.fg-changes { margin: .4cqw 0 0 15.2cqw; border-radius: .8cqw; border: 1px solid var(--box-border); overflow: hidden; }
.fg-changes > div { display: grid; grid-template-columns: 6cqw 1fr auto; gap: 1cqw; padding: .6cqw 1cqw; font-size: 1cqw; line-height: 1.5; border-bottom: 1px solid rgba(255, 255, 255, .06); }
.fg-changes > div:last-child { border-bottom: 0; }
.fg-changes code, .fg-note code { font-family: "JetBrains Mono", Consolas, monospace; color: var(--accent); }
.fg-changes small { color: var(--ink-dim); white-space: nowrap; }

.fg-lightbox { position: fixed; inset: 0; width: 100vw; height: 100vh; height: 100dvh; z-index: 80; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1.2cqw; background: rgba(0, 0, 0, .9); animation: fg-fade-in .25s ease both; cursor: zoom-out; }
.fg-lightbox img { max-width: 92%; max-height: 82%; object-fit: contain; box-shadow: 0 0 6cqw rgba(0, 0, 0, .8); cursor: default; }
.fg-lightbox .fg-row { cursor: default; }

@keyframes fg-fade-in { from { opacity: 0; } }
@keyframes fg-fade-out { to { opacity: 0; } }
@keyframes fg-spin { to { transform: rotate(360deg); } }
@keyframes fg-pulse { 0%, 100% { opacity: 1; } 50% { opacity: .3; } }
@keyframes fg-skeleton { from { background-position: 200% 0; } to { background-position: -200% 0; } }
@keyframes fg-pop { from { opacity: 0; transform: translateY(-.4cqw); } to { opacity: 1; transform: none; } }

@media (prefers-reduced-motion: reduce) {
  .fg-bg-art, .fg-cg-img, .fg-cg-art, .fg-actor-body, .fg-box::before, .fg-sky::after, .fg-down-mist i { animation: none !important; }
  /* 换背景还是淡入淡出（只是不推拉、不模糊、不旋转），不会一下子跳过去 */
  .fg-bg.is-enter { animation: fg-fade-slow var(--enter-dur, 1.1s) ease both !important; }
  .fg-cover[data-cover="lids"]::before { display: none; }
  .fg-cover[data-cover="lids"] { background: #000; -webkit-backdrop-filter: none; backdrop-filter: none; }
  .fg-cover[data-cover="lids"][data-state="up"] { animation: fg-cover-up var(--ms) ease both; }
  .fg-cover[data-cover="lids"][data-state="down"] { animation: fg-cover-down var(--ms) ease both; }
  .fg-cover[data-cover="lids"][data-state="off"], .fg-cover[data-cover="lids"][data-state="idle"] { opacity: 0; }
  .fg-recall::after, .fg-recall-face { animation: none !important; } /* 闪回里的光斑漂移、心跳脉动、小头像错位 */
  .fg-romance::before, .fg-romance::after, .fg-sense::after, .fg-world-in[data-sense] .fg-cast { animation: none !important; } /* 光斑漂移、心跳暗角、耳边的呼吸、触碰的涟漪、失神的晃 */
  .fg-sense[data-v="heat"]::before, .fg-sense[data-v="touch"]::before, .fg-sense[data-v="scent"]::before { animation: none !important; }
  .fg-phone-card, .fg-phone-ripple, .fg-phone-key.is-accept, .fg-notify-wave i { animation: none !important; } /* 手机一震一震、声波跳 */
  .fg-dialog[data-recall] .fg-box, .fg-dialog[data-recall] .fg-box::after, .fg-dialog[data-recall] .fg-line, .fg-dialog[data-recall] .fg-name-plate { animation: none !important; } /* 闪回对话框里的光斑、脉动、抖动、名牌忽隐忽现 */
  .fg-dialog[data-recall] .fg-char { animation-name: fg-char-in !important; }
  .fg-flash.is-dread { animation: fg-bloom .6s ease-out both !important; } /* 撕裂闪烁换成淡入淡出 */
  .fg-cg-pan { animation: none !important; transform: scale(var(--r)); }
  .fg-cg:not(.is-leaving) { animation: fg-cg-fade-in .6s ease both !important; }
  .fg-cg.is-leaving { animation: fg-cg-fade-out .6s ease both !important; }
  .fg-cg::before { display: none; }
  .fg-camera[data-cam="whip"] { animation: none !important; }
  .fg-photo, .fg-cup, .fg-moment-card { animation: fg-fade-in .2s ease both !important; } /* 小瞬间：不飞、不弹，只淡入 */
  .fg-touch-ring, .fg-clink, .fg-fw-trail, .fg-fw-burst, .fg-steam i { animation: none !important; opacity: 0; }
  .fg-text[class*="say-"] .fg-char, .fg-char.is-stress, .fg-char[class*="tx-"] { animation: fg-char-in .22s ease forwards var(--d) !important; } /* 文字效果只留样子，不抖不晃 */
  .fg-text.is-done .fg-char { animation: none !important; opacity: 1; }
  .fg-text.is-wait .fg-char { animation: none !important; }
}
@container stage (max-aspect-ratio: 4/5) {
  .fg-bars[data-on]::before, .fg-bars[data-on]::after { height: 6%; }
  .fg-actor { width: calc(60% * var(--s, 1) * var(--d, 1)); height: calc(60% * var(--s, 1) * var(--d, 1)); bottom: calc(23% + var(--db, 0%)); }
  .fg-dialog { left: 3%; right: 3%; height: 22%; }
  .fg-recall-face { width: 17cqw; }
  .fg-phone { top: 16%; } .fg-phone-card { width: 34cqw; padding: 3cqw 2.6cqw; border-radius: 4cqw; }
  .fg-phone-label { font-size: 2.4cqw; } .fg-phone-label svg { width: 2.6cqw; height: 2.6cqw; }
  .fg-phone-avatar { width: 15cqw; height: 15cqw; margin: 2.4cqw auto 1.6cqw; } .fg-phone-face { font-size: 6.4cqw; }
  .fg-phone-name { font-size: 4.2cqw; } .fg-phone-keys { gap: 7cqw; margin-top: 2.6cqw; } .fg-phone-key { width: 8cqw; height: 8cqw; }
  .fg-phone-result { font-size: 2.8cqw; } .fg-phone-result i { width: 4cqw; height: 4cqw; }
  .fg-call-chip svg { width: 2.6cqw; height: 2.6cqw; } .fg-call-dot { width: 1.4cqw; height: 1.4cqw; }
  .fg-pip { width: 24cqw; top: 9%; border-radius: 2.4cqw; } .fg-pip-name { font-size: 2.4cqw; left: 1.6cqw; bottom: 1.4cqw; } .fg-pip-name i { width: 1.2cqw; height: 1.2cqw; }
  .fg-notify { width: 88cqw; top: 2.4%; padding: 2.2cqw 2.8cqw; gap: 2.2cqw; border-radius: 3.4cqw; }
  .fg-notify-icon { width: 8cqw; height: 8cqw; border-radius: 2cqw; font-size: 4cqw; }
  .fg-notify-head { font-size: 2.8cqw; } .fg-notify-head span { font-size: 2.4cqw; } .fg-notify-text { font-size: 3.2cqw; }
  .fg-notify-wave { height: 4.4cqw; gap: .5cqw; } .fg-notify-wave i { width: .5cqw; }
  .fg-text { font-size: 4.6cqw; top: 18%; bottom: 26%; }
  .fg-progress { bottom: 12%; right: 4.2%; }
  .fg-quick { bottom: 5%; left: 4.2%; justify-content: space-between; font-size: 2.4cqw; gap: 3cqw; }
  .fg-wait { bottom: 28%; }
  .fg-status { display: none; }
  .fg-name-plate { font-size: 4cqw; } .fg-name { top: -5cqw; }
  .fg-iconbtn { width: 9cqw; height: 9cqw; font-size: 4cqw; }
  .fg-hud-place { font-size: 4cqw; } .fg-hud-meta { font-size: 2.6cqw; }
  .fg-choice, .fg-free { width: 88cqw; font-size: 4cqw; }
  .fg-title-logo { font-size: 11cqw; max-width: 90cqw; } .fg-title-menu button { font-size: 4.4cqw; }
  .fg-dlog { grid-template-columns: 1fr; grid-template-rows: auto minmax(0, 1fr); }
  .fg-dlog-side { flex-direction: row; overflow-x: auto; padding: 0 0 1cqw; }
  .fg-dlog-row { width: 46cqw; }
  .fg-dlog-row-head, .fg-dlog-title { font-size: 3.6cqw; }
  .fg-dlog-row-meta, .fg-dlog-row-sum, .fg-dlog-status, .fg-dlog-label, .fg-dlog-meter, .fg-dlog-think summary, .fg-dlog-chip, .fg-dlog-chip i, .fg-btn.is-mini { font-size: 2.8cqw; }
  .fg-dlog-facts, .fg-dlog-notice, .fg-dlog-error, .fg-dlog-pre, .fg-dlog-line, .fg-dlog-card, .fg-dlog-mono, .fg-dlog-list-plain { font-size: 3cqw; }
  .fg-dlog-facts { grid-template-columns: 1fr; }
  .fg-dlog-pre { max-height: 90cqw; }
  .fg-dlog-line { grid-template-columns: 9cqw minmax(0, 1fr); }
  .fg-dlog-line > .fg-dlog-chips { grid-column: 2; }
  .fg-dlog .fg-note, .fg-dlog-uid { font-size: 2.6cqw; }
  .fg-dlog-list-plain { padding-left: 6cqw; }
  .fg-panel-title { font-size: 6cqw; } .fg-panel-en { font-size: 2.2cqw; }
  .fg-tab { padding: 1.2cqw 3cqw; font-size: 3.2cqw; }
  .fg-pill { padding: .8cqw 2.2cqw; font-size: 2.6cqw; }
  .fg-person { grid-template-columns: 1fr; }
  .fg-person-art { height: 50cqw; }
  .fg-person h3 { font-size: 5cqw; flex-wrap: wrap; } .fg-person h3 small { font-size: 2.6cqw; }
  .fg-person-tags, .fg-note { font-size: 2.8cqw; }
  .fg-look-grid { grid-template-columns: 1fr; } .fg-look-field > span { font-size: 2.6cqw; }
  .fg-btn, .fg-look, .fg-state { font-size: 3cqw; padding: 1cqw 2.4cqw; }
  .fg-emo { width: 15cqw; height: 18cqw; font-size: 2.4cqw; }
  .fg-field, .fg-person-form .fg-field { grid-template-columns: 1fr; font-size: 3cqw; }
  .fg-input, .fg-select, .fg-textarea { font-size: 3cqw; }
  .fg-outfit, .fg-outfit.is-new, .fg-emotion-row, .fg-emotion-row.is-new { grid-template-columns: 1fr; }
  .fg-variant { grid-template-columns: 1fr; } .fg-variant-art { height: 50cqw; }
  .fg-aa-grid { grid-template-columns: 1fr; } .fg-aa-list { max-height: 50cqw; }
  .fg-aa-vision { font-size: 2.6cqw; } .fg-aa-badge { font-size: 2.2cqw; } .fg-aa-vision progress { height: 1.6cqw; }
  .fg-pose-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .fg-acting .fg-field, .fg-acting-emo { grid-template-columns: 1fr; } .fg-acting-head { flex-wrap: wrap; } .fg-acting-head > input:first-child { flex: 1 1 100%; }
  .fg-face-editor .fg-aa-frame { height: 80cqw; }
  .fg-aa-frame, .fg-aa-play { height: 90cqw; } .fg-aa-play.is-close { width: 90cqw; }
  .fg-aa-item img { width: 9cqw; height: 11cqw; } .fg-aa-item { grid-template-columns: auto 9cqw 1fr; }
  .fg-track { grid-template-columns: 9cqw 1fr; gap: 2cqw; padding: 2cqw; }
  .fg-track-play { width: 9cqw; height: 9cqw; font-size: 3cqw; }
  .fg-track-desc { min-height: 12cqw; font-size: 3cqw; }
}

/* 亲密场面（lib/eros.js、Eros.jsx）：潮红 .fg-eros（scene.eros，节奏越快越深，余韵时转成一层暖雾）、触手的影子 .fg-tentacle（scene.tentacle）、
   高潮那一下的白光 .fg-peak。不出字、不出爱心和漫画符号，只动光和影。潮红和影子在插画上面一层（z-index 7），只压画面边上一圈，不挡脸；
   白光在对话框下面（z-index 15），字照样读得到。镜头跟着节奏的一送一落、高潮时的一涌是 Eros.jsx 用 Web Animations 动的。 */
.fg-eros, .fg-tentacle { position: absolute; inset: 0; z-index: 7; pointer-events: none; animation: fg-layer-in var(--fade, 1.2s) ease both; }
.fg-eros.is-leave, .fg-tentacle.is-leave { animation: fg-layer-out var(--fade, 1.2s) ease both; }
.fg-eros::before, .fg-eros::after, .fg-tentacle::before, .fg-tentacle::after { content: ""; position: absolute; inset: 0; pointer-events: none; }
.fg-eros { --flush: rgba(205, 72, 98, .4); --glow: 4.2s; background: radial-gradient(118% 92% at 50% 46%, rgba(255, 180, 170, .06) 30%, var(--flush)); backdrop-filter: saturate(1.08); -webkit-backdrop-filter: saturate(1.08); }
.fg-eros::after { background: radial-gradient(85% 55% at 50% 104%, rgba(255, 168, 150, .2), transparent 70%), radial-gradient(70% 40% at 50% -6%, rgba(255, 190, 200, .12), transparent 70%); animation: fg-eros-glow var(--glow) ease-in-out infinite; }
.fg-eros[data-v="tease"] { --flush: rgba(225, 112, 124, .28); --glow: 5s; }
.fg-eros[data-v="fast"] { --flush: rgba(200, 62, 92, .48); --glow: 2.6s; backdrop-filter: saturate(1.12) contrast(1.02); -webkit-backdrop-filter: saturate(1.12) contrast(1.02); }
.fg-eros[data-v="frantic"] { --flush: rgba(190, 46, 84, .56); --glow: 1.5s; backdrop-filter: saturate(1.18) contrast(1.05); -webkit-backdrop-filter: saturate(1.18) contrast(1.05); }
.fg-eros[data-v="afterglow"] { --glow: 7s; background: radial-gradient(120% 95% at 50% 46%, rgba(255, 236, 226, .1) 30%, rgba(222, 150, 150, .24)); backdrop-filter: brightness(1.04) contrast(.93) saturate(.95); -webkit-backdrop-filter: brightness(1.04) contrast(.93) saturate(.95); }
.fg-eros[data-v="afterglow"]::before { background: radial-gradient(60% 55% at 50% 44%, rgba(255, 250, 246, .16), transparent 72%); filter: blur(1cqw); }
@keyframes fg-eros-glow { 0%, 100% { opacity: .55; } 50% { opacity: 1; } }

/* 触手：画面两边和角落里暗紫的触手剪影往里探、慢慢地扭（像镜头前景里没对上焦的东西），身上一道湿亮的反光；
   潜伏（idle）时缩在画面外沿、淡一些，蠕动（writhe）时探进来、扭得快。形状是两张 SVG：剪影一张、反光一张，跟着同一个动画走。 */
.fg-tentacle { --sway: 9s; background: radial-gradient(112% 92% at 50% 42%, transparent 52%, rgba(16, 4, 26, .42));
  --tentacle-shape: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='-160 -80 1920 1160' preserveAspectRatio='none'><path fill='%2310051a' fill-opacity='.9' d='M-33,1103 -10,1066 10,1030 26,994 40,959 51,925 60,891 66,858 71,826 74,795 77,764 78,734 78,704 78,675 78,647 77,619 77,591 78,563 79,535 81,508 84,480 89,452 95,424 103,395 114,366 127,337 142,307 144,302 144,297 142,292 137,288 132,286 127,286 122,288 118,293 99,323 83,352 69,382 56,411 46,441 37,470 29,499 23,528 17,557 12,585 8,614 4,642 -0,670 -5,697 -10,725 -15,752 -22,779 -29,805 -38,832 -47,858 -59,884 -72,910 -87,936 -105,963 -125,990 -147,1017ZM-128,708 -97,704 -68,699 -41,692 -16,683 7,674 29,663 48,652 67,640 84,628 99,615 114,602 127,589 140,575 152,562 163,550 174,537 185,525 196,513 207,502 219,491 231,481 243,471 256,462 271,454 286,447 303,441 307,439 310,436 312,432 311,427 309,423 306,420 302,418 297,419 278,423 260,429 243,435 226,442 211,450 195,459 181,468 166,478 152,488 139,498 125,508 111,517 98,527 84,536 70,545 56,553 41,561 26,567 10,573 -7,579 -24,583 -43,587 -63,590 -84,591 -107,592 -132,592ZM-123,-23 -101,-14 -80,-4 -62,7 -46,17 -32,27 -19,37 -7,48 4,59 14,70 23,81 32,92 40,104 48,116 57,128 65,139 73,151 82,163 91,174 102,185 113,195 125,204 139,213 154,221 170,228 188,234 207,240 211,240 215,239 218,237 220,233 220,229 219,225 217,222 213,220 195,213 180,206 167,198 156,189 146,180 138,170 131,160 125,150 119,139 114,127 109,115 104,103 99,89 94,75 88,61 81,46 73,30 64,14 53,-2 41,-19 27,-35 11,-52 -8,-68 -28,-85 -51,-101 -77,-117ZM288,1070 289,1052 291,1035 293,1018 296,1003 300,987 304,973 309,958 314,943 319,929 325,914 330,900 336,885 342,870 348,854 353,839 359,822 363,806 367,788 371,770 374,752 376,732 377,712 377,690 376,668 374,644 372,619 370,615 367,611 363,609 359,608 355,610 351,613 349,617 348,621 349,645 348,668 346,689 344,708 340,726 335,743 330,759 323,774 317,788 310,802 302,815 294,828 285,840 277,853 268,865 258,878 249,891 239,905 230,920 220,935 211,951 202,969 194,987 186,1007 179,1028 172,1050ZM1754,1015 1731,986 1711,958 1694,929 1679,901 1665,873 1654,845 1644,816 1635,788 1628,759 1622,731 1616,701 1611,672 1607,643 1603,613 1598,583 1594,553 1589,523 1583,493 1576,463 1568,432 1559,402 1548,372 1534,342 1519,312 1502,282 1482,252 1478,248 1473,246 1467,246 1462,248 1458,252 1456,257 1456,263 1458,268 1475,298 1488,327 1499,356 1508,386 1514,414 1519,443 1522,472 1524,500 1525,529 1525,558 1525,588 1524,617 1523,647 1522,678 1522,709 1522,741 1524,774 1526,808 1531,842 1537,877 1545,913 1555,950 1568,988 1584,1026 1604,1065 1626,1105ZM1745,202 1722,205 1701,208 1681,209 1663,209 1645,209 1629,207 1613,205 1598,202 1583,198 1569,194 1556,189 1542,183 1529,177 1515,170 1502,163 1489,156 1476,149 1462,142 1449,135 1435,128 1421,122 1406,116 1391,110 1375,106 1359,102 1342,99 1338,98 1334,100 1330,103 1329,108 1328,112 1330,116 1333,120 1338,121 1352,126 1366,132 1379,138 1391,146 1403,153 1414,162 1425,171 1436,180 1447,190 1458,200 1470,210 1482,220 1494,231 1507,241 1521,251 1536,261 1551,271 1568,280 1587,288 1606,296 1627,303 1650,308 1674,313 1699,316 1726,318 1755,318ZM1457,1046 1449,1026 1440,1006 1431,988 1422,972 1412,956 1401,941 1391,926 1381,912 1371,899 1360,886 1351,874 1341,862 1332,849 1323,837 1314,824 1306,812 1299,798 1292,785 1286,770 1281,755 1277,739 1273,722 1271,704 1270,684 1270,664 1272,642 1271,637 1269,633 1266,630 1262,628 1257,629 1253,631 1250,634 1248,638 1245,661 1242,683 1240,704 1240,725 1241,744 1242,763 1245,781 1249,799 1253,816 1258,833 1263,849 1269,865 1276,881 1282,896 1289,911 1296,926 1302,940 1309,955 1315,970 1321,984 1326,999 1331,1013 1335,1028 1338,1043 1341,1058 1343,1074ZM1737,725 1717,723 1699,721 1682,718 1666,715 1651,711 1637,707 1624,703 1611,698 1599,693 1588,688 1577,682 1567,676 1557,670 1547,664 1537,658 1527,652 1518,646 1508,640 1498,634 1488,628 1478,622 1468,617 1457,612 1446,608 1435,605 1423,601 1419,601 1416,602 1413,604 1411,607 1411,611 1412,614 1414,617 1417,619 1428,623 1437,628 1446,633 1455,639 1463,646 1471,653 1478,660 1486,667 1493,675 1501,684 1509,692 1517,701 1526,710 1535,719 1545,728 1556,737 1567,746 1580,755 1594,764 1608,772 1624,781 1641,789 1659,796 1679,803 1700,809 1723,815Z'/></svg>");
  --tentacle-sheen: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='-160 -80 1920 1160' preserveAspectRatio='none'><path fill='%23c496ff' fill-opacity='.42' d='M-15,969 1,934 13,900 23,866 31,833 37,800 41,768 44,736 47,704 49,673 50,642 52,611 53,580 56,550 60,519 64,488 71,457 79,425 89,394 89,394 80,426 73,457 68,489 65,520 63,550 62,581 62,612 62,643 61,674 60,706 58,737 54,770 49,802 41,835 31,868 19,902 4,935 -15,969ZM-46,653 -21,646 2,637 23,628 43,618 61,607 79,595 95,583 110,570 124,557 138,544 151,532 164,519 178,507 191,495 205,483 219,472 234,462 250,453 250,453 234,463 220,474 207,486 194,498 182,511 169,524 157,538 144,551 131,565 116,578 101,591 85,604 67,615 47,626 26,635 4,642 -21,648 -46,653ZM-26,-39 -7,-23 9,-7 24,8 36,24 47,40 57,55 65,70 73,85 80,99 87,113 94,127 100,140 108,152 116,164 125,175 135,186 147,196 160,205 160,205 147,195 136,185 127,173 119,161 112,149 106,136 100,123 94,109 88,95 81,80 74,65 65,50 54,35 42,19 29,4 13,-11 -6,-25 -26,-39ZM257,1005 262,986 269,969 275,952 283,936 290,920 298,905 305,890 313,874 321,859 328,843 335,827 342,810 348,793 353,775 358,756 361,736 364,715 365,692 365,692 365,715 363,736 361,757 358,776 353,795 349,813 343,830 337,847 330,863 323,879 315,895 307,910 299,925 290,940 282,955 273,971 265,987 257,1005ZM1614,962 1599,924 1587,888 1577,851 1570,816 1564,781 1561,746 1558,712 1556,679 1555,646 1553,613 1552,580 1550,548 1548,515 1545,483 1540,451 1533,419 1525,387 1514,355 1514,355 1523,387 1531,420 1536,452 1539,484 1540,516 1541,548 1541,581 1541,613 1541,646 1542,680 1543,714 1547,748 1551,783 1558,818 1568,854 1580,890 1595,926 1614,962ZM1674,274 1650,271 1628,266 1607,260 1588,254 1570,246 1553,238 1537,229 1521,220 1507,210 1493,201 1480,191 1466,181 1453,171 1440,162 1427,153 1413,144 1400,136 1385,129 1385,129 1399,137 1412,146 1425,155 1438,165 1450,176 1462,187 1475,198 1488,208 1501,219 1516,229 1531,239 1548,248 1566,256 1585,262 1605,267 1627,271 1650,273 1674,274ZM1370,1011 1363,994 1356,978 1348,962 1340,946 1331,930 1322,915 1314,900 1305,884 1297,869 1289,853 1281,837 1274,820 1268,803 1263,786 1258,767 1255,748 1253,728 1252,706 1252,706 1252,728 1253,748 1255,768 1258,787 1263,805 1268,823 1274,841 1280,858 1288,874 1296,890 1304,905 1313,921 1323,936 1332,950 1342,965 1351,980 1361,995 1370,1011ZM1666,766 1647,760 1629,753 1613,745 1598,737 1584,729 1571,721 1559,712 1548,704 1537,695 1527,686 1518,678 1508,669 1499,661 1490,654 1481,646 1471,639 1462,632 1452,626 1452,626 1461,633 1471,640 1479,648 1488,656 1496,665 1505,674 1513,683 1523,692 1532,701 1543,710 1554,719 1567,728 1580,736 1595,743 1611,750 1628,756 1646,762 1666,766Z'/></svg>"); }
/* 两张 SVG 比画面四周各大出一圈（inset 负值，viewBox 也多出同样一圈），扭的时候不露出图的边 */
.fg-tentacle::before, .fg-tentacle::after { inset: -8% -10%; background: var(--tentacle-shape) 0 0 / 100% 100% no-repeat; transform-origin: 50% 92%; animation: fg-tentacle-sway var(--sway) ease-in-out infinite alternate; }
.fg-tentacle::before { filter: blur(.45cqw); }
.fg-tentacle::after { background-image: var(--tentacle-sheen); mix-blend-mode: screen; filter: blur(.25cqw); animation: fg-tentacle-sway var(--sway) ease-in-out infinite alternate, fg-tentacle-glint calc(var(--sway) * .7) ease-in-out infinite; }
.fg-tentacle[data-v="idle"] { opacity: .72; }
.fg-tentacle[data-v="idle"]::before, .fg-tentacle[data-v="idle"]::after { scale: 1.12; }
.fg-tentacle[data-v="writhe"] { --sway: 2.6s; background: radial-gradient(108% 88% at 50% 42%, transparent 44%, rgba(16, 4, 26, .55)); }
.fg-tentacle[data-v="writhe"]::before, .fg-tentacle[data-v="writhe"]::after { animation-name: fg-tentacle-writhe; }
.fg-tentacle[data-v="writhe"]::after { animation-name: fg-tentacle-writhe, fg-tentacle-glint; }
@keyframes fg-tentacle-sway { 0% { transform: skewX(-1.5deg) scaleY(.97); } 50% { transform: skewX(1deg) scaleY(1.02); } 100% { transform: skewX(2deg) scaleY(.99) translateY(-.6%); } }
@keyframes fg-tentacle-writhe { 0% { transform: skewX(-3.5deg) scale(1.01, .97); } 40% { transform: skewX(2.5deg) scale(.985, 1.05) translateY(-1.2%); } 100% { transform: skewX(4deg) scale(1, 1.01); } }
@keyframes fg-tentacle-glint { 0%, 100% { opacity: .45; } 50% { opacity: 1; } }

/* 高潮：画面柔和地白起来、带一点虚，再慢慢回来；射精：跟着声音一下一下地亮，一下比一下弱。 */
.fg-peak { position: absolute; inset: 0; z-index: 15; pointer-events: none; }
.fg-peak.is-climax, .fg-peak.is-both { background: radial-gradient(78% 72% at 50% 48%, rgba(255, 253, 250, .94), rgba(255, 238, 242, .62) 55%, rgba(255, 222, 232, .28)); backdrop-filter: blur(3px) brightness(1.15); -webkit-backdrop-filter: blur(3px) brightness(1.15); animation: fg-peak-bloom 2.6s cubic-bezier(.3, 0, .2, 1) both; }
.fg-peak i { position: absolute; inset: 0; opacity: 0; background: radial-gradient(90% 80% at 50% 56%, rgba(255, 250, 246, .9), rgba(255, 236, 240, .36) 58%, transparent 92%); animation: fg-peak-pulse .55s ease-out var(--at, 0ms) both; }
@keyframes fg-peak-bloom { 0% { opacity: 0; } 22% { opacity: .84; } 42% { opacity: .7; } 100% { opacity: 0; } }
@keyframes fg-peak-pulse { 0% { opacity: 0; } 14% { opacity: calc(.6 * var(--k, 1)); } 100% { opacity: 0; } }
@media (prefers-reduced-motion: reduce) {
  .fg-eros::after, .fg-tentacle::before, .fg-tentacle::after { animation: none !important; } /* 潮红的起伏、触手的扭动 */
}
`;

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
var import_react12 = __toESM(require("react"), 1);

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
var HIT_EFFECT_LABEL = { hit: "命中", crit: "暴击", miss: "闪避", block: "格挡", down: "击倒", heal: "治疗" };
var MOMENT_LABEL = { photo: "拍照", touch: "触碰", pat: "摸头", poke: "戳脸", cheers: "干杯", fireworks: "烟花", cook: "做好一道菜", nickname: "新称呼", promise: "约定", contact: "交换联系方式" };
var PHONE_LABEL = { call: "来电", dial: "拨出", end: "挂断", notify: "通知", voicemail: "语音留言" };
var CALL_END_LABEL = { missed: "没接通", declined: "拒接", hungup: "对方挂断" };
var MOVE_LABEL = { approach: "靠近", apart: "拉开", forward: "上前", back: "后退", turn: "背过身", face: "转身面对", lookback: "回眸", hide: "躲到身后", reset: "复位" };
var ENTER_HOW_LABEL = { run: "跑进来", peek: "探头", slow: "慢慢走进来" };
var EXIT_HOW_LABEL = { storm: "甩头离开", run: "跑开", slow: "慢慢走远" };
var DELIVERY_LABEL = { menace: "威压", excited: "激动", shout: "怒吼", hesitant: "迟疑", whisper: "低语", breakdown: "崩溃" };
var TEXT_FX_LABEL = { shake: "发抖", wave: "波浪", big: "放大", roar: "吼", grow: "越说越大", dwindle: "越说越小", small: "小声", faint: "轻淡", glow: "发光强调" };
var ROMANCE_LABEL = { none: "", ambiguous: "暧昧", intimate: "亲密" };
var SENSE_LABEL = { none: "", blind: "蒙眼", ear: "耳边", touch: "触碰", heat: "发烫", cold: "发凉", scent: "香气", breath: "屏息", daze: "失神" };
var CG_INS = ["dissolve", "slow", "black", "flash", "focus", "cut", "impact"];
var CG_OUTS = ["dissolve", "slow", "black", "flash", "cut"];
var CG_MOTIONS = ["still", "push", "pan"];
var CG_IN_OLD = { sweep: "dissolve", zoom: "dissolve", iris: "dissolve", bloom: "slow", photo: "slow", slide: "cut", glitch: "cut" };
var CG_OUT_OLD = { fade: "dissolve", blur: "slow", pull: "slow", slide: "cut", glitch: "cut", shatter: "flash" };
var CG_MOTION_OLD = { drift: "still", breathe: "still", pull: "still", shake: "still" };
var cgWord = (value, list2, old) => {
  const text = String(value ?? "").trim().toLowerCase();
  return list2.includes(text) ? text : old[text] || "";
};
var cgIn = (value) => cgWord(value, CG_INS, CG_IN_OLD);
var cgOut = (value) => cgWord(value, CG_OUTS, CG_OUT_OLD);
var cgMotion = (value) => cgWord(value, CG_MOTIONS, CG_MOTION_OLD);
var MODE_NAMES = { memory: "回忆", dream: "梦境", illusion: "幻觉", imagine: "想象", pov: "主观视角", inner: "内心世界", screen: "画面中", tale: "故事中", vision: "预见", digital: "虚拟世界" };
var RECALL_TONES = ["warm", "sweet", "sad", "dread", "flash", "haze"];
var RECALL_TONE_NAMES = { warm: "温暖怀念", sweet: "甜蜜心动", sad: "伤感", dread: "不安", flash: "猛然想起", haze: "朦胧如梦" };
var CG_MAX_CHARACTERS = 6;
var DAYPART = { dawn: "day", morning: "day", noon: "day", afternoon: "day", dusk: "dusk", evening: "night", night: "night", midnight: "night" };
var daypart = (time) => DAYPART[time] || "day";
var speakersOf = (sp) => String(sp || "").split(/[、，,&＆]/).map((s) => s.trim()).filter(Boolean);
var placeKey = (scene) => `${String(scene?.location || "").trim() || "未知地点"}|${daypart(scene?.time)}`;

// lib/staging.js
var SLOTS = ["center", "left", "right", "farleft", "farright"];
function playedUnits(units, script) {
  const skip = new Set(script?.skip || []);
  return skip.size ? (units || []).filter((u) => !skip.has(u.id)) : units || [];
}
var ALL = /* @__PURE__ */ new Set(["*", "全部", "所有人", "all"]);
function stageWalk(script, units, carry = [], inside = null, { walkOn = null, calling = "" } = {}) {
  if (!script) return { steps: units.map(() => ({ cast: carry, entered: [], left: [] })), end: carry, inside: null };
  const lines = script.lines || {};
  const home = new Map((script.cast || []).map((c) => [c.name, c.pos]));
  const first = /* @__PURE__ */ new Map();
  const firstAt = /* @__PURE__ */ new Map();
  const spokeAt = /* @__PURE__ */ new Map();
  const inLayer = /* @__PURE__ */ new Map();
  const back = /* @__PURE__ */ new Map();
  const early = /* @__PURE__ */ new Set();
  const realVoices = /* @__PURE__ */ new Set();
  const layerVoices = /* @__PURE__ */ new Map();
  const recallVoices = /* @__PURE__ */ new Set();
  const listed = new Set((script.cast || []).map((c) => c.name));
  const walkOns = /* @__PURE__ */ new Map();
  const ownExit = /* @__PURE__ */ new Map();
  let layer = false, layerSeen = false, layerStart = -1, split = null, caller = calling || "";
  let place = script.scene?.location || "", reset = false;
  units.forEach((u, i) => {
    const line = lines[u.id] || {};
    const returning = line.mode === "real" && layer;
    if (line.mode === "real") layer = false;
    else if (line.mode) {
      if (!layer) layerStart = i;
      layer = layerSeen = true;
    }
    if (!layer) {
      const moved = Boolean(line.scene?.location) && line.scene.location !== place;
      if (i > 0 && !returning && (moved || (line.exit || []).some((n) => ALL.has(n)))) reset = true;
      if (line.scene?.location) place = line.scene.location;
    }
    if (line.split === "off") split = null;
    else if (line.split) split = line.split;
    const phone = line.phone && line.phone.kind;
    if (phone === "call" || phone === "dial") caller = line.phone.who || "";
    if (caller && (line.enter || []).some((e) => e.name === caller)) caller = "";
    const onPhone = caller;
    if (phone === "end") caller = "";
    const note = (name2, kind) => {
      const seen = returning ? back : layer ? inLayer : first;
      if (seen.has(name2)) return;
      seen.set(name2, kind);
      if (seen === first) firstAt.set(name2, i);
    };
    for (const name2 of line.exit || []) note(name2, "exit");
    for (const e of line.enter || []) note(e.name, "enter");
    const type = line.type || u.type;
    const speakers = type === "narration" ? [] : speakersOf(line.sp);
    if (line.recall) for (const name2 of speakers) recallVoices.add(name2);
    const inPerson = !line.recall && (!line.voice || line.voice === "chorus");
    for (const name2 of inPerson ? speakers : []) {
      if (split && split.who?.includes(name2) || name2 === onPhone) continue;
      if (layer) {
        if (!layerVoices.has(name2)) layerVoices.set(name2, layerStart);
      } else {
        realVoices.add(name2);
        if (!layerSeen) early.add(name2);
        if (!reset && !spokeAt.has(name2)) spokeAt.set(name2, i);
        if (walkOn && walkOn.has(name2) && !listed.has(name2) && !line.as) walkOns.set(i, [...walkOns.get(i) || [], name2]);
      }
    }
    const leaving = inPerson && !line.mode && !line.scene?.location ? speakers.filter((name2) => (line.exit || []).includes(name2)) : [];
    if (leaving.length) ownExit.set(i, leaving);
  });
  const carried = new Set(carry.map((c) => c.name));
  const opening = units.length ? lines[units[0].id]?.mode : "";
  const goingOn = inside && opening && opening !== "real" ? inside : null;
  const onlyInside = new Set((goingOn || []).map((c) => c.name).filter((name2) => !carried.has(name2)));
  const implicit = /* @__PURE__ */ new Map();
  const onAtStart = (name2) => {
    if (first.has(name2)) return first.get(name2) === "exit" || spokeAt.get(name2) < firstAt.get(name2);
    if (onlyInside.has(name2)) return false;
    if (carried.has(name2)) return true;
    if (back.has(name2)) return true;
    if (inLayer.has(name2)) return inLayer.get(name2) === "exit" || early.has(name2);
    if (layerVoices.has(name2) && !realVoices.has(name2)) {
      const at2 = layerVoices.get(name2);
      implicit.set(at2, [...implicit.get(at2) || [], { name: name2 }]);
      return false;
    }
    if (carry.length && recallVoices.has(name2) && !realVoices.has(name2)) return false;
    return true;
  };
  let cast = (script.cast || []).filter((c) => onAtStart(c.name));
  let saved = null;
  if (goingOn) {
    saved = cast;
    cast = goingOn;
  }
  let after = [];
  let lastSaid = [];
  const steps = units.map((u, i) => {
    const line = lines[u.id] || {};
    const before = cast;
    if (after.length) {
      cast = cast.filter((c) => !after.includes(c.name));
      after = [];
    }
    if (line.mode === "real") {
      if (saved) {
        cast = saved;
        saved = null;
      }
    } else if (line.mode && !saved) saved = cast;
    after = ownExit.get(i) || [];
    const exits = (line.exit || []).filter((n) => !after.includes(n));
    cast = exits.some((n) => ALL.has(n)) ? [] : cast.filter((c) => !exits.includes(c.name));
    const type = line.type || u.type;
    const said = type === "narration" ? null : line.sp ? speakersOf(line.sp) : type === "dialogue" ? lastSaid : ["我"];
    if (type === "dialogue") lastSaid = said;
    if (said) cast = cast.filter((c) => !c.extra || said.includes(c.name));
    for (const e of [...line.enter || [], ...implicit.get(i) || [], ...(walkOns.get(i) || []).map((name2) => ({ name: name2, extra: true }))]) {
      if (cast.some((c) => c.name === e.name)) continue;
      const want = e.pos || home.get(e.name);
      const pos = want && !cast.some((c) => c.pos === want) ? want : SLOTS.find((p4) => !cast.some((c) => c.pos === p4)) || want || "center";
      cast = [...cast, e.extra ? { name: e.name, pos, extra: true } : { name: e.name, pos }];
    }
    const left = before.filter((c) => !cast.some((x) => x.name === c.name)).map((c) => c.name);
    const entered = cast.filter((c) => !before.some((x) => x.name === c.name)).map((c) => c.name);
    return { cast, entered, left };
  });
  cast = cast.filter((c) => !after.includes(c.name) && !c.extra);
  return { steps, end: saved || cast, inside: saved ? cast : null };
}

// lib/scenes.js
var SCENE_DEFAULTS = { location: "", time: "afternoon", weather: "clear", mood: "daily", light: "normal", fx: "none", romance: "none", sense: "none", bars: "none", eros: "none", tentacle: "none", bg: "" };
var MODE_TRANSITION = { memory: "haze", dream: "swirl", illusion: "glitch", imagine: "iris", pov: "blink", inner: "black", screen: "glitch", tale: "dissolve", vision: "flash", digital: "glitch" };
function applyDelta(scene, delta, known) {
  if (!delta) return scene;
  const { transition, ...change } = delta;
  const next = { ...scene, ...change };
  if (change.location && change.location !== scene.location) {
    if (!change.bg) next.bg = known.get(change.location) || "";
    if (!change.light) next.light = "normal";
    if (!change.fx) next.fx = "none";
    if (!change.romance) next.romance = "none";
    if (!change.sense) next.sense = "none";
    if (!change.bars) next.bars = "none";
    if (!change.eros) next.eros = "none";
    if (!change.tentacle) next.tentacle = "none";
  }
  if (next.bg && next.location) known.set(next.location, next.bg);
  return next;
}
function addThen(map, list2) {
  if (!list2?.length) return map || null;
  return { ...map || {}, ...Object.fromEntries(list2.map((e) => [e.name, e])) };
}
function walkScenes(start, lines) {
  let real = { scene: { ...SCENE_DEFAULTS, ...start.scene || {} }, bgm: start.bgm || "", amb: start.amb || "" };
  let layer = start.layer || null;
  const known = /* @__PURE__ */ new Map();
  if (real.scene.bg && real.scene.location) known.set(real.scene.location, real.scene.bg);
  return lines.map((raw) => {
    const line = raw || {};
    const before = layer ? layer.scene : real.scene;
    const beforeMode = layer ? layer.mode : "";
    const delta = line.scene || null;
    if (line.mode === "real") {
      layer = null;
      real = { ...real, scene: applyDelta(real.scene, delta, known) };
    } else if (line.mode) {
      layer = layer ? { ...layer, mode: line.mode, scene: applyDelta(layer.scene, delta, known), then: addThen(layer.mode === line.mode ? layer.then : null, line.then) } : { mode: line.mode, scene: applyDelta(real.scene, delta, known), bgm: real.bgm, amb: real.amb, then: addThen(null, line.then) };
    } else if (layer) layer = { ...layer, scene: applyDelta(layer.scene, delta, known), then: addThen(layer.then, line.then) };
    else real = { ...real, scene: applyDelta(real.scene, delta, known) };
    const bgm = line.bgm === "hush" ? "" : line.bgm;
    if (bgm || line.amb) {
      const patch = { ...bgm ? { bgm } : {}, ...line.amb ? { amb: line.amb } : {} };
      if (layer) layer = { ...layer, ...patch };
      else real = { ...real, ...patch };
    }
    const now = layer || real;
    const scene = now.scene;
    const mode = layer ? layer.mode : "";
    const moved = mode !== beforeMode || scene.location !== before.location;
    let transition = "";
    const passed = mode === beforeMode && scene.time !== before.time;
    if (moved) transition = delta?.transition || (mode && mode !== beforeMode ? MODE_TRANSITION[mode] : mode !== beforeMode && beforeMode === "memory" ? "haze" : passed ? "black" : "dissolve");
    else if (placeKey(scene) !== placeKey(before) || scene.bg !== before.bg) transition = delta?.transition || "fade";
    else if (delta?.transition && delta.transition !== "none") transition = delta.transition;
    return { scene, mode, bgm: now.bgm, amb: now.amb, real, layer, moved, transition, ...line.cut ? { cut: line.cut } : {} };
  });
}
var STAGE_NOTE = /^[【\[]([^】\]]*)[】\]]$/;
var FLASHBACK = "(?:闪回|閃回|回忆|回憶|回想|フラッシュバック|flashback)";
var FLASHBACK_START = new RegExp(`^\\s*${FLASHBACK}`, "i");
var FLASHBACK_END = new RegExp(`^\\s*${FLASHBACK}(?:演出|篇|シーン)?[\\s・·：:\\-—~～]*(?:结束|結束|终了|終了|终|終|完|おわり|end)|^\\s*(?:回到现实|回到現實|現実に戻)`, "i");
var OPEN_FLASHBACK_MAX = 6;
function markRecalls(script, units) {
  if (!script?.lines || !units?.length) return script;
  const skip = new Set(script.skip || []);
  const spans = [];
  let open = null;
  for (const u of units) {
    const note = STAGE_NOTE.exec(String(u.text || "").trim())?.[1] || "";
    const ends = FLASHBACK_END.test(note);
    if (ends || FLASHBACK_START.test(note)) {
      if (open) {
        open.closed = ends;
        spans.push(open);
        open = null;
      }
      if (!ends) open = { ids: [], closed: false };
      continue;
    }
    if (open && !skip.has(u.id)) open.ids.push({ id: u.id, type: script.lines[u.id]?.type || u.type });
  }
  if (open) spans.push(open);
  const want = /* @__PURE__ */ new Set();
  for (const span of spans) {
    const cut = span.ids.findIndex((x) => x.type === "narration");
    const ids = span.closed ? span.ids : span.ids.slice(0, Math.min(cut < 0 ? span.ids.length : cut, OPEN_FLASHBACK_MAX));
    if (ids.some((x) => script.lines[x.id]?.mode)) continue;
    for (const x of ids) want.add(x.id);
  }
  for (const [id, line] of Object.entries(script.lines)) if (line?.voice === "memory" && !line.mode) want.add(id);
  const add = [...want].filter((id) => !script.lines[id]?.recall);
  if (!add.length) return script;
  const lines = { ...script.lines };
  for (const id of add) lines[id] = { ...lines[id] || {}, recall: true };
  return { ...script, lines };
}
function recallRuns(script, units) {
  const lines = units.map((u) => script?.lines?.[u.id] || {});
  const out = lines.map(() => null);
  for (let i = 0; i < lines.length; ) {
    if (!lines[i].recall) {
      i++;
      continue;
    }
    const run = { who: [], then: {}, tone: "", emos: [] };
    for (; i < lines.length && lines[i].recall; i++) {
      for (const name2 of speakersOf(lines[i].sp)) if (name2 !== "我" && !run.who.includes(name2)) run.who.push(name2);
      run.then = addThen(run.then, lines[i].then);
      if (!run.tone && RECALL_TONES.includes(lines[i].recall)) run.tone = lines[i].recall;
      if (lines[i].emo) run.emos.push(lines[i].emo);
      out[i] = run;
    }
  }
  return out;
}
var TONE_BY_EMOTION = [["dread", ["scared", "angry"]], ["sad", ["sad", "cry", "tired", "worried"]], ["sweet", ["love", "blush", "shy", "teasing"]]];
var TONE_BY_MOOD = { tense: "dread", eerie: "dread", mystery: "dread", battle: "dread", sad: "sad", despair: "sad", solemn: "sad", sweet: "sweet" };
function autoRecallTone(emos, mood) {
  for (const [tone, list2] of TONE_BY_EMOTION) if ((emos || []).some((e) => list2.includes(e))) return tone;
  return TONE_BY_MOOD[mood] || "warm";
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
function cleanLookFields(value) {
  const out = {};
  if (typeof value === "string") {
    const s = value.trim().slice(0, 1200);
    if (s) out.other = s;
    return out;
  }
  if (!value || typeof value !== "object") return out;
  for (const f of LOOK_FIELDS) {
    const s = String(value[f] ?? "").trim().replace(/^[,，\s]+|[,，\s]+$/g, "").slice(0, 600);
    if (s && !/^none$/i.test(s)) out[f] = s;
  }
  return out;
}
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
function thenLook(base, entry, outfits = {}) {
  if (!entry) return base;
  const fields = entry.change ? cleanLookFields(entry.change) : {};
  const changed = Object.keys(fields).length > 0;
  return {
    appearance: changed ? lookTags(fields, base.appearance) : base.appearance,
    appearanceFields: changed ? fields : base.appearanceFields,
    outfit: entry.outfit || base.outfit,
    outfitTags: entry.outfit ? outfits?.[entry.outfit]?.tags || entry.outfitTags || "" : base.outfitTags,
    states: Array.isArray(entry.states) ? entry.states : base.states
  };
}
function shiftsAhead(lines) {
  const out = new Array(lines.length).fill(null);
  let ahead = null;
  for (let i = lines.length - 1; i >= 0; i--) {
    out[i] = ahead;
    const list2 = lines[i]?.look;
    if (!Array.isArray(list2) || !list2.length) continue;
    ahead = { ...ahead || {} };
    for (const s of list2) if (s?.name) ahead[s.name] = [s, ...ahead[s.name] || []];
  }
  return out;
}
function undoShifts(base, pending) {
  if (!base || !pending?.length) return null;
  let states = [...base.states || []];
  for (const s of [...pending].reverse()) {
    const on = new Set((s.on || []).map((x) => x.name));
    states = states.filter((x) => !on.has(x.name));
    for (const x of s.off || []) if (x?.name && !states.some((y) => y.name === x.name)) states.push({ name: x.name, tags: x.tags || "" });
  }
  const entry = { name: pending[0].name, shift: true };
  const wear = pending.find((s) => s.outfit);
  if (wear?.from && wear.from !== base.outfit) entry.outfit = wear.from;
  const names = (list2) => list2.map((x) => x.name).sort().join("+");
  if (names(states) !== names(base.states || [])) entry.states = states;
  return entry.outfit || entry.states ? entry : null;
}
function pickSprite(sprites, look, emotion, base = "", { strict = false } = {}) {
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
  if (same || strict) return same;
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
    label: "治疗",
    hint: "打斗里被治疗、泛起绿光的那一下",
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
    id: "whoosh",
    label: "挥出",
    hint: "甩镜、挥出招式、闪避的那一下",
    group: "stage",
    presets: [
      { id: "swish", label: "唰", parts: [p("noise", 700, 0.26, 0.2, { to: 5200, q: 1.4, attack: 0.04 }), p("noise", 2600, 0.12, 0.08, { q: 2, at: 0.12 })] },
      { id: "blade", label: "刀光", parts: [p("noise", 1800, 0.18, 0.16, { to: 7e3, q: 2.2, attack: 0.02 }), p("sine", 2400, 0.3, 0.035, { to: 3600, at: 0.1 })] },
      { id: "wind", label: "风声", parts: [p("noise", 300, 0.42, 0.22, { to: 1800, q: 0.9, attack: 0.12 })] },
      { id: "zip", label: "嗖", parts: [p("sawtooth", 300, 0.14, 0.05, { to: 2400, lp: 4e3 }), p("noise", 3e3, 0.1, 0.1, { q: 1.6 })] },
      { id: "hit", label: "唰 + 咚", parts: [p("noise", 900, 0.2, 0.18, { to: 5e3, q: 1.4, attack: 0.03 }), p("sine", 120, 0.3, 0.24, { to: 50, at: 0.17 })] }
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
  const voices = new Map(list2.map((p4) => [p4.name, resolveVoice(p4, p4.name, ui2)]));
  const taken = new Set([...voices.values()].filter((v) => v && !v.auto).map((v) => v.id));
  for (const p4 of list2) {
    const voice = voices.get(p4.name);
    if (!voice || !voice.auto) continue;
    const pool = poolOf(p4, ui2);
    const start = pool.indexOf(voice.id);
    const free = pool.map((_, i) => pool[(start + i) % pool.length]).find((id) => !taken.has(id));
    if (free && free !== voice.id) voices.set(p4.name, autoVoice(free, p4.name, clampPitch(p4.voicePitch)));
    taken.add(voices.get(p4.name).id);
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

// lib/stature.js
var keysOf = (text) => String(text || "").split(/[,，\n]+/).map((t) => t.trim().replace(/^-?\d*\.?\d+::|::$/g, "").replace(/^[{[(]+|[}\])]+$/g, "").trim().toLowerCase().replace(/\s+/g, " ")).filter(Boolean);
var BASE_HEIGHT = { female: 160, male: 172, other: 165 };
var MIN_HEIGHT = 60;
var MAX_HEIGHT = 260;
var ABSOLUTE = [
  [/^(?:toddler|baby|infant)$/, 95],
  [/^(?:child|kid|loli|shota|little girl|little boy|young child|aged down|chibi)$/, 128],
  [/^(?:dwarf|halfling|hobbit|gnome)$/, 125],
  [/^(?:giant|giantess|ogre|troll)$/, 230]
];
var RELATIVE = [
  [[/^(?:very tall|towering)$/, 16], [/^(?:tall|tall female|tall male)$/, 10], [/^(?:petite|short|short stature|small|tiny|small stature)$/, -10]],
  [[/^(?:teen|teenage|teenager|young teen)$/, -4], [/^(?:elderly|old man|old woman|old)$/, -3]]
];
var FEMALE = /^(?:\d?girls?|woman|women|female|mature female|lady)$/;
var MALE = /^(?:\d?boys?|man|men|male|mature male|old man)$/;
function genderOf(person) {
  if (person?.gender === "female" || person?.gender === "male") return person.gender;
  const keys = keysOf(person?.appearance);
  if (keys.some((k) => FEMALE.test(k))) return "female";
  if (keys.some((k) => MALE.test(k))) return "male";
  return "other";
}
function guessHeight(person) {
  const keys = keysOf(person?.appearance);
  for (const [re, cm2] of ABSOLUTE) if (keys.some((k) => re.test(k))) return cm2;
  let cm = BASE_HEIGHT[genderOf(person)];
  for (const group of RELATIVE) {
    const hit = group.find(([re]) => keys.some((k) => re.test(k)));
    if (hit) cm += hit[1];
  }
  return cm;
}
function cleanHeight(value) {
  if (value === null || value === void 0 || value === "") return null;
  const n = Math.round(Number(value));
  return Number.isFinite(n) && n >= MIN_HEIGHT && n <= MAX_HEIGHT ? n : null;
}
function heightOf(person) {
  const own = cleanHeight(person?.height);
  if (own) return { cm: own, from: "user" };
  const designed = cleanHeight(person?.acting?.height);
  if (designed) return { cm: designed, from: "acting" };
  return { cm: guessHeight(person), from: "guess" };
}
var FACE_RATIO = 0.13;
var FACE_CENTER = 0.24;
var FACE_AT = 0.73;
var PER_CM = 85e-4;
var FACE_HIGH = 0.9;
var FACE_LOW = 0.6;
var clamp2 = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
function faceHeight(cm) {
  let v = FACE_AT + (cm - BASE_HEIGHT.female) * PER_CM;
  if (v > FACE_HIGH) v = FACE_HIGH + (v - FACE_HIGH) * 0.5;
  if (v < FACE_LOW) v = FACE_LOW - (FACE_LOW - v) * 0.6;
  return clamp2(v, 0.42, 0.98);
}
var FACE_SPREAD = 1.15;
function usualFace(boxes, height) {
  if (!(height > 0)) return 0;
  const ratios = (boxes || []).filter((b) => Array.isArray(b) && b.length === 4 && b.every(Number.isFinite) && b[3] > b[1]).map((b) => (b[3] - b[1]) / height).sort((a, b) => a - b);
  if (ratios.length < 2) return 0;
  const mid = ratios.length >> 1;
  return ratios.length % 2 ? ratios[mid] : (ratios[mid - 1] + ratios[mid]) / 2;
}
function placeSprite({ box = null, size = null, cm = BASE_HEIGHT.female, usual = 0 } = {}) {
  const ok = Array.isArray(box) && box.length === 4 && box.every(Number.isFinite) && box[3] > box[1] && Array.isArray(size) && size[1] > 0;
  const measured = ok ? (box[3] - box[1]) / size[1] : FACE_RATIO;
  const ratio = ok && usual > 0 ? clamp2(measured, usual / FACE_SPREAD, usual * FACE_SPREAD) : measured;
  const center2 = ok ? (box[1] + box[3]) / 2 / size[1] : FACE_CENTER;
  const top = ok ? box[1] / size[1] : FACE_CENTER - FACE_RATIO / 2;
  const k = clamp2(FACE_RATIO / ratio, 0.6, 1.4);
  const want = faceHeight(cm);
  const lift = clamp2(want - (1 - center2) * k, -0.5, 0.3);
  const head = clamp2(1 - lift - (1 - top) * k - 0.08 * k, -0.2, 0.9);
  return { k: round(k), lift: round(lift), head: round(head) };
}
var round = (v) => Math.round(v * 1e3) / 1e3;
function faceCrop(box, size) {
  if (!Array.isArray(size) || !(size[0] > 0) || !(size[1] > 0)) return null;
  const [w, h] = size;
  const ok = Array.isArray(box) && box.length === 4 && box.every(Number.isFinite) && box[2] > box[0] && box[3] > box[1];
  const [x0, y0, x1, y1] = ok ? box : [w / 2 - FACE_RATIO * h / 2, (FACE_CENTER - FACE_RATIO / 2) * h, w / 2 + FACE_RATIO * h / 2, (FACE_CENTER + FACE_RATIO / 2) * h];
  const side = Math.min((y1 - y0) / 0.48, w, h);
  const pct2 = (v) => round(v / side * 100);
  return { width: pct2(w), left: pct2(-((x0 + x1) / 2 - side / 2)), top: pct2(-((y0 + y1) / 2 - side * 0.52)) };
}

// lib/cast.js
var NAME_COLORS = ["#f2739b", "#7aa2ff", "#ffb35c", "#5fd3b3", "#c58bff", "#ff7a6b", "#59c3ff", "#e5c34f", "#9be36b", "#ff8ad8"];
var nameColor = (name2) => NAME_COLORS[fnv1a(name2) % NAME_COLORS.length];
function stateSpans(timeline) {
  const out = {};
  const open = /* @__PURE__ */ new Map();
  for (const entry of [...timeline || []].sort((a, b) => a.fromTurn - b.fromTurn)) {
    const at2 = Number(entry.fromTurn) || 0;
    const names = new Set((entry.list || []).map((s) => s.name));
    for (const [name2, span] of open) if (!names.has(name2)) {
      span.to = at2;
      open.delete(name2);
    }
    for (const st of entry.list || []) {
      if (open.has(st.name)) continue;
      const span = { from: at2, to: null, tags: st.tags || "" };
      (out[st.name] = out[st.name] || []).push(span);
      open.set(st.name, span);
    }
  }
  return out;
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
var preset = (p4) => ({ positive: null, negative: null, cfg: null, cfgRescale: null, cover: "", ...p4 });
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
  return presets.find((p4) => p4.id === style?.current) || presets[0] || BUILTIN_STYLES[0];
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

// lib/blocking.js
var ALL2 = /* @__PURE__ */ new Set(["*", "全员", "全部", "所有人", "all"]);
var isEveryone = (name2) => ALL2.has(String(name2 || "").trim());
function reactsOf(line, onStage2 = [], speakers = []) {
  const out = [];
  const seen = new Set(speakers);
  for (const r of line && line.react || []) {
    const names = isEveryone(r.name) ? onStage2 : [r.name];
    for (const name2 of names) {
      if (!name2 || seen.has(name2)) continue;
      seen.add(name2);
      out.push({ name: name2, ...r.emo ? { emo: r.emo } : {}, ...r.sym ? { sym: r.sym } : {} });
    }
  }
  return out;
}
var REACT_KIND = {
  surprised: "jolt",
  scared: "jolt",
  shy: "shrink",
  blush: "shrink",
  love: "shrink",
  happy: "bounce",
  laugh: "bounce",
  smug: "bounce",
  teasing: "bounce",
  sad: "droop",
  cry: "droop",
  tired: "droop",
  worried: "droop",
  angry: "shake",
  pout: "shake",
  cold: "shake",
  confused: "tilt",
  thinking: "tilt"
};
var reactKind = (base) => REACT_KIND[base] || "nod";
function poseTracker() {
  let poses = /* @__PURE__ */ new Map();
  const get = (name2) => {
    if (!poses.has(name2)) poses.set(name2, { near: [], far: [], depth: 0, away: false, peek: false, down: false, behind: "" });
    return poses.get(name2);
  };
  const unlink = (a, b) => {
    for (const [x, y] of [[a, b], [b, a]]) {
      const p4 = poses.get(x);
      if (p4) {
        p4.near = p4.near.filter((n) => n !== y);
        p4.far = p4.far.filter((n) => n !== y);
      }
    }
  };
  const clear = (name2) => {
    poses.delete(name2);
    for (const p4 of poses.values()) {
      p4.near = p4.near.filter((n) => n !== name2);
      p4.far = p4.far.filter((n) => n !== name2);
      if (p4.behind === name2) p4.behind = "";
    }
  };
  return {
    newSet() {
      poses = /* @__PURE__ */ new Map();
    },
    /**
     * 这一拍：onStage 台上的人，left 这一拍下台的，speakers 说话的人，moves 导演写的走位，peeks 这一拍探头登场的人，
     * downs 这一拍被击倒的人，heals 这一拍被治疗的人（被击倒的站起来）。
     * 返回这一拍的 { poses: { 名字: 样子 }（只列跟平常不一样的）, moves: [{ name, act }]（这一拍发生的走位，剧场按它演一下）}。
     */
    step({ onStage: onStage2 = [], left = [], speakers = [], moves = [], peeks = [], downs = [], heals = [] }) {
      for (const name2 of left) clear(name2);
      const here = new Set(onStage2);
      for (const name2 of [...speakers, ...heals]) {
        const p4 = poses.get(name2);
        if (p4) {
          p4.peek = false;
          p4.down = false;
        }
      }
      const done = [];
      for (const m of moves) {
        const names = isEveryone(m.name) ? [...here].filter((name2) => !(poses.get(name2) && poses.get(name2).down)) : [m.name];
        for (const name2 of names) {
          if (!here.has(name2)) continue;
          const p4 = get(name2);
          p4.peek = false;
          p4.down = false;
          const to = m.to && m.to !== name2 && here.has(m.to) ? m.to : "";
          if (m.act === "reset") {
            clear(name2);
            done.push({ name: name2, act: "reset" });
            continue;
          }
          if (m.act === "forward" || m.act === "approach" || m.act === "apart" && to) p4.behind = "";
          if (m.act === "hide" && to) {
            for (const other of [...p4.near, ...p4.far]) unlink(name2, other);
            p4.behind = to;
            if (get(to).behind === name2) get(to).behind = "";
          } else if (m.act === "approach" && to) {
            unlink(name2, to);
            p4.near.push(to);
            get(to).near.push(name2);
          } else if (m.act === "apart" && to) {
            unlink(name2, to);
            p4.far.push(to);
            get(to).far.push(name2);
          } else if (m.act === "approach" || m.act === "forward") p4.depth = Math.min(1, p4.depth + 1);
          else if (m.act === "apart" || m.act === "back") p4.depth = Math.max(-1, p4.depth - 1);
          else if (m.act === "turn") p4.away = true;
          else if (m.act === "face" || m.act === "lookback") {
            p4.away = false;
            if (to && m.act === "face") get(to).away = false;
          } else continue;
          done.push(to ? { name: name2, act: m.act, to } : { name: name2, act: m.act });
        }
      }
      for (const name2 of peeks) if (here.has(name2)) get(name2).peek = true;
      for (const name2 of downs) if (here.has(name2)) get(name2).down = true;
      const out = {};
      for (const [name2, p4] of poses) {
        if (!here.has(name2)) continue;
        const near = p4.near.filter((n) => here.has(n));
        const far = p4.far.filter((n) => here.has(n));
        const behind = p4.behind && here.has(p4.behind) ? p4.behind : "";
        if (!near.length && !far.length && !p4.depth && !p4.away && !p4.peek && !p4.down && !behind) continue;
        out[name2] = { ...near.length ? { near } : {}, ...far.length ? { far } : {}, ...p4.depth ? { depth: p4.depth } : {}, ...p4.away ? { away: true } : {}, ...p4.peek ? { peek: true } : {}, ...p4.down ? { down: true } : {}, ...behind ? { behind } : {} };
      }
      return { poses: out, moves: done };
    }
  };
}
var NEAR_SHARE = 0.25;
var FAR_STEP = 9;
var PEEK_X = { left: 5, right: 95 };
var HIDE_STEP = 9;
function blockLayout(entries, poses) {
  if (!poses) return entries;
  const at2 = new Map(entries.map((e) => [e.name, e.x]));
  const placed = new Map(entries.map((e) => {
    const p4 = poses[e.name];
    if (!p4) return [e.name, e];
    let x = e.x;
    for (const other of p4.near || []) if (at2.has(other)) x += (at2.get(other) - e.x) * NEAR_SHARE;
    for (const other of p4.far || []) if (at2.has(other)) x += (e.x === at2.get(other) ? e.x < 50 ? -1 : 1 : Math.sign(e.x - at2.get(other))) * FAR_STEP;
    const peek = p4.peek ? e.x <= 50 ? "left" : "right" : "";
    if (peek) x = PEEK_X[peek];
    x = Math.round(Math.max(peek ? 4 : 10, Math.min(peek ? 96 : 90, x)) * 10) / 10;
    return [e.name, { ...e, x, ...p4.depth ? { depth: p4.depth } : {}, ...p4.away ? { away: true } : {}, ...peek ? { peek } : {}, ...p4.down ? { down: true } : {} }];
  }));
  const hidden = /* @__PURE__ */ new Set();
  const taken = /* @__PURE__ */ new Map();
  const hide = (name2, path = /* @__PURE__ */ new Set()) => {
    const e = placed.get(name2);
    const front = poses[name2] && poses[name2].behind;
    if (!front || hidden.has(name2) || !placed.has(front) || path.has(front)) return e;
    path.add(name2);
    const x0 = hide(front, path).x;
    const fits = (side2) => x0 + side2 * HIDE_STEP >= 10 && x0 + side2 * HIDE_STEP <= 90;
    const count = (side2) => taken.get(front + (side2 < 0 ? "<" : ">")) || 0;
    const away = Math.sign(at2.get(name2) - at2.get(front)) || (x0 < 50 ? 1 : -1);
    const side = [away, -away].filter(fits).sort((a, b) => count(a) - count(b))[0] || away;
    const x = Math.round(Math.max(10, Math.min(90, x0 + side * HIDE_STEP * (count(side) + 1))) * 10) / 10;
    taken.set(front + (side < 0 ? "<" : ">"), count(side) + 1);
    hidden.add(name2);
    placed.set(name2, { ...e, x, behind: front, hide: side < 0 ? "left" : "right" });
    return placed.get(name2);
  };
  for (const e of entries) hide(e.name);
  return entries.map((e) => placed.get(e.name));
}
function stackLayers(entries, front = []) {
  const own = (name2) => {
    const i = front.indexOf(name2);
    return i < 0 ? Infinity : i;
  };
  const byName = new Map(entries.map((e) => [e.name, e]));
  const hides = (e) => Boolean(e.behind) && e.behind !== e.name && byName.has(e.behind);
  const group = new Map(entries.map((e) => [e.name, own(e.name)]));
  for (const e of entries.filter(hides)) {
    let at2 = e;
    for (const seen = /* @__PURE__ */ new Set([e.name]); hides(at2) && !seen.has(at2.behind); seen.add(at2.name)) at2 = byName.get(at2.behind);
    group.set(at2.name, Math.min(group.get(at2.name), own(e.name)));
  }
  const recent = (name2) => group.get(name2);
  const backToFront = (a, b) => (a.e.depth || 0) - (b.e.depth || 0) || recent(b.e.name) - recent(a.e.name) || Math.abs((b.e.x ?? 50) - 50) - Math.abs((a.e.x ?? 50) - 50) || a.i - b.i;
  const sorted = entries.map((e, i) => ({ e, i })).sort(backToFront).map((o) => o.e);
  const order = sorted.filter((e) => !hides(e)).map((e) => e.name);
  let waiting = sorted.filter(hides);
  while (waiting.length) {
    const ready = waiting.filter((e) => order.includes(e.behind));
    if (!ready.length) {
      order.unshift(...waiting.map((e) => e.name));
      break;
    }
    for (const e of ready) order.splice(order.indexOf(e.behind), 0, e.name);
    waiting = waiting.filter((e) => !ready.includes(e));
  }
  return entries.map((e) => ({ ...e, z: order.indexOf(e.name) + 1 }));
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
var WEATHER_LABEL = { clear: "晴", rain: "雨", storm: "暴雨", snow: "雪", blizzard: "暴风雪", wind: "狂风", sakura: "樱吹雪", leaves: "落叶", fireflies: "萤火", fog: "雾", embers: "余烬", dust: "浮尘", bokeh: "光斑", stars: "星空", sparkles: "光点", bubbles: "气泡" };
var MOOD_LABEL = { daily: "日常", cheerful: "轻快", comic: "滑稽", sweet: "甜蜜", touching: "感动", calm: "静谧", solemn: "庄严", sad: "感伤", despair: "绝望", tense: "紧张", mystery: "悬疑", eerie: "诡异", battle: "激战", heroic: "热血", silence: "寂静" };
var LIGHT_LABEL = { normal: "", dim: "昏暗", dark: "熄灯", black: "漆黑", candle: "烛光", spot: "聚光", neon: "霓虹", screen: "屏幕光", alarm: "警报红光", moon: "月光", warm: "暖光", cold: "冷光", glare: "强光", flicker: "灯光闪烁" };
var FX_LABEL = { none: "", sway: "摇晃", ride: "颠簸", handheld: "手持", drift: "推近", woozy: "晕眩", heat: "热浪", underwater: "水下", rumble: "震动", speed: "疾驰", heartbeat: "心跳", slowmo: "慢动作", timestop: "时间停止" };
var MODE_LABEL = { ...MODE_NAMES, real: "回到现实" };
var CUT_LABEL = { time: "Time Skip", date: "Date", chapter: "Chapter", meanwhile: "Meanwhile" };
var VOICE_LABEL = { phone: "电话", radio: "广播", telepathy: "心灵感应", chorus: "齐声", offscreen: "画外音", echo: "回声", memory: "回忆", machine: "机械音" };
var CG_IN_LABEL = { dissolve: "溶入", slow: "慢慢溶入", black: "暗场后浮现", flash: "白闪", focus: "由虚到实", cut: "直接切入", impact: "冲击" };
var CG_OUT_LABEL = { dissolve: "溶回场景", slow: "慢慢淡去", black: "暗下去", flash: "白闪", cut: "直接切掉" };
var CG_MOTION_LABEL = { still: "静止", push: "极慢推近", pan: "横移一遍" };
var CARD_LABEL = { sms: "短信", letter: "信", note: "便条", news: "报纸", terminal: "终端", notice: "告示", diary: "日记", scroll: "卷轴" };
var POS_LABEL = { farleft: "最左", left: "左", center: "中", right: "右", farright: "最右" };
var CAMERA_LABEL = { shake: "震动", zoom: "推近", zoomout: "拉远", flash: "闪白", pan: "平移", blur: "虚焦", fadeblack: "黑场", redflash: "红闪", tilt: "倾斜", closeup: "特写", focus: "背景虚化", whip: "甩镜", sink: "下沉", rise: "升起", lowangle: "仰拍", dolly: "希区柯克变焦", empty: "空镜", slowpush: "缓推" };
var SYMBOL_LABEL = { heart: "爱心", anger: "怒筋", sweat: "汗滴", sparkle: "闪光", surprise: "惊叹", gloom: "阴云", note: "音符", zzz: "睡着", bulb: "灵光", heartbreak: "心碎", sigh: "叹气", dizzy: "眩晕", fire: "燃起", blush: "红晕", bloom: "开花", silence: "无语" };
var TRANSITION_LABEL = { dissolve: "溶解", fade: "慢慢变化", cinematic: "电影黑边", wipe: "横扫", iris: "圆形收缩", strips: "百叶", black: "黑场", flash: "白闪", blink: "闭眼睁眼", glitch: "画面撕裂", swirl: "旋转入梦", haze: "起雾", none: "直接切" };
var POS_X = { farleft: 14, left: 28, center: 50, right: 72, farright: 86 };
var EMPTY_SCENE = { ...SCENE_DEFAULTS, transition: "dissolve" };
function imageReady(img) {
  return img && img.current >= 0 && img.versions && img.versions[img.current];
}
function buildBeats(view) {
  const beats = [];
  if (!view) return { beats, byKey: /* @__PURE__ */ new Map() };
  let scene = EMPTY_SCENE;
  let layer = null;
  let cast = [];
  let inside = null;
  const emotions = {};
  const turns = view.turns || [];
  const images = view.images || [];
  let bgm = "";
  let amb = "";
  let shown = null;
  const active = /* @__PURE__ */ new Map();
  const spoke = /* @__PURE__ */ new Map();
  let recalled = null;
  let call2 = null;
  let set = 0;
  const drawn = new Set((view.cast || []).filter((p4) => Object.values(p4.sprites || {}).some((s) => s && s.assetId)).map((p4) => p4.name));
  const people = (view.cast || []).map((p4) => p4.name);
  turns.forEach((t, ti) => {
    const script = markRecalls(t.script, t.units);
    if (script && script.scene && script.scene.bgm) bgm = script.scene.bgm;
    if (script && script.scene && script.scene.amb) amb = script.scene.amb;
    if (script) scene = { ...EMPTY_SCENE, ...script.scene };
    const all = t.units || [];
    const units = playedUnits(all, script);
    const lines = units.map((u) => script && script.lines && script.lines[u.id] || {});
    const keep = script && layer && lines.length && lines[0].mode === layer.mode ? layer : null;
    if (call2 && !(script && lines.some((l) => l.phone || l.voice === "phone" || l.split || call2.who && speakersOf(l.sp).includes(call2.who)))) call2 = null;
    if (call2) call2 = { ...call2, live: true, unanswered: false };
    const walk = stageWalk(script, units, cast, keep ? inside : null, { walkOn: drawn, calling: call2 ? call2.who : "" });
    const known = [.../* @__PURE__ */ new Set([...(script && script.cast || []).map((c) => c.name), ...people])];
    const steps = walk.steps;
    cast = walk.end;
    inside = walk.inside;
    const scenes = walkScenes({ scene, bgm, amb, layer: keep }, lines);
    const recalls = recallRuns(script, units);
    const ahead = shiftsAhead(lines);
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
    let hush = 0;
    let split = null;
    const blocking = poseTracker();
    const exitWay = {};
    units.forEach((unit, ui2) => {
      const line = lines[ui2];
      const at2 = scenes[ui2];
      let speaker = "";
      const type = line.type || unit.type;
      if (type === "dialogue") {
        speaker = line.sp || (line.type ? "" : hintedSpeaker(unit.hint, known, lastSpeaker)) || lastSpeaker;
        lastSpeaker = speaker;
      } else if (type === "thought") speaker = line.sp || "我";
      else if (line.sp) speaker = line.sp;
      const speakers = speakersOf(speaker);
      if (line.emo) for (const name2 of speakers) emotions[name2] = line.emo;
      if (line.split === "off") split = null;
      else if (line.split) split = line.split;
      const cgEntry = [...turnImages].reverse().find((e) => e.at <= ui2 && ui2 <= e.end);
      const cg = cgEntry ? cgEntry.img : null;
      let enter = at2.moved;
      let transition = at2.transition;
      if (ui2 === 0) {
        const opened = !shown || placeKey(at2.scene) !== placeKey(shown.scene) || at2.scene.bg !== shown.scene.bg || at2.mode !== shown.mode;
        enter = !shown || at2.scene.location !== shown.scene.location || at2.mode !== shown.mode;
        const opening = scene.transition && scene.transition !== "none" ? scene.transition : "dissolve";
        transition = !opened ? "" : at2.transition || (at2.mode && (!shown || at2.mode !== shown.mode) ? MODE_TRANSITION[at2.mode] : enter ? opening : "fade");
      }
      shown = at2;
      if (enter) {
        set += 1;
        blocking.newSet();
      }
      const onStageNames = steps[ui2].cast.map((c) => c.name);
      const reacts = reactsOf(line, onStageNames, speakers);
      for (const r of reacts) if (r.emo) emotions[r.name] = r.emo;
      const ways = Object.fromEntries((line.enter || []).filter((e) => e.how && steps[ui2].entered.includes(e.name)).map((e) => [e.name, e.how]));
      Object.assign(exitWay, line.exitHow || {});
      const gone = {};
      for (const name2 of steps[ui2].left) if (exitWay[name2]) {
        gone[name2] = exitWay[name2];
        delete exitWay[name2];
      }
      const hit = line.hit || null;
      const target = hit && hit.to && onStageNames.includes(hit.to) ? [hit.to] : [];
      const block = blocking.step({ onStage: onStageNames, left: steps[ui2].left, speakers: type === "narration" ? [] : speakers, moves: line.move || [], peeks: Object.keys(ways).filter((name2) => ways[name2] === "peek"), downs: hit && hit.effect === "down" ? target : [], heals: hit && hit.effect === "heal" ? target : [] });
      for (const name2 of [...speakers, ...steps[ui2].entered, ...reacts.map((r) => r.name), ...block.moves.map((m) => m.name), ...hit ? [hit.from, hit.to].filter((n) => n && onStageNames.includes(n)) : []]) active.set(name2, beats.length);
      for (const name2 of speakers) spoke.set(name2, beats.length);
      const front = onStageNames.filter((name2) => spoke.has(name2)).sort((a, b) => spoke.get(b) - spoke.get(a));
      const recall = recalls[ui2];
      if (recall && !recall.tone) recall.tone = autoRecallTone(recall.emos.map((e) => ((view.emotions || []).find((x) => x.id === e) || {}).base || e), at2.scene.mood);
      const phone = line.phone || null;
      if (call2 && call2.who && steps[ui2].entered.includes(call2.who)) call2 = null;
      const before = call2;
      let phoneEdge = null;
      if (phone && (phone.kind === "call" || phone.kind === "dial")) {
        const next = lines.slice(ui2 + 1).find((l) => l.phone && ["call", "dial", "end"].includes(l.phone.kind));
        const unanswered = Boolean(next && next.phone.kind === "end" && (next.phone.result === "missed" || next.phone.result === "declined"));
        call2 = { who: phone.who || "", ...phone.video ? { video: true } : {}, dir: phone.kind === "call" ? "in" : "out", id: `${t.turn}:${unit.id}`, live: false, unanswered };
        phoneEdge = phone;
      } else if (phone && phone.kind === "end") {
        const was = call2 || {};
        if (call2 || phone.who) phoneEdge = { kind: "end", who: phone.who || was.who || "", ...was.id ? { id: was.id } : {}, ...was.dir ? { dir: was.dir } : {}, ...was.video ? { video: true } : {}, ...was.live ? { live: true } : {}, ...phone.result ? { result: phone.result } : {} };
        call2 = null;
      } else if (phone) phoneEdge = phone;
      const calling = call2 ? { who: call2.who, ...call2.video ? { video: true } : {}, dir: call2.dir, id: call2.id, state: call2.live ? "live" : "ringing" } : null;
      if (call2 && !call2.unanswered) call2.live = true;
      const caller = (before || calling || {}).who;
      const onPhone = Boolean(caller) && type === "dialogue" && speakers.includes(caller) && !onStageNames.includes(caller);
      const voice = recall && type !== "narration" && (!line.voice || line.voice === "echo") ? "memory" : line.voice || (onPhone ? "phone" : "");
      const recallEdge = recall === recalled ? "" : recall ? "in" : "out";
      recalled = recall;
      if (hush && (line.bgm || at2.moved || at2.cut)) hush = 0;
      if (line.bgm === "hush") hush = HUSH_BEATS;
      const hushed = hush ? hush === HUSH_BEATS ? "start" : "on" : "";
      if (hush) hush--;
      beats.push({
        key: `${t.turn}:${unit.id}`,
        turn: t.turn,
        textVersion: t.textVersion,
        unitId: unit.id,
        type,
        text: unit.text,
        ...unit.orig ? { orig: unit.orig } : {},
        // 双语对照的原文（剧场上方小字）
        speaker,
        ...speakers.length > 1 ? { speakers } : {},
        // 齐声：几个人一起高亮
        ...voice ? { voice } : {},
        // 声音的样子：电话里、广播、心灵感应……
        ...split ? { split } : {},
        alias: line.as || "",
        emo: line.emo || "",
        sym: line.sym || "",
        cam: line.cam || "",
        ...line.camOn ? { camOn: line.camOn } : {},
        // 镜头对准谁（不写是说话的人）
        ...hit ? { hit } : {},
        // 一次出手：被打的人一震
        ...line.moment ? { moment: line.moment } : {},
        // 小瞬间：拍照、摸头、干杯、约定……
        ...calling ? { call: calling } : {},
        // 正在打的电话：响着（ringing）还是接通了（live）
        ...phoneEdge ? { phone: phoneEdge } : {},
        // 手机这一句的事：来电、拨出、挂断、通知、语音留言
        say: line.say || "",
        stress: line.stress || "",
        ...line.textfx ? { textfx: line.textfx } : {},
        // 句中文字效果：某几个字发抖、放大、越说越小……
        card: line.card || "",
        scene: at2.scene,
        mode: at2.mode,
        ...at2.layer && at2.layer.then ? { then: at2.layer.then } : {},
        // 段落里的人当时的样子（回忆里还没受伤、穿着当时的衣服……）
        ...ahead[ui2] ? { ahead: ahead[ui2] } : {},
        // 这一轮后面才变的样子（之后才缠上发带、才换衣服）：这一拍按变化之前的
        ...at2.cut ? { cut: at2.cut } : {},
        ...recall ? { recall } : {},
        // 短闪回：现在的画面压暗，这一段开口的人以当时的样子浮在前面
        ...recallEdge ? { recallEdge } : {},
        bgm: at2.bgm,
        ...hushed ? { hush: hushed } : {},
        // 配乐留白：start 是停下的那一句，on 是还没回来
        amb: at2.amb,
        sfx: line.sfx || "",
        ...line.peak ? { peak: line.peak } : {},
        // 高潮那一下：climax / cum / both（lib/eros.js）
        ...line.pause ? { pause: line.pause } : {},
        // 「間」：这句的字出来之前先停一下
        sceneEnter: enter,
        set,
        transition,
        cast: steps[ui2].cast,
        recent: steps[ui2].cast.map((c) => c.name).sort((a, b) => (active.get(b) ?? -1) - (active.get(a) ?? -1)),
        // 台上的人，最近有动静的在前
        ...front.length ? { front } : {},
        // 台上开过口的人，最近开口的在前：谁挡在谁前面（lib/blocking.js 的 stackLayers）
        entered: steps[ui2].entered,
        left: steps[ui2].left,
        ...reacts.length ? { reacts } : {},
        // 没在说话的人的反应 [{ name, emo, sym }]
        ...Object.keys(block.poses).length ? { poses: block.poses } : {},
        // 走位：每个人现在的样子（靠近谁、上前、背对……）
        ...block.moves.length ? { moves: block.moves } : {},
        // 这一拍发生的走位
        ...Object.keys(ways).length ? { enterHow: ways } : {},
        // 跑进来、探头、慢慢走进来
        ...Object.keys(gone).length ? { exitHow: gone } : {},
        // 甩头离开、跑开、慢慢走远
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
    const last = scenes[scenes.length - 1];
    if (last) {
      scene = { ...last.real.scene, eros: "none", tentacle: "none", transition: "dissolve" };
      bgm = last.real.bgm;
      amb = last.real.amb;
      layer = last.layer;
    } else layer = null;
  });
  return { beats, byKey: new Map(beats.map((b, i) => [b.key, i])) };
}
function actorX(pos) {
  return POS_X[pos] ?? 50;
}
function hintedSpeaker(hint, known, last) {
  if (!hint) return "";
  if (known.includes(hint)) return hint;
  const head = known.filter((name2) => name2 && hint.startsWith(name2)).sort((a, b) => b.length - a.length)[0];
  if (head) return head;
  return [...hint].length > 4 ? last || "" : hint;
}
function onStage(cast, recent, max) {
  const main = cast.filter((c) => !c.extra);
  if (!max || main.length <= max) return cast;
  const keep = new Set((recent || []).filter((name2) => main.some((c) => c.name === name2)).concat(main.map((c) => c.name)).slice(0, max));
  return cast.filter((c) => c.extra || keep.has(c.name));
}
var SPREAD = [0, 0, 20, 30, 36, 38];
var SHRINK = [1, 1, 1, 1, 0.92, 0.84, 0.76, 0.7, 0.64];
function stageLayout(cast) {
  const n = cast.length;
  if (n <= 1) return cast.map((c) => ({ ...c, x: actorX(c.pos), scale: 1 }));
  const half = SPREAD[Math.min(n, SPREAD.length - 1)];
  const scale = SHRINK[Math.min(n, SHRINK.length - 1)];
  const order = cast.map((c, i) => ({ name: c.name, x: actorX(c.pos), i })).sort((a, b) => a.x - b.x || a.i - b.i).map((c) => c.name);
  return cast.map((c) => ({ ...c, x: Math.round((50 - half + 2 * half * order.indexOf(c.name) / (n - 1)) * 10) / 10, scale }));
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
var CG_IN_MS = { dissolve: 800, quick: 400, slow: 1500, black: 1800, flash: 600, focus: 1500, cut: 0, impact: 600 };
var CG_OUT_MS = { dissolve: 800, quick: 400, slow: 1500, black: 1500, flash: 600, cut: 0 };
var SLOW_MOODS = /* @__PURE__ */ new Set(["sad", "touching", "calm", "solemn", "despair", "silence"]);
var QUICK_MOODS = /* @__PURE__ */ new Set(["comic", "cheerful", "battle"]);
var paced = (mood) => SLOW_MOODS.has(mood) ? "slow" : QUICK_MOODS.has(mood) ? "quick" : "dissolve";
var cgEntrance = (img, mood) => cgIn(img && img.enter) || paced(mood);
var cgExit = (img, mood) => cgOut(img && img.leave) || paced(mood);
var cgStay = (img) => cgMotion(img && img.motion) || "still";
var CG_BEAT_MS = 150;
function cgHoldMs(img, mood) {
  return CG_IN_MS[cgEntrance(img, mood)] + CG_BEAT_MS;
}
var TRANSITION_MS = { dissolve: 1100, fade: 2600, cinematic: 1500, wipe: 1e3, iris: 1200, strips: 800, black: 1800, flash: 1e3, blink: 1500, glitch: 700, swirl: 1900, haze: 2600, wake: 1900, none: 0 };
var PAUSE_MS = { beat: 900, silence: 2400 };
var HIT_IMPACT_MS = 420;
var HIT_LEAD_MS = 700;
var MOMENT_LEAD_MS = { photo: 650, fireworks: 900, cook: 450, nickname: 600, promise: 600, contact: 450 };
var PHONE_LEAD_MS = { call: 1e3, dial: 800 };
var HUSH_BEATS = 5;
var HUSH_LEAD_MS = 700;
var PEAK_LEAD_MS = { climax: 650, cum: 420, both: 650 };
var SCENE_BEAT_MS = 300;
var WAKE_SWAP_MS = 1700;
var WAKE_MS = 3600;
var WAKE_FROM = /* @__PURE__ */ new Set(["haze", "dissolve", "fade"]);
var SCENE_CLEAR_MS = 350;
var SCENE_CAST_MS = 450;
var COVERS = {
  black: { cover: "black", clear: true, up: 700, hold: 400, down: 900 },
  flash: { cover: "white", clear: false, up: 120, hold: 150, down: 650 },
  blink: { cover: "lids", clear: false, up: 800, hold: 300, down: 1400 },
  glitch: { cover: "glitch", clear: false, up: 300, hold: 0, down: 400 },
  swirl: { cover: "swirl", clear: true, up: 900, hold: 200, down: 900 }
};
var CUT_COVER = { cover: "black", clear: true, up: 700, hold: 2300, down: 1e3 };
var OPEN_COVER = { cover: "black", clear: true, up: 0, hold: 300, down: 1e3 };
var JUMP_COVER = { cover: "black", clear: false, up: 250, hold: 150, down: 450 };
var OWN_WAY = /* @__PURE__ */ new Set(["haze", "wake"]);
function changePlan(beat, was = {}, { opening = false, shown = null } = {}) {
  if (!beat || !beat.scene) return null;
  const moved = !opening && beat.sceneEnter && (beat.scene.location !== was.place || (beat.mode || "") !== (was.mode || ""));
  const tr = beat.transition || "";
  const waking = !opening && !beat.cut && was.mode === "memory" && (beat.mode || "") !== "memory" && WAKE_FROM.has(tr);
  const own = opening || beat.cut || moved && tr !== "none" && !OWN_WAY.has(tr) && !waking;
  const jump = !own && Boolean(shown) && !waking && !(moved && (tr === "none" || OWN_WAY.has(tr))) && (beat.scene.location !== shown.place || (beat.mode || "") !== (shown.mode || ""));
  if (!own && !jump) return null;
  if (opening && tr === "none" && !beat.cut) return null;
  const shape = jump ? JUMP_COVER : opening ? beat.cut ? { ...CUT_COVER, up: 0 } : OPEN_COVER : beat.cut ? CUT_COVER : COVERS[tr] || { cover: "", clear: true, up: 0, hold: 0, down: TRANSITION_MS[tr] || TRANSITION_MS.dissolve };
  const steps = [];
  let t = 0;
  const step2 = (name2, ms) => {
    if (ms > 0) {
      steps.push([name2, t]);
      t += ms;
    }
  };
  if (!opening) step2("clear", shape.clear ? SCENE_CLEAR_MS : 0);
  step2("up", shape.up);
  const swap = t;
  step2("hold", shape.hold);
  step2("down", shape.down);
  step2("cast", shape.clear ? SCENE_CAST_MS : 0);
  step2("settle", SCENE_BEAT_MS);
  return { tr: jump || opening && !COVERS[tr] ? "black" : tr, cover: shape.cover, clear: shape.clear, up: shape.up, hold: shape.hold, down: shape.down, steps, swap, total: t, ...beat.cut ? { cut: true } : {}, ...opening ? { opening: true } : {}, ...jump ? { jump: true } : {} };
}
function beatHold(beat, { cg = "", was = {}, eros = true, opening = false, shown = null } = {}) {
  let ms = 0, away = false;
  if (cg && cg !== was.cg && !beat.cut) {
    ms = Math.max(ms, cgHoldMs(beat.cg, beat.scene.mood));
    away = true;
  }
  const change = changePlan(beat, was, { opening, shown });
  if (change) {
    ms = Math.max(ms, change.total);
    away = true;
  }
  if (PAUSE_MS[beat.pause]) {
    ms = Math.max(ms, PAUSE_MS[beat.pause]);
    if (beat.pause === "silence") away = true;
  }
  if (beat.hit) ms = Math.max(ms, HIT_LEAD_MS);
  if (beat.moment) ms = Math.max(ms, MOMENT_LEAD_MS[beat.moment.kind] || 0);
  if (beat.phone) ms = Math.max(ms, PHONE_LEAD_MS[beat.phone.kind] || 0);
  if (beat.hush === "start") ms = Math.max(ms, HUSH_LEAD_MS);
  if (eros && beat.peak) ms = Math.max(ms, PEAK_LEAD_MS[beat.peak] || 0);
  const wake = !opening && was.mode === "memory" && (beat.mode || "") !== "memory" && !beat.cut && WAKE_FROM.has(beat.transition);
  if (wake) {
    ms = Math.max(ms, WAKE_MS);
    away = true;
  }
  return { ms, away, ...wake ? { wake } : {}, ...change ? { change } : {} };
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
var COUNTS = { rain: 220, storm: 380, snow: 140, blizzard: 420, wind: 70, sakura: 70, leaves: 40, fireflies: 46, embers: 90, dust: 60, bokeh: 26, stars: 160, fog: 6, sparkles: 60, bubbles: 50 };
var rand = (a, b) => a + Math.random() * (b - a);
function spawn(kind, w, h, initial) {
  const p4 = { x: rand(0, w), y: initial ? rand(0, h) : rand(-h * 0.2, -10), life: 0 };
  switch (kind) {
    case "rain":
    case "storm":
      return { ...p4, vx: kind === "storm" ? -7 : -2.4, vy: rand(16, 26) * (kind === "storm" ? 1.25 : 1), len: rand(12, 26), a: rand(0.18, 0.45) };
    case "snow":
      return { ...p4, vx: rand(-0.4, 0.4), vy: rand(0.5, 1.6), r: rand(1, 3.6), a: rand(0.5, 0.95), ph: rand(0, 6.28) };
    case "blizzard":
      return { ...p4, x: initial ? rand(0, w) : rand(-w * 0.1, w * 1.2), vx: -rand(5, 11), vy: rand(2.2, 4.5), r: rand(0.8, 2.8), a: rand(0.45, 0.95), ph: rand(0, 6.28) };
    case "wind": {
      const len = rand(60, 180);
      return { ...p4, x: initial ? rand(0, w) : -len - rand(0, w * 0.5), y: rand(0, h), vx: rand(16, 30), vy: rand(0.6, 2), len, a: rand(0.05, 0.16) };
    }
    case "sparkles":
      return { ...p4, y: initial ? rand(0, h) : h + 10, vx: rand(-0.2, 0.2), vy: -rand(0.15, 0.6), r: rand(1.5, 4.2), ph: rand(0, 6.28), sp: rand(0.03, 0.08), hue: Math.random() < 0.6 ? rand(40, 55) : rand(180, 220) };
    case "bubbles":
      return { ...p4, y: initial ? rand(0, h) : h + 12, vx: rand(-0.2, 0.2), vy: -rand(0.5, 1.8), r: rand(1.6, 8), ph: rand(0, 6.28) };
    case "sakura":
    case "leaves":
      return { ...p4, x: rand(-w * 0.2, w), vx: rand(0.6, 1.8), vy: rand(0.7, 1.7), r: rand(5, 10) * (kind === "leaves" ? 1.3 : 1), rot: rand(0, 6.28), vr: rand(-0.05, 0.05), ph: rand(0, 6.28), hue: kind === "leaves" ? rand(18, 44) : rand(330, 352) };
    case "fireflies":
      return { ...p4, y: initial ? rand(h * 0.3, h) : rand(h * 0.4, h), vx: rand(-0.3, 0.3), vy: rand(-0.3, 0.2), r: rand(1.2, 2.6), ph: rand(0, 6.28) };
    case "embers":
      return { ...p4, y: initial ? rand(0, h) : h + 10, vx: rand(-0.4, 0.6), vy: -rand(0.6, 2.2), r: rand(0.8, 2.2), ph: rand(0, 6.28) };
    case "dust":
      return { ...p4, y: rand(0, h), vx: rand(-0.15, 0.15), vy: rand(-0.12, 0.12), r: rand(0.6, 1.6), ph: rand(0, 6.28) };
    case "bokeh":
      return { ...p4, y: rand(0, h), vx: rand(-0.12, 0.12), vy: rand(-0.18, -0.04), r: rand(14, 46), hue: rand(0, 360), ph: rand(0, 6.28) };
    case "stars":
      return { ...p4, y: rand(0, h * 0.65), r: rand(0.4, 1.5), ph: rand(0, 6.28), sp: rand(0.01, 0.05) };
    case "fog":
      return { ...p4, y: rand(h * 0.35, h * 0.9), vx: rand(0.15, 0.4), r: rand(w * 0.25, w * 0.45), a: rand(0.06, 0.13) };
    default:
      return p4;
  }
}
function step(kind, p4, w, h, t, ctx2, k = 1) {
  switch (kind) {
    case "rain":
    case "storm": {
      p4.x += p4.vx * k;
      p4.y += p4.vy * k;
      ctx2.strokeStyle = `rgba(200, 220, 255, ${p4.a})`;
      ctx2.lineWidth = 1;
      ctx2.beginPath();
      ctx2.moveTo(p4.x, p4.y);
      ctx2.lineTo(p4.x + p4.vx * 1.6 * Math.max(0.12, k), p4.y - p4.len * Math.max(0.12, k));
      ctx2.stroke();
      return p4.y < h + 30;
    }
    case "snow": {
      p4.ph += 0.02 * k;
      p4.x += (p4.vx + Math.sin(p4.ph) * 0.4) * k;
      p4.y += p4.vy * k;
      ctx2.fillStyle = `rgba(255, 255, 255, ${p4.a})`;
      ctx2.beginPath();
      ctx2.arc(p4.x, p4.y, p4.r, 0, 6.283);
      ctx2.fill();
      return p4.y < h + 10;
    }
    case "blizzard": {
      p4.ph += 0.05 * k;
      p4.x += (p4.vx + Math.sin(p4.ph) * 0.8) * k;
      p4.y += p4.vy * k;
      ctx2.fillStyle = `rgba(245, 248, 255, ${p4.a})`;
      ctx2.beginPath();
      ctx2.arc(p4.x, p4.y, p4.r, 0, 6.283);
      ctx2.fill();
      return p4.y < h + 10 && p4.x > -20;
    }
    case "wind": {
      p4.x += p4.vx * k;
      p4.y += p4.vy * k;
      const g = ctx2.createLinearGradient(p4.x - p4.len, p4.y - p4.len * 0.07, p4.x, p4.y);
      g.addColorStop(0, "rgba(235, 240, 255, 0)");
      g.addColorStop(1, `rgba(235, 240, 255, ${p4.a})`);
      ctx2.strokeStyle = g;
      ctx2.lineWidth = 1.2;
      ctx2.beginPath();
      ctx2.moveTo(p4.x - p4.len, p4.y - p4.len * 0.07);
      ctx2.lineTo(p4.x, p4.y);
      ctx2.stroke();
      return p4.x - p4.len < w + 10;
    }
    case "sparkles": {
      p4.ph += p4.sp * k;
      p4.x += (p4.vx + Math.sin(p4.ph * 0.6) * 0.2) * k;
      p4.y += p4.vy * k;
      const a = Math.max(0, Math.sin(p4.ph)) * 0.9;
      if (a > 0.02) {
        const r = p4.r * (0.6 + a * 0.6);
        ctx2.fillStyle = `hsla(${p4.hue}, 100%, 85%, ${a})`;
        ctx2.beginPath();
        ctx2.moveTo(p4.x, p4.y - r * 2);
        ctx2.lineTo(p4.x + r * 0.35, p4.y - r * 0.35);
        ctx2.lineTo(p4.x + r * 2, p4.y);
        ctx2.lineTo(p4.x + r * 0.35, p4.y + r * 0.35);
        ctx2.lineTo(p4.x, p4.y + r * 2);
        ctx2.lineTo(p4.x - r * 0.35, p4.y + r * 0.35);
        ctx2.lineTo(p4.x - r * 2, p4.y);
        ctx2.lineTo(p4.x - r * 0.35, p4.y - r * 0.35);
        ctx2.closePath();
        ctx2.fill();
        const g = ctx2.createRadialGradient(p4.x, p4.y, 0, p4.x, p4.y, r * 3);
        g.addColorStop(0, `hsla(${p4.hue}, 100%, 80%, ${a * 0.35})`);
        g.addColorStop(1, `hsla(${p4.hue}, 100%, 80%, 0)`);
        ctx2.fillStyle = g;
        ctx2.beginPath();
        ctx2.arc(p4.x, p4.y, r * 3, 0, 6.283);
        ctx2.fill();
      }
      return p4.y > -20;
    }
    case "bubbles": {
      p4.ph += 0.04 * k;
      p4.x += (p4.vx + Math.sin(p4.ph) * 0.5) * k;
      p4.y += p4.vy * k;
      ctx2.strokeStyle = "rgba(220, 250, 255, .45)";
      ctx2.lineWidth = 1;
      ctx2.beginPath();
      ctx2.arc(p4.x, p4.y, p4.r, 0, 6.283);
      ctx2.stroke();
      ctx2.fillStyle = "rgba(255, 255, 255, .55)";
      ctx2.beginPath();
      ctx2.arc(p4.x - p4.r * 0.35, p4.y - p4.r * 0.35, p4.r * 0.25, 0, 6.283);
      ctx2.fill();
      return p4.y > -p4.r - 4;
    }
    case "sakura":
    case "leaves": {
      p4.ph += 0.03 * k;
      p4.rot += p4.vr * k;
      p4.x += (p4.vx + Math.sin(p4.ph) * 0.8) * k;
      p4.y += p4.vy * k;
      ctx2.save();
      ctx2.translate(p4.x, p4.y);
      ctx2.rotate(p4.rot);
      ctx2.scale(1, Math.abs(Math.sin(p4.ph)) * 0.6 + 0.4);
      ctx2.fillStyle = kind === "leaves" ? `hsla(${p4.hue}, 75%, 48%, .85)` : `hsla(${p4.hue}, 90%, 86%, .9)`;
      ctx2.beginPath();
      ctx2.moveTo(0, -p4.r);
      ctx2.bezierCurveTo(p4.r, -p4.r * 0.6, p4.r * 0.7, p4.r * 0.6, 0, p4.r);
      ctx2.bezierCurveTo(-p4.r * 0.7, p4.r * 0.6, -p4.r, -p4.r * 0.6, 0, -p4.r);
      ctx2.fill();
      ctx2.restore();
      return p4.y < h + 20 && p4.x < w + 30;
    }
    case "fireflies": {
      p4.ph += 0.03 * k;
      p4.x += (p4.vx + Math.sin(p4.ph * 0.7) * 0.3) * k;
      p4.y += (p4.vy + Math.cos(p4.ph * 0.5) * 0.2) * k;
      const a = 0.35 + Math.sin(p4.ph * 2) * 0.35;
      const g = ctx2.createRadialGradient(p4.x, p4.y, 0, p4.x, p4.y, p4.r * 6);
      g.addColorStop(0, `rgba(230, 255, 150, ${a})`);
      g.addColorStop(1, "rgba(230, 255, 150, 0)");
      ctx2.fillStyle = g;
      ctx2.beginPath();
      ctx2.arc(p4.x, p4.y, p4.r * 6, 0, 6.283);
      ctx2.fill();
      return p4.x > -20 && p4.x < w + 20 && p4.y > -20 && p4.y < h + 20;
    }
    case "embers": {
      p4.ph += 0.05 * k;
      p4.x += (p4.vx + Math.sin(p4.ph) * 0.5) * k;
      p4.y += p4.vy * k;
      ctx2.fillStyle = `rgba(255, ${140 + Math.sin(p4.ph) * 60}, 60, ${0.5 + Math.sin(p4.ph * 1.7) * 0.4})`;
      ctx2.beginPath();
      ctx2.arc(p4.x, p4.y, p4.r, 0, 6.283);
      ctx2.fill();
      return p4.y > -10;
    }
    case "dust": {
      p4.ph += 0.01 * k;
      p4.x += p4.vx * k;
      p4.y += p4.vy * k;
      ctx2.fillStyle = `rgba(255, 245, 220, ${0.25 + Math.sin(p4.ph * 3) * 0.2})`;
      ctx2.beginPath();
      ctx2.arc(p4.x, p4.y, p4.r, 0, 6.283);
      ctx2.fill();
      return p4.x > -10 && p4.x < w + 10 && p4.y > -10 && p4.y < h + 10;
    }
    case "bokeh": {
      p4.ph += 0.01 * k;
      p4.x += p4.vx * k;
      p4.y += p4.vy * k;
      const g = ctx2.createRadialGradient(p4.x, p4.y, 0, p4.x, p4.y, p4.r);
      const a = 0.08 + Math.sin(p4.ph) * 0.05;
      g.addColorStop(0, `hsla(${p4.hue}, 90%, 75%, ${a + 0.06})`);
      g.addColorStop(0.7, `hsla(${p4.hue}, 90%, 70%, ${a})`);
      g.addColorStop(1, `hsla(${p4.hue}, 90%, 70%, 0)`);
      ctx2.fillStyle = g;
      ctx2.beginPath();
      ctx2.arc(p4.x, p4.y, p4.r, 0, 6.283);
      ctx2.fill();
      return p4.y > -p4.r;
    }
    case "stars": {
      p4.ph += p4.sp * k;
      ctx2.fillStyle = `rgba(255, 255, 255, ${0.3 + Math.abs(Math.sin(p4.ph)) * 0.7})`;
      ctx2.beginPath();
      ctx2.arc(p4.x, p4.y, p4.r, 0, 6.283);
      ctx2.fill();
      return true;
    }
    case "fog": {
      p4.x += p4.vx * k;
      const g = ctx2.createRadialGradient(p4.x, p4.y, 0, p4.x, p4.y, p4.r);
      g.addColorStop(0, `rgba(230, 235, 245, ${p4.a})`);
      g.addColorStop(1, "rgba(230, 235, 245, 0)");
      ctx2.fillStyle = g;
      ctx2.fillRect(p4.x - p4.r, p4.y - p4.r, p4.r * 2, p4.r * 2);
      if (p4.x - p4.r > w) p4.x = -p4.r;
      return true;
    }
    default:
      return false;
  }
}
function Particles({ weather, enabled = true, speed = 1 }) {
  const ref = import_react2.default.useRef(null);
  const want = import_react2.default.useRef(speed);
  want.current = speed;
  import_react2.default.useEffect(() => {
    const canvas = ref.current;
    const kind = weather;
    if (!canvas || !enabled || !COUNTS[kind]) return void 0;
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return void 0;
    const ctx2 = canvas.getContext("2d");
    let w = 0, h = 0, raf = 0, flash = 0, k = want.current;
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
      k += (want.current - k) * 0.06;
      if (Math.abs(want.current - k) < 2e-3) k = want.current;
      if (kind === "storm") {
        if (flash <= 0 && Math.random() < 4e-3 * k) flash = 1;
        if (flash > 0) {
          ctx2.fillStyle = `rgba(220, 230, 255, ${flash * 0.35})`;
          ctx2.fillRect(0, 0, w, h);
          flash -= 0.06;
        }
      }
      const next = [];
      for (const p4 of list2) if (step(kind, p4, w, h, t, ctx2, k)) next.push(p4);
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
  "\\b(?:smil(?:e|ing)|smirk(?:ing)?|grin(?:ning)?|frown(?:ing)?|pout(?:ing)?|blush(?:ing)?|tears?|teary|tearing up|teardrops?|crying|sobbing|laugh(?:ing)?|giggl(?:e|ing)|scowl(?:ing)?|sneer(?:ing)?|winc(?:e|ing)|sigh(?:ing)?|gasp(?:ing)?|squint(?:ing)?|yawn(?:ing)?)\\b",
  "\\b(?:teeth|lips?|mouth|tongue|fangs?|cheeks?|eyebrows?|brows?|glar(?:e|ing)|wink(?:ing)?|star(?:e|ing)|gaze|glance|pupils|sweat(?:drop|ing)?|expression(?:less)?)\\b",
  "\\b(?:closed|half-closed|narrowed|downcast|squinting|sparkling|empty|half-lidded|watery|teary|rolling|averted|averting|crazy|shaded|cold|gentle|sleepy|tired|wide|dull|glazed|shining|soft|lowered)[ -]eyes?\\b",
  "\\beyes? (?:closed|open|widened|narrowed|shut|lowered)\\b",
  "wide-eyed",
  "bags under eyes",
  "eye contact",
  "^looking (?:at viewer|at another|away|down|up|to the side|back|afar)$",
  "^sideways glance$",
  "^[:;=>^@x-][a-z3<>^_;@\\-o]{0,2}$"
].join("|"));
var snap8 = (v) => Math.round(v / 8) * 8;
function cleanFaceBox(box, width, height) {
  const [x0, y0, x1, y1] = (Array.isArray(box) ? box : []).map(Number);
  if (![x0, y0, x1, y1, width, height].every(Number.isFinite)) return null;
  const b = [Math.max(0, snap8(Math.min(x0, x1))), Math.max(0, snap8(Math.min(y0, y1))), Math.min(width, snap8(Math.max(x0, x1))), Math.min(height, snap8(Math.max(y0, y1)))];
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

// lib/camera.js
var CAM_AIM = { zoom: [1.12, 0.4], closeup: [1.6, 1], lowangle: [1.24, 0.6], slowpush: [1.08, 0.5], focus: [1.04, 0.3] };
var CAM_CENTER = [50, 36];
var pct = (v) => Math.round(v * 100) / 100 + "%";
function aimCamera(cam, face) {
  const spec = CAM_AIM[cam];
  if (!spec) return null;
  const [zs, pull] = spec;
  if (!face) return { "--zs": zs, "--tx": "0%", "--ty": "0%" };
  const half = 50 / zs;
  const [tx, ty] = [0, 1].map((i) => {
    const want = face[i] + (CAM_CENTER[i] - face[i]) * pull;
    const center2 = Math.min(100 - half, Math.max(half, face[i] - (want - 50) / zs));
    return pct(50 - center2);
  });
  return { "--zs": zs, "--tx": tx, "--ty": ty };
}

// lib/foley.js
var p2 = (wave, f, dur, gain, more = {}) => ({ wave, f, dur, gain, ...more });
var crackle = (n, start, gap) => Array.from({ length: n }, (_, i) => p2("noise", 3e3 + i % 3 * 900, 0.03, 0.05 + i % 2 * 0.02, { q: 2.5, at: start + i * gap * (0.7 + i * 7 % 5 / 8) }));
var ringtone = (start) => [1319, 1568, 1976, 1568].flatMap((f, i) => [p2("sine", f, 0.17, 0.06, { attack: 3e-3, at: start + i * 0.12 }), p2("triangle", f / 2, 0.12, 0.025, { attack: 3e-3, at: start + i * 0.12 })]);
var FOLEY = Object.freeze({
  // 快门：咔、嚓两声，带一点机械的高音
  shutter: [p2("noise", 4200, 0.035, 0.22, { q: 1.4 }), p2("square", 1800, 0.02, 0.015, { attack: 1e-3, lp: 3200 }), p2("noise", 2600, 0.05, 0.16, { q: 1.1, at: 0.085 })],
  // 心动：两下轻轻的心跳，再一声很轻的铃
  heartbeat: [p2("sine", 64, 0.16, 0.3, { to: 48 }), p2("sine", 64, 0.2, 0.24, { to: 46, at: 0.22 }), p2("sine", 1568, 0.9, 0.025, { at: 0.36 }), p2("sine", 2093, 0.8, 0.02, { at: 0.44 })],
  // 摸头：噗、噗两下软软的
  pat: [p2("sine", 340, 0.09, 0.13, { to: 230, attack: 4e-3 }), p2("noise", 900, 0.05, 0.04, { q: 0.8 }), p2("sine", 340, 0.09, 0.11, { to: 230, attack: 4e-3, at: 0.24 }), p2("noise", 900, 0.05, 0.035, { q: 0.8, at: 0.24 })],
  // 戳脸：啵嘤（往上一挑）
  poke: [p2("sine", 260, 0.24, 0.13, { to: 820, attack: 3e-3 }), p2("sine", 520, 0.12, 0.03, { to: 1400, attack: 3e-3 })],
  // 干杯：各种杯子碰在一起
  "clink-glass": [p2("sine", 2637, 0.8, 0.055), p2("sine", 2793, 0.7, 0.04, { at: 0.012 }), p2("sine", 3951, 0.45, 0.025), p2("noise", 6e3, 0.02, 0.05, { q: 2 })],
  "clink-ceramic": [p2("sine", 1760, 0.28, 0.07), p2("sine", 2350, 0.18, 0.03), p2("noise", 3500, 0.04, 0.09, { q: 2 })],
  "clink-plastic": [p2("noise", 1800, 0.05, 0.14, { q: 1.2 }), p2("sine", 620, 0.06, 0.05, { attack: 2e-3 })],
  "clink-can": [p2("noise", 2500, 0.06, 0.1, { q: 1.5 }), p2("square", 900, 0.1, 0.02, { lp: 2800 }), p2("sine", 1450, 0.22, 0.03)],
  "clink-wood": [p2("sine", 520, 0.1, 0.12, { attack: 1e-3 }), p2("noise", 1200, 0.03, 0.08, { q: 2 }), p2("sine", 780, 0.06, 0.04, { attack: 1e-3 })],
  "clink-metal": [p2("sine", 1318, 1.1, 0.05), p2("sine", 1975, 0.9, 0.035), p2("sine", 3200, 0.5, 0.02), p2("noise", 5e3, 0.02, 0.05, { q: 2 })],
  // 烟花：咻地升空、砰地炸开、噼里啪啦
  "firework-launch": [p2("sine", 500, 0.75, 0.025, { to: 1900, attack: 0.06 }), p2("noise", 2200, 0.65, 0.04, { q: 3, attack: 0.12 })],
  "firework-boom": [p2("sine", 72, 0.9, 0.28, { to: 36 }), p2("noise", 420, 0.6, 0.16, { q: 0.6 }), ...crackle(9, 0.25, 0.07)],
  // 做好一道菜：叮！（微波炉、烤箱的铃）
  cook: [p2("sine", 2093, 1, 0.07, { attack: 2e-3 }), p2("sine", 4186, 0.4, 0.015, { attack: 2e-3 }), p2("sine", 2093, 0.8, 0.04, { attack: 2e-3, at: 0.16 })],
  // 新称呼：往上走的一串闪光
  nickname: [p2("sine", 1319, 0.22, 0.045), p2("sine", 1568, 0.22, 0.045, { at: 0.07 }), p2("sine", 2093, 0.3, 0.045, { at: 0.14 }), p2("sine", 2637, 0.6, 0.04, { at: 0.21 })],
  // 约定：两声风铃
  promise: [p2("sine", 1760, 1, 0.045), p2("sine", 2217, 0.9, 0.035, { at: 0.14 }), p2("sine", 2637, 1.1, 0.03, { at: 0.28 })],
  // 交换联系方式：手机提示音（嘀嘟）
  contact: [p2("sine", 988, 0.12, 0.06, { attack: 3e-3 }), p2("sine", 1319, 0.22, 0.06, { attack: 3e-3, at: 0.11 })],
  // 手机：来电铃声（一段木琴似的旋律响两遍，底下手机振动的嗡嗡）
  ring: [...ringtone(0), ...ringtone(0.78), p2("square", 150, 0.42, 0.02, { lp: 420, hold: 0.3 }), p2("square", 150, 0.42, 0.02, { lp: 420, hold: 0.3, at: 0.78 })],
  // 拨出去等对方接：嘟——
  ringback: [p2("sine", 450, 1.05, 0.07, { attack: 0.02, hold: 0.95 }), p2("sine", 454, 1.05, 0.025, { attack: 0.02, hold: 0.95 })],
  // 接通：咔哒一下，两声往上
  pickup: [p2("noise", 2400, 0.03, 0.08, { q: 2 }), p2("sine", 880, 0.09, 0.05, { at: 0.05 }), p2("sine", 1175, 0.14, 0.05, { at: 0.13 })],
  // 挂断：两声往下
  hangup: [p2("sine", 1175, 0.1, 0.05), p2("sine", 784, 0.18, 0.05, { at: 0.11 })],
  // 忙音：嘟、嘟、嘟
  busy: [0, 0.7, 1.4].map((at2) => p2("sine", 450, 0.36, 0.06, { attack: 0.01, hold: 0.3, at: at2 })),
  // 通知：叮咚
  notify: [p2("sine", 1760, 0.18, 0.06, { attack: 2e-3 }), p2("sine", 2349, 0.4, 0.05, { attack: 2e-3, at: 0.1 }), p2("sine", 4699, 0.12, 8e-3, { attack: 2e-3, at: 0.1 })],
  // 语音留言：录音机的「嘀——」
  voicemail: [p2("sine", 1e3, 0.55, 0.05, { attack: 0.01, hold: 0.45 })],
  // ── 拟声：导演在 sfx 里写的砰、咚、叮……（ONOMATOPOEIA），没有音效库也能响 ──
  // 砰：撞击、摔门、枪响——一下脆的炸开，底下一记闷的
  bang: [p2("noise", 1800, 0.12, 0.3, { q: 0.7 }), p2("sine", 90, 0.35, 0.35, { to: 45, attack: 2e-3 }), p2("noise", 500, 0.25, 0.14, { q: 0.5 })],
  // 咚：重物落地、撞到
  thud: [p2("sine", 110, 0.3, 0.36, { to: 55, attack: 2e-3 }), p2("noise", 300, 0.08, 0.12, { q: 0.8 })],
  // 咚咚：敲门，三下
  knock: [0, 0.17, 0.34].flatMap((at2) => [p2("sine", 220, 0.08, 0.2, { to: 160, attack: 1e-3, at: at2 }), p2("noise", 900, 0.04, 0.12, { q: 2, at: at2 })]),
  // 啪：一巴掌、拍桌子、打响指
  slap: [p2("noise", 2600, 0.06, 0.32, { q: 0.9 }), p2("noise", 1200, 0.1, 0.12, { q: 0.6 })],
  // 叮：清脆的一声（铃、杯沿、灵光一现）
  ding: [p2("sine", 1568, 1.2, 0.08, { attack: 2e-3 }), p2("sine", 3136, 0.5, 0.02, { attack: 2e-3 }), p2("sine", 4699, 0.3, 0.01, { attack: 2e-3 })],
  // 叮咚：门铃
  doorbell: [p2("sine", 659, 0.9, 0.09, { attack: 3e-3 }), p2("sine", 1318, 0.4, 0.015, { attack: 3e-3 }), p2("sine", 523, 1.3, 0.09, { attack: 3e-3, at: 0.45 }), p2("sine", 1046, 0.5, 0.015, { attack: 3e-3, at: 0.45 })],
  // 叮铃：风铃、店门上的铃、车铃
  jingle: [2637, 3136, 2793, 3520, 2960, 3322].map((f, i) => p2("sine", f, 0.45, 0.035, { attack: 2e-3, at: i * 0.055 })),
  // 哗：一盆水泼下来、人群哗然、浪拍上来
  splash: [p2("noise", 1500, 0.9, 0.15, { q: 0.5, attack: 0.04 }), p2("noise", 4e3, 0.6, 0.07, { q: 1, attack: 0.02, at: 0.05 }), p2("noise", 700, 0.5, 0.08, { q: 0.6 })],
  // 哗啦：东西碎了一地、塌下来
  shatter: [p2("noise", 5e3, 0.4, 0.22, { q: 1.2 }), p2("noise", 2500, 0.25, 0.12, { q: 1, at: 0.03 }), ...[3400, 5200, 4300, 6100, 3800].map((f, i) => p2("sine", f, 0.18, 0.02, { attack: 1e-3, at: 0.02 + i * 0.045 }))],
  // 咔嚓：折断、按下快门、上锁
  snap: [p2("noise", 3500, 0.03, 0.26, { q: 2 }), p2("square", 1200, 0.02, 0.02, { attack: 1e-3, lp: 3e3 }), p2("noise", 2e3, 0.05, 0.18, { q: 1.5, at: 0.07 })],
  // 嗖：一下掠过去
  whoosh: [p2("noise", 600, 0.38, 0.16, { to: 2800, q: 1.5, attack: 0.14 })],
  // 呼：吹过去的风、长长地呼一口气
  breeze: [p2("noise", 500, 0.9, 0.13, { to: 380, q: 0.4, attack: 0.3 })],
  // 轰：爆炸、雷、塌方——很低很长
  boom: [p2("sine", 60, 1.4, 0.38, { to: 28, attack: 4e-3 }), p2("noise", 200, 1.2, 0.24, { q: 0.4, attack: 0.02 }), p2("noise", 900, 0.5, 0.09, { q: 0.5 })],
  // 哐当：铁的东西砸下来、铁门撞上
  clang: [p2("sine", 520, 0.9, 0.09), p2("sine", 1240, 0.7, 0.05), p2("sine", 1873, 0.5, 0.04), p2("noise", 3e3, 0.03, 0.15, { q: 2 }), p2("sine", 470, 0.6, 0.05, { at: 0.22 }), p2("noise", 2600, 0.03, 0.08, { q: 2, at: 0.22 })],
  // 吱呀：老旧的门慢慢推开
  creak: [p2("sawtooth", 380, 0.55, 0.025, { to: 520, lp: 1500, attack: 0.05 }), p2("sawtooth", 520, 0.45, 0.02, { to: 340, lp: 1400, attack: 0.03, at: 0.45 })],
  // 噗：没忍住笑出来、泄了气
  puff: [p2("noise", 600, 0.12, 0.2, { q: 0.6, attack: 5e-3 }), p2("sine", 180, 0.12, 0.1, { to: 90 })],
  // 咕噜：肚子叫、咕噜噜冒泡
  growl: [[95, 0], [80, 0.12], [104, 0.24], [76, 0.36]].map(([f, at2]) => p2("sine", f, 0.16, 0.13, { to: f * 0.8, at: at2 })).concat(p2("noise", 250, 0.5, 0.05, { q: 1 })),
  // 滴答：水一滴一滴落下来、钟走着
  drip: [p2("sine", 900, 0.07, 0.11, { to: 1800, attack: 2e-3 }), p2("sine", 1100, 0.07, 0.1, { to: 2100, attack: 2e-3, at: 0.38 })],
  // 啾：亲一下、小鸟叫
  chu: [p2("sine", 1200, 0.1, 0.09, { to: 2400, attack: 3e-3 }), p2("noise", 3e3, 0.03, 0.05, { q: 3 })],
  // 噼啪：柴火、电火花
  crackle: crackle(9, 0, 0.08),
  // 扑通：掉进水里
  plop: [p2("sine", 420, 0.15, 0.22, { to: 120, attack: 2e-3 }), p2("noise", 500, 0.22, 0.08, { q: 1, at: 0.05 })],
  // 嘀：电子的一声提示、刷卡
  beep: [p2("sine", 1400, 0.16, 0.06, { attack: 5e-3, hold: 0.1 })]
});
var FOLEY_IDS = new Set(Object.keys(FOLEY));
var MOMENT_FOLEY = Object.freeze({ photo: "shutter", touch: "heartbeat", pat: "pat", poke: "poke", cook: "cook", nickname: "nickname", promise: "promise", contact: "contact" });
var ONOMATOPOEIA = Object.freeze({
  砰: { id: "bang", tone: "hit" },
  咚: { id: "thud", tone: "hit" },
  咚咚: { id: "knock", tone: "soft" },
  啪: { id: "slap", tone: "hit" },
  叮: { id: "ding", tone: "ring" },
  叮咚: { id: "doorbell", tone: "ring" },
  叮铃: { id: "jingle", tone: "ring" },
  嘀: { id: "beep", tone: "ring" },
  哗: { id: "splash", tone: "air" },
  哗啦: { id: "shatter", tone: "hit" },
  咔嚓: { id: "snap", tone: "hit" },
  嗖: { id: "whoosh", tone: "air" },
  呼: { id: "breeze", tone: "air" },
  轰: { id: "boom", tone: "hit" },
  哐当: { id: "clang", tone: "hit" },
  吱呀: { id: "creak", tone: "soft" },
  噗: { id: "puff", tone: "soft" },
  咕噜: { id: "growl", tone: "soft" },
  滴答: { id: "drip", tone: "soft" },
  啾: { id: "chu", tone: "ring" },
  噼啪: { id: "crackle", tone: "soft" },
  扑通: { id: "plop", tone: "soft" },
  怦怦: { id: "heartbeat", tone: "soft" }
});
var PHONE_FOLEY = Object.freeze({ call: "ring", dial: "ringback", pickup: "pickup", end: "hangup", busy: "busy", notify: "notify", voicemail: "voicemail" });

// src/client/theater/AaSprite.jsx
var import_react3 = __toESM(require("react"), 1);

// lib/typing.js
var PAUSE = [
  [/^[、]$/u, 2.5],
  [/^[，,]$/u, 4],
  [/^[；;：:]$/u, 5.5],
  [/^[。！？!?.]$/u, 10],
  [/^[…～~]$/u, 4],
  [/^[—]$/u, 2.5]
];
var DOTTED_MAX = 10;
var NARRATION_PAUSE = 0.8;
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
  let dotted = 0;
  for (let i = 0; i < chars.length; i += 1) {
    const ch = chars[i];
    if (DOTTED.test(ch)) {
      const f = Math.min(pauseFactor(ch), DOTTED_MAX - dotted);
      dotted += f;
      out[i] = speed * Math.max(0, f);
      pending = 0;
      continue;
    }
    dotted = 0;
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
var TEXT_STYLES = {
  shake: { gap: 1.3, gain: 0.9, pitch: "jitter" },
  wave: { gap: 1.25, pitch: "wave" },
  big: { gap: 1.1, before: 2, gain: 1.25, pitch: 1.04, land: [["box", 1]], after: 2 },
  roar: { gap: 1.2, before: 5, chunk: 2, gain: 1.45, pitch: 0.94, land: [["shake", 3], ["box", 3], ["flash", 1], ["sound", "slam"]], after: 4 },
  grow: { gap: [1.35, 0.8], gain: [0.85, 1.5], pitch: [1, 1.12], land: [["box", 2], ["shake", 1]], after: 3 },
  dwindle: { gap: [1.1, 2.6], gain: [1, 0.25], pitch: [1, 0.9] },
  small: { gap: 1.15, gain: 0.55, pitch: 1.05 },
  faint: { gap: 1.4, gain: 0.32, pitch: 0.96 },
  glow: { gap: 1.45, before: 3, gain: 1.1, after: 2 }
};
var lerp = (v, k) => Array.isArray(v) ? v[0] + (v[1] - v[0]) * k : v;
function textFxSpans(chars, textfx = []) {
  const text = chars.join("");
  const spans = [];
  for (const f of textfx || []) {
    if (!f || !f.text || !TEXT_STYLES[f.style]) continue;
    const len = Array.from(f.text).length;
    let from = 0;
    for (; ; ) {
      const at2 = text.indexOf(f.text, from);
      if (at2 < 0) break;
      const s0 = Array.from(text.slice(0, at2)).length;
      const s1 = s0 + len - 1;
      if (!spans.some((o) => s0 <= o.s1 && s1 >= o.s0)) {
        spans.push({ s0, s1, style: f.style });
        break;
      }
      from = at2 + f.text.length;
    }
  }
  return spans.sort((a, b) => a.s0 - b.s0);
}
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
function planLine(chars, speed, { say = "", stress = "", emo = "", type = "dialogue", seed = "", textfx = null } = {}) {
  const n = chars.length;
  const text = chars.join("");
  const spoken = type === "dialogue" || type === "thought";
  const style = !spoken ? "" : say && STYLES[say] ? say : inferDelivery(text, emo, type);
  const S = STYLES[style];
  const base = Math.max(speed * S.gap, S.min || 0);
  const plan = { times: [], marks: new Array(n).fill(""), say: style, gap: S.chunk ? base * S.chunk : base, mouth: S.mouth, blip: S.blip, fx: [], tx: new Array(n).fill(""), txk: new Array(n).fill(0), txi: new Array(n).fill(0), blips: null };
  if (!n) return plan;
  const spans = textFxSpans(chars, textfx);
  const spanAt = new Array(n).fill(null);
  if (spans.length) plan.blips = new Array(n).fill(null);
  for (const sp of spans) {
    const T = TEXT_STYLES[sp.style];
    const len = sp.s1 - sp.s0;
    for (let i = sp.s0; i <= sp.s1; i += 1) {
      const k = len ? (i - sp.s0) / len : 1;
      plan.tx[i] = sp.style;
      plan.txk[i] = Math.round(k * 100) / 100;
      plan.txi[i] = i - sp.s0;
      spanAt[i] = sp;
      const pitch = T.pitch === "wave" ? 1 + 0.09 * Math.sin((i - sp.s0) * 1.3) : T.pitch === "jitter" ? (i - sp.s0) % 2 ? 0.95 : 1.06 : lerp(T.pitch ?? 1, k);
      plan.blips[i] = { gain: lerp(T.gain ?? 1, k), pitch };
    }
  }
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
      gap += pauses[i - 1] * S.pause * (spoken ? 1 : NARRATION_PAUSE);
      if (S.stall && !SILENT.test(prev) && !SILENT.test(chars[i]) && rand2() < 0.2) gap += Math.max(speed * 4, 90);
      const sp = spanAt[i];
      if (sp) {
        const T = TEXT_STYLES[sp.style];
        if (T.chunk && i > sp.s0) gap = (i - sp.s0) % T.chunk === 0 || SILENT.test(prev) ? gap * T.chunk * lerp(T.gap, plan.txk[i]) : 0;
        else gap *= lerp(T.gap, plan.txk[i]);
        if (i === sp.s0) gap += speed * (T.before || 0);
      }
      const was = spanAt[i - 1];
      if (was && was !== sp && i - 1 === was.s1) gap += speed * (TEXT_STYLES[was.style].after || 0);
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
  else if (style === "shout" && !spans.some((sp) => (TEXT_STYLES[sp.style].land || []).some(([k]) => k === "shake"))) push(0, IMPACT.shout);
  for (const sp of spans) {
    const land = TEXT_STYLES[sp.style].land;
    if (land && !(s1 >= sp.s0 && s1 <= sp.s1)) push(plan.times[sp.s1], land);
  }
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
var clamp3 = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
function mouthTrack(talk, plan) {
  const chars = plan?.chars || [];
  const times = plan?.times || [];
  if (!talk || !chars.length || times.length !== chars.length) return [];
  const gap = plan.gap > 0 ? plan.gap : 30;
  const [beatMin, beatMax] = talk.beat_ms || [95, 160];
  const target = Math.max(beatMin, Math.min(gap, beatMax));
  const level2 = plan.mouth === "soft" ? "soft" : plan.mouth === "wide" || plan.mouth === "syllable" ? "loud" : "normal";
  const shapes = talk.shapes || {};
  const release = talk.release || {};
  const attack = clamp3(talk.attack ?? 0.6, 0.3, 0.9);
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
      const lv = stressed ? level2 === "soft" ? "normal" : "loud" : level2;
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
    shapes: mapObj(t.shapes, (level2) => mapObj(level2, peak)),
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
    for (const [state2, p4] of Object.entries(states)) {
      if (!PART_STATE.test(state2)) throw new Error(`素材包的 ${part} 差分名不对：${state2}`);
      parts[part][state2] = { file: file(p4?.file, `${part}.${state2}`), x: int(p4?.x, -w, w, `${part}.${state2} 的 x`), y: int(p4?.y, -h, h, `${part}.${state2} 的 y`) };
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
    for (const p4 of Object.values(pack.poses || {})) {
      files2.push(p4.base);
      for (const states of Object.values(p4.parts || {})) for (const v of Object.values(states)) files2.push(v.file);
    }
    return [...new Set(files2)];
  }
  const parts = Object.values(pack.parts || {}).flatMap((states) => Object.values(states).map((p4) => p4.file));
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
    const p4 = raw.poses[name2] || {};
    const parts = {};
    for (const [part, allowed] of [["eyes", EYE_STATES], ["mouth", MOUTH_STATES]]) {
      parts[part] = {};
      for (const [state2, v] of Object.entries(p4.parts?.[part] || {})) {
        if (!allowed.includes(state2)) throw new Error(`素材包「${name2}」的 ${part} 差分名不对：${state2}`);
        parts[part][state2] = { file: file(v?.file, `${name2}.${part}.${state2}`), x: int(v?.x, -w, w, `${name2}.${part}.${state2} 的 x`), y: int(v?.y, -h, h, `${name2}.${part}.${state2} 的 y`) };
      }
    }
    poses[name2] = { label: String(p4.label || "").slice(0, 20), base: file(p4.base, `姿势「${name2}」的整图`), parts };
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
  return list2.map(([x0, y0, x1, y1]) => [x0, y0, x1, Math.min(height, y1 + Math.max(8, snap82((y1 - y0) / 2)))]);
}
var snap82 = (v) => Math.round(v / 8) * 8;
function cleanRects(rects, width, height) {
  const out = {};
  let area2 = 0;
  for (const [part, max] of [["eyes", 2], ["mouth", 1]]) {
    const list2 = Array.isArray(rects?.[part]) ? rects[part].slice(0, max) : [];
    out[part] = list2.map((r) => {
      const [x0, y0, x1, y1] = (Array.isArray(r) ? r : []).map(Number);
      if (![x0, y0, x1, y1].every(Number.isFinite)) throw new Error(`${AA_PARTS[part].label}的框不对`);
      const a = [Math.max(0, snap82(Math.min(x0, x1))), Math.max(0, snap82(Math.min(y0, y1))), Math.min(width, snap82(Math.max(x0, x1))), Math.min(height, snap82(Math.max(y0, y1)))];
      if (a[2] - a[0] < 8 || a[3] - a[1] < 8) throw new Error(`${AA_PARTS[part].label}的框太小`);
      area2 += (a[2] - a[0]) * (a[3] - a[1]);
      return a;
    });
    if (!out[part].length) throw new Error(`还没框${AA_PARTS[part].label}`);
  }
  if (area2 > width * height / 8) throw new Error("框太大了：只框眼睛和嘴就够，重画范围越小越不容易走样");
  return out;
}
function rectsBox(list2) {
  return [Math.min(...list2.map((r) => r[0])), Math.min(...list2.map((r) => r[1])), Math.max(...list2.map((r) => r[2])), Math.max(...list2.map((r) => r[3]))];
}
function defaultRects(width, height) {
  const at2 = (fx0, fy0, fx1, fy1) => [snap82(width * fx0), snap82(height * fy0), snap82(width * fx1), snap82(height * fy1)];
  return { eyes: [at2(0.385, 0.176, 0.471, 0.229), at2(0.51, 0.171, 0.606, 0.224)], mouth: [at2(0.471, 0.257, 0.519, 0.27)] };
}
function motionPack({ name: name2, width, height, still: still2, patches }) {
  return { version: 2, name: name2, size: [width, height], poses: { front: { base: still2, parts: patches } }, default_pose: "front" };
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
    loadAaPack(aa).then((p4) => {
      if (live) setPack(p4);
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
    const still2 = reduced();
    const b = still2 ? 0 : breathFrame(m.breath, now - begin);
    let eyes = "open";
    if (!still2) {
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
      const p4 = pack.parts[part]?.[state2];
      if (p4) g.drawImage(p4.img, p4.x, p4.y - lift);
    }
  };
}
function motionDrawer(pack, g, { talkRef, label }) {
  const { m, images } = pack;
  const actor = createActor(m, { seed: label || "aa", now: performance.now() });
  let said = "";
  let drawn = "";
  return (now) => {
    const still2 = reduced();
    if (still2) actor.hush();
    const t = talkRef.current;
    const sayKey = t && t.type === "dialogue" && t.speed > 0 && !t.done && Number.isFinite(t.startedAt) ? `${t.key}|${t.startedAt}` : "";
    if (sayKey !== said) {
      said = sayKey;
      if (sayKey && !still2) actor.say({ chars: t.chars, times: t.times, gap: t.gap, mouth: t.mouth, marks: t.marks }, t.startedAt);
      else actor.hush();
    }
    const f = still2 ? { pose: m.default_pose, eyes: "open", mouth: "closed" } : actor.frame(now);
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

// lib/eros.js
var p3 = (wave, f, dur, gain, more = {}) => ({ wave, f, dur, gain, ...more });
function rng(seed) {
  let s = seed >>> 0;
  return () => (s = s * 1664525 + 1013904223 >>> 0) / 4294967296;
}
var bubble = (f, at2, gain, dur = 0.045) => p3("sine", f, dur, gain, { to: f * 2.2, attack: 3e-3, at: at2 });
function wet(seed, n, start, spread, lo, hi, gain) {
  const r = rng(seed);
  return Array.from({ length: n }, () => bubble(lo + (hi - lo) * r(), start + spread * r(), gain * (0.55 + 0.45 * r()), 0.03 + 0.04 * r()));
}
var squish = (from, to, at2, gain, dur = 0.1, q = 3) => p3("noise", from, dur, gain, { to, q, attack: 0.01, at: at2 });
var thump = (f, at2, gain, dur = 0.16) => p3("sine", f, dur, gain, { to: f * 0.62, attack: 4e-3, at: at2 });
var lubdub = (at2, gain) => [thump(64, at2, gain, 0.15), p3("noise", 210, 0.07, gain * 0.5, { q: 1.2, at: at2 }), thump(58, at2 + 0.19, gain * 0.72, 0.17), p3("noise", 190, 0.07, gain * 0.35, { q: 1.2, at: at2 + 0.19 })];
var level = (k, parts) => parts.map((x) => ({ ...x, gain: +(x.gain * k).toFixed(4) }));
var EROS_FOLEY = Object.freeze({
  // ── 性爱 ──
  // 深吻：两下湿的唇音，中间一点吸吮
  kiss: level(1.4, [squish(2400, 1500, 0, 0.5, 0.05, 4), bubble(900, 0.01, 0.06), squish(1900, 900, 0.17, 0.32, 0.16, 5), ...wet(11, 3, 0.2, 0.12, 700, 1300, 0.035)]),
  // 舔：湿的一下往上抹
  lick: level(1.6, [squish(1100, 2500, 0, 0.42, 0.22, 4.5), ...wet(12, 3, 0.08, 0.16, 800, 1600, 0.03)]),
  // 水声：手指、爱抚时咕啾咕啾的细碎湿响
  rub: level(1.3, [squish(1500, 900, 0, 0.3, 0.28, 3), ...wet(13, 7, 0.02, 0.32, 500, 1400, 0.035)]),
  // 插入：慢慢挤进去的压迫感（ぬぷ……ずぷぷ）——低的推挤 + 黏的摩擦 + 一串水泡，最后落到底
  insert: [p3("noise", 420, 0.95, 0.5, { to: 230, q: 2.2, attack: 0.18 }), squish(1500, 700, 0.06, 0.3, 0.7, 5), ...wet(14, 6, 0.08, 0.6, 280, 700, 0.04), thump(85, 0.72, 0.12, 0.2)],
  // 顶到最深处：隔着身体闷闷的一下（こつん）
  deep: [thump(150, 0, 0.26, 0.2), p3("triangle", 280, 0.09, 0.07, { to: 190, attack: 2e-3, lp: 650 }), squish(700, 420, 0.01, 0.22, 0.08, 2.5)],
  // 抽插的一下（ずちゅ）：湿的挤压 + 一点低音，节奏底一拍一拍用它
  thrust: level(1.3, [squish(950, 360, 0, 0.55, 0.14, 2.6), squish(2300, 1300, 0.01, 0.2, 0.06, 5), ...wet(15, 3, 0, 0.08, 400, 900, 0.04), thump(100, 0.04, 0.09, 0.12)]),
  // 往回抽的那一下，轻一点（节奏底的反拍）
  draw: level(2, [squish(500, 1100, 0, 0.32, 0.12, 3), ...wet(16, 2, 0.04, 0.06, 600, 1100, 0.03)]),
  // 激烈时更重、更湿的一下
  "thrust-hard": [squish(1100, 320, 0, 0.7, 0.13, 2.2), squish(2600, 1200, 0, 0.26, 0.07, 4), ...wet(17, 4, 0, 0.07, 350, 1e3, 0.05), thump(92, 0.02, 0.15, 0.13)],
  // 撞击（肉贴肉的啪）：比巴掌闷、短
  clap: [p3("noise", 1500, 0.06, 0.3, { q: 0.9 }), p3("noise", 650, 0.1, 0.18, { q: 0.8 }), thump(170, 0, 0.08, 0.07)],
  // 射精：一下一下的脉动（どくっ、どくっ），每一下低音 + 黏稠的涌出，越来越弱；时间跟画面的脉动（EROS_PULSES）对上
  cum: [0, 0.38, 0.78, 1.22].flatMap((at2, i) => [thump(62, at2, 0.3 - i * 0.055, 0.22), p3("noise", 650, 0.24, 0.42 - i * 0.07, { to: 280, q: 1.8, attack: 0.012, at: at2 }), ...wet(20 + i, 3, at2 + 0.03, 0.12, 200, 480, 0.045 - i * 7e-3)]),
  // 灌满、溢出来：低低的咕噜
  flood: level(1.4, [p3("noise", 520, 0.55, 0.3, { to: 380, q: 2, attack: 0.04 }), ...wet(18, 9, 0, 0.6, 150, 420, 0.05)]),
  // 潮吹：一阵细的喷溅，后面几滴
  squirt: level(0.55, [p3("noise", 3e3, 0.5, 0.28, { to: 1700, q: 0.9, attack: 0.012 }), p3("noise", 6e3, 0.3, 0.1, { q: 1.2, attack: 8e-3 }), ...wet(19, 5, 0.42, 0.5, 1200, 2400, 0.022)]),
  // 拔出来：啵的一声吸出（ぬぽっ）
  pull: level(0.75, [squish(600, 1500, 0, 0.36, 0.13, 3.5), bubble(300, 0.11, 0.12, 0.07), ...wet(30, 2, 0.15, 0.1, 500, 900, 0.03)]),
  // 吞咽：咕咚
  gulp: level(0.8, [p3("sine", 230, 0.13, 0.13, { to: 120, attack: 6e-3, lp: 900 }), squish(320, 220, 0, 0.3, 0.1, 2), bubble(260, 0.06, 0.06, 0.06)]),
  // 衣物摩擦、脱衣：沙沙的一下
  cloth: level(1.3, [p3("noise", 3400, 0.36, 0.09, { to: 2400, q: 0.7, attack: 0.07 }), p3("noise", 5200, 0.24, 0.05, { q: 1, attack: 0.04, at: 0.14 })]),
  // 床响：木头吱的一声（比门的吱呀低、短）
  bed: level(1.6, [p3("sawtooth", 165, 0.26, 0.03, { to: 205, lp: 900, attack: 0.03 }), squish(900, 1100, 0.02, 0.18, 0.2, 7)]),
  // 锁链、镣铐：一串细的金属碰响
  chain: level(1.8, [...[2900, 3500, 2500, 3200, 2700].map((f, i) => p3("sine", f, 0.12, 0.022, { attack: 1e-3, at: i * 0.045 + i % 2 * 0.012 })), p3("noise", 4200, 0.06, 0.22, { q: 2 }), p3("noise", 3600, 0.05, 0.16, { q: 2, at: 0.13 })]),
  // 喘息：两下气声（呼——哈）
  breath: level(0.8, [p3("noise", 1100, 0.62, 0.16, { q: 0.8, attack: 0.25, hold: 0.08 }), p3("noise", 2700, 0.5, 0.05, { q: 1.4, attack: 0.22 }), p3("noise", 1e3, 0.55, 0.12, { q: 0.8, attack: 0.2, at: 0.78 })]),
  // 心跳（没有铃声的那种，沉一点）
  pulse: lubdub(0, 0.3),
  // ── 触手 ──
  // 触手爬过：湿的长长一道滑过去（ずるり）
  slither: level(0.8, [p3("noise", 380, 1, 0.45, { to: 720, q: 2.2, attack: 0.25 }), squish(1200, 1800, 0.05, 0.2, 0.8, 6), ...wet(31, 6, 0.1, 0.8, 250, 600, 0.03), thump(70, 0.85, 0.06, 0.2)]),
  // 小的扭动（节奏底里一下一下的）
  squirm: level(1.8, [squish(700, 1100, 0, 0.28, 0.22, 4), ...wet(32, 3, 0.04, 0.18, 300, 700, 0.03)]),
  // 缠紧、勒住：绷紧的吱声 + 黏的挤压
  coil: level(1.4, [p3("sawtooth", 120, 0.32, 0.035, { to: 92, lp: 520, attack: 0.04 }), squish(720, 440, 0, 0.42, 0.32, 3), squish(2400, 2600, 0.12, 0.12, 0.12, 8), ...wet(33, 3, 0.05, 0.2, 260, 560, 0.035)]),
  // 黏液拉丝、黏糊糊的（ぬちゃ）
  goo: level(1.5, [squish(900, 480, 0, 0.42, 0.26, 6), ...wet(34, 3, 0.16, 0.14, 300, 650, 0.04), p3("sine", 520, 0.08, 0.035, { to: 250, at: 0.2 })]),
  // 刺入：尖的一下，然后注入的咕噜
  prick: level(1.5, [p3("noise", 5200, 0.025, 0.22, { q: 3 }), p3("sine", 2200, 0.05, 0.03, { to: 1200, attack: 2e-3 }), p3("noise", 480, 0.42, 0.22, { q: 2, attack: 0.1, at: 0.08 }), bubble(300, 0.3, 0.05, 0.06)]),
  // 喷出甜腻的雾：嘶——
  mist: level(0.7, [p3("noise", 4500, 0.85, 0.12, { to: 3e3, q: 0.9, attack: 0.03, hold: 0.3 }), p3("noise", 1200, 0.5, 0.08, { q: 1, attack: 0.05 })]),
  // 吸盘吸住又拉开：啵
  suck: level(0.7, [squish(500, 1200, 0, 0.32, 0.15, 3), bubble(260, 0.13, 0.13, 0.07)]),
  // 触手抽打：破风 + 湿的一下
  lash: [p3("noise", 800, 0.2, 0.2, { to: 3500, q: 1.5, attack: 0.08 }), p3("noise", 1800, 0.07, 0.36, { q: 0.8, at: 0.18 }), p3("noise", 500, 0.14, 0.16, { q: 0.7, at: 0.18 }), ...wet(35, 3, 0.2, 0.08, 400, 900, 0.035)],
  // 人倒下：咚的一下闷响 + 衣服的沙沙（ドサ）
  collapse: [thump(92, 0, 0.3, 0.3), p3("noise", 420, 0.25, 0.2, { q: 0.6 }), p3("noise", 2600, 0.2, 0.05, { q: 0.8, attack: 0.02, at: 0.04 })],
  // ── 高潮那一下（peak）──
  // 高潮：心跳一下比一下快、底下一股往上涌的低音，耳边很轻的一声长鸣（脑子一片空白）
  climax: [...lubdub(0, 0.24), ...lubdub(0.36, 0.28), ...lubdub(0.66, 0.32), p3("sine", 52, 2.2, 0.14, { attack: 0.5, to: 46 }), p3("noise", 300, 1.8, 0.12, { q: 0.5, attack: 0.6 }), p3("sine", 3150, 2.8, 0.011, { attack: 0.5, hold: 0.5 }), p3("sine", 3520, 2.4, 7e-3, { attack: 0.6 })]
});
var EROS_SFX = Object.freeze({
  亲吻: { id: "kiss", group: "body" },
  舔: { id: "lick", group: "body" },
  水声: { id: "rub", group: "body" },
  插入: { id: "insert", group: "body" },
  顶到最深: { id: "deep", group: "body" },
  抽插: { id: "thrust", group: "body" },
  撞击: { id: "clap", group: "body" },
  射精: { id: "cum", group: "body" },
  灌满: { id: "flood", group: "body" },
  潮吹: { id: "squirt", group: "body" },
  拔出: { id: "pull", group: "body" },
  吞咽: { id: "gulp", group: "body" },
  衣物: { id: "cloth", group: "body" },
  床响: { id: "bed", group: "body" },
  锁链: { id: "chain", group: "body" },
  喘息: { id: "breath", group: "body" },
  心跳: { id: "pulse", group: "body" },
  触手爬过: { id: "slither", group: "tentacle" },
  缠紧: { id: "coil", group: "tentacle" },
  黏液: { id: "goo", group: "tentacle" },
  刺入: { id: "prick", group: "tentacle" },
  喷雾: { id: "mist", group: "tentacle" },
  吸附: { id: "suck", group: "tentacle" },
  抽打: { id: "lash", group: "tentacle" },
  倒下: { id: "collapse", group: "tentacle" }
});
var EROS_ALIAS = {
  深吻: "亲吻",
  接吻: "亲吻",
  ちゅぷ: "亲吻",
  ちゅる: "亲吻",
  ちゅっ: "亲吻",
  舔舐: "舔",
  れろ: "舔",
  ぺろ: "舔",
  ぺろっ: "舔",
  爱抚: "水声",
  くちゅ: "水声",
  くちゅくちゅ: "水声",
  ちゅく: "水声",
  にちゅ: "水声",
  进入: "插入",
  ぬぷ: "插入",
  ずぷ: "插入",
  ずぷぷ: "插入",
  ずぶ: "插入",
  ずぶり: "插入",
  にゅぷ: "插入",
  ぐぷ: "插入",
  ぐぷっ: "插入",
  顶到: "顶到最深",
  最深处: "顶到最深",
  こつん: "顶到最深",
  ごりっ: "顶到最深",
  ごちゅ: "顶到最深",
  ずちゅ: "抽插",
  ぐちゅ: "抽插",
  じゅぷ: "抽插",
  じゅぽ: "抽插",
  ぬちゅ: "抽插",
  ずちゅん: "抽插",
  ずちゅんっ: "抽插",
  ぱんっ: "撞击",
  ぱん: "撞击",
  ぱちゅん: "撞击",
  内射: "射精",
  注入: "射精",
  どぷ: "射精",
  どぷっ: "射精",
  どぴゅ: "射精",
  びゅる: "射精",
  びゅるる: "射精",
  びゅくっ: "射精",
  どくどく: "射精",
  どくっ: "射精",
  びゅっ: "射精",
  溢出: "灌满",
  ごぽ: "灌满",
  ごぷ: "灌满",
  こぽ: "灌满",
  ごぼっ: "灌满",
  ぷしゃ: "潮吹",
  ぷしゃあ: "潮吹",
  ぷしゃっ: "潮吹",
  ぬぽっ: "拔出",
  ぬぽ: "拔出",
  ちゅぽん: "拔出",
  ごくっ: "吞咽",
  ごくん: "吞咽",
  こくん: "吞咽",
  脱衣: "衣物",
  衣擦れ: "衣物",
  しゅる: "衣物",
  するっ: "衣物",
  床: "床响",
  ぎしっ: "床响",
  ぎし: "床响",
  ぎしぎし: "床响",
  镣铐: "锁链",
  じゃら: "锁链",
  じゃらっ: "锁链",
  喘气: "喘息",
  吐息: "喘息",
  はぁ: "喘息",
  どくん: "心跳",
  心音: "心跳",
  心跳声: "心跳",
  触手: "触手爬过",
  蠕动: "触手爬过",
  爬行: "触手爬过",
  ずるり: "触手爬过",
  ずる: "触手爬过",
  ずるずる: "触手爬过",
  ずりゅ: "触手爬过",
  にゅる: "触手爬过",
  にゅるにゅる: "触手爬过",
  缠绕: "缠紧",
  勒紧: "缠紧",
  ぎちっ: "缠紧",
  ぎちぎち: "缠紧",
  きゅっ: "缠紧",
  ぎゅっ: "缠紧",
  ぬちゃ: "黏液",
  にちゃ: "黏液",
  ねちゃ: "黏液",
  ぬるっ: "黏液",
  どろっ: "黏液",
  ちくっ: "刺入",
  ぷすっ: "刺入",
  ぷつっ: "刺入",
  注射: "刺入",
  しゅー: "喷雾",
  ぷしゅー: "喷雾",
  喷出: "喷雾",
  吸盘: "吸附",
  ちゅぱ: "吸附",
  きゅぽ: "吸附",
  ひゅっ: "抽打",
  ばしっ: "抽打",
  ぴしっ: "抽打",
  どさ: "倒下",
  どさっ: "倒下",
  どさり: "倒下",
  倒地: "倒下"
};
var KEYS = Object.keys(EROS_ALIAS).filter((k) => /^[\u3041-\u309f\u30fc]{2,}$/.test(k)).sort((a, b) => b.length - a.length);
var EROS_PACES = ["none", "tease", "slow", "fast", "frantic", "afterglow"];
var EROS_LABEL = { none: "", tease: "爱抚", slow: "缓慢", fast: "加快", frantic: "激烈", afterglow: "余韵" };
var TENTACLE = ["none", "idle", "writhe"];
var TENTACLE_LABEL = { none: "", idle: "触手潜伏", writhe: "触手蠕动" };
var EROS_LOOPS = Object.freeze({
  tease: { beat: 1.7, swing: 0.3, hits: [["rub", 0, 0.75], ["lick", 0.55, 0.4, 3], ["kiss", 0.3, 0.45, 4]] },
  slow: { beat: 1.25, swing: 0.06, hits: [["thrust", 0, 0.8], ["draw", 0.5, 0.35], ["bed", 0.02, 0.4, 4]] },
  fast: { beat: 0.68, swing: 0.05, hits: [["thrust", 0, 0.78], ["draw", 0.5, 0.28], ["bed", 0.02, 0.35, 3]] },
  frantic: { beat: 0.44, swing: 0.04, hits: [["thrust-hard", 0, 0.85], ["clap", 0, 0.55], ["bed", 0.03, 0.4, 2]] },
  afterglow: { beat: 1.15, swing: 0.03, hits: [["pulse", 0, 0.5], ["breath", 0.3, 0.55, 4]] }
});
var TENTACLE_SWAP = Object.freeze({ clap: "squirm", bed: "goo", draw: "squirm" });
var TENTACLE_LOOPS = Object.freeze({
  idle: { every: [2.6, 6], pool: [["slither", 0.45], ["goo", 0.3], ["squirm", 0.3]] },
  writhe: { every: [0.45, 1.3], pool: [["squirm", 0.5], ["goo", 0.4], ["slither", 0.45], ["coil", 0.3]] }
});
var PEAKS = ["climax", "cum", "both"];
var PEAK_LABEL = { climax: "高潮", cum: "射精", both: "一起高潮" };
var PEAK_FOLEY = Object.freeze({ climax: ["climax"], cum: ["cum"], both: ["climax", "cum"] });
var EROS_PULSES = Object.freeze([0, 380, 780, 1220]);

// src/client/theater/audio.js
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
  const turn = el._fgFadeTurn = (el._fgFadeTurn || 0) + 1;
  let over = false;
  const end = () => {
    if (over) return;
    over = true;
    if (el._fgFadeTurn !== turn) return;
    el.volume = Math.max(0, Math.min(1, to));
    if (done) done();
  };
  const tick = (now) => {
    if (over) return;
    if (el._fgFadeTurn !== turn) {
      over = true;
      return;
    }
    const k = Math.min(1, (now - start) / ms);
    el.volume = Math.max(0, Math.min(1, from + (to - from) * k));
    if (k < 1) requestAnimationFrame(tick);
    else end();
  };
  requestAnimationFrame(tick);
  setTimeout(end, ms + 150);
}
var HUSH_OUT_MS = 600;
var HUSH_BACK_MS = 2600;
function loopPlayer() {
  let cur = null;
  let hushed = false;
  let ducked = 1;
  let duckTurn = 0;
  const halt = (el) => {
    el._fgStopped = true;
    el.pause();
    el.src = "";
  };
  const audible = (volume) => preview || hushed ? 0 : volume * ducked;
  return {
    get current() {
      return cur;
    },
    /** 现在该有的音量：试听、留白时是 0。 */
    get level() {
      return cur ? audible(cur.volume) : 0;
    },
    play(item, volume) {
      if (!item) {
        this.stop();
        return;
      }
      volume = Math.max(0, Math.min(1, volume));
      if (cur && cur.id === item.id) {
        cur.volume = volume;
        cur.el.volume = Math.min(cur.el.volume, audible(volume));
        fade(cur.el, audible(volume), 400);
        return;
      }
      hushed = false;
      const old = cur;
      const el = new Audio();
      el.src = item.url;
      el.loop = true;
      el.volume = 0;
      el.play().then(() => {
        if (el._fgStopped) halt(el);
        else if (!el._fgFading) fade(el, audible(volume), 1800);
      }).catch(() => {
      });
      cur = { el, id: item.id, volume };
      if (old) {
        old.el._fgFading = true;
        fade(old.el, 0, 1400, () => halt(old.el));
      }
    },
    stop() {
      const old = cur;
      cur = null;
      if (old) {
        old.el._fgFading = true;
        fade(old.el, 0, 900, () => halt(old.el));
      }
    },
    /** 留白：on 淡出、停在原处；off 从停下的地方接着放、慢慢淡回来。 */
    hush(on) {
      on = Boolean(on);
      if (on === hushed) return;
      hushed = on;
      const now = cur;
      if (!now) return;
      if (on) fade(now.el, 0, HUSH_OUT_MS, () => {
        if (hushed && cur === now) now.el.pause();
      });
      else {
        now.el.play().catch(() => {
        });
        fade(now.el, audible(now.volume), HUSH_BACK_MS);
      }
    },
    /** 压低一会儿：很快压到 level 成，ms 毫秒后慢慢回来（又压了一次就按后一次算）。 */
    duck(level2, ms) {
      const turn = duckTurn += 1;
      ducked = level2;
      if (cur) fade(cur.el, audible(cur.volume), 350);
      setTimeout(() => {
        if (turn !== duckTurn) return;
        ducked = 1;
        if (cur) fade(cur.el, audible(cur.volume), 1800);
      }, ms);
    }
  };
}
var music = loopPlayer();
var ambience = loopPlayer();
var players = [music, ambience];
var loops = () => [music.current, ambience.current].filter(Boolean);
function playBgm(track, volume = 0.45) {
  music.play(track, volume);
}
function hushBgm(on) {
  music.hush(on);
}
function playAmbience(sound, volume = 0.35) {
  ambience.play(sound, volume);
}
function stopAll() {
  music.stop();
  music.hush(false);
  ambience.stop();
  stopPreview();
  for (const src of [...oneShots]) {
    try {
      src.stop();
    } catch {
    }
  }
  oneShots.clear();
  stopEros();
}
function previewTrack(track, onEnd) {
  stopPreview();
  if (!track) return;
  const el = new Audio(track.url);
  el.volume = Math.max(0, Math.min(1, track.volume ?? (music.current ? music.current.volume : 0.6)));
  preview = { el, id: track.id, onEnd };
  el.onended = () => {
    if (preview && preview.el === el) stopPreview();
  };
  for (const loop of loops()) fade(loop.el, 0, 500);
  el.play().catch(() => {
    if (preview && preview.el === el) stopPreview();
  });
}
function stopPreview() {
  if (!preview) return;
  const p4 = preview;
  preview = null;
  p4.el.pause();
  p4.el.src = "";
  for (const player of players) if (player.current) fade(player.current.el, player.level, 800);
  if (p4.onEnd) p4.onEnd();
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
function playParts(ac, parts, { rate = 1, volume = 1, at: at2 = ac.currentTime, out = ac.destination } = {}) {
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
    if (part.hold) g.gain.setValueAtTime(peak, t + attack + part.hold);
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
    head.connect(g).connect(out);
    if (part.wave === "noise") src.start(t, Math.random() * 0.4);
    else src.start(t);
    src.stop(end + 0.02);
  }
}
var MAX_FILE_SECONDS = 4;
var files = /* @__PURE__ */ new Map();
var buffers = /* @__PURE__ */ new Map();
function fetchFile(id) {
  if (!files.has(id)) {
    const p4 = fetch(assetUrl(id)).then((r) => {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.arrayBuffer();
    });
    p4.catch(() => files.delete(id));
    files.set(id, p4);
  }
  return files.get(id);
}
function decoded(ac, id) {
  if (!buffers.has(id)) {
    const p4 = fetchFile(id).then((bytes) => ac.decodeAudioData(bytes.slice(0)));
    p4.catch(() => buffers.delete(id));
    buffers.set(id, p4);
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
var MAX_STORY_SECONDS = 12;
var oneShots = /* @__PURE__ */ new Set();
function playLibSound(assetId, volume = 1) {
  const ac = assetId && volume > 0 && audioCtx();
  if (!ac) return;
  decoded(ac, assetId).then((buffer) => {
    const src = ac.createBufferSource();
    oneShots.add(src);
    src.onended = () => oneShots.delete(src);
    const g = ac.createGain();
    const t = ac.currentTime;
    src.buffer = buffer;
    g.gain.setValueAtTime(volume, t);
    src.connect(g).connect(ac.destination);
    src.start(t);
    if (buffer.duration > MAX_STORY_SECONDS) {
      g.gain.setValueAtTime(volume, t + MAX_STORY_SECONDS - 1);
      g.gain.linearRampToValueAtTime(0, t + MAX_STORY_SECONDS);
      src.stop(t + MAX_STORY_SECONDS);
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
function impulse(ac, seconds, decay = 2.5) {
  const len = Math.floor(ac.sampleRate * seconds);
  const buffer = ac.createBuffer(2, len, ac.sampleRate);
  for (let ch = 0; ch < 2; ch += 1) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len) ** decay;
  }
  return buffer;
}
function shaper(ac, amount) {
  const node = ac.createWaveShaper();
  const curve = new Float32Array(1024);
  for (let i = 0; i < curve.length; i += 1) {
    const x = i / (curve.length - 1) * 2 - 1;
    curve[i] = (1 + amount) * x / (1 + amount * Math.abs(x));
  }
  node.curve = curve;
  return node;
}
function filter(ac, type, frequency, q = 0.7, gain = 0) {
  const node = ac.createBiquadFilter();
  node.type = type;
  node.frequency.value = frequency;
  node.Q.value = q;
  node.gain.value = gain;
  return node;
}
function amp(ac, value) {
  const node = ac.createGain();
  node.gain.value = value;
  return node;
}
function underwater({ cutoff, wet: wet2, sway }) {
  return (ac, input, out) => {
    const wobble2 = ac.createDelay(0.05);
    wobble2.delayTime.value = 0.015;
    const drift = ac.createOscillator();
    drift.frequency.value = 1.1;
    drift.connect(amp(ac, sway)).connect(wobble2.delayTime);
    drift.start();
    const muffle = filter(ac, "lowpass", cutoff, 1.2);
    const tide = ac.createOscillator();
    tide.frequency.value = 0.37;
    tide.connect(amp(ac, cutoff * 0.25)).connect(muffle.frequency);
    tide.start();
    const body = input.connect(wobble2).connect(filter(ac, "highpass", 70)).connect(muffle).connect(filter(ac, "lowpass", cutoff * 1.5)).connect(filter(ac, "peaking", 240, 0.9, 5));
    body.connect(amp(ac, 0.38)).connect(out);
    const room = ac.createConvolver();
    room.buffer = impulse(ac, 0.8, 2.6);
    body.connect(room).connect(filter(ac, "lowpass", cutoff * 0.8)).connect(amp(ac, wet2)).connect(out);
  };
}
var MEMORY_DEPTH = {
  warm: { cutoff: 620, wet: 0.14, sway: 25e-4 },
  sweet: { cutoff: 720, wet: 0.15, sway: 3e-3 },
  sad: { cutoff: 520, wet: 0.17, sway: 2e-3 },
  dread: { cutoff: 420, wet: 0.13, sway: 4e-3 },
  flash: { cutoff: 900, wet: 0.1, sway: 15e-4 },
  haze: { cutoff: 560, wet: 0.24, sway: 35e-4 }
};
var MEMORY_RATE = { warm: 0.92, sweet: 0.95, sad: 0.88, dread: 0.85, flash: 0.97, haze: 0.9 };
var submerged = (parts) => parts.map((p4) => ({ ...p4, attack: Math.max(p4.attack ?? 6e-3, 0.016), dur: p4.dur * 1.3 }));
var BUBBLE = [{ wave: "sine", f: 280, to: 820, dur: 0.05, gain: 0.03, attack: 4e-3 }];
var VOICE_CHAINS = {
  // 电话：只剩中频，有点破
  phone: (ac, input, out) => {
    input.connect(filter(ac, "highpass", 420)).connect(filter(ac, "lowpass", 3e3)).connect(filter(ac, "peaking", 1700, 1, 6)).connect(shaper(ac, 6)).connect(amp(ac, 0.75)).connect(out);
  },
  // 广播 / 对讲机：更窄更破，每个字带一点电流声（见 blip）
  radio: (ac, input, out) => {
    input.connect(filter(ac, "highpass", 600)).connect(filter(ac, "lowpass", 2500)).connect(shaper(ac, 24)).connect(amp(ac, 0.6)).connect(out);
  },
  // 心灵感应：大混响，干声很轻，像在脑子里回响
  telepathy: (ac, input, out) => {
    input.connect(amp(ac, 0.35)).connect(out);
    const verb = ac.createConvolver();
    verb.buffer = impulse(ac, 2.6, 2);
    input.connect(filter(ac, "highpass", 300)).connect(verb).connect(amp(ac, 1.1)).connect(out);
  },
  // 画外音：门外、隔壁、远处，闷一点、远一点
  offscreen: (ac, input, out) => {
    const muffled = input.connect(filter(ac, "lowpass", 1300));
    muffled.connect(amp(ac, 0.6)).connect(out);
    const room = ac.createConvolver();
    room.buffer = impulse(ac, 0.9, 3);
    muffled.connect(room).connect(amp(ac, 0.45)).connect(out);
  },
  // 回声：山谷、空旷的大厅，每个字后面跟着越来越远的几声
  echo: (ac, input, out) => {
    input.connect(out);
    const delay = ac.createDelay(1);
    delay.delayTime.value = 0.23;
    const feedback = amp(ac, 0.48);
    input.connect(delay).connect(filter(ac, "lowpass", 2200)).connect(feedback).connect(delay);
    delay.connect(amp(ac, 0.7)).connect(out);
  },
  // 机械音：环形调制 + 削波，像机器人、AI、变声器
  machine: (ac, input, out) => {
    const ring = ac.createGain();
    ring.gain.value = 0;
    const lfo = ac.createOscillator();
    lfo.type = "sine";
    lfo.frequency.value = 95;
    lfo.connect(ring.gain);
    lfo.start();
    input.connect(ring).connect(shaper(ac, 10)).connect(filter(ac, "highpass", 180)).connect(amp(ac, 0.9)).connect(out);
    input.connect(amp(ac, 0.25)).connect(out);
  }
};
for (const [tone, depth] of Object.entries(MEMORY_DEPTH)) VOICE_CHAINS["memory-" + tone] = underwater(depth);
var chains = /* @__PURE__ */ new Map();
function chainFor(ac, style) {
  const build = VOICE_CHAINS[style];
  if (!build) return ac.destination;
  const known = chains.get(style);
  if (known && known.context === ac) return known;
  const input = ac.createGain();
  build(ac, input, ac.destination);
  chains.set(style, input);
  return input;
}
function blip(voice, { pitch = 1, gain = 1 } = {}) {
  const v = voice && voiceById(voice.id);
  const ac = v && audioCtx();
  if (!ac) return;
  const style = voice.style || "";
  const jitter = pitch * (0.96 + Math.random() * 0.08);
  const volume = (sounds.blipVolume ?? 1) * gain;
  const rateOf = (who) => 2 ** ((who.pitch || 0) / 12) * jitter;
  if (style === "chorus") {
    const others = (voice.also || []).filter((o) => voiceById(o.id));
    const group = others.length ? [voice, ...others] : [voice, { ...voice, pitch: (voice.pitch || 0) - 3 }, { ...voice, pitch: (voice.pitch || 0) + 4 }];
    const share = 1 / Math.sqrt(group.length);
    group.forEach((who, i) => playParts(ac, voiceById(who.id).parts, { rate: rateOf(who), volume: volume * share * (who.gain ?? 1), at: ac.currentTime + i * 0.014 }));
    return;
  }
  const memory = style === "memory" ? MEMORY_DEPTH[voice.tone] ? voice.tone : "warm" : "";
  const out = chainFor(ac, memory ? "memory-" + memory : style);
  const rate = rateOf(voice) * (style === "telepathy" ? 1.08 : style === "machine" ? 0.94 : memory ? MEMORY_RATE[memory] : 1);
  if (memory) {
    const parts = submerged(v.parts);
    playParts(ac, parts, { rate, volume: volume * (voice.gain ?? 1), out });
    playParts(ac, parts, { rate: rate / 2, volume: volume * 0.45 * (voice.gain ?? 1), out });
    if (Math.random() < 0.16) playParts(ac, BUBBLE, { rate: 0.8 + Math.random() * 0.6, volume, out, at: ac.currentTime + 0.03 + Math.random() * 0.04 });
    return;
  }
  playParts(ac, v.parts, { rate, volume: volume * (voice.gain ?? 1), out });
  if (style === "telepathy") playParts(ac, v.parts, { rate: rate * 2, volume: volume * 0.22 * (voice.gain ?? 1), out });
  if (style === "radio") playParts(ac, [{ wave: "noise", f: 3200, q: 0.8, gain: 0.05, dur: 0.06 }], { volume, out });
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
function foley(id, delay = 0) {
  if (sounds.sfx === false || !FOLEY[id]) return;
  const ac = audioCtx();
  if (ac) playParts(ac, FOLEY[id], { volume: sounds.sfxVolume ?? 1, at: ac.currentTime + delay / 1e3 });
}
function storyFoley(id, volume = 1) {
  const ac = FOLEY[id] && volume > 0 && audioCtx();
  if (ac) playParts(ac, FOLEY[id], { volume });
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
var wobble = (k = 0.06) => 1 - k + Math.random() * 2 * k;
function erosFoley(id, volume = 1) {
  const ac = EROS_FOLEY[id] && volume > 0 && audioCtx();
  if (ac) playParts(ac, EROS_FOLEY[id], { rate: wobble(0.04), volume });
}
var AHEAD = 0.3;
var TICK_MS = 100;
function rhythm() {
  let now = null;
  let timer = 0;
  let quietUntil = 0;
  const tick = () => {
    if (!now || !ctx) return;
    while (now.t < ctx.currentTime + AHEAD) {
      const at2 = Math.max(now.t, ctx.currentTime + 0.01);
      if (at2 >= quietUntil) now.plan.play(ctx, at2, now.step, now.volume);
      now.t = at2 + now.plan.gap();
      now.step += 1;
    }
  };
  return {
    set(key, plan, volume) {
      if (!plan || !(volume > 0)) {
        this.stop();
        return;
      }
      if (now && now.key === key) {
        now.volume = volume;
        return;
      }
      const ac = audioCtx();
      if (!ac) return;
      now = { key, plan, volume, t: now ? Math.max(now.t, ac.currentTime + 0.05) : ac.currentTime + EROS_START, step: 0 };
      if (!timer) timer = setInterval(tick, TICK_MS);
      tick();
    },
    stop() {
      now = null;
      if (timer) {
        clearInterval(timer);
        timer = 0;
      }
    },
    /** 停 seconds 秒（高潮那一下只剩心跳和长鸣），之后接着响。 */
    quiet(seconds) {
      if (ctx) quietUntil = ctx.currentTime + seconds;
    }
  };
}
var EROS_START = 0.25;
var beatListeners = /* @__PURE__ */ new Set();
function onErosBeat(fn) {
  beatListeners.add(fn);
  return () => beatListeners.delete(fn);
}
function paceLoop(pace, tentacle, cue = true) {
  const def = EROS_LOOPS[pace];
  if (!def) return null;
  return {
    gap: () => def.beat * wobble(0.02),
    play(ac, at2, step2, volume) {
      for (const [id, phase, gain, every] of def.hits) {
        if (every && step2 % every) continue;
        const parts = EROS_FOLEY[tentacle ? TENTACLE_SWAP[id] || id : id];
        if (!parts) continue;
        const t = at2 + phase * def.beat + (Math.random() - 0.5) * (def.swing || 0) * def.beat;
        playParts(ac, parts, { rate: wobble(0.06), volume: volume * gain, at: Math.max(at2, t) });
      }
      if (!cue || !beatListeners.size) return;
      const ms = (at2 - ac.currentTime + (ac.outputLatency || ac.baseLatency || 0)) * 1e3;
      for (const fn of beatListeners) fn({ in: Math.max(0, ms), beat: def.beat * 1e3, pace });
    }
  };
}
function tentacleLoop(kind) {
  const def = TENTACLE_LOOPS[kind];
  if (!def) return null;
  const [lo, hi] = def.every;
  return {
    gap: () => lo + Math.random() * (hi - lo),
    play(ac, at2, step2, volume) {
      const [id, gain] = def.pool[Math.floor(Math.random() * def.pool.length)];
      playParts(ac, EROS_FOLEY[id], { rate: wobble(0.1), volume: volume * gain, at: at2 });
    }
  };
}
var erosBed = rhythm();
var tentacleBed = rhythm();
function playEros(pace, tentacle, volume = 1) {
  const writhing = Boolean(TENTACLE_LOOPS[tentacle]);
  erosBed.set(pace + (writhing ? "|tentacle" : ""), paceLoop(pace, writhing), volume);
  tentacleBed.set(tentacle, tentacleLoop(tentacle), volume * 0.8);
}
function stopEros() {
  erosBed.stop();
  tentacleBed.stop();
}
var PEAK_QUIET = { climax: 2.6, cum: 1.8, both: 2.6 };
function erosPeak(kind, volume = 1) {
  const ac = PEAK_FOLEY[kind] && volume > 0 && audioCtx();
  if (!ac) return;
  for (const id of PEAK_FOLEY[kind]) playParts(ac, EROS_FOLEY[id], { volume });
  erosBed.quiet(PEAK_QUIET[kind]);
  tentacleBed.quiet(PEAK_QUIET[kind]);
  music.duck(0.35, PEAK_QUIET[kind] * 1e3);
}
var trial = null;
function previewEros(pace, tentacle, volume = 1, seconds = 5) {
  if (trial) {
    trial.beds.forEach((b) => b.stop());
    clearTimeout(trial.timer);
  }
  const beds = [rhythm(), rhythm()];
  const writhing = Boolean(TENTACLE_LOOPS[tentacle]);
  beds[0].set("trial", paceLoop(pace, writhing, false), volume);
  beds[1].set("trial", tentacleLoop(tentacle), volume * 0.8);
  erosBed.quiet(seconds + 0.5);
  tentacleBed.quiet(seconds + 0.5);
  trial = { beds, timer: setTimeout(() => {
    beds.forEach((b) => b.stop());
    trial = null;
  }, seconds * 1e3) };
}

// src/client/theater/Stage.jsx
var TRANSITION_ANIM = {
  dissolve: "fg-dissolve",
  fade: "fg-fade-slow",
  cinematic: "fg-cinematic",
  wipe: "fg-wipe",
  iris: "fg-iris",
  strips: "fg-wipe",
  black: "fg-black-in",
  flash: "fg-flash-in",
  blink: "fg-blink-in",
  glitch: "fg-glitch-in",
  swirl: "fg-swirl-in",
  haze: "fg-haze-in",
  wake: "fg-haze-in",
  none: "none"
  // wake：从回忆里醒过来，剧场按 beatHold 的 wake 换上，导演不写
};
var TRANSITION = Object.fromEntries(Object.entries(TRANSITION_ANIM).map(([k, anim]) => [k, [anim, TRANSITION_MS[k] / 1e3 + "s"]]));
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
      return [...list2.slice(-1).map((l) => ({ ...l, leaving: true, out: transition })), { id, bg, scene, enter: true, tr: transition }];
    });
  }, [id, scene.time]);
  import_react4.default.useEffect(() => {
    if (layers.length < 2) return void 0;
    const top = layers[layers.length - 1];
    const t = setTimeout(() => setLayers((list2) => list2.filter((l) => !l.leaving)), (TRANSITION_MS[top.tr] ?? TRANSITION_MS.dissolve) + 300);
    return () => clearTimeout(t);
  }, [layers]);
  return /* @__PURE__ */ import_react4.default.createElement(import_react4.default.Fragment, null, layers.map((layer) => {
    const [anim, dur] = TRANSITION[layer.tr] || TRANSITION.dissolve;
    const cls = ["fg-bg", layer.bg.src ? "is-image" : "", layer.enter && layer.tr !== "none" ? "is-enter" : "", layer.leaving ? "is-leave" : ""].join(" ");
    return /* @__PURE__ */ import_react4.default.createElement("div", { key: layer.id, className: cls, "data-tr": layer.tr, "data-out": layer.leaving ? layer.out : void 0, style: { "--enter-anim": anim, "--enter-dur": dur } }, /* @__PURE__ */ import_react4.default.createElement("div", { className: "fg-bg-art", style: layer.bg.src ? { backgroundImage: `url("${layer.bg.src}")` } : void 0 }, !layer.bg.src && /* @__PURE__ */ import_react4.default.createElement(Sky, { scene: layer.scene })));
  }));
}
function SceneCover({ plan, state: state2 }) {
  if (!plan || !plan.cover) return null;
  const ms = state2 === "up" ? plan.up : state2 === "down" ? plan.down : 0;
  return /* @__PURE__ */ import_react4.default.createElement("div", { className: "fg-cover", "data-cover": plan.cover, "data-state": state2, style: { "--ms": ms + "ms" }, "aria-hidden": "true" });
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
function spriteFor(person, turn, emo, emotions, then = null, pending = null) {
  if (!person || !person.timeline) return "";
  const custom = (emotions || []).find((e) => e.id === emo);
  const now = lookAt(person.timeline, turn);
  const over = then || (pending ? undoShifts(now, pending) : null);
  const look = over ? thenLook(now, over, person.timeline.outfits) : now;
  return pickSprite(person.sprites, look, emo, custom ? custom.base : "", { strict: Boolean(then) });
}
var SIDE = { farleft: "-40%", left: "-28%", center: "0%", right: "28%", farright: "40%" };
function faceBoxOf(record, size) {
  if (!record) return null;
  if (record.faceBox) return record.faceBox;
  if (record.face && record.face.box) return record.face.box;
  const rects = record.aa && record.aa.rects;
  return rects && size ? faceBoxFrom(rects, size[0], size[1]) : null;
}
var REACT_FRAMES = {
  jolt: [[{ transform: "none" }, { transform: "translateY(-2.6%) scale(1.012)", offset: 0.22 }, { transform: "translateY(.5%)", offset: 0.55 }, { transform: "none" }], 520],
  shrink: [[{ transform: "none" }, { transform: "translateY(1%) scale(.988) rotate(-.8deg)", offset: 0.35 }, { transform: "translateY(.7%) scale(.992) rotate(-.5deg)", offset: 0.7 }, { transform: "none" }], 1100],
  bounce: [[{ transform: "none" }, { transform: "translateY(-1.4%)", offset: 0.2 }, { transform: "none", offset: 0.4 }, { transform: "translateY(-.9%)", offset: 0.6 }, { transform: "none" }], 620],
  droop: [[{ transform: "none" }, { transform: "translateY(1.6%) scale(.99)", offset: 0.45 }, { transform: "translateY(1.2%) scale(.993)", offset: 0.8 }, { transform: "none" }], 1500],
  shake: [[{ transform: "none" }, { transform: "translateX(-.8%)", offset: 0.15 }, { transform: "translateX(.8%)", offset: 0.35 }, { transform: "translateX(-.5%)", offset: 0.55 }, { transform: "translateX(.3%)", offset: 0.75 }, { transform: "none" }], 460],
  nod: [[{ transform: "none" }, { transform: "translateY(.9%)", offset: 0.35 }, { transform: "none", offset: 0.7 }, { transform: "none" }], 560],
  tilt: [[{ transform: "none" }, { transform: "rotate(2.2deg)", offset: 0.3 }, { transform: "rotate(1.6deg)", offset: 0.7 }, { transform: "none" }], 1e3],
  step: [[{ transform: "none" }, { transform: "translateY(-.9%)", offset: 0.25 }, { transform: "none", offset: 0.5 }, { transform: "translateY(-.7%)", offset: 0.75 }, { transform: "none" }], 560]
};
var STEP_MOVES = /* @__PURE__ */ new Set(["approach", "apart", "forward", "back", "hide"]);
var TURN_FRAMES = {
  turn: (dir) => [[{ transform: "none", filter: "none" }, { transform: `translateX(${dir * 1.8}%) rotate(${dir * 1.2}deg) scale(.985)`, filter: "blur(2.4px)", offset: 0.4 }, { transform: `translateX(${dir * 0.6}%) translateY(.6%) scale(.99)`, filter: "blur(.6px)", offset: 0.72 }, { transform: "none", filter: "none" }], 820],
  face: (dir) => [[{ transform: "none", filter: "none" }, { transform: `translateX(${-dir * 1.4}%) rotate(${-dir * 0.9}deg)`, filter: "blur(2px)", offset: 0.38 }, { transform: "none", filter: "none" }], 700],
  lookback: (dir) => [[{ transform: "none", filter: "none" }, { transform: `translateX(${-dir * 1.2}%) translateY(-.9%) rotate(${-dir * 1.4}deg)`, filter: "blur(1.8px)", offset: 0.36 }, { transform: "translateY(-.3%)", filter: "none", offset: 0.7 }, { transform: "none", filter: "none" }], 760]
};
var SYM_MOTION = { surprise: "jolt", bulb: "jolt", sweat: "droop", gloom: "droop", sigh: "droop", heartbreak: "droop", zzz: "droop", anger: "shake", fire: "shake", heart: "bounce", note: "bounce", sparkle: "bounce", bloom: "bounce", blush: "shrink", dizzy: "tilt" };
var HIT_FRAMES = {
  hit: [[{ transform: "none", filter: "none" }, { transform: "translateX(-2.4%) rotate(-1.6deg)", filter: "brightness(2.2)", offset: 0.12 }, { transform: "translateX(1.4%) rotate(.6deg)", filter: "none", offset: 0.4 }, { transform: "none" }], 420],
  crit: [[{ transform: "none", filter: "none" }, { transform: "translateX(-4%) rotate(-3deg) scale(1.02)", filter: "brightness(2.4) sepia(1) saturate(5) hue-rotate(-40deg)", offset: 0.1 }, { transform: "translateX(2.6%) rotate(1.4deg)", filter: "sepia(.6) saturate(3) hue-rotate(-40deg)", offset: 0.35 }, { transform: "translateX(-1%)", filter: "none", offset: 0.65 }, { transform: "none" }], 640],
  miss: [[{ transform: "none", opacity: 1, filter: "none" }, { transform: "translateX(10%) skewX(-6deg)", opacity: 0.45, filter: "blur(3px)", offset: 0.25 }, { transform: "translateX(8%)", opacity: 1, filter: "none", offset: 0.55 }, { transform: "none" }], 720],
  block: [[{ transform: "none", filter: "none" }, { transform: "translateX(-3%) scale(.985)", filter: "brightness(1.5) saturate(.6)", offset: 0.18 }, { transform: "translateX(-2%)", filter: "none", offset: 0.5 }, { transform: "none" }], 520],
  down: [[{ transform: "none", filter: "none" }, { transform: "translateX(-3%) rotate(-3deg)", filter: "brightness(2)", offset: 0.15 }, { transform: "translateX(-1%) rotate(-1deg)", filter: "none", offset: 0.5 }, { transform: "none" }], 560],
  heal: [[{ filter: "none" }, { filter: "brightness(1.35) drop-shadow(0 0 1.6cqw rgba(110, 255, 170, .9))", offset: 0.3 }, { filter: "brightness(1.15) drop-shadow(0 0 1cqw rgba(110, 255, 170, .6))", offset: 0.7 }, { filter: "none" }], 1300]
};
var LUNGE = (dir) => [[{ transform: "none" }, { transform: `translateX(${dir * 7}%) translateY(-1%)`, offset: 0.35 }, { transform: `translateX(${dir * 5}%)`, offset: 0.6 }, { transform: "none" }], 620];
var TOUCH_FRAMES = {
  pat: [[{ transform: "none" }, { transform: "translateY(1.2%) scaleY(.975)", offset: 0.16 }, { transform: "none", offset: 0.34 }, { transform: "translateY(1.2%) scaleY(.975)", offset: 0.56 }, { transform: "none", offset: 0.74 }, { transform: "none" }], 1e3],
  poke: [[{ transform: "none" }, { transform: "translateX(-1.6%) rotate(-2.5deg)", offset: 0.15 }, { transform: "translateX(.8%) rotate(1.4deg)", offset: 0.4 }, { transform: "translateX(-.3%) rotate(-.5deg)", offset: 0.65 }, { transform: "none" }], 700]
};
var DEPTH = { 1: [1.1, "-6%"], [-1]: [0.88, "3%"] };
var HIDING = [0.95, "1.5%"];
var EXIT_MS = { storm: 650, run: 420, slow: 1300 };
var SWAP_MS = 280;
var SIZES = /* @__PURE__ */ new Map();
function Actor({ entry, person, beat, emo, emotions, leaving = false, talk = null }) {
  const speaking = !leaving && (beat.speakers ? beat.speakers.includes(entry.name) : beat.speaker === entry.name);
  const reaction = !leaving && !speaking && beat.reacts ? beat.reacts.find((r) => r.name === entry.name) : null;
  const move = !leaving && beat.moves ? beat.moves.find((m) => m.name === entry.name) : null;
  const [entrance] = import_react4.default.useState(() => beat.enterHow && beat.enterHow[entry.name] || "");
  const reactRef = import_react4.default.useRef(null);
  const symKind = SYM_MOTION[speaking ? beat.sym : reaction ? reaction.sym : ""] || "";
  import_react4.default.useEffect(() => {
    const el = reactRef.current;
    if (!el || typeof el.animate !== "function" || !reaction && !move && !symKind) return;
    if (typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const base = reaction ? ((emotions || []).find((e) => e.id === reaction.emo) || {}).base || reaction.emo : "";
    const turning = move && TURN_FRAMES[move.act] ? TURN_FRAMES[move.act]((entry.x ?? 50) < 50 ? -1 : 1) : null;
    const kind = symKind || (reaction && (reaction.emo || !move) ? reactKind(base) : STEP_MOVES.has(move.act) ? "step" : "");
    const frames = turning || REACT_FRAMES[kind];
    if (frames) el.animate(frames[0], { duration: frames[1], easing: "cubic-bezier(.3, .7, .3, 1)" });
  }, [beat.key]);
  const struck = !leaving && beat.hit && beat.hit.to === entry.name ? beat.hit.effect : "";
  const striking = !leaving && beat.hit && beat.hit.from === entry.name && beat.hit.to !== entry.name;
  import_react4.default.useEffect(() => {
    const el = reactRef.current;
    if (!el || typeof el.animate !== "function" || !struck && !striking) return void 0;
    if (typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches) return void 0;
    if (striking) {
      const [frames, ms] = LUNGE((entry.x ?? 50) < 50 ? 1 : -1);
      el.animate(frames, { duration: ms, easing: "cubic-bezier(.3, .7, .3, 1)" });
    }
    if (!struck) return void 0;
    const t = setTimeout(() => {
      const [frames, ms] = HIT_FRAMES[struck] || HIT_FRAMES.hit;
      el.animate(frames, { duration: ms, easing: "cubic-bezier(.2, .8, .3, 1)" });
    }, HIT_IMPACT_MS);
    return () => clearTimeout(t);
  }, [beat.key]);
  const touched = !leaving && beat.moment && beat.moment.who === entry.name && TOUCH_FRAMES[beat.moment.kind] ? beat.moment.kind : "";
  import_react4.default.useEffect(() => {
    const el = reactRef.current;
    if (!el || typeof el.animate !== "function" || !touched) return void 0;
    if (typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches) return void 0;
    const t = setTimeout(() => {
      const [frames, ms] = TOUCH_FRAMES[touched];
      el.animate(frames, { duration: ms, easing: "cubic-bezier(.3, .7, .3, 1)" });
    }, 150);
    return () => clearTimeout(t);
  }, [beat.key]);
  const sprite = spriteFor(person, beat.turn, emo, emotions, beat.then && beat.then[entry.name], beat.ahead && beat.ahead[entry.name]);
  const src = sprite ? assetUrl(sprite) : "";
  const color = person && person.color || "#9b7bff";
  const [pics, setPics] = import_react4.default.useState(() => ({ cur: src && SIZES.has(src) ? { src, size: SIZES.get(src) } : null, prev: null, broken: "" }));
  import_react4.default.useEffect(() => {
    if (!src) {
      setPics({ cur: null, prev: null, broken: "" });
      return void 0;
    }
    if (pics.cur && pics.cur.src === src) return void 0;
    const show = (size) => setPics((p4) => ({ cur: { src, size }, prev: p4.cur && p4.cur.src !== src ? p4.cur : null, broken: "" }));
    if (SIZES.has(src)) {
      show(SIZES.get(src));
      return void 0;
    }
    let live = true;
    const img = new Image();
    img.onload = () => {
      if (!live || !img.naturalHeight) return;
      SIZES.set(src, [img.naturalWidth, img.naturalHeight]);
      show(SIZES.get(src));
    };
    img.onerror = () => {
      if (live) setPics({ cur: null, prev: null, broken: src });
    };
    img.src = src;
    return () => {
      live = false;
    };
  }, [src]);
  import_react4.default.useEffect(() => {
    if (!pics.prev) return void 0;
    const t = setTimeout(() => setPics((p4) => p4.prev ? { ...p4, prev: null } : p4), SWAP_MS);
    return () => clearTimeout(t);
  }, [pics.prev]);
  const records = Object.values(person && person.sprites || {});
  const uploaded = records.some((r) => r && r.assetId === sprite && r.uploaded);
  const aa = records.find((r) => r && r.assetId === sprite && (r.aa?.pack || r.aa?.manifest))?.aa || null;
  const cm = heightOf(person).cm;
  const faces = records.filter((r) => r && r.faceBox && !r.uploaded).map((r) => r.faceBox);
  const placeOf = (pic) => {
    const record = pic ? records.find((r) => r && pic.src === assetUrl(r.assetId)) : null;
    return placeSprite({ box: faceBoxOf(record, pic && pic.size), size: pic && pic.size, cm, usual: record && !record.uploaded ? usualFace(faces, pic.size[1]) : 0 });
  };
  const place = placeOf(pics.cur);
  const picture = (pic) => {
    const at2 = pic === pics.cur ? place : placeOf(pic);
    const fade2 = pic === pics.cur ? pics.prev ? "is-in" : "" : "is-out";
    return /* @__PURE__ */ import_react4.default.createElement("img", { key: pic.src, src: pic.src, alt: entry.name, className: fade2 || void 0, style: { "--k": at2.k, "--lift": at2.lift }, draggable: "false", onError: () => setPics((p4) => p4.cur && p4.cur.src === pic.src ? { cur: null, prev: null, broken: pic.src } : { ...p4, prev: null }) });
  };
  const still2 = pics.cur ? /* @__PURE__ */ import_react4.default.createElement(import_react4.default.Fragment, null, pics.prev && picture(pics.prev), picture(pics.cur)) : !src || pics.broken === src ? /* @__PURE__ */ import_react4.default.createElement(Silhouette, { name: entry.name, color, appearance: person && person.appearance, gender: person && person.gender }) : null;
  const [d, db] = DEPTH[entry.depth] || (entry.behind ? HIDING : [1, "0%"]);
  const cls = ["fg-actor", speaking && "is-speaking", reaction && "is-reacting", uploaded && "is-upload", leaving && "is-leaving", aa && "is-aa", entry.away && "is-away", entry.peek && "is-peek", entry.behind && "is-hiding", entry.down && "is-down"].filter(Boolean).join(" ");
  return /* @__PURE__ */ import_react4.default.createElement(
    "div",
    {
      className: cls,
      style: { "--x": (entry.x ?? actorX(entry.pos)) + "%", "--s": entry.scale ?? 1, "--d": d, "--db": db, "--side": SIDE[entry.pos] || "0%", "--edge": (entry.x ?? actorX(entry.pos)) < 50 ? "-40%" : "40%", "--k": place.k, "--lift": place.lift, "--head": place.head * 100 + "%", zIndex: entry.z },
      "data-name": entry.name,
      "data-enter": entrance || void 0,
      "data-exit": leaving && entry.how ? entry.how : void 0,
      "data-peek": entry.peek || void 0,
      "data-hide": entry.hide || void 0,
      "data-depth": entry.depth || void 0
    },
    /* @__PURE__ */ import_react4.default.createElement("div", { className: "fg-actor-turn" }, /* @__PURE__ */ import_react4.default.createElement("div", { className: "fg-actor-react", ref: reactRef }, /* @__PURE__ */ import_react4.default.createElement("div", { className: "fg-actor-body" }, aa ? /* @__PURE__ */ import_react4.default.createElement(AaSprite, { aa, talk: speaking && talk && talk.key === beat.key ? talk : null, fallback: still2, className: "fg-aa", label: entry.name }) : still2)), /* @__PURE__ */ import_react4.default.createElement("div", { className: "fg-down-mist", "aria-hidden": "true" }, /* @__PURE__ */ import_react4.default.createElement("i", null), /* @__PURE__ */ import_react4.default.createElement("i", null), /* @__PURE__ */ import_react4.default.createElement("i", null), /* @__PURE__ */ import_react4.default.createElement("i", null))),
    (struck === "hit" || struck === "crit" || struck === "block") && /* @__PURE__ */ import_react4.default.createElement("div", { className: "fg-hit-mark", key: "hit" + beat.key, "data-effect": struck, style: { "--impact": HIT_IMPACT_MS + "ms" }, "aria-hidden": "true" })
  );
}
var LEAVE_MS = 450;
function useLeaving(cast, beat) {
  const prev = import_react4.default.useRef([]);
  const leaving = import_react4.default.useRef(/* @__PURE__ */ new Map());
  const [, refresh] = import_react4.default.useReducer((n) => n + 1, 0);
  const now = Date.now();
  for (const p4 of prev.current) {
    if (cast.some((c) => c.id === p4.id) || leaving.current.has(p4.id)) continue;
    const how = beat && beat.exitHow && beat.exitHow[p4.name] || "";
    leaving.current.set(p4.id, { entry: how ? { ...p4, how } : p4, at: now, ms: EXIT_MS[how] || LEAVE_MS });
  }
  for (const c of cast) leaving.current.delete(c.id);
  prev.current = cast;
  const pending = leaving.current.size;
  import_react4.default.useEffect(() => {
    if (!pending) return void 0;
    const wait = Math.max(16, Math.min(...[...leaving.current.values()].map((l) => l.at + l.ms)) - Date.now());
    const t = setTimeout(() => {
      const at2 = Date.now() + 16;
      for (const [name2, l] of leaving.current) if (l.at + l.ms <= at2) leaving.current.delete(name2);
      refresh();
    }, wait);
    return () => clearTimeout(t);
  });
  return [...leaving.current.values()].map((l) => l.entry);
}
function Cast({ beat, view, talk, max = 5 }) {
  const people = new Map((view && view.cast || []).map((p4) => [p4.name, p4]));
  let cast = beat.cast || [];
  if (!beat.directed && !cast.length && beat.speaker && beat.speaker !== "我" && people.has(beat.speaker)) cast = [{ name: beat.speaker, pos: "center" }];
  const split = beat.split || null;
  if (split) cast = cast.filter((c) => !split.who.includes(c.name));
  cast = stackLayers(blockLayout(stageLayout(onStage(cast, beat.recent, max)), beat.poses), beat.front).map((entry) => ({ ...entry, id: entry.name + "@" + (beat.set || 0), seen: beat }));
  const leaving = useLeaving(cast, beat);
  return /* @__PURE__ */ import_react4.default.createElement("div", { className: "fg-cast", "data-split": split ? "on" : void 0 }, cast.map((entry) => /* @__PURE__ */ import_react4.default.createElement(Actor, { key: entry.id, entry, person: people.get(entry.name), beat, emo: beat.emotions[entry.name] || "neutral", emotions: view && view.emotions, talk })), leaving.map((entry) => /* @__PURE__ */ import_react4.default.createElement(Actor, { key: entry.id, entry, person: people.get(entry.name), beat: entry.seen, emo: entry.seen.emotions[entry.name] || "neutral", emotions: view && view.emotions, leaving: true })));
}
function splitBackground(location2, time, view) {
  const places = view && view.places || {};
  if (!location2) return "";
  const exact = places[placeKey({ location: location2, time })];
  if (exact && exact.assetId) return assetUrl(exact.assetId);
  const other = Object.entries(places).find(([key, place]) => key.startsWith(location2 + "|") && place.assetId);
  return other ? assetUrl(other[1].assetId) : "";
}
var SPLIT_LEAVE_MS = 600;
var SPLIT_POS = [["center"], ["left", "right"]];
function SplitPanel({ beat, view, talk }) {
  const split = beat.split || null;
  const sig = split ? split.who.join("、") + "|" + (split.location || "") : "";
  const last = import_react4.default.useRef(null);
  const [, refresh] = import_react4.default.useReducer((n) => n + 1, 0);
  const leaving = !split && Boolean(last.current);
  if (split) last.current = { split, sig };
  import_react4.default.useEffect(() => {
    if (split || !last.current) return void 0;
    const t = setTimeout(() => {
      last.current = null;
      refresh();
    }, SPLIT_LEAVE_MS);
    return () => clearTimeout(t);
  }, [sig]);
  const shown = split ? { split, sig } : last.current;
  if (!shown) return null;
  const people = new Map((view && view.cast || []).map((p4) => [p4.name, p4]));
  const { who, location: location2 } = shown.split;
  const src = splitBackground(location2, beat.scene.time, view);
  const slots = SPLIT_POS[who.length - 1] || SPLIT_POS[1];
  const covered = Boolean(beat.cg && cgSrc(beat.cg, assetUrl));
  return /* @__PURE__ */ import_react4.default.createElement("div", { className: `fg-split${leaving ? " is-leaving" : ""}${covered ? " is-under" : ""}`, key: shown.sig, "aria-hidden": "true" }, /* @__PURE__ */ import_react4.default.createElement("div", { className: "fg-split-inner" }, /* @__PURE__ */ import_react4.default.createElement("div", { className: "fg-split-bg", style: src ? { backgroundImage: `url("${src}")` } : null }, !src && /* @__PURE__ */ import_react4.default.createElement(Sky, { scene: { time: beat.scene.time, location: location2 || who[0] } })), /* @__PURE__ */ import_react4.default.createElement("div", { className: "fg-split-cast" }, who.map((name2, i) => /* @__PURE__ */ import_react4.default.createElement(Actor, { key: name2, entry: { name: name2, pos: slots[i] || "center" }, person: people.get(name2), beat, emo: beat.emotions[name2] || "neutral", emotions: view && view.emotions, talk }))), location2 && /* @__PURE__ */ import_react4.default.createElement("div", { className: "fg-split-label" }, /* @__PURE__ */ import_react4.default.createElement("i", null), location2)));
}
var RECALL_IN_MS = 1200;
var RECALL_LEAVE_MS = 1e3;
var RECALL_LIGHT_MS = { warm: 400, sweet: 500, sad: 900, dread: 200, flash: 150, haze: 900 };
function RecallLayer({ beat, view, talk, light = false, tone = "" }) {
  const recall = beat.recall || null;
  const last = import_react4.default.useRef(null);
  const [, refresh] = import_react4.default.useReducer((n) => n + 1, 0);
  const leaving = !recall && Boolean(last.current);
  if (recall) last.current = { recall, beat };
  import_react4.default.useEffect(() => {
    if (recall || !last.current) return void 0;
    const t = setTimeout(() => {
      last.current = null;
      refresh();
    }, RECALL_LEAVE_MS);
    return () => clearTimeout(t);
  }, [recall]);
  const shown = recall ? { recall, beat } : last.current;
  if (!shown) return null;
  const mood = tone || shown.recall.tone || "warm";
  if (light) return /* @__PURE__ */ import_react4.default.createElement("div", { className: `fg-recall is-light${leaving ? " is-leave" : ""}`, "data-tone": mood, style: { "--fade": (RECALL_LIGHT_MS[mood] || 400) + "ms" }, "aria-hidden": "true" }, /* @__PURE__ */ import_react4.default.createElement("div", { className: "fg-recall-veil" }));
  const people = new Map((view && view.cast || []).map((p4) => [p4.name, p4]));
  const ghosts = stageLayout(shown.recall.who.filter((name2) => people.has(name2)).map((name2) => ({ name: name2, pos: "center" })));
  const ghostBeat = { ...shown.beat, then: shown.recall.then, ...leaving ? { speaker: "", speakers: null, sym: "" } : {} };
  return /* @__PURE__ */ import_react4.default.createElement("div", { className: `fg-recall${leaving ? " is-leave" : ""}`, "data-tone": mood, style: { "--fade": (leaving ? RECALL_LEAVE_MS : RECALL_IN_MS) + "ms" }, "aria-hidden": "true" }, /* @__PURE__ */ import_react4.default.createElement("div", { className: "fg-recall-veil" }), ghosts.map((entry) => /* @__PURE__ */ import_react4.default.createElement(Actor, { key: entry.name, entry, person: people.get(entry.name), beat: ghostBeat, emo: shown.beat.emotions[entry.name] || "neutral", emotions: view && view.emotions, talk: leaving ? null : talk })));
}
function useFace(person, beat, view, then = null) {
  const name2 = person ? person.name : "";
  const sprite = person ? spriteFor(person, beat.turn, beat.emotions[name2] || "neutral", view && view.emotions, then) : "";
  const src = sprite ? assetUrl(sprite) : "";
  const [size, setSize] = import_react4.default.useState(null);
  import_react4.default.useEffect(() => {
    setSize(null);
    if (!src) return void 0;
    let live = true;
    const img = new Image();
    img.onload = () => {
      if (live && img.naturalHeight) setSize([img.naturalWidth, img.naturalHeight]);
    };
    img.src = src;
    return () => {
      live = false;
    };
  }, [src]);
  if (!src) return { src: "", crop: null };
  const record = Object.values(person.sprites || {}).find((r) => r && r.assetId === sprite);
  return { src, crop: faceCrop(faceBoxOf(record, size), size) };
}
function RecallFace({ beat, view, tone = "" }) {
  const recall = beat && beat.recall;
  const people = new Map((view && view.cast || []).map((p4) => [p4.name, p4]));
  const name2 = recall && beat.type !== "narration" ? (beat.speakers || [beat.speaker]).find((n) => recall.who.includes(n) && people.has(n)) : "";
  const person = name2 ? people.get(name2) : null;
  const { src, crop } = useFace(person, beat, view, recall && recall.then && recall.then[name2]);
  if (!src) return null;
  return /* @__PURE__ */ import_react4.default.createElement("div", { className: "fg-recall-face", key: name2, "data-tone": tone || recall.tone || "warm", style: { "--speaker": person.color || void 0 }, "aria-hidden": "true" }, crop && /* @__PURE__ */ import_react4.default.createElement("img", { src, alt: "", draggable: "false", style: { width: crop.width + "%", left: crop.left + "%", top: crop.top + "%" } }));
}
var HIT_SOUND = { hit: "impact", crit: "slam", miss: "whoosh", block: "impact", down: "slam", heal: "ding" };
var HIT_SHAKE = { hit: [["shake", 1]], crit: [["shake", 3], ["redflash", 1]], block: [["shake", 1]], down: [["shake", 2]] };
function HitImpact({ beat, sound = true, fx = null }) {
  const hit = beat.hit;
  const onStage2 = (beat.cast || []).some((c) => c.name === hit.to);
  const [impact, setImpact] = import_react4.default.useState(false);
  import_react4.default.useEffect(() => {
    if (sound && hit.move && hit.effect !== "heal") stinger("whoosh");
    const t = setTimeout(() => {
      setImpact(true);
      if (sound) stinger(HIT_SOUND[hit.effect] || "impact");
      if (fx) for (const [kind, power] of HIT_SHAKE[hit.effect] || []) fx({ kind, power });
    }, HIT_IMPACT_MS);
    return () => clearTimeout(t);
  }, []);
  return impact && !onStage2 && hit.effect !== "miss" ? /* @__PURE__ */ import_react4.default.createElement("div", { className: "fg-hurt", "data-effect": hit.effect, "aria-hidden": "true" }) : null;
}
var MOMENT_HOLD_MS = { photo: 2700, touch: 2200, pat: 1300, poke: 1100, cheers: 1900, cook: 2600, nickname: 2900, promise: 3e3, contact: 2600 };
var CLINK_AT_MS = 520;
function Cup({ kind }) {
  if (kind === "glass") return /* @__PURE__ */ import_react4.default.createElement("svg", { viewBox: "0 0 40 64", "aria-hidden": "true" }, /* @__PURE__ */ import_react4.default.createElement("path", { d: "M7 3h26q1 21-13 27Q6 24 7 3z", fill: "rgba(235,245,255,.35)", stroke: "#fff", strokeWidth: "1.6" }), /* @__PURE__ */ import_react4.default.createElement("path", { d: "M8.5 12h23q-1.5 14-11.5 16.5Q10 26 8.5 12z", fill: "#e8577a", opacity: ".85" }), /* @__PURE__ */ import_react4.default.createElement("path", { d: "M19 30h2v22h-2z", fill: "#fff" }), /* @__PURE__ */ import_react4.default.createElement("ellipse", { cx: "20", cy: "54", rx: "10", ry: "2.6", fill: "#fff" }));
  if (kind === "can") return /* @__PURE__ */ import_react4.default.createElement("svg", { viewBox: "0 0 40 64", "aria-hidden": "true" }, /* @__PURE__ */ import_react4.default.createElement("rect", { x: "8", y: "6", width: "24", height: "52", rx: "4", fill: "#d9534f", stroke: "#fff", strokeWidth: "1.4" }), /* @__PURE__ */ import_react4.default.createElement("ellipse", { cx: "20", cy: "7", rx: "11", ry: "2.6", fill: "#e9e9ee" }), /* @__PURE__ */ import_react4.default.createElement("rect", { x: "8", y: "24", width: "24", height: "12", fill: "#fff", opacity: ".85" }));
  if (kind === "plastic") return /* @__PURE__ */ import_react4.default.createElement("svg", { viewBox: "0 0 40 64", "aria-hidden": "true" }, /* @__PURE__ */ import_react4.default.createElement("path", { d: "M6 6h28l-4 52H10z", fill: "rgba(255,255,255,.5)", stroke: "#fff", strokeWidth: "1.4" }), /* @__PURE__ */ import_react4.default.createElement("path", { d: "M8.6 20h22.8l-2.6 36H11.2z", fill: "#f5b041", opacity: ".85" }));
  const fill = { wood: "#a8743f", metal: "#c3c8d2" }[kind] || "#f4f1ea";
  return /* @__PURE__ */ import_react4.default.createElement("svg", { viewBox: "0 0 52 64", "aria-hidden": "true" }, /* @__PURE__ */ import_react4.default.createElement("path", { d: "M36 20h6q6 0 6 9v4q0 9-6 9h-6", fill: "none", stroke: fill, strokeWidth: "4" }), /* @__PURE__ */ import_react4.default.createElement("rect", { x: "4", y: "10", width: "33", height: "48", rx: "5", fill, stroke: "#fff", strokeWidth: "1.4" }), /* @__PURE__ */ import_react4.default.createElement("path", { d: "M4 14q4-8 8-3 4-7 8-1 5-6 9 0 4-5 8 2v4H4z", fill: "#fff8e8" }));
}
function MomentLayer({ beat, view, sound = true }) {
  const m = beat.moment;
  const [gone, setGone] = import_react4.default.useState(false);
  import_react4.default.useEffect(() => {
    if (sound) {
      if (m.kind === "cheers") foley("clink-" + (m.text || "glass"), CLINK_AT_MS);
      else if (MOMENT_FOLEY[m.kind]) foley(MOMENT_FOLEY[m.kind], m.kind === "pat" || m.kind === "poke" ? 150 : 0);
    }
    const t = setTimeout(() => setGone(true), MOMENT_HOLD_MS[m.kind] || 2400);
    return () => clearTimeout(t);
  }, []);
  if (gone || m.kind === "fireworks") return null;
  const hold = { "--hold": (MOMENT_HOLD_MS[m.kind] || 2400) - 450 + "ms" };
  if (m.kind === "pat" || m.kind === "poke") return null;
  if (m.kind === "photo") return /* @__PURE__ */ import_react4.default.createElement("div", { className: "fg-moment", "data-kind": "photo", style: hold, "aria-hidden": "true" }, /* @__PURE__ */ import_react4.default.createElement("div", { className: "fg-photo-flash" }), /* @__PURE__ */ import_react4.default.createElement("div", { className: "fg-photo" }, m.text && /* @__PURE__ */ import_react4.default.createElement("div", { className: "fg-photo-caption" }, m.text)));
  if (m.kind === "touch") return /* @__PURE__ */ import_react4.default.createElement("div", { className: "fg-moment", "data-kind": "touch", style: hold, "aria-hidden": "true" }, /* @__PURE__ */ import_react4.default.createElement("i", { className: "fg-touch-ring" }), /* @__PURE__ */ import_react4.default.createElement("i", { className: "fg-touch-ring", style: { animationDelay: ".45s" } }), /* @__PURE__ */ import_react4.default.createElement("i", { className: "fg-touch-ring", style: { animationDelay: ".9s" } }));
  if (m.kind === "cheers") return /* @__PURE__ */ import_react4.default.createElement("div", { className: "fg-moment", "data-kind": "cheers", style: { ...hold, "--clink": CLINK_AT_MS + "ms" }, "aria-hidden": "true" }, /* @__PURE__ */ import_react4.default.createElement("div", { className: "fg-cup is-left" }, /* @__PURE__ */ import_react4.default.createElement(Cup, { kind: m.text })), /* @__PURE__ */ import_react4.default.createElement("div", { className: "fg-cup is-right" }, /* @__PURE__ */ import_react4.default.createElement(Cup, { kind: m.text })), /* @__PURE__ */ import_react4.default.createElement("i", { className: "fg-clink" }));
  const person = m.who ? (view && view.cast || []).find((p4) => p4.name === m.who) : null;
  const color = person && person.color || "";
  return /* @__PURE__ */ import_react4.default.createElement("div", { className: "fg-moment", "data-kind": m.kind, style: hold, "aria-hidden": "true" }, /* @__PURE__ */ import_react4.default.createElement("div", { className: "fg-moment-card", style: color ? { "--who": color } : void 0 }, m.kind === "cook" && /* @__PURE__ */ import_react4.default.createElement(import_react4.default.Fragment, null, /* @__PURE__ */ import_react4.default.createElement("div", { className: "fg-steam" }, /* @__PURE__ */ import_react4.default.createElement("i", null), /* @__PURE__ */ import_react4.default.createElement("i", null), /* @__PURE__ */ import_react4.default.createElement("i", null)), /* @__PURE__ */ import_react4.default.createElement("div", { className: "fg-moment-kicker" }, "COMPLETE"), /* @__PURE__ */ import_react4.default.createElement("div", { className: "fg-moment-main" }, m.text), /* @__PURE__ */ import_react4.default.createElement("div", { className: "fg-moment-sub" }, "做好了")), m.kind === "nickname" && /* @__PURE__ */ import_react4.default.createElement(import_react4.default.Fragment, null, /* @__PURE__ */ import_react4.default.createElement("div", { className: "fg-moment-kicker" }, "NEW NAME"), /* @__PURE__ */ import_react4.default.createElement("div", { className: "fg-moment-main" }, "「", m.text, "」"), /* @__PURE__ */ import_react4.default.createElement("div", { className: "fg-moment-sub" }, m.who ? `${m.who}第一次这样叫你` : "第一次这样叫你")), m.kind === "promise" && /* @__PURE__ */ import_react4.default.createElement(import_react4.default.Fragment, null, /* @__PURE__ */ import_react4.default.createElement("div", { className: "fg-moment-kicker" }, "PROMISE"), /* @__PURE__ */ import_react4.default.createElement("div", { className: "fg-moment-sub" }, "约定"), /* @__PURE__ */ import_react4.default.createElement("div", { className: "fg-moment-main" }, m.text), m.place && /* @__PURE__ */ import_react4.default.createElement("div", { className: "fg-moment-place" }, m.place)), m.kind === "contact" && /* @__PURE__ */ import_react4.default.createElement(import_react4.default.Fragment, null, /* @__PURE__ */ import_react4.default.createElement("div", { className: "fg-moment-kicker" }, "CONTACT"), /* @__PURE__ */ import_react4.default.createElement("div", { className: "fg-contact" }, /* @__PURE__ */ import_react4.default.createElement("i", { className: "fg-contact-face" }, m.who ? Array.from(m.who)[0] : "♪"), /* @__PURE__ */ import_react4.default.createElement("div", null, /* @__PURE__ */ import_react4.default.createElement("div", { className: "fg-moment-main" }, m.who || "新的联系人"), /* @__PURE__ */ import_react4.default.createElement("div", { className: "fg-moment-sub" }, "已交换联系方式"))))));
}
var BURSTS = [{ x: 30, y: 24, hue: 340, at: 0 }, { x: 70, y: 16, hue: 45, at: 650 }, { x: 52, y: 30, hue: 195, at: 1300 }];
var FIREWORK_RISE_MS = 700;
var FIREWORKS_MS = 3800;
function Fireworks({ sound = true }) {
  const [gone, setGone] = import_react4.default.useState(false);
  import_react4.default.useEffect(() => {
    if (sound) for (const b of BURSTS) {
      foley("firework-launch", b.at);
      foley("firework-boom", b.at + FIREWORK_RISE_MS);
    }
    const t = setTimeout(() => setGone(true), FIREWORKS_MS);
    return () => clearTimeout(t);
  }, []);
  if (gone) return null;
  return /* @__PURE__ */ import_react4.default.createElement("div", { className: "fg-fireworks", "aria-hidden": "true", style: { "--rise": FIREWORK_RISE_MS + "ms" } }, BURSTS.map((b, i) => /* @__PURE__ */ import_react4.default.createElement("div", { key: i, className: "fg-firework", style: { "--x": b.x + "%", "--y": b.y + "%", "--hue": b.hue, "--at": b.at + "ms" } }, /* @__PURE__ */ import_react4.default.createElement("i", { className: "fg-fw-glow" }), /* @__PURE__ */ import_react4.default.createElement("i", { className: "fg-fw-trail" }), /* @__PURE__ */ import_react4.default.createElement("i", { className: "fg-fw-burst" }), /* @__PURE__ */ import_react4.default.createElement("i", { className: "fg-fw-burst is-inner" }))));
}
var PHONE_END_MS = 2600;
var PHONE_BANNER_MS = { notify: 3800, voicemail: 4800 };
var callClock = /* @__PURE__ */ new Map();
var clock = (ms) => {
  const s = Math.max(0, Math.round(ms / 1e3));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};
var firstChar = (name2) => Array.from(String(name2 || ""))[0] || "?";
function PhoneFace({ person, beat, view, name: name2, className = "fg-phone-face" }) {
  const { src, crop } = useFace(person, beat, view);
  return /* @__PURE__ */ import_react4.default.createElement("div", { className, style: person && person.color ? { "--who": person.color } : void 0 }, src && crop ? /* @__PURE__ */ import_react4.default.createElement("img", { src, alt: "", draggable: "false", style: { width: crop.width + "%", left: crop.left + "%", top: crop.top + "%" } }) : /* @__PURE__ */ import_react4.default.createElement("span", null, firstChar(name2)));
}
var personOf = (view, name2) => (name2 ? (view && view.cast || []).find((p4) => p4.name === name2) : null) || null;
var HANDSET = /* @__PURE__ */ import_react4.default.createElement("svg", { viewBox: "0 0 24 24", "aria-hidden": "true" }, /* @__PURE__ */ import_react4.default.createElement("path", { d: "M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1z", fill: "currentColor" }));
var CAMERA = /* @__PURE__ */ import_react4.default.createElement("svg", { viewBox: "0 0 24 24", "aria-hidden": "true" }, /* @__PURE__ */ import_react4.default.createElement("path", { d: "M4 6h11a2 2 0 0 1 2 2v1.5l4-2.5v10l-4-2.5V16a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z", fill: "currentColor" }));
function PhoneRing({ beat, view, sound = true }) {
  const call2 = beat.call;
  import_react4.default.useEffect(() => {
    if (sound) foley(PHONE_FOLEY[call2.dir === "in" ? "call" : "dial"]);
  }, [beat.key]);
  const person = personOf(view, call2.who);
  const incoming = call2.dir === "in";
  const label = incoming ? call2.video ? "视频通话邀请" : "来电" : call2.video ? "正在发起视频通话…" : "正在呼叫…";
  return /* @__PURE__ */ import_react4.default.createElement("div", { className: "fg-phone", "data-dir": call2.dir, "data-video": call2.video ? "" : void 0, "data-side": beat.split ? "left" : void 0, "aria-hidden": "true" }, /* @__PURE__ */ import_react4.default.createElement("div", { className: "fg-phone-card" }, /* @__PURE__ */ import_react4.default.createElement("div", { className: "fg-phone-label" }, call2.video && CAMERA, label), /* @__PURE__ */ import_react4.default.createElement("div", { className: "fg-phone-avatar" }, incoming && /* @__PURE__ */ import_react4.default.createElement(import_react4.default.Fragment, null, /* @__PURE__ */ import_react4.default.createElement("i", { className: "fg-phone-ripple" }), /* @__PURE__ */ import_react4.default.createElement("i", { className: "fg-phone-ripple", style: { animationDelay: ".6s" } })), /* @__PURE__ */ import_react4.default.createElement(PhoneFace, { person, beat, view, name: call2.who })), /* @__PURE__ */ import_react4.default.createElement("div", { className: "fg-phone-name" }, call2.who || "未知号码"), /* @__PURE__ */ import_react4.default.createElement("div", { className: "fg-phone-keys" }, /* @__PURE__ */ import_react4.default.createElement("i", { className: "fg-phone-key is-decline" }, HANDSET), incoming && /* @__PURE__ */ import_react4.default.createElement("i", { className: "fg-phone-key is-accept" }, call2.video ? CAMERA : HANDSET))));
}
function CallChip({ call: call2, sound = true }) {
  const [now, setNow] = import_react4.default.useState(() => Date.now());
  import_react4.default.useEffect(() => {
    if (!callClock.has(call2.id)) callClock.set(call2.id, Date.now());
    if (sound) foley(PHONE_FOLEY.pickup);
    const t = setInterval(() => setNow(Date.now()), 1e3);
    return () => clearInterval(t);
  }, []);
  return /* @__PURE__ */ import_react4.default.createElement("span", { className: "fg-pill fg-call-chip", "data-video": call2.video ? "" : void 0, title: call2.video ? "视频通话中" : "通话中" }, /* @__PURE__ */ import_react4.default.createElement("i", { className: "fg-call-dot" }), call2.video ? CAMERA : HANDSET, call2.who || "通话中", /* @__PURE__ */ import_react4.default.createElement("b", null, clock(now - (callClock.get(call2.id) || now))));
}
function VideoPip({ beat, view }) {
  const call2 = beat.call;
  const person = personOf(view, call2.who);
  const talking = (beat.speakers || [beat.speaker]).includes(call2.who);
  return /* @__PURE__ */ import_react4.default.createElement("div", { className: `fg-pip${talking ? " is-talking" : ""}`, "aria-hidden": "true" }, /* @__PURE__ */ import_react4.default.createElement(PhoneFace, { person, beat, view, name: call2.who, className: "fg-pip-face" }), /* @__PURE__ */ import_react4.default.createElement("div", { className: "fg-pip-name" }, /* @__PURE__ */ import_react4.default.createElement("i", null), call2.who || "视频通话"));
}
var END_TEXT = {
  missed: { in: "未接来电", out: "无人接听" },
  declined: { in: "已拒接", out: "对方已拒接" },
  hungup: { in: "对方挂断了", out: "对方挂断了" }
};
function PhoneEnd({ beat, view, sound = true }) {
  const end = beat.phone;
  const dir = end.dir || "in";
  const [gone, setGone] = import_react4.default.useState(false);
  const started = end.live && end.id ? callClock.get(end.id) : 0;
  import_react4.default.useEffect(() => {
    if (sound) foley(end.result === "hungup" || end.result === "declined" && dir === "out" ? PHONE_FOLEY.busy : end.result === "missed" && dir === "in" ? "" : PHONE_FOLEY.end);
    const t = setTimeout(() => setGone(true), PHONE_END_MS);
    return () => clearTimeout(t);
  }, []);
  const [ended] = import_react4.default.useState(() => Date.now());
  if (gone) return null;
  const text = end.result ? END_TEXT[end.result][dir] : "通话结束";
  return /* @__PURE__ */ import_react4.default.createElement("div", { className: "fg-phone is-end", "data-result": end.result || "ended", style: { "--hold": PHONE_END_MS - 450 + "ms" }, "aria-hidden": "true" }, /* @__PURE__ */ import_react4.default.createElement("div", { className: "fg-phone-card" }, /* @__PURE__ */ import_react4.default.createElement("div", { className: "fg-phone-avatar" }, /* @__PURE__ */ import_react4.default.createElement(PhoneFace, { person: personOf(view, end.who), beat, view, name: end.who })), /* @__PURE__ */ import_react4.default.createElement("div", { className: "fg-phone-name" }, end.who || "通话"), /* @__PURE__ */ import_react4.default.createElement("div", { className: "fg-phone-result" }, /* @__PURE__ */ import_react4.default.createElement("i", null, HANDSET), text, !end.result && started ? ` · ${clock(ended - started)}` : "")));
}
function PhoneBanner({ beat, view, sound = true }) {
  const m = beat.phone;
  const [gone, setGone] = import_react4.default.useState(false);
  const hold = PHONE_BANNER_MS[m.kind] || 3800;
  import_react4.default.useEffect(() => {
    if (sound) foley(PHONE_FOLEY[m.kind]);
    const t = setTimeout(() => setGone(true), hold);
    return () => clearTimeout(t);
  }, []);
  if (gone) return null;
  const person = personOf(view, m.who);
  const voicemail = m.kind === "voicemail";
  return /* @__PURE__ */ import_react4.default.createElement("div", { className: "fg-notify", "data-kind": m.kind, style: { "--hold": hold - 500 + "ms" }, "aria-hidden": "true" }, /* @__PURE__ */ import_react4.default.createElement(PhoneFace, { person, beat, view, name: m.who || (voicemail ? "留" : "通"), className: "fg-notify-icon" }), /* @__PURE__ */ import_react4.default.createElement("div", { className: "fg-notify-body" }, /* @__PURE__ */ import_react4.default.createElement("div", { className: "fg-notify-head" }, /* @__PURE__ */ import_react4.default.createElement("b", null, voicemail ? `语音留言 · ${m.who || "未知号码"}` : m.who || "通知"), /* @__PURE__ */ import_react4.default.createElement("span", null, "现在")), voicemail && /* @__PURE__ */ import_react4.default.createElement("div", { className: "fg-notify-wave" }, /* @__PURE__ */ import_react4.default.createElement("i", { className: "fg-notify-play" }), Array.from({ length: 18 }, (_, i) => /* @__PURE__ */ import_react4.default.createElement("i", { key: i, style: { "--h": 30 + i * 37 % 70 + "%", animationDelay: -i * 0.09 + "s" } }))), /* @__PURE__ */ import_react4.default.createElement("div", { className: "fg-notify-text" }, voicemail ? `「${m.text}」` : m.text)));
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
function CgFrame({ img, src, mood, leaving, sound }) {
  const box = import_react4.default.useRef(null);
  const enter = cgEntrance(img, mood);
  import_react4.default.useEffect(() => {
    if (sound && !leaving && enter === "impact") stinger("impact");
  }, []);
  const ratio = usePanRatio(box, src, img.versions && img.versions[img.current]);
  const pan = ratio ? { "--r": ratio.toFixed(4), "--pan": `${Math.round(16 + (1 - ratio) * 16)}s` } : null;
  return /* @__PURE__ */ import_react4.default.createElement(
    "div",
    {
      className: `fg-cg${ratio ? " is-tall" : ""}${leaving ? " is-leaving" : ""}`,
      ref: box,
      style: pan,
      "data-in": enter,
      "data-out": cgExit(img, mood),
      "data-motion": cgStay(img)
    },
    /* @__PURE__ */ import_react4.default.createElement("div", { className: "fg-cg-art" }, ratio ? /* @__PURE__ */ import_react4.default.createElement(import_react4.default.Fragment, null, /* @__PURE__ */ import_react4.default.createElement("div", { className: "fg-cg-back", style: { backgroundImage: `url("${src}")` } }), /* @__PURE__ */ import_react4.default.createElement("img", { className: "fg-cg-pan", src, alt: "", draggable: false })) : /* @__PURE__ */ import_react4.default.createElement("div", { className: "fg-cg-img", style: { backgroundImage: `url("${src}")` } }))
  );
}
function CgLayer({ beat, sound = false }) {
  const img = beat.cg;
  const src = cgSrc(img, assetUrl);
  const cur = src ? { img, src, key: img.id + ":" + img.current, mood: beat.scene && beat.scene.mood } : null;
  const prev = import_react4.default.useRef(null);
  const ghosts = import_react4.default.useRef([]);
  const [, refresh] = import_react4.default.useReducer((n) => n + 1, 0);
  const was = prev.current;
  if (was && (!cur || was.key !== cur.key)) {
    ghosts.current = ghosts.current.filter((g) => g.key !== was.key);
    const ms = CG_OUT_MS[cgExit(was.img, was.mood)];
    if (ms && (!cur || was.img.id !== cur.img.id)) ghosts.current.push({ ...was, until: Date.now() + ms });
  }
  prev.current = cur;
  if (cur) {
    if (was && was.key === cur.key) cur.mood = was.mood;
    ghosts.current = ghosts.current.filter((g) => g.key !== cur.key);
  }
  const pending = ghosts.current.length;
  import_react4.default.useEffect(() => {
    if (!pending) return void 0;
    const wait = Math.max(0, Math.min(...ghosts.current.map((g) => g.until)) - Date.now());
    const t = setTimeout(() => {
      const now = Date.now() + 16;
      ghosts.current = ghosts.current.filter((g) => g.until > now);
      refresh();
    }, wait);
    return () => clearTimeout(t);
  });
  const frames = [...ghosts.current.map((g) => ({ ...g, leaving: true })), ...cur ? [{ ...cur, leaving: false }] : []];
  const waiting = !cur && img && img.status !== "failed" && img.status !== "cancelled";
  return /* @__PURE__ */ import_react4.default.createElement(import_react4.default.Fragment, null, frames.map((f) => /* @__PURE__ */ import_react4.default.createElement(CgFrame, { key: f.key, img: f.img, src: f.src, mood: f.mood, leaving: f.leaving, sound })), waiting && /* @__PURE__ */ import_react4.default.createElement("div", { className: "fg-cg-wait" }, /* @__PURE__ */ import_react4.default.createElement("i", null), img.status === "writing" ? "插画分镜中" : "插画绘制中", img.title ? `「${img.title}」` : ""));
}
function TitleCard({ beat, delay = 0 }) {
  if (!beat.sceneEnter || !beat.scene.location) return null;
  return /* @__PURE__ */ import_react4.default.createElement("div", { className: "fg-titlecard", key: beat.key, style: delay ? { animationDelay: delay + "ms" } : null }, /* @__PURE__ */ import_react4.default.createElement("div", { className: "fg-titlecard-line" }), /* @__PURE__ */ import_react4.default.createElement("div", { className: "fg-titlecard-name" }, beat.scene.location), /* @__PURE__ */ import_react4.default.createElement("div", { className: "fg-titlecard-sub" }, [MODE_LABEL[beat.mode], TIME_LABEL[beat.scene.time], beat.scene.weather !== "clear" ? WEATHER_LABEL[beat.scene.weather] : ""].filter(Boolean).join(" · "), " — Turn ", beat.turn), /* @__PURE__ */ import_react4.default.createElement("div", { className: "fg-titlecard-line", style: { width: "14cqw", marginTop: "1cqw" } }));
}
var CUT_MS = 2300;
var HAZE_MS = 1800;
var RECALL_HOLD_MS = { in: 1100, out: 800 };
function CutCard({ beat, out }) {
  const cut = beat.cut;
  if (!cut) return null;
  return /* @__PURE__ */ import_react4.default.createElement("div", { className: `fg-cut${out ? " is-out" : ""}`, "data-kind": cut.kind, key: beat.key, "aria-live": "polite" }, /* @__PURE__ */ import_react4.default.createElement("div", { className: "fg-cut-inner" }, /* @__PURE__ */ import_react4.default.createElement("div", { className: "fg-cut-kicker" }, /* @__PURE__ */ import_react4.default.createElement("i", null), CUT_LABEL[cut.kind] || "", /* @__PURE__ */ import_react4.default.createElement("i", null)), /* @__PURE__ */ import_react4.default.createElement("div", { className: "fg-cut-text" }, cut.text)));
}
function FadeLayer({ name: name2, value, ms = 1200, cut = false }) {
  const [layers, setLayers] = import_react4.default.useState(() => [{ id: 0, value, ms }]);
  import_react4.default.useEffect(() => {
    setLayers((list2) => {
      const top = list2[list2.length - 1];
      if (top.value === value) return list2;
      if (cut) return [{ id: top.id + 1, value, ms: 0 }];
      return [...list2.filter((l) => !l.leaving).map((l) => ({ ...l, leaving: true, ms })), { id: top.id + 1, value, ms }];
    });
  }, [value]);
  import_react4.default.useEffect(() => {
    const leaving = layers.filter((l) => l.leaving);
    if (!leaving.length) return void 0;
    const t = setTimeout(() => setLayers((list2) => list2.filter((l) => !l.leaving)), Math.max(...leaving.map((l) => l.ms)));
    return () => clearTimeout(t);
  }, [layers]);
  return layers.filter((l) => l.value).map((l) => /* @__PURE__ */ import_react4.default.createElement("div", { key: l.id, className: `fg-${name2}${l.leaving ? " is-leave" : ""}`, "data-v": l.value, style: { "--fade": l.ms + "ms" }, "aria-hidden": "true" }));
}
var QUAKE = [[0, 0], [0.6, 300], [1.2, 420], [2, 560]];
function quake(el, power) {
  const [amp2, ms] = QUAKE[power] || QUAKE[1];
  const path = [0, -1, 0.8, -0.7, 0.5, -0.3, 0.15, 0];
  el.animate(path.map((k, i) => ({ transform: `translate(${(k * amp2).toFixed(3)}%, ${((i % 2 ? -0.6 : 0.6) * k * amp2).toFixed(3)}%)` })), { duration: ms, easing: "linear" });
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
function faceAt(camera, name2) {
  if (!camera || !name2) return null;
  const actor = [...camera.querySelectorAll(".fg-actor:not(.is-leaving)")].find((el) => el.dataset.name === name2);
  if (!actor || !camera.offsetWidth || !camera.offsetHeight) return null;
  let x = actor.offsetLeft;
  const head = parseFloat(actor.style.getPropertyValue("--head"));
  const k = parseFloat(actor.style.getPropertyValue("--k")) || 1;
  let y = actor.offsetTop + actor.offsetHeight * ((Number.isFinite(head) ? head / 100 : 0.1) + (0.08 + FACE_RATIO / 2) * k);
  for (let el = actor.offsetParent; el && el !== camera && camera.contains(el); el = el.offsetParent) {
    x += el.offsetLeft;
    y += el.offsetTop;
  }
  return [x / camera.offsetWidth * 100, y / camera.offsetHeight * 100];
}
function useCamera(beat, cameraRef) {
  const [cam, setCam] = import_react4.default.useState({ kind: "", style: null });
  import_react4.default.useEffect(() => {
    setCam((c) => c.kind ? { kind: "", style: null } : c);
    if (!beat || !beat.cam) return void 0;
    const raf = requestAnimationFrame(() => {
      const who = beat.camOn || (beat.speakers ? beat.speakers[0] : beat.speaker);
      setCam({ kind: beat.cam, style: aimCamera(beat.cam, faceAt(cameraRef && cameraRef.current, who)) });
    });
    return () => cancelAnimationFrame(raf);
  }, [beat && beat.key]);
  return cam;
}
var TRANSITION_OVERLAY = { flash: "", black: "is-black", blink: "is-blink", glitch: "is-glitch", haze: "is-haze" };
var RECALL_ENTRY = { sweet: "is-bloom", dread: "is-dread", flash: "is-snap", haze: "is-mist" };
function Flash({ beat, recallStyle = "text", tone = "", wake = false, rising = false, changed = false }) {
  if (!beat) return null;
  if (wake) return /* @__PURE__ */ import_react4.default.createElement("div", { key: beat.key, className: `fg-flash is-wake${rising ? " is-rising" : ""}`, style: { "--rise": WAKE_SWAP_MS + "ms", "--clear": WAKE_MS - WAKE_SWAP_MS + "ms" } });
  const kind = beat.cam === "flash" ? "" : beat.cam === "redflash" ? "is-red" : beat.cam === "fadeblack" ? "is-black" : null;
  const tr = changed ? null : TRANSITION_OVERLAY[beat.transition] ?? null;
  const entry = beat.recallEdge === "in" ? RECALL_ENTRY[tone || beat.recall && beat.recall.tone] : null;
  const cls = kind ?? tr ?? entry ?? (beat.recallEdge && recallStyle === "ghost" ? "is-mist" : null);
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
  const textfx = beat ? beat.textfx : null;
  const plan = import_react5.default.useMemo(() => planLine(chars, speed || 0, { say, stress, emo, type, seed: key, textfx }), [chars, speed, say, stress, emo, type, key, textfx]);
  const [shown, setShown] = import_react5.default.useState({ key, done: false });
  const [start, setStart] = import_react5.default.useState({ key: "", at: NaN });
  if (shown.key !== key) setShown({ key, done: false });
  const done = !speed || !chars.length || shown.key === key && shown.done;
  const fxRef = import_react5.default.useRef(onFx);
  fxRef.current = onFx;
  const voiceRef = import_react5.default.useRef(voice);
  voiceRef.current = voice;
  const pending = import_react5.default.useRef([]);
  const ticking = import_react5.default.useRef(null);
  const dropPending = () => {
    pending.current.forEach(clearTimeout);
    pending.current = [];
    clearInterval(ticking.current);
    ticking.current = null;
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
    const sounded = (i) => plan.blips && plan.blips[i] ? { ...delivery, gain: delivery.gain * plan.blips[i].gain, pitch: delivery.pitch * plan.blips[i].pitch } : delivery;
    let next = 0;
    const tick = sound ? setInterval(() => {
      const now = performance.now() - t0;
      for (; next < chars.length && times[next] <= now; next += 1) {
        const sameBurst = next > 0 && times[next] === times[next - 1];
        if (next % delivery.every === 0 && !sameBurst && !SILENT.test(chars[next])) blip(voiceRef.current, sounded(next));
      }
      if (next >= chars.length) clearInterval(tick);
    }, Math.max(8, Math.min(speed, plan.gap))) : null;
    ticking.current = tick;
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
function origChars(orig, times, count, speed) {
  const list2 = Array.from(orig);
  const at2 = (i) => times && times.length ? times[Math.min(times.length - 1, i)] : i * speed;
  return list2.map((ch, j) => [ch, count ? at2(Math.floor(j / list2.length * count)) : 0]);
}
function DialogBox({ beat, chars, plan, done, waiting, away = false, color, quick, progress, status, hiddenText, recall = null, face = null }) {
  const speaker = beat.alias || beat.speaker;
  const showName = speaker && beat.type !== "narration" && !(recall && recall.name === "hide");
  const speed = quick.speed;
  const times = plan ? plan.times : null;
  const marks = plan ? plan.marks : [];
  const tx = plan ? plan.tx : [];
  const charClass = (i) => "fg-char" + (marks[i] ? " is-" + marks[i] : "") + (tx[i] ? " tx-" + tx[i] : "");
  const charStyle = (i) => ({ "--d": (times ? times[i] : i * speed) + "ms", ...tx[i] ? { "--k": plan.txk[i], "--i": plan.txi[i] } : {} });
  const voiceChip = !recall && beat.voice && VOICE_LABEL[beat.voice] ? /* @__PURE__ */ import_react5.default.createElement("div", { className: "fg-voice-chip", "data-voice": beat.voice }, /* @__PURE__ */ import_react5.default.createElement("i", null), /* @__PURE__ */ import_react5.default.createElement("i", null), /* @__PURE__ */ import_react5.default.createElement("i", null), /* @__PURE__ */ import_react5.default.createElement("span", null, VOICE_LABEL[beat.voice])) : null;
  return /* @__PURE__ */ import_react5.default.createElement("div", { className: `fg-dialog${away ? " is-away" : ""}`, "data-voice": beat.voice || void 0, "data-recall": recall ? recall.tone || "warm" : void 0, "data-recall-name": recall ? recall.name : void 0, style: { "--speaker": color || void 0 } }, /* @__PURE__ */ import_react5.default.createElement("div", { className: "fg-box" }), face, (showName || voiceChip) && /* @__PURE__ */ import_react5.default.createElement("div", { className: "fg-name", key: beat.speaker + beat.alias + (beat.voice || "") }, showName && /* @__PURE__ */ import_react5.default.createElement("div", { className: "fg-name-plate" }, speaker), voiceChip, showName && !recall && beat.emo && quick.emoLabel && /* @__PURE__ */ import_react5.default.createElement("div", { className: "fg-name-sub" }, quick.emoLabel)), hiddenText && /* @__PURE__ */ import_react5.default.createElement("div", { className: "fg-text is-cardhint" }, "〔 ", CARD_LABEL[beat.card] || "卡片", " 〕"), !hiddenText && /* @__PURE__ */ import_react5.default.createElement("div", { className: `fg-text is-${beat.type}${plan && plan.say ? " say-" + plan.say : ""}${done ? " is-done" : waiting ? " is-wait" : ""}`, key: beat.key, "aria-live": "polite" }, beat.orig && /* @__PURE__ */ import_react5.default.createElement("div", { className: "fg-orig", lang: "und" }, origChars(beat.orig, times, chars.length, speed).map(([ch, d], i) => /* @__PURE__ */ import_react5.default.createElement("span", { key: i, className: "fg-char", style: { "--d": d + "ms" } }, ch))), /* @__PURE__ */ import_react5.default.createElement("span", { className: "fg-line" }, chars.map((ch, i) => /* @__PURE__ */ import_react5.default.createElement("span", { key: i, className: charClass(i), style: charStyle(i) }, ch)))), done && /* @__PURE__ */ import_react5.default.createElement("div", { className: "fg-wait", "aria-hidden": "true" }), status && /* @__PURE__ */ import_react5.default.createElement("div", { className: "fg-status" }, status), /* @__PURE__ */ import_react5.default.createElement("div", { className: "fg-progress" }, /* @__PURE__ */ import_react5.default.createElement("i", { style: { width: Math.round(progress * 100) + "%" } })), /* @__PURE__ */ import_react5.default.createElement("div", { className: "fg-quick", onClick: (e) => e.stopPropagation() }, quick.items.map((item) => /* @__PURE__ */ import_react5.default.createElement("button", { key: item.id, type: "button", className: item.on ? "is-on" : "", title: item.title, onClick: () => {
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
function PlayView({ aa, talk, label, still: still2, size, rects, close, className = "" }) {
  const fallback = /* @__PURE__ */ import_react6.default.createElement("img", { src: still2, alt: "" });
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
  const still2 = assetUrl(record.assetId);
  return /* @__PURE__ */ import_react6.default.createElement("button", { type: "button", className: "fg-sprite-art", title: "点一下放大看", onClick: onOpen }, record.aa ? /* @__PURE__ */ import_react6.default.createElement(AaSprite, { aa: record.aa, talk, label, fallback: /* @__PURE__ */ import_react6.default.createElement("img", { src: still2, alt: label }), className: "fg-aa" }) : /* @__PURE__ */ import_react6.default.createElement("img", { src: still2, alt: label }), record.aa && /* @__PURE__ */ import_react6.default.createElement("i", null, "动"), /* @__PURE__ */ import_react6.default.createElement("span", null, "🔍"));
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
  const still2 = assetUrl(record.assetId);
  return /* @__PURE__ */ import_react6.default.createElement("div", { className: "fg-lightbox fg-sprite-viewer", onClick: onClose }, /* @__PURE__ */ import_react6.default.createElement("div", { className: "fg-viewer-stage", onClick: (e) => e.stopPropagation() }, animated ? /* @__PURE__ */ import_react6.default.createElement(PlayView, { aa: record.aa, talk, label, still: still2, size: packSize(record), rects, close, className: "is-big" }) : /* @__PURE__ */ import_react6.default.createElement("img", { src: still2, alt: label })), /* @__PURE__ */ import_react6.default.createElement("div", { className: "fg-row", onClick: (e) => e.stopPropagation() }, /* @__PURE__ */ import_react6.default.createElement("span", { className: "fg-pill" }, label, animated ? " · 逆转式动态" : ""), animated && closeUpBox(rects, packSize(record)) && /* @__PURE__ */ import_react6.default.createElement("button", { type: "button", className: "fg-btn", onClick: () => setClose(!close) }, close ? "看全身" : "看脸部特写"), animated && /* @__PURE__ */ import_react6.default.createElement("button", { type: "button", className: "fg-btn", onClick: () => setTalking(!talking) }, talking ? "别说话（只眨眼）" : "说一句"), children, /* @__PURE__ */ import_react6.default.createElement("button", { type: "button", className: "fg-btn", onClick: onClose }, "关闭")));
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
  const median2 = (v) => v.sort((p4, q) => p4 - q)[v.length >> 1];
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
    const [a, b] = [...singles].sort((p4, q) => area(q) - area(p4));
    eyes = iou(a, b) > 0.3 ? [a] : [a, b].sort((p4, q) => p4[0] - q[0]);
  } else if (singles.length === 1) eyes = [singles[0]];
  if (eyes.length === 1 && eyes[0][2] - eyes[0][0] > (eyes[0][3] - eyes[0][1]) * 2.2) {
    const [x0, y0, x1, y1] = eyes[0];
    const cx = (x0 + x1) / 2, gap = (x1 - x0) * 0.06;
    eyes = [[x0, y0, cx - gap, y1], [cx + gap, y0, x1, y1]];
  }
  return { face: faces.sort((p4, q) => area(q) - area(p4))[0] || null, eyes, mouths: of(/mouth|lip/i).filter(small) };
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
  const pct2 = (s) => Math.round(s * 100) + "%";
  let face = null, faceScore = 0, view = null, big = false;
  const f = mainFace(await run("face", whole, fitSize(W, H)), W, H);
  if (f && f.score >= 0.5) {
    face = f.box;
    faceScore = f.score;
    notes.push(`认到脸（把握 ${pct2(f.score)}）`);
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
      notes.push(`没认准脸，按头的位置估（把握 ${pct2(h.score)}）`);
    }
    if (!face && f) {
      face = f.box;
      faceScore = f.score;
      notes.push(`认到脸，但把握不大（${pct2(f.score)}）`);
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
var clamp01 = (v) => Math.min(1, Math.max(0, v));
function classWeights(L, a, b) {
  const iris = clamp01((Math.hypot(a, b) - 6) / 8) * clamp01((Math.max(-a, -b) - 2) / 6);
  const line = clamp01((55 - L) / 15) * (1 - iris);
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
  const ratio = (b, g) => Math.min(1.25, Math.max(0.8, b / g));
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
        const mapped = m ? (g2[i * 3 + c] - m.sg.mu[c]) * ratio(m.sb.sd[c], m.sg.sd[c]) + m.sb.mu[c] : g2[i * 3 + c];
        v += mapped * wg[i * 3 + k];
      }
      fixed[i * 3 + c] = v;
    }
  }
  let used = new Float32Array(n);
  for (let i = 0; i < n; i++) used[i] = inside[i] && de(i) > threshold ? 1 : 0;
  used = maxF(minF(maxF(used, w, h, grow2 * 2 + 1), w, h, 3), w, h, 3);
  used = blur(used, w, h, feather);
  if (keepHair) {
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const X = x0 + x + 0.5, Y = y0 + y + 0.5;
      let k = 0;
      for (const r of rects) {
        const rx = (r[2] - r[0]) / 2, ry = (r[3] - r[1]) / 2;
        const d = ((X - (r[0] + rx)) / rx) ** 2 + ((Y - (r[1] + ry)) / ry) ** 2;
        k = Math.max(k, clamp01((1.08 - d) / 0.16));
      }
      used[y * w + x] *= k;
    }
  }
  for (let i = 0; i < n; i++) used[i] = Math.min(1, used[i]) * inside[i];
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
  const p4 = cleanPatch(prep.src, g.getImageData(0, 0, prep.padW, prep.padH), stateRects(rects, part, state2, prep.h), { classes: part === "eyes", keepHair: part === "eyes" });
  const out = makeCanvas(p4.width, p4.height);
  out.getContext("2d").putImageData(new ImageData(p4.data, p4.width, p4.height), 0, 0);
  return { dataUrl: out.toDataURL("image/png"), x: p4.x, y: p4.y };
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
    const p4 = pack.poses[pack.default_pose].parts[part][state2];
    out[`${part}_${state2}`] = { dataUrl: await assetDataUrl(p4.file), x: p4.x, y: p4.y };
  }
  return out;
}
async function savePack(gameId, person, key, record, size, rects, patches, steps) {
  const parts = {};
  const files2 = {};
  for (const [part, state2] of steps) {
    const p4 = patches[`${part}_${state2}`];
    if (!p4) throw new Error(`还缺「${AA_PARTS[part].states[state2].label}」`);
    const file2 = `${part}_${state2}.png`;
    parts[part] = { ...parts[part] || {}, [state2]: { file: file2, x: p4.x, y: p4.y } };
    files2[file2] = p4.dataUrl;
  }
  const manifest = motionPack({ name: `${person.name}·${emotionLabel(record.emotion || key.split("|").pop())}`, width: size.w, height: size.h, still: "still.png", patches: parts });
  await api.cast(gameId, "aa-pack", { name: person.name, key, keepImage: true, manifest, files: files2, rects });
}
function RectEditor({ src, width, height, rects, onChange, zoom, parts = ["eyes", "mouth"], names = BOX_NAMES }) {
  const svg = import_react7.default.useRef(null);
  const drag = import_react7.default.useRef(null);
  const [frozen, setFrozen] = import_react7.default.useState(null);
  const point = (e) => {
    const el = svg.current;
    const pt = el.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    return pt.matrixTransform(el.getScreenCTM().inverse());
  };
  const snap = (v) => Math.round(v / 8) * 8;
  const begin = (e, part, i, mode) => {
    e.preventDefault();
    e.stopPropagation();
    svg.current.setPointerCapture(e.pointerId);
    drag.current = { part, i, mode, from: point(e), rect: rects[part][i] };
    setFrozen(view);
  };
  const move = (e) => {
    const d = drag.current;
    if (!d) return;
    const p4 = point(e);
    const dx = snap(p4.x - d.from.x), dy = snap(p4.y - d.from.y);
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
  return /* @__PURE__ */ import_react7.default.createElement("svg", { ref: svg, className: "fg-aa-frame", viewBox: view.join(" "), preserveAspectRatio: "xMidYMid meet", onPointerMove: move, onPointerUp: end, onPointerCancel: end }, /* @__PURE__ */ import_react7.default.createElement("image", { href: src, x: "0", y: "0", width, height }), parts.flatMap((part) => rects[part].map((r, i) => {
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
function StateThumb({ still: still2, patch, box }) {
  const ref = import_react7.default.useRef(null);
  import_react7.default.useEffect(() => {
    let live = true;
    Promise.all([loadImage3(still2), loadImage3(patch.src)]).then(([a, b]) => {
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
  }, [still2, patch.src, patch.x, patch.y, box.join(",")]);
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
  const toggle = (key) => setPicked((p4) => {
    const n = new Set(p4);
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
    job(v.key, { status: "running", step: 0, error: "" });
    const prep = await prepare(v.record);
    const rects = cleanRects(given || rectsOf(v.key), prep.padW, prep.padH);
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
    const level2 = packLevel(v.record.aa && v.record.aa.pack);
    return !v.record.aa ? "静态" : level2 === "lite" ? "已动（精简版）" : level2 === "v1" ? "已动（旧版，重做升级）" : "已动";
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
    const p4 = pack.poses[pack.default_pose].parts[part][state2];
    return /* @__PURE__ */ import_react7.default.createElement("div", { key: part + state2, className: "fg-aa-state" }, p4 && box ? /* @__PURE__ */ import_react7.default.createElement(StateThumb, { still: assetUrl(current.record.assetId), patch: { src: assetUrl(p4.file), x: p4.x, y: p4.y }, box }) : /* @__PURE__ */ import_react7.default.createElement("span", { className: "fg-note" }, "没有"), /* @__PURE__ */ import_react7.default.createElement("span", null, AA_PARTS[part].states[state2].label), /* @__PURE__ */ import_react7.default.createElement("button", { type: "button", className: "fg-btn is-mini", disabled: running, onClick: () => run([current], [part, state2]) }, "重画这个"));
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
  for (const p4 of view && view.cast || []) {
    for (const [key, st] of Object.entries(p4.spriteStatus || {})) {
      if (!st || st.status !== "face") continue;
      const record = (p4.sprites || {})[key];
      const from = record && record.face && record.face.from;
      const body = from && p4.sprites[from];
      if (body && body.assetId && !body.faceBox && !out.some((w) => w.assetId === body.assetId)) out.push({ name: p4.name, key: from, assetId: body.assetId });
    }
  }
  return out;
}
function facesToMeasure(view) {
  const out = [];
  for (const p4 of view && view.cast || []) {
    for (const [key, r] of Object.entries(p4.sprites || {})) {
      if (!r || !r.assetId || r.faceBox || r.face || r.aa && r.aa.rects || out.some((w) => w.assetId === r.assetId)) continue;
      out.push({ name: p4.name, key, assetId: r.assetId, measure: true });
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
    const waiting = facesToFrame(view);
    const work = [...waiting, ...facesToMeasure(view).filter((m) => !waiting.some((w) => w.assetId === m.assetId))].filter((w) => !tried.has(w.assetId));
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
            r = await frameSprite(status, assetUrl(w.assetId), { big: !w.measure });
          } catch {
          }
          if (r && r.confidence !== "low") {
            try {
              await api.cast(gameId, "face-box", { name: w.name, key: w.key, rects: r.rects, measure: Boolean(w.measure) });
              tried.set(w.assetId, "ok");
            } catch (e) {
              tried.set(w.assetId, "miss");
              if (!w.measure) toast(`${w.name} 的脸框没存上：${e.message}`, "error");
            }
          } else if (w.measure) {
            tried.set(w.assetId, "miss");
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

// lib/soundlib-sidecar.js
var SOUND_SIDECAR = "flowgal-sounds.json";
var FORMAT2 = "flowgal-sounds";
var FIELDS = ["name", "kind", "category", "description", "tags", "volume"];
var slash = (path) => String(path || "").replace(/\\/g, "/").replace(/^\/+/, "");
var dirOf = (path) => {
  const p4 = slash(path);
  const i = p4.lastIndexOf("/");
  return i < 0 ? "" : p4.slice(0, i + 1);
};
function readSoundSidecar(text) {
  const data = JSON.parse(text);
  if (!data || data.format !== FORMAT2 || !Array.isArray(data.sounds)) throw new Error(`${SOUND_SIDECAR} 不是 FlowGal 的音效描述文件`);
  const out = /* @__PURE__ */ new Map();
  for (const s of data.sounds) {
    if (!s || typeof s.file !== "string" || !s.file) continue;
    const meta = {};
    for (const key of FIELDS) if (s[key] !== void 0) meta[key] = s[key];
    out.set(slash(s.file), meta);
  }
  return out;
}
function soundMatcher(sidecars) {
  const list2 = (sidecars || []).map((s) => ({ dir: dirOf(s.path), map: s.map })).sort((a, b) => b.dir.length - a.dir.length);
  return (path) => {
    const p4 = slash(path);
    for (const { dir, map } of list2) {
      if (!p4.startsWith(dir)) continue;
      const rel = p4.slice(dir.length);
      if (map.has(rel)) return { file: rel, meta: map.get(rel) };
    }
    return { file: p4.includes("/") ? p4.slice(p4.indexOf("/") + 1) : p4, meta: null };
  };
}
function writeSoundSidecar(sounds2, note = "") {
  return JSON.stringify({
    format: FORMAT2,
    version: 1,
    ...note ? { note } : {},
    sounds: (sounds2 || []).filter((s) => s.file).map((s) => ({
      file: s.file,
      name: s.name,
      kind: s.kind || "sfx",
      category: s.category || "",
      description: s.description || "",
      tags: s.tags || [],
      ...s.volume !== void 0 && s.volume !== 1 ? { volume: s.volume } : {}
    }))
  }, null, 2) + "\n";
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
    } }, "重新整理")), !head && (b.sceneEnter || b.cut) && /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-log-scene" }, [b.cut && b.cut.text, MODE_LABEL[b.mode], b.sceneEnter && b.scene.location].filter(Boolean).join(" · ") || MODE_LABEL.real), /* @__PURE__ */ import_react9.default.createElement("div", { className: `fg-log-item${i === index ? " is-current" : ""}`, onClick: () => onJump(i), style: i === index ? { background: "rgba(255,255,255,.06)" } : null }, /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-log-name" }, b.type === "narration" ? "" : b.alias || b.speaker), /* @__PURE__ */ import_react9.default.createElement("div", { style: b.type === "thought" ? { fontStyle: "italic", opacity: 0.8 } : null }, b.orig && /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-orig" }, b.orig), b.type === "dialogue" ? `「${b.text}」` : b.type === "thought" ? `（${b.text}）` : b.text)));
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
    tab === "bg" && /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-grid" }, places.map((p4) => /* @__PURE__ */ import_react9.default.createElement("div", { key: p4.key }, /* @__PURE__ */ import_react9.default.createElement("div", { className: `fg-thumb${p4.assetId ? "" : " is-locked"}`, onClick: () => p4.assetId && setOpen({ place: p4 }) }, p4.assetId ? /* @__PURE__ */ import_react9.default.createElement("img", { src: assetUrl(p4.assetId), alt: p4.location, loading: "lazy" }) : /* @__PURE__ */ import_react9.default.createElement("span", null, STATUS_LABEL[p4.status] || p4.error || "未生成"), /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-thumb-cap" }, p4.location, " · ", TIME_LABEL[p4.time] || p4.time)), /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-row", style: { marginTop: ".6cqw" } }, /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", className: "fg-btn", disabled: busy === p4.key, onClick: () => run(p4.key, () => api.place(gameId, p4.key), "已加入出图队列") }, "重画背景")), p4.status === "failed" && /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-note fg-err" }, p4.error))), !places.length && /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-note" }, "新地点出现时会自动生成背景（设置里可关）；没有生成时用程序化天空（按时段、天气变化）。")),
    live && cgSrc(live, assetUrl) && /* @__PURE__ */ import_react9.default.createElement(Lightbox, { src: cgSrc(live, assetUrl), onClose: () => setOpen(null) }, /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", className: "fg-btn", disabled: live.current <= 0, onClick: () => run("v", () => api.version(gameId, live.id, live.current - 1)) }, "‹ 上一版"), /* @__PURE__ */ import_react9.default.createElement("span", { className: "fg-pill" }, live.current + 1, " / ", live.versions.length), /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", className: "fg-btn", disabled: live.current >= live.versions.length - 1, onClick: () => run("v", () => api.version(gameId, live.id, live.current + 1)) }, "下一版 ›"), /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", className: "fg-btn", onClick: () => {
      setOpen(null);
      setEdit(live);
    } }, "改词重画"), /* @__PURE__ */ import_react9.default.createElement("a", { className: "fg-btn", href: cgSrc(live, assetUrl), download: `${live.title || live.id}.png` }, "下载")),
    open && open.place && /* @__PURE__ */ import_react9.default.createElement(Lightbox, { src: assetUrl(open.place.assetId), onClose: () => setOpen(null) }, /* @__PURE__ */ import_react9.default.createElement("span", { className: "fg-pill" }, open.place.location))
  );
}
var SPRITE_STATUS = { writing: "写词中", queued: "排队中", running: "绘制中", failed: "失败", cancelled: "已取消", face: "等认脸" };
var WRITER_LABEL = { ai: "立绘设计师写的", fallback: "按档案拼的（模型没写出来）", user: "你改的", upload: "你上传的", acting: "照这个人的动作与表情设计" };
var LOG_ACTION = { create: "AI 建档", change: "外貌变化", temp: "临时状态", edit: "手动修改", wear: "换装", states: "长期状态", outfit: "新衣服", span: "状态改轮次", "wear-edit": "换装改轮次" };
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
    const era = r && r.then ? r.era || "memory" : "";
    const group = groups.get(prefix);
    if (!group) groups.set(prefix, { key: prefix, look: { outfit: r.outfit || "", states: (r.states || []).map((name2) => ({ name: name2 })) }, current: false, era });
    else if (!era) group.era = "";
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
  const pick = (p4) => ({
    look: Object.fromEntries(LOOK_FIELDS.map((f) => [f, (p4.appearanceFields || {})[f] || ""])),
    gender: p4.gender || "",
    note: p4.note || "",
    negative: p4.negative || "",
    seed: p4.seedCustom ? String(p4.seed) : "",
    height: p4.height ? String(p4.height) : "",
    voice: p4.voice || "",
    voicePitch: String(p4.voicePitch || 0)
  });
  const [form, setForm] = import_react9.default.useState(() => pick(person));
  const [busy, run] = useBusy();
  const cfg = useConfig();
  const ui2 = cfg ? cfg.config.ui : null;
  import_react9.default.useEffect(() => {
    setForm(pick(person));
  }, [person.appearance, JSON.stringify(person.appearanceFields || {}), person.gender, person.note, person.negative, person.seed, person.seedCustom, person.height, person.voice, person.voicePitch]);
  const dirty = JSON.stringify(form) !== JSON.stringify(pick(person));
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const setLook = (f) => (e) => setForm({ ...form, look: { ...form.look, [f]: e.target.value } });
  const save = () => {
    const { look, ...rest } = form;
    return run("save", () => api.cast(gameId, person.global ? "global-save" : "save", { name: person.name, patch: { ...rest, appearanceFields: look, appearance: lookTags(look, person.appearance), seed: form.seed === "" ? null : Number(form.seed), height: form.height === "" ? null : Number(form.height), voicePitch: Number(form.voicePitch) } }), "档案已保存");
  };
  const others = (cast || []).filter((p4) => p4.name !== person.name);
  const draft = { ...person, gender: form.gender, voice: form.voice, voicePitch: Number(form.voicePitch) };
  const voiceNow = castVoices([...others, draft], ui2).get(person.name);
  const guess = heightOf({ ...person, gender: form.gender, height: null });
  const autoVoice2 = castVoices([...others, { ...draft, voice: "" }], ui2).get(person.name);
  return /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-person-form" }, /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-field" }, /* @__PURE__ */ import_react9.default.createElement("label", null, "固定外貌"), /* @__PURE__ */ import_react9.default.createElement("div", null, /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-look-grid" }, LOOK_FIELDS.map((f) => /* @__PURE__ */ import_react9.default.createElement("label", { key: f, className: `fg-look-field${f === "other" ? " is-wide" : ""}` }, /* @__PURE__ */ import_react9.default.createElement("span", null, LOOK_FIELD_LABELS[f]), f === "other" ? /* @__PURE__ */ import_react9.default.createElement("textarea", { className: "fg-textarea is-short", value: form.look[f], onChange: setLook(f), onKeyDown: (e) => e.stopPropagation(), placeholder: LOOK_HINTS[f] }) : /* @__PURE__ */ import_react9.default.createElement("input", { className: "fg-input", value: form.look[f], onChange: setLook(f), onKeyDown: (e) => e.stopPropagation(), placeholder: LOOK_HINTS[f] })))), /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-note", style: { marginTop: ".5cqw" } }, "出图时用：", lookTags(form.look, person.appearance) || "（空）", person.appearance && lookTags(form.look, person.appearance) === person.appearance ? "（tag 没变，已画好的立绘照用）" : "", "　衣服不写在这里，走「衣橱与状态」。"))), /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-field" }, /* @__PURE__ */ import_react9.default.createElement("label", null, "性别 / 种子"), /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-row" }, /* @__PURE__ */ import_react9.default.createElement("select", { className: "fg-select", style: { width: "auto" }, value: form.gender, onChange: set("gender") }, GENDERS.map(([v, l]) => /* @__PURE__ */ import_react9.default.createElement("option", { key: v, value: v }, l))), /* @__PURE__ */ import_react9.default.createElement("input", { className: "fg-input", style: { width: "12cqw" }, inputMode: "numeric", value: form.seed, placeholder: `默认 ${person.seed}`, onChange: (e) => setForm({ ...form, seed: e.target.value.replace(/\D/g, "") }), onKeyDown: (e) => e.stopPropagation() }), /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", className: "fg-btn", title: "换一个随机种子", onClick: () => setForm({ ...form, seed: String(Math.floor(Math.random() * 2 ** 31)) }) }, "🎲"), /* @__PURE__ */ import_react9.default.createElement("span", { className: "fg-note" }, "所有立绘差分共用这个种子"))), /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-field" }, /* @__PURE__ */ import_react9.default.createElement("label", null, "身高"), /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-row" }, /* @__PURE__ */ import_react9.default.createElement("input", { className: "fg-input", style: { width: "12cqw" }, inputMode: "numeric", value: form.height, placeholder: `约 ${guess.cm}`, onChange: (e) => setForm({ ...form, height: e.target.value.replace(/\D/g, "").slice(0, 3) }), onKeyDown: (e) => e.stopPropagation() }), /* @__PURE__ */ import_react9.default.createElement("span", { className: "fg-note" }, "厘米。剧场里大家的头缩放到一样大，高的人站得高、矮的站得低。留空用", guess.from === "acting" ? "设计师读资料估的" : "按性别和外貌估的", "（", guess.cm, "）。"))), /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-field" }, /* @__PURE__ */ import_react9.default.createElement("label", null, "声音"), /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-row" }, /* @__PURE__ */ import_react9.default.createElement("select", { className: "fg-select", style: { width: "auto" }, value: form.voice, onChange: set("voice"), "aria-label": "打字音音色" }, /* @__PURE__ */ import_react9.default.createElement("option", { value: "" }, "自动（", voiceText(autoVoice2), "）"), /* @__PURE__ */ import_react9.default.createElement("option", { value: "off" }, "不出声"), VOICE_GROUPS.map(([g, label]) => /* @__PURE__ */ import_react9.default.createElement("optgroup", { key: g, label }, VOICES.filter((v) => v.gender === g).map((v) => /* @__PURE__ */ import_react9.default.createElement("option", { key: v.id, value: v.id }, v.label))))), /* @__PURE__ */ import_react9.default.createElement("select", { className: "fg-select", style: { width: "auto" }, value: form.voicePitch, onChange: set("voicePitch"), "aria-label": "音高", title: "升降几个半音" }, PITCHES.map(([v, l]) => /* @__PURE__ */ import_react9.default.createElement("option", { key: v, value: v }, l))), /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", className: "fg-btn", disabled: !voiceNow, onClick: () => previewVoice(voiceNow, ui2 || void 0) }, "▶ 试听"), /* @__PURE__ */ import_react9.default.createElement("span", { className: "fg-note" }, "这个角色说话时的打字音"))), /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-field" }, /* @__PURE__ */ import_react9.default.createElement("label", null, "立绘备注"), /* @__PURE__ */ import_react9.default.createElement("textarea", { className: "fg-textarea is-short", value: form.note, onChange: set("note"), onKeyDown: (e) => e.stopPropagation(), placeholder: "写给立绘设计师，比如「右眼下有泪痣」「笑起来露虎牙」「总是抱着一本书」" })), /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-field" }, /* @__PURE__ */ import_react9.default.createElement("label", null, "不要出现"), /* @__PURE__ */ import_react9.default.createElement("input", { className: "fg-input", value: form.negative, onChange: set("negative"), onKeyDown: (e) => e.stopPropagation(), placeholder: "glasses, ponytail（每张立绘都加进负面词）" })), /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-row", style: { justifyContent: "flex-end" } }, /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", className: "fg-btn is-primary", disabled: !dirty || busy === "save", onClick: save }, "保存档案")));
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
  } }, /* @__PURE__ */ import_react9.default.createElement("input", { className: "fg-input", style: { width: "10cqw" }, placeholder: "怀孕", value: stateDraft.name, onChange: (e) => setStateDraft({ ...stateDraft, name: e.target.value }), onKeyDown: (e) => e.stopPropagation() }), /* @__PURE__ */ import_react9.default.createElement("input", { className: "fg-input", style: { width: "16cqw" }, placeholder: "pregnant, round belly", value: stateDraft.tags, onChange: (e) => setStateDraft({ ...stateDraft, tags: e.target.value }), onKeyDown: (e) => e.stopPropagation() }), /* @__PURE__ */ import_react9.default.createElement("button", { type: "submit", className: "fg-btn" }, "加上")))), /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-field" }, /* @__PURE__ */ import_react9.default.createElement("label", null, "临时状态"), /* @__PURE__ */ import_react9.default.createElement(Text, { value: person.temp || "", placeholder: "wet hair, bandaged arm（只影响插画）", onCommit: (v) => run("t", () => look({ temp: v }), "已保存") })), /* @__PURE__ */ import_react9.default.createElement(LookTimeline, { gameId, person }), /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-note" }, "上面加减的长期状态和换装从最新一轮起生效；以前的轮次在「哪几轮有」「哪一轮起穿」里改。立绘按「服装 × 长期状态 × 情绪」各画一套，改了以前的轮次，用到的那几套会按新样子补画；临时状态只进插画。"));
}
function LookTimeline({ gameId, person }) {
  const [, run] = useBusy();
  const look = (patch) => api.cast(gameId, "look", { name: person.name, patch });
  const timeline = person.timeline || {};
  const spans = stateSpans(timeline.states);
  const names = Object.keys(spans);
  const turnOf = (v) => {
    const t = String(v).trim();
    return t === "" || !Number.isFinite(Number(t)) ? null : Math.max(0, Math.round(Number(t)));
  };
  const setSpans = (name2, list2) => run("sp" + name2, () => look({ stateSpans: { name: name2, spans: list2.map((sp) => [sp.from, sp.to]) } }), "已改，用到的立绘会按新样子补画");
  const edit = (name2, i, change) => setSpans(name2, spans[name2].map((sp, j) => j === i ? { ...sp, ...change } : sp));
  const wear = timeline.wear || [];
  return /* @__PURE__ */ import_react9.default.createElement(import_react9.default.Fragment, null, /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-field" }, /* @__PURE__ */ import_react9.default.createElement("label", null, "状态哪几轮有"), /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-spans" }, names.map((name2) => spans[name2].map((sp, i) => /* @__PURE__ */ import_react9.default.createElement("div", { key: name2 + i, className: "fg-span" }, /* @__PURE__ */ import_react9.default.createElement("b", { title: sp.tags }, name2), /* @__PURE__ */ import_react9.default.createElement("span", null, "第"), /* @__PURE__ */ import_react9.default.createElement(Text, { value: sp.from, style: { width: "5cqw" }, onCommit: (v) => {
    const t = turnOf(v);
    if (t != null) edit(name2, i, { from: t });
  } }), /* @__PURE__ */ import_react9.default.createElement("span", null, "轮到第"), /* @__PURE__ */ import_react9.default.createElement(Text, { value: sp.to == null ? "" : sp.to - 1, placeholder: "现在", style: { width: "5cqw" }, onCommit: (v) => {
    const t = turnOf(v);
    edit(name2, i, { to: t == null ? null : t + 1 });
  } }), /* @__PURE__ */ import_react9.default.createElement("span", null, "轮"), /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", className: "fg-btn is-mini", title: "这一段没有", onClick: () => setSpans(name2, spans[name2].filter((_, j) => j !== i)) }, "✕")))), !names.length && /* @__PURE__ */ import_react9.default.createElement("span", { className: "fg-note" }, "还没有长期状态"))), /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-field" }, /* @__PURE__ */ import_react9.default.createElement("label", null, "哪一轮起穿"), /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-spans" }, wear.map((w, i) => /* @__PURE__ */ import_react9.default.createElement("div", { key: w.fromTurn + "|" + w.outfit, className: "fg-span" }, /* @__PURE__ */ import_react9.default.createElement("b", null, w.outfit), person.global && i === 0 && !w.source ? /* @__PURE__ */ import_react9.default.createElement("span", { className: "fg-note" }, "全局角色的默认服装") : /* @__PURE__ */ import_react9.default.createElement(import_react9.default.Fragment, null, /* @__PURE__ */ import_react9.default.createElement("span", null, "第"), /* @__PURE__ */ import_react9.default.createElement(Text, { value: w.fromTurn, style: { width: "5cqw" }, onCommit: (v) => {
    const t = turnOf(v);
    if (t != null && t !== w.fromTurn) run("w" + i, () => look({ wearMove: { from: w.fromTurn, to: t } }), "已改");
  } }), /* @__PURE__ */ import_react9.default.createElement("span", null, "轮起"), /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", className: "fg-btn is-mini", title: "删掉这次换装", onClick: () => run("wd" + i, () => look({ wearDrop: w.fromTurn }), "已删掉这次换装") }, "✕")))), !wear.length && /* @__PURE__ */ import_react9.default.createElement("span", { className: "fg-note" }, "还没有换装记录"))));
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
    return /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-row fg-face-info" }, /* @__PURE__ */ import_react9.default.createElement("span", { className: "fg-note" }, "只换脸：在「", bodyLabel, "」这张「", record.poseLabel || (POSES[record.face.pose] || {}).label || "动作", "」底图上重画脸，身体衣服跟底图一样", Number.isInteger(record.face.seed) ? ` · 脸的种子 ${record.face.seed}` : ""), record.assetId && /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", className: "fg-btn is-mini", disabled: busy === "redo", onClick: () => run("redo", () => api.cast(gameId, "face-redo", { name: person.name, key: emotionKey }), "换个种子重画脸") }, "换个种子重画脸"));
  }
  const deps = Object.values(sprites).filter((r) => r && r.face && r.face.from === emotionKey);
  if (!record || !record.assetId || !deps.length && !record.pose) return null;
  const auto = framedResult(record.assetId);
  const boxText = record.faceBox ? record.faceBy === "hand" ? "脸框：你框的" : "脸框：自动认出" : auto === "miss" ? "脸框：自动没认准，框一下" : "脸框：还没认（剧场开着、认脸小模型下好时自动认）";
  return /* @__PURE__ */ import_react9.default.createElement(import_react9.default.Fragment, null, /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-row fg-face-info" }, /* @__PURE__ */ import_react9.default.createElement("span", { className: "fg-note" }, "「", record.poseLabel || (POSES[record.pose] || {}).label || "动作", "」动作底图：同一个动作的 ", deps.length, " 张表情在它上面只换脸，重画或上传这张，它们会跟着重换。", boxText), /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", className: "fg-btn is-mini", onClick: () => setFraming(!framing) }, framing ? "收起" : record.faceBox ? "调整脸框" : "框脸")), framing && /* @__PURE__ */ import_react9.default.createElement(FaceBoxEditor, { gameId, person, bodyKey: emotionKey, record, onDone: () => setFraming(false) }));
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
  const reachable = group.current || turn != null || Boolean(group.era);
  const at2 = group.current ? {} : group.era ? { look: group.key } : { turn };
  const label = `${person.name} · ${lookLabel(group.look)} · ${entry.label}`;
  const [viewing, setViewing] = import_react9.default.useState(false);
  return /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-variant" }, /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-variant-art" }, record && record.assetId ? /* @__PURE__ */ import_react9.default.createElement(SpriteArt, { record, label, onOpen: () => setViewing(true) }) : /* @__PURE__ */ import_react9.default.createElement("span", null, st ? SPRITE_STATUS[st.status] : "还没画")), viewing && /* @__PURE__ */ import_react9.default.createElement(SpriteViewer, { record, label, onClose: () => setViewing(false) }), /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-variant-body" }, /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-row" }, /* @__PURE__ */ import_react9.default.createElement("b", null, label), /* @__PURE__ */ import_react9.default.createElement("span", { className: "fg-spacer" }), /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", className: "fg-btn is-mini", onClick: onClose }, "收起")), entry.desc && /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-note" }, "情绪：", entry.desc, entry.base ? `（接近${emotionLabel(entry.base)}）` : ""), st && st.error && /* @__PURE__ */ import_react9.default.createElement("div", { className: `fg-note${st.status === "face" || st.status === "writing" ? "" : " fg-err"}` }, st.error), /* @__PURE__ */ import_react9.default.createElement(FaceInfo, { gameId, person, group, emotionKey: key, record, emotions }), /* @__PURE__ */ import_react9.default.createElement("textarea", { className: "fg-textarea", value: tags, onChange: (e) => setTags(e.target.value), onKeyDown: (e) => e.stopPropagation(), placeholder: record && record.face ? "只换脸：这里只写表情（眉、眼、嘴、脸红、泪、视线）" : "还没有提示词：点「让设计师写」，它会读完资料和剧情来写" }), /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-note" }, record && record.writer ? WRITER_LABEL[record.writer] || record.writer : "", record && record.seed != null ? ` · 种子 ${record.seed}` : "", !reachable ? " · 这套样子在剧情里已经不会再出现（外貌改过），只能删除或上传" : ""), /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-row" }, /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", className: "fg-btn is-primary", disabled: !reachable || busy === "w", onClick: () => run("w", () => api.cast(gameId, "sprite", { name: person.name, emotion, rewrite: true, ...at2 }), "已交给立绘设计师：写好词就画") }, record && record.assetId ? "让设计师重写并重画" : "让设计师写并画"), /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", className: "fg-btn", disabled: !reachable || !tags.trim() || busy === "u", onClick: () => run("u", () => api.cast(gameId, "sprite", { name: person.name, emotion, tags, ...at2 }), "已排队：按这些词画") }, "按这些词画"), /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", className: "fg-btn", disabled: !reachable, onClick: () => fileRef.current && fileRef.current.click() }, "上传到这张"), record && /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", className: "fg-btn", onClick: () => run("d", () => api.cast(gameId, "sprite-delete", { name: person.name, key }), "已删除").then(onClose) }, "删除"), /* @__PURE__ */ import_react9.default.createElement("input", { ref: fileRef, type: "file", accept: "image/png,image/jpeg,image/webp", hidden: true, onChange: async (e) => {
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
function ActingEditor({ gameId, person, emotions, group, turn }) {
  const [busy, run] = useBusy();
  const acting = person.acting;
  const copy2 = (a) => a ? JSON.parse(JSON.stringify({ read: a.read || "", ...a.height ? { height: a.height } : {}, poses: a.poses || [], faces: a.faces || {} })) : null;
  const [draft, setDraft] = import_react9.default.useState(() => copy2(acting));
  import_react9.default.useEffect(() => {
    setDraft(copy2(acting));
  }, [acting && acting.at]);
  const dirty = Boolean(draft) && JSON.stringify(draft) !== JSON.stringify(copy2(acting));
  const label = (e) => emotionEntry(e, emotions).label;
  const design = () => {
    if (acting && !window.confirm(`让立绘设计师重新读一遍资料和剧情，给${person.name}重新设计整套动作和表情？你改过的会被换掉；已经画好的立绘不动，要换成新设计就点「按这套设计重画」。`)) return;
    run("design", () => api.cast(gameId, "acting-design", { name: person.name }), "已交给立绘设计师：读完资料和剧情就设计好（导演日志里能看进度）");
  };
  const designing = person.actingBusy || busy === "design";
  if (!draft) {
    return /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-person-form fg-acting" }, /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-note" }, "还没设计。第一次给", person.name, "画立绘之前，立绘设计师会先读完人物卡、世界书、到这一轮为止的全部剧情和档案，按人设、经历和在故事里的处境设计几个专属的动作，以及每种情绪在脸上的样子；之后的底图和表情差分都照着画。没开立绘设计师、或者设计不出来时，用设置里的通用动作组。"), /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-row", style: { justifyContent: "flex-end" } }, /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", className: "fg-btn is-primary", disabled: designing, onClick: design }, designing ? "设计中…" : "现在设计")));
  }
  const setPose = (id, patch) => setDraft((d) => ({ ...d, poses: d.poses.map((p4) => p4.id === id ? { ...p4, ...patch } : p4) }));
  const move = (e, id) => setDraft((d) => ({ ...d, poses: d.poses.map((p4) => p4.id === id ? { ...p4, emotions: [...p4.emotions.filter((x) => x !== e), e] } : { ...p4, emotions: p4.emotions.filter((x) => x !== e) }) }));
  const toFront = (e) => setDraft((d) => ({ ...d, poses: d.poses.map((p4) => p4.emotions.includes(e) ? { ...p4, emotions: [e, ...p4.emotions.filter((x) => x !== e)] } : p4) }));
  const setFace = (e, patch) => setDraft((d) => ({ ...d, faces: { ...d.faces, [e]: { desc: "", tags: "", ...d.faces[e] || {}, ...patch } } }));
  const save = () => run("save", () => api.cast(gameId, "acting-save", { name: person.name, acting: draft }), "已保存：之后画的照这份设计；已经画好的点「按这套设计重画」");
  const drawn = Object.entries(person.sprites || {}).filter(([key, r]) => key.startsWith(group.key + "|") && r && (r.assetId || r.tags)).map(([key]) => key.split("|").pop());
  const reachable = group.current || turn != null || Boolean(group.era);
  const at2 = group.current ? {} : group.era ? { look: group.key } : { turn };
  const redraw = () => {
    if (!window.confirm(`按这套设计重画${person.name}「${lookLabel(group.look)}」的 ${drawn.length} 张差分？每个动作的底图整张重画，其余表情在新底图上换脸。`)) return;
    run("redraw", () => api.cast(gameId, "sprite", { name: person.name, emotions: drawn, rewrite: true, keepFaces: true, ...at2 }), "已排队：照这套设计重画");
  };
  const input = (value, onChange, placeholder, style) => /* @__PURE__ */ import_react9.default.createElement("input", { className: "fg-input", style, value: value || "", placeholder, onChange: (e) => onChange(e.target.value), onKeyDown: (e) => e.stopPropagation() });
  return /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-person-form fg-acting" }, /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-row" }, /* @__PURE__ */ import_react9.default.createElement("span", { className: "fg-note" }, acting.by === "user" ? "你改过的设计" : `立绘设计师读到第 ${acting.turn != null ? acting.turn : "?"} 轮设计的`, " · ", draft.poses.length, " 个动作", acting.height ? ` · 估的身高 ${acting.height} 厘米${person.height ? `（档案里写的 ${person.height} 优先）` : "（档案里能改）"}` : ""), /* @__PURE__ */ import_react9.default.createElement("span", { className: "fg-spacer" }), /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", className: "fg-btn is-mini", disabled: designing, onClick: design }, designing ? "设计中…" : "重新设计"), /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", className: "fg-btn is-mini", disabled: !reachable || dirty || !drawn.length || busy === "redraw", title: dirty ? "先保存修改" : "", onClick: redraw }, "按这套设计重画「", lookLabel(group.look), "」", drawn.length ? `（${drawn.length} 张）` : "")), /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-field" }, /* @__PURE__ */ import_react9.default.createElement("label", null, "怎么流露情绪"), /* @__PURE__ */ import_react9.default.createElement("textarea", { className: "fg-textarea is-short", value: draft.read, onChange: (e) => setDraft({ ...draft, read: e.target.value }), onKeyDown: (e) => e.stopPropagation(), placeholder: "这个人的性格、经历让他怎么流露情绪" })), draft.poses.map((p4) => /* @__PURE__ */ import_react9.default.createElement("div", { key: p4.id, className: "fg-acting-pose" }, /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-acting-head" }, input(p4.label, (v) => setPose(p4.id, { label: v }), "动作名", { width: "13cqw", fontWeight: 600 }), input(p4.desc, (v) => setPose(p4.id, { desc: v }), "这个动作什么样、为什么是他", { flex: 1 }), /* @__PURE__ */ import_react9.default.createElement("label", { className: "fg-row fg-note", style: { gap: ".3em" }, title: "整张按侧身画：侧脸、看向一旁" }, /* @__PURE__ */ import_react9.default.createElement("input", { type: "checkbox", checked: Boolean(p4.side), onChange: (e) => setPose(p4.id, { side: e.target.checked }) }), "侧身")), input(p4.tags, (v) => setPose(p4.id, { tags: v }), "身体的英文 tag：hands behind back, weight on one leg", { width: "100%" }), p4.emotions.map((e, i) => {
    const face = draft.faces[e] || {};
    return /* @__PURE__ */ import_react9.default.createElement("div", { key: e, className: "fg-acting-emo" }, /* @__PURE__ */ import_react9.default.createElement("b", null, label(e), i === 0 ? /* @__PURE__ */ import_react9.default.createElement("i", null, "底图") : null), /* @__PURE__ */ import_react9.default.createElement("select", { className: "fg-select", value: p4.id, onChange: (ev) => move(e, ev.target.value), title: "挪到别的动作" }, draft.poses.map((q) => /* @__PURE__ */ import_react9.default.createElement("option", { key: q.id, value: q.id }, q.label || q.id))), input(face.desc, (v) => setFace(e, { desc: v }), "他的这种情绪什么样"), input(face.tags, (v) => setFace(e, { tags: v }), "脸上的英文 tag（没写就用内置的）"), i > 0 && !p4.emotions.includes("neutral") ? /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", className: "fg-btn is-mini", onClick: () => toFront(e), title: "这个动作的底图整张画这个情绪" }, "设为底图") : /* @__PURE__ */ import_react9.default.createElement("span", null));
  }), !p4.emotions.length && /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-note" }, "（空着：保存时去掉这个动作）"))), /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-row", style: { justifyContent: "flex-end" } }, /* @__PURE__ */ import_react9.default.createElement("span", { className: "fg-note" }, "改了只影响之后画的；平静总在第一个动作的底图上（登场立绘就是它）。"), dirty && /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", className: "fg-btn", onClick: () => setDraft(copy2(acting)) }, "撤销修改"), /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", className: "fg-btn is-primary", disabled: !dirty || busy === "save", onClick: save }, "保存设计")));
}
function PersonCard({ gameId, person, emotions, cast, voice, used, onBench }) {
  const [busy, run] = useBusy();
  const groups = import_react9.default.useMemo(() => lookGroups(person), [person]);
  const [groupKey, setGroupKey] = import_react9.default.useState("");
  const [emotion, setEmotion] = import_react9.default.useState("");
  const [fold, setFold] = import_react9.default.useState("");
  const [manage, setManage] = import_react9.default.useState(false);
  const [picked, setPicked] = import_react9.default.useState(() => /* @__PURE__ */ new Set());
  const [clearing, setClearing] = import_react9.default.useState(false);
  const [dropActing, setDropActing] = import_react9.default.useState(true);
  const group = groups.find((g) => g.key === groupKey) || groups[0];
  const turn = group.current ? null : findLookTurn(person.timeline, group.key);
  const now = lookAt(person.timeline, Infinity);
  const main = pickSprite(person.sprites, now, "neutral");
  const drawnEmotions = Object.keys(person.sprites || {}).map((k) => k.split("|").pop());
  const tiles = personEmotions(person.name, emotions, { used, drawn: drawnEmotions }).map((e) => ({ ...e, key: `${group.key}|${e.id}`, record: (person.sprites || {})[`${group.key}|${e.id}`], st: (person.spriteStatus || {})[`${group.key}|${e.id}`] }));
  tiles.sort((a, b) => Number(Boolean(b.record && b.record.assetId)) - Number(Boolean(a.record && a.record.assetId)));
  const drawn = tiles.filter((t) => t.record && t.record.assetId).length;
  const deletable = tiles.filter((t) => t.record);
  const pick = (key) => setPicked((p4) => {
    const n = new Set(p4);
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
  const records = Object.values(person.sprites || {}).filter(Boolean);
  const painted = records.filter((r) => r.assetId).length;
  const openClear = () => {
    endManage();
    setEmotion("");
    setDropActing(!(person.acting && person.acting.by === "user"));
    setClearing(true);
  };
  const clearAll = () => {
    const acting = Boolean(person.acting) && dropActing;
    run("clear", () => api.cast(gameId, "sprite-clear", { name: person.name, acting }).then(() => setClearing(false)), acting ? "已清空立绘和动作与表情设计" : "已清空立绘");
  };
  const mainRecord = main ? Object.values(person.sprites || {}).find((r) => r && r.assetId === main) : null;
  const [viewing, setViewing] = import_react9.default.useState(false);
  return /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-person", style: { "--c": person.color } }, /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-person-art" }, mainRecord ? /* @__PURE__ */ import_react9.default.createElement(SpriteArt, { record: mainRecord, label: person.name, onOpen: () => setViewing(true) }) : /* @__PURE__ */ import_react9.default.createElement(Silhouette, { name: person.name, color: person.color, appearance: person.appearance, gender: person.gender })), viewing && mainRecord && /* @__PURE__ */ import_react9.default.createElement(SpriteViewer, { record: mainRecord, label: `${person.name} · ${lookLabel(now)}`, onClose: () => setViewing(false) }), /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-person-main" }, /* @__PURE__ */ import_react9.default.createElement("h3", null, /* @__PURE__ */ import_react9.default.createElement("span", { style: { color: person.color } }, person.name), person.global ? /* @__PURE__ */ import_react9.default.createElement("small", null, "全局 · 外貌冻结") : /* @__PURE__ */ import_react9.default.createElement("small", null, "本局", person.createdTurn != null ? ` · 第 ${person.createdTurn} 轮登场` : ""), /* @__PURE__ */ import_react9.default.createElement("small", { title: "此刻的样子" }, lookLabel(now)), person.temp && /* @__PURE__ */ import_react9.default.createElement("small", { title: "临时状态，只进插画" }, "临时：", person.temp)), /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-person-tags" }, person.appearance ? LOOK_FIELDS.filter((f) => (person.appearanceFields || {})[f]).map((f) => /* @__PURE__ */ import_react9.default.createElement("span", { key: f, className: "fg-look-chip", title: LOOK_FIELD_LABELS[f] }, f === "other" ? null : /* @__PURE__ */ import_react9.default.createElement("i", null, LOOK_FIELD_LABELS[f]), person.appearanceFields[f])) : "（还没有固定外貌）", person.outfitTags ? /* @__PURE__ */ import_react9.default.createElement("span", { className: "fg-look-chip", title: "这身衣服" }, /* @__PURE__ */ import_react9.default.createElement("i", null, person.outfit || "衣服"), person.outfitTags) : null), /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-row fg-person-folds" }, /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", className: `fg-btn${fold === "profile" ? " is-on" : ""}`, onClick: () => setFold(fold === "profile" ? "" : "profile") }, "档案 · 种子 ", person.seed, " · 声音 ", voiceText(voice), voice && voice.auto ? "（自动）" : ""), /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", className: `fg-btn${fold === "wardrobe" ? " is-on" : ""}`, onClick: () => setFold(fold === "wardrobe" ? "" : "wardrobe") }, "衣橱与状态 · ", Object.keys(person.timeline && person.timeline.outfits || {}).length, " 套"), /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", className: `fg-btn${fold === "acting" ? " is-on" : ""}`, onClick: () => setFold(fold === "acting" ? "" : "acting") }, "动作与表情 · ", person.actingBusy ? "设计中…" : person.acting ? `${person.acting.poses.length} 个动作` : "还没设计")), fold === "profile" && /* @__PURE__ */ import_react9.default.createElement(ProfileEditor, { gameId, person, cast }), fold === "wardrobe" && /* @__PURE__ */ import_react9.default.createElement(WardrobeEditor, { gameId, person }), fold === "acting" && /* @__PURE__ */ import_react9.default.createElement(ActingEditor, { gameId, person, emotions, group, turn }), /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-looks" }, groups.map((g) => /* @__PURE__ */ import_react9.default.createElement("button", { key: g.key, type: "button", className: `fg-look${g.key === group.key ? " is-on" : ""}`, onClick: () => {
    setGroupKey(g.key);
    setEmotion("");
    setPicked(/* @__PURE__ */ new Set());
  } }, g.era === "earlier" ? /* @__PURE__ */ import_react9.default.createElement("i", null, "变化之前") : g.era ? /* @__PURE__ */ import_react9.default.createElement("i", null, MODE_LABEL[g.era] || "回忆", "里") : null, lookLabel(g.look), g.current ? /* @__PURE__ */ import_react9.default.createElement("i", null, "现在") : null)), /* @__PURE__ */ import_react9.default.createElement("span", { className: "fg-note" }, "已画 ", drawn, " 种情绪"), /* @__PURE__ */ import_react9.default.createElement("span", { className: "fg-spacer" }), !manage && !clearing && /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", className: "fg-btn is-mini", disabled: !deletable.length, onClick: () => {
    setManage(true);
    setEmotion("");
  } }, "管理立绘"), !manage && !clearing && /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", className: "fg-btn is-mini fg-danger", disabled: !records.length && !person.acting, title: "删掉这个人每一身、每种情绪的立绘，从头再画", onClick: openClear }, "清空立绘")), clearing && /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-row fg-manage" }, /* @__PURE__ */ import_react9.default.createElement("span", { className: "fg-note" }, "清空 ", person.name, " 每一身、每种情绪的立绘（已画好 ", painted, " 张），连提示词、眨眼口型一起删", person.global ? "；这是全局角色，所有对局里都会清掉" : "", "；正在画的会停下。"), person.acting && /* @__PURE__ */ import_react9.default.createElement("label", { className: "fg-row fg-note", style: { gap: ".3em" } }, /* @__PURE__ */ import_react9.default.createElement("input", { type: "checkbox", checked: dropActing, onChange: (e) => setDropActing(e.target.checked) }), "动作与表情设计也清掉，下次画先重新设计", person.acting.by === "user" ? "（这份你改过）" : ""), /* @__PURE__ */ import_react9.default.createElement("span", { className: "fg-spacer" }), /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", className: "fg-btn is-mini fg-danger", disabled: busy === "clear", onClick: clearAll }, "确认清空"), /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", className: "fg-btn is-mini", onClick: () => setClearing(false) }, "取消")), manage && /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-row fg-manage" }, /* @__PURE__ */ import_react9.default.createElement("span", { className: "fg-note" }, "点格子选中要删的（只能选画过或记过提示词的），已选 ", picked.size), /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", className: "fg-btn is-mini", onClick: () => setPicked(new Set(deletable.map((t) => t.key))) }, "全选"), /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", className: "fg-btn is-mini", onClick: () => setPicked(/* @__PURE__ */ new Set()) }, "全不选"), /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", className: "fg-btn is-mini fg-danger", disabled: !picked.size || busy === "del", onClick: removePicked }, "删除所选（", picked.size, "）"), /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", className: "fg-btn is-mini", onClick: endManage }, "完成")), /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-emos" }, tiles.map((t) => /* @__PURE__ */ import_react9.default.createElement(
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
  const benchPerson = bench && cast.find((p4) => p4.name === bench);
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
    tab === "people" && !benchPerson && cast.map((p4) => /* @__PURE__ */ import_react9.default.createElement(PersonCard, { key: p4.name, gameId, person: p4, emotions, cast, voice: voices.get(p4.name), used: used.get(p4.name) || [], onBench: () => setBench(p4.name) })),
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
  const p4 = (section, patch) => patchConfig({ [section]: patch }).catch((e) => toast(e.message, "error"));
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
  const auth = (section) => /* @__PURE__ */ import_react9.default.createElement(Field, { label: "鉴权" }, /* @__PURE__ */ import_react9.default.createElement(Select, { value: cfg[section].authType, onChange: (v) => p4(section, { authType: v }), options: [["none", "无"], ["bearer", "Bearer Token"], ["basic", "Basic（用户名:密码）"]] }));
  return /* @__PURE__ */ import_react9.default.createElement(import_react9.default.Fragment, null, /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-section" }, "生图渠道"), /* @__PURE__ */ import_react9.default.createElement(Field, { label: "渠道" }, /* @__PURE__ */ import_react9.default.createElement(Select, { value: backend, onChange: (v) => p4("images", { backend: v }), options: [["novelai", "NovelAI"], ["comfyui", "ComfyUI"], ["openai", "OpenAI 兼容（gpt-image / 聊天出图）"], ["webui", "SD WebUI / Forge"]] })), backend === "novelai" && /* @__PURE__ */ import_react9.default.createElement(import_react9.default.Fragment, null, /* @__PURE__ */ import_react9.default.createElement(Field, { label: "接入点", hint: "官方站与第三方中转站各存一条，各记各的 Key；换站不影响模型与画风。" }, /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-row" }, /* @__PURE__ */ import_react9.default.createElement(Select, { value: cfg.novelai.endpoint, onChange: (v) => p4("novelai", { endpoint: v }), options: cfg.novelai.endpoints.map((e) => [e.id, e.name]) }), cfg.novelai.endpoint !== "official" && /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", className: "fg-btn", onClick: () => p4("novelai", { endpoint: "official", endpoints: cfg.novelai.endpoints.filter((e) => e.id !== cfg.novelai.endpoint) }) }, "删除此站"))), /* @__PURE__ */ import_react9.default.createElement(Field, { label: "添加中转站" }, /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-row" }, /* @__PURE__ */ import_react9.default.createElement("input", { className: "fg-input", style: { width: "12cqw" }, placeholder: "名称", value: relay.name, onChange: (e) => setRelay((r) => ({ ...r, name: e.target.value })), onKeyDown: (e) => e.stopPropagation() }), /* @__PURE__ */ import_react9.default.createElement("input", { className: "fg-input", style: { flex: 1, width: "auto" }, placeholder: "https://…", value: relay.baseURL, onChange: (e) => setRelay((r) => ({ ...r, baseURL: e.target.value })), onKeyDown: (e) => e.stopPropagation() }), /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", className: "fg-btn", disabled: !/^https?:\/\//.test(relay.baseURL), onClick: () => {
    const id = "relay" + Date.now().toString(36).slice(-5);
    p4("novelai", { endpoints: [...cfg.novelai.endpoints, { id, name: relay.name || id, baseURL: relay.baseURL }], endpoint: id });
    setRelay({ name: "", baseURL: "" });
  } }, "添加"))), /* @__PURE__ */ import_react9.default.createElement(Field, { label: "Key" }, /* @__PURE__ */ import_react9.default.createElement(KeyInput, { backend: "novelai", endpoint: cfg.novelai.endpoint, has: data.keys["novelai:" + cfg.novelai.endpoint] })), /* @__PURE__ */ import_react9.default.createElement(Field, { label: "模型", hint: modelHint }, /* @__PURE__ */ import_react9.default.createElement(ModelField, { value: cfg.novelai.model, options: models, placeholder: "nai-diffusion-…", onCommit: (v) => p4("novelai", { model: v }) })), /* @__PURE__ */ import_react9.default.createElement(Field, { label: "采样器" }, /* @__PURE__ */ import_react9.default.createElement(Select, { value: cfg.novelai.sampler, onChange: (v) => p4("novelai", { sampler: v }), options: listOptions(samplers, cfg.novelai.sampler) })), /* @__PURE__ */ import_react9.default.createElement(Field, { label: "步数 / 提示词引导", hint: "当前画风里填了 CFG 时，以画风的为准。" }, /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-row" }, /* @__PURE__ */ import_react9.default.createElement(Text, { type: "number", style: { width: "8cqw" }, value: cfg.novelai.steps, onCommit: (v) => p4("novelai", { steps: v }) }), /* @__PURE__ */ import_react9.default.createElement(Text, { type: "number", style: { width: "8cqw" }, value: cfg.novelai.scale, onCommit: (v) => p4("novelai", { scale: v }) }))), /* @__PURE__ */ import_react9.default.createElement(Field, { label: "引导缩放", hint: "Prompt Guidance Rescale，0–1。提示词引导调高后画面发灰、过饱和时往上加一点。当前画风里填了 CFG Rescale 时，以画风的为准。" }, /* @__PURE__ */ import_react9.default.createElement("input", { type: "range", min: "0", max: "1", step: "0.02", value: cfg.novelai.cfgRescale, onChange: (e) => p4("novelai", { cfgRescale: Number(e.target.value) }), style: { width: "24cqw" } }), /* @__PURE__ */ import_react9.default.createElement("span", { className: "fg-note", style: { marginLeft: "1cqw" } }, Number(cfg.novelai.cfgRescale).toFixed(2))), nai.v5 ? /* @__PURE__ */ import_react9.default.createElement(Field, { label: "透明底立绘", hint: "V5 才有：立绘按透明背景生成，站在场景里不会带一块白底。CG 和背景不受影响。" }, /* @__PURE__ */ import_react9.default.createElement(Toggle, { value: cfg.images.transparentSprites, onChange: (v) => p4("images", { transparentSprites: v }) })) : /* @__PURE__ */ import_react9.default.createElement(import_react9.default.Fragment, null, /* @__PURE__ */ import_react9.default.createElement(Field, { label: "噪声调度" }, /* @__PURE__ */ import_react9.default.createElement(Select, { value: cfg.novelai.noiseSchedule, onChange: (v) => p4("novelai", { noiseSchedule: v }), options: listOptions(schedulers, cfg.novelai.noiseSchedule) })), nai.v4 && /* @__PURE__ */ import_react9.default.createElement(Field, { label: "Variety+", hint: "前几步不跟提示词，构图更多样；代价是没那么听话。" }, /* @__PURE__ */ import_react9.default.createElement(Toggle, { value: cfg.novelai.variety, onChange: (v) => p4("novelai", { variety: v }) })))), backend === "comfyui" && /* @__PURE__ */ import_react9.default.createElement(import_react9.default.Fragment, null, /* @__PURE__ */ import_react9.default.createElement(Field, { label: "地址" }, /* @__PURE__ */ import_react9.default.createElement(Text, { value: cfg.comfyui.baseURL, onCommit: (v) => p4("comfyui", { baseURL: v }) })), auth("comfyui"), cfg.comfyui.authType !== "none" && /* @__PURE__ */ import_react9.default.createElement(Field, { label: "Token" }, /* @__PURE__ */ import_react9.default.createElement(KeyInput, { backend: "comfyui", has: data.keys.comfyui })), /* @__PURE__ */ import_react9.default.createElement(Field, { label: "模式" }, /* @__PURE__ */ import_react9.default.createElement(Select, { value: cfg.comfyui.mode, onChange: (v) => p4("comfyui", { mode: v }), options: [["simple", "简单（只选底模）"], ["workflow", "导入工作流（API 格式 JSON）"]] })), cfg.comfyui.mode === "simple" ? /* @__PURE__ */ import_react9.default.createElement(import_react9.default.Fragment, null, /* @__PURE__ */ import_react9.default.createElement(Field, { label: "底模", hint: modelHint }, /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-row" }, /* @__PURE__ */ import_react9.default.createElement("div", { style: { flex: 1 } }, /* @__PURE__ */ import_react9.default.createElement(ModelField, { value: cfg.comfyui.checkpoint, options: models, emptyLabel: "（请选择）", placeholder: "xxx.safetensors", onCommit: (v) => p4("comfyui", { checkpoint: v }) })), refresh)), samplers.length > 0 && /* @__PURE__ */ import_react9.default.createElement(Field, { label: "采样器 / 调度器" }, /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-row" }, /* @__PURE__ */ import_react9.default.createElement(Select, { value: cfg.comfyui.sampler, onChange: (v) => p4("comfyui", { sampler: v }), options: listOptions(samplers, cfg.comfyui.sampler) }), /* @__PURE__ */ import_react9.default.createElement(Select, { value: cfg.comfyui.scheduler, onChange: (v) => p4("comfyui", { scheduler: v }), options: listOptions(schedulers, cfg.comfyui.scheduler) }))), /* @__PURE__ */ import_react9.default.createElement(Field, { label: "步数 / CFG", hint: "当前画风里填了 CFG 时，以画风的为准。" }, /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-row" }, /* @__PURE__ */ import_react9.default.createElement(Text, { type: "number", style: { width: "8cqw" }, value: cfg.comfyui.steps, onCommit: (v) => p4("comfyui", { steps: v }) }), /* @__PURE__ */ import_react9.default.createElement(Text, { type: "number", style: { width: "8cqw" }, value: cfg.comfyui.cfg, onCommit: (v) => p4("comfyui", { cfg: v }) })))) : /* @__PURE__ */ import_react9.default.createElement(Field, { label: "工作流", hint: "支持 %prompt% %negative% %width% %height% %seed% %steps% %cfg% 占位符；没有占位符时自动找正负提示词、尺寸和采样节点。" }, /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-row" }, cfg.comfyui.workflows.length > 0 && /* @__PURE__ */ import_react9.default.createElement(Select, { value: cfg.comfyui.workflow || cfg.comfyui.workflows[0].id, onChange: (v) => p4("comfyui", { workflow: v }), options: cfg.comfyui.workflows.map((w) => [w.id, w.name]) }), /* @__PURE__ */ import_react9.default.createElement("label", { className: "fg-btn" }, "导入 JSON", /* @__PURE__ */ import_react9.default.createElement("input", { type: "file", accept: "application/json,.json", hidden: true, onChange: async (e) => {
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
  } })), cfg.comfyui.workflows.length > 0 && /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", className: "fg-btn", onClick: () => p4("comfyui", { workflows: cfg.comfyui.workflows.filter((w) => w.id !== (cfg.comfyui.workflow || cfg.comfyui.workflows[0].id)), workflow: "" }) }, "删除当前")))), backend === "openai" && /* @__PURE__ */ import_react9.default.createElement(import_react9.default.Fragment, null, /* @__PURE__ */ import_react9.default.createElement(Field, { label: "API 地址" }, /* @__PURE__ */ import_react9.default.createElement(Text, { value: cfg.openai.baseURL, onCommit: (v) => p4("openai", { baseURL: v }) })), /* @__PURE__ */ import_react9.default.createElement(Field, { label: "Key" }, /* @__PURE__ */ import_react9.default.createElement(KeyInput, { backend: "openai", has: data.keys.openai })), /* @__PURE__ */ import_react9.default.createElement(Field, { label: "接口" }, /* @__PURE__ */ import_react9.default.createElement(Select, { value: cfg.openai.mode, onChange: (v) => p4("openai", { mode: v }), options: [["images", "/images/generations"], ["chat", "/chat/completions（回复里带图的模型）"]] })), /* @__PURE__ */ import_react9.default.createElement(Field, { label: "模型", hint: modelHint }, /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-row" }, /* @__PURE__ */ import_react9.default.createElement("div", { style: { flex: 1 } }, /* @__PURE__ */ import_react9.default.createElement(ModelField, { value: cfg.openai.model, options: models, emptyLabel: "（请选择）", placeholder: "gpt-image-1", onCommit: (v) => p4("openai", { model: v }) })), refresh)), /* @__PURE__ */ import_react9.default.createElement(Field, { label: "横 / 竖 / 方尺寸" }, /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-row" }, /* @__PURE__ */ import_react9.default.createElement(Text, { style: { width: "10cqw" }, value: cfg.openai.landscapeSize, onCommit: (v) => p4("openai", { landscapeSize: v }) }), /* @__PURE__ */ import_react9.default.createElement(Text, { style: { width: "10cqw" }, value: cfg.openai.portraitSize, onCommit: (v) => p4("openai", { portraitSize: v }) }), /* @__PURE__ */ import_react9.default.createElement(Text, { style: { width: "10cqw" }, value: cfg.openai.squareSize, onCommit: (v) => p4("openai", { squareSize: v }) })))), backend === "webui" && /* @__PURE__ */ import_react9.default.createElement(import_react9.default.Fragment, null, /* @__PURE__ */ import_react9.default.createElement(Field, { label: "地址" }, /* @__PURE__ */ import_react9.default.createElement(Text, { value: cfg.webui.baseURL, onCommit: (v) => p4("webui", { baseURL: v }) })), auth("webui"), cfg.webui.authType !== "none" && /* @__PURE__ */ import_react9.default.createElement(Field, { label: "凭据" }, /* @__PURE__ */ import_react9.default.createElement(KeyInput, { backend: "webui", has: data.keys.webui })), /* @__PURE__ */ import_react9.default.createElement(Field, { label: "底模", hint: modelHint }, /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-row" }, /* @__PURE__ */ import_react9.default.createElement("div", { style: { flex: 1 } }, /* @__PURE__ */ import_react9.default.createElement(ModelField, { value: cfg.webui.model, options: models, emptyLabel: "跟随服务器当前底模", placeholder: "模型标题", onCommit: (v) => p4("webui", { model: v }) })), refresh)), samplers.length > 0 && /* @__PURE__ */ import_react9.default.createElement(Field, { label: "采样器 / 调度器" }, /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-row" }, /* @__PURE__ */ import_react9.default.createElement(Select, { value: cfg.webui.sampler, onChange: (v) => p4("webui", { sampler: v }), options: listOptions(samplers, cfg.webui.sampler) }), /* @__PURE__ */ import_react9.default.createElement(Select, { value: cfg.webui.scheduler, onChange: (v) => p4("webui", { scheduler: v }), options: listOptions(schedulers, cfg.webui.scheduler, "自动") }))), /* @__PURE__ */ import_react9.default.createElement(Field, { label: "步数 / CFG", hint: "当前画风里填了 CFG 时，以画风的为准。" }, /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-row" }, /* @__PURE__ */ import_react9.default.createElement(Text, { type: "number", style: { width: "8cqw" }, value: cfg.webui.steps, onCommit: (v) => p4("webui", { steps: v }) }), /* @__PURE__ */ import_react9.default.createElement(Text, { type: "number", style: { width: "8cqw" }, value: cfg.webui.cfg, onCommit: (v) => p4("webui", { cfg: v }) })))), /* @__PURE__ */ import_react9.default.createElement(Field, { label: "种子", hint: "-1 表示每张随机；填一个数字后所有图都用它，方便复现同一种构图。单张图可以在鉴赏的「改词」里另外指定。" }, /* @__PURE__ */ import_react9.default.createElement(Text, { type: "number", style: { width: "16cqw" }, value: cfg.images.seed, onCommit: (v) => p4("images", { seed: v === "" ? -1 : v }) })), /* @__PURE__ */ import_react9.default.createElement(Field, { label: "连接" }, /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-row" }, /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", className: "fg-btn", disabled: busy === "t", onClick: doTest }, busy === "t" ? "测试中…" : "测试连接"), test && /* @__PURE__ */ import_react9.default.createElement("span", { className: test.ok ? "fg-ok" : "fg-err" }, test.message), !test && /* @__PURE__ */ import_react9.default.createElement("span", { className: data.ready ? "fg-ok" : "fg-note" }, data.ready ? "✓ 可以出图" : data.readyReason))));
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
  const p4 = (patch) => patchConfig({ director: patch }).catch((e) => toast(e.message, "error"));
  return /* @__PURE__ */ import_react9.default.createElement(import_react9.default.Fragment, null, /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-section" }, "导演（后台整理）", onDirectorLog && /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", className: "fg-btn", onClick: onDirectorLog }, "查看导演日志")), /* @__PURE__ */ import_react9.default.createElement(Field, { label: "自动整理", hint: "每轮正文写完后，后台模型把它整理成场景：说话人、表情、站位、镜头、天气、选项、插画分镜。正文一字不改。" }, /* @__PURE__ */ import_react9.default.createElement(Toggle, { value: cfg.director.auto, onChange: (v) => p4({ auto: v }) })), /* @__PURE__ */ import_react9.default.createElement(Field, { label: "模型", hint: hostName() === "st" ? "默认跟着酒馆当前的连接；也可以选一套连接配置（在酒馆「API 连接」里存的）专门给导演用，整理用便宜的小模型就够。" : "留空跟随 Tavern 的后台模型。整理用的是便宜的小模型就够。" }, /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-row" }, /* @__PURE__ */ import_react9.default.createElement(Select, { value: cfg.director.provider, onChange: (v) => p4({ provider: v, model: "" }), options: [["", hostName() === "st" ? "跟着酒馆当前的连接" : "跟随 Tavern"], ...llm.providers.map((x) => [x.id, x.name])] }), cfg.director.provider && (llm.models.length ? /* @__PURE__ */ import_react9.default.createElement(Select, { value: cfg.director.model, onChange: (v) => p4({ model: v }), options: [["", "（请选择）"], ...llm.models.map((m) => [m.id, m.name])] }) : /* @__PURE__ */ import_react9.default.createElement(Text, { value: cfg.director.model, placeholder: "模型 ID", onCommit: (v) => p4({ model: v }) })))), /* @__PURE__ */ import_react9.default.createElement(Field, { label: "最大输出 / 温度", hint: "默认 128000（当前主流大模型的输出上限）。模型窗口装不下时自动往下收；模型拒绝这个值时按它报的上限重试一次。导演日志里能看到实际用了多少。" }, /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-row" }, /* @__PURE__ */ import_react9.default.createElement(Text, { type: "number", style: { width: "9cqw" }, value: cfg.director.maxTokens, onCommit: (v) => p4({ maxTokens: v }) }), /* @__PURE__ */ import_react9.default.createElement(Text, { type: "number", style: { width: "7cqw" }, value: cfg.director.temperature, onCommit: (v) => p4({ temperature: v }) }))), /* @__PURE__ */ import_react9.default.createElement(Field, { label: "资料长度", hint: "给导演看多少人物卡 / 世界书（字），用来判断人物外貌。默认 1000000，等于不截断；超出模型窗口时自动缩短。" }, /* @__PURE__ */ import_react9.default.createElement(Text, { type: "number", value: cfg.director.contextChars, onCommit: (v) => p4({ contextChars: v }) })), /* @__PURE__ */ import_react9.default.createElement(CgModelFields, { data, providers: llm.providers }), /* @__PURE__ */ import_react9.default.createElement(Field, { label: "自定义提示词", hint: "留空用内置导演提示词。可用 {{maxImages}} {{styleHint}}。情绪库、配乐曲库附在用户消息里，自定义时也生效。" }, /* @__PURE__ */ import_react9.default.createElement("textarea", { className: "fg-textarea", defaultValue: cfg.director.systemPrompt, onKeyDown: (e) => e.stopPropagation(), onBlur: (e) => {
    if (e.target.value !== cfg.director.systemPrompt) p4({ systemPrompt: e.target.value });
  } })), /* @__PURE__ */ import_react9.default.createElement(Field, { label: "立绘设计师提示词", hint: '留空用内置的。可用 {{styleHint}}。输出格式必须是 {"sprites":[{"key","tags"}]}（负面只用画风里带的，写了也不收）。' }, /* @__PURE__ */ import_react9.default.createElement("textarea", { className: "fg-textarea", defaultValue: cfg.director.spritePrompt, onKeyDown: (e) => e.stopPropagation(), onBlur: (e) => {
    if (e.target.value !== cfg.director.spritePrompt) p4({ spritePrompt: e.target.value });
  } })), /* @__PURE__ */ import_react9.default.createElement(Field, { label: "动作与表情设计提示词", hint: '留空用内置的（画立绘前给每个人设计专属动作和表情）。可用 {{styleHint}} {{max}}。输出格式必须是 {"read","poses":[{"id","label","desc","tags","side","emotions"}],"faces":[{"emotion","desc","tags"}]}。' }, /* @__PURE__ */ import_react9.default.createElement("textarea", { className: "fg-textarea", defaultValue: cfg.director.actingPrompt, onKeyDown: (e) => e.stopPropagation(), onBlur: (e) => {
    if (e.target.value !== cfg.director.actingPrompt) p4({ actingPrompt: e.target.value });
  } })), /* @__PURE__ */ import_react9.default.createElement(Field, { label: "插画分镜师提示词", hint: '留空用内置的（Base + 每人一个角色块的写法）。可用 {{styleHint}}。输出格式必须是 {"images":[{"key","tag","nl","characters":[{"name","tag","nl"}],"size"}]}。' }, /* @__PURE__ */ import_react9.default.createElement("textarea", { className: "fg-textarea", defaultValue: cfg.director.cgPrompt, onKeyDown: (e) => e.stopPropagation(), onBlur: (e) => {
    if (e.target.value !== cfg.director.cgPrompt) p4({ cgPrompt: e.target.value });
  } })));
}
function CgModelFields({ data, providers }) {
  const own = data.config.director.cgLlm;
  const [busy, run] = useBusy();
  const [hostModels, setHostModels] = import_react9.default.useState([]);
  const [list2, setList] = import_react9.default.useState(null);
  const p4 = (patch) => patchConfig({ director: { cgLlm: patch } }).catch((e) => toast(e.message, "error"));
  import_react9.default.useEffect(() => {
    if (own.source !== "host" || !own.provider) return setHostModels([]);
    api.llm(own.provider).then((r) => setHostModels(r.models || [])).catch(() => setHostModels([]));
  }, [own.source, own.provider]);
  const loadList = () => run("m", async () => setList(await api.cgModels()));
  import_react9.default.useEffect(() => {
    setList(null);
    if (own.source === "custom" && own.baseURL) loadList();
  }, [own.source, own.baseURL, data.keys.cgllm]);
  const sources = [["", "跟导演一样"], ["host", hostName() === "st" ? "另选一套酒馆连接配置" : "另选一个 Tavern 里的模型"], ["custom", "自定义接口（OpenAI 兼容）"]];
  return /* @__PURE__ */ import_react9.default.createElement(import_react9.default.Fragment, null, /* @__PURE__ */ import_react9.default.createElement(Field, { label: "插画分镜师的模型", hint: "写 CG 提示词的模型可以和导演分开。有的模型不肯把露骨的画面写具体，就给分镜师单独换一个；自定义接口填 /chat/completions 前面那段地址，DeepSeek、OpenRouter、各家中转、本机的 LM Studio / Ollama 都行。" }, /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-row" }, /* @__PURE__ */ import_react9.default.createElement(Select, { value: own.source, style: INLINE, onChange: (v) => p4({ source: v, provider: "", model: "" }), options: sources }), own.source === "host" && /* @__PURE__ */ import_react9.default.createElement(Select, { value: own.provider, style: INLINE, onChange: (v) => p4({ provider: v, model: "" }), options: [["", "（选一个）"], ...providers.map((x) => [x.id, x.name])] }), own.source === "host" && own.provider && (hostModels.length ? /* @__PURE__ */ import_react9.default.createElement(Select, { value: own.model, style: INLINE, onChange: (v) => p4({ model: v }), options: [["", "（请选择）"], ...hostModels.map((m) => [m.id, m.name])] }) : /* @__PURE__ */ import_react9.default.createElement(Text, { value: own.model, placeholder: "模型 ID", onCommit: (v) => p4({ model: v }) })))), own.source === "custom" && /* @__PURE__ */ import_react9.default.createElement(import_react9.default.Fragment, null, /* @__PURE__ */ import_react9.default.createElement(Field, { label: "接口地址" }, /* @__PURE__ */ import_react9.default.createElement(Text, { value: own.baseURL, placeholder: "https://api.deepseek.com/v1", style: { flex: 1, width: "100%" }, onCommit: (v) => p4({ baseURL: String(v).trim() }) })), /* @__PURE__ */ import_react9.default.createElement(Field, { label: "Key", hint: `存在宿主（${data.secretStorage || "插件目录"}），不会发到浏览器。本机的接口不要 Key 就空着。` }, /* @__PURE__ */ import_react9.default.createElement(KeyInput, { backend: "cgllm", has: data.keys.cgllm })), /* @__PURE__ */ import_react9.default.createElement(Field, { label: "模型", hint: list2 ? list2.note : own.baseURL ? "正在读取模型列表…" : "先填接口地址" }, /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-row" }, /* @__PURE__ */ import_react9.default.createElement(ModelField, { value: own.model, options: list2 && list2.models || [], placeholder: "模型 ID", onCommit: (v) => p4({ model: v, ...(list2?.models || []).find((m) => m.id === v)?.window ? { contextWindow: list2.models.find((m) => m.id === v).window } : {} }) }), /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", className: "fg-btn", disabled: busy === "m" || !own.baseURL, onClick: loadList }, busy === "m" ? "读取中…" : "刷新列表"))), /* @__PURE__ */ import_react9.default.createElement(Field, { label: "上下文窗口", hint: "这个模型一次能读多少 token。剧情太长时按它从最早的删起，最大输出也按它往下收；最大输出、温度、资料长度跟导演用同一套设置。接口报出更小的输出上限时自动按它重试。" }, /* @__PURE__ */ import_react9.default.createElement(Text, { type: "number", style: { width: "9cqw" }, value: own.contextWindow, onCommit: (v) => p4({ contextWindow: v }) }))));
}
function PoseGroups({ poses, onChange }) {
  const changed = Object.keys(poses).length > 0;
  return /* @__PURE__ */ import_react9.default.createElement(Field, { label: "通用动作组", hint: "立绘设计师关着、或者还没给某个人设计出专属动作时用这几组：每组整张画一张底图（标「底图」的情绪），同组其余情绪在它上面只换脸。想让某个情绪换个动作，就把它挪到别的组；导演新造的情绪跟着它最接近的内置情绪走。改了只影响之后画的。" }, /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-pose-grid" }, POSE_IDS.map((pose) => /* @__PURE__ */ import_react9.default.createElement("div", { key: pose, className: "fg-pose-col" }, /* @__PURE__ */ import_react9.default.createElement("b", null, POSES[pose].label), poseMembers(pose, [], poses).map((e) => /* @__PURE__ */ import_react9.default.createElement("label", { key: e, className: "fg-pose-item" }, /* @__PURE__ */ import_react9.default.createElement("span", null, EMOTIONS[e], anchorOf(pose, [], poses) === e ? /* @__PURE__ */ import_react9.default.createElement("i", null, " · 底图") : null), /* @__PURE__ */ import_react9.default.createElement("select", { value: pose, onChange: (ev) => onChange({ [e]: ev.target.value === EMOTION_POSE[e] ? null : ev.target.value }) }, POSE_IDS.map((id) => /* @__PURE__ */ import_react9.default.createElement("option", { key: id, value: id }, POSES[id].label))))), !poseMembers(pose, [], poses).length && /* @__PURE__ */ import_react9.default.createElement("span", { className: "fg-note" }, "（空着：这组不画）")))), changed && /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", className: "fg-btn is-mini", onClick: () => onChange(Object.fromEntries(Object.keys(poses).map((k) => [k, null]))) }, "恢复默认分组"));
}
var SIZE_SHAPES = [["landscape", "横版"], ["portrait", "竖版"], ["square", "方形"]];
var parseSize = (text) => {
  const m = /^\s*(\d{3,4})\s*[×xX*，, ]\s*(\d{3,4})\s*$/.exec(String(text));
  return m ? [Number(m[1]), Number(m[2])] : null;
};
function ImagesSection({ data }) {
  const cfg = data.config;
  const p4 = (patch) => patchConfig({ images: patch }).catch((e) => toast(e.message, "error"));
  return /* @__PURE__ */ import_react9.default.createElement(import_react9.default.Fragment, null, /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-section" }, "自动配图"), /* @__PURE__ */ import_react9.default.createElement(Field, { label: "自动插画", hint: "导演判断值得画的地方自动出 CG，挂在正文对应段落后。" }, /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-row" }, /* @__PURE__ */ import_react9.default.createElement(Toggle, { value: cfg.images.auto, onChange: (v) => p4({ auto: v }) }), /* @__PURE__ */ import_react9.default.createElement("span", { className: "fg-note" }, "每轮最多"), /* @__PURE__ */ import_react9.default.createElement(Text, { type: "number", style: { width: "6cqw" }, value: cfg.images.maxPerTurn, onCommit: (v) => p4({ maxPerTurn: v }) }), /* @__PURE__ */ import_react9.default.createElement("span", { className: "fg-note" }, "张"))), /* @__PURE__ */ import_react9.default.createElement(Field, { label: "新地点背景" }, /* @__PURE__ */ import_react9.default.createElement(Toggle, { value: cfg.images.backgrounds, onChange: (v) => p4({ backgrounds: v }) })), /* @__PURE__ */ import_react9.default.createElement(Field, { label: "立绘", hint: "角色登场、换装、长期状态变化时，画这一套的平静立绘。" }, /* @__PURE__ */ import_react9.default.createElement(Toggle, { value: cfg.images.portraits, onChange: (v) => p4({ portraits: v }) })), /* @__PURE__ */ import_react9.default.createElement(Field, { label: "情绪差分", hint: "导演用到这一套还没有的情绪时补画（包括它自创的新情绪）。漏掉的可以在人物志里一键补齐。" }, /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-row" }, /* @__PURE__ */ import_react9.default.createElement(Toggle, { value: cfg.images.expressions, onChange: (v) => p4({ expressions: v }) }), /* @__PURE__ */ import_react9.default.createElement("span", { className: "fg-note" }, "每轮最多"), /* @__PURE__ */ import_react9.default.createElement(Text, { type: "number", style: { width: "6cqw" }, value: cfg.images.expressionsPerTurn, onCommit: (v) => p4({ expressionsPerTurn: v }) }), /* @__PURE__ */ import_react9.default.createElement("span", { className: "fg-note" }, "张"))), /* @__PURE__ */ import_react9.default.createElement(Field, { label: "表情只换脸", hint: "galgame 的「一个动作 + 一套表情」：同一套衣服每个动作整张画一张底图，同一个动作的其余情绪用 NovelAI 局部重绘只重画脸（眉、眼、两颊、嘴），身体和衣服一个像素都不动。每个人有哪些动作、哪种情绪归哪个动作、脸上什么样，是立绘设计师读完资料和剧情给他设计的（人物志 →「动作与表情」）。底图画好后要认一次脸：剧场开着、认脸小模型下好时自动认，认不准的在人物志里点开底图框一下。只对 NovelAI 有效；关掉就像以前一样每个情绪整张画。已经画好的立绘不会自动重画。" }, /* @__PURE__ */ import_react9.default.createElement(Toggle, { value: cfg.images.faceSwap, onChange: (v) => p4({ faceSwap: v }) })), cfg.images.faceSwap && /* @__PURE__ */ import_react9.default.createElement(PoseGroups, { poses: cfg.images.poses || {}, onChange: (poses) => p4({ poses }) }), /* @__PURE__ */ import_react9.default.createElement(Field, { label: "立绘设计师", hint: "给一个人画第一张立绘之前，先读完人物卡、世界书和到这一轮为止的全部剧情，按他的人设和经历设计专属的几个动作和每种情绪的表情（人物志 →「动作与表情」里能看能改）；之后每张差分的提示词也由它读完资料来写，照设计画，只换脸的表情直接用设计好的。一个角色一次写一批差分（用导演的模型和资料长度设置；窗口装不下时从最早的剧情删起）。关掉则按档案机械拼、用通用动作组。" }, /* @__PURE__ */ import_react9.default.createElement(Toggle, { value: cfg.images.spriteWriter, onChange: (v) => p4({ spriteWriter: v }) })), /* @__PURE__ */ import_react9.default.createElement(Field, { label: "并发" }, /* @__PURE__ */ import_react9.default.createElement(Text, { type: "number", style: { width: "6cqw" }, value: cfg.images.concurrency, onCommit: (v) => p4({ concurrency: v }) })), /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-section" }, "尺寸"), /* @__PURE__ */ import_react9.default.createElement(Field, { label: "插画、背景、立绘", hint: "宽×高，按 64 取整。默认是 NovelAI 常用的三种；超过 1024×1024 面积的尺寸在 NovelAI 上要扣点数。剧场画面默认跟横版一样的比例。" }, /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-row" }, SIZE_SHAPES.map(([shape, label]) => /* @__PURE__ */ import_react9.default.createElement("label", { key: shape, className: "fg-row", style: { gap: ".4em" } }, /* @__PURE__ */ import_react9.default.createElement("span", { className: "fg-note" }, label), /* @__PURE__ */ import_react9.default.createElement(Text, { style: { width: "9cqw" }, value: cfg.images.sizes[shape].join("×"), onCommit: (v) => {
    const size = parseSize(v);
    if (size) p4({ sizes: { ...cfg.images.sizes, [shape]: size } });
    else toast("写成「宽×高」，比如 1216×832", "error");
  } }))))), /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-section" }, "图片文件夹"), /* @__PURE__ */ import_react9.default.createElement(Field, { label: "另存一份", hint: "画好的插画、背景、立绘按「卡名 / 插画 / 第 3 轮 标题」这样的名字复制一份，方便在文件夹里找。那里的图改了、删了都不影响剧场；删局、重新整理也不会删它们。" }, /* @__PURE__ */ import_react9.default.createElement(Toggle, { value: cfg.images.library, onChange: (v) => p4({ library: v }) })), hostName() === "st" ? /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-note" }, "酒馆版存在酒馆的 data/<用户>/user/images/FlowGal-<卡名>/ 里（浏览器没法选别的文件夹），酒馆自带的「图库」也能看到。") : /* @__PURE__ */ import_react9.default.createElement(Field, { label: "位置", hint: `现在是 ${data.paths && data.paths.library || "数据目录下的「图片」"}。留空用数据目录下的「图片」；要换地方就填绝对路径，比如 D:\\Pictures\\FlowGal。` }, /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-row" }, /* @__PURE__ */ import_react9.default.createElement(Text, { value: cfg.images.libraryDir, placeholder: "留空用默认位置", style: { flex: 1 }, onCommit: (v) => p4({ libraryDir: v }) }), /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", className: "fg-btn", onClick: () => openLibrary("").catch((e) => toast(e.message, "error")) }, "打开"))));
}
var landscapeSize = (cfg) => {
  const { width, height } = sizeFor(cfg, "landscape");
  return `${width}×${height}`;
};
function LookSection({ data }) {
  const cfg = data.config;
  const p4 = (patch) => patchConfig({ ui: patch }).catch((e) => toast(e.message, "error"));
  return /* @__PURE__ */ import_react9.default.createElement(import_react9.default.Fragment, null, /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-section" }, "界面皮肤"), /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-skins" }, SKINS.map((s) => /* @__PURE__ */ import_react9.default.createElement("button", { key: s.id, type: "button", className: `fg-skin${cfg.ui.skin === s.id ? " is-on" : ""}`, onClick: () => p4({ skin: s.id }) }, /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-skin-swatch", style: { background: s.swatch } }), /* @__PURE__ */ import_react9.default.createElement("b", null, s.name), /* @__PURE__ */ import_react9.default.createElement("span", null, s.desc)))), /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-section" }, "画面"), /* @__PURE__ */ import_react9.default.createElement(Field, { label: "画面比例", hint: "跟横版插画一样时，插画正好铺满舞台（默认就是 NovelAI 常用的 1216×832；横版尺寸在「画风与配图 → 尺寸」里改）。" }, /* @__PURE__ */ import_react9.default.createElement("select", { className: "fg-select", style: { width: "auto" }, value: cfg.ui.ratio, onChange: (e) => p4({ ratio: e.target.value }) }, /* @__PURE__ */ import_react9.default.createElement("option", { value: "cg" }, "跟横版插画一样（", landscapeSize(data.config), "）"), /* @__PURE__ */ import_react9.default.createElement("option", { value: "wide" }, "16:9 宽屏"))), /* @__PURE__ */ import_react9.default.createElement(Field, { label: "同屏最多几人", hint: "台上的人多于这个数时，最久没说话、没登场的先下场，轮到他说话再回来。人越多立绘越小，按站位从左到右排开。" }, /* @__PURE__ */ import_react9.default.createElement("select", { className: "fg-select", style: { width: "auto" }, value: String(cfg.ui.maxOnStage ?? 5), onChange: (e) => p4({ maxOnStage: Number(e.target.value) }) }, [2, 3, 4, 5, 6, 7, 8].map((n) => /* @__PURE__ */ import_react9.default.createElement("option", { key: n, value: String(n) }, n, " 人")), /* @__PURE__ */ import_react9.default.createElement("option", { value: "0" }, "不限"))), /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-section" }, "演出"), /* @__PURE__ */ import_react9.default.createElement(Field, { label: "短闪回", hint: "正文里一两句的回忆（「她说过：……」）怎么演。要换到当时的地方慢慢演的长回忆，导演会换成整段回忆场景，不受这里影响。" }, /* @__PURE__ */ import_react9.default.createElement("select", { className: "fg-select", style: { width: "auto" }, value: cfg.ui.recall || "text", onChange: (e) => p4({ recall: e.target.value }) }, /* @__PURE__ */ import_react9.default.createElement("option", { value: "text" }, "画面不动，对话框换成回忆的样子"), /* @__PURE__ */ import_react9.default.createElement("option", { value: "ghost" }, "画面压暗，回忆里的人浮到台前"), /* @__PURE__ */ import_react9.default.createElement("option", { value: "portrait" }, "对话框换样子，旁边再出说话人的小头像"))), /* @__PURE__ */ import_react9.default.createElement(Field, { label: "短闪回的名牌", hint: "回忆里说话的人的名字。模糊压暗时认得出是谁，又像隔着一层看不清。" }, /* @__PURE__ */ import_react9.default.createElement("select", { className: "fg-select", style: { width: "auto" }, value: cfg.ui.recallName || "blur", onChange: (e) => p4({ recallName: e.target.value }) }, /* @__PURE__ */ import_react9.default.createElement("option", { value: "blur" }, "模糊、压暗"), /* @__PURE__ */ import_react9.default.createElement("option", { value: "hide" }, "不显示"), /* @__PURE__ */ import_react9.default.createElement("option", { value: "show" }, "照常显示"))), /* @__PURE__ */ import_react9.default.createElement(Field, { label: "短闪回的基调", hint: "切进闪回的方式和色调，对话框和回忆里的声音也跟着变：温暖怀念慢慢泛黄，甜蜜泛起粉光，伤感褪成冷灰，不安画面撕裂泛红、像心跳一样一暗一暗，猛然想起白闪一下，朦胧如梦起雾。自动时导演按剧情选，没选的按闪回里的情绪和当时的氛围挑。" }, /* @__PURE__ */ import_react9.default.createElement("select", { className: "fg-select", style: { width: "auto" }, value: cfg.ui.recallTone || "auto", onChange: (e) => p4({ recallTone: e.target.value }) }, /* @__PURE__ */ import_react9.default.createElement("option", { value: "auto" }, "自动（按剧情和氛围）"), RECALL_TONES.map((t) => /* @__PURE__ */ import_react9.default.createElement("option", { key: t, value: t }, "都用「", RECALL_TONE_NAMES[t], "」")))), /* @__PURE__ */ import_react9.default.createElement(Field, { label: "文字速度", hint: "每字毫秒，0 为瞬间显示。" }, /* @__PURE__ */ import_react9.default.createElement("input", { type: "range", min: "0", max: "80", value: cfg.ui.textSpeed, onChange: (e) => p4({ textSpeed: Number(e.target.value) }), style: { width: "100%" } })), /* @__PURE__ */ import_react9.default.createElement(Field, { label: "自动播放间隔" }, /* @__PURE__ */ import_react9.default.createElement("input", { type: "range", min: "400", max: "4000", step: "100", value: cfg.ui.autoDelay, onChange: (e) => p4({ autoDelay: Number(e.target.value) }), style: { width: "100%" } })), /* @__PURE__ */ import_react9.default.createElement(Field, { label: "天气粒子" }, /* @__PURE__ */ import_react9.default.createElement(Toggle, { value: cfg.ui.particles, onChange: (v) => p4({ particles: v }) })), /* @__PURE__ */ import_react9.default.createElement(Field, { label: "写完自动打开剧场" }, /* @__PURE__ */ import_react9.default.createElement(Toggle, { value: cfg.ui.autoOpen, onChange: (v) => p4({ autoOpen: v }) })), /* @__PURE__ */ import_react9.default.createElement(Field, { label: "字体地址", hint: "皮肤字体从这里按 npm 包名加载（默认 jsDelivr 上的 @fontsource 官方包）；连不上时可以换成 unpkg 或自己的镜像，地址以 / 结尾。立绘工作台的认脸模型也从这里下它的运行库。" }, /* @__PURE__ */ import_react9.default.createElement(Text, { value: cfg.ui.fontBase, onCommit: (v) => p4({ fontBase: v }) })), /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-section" }, "认脸模型（立绘工作台的自动框）"), /* @__PURE__ */ import_react9.default.createElement(Field, { label: "下载来源", hint: "模型在 HuggingFace：自动是先连官网、连不上换镜像；只下一次，存在数据目录的 models 文件夹。" }, /* @__PURE__ */ import_react9.default.createElement("select", { className: "fg-select", style: { width: "auto" }, value: cfg.vision.source, onChange: (e) => patchConfig({ vision: { source: e.target.value } }).catch((err) => toast(err.message, "error")) }, /* @__PURE__ */ import_react9.default.createElement("option", { value: "auto" }, "自动（先官网，连不上换镜像）"), /* @__PURE__ */ import_react9.default.createElement("option", { value: "official" }, "只用官网"), /* @__PURE__ */ import_react9.default.createElement("option", { value: "mirror" }, "先用镜像"))), /* @__PURE__ */ import_react9.default.createElement(Field, { label: "镜像地址", hint: "HuggingFace 的镜像站，默认 hf-mirror.com；路径规则要跟官网一样（…/仓库/resolve/版本/文件）。" }, /* @__PURE__ */ import_react9.default.createElement(Text, { value: cfg.vision.mirror, onCommit: (v) => patchConfig({ vision: { mirror: v } }).catch((err) => toast(err.message, "error")) })));
}
var VOICE_GENDER = { female: "女声", male: "男声", "": "不分男女" };
var SOUND_GROUPS = [["stage", "落字音效", "台词演出里的重音、怒吼、崩溃，打斗的出手"], ["ui", "界面音", "按钮、选项、翻页"]];
function SoundSection({ data }) {
  const ui2 = data.config.ui;
  const p4 = (patch) => patchConfig({ ui: patch }).catch((e) => toast(e.message, "error"));
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
  return /* @__PURE__ */ import_react9.default.createElement(import_react9.default.Fragment, null, /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-section" }, "打字音"), /* @__PURE__ */ import_react9.default.createElement(Field, { label: "打字音" }, /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-row" }, /* @__PURE__ */ import_react9.default.createElement(Toggle, { value: ui2.blip, onChange: (v) => p4({ blip: v }) }), /* @__PURE__ */ import_react9.default.createElement("input", { type: "range", min: "0", max: "2", step: "0.1", value: ui2.blipVolume, "aria-label": "打字音音量", onChange: (e) => p4({ blipVolume: Number(e.target.value) }), style: { flex: 1 } }))), /* @__PURE__ */ import_react9.default.createElement(Field, { label: "没指定的角色", hint: "每个角色的声音可以在「人物志 → 档案」里单独挑、调音高。自动：女性、男性各从一组音色里按名字分一个，同一局里先登场的先挑、后来的避开已经有人用的；一组用完了才重复，靠音高错开。没标性别的用经典哔哔。" }, /* @__PURE__ */ import_react9.default.createElement(Select, { value: ui2.voiceDefault, options: [["auto", "自动（按性别分）"], ...VOICES.map((v) => [v.id, `都用「${v.label}」`])], onChange: (v) => p4({ voiceDefault: v }) })), /* @__PURE__ */ import_react9.default.createElement(Field, { label: "旁白" }, /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-row" }, /* @__PURE__ */ import_react9.default.createElement(Select, { value: ui2.narrationVoice, options: [...VOICES.map((v) => [v.id, v.label]), ["off", "不出声"]], style: INLINE, onChange: (v) => p4({ narrationVoice: v }) }), /* @__PURE__ */ import_react9.default.createElement(Select, { value: String(ui2.narrationPitch), options: PITCHES, style: INLINE, onChange: (v) => p4({ narrationPitch: Number(v) }) }), /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", className: "fg-btn", disabled: !narration, onClick: () => previewVoice(narration, ui2) }, "▶ 试听"))), /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-section" }, "音色一览 · ", VOICES.length, " 个（点一下试听）"), /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-skins fg-voices" }, VOICES.map((v) => /* @__PURE__ */ import_react9.default.createElement("button", { key: v.id, type: "button", className: "fg-skin", onClick: () => previewVoice({ id: v.id, pitch: 0 }, ui2) }, /* @__PURE__ */ import_react9.default.createElement("b", null, "▶ ", v.label), /* @__PURE__ */ import_react9.default.createElement("span", null, VOICE_GENDER[v.gender], " · ", v.desc)))), /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-section" }, "音效"), /* @__PURE__ */ import_react9.default.createElement(Field, { label: "音效" }, /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-row" }, /* @__PURE__ */ import_react9.default.createElement(Toggle, { value: ui2.sfx, onChange: (v) => p4({ sfx: v }) }), /* @__PURE__ */ import_react9.default.createElement("input", { type: "range", min: "0", max: "2", step: "0.1", value: ui2.sfxVolume, "aria-label": "音效音量", onChange: (e) => p4({ sfxVolume: Number(e.target.value) }), style: { flex: 1 } }))), SOUND_GROUPS.map(([group, title, note]) => /* @__PURE__ */ import_react9.default.createElement(import_react9.default.Fragment, { key: group }, /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-section" }, title), /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-note" }, note, "。换一个版本会马上响一下；「用自己的」可以传 mp3、m4a、ogg、wav、flac（最大 5 MB，只放前 4 秒）。"), SOUND_SLOTS.filter((s) => s.group === group).map((slot) => {
    const mine = ui2.customSounds[slot.id];
    const options = [...slot.presets.map((x, i) => [x.id, i ? x.label : `${x.label}（默认）`]), ...mine ? [["custom", `我的：${mine.name || "上传的文件"}`]] : [], ["off", "关掉"]];
    return /* @__PURE__ */ import_react9.default.createElement(Field, { key: slot.id, label: slot.label, hint: slot.hint }, /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-row" }, /* @__PURE__ */ import_react9.default.createElement(Select, { value: ui2.sounds[slot.id], options, style: INLINE, onChange: (v) => {
      p4({ sounds: { [slot.id]: v } });
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
  const p4 = (patch) => patchConfig({ ui: patch }).catch((e) => toast(e.message, "error"));
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
    const meta = /* @__PURE__ */ new Map();
    for (const sidecar of files2.filter((f) => f.name === MUSIC_SIDECAR)) {
      try {
        for (const [file2, m] of readSidecar(await sidecar.text())) meta.set(file2, m);
      } catch (e) {
        toast(`${sidecar.webkitRelativePath || sidecar.name} 没读成：${e.message}。这份先不用`, "error");
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
  const exportSidecar = () => saveText(writeSidecar(tracks || []), MUSIC_SIDECAR);
  return /* @__PURE__ */ import_react9.default.createElement(import_react9.default.Fragment, null, /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-section" }, "播放"), /* @__PURE__ */ import_react9.default.createElement(Field, { label: "配乐" }, /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-row" }, /* @__PURE__ */ import_react9.default.createElement(Toggle, { value: cfg.ui.bgm, onChange: (v) => p4({ bgm: v }) }), /* @__PURE__ */ import_react9.default.createElement("input", { type: "range", min: "0", max: "1", step: "0.05", value: cfg.ui.bgmVolume, onChange: (e) => p4({ bgmVolume: Number(e.target.value) }), style: { flex: 1 } }))), /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-section" }, "我的曲库", tracks ? ` · ${tracks.length} 首` : ""), /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-note" }, "后台导演整理每一轮时会读到下面每首的描述和标签，自己决定这一幕放哪首、哪句话换歌。描述随便写：听感、乐器、适合的场面和情绪都行，越具体导演选得越准。导演还没整理完的轮次会先按描述粗配一首。"), /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-row", style: { margin: "1cqw 0" } }, /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", className: "fg-btn is-primary", disabled: Boolean(progress), onClick: () => folderRef.current && folderRef.current.click() }, "导入文件夹"), /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", className: "fg-btn", disabled: Boolean(progress), onClick: () => filesRef.current && filesRef.current.click() }, "添加曲子"), /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", className: "fg-btn", disabled: !tracks || !tracks.some((t) => t.file), onClick: exportSidecar }, "导出描述"), progress && /* @__PURE__ */ import_react9.default.createElement("span", { className: "fg-pill is-busy" }, progress), /* @__PURE__ */ import_react9.default.createElement("input", { ref: folderRef, type: "file", webkitdirectory: "", multiple: true, hidden: true, onChange: (e) => {
    importFiles(e.target.files);
    e.target.value = "";
  } }), /* @__PURE__ */ import_react9.default.createElement("input", { ref: filesRef, type: "file", accept: `audio/*,${MUSIC_SIDECAR}`, multiple: true, hidden: true, onChange: (e) => {
    importFiles(e.target.files);
    e.target.value = "";
  } })), /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-note" }, "文件夹里放一份 ", /* @__PURE__ */ import_react9.default.createElement("code", null, MUSIC_SIDECAR), "（就是「导出描述」得到的文件；分了子文件夹的，每个子文件夹各放一份也行），导入时会按文件名自动带上描述；同一首再导入不会重复存，但描述会以这个文件为准。"), !tracks && /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-note" }, "读取中…"), tracks && !tracks.length && /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-note", style: { marginTop: "1cqw" } }, "曲库还是空的。没有曲子时剧场不放音乐。"), tracks && tracks.map((t) => /* @__PURE__ */ import_react9.default.createElement(TrackCard, { key: t.id, track: t, playing: playing === t.id, onPlay: () => play(t) })));
}
function saveText(text, name2) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type: "application/json" }));
  a.download = name2;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1e3);
}
var KIND_LABEL = { ambience: "环境音", sfx: "音效" };
var LIB_SHOWN = 200;
function LibSoundCard({ sound, playing, onPlay }) {
  const [busy, run] = useBusy();
  const [open, setOpen] = import_react9.default.useState(false);
  const save = (patch) => run("s", async () => {
    await api.updateLibSound(sound.id, patch);
    await loadSoundlib();
  });
  return /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-track fg-libsound" }, /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", className: `fg-track-play${playing ? " is-on" : ""}`, title: playing ? "停止试听" : "试听", onClick: onPlay }, playing ? "■" : "▶"), /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-track-body" }, /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-row" }, /* @__PURE__ */ import_react9.default.createElement(Text, { value: sound.name, style: { flex: 1, width: "auto", fontWeight: 600 }, onCommit: (v) => save({ name: v }) }), /* @__PURE__ */ import_react9.default.createElement("span", { className: "fg-note", title: sound.file }, sizeMB(sound.bytes)), /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", className: "fg-btn", onClick: () => setOpen((v) => !v) }, open ? "收起" : "编辑"), /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", className: "fg-btn", disabled: busy === "d", onClick: () => {
    if (window.confirm(`从音效库删除「${sound.name}」？电脑上的原文件不受影响。`)) run("d", async () => {
      await api.removeLibSounds([sound.id]);
      await loadSoundlib();
    }, "已删除");
  } }, "删除")), !open && /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-note fg-libsound-tags" }, (sound.tags || []).join("、") || "（没有标签）", sound.description ? " · " + sound.description : ""), open && /* @__PURE__ */ import_react9.default.createElement(import_react9.default.Fragment, null, /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-row" }, /* @__PURE__ */ import_react9.default.createElement("select", { className: "fg-select", style: { width: "auto" }, value: sound.kind, onChange: (e) => save({ kind: e.target.value }) }, /* @__PURE__ */ import_react9.default.createElement("option", { value: "sfx" }, "音效（响一次）"), /* @__PURE__ */ import_react9.default.createElement("option", { value: "ambience" }, "环境音（循环）")), /* @__PURE__ */ import_react9.default.createElement(Text, { value: sound.category, placeholder: "分类，两层用 / 隔开：门窗/敲门", style: { flex: 1, width: "auto" }, onCommit: (v) => save({ category: v }) }), /* @__PURE__ */ import_react9.default.createElement("span", { className: "fg-note" }, "音量"), /* @__PURE__ */ import_react9.default.createElement("input", { type: "range", min: "0", max: "2", step: "0.05", value: sound.volume ?? 1, onChange: (e) => save({ volume: Number(e.target.value) }), style: { width: "8cqw" } })), /* @__PURE__ */ import_react9.default.createElement(Text, { value: (sound.tags || []).join("、"), placeholder: "标签：正文里会出现的词，用顿号隔开。导演按它们挑候选，例如：敲门、咚咚、门", style: { width: "100%" }, onCommit: (v) => save({ tags: v }) }), /* @__PURE__ */ import_react9.default.createElement(TextArea, { value: sound.description, placeholder: "听起来什么样、什么时候用。例如：木门被轻轻敲了两下，礼貌、迟疑", onCommit: (v) => save({ description: v }) }))));
}
function ErosField({ cfg, p: p4 }) {
  const [open, setOpen] = import_react9.default.useState(false);
  const volume = (cfg.ui.storySfxVolume ?? 0.8) / 0.8;
  const row = { gap: ".5cqw", marginTop: ".6cqw" };
  return /* @__PURE__ */ import_react9.default.createElement(Field, { label: "亲密场面", hint: "成年人之间的亲密戏。导演按正文给一段一段配节奏：爱抚、缓慢、加快、激烈、余韵，节奏底一直响，镜头跟着一下一下轻轻地送，画面边上泛起潮红；有触手时画面边上有暗影在动，配湿黏的蠕动声。插入、顶到最深、射精这些读到那句时响；高潮时画面柔和地白一下，射精时跟着声音一下一下地亮。正文里的 [SE：…] 提示和日文拟声（ぬぷ、こつん、どくどく……）也认得。音量跟剧情音效走，画面上不出字。" }, /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-row" }, /* @__PURE__ */ import_react9.default.createElement(Toggle, { value: cfg.ui.eros, onChange: (v) => p4({ eros: v }) }), /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", className: "fg-btn", onClick: () => setOpen((v) => !v) }, open ? "收起试听" : "试听")), open && /* @__PURE__ */ import_react9.default.createElement(import_react9.default.Fragment, null, /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-row", style: row }, EROS_PACES.filter((k) => k !== "none").map((k) => /* @__PURE__ */ import_react9.default.createElement("button", { key: k, type: "button", className: "fg-btn", onClick: () => previewEros(k, "", volume) }, EROS_LABEL[k])), TENTACLE.filter((k) => k !== "none").map((k) => /* @__PURE__ */ import_react9.default.createElement("button", { key: k, type: "button", className: "fg-btn", onClick: () => previewEros("", k, volume) }, TENTACLE_LABEL[k])), PEAKS.map((k) => /* @__PURE__ */ import_react9.default.createElement("button", { key: k, type: "button", className: "fg-btn", onClick: () => erosPeak(k, volume) }, PEAK_LABEL[k]))), /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-row", style: row }, Object.keys(EROS_SFX).map((name2) => /* @__PURE__ */ import_react9.default.createElement("button", { key: name2, type: "button", className: "fg-btn", onClick: () => erosFoley(EROS_SFX[name2].id, volume) }, name2)))));
}
function SoundLibSection({ data }) {
  const cfg = data.config;
  const sounds2 = useSoundlib();
  const [playing, setPlaying] = import_react9.default.useState("");
  const [progress, setProgress] = import_react9.default.useState("");
  const [query, setQuery] = import_react9.default.useState("");
  const [openGroup, setOpenGroup] = import_react9.default.useState("");
  const [busy, run] = useBusy();
  const folderRef = import_react9.default.useRef(null);
  const p4 = (patch) => patchConfig({ ui: patch }).catch((e) => toast(e.message, "error"));
  import_react9.default.useEffect(() => () => stopPreview(), []);
  const play = (s) => {
    if (playing === s.id) {
      stopPreview();
      return;
    }
    previewTrack({ id: s.id, url: assetUrl(s.assetId), volume: Math.min(1, 0.7 * (s.volume ?? 1)) }, () => setPlaying((id) => id === s.id ? "" : id));
    setPlaying(s.id);
  };
  const importFiles = async (list2) => {
    const files2 = [...list2 || []];
    if (!files2.length) return;
    const pathOf = (f) => f.webkitRelativePath || f.name;
    const sidecars = [];
    for (const f of files2.filter((f2) => f2.name === SOUND_SIDECAR)) {
      try {
        sidecars.push({ path: pathOf(f), map: readSoundSidecar(await f.text()) });
      } catch (e) {
        toast(`${pathOf(f)} 没读成：${e.message}`, "error");
      }
    }
    const match = soundMatcher(sidecars);
    const audio = files2.filter((f) => AUDIO_FILE.test(f.name)).sort((a, b) => pathOf(a).localeCompare(pathOf(b), "zh-CN", { numeric: true }));
    if (!audio.length) {
      toast("没找到音频文件（mp3、m4a、aac、ogg、opus、wav、flac）", "error");
      return;
    }
    const have = new Map((sounds2 || []).map((s) => [`${s.file}|${s.bytes}`, s]));
    const failed = [];
    let added = 0, updated = 0;
    for (let i = 0; i < audio.length; i++) {
      const f = audio[i];
      const { file: file2, meta } = match(pathOf(f));
      setProgress(`导入中 ${i + 1} / ${audio.length}：${file2}`);
      try {
        const old = have.get(`${file2}|${f.size}`);
        if (old) {
          if (meta) {
            await api.updateLibSound(old.id, meta);
            updated++;
          }
          continue;
        }
        await api.uploadLibSound(f, file2, meta);
        added++;
      } catch (e) {
        failed.push(`${file2}：${e.message}`);
      }
    }
    setProgress("");
    await loadSoundlib().catch(() => {
    });
    toast(`新导入 ${added} 个${updated ? `，更新了 ${updated} 个的描述` : ""}${failed.length ? `；${failed.length} 个失败：${failed.slice(0, 3).join("；")}` : ""}`, failed.length ? "error" : void 0);
  };
  const groups = import_react9.default.useMemo(() => {
    const map = /* @__PURE__ */ new Map();
    for (const s of sounds2 || []) {
      const key = `${s.kind}|${String(s.category || "未分类").split("/")[0]}`;
      if (!map.has(key)) map.set(key, { key, kind: s.kind, name: key.split("|")[1], items: [] });
      map.get(key).items.push(s);
    }
    return [...map.values()].sort((a, b) => a.kind === b.kind ? a.name.localeCompare(b.name, "zh-CN") : a.kind === "ambience" ? -1 : 1);
  }, [sounds2]);
  const words = query.trim().split(/\s+/).filter(Boolean);
  const found = words.length ? (sounds2 || []).filter((s) => {
    const text = `${s.name} ${s.category} ${(s.tags || []).join(" ")} ${s.description}`;
    return words.every((w) => text.includes(w));
  }) : null;
  const cards = (list2) => list2.slice(0, LIB_SHOWN).map((s) => /* @__PURE__ */ import_react9.default.createElement(LibSoundCard, { key: s.id, sound: s, playing: playing === s.id, onPlay: () => play(s) }));
  const removeGroup = (g) => {
    if (!window.confirm(`把「${KIND_LABEL[g.kind]} · ${g.name}」这一类 ${g.items.length} 个都从音效库删掉？电脑上的原文件不受影响。`)) return;
    run("g" + g.key, async () => {
      await api.removeLibSounds(g.items.map((s) => s.id));
      await loadSoundlib();
    }, "已删除");
  };
  return /* @__PURE__ */ import_react9.default.createElement(import_react9.default.Fragment, null, /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-section" }, "播放"), /* @__PURE__ */ import_react9.default.createElement(Field, { label: "环境音", hint: "雨声、蝉鸣、车站的嘈杂……导演按地点、天气给每一幕配，循环播放。" }, /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-row" }, /* @__PURE__ */ import_react9.default.createElement(Toggle, { value: cfg.ui.amb, onChange: (v) => p4({ amb: v }) }), /* @__PURE__ */ import_react9.default.createElement("input", { type: "range", min: "0", max: "1", step: "0.05", value: cfg.ui.ambVolume, onChange: (e) => p4({ ambVolume: Number(e.target.value) }), style: { flex: 1 } }))), /* @__PURE__ */ import_react9.default.createElement(Field, { label: "剧情音效", hint: "推门、手机震动、杯子摔碎……导演给正文里写到的声音配，读到那句时响一次。音效库里没有合适的（或者库是空的）时，用内置的拟声音效：砰、咚、叮、哗、咔嚓、轰……现场合成。" }, /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-row" }, /* @__PURE__ */ import_react9.default.createElement(Toggle, { value: cfg.ui.storySfx, onChange: (v) => p4({ storySfx: v }) }), /* @__PURE__ */ import_react9.default.createElement("input", { type: "range", min: "0", max: "2", step: "0.05", value: cfg.ui.storySfxVolume, onChange: (e) => p4({ storySfxVolume: Number(e.target.value) }), style: { flex: 1 } }))), /* @__PURE__ */ import_react9.default.createElement(ErosField, { cfg, p: p4 }), /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-section" }, "我的音效库", sounds2 ? ` · ${sounds2.length} 个` : ""), /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-note" }, "库再大也没关系：后台导演整理每一轮时，只会看到按这一轮正文挑出来的几十个候选（标签、名字、分类在正文里出现得越多越靠前），再决定哪一幕放什么环境音、哪句配什么音效。所以标签要写正文里会出现的词。"), /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-row", style: { margin: "1cqw 0" } }, /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", className: "fg-btn is-primary", disabled: Boolean(progress), onClick: () => folderRef.current && folderRef.current.click() }, "导入文件夹"), /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", className: "fg-btn", disabled: !sounds2 || !sounds2.some((s) => s.file), onClick: () => saveText(writeSoundSidecar(sounds2 || []), SOUND_SIDECAR) }, "导出描述"), progress && /* @__PURE__ */ import_react9.default.createElement("span", { className: "fg-pill is-busy" }, progress), /* @__PURE__ */ import_react9.default.createElement("input", { ref: folderRef, type: "file", webkitdirectory: "", multiple: true, hidden: true, onChange: (e) => {
    importFiles(e.target.files);
    e.target.value = "";
  } })), /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-note" }, "文件夹最上面放一份 ", /* @__PURE__ */ import_react9.default.createElement("code", null, SOUND_SIDECAR), "（就是「导出描述」得到的文件，子文件夹里也可以各放一份），导入时按路径自动带上名字、种类、分类和标签；没有描述文件时名字取文件名、分类取所在的文件夹。同一个文件再导入不会重复存，但描述会以描述文件为准。"), !sounds2 && /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-note" }, "读取中…"), sounds2 && !sounds2.length && /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-note", style: { marginTop: "1cqw" } }, "音效库还是空的。没有声音时剧场不放环境音和剧情音效。"), sounds2 && sounds2.length > 0 && /* @__PURE__ */ import_react9.default.createElement(import_react9.default.Fragment, null, /* @__PURE__ */ import_react9.default.createElement("input", { className: "fg-input", style: { width: "100%", margin: "0.6cqw 0 1cqw" }, value: query, placeholder: "搜索名字、分类、标签、描述（空格隔开几个词）", onChange: (e) => setQuery(e.target.value), onKeyDown: (e) => e.stopPropagation() }), found && /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-note" }, "找到 ", found.length, " 个", found.length > LIB_SHOWN ? `，先列出前 ${LIB_SHOWN} 个` : ""), found && cards(found), !found && groups.map((g) => /* @__PURE__ */ import_react9.default.createElement("div", { key: g.key, className: "fg-libgroup" }, /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-row fg-libgroup-head" }, /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", className: "fg-btn", onClick: () => setOpenGroup((k) => k === g.key ? "" : g.key) }, openGroup === g.key ? "▾" : "▸", " ", KIND_LABEL[g.kind], " · ", g.name), /* @__PURE__ */ import_react9.default.createElement("span", { className: "fg-note" }, g.items.length, " 个"), /* @__PURE__ */ import_react9.default.createElement("span", { style: { flex: 1 } }), /* @__PURE__ */ import_react9.default.createElement("button", { type: "button", className: "fg-btn", disabled: busy === "g" + g.key, onClick: () => removeGroup(g) }, "删除这一类")), openGroup === g.key && /* @__PURE__ */ import_react9.default.createElement(import_react9.default.Fragment, null, g.items.length > LIB_SHOWN && /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-note" }, "这一类有 ", g.items.length, " 个，先列出前 ", LIB_SHOWN, " 个；用搜索找其余的。"), cards(g.items))))));
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
      tabs: [{ id: "look", label: "外观与演出" }, { id: "sound", label: "声音" }, { id: "music", label: "配乐" }, { id: "soundlib", label: "音效库" }, { id: "director", label: "导演" }, { id: "images", label: "生图渠道" }, { id: "style", label: "画风与配图" }, { id: "about", label: "版本与更新" }],
      tab,
      onTab: setTab,
      actions: data && /* @__PURE__ */ import_react9.default.createElement("span", { className: `fg-pill${data.ready ? "" : " fg-err"}` }, data.ready ? "生图已就绪" : data.readyReason)
    },
    !data && /* @__PURE__ */ import_react9.default.createElement("div", { className: "fg-note" }, "读取设置中…"),
    data && tab === "look" && /* @__PURE__ */ import_react9.default.createElement(LookSection, { data }),
    data && tab === "sound" && /* @__PURE__ */ import_react9.default.createElement(SoundSection, { data }),
    data && tab === "music" && /* @__PURE__ */ import_react9.default.createElement(MusicSection, { data }),
    data && tab === "soundlib" && /* @__PURE__ */ import_react9.default.createElement(SoundLibSection, { data }),
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
var REASON = { auto: "正文写完后自动整理", force: "手动重新整理", sprite: "写立绘提示词", cg: "写插画提示词", acting: "设计动作与表情" };
var WRITER = { ai: "模型写的", fallback: "按档案拼的", user: "玩家改的" };
var sourceLabel = (source) => ({ tavern: hostName() === "st" ? "跟着酒馆当前的连接" : "跟随 Tavern 后台模型", plugin: "插件设置里指定", cg: "插画分镜师单独选的", custom: "插画分镜师的自定义接口" })[source];
var USAGE_LABEL = { inputTokens: "输入", outputTokens: "输出", reasoningTokens: "思考", cachedInputTokens: "缓存命中", cacheReadTokens: "缓存读", cacheWriteTokens: "缓存写", totalTokens: "合计" };
var SHAPE_LABEL = { landscape: "横版", portrait: "竖版", square: "方形" };
var thenText = (t) => [t.name, t.outfit, t.states ? t.states.length ? t.states.map((s) => s.name).join("、") : "无状态" : "", t.change ? "外貌另写" : ""].filter(Boolean).join(" ");
var shiftText = (s) => [s.name, s.outfit ? `换上${s.outfit}` : "", ...(s.on || []).map((x) => "+" + x.name), ...(s.off || []).map((x) => "−" + x.name)].filter(Boolean).join(" ");
var entryTitle = (e) => e.kind === "sprite" ? `立绘 · ${e.name}` : e.kind === "acting" ? `动作与表情 · ${e.name}` : e.kind === "cg" ? `插画 · 第 ${e.turn} 轮` : `第 ${e.turn} 轮`;
var num = (n) => Number(n || 0).toLocaleString("en-US");
var secs = (ms) => ms >= 6e4 ? `${Math.floor(ms / 6e4)} 分 ${Math.round(ms % 6e4 / 1e3)} 秒` : `${(ms / 1e3).toFixed(1)} 秒`;
var clock2 = (at2) => new Date(at2).toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" });
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
  return /* @__PURE__ */ import_react10.default.createElement("button", { type: "button", className: `fg-dlog-row${on ? " is-on" : ""}`, onClick }, /* @__PURE__ */ import_react10.default.createElement("div", { className: "fg-dlog-row-head" }, /* @__PURE__ */ import_react10.default.createElement("b", null, entryTitle(e)), /* @__PURE__ */ import_react10.default.createElement(StatusPill, { status: e.status })), /* @__PURE__ */ import_react10.default.createElement("div", { className: "fg-dlog-row-meta" }, clock2(e.at), " · ", e.status === "running" ? "进行中" : secs(e.ms), e.attempts > 1 ? ` · ${e.attempts} 次尝试` : ""), /* @__PURE__ */ import_react10.default.createElement("div", { className: "fg-dlog-row-meta" }, e.model || "（没有模型）"), e.summary && /* @__PURE__ */ import_react10.default.createElement("div", { className: "fg-dlog-row-sum" }, e.summary), e.error && /* @__PURE__ */ import_react10.default.createElement("div", { className: "fg-dlog-row-sum fg-err" }, e.error));
}
var TYPE_LABEL = { dialogue: "台词", narration: "旁白", thought: "心声" };
function sceneChange(c) {
  return [c.location, TIME_LABEL[c.time], WEATHER_LABEL[c.weather], c.light && (LIGHT_LABEL[c.light] || "正常光线"), c.fx && (FX_LABEL[c.fx] || "停止效果"), c.romance && (ROMANCE_LABEL[c.romance] ? "♡ " + ROMANCE_LABEL[c.romance] : "收起亲密氛围"), c.sense && (SENSE_LABEL[c.sense] ? "感官：" + SENSE_LABEL[c.sense] : "感官恢复"), c.eros && (EROS_LABEL[c.eros] ? "节奏：" + EROS_LABEL[c.eros] : "节奏停"), c.tentacle && (TENTACLE_LABEL[c.tentacle] || "触手退去"), c.bars && (c.bars === "on" ? "电影黑边" : "收起黑边"), c.mood && "♪ " + (MOOD_LABEL[c.mood] || c.mood), c.transition && (TRANSITION_LABEL[c.transition] || c.transition)].filter(Boolean).join(" · ");
}
function Chip({ k, children }) {
  return /* @__PURE__ */ import_react10.default.createElement("span", { className: "fg-dlog-chip" }, k && /* @__PURE__ */ import_react10.default.createElement("i", null, k), children);
}
function ScriptView({ script, units }) {
  if (!script) return /* @__PURE__ */ import_react10.default.createElement("div", { className: "fg-note" }, "这次没有得到可用的脚本，看「原始输出」里模型回了什么。");
  const s = script.scene;
  const tagged = units.filter((u) => script.lines[u.id] && Object.keys(script.lines[u.id]).length).length;
  const skipped = new Set(script.skip || []);
  return /* @__PURE__ */ import_react10.default.createElement(import_react10.default.Fragment, null, /* @__PURE__ */ import_react10.default.createElement(Block, { label: "场景" }, /* @__PURE__ */ import_react10.default.createElement("div", { className: "fg-dlog-chips" }, /* @__PURE__ */ import_react10.default.createElement(Chip, { k: "地点" }, s.location || "—"), /* @__PURE__ */ import_react10.default.createElement(Chip, { k: "时段" }, TIME_LABEL[s.time] || s.time), /* @__PURE__ */ import_react10.default.createElement(Chip, { k: "天气" }, WEATHER_LABEL[s.weather] || s.weather), /* @__PURE__ */ import_react10.default.createElement(Chip, { k: "基调" }, MOOD_LABEL[s.mood] || s.mood), LIGHT_LABEL[s.light] && /* @__PURE__ */ import_react10.default.createElement(Chip, { k: "光线" }, LIGHT_LABEL[s.light]), FX_LABEL[s.fx] && /* @__PURE__ */ import_react10.default.createElement(Chip, { k: "效果" }, FX_LABEL[s.fx]), ROMANCE_LABEL[s.romance] && /* @__PURE__ */ import_react10.default.createElement(Chip, { k: "氛围" }, ROMANCE_LABEL[s.romance]), SENSE_LABEL[s.sense] && /* @__PURE__ */ import_react10.default.createElement(Chip, { k: "感官" }, SENSE_LABEL[s.sense]), EROS_LABEL[s.eros] && /* @__PURE__ */ import_react10.default.createElement(Chip, { k: "节奏" }, EROS_LABEL[s.eros]), TENTACLE_LABEL[s.tentacle] && /* @__PURE__ */ import_react10.default.createElement(Chip, { k: "触手" }, TENTACLE_LABEL[s.tentacle].replace("触手", "")), s.bars === "on" && /* @__PURE__ */ import_react10.default.createElement(Chip, { k: "画幅" }, "电影黑边"), /* @__PURE__ */ import_react10.default.createElement(Chip, { k: "转场" }, TRANSITION_LABEL[s.transition] || s.transition)), s.bg && /* @__PURE__ */ import_react10.default.createElement("div", { className: "fg-note" }, "背景提示词：", s.bg)), /* @__PURE__ */ import_react10.default.createElement(Block, { label: `出场 · ${script.cast.length}` }, /* @__PURE__ */ import_react10.default.createElement("div", { className: "fg-dlog-chips" }, script.cast.map((c) => /* @__PURE__ */ import_react10.default.createElement(Chip, { key: c.name, k: POS_LABEL[c.pos] || c.pos }, c.name)), !script.cast.length && /* @__PURE__ */ import_react10.default.createElement("span", { className: "fg-note" }, "没有人物上场"))), /* @__PURE__ */ import_react10.default.createElement(Block, { label: `逐句标注 · ${tagged} / ${units.length - skipped.size} 句${skipped.size ? ` · 不演 ${skipped.size} 句` : ""}` }, /* @__PURE__ */ import_react10.default.createElement("div", { className: "fg-dlog-lines" }, units.map((u) => {
    const l = script.lines[u.id] || {};
    if (skipped.has(u.id)) return /* @__PURE__ */ import_react10.default.createElement("div", { key: u.id, className: "fg-dlog-line is-skipped" }, /* @__PURE__ */ import_react10.default.createElement("span", { className: "fg-dlog-uid" }, u.id), /* @__PURE__ */ import_react10.default.createElement("div", { className: "fg-dlog-utext" }, u.text), /* @__PURE__ */ import_react10.default.createElement("div", { className: "fg-dlog-chips" }, /* @__PURE__ */ import_react10.default.createElement("span", { className: "fg-note" }, "不是故事 · 不演")));
    const marks = [
      l.type && /* @__PURE__ */ import_react10.default.createElement(Chip, { key: "type", k: "改判" }, TYPE_LABEL[l.type] || l.type),
      l.sp && /* @__PURE__ */ import_react10.default.createElement(Chip, { key: "sp", k: "说话" }, l.sp, l.as ? `（显示为 ${l.as}）` : ""),
      l.emo && /* @__PURE__ */ import_react10.default.createElement(Chip, { key: "emo", k: "情绪" }, emotionLabel(l.emo)),
      l.say && /* @__PURE__ */ import_react10.default.createElement(Chip, { key: "say", k: "演法" }, DELIVERY_LABEL[l.say] || l.say),
      l.stress && /* @__PURE__ */ import_react10.default.createElement(Chip, { key: "stress", k: "重音" }, "「", l.stress, "」"),
      l.textfx && /* @__PURE__ */ import_react10.default.createElement(Chip, { key: "textfx", k: "文字" }, l.textfx.map((f) => `「${f.text}」${TEXT_FX_LABEL[f.style] || f.style}`).join("、")),
      l.voice && /* @__PURE__ */ import_react10.default.createElement(Chip, { key: "voice", k: "声音" }, VOICE_LABEL[l.voice] || l.voice),
      l.split && /* @__PURE__ */ import_react10.default.createElement(Chip, { key: "split", k: "分屏" }, l.split === "off" ? "收起" : l.split.who.join("、") + (l.split.location ? ` @ ${l.split.location}` : "")),
      l.sym && /* @__PURE__ */ import_react10.default.createElement(Chip, { key: "sym", k: "符号" }, SYMBOL_LABEL[l.sym] || l.sym),
      l.cam && /* @__PURE__ */ import_react10.default.createElement(Chip, { key: "cam", k: "镜头" }, CAMERA_LABEL[l.cam] || l.cam, l.camOn ? ` · ${l.camOn}` : ""),
      l.moment && /* @__PURE__ */ import_react10.default.createElement(Chip, { key: "moment", k: "瞬间" }, [MOMENT_LABEL[l.moment.kind] || l.moment.kind, l.moment.who, l.moment.text && `「${l.moment.text}」`, l.moment.place].filter(Boolean).join(" ")),
      l.phone && /* @__PURE__ */ import_react10.default.createElement(Chip, { key: "phone", k: "手机" }, [(l.phone.video ? "视频" : "") + (PHONE_LABEL[l.phone.kind] || l.phone.kind), l.phone.who, l.phone.result && CALL_END_LABEL[l.phone.result], l.phone.text && `「${l.phone.text}」`].filter(Boolean).join(" ")),
      l.hit && /* @__PURE__ */ import_react10.default.createElement(Chip, { key: "hit", k: "出手" }, [l.hit.from, l.hit.to && "→ " + l.hit.to, l.hit.move && `「${l.hit.move}」`, HIT_EFFECT_LABEL[l.hit.effect] || l.hit.effect].filter(Boolean).join(" ")),
      l.card && /* @__PURE__ */ import_react10.default.createElement(Chip, { key: "card", k: "卡片" }, CARD_LABEL[l.card] || l.card),
      l.cut && /* @__PURE__ */ import_react10.default.createElement(Chip, { key: "cut", k: "字卡" }, l.cut.text),
      l.mode && /* @__PURE__ */ import_react10.default.createElement(Chip, { key: "mode", k: "段落" }, MODE_LABEL[l.mode] || l.mode),
      l.recall && /* @__PURE__ */ import_react10.default.createElement(Chip, { key: "recall", k: "段落" }, "短闪回", RECALL_TONE_NAMES[l.recall] ? ` · ${RECALL_TONE_NAMES[l.recall]}` : ""),
      l.then && /* @__PURE__ */ import_react10.default.createElement(Chip, { key: "then", k: "当时的样子" }, l.then.map(thenText).join("；")),
      l.look && /* @__PURE__ */ import_react10.default.createElement(Chip, { key: "look", k: "从这句起" }, l.look.map(shiftText).join("；")),
      l.scene && /* @__PURE__ */ import_react10.default.createElement(Chip, { key: "scene", k: "场景" }, sceneChange(l.scene)),
      l.bgm && (l.bgm === "hush" ? /* @__PURE__ */ import_react10.default.createElement(Chip, { key: "bgm", k: "配乐" }, "留白") : /* @__PURE__ */ import_react10.default.createElement(Chip, { key: "bgm", k: "换歌" }, l.bgm === "none" ? "停" : l.bgm)),
      l.amb && /* @__PURE__ */ import_react10.default.createElement(Chip, { key: "amb", k: "环境音" }, l.amb === "none" ? "停" : l.amb),
      l.sfx && /* @__PURE__ */ import_react10.default.createElement(Chip, { key: "sfx", k: "音效" }, l.sfx),
      l.peak && /* @__PURE__ */ import_react10.default.createElement(Chip, { key: "peak", k: "高潮" }, PEAK_LABEL[l.peak] || l.peak),
      l.react && /* @__PURE__ */ import_react10.default.createElement(Chip, { key: "react", k: "反应" }, l.react.map((r) => (r.name === "*" ? "全员" : r.name) + " " + [r.emo && emotionLabel(r.emo), r.sym && (SYMBOL_LABEL[r.sym] || r.sym)].filter(Boolean).join(" · ")).join("、")),
      l.move && /* @__PURE__ */ import_react10.default.createElement(Chip, { key: "move", k: "走位" }, l.move.map((m) => `${m.name === "*" ? "全员" : m.name} ${m.act === "hide" && m.to ? `躲到${m.to}身后` : (MOVE_LABEL[m.act] || m.act) + (m.to ? " " + m.to : "")}`).join("、")),
      l.enter && /* @__PURE__ */ import_react10.default.createElement(Chip, { key: "in", k: "登场" }, l.enter.map((e) => e.name + (e.pos ? `（${POS_LABEL[e.pos] || e.pos}）` : "") + (e.how ? ` · ${ENTER_HOW_LABEL[e.how] || e.how}` : "")).join("、")),
      l.exit && /* @__PURE__ */ import_react10.default.createElement(Chip, { key: "out", k: "退场" }, l.exit.map((n) => n + (l.exitHow && l.exitHow[n] ? ` · ${EXIT_HOW_LABEL[l.exitHow[n]] || l.exitHow[n]}` : "")).join("、"))
    ].filter(Boolean);
    return /* @__PURE__ */ import_react10.default.createElement("div", { key: u.id, className: `fg-dlog-line${marks.length ? "" : " is-plain"}` }, /* @__PURE__ */ import_react10.default.createElement("span", { className: "fg-dlog-uid" }, u.id), /* @__PURE__ */ import_react10.default.createElement("div", { className: "fg-dlog-utext" }, (l.type || u.type) === "dialogue" ? `「${u.text}」` : (l.type || u.type) === "thought" ? `（${u.text}）` : u.text), /* @__PURE__ */ import_react10.default.createElement("div", { className: "fg-dlog-chips" }, marks.length ? marks : /* @__PURE__ */ import_react10.default.createElement("span", { className: "fg-note" }, "旁白 · 无演出")));
  }))), script.choices.length > 0 && /* @__PURE__ */ import_react10.default.createElement(Block, { label: `选项 · ${script.choices.length}` }, /* @__PURE__ */ import_react10.default.createElement("ol", { className: "fg-dlog-list-plain" }, script.choices.map((c, i) => /* @__PURE__ */ import_react10.default.createElement("li", { key: i }, c)))), /* @__PURE__ */ import_react10.default.createElement(Block, { label: `插画分镜 · ${script.images.length}` }, script.images.map((img, i) => /* @__PURE__ */ import_react10.default.createElement("div", { key: i, className: "fg-dlog-card" }, /* @__PURE__ */ import_react10.default.createElement("div", { className: "fg-dlog-chips" }, /* @__PURE__ */ import_react10.default.createElement(Chip, { k: "标题" }, img.title || "—"), /* @__PURE__ */ import_react10.default.createElement(Chip, { k: "显示" }, img.after, img.until && img.until !== img.after ? ` → ${img.until}` : img.until ? "" : " → 本轮结束"), img.who && img.who.length ? /* @__PURE__ */ import_react10.default.createElement(Chip, { k: "入画" }, img.who.join("、")) : null, img.shape && /* @__PURE__ */ import_react10.default.createElement(Chip, { k: "画幅" }, SHAPE_LABEL[img.shape] || img.shape), img.enter && /* @__PURE__ */ import_react10.default.createElement(Chip, { k: "出现" }, CG_IN_LABEL[img.enter] || img.enter), img.motion && /* @__PURE__ */ import_react10.default.createElement(Chip, { k: "停留" }, CG_MOTION_LABEL[img.motion] || img.motion), img.leave && /* @__PURE__ */ import_react10.default.createElement(Chip, { k: "消失" }, CG_OUT_LABEL[img.leave] || img.leave)), img.moment && /* @__PURE__ */ import_react10.default.createElement("div", null, img.moment), img.tags && /* @__PURE__ */ import_react10.default.createElement("div", { className: "fg-dlog-mono" }, img.tags), img.desc && /* @__PURE__ */ import_react10.default.createElement("div", { className: "fg-note" }, img.desc))), !script.images.length && /* @__PURE__ */ import_react10.default.createElement("div", { className: "fg-note" }, "导演觉得这一轮不需要插画（或设置里关了自动插画）。")), script.emotions && script.emotions.length > 0 && /* @__PURE__ */ import_react10.default.createElement(Block, { label: `新加进情绪库 · ${script.emotions.length}` }, script.emotions.map((e) => /* @__PURE__ */ import_react10.default.createElement("div", { key: e.name, className: "fg-dlog-card" }, /* @__PURE__ */ import_react10.default.createElement("b", null, e.name), e.base ? /* @__PURE__ */ import_react10.default.createElement("span", { className: "fg-note" }, " · 接近 ", emotionLabel(e.base)) : null, e.desc && /* @__PURE__ */ import_react10.default.createElement("div", { className: "fg-note" }, e.desc)))), /* @__PURE__ */ import_react10.default.createElement(Block, { label: `角色档案更新 · ${script.people.length}` }, script.people.map((p4, i) => /* @__PURE__ */ import_react10.default.createElement("div", { key: i, className: "fg-dlog-card" }, /* @__PURE__ */ import_react10.default.createElement("b", null, p4.name), p4.gender ? /* @__PURE__ */ import_react10.default.createElement("span", { className: "fg-note" }, " · ", p4.gender) : null, lookText(p4.appearance) && /* @__PURE__ */ import_react10.default.createElement("div", { className: "fg-dlog-mono" }, "建档：", lookText(p4.appearance)), lookText(p4.change) && /* @__PURE__ */ import_react10.default.createElement("div", { className: "fg-dlog-mono" }, "永久变化：", lookText(p4.change)), p4.outfit && /* @__PURE__ */ import_react10.default.createElement("div", { className: "fg-dlog-mono" }, "换装：", p4.outfit, p4.outfitTags ? `（${p4.outfitTags}）` : ""), p4.states && /* @__PURE__ */ import_react10.default.createElement("div", { className: "fg-dlog-mono" }, "长期状态：", p4.states.length ? p4.states.map((s2) => `${s2.name}${s2.tags ? `（${s2.tags}）` : ""}`).join("、") : "全部结束"), p4.temp && /* @__PURE__ */ import_react10.default.createElement("div", { className: "fg-dlog-mono" }, "临时状态：", p4.temp))), !script.people.length && /* @__PURE__ */ import_react10.default.createElement("div", { className: "fg-note" }, "这一轮没有新建或修改档案。")));
}
function SpritesView({ sprites }) {
  if (!sprites || !sprites.length) return /* @__PURE__ */ import_react10.default.createElement("div", { className: "fg-note" }, "这次没有写出提示词，看「原始输出」里模型回了什么。");
  return /* @__PURE__ */ import_react10.default.createElement(Block, { label: `差分提示词 · ${sprites.length}` }, sprites.map((sp) => /* @__PURE__ */ import_react10.default.createElement("div", { key: sp.key, className: "fg-dlog-card" }, /* @__PURE__ */ import_react10.default.createElement("div", { className: "fg-dlog-chips" }, /* @__PURE__ */ import_react10.default.createElement(Chip, { k: "差分" }, sp.label), sp.writer && /* @__PURE__ */ import_react10.default.createElement(Chip, { k: "来源" }, WRITER[sp.writer] || sp.writer)), /* @__PURE__ */ import_react10.default.createElement("div", { className: "fg-dlog-mono" }, sp.tags || "—"), sp.negative && /* @__PURE__ */ import_react10.default.createElement("div", { className: "fg-note" }, "额外负面：", sp.negative))));
}
function ActingView({ acting }) {
  if (!acting || !acting.poses || !acting.poses.length) return /* @__PURE__ */ import_react10.default.createElement("div", { className: "fg-note" }, "这次没有设计出能用的动作，先按已有的设计或通用动作组画；看「原始输出」里模型回了什么。");
  const label = (e) => emotionEntry(e).label;
  return /* @__PURE__ */ import_react10.default.createElement(import_react10.default.Fragment, null, acting.read && /* @__PURE__ */ import_react10.default.createElement(Block, { label: "怎么流露情绪" }, /* @__PURE__ */ import_react10.default.createElement("div", null, acting.read)), /* @__PURE__ */ import_react10.default.createElement(Block, { label: `动作 · ${acting.poses.length}` }, acting.poses.map((p4) => /* @__PURE__ */ import_react10.default.createElement("div", { key: p4.id, className: "fg-dlog-card" }, /* @__PURE__ */ import_react10.default.createElement("div", { className: "fg-dlog-chips" }, /* @__PURE__ */ import_react10.default.createElement(Chip, { k: p4.id }, p4.label), p4.side && /* @__PURE__ */ import_react10.default.createElement(Chip, { k: "构图" }, "侧身"), /* @__PURE__ */ import_react10.default.createElement(Chip, { k: "底图" }, label(p4.emotions[0]))), p4.desc && /* @__PURE__ */ import_react10.default.createElement("div", null, p4.desc), /* @__PURE__ */ import_react10.default.createElement("div", { className: "fg-dlog-mono" }, p4.tags || "—"), /* @__PURE__ */ import_react10.default.createElement("div", { className: "fg-note" }, "情绪：", p4.emotions.map(label).join("、"))))), /* @__PURE__ */ import_react10.default.createElement(Block, { label: `表情 · ${Object.keys(acting.faces || {}).length}` }, Object.entries(acting.faces || {}).map(([e, f]) => /* @__PURE__ */ import_react10.default.createElement("div", { key: e, className: "fg-dlog-card" }, /* @__PURE__ */ import_react10.default.createElement("div", { className: "fg-dlog-chips" }, /* @__PURE__ */ import_react10.default.createElement(Chip, { k: "情绪" }, label(e))), f.desc && /* @__PURE__ */ import_react10.default.createElement("div", null, f.desc), /* @__PURE__ */ import_react10.default.createElement("div", { className: "fg-dlog-mono" }, f.tags)))));
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
  const acting = summary.kind === "acting";
  const cg = summary.kind === "cg";
  const writer = sprite || cg || acting;
  const tabs = running ? [["live", "实时输出"], ["prompt", "提示词"]] : [["result", acting ? "设计结果" : writer ? "写出的提示词" : "整理结果"], ["raw", `原始输出${summary.attempts > 1 ? ` · ${summary.attempts} 次` : ""}`], ["prompt", "提示词"]];
  const live = summary.live || { output: "", reasoning: "", chars: 0, note: "" };
  const elapsed = running ? Math.max(summary.ms, now - summary.at) : summary.ms;
  return /* @__PURE__ */ import_react10.default.createElement("div", { className: "fg-dlog-detail" }, /* @__PURE__ */ import_react10.default.createElement("div", { className: "fg-dlog-head" }, /* @__PURE__ */ import_react10.default.createElement("div", { className: "fg-dlog-title" }, sprite || acting ? `${entryTitle(summary)}（读到第 ${summary.turn} 轮）` : entryTitle(summary), " ", /* @__PURE__ */ import_react10.default.createElement(StatusPill, { status: summary.status }), /* @__PURE__ */ import_react10.default.createElement("span", { className: "fg-spacer" }), running && /* @__PURE__ */ import_react10.default.createElement("button", { type: "button", className: "fg-btn", disabled: stopping, onClick: stop }, writer ? "停止" : "停止整理")), /* @__PURE__ */ import_react10.default.createElement("div", { className: "fg-dlog-facts" }, /* @__PURE__ */ import_react10.default.createElement("div", null, /* @__PURE__ */ import_react10.default.createElement("i", null, "模型"), summary.model || "—", summary.provider ? /* @__PURE__ */ import_react10.default.createElement("span", { className: "fg-note" }, " · ", summary.provider) : null, sourceLabel(summary.source) ? /* @__PURE__ */ import_react10.default.createElement("span", { className: "fg-note" }, "（", sourceLabel(summary.source), "）") : null), /* @__PURE__ */ import_react10.default.createElement("div", null, /* @__PURE__ */ import_react10.default.createElement("i", null, "时间"), clock2(summary.at), " · ", secs(elapsed), " · ", REASON[summary.reason] || summary.reason), /* @__PURE__ */ import_react10.default.createElement("div", null, /* @__PURE__ */ import_react10.default.createElement("i", null, "最大输出"), num(summary.maxTokens), " token", entry && entry.temperature != null ? ` · 温度 ${entry.temperature}` : ""), /* @__PURE__ */ import_react10.default.createElement("div", null, /* @__PURE__ */ import_react10.default.createElement("i", null, "模型窗口"), summary.window ? `${num(summary.window)} token` : "宿主没给窗口大小，按设置原样发", entry && entry.outputDefault ? /* @__PURE__ */ import_react10.default.createElement("span", { className: "fg-note" }, " · 模型默认输出 ", num(entry.outputDefault)) : null), entry && /* @__PURE__ */ import_react10.default.createElement("div", null, /* @__PURE__ */ import_react10.default.createElement("i", null, "资料"), entry.contextLength ? `发了 ${num(entry.contextChars)} 字（人物卡与世界书共 ${num(entry.contextLength)} 字）` : "这张卡没有人物卡 / 世界书资料"), entry && writer && /* @__PURE__ */ import_react10.default.createElement("div", null, /* @__PURE__ */ import_react10.default.createElement("i", null, "剧情"), `发了 ${num(entry.storyChars)} 字（到这一轮为止共 ${num(entry.storyLength)} 字）`), summary.usage && /* @__PURE__ */ import_react10.default.createElement("div", null, /* @__PURE__ */ import_react10.default.createElement("i", null, "用量"), usageText(summary.usage))), summary.notes.map((n, i) => /* @__PURE__ */ import_react10.default.createElement("div", { key: i, className: "fg-dlog-notice" }, "⚠ ", n)), summary.error && /* @__PURE__ */ import_react10.default.createElement("div", { className: "fg-err fg-dlog-error" }, summary.error)), /* @__PURE__ */ import_react10.default.createElement("div", { className: "fg-tabs fg-dlog-tabs" }, tabs.map(([id, label]) => /* @__PURE__ */ import_react10.default.createElement("button", { key: id, type: "button", className: `fg-tab${tab === id ? " is-on" : ""}`, onClick: () => setTab(id) }, label))), loadError && /* @__PURE__ */ import_react10.default.createElement("div", { className: "fg-err" }, loadError), tab === "live" && /* @__PURE__ */ import_react10.default.createElement(import_react10.default.Fragment, null, /* @__PURE__ */ import_react10.default.createElement("div", { className: "fg-dlog-meter" }, /* @__PURE__ */ import_react10.default.createElement("span", { className: "fg-dlog-dot" }), live.note || `第 ${summary.attempts || 1} 次请求`, " · 已收到 ", num(live.chars), " 字", live.chars ? "" : live.reasoning ? " · 模型在思考" : " · 等模型开口…"), live.reasoning && /* @__PURE__ */ import_react10.default.createElement(Block, { label: "模型思考（实时）" }, /* @__PURE__ */ import_react10.default.createElement(Pre, { text: live.reasoning, follow: true })), /* @__PURE__ */ import_react10.default.createElement(Block, { label: "模型输出（实时）" }, /* @__PURE__ */ import_react10.default.createElement(Pre, { text: live.output, follow: true, cursor: true, empty: "还没有输出" }))), tab === "result" && (entry ? sprite ? /* @__PURE__ */ import_react10.default.createElement(SpritesView, { sprites: entry.sprites }) : acting ? /* @__PURE__ */ import_react10.default.createElement(ActingView, { acting: entry.acting }) : cg ? /* @__PURE__ */ import_react10.default.createElement(CgsView, { cgs: entry.cgs }) : /* @__PURE__ */ import_react10.default.createElement(ScriptView, { script: entry.script, units: entry.units || [] }) : /* @__PURE__ */ import_react10.default.createElement("div", { className: "fg-note" }, "读取中…")), tab === "raw" && (entry ? /* @__PURE__ */ import_react10.default.createElement(Attempts, { attempts: entry.attempts || [] }) : /* @__PURE__ */ import_react10.default.createElement("div", { className: "fg-note" }, "读取中…")), tab === "prompt" && (entry ? /* @__PURE__ */ import_react10.default.createElement(import_react10.default.Fragment, null, /* @__PURE__ */ import_react10.default.createElement(Block, { label: `系统提示词 · ${num((entry.system || "").length)} 字`, text: entry.system }, /* @__PURE__ */ import_react10.default.createElement(Pre, { text: entry.system })), /* @__PURE__ */ import_react10.default.createElement(Block, { label: `用户消息 · ${num((entry.user || "").length)} 字${sprite ? "（资料 + 全部剧情 + 角色档案 + 要画的差分）" : acting ? "（资料 + 全部剧情 + 角色档案 + 要设计的情绪）" : cg ? "（资料 + 此前的剧情 + 本轮正文 + 角色档案 + 要画的插画）" : "（资料 + 上一幕 + 角色档案 + 情绪库 + 本轮正文单元）"}`, text: entry.user }, /* @__PURE__ */ import_react10.default.createElement(Pre, { text: entry.user }))) : /* @__PURE__ */ import_react10.default.createElement("div", { className: "fg-note" }, "读取中…")));
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

// src/client/theater/Eros.jsx
var import_react11 = __toESM(require("react"), 1);
var still = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
var PUSH = { slow: 0.45, fast: 0.55, frantic: 0.7 };
function useErosPulse(cameraRef, on) {
  import_react11.default.useEffect(() => {
    if (!on || still()) return void 0;
    const moving = /* @__PURE__ */ new Set();
    const off = onErosBeat(({ in: delay, beat, pace }) => {
      const cam = cameraRef.current;
      const amp2 = PUSH[pace];
      if (!amp2 || !cam || typeof cam.animate !== "function") return;
      const move = cam.animate([
        { translate: "0 0" },
        { translate: `0 ${-amp2}%`, offset: 0.2, easing: "cubic-bezier(.3, 0, .3, 1)" },
        { translate: `0 ${(amp2 * 0.15).toFixed(3)}%`, offset: 0.58 },
        { translate: "0 0" }
      ], { duration: Math.min(beat * 0.9, 1e3), delay, easing: "cubic-bezier(.2, .6, .4, 1)" });
      moving.add(move);
      move.onfinish = () => moving.delete(move);
    });
    return () => {
      off();
      moving.forEach((m) => m.cancel());
    };
  }, [on]);
}
function ErosPeak({ beat, cameraRef, volume }) {
  const kind = beat.peak;
  import_react11.default.useEffect(() => {
    if (volume > 0) erosPeak(kind, volume);
    const cam = cameraRef && cameraRef.current;
    if (!cam || typeof cam.animate !== "function" || still()) return void 0;
    const moves = kind !== "cum" ? [cam.animate([{ scale: "1" }, { scale: "1.03", offset: 0.28 }, { scale: "1" }], { duration: 2600, easing: "cubic-bezier(.3, 0, .2, 1)" })] : EROS_PULSES.map((ms, i) => cam.animate([{ scale: "1" }, { scale: String(1.016 - i * 3e-3), offset: 0.2 }, { scale: "1" }], { duration: 360, delay: ms, easing: "ease-out" }));
    return () => moves.forEach((m) => m.cancel());
  }, []);
  return /* @__PURE__ */ import_react11.default.createElement("div", { className: `fg-peak is-${kind}`, "aria-hidden": "true" }, kind !== "climax" && EROS_PULSES.map((ms, i) => /* @__PURE__ */ import_react11.default.createElement("i", { key: ms, style: { "--at": ms + "ms", "--k": (1 - i * 0.2).toFixed(2) } })));
}

// src/client/theater/preload.js
var cache = /* @__PURE__ */ new Map();
function preloadImage(src) {
  if (!src) return Promise.resolve();
  let entry = cache.get(src);
  if (!entry) {
    entry = { ready: false };
    const img = new Image();
    img.decoding = "async";
    img.src = src;
    entry.img = img;
    entry.promise = (img.decode ? img.decode() : new Promise((ok, fail) => {
      img.onload = ok;
      img.onerror = fail;
    })).catch(() => {
    }).then(() => {
      entry.ready = true;
    });
    cache.set(src, entry);
    if (cache.size > 64) cache.delete(cache.keys().next().value);
  }
  return entry.promise;
}
function imageReady2(src) {
  return !src || Boolean(cache.get(src)?.ready);
}
function whenImageReady(src, ms) {
  if (imageReady2(src)) return Promise.resolve();
  return Promise.race([preloadImage(src), new Promise((ok) => setTimeout(ok, ms))]);
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
var TIME_FLOW = { slowmo: 0.12, timestop: 0 };
var SENSE_FLOW = { breath: 0.25 };
function senseLayer(beat, scene) {
  const sense = scene.sense && scene.sense !== "none" ? scene.sense : "";
  if (sense !== "ear") return sense;
  const who = beat && (beat.cast || []).find((c) => c.name === beat.speaker);
  return who && ["left", "farleft"].includes(who.pos) ? "ear-left" : "ear-right";
}
var BG_WAIT_MS = 1500;
var BG_AHEAD = 60;
var GLYPH_AHEAD = 12;
var GLYPH_WAIT = 1200;
var glyphsOf = (list2) => ({
  body: list2.map((b) => b.text).join(""),
  display: list2.map((b) => (b.alias || b.speaker) + b.scene.location + (b.card ? b.text : "") + (b.cut ? b.cut.text : "")).join("")
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
  const seen = import_react12.default.useRef({ gameId: "", turn: -1 });
  import_react12.default.useEffect(() => {
    if (!view || view.gameId !== gameId) return;
    if (seen.current.gameId !== gameId) {
      seen.current = { gameId, turn: maxTurn };
    }
    const isNew = maxTurn > seen.current.turn;
    seen.current.turn = Math.max(seen.current.turn, maxTurn);
    if (s.open || !isNew) return;
    if (s.resume && s.resume.gameId === gameId && maxTurn > s.resume.afterTurn || cfg && cfg.ui.autoOpen) openTheater(gameId, { turn: maxTurn });
  }, [view, maxTurn, s.open]);
  import_react12.default.useEffect(() => {
    if (!s.open) stopAll();
  }, [s.open]);
  if (!s.open) return null;
  return /* @__PURE__ */ import_react12.default.createElement(Theater, { key: s.gameId, gameId: s.gameId, view, viewError: error, cfg, startTurn: s.startTurn, panel: s.panel, panelArg: s.panelArg });
}
function Theater({ gameId, view, viewError, cfg, startTurn, panel: initialPanel, panelArg }) {
  const ui0 = cfg && cfg.ui || { skin: "stellar", textSpeed: 30, autoDelay: 1400, blip: true, bgm: true, bgmVolume: 0.45, particles: true, fontBase: "" };
  const { beats, byKey } = import_react12.default.useMemo(() => buildBeats(view), [view]);
  const [index, setIndex] = import_react12.default.useState(-1);
  const [title, setTitle] = import_react12.default.useState(startTurn == null && !initialPanel);
  const [panel, setPanel] = import_react12.default.useState(initialPanel || "");
  const [settingsTab, setSettingsTab] = import_react12.default.useState(initialPanel === "settings" && typeof panelArg === "string" ? panelArg : "look");
  const update = useUpdate(Boolean(cfg && cfg.ui.updateCheck));
  const [auto, setAuto] = import_react12.default.useState(false);
  const [skip, setSkip] = import_react12.default.useState(false);
  const [hidden, setHidden] = import_react12.default.useState(false);
  const [choosing, setChoosing] = import_react12.default.useState(false);
  const [closing, setClosing] = import_react12.default.useState(false);
  const closingRef = import_react12.default.useRef(false);
  import_react12.default.useEffect(() => () => stopAll(), []);
  const anchor = import_react12.default.useRef("");
  const rootRef = import_react12.default.useRef(null);
  const [glyphKey, setGlyphKey] = import_react12.default.useState("");
  const placed = import_react12.default.useRef(false);
  const waits = import_react12.default.useRef(0);
  import_react12.default.useEffect(() => {
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
  import_react12.default.useEffect(() => {
    if (!placed.current || !anchor.current) return;
    const i = byKey.get(anchor.current);
    if (i != null && i !== index) setIndex(i);
  }, [byKey]);
  const beat = index >= 0 ? beats[index] : null;
  const speed = skip ? 0 : ui0.textSpeed;
  const cgOn = beat && !title && beat.cg && cgSrc(beat.cg, assetUrl) ? beat.cg.id : "";
  const shownRef = import_react12.default.useRef({ key: "", beat: null, was: null, cg: "", place: "", mode: "", hold: { ms: 0, away: false } });
  const jumpRef = import_react12.default.useRef("");
  if (beat && shownRef.current.key !== beat.key) {
    const was2 = shownRef.current;
    const jumped = Boolean(was2.key) && jumpRef.current === beat.key;
    const prev = jumped ? beats[index - 1] : null;
    const from = !jumped ? was2 : prev ? { key: prev.key, cg: prev.cg && cgSrc(prev.cg, assetUrl) ? prev.cg.id : "", place: prev.scene.location, mode: prev.mode } : { key: was2.key };
    jumpRef.current = "";
    shownRef.current = { key: beat.key, visit: (was2.visit || 0) + 1, beat, was: was2.beat, cg: cgOn, place: beat.scene.location, mode: beat.mode, hold: beatHold(beat, { cg: cgOn, was: from, eros: ui0.eros !== false, opening: !was2.key, shown: jumped ? was2 : null }) };
  } else if (shownRef.current.cg !== cgOn) shownRef.current = { ...shownRef.current, cg: cgOn };
  const hold = beat && !title && shownRef.current.key === beat.key ? shownRef.current.hold : { ms: 0, away: false };
  const visit = beat ? `${beat.key}#${shownRef.current.visit}` : "";
  const recallStyle = ui0.recall || "text";
  const recallTone = ui0.recallTone && ui0.recallTone !== "auto" ? ui0.recallTone : "";
  const edgeMs = !beat || title ? 0 : beat.cut && !hold.change ? CUT_MS : beat.transition === "haze" ? HAZE_MS : recallStyle === "ghost" ? RECALL_HOLD_MS[beat.recallEdge] || 0 : 0;
  const pauseMs = speed > 0 ? Math.max(edgeMs, hold.ms) : 0;
  const [pauseSeen, setPauseSeen] = import_react12.default.useState("");
  const pausing = pauseMs > 0 && pauseSeen !== visit;
  const change = pausing && hold.change ? hold.change : null;
  const [changeAt, setChangeAt] = import_react12.default.useState({ key: "", phase: "" });
  import_react12.default.useEffect(() => {
    if (!change) return void 0;
    const key = visit;
    const bg = backgroundFor(beat.scene, view).src;
    let live = true, timer = 0, i = 0;
    const t0 = performance.now();
    const next = () => {
      if (!live) return;
      if (i >= change.steps.length) {
        timer = setTimeout(() => {
          if (live) setPauseSeen(key);
        }, Math.max(0, pauseMs - (performance.now() - t0)));
        return;
      }
      const [phase2, at2] = change.steps[i];
      const end = i + 1 < change.steps.length ? change.steps[i + 1][1] : change.total;
      i += 1;
      const run = () => {
        if (!live) return;
        setChangeAt({ key, phase: phase2 });
        timer = setTimeout(next, end - at2);
      };
      if (phase2 === "down") whenImageReady(bg, BG_WAIT_MS).then(run);
      else run();
    };
    preloadImage(bg);
    next();
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [change, visit]);
  const phase = !change ? "" : changeAt.key === visit ? changeAt.phase : change.steps[0][0];
  const swapped = !change || (change.steps.find(([name2]) => name2 === phase) || [, 0])[1] >= change.swap;
  const coverState = !change ? "off" : phase === "clear" ? "idle" : phase === "up" ? "up" : phase === "hold" ? "full" : phase === "down" ? "down" : "off";
  const clearing = Boolean(change && change.clear && ["clear", "up", "hold", "down"].includes(phase));
  import_react12.default.useEffect(() => {
    if (!pausing || hold.change) return void 0;
    const t = setTimeout(() => setPauseSeen(visit), pauseMs);
    return () => clearTimeout(t);
  }, [pausing, visit]);
  const cutOn = Boolean(change && change.cut && phase === "hold");
  const cutShown = import_react12.default.useRef("");
  if (cutOn) cutShown.current = visit;
  const holdText = Boolean(beat) && glyphKey !== beat.key || pausing;
  const [wokeKey, setWokeKey] = import_react12.default.useState("");
  const waking = pausing && Boolean(hold.wake) && Boolean(shownRef.current.was) && wokeKey !== visit;
  import_react12.default.useEffect(() => {
    if (!waking) return void 0;
    const t = setTimeout(() => setWokeKey(visit), WAKE_SWAP_MS);
    return () => clearTimeout(t);
  }, [waking, visit]);
  const typeSpeed = title ? 0 : speed;
  const blipOn = Boolean(ui0.blip) && !skip && !title;
  const sfxOn = ui0.sfx !== false && !skip && !title;
  import_react12.default.useEffect(() => {
    configureSounds(cfg && cfg.ui);
  }, [cfg]);
  const stageRef = import_react12.default.useRef(null);
  const flashRef = import_react12.default.useRef(null);
  const hit = useHits(stageRef, flashRef, sfxOn);
  const people = import_react12.default.useMemo(() => new Map((view && view.cast || []).map((p4) => [p4.name, p4])), [view]);
  const voices = import_react12.default.useMemo(() => castVoices(view && view.cast || [], ui0), [view, ui0]);
  const voice = import_react12.default.useMemo(() => {
    if (!beat) return null;
    const names = beat.speakers || [beat.speaker];
    const main = lineVoice(beat.type, names[0], voices, ui0);
    if (!main || !beat.voice) return main;
    const also = beat.voice === "chorus" ? names.slice(1).map((name2) => lineVoice(beat.type, name2, voices, ui0)).filter(Boolean) : [];
    const tone = beat.recall ? recallTone || beat.recall.tone : "";
    return { ...main, style: beat.voice, ...also.length ? { also } : {}, ...tone ? { tone } : {} };
  }, [beat && beat.type, beat && beat.speaker, beat && beat.voice, beat && beat.recall, recallTone, voices, ui0]);
  const [done, chars, finish, typedAt, typed] = useTypewriter(beat, typeSpeed, { sound: blipOn, voice, hold: holdText, onFx: title ? null : hit });
  import_react12.default.useEffect(() => {
    if (panel && !done) finish();
  }, [panel, done]);
  const talk = import_react12.default.useMemo(() => beat ? { key: beat.key, type: beat.type, chars, times: typed.times, gap: typed.gap, mouth: typed.mouth, marks: typed.marks, speed: typeSpeed, startedAt: typedAt, done } : null, [beat, chars, typed, typeSpeed, typedAt, done]);
  import_react12.default.useEffect(() => {
    if (beat && beat.cam === "whip" && !title && sfxOn) stinger("whoosh");
  }, [beat && beat.key]);
  const cameraRef = import_react12.default.useRef(null);
  const cam = useCamera(title ? null : beat, cameraRef);
  const atEnd = beat && index === beats.length - 1;
  import_react12.default.useEffect(() => {
    loadSkinFonts(ui0.skin, ui0.fontBase);
  }, [ui0.skin, ui0.fontBase]);
  import_react12.default.useEffect(() => {
    if (!beat) return void 0;
    let live = true;
    loadSkinFonts(ui0.skin, ui0.fontBase).then(() => loadGlyphs(rootRef.current, glyphsOf([beat]), GLYPH_WAIT)).then(() => {
      if (live) setGlyphKey(beat.key);
    });
    return () => {
      live = false;
    };
  }, [beat && beat.key, ui0.skin, ui0.fontBase]);
  import_react12.default.useEffect(() => {
    if (index < 0) return;
    loadSkinFonts(ui0.skin, ui0.fontBase).then(() => loadGlyphs(rootRef.current, glyphsOf(beats.slice(index + 1, index + 1 + GLYPH_AHEAD))));
  }, [index, beats, ui0.skin, ui0.fontBase]);
  import_react12.default.useEffect(() => {
    if (index < 0 || !view) return;
    const seen = /* @__PURE__ */ new Set();
    for (const b of beats.slice(index, index + BG_AHEAD)) {
      const src = backgroundFor(b.scene, view).src;
      if (!src || seen.has(src)) continue;
      seen.add(src);
      preloadImage(src);
      if (seen.size >= 4) break;
    }
  }, [index, beats, view]);
  const scene = beat ? beat.scene : (beats[beats.length - 1] || {}).scene;
  const tracks = useMusic();
  const was = shownRef.current.was;
  const restartMusic = Boolean(change && was && ui0.bgm) && (pickTrack(beat, tracks, assetUrl) || {}).id !== (pickTrack(was, tracks, assetUrl) || {}).id;
  const silent = restartMusic && ["clear", "up", "hold"].includes(phase);
  const musicBeat = waking || silent ? null : beat;
  const track = import_react12.default.useMemo(() => ui0.bgm ? pickTrack(musicBeat, tracks, assetUrl) : null, [ui0.bgm, tracks, musicBeat && musicBeat.bgm, scene && scene.mood, scene && scene.location]);
  import_react12.default.useEffect(() => {
    if (!closingRef.current && (track || !ui0.bgm || waking || silent)) playBgm(track, ui0.bgmVolume);
  }, [track && track.id, ui0.bgm, ui0.bgmVolume]);
  const hushed = Boolean(musicBeat && musicBeat.hush);
  import_react12.default.useEffect(() => {
    if (!closingRef.current) hushBgm(hushed);
  }, [hushed]);
  const soundlib = useSoundlib();
  const soundById = import_react12.default.useMemo(() => new Map((soundlib || []).map((s) => [s.id, s])), [soundlib]);
  const soundBeat = waking ? null : change && !swapped && was ? was : beat;
  const ambId = ui0.amb !== false && soundBeat && soundBeat.amb !== "none" ? soundBeat.amb : "";
  const ambSound = ambId && soundById.get(ambId) || null;
  import_react12.default.useEffect(() => {
    if (closingRef.current) return;
    playAmbience(ambSound ? { id: ambSound.id, url: assetUrl(ambSound.assetId) } : null, (ui0.ambVolume ?? 0.35) * (ambSound ? ambSound.volume ?? 1 : 1));
  }, [ambSound && ambSound.id, ambSound && ambSound.volume, ui0.ambVolume]);
  const sfxKey = beat && beat.sfx && !holdText ? beat.key : "";
  import_react12.default.useEffect(() => {
    if (!sfxKey || title || skip || ui0.storySfx === false) return;
    const sound = soundById.get(beat.sfx);
    if (sound) playLibSound(sound.assetId, (ui0.storySfxVolume ?? 0.8) * (sound.volume ?? 1));
    else if (ONOMATOPOEIA[beat.sfx]) storyFoley(ONOMATOPOEIA[beat.sfx].id, (ui0.storySfxVolume ?? 0.8) / 0.8);
    else if (EROS_SFX[beat.sfx] && ui0.eros !== false) erosFoley(EROS_SFX[beat.sfx].id, (ui0.storySfxVolume ?? 0.8) / 0.8);
  }, [sfxKey]);
  const erosOn = ui0.eros !== false && ui0.storySfx !== false && !skip && !title;
  const erosVolume = (ui0.storySfxVolume ?? 0.8) / 0.8;
  const bedScene = erosOn && soundBeat ? soundBeat.scene : null;
  const bedPace = bedScene && bedScene.eros !== "none" ? bedScene.eros || "" : "";
  const bedTentacle = bedScene && bedScene.tentacle !== "none" ? bedScene.tentacle || "" : "";
  import_react12.default.useEffect(() => {
    if (closingRef.current) return;
    if (bedPace || bedTentacle) playEros(bedPace, bedTentacle, erosVolume);
    else stopEros();
  }, [bedPace, bedTentacle, erosVolume]);
  useErosPulse(cameraRef, Boolean(bedPace));
  const go = import_react12.default.useCallback((i) => {
    if (!beats.length) return;
    const next = Math.max(0, Math.min(beats.length - 1, i));
    anchor.current = beats[next].key;
    writePos(gameId, beats[next].key);
    setIndex(next);
  }, [beats, gameId]);
  const advance = import_react12.default.useCallback(() => {
    if (!beat) return;
    if (pausing) {
      if (!change) setPauseSeen(visit);
      return;
    }
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
  }, [beat, done, atEnd, index, go, finish, pausing, change, visit]);
  import_react12.default.useEffect(() => {
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
  const prevLen = import_react12.default.useRef(beats.length);
  import_react12.default.useEffect(() => {
    if (beats.length > prevLen.current && choosing && index === prevLen.current - 1) {
      setChoosing(false);
      go(index + 1);
    }
    prevLen.current = beats.length;
  }, [beats.length]);
  const close = import_react12.default.useCallback(() => {
    setClosing(true);
    closingRef.current = true;
    stopAll();
    setTimeout(() => ui.set({ open: false }), 320);
  }, []);
  const choose = (text) => {
    const ok = fillComposer(text);
    toast(ok ? "已填进输入框，发送后剧场会自动接着演" : "已复制到剪贴板，粘贴到输入框发送即可");
    ui.set({ resume: { gameId, afterTurn: beat ? beat.turn : -1 } });
    setChoosing(false);
    close();
  };
  import_react12.default.useEffect(() => {
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
  const speakerPerson = beat && people.get((beat.speakers || [beat.speaker])[0]);
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
  const before = Boolean(change && !swapped && was);
  const stageBeat = waking || before ? was : beat || (beats.length ? beats[beats.length - 1] : null);
  const hud = waking || before ? stageBeat : beat;
  const covered = Boolean(change && change.cover && change.cover !== "swirl" && phase === "hold");
  const stageTr = stageBeat && hold.wake && !waking && stageBeat === beat ? "wake" : change && change.cover && change.cover !== "swirl" ? "none" : stageBeat && stageBeat.transition;
  const stageScene = stageBeat ? stageBeat.scene : { location: "", time: "night", weather: "stars", mood: "calm", light: "normal", fx: "none" };
  const stageMode = stageBeat && stageBeat.mode || "";
  const romance = stageScene.romance && stageScene.romance !== "none" ? stageScene.romance : "";
  const sense = stageScene.sense && stageScene.sense !== "none" ? stageScene.sense : "";
  const atmosphere = Boolean(stageBeat) && !title;
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
  return /* @__PURE__ */ import_react12.default.createElement("div", { ref: rootRef, className: `fg-theater${closing ? " is-closing" : ""}${hidden ? " fg-ui-hidden" : ""}`, "data-skin": ui0.skin, style: { "--stage-ar": stageRatio(cfg) }, role: "dialog", "aria-label": "FlowGal 剧场" }, /* @__PURE__ */ import_react12.default.createElement(
    "div",
    {
      className: "fg-stage",
      ref: stageRef,
      "data-change": phase || void 0,
      "data-clearing": clearing ? "" : void 0,
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
    /* @__PURE__ */ import_react12.default.createElement("div", { className: "fg-camera", ref: cameraRef, "data-cam": cam.kind || void 0, style: cam.style || void 0 }, /* @__PURE__ */ import_react12.default.createElement("div", { className: "fg-world", "data-fx": atmosphere ? stageScene.fx : "" }, /* @__PURE__ */ import_react12.default.createElement(
      "div",
      {
        className: "fg-world-in",
        "data-mode": atmosphere ? stageMode : "",
        "data-tr": stageTr === "haze" || stageTr === "wake" ? stageTr : void 0,
        "data-romance": atmosphere && romance ? romance : void 0,
        "data-sense": atmosphere && sense ? sense : void 0
      },
      /* @__PURE__ */ import_react12.default.createElement(Backdrop, { scene: stageScene, view, transition: stageTr || "dissolve" }),
      /* @__PURE__ */ import_react12.default.createElement("div", { className: `fg-grade${backgroundFor(stageScene, view).src ? " is-drawn" : ""}`, "data-time": stageScene.time }),
      beat && !title && beat.moment && beat.moment.kind === "fireworks" && /* @__PURE__ */ import_react12.default.createElement(Fireworks, { key: beat.key, sound: sfxOn }),
      stageBeat && /* @__PURE__ */ import_react12.default.createElement(Cast, { beat: title || stageBeat.recall || waking ? { ...stageBeat, speaker: "", speakers: null, sym: "" } : stageBeat, view, talk: title || stageBeat.recall || waking ? null : talk, max: ui0.maxOnStage ?? 5 }),
      /* @__PURE__ */ import_react12.default.createElement(FadeLayer, { name: "tone", value: atmosphere && stageScene.mood !== "daily" ? stageScene.mood : "", ms: 1600, cut: covered }),
      /* @__PURE__ */ import_react12.default.createElement(FadeLayer, { name: "light", value: atmosphere && stageScene.light !== "normal" ? stageScene.light : "", ms: 700, cut: covered }),
      /* @__PURE__ */ import_react12.default.createElement(FadeLayer, { name: "romance", value: atmosphere ? romance : "", ms: 1600, cut: covered }),
      /* @__PURE__ */ import_react12.default.createElement(FadeLayer, { name: "eros", value: atmosphere && ui0.eros !== false && stageScene.eros !== "none" ? stageScene.eros || "" : "", ms: 1400, cut: covered }),
      /* @__PURE__ */ import_react12.default.createElement(FadeLayer, { name: "tentacle", value: atmosphere && ui0.eros !== false && stageScene.tentacle !== "none" ? stageScene.tentacle || "" : "", ms: 1800, cut: covered }),
      stageBeat && !title && /* @__PURE__ */ import_react12.default.createElement(CgLayer, { beat: stageBeat, sound: sfxOn }),
      /* @__PURE__ */ import_react12.default.createElement(Particles, { weather: stageScene.weather, enabled: ui0.particles !== false, speed: atmosphere ? (TIME_FLOW[stageScene.fx] ?? 1) * (SENSE_FLOW[sense] ?? 1) : 1 }),
      stageBeat && !title && /* @__PURE__ */ import_react12.default.createElement(SplitPanel, { beat: stageBeat, view, talk }),
      stageBeat && !title && /* @__PURE__ */ import_react12.default.createElement(RecallLayer, { beat: stageBeat, view, talk, light: recallStyle !== "ghost", tone: recallTone }),
      /* @__PURE__ */ import_react12.default.createElement(FadeLayer, { name: "fxlayer", value: atmosphere && stageScene.fx !== "none" ? stageScene.fx : "", ms: 900, cut: covered }),
      /* @__PURE__ */ import_react12.default.createElement("div", { className: "fg-vignette" })
    ))),
    /* @__PURE__ */ import_react12.default.createElement(FadeLayer, { name: "sense", value: atmosphere ? senseLayer(stageBeat, stageScene) : "", ms: sense === "blind" ? 1400 : 900, cut: covered }),
    /* @__PURE__ */ import_react12.default.createElement("div", { className: "fg-bars", "data-on": atmosphere && stageScene.bars === "on" ? "" : void 0, "aria-hidden": "true" }),
    /* @__PURE__ */ import_react12.default.createElement(FadeLayer, { name: "mode", value: atmosphere ? stageMode : "", ms: stageTr === "wake" ? 200 : stageTr === "haze" ? 2400 : 1200, cut: covered }),
    beat && !title && /* @__PURE__ */ import_react12.default.createElement(SceneCover, { key: beat.key, plan: hold.change, state: coverState }),
    beat && !title && /* @__PURE__ */ import_react12.default.createElement(Flash, { beat, recallStyle, tone: recallTone, wake: Boolean(hold.wake) && speed > 0, rising: waking, changed: Boolean(hold.change) }),
    /* @__PURE__ */ import_react12.default.createElement("div", { className: "fg-hitflash", ref: flashRef, "aria-hidden": "true" }),
    beat && !title && !skip && !change && beat.peak && ui0.eros !== false && /* @__PURE__ */ import_react12.default.createElement(ErosPeak, { key: beat.key, beat, cameraRef, volume: ui0.storySfx !== false ? erosVolume : 0 }),
    beat && !title && beat.hit && /* @__PURE__ */ import_react12.default.createElement(HitImpact, { key: beat.key, beat, sound: sfxOn, fx: hit }),
    beat && !title && beat.moment && /* @__PURE__ */ import_react12.default.createElement(MomentLayer, { key: beat.key, beat, view, sound: sfxOn }),
    beat && !title && beat.call && beat.call.state === "ringing" && /* @__PURE__ */ import_react12.default.createElement(PhoneRing, { key: beat.call.id, beat, view, sound: sfxOn }),
    beat && !title && beat.call && beat.call.state === "live" && beat.call.video && !(beat.split && beat.split.who.includes(beat.call.who)) && /* @__PURE__ */ import_react12.default.createElement(VideoPip, { key: beat.call.id, beat, view }),
    beat && !title && beat.phone && beat.phone.kind === "end" && /* @__PURE__ */ import_react12.default.createElement(PhoneEnd, { key: beat.key, beat, view, sound: sfxOn }),
    beat && !title && beat.phone && (beat.phone.kind === "notify" || beat.phone.kind === "voicemail") && /* @__PURE__ */ import_react12.default.createElement(PhoneBanner, { key: beat.key, beat, view, sound: sfxOn }),
    !panel && /* @__PURE__ */ import_react12.default.createElement(RestartNotice, { floating: true }),
    beat && !title && (!change || phase === "cast" || phase === "settle") && /* @__PURE__ */ import_react12.default.createElement(TitleCard, { beat, delay: speed > 0 ? beat.cut && !hold.change ? CUT_MS : hold.wake ? WAKE_SWAP_MS + 300 : 0 : 0 }),
    beat && !title && beat.cut && speed > 0 && cutShown.current === visit && /* @__PURE__ */ import_react12.default.createElement(CutCard, { beat, out: !cutOn }),
    !title && beat && /* @__PURE__ */ import_react12.default.createElement("div", { className: "fg-hud" }, /* @__PURE__ */ import_react12.default.createElement("div", { className: "fg-hud-bar" }), /* @__PURE__ */ import_react12.default.createElement("div", null, /* @__PURE__ */ import_react12.default.createElement("div", { className: "fg-hud-place" }, hud.scene.location || `第 ${hud.turn} 轮`), /* @__PURE__ */ import_react12.default.createElement("div", { className: "fg-hud-meta" }, hud.mode && /* @__PURE__ */ import_react12.default.createElement("span", { className: "fg-hud-mode" }, MODE_LABEL[hud.mode]), /* @__PURE__ */ import_react12.default.createElement("span", null, TIME_LABEL[hud.scene.time] || ""), hud.scene.weather && hud.scene.weather !== "clear" && /* @__PURE__ */ import_react12.default.createElement("span", null, WEATHER_LABEL[hud.scene.weather]), LIGHT_LABEL[hud.scene.light] && /* @__PURE__ */ import_react12.default.createElement("span", null, LIGHT_LABEL[hud.scene.light]), FX_LABEL[hud.scene.fx] && /* @__PURE__ */ import_react12.default.createElement("span", null, FX_LABEL[hud.scene.fx]), ROMANCE_LABEL[hud.scene.romance] && /* @__PURE__ */ import_react12.default.createElement("span", { className: "fg-hud-romance" }, "♡ ", ROMANCE_LABEL[hud.scene.romance]), SENSE_LABEL[hud.scene.sense] && /* @__PURE__ */ import_react12.default.createElement("span", { className: "fg-hud-sense" }, SENSE_LABEL[hud.scene.sense]), hud.scene.mood && /* @__PURE__ */ import_react12.default.createElement("span", null, "♪ ", MOOD_LABEL[hud.scene.mood])))),
    !title && /* @__PURE__ */ import_react12.default.createElement("div", { className: "fg-topright", onClick: (e) => e.stopPropagation() }, directing && /* @__PURE__ */ import_react12.default.createElement("button", { type: "button", className: "fg-pill is-busy is-link", title: "看导演正在写什么", onClick: () => setPanel("director") }, "导演整理中 ›"), drawing > 0 && /* @__PURE__ */ import_react12.default.createElement("span", { className: "fg-pill is-busy" }, "出图 ", drawing), beat && beat.call && beat.call.state === "live" && /* @__PURE__ */ import_react12.default.createElement(CallChip, { key: beat.call.id, call: beat.call, sound: sfxOn }), track && /* @__PURE__ */ import_react12.default.createElement("span", { className: "fg-pill" + (hushed ? " is-hushed" : ""), title: hushed ? `${track.name}（留白，一会儿回来）` : track.name }, "♪ ", track.name), viewError && /* @__PURE__ */ import_react12.default.createElement("span", { className: "fg-pill fg-err", title: viewError }, "连接中断，重连中"), /* @__PURE__ */ import_react12.default.createElement("button", { type: "button", className: "fg-iconbtn", title: "回到聊天（Esc）", onClick: close }, "✕")),
    beat && !title && beat.card && /* @__PURE__ */ import_react12.default.createElement(SceneCard, { beat }),
    beat && !title && /* @__PURE__ */ import_react12.default.createElement(
      DialogBox,
      {
        beat,
        chars,
        plan: typed,
        done,
        waiting: holdText,
        away: pausing && hold.away,
        color,
        quick,
        progress: progressInTurn,
        status,
        hiddenText: Boolean(beat.card),
        recall: beat.recall ? { tone: recallTone || beat.recall.tone, name: ui0.recallName || "blur" } : null,
        face: recallStyle === "portrait" && beat.recall ? /* @__PURE__ */ import_react12.default.createElement(RecallFace, { beat, view, tone: recallTone }) : null
      }
    ),
    !beat && !title && /* @__PURE__ */ import_react12.default.createElement("div", { className: "fg-choices" }, /* @__PURE__ */ import_react12.default.createElement("div", { className: "fg-choices-title" }, view ? "这一局还没有可以演的内容" : "读取中")),
    choosing && beat && /* @__PURE__ */ import_react12.default.createElement(Choices, { choices: beat.choices, waiting: directing, onChoose: choose, onBack: close }),
    title && /* @__PURE__ */ import_react12.default.createElement("div", { className: "fg-title", onClick: (e) => e.stopPropagation() }, /* @__PURE__ */ import_react12.default.createElement("div", { className: "fg-title-kicker" }, "FlowGal · ", hostName() === "st" ? "SillyTavern" : "DSH Tavern"), /* @__PURE__ */ import_react12.default.createElement("div", { className: "fg-title-logo" }, cardTitle), /* @__PURE__ */ import_react12.default.createElement("div", { className: "fg-title-sub" }, latest ? `第 ${latest.turn} 轮 · ${latest.scene.location || "—"} · ${TIME_LABEL[latest.scene.time] || ""}` : gameId ? "开场白还没有整理" : "先在聊天里打开一局"), /* @__PURE__ */ import_react12.default.createElement("div", { className: "fg-title-menu" }, titleMenu.map((m, i) => /* @__PURE__ */ import_react12.default.createElement("button", { key: m.id, type: "button", className: m.badge ? "is-new" : void 0, style: { "--i": i }, onMouseEnter: () => sfx("hover"), onClick: () => {
      sfx("select");
      m.run();
    } }, m.label, /* @__PURE__ */ import_react12.default.createElement("span", null, m.en)))), /* @__PURE__ */ import_react12.default.createElement("div", { className: "fg-title-foot" }, "FlowGal · 字体 思源 / 霞鹜文楷 / 马善政 / Cormorant（SIL OFL）")),
    panel === "log" && /* @__PURE__ */ import_react12.default.createElement(Backlog, { beats, index, gameId, onClose: () => setPanel(""), onJump: (i) => {
      const key = (beats[i] || {}).key || "";
      jumpRef.current = key !== shownRef.current.key ? key : "";
      go(i);
      setPanel("");
      setTitle(false);
      setChoosing(false);
    } }),
    panel === "gallery" && /* @__PURE__ */ import_react12.default.createElement(Gallery, { view, gameId, focusId: panelArg, onClose: () => setPanel("") }),
    panel === "cast" && /* @__PURE__ */ import_react12.default.createElement(CastPanel, { view, gameId, onClose: () => setPanel("") }),
    panel === "director" && /* @__PURE__ */ import_react12.default.createElement(DirectorLog, { gameId, focusTurn: panelArg, onClose: () => setPanel("") }),
    panel === "settings" && /* @__PURE__ */ import_react12.default.createElement(Settings, { initialTab: settingsTab, onClose: () => setPanel(""), onDirectorLog: gameId ? () => setPanel("director") : null })
  ));
}
function Toast() {
  const s = useUi();
  if (!s.toast) return null;
  return /* @__PURE__ */ import_react12.default.createElement("div", { className: `fg-toast${s.toast.tone === "error" ? " is-error" : ""}`, key: s.toast.at }, s.toast.text);
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
  return /* @__PURE__ */ import_react13.default.createElement(import_react13.default.Fragment, null, /* @__PURE__ */ import_react13.default.createElement(TheaterRoot, null), /* @__PURE__ */ import_react13.default.createElement(Toast, null));
}
function UpdateLine() {
  const u = useUpdate();
  const text = !u ? "" : !u.managed ? "" : u.restartRequired ? "新版本已下载，重启 DSH 后生效" : updateAvailable(u) ? `有新版本（${u.last.commits.length || u.last.behind} 个更新）` : "";
  return /* @__PURE__ */ import_react13.default.createElement("div", { className: "fg-settings-row" }, /* @__PURE__ */ import_react13.default.createElement("span", { style: { opacity: 0.7 } }, "v", "0.2.0", u && u.managed ? ` · ${u.current.sha}` : ""), text && /* @__PURE__ */ import_react13.default.createElement("span", { style: { color: "#d9822b" } }, "● ", text), hostName() === "st" ? /* @__PURE__ */ import_react13.default.createElement("span", { style: { opacity: 0.7 } }, "更新：酒馆「扩展 → 管理扩展」里点 FlowGal 的更新") : /* @__PURE__ */ import_react13.default.createElement("button", { type: "button", className: "fg-ghost", onClick: () => openTheater("", { panel: "settings", panelArg: "about" }) }, "版本与更新"));
}
function SettingsSection() {
  const data = useConfig();
  if (!data) return /* @__PURE__ */ import_react13.default.createElement("div", { className: "fg-settings-card" }, "读取中…");
  const cfg = data.config;
  const toggle = (section, key) => patchConfig(section ? { [section]: { [key]: !cfg[section][key] } } : { [key]: !cfg[key] }).catch((e) => toast(e.message, "error"));
  const box = { display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer" };
  return /* @__PURE__ */ import_react13.default.createElement("div", { className: "fg-settings-card" }, /* @__PURE__ */ import_react13.default.createElement("h3", null, "🎬 FlowGal ", /* @__PURE__ */ import_react13.default.createElement("span", { style: { fontSize: 12, opacity: 0.6, fontWeight: 400 } }, "v", "0.2.0")), /* @__PURE__ */ import_react13.default.createElement("p", null, "正文照常流式输出；每轮写完后，后台导演把它整理成视觉小说场景（说话人、表情、站位、镜头、天气、选项），并按柏宝绘的方式自动配插画、背景和立绘。打开剧场就能当 galgame 看。"), /* @__PURE__ */ import_react13.default.createElement("div", { className: "fg-settings-row" }, /* @__PURE__ */ import_react13.default.createElement("label", { style: box }, /* @__PURE__ */ import_react13.default.createElement("input", { type: "checkbox", checked: cfg.enabled, onChange: () => toggle("", "enabled") }), "启用"), /* @__PURE__ */ import_react13.default.createElement("label", { style: box }, /* @__PURE__ */ import_react13.default.createElement("input", { type: "checkbox", checked: cfg.director.auto, onChange: () => toggle("director", "auto") }), "每轮自动整理"), /* @__PURE__ */ import_react13.default.createElement("label", { style: box }, /* @__PURE__ */ import_react13.default.createElement("input", { type: "checkbox", checked: cfg.images.auto, onChange: () => toggle("images", "auto") }), "自动配图"), /* @__PURE__ */ import_react13.default.createElement("label", { style: box }, /* @__PURE__ */ import_react13.default.createElement("input", { type: "checkbox", checked: cfg.ui.autoOpen, onChange: () => toggle("ui", "autoOpen") }), "写完自动打开剧场")), /* @__PURE__ */ import_react13.default.createElement("div", { className: "fg-settings-row" }, /* @__PURE__ */ import_react13.default.createElement("span", { style: { color: data.ready ? "#4caf7a" : "#d9822b" } }, data.ready ? "● 生图已就绪" : "● " + data.readyReason), /* @__PURE__ */ import_react13.default.createElement("button", { type: "button", className: "fg-play", onClick: () => openTheater("", { panel: "settings" }) }, "打开完整设置")), /* @__PURE__ */ import_react13.default.createElement(UpdateLine, null));
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
var import_react14 = __toESM(require("react"), 1);
var CLOCK = { dawn: "05:40", morning: "07:30", noon: "12:00", afternoon: "15:20", dusk: "17:50", evening: "19:30", night: "22:10", midnight: "00:40" };
var TIME_TINT = { dawn: "#9a5c8f", morning: "#5aa6e8", noon: "#3e8fe0", afternoon: "#c58b4a", dusk: "#b14f6e", evening: "#4f2f78", night: "#121a44", midnight: "#070b24" };
function SceneCardInline({ item, gameId, turn }) {
  rememberGame2(gameId);
  const [busy, setBusy] = import_react14.default.useState(false);
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
  const [filling, setFilling] = import_react14.default.useState(false);
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
  return /* @__PURE__ */ import_react14.default.createElement("div", { className: "fg-chat" }, /* @__PURE__ */ import_react14.default.createElement("div", { className: `fg-scene${pending ? " is-pending" : ""}` }, /* @__PURE__ */ import_react14.default.createElement("div", { className: "fg-scene-bg", style: { backgroundImage: `linear-gradient(135deg, ${TIME_TINT[data.time] || "#2a2350"}, #0d0b1c)` } }), /* @__PURE__ */ import_react14.default.createElement("div", { className: "fg-scene-clock" }, /* @__PURE__ */ import_react14.default.createElement("b", null, CLOCK[data.time] || "--:--"), /* @__PURE__ */ import_react14.default.createElement("span", null, data.time ? TIME_LABEL[data.time] || data.time : "scene")), /* @__PURE__ */ import_react14.default.createElement("div", { className: "fg-scene-main" }, pending ? /* @__PURE__ */ import_react14.default.createElement(import_react14.default.Fragment, null, /* @__PURE__ */ import_react14.default.createElement("div", { className: "fg-scene-loc" }, /* @__PURE__ */ import_react14.default.createElement("span", { className: "fg-dots" }, "导演正在整理这一幕")), /* @__PURE__ */ import_react14.default.createElement("div", { className: "fg-scene-sum" }, "正文已经可以读了。说话人、表情、站位、镜头和插画在后台排，整理好后剧场里会自动更新。"), /* @__PURE__ */ import_react14.default.createElement("div", { className: "fg-scene-actions" }, /* @__PURE__ */ import_react14.default.createElement("button", { type: "button", className: "fg-play", onClick: () => openTheater(gameId, { turn: t }) }, "先看起来"), /* @__PURE__ */ import_react14.default.createElement("button", { type: "button", className: "fg-ghost", onClick: () => openTheater(gameId, { panel: "director", panelArg: t }) }, "看导演在写什么"))) : data.error ? /* @__PURE__ */ import_react14.default.createElement(import_react14.default.Fragment, null, /* @__PURE__ */ import_react14.default.createElement("div", { className: "fg-scene-loc" }, "这一幕没整理好"), /* @__PURE__ */ import_react14.default.createElement("div", { className: "fg-scene-err" }, String(data.error).slice(0, 160)), /* @__PURE__ */ import_react14.default.createElement("div", { className: "fg-scene-actions" }, /* @__PURE__ */ import_react14.default.createElement("button", { type: "button", className: "fg-play", onClick: () => openTheater(gameId, { turn: t }) }, "照原文演"), /* @__PURE__ */ import_react14.default.createElement("button", { type: "button", className: "fg-ghost", disabled: busy, onClick: retry }, busy ? "整理中…" : "重试"), /* @__PURE__ */ import_react14.default.createElement("button", { type: "button", className: "fg-ghost", onClick: () => openTheater(gameId, { panel: "director", panelArg: t }) }, "导演日志"))) : /* @__PURE__ */ import_react14.default.createElement(import_react14.default.Fragment, null, /* @__PURE__ */ import_react14.default.createElement("div", { className: "fg-scene-loc" }, data.location || `第 ${t} 轮`), /* @__PURE__ */ import_react14.default.createElement("div", { className: "fg-scene-chips" }, data.weather && data.weather !== "clear" && /* @__PURE__ */ import_react14.default.createElement("span", { className: "fg-chip" }, WEATHER_LABEL[data.weather] || data.weather), data.mood && /* @__PURE__ */ import_react14.default.createElement("span", { className: "fg-chip" }, "♪ ", MOOD_LABEL[data.mood] || data.mood), (data.cast || []).map((n) => /* @__PURE__ */ import_react14.default.createElement("span", { key: n, className: "fg-chip", style: { "--c": nameColor(n) } }, /* @__PURE__ */ import_react14.default.createElement("i", null), n)), data.choices > 0 && /* @__PURE__ */ import_react14.default.createElement("span", { className: "fg-chip" }, "◆ ", data.choices, " 个选项")), data.summary && /* @__PURE__ */ import_react14.default.createElement("div", { className: "fg-scene-sum" }, data.summary), /* @__PURE__ */ import_react14.default.createElement("div", { className: "fg-scene-actions" }, /* @__PURE__ */ import_react14.default.createElement("button", { type: "button", className: "fg-play", onClick: () => openTheater(gameId, { turn: t }) }, "进入剧场"), /* @__PURE__ */ import_react14.default.createElement("button", { type: "button", className: "fg-ghost", onClick: () => openTheater(gameId, { panel: "cast" }) }, "人物志"), /* @__PURE__ */ import_react14.default.createElement("button", { type: "button", className: "fg-ghost", disabled: busy, onClick: retry }, busy ? "整理中…" : "重新整理"), /* @__PURE__ */ import_react14.default.createElement("button", { type: "button", className: "fg-ghost", title: "这一轮错过的插画、背景、立绘差分补上", disabled: filling, onClick: fill }, filling ? "补图中…" : "补图"))))));
}
var RATIO = { landscape: "1216 / 832", portrait: "832 / 1216", square: "1 / 1" };
function CgCardInline({ item, gameId }) {
  rememberGame2(gameId);
  const data = item && item.data || {};
  const [zoom, setZoom] = import_react14.default.useState(false);
  const [busy, setBusy] = import_react14.default.useState("");
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
    return /* @__PURE__ */ import_react14.default.createElement("div", { className: "fg-chat" }, /* @__PURE__ */ import_react14.default.createElement("div", { className: "fg-cgcard" }, /* @__PURE__ */ import_react14.default.createElement("div", { className: "fg-cgcard-fail" }, /* @__PURE__ */ import_react14.default.createElement("span", null, "🎨 插画没画成：", String(item.error || "未知原因").slice(0, 140)), /* @__PURE__ */ import_react14.default.createElement("button", { type: "button", className: "fg-ghost", disabled: busy === "r", onClick: redraw }, "重画"), /* @__PURE__ */ import_react14.default.createElement("button", { type: "button", className: "fg-ghost", onClick: () => openTheater(gameId, { panel: "gallery", panelArg: data.imageId }) }, "改词"))));
  }
  if (!src || item && item.status === "pending" && !src) {
    return /* @__PURE__ */ import_react14.default.createElement("div", { className: "fg-chat" }, /* @__PURE__ */ import_react14.default.createElement("div", { className: `fg-cgcard${tall}` }, /* @__PURE__ */ import_react14.default.createElement("div", { className: "fg-cgcard-wait", style: { aspectRatio: RATIO[data.shape] || RATIO.landscape } }, /* @__PURE__ */ import_react14.default.createElement("span", null, data.writing ? "插画分镜师在构思" : "正在绘制", item && item.caption ? `「${item.caption}」` : "插画"))));
  }
  return /* @__PURE__ */ import_react14.default.createElement("div", { className: "fg-chat" }, /* @__PURE__ */ import_react14.default.createElement("div", { className: `fg-cgcard${tall}` }, /* @__PURE__ */ import_react14.default.createElement("img", { key: src, src, alt: item && item.caption || "插画", loading: "lazy", onClick: () => setZoom(true) }), /* @__PURE__ */ import_react14.default.createElement("div", { className: "fg-cgcard-bar" }, /* @__PURE__ */ import_react14.default.createElement("span", { className: "fg-cap" }, item && item.caption || "CG", versions > 1 ? ` · ${current + 1}/${versions}` : "", item && item.status === "pending" ? " · 重画中…" : ""), versions > 1 && /* @__PURE__ */ import_react14.default.createElement("button", { type: "button", disabled: current <= 0 || busy === "v", onClick: () => act("v", () => api.version(gameId, data.imageId, current - 1)) }, "‹"), versions > 1 && /* @__PURE__ */ import_react14.default.createElement("button", { type: "button", disabled: current >= versions - 1 || busy === "v", onClick: () => act("v", () => api.version(gameId, data.imageId, current + 1)) }, "›"), /* @__PURE__ */ import_react14.default.createElement("button", { type: "button", disabled: busy === "r" || item && item.status === "pending", onClick: redraw }, "重画"), /* @__PURE__ */ import_react14.default.createElement("button", { type: "button", onClick: () => openTheater(gameId, { panel: "gallery", panelArg: data.imageId }) }, "改词"))), zoom && /* @__PURE__ */ import_react14.default.createElement("div", { className: "fg-chat-lightbox", onClick: () => setZoom(false) }, /* @__PURE__ */ import_react14.default.createElement("img", { src, alt: "" })));
}

// src/client/index.jsx
var PLUGIN = "flowgal";
var KIND_SCENE = PLUGIN + "/scene";
var KIND_CG = PLUGIN + "/cg";
function Launcher(props) {
  const wide = !props || props.wide !== false;
  return /* @__PURE__ */ import_react15.default.createElement(
    "button",
    {
      type: "button",
      title: "FlowGal：把对话当 galgame 看",
      onClick: () => openTheater(),
      style: { display: "flex", alignItems: "center", gap: 8, justifyContent: wide ? "flex-start" : "center", width: "100%", margin: "2px 0", background: "transparent", border: "none", color: "inherit", cursor: "pointer", padding: wide ? "8px 10px" : "8px 0", borderRadius: 8, fontSize: 13, textAlign: "left" }
    },
    /* @__PURE__ */ import_react15.default.createElement("span", { style: { fontSize: 15, lineHeight: 1 } }, "🎬"),
    wide ? /* @__PURE__ */ import_react15.default.createElement("span", null, "FlowGal") : null
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
    keep(ui2.registerMediaRenderer(KIND_SCENE, guard(({ item, gameId, turn }) => /* @__PURE__ */ import_react15.default.createElement(SceneCardInline, { item, gameId, turn }))), `${PLUGIN}: scene card`);
    keep(ui2.registerMediaRenderer(KIND_CG, guard(({ item, gameId }) => /* @__PURE__ */ import_react15.default.createElement(CgCardInline, { item, gameId }))), `${PLUGIN}: cg card`);
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
