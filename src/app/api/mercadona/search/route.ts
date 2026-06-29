import { NextResponse } from 'next/server'
import { searchMercadonaProducts } from '@/lib/mercadona'

// GET /api/mercadona/search?q=queso
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')

  if (!q) {
    return NextResponse.json({ error: 'q required' }, { status: 400 })
  }

  const products = await searchMercadonaProducts(q)
  return NextResponse.json({ products, available: products.length > 0 })
}
