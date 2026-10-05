import type { Prisma } from '@/generated/prisma/client'

/** Initial presence only. Existing stock is never overwritten or implicitly incremented. */
export async function addPantryPresence(tx: Prisma.TransactionClient, input: {
  userId: string; productId: string; quantity?: number | null; unit?: string | null
}) {
  const existing = await tx.pantryItem.findFirst({
    where: { userId: input.userId, productId: input.productId }, include: { product: true }, orderBy: { createdAt: 'asc' },
  })
  if (existing) return { ...existing, outcome: 'existing' as const }
  const item = await tx.pantryItem.create({
    data: { ...input, quantity: input.quantity ?? null, unit: input.unit ?? null }, include: { product: true },
  })
  return { ...item, outcome: 'created' as const }
}
