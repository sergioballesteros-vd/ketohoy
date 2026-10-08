import { expect, test } from '@playwright/test'
import { registrationData } from './registration'

test.use({ storageState: { cookies: [], origins: [] } })

test('first-use guide uses account state, can be dismissed per account, and works by keyboard at supported widths', async ({ page }, info) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const first = registrationData('kh026-first')
  const registered = await page.request.post('/api/auth/register', {
    data: first,
    headers: { 'X-Forwarded-For': `kh026-${info.testId}-first` },
  })
  expect(registered.status()).toBe(201)
  await page.goto('/')

  const guide = page.getByRole('region', { name: 'Tu primer menú y compra' })
  await expect(guide).toBeVisible()
  await expect(guide.getByRole('link', { name: '1. Revisar o mantener preferencias' })).toHaveAttribute('href', '/preferences')
  await expect(guide.getByRole('link', { name: '2. Crear o revisar el menú' })).toHaveAttribute('aria-current', 'step')
  await expect(guide.getByText('Puedes dejar las preferencias como están y generar un menú; la despensa es opcional.')).toBeVisible()
  expect(await (await page.request.get('/api/weekly-plan')).json()).toBeNull()
  expect(await (await page.request.get('/api/shopping-list')).json()).toEqual([])
  expect(await (await page.request.get('/api/pantry')).json()).toEqual([])

  for (const width of [320, 390, 768, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
    await expect(guide.getByRole('button', { name: 'Omitir guía' })).toBeVisible()
  }

  const dismiss = guide.getByRole('button', { name: 'Omitir guía' })
  const preferences = guide.getByRole('link', { name: '1. Revisar o mantener preferencias' })
  await preferences.focus()
  await page.keyboard.press('Tab')
  await expect(guide.getByRole('link', { name: '2. Crear o revisar el menú' })).toBeFocused()
  await page.keyboard.press('Shift+Tab')
  await expect(preferences).toBeFocused()
  await dismiss.focus()
  await expect(dismiss).toBeFocused()
  expect(await dismiss.evaluate(element => element.matches(':focus-visible'))).toBe(true)
  await page.keyboard.press('Space')
  await expect(guide).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Hoy' })).toBeFocused()
  const keys = await page.evaluate(() => Object.keys(localStorage))
  expect(keys.some(key => key.startsWith('ketohoy:first-use-guide-dismissed:'))).toBe(true)
  expect(keys.some(key => key.includes(first.email))).toBe(false)
  await page.reload()
  await expect(page.getByRole('region', { name: 'Tu primer menú y compra' })).toHaveCount(0)

  await page.request.post('/api/auth/logout')
  const login = await page.request.post('/api/auth/login', {
    data: { email: first.email, password: first.password },
    headers: { 'X-Forwarded-For': `kh026-${info.testId}-first` },
  })
  expect(login.status()).toBe(200)
  await page.goto('/')
  await expect(page.getByRole('region', { name: 'Tu primer menú y compra' })).toHaveCount(0)

  await page.request.post('/api/auth/logout')
  const second = registrationData('kh026-second')
  const secondRegistration = await page.request.post('/api/auth/register', {
    data: second,
    headers: { 'X-Forwarded-For': `kh026-${info.testId}-second` },
  })
  expect(secondRegistration.status()).toBe(201)
  await page.goto('/')
  await expect(page.getByRole('region', { name: 'Tu primer menú y compra' })).toBeVisible()
})
