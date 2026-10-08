import { expect, test } from '@playwright/test'

test('landing and recipe detail use reviewed images, honest fallbacks, and no Unsplash search', async ({ page }) => {
  const context = page.context()
  await context.clearCookies()
  const unsplashApiRequests: string[] = []
  const pageErrors: string[] = []
  context.on('request', request => {
    if (request.url().startsWith('https://api.unsplash.com/')) unsplashApiRequests.push(request.url())
  })
  page.on('pageerror', error => pageErrors.push(error.message))

  await page.goto('/')
  const landingRecipes = page.locator('section[aria-labelledby="recipes"] li')
  await expect(landingRecipes).toHaveCount(4)
  await expect(landingRecipes.nth(0)).toContainText('Sin foto revisada')
  await expect(landingRecipes.nth(1)).toContainText('Imagen ilustrativa')
  await expect(landingRecipes.nth(1).getByRole('link', { name: /blackieshoot/ })).toHaveAttribute('href', /unsplash\.com\/@blackieshoot/)

  for (const width of [320, 390, 768, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
    for (let index = 0; index < 4; index++) {
      const imageFrame = landingRecipes.nth(index).locator('.relative.overflow-hidden')
      const { width: frameWidth, height: frameHeight } = await imageFrame.boundingBox() ?? { width: 0, height: 0 }
      expect(frameWidth).toBeGreaterThan(0)
      expect(frameWidth / frameHeight).toBeCloseTo(4 / 3, 1)
    }
    for (const index of [1, 2]) {
      const image = landingRecipes.nth(index).locator('img')
      await image.scrollIntoViewIfNeeded()
      await expect.poll(() => image.evaluate(element => {
        const loaded = element as HTMLImageElement
        return loaded.complete && loaded.naturalWidth > 0
      }), { timeout: 15_000 }).toBe(true)
    }
    await expect(landingRecipes.nth(0).getByRole('img', { name: 'Sin foto revisada' })).toBeVisible()
  }

  const noPhotoHref = await landingRecipes.nth(0).getByRole('link').first().getAttribute('href')
  await page.goto('/')
  await page.keyboard.press('Tab')
  await expect(page.getByRole('link', { name: 'Entrar' })).toBeFocused()
  await page.keyboard.press('Tab')
  await page.keyboard.press('Tab')
  await expect(landingRecipes.nth(0).getByRole('link').first()).toBeFocused()
  await page.keyboard.press('Shift+Tab')
  await expect(page.getByRole('link', { name: 'Crear cuenta gratis' }).first()).toBeFocused()
  await page.keyboard.press('Tab')
  await page.keyboard.press('Enter')
  await page.waitForURL(url => url.pathname === noPhotoHref)
  await page.goto('/')
  const homeCards = page.locator('section[aria-labelledby="recipes"] li')
  const keyboardHref = await homeCards.nth(0).getByRole('link').first().getAttribute('href')
  await page.goto(keyboardHref!)
  await expect(page.getByRole('heading', { name: 'Huevos revueltos con bacon y aguacate' })).toBeVisible()
  await expect(page.getByRole('img', { name: 'Sin foto revisada' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Ingredientes' })).toBeVisible()

  await page.goto('/')
  const freshLandingRecipes = page.locator('section[aria-labelledby="recipes"] li')
  const recipeHref = await freshLandingRecipes.nth(1).getByRole('link').first().getAttribute('href')
  const reviewedRecipeHref = await freshLandingRecipes.nth(2).getByRole('link').first().getAttribute('href')
  await page.close()
  const detailPage = await context.newPage()
  await detailPage.setViewportSize({ width: 1440, height: 900 })
  await detailPage.emulateMedia({ reducedMotion: 'reduce' })
  detailPage.on('pageerror', error => pageErrors.push(error.message))
  const image404Requests: string[] = []
  await detailPage.route('**/_next/image**', async route => {
    image404Requests.push(route.request().url())
    await route.fulfill({ status: 404, body: 'not found' })
  })
  await detailPage.goto(recipeHref!)
  await expect(detailPage.getByRole('heading', { name: 'Tortilla de queso y jamón' })).toBeVisible()
  await expect(detailPage.getByRole('heading', { name: 'Ingredientes' })).toBeVisible()
  await expect(detailPage.getByRole('img', { name: 'Foto no disponible' })).toBeVisible()
  await expect.poll(() => detailPage.getByRole('img', { name: 'Foto no disponible' }).evaluate(element => {
    const style = getComputedStyle(element)
    return [style.animationName, style.transform]
  })).toEqual(['none', 'none'])
  await expect(detailPage.getByText('Preparación')).toBeVisible()
  expect(image404Requests.length).toBeGreaterThan(0)
  expect(image404Requests.length).toBeLessThanOrEqual(2)
  expect(Math.max(...[...new Set(image404Requests)].map(url => image404Requests.filter(requestUrl => requestUrl === url).length))).toBeLessThanOrEqual(2)
  for (const width of [390, 1440]) {
    await detailPage.setViewportSize({ width, height: 900 })
    expect(await detailPage.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
    await expect(detailPage.getByRole('heading', { name: 'Preparación' })).toBeVisible()
  }
  await detailPage.close()

  const reviewedDetailPage = await context.newPage()
  reviewedDetailPage.on('pageerror', error => pageErrors.push(error.message))
  await reviewedDetailPage.goto(reviewedRecipeHref!)
  await expect(reviewedDetailPage.getByRole('heading', { name: 'Huevos fritos con bacon' })).toBeVisible()
  await expect(reviewedDetailPage.getByRole('link', { name: /James Kern/ })).toHaveAttribute('href', /unsplash\.com\/@jamesrkern/)
  const reviewedPhoto = reviewedDetailPage.locator('img')
  for (const width of [390, 1440]) {
    await reviewedDetailPage.setViewportSize({ width, height: 900 })
    await reviewedPhoto.scrollIntoViewIfNeeded()
    await expect.poll(() => reviewedPhoto.evaluate(element => {
      const loaded = element as HTMLImageElement
      return loaded.complete && loaded.naturalWidth > 0
    }), { timeout: 15_000 }).toBe(true)
    const frame = reviewedDetailPage.locator('.relative.overflow-hidden').first()
    const { width: frameWidth, height: frameHeight } = await frame.boundingBox() ?? { width: 0, height: 0 }
    expect(frameWidth).toBeGreaterThan(0)
    expect(frameWidth / frameHeight).toBeCloseTo(16 / 9, 1)
    expect(await reviewedDetailPage.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
  }
  expect(unsplashApiRequests).toEqual([])
  expect(pageErrors).toEqual([])
})
