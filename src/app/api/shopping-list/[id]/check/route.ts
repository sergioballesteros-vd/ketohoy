import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ApiError, withErrorHandling } from '@/lib/apiError'

export const PATCH = withErrorHandling(
  async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params

  const item = await db.shoppingListItem.findUnique({ where: { id } })
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
      where: { productId: item.productId },
    })
    if (!alreadyInPantry) {
      await db.pantryItem.create({ data: { productId: item.productId } })
    }
  }

  return NextResponse.json(updated)
  }
)
