import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireUserId } from '@/lib/auth'
import { ApiError, withErrorHandling } from '@/lib/apiError'

// DELETE /api/pantry/:id - remove from pantry
export const DELETE = withErrorHandling(
  async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params
    const { count } = await db.pantryItem.deleteMany({ where: { id, userId: await requireUserId() } })
    if (count === 0) throw new ApiError('Not found', 404)
    return NextResponse.json({ success: true })
  }
)

const updatePantryItemSchema = z.object({
  quantity: z.number().positive().nullable().optional(),
  unit: z.string().trim().min(1).nullable().optional(),
})

// PATCH /api/pantry/:id - edit quantity / unit (null clears it)
export const PATCH = withErrorHandling(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params
    const userId = await requireUserId()
    const { quantity, unit } = updatePantryItemSchema.parse(await request.json())

    const { count } = await db.pantryItem.updateMany({
      where: { id, userId },
      data: { ...(quantity !== undefined && { quantity }), ...(unit !== undefined && { unit }) },
    })
    if (count === 0) throw new ApiError('Not found', 404)
    return NextResponse.json(await db.pantryItem.findUnique({ where: { id }, include: { product: true } }))
  }
)
