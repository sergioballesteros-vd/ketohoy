import { createHash, randomBytes } from 'node:crypto'
import { db } from '@/lib/db'
import { ApiError } from '@/lib/apiError'
import { claimLegacyData } from '@/lib/auth'
import { appUrl } from '@/lib/appUrl'

export const GOOGLE_COOKIE = 'google_oauth'
export const googleEnabled = () => !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET
const redirectUri = () => `${appUrl()}/api/auth/google/callback`

/** Fresh CSRF `state` + PKCE pair, and the Google consent URL that carries them. */
export function startGoogleLogin() {
  const state = randomBytes(16).toString('hex')
  const verifier = randomBytes(32).toString('base64url')
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri(),
    response_type: 'code',
    scope: 'openid email',
    state,
    code_challenge: createHash('sha256').update(verifier).digest('base64url'),
    code_challenge_method: 'S256',
    prompt: 'select_account',
  })
  return { cookie: `${state}.${verifier}`, url: `https://accounts.google.com/o/oauth2/v2/auth?${params}` }
}

export type GoogleProfile = { sub: string; email: string; emailVerified: boolean }

/** Trades the callback `code` for the user's identity. The id_token comes straight from Google's token endpoint over TLS, so (per OIDC) its signature needn't be re-checked. */
export async function exchangeCode(code: string, verifier: string): Promise<GoogleProfile> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri(),
      grant_type: 'authorization_code',
      code_verifier: verifier,
    }),
  })
  if (!res.ok) throw new ApiError('Google rechazó el código', 400)
  const { id_token } = (await res.json()) as { id_token?: string }
  const claims = JSON.parse(Buffer.from(id_token?.split('.')[1] ?? '', 'base64url').toString() || '{}')
  if (claims.aud !== process.env.GOOGLE_CLIENT_ID || typeof claims.sub !== 'string' || typeof claims.email !== 'string') {
    throw new ApiError('Respuesta de Google no válida', 400)
  }
  return { sub: claims.sub, email: claims.email.toLowerCase(), emailVerified: claims.email_verified === true }
}

/** Finds, links or creates the user for a Google identity. */
export async function resolveGoogleUser({ sub, email, emailVerified }: GoogleProfile) {
  if (!emailVerified) throw new ApiError('Tu email de Google no está verificado', 400)

  const bySub = await db.user.findUnique({ where: { googleId: sub } })
  if (bySub) return bySub

  const byEmail = await db.user.findUnique({ where: { email } })
  if (!byEmail) {
    const user = await db.user.create({ data: { email, googleId: sub, emailVerifiedAt: new Date() } })
    await claimLegacyData(user.id)
    return user
  }

  // Same email, password account: link it. If that email was never verified, whoever registered it may
  // not own the mailbox (pre-hijack), so Google becomes the only way in: drop their password and sessions.
  const unverified = !byEmail.emailVerifiedAt
  const [user] = await db.$transaction([
    db.user.update({
      where: { id: byEmail.id },
      data: { googleId: sub, emailVerifiedAt: byEmail.emailVerifiedAt ?? new Date(), ...(unverified && { passwordHash: null }) },
    }),
    ...(unverified ? [db.session.deleteMany({ where: { userId: byEmail.id } })] : []),
  ])
  return user
}
