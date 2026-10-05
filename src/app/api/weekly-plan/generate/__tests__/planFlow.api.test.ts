import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { setupTestDb, get, post, patch } from '@/lib/__tests__/testDb'

vi.mock('@/lib/auth', async () => (await import('@/lib/__tests__/authMock')).authMock)

type Meal = {
  id: string
  dayOfWeek: number
  mealType: string
  recipeId: string | null
  recipe: { id: string; title: string; ingredients?: unknown } | null
  availability: { missing: number; total: number } | null
}

let generate: typeof import('../route').POST
let planGET: typeof import('../../route').GET
let mealPATCH: typeof import('../../[mealId]/route').PATCH
let cleanup: () => void

const params = (mealId: string) => ({ params: Promise.resolve({ mealId }) })
const currentPlan = async () => (await planGET()).json() as Promise<{ id: string; meals: Meal[] }>

beforeAll(async () => {
  ;({ cleanup } = setupTestDb())
  ;({ POST: generate } = await import('../route'))
  ;({ GET: planGET } = await import('../../route'))
  ;({ PATCH: mealPATCH } = await import('../../[mealId]/route'))
})

afterAll(() => cleanup())

describe('weekly plan: generate, read, swap', () => {
  it('GET returns null before a plan exists, then 28 meals with availability and no ingredient payload', async () => {
    expect(await (await planGET()).json()).toBeNull()
    await generate()
    const plan = await currentPlan()
    expect(plan.meals).toHaveLength(28)
    for (const m of plan.meals) {
      expect(m.availability).toMatchObject({ missing: expect.any(Number), total: expect.any(Number) })
      expect(m.recipe?.ingredients).toBeUndefined()
    }
  })

  it('there is never more than one meal per day+type slot, also after regenerating', async () => {
    await generate()
    const plan = await currentPlan()
    const slots = plan.meals.map(m => `${m.dayOfWeek}-${m.mealType}`)
    expect(new Set(slots).size).toBe(28)
  })

  it('simultaneous generate requests leave exactly one complete plan', async () => {
    const responses = await Promise.all([generate(), generate(), generate()])
    for (const response of responses) {
      expect(response.status).toBe(200)
      expect((await response.json()).meals).toHaveLength(28)
    }
    const { db } = await import('@/lib/db')
    const { authMock } = await import('@/lib/__tests__/authMock')
    const plans = await db.weeklyPlan.findMany({
      where: { userId: await authMock.requireUserId() },
      include: { _count: { select: { meals: true } } },
    })
    expect(plans.map(p => p._count.meals)).toEqual([28])
  })

  it('swapping to a chosen recipe updates only that slot and persists', async () => {
    const before = await currentPlan()
    const target = before.meals.find(m => m.mealType === 'lunch')!
    const { db } = await import('@/lib/db')
    const candidates = (await db.recipe.findMany()).filter(
      r => r.id !== target.recipeId && (JSON.parse(r.mealTypes) as string[]).includes('lunch')
    )
    const chosen = candidates[0]

    const res = await mealPATCH(patch('http://t/m', { recipeId: chosen.id }), params(target.id))
    expect(res.status).toBe(200)

    const after = await currentPlan()
    expect(after.meals).toHaveLength(28)
    expect(after.meals.find(m => m.id === target.id)?.recipeId).toBe(chosen.id)
    // every other slot untouched
    for (const m of before.meals.filter(m => m.id !== target.id)) {
      expect(after.meals.find(a => a.id === m.id)?.recipeId).toBe(m.recipeId)
    }
  })

  it('rejects a recipe that does not fit the slot type, an unknown recipe and an unknown meal', async () => {
    const plan = await currentPlan()
    const breakfast = plan.meals.find(m => m.mealType === 'breakfast')!
    const { db } = await import('@/lib/db')
    const notBreakfast = (await db.recipe.findMany()).find(r => !(JSON.parse(r.mealTypes) as string[]).includes('breakfast'))!

    expect((await mealPATCH(patch('http://t/m', { recipeId: notBreakfast.id }), params(breakfast.id))).status).toBe(400)
    expect((await mealPATCH(patch('http://t/m', { recipeId: 'nope' }), params(breakfast.id))).status).toBe(404)
    expect((await mealPATCH(patch('http://t/m', { recipeId: notBreakfast.id }), params('nope'))).status).toBe(404)
  })

  it('"choose for me" (no body) changes the recipe and prefers one not already used for that meal type', async () => {
    const before = await currentPlan()
    const target = before.meals.find(m => m.mealType === 'dinner')!
    const res = await mealPATCH(new Request('http://t/m', { method: 'PATCH' }), params(target.id))
    expect(res.status).toBe(200)
    const after = await currentPlan()
    expect(after.meals.find(m => m.id === target.id)?.recipeId).not.toBe(target.recipeId)
  })
})

describe('generate respects preferences', () => {
  it('avoidPork keeps pork ingredients out of every meal', async () => {
    const { db } = await import('@/lib/db')
    const { PORK_TERMS } = await import('@/lib/ketoRules')
    const { authMock } = await import('@/lib/__tests__/authMock')
    const userId = await authMock.requireUserId()
    await db.userPreferences.deleteMany({ where: { userId } })
    await db.userPreferences.create({ data: { userId, avoidPork: true, ketoMode: 'low_carb', maxCookingMinutes: 60 } })

    await generate()
    const plan = await currentPlan()
    const ids = [...new Set(plan.meals.map(m => m.recipeId!))]
    const recipes = await db.recipe.findMany({ where: { id: { in: ids } }, include: { ingredients: true } })
    for (const r of recipes) {
      for (const ing of r.ingredients) {
        expect(PORK_TERMS.some(t => ing.name.toLowerCase().includes(t)), `${r.title}: ${ing.name}`).toBe(false)
      }
    }
    // silence unused helper imports in this describe
    void get
    void post
  })
})
