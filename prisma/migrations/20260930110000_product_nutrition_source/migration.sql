-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "brand" TEXT,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "mercadonaId" TEXT,
    "category" TEXT NOT NULL,
    "ketoScore" INTEGER NOT NULL DEFAULT 3,
    "netCarbsPer100g" REAL,
    "carbsPer100g" REAL,
    "fiberPer100g" REAL,
    "nutritionSource" TEXT NOT NULL DEFAULT 'category',
    "proteinPer100g" REAL,
    "fatPer100g" REAL,
    "caloriesPer100g" REAL,
    "unitPrice" REAL,
    "referencePrice" TEXT,
    "imageUrl" TEXT,
    "tags" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Product" ("brand", "caloriesPer100g", "category", "createdAt", "fatPer100g", "id", "imageUrl", "ketoScore", "mercadonaId", "name", "netCarbsPer100g", "proteinPer100g", "referencePrice", "source", "tags", "unitPrice", "updatedAt") SELECT "brand", "caloriesPer100g", "category", "createdAt", "fatPer100g", "id", "imageUrl", "ketoScore", "mercadonaId", "name", "netCarbsPer100g", "proteinPer100g", "referencePrice", "source", "tags", "unitPrice", "updatedAt" FROM "Product";
DROP TABLE "Product";
ALTER TABLE "new_Product" RENAME TO "Product";
CREATE UNIQUE INDEX "Product_mercadonaId_key" ON "Product"("mercadonaId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- Backfill. Products imported from Mercadona + Open Food Facts (mercadonaId set) stored TOTAL carbs
-- in netCarbsPer100g (fiber was dropped): keep it as carbsPer100g; netCarbsPer100g stays as-is
-- (>= the real net, i.e. conservative) until the product is re-imported.
-- Seed rows (no mercadonaId) carry hand-entered reference values.
UPDATE "Product" SET "nutritionSource" = 'openfoodfacts', "carbsPer100g" = "netCarbsPer100g"
  WHERE "mercadonaId" IS NOT NULL AND "netCarbsPer100g" IS NOT NULL;
UPDATE "Product" SET "nutritionSource" = 'manual'
  WHERE "mercadonaId" IS NULL AND "netCarbsPer100g" IS NOT NULL;
