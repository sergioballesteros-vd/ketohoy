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

test('plan day navigation separates today from the viewed day and respects reduced motion', async ({ page }) => {
  await page.addInitScript(() => {
    const win = window as unknown as { dayScrollCalls: Array<{ id: string; behavior?: ScrollBehavior }> }
    win.dayScrollCalls = []
    const scrollIntoView = Element.prototype.scrollIntoView
    Element.prototype.scrollIntoView = function (options?: boolean | ScrollIntoViewOptions) {
      const win = window as unknown as { dayScrollCalls: Array<{ id: string; behavior?: ScrollBehavior }> }
      win.dayScrollCalls.push({ id: (this as HTMLElement).id, behavior: typeof options === 'object' ? options.behavior : undefined })
      scrollIntoView.call(this, options)
    }
  })
  expect((await page.request.post('/api/weekly-plan/generate')).status()).toBe(200)
  await page.setViewportSize({ width: 320, height: 900 })
  await page.goto('/weekly-plan')
  const nav = page.getByRole('navigation', { name: 'Días de la semana' })
  const today = nav.locator('button[aria-current="date"]')
  const waitForScrollEnd = () => page.evaluate(() => new Promise<void>(resolve => {
    document.addEventListener('scrollend', () => resolve(), { once: true })
  }))
  await expect(today).toHaveAttribute('aria-pressed', 'true')
  const todayIndex = await today.evaluate(button => Array.from(button.parentElement!.children).indexOf(button))

  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 900 })
    const targetIndex = todayIndex === 0 ? 1 : 0
    const target = nav.getByRole('button').nth(targetIndex)
    const targetSection = page.locator(`#day-${targetIndex}`)
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    const targetScroll = waitForScrollEnd()
    await target.click()
    await expect(target).toHaveAttribute('aria-pressed', 'true')
    await expect(today).toHaveAttribute('aria-current', 'date')
    await expect(today).toHaveAttribute('aria-pressed', 'false')
    await targetScroll
    let call = await page.evaluate(() => (window as unknown as { dayScrollCalls: Array<{ id: string; behavior?: ScrollBehavior }> }).dayScrollCalls.at(-1))
    expect(call).toEqual({ id: `day-${targetIndex}`, behavior: 'smooth' })
    await expect(targetSection).toBeInViewport()

    const otherIndex = (targetIndex + 2) % 7
    const other = nav.getByRole('button').nth(otherIndex)
    await other.focus()
    const otherScroll = waitForScrollEnd()
    await page.keyboard.press('Enter')
    await expect(other).toHaveAttribute('aria-pressed', 'true')
    await otherScroll
    call = await page.evaluate(() => (window as unknown as { dayScrollCalls: Array<{ id: string; behavior?: ScrollBehavior }> }).dayScrollCalls.at(-1))
    expect(call).toEqual({ id: `day-${otherIndex}`, behavior: 'smooth' })

    await page.emulateMedia({ reducedMotion: 'reduce' })
    await target.focus()
    await expect(target).toBeFocused()
    const reducedScroll = waitForScrollEnd()
    await page.keyboard.press('Space')
    await expect(target).toHaveAttribute('aria-pressed', 'true')
    await reducedScroll
    call = await page.evaluate(() => (window as unknown as { dayScrollCalls: Array<{ id: string; behavior?: ScrollBehavior }> }).dayScrollCalls.at(-1))
    expect(call).toEqual({ id: `day-${targetIndex}`, behavior: 'auto' })
    await expect(targetSection).toBeInViewport()

    const manualScroll = waitForScrollEnd()
    await page.evaluate(index => {
      const section = document.getElementById(`day-${index}`)!
      window.scrollTo(0, section.offsetTop - 180)
    }, otherIndex)
    await manualScroll
    await expect(other).toHaveAttribute('aria-pressed', 'true')
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)

    const todayScroll = waitForScrollEnd()
    await today.click()
    await expect(today).toHaveAttribute('aria-pressed', 'true')
    await todayScroll
    await expect(today).toHaveAttribute('aria-current', 'date')
  }

  await page.setViewportSize({ width: 1280, height: 900 })
  await expect(nav).toBeHidden()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await expect(page.getByRole('region', { name: 'Martes' })).toBeVisible()
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
