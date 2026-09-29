import HomePageClient from '@/components/HomePageClient'

// Force dynamic rendering: the hour-based greeting must reflect the actual
// request time, not a value baked into a static/ISR shell at build time
// (that mismatch was causing a hydration error in production builds).
export const dynamic = 'force-dynamic'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'
import { unstable_cache } from 'next/cache'
import { scoreRecipe } from '@/lib/recipeScoring'
import type { RecipeWithIngredients } from '@/lib/recipeScoring'

const getStats = unstable_cache(
  async (userId: string) => {
  try {
    const [pantryItems, allRecipes, shoppingItems, prefs] = await Promise.all([
      db.pantryItem.findMany({ where: { userId }, include: { product: true } }),
      db.recipe.findMany({ include: { ingredients: true } }),
      db.shoppingListItem.findMany({ where: { userId, checked: false } }),
      db.userPreferences.findFirst({ where: { userId } }),
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
  const user = await getSessionUser()
  if (!user) redirect('/login')
  const stats = await getStats(user.id)
  const greeting = getGreeting()

  return <HomePageClient stats={stats} greeting={greeting} />
}
