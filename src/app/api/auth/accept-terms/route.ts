import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { ApiError, withErrorHandling } from '@/lib/apiError'
import { getSessionUser } from '@/lib/auth'
import { rateLimit } from '@/lib/rateLimit'
import { TERMS_VERSION } from '@/lib/terms'

const schema = z.object({
  acceptTerms: z.literal(true),
  confirmAdult: z.literal(true),
})

export const POST = withErrorHandling(async (request: Request) => {
  if (!rateLimit(request, { limit: 10, windowMs: 60_000 }).ok) throw new ApiError('Too many requests', 429)
  schema.parse(await request.json())
  const user = await getSessionUser()
  if (!user) throw new ApiError('Unauthorized', 401)

  const acceptedAt = new Date()
  await db.user.update({
    where: { id: user.id },
    data: { termsAcceptedAt: acceptedAt, termsVersion: TERMS_VERSION, adultConfirmedAt: acceptedAt },
  })
  return NextResponse.json({ accepted: true, termsVersion: TERMS_VERSION })
})
