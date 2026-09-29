'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Check, ChefHat, Coffee, Cookie, LayoutGrid, Moon, Sun, Zap } from 'lucide-react'
import RecipeCard from '@/components/RecipeCard'
import { Chip, Skeleton, focusRing } from '@/components/ui'
import { apiFetch } from '@/lib/apiFetch'

type Suggestion = {
  recipe: {
    id: string
    title: string
    prepTimeMinutes: number
    difficulty: string
    ketoLevel: string
    mealTypes: string
    imageUrl?: string | null
  }
  score: number
  availableIngredients: string[]
  missingIngredients: string[]
  reason: string
}

type SuggestionsResponse =
  | Suggestion[]
  | {
      items: Suggestion[]
      total: number
      hasMore: boolean
    }

const MEAL_TYPES = [
  { value: '', label: 'Todas', Icon: LayoutGrid },
  { value: 'breakfast', label: 'Desayuno', Icon: Coffee },
  { value: 'lunch', label: 'Comida', Icon: Sun },
  { value: 'dinner', label: 'Cena', Icon: Moon },
  { value: 'snack', label: 'Snack', Icon: Cookie },
]

const GRID = 'grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 lg:grid-cols-4'

export default function MealsPage() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mealType, setMealType] = useState('')
  const [onlyAvailable, setOnlyAvailable] = useState(false)
  const [quickOnly, setQuickOnly] = useState(false)
  const [limit, setLimit] = useState(40)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      setLoading(true)
      setError(null)
      try {
        const params = new URLSearchParams()
        if (mealType) params.set('mealType', mealType)
        if (onlyAvailable) params.set('onlyAvailable', 'true')
        if (quickOnly) params.set('maxTime', '15')
        params.set('limit', String(limit))

        const res = await apiFetch(`/api/recipes/suggestions?${params}`)
        if (!res.ok) {
          throw new Error(`request failed: ${res.status}`)
        }
        const data: SuggestionsResponse = await res.json()
        if (cancelled) return

        if (Array.isArray(data)) {
          setSuggestions(data)
          setTotal(data.length)
          setHasMore(false)
        } else {
          setSuggestions(data.items)
          setTotal(data.total)
          setHasMore(data.hasMore)
        }
      } catch {
        if (!cancelled) {
          setSuggestions([])
          setTotal(0)
          setHasMore(false)
          setError('No se pudieron cargar las recetas')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void run()

    return () => {
      cancelled = true
    }
  }, [mealType, onlyAvailable, quickOnly, limit, reloadKey])

  const handleAddMissingToCart = async (recipeId: string) => {
    const res = await apiFetch(`/api/recipes/${recipeId}/add-to-shopping-list`, { method: 'POST' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
  }

  const hasFilters = !!mealType || onlyAvailable || quickOnly
  const clearFilters = () => {
    setMealType('')
    setOnlyAvailable(false)
    setQuickOnly(false)
    setLimit(40)
  }
  // Nothing in the pantry matches any recipe ingredient: availability can't say anything useful yet.
  const pantryUnused = suggestions.length > 0 && suggestions.every(s => s.availableIngredients.length === 0)

  return (
    <main className="min-h-screen px-4">
      <div className="sticky top-0 z-10 -mx-4 bg-forest-900/95 px-4 pt-[calc(env(safe-area-inset-top)+1rem)] pb-3 backdrop-blur">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h1 className="text-2xl font-bold text-forest-50">Recetas</h1>
          <p className={`text-xs ${error ? 'text-red-300' : 'text-forest-300'}`} aria-live="polite">
            {error ?? (loading ? 'Buscando…' : `${suggestions.length} de ${total}`)}
          </p>
        </div>

        <div className="hide-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
          {MEAL_TYPES.map(({ value, label, Icon }) => (
            <Chip key={value} active={mealType === value} onClick={() => setMealType(value)}>
              <Icon size={15} /> {label}
            </Chip>
          ))}
        </div>
        <div className="hide-scrollbar -mx-4 mt-2 flex items-center gap-2 overflow-x-auto px-4">
          <Chip active={onlyAvailable} onClick={() => setOnlyAvailable(v => !v)}>
            <Check size={15} /> Con lo que tengo
          </Chip>
          <Chip active={quickOnly} onClick={() => setQuickOnly(v => !v)}>
            <Zap size={15} /> Menos de 15 min
          </Chip>
          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className={`relative hit-area h-9 shrink-0 rounded-full px-2 text-[13px] font-semibold whitespace-nowrap text-[#a3e635] ${focusRing}`}
            >
              Limpiar
            </button>
          )}
        </div>
      </div>

      <section className="mt-2">
        {loading ? (
          <div className={GRID} aria-busy="true">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i}>
                <Skeleton className="aspect-[4/3]" />
                <Skeleton className="mt-2 h-4 w-3/4 rounded-md" />
                <Skeleton className="mt-1.5 h-3 w-1/2 rounded-md" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="py-16 text-center">
            <ChefHat size={36} strokeWidth={1.5} className="mx-auto mb-3 text-forest-500" />
            <p className="font-medium text-forest-50">{error}</p>
            <p className="mt-1 text-sm text-forest-300">Revisa la conexión e inténtalo de nuevo.</p>
            <button
              type="button"
              onClick={() => setReloadKey(k => k + 1)}
              className={`mt-3 rounded-full bg-forest-800 px-4 py-2 text-sm font-semibold text-[#a3e635] ${focusRing}`}
            >
              Reintentar
            </button>
          </div>
        ) : suggestions.length === 0 ? (
          <div className="py-16 text-center">
            <ChefHat size={36} strokeWidth={1.5} className="mx-auto mb-3 text-forest-500" />
            {onlyAvailable ? (
              <>
                <p className="font-medium text-forest-50">No tienes ingredientes para ninguna receta</p>
                <p className="mt-1 text-sm text-forest-300">Añade productos a tu despensa o quita el filtro.</p>
                <Link href="/inventory" className={`mt-3 inline-block rounded-full bg-forest-800 px-4 py-2 text-sm font-semibold text-[#a3e635] ${focusRing}`}>
                  Ir a la despensa
                </Link>
              </>
            ) : (
              <>
                <p className="font-medium text-forest-50">Sin recetas con estos filtros</p>
                <p className="mt-1 text-sm text-forest-300">Prueba quitando alguno.</p>
                {hasFilters && (
                  <button type="button" onClick={clearFilters} className={`mt-3 rounded-full bg-forest-800 px-4 py-2 text-sm font-semibold text-[#a3e635] ${focusRing}`}>
                    Limpiar filtros
                  </button>
                )}
              </>
            )}
          </div>
        ) : (
          <>
            {pantryUnused && (
              <p className="mb-3 text-sm text-forest-300">
                Tu despensa aún no coincide con ninguna receta.{' '}
                <Link href="/inventory" className={`font-semibold text-[#a3e635] underline-offset-2 hover:underline ${focusRing}`}>
                  Añade lo que tienes
                </Link>{' '}
                para ver cuáles puedes cocinar ya.
              </p>
            )}
            <ul className={GRID}>
              {suggestions.map(s => (
                <RecipeCard
                  key={s.recipe.id}
                  recipe={s.recipe}
                  availableIngredients={s.availableIngredients}
                  missingIngredients={s.missingIngredients}
                  hideReady={onlyAvailable}
                  onAddMissingToCart={
                    s.missingIngredients.length > 0 ? () => handleAddMissingToCart(s.recipe.id) : undefined
                  }
                />
              ))}
            </ul>
            {hasMore && limit < 100 && (
              <button
                type="button"
                onClick={() => setLimit(prev => Math.min(prev + 20, 100))}
                className={`mx-auto mt-6 block rounded-full bg-forest-800 px-5 py-3 text-sm font-semibold text-forest-50 hover:bg-forest-700 ${focusRing}`}
              >
                Ver 20 más
              </button>
            )}
          </>
        )}
      </section>
    </main>
  )
}
