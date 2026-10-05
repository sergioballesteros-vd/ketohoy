import { afterAll, beforeAll, expect, it, vi } from 'vitest'
import type { ReactElement } from 'react'
import { setupTestDb, get } from '@/lib/__tests__/testDb'
import { DEFAULT_PREFERENCES } from '@/lib/recipeScoring'
const auth = vi.hoisted(() => ({ userId: '' }))
vi.mock('@/lib/auth', () => ({
  requireUserId: async () => auth.userId,
  getSessionUser: async () => {
    const { db } = await import('@/lib/db')
    return db.user.findUnique({ where: { id: auth.userId } })
  },
}))
vi.mock('@/lib/terms', () => ({ hasAcceptedCurrentTerms: () => true }))
let cleanup: () => void
beforeAll(() => { ({ cleanup } = setupTestDb()) })
afterAll(() => cleanup())

it('home, suggestions, generation and preference creation share defaults for two new users', async () => {
  const { db } = await import('@/lib/db')
  const { default: Home } = await import('../page')
  const { GET: suggestions } = await import('../api/recipes/suggestions/route')
  const { POST: generate } = await import('../api/weekly-plan/generate/route')
  const { GET: preferences } = await import('../api/preferences/route')
  await db.recipe.updateMany({ data: { prepTimeMinutes: 999 } })
  const short = await db.recipe.create({ data: {
    title: 'Default short', description: '', mealTypes: '["breakfast","lunch","snack","dinner"]',
    prepTimeMinutes: 20, difficulty: 'easy', ketoLevel: 'strict', tags: '[]', steps: '[]',
    imageUrl: '/test.jpg', ingredients: { create: { name: 'Default missing ingredient' } },
  } })
  const long = await db.recipe.create({ data: {
    title: 'Default 25 minutes', description: '', mealTypes: '["breakfast","lunch","snack","dinner"]',
    prepTimeMinutes: 25, difficulty: 'easy', ketoLevel: 'strict', tags: '[]', steps: '[]',
    imageUrl: '/test.jpg', ingredients: { create: { name: 'Default ready ingredient' } },
  } })
  for (const index of [0, 1]) {
    const user = await db.user.create({ data: { email: `home-default-${index}@example.test`, passwordHash: 'fixture' } })
    auth.userId = user.id
    if (index === 0) {
      const product = await db.product.create({ data: { name: 'Default ready ingredient', category: 'other', source: 'manual', ownerId: user.id } })
      await db.pantryItem.create({ data: { userId: user.id, productId: product.id } })
    }
    const rendered = await Home() as ReactElement<{ stats: { featured: { id: string }; pantryCount: number; more: Array<{ id: string }> } }>
    expect(rendered.props.stats.featured.id).toBe(short.id)
    expect(rendered.props.stats.more.some(recipe => recipe.id === long.id)).toBe(false)
    expect(rendered.props.stats.pantryCount).toBe(index === 0 ? 1 : 0)
    const ideas = await (await suggestions(get('http://t/suggestions'))).json()
    expect(ideas.items.map((s: { recipe: { id: string } }) => s.recipe.id)).toEqual([short.id])
    const plan = await (await generate()).json()
    expect(plan.meals).toHaveLength(28)
    expect(plan.meals.every((meal: { recipeId: string }) => meal.recipeId === short.id)).toBe(true)
    expect(await db.userPreferences.findFirst({ where: { userId: user.id } })).toBeNull()
    expect(await (await preferences()).json()).toMatchObject(DEFAULT_PREFERENCES)
  }
})
