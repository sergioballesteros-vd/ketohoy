import { describe, expect, it } from 'vitest'
import { firstUseGuideStep } from '../firstUseGuide'

describe('first-use guide state derived from existing activity', () => {
  it('starts with the menu action for a new account even with default preferences and empty pantry', () => {
    expect(firstUseGuideStep(false, false, false)).toBe(2)
  })

  it('moves to shopping only after a complete current plan exists', () => {
    expect(firstUseGuideStep(true, true, false)).toBe(3)
  })

  it('stops after a weekly-plan shopping snapshot exists', () => {
    expect(firstUseGuideStep(true, true, true)).toBeNull()
  })

  it('does not restart for an account with older or incomplete plan history', () => {
    expect(firstUseGuideStep(true, false, false)).toBeNull()
  })
})
