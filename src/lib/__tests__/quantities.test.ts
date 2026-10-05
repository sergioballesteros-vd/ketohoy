import { expect, it } from 'vitest'
import { convertQuantity, sumCompatible, parseIngredientQuantity, purchaseQuantityInput, quantityPair } from '../quantities'
it('supports only evidenced expressions and preserves unknown precision', () => {
  expect(parseIngredientQuantity('200g')).toEqual({ requiredQuantity: 200, requiredUnit: 'g' })
  expect(parseIngredientQuantity('1/2 ud')).toEqual({ requiredQuantity: .5, requiredUnit: 'unidad' })
  expect(parseIngredientQuantity('2 cdas')).toEqual({ requiredQuantity: 2, requiredUnit: 'cda' })
  for (const s of [null, '2', 'al gusto', '200g de pollo', '0 g', '1/0 ud', '-2 kg']) expect(parseIngredientQuantity(s)).toEqual({ requiredQuantity: null, requiredUnit: null })
})
it('adds compatible quantities, never fabricates cross-dimension equivalence', () => {
  expect(sumCompatible({ quantity: 500, unit: 'g' }, { quantity: 1, unit: 'kg' })).toEqual({ quantity: 1500, unit: 'g' })
  for (const [a,b] of [['g','unidad'], ['cda','ml'], ['paquete','g'], ['lata','g'], ['ml','g']]) expect(sumCompatible({ quantity: 2, unit: a }, { quantity: 300, unit: b })).toBeNull()
})
it('finite positive invariants and reversible conversions across magnitudes', () => {
  for (const q of [.0001,.1,1,2.5,500,100000]) for (const [a,b] of [['g','kg'],['ml','L']]) {
    const converted = convertQuantity(q,a,b)!
    expect(convertQuantity(converted,b,a)).toBeCloseTo(q, 8)
  }
  for (const q of [0,-1,Infinity,NaN]) expect(convertQuantity(q,'g','kg')).toBeNull()
  for (const q of [-1,0,'','NaN','Infinity','-2',{},true]) expect(purchaseQuantityInput.safeParse(q).success).toBe(false)
  expect(quantityPair.safeParse({ quantity: 2, unit: '' }).success).toBe(false)
})
