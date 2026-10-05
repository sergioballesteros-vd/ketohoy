import { registrationData } from './registration'
import { test, expect, type Page } from '@playwright/test'

const dialog = (page: Page) => page.getByRole('dialog')

// Own account: the shared e2e user is used by parallel specs, and these tests need an empty list/pantry.
test.use({ storageState: { cookies: [], origins: [] } })

test.beforeEach(async ({ page }, testInfo) => {
  const res = await page.request.post('/api/auth/register', {
    headers: { 'X-Forwarded-For': `e2e-${testInfo.testId}` },
    data: registrationData(),
  })
  expect(res.status()).toBe(201)
})

test('shopping list: empty state, add, change quantity, buy -> pantry with the bought quantity', async ({ page }) => {
  await page.goto('/shopping-list')
  await expect(page.getByText('Lista vacía')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Explorar productos' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Ver recetas' })).toBeVisible()

  // add manually (the empty-state action opens the sheet on the manual tab)
  await page.getByRole('button', { name: 'Añadir manualmente' }).click()
  await page.getByLabel('Producto').fill('Queso E2E')
  await page.getByLabel('Cantidad').fill('2')
  await page.getByLabel('Categoría').selectOption('dairy')
  await dialog(page).getByRole('button', { name: 'Añadir', exact: true }).click()
  await expect(page.getByText('Queso E2E añadido')).toBeVisible()
  await page.keyboard.press('Escape')

  const row = page.getByRole('listitem').filter({ hasText: 'Queso E2E' })
  await expect(row).toBeVisible()
  await expect(row.getByText('2', { exact: true })).toBeVisible()

  // increment, decrement
  await row.getByRole('button', { name: /Aumentar cantidad/ }).click()
  await expect(row.getByText('3', { exact: true })).toBeVisible()
  await row.getByRole('button', { name: /Reducir cantidad/ }).click()
  await expect(row.getByText('2', { exact: true })).toBeVisible()

  // buy: leaves the pending list...
  await row.getByRole('button', { name: /como comprado/ }).click()
  await expect(page.getByText('Todo comprado')).toBeVisible()
  await expect(page.getByRole('button', { name: /Devolver Queso E2E/ })).toBeVisible()

  // ...and lands in the pantry with the bought quantity
  await expect
    .poll(async () => {
      const pantry = await (await page.request.get('/api/pantry')).json()
      return pantry.find((p: { product: { name: string } }) => p.product.name === 'Queso E2E')?.quantity
    })
    .toBe(2)
  await page.goto('/inventory')
  await expect(page.getByRole('button', { name: /Queso E2E/ })).toContainText('2 paquete')
  // the category chosen when adding it to the list is the pantry group it lands in
  await expect(page.getByRole('heading', { name: /Lácteos/ })).toBeVisible()

  // undoing the purchase takes it back out
  await page.goto('/shopping-list')
  await page.getByRole('button', { name: /Devolver Queso E2E/ }).click()
  await expect
    .poll(async () => (await (await page.request.get('/api/pantry')).json()).length)
    .toBe(0)
})

test('shopping list: add from Mercadona search, remove at quantity 1 with undo', async ({ page }) => {
  await page.goto('/shopping-list')
  await page.getByRole('button', { name: 'Añadir', exact: true }).click()
  await page.getByLabel('Buscar productos de Mercadona').fill('leche')
  const add = dialog(page).getByRole('button', { name: /^Añadir / }).first()
  await expect(add).toBeVisible({ timeout: 15_000 })
  await add.click()
  await page.keyboard.press('Escape')

  const row = page.getByRole('listitem').first()
  await expect(row.getByRole('button', { name: /Quitar .* de la lista/ })).toBeVisible({ timeout: 10_000 })
  await row.getByRole('button', { name: /Quitar .* de la lista/ }).click()
  await expect(page.getByText('Lista vacía')).toBeVisible()
  await page.getByRole('button', { name: 'Deshacer' }).click()
  await expect(page.getByRole('listitem').first()).toBeVisible({ timeout: 10_000 })
})

test('pantry: add manually and via search, edit quantity, remove with undo', async ({ page }) => {
  await page.goto('/inventory')
  await expect(page.getByText('Tu despensa está vacía')).toBeVisible()

  await page.getByRole('button', { name: 'Añadir', exact: true }).click()
  await page.getByRole('button', { name: 'Manual' }).click()
  await page.getByLabel('Producto').fill('Aceitunas E2E')
  await page.getByLabel('Cantidad').fill('3')
  await dialog(page).getByRole('button', { name: 'Añadir', exact: true }).click()
  await expect(page.getByText('Aceitunas E2E añadido')).toBeVisible()

  await page.getByRole('button', { name: 'Buscar en Mercadona' }).click()
  await page.getByLabel('Buscar productos de Mercadona').fill('huevos')
  await dialog(page).getByRole('button', { name: /^Añadir / }).first().click()
  await expect(page.getByText('En casa').first()).toBeVisible({ timeout: 15_000 })
  await page.keyboard.press('Escape')

  // edit
  await page.getByRole('button', { name: /Aceitunas E2E/ }).click()
  await page.getByLabel('Cantidad').fill('5')
  await page.getByLabel('Unidad').selectOption('kg')
  await page.getByRole('button', { name: 'Guardar cambios' }).click()
  await expect(page.getByRole('button', { name: /Aceitunas E2E/ })).toContainText('5 kg')

  // remove (secondary action inside the sheet) + undo
  await page.getByRole('button', { name: /Aceitunas E2E/ }).click()
  await page.getByRole('button', { name: 'Quitar de la despensa' }).click()
  await expect(page.getByRole('button', { name: /Aceitunas E2E/ })).toHaveCount(0)
  await page.getByRole('button', { name: 'Deshacer' }).click()
  await expect(page.getByRole('button', { name: /Aceitunas E2E/ })).toContainText('5 kg')
})

test('buy then un-buy: pantry goes 3 -> 5 -> 3, and a product not in the pantry goes 0 -> 2 -> gone', async ({ page }) => {
  const list = async () => (await (await page.request.get('/api/shopping-list')).json()) as Array<{ id: string; productId: string; name: string; checked: boolean }>
  const pantry = async () => (await (await page.request.get('/api/pantry')).json()) as Array<{ productId: string; quantity: number | null }>
  const json = { 'Content-Type': 'application/json' }
  const make = async (name: string) =>
    (await (await page.request.post('/api/products', { headers: json, data: { name, category: 'other', source: 'manual' } })).json()) as { id: string }

  const a = await make('Ya en despensa E2E')
  const b = await make('No en despensa E2E')
  await page.request.post('/api/pantry', { headers: json, data: { productId: a.id, quantity: 3, unit: 'paquete' } })
  await page.request.post('/api/shopping-list', { headers: json, data: { name: 'Ya en despensa E2E', productId: a.id, quantity: 2 } })
  await page.request.post('/api/shopping-list', { headers: json, data: { name: 'No en despensa E2E', productId: b.id, quantity: 2 } })

  await page.goto('/shopping-list')
  const qty = async (id: string) => (await pantry()).find(p => p.productId === id)?.quantity
  const tick = async (name: string, action: 'Marcar' | 'Devolver') => {
    const label = action === 'Marcar' ? new RegExp(`Marcar ${name} como comprado`) : new RegExp(`Devolver ${name} a la lista`)
    await page.getByRole('button', { name: label }).click()
  }

  await tick('Ya en despensa E2E', 'Marcar')
  await expect.poll(() => qty(a.id)).toBe(5)
  await tick('Ya en despensa E2E', 'Devolver')
  await expect.poll(() => qty(a.id)).toBe(3)

  await tick('No en despensa E2E', 'Marcar')
  await expect.poll(() => qty(b.id)).toBe(2)
  await tick('No en despensa E2E', 'Devolver')
  await expect.poll(async () => (await pantry()).some(p => p.productId === b.id)).toBe(false)

  // already in the pantry WITHOUT a quantity: 2 -> back to "no quantity", the row is kept
  const c = await make('Sin cantidad E2E')
  await page.request.post('/api/pantry', { headers: json, data: { productId: c.id } })
  await page.request.post('/api/shopping-list', { headers: json, data: { name: 'Sin cantidad E2E', productId: c.id, quantity: 2 } })
  await page.reload()
  await tick('Sin cantidad E2E', 'Marcar')
  await expect.poll(() => qty(c.id)).toBe(2)
  await tick('Sin cantidad E2E', 'Devolver')
  await expect.poll(async () => (await pantry()).find(p => p.productId === c.id)?.quantity ?? 'none').toBe('none')
  expect((await pantry()).some(p => p.productId === c.id)).toBe(true)

  // repeated taps end in a consistent state and never go negative or double-count
  for (let i = 0; i < 4; i++) await page.getByRole('button', { name: /Ya en despensa E2E/ }).first().click()
  await expect.poll(async () => (await list()).find(i => i.productId === a.id)?.checked).toBe(false)
  expect(await qty(a.id)).toBe(3)
})

for (const width of [320, 390, 1280]) {
  test(`re-adding a bought product creates a visible pending need at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 })
    await page.emulateMedia({ reducedMotion: width === 320 ? 'reduce' : 'no-preference' })
    const name = `Repeat need ${width}`
    const product = await (await page.request.post('/api/products', { data: { name, category: 'other' } })).json()
    const first = await (await page.request.post('/api/shopping-list', { data: { name, productId: product.id, quantity: 2 } })).json()
    const stock = async () => {
      const items = await (await page.request.get('/api/pantry')).json()
      return items.find((item: { productId: string }) => item.productId === product.id)?.quantity
    }
    const assertFits = async () => expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    await page.goto('/shopping-list')
    const buy = page.getByRole('button', { name: `Marcar ${name} como comprado` })
    await buy.focus()
    await expect(buy).toBeFocused()
    await buy.press('Enter')
    await expect.poll(stock).toBe(2)
    const history = (await (await page.request.get('/api/shopping-list')).json()).find((item: { id: string }) => item.id === first.id)

    const next = await page.request.post('/api/shopping-list', { data: { name, productId: product.id, quantity: 1 } })
    expect(next.status()).toBe(201)
    const second = await next.json()
    await page.reload()
    await expect(buy).toBeVisible()
    await expect(page.getByRole('button', { name: `Devolver ${name} a la lista` })).toBeVisible()
    expect((await (await page.request.get('/api/shopping-list')).json()).find((item: { id: string }) => item.id === first.id)).toEqual(history)
    expect(await stock()).toBe(2)
    await assertFits()

    await buy.focus()
    await buy.press('Space')
    await expect.poll(stock).toBe(3)
    const newest = page.getByRole('listitem').filter({ hasText: name }).filter({ has: page.getByText('Compra: 1 paquete', { exact: true }) })
    const undo = newest.getByRole('button', { name: `Devolver ${name} a la lista` })
    await undo.focus()
    await expect(undo).toBeFocused()
    await undo.press('Enter')
    await expect.poll(stock).toBe(2)
    await expect(buy).toBeVisible()
    await page.getByRole('button', { name: 'Quitar los comprados de la lista' }).click()
    await expect(page.getByRole('button', { name: `Devolver ${name} a la lista` })).toHaveCount(0)
    await page.reload()
    await expect(buy).toBeVisible()
    const remaining = await (await page.request.get('/api/shopping-list')).json()
    expect(remaining).toHaveLength(1)
    expect(remaining[0]).toMatchObject({ id: second.id, checked: false, quantity: '1', pantryDelta: null })
    expect(await stock()).toBe(2)
    await assertFits()
  })
}
