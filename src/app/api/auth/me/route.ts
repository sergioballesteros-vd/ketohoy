import { NextResponse } from 'next/server'
import { ApiError, withErrorHandling } from '@/lib/apiError'
import { getSessionUser } from '@/lib/auth'

export const GET = withErrorHandling(async () => {
  const user = await getSessionUser()
  if (!user) throw new ApiError('Unauthorized', 401)
  return NextResponse.json({ email: user.email, emailVerified: !!user.emailVerifiedAt })
})
