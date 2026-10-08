import { test, expect } from '@playwright/test'

test('forgot password keeps provider failure private for a valid account', async ({ page }, info) => {
  const account = await page.request.get('/api/auth/me')
  expect(account.ok()).toBe(true)
  const { email } = await account.json() as { email: string }
  const ip = `reset-privacy-${info.testId}`
  const existing = await page.request.post('/api/auth/forgot', {
    headers: { 'X-Forwarded-For': ip },
    data: { email },
  })
  const missing = await page.request.post('/api/auth/forgot', {
    headers: { 'X-Forwarded-For': ip },
    data: { email: `missing-${info.testId}@example.test` },
  })
  expect(existing.status()).toBe(200)
  expect(await existing.json()).toEqual(await missing.json())

  await page.goto('/forgot-password')
  await page.getByRole('textbox', { name: 'Email' }).fill(email)
  await page.getByRole('button', { name: 'Enviar enlace' }).click()
  await expect(page.getByRole('status')).toContainText('Si ese email tiene cuenta')
  await expect(page.getByRole('status')).not.toContainText('no existe')
})

test('recipe detail keeps existing recipes at 200 and genuine absence at 404', async ({ page }) => {
  await page.goto('/meals')
  const recipePath = await page.locator('a[href^="/recipes/"]').first().getAttribute('href')
  expect(recipePath).toBeTruthy()
  expect((await page.goto(recipePath!))?.status()).toBe(200)
  expect((await page.goto('/recipes/recipe-that-does-not-exist'))?.status()).toBe(404)
})
