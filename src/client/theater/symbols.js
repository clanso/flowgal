// 漫画符号：角色头顶冒出的爱心、怒筋、汗滴……（导演给每句写的 sym）。全部是本插件自己画的 SVG，viewBox 100×100。
// 白描边保证在亮暗背景上都看得清；动效在 styles/theater.css 的 .fg-symbol 一节。

const OUTLINE = 'stroke="#fff" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"'
const HEART = 'M50 86C20 64 8 48 8 32C8 18 19 9 31 9C40 9 46 14 50 21C54 14 60 9 69 9C81 9 92 18 92 32C92 48 80 64 50 86Z'
const svg = body => `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${body}</svg>`
const round = n => Math.round(n * 10) / 10

/** 四角星：控制点都在中心，四条边向内凹。 */
function star(cx, cy, r) {
  return `M${cx} ${cy - r}Q${cx} ${cy} ${cx + r} ${cy}Q${cx} ${cy} ${cx} ${cy + r}Q${cx} ${cy} ${cx - r} ${cy}Q${cx} ${cy} ${cx} ${cy - r}Z`
}

/** 爆炸框：长短半径交替的尖角多边形。 */
function burst(points, outer, inner) {
  const out = []
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 ? inner : outer
    const a = (Math.PI * i) / points - Math.PI / 2
    out.push(`${round(50 + r * Math.cos(a))} ${round(50 + r * Math.sin(a))}`)
  }
  return 'M' + out.join('L') + 'Z'
}

/** 阿基米德螺线，从中心往外绕 turns 圈。 */
function spiral(turns, maxR) {
  const out = []
  const steps = turns * 24
  for (let i = 0; i <= steps; i++) {
    const a = (i / 24) * Math.PI * 2
    const r = (i / steps) * maxR
    out.push(`${round(50 + r * Math.cos(a))} ${round(50 + r * Math.sin(a))}`)
  }
  return 'M' + out.join('L')
}

/** Z 字：左上起笔、斜下、右下收笔。 */
function zed(x, y, size) {
  return `M${x} ${y}H${x + size}L${x} ${y + size}H${x + size}`
}

/** 碎心的裂缝：左右两半共用这条折线。 */
const CRACK = 'L44 70L54 56L44 43L53 31L50 21'

export const SYMBOL_SVG = {
  heart: svg(`<path d="${HEART}" fill="#ff4f7b" ${OUTLINE}/><path d="M24 27C27 21 32 18 37 19" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".85"/>`),
  anger: svg(['M40 12Q42 38 14 40', 'M60 12Q58 38 86 40', 'M40 88Q42 62 14 60', 'M60 88Q58 62 86 60']
    .map(d => `<path d="${d}" fill="none" stroke="#fff" stroke-width="16" stroke-linecap="round"/>`).join('') +
    ['M40 12Q42 38 14 40', 'M60 12Q58 38 86 40', 'M40 88Q42 62 14 60', 'M60 88Q58 62 86 60']
      .map(d => `<path d="${d}" fill="none" stroke="#e8283c" stroke-width="9" stroke-linecap="round"/>`).join('')),
  sweat: svg(`<path d="M50 8C50 8 22 46 22 64C22 80 35 92 50 92C65 92 78 80 78 64C78 46 50 8 50 8Z" fill="#7cc8ff" ${OUTLINE}/><path d="M35 63C35 72 40 78 47 80" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".9"/>`),
  sparkle: svg(`<path d="${star(42, 52, 36)}" fill="#ffe36e" stroke="#fff" stroke-width="3" stroke-linejoin="round"/><path d="${star(80, 18, 14)}" fill="#fff6b8" stroke="#fff" stroke-width="2"/><path d="${star(82, 80, 9)}" fill="#fff6b8" stroke="#fff" stroke-width="2"/>`),
  surprise: svg(`<path d="${burst(11, 48, 31)}" fill="#fff" stroke="#ff4f4f" stroke-width="3" stroke-linejoin="round"/><rect x="43" y="22" width="14" height="38" rx="7" fill="#ff4f4f"/><circle cx="50" cy="73" r="7.5" fill="#ff4f4f"/>`),
  gloom: svg(`<g stroke-linecap="round">${[[14, 62], [27, 82], [40, 70], [53, 90], [66, 74], [79, 84], [90, 58]]
    .map(([x, len]) => `<path d="M${x} 8V${len}" stroke="#fff" stroke-width="9" opacity=".55"/><path d="M${x} 8V${len}" stroke="#5c4d8a" stroke-width="5"/>`).join('')}</g>`),
  note: svg(`<g ${OUTLINE}><ellipse cx="30" cy="76" rx="13" ry="9.5" transform="rotate(-22 30 76)" fill="#ff8fcf"/><path d="M41 72V16Q58 22 64 38Q56 30 41 30" fill="#ff8fcf"/><ellipse cx="74" cy="58" rx="9" ry="6.5" transform="rotate(-22 74 58)" fill="#8fd6ff"/><path d="M82 55V22Q90 26 93 34" fill="none" stroke="#8fd6ff"/></g><path d="M41 72V16M82 55V22Q90 26 93 34" fill="none" stroke="#1d1d2b" stroke-width="2.5" stroke-linecap="round" opacity=".35"/>`),
  zzz: svg([[12, 68, 16], [34, 42, 22], [60, 10, 30]]
    .map(([x, y, s]) => `<path d="${zed(x, y, s)}" fill="none" stroke="#fff" stroke-width="12" stroke-linejoin="round" stroke-linecap="round"/><path d="${zed(x, y, s)}" fill="none" stroke="#8fa8ff" stroke-width="6" stroke-linejoin="round" stroke-linecap="round"/>`).join('')),
  bulb: svg(`<g stroke="#ffd94a" stroke-width="5" stroke-linecap="round">${[-150, -120, -90, -60, -30].map(deg => {
    const a = (deg * Math.PI) / 180
    return `<path d="M${round(50 + 32 * Math.cos(a))} ${round(42 + 32 * Math.sin(a))}L${round(50 + 44 * Math.cos(a))} ${round(42 + 44 * Math.sin(a))}"/>`
  }).join('')}</g><circle cx="50" cy="44" r="22" fill="#fff36b" ${OUTLINE}/><path d="M41 66H59V78Q59 84 53 84H47Q41 84 41 78Z" fill="#c8c9d8" ${OUTLINE}/><path d="M42 72H58" stroke="#8e90a6" stroke-width="3"/><path d="M40 38Q42 30 50 28" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round"/>`),
  heartbreak: svg(`<path d="M50 21C46 14 40 9 31 9C19 9 8 18 8 32C8 48 20 64 50 86${CRACK}Z" transform="translate(-5 3) rotate(-7 30 50)" fill="#ff4f7b" ${OUTLINE}/><path d="M50 21C54 14 60 9 69 9C81 9 92 18 92 32C92 48 80 64 50 86${CRACK}Z" transform="translate(5 3) rotate(7 70 50)" fill="#e83d68" ${OUTLINE}/>`),
  sigh: svg(`<g fill="#eef2ff" stroke="#9aa6c8" stroke-width="4"><circle cx="62" cy="52" r="18"/><circle cx="80" cy="44" r="13"/><circle cx="78" cy="64" r="11"/><circle cx="62" cy="52" r="16" stroke="none"/></g><path d="M8 50H36M14 63H38M16 37H36" fill="none" stroke="#c7d0ee" stroke-width="5" stroke-linecap="round"/>`),
  dizzy: svg(`<path d="${spiral(3, 36)}" fill="none" stroke="#fff" stroke-width="10" stroke-linecap="round"/><path d="${spiral(3, 36)}" fill="none" stroke="#ffb84a" stroke-width="5" stroke-linecap="round"/><path d="${star(14, 14, 9)}" fill="#ffe36e" stroke="#fff" stroke-width="2"/><path d="${star(88, 84, 8)}" fill="#ffe36e" stroke="#fff" stroke-width="2"/>`),
  fire: svg(`<path d="M50 6C62 26 82 36 80 62C78 82 64 94 50 94C36 94 22 82 20 62C19 46 30 38 34 24C38 34 42 38 46 40C44 28 46 16 50 6Z" fill="#ff6a2b" ${OUTLINE}/><path d="M50 44C58 56 66 62 64 74C62 86 56 90 50 90C44 90 38 86 36 76C35 66 42 60 50 44Z" fill="#ffd24a"/>`),
  blush: svg(`<ellipse cx="50" cy="52" rx="44" ry="20" fill="#ff8fb0" opacity=".42"/><g stroke="#ff5c8a" stroke-width="5" stroke-linecap="round">${[20, 34, 48, 62, 76].map(x => `<path d="M${x} 64L${x + 8} 40"/>`).join('')}</g>`),
  bloom: svg(`<g fill="#ffb7d5" ${OUTLINE}>${[0, 72, 144, 216, 288].map(deg => `<ellipse cx="50" cy="27" rx="15" ry="22" transform="rotate(${deg} 50 50)"/>`).join('')}</g><circle cx="50" cy="50" r="12" fill="#ffe066" ${OUTLINE}/>`),
  silence: svg(`<path d="M14 18H86Q94 18 94 26V62Q94 70 86 70H44L28 86V70H14Q6 70 6 62V26Q6 18 14 18Z" fill="#fff" stroke="#6d6f86" stroke-width="4" stroke-linejoin="round"/><g fill="#6d6f86"><circle cx="32" cy="44" r="6"/><circle cx="50" cy="44" r="6"/><circle cx="68" cy="44" r="6"/></g>`),
}
