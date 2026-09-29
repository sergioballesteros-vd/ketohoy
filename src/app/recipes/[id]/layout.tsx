import { notFound } from 'next/navigation'
import { db } from '@/lib/db'

// Existence check lives in the layout, which renders outside this segment's loading.tsx
// Suspense boundary: notFound() runs before streaming starts, so the response is a real 404.
export default async function RecipeLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params
  const exists = await db.recipe.findUnique({ where: { id }, select: { id: true } })
  if (!exists) notFound()
  return children
}
