import { registrationData } from './registration'
import { test, expect, type Page } from '@playwright/test'

// Own account: a fresh user has no plan yet, and generate/swap must not touch the shared e2e user.
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

test.beforeEach(async ({ page }, testInfo) => {
  const res = await page.request.post('/api/auth/register', {
    headers: { 'X-Forwarded-For': `e2e-${testInfo.testId}` },
    data: registrationData(),
  })
  expect(res.status()).toBe(201)
})

test('plan: empty state, generate 28 meals, swap a meal to a chosen alternative, persists after reload', async ({ page }) => {
  await page.goto('/weekly-plan')
  await expect(page.getByText('Aún no tienes plan esta semana')).toBeVisible()

  await page.getByRole('button', { name: 'Generar menú' }).click()
  const rows = page.locator('main section li')
  await expect(rows).toHaveCount(28, { timeout: 20_000 })
  for (const day of ['Lunes', 'Miércoles', 'Domingo']) {
    await expect(page.getByRole('region', { name: day }).locator('li')).toHaveCount(4)
  }

  // swap Monday's lunch: open the sheet, pick the first alternative
  const lunch = page.getByRole('region', { name: 'Lunes' }).locator('li').nth(1)
  const before = await lunch.locator('a span.leading-snug').innerText()
  await lunch.getByRole('button', { name: /^Cambiar comida del lunes/ }).click()
  const sheet = page.getByRole('dialog')
  await expect(sheet.getByRole('button').filter({ hasText: 'min' }).first()).toBeVisible({ timeout: 15_000 })
  const alternative = sheet.getByRole('button').filter({ hasText: 'min' }).first()
  const picked = await alternative.locator('span.line-clamp-2').innerText()
  expect(picked).not.toBe(before)
  await alternative.click()

  await expect(sheet).toHaveCount(0)
  await expect(lunch.locator('a span.leading-snug')).toHaveText(picked)

  // persisted, and nothing was duplicated or lost
  await page.reload()
  await expect(rows).toHaveCount(28, { timeout: 15_000 })
  await expect(page.getByRole('region', { name: 'Lunes' }).locator('li').nth(1).locator('a span.leading-snug')).toHaveText(picked)
  const plan = await (await page.request.get('/api/weekly-plan')).json()
  expect(new Set(plan.meals.map((m: { dayOfWeek: number; mealType: string }) => `${m.dayOfWeek}-${m.mealType}`)).size).toBe(28)

  // open the recipe
  await page.getByRole('region', { name: 'Lunes' }).locator('li').nth(1).locator('a').click()
  await expect(page).toHaveURL(/\/recipes\/.+/)
})

test('plan: "Elegir por mí" swaps without picking, regenerate asks first and replaces the plan', async ({ page }) => {
  await page.goto('/weekly-plan')
  await page.getByRole('button', { name: 'Generar menú' }).click()
  const rows = page.locator('main section li')
  await expect(rows).toHaveCount(28, { timeout: 20_000 })

  const dinner = page.getByRole('region', { name: 'Martes' }).locator('li').nth(3)
  const before = await dinner.locator('a span.leading-snug').innerText()
  await dinner.getByRole('button', { name: /^Cambiar cena/ }).click()
  await page.getByRole('button', { name: 'Elegir por mí' }).click()
  await expect(dinner.locator('a span.leading-snug')).not.toHaveText(before, { timeout: 10_000 })

  const oldPlan = (await (await page.request.get('/api/weekly-plan')).json()).id
  await page.getByRole('button', { name: 'Regenerar' }).click()
  await expect(page.getByText('Perderás los cambios')).toBeVisible()
  await page.getByRole('dialog').getByRole('button', { name: 'Regenerar' }).click()
  await expect
    .poll(async () => (await (await page.request.get('/api/weekly-plan')).json()).id, { timeout: 15_000 })
    .not.toBe(oldPlan)
  await expect(rows).toHaveCount(28)
})

for (const width of [320, 390, 1280]) {
  test(`plan: insufficient candidates preserve plan and recover with keyboard at ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    const generated = await page.request.post('/api/weekly-plan/generate')
    expect(generated.status()).toBe(200)
    const before = await (await page.request.get('/api/weekly-plan')).json()
    expect(before.meals).toHaveLength(28)
    expect((await page.request.patch('/api/preferences', { data: { ketoMode: 'strict', avoidFish: true, avoidPork: true, avoidDairy: true, maxCookingMinutes: 5 } })).ok()).toBe(true)
    await page.goto('/weekly-plan')
    await page.getByRole('button', { name: 'Regenerar', exact: true }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Regenerar', exact: true }).click()
    const alert = page.locator('main').getByRole('alert')
    await expect(alert).toContainText('No encontramos recetas compatibles para desayuno, comida y cena')
    expect(await (await page.request.get('/api/weekly-plan')).json()).toEqual(before)
    await expect(page.getByText('Plan generado', { exact: true })).toHaveCount(0)
    const recovery = alert.getByRole('link', { name: 'Revisar preferencias' })
    await recovery.scrollIntoViewIfNeeded()
    await expect(recovery).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    await recovery.focus()
    await expect(recovery).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/\/preferences$/)
  })
}
