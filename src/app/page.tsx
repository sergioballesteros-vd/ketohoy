import HomePageClient from '@/components/HomePageClient'

async function getStats() {
  try {
    const base = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'
    const [pantryRes, suggestionsRes, shoppingRes] = await Promise.all([
      fetch(`${base}/api/pantry`, { cache: 'no-store' }),
      fetch(`${base}/api/recipes/suggestions`, { cache: 'no-store' }),
      fetch(`${base}/api/shopping-list`, { cache: 'no-store' }),
    ])
    const [pantry, suggestions, shopping] = await Promise.all([
      pantryRes.json(),
      suggestionsRes.json(),
      shoppingRes.json(),
    ])
    return {
      pantryCount: Array.isArray(pantry) ? pantry.length : 0,
      recipesAvailable: Array.isArray(suggestions) ? suggestions.length : 0,
      shoppingCount: Array.isArray(shopping) ? shopping.filter((i: { checked: boolean }) => !i.checked).length : 0,
    }
  } catch {
    return { pantryCount: 0, recipesAvailable: 0, shoppingCount: 0 }
  }
}

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
