import fs from 'fs'
import os from 'os'
import path from 'path'

/**
 * Integration tests need a real, migrated SQLite DB (route handlers use the
 * `db` singleton directly). Copying the already-migrated `dev.db` is cheaper
 * than running `prisma migrate deploy` per test file and gives tests
 * realistic seeded data (recipes, products) without a full seed run.
 *
 * Must be called — and `DATABASE_URL` must be read by `@/lib/db` — before
 * any route module is imported, since the Prisma client is a module-level
 * singleton. Callers should `await import(...)` route modules after calling
 * this, not `import` them statically.
 */
export function setupTestDb(): { dbPath: string; cleanup: () => void } {
  const source = path.resolve(__dirname, '../../../dev.db')
  const dbPath = path.join(os.tmpdir(), `ketohoy-test-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}.db`)
  fs.copyFileSync(source, dbPath)
  process.env.DATABASE_URL = dbPath

  return {
    dbPath,
    cleanup: () => {
      fs.rmSync(dbPath, { force: true })
    },
  }
}

function jsonRequest(url: string, method: string, body?: unknown): Request {
  return new Request(url, {
    method,
    headers: body !== undefined ? { 'content-type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
}

export const get = (url: string) => jsonRequest(url, 'GET')
export const post = (url: string, body?: unknown) => jsonRequest(url, 'POST', body)
export const patch = (url: string, body?: unknown) => jsonRequest(url, 'PATCH', body)
export const del = (url: string, body?: unknown) => jsonRequest(url, 'DELETE', body)
