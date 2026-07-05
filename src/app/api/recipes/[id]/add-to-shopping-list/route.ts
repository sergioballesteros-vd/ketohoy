import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ingredientMatchesProduct } from '@/lib/ingredientMatching'
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

  const pantryItems = await db.pantryItem.findMany({ include: { product: true } })
  const pantryProductIds = new Set(pantryItems.map(i => i.productId))
  const pantryProductNames = pantryItems.map(i => i.product.name)

  const missingIngredients = recipe.ingredients.filter(ing => {
    if (ing.optional) return false
    if (ing.productId && pantryProductIds.has(ing.productId)) return false
    return !pantryProductNames.some(name => ingredientMatchesProduct(ing.name, name))
  })

  const existingItems = await db.shoppingListItem.findMany({
    where: { checked: false },
  })

  const created = []
  const existingByProductId = new Map(
    existingItems.filter(item => item.productId).map(item => [item.productId as string, item])
  )
  const newItems: Array<{
    name: string
    quantity: string
    productId: string | null
    reason: string
  }> = []

  for (const ing of missingIngredients) {
    const quantityValue = parseShoppingQuantity(ing.quantity, 1)
    const existing = ing.productId
      ? existingByProductId.get(ing.productId)
      : existingItems.find(item => item.name.toLowerCase() === ing.name.toLowerCase())
        ?? existingItems.find(item => ingredientMatchesProduct(ing.name, item.name))

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

    const dedupeKey = ing.name.toLowerCase()
    const alreadyQueued = newItems.find(item => item.name.toLowerCase() === dedupeKey)
    if (alreadyQueued) {
      alreadyQueued.quantity = mergeShoppingQuantity(alreadyQueued.quantity, quantityValue)
    } else {
      newItems.push({
        name: ing.name,
        quantity: formatShoppingQuantity(quantityValue),
        productId: ing.productId ?? null,
        reason: `Para: ${recipe.title}`,
      })
    }
  }

  if (newItems.length > 0) {
    await db.shoppingListItem.createMany({ data: newItems })
    created.push(...newItems)
  }

  return NextResponse.json({ added: created.length, items: created, skipped: 0 })
}
