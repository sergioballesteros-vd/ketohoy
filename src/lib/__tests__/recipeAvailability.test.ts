import { expect, it } from 'vitest'
import { ingredientAvailability, recipeAvailability, type PantryStock } from '../recipeAvailability'
import { scoreRecipe, DEFAULT_PREFERENCES } from '../recipeScoring'
const need = (quantity = '500 g', productId: string | null = 'p') => ({ name: 'pollo', quantity, productId })
const stock = (quantity: number | null = 1, unit: string | null = 'kg', extra: Partial<PantryStock> = {}): PantryStock => ({ userId: 'u', productId: 'p', product: { name: 'pollo' }, quantity, unit, ...extra })
it.each([
  ['500 g',1,'kg','sufficient'], ['1 kg',500,'g','insufficient'],
  ['500 ml',1,'L','sufficient'], ['2 unidades',1,'ud','insufficient'],
  ['300 g',2,'unidades','unknown'], ['500 g',null,null,'unknown'],
  ['al gusto',1,'kg','unknown'], ['500 g',0,'g','unknown'],
])('need %s / stock %s %s: %s', (quantity, amount,unit,status) => {
  expect(ingredientAvailability(need(quantity),[stock(amount,unit)],'u')).toMatchObject({status,presence:true})
})
it('exact ID takes priority over names (including insufficient exact stock)', () => {
  const rows = [stock(100,'g',{ product: {name:'Nombre distinto'} }), stock(10,'kg',{ productId:'other' })]
  expect(ingredientAvailability(need(),rows,'u')).toMatchObject({status:'insufficient',available:{quantity:100,unit:'g'}})
  expect(ingredientAvailability(need(),[rows[0]],'u').matched).toBe(true)
})
it('sums only compatible owned rows of the same product', () => {
  expect(ingredientAvailability(need(),[stock(300,'g'),stock(0.3,'kg')],'u').status).toBe('sufficient')
  expect(ingredientAvailability(need(),[stock(300,'g'),stock(300,'g',{userId:'other'})],'u').status).toBe('insufficient')
  expect(ingredientAvailability(need(),[stock(300,'g'),stock(300,'g',{userId:null})],'u').status).toBe('insufficient')
  expect(ingredientAvailability(need('500 g',null),[stock(300,'g'),stock(300,'g',{productId:'private'})],'u').status).toBe('insufficient')
})
it('unknown stock may cover a known shortfall but cannot verify it', () => {
  expect(ingredientAvailability(need(),[stock(300,'g'),stock(null,null)],'u').status).toBe('unknown')
  expect(ingredientAvailability(need(),[stock(600,'g'),stock(null,null)],'u').status).toBe('sufficient')
})
it('expired stock cannot cover need, expiry absent/future remain evaluable, including timestamp within today', () => {
  const now = new Date('2026-10-04T12:00:00Z')
  expect(ingredientAvailability(need(),[stock(1,'kg',{expiresAt:'2026-10-03'})],'u',now)).toMatchObject({matched:true,presence:false,status:'missing',reason:'expired'})
  expect(ingredientAvailability(need(),[stock(1,'kg',{expiresAt:'2026-10-04T11:00:00Z'})],'u',now).status).toBe('missing')
  expect(ingredientAvailability(need(),[stock()],'u',now).status).toBe('sufficient')
  expect(ingredientAvailability(need(),[stock(1,'kg',{expiresAt:'2026-10-04T13:00:00Z'})],'u',now).status).toBe('sufficient')
})
it('related substrings are missing, optional ingredients do not gate ready', () => {
  expect(ingredientAvailability({name:'salmón',quantity:'100 g',productId:null},[stock(1,'kg',{product:{name:'sal'}})],'u').status).toBe('missing')
  expect(recipeAvailability([need(),{name:'sal',quantity:null,productId:null,optional:true}],[stock()],'u')).toMatchObject({total:1,ready:true})
})
it('partial presence keeps scoring without a false cooking claim; unknown is distinct', () => {
  const recipe = {id:'r',title:'r',description:'',mealTypes:'["lunch"]',prepTimeMinutes:10,difficulty:'easy',ketoLevel:'strict',tags:'[]',steps:'[]',ingredients:[{...need(),optional:false}]}
  const opts = {pantry:[stock(100,'g')],userId:'u',preferences:DEFAULT_PREFERENCES}
  const short = scoreRecipe(recipe,opts)!
  expect(short).not.toBeNull(); expect(short.reason).toContain('Falta cantidad')
  expect(short.reason).not.toContain('ahora mismo')
  const unknown = scoreRecipe(recipe,{...opts,pantry:[stock(null,null)]})!
  expect(unknown.availability.unknown).toBe(1)
  expect(unknown.reason).toContain('Cantidad no verificada')
  expect(scoreRecipe(recipe,{...opts,pantry:[stock()]})!.availability.ready).toBe(true)
})
