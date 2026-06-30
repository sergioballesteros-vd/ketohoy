'use client'
import { useState, useCallback } from 'react'
import type { MercadonaProduct as MercadonaResult } from '@/lib/mercadona'
import ProductDetailModal from '@/components/ProductDetailModal'

const CATEGORIES = [
  { key: 'meat',       label: 'Carne',        emoji: '🥩' },
  { key: 'fish',       label: 'Pescado',       emoji: '🐟' },
  { key: 'eggs',       label: 'Huevos',        emoji: '🥚' },
  { key: 'dairy',      label: 'Lácteos',       emoji: '🧀' },
  { key: 'vegetables', label: 'Verduras',      emoji: '🥦' },
  { key: 'nuts',       label: 'Frutos secos',  emoji: '🌰' },
  { key: 'oils',       label: 'Aceites',       emoji: '🫒' },
  { key: 'sauces',     label: 'Salsas',        emoji: '🥫' },
]

export default function ExplorePage() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [products, setProducts] = useState<MercadonaResult[]>([])
  const [loading, setLoading] = useState(false)
  const [detailProduct, setDetailProduct] = useState<MercadonaResult | null>(null)

  const fetchCategory = useCallback(async (key: string) => {
    if (selectedCategory === key) { setSelectedCategory(null); setProducts([]); return }
    setSelectedCategory(key)
    setLoading(true)
    const res = await fetch(`/api/mercadona/category/${key}`)
    const data = await res.json()
    setProducts(data.products ?? [])
    setLoading(false)
  }, [selectedCategory])

  const handleAddToPantry = async (p: MercadonaResult) => {
    await fetch('/api/mercadona/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mercadonaId: p.id.replace('mercadona_', ''), addToPantry: true }),
    })
  }

  const handleAddToCart = async (p: MercadonaResult) => {
    await fetch('/api/mercadona/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mercadonaId: p.id.replace('mercadona_', ''), addToShoppingList: true }),
    })
  }

  return (
    <main className="px-4 pt-4 pb-4">
      <ProductDetailModal
        product={detailProduct}
        onClose={() => setDetailProduct(null)}
        onAddToPantry={detailProduct ? () => handleAddToPantry(detailProduct) : undefined}
        onAddToShoppingList={detailProduct ? () => handleAddToCart(detailProduct) : undefined}
      />

      <div className="pt-2 pb-5">
        <h1 className="text-2xl font-bold" style={{ fontFamily: 'Syne, sans-serif', color: '#ecf5e0' }}>
          Explorar Mercadona
        </h1>
        <p className="text-sm mt-0.5" style={{ color: '#547856' }}>Navega por categoría</p>
      </div>

      {/* Category grid */}
      <div className="grid grid-cols-4 gap-2 mb-6">
        {CATEGORIES.map(cat => (
          <button
            key={cat.key}
            onClick={() => fetchCategory(cat.key)}
            className="rounded-2xl p-3 text-center transition-all"
            style={selectedCategory === cat.key
              ? { background: '#a3e635', color: '#060e07' }
              : { background: '#142514', border: '1px solid #1c321d', color: '#ecf5e0' }
            }
          >
            <div className="text-2xl mb-1">{cat.emoji}</div>
            <div className="text-xs font-medium leading-tight">{cat.label}</div>
          </button>
        ))}
      </div>

      {/* Results */}
      {loading && (
        <div className="space-y-2">
          {[1,2,3].map(i => <div key={i} className="rounded-xl h-16 animate-pulse" style={{ background: '#142514' }} />)}
        </div>
      )}

      {!loading && products.length > 0 && (
        <div className="space-y-2">
          {products.map(p => (
            <div
              key={p.id}
              className="flex items-center gap-3 rounded-xl p-3 cursor-pointer"
              style={{ background: '#142514', border: '1px solid #1c321d' }}
              onClick={() => setDetailProduct(p)}
            >
              {p.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.imageUrl} alt={p.name} className="w-10 h-10 rounded-xl object-cover flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate" style={{ color: '#ecf5e0' }}>{p.name}</div>
                <div className="text-xs flex gap-2 mt-0.5">
                  {p.unitPrice && <span style={{ color: '#f59e0b' }}>{p.unitPrice.toFixed(2)}€</span>}
                  <span style={{ color: '#547856' }}>keto {p.ketoScore}/5</span>
                </div>
              </div>
              <span style={{ color: '#3b5e3c' }}>›</span>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}
