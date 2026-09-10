import { NextResponse } from 'next/server'
import { ApiError, withErrorHandling } from '@/lib/apiError'
import { getMercadonaProduct } from '@/lib/mercadona'
import { rateLimit } from '@/lib/rateLimit'

// GET /api/mercadona/product/:id
export const GET = withErrorHandling(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const rl = rateLimit(request, { limit: 30, windowMs: 60_000 })
    if (!rl.ok) throw new ApiError('Too many requests', 429)

    const { id } = await params
    const product = await getMercadonaProduct(id)

    if (!product) {
      throw new ApiError('Not found or Mercadona CLI unavailable', 404)
    }
    return NextResponse.json(product)
  }
)
