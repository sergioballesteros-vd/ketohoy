import type { Metadata } from 'next'
import HomePageClient from '@/components/HomePageClient'
import Landing from '@/components/Landing'

// The recommended meal must reflect the current request time.
export const dynamic = 'force-dynamic'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'
import { hasAcceptedCurrentTerms } from '@/lib/terms'
import { redirect } from 'next/navigation'
import { getMealSlot } from '@/lib/mealSlot'
import { DEFAULT_PREFERENCES, scoreRecipe } from '@/lib/recipeScoring'
import { type RecipeAvailability } from '@/lib/recipeAvailability'
import type { RecipeWithIngredients } from '@/lib/recipeScoring'
import { getMonday } from '@/lib/dateUtils'
import { isCompleteShoppingPlan, weeklySourcesSchema } from '@/lib/weeklyShopping'
import { firstUseGuideStep } from '@/lib/firstUseGuide'

export type HomeRecipe = {
  id: string
  title: string
  prepTimeMinutes: number
  difficulty: string
  imageUrl: string | null
  missingCount: number
  totalCount: number
  availability: RecipeAvailability
}

async function getStats(userId: string, mealType: string) {
  const weekStart = getMonday(new Date())
  const [pantryItems, allRecipes, shoppingItems, prefs, anyPlan, currentPlan] = await Promise.all([
    db.pantryItem.findMany({ where: { userId }, include: { product: true } }),
    db.recipe.findMany({ include: { ingredients: true } }),
    db.shoppingListItem.findMany({ where: { userId, checked: false } }),
    db.userPreferences.findUnique({ where: { userId } }),
    db.weeklyPlan.findFirst({ where: { userId }, select: { id: true } }),
    db.weeklyPlan.findUnique({ where: { userId_weekStart: { userId, weekStart } }, include: { meals: { include: { recipe: { include: { ingredients: true } } } } } }),
  ])

  const completePlan = currentPlan && isCompleteShoppingPlan(currentPlan)
  const weeklyShoppingItems = completePlan ? await db.shoppingListItem.findMany({
    where: { userId, sourceType: 'weekly-plan', sourceKey: { contains: currentPlan.id } },
    select: { sourceKey: true, sourceContributions: true },
  }) : []
  const hasPreparedCurrentPlan = Boolean(completePlan && weeklyShoppingItems.some(item => {
    try {
      const key: unknown = JSON.parse(item.sourceKey ?? 'null')
      const contributions = weeklySourcesSchema.safeParse(JSON.parse(item.sourceContributions ?? 'null'))
      return Array.isArray(key) && key[0] === 'weekly-plan' && key[1] === currentPlan.id &&
        contributions.success && contributions.data.planId === currentPlan.id
    } catch {
      return false
    }
  }))
  const onboardingStep = firstUseGuideStep(Boolean(anyPlan), Boolean(completePlan), hasPreparedCurrentPlan)

  const preferences = {
    ketoMode: prefs?.ketoMode === 'strict' || prefs?.ketoMode === 'flexible' || prefs?.ketoMode === 'low_carb'
      ? prefs.ketoMode : DEFAULT_PREFERENCES.ketoMode,
    avoidFish: prefs?.avoidFish ?? DEFAULT_PREFERENCES.avoidFish,
    avoidPork: prefs?.avoidPork ?? DEFAULT_PREFERENCES.avoidPork,
    avoidDairy: prefs?.avoidDairy ?? DEFAULT_PREFERENCES.avoidDairy,
    maxCookingMinutes: prefs?.maxCookingMinutes ?? DEFAULT_PREFERENCES.maxCookingMinutes,
  }
  const base = { pantry: pantryItems, userId, preferences }
  const scoreAll = (extra: { mealType?: string; minAvailability?: number }) =>
    allRecipes
      .map(r => scoreRecipe(r as RecipeWithIngredients, { ...base, ...extra }))
      .filter((s): s is NonNullable<typeof s> => s !== null)

  const recipesAvailable = scoreAll({}).length

  // Today's pick still prefers recipes with stored photos; RecipeImage only renders reviewed ones.
  const pools = [
    scoreAll({ mealType }),
    scoreAll({ mealType, minAvailability: 0 }),
    scoreAll({ minAvailability: 0 }),
  ]
  const pool = pools.find(list => list.some(s => s.recipe.imageUrl)) ?? pools.find(list => list.length > 0) ?? []
  const ranked = [...pool].sort(
    (a, b) =>
      Number(!a.recipe.imageUrl) - Number(!b.recipe.imageUrl) ||
      Number(!a.availability.ready) - Number(!b.availability.ready) ||
      b.score - a.score
  )
  const toHome = (s: (typeof ranked)[number]): HomeRecipe => ({
    id: s.recipe.id,
    title: s.recipe.title,
    prepTimeMinutes: s.recipe.prepTimeMinutes,
    difficulty: s.recipe.difficulty,
    imageUrl: s.recipe.imageUrl ?? null,
    missingCount: s.missingIngredients.length,
    totalCount: s.availability.total,
    availability: s.availability,
  })
  const [first, ...rest] = ranked

  return {
    pantryCount: pantryItems.length,
    recipesAvailable,
    shoppingCount: shoppingItems.length,
    onboarding: {
      show: onboardingStep !== null,
      step: (onboardingStep ?? 2) as 2 | 3,
    },
    featured: first ? toHome(first) : null,
    more: rest.slice(0, 4).map(toHome),
  }
}

// TIMEZONE (beta limitation): the breakfast/lunch/dinner pick uses a fixed Europe/Madrid
// clock, computed with Intl so it does NOT depend on the VPS timezone (which is UTC). Users outside
// Spain will see the wrong meal. Proper fix: a tiny client effect stores
// Intl.DateTimeFormat().resolvedOptions().timeZone in a `tz` cookie; read it here via cookies()
// (falling back to Europe/Madrid) and pass the hour in. Stats are read for each request.
const madridHour = () =>
  Number(new Intl.DateTimeFormat('es-ES', { hour: 'numeric', hour12: false, timeZone: 'Europe/Madrid' }).format(new Date())) % 24

// Same URL serves the landing (signed out) and the app home (signed in); crawlers only ever see the landing.
export const metadata: Metadata = {
  title: { absolute: 'KetoHoy · Planificador de menú keto con productos de Mercadona' },
  description: 'Genera tu menú keto semanal con lo que ya tienes en casa y compra solo lo que falta, con productos de Mercadona.',
  alternates: { canonical: '/' },
  robots: { index: true, follow: true },
  openGraph: {
    title: 'KetoHoy · Planificador de menú keto con productos de Mercadona',
    description: 'Genera tu menú keto semanal con lo que ya tienes en casa y compra solo lo que falta, con productos de Mercadona.',
    type: 'website',
    url: '/',
    siteName: 'KetoHoy',
    locale: 'es_ES',
    images: [{ url: '/brand/ketohoy-icon-512.png', width: 512, height: 512, alt: 'Icono verde de KetoHoy sobre fondo verde oscuro' }],
  },
  twitter: {
    card: 'summary',
    title: 'KetoHoy · Planificador de menú keto con productos de Mercadona',
    description: 'Genera tu menú keto semanal con lo que ya tienes en casa y compra solo lo que falta, con productos de Mercadona.',
    images: [{ url: '/brand/ketohoy-icon-512.png', alt: 'Icono verde de KetoHoy sobre fondo verde oscuro' }],
  },
}

export default async function HomePage() {
  const user = await getSessionUser()
  if (!user) return <Landing />
  if (!hasAcceptedCurrentTerms(user)) redirect('/accept-terms')
  const hour = madridHour()
  const stats = await getStats(user.id, getMealSlot(hour))

  return <HomePageClient userId={user.id} stats={stats} />
}
