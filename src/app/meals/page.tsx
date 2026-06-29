'use client'
import { useEffect, useState, useCallback } from 'react'
import MealTypeTabs from '@/components/MealTypeTabs'
import RecipeCard from '@/components/RecipeCard'

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
  const [addingToCart, setAddingToCart] = useState<string | null>(null)

  const fetchSuggestions = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (mealType) params.set('mealType', mealType)
    if (onlyAvailable) params.set('onlyAvailable', 'true')
    if (quickOnly) params.set('maxTime', '15')
    const res = await fetch(`/api/recipes/suggestions?${params}`)
    const data = await res.json()
    setSuggestions(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [mealType, onlyAvailable, quickOnly])

  useEffect(() => { fetchSuggestions() }, [fetchSuggestions])

  const handleAddMissingToCart = async (recipeId: string) => {
    setAddingToCart(recipeId)
    await fetch(`/api/recipes/${recipeId}/add-to-shopping-list`, { method: 'POST' })
    setAddingToCart(null)
  }

  // suppress unused variable warning
  void addingToCart

  return (
    <main className="p-4">
      <div className="pt-4 pb-4">
        <h1 className="text-xl font-bold">Ideas de comida</h1>
        <p className="text-sm text-gray-400">
          {loading ? 'Buscando...' : `${suggestions.length} recetas disponibles`}
        </p>
      </div>

      <div className="mb-4">
        <MealTypeTabs value={mealType} onChange={setMealType} />
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setQuickOnly(!quickOnly)}
          className={`px-3 py-1.5 rounded-full text-xs transition-colors ${
            quickOnly ? 'bg-blue-700 text-white' : 'bg-gray-900 text-gray-400'
          }`}
        >
          ⚡ &lt;15 min
        </button>
        <button
          onClick={() => setOnlyAvailable(!onlyAvailable)}
          className={`px-3 py-1.5 rounded-full text-xs transition-colors ${
            onlyAvailable ? 'bg-green-700 text-white' : 'bg-gray-900 text-gray-400'
          }`}
        >
          ✓ Solo con lo que tengo
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-gray-900 rounded-xl p-4 h-40 animate-pulse" />
          ))}
        </div>
      ) : suggestions.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-4xl mb-3">🥗</p>
          <p>No hay recetas disponibles con los filtros actuales</p>
          <p className="text-sm mt-1">Añade más productos a tu despensa</p>
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
        </div>
      )}
    </main>
  )
}
