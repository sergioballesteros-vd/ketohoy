import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { setupTestDb, post } from '@/lib/__tests__/testDb'

vi.mock('next/headers', () => ({
  cookies: async () => ({ get: () => undefined, set: () => {}, delete: () => {} }),
}))

let cleanup: () => void
let resolveGoogleUser: typeof import('@/lib/googleAuth').resolveGoogleUser
let login: typeof import('../login/route').POST
let db: typeof import('@/lib/db').db

beforeAll(async () => {
  ;({ cleanup } = setupTestDb())
  ;({ resolveGoogleUser } = await import('@/lib/googleAuth'))
  ;({ POST: login } = await import('../login/route'))
  ;({ db } = await import('@/lib/db'))
})
afterAll(() => cleanup())

const profile = (email: string, sub = `sub-${email}`, emailVerified = true) => ({ sub, email, emailVerified })

describe('google login', () => {
  it('creates a verified, passwordless user and finds it again by sub', async () => {
    const user = await resolveGoogleUser(profile('new@example.com'))
    expect(user.passwordHash).toBeNull()
    expect(user.emailVerifiedAt).not.toBeNull()
    expect((await resolveGoogleUser(profile('new@example.com'))).id).toBe(user.id)
  })

  it('rejects an unverified Google email', async () => {
    await expect(resolveGoogleUser(profile('x@example.com', 's', false))).rejects.toThrow()
  })

  it('links a verified password account and keeps its password', async () => {
    const existing = await db.user.create({ data: { email: 'a@example.com', passwordHash: 'h', emailVerifiedAt: new Date() } })
    const user = await resolveGoogleUser(profile('a@example.com'))
    expect(user.id).toBe(existing.id)
    expect(user.googleId).toBe('sub-a@example.com')
    expect(user.passwordHash).toBe('h')
  })

  it('pre-hijack: linking an UNVERIFIED password account wipes its password and sessions', async () => {
    const squatter = await db.user.create({ data: { email: 'b@example.com', passwordHash: 'attacker' } })
    await db.session.create({ data: { id: 's1', userId: squatter.id, expiresAt: new Date(Date.now() + 1e6) } })
    const user = await resolveGoogleUser(profile('b@example.com'))
    expect(user.id).toBe(squatter.id)
    expect(user.passwordHash).toBeNull()
    expect(await db.session.count({ where: { userId: squatter.id } })).toBe(0)
  })

  it('password login of a Google-only account gets the generic 401', async () => {
    const res = await login(post('http://localhost/api/auth/login', { email: 'new@example.com', password: 'whatever12' }))
    expect(res.status).toBe(401)
  })
})
