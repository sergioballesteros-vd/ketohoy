import { createHash } from 'node:crypto'
import { ingredientSourceKey } from './shoppingSources'
import { z } from 'zod'
import { convertQuantity, parseIngredientQuantity, sumCompatible } from './quantities'
import { matchingPantryStock, type IngredientNeed, type PantryStock } from './recipeAvailability'

export const WEEKLY_MEAL_ORDER = ['breakfast', 'lunch', 'snack', 'dinner']
type Ingredient = IngredientNeed & { id: string }
export type ShoppingPlan = {
  id: string; weekStart: Date
  meals: { id: string; dayOfWeek: number; mealType: string; recipeId: string | null;
    recipe: { id: string; title: string; ingredients: Ingredient[] } | null }[]
}
const sourceSchema = z.object({
  sourceKey: z.string(), planId: z.string(), slotId: z.string(), recipeId: z.string(), ingredientId: z.string(),
  name: z.string(), originalIngredientText: z.string().nullable(),
  requiredQuantity: z.number().positive().finite().nullable(), requiredUnit: z.string().nullable(),
  coveredQuantity: z.number().nonnegative().finite(), missingQuantity: z.number().nonnegative().finite().nullable(),
  status: z.enum(['covered', 'required', 'unknown']),
})
export const weeklySourcesSchema = z.object({
  version: z.literal(1), planId: z.string(), weekStart: z.string(), sources: z.array(sourceSchema).min(1),
})
type Source = z.infer<typeof sourceSchema>
export type WeeklyNeed = {
  name: string; productId: string | null; requiredQuantity: number | null; requiredUnit: string | null
  originalIngredientText: string | null; sourceType: 'weekly-plan'; sourceKey: string
  sourceContributions: string; reason: string
}
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex')
const compare = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0

export function isCompleteShoppingPlan(plan: ShoppingPlan) {
  return plan.meals.length === 28 && Array.from({ length: 7 }, (_, day) =>
    WEEKLY_MEAL_ORDER.every(type => plan.meals.filter(m => m.dayOfWeek === day && m.mealType === type && m.recipe).length === 1)
  ).every(Boolean)
}

/** Pure simulation: pantry rows and published recipe quantities are never mutated. */
export function calculateWeeklyShopping(plan: ShoppingPlan, pantry: (PantryStock & { id: string })[], userId: string, now = new Date()) {
  const stock = pantry.map(row => ({ ...row })).sort((a,b) => compare(a.id,b.id))
  const meals = [...plan.meals].sort((a,b) => a.dayOfWeek - b.dayOfWeek ||
    WEEKLY_MEAL_ORDER.indexOf(a.mealType) - WEEKLY_MEAL_ORDER.indexOf(b.mealType) || compare(a.id,b.id))
  const groups: { identity: string; name: string; productId: string | null; amount: { quantity: number; unit: string } | null; sources: Source[]; origins: unknown[] }[] = []
  const revisionInputs: unknown[] = []
  let unknown = 0
  for (const meal of meals) {
    revisionInputs.push([meal.id, meal.dayOfWeek, meal.mealType, meal.recipeId])
    if (!meal.recipe) continue
    for (const ing of [...meal.recipe.ingredients].filter(i => !i.optional).sort((a,b) => compare(a.id,b.id))) {
      const parsed = parseIngredientQuantity(ing.quantity)
      const origin = ingredientSourceKey(meal.recipe.id, ing.id, { planId: plan.id, id: meal.id })
      const original = [origin, ing.name, ing.productId, ing.quantity]
      revisionInputs.push(original)
      let missing = parsed.requiredQuantity
      let covered = 0
      let uncertain = missing === null
      if (missing !== null && parsed.requiredUnit) {
        const { usable } = matchingPantryStock(ing, stock, userId, now)
        // As KH-015, use one product identity; never pool different products by a similar name.
        const candidates = new Map<string, { quantity: number; rows: typeof stock }>()
        for (const row of usable) {
          if (row.quantity === 0) continue // exhausted virtual row still retains its exact identity
          const quantity = row.quantity !== null && row.unit ? convertQuantity(row.quantity, row.unit, parsed.requiredUnit) : null
          if (quantity === null) { uncertain = true; continue }
          const candidate = candidates.get(row.productId) ?? { quantity: 0, rows: [] }
          candidate.quantity += quantity
          if (!Number.isFinite(candidate.quantity)) throw new Error('Weekly stock quantity overflow')
          candidate.rows.push(row)
          candidates.set(row.productId, candidate)
        }
        const chosen = [...candidates.entries()].sort((a,b) => b[1].quantity - a[1].quantity || compare(a[0],b[0]))[0]?.[1]
        for (const row of chosen?.rows ?? []) {
          if (missing <= 0) break
          const available = convertQuantity(row.quantity!, row.unit!, parsed.requiredUnit)!
          const used = Math.min(missing, available)
          row.quantity = Math.max(0, row.quantity! - convertQuantity(used, parsed.requiredUnit, row.unit!)!)
          const remainder = Math.max(0, missing - used)
          // Absorb only floating-point arithmetic noise relative to this known requirement.
          const tolerance = Number.EPSILON * 8 * Math.max(parsed.requiredQuantity!, available)
          missing = remainder <= tolerance ? 0 : remainder
          covered += used
        }
      }
      // Keep all original requirements in group identity, including covered origins: a retry after buying
      // cannot resurrect a group merely because its newly purchased stock changed the shortage.
      const identity = ing.productId ? JSON.stringify(['product', ing.productId]) : JSON.stringify(['name', ing.name.trim().toLocaleLowerCase('es')])
      const amount = parsed.requiredQuantity !== null && parsed.requiredUnit ? { quantity: parsed.requiredQuantity, unit: parsed.requiredUnit } : null
      let group = groups.find(g => g.identity === identity && g.amount !== null && amount !== null && sumCompatible(g.amount, amount) !== null)
      if (!group) { group = { identity, name: ing.name, productId: ing.productId, amount, sources: [], origins: [] }; groups.push(group) }
      group.origins.push(original)
      const source: Source = { sourceKey: origin, planId: plan.id, slotId: meal.id, recipeId: meal.recipe.id, ingredientId: ing.id,
        name: ing.name, originalIngredientText: ing.quantity, ...parsed, coveredQuantity: covered, missingQuantity: missing, status: missing === 0 ? 'covered' : uncertain ? 'unknown' : 'required' }
      group.sources.push(source)
      if (uncertain && missing !== 0) unknown++
    }
  }
  const items: WeeklyNeed[] = groups.filter(g => g.sources.some(s => s.missingQuantity !== 0)).map(g => {
    let total: { quantity: number; unit: string } | null = null
    for (const source of g.sources) {
      if (source.missingQuantity === null || source.missingQuantity === 0 || !source.requiredUnit) continue
      const amount = { quantity: source.missingQuantity, unit: source.requiredUnit }
      const next: { quantity: number; unit: string } | null = total ? sumCompatible(total, amount) : amount
      if (!next) throw new Error('Weekly requirement quantity overflow')
      total = next
    }
    return { name: g.name, productId: g.productId, requiredQuantity: total?.quantity ?? null, requiredUnit: total?.unit ?? null,
      originalIngredientText: g.sources.length === 1 ? g.sources[0].originalIngredientText : null,
      sourceType: 'weekly-plan', sourceKey: JSON.stringify(['weekly-plan', plan.id, hash(g.origins)]),
      sourceContributions: JSON.stringify({ version: 1, planId: plan.id, weekStart: plan.weekStart.toISOString(), sources: g.sources }),
      reason: `Para esta semana · ${g.sources.length} ${g.sources.length === 1 ? 'origen' : 'orígenes'}${g.sources.some(s => s.status === 'unknown') ? ' · Cantidad no verificada' : ''}` }
  })
  return { items, unknown, revision: hash([plan.id, revisionInputs]) }
}
