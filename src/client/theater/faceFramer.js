// 表情差分（只换脸）的后台认脸：动作底图画好后，宿主把同组的表情标成「等认脸」；浏览器里只要开着 FlowGal 的页面
// （聊天页也行，不用开剧场）就用认脸模型认出底图的眼睛和嘴，交给宿主推出脸框、接着换脸（useFaceWatcher，挂在 Overlay 上）。
// 认不准的（没把握、没认出）不交，提示去人物志里手动框。
// 剧场开着时，其余整张画的立绘也顺手量一遍脸框（剧场按脸框把大家的头缩放到一样大，见 lib/stature.js；useFaceFramer）；量不准的不提示。
// 认脸模型只能在浏览器里跑（宿主没有），所以这一步放在页面上。下了认脸大模型就一律用大模型（见 vision.js）。
import React from 'react'
import { api, assetUrl, toast, useFacesWaiting } from '../api.js'
import { visionApi, frameSprite, bigReady, holdVision, releaseVisionLater } from './vision.js'

/** 这一局里等认脸的动作底图：[{ gameId, name, key, assetId }]（同一张底图只列一次）。 */
export function facesToFrame(view) {
  const out = []
  for (const p of (view && view.cast) || []) {
    for (const [key, st] of Object.entries(p.spriteStatus || {})) {
      if (!st || st.status !== 'face') continue
      const record = (p.sprites || {})[key]
      const from = record && record.face && record.face.from
      const body = from && p.sprites[from]
      if (body && body.assetId && !body.faceBox && !out.some(w => w.assetId === body.assetId)) out.push({ gameId: view.gameId, name: p.name, key: from, assetId: body.assetId })
    }
  }
  return out
}

/** 还没量过脸框的整张立绘（换脸的差分用底图的框，逆转式素材包有自己框好的眼睛和嘴）：[{ gameId, name, key, assetId, measure: true }]。 */
export function facesToMeasure(view) {
  const out = []
  for (const p of (view && view.cast) || []) {
    for (const [key, r] of Object.entries(p.sprites || {})) {
      if (!r || !r.assetId || r.faceBox || r.face || (r.aa && r.aa.rects) || out.some(w => w.assetId === r.assetId)) continue
      out.push({ gameId: view.gameId, name: p.name, key, assetId: r.assetId, measure: true })
    }
  }
  return out
}

// 认过的底图（按图片编号）：'ok' 交上去了，'miss' 没认准；同一个页面里不重复认。
const tried = new Map()
/** 某张底图自动认脸的结果（人物志里显示）。 */
export const framedResult = assetId => tried.get(assetId) || ''
let noModelAt = 0
let toldSmall = false // 大模型没下、这次只用小模型认：一个页面里说一次
// 一个页面里同时只认一张：等认脸的（不管哪一局）排在量脸框的前面
const pending = []
let working = false

/** 排上要认的（认过的、已经排着的不再排），有空就开始认。 */
function enqueue(list) {
  for (const w of list) {
    if (tried.has(w.assetId) || pending.some(x => x.assetId === w.assetId)) continue
    if (w.measure) pending.push(w)
    else pending.splice(pending.findIndex(x => x.measure) < 0 ? pending.length : pending.findIndex(x => x.measure), 0, w)
  }
  pump()
}

async function pump() {
  // 认脸小模型没下：一分钟内不再问宿主（人物志里会说要先下载）
  if (working || !pending.length || Date.now() - noModelAt < 60000) return
  working = true
  try {
    const status = await visionApi.status().catch(() => null)
    if (!status || !status.packs.basic.ready) { noModelAt = Date.now(); pending.length = 0; return }
    holdVision()
    if (!bigReady(status) && !toldSmall) {
      toldSmall = true
      toast('认脸大模型还没下载，这次先用小模型认脸；在人物志的逆转式工作台里下载大模型，认得更准')
    }
    try {
      while (pending.length) {
        const w = pending.shift()
        if (tried.has(w.assetId)) continue
        let r = null
        try { r = await frameSprite(status, assetUrl(w.assetId)) } catch {}
        if (r && r.confidence !== 'low') {
          try {
            await api.cast(w.gameId, 'face-box', { name: w.name, key: w.key, rects: r.rects, measure: Boolean(w.measure) })
            tried.set(w.assetId, 'ok')
          } catch (e) {
            tried.set(w.assetId, 'miss')
            if (!w.measure) toast(`${w.name} 的脸框没存上：${e.message}`, 'error')
          }
        } else {
          tried.set(w.assetId, 'miss')
          if (!w.measure) toast(`没认准 ${w.name} 的脸：在人物志里点开那张动作底图框一下脸，同组表情就会换好`, 'error')
        }
      }
    } finally { releaseVisionLater() }
  } finally {
    working = false
    if (pending.length && Date.now() - noModelAt >= 60000) pump()
  }
}

/** 挂在 Overlay 上（页面一直在）：所有对局里等认脸的底图一来就认，不用开剧场。 */
export function useFaceWatcher() {
  const faces = useFacesWaiting(true)
  React.useEffect(() => { if (faces && faces.length) enqueue(faces) }, [faces])
}

/** 剧场开着时：这一局等认脸的（重启前就在等的也在这里接上）和还没量过脸框的整张立绘。 */
export function useFaceFramer(gameId, view) {
  React.useEffect(() => {
    if (!gameId || !view || view.gameId !== gameId) return
    enqueue([...facesToFrame(view), ...facesToMeasure(view)])
  }, [gameId, view])
}
