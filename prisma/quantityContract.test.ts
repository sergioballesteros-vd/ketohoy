import { afterAll, expect, it } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import Database from 'better-sqlite3'
import { execFileSync } from 'node:child_process'
const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'kh005-migration-'))
afterAll(() => fs.rmSync(folder, { recursive: true, force: true }))
it('real migration preserves rows, ownership, purchases, pantry and unknown legacy; logical rollback', () => {
  const filename = path.join(folder, 'legacy.db')
  const source = new Database(path.resolve('dev.db'), { readonly: true })
  fs.writeFileSync(filename, source.serialize()); source.close()
  const sql = new Database(filename)
  const migration = '20261003200000_quantity_contract'
  // Rewind only this disposable clone so the migration under test actually runs in CI too.
  sql.exec(`
    DROP INDEX IF EXISTS ShoppingListItem_userId_sourceKey_key;
    DROP INDEX IF EXISTS UserPreferences_userId_key;
    DROP INDEX IF EXISTS PantryItem_userId_productId_unit_key;
    DROP INDEX IF EXISTS WeeklyPlan_userId_weekStart_key;
    DROP INDEX IF EXISTS WeeklyMeal_planId_dayOfWeek_mealType_key;
    CREATE INDEX IF NOT EXISTS UserPreferences_userId_idx ON UserPreferences(userId);
    CREATE INDEX IF NOT EXISTS PantryItem_userId_idx ON PantryItem(userId);
    CREATE INDEX IF NOT EXISTS WeeklyPlan_userId_idx ON WeeklyPlan(userId);
  `)
  for (const [table, column] of [
    ...['sourceContributions','requiredQuantity','requiredUnit','originalIngredientText','sourceType','sourceKey','purchaseQuantity','pantryItemId','pantryDeltaUnit'].map(column => ['ShoppingListItem', column]),
    ...['packageQuantity','packageUnit'].map(column => ['Product', column]),
  ]) {
    if ((sql.pragma(`table_info(${table})`) as { name: string }[]).some(row => row.name === column)) sql.exec(`ALTER TABLE ${table} DROP COLUMN ${column}`)
  }
  sql.prepare('DELETE FROM _prisma_migrations WHERE migration_name >= ?').run(migration)
  // Apply any missing earlier migrations on this copy before taking the baseline snapshot.
  const applied = new Set((sql.prepare('SELECT migration_name FROM _prisma_migrations').all() as { migration_name: string }[]).map(r => r.migration_name))
  for (const entry of fs.readdirSync('prisma/migrations').sort()) {
    if (entry >= migration || !fs.statSync(`prisma/migrations/${entry}`).isDirectory() || applied.has(entry)) continue
    sql.exec(fs.readFileSync(`prisma/migrations/${entry}/migration.sql`, 'utf8'))
    sql.prepare('INSERT INTO _prisma_migrations(id,checksum,finished_at,migration_name,started_at,applied_steps_count) VALUES(?,?,?,?,?,1)').run(entry, '', Date.now(), entry, Date.now())
  }
  sql.prepare('INSERT INTO ShoppingListItem(id,name,quantity,checked,updatedAt) VALUES(?,?,?,?,?)').run('kh005-legacy', 'Unknown need', '1', 1, Date.now())
  const snapshot = (table: string) => sql.prepare(`SELECT * FROM ${table} ORDER BY id`).all() as Record<string, unknown>[]
  const beforeList = snapshot('ShoppingListItem'), beforePantry = snapshot('PantryItem'), beforeProduct = snapshot('Product')
  const deploy = () => execFileSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy'], { env: { ...process.env, DATABASE_URL: `file:${filename}` }, stdio: 'pipe' })
  try {
    deploy()
    const projectOld = (rows: Record<string, unknown>[], old: Record<string, unknown>[]) => rows.map((r, i) => Object.fromEntries(Object.keys(old[i]).map(k => [k, r[k]])))
    expect(projectOld(snapshot('ShoppingListItem'), beforeList)).toEqual(beforeList)
    expect(snapshot('PantryItem')).toEqual(beforePantry)
    expect(projectOld(snapshot('Product'), beforeProduct)).toEqual(beforeProduct)
    expect(sql.prepare("SELECT requiredQuantity, requiredUnit, purchaseQuantity, sourceKey, sourceType FROM ShoppingListItem WHERE id='kh005-legacy'").get()).toEqual({ requiredQuantity: null, requiredUnit: null, purchaseQuantity: null, sourceKey: null, sourceType: 'legacy' })
    expect(sql.prepare('PRAGMA foreign_key_check').all()).toEqual([])
    const after = snapshot('ShoppingListItem'); deploy(); expect(snapshot('ShoppingListItem')).toEqual(after)
    // Logical rollback of additive schema on disposable copy only (before any new-domain writes).
    sql.exec('DROP INDEX ShoppingListItem_userId_sourceKey_key')
    for (const column of ['sourceContributions','requiredQuantity','requiredUnit','originalIngredientText','sourceType','sourceKey','purchaseQuantity','pantryItemId','pantryDeltaUnit']) sql.exec(`ALTER TABLE ShoppingListItem DROP COLUMN ${column}`)
    for (const column of ['packageQuantity','packageUnit']) sql.exec(`ALTER TABLE Product DROP COLUMN ${column}`)
    expect(snapshot('ShoppingListItem')).toEqual(beforeList)
    expect(snapshot('PantryItem')).toEqual(beforePantry)
    expect(snapshot('Product')).toEqual(beforeProduct)
  } finally { sql.close() }
}, 15000)
