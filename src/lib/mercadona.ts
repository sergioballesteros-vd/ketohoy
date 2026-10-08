import { classifyProduct, matchesProductTerm, type ProductClassification } from './productClassification'
import { fetchNutritionByEan, type NutritionalData } from './openFoodFacts'
import type { ProductCategory } from '@/lib/ketoRules'

export type MercadonaProduct = {
  id: string
  name: string
  brand: string
  source: 'mercadona'
  mercadonaId: string
  category: string
  ketoScore: number
  classification: ProductClassification
  nutrition?: NutritionalData | null
  netCarbsPer100g?: number | null
  unitPrice: number | null
  referencePrice: string | null
  imageUrl: string | null
  tags: string
  ean?: string
  ingredients?: string
  allergens?: string
}

// Re-export for client pages
export type { MercadonaProduct as MercadonaResult }
export type { ProductCategory }

export const TRENDING_MERCADONA_QUERIES = [
  'pollo',
  'huevos',
  'salmón',
  'aceite de oliva',
  'almendras',
  'brócoli',
]

export const DEMO_MERCADONA_PRODUCTS: MercadonaProduct[] = ([
  {
    id: 'mercadona_demo_salmon',
    name: 'Salmón fresco',
    brand: 'Mercadona',
    source: 'mercadona',
    mercadonaId: 'demo_salmon',
    category: 'fish',
    ketoScore: 5,
    unitPrice: 8.99,
    referencePrice: '250 g (35,96 €/kg)',
    imageUrl: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=900&q=80',
    tags: 'salmón pescado omega-3',
    ingredients: 'Salmón fresco',
    allergens: 'PESCADO',
  },
  {
    id: 'mercadona_demo_chicken',
    name: 'Pechuga de pollo',
    brand: 'Mercadona',
    source: 'mercadona',
    mercadonaId: 'demo_chicken',
    category: 'meat',
    ketoScore: 5,
    unitPrice: 5.49,
    referencePrice: '500 g (10,98 €/kg)',
    imageUrl: 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?auto=format&fit=crop&w=900&q=80',
    tags: 'pollo proteína carne',
    ingredients: 'Pechuga de pollo',
    allergens: '',
  },
  {
    id: 'mercadona_demo_avocado',
    name: 'Aguacate maduro',
    brand: 'Mercadona',
    source: 'mercadona',
    mercadonaId: 'demo_avocado',
    category: 'vegetables',
    ketoScore: 4,
    unitPrice: 1.79,
    referencePrice: '1 ud (1,79 €/ud)',
    imageUrl: 'https://images.unsplash.com/photo-1519167258670-bc493b9c9f2c?auto=format&fit=crop&w=900&q=80',
    tags: 'aguacate grasa saludable',
    ingredients: 'Aguacate',
    allergens: '',
  },
  {
    id: 'mercadona_demo_eggs',
    name: 'Huevos camperos',
    brand: 'Mercadona',
    source: 'mercadona',
    mercadonaId: 'demo_eggs',
    category: 'eggs',
    ketoScore: 5,
    unitPrice: 2.79,
    referencePrice: '6 ud (0,47 €/ud)',
    imageUrl: 'https://images.unsplash.com/photo-1518569656558-1f25e69d1a3b?auto=format&fit=crop&w=900&q=80',
    tags: 'huevos proteína',
    ingredients: 'Huevos camperos',
    allergens: 'HUEVO',
  },
  {
    id: 'mercadona_demo_broccoli',
    name: 'Brócoli fresco',
    brand: 'Mercadona',
    source: 'mercadona',
    mercadonaId: 'demo_broccoli',
    category: 'vegetables',
    ketoScore: 4,
    unitPrice: 1.59,
    referencePrice: '1 ud (1,59 €/ud)',
    imageUrl: 'https://images.unsplash.com/photo-1459411621453-7b03977f4bfc?auto=format&fit=crop&w=900&q=80',
    tags: 'brócoli verdura',
    ingredients: 'Brócoli',
    allergens: '',
  },
  {
    id: 'mercadona_demo_oil',
    name: 'Aceite de oliva virgen extra',
    brand: 'Mercadona',
    source: 'mercadona',
    mercadonaId: 'demo_oil',
    category: 'oils',
    ketoScore: 5,
    unitPrice: 4.99,
    referencePrice: '500 ml (9,98 €/l)',
    imageUrl: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=900&q=80',
    tags: 'aceite oliva grasa',
    ingredients: 'Aceite de oliva virgen extra',
    allergens: '',
  },
  {
    id: 'mercadona_demo_almonds',
    name: 'Almendras crudas',
    brand: 'Mercadona',
    source: 'mercadona',
    mercadonaId: 'demo_almonds',
    category: 'nuts',
    ketoScore: 4,
    unitPrice: 3.29,
    referencePrice: '200 g (16,45 €/kg)',
    imageUrl: 'https://images.unsplash.com/photo-1508747703725-719777637510?auto=format&fit=crop&w=900&q=80',
    tags: 'almendras fruto seco',
    ingredients: 'Almendras',
    allergens: 'FRUTOS SECOS',
  },
  {
    id: 'mercadona_demo_cheese',
    name: 'Queso curado',
    brand: 'Mercadona',
    source: 'mercadona',
    mercadonaId: 'demo_cheese',
    category: 'dairy',
    ketoScore: 4,
    unitPrice: 4.35,
    referencePrice: '250 g (17,40 €/kg)',
    imageUrl: 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?auto=format&fit=crop&w=900&q=80',
    tags: 'queso lácteo',
    ingredients: 'Leche, sal, cuajo',
    allergens: 'LECHE',
  },
] satisfies Array<Omit<MercadonaProduct, 'classification'>>).map(product => {
  const classification = classifyProduct({ name: product.name, category: product.category as ProductCategory })
  return { ...product, ketoScore: classification.score, classification }
})


const API = 'https://tienda.mercadona.es/api'
// Top-level category ids of tienda.mercadona.es (GET /api/categories) that can hold
// keto-relevant food (crawled two levels deep): fruta y verdura, pescado, carne, charcutería y quesos,
// huevos/leche, café/infusiones, aceite/especias/salsas, conservas, aperitivos, agua.
const CATALOG_CATEGORY_IDS = [1, 2, 3, 4, 6, 8, 12, 14, 15, 18]
const CATALOG_TTL_MS = 12 * 60 * 60 * 1000
const CATALOG_OPERATION_TIMEOUT_MS = 30_000
const CATALOG_REQUEST_TIMEOUT_MS = 8_000

async function fetchJson(path: string, budget?: AbortSignal): Promise<unknown> {
  const res = await fetch(`${API}${path}${path.includes('?') ? '&' : '?'}lang=es&wh=mad1`, {
    signal: budget ? AbortSignal.any([budget, AbortSignal.timeout(CATALOG_REQUEST_TIMEOUT_MS)]) : AbortSignal.timeout(CATALOG_REQUEST_TIMEOUT_MS),
  })
  if (!res.ok) throw new Error(`Mercadona API ${res.status} for ${path}`)
  return res.json()
}

let catalogCache: { at: number; hits: RawHit[] } | null = null
let catalogInflight: Promise<{ hits: RawHit[]; completeness: 'complete' | 'partial'; fetchedAt: string }> | null = null

export type MercadonaCatalogResult = {
  products: MercadonaProduct[]
  source: 'mercadona' | 'demo' | 'mixed'
  fetchedAt: string | null
  completeness: 'complete' | 'partial' | 'demo'
  freshness: 'fresh' | 'stale' | 'demo'
}

// ponytail: in-memory catalog index per process (~50 requests once per 12h) instead of
// a DB table or a search service; move it to the DB if the app ever runs multi-instance.
async function loadCatalog(): Promise<{ hits: RawHit[]; completeness: 'complete' | 'partial'; fetchedAt: string }> {
  if (catalogCache && Date.now() - catalogCache.at < CATALOG_TTL_MS) return { ...catalogCache, completeness: 'complete', fetchedAt: new Date(catalogCache.at).toISOString() }
  const pending = catalogInflight ??= (async () => {
    const budget = AbortSignal.timeout(CATALOG_OPERATION_TIMEOUT_MS)
    // Products hang off subcategories: /categories → top-level → sub ids → /categories/{sub}.
    const tree = (await fetchJson('/categories/', budget)) as { results: Array<{ id: number; name: string; categories: Array<{ id: number; name: string }> }> }
    const subs = tree.results
      .filter(top => CATALOG_CATEGORY_IDS.includes(top.id))
      .flatMap(top => top.categories.map(sub => ({ top: top.name, id: sub.id, name: sub.name })))
    const byId = new Map<string, RawHit>()
    let failed = 0
    for (let i = 0; i < subs.length; i += 8) {
      const batch = await Promise.allSettled(
        subs.slice(i, i + 8).map(async sub => ({ sub, res: (await fetchJson(`/categories/${sub.id}/`, budget)) as CategoryResponse }))
      )
      for (const r of batch) {
        if (r.status !== 'fulfilled') { failed++; continue }
        const { sub, res } = r.value
        for (const leaf of res.categories ?? []) {
          for (const p of leaf.products ?? []) {
            // Rewrite categories so normalize() maps on the specific sub/leaf names.
            byId.set(String(p.id), { ...p, categories: [{ name: sub.top, categories: [{ name: `${sub.name} ${leaf.name}` }] }] })
          }
        }
      }
    }
    if (byId.size === 0) throw new Error('Mercadona catalog unavailable')
    const snapshot = { at: Date.now(), hits: [...byId.values()] }
    if (failed === 0) catalogCache = snapshot
    const completeness: 'complete' | 'partial' = failed === 0 ? 'complete' : 'partial'
    return { ...snapshot, completeness, fetchedAt: new Date(snapshot.at).toISOString() }
  })().finally(() => { catalogInflight = null })
  return pending
}

type CategoryResponse = { name: string; categories?: Array<{ name: string; products?: RawHit[] }> }

// "huevos" ↔ "huevo", "aceites" ↔ "aceite", "limones" ↔ "limon"
const stem = (w: string) => (w.length > 3 ? w.replace(/(es|s)$/, '') : w)

export function searchCatalog(hits: RawHit[], query: string, limit: number): RawHit[] {
  const tokens = normalizeText(query).split(/\s+/).filter(Boolean).map(stem)
  if (tokens.length === 0) return []
  const scored: Array<{ hit: RawHit; score: number }> = []
  for (const hit of hits) {
    const name = normalizeText(hit.display_name ?? '')
    const sub = normalizeText(hit.categories?.[0]?.categories?.[0]?.name ?? '')
    if (!tokens.every(t => name.includes(t) || sub.includes(t))) continue
    // Name hits beat category-only hits; earlier match and shorter names rank higher.
    const nameIdx = Math.min(...tokens.map(t => (name.includes(t) ? name.indexOf(t) : 999)))
    scored.push({ hit, score: nameIdx * 2 + name.length / 100 })
  }
  return scored.sort((a, b) => a.score - b.score).slice(0, limit).map(s => s.hit)
}

export async function searchMercadonaProducts(query: string, limit = 12): Promise<MercadonaProduct[]> {
  return (await searchMercadonaProductsResult(query, limit)).products
}

export async function searchMercadonaProductsResult(query: string, limit = 12): Promise<MercadonaCatalogResult> {
  try {
    const catalog = await loadCatalog()
    if (catalog.completeness === 'partial' && catalogCache) {
      const products = normalizeMercadonaProducts(searchCatalog(catalogCache.hits, query, limit))
      return { products, source: 'mercadona', fetchedAt: new Date(catalogCache.at).toISOString(), completeness: 'complete', freshness: 'stale' }
    }
    const products = normalizeMercadonaProducts(searchCatalog(catalog.hits, query, limit))
    if (products.length > 0) {
      if (catalog.completeness === 'partial') return { products, source: 'mercadona', fetchedAt: catalog.fetchedAt, completeness: 'partial', freshness: 'fresh' }
      const detailed = await Promise.all(products.map(async product => {
        try { return await getMercadonaProduct(product.mercadonaId) ?? product } catch { return product }
      }))
      return { products: detailed, source: 'mercadona', fetchedAt: catalog.fetchedAt, completeness: 'complete', freshness: 'fresh' }
    }
    // Real catalog loaded but nothing matched: don't show demo items for a real search.
    return { products: [], source: 'mercadona', fetchedAt: catalog.fetchedAt, completeness: catalog.completeness, freshness: 'fresh' }
  } catch (err) {
    console.warn('[mercadona] search failed', err instanceof Error && err.name === 'TimeoutError' ? 'timeout' : 'provider_error')
    if (catalogCache) {
      const products = normalizeMercadonaProducts(searchCatalog(catalogCache.hits, query, limit))
      return { products, source: 'mercadona', fetchedAt: new Date(catalogCache.at).toISOString(), completeness: 'complete', freshness: 'stale' }
    }
    return { products: searchDemoMercadonaProducts(query), source: 'demo', fetchedAt: null, completeness: 'demo', freshness: 'demo' }
  }
}

export async function searchMercadonaProductsByQueries(queries: string[]): Promise<MercadonaProduct[]> {
  const results = await Promise.all(queries.map(query => searchMercadonaProducts(query)))
  return dedupeMercadonaProducts(results.flat())
}

export async function searchMercadonaProductsByQueriesResult(queries: string[]): Promise<MercadonaCatalogResult> {
  const results = await Promise.all(queries.map(query => searchMercadonaProductsResult(query)))
  const products = dedupeMercadonaProducts(results.flatMap(result => result.products))
  const selected = results.find(result => result.freshness === 'fresh') ?? results[0]
  const hasDemo = results.some(result => result.source === 'demo')
  const hasReal = results.some(result => result.source === 'mercadona')
  return {
    ...selected, products, source: hasDemo && hasReal ? 'mixed' : selected.source,
    completeness: results.some(result => result.completeness === 'partial') ? 'partial' : selected.completeness,
    freshness: hasDemo && hasReal ? 'demo' : results.some(result => result.freshness === 'stale') ? 'stale' : selected.freshness,
  }
}

// Share a canonical snapshot for search/detail/import so evidence cannot vary by path.
const productSnapshots = new Map<string, { at: number; product: Promise<MercadonaProduct | null> }>()
export async function getMercadonaProduct(id: string, knownNutrition?: NutritionalData): Promise<MercadonaProduct | null> {
  const numericId = id.startsWith('mercadona_') ? id.slice('mercadona_'.length) : id
  const demo = getDemoMercadonaProduct(id)
  if (demo) return demo
  const cached = productSnapshots.get(numericId)
  if (cached && !knownNutrition && Date.now() - cached.at < CATALOG_TTL_MS) return cached.product
  const product = resolveMercadonaProduct(numericId, knownNutrition)
  productSnapshots.set(numericId, { at: Date.now(), product })
  try {
    const result = await product
    if (!result) productSnapshots.delete(numericId)
    return result
  } catch (error) {
    productSnapshots.delete(numericId)
    throw error
  }
}

async function resolveMercadonaProduct(id: string, knownNutrition?: NutritionalData): Promise<MercadonaProduct | null> {
  const fromCatalog = catalogCache?.hits.find(p => String(p.id) === id)
  let detail: RawHit | undefined
  try { detail = (await fetchJson(`/products/${encodeURIComponent(id)}/`)) as RawHit } catch (error) {
    if (!fromCatalog) throw error
  }
  if (!detail && !fromCatalog) return null
  const [product] = normalizeMercadonaProducts([{ ...fromCatalog, ...detail, categories: fromCatalog?.categories ?? detail?.categories }])
  const nutrition = knownNutrition ?? (product.ean ? await fetchNutritionByEan(product.ean) : null)
  const netCarbs = nutrition?.availableCarbsPer100g ?? null
  const classification = classifyProduct({ name: product.name, category: product.category as ProductCategory, netCarbs })
  return { ...product, nutrition, netCarbsPer100g: netCarbs, classification, ketoScore: classification.score }
}

export type RawHit = {
  id?: string | number
  ean?: string
  display_name?: string
  thumbnail?: string
  categories?: Array<{ name: string; categories?: Array<{ name: string }> }>
  price_instructions?: {
    unit_price?: string | number
    reference_price?: string | number
    reference_format?: string
  }
  nutrition_information?: {
    ingredients?: string
    allergens?: string
  }
}

export function normalizeMercadonaProducts(raw: unknown[]): MercadonaProduct[] {
  return raw
    .filter((item): item is RawHit => typeof item === 'object' && item !== null)
    .map(item => {
      const price = item.price_instructions?.unit_price
      const refPrice = item.price_instructions?.reference_price
      const refFormat = item.price_instructions?.reference_format
      // Use deepest category name for better mapping
      const topCategory = item.categories?.[0]
      const midCategory = topCategory?.categories?.[0]
      const categoryName = midCategory?.name ?? topCategory?.name ?? ''
      // Category names first; fall back to the product name (e.g. "Salmón ahumado" sits under "Salazones").
      const mappedCategory = (mapMercadonaCategory(categoryName) !== 'other'
        ? mapMercadonaCategory(categoryName)
        : mapMercadonaCategory(item.display_name ?? '')) as ProductCategory

      // Strip HTML tags from ingredients/allergens
      const stripHtml = (s?: string) => s?.replace(/<[^>]+>/g, '') ?? undefined

      const classification = classifyProduct({ name: item.display_name ?? '', category: mappedCategory })
      return {
        id: `mercadona_${item.id}`,
        name: item.display_name ?? '',
        brand: 'Mercadona',
        source: 'mercadona' as const,
        mercadonaId: String(item.id ?? ''),
        category: mappedCategory,
        ketoScore: classification.score,
        classification,
        unitPrice: price != null ? parseFloat(String(price)) : null,
        referencePrice: refPrice != null ? `${formatEuros(refPrice)}/${refFormat ?? 'ud'}` : null,
        imageUrl: item.thumbnail ?? null,
        tags: '[]',
        ean: item.ean ?? undefined,
        ingredients: stripHtml(item.nutrition_information?.ingredients),
        allergens: stripHtml(item.nutrition_information?.allergens),
      }
    })
}

// Mercadona sends prices as strings with 3 decimals ("3.500"); show "3,50 €" like the demo data.
function formatEuros(value: string | number): string {
  const n = parseFloat(String(value))
  return Number.isFinite(n) ? `${n.toFixed(2).replace('.', ',')} €` : `${value} €`
}

export function mapMercadonaCategory(raw: string): ProductCategory {
  // Drinks first: "bebida de almendras" is not a bag of nuts.
  const order: ProductCategory[] = ['drinks', 'meat', 'fish', 'eggs', 'dairy', 'nuts', 'fruit', 'vegetables', 'oils', 'sauces']
  return order.find(category => CATEGORY_KEYWORDS[category].some(term => matchesProductTerm(raw, term))) ?? 'other'
}

const CATEGORY_KEYWORDS: Record<ProductCategory, string[]> = {
  meat: ['carne', 'pollo', 'pavo', 'ternera', 'cerdo', 'jamon', 'jamón', 'chorizo', 'lomo', 'bacon', 'embutido', 'salchicha'],
  fish: ['pescado', 'marisco', 'atun', 'atún', 'salmon', 'salmón', 'merluza', 'bacalao', 'sardina', 'gamba'],
  eggs: ['huevo', 'huevos'],
  dairy: ['lacteo', 'lácteo', 'queso', 'yogur', 'leche', 'nata', 'mantequilla', 'mozzarella'],
  vegetables: ['verdura', 'hortaliza', 'espinaca', 'brocoli', 'brócoli', 'lechuga', 'calabacin', 'calabacín', 'tomate', 'repollo', 'aguacate'],
  fruit: ['fruta', 'manzana', 'pera', 'platano', 'plátano', 'fresa', 'frambuesa', 'arándano', 'arandano'],
  nuts: ['fruto seco', 'nuez', 'almendra', 'avellana', 'pistacho', 'anacardo'],
  oils: ['aceite', 'vinagre', 'oliva', 'coco', 'girasol'],
  sauces: ['salsa', 'condimento', 'aderezo', 'mayonesa', 'mostaza'],
  drinks: ['bebida', 'agua', 'zumo', 'refresco', 'cafe', 'café', 'te', 'té'],
  other: [],
}

export function productMatchesMercadonaCategory(product: MercadonaProduct, category: ProductCategory): boolean {
  if (product.category === category) return true
  const haystack = normalizeText([product.name, product.ingredients ?? '', product.allergens ?? '', product.brand].filter(Boolean).join(' '))
  return CATEGORY_KEYWORDS[category].some(term => matchesProductTerm(haystack, term))
}

function dedupeMercadonaProducts(products: MercadonaProduct[]): MercadonaProduct[] {
  const seen = new Set<string>()
  return products.filter(product => {
    if (seen.has(product.mercadonaId)) return false
    seen.add(product.mercadonaId)
    return true
  })
}

function searchDemoMercadonaProducts(query: string): MercadonaProduct[] {
  const normalized = normalizeText(query.trim())
  if (!normalized) return DEMO_MERCADONA_PRODUCTS.slice(0, 6)

  const matches = DEMO_MERCADONA_PRODUCTS.filter(product => {
    const haystack = normalizeText([
      product.name,
      product.brand,
      product.category,
      product.ingredients ?? '',
      product.allergens ?? '',
      product.tags,
    ].filter(Boolean).join(' '))
    return haystack.includes(normalized)
  })

  if (matches.length > 0) return matches

  if (normalized.includes('keto')) return DEMO_MERCADONA_PRODUCTS.slice(0, 6)

  return DEMO_MERCADONA_PRODUCTS.filter(product => {
    const haystack = normalizeText([product.category, product.tags, product.name].join(' '))
    return normalized.split(' ').some(term => term && haystack.includes(term))
  })
}

function getDemoMercadonaProduct(id: string): MercadonaProduct | null {
  const normalizedId = id.startsWith('mercadona_') ? id.slice('mercadona_'.length) : id
  return DEMO_MERCADONA_PRODUCTS.find(product => product.mercadonaId === normalizedId || product.id === id) ?? null
}

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}
