import { NextResponse } from 'next/server'
import { getMercadonaProduct } from '@/lib/mercadona'

// GET /api/mercadona/product/:id
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const product = await getMercadonaProduct(id)

  if (!product) {
    return NextResponse.json({ error: 'Not found or Mercadona CLI unavailable' }, { status: 404 })
  }
  return NextResponse.json(product)
}
