import { test, expect } from '@playwright/test'

test.use({ storageState: { cookies: [], origins: [] } })

test('anonymous visitors are redirected to /login and API returns 401', async ({ page, request }) => {
  await page.goto('/inventory')
  await expect(page).toHaveURL(/\/login$/)
  expect((await request.get('/api/pantry')).status()).toBe(401)
})

test('register via UI, see own empty data, log out, log back in', async ({ page }) => {
  const email = `ui-${Date.now()}@example.com`
  await page.goto('/login')
  await page.getByRole('button', { name: /Regístrate/ }).click()
  await page.getByPlaceholder('Email').fill(email)
  await page.getByPlaceholder(/Contraseña/).fill('ui-password-123')
  await page.getByRole('button', { name: 'Crear cuenta' }).click()
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByText('en casa')).toBeVisible()

  // A fresh account starts with an empty pantry and shopping list.
  expect(await (await page.request.get('/api/pantry')).json()).toEqual([])

  await page.goto('/preferences')
  await page.getByRole('button', { name: 'Cerrar sesión' }).click()
  await expect(page).toHaveURL(/\/login$/)

  await page.getByPlaceholder('Email').fill(email)
  await page.getByPlaceholder('Contraseña').fill('wrong-password')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page.getByText('Email o contraseña incorrectos')).toBeVisible()

  await page.getByPlaceholder('Contraseña').fill('ui-password-123')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page).toHaveURL(/\/$/)
})
