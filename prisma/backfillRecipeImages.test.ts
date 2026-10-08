import { afterAll, expect, it } from 'vitest'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import Database from 'better-sqlite3'

const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'ketohoy-image-backfill-'))
const target = path.join(directory, 'recipes.db')
fs.copyFileSync(path.resolve('dev.db'), target)
const sql = new Database(target)
sql.exec('UPDATE Recipe SET imageUrl = NULL')
sql.close()
afterAll(() => fs.rmSync(directory, { recursive: true, force: true }))

const run = (apply: boolean) => spawnSync(process.execPath, [
  'node_modules/tsx/dist/cli.mjs', 'prisma/backfillRecipeImages.ts', ...(apply ? ['--apply'] : []),
], { encoding: 'utf8', env: { ...process.env, DATABASE_URL: `file:${target}` } })

it('dry-runs by default and persists only reviewed recipe image choices on the supplied database', () => {
  const preview = run(false)
  expect(preview.status).toBe(0)
  expect(preview.stdout).toContain('2 reviewed image(s) eligible')
  const beforeApply = new Database(target)
  expect(beforeApply.prepare('SELECT COUNT(*) AS n FROM Recipe WHERE imageUrl IS NOT NULL').get()).toMatchObject({ n: 0 })
  beforeApply.close()

  const applied = run(true)
  expect(applied.status).toBe(0)
  const check = new Database(target)
  expect(check.prepare('SELECT title FROM Recipe WHERE imageUrl IS NOT NULL ORDER BY title').all()).toEqual([
    { title: 'Huevos fritos con bacon' },
    { title: 'Tortilla de queso y jamón' },
  ])
  check.close()
})
