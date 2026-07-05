import { describe, it, expect } from 'vitest'
import { scoreRecipe, sortSuggestions, RecipeWithIngredients, ScoringOptions } from '../recipeScoring'

function makeRecipe(overrides: Partial<RecipeWithIngredients> = {}): RecipeWithIngredients {
  return {
    id: 'r1',
    title: 'Test Recipe',
    mealTypes: JSON.stringify(['lunch']),
    prepTimeMinutes: 10,
    difficulty: 'easy',
    ketoLevel: 'strict',
    tags: '[]',
    steps: '["step1"]',
    description: 'Test',
    ingredients: [
      { name: 'pollo', quantity: '200g', optional: false, productId: 'p1' },
      { name: 'lechuga', quantity: '1 ud', optional: false, productId: 'p2' },
    ],
    ...overrides,
  }
}

function makeOpts(overrides: Partial<ScoringOptions> = {}): ScoringOptions {
  return {
    pantryProductIds: new Set(['p1', 'p2']),
    pantryProductNames: ['pollo', 'lechuga'],
    preferences: {
      avoidFish: false,
      avoidPork: false,
      avoidDairy: false,
      maxCookingMinutes: 60,
    },
    ...overrides,
  }
}

describe('scoreRecipe', () => {
  it('returns null when mealType filter does not match', () => {
    const recipe = makeRecipe() // mealTypes: ['lunch']
    const opts = makeOpts({ mealType: 'breakfast' })
    expect(scoreRecipe(recipe, opts)).toBeNull()
  })

  it('returns null when less than 60% ingredients are available', () => {
    const recipe = makeRecipe()
    // No pantry items — 0 of 2 available
    const opts = makeOpts({
      pantryProductIds: new Set(),
      pantryProductNames: [],
    })
    expect(scoreRecipe(recipe, opts)).toBeNull()
  })

  it('returns a RecipeSuggestion with score > 0 when all ingredients are in pantry', () => {
    const recipe = makeRecipe()
    const opts = makeOpts()
    const result = scoreRecipe(recipe, opts)
    expect(result).not.toBeNull()
    expect(result!.score).toBeGreaterThan(0)
  })

  it('score includes +40 when all required ingredients are available (100% ratio)', () => {
    // With all ingredients available, availabilityRatio = 1.0, score += Math.round(1 * 40) = 40
    const recipe = makeRecipe({ ketoLevel: 'none', prepTimeMinutes: 30 })
    const opts = makeOpts()
    const result = scoreRecipe(recipe, opts)
    expect(result).not.toBeNull()
    // 40 (availability) + 0 (no keto bonus) + 0 (prep>15) + 10 (missing<=1) + 5 (missing===0)
    expect(result!.score).toBeGreaterThanOrEqual(40)
  })

  it('score includes +20 for strict keto level', () => {
    const recipeStrict = makeRecipe({ ketoLevel: 'strict', prepTimeMinutes: 30 })
    const recipeNone = makeRecipe({ ketoLevel: 'none', prepTimeMinutes: 30 })
    const opts = makeOpts()
    const resultStrict = scoreRecipe(recipeStrict, opts)
    const resultNone = scoreRecipe(recipeNone, opts)
    expect(resultStrict).not.toBeNull()
    expect(resultNone).not.toBeNull()
    expect(resultStrict!.score - resultNone!.score).toBe(20)
  })

  it('score includes +15 when prepTimeMinutes <= 15', () => {
    const recipeFast = makeRecipe({ prepTimeMinutes: 15, ketoLevel: 'none' })
    const recipeSlow = makeRecipe({ prepTimeMinutes: 30, ketoLevel: 'none' })
    const opts = makeOpts()
    const resultFast = scoreRecipe(recipeFast, opts)
    const resultSlow = scoreRecipe(recipeSlow, opts)
    expect(resultFast).not.toBeNull()
    expect(resultSlow).not.toBeNull()
    expect(resultFast!.score - resultSlow!.score).toBe(15)
  })

  it('score includes -15 for recent recipe', () => {
    const recipe = makeRecipe()
    const optsNormal = makeOpts()
    const optsRecent = makeOpts({ recentRecipeIds: ['r1'] })
    const resultNormal = scoreRecipe(recipe, optsNormal)
    const resultRecent = scoreRecipe(recipe, optsRecent)
    expect(resultNormal).not.toBeNull()
    expect(resultRecent).not.toBeNull()
    expect(resultNormal!.score - resultRecent!.score).toBe(15)
  })

  it('returns null when recipe contains an avoided pork ingredient (bacon)', () => {
    const recipe = makeRecipe({
      ingredients: [
        { name: 'bacon', quantity: '100g', optional: false, productId: 'p1' },
        { name: 'lechuga', quantity: '1 ud', optional: false, productId: 'p2' },
      ],
    })
    const opts = makeOpts({
      preferences: {
        avoidFish: false,
        avoidPork: true,
        avoidDairy: false,
        maxCookingMinutes: 60,
      },
    })
    expect(scoreRecipe(recipe, opts)).toBeNull()
  })

  it('reason contains "ahora mismo" when all ingredients are available', () => {
    const recipe = makeRecipe()
    const opts = makeOpts()
    const result = scoreRecipe(recipe, opts)
    expect(result).not.toBeNull()
    expect(result!.reason).toContain('ahora mismo')
  })

  it('reason mentions missing ingredient when 1 is missing', () => {
    const recipe = makeRecipe({
      ingredients: [
        { name: 'pollo', quantity: '200g', optional: false, productId: 'p1' },
        { name: 'aguacate', quantity: '1 ud', optional: false, productId: 'p99' },
        { name: 'lechuga', quantity: '1 ud', optional: false, productId: 'p2' },
      ],
    })
    // pantry has p1 and p2 but not p99; name 'aguacate' also not in pantryProductNames
    const opts = makeOpts({
      pantryProductNames: ['pollo', 'lechuga'],
    })
    const result = scoreRecipe(recipe, opts)
    expect(result).not.toBeNull()
    expect(result!.reason).toContain('aguacate')
  })

  it('counts pantry matches by name when productId is missing', () => {
    const recipe = makeRecipe({
      ingredients: [
        { name: 'pollo', quantity: '200g', optional: false, productId: undefined },
        { name: 'lechuga', quantity: '1 ud', optional: false, productId: 'p2' },
      ],
    })
    const opts = makeOpts({
      pantryProductIds: new Set(['p2']),
      pantryProductNames: ['pechuga de pollo', 'lechuga'],
    })
    expect(scoreRecipe(recipe, opts)).not.toBeNull()
  })
})

describe('sortSuggestions', () => {
  it('sorts suggestions by score descending', () => {
    const recipe = makeRecipe()
    const low = { recipe, score: 10, availableIngredients: [], missingIngredients: [], reason: '' }
    const high = { recipe, score: 80, availableIngredients: [], missingIngredients: [], reason: '' }
    const medium = { recipe, score: 50, availableIngredients: [], missingIngredients: [], reason: '' }
    const sorted = sortSuggestions([low, high, medium])
    expect(sorted[0].score).toBe(80)
    expect(sorted[1].score).toBe(50)
    expect(sorted[2].score).toBe(10)
  })
})
