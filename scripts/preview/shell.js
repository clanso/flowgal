// 模拟 Tavern 页面：侧栏、正文、媒体项、消息下方的按钮、输入框。插件通过假的 slots / tavernUi 接进来。
(function () {
  const h = React.createElement
  const slots = {}
  const media = {}
  const messageActions = []
  const composerActions = []
  const ctx = {
    slots: {
      inject(name, fn) { fn() },
      register(opts, Component) { (slots[opts.name] = slots[opts.name] || []).push({ opts, Component }); return () => {} },
    },
    effect(fn) { fn() },
    inject(names, fn) {
      fn({
        effect() {},
        tavernUi: {
          apiVersion: 1,
          registerMediaRenderer(kind, render) { media[kind] = render; return () => {} },
          registerMessageAction(a) { messageActions.push(a); return () => {} },
          registerComposerAction(a) { composerActions.push(a); return () => {} },
          registerTextMarker() { return () => {} },
        },
      })
    },
  }
  const plugin = window.__plugins.find(p => p.id === 'flowgal').mod
  plugin.apply(ctx)

  function Seat({ name }) { return h(React.Fragment, null, (slots[name] || []).map(s => h(s.Component, { key: s.opts.id, wide: true }))) }

  function Paragraphs({ text, items, gameId, turn }) {
    const paras = text.split('\n')
    const placed = new Set()
    const after = i => items.filter(it => !placed.has(it.id) && it.anchor && paras[i].includes(it.anchor.slice(0, 8)) && placed.add(it.id))
    const out = []
    paras.forEach((p, i) => {
      out.push(h('p', { key: 'p' + i, className: 'para' }, p))
      for (const it of after(i)) out.push(h('div', { key: it.id }, renderItem(it, gameId, turn)))
    })
    for (const it of items) if (!placed.has(it.id)) out.push(h('div', { key: it.id }, renderItem(it, gameId, turn)))
    return out
  }
  function renderItem(item, gameId, turn) { const r = media[item.kind]; return r ? r({ item, gameId, turn }) : null }

  function App() {
    const [chat, setChat] = React.useState(null)
    React.useEffect(() => {
      let alive = true
      const load = () => fetch('/preview/chat').then(r => r.json()).then(d => { if (alive) setChat(d) }).catch(() => {})
      load()
      const t = setInterval(load, 1000)
      return () => { alive = false; clearInterval(t) }
    }, [])
    if (!chat) return h('div', { className: 'note' }, '加载中…')
    const last = chat.turns[chat.turns.length - 1]
    return h('div', { className: 'app' },
      h('aside', { className: 'side' },
        h('div', { className: 'brand' }, 'DSH Tavern', h('small', null, '预览外壳 · 模拟 Tavern 页面')),
        h('div', { className: 'chat-item' }, chat.card.name, h('small', null, `${chat.turns.length} 轮`)),
        h('div', { className: 'side-foot' }, h(Seat, { name: 'sidebar.footer.action' }))),
      h('main', { className: 'main' },
        h('div', { className: 'head' }, chat.card.name, h('small', null, '· 角色卡')),
        h('div', { className: 'log', id: 'log' },
          chat.turns.map(t => h(React.Fragment, { key: t.turn },
            h('div', { className: 'msg user' }, h('div', { className: 'bubble' }, t.user)),
            h('div', { className: 'msg' },
              h('div', { className: 'who' }, `${chat.card.name} · 第 ${t.turn} 轮`),
              h(Paragraphs, { text: t.text, items: t.items, gameId: chat.gameId, turn: t.turn }),
              h('div', { className: 'actions' }, messageActions.filter(a => !a.when || a.when({ gameId: chat.gameId, turn: t.turn, settled: true })).map(a =>
                h('button', { key: a.id, type: 'button', onClick: () => a.run({ gameId: chat.gameId, turn: t.turn, settled: true }) }, a.label))))))),
        h('div', { className: 'composer' }, h('div', { className: 'composer-inner' },
          h('textarea', { placeholder: '输入你的行动……' }),
          h('div', { className: 'composer-actions' },
            composerActions.map(a => h('button', { key: a.id, type: 'button', onClick: () => a.run({ gameId: chat.gameId, turn: last && last.turn, busy: false }) }, a.label)),
            h('button', { type: 'button', className: 'send' }, '发送'))))),
      h(Seat, { name: 'shell.overlay' }))
  }
  ReactDOM.createRoot(document.getElementById('root')).render(h(App))
})()
