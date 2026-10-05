import { NextResponse } from 'next/server'
import { ApiError, withErrorHandling } from '@/lib/apiError'
import { productMatchesMercadonaCategory, searchMercadonaProducts } from '@/lib/mercadona'
import { isMercadonaCategory, MERCADONA_CATEGORY_QUERIES } from '@/lib/categories'
import { rateLimit } from '@/lib/rateLimit'

export const GET = withErrorHandling(
  async (request: Request, { params }: { params: Promise<{ name: string }> }) => {
  const rl = rateLimit(request, { limit: 30, windowMs: 60_000 })
  if (!rl.ok) throw new ApiError('Too many requests', 429)

  const { name } = await params
  if (!isMercadonaCategory(name)) throw new ApiError('Unknown category', 400)
  const queries = MERCADONA_CATEGORY_QUERIES[name]

  const results = await Promise.all(queries.map(q => searchMercadonaProducts(q, 30)))
  const seen = new Set<string>()
  const products = results.flat().filter(p => {
    if (!productMatchesMercadonaCategory(p, name)) return false
    if (seen.has(p.mercadonaId)) return false
    seen.add(p.mercadonaId)
    return true
  })

  return NextResponse.json({ products: products.slice(0, 60), category: name })
  }
)
