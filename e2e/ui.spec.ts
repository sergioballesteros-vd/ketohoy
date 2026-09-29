import { test, expect } from '@playwright/test'

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
  await page.getByRole('button', { name: /^Añadir .* a la lista$/ }).first().click()
  const minus = page.getByRole('button', { name: /^Quitar una unidad/ }).first()
  await expect(minus).toBeVisible({ timeout: 15_000 })
  await expect(page.getByRole('link', { name: /Ver lista/ })).toBeVisible()

  await expect(minus).toBeEnabled({ timeout: 15_000 }) // waits for the server round-trip
  await minus.click()
  await expect(page.getByRole('link', { name: /Ver lista/ })).toHaveCount(0, { timeout: 15_000 })
})

test('home: the hero recipe has a photo (no placeholder as the protagonist)', async ({ page }) => {
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
