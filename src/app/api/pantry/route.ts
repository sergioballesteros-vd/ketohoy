import { NextResponse } from 'next/server'
import { z } from 'zod'
import { accessibleProducts } from '@/lib/productAccess'
import { db } from '@/lib/db'
import { requireUserId } from '@/lib/auth'
import { addPantryPresence } from '@/lib/pantryAddition'
import { ApiError, withErrorHandling } from '@/lib/apiError'

const createPantryItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().positive().nullable().optional(),
  unit: z.string().nullable().optional(),
})

// GET /api/pantry - list pantry items with product info
export const GET = withErrorHandling(async () => {
  const userId = await requireUserId()
  const items = await db.pantryItem.findMany({
    where: { userId },
    include: { product: true },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(items)
})

// POST creates initial presence; outcome=existing keeps stock intact. PATCH edits stock.
export const POST = withErrorHandling(async (request: Request) => {
  const userId = await requireUserId()
  const { productId, quantity, unit } = createPantryItemSchema.parse(await request.json())

  const result = await db.$transaction(async tx => {
    if (!(await tx.product.findFirst({ where: { id: productId, ...accessibleProducts(userId) }, select: { id: true } }))) {
      throw new ApiError('Product not found', 404)
    }
    return addPantryPresence(tx, { userId, productId, quantity, unit })
  })
  return NextResponse.json(result, { status: result.outcome === 'created' ? 201 : 200 })
})
