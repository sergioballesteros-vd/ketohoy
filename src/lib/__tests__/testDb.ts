import fs from 'fs'
import os from 'os'
import path from 'path'
import { execFileSync } from 'node:child_process'
import Database from 'better-sqlite3'

/** Apply real pending migrations only to a disposable test fixture. */
export function migrateTestDb(dbPath: string) {
  if (path.resolve(dbPath) === path.resolve('dev.db')) throw new Error('Refusing to migrate the original test fixture')
  const sql = new Database(dbPath)
  const applied = new Set((sql.prepare('SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL').all() as Array<{ migration_name: string }>).map(row => row.migration_name))
  sql.close()
  const migrations = fs.readdirSync(path.resolve('prisma/migrations'), { withFileTypes: true }).filter(entry => entry.isDirectory())
  if (migrations.some(entry => !applied.has(entry.name))) {
    execFileSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy'], {
      env: { ...process.env, DATABASE_URL: `file:${dbPath}` }, stdio: 'pipe',
    })
  }
}

/** Snapshot the local fixture without writing to it; migrate only the new temporary copy. */
export function setupTestDb(): { dbPath: string; cleanup: () => void } {
  const source = path.resolve(__dirname, '../../../dev.db')
  const dbPath = path.join(os.tmpdir(), `ketohoy-test-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}.db`)
  const fixture = new Database(source, { readonly: true })
  try {
    fs.writeFileSync(dbPath, fixture.serialize())
  } finally {
    fixture.close()
  }
  migrateTestDb(dbPath)
  process.env.DATABASE_URL = dbPath

  return {
    dbPath,
    cleanup: () => {
      for (const suffix of ['', '-wal', '-shm', '-journal']) fs.rmSync(dbPath + suffix, { force: true })
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
