export type NutritionalData = {
  /** OFF carbohydrates_100g excludes fiber; g per 100 g (100 ml for liquids). */
  availableCarbsPer100g: number | null
  fat: number | null
  protein: number | null
  calories: number | null
  sugars: number | null
  fiber: number | null
}

/** Invalid or absent nutrition is unknown, never zero. OFF has already normalized units/basis. */
export function nutritionNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null
}

export class OpenFoodFactsError extends Error {
  constructor(readonly kind: 'timeout' | 'provider_error') {
    super(`Open Food Facts ${kind}`)
    this.name = 'OpenFoodFactsError'
  }
}

export async function fetchNutritionByEan(ean: string): Promise<NutritionalData | null> {
  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v0/product/${ean}.json`,
      { headers: { 'User-Agent': 'KetoHoy/1.0 (keto-mercadona)' }, signal: AbortSignal.timeout(10_000) }
    )
    if (!res.ok) throw new OpenFoodFactsError('provider_error')
    const data = await res.json()
    if (data.status !== 1) return null
    const n = data.product?.nutriments
    if (!n) return null
    return {
      // Contract: carbohydrates is available; carbohydrates-total includes fiber and is NOT consumed.
      // https://openfoodfacts.github.io/documentation/docs/Product-Opener/schemas/schemas/product_nutrition/
      // Never infer a convention from countries/EAN or subtract fiber again (KH-025).
      availableCarbsPer100g: nutritionNumber(n['carbohydrates_100g']),
      fat:      nutritionNumber(n['fat_100g']),
      protein:  nutritionNumber(n['proteins_100g']),
      calories: nutritionNumber(n['energy-kcal_100g']),
      sugars:   nutritionNumber(n['sugars_100g']),
      fiber:    nutritionNumber(n['fiber_100g']),
    }
  } catch (error) {
    if (error instanceof OpenFoodFactsError) throw error
    if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')) throw new OpenFoodFactsError('timeout')
    throw new OpenFoodFactsError('provider_error')
  }
}

// Available carbohydrates, already excluding fiber. No polyol subtraction; thresholds unchanged.
export function ketoScoreFromCarbs(netCarbsPer100g: number): number {
  if (netCarbsPer100g < 5)  return 5  // muy keto
  if (netCarbsPer100g < 10) return 4  // keto
  if (netCarbsPer100g < 20) return 3  // low carb
  if (netCarbsPer100g < 35) return 2  // dudoso
  if (netCarbsPer100g < 50) return 1  // poco keto
  return 0                             // no keto
}
