// 内置拟声音效：没有音效库也能响（砰、咚、叮……现场合成），画面上蹦出这个字。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { normalizeScript } from '../lib/director.js'
import { DIRECTOR_SYSTEM } from '../lib/prompts.js'
const MAX_SFX_PER_TURN = 6 // 设置里限了数时（默认不限）
import { FOLEY, ONOMATOPOEIA, onomatopoeia } from '../lib/foley.js'
import { buildBeats } from '../src/client/theater/playback.js'

const unitsOf = n => Array.from({ length: n }, (_, i) => ({ id: 'U' + (i + 1), type: 'narration', text: '句' + i }))

test('gate: 拟声词认得常见的别的写法、标点和连写；认不出的不收', () => {
  assert.deepEqual(['砰！', '嘭', '砰砰砰', '咚咚咚', '叩叩', '轰隆隆！！', '噼里啪啦~', '咻', '「叮」', '啊', '啊啊', 'door', ''].map(onomatopoeia),
    ['砰', '砰', '砰', '咚咚', '咚咚', '轰', '噼啪', '嗖', '叮', '', '', '', ''])
})

test('gate: 导演写的音效：库里的编号照收，库里没有的认成内置拟声词，认不出的丢掉；跟库里的一起算一轮的上限', () => {
  const units = unitsOf(MAX_SFX_PER_TURN + 3)
  const sfx = ['door', '砰！', '咚咚咚', '啊——', 'ghost', '叮', '哗啦', '轰', '嗖', '咔嚓', '啪']
  const script = normalizeScript({ scene: {}, cast: [], lines: units.map((u, i) => ({ u: u.id, sfx: sfx[i] })) }, units, { sfxIds: ['door'], limits: { sfx: MAX_SFX_PER_TURN } })
  const kept = units.map(u => script.lines[u.id] && script.lines[u.id].sfx)
  assert.deepEqual(kept.slice(0, 6), ['door', '砰', '咚咚', undefined, undefined, '叮'])
  assert.equal(kept.filter(Boolean).length, MAX_SFX_PER_TURN)
  // 没接音效库也收内置的
  const bare = normalizeScript({ scene: {}, cast: [], lines: [{ u: 'U1', sfx: '扑通' }, { u: 'U2', sfx: 'door' }] }, unitsOf(2))
  assert.deepEqual([bare.lines.U1.sfx, bare.lines.U2 && bare.lines.U2.sfx], ['扑通', undefined])
  const { beats } = buildBeats({ turns: [{ turn: 1, textVersion: 'v1', units: unitsOf(2), script: bare }], images: [] })
  assert.deepEqual(beats.map(b => b.sfx), ['扑通', ''])
})

test('gate: 每个拟声词都有合成配方和字的样子，导演的提示词里都列着', () => {
  const tones = new Set(['hit', 'ring', 'air', 'soft'])
  for (const [word, { id, tone }] of Object.entries(ONOMATOPOEIA)) {
    assert.ok(FOLEY[id], word)
    assert.ok(tones.has(tone), word)
    assert.ok(new RegExp(`(：|/ )${word} `).test(DIRECTOR_SYSTEM), `提示词里没有「${word}」`)
  }
})
