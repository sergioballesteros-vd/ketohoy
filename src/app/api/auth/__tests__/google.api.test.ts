import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { setupTestDb, post } from '@/lib/__tests__/testDb'

const oauth = vi.hoisted(() => ({ cookie: '' }))
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: () => oauth.cookie ? { value: oauth.cookie } : undefined, set: () => {}, delete: () => {} }),
}))

let cleanup: () => void
let resolveGoogleUser: typeof import('@/lib/googleAuth').resolveGoogleUser
let login: typeof import('../login/route').POST
let db: typeof import('@/lib/db').db
let exchangeCode: typeof import('@/lib/googleAuth').exchangeCode
let startGoogleLogin: typeof import('@/lib/googleAuth').startGoogleLogin

beforeAll(async () => {
  ;({ cleanup } = setupTestDb())
  ;({ resolveGoogleUser } = await import('@/lib/googleAuth'))
  ;({ exchangeCode } = await import('@/lib/googleAuth'))
  ;({ startGoogleLogin } = await import('@/lib/googleAuth'))
  ;({ POST: login } = await import('../login/route'))
  ;({ db } = await import('@/lib/db'))
})
afterAll(() => cleanup())

const profile = (email: string, sub = `sub-${email}`, emailVerified = true) => ({ sub, email, emailVerified })

describe('google login', () => {
  it('preserves only an internal return destination alongside state and PKCE', () => {
    const previousId = process.env.GOOGLE_CLIENT_ID
    process.env.GOOGLE_CLIENT_ID = 'test-client'
    const { cookie, url } = startGoogleLogin('/recipes/abc?tab=ingredients')
    const [state, verifier, destination] = cookie.split('.')
    const params = new URL(url).searchParams
    expect(params.get('state')).toBe(state)
    expect(params.get('code_challenge_method')).toBe('S256')
    expect(destination && Buffer.from(destination, 'base64url').toString()).toBe('/recipes/abc?tab=ingredients')
    expect(startGoogleLogin('https://evil.invalid').cookie.split('.')[2] && Buffer.from(startGoogleLogin('https://evil.invalid').cookie.split('.')[2], 'base64url').toString()).toBe('/')
    expect(verifier).toBeTruthy()
    if (previousId === undefined) delete process.env.GOOGLE_CLIENT_ID
    else process.env.GOOGLE_CLIENT_ID = previousId
  })

  it('bounds the token exchange and turns a timeout into a controlled provider error', async () => {
    const previousId = process.env.GOOGLE_CLIENT_ID
    const previousSecret = process.env.GOOGLE_CLIENT_SECRET
    process.env.GOOGLE_CLIENT_ID = 'test-client'
    process.env.GOOGLE_CLIENT_SECRET = 'test-secret'
    const request = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
      expect(init?.signal).toBeInstanceOf(AbortSignal)
      throw Object.assign(new Error('expired'), { name: 'TimeoutError' })
    })
    vi.stubGlobal('fetch', request)
    await expect(exchangeCode('test-code', 'test-verifier')).rejects.toMatchObject({ status: 503, message: 'Google no respondió a tiempo' })
    expect(request).toHaveBeenCalledTimes(1)
    vi.unstubAllGlobals()
    if (previousId === undefined) delete process.env.GOOGLE_CLIENT_ID
    else process.env.GOOGLE_CLIENT_ID = previousId
    if (previousSecret === undefined) delete process.env.GOOGLE_CLIENT_SECRET
    else process.env.GOOGLE_CLIENT_SECRET = previousSecret
  })

  it('returns a clean callback redirect on a hung token endpoint without creating a session', async () => {
    const previousId = process.env.GOOGLE_CLIENT_ID
    const previousSecret = process.env.GOOGLE_CLIENT_SECRET
    process.env.GOOGLE_CLIENT_ID = 'test-client'
    process.env.GOOGLE_CLIENT_SECRET = 'test-secret'
    const sessionsBefore = await db.session.count()
    oauth.cookie = `state.verifier.${Buffer.from('/recipes/abc').toString('base64url')}`
    vi.stubGlobal('fetch', vi.fn(async () => { throw Object.assign(new Error('expired'), { name: 'TimeoutError' }) }))
    const { GET } = await import('../google/callback/route')
    const response = await GET(new Request('http://localhost/api/auth/google/callback?code=private-code&state=state'))
    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toMatch(/\/login\?error=google&returnTo=%2Frecipes%2Fabc$/)
    expect(await db.session.count()).toBe(sessionsBefore)
    oauth.cookie = ''
    vi.unstubAllGlobals()
    if (previousId === undefined) delete process.env.GOOGLE_CLIENT_ID
    else process.env.GOOGLE_CLIENT_ID = previousId
    if (previousSecret === undefined) delete process.env.GOOGLE_CLIENT_SECRET
    else process.env.GOOGLE_CLIENT_SECRET = previousSecret
  })

  it('validates OAuth state and returns an unaccepted Google account to terms with its internal destination', async () => {
    const previousId = process.env.GOOGLE_CLIENT_ID
    const previousSecret = process.env.GOOGLE_CLIENT_SECRET
    process.env.GOOGLE_CLIENT_ID = 'test-client'
    process.env.GOOGLE_CLIENT_SECRET = 'test-secret'
    oauth.cookie = `valid-state.verifier.${Buffer.from('/recipes/google-recipe').toString('base64url')}`
    const claims = Buffer.from(JSON.stringify({ aud: 'test-client', sub: 'kh042-google', email: 'kh042-google@example.com', email_verified: true })).toString('base64url')
    const fetch = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
      expect(new URLSearchParams(init?.body as string).get('code_verifier')).toBe('verifier')
      return new Response(JSON.stringify({ id_token: `header.${claims}.signature` }), { status: 200 })
    })
    vi.stubGlobal('fetch', fetch)
    const { GET } = await import('../google/callback/route')
    const response = await GET(new Request('http://localhost/api/auth/google/callback?code=mock-code&state=valid-state'))
    expect(new URL(response.headers.get('location')!).pathname).toBe('/accept-terms')
    expect(new URL(response.headers.get('location')!).searchParams.get('returnTo')).toBe('/recipes/google-recipe')
    expect(fetch).toHaveBeenCalledTimes(1)
    oauth.cookie = ''
    vi.unstubAllGlobals()
    if (previousId === undefined) delete process.env.GOOGLE_CLIENT_ID
    else process.env.GOOGLE_CLIENT_ID = previousId
    if (previousSecret === undefined) delete process.env.GOOGLE_CLIENT_SECRET
    else process.env.GOOGLE_CLIENT_SECRET = previousSecret
  })

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
