// 对话框的字体、字号、高度：字体选择的校验、上传自己的字体、设置的范围。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { FONT_PACKS, FONT_GROUPS, sniffFont, cleanFontChoice, cleanCustomFonts, fontFamilyOf, fontPackOf, fileFamily, DIALOG_LIMITS, skinDialogHeight } from '../lib/fonts.js'
import { resolveConfig, applyPatch, DEFAULT_CONFIG } from '../lib/config.js'
import { createStore } from '../lib/dsh/store.js'
import { createEngine } from '../lib/engine.js'

const head = (magic, size = 64) => { const b = Buffer.alloc(size); (typeof magic === 'string' ? Buffer.from(magic, 'latin1') : Buffer.from(magic)).copy(b); return b }
const ID = 'a'.repeat(32) + '.ttf'

test('字体包：每个都有包名@版本、样式表、字体名，组都认得；皮肤原来用的几个还在', () => {
  const groups = new Set(FONT_GROUPS.map(([g]) => g))
  for (const [key, f] of Object.entries(FONT_PACKS)) {
    assert.match(f.pkg, /^(@[a-z0-9-]+\/)?[a-z0-9-]+@\d+\.\d+\.\d+$/, key)
    assert.ok(f.css.length > 0 && f.css.every(c => /\.css$/.test(c)), key)
    assert.ok(f.family && f.name, key)
    assert.ok(groups.has(f.group), key)
  }
  for (const key of ['sans', 'serif', 'wenkai', 'brush', 'mono', 'latin']) assert.ok(FONT_PACKS[key], key)
})

test('认字体格式：woff2、woff、otf、ttf；字体集单独认出来；别的不认', () => {
  assert.equal(sniffFont(head('wOF2')), 'font/woff2')
  assert.equal(sniffFont(head('wOFF')), 'font/woff')
  assert.equal(sniffFont(head('OTTO')), 'font/otf')
  assert.equal(sniffFont(head([0, 1, 0, 0])), 'font/ttf')
  assert.equal(sniffFont(head('true')), 'font/ttf')
  assert.equal(sniffFont(head('ttcf')), 'collection')
  assert.equal(sniffFont(head('RIFF')), null)
  assert.equal(sniffFont(Buffer.from('wOF2')), null, '太短')
})

test('字体选择：认得的留下，坏的回到跟皮肤；样式里的写法不会被字体名弄坏', () => {
  const fonts = cleanCustomFonts([{ assetId: ID, name: '我的字' }, { assetId: ID, name: '重复' }, { assetId: 'x.ttf' }, null])
  assert.deepEqual(fonts, [{ assetId: ID, name: '我的字' }])
  assert.equal(cleanFontChoice('pack:wenkai', fonts), 'pack:wenkai')
  assert.equal(cleanFontChoice('pack:nope', fonts), '')
  assert.equal(cleanFontChoice('file:' + ID, fonts), 'file:' + ID)
  assert.equal(cleanFontChoice('file:' + 'b'.repeat(32) + '.ttf', fonts), '', '上传的字体删了就回到跟皮肤')
  assert.equal(cleanFontChoice('local:Microsoft YaHei', fonts), 'local:Microsoft YaHei')
  assert.equal(cleanFontChoice('local:"a";} body{x', fonts), 'local:a bodyx', '引号、分号、括号去掉')
  assert.equal(cleanFontChoice('local:  ', fonts), '')
  assert.equal(cleanFontChoice('serif', fonts), '')
  assert.equal(fontFamilyOf('pack:wenkai'), '"LXGW WenKai"')
  assert.equal(fontFamilyOf('local:SimSun'), '"SimSun"')
  assert.equal(fontFamilyOf('file:' + ID), `"${fileFamily(ID)}"`)
  assert.equal(fontFamilyOf(''), '')
  assert.equal(fontPackOf('pack:brush'), 'brush')
  assert.equal(fontPackOf('local:SimSun'), '')
})

test('设置：默认都跟皮肤；字号、高度放在范围里，填坏了回默认；高度留空跟皮肤', () => {
  const ui = resolveConfig({}).ui
  assert.deepEqual([ui.textFont, ui.nameFont, ui.textScale, ui.nameScale, ui.dialogHeight, ui.dialogHeightPortrait, ui.customFonts], ['', '', 1, 1, null, null, []])
  assert.equal('fontScale' in ui, false)
  const set = resolveConfig({ ui: { textScale: 99, nameScale: 0, dialogHeight: 500, dialogHeightPortrait: 1, textFont: 'pack:kuaile', nameFont: 'local:KaiTi' } }).ui
  assert.equal(set.textScale, DIALOG_LIMITS.textScale.max)
  assert.equal(set.nameScale, DIALOG_LIMITS.nameScale.min)
  assert.equal(set.dialogHeight, DIALOG_LIMITS.dialogHeight.max)
  assert.equal(set.dialogHeightPortrait, DIALOG_LIMITS.dialogHeight.min)
  assert.deepEqual([set.textFont, set.nameFont], ['pack:kuaile', 'local:KaiTi'])
  const bad = resolveConfig({ ui: { textScale: 'abc', nameScale: null, dialogHeight: 'x', dialogHeightPortrait: '' } }).ui
  assert.deepEqual([bad.textScale, bad.nameScale, bad.dialogHeight, bad.dialogHeightPortrait], [1, 1, null, null])
  assert.equal(skinDialogHeight('stellar'), 27)
  assert.equal(skinDialogHeight('noir'), 31)
  assert.equal(skinDialogHeight('stellar', 'portrait'), 22)
  // 范围要给足：字号能缩到三成、放到四倍，高度能从一条细缝拉到整个画面
  assert.ok(DIALOG_LIMITS.textScale.min <= 0.3 && DIALOG_LIMITS.textScale.max >= 4)
  assert.ok(DIALOG_LIMITS.dialogHeight.min <= 5 && DIALOG_LIMITS.dialogHeight.max >= 100)
  assert.ok(DEFAULT_CONFIG.ui.customFonts.length === 0)
  // 上传的字体清单只经上传接口改
  assert.equal('customFonts' in (applyPatch({}, { ui: { customFonts: [{ assetId: ID }], textScale: 2 } }).ui), false)
})

test('上传自己的字体：认格式、存素材、能选来用；删掉时正用着的回到跟皮肤，文件也删', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'flowgal-'))
  try {
    const engine = createEngine({ store: createStore(dir), services: {}, logger: { warn() {}, info() {} } })
    let res = await engine.uploadFont(head('wOF2', 256), '我的手写体.woff2')
    const font = res.font
    assert.equal(font.name, '我的手写体')
    assert.match(font.assetId, /^[a-f0-9]{32}\.woff2$/)
    assert.deepEqual(res.config.ui.customFonts, [font])
    assert.equal((await engine.readAsset(font.assetId)).mediaType, 'font/woff2')
    res = await engine.uploadFont(head('OTTO', 256), 'Second.otf')
    assert.equal(res.config.ui.customFonts.length, 2)
    let { config } = await engine.patchConfig({ ui: { textFont: 'file:' + font.assetId, nameFont: 'file:' + font.assetId } })
    assert.equal(config.ui.textFont, 'file:' + font.assetId)
    ;({ config } = await engine.removeFont(font.assetId))
    assert.deepEqual([config.ui.textFont, config.ui.nameFont], ['', ''])
    assert.deepEqual(config.ui.customFonts.map(f => f.name), ['Second'])
    assert.equal(await engine.readAsset(font.assetId), null)
    await assert.rejects(engine.uploadFont(head('ttcf', 256), 'set.ttc'), /字体集/)
    await assert.rejects(engine.uploadFont(Buffer.from('not a font at all'), 'x.txt'), /认不出这个字体格式/)
    await assert.rejects(engine.uploadFont(Buffer.alloc(0), 'x.ttf'), /空的/)
    engine.dispose()
  } finally {
    await rm(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 })
  }
})
