import { NextResponse } from 'next/server'
import { appUrl } from '@/lib/appUrl'
import { rateLimit } from '@/lib/rateLimit'
import { GOOGLE_COOKIE, googleEnabled, startGoogleLogin } from '@/lib/googleAuth'

export async function GET(request: Request) {
  if (!googleEnabled() || !rateLimit(request, { limit: 20, windowMs: 60_000, bucket: 'auth-google' }).ok) {
    return NextResponse.redirect(`${appUrl()}/login?error=google`)
  }
  const { cookie, url } = startGoogleLogin()
  const response = NextResponse.redirect(url)
  // lax: the callback is a top-level GET from accounts.google.com, which lax cookies accompany.
  response.cookies.set(GOOGLE_COOKIE, cookie, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.COOKIE_SECURE === 'true',
    path: '/api/auth/google',
    maxAge: 600,
  })
  return response
}
