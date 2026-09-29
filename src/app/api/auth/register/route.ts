import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { ApiError, withErrorHandling } from '@/lib/apiError'
import { claimLegacyData, createSession, hashPassword } from '@/lib/auth'
import { sendVerificationEmail } from '@/lib/authMail'
import { rateLimit } from '@/lib/rateLimit'

const schema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres').max(200),
})

export const POST = withErrorHandling(async (request: Request) => {
  if (!rateLimit(request, { limit: 10, windowMs: 60_000 }).ok) throw new ApiError('Too many requests', 429)
  const { email, password } = schema.parse(await request.json())

  if (await db.user.findUnique({ where: { email } })) throw new ApiError('Ese email ya está registrado', 409)
  const user = await db.user.create({ data: { email, passwordHash: await hashPassword(password) } })
  await claimLegacyData(user.id)
  await createSession(user.id)
  // Best effort: an unverified email never blocks the account; the user can resend from Preferences.
  await sendVerificationEmail(user).catch(err => console.error('verification email failed', err))
  return NextResponse.json({ id: user.id, email: user.email }, { status: 201 })
})
