import { defineConfig } from '@playwright/test'
import path from 'node:path'
import { resolveSqlitePath } from './src/lib/sqliteUrl'

const database = resolveSqlitePath(process.env.DATABASE_URL, true)
if (!process.env.CI && database === path.resolve('dev.db')) {
  throw new Error('E2E requires a disposable DATABASE_URL; refusing to write to the original dev.db')
}

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['html', { open: 'never' }], ['list']] : 'list',
  use: {
    baseURL: 'http://127.0.0.1:3100',
  },
  projects: [
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    {
      name: 'chromium',
      testIgnore: /auth\.setup\.ts/,
      dependencies: ['setup'],
      use: { storageState: 'playwright/.auth/user.json' },
    },
  ],
  webServer: {
    command: 'node -e "require(\'node:fs\').closeSync(require(\'node:fs\').openSync(process.env.DATABASE_URL.slice(5), \'a\'))" && ./node_modules/.bin/prisma migrate deploy && ./node_modules/.bin/tsx prisma/seed.ts && npm run start -- -p 3100',
    url: 'http://127.0.0.1:3100',
    reuseExistingServer: false,
    env: {
      DATABASE_URL: `file:${database}`,
      ACCOUNT_DELETION_LEDGER: `${database}.deletions.jsonl`,
      COOKIE_SECURE: 'false',
      APP_URL: 'http://127.0.0.1:3100',
      RESEND_API_KEY: '',
    },
    timeout: 60_000,
  },
})
