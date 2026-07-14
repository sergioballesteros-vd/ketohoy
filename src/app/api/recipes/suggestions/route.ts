import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ensureRecipeImage } from '@/lib/recipeImage'
import { DEFAULT_PREFERENCES, scoreRecipe, sortSuggestions } from '@/lib/recipeScoring'
import type { RecipeWithIngredients, ScoringOptions } from '@/lib/recipeScoring'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const mealType = searchParams.get('mealType') ?? undefined
  const maxTime = searchParams.get('maxTime') ? parseInt(searchParams.get('maxTime')!) : undefined
  const onlyAvailable = searchParams.get('onlyAvailable') === 'true'
  const limitParam = searchParams.get('limit')
  const limit = limitParam ? Math.min(Math.max(parseInt(limitParam, 10) || 20, 1), 100) : 20

  const [recipes, pantryItems, prefs] = await Promise.all([
    db.recipe.findMany({ include: { ingredients: true } }),
    db.pantryItem.findMany({ include: { product: true } }),
    db.userPreferences.findFirst(),
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

  const pantryProductIds = new Set(pantryItems.map(i => i.productId))
  const pantryProductNames = pantryItems.map(i => i.product.name.toLowerCase())

  const buildSuggestions = (minAvailability: number) =>
    recipes
      .map(r =>
        scoreRecipe(r as RecipeWithIngredients, {
          pantryProductIds,
          pantryProductNames,
          preferences,
          mealType,
          minAvailability,
        })
      )
      .filter((s): s is NonNullable<typeof s> => s !== null)

  const hasPantryItems = pantryProductIds.size > 0 || pantryProductNames.length > 0
  const suggestions = hasPantryItems
    ? buildSuggestions(0.6)
    : buildSuggestions(0)

  let sorted = sortSuggestions(suggestions)
  if (!onlyAvailable && sorted.length === 0 && hasPantryItems) {
    sorted = sortSuggestions(buildSuggestions(0))
  }

  if (onlyAvailable) {
    sorted = sorted.filter(s => s.missingIngredients.length === 0)
  }

  const items = await Promise.all(
    sorted.slice(0, limit).map(async suggestion => {
      const imageUrl = await ensureRecipeImage(
        suggestion.recipe.id,
        suggestion.recipe.title,
        suggestion.recipe.imageUrl
      )

      return imageUrl === suggestion.recipe.imageUrl
        ? suggestion
        : { ...suggestion, recipe: { ...suggestion.recipe, imageUrl } }
    })
  )

  return NextResponse.json({
    items,
    total: sorted.length,
    hasMore: sorted.length > limit,
  })
}
