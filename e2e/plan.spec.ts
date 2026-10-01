import { test, expect } from '@playwright/test'

// Own account: a fresh user has no plan yet, and generate/swap must not touch the shared e2e user.
test.use({ storageState: { cookies: [], origins: [] } })

test.beforeEach(async ({ page }, testInfo) => {
  const res = await page.request.post('/api/auth/register', {
    headers: { 'X-Forwarded-For': `e2e-${testInfo.testId}` },
    data: { email: `plan-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`, password: 'plan-password-123' },
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
