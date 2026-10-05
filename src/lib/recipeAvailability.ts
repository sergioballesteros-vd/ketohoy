import { ingredientMatchesProduct } from '@/lib/ingredientMatching'
import { convertQuantity, parseIngredientQuantity, sumCompatible } from '@/lib/quantities'

export type IngredientNeed = { name: string; productId: string | null; quantity: string | null; optional?: boolean }
export type PantryStock = {
  userId: string | null; productId: string; quantity: number | null; unit: string | null
  expiresAt?: Date | string | null
  product: { name: string }
}
export type IngredientAvailability = {
  name: string; matched: boolean; presence: boolean
  required: { quantity: number; unit: string } | null
  available: { quantity: number; unit: string } | null
  status: 'sufficient' | 'insufficient' | 'unknown' | 'missing'
  reason: 'covered' | 'shortage' | 'quantity_unknown' | 'unit_incompatible' | 'expired' | 'absent'
}

/** Shared identity/ownership/expiry rules for individual and virtual weekly stock. */
export function matchingPantryStock<T extends PantryStock>(need: IngredientNeed, pantry: T[], userId: string, now: Date) {
  const owned = pantry.filter(p => p.userId === userId)
  const exact = need.productId ? owned.filter(p => p.productId === need.productId) : []
  const matches = exact.length ? exact : owned.filter(p => ingredientMatchesProduct(need.name, p.product.name))
  // Nullable DateTime: exclude only an unambiguously elapsed timestamp.
  const usable = matches.filter(p => {
    if (!p.expiresAt) return true
    const date = new Date(p.expiresAt)
    return !Number.isFinite(date.getTime()) || date.getTime() >= now.getTime()
  })
  return { matches, usable }
}

/** Caller and helper both scope ownership. Name fallback never pools distinct product identities. */
export function ingredientAvailability(need: IngredientNeed, pantry: PantryStock[], userId: string, now = new Date()): IngredientAvailability {
  const parsed = parseIngredientQuantity(need.quantity)
  const required = parsed.requiredQuantity !== null && parsed.requiredUnit !== null
    ? { quantity: parsed.requiredQuantity, unit: parsed.requiredUnit } : null
  const { matches, usable } = matchingPantryStock(need, pantry, userId, now)
  const result: IngredientAvailability = { name: need.name, matched: matches.length > 0, presence: usable.length > 0,
    required, available: null, status: 'missing', reason: matches.length ? 'expired' : 'absent' }
  if (!usable.length) return result
  if (!required) return { ...result, status: 'unknown', reason: 'quantity_unknown' }
  const groups = new Map<string, { quantity: number; unit: string }>()
  let unknown = false, incompatible = false
  for (const row of usable) {
    if (row.quantity === null || !row.unit) { unknown = true; continue }
    const amount = convertQuantity(row.quantity, row.unit, required.unit)
    if (amount === null) { incompatible = true; continue }
    const stock = { quantity: amount, unit: required.unit }
    const previous = groups.get(row.productId)
    const sum = previous ? sumCompatible(previous, stock) : stock
    if (sum) groups.set(row.productId, sum)
    else unknown = true
  }
  const available = [...groups.values()].sort((a,b) => b.quantity - a.quantity)[0] ?? null
  if (available && available.quantity >= required.quantity) return { ...result, available, status: 'sufficient', reason: 'covered' }
  if (unknown || incompatible) return { ...result, available, status: 'unknown', reason: unknown ? 'quantity_unknown' : 'unit_incompatible' }
  return { ...result, available, status: 'insufficient', reason: 'shortage' }
}

export function recipeAvailability(ingredients: IngredientNeed[], pantry: PantryStock[], userId: string, now = new Date()) {
  const items = ingredients.filter(i => !i.optional).map(i => ingredientAvailability(i, pantry, userId, now))
  const count = (status: IngredientAvailability['status']) => items.filter(i => i.status === status).length
  const sufficient = count('sufficient'), insufficient = count('insufficient'), unknown = count('unknown'), missing = count('missing')
  return { items, total: items.length, sufficient, insufficient, unknown, missing,
    presence: items.filter(i => i.presence).length,
    needsReview: insufficient + unknown + missing,
    ready: items.length > 0 && sufficient === items.length }
}
export type RecipeAvailability = ReturnType<typeof recipeAvailability>
export const ingredientAvailabilityLabel = (a: IngredientAvailability) => ({
  sufficient: 'Disponible', insufficient: 'Falta cantidad', unknown: 'Cantidad no verificada', missing: a.reason === 'expired' ? 'Stock caducado' : 'Faltante',
})[a.status]
export function recipeAvailabilityLabel(a: Pick<RecipeAvailability, 'ready' | 'missing' | 'insufficient' | 'unknown'>): string {
  if (a.ready) return 'Cantidad suficiente'
  const parts = []
  if (a.missing) parts.push(a.missing === 1 ? 'Falta 1 ingrediente' : `Faltan ${a.missing} ingredientes`)
  if (a.insufficient) parts.push('Falta cantidad')
  if (a.unknown) parts.push('Cantidad no verificada')
  return parts.join(' · ')
}
