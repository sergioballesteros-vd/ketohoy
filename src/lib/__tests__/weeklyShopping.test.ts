import { expect, it } from 'vitest'
import { calculateWeeklyShopping, type ShoppingPlan } from '../weeklyShopping'
const plan = (quantities: (string | null)[]): ShoppingPlan => ({ id: 'plan', weekStart: new Date('2026-10-05'), meals: quantities.map((quantity, dayOfWeek) => ({
  id: `slot${dayOfWeek}`, dayOfWeek, mealType: 'lunch', recipeId: `r${dayOfWeek}`, recipe: { id: `r${dayOfWeek}`, title: 'Chicken', ingredients: [{ id: `i${dayOfWeek}`, name: 'Pollo', productId: 'chicken', quantity }] },
})) })
const stock = (quantity: number | null, unit: string | null = 'g') => [{ id: 'stock', userId: 'A', productId: 'chicken', product: { name: 'Pollo' }, quantity, unit }]
it.each([
  [500,'g',['300 g','300 g'],100], [1,'kg',['300 g','300 g'],0], [null,null,['300 g','300 g'],600],
  [1,'kg',['1200 g'],200], [2,'unidad',['300 g'],300], [600,'g',['300 g','300 g'],0],
  [500,'g',Array(10).fill('100 g'),500],
])('virtual stock %s %s for %j produces %s g', (quantity, unit, needs, expected) => {
  const pantry = quantity === null ? [] : stock(quantity,unit)
  const before = structuredClone(pantry)
  const result = calculateWeeklyShopping(plan(needs),pantry,'A')
  expect(result.items.reduce((sum,i) => sum + (i.requiredQuantity ?? 0),0)).toBe(expected)
  expect(pantry).toEqual(before)
})
it('aggregates compatible quantities with exact slot/recipe/ingredient contributions', () => {
  const result = calculateWeeklyShopping(plan(['200 g','0.3 kg']),[],'A')
  expect(result.items).toHaveLength(1)
  expect(result.items[0]).toMatchObject({requiredQuantity:500,requiredUnit:'g'})
  const sources = JSON.parse(result.items[0].sourceContributions).sources
  expect(sources.map((s: {slotId:string}) => s.slotId)).toEqual(['slot0','slot1'])
  expect(sources[1]).toMatchObject({recipeId:'r1',ingredientId:'i1',originalIngredientText:'0.3 kg',requiredQuantity:0.3,missingQuantity:0.3})
})
it('separates dimensions and unknown quantities; presence never invents one', () => {
  const result = calculateWeeklyShopping(plan(['300 g','2 unidades','al gusto',null]),stock(2,'unidad'),'A')
  expect(result.items.map(i=>i.requiredQuantity)).toEqual([300,null,null])
  expect(result.unknown).toBe(3)
  expect(result.items[1].originalIngredientText).toBe('al gusto')
})
it('uses deterministic ordering independent of query order and preserves exact identity after exhaustion', () => {
  const p = plan(['300 g','300 g'])
  const pantry = [...stock(500),{...stock(800)[0],id:'other',productId:'other'}]
  const result = calculateWeeklyShopping(p,pantry,'A')
  expect(result.items[0].requiredQuantity).toBe(100)
  p.meals.reverse()
  expect(calculateWeeklyShopping(p,pantry.reverse(),'A')).toEqual(result)
})
it('excludes foreign/expired stock and optional ingredients', () => {
  const p = plan(['300 g'])
  p.meals[0].recipe!.ingredients.push({id:'optional',name:'Pollo',productId:'chicken',quantity:'900 g',optional:true})
  const pantry = [{...stock(500)[0],userId:'B'},{...stock(500)[0],id:'expired',expiresAt:new Date('2020-01-01')}]
  expect(calculateWeeklyShopping(p,pantry,'A').items[0].requiredQuantity).toBe(300)
})
it('known partial stock is used once even when some stock is unknown or incompatible', () => {
  const result = calculateWeeklyShopping(plan(['300 g','300 g']),[...stock(500),{...stock(null)[0],id:'unknown'}],'A')
  expect(result.items[0].requiredQuantity).toBe(100)
  expect(result.unknown).toBe(1)
})
it('volume conversion and independent product identities obey KH-005/KH-015', () => {
  const p = plan(['1200 ml','2 cdas'])
  expect(calculateWeeklyShopping(p,stock(1,'L'),'A').items.map(i=>[i.requiredQuantity,i.requiredUnit])).toEqual([[200,'ml'],[2,'cda']])
})

it('exact fractional stock does not create a phantom shortage, but preserves genuinely tiny needs', () => {
  expect(calculateWeeklyShopping(plan(Array(10).fill('100 g')),stock(1,'kg'),'A').items).toEqual([])
  expect(calculateWeeklyShopping(plan(['0.1 g','0.1 g','0.1 g']),stock(0.3),'A').items).toEqual([])
  expect(calculateWeeklyShopping(plan(['0.00000000000000000001 g']),[],'A').items[0].requiredQuantity).toBe(1e-20)
})

it('records the covered slot as well as the shortage to explain shared-stock allocation', () => {
  const result=calculateWeeklyShopping(plan(['300 g','300 g']),stock(500),'A')
  expect(JSON.parse(result.items[0].sourceContributions).sources.map((s:{coveredQuantity:number;missingQuantity:number;status:string})=>[s.coveredQuantity,s.missingQuantity,s.status])).toEqual([[300,0,'covered'],[200,100,'required']])
})
