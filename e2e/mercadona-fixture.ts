import type { Page } from '@playwright/test'

export const mercadonaProduct = {
  id: 'mercadona_99001', name: 'Salmón de prueba', brand: 'Mercadona', source: 'mercadona',
  mercadonaId: '99001', category: 'fish', ketoScore: 5,
  classification: { score: 5, label: 'Estimación por categoría', source: 'category_estimate', evidence: 'category_name' },
  unitPrice: 5.5, referencePrice: '250 g', imageUrl: null, tags: '[]',
}

export async function mockMercadonaCatalog(page: Page, includeDbState = false) {
  let quantity = 0
  let pantryAdded = false
  const pantryRow = {
    id: 'fixture-pantry-row', productId: 'fixture-product-id', quantity: null, unit: null,
    product: { id: 'fixture-product-id', name: mercadonaProduct.name, category: mercadonaProduct.category, ketoScore: mercadonaProduct.ketoScore, mercadonaId: mercadonaProduct.mercadonaId, unitPrice: mercadonaProduct.unitPrice, imageUrl: null, netCarbsPer100g: null, nutritionSource: 'category', nutritionConvention: 'unknown', fatPer100g: null, proteinPer100g: null, caloriesPer100g: null },
  }
  const shoppingRow = {
    id: 'fixture-shopping-row', name: mercadonaProduct.name, quantity: '1', purchaseQuantity: 1,
    requiredQuantity: null, requiredUnit: null, originalIngredientText: null, sourceKey: null,
    checked: false, reason: null, productId: 'fixture-product-id',
    product: { packageQuantity: null, packageUnit: null, mercadonaId: mercadonaProduct.mercadonaId, unitPrice: mercadonaProduct.unitPrice, imageUrl: null, category: mercadonaProduct.category },
  }
  await page.route('**/api/mercadona/**', route => {
    const pathname = new URL(route.request().url()).pathname
    let body
    if (pathname.endsWith('/add') && route.request().method() === 'POST') {
      const request = route.request().postDataJSON() as { addToPantry?: boolean; addToShoppingList?: boolean; quantity?: number }
      if (request.addToShoppingList) quantity += Number(request.quantity ?? 1)
      if (request.addToPantry) pantryAdded = true
      body = { product: mercadonaProduct, classification: mercadonaProduct.classification, pantryItem: request.addToPantry ? { ...pantryRow, outcome: 'created' } : null, shoppingItem: request.addToShoppingList ? shoppingRow : null }
    } else if (pathname.includes('/product/')) {
      body = mercadonaProduct
    } else {
      body = { products: [mercadonaProduct], source: 'mercadona', fetchedAt: '2026-10-06T00:00:00.000Z', completeness: 'complete', freshness: 'fresh', available: true }
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
  })
  await page.route('**/api/shopping-list', async route => {
    if (route.request().method() === 'POST') {
      quantity = Number((route.request().postDataJSON() as { purchaseQuantity?: number; quantity?: number } | undefined)?.purchaseQuantity ?? 1)
      return route.fulfill({ status: 200, json: shoppingRow })
    }
    if (route.request().method() !== 'GET') return route.continue()
    const items = includeDbState ? await (await route.fetch()).json() : []
    return route.fulfill({ status: 200, json: quantity > 0 ? [...items, shoppingRow] : items })
  })
  await page.route('**/api/shopping-list/**', async route => {
    if (route.request().method() === 'DELETE' && route.request().url().includes('fixture-shopping-row')) {
      quantity = 0
      return route.fulfill({ status: 200, json: { deleted: 1 } })
    }
    if (route.request().method() === 'POST' && route.request().url().includes('fixture-shopping-row')) {
      quantity = 1
      return route.fulfill({ status: 200, json: shoppingRow })
    }
    if (route.request().method() !== 'PATCH') return route.continue()
    quantity += Number((route.request().postDataJSON() as { delta: number }).delta)
    return route.fulfill({ status: 200, json: shoppingRow })
  })
  await page.route('**/api/pantry', async route => {
    if (route.request().method() === 'POST' && (route.request().postDataJSON() as { productId?: string }).productId === pantryRow.productId) {
      pantryAdded = true
      return route.fulfill({ status: 200, json: pantryRow })
    }
    if (route.request().method() !== 'GET') return route.continue()
    const items = includeDbState ? await (await route.fetch()).json() : []
    return route.fulfill({ status: 200, json: pantryAdded ? [...items, pantryRow] : items })
  })
  return {
    shoppingRow,
    setShoppingQuantity: (value: number) => { quantity = value },
    mergeShoppingItems: <T,>(items: T[]) => quantity > 0 ? [...items, shoppingRow] : items,
  }
}
