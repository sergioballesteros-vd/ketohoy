import { NextResponse } from 'next/server'
import { z } from 'zod'
import { accessibleProducts } from '@/lib/productAccess'
import { db } from '@/lib/db'
import { requireUserId } from '@/lib/auth'
import { ApiError, withErrorHandling } from '@/lib/apiError'
import { formatShoppingQuantity } from '@/lib/shoppingList'
import { positiveQuantity, quantityPair } from '@/lib/quantities'

const boundedQuantity = z.number().finite().positive().max(10000)
const boundedQuantityInput = z.union([
  boundedQuantity,
  z.string().trim().min(1).transform(Number).pipe(boundedQuantity),
])

const createShoppingItemSchema = z.object({
  name: z.string().trim().min(1).max(120),
  restore: z.boolean().optional(),
  quantity: boundedQuantityInput.optional(),
  purchaseQuantity: boundedQuantity.nullable().optional(),
  legacyQuantity: z.string().max(80).nullable().optional(),
  requiredQuantity: boundedQuantity.nullable().optional(),
  requiredUnit: z.string().trim().min(1).max(32).nullable().optional(),
  originalIngredientText: z.string().max(300).nullable().optional(),
  productId: z.string().min(1).max(100).nullable().optional(),
  reason: z.string().max(500).nullable().optional(),
}).superRefine((p, ctx) => {
  if (!quantityPair.safeParse({ quantity: p.requiredQuantity ?? null, unit: p.requiredUnit ?? null }).success)
    ctx.addIssue({ code: 'custom', message: 'Required quantity and unit must both be specified' })
  if (p.legacyQuantity !== undefined && p.purchaseQuantity !== null)
    ctx.addIssue({ code: 'custom', message: 'Legacy text requires an explicitly unknown purchase quantity' })
  if (p.quantity !== undefined && p.purchaseQuantity !== undefined && p.quantity !== p.purchaseQuantity)
    ctx.addIssue({ code: 'custom', message: 'Conflicting purchase quantities' })
})

const deleteShoppingItemsSchema = z.object({
  ids: z.array(z.string().min(1)).min(1),
})

export const GET = withErrorHandling(async () => {
  const items = await db.shoppingListItem.findMany({
    where: { userId: await requireUserId() },
    include: { product: true },
    orderBy: [{ checked: 'asc' }, { createdAt: 'desc' }],
  })
  return NextResponse.json(items)
})

export const POST = withErrorHandling(async (request: Request) => {
  const userId = await requireUserId()
  const { name, quantity, purchaseQuantity, legacyQuantity, requiredQuantity, requiredUnit, originalIngredientText, productId, reason, restore } = createShoppingItemSchema.parse(await request.json())

  if (productId && !(await db.product.findFirst({ where: { id: productId, ...accessibleProducts(userId) }, select: { id: true } }))) {
    throw new ApiError('Product not found', 404)
  }

  const count = purchaseQuantity === null ? null : purchaseQuantity ?? quantity ?? 1
  const result = await db.$transaction(async tx => {
    // Manual/catalog additions represent additional packages; never merge with generated needs or legacy.
    const existing = await tx.shoppingListItem.findFirst({ where: {
      userId, checked: false, sourceType: restore && count === null ? 'legacy' : 'manual',
      requiredQuantity: restore ? requiredQuantity ?? null : null,
      ...(restore ? { requiredUnit: requiredUnit ?? null } : {}),
      originalIngredientText: restore ? originalIngredientText ?? null : null,
      ...(productId ? { productId } : { name }),
    } })
    if (restore && existing) return { item: existing, status: 200 }
    if (existing && count !== null && requiredQuantity == null && originalIngredientText == null) {
      const next = positiveQuantity.parse((existing.purchaseQuantity ?? 0) + count)
      return { item: await tx.shoppingListItem.update({ where: { id: existing.id }, data: {
        purchaseQuantity: next, quantity: formatShoppingQuantity(next), reason: reason ?? existing.reason,
      }, include: { product: true } }), status: 200 }
    }
    return { item: await tx.shoppingListItem.create({ data: {
      userId, name, productId: productId ?? null, reason: reason ?? null,
      purchaseQuantity: count, quantity: count === null ? legacyQuantity ?? null : formatShoppingQuantity(count), sourceType: count === null ? 'legacy' : 'manual',
      requiredQuantity: requiredQuantity ?? null, requiredUnit: requiredUnit ?? null,
      originalIngredientText: originalIngredientText ?? null,
    }, include: { product: true } }), status: 201 }
  })
  return NextResponse.json(restore ? { ...result.item, outcome: result.status === 201 ? 'created' : 'existing' } : result.item, { status: result.status })
})

export const DELETE = withErrorHandling(async (request: Request) => {
  const { ids } = deleteShoppingItemsSchema.parse(await request.json())
  await db.shoppingListItem.deleteMany({ where: { id: { in: ids }, userId: await requireUserId() } })
  return NextResponse.json({ deleted: ids.length })
})
