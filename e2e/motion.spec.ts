import { test, expect } from '@playwright/test'

const sheetTrigger = (page: import('@playwright/test').Page) =>
  page.locator('main ul li').first().getByRole('button').filter({ hasText: '€' })

test('sheet: exit animation then closes; overlay click closes; focus returns', async ({ page }) => {
  await page.goto('/explore')
  const trigger = sheetTrigger(page)
  await trigger.click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await dialog.click({ position: { x: 4, y: 4 } }) // overlay, outside the panel
  await expect(dialog).toHaveCount(0)
  await expect(trigger).toBeFocused()
})

test('reduced motion: sheet closes immediately and enter animations are off', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce', storageState: 'playwright/.auth/user.json', baseURL: 'http://127.0.0.1:3100' })
  const page = await ctx.newPage()
  await page.goto('/explore')
  await sheetTrigger(page).click()
  const panel = page.getByRole('dialog').locator('> div')
  expect(await panel.evaluate(el => getComputedStyle(el).animationName)).toBe('none')
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 100 })
  await ctx.close()
})
