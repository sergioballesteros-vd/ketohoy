import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { setupFreshTestDb, post } from '@/lib/__tests__/testDb'

// In-memory cookie jar standing in for next/headers' request-scoped cookies().
const jar = new Map<string, string>()
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => (jar.has(name) ? { value: jar.get(name)! } : undefined),
    set: (name: string, value: string) => void jar.set(name, value),
    delete: (name: string) => void jar.delete(name),
  }),
}))
vi.mock('@/lib/mailer', () => ({ sendMail: async () => {} }))

let cleanup: () => void
let register: typeof import('../register/route').POST
let login: typeof import('../login/route').POST
let logout: typeof import('../logout/route').POST
let pantryGET: typeof import('../../pantry/route').GET
let pantryPOST: typeof import('../../pantry/route').POST
let pantryDELETE: typeof import('../../pantry/[id]/route').DELETE
let acceptTerms: typeof import('../accept-terms/route').POST
let db: typeof import('@/lib/db').db
let productId: string

beforeAll(async () => {
  ;({ cleanup } = setupFreshTestDb())
  ;({ POST: register } = await import('../register/route'))
  ;({ POST: login } = await import('../login/route'))
  ;({ POST: logout } = await import('../logout/route'))
  ;({ GET: pantryGET, POST: pantryPOST } = await import('../../pantry/route'))
  ;({ DELETE: pantryDELETE } = await import('../../pantry/[id]/route'))
  ;({ POST: acceptTerms } = await import('../accept-terms/route'))
  ;({ db } = await import('@/lib/db'))
  productId = (await db.product.create({ data: { name: 'Auth integration fixture', category: 'other', source: 'mercadona', mercadonaId: 'auth-integration-fixture' } })).id
})

afterAll(() => cleanup())

const creds = (email: string, password = 'correct-horse') => ({ email, password })
const registration = (email: string, password = 'correct-horse') => ({ ...creds(email, password), acceptTerms: true, confirmAdult: true })

describe('auth + per-user data isolation', () => {
  it('rejects short passwords and invalid emails', async () => {
    expect((await register(post('http://t/r', creds('a@example.com', 'short')))).status).toBe(400)
    expect((await register(post('http://t/r', creds('not-an-email')))).status).toBe(400)
    expect((await register(post('http://t/r', creds('missing-consent@example.com')))).status).toBe(400)
  })

  it('registers, blocks duplicates, and logs in / out', async () => {
    const res = await register(post('http://t/r', registration('Alice@Example.com')))
    expect(res.status).toBe(201)
    expect(jar.get('session')).toBeTruthy()
    expect((await register(post('http://t/r', registration('alice@example.com')))).status).toBe(409)

    await logout()
    expect(jar.has('session')).toBe(false)
    expect((await pantryGET()).status).toBe(401)

    expect((await login(post('http://t/l', creds('alice@example.com', 'wrong-password')))).status).toBe(401)
    expect((await login(post('http://t/l', creds('nobody@example.com')))).status).toBe(401)
    expect((await login(post('http://t/l', creds('alice@example.com')))).status).toBe(200)
    expect((await pantryGET()).status).toBe(200)

    await db.user.update({ where: { email: 'alice@example.com' }, data: { termsAcceptedAt: null, termsVersion: null, adultConfirmedAt: null } })
    const oldLogin = await login(post('http://t/l', creds('alice@example.com')))
    expect((await oldLogin.json()).termsRequired).toBe(true)
    expect((await pantryGET()).status).toBe(403)
    expect((await (await acceptTerms(post('http://t/accept', { acceptTerms: true, confirmAdult: true }))).json()).accepted).toBe(true)
    expect((await pantryGET()).status).toBe(200)
  })

  it("one user cannot see or delete another user's pantry", async () => {
    // Alice (logged in from the previous test) adds an item.
    const created = await (await pantryPOST(post('http://t/p', { productId }))).json()
    expect(created.id).toBeTruthy()

    await register(post('http://t/r', registration('bob@example.com')))
    expect(await (await pantryGET()).json()).toEqual([])
    const del = await pantryDELETE(new Request('http://t/p/x', { method: 'DELETE' }), {
      params: Promise.resolve({ id: created.id }),
    })
    expect(del.status).toBe(404)

    await login(post('http://t/l', creds('alice@example.com')))
    expect((await (await pantryGET()).json()).map((i: { id: string }) => i.id)).toContain(created.id)
  })

  it('purges expired sessions and auth tokens atomically when a new session is created', async () => {
    const res = await register(post('http://t/r', registration('expiry@example.com')))
    expect(res.status).toBe(201)
    const user = await db.user.findUniqueOrThrow({ where: { email: 'expiry@example.com' } })
    await db.session.create({ data: { id: 'expired-session', userId: user.id, expiresAt: new Date(Date.now() - 1000) } })
    await db.authToken.create({ data: { id: 'expired-token', userId: user.id, type: 'reset', expiresAt: new Date(Date.now() - 1000) } })
    await db.authToken.create({ data: { id: 'live-token', userId: user.id, type: 'verify', expiresAt: new Date(Date.now() + 86400000) } })
    expect((await login(post('http://t/l', creds('expiry@example.com')))).status).toBe(200)
    expect(await db.session.findUnique({ where: { id: 'expired-session' } })).toBeNull()
    expect(await db.authToken.findUnique({ where: { id: 'expired-token' } })).toBeNull()
    expect(await db.authToken.findUnique({ where: { id: 'live-token' } })).not.toBeNull()
  })
})
