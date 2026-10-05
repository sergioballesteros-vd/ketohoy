'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { ChefHat, Loader2, Shuffle } from 'lucide-react'
import Sheet from '@/components/Sheet'
import { focusRing } from '@/components/ui'
import { apiFetch } from '@/lib/apiFetch'

export type PlanRecipe = {
  id: string
  title: string
  prepTimeMinutes: number
  difficulty: string
  imageUrl: string | null
}

import { recipeAvailabilityLabel, type RecipeAvailability } from '@/lib/recipeAvailability'

type Suggestion = {
  availability: RecipeAvailability
  recipe: PlanRecipe
  availableIngredients: string[]
  missingIngredients: string[]
}

type Props = {
  mealType: string
  mealLabel: string
  dayLabel: string
  currentRecipeId: string | null
  /** recipes already planned for this meal type this week (tagged, not hidden) */
  usedRecipeIds: Set<string>
  onPick: (recipe: PlanRecipe, availability: RecipeAvailability) => void
  onAuto: () => void
  onClose: () => void
}

/** "Cambiar comida": alternatives for one slot, ranked like the Recetas screen (preferences + pantry). */
export default function SwapMealSheet({ mealType, mealLabel, dayLabel, currentRecipeId, usedRecipeIds, onPick, onAuto, onClose }: Props) {
  const [items, setItems] = useState<Suggestion[] | null>(null)
  const [error, setError] = useState(false)
  const [reload, setReload] = useState(0)

  useEffect(() => {
    let cancelled = false
    apiFetch(`/api/recipes/suggestions?mealType=${mealType}&limit=30`)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then(d => {
        if (cancelled) return
        setError(false)
        setItems((d.items as Suggestion[]).filter(s => s.recipe.id !== currentRecipeId))
      })
      .catch(() => !cancelled && setError(true))
    return () => {
      cancelled = true
    }
  }, [mealType, currentRecipeId, reload])

  return (
    <Sheet
      labelId="swap-meal-title"
      title={`Cambiar ${mealLabel.toLowerCase()} · ${dayLabel}`}
      onClose={onClose}
      footer={
        <button
          type="button"
          onClick={onAuto}
          className={`flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-forest-800 font-semibold text-forest-50 hover:bg-forest-700 ${focusRing}`}
        >
          <Shuffle size={16} /> Elegir por mí
        </button>
      }
    >
      {error ? (
        <div className="py-10 text-center">
          <p className="text-sm text-forest-200">No se pudieron cargar las alternativas.</p>
          <button
            type="button"
            onClick={() => {
              setItems(null)
              setReload(n => n + 1)
            }}
            className={`mt-3 rounded-full bg-forest-800 px-4 py-2 text-sm font-semibold text-[#a3e635] ${focusRing}`}
          >
            Reintentar
          </button>
        </div>
      ) : items === null ? (
        <div className="flex justify-center py-12" aria-busy="true">
          <Loader2 className="animate-spin text-forest-300" />
        </div>
      ) : items.length === 0 ? (
        <p className="py-10 text-center text-sm text-forest-300">No hay otras recetas compatibles con tus preferencias.</p>
      ) : (
        <ul className="mt-2 divide-y divide-forest-800">
          {items.map(({ recipe, availability }) => {
            return (
              <li key={recipe.id}>
                <button
                  type="button"
                  onClick={() => onPick(recipe, availability)}
                  className={`flex w-full items-center gap-3 rounded-lg py-2.5 text-left ${focusRing}`}
                >
                  <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-forest-800">
                    {recipe.imageUrl ? (
                      <Image src={recipe.imageUrl} alt="" fill sizes="48px" className="object-cover" />
                    ) : (
                      <ChefHat className="absolute inset-0 m-auto text-forest-300" size={18} strokeWidth={1.5} />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-2 text-[15px] leading-snug font-semibold text-forest-50">{recipe.title}</span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-forest-300">
                      <span className="inline-flex items-center gap-1">
                        {recipe.prepTimeMinutes} min
                      </span>
                      <span className={availability.ready ? 'font-semibold text-[#a3e635]' : ''}>
                        {recipeAvailabilityLabel(availability)}
                      </span>
                      {usedRecipeIds.has(recipe.id) && <span className="text-forest-400">Ya en tu plan</span>}
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </Sheet>
  )
}
