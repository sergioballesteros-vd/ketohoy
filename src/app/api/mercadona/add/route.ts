import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireUserId } from '@/lib/auth'
import { ApiError, withErrorHandling } from '@/lib/apiError'
import { getMercadonaProduct } from '@/lib/mercadona'
import { formatShoppingQuantity } from '@/lib/shoppingList'
import { positiveQuantity, purchaseQuantityInput } from '@/lib/quantities'
import { addPantryPresence } from '@/lib/pantryAddition'
import { rateLimit } from '@/lib/rateLimit'

const addMercadonaProductSchema = z.object({
  mercadonaId: z.union([z.string(), z.number()]),
  addToPantry: z.boolean().optional().default(false),
  addToShoppingList: z.boolean().optional().default(false),
  quantity: purchaseQuantityInput.optional(),
})

// POST /api/mercadona/add
// Body: { mercadonaId: string, addToPantry?: boolean, addToShoppingList?: boolean }
// 1. Fetch Mercadona product detail → EAN, ingredients, allergens
// 2. Reuse canonical nutrition and classification from the catalog resolver
// 4. Upsert product in DB
// 5. Optionally add to pantry or shopping list
export const POST = withErrorHandling(async (request: Request) => {
  const rl = rateLimit(request, { limit: 30, windowMs: 60_000 })
  if (!rl.ok) throw new ApiError('Too many requests', 429)

  const userId = await requireUserId()
  const { mercadonaId, addToPantry, addToShoppingList, quantity } = addMercadonaProductSchema.parse(
    await request.json()
  )

  // 1. Get full Mercadona product detail
  const merc = await getMercadonaProduct(String(mercadonaId))
  if (!merc) {
    throw new ApiError('Mercadona product not found', 404)
  }

  // Catalog, detail and import consume the same canonical classification/evidence.
  const { classification } = merc
  const ketoScore = classification.score
  const { availableCarbsPer100g: carbs = null, fat = null, protein = null, calories = null, fiber = null } = merc.nutrition ?? {}
  const netCarbs = merc.netCarbsPer100g ?? null
  const nutritionFields = {
    nutritionConvention: netCarbs !== null ? 'available_excluding_fiber' : 'unknown',
    netCarbsPer100g: netCarbs,
    carbsPer100g: carbs,
    fiberPer100g: fiber,
    fatPer100g: fat,
    proteinPer100g: protein,
    caloriesPer100g: calories,
    nutritionSource: classification.source === 'nutrition' ? 'openfoodfacts' : classification.source === 'category_estimate' ? 'category' : 'unknown',
  }
  let product = await db.product.findUnique({ where: { mercadonaId: String(mercadonaId) } })
  if (product && (product.source !== 'mercadona' || product.ownerId !== null)) {
    throw new ApiError('Product catalog conflict', 409)
  }
  if (product) {
    product = await db.product.update({
      where: { id: product.id },
      data: {
        name: merc.name,
        category: merc.category,
        ketoScore,
        ...nutritionFields,
        unitPrice: merc.unitPrice,
        imageUrl: merc.imageUrl,
      },
    })
  } else {
    product = await db.product.create({
      data: {
        name: merc.name,
        brand: merc.brand,
        source: 'mercadona',
        mercadonaId: String(mercadonaId),
        category: merc.category,
        ketoScore,
        ...nutritionFields,
        unitPrice: merc.unitPrice,
        imageUrl: merc.imageUrl,
        tags: '[]',
      },
    })
  }

  let pantryItem = null
  let shoppingItem = null

  // 5a. Add to pantry
  if (addToPantry) {
    const productId = product.id
    pantryItem = await db.$transaction(tx => addPantryPresence(tx, { userId, productId }))
  }

  // 5b. Add to shopping list
  if (addToShoppingList) {
    const count = quantity ?? 1
    shoppingItem = await db.$transaction(async tx => {
      const existing = await tx.shoppingListItem.findFirst({
        where: { userId, productId: product.id, checked: false, sourceType: 'manual', requiredQuantity: null, originalIngredientText: null },
      })
      if (existing) {
        const next = positiveQuantity.parse((existing.purchaseQuantity ?? 0) + count)
        return tx.shoppingListItem.update({ where: { id: existing.id }, data: {
          purchaseQuantity: next, quantity: formatShoppingQuantity(next),
        }, include: { product: true } })
      }
      return tx.shoppingListItem.create({ data: {
        userId, name: product.name, productId: product.id, sourceType: 'manual',
        purchaseQuantity: count, quantity: formatShoppingQuantity(count),
      }, include: { product: true } })
    })
  }

  return NextResponse.json({
    product: { ...product, classification },
    classification,
    pantryItem,
    shoppingItem,
    nutrition: { carbs, fat, protein, calories },
    ketoScore,
    source: nutritionFields.nutritionSource,
    ean: merc.ean ?? null,
  })
})
