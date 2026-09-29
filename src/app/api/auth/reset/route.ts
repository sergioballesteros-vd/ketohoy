import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { ApiError, withErrorHandling } from '@/lib/apiError'
import { hashPassword } from '@/lib/auth'
import { consumeToken } from '@/lib/authTokens'
import { rateLimit } from '@/lib/rateLimit'

const schema = z.object({
  token: z.string().min(1).max(200),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres').max(200),
})

export const POST = withErrorHandling(async (request: Request) => {
  if (!rateLimit(request, { limit: 10, windowMs: 60_000, bucket: 'auth-reset' }).ok) throw new ApiError('Too many requests', 429)
  const { token, password } = schema.parse(await request.json())
  const userId = await consumeToken(token, 'reset')
  if (!userId) throw new ApiError('El enlace no es válido o ha caducado', 400)

  const passwordHash = await hashPassword(password)
  // Reaching the emailed link proves the mailbox, so it also verifies the email.
  // All sessions die: whoever held the old password (or a stolen cookie) is logged out.
  await db.$transaction([
    db.user.update({ where: { id: userId }, data: { passwordHash, emailVerifiedAt: new Date() } }),
    db.session.deleteMany({ where: { userId } }),
    db.authToken.deleteMany({ where: { userId, type: 'reset' } }),
  ])
  return NextResponse.json({ success: true })
})
