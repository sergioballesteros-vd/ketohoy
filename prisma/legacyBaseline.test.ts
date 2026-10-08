import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync, readdirSync, readFileSync, writeFileSync, mkdirSync, cpSync, copyFileSync } from 'node:fs'
import path from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { createHash, randomUUID } from 'node:crypto'
import Database from 'better-sqlite3'
import { afterAll, describe, expect, inject, it } from 'vitest'
import { LEGACY_BASELINE_MIGRATIONS, validateMigrationInventory } from '../scripts/baseline-legacy.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const migrationsRoot = path.join(root, 'prisma/migrations')
const migrations = readdirSync(migrationsRoot).filter((name) => name !== 'migration_lock.toml').sort()
const temp = mkdtempSync(path.join(tmpdir(), 'ketohoy-baseline-'))
const testDbTemplate = inject('testDbTemplatePath')
const cli = path.join(root, 'node_modules/prisma/build/index.js')
const baselineScript = path.join(root, 'scripts/baseline-legacy.mjs')
const pendingMigrations = path.join(temp, 'pending-migrations')
const pendingConfig = path.join(temp, 'pending-migrations.config.ts')
const finalMigration = path.join(temp, 'final-migration')
const finalConfig = path.join(temp, 'final-migration.config.ts')

mkdirSync(pendingMigrations)
for (const name of migrations) if (name > LEGACY_BASELINE_MIGRATIONS.at(-1)!) cpSync(path.join(migrationsRoot, name), path.join(pendingMigrations, name), { recursive: true })
copyFileSync(path.join(migrationsRoot, 'migration_lock.toml'), path.join(pendingMigrations, 'migration_lock.toml'))
mkdirSync(finalMigration)
cpSync(path.join(migrationsRoot, migrations.at(-1)!), path.join(finalMigration, migrations.at(-1)!), { recursive: true })
copyFileSync(path.join(migrationsRoot, 'migration_lock.toml'), path.join(finalMigration, 'migration_lock.toml'))
writeFileSync(pendingConfig, `export default { schema: ${JSON.stringify(path.join(root, 'prisma/schema.prisma'))}, migrations: { path: ${JSON.stringify(pendingMigrations)} }, datasource: { url: process.env.DATABASE_URL } }`)
writeFileSync(finalConfig, `export default { schema: ${JSON.stringify(path.join(root, 'prisma/schema.prisma'))}, migrations: { path: ${JSON.stringify(finalMigration)} }, datasource: { url: process.env.DATABASE_URL } }`)

afterAll(() => rmSync(temp, { recursive: true, force: true }))

function makeSchema(filename: string, through: string) {
  const db = new Database(filename)
  try {
    for (const name of migrations) {
      if (name > through) break
      db.exec(readFileSync(path.join(migrationsRoot, name, 'migration.sql'), 'utf8'))
    }
  } finally {
    db.close()
  }
}

function runNode(script: string, filename: string) {
  return execFileSync(process.execPath, [script], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, DATABASE_URL: `file:${filename}` },
    stdio: 'pipe',
  })
}

function deploy(filename: string, config?: string) {
  return execFileSync(process.execPath, [cli, 'migrate', 'deploy', ...(config ? ['--config', config] : [])], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, DATABASE_URL: `file:${filename}` },
    stdio: 'pipe',
  })
}

function migrationNames(db: Database.Database) {
  return (db.prepare('SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL ORDER BY migration_name').all() as { migration_name: string }[]).map((row) => row.migration_name)
}

function copyFixture(filename: string) {
  const db = new Database(testDbTemplate, { readonly: true })
  try {
    writeFileSync(filename, db.serialize())
  } finally {
    db.close()
  }
}

function markAsApplied(db: Database.Database, names: readonly string[]) {
  db.exec(`CREATE TABLE _prisma_migrations (
    id TEXT PRIMARY KEY NOT NULL,
    checksum TEXT NOT NULL,
    finished_at DATETIME,
    migration_name TEXT NOT NULL,
    logs TEXT,
    rolled_back_at DATETIME,
    started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    applied_steps_count INTEGER NOT NULL DEFAULT 0
  )`)
  const insert = db.prepare(`INSERT INTO _prisma_migrations
    (id, checksum, finished_at, migration_name, started_at, applied_steps_count)
    VALUES (?, ?, ?, ?, ?, 1)`)
  const timestamp = new Date().toISOString()
  for (const name of names) {
    const sql = readFileSync(path.join(migrationsRoot, name, 'migration.sql'), 'utf8')
    insert.run(randomUUID(), createHash('sha256').update(sql).digest('hex'), timestamp, name, timestamp)
  }
}

function makeTrackedPrefix(filename: string) {
  makeSchema(filename, migrations[migrations.length - 2])
  const db = new Database(filename)
  try { markAsApplied(db, migrations.slice(0, -1)) } finally { db.close() }
}

describe('legacy migration baseline', () => {
  it('keeps the baseline historical and rejects unknown history insertions', () => {
    expect(LEGACY_BASELINE_MIGRATIONS).toEqual(migrations.slice(0, 3))
    expect(validateMigrationInventory([...migrations, '20990101000000_future_migration'])).toContain('20990101000000_future_migration')
    expect(LEGACY_BASELINE_MIGRATIONS).not.toContain('20261006120000_data_uniqueness')
  })

  it('baselines the exact migration-transition schema', () => {
    const filename = path.join(temp, 'legacy-baseline.db')
    makeSchema(filename, LEGACY_BASELINE_MIGRATIONS[LEGACY_BASELINE_MIGRATIONS.length - 1])

    expect(runNode(baselineScript, filename)).toContain(`legacy baseline matched through ${LEGACY_BASELINE_MIGRATIONS[LEGACY_BASELINE_MIGRATIONS.length - 1]}`)
    const db = new Database(filename)
    expect(migrationNames(db)).toEqual(LEGACY_BASELINE_MIGRATIONS)
    expect((db.prepare('PRAGMA table_info("User")').all() as { name: string }[]).map((row) => row.name)).not.toContain('termsAcceptedAt')
    db.close()
  }, 15000)

  it('executes pending terms and KH-034 DDL from the transition schema', () => {
    const filename = path.join(temp, 'legacy-pending.db')
    makeSchema(filename, LEGACY_BASELINE_MIGRATIONS[LEGACY_BASELINE_MIGRATIONS.length - 1])
    const db = new Database(filename)
    markAsApplied(db, LEGACY_BASELINE_MIGRATIONS)
    db.close()
    deploy(filename, pendingConfig)

    const migrated = new Database(filename)
    expect(migrationNames(migrated)).toEqual(migrations)
    const userColumns = (migrated.prepare('PRAGMA table_info("User")').all() as { name: string }[]).map((row) => row.name)
    expect(userColumns).toEqual(expect.arrayContaining(['termsAcceptedAt', 'termsVersion', 'adultConfirmedAt']))
    const indexes = (migrated.prepare("SELECT name FROM sqlite_schema WHERE type='index'").all() as { name: string }[]).map((row) => row.name)
    expect(indexes).toEqual(expect.arrayContaining([
      'UserPreferences_userId_key',
      'PantryItem_userId_productId_unit_key',
      'WeeklyPlan_userId_weekStart_key',
      'WeeklyMeal_planId_dayOfWeek_mealType_key',
    ]))
    migrated.close()
  })

  it('classifies an empty database as fresh', () => {
    const filename = path.join(temp, 'empty.db')
    new Database(filename).close()
    expect(runNode(baselineScript, filename)).toContain('fresh database')
  })

  it('applies the full migration history to an empty database', () => {
    const filename = path.join(temp, 'fresh.db')
    new Database(filename).close()
    deploy(filename)
    const db = new Database(filename)
    expect(migrationNames(db)).toEqual(migrations)
    db.close()
  })

  it('classifies a fully migrated database as tracked', () => {
    const filename = path.join(temp, 'tracked-full.db')
    copyFixture(filename)
    expect(runNode(baselineScript, filename)).toContain('tracked database')
  })

  it('redeploys a fully migrated database cleanly', () => {
    const filename = path.join(temp, 'redeploy-full.db')
    copyFixture(filename)
    const before = new Database(filename)
    const names = migrationNames(before)
    before.close()
    deploy(filename)
    const after = new Database(filename)
    expect(migrationNames(after)).toEqual(names)
    after.close()
  })

  it('recognizes a tracked prefix with KH-034 pending', () => {
    const filename = path.join(temp, 'tracked-prefix.db')
    makeTrackedPrefix(filename)
    expect(runNode(baselineScript, filename)).toContain('tracked database')
    const db = new Database(filename, { readonly: true })
    expect(db.prepare("SELECT 1 FROM sqlite_schema WHERE type='index' AND name='PantryItem_userId_productId_unit_key'").get()).toBeUndefined()
    db.close()
  })

  it('applies KH-034 DDL to a valid tracked prefix', () => {
    const filename = path.join(temp, 'tracked-pending.db')
    makeTrackedPrefix(filename)
    deploy(filename, finalConfig)
    const finalDb = new Database(filename)
    expect(migrationNames(finalDb)).toEqual(migrations)
    expect(finalDb.prepare("SELECT 1 FROM sqlite_schema WHERE type='index' AND name='PantryItem_userId_productId_unit_key'").get()).toBeDefined()
    finalDb.close()
  })

  it('rejects a tracked KH-034 record if its schema was never created', () => {
    const filename = path.join(temp, 'false-kh034.db')
    makeSchema(filename, migrations[migrations.length - 2])
    const tracked = new Database(filename)
    markAsApplied(tracked, migrations)
    tracked.close()

    expect(() => runNode(baselineScript, filename)).toThrow(/tracked migration history does not match the SQLite schema/)
    const db = new Database(filename, { readonly: true })
    expect(db.prepare("SELECT 1 FROM sqlite_schema WHERE type='index' AND name='UserPreferences_userId_key'").get()).toBeUndefined()
    db.close()
  })

  it('fails closed on a schema mismatch and empty migration tracking table', () => {
    const mismatch = path.join(temp, 'mismatch.db')
    makeSchema(mismatch, LEGACY_BASELINE_MIGRATIONS[LEGACY_BASELINE_MIGRATIONS.length - 1])
    const db = new Database(mismatch)
    db.exec('CREATE TABLE UnexpectedLegacyTable (id TEXT PRIMARY KEY)')
    db.close()
    expect(() => runNode(baselineScript, mismatch)).toThrow(/legacy baseline schema mismatch/)
    const unchanged = new Database(mismatch, { readonly: true })
    expect(unchanged.prepare("SELECT name FROM sqlite_schema WHERE name='_prisma_migrations'").get()).toBeUndefined()
    unchanged.close()

    const partial = path.join(temp, 'partial.db')
    makeSchema(partial, LEGACY_BASELINE_MIGRATIONS[LEGACY_BASELINE_MIGRATIONS.length - 1])
    const partialDb = new Database(partial)
    partialDb.exec('CREATE TABLE _prisma_migrations (migration_name TEXT, finished_at DATETIME, rolled_back_at DATETIME)')
    partialDb.close()
    expect(() => runNode(baselineScript, partial)).toThrow(/partially tracked migration history/)
  })
})
