import { afterAll, expect, it } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import Database from 'better-sqlite3'
import { execFileSync } from 'node:child_process'

const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'kh025-migration-'))
afterAll(() => fs.rmSync(folder, { recursive: true, force: true }))
it('real migration preserves historical macros, degrades evidence, and is idempotent', () => {
  const filename = path.join(folder, 'legacy.db')
  const source = new Database(path.resolve('dev.db'), { readonly: true })
  fs.writeFileSync(filename, source.serialize()); source.close()
  const sql = new Database(filename)
  sql.prepare('INSERT INTO Product (id, name, source, category, ketoScore, nutritionSource, carbsPer100g, fiberPer100g, netCarbsPer100g, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run('kh025-legacy', 'Ambiguous legacy', 'mercadona', 'nuts', 5, 'openfoodfacts', 5, 3, 2, Date.now())
  const before = sql.prepare('SELECT id, carbsPer100g, fiberPer100g, netCarbsPer100g, nutritionSource, ketoScore FROM Product ORDER BY id').all() as Array<Record<string, unknown>>
  const deploy = () => execFileSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy'], { env: { ...process.env, DATABASE_URL: `file:${filename}` }, stdio: 'pipe' })
  try {
    deploy()
    for (const p of before) {
      expect(sql.prepare('SELECT id, carbsPer100g, fiberPer100g, netCarbsPer100g, nutritionSource, ketoScore FROM Product WHERE id = ?').get(p.id)).toEqual(p.nutritionSource === 'openfoodfacts' ? { ...p, ketoScore: 0 } : p)
    }
    expect(sql.prepare("SELECT nutritionConvention FROM Product WHERE id = 'kh025-legacy'").get()).toEqual({ nutritionConvention: 'unknown' })
    expect(sql.prepare('PRAGMA foreign_key_check').all()).toEqual([])
    const after = sql.prepare('SELECT * FROM Product ORDER BY id').all()
    deploy()
    expect(sql.prepare('SELECT * FROM Product ORDER BY id').all()).toEqual(after)
  } finally { sql.close() }
})
