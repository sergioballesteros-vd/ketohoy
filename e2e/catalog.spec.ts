import { test, expect } from '@playwright/test'
import { classifyProduct } from '../src/lib/productClassification'
import { MERCADONA_CATEGORIES } from '../src/lib/categories'

const product = (name: string) => ({ id: name, mercadonaId: name, name, brand: 'Mercadona', source: 'mercadona', category: 'meat', ketoScore: 5, classification: classifyProduct({ name, category: 'meat' }), unitPrice: 1, referencePrice: null, imageUrl: null, tags: '[]' })

test.beforeEach(async ({ page }, info) => {
  await page.setExtraHTTPHeaders({ 'X-Forwarded-For': `127.12.0.${info.parallelIndex + 80}` })
})

test('visible category chips match API contract', async ({ page }) => {
  await page.goto('/explore')
  for (const { key, label } of MERCADONA_CATEGORIES) {
    const response = page.waitForResponse(r => r.url().endsWith(`/api/mercadona/category/${key}`))
    await page.getByRole('button', { name: label, exact: true }).click()
    const res = await response
    expect(res.status()).toBe(200)
    expect(Array.isArray((await res.json()).products)).toBe(true)
  }
  for (const label of ['Fruta', 'Bebidas', 'Otros']) await expect(page.getByRole('button', { name: label, exact: true })).toHaveCount(0)
})

test('503 retry preserves category, subcategory and search context', async ({ page }) => {
  let failed = true
  const requests: string[] = []
  await page.route('**/api/mercadona/**', async route => {
    const url = route.request().url(); requests.push(url)
    await route.fulfill({ status: failed ? 503 : 200, json: { products: [product('Pollo fixture')] } })
  })
  await page.goto('/explore')
  await page.getByRole('button', { name: 'Carne', exact: true }).click()
  await page.getByRole('button', { name: 'Pollo', exact: true }).click()
  await expect(page.getByText('No se pudo cargar el catálogo')).toBeVisible()
  failed = false
  await page.getByRole('button', { name: 'Reintentar' }).click()
  await expect(page.getByText('Pollo fixture', { exact: true })).toBeVisible()
  expect(requests.at(-1)).toContain('/category/meat')
  await expect(page.getByRole('button', { name: 'Carne', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('button', { name: 'Pollo', exact: true })).toHaveAttribute('aria-pressed', 'true')
  failed = true
  await page.getByRole('searchbox').fill('almendras')
  await page.getByRole('searchbox').press('Enter')
  await expect(page.getByText('No se pudo cargar el catálogo')).toBeVisible()
  const failedUrl = requests.at(-1)
  failed = false
  await page.getByRole('button', { name: 'Reintentar' }).click()
  await expect(page.getByText('Pollo fixture', { exact: true })).toBeVisible()
  expect(requests.at(-1)).toBe(failedUrl)
  await expect(page.getByRole('searchbox')).toHaveValue('almendras')
})

test('latest category wins reversed responses and obsolete errors', async ({ page }) => {
  await page.route('**/api/mercadona/**', async route => {
    const url = route.request().url()
    await new Promise(resolve => setTimeout(resolve, url.includes('/fish') ? 1000 : 50))
    await route.fulfill({ json: { products: [product(url.includes('/fish') ? 'Resultado pescado' : 'Resultado carne')] } })
  })
  await page.goto('/explore')
  await expect(page.getByText('Resultado carne', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Pescado', exact: true }).click()
  await page.getByRole('button', { name: 'Carne', exact: true }).click()
  await expect(page.getByText('Resultado carne', { exact: true })).toBeVisible()
  await page.waitForTimeout(1200) // Deliberately allow the obsolete response to arrive.
  await expect(page.getByText('Resultado pescado', { exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Carne', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0)
  await expect(page.getByText('No se pudo cargar el catálogo')).toHaveCount(0)
})

test('Enter deduplicates debounce, clearing invalidates pending search, unmount aborts', async ({ page }) => {
  let searches = 0
  let delayed = false
  await page.route('**/api/mercadona/search?*', async route => {
    const searching = new URL(route.request().url()).searchParams.get('q') === 'pollo'
    if (searching) { searches++; delayed = true; await new Promise(resolve => setTimeout(resolve, 1000)) }
    await route.fulfill({ json: { products: [product(searching ? 'Busqueda antigua' : 'Selección actual')] } })
  })
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message))
  await page.goto('/explore')
  await expect(page.getByText('Selección actual', { exact: true })).toBeVisible()
  await page.getByRole('searchbox').fill('pollo')
  await page.getByRole('searchbox').press('Enter')
  await page.waitForTimeout(550)
  expect(delayed).toBe(true); expect(searches).toBe(1)
  await page.getByRole('button', { name: 'Borrar búsqueda' }).click()
  await expect(page.getByText('Selección actual', { exact: true })).toBeVisible()
  await page.waitForTimeout(1100)
  await expect(page.getByText('Busqueda antigua', { exact: true })).toHaveCount(0)
  await expect(page.getByText('No se pudo cargar el catálogo')).toHaveCount(0)
  await page.getByRole('searchbox').fill('pollo')
  await page.getByRole('searchbox').press('Enter')
  await page.getByRole('link', { name: /Despensa/ }).first().click()
  await page.waitForTimeout(1100)
  expect(errors).toEqual([])
})

test('obsolete failure does not clear current loading or show an abort error', async ({ page }) => {
  await page.route('**/api/mercadona/**', async route => {
    const fish = route.request().url().includes('/fish')
    const meat = route.request().url().includes('/meat')
    await new Promise(resolve => setTimeout(resolve, fish ? 200 : meat ? 800 : 0))
    await route.fulfill({ status: fish ? 503 : 200, json: { products: [product('Consulta vigente')] } })
  })
  await page.goto('/explore')
  await expect(page.getByText('Consulta vigente', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Pescado', exact: true }).click()
  await page.getByRole('button', { name: 'Carne', exact: true }).click()
  await page.waitForTimeout(350)
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(1)
  await expect(page.getByText('No se pudo cargar el catálogo')).toHaveCount(0)
  await expect(page.getByText('Consulta vigente', { exact: true })).toBeVisible()
})

for (const width of [320, 390, 1280]) {
  test(`classification cards and detail stay legible at ${width}`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 844 })
    if (width === 320) await page.emulateMedia({ reducedMotion: 'reduce' })
    const breaded = { ...product('Pollo rebozado Crispy'), ketoScore: 2, classification: classifyProduct({ name: 'Pollo rebozado Crispy', category: 'meat' }) }
    const unknown = { ...product('Producto sin identificar'), ketoScore: 0, classification: classifyProduct({ name: 'Producto sin identificar', category: 'other' }) }
    const nutrition = { ...product('Bebida de almendras'), classification: classifyProduct({ name: 'Bebida de almendras', category: 'drinks', netCarbs: 2 }), netCarbsPer100g: 2 }
    const errors: string[] = []; page.on('pageerror', e => errors.push(e.message))
    await page.route('**/api/mercadona/**', route => route.fulfill({ json: route.request().url().includes('/product/') ? breaded : { products: [breaded, unknown, nutrition] } }))
    await page.goto('/explore')
    await expect(page.getByText('Estimación por categoría', { exact: true })).toBeVisible()
    await expect(page.getByText('Sin datos nutricionales', { exact: true })).toBeVisible()
    await expect(page.getByText('Muy keto', { exact: true })).toHaveCount(1)
    const label = page.getByText('Estimación por categoría', { exact: true })
    expect(await label.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ animations: 'disabled', path: info.outputPath(`catalog-${width}.png`) })
    const category = page.getByRole('button', { name: 'Carne', exact: true })
    await category.focus(); await page.keyboard.press('Space')
    await expect(category).toHaveAttribute('aria-pressed', 'true')
    const trigger = page.locator('main ul li').first().getByRole('button').filter({ hasText: '€' })
    await trigger.focus(); await page.keyboard.press('Enter')
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    const firstButton = dialog.getByRole('button').first()
    const lastButton = dialog.getByRole('button').last()
    await firstButton.focus(); await page.keyboard.press('Shift+Tab')
    await expect(lastButton).toBeFocused()
    await page.keyboard.press('Tab'); await expect(firstButton).toBeFocused()
    await expect(dialog.getByText('Estimación por categoría', { exact: true })).toBeVisible()
    await expect(dialog.getByText('Muy keto', { exact: true })).toHaveCount(0)
    expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true)
    await page.screenshot({ animations: 'disabled', path: info.outputPath(`detail-${width}.png`) })
    await page.keyboard.press('Escape'); await expect(trigger).toBeFocused()
    expect(errors).toEqual([])
  })
}
