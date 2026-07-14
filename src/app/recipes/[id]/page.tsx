import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { db } from '@/lib/db'
import { ensureRecipeImage } from '@/lib/recipeImage'
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
    const recipe = await db.recipe.findUnique({
      where: { id },
      include: { ingredients: { include: { product: true } } },
    })
    if (!recipe) return null
    const imageUrl = await ensureRecipeImage(recipe.id, recipe.title, recipe.imageUrl)
    return imageUrl === recipe.imageUrl ? recipe : { ...recipe, imageUrl }
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
    <main className="px-4 pt-4 pb-8">
      <div className="pt-2">
        <Link href="/meals" className="text-sm mb-4 inline-block transition-colors" style={{ color: '#547856' }}>
          ← Volver
        </Link>

        <h1 className="text-2xl font-bold mt-2 mb-2" style={{ fontFamily: 'Syne, sans-serif', color: '#ecf5e0' }}>
          {recipe.title}
        </h1>
        {recipe.imageUrl && (
          <Image
            src={recipe.imageUrl}
            alt={recipe.title}
            width={960}
            height={336}
            className="w-full h-56 object-cover rounded-3xl mb-4 border border-forest-700"
          />
        )}
        <p className="text-sm mb-4 leading-relaxed" style={{ color: '#7a9e7c' }}>{recipe.description}</p>

        {/* Meta */}
        <div className="flex flex-wrap gap-2 mb-6">
          <span className="bg-forest-800 px-3 py-1 rounded-full text-sm border border-forest-700">⏱ {recipe.prepTimeMinutes} min</span>
          <span className="bg-forest-800 px-3 py-1 rounded-full text-sm border border-forest-700">{difficultyLabel[recipe.difficulty]}</span>
          {mealTypes.map(mt => (
            <span key={mt} className="bg-green-900 text-green-300 px-3 py-1 rounded-full text-sm border border-green-800">
              {mealTypeLabels[mt] ?? mt}
            </span>
          ))}
          {recipe.ketoLevel === 'strict' && (
            <span className="bg-green-800 text-green-200 px-3 py-1 rounded-full text-sm border border-green-700">✓ Keto estricto</span>
          )}
        </div>

        {/* Ingredients */}
        <section className="mb-6 rounded-2xl border border-forest-700 bg-forest-800/80 p-4">
          <h2 className="font-semibold text-lg mb-3" style={{ color: '#ecf5e0' }}>Ingredientes</h2>
          <ul className="space-y-2">
            {required.map(ing => (
              <li key={ing.id} className="flex items-center gap-2 bg-forest-900 rounded-xl px-3 py-2 border border-forest-700">
                <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                <span className="flex-1" style={{ color: '#ecf5e0' }}>{ing.name}</span>
                {ing.quantity && <span className="text-sm" style={{ color: '#547856' }}>{ing.quantity}</span>}
                {ing.product?.unitPrice && (
                  <span className="text-xs" style={{ color: '#f59e0b' }}>{ing.product.unitPrice.toFixed(2)}€</span>
                )}
              </li>
            ))}
            {optional.map(ing => (
              <li key={ing.id} className="flex items-center gap-2 bg-forest-900 rounded-xl px-3 py-2 opacity-70 border border-forest-700">
                <span className="w-2 h-2 rounded-full bg-forest-500 flex-shrink-0" />
                <span className="flex-1" style={{ color: '#ecf5e0' }}>{ing.name}</span>
                <span className="text-xs" style={{ color: '#547856' }}>opcional</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Steps */}
        <section className="mb-6 rounded-2xl border border-forest-700 bg-forest-800/80 p-4">
          <h2 className="font-semibold text-lg mb-3" style={{ color: '#ecf5e0' }}>Preparación</h2>
          <ol className="space-y-3">
            {steps.map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="w-7 h-7 rounded-full bg-green-800 text-green-200 flex items-center justify-center text-sm font-bold flex-shrink-0 border border-green-700">
                  {i + 1}
                </span>
                <p className="pt-0.5 text-sm leading-relaxed" style={{ color: '#d5e6d6' }}>{step}</p>
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
