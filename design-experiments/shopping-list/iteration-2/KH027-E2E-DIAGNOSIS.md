# KH-027 E2E diagnosis

## Before

The preparation POST in `e2e/weekly-shopping.spec.ts` sent no JSON body. Registration created a new user with flexible keto, fish/pork/dairy avoidance disabled, a 20-minute cooking limit, and an empty pantry. The disposable Playwright database had zero recipes because `webServer` only started the app; migrations/seed were not part of the E2E bootstrap.

The route correctly required candidates for breakfast, lunch, snack and dinner across seven days (28 slots). With no candidate recipes, it returned:

```json
{"status":"no_candidates","error":"No encontramos recetas compatibles para desayuno, comida, snack y cena con tus preferencias actuales.","missingMealTypes":["breakfast","lunch","snack","dinner"],"availableSlots":0,"expectedSlots":28}
```

This is an empty fixture, not an invalid request or a generation regression. Pantry was empty, but that was not the rejection condition: seeded recipes yielded a complete plan for the same preferences and empty pantry.

## Contract comparison

KH-003 preserves the selected meal when an incompatible replacement is rejected; KH-004 preserves the existing plan when a complete replacement cannot be made; KH-027 requires 28 valid slots. Returning 422 with no candidates protects those contracts. Loosening filters would violate them.

## After

The guarded Playwright webServer now creates the resolved disposable database, applies its migrations and runs `prisma/seed.ts` before starting Next. No original `dev.db`, production database or audit status was changed. A fresh registered user with the same defaults and no pantry now receives HTTP 200, `status: complete`, and 28 meals. KH-027 focused E2E: 6/6 passed.
