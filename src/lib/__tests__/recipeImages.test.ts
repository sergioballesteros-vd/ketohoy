import { describe, expect, it } from 'vitest'
import { landingRecipeReview, recipeMetadataImage, reviewedRecipeImage } from '../recipeImages'

describe('reviewed recipe images', () => {
  it('keeps the current four landing recipes on an explicit review list', () => {
    expect(landingRecipeReview.map(({ title }) => title)).toEqual([
      'Huevos revueltos con bacon y aguacate',
      'Tortilla de queso y jamón',
      'Huevos fritos con bacon',
      'Revuelto de espinacas y queso',
    ])
    expect(landingRecipeReview.map(({ decision }) => decision)).toEqual([
      'PLACEHOLDER', 'ILLUSTRATIVE', 'KEEP', 'PLACEHOLDER',
    ])
  })

  it('uses only reviewed photos and excludes illustrative photos from metadata', () => {
    expect(reviewedRecipeImage('Huevos revueltos con bacon y aguacate')).toBeNull()
    expect(reviewedRecipeImage('Revuelto de espinacas y queso')).toBeNull()
    expect(reviewedRecipeImage('Tortilla de queso y jamón')?.illustrative).toBe(true)
    expect(reviewedRecipeImage('Huevos fritos con bacon')?.photographer).toBe('James Kern')
    expect(recipeMetadataImage('Tortilla de queso y jamón')).toBeUndefined()
    expect(recipeMetadataImage('Huevos fritos con bacon')).toContain('images.unsplash.com/photo-1608475861994-cf7af0f0c1be')
    expect(reviewedRecipeImage('Un plato no revisado')).toBeNull()
  })
})
