import { beforeAll, afterAll, describe, expect, it, vi } from 'vitest'
import { setupTestDb, post, get } from '@/lib/__tests__/testDb'
import almond from '../../../../../audit-assets/kh-025/off-8480000348654.json'
vi.mock('@/lib/auth', async () => (await import('@/lib/__tests__/authMock')).authMock)
vi.mock('@/lib/rateLimit', () => ({ rateLimit: () => ({ ok: true }) }))

const fixtures = [
  { id: 7001, display_name: 'Pollo rebozado Crispy', ean: '7001' },
  { id: 7002, display_name: 'Repollo' },
  { id: 7003, display_name: 'Bebida de almendras', ean: '7003' },
  { id: 7004, display_name: 'Producto sin identificar' },
  { id: 7005, display_name: 'Almendra al natural - Hacendado', ean: '8480000348654' },
  { id: 7006, display_name: 'Producto sin convención disponible', ean: '7006' },
]
let cleanup: () => void
let search: typeof import('../search/route').GET
let detail: typeof import('../product/[id]/route').GET
let add: typeof import('../add/route').POST
let db: typeof import('@/lib/db').db
beforeAll(async () => {
  ;({ cleanup } = setupTestDb())
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    if (url.includes('openfoodfacts') && url.includes('8480000348654')) return Response.json(almond)
    if (url.includes('openfoodfacts') && url.includes('7006')) return Response.json({ status: 1, product: { nutriments: { 'carbohydrates-total_100g': 5, fiber_100g: 3 } } })
    if (url.includes('openfoodfacts')) return Response.json({ status: 1, product: { nutriments: url.includes('7003') ? { carbohydrates_100g: 2, fiber_100g: 0 } : {} } })
    if (url.includes('/categories/?')) return Response.json({ results: [{ id: 3, name: 'Top', categories: [{ id: 31, name: 'Otros' }] }] })
    if (url.includes('/categories/31/')) return Response.json({ categories: [{ name: 'Otros', products: fixtures }] })
    const id = url.match(/products\/(\d+)/)?.[1]
    const fixture = fixtures.find(f => String(f.id) === id)
    return fixture ? Response.json(fixture) : new Response(null, { status: 404 })
  }))
  ;({ GET: search } = await import('../search/route'))
  ;({ GET: detail } = await import('../product/[id]/route'))
  ;({ POST: add } = await import('../add/route'))
  ;({ db } = await import('@/lib/db'))
})
afterAll(() => { vi.unstubAllGlobals(); cleanup() })

describe('canonical catalog classification', () => {
  it.each(fixtures)('$display_name matches search, detail, import and persistence', async fixture => {
    const result = await search(get(`http://test/search?q=${encodeURIComponent(fixture.display_name)}`))
    expect(result.status).toBe(200)
    const found = (await result.json()).products[0]
    const detailed = await detail(get('http://test/detail'), { params: Promise.resolve({ id: String(fixture.id) }) })
    expect(detailed.status).toBe(200)
    const full = await detailed.json()
    const imported = await add(post('http://test/add', { mercadonaId: String(fixture.id) }))
    expect(imported.status).toBe(200)
    const data = await imported.json()
    expect(found.classification).toEqual(full.classification)
    expect(data.classification).toEqual(full.classification)
    expect(data.product.classification).toEqual(full.classification)
    expect(data.product.ketoScore).toBe(found.ketoScore)
    expect(data.product.category).toBe(found.category)
    expect(full.classification.source).toBe([7003, 7005].includes(fixture.id) ? 'nutrition' : [7004, 7006].includes(fixture.id) ? 'unknown' : 'category_estimate')
    if (fixture.id === 7005) {
      expect(found.netCarbsPer100g).toBe(5.9)
      expect(full.classification.score).toBe(4)
      expect(data.product.netCarbsPer100g).toBe(5.9)
      expect(data.product.carbsPer100g).toBe(5.9)
      expect(data.product.fiberPer100g).toBe(12.2)
    }
    const stored = await db.product.findUniqueOrThrow({ where: { mercadonaId: String(fixture.id) } })
    expect(stored.ketoScore).toBe(found.classification.score)
    expect(stored.nutritionSource).toBe([7003, 7005].includes(fixture.id) ? 'openfoodfacts' : [7004, 7006].includes(fixture.id) ? 'unknown' : 'category')
    expect(stored.nutritionConvention).toBe([7003, 7005].includes(fixture.id) ? 'available_excluding_fiber' : 'unknown')
    expect(stored.netCarbsPer100g).toBe(full.netCarbsPer100g ?? null)
  })
  it('explicit reimport replaces ambiguous legacy only from a verified snapshot', async () => {
    await db.product.update({ where: { mercadonaId: '7005' }, data: { netCarbsPer100g: 0, ketoScore: 0, nutritionSource: 'openfoodfacts', nutritionConvention: 'unknown' } })
    const response = await add(post('http://test/add', { mercadonaId: '7005' }))
    expect((await response.json()).product).toMatchObject({ netCarbsPer100g: 5.9, ketoScore: 4, nutritionSource: 'openfoodfacts', nutritionConvention: 'available_excluding_fiber' })
  })
  it('manual available carbs are explicit, not a total/fiber conversion', async () => {
    const { POST } = await import('../../products/route')
    const res = await POST(post('http://test/products', { name: 'KH025 manual available', category: 'nuts', netCarbsPer100g: 5, carbsPer100g: 8, fiberPer100g: 3 }))
    expect(res.status).toBe(201)
    expect(await res.json()).toMatchObject({ netCarbsPer100g: 5, carbsPer100g: null, fiberPer100g: null, nutritionConvention: 'available_excluding_fiber', nutritionSource: 'category' })
    const invalid = await POST(post('http://test/products', { name: 'KH025 invalid', category: 'nuts', netCarbsPer100g: -1 }))
    expect(invalid.status).toBe(400)
  })
})
