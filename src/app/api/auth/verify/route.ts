import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { ApiError, withErrorHandling } from '@/lib/apiError'
import { consumeToken } from '@/lib/authTokens'
import { rateLimit } from '@/lib/rateLimit'

const schema = z.object({ token: z.string().min(1).max(200) })

// POST (not GET) so mail scanners / link prefetchers can't burn the token.
export const POST = withErrorHandling(async (request: Request) => {
  if (!rateLimit(request, { limit: 10, windowMs: 60_000, bucket: 'auth-verify' }).ok) throw new ApiError('Too many requests', 429)
  const { token } = schema.parse(await request.json())
  const userId = await consumeToken(token, 'verify')
  if (!userId) throw new ApiError('El enlace no es válido o ha caducado', 400)
  await db.user.update({ where: { id: userId }, data: { emailVerifiedAt: new Date() } })
  return NextResponse.json({ success: true })
})
