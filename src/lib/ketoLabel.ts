// ketoScore (0-5) is a per-category heuristic (see ketoScoreByCategory), refined with real
// carbs from Open Food Facts when available. It is NOT a nutritional guarantee.
export type KetoTone = 'good' | 'ok' | 'bad'

export function ketoLabel(score: number): { label: string; tone: KetoTone; hint: string } {
  if (score >= 5) return { label: 'Muy keto', tone: 'good', hint: 'Puntuación keto 5 de 5' }
  if (score >= 4) return { label: 'Keto', tone: 'good', hint: 'Puntuación keto 4 de 5' }
  if (score >= 3) return { label: 'Low carb', tone: 'ok', hint: 'Puntuación keto 3 de 5: con moderación' }
  if (score >= 2) return { label: 'Dudoso', tone: 'ok', hint: `Puntuación keto ${score} de 5: puede llevar azúcares ocultos` }
  return { label: 'No keto', tone: 'bad', hint: `Puntuación keto ${score} de 5: alto en carbohidratos` }
}

export type NutritionSource = 'openfoodfacts' | 'manual' | 'category' | string

/** Legacy OFF macros retain their origin, but unknown convention cannot support a nutritional claim. */
export function persistedNutritionSource(product: { nutritionSource: string; nutritionConvention?: string }): string {
  return product.nutritionSource === 'openfoodfacts' && product.nutritionConvention !== 'available_excluding_fiber'
    ? 'unknown' : product.nutritionSource
}

/**
 * Plain-language explanation of where a product's keto score comes from.
 * Honest about the estimate: without nutrition data the score only reflects the product category.
 */
export function ketoExplanation(score: number, source: NutritionSource, netCarbs?: number | null): string {
  const scale = `Puntuación ${score} de 5.`
  if (source === 'openfoodfacts' && netCarbs != null)
    return `${scale} Calculada con los carbohidratos disponibles, sin fibra (${netCarbs.toLocaleString('es-ES', { maximumFractionDigits: 1 })} g por 100 g/ml) de Open Food Facts. Los datos pueden tener errores; revisa la etiqueta.`
  if (source === 'manual' && netCarbs != null)
    return `${scale} Valor de referencia (${netCarbs.toLocaleString('es-ES', { maximumFractionDigits: 1 })} g de carbohidratos netos por 100 g), no medido en este producto concreto.`
  if (source === 'unknown') return 'Sin datos nutricionales suficientes para clasificar este producto. Revisa la etiqueta.'
  return `${scale} Estimación según el tipo de producto, sin datos nutricionales: puede haber azúcares o harinas añadidos. Revisa la etiqueta.`
}
