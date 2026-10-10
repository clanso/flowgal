// 表情差分（只换脸）的后台认脸：动作底图画好后，宿主把同组的表情标成「等认脸」；剧场开着时这里用认脸模型
// 认出底图的眼睛和嘴，交给宿主推出脸框、接着换脸。认不准的（没把握、没认出）不交，提示去人物志里手动框。
// 认脸模型只能在浏览器里跑（宿主没有），所以这一步放在剧场页面上。
import React from 'react'
import { api, assetUrl, toast } from '../api.js'
import { visionApi, frameSprite, holdVision, releaseVisionLater } from './vision.js'

/** 这一局里等认脸的动作底图：[{ name, key, assetId }]（同一张底图只列一次）。 */
export function facesToFrame(view) {
  const out = []
  for (const p of (view && view.cast) || []) {
    for (const [key, st] of Object.entries(p.spriteStatus || {})) {
      if (!st || st.status !== 'face') continue
      const record = (p.sprites || {})[key]
      const from = record && record.face && record.face.from
      const body = from && p.sprites[from]
      if (body && body.assetId && !body.faceBox && !out.some(w => w.assetId === body.assetId)) out.push({ name: p.name, key: from, assetId: body.assetId })
    }
  }
  return out
}

// 认过的底图（按图片编号）：'ok' 交上去了，'miss' 没认准；同一个页面里不重复认。
const tried = new Map()
/** 某张底图自动认脸的结果（人物志里显示）。 */
export const framedResult = assetId => tried.get(assetId) || ''
let noModelAt = 0

/** 剧场开着时挂上：有等认脸的底图就认（一次一张，认完放掉大模型）。 */
export function useFaceFramer(gameId, view) {
  const busy = React.useRef(false)
  React.useEffect(() => {
    if (!gameId || !view || view.gameId !== gameId || busy.current) return
    const work = facesToFrame(view).filter(w => !tried.has(w.assetId))
    // 认脸小模型没下：一分钟内不再问宿主（人物志里会说要先下载）
    if (!work.length || Date.now() - noModelAt < 60000) return
    busy.current = true
    ;(async () => {
      const status = await visionApi.status().catch(() => null)
      if (!status || !status.packs.basic.ready) { noModelAt = Date.now(); return }
      holdVision()
      try {
        for (const w of work) {
          let r = null
          try { r = await frameSprite(status, assetUrl(w.assetId)) } catch {}
          if (r && r.confidence !== 'low') {
            try {
              await api.cast(gameId, 'face-box', { name: w.name, key: w.key, rects: r.rects })
              tried.set(w.assetId, 'ok')
            } catch (e) {
              tried.set(w.assetId, 'miss')
              toast(`${w.name} 的脸框没存上：${e.message}`, 'error')
            }
          } else {
            tried.set(w.assetId, 'miss')
            toast(`没认准 ${w.name} 的脸：在人物志里点开那张动作底图框一下脸，同组表情就会换好`, 'error')
          }
        }
      } finally { releaseVisionLater() }
    })().finally(() => { busy.current = false })
  }, [gameId, view])
}
