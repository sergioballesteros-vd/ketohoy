import { registrationData } from './registration'
import { test as setup, expect } from '@playwright/test'

export const AUTH_FILE = 'playwright/.auth/user.json'

// One throwaway account per run; every other spec reuses its session.
setup('register a test user', async ({ request }) => {
  const res = await request.post('/api/auth/register', {
    data: registrationData(),
  })
  expect(res.status()).toBe(201)
  await request.storageState({ path: AUTH_FILE })
})
