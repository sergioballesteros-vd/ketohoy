-- Originals stay untouched and unowned. Only existing private references receive
-- per-account copies; shared/ownerless references remain on the original product.
-- No ownership is inferred from registration order and no names/quantities are lost.
BEGIN TRANSACTION;
ALTER TABLE "Product" ADD COLUMN "ownerId" TEXT REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "Product_ownerId_source_idx" ON "Product"("ownerId", "source");

CREATE TEMP TABLE "LegacyManualAccess" AS
SELECT p.id AS productId, i.userId, 'legacy-manual:' || p.id || ':' || i.userId AS copyId
FROM "Product" p JOIN "PantryItem" i ON i.productId = p.id
WHERE p.source = 'manual' AND i.userId IS NOT NULL
UNION
SELECT p.id, i.userId, 'legacy-manual:' || p.id || ':' || i.userId
FROM "Product" p JOIN "ShoppingListItem" i ON i.productId = p.id
WHERE p.source = 'manual' AND i.userId IS NOT NULL;

INSERT INTO "Product" ("id", "name", "brand", "source", "mercadonaId", "category", "ketoScore", "netCarbsPer100g", "proteinPer100g", "fatPer100g", "caloriesPer100g", "unitPrice", "referencePrice", "imageUrl", "tags", "createdAt", "updatedAt", "carbsPer100g", "fiberPer100g", "nutritionSource", "ownerId")
SELECT a.copyId, p."name", p."brand", p."source", NULL, p."category", p."ketoScore", p."netCarbsPer100g", p."proteinPer100g", p."fatPer100g", p."caloriesPer100g", p."unitPrice", p."referencePrice", p."imageUrl", p."tags", p."createdAt", p."updatedAt", p."carbsPer100g", p."fiberPer100g", p."nutritionSource", a.userId
FROM "LegacyManualAccess" a JOIN "Product" p ON p.id = a.productId;

UPDATE "PantryItem"
SET productId = (SELECT a.copyId FROM "LegacyManualAccess" a
  WHERE a.productId = "PantryItem".productId AND a.userId = "PantryItem".userId)
WHERE EXISTS (SELECT 1 FROM "LegacyManualAccess" a
  WHERE a.productId = "PantryItem".productId AND a.userId = "PantryItem".userId);

UPDATE "ShoppingListItem"
SET productId = (SELECT a.copyId FROM "LegacyManualAccess" a
  WHERE a.productId = "ShoppingListItem".productId AND a.userId = "ShoppingListItem".userId)
WHERE EXISTS (SELECT 1 FROM "LegacyManualAccess" a
  WHERE a.productId = "ShoppingListItem".productId AND a.userId = "ShoppingListItem".userId);

DROP TABLE "LegacyManualAccess";
COMMIT;
