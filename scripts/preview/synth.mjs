// 预览用的示例配乐：程序合成几段几秒长、可循环的 WAV（琴声琶音、柔和铺底、低沉雨夜）。
// 只给预览演示「我的配乐」和导演选曲，不随插件发布。
const RATE = 22050

function wav(samples) {
  const data = Buffer.alloc(samples.length * 2)
  samples.forEach((v, i) => data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, v)) * 32000), i * 2))
  const head = Buffer.alloc(44)
  head.write('RIFF', 0); head.writeUInt32LE(36 + data.length, 4); head.write('WAVE', 8)
  head.write('fmt ', 12); head.writeUInt32LE(16, 16); head.writeUInt16LE(1, 20); head.writeUInt16LE(1, 22)
  head.writeUInt32LE(RATE, 24); head.writeUInt32LE(RATE * 2, 28); head.writeUInt16LE(2, 32); head.writeUInt16LE(16, 34)
  head.write('data', 36); head.writeUInt32LE(data.length, 40)
  return Buffer.concat([head, data])
}

const freq = midi => 440 * Math.pow(2, (midi - 69) / 12)

/** notes: [起始秒, 时长秒, midi 音高, 音量, 音色]；首尾各淡 0.3 秒，循环时不爆音。 */
function render(seconds, notes) {
  const out = new Float32Array(Math.round(seconds * RATE))
  for (const [start, dur, midi, gain, tone] of notes) {
    const f = freq(midi)
    const from = Math.round(start * RATE), len = Math.round(dur * RATE)
    for (let i = 0; i < len && from + i < out.length; i++) {
      const t = i / RATE
      const env = tone === 'pad' ? Math.min(1, t / 0.8) * Math.min(1, (dur - t) / 0.8) : Math.exp(-t * 2.6) * Math.min(1, t / 0.005)
      const wave = tone === 'pad'
        ? Math.sin(2 * Math.PI * f * t) * 0.6 + Math.sin(2 * Math.PI * f * 1.005 * t) * 0.4
        : Math.sin(2 * Math.PI * f * t) + 0.3 * Math.sin(4 * Math.PI * f * t) + 0.1 * Math.sin(6 * Math.PI * f * t)
      out[from + i] += wave * env * gain
    }
  }
  const fade = Math.round(0.3 * RATE)
  for (let i = 0; i < fade; i++) { out[i] *= i / fade; out[out.length - 1 - i] *= i / fade }
  return wav(out)
}

function arpeggio() {
  const chords = [[60, 64, 67, 72], [57, 60, 64, 69], [53, 57, 60, 65], [55, 59, 62, 67]]
  const notes = []
  chords.forEach((chord, c) => {
    for (let k = 0; k < 8; k++) notes.push([c * 2 + k * 0.25, 1.2, chord[[0, 1, 2, 3, 2, 1, 2, 3][k]], 0.18, 'piano'])
    notes.push([c * 2, 2, chord[0] - 12, 0.16, 'piano'])
  })
  return render(8, notes)
}

function pads() {
  const chords = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]]
  const notes = chords.flatMap((chord, c) => chord.map(m => [c * 2.5, 2.9, m, 0.11, 'pad']))
  for (let k = 0; k < 10; k++) notes.push([0.6 + k, 1.6, [76, 79, 81, 84][k % 4], 0.05, 'piano'])
  return render(10, notes)
}

function rainNight() {
  const notes = [[0, 8, 38, 0.2, 'pad'], [0, 8, 45, 0.1, 'pad']]
  for (let k = 0; k < 8; k++) notes.push([k + 0.5, 1.4, [62, 61, 57, 58][k % 4], 0.08, 'piano'])
  return render(8, notes)
}

/** 示例曲目：文件名、曲名、描述、标签、字节。 */
export function demoTracks() {
  return [
    { key: 'room', file: 'demo-afternoon-piano.wav', name: '午后琴房（示例）', description: '明亮的钢琴琶音，大调，轻快又有点害羞。适合午后的教室和琴房、两个人独处的甜蜜日常。', tags: ['日常', '甜蜜', '午后', '钢琴'], bytes: arpeggio() },
    { key: 'path', file: 'demo-firefly-path.wav', name: '萤火小径（示例）', description: '柔和的铺底和零星高音，慢，安静。适合黄昏或夜里散步、萤火、说悄悄话。', tags: ['静谧', '黄昏', '夜', '温柔'], bytes: pads() },
    { key: 'rain', file: 'demo-rain-night.wav', name: '雨夜（示例）', description: '低沉的持续音和下行的小调音型，压抑、不安。适合雨夜、秘密被揭开、气氛突然绷紧。', tags: ['雨', '夜', '紧张', '不安'], bytes: rainNight() },
  ]
}
