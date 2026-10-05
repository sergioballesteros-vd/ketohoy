import { z } from 'zod'

export const positiveQuantity = z.number().finite().positive()
export const purchaseQuantityInput = z.union([positiveQuantity, z.string().trim().min(1).transform(Number).pipe(positiveQuantity)])
export const quantityPair = z.object({
  quantity: positiveQuantity.nullable(),
  unit: z.string().trim().min(1).nullable(),
}).refine(p => (p.quantity === null) === (p.unit === null), 'Quantity and unit must both be specified')
export const packageFields = {
  packageQuantity: positiveQuantity.nullable().optional(),
  packageUnit: z.string().trim().min(1).nullable().optional(),
}
export const validPackagePair = (p: { packageQuantity?: number | null; packageUnit?: string | null }) =>
  (p.packageQuantity == null) === (p.packageUnit == null)

const aliases: Record<string, string> = {
  g: 'g', kg: 'kg', ml: 'ml', l: 'l',
  ud: 'unidad', uds: 'unidad', unidad: 'unidad', unidades: 'unidad',
  cda: 'cda', cdas: 'cda', cucharada: 'cda', cucharadas: 'cda',
  cdta: 'cdta', cucharadita: 'cdta', cucharaditas: 'cdta',
  lata: 'lata', latas: 'lata', loncha: 'loncha', lonchas: 'loncha',
  hoja: 'hoja', hojas: 'hoja', paquete: 'paquete', paquetes: 'paquete',
}
export function normalizeUnit(unit: string): string {
  const value = unit.trim().toLowerCase()
  return aliases[value] ?? value
}
function basis(unit: string): [string, number] {
  const u = normalizeUnit(unit)
  if (u === 'kg') return ['g', 1000]
  if (u === 'l') return ['ml', 1000]
  return [u, 1]
}
export function convertQuantity(quantity: number, from: string, to: string): number | null {
  if (!positiveQuantity.safeParse(quantity).success || !from.trim() || !to.trim()) return null
  const [a, af] = basis(from), [b, bf] = basis(to)
  if (a !== b) return null
  const result = quantity * af / bf
  return Number.isFinite(result) && result > 0 ? result : null
}
export function sumCompatible(a: { quantity: number; unit: string }, b: { quantity: number; unit: string }) {
  if (!positiveQuantity.safeParse(a.quantity).success) return null
  const converted = convertQuantity(b.quantity, b.unit, a.unit)
  const sum = converted === null ? NaN : a.quantity + converted
  return positiveQuantity.safeParse(sum).success ? { quantity: sum, unit: a.unit } : null
}
/** Exact simple quantity expressions only; arbitrary text remains unknown and is preserved by caller. */
export function parseIngredientQuantity(text: string | null) {
  const match = text?.trim().match(/^(\d+(?:[.,]\d+)?)(?:\/(\d+))?\s*([a-záéíóú]+)$/i)
  if (!match || !aliases[match[3].toLowerCase()]) return { requiredQuantity: null, requiredUnit: null }
  const quantity = Number(match[1].replace(',', '.')) / (match[2] ? Number(match[2]) : 1)
  return positiveQuantity.safeParse(quantity).success
    ? { requiredQuantity: quantity, requiredUnit: normalizeUnit(match[3]) }
    : { requiredQuantity: null, requiredUnit: null }
}
