export function firstUseGuideStep(hasAnyPlan: boolean, currentPlanComplete: boolean, hasPreparedShopping: boolean): 2 | 3 | null {
  if (hasPreparedShopping) return null
  if (currentPlanComplete) return 3
  return hasAnyPlan ? null : 2
}
