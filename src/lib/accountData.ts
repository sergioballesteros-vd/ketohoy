import { constants, fchmodSync, fsyncSync, mkdirSync, openSync, closeSync, writeSync } from 'node:fs'
import path from 'node:path'
import { db } from '@/lib/db'

export const accountExport = async (userId: string, favoriteProductIds: string[] = []) => {
  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      preferences: { orderBy: { id: 'asc' } },
      pantryItems: { orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], include: { product: true } },
      shoppingListItems: { orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], include: { product: true } },
      weeklyPlans: {
        orderBy: [{ weekStart: 'asc' }, { id: 'asc' }],
        include: {
          meals: {
            orderBy: [{ dayOfWeek: 'asc' }, { mealType: 'asc' }],
            include: { recipe: { include: { ingredients: { orderBy: [{ name: 'asc' }, { id: 'asc' }] } } } },
          },
        },
      },
      manualProducts: { where: { source: 'manual' }, orderBy: [{ name: 'asc' }, { id: 'asc' }] },
    },
  })
  if (!user) return null
  const favorites = favoriteProductIds.length ? await db.product.findMany({
    where: { id: { in: favoriteProductIds }, OR: [{ ownerId: null }, { ownerId: userId }] },
    orderBy: [{ name: 'asc' }, { id: 'asc' }],
  }) : []

  const product = (p: (typeof user.manualProducts)[number] | null) =>
    p && {
      name: p.name, brand: p.brand, category: p.category, source: p.source,
      ketoScore: p.ketoScore, netCarbsPer100g: p.netCarbsPer100g, carbsPer100g: p.carbsPer100g,
      fiberPer100g: p.fiberPer100g, nutritionConvention: p.nutritionConvention, nutritionSource: p.nutritionSource,
      proteinPer100g: p.proteinPer100g, fatPer100g: p.fatPer100g, caloriesPer100g: p.caloriesPer100g,
      unitPrice: p.unitPrice, packageQuantity: p.packageQuantity, packageUnit: p.packageUnit,
      referencePrice: p.referencePrice, imageUrl: p.imageUrl, tags: p.tags,
      createdAt: p.createdAt, updatedAt: p.updatedAt,
    }

  return {
    exportVersion: 1,
    generatedAt: new Date().toISOString(),
    account: {
      email: user.email,
      createdAt: user.createdAt,
      emailVerifiedAt: user.emailVerifiedAt,
      authentication: { password: Boolean(user.passwordHash), googleConnected: Boolean(user.googleId) },
      termsAcceptedAt: user.termsAcceptedAt,
      termsVersion: user.termsVersion,
      adultConfirmedAt: user.adultConfirmedAt,
    },
    preferences: user.preferences.map(({ ketoMode, avoidFish, avoidPork, avoidDairy, maxCookingMinutes, createdAt, updatedAt }) => ({ ketoMode, avoidFish, avoidPork, avoidDairy, maxCookingMinutes, createdAt, updatedAt })),
    pantry: user.pantryItems.map(({ quantity, unit, expiresAt, createdAt, updatedAt, product: p }) => ({ quantity, unit, expiresAt, createdAt, updatedAt, product: product(p) })),
    shoppingList: user.shoppingListItems.map(({ name, quantity, requiredQuantity, requiredUnit, originalIngredientText, sourceType, sourceKey, sourceContributions, purchaseQuantity, pantryDeltaUnit, checked, reason, createdAt, updatedAt, pantryDelta, pantryCreated, product: p }) => ({
      name, quantity, requiredQuantity, requiredUnit, originalIngredientText, sourceType, sourceKey, sourceContributions,
      purchaseQuantity, pantryDeltaUnit, checked, reason, createdAt, updatedAt, pantryDelta, pantryCreated, product: product(p),
    })),
    weeklyPlans: user.weeklyPlans.map(({ weekStart, createdAt, updatedAt, meals }) => ({
      weekStart, createdAt, updatedAt,
      meals: meals.map(({ dayOfWeek, mealType, createdAt, recipe }) => ({
        dayOfWeek, mealType, createdAt,
        recipe: recipe ? {
          title: recipe.title,
          mealTypes: recipe.mealTypes,
          prepTimeMinutes: recipe.prepTimeMinutes,
          ingredients: recipe.ingredients.map(({ name, quantity, optional }) => ({ name, quantity, optional })),
        } : null,
      })),
    })),
    manualProducts: user.manualProducts.map(p => product(p)),
    favorites: favorites.map(p => product(p)),
  }
}

export function appendAccountDeletion(userId: string, deletedAt: Date): void {
  const configured = process.env.ACCOUNT_DELETION_LEDGER
  if (!configured || !path.isAbsolute(configured)) throw new Error('Deletion ledger is not configured')
  const ledger = path.resolve(configured)
  const dbUrl = process.env.DATABASE_URL
  if (dbUrl?.startsWith('file:') && path.resolve(dbUrl.slice(5)) === ledger) throw new Error('Deletion ledger cannot be the database')
  const backupDir = process.env.BACKUP_DIR && path.resolve(process.env.BACKUP_DIR)
  if (backupDir && (ledger === backupDir || ledger.startsWith(backupDir + path.sep))) throw new Error('Deletion ledger cannot be inside the backup directory')
  mkdirSync(path.dirname(ledger), { recursive: true, mode: 0o700 })
  const flags = constants.O_WRONLY | constants.O_APPEND | constants.O_CREAT | (constants.O_NOFOLLOW ?? 0)
  const fd = openSync(ledger, flags, 0o600)
  try {
    fchmodSync(fd, 0o600)
    const line = Buffer.from(JSON.stringify({ userId, deletedAt: deletedAt.toISOString() }) + '\n')
    let offset = 0
    while (offset < line.length) offset += writeSync(fd, line, offset, line.length - offset)
    fsyncSync(fd)
  } finally {
    closeSync(fd)
  }
}

export async function deleteAccountData(userId: string): Promise<void> {
  await db.$transaction(async tx => {
    const products = await tx.product.findMany({ where: { ownerId: userId, source: 'manual' }, select: { id: true } })
    const ids = products.map(p => p.id)
    if (ids.length) {
      // Recipes keep their readable ingredient name when a private product reference is removed.
      await tx.recipeIngredient.updateMany({ where: { productId: { in: ids } }, data: { productId: null } })
    }
    await tx.user.delete({ where: { id: userId } })
    if (ids.length) await tx.product.deleteMany({ where: { id: { in: ids } } })
  })
}
