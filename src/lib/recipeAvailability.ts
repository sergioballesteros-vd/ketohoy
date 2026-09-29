import { ingredientMatchesProduct } from '@/lib/ingredientMatching'

/**
 * How many required ingredients of a recipe are missing from the pantry (same matching rule as
 * scoreRecipe). Unlike scoreRecipe it never filters by preferences, so a recipe already in a plan
 * always gets an answer.
 */
export function recipeAvailability(
  ingredients: Array<{ name: string; optional: boolean; productId: string | null }>,
  pantryProductIds: Set<string>,
  pantryProductNames: string[]
): { missing: number; total: number } {
  const required = ingredients.filter(i => !i.optional)
  const missing = required.filter(
    ing =>
      !(ing.productId && pantryProductIds.has(ing.productId)) &&
      !pantryProductNames.some(n => ingredientMatchesProduct(ing.name.toLowerCase(), n))
  ).length
  return { missing, total: required.length }
}
