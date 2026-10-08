import { test, expect } from '@playwright/test'
import { createHash, randomUUID } from 'node:crypto'
import path from 'node:path'
import Database from 'better-sqlite3'
import { registrationData } from './registration'
import { resolveSqlitePath } from '../src/lib/sqliteUrl'

test.use({ storageState: { cookies: [], origins: [] } })

// These probes intentionally write only to the explicitly selected disposable DB.
function testDatabase() {
  const filename = resolveSqlitePath(process.env.DATABASE_URL, true)
  if (!process.env.CI && filename === path.resolve('dev.db')) throw new Error('Security probes require a disposable DATABASE_URL')
  return new Database(filename)
}

test('product writes require a real unexpired session through the proxy', async ({ request }, info) => {
  const sql = testDatabase()
  const name = `Session probe ${randomUUID()}`
  const data = { name, category: 'other', source: 'manual' }
  const count = () => (sql.prepare('SELECT COUNT(*) AS n FROM Product WHERE name = ?').get(name) as { n: number }).n
  try {
    expect((await request.post('/api/products', { data })).status()).toBe(401)
    expect(count()).toBe(0)
    expect((await request.post('/api/products', { data, headers: { Cookie: 'session=invented-session' } })).status()).toBe(401)
    expect(count()).toBe(0)
    for (const route of ['/api/products', '/api/products/search']) {
      expect((await request.get(route, { headers: { Cookie: 'session=invented-session' } })).status()).toBe(401)
    }
    expect((await request.post('/api/products', { data, headers: { Cookie: 'session=invalid' } })).status()).toBe(401)
    expect(count()).toBe(0)

    const authHeaders = { 'X-Forwarded-For': `product-security-${info.testId}` }
    expect((await request.post('/api/auth/register', { data: registrationData('session'), headers: authHeaders })).status()).toBe(201)
    const token = (await request.storageState()).cookies.find(cookie => cookie.name === 'session')!.value
    const id = createHash('sha256').update(token).digest('hex')
    sql.prepare('UPDATE Session SET expiresAt = ? WHERE id = ?').run(Date.now() - 60_000, id)
    expect((await request.post('/api/products', { data })).status()).toBe(401)
    expect(count()).toBe(0)

    expect((await request.post('/api/auth/register', { data: registrationData('valid'), headers: authHeaders })).status()).toBe(201)
    expect((await request.post('/api/products', { data })).status()).toBe(201)
    expect(count()).toBe(1)
  } finally {
    sql.close()
  }
})

test('manual catalog and free-text purchases are private; shared catalog stays usable', async ({ playwright }, info) => {
  const a = await playwright.request.newContext({ baseURL: 'http://127.0.0.1:3100' })
  const b = await playwright.request.newContext({ baseURL: 'http://127.0.0.1:3100' })
  const sql = testDatabase()
  const name = `Private ${randomUUID()}`
  try {
    for (const [client, identity] of [[a, 'a'], [b, 'b']] as const) {
      expect((await client.post('/api/auth/register', {
        data: registrationData('owner'),
        headers: { 'X-Forwarded-For': `product-security-${info.testId}-${identity}` },
      })).status()).toBe(201)
    }
    const made = await a.post('/api/products', { data: { name, category: 'other', source: 'manual', ownerId: 'spoofed' } })
    expect(made.status()).toBe(201)
    const product = await made.json()
    expect(product.ownerId).not.toBe('spoofed')
    const userA = await a.get('/api/products/search', { params: { q: name } })
    expect(await userA.json()).toEqual([product])
    expect(await (await b.get('/api/products/search', { params: { q: name } })).json()).toEqual([])
    expect((await (await b.get('/api/products')).json()).some((p: { id: string }) => p.id === product.id)).toBe(false)
    expect((await b.post('/api/pantry', { data: { productId: product.id } })).status()).toBe(404)
    expect((await b.post('/api/shopping-list', { data: { name, productId: product.id } })).status()).toBe(404)
    expect((await a.post('/api/products', { data: { name, category: 'other', source: 'mercadona' } })).status()).toBe(400)
    expect((await a.post('/api/products', { data: { name, category: 'other', mercadonaId: 'spoofed-shared-id' } })).status()).toBe(400)
    const madeB = await (await b.post('/api/products', { data: { name, category: 'other' } })).json()
    expect(madeB.id).not.toBe(product.id)
    expect(madeB.ownerId).not.toBe(product.ownerId)

    const shared = sql.prepare("SELECT id FROM Product WHERE source = 'mercadona' AND ownerId IS NULL LIMIT 1").get() as { id: string }
    for (const client of [a, b]) {
      expect((await client.post('/api/pantry', { data: { productId: shared.id } })).status()).toBe(201)
      const item = await (await client.post('/api/shopping-list', { data: { name, quantity: 2 } })).json()
      expect((await client.patch(`/api/shopping-list/${item.id}/check`)).status()).toBe(200)
      const stock = await (await client.get('/api/pantry')).json()
      const manual = stock.find((p: { product: { name: string } }) => p.product.name === name)
      const ownProduct = client === a ? product : madeB
      expect(manual).toMatchObject({ productId: ownProduct.id, quantity: 2 })
    }

    // Unowned legacy rows are quarantined, not assigned to either account.
    const legacyId = randomUUID()
    sql.prepare('INSERT INTO Product (id, name, category, source, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)')
      .run(legacyId, `Legacy ${name}`, 'other', 'manual', Date.now(), Date.now())
    for (const client of [a, b]) {
      expect((await (await client.get('/api/products/search', { params: { q: `Legacy ${name}` } })).json())).toEqual([])
      expect((await client.post('/api/pantry', { data: { productId: legacyId } })).status()).toBe(404)
    }
    expect((await b.get('/api/pantry')).status()).toBe(200)
  } finally {
    sql.close()
    await a.dispose()
    await b.dispose()
  }
})
