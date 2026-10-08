import { expect, test } from '@playwright/test'

test('public landing social metadata and final signup CTA', async ({ page }) => {
  await page.context().clearCookies()
  await page.goto('/')

  await expect(page).toHaveTitle('KetoHoy · Planificador de menú keto con productos de Mercadona')
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    'content',
    'Genera tu menú keto semanal con lo que ya tienes en casa y compra solo lo que falta, con productos de Mercadona.',
  )
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', /KetoHoy/)
  await expect(page.locator('meta[property="og:description"]')).toHaveAttribute('content', /Mercadona/)
  await expect(page.locator('meta[property="og:type"]')).toHaveAttribute('content', 'website')
  await expect(page.locator('meta[property="og:site_name"]')).toHaveAttribute('content', 'KetoHoy')
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute('content', 'http://127.0.0.1:3100')
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'http://127.0.0.1:3100')
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    'content',
    'http://127.0.0.1:3100/brand/ketohoy-icon-512.png',
  )
  await expect(page.locator('meta[property="og:image:alt"]')).toHaveAttribute('content', /KetoHoy/)
  await expect(page.locator('meta[property="og:image:width"]')).toHaveAttribute('content', '512')
  await expect(page.locator('meta[property="og:image:height"]')).toHaveAttribute('content', '512')
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary')
  await expect(page.locator('meta[name="twitter:title"]')).toHaveAttribute('content', /KetoHoy/)
  await expect(page.locator('meta[name="twitter:description"]')).toHaveAttribute('content', /Mercadona/)
  await expect(page.locator('meta[name="twitter:image"]')).toHaveAttribute(
    'content',
    'http://127.0.0.1:3100/brand/ketohoy-icon-512.png',
  )
  await expect(page.locator('meta[name="twitter:image:alt"]')).toHaveAttribute('content', /KetoHoy/)

  const imageResponse = await page.request.get('/brand/ketohoy-icon-512.png')
  expect(imageResponse.ok()).toBeTruthy()
  expect(imageResponse.headers()['content-type']).toContain('image/png')

  const finalCta = page.getByRole('link', { name: 'Crear cuenta gratis' }).last()
  await expect(page.getByRole('heading', { name: 'Empieza a planificar tu semana' })).toBeVisible()
  await expect(finalCta).toHaveAttribute('href', '/login?modo=registro')
  for (const width of [320, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 800 })
    await finalCta.scrollIntoViewIfNeeded()
    await expect(finalCta).toBeVisible()
    expect(await finalCta.evaluate(element => element.getBoundingClientRect().right <= window.innerWidth)).toBeTruthy()
  }

  let focused = false
  for (let i = 0; i < 30 && !focused; i++) {
    await page.keyboard.press('Tab')
    focused = await finalCta.evaluate(element => element === document.activeElement)
  }
  expect(focused).toBeTruthy()
  expect(await finalCta.evaluate(element => element.matches(':focus-visible'))).toBeTruthy()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/login\?modo=registro$/)
})
