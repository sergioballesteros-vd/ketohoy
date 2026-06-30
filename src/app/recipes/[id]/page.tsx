import { notFound } from 'next/navigation'
import Link from 'next/link'
import AddMissingButton from './AddMissingButton'

type RecipeIngredient = {
  id: string
  name: string
  quantity: string | null
  optional: boolean
  product: { id: string; name: string; unitPrice: number | null } | null
}

type Recipe = {
  id: string
  title: string
  description: string
  mealTypes: string
  prepTimeMinutes: number
  difficulty: string
  ketoLevel: string
  tags: string
  steps: string
  ingredients: RecipeIngredient[]
  imageUrl?: string | null
}

async function getRecipe(id: string): Promise<Recipe | null> {
  try {
    const res = await fetch(`http://localhost:3000/api/recipes/${id}`, { cache: 'no-store' })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

const difficultyLabel: Record<string, string> = {
  very_easy: '⭐ Muy fácil',
  easy: '⭐⭐ Fácil',
  medium: '⭐⭐⭐ Media',
}

export default async function RecipeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const recipe = await getRecipe(id)
  if (!recipe) notFound()

  const mealTypes: string[] = JSON.parse(recipe.mealTypes)
  const steps: string[] = JSON.parse(recipe.steps)
  const mealTypeLabels: Record<string, string> = {
    breakfast: 'Desayuno',
    lunch: 'Comida',
    dinner: 'Cena',
    snack: 'Snack',
  }

  const required = recipe.ingredients.filter(i => !i.optional)
  const optional = recipe.ingredients.filter(i => i.optional)

  return (
    <main className="p-4">
      <div className="pt-4">
        <Link href="/meals" className="text-gray-500 hover:text-gray-300 text-sm mb-4 inline-block">
          ← Volver
        </Link>

        <h1 className="text-2xl font-bold mt-2 mb-2">{recipe.title}</h1>
        {recipe.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={recipe.imageUrl}
            alt={recipe.title}
            className="w-full h-48 object-cover rounded-2xl mb-4"
          />
        )}
        <p className="text-gray-400 mb-4">{recipe.description}</p>

        {/* Meta */}
        <div className="flex flex-wrap gap-2 mb-6">
          <span className="bg-gray-800 px-3 py-1 rounded-full text-sm">⏱ {recipe.prepTimeMinutes} min</span>
          <span className="bg-gray-800 px-3 py-1 rounded-full text-sm">{difficultyLabel[recipe.difficulty]}</span>
          {mealTypes.map(mt => (
            <span key={mt} className="bg-green-900 text-green-300 px-3 py-1 rounded-full text-sm">
              {mealTypeLabels[mt] ?? mt}
            </span>
          ))}
          {recipe.ketoLevel === 'strict' && (
            <span className="bg-green-800 text-green-200 px-3 py-1 rounded-full text-sm">✓ Keto estricto</span>
          )}
        </div>

        {/* Ingredients */}
        <section className="mb-6">
          <h2 className="font-semibold text-lg mb-3">Ingredientes</h2>
          <ul className="space-y-2">
            {required.map(ing => (
              <li key={ing.id} className="flex items-center gap-2 bg-gray-900 rounded-lg px-3 py-2">
                <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                <span className="flex-1">{ing.name}</span>
                {ing.quantity && <span className="text-gray-500 text-sm">{ing.quantity}</span>}
                {ing.product?.unitPrice && (
                  <span className="text-gray-600 text-xs">{ing.product.unitPrice.toFixed(2)}€</span>
                )}
              </li>
            ))}
            {optional.map(ing => (
              <li key={ing.id} className="flex items-center gap-2 bg-gray-900 rounded-lg px-3 py-2 opacity-60">
                <span className="w-2 h-2 rounded-full bg-gray-600 flex-shrink-0" />
                <span className="flex-1">{ing.name}</span>
                <span className="text-gray-600 text-xs">opcional</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Steps */}
        <section className="mb-6">
          <h2 className="font-semibold text-lg mb-3">Preparación</h2>
          <ol className="space-y-3">
            {steps.map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="w-7 h-7 rounded-full bg-green-800 text-green-200 flex items-center justify-center text-sm font-bold flex-shrink-0">
                  {i + 1}
                </span>
                <p className="text-gray-300 pt-0.5">{step}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Add missing to cart */}
        <AddMissingButton recipeId={recipe.id} />
      </div>
    </main>
  )
}
