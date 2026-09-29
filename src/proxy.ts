import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Reachable without a session: landing, login + account recovery, recipe pages (indexable content),
// and the auth API itself. Everything else redirects to /login (pages) or answers 401 (API).
const PUBLIC_EXACT = new Set(['/', '/login', '/forgot-password', '/reset-password', '/verify-email'])
const isPublic = (path: string) => PUBLIC_EXACT.has(path) || path.startsWith('/recipes/') || path.startsWith('/api/auth/')

const isDev = process.env.NODE_ENV === 'development'
// upgrade-insecure-requests would break plain-http local runs, so only ask for it when the site is https.
const upgrade = (process.env.APP_URL ?? '').startsWith('https://')

// No third-party origins: fonts are self-hosted by next/font and product/recipe photos go through
// /_next/image. A new external service in the browser needs its origin added here.
// style-src keeps 'unsafe-inline' because components use style="" attributes, which nonces can't cover.
function contentSecurityPolicy(nonce: string) {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self'",
    "img-src 'self' data: blob:",
    "connect-src 'self'",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(upgrade ? ['upgrade-insecure-requests'] : []),
  ].join('; ')
}

// Cheap session gate (cookie presence only; routes/pages validate it against the DB via
// requireUserId / getSessionUser) + per-request CSP nonce for pages.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isApi = pathname.startsWith('/api/')

  if (!isPublic(pathname) && !request.cookies.has('session')) {
    return isApi ? NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) : NextResponse.redirect(new URL('/login', request.url))
  }
  if (isApi) return NextResponse.next()

  // Next reads the nonce from the request's CSP header and stamps its own scripts with it.
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')
  const csp = contentSecurityPolicy(nonce)
  const headers = new Headers(request.headers)
  headers.set('x-nonce', nonce)
  headers.set('Content-Security-Policy', csp)
  const response = NextResponse.next({ request: { headers } })
  response.headers.set('Content-Security-Policy', csp)
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|robots.txt|sitemap.xml|.*\\.(?:jpg|jpeg|png|svg|ico|webp)$).*)'],
}
