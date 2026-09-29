import { describe, expect, it } from 'vitest'
import { rateLimit } from '../rateLimit'

describe('rateLimit', () => {
  const req = (path: string) => new Request(`http://test${path}`, { headers: { 'x-forwarded-for': '9.9.9.9' } })

  it('keeps separate allowances per route family for the same IP', () => {
    for (let i = 0; i < 3; i++) expect(rateLimit(req('/api/mercadona/search'), { limit: 3, windowMs: 60_000 }).ok).toBe(true)
    expect(rateLimit(req('/api/mercadona/search'), { limit: 3, windowMs: 60_000 }).ok).toBe(false)
    // exhausting /api/mercadona must not affect /api/auth
    expect(rateLimit(req('/api/auth/login'), { limit: 3, windowMs: 60_000 }).ok).toBe(true)
  })

  it('uses the proxy-appended (last) X-Forwarded-For entry, so a spoofed first entry does not evade the limit', () => {
    const spoofed = (fake: string) =>
      new Request('http://test/api/auth/spoof', { headers: { 'x-forwarded-for': `${fake}, 7.7.7.7` } })
    for (let i = 0; i < 2; i++) expect(rateLimit(spoofed(`1.1.1.${i}`), { limit: 2, windowMs: 60_000 }).ok).toBe(true)
    expect(rateLimit(spoofed('1.1.1.99'), { limit: 2, windowMs: 60_000 }).ok).toBe(false)
  })

  it('reports how long to wait once limited', () => {
    const r = new Request('http://test/api/auth/wait', { headers: { 'x-forwarded-for': '8.8.4.4' } })
    rateLimit(r, { limit: 1, windowMs: 30_000 })
    const blocked = rateLimit(r, { limit: 1, windowMs: 30_000 })
    expect(blocked).toEqual({ ok: false, retryAfterSeconds: expect.any(Number) })
  })
})
