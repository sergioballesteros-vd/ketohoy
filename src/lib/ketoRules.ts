import type { ProductCategory } from '@/lib/categories'
export type { ProductCategory } from '@/lib/categories'

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

// Whole-word matches (accents and case ignored), never substrings: "pan" must not match
// "panceta" or "champán". Each entry is a regex source for one carb staple.
const NON_KETO_WORDS = [
  'pan(es)?', 'pastas?', 'arroc?e?s?', 'arroz', 'patatas?', 'azucar(es)?', 'bolleria', 'cereal(es)?', 'zumos?',
  'refrescos?', 'legumbres?', 'lentejas?', 'garbanzos?', 'alubias?', 'harinas?', 'galletas?', 'bizcochos?',
  'tartas?', 'pizzas?', 'macarrones',
].map(w => new RegExp(`(?:^|[^a-z])${w}(?![a-z])`))

// Phrases that cancel a match: flours from nuts/seeds, "sin azúcar", zero-sugar sodas.
const KETO_EXCEPTIONS = [
  /harinas? de (almendras?|coco|lino|avellanas?|cacahuetes?|semillas?)/g,
  /sin (azucar(es)?|azucares anadidos)/g,
  /refrescos? (zero|cero|light|sin calorias)/g,
]

const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

// Check if product name suggests a carb staple. Name heuristic only: a false negative just leaves
// the category/nutrition score in charge.
export function isNonKetoByName(name: string): boolean {
  const text = KETO_EXCEPTIONS.reduce((t, re) => t.replace(re, ' '), normalize(name))
  return NON_KETO_WORDS.some(re => re.test(text))
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
