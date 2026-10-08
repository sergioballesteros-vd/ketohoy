import { NextResponse } from 'next/server'
import { ApiError, withErrorHandling } from '@/lib/apiError'
import { productMatchesMercadonaCategory, searchMercadonaProductsResult } from '@/lib/mercadona'
import { isMercadonaCategory, MERCADONA_CATEGORY_QUERIES } from '@/lib/categories'
import { rateLimit } from '@/lib/rateLimit'

export const GET = withErrorHandling(
  async (request: Request, { params }: { params: Promise<{ name: string }> }) => {
  const rl = rateLimit(request, { limit: 30, windowMs: 60_000 })
  if (!rl.ok) throw new ApiError('Too many requests', 429)

  const { name } = await params
  if (!isMercadonaCategory(name)) throw new ApiError('Unknown category', 400)
  const queries = MERCADONA_CATEGORY_QUERIES[name]

  const results = await Promise.all(queries.map(q => searchMercadonaProductsResult(q, 30)))
  const seen = new Set<string>()
  const products = results.flatMap(result => result.products).filter(p => {
    if (!productMatchesMercadonaCategory(p, name)) return false
    if (seen.has(p.mercadonaId)) return false
    seen.add(p.mercadonaId)
    return true
  })

  const selected = results.find(result => result.freshness === 'fresh') ?? results[0]
  return NextResponse.json({
    products: products.slice(0, 60), category: name,
    source: results.some(result => result.source === 'demo') && results.some(result => result.source === 'mercadona') ? 'mixed' : selected?.source ?? 'mercadona', fetchedAt: selected?.fetchedAt ?? null,
    completeness: results.some(result => result.completeness === 'partial') ? 'partial' : selected?.completeness ?? 'complete',
    freshness: results.some(result => result.freshness === 'demo') ? 'demo' : results.some(result => result.freshness === 'stale') ? 'stale' : selected?.freshness ?? 'fresh',
  })
  }
)
