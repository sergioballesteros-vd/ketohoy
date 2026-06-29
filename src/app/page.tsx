import Link from 'next/link'

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

export default async function HomePage() {
  const stats = await getStats()

  return (
    <main className="p-4">
      <div className="pt-8 pb-6 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-green-400">KetoHoy</h1>
          <p className="text-gray-400 mt-1">¿Qué comes hoy?</p>
        </div>
        <Link href="/preferences" className="text-gray-600 hover:text-gray-400 pt-2">⚙️</Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        <div className="bg-gray-900 rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-green-400">{stats.pantryCount}</div>
          <div className="text-xs text-gray-500">en despensa</div>
        </div>
        <div className="bg-gray-900 rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-green-400">{stats.recipesAvailable}</div>
          <div className="text-xs text-gray-500">recetas posibles</div>
        </div>
        <div className="bg-gray-900 rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-yellow-400">{stats.shoppingCount}</div>
          <div className="text-xs text-gray-500">por comprar</div>
        </div>
      </div>

      {/* CTAs */}
      <div className="space-y-3">
        <Link
          href="/inventory"
          className="flex items-center gap-4 bg-gray-900 hover:bg-gray-800 rounded-xl p-4 transition-colors"
        >
          <span className="text-3xl">🥚</span>
          <div>
            <div className="font-semibold">Tengo estos productos</div>
            <div className="text-sm text-gray-400">Actualiza lo que hay en casa</div>
          </div>
          <span className="ml-auto text-gray-600">→</span>
        </Link>

        <Link
          href="/meals"
          className="flex items-center gap-4 bg-green-900/40 hover:bg-green-900/60 border border-green-800 rounded-xl p-4 transition-colors"
        >
          <span className="text-3xl">🍳</span>
          <div>
            <div className="font-semibold text-green-300">Dame ideas para hoy</div>
            <div className="text-sm text-gray-400">Recetas con lo que tienes</div>
          </div>
          <span className="ml-auto text-gray-600">→</span>
        </Link>

        <Link
          href="/shopping-list"
          className="flex items-center gap-4 bg-gray-900 hover:bg-gray-800 rounded-xl p-4 transition-colors"
        >
          <span className="text-3xl">🛒</span>
          <div>
            <div className="font-semibold">Lista de compra</div>
            <div className="text-sm text-gray-400">
              {stats.shoppingCount > 0 ? `${stats.shoppingCount} productos pendientes` : 'Sin pendientes'}
            </div>
          </div>
          <span className="ml-auto text-gray-600">→</span>
        </Link>
      </div>

      {/* Disclaimer */}
      <p className="text-xs text-gray-600 text-center mt-8 px-4">
        Esta app no sustituye el consejo médico o nutricional profesional. Consulta con un profesional sanitario antes de iniciar una dieta restrictiva.
      </p>
    </main>
  )
}
