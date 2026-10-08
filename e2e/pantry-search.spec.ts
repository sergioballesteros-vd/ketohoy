import { expect, test } from '@playwright/test'
import { registrationData } from './registration'

test.use({ storageState: { cookies: [], origins: [] } })

test('KH-029 local pantry search filters, clears, counts, and preserves delete/undo', async ({ page }, info) => {
  expect((await page.request.post('/api/auth/register', { data: registrationData('pantry-search'), headers: { 'X-Forwarded-For': info.testId } })).status()).toBe(201)

  const names = ['Pechuga de pollo', 'Atún en lata', 'Queso curado']
  for (let index = 0; index < 147; index++) names.push(`Producto de prueba ${String(index + 1).padStart(3, '0')}`)
  for (const name of names) {
    const product = await (await page.request.post('/api/products', { data: { name, category: 'other' } })).json()
    expect((await page.request.post('/api/pantry', { data: { productId: product.id, quantity: 2, unit: 'ud' } })).ok()).toBe(true)
  }

  let pantryGets = 0
  await page.route('**/api/pantry', async route => {
    if (route.request().method() === 'GET') pantryGets++
    await route.continue()
  })
  await page.goto('/inventory')
  await expect(page.getByLabel('Buscar en tu despensa')).toBeVisible()
  await expect(page.getByText('150 productos', { exact: true })).toBeVisible()
  await expect.poll(() => pantryGets).toBe(1)
  const getsBeforeSearch = pantryGets

  const search = page.getByLabel('Buscar en tu despensa')
  await search.fill('  POLLO ')
  await expect(page.getByRole('button', { name: /Pechuga de pollo/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /Atún en lata/ })).toHaveCount(0)
  await expect(page.getByText('1 de 150 productos')).toBeVisible()
  await expect.poll(() => pantryGets).toBe(getsBeforeSearch)

  await search.fill('atun')
  expect(pantryGets).toBe(getsBeforeSearch)
  const tuna = page.getByRole('button', { name: /Atún en lata/ })
  await expect(tuna).toBeVisible()
  await expect(page.getByText('1 de 150 productos')).toBeVisible()
  await tuna.click()
  await page.getByLabel('Cantidad').fill('7')
  await page.getByRole('button', { name: 'Guardar cambios' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(tuna).toContainText('7 ud')
  await expect(search).toHaveValue('atun')
  await expect(page.getByText('1 de 150 productos')).toBeVisible()
  await tuna.click()
  await page.getByRole('button', { name: 'Quitar de la despensa' }).click()
  await expect(tuna).toHaveCount(0)
  await expect(page.getByText('No encontramos nada en tu despensa para “atun”.')).toBeVisible()
  await expect(page.getByText('Tu despensa está vacía')).toHaveCount(0)
  await expect(page.getByText('0 de 149 productos')).toBeVisible()

  await page.getByRole('button', { name: 'Deshacer', exact: true }).click()
  await expect(page.getByRole('button', { name: /Atún en lata/ })).toBeVisible()
  await expect(page.getByText('1 de 150 productos')).toBeVisible()
  await expect(search).toHaveValue('atun')
  const getsAfterCrud = pantryGets

  for (const width of [320, 390, 768, 1280, 1440]) {
    await page.setViewportSize({ width, height: 844 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  }

  await page.emulateMedia({ reducedMotion: 'reduce' })
  await search.fill('pol')
  await expect(page.getByRole('button', { name: /Pechuga de pollo/ })).toBeVisible()
  expect(pantryGets).toBe(getsAfterCrud)
  const clear = page.getByRole('button', { name: 'Limpiar búsqueda' }).first()
  await clear.focus()
  await clear.press('Enter')
  expect(pantryGets).toBe(getsAfterCrud)
  await expect(search).toBeFocused()
  await expect(search).toHaveValue('')
  await expect(page.getByRole('button', { name: /Pechuga de pollo/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /Atún en lata/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /Queso curado/ })).toBeVisible()
  expect(pantryGets).toBe(getsAfterCrud)
})
