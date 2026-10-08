import { Apple, Beef, Carrot, CupSoda, Droplets, Egg, Ellipsis, Fish, Milk, Nut, UtensilsCrossed } from 'lucide-react'

// Product category keys are the stored data model (see ketoRules ProductCategory); label/icon are display only.
export const PRODUCT_CATEGORIES = ['meat', 'fish', 'eggs', 'dairy', 'vegetables', 'fruit', 'nuts', 'oils', 'sauces', 'drinks', 'other'] as const
export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number]

export const CATEGORIES = [
  { key: 'meat', label: 'Carne', icon: Beef },
  { key: 'fish', label: 'Pescado', icon: Fish },
  { key: 'eggs', label: 'Huevos', icon: Egg },
  { key: 'dairy', label: 'Lácteos', icon: Milk },
  { key: 'vegetables', label: 'Verduras', icon: Carrot },
  { key: 'fruit', label: 'Fruta', icon: Apple },
  { key: 'nuts', label: 'Frutos secos', icon: Nut },
  { key: 'oils', label: 'Aceites', icon: Droplets },
  { key: 'sauces', label: 'Salsas', icon: UtensilsCrossed },
  { key: 'drinks', label: 'Bebidas', icon: CupSoda },
  { key: 'other', label: 'Otros', icon: Ellipsis },
] as const

export const categoryOf = (key: string) => CATEGORIES.find(c => c.key === key) ?? CATEGORIES[CATEGORIES.length - 1]

// Pantry supports more categories than the external catalog's curated queries.
export const MERCADONA_CATEGORY_QUERIES = {
  meat: ['pollo', 'ternera', 'pavo'],
  fish: ['salmón', 'atún', 'merluza'],
  eggs: ['huevos'],
  dairy: ['queso', 'yogur griego', 'nata'],
  vegetables: ['espinacas', 'brócoli', 'lechuga'],
  nuts: ['almendras', 'nueces'],
  oils: ['aceite oliva', 'aceite coco'],
  sauces: ['mayonesa', 'mostaza'],
} as const

export type MercadonaCategory = keyof typeof MERCADONA_CATEGORY_QUERIES
export const isMercadonaCategory = (key: string): key is MercadonaCategory =>
  Object.hasOwn(MERCADONA_CATEGORY_QUERIES, key)
export const MERCADONA_CATEGORIES = CATEGORIES.filter(c => isMercadonaCategory(c.key))
