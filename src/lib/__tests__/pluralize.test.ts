import { describe, it, expect } from 'vitest'
import { pluralize, productosCount } from '../pluralize'

describe('pluralize', () => {
  it('singular for 1', () => expect(pluralize(1, 'producto', 'productos')).toBe('producto'))
  it('plural for 0 and >1', () => {
    expect(pluralize(0, 'producto', 'productos')).toBe('productos')
    expect(pluralize(2, 'producto', 'productos')).toBe('productos')
  })
})

describe('productosCount', () => {
  it('agrees with count (regression: "1 productos")', () => {
    expect(productosCount(1)).toBe('1 producto')
    expect(productosCount(2)).toBe('2 productos')
    expect(productosCount(0)).toBe('0 productos')
  })
})
