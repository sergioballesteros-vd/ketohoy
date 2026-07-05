import { describe, it, expect } from 'vitest'
import { formatShoppingQuantity, mergeShoppingQuantity, parseShoppingQuantity } from '../shoppingList'

describe('shoppingList quantity helpers', () => {
  it('parses invalid values as fallback', () => {
    expect(parseShoppingQuantity(undefined, 1)).toBe(1)
    expect(parseShoppingQuantity('abc', 2)).toBe(2)
  })

  it('formats clean integers and decimals', () => {
    expect(formatShoppingQuantity(2)).toBe('2')
    expect(formatShoppingQuantity(1.5)).toBe('1.5')
  })

  it('merges quantities', () => {
    expect(mergeShoppingQuantity('2', 1)).toBe('3')
    expect(mergeShoppingQuantity(null, 2)).toBe('2')
  })
})
