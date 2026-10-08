import Database from 'better-sqlite3'
import { expect, test } from '@playwright/test'
import { resolveSqlitePath } from '../src/lib/sqliteUrl'
import { registrationData } from './registration'

test.use({ storageState: { cookies: [], origins: [] } })

test('Shopping List Zones polish keeps quantities honest and a bought row in place', async ({ page }, info) => {
  const registration = registrationData('shopping-iteration-2')
  expect((await page.request.post('/api/auth/register', {
    data: registration,
    headers: { 'X-Forwarded-For': info.testId },
  })).status()).toBe(201)

  const sql = new Database(resolveSqlitePath(process.env.DATABASE_URL, true))
  const { id: userId } = sql.prepare('SELECT id FROM User WHERE email=?').get(registration.email) as { id: string }
  const categories = ['fruit', 'meat', 'dairy', 'sauces', 'other', 'unmapped']
  const names = [
    'Espinacas baby', 'Aguacate hass', 'Champiñones', 'Calabacín', 'Brócoli', 'Salmón fresco',
    'Huevos camperos', 'Yogur griego natural', 'Pechuga de pollo', 'Aceite de oliva', 'Almendras',
    'Queso curado', 'Tomates cherry', 'Pimientos rojos', 'Merluza', 'Nata para cocinar', 'Pepino',
    'Coliflor', 'Panceta ahumada', 'Semillas de chía', 'Harina de almendra', 'Berenjena', 'Bacalao',
    'Leche de coco', 'Queso mozzarella', 'Lechuga romana', 'Ajo', 'Cebolla morada', 'Fresas',
    'Arándanos', 'Espárragos trigueros', 'Atún al natural', 'Requesón', 'Nueces', 'Caldo de huesos',
    'Rúcula', 'Pepinillos', `Producto con un nombre extraordinariamente largo ${'para comprobar el ajuste '.repeat(3)}`,
  ]
  sql.transaction(() => {
    for (let index = 0; index < names.length; index++) {
      const id = `iter2-${info.testId}-${index}`
      const category = categories[index % categories.length]
      const name = names[index]
      const packaged = [0, 1, 2, 5].includes(index) || (index > 5 && index % 3 === 0)
      const packageQuantity = index === 1 ? 1 : index === 0 ? 250 : index === 2 ? 250 : 500
      const packageUnit = index === 1 ? 'unidad' : index === 5 ? 'ml' : 'g'
      const knownNeed = ![2, 3, 37].includes(index)
      const needQuantity = index === 0 || index === 5 ? 200 : index === 1 || index === 4 ? 1 : 150
      const needUnit = index === 1 || index === 4 ? 'unidad' : 'g'
      sql.prepare('INSERT INTO Product(id,name,source,ownerId,category,unitPrice,packageQuantity,packageUnit,updatedAt) VALUES(?,?,?,?,?,?,?,?,?)')
        .run(id, name, 'manual', userId, category, index === 0 ? 2.5 : index === 1 ? 3.2 : index === 2 ? 4.4 : null, packaged ? packageQuantity : null, packaged ? packageUnit : null, Date.now())
      const unknownBoth = index === 3 || index === 37
      sql.prepare(`INSERT INTO ShoppingListItem
        (id,userId,productId,name,quantity,requiredQuantity,requiredUnit,originalIngredientText,purchaseQuantity,checked,sourceType,updatedAt)
        VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`).run(
        `${id}-row`, userId, id, name, unknownBoth ? null : '1',
        knownNeed ? needQuantity : null,
        knownNeed ? needUnit : null,
        unknownBoth ? index === 3 ? 'al gusto' : 'para decorar' : null,
        unknownBoth ? null : index === 6 ? 2 : 1,
        0,
        'manual', Date.now(),
      )
    }
    const manualId = `iter2-${info.testId}-manual`
    sql.prepare(`INSERT INTO ShoppingListItem(id,userId,name,quantity,purchaseQuantity,checked,sourceType,updatedAt)
      VALUES(?,?,?,?,?,?,?,?)`).run(manualId, userId, 'Manual sin producto', '2', 2, 0, 'manual', Date.now())
  })()

  try {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/shopping-list?redesign=1&grouping=zones')
    const zoneRows = page.getByRole('listitem')
    await expect(zoneRows).toHaveCount(39)
    await expect(page.getByRole('heading', { name: 'Fruta y verdura' })).toBeVisible()
    await expect(page.getByRole('region', { name: /Otros:/ })).toBeVisible()
    const known = page.getByRole('listitem').filter({ hasText: 'Espinacas baby' })
    await expect(known).toContainText('Necesitas 200 g')
    await expect(known).toContainText('Envase 250 g · 1 paquete')
    await expect(known.getByText('Precio catálogo: 2,50 €', { exact: true })).toBeHidden()
    const redundant = page.getByRole('listitem').filter({ hasText: 'Aguacate hass' })
    await expect(redundant).toContainText('Necesitas 1 unidad · 1 paquete')
    await expect(redundant).not.toContainText('Envase 1 unidad')
    const packageKnown = page.getByRole('listitem').filter({ hasText: 'Champiñones' })
    await expect(packageKnown).toContainText('Cantidad por confirmar')
    await expect(packageKnown).toContainText('Envase 250 g · 1 paquete')
    const needKnown = page.getByRole('listitem').filter({ hasText: 'Brócoli' })
    await expect(needKnown).toContainText('Necesitas 1 unidad')
    await expect(needKnown).toContainText('Envase por confirmar')
    const incompatible = page.getByRole('listitem').filter({ hasText: 'Salmón fresco' })
    await expect(incompatible).toContainText('Necesitas 200 g')
    await expect(incompatible).toContainText('Envase 500 ml · 1 paquete')
    const unknown = page.getByRole('listitem').filter({ hasText: 'Calabacín' })
    await expect(unknown).toContainText('Cantidad y envase por confirmar')
    await expect(unknown).not.toContainText('Compra 0')

    await page.screenshot({ path: 'design-experiments/shopping-list/iteration-2/zones/final-390-top.png', animations: 'disabled' })
    for (const width of [320, 768, 1280]) {
      await page.setViewportSize({ width, height: width < 500 ? 844 : 900 })
      await page.evaluate(() => new Promise<void>(resolve => {
        window.scrollTo(0, 0)
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      }))
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
      await page.screenshot({ path: `design-experiments/shopping-list/iteration-2/zones/final-${width}.png`, animations: 'disabled' })
    }
    await page.setViewportSize({ width: 390, height: 844 })

    const priceDisclosure = known.locator('details')
    const checkTarget = known.getByRole('button', { name: /Marcar .* como comprado/ })
    const checkBox = await checkTarget.boundingBox()
    expect(checkBox?.width).toBeGreaterThanOrEqual(44)
    expect(checkBox?.height).toBeGreaterThanOrEqual(44)
    await priceDisclosure.locator('summary').focus()
    const disclosureTarget = await priceDisclosure.locator('summary').boundingBox()
    expect(disclosureTarget?.width).toBeGreaterThanOrEqual(44)
    expect(disclosureTarget?.height).toBeGreaterThanOrEqual(44)
    await page.keyboard.press('Enter')
    await expect(priceDisclosure).toHaveAttribute('open', '')
    await expect(priceDisclosure.locator('summary')).toBeFocused()
    await expect(priceDisclosure.locator('summary')).toHaveCSS('outline-width', '2px')
    await expect(priceDisclosure.getByText('Precio catálogo: 2,50 €', { exact: true })).toBeVisible()
    await expect(priceDisclosure).not.toContainText('total')
    await page.screenshot({ path: 'design-experiments/shopping-list/iteration-2/zones/final-390-disclosure.png', animations: 'disabled' })
    await page.keyboard.press('Enter')
    await expect(priceDisclosure).not.toHaveAttribute('open', '')
    await priceDisclosure.locator('summary').click()
    const increment = priceDisclosure.getByRole('button', { name: 'Aumentar cantidad de Espinacas baby' })
    const incrementBox = await increment.boundingBox()
    expect(incrementBox?.width).toBeGreaterThanOrEqual(44)
    expect(incrementBox?.height).toBeGreaterThanOrEqual(44)
    await increment.click()
    await expect(known).toContainText('2 paquetes')
    await priceDisclosure.getByRole('button', { name: 'Reducir cantidad de Espinacas baby' }).click()
    await expect(known).toContainText('1 paquete')
    await priceDisclosure.locator('summary').click()

    const secondDisclosure = redundant.locator('details')
    await priceDisclosure.locator('summary').focus()
    await page.keyboard.press('Enter')
    await secondDisclosure.locator('summary').focus()
    await page.keyboard.press('Enter')
    await expect(page.locator('details[open]')).toHaveCount(2)
    await page.keyboard.press('Enter')
    await priceDisclosure.locator('summary').focus()
    await page.keyboard.press('Enter')
    await expect(page.locator('details[open]')).toHaveCount(0)
    const noPriceDisclosure = needKnown.locator('details')
    await noPriceDisclosure.locator('summary').focus()
    await page.keyboard.press('Enter')
    await expect(noPriceDisclosure.getByText(/Precio catálogo/)).toHaveCount(0)
    await page.keyboard.press('Enter')

    await needKnown.scrollIntoViewIfNeeded()
    await page.screenshot({ path: 'design-experiments/shopping-list/iteration-2/zones/final-390-package-unknown.png', animations: 'disabled' })
    await packageKnown.scrollIntoViewIfNeeded()
    await page.screenshot({ path: 'design-experiments/shopping-list/iteration-2/zones/final-390-need-unknown.png', animations: 'disabled' })

    const longName = page.getByRole('listitem').filter({ hasText: 'Producto con un nombre extraordinariamente largo' })
    await longName.scrollIntoViewIfNeeded()
    await page.screenshot({ path: 'design-experiments/shopping-list/iteration-2/zones/final-390-long-name.png', animations: 'disabled' })
    await unknown.scrollIntoViewIfNeeded()
    await page.screenshot({ path: 'design-experiments/shopping-list/iteration-2/zones/final-390-unknown.png', animations: 'disabled' })

    sql.prepare('UPDATE ShoppingListItem SET checked=1 WHERE id=?').run(`iter2-${info.testId}-6-row`)
    await page.reload()
    const boughtRow = page.getByRole('listitem').filter({ hasText: 'Huevos camperos' })
    await expect(boughtRow).toContainText('Comprado')
    await boughtRow.scrollIntoViewIfNeeded()
    await page.screenshot({ path: 'design-experiments/shopping-list/iteration-2/zones/final-390-purchased.png', animations: 'disabled' })

    sql.prepare('UPDATE Product SET packageQuantity=500,packageUnit=\'g\' WHERE ownerId=?').run(userId)
    await page.reload()
    await expect(page.getByRole('listitem').filter({ hasText: 'Envase 500 g' })).toHaveCount(38)
    sql.prepare('UPDATE ShoppingListItem SET checked=1 WHERE userId=?').run(userId)
    await page.goto('/shopping-list?redesign=1&grouping=zones')
    await expect(page.getByText('Todo comprado · los productos siguen en su sitio')).toBeVisible()
    await page.screenshot({ path: 'design-experiments/shopping-list/iteration-2/zones/final-390-all-purchased.png', animations: 'disabled' })
    sql.prepare('UPDATE ShoppingListItem SET checked=0 WHERE userId=?').run(userId)
    await page.goto('/shopping-list?redesign=1&grouping=zones')

    const middleRow = page.getByRole('listitem').filter({ hasText: 'Harina de almendra' })
    await expect(middleRow).toHaveCount(1)
    await middleRow.scrollIntoViewIfNeeded()
    const mark = middleRow.getByRole('button', { name: /Marcar .* como comprado/ })
    const name = (await mark.getAttribute('aria-label'))!.replace(/^Marcar | como comprado$/g, '')
    const stableRow = page.getByRole('listitem').filter({ hasText: name }).first()
    const disclosure = stableRow.locator('details')
    await disclosure.locator('summary').click()
    await expect(disclosure).toHaveAttribute('open', '')
    await mark.focus()
    const scrollBefore = await page.evaluate(() => scrollY)
    const rowTopBefore = await stableRow.evaluate(element => element.getBoundingClientRect().top)
    await page.keyboard.press('Enter')
    await expect(stableRow.getByRole('button', { name: /Devolver .* a la lista/ })).toHaveAttribute('aria-pressed', 'true')
    await expect(disclosure).toHaveAttribute('open', '')
    await expect(stableRow.getByRole('button', { name: /Devolver .* a la lista/ })).not.toHaveAttribute('aria-disabled', 'true', { timeout: 15_000 })
    await expect(stableRow).toContainText('Comprado')
    await expect.poll(async () => Math.abs(await stableRow.evaluate(element => element.getBoundingClientRect().top) - rowTopBefore)).toBeLessThanOrEqual(2)
    const scrollAfter = await page.evaluate(() => scrollY)
    expect(Math.abs(scrollAfter - scrollBefore)).toBeLessThanOrEqual(2)

    await page.emulateMedia({ reducedMotion: 'reduce' })
    await stableRow.getByRole('button', { name: /Devolver .* a la lista/ }).focus()
    await page.keyboard.press('Space')
    await expect(stableRow.getByRole('button', { name: /Marcar .* como comprado/ })).toHaveAttribute('aria-pressed', 'false')

    for (const count of [15, 5, 1]) {
      sql.prepare(`DELETE FROM ShoppingListItem WHERE userId=? AND id NOT IN
        (SELECT id FROM ShoppingListItem WHERE userId=? ORDER BY id LIMIT ?)`).run(userId, userId, count)
      await page.reload()
      await expect(page.getByRole('listitem')).toHaveCount(count)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    }

    sql.prepare('UPDATE ShoppingListItem SET requiredQuantity=NULL,requiredUnit=NULL,originalIngredientText=NULL,purchaseQuantity=NULL,checked=0 WHERE userId=?').run(userId)
    sql.prepare('UPDATE Product SET packageQuantity=NULL,packageUnit=NULL WHERE ownerId=?').run(userId)
    await page.reload()
    await expect(page.getByRole('listitem')).toHaveCount(1)
    const oneUnknown = page.getByRole('listitem').first()
    await expect(oneUnknown).toContainText('Cantidad y envase por confirmar')
    await expect(oneUnknown.getByRole('alert')).toHaveCount(0)

    const knownPackages = sql.prepare('UPDATE Product SET packageQuantity=500,packageUnit=\'g\' WHERE ownerId=?')
    knownPackages.run(userId)
    sql.prepare('UPDATE ShoppingListItem SET requiredQuantity=NULL,requiredUnit=NULL,purchaseQuantity=1 WHERE userId=?').run(userId)
    await page.reload()
    await expect(page.getByRole('listitem').first()).toContainText('Cantidad por confirmar')
    await expect(page.getByRole('listitem').first()).toContainText('Envase 500 g · 1 paquete')

    sql.prepare('UPDATE Product SET packageQuantity=NULL,packageUnit=NULL,category=\'other\' WHERE ownerId=?').run(userId)
    const addAdversarial = sql.prepare(`INSERT INTO ShoppingListItem
      (id,userId,name,quantity,requiredQuantity,requiredUnit,originalIngredientText,purchaseQuantity,checked,sourceType,updatedAt)
      VALUES(?,?,?,?,?,?,?,?,?,?,?)`)
    sql.transaction(() => {
      for (let index = 0; index < 99; index++) addAdversarial.run(
        `iter2-unknown-${info.testId}-${index}`, userId, `Desconocido ${index + 40}`, null, null, null, null, null, 0, 'manual', Date.now(),
      )
    })()
    await page.reload()
    await expect(page.getByRole('listitem')).toHaveCount(100)
    await expect(page.getByText('Cantidad y envase por confirmar', { exact: true })).toHaveCount(100)
    await expect(page.getByRole('heading', { name: 'Fruta y verdura' })).toHaveCount(0)
    await expect(page.getByRole('region', { name: /^Otros:/ })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.screenshot({ path: 'design-experiments/shopping-list/iteration-2/zones/final-390-100-unknown.png', animations: 'disabled' })
    await page.reload()
    await expect(page.getByRole('listitem')).toHaveCount(100)

    sql.prepare('DELETE FROM ShoppingListItem WHERE userId=?').run(userId)
    const addKnownProduct = sql.prepare(`INSERT INTO Product(id,name,source,ownerId,category,packageQuantity,packageUnit,updatedAt)
      VALUES(?,?,?,?,?,?,?,?)`)
    const addKnownPackage = sql.prepare(`INSERT INTO ShoppingListItem
      (id,userId,productId,name,quantity,requiredQuantity,requiredUnit,purchaseQuantity,checked,sourceType,updatedAt)
      VALUES(?,?,?,?,?,?,?,?,?,?,?)`)
    sql.transaction(() => {
      for (let index = 0; index < 100; index++) {
        const id = `iter2-known-${info.testId}-${index}`
        const name = `Producto con envase ${index}`
        addKnownProduct.run(id, name, 'manual', userId, 'unmapped', 500, 'g', Date.now())
        addKnownPackage.run(`${id}-row`, userId, id, name, '1', 150, 'g', 1, 0, 'manual', Date.now())
      }
    })()
    await page.reload()
    await expect(page.getByRole('listitem')).toHaveCount(100)
    await expect(page.getByText('Necesitas 150 g', { exact: true })).toHaveCount(100)
    await expect(page.getByText('Envase 500 g · 1 paquete', { exact: true })).toHaveCount(100)
    await expect(page.getByRole('region', { name: /^Otros:/ })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.screenshot({ path: 'design-experiments/shopping-list/iteration-2/zones/final-390-100-known-packages.png', animations: 'disabled' })

    sql.prepare('DELETE FROM ShoppingListItem WHERE userId=?').run(userId)
    const stressIds = Array.from({ length: 500 }, (_, index) => `iter2-stress-${info.testId}-${index}`)
    const addStressRow = sql.prepare(`INSERT INTO ShoppingListItem(id,userId,name,purchaseQuantity,checked,sourceType,updatedAt)
      VALUES(?,?,?,?,?,?,?)`)
    sql.transaction(() => stressIds.forEach((id, index) => addStressRow.run(id, userId, `Iter2 stress ${index}`, 1, 0, 'manual', Date.now())))()
    const stressResponse = await page.request.post('/api/shopping-list/mark-bought', { data: { ids: stressIds } })
    expect(stressResponse.ok()).toBe(true)
    expect(await stressResponse.json()).toEqual({ marked: 500 })
    await page.goto('/shopping-list?redesign=1&grouping=zones')
    await expect(page.locator('header').getByText('0 pendientes · 500 comprados')).toBeVisible()
    await expect(page.getByRole('listitem')).toHaveCount(500)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  } finally {
    sql.prepare('DELETE FROM ShoppingListItem WHERE userId=?').run(userId)
    sql.prepare('DELETE FROM PantryItem WHERE userId=?').run(userId)
    sql.prepare("DELETE FROM Product WHERE ownerId=? AND name LIKE 'Iter2 stress %'").run(userId)
    sql.prepare('DELETE FROM Product WHERE id LIKE ?').run(`iter2-${info.testId}-%`)
    sql.close()
  }
})
