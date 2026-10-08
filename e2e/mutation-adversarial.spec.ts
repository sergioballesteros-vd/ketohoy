import { test, expect } from '@playwright/test'
import { registrationData } from './registration'

test.use({ storageState: { cookies: [], origins: [] } })
for (const width of [320, 390, 768, 1280]) for (const domain of ['pantry', 'shopping-list']) {
  test(`KH-020 HTTP matrix, double actions, navigation ${domain} ${width}`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 844 })
    if (width === 320) await page.emulateMedia({ reducedMotion: 'reduce' })
    expect((await page.request.post('/api/auth/register', { data: registrationData('adversarial'), headers: { 'X-Forwarded-For': info.testId } })).status()).toBe(201)
    const name = `Producto de prueba con nombre largo para comprobar mensajes y recuperación ${domain} ${width}`
    const product = await (await page.request.post('/api/products', { data: { name, category: 'other' } })).json()
    const create = () => page.request.post(`/api/${domain}`, { data: domain === 'pantry' ? { productId: product.id, quantity: 5, unit: 'kg' } : { productId: product.id, name, purchaseQuantity: null, legacyQuantity: '5 kg' } })
    expect((await create()).ok()).toBe(true)
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message))
    let failureMethod = 'DELETE'
    let code = 400
    let deletes = 0
    let posts = 0
    let hold = false
    let release: (() => void) | undefined
    await page.route(`**/api/${domain}{,/**}`, async route => {
      const method = route.request().method()
      if (method === 'DELETE') deletes++
      if (method === 'POST') posts++
      if (method === failureMethod) return route.fulfill({ status: code, json: { error: 'private internal fixture information' } })
      if (hold && (method === 'DELETE' || method === 'POST')) {
        const response = await route.fetch()
        await new Promise<void>(resolve => { release = resolve })
        return route.fulfill({ response })
      }
      await route.continue()
    })
    const path = domain === 'pantry' ? '/inventory' : '/shopping-list'
    await page.goto(path)
    const row = domain === 'pantry' ? page.getByRole('button').filter({ hasText: name }) : page.locator('li').filter({ hasText: name })
    const remove = () => domain === 'pantry' ? page.getByRole('button', { name: 'Quitar de la despensa' }) : row.getByRole('button', { name: `Quitar ${name} de la lista` })
    if (domain === 'pantry') await row.click()
    for (const status of [400, 403, 404, 409, 500]) {
      code = status
      const response = page.waitForResponse(r => r.request().method() === 'DELETE')
      await remove().click()
      expect((await response).status()).toBe(status)
      await expect(page.getByText(domain === 'pantry' ? 'No se pudo quitar el producto' : 'No se pudo eliminar el producto')).toBeVisible()
      await expect(row).toBeVisible()
      await expect(remove()).toBeEnabled()
      await expect(page.getByText('private internal fixture information')).toHaveCount(0)
    }
    if (domain === 'pantry') {
      await expect(page.getByRole('dialog').getByRole('alert')).toBeVisible()
      expect(await page.getByRole('dialog').evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true)
      await page.screenshot({ path: `/tmp/kh020-remove-sheet-${width}.png`, animations: 'disabled' })
      await page.keyboard.press('Escape')
    }
    await expect(page.getByRole('dialog')).toHaveCount(0)
    // Double removal while the real server success response is retained.
    failureMethod = ''; hold = true
    if (domain === 'pantry') await row.click()
    const priorDeletes = deletes
    await remove().focus()
    await remove().evaluate(button => { (button as HTMLButtonElement).click(); (button as HTMLButtonElement).click() })
    await expect.poll(() => deletes).toBe(priorDeletes + 1)
    await expect.poll(() => !!release).toBe(true)
    release!(); release = undefined; hold = false
    await expect(row).toHaveCount(0)
    await expect(page.getByRole('dialog')).toHaveCount(0)
    expect(await page.evaluate(() => document.activeElement?.tagName)).not.toBe('BODY')
    await expect(page.getByRole('button', { name: 'Deshacer', exact: true })).toBeVisible()
    failureMethod = 'POST'
    for (const status of [400, 403, 404, 409, 500]) {
      code = status
      await page.getByRole('button', { name: status === 400 ? 'Deshacer' : 'Reintentar', exact: true }).click()
      await expect(page.getByText('No se pudo restaurar el producto')).toBeVisible()
      await expect(row).toHaveCount(0)
      await expect(page.getByRole('button', { name: 'Reintentar', exact: true })).toBeVisible()
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await expect(page.locator('.toast[data-open="true"]')).toHaveCSS('opacity', '1')
    await page.screenshot({ path: `/tmp/kh020-error-${domain}-${width}.png`, animations: 'disabled' })
    failureMethod = ''; hold = true
    const priorPosts = posts
    await page.getByRole('button', { name: 'Reintentar', exact: true }).evaluate(button => { (button as HTMLButtonElement).click(); (button as HTMLButtonElement).click() })
    await expect.poll(() => posts).toBe(priorPosts + 1)
    await expect.poll(() => !!release).toBe(true)
    release!(); release = undefined; hold = false
    await expect(row).toBeVisible()
    // remove -> undo -> remove; navigation while the server-confirmed delete response is pending.
    if (domain === 'pantry') await row.click()
    hold = true
    await remove().click()
    await expect.poll(() => !!release).toBe(true)
    if (domain === 'pantry') await page.keyboard.press('Escape')
    await page.getByRole('link', { name: /Recetas/ }).first().click()
    release!(); hold = false
    await page.goto(path)
    await expect(row).toHaveCount(0)
    expect(errors).toEqual([])
  })
}

for (const domain of ['pantry', 'shopping-list']) for (const operation of ['remove', 'undo']) test(`KH-020 401 redirects safely ${domain} ${operation}`, async ({ page }, info) => {
  expect((await page.request.post('/api/auth/register', { data: registrationData('expired'), headers: { 'X-Forwarded-For': info.testId } })).status()).toBe(201)
  const name = `Expired ${domain} ${operation}`
  const product = await (await page.request.post('/api/products', { data: { name, category: 'other' } })).json()
  await page.request.post(`/api/${domain}`, { data: domain === 'pantry' ? { productId: product.id, quantity: 5, unit: 'kg' } : { productId: product.id, name, purchaseQuantity: null, legacyQuantity: '5 kg' } })
  await page.goto(domain === 'pantry' ? '/inventory' : '/shopping-list')
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message))
  await page.route(`**/api/${domain}{,/**}`, route => route.request().method() === (operation === 'remove' ? 'DELETE' : 'POST') ? route.fulfill({ status: 401, json: { error: 'secret owner detail' } }) : route.continue())
  if (domain === 'pantry') {
    await page.getByRole('button').filter({ hasText: name }).click()
    await page.getByRole('button', { name: 'Quitar de la despensa' }).click()
  } else await page.getByRole('button', { name: `Quitar ${name} de la lista` }).click()
  if (operation === 'undo') await page.getByRole('button', { name: 'Deshacer', exact: true }).click()
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByText('secret owner detail')).toHaveCount(0)
  const rows = await (await page.request.get(`/api/${domain}`)).json()
  expect(rows.some((row: { productId: string }) => row.productId === product.id)).toBe(operation === 'remove')
  expect(errors).toEqual([])
})

test('KH-020 obsolete refresh cannot overwrite a newer edit on another row', async ({ page }, info) => {
  expect((await page.request.post('/api/auth/register', { data: registrationData('stale'), headers: { 'X-Forwarded-For': info.testId } })).status()).toBe(201)
  for (const name of ['First stale row', 'Second newer row']) await page.request.post('/api/shopping-list', { data: { name, purchaseQuantity: 1 } })
  await page.goto('/shopping-list')
  const first = page.locator('li').filter({ hasText: 'First stale row' })
  const second = page.locator('li').filter({ hasText: 'Second newer row' })
  await expect(first).toBeVisible()
  let release!: () => void
  let requests = 0
  await page.route('**/api/shopping-list', async route => {
    if (route.request().method() !== 'GET') return route.continue()
    const response = await route.fetch()
    if (++requests === 1) await new Promise<void>(resolve => { release = resolve })
    await route.fulfill({ response })
  })
  await first.getByRole('button', { name: 'Aumentar cantidad de First stale row' }).click()
  await expect.poll(() => requests).toBe(1)
  await second.getByRole('button', { name: 'Aumentar cantidad de Second newer row' }).click()
  await expect(second.getByLabel('2 paquetes para comprar')).toBeVisible()
  await expect.poll(() => requests).toBe(2)
  release()
  await expect(first.getByRole('button').first()).toBeEnabled()
  await expect(second.getByLabel('2 paquetes para comprar')).toBeVisible()
  await page.reload()
  await expect(first.getByLabel('2 paquetes para comprar')).toBeVisible()
  await expect(second.getByLabel('2 paquetes para comprar')).toBeVisible()
})

test('KH-020 pending remove does not close a newer sheet; late network rejection after navigation is handled', async ({ page }, info) => {
  expect((await page.request.post('/api/auth/register', { data: registrationData('late'), headers: { 'X-Forwarded-For': info.testId } })).status()).toBe(201)
  for (const name of ['Old pending removal', 'New active sheet']) {
    const product = await (await page.request.post('/api/products', { data: { name, category: 'other' } })).json()
    await page.request.post('/api/pantry', { data: { productId: product.id, quantity: 5, unit: 'kg' } })
  }
  await page.goto('/inventory')
  let release!: () => void
  let started = false
  let reject = false
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message))
  await page.route('**/api/pantry/*', async route => {
    if (route.request().method() !== 'DELETE') return route.continue()
    const response = reject ? null : await route.fetch()
    started = true
    await new Promise<void>(resolve => { release = resolve })
    if (response) await route.fulfill({ response })
    else await route.abort('failed')
  })
  await page.getByRole('button').filter({ hasText: 'Old pending removal' }).click()
  await page.getByRole('button', { name: 'Quitar de la despensa' }).click()
  await expect.poll(() => started).toBe(true)
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.getByRole('button').filter({ hasText: 'New active sheet' }).click()
  release()
  await expect(page.getByRole('button').filter({ hasText: 'Old pending removal' })).toHaveCount(0)
  await expect(page.getByRole('dialog')).toContainText('New active sheet')
  reject = true; started = false
  await page.getByRole('button', { name: 'Quitar de la despensa' }).click()
  await expect.poll(() => started).toBe(true)
  await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.getByRole('link', { name: /Recetas/ }).first().click()
  release()
  await page.goto('/inventory')
  await expect(page.getByRole('button').filter({ hasText: 'New active sheet' })).toBeVisible()
  expect(errors).toEqual([])
})

test('KH-020 lost undo response and concurrent re-add preserve current shopping packages', async ({ page }, info) => {
  expect((await page.request.post('/api/auth/register', { data: registrationData('lost'), headers: { 'X-Forwarded-For': info.testId } })).status()).toBe(201)
  const name = 'Lost undo response packages'
  const item = await (await page.request.post('/api/shopping-list', { data: { name, purchaseQuantity: 1 } })).json()
  await page.goto('/shopping-list')
  const row = page.locator('li').filter({ hasText: name })
  await row.getByRole('button', { name: `Quitar ${name} de la lista` }).click()
  await expect(row).toHaveCount(0)
  let lost = true
  await page.route('**/api/shopping-list', async route => {
    if (route.request().method() !== 'POST' || !lost) return route.continue()
    await route.fetch() // The real server commits, but the browser receives a network failure.
    lost = false
    await route.abort('failed')
  })
  await page.getByRole('button', { name: 'Deshacer', exact: true }).click()
  await expect(page.getByText('No se pudo restaurar el producto')).toBeVisible()
  await expect(row).toHaveCount(0)
  await page.getByRole('button', { name: 'Reintentar', exact: true }).click()
  await expect(row.getByLabel('1 paquetes para comprar')).toBeVisible()
  let rows = await (await page.request.get('/api/shopping-list')).json()
  expect(rows.filter((r: { name: string }) => r.name === name)).toHaveLength(1)
  await row.getByRole('button', { name: `Quitar ${name} de la lista` }).click()
  await expect(row).toHaveCount(0)
  await page.request.post('/api/shopping-list', { data: { name: item.name, purchaseQuantity: 7 } })
  await page.getByRole('button', { name: 'Deshacer', exact: true }).click()
  await expect(row.getByLabel('7 paquetes para comprar')).toBeVisible()
  rows = await (await page.request.get('/api/shopping-list')).json()
  expect(rows.filter((r: { name: string }) => r.name === name)).toHaveLength(1)
  expect(rows.find((r: { name: string }) => r.name === name).purchaseQuantity).toBe(7)
})
