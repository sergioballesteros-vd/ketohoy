import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { ApiError, withErrorHandling } from '@/lib/apiError'
import { sendPasswordResetEmail } from '@/lib/authMail'
import { rateLimit } from '@/lib/rateLimit'

const schema = z.object({ email: z.string().trim().toLowerCase().pipe(z.email()) })

// Same answer whether or not the email exists, so this can't be used to enumerate accounts.
export const POST = withErrorHandling(async (request: Request) => {
  if (!rateLimit(request, { limit: 5, windowMs: 60_000, bucket: 'auth-forgot' }).ok) throw new ApiError('Too many requests', 429)
  const { email } = schema.parse(await request.json())
  const user = await db.user.findUnique({ where: { email } })
  if (user) {
    try {
      await sendPasswordResetEmail(user)
    } catch (error) {
      // Keep the response indistinguishable; provider messages can contain private data.
      const failure = error instanceof Error && ['TimeoutError', 'AbortError'].includes(error.name)
        ? error.name : 'ProviderOrTokenError'
      console.error('password reset email failed', failure)
    }
  }
  return NextResponse.json({ success: true })
})
