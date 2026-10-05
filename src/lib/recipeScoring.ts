import { recipeAvailability, recipeAvailabilityLabel, type PantryStock, type RecipeAvailability } from '@/lib/recipeAvailability'
import { FISH_TERMS, PORK_TERMS, DAIRY_TERMS } from '@/lib/ketoRules'

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
  imageUrl?: string | null
  ingredients: Array<{
    name: string
    quantity: string | null
    optional: boolean
    productId: string | null
  }>
}

export type RecipeSuggestion = {
  recipe: RecipeWithIngredients
  score: number
  availableIngredients: string[]
  missingIngredients: string[]
  reason: string
  availability: RecipeAvailability
}

export type KetoMode = 'strict' | 'flexible' | 'low_carb'

export type ScoringOptions = {
  pantry: PantryStock[]
  userId: string
  mercadonaProductIds?: Set<string>
  recentRecipeIds?: string[] // recipes used in last 3 days
  favoriteRecipeIds?: string[]
  preferences: {
    ketoMode: KetoMode
    avoidFish: boolean
    avoidPork: boolean
    avoidDairy: boolean
    maxCookingMinutes: number
  }
  mealType?: string
  minAvailability?: number // default 0.6
}

export const DEFAULT_PREFERENCES: ScoringOptions['preferences'] = {
  ketoMode: 'flexible',
  avoidFish: false,
  avoidPork: false,
  avoidDairy: false,
  maxCookingMinutes: 20,
}

export function scoreRecipe(
  recipe: RecipeWithIngredients,
  opts: ScoringOptions
): RecipeSuggestion | null {
  const { preferences, mealType } = opts
  const ketoMode = preferences.ketoMode ?? DEFAULT_PREFERENCES.ketoMode
  const allowedKetoLevels: Record<KetoMode, string[]> = {
    strict: ['strict'],
    flexible: ['strict', 'moderate'],
    low_carb: ['strict', 'moderate', 'low_carb'],
  }

  // Filter by mealType
  const mealTypes: string[] = JSON.parse(recipe.mealTypes)
  if (mealType && !mealTypes.includes(mealType)) return null

  if (!allowedKetoLevels[ketoMode as KetoMode].includes(recipe.ketoLevel)) return null

  // Filter by cooking time
  if (recipe.prepTimeMinutes > preferences.maxCookingMinutes) return null

  const required = recipe.ingredients.filter(i => !i.optional)
  if (required.length === 0) return null

  const availability = recipeAvailability(required, opts.pantry, opts.userId)
  const available = availability.items.filter(i => i.presence).map(i => i.name)
  const missing = availability.items.filter(i => i.status !== 'sufficient').map(i => i.name)
  for (const ing of required) {
    const ingLower = ing.name.toLowerCase()
    const { avoidFish, avoidPork, avoidDairy } = preferences
    if (avoidFish && FISH_TERMS.some(t => ingLower.includes(t))) return null
    if (avoidPork && PORK_TERMS.some(t => ingLower.includes(t))) return null
    if (avoidDairy && DAIRY_TERMS.some(t => ingLower.includes(t))) return null
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
  if (availability.ready) score += 5 // bonus for full availability
  if (opts.mercadonaProductIds && missing.some(name => {
    const ing = required.find(i => i.name === name)
    return ing?.productId != null && opts.mercadonaProductIds!.has(ing.productId)
  })) score += 10 // mercadona available for at least one missing ingredient
  if (opts.favoriteRecipeIds?.includes(recipe.id)) score += 5
  if (opts.recentRecipeIds?.includes(recipe.id)) score -= 15

  // Presence ranks candidates; only verified sufficiency makes a cooking claim.
  let reason = availability.ready
    ? '¡Puedes hacerlo ahora mismo con lo que tienes en casa!'
    : `${availability.presence} de ${availability.total} ingredientes presentes. ${recipeAvailabilityLabel(availability)}`
  if (availability.missing) reason += `: ${availability.items.filter(i => i.status === 'missing').map(i => i.name).join(', ')}`
  if (recipe.prepTimeMinutes <= 15) reason += `. Listo en ${recipe.prepTimeMinutes} min`

  return {
    recipe,
    score,
    availableIngredients: available,
    missingIngredients: missing,
    reason,
    availability,
  }
}

export const sortSuggestions = (s: RecipeSuggestion[]) => [...s].sort((a, b) => b.score - a.score)
