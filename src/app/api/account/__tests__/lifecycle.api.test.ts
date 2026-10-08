import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import Database from 'better-sqlite3'
import { setupFreshTestDb, post } from '@/lib/__tests__/testDb'

const state = vi.hoisted(() => ({ user: null as { id: string; email: string; passwordHash: string | null; googleId: string | null } | null, deleteCookie: vi.fn() }))
vi.mock('@/lib/auth', () => ({ SESSION_COOKIE: 'session', getSessionUser: async () => state.user, verifyPassword: async (password: string) => password === 'correct horse' }))
vi.mock('next/headers', () => ({ cookies: async () => ({ delete: state.deleteCookie }) }))

let cleanup: () => void
let dbPath: string
let ledgerDir: string
let oldLedger: string | undefined
let db: typeof import('@/lib/db').db
let EXPORT: typeof import('../export/route').POST
let DELETE: typeof import('../delete/route').POST

beforeAll(async () => {
  ({ cleanup, dbPath } = setupFreshTestDb())
  oldLedger = process.env.ACCOUNT_DELETION_LEDGER
  ledgerDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ketohoy-kh030-'))
  process.env.ACCOUNT_DELETION_LEDGER = path.join(ledgerDir, 'deletions.jsonl')
  ;({ db } = await import('@/lib/db'))
  ;({ POST: EXPORT } = await import('../export/route'))
  ;({ POST: DELETE } = await import('../delete/route'))
})

afterAll(() => {
  state.user = null
  cleanup()
  fs.rmSync(ledgerDir, { recursive: true, force: true })
  if (oldLedger === undefined) delete process.env.ACCOUNT_DELETION_LEDGER
  else process.env.ACCOUNT_DELETION_LEDGER = oldLedger
})

const account = (name: string, password = true) => db.user.create({ data: {
  email: `${name}@example.invalid`, passwordHash: password ? 'test-hash' : null,
  googleId: password ? null : `google-${name}`,
  emailVerifiedAt: new Date('2026-10-01T00:00:00.000Z'),
  termsAcceptedAt: new Date('2026-10-02T00:00:00.000Z'), termsVersion: '2026-10', adultConfirmedAt: new Date('2026-10-02T00:00:00.000Z'),
} })
const withSession = (user: Awaited<ReturnType<typeof account>>) => { state.user = user }
const remove = (email: string, password = '') => DELETE(post('http://test/api/account/delete', { confirmEmail: email, password }))
const recipe = () => db.recipe.create({ data: { title: 'KH030 shared recipe', description: 'Shared recipe stays', mealTypes: '["lunch"]', prepTimeMinutes: 10, difficulty: 'easy', ketoLevel: 'strict', steps: '["Cook"]' } })

describe('account data lifecycle', () => {
  it('exports portable account data without secrets, shared catalogs, or another account data', async () => {
    const owner = await account('kh030-export-owner')
    const other = await account('kh030-export-other')
    withSession(owner)
    const privateProduct = await db.product.create({ data: { name: 'Private almonds', category: 'nuts', source: 'manual', ownerId: owner.id, tags: '["owned"]' } })
    const otherPrivate = await db.product.create({ data: { name: 'Other private walnuts', category: 'nuts', source: 'manual', ownerId: other.id } })
    const shared = await db.product.create({ data: { name: 'Global olive oil', category: 'oils', source: 'mercadona', mercadonaId: 'kh030-shared' } })
    await db.userPreferences.create({ data: { userId: owner.id, ketoMode: 'strict' } })
    await db.session.create({ data: { id: 'kh030-export-session-secret', userId: owner.id, expiresAt: new Date(Date.now() + 86400000) } })
    await db.authToken.create({ data: { id: 'kh030-export-reset-secret', userId: owner.id, type: 'reset', expiresAt: new Date(Date.now() + 86400000) } })
    await db.pantryItem.create({ data: { userId: owner.id, productId: privateProduct.id, quantity: 250, unit: 'g', createdAt: new Date('2026-10-01T00:00:00.000Z') } })
    await db.pantryItem.create({ data: { userId: owner.id, productId: shared.id, quantity: 1, unit: 'bottle', createdAt: new Date('2026-10-02T00:00:00.000Z') } })
    await db.shoppingListItem.create({ data: { userId: owner.id, name: 'Olive oil', productId: shared.id, checked: true, pantryDelta: 1, pantryDeltaUnit: 'bottle', sourceContributions: '[{"source":"recipe"}]' } })
    await db.shoppingListItem.create({ data: { userId: other.id, name: 'Other private shopping' } })
    const r = await recipe()
    const plan = await db.weeklyPlan.create({ data: { userId: owner.id, weekStart: new Date('2026-10-05T00:00:00.000Z'), meals: { create: { recipeId: r.id, dayOfWeek: 0, mealType: 'lunch' } } } })
    const response = await EXPORT(post('http://test/api/account/export', { favoriteProductIds: [privateProduct.id, otherPrivate.id, shared.id] }))
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('application/json')
    expect(response.headers.get('cache-control')).toContain('no-store')
    expect(response.headers.get('content-disposition')).toContain('ketohoy-data-export.json')
    const text = await response.text()
    const data = JSON.parse(text)
    expect(data).toMatchObject({ exportVersion: 1, account: { email: owner.email, authentication: { password: true, googleConnected: false }, termsVersion: '2026-10' }, preferences: [{ ketoMode: 'strict' }] })
    expect(data.pantry.map((item: { product: { name: string } }) => item.product.name)).toEqual(['Private almonds', 'Global olive oil'])
    expect(data.shoppingList).toHaveLength(1)
    expect(data.weeklyPlans).toHaveLength(1)
    expect(data.weeklyPlans[0]).toMatchObject({ weekStart: plan.weekStart.toISOString(), meals: [{ mealType: 'lunch', recipe: { title: 'KH030 shared recipe' } }] })
    expect(data.manualProducts).toHaveLength(1)
    expect(data.favorites.map((item: { name: string }) => item.name)).toEqual(['Global olive oil', 'Private almonds'])
    expect(text).not.toContain('test-hash')
    expect(text).not.toContain('session')
    expect(text).not.toContain('kh030-export-session-secret')
    expect(text).not.toContain('kh030-export-reset-secret')
    expect(text).not.toContain('google-kh030')
    expect(text).not.toContain('kh030-export-other@example.invalid')
    expect(text).not.toContain('mercadonaId')
    const repeated = await EXPORT(post('http://test/api/account/export', { favoriteProductIds: [privateProduct.id, otherPrivate.id, shared.id] }))
    const repeatedData = await repeated.json()
    expect({ ...repeatedData, generatedAt: data.generatedAt }).toEqual(data)
  })

  it('returns a valid empty export and rejects anonymous access', async () => {
    const empty = await account('kh030-empty', false)
    withSession(empty)
    const response = await EXPORT(post('http://test/api/account/export', {}))
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ exportVersion: 1, account: { authentication: { password: false, googleConnected: true } }, preferences: [], pantry: [], shoppingList: [], weeklyPlans: [], manualProducts: [] })
    state.user = null
    expect((await EXPORT(post('http://test/api/account/export', {}))).status).toBe(401)
    expect((await remove(empty.email)).status).toBe(401)
  })

  it('requires exact account confirmation and password for password accounts', async () => {
    const user = await account('kh030-confirm')
    withSession(user)
    expect((await remove('wrong@example.invalid', 'correct horse')).status).toBe(400)
    expect((await remove(user.email, 'wrong')).status).toBe(400)
    expect(await db.user.findUnique({ where: { id: user.id } })).not.toBeNull()
    expect(fs.existsSync(process.env.ACCOUNT_DELETION_LEDGER!)).toBe(false)
  })

  it('allows a Google-only account to delete without inventing a password', async () => {
    const user = await account('kh030-google-delete', false)
    withSession(user)
    expect((await remove(user.email)).status).toBe(200)
    expect(await db.user.findUnique({ where: { id: user.id } })).toBeNull()
  })

  it('deletes owned data atomically, preserves other accounts and shared catalog, and clears the session', async () => {
    const owner = await account('kh030-delete-owner')
    const other = await account('kh030-delete-other')
    withSession(owner)
    const privateProduct = await db.product.create({ data: { name: 'Private product to delete', category: 'nuts', source: 'manual', ownerId: owner.id } })
    const otherProduct = await db.product.create({ data: { name: 'Other private product', category: 'nuts', source: 'manual', ownerId: other.id } })
    const shared = await db.product.create({ data: { name: 'Shared product to keep', category: 'oils', source: 'mercadona', mercadonaId: 'kh030-delete-shared' } })
    const r = await recipe()
    const ingredient = await db.recipeIngredient.create({ data: { recipeId: r.id, productId: privateProduct.id, name: 'Private product to delete', quantity: '1 pack' } })
    await db.userPreferences.create({ data: { userId: owner.id } })
    await db.pantryItem.create({ data: { userId: owner.id, productId: privateProduct.id } })
    await db.shoppingListItem.create({ data: { userId: owner.id, name: privateProduct.name, productId: privateProduct.id, checked: true } })
    await db.weeklyPlan.create({ data: { userId: owner.id, weekStart: new Date('2026-10-05T00:00:00.000Z'), meals: { create: { recipeId: r.id, dayOfWeek: 0, mealType: 'lunch' } } } })
    await db.pantryItem.create({ data: { userId: other.id, productId: otherProduct.id } })
    await db.session.create({ data: { id: 'kh030-session-secret', userId: owner.id, expiresAt: new Date(Date.now() + 86400000) } })
    await db.authToken.create({ data: { id: 'kh030-reset-secret', userId: owner.id, type: 'reset', expiresAt: new Date(Date.now() + 86400000) } })

    const response = await remove(owner.email, 'correct horse')
    expect(response.status).toBe(200)
    expect(await db.user.findUnique({ where: { id: owner.id } })).toBeNull()
    expect(await db.userPreferences.count({ where: { userId: owner.id } })).toBe(0)
    expect(await db.pantryItem.count({ where: { userId: owner.id } })).toBe(0)
    expect(await db.shoppingListItem.count({ where: { userId: owner.id } })).toBe(0)
    expect(await db.weeklyPlan.count({ where: { userId: owner.id } })).toBe(0)
    expect(await db.weeklyMeal.count({ where: { plan: { userId: owner.id } } })).toBe(0)
    expect(await db.session.count({ where: { userId: owner.id } })).toBe(0)
    expect(await db.authToken.count({ where: { userId: owner.id } })).toBe(0)
    expect(await db.product.findUnique({ where: { id: privateProduct.id } })).toBeNull()
    expect(await db.recipeIngredient.findUnique({ where: { id: ingredient.id } })).toMatchObject({ productId: null, name: privateProduct.name })
    expect(await db.recipe.findUnique({ where: { id: r.id } })).not.toBeNull()
    expect(await db.product.findUnique({ where: { id: otherProduct.id } })).not.toBeNull()
    expect(await db.product.findUnique({ where: { id: shared.id } })).not.toBeNull()
    expect(await db.pantryItem.count({ where: { userId: other.id } })).toBe(1)
    expect(state.deleteCookie).toHaveBeenCalledWith('session')
    expect(fs.readFileSync(process.env.ACCOUNT_DELETION_LEDGER!, 'utf8')).toContain(owner.id)
    state.user = null
    expect((await remove(owner.email, 'correct horse')).status).toBe(401)
  })

  it('rolls back a failed transaction and permits a clean retry', async () => {
    const owner = await account('kh030-rollback')
    withSession(owner)
    const product = await db.product.create({ data: { name: 'Rollback private product', category: 'nuts', source: 'manual', ownerId: owner.id } })
    const r = await recipe()
    const ingredient = await db.recipeIngredient.create({ data: { recipeId: r.id, productId: product.id, name: product.name } })
    const raw = new Database(dbPath)
    raw.exec(`CREATE TRIGGER kh030_stop_delete BEFORE DELETE ON User WHEN OLD.id = '${owner.id}' BEGIN SELECT RAISE(ABORT, 'forced'); END`)
    raw.close()
    expect((await remove(owner.email, 'correct horse')).status).toBe(500)
    expect(await db.user.findUnique({ where: { id: owner.id } })).not.toBeNull()
    expect(await db.recipeIngredient.findUnique({ where: { id: ingredient.id } })).toMatchObject({ productId: product.id })
    const drop = new Database(dbPath)
    drop.exec('DROP TRIGGER kh030_stop_delete')
    drop.close()
    expect((await remove(owner.email, 'correct horse')).status).toBe(200)
    expect(await db.user.findUnique({ where: { id: owner.id } })).toBeNull()
  })
})
