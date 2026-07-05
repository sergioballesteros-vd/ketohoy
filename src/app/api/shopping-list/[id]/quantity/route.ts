import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { formatShoppingQuantity, mergeShoppingQuantity, parseShoppingQuantity } from '@/lib/shoppingList'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json().catch(() => ({}))
  const delta = parseShoppingQuantity(body.delta, 1)

  const item = await db.shoppingListItem.findUnique({ where: { id } })
  if (!item) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
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
