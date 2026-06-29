-- CreateTable
CREATE TABLE "UserPreferences" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ketoMode" TEXT NOT NULL DEFAULT 'flexible',
    "avoidFish" BOOLEAN NOT NULL DEFAULT false,
    "avoidPork" BOOLEAN NOT NULL DEFAULT false,
    "avoidDairy" BOOLEAN NOT NULL DEFAULT false,
    "maxCookingMinutes" INTEGER NOT NULL DEFAULT 20,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "brand" TEXT,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "mercadonaId" TEXT,
    "category" TEXT NOT NULL,
    "ketoScore" INTEGER NOT NULL DEFAULT 3,
    "netCarbsPer100g" REAL,
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

-- CreateTable
CREATE TABLE "PantryItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "quantity" REAL,
    "unit" TEXT,
    "expiresAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PantryItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Recipe" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "mealTypes" TEXT NOT NULL,
    "prepTimeMinutes" INTEGER NOT NULL,
    "difficulty" TEXT NOT NULL,
    "ketoLevel" TEXT NOT NULL,
    "tags" TEXT NOT NULL DEFAULT '[]',
    "steps" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "RecipeIngredient" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "recipeId" TEXT NOT NULL,
    "productId" TEXT,
    "name" TEXT NOT NULL,
    "quantity" TEXT,
    "optional" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "RecipeIngredient_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RecipeIngredient_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ShoppingListItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT,
    "name" TEXT NOT NULL,
    "quantity" TEXT,
    "checked" BOOLEAN NOT NULL DEFAULT false,
    "reason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ShoppingListItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WeeklyPlan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "weekStart" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "WeeklyMeal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "planId" TEXT NOT NULL,
    "recipeId" TEXT,
    "dayOfWeek" INTEGER NOT NULL,
    "mealType" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WeeklyMeal_planId_fkey" FOREIGN KEY ("planId") REFERENCES "WeeklyPlan" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WeeklyMeal_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
