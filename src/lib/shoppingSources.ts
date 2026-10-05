/** KH-005 identity: a published ingredient in a specific cooking occasion. */
export function ingredientSourceKey(recipeId: string, ingredientId: string, meal?: { planId: string; id: string }) {
  return JSON.stringify(meal ? ['meal', meal.planId, meal.id, recipeId, ingredientId] : ['recipe', recipeId, ingredientId])
}
