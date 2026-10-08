import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { setupTestDb } from '@/lib/__tests__/testDb'
import { DEFAULT_PREFERENCES } from '@/lib/recipeScoring'

vi.mock('@/lib/auth', async () => (await import('@/lib/__tests__/authMock')).authMock)

let cleanup: () => void
beforeAll(() => { ({ cleanup } = setupTestDb()) })
afterAll(() => cleanup())

describe('database domain uniqueness', () => {
  it('keeps one preferences row per user, allows other users and legacy NULL owners', async () => {
    const { db } = await import('@/lib/db')
    const user = await db.user.create({ data: { email: 'kh034-preferences@example.test', passwordHash: 'fixture' } })
    const prefs = await db.userPreferences.create({ data: { userId: user.id, ...DEFAULT_PREFERENCES } })
    await expect(db.userPreferences.create({ data: { userId: user.id, ...DEFAULT_PREFERENCES } })).rejects.toMatchObject({ code: 'P2002' })
    expect(await db.userPreferences.update({ where: { userId: user.id }, data: { avoidFish: true } })).toMatchObject({ id: prefs.id, avoidFish: true })
    await db.userPreferences.create({ data: { ...DEFAULT_PREFERENCES } })
    await db.userPreferences.create({ data: { ...DEFAULT_PREFERENCES } })
    expect(await db.userPreferences.count({ where: { userId: null } })).toBeGreaterThanOrEqual(2)
  })

  it('keeps one pantry row per user, product, and unit while allowing separate units', async () => {
    const { db } = await import('@/lib/db')
    const first = await db.user.create({ data: { email: 'kh034-pantry-a@example.test', passwordHash: 'fixture' } })
    const second = await db.user.create({ data: { email: 'kh034-pantry-b@example.test', passwordHash: 'fixture' } })
    const product = await db.product.create({ data: { name: 'KH034 pantry product', category: 'other' } })
    const item = await db.pantryItem.create({ data: { userId: first.id, productId: product.id, quantity: 2, unit: 'unidad' } })
    await expect(db.pantryItem.create({ data: { userId: first.id, productId: product.id, quantity: 99, unit: 'unidad' } })).rejects.toMatchObject({ code: 'P2002' })
    await db.pantryItem.create({ data: { userId: first.id, productId: product.id, quantity: 1, unit: 'kg' } })
    await db.pantryItem.create({ data: { userId: second.id, productId: product.id } })
    await db.pantryItem.create({ data: { productId: product.id } })
    await db.pantryItem.create({ data: { productId: product.id } })
    await db.pantryItem.create({ data: { userId: first.id, productId: product.id } })
    await db.pantryItem.create({ data: { userId: first.id, productId: product.id } })
    expect(await db.pantryItem.count({ where: { userId: first.id, productId: product.id, unit: null } })).toBe(2)
    expect(await db.pantryItem.findUnique({ where: { userId_productId_unit: { userId: first.id, productId: product.id, unit: 'unidad' } } })).toMatchObject({ id: item.id, quantity: 2, unit: 'unidad' })
  })

  it('allows one weekly plan per user and week while separating users and weeks', async () => {
    const { db } = await import('@/lib/db')
    const first = await db.user.create({ data: { email: 'kh034-plan-a@example.test', passwordHash: 'fixture' } })
    const second = await db.user.create({ data: { email: 'kh034-plan-b@example.test', passwordHash: 'fixture' } })
    const week = new Date('2026-10-05T00:00:00.000Z')
    await db.weeklyPlan.create({ data: { userId: first.id, weekStart: week } })
    await expect(db.weeklyPlan.create({ data: { userId: first.id, weekStart: week } })).rejects.toMatchObject({ code: 'P2002' })
    await db.weeklyPlan.create({ data: { userId: second.id, weekStart: week } })
    await db.weeklyPlan.create({ data: { userId: first.id, weekStart: new Date('2026-10-12T00:00:00.000Z') } })
    await db.weeklyPlan.create({ data: { weekStart: week } })
    await db.weeklyPlan.create({ data: { weekStart: week } })
  })

  it('keeps each meal slot unique within a plan but permits other days and meal types', async () => {
    const { db } = await import('@/lib/db')
    const user = await db.user.create({ data: { email: 'kh034-slot@example.test', passwordHash: 'fixture' } })
    const plan = await db.weeklyPlan.create({ data: { userId: user.id, weekStart: new Date('2026-10-05T00:00:00.000Z') } })
    await db.weeklyMeal.create({ data: { planId: plan.id, dayOfWeek: 0, mealType: 'breakfast' } })
    await expect(db.weeklyMeal.create({ data: { planId: plan.id, dayOfWeek: 0, mealType: 'breakfast' } })).rejects.toMatchObject({ code: 'P2002' })
    await db.weeklyMeal.create({ data: { planId: plan.id, dayOfWeek: 1, mealType: 'breakfast' } })
    await db.weeklyMeal.create({ data: { planId: plan.id, dayOfWeek: 0, mealType: 'lunch' } })
  })

  it('concurrent preference GETs converge on one created row and PATCH still updates it', async () => {
    const { db } = await import('@/lib/db')
    const { GET, PATCH } = await import('@/app/api/preferences/route')
    const [a, b] = await Promise.all([GET(), GET()])
    expect(a.status).toBe(200)
    expect(b.status).toBe(200)
    const [first, second] = await Promise.all([a.json(), b.json()])
    expect(first.id).toBe(second.id)
    const userId = await (await import('@/lib/__tests__/authMock')).authMock.requireUserId()
    expect(await db.userPreferences.count({ where: { userId } })).toBe(1)
    const updated = await PATCH(new Request('http://test/api/preferences', { method: 'PATCH', body: JSON.stringify({ ketoMode: 'strict' }) }))
    expect(await updated.json()).toMatchObject({ id: first.id, ketoMode: 'strict' })
  })
})
