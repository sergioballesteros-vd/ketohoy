import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { fetchRecipeImage } from '@/lib/unsplash'

const inFlightImageFetches = new Map<string, Promise<string | null>>()

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  let recipe = await db.recipe.findUnique({
    where: { id },
    include: { ingredients: { include: { product: true } } },
  })
  if (!recipe) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  if (!recipe.imageUrl) {
    const imageUrl = await (inFlightImageFetches.get(id) ??
      (async () => {
        const pending = fetchRecipeImage(recipe.title)
          .then(async fetchedUrl => {
            if (!fetchedUrl) return null
            const updated = await db.recipe.updateMany({
              where: { id, imageUrl: null },
              data: { imageUrl: fetchedUrl },
            })
            return updated.count > 0 ? fetchedUrl : db.recipe.findUnique({ where: { id } }).then(row => row?.imageUrl ?? fetchedUrl)
          })
          .finally(() => {
            inFlightImageFetches.delete(id)
          })
        inFlightImageFetches.set(id, pending)
        return pending
      })())
    if (imageUrl) {
      recipe = { ...recipe, imageUrl }
    }
  }
  return NextResponse.json(recipe)
}
