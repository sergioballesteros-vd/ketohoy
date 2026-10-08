import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import { registrationData } from './registration'

test('exports current-device favorites and deletes only the confirmed account', async ({ page }, info) => {
  const credentials = registrationData('account-lifecycle')
  expect((await page.request.post('/api/auth/register', { data: credentials, headers: { 'X-Forwarded-For': `account-${info.testId}` } })).status()).toBe(201)
  const productResponse = await page.request.post('/api/products', {
    data: { name: 'KH030 private favorite', category: 'nuts' },
  })
  expect(productResponse.status()).toBe(201)
  const privateProduct = await productResponse.json()
  await page.setViewportSize({ width: 320, height: 844 })
  await page.goto('/preferences')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.evaluate(id => localStorage.setItem('ketohoy:favoriteProductIds', JSON.stringify([id])), privateProduct.id)

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exportar mis datos' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe('ketohoy-data-export.json')
  const exported = JSON.parse(readFileSync((await download.path())!, 'utf8'))
  expect(exported.account.email).toBe(credentials.email)
  expect(exported.manualProducts.map((product: { name: string }) => product.name)).toContain('KH030 private favorite')
  expect(exported.favorites.map((product: { name: string }) => product.name)).toContain('KH030 private favorite')

  await page.setViewportSize({ width: 390, height: 844 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.setViewportSize({ width: 1280, height: 800 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.setViewportSize({ width: 320, height: 844 })
  const deleteDisclosure = page.getByText('Eliminar cuenta', { exact: true })
  await deleteDisclosure.focus()
  await page.keyboard.press('Enter')
  await page.getByLabel('Escribe tu email para confirmar').fill(credentials.email)
  await page.getByLabel('Contraseña actual (si tu cuenta tiene contraseña)').fill(credentials.password)
  const deletion = page.waitForResponse(response => response.url().endsWith('/api/account/delete') && response.request().method() === 'POST')
  await page.getByRole('button', { name: 'Eliminar permanentemente mi cuenta' }).click()
  expect((await deletion).status()).toBe(200)
  await expect(page).toHaveURL(/\/login$/)
  expect(await page.evaluate(() => localStorage.getItem('ketohoy:favoriteProductIds'))).toBeNull()
})
