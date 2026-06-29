import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/pantry - list pantry items with product info
export async function GET() {
  const items = await db.pantryItem.findMany({
    include: { product: true },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(items)
}

// POST /api/pantry - add product to pantry
export async function POST(request: Request) {
  const body = await request.json()
  const { productId, quantity, unit } = body

  if (!productId) {
    return NextResponse.json({ error: 'productId required' }, { status: 400 })
  }

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
}
