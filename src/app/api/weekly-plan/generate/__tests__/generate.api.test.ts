import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { setupTestDb } from '@/lib/__tests__/testDb'

let POST: typeof import('../route').POST
let cleanup: () => void

beforeAll(async () => {
  ;({ cleanup } = setupTestDb())
  ;({ POST } = await import('../route'))
})

afterAll(() => cleanup())

describe('POST /api/weekly-plan/generate (integration, seeded DB)', () => {
  it('generates a full 7-day plan with all 4 meal types filled', async () => {
    const res = await POST()
    expect(res.status).toBe(200)
    const plan = await res.json()

    const days = new Set(plan.meals.map((m: { dayOfWeek: number }) => m.dayOfWeek))
    expect(days.size).toBe(7)

    const mealTypesByDay = new Map<number, Set<string>>()
    for (const meal of plan.meals as Array<{ dayOfWeek: number; mealType: string; recipeId: string | null }>) {
      expect(meal.recipeId).not.toBeNull()
      const set = mealTypesByDay.get(meal.dayOfWeek) ?? new Set()
      set.add(meal.mealType)
      mealTypesByDay.set(meal.dayOfWeek, set)
    }
    for (const set of mealTypesByDay.values()) {
      expect(set).toEqual(new Set(['breakfast', 'lunch', 'snack', 'dinner']))
    }
  })

  it('regenerating replaces the existing plan for the current week rather than duplicating it', async () => {
    const first = await (await POST()).json()
    const second = await (await POST()).json()
    expect(second.id).not.toBe(first.id)
    expect(second.weekStart).toBe(first.weekStart)
  })
})
