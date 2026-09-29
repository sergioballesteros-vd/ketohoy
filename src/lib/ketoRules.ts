export type ProductCategory =
  | 'meat' | 'fish' | 'eggs' | 'dairy' | 'vegetables'
  | 'fruit' | 'nuts' | 'oils' | 'sauces' | 'drinks' | 'other'

// Returns 0-5 keto score by category
export function ketoScoreByCategory(category: ProductCategory): number {
  const scores: Record<ProductCategory, number> = {
    meat: 5,
    fish: 5,
    eggs: 5,
    oils: 5,
    nuts: 4,
    dairy: 4,
    vegetables: 4,
    sauces: 2,
    fruit: 2,
    drinks: 1,
    other: 2,
  }
  return scores[category] ?? 2
}

// Check if product name suggests non-keto item
export function isNonKetoByName(name: string): boolean {
  const lower = name.toLowerCase()
  const nonKetoTerms = [
    'pan', 'pasta', 'arroz', 'patata', 'azúcar', 'azucar',
    'bollería', 'bolleria', 'cereal', 'zumo', 'refresco',
    'legumbre', 'lenteja', 'garbanzo', 'alubia', 'harina',
    'galleta', 'bizcocho', 'tarta', 'pizza', 'macarron',
  ]
  return nonKetoTerms.some(term => lower.includes(term))
}

// Shared term lists for dietary restrictions (used for products and recipe ingredients)
export const FISH_TERMS = ['pescado', 'salmón', 'salmon', 'atún', 'atun', 'merluza', 'sardina', 'gamba', 'langostino', 'marisco', 'bacalao', 'caballa', 'anchoa', 'boquerón', 'boqueron', 'trucha', 'dorada', 'lubina', 'pulpo', 'sepia', 'calamar', 'mejillon', 'mejillón', 'almeja', 'berberecho', 'vieira', 'cangrejo']
export const PORK_TERMS = ['bacon', 'beicon', 'panceta', 'jamón', 'jamon', 'chorizo', 'salchicha', 'salchichón', 'salchichon', 'lomo', 'cerdo', 'costilla', 'morcilla']
export const DAIRY_TERMS = ['queso', 'nata', 'mantequilla', 'yogur', 'leche', 'mozzarella', 'parmesano', 'ricotta', 'mascarpone', 'feta', 'burrata', 'cheddar']

// Product matches user dietary restrictions
export function productMatchesPreferences(
  productName: string,
  productCategory: ProductCategory,
  preferences: { avoidFish: boolean; avoidPork: boolean; avoidDairy: boolean }
): boolean {
  const lower = productName.toLowerCase()
  if (preferences.avoidFish && productCategory === 'fish') return false
  if (preferences.avoidFish && FISH_TERMS.some(t => lower.includes(t))) return false
  if (preferences.avoidPork && PORK_TERMS.some(t => lower.includes(t))) return false
  if (preferences.avoidDairy && productCategory === 'dairy') return false
  if (preferences.avoidDairy && DAIRY_TERMS.some(t => lower.includes(t))) return false
  return true
}
