import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import Database from 'better-sqlite3'
import { execFileSync } from 'node:child_process'
import { createLegacyMigrationFixture } from './testMigrationFixture'

const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'ketohoy-ownership-'))
const migrationRoot = path.resolve('prisma/migrations')
const requiredMigrations = path.join(folder, 'required-migrations')
const requiredConfig = path.join(folder, 'required-migrations.config.ts')
const legacyTemplate = path.join(folder, 'legacy-template.db')
const migratedLegacyTemplate = path.join(folder, 'migrated-legacy-template.db')
fs.mkdirSync(requiredMigrations)
for (const entry of fs.readdirSync(migrationRoot, { withFileTypes: true })) {
  if (entry.isDirectory() && entry.name >= '20261003120000_manual_product_ownership' && entry.name <= '20261005120000_weekly_shopping_sources')
    fs.cpSync(path.join(migrationRoot, entry.name), path.join(requiredMigrations, entry.name), { recursive: true })
  else if (entry.isFile() && entry.name === 'migration_lock.toml')
    fs.copyFileSync(path.join(migrationRoot, entry.name), path.join(requiredMigrations, entry.name))
}
afterAll(() => fs.rmSync(folder, { recursive: true, force: true }))

const migrate = (filename: string, config?: string) => execFileSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy', ...(config ? ['--config', config] : [])], {
  env: { ...process.env, DATABASE_URL: `file:${filename}` }, stdio: 'pipe',
})

const copyFixture = (filename: string, sourcePath: string) => {
  const source = new Database(sourcePath, { readonly: true })
  try { fs.writeFileSync(filename, source.serialize()) } finally { source.close() }
}

let products: Array<Record<string, unknown>> = []
let pantry: Array<Record<string, unknown>> = []
let shopping: Array<Record<string, unknown>> = []
let ingredients: Array<Record<string, unknown>> = []
const access = new Map<string, { productId: string; userId: string }>()
const preservedReference = (row: unknown) => {
  const item = row as Record<string, unknown>
  const copyId = `legacy-manual:${item.productId}:${item.userId}`
  return { ...item, ...('checked' in item ? { requiredQuantity: null, requiredUnit: null, originalIngredientText: null, sourceType: 'legacy', sourceKey: null, sourceContributions: null, purchaseQuantity: null, pantryItemId: null, pantryDeltaUnit: null } : {}), productId: access.has(copyId) ? copyId : item.productId }
}

beforeAll(() => {
  createLegacyMigrationFixture(legacyTemplate, '20261003120000_manual_product_ownership')
  fs.writeFileSync(requiredConfig, `export default { schema: ${JSON.stringify(path.resolve('prisma/schema.prisma'))}, migrations: { path: ${JSON.stringify(requiredMigrations)} }, datasource: { url: process.env.DATABASE_URL } }`)
  copyFixture(migratedLegacyTemplate, legacyTemplate)
  const sql = new Database(migratedLegacyTemplate)
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
  products = sql.prepare('SELECT * FROM Product ORDER BY id').all() as Array<Record<string, unknown>>
  pantry = sql.prepare('SELECT * FROM PantryItem ORDER BY id').all() as Array<Record<string, unknown>>
  shopping = sql.prepare('SELECT * FROM ShoppingListItem ORDER BY id').all() as Array<Record<string, unknown>>
  ingredients = sql.prepare('SELECT * FROM RecipeIngredient ORDER BY id').all() as Array<Record<string, unknown>>
  const manualIds = new Set(products.filter(p => p.source === 'manual').map(p => p.id))
  for (const row of [...pantry, ...shopping] as Array<{ productId: string | null; userId: string | null }>) {
    if (row.userId && row.productId && manualIds.has(row.productId))
      access.set(`legacy-manual:${row.productId}:${row.userId}`, { productId: row.productId, userId: row.userId })
  }
  sql.close()
  migrate(migratedLegacyTemplate, requiredConfig)
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
    copyFixture(filename, migratedLegacyTemplate)
    const sql = new Database(filename)
    try {
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
    } finally { sql.close() }
  })

  it('redeploys without copying products again', () => {
    const filename = path.join(folder, 'idempotent.db')
    copyFixture(filename, migratedLegacyTemplate)
    const sql = new Database(filename)
    try {
      const migrated = sql.prepare('SELECT * FROM Product ORDER BY id').all()
      migrate(filename, requiredConfig)
      expect(sql.prepare('SELECT * FROM Product ORDER BY id').all()).toEqual(migrated)
    } finally { sql.close() }
  })
})
