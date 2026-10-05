import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { setupTestDb, patch } from '@/lib/__tests__/testDb'
import { DEFAULT_PREFERENCES } from '@/lib/recipeScoring'

vi.mock('@/lib/auth', async () => (await import('@/lib/__tests__/authMock')).authMock)
let cleanup: () => void
let swap: typeof import('../route').PATCH
beforeAll(async () => {
  ;({ cleanup } = setupTestDb())
  ;({ PATCH: swap } = await import('../route'))
})
afterAll(() => cleanup())

describe('explicit substitution uses saved compatibility policy', () => {
  it.each([
    ['fish', { avoidFish: true }, 'atún', 5, 'strict'],
    ['pork', { avoidPork: true }, 'cerdo', 5, 'strict'],
    ['dairy', { avoidDairy: true }, 'queso', 5, 'strict'],
    ['time', { maxCookingMinutes: 5 }, 'huevo', 10, 'strict'],
    ['keto', { ketoMode: 'strict' }, 'huevo', 5, 'moderate'],
  ])('rejects %s after preferences tighten and preserves the exact slot', async (name, restriction, ingredient, minutes, level) => {
    const { db } = await import('@/lib/db')
    const { authMock } = await import('@/lib/__tests__/authMock')
    const userId = await authMock.requireUserId()
    await db.userPreferences.deleteMany({ where: { userId } })
    await db.pantryItem.deleteMany({ where: { userId } })
    const recipe = await db.recipe.create({ data: {
      title: `compatibility-${name}`, description: '', mealTypes: '["lunch"]',
      prepTimeMinutes: minutes, difficulty: 'easy', ketoLevel: level, tags: '[]', steps: '[]',
      ingredients: { create: { name: ingredient } },
    } })
    const plan = await db.weeklyPlan.create({ data: { userId, weekStart: new Date(), meals: { create: { dayOfWeek: 0, mealType: 'lunch', recipeId: recipe.id } } }, include: { meals: true } })
    const before = plan.meals[0]
    await db.userPreferences.create({ data: { userId, ...DEFAULT_PREFERENCES, ...restriction } })
    const context = { params: Promise.resolve({ mealId: before.id }) }
    const response = await swap(patch('http://t/swap', { recipeId: recipe.id }), context)
    expect(response.status).toBe(422)
    expect(await response.json()).toMatchObject({ error: expect.stringMatching(/preferencias/) })
    expect(await db.weeklyMeal.findUnique({ where: { id: before.id } })).toEqual(before)
    const compatible = await db.recipe.create({ data: {
      title: `compatible-${name}`, description: '', mealTypes: '["lunch"]',
      prepTimeMinutes: 5, difficulty: 'easy', ketoLevel: 'strict', tags: '[]', steps: '[]',
      ingredients: { create: { name: 'huevo' } },
    } })
    expect((await swap(patch('http://t/swap', { recipeId: compatible.id }), context)).status).toBe(200)
    expect((await db.weeklyMeal.findUnique({ where: { id: before.id } }))?.recipeId).toBe(compatible.id)
  })
})
