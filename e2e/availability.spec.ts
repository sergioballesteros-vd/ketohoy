import { test, expect } from '@playwright/test'
import Database from 'better-sqlite3'
import { resolveSqlitePath } from '../src/lib/sqliteUrl'
import { registrationData } from './registration'
test.use({ storageState: { cookies: [], origins: [] } })
for (const width of [320,390,768,1280]) test(`KH-015 shared availability at ${width}`, async ({page},info) => {
  const registration = registrationData('availability')
  expect((await page.request.post('/api/auth/register',{data:registration,headers:{'X-Forwarded-For':info.testId}})).status()).toBe(201)
  const sql = new Database(resolveSqlitePath(process.env.DATABASE_URL,true))
  const rid = `kh015-${width}-${Date.now()}`
  const names = ['Suficiente','Insuficiente','Desconocido','Faltante'].map(n=>`${n} ${rid}`)
  try {
    expect((await page.request.patch('/api/preferences',{data:{maxCookingMinutes:60}})).ok()).toBe(true)
    const products: Array<{ id: string }> = []
    for (const name of names) {
      const response = await page.request.post('/api/products',{data:{name,category:'other'}})
      expect(response.ok()).toBe(true)
      products.push(await response.json())
    }
    const {id:userId} = sql.prepare('SELECT id FROM User WHERE email=?').get(registration.email) as {id:string}
    // One synchronous fixture transaction avoids external SQLite writers interleaving with HTTP transactions.
    sql.transaction(() => {
      sql.prepare('INSERT INTO Recipe(id,title,description,mealTypes,prepTimeMinutes,difficulty,ketoLevel,steps,imageUrl,updatedAt) VALUES(?,?,?,?,?,?,?,?,?,?)').run(rid,`Receta ${rid}`,'Disponibilidad comprobada','["breakfast","lunch","snack","dinner"]',30,'easy','strict','[]','/icon.svg',Date.now())
      for (let i=0;i<4;i++) {
        sql.prepare('INSERT INTO RecipeIngredient(id,recipeId,name,quantity,productId) VALUES(?,?,?,?,?)').run(`${rid}-${i}`,rid,names[i],i===2?'300 ml':i===1?'123456789.5 g':'500 g',products[i].id)
        if(i<3) sql.prepare('INSERT INTO PantryItem(id,userId,productId,quantity,unit,updatedAt) VALUES(?,?,?,?,?,?)').run(`${rid}-stock-${i}`,userId,products[i].id,i===0?1:i===1?100:null,i===0?'kg':i===1?'g':null,Date.now())
      }
    })()
    const plan = await (await page.request.post('/api/weekly-plan/generate')).json()
    expect(plan.status).toBe('complete')
    sql.prepare('DELETE FROM WeeklyMeal WHERE planId=?').run(plan.id)
    sql.prepare('INSERT INTO WeeklyMeal(id,planId,dayOfWeek,mealType,recipeId) VALUES(?,?,?,?,?)').run(rid,plan.id,0,'lunch',rid)
    const errors:string[]=[]; page.on('pageerror',e=>errors.push(e.message))
    await page.setViewportSize({width,height:844})
    if(width===320) await page.emulateMedia({reducedMotion:'reduce'})
    const fits = async()=>expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
    await page.goto(`/recipes/${rid}`)
    for (const label of ['Disponible','Falta cantidad','Cantidad no verificada','Faltante']) await expect(page.getByRole('img',{name:label,exact:true})).toBeVisible()
    await fits(); await page.screenshot({path:`/tmp/kh015-detail-${width}.png`,fullPage:true,animations:'disabled'})
    const add = page.getByRole('button',{name:'Añadir lo que falta a la lista'})
    await add.focus(); await add.press('Enter')
    await expect(page.getByRole('status')).toContainText('Ingredientes añadidos a tu lista.')
    const rows=await (await page.request.get('/api/shopping-list')).json()
    expect(rows.map((r:{name:string})=>r.name).sort()).toEqual(names.slice(1).sort())
    expect(rows.find((r:{name:string})=>r.name===names[1])).toMatchObject({requiredQuantity:123456789.5,requiredUnit:'g'})
    await page.goto('/meals')
    const card=page.getByRole('listitem').filter({has:page.getByRole('heading',{name:`Receta ${rid}`,exact:true})})
    await expect(card).toContainText('Falta cantidad'); await expect(card).toContainText('Cantidad no verificada')
    await fits(); await page.screenshot({path:`/tmp/kh015-meals-${width}.png`,fullPage:true,animations:'disabled'})
    const filter=page.getByRole('button',{name:'Cantidad suficiente',exact:true})
    await filter.focus(); await filter.press('Space'); await expect(card).toHaveCount(0)
    await page.goto('/weekly-plan')
    const meal=page.getByRole('link').filter({hasText:`Receta ${rid}`})
    await expect(meal).toContainText('Falta cantidad'); await expect(meal).toContainText('Cantidad no verificada')
    await fits(); await page.screenshot({path:`/tmp/kh015-plan-${width}.png`,fullPage:true,animations:'disabled'})
    await page.goto('/')
    await expect(page.getByRole('region',{name:'Recomendación de hoy'})).toContainText('Cantidad no verificada')
    await expect(page.getByRole('link',{name:/recetas? con ingredientes en tu despensa/})).toBeVisible()
    await fits(); await page.screenshot({path:`/tmp/kh015-home-${width}.png`,fullPage:true,animations:'disabled'})
    expect(errors).toEqual([])
  } finally {
    sql.prepare('DELETE FROM WeeklyMeal WHERE recipeId=?').run(rid)
    sql.prepare('DELETE FROM RecipeIngredient WHERE recipeId=?').run(rid)
    sql.prepare('DELETE FROM Recipe WHERE id=?').run(rid)
    sql.close()
  }
})
