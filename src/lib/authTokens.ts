import { createHash, randomBytes } from 'node:crypto'
import { db } from '@/lib/db'

export type TokenType = 'reset' | 'verify'

const TTL_MS: Record<TokenType, number> = { reset: 60 * 60_000, verify: 24 * 60 * 60_000 }
const hash = (token: string) => createHash('sha256').update(token).digest('hex')

/** Issues a one-time token (stored hashed). Older tokens of the same type for the user are revoked. */
export async function issueToken(userId: string, type: TokenType): Promise<string> {
  const token = randomBytes(32).toString('hex')
  await db.$transaction([
    db.authToken.deleteMany({ where: { userId, type } }),
    db.authToken.create({ data: { id: hash(token), userId, type, expiresAt: new Date(Date.now() + TTL_MS[type]) } }),
  ])
  return token
}

/** Atomically burns a valid token and returns its user id, or null (unknown, used or expired). */
export async function consumeToken(token: string, type: TokenType): Promise<string | null> {
  const id = hash(token)
  const now = new Date()
  const { count } = await db.authToken.updateMany({
    where: { id, type, usedAt: null, expiresAt: { gt: now } },
    data: { usedAt: now },
  })
  if (count !== 1) return null
  return (await db.authToken.findUnique({ where: { id }, select: { userId: true } }))?.userId ?? null
}
