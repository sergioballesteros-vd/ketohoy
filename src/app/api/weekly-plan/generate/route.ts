import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { DEFAULT_PREFERENCES, scoreRecipe, sortSuggestions } from '@/lib/recipeScoring'
import type { RecipeWithIngredients, ScoringOptions } from '@/lib/recipeScoring'
import { getMonday } from '@/lib/dateUtils'

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function extendedPool(ids: string[], size: number): string[] {
  if (ids.length === 0) return []
  const result: string[] = []
  while (result.length < size) result.push(...shuffle([...ids]))
  return result.slice(0, size)
}

export async function POST() {
  const monday = getMonday(new Date())

  const [recipes, pantryItems, prefs] = await Promise.all([
    db.recipe.findMany({ include: { ingredients: true } }),
    db.pantryItem.findMany({ include: { product: true } }),
    db.userPreferences.findFirst(),
  ])

  if (recipes.length === 0) {
    return NextResponse.json(
      { error: 'No hay recetas cargadas para generar el plan semanal' },
      { status: 409 }
    )
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
  const hasPantryItems = pantryProductIds.size > 0 || pantryProductNames.length > 0

  const mealTypes = ['breakfast', 'lunch', 'snack', 'dinner']

  // Pre-compute shuffled pools per meal type (40% threshold for more variety)
  const poolsByType: Record<string, string[]> = {}
  const mealCandidates: Array<{
    recipeId: string
    dayOfWeek: number
    mealType: string
  }> = []
  for (const mealType of mealTypes) {
    const opts: ScoringOptions = {
      pantryProductIds,
      pantryProductNames,
      preferences,
      mealType,
      minAvailability: hasPantryItems ? 0.4 : 0,
    }
    const sorted = sortSuggestions(
      recipes
        .map(r => scoreRecipe(r as RecipeWithIngredients, opts))
        .filter((s): s is NonNullable<typeof s> => s !== null)
    )
    // extend to 7 slots with shuffled repetitions if needed — no consecutive repeats
    poolsByType[mealType] = extendedPool(sorted.map(s => s.recipe.id), 7)
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
    return NextResponse.json(
      { error: 'No hay suficientes recetas compatibles con tus preferencias y despensa' },
      { status: 422 }
    )
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
}
