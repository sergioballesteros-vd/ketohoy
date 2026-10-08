import { describe, expect, it } from 'vitest'
import { filterPantryItems, normalizePantrySearch } from '../pantrySearch'

const items = [
  { id: 'chicken', product: { name: 'Pechuga de pollo' } },
  { id: 'tuna', product: { name: 'Atún en lata' } },
]

describe('pantry search', () => {
  it('normalizes accents, case, and surrounding whitespace', () => {
    expect(normalizePantrySearch('  ATÚN  ')).toBe('atun')
  })

  it('filters locally by case-insensitive normalized substring and returns all items for an empty query', () => {
    expect(filterPantryItems(items, '  POLLO ')).toEqual([items[0]])
    expect(filterPantryItems(items, 'atun')).toEqual([items[1]])
    expect(filterPantryItems(items, '   ')).toBe(items)
    expect(filterPantryItems(items, 'sin coincidencias')).toEqual([])
  })
})
