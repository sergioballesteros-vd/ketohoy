import fs from 'fs'
import os from 'os'
import path from 'path'
import { execFileSync } from 'node:child_process'
import Database from 'better-sqlite3'
import { inject } from 'vitest'

declare module 'vitest' {
  interface ProvidedContext {
    testDbTemplatePath: string
  }
}

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
  const previousDatabaseUrl = process.env.DATABASE_URL
  const dbPath = path.join(os.tmpdir(), `ketohoy-test-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}.db`)
  const fixture = new Database(inject('testDbTemplatePath'), { readonly: true })
  try {
    fs.writeFileSync(dbPath, fixture.serialize())
  } finally {
    fixture.close()
  }
  process.env.DATABASE_URL = dbPath

  return {
    dbPath,
    cleanup: () => {
      for (const suffix of ['', '-wal', '-shm', '-journal']) fs.rmSync(dbPath + suffix, { force: true })
      if (process.env.DATABASE_URL === dbPath) {
        if (previousDatabaseUrl === undefined) delete process.env.DATABASE_URL
        else process.env.DATABASE_URL = previousDatabaseUrl
      }
    },
  }
}

/** Create and migrate an empty disposable SQLite database without using dev.db as a fixture. */
export function setupFreshTestDb(): { dbPath: string; cleanup: () => void } {
  const previousDatabaseUrl = process.env.DATABASE_URL
  const dbPath = path.join(os.tmpdir(), `ketohoy-fresh-test-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}.db`)
  fs.closeSync(fs.openSync(dbPath, 'w'))
  execFileSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy'], {
    env: { ...process.env, DATABASE_URL: `file:${dbPath}` }, stdio: 'pipe',
  })
  process.env.DATABASE_URL = dbPath
  return {
    dbPath,
    cleanup: () => {
      for (const suffix of ['', '-wal', '-shm', '-journal']) fs.rmSync(dbPath + suffix, { force: true })
      if (process.env.DATABASE_URL === dbPath) {
        if (previousDatabaseUrl === undefined) delete process.env.DATABASE_URL
        else process.env.DATABASE_URL = previousDatabaseUrl
      }
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
