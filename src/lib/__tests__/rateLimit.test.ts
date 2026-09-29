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
})
