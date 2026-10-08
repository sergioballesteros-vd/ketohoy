import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { setupTestDb, post } from '@/lib/__tests__/testDb'

vi.mock('@/lib/auth', async () => (await import('@/lib/__tests__/authMock')).authMock)

let POST: typeof import('../route').POST
let cleanup: () => void

beforeAll(async () => {
  ;({ cleanup } = setupTestDb())
  ;({ POST } = await import('../route'))
})

afterAll(() => cleanup())

describe('POST /api/products input contract', () => {
  it('creates valid products, preserves zero, and accepts configured image sources', async () => {
    const response = await POST(post('http://test/api/products', {
      name: '  Test product  ', category: 'other', unitPrice: 0, netCarbsPer100g: 0,
      imageUrl: 'https://images.unsplash.com/photo-123',
    }))
    expect(response.status).toBe(201)
    expect(await response.json()).toMatchObject({ name: 'Test product', unitPrice: 0, netCarbsPer100g: 0 })
  })

  it.each([
    ['whitespace name', { name: '   ', category: 'other' }],
    ['long name', { name: 'x'.repeat(121), category: 'other' }],
    ['unknown category', { name: 'Invalid category', category: 'not-a-category' }],
    ['negative price', { name: 'Negative price', category: 'other', unitPrice: -1 }],
    ['wrong numeric type', { name: 'Wrong type', category: 'other', fatPer100g: '1' }],
    ['infinite numeric string', { name: 'Infinity', category: 'other', caloriesPer100g: 'Infinity' }],
    ['oversized nutrition value', { name: 'Huge macros', category: 'other', proteinPer100g: 1001 }],
    ['invalid source', { name: 'Spoofed source', category: 'other', source: 'mercadona' }],
  ])('rejects %s before writing', async (_label, body) => {
    const response = await POST(post('http://test/api/products', body))
    expect(response.status).toBe(400)
  })

  it.each(['not a url', 'javascript:alert(1)', 'data:image/svg+xml,unsafe', 'https://images.unsplash.com.evil.invalid/x'])('falls back to no image for unsupported URL %s', async imageUrl => {
    const response = await POST(post('http://test/api/products', { name: `Image ${imageUrl}`, category: 'other', imageUrl }))
    expect(response.status).toBe(201)
    expect((await response.json()).imageUrl).toBeNull()
  })

  it('returns a stable 400 for malformed JSON', async () => {
    const response = await POST(new Request('http://test/api/products', { method: 'POST', body: '{bad' }))
    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: 'Invalid JSON body' })
  })
})
