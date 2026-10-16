// 亲密场面（lib/eros.js）的画面：跟着节奏底一下一下的律动、高潮那一下柔和的白光、射精时一下一下的脉动。
// 潮红（.fg-eros）和触手的影子（.fg-tentacle）是 theater.css 里跟着场景淡入淡出的层，不在这里。
// 不出字、不出爱心和漫画符号；系统设了「减少动态效果」时画面不动，只留光和声音。
import React from 'react'
import { EROS_PULSES } from '../../../lib/eros.js'
import { erosPeak, onErosBeat } from './audio.js'

const still = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

/** 每种节奏一拍里画面往上送多少（占画面高的百分比）；爱抚和余韵不送。 */
const PUSH = { slow: 0.45, fast: 0.55, frantic: 0.7 }

/**
 * 律动：节奏底每响一下抽插，镜头就跟着那一下轻轻往上一送再落回来（和声音按同一个时刻排，不会越走越偏）。
 * on 为 false（关了亲密音效、快进、没有节奏底）时不动。动的是镜头单独的 translate 属性，不碰推拉摇用的 transform。
 */
export function useErosPulse(cameraRef, on) {
  React.useEffect(() => {
    if (!on || still()) return undefined
    const moving = new Set()
    const off = onErosBeat(({ in: delay, beat, pace }) => {
      const cam = cameraRef.current
      const amp = PUSH[pace]
      if (!amp || !cam || typeof cam.animate !== 'function') return
      const move = cam.animate([
        { translate: '0 0' },
        { translate: `0 ${-amp}%`, offset: 0.2, easing: 'cubic-bezier(.3, 0, .3, 1)' },
        { translate: `0 ${(amp * 0.15).toFixed(3)}%`, offset: 0.58 },
        { translate: '0 0' },
      ], { duration: Math.min(beat * 0.9, 1000), delay, easing: 'cubic-bezier(.2, .6, .4, 1)' })
      moving.add(move)
      move.onfinish = () => moving.delete(move)
    })
    return () => { off(); moving.forEach(m => m.cancel()) }
  }, [on])
}

/**
 * 高潮那一下（beat.peak）：climax 画面柔和地白起来、再慢慢回来，镜头轻轻往前一涌；cum 跟着声音的四下一下一下地脉动；both 两样一起。
 * volume 是音量（0 不响）；sound 为 false 时合成的心跳、脉动声不响（那一句配了音效库里的声音），节奏底照样停一下、配乐照样压低。
 * 镜头动的是单独的 scale 属性，不碰推拉摇用的 transform。
 */
export function ErosPeak({ beat, cameraRef, volume, sound = true }) {
  const kind = beat.peak
  React.useEffect(() => {
    if (volume > 0) erosPeak(kind, volume, { sound })
    const cam = cameraRef && cameraRef.current
    if (!cam || typeof cam.animate !== 'function' || still()) return undefined
    // both 时镜头只涌那一下（两个动画都动 scale 会互相顶掉），一下一下的脉动交给白光层
    const moves = kind !== 'cum'
      ? [cam.animate([{ scale: '1' }, { scale: '1.03', offset: 0.28 }, { scale: '1' }], { duration: 2600, easing: 'cubic-bezier(.3, 0, .2, 1)' })]
      : EROS_PULSES.map((ms, i) => cam.animate([{ scale: '1' }, { scale: String(1.016 - i * 0.003), offset: 0.2 }, { scale: '1' }], { duration: 360, delay: ms, easing: 'ease-out' }))
    return () => moves.forEach(m => m.cancel())
  }, [])
  return (
    <div className={`fg-peak is-${kind}`} aria-hidden="true">
      {kind !== 'climax' && EROS_PULSES.map((ms, i) => <i key={ms} style={{ '--at': ms + 'ms', '--k': (1 - i * 0.2).toFixed(2) }} />)}
    </div>
  )
}
