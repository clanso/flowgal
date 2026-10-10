// DSH 加载的入口（package.json 的 main）。DSH 宿主层在 lib/dsh/，酒馆宿主层在 st/，lib/ 其余是两个宿主共用的核心。
export * from './dsh/plugin.js'
