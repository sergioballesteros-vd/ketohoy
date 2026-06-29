import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

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
    return normalizeMercadonaProducts(raw)
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

function normalizeMercadonaProducts(raw: unknown[]): MercadonaProduct[] {
  return raw
    .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
    .map(item => ({
      id: `mercadona_${item['id']}`,
      name: String(item['name'] ?? ''),
      brand: String(item['brand'] ?? 'Mercadona'),
      source: 'mercadona' as const,
      mercadonaId: String(item['id'] ?? ''),
      category: mapMercadonaCategory(String(item['category'] ?? '')),
      ketoScore: 2, // unknown until manual review
      unitPrice: typeof item['price'] === 'number' ? item['price'] : null,
      referencePrice: item['reference_price'] ? String(item['reference_price']) : null,
      imageUrl: item['thumbnail'] ? String(item['thumbnail']) : null,
      tags: '[]',
    }))
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
