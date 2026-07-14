import { db } from '@/lib/db'
import { fetchRecipeImage } from '@/lib/unsplash'

const inFlightImageFetches = new Map<string, Promise<string | null>>()

async function persistRecipeImage(id: string, title: string) {
  const imageUrl = await fetchRecipeImage(title)
  if (!imageUrl) return null

  const updated = await db.recipe.updateMany({
    where: { id, imageUrl: null },
    data: { imageUrl },
  })

  if (updated.count > 0) return imageUrl

  const recipe = await db.recipe.findUnique({ where: { id }, select: { imageUrl: true } })
  return recipe?.imageUrl ?? imageUrl
}

export async function ensureRecipeImage(
  id: string,
  title: string,
  currentImageUrl?: string | null
) {
  if (currentImageUrl) return currentImageUrl

  const pending = inFlightImageFetches.get(id)
  if (pending) return pending

  const next = persistRecipeImage(id, title).finally(() => {
    inFlightImageFetches.delete(id)
  })

  inFlightImageFetches.set(id, next)
  return next
}
