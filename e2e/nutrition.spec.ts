import { test, expect } from '@playwright/test'
import { classifyProduct } from '../src/lib/productClassification'

for (const width of [320, 1280]) {
  test(`KH-025 available carbs and ambiguous legacy confidence at ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 })
    if (width === 320) await page.emulateMedia({ reducedMotion: 'reduce' })
    const errors: string[] = []
    page.on('pageerror', e => errors.push(e.message))
    const almond = { mercadonaId: 'kh025', name: 'Almendras KH025', category: 'nuts', ketoScore: 4, unitPrice: 2, imageUrl: null, brand: null, netCarbsPer100g: 5.9, classification: classifyProduct({ name: 'Almendras KH025', category: 'nuts', netCarbs: 5.9 }) }
    await page.route('**/api/mercadona/**', route => route.fulfill({ json: route.request().url().includes('/product/') ? almond : { products: [almond] } }))
    await page.goto('/explore')
    await expect(page).toHaveURL(/\/explore/)
    const trigger = page.locator('main ul li').first().getByRole('button').filter({ hasText: '€' })
    await trigger.focus(); await page.keyboard.press('Enter')
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByText('Keto', { exact: true })).toBeVisible()
    await expect(dialog.getByText(/carbohidratos disponibles, sin fibra \(5,9 g por 100 g\/ml\)/)).toBeVisible()
    await expect(dialog.getByText('Muy keto', { exact: true })).toHaveCount(0)
    await page.keyboard.press('Escape'); await expect(trigger).toBeFocused()

    // Legacy values are retained in storage for recovery, but cannot be displayed as reliable net carbs.
    const legacy = { id: 'kh025-legacy', productId: 'legacy-product', quantity: null, unit: null, product: { id: 'legacy-product', name: 'Legacy KH025', category: 'nuts', mercadonaId: null, imageUrl: null, unitPrice: null, ketoScore: 0, nutritionSource: 'openfoodfacts', nutritionConvention: 'unknown', netCarbsPer100g: 2, fatPer100g: 10, proteinPer100g: 1, caloriesPer100g: null } }
    await page.route('**/api/pantry', route => route.fulfill({ json: [legacy] }))
    await page.goto('/inventory')
    await page.getByRole('button').filter({ hasText: 'Legacy KH025' }).click()
    await expect(dialog.getByText('Sin datos nutricionales', { exact: true })).toBeVisible()
    await expect(dialog.getByText(/Sin datos nutricionales suficientes/)).toBeVisible()
    await expect(dialog.getByText('Carbos disponibles', { exact: true })).toHaveCount(0)
    await expect(dialog.getByText('Carbos netos', { exact: true })).toHaveCount(0)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: `/tmp/kh025-legacy-${width}.png`, animations: 'disabled' })
    await page.keyboard.press('Escape')
    await page.unroute('**/api/pantry')
    const verified = { ...legacy, product: { ...legacy.product, name: 'Almendras verificadas KH025', ketoScore: 4, nutritionConvention: 'available_excluding_fiber', netCarbsPer100g: 5.9 } }
    await page.route('**/api/pantry', route => route.fulfill({ json: [verified] }))
    await page.reload()
    await page.getByRole('button').filter({ hasText: 'Almendras verificadas KH025' }).click()
    await expect(dialog.getByText('Carbos disponibles', { exact: true })).toBeVisible()
    await expect(dialog.getByText('5,9', { exact: false }).first()).toBeVisible()
    await expect(dialog.getByText('Keto', { exact: true })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: `/tmp/kh025-verified-${width}.png`, animations: 'disabled' })
    await page.keyboard.press('Escape')
    expect(errors).toEqual([])
  })
}
