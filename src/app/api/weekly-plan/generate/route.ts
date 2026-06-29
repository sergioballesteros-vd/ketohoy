import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { scoreRecipe, sortSuggestions } from '@/lib/recipeScoring'
import type { RecipeWithIngredients, ScoringOptions } from '@/lib/recipeScoring'

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

function getMonday(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

export async function POST() {
  const monday = getMonday(new Date())

  // Delete existing plan for this week
  const existing = await db.weeklyPlan.findFirst({ where: { weekStart: monday } })
  if (existing) {
    await db.weeklyPlan.delete({ where: { id: existing.id } })
  }

  const [recipes, pantryItems, prefs] = await Promise.all([
    db.recipe.findMany({ include: { ingredients: true } }),
    db.pantryItem.findMany({ include: { product: true } }),
    db.userPreferences.findFirst(),
  ])

  const preferences = {
    avoidFish: prefs?.avoidFish ?? false,
    avoidPork: prefs?.avoidPork ?? false,
    avoidDairy: prefs?.avoidDairy ?? false,
    maxCookingMinutes: 30,
  }
  const pantryProductIds = new Set(pantryItems.map(i => i.productId))
  const pantryProductNames = pantryItems.map(i => i.product.name.toLowerCase())

  const mealTypes = ['breakfast', 'lunch', 'dinner']
  const plan = await db.weeklyPlan.create({ data: { weekStart: monday } })

  // Pre-compute shuffled pools per meal type (40% threshold for more variety)
  const poolsByType: Record<string, string[]> = {}
  for (const mealType of mealTypes) {
    const opts: ScoringOptions = {
      pantryProductIds,
      pantryProductNames,
      preferences,
      mealType,
      minAvailability: 0.4,
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
        await db.weeklyMeal.create({
          data: { planId: plan.id, recipeId, dayOfWeek: day, mealType },
        })
      }
    }
  }

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
