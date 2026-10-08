import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireUserId } from '@/lib/auth'
import { ApiError, withErrorHandling } from '@/lib/apiError'
import { DEFAULT_PREFERENCES, scoreRecipe, sortSuggestions } from '@/lib/recipeScoring'
import type { RecipeWithIngredients, ScoringOptions } from '@/lib/recipeScoring'

const swapSchema = z.object({ recipeId: z.string().min(1).optional() })

// PATCH /api/weekly-plan/:mealId
//   body { recipeId }  -> put that recipe in the slot (must fit the slot's meal type and saved preferences)
//   no body            -> "choose for me": best-scoring recipe different from the current one
export const PATCH = withErrorHandling(
  async (request: Request, { params }: { params: Promise<{ mealId: string }> }) => {
  const { mealId } = await params
  const userId = await requireUserId()

  const meal = await db.weeklyMeal.findFirst({ where: { id: mealId, plan: { userId } } })
  if (!meal) throw new ApiError('Not found', 404)

  const { recipeId: chosenId } = swapSchema.parse(await request.json().catch(() => ({})))
  const [recipes, pantryItems, prefs] = await Promise.all([
    db.recipe.findMany({ include: { ingredients: true } }),
    db.pantryItem.findMany({ where: { userId }, include: { product: true } }),
    db.userPreferences.findUnique({ where: { userId } }),
  ])

  const preferences = {
    ketoMode:
      prefs?.ketoMode === 'strict' || prefs?.ketoMode === 'flexible' || prefs?.ketoMode === 'low_carb'
        ? prefs.ketoMode
        : DEFAULT_PREFERENCES.ketoMode,
    avoidFish: prefs?.avoidFish ?? DEFAULT_PREFERENCES.avoidFish,
    avoidPork: prefs?.avoidPork ?? DEFAULT_PREFERENCES.avoidPork,
    avoidDairy: prefs?.avoidDairy ?? DEFAULT_PREFERENCES.avoidDairy,
    maxCookingMinutes: prefs?.maxCookingMinutes ?? DEFAULT_PREFERENCES.maxCookingMinutes,
  }

  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
  const recentMeals = await db.weeklyMeal.findMany({
    where: { createdAt: { gte: threeDaysAgo }, recipeId: { not: null }, plan: { userId } },
    select: { recipeId: true },
  })
  const recentRecipeIds = recentMeals.map(m => m.recipeId).filter((id): id is string => id !== null)

  const opts: ScoringOptions = {
    pantry: pantryItems,
    userId,
    preferences,
    mealType: meal.mealType,
    recentRecipeIds,
    // like generate: pantry only ranks candidates. With the default 0.6 threshold a small pantry left
    // no candidates and "swap" answered 404.
    minAvailability: 0,
  }

  if (chosenId) {
    const chosen = recipes.find(recipe => recipe.id === chosenId)
    if (!chosen) throw new ApiError('Recipe not found', 404)
    const types: string[] = JSON.parse(chosen.mealTypes)
    if (!types.includes(meal.mealType)) throw new ApiError('Recipe does not fit this meal type', 400)
    if (!scoreRecipe(chosen, opts)) {
      throw new ApiError('Esta receta no es compatible con tus preferencias. Elige otra receta o revisa Preferencias.', 422)
    }
    const updatedChosen = await db.weeklyMeal.update({
      where: { id: mealId },
      data: { recipeId: chosen.id },
      include: { recipe: true },
    })
    return NextResponse.json(updatedChosen)
  }

  const suggestions = recipes
    .map(r => scoreRecipe(r as RecipeWithIngredients, opts))
    .filter((s): s is NonNullable<typeof s> => s !== null)
  const sorted = sortSuggestions(suggestions)

  // Prefer a recipe not already used for this meal type in the plan (otherwise "swap" just ping-pongs
  // between the two best recipes and creates repeats), then any different one.
  const usedInPlan = new Set(
    (await db.weeklyMeal.findMany({ where: { planId: meal.planId, mealType: meal.mealType }, select: { recipeId: true } })).map(m => m.recipeId)
  )
  const pick =
    sorted.find(s => !usedInPlan.has(s.recipe.id)) ?? sorted.find(s => s.recipe.id !== meal.recipeId) ?? sorted[0]
  if (!pick) throw new ApiError('No suggestions available', 404)

  const updated = await db.weeklyMeal.update({
    where: { id: mealId },
    data: { recipeId: pick.recipe.id },
    include: { recipe: true },
  })

  return NextResponse.json(updated)
  }
)
