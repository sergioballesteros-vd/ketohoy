import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withErrorHandling } from '@/lib/apiError'

export const GET = withErrorHandling(async () => {
  const recipes = await db.recipe.findMany({
    include: { ingredients: true },
    orderBy: { title: 'asc' },
  })
  return NextResponse.json(recipes)
})
