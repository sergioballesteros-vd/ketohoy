import { createHash, randomUUID } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import Database from 'better-sqlite3'

export function createLegacyMigrationFixture(filename: string, beforeMigration: string) {
  const migrationRoot = path.resolve('prisma/migrations')
  const names = fs.readdirSync(migrationRoot, { withFileTypes: true })
    .filter(entry => entry.isDirectory() && entry.name < beforeMigration)
    .map(entry => entry.name)
    .sort()
  const db = new Database(filename)
  try {
    for (const name of names) db.exec(fs.readFileSync(path.join(migrationRoot, name, 'migration.sql'), 'utf8'))
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
    const now = new Date().toISOString()
    for (const name of names) {
      const sql = fs.readFileSync(path.join(migrationRoot, name, 'migration.sql'), 'utf8')
      insert.run(randomUUID(), createHash('sha256').update(sql).digest('hex'), now, name, now)
    }
  } finally {
    db.close()
  }
}
