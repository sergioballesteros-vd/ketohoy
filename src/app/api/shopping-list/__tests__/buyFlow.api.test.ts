import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { setupTestDb, get, post, patch } from '@/lib/__tests__/testDb'

vi.mock('@/lib/auth', async () => (await import('@/lib/__tests__/authMock')).authMock)

let listPOST: typeof import('../route').POST
let checkPATCH: typeof import('../[id]/check/route').PATCH
let markBought: typeof import('../mark-bought/route').POST
let pantryGET: typeof import('../../pantry/route').GET
let productPOST: typeof import('../../products/route').POST
let pantryPOST: typeof import('../../pantry/route').POST
let pantryPATCH: typeof import('../../pantry/[id]/route').PATCH
let cleanup: () => void
let productId: string

const params = (id: string) => ({ params: Promise.resolve({ id }) })
const check = (id: string) => checkPATCH(get('http://t/check'), params(id))
const pantry = async () => (await (await pantryGET()).json()) as Array<{ id: string; productId: string; quantity: number | null; unit: string | null; product: { name: string; source: string } }>

beforeAll(async () => {
  ;({ cleanup } = setupTestDb())
  ;({ POST: listPOST } = await import('../route'))
  ;({ PATCH: checkPATCH } = await import('../[id]/check/route'))
  ;({ POST: markBought } = await import('../mark-bought/route'))
  ;({ GET: pantryGET, POST: pantryPOST } = await import('../../pantry/route'))
  ;({ POST: productPOST } = await import('../../products/route'))
  ;({ PATCH: pantryPATCH } = await import('../../pantry/[id]/route'))
  const { db } = await import('@/lib/db')
  const inPantry = (await db.pantryItem.findMany({ select: { productId: true } })).map(i => i.productId)
  productId = (await db.product.findFirstOrThrow({ where: { id: { notIn: inPantry } } })).id
})

afterAll(() => cleanup())

describe('shopping list -> pantry', () => {
  it('buying moves the bought quantity into the pantry and adds up across purchases', async () => {
    const first = await (await listPOST(post('http://t/l', { name: 'Bought A', productId, quantity: 3 }))).json()
    await check(first.id)
    expect((await pantry()).find(p => p.productId === productId)?.quantity).toBe(3)

    // same product bought again later: quantities add up instead of being ignored
    const { db } = await import('@/lib/db')
    await db.shoppingListItem.delete({ where: { id: first.id } })
    const second = await (await listPOST(post('http://t/l', { name: 'Bought A', productId, quantity: 2 }))).json()
    await check(second.id)
    expect((await pantry()).find(p => p.productId === productId)?.quantity).toBe(5)
  })

  it('un-checking takes exactly that quantity back out (checking twice never double counts)', async () => {
    const item = await (await listPOST(post('http://t/l', { name: 'Bought B', quantity: 2 }))).json()
    await check(item.id) // manual item: creates a product + pantry row
    const row = () => pantry().then(p => p.find(x => x.product.name === 'Bought B'))
    expect((await row())?.quantity).toBe(2)
    expect((await row())?.product.source).toBe('manual')

    await check(item.id) // un-check
    expect(await row()).toBeUndefined()

    await check(item.id) // buy again
    expect((await row())?.quantity).toBe(2)
  })

  it('mark-bought skips items that are already bought', async () => {
    const item = await (await listPOST(post('http://t/l', { name: 'Bought C', quantity: 4 }))).json()
    expect(await (await markBought(post('http://t/m', { ids: [item.id] }))).json()).toEqual({ marked: 1 })
    expect(await (await markBought(post('http://t/m', { ids: [item.id] }))).json()).toEqual({ marked: 0 })
    expect((await pantry()).find(p => p.product.name === 'Bought C')?.quantity).toBe(4)
  })
})

describe('buy / un-buy invariants', () => {
  const qtyOf = async (pid: string) => (await pantry()).find(p => p.productId === pid)?.quantity
  // a product in neither the pantry nor the list (list rows for the same product would merge)
  const freshProduct = async () => {
    const { db } = await import('@/lib/db')
    const used = [
      ...(await db.pantryItem.findMany({ select: { productId: true } })).map(i => i.productId),
      ...(await db.shoppingListItem.findMany({ select: { productId: true } })).map(i => i.productId),
    ].filter((id): id is string => !!id)
    return (await db.product.findFirstOrThrow({ where: { id: { notIn: used } } })).id
  }
  const bought = async (pid: string, name: string, quantity: number) =>
    (await (await listPOST(post('http://t/l', { name, productId: pid, quantity }))).json()) as { id: string }

  it('pantry 3 + buy 2 = 5, un-buy returns to exactly 3', async () => {
    const pid = await freshProduct()
    await pantryPOST(post('http://t/p', { productId: pid, quantity: 3, unit: 'paquete' }))

    const item = await bought(pid, 'Inv A', 2)
    await check(item.id)
    expect(await qtyOf(pid)).toBe(5)
    await check(item.id)
    expect(await qtyOf(pid)).toBe(3)
  })

  it('not in pantry: 0 -> 2 -> row removed; never negative', async () => {
    const pid = await freshProduct()
    const item = await bought(pid, 'Inv B', 2)
    await check(item.id)
    expect(await qtyOf(pid)).toBe(2)
    await check(item.id)
    expect(await qtyOf(pid)).toBeUndefined()
  })

  it('pantry row WITHOUT quantity + buy 2 + un-buy: the row survives with no quantity (C)', async () => {
    const pid = await freshProduct()
    await pantryPOST(post('http://t/p', { productId: pid })) // exists, quantity null
    expect(await qtyOf(pid)).toBeNull()

    const item = await bought(pid, 'Inv Null', 2)
    await check(item.id)
    expect(await qtyOf(pid)).toBe(2)

    await check(item.id)
    expect((await pantry()).some(p => p.productId === pid)).toBe(true) // row is back...
    expect(await qtyOf(pid)).toBeNull() // ...with no quantity, exactly as before
  })

  it('the purchase record is set on buy and cleared on un-buy', async () => {
    const { db } = await import('@/lib/db')
    const pid = await freshProduct()
    await pantryPOST(post('http://t/p', { productId: pid, quantity: 3, unit: 'paquete' }))
    const item = await bought(pid, 'Inv Record', 2)

    await check(item.id)
    expect(await db.shoppingListItem.findUnique({ where: { id: item.id } })).toMatchObject({ pantryDelta: 2, pantryCreated: false })
    await check(item.id)
    expect(await db.shoppingListItem.findUnique({ where: { id: item.id } })).toMatchObject({ pantryDelta: null, pantryCreated: false })

    const fresh = await freshProduct()
    const created = await bought(fresh, 'Inv Record 2', 4)
    await check(created.id)
    expect(await db.shoppingListItem.findUnique({ where: { id: created.id } })).toMatchObject({ pantryDelta: 4, pantryCreated: true })
  })

  it('un-buying restores the exact amount even if the pantry quantity was edited in between, and never goes negative', async () => {
    const pid = await freshProduct()
    await pantryPOST(post('http://t/p', { productId: pid, quantity: 3, unit: 'paquete' }))
    const item = await bought(pid, 'Inv Edit', 2)
    await check(item.id) // 5
    const row = (await pantry()).find(p => p.productId === pid)!
    await pantryPATCH(patch('http://t/p', { quantity: 10 }), params(row.id))
    await check(item.id)
    expect(await qtyOf(pid)).toBe(8)

    // pantry lowered below what the purchase added: clamps instead of going negative
    const item2 = await bought(pid, 'Inv Edit 2', 6)
    await check(item2.id) // 14
    await pantryPATCH(patch('http://t/p', { quantity: 1 }), params(row.id))
    await check(item2.id)
    expect(await qtyOf(pid)).toBeNull() // 1 - 6 <= 0 and the row pre-existed -> back to "no quantity", not negative
  })

  it('untracked legacy un-buy preserves stock instead of guessing its dimension', async () => {
    const { db } = await import('@/lib/db')
    const pid = await freshProduct()
    await pantryPOST(post('http://t/p', { productId: pid, quantity: 5 }))
    const item = await bought(pid, 'Inv Legacy', 2)
    await db.shoppingListItem.update({ where: { id: item.id }, data: { checked: true } }) // legacy: bought, untracked
    await check(item.id) // un-buy
    expect(await qtyOf(pid)).toBe(5)
  })

  it('simultaneous taps never apply the purchase twice', async () => {
    const pid = await freshProduct()
    const item = await bought(pid, 'Inv C', 2)
    await Promise.all([check(item.id), check(item.id)])
    const q = await qtyOf(pid)
    expect([undefined, 2], `pantry quantity was ${q}`).toContain(q) // none or one purchase, never 4 or negative
  })

  it('simultaneous un-buy taps never subtract twice (E)', async () => {
    const pid = await freshProduct()
    await pantryPOST(post('http://t/p', { productId: pid, quantity: 3, unit: 'paquete' }))
    const item = await bought(pid, 'Inv Double', 2)
    await check(item.id) // 5
    await Promise.all([check(item.id), check(item.id)])
    const q = await qtyOf(pid)
    expect([3, 5], `pantry quantity was ${q}`).toContain(q) // one un-buy (3), or un-buy + re-buy (5); never 1 or negative
  })

  it('manual products keep the chosen category and are deduplicated by name+category', async () => {
    const make = (category: string) =>
      productPOST(post('http://t/pr', { name: 'Manual Cat', category, source: 'manual' })).then(r => r.json())
    const a = await make('dairy')
    expect((await make('dairy')).id).toBe(a.id)
    expect((await make('eggs')).id).not.toBe(a.id)

    const item = await bought(a.id, 'Manual Cat', 1)
    await check(item.id)
    expect((await (await pantryGET()).json()).find((p: { productId: string }) => p.productId === a.id).product.category).toBe('dairy')
  })
})

describe('PATCH /api/pantry/:id', () => {
  it('edits quantity and unit, clears with null, validates, and 404s for unknown ids', async () => {
    const item = (await pantry())[0]
    const call = (body: unknown, id = item.id) => pantryPATCH(patch('http://t/p', body), params(id))

    const ok = await call({ quantity: 2.5, unit: 'kg' })
    expect(ok.status).toBe(200)
    expect(await ok.json()).toMatchObject({ quantity: 2.5, unit: 'kg' })

    expect(await (await call({ quantity: null, unit: null })).json()).toMatchObject({ quantity: null, unit: null })
    expect((await call({ quantity: -1 })).status).toBe(400)
    expect((await call({ quantity: 1 }, 'nope')).status).toBe(404)
  })
})


describe('atomic transfer failures on real SQLite', () => {
  it.each([
    ['checked', 'BEFORE UPDATE OF checked ON ShoppingListItem'],
    ['pantry insert', 'BEFORE INSERT ON PantryItem'],
    ['pantry update', 'BEFORE UPDATE ON PantryItem'],
    ['delta', 'BEFORE UPDATE OF pantryDelta ON ShoppingListItem'],
  ])('rolls back the whole buy when %s fails', async (_label, event) => {
    const { db } = await import('@/lib/db')
    const product = await db.product.create({ data: { name: `Failure ${_label}`, category: 'other', source: 'mercadona' } })
    const item = await (await listPOST(post('http://t/l', { name: product.name, productId: product.id, quantity: 2 }))).json()
    if (_label === 'pantry update') await pantryPOST(post('http://t/p', { productId: product.id, quantity: 3, unit: 'paquete' }))
    const beforeItem = await db.shoppingListItem.findUniqueOrThrow({ where: { id: item.id } })
    const beforePantry = await db.pantryItem.findMany({ where: { productId: product.id } })
    await db.$executeRawUnsafe(`CREATE TRIGGER fail_transfer ${event} BEGIN SELECT RAISE(ABORT, 'forced failure'); END`)
    try {
      expect((await check(item.id)).status).toBe(500)
      expect(await db.shoppingListItem.findUniqueOrThrow({ where: { id: item.id } })).toEqual(beforeItem)
      expect(await db.pantryItem.findMany({ where: { productId: product.id } })).toEqual(beforePantry)
    } finally {
      await db.$executeRawUnsafe('DROP TRIGGER fail_transfer')
    }
    const bought = await (await check(item.id)).json()
    expect(bought).toMatchObject({ checked: true, pantryDelta: 2, productId: product.id })
  })

  it.each([
    ['stock update', 'BEFORE UPDATE ON PantryItem', true],
    ['stock deletion', 'BEFORE DELETE ON PantryItem', false],
    ['delta reset', 'BEFORE UPDATE OF pantryDelta ON ShoppingListItem', true],
  ])('rolls back un-buy when %s fails', async (_label, event, preexisting) => {
    const { db } = await import('@/lib/db')
    const product = await db.product.create({ data: { name: `Reverse ${_label}`, category: 'other', source: 'mercadona' } })
    if (preexisting) await pantryPOST(post('http://t/p', { productId: product.id, quantity: 3, unit: 'paquete' }))
    const item = await (await listPOST(post('http://t/l', { name: product.name, productId: product.id, quantity: 2 }))).json()
    await check(item.id)
    const beforeItem = await db.shoppingListItem.findUniqueOrThrow({ where: { id: item.id } })
    const beforePantry = await db.pantryItem.findMany({ where: { productId: product.id } })
    await db.$executeRawUnsafe(`CREATE TRIGGER fail_reverse ${event} BEGIN SELECT RAISE(ABORT, 'forced failure'); END`)
    try {
      expect((await check(item.id)).status).toBe(500)
      expect(await db.shoppingListItem.findUniqueOrThrow({ where: { id: item.id } })).toEqual(beforeItem)
      expect(await db.pantryItem.findMany({ where: { productId: product.id } })).toEqual(beforePantry)
    } finally {
      await db.$executeRawUnsafe('DROP TRIGGER fail_reverse')
    }
    expect((await check(item.id)).status).toBe(200)
  })

  it('rolls back every item in mark-bought when a later transfer fails, including manual product creation', async () => {
    const { db } = await import('@/lib/db')
    const items = await Promise.all(['Batch failure one', 'Batch failure two'].map(name =>
      listPOST(post('http://t/l', { name, quantity: 2 })).then(r => r.json())))
    const ids = items.map(item => item.id)
    const before = await db.shoppingListItem.findMany({ where: { id: { in: ids } }, orderBy: { id: 'asc' } })
    const productsBefore = await db.product.count()
    const pantryBefore = await db.pantryItem.count()
    // The second delta update fails after the first item was fully transferred.
    await db.$executeRawUnsafe(`CREATE TRIGGER fail_batch BEFORE UPDATE OF pantryDelta ON ShoppingListItem
      WHEN (SELECT COUNT(*) FROM ShoppingListItem WHERE name LIKE 'Batch failure %' AND pantryDelta IS NOT NULL) = 1
      BEGIN SELECT RAISE(ABORT, 'second transfer failure'); END`)
    try {
      expect((await markBought(post('http://t/m', { ids }))).status).toBe(500)
      expect(await db.shoppingListItem.findMany({ where: { id: { in: ids } }, orderBy: { id: 'asc' } })).toEqual(before)
      expect(await db.product.count()).toBe(productsBefore)
      expect(await db.pantryItem.count()).toBe(pantryBefore)
    } finally {
      await db.$executeRawUnsafe('DROP TRIGGER fail_batch')
    }
    const results = await Promise.all([markBought(post('http://t/m', { ids })), markBought(post('http://t/m', { ids }))])
    expect(results.map(r => r.status)).toEqual([200, 200])
    expect((await Promise.all(results.map(r => r.json()))).reduce((sum, r) => sum + r.marked, 0)).toBe(2)
    expect(await db.pantryItem.count()).toBe(pantryBefore + 2)
  })
})
