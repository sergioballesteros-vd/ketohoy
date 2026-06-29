'use client'
import { Link } from 'next-view-transitions'
import { useEffect, useState, useCallback } from 'react'
import { RefreshIcon, ClockIcon, CartIcon } from '@/components/icons'

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
const MEAL_LABELS: Record<string, { emoji: string; label: string }> = {
  breakfast: { emoji: '☀️', label: 'Desayuno' },
  lunch: { emoji: '🌤️', label: 'Comida' },
  dinner: { emoji: '🌙', label: 'Cena' },
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

  if (loading) return <div className="p-4" style={{ color: '#547856' }}>Cargando...</div>

  return (
    <main className="px-4 pt-4 pb-4">
      <div className="flex items-center justify-between pt-2 pb-5">
        <h1 className="text-2xl font-bold" style={{ fontFamily: 'Syne, sans-serif', color: '#ecf5e0' }}>
          Plan semanal
        </h1>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="rounded-xl px-4 py-2 text-sm font-bold disabled:opacity-50 transition-all"
          style={{ background: '#a3e635', color: '#060e07' }}
        >
          {generating ? 'Generando...' : <><RefreshIcon size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />Generar</>}
        </button>
      </div>

      {plan && plan.meals.length === 0 && (
        <div className="text-center py-16">
          <p className="text-5xl mb-4">📅</p>
          <p className="font-semibold" style={{ color: '#7a9e7c' }}>Sin plan generado</p>
          <p className="text-sm mt-1" style={{ color: '#3b5e3c' }}>Pulsa "Generar" para crear el menú de la semana</p>
        </div>
      )}

      <div className="space-y-3">
        {DAY_NAMES.map((dayName, dayIndex) => (
          <div key={dayIndex} className="rounded-2xl overflow-hidden" style={{ background: '#142514', border: '1px solid #1c321d' }}>
            <div className="px-4 py-2.5" style={{ background: '#1c321d' }}>
              <h3 className="font-bold text-sm" style={{ fontFamily: 'Syne, sans-serif', color: '#a3e635' }}>{dayName}</h3>
            </div>
            <div className="divide-y" style={{ borderColor: '#1c321d' }}>
              {MEAL_TYPES.map(mealType => {
                const meal = getMeal(dayIndex, mealType)
                const mealInfo = MEAL_LABELS[mealType]
                return (
                  <div key={mealType} className="flex items-center gap-3 px-4 py-3">
                    <span className="text-base flex-shrink-0 w-5 text-center">{mealInfo.emoji}</span>
                    {meal?.recipe ? (
                      <div className="flex-1 flex items-center gap-2 min-w-0">
                        <Link
                          href={`/recipes/${meal.recipe.id}`}
                          className="text-sm truncate flex-1 transition-colors"
                          style={{ color: '#ecf5e0' }}
                          onMouseEnter={e => { (e.target as HTMLElement).style.color = '#a3e635' }}
                          onMouseLeave={e => { (e.target as HTMLElement).style.color = '#ecf5e0' }}
                        >
                          {meal.recipe.title}
                        </Link>
                        <span className="flex items-center gap-1 text-xs flex-shrink-0" style={{ color: '#3b5e3c' }}>
                          <ClockIcon size={11} />{meal.recipe.prepTimeMinutes}m
                        </span>
                        <button
                          onClick={() => handleRegenerateMeal(meal.id)}
                          disabled={regeneratingMeal === meal.id}
                          className="flex-shrink-0 transition-colors disabled:opacity-50"
                          style={{ color: '#3b5e3c' }}
                          title="Cambiar receta"
                          aria-label="Cambiar receta"
                        >
                          <RefreshIcon size={14} />
                        </button>
                        <button
                          onClick={() => handleAddMissingToCart(meal.recipe!.id)}
                          className="flex-shrink-0 transition-colors"
                          style={{ color: '#3b5e3c' }}
                          title="Añadir faltantes a compra"
                          aria-label="Añadir faltantes a compra"
                        >
                          <CartIcon size={14} />
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs italic flex-1" style={{ color: '#264227' }}>Sin asignar</span>
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
