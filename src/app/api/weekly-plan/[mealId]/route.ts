import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { scoreRecipe, sortSuggestions } from '@/lib/recipeScoring'
import type { RecipeWithIngredients, ScoringOptions } from '@/lib/recipeScoring'

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ mealId: string }> }
) {
  const { mealId } = await params

  const meal = await db.weeklyMeal.findUnique({ where: { id: mealId } })
  if (!meal) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const [recipes, pantryItems, prefs] = await Promise.all([
    db.recipe.findMany({ include: { ingredients: true } }),
    db.pantryItem.findMany({ include: { product: true } }),
    db.userPreferences.findFirst(),
  ])

  const preferences = {
    avoidFish: prefs?.avoidFish ?? false,
    avoidPork: prefs?.avoidPork ?? false,
    avoidDairy: prefs?.avoidDairy ?? false,
    maxCookingMinutes: prefs?.maxCookingMinutes ?? 30,
  }

  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
  const recentMeals = await db.weeklyMeal.findMany({
    where: { createdAt: { gte: threeDaysAgo }, recipeId: { not: null } },
    select: { recipeId: true },
  })
  const recentRecipeIds = recentMeals.map(m => m.recipeId).filter((id): id is string => id !== null)

  const opts: ScoringOptions = {
    pantryProductIds: new Set(pantryItems.map(i => i.productId)),
    pantryProductNames: pantryItems.map(i => i.product.name.toLowerCase()),
    preferences,
    mealType: meal.mealType,
    recentRecipeIds,
  }

  const suggestions = recipes
    .map(r => scoreRecipe(r as RecipeWithIngredients, opts))
    .filter((s): s is NonNullable<typeof s> => s !== null)
  const sorted = sortSuggestions(suggestions)

  // Pick a different recipe than current
  const pick = sorted.find(s => s.recipe.id !== meal.recipeId) ?? sorted[0]
  if (!pick) return NextResponse.json({ error: 'No suggestions available' }, { status: 404 })

  const updated = await db.weeklyMeal.update({
    where: { id: mealId },
    data: { recipeId: pick.recipe.id },
    include: { recipe: true },
  })

  return NextResponse.json(updated)
}
