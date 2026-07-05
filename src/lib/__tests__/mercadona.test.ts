import { describe, it, expect } from 'vitest'
import { productMatchesMercadonaCategory } from '../mercadona'

describe('productMatchesMercadonaCategory', () => {
  it('keeps salmon in fish', () => {
    expect(
      productMatchesMercadonaCategory(
        {
          id: 'mercadona_1',
          name: 'Salmón fresco',
          brand: 'Mercadona',
          source: 'mercadona',
          mercadonaId: '1',
          category: 'fish',
          ketoScore: 5,
          unitPrice: null,
          referencePrice: null,
          imageUrl: null,
          tags: '[]',
        },
        'fish'
      )
    ).toBe(true)
  })

  it('rejects a clearly unrelated item for fish', () => {
    expect(
      productMatchesMercadonaCategory(
        {
          id: 'mercadona_2',
          name: 'Yogur griego',
          brand: 'Mercadona',
          source: 'mercadona',
          mercadonaId: '2',
          category: 'dairy',
          ketoScore: 4,
          unitPrice: null,
          referencePrice: null,
          imageUrl: null,
          tags: '[]',
        },
        'fish'
      )
    ).toBe(false)
  })
})
