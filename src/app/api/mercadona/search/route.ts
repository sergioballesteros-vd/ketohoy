import { NextResponse } from 'next/server'
import { searchMercadonaProducts, searchMercadonaProductsByQueries, TRENDING_MERCADONA_QUERIES } from '@/lib/mercadona'

// GET /api/mercadona/search?q=queso
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')

  if (!q) {
    return NextResponse.json({ error: 'q required' }, { status: 400 })
  }

  const normalized = q.trim().toLowerCase()
  const products = normalized === 'keto'
    ? await searchMercadonaProductsByQueries(TRENDING_MERCADONA_QUERIES)
    : await searchMercadonaProducts(q)
  return NextResponse.json({ products, available: products.length > 0 })
}
