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
