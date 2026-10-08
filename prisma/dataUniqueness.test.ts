import { afterAll, beforeAll, expect, inject, it } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import Database from 'better-sqlite3'
import { createLegacyMigrationFixture } from './testMigrationFixture'

const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'kh034-migration-'))
const repository = process.cwd()
const migrationRoot = path.join(repository, 'prisma/migrations')
const testedMigration = path.join(folder, 'tested-migration')
fs.mkdirSync(testedMigration)
for (const entry of fs.readdirSync(migrationRoot, { withFileTypes: true })) {
  if (entry.isDirectory() && entry.name === '20261006120000_data_uniqueness')
    fs.cpSync(path.join(migrationRoot, entry.name), path.join(testedMigration, entry.name), { recursive: true })
  else if (entry.isFile() && entry.name === 'migration_lock.toml')
    fs.copyFileSync(path.join(migrationRoot, entry.name), path.join(testedMigration, entry.name))
}
afterAll(() => fs.rmSync(folder, { recursive: true, force: true }))

const deploy = (filename: string, migrations = migrationRoot) => {
  const config = path.join(repository, `.prisma-kh034-${process.pid}-${Date.now()}.config.ts`)
  fs.writeFileSync(config, `export default { schema: ${JSON.stringify(path.join(repository, 'prisma/schema.prisma'))}, migrations: { path: ${JSON.stringify(migrations)} }, datasource: { url: process.env.DATABASE_URL } }`)
  try {
    return execFileSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy', '--config', config], {
      env: { ...process.env, DATABASE_URL: `file:${filename}` }, stdio: 'pipe',
    })
  } finally { fs.rmSync(config, { force: true }) }
}

const copyFixture = (filename: string, sourcePath: string) => {
  const source = new Database(sourcePath, { readonly: true })
  try { fs.writeFileSync(filename, source.serialize()) } finally { source.close() }
}

const legacyTemplate = path.join(folder, 'legacy-template.db')
const duplicateDb = path.join(folder, 'duplicates.db')
const testDbTemplate = inject('testDbTemplatePath')
let duplicateBefore: ReturnType<typeof snapshot>
let duplicateFailure = ''
beforeAll(() => {
  createLegacyMigrationFixture(legacyTemplate, '20261006120000_data_uniqueness')
  copyFixture(duplicateDb, legacyTemplate)
  const db = new Database(duplicateDb)
  const timestamp = new Date().toISOString()
  const userId = 'kh034-duplicate-user'
  db.prepare('INSERT INTO User(id,email,passwordHash) VALUES(?,?,?)').run(userId, `${userId}@example.test`, 'fixture')
  for (const id of ['kh034-pref-a', 'kh034-pref-b'])
    db.prepare('INSERT INTO UserPreferences(id,userId,createdAt,updatedAt) VALUES(?,?,?,?)').run(id, userId, timestamp, timestamp)
  const productId = 'kh034-duplicate-product'
  db.prepare('INSERT INTO Product(id,name,category,createdAt,updatedAt) VALUES(?,?,?,?,?)').run(productId, 'KH034 duplicate fixture', 'other', timestamp, timestamp)
  for (const id of ['kh034-pantry-a', 'kh034-pantry-b'])
    db.prepare('INSERT INTO PantryItem(id,productId,userId,unit,createdAt,updatedAt) VALUES(?,?,?,?,?,?)').run(id, productId, userId, 'g', timestamp, timestamp)
  const weekStart = '2026-10-05T00:00:00.000Z'
  for (const id of ['kh034-plan-a', 'kh034-plan-b'])
    db.prepare('INSERT INTO WeeklyPlan(id,userId,weekStart,createdAt,updatedAt) VALUES(?,?,?,?,?)').run(id, userId, weekStart, timestamp, timestamp)
  for (const id of ['kh034-meal-a', 'kh034-meal-b'])
    db.prepare('INSERT INTO WeeklyMeal(id,planId,dayOfWeek,mealType,createdAt) VALUES(?,?,?,?,?)').run(id, 'kh034-plan-a', 0, 'breakfast', timestamp)
  duplicateBefore = snapshot(db)
  db.close()
  try { deploy(duplicateDb, testedMigration) } catch (error) {
    duplicateFailure = String((error as NodeJS.ErrnoException & { stderr?: string }).stderr)
  }
})

const snapshot = (db: Database.Database) => Object.fromEntries(
  ['UserPreferences', 'PantryItem', 'WeeklyPlan', 'WeeklyMeal'].map(table =>
    [table, db.prepare(`SELECT * FROM "${table}" ORDER BY id`).all()]
  )
)

it('applies to a clean database with only unique indexes and no table recreation', () => {
  const filename = path.join(folder, 'clean.db')
  new Database(filename).close()
  deploy(filename)
  const db = new Database(filename)
  try {
    const names = db.prepare("SELECT name FROM sqlite_master WHERE type = 'index' AND name IN ('UserPreferences_userId_key','PantryItem_userId_productId_unit_key','WeeklyPlan_userId_weekStart_key','WeeklyMeal_planId_dayOfWeek_mealType_key')").all() as { name: string }[]
    expect(names.map(i => i.name).sort()).toEqual([
      'PantryItem_userId_productId_unit_key',
      'UserPreferences_userId_key',
      'WeeklyMeal_planId_dayOfWeek_mealType_key',
      'WeeklyPlan_userId_weekStart_key',
    ])
    expect(db.prepare('PRAGMA foreign_key_check').all()).toEqual([])
    expect(db.prepare('PRAGMA integrity_check').get()).toEqual({ integrity_check: 'ok' })
    expect(db.prepare("SELECT COUNT(*) AS n FROM _prisma_migrations WHERE migration_name='20261006120000_data_uniqueness' AND finished_at IS NOT NULL").get()).toEqual({ n: 1 })
  } finally { db.close() }
})

it('preserves valid rows, NULL legacy rows, and table definitions', () => {
  const filename = path.join(folder, 'existing.db')
  copyFixture(filename, legacyTemplate)
  const db = new Database(filename)
  try {
    const timestamp = new Date().toISOString()
    const userId = 'kh034-null-legacy-user'
    const productId = 'kh034-null-legacy-product'
    db.prepare('INSERT INTO User(id,email,passwordHash) VALUES(?,?,?)').run(userId, `${userId}@example.test`, 'fixture')
    db.prepare('INSERT INTO Product(id,name,category,createdAt,updatedAt) VALUES(?,?,?,?,?)').run(productId, 'KH034 legacy', 'other', timestamp, timestamp)
    db.prepare('INSERT INTO UserPreferences(id,userId,createdAt,updatedAt) VALUES(?,NULL,?,?)').run('kh034-null-pref-a', timestamp, timestamp)
    db.prepare('INSERT INTO UserPreferences(id,userId,createdAt,updatedAt) VALUES(?,NULL,?,?)').run('kh034-null-pref-b', timestamp, timestamp)
    db.prepare('INSERT INTO PantryItem(id,productId,userId,createdAt,updatedAt) VALUES(?,?,NULL,?,?)').run('kh034-null-pantry-a', productId, timestamp, timestamp)
    db.prepare('INSERT INTO PantryItem(id,productId,userId,createdAt,updatedAt) VALUES(?,?,NULL,?,?)').run('kh034-null-pantry-b', productId, timestamp, timestamp)
    db.prepare('INSERT INTO WeeklyPlan(id,userId,weekStart,createdAt,updatedAt) VALUES(?,NULL,?,?,?)').run('kh034-null-plan-a', timestamp, timestamp, timestamp)
    db.prepare('INSERT INTO WeeklyPlan(id,userId,weekStart,createdAt,updatedAt) VALUES(?,NULL,?,?,?)').run('kh034-null-plan-b', timestamp, timestamp, timestamp)
    const before = snapshot(db)
    const tablesBefore = db.prepare("SELECT name,sql FROM sqlite_master WHERE type='table' ORDER BY name").all()
    deploy(filename, testedMigration)
    expect(snapshot(db)).toEqual(before)
    expect(db.prepare("SELECT name,sql FROM sqlite_master WHERE type='table' ORDER BY name").all()).toEqual(tablesBefore)
    expect(db.prepare('PRAGMA foreign_key_check').all()).toEqual([])
  } finally { db.close() }
})

it('redeploys cleanly', () => {
  const filename = path.join(folder, 'idempotent.db')
  copyFixture(filename, testDbTemplate)
  const db = new Database(filename)
  try {
    const once = snapshot(db)
    deploy(filename)
    expect(snapshot(db)).toEqual(once)
  } finally { db.close() }
})

it('fails deterministically on duplicate preferences without deleting fixture rows', () => {
  const db = new Database(duplicateDb, { readonly: true })
  try {
    expect(duplicateFailure).toContain('UNIQUE constraint failed')
    expect(snapshot(db)).toEqual(duplicateBefore)
    expect(db.prepare('PRAGMA foreign_key_check').all()).toEqual([])
  } finally { db.close() }
})
