import type { Metadata } from 'next'
import HomePageClient from '@/components/HomePageClient'
import Landing from '@/components/Landing'

// The recommended meal must reflect the current request time.
export const dynamic = 'force-dynamic'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'
import { unstable_cache } from 'next/cache'
import { getMealSlot } from '@/lib/mealSlot'
import { scoreRecipe } from '@/lib/recipeScoring'
import type { RecipeWithIngredients } from '@/lib/recipeScoring'

export type HomeRecipe = {
  id: string
  title: string
  prepTimeMinutes: number
  difficulty: string
  imageUrl: string | null
  missingCount: number
  totalCount: number
}

const EMPTY_STATS = {
  pantryCount: 0,
  recipesAvailable: 0,
  shoppingCount: 0,
  featured: null as HomeRecipe | null,
  more: [] as HomeRecipe[],
}

const getStats = unstable_cache(
  async (userId: string, mealType: string) => {
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
    const base = { pantryProductIds, pantryProductNames, preferences }
    const scoreAll = (extra: { mealType?: string; minAvailability?: number }) =>
      allRecipes
        .map(r => scoreRecipe(r as RecipeWithIngredients, { ...base, ...extra }))
        .filter((s): s is NonNullable<typeof s> => s !== null)

    const recipesAvailable = scoreAll({}).length

    // Today's pick: fits the current meal, has a photo (a giant placeholder is a bad hero),
    // is fully cookable, then best score. Wider pools are only used if the tighter one has no photo at all.
    const pools = [
      scoreAll({ mealType }),
      scoreAll({ mealType, minAvailability: 0 }),
      scoreAll({ minAvailability: 0 }),
    ]
    const pool = pools.find(list => list.some(s => s.recipe.imageUrl)) ?? pools.find(list => list.length > 0) ?? []
    const ranked = [...pool].sort(
      (a, b) =>
        Number(!a.recipe.imageUrl) - Number(!b.recipe.imageUrl) ||
        Number(a.missingIngredients.length > 0) - Number(b.missingIngredients.length > 0) ||
        b.score - a.score
    )
    const toHome = (s: (typeof ranked)[number]): HomeRecipe => ({
      id: s.recipe.id,
      title: s.recipe.title,
      prepTimeMinutes: s.recipe.prepTimeMinutes,
      difficulty: s.recipe.difficulty,
      imageUrl: s.recipe.imageUrl ?? null,
      missingCount: s.missingIngredients.length,
      totalCount: s.availableIngredients.length + s.missingIngredients.length,
    })
    const [first, ...rest] = ranked

    return {
      pantryCount: pantryItems.length,
      recipesAvailable,
      shoppingCount: shoppingItems.length,
      featured: first ? toHome(first) : null,
      more: rest.slice(0, 4).map(toHome),
    }
  } catch {
    return EMPTY_STATS
  }
  },
  ['home-stats-v3'],
  { revalidate: 60 }
)

// TIMEZONE (beta limitation): the breakfast/lunch/dinner pick uses a fixed Europe/Madrid
// clock, computed with Intl so it does NOT depend on the VPS timezone (which is UTC). Users outside
// Spain will see the wrong meal. Proper fix: a tiny client effect stores
// Intl.DateTimeFormat().resolvedOptions().timeZone in a `tz` cookie; read it here via cookies()
// (falling back to Europe/Madrid) and pass the hour in. Note getStats is cached 60s per (user, mealType).
const madridHour = () =>
  Number(new Intl.DateTimeFormat('es-ES', { hour: 'numeric', hour12: false, timeZone: 'Europe/Madrid' }).format(new Date())) % 24

// Same URL serves the landing (signed out) and the app home (signed in); crawlers only ever see the landing.
export const metadata: Metadata = {
  title: { absolute: 'KetoHoy · Planificador de menú keto con productos de Mercadona' },
  description: 'Genera tu menú keto semanal con lo que ya tienes en casa y compra solo lo que falta, con productos de Mercadona.',
  alternates: { canonical: '/' },
  robots: { index: true, follow: true },
}

export default async function HomePage() {
  const user = await getSessionUser()
  if (!user) return <Landing />
  const hour = madridHour()
  const stats = await getStats(user.id, getMealSlot(hour))

  return <HomePageClient stats={stats} />
}
