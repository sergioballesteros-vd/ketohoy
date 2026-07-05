import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { ketoScoreByCategory } from '@/lib/ketoRules'
import type { ProductCategory } from '@/lib/ketoRules'

const execFileAsync = promisify(execFile)

export type MercadonaProduct = {
  id: string
  name: string
  brand: string
  source: 'mercadona'
  mercadonaId: string
  category: string
  ketoScore: number
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

export const DEMO_MERCADONA_PRODUCTS: MercadonaProduct[] = [
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
]

let _cliAvailable: boolean | null = null

async function isMercadonaCliAvailable(): Promise<boolean> {
  if (_cliAvailable !== null) return _cliAvailable
  try {
    await execFileAsync('mercadona', ['--version'], { timeout: 3000 })
    _cliAvailable = true
  } catch {
    _cliAvailable = false
  }
  return _cliAvailable
}

export async function searchMercadonaProducts(query: string): Promise<MercadonaProduct[]> {
  const available = await isMercadonaCliAvailable()
  if (!available) return searchDemoMercadonaProducts(query)

  try {
    const { stdout } = await execFileAsync(
      'mercadona',
      ['search', '--limit', '10', '--json', query],
      { timeout: 10000 }
    )
    const raw = JSON.parse(stdout)
    // CLI returns { query, nbHits, hits: [...] }
    const hits = Array.isArray(raw.hits) ? raw.hits : Array.isArray(raw) ? raw : []
    const products = normalizeMercadonaProducts(hits)
    return products.length > 0 ? products : searchDemoMercadonaProducts(query)
  } catch {
    return searchDemoMercadonaProducts(query)
  }
}

export async function searchMercadonaProductsByQueries(queries: string[]): Promise<MercadonaProduct[]> {
  const results = await Promise.all(queries.map(query => searchMercadonaProducts(query)))
  return dedupeMercadonaProducts(results.flat())
}

export async function getMercadonaProduct(id: string): Promise<MercadonaProduct | null> {
  const available = await isMercadonaCliAvailable()
  if (!available) return getDemoMercadonaProduct(id)

  try {
    const { stdout } = await execFileAsync(
      'mercadona',
      ['product', id, '--json'],
      { timeout: 10000 }
    )
    const raw = JSON.parse(stdout)
    const [product] = normalizeMercadonaProducts([raw])
    return product ?? getDemoMercadonaProduct(id)
  } catch {
    return getDemoMercadonaProduct(id)
  }
}

type RawHit = {
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

function normalizeMercadonaProducts(raw: unknown[]): MercadonaProduct[] {
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
      const mappedCategory = mapMercadonaCategory(categoryName) as ProductCategory

      // Strip HTML tags from ingredients/allergens
      const stripHtml = (s?: string) => s?.replace(/<[^>]+>/g, '') ?? undefined

      return {
        id: `mercadona_${item.id}`,
        name: item.display_name ?? '',
        brand: 'Mercadona',
        source: 'mercadona' as const,
        mercadonaId: String(item.id ?? ''),
        category: mappedCategory,
        ketoScore: ketoScoreByCategory(mappedCategory),
        unitPrice: price != null ? parseFloat(String(price)) : null,
        referencePrice: refPrice != null ? `${refPrice}€/${refFormat ?? 'u'}` : null,
        imageUrl: item.thumbnail ?? null,
        tags: '[]',
        ean: item.ean ?? undefined,
        ingredients: stripHtml(item.nutrition_information?.ingredients),
        allergens: stripHtml(item.nutrition_information?.allergens),
      }
    })
}

function mapMercadonaCategory(raw: string): string {
  const lower = normalizeText(raw)
  if (lower.includes('carne') || lower.includes('pollo') || lower.includes('pavo') || lower.includes('ternera') || lower.includes('cerdo')) return 'meat'
  if (lower.includes('pescado') || lower.includes('marisco') || lower.includes('atun') || lower.includes('salmon') || lower.includes('bacalao')) return 'fish'
  if (lower.includes('huevo')) return 'eggs'
  if (lower.includes('lacteo') || lower.includes('queso') || lower.includes('yogur') || lower.includes('leche')) return 'dairy'
  if (lower.includes('fruta') || lower.includes('manzana') || lower.includes('pera') || lower.includes('platano') || lower.includes('fresa') || lower.includes('frambuesa') || lower.includes('arandano')) return 'fruit'
  if (lower.includes('verdura') || lower.includes('hortaliza')) return 'vegetables'
  if (lower.includes('fruto seco') || lower.includes('nuez') || lower.includes('almendra') || lower.includes('avellana')) return 'nuts'
  if (lower.includes('aceite') || lower.includes('vinagre')) return 'oils'
  if (lower.includes('salsa') || lower.includes('condimento') || lower.includes('aderezo')) return 'sauces'
  if (lower.includes('bebida') || lower.includes('agua') || lower.includes('zumo') || lower.includes('refresco')) return 'drinks'
  return 'other'
}

const CATEGORY_KEYWORDS: Record<ProductCategory, string[]> = {
  meat: ['carne', 'pollo', 'pavo', 'ternera', 'cerdo', 'jamon', 'jamón', 'chorizo', 'lomo'],
  fish: ['pescado', 'marisco', 'atun', 'atún', 'salmon', 'salmón', 'merluza', 'bacalao', 'sardina', 'gamba'],
  eggs: ['huevo', 'huevos'],
  dairy: ['lacteo', 'lácteo', 'queso', 'yogur', 'leche', 'nata', 'mantequilla', 'mozzarella'],
  vegetables: ['verdura', 'hortaliza', 'espinaca', 'brocoli', 'brócoli', 'lechuga', 'calabacin', 'calabacín', 'tomate'],
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
  return CATEGORY_KEYWORDS[category].some(term => haystack.includes(normalizeText(term)))
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
