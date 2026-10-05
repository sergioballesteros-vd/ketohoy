'use client'
import Image from 'next/image'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, ChefHat, ListPlus, Loader2, RefreshCw, Shuffle } from 'lucide-react'
import Sheet from '@/components/Sheet'
import { useToast } from '@/components/Toast'
import { Skeleton, focusRing } from '@/components/ui'
import SwapMealSheet, { type PlanRecipe } from './SwapMealSheet'
import PrepareShoppingButton from './PrepareShoppingButton'
import { apiFetch } from '@/lib/apiFetch'

import { recipeAvailabilityLabel, type RecipeAvailability } from '@/lib/recipeAvailability'
type Availability = RecipeAvailability

type WeeklyMeal = {
  id: string
  dayOfWeek: number
  mealType: string
  recipe: PlanRecipe | null
  availability: Availability | null
}

type WeeklyPlan = {
  id: string
  weekStart: string
  meals: WeeklyMeal[]
}

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
const DAY_SHORT = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
const MEAL_ORDER = ['breakfast', 'lunch', 'snack', 'dinner']
const MEAL_LABEL: Record<string, string> = { breakfast: 'Desayuno', lunch: 'Comida', snack: 'Snack', dinner: 'Cena' }
const JSON_HEADERS = { 'Content-Type': 'application/json' }

async function readApiError(res: Response, fallback: string) {
  const data = await res.json().catch(() => null)
  return typeof data?.error === 'string' ? data.error : fallback
}

// weekStart is Monday 00:00 in the server's timezone; +12h keeps the UTC calendar date on that Monday.
const dayDate = (weekStart: string, index: number) => new Date(new Date(weekStart).getTime() + 12 * 3600e3 + index * 86400e3)
const ymd = (d: Date, utc: boolean) =>
  utc ? d.toISOString().slice(0, 10) : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

function availabilityText(a: Availability | null) {
  if (!a || a.total === 0) return null
  return { text: recipeAvailabilityLabel(a), ready: a.ready }
}

export default function WeeklyPlanPage() {
  const [plan, setPlan] = useState<WeeklyPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [confirmRegen, setConfirmRegen] = useState(false)
  const [swapping, setSwapping] = useState<WeeklyMeal | null>(null)
  const [replacingId, setReplacingId] = useState<string | null>(null) // row waiting for a server-picked recipe
  const [added, setAdded] = useState<Record<string, boolean>>({})
  const [error, setError] = useState<string | null>(null)
  const [insufficientCandidates, setInsufficientCandidates] = useState(false)
  const { toast, show } = useToast()
  const scrolled = useRef(false)

  const fetchPlan = useCallback(async () => {
    try {
      const res = await apiFetch('/api/weekly-plan')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setPlan(await res.json())
      setError(null)
    } catch {
      setError('No se pudo cargar el plan semanal')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void (async () => {
      await fetchPlan()
    })()
  }, [fetchPlan])

  const todayIndex = plan
    ? [0, 1, 2, 3, 4, 5, 6].find(i => ymd(dayDate(plan.weekStart, i), true) === ymd(new Date(), false)) ?? -1
    : -1

  // Land on today on phones (7 stacked days is long); the desktop grid shows the whole week.
  useEffect(() => {
    if (scrolled.current || todayIndex < 1 || window.innerWidth >= 1024) return
    scrolled.current = true
    document.getElementById(`day-${todayIndex}`)?.scrollIntoView({ block: 'start' })
  }, [todayIndex])

  const generate = async () => {
    setConfirmRegen(false)
    setGenerating(true)
    setError(null)
    setInsufficientCandidates(false)
    try {
      const res = await apiFetch('/api/weekly-plan/generate', { method: 'POST' })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        setInsufficientCandidates(data?.status === 'incomplete' || data?.status === 'no_candidates')
        throw new Error(typeof data?.error === 'string' ? data.error : 'No se pudo generar el plan semanal')
      }
      await fetchPlan()
      show('Plan generado')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo generar el plan semanal')
    } finally {
      setGenerating(false)
    }
  }

  const swap = async (meal: WeeklyMeal, picked?: { recipe: PlanRecipe; availability: Availability }) => {
    setSwapping(null)
    setReplacingId(meal.id)
    if (picked) {
      // optimistic: the row changes immediately, the server answer replaces it
      setPlan(p =>
        p && {
          ...p,
          meals: p.meals.map(m =>
            m.id === meal.id ? { ...m, recipe: picked.recipe, availability: picked.availability } : m
          ),
        }
      )
    }
    try {
      const res = await apiFetch(`/api/weekly-plan/${meal.id}`, {
        method: 'PATCH',
        ...(picked && { headers: JSON_HEADERS, body: JSON.stringify({ recipeId: picked.recipe.id }) }),
      })
      if (!res.ok) throw new Error(await readApiError(res, 'No se pudo cambiar la receta'))
      show('Comida cambiada')
    } catch (err) {
      show(err instanceof Error ? err.message : 'No se pudo cambiar la receta')
    }
    await fetchPlan()
    setReplacingId(null)
  }

  const addMissing = async (recipeId: string, mealId: string) => {
    try {
      const res = await apiFetch(`/api/recipes/${recipeId}/add-to-shopping-list`, { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ mealId }) })
      if (!res.ok) throw new Error()
      const { added: count = 0 } = await res.json()
      setAdded(a => ({ ...a, [mealId]: true }))
      show(count > 0 ? `${count} ${count === 1 ? 'ingrediente añadido' : 'ingredientes añadidos'} a la lista` : 'Ya estaba todo en tu lista', {
        label: 'Ver',
        href: '/shopping-list',
      })
    } catch {
      show('No se pudo añadir a la lista')
    }
  }

  const meals = plan?.meals ?? []
  const hasPlan = meals.length > 0
  const mealOf = (day: number, type: string) => meals.find(m => m.dayOfWeek === day && m.mealType === type)
  const filled = meals.filter(m => m.recipe).length
  const weekLabel = plan
    ? `${dayDate(plan.weekStart, 0).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', timeZone: 'UTC' })} – ${dayDate(plan.weekStart, 6).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', timeZone: 'UTC' })}`
    : ''

  const generateButton = (
    <button
      type="button"
      disabled={generating}
      onClick={() => (hasPlan ? setConfirmRegen(true) : void generate())}
      className={`relative hit-area inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-sm font-semibold disabled:opacity-50 ${focusRing} ${
        hasPlan ? 'bg-forest-800 text-forest-50 hover:bg-forest-700' : 'bg-[#a3e635] text-forest-950'
      }`}
    >
      {generating ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={15} />}
      {generating ? 'Generando…' : hasPlan ? 'Regenerar' : 'Generar menú'}
    </button>
  )

  return (
    <main className="min-h-screen px-4">
      <div className="sticky top-0 z-10 -mx-4 bg-forest-900 px-4 pt-[calc(env(safe-area-inset-top)+1rem)] pb-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h1 className="text-xl min-[360px]:text-2xl font-semibold text-forest-50">Plan semanal</h1>
            <p className="mt-0.5 text-sm text-forest-300">{hasPlan ? (filled < 28 ? `${weekLabel} · ${filled} de 28 comidas` : weekLabel) : ' '}</p>
          </div>
          {!loading && generateButton}
        </div>

        {hasPlan && plan && <PrepareShoppingButton key={JSON.stringify([plan.id, plan.meals.map(m => [m.id, m.recipe?.id])])} planId={plan.id} incomplete={filled < 28} disabled={generating || replacingId !== null || swapping !== null} />}

        {hasPlan && (
          <nav aria-label="Días de la semana" className="mt-3 flex gap-1.5 lg:hidden">
            {DAYS.map((day, i) => (
              <button
                key={day}
                type="button"
                aria-label={day}
                aria-current={i === todayIndex ? 'date' : undefined}
                onClick={() => document.getElementById(`day-${i}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                className={`flex h-12 min-w-0 flex-1 flex-col items-center justify-center rounded-xl text-xs font-semibold ${focusRing} ${
                  i === todayIndex ? 'bg-[#a3e635] text-forest-950' : 'text-forest-200 hover:bg-forest-800'
                }`}
              >
                {DAY_SHORT[i]}
                <span className="text-sm font-semibold">{plan && dayDate(plan.weekStart, i).getUTCDate()}</span>
              </button>
            ))}
          </nav>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-2 rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}{' '}
          {insufficientCandidates ? (
            <Link href="/preferences" className={`inline-flex min-h-11 items-center rounded-lg font-semibold underline ${focusRing}`}>
              Revisar preferencias
            </Link>
          ) : (
            <button type="button" onClick={() => void (hasPlan || loading ? fetchPlan() : generate())} className="font-semibold underline">
              Reintentar
            </button>
          )}
        </p>
      )}

      {loading || (generating && !hasPlan) ? (
        <div className="mt-4 space-y-3" aria-busy="true">
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : !hasPlan ? (
        !error && (
          <div className="py-6">
            <p className="font-medium text-forest-50">Aún no tienes plan esta semana</p>
            <p className="mx-auto mt-1 max-w-xs text-sm text-forest-300">
              Genera siete días de desayuno, comida, snack y cena según tu despensa y tus preferencias.
            </p>
          </div>
        )
      ) : (
        <div className={`mt-2 lg:grid lg:grid-cols-3 lg:gap-x-10 transition-opacity duration-200 ${generating ? 'opacity-60' : ''}`} aria-busy={generating}>
          {DAYS.map((day, dayIndex) => (
            <section key={day} id={`day-${dayIndex}`} className="scroll-mt-40 pt-4 lg:scroll-mt-4" aria-label={day}>
              <h2 className="flex items-center gap-2 text-xs font-semibold tracking-wider text-forest-300 uppercase">
                {day} {plan && dayDate(plan.weekStart, dayIndex).getUTCDate()}
                {dayIndex === todayIndex && (
                  <span className="text-xs tracking-normal text-forest-100 normal-case">Hoy</span>
                )}
              </h2>
              <ul className="mt-1 divide-y divide-forest-800">
                {MEAL_ORDER.map(type => {
                  const meal = mealOf(dayIndex, type)
                  const recipe = meal?.recipe
                  const av = availabilityText(meal?.availability ?? null)
                  return (
                    <li key={type} className={`flex min-h-[4.5rem] items-center gap-1 py-2 transition-opacity duration-150 ${replacingId === meal?.id ? 'opacity-60' : ''}`}>
                      {meal && recipe ? (
                        <>
                          <Link key={recipe.id} href={`/recipes/${recipe.id}`} className={`flex min-w-0 flex-1 items-center gap-3 rounded-lg ${focusRing}`}>
                            <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-forest-800 max-[359px]:h-12 max-[359px]:w-12">
                              {recipe.imageUrl ? (
                                <Image src={recipe.imageUrl} alt="" fill sizes="56px" className="object-cover" />
                              ) : (
                                <ChefHat className="absolute inset-0 m-auto text-forest-300" size={20} strokeWidth={1.5} />
                              )}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block text-xs font-semibold tracking-wider text-forest-400 uppercase">{MEAL_LABEL[type]}</span>
                              <span className="line-clamp-3 text-[15px] leading-snug font-semibold text-forest-50 min-[400px]:line-clamp-2">{recipe.title}</span>
                              <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-forest-300">
                                <span className="inline-flex items-center gap-1">
                                  {recipe.prepTimeMinutes} min
                                </span>
                                {av && <span className={av.ready ? 'font-semibold text-[#a3e635]' : ''}>{av.text}</span>}
                              </span>
                            </span>
                          </Link>
                          {meal.availability && meal.availability.needsReview > 0 && (
                            <button
                              type="button"
                              onClick={() => void addMissing(recipe.id, meal.id)}
                              aria-label={`Añadir a la lista lo que falta para ${recipe.title}`}
                              className={`relative hit-area flex h-10 w-10 shrink-0 items-center justify-center rounded-full hover:bg-forest-800 ${focusRing} ${
                                added[meal.id] ? 'text-[#a3e635]' : 'text-forest-300'
                              }`}
                            >
                              {added[meal.id] ? <Check size={17} strokeWidth={3} /> : <ListPlus size={18} />}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setSwapping(meal)}
                            aria-label={`Cambiar ${MEAL_LABEL[type].toLowerCase()} del ${day.toLowerCase()}`}
                            className={`relative hit-area flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-forest-300 hover:bg-forest-800 hover:text-forest-50 ${focusRing}`}
                          >
                            <Shuffle size={17} />
                          </button>
                        </>
                      ) : (
                        <>
                          <span className="flex min-w-0 flex-1 items-center gap-3">
                            <span className="h-14 w-14 shrink-0 rounded-xl border border-dashed border-forest-600" />
                            <span>
                              <span className="block text-xs font-semibold tracking-wider text-forest-400 uppercase">{MEAL_LABEL[type]}</span>
                              <span className="text-sm text-forest-300">Sin receta</span>
                            </span>
                          </span>
                          {meal && (
                            <button
                              type="button"
                              onClick={() => setSwapping(meal)}
                              className={`rounded-full px-3 py-2 text-sm font-semibold text-[#a3e635] hover:bg-forest-800 ${focusRing}`}
                            >
                              Elegir
                            </button>
                          )}
                        </>
                      )}
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      {swapping && (
        <SwapMealSheet
          mealType={swapping.mealType}
          mealLabel={MEAL_LABEL[swapping.mealType]}
          dayLabel={DAYS[swapping.dayOfWeek]}
          currentRecipeId={swapping.recipe?.id ?? null}
          usedRecipeIds={new Set(meals.filter(m => m.mealType === swapping.mealType && m.recipe).map(m => m.recipe!.id))}
          onPick={(recipe, availability) => void swap(swapping, { recipe, availability })}
          onAuto={() => void swap(swapping)}
          onClose={() => setSwapping(null)}
        />
      )}

      {confirmRegen && (
        <Sheet
          labelId="regen-title"
          title="Regenerar el plan"
          onClose={() => setConfirmRegen(false)}
          footer={
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmRegen(false)}
                className={`h-12 flex-1 rounded-lg bg-forest-800 font-semibold text-forest-50 hover:bg-forest-700 ${focusRing}`}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void generate()}
                className={`h-12 flex-1 rounded-lg bg-[#a3e635] font-semibold text-forest-950 ${focusRing}`}
              >
                Regenerar
              </button>
            </div>
          }
        >
          <p className="mt-2 text-sm leading-relaxed text-forest-200">
            Se sustituye el plan de esta semana por uno nuevo. Perderás los cambios que hayas hecho en comidas concretas.
          </p>
        </Sheet>
      )}
      {toast}
    </main>
  )
}
