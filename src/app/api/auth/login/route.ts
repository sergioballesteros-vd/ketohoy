import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { ApiError, withErrorHandling } from '@/lib/apiError'
import { createSession, hashPassword, verifyPassword } from '@/lib/auth'
import { rateLimit } from '@/lib/rateLimit'

const schema = z.object({ email: z.string().trim().toLowerCase(), password: z.string().min(1).max(200) })

// Constant-ish work for unknown emails so response time doesn't reveal which exist.
const dummyHash = hashPassword('dummy-password')

export const POST = withErrorHandling(async (request: Request) => {
  if (!rateLimit(request, { limit: 10, windowMs: 60_000 }).ok) throw new ApiError('Too many requests', 429)
  const { email, password } = schema.parse(await request.json())

  const user = await db.user.findUnique({ where: { email } })
  const ok = await verifyPassword(password, user?.passwordHash ?? (await dummyHash))
  if (!user || !ok) throw new ApiError('Email o contraseña incorrectos', 401)

  await createSession(user.id)
  return NextResponse.json({ id: user.id, email: user.email })
})
