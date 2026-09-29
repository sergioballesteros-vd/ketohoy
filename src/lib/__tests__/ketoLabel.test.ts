import { describe, expect, it } from 'vitest'
import { ketoExplanation } from '../ketoLabel'

describe('ketoExplanation', () => {
  it('cites Open Food Facts carbs when measured', () => {
    expect(ketoExplanation(5, 'openfoodfacts', 1.2)).toMatch(/1,2 g.*Open Food Facts/)
  })
  it('calls hand-entered values reference values', () => {
    expect(ketoExplanation(5, 'manual', 0)).toMatch(/referencia/)
  })
  it('admits a category-only score is an estimate', () => {
    expect(ketoExplanation(4, 'category')).toMatch(/Estimación.*sin datos nutricionales/)
    // a source claiming data but with no number must not pretend to be measured
    expect(ketoExplanation(4, 'openfoodfacts', null)).toMatch(/Estimación/)
  })
})
