import { test, expect } from '@playwright/test'
import { mockMercadonaCatalog } from './mercadona-fixture'

const sheetTrigger = (page: import('@playwright/test').Page) =>
  page.locator('main ul li').first().getByRole('button').filter({ hasText: '€' })

const watchExitAnimations = (dialog: import('@playwright/test').Locator) => dialog.evaluate(overlay => {
  const win = window as unknown as { __khSheetExitEvents: string[] }
  win.__khSheetExitEvents = []
  const panel = overlay.firstElementChild!
  const record = (event: Event) => {
    const animation = event as AnimationEvent
    if (event.target === overlay && animation.animationName === 'overlay-out') win.__khSheetExitEvents.push('overlay-out')
    if (event.target === panel && animation.animationName === 'sheet-out') win.__khSheetExitEvents.push('sheet-out')
  }
  overlay.addEventListener('animationend', record)
  panel.addEventListener('animationend', record)
})

const expectExitAnimations = async (page: import('@playwright/test').Page) => {
  await expect.poll(() => page.evaluate(() => (window as unknown as { __khSheetExitEvents: string[] }).__khSheetExitEvents))
    .toEqual(expect.arrayContaining(['overlay-out', 'sheet-out']))
}

test('sheet: exit animation then closes; overlay click closes; focus returns', async ({ page }) => {
  await mockMercadonaCatalog(page)
  await page.goto('/explore')
  const trigger = sheetTrigger(page)
  await trigger.click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await watchExitAnimations(dialog)
  await dialog.click({ position: { x: 4, y: 4 } }) // overlay, outside the panel
  await expect(dialog).toHaveAttribute('data-closing', '')
  await expectExitAnimations(page)
  await expect(dialog).toHaveCount(0)
  await expect(trigger).toBeFocused()
})

test('KH-040 Escape uses the same exit and restores focus after unmount', async ({ page }) => {
  await mockMercadonaCatalog(page)
  await page.goto('/explore')
  const trigger = sheetTrigger(page)
  await trigger.click()
  const dialog = page.getByRole('dialog')
  await watchExitAnimations(dialog)
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveAttribute('data-closing', '')
  await expectExitAnimations(page)
  await expect(dialog).toHaveCount(0)
  await expect(trigger).toBeFocused()
})

test('KH-040 X closes through the coordinated lifecycle at phone, tablet, and desktop widths', async ({ page }) => {
  await mockMercadonaCatalog(page)
  await page.goto('/explore')
  const trigger = sheetTrigger(page)
  for (const width of [320, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: width < 500 ? 844 : 900 })
    await trigger.click()
    const dialog = page.getByRole('dialog')
    await watchExitAnimations(dialog)
    await dialog.getByRole('button', { name: 'Cerrar' }).click()
    await expect(dialog).toHaveAttribute('data-closing', '')
    await expectExitAnimations(page)
    if (width === 390) await page.screenshot({ path: '/tmp/kh040-sheet-exit-390.png' })
    await expect(dialog).toHaveCount(0)
    await expect(trigger).toBeFocused()
  }
})

test('KH-040 successful action exits; failed action keeps the sheet open', async ({ page }) => {
  await mockMercadonaCatalog(page)
  await page.goto('/explore')
  const trigger = sheetTrigger(page)
  await trigger.click()
  const dialog = page.getByRole('dialog')
  await page.route('**/api/mercadona/add', route => route.request().method() === 'POST'
    ? route.fulfill({ status: 500, json: { error: 'test failure' } })
    : route.continue())
  await dialog.getByRole('button', { name: 'Añadir a la lista' }).click()
  await expect(dialog.getByRole('alert')).toContainText('No se pudo añadir')
  await expect(dialog).not.toHaveAttribute('data-closing', '')
  await expect(dialog).toBeVisible()
  await page.unroute('**/api/mercadona/add')

  await watchExitAnimations(dialog)
  await dialog.getByRole('button', { name: 'Añadir a la lista' }).click()
  await expect(dialog).toHaveAttribute('data-closing', '')
  await expectExitAnimations(page)
  await expect(dialog).toHaveCount(0)
  await expect(trigger).toBeFocused()
})

test('reduced motion: sheet closes immediately and enter animations are off', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce', storageState: 'playwright/.auth/user.json', baseURL: 'http://127.0.0.1:3100' })
  const page = await ctx.newPage()
  await mockMercadonaCatalog(page)
  await page.setViewportSize({ width: 320, height: 844 })
  await page.goto('/explore')
  await sheetTrigger(page).click()
  const panel = page.getByRole('dialog').locator('> div')
  expect(await panel.evaluate(el => getComputedStyle(el).animationName)).toBe('none')
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 100 })
  await expect(sheetTrigger(page)).toBeFocused()
  await ctx.close()
})
