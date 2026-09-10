import { NextResponse } from 'next/server'
import { ApiError, withErrorHandling } from '@/lib/apiError'
import { productMatchesMercadonaCategory, searchMercadonaProducts, type ProductCategory } from '@/lib/mercadona'
import { rateLimit } from '@/lib/rateLimit'

const CATEGORY_QUERIES: Record<string, string[]> = {
  meat:       ['pollo', 'ternera', 'pavo'],
  fish:       ['salmón', 'atún', 'merluza'],
  eggs:       ['huevos'],
  dairy:      ['queso', 'yogur griego', 'nata'],
  vegetables: ['espinacas', 'brócoli', 'lechuga'],
  nuts:       ['almendras', 'nueces'],
  oils:       ['aceite oliva', 'aceite coco'],
  sauces:     ['mayonesa', 'mostaza'],
}

export const GET = withErrorHandling(
  async (request: Request, { params }: { params: Promise<{ name: string }> }) => {
  const rl = rateLimit(request, { limit: 30, windowMs: 60_000 })
  if (!rl.ok) throw new ApiError('Too many requests', 429)

  const { name } = await params
  const queries = CATEGORY_QUERIES[name]
  if (!queries) throw new ApiError('Unknown category', 400)

  const results = await Promise.all(queries.map(q => searchMercadonaProducts(q)))
  const seen = new Set<string>()
  const products = results.flat().filter(p => {
    if (!productMatchesMercadonaCategory(p, name as ProductCategory)) return false
    if (seen.has(p.mercadonaId)) return false
    seen.add(p.mercadonaId)
    return true
  })

  return NextResponse.json({ products, category: name })
  }
)
