import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getSessionUser, SESSION_COOKIE, verifyPassword } from '@/lib/auth'
import { ApiError, withErrorHandling } from '@/lib/apiError'
import { appendAccountDeletion, deleteAccountData } from '@/lib/accountData'

const requestSchema = z.object({ confirmEmail: z.string().trim().email().max(254), password: z.string().max(1024).optional().default('') }).strict()

export const POST = withErrorHandling(async (request: Request) => {
  const user = await getSessionUser()
  if (!user) throw new ApiError('Unauthorized', 401)

  let body: unknown
  try { body = await request.json() } catch { throw new ApiError('Invalid confirmation', 400, 'INVALID_CONFIRMATION') }
  const parsed = requestSchema.safeParse(body)
  if (!parsed.success) throw new ApiError('Invalid confirmation', 400, 'INVALID_CONFIRMATION')
  const { confirmEmail, password } = parsed.data
  if (confirmEmail.toLowerCase() !== user.email.toLowerCase() ||
    (user.passwordHash && !await verifyPassword(password, user.passwordHash)) ||
    (!user.passwordHash && password)) {
    throw new ApiError('Invalid confirmation', 400, 'INVALID_CONFIRMATION')
  }

  try {
    appendAccountDeletion(user.id, new Date())
  } catch {
    throw new ApiError('Account deletion is temporarily unavailable', 503, 'DELETION_UNAVAILABLE')
  }
  try {
    await deleteAccountData(user.id)
  } catch {
    // The durable tombstone remains so a later retry or restore cannot resurrect this account.
    throw new ApiError('Account deletion could not be completed', 500, 'DELETION_FAILED')
  }
  ;(await cookies()).delete(SESSION_COOKIE)
  return NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } })
})
