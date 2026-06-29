'use client'
import Link from 'next/link'

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

const ketoLevelColor: Record<string, string> = {
  strict: 'text-green-400',
  moderate: 'text-yellow-400',
  low_carb: 'text-orange-400',
}

export default function RecipeCard({
  recipe,
  score,
  availableIngredients,
  missingIngredients,
  reason,
  onAddMissingToCart,
}: RecipeCardProps) {
  const coveragePercent = Math.round(
    (availableIngredients.length / (availableIngredients.length + missingIngredients.length)) * 100
  )

  return (
    <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
      <div className="flex items-start justify-between gap-2 mb-2">
        <Link href={`/recipes/${recipe.id}`} className="font-semibold hover:text-green-400 transition-colors flex-1">
          {recipe.title}
        </Link>
        <span className="text-xs bg-gray-800 px-2 py-0.5 rounded-full text-gray-400 flex-shrink-0">
          {score}pts
        </span>
      </div>

      <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
        <span>⏱ {recipe.prepTimeMinutes}min</span>
        <span>{difficultyLabel[recipe.difficulty] ?? recipe.difficulty}</span>
        <span className={ketoLevelColor[recipe.ketoLevel] ?? 'text-gray-400'}>
          {recipe.ketoLevel === 'strict' ? '✓ Keto estricto' : recipe.ketoLevel === 'moderate' ? '~ Keto flexible' : 'Low carb'}
        </span>
      </div>

      {/* Coverage bar */}
      <div className="mb-3">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Tienes {availableIngredients.length} ingredientes</span>
          <span>{coveragePercent}%</span>
        </div>
        <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-600 rounded-full transition-all"
            style={{ width: `${coveragePercent}%` }}
          />
        </div>
      </div>

      {missingIngredients.length > 0 && (
        <div className="text-xs text-orange-400 mb-2">
          Falta: {missingIngredients.join(', ')}
        </div>
      )}

      <div className="text-xs text-gray-400 italic mb-3">{reason}</div>

      <div className="flex gap-2">
        <Link
          href={`/recipes/${recipe.id}`}
          className="flex-1 text-center bg-green-800 hover:bg-green-700 rounded-lg py-2 text-sm transition-colors"
        >
          Ver receta
        </Link>
        {missingIngredients.length > 0 && onAddMissingToCart && (
          <button
            onClick={onAddMissingToCart}
            className="flex-1 bg-gray-800 hover:bg-gray-700 rounded-lg py-2 text-sm transition-colors"
          >
            🛒 Añadir faltantes
          </button>
        )}
      </div>
    </div>
  )
}
