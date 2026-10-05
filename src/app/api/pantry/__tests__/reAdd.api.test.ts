import { beforeAll, afterAll, expect, it, vi } from 'vitest'
import { setupTestDb, post, patch, del } from '@/lib/__tests__/testDb'
const account = vi.hoisted(() => ({id:''}))
vi.mock('@/lib/auth',()=>({requireUserId:async()=>account.id}))
let db:typeof import('@/lib/db').db
let POST:typeof import('../route').POST
let PATCH:typeof import('../[id]/route').PATCH
let DELETE:typeof import('../[id]/route').DELETE
let cleanup:()=>void
const params=(id:string)=>({params:Promise.resolve({id})})
beforeAll(async()=>{
  ;({cleanup}=setupTestDb()); ({db}=await import('@/lib/db'))
  ;({POST}=await import('../route')); ({PATCH,DELETE}=await import('../[id]/route'))
  account.id=(await db.user.create({data:{email:'kh016-owner@example.com'}})).id
})
afterAll(()=>cleanup())
const product=()=>db.product.create({data:{name:'KH016',category:'other',source:'manual',ownerId:account.id}})
const add=(productId:string,quantity=3,unit='kg')=>POST(post('http://t/pantry',{productId,quantity,unit}))
it('created 3 kg, repeated POST 5 kg explicitly existing, PATCH edits to 5 kg',async()=>{
  const p=await product(); const response=await add(p.id); expect(response.status).toBe(201)
  const created=await response.json(); expect(created).toMatchObject({outcome:'created',quantity:3,unit:'kg',product:{id:p.id}})
  const again=await add(p.id,5); expect(again.status).toBe(200)
  expect(await again.json()).toMatchObject({id:created.id,outcome:'existing',quantity:3,unit:'kg',product:{id:p.id}})
  expect(await db.pantryItem.findUnique({where:{id:created.id}})).toMatchObject({quantity:3,unit:'kg'})
  const edited=await PATCH(patch('http://t/edit',{quantity:5}),params(created.id))
  expect(await edited.json()).toMatchObject({quantity:5,unit:'kg'})
  expect((await PATCH(patch('http://t/edit',{unit:''}),params(created.id))).status).toBe(400)
  expect(await (await PATCH(patch('http://t/edit',{quantity:500,unit:'g'}),params(created.id))).json()).toMatchObject({quantity:500,unit:'g'})
})
it('two simultaneous initial POSTs create one row and do not add or replace stock',async()=>{
  const p=await product(); const responses=await Promise.all([add(p.id,3),add(p.id,5)])
  const items=await Promise.all(responses.map(r=>r.json()))
  expect(items.map(i=>i.outcome).sort()).toEqual(['created','existing'])
  expect(items[0].id).toBe(items[1].id); expect(items[0].quantity).toBe(items[1].quantity)
  expect(await db.pantryItem.count({where:{productId:p.id,userId:account.id}})).toBe(1)
})
it('delete A, re-add B, undo A preserves new quantity and delta recorded by purchase',async()=>{
  const p=await product(); const original=await (await add(p.id)).json()
  expect((await DELETE(del('http://t/delete'),params(original.id))).status).toBe(200)
  const readded=await (await add(p.id,5)).json()
  const shopping=await db.shoppingListItem.create({data:{userId:account.id,name:p.name,productId:p.id,checked:true,pantryItemId:readded.id,pantryDelta:5,pantryDeltaUnit:'kg',pantryCreated:true}})
  const undo=await (await add(p.id,original.quantity,original.unit)).json()
  expect(undo).toMatchObject({id:readded.id,outcome:'existing',quantity:5,unit:'kg'})
  expect(await db.pantryItem.count({where:{productId:p.id,userId:account.id}})).toBe(1)
  expect(await db.shoppingListItem.findUnique({where:{id:shopping.id}})).toEqual(shopping)
})
it('foreign product is rejected even if malicious old pantry row points at it',async()=>{
  const other=await db.user.create({data:{email:'kh016-other@example.com'}})
  const p=await db.product.create({data:{name:'Private other',category:'other',source:'manual',ownerId:other.id}})
  const row=await db.pantryItem.create({data:{userId:account.id,productId:p.id,quantity:9,unit:'kg'}})
  expect((await add(p.id)).status).toBe(404)
  expect(await db.pantryItem.findUnique({where:{id:row.id}})).toEqual(row)
  expect((await PATCH(patch('http://t/edit',{quantity:5}),params((await db.pantryItem.create({data:{userId:other.id,productId:p.id}})).id))).status).toBe(404)
})
