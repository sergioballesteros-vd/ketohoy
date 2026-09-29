import { db } from '@/lib/db'
import { parseShoppingQuantity } from '@/lib/shoppingList'

type BoughtItem = {
  id: string
  name: string
  quantity: string | null
  productId: string | null
  pantryDelta?: number | null
  pantryCreated?: boolean
}

/**
 * Buying a shopping-list item moves it into the pantry: the bought quantity is added to what is there
 * (or the row is created). What that did is recorded on the list item (pantryDelta = amount added,
 * pantryCreated = this purchase created the row) so un-buying can undo exactly that, including the
 * case of a pantry row that existed without quantity.
 *
 * Manual list items have no product, so one is created (category "other") and linked to the item.
 * Callers must only call this on the unchecked -> checked transition (see the compare-and-set in the routes).
 */
export async function addBoughtToPantry(userId: string, item: BoughtItem) {
  await db.$transaction(async tx => {
    let productId = item.productId
    if (!productId) {
      const product =
        (await tx.product.findFirst({ where: { source: 'manual', name: item.name } })) ??
        (await tx.product.create({ data: { name: item.name, category: 'other', source: 'manual' } }))
      productId = product.id
    }

    const qty = parseShoppingQuantity(item.quantity, 1)
    const existing = await tx.pantryItem.findFirst({ where: { userId, productId } })
    if (existing) {
      await tx.pantryItem.update({ where: { id: existing.id }, data: { quantity: (existing.quantity ?? 0) + qty } })
    } else {
      await tx.pantryItem.create({ data: { userId, productId, quantity: qty } })
    }
    await tx.shoppingListItem.update({
      where: { id: item.id },
      data: { productId, pantryDelta: qty, pantryCreated: !existing },
    })
  })
}

/**
 * Reverse of addBoughtToPantry (un-check). Never leaves a negative quantity:
 *  - created by the purchase and nothing left  -> row removed
 *  - existed before (maybe without quantity)   -> quantity reduced, or back to "no quantity"
 * Items bought before purchases were tracked (pantryDelta null) fall back to their list quantity and
 * cannot tell whether the row pre-existed: a row with no quantity is left alone, an emptied one is removed.
 */
export async function removeBoughtFromPantry(userId: string, item: BoughtItem) {
  if (!item.productId) return
  await db.$transaction(async tx => {
    const tracked = item.pantryDelta != null
    const delta = tracked ? item.pantryDelta! : parseShoppingQuantity(item.quantity, 1)
    const existing = await tx.pantryItem.findFirst({ where: { userId, productId: item.productId! } })

    if (existing && (tracked || existing.quantity != null)) {
      const left = (existing.quantity ?? 0) - delta
      const created = tracked ? item.pantryCreated : true
      if (left > 0) await tx.pantryItem.update({ where: { id: existing.id }, data: { quantity: left } })
      else if (created) await tx.pantryItem.delete({ where: { id: existing.id } })
      else await tx.pantryItem.update({ where: { id: existing.id }, data: { quantity: null } })
    }
    await tx.shoppingListItem.update({ where: { id: item.id }, data: { pantryDelta: null, pantryCreated: false } })
  })
}
