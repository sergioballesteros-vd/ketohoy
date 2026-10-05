export const TERMS_VERSION = '2026-10-02'

export function hasAcceptedCurrentTerms(user: {
  termsVersion: string | null
  termsAcceptedAt: Date | null
  adultConfirmedAt: Date | null
}) {
  return user.termsVersion === TERMS_VERSION && !!user.termsAcceptedAt && !!user.adultConfirmedAt
}
