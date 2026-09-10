import { describe, it, expect } from 'vitest'
import { extendedPool } from '../weeklyPlanPool'

describe('extendedPool', () => {
  it('returns empty when there are no candidates (regression: empty meal slot)', () => {
    expect(extendedPool([], 7)).toEqual([])
  })

  it('fills all 7 slots even with a single candidate', () => {
    const pool = extendedPool(['a'], 7)
    expect(pool).toHaveLength(7)
    expect(pool.every(id => id === 'a')).toBe(true)
  })

  it('uses every candidate before repeating any one (regression: same 3 recipes all week)', () => {
    const ids = ['a', 'b', 'c']
    const pool = extendedPool(ids, 7)
    expect(pool).toHaveLength(7)
    // first 3 slots must be a full, non-repeating pass over the pool
    expect(new Set(pool.slice(0, 3))).toEqual(new Set(ids))
  })

  it('never repeats the same id on two consecutive days when alternatives exist', () => {
    const ids = ['a', 'b', 'c', 'd']
    for (let trial = 0; trial < 20; trial++) {
      const pool = extendedPool(ids, 7)
      for (let i = 1; i < pool.length; i++) {
        expect(pool[i]).not.toBe(pool[i - 1])
      }
    }
  })

  it('truncates to the requested size', () => {
    expect(extendedPool(['a', 'b', 'c'], 2)).toHaveLength(2)
  })
})
