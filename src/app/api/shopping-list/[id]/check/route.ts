import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUserId } from '@/lib/auth'
import { ApiError, withErrorHandling } from '@/lib/apiError'
import { addBoughtToPantry, removeBoughtFromPantry } from '@/lib/pantryTransfer'

export const PATCH = withErrorHandling(
  async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params
  const userId = await requireUserId()

  const item = await db.shoppingListItem.findFirst({ where: { id, userId } })
  if (!item) {
    throw new ApiError('Not found', 404)
  }

  // Compare-and-set on the state we read: two simultaneous taps (double click, two tabs) both see the
  // same state, only one flips it, and only the winner touches the pantry.
  const checked = !item.checked
  const { count } = await db.shoppingListItem.updateMany({
    where: { id, userId, checked: item.checked },
    data: { checked },
  })
  const updated = await db.shoppingListItem.findUniqueOrThrow({ where: { id } })
  if (count === 0) return NextResponse.json(updated)

  // Bought -> into the pantry with its quantity; un-bought -> take that quantity back out.
  if (checked) await addBoughtToPantry(userId, item)
  else await removeBoughtFromPantry(userId, item)

  return NextResponse.json(updated)
  }
)
