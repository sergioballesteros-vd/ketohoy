import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import Database from 'better-sqlite3'

export default function setup(project: { provide: (key: 'testDbTemplatePath', value: string) => void }) {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'ketohoy-test-template-'))
  const dbPath = path.join(folder, 'template.db')
  const source = new Database(path.resolve('dev.db'), { readonly: true })
  try {
    fs.writeFileSync(dbPath, source.serialize())
  } finally {
    source.close()
  }

  try {
    execFileSync(process.execPath, [path.resolve('node_modules/prisma/build/index.js'), 'migrate', 'deploy'], {
      env: { ...process.env, DATABASE_URL: `file:${dbPath}` },
      stdio: 'pipe',
    })
    project.provide('testDbTemplatePath', dbPath)
  } catch (error) {
    fs.rmSync(folder, { recursive: true, force: true })
    throw error
  }

  return () => fs.rmSync(folder, { recursive: true, force: true })
}
