import { afterAll, describe, expect, it } from 'vitest'
import { execFileSync, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import Database from 'better-sqlite3'
import { migrateTestDb } from '../src/lib/__tests__/testDb'
import { resolveSqlitePath } from '../src/lib/sqliteUrl'

const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'ketohoy-seed-'))
const target = path.join(directory, 'target.db')
const untouched = path.join(directory, 'untouched.db')
for (const file of [target, untouched]) fs.copyFileSync(path.resolve('dev.db'), file)
migrateTestDb(target)
afterAll(() => fs.rmSync(directory, { recursive: true, force: true }))
const hash = (file: string) => createHash('sha256').update(fs.readFileSync(file)).digest('hex')
const runSeed = (url: string) => execFileSync(process.execPath, ['node_modules/tsx/dist/cli.mjs', 'prisma/seed.ts'], {
  env: { ...process.env, DATABASE_URL: url, SEED_RESET: 'false' }, encoding: 'utf8',
})

describe('seed safety on disposable databases', () => {
  it('resolves the same SQLite destination and rejects absent/unsupported URLs', () => {
    expect(resolveSqlitePath('file:./example.db')).toBe(path.resolve('example.db'))
    expect(resolveSqlitePath(target)).toBe(target)
    expect(() => resolveSqlitePath(undefined, true)).toThrow('required')
    expect(() => resolveSqlitePath('postgresql://example/db')).toThrow('SQLite')
    const failed = spawnSync(process.execPath, ['node_modules/tsx/dist/cli.mjs', 'prisma/seed.ts'], {
      env: { ...process.env, DATABASE_URL: '', SEED_RESET: 'false' }, encoding: 'utf8',
    })
    expect(failed.status).not.toBe(0)
    expect(failed.stderr).toContain('DATABASE_URL is required')
  })

  it('seeds only the explicit temporary file, preserving a second database and the original', () => {
    const originalHash = hash('dev.db')
    const otherHash = hash(untouched)
    expect(runSeed(`file:${target}`)).toContain(`Seed database: ${target}`)
    expect(hash(untouched)).toBe(otherHash)
    expect(hash('dev.db')).toBe(originalHash)
    const sql = new Database(target)
    expect(sql.prepare('SELECT COUNT(*) AS n FROM Recipe').get()).toMatchObject({ n: 67 })
    sql.close()
  }, 20_000)

  it('rolls back recipe changes and deleted ingredients if replacement insertion fails', () => {
    const sql = new Database(target)
    const recipe = sql.prepare('SELECT id FROM Recipe ORDER BY rowid LIMIT 1').get() as { id: string }
    sql.prepare('UPDATE Recipe SET description = ? WHERE id = ?').run('Preserve previous recipe', recipe.id)
    const beforeRecipe = sql.prepare('SELECT * FROM Recipe WHERE id = ?').get(recipe.id)
    const beforeIngredients = sql.prepare('SELECT * FROM RecipeIngredient WHERE recipeId = ? ORDER BY id').all(recipe.id)
    sql.exec(`CREATE TRIGGER fail_seed BEFORE INSERT ON RecipeIngredient BEGIN SELECT RAISE(ABORT, 'seed insertion failure'); END`)
    try {
      expect(() => runSeed(`file:${target}`)).toThrow()
      expect(sql.prepare('SELECT * FROM Recipe WHERE id = ?').get(recipe.id)).toEqual(beforeRecipe)
      expect(sql.prepare('SELECT * FROM RecipeIngredient WHERE recipeId = ? ORDER BY id').all(recipe.id)).toEqual(beforeIngredients)
    } finally {
      sql.exec('DROP TRIGGER fail_seed')
      sql.close()
    }
  }, 20_000)
})
