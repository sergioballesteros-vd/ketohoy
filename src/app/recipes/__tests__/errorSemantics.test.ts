import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { setupTestDb } from '@/lib/__tests__/testDb'
import HomeError from '../../error'

const navigation = vi.hoisted(() => ({
  notFound: vi.fn((): never => { throw new Error('NEXT_NOT_FOUND') }),
}))
vi.mock('next/navigation', () => ({ notFound: navigation.notFound, redirect: vi.fn() }))
vi.mock('@/lib/auth', () => ({ getSessionUser: async () => null }))
vi.mock('@/lib/terms', () => ({ hasAcceptedCurrentTerms: () => true }))

let cleanup: () => void
let db: typeof import('@/lib/db').db
let RecipePage: typeof import('../[id]/page').default
let generateMetadata: typeof import('../[id]/page').generateMetadata
let RecipeLayout: typeof import('../[id]/layout').default

beforeAll(async () => {
  ;({ cleanup } = setupTestDb())
  ;({ db } = await import('@/lib/db'))
  ;({ default: RecipePage, generateMetadata } = await import('../[id]/page'))
  ;({ default: RecipeLayout } = await import('../[id]/layout'))
})
afterAll(() => cleanup())
beforeEach(() => {
  navigation.notFound.mockClear()
  vi.restoreAllMocks()
})

describe('recipe detail error semantics', () => {
  it('renders an existing recipe and keeps a genuinely absent recipe on the not-found path', async () => {
    const recipe = await db.recipe.create({ data: {
      title: 'Error semantics recipe', description: '', mealTypes: '[]', prepTimeMinutes: 10,
      difficulty: 'easy', ketoLevel: 'strict', steps: '[]',
    } })
    const rendered = await RecipePage({ params: Promise.resolve({ id: recipe.id }) })
    expect(rendered.type).toBe('main')
    expect(navigation.notFound).not.toHaveBeenCalled()
    await expect(RecipeLayout({ children: 'child', params: Promise.resolve({ id: recipe.id }) })).resolves.toBe('child')

    await expect(RecipePage({ params: Promise.resolve({ id: 'missing-recipe' }) })).rejects.toThrow('NEXT_NOT_FOUND')
    expect(navigation.notFound).toHaveBeenCalledTimes(1)
    navigation.notFound.mockClear()
    await expect(RecipeLayout({ children: 'child', params: Promise.resolve({ id: 'missing-recipe' }) })).rejects.toThrow('NEXT_NOT_FOUND')
    expect(navigation.notFound).toHaveBeenCalledTimes(1)
  })

  it('propagates recipe query failures without converting them to not-found', async () => {
    const recipe = await db.recipe.create({ data: {
      title: 'Retry semantics recipe', description: '', mealTypes: '[]', prepTimeMinutes: 10,
      difficulty: 'easy', ketoLevel: 'strict', steps: '[]',
    } })
    const failure = new Error('database failure detail')
    vi.spyOn(db.recipe, 'findUnique').mockRejectedValueOnce(failure as never)
    await expect(RecipePage({ params: Promise.resolve({ id: recipe.id }) })).rejects.toBe(failure)
    expect(navigation.notFound).not.toHaveBeenCalled()
    expect((await RecipePage({ params: Promise.resolve({ id: recipe.id }) })).type).toBe('main')

    vi.spyOn(db.recipe, 'findUnique').mockRejectedValueOnce(failure as never)
    await expect(RecipeLayout({ children: 'child', params: Promise.resolve({ id: recipe.id }) })).rejects.toBe(failure)
    expect(navigation.notFound).not.toHaveBeenCalled()
    await expect(RecipeLayout({ children: 'child', params: Promise.resolve({ id: recipe.id }) })).resolves.toBe('child')
  })

  it('omits unreviewed stored image URLs from recipe metadata', async () => {
    const recipe = await db.recipe.create({ data: {
      title: 'Unreviewed metadata image', description: '', mealTypes: '[]', prepTimeMinutes: 10,
      difficulty: 'easy', ketoLevel: 'strict', steps: '[]', imageUrl: 'https://images.unsplash.com/unreviewed',
    } })
    const metadata = await generateMetadata({ params: Promise.resolve({ id: recipe.id }) })
    expect(metadata.openGraph?.images).toBeUndefined()
    expect(metadata.twitter).toMatchObject({ card: 'summary' })
  })

  it('offers an accessible retry for technical page failures', () => {
    const retry = vi.fn()
    const fallback = HomeError({ error: new Error('private database detail'), retry })
    const [, message, button] = fallback.props.children
    expect(message.props.children).toContain('No se pudo cargar la página')
    expect(button.props.children).toBe('Reintentar')
    expect(button.props.onClick).toBe(retry)
    expect(button.props.className).toContain('focus-visible:outline-2')
  })
})
