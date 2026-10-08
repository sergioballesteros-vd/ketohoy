import { test, expect } from '@playwright/test'

const demoResponse = {
  source: 'demo', fetchedAt: null, completeness: 'demo', freshness: 'demo', available: true,
  products: [{
    id: 'mercadona_demo_salmon', name: 'Salmón de demostración', brand: 'Mercadona', source: 'mercadona',
    mercadonaId: 'demo_salmon', category: 'fish', ketoScore: 5,
    classification: { score: 5, label: 'Estimación por categoría', source: 'category_estimate', evidence: 'category_name' },
    unitPrice: 8.99, referencePrice: '250 g', imageUrl: null, tags: '[]',
  }],
}
const liveProduct = { ...demoResponse.products[0], id: 'mercadona_501', mercadonaId: '501', name: 'Salmón fresco' }
const degradedResponses = [
  { data: demoResponse, message: 'Catálogo de demostración', priceWarning: 'no son actuales' },
  { data: { source: 'mercadona', fetchedAt: new Date(0).toISOString(), completeness: 'partial', freshness: 'fresh', available: true, products: [liveProduct] }, message: 'Catálogo parcial', priceWarning: '' },
  { data: { source: 'mercadona', fetchedAt: new Date(0).toISOString(), completeness: 'complete', freshness: 'stale', available: true, products: [liveProduct] }, message: 'última copia disponible', priceWarning: 'pueden haber cambiado' },
]

test('KH-023 demo pricing is explicit, retry works by keyboard, and notice fits target widths', async ({ page }, info) => {
  await page.setExtraHTTPHeaders({ 'X-Forwarded-For': `catalog-${info.testId}` })
  let requests = 0
  const requestUrls: string[] = []
  let responseBody: typeof degradedResponses[number]['data'] = demoResponse
  await page.route('**/api/mercadona/**', route => {
    requests++
    requestUrls.push(route.request().url())
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(responseBody) })
  })

  for (const width of [320, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: width < 500 ? 844 : 900 })
    responseBody = { ...demoResponse, source: 'mercadona', fetchedAt: new Date().toISOString(), completeness: 'complete', freshness: 'fresh', products: [liveProduct] }
    await page.goto('/explore')
    await expect(page.getByRole('status')).toHaveCount(0)
    await expect(page.getByText('8,99 €')).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)

    for (const degraded of degradedResponses) {
      responseBody = degraded.data
      await page.goto('/explore')
      const status = page.getByRole('status')
      await expect(status).toContainText(degraded.message)
      if (degraded.priceWarning) await expect(status).toContainText(degraded.priceWarning)
      await expect(page.getByText('8,99 €')).toBeVisible()
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)

      const retry = status.getByRole('button', { name: 'Reintentar' })
      await retry.focus()
      await expect(retry).toBeFocused()
      const previousRequests = requests
      await page.keyboard.press('Enter')
      await expect.poll(() => requests).toBe(previousRequests + 1)
    }
  }

  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole('button', { name: 'Pescado' }).click()
  await expect.poll(() => requestUrls.at(-1)).toContain('/api/mercadona/category/fish')
  await page.getByRole('button', { name: 'Salmón', exact: true }).click()
  const categoryUrl = requestUrls.at(-1)!
  const categoryRetry = page.getByRole('status').getByRole('button', { name: 'Reintentar' })
  const beforeCategoryRetry = requestUrls.length
  await categoryRetry.focus()
  await page.keyboard.press('Enter')
  await expect.poll(() => requestUrls.length).toBe(beforeCategoryRetry + 1)
  expect(requestUrls.at(-1)).toBe(categoryUrl)
  await expect(page.getByRole('button', { name: 'Salmón', exact: true })).toHaveAttribute('aria-pressed', 'true')

  await page.getByRole('button', { name: 'Todo' }).click()
  await page.getByRole('searchbox', { name: 'Buscar productos keto' }).fill('atún')
  await expect.poll(() => requestUrls.at(-1)).toContain('q=at%C3%BAn')
  const queryUrl = requestUrls.at(-1)
  const queryRetry = page.getByRole('status').getByRole('button', { name: 'Reintentar' })
  const beforeQueryRetry = requestUrls.length
  await queryRetry.focus()
  await page.keyboard.press('Enter')
  await expect.poll(() => requestUrls.length).toBe(beforeQueryRetry + 1)
  expect(requestUrls.at(-1)).toBe(queryUrl)
})
