import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireUserId } from '@/lib/auth'
import { withErrorHandling } from '@/lib/apiError'

const markBoughtSchema = z.object({
  ids: z.array(z.string().min(1)).min(1),
})

export const POST = withErrorHandling(async (request: Request) => {
  const userId = await requireUserId()
  const { ids } = markBoughtSchema.parse(await request.json())

  await db.shoppingListItem.updateMany({
    where: { id: { in: ids }, userId },
    data: { checked: true },
  })

  // Add linked products to pantry
  const items = await db.shoppingListItem.findMany({
    where: { id: { in: ids }, userId, productId: { not: null } },
  })

  const productIds = items.map(i => i.productId).filter((id): id is string => id !== null)

  if (productIds.length > 0) {
    const existingPantry = await db.pantryItem.findMany({
      where: { userId, productId: { in: productIds } },
      select: { productId: true },
    })
    const alreadyInPantry = new Set(existingPantry.map(p => p.productId))
    const toAdd = [...new Set(productIds)].filter(id => !alreadyInPantry.has(id))

    if (toAdd.length > 0) {
      await db.pantryItem.createMany({
        data: toAdd.map(productId => ({ userId, productId })),
      })
    }
  }

  return NextResponse.json({ marked: ids.length })
})
