import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ApiError, withErrorHandling } from '@/lib/apiError'
import { reviewedRecipeImage } from '@/lib/recipeImages'

export const GET = withErrorHandling(
  async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params
    const recipe = await db.recipe.findUnique({
      where: { id },
      include: { ingredients: { include: { product: true } } },
    })
    if (!recipe) {
      throw new ApiError('Not found', 404)
    }
    return NextResponse.json({ ...recipe, imageUrl: reviewedRecipeImage(recipe.title)?.url ?? null })
  }
)
