// 镜头对准一个人：推多近、推完他的脸停在画面哪里（剧场 Stage.jsx 的 useCamera 用，theater.css 按 --zs、--tx、--ty 推）。

/**
 * 对准一个人的镜头：[放大倍数, 0~1（0 是对着脸原地放大，1 是把脸挪到 CAM_CENTER）]。
 * zoom 推近一点，closeup 特写（脸推到画面中上），lowangle 仰拍，slowpush 慢慢推近，focus 背景虚化时轻轻靠过去。
 */
export const CAM_AIM = { zoom: [1.12, 0.4], closeup: [1.6, 1], lowangle: [1.24, 0.6], slowpush: [1.08, 0.5], focus: [1.04, 0.3] }
/** 特写时脸停在画面的这个位置（占镜头框的 %）：中间偏上，留出下面的对话框。 */
export const CAM_CENTER = [50, 36]
const pct = v => Math.round(v * 100) / 100 + '%'

/**
 * 对准 face（[x, y]，占镜头框的 %）推 cam 这种镜头：返回镜头框上的 --zs 放大倍数、--tx / --ty 平移
 * （transform: scale(--zs) translate(--tx, --ty)，以框的中心为原点）。放大后看到的那一块不出框，所以脸太靠边时停不到正中。
 * 没有 face（人不在台上）时对着画面中间推；不是对准人的镜头返回 null。
 */
export function aimCamera(cam, face) {
  const spec = CAM_AIM[cam]
  if (!spec) return null
  const [zs, pull] = spec
  if (!face) return { '--zs': zs, '--tx': '0%', '--ty': '0%' }
  const half = 50 / zs
  const [tx, ty] = [0, 1].map(i => {
    const want = face[i] + (CAM_CENTER[i] - face[i]) * pull // 这张脸最后停在画面的哪里
    const center = Math.min(100 - half, Math.max(half, face[i] - (want - 50) / zs)) // 推近后看到的那一块的中心
    return pct(50 - center)
  })
  return { '--zs': zs, '--tx': tx, '--ty': ty }
}
