(() => {
  const ACTIVE = 'ketohoy:shoppingList:activeAccount'
  const PREFIX = 'ketohoy:shoppingList:snapshot:'
  const status = document.querySelector('#status')
  const list = document.querySelector('#items')
  const read = () => {
    try {
      const accountId = localStorage.getItem(ACTIVE)
      const value = accountId && JSON.parse(localStorage.getItem(PREFIX + accountId) || 'null')
      if (!value || value.version !== 1 || value.accountId !== accountId || !Number.isFinite(Date.parse(value.capturedAt)) || !Array.isArray(value.items)) return null
      return value
    } catch { return null }
  }
  const text = (tag, value, className) => {
    const element = document.createElement(tag)
    element.textContent = value
    if (className) element.className = className
    return element
  }
  const render = (snapshot, sessionEnded = false) => {
    const title = sessionEnded ? 'La sesión ha terminado' : navigator.onLine ? 'No se pudo actualizar' : 'Sin conexión'
    const description = sessionEnded ? 'Conéctate e inicia sesión para volver a consultar tu lista.' : navigator.onLine ? 'No se pudo confirmar la conexión con el servidor. Esta copia puede estar desactualizada.' : 'Estás viendo la última copia guardada de tu lista. Puedes consultarla, pero no modificarla hasta recuperar la conexión.'
    status.replaceChildren(text('strong', title))
    status.append(text('p', description))
    if (snapshot) {
      const time = text('time', `Última copia guardada: ${new Date(snapshot.capturedAt).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' })}`)
      time.dateTime = snapshot.capturedAt
      status.append(time)
    }
    const retry = text('button', 'Reintentar')
    retry.type = 'button'
    retry.addEventListener('click', refresh)
    status.append(retry)
    list.replaceChildren()
    if (!snapshot) {
      list.append(text('p', 'No hay una copia disponible sin conexión. Abre la lista con conexión para guardar una copia.', 'empty'))
      return
    }
    if (!snapshot.items.length) {
      list.append(text('p', 'Tu lista estaba vacía cuando se guardó la copia.', 'empty'))
      return
    }
    const pending = snapshot.items.filter(item => !item.checked)
    const bought = snapshot.items.filter(item => item.checked)
    for (const [title, items] of [['Pendiente', pending], ['Comprado · en tu despensa', bought]]) {
      if (!items.length) continue
      const section = document.createElement('section')
      section.append(text('h2', title))
      const ul = document.createElement('ul')
      ul.style.cssText = 'margin:0;padding:0'
      for (const item of items) {
        const row = document.createElement('li')
        row.className = 'row'
        row.append(text('span', item.name, 'name'))
        row.append(text('span', item.requiredQuantity != null && item.requiredUnit ? `Necesidad: ${item.requiredQuantity} ${item.requiredUnit}` : item.originalIngredientText ? `Necesidad: ${item.originalIngredientText}` : 'Cantidad necesaria no especificada', 'detail'))
        row.append(text('span', item.product?.packageQuantity != null && item.product.packageUnit ? `Envase: ${item.product.packageQuantity} ${item.product.packageUnit}` : 'Contenido del envase no especificado', 'detail'))
        row.append(text('span', item.purchaseQuantity != null ? `Compra: ${item.purchaseQuantity} ${item.purchaseQuantity === 1 ? 'paquete' : 'paquetes'}` : 'Paquetes por elegir', 'detail'))
        ul.append(row)
      }
      section.append(ul)
      list.append(section)
    }
  }
  async function refresh() {
    try {
      const identity = await fetch('/api/auth/me', { cache: 'no-store' })
      if (identity.status === 401 || identity.status === 403) {
        clear()
        render(null, true)
        return
      }
      if (!identity.ok) throw new Error('identity')
      const { id } = await identity.json()
      if (typeof id !== 'string' || !id) throw new Error('identity')
      const response = await fetch('/api/shopping-list', { cache: 'no-store' })
      if (response.status === 401 || response.status === 403) {
        clear()
        render(null, true)
        return
      }
      if (!response.ok) throw new Error('list')
      const items = await response.json()
      if (!Array.isArray(items) || !items.every(item => item && typeof item.id === 'string' && typeof item.name === 'string' && typeof item.checked === 'boolean')) throw new Error('payload')
      const oldAccount = localStorage.getItem(ACTIVE)
      if (oldAccount && oldAccount !== id) clear()
      const snapshot = { version: 1, accountId: id, capturedAt: new Date().toISOString(), items: items.map(({ id: itemId, name, purchaseQuantity, requiredQuantity, requiredUnit, originalIngredientText, checked, product }) => ({ id: itemId, name, purchaseQuantity, requiredQuantity, requiredUnit, originalIngredientText, checked, product: product && { packageQuantity: product.packageQuantity, packageUnit: product.packageUnit } })) }
      localStorage.setItem(PREFIX + id, JSON.stringify(snapshot))
      localStorage.setItem(ACTIVE, id)
      location.reload()
    } catch {
      render(read())
    }
  }
  function clear() {
    try { for (let i = localStorage.length - 1; i >= 0; i--) { const key = localStorage.key(i); if (key === ACTIVE || key?.startsWith(PREFIX)) localStorage.removeItem(key) } } catch {}
  }
  const channel = 'BroadcastChannel' in self ? new BroadcastChannel('ketohoy:session-reset') : null
  if (channel) channel.onmessage = () => { clear(); render(null, true) }
  window.addEventListener('storage', event => { if (event.key === ACTIVE && event.newValue === null) render(null, true) })
  render(read())
  if (navigator.onLine) void refresh()
  window.addEventListener('online', () => void refresh())
})()
