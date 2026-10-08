import type Database from 'better-sqlite3'

export const LEGACY_BASELINE_MIGRATIONS: readonly string[]
export function validateMigrationInventory(names: string[]): string[]
export function schemaSnapshot(db: Database.Database): string
