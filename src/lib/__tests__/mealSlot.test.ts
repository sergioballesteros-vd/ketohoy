import { describe, it, expect } from 'vitest'
import { getMealSlot, getGreeting } from '../mealSlot'

describe('getMealSlot', () => {
  it.each([[0, 'breakfast'], [11, 'breakfast'], [12, 'lunch'], [16, 'lunch'], [17, 'dinner'], [23, 'dinner']] as const)(
    'hour %i -> %s',
    (h, slot) => expect(getMealSlot(h)).toBe(slot)
  )
})

describe('getGreeting', () => {
  it('prompt always matches the meal slot', () => {
    const word = { breakfast: 'desayunar', lunch: 'comer', dinner: 'cenar' }
    for (let h = 0; h < 24; h++) expect(getGreeting(h).sub).toContain(word[getMealSlot(h)])
  })
  it('salutation by hour', () => {
    expect(getGreeting(11).text).toBe('Buenos días')
    expect(getGreeting(12).text).toBe('Buenas tardes')
    expect(getGreeting(20).text).toBe('Buenas tardes')
    expect(getGreeting(21).text).toBe('Buenas noches')
  })
})
