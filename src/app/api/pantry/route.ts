import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { withErrorHandling } from '@/lib/apiError'

const createPantryItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().nullable().optional(),
  unit: z.string().nullable().optional(),
})

// GET /api/pantry - list pantry items with product info
export const GET = withErrorHandling(async () => {
  const items = await db.pantryItem.findMany({
    include: { product: true },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(items)
})

// POST /api/pantry - add product to pantry
export const POST = withErrorHandling(async (request: Request) => {
  const { productId, quantity, unit } = createPantryItemSchema.parse(await request.json())

  // Upsert: if already in pantry, return existing
  const existing = await db.pantryItem.findFirst({ where: { productId } })
  if (existing) {
    return NextResponse.json(existing)
  }

  const item = await db.pantryItem.create({
    data: { productId, quantity: quantity ?? null, unit: unit ?? null },
    include: { product: true },
  })
  return NextResponse.json(item, { status: 201 })
})
