import { describe, it, expect } from 'vitest'
import { DEMO_MERCADONA_PRODUCTS, productMatchesMercadonaCategory, searchCatalog, normalizeMercadonaProducts } from '../mercadona'

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
          classification: { score: 5, label: 'Estimación por categoría', source: 'category_estimate', evidence: 'category_name' },
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
          classification: { score: 4, label: 'Estimación por categoría', source: 'category_estimate', evidence: 'category_name' },
          unitPrice: null,
          referencePrice: null,
          imageUrl: null,
          tags: '[]',
        },
        'fish'
      )
    ).toBe(false)
  })

  it('keeps demo keto scores within the 0-5 scale', () => {
    expect(DEMO_MERCADONA_PRODUCTS.every(product => product.ketoScore >= 0 && product.ketoScore <= 5)).toBe(true)
  })
})

describe('searchCatalog', () => {
  const hit = (id: number, name: string, sub = 'Otros') => ({
    id,
    display_name: name,
    categories: [{ name: 'Top', categories: [{ name: sub }] }],
  })
  const hits = [
    hit(1, 'Huevos camperos M', 'Huevos'),
    hit(2, 'Tortilla de huevo pasteurizado', 'Platos'),
    hit(3, 'Aceite de oliva virgen extra', 'Aceite de oliva'),
    hit(4, 'Limones', 'Fruta'),
    hit(5, 'Mayonesa con huevo', 'Salsas'),
  ]

  it('matches plural/singular and ranks names starting with the term first', () => {
    expect(searchCatalog(hits, 'huevo', 10).map(h => h.id)).toEqual([1, 2, 5])
  })
  it('requires every word and ignores accents/case', () => {
    expect(searchCatalog(hits, 'ACEITE oliva', 10).map(h => h.id)).toEqual([3])
    expect(searchCatalog(hits, 'limon', 10).map(h => h.id)).toEqual([4])
  })
  it('respects the limit and returns nothing for an empty query', () => {
    expect(searchCatalog(hits, 'huevo', 1)).toHaveLength(1)
    expect(searchCatalog(hits, '  ', 10)).toEqual([])
  })
})

describe('normalizeMercadonaProducts', () => {
  it('formats the reference price with 2 decimals and a decimal comma', () => {
    const [p] = normalizeMercadonaProducts([
      { id: 1, display_name: 'Pollo entero', price_instructions: { unit_price: '6.65', reference_price: '3.500', reference_format: 'kg' } },
    ])
    expect(p.referencePrice).toBe('3,50 €/kg')
    expect(p.unitPrice).toBe(6.65)
  })
})
