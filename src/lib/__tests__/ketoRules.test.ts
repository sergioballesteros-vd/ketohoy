import { describe, it, expect } from 'vitest'
import { ketoScoreByCategory, isNonKetoByName, productMatchesPreferences } from '../ketoRules'

describe('ketoScoreByCategory', () => {
  it('returns 5 for meat', () => {
    expect(ketoScoreByCategory('meat')).toBe(5)
  })

  it('returns 5 for fish', () => {
    expect(ketoScoreByCategory('fish')).toBe(5)
  })

  it('returns 5 for eggs', () => {
    expect(ketoScoreByCategory('eggs')).toBe(5)
  })

  it('returns 5 for oils', () => {
    expect(ketoScoreByCategory('oils')).toBe(5)
  })

  it('returns 4 for dairy', () => {
    expect(ketoScoreByCategory('dairy')).toBe(4)
  })

  it('returns 4 for vegetables', () => {
    expect(ketoScoreByCategory('vegetables')).toBe(4)
  })

  it('returns 4 for nuts', () => {
    expect(ketoScoreByCategory('nuts')).toBe(4)
  })

  it('returns 1 for drinks', () => {
    expect(ketoScoreByCategory('drinks')).toBe(1)
  })
})

describe('isNonKetoByName', () => {
  it('returns true for "Pan de molde"', () => {
    expect(isNonKetoByName('Pan de molde')).toBe(true)
  })

  it('returns true for "Pasta integral"', () => {
    expect(isNonKetoByName('Pasta integral')).toBe(true)
  })

  it('returns false for "Pechuga de pollo"', () => {
    expect(isNonKetoByName('Pechuga de pollo')).toBe(false)
  })

  it('returns false for "Queso curado"', () => {
    expect(isNonKetoByName('Queso curado')).toBe(false)
  })
})

describe('isNonKetoByName battery', () => {
  it.each([
    'Pan de molde', 'PAN RALLADO', 'Panes de hamburguesa', 'Pasta integral', 'Pastas frescas', 'Macarrones', 'Arroz basmati',
    'Arroz redondo', 'Patatas fritas', 'Chips de patata', 'Azúcar blanco', 'Bollería surtida', 'Cereales de desayuno',
    'Zumo de naranja', 'Refresco de cola', 'Lentejas cocidas', 'Garbanzos', 'Alubias blancas', 'Harina de trigo',
    'Galletas María', 'Bizcocho de yogur', 'Tarta de queso', 'Pizza margarita',
  ])('flags %s', name => expect(isNonKetoByName(name)).toBe(true))

  it.each([
    'Panceta ahumada', 'Champán brut', 'Campana extractora', 'Espárragos verdes', 'Pechuga de pollo',
    'Queso curado', 'Salsa tártara', 'Tartar de salmón', 'Harina de almendras', 'Harina de coco',
    'Yogur natural sin azúcar', 'Mermelada sin azúcares añadidos', 'Refresco Zero', 'Cerealista', 'Patatera',
    'Aguacate', 'Huevos camperos',
  ])('does not flag %s', name => expect(isNonKetoByName(name)).toBe(false))

  it('still flags a carb staple that only contains an exception elsewhere', () => {
    expect(isNonKetoByName('Pan de molde y harina de almendras')).toBe(true)
  })
})

describe('productMatchesPreferences', () => {
  it('returns false for fish when avoidFish is true', () => {
    expect(
      productMatchesPreferences('Salmón', 'fish', { avoidFish: true, avoidPork: false, avoidDairy: false })
    ).toBe(false)
  })

  it('returns false for bacon when avoidPork is true', () => {
    expect(
      productMatchesPreferences('Bacon', 'meat', { avoidFish: false, avoidPork: true, avoidDairy: false })
    ).toBe(false)
  })

  it('returns false for dairy when avoidDairy is true', () => {
    expect(
      productMatchesPreferences('Queso', 'dairy', { avoidFish: false, avoidPork: false, avoidDairy: true })
    ).toBe(false)
  })

  it('returns true for pollo with no restrictions', () => {
    expect(
      productMatchesPreferences('Pollo', 'meat', { avoidFish: false, avoidPork: false, avoidDairy: false })
    ).toBe(true)
  })
})

describe('productMatchesPreferences shellfish/pork variants', () => {
  const prefs = (o: object) => ({ avoidFish: false, avoidPork: false, avoidDairy: false, ...o })
  it('avoidFish excludes molluscs', () => {
    for (const n of ['Sepia a la plancha', 'Mejillones', 'Almejas', 'Pulpo']) {
      expect(productMatchesPreferences(n, 'other', prefs({ avoidFish: true }))).toBe(false)
    }
  })
  it('avoidPork excludes panceta', () => {
    expect(productMatchesPreferences('Panceta', 'other', prefs({ avoidPork: true }))).toBe(false)
  })
})
