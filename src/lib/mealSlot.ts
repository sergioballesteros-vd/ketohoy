export type MealSlot = 'breakfast' | 'lunch' | 'dinner'

/** Single source of truth for "which meal is it": <12 breakfast, <17 lunch, else dinner. */
export function getMealSlot(hour: number): MealSlot {
  if (hour < 12) return 'breakfast'
  if (hour < 17) return 'lunch'
  return 'dinner'
}

const PROMPT: Record<MealSlot, string> = {
  breakfast: '¿Qué te apetece desayunar?',
  lunch: '¿Qué te apetece comer hoy?',
  dinner: '¿Qué te apetece cenar?',
}

export function getGreeting(hour: number) {
  const slot = getMealSlot(hour)
  const text = hour < 12 ? 'Buenos días' : hour < 21 ? 'Buenas tardes' : 'Buenas noches'
  return { text, sub: hour >= 21 ? '¿Ya sabes qué cenar?' : PROMPT[slot] }
}
