import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { setupTestDb } from '@/lib/__tests__/testDb'
import { DEFAULT_PREFERENCES } from '@/lib/recipeScoring'
vi.mock('@/lib/auth', async () => (await import('@/lib/__tests__/authMock')).authMock)
let cleanup: () => void
let generate: typeof import('../route').POST
beforeAll(async () => {
  ;({ cleanup } = setupTestDb())
  ;({ POST: generate } = await import('../route'))
})
afterAll(() => cleanup())

describe('complete weekly plan contract and persistence', () => {
  it.each([true, false])('preserves previous state (has plan: %s) with seven snacks or no candidates', async hasPlan => {
    const { db } = await import('@/lib/db')
    const { authMock } = await import('@/lib/__tests__/authMock')
    const userId = await authMock.requireUserId()
    await db.weeklyPlan.deleteMany({ where: { userId } })
    await db.userPreferences.deleteMany({ where: { userId } })
    await db.userPreferences.create({ data: { userId, ...DEFAULT_PREFERENCES, ketoMode: 'strict', avoidFish: true, avoidPork: true, avoidDairy: true, maxCookingMinutes: 5 } })
    await db.recipe.updateMany({ data: { prepTimeMinutes: 999 } })
    const recipe = await db.recipe.create({ data: {
      title: 'Completeness fixture', description: '', mealTypes: '["breakfast","lunch","snack","dinner"]',
      prepTimeMinutes: 5, difficulty: 'easy', ketoLevel: 'strict', tags: '[]', steps: '[]',
      ingredients: { create: { name: 'huevo' } },
    } })
    if (hasPlan) {
      const response = await generate()
      expect(response.status).toBe(200)
      expect(await response.json()).toMatchObject({ status: 'complete' })
    }
    const snapshot = () => db.weeklyPlan.findMany({ where: { userId }, include: { meals: { orderBy: { id: 'asc' } } } })
    const before = await snapshot()
    if (hasPlan) expect(before[0].meals).toHaveLength(28)
    const preferences = await db.userPreferences.findFirst({ where: { userId } })
    await db.recipe.update({ where: { id: recipe.id }, data: { mealTypes: '["snack"]' } })
    const incomplete = await generate()
    expect(incomplete.status).toBe(422)
    expect(await incomplete.json()).toMatchObject({ status: 'incomplete', missingMealTypes: ['breakfast', 'lunch', 'dinner'], availableSlots: 7, expectedSlots: 28 })
    expect(await snapshot()).toEqual(before)
    await db.recipe.update({ where: { id: recipe.id }, data: { prepTimeMinutes: 999 } })
    const empty = await generate()
    expect(empty.status).toBe(422)
    expect(await empty.json()).toMatchObject({ status: 'no_candidates', missingMealTypes: ['breakfast', 'lunch', 'snack', 'dinner'], availableSlots: 0 })
    expect(await snapshot()).toEqual(before)
    expect(await db.userPreferences.findFirst({ where: { userId } })).toEqual(preferences)
  })

  it('rolls back a failed replacement transaction without losing the previous plan', async () => {
    const { db } = await import('@/lib/db')
    const { authMock } = await import('@/lib/__tests__/authMock')
    const userId = await authMock.requireUserId()
    await db.recipe.updateMany({ where: { title: 'Completeness fixture' }, data: { prepTimeMinutes: 5, mealTypes: '["breakfast","lunch","snack","dinner"]' } })
    expect((await generate()).status).toBe(200)
    const snapshot = () => db.weeklyPlan.findMany({ where: { userId }, include: { meals: { orderBy: { id: 'asc' } } } })
    const before = await snapshot()
    await db.$executeRawUnsafe("CREATE TRIGGER fail_plan_meal BEFORE INSERT ON WeeklyMeal BEGIN SELECT RAISE(ABORT, 'test failure'); END")
    try {
      expect((await generate()).status).toBe(500)
      expect(await snapshot()).toEqual(before)
    } finally {
      await db.$executeRawUnsafe('DROP TRIGGER fail_plan_meal')
    }
  })
})
