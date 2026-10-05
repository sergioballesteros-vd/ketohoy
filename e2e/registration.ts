import { randomUUID } from 'node:crypto'

// Explicit consent mirrors the production registration contract.
export function registrationData(prefix = 'e2e') {
  return { email: `${prefix}-${randomUUID()}@example.com`, password: 'e2e-password-123', confirmAdult: true, acceptTerms: true }
}
