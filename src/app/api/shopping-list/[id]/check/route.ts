import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUserId } from '@/lib/auth'
import { ApiError, withErrorHandling } from '@/lib/apiError'
import { addBoughtToPantry, removeBoughtFromPantry } from '@/lib/pantryTransfer'

export const PATCH = withErrorHandling(
  async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params
    const userId = await requireUserId()

    const updated = await db.$transaction(async tx => {
      const item = await tx.shoppingListItem.findFirst({ where: { id, userId } })
      if (!item) throw new ApiError('Not found', 404)

      // State transition, stock and reversal record commit together.
      const checked = !item.checked
      const { count } = await tx.shoppingListItem.updateMany({
        where: { id, userId, checked: item.checked },
        data: { checked },
      })
      if (count === 1) {
        if (checked) await addBoughtToPantry(tx, userId, item)
        else await removeBoughtFromPantry(tx, userId, item)
      }
      return tx.shoppingListItem.findUniqueOrThrow({ where: { id } })
    })
    return NextResponse.json(updated)
  }
)
