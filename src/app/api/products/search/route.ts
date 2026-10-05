import { NextResponse } from 'next/server'
import { requireUserId } from '@/lib/auth'
import { accessibleProducts } from '@/lib/productAccess'
import { db } from '@/lib/db'
import { withErrorHandling } from '@/lib/apiError'

// GET /api/products/search?q=queso&category=dairy
export const GET = withErrorHandling(async (request: Request) => {
  const userId = await requireUserId()
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q') ?? ''
  const category = searchParams.get('category')

  const products = await db.product.findMany({
    where: {
      AND: [
        accessibleProducts(userId),
        q ? { name: { contains: q } } : {},
        category ? { category } : {},
      ],
    },
    orderBy: [{ ketoScore: 'desc' }, { name: 'asc' }],
    take: 50,
  })
  return NextResponse.json(products)
})
