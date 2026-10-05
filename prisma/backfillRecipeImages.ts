import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import { fetchRecipeImage, photoId } from '../src/lib/unsplash'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

// Explicit, manual tool: `npm run images:backfill` (see README "Imágenes de recetas").
// tsx does not load .env files, so read them here; real environment variables win over file values.
for (const file of ['.env.local', '.env']) {
  if (fs.existsSync(file)) process.loadEnvFile(file)
}

const DRY_RUN = process.argv.includes('--dry-run')

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const dbUrl = process.env.DATABASE_URL ?? `file:${path.resolve(__dirname, '../dev.db')}`
const adapter = new PrismaBetterSqlite3({ url: dbUrl })
const prisma = new PrismaClient({ adapter })

async function main() {
  const limit = Math.max(0, Number(process.env.RECIPE_IMAGE_BACKFILL_LIMIT ?? 40))
  if (limit === 0) return

  if (!DRY_RUN && !process.env.UNSPLASH_ACCESS_KEY) {
    throw new Error('UNSPLASH_ACCESS_KEY is not set (checked the environment, .env.local and .env). Nothing was changed.')
  }

  const recipes = await prisma.recipe.findMany({
    where: { imageUrl: null },
    orderBy: { title: 'asc' },
    take: limit,
  })

  if (DRY_RUN) {
    console.log(`Dry run: ${recipes.length} recipe(s) without image would be searched on Unsplash (no API calls, no DB writes):`)
    for (const recipe of recipes) console.log(`  - ${recipe.title}`)
    return
  }

  // Never give two recipes the same photo, including ones assigned in earlier runs.
  const used = new Set(
    (await prisma.recipe.findMany({ where: { imageUrl: { not: null } }, select: { imageUrl: true } })).map(r => photoId(r.imageUrl!))
  )

  let updated = 0
  for (const recipe of recipes) {
    const imageUrl = await fetchRecipeImage(recipe.title, used)
    if (!imageUrl) {
      console.warn(`  ! no image found for "${recipe.title}"`)
      continue
    }
    used.add(photoId(imageUrl))
    console.log(`  + ${recipe.title} -> ${imageUrl}`)

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
