-- Domain uniqueness for account-owned state. SQLite unique indexes allow multiple NULL owners,
-- preserving legacy rows while enforcing these keys for authenticated accounts.
DROP INDEX "UserPreferences_userId_idx";
DROP INDEX "PantryItem_userId_idx";
DROP INDEX "WeeklyPlan_userId_idx";

CREATE UNIQUE INDEX "UserPreferences_userId_key" ON "UserPreferences"("userId");
CREATE UNIQUE INDEX "PantryItem_userId_productId_unit_key" ON "PantryItem"("userId", "productId", "unit");
CREATE UNIQUE INDEX "WeeklyPlan_userId_weekStart_key" ON "WeeklyPlan"("userId", "weekStart");
CREATE UNIQUE INDEX "WeeklyMeal_planId_dayOfWeek_mealType_key" ON "WeeklyMeal"("planId", "dayOfWeek", "mealType");
