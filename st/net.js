// 酒馆宿主：出图、下载模型这些「浏览器去连别的服务器」的请求怎么发。
// 浏览器直接连别的站要对方允许跨域（CORS）。NovelAI 官方允许（柏宝绘就是直连）；本机的 ComfyUI、WebUI 默认不允许，
// 这时走酒馆自带的转发 /proxy/<地址>（config.yaml 的 enableCorsProxy 打开才有；它只转 JSON 请求体，所以上传文件这类还是直连）。
const DIRECT = new Set(['https://image.novelai.net', 'https://api.novelai.net'])
const PROXY = '/proxy/'

/** 酒馆的转发开没开：用一个不存在的地址探一下，关着的时候酒馆回 404「CORS proxy is disabled」。 */
const probeProxy = fetchImpl => fetchImpl(PROXY + 'https://flowgal-cors-probe.invalid/', { cache: 'no-store' })
  .then(async res => !(res.status === 404 && /CORS proxy is disabled/i.test(await res.text().catch(() => ''))))
  .catch(() => false)

const isJsonBody = body => body == null || typeof body === 'string'

/**
 * 出图用的 fetch：同源、NovelAI 官方、非 JSON 请求体 → 直连；其余能转发就走酒馆的 /proxy/，不能就直连（对方要自己开跨域）。
 */
export function createNetFetch({ fetchImpl = (...a) => fetch(...a), origin = globalThis.location?.origin || '' } = {}) {
  let proxy = null // 只探一次
  const proxyEnabled = () => (proxy = proxy || probeProxy(fetchImpl))
  return async function netFetch(url, init = {}) {
    let target
    try { target = new URL(String(url), origin || undefined) } catch { return fetchImpl(url, init) }
    const direct = !/^https?:$/.test(target.protocol) || target.origin === origin || DIRECT.has(target.origin) || !isJsonBody(init.body)
    if (direct || !(await proxyEnabled())) return fetchImpl(url, init)
    return fetchImpl(PROXY + target.href, init)
  }
}
