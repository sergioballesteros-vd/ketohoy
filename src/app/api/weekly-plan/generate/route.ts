import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUserId } from '@/lib/auth'
import { withErrorHandling } from '@/lib/apiError'
import { DEFAULT_PREFERENCES, scoreRecipe, sortSuggestions } from '@/lib/recipeScoring'
import type { RecipeWithIngredients, ScoringOptions } from '@/lib/recipeScoring'
import { getMonday } from '@/lib/dateUtils'
import { extendedPool } from '@/lib/weeklyPlanPool'

export const POST = withErrorHandling(async () => {
  const userId = await requireUserId()
  const monday = getMonday(new Date())

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
      pantry: pantryItems,
      userId,
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

  const missingMealTypes = mealTypes.filter(type => poolsByType[type].length === 0)
  if (missingMealTypes.length > 0) {
    const labels: Record<string, string> = { breakfast: 'desayuno', lunch: 'comida', snack: 'snack', dinner: 'cena' }
    const missingLabels = missingMealTypes.map(type => labels[type])
    const names = new Intl.ListFormat('es', { style: 'long', type: 'conjunction' }).format(missingLabels)
    return NextResponse.json({
      status: mealCandidates.length === 0 ? 'no_candidates' : 'incomplete',
      error: `No encontramos recetas compatibles para ${names} con tus preferencias actuales.`,
      missingMealTypes,
      availableSlots: mealCandidates.length,
      expectedSlots: 28,
    }, { status: 422 })
  }

  // Replace the plan atomically, and only after proving a replacement can be built. deleteMany (not
  // delete) and one transaction keep simultaneous requests (double tap, two tabs) from leaving several
  // or half-filled plans for the same week.
  const plan = await db.$transaction(async tx => {
    await tx.weeklyPlan.deleteMany({ where: { weekStart: monday, userId } })
    const created = await tx.weeklyPlan.create({ data: { weekStart: monday, userId } })
    await tx.weeklyMeal.createMany({ data: mealCandidates.map(meal => ({ ...meal, planId: created.id })) })
    return tx.weeklyPlan.findUniqueOrThrow({
      where: { id: created.id },
      include: {
        meals: {
          include: { recipe: true },
          orderBy: [{ dayOfWeek: 'asc' }, { mealType: 'asc' }],
        },
      },
    })
  })

  return NextResponse.json({ ...plan, status: 'complete' })
})
