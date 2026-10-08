import { test, expect } from '@playwright/test'

test.use({ storageState: { cookies: [], origins: [] } })

async function firstRecipe(page: import('@playwright/test').Page) {
  await page.goto('/')
  const link = page.locator('a[href^="/recipes/"]').first()
  const href = await link.getAttribute('href')
  expect(href).toBeTruthy()
  return href!
}

test('recipe registration returns to the recipe without replaying Add Missing', async ({ page }) => {
  const recipePath = await firstRecipe(page)
  const email = `kh042-${Date.now()}@example.com`
  await page.route('**/api/auth/register', route => route.continue({
    headers: { ...route.request().headers(), 'x-forwarded-for': `kh042-${email}` },
  }))
  await page.route('**/api/auth/login', route => route.continue({
    headers: { ...route.request().headers(), 'x-forwarded-for': `kh042-${email}` },
  }))
  let addMissingRequests = 0
  page.on('request', request => {
    if (request.method() === 'POST' && request.url().includes('/add-to-shopping-list')) addMissingRequests++
  })

  await page.goto(recipePath)
  await page.getByRole('link', { name: 'Crear cuenta o entrar' }).click()
  await expect(page).toHaveURL(`/login?returnTo=${encodeURIComponent(recipePath)}`)
  await page.getByRole('group', { name: 'Acceso a tu cuenta' }).getByRole('button', { name: 'Crear cuenta' }).click()
  await expect(page).toHaveURL(`/login?modo=registro&returnTo=${encodeURIComponent(recipePath)}`)
  await page.getByLabel('Email').fill(email)
  await page.getByLabel(/^Contraseña/).fill('kh042-password-123')
  await page.getByRole('checkbox', { name: /18/ }).check()
  await page.getByRole('checkbox', { name: /Acepto los/ }).check()
  await page.getByRole('button', { name: 'Crear mi cuenta' }).click()

  await expect(page).toHaveURL(recipePath)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Añadir lo que falta a la lista' })).toBeVisible()
  expect(addMissingRequests).toBe(0)
  expect(await (await page.request.get('/api/shopping-list')).json()).toEqual([])
  for (const width of [320, 390, 768, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto(recipePath)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Añadir lo que falta a la lista' })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
  }

  await page.goto('/preferences')
  await page.getByRole('button', { name: 'Cerrar sesión' }).click()
  await expect(page).toHaveURL(/\/login$/)
  await page.goto(recipePath)
  await page.getByRole('link', { name: 'Crear cuenta o entrar' }).click()
  await page.getByLabel('Email').fill(email)
  await page.getByLabel(/^Contraseña/).fill('kh042-password-123')
  await page.locator('form').getByRole('button', { name: 'Entrar' }).click()
  await expect(page).toHaveURL(recipePath)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  expect(addMissingRequests).toBe(0)

  await page.goto('/preferences')
  await page.getByRole('button', { name: 'Cerrar sesión' }).click()
  await expect(page).toHaveURL(/\/login$/)
  let externalNavigationRequests = 0
  await page.route('https://externo.invalid/**', route => {
    externalNavigationRequests++
    return route.abort()
  })
  await page.goto('/login?returnTo=https%3A%2F%2Fexterno.invalid')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel(/^Contraseña/).fill('kh042-password-123')
  await page.locator('form').getByRole('button', { name: 'Entrar' }).click()
  await expect(page).toHaveURL('/')
  expect(externalNavigationRequests).toBe(0)
})

test('login and registration mode follow URL history and unsafe returnTo falls back internally', async ({ page }) => {
  const returnTo = '/recipes/recipe-that-does-not-exist'
  await page.goto(`/login?returnTo=${encodeURIComponent(returnTo)}`)
  await expect(page.getByRole('heading', { name: 'Entrar' })).toBeVisible()
  await page.getByLabel('Email').fill('missing-kh042@example.com')
  await page.getByLabel(/^Contraseña/).fill('wrong-password')
  await page.locator('form').getByRole('button', { name: 'Entrar' }).click()
  await expect(page).toHaveURL(`/login?returnTo=${encodeURIComponent(returnTo)}`)
  await expect(page.getByText('Email o contraseña incorrectos', { exact: true })).toBeVisible()
  await page.getByRole('group', { name: 'Acceso a tu cuenta' }).getByRole('button', { name: 'Crear cuenta' }).click()
  await expect(page).toHaveURL(`/login?modo=registro&returnTo=${encodeURIComponent(returnTo)}`)
  await expect(page.getByRole('heading', { name: 'Crear cuenta' })).toBeVisible()
  const duplicateEmail = `kh042-duplicate-${Date.now()}@example.com`
  const duplicate = await page.request.post('/api/auth/register', {
    headers: { 'x-forwarded-for': `kh042-failure-${duplicateEmail}` },
    data: { email: duplicateEmail, password: 'kh042-password-123', acceptTerms: true, confirmAdult: true },
  })
  expect(duplicate.status()).toBe(201)
  await page.getByLabel('Email').fill(duplicateEmail)
  await page.getByLabel(/^Contraseña/).fill('kh042-password-123')
  await page.getByRole('checkbox', { name: /18/ }).check()
  await page.getByRole('checkbox', { name: /Acepto los/ }).check()
  await page.getByRole('button', { name: 'Crear mi cuenta' }).click()
  await expect(page).toHaveURL(`/login?modo=registro&returnTo=${encodeURIComponent(returnTo)}`)
  await expect(page.getByText('Ese email ya está registrado', { exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Crear cuenta' })).toBeVisible()
  await page.getByRole('group', { name: 'Acceso a tu cuenta' }).getByRole('button', { name: 'Entrar' }).click()
  await expect(page).toHaveURL(`/login?returnTo=${encodeURIComponent(returnTo)}`)
  await page.goBack()
  await expect(page).toHaveURL(`/login?modo=registro&returnTo=${encodeURIComponent(returnTo)}`)
  await expect(page.getByRole('heading', { name: 'Crear cuenta' })).toBeVisible()
  await page.goForward()
  await expect(page.getByRole('heading', { name: 'Entrar' })).toBeVisible()

  await page.goto('/login?returnTo=https%3A%2F%2Fexterno.invalid')
  await expect(page.getByRole('heading', { name: 'Entrar' })).toBeVisible()
  await page.getByRole('group', { name: 'Acceso a tu cuenta' }).getByRole('button', { name: 'Crear cuenta' }).click()
  await expect(page).toHaveURL('/login?modo=registro')
  await page.goto('/login?modo=foo&returnTo=%2Frecipes%2Fabc')
  await expect(page).toHaveURL('/login?returnTo=%2Frecipes%2Fabc')
  await expect(page.getByRole('heading', { name: 'Entrar' })).toBeVisible()
})

test('login mode works by keyboard at supported widths with reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  for (const width of [320, 390, 768, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/login?returnTo=%2Frecipes%2Fabc')
    const group = page.getByRole('group', { name: 'Acceso a tu cuenta' })
    const register = group.getByRole('button', { name: 'Crear cuenta' })
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    await expect(register).toBeFocused()
    expect(await register.evaluate(element => element.matches(':focus-visible'))).toBe(true)
    const login = group.getByRole('button', { name: 'Entrar' })
    await page.keyboard.press('Shift+Tab')
    await expect(login).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(register).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL('/login?modo=registro&returnTo=%2Frecipes%2Fabc')
    await expect(page.getByRole('heading', { name: 'Crear cuenta' })).toBeVisible()
    await login.focus()
    await expect(login).toBeFocused()
    await page.keyboard.press('Space')
    await expect(page).toHaveURL('/login?returnTo=%2Frecipes%2Fabc')
    await expect(page.getByRole('heading', { name: 'Entrar' })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
  }
})
