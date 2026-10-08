import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUserId } from '@/lib/auth'
import { withErrorHandling } from '@/lib/apiError'
import { reviewedRecipeImage } from '@/lib/recipeImages'
import { DEFAULT_PREFERENCES, scoreRecipe, sortSuggestions } from '@/lib/recipeScoring'
import type { RecipeWithIngredients, ScoringOptions } from '@/lib/recipeScoring'

export const GET = withErrorHandling(async (request: Request) => {
  const userId = await requireUserId()
  const { searchParams } = new URL(request.url)
  const mealType = searchParams.get('mealType') ?? undefined
  const maxTime = searchParams.get('maxTime') ? parseInt(searchParams.get('maxTime')!) : undefined
  const onlyAvailable = searchParams.get('onlyAvailable') === 'true'
  const limitParam = searchParams.get('limit')
  const limit = limitParam ? Math.min(Math.max(parseInt(limitParam, 10) || 20, 1), 100) : 20

  const [recipes, pantryItems, prefs] = await Promise.all([
    db.recipe.findMany({ include: { ingredients: true } }),
    db.pantryItem.findMany({ where: { userId }, include: { product: true } }),
    db.userPreferences.findUnique({ where: { userId } }),
  ])

  const preferences: ScoringOptions['preferences'] = prefs
    ? {
        ketoMode:
          prefs.ketoMode === 'strict' || prefs.ketoMode === 'flexible' || prefs.ketoMode === 'low_carb'
            ? prefs.ketoMode
            : DEFAULT_PREFERENCES.ketoMode,
        avoidFish: prefs.avoidFish,
        avoidPork: prefs.avoidPork,
        avoidDairy: prefs.avoidDairy,
        maxCookingMinutes: maxTime ?? prefs.maxCookingMinutes,
      }
    : { ...DEFAULT_PREFERENCES, maxCookingMinutes: maxTime ?? DEFAULT_PREFERENCES.maxCookingMinutes }


  const buildSuggestions = (minAvailability: number) =>
    recipes
      .map(r =>
        scoreRecipe(r as RecipeWithIngredients, {
          pantry: pantryItems,
          userId,
          preferences,
          mealType,
          minAvailability,
        })
      )
      .filter((s): s is NonNullable<typeof s> => s !== null)

  const hasPantryItems = pantryItems.length > 0
  const suggestions = hasPantryItems
    ? buildSuggestions(0.6)
    : buildSuggestions(0)

  let sorted = sortSuggestions(suggestions)
  if (!onlyAvailable && sorted.length === 0 && hasPantryItems) {
    sorted = sortSuggestions(buildSuggestions(0))
  }

  if (onlyAvailable) {
    sorted = sorted.filter(s => s.availability.ready)
  }

  const items = sorted.slice(0, limit).map(suggestion => ({
    ...suggestion,
    recipe: { ...suggestion.recipe, imageUrl: reviewedRecipeImage(suggestion.recipe.title)?.url ?? null },
  }))

  return NextResponse.json({
    items,
    total: sorted.length,
    hasMore: sorted.length > limit,
  })
})
