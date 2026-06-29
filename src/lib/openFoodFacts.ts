export type NutritionalData = {
  carbs: number | null
  fat: number | null
  protein: number | null
  calories: number | null
  sugars: number | null
  fiber: number | null
}

export async function fetchNutritionByEan(ean: string): Promise<NutritionalData | null> {
  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v0/product/${ean}.json`,
      { headers: { 'User-Agent': 'KetoHoy/1.0 (keto-mercadona)' } }
    )
    if (!res.ok) return null
    const data = await res.json()
    if (data.status !== 1) return null
    const n = data.product?.nutriments
    if (!n) return null
    return {
      carbs:    n['carbohydrates_100g']  ?? null,
      fat:      n['fat_100g']            ?? null,
      protein:  n['proteins_100g']       ?? null,
      calories: n['energy-kcal_100g']    ?? null,
      sugars:   n['sugars_100g']         ?? null,
      fiber:    n['fiber_100g']          ?? null,
    }
  } catch {
    return null
  }
}

// Net carbs = carbs - fiber (conservative: use carbs if no fiber)
export function ketoScoreFromCarbs(carbsPer100g: number): number {
  if (carbsPer100g < 5)  return 5  // muy keto
  if (carbsPer100g < 10) return 4  // keto
  if (carbsPer100g < 20) return 3  // low carb
  if (carbsPer100g < 35) return 2  // dudoso
  if (carbsPer100g < 50) return 1  // poco keto
  return 0                          // no keto
}
