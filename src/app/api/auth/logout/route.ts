import { NextResponse } from 'next/server'
import { withErrorHandling } from '@/lib/apiError'
import { destroySession } from '@/lib/auth'

export const POST = withErrorHandling(async () => {
  await destroySession()
  return NextResponse.json({ success: true })
})
