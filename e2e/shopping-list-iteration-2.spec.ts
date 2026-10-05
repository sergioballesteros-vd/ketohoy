import Database from 'better-sqlite3'
import { expect, test } from '@playwright/test'
import { resolveSqlitePath } from '../src/lib/sqliteUrl'
import { registrationData } from './registration'

test.use({ storageState: { cookies: [], origins: [] } })

test('Iteration 2 keeps row anatomy identical across grouping and preserves a bought row in place', async ({ page }, info) => {
  const registration = registrationData('shopping-iteration-2')
  expect((await page.request.post('/api/auth/register', {
    data: registration,
    headers: { 'X-Forwarded-For': info.testId },
  })).status()).toBe(201)

  const sql = new Database(resolveSqlitePath(process.env.DATABASE_URL, true))
  const { id: userId } = sql.prepare('SELECT id FROM User WHERE email=?').get(registration.email) as { id: string }
  const categories = ['fruit', 'meat', 'dairy', 'sauces', 'other', 'unmapped']
  sql.transaction(() => {
    for (let index = 0; index < 99; index++) {
      const id = `iter2-${info.testId}-${index}`
      const category = categories[index % categories.length]
      const name = index === 98 ? `Desconocido ${'con nombre extraordinariamente largo '.repeat(3)}` : `Producto ${String(index + 1).padStart(2, '0')}`
      const packaged = index === 0 || index === 1
      sql.prepare('INSERT INTO Product(id,name,source,ownerId,category,unitPrice,packageQuantity,packageUnit,updatedAt) VALUES(?,?,?,?,?,?,?,?,?)')
        .run(id, name, 'manual', userId, category, index === 0 ? 2.5 : index === 1 ? 3.2 : null, packaged ? index === 0 ? 500 : 250 : null, packaged ? 'g' : null, Date.now())
      const known = index === 0 || index === 2
      const unknownBoth = index === 3 || index === 98
      sql.prepare(`INSERT INTO ShoppingListItem
        (id,userId,productId,name,quantity,requiredQuantity,requiredUnit,originalIngredientText,purchaseQuantity,checked,sourceType,updatedAt)
        VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`).run(
        `${id}-row`, userId, id, name, index === 3 ? null : '1',
        known ? index === 0 ? 300 : 2 : null,
        known ? index === 0 ? 'g' : 'cucharadas' : null,
        unknownBoth ? 'al gusto' : null,
        index === 3 || index === 98 ? null : 1,
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
    await page.goto('/shopping-list?redesign=1&grouping=flat')
    const flatRows = page.getByRole('listitem')
    await expect(flatRows).toHaveCount(100)
    await expect(page.getByRole('heading', { name: 'Fruta y verdura' })).toHaveCount(0)
    const flatContent = await flatRows.allTextContents()

    await page.goto('/shopping-list?redesign=1&grouping=zones')
    const zoneRows = page.getByRole('listitem')
    await expect(zoneRows).toHaveCount(100)
    await expect(page.getByRole('heading', { name: 'Fruta y verdura' })).toBeVisible()
    await expect(page.getByRole('region', { name: /Otros:/ })).toBeVisible()
    const zoneNames = await zoneRows.allTextContents()
    expect([...flatContent].sort()).toEqual([...zoneNames].sort())

    const known = page.getByRole('listitem').filter({ hasText: 'Producto 01' })
    await expect(known).toContainText('Necesitas 300 g')
    await expect(known).toContainText('Envase 500 g · Compra 1 paquete')
    await expect(known).toContainText('Precio · 2,50 €')
    const packageKnown = page.getByRole('listitem').filter({ hasText: 'Producto 02' })
    await expect(packageKnown).toContainText('Cantidad por confirmar')
    await expect(packageKnown).toContainText('Envase 250 g · Compra 1 paquete')
    await expect(packageKnown).toContainText('Precio · 3,20 €')
    const needKnown = page.getByRole('listitem').filter({ hasText: 'Producto 03' })
    await expect(needKnown).toContainText('Necesitas 2 cucharadas')
    await expect(needKnown).toContainText('Envase por confirmar')
    const unknown = page.getByRole('listitem').filter({ hasText: 'Desconocido' })
    await expect(unknown).toContainText('Cantidad y envase por confirmar')
    await expect(unknown).not.toContainText('Compra 0')

    const capture = async (grouping: 'flat' | 'zones', name: string) => {
      await page.goto(`/shopping-list?redesign=1&grouping=${grouping}`)
      await page.screenshot({ path: `design-experiments/shopping-list/iteration-2/${grouping}/390-${name}.png`, animations: 'disabled' })
    }
    for (const grouping of ['flat', 'zones'] as const) {
      await capture(grouping, 'top')
      const middle = page.getByRole('listitem').nth(19)
      await middle.scrollIntoViewIfNeeded()
      await page.screenshot({ path: `design-experiments/shopping-list/iteration-2/${grouping}/390-middle.png`, animations: 'disabled' })
      for (const width of [320, 768, 1280]) {
        await page.setViewportSize({ width, height: width < 500 ? 844 : 900 })
        await page.evaluate(() => new Promise<void>(resolve => {
          window.scrollTo(0, 0)
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
        }))
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
        await page.screenshot({ path: `design-experiments/shopping-list/iteration-2/${grouping}/${width}.png`, animations: 'disabled' })
      }
      await page.setViewportSize({ width: 390, height: 844 })
    }
    sql.prepare('UPDATE ShoppingListItem SET checked=1 WHERE id=?').run(`iter2-${info.testId}-6-row`)
    for (const grouping of ['flat', 'zones'] as const) {
      await capture(grouping, 'mixed-purchased')
      const unknownRow = page.getByRole('listitem').filter({ hasText: 'Desconocido' })
      await unknownRow.scrollIntoViewIfNeeded()
      await page.screenshot({ path: `design-experiments/shopping-list/iteration-2/${grouping}/390-unknown.png`, animations: 'disabled' })
    }
    sql.prepare('UPDATE ShoppingListItem SET checked=1 WHERE userId=?').run(userId)
    for (const grouping of ['flat', 'zones'] as const) {
      await page.goto(`/shopping-list?redesign=1&grouping=${grouping}`)
      await expect(page.getByText('Todo comprado · los productos siguen en su sitio')).toBeVisible()
      await page.screenshot({ path: `design-experiments/shopping-list/iteration-2/${grouping}/390-all-purchased.png`, animations: 'disabled' })
    }
    sql.prepare('UPDATE ShoppingListItem SET checked=0 WHERE userId=?').run(userId)
    await page.goto('/shopping-list?redesign=1&grouping=zones')

    const middleRow = page.getByRole('listitem').filter({ hasText: 'Producto 20' })
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
    const rowTopAfter = await stableRow.evaluate(element => element.getBoundingClientRect().top)
    const scrollAfter = await page.evaluate(() => scrollY)
    expect(Math.abs(rowTopAfter - rowTopBefore)).toBeLessThanOrEqual(2)
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

    sql.prepare('DELETE FROM ShoppingListItem WHERE userId=?').run(userId)
    const stressIds = Array.from({ length: 500 }, (_, index) => `iter2-stress-${info.testId}-${index}`)
    const addStressRow = sql.prepare(`INSERT INTO ShoppingListItem(id,userId,name,purchaseQuantity,checked,sourceType,updatedAt)
      VALUES(?,?,?,?,?,?,?)`)
    sql.transaction(() => stressIds.forEach((id, index) => addStressRow.run(id, userId, `Iter2 stress ${index}`, 1, 0, 'manual', Date.now())))()
    const stressResponse = await page.request.post('/api/shopping-list/mark-bought', { data: { ids: stressIds } })
    expect(stressResponse.ok()).toBe(true)
    expect(await stressResponse.json()).toEqual({ marked: 500 })
    await page.goto('/shopping-list?redesign=1&grouping=flat')
    await expect(page.getByText('0 pendientes · 500 comprados')).toBeVisible()
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
