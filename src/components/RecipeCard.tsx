'use client'
import { Link } from 'next-view-transitions'
import { ClockIcon } from '@/components/icons'

type RecipeCardProps = {
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
  onAddMissingToCart?: () => void
}

const difficultyLabel: Record<string, string> = {
  very_easy: 'Muy fácil',
  easy: 'Fácil',
  medium: 'Media',
}

export default function RecipeCard({
  recipe,
  availableIngredients,
  missingIngredients,
  reason,
  onAddMissingToCart,
}: RecipeCardProps) {
  const total = availableIngredients.length + missingIngredients.length
  const coveragePercent = total > 0 ? Math.round((availableIngredients.length / total) * 100) : 0
  const allAvailable = missingIngredients.length === 0

  return (
    <div
      className="rounded-2xl overflow-hidden relative group bg-forest-800 border border-forest-700"
    >
      <Link href={`/recipes/${recipe.id}`} className="absolute inset-0 z-0" aria-label={recipe.title} />

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <span
            className="font-bold text-base leading-snug flex-1 transition-colors font-syne text-forest-50"
          >
            {recipe.title}
          </span>
          <span
            className={`text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${
              allAvailable
                ? 'bg-[#a3e635]/15 text-[#a3e635] border border-[#a3e635]/25'
                : 'bg-forest-700 text-forest-400'
            }`}
          >
            {allAvailable ? '✓ listo' : `${coveragePercent}%`}
          </span>
        </div>

        {/* Meta */}
        <div className="flex items-center gap-3 text-xs mb-3 text-forest-400">
          <span className="flex items-center gap-1"><ClockIcon size={11} /> {recipe.prepTimeMinutes}min</span>
          <span>·</span>
          <span>{difficultyLabel[recipe.difficulty] ?? recipe.difficulty}</span>
          <span>·</span>
          <span className={recipe.ketoLevel === 'strict' ? 'text-[#a3e635]' : recipe.ketoLevel === 'moderate' ? 'text-amber-500' : 'text-orange-500'}>
            {recipe.ketoLevel === 'strict' ? '✓ Keto' : recipe.ketoLevel === 'moderate' ? '~ Flexible' : 'Low carb'}
          </span>
        </div>

        {/* Coverage bar */}
        {!allAvailable && (
          <div className="mb-3">
            <div className="h-1.5 rounded-full overflow-hidden bg-forest-700">
              <div
                className="h-full rounded-full transition-all bg-[#a3e635]"
                style={{ width: `${coveragePercent}%` }}
              />
            </div>
            <p className="text-xs mt-1 text-forest-500">
              {availableIngredients.length} de {total} ingredientes
            </p>
          </div>
        )}

        {/* Missing ingredients chips */}
        {missingIngredients.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {missingIngredients.slice(0, 4).map(ing => (
              <span
                key={ing}
                className="text-xs px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-500 border border-orange-500/20"
              >
                {ing}
              </span>
            ))}
            {missingIngredients.length > 4 && (
              <span className="text-xs text-forest-500">+{missingIngredients.length - 4} más</span>
            )}
          </div>
        )}

        {reason && (
          <p className="text-xs mb-3 leading-relaxed text-forest-500">{reason}</p>
        )}

        {/* Actions */}
        <div className="flex gap-2 relative z-10">
          <Link
            href={`/recipes/${recipe.id}`}
            className="flex-1 text-center rounded-xl py-2 text-sm font-semibold transition-all hover:opacity-90 bg-[#a3e635] text-forest-950"
          >
            Ver receta
          </Link>
          {missingIngredients.length > 0 && onAddMissingToCart && (
            <button
              onClick={e => { e.preventDefault(); onAddMissingToCart() }}
              className="flex-1 rounded-xl py-2 text-sm font-medium transition-colors bg-forest-700 text-forest-300"
            >
              🛒 Añadir faltantes
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
