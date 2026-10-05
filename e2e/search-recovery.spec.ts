import { test, expect } from '@playwright/test'

for (const path of ['/inventory', '/shopping-list']) {
  test(`KH-018 clear/short/error/replacement and Enter ${path}`, async ({ page }) => {
    let release!: () => void
    let count = 0
    let mode = 'slow'
    await page.route('**/api/mercadona/search?*', async route => {
      count++
      const requestMode = mode
      const query = new URL(route.request().url()).searchParams.get('q')
      if (requestMode === 'slow') await new Promise<void>(resolve => { release = resolve })
      await route.fulfill({ status: requestMode === 'error' ? 500 : 200, json: { products: requestMode === 'slow' ? [{ id: query, mercadonaId: query, name: 'Resultado obsoleto', category: 'other', ketoScore: 0, unitPrice: null, imageUrl: null }] : [] } }).catch(() => {})
    })
    await page.goto(path)
    await page.getByRole('button', { name: 'Añadir', exact: true }).click()
    const dialog = page.getByRole('dialog')
    const input = dialog.getByRole('searchbox')
    await input.fill('po')
    await expect.poll(() => count).toBe(1)
    await expect(dialog.locator('.animate-spin')).toHaveCount(1)
    await input.fill('p')
    await expect(dialog.locator('.animate-spin')).toHaveCount(0)
    release()
    await page.waitForTimeout(500)
    await expect(dialog.getByText(/Sin resultados/)).toHaveCount(0)
    expect(count).toBe(1)
    await expect(dialog.getByText('Resultado obsoleto')).toHaveCount(0)
    await input.fill('pollo')
    await expect.poll(() => count).toBe(2)
    await input.fill('')
    await expect(dialog.locator('.animate-spin')).toHaveCount(0)
    release()
    await page.waitForTimeout(500)
    await expect(dialog.getByText('Resultado obsoleto')).toHaveCount(0)
    mode = 'error'
    await input.fill('pollo')
    await expect(dialog.getByRole('alert')).toContainText('No se pudo buscar')
    await input.fill('')
    await expect(dialog.getByRole('alert')).toHaveCount(0)
    await expect(dialog.locator('.animate-spin')).toHaveCount(0)
    mode = 'slow'
    await input.fill('queso')
    await expect.poll(() => count).toBe(4)
    await input.fill('huevos')
    release()
    mode = 'success'
    await input.press('Enter')
    await expect(dialog.getByText('Sin resultados para “huevos”.')).toBeVisible()
    await page.waitForTimeout(500)
    expect(count).toBe(5)
    await expect(dialog.getByText('Resultado obsoleto')).toHaveCount(0)
  })
}
