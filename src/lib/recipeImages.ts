export type ReviewedRecipeImage = {
  url: string
  photographer: string
  photographerUrl: string
  photoUrl: string
  illustrative?: true
}

export const landingRecipeReview = [
  { title: 'Huevos revueltos con bacon y aguacate', decision: 'PLACEHOLDER' },
  { title: 'Tortilla de queso y jamón', decision: 'ILLUSTRATIVE' },
  { title: 'Huevos fritos con bacon', decision: 'KEEP' },
  { title: 'Revuelto de espinacas y queso', decision: 'PLACEHOLDER' },
] as const

const reviewedImages: Record<string, ReviewedRecipeImage> = {
  'Tortilla de queso y jamón': {
    url: 'https://images.unsplash.com/photo-1639669794539-952631b44515?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w5ODkzNzR8MHwxfHNlYXJjaHwyfHxzcGFuaXNoJTIwY2hlZXNlJTIwaGFtJTIwb21lbGV0dGV8ZW58MHwwfHx8MTc5MTQ0ODAzMHww&ixlib=rb-4.1.0&q=80&w=1080',
    photographer: 'blackieshoot',
    photographerUrl: 'https://unsplash.com/@blackieshoot?utm_source=ketohoy&utm_medium=referral',
    photoUrl: 'https://unsplash.com/photos/a-close-up-of-a-piece-of-food-on-a-plate-z4CQtd07u5k?utm_source=ketohoy&utm_medium=referral',
    illustrative: true,
  },
  'Huevos fritos con bacon': {
    url: 'https://images.unsplash.com/photo-1608475861994-cf7af0f0c1be?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w5ODkzNzR8MHwxfHNlYXJjaHwxfHxmcmllZCUyMGVnZ3MlMjBiYWNvbnxlbnwwfDB8fHwxNzkxNDQ4MDMwfDA&ixlib=rb-4.1.0&q=80&w=1080',
    photographer: 'James Kern',
    photographerUrl: 'https://unsplash.com/@jamesrkern?utm_source=ketohoy&utm_medium=referral',
    photoUrl: 'https://unsplash.com/photos/fried-egg-on-black-pan-aLDW0oQ0NtU?utm_source=ketohoy&utm_medium=referral',
  },
}

export function reviewedRecipeImage(title: string) {
  return reviewedImages[title] ?? null
}

export function recipeMetadataImage(title: string) {
  const image = reviewedRecipeImage(title)
  return image && !image.illustrative ? image.url : undefined
}
