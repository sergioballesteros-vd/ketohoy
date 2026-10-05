import { isNonKetoByName, ketoScoreByCategory, type ProductCategory } from './ketoRules'
import { ketoLabel } from './ketoLabel'
import { ketoScoreFromCarbs } from './openFoodFacts'

export type ProductClassification = {
  score: number
  label: string
  source: 'nutrition' | 'category_estimate' | 'unknown'
  evidence: 'openfoodfacts' | 'category_name' | 'none'
}

export function classifyProduct(input: { name: string; category: ProductCategory; netCarbs?: number | null }): ProductClassification {
  if (input.netCarbs != null && Number.isFinite(input.netCarbs) && input.netCarbs >= 0) {
    const score = ketoScoreFromCarbs(input.netCarbs)
    return { score, label: ketoLabel(score).label, source: 'nutrition', evidence: 'openfoodfacts' }
  }
  if (input.category === 'other') return { score: 0, label: 'Sin datos nutricionales', source: 'unknown', evidence: 'none' }
  const score = isNonKetoByName(input.name) ? 0 : /\b(rebozad[oa]s?|empanad[oa]s?|crispy)\b/.test(normalizeProductText(input.name)) ? 2 : ketoScoreByCategory(input.category)
  return { score, label: 'Estimación por categoría', source: 'category_estimate', evidence: 'category_name' }
}

export const normalizeProductText = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

/** Whole tokens, including simple Spanish plurals; never pollo inside repollo. */
export function matchesProductTerm(text: string, term: string): boolean {
  const words = normalizeProductText(text).match(/[a-z0-9]+/g) ?? []
  const terms = normalizeProductText(term).match(/[a-z0-9]+/g) ?? []
  return terms.length > 0 && words.some((_, i) => terms.every((t, j) => {
    const word = words[i + j]
    return word === t || word === `${t}s` || word === `${t}es` || (t === 'nuez' && word === 'nueces')
  }))
}
