import type { Prisma, ShoppingListItem } from '@/generated/prisma/client'
import { ApiError } from '@/lib/apiError'
import { accessibleProducts } from '@/lib/productAccess'
import { convertQuantity, normalizeUnit, positiveQuantity } from '@/lib/quantities'

type BoughtItem = ShoppingListItem

/** Callers own a single transaction for checked + stock + exact reversal record. */
export async function addBoughtToPantry(tx: Prisma.TransactionClient, userId: string, item: BoughtItem) {
  let product = item.productId ? await tx.product.findFirst({ where: { id: item.productId, ...accessibleProducts(userId) } }) : null
  if (item.productId && !product) throw new ApiError('Product not found', 404)
  if (!product) {
    product = await tx.product.findFirst({ where: { source: 'manual', ownerId: userId, name: item.name } }) ??
      await tx.product.create({ data: { name: item.name, category: 'other', source: 'manual', ownerId: userId } })
  }
  const count = item.purchaseQuantity
  if (count !== null) positiveQuantity.parse(count)
  const knownPackage = product.packageQuantity != null && !!product.packageUnit &&
    positiveQuantity.safeParse(product.packageQuantity).success
  const quantity = count === null ? null : knownPackage ? positiveQuantity.parse(count * product.packageQuantity!) : count
  const unit = quantity === null ? null : knownPackage ? normalizeUnit(product.packageUnit!) : 'paquete'
  const stock = await tx.pantryItem.findMany({ where: { userId, productId: product.id } })
  // Unknown stock is not zero. Incompatible dimensions always get their own row.
  const existing = quantity === null ? null : stock.find(p => p.quantity !== null && p.unit && convertQuantity(quantity, unit!, p.unit) !== null)
  const delta = existing ? convertQuantity(quantity!, unit!, existing.unit!)! : quantity
  const row = existing
    ? await tx.pantryItem.update({ where: { id: existing.id }, data: { quantity: positiveQuantity.parse(existing.quantity! + delta!) } })
    : await tx.pantryItem.create({ data: { userId, productId: product.id, quantity, unit } })
  await tx.shoppingListItem.update({ where: { id: item.id }, data: {
    productId: product.id, pantryItemId: row.id, pantryDelta: delta ?? 0,
    pantryDeltaUnit: row.unit, pantryCreated: !existing,
  } })
}

export async function removeBoughtFromPantry(tx: Prisma.TransactionClient, userId: string, item: BoughtItem) {
  // Legacy without row/dimension evidence cannot safely subtract a physical quantity.
  if (item.pantryItemId) {
    const row = await tx.pantryItem.findFirst({ where: { id: item.pantryItemId, productId: item.productId ?? undefined, userId } })
    if (row) {
      if (item.pantryDelta === 0 && item.pantryCreated && row.quantity === null && row.unit === null) {
        await tx.pantryItem.delete({ where: { id: row.id } })
      } else if (item.pantryDelta != null && item.pantryDelta > 0 && item.pantryDeltaUnit && row.unit) {
        const delta = convertQuantity(item.pantryDelta, item.pantryDeltaUnit, row.unit)
        if (delta === null) throw new ApiError('Stock unit changed; restore a compatible unit before un-buying', 409)
        const left = (row.quantity ?? 0) - delta
        if (left > 0) await tx.pantryItem.update({ where: { id: row.id }, data: { quantity: left } })
        else if (item.pantryCreated) await tx.pantryItem.delete({ where: { id: row.id } })
        else await tx.pantryItem.update({ where: { id: row.id }, data: { quantity: null } })
      } else if (item.pantryDelta && row.unit !== item.pantryDeltaUnit) {
        throw new ApiError('Stock unit changed; restore a compatible unit before un-buying', 409)
      }
    }
  }
  await tx.shoppingListItem.update({ where: { id: item.id }, data: {
    pantryDelta: null, pantryCreated: false, pantryItemId: null, pantryDeltaUnit: null,
  } })
}
