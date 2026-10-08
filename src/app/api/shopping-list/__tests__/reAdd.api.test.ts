import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { setupTestDb, post, del, get } from '@/lib/__tests__/testDb'

vi.mock('@/lib/auth', async () => (await import('@/lib/__tests__/authMock')).authMock)
// Only the external catalog boundary is stubbed; handlers and SQLite writes are real.
vi.mock('@/lib/mercadona', () => ({
  getMercadonaProduct: vi.fn(async (id: string) => ({ mercadonaId: id, name: `Catalog ${id}`, category: 'dairy', classification: { score: 4, label: 'Estimación por categoría', source: 'category_estimate', evidence: 'category_name' }, ean: null, unitPrice: 1, imageUrl: null, brand: null })),
}))

let cleanup: () => void
let db: typeof import('@/lib/db').db
let list: typeof import('../route')
let checkPATCH: typeof import('../[id]/check/route').PATCH
let mercadona: typeof import('../../mercadona/add/route').POST
let recipeAdd: typeof import('../../recipes/[id]/add-to-shopping-list/route').POST
let quantityPATCH: typeof import('../[id]/quantity/route').PATCH
let productCreate: typeof import('../../products/route').POST
const params = (id: string) => ({ params: Promise.resolve({ id }) })
const check = (id: string) => checkPATCH(get('http://t/check'), params(id))

beforeAll(async () => {
  ;({ cleanup } = setupTestDb())
  ;({ db } = await import('@/lib/db'))
  list = await import('../route')
  ;({ PATCH: checkPATCH } = await import('../[id]/check/route'))
  ;({ POST: mercadona } = await import('../../mercadona/add/route'))
  ;({ POST: recipeAdd } = await import('../../recipes/[id]/add-to-shopping-list/route'))
  ;({ PATCH: quantityPATCH } = await import('../[id]/quantity/route'))
  ;({ POST: productCreate } = await import('../../products/route'))
})
afterAll(() => cleanup())

describe('new needs preserve purchased history', () => {
  it('reimport keeps persisted valid nutrition and passes it to avoid an unnecessary provider request', async () => {
    const { getMercadonaProduct } = await import('@/lib/mercadona')
    const existing = await db.product.create({ data: {
      name: 'Known nutrition', source: 'mercadona', mercadonaId: 'nutrition-safe', category: 'dairy', ketoScore: 4,
      nutritionConvention: 'available_excluding_fiber', nutritionSource: 'openfoodfacts', netCarbsPer100g: 4.2,
      carbsPer100g: 4.2, fiberPer100g: 0.2, fatPer100g: 8, proteinPer100g: 7, caloriesPer100g: 110,
    } })
    const result = await mercadona(post('http://t/mercadona', { mercadonaId: 'nutrition-safe' }))
    expect(result.status).toBe(200)
    expect(vi.mocked(getMercadonaProduct)).toHaveBeenLastCalledWith('nutrition-safe', expect.objectContaining({ availableCarbsPer100g: 4.2 }))
    expect(await db.product.findUniqueOrThrow({ where: { id: existing.id } })).toMatchObject({
      nutritionConvention: 'available_excluding_fiber', nutritionSource: 'openfoodfacts', netCarbsPer100g: 4.2, fiberPer100g: 0.2,
    })
  })

  it.each(['manual', 'product', 'mercadona', 'recipe'])('%s add -> buy -> re-add -> buy/reverse -> clear bought', async entry => {
    const name = `Re-add ${entry}`
    let productId: string | undefined
    let recipeId: string | undefined
    if (entry === 'product' || entry === 'recipe') {
      productId = (await (await productCreate(post('http://t/products', { name, category: 'other' }))).json()).id
    }
    if (entry === 'recipe') {
      recipeId = (await db.recipe.create({ data: {
        title: name, description: 'Test recipe', mealTypes: '["lunch"]', prepTimeMinutes: 10, difficulty: 'easy', ketoLevel: 'strict', steps: '[]',
        ingredients: { create: { name, productId, quantity: '2 unidades' } },
      } })).id
    }
    const add = async () => {
      if (entry === 'mercadona') {
        const result = await mercadona(post('http://t/mercadona', { mercadonaId: 'kh006', addToShoppingList: true, quantity: 2 }))
        expect(result.status).toBe(200)
        return (await result.json()).shoppingItem
      }
      if (entry === 'recipe') {
        const user = await db.user.findUniqueOrThrow({ where: { email: 'test@example.com' } })
        const plan = await db.weeklyPlan.create({ data: { userId: user.id, weekStart: new Date(), meals: { create: { recipeId, dayOfWeek: 0, mealType: 'lunch' } } }, include: { meals: true } })
        const result = await recipeAdd(post('http://t/recipe', { mealId: plan.meals[0].id }), params(recipeId!))
        expect(result.status).toBe(200)
        const items = await (await list.GET()).json()
        const item = items.find((item: { name: string; checked: boolean }) => item.name === name && !item.checked)
        return (await quantityPATCH(new Request('http://t/quantity', { method: 'PATCH', body: JSON.stringify({ delta: 2 }) }), params(item.id))).json()
      }
      const result = await list.POST(post('http://t/list', { name, productId, quantity: 2 }))
      expect([200, 201]).toContain(result.status)
      return result.json()
    }
    const first = await add()
    expect((await check(first.id)).status).toBe(200)
    const history = await db.shoppingListItem.findUniqueOrThrow({ where: { id: first.id } })
    productId = history.productId!
    expect(history).toMatchObject({ checked: true, quantity: '2', pantryDelta: 2 })
    const stock = () => db.pantryItem.findFirst({ where: { productId } })
    expect((await stock())?.quantity).toBe(2)

    // Recipe missing detection is presence-based: simulate stock consumed before a new recipe need.
    if (entry === 'recipe') await db.pantryItem.deleteMany({ where: { productId } })
    const initialStock = entry === 'recipe' ? 0 : 2
    const second = await add()
    expect(second.id).not.toBe(first.id)
    expect(second).toMatchObject({ checked: false, quantity: '2' })
    expect(await db.shoppingListItem.findUniqueOrThrow({ where: { id: first.id } })).toEqual(history)
    expect((await stock())?.quantity ?? 0).toBe(initialStock)
    expect((await (await list.GET()).json()).some((item: { id: string; checked: boolean }) => item.id === second.id && !item.checked)).toBe(true)

    // A retry/add of a pending need still follows the existing merge contract.
    if (entry !== 'recipe') {
      const merged = await add()
      expect(merged).toMatchObject({ id: second.id, quantity: '4', checked: false })
    }
    const purchasedQuantity = entry === 'recipe' ? 2 : 4
    expect((await check(second.id)).status).toBe(200)
    expect((await stock())?.quantity).toBe(initialStock + purchasedQuantity)
    expect((await check(second.id)).status).toBe(200)
    expect((await stock())?.quantity ?? 0).toBe(initialStock)
    expect(await db.shoppingListItem.findUniqueOrThrow({ where: { id: first.id } })).toEqual(history)

    expect((await list.DELETE(del('http://t/list', { ids: [first.id] }))).status).toBe(200)
    expect(await db.shoppingListItem.findUnique({ where: { id: first.id } })).toBeNull()
    expect(await db.shoppingListItem.findUniqueOrThrow({ where: { id: second.id } })).toMatchObject({ checked: false, pantryDelta: null })
    expect((await stock())?.quantity ?? 0).toBe(initialStock)
  })
})
