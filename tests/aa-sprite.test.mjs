import test from 'node:test'
import assert from 'node:assert/strict'
import { breathFrame, blinkAt, blinkGap, mouthAt, cleanPack, packFiles, packWithAssets } from '../lib/aa-sprite.js'
import { mkdtemp, rm, readdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createStore } from '../lib/dsh/store.js'
import { createEngine } from '../lib/engine.js'
import { typeTimes } from '../lib/typing.js'

const BREATH = { steps: [{ frame: 0, ms: 1100 }, { frame: 1, ms: 150 }, { frame: 2, ms: 900 }, { frame: 1, ms: 150 }] }
const BLINK = { sequence: [{ eyes: 'half', ms: 60 }, { eyes: 'closed', ms: 90 }, { eyes: 'half', ms: 60 }], interval_ms: [2000, 5000] }
const LOOP = [{ mouth: 'half', ms: 70 }, { mouth: 'open', ms: 90 }, { mouth: 'half', ms: 70 }, { mouth: 'closed', ms: 70 }]
const talk = (text, extra = {}) => {
  const chars = Array.from(text)
  return { chars, times: typeTimes(chars, 30), speed: 30, startedAt: 1000, done: false, type: 'dialogue', ...extra }
}

test('gate: 呼吸帧按 steps 循环；只有一帧时不呼吸', () => {
  assert.deepEqual([0, 1099, 1100, 1250, 2200, 2300].map(t => breathFrame(BREATH, t)), [0, 0, 1, 2, 1, 0])
  assert.equal(breathFrame({ steps: [{ frame: 0, ms: 1000 }] }, 777), 0)
  assert.equal(breathFrame({ steps: [] }, 500), 0)
})

test('gate: 眨眼半闭 → 闭 → 半闭，眨完返回 null；间隔落在区间内', () => {
  assert.deepEqual([0, 59, 60, 149, 150, 209].map(t => blinkAt(BLINK, t)), ['half', 'half', 'closed', 'closed', 'half', 'half'])
  assert.equal(blinkAt(BLINK, 210), null)
  assert.equal(blinkGap(BLINK, () => 0), 2000)
  assert.equal(blinkGap(BLINK, () => 1), 5000)
})

test('gate: 嘴型只在台词出字时动；打完、旁白、心里话、还没开始都闭嘴', () => {
  const t = talk('你好啊呀')
  assert.equal(mouthAt(LOOP, t, 1000), 'half') // 第一个字出现：从半张开始
  assert.equal(mouthAt(LOOP, t, 1000 + 75), 'open')
  assert.notEqual(mouthAt(LOOP, t, 1000 + 3 * 30), 'closed') // 最后一个字刚出现：还在说
  assert.equal(mouthAt(LOOP, t, 1000 + 4 * 30 + 1), 'closed') // 最后一个字说完：闭嘴
  assert.equal(mouthAt(LOOP, t, 999), 'closed')
  assert.equal(mouthAt(LOOP, { ...t, startedAt: NaN }, 1010), 'closed')
  assert.equal(mouthAt(LOOP, { ...t, done: true }, 1010), 'closed')
  assert.equal(mouthAt(LOOP, { ...t, type: 'narration' }, 1010), 'closed')
  assert.equal(mouthAt(LOOP, { ...t, type: 'thought' }, 1010), 'closed')
  assert.equal(mouthAt(LOOP, null, 1010), 'closed')
})

test('gate: 嘴型跟着时间轴的停顿：标点停顿整段闭嘴，下一个字出来重新从半张开口', () => {
  const t = talk('那天晚上，你真的在家吗？')
  const comma = t.times[4] // “，”出现
  const resume = t.times[5] // “你”出现（逗号后停了 180ms）
  assert.equal(resume - comma, 30 + 180)
  assert.equal(mouthAt(LOOP, t, 1000 + comma + 1), 'closed')
  assert.equal(mouthAt(LOOP, t, 1000 + resume - 1), 'closed')
  assert.equal(mouthAt(LOOP, t, 1000 + resume), 'half')
  // 开头的省略号一直闭嘴，“这”出现才开口
  const dots = talk('……这件事')
  assert.equal(mouthAt(LOOP, dots, 1000 + 1), 'closed')
  assert.equal(mouthAt(LOOP, dots, 1000 + dots.times[2] - 1), 'closed')
  assert.equal(mouthAt(LOOP, dots, 1000 + dots.times[2]), 'half')
})

// ───────────────────────── 导入素材包 ─────────────────────────

const MANIFEST = {
  name: 'kimono', size: [832, 1216],
  breath: { frames: ['breath_0.webp', 'breath_1.webp'], lifts: [0, 3], steps: [{ frame: 0, ms: 1100 }, { frame: 1, ms: 150 }] },
  parts: { eyes: { half: { file: 'eyes_half.png', x: 320, y: 208 }, closed: { file: 'eyes_closed.png', x: 320, y: 208 } }, mouth: { open: { file: 'mouth_open.png', x: 392, y: 312 } } },
  blink: BLINK, talk: { mouth_loop: LOOP, char_ms: 45 }, match: { file: 'idle.webp', fingerprint: 'x' },
}

test('gate: 导入素材包：检查 sprite.json（尺寸、帧号、文件名不许往上跳），列出要用的图片，文件名换成素材编号', () => {
  const pack = cleanPack(MANIFEST)
  assert.deepEqual(Object.keys(pack), ['name', 'size', 'breath', 'parts', 'blink', 'talk'], '只留剧场用得到的字段')
  assert.deepEqual(packFiles(pack), ['breath_0.webp', 'breath_1.webp', 'eyes_half.png', 'eyes_closed.png', 'mouth_open.png'])
  const ids = Object.fromEntries(packFiles(pack).map((f, i) => [f, `id${i}`]))
  const stored = packWithAssets(pack, ids)
  assert.deepEqual(stored.breath.frames, ['id0', 'id1'])
  assert.equal(stored.parts.mouth.open.file, 'id4')
  assert.deepEqual(packFiles(stored), ['id0', 'id1', 'id2', 'id3', 'id4'])
  assert.throws(() => packWithAssets(pack, { 'breath_0.webp': 'a' }), /素材包缺文件：/)
  // 子文件夹可以；往上跳、绝对路径、反斜杠不行。
  assert.equal(cleanPack({ ...MANIFEST, breath: { frames: ['frames/b0.webp'] } }).breath.frames[0], 'frames/b0.webp')
  for (const bad of ['../secret.png', 'a/../../x.png', '/etc/passwd', 'C:\\x.png', 'sub\\x.png', '..']) {
    assert.throws(() => cleanPack({ ...MANIFEST, breath: { frames: [bad] } }), /文件名不对/, bad)
  }
  assert.throws(() => cleanPack({ ...MANIFEST, breath: { ...MANIFEST.breath, steps: [{ frame: 5, ms: 100 }] } }), /帧号/)
  assert.throws(() => cleanPack({ ...MANIFEST, size: [0, 100] }), /宽/)
  assert.throws(() => cleanPack({ size: [10, 10] }), /呼吸帧/)
  assert.deepEqual(cleanPack({ size: [10, 10], breath: { frames: ['a.png'] } }).breath, { frames: ['a.png'], lifts: [0], steps: [{ frame: 0, ms: 1000 }] }, '只有一张图也行：不呼吸')
})

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')
const dataUrl = bytes => 'data:image/png;base64,' + bytes.toString('base64')

test('gate: 给一张差分导入素材包：图换成第一张呼吸帧；缺文件、不是图片时不留半截；取消动态、重新上传、删除都清掉素材包的文件', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'flowgal-'))
  try {
    const store = createStore(dir)
    const engine = createEngine({ store, services: {}, logger: { warn() {}, info() {} } })
    await engine.castAction('g', 'save', { name: '林岚', patch: { appearance: '1girl' } })
    const files = Object.fromEntries(packFiles(cleanPack(MANIFEST)).map(f => [f, dataUrl(PNG)]))
    const assetCount = async () => (await readdir(join(dir, 'assets'))).length
    // 缺一个文件、或者有一个不是图片：报错，已经存下的图删掉。
    const { 'mouth_open.png': _, ...missing } = files
    await assert.rejects(engine.castAction('g', 'aa-pack', { name: '林岚', emotion: 'smile', manifest: MANIFEST, files: missing }), /素材包缺文件：mouth_open\.png/)
    await assert.rejects(engine.castAction('g', 'aa-pack', { name: '林岚', emotion: 'smile', manifest: MANIFEST, files: { ...files, 'mouth_open.png': dataUrl(Buffer.from('not an image, just text')) } }), /不是 PNG/)
    assert.equal(await assetCount(), 0)

    await engine.castAction('g', 'aa-pack', { name: '林岚', emotion: 'smile', manifest: MANIFEST, files })
    let lin = (await engine.gameView('g')).cast.find(p => p.name === '林岚')
    const key = Object.keys(lin.sprites).find(k => k.endsWith('|smile'))
    const record = lin.sprites[key]
    assert.equal(record.assetId, record.aa.pack.breath.frames[0], '立绘图就是第一张呼吸帧')
    assert.equal(record.uploaded, true)
    assert.equal(record.aa.pack.name, 'kimono')
    assert.equal(await assetCount(), 5)
    for (const id of packFiles(record.aa.pack)) assert.equal((await engine.readAsset(id)).mediaType, 'image/png')

    // 取消动态：图留着，其余 4 个文件删掉。
    await engine.castAction('g', 'aa-remove', { name: '林岚', key })
    lin = (await engine.gameView('g')).cast.find(p => p.name === '林岚')
    assert.equal(lin.sprites[key].aa, undefined)
    assert.equal(lin.sprites[key].assetId, record.assetId)
    assert.equal(await assetCount(), 1)

    // 再导入一次，然后上传一张普通图：素材包和旧图都清掉，只剩新图。
    await engine.castAction('g', 'aa-pack', { name: '林岚', emotion: 'smile', manifest: MANIFEST, files })
    assert.equal(await assetCount(), 5, '换素材包时旧的那张图也删了')
    await engine.castAction('g', 'upload', { name: '林岚', emotion: 'smile', dataUrl: dataUrl(PNG) })
    lin = (await engine.gameView('g')).cast.find(p => p.name === '林岚')
    assert.equal(lin.sprites[key].aa, undefined, '换了图，素材包对不上了，拿掉')
    assert.equal(await assetCount(), 1)

    // 删掉这张差分：连素材包的文件一起删。
    await engine.castAction('g', 'aa-pack', { name: '林岚', emotion: 'smile', manifest: MANIFEST, files })
    await engine.castAction('g', 'sprite-delete', { name: '林岚', key })
    assert.equal(await assetCount(), 0)
    engine.dispose()
  } finally {
    await rm(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 })
  }
})
