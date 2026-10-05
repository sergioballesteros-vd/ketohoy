import { ingredientSourceKey } from '@/lib/shoppingSources'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireUserId } from '@/lib/auth'
import { ApiError, withErrorHandling } from '@/lib/apiError'
import { ingredientAvailability } from '@/lib/recipeAvailability'
import { accessibleProducts } from '@/lib/productAccess'
import { parseIngredientQuantity } from '@/lib/quantities'

const originSchema = z.object({ mealId: z.string().min(1).optional() }).strict()
export const POST = withErrorHandling(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params
    const userId = await requireUserId()
    const raw = await request.text()
    const { mealId } = originSchema.parse(raw ? JSON.parse(raw) : {})
    const result = await db.$transaction(async tx => {
      const recipe = await tx.recipe.findUnique({ where: { id }, include: { ingredients: true } })
      if (!recipe) throw new ApiError('Not found', 404)
      const meal = mealId ? await tx.weeklyMeal.findFirst({ where: { id: mealId, recipeId: id, plan: { userId } } }) : null
      if (mealId && !meal) throw new ApiError('Meal not found', 404)
      const pantry = await tx.pantryItem.findMany({ where: { userId }, include: { product: true } })
      const missing = recipe.ingredients.filter(ing => !ing.optional && ingredientAvailability(ing, pantry, userId).status !== 'sufficient')
      const items = []
      let added = 0
      for (const ing of missing) {
        const sourceKey = ingredientSourceKey(id, ing.id, meal ?? undefined)
        // Includes purchased history: retry is never a new cooking occasion or purchase.
        const existing = await tx.shoppingListItem.findUnique({ where: { userId_sourceKey: { userId, sourceKey } } })
        if (existing) { items.push(existing); continue }
        const product = ing.productId ? await tx.product.findFirst({ where: { id: ing.productId, ...accessibleProducts(userId) } }) : null
        items.push(await tx.shoppingListItem.create({ data: {
          userId, name: ing.name, productId: product?.id ?? null,
          ...parseIngredientQuantity(ing.quantity), originalIngredientText: ing.quantity,
          sourceType: meal ? 'meal' : 'recipe', sourceKey, reason: `Para: ${recipe.title}`,
          // Culinary needs do not imply any number of commercial packages.
        } }))
        added++
      }
      return { added, items, skipped: recipe.ingredients.length - missing.length }
    })
    return NextResponse.json(result)
  }
)
