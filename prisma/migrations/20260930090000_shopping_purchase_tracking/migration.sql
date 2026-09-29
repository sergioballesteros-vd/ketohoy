-- Additive only: remember what buying a shopping-list item did to the pantry, so un-buying can undo exactly that.
-- Existing rows get pantryDelta NULL / pantryCreated 0 (= "unknown", handled by the legacy fallback in code).
ALTER TABLE "ShoppingListItem" ADD COLUMN "pantryDelta" REAL;
ALTER TABLE "ShoppingListItem" ADD COLUMN "pantryCreated" BOOLEAN NOT NULL DEFAULT false;
