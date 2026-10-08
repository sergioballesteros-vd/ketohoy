import { afterEach, describe, expect, it, vi } from 'vitest'

const tree = { results: [{ id: 1, name: 'Fruta y verdura', categories: [{ id: 101, name: 'Verduras' }, { id: 102, name: 'Fruta' }] }] }
const hit = { id: 501, display_name: 'Fixture brócoli', price_instructions: { unit_price: '2.50' } }

function provider({ failSecond = false, offline = false }: { failSecond?: boolean; offline?: boolean } = {}) {
  const calls: string[] = []
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    const url = new URL(String(input))
    calls.push(url.pathname)
    if (offline) throw new Error('offline')
    if (url.pathname === '/api/categories/') return Response.json(tree)
    if (url.pathname === '/api/categories/101/') return Response.json({ categories: [{ name: 'Verduras', products: [hit] }] })
    if (url.pathname === '/api/categories/102/' && failSecond) return new Response(null, { status: 503 })
    if (url.pathname === '/api/categories/102/') return Response.json({ categories: [] })
    if (url.pathname === '/api/products/501/') return Response.json({ ...hit, ean: undefined })
    throw new Error(`Unexpected provider path ${url.pathname}`)
  }))
  return calls
}

async function load(query = 'fixture') {
  return (await import('../mercadona')).searchMercadonaProductsResult(query)
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.resetModules()
  vi.useRealTimers()
})

describe('Mercadona catalog provenance and cache safety (KH-023)', () => {
  it('identifies a complete live result as fresh', async () => {
    provider()
    expect(await load()).toMatchObject({ source: 'mercadona', completeness: 'complete', freshness: 'fresh', products: [{ name: 'Fixture brócoli' }] })
  })

  it('identifies partial results and retries instead of caching them as complete', async () => {
    const calls = provider({ failSecond: true })
    expect(await load()).toMatchObject({ source: 'mercadona', completeness: 'partial', freshness: 'fresh' })
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input))
      calls.push(url.pathname)
      if (url.pathname === '/api/categories/') return Response.json(tree)
      if (url.pathname === '/api/categories/101/') return Response.json({ categories: [{ name: 'Verduras', products: [hit] }] })
      if (url.pathname === '/api/categories/102/') return Response.json({ categories: [] })
      if (url.pathname === '/api/products/501/') return Response.json(hit)
      throw new Error(`Unexpected provider path ${url.pathname}`)
    }))
    expect(await load()).toMatchObject({ completeness: 'complete', freshness: 'fresh' })
    expect(calls.filter(path => path === '/api/categories/')).toHaveLength(2)
  })

  it('uses stale last-known-good data on total failure', async () => {
    vi.useFakeTimers()
    provider()
    await load()
    await vi.advanceTimersByTimeAsync(12 * 60 * 60 * 1000 + 1)
    provider({ offline: true })
    expect(await load()).toMatchObject({ source: 'mercadona', completeness: 'complete', freshness: 'stale' })
  })

  it('labels demo fallback and recovers to fresh data on retry', async () => {
    provider({ offline: true })
    expect(await load('pollo')).toMatchObject({ source: 'demo', freshness: 'demo' })
    provider()
    expect(await load()).toMatchObject({ source: 'mercadona', completeness: 'complete', freshness: 'fresh' })
  })

  it('imports a cold individual detail without requesting the category tree', async () => {
    const calls = provider({ offline: false })
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input))
      calls.push(url.pathname)
      if (url.pathname === '/api/products/999/') return Response.json({ id: 999, display_name: 'Fixture queso', ean: undefined, categories: [{ name: 'Lácteos', categories: [{ name: 'Quesos' }] }] })
      throw new Error(`Unexpected provider path ${url.pathname}`)
    }))
    const product = await (await import('../mercadona')).getMercadonaProduct('999')
    expect(product).toMatchObject({ mercadonaId: '999', name: 'Fixture queso', category: 'dairy' })
    expect(calls).toEqual(['/api/products/999/'])
  })

  it('shares an in-flight detail request between concurrent imports', async () => {
    const calls: string[] = []
    let release!: () => void
    const gate = new Promise<void>(resolve => { release = resolve })
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const path = new URL(String(input)).pathname
      calls.push(path)
      await gate
      return Response.json({ id: 999, display_name: 'Fixture queso', categories: [{ name: 'Lácteos' }] })
    }))
    const { getMercadonaProduct } = await import('../mercadona')
    const first = getMercadonaProduct('999')
    const second = getMercadonaProduct('999')
    await Promise.resolve()
    expect(calls).toEqual(['/api/products/999/'])
    release()
    const [a, b] = await Promise.all([first, second])
    expect(a?.mercadonaId).toBe('999')
    expect(b?.mercadonaId).toBe('999')
    expect(calls).toEqual(['/api/products/999/'])
  })
})
