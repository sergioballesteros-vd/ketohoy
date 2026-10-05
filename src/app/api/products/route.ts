import { NextResponse } from 'next/server'
import { z } from 'zod'
import { packageFields, validPackagePair } from '@/lib/quantities'
import { db } from '@/lib/db'
import { accessibleProducts } from '@/lib/productAccess'
import { requireUserId } from '@/lib/auth'
import { withErrorHandling } from '@/lib/apiError'

const createProductSchema = z.object({
  ...packageFields,
  name: z.string().trim().min(1),
  category: z.string().min(1),
  ketoScore: z.number().int().min(0).max(5).optional(),
  brand: z.string().nullable().optional(),
  source: z.literal('manual').optional(),
  mercadonaId: z.null().optional(),
  unitPrice: z.number().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  netCarbsPer100g: z.number().nonnegative().nullable().optional(),
  proteinPer100g: z.number().nullable().optional(),
  fatPer100g: z.number().nullable().optional(),
  caloriesPer100g: z.number().nullable().optional(),
  tags: z.array(z.string()).optional(),
}).refine(validPackagePair, 'Package quantity and unit must both be specified')

// GET /api/products - shared catalog and own manual products (private API)
export const GET = withErrorHandling(async () => {
  const userId = await requireUserId()
  const products = await db.product.findMany({
    where: accessibleProducts(userId),
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
  })
  return NextResponse.json(products)
})

// POST /api/products - create an owned manual product; imports use /api/mercadona/add
export const POST = withErrorHandling(async (request: Request) => {
  const userId = await requireUserId()
  const { name, category, ketoScore, brand, mercadonaId, unitPrice, imageUrl,
    netCarbsPer100g, proteinPer100g, fatPer100g, caloriesPer100g, tags, packageQuantity, packageUnit } = createProductSchema.parse(
    await request.json()
  )

  // Deduplicate only within this account; client metadata cannot publish to the shared catalog.
  const existing = await db.product.findFirst({ where: { source: 'manual', ownerId: userId, name, category, packageQuantity: packageQuantity ?? null, packageUnit: packageUnit ?? null } })
  if (existing) return NextResponse.json(existing)

  const product = await db.product.create({
    data: {
      name,
      packageQuantity: packageQuantity ?? null,
      packageUnit: packageUnit ?? null,
      brand: brand ?? null,
      source: 'manual',
      ownerId: userId,
      mercadonaId: mercadonaId ?? null,
      category,
      ketoScore: ketoScore ?? 3,
      unitPrice: unitPrice ?? null,
      imageUrl: imageUrl ?? null,
      netCarbsPer100g: netCarbsPer100g ?? null,
      nutritionConvention: netCarbsPer100g != null ? 'available_excluding_fiber' : 'unknown',
      proteinPer100g: proteinPer100g ?? null,
      fatPer100g: fatPer100g ?? null,
      caloriesPer100g: caloriesPer100g ?? null,
      tags: JSON.stringify(tags ?? []),
    },
  })
  return NextResponse.json(product, { status: 201 })
})
