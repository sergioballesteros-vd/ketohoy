import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ensureRecipeImage } from '@/lib/recipeImage'

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
    const imageUrl = await ensureRecipeImage(id, recipe.title, recipe.imageUrl)
    if (imageUrl) {
      recipe = { ...recipe, imageUrl }
    }
  }
  return NextResponse.json(recipe)
}
