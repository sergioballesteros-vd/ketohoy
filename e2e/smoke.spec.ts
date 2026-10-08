import { test, expect } from '@playwright/test'
import { mockMercadonaCatalog } from './mercadona-fixture'

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

    if (path === '/explore') await mockMercadonaCatalog(page)
    await page.goto(path)
    await page.waitForLoadState('networkidle')

    expect(errors, `console errors on ${path}:\n${errors.join('\n')}`).toEqual([])
  })
}

test('generate weekly plan produces a full, varied week', async ({ page }) => {
  await page.goto('/weekly-plan')
  await page.getByRole('button', { name: /Generar menú|Regenerar/ }).click()
  const confirm = page.getByRole('dialog').getByRole('button', { name: 'Regenerar' })
  if (await confirm.isVisible().catch(() => false)) await confirm.click()

  await expect(page.locator('main section li')).toHaveCount(28, { timeout: 20_000 })
  await expect(page.getByText('Sin receta')).toHaveCount(0)
  await expect(page.getByRole('region', { name: 'Lunes' })).toBeVisible()
})

test('favoriting a product in Explore persists across reload', async ({ page }) => {
  await mockMercadonaCatalog(page)
  await page.goto('/explore')
  await page.waitForLoadState('networkidle')
  const favoriteButton = page.getByRole('button', { name: /^Marcar .+ como favorito$/, exact: true }).first()
  await expect(favoriteButton).toBeVisible({ timeout: 15_000 })
  await favoriteButton.click()

  const removeFavorite = page.getByRole('button', { name: /^Quitar .+ de favoritos$/, exact: true }).first()
  await expect(removeFavorite).toBeVisible()

  await page.reload()
  await expect(removeFavorite).toBeVisible({
    timeout: 15_000,
  })
})
