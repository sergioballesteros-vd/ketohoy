import type { MetadataRoute } from 'next'
import { db } from '@/lib/db'
import { appUrl } from '@/lib/appUrl'

// Rendered per request: the recipe set lives in the DB, which doesn't exist at build time.
export const dynamic = 'force-dynamic'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const recipes = await db.recipe.findMany({ select: { id: true, updatedAt: true } })
  return [
    { url: appUrl() + '/' },
    ...recipes.map(r => ({ url: `${appUrl()}/recipes/${r.id}`, lastModified: r.updatedAt })),
  ]
}
