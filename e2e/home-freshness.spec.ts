import { test, expect, type Page } from '@playwright/test'
import Database from 'better-sqlite3'
import path from 'node:path'
import { registrationData } from './registration'
import { resolveSqlitePath } from '../src/lib/sqliteUrl'
import { FISH_TERMS } from '../src/lib/ketoRules'
import { DEFAULT_PREFERENCES, scoreRecipe, type RecipeWithIngredients } from '../src/lib/recipeScoring'
import { getMealSlot } from '../src/lib/mealSlot'

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
function testDatabase() {
  const filename = resolveSqlitePath(process.env.DATABASE_URL, true)
  if (!process.env.CI && filename === path.resolve('dev.db')) throw new Error('Freshness tests require a disposable database')
  return new Database(filename)
}
function recipesFrom(sql: Database.Database): RecipeWithIngredients[] {
  return (sql.prepare('SELECT * FROM Recipe').all() as Omit<RecipeWithIngredients, 'ingredients'>[]).map(recipe => ({
    ...recipe, ingredients: (sql.prepare('SELECT name, quantity, optional, productId FROM RecipeIngredient WHERE recipeId = ?').all(recipe.id) as Array<{ name: string; quantity: string | null; optional: number; productId: string | null }>).map(i => ({ ...i, optional: Boolean(i.optional) })),
  }))
}

test('home immediately reflects fish preferences, pantry and shopping writes for two independent users', async ({ page, browser }, info) => {
  const sql = testDatabase()
  const second = await browser.newContext()
  const other = await second.newPage()
  try {
    for (const client of [page, other]) {
      expect((await client.request.post('/api/auth/register', { headers: { 'X-Forwarded-For': `fresh-${info.testId}-${client === page ? 'a' : 'b'}` }, data: registrationData('fresh') })).status()).toBe(201)
    }
    const recipes = recipesFrom(sql)
    const hour = Number(new Intl.DateTimeFormat('es', { hour: 'numeric', hour12: false, timeZone: 'Europe/Madrid' }).format(new Date())) % 24
    const candidate = recipes.find(r => r.prepTimeMinutes <= 20 && r.imageUrl && JSON.parse(r.mealTypes).includes(getMealSlot(hour)) && r.ingredients.some(i => FISH_TERMS.some(term => i.name.toLowerCase().includes(term))))!
    expect(candidate).toBeDefined()
    for (const ingredient of candidate.ingredients.filter(i => !i.optional)) {
      // Private products through the public contract when a required ingredient has no catalog ID.
      const productId = ingredient.productId ?? (await (await page.request.post('/api/products', { data: { name: ingredient.name, category: 'other' } })).json()).id
      expect((await page.request.post('/api/pantry', { data: { productId } })).ok()).toBe(true)
    }
    await page.goto('/')
    await other.goto('http://127.0.0.1:3100/')
    const recipeIds = async () => page.locator('main a[href^="/recipes/"]').evaluateAll(links => links.map(link => link.getAttribute('href')!.split('/').pop()!))
    const containsFish = (ids: string[]) => recipes.filter(r => ids.includes(r.id)).some(r => r.ingredients.some(i => !i.optional && FISH_TERMS.some(t => i.name.toLowerCase().includes(t))))
    expect(containsFish(await recipeIds())).toBe(true)
    await page.getByRole('link', { name: 'Preferencias y cuenta' }).click()
    await page.getByRole('switch', { name: 'Pescado y marisco' }).click()
    await page.getByRole('button', { name: 'Guardar preferencias' }).click()
    await expect(page.getByRole('button', { name: 'Guardado', exact: true })).toBeVisible()
    const changedAt = Date.now()
    await page.locator('main').getByRole('link', { name: 'Inicio', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Hoy', exact: true })).toBeVisible()
    expect(containsFish(await recipeIds())).toBe(false)
    expect(Date.now() - changedAt).toBeLessThan(10_000)
    expect(await (await other.request.get('/api/preferences')).json()).toMatchObject(DEFAULT_PREFERENCES)

    const kitchen = page.getByRole('region', { name: 'Tu cocina' })
    await expect(kitchen.getByRole('link', { name: /Lista de compra/ })).toContainText('Sin pendientes')
    await page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Compra', exact: true }).click()
    const made = await (await page.request.post('/api/shopping-list', { data: { name: 'fresh home probe', quantity: '1' } })).json()
    await page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Inicio', exact: true }).click()
    await expect(kitchen.getByRole('link', { name: /Lista de compra/ })).toContainText('1 producto pendiente')
    const pantryBefore = (await (await page.request.get('/api/pantry')).json()).length
    await page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Compra', exact: true }).click()
    expect((await page.request.patch(`/api/shopping-list/${made.id}/check`)).ok()).toBe(true)
    await page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Inicio', exact: true }).click()
    await expect(kitchen.getByRole('link', { name: /Lista de compra/ })).toContainText('Sin pendientes')
    await expect(kitchen.getByRole('link', { name: /^Despensa/ })).toContainText(`${pantryBefore + 1} productos en casa`)
    await other.reload()
    await expect(other.getByRole('region', { name: 'Tu cocina' }).getByRole('link', { name: /^Despensa/ })).toContainText('Añade lo que tienes')
    await expect(other.getByRole('region', { name: 'Tu cocina' }).getByRole('link', { name: /Lista de compra/ })).toContainText('Sin pendientes')
  } finally { await second.close(); sql.close() }
})

test('new users without stored preferences share defaults across home, suggestions and weekly plan', async ({ page }, info) => {
  const sql = testDatabase()
  try {
    expect((await page.request.post('/api/auth/register', { headers: { 'X-Forwarded-For': `defaults-${info.testId}` }, data: registrationData('defaults') })).status()).toBe(201)
    const { email } = await (await page.request.get('/api/auth/me')).json()
    const { id: userId } = sql.prepare('SELECT id FROM User WHERE email = ?').get(email) as { id: string }
    expect(sql.prepare('SELECT COUNT(*) AS n FROM UserPreferences WHERE userId = ?').get(userId)).toEqual({ n: 0 })
    const recipes = recipesFrom(sql)
    const expected = recipes.filter(recipe => scoreRecipe(recipe, { pantry: [], userId, preferences: DEFAULT_PREFERENCES, minAvailability: 0 }))
    await page.goto('/')
    const ids = await page.locator('main a[href^="/recipes/"]').evaluateAll(links => links.map(link => link.getAttribute('href')!.split('/').pop()!))
    expect(ids.length).toBeGreaterThan(0)
    for (const id of ids) expect(expected.some(r => r.id === id)).toBe(true)
    const suggestions = await (await page.request.get('/api/recipes/suggestions?limit=100')).json()
    expect(suggestions.items.map((s: { recipe: { id: string } }) => s.recipe.id).sort()).toEqual(expected.map(r => r.id).sort())
    const plan = await (await page.request.post('/api/weekly-plan/generate')).json()
    expect(plan.meals).toHaveLength(28)
    for (const meal of plan.meals) expect(expected.some(r => r.id === meal.recipeId)).toBe(true)
    expect(sql.prepare('SELECT COUNT(*) AS n FROM UserPreferences WHERE userId = ?').get(userId)).toEqual({ n: 0 })
    await page.goto('/preferences')
    await expect(page.locator('#max-time')).toHaveValue(String(DEFAULT_PREFERENCES.maxCookingMinutes))
  } finally { sql.close() }
})


test('home counters change on the first visit after mutations', async ({ page }, info) => {
  expect((await page.request.post('/api/auth/register', { headers: { 'X-Forwarded-For': `counter-${info.testId}` }, data: registrationData('counter') })).status()).toBe(201)
  await page.goto('/')
  const kitchen = page.getByRole('region', { name: 'Tu cocina' })
  await expect(kitchen.getByRole('link', { name: /Lista de compra/ })).toContainText('Sin pendientes')
  await page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Compra', exact: true }).click()
  const item = await (await page.request.post('/api/shopping-list', { data: { name: 'Counter probe', quantity: '1' } })).json()
  await page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Inicio', exact: true }).click()
  await expect(kitchen.getByRole('link', { name: /Lista de compra/ })).toContainText('1 producto pendiente')
  await page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Compra', exact: true }).click()
  expect((await page.request.patch(`/api/shopping-list/${item.id}/check`)).ok()).toBe(true)
  await page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Inicio', exact: true }).click()
  await expect(kitchen.getByRole('link', { name: /Lista de compra/ })).toContainText('Sin pendientes')
  await expect(kitchen.getByRole('link', { name: /^Despensa/ })).toContainText('1 producto en casa')
})
