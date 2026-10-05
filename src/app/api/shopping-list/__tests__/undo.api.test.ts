import { afterAll, beforeAll, expect, it, vi } from 'vitest'
import { setupTestDb, post } from '@/lib/__tests__/testDb'
vi.mock('@/lib/auth', async () => (await import('@/lib/__tests__/authMock')).authMock)
let cleanup: () => void
let POST: typeof import('../route').POST
let db: typeof import('@/lib/db').db
beforeAll(async () => {
  ;({ cleanup } = setupTestDb())
  ;({ db } = await import('@/lib/db'))
  ;({ POST } = await import('../route'))
})
afterAll(() => cleanup())

it('KH-020 retry after a lost restore response cannot increment packages; ordinary additions still do', async () => {
  const payload = { name: 'Lost undo response', purchaseQuantity: 2, restore: true }
  const first = await (await POST(post('http://t/list', payload))).json()
  const retry = await (await POST(post('http://t/list', payload))).json()
  expect(retry).toMatchObject({ id: first.id, purchaseQuantity: 2, outcome: 'existing' })
  expect(await db.shoppingListItem.findUnique({ where: { id: first.id } })).toMatchObject({ purchaseQuantity: 2 })
  const normal = await (await POST(post('http://t/list', { name: payload.name, purchaseQuantity: 3 }))).json()
  expect(normal).toMatchObject({ id: first.id, purchaseQuantity: 5 })
})
it('KH-020 undo preserves newer pending quantities and purchased history', async () => {
  const body = { name: 'Concurrent undo', purchaseQuantity: 7 }
  const current = await (await POST(post('http://t/list', body))).json()
  const history = await db.shoppingListItem.create({ data: { userId: current.userId, name: body.name, checked: true, purchaseQuantity: 3, quantity: '3', pantryDelta: 3 } })
  const undo = await (await POST(post('http://t/list', { ...body, purchaseQuantity: 5, restore: true }))).json()
  expect(undo).toMatchObject({ id: current.id, purchaseQuantity: 7, outcome: 'existing' })
  expect(await db.shoppingListItem.findUnique({ where: { id: history.id } })).toEqual(history)
})
it('KH-020 simultaneous restores of legacy unknown stock create a single effective row', async () => {
  const body = { name: 'Legacy undo concurrent', purchaseQuantity: null, legacyQuantity: '5 kg', restore: true }
  const responses = await Promise.all([POST(post('http://t/list', body)), POST(post('http://t/list', body))])
  const rows = await Promise.all(responses.map(response => response.json()))
  expect(rows.map(row => row.outcome).sort()).toEqual(['created', 'existing'])
  expect(rows[0].id).toBe(rows[1].id)
  expect(rows[0]).toMatchObject({ purchaseQuantity: null, quantity: '5 kg' })
})
it('KH-020 restore cannot expose or recreate another account’s private product', async () => {
  const other = await db.user.create({ data: { email: 'kh020-private@example.test' } })
  const product = await db.product.create({ data: { name: 'Private', category: 'other', source: 'manual', ownerId: other.id } })
  const response = await POST(post('http://t/list', { name: 'Attempt', productId: product.id, purchaseQuantity: 5, restore: true }))
  expect(response.status).toBe(404)
  expect(await db.shoppingListItem.count({ where: { productId: product.id } })).toBe(0)
  expect(await response.text()).not.toContain(other.email)
})
