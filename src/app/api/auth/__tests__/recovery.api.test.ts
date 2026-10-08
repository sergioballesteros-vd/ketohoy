import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { setupTestDb, post } from '@/lib/__tests__/testDb'

const provider = vi.hoisted(() => ({ error: null as Error | null }))
const jar = new Map<string, string>()
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => (jar.has(name) ? { value: jar.get(name)! } : undefined),
    set: (name: string, value: string) => void jar.set(name, value),
    delete: (name: string) => void jar.delete(name),
  }),
}))

// Capture "emails" instead of logging them.
const mails: { to: string; text: string }[] = []
vi.mock('@/lib/mailer', () => ({
  sendMail: async (m: { to: string; text: string }) => {
    if (provider.error) throw provider.error
    mails.push(m)
  },
}))

const tokenFrom = (text: string) => /token=([0-9a-f]+)/.exec(text)![1]
const lastMail = () => mails[mails.length - 1]

let cleanup: () => void
let register: typeof import('../register/route').POST
let login: typeof import('../login/route').POST
let forgot: typeof import('../forgot/route').POST
let reset: typeof import('../reset/route').POST
let verify: typeof import('../verify/route').POST
let resend: typeof import('../resend-verification/route').POST
let me: typeof import('../me/route').GET
let db: typeof import('@/lib/db').db

beforeAll(async () => {
  ;({ cleanup } = setupTestDb())
  ;({ POST: register } = await import('../register/route'))
  ;({ POST: login } = await import('../login/route'))
  ;({ POST: forgot } = await import('../forgot/route'))
  ;({ POST: reset } = await import('../reset/route'))
  ;({ POST: verify } = await import('../verify/route'))
  ;({ POST: resend } = await import('../resend-verification/route'))
  ;({ GET: me } = await import('../me/route'))
  ;({ db } = await import('@/lib/db'))
})
afterAll(() => cleanup())
beforeEach(() => {
  mails.length = 0
  provider.error = null
})

const req = (path: string, body: unknown, ip: string) =>
  new Request(`http://t/api/auth/${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
    body: JSON.stringify(body),
  })

describe('email verification', () => {
  it('sends a link on register, stores only its hash, and verifies once', async () => {
    await register(post('http://t/r1', { email: 'v@example.com', password: 'correct-horse', acceptTerms: true, confirmAdult: true }))
    expect(mails).toHaveLength(1)
    const token = tokenFrom(lastMail().text)
    expect(await db.authToken.findUnique({ where: { id: token } })).toBeNull() // raw token is never stored

    expect((await (await me()).json()).emailVerified).toBe(false)
    expect((await verify(req('verify', { token: 'nope' }, '1.1.1.1'))).status).toBe(400)
    expect((await verify(req('verify', { token }, '1.1.1.1'))).status).toBe(200)
    expect((await (await me()).json()).emailVerified).toBe(true)
    expect((await verify(req('verify', { token }, '1.1.1.1'))).status).toBe(400) // single use
  })

  it('resend issues a new link and revokes the old one; verified users get nothing', async () => {
    await register(post('http://t/r2', { email: 'v2@example.com', password: 'correct-horse', acceptTerms: true, confirmAdult: true }))
    const first = tokenFrom(lastMail().text)
    await resend(req('resend-verification', {}, '2.2.2.2'))
    expect(mails).toHaveLength(2)
    expect((await verify(req('verify', { token: first }, '2.2.2.2'))).status).toBe(400)
    expect((await verify(req('verify', { token: tokenFrom(lastMail().text) }, '2.2.2.2'))).status).toBe(200)
    await resend(req('resend-verification', {}, '2.2.2.3'))
    expect(mails).toHaveLength(2)
  })
})

describe('password reset', () => {
  it('keeps valid-email responses identical for existing, missing, and provider-failure cases', async () => {
    const user = await db.user.create({ data: { email: 'reset-contract@example.com', passwordHash: 'fixture' } })
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    const existingSuccess = await forgot(req('forgot', { email: user.email }, '10.10.10.1'))

    provider.error = Object.assign(new Error('token=private API key=secret'), { name: 'TimeoutError' })
    const existingFailure = await forgot(req('forgot', { email: user.email }, '10.10.10.2'))
    const missing = await forgot(req('forgot', { email: 'missing-reset@example.com' }, '10.10.10.3'))

    const responses = await Promise.all([existingSuccess, existingFailure, missing].map(async response => ({
      status: response.status,
      body: await response.json(),
    })))
    expect(responses).toEqual([
      { status: 200, body: { success: true } },
      { status: 200, body: { success: true } },
      { status: 200, body: { success: true } },
    ])
    expect(log).toHaveBeenCalledWith('password reset email failed', 'TimeoutError')
    expect(JSON.stringify(log.mock.calls)).not.toMatch(/private|secret|reset-contract@example\.com/)
    expect(mails).toHaveLength(1)
    provider.error = null
    log.mockRestore()
  })

  it('continues to reject malformed reset requests', async () => {
    const invalidEmail = await forgot(req('forgot', { email: 'not-an-email' }, '10.10.11.1'))
    const invalidBody = await forgot(new Request('http://t/api/auth/forgot', {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': '10.10.11.2' }, body: '{',
    }))
    expect(invalidEmail.status).toBe(400)
    expect(invalidBody.status).toBe(400)
  })

  it('answers the same for unknown emails and sends nothing', async () => {
    const res = await forgot(req('forgot', { email: 'ghost@example.com' }, '3.3.3.3'))
    expect(res.status).toBe(200)
    expect(mails).toHaveLength(0)
  })

  it('resets once, kills old sessions, and the new password works', async () => {
    await register(post('http://t/r3', { email: 'r@example.com', password: 'old-password', acceptTerms: true, confirmAdult: true }))
    expect(jar.get('session')).toBeTruthy()
    mails.length = 0

    expect((await forgot(req('forgot', { email: 'R@Example.com' }, '4.4.4.4'))).status).toBe(200)
    const token = tokenFrom(lastMail().text)

    expect((await reset(req('reset', { token, password: 'short' }, '4.4.4.4'))).status).toBe(400)
    expect((await reset(req('reset', { token, password: 'brand-new-pass' }, '4.4.4.4'))).status).toBe(200)
    expect((await reset(req('reset', { token, password: 'another-pass-1' }, '4.4.4.4'))).status).toBe(400) // single use

    expect(await db.session.count({ where: { user: { email: 'r@example.com' } } })).toBe(0)
    expect((await login(req('login', { email: 'r@example.com', password: 'old-password' }, '4.4.4.4'))).status).toBe(401)
    expect((await login(req('login', { email: 'r@example.com', password: 'brand-new-pass' }, '4.4.4.4'))).status).toBe(200)
  })

  it('rejects expired tokens and tokens of the wrong type', async () => {
    const user = await db.user.findUniqueOrThrow({ where: { email: 'r@example.com' } })
    const { issueToken } = await import('@/lib/authTokens')
    const expired = await issueToken(user.id, 'reset')
    await db.authToken.updateMany({ where: { userId: user.id, type: 'reset' }, data: { expiresAt: new Date(Date.now() - 1000) } })
    expect((await reset(req('reset', { token: expired, password: 'brand-new-pass' }, '5.5.5.5'))).status).toBe(400)

    const verifyTok = await issueToken(user.id, 'verify')
    expect((await reset(req('reset', { token: verifyTok, password: 'brand-new-pass' }, '5.5.5.5'))).status).toBe(400)
  })

  it('rate limits forgot per IP', async () => {
    const codes: number[] = []
    for (let i = 0; i < 7; i++) codes.push((await forgot(req('forgot', { email: 'x@example.com' }, '9.9.9.9'))).status)
    expect(codes.slice(0, 5).every(c => c === 200)).toBe(true)
    expect(codes.slice(5)).toEqual([429, 429])
  })
})
