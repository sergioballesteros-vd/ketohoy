import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUserId } from '@/lib/auth'
import { withErrorHandling } from '@/lib/apiError'
import { getMonday } from '@/lib/dateUtils'
import { recipeAvailability } from '@/lib/recipeAvailability'

export const GET = withErrorHandling(async () => {
  const userId = await requireUserId()
  const monday = getMonday(new Date())

  const [plan, pantryItems] = await Promise.all([
    db.weeklyPlan.findUnique({
      where: { userId_weekStart: { weekStart: monday, userId } },
      include: {
        meals: {
          include: { recipe: { include: { ingredients: true } } },
          orderBy: [{ dayOfWeek: 'asc' }, { mealType: 'asc' }],
        },
      },
    }),
    db.pantryItem.findMany({ where: { userId }, include: { product: true } }),
  ])
  if (!plan) return NextResponse.json(null)

  return NextResponse.json({
    ...plan,
    meals: plan.meals.map(({ recipe, ...meal }) => ({
      ...meal,
      recipe: recipe && { ...recipe, ingredients: undefined },
      availability: recipe ? recipeAvailability(recipe.ingredients, pantryItems, userId) : null,
    })),
  })
})
