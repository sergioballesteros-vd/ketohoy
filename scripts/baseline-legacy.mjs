import { spawnSync } from 'node:child_process'
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Database from 'better-sqlite3'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const migrationRoot = path.join(root, 'prisma/migrations')

// Fixed pre-data-migration history. Later migrations contain data transforms and must run as DDL/DML.
export const LEGACY_BASELINE_MIGRATIONS = Object.freeze([
  '20260629183529_init',
  '20260630183957_add_recipe_image_url',
  '20260705173000_unique_mercadona_id',
])

export function validateMigrationInventory(names) {
  const sorted = [...names].sort()
  const matches = LEGACY_BASELINE_MIGRATIONS.every((name, index) => sorted[index] === name)
  if (!matches) throw new Error('Migration history changed before the fixed legacy baseline; review it before deployment')
  return sorted
}

function quoteIdentifier(value) {
  return `"${value.replaceAll('"', '""')}"`
}

export function schemaSnapshot(db) {
  const tables = db.prepare("SELECT name FROM sqlite_schema WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name <> '_prisma_migrations' ORDER BY name").all()
  const schema = tables.map(({ name }) => {
    const table = quoteIdentifier(name)
    const columns = db.prepare(`PRAGMA table_info(${table})`).all().map(({ name: col, type, notnull, dflt_value, pk }) => [col, type, notnull, dflt_value, pk])
    const foreignKeys = db.prepare(`PRAGMA foreign_key_list(${table})`).all()
      .map(({ id, seq, table: refTable, from, to, on_update, on_delete, match }) => [id, seq, refTable, from, to, on_update, on_delete, match])
      .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)))
    const indexes = db.prepare(`PRAGMA index_list(${table})`).all().map((index) => {
      const indexName = quoteIdentifier(index.name)
      const columns = db.prepare(`PRAGMA index_info(${indexName})`).all().map(({ seqno, name: col }) => [seqno, col])
      return [index.name.startsWith('sqlite_autoindex_') ? null : index.name, index.unique, index.partial, columns]
    }).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)))
    return [name, columns, foreignKeys, indexes]
  })
  const otherObjects = db.prepare("SELECT type, name, tbl_name, sql FROM sqlite_schema WHERE type IN ('view', 'trigger') ORDER BY type, name").all()
  return JSON.stringify([schema, otherObjects])
}

function migrationNames() {
  return readdirSync(migrationRoot, { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name)
}

function schemaAt(migrationNamesToApply) {
  const db = new Database(':memory:')
  try {
    for (const name of migrationNamesToApply) {
      db.exec(readFileSync(path.join(migrationRoot, name, 'migration.sql'), 'utf8'))
    }
    return schemaSnapshot(db)
  } finally {
    db.close()
  }
}

function sqlitePath() {
  const url = process.env.DATABASE_URL
  if (!url?.startsWith('file:/')) throw new Error('DATABASE_URL must use an absolute SQLite file path')
  return decodeURIComponent(url.slice('file:'.length).split('?')[0])
}

function runPrisma(args) {
  const result = spawnSync(process.execPath, [path.join(root, 'node_modules/prisma/build/index.js'), ...args], {
    cwd: root,
    env: process.env,
    stdio: 'pipe',
  })
  if (result.status !== 0) {
    const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`
    const code = output.match(/\bP\d{4}\b/)?.[0]
    throw new Error(code ? `Prisma migration operation failed (${code})` : 'Prisma could not record or deploy the requested migration state')
  }
}

function main() {
  const allNames = validateMigrationInventory(migrationNames())
  const dbPath = sqlitePath()
  if (!existsSync(dbPath)) {
    console.log('fresh database')
    return
  }

  const db = new Database(dbPath, { readonly: true, fileMustExist: true })
  let outcome
  try {
    if (db.pragma('quick_check', { simple: true }) !== 'ok' || db.pragma('foreign_key_check').length > 0) {
      throw new Error('SQLite integrity or foreign-key check failed')
    }
    const tables = db.prepare("SELECT name FROM sqlite_schema WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all().map(({ name }) => name)
    if (tables.includes('_prisma_migrations')) {
      const entries = db.prepare('SELECT migration_name, finished_at, rolled_back_at FROM _prisma_migrations ORDER BY migration_name').all()
      if (entries.length === 0 || entries.some((entry) => entry.finished_at === null && entry.rolled_back_at === null)) {
        throw new Error('partially tracked migration history; refusing to guess')
      }
      const applied = [...new Set(entries.filter((entry) => entry.rolled_back_at === null).map((entry) => entry.migration_name))].sort()
      if (applied.some((name, index) => allNames[index] !== name)) throw new Error('tracked migration history is not a known prefix')
      if (schemaSnapshot(db) !== schemaAt(applied)) throw new Error('tracked migration history does not match the SQLite schema')
      outcome = 'tracked database'
    } else {
      const appTables = tables.filter((name) => name !== '_prisma_migrations')
      if (appTables.length === 0) {
        outcome = 'fresh database'
      } else {
        let match = -1
        for (let index = 0; index < LEGACY_BASELINE_MIGRATIONS.length; index += 1) {
          if (schemaSnapshot(db) === schemaAt(LEGACY_BASELINE_MIGRATIONS.slice(0, index + 1))) match = index
        }
        if (match < 0) throw new Error('legacy baseline schema mismatch; no migration history was written')
        outcome = `legacy baseline matched through ${LEGACY_BASELINE_MIGRATIONS[match]}`
        db.close()
        for (const name of LEGACY_BASELINE_MIGRATIONS.slice(0, match + 1)) runPrisma(['migrate', 'resolve', '--applied', name])
        console.log(outcome)
        return
      }
    }
  } finally {
    if (db.open) db.close()
  }
  console.log(outcome)
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main()
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Migration state could not be verified')
    process.exitCode = 1
  }
}
