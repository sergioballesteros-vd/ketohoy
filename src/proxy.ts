import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Reachable without a session: landing, login + account recovery, recipe pages (indexable content),
// and the auth API itself. Everything else redirects to /login (pages) or answers 401 (API).
const PUBLIC_EXACT = new Set(['/', '/login', '/forgot-password', '/reset-password', '/verify-email'])
const isPublic = (path: string) => PUBLIC_EXACT.has(path) || path.startsWith('/recipes/') || path.startsWith('/api/auth/')

// Cheap gate: no session cookie on a private route → /login (pages) or 401 (API). The cookie is
// only checked for presence here; routes/pages validate it against the DB
// (requireUserId / getSessionUser).
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (isPublic(pathname) || request.cookies.has('session')) return NextResponse.next()
  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return NextResponse.redirect(new URL('/login', request.url))
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|robots.txt|sitemap.xml|.*\\.(?:jpg|jpeg|png|svg|ico|webp)$).*)'],
}
