import { Apple, Beef, Carrot, CupSoda, Droplets, Egg, Ellipsis, Fish, Milk, Nut, UtensilsCrossed } from 'lucide-react'

// Product category keys are the stored data model (see ketoRules ProductCategory); label/icon are display only.
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
