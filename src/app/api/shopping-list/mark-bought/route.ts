import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireUserId } from '@/lib/auth'
import { withErrorHandling } from '@/lib/apiError'
import { addBoughtToPantry } from '@/lib/pantryTransfer'

const markBoughtSchema = z.object({
  ids: z.array(z.string().min(1)).min(1),
})

export const POST = withErrorHandling(async (request: Request) => {
  const userId = await requireUserId()
  const { ids } = markBoughtSchema.parse(await request.json())

  const marked = await db.$transaction(async tx => {
    // The entire batch either transfers successfully or remains pending.
    const pending = await tx.shoppingListItem.findMany({ where: { id: { in: ids }, userId, checked: false } })
    let countMarked = 0
    for (const item of pending) {
      const { count } = await tx.shoppingListItem.updateMany({ where: { id: item.id, userId, checked: false }, data: { checked: true } })
      if (count === 1) {
        await addBoughtToPantry(tx, userId, item)
        countMarked++
      }
    }
    return countMarked
  })

  return NextResponse.json({ marked })
})
