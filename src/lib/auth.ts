import { createHash, randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import { cookies } from 'next/headers'
import { db } from '@/lib/db'
import { ApiError } from '@/lib/apiError'
import { hasAcceptedCurrentTerms } from '@/lib/terms'

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>

export const SESSION_COOKIE = 'session'
const SESSION_DAYS = 30

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16)
  return `${salt.toString('hex')}:${(await scrypt(password, salt, 64)).toString('hex')}`
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, hash] = stored.split(':')
  if (!salt || !hash) return false
  const expected = Buffer.from(hash, 'hex')
  const actual = await scrypt(password, Buffer.from(salt, 'hex'), expected.length)
  return timingSafeEqual(actual, expected)
}

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex')

export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000)
  await db.session.create({ data: { id: hashToken(token), userId, expiresAt } })
  ;(await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    // Secure cookies are dropped by browsers on plain http, so this stays opt-in:
    // COOKIE_SECURE=true in production (deploy.yml sets it), unset for local http.
    secure: process.env.COOKIE_SECURE === 'true',
    path: '/',
    expires: expiresAt,
  })
}

export async function destroySession(): Promise<void> {
  const jar = await cookies()
  const token = jar.get(SESSION_COOKIE)?.value
  if (token) await db.session.deleteMany({ where: { id: hashToken(token) } })
  jar.delete(SESSION_COOKIE)
}

/** Current user from the session cookie, or null. */
export async function getSessionUser() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  if (!token) return null
  const session = await db.session.findUnique({ where: { id: hashToken(token) }, include: { user: true } })
  if (!session || session.expiresAt < new Date()) return null
  return session.user
}

/** Current user id; throws 401 for API routes. */
export async function requireUserId(): Promise<string> {
  const user = await getSessionUser()
  if (!user) throw new ApiError('Unauthorized', 401)
  if (!hasAcceptedCurrentTerms(user)) throw new ApiError('Debes aceptar los términos vigentes para continuar', 403, 'TERMS_REQUIRED')
  return user.id
}

/**
 * First user to register inherits the pre-multiuser (userId = null) rows.
 * Interim, runs once: after that no null rows remain.
 */
export async function claimLegacyData(userId: string): Promise<void> {
  if ((await db.user.count()) !== 1) return
  const where = { userId: null }
  const data = { userId }
  await db.$transaction([
    db.userPreferences.updateMany({ where, data }),
    db.pantryItem.updateMany({ where, data }),
    db.shoppingListItem.updateMany({ where, data }),
    db.weeklyPlan.updateMany({ where, data }),
  ])
}
