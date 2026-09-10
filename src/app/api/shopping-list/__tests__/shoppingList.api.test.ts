import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { setupTestDb, get, post, patch, del } from '@/lib/__tests__/testDb'

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

  it('check PATCH toggles checked and quantity PATCH increases quantity', async () => {
    const created = await POST(post('http://test/api/shopping-list', { name: 'Toggle Item', quantity: 1 }))
    const item = await created.json()

    const checked = await checkPATCH(get('http://test/api/shopping-list/' + item.id), {
      params: Promise.resolve({ id: item.id }),
    })
    expect(checked.status).toBe(200)
    const checkedItem = await checked.json()
    expect(checkedItem.checked).toBe(true)

    const bumped = await quantityPATCH(patch('http://test/api/shopping-list/' + item.id, { delta: 2 }), {
      params: Promise.resolve({ id: item.id }),
    })
    expect(bumped.status).toBe(200)
    const bumpedBody = await bumped.json()
    expect(bumpedBody.quantity).toBe('3')
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
