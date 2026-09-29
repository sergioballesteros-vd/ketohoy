import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ChevronLeft, Check, Clock } from 'lucide-react'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'
import { ensureRecipeImage } from '@/lib/recipeImage'
import { ingredientMatchesProduct } from '@/lib/ingredientMatching'
import { ToneLabel } from '@/components/ui'
import AddMissingButton from './AddMissingButton'

async function getRecipe(id: string) {
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

const difficultyLabel: Record<string, string> = { very_easy: 'Muy fácil', easy: 'Fácil', medium: 'Media' }
const mealTypeLabels: Record<string, string> = { breakfast: 'Desayuno', lunch: 'Comida', dinner: 'Cena', snack: 'Snack' }
const ketoLevel = {
  strict: { label: 'Keto', tone: 'good' },
  moderate: { label: 'Flexible', tone: 'ok' },
} as const

export default async function RecipeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const recipe = await getRecipe(id)
  if (!recipe) notFound()

  const user = await getSessionUser()
  const pantry = user ? await db.pantryItem.findMany({ where: { userId: user.id }, include: { product: true } }) : []
  const pantryIds = new Set(pantry.map(p => p.productId))
  const pantryNames = pantry.map(p => p.product.name.toLowerCase())
  const inPantry = (ing: { name: string; productId: string | null }) =>
    !!(ing.productId && pantryIds.has(ing.productId)) || pantryNames.some(n => ingredientMatchesProduct(ing.name.toLowerCase(), n))

  const mealTypes: string[] = JSON.parse(recipe.mealTypes)
  const steps: string[] = JSON.parse(recipe.steps)
  const required = recipe.ingredients.filter(i => !i.optional)
  const optional = recipe.ingredients.filter(i => i.optional)
  const have = required.filter(inPantry).length
  const keto = ketoLevel[recipe.ketoLevel as keyof typeof ketoLevel] ?? { label: 'Low carb', tone: 'ok' as const }

  return (
    <main className="min-h-screen px-4 pt-[calc(env(safe-area-inset-top)+1rem)]">
      <Link
        href="/meals"
        className="-ml-2 inline-flex h-11 items-center gap-0.5 rounded-lg pr-3 pl-1 text-sm font-semibold text-forest-300 hover:text-forest-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a3e635]"
      >
        <ChevronLeft size={18} /> Recetas
      </Link>

      {recipe.imageUrl && (
        <div className="relative mt-2 aspect-[16/9] overflow-hidden rounded-3xl bg-forest-800">
          <Image src={recipe.imageUrl} alt="" fill sizes="(min-width: 672px) 640px, 100vw" className="object-cover" priority />
        </div>
      )}

      <h1 className="mt-4 text-[26px] leading-tight font-extrabold text-forest-50">{recipe.title}</h1>
      <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-forest-300">
        <span className="inline-flex items-center gap-1">
          <Clock size={14} /> {recipe.prepTimeMinutes} min
        </span>
        <span aria-hidden>·</span>
        <span>{difficultyLabel[recipe.difficulty] ?? recipe.difficulty}</span>
        <span aria-hidden>·</span>
        <ToneLabel tone={keto.tone} label={keto.label} />
        {mealTypes.length > 0 && (
          <>
            <span aria-hidden>·</span>
            <span>{mealTypes.map(m => mealTypeLabels[m] ?? m).join(', ')}</span>
          </>
        )}
      </p>
      {recipe.description && <p className="mt-3 text-[15px] leading-relaxed text-forest-100">{recipe.description}</p>}

      <section className="mt-6" aria-labelledby="ingredients-title">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="ingredients-title" className="text-lg font-bold text-forest-50">
            Ingredientes
          </h2>
          {user && required.length > 0 && (
            <span className={`text-sm ${have === required.length ? 'font-semibold text-[#a3e635]' : 'text-forest-300'}`}>
              {have === required.length ? 'Tienes todo' : `Tienes ${have} de ${required.length}`}
            </span>
          )}
        </div>
        <ul className="mt-2 divide-y divide-forest-800">
          {required.map(ing => {
            const ok = inPantry(ing)
            return (
              <li key={ing.id} className="flex min-h-11 items-center gap-3 py-2">
                {user && (
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${ok ? 'bg-[#a3e635] text-forest-950' : 'border border-forest-500'}`}
                    role="img"
                    aria-label={ok ? 'En tu despensa' : 'Te falta'}
                  >
                    {ok && <Check size={12} strokeWidth={3} />}
                  </span>
                )}
                <span className="flex-1 text-[15px] text-forest-50">{ing.name}</span>
                {ing.quantity && <span className="text-sm text-forest-300">{ing.quantity}</span>}
              </li>
            )
          })}
          {optional.map(ing => (
            <li key={ing.id} className="flex min-h-11 items-center gap-3 py-2 text-forest-300">
              {user && <span className="h-5 w-5 shrink-0" />}
              <span className="flex-1 text-[15px]">{ing.name}</span>
              <span className="text-xs">opcional</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-6" aria-labelledby="steps-title">
        <h2 id="steps-title" className="text-lg font-bold text-forest-50">
          Preparación
        </h2>
        <ol className="mt-3 space-y-4">
          {steps.map((step, i) => (
            <li key={i} className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#a3e635]/60 text-sm font-bold text-[#a3e635]">
                {i + 1}
              </span>
              <p className="pt-0.5 text-[15px] leading-relaxed text-forest-100">{step}</p>
            </li>
          ))}
        </ol>
      </section>

      <div className="mt-8">
        <AddMissingButton recipeId={recipe.id} allInPantry={!!user && required.length > 0 && have === required.length} />
      </div>
    </main>
  )
}
