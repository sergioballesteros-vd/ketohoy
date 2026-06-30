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

async function isMercadonaCliAvailable(): Promise<boolean> {
  try {
    await execFileAsync('mercadona', ['--version'], { timeout: 3000 })
    return true
  } catch {
    return false
  }
}

export async function searchMercadonaProducts(query: string): Promise<MercadonaProduct[]> {
  const available = await isMercadonaCliAvailable()
  if (!available) return []

  try {
    const { stdout } = await execFileAsync(
      'mercadona',
      ['search', '--limit', '10', '--json', query],
      { timeout: 10000 }
    )
    const raw = JSON.parse(stdout)
    // CLI returns { query, nbHits, hits: [...] }
    const hits = Array.isArray(raw.hits) ? raw.hits : Array.isArray(raw) ? raw : []
    return normalizeMercadonaProducts(hits)
  } catch {
    return []
  }
}

export async function getMercadonaProduct(id: string): Promise<MercadonaProduct | null> {
  const available = await isMercadonaCliAvailable()
  if (!available) return null

  try {
    const { stdout } = await execFileAsync(
      'mercadona',
      ['product', id, '--json'],
      { timeout: 10000 }
    )
    const raw = JSON.parse(stdout)
    const [product] = normalizeMercadonaProducts([raw])
    return product ?? null
  } catch {
    return null
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
  const lower = raw.toLowerCase()
  if (lower.includes('carne') || lower.includes('pollo') || lower.includes('pavo')) return 'meat'
  if (lower.includes('pescado') || lower.includes('marisco')) return 'fish'
  if (lower.includes('huevo')) return 'eggs'
  if (lower.includes('lácteo') || lower.includes('queso') || lower.includes('yogur')) return 'dairy'
  if (lower.includes('fruta') || lower.includes('verdura') || lower.includes('hortaliza')) return 'vegetables'
  if (lower.includes('fruto seco') || lower.includes('nuez') || lower.includes('almendra')) return 'nuts'
  if (lower.includes('aceite') || lower.includes('vinagre')) return 'oils'
  if (lower.includes('salsa') || lower.includes('condimento')) return 'sauces'
  if (lower.includes('bebida') || lower.includes('agua') || lower.includes('zumo')) return 'drinks'
  return 'other'
}
