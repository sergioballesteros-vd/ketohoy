import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireUserId } from '@/lib/auth'
import { ApiError, withErrorHandling } from '@/lib/apiError'
import { formatShoppingQuantity } from '@/lib/shoppingList'
import { positiveQuantity, purchaseQuantityInput } from '@/lib/quantities'
import { accessibleProducts } from '@/lib/productAccess'

const quantityPatchSchema = z.object({
  delta: z.union([z.number().finite(), z.string().trim().min(1).transform(Number).pipe(z.number().finite())]).refine(n => n !== 0).optional(),
  purchaseQuantity: purchaseQuantityInput.optional(),
  productId: z.string().min(1).optional(),
}).strict().refine(p => !(p.delta !== undefined && p.purchaseQuantity !== undefined), 'Use delta or purchaseQuantity')

export const PATCH = withErrorHandling(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params
    const userId = await requireUserId()
    const input = quantityPatchSchema.parse(await request.json())
    const result = await db.$transaction(async tx => {
      const item = await tx.shoppingListItem.findFirst({ where: { id, userId } })
      if (!item) throw new ApiError('Not found', 404)
      if (item.checked) throw new ApiError('Un-check the item before changing its purchase', 409)
      if (input.productId && !await tx.product.findFirst({ where: { id: input.productId, ...accessibleProducts(userId) } })) throw new ApiError('Product not found', 404)
      // Association alone leaves every culinary quantity and purchase choice intact.
      const next = input.purchaseQuantity ?? (input.productId && input.delta === undefined
        ? item.purchaseQuantity : (item.purchaseQuantity ?? 0) + (input.delta ?? 1))
      if (next !== null && next <= 0) {
        await tx.shoppingListItem.delete({ where: { id } })
        return { deleted: true }
      }
      return tx.shoppingListItem.update({ where: { id }, data: {
        ...(input.productId && { productId: input.productId }),
        purchaseQuantity: next === null ? null : positiveQuantity.parse(next),
        quantity: next === null ? item.quantity : formatShoppingQuantity(next),
      } })
    })
    return NextResponse.json(result)
  }
)
