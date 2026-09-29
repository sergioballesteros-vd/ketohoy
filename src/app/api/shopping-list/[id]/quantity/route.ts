import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireUserId } from '@/lib/auth'
import { ApiError, withErrorHandling } from '@/lib/apiError'
import { formatShoppingQuantity, mergeShoppingQuantity, parseShoppingQuantity } from '@/lib/shoppingList'

const quantityPatchSchema = z.object({
  delta: z.union([z.number(), z.string()]).optional(),
})

export const PATCH = withErrorHandling(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params
    const userId = await requireUserId()
    const { delta: rawDelta } = quantityPatchSchema.parse(await request.json().catch(() => ({})))
    // Negative deltas are valid (decrement). parseShoppingQuantity() only accepts positives and
    // used to turn -1 into +1, so the "−" button on the shopping list actually incremented.
    const parsedDelta = rawDelta === undefined || rawDelta === '' ? 1 : Number(rawDelta)
    if (!Number.isFinite(parsedDelta) || parsedDelta === 0) throw new ApiError('Invalid delta', 400)
    const delta = parsedDelta

    const item = await db.shoppingListItem.findFirst({ where: { id, userId } })
    if (!item) {
      throw new ApiError('Not found', 404)
    }

    // The pantry received exactly this quantity when it was bought; changing it now would make
    // un-buying subtract a different amount.
    if (item.checked) throw new ApiError('Un-check the item before changing its quantity', 409)

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
