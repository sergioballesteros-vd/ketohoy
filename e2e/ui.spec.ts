import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.setExtraHTTPHeaders({ 'X-Forwarded-For': '127.0.0.2' })
})

test('recipes: filter chips toggle, clear resets, a card opens its recipe', async ({ page }) => {
  await page.goto('/meals')
  const cards = page.locator('main ul li')
  await expect(cards.first()).toBeVisible({ timeout: 15_000 })

  const snack = page.getByRole('button', { name: 'Snack' })
  await snack.click()
  await expect(snack).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('button', { name: 'Limpiar' })).toBeVisible()

  await page.getByRole('button', { name: 'Limpiar' }).click()
  await expect(page.getByRole('button', { name: 'Limpiar' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Todas' })).toHaveAttribute('aria-pressed', 'true')

  await cards.first().locator('h2').click()
  await expect(page).toHaveURL(/\/recipes\/.+/)
})

test('explore: "+" becomes a stepper, "−" goes back to "+" (quantity PATCH with negative delta)', async ({ page }) => {
  await page.goto('/explore')
  const added = page.waitForResponse(response => response.url().endsWith('/api/mercadona/add'))
  await page.getByRole('button', { name: /^Añadir .* a la lista$/ }).first().click()
  const response = await added
  expect(response.status()).toBe(200)
  const minus = page.getByRole('button', { name: /^Quitar una unidad/ }).first()
  await expect(minus).toBeVisible({ timeout: 15_000 })
  await expect(page.getByRole('link', { name: /Ver lista/ })).toBeVisible()

  await expect(minus).toBeEnabled({ timeout: 15_000 }) // waits for the server round-trip
  await minus.click()
  await expect(page.getByRole('link', { name: /Ver lista/ })).toHaveCount(0, { timeout: 15_000 })
})

test('home: the hero recipe has a photo (no placeholder as the protagonist)', async ({ page }) => {
  // Photos come from the manual backfill, so a freshly seeded DB (CI) has none to prefer.
  const res = await page.request.get('/api/recipes/suggestions?limit=100')
  const data = await res.json()
  const items: { recipe: { imageUrl?: string | null } }[] = Array.isArray(data) ? data : data.items
  test.skip(!items.some(s => s.recipe.imageUrl), 'no recipe photos in this database')

  await page.goto('/')
  const hero = page.getByRole('region', { name: 'Recomendación de hoy' })
  await expect(hero).toBeVisible()
  await expect(hero.locator('img')).toBeVisible()
})

test('sheets: Escape closes, focus goes back to the trigger, page behind does not scroll while open', async ({ page }) => {
  await page.goto('/explore')
  const trigger = page.locator('main ul li').first().getByRole('button').filter({ hasText: '€' })
  await trigger.click()
  await expect(page.getByRole('dialog')).toBeVisible()
  expect(await page.evaluate(() => document.body.style.overflow)).toBe('hidden')
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(trigger).toBeFocused()
  expect(await page.evaluate(() => document.body.style.overflow)).toBe('')
})

test('mobile: main screens and product sheets fit at 320 and 390px; keto radios support arrow keys', async ({ page }) => {
  const assertFits = async () => {
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  }
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 })
    for (const route of ['/', '/meals', '/inventory', '/shopping-list', '/weekly-plan', '/preferences', '/explore']) {
      await page.goto(route)
      await expect(page.locator('[aria-busy="true"]')).toHaveCount(0, { timeout: 15_000 })
      await assertFits()
    }
    await page.locator('main ul li').first().getByRole('button').filter({ hasText: '€' }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true)
    await assertFits()
    await page.keyboard.press('Escape')

    await page.goto('/inventory')
    await page.getByRole('button', { name: 'Añadir', exact: true }).click()
    await page.getByRole('button', { name: 'Manual', exact: true }).click()
    await expect(page.getByLabel('Categoría')).toBeVisible()
    expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true)
    await assertFits()
    await page.keyboard.press('Escape')
  }
  await page.goto('/preferences')
  const strict = page.getByRole('radio', { name: /^Keto estricto/ })
  await strict.check()
  await strict.focus()
  await page.keyboard.press('ArrowDown')
  await expect(page.getByRole('radio', { name: /^Keto flexible/ })).toBeChecked()
})

test('product sheet: a failed add stays visible in the dialog and can be retried', async ({ page }) => {
  const registered = await page.request.post('/api/auth/register', {
    headers: { 'X-Forwarded-For': '127.0.0.2' },
    data: { email: `sheet-${Date.now()}@example.com`, password: 'e2e-password-123' },
  })
  expect(registered.status()).toBe(201)
  await page.goto('/explore')
  await page.locator('main ul li').first().getByRole('button').filter({ hasText: '€' }).click()
  const dialog = page.getByRole('dialog')
  await page.route('**/api/mercadona/add', route => route.fulfill({ status: 500, json: { error: 'Test failure' } }))
  await dialog.getByRole('button', { name: /Añadir a la lista/ }).click()
  await expect(dialog.getByRole('alert')).toContainText('No se pudo añadir')
  await expect(dialog.getByRole('button', { name: /Añadir a la lista/ })).toBeEnabled()
  await page.unroute('**/api/mercadona/add')
  const added = page.waitForResponse(response => response.url().endsWith('/api/mercadona/add'))
  await dialog.getByRole('button', { name: /Añadir a la lista/ }).click()
  const response = await added
  expect(response.status()).toBe(200)
  await expect(dialog).toHaveCount(0)
  await expect(page.getByRole('link', { name: /Ver lista/ })).toBeVisible()
})
