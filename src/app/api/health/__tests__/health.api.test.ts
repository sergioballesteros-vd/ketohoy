import { beforeEach, describe, expect, it, vi } from 'vitest'

const query = vi.hoisted(() => vi.fn())
vi.mock('@/lib/db', () => ({ db: { $queryRaw: query } }))

import { GET } from '../route'

describe('GET /api/health', () => {
  beforeEach(() => query.mockReset())

  it('returns a minimal success response after a read-only database query', async () => {
    query.mockResolvedValue([{ 1: 1 }])

    const response = await GET()

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ status: 'ok' })
    expect(query).toHaveBeenCalledOnce()
  })

})
