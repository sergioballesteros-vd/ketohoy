import HomePageClient from '@/components/HomePageClient'
import { db } from '@/lib/db'
import { unstable_cache } from 'next/cache'
import { scoreRecipe } from '@/lib/recipeScoring'
import type { RecipeWithIngredients } from '@/lib/recipeScoring'

const getStats = unstable_cache(
  async () => {
  try {
    const [pantryItems, allRecipes, shoppingItems, prefs] = await Promise.all([
      db.pantryItem.findMany({ include: { product: true } }),
      db.recipe.findMany({ include: { ingredients: true } }),
      db.shoppingListItem.findMany({ where: { checked: false } }),
      db.userPreferences.findFirst(),
    ])

    const pantryProductIds = new Set(pantryItems.map(i => i.productId))
    const pantryProductNames = pantryItems.map(i => i.product.name.toLowerCase())
    const preferences = {
      ketoMode: (prefs?.ketoMode as 'strict' | 'flexible' | 'low_carb' | undefined) ?? 'flexible',
      avoidFish: prefs?.avoidFish ?? false,
      avoidPork: prefs?.avoidPork ?? false,
      avoidDairy: prefs?.avoidDairy ?? false,
      maxCookingMinutes: prefs?.maxCookingMinutes ?? 30,
    }

    const recipesAvailable = allRecipes
      .map(r => scoreRecipe(r as RecipeWithIngredients, { pantryProductIds, pantryProductNames, preferences }))
      .filter(Boolean).length

    return {
      pantryCount: pantryItems.length,
      recipesAvailable,
      shoppingCount: shoppingItems.length,
    }
  } catch {
    return { pantryCount: 0, recipesAvailable: 0, shoppingCount: 0 }
  }
  },
  ['home-stats'],
  { revalidate: 60 }
)

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return { text: 'Buenos días', sub: '¿Qué desayunas hoy?' }
  if (hour < 15) return { text: 'Buenas tardes', sub: '¿Qué comes hoy?' }
  if (hour < 21) return { text: 'Buenas tardes', sub: '¿Qué cenas esta noche?' }
  return { text: 'Buenas noches', sub: '¿Ya tienes plan para mañana?' }
}

export default async function HomePage() {
  const stats = await getStats()
  const greeting = getGreeting()

  return <HomePageClient stats={stats} greeting={greeting} />
}
