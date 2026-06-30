import { NextResponse } from 'next/server'
import { searchMercadonaProducts } from '@/lib/mercadona'

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

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params
  const queries = CATEGORY_QUERIES[name]
  if (!queries) return NextResponse.json({ error: 'Unknown category' }, { status: 400 })

  const results = await Promise.all(queries.map(q => searchMercadonaProducts(q)))
  const seen = new Set<string>()
  const products = results.flat().filter(p => {
    if (seen.has(p.mercadonaId)) return false
    seen.add(p.mercadonaId)
    return true
  })

  return NextResponse.json({ products, category: name })
}
