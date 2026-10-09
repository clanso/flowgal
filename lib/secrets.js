// 密钥：优先存 DSH 凭据服务；宿主没有该服务时退回插件目录下 0600 权限的 secrets.json。
// 密钥只在宿主侧使用，绝不返回给浏览器（浏览器只看得到「已填写」）。
export function createSecrets({ store, getCredentials }) {
  const service = () => {
    const c = getCredentials?.()
    return c && typeof c.resolve === 'function' && typeof c.set === 'function' ? c : null
  }
  return {
    async get(ref) {
      const c = service()
      if (c) {
        try { const r = await c.resolve(ref); if (r?.value) return String(r.value) } catch {}
      }
      const file = await store.readSecrets()
      return typeof file[ref] === 'string' ? file[ref] : ''
    },
    async set(ref, value) {
      if (!/^[A-Z0-9_]{1,96}$/.test(ref)) throw new Error('凭据名不合法')
      const text = String(value ?? '').trim()
      if (/[\r\n]/.test(text)) throw new Error('Key 里不能有换行')
      const c = service()
      if (c) {
        const info = await c.describe?.(ref).catch?.(() => null)
        if (info?.source === 'env' || info?.writable === false) throw new Error(`${ref} 来自只读环境变量，请在启动 DSH 的环境里修改`)
        await c.set(ref, text)
        // 迁移：凭据服务可用后，清掉旧的文件副本。
        await store.updateSecrets(s => { delete s[ref] })
        return
      }
      await store.updateSecrets(s => { if (text) s[ref] = text; else delete s[ref] })
    },
    async has(ref) { return Boolean(await this.get(ref)) },
    storage: () => (service() ? 'DSH 凭据服务' : '插件目录 secrets.json'),
  }
}
