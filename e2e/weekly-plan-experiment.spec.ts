import { registrationData } from './registration'
import { test, expect } from '@playwright/test'
import Database from 'better-sqlite3'
import { resolveSqlitePath } from '../src/lib/sqliteUrl'

test.use({ storageState: { cookies: [], origins: [] } })

test('weekly plan experiment keeps 28 slots, navigates days, and defers meal actions', async ({ page }, info) => {
  expect((await page.request.post('/api/auth/register', {
    headers: { 'X-Forwarded-For': info.testId },
    data: registrationData('weekly-plan-experiment'),
  })).status()).toBe(201)
  expect((await page.request.post('/api/weekly-plan/generate')).status()).toBe(200)
  const waitForScrollEnd = () => page.evaluate(() => new Promise<void>(resolve => {
    document.addEventListener('scrollend', () => resolve(), { once: true })
  }))

  for (const width of [320, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/weekly-plan?redesign=1')
    const rows = page.locator('main section li')
    await expect(rows).toHaveCount(28)
    await expect(page.locator('main section img')).toHaveCount(0)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)

    if (width <= 1023) {
      const nav = page.getByRole('navigation', { name: 'Días de la semana' })
      const today = nav.locator('button[aria-current="date"]')
      await expect(today).toContainText('Hoy')
      await expect(today).toHaveAttribute('aria-pressed', 'true')
      const todayIndex = await today.evaluate(el => Array.from(el.parentElement!.children).indexOf(el))
      await expect.poll(async () => page.locator(`#day-${todayIndex} h2`).evaluate(heading => {
        const sticky = document.querySelector('main > div.sticky')!
        return heading.getBoundingClientRect().top >= sticky.getBoundingClientRect().bottom
      })).toBe(true)
      const target = nav.getByRole('button').nth(todayIndex === 0 ? 1 : 0)
      const targetScroll = waitForScrollEnd()
      await target.click()
      await expect(target).toHaveAttribute('aria-pressed', 'true')
      await expect(today).toHaveAttribute('aria-current', 'date')
      await expect(today).toHaveAttribute('aria-pressed', 'false')
      await targetScroll
      await expect(target).toBeInViewport()
    }
  }

  await page.setViewportSize({ width: 390, height: 900 })
  await page.goto('/weekly-plan?redesign=1')
  const lunch = page.locator('#day-0 li').nth(1)
  const actions = lunch.locator('details')
  await actions.locator('summary').click()
  const change = actions.getByRole('button', { name: /Cambiar comida del lunes/ })
  await expect(change).toBeVisible()
  await change.click()
  const sheet = page.getByRole('dialog')
  await expect(sheet).toBeVisible()
  await expect(sheet.getByRole('button').filter({ hasText: 'min' }).first()).toBeVisible({ timeout: 15_000 })
  await expect(page.getByRole('button', { name: 'Preparar compra de esta semana' })).toBeVisible()
})

test('weekly plan experiment preserves all four availability summaries', async ({ page }, info) => {
  const registration = registrationData('weekly-plan-availability')
  expect((await page.request.post('/api/auth/register', {
    headers: { 'X-Forwarded-For': info.testId },
    data: registration,
  })).status()).toBe(201)
  const id = `weekly-plan-availability-${Date.now()}`
  const names = ['Suficiente', 'Insuficiente', 'Desconocido', 'Faltante'].map(name => `${name} ${id}`)
  const products: Array<{ id: string }> = []
  for (const name of names) {
    const res = await page.request.post('/api/products', { data: { name, category: 'other' } })
    expect(res.ok()).toBe(true)
    products.push(await res.json() as { id: string })
  }
  const todayIndex = (new Date().getDay() + 6) % 7
  const meals = ['breakfast', 'lunch', 'snack', 'dinner']
  const generated = await page.request.post('/api/weekly-plan/generate')
  expect(generated.status()).toBe(200)
  const plan = await generated.json() as { id: string; status: string }
  expect(plan.status).toBe('complete')
  const sql = new Database(resolveSqlitePath(process.env.DATABASE_URL, true))

  try {
    const { id: userId } = sql.prepare('SELECT id FROM User WHERE email=?').get(registration.email) as { id: string }
    sql.transaction(() => {
      const addRecipe = sql.prepare('INSERT INTO Recipe(id,title,description,mealTypes,prepTimeMinutes,difficulty,ketoLevel,steps,imageUrl,updatedAt) VALUES(?,?,?,?,?,?,?,?,?,?)')
      const addIngredient = sql.prepare('INSERT INTO RecipeIngredient(id,recipeId,name,quantity,productId) VALUES(?,?,?,?,?)')
      const addPantry = sql.prepare('INSERT INTO PantryItem(id,userId,productId,quantity,unit,updatedAt) VALUES(?,?,?,?,?,?)')
      const replaceSlot = sql.prepare('UPDATE WeeklyMeal SET recipeId=? WHERE planId=? AND dayOfWeek=? AND mealType=?')
      for (let i = 0; i < 4; i++) {
        const recipeId = `${id}-${i}`
        addRecipe.run(recipeId, names[i], '', JSON.stringify([meals[i]]), 10, 'easy', 'strict', '[]', null, Date.now())
        addIngredient.run(`${recipeId}-ingredient`, recipeId, names[i], i === 1 ? '123456789.5 g' : i === 2 ? '300 ml' : '500 g', products[i].id)
        if (i < 3) addPantry.run(`${recipeId}-stock`, userId, products[i].id, i === 0 ? 1 : i === 1 ? 100 : null, i === 0 ? 'kg' : i === 1 ? 'g' : null, Date.now())
        replaceSlot.run(recipeId, plan.id, todayIndex, meals[i])
      }
    })()

    await page.setViewportSize({ width: 390, height: 900 })
    await page.goto('/weekly-plan?redesign=1')
    const today = page.locator(`#day-${todayIndex}`)
    for (const [i, label] of ['Cantidad suficiente', 'Falta cantidad', 'Cantidad no verificada', 'Falta 1 ingrediente'].entries()) {
      await expect(today.locator('li').nth(i)).toContainText(label)
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: 'design-experiments/weekly-plan/after/390-four-availability.png' })
  } finally {
    sql.transaction(() => {
      sql.prepare('DELETE FROM WeeklyMeal WHERE recipeId IN (?,?,?,?)').run(`${id}-0`, `${id}-1`, `${id}-2`, `${id}-3`)
      sql.prepare('DELETE FROM PantryItem WHERE id IN (?,?,?)').run(`${id}-0-stock`, `${id}-1-stock`, `${id}-2-stock`)
      sql.prepare('DELETE FROM RecipeIngredient WHERE recipeId IN (?,?,?,?)').run(`${id}-0`, `${id}-1`, `${id}-2`, `${id}-3`)
      sql.prepare('DELETE FROM Recipe WHERE id IN (?,?,?,?)').run(`${id}-0`, `${id}-1`, `${id}-2`, `${id}-3`)
    })()
    sql.close()
  }
})
