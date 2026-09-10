import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { withErrorHandling } from '@/lib/apiError'
import { formatShoppingQuantity, mergeShoppingQuantity, parseShoppingQuantity } from '@/lib/shoppingList'

const createShoppingItemSchema = z.object({
  name: z.string().trim().min(1),
  quantity: z.union([z.number(), z.string()]).optional(),
  productId: z.string().nullable().optional(),
  reason: z.string().nullable().optional(),
})

const deleteShoppingItemsSchema = z.object({
  ids: z.array(z.string().min(1)).min(1),
})

export const GET = withErrorHandling(async () => {
  const items = await db.shoppingListItem.findMany({
    include: { product: true },
    orderBy: [{ checked: 'asc' }, { createdAt: 'desc' }],
  })
  return NextResponse.json(items)
})

export const POST = withErrorHandling(async (request: Request) => {
  const { name, quantity, productId, reason } = createShoppingItemSchema.parse(await request.json())

  const normalizedName = name.trim()
  const quantityValue = formatShoppingQuantity(parseShoppingQuantity(quantity, 1))
  const existing = await db.shoppingListItem.findFirst({
    where: productId ? { productId: String(productId) } : { name: normalizedName },
    include: { product: true },
  })

  if (existing) {
    const item = await db.shoppingListItem.update({
      where: { id: existing.id },
      data: {
        quantity: mergeShoppingQuantity(existing.quantity, parseShoppingQuantity(quantity, 1)),
        reason: reason ?? existing.reason,
      },
      include: { product: true },
    })
    return NextResponse.json(item, { status: 200 })
  }

  const item = await db.shoppingListItem.create({
    data: {
      name: normalizedName,
      quantity: quantityValue,
      productId: productId ? String(productId) : null,
      reason: reason ?? null,
    },
    include: { product: true },
  })
  return NextResponse.json(item, { status: 201 })
})

export const DELETE = withErrorHandling(async (request: Request) => {
  const { ids } = deleteShoppingItemsSchema.parse(await request.json())
  await db.shoppingListItem.deleteMany({ where: { id: { in: ids } } })
  return NextResponse.json({ deleted: ids.length })
})
