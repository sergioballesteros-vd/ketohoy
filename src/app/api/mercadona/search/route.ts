import { NextResponse } from 'next/server'
import { ApiError, withErrorHandling } from '@/lib/apiError'
import { searchMercadonaProducts, searchMercadonaProductsByQueries, TRENDING_MERCADONA_QUERIES } from '@/lib/mercadona'
import { rateLimit } from '@/lib/rateLimit'

// GET /api/mercadona/search?q=queso
export const GET = withErrorHandling(async (request: Request) => {
  const rl = rateLimit(request, { limit: 30, windowMs: 60_000 })
  if (!rl.ok) throw new ApiError('Too many requests', 429)

  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')

  if (!q) {
    throw new ApiError('q required', 400)
  }

  const normalized = q.trim().toLowerCase()
  const products = normalized === 'keto'
    ? await searchMercadonaProductsByQueries(TRENDING_MERCADONA_QUERIES)
    : await searchMercadonaProducts(q)
  return NextResponse.json({ products, available: products.length > 0 })
})
