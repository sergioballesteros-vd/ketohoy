'use client'
import { useEffect, useState, useCallback } from 'react'

type WeeklyMeal = {
  id: string
  dayOfWeek: number
  mealType: string
  recipe: { id: string; title: string; prepTimeMinutes: number } | null
}

type WeeklyPlan = {
  id: string
  weekStart: string
  meals: WeeklyMeal[]
}

const DAY_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const MEAL_TYPES = ['breakfast', 'lunch', 'dinner']
const MEAL_LABELS: Record<string, string> = {
  breakfast: '☀️ Desayuno',
  lunch: '🌤️ Comida',
  dinner: '🌙 Cena',
}

export default function WeeklyPlanPage() {
  const [plan, setPlan] = useState<WeeklyPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [regeneratingMeal, setRegeneratingMeal] = useState<string | null>(null)

  const fetchPlan = useCallback(async () => {
    const res = await fetch('/api/weekly-plan')
    const data = await res.json()
    setPlan(data)
    setLoading(false)
  }, [])

  useEffect(() => { fetchPlan() }, [fetchPlan])

  const handleGenerate = async () => {
    setGenerating(true)
    await fetch('/api/weekly-plan/generate', { method: 'POST' })
    await fetchPlan()
    setGenerating(false)
  }

  const handleRegenerateMeal = async (mealId: string) => {
    setRegeneratingMeal(mealId)
    await fetch(`/api/weekly-plan/${mealId}`, { method: 'PATCH' })
    await fetchPlan()
    setRegeneratingMeal(null)
  }

  const handleAddMissingToCart = async (recipeId: string) => {
    await fetch(`/api/recipes/${recipeId}/add-to-shopping-list`, { method: 'POST' })
  }

  const getMeal = (day: number, mealType: string) =>
    plan?.meals.find(m => m.dayOfWeek === day && m.mealType === mealType)

  if (loading) return <div className="p-4 text-gray-500">Cargando...</div>

  return (
    <main className="p-4">
      <div className="flex items-center justify-between pt-4 pb-4">
        <h1 className="text-xl font-bold">Plan semanal</h1>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="bg-green-700 hover:bg-green-600 disabled:opacity-50 rounded-lg px-4 py-2 text-sm"
        >
          {generating ? 'Generando...' : '🔄 Generar semana'}
        </button>
      </div>

      {plan && plan.meals.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p className="text-3xl mb-2">📅</p>
          <p>Sin plan generado</p>
          <p className="text-sm mt-1">Pulsa &quot;Generar semana&quot; para crear el menú</p>
        </div>
      )}

      <div className="space-y-4">
        {DAY_NAMES.map((dayName, dayIndex) => (
          <div key={dayIndex} className="bg-gray-900 rounded-xl p-3">
            <h3 className="font-semibold text-sm text-gray-300 mb-2">{dayName}</h3>
            <div className="space-y-2">
              {MEAL_TYPES.map(mealType => {
                const meal = getMeal(dayIndex, mealType)
                return (
                  <div key={mealType} className="flex items-center gap-2">
                    <span className="text-xs text-gray-600 w-16 flex-shrink-0">
                      {MEAL_LABELS[mealType]}
                    </span>
                    {meal?.recipe ? (
                      <div className="flex-1 flex items-center gap-1 min-w-0">
                        <span className="text-xs text-gray-300 truncate flex-1">{meal.recipe.title}</span>
                        <button
                          onClick={() => handleRegenerateMeal(meal.id)}
                          disabled={regeneratingMeal === meal.id}
                          className="text-gray-600 hover:text-gray-400 text-xs flex-shrink-0 disabled:animate-spin"
                          title="Cambiar receta"
                        >
                          {regeneratingMeal === meal.id ? '⏳' : '🔄'}
                        </button>
                        <button
                          onClick={() => handleAddMissingToCart(meal.recipe!.id)}
                          className="text-gray-600 hover:text-orange-400 text-xs flex-shrink-0"
                          title="Añadir faltantes a compra"
                        >
                          🛒
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-700 italic">Sin asignar</span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}
