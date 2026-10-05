import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireUserId } from '@/lib/auth'
import { ApiError, withErrorHandling } from '@/lib/apiError'
import { getMonday } from '@/lib/dateUtils'
import { accessibleProducts } from '@/lib/productAccess'
import { calculateWeeklyShopping, isCompleteShoppingPlan, weeklySourcesSchema } from '@/lib/weeklyShopping'

const input = z.object({ planId: z.string().min(1) }).strict()
export const POST = withErrorHandling(async (request: Request) => {
  const userId = await requireUserId()
  const { planId } = input.parse(await request.json())
  const now = new Date(), monday = getMonday(now)
  const result = await db.$transaction(async tx => {
    // SQLite deferred transactions must acquire the writer before their snapshot reads: an
    // external writer otherwise makes the later read→write upgrade fail (SQLITE_BUSY_SNAPSHOT).
    // No value/timestamp changes; this touches only the authenticated user's requested plan.
    await tx.$executeRaw`UPDATE WeeklyPlan SET id = id WHERE id = ${planId} AND userId = ${userId}`
    const plan = await tx.weeklyPlan.findFirst({ where: { id: planId, userId, weekStart: monday },
      include: { meals: { include: { recipe: { include: { ingredients: true } } } } } })
    if (!plan) throw new ApiError('El plan ya no está disponible. Recarga esta semana y vuelve a preparar la compra.', 404)
    if (!isCompleteShoppingPlan(plan)) throw new ApiError('El plan está incompleto. Genera las 28 comidas antes de preparar la compra de esta semana.', 422, 'incomplete_plan')
    const pantry = await tx.pantryItem.findMany({ where: { userId, product: accessibleProducts(userId) }, include: { product: true }, orderBy: { id: 'asc' } })
    const snapshot = calculateWeeklyShopping(plan, pantry, userId, now)
    const existing = await tx.shoppingListItem.findMany({ where: { userId, sourceType: 'weekly-plan' } })
    const productIds = [...new Set([...snapshot.items, ...existing].flatMap(i => i.productId ? [i.productId] : []))]
    const products = await tx.product.findMany({ where: { id: { in: productIds }, ...accessibleProducts(userId) }, select: { id: true } })
    const accessible = new Set(products.map(p => p.id))
    const keys = new Set(snapshot.items.map(i => i.sourceKey))
    // Only our versioned, unambiguous pending snapshots of this week can be removed, including
    // a replaced plan whose ID no longer exists. Ambiguous legacy and purchased history survive.
    const stale = existing.filter(row => {
      if (row.checked || !row.sourceContributions) return false
      let raw: unknown
      let key: unknown
      try { raw = JSON.parse(row.sourceContributions); key = JSON.parse(row.sourceKey ?? 'null') } catch { return false }
      const metadata = weeklySourcesSchema.safeParse(raw)
      return metadata.success && metadata.data.weekStart === monday.toISOString() &&
        Array.isArray(key) && key.length === 3 && key[0] === 'weekly-plan' && key[1] === metadata.data.planId && typeof key[2] === 'string' &&
        !keys.has(row.sourceKey!)
    })
    if (stale.length) await tx.shoppingListItem.deleteMany({ where: { userId, checked: false, id: { in: stale.map(r => r.id) } } })
    let created = 0, updated = 0, unchanged = 0, historical = 0, unknown = 0
    for (const need of snapshot.items) {
      const previous = existing.find(row => row.sourceKey === need.sourceKey)
      if (previous?.checked) { historical++; continue }
      unknown += weeklySourcesSchema.parse(JSON.parse(need.sourceContributions)).sources.filter(s => s.status === 'unknown').length
      const linkedProductId = need.productId ?? previous?.productId
      const data = { ...need, productId: linkedProductId && accessible.has(linkedProductId) ? linkedProductId : null }
      if (!previous) { await tx.shoppingListItem.create({ data: { ...data, userId } }); created++; continue }
      if (Object.entries(data).every(([key, value]) => previous[key as keyof typeof previous] === value)) { unchanged++; continue }
      await tx.shoppingListItem.update({ where: { id: previous.id }, data }); updated++
    }
    return { planId, revision: snapshot.revision, status: 'complete', slots: 28, needs: created + updated + unchanged,
      created, updated, unchanged, historical, removed: stale.length, unknown }
  })
  return NextResponse.json(result)
})
