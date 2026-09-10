import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { ApiError, withErrorHandling } from '@/lib/apiError'
import { formatShoppingQuantity, mergeShoppingQuantity, parseShoppingQuantity } from '@/lib/shoppingList'

const quantityPatchSchema = z.object({
  delta: z.union([z.number(), z.string()]).optional(),
})

export const PATCH = withErrorHandling(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params
    const { delta: rawDelta } = quantityPatchSchema.parse(await request.json().catch(() => ({})))
    const delta = parseShoppingQuantity(rawDelta, 1)

    const item = await db.shoppingListItem.findUnique({ where: { id } })
    if (!item) {
      throw new ApiError('Not found', 404)
    }

    const nextQuantity = parseShoppingQuantity(mergeShoppingQuantity(item.quantity, delta), 0)
    if (nextQuantity <= 0) {
      await db.shoppingListItem.delete({ where: { id } })
      return NextResponse.json({ deleted: true })
    }

    const updated = await db.shoppingListItem.update({
      where: { id },
      data: { quantity: formatShoppingQuantity(nextQuantity) },
    })

    return NextResponse.json(updated)
  }
)
