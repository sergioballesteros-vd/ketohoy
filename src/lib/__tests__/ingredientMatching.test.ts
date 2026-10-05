import { expect, it } from 'vitest'
import { ingredientMatchesProduct } from '../ingredientMatching'
it.each([
  ['sal', 'salmón', false], ['leche', 'leche de almendras', false],
  ['leche de almendras', 'leche', false], ['queso rallado', 'queso curado', false],
  ['carne', 'carnes', true], ['atún', 'Atunes', true], ['huevo', 'Huevos', true],
  ['pollo', 'pechuga de pollo', true],
])('matching %s / %s = %s', (a,b,result) => expect(ingredientMatchesProduct(a,b)).toBe(result))
