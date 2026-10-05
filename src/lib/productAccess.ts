import type { Prisma } from '@/generated/prisma/client'

/** Shared seed/Mercadona catalog plus this account's manual products only. */
export function accessibleProducts(userId: string): Prisma.ProductWhereInput {
  return { OR: [
    { source: 'mercadona', ownerId: null },
    { source: 'manual', ownerId: userId },
  ] }
}
