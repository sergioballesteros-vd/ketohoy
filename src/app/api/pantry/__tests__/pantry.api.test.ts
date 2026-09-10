import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { setupTestDb, get, post } from '@/lib/__tests__/testDb'

let GET: typeof import('../route').GET
let POST: typeof import('../route').POST
let DELETE: typeof import('../[id]/route').DELETE
let cleanup: () => void
let productId: string

beforeAll(async () => {
  ;({ cleanup } = setupTestDb())
  ;({ GET, POST } = await import('../route'))
  ;({ DELETE } = await import('../[id]/route'))

  const { db } = await import('@/lib/db')
  // The seed script pre-populates a pantry baseline for some products, so
  // picking an arbitrary product could already be in the pantry — pick one
  // that genuinely isn't, so the "creates a new item" assertion is valid.
  const existingPantryProductIds = (await db.pantryItem.findMany({ select: { productId: true } })).map(
    i => i.productId
  )
  const product = await db.product.findFirst({ where: { id: { notIn: existingPantryProductIds } } })
  if (!product) throw new Error('test DB has no seeded product outside the pantry baseline — cannot run pantry API tests')
  productId = product.id
})

afterAll(() => cleanup())

describe('/api/pantry', () => {
  it('POST rejects a body without productId', async () => {
    const res = await POST(post('http://test/api/pantry', {}))
    expect(res.status).toBe(400)
  })

  it('POST rejects malformed JSON', async () => {
    const res = await POST(new Request('http://test/api/pantry', { method: 'POST', body: '{bad' }))
    expect(res.status).toBe(400)
  })

  it('POST adds a product, GET lists it, POST again is idempotent, DELETE removes it', async () => {
    const created = await POST(post('http://test/api/pantry', { productId }))
    expect(created.status).toBe(201)
    const item = await created.json()
    expect(item.productId).toBe(productId)

    const listed = await GET()
    expect(listed.status).toBe(200)
    const items = await listed.json()
    expect(items.some((i: { id: string }) => i.id === item.id)).toBe(true)

    const again = await POST(post('http://test/api/pantry', { productId }))
    expect(again.status).toBe(200)
    const againItem = await again.json()
    expect(againItem.id).toBe(item.id)

    const deleted = await DELETE(get('http://test/api/pantry/' + item.id), {
      params: Promise.resolve({ id: item.id }),
    })
    expect(deleted.status).toBe(200)
  })

  it('DELETE on a nonexistent id returns 404', async () => {
    const res = await DELETE(get('http://test/api/pantry/does-not-exist'), {
      params: Promise.resolve({ id: 'does-not-exist' }),
    })
    expect(res.status).toBe(404)
  })
})
