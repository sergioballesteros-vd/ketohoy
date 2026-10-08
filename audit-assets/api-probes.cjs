// Audit evidence only. Requires the audit server on 3100 and a disposable DB copy.
/* eslint-disable @typescript-eslint/no-require-imports -- This audit probe is CommonJS. */
const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');
const base = 'http://127.0.0.1:3100';
const dbPath = process.env.AUDIT_DB;
if (!dbPath || path.resolve(dbPath) === path.resolve('dev.db') || !dbPath.includes('ketohoy-audit-')) throw Error('Use only an isolated ketohoy-audit-* DB');
const sql = new Database(dbPath);
const result = {};
const stamp = Date.now();
async function req(route, method='GET', body, cookie) {
  const r = await fetch(base + route, {method, headers:{...(cookie && {cookie}), ...(body !== undefined && {'content-type':'application/json'})}, ...(body !== undefined && {body:JSON.stringify(body)})});
  return {status:r.status, data:await r.json().catch(()=>null), cookie:r.headers.get('set-cookie')?.split(';')[0]};
}
(async()=>{
  result.noCookieProducts = (await req('/api/products')).status;
  const fake = 'session=audit-invalid-session';
  result.fakeCookiePantry = (await req('/api/pantry','GET',undefined,fake)).status;
  result.fakeCookieProducts = (await req('/api/products','GET',undefined,fake)).status;
  const injected = await req('/api/products','POST',{name:`AUDIT-private-${stamp}`,category:'other'},fake);
  result.fakeCookieCreateProduct = injected.status;
  const reg = await req('/api/auth/register','POST',{email:`audit-api-${stamp}@example.com`,password:'Audit-local-password-123',acceptTerms:true,confirmAdult:true});
  if(reg.status!==201)throw Error('registration failed '+reg.status);
  const cookie=reg.cookie, userId=reg.data.id;
  result.registration = reg.status;
  result.globalManualProductVisible = (await req('/api/products/search?q=AUDIT-private-'+stamp,'GET',undefined,cookie)).data.some(p=>p.name===`AUDIT-private-${stamp}`);
  const recipes=(await req('/api/recipes','GET',undefined,cookie)).data;
  const recipe=recipes.find(r=>r.ingredients?.some(i=>i.quantity && /\d+\s*g/.test(i.quantity)));
  if(recipe){
    result.recipeExample={title:recipe.title,ingredients:recipe.ingredients.map(i=>({name:i.name,quantity:i.quantity}))};
    await req('/api/recipes/'+recipe.id+'/add-to-shopping-list','POST',undefined,cookie);
    const once=(await req('/api/shopping-list','GET',undefined,cookie)).data;
    await req('/api/recipes/'+recipe.id+'/add-to-shopping-list','POST',undefined,cookie);
    const twice=(await req('/api/shopping-list','GET',undefined,cookie)).data;
    result.repeatRecipeAdd={first:once.map(i=>({name:i.name,quantity:i.quantity})),second:twice.map(i=>({name:i.name,quantity:i.quantity}))};
  }
  const buy=(await req('/api/shopping-list','POST',{name:`AUDIT-buy-${stamp}`,productId:injected.data.id,quantity:1},cookie)).data;
  await req('/api/shopping-list/'+buy.id+'/check','PATCH',undefined,cookie);
  await req('/api/shopping-list','POST',{name:buy.name,productId:buy.productId,quantity:1},cookie);
  result.readdBought=(await req('/api/shopping-list','GET',undefined,cookie)).data.filter(i=>i.id===buy.id).map(i=>({checked:i.checked,quantity:i.quantity,pantryDelta:i.pantryDelta}));
  const before=(await req('/api/pantry','GET',undefined,cookie)).data.find(i=>i.productId===buy.productId);
  result.readdBoughtPantry={quantity:before?.quantity};
  const race=(await req('/api/shopping-list','POST',{name:`AUDIT-race-${stamp}`,quantity:1},cookie)).data;
  const changes=await Promise.all(Array.from({length:5},()=>req('/api/shopping-list/'+race.id+'/quantity','PATCH',{delta:1},cookie)));
  result.concurrentQuantity={statuses:changes.map(r=>r.status),expected:6,actual:(await req('/api/shopping-list','GET',undefined,cookie)).data.find(i=>i.id===race.id)?.quantity};
  const prefs=await Promise.all(Array.from({length:3},()=>req('/api/preferences','GET',undefined,cookie)));
  result.concurrentPreferenceGet={statuses:prefs.map(r=>r.status),rows:sql.prepare('select count(*) n from UserPreferences where userId=?').get(userId).n};
  const generated=await req('/api/weekly-plan/generate','POST',undefined,cookie);
  result.defaultPlan={status:generated.status,meals:generated.data?.meals?.length};
  await req('/api/preferences','PATCH',{avoidFish:true,avoidPork:true,avoidDairy:true,ketoMode:'strict',maxCookingMinutes:5},cookie);
  const target=generated.data.meals.find(m=>m.mealType==='lunch');
  const fish=recipes.find(r=>JSON.parse(r.mealTypes).includes('lunch') && r.ingredients.some(i=>/salmón|atún/i.test(i.name)));
  if(target&&fish){const swapped=await req('/api/weekly-plan/'+target.id,'PATCH',{recipeId:fish.id},cookie);result.incompatibleSwap={status:swapped.status,title:swapped.data.recipe?.title};}
  const partial=await req('/api/weekly-plan/generate','POST',undefined,cookie);
  result.restrictedPlan={status:partial.status,meals:partial.data?.meals?.length,types:[...new Set(partial.data?.meals?.map(m=>m.mealType))]};
  const broken=(await req('/api/shopping-list','POST',{name:`AUDIT-atomic-${stamp}`,quantity:1},cookie)).data;
  sql.exec("CREATE TRIGGER audit_fail_pantry BEFORE INSERT ON PantryItem BEGIN SELECT RAISE(ABORT, 'audit simulated pantry failure'); END;");
  try {result.purchaseFailure=(await req('/api/shopping-list/'+broken.id+'/check','PATCH',undefined,cookie)).status;} finally {sql.exec('DROP TRIGGER audit_fail_pantry');}
  const final=(await req('/api/shopping-list','GET',undefined,cookie)).data.find(i=>i.id===broken.id);
  result.purchaseAfterFailure={checked:final.checked,pantryDelta:final.pantryDelta,pantryRows:sql.prepare('select count(*) n from PantryItem p join Product x on x.id=p.productId where p.userId=? and x.name=?').get(userId,broken.name).n};
  result.invalidShoppingProduct=(await req('/api/shopping-list','POST',{name:'AUDIT-nonexistent',productId:'nonexistent'},cookie)).status;
  sql.close();
  fs.writeFileSync('audit-assets/api-probes.json',JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify(result,null,2));
})().catch(e=>{sql.close();console.error(e.message);process.exitCode=1;});
