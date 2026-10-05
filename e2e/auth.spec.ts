import { test, expect } from '@playwright/test'

test.use({ storageState: { cookies: [], origins: [] } })

test('anonymous visitors are redirected to /login and API returns 401', async ({ page, request }) => {
  await page.goto('/inventory')
  await expect(page).toHaveURL(/\/login$/)
  expect((await request.get('/api/pantry')).status()).toBe(401)
})

test('signed-out home is the landing, with sign-up CTA and no app tab bar', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Menú keto semanal')
  await expect(page.getByRole('navigation', { name: 'Principal' })).toHaveCount(0)
  await page.getByRole('link', { name: 'Crear cuenta gratis' }).first().click()
  await expect(page.getByRole('group', { name: 'Acceso a tu cuenta' }).getByRole('button', { name: 'Crear cuenta' })).toHaveAttribute('aria-pressed', 'true')
})

test('register via UI, see own empty data, log out, log back in', async ({ page }) => {
  const email = `ui-${Date.now()}@example.com`
  await page.goto('/login')
  await page.getByRole('group', { name: 'Acceso a tu cuenta' }).getByRole('button', { name: 'Crear cuenta' }).click()
  await page.getByLabel('Email').fill(email)
  await page.getByLabel(/^Contraseña/).fill('ui-password-123')
  const submit = page.getByRole('button', { name: 'Crear mi cuenta' })
  await submit.click()
  await expect(page).toHaveURL(/\/login/)
  await page.getByRole('checkbox', { name: /18/ }).check()
  await submit.click()
  await expect(page).toHaveURL(/\/login/)
  await page.getByRole('checkbox', { name: /Acepto los/ }).check()
  await submit.click()
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByText('Añade lo que tienes')).toBeVisible()

  // A fresh account starts with an empty pantry and shopping list.
  expect(await (await page.request.get('/api/pantry')).json()).toEqual([])

  await page.goto('/preferences')
  await page.getByRole('button', { name: 'Cerrar sesión' }).click()
  await expect(page).toHaveURL(/\/login$/)

  await page.getByLabel('Email').fill(email)
  await page.getByLabel(/^Contraseña/).fill('wrong-password')
  await page.locator('form').getByRole('button', { name: 'Entrar' }).click()
  await expect(page.getByText('Email o contraseña incorrectos')).toBeVisible()

  await page.getByLabel(/^Contraseña/).fill('ui-password-123')
  await page.locator('form').getByRole('button', { name: 'Entrar' }).click()
  await expect(page).toHaveURL(/\/$/)
})

test('registration without explicit consent is rejected', async ({ request }) => {
  const response = await request.post('/api/auth/register', {
    data: { email: `no-consent-${Date.now()}@example.com`, password: 'e2e-password-123' },
  })
  expect(response.status()).toBe(400)
  expect((await request.get('/api/auth/me')).status()).toBe(401)
})
