import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

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

  // Filter already-in-list (by name, unchecked only)
  const existingNames = new Set(
    (await db.shoppingListItem.findMany({
      where: { checked: false },
      select: { name: true },
    })).map(i => i.name)
  )

  const toCreate = missingIngredients.filter(ing => !existingNames.has(ing.name))

  const created = await Promise.all(
    toCreate.map(ing =>
      db.shoppingListItem.create({
        data: {
          name: ing.name,
          quantity: ing.quantity,
          productId: ing.productId ?? null,
          reason: `Para: ${recipe.title}`,
        },
      })
    )
  )

  return NextResponse.json({ added: created.length, items: created, skipped: missingIngredients.length - created.length })
}
