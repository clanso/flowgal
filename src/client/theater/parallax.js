// 鼠标视差：鼠标往画面边上移，镜头跟着偏一点；背景、人、天气粒子按远近错开（theater.css 读 --px / --py，-1～1）。
// 鼠标离开舞台就慢慢回中。只认鼠标（触屏、手写笔不动），系统设了减少动态效果时不动。
import React from 'react'

/** stageRef 听鼠标，targetRef 写 --px / --py（镜头那一层，只让它下面的东西重算样式）。 */
export function useParallax(stageRef, targetRef) {
  React.useEffect(() => {
    const stage = stageRef.current
    const target = targetRef.current
    if (!stage || !target || typeof matchMedia !== 'function') return undefined
    if (!matchMedia('(hover: hover) and (pointer: fine)').matches || matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined
    let tx = 0, ty = 0, x = 0, y = 0, raf = 0
    const write = () => { target.style.setProperty('--px', x.toFixed(4)); target.style.setProperty('--py', y.toFixed(4)) }
    const tick = () => {
      x += (tx - x) * 0.05; y += (ty - y) * 0.05
      if (Math.abs(tx - x) < 0.0005 && Math.abs(ty - y) < 0.0005) { x = tx; y = ty; raf = 0 } else raf = requestAnimationFrame(tick)
      write()
    }
    const wake = () => { if (!raf) raf = requestAnimationFrame(tick) }
    const move = e => {
      if (e.pointerType && e.pointerType !== 'mouse') return
      const r = stage.getBoundingClientRect()
      if (!r.width || !r.height) return
      tx = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1))
      ty = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height) * 2 - 1))
      wake()
    }
    const leave = () => { tx = 0; ty = 0; wake() }
    stage.addEventListener('pointermove', move)
    stage.addEventListener('pointerleave', leave)
    return () => {
      cancelAnimationFrame(raf)
      stage.removeEventListener('pointermove', move)
      stage.removeEventListener('pointerleave', leave)
      target.style.removeProperty('--px'); target.style.removeProperty('--py')
    }
  }, [])
}
