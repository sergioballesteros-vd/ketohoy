import { NextResponse } from 'next/server'
import { ApiError, withErrorHandling } from '@/lib/apiError'
import { getSessionUser } from '@/lib/auth'
import { sendVerificationEmail } from '@/lib/authMail'
import { rateLimit } from '@/lib/rateLimit'

export const POST = withErrorHandling(async (request: Request) => {
  if (!rateLimit(request, { limit: 3, windowMs: 60_000, bucket: 'auth-resend' }).ok) throw new ApiError('Too many requests', 429)
  const user = await getSessionUser()
  if (!user) throw new ApiError('Unauthorized', 401)
  if (!user.emailVerifiedAt) await sendVerificationEmail(user)
  return NextResponse.json({ success: true })
})
