import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/products - list all products
export async function GET() {
  const products = await db.product.findMany({
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
  })
  return NextResponse.json(products)
}

// POST /api/products - create product manually
export async function POST(request: Request) {
  const body = await request.json()
  const { name, category, ketoScore, brand, netCarbsPer100g, proteinPer100g, fatPer100g, caloriesPer100g, tags } = body

  if (!name || !category) {
    return NextResponse.json({ error: 'name and category required' }, { status: 400 })
  }

  const product = await db.product.create({
    data: {
      name,
      brand: brand ?? null,
      source: 'manual',
      category,
      ketoScore: ketoScore ?? 3,
      netCarbsPer100g: netCarbsPer100g ?? null,
      proteinPer100g: proteinPer100g ?? null,
      fatPer100g: fatPer100g ?? null,
      caloriesPer100g: caloriesPer100g ?? null,
      tags: JSON.stringify(tags ?? []),
    },
  })
  return NextResponse.json(product, { status: 201 })
}
