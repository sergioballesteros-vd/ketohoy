import { NextResponse } from 'next/server'
import { timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'
import { appUrl } from '@/lib/appUrl'
import { createSession } from '@/lib/auth'
import { hasAcceptedCurrentTerms } from '@/lib/terms'
import { rateLimit } from '@/lib/rateLimit'
import { GOOGLE_COOKIE, exchangeCode, googleEnabled, resolveGoogleUser } from '@/lib/googleAuth'
import { normalizeInternalReturnTo } from '@/lib/returnTo'

const sameString = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b))

export async function GET(request: Request) {
  const jar = await cookies()
  const [state, verifier, encodedReturnTo] = (jar.get(GOOGLE_COOKIE)?.value ?? '').split('.')
  const returnTo = normalizeInternalReturnTo(encodedReturnTo ? Buffer.from(encodedReturnTo, 'base64url').toString() : undefined)
  const loginUrl = (error = 'google') => `${appUrl()}/login?${new URLSearchParams({ error, returnTo })}`
  const fail = (error = 'google') => NextResponse.redirect(loginUrl(error))
  if (!googleEnabled() || !rateLimit(request, { limit: 20, windowMs: 60_000, bucket: 'auth-google' }).ok) return fail()

  jar.delete({ name: GOOGLE_COOKIE, path: '/api/auth/google' })
  const params = new URL(request.url).searchParams
  const code = params.get('code')
  // `error` = user hit "cancel" on the consent screen; missing/forged state = CSRF or expired attempt.
  if (!code || !state || !verifier || !sameString(params.get('state') ?? '', state)) return fail()

  let termsAccepted = false
  try {
    const user = await resolveGoogleUser(await exchangeCode(code, verifier))
    termsAccepted = hasAcceptedCurrentTerms(user)
    await createSession(user.id)
  } catch (err) {
    console.error('google login failed', err instanceof Error && err.message.includes('tiempo') ? 'timeout' : 'provider_or_auth_error')
    return fail()
  }
  return NextResponse.redirect(termsAccepted ? `${appUrl()}${returnTo}` : `${appUrl()}/accept-terms?${new URLSearchParams({ returnTo })}`)
}
