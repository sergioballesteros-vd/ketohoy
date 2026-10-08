import type { ShoppingItem } from '@/app/shopping-list/page'

export const SHOPPING_SNAPSHOT_VERSION = 1
export const SHOPPING_ACTIVE_ACCOUNT_KEY = 'ketohoy:shoppingList:activeAccount'
const SNAPSHOT_PREFIX = 'ketohoy:shoppingList:snapshot:'
const SESSION_RESET_CHANNEL = 'ketohoy:session-reset'

export type ShoppingListSnapshot = {
  version: 1
  accountId: string
  capturedAt: string
  items: {
    id: string
    name: string
    purchaseQuantity: number | null
    requiredQuantity: number | null
    requiredUnit: string | null
    originalIngredientText: string | null
    checked: boolean
    product: { packageQuantity: number | null; packageUnit: string | null } | null
  }[]
}

export const snapshotKey = (accountId: string) => `${SNAPSHOT_PREFIX}${accountId}`

export function makeShoppingListSnapshot(accountId: string, items: ShoppingItem[], capturedAt = new Date().toISOString()): ShoppingListSnapshot {
  return {
    version: SHOPPING_SNAPSHOT_VERSION,
    accountId,
    capturedAt,
    items: items.map(({ id, name, purchaseQuantity, requiredQuantity, requiredUnit, originalIngredientText, checked, product }) => ({
      id, name, purchaseQuantity, requiredQuantity, requiredUnit, originalIngredientText, checked,
      product: product && { packageQuantity: product.packageQuantity, packageUnit: product.packageUnit },
    })),
  }
}

export function parseShoppingListSnapshot(value: string | null, accountId: string): ShoppingListSnapshot | null {
  try {
    const snapshot: unknown = JSON.parse(value ?? 'null')
    if (!snapshot || typeof snapshot !== 'object') return null
    const candidate = snapshot as ShoppingListSnapshot
    if (candidate.version !== SHOPPING_SNAPSHOT_VERSION || candidate.accountId !== accountId ||
      typeof candidate.capturedAt !== 'string' || !Number.isFinite(Date.parse(candidate.capturedAt)) || !Array.isArray(candidate.items) ||
      !candidate.items.every(item => item && typeof item.id === 'string' && typeof item.name === 'string' && typeof item.checked === 'boolean')) return null
    return candidate
  } catch {
    return null
  }
}

export function clearShoppingListSnapshots() {
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i)
      if (key === SHOPPING_ACTIVE_ACCOUNT_KEY || key?.startsWith(SNAPSHOT_PREFIX)) localStorage.removeItem(key)
    }
  } catch { /* Browser storage can be disabled. */ }
  try { new BroadcastChannel(SESSION_RESET_CHANNEL).postMessage('logout') } catch { /* BroadcastChannel is optional. */ }
}

export function subscribeToSessionReset(onReset: () => void) {
  try {
    const channel = new BroadcastChannel(SESSION_RESET_CHANNEL)
    channel.onmessage = onReset
    return () => channel.close()
  } catch {
    const onStorage = (event: StorageEvent) => {
      if (event.key === SHOPPING_ACTIVE_ACCOUNT_KEY && event.newValue === null) onReset()
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }
}
