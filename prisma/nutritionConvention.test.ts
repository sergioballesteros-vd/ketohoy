import { afterAll, beforeAll, expect, it } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import Database from 'better-sqlite3'
import { execFileSync } from 'node:child_process'
import { createLegacyMigrationFixture } from './testMigrationFixture'

const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'kh025-migration-'))
const migrationRoot = path.resolve('prisma/migrations')
const testedMigrations = path.join(folder, 'tested-migration')
const testedConfig = path.join(folder, 'tested-migration.config.ts')
const legacyTemplate = path.join(folder, 'legacy-template.db')
const legacyDb = path.join(folder, 'legacy.db')
const idempotentDb = path.join(folder, 'idempotent.db')
fs.mkdirSync(testedMigrations)
for (const entry of fs.readdirSync(migrationRoot, { withFileTypes: true })) {
  if (entry.isDirectory() && entry.name === '20261003190000_nutrition_convention')
    fs.cpSync(path.join(migrationRoot, entry.name), path.join(testedMigrations, entry.name), { recursive: true })
  else if (entry.isFile() && entry.name === 'migration_lock.toml')
    fs.copyFileSync(path.join(migrationRoot, entry.name), path.join(testedMigrations, entry.name))
}
afterAll(() => fs.rmSync(folder, { recursive: true, force: true }))

const copyFixture = (filename: string, sourcePath: string) => {
  const source = new Database(sourcePath, { readonly: true })
  try { fs.writeFileSync(filename, source.serialize()) } finally { source.close() }
}

const seedLegacy = (filename: string) => {
  copyFixture(filename, legacyTemplate)
  const sql = new Database(filename)
  try {
    sql.prepare('INSERT INTO Product (id, name, source, category, ketoScore, nutritionSource, carbsPer100g, fiberPer100g, netCarbsPer100g, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run('kh025-legacy', 'Ambiguous legacy', 'mercadona', 'nuts', 5, 'openfoodfacts', 5, 3, 2, Date.now())
  } finally { sql.close() }
}

const deploy = (filename: string, config?: string) => execFileSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy', ...(config ? ['--config', config] : [])], {
  env: { ...process.env, DATABASE_URL: `file:${filename}` }, stdio: 'pipe',
})

let before: Array<Record<string, unknown>> = []

beforeAll(() => {
  createLegacyMigrationFixture(legacyTemplate, '20261003190000_nutrition_convention')
  fs.writeFileSync(testedConfig, `export default { schema: ${JSON.stringify(path.resolve('prisma/schema.prisma'))}, migrations: { path: ${JSON.stringify(testedMigrations)} }, datasource: { url: process.env.DATABASE_URL } }`)
  seedLegacy(legacyDb)
  seedLegacy(idempotentDb)
  deploy(idempotentDb)
  const sql = new Database(legacyDb)
  try {
    before = sql.prepare('SELECT id, carbsPer100g, fiberPer100g, netCarbsPer100g, nutritionSource, ketoScore FROM Product ORDER BY id').all() as Array<Record<string, unknown>>
  } finally { sql.close() }
})

it('real migration preserves historical macros and degrades evidence', () => {
  const sql = new Database(legacyDb)
  try {
    deploy(legacyDb, testedConfig)
    for (const p of before) {
      expect(sql.prepare('SELECT id, carbsPer100g, fiberPer100g, netCarbsPer100g, nutritionSource, ketoScore FROM Product WHERE id = ?').get(p.id)).toEqual(p.nutritionSource === 'openfoodfacts' ? { ...p, ketoScore: 0 } : p)
    }
    expect(sql.prepare("SELECT nutritionConvention FROM Product WHERE id = 'kh025-legacy'").get()).toEqual({ nutritionConvention: 'unknown' })
    expect(sql.prepare('PRAGMA foreign_key_check').all()).toEqual([])
  } finally { sql.close() }
})

it('real migration is idempotent', () => {
  const sql = new Database(idempotentDb)
  try {
    const after = sql.prepare('SELECT * FROM Product ORDER BY id').all()
    deploy(idempotentDb)
    expect(sql.prepare('SELECT * FROM Product ORDER BY id').all()).toEqual(after)
  } finally { sql.close() }
})
