import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireUserId } from '@/lib/auth'
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

// POST /api/pantry - add product to pantry
export const POST = withErrorHandling(async (request: Request) => {
  const userId = await requireUserId()
  const { productId, quantity, unit } = createPantryItemSchema.parse(await request.json())

  if (!(await db.product.findUnique({ where: { id: productId }, select: { id: true } }))) {
    throw new ApiError('Product not found', 404)
  }

  // Upsert: if already in pantry, return existing
  const existing = await db.pantryItem.findFirst({ where: { productId, userId } })
  if (existing) {
    return NextResponse.json(existing)
  }

  const item = await db.pantryItem.create({
    data: { userId, productId, quantity: quantity ?? null, unit: unit ?? null },
    include: { product: true },
  })
  return NextResponse.json(item, { status: 201 })
})
