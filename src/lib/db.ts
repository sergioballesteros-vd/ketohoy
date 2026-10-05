import { PrismaClient } from '@/generated/prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import { resolveSqlitePath } from './sqliteUrl'

const globalForPrisma = global as unknown as { prisma: PrismaClient }

function createPrismaClient() {
  const dbPath = resolveSqlitePath(process.env.DATABASE_URL)
  const adapter = new PrismaBetterSqlite3({ url: dbPath })
  return new PrismaClient({ adapter })
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
