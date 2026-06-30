import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: Request) {
  const body = await request.json()
  const { ids }: { ids: string[] } = body

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: 'ids array required' }, { status: 400 })
  }

  await db.shoppingListItem.updateMany({
    where: { id: { in: ids } },
    data: { checked: true },
  })

  // Add linked products to pantry
  const items = await db.shoppingListItem.findMany({
    where: { id: { in: ids }, productId: { not: null } },
  })

  const productIds = items.map(i => i.productId).filter((id): id is string => id !== null)

  if (productIds.length > 0) {
    const existingPantry = await db.pantryItem.findMany({
      where: { productId: { in: productIds } },
      select: { productId: true },
    })
    const alreadyInPantry = new Set(existingPantry.map(p => p.productId))
    const toAdd = [...new Set(productIds)].filter(id => !alreadyInPantry.has(id))

    if (toAdd.length > 0) {
      await db.pantryItem.createMany({
        data: toAdd.map(productId => ({ productId })),
      })
    }
  }

  return NextResponse.json({ marked: ids.length })
}
