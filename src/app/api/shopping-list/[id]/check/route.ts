import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUserId } from '@/lib/auth'
import { ApiError, withErrorHandling } from '@/lib/apiError'

export const PATCH = withErrorHandling(
  async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params
  const userId = await requireUserId()

  const item = await db.shoppingListItem.findFirst({ where: { id, userId } })
  if (!item) {
    throw new ApiError('Not found', 404)
  }

  const checked = !item.checked
  const updated = await db.shoppingListItem.update({
    where: { id },
    data: { checked },
  })

  // When marked as bought, add to pantry if linked to a product
  if (checked && item.productId) {
    const alreadyInPantry = await db.pantryItem.findFirst({
      where: { userId, productId: item.productId },
    })
    if (!alreadyInPantry) {
      await db.pantryItem.create({ data: { userId, productId: item.productId } })
    }
  }

  return NextResponse.json(updated)
  }
)
