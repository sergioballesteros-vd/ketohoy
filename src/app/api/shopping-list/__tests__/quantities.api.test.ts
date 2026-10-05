import { afterAll, beforeAll, expect, it, vi } from 'vitest'
import { setupTestDb, post, patch, get } from '@/lib/__tests__/testDb'
const account = vi.hoisted(() => ({ id: null as string | null }))
vi.mock('@/lib/auth', async () => ({ requireUserId: async () => account.id ?? (await import('@/lib/__tests__/authMock')).authMock.requireUserId() }))
let list: typeof import('../route')
let quantityPATCH: typeof import('../[id]/quantity/route').PATCH
let check: typeof import('../[id]/check/route').PATCH
let mark: typeof import('../mark-bought/route').POST
let products: typeof import('../../products/route').POST
let cleanup: () => void
let db: typeof import('@/lib/db').db
let recipeAdd: typeof import('../../recipes/[id]/add-to-shopping-list/route').POST
const params = (id: string) => ({ params: Promise.resolve({ id }) })
beforeAll(async () => {
  ;({ cleanup } = setupTestDb())
  ;({ db } = await import('@/lib/db'))
  list = await import('../route')
  ;({ PATCH: quantityPATCH } = await import('../[id]/quantity/route'))
  ;({ PATCH: check } = await import('../[id]/check/route'))
  ;({ POST: mark } = await import('../mark-bought/route'))
  ;({ POST: products } = await import('../../products/route'))
  ;({ POST: recipeAdd } = await import('../../recipes/[id]/add-to-shopping-list/route'))
})
afterAll(() => cleanup())
it('preserves 200 g from the real recipe endpoint, original text and ingredient identity', async () => {
  const recipe = await db.recipe.create({ data: {
    title: 'KH005 real flow', description: '', mealTypes: '["lunch"]', prepTimeMinutes: 5, difficulty: 'easy', ketoLevel: 'strict', steps: '[]',
    ingredients: { create: { name: 'KH005 chicken', quantity: '200 g' } },
  }, include: { ingredients: true } })
  const res = await recipeAdd(post('http://t/recipe'), params(recipe.id))
  expect(res.status).toBe(200)
  const rows = await db.shoppingListItem.findMany({ where: { name: 'KH005 chicken' } })
  expect(rows).toHaveLength(1)
  expect(rows[0]).toMatchObject({ requiredQuantity: 200, requiredUnit: 'g', originalIngredientText: '200 g', sourceType: 'recipe' })
  expect(JSON.stringify(rows[0])).toContain(recipe.ingredients[0].id)
})
const recipe = (name: string, quantity: string | null = '300 g', productId?: string) => db.recipe.create({ data: {
  title: name, description: '', mealTypes: '["lunch"]', prepTimeMinutes: 5, difficulty: 'easy', ketoLevel: 'strict', steps: '[]',
  ingredients: { create: { name, quantity, productId } },
}, include: { ingredients: true } })
const generate = async (id: string, mealId?: string) => {
  const res = await recipeAdd(post('http://t/recipe', mealId ? { mealId } : {}), params(id))
  expect(res.status).toBe(200)
  return await res.json() as { added: number; items: import('@/generated/prisma/client').ShoppingListItem[] }
}
const buy = (id: string) => check(get('http://t/check'), params(id))
it('retry and concurrent synchronization keep source and quantity unchanged', async () => {
  const r = await recipe('Idempotent chicken')
  const first = await generate(r.id)
  const repeats = await Promise.all([generate(r.id), generate(r.id)])
  expect(repeats.map(r => r.added)).toEqual([0,0])
  expect(repeats[0].items[0]).toEqual(first.items[0])
  expect(await db.shoppingListItem.count({ where: { sourceKey: first.items[0].sourceKey } })).toBe(1)
})
it('two recipes with the same ingredient keep both origins; incompatible quantities stay separate', async () => {
  const a = await recipe('Distinct chicken', '200 g'), b = await recipe('Distinct chicken', '1 kg'), c = await recipe('Distinct chicken', '2 unidades')
  const rows = (await Promise.all([generate(a.id), generate(b.id), generate(c.id)])).map(r => r.items[0])
  expect(new Set(rows.map(r => r.sourceKey)).size).toBe(3)
  expect(rows.map(r => [r.requiredQuantity,r.requiredUnit])).toEqual([[200,'g'],[1,'kg'],[2,'unidad']])
})
it('two owned slots of the same recipe are distinct; foreign slot and recipe mismatch are rejected', async () => {
  const user = await db.user.findUniqueOrThrow({ where: { email: 'test@example.com' } })
  const r = await recipe('Slot chicken')
  const plan = await db.weeklyPlan.create({ data: { userId: user.id, weekStart: new Date(), meals: { create: [0,1].map(dayOfWeek => ({ dayOfWeek, mealType: 'lunch', recipeId: r.id })) } }, include: { meals: true } })
  const a = await generate(r.id, plan.meals[0].id), b = await generate(r.id, plan.meals[1].id)
  expect(a.items[0].sourceKey).not.toBe(b.items[0].sourceKey)
  expect((await generate(r.id,plan.meals[0].id)).added).toBe(0)
  const other = await db.user.create({ data: { email: 'kh005-other@example.com' } })
  account.id = other.id
  try {
    expect((await recipeAdd(post('http://t/r',{ mealId: plan.meals[0].id }),params(r.id))).status).toBe(404)
    expect((await buy(a.items[0].id)).status).toBe(404)
    expect((await quantityPATCH(patch('http://t/q',{ delta: 1 }),params(a.items[0].id))).status).toBe(404)
    expect(await (await mark(post('http://t/m',{ ids: [a.items[0].id] }))).json()).toEqual({ marked: 0 })
    expect((await (await list.GET()).json()).some((i: {id:string}) => i.id === a.items[0].id)).toBe(false)
    const own = await generate(r.id)
    expect(own.items[0].userId).toBe(other.id)
  } finally { account.id = null }
  const different = await recipe('Wrong recipe')
  expect((await recipeAdd(post('http://t/r',{ mealId: plan.meals[0].id }),params(different.id))).status).toBe(404)
})
it('association preserves need; known 500 g package bought once adds 500 g, not 300 g', async () => {
  const r = await recipe('Known chicken')
  const item = (await generate(r.id)).items[0]
  const product = await (await products(post('http://t/p',{ name: '500g commercial chicken', category: 'meat', packageQuantity: 500, packageUnit: 'g' }))).json()
  const linked = await (await quantityPATCH(patch('http://t/q',{ productId: product.id, purchaseQuantity: 1 }),params(item.id))).json()
  expect(linked).toMatchObject({ requiredQuantity: 300, requiredUnit: 'g', purchaseQuantity: 1, sourceKey: item.sourceKey })
  expect((await buy(item.id)).status).toBe(200)
  const stock = await db.pantryItem.findFirstOrThrow({ where: { productId: product.id } })
  expect(stock).toMatchObject({ quantity: 500, unit: 'g' })
  expect(await db.shoppingListItem.findUniqueOrThrow({ where: { id: item.id } })).toMatchObject({ pantryDelta: 500, pantryDeltaUnit: 'g', pantryItemId: stock.id })
  expect((await generate(r.id)).added).toBe(0)
  expect((await buy(item.id)).status).toBe(200)
  expect(await db.pantryItem.findUnique({ where: { id: stock.id } })).toBeNull()
})
it('unknown package preserves only explicit package count and never invents physical content', async () => {
  const item = await (await list.POST(post('http://t/l',{ name: 'Unknown package 500 g in name', quantity: 2, requiredQuantity: 300, requiredUnit: 'g' }))).json()
  await buy(item.id)
  const bought = await db.shoppingListItem.findUniqueOrThrow({ where: { id: item.id } })
  expect(await db.pantryItem.findUniqueOrThrow({ where: { id: bought.pantryItemId! } })).toMatchObject({ quantity: 2, unit: 'paquete' })
})
it('legacy remains readable and buying does not reinterpret quantity as a physical amount', async () => {
  const user = await db.user.findUniqueOrThrow({ where: { email: 'test@example.com' } })
  const old = await db.shoppingListItem.create({ data: { name: 'KH005 legacy', userId: user.id, quantity: '1' } })
  expect((await (await list.GET()).json()).find((r: {id:string}) => r.id === old.id)).toMatchObject({ purchaseQuantity: null, requiredQuantity: null, sourceType: 'legacy' })
  await buy(old.id)
  const bought = await db.shoppingListItem.findUniqueOrThrow({ where: { id: old.id } })
  expect(await db.pantryItem.findUniqueOrThrow({ where: { id: bought.pantryItemId! } })).toMatchObject({ quantity: null, unit: null })
  await buy(old.id)
  expect(await db.pantryItem.findUnique({ where: { id: bought.pantryItemId! } })).toBeNull()
})
it('physical transfer converts g into existing kg and reverses even after a compatible unit edit', async () => {
  const user = await db.user.findUniqueOrThrow({ where: { email: 'test@example.com' } })
  const product = await db.product.create({ data: { name: 'Kilogram chicken', category: 'meat', source: 'mercadona', packageQuantity: 500, packageUnit: 'g' } })
  const stock = await db.pantryItem.create({ data: { userId: user.id, productId: product.id, quantity: 1, unit: 'kg' } })
  const item = await (await list.POST(post('http://t/l',{ name: product.name, productId: product.id, quantity: 1 }))).json()
  await buy(item.id)
  expect(await db.pantryItem.findUniqueOrThrow({ where: { id: stock.id } })).toMatchObject({ quantity: 1.5, unit: 'kg' })
  await db.pantryItem.update({ where: { id: stock.id }, data: { quantity: 1500, unit: 'g' } })
  await buy(item.id)
  expect(await db.pantryItem.findUniqueOrThrow({ where: { id: stock.id } })).toMatchObject({ quantity: 1000, unit: 'g' })
})
it('incompatible stock stays untouched and reversal targets only the purchase row', async () => {
  const user = await db.user.findUniqueOrThrow({ where: { email: 'test@example.com' } })
  const product = await db.product.create({ data: { name: 'Separate stock', category: 'meat', source: 'mercadona', packageQuantity: 500, packageUnit: 'g' } })
  const original = await db.pantryItem.create({ data: { userId: user.id, productId: product.id, quantity: 2, unit: 'unidad' } })
  const item = await (await list.POST(post('http://t/l',{ name: product.name, productId: product.id, quantity: 1 }))).json()
  await buy(item.id)
  const bought = await db.shoppingListItem.findUniqueOrThrow({ where: { id: item.id } })
  expect(bought.pantryItemId).not.toBe(original.id)
  await buy(item.id)
  expect(await db.pantryItem.findUniqueOrThrow({ where: { id: original.id } })).toEqual(original)
})
it('incompatible edit rejects unbuy atomically instead of subtracting grams from units', async () => {
  const item = await (await list.POST(post('http://t/l',{ name: 'Changed dimension', quantity: 2 }))).json()
  await buy(item.id)
  const bought = await db.shoppingListItem.findUniqueOrThrow({ where: { id: item.id } })
  await db.pantryItem.update({ where: { id: bought.pantryItemId! }, data: { unit: 'kg' } })
  expect((await buy(item.id)).status).toBe(409)
  expect(await db.shoppingListItem.findUniqueOrThrow({ where: { id: item.id } })).toEqual(bought)
  expect(await db.pantryItem.findUniqueOrThrow({ where: { id: bought.pantryItemId! } })).toMatchObject({ quantity: 2, unit: 'kg' })
})
it('private product cannot be associated or bought by another account; nutrition unknown stays unknown', async () => {
  const other = await db.user.findUniqueOrThrow({ where: { email: 'kh005-other@example.com' } })
  const privateProduct = await db.product.create({ data: { name: 'Private package', ownerId: other.id, category: 'meat', packageQuantity: 500, packageUnit: 'g', netCarbsPer100g: 7 } })
  const item = await (await list.POST(post('http://t/l',{ name: 'Private association' }))).json()
  expect((await quantityPATCH(patch('http://t/q',{ productId: privateProduct.id }),params(item.id))).status).toBe(404)
  await db.shoppingListItem.update({ where: { id: item.id }, data: { productId: privateProduct.id } })
  expect((await buy(item.id)).status).toBe(404)
  expect(await db.shoppingListItem.findUniqueOrThrow({ where: { id: item.id } })).toMatchObject({ checked: false, pantryDelta: null })
  expect(await db.product.findUniqueOrThrow({ where: { id: privateProduct.id } })).toMatchObject({ nutritionConvention: 'unknown', netCarbsPer100g: 7 })
})
it.each([{ quantity: -1 },{ quantity: 'NaN' },{ purchaseQuantity: -1 },{ requiredQuantity: 2, requiredUnit: '' },{ requiredQuantity: 2 },{ requiredUnit: 'g' },{ quantity: 2, purchaseQuantity: 3 }])('rejects impossible shopping input %j', async fields => {
  expect((await list.POST(post('http://t/l',{ name: 'Invalid quantity', ...fields }))).status).toBe(400)
})
it.each([{ packageQuantity: -1, packageUnit: 'g' },{ packageQuantity: 2, packageUnit: '' },{ packageQuantity: 2 },{ packageUnit: 'g' }])('rejects impossible package input %j', async fields => {
  expect((await products(post('http://t/p',{ name: 'Invalid package', category: 'meat', ...fields }))).status).toBe(400)
})
it('unknown ingredient expression preserves its exact text without manufacturing units', async () => {
  const r = await recipe('Unknown culinary amount', 'un puñado, al gusto')
  expect((await generate(r.id)).items[0]).toMatchObject({ requiredQuantity: null, requiredUnit: null, originalIngredientText: 'un puñado, al gusto', purchaseQuantity: null })
})
it('buying count packages normalizes only the evidenced count, without changing nutrition per 100g', async () => {
  const product = await (await products(post('http://t/p',{ name: 'Six eggs', category: 'eggs', packageQuantity: 6, packageUnit: 'unidades', netCarbsPer100g: 5.9 }))).json()
  const item = await (await list.POST(post('http://t/l',{ name: product.name, productId: product.id, quantity: 2 }))).json()
  await buy(item.id)
  const bought = await db.shoppingListItem.findUniqueOrThrow({ where: { id: item.id } })
  expect(await db.pantryItem.findUniqueOrThrow({ where: { id: bought.pantryItemId! } })).toMatchObject({ quantity: 12, unit: 'unidad' })
  expect(await db.product.findUniqueOrThrow({ where: { id: product.id } })).toEqual({ ...product, createdAt: new Date(product.createdAt), updatedAt: new Date(product.updatedAt) })
})
it('manual packages with the same name but different content are distinct offers', async () => {
  const create = async (packageQuantity: number) => (await products(post('http://t/p',{ name: 'Chicken package variants', category: 'meat', packageQuantity, packageUnit: 'g' }))).json()
  const small = await create(500), large = await create(1000), retry = await create(500)
  expect(small.id).not.toBe(large.id)
  expect(retry.id).toBe(small.id)
  expect([small.packageQuantity,large.packageQuantity]).toEqual([500,1000])
})
it('manual purchases of an associated product never merge with or mutate its recipe need', async () => {
  const product = await db.product.create({ data: { name: 'Two domains chicken', source: 'mercadona', category: 'meat' } })
  const r = await recipe(product.name, '200 g', product.id)
  const need = (await generate(r.id)).items[0]
  const snapshot = await db.shoppingListItem.findUniqueOrThrow({ where: { id: need.id } })
  const add = () => list.POST(post('http://t/l',{ name: product.name, productId: product.id, quantity: 2 }))
  const purchase = await (await add()).json()
  expect(purchase.id).not.toBe(need.id)
  const repeated = await (await add()).json()
  expect(repeated).toMatchObject({ id: purchase.id, purchaseQuantity: 4, requiredQuantity: null })
  expect(await db.shoppingListItem.findUniqueOrThrow({ where: { id: need.id } })).toEqual(snapshot)
})
it('explicit undo of a legacy row preserves opaque text and does not infer a package count', async () => {
  const restored = await list.POST(post('http://t/l',{ name:'Undo legacy quantity', purchaseQuantity:null, legacyQuantity:'1', requiredQuantity:null, requiredUnit:null }))
  expect(restored.status).toBe(201)
  const item = await restored.json()
  expect(item).toMatchObject({ quantity:'1', purchaseQuantity:null, requiredQuantity:null, sourceType:'legacy' })
  await buy(item.id)
  const bought = await db.shoppingListItem.findUniqueOrThrow({ where: { id: item.id } })
  expect(await db.pantryItem.findUniqueOrThrow({ where: { id:bought.pantryItemId! } })).toMatchObject({quantity:null,unit:null})
})
