import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ApiError, withErrorHandling } from '@/lib/apiError'

// DELETE /api/pantry/:id - remove from pantry
export const DELETE = withErrorHandling(
  async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params
    try {
      await db.pantryItem.delete({ where: { id } })
    } catch {
      throw new ApiError('Not found', 404)
    }
    return NextResponse.json({ success: true })
  }
)
