-- KH-025: historical OFF imports have no captured convention/payload/EAN.
-- Preserve all nutrient values for recovery; do not silently recompute them.
ALTER TABLE "Product" ADD COLUMN "nutritionConvention" TEXT NOT NULL DEFAULT 'unknown';
UPDATE "Product" SET "ketoScore" = 0
WHERE "nutritionSource" = 'openfoodfacts';
-- A subsequent explicit reimport writes verified available carbs and restores evidence/score.
