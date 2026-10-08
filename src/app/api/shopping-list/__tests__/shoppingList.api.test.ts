import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { setupTestDb, get, post, patch, del } from '@/lib/__tests__/testDb'

vi.mock('@/lib/auth', async () => (await import('@/lib/__tests__/authMock')).authMock)

let GET: typeof import('../route').GET
let POST: typeof import('../route').POST
let DELETE: typeof import('../route').DELETE
let checkPATCH: typeof import('../[id]/check/route').PATCH
let quantityPATCH: typeof import('../[id]/quantity/route').PATCH
let cleanup: () => void

beforeAll(async () => {
  ;({ cleanup } = setupTestDb())
  ;({ GET, POST, DELETE } = await import('../route'))
  ;({ PATCH: checkPATCH } = await import('../[id]/check/route'))
  ;({ PATCH: quantityPATCH } = await import('../[id]/quantity/route'))
})

afterAll(() => cleanup())

describe('/api/shopping-list', () => {
  it('POST rejects a body without name', async () => {
    const res = await POST(post('http://test/api/shopping-list', {}))
    expect(res.status).toBe(400)
  })

  it('POST validates JSON, strings, numeric input, and product ownership before writing', async () => {
    expect((await POST(new Request('http://test/api/shopping-list', { method: 'POST', body: '{bad' }))).status).toBe(400)
    expect((await POST(post('http://test/api/shopping-list', { name: '   ' }))).status).toBe(400)
    expect((await POST(post('http://test/api/shopping-list', { name: 'x'.repeat(121) }))).status).toBe(400)
    expect((await POST(post('http://test/api/shopping-list', { name: 'Negative', quantity: -1 }))).status).toBe(400)
    expect((await POST(post('http://test/api/shopping-list', { name: 'Infinity', quantity: 'Infinity' }))).status).toBe(400)
    expect((await POST(post('http://test/api/shopping-list', { name: 'Huge', quantity: 10001 }))).status).toBe(400)
    expect((await POST(post('http://test/api/shopping-list', { name: 'Missing product', productId: 'missing-product' }))).status).toBe(404)

    const { db } = await import('@/lib/db')
    const other = await db.user.create({ data: { email: 'other-shopping-owner@example.com', passwordHash: 'x' } })
    const product = await db.product.create({ data: { name: 'Private item', category: 'other', ownerId: other.id } })
    expect((await POST(post('http://test/api/shopping-list', { name: product.name, productId: product.id }))).status).toBe(404)

    const zero = await POST(post('http://test/api/shopping-list', { name: 'Zero required', requiredQuantity: 0, requiredUnit: 'g' }))
    expect(zero.status).toBe(400)
  })

  it('POST creates an item, merging quantity on a repeat add', async () => {
    const created = await POST(post('http://test/api/shopping-list', { name: 'Test Item', quantity: 2 }))
    expect(created.status).toBe(201)
    const item = await created.json()
    expect(item.name).toBe('Test Item')

    const merged = await POST(post('http://test/api/shopping-list', { name: 'Test Item', quantity: 3 }))
    expect(merged.status).toBe(200)

    const listed = await GET()
    const items = await listed.json()
    expect(items.some((i: { id: string }) => i.id === item.id)).toBe(true)
  })

  it('check PATCH toggles checked, quantity PATCH increases quantity and is refused once bought', async () => {
    const created = await POST(post('http://test/api/shopping-list', { name: 'Toggle Item', quantity: 1 }))
    const item = await created.json()
    const bump = () =>
      quantityPATCH(patch('http://test/api/shopping-list/' + item.id, { delta: 2 }), { params: Promise.resolve({ id: item.id }) })

    const bumped = await bump()
    expect(bumped.status).toBe(200)
    expect((await bumped.json()).quantity).toBe('3')

    const checked = await checkPATCH(get('http://test/api/shopping-list/' + item.id), {
      params: Promise.resolve({ id: item.id }),
    })
    expect(checked.status).toBe(200)
    expect((await checked.json()).checked).toBe(true)

    // bought: the pantry got exactly 3, so the list quantity is frozen until it is un-checked
    expect((await bump()).status).toBe(409)
  })

  it('quantity PATCH decrements with a negative delta and deletes at zero', async () => {
    const item = await (await POST(post('http://test/api/shopping-list', { name: 'Decrement Item', quantity: 3 }))).json()
    const call = (delta: number) =>
      quantityPATCH(patch('http://test/api/shopping-list/' + item.id, { delta }), { params: Promise.resolve({ id: item.id }) })

    expect((await (await call(-1)).json()).quantity).toBe('2')
    expect((await (await call(-2)).json()).deleted).toBe(true)
  })

  it('quantity PATCH rejects a non-numeric delta', async () => {
    const created = await POST(post('http://test/api/shopping-list', { name: 'Bad Delta Item', quantity: 1 }))
    const item = await created.json()

    const res = await quantityPATCH(patch('http://test/api/shopping-list/' + item.id, { delta: { nope: true } }), {
      params: Promise.resolve({ id: item.id }),
    })
    expect(res.status).toBe(400)
  })

  it('DELETE rejects an empty ids array and removes items for valid ids', async () => {
    const empty = await DELETE(del('http://test/api/shopping-list', { ids: [] }))
    expect(empty.status).toBe(400)

    const created = await POST(post('http://test/api/shopping-list', { name: 'Delete Me' }))
    const item = await created.json()
    const removed = await DELETE(del('http://test/api/shopping-list', { ids: [item.id] }))
    expect(removed.status).toBe(200)
    const removedBody = await removed.json()
    expect(removedBody.deleted).toBe(1)
  })
})
