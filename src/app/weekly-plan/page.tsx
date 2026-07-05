'use client'
import Link from 'next/link'
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

async function loadWeeklyPlan() {
  const res = await fetch('/api/weekly-plan')
  if (!res.ok) throw new Error()
  return res.json()
}

const DAY_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const MEAL_TYPES = ['breakfast', 'lunch', 'snack', 'dinner']
const MEAL_LABELS: Record<string, { emoji: string; label: string }> = {
  breakfast: { emoji: '☀️', label: 'Desayuno' },
  lunch: { emoji: '🌤️', label: 'Comida' },
  snack: { emoji: '🥪', label: 'Snack' },
  dinner: { emoji: '🌙', label: 'Cena' },
}

export default function WeeklyPlanPage() {
  const [plan, setPlan] = useState<WeeklyPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [regeneratingMeal, setRegeneratingMeal] = useState<string | null>(null)
  const [cartAdded, setCartAdded] = useState<Record<string, number>>({})
  const [error, setError] = useState<string | null>(null)

  const fetchPlan = useCallback(async () => {
    try {
      const data = await loadWeeklyPlan()
      setPlan(data)
      setError(null)
    } catch {
      setError('Error cargando el plan semanal')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void (async () => {
      try {
        const data = await loadWeeklyPlan()
        setPlan(data)
        setError(null)
      } catch {
        setError('Error cargando el plan semanal')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const handleGenerate = async () => {
    try {
      setGenerating(true)
      const res = await fetch('/api/weekly-plan/generate', { method: 'POST' })
      if (!res.ok) throw new Error()
      await fetchPlan()
    } catch {
      setError('No se pudo generar el plan semanal')
    } finally {
      setGenerating(false)
    }
  }

  const handleRegenerateMeal = async (mealId: string) => {
    try {
      setRegeneratingMeal(mealId)
      const res = await fetch(`/api/weekly-plan/${mealId}`, { method: 'PATCH' })
      if (!res.ok) throw new Error()
      await fetchPlan()
    } catch {
      setError('No se pudo cambiar la receta')
    } finally {
      setRegeneratingMeal(null)
    }
  }

  const handleAddMissingToCart = async (recipeId: string) => {
    const res = await fetch(`/api/recipes/${recipeId}/add-to-shopping-list`, { method: 'POST' })
    const data = await res.json()
    const count = data.added ?? 0
    setCartAdded(prev => ({ ...prev, [recipeId]: count }))
    setTimeout(() => setCartAdded(prev => { const n = { ...prev }; delete n[recipeId]; return n }), 2000)
  }

  const getMeal = (day: number, mealType: string) =>
    plan?.meals.find(m => m.dayOfWeek === day && m.mealType === mealType)

  if (loading) return <div className="p-4" style={{ color: '#547856' }}>Cargando...</div>
  if (!plan || plan.meals.length === 0) {
    return (
      <main className="px-4 pt-4 pb-8">
        {error && <p className="text-sm text-center py-8" style={{ color: '#ef4444' }}>{error}</p>}
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
        <div className="text-center py-16">
          <p className="text-5xl mb-4">📅</p>
          <p className="font-semibold" style={{ color: '#7a9e7c' }}>Sin plan generado</p>
          <p className="text-sm mt-1" style={{ color: '#3b5e3c' }}>Pulsa &quot;Generar&quot; para crear el menú de la semana</p>
        </div>
      </main>
    )
  }

  return (
    <main className="px-4 pt-4 pb-8">
      {error && <p className="text-sm text-center py-8" style={{ color: '#ef4444' }}>{error}</p>}
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
                  <div key={mealType} className="flex items-start gap-3 px-4 py-3">
                    <span className="text-base flex-shrink-0 w-5 text-center">{mealInfo.emoji}</span>
                    {meal?.recipe ? (
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <Link
                            href={`/recipes/${meal.recipe.id}`}
                            className="text-sm truncate flex-1 transition-colors hover:text-lime-400"
                            style={{ color: '#ecf5e0' }}
                          >
                            {meal.recipe.title}
                          </Link>
                          <span className="flex items-center gap-1 text-xs flex-shrink-0" style={{ color: '#3b5e3c' }}>
                            <ClockIcon size={11} />{meal.recipe.prepTimeMinutes}m
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-[11px] uppercase tracking-widest" style={{ color: '#264227' }}>
                            {mealInfo.label}
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
                            style={{ color: cartAdded[meal.recipe!.id] !== undefined ? '#a3e635' : '#3b5e3c' }}
                            title={cartAdded[meal.recipe!.id] !== undefined ? `+${cartAdded[meal.recipe!.id]} añadidos` : 'Añadir faltantes a compra'}
                            aria-label="Añadir faltantes a compra"
                          >
                            <CartIcon size={14} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1">
                        <span className="text-xs italic block" style={{ color: '#264227' }}>Sin asignar</span>
                        <span className="text-[11px] uppercase tracking-widest mt-1 block" style={{ color: '#264227' }}>
                          {mealInfo.label}
                        </span>
                      </div>
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
