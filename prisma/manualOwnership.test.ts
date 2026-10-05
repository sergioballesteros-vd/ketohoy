import { afterAll, describe, expect, it } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import Database from 'better-sqlite3'
import { execFileSync } from 'node:child_process'

const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'ketohoy-ownership-'))
afterAll(() => fs.rmSync(folder, { recursive: true, force: true }))

const migrate = (filename: string) => execFileSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy'], {
  env: { ...process.env, DATABASE_URL: `file:${filename}` }, stdio: 'pipe',
})

describe('manual ownership migration', () => {
  it('applies real DDL to a fresh database', () => {
    const filename = path.join(folder, 'fresh.db')
    // Materialize an empty SQLite file before invoking the schema engine.
    new Database(filename).close()
    migrate(filename)
    const sql = new Database(filename)
    try {
      expect((sql.prepare('PRAGMA table_info(Product)').all() as Array<{ name: string }>).map(column => column.name)).toContain('ownerId')
      expect(sql.prepare("SELECT COUNT(*) AS n FROM _prisma_migrations WHERE migration_name = '20261003120000_manual_product_ownership' AND finished_at IS NOT NULL").get()).toEqual({ n: 1 })
      expect(sql.prepare('PRAGMA foreign_key_check').all()).toEqual([])
    } finally { sql.close() }
  })

  it('keeps legacy values and references without assigning or deleting manual products', () => {
    const filename = path.join(folder, 'legacy.db')
    const original = new Database(path.resolve('dev.db'), { readonly: true })
    fs.writeFileSync(filename, original.serialize())
    original.close()
    const sql = new Database(filename)
    // A legacy product referenced by two accounts gets independent private copies.
    for (const id of ['legacy-owner-a', 'legacy-owner-b']) {
      sql.prepare('INSERT INTO User (id, email, passwordHash) VALUES (?, ?, ?)').run(id, `${id}@example.com`, 'test')
      sql.prepare('INSERT INTO Product (id, name, source, category, updatedAt) VALUES (?, ?, ?, ?, ?)')
        .run(`legacy-${id}`, 'Legacy unreferenced', 'manual', 'other', Date.now())
    }
    sql.prepare('INSERT INTO Product (id, name, source, category, updatedAt) VALUES (?, ?, ?, ?, ?)')
      .run('legacy-shared-probe', 'Legacy shared probe', 'manual', 'other', Date.now())
    sql.prepare('INSERT INTO PantryItem (id, productId, userId, quantity, updatedAt) VALUES (?, ?, ?, ?, ?)')
      .run('legacy-stock-a', 'legacy-shared-probe', 'legacy-owner-a', 3, Date.now())
    sql.prepare('INSERT INTO ShoppingListItem (id, productId, userId, name, quantity, checked, pantryDelta, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run('legacy-list-b', 'legacy-shared-probe', 'legacy-owner-b', 'Legacy shared probe', '2', 1, 2, Date.now())
    const products = sql.prepare('SELECT * FROM Product ORDER BY id').all() as Array<Record<string, unknown>>
    const pantry = sql.prepare('SELECT * FROM PantryItem ORDER BY id').all()
    const shopping = sql.prepare('SELECT * FROM ShoppingListItem ORDER BY id').all()
    const ingredients = sql.prepare('SELECT * FROM RecipeIngredient ORDER BY id').all()
    const manualIds = new Set(products.filter(p => p.source === 'manual').map(p => p.id))
    const access = new Map<string, { productId: string; userId: string }>()
    for (const row of [...pantry, ...shopping] as Array<{ productId: string | null; userId: string | null }>) {
      if (row.userId && row.productId && manualIds.has(row.productId)) {
        access.set(`legacy-manual:${row.productId}:${row.userId}`, { productId: row.productId, userId: row.userId })
      }
    }
    const preservedReference = (row: unknown) => {
      const item = row as Record<string, unknown>
      const copyId = `legacy-manual:${item.productId}:${item.userId}`
      return { ...item, ...('checked' in item ? { requiredQuantity: null, requiredUnit: null, originalIngredientText: null, sourceType: 'legacy', sourceKey: null, sourceContributions: null, purchaseQuantity: null, pantryItemId: null, pantryDeltaUnit: null } : {}), productId: access.has(copyId) ? copyId : item.productId }
    }
    try {
      migrate(filename)
      // Ownership preserves originals; KH-025 separately downgrades unverified legacy OFF evidence.
      for (const product of products) {
        expect(sql.prepare('SELECT * FROM Product WHERE id = ?').get(product.id)).toEqual({ ...product, ownerId: null, nutritionConvention: 'unknown', packageQuantity: null, packageUnit: null, ...(product.nutritionSource === 'openfoodfacts' ? { ketoScore: 0 } : {}) })
      }
      for (const [copyId, link] of access) {
        const originalProduct = products.find(p => p.id === link.productId)!
        expect(sql.prepare('SELECT * FROM Product WHERE id = ?').get(copyId)).toEqual({ ...originalProduct, id: copyId, ownerId: link.userId, mercadonaId: null, nutritionConvention: 'unknown', packageQuantity: null, packageUnit: null, ...(originalProduct.nutritionSource === 'openfoodfacts' ? { ketoScore: 0 } : {}) })
      }
      expect(sql.prepare('SELECT COUNT(*) AS n FROM Product').get()).toEqual({ n: products.length + access.size })
      expect(sql.prepare('SELECT * FROM PantryItem ORDER BY id').all()).toEqual(pantry.map(preservedReference))
      expect(sql.prepare('SELECT * FROM ShoppingListItem ORDER BY id').all()).toEqual(shopping.map(preservedReference))
      expect(sql.prepare('SELECT * FROM RecipeIngredient ORDER BY id').all()).toEqual(ingredients)
      expect(sql.prepare('PRAGMA foreign_key_check').all()).toEqual([])
      const migrated = sql.prepare('SELECT * FROM Product ORDER BY id').all()
      migrate(filename) // repeat deploy must not copy again or reinterpret data
      expect(sql.prepare('SELECT * FROM Product ORDER BY id').all()).toEqual(migrated)
    } finally { sql.close() }
  })
})
