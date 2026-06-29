import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/products/search?q=queso&category=dairy
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q') ?? ''
  const category = searchParams.get('category')

  const products = await db.product.findMany({
    where: {
      AND: [
        q ? { name: { contains: q } } : {},
        category ? { category } : {},
      ],
    },
    orderBy: [{ ketoScore: 'desc' }, { name: 'asc' }],
    take: 50,
  })
  return NextResponse.json(products)
}
