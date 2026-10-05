import { describe, expect, it } from 'vitest'
import { normalizeMercadonaProducts } from '../mercadona'
import { classifyProduct, matchesProductTerm } from '../productClassification'

describe('product classification evidence', () => {
  it('breaded meat/fish have no strong claim without nutrition', () => {
    for (const name of ['Pollo rebozado Crispy', 'Merluza rebozada']) {
      const [p] = normalizeMercadonaProducts([{ id: name, display_name: name }])
      expect(p.ketoScore).toBeLessThan(4)
      expect(p.classification.source).toBe('category_estimate')
      expect(p.classification.label).not.toBe('Muy keto')
    }
  })
  it('repollo is not pollo; almond drinks are drinks', () => {
    expect(matchesProductTerm('Repollo', 'pollo')).toBe(false)
    expect(normalizeMercadonaProducts([{ id: 1, display_name: 'Repollo' }])[0].category).toBe('vegetables')
    expect(normalizeMercadonaProducts([{ id: 2, display_name: 'Bebida de almendras' }])[0]).toMatchObject({ category: 'drinks', classification: { source: 'category_estimate' } })
  })
  it('catalog uses the same name rule as import for a carb staple', () => {
    const [p] = normalizeMercadonaProducts([{ id: 3, display_name: 'Pollo con arroz' }])
    expect(p.ketoScore).toBe(classifyProduct({ name: p.name, category: 'meat' }).score)
    expect(p.ketoScore).toBe(0)
  })
  it('known nutrition takes precedence over name; missing/invalid data is explicit', () => {
    expect(classifyProduct({ name: 'Pollo rebozado', category: 'meat', netCarbs: 25 })).toMatchObject({ score: 2, source: 'nutrition', evidence: 'openfoodfacts' })
    expect(classifyProduct({ name: 'Sin identificar', category: 'other' })).toMatchObject({ source: 'unknown', evidence: 'none' })
    expect(classifyProduct({ name: 'Pollo', category: 'meat', netCarbs: NaN }).source).toBe('category_estimate')
  })
})
