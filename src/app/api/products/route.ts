import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { withErrorHandling } from '@/lib/apiError'

const createProductSchema = z.object({
  name: z.string().trim().min(1),
  category: z.string().min(1),
  ketoScore: z.number().int().min(0).max(5).optional(),
  brand: z.string().nullable().optional(),
  source: z.string().optional(),
  mercadonaId: z.string().nullable().optional(),
  unitPrice: z.number().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  netCarbsPer100g: z.number().nullable().optional(),
  proteinPer100g: z.number().nullable().optional(),
  fatPer100g: z.number().nullable().optional(),
  caloriesPer100g: z.number().nullable().optional(),
  tags: z.array(z.string()).optional(),
})

// GET /api/products - list all products
export const GET = withErrorHandling(async () => {
  const products = await db.product.findMany({
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
  })
  return NextResponse.json(products)
})

// POST /api/products - create product (manual or from Mercadona)
export const POST = withErrorHandling(async (request: Request) => {
  const { name, category, ketoScore, brand, source, mercadonaId, unitPrice, imageUrl,
    netCarbsPer100g, proteinPer100g, fatPer100g, caloriesPer100g, tags } = createProductSchema.parse(
    await request.json()
  )

  // Upsert by mercadonaId to avoid duplicates
  if (mercadonaId) {
    const existing = await db.product.findUnique({ where: { mercadonaId: String(mercadonaId) } })
    if (existing) return NextResponse.json(existing)
  }

  const product = await db.product.create({
    data: {
      name,
      brand: brand ?? null,
      source: source ?? 'manual',
      mercadonaId: mercadonaId ?? null,
      category,
      ketoScore: ketoScore ?? 3,
      unitPrice: unitPrice ?? null,
      imageUrl: imageUrl ?? null,
      netCarbsPer100g: netCarbsPer100g ?? null,
      proteinPer100g: proteinPer100g ?? null,
      fatPer100g: fatPer100g ?? null,
      caloriesPer100g: caloriesPer100g ?? null,
      tags: JSON.stringify(tags ?? []),
    },
  })
  return NextResponse.json(product, { status: 201 })
})
