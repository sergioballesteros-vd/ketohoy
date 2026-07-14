import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import { fetchRecipeImage } from '../src/lib/unsplash'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const dbUrl = process.env.DATABASE_URL ?? `file:${path.resolve(__dirname, '../dev.db')}`
const adapter = new PrismaBetterSqlite3({ url: dbUrl })
const prisma = new PrismaClient({ adapter })

async function main() {
  const limit = Math.max(0, Number(process.env.RECIPE_IMAGE_BACKFILL_LIMIT ?? 40))
  if (limit === 0) return

  const recipes = await prisma.recipe.findMany({
    where: { imageUrl: null },
    orderBy: { title: 'asc' },
    take: limit,
  })

  let updated = 0
  for (const recipe of recipes) {
    const imageUrl = await fetchRecipeImage(recipe.title)
    if (!imageUrl) continue

    const result = await prisma.recipe.updateMany({
      where: { id: recipe.id, imageUrl: null },
      data: { imageUrl },
    })
    updated += result.count
  }

  console.log(`✓ Backfilled ${updated}/${recipes.length} recipe images`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
