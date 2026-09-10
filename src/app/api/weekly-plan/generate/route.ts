import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ApiError, withErrorHandling } from '@/lib/apiError'
import { DEFAULT_PREFERENCES, scoreRecipe, sortSuggestions } from '@/lib/recipeScoring'
import type { RecipeWithIngredients, ScoringOptions } from '@/lib/recipeScoring'
import { getMonday } from '@/lib/dateUtils'
import { extendedPool } from '@/lib/weeklyPlanPool'

export const POST = withErrorHandling(async () => {
  const monday = getMonday(new Date())

  const [recipes, pantryItems, prefs] = await Promise.all([
    db.recipe.findMany({ include: { ingredients: true } }),
    db.pantryItem.findMany({ include: { product: true } }),
    db.userPreferences.findFirst(),
  ])

  if (recipes.length === 0) {
    throw new ApiError('No hay recetas cargadas para generar el plan semanal', 409)
  }

  const preferences = {
    ketoMode:
      prefs?.ketoMode === 'strict' || prefs?.ketoMode === 'flexible' || prefs?.ketoMode === 'low_carb'
        ? prefs.ketoMode
        : DEFAULT_PREFERENCES.ketoMode,
    avoidFish: prefs?.avoidFish ?? false,
    avoidPork: prefs?.avoidPork ?? false,
    avoidDairy: prefs?.avoidDairy ?? false,
    maxCookingMinutes: prefs?.maxCookingMinutes ?? DEFAULT_PREFERENCES.maxCookingMinutes,
  }
  const pantryProductIds = new Set(pantryItems.map(i => i.productId))
  const pantryProductNames = pantryItems.map(i => i.product.name.toLowerCase())

  const mealTypes = ['breakfast', 'lunch', 'snack', 'dinner']

  // Pre-compute shuffled pools per meal type (40% threshold for more variety)
  const poolsByType: Record<string, string[]> = {}
  const mealCandidates: Array<{
    recipeId: string
    dayOfWeek: number
    mealType: string
  }> = []
  for (const mealType of mealTypes) {
    // minAvailability: 0 — a weekly plan is meant to drive the shopping list,
    // so pantry match only ranks candidates (via score), it must never
    // exclude a recipe outright or a small pantry starves whole meal slots.
    const opts: ScoringOptions = {
      pantryProductIds,
      pantryProductNames,
      preferences,
      mealType,
      minAvailability: 0,
    }
    const sorted = sortSuggestions(
      recipes
        .map(r => scoreRecipe(r as RecipeWithIngredients, opts))
        .filter((s): s is NonNullable<typeof s> => s !== null)
    )
    // Use the top-ranked half (min 4) as the rotation pool so low-scoring
    // recipes don't dilute variety, but keep enough candidates to avoid repeats.
    const poolSize = Math.max(4, Math.ceil(sorted.length / 2))
    const topIds = sorted.slice(0, poolSize).map(s => s.recipe.id)
    // extend to 7 slots with shuffled repetitions if needed — no consecutive repeats
    poolsByType[mealType] = extendedPool(topIds, 7)
  }

  for (let day = 0; day < 7; day++) {
    for (const mealType of mealTypes) {
      const recipeId = poolsByType[mealType]?.[day]
      if (recipeId) {
        mealCandidates.push({ recipeId, dayOfWeek: day, mealType })
      }
    }
  }

  if (mealCandidates.length === 0) {
    throw new ApiError('No hay suficientes recetas compatibles con tus preferencias y despensa', 422)
  }

  // Delete existing plan only after proving that a replacement can be created.
  const existing = await db.weeklyPlan.findFirst({ where: { weekStart: monday } })
  if (existing) {
    await db.weeklyPlan.delete({ where: { id: existing.id } })
  }

  const plan = await db.weeklyPlan.create({ data: { weekStart: monday } })
  await db.weeklyMeal.createMany({
    data: mealCandidates.map(meal => ({ ...meal, planId: plan.id })),
  })

  const fullPlan = await db.weeklyPlan.findUnique({
    where: { id: plan.id },
    include: {
      meals: {
        include: { recipe: true },
        orderBy: [{ dayOfWeek: 'asc' }, { mealType: 'asc' }],
      },
    },
  })

  return NextResponse.json(fullPlan)
})
