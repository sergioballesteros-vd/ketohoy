import { test, expect } from '@playwright/test'

const PAGES = ['/', '/explore', '/inventory', '/meals', '/preferences', '/shopping-list', '/weekly-plan']

// Recipe/product images are backfilled from Unsplash (src/lib/recipeImage.ts).
// Those URLs can go dead independently of the app (deleted upstream, CDN
// hiccup, no network egress in a CI runner) — the browser logs that as a
// console error, but <Image> degrades gracefully (alt text, no crash) and
// it's not a bug in this app. Distinguish that noise from real app errors —
// thrown exceptions (pageerror) and our own console.error/warn calls — which
// must still fail the test.
const isExternalResourceNoise = (text: string) => /Failed to load resource/.test(text)

for (const path of PAGES) {
  test(`no console errors on ${path}`, async ({ page }) => {
    const errors: string[] = []
    page.on('console', msg => {
      if (msg.type() === 'error' && !isExternalResourceNoise(msg.text())) errors.push(msg.text())
    })
    page.on('pageerror', err => errors.push(err.message))

    await page.goto(path)
    await page.waitForLoadState('networkidle')

    expect(errors, `console errors on ${path}:\n${errors.join('\n')}`).toEqual([])
  })
}

test('generate weekly plan produces a full, varied week', async ({ page }) => {
  await page.goto('/weekly-plan')
  await page.getByRole('button', { name: /Generar/ }).first().click()
  await expect(page.getByText('Sin asignar')).toHaveCount(0, { timeout: 15_000 })

  const dayHeadings = page.locator('text=/Lun|Mar|Mié|Jue|Vie|Sáb|Dom/i')
  await expect(dayHeadings.first()).toBeVisible()
})

test('favoriting a product in Explore persists across reload', async ({ page }) => {
  await page.goto('/explore')
  await page.waitForLoadState('networkidle')
  // exact: true matters here — the product card itself is role="button" with no
  // aria-label of its own, so its computed accessible name includes the nested
  // favorite button's label, and a non-exact match would hit the card instead.
  const favoriteButton = page.getByRole('button', { name: 'Marcar favorito', exact: true }).first()
  await expect(favoriteButton).toBeVisible({ timeout: 15_000 })
  await favoriteButton.click()

  await expect(page.getByRole('button', { name: 'Quitar favorito', exact: true }).first()).toBeVisible()

  await page.reload()
  await expect(page.getByRole('button', { name: 'Quitar favorito', exact: true }).first()).toBeVisible({
    timeout: 15_000,
  })
})

test('shopping list: add a manual item, toggle it checked, then delete it', async ({ page }) => {
  const name = `E2E Item ${Date.now()}`

  await page.goto('/shopping-list')
  await page.getByPlaceholder('Producto').fill(name)
  await page.getByPlaceholder('cant.').fill('2')
  await page.getByRole('button', { name: '+', exact: true }).click()

  const row = page.locator('div', { hasText: name }).filter({ has: page.locator('button') }).last()
  await expect(row).toBeVisible({ timeout: 10_000 })

  // Toggle checked (round checkbox button is the row's first button) and
  // confirm the API round-trip actually persisted it, not just local state.
  await row.getByRole('button').first().click()
  await expect
    .poll(async () => {
      const items = await (await page.request.get('/api/shopping-list')).json()
      return items.find((i: { name: string }) => i.name === name)?.checked
    })
    .toBe(true)

  // Delete (the row's last button, "×") and confirm it's gone from both UI and API.
  await row.getByRole('button').last().click()
  await expect(page.getByText(name)).toHaveCount(0)
  await expect
    .poll(async () => {
      const items = await (await page.request.get('/api/shopping-list')).json()
      return items.some((i: { name: string }) => i.name === name)
    })
    .toBe(false)
})
