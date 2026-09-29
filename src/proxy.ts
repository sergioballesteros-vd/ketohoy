import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Cheap gate: no session cookie → /login (pages) or 401 (API). The cookie is
// only checked for presence here; routes/pages validate it against the DB
// (requireUserId / getSessionUser).
export function proxy(request: NextRequest) {
  if (request.cookies.has('session')) return NextResponse.next()
  if (request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return NextResponse.redirect(new URL('/login', request.url))
}

export const config = {
  matcher: ['/((?!login|api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:jpg|jpeg|png|svg|ico|webp)$).*)'],
}
