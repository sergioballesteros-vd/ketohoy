import { expect, test } from '@playwright/test'
import { createHash } from 'node:crypto'
import Database from 'better-sqlite3'
import { resolveSqlitePath } from '../src/lib/sqliteUrl'
import { registrationData } from './registration'

test('offline shopping list survives reload privately, stays read-only, and revalidates after reconnect', async ({ page, context }) => {
  const pageErrors: string[] = []
  page.on('pageerror', error => pageErrors.push(error.message))
  const register = async (prefix: string) => {
    const response = await page.request.post('/api/auth/register', {
      data: registrationData(prefix),
      headers: { 'X-Forwarded-For': `${prefix}-${Date.now()}` },
    })
    expect(response.status()).toBe(201)
  }
  await register('kh028-account-a')
  await page.goto('/login')
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true)

  // Account A has a shell but has never opened its list, so this is a real first use offline.
  await context.setOffline(true)
  await page.goto('/shopping-list')
  await expect(page.getByText('No hay una copia disponible sin conexión. Abre la lista con conexión para guardar una copia.')).toBeVisible()
  await expect(page.getByText('Sin conexión', { exact: true })).toBeVisible()
  expect(await page.evaluate(() => localStorage.getItem('ketohoy:shoppingList:activeAccount'))).toBeNull()

  await context.setOffline(false)
  await expect(page.getByRole('button', { name: 'Añadir' })).toBeVisible()
  const first = 'KH028 snapshot one'
  expect((await page.request.post('/api/shopping-list', { data: { name: first, quantity: 1 } })).status()).toBe(201)
  await page.goto('/shopping-list')
  await expect(page.getByText(first)).toBeVisible()
  await expect.poll(() => page.evaluate(() => {
    const id = localStorage.getItem('ketohoy:shoppingList:activeAccount')
    return id && !!localStorage.getItem(`ketohoy:shoppingList:snapshot:${id}`)
  })).toBeTruthy()
  const cacheKeys = await page.evaluate(async () => {
    const names = await caches.keys()
    return (await Promise.all(names.map(async name => (await caches.open(name)).keys()))).flat().map(request => new URL(request.url).pathname)
  })
  expect(cacheKeys).toEqual(expect.arrayContaining(['/offline-shopping-list.html', '/offline-shopping-list.js']))
  expect(cacheKeys.some(key => key.startsWith('/api/'))).toBe(false)

  const key = await page.evaluate(() => {
    const id = localStorage.getItem('ketohoy:shoppingList:activeAccount')!
    return `ketohoy:shoppingList:snapshot:${id}`
  })
  const before = await page.evaluate(key => localStorage.getItem(key), key)
  for (const response of [
    { status: 500, body: '{}' },
    { status: 503, body: '{}' },
    { status: 200, body: '{"invalid":true}' },
  ]) {
    await page.route('**/api/shopping-list', route => route.fulfill({ status: response.status, contentType: 'application/json', body: response.body }))
    await page.reload()
    await expect(page.getByText('No se pudo actualizar')).toBeVisible()
    await expect(page.getByText(first)).toBeVisible()
    expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe(before)
    await page.unroute('**/api/shopping-list')
  }
  await page.route('**/api/shopping-list', route => route.abort('timedout'))
  await page.reload()
  await expect(page.getByText('No se pudo actualizar')).toBeVisible()
  await expect(page.getByText(first)).toBeVisible()
  expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe(before)
  await page.unroute('**/api/shopping-list')

  let mutations = 0
  page.on('request', request => { if (['POST', 'PATCH', 'DELETE'].includes(request.method())) mutations++ })
  await context.setOffline(true)
  await page.reload()
  await expect(page.getByText('Sin conexión', { exact: true })).toBeVisible()
  await expect(page.getByText(first)).toBeVisible()
  await expect(page.getByText(/Última copia guardada:/)).toBeVisible()
  await expect(page.getByRole('button')).toHaveCount(1)
  const retry = page.getByRole('button', { name: 'Reintentar' })
  await page.keyboard.press('Tab')
  await expect(retry).toBeFocused()
  expect(await retry.evaluate(button => getComputedStyle(button).outlineStyle)).toBe('solid')
  await page.keyboard.press('Shift+Tab')
  await expect(retry).not.toBeFocused()
  await page.keyboard.press('Tab')
  await expect(retry).toBeFocused()
  await page.keyboard.press('Enter')
  await page.keyboard.press('Space')
  expect(mutations).toBe(0)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  expect(await page.evaluate(() => document.getAnimations().length)).toBe(0)
  for (const width of [320, 390, 768, 1280, 1440]) {
    await page.setViewportSize({ width, height: 844 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await expect(page.getByText(first)).toBeVisible()
  }

  await context.setOffline(false)
  await expect(page.getByRole('button', { name: 'Añadir' })).toBeVisible()
  const second = 'KH028 snapshot two'
  expect((await page.request.post('/api/shopping-list', { data: { name: second, quantity: 2 } })).status()).toBe(201)
  await page.goto('/shopping-list')
  await expect(page.getByText(second)).toBeVisible()
  await context.setOffline(true)
  await page.reload()
  await expect(page.getByText(second)).toBeVisible()

  await context.setOffline(false)
  const otherTab = await context.newPage()
  await otherTab.goto('/shopping-list')
  await expect(otherTab.getByText(second)).toBeVisible()
  await page.goto('/preferences')
  await page.getByRole('button', { name: 'Cerrar sesión' }).click()
  await expect(page).toHaveURL(/\/login$/)
  await expect(otherTab.getByText('La sesión ha terminado. Inicia sesión para volver a consultar tu lista.')).toBeVisible()
  expect(await page.evaluate(() => Object.keys(localStorage).filter(name => name.startsWith('ketohoy:shoppingList:')))).toEqual([])

  await context.setOffline(true)
  await page.goBack()
  await expect(page).toHaveURL(/\/shopping-list$/)
  await expect(page.getByText(second)).toHaveCount(0)
  await expect(page.getByText('No hay una copia disponible sin conexión. Abre la lista con conexión para guardar una copia.')).toBeVisible()

  await context.setOffline(false)
  await register('kh028-account-b')
  await page.goto('/login')
  await context.setOffline(true)
  await page.goto('/shopping-list')
  await expect(page.getByText(second)).toHaveCount(0)
  await expect(page.getByText('No hay una copia disponible sin conexión. Abre la lista con conexión para guardar una copia.')).toBeVisible()
  expect(pageErrors).toEqual([])
})

test('offline shell clears its snapshot when the server rejects the saved session', async ({ page, context }) => {
  const registration = registrationData('kh028-expired-session')
  expect((await page.request.post('/api/auth/register', {
    data: registration,
    headers: { 'X-Forwarded-For': `kh028-expired-${Date.now()}` },
  })).status()).toBe(201)
  await page.goto('/login')
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true)
  await page.goto('/shopping-list')
  await expect.poll(() => page.evaluate(() => localStorage.getItem('ketohoy:shoppingList:activeAccount'))).toBeTruthy()

  const session = (await context.cookies()).find(cookie => cookie.name === 'session')
  expect(session).toBeTruthy()
  const sessionId = createHash('sha256').update(session!.value).digest('hex')
  const db = new Database(resolveSqlitePath(process.env.DATABASE_URL, true))
  try {
    expect(db.prepare('DELETE FROM Session WHERE id = ?').run(sessionId).changes).toBe(1)
  } finally {
    db.close()
  }

  const pageErrors: string[] = []
  page.on('pageerror', error => pageErrors.push(error.message))
  await page.goto('/offline-shopping-list.html')
  await expect(page.getByText('La sesión ha terminado', { exact: true })).toBeVisible()
  await expect(page.getByText('Conéctate e inicia sesión para volver a consultar tu lista.')).toBeVisible()
  expect(await page.evaluate(() => Object.keys(localStorage).filter(name => name.startsWith('ketohoy:shoppingList:')))).toEqual([])
  expect(pageErrors).toEqual([])
})
