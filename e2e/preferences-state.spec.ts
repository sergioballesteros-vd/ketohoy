import { test, expect, type Page } from '@playwright/test'
import { registrationData } from './registration'
const pageErrors = new WeakMap<Page, string[]>()
test.beforeEach(({ page }) => {
  const errors: string[] = []
  pageErrors.set(page, errors)
  page.on('pageerror', error => errors.push(error.message))
})
test.afterEach(({ page }) => {
  expect(pageErrors.get(page)).toEqual([])
})

test.use({ storageState: { cookies: [], origins: [] } })
test.beforeEach(async ({ page }, info) => {
  expect((await page.request.post('/api/auth/register', { headers: { 'X-Forwarded-For': `prefs-${info.testId}` }, data: registrationData() })).status()).toBe(201)
})

test('preferences: response to A cannot mark visible B saved; failed save preserves edits and retries', async ({ page }) => {
  await page.goto('/preferences')
  const fish = page.getByRole('switch', { name: 'Pescado y marisco' })
  const pork = page.getByRole('switch', { name: 'Cerdo y embutidos' })
  await expect(fish).toHaveAttribute('aria-checked', 'false')
  await fish.click()
  let release!: () => void
  const pending = new Promise<void>(resolve => { release = resolve })
  await page.route('**/api/preferences', async route => {
    if (route.request().method() !== 'PATCH') return route.continue()
    await pending
    await route.fulfill({ response: await route.fetch() })
  })
  await page.getByRole('button', { name: 'Guardar preferencias' }).click()
  await expect(page.getByRole('button', { name: 'Guardando…' })).toBeVisible()
  await pork.focus()
  await page.keyboard.press('Space')
  await expect(pork).toHaveAttribute('aria-checked', 'true')
  release()
  await expect(page.getByRole('button', { name: 'Guardando…' })).toHaveCount(0)
  expect(await page.locator('main').innerText()).not.toContain('Preferencias guardadas')
  expect(await (await page.request.get('/api/preferences')).json()).toMatchObject({ avoidFish: true, avoidPork: false })
  await page.unroute('**/api/preferences')
  await page.route('**/api/preferences', route => route.request().method() === 'PATCH' ? route.fulfill({ status: 500, json: { error: 'test failure' } }) : route.continue())
  await page.getByRole('button', { name: 'Guardar preferencias' }).click()
  await expect(page.locator('main').getByRole('alert')).toHaveText('No se pudo guardar')
  await expect(pork).toHaveAttribute('aria-checked', 'true')
  await expect(page.getByRole('button', { name: 'Guardado', exact: true })).toHaveCount(0)
  await page.unroute('**/api/preferences')
  await page.getByRole('button', { name: 'Guardar preferencias' }).click()
  await expect(page.getByRole('button', { name: 'Guardado', exact: true })).toBeVisible()
  await page.reload()
  await expect(pork).toHaveAttribute('aria-checked', 'true')
})

for (const width of [320, 390, 1280]) {
  test(`preferences: dirty navigation by link, keyboard and back at ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    if (width === 320) await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/')
    await page.getByRole('link', { name: 'Preferencias y cuenta', exact: true }).click()
    const fish = page.getByRole('switch', { name: 'Pescado y marisco' })
    await expect(fish).toHaveAttribute('aria-checked', 'false')
    await fish.focus()
    await page.keyboard.press('Space')
    const dialogs: string[] = []
    page.on('dialog', async dialog => { dialogs.push(dialog.message()); await dialog.dismiss() })
    const home = page.locator('main').getByRole('link', { name: 'Inicio', exact: true })
    await home.focus()
    await page.keyboard.press('Enter')
    await expect.poll(() => dialogs.length).toBe(1)
    await expect(page).toHaveURL(/\/preferences$/)
    await expect(fish).toHaveAttribute('aria-checked', 'true')
    await page.evaluate(() => history.back())
    await expect.poll(() => dialogs.length).toBe(2)
    await expect(page).toHaveURL(/\/preferences$/)
    await expect(fish).toHaveAttribute('aria-checked', 'true')
    // Returning to persisted values is clean and must not ask again.
    await fish.click()
    await home.click()
    await expect(page).toHaveURL(/\/$/)
    expect(dialogs).toHaveLength(2)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  })
}


test('preferences: confirmed traversal leaves once; clean saved state needs no warning', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: 'Preferencias y cuenta' }).click()
  await page.getByRole('switch', { name: 'Pescado y marisco' }).click()
  const dialogs: string[] = []
  page.on('dialog', async dialog => { dialogs.push(dialog.message()); await dialog.accept() })
  await page.goBack()
  await expect(page).toHaveURL(/\/$/)
  expect(dialogs).toHaveLength(1)
  await page.getByRole('link', { name: 'Preferencias y cuenta' }).click()
  await page.getByRole('switch', { name: 'Pescado y marisco' }).click()
  await page.getByRole('button', { name: 'Guardar preferencias' }).click()
  await expect(page.getByRole('button', { name: 'Guardado', exact: true })).toBeVisible()
  await page.locator('main').getByRole('link', { name: 'Inicio', exact: true }).click()
  await expect(page).toHaveURL(/\/$/)
  expect(dialogs).toHaveLength(1)
})
