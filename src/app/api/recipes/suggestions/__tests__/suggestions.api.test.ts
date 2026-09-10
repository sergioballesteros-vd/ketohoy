import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { setupTestDb, get } from '@/lib/__tests__/testDb'

let GET: typeof import('../route').GET
let cleanup: () => void

beforeAll(async () => {
  ;({ cleanup } = setupTestDb())
  ;({ GET } = await import('../route'))
})

afterAll(() => cleanup())

describe('GET /api/recipes/suggestions', () => {
  it('returns suggestions with the default limit of 20', async () => {
    const res = await GET(get('http://test/api/recipes/suggestions'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.items.length).toBeLessThanOrEqual(20)
    expect(body.items.length).toBeGreaterThan(0)
  })

  it('clamps an out-of-range limit param into [1, 100]', async () => {
    const res = await GET(get('http://test/api/recipes/suggestions?limit=9999'))
    const body = await res.json()
    expect(body.items.length).toBeLessThanOrEqual(100)
  })

  it('onlyAvailable=true returns only recipes with zero missing ingredients', async () => {
    const res = await GET(get('http://test/api/recipes/suggestions?onlyAvailable=true'))
    const body = await res.json()
    for (const item of body.items as Array<{ missingIngredients: unknown[] }>) {
      expect(item.missingIngredients).toHaveLength(0)
    }
  })
})
