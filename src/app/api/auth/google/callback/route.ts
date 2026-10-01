import { NextResponse } from 'next/server'
import { timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'
import { appUrl } from '@/lib/appUrl'
import { createSession } from '@/lib/auth'
import { rateLimit } from '@/lib/rateLimit'
import { GOOGLE_COOKIE, exchangeCode, googleEnabled, resolveGoogleUser } from '@/lib/googleAuth'

const sameString = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b))

export async function GET(request: Request) {
  const fail = (error = 'google') => NextResponse.redirect(`${appUrl()}/login?error=${error}`)
  if (!googleEnabled() || !rateLimit(request, { limit: 20, windowMs: 60_000, bucket: 'auth-google' }).ok) return fail()

  const jar = await cookies()
  const [state, verifier] = (jar.get(GOOGLE_COOKIE)?.value ?? '').split('.')
  jar.delete({ name: GOOGLE_COOKIE, path: '/api/auth/google' })
  const params = new URL(request.url).searchParams
  const code = params.get('code')
  // `error` = user hit "cancel" on the consent screen; missing/forged state = CSRF or expired attempt.
  if (!code || !state || !verifier || !sameString(params.get('state') ?? '', state)) return fail()

  try {
    const user = await resolveGoogleUser(await exchangeCode(code, verifier))
    await createSession(user.id)
  } catch (err) {
    console.error('google login failed', err)
    return fail()
  }
  return NextResponse.redirect(`${appUrl()}/`)
}
