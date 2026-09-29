import { NextResponse } from 'next/server'
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
