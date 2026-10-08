import { describe, expect, it } from 'vitest'
import { normalizeInternalReturnTo } from '../returnTo'

describe('normalizeInternalReturnTo', () => {
  it.each(['/','/recipes/abc','/recipes/abc?foo=bar#ingredients'])('keeps safe internal destination %s', value => {
    expect(normalizeInternalReturnTo(value)).toBe(value)
  })

  it.each([
    '', 'https://externo.invalid', 'http://externo.invalid', '//externo.invalid', '///externo.invalid',
    '\\externo.invalid', '/\\/externo.invalid', 'javascript:alert(1)', 'data:text/html,test',
    '/%2F%2Fexterno.invalid', '/%252F%252Fexterno.invalid', '/%5Cexterno.invalid', '/%255Cexterno.invalid',
    '/recipes/%', ' /recipes/abc', '/recipes/abc\n', '/login', '/login?returnTo=/recipes/abc', '/accept-terms',
    '/api/auth', '/api/auth/google?returnTo=/recipes/abc', '/api/auth/google/callback',
  ])('falls back for unsafe destination %s', value => {
    expect(normalizeInternalReturnTo(value)).toBe('/')
  })
})
