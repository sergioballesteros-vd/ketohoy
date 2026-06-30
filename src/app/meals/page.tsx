'use client'
import { useEffect, useState, useCallback } from 'react'
import MealTypeTabs from '@/components/MealTypeTabs'
import RecipeCard from '@/components/RecipeCard'
import { ZapIcon, CheckIcon } from '@/components/icons'

type Suggestion = {
  recipe: {
    id: string
    title: string
    prepTimeMinutes: number
    difficulty: string
    ketoLevel: string
    mealTypes: string
  }
  score: number
  availableIngredients: string[]
  missingIngredients: string[]
  reason: string
}

export default function MealsPage() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [loading, setLoading] = useState(true)
  const [mealType, setMealType] = useState('')
  const [onlyAvailable, setOnlyAvailable] = useState(false)
  const [quickOnly, setQuickOnly] = useState(false)
  const [limit, setLimit] = useState(20)

  const fetchSuggestions = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (mealType) params.set('mealType', mealType)
    if (onlyAvailable) params.set('onlyAvailable', 'true')
    if (quickOnly) params.set('maxTime', '15')
    params.set('limit', String(limit))
    const res = await fetch(`/api/recipes/suggestions?${params}`)
    const data = await res.json()
    setSuggestions(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [mealType, onlyAvailable, quickOnly, limit])

  useEffect(() => { fetchSuggestions() }, [fetchSuggestions])

  const handleAddMissingToCart = async (recipeId: string) => {
    await fetch(`/api/recipes/${recipeId}/add-to-shopping-list`, { method: 'POST' })
  }

  return (
    <main className="px-4 pt-4 pb-28">
      <div className="pt-2 pb-4">
        <h1 className="text-2xl font-bold" style={{ fontFamily: 'Syne, sans-serif', color: '#ecf5e0' }}>
          Ideas de comida
        </h1>
        <div className="mt-2 flex items-center justify-between gap-3">
          <p className="text-sm" style={{ color: '#547856' }}>
            {loading ? 'Buscando...' : `${suggestions.length} recetas visibles`}
          </p>
          {!loading && suggestions.length > 0 && (
            <button
              onClick={() => setLimit(prev => Math.min(prev + 20, 100))}
              className="rounded-full px-3 py-1.5 text-xs font-semibold transition-colors"
              style={{ background: '#142514', color: '#a3e635', border: '1px solid #1c321d' }}
            >
              Ver más
            </button>
          )}
        </div>
      </div>

      <div className="mb-4">
        <MealTypeTabs value={mealType} onChange={setMealType} />
      </div>

      {/* Filters */}
      <div className="mb-5 rounded-2xl border border-forest-700 bg-forest-800/80 p-2">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setQuickOnly(!quickOnly)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all"
            style={quickOnly
              ? { background: '#a3e635', color: '#060e07' }
              : { background: '#142514', color: '#547856', border: '1px solid #1c321d' }
            }
          >
            <ZapIcon size={13} /> &lt;15 min
          </button>
          <button
            onClick={() => setOnlyAvailable(!onlyAvailable)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all"
            style={onlyAvailable
              ? { background: '#a3e635', color: '#060e07' }
              : { background: '#142514', color: '#547856', border: '1px solid #1c321d' }
            }
          >
            <CheckIcon size={13} /> Solo con lo que tengo
          </button>
          <button
            onClick={() => {
              setMealType('')
              setOnlyAvailable(false)
              setQuickOnly(false)
              setLimit(20)
            }}
            className="px-3 py-2 rounded-xl text-xs font-medium transition-all"
            style={{ background: '#0f1a10', color: '#86a888', border: '1px solid #1c321d' }}
          >
            Limpiar filtros
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div
              key={i}
              className="rounded-2xl h-40 animate-pulse"
              style={{ background: '#142514' }}
            />
          ))}
        </div>
      ) : suggestions.length === 0 ? (
        <div className="rounded-2xl border border-forest-700 bg-forest-800/70 text-center py-16">
          <p className="text-5xl mb-4">🥗</p>
          {onlyAvailable ? (
            <>
              <p className="font-semibold" style={{ color: '#7a9e7c' }}>No tienes ingredientes para ninguna receta</p>
              <p className="text-sm mt-1" style={{ color: '#3b5e3c' }}>Añade productos a tu despensa</p>
            </>
          ) : (
            <>
              <p className="font-semibold" style={{ color: '#7a9e7c' }}>Sin recetas con estos filtros</p>
              <p className="text-sm mt-1" style={{ color: '#3b5e3c' }}>Prueba quitando algún filtro</p>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {suggestions.map(s => (
            <RecipeCard
              key={s.recipe.id}
              {...s}
              onAddMissingToCart={
                s.missingIngredients.length > 0
                  ? () => handleAddMissingToCart(s.recipe.id)
                  : undefined
              }
            />
          ))}
          {suggestions.length >= limit && limit < 100 && (
            <button
              onClick={() => setLimit(prev => Math.min(prev + 20, 100))}
              className="w-full rounded-2xl border border-forest-700 bg-forest-800/70 py-3 text-sm font-semibold text-forest-200 transition-colors"
            >
              Cargar 20 más
            </button>
          )}
        </div>
      )}
    </main>
  )
}
