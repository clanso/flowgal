// 亲密场面（lib/eros.js）的画面：跟着节奏底一下一下的律动、高潮那一下柔和的白光、射精时一下一下的脉动。
// 潮红（.fg-eros）和触手的影子（.fg-tentacle）是 theater.css 里跟着场景淡入淡出的层，不在这里。
// 不出字、不出爱心和漫画符号；系统设了「减少动态效果」时画面不动，只留光和声音。
import React from 'react'
import { EROS_PULSES } from '../../../lib/eros.js'
import { erosPeak, onErosBeat } from './audio.js'

const still = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

/** 每种节奏一拍里画面往上送多少（占画面高的百分比）与呼吸缩放；爱抚是极慢的呼吸摇曳，余韵不送。 */
const PUSH = {
  tease: { y: 0.16, scale: 1.003, beat: 2400 },
  slow: { y: 0.42, scale: 1.006, beat: 1250 },
  fast: { y: 0.56, scale: 1.009, beat: 680 },
  frantic: { y: 0.72, scale: 1.013, beat: 440 },
}

/**
 * 律动：
 * - 合成节奏底时（on 为 'sync'），节奏底每响一下抽插，镜头就跟着那一下轻轻往上一送、微微涨一下再落回来（和声音按同一个时刻排，不会越走越偏）；
 * - 配了音效库里的长录音时（on 为 pace 字符串，如 'slow' / 'fast' / 'frantic' / 'tease'），虽然录音没有逐拍时间点，镜头照样按对应档位的呼吸周期柔和地一送一落，不再死板不动。
 * 动的是镜头单独的 translate 属性（不碰推拉摇用的 transform）。
 */
export function useErosPulse(cameraRef, pace, synced = false) {
  React.useEffect(() => {
    if (!pace || still()) return undefined
    const spec = PUSH[pace]
    if (!spec) return undefined
    const pulseOnce = (delay, duration) => {
      const cam = cameraRef.current
      if (!cam || typeof cam.animate !== 'function') return null
      const { y, scale } = spec
      return cam.animate([
        { translate: '0 0' },
        { translate: `0 ${-y}%`, offset: 0.22, easing: 'cubic-bezier(.28, 0, .25, 1)' },
        { translate: `0 ${(y * 0.14).toFixed(3)}%`, offset: 0.62 },
        { translate: '0 0' },
      ], { duration: Math.min(duration * 0.92, 1400), delay, easing: 'cubic-bezier(.22, .6, .36, 1)' })
    }
    if (synced && pace !== 'tease') {
      const moving = new Set()
      const off = onErosBeat(({ in: delay, beat }) => {
        const move = pulseOnce(delay, beat)
        if (move) { moving.add(move); move.onfinish = () => moving.delete(move) }
      })
      return () => { off(); moving.forEach(m => m.cancel()) }
    }
    // 录音模式或爱抚（tease）：按档位周期循环柔和律动
    const cam = cameraRef.current
    if (!cam || typeof cam.animate !== 'function') return undefined
    const { y } = spec
    const loop = cam.animate([
      { translate: '0 0' },
      { translate: `0 ${-y}%`, offset: 0.26, easing: 'cubic-bezier(.32, 0, .28, 1)' },
      { translate: `0 ${(y * 0.12).toFixed(3)}%`, offset: 0.64 },
      { translate: '0 0' },
    ], { duration: spec.beat, iterations: Infinity, easing: 'cubic-bezier(.25, .6, .35, 1)' })
    return () => loop.cancel()
  }, [pace, synced])
}

/**
 * 高潮那一下（beat.peak）：
 * - climax：纯GPU合成的双层柔光白闪（第一下骤然刺亮、随即化作温暖的粉白余晖缓缓退去），镜头轻轻往前一涌再松开；
 * - cum：跟着声音的四下一下一下地往里收缩脉动（一圈圈暖白潮涌从下腹往四周漾开，一下比一下弱）；
 * - both：白闪与四下脉动同时交织，镜头随每一次脉动微微一颤。
 * volume 是音量（0 不响）；sound 为 false 时合成的心跳、脉动声不响（那一句配了音效库里的声音），节奏底照样停一下、配乐照样压低。
 * 镜头动的是单独的 scale 属性，不碰推拉摇用的 transform。
 */
export function ErosPeak({ beat, cameraRef, volume, sound = true }) {
  const kind = beat.peak
  React.useEffect(() => {
    if (volume > 0) erosPeak(kind, volume, { sound })
    const cam = cameraRef && cameraRef.current
    if (!cam || typeof cam.animate !== 'function' || still()) return undefined
    const keyframes = kind === 'cum'
      ? [
          { scale: '1', offset: 0 },
          { scale: '1.026', offset: 0.06 },
          { scale: '1.006', offset: 0.16 },
          { scale: '1.022', offset: 0.22 },
          { scale: '1.004', offset: 0.34 },
          { scale: '1.016', offset: 0.40 },
          { scale: '1.002', offset: 0.54 },
          { scale: '1.010', offset: 0.60 },
          { scale: '1', offset: 1 },
        ]
      : kind === 'both'
        ? [
            { scale: '1', offset: 0 },
            { scale: '1.042', offset: 0.08 },
            { scale: '1.018', offset: 0.15 },
            { scale: '1.032', offset: 0.21 },
            { scale: '1.012', offset: 0.31 },
            { scale: '1.022', offset: 0.38 },
            { scale: '1.006', offset: 0.50 },
            { scale: '1.014', offset: 0.56 },
            { scale: '1', offset: 1 },
          ]
        : [
            { scale: '1', offset: 0 },
            { scale: '1.038', offset: 0.12 },
            { scale: '1.022', offset: 0.36 },
            { scale: '1', offset: 1 },
          ]
    const move = cam.animate(keyframes, { duration: kind === 'cum' ? 2200 : 3100, easing: 'cubic-bezier(.25, 0, .2, 1)' })
    return () => move.cancel()
  }, [])
  return (
    <div className={`fg-peak is-${kind}`} aria-hidden="true">
      {kind !== 'cum' && <b className="fg-peak-veil" />}
      {kind !== 'climax' && EROS_PULSES.map((ms, i) => <i key={ms} style={{ '--at': ms + 'ms', '--k': (1 - i * 0.2).toFixed(2) }} />)}
    </div>
  )
}
