import { afterAll, beforeAll, beforeEach, expect, it, vi } from 'vitest'
import Database from 'better-sqlite3'
import { setupTestDb, post } from '@/lib/__tests__/testDb'
import { getMonday } from '@/lib/dateUtils'
const account = vi.hoisted(() => ({ id: 'unset' }))
vi.mock('@/lib/auth', () => ({ requireUserId: async () => account.id }))
let db: typeof import('@/lib/db').db
let POST: typeof import('../route').POST
let cleanup: () => void
let dbPath: string
let sequence = 0
beforeAll(async () => {
  ;({ cleanup, dbPath } = setupTestDb())
  ;({ db } = await import('@/lib/db'))
  ;({ POST } = await import('../route'))
})
afterAll(async () => { await db.$disconnect(); cleanup() })
beforeEach(async () => {
  const user = await db.user.create({ data: { email: `kh027-${sequence++}@example.com` } })
  account.id = user.id
})
const recipe = (quantity = '300 g', name = 'Weekly chicken', productId?: string) => db.recipe.create({ data: {
  title: name, description: '', mealTypes: '["breakfast","lunch","snack","dinner"]', prepTimeMinutes: 5, difficulty:'easy', ketoLevel:'strict', steps:'[]',
  ingredients: { create: { name, quantity, productId } },
},include:{ingredients:true} })
const plan = async (ids: string[], count = 28) => db.weeklyPlan.create({ data: { userId:account.id,weekStart:getMonday(new Date()),
  meals: {create:Array.from({length:count},(_,i)=>({dayOfWeek:Math.floor(i/4),mealType:['breakfast','lunch','snack','dinner'][i%4],recipeId:ids[i%ids.length]}))},
},include:{meals:true} })
const prepare = (planId: string) => POST(post('http://t/api/weekly-plan/shopping-list',{planId}))
const rows = () => db.shoppingListItem.findMany({where:{userId:account.id},orderBy:{id:'asc'}})
const sources = (row: {sourceContributions:string|null}) => JSON.parse(row.sourceContributions!).sources as {slotId:string;recipeId:string;ingredientId:string;missingQuantity:number|null;sourceKey:string}[]
it('one server operation resolves all 28 repeated slots; retry and concurrent requests leave identical list', async () => {
  const r = await recipe(), p = await plan([r.id])
  const planBefore = await db.weeklyPlan.findUnique({where:{id:p.id}})
  expect((await prepare(p.id)).status).toBe(200)
  expect(await db.weeklyPlan.findUnique({where:{id:p.id}})).toEqual(planBefore)
  const before = await rows()
  expect(before).toHaveLength(1)
  expect(before[0]).toMatchObject({requiredQuantity:8400,requiredUnit:'g',purchaseQuantity:null,sourceType:'weekly-plan'})
  expect(sources(before[0])).toHaveLength(28)
  expect(new Set(sources(before[0]).map(s=>s.sourceKey)).size).toBe(28)
  const replies = await Promise.all([prepare(p.id),prepare(p.id)])
  expect(replies.map(r=>r.status)).toEqual([200,200])
  expect(await rows()).toEqual(before)
})
it('concurrent first requests create one coherent snapshot', async () => {
  const p = await plan([(await recipe()).id])
  expect((await Promise.all([prepare(p.id),prepare(p.id)])).map(r=>r.status)).toEqual([200,200])
  expect(await rows()).toHaveLength(1)
  expect((await rows())[0].requiredQuantity).toBe(8400)
})
it.each([[500,'g',100],[1,'kg',0],[0,'g',600],[1,'kg',200],[2,'unidad',600]])('virtual shared stock %s %s yields %s and pantry is immutable', async (quantity,unit,expected) => {
  const product = await db.product.create({data:{name:'Weekly chicken',source:'mercadona',category:'meat'}})
  const r = await recipe(expected===200?'600 g':'300 g','Weekly chicken',product.id)
  const empty = await db.recipe.create({data:{title:'No mandatory',description:'',mealTypes:'[]',prepTimeMinutes:1,difficulty:'easy',ketoLevel:'strict',steps:'[]'}})
  const p = await plan([empty.id])
  await db.weeklyMeal.updateMany({where:{id:{in:p.meals.slice(0,2).map(m=>m.id)}},data:{recipeId:r.id}})
  if(quantity) await db.pantryItem.create({data:{productId:product.id,userId:account.id,quantity,unit}})
  const pantryBefore = await db.pantryItem.findMany({where:{userId:account.id}})
  expect((await prepare(p.id)).status).toBe(200)
  expect((await rows()).reduce((sum,r)=>sum+(r.requiredQuantity??0),0)).toBe(expected)
  expect(await db.pantryItem.findMany({where:{userId:account.id}})).toEqual(pantryBefore)
})
it('swap replaces only changed-slot contribution; manual, legacy, bought and ambiguous weekly history remain intact', async () => {
  const a = await recipe('300 g'), b = await recipe('200 g','Weekly tomato'), p = await plan([a.id])
  const manual = await db.shoppingListItem.create({data:{userId:account.id,name:'Manual milk',sourceType:'manual',purchaseQuantity:2}})
  const legacy = await db.shoppingListItem.create({data:{userId:account.id,name:'Legacy',quantity:'one'}})
  const ambiguous = await db.shoppingListItem.create({data:{userId:account.id,name:'Ambiguous',sourceType:'weekly-plan',sourceKey:'old',sourceContributions:'not JSON'}})
  const bought = await db.shoppingListItem.create({data:{userId:account.id,name:'Bought',checked:true,pantryDelta:2}})
  await prepare(p.id)
  const before = (await rows()).find(r=>r.sourceContributions?.startsWith('{'))!
  const target = p.meals[0]
  await db.weeklyMeal.update({where:{id:target.id},data:{recipeId:b.id}})
  expect((await prepare(p.id)).status).toBe(200)
  const after = await rows()
  const weekly = after.filter(r=>r.sourceContributions?.startsWith('{'))
  expect(weekly).toHaveLength(2)
  expect(weekly.find(r=>r.name==='Weekly chicken')!.requiredQuantity).toBe(8100)
  expect(weekly.find(r=>r.name==='Weekly tomato')!.requiredQuantity).toBe(200)
  expect(weekly.flatMap(sources).filter(s=>s.slotId!==target.id)).toEqual(sources(before).filter(s=>s.slotId!==target.id))
  for(const original of [manual,legacy,ambiguous,bought]) expect(after.find(r=>r.id===original.id)).toEqual(original)
  const snapshot = await rows(); await prepare(p.id); expect(await rows()).toEqual(snapshot)
})
it('regenerated plan removes only old pending snapshots of this week', async () => {
  const r = await recipe(), old = await plan([r.id]); await prepare(old.id)
  const before = await rows()
  await db.weeklyPlan.delete({where:{id:old.id}})
  const replacement = await plan([r.id]); await prepare(replacement.id)
  const after = await rows()
  expect(after).toHaveLength(1)
  expect(after[0].id).not.toBe(before[0].id)
  expect(sources(after[0]).every(s=>s.sourceKey.includes(replacement.id))).toBe(true)
  expect((await prepare(old.id)).status).toBe(404)
})
it('checked weekly snapshot is never reopened, edited or duplicated on retry or an unrelated slot swap', async () => {
  const a = await recipe(), b = await recipe('200 g','Tomato'), c = await recipe('100 g','New tomato')
  const p = await plan([a.id,b.id]); await prepare(p.id)
  const chicken = (await rows()).find(r=>r.name==='Weekly chicken')!
  const historical = await db.shoppingListItem.update({where:{id:chicken.id},data:{checked:true,pantryDelta:5}})
  await prepare(p.id)
  await db.weeklyMeal.update({where:{id:p.meals[1].id},data:{recipeId:c.id}})
  await prepare(p.id)
  expect((await rows()).filter(r=>r.name==='Weekly chicken')).toEqual([historical])
})
it('partial plan explicitly fails without synchronizing any rows', async () => {
  const p = await plan([(await recipe()).id],7)
  const response = await prepare(p.id)
  expect(response.status).toBe(422)
  expect(await response.json()).toMatchObject({code:'incomplete_plan'})
  expect(await rows()).toEqual([])
})
it('A cannot read/sync B plan/list/pantry or associate B private product', async () => {
  const owner = account.id
  const privateProduct = await db.product.create({data:{name:'Private',ownerId:owner,category:'meat'}})
  const r = await recipe('300 g','Private',privateProduct.id), p = await plan([r.id])
  await db.pantryItem.create({data:{userId:owner,productId:privateProduct.id,quantity:99999,unit:'g'}})
  const other = await db.user.create({data:{email:`other-${sequence++}@example.com`}})
  account.id = other.id
  expect((await prepare(p.id)).status).toBe(404)
  const own = await plan([r.id]); expect((await prepare(own.id)).status).toBe(200)
  expect((await rows())[0]).toMatchObject({requiredQuantity:8400,productId:null,userId:other.id})
  expect(await db.shoppingListItem.count({where:{userId:owner}})).toBe(0)
})
it('unknown requirements retain every original source and never invent numeric amounts', async () => {
  const p = await plan([(await recipe('al gusto')).id])
  const res = await prepare(p.id); expect(res.status).toBe(200)
  expect(await res.json()).toMatchObject({unknown:28,needs:28})
  expect((await rows()).every(r=>r.requiredQuantity===null&&r.originalIngredientText==='al gusto')).toBe(true)
})
it('a database failure after deleting stale rows rolls back the whole synchronization', async () => {
  const a = await recipe(), b = await recipe('200 g','Fail tomato'), p = await plan([a.id]); await prepare(p.id)
  const before = await rows()
  await db.weeklyMeal.update({where:{id:p.meals[0].id},data:{recipeId:b.id}})
  const sql = new Database(dbPath)
  sql.exec("CREATE TRIGGER kh027_fail BEFORE INSERT ON ShoppingListItem WHEN NEW.name = 'Fail tomato' BEGIN SELECT RAISE(ABORT, 'forced failure'); END")
  const log = vi.spyOn(console,'error').mockImplementation(()=>{})
  try { expect((await prepare(p.id)).status).toBe(500); expect(await rows()).toEqual(before) }
  finally { log.mockRestore(); sql.exec('DROP TRIGGER kh027_fail'); sql.close() }
  expect((await prepare(p.id)).status).toBe(200)
})

it('before/after: individual recipe additions reuse 500 g independently; one weekly action correctly needs 100 g', async () => {
  const product = await db.product.create({data:{name:'Before after chicken',source:'mercadona',category:'meat'}})
  const r = await recipe('300 g',product.name,product.id)
  const empty = await db.recipe.create({data:{title:'Base before after',description:'',mealTypes:'[]',prepTimeMinutes:30,difficulty:'easy',ketoLevel:'strict',steps:'[]'}})
  const p = await plan([empty.id])
  await db.weeklyMeal.updateMany({where:{id:{in:p.meals.slice(0,2).map(m=>m.id)}},data:{recipeId:r.id}})
  await db.pantryItem.create({data:{productId:product.id,userId:account.id,quantity:500,unit:'g'}})
  const {POST:addRecipe} = await import('../../../recipes/[id]/add-to-shopping-list/route')
  for(const meal of p.meals.slice(0,2)) {
    const response = await addRecipe(post('http://t/recipe',{mealId:meal.id}),{params:Promise.resolve({id:r.id})})
    expect(await response.json()).toMatchObject({added:0})
  }
  expect(await rows()).toEqual([])
  expect((await prepare(p.id)).status).toBe(200)
  expect((await rows())[0]).toMatchObject({requiredQuantity:100,requiredUnit:'g'})
  const snapshot = await rows(); await prepare(p.id); expect(await rows()).toEqual(snapshot)
})

it('retry preserves an explicitly associated accessible product and selected package count', async () => {
  const p = await plan([(await recipe()).id]); await prepare(p.id)
  const row = (await rows())[0]
  const product=await db.product.create({data:{name:'Chosen package',category:'meat',ownerId:account.id}})
  const selected=await db.shoppingListItem.update({where:{id:row.id},data:{productId:product.id,purchaseQuantity:3,quantity:'3'}})
  await prepare(p.id)
  expect(await rows()).toEqual([selected])
})
