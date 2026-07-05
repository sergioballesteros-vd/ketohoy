import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getMercadonaProduct } from '@/lib/mercadona'
import { fetchNutritionByEan, ketoScoreFromCarbs } from '@/lib/openFoodFacts'
import { ketoScoreByCategory } from '@/lib/ketoRules'
import type { ProductCategory } from '@/lib/ketoRules'
import { formatShoppingQuantity, mergeShoppingQuantity, parseShoppingQuantity } from '@/lib/shoppingList'

// POST /api/mercadona/add
// Body: { mercadonaId: string, addToPantry?: boolean, addToShoppingList?: boolean }
// 1. Fetch Mercadona product detail → EAN, ingredients, allergens
// 2. Fetch Open Food Facts → real macros
// 3. Calculate keto score from carbs (fallback to category)
// 4. Upsert product in DB
// 5. Optionally add to pantry or shopping list
export async function POST(request: Request) {
  const body = await request.json()
  const { mercadonaId, addToPantry = false, addToShoppingList = false, quantity } = body

  if (!mercadonaId) {
    return NextResponse.json({ error: 'mercadonaId required' }, { status: 400 })
  }

  // 1. Get full Mercadona product detail
  const merc = await getMercadonaProduct(String(mercadonaId))
  if (!merc) {
    return NextResponse.json({ error: 'Mercadona product not found' }, { status: 404 })
  }

  // 2. Fetch Open Food Facts nutrition if EAN available
  let carbs: number | null = null
  let fat: number | null = null
  let protein: number | null = null
  let calories: number | null = null

  let fiber: number | null = null

  if (merc.ean) {
    const nutrition = await fetchNutritionByEan(merc.ean)
    if (nutrition) {
      carbs    = nutrition.carbs
      fat      = nutrition.fat
      protein  = nutrition.protein
      calories = nutrition.calories
      fiber    = nutrition.fiber
    }
  }

  // 3. Score: real net carbs (carbs - fiber) if available, else category-based
  const netCarbs = carbs != null
    ? Math.max(0, carbs - (fiber ?? 0))
    : null
  const ketoScore = netCarbs != null
    ? ketoScoreFromCarbs(netCarbs)
    : ketoScoreByCategory(merc.category as ProductCategory)

  // 4. Upsert product
  let product = await db.product.findFirst({ where: { mercadonaId: String(mercadonaId) } })
  if (product) {
    product = await db.product.update({
      where: { id: product.id },
      data: {
        ketoScore,
        netCarbsPer100g: carbs,
        fatPer100g: fat,
        proteinPer100g: protein,
        caloriesPer100g: calories,
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
        netCarbsPer100g: carbs,
        fatPer100g: fat,
        proteinPer100g: protein,
        caloriesPer100g: calories,
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
    const existing = await db.pantryItem.findFirst({ where: { productId: product.id } })
    if (!existing) {
      pantryItem = await db.pantryItem.create({
        data: { productId: product.id },
        include: { product: true },
      })
    } else {
      pantryItem = existing
    }
  }

  // 5b. Add to shopping list
  if (addToShoppingList) {
    const quantityValue = parseShoppingQuantity(quantity, 1)
    const existing = await db.shoppingListItem.findFirst({
      where: { productId: product.id },
      include: { product: true },
    })
    if (existing) {
      shoppingItem = await db.shoppingListItem.update({
        where: { id: existing.id },
        data: {
          quantity: mergeShoppingQuantity(existing.quantity, quantityValue),
        },
        include: { product: true },
      })
    } else {
      shoppingItem = await db.shoppingListItem.create({
        data: {
          name: product.name,
          productId: product.id,
          quantity: formatShoppingQuantity(quantityValue),
        },
        include: { product: true },
      })
    }
  }

  return NextResponse.json({
    product,
    pantryItem,
    shoppingItem,
    nutrition: { carbs, fat, protein, calories },
    ketoScore,
    source: carbs != null ? 'openfoodfacts' : 'category',
    ean: merc.ean ?? null,
  })
}
