import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchNutritionByEan, OpenFoodFactsError } from '../openFoodFacts'
import { classifyProduct } from '../productClassification'

async function nutrition(nutriments: Record<string, unknown>, extra = {}) {
  vi.stubGlobal('fetch', vi.fn(async () => Response.json({ status: 1, product: { nutriments, ...extra } })))
  return fetchNutritionByEan('fixture')
}
afterEach(() => vi.unstubAllGlobals())

describe('OFF available carbohydrate contract (KH-025)', () => {
  it.each([0, 3, 12.2])('never subtracts fiber %s from available carbs', async fiber => {
    const n = await nutrition({ carbohydrates_100g: 5, fiber_100g: fiber })
    expect(n).toMatchObject({ availableCarbsPer100g: 5, fiber })
    expect(classifyProduct({ name: 'fixture', category: 'other', netCarbs: n?.availableCarbsPer100g }).score).toBe(4)
  })
  it('does not convert a total-only payload or infer convention from country', async () => {
    const n = await nutrition({ 'carbohydrates-total_100g': 5, fiber_100g: 3 }, { countries_tags: ['en:spain'] })
    expect(n?.availableCarbsPer100g).toBeNull()
    expect(classifyProduct({ name: 'fixture', category: 'other', netCarbs: n?.availableCarbsPer100g }).source).toBe('unknown')
  })
  it.each([undefined, null, '5', '', -1, {}, true])('invalid available carbs %j stays unknown', async value => {
    const n = await nutrition({ carbohydrates_100g: value, fiber_100g: 3 })
    expect(n?.availableCarbsPer100g).toBeNull()
    expect(classifyProduct({ name: 'fixture', category: 'other', netCarbs: n?.availableCarbsPer100g })).toMatchObject({ source: 'unknown', score: 0 })
  })
  it.each([undefined, null, -1, '3'])('absent/invalid fiber %j is not invented and does not erase valid carbs', async value => {
    expect(await nutrition({ carbohydrates_100g: 5.25, fiber_100g: value })).toMatchObject({ availableCarbsPer100g: 5.25, fiber: null })
  })
  it('zero available carbs is a valid value even with positive fiber', async () => {
    expect(await nutrition({ carbohydrates_100g: 0, fiber_100g: 3 })).toMatchObject({ availableCarbsPer100g: 0, fiber: 3 })
  })
  it.each([[5, 5, 4], [10, 4, 3], [20, 3, 2], [35, 2, 1], [50, 1, 0]])('threshold %s uses normalized available carbs', async (threshold, below, at) => {
    for (const [value, score] of [[threshold - 0.01, below], [threshold, at], [threshold + 0.01, at]]) {
      const n = await nutrition({ carbohydrates_100g: value, fiber_100g: 3 })
      expect(classifyProduct({ name: 'fixture', category: 'other', netCarbs: n?.availableCarbsPer100g }).score).toBe(score)
    }
  })
  it('uses only the normalized sold basis, never serving/raw/prepared values', async () => {
    const n = await nutrition({ carbohydrates_100g: 5, carbohydrates: 1, carbohydrates_serving: 1, carbohydrates_prepared_100g: 2 }, { nutrition_data_per: 'serving' })
    expect(n?.availableCarbsPer100g).toBe(5)
  })
  it('rejects nonfinite values at the adapter boundary', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ status: 1, product: { nutriments: { carbohydrates_100g: Infinity, fiber_100g: NaN } } }) })))
    expect(await fetchNutritionByEan('fixture')).toMatchObject({ availableCarbsPer100g: null, fiber: null })
  })
  it('missing nutrition or an unavailable source returns no evidence', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ status: 0 })))
    expect(await fetchNutritionByEan('fixture')).toBeNull()
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline') }))
    await expect(fetchNutritionByEan('fixture')).rejects.toMatchObject({ name: 'OpenFoodFactsError', kind: 'provider_error' })
  })
  it('uses an explicit timeout signal and reports timeout separately from missing data', async () => {
    vi.stubGlobal('fetch', vi.fn(async (_url, init: RequestInit) => {
      expect(init.signal).toBeInstanceOf(AbortSignal)
      throw Object.assign(new Error('expired'), { name: 'TimeoutError' })
    }))
    await expect(fetchNutritionByEan('fixture')).rejects.toBeInstanceOf(OpenFoodFactsError)
    await expect(fetchNutritionByEan('fixture')).rejects.toMatchObject({ kind: 'timeout' })
  })
})
