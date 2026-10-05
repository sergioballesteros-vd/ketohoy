import { afterAll, expect, it } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import Database from 'better-sqlite3'
import { execFileSync } from 'node:child_process'
const folder = fs.mkdtempSync(path.join(os.tmpdir(),'kh027-migration-'))
afterAll(()=>fs.rmSync(folder,{recursive:true,force:true}))
it('additive migration preserves every existing field, stock and ownership, integrity and redeploy',()=>{
  const filename = path.join(folder,'copy.db')
  const source = new Database(path.resolve('dev.db'),{readonly:true})
  fs.writeFileSync(filename,source.serialize()); source.close()
  const sql = new Database(filename)
  const applied = new Set((sql.prepare('SELECT migration_name FROM _prisma_migrations').all() as {migration_name:string}[]).map(r=>r.migration_name))
  for(const entry of fs.readdirSync('prisma/migrations').sort()) {
    if(entry>='20261005120000_weekly_shopping_sources'||!fs.statSync(`prisma/migrations/${entry}`).isDirectory()||applied.has(entry))continue
    sql.exec(fs.readFileSync(`prisma/migrations/${entry}/migration.sql`,'utf8'))
    sql.prepare('INSERT INTO _prisma_migrations(id,checksum,finished_at,migration_name,started_at,applied_steps_count) VALUES(?,?,?,?,?,1)').run(entry,'',Date.now(),entry,Date.now())
  }
  const tables = ['ShoppingListItem','PantryItem','Product','WeeklyPlan','WeeklyMeal','User']
  const snapshot=()=>Object.fromEntries(tables.map(t=>[t,sql.prepare(`SELECT * FROM ${t} ORDER BY id`).all()]))
  const before = snapshot()
  const deploy=()=>execFileSync(process.execPath,['node_modules/prisma/build/index.js','migrate','deploy'],{env:{...process.env,DATABASE_URL:`file:${filename}`},stdio:'pipe'})
  try {
    deploy()
    const after=snapshot()
    expect((after.ShoppingListItem as {sourceContributions:unknown}[]).every(r=>r.sourceContributions===null)).toBe(true)
    after.ShoppingListItem=(after.ShoppingListItem as Record<string,unknown>[]).map(({sourceContributions,...old})=>{expect(sourceContributions).toBeNull();return old})
    expect(after).toEqual(before)
    expect(sql.prepare('PRAGMA foreign_key_check').all()).toEqual([])
    expect(sql.prepare('PRAGMA integrity_check').get()).toEqual({integrity_check:'ok'})
    const once=snapshot();deploy();expect(snapshot()).toEqual(once)
    sql.exec('ALTER TABLE ShoppingListItem DROP COLUMN sourceContributions')
    expect(snapshot()).toEqual(before)
  }finally{sql.close()}
},15000)
