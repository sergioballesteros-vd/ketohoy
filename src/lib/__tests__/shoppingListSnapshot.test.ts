import { describe, expect, it } from 'vitest'
import { makeShoppingListSnapshot, parseShoppingListSnapshot, snapshotKey } from '../shoppingListSnapshot'
import type { ShoppingItem } from '@/app/shopping-list/page'

const item: ShoppingItem = {
  id: 'row-1', name: 'Calabacín', quantity: '2', purchaseQuantity: 2, requiredQuantity: 400,
  requiredUnit: 'g', originalIngredientText: '400 g calabacín', sourceKey: '["meal"]', checked: false,
  reason: 'cena', productId: 'private-product-id',
  product: { packageQuantity: 200, packageUnit: 'g', mercadonaId: 'catalog-1', unitPrice: 1.2, imageUrl: '/private.png', category: 'vegetables' },
}

describe('shopping list snapshots', () => {
  it('keeps a small display-only allowlist and preserves unknown quantities', () => {
    const saved = makeShoppingListSnapshot('account-a', [item], '2026-10-08T12:30:00.000Z')
    expect(saved).toEqual({
      version: 1, accountId: 'account-a', capturedAt: '2026-10-08T12:30:00.000Z',
      items: [{ id: 'row-1', name: 'Calabacín', purchaseQuantity: 2, requiredQuantity: 400, requiredUnit: 'g', originalIngredientText: '400 g calabacín', checked: false, product: { packageQuantity: 200, packageUnit: 'g' } }],
    })
    expect(JSON.stringify(saved)).not.toContain('sourceKey')
    expect(JSON.stringify(saved)).not.toContain('productId')
    expect(JSON.stringify(saved)).not.toContain('reason')
    expect(JSON.stringify(saved)).not.toContain('unitPrice')
    expect(JSON.stringify(saved)).not.toContain('email')
    expect(parseShoppingListSnapshot(JSON.stringify(saved), 'account-a')).toEqual(saved)
  })

  it('accepts a valid empty list and keeps capture time from the response', () => {
    const saved = makeShoppingListSnapshot('account-a', [], '2026-10-08T12:30:00.000Z')
    expect(saved.items).toEqual([])
    expect(saved.capturedAt).toBe('2026-10-08T12:30:00.000Z')
  })

  it('rejects snapshots from another account, unknown versions, corrupt payloads, and invalid dates', () => {
    const saved = makeShoppingListSnapshot('account-a', [item], '2026-10-08T12:30:00.000Z')
    expect(parseShoppingListSnapshot(JSON.stringify(saved), 'account-b')).toBeNull()
    expect(parseShoppingListSnapshot(JSON.stringify({ ...saved, version: 2 }), 'account-a')).toBeNull()
    expect(parseShoppingListSnapshot('{', 'account-a')).toBeNull()
    expect(parseShoppingListSnapshot(JSON.stringify({ ...saved, capturedAt: 'not a date' }), 'account-a')).toBeNull()
    expect(parseShoppingListSnapshot(null, 'account-a')).toBeNull()
  })

  it('names each account snapshot independently', () => {
    expect(snapshotKey('account-a')).not.toBe(snapshotKey('account-b'))
  })
})
