import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { formatShoppingQuantity, mergeShoppingQuantity, parseShoppingQuantity } from '@/lib/shoppingList'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const recipe = await db.recipe.findUnique({
    where: { id },
    include: { ingredients: true },
  })
  if (!recipe) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const pantryItems = await db.pantryItem.findMany()
  const pantryProductIds = new Set(pantryItems.map(i => i.productId))

  const missingIngredients = recipe.ingredients.filter(
    ing => !ing.optional && (!ing.productId || !pantryProductIds.has(ing.productId))
  )

  const created = []
  for (const ing of missingIngredients) {
    const quantityValue = parseShoppingQuantity(ing.quantity, 1)
    const existing = await db.shoppingListItem.findFirst({
      where: ing.productId ? { productId: ing.productId, checked: false } : { name: ing.name, checked: false },
    })

    if (existing) {
      const item = await db.shoppingListItem.update({
        where: { id: existing.id },
        data: {
          quantity: mergeShoppingQuantity(existing.quantity, quantityValue),
          reason: existing.reason ?? `Para: ${recipe.title}`,
        },
      })
      created.push(item)
      continue
    }

    const item = await db.shoppingListItem.create({
      data: {
        name: ing.name,
        quantity: formatShoppingQuantity(quantityValue),
        productId: ing.productId ?? null,
        reason: `Para: ${recipe.title}`,
      },
    })
    created.push(item)
  }

  return NextResponse.json({ added: created.length, items: created, skipped: 0 })
}
