import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import { reviewedRecipeImage } from '../src/lib/recipeImages'
import path from 'path'
import { fileURLToPath } from 'url'

// Persists only image choices already reviewed in recipeImages.ts.
const APPLY = process.argv.includes('--apply')

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const dbUrl = process.env.DATABASE_URL ?? `file:${path.resolve(__dirname, '../dev.db')}`
const adapter = new PrismaBetterSqlite3({ url: dbUrl })
const prisma = new PrismaClient({ adapter })

async function main() {
  const recipes = await prisma.recipe.findMany({
    where: { imageUrl: null },
    orderBy: { title: 'asc' },
  })
  const reviewed = recipes.flatMap(recipe => {
    const image = reviewedRecipeImage(recipe.title)
    return image ? [{ recipe, image }] : []
  })
  if (!APPLY) {
    console.log(`Dry run: ${reviewed.length} reviewed image(s) eligible; ${recipes.length - reviewed.length} recipe(s) remain without a reviewed image.`)
    for (const { recipe, image } of reviewed) console.log(`  - ${recipe.title} -> ${image.url}`)
    console.log('Pass --apply to persist these reviewed choices.')
    return
  }

  let updated = 0
  for (const { recipe, image } of reviewed) {
    const result = await prisma.recipe.updateMany({
      where: { id: recipe.id, imageUrl: null },
      data: { imageUrl: image.url },
    })
    updated += result.count
  }

  console.log(`✓ Persisted ${updated}/${reviewed.length} reviewed recipe images`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
