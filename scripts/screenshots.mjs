// 截图：起一个预览服务，用 Playwright 走一遍聊天页 → 标题画面 → 剧场 → 各面板 → 皮肤 → 立绘差分 → 手机竖屏。
//   node scripts/screenshots.mjs [输出目录]
// 需要 playwright（本仓库不装；用全局的或 PLAYWRIGHT_MODULE 指定路径）。字体想走本地镜像时设 FLOWGAL_FONT_DIR（见 preview-server.mjs）。
import { spawn, execSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { mkdir } from 'node:fs/promises'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = resolve(process.argv[2] || join(root, '.tmp-screenshots'))
const PORT = 5199
const BASE = `http://localhost:${PORT}/`
const sleep = ms => new Promise(r => setTimeout(r, ms))

function loadPlaywright() {
  const tries = [process.env.PLAYWRIGHT_MODULE, 'playwright', join(execSync('npm root -g').toString().trim(), 'playwright')].filter(Boolean)
  const require = createRequire(import.meta.url)
  for (const id of tries) { try { return require(id) } catch {} }
  throw new Error('找不到 playwright：npm i -g playwright，或设置 PLAYWRIGHT_MODULE')
}

async function startServer() {
  const child = spawn(process.execPath, [join(root, 'scripts/preview-server.mjs'), '--port', String(PORT)], { stdio: ['ignore', 'pipe', 'inherit'] })
  await new Promise((ok, fail) => {
    child.stdout.on('data', d => { if (String(d).includes('预览')) ok() })
    child.on('exit', code => fail(new Error('预览服务退出：' + code)))
  })
  return child
}

const { chromium } = loadPlaywright()
await mkdir(out, { recursive: true })
const server = await startServer()
const browser = await chromium.launch()
try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } })
  page.on('pageerror', e => console.warn('页面错误：', e.message))
  const shot = async name => { await page.screenshot({ path: join(out, name + '.png') }); console.log('✓', name) }
  const click = async (selector, wait = 900) => { await page.locator(selector).first().click(); await sleep(wait) }
  const stage = () => page.locator('.fg-stage')
  // 跳过逐字动画：点一下打完，再点一下翻页。
  const advance = async (n = 1) => { for (let i = 0; i < n; i++) { await stage().click({ position: { x: 800, y: 300 } }); await sleep(120); await stage().click({ position: { x: 800, y: 300 } }); await sleep(260) } }
  const settle = async ms => { await stage().click({ position: { x: 800, y: 300 } }); await sleep(ms) }
  const jumpTo = async text => { await page.keyboard.press('l'); await sleep(700); await page.locator('.fg-log-item', { hasText: text }).first().click(); await sleep(400) }

  await page.goto(BASE)
  await sleep(2500)
  // 导演 → 插画分镜师 → 出图，等两张插画都画好再拍聊天页。
  await page.waitForFunction(() => document.querySelectorAll('.fg-cgcard img').length >= 2, null, { timeout: 90000 })
  await sleep(800)
  await page.evaluate(() => document.querySelector('.fg-scene') && document.querySelector('.fg-scene').scrollIntoView({ block: 'end' }))
  await page.evaluate(() => document.getElementById('log').scrollBy(0, 160))
  await sleep(600)
  await shot('01-chat-scene-card')
  await page.evaluate(() => { const cards = document.querySelectorAll('.fg-cgcard'); cards[1] && cards[1].scrollIntoView({ block: 'center' }) })
  await page.locator('.fg-cgcard').nth(1).hover()
  await sleep(500)
  await shot('02-chat-cg')

  // 标题画面
  await page.getByRole('button', { name: 'FlowGal' }).click()
  await sleep(2600)
  await shot('03-title')

  // 第 1 轮：琴房
  await page.locator('.fg-title-menu button', { hasText: '最新一幕' }).click()
  await sleep(500)
  await jumpTo('你终于来了')
  await sleep(1800)
  await shot('04-dialogue')
  await jumpTo('那就罚你')
  await sleep(2200)
  await shot('05-cg')
  // 竖版插画：摇到一半、拉远看全貌（把摇镜动画直接拨到那一刻）
  const panTo = async f => { await page.evaluate(f => { const a = document.querySelector('.fg-cg-pan')?.getAnimations()[0]; if (a) { a.pause(); a.currentTime = a.effect.getComputedTiming().duration * f } }, f); await sleep(300) }
  await panTo(0.4); await shot('35-cg-pan')
  await panTo(0.97); await shot('36-cg-pan-whole')

  // 第 2 轮：竹林、两人同框、萤火
  await jumpTo('好巧啊')
  await sleep(1800)
  await shot('06-two-actors')

  // 第 3 轮：便条卡片、暴雨
  await jumpTo('明天放学后')
  await sleep(2600)
  await shot('07-note-card')
  await jumpTo('到底想告诉我什么')
  await sleep(1400)
  await settle(900)
  await shot('08-choices')
  await page.keyboard.press('Escape')
  await sleep(400)

  // 面板
  await page.keyboard.press('l'); await sleep(900); await shot('09-backlog'); await page.keyboard.press('Escape'); await sleep(300)
  await click('.fg-quick button:has-text("CG")', 1400); await shot('10-gallery')
  await click('.fg-thumb-cap', 900); await shot('11-gallery-lightbox'); await page.mouse.click(30, 30); await sleep(400)
  await page.locator('.fg-btn:has-text("改词")').nth(1).click(); await sleep(900); await shot('12-prompt-editor')
  await page.locator('.fg-cg-chars').scrollIntoViewIfNeeded(); await sleep(300); await shot('37-prompt-editor-characters'); await page.keyboard.press('Escape'); await sleep(300)
  await click('.fg-quick button:has-text("CAST")', 1200); await shot('13-cast')
  await click('.fg-tab:has-text("档案变更")', 700); await shot('14-cast-log'); await page.keyboard.press('Escape'); await sleep(300)
  await click('.fg-quick button:has-text("CONFIG")', 1000); await shot('15-settings-look')
  await click('.fg-tab:has-text("生图渠道")', 800); await shot('16-settings-backend')
  await click('.fg-tab:has-text("画风")', 800); await shot('17-settings-style')
  await click('.fg-tab:has-text("配乐")', 900); await shot('29-settings-music')

  // 皮肤
  for (const [skin, label] of [['sakura', '樱色'], ['ink', '水墨'], ['noir', '夜金'], ['cyber', '赛博']]) {
    await click('.fg-tab:has-text("外观")', 400)
    await click(`.fg-skin:has-text("${label}")`, 700)
    await page.keyboard.press('Escape'); await sleep(300)
    await jumpTo('好巧啊')
    await sleep(1800)
    await shot('18-skin-' + skin)
    await click('.fg-quick button:has-text("CONFIG")', 600)
  }
  await click('.fg-tab:has-text("外观")', 400)
  await click('.fg-skin:has-text("星穹")', 500)
  await page.keyboard.press('Escape'); await sleep(300)
  await page.keyboard.press('Escape'); await sleep(600)

  // 前台先文本：新一轮刚写完，导演还在整理
  await page.evaluate(() => fetch('/preview/late', { method: 'POST' }))
  await sleep(2200)
  await page.evaluate(() => { const l = document.getElementById('log'); l.scrollTop = l.scrollHeight })
  await sleep(500)
  await shot('19-chat-directing')
  await page.locator('.fg-play', { hasText: '先看起来' }).click()
  await sleep(1800)
  await settle(800)
  await shot('20-theater-directing')
  // 导演日志：点「导演整理中」看实时输出；整理完看结果和实际发出的提示词
  await click('.fg-pill.is-link', 2600)
  await shot('22-director-live')
  await page.locator('.fg-dlog-row.is-on .fg-dlog-status.is-ok').waitFor({ timeout: 30000 })
  await sleep(1200)
  await shot('23-director-result')
  await click('.fg-dlog-tabs .fg-tab:has-text("提示词")', 700)
  await shot('24-director-prompt')
  await page.keyboard.press('Escape'); await sleep(300)
  // 立绘差分：第 4 轮林岚换了冬季制服；回到校服这套，补齐剧情里用到的情绪（含导演自创的复合情绪）
  await click('.fg-quick button:has-text("CAST")', 1200)
  await click('.fg-look:has-text("校服")', 500)
  await click('.fg-btn:has-text("补齐剧情里用到的差分")', 600)
  await page.locator('.fg-emo:has-text("害羞地强装镇定") img').first().waitFor({ timeout: 30000 })
  await page.waitForFunction(() => !document.querySelector('.fg-emo.is-busy'), null, { timeout: 30000 })
  await sleep(1200)
  await shot('30-cast-variants')
  await click('.fg-emo:has-text("害羞地强装镇定")', 800)
  await page.locator('.fg-variant').scrollIntoViewIfNeeded(); await sleep(400)
  await shot('31-sprite-variant')
  await click('.fg-btn:has-text("衣橱与状态")', 800)
  await page.locator('.fg-wardrobe').scrollIntoViewIfNeeded(); await sleep(300)
  await shot('32-wardrobe')
  await click('.fg-tab:has-text("情绪库")', 800); await shot('33-emotion-library')
  await page.keyboard.press('Escape'); await sleep(300)
  await click('.fg-quick button:has-text("DIR")', 1400)
  await click('.fg-dlog-row:has-text("立绘 · 林岚")', 900); await shot('34-director-sprite')
  await click('.fg-dlog-row:has-text("插画 · 第 2 轮")', 900); await shot('38-director-cg')
  await page.keyboard.press('Escape'); await sleep(300)
  // NovelAI V5：透明底立绘、引导缩放、种子
  await click('.fg-quick button:has-text("CONFIG")', 800)
  await click('.fg-tab:has-text("导演")', 800); await shot('25-settings-director')
  await click('.fg-tab:has-text("生图渠道")', 800)
  await page.locator('.fg-field', { hasText: '模型' }).locator('select').first().selectOption('nai-diffusion-5-full')
  await sleep(1200)
  await shot('26-settings-nai-v5')
  // 版本与更新：有新版本 → 一键更新 → 提示重启
  await click('.fg-tab:has-text("版本与更新")', 900); await shot('27-update-available')
  await click('.fg-btn:has-text("立即更新")', 2200); await shot('28-update-restart')
  await page.keyboard.press('Escape'); await sleep(300)
  await page.keyboard.press('Escape')
  await sleep(500)

  // 手机竖屏
  const phone = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
  await phone.goto(BASE)
  await sleep(2500)
  await phone.evaluate(() => { const b = [...document.querySelectorAll('.fg-play')].find(x => x.textContent.includes('进入剧场')); b && b.click() })
  await sleep(1200)
  await phone.keyboard.press('l'); await sleep(700)
  await phone.locator('.fg-log-item', { hasText: '好巧啊' }).first().click(); await sleep(400)
  await phone.locator('.fg-stage').click({ position: { x: 200, y: 300 } }); await sleep(1600)
  await phone.screenshot({ path: join(out, '21-mobile.png') })
  console.log('✓ 21-mobile')
} finally {
  await browser.close()
  server.kill('SIGTERM')
}
