export type RecipeWithIngredients = {
  id: string
  title: string
  mealTypes: string // JSON array string
  prepTimeMinutes: number
  difficulty: string
  ketoLevel: string
  tags: string
  steps: string
  description: string
  ingredients: Array<{
    name: string
    quantity: string | null
    optional: boolean
    productId: string | null
  }>
}

export type PantryProductId = string

export type RecipeSuggestion = {
  recipe: RecipeWithIngredients
  score: number
  availableIngredients: string[]
  missingIngredients: string[]
  reason: string
}

export type ScoringOptions = {
  pantryProductIds: Set<PantryProductId>
  pantryProductNames: string[] // lowercase product names in pantry
  mercadonaProductIds?: Set<string>
  recentRecipeIds?: string[] // recipes used in last 3 days
  favoriteRecipeIds?: string[]
  preferences: {
    avoidFish: boolean
    avoidPork: boolean
    avoidDairy: boolean
    maxCookingMinutes: number
  }
  mealType?: string
  minAvailability?: number // default 0.6
}

export function scoreRecipe(
  recipe: RecipeWithIngredients,
  opts: ScoringOptions
): RecipeSuggestion | null {
  const { pantryProductIds, pantryProductNames, preferences, mealType } = opts

  // Filter by mealType
  const mealTypes: string[] = JSON.parse(recipe.mealTypes)
  if (mealType && !mealTypes.includes(mealType)) return null

  // Filter by cooking time
  if (recipe.prepTimeMinutes > preferences.maxCookingMinutes + 10) return null

  const required = recipe.ingredients.filter(i => !i.optional)
  if (required.length === 0) return null

  const available: string[] = []
  const missing: string[] = []

  for (const ing of required) {
    const inPantryById = ing.productId && pantryProductIds.has(ing.productId)
    const ingLower = ing.name.toLowerCase()
    const inPantryByName = pantryProductNames.some(n =>
      n.includes(ingLower) || ingLower.includes(n.split(' ')[0])
    )

    // Check avoided ingredients
    const { avoidFish, avoidPork, avoidDairy } = preferences
    const fishTerms = ['salmón', 'salmon', 'atún', 'atun', 'merluza', 'sardina', 'gamba', 'pescado']
    const porkTerms = ['bacon', 'jamón', 'jamon', 'chorizo', 'salchicha', 'lomo de cerdo']
    const dairyTerms = ['queso', 'nata', 'mantequilla', 'yogur', 'leche', 'mozzarella']

    if (avoidFish && fishTerms.some(t => ingLower.includes(t))) return null
    if (avoidPork && porkTerms.some(t => ingLower.includes(t))) return null
    if (avoidDairy && dairyTerms.some(t => ingLower.includes(t))) return null

    if (inPantryById || inPantryByName) {
      available.push(ing.name)
    } else {
      missing.push(ing.name)
    }
  }

  const availabilityRatio = available.length / required.length
  const minAvailability = opts.minAvailability ?? 0.6
  if (availabilityRatio < minAvailability) return null

  // Scoring formula
  let score = 0
  score += Math.round(availabilityRatio * 40) // up to +40
  if (recipe.ketoLevel === 'strict') score += 20
  else if (recipe.ketoLevel === 'moderate') score += 10
  if (recipe.prepTimeMinutes <= 15) score += 15
  if (missing.length <= 1) score += 10
  if (missing.length === 0) score += 5 // bonus for full availability
  if (opts.mercadonaProductIds && missing.some(name => {
    const ing = required.find(i => i.name === name)
    return ing?.productId != null && opts.mercadonaProductIds!.has(ing.productId)
  })) score += 10 // mercadona available for at least one missing ingredient
  if (opts.favoriteRecipeIds?.includes(recipe.id)) score += 5
  if (opts.recentRecipeIds?.includes(recipe.id)) score -= 15

  // Build reason string
  const availCount = available.length
  const totalRequired = required.length
  let reason = `Tienes ${availCount} de ${totalRequired} ingredientes necesarios`
  if (missing.length === 0) {
    reason = `¡Puedes hacerlo ahora mismo con lo que tienes en casa!`
  } else if (missing.length === 1) {
    reason = `Solo falta comprar: ${missing[0]}`
  } else if (missing.length <= 2) {
    reason = `Solo faltan: ${missing.join(' y ')}`
  }
  if (recipe.prepTimeMinutes <= 15) reason += `. Listo en ${recipe.prepTimeMinutes} min`

  return {
    recipe,
    score,
    availableIngredients: available,
    missingIngredients: missing,
    reason,
  }
}

export function sortSuggestions(suggestions: RecipeSuggestion[]): RecipeSuggestion[] {
  return [...suggestions].sort((a, b) => b.score - a.score)
}
