// 插件自更新：插件目录在一个 git 克隆里（README 推荐的装法）时，剧场里可以检查更新、一键快进到远端最新。
// 只跑参数固定的 git 命令，不接受浏览器传来的路径或参数；只做快进，不覆盖本地改动。
// Node 已经加载的代码不会热替换：更新后要重启 DSH 才会用上新版本。
import { execFile } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join, relative } from 'node:path'

export const PLUGIN_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
/** 自动检查的最短间隔。 */
const AUTO_INTERVAL = 12 * 3600 * 1000
/** 远端分支没了（PR 合并后删分支）时改跟这个分支。 */
const FALLBACK_BRANCH = 'main'

function runGit(args, cwd, timeout = 30000) {
  return new Promise((resolve, reject) => {
    execFile('git', args, {
      cwd, timeout, windowsHide: true, maxBuffer: 4 * 1024 * 1024,
      // 不弹终端问账号密码（会卡住）；输出用英文，方便认出「远端分支不存在」。
      env: { ...process.env, GIT_TERMINAL_PROMPT: '0', LC_ALL: 'C' },
    }, (error, stdout, stderr) => {
      if (!error) return resolve(String(stdout).trim())
      const message = error.code === 'ENOENT' ? '找不到 git 命令' : error.killed ? 'git 超时' : String(stderr || error.message).trim()
      reject(Object.assign(new Error(message.slice(0, 600)), { code: error.code }))
    })
  })
}

export function createUpdater({ root = PLUGIN_ROOT, now = Date.now } = {}) {
  // 插件启动时的版本：磁盘上的版本和它不一样，说明已经更新过、还没重启。
  const loaded = runGit(['rev-parse', 'HEAD'], root).catch(() => '')
  let last = null // 上次检查远端的结果
  let busy = null

  async function local() {
    const top = await runGit(['rev-parse', '--show-toplevel'], root).catch(error => { if (error.code === 'ENOENT') throw error; return '' })
    if (!top) return null
    const git = args => runGit(args, top)
    // 插件被复制进了别人的 git 仓库（比如某个配置目录）时不算：插件文件必须是这个仓库里跟踪的文件。
    const pluginDir = relative(top, root).replace(/\\/g, '/') || '.'
    if (!await git(['ls-files', '--error-unmatch', `${pluginDir}/package.json`]).then(() => true, () => false)) return null
    const [head, branch, upstream] = await Promise.all([
      git(['log', '-1', '--format=%H%x09%ct%x09%s']),
      git(['rev-parse', '--abbrev-ref', 'HEAD']),
      git(['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}']).catch(() => ''),
    ])
    const [sha, time, subject] = head.split('\t')
    const slash = upstream.indexOf('/')
    return {
      top, git, sha, time: Number(time) * 1000, subject, branch,
      remote: slash > 0 ? upstream.slice(0, slash) : 'origin',
      remoteBranch: slash > 0 ? upstream.slice(slash + 1) : branch,
      pluginDir,
    }
  }

  /** 拉远端（只取跟踪的那一个分支），算落后几个提交、哪些提交动了插件目录。 */
  async function check(info) {
    const { git } = info
    const result = { checkedAt: now(), remote: info.remote, remoteBranch: info.remoteBranch, behind: 0, ahead: 0, commits: [], error: '', gone: false, fallback: '' }
    try {
      await runGit(['fetch', '--quiet', info.remote, `${info.remoteBranch}`], info.top, 120000)
    } catch (error) {
      if (!/couldn't find remote ref/i.test(error.message)) return { ...result, error: '检查失败：' + error.message }
      // 跟踪的分支在远端已经删了：多半是 PR 合并了，看看 main 在不在。
      const fallback = await git(['ls-remote', '--heads', info.remote, FALLBACK_BRANCH]).catch(() => '')
      return { ...result, gone: true, fallback: fallback ? FALLBACK_BRANCH : '', error: `远端已经没有 ${info.remoteBranch} 分支了` }
    }
    const [behind, ahead, log] = await Promise.all([
      git(['rev-list', '--count', 'HEAD..FETCH_HEAD']),
      git(['rev-list', '--count', 'FETCH_HEAD..HEAD']),
      git(['log', '-n', '30', '--format=%h%x09%ct%x09%s', 'HEAD..FETCH_HEAD', '--', info.pluginDir]),
    ])
    const commits = log ? log.split('\n').map(line => { const [sha, time, subject] = line.split('\t'); return { sha, time: Number(time) * 1000, subject } }) : []
    return { ...result, behind: Number(behind), ahead: Number(ahead), commits, target: await git(['rev-parse', '--short', 'FETCH_HEAD']) }
  }

  async function view(info) {
    const start = await loaded
    return {
      managed: true,
      current: { sha: info.sha.slice(0, 7), time: info.time, subject: info.subject, branch: info.branch, tracking: `${info.remote}/${info.remoteBranch}` },
      restartRequired: Boolean(start) && start !== info.sha,
      last,
    }
  }

  /** mode：none 只看本地；auto 距上次检查超过 12 小时才拉远端；force 立即拉。 */
  async function status(mode = 'none') {
    let info
    try { info = await local() } catch (error) { return { managed: false, reason: error.message } }
    if (!info) return { managed: false, reason: '插件目录不是 git 克隆（比如从压缩包或 npm 装的），不能在这里更新。' }
    if (mode === 'force' || (mode === 'auto' && (!last || now() - last.checkedAt > AUTO_INTERVAL))) last = await check(info)
    return view(info)
  }

  /** 一次只跑一个更新动作。 */
  const exclusive = fn => {
    if (busy) throw new Error('正在更新，稍等')
    busy = fn().finally(() => { busy = null })
    return busy
  }

  /** 快进到远端最新。本地有没推送的提交（分叉）时拒绝；会被覆盖的本地改动由 git 自己拦下。 */
  const apply = () => exclusive(async () => {
    const info = await local()
    if (!info) throw new Error('插件目录不是 git 克隆，不能在这里更新')
    last = await check(info)
    if (last.error) throw new Error(last.error)
    if (!last.behind) return view(info)
    if (last.ahead) throw new Error(`本地有 ${last.ahead} 个没推送的提交，和远端分叉了，不能自动更新；请在终端里处理`)
    await info.git(['merge', '--ff-only', 'FETCH_HEAD'])
    last = { ...last, behind: 0, commits: [], checkedAt: now() }
    return view(await local())
  })

  /** 跟踪的分支在远端没了：切到 main 并更新到最新。 */
  const switchToFallback = () => exclusive(async () => {
    const info = await local()
    if (!info) throw new Error('插件目录不是 git 克隆，不能在这里更新')
    const { git, remote } = info
    await runGit(['fetch', '--quiet', remote, `+refs/heads/${FALLBACK_BRANCH}:refs/remotes/${remote}/${FALLBACK_BRANCH}`], info.top, 120000)
    // main 上还没有插件（PR 没合并就删了分支）时切过去会把插件文件删掉，不切。
    const present = await git(['cat-file', '-e', `${remote}/${FALLBACK_BRANCH}:${info.pluginDir}/package.json`]).then(() => true, () => false)
    if (!present) throw new Error(`${FALLBACK_BRANCH} 分支上还没有这个插件，先不切换`)
    const hasLocal = await git(['rev-parse', '--verify', '--quiet', 'refs/heads/' + FALLBACK_BRANCH]).then(() => true, () => false)
    if (hasLocal) {
      await git(['switch', FALLBACK_BRANCH])
      await git(['merge', '--ff-only', `${remote}/${FALLBACK_BRANCH}`])
    } else {
      await git(['switch', '-c', FALLBACK_BRANCH, '--track', `${remote}/${FALLBACK_BRANCH}`])
    }
    const next = await local()
    last = await check(next)
    return view(next)
  })

  return { status, apply, switchToFallback }
}
