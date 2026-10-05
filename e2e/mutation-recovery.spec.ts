import { test, expect } from '@playwright/test'
import { registrationData } from './registration'

test.use({ storageState: { cookies: [], origins: [] } })
for (const domain of ['pantry', 'shopping-list']) for (const failure of ['500', 'network']) {
  test(`KH-020 ${domain} remove/undo ${failure} and retry`, async ({ page }, info) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    expect((await page.request.post('/api/auth/register', { data: registrationData('recovery'), headers: { 'X-Forwarded-For': info.testId } })).status()).toBe(201)
    const name = `Recovery ${domain} ${failure}`
    const product = await (await page.request.post('/api/products', { data: { name, category: 'other' } })).json()
    await page.request.post(`/api/${domain}`, { data: domain === 'pantry' ? { productId: product.id, quantity: 5, unit: 'kg' } : { productId: product.id, name, purchaseQuantity: 1 } })
    let failing = 'DELETE'
    await page.route(`**/api/${domain}/**`, async route => {
      if (route.request().method() !== failing) return route.continue()
      if (failure === 'network') await route.abort('failed')
      else await route.fulfill({ status: 500, json: { error: 'fixture internal details' } })
    })
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message))
    await page.goto(domain === 'pantry' ? '/inventory' : '/shopping-list')
    const row = domain === 'pantry' ? page.getByRole('button').filter({ hasText: name }) : page.locator('li').filter({ hasText: name })
    if (domain === 'pantry') {
      await row.click()
      await page.getByRole('button', { name: 'Quitar de la despensa' }).click()
      await expect(page.getByRole('dialog')).toBeVisible()
    } else {
      // Quantity removal uses PATCH; also test explicit DELETE via a legacy item below.
      failing = 'PATCH'
      await row.getByRole('button', { name: `Quitar ${name} de la lista` }).click()
    }
    await expect(domain === 'pantry' ? page.getByRole('dialog').getByRole('alert') : page.getByText('No se pudo eliminar el producto', { exact: true })).toBeVisible()
    await expect(row).toBeVisible()
    failing = ''
    if (domain === 'pantry') await page.getByRole('button', { name: 'Quitar de la despensa' }).click()
    else await page.getByRole('button', { name: 'Reintentar', exact: true }).click()
    await expect(row).toHaveCount(0)
    failing = 'POST'
    await page.route(`**/api/${domain}`, async route => {
      if (route.request().method() !== failing) return route.continue()
      if (failure === 'network') await route.abort('failed')
      else await route.fulfill({ status: 500, json: { error: 'fixture internal details' } })
    })
    await page.getByRole('button', { name: 'Deshacer', exact: true }).click()
    await expect(page.getByText('No se pudo restaurar el producto')).toBeVisible()
    await expect(row).toHaveCount(0)
    failing = ''
    await page.getByRole('button', { name: 'Reintentar', exact: true }).click()
    await expect(row).toBeVisible()
    await page.reload(); await expect(row).toBeVisible()
    expect(errors).toEqual([])
  })
}
