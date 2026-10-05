-- Additive: do not reinterpret legacy quantities, purchases, stock or servings.
ALTER TABLE Product ADD COLUMN packageQuantity REAL;
ALTER TABLE Product ADD COLUMN packageUnit TEXT;
ALTER TABLE ShoppingListItem ADD COLUMN requiredQuantity REAL;
ALTER TABLE ShoppingListItem ADD COLUMN requiredUnit TEXT;
ALTER TABLE ShoppingListItem ADD COLUMN originalIngredientText TEXT;
ALTER TABLE ShoppingListItem ADD COLUMN sourceType TEXT NOT NULL DEFAULT 'legacy';
ALTER TABLE ShoppingListItem ADD COLUMN sourceKey TEXT;
ALTER TABLE ShoppingListItem ADD COLUMN purchaseQuantity REAL;
ALTER TABLE ShoppingListItem ADD COLUMN pantryItemId TEXT;
ALTER TABLE ShoppingListItem ADD COLUMN pantryDeltaUnit TEXT;
CREATE UNIQUE INDEX ShoppingListItem_userId_sourceKey_key ON ShoppingListItem(userId, sourceKey);
