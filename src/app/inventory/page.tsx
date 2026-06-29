'use client'
import { useEffect, useState, useCallback } from 'react'
import ProductCard from '@/components/ProductCard'

type Product = {
  id: string
  name: string
  brand: string | null
  category: string
  ketoScore: number
  source: string
  mercadonaId: string | null
  unitPrice: number | null
  imageUrl: string | null
  tags: string
}

type PantryItem = {
  id: string
  productId: string
  product: Product
}

const CATEGORIES = [
  { value: '', label: 'Todos' },
  { value: 'meat', label: '🥩 Carne' },
  { value: 'fish', label: '🐟 Pescado' },
  { value: 'eggs', label: '🥚 Huevos' },
  { value: 'dairy', label: '🧀 Lácteos' },
  { value: 'vegetables', label: '🥦 Verduras' },
  { value: 'nuts', label: '🌰 Frutos secos' },
  { value: 'oils', label: '🫒 Aceites' },
  { value: 'other', label: '🍽️ Otros' },
]

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [pantryItems, setPantryItems] = useState<PantryItem[]>([])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [mercadonaQuery, setMercadonaQuery] = useState('')
  const [mercadonaResults, setMercadonaResults] = useState<Product[]>([])
  const [mercadonaLoading, setMercadonaLoading] = useState(false)
  const [newProductName, setNewProductName] = useState('')
  const [newProductCategory, setNewProductCategory] = useState('meat')

  const fetchAll = useCallback(async () => {
    const [prods, pantry] = await Promise.all([
      fetch('/api/products').then(r => r.json()),
      fetch('/api/pantry').then(r => r.json()),
    ])
    setProducts(Array.isArray(prods) ? prods : [])
    setPantryItems(Array.isArray(pantry) ? pantry : [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const pantryProductIds = new Set(pantryItems.map(i => i.productId))
  const pantryMap = new Map(pantryItems.map(i => [i.productId, i.id]))

  const handleToggle = async (productId: string, pantryItemId?: string) => {
    if (pantryProductIds.has(productId) && pantryItemId) {
      await fetch(`/api/pantry/${pantryItemId}`, { method: 'DELETE' })
    } else {
      await fetch('/api/pantry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId }),
      })
    }
    await fetchAll()
  }

  const handleMercadonaSearch = async () => {
    if (!mercadonaQuery.trim()) return
    setMercadonaLoading(true)
    const res = await fetch(`/api/mercadona/search?q=${encodeURIComponent(mercadonaQuery)}`)
    const data = await res.json()
    setMercadonaResults(data.products ?? [])
    setMercadonaLoading(false)
  }

  // Save Mercadona product to DB then add to pantry
  const handleAddMercadona = async (product: Product) => {
    // 1. Save product to DB (upsert by mercadonaId)
    const saved = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: product.name,
        brand: product.brand,
        source: 'mercadona',
        mercadonaId: product.id.replace('mercadona_', ''),
        category: product.category,
        ketoScore: product.ketoScore,
        unitPrice: product.unitPrice,
        imageUrl: product.imageUrl,
      }),
    }).then(r => r.json())

    // 2. Add to pantry using real DB id
    await fetch('/api/pantry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: saved.id }),
    })
    await fetchAll()
  }

  const handleAddManual = async () => {
    if (!newProductName.trim()) return
    await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newProductName, category: newProductCategory }),
    })
    setNewProductName('')
    setShowAddForm(false)
    await fetchAll()
  }

  const filtered = products.filter(p => {
    const matchesSearch = !search || p.name.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = !category || p.category === category
    return matchesSearch && matchesCategory
  })

  const inPantryCount = products.filter(p => pantryProductIds.has(p.id)).length

  if (loading) return <div className="p-4 text-gray-500">Cargando...</div>

  return (
    <main className="p-4">
      <div className="flex items-center justify-between pt-4 pb-4">
        <div>
          <h1 className="text-xl font-bold">Mi despensa</h1>
          <p className="text-sm text-gray-400">{inPantryCount} de {products.length} productos</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-green-700 hover:bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm"
        >
          + Añadir
        </button>
      </div>

      {/* Add manual form */}
      {showAddForm && (
        <div className="bg-gray-900 rounded-xl p-4 mb-4 space-y-3">
          <h3 className="font-medium">Añadir producto manual</h3>
          <input
            className="w-full bg-gray-800 rounded-lg px-3 py-2 text-sm"
            placeholder="Nombre del producto"
            value={newProductName}
            onChange={e => setNewProductName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddManual()}
          />
          <select
            className="w-full bg-gray-800 rounded-lg px-3 py-2 text-sm"
            value={newProductCategory}
            onChange={e => setNewProductCategory(e.target.value)}
          >
            {CATEGORIES.filter(c => c.value).map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          <div className="flex gap-2">
            <button onClick={handleAddManual} className="flex-1 bg-green-700 hover:bg-green-600 rounded-lg py-2 text-sm">
              Añadir
            </button>
            <button onClick={() => setShowAddForm(false)} className="flex-1 bg-gray-800 rounded-lg py-2 text-sm">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Mercadona search */}
      <div className="bg-gray-900 rounded-xl p-3 mb-4">
        <p className="text-xs text-gray-500 mb-2">Buscar en Mercadona (requiere mercadona-cli)</p>
        <div className="flex gap-2">
          <input
            className="flex-1 bg-gray-800 rounded-lg px-3 py-2 text-sm"
            placeholder="ej: queso, salmón..."
            value={mercadonaQuery}
            onChange={e => setMercadonaQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleMercadonaSearch()}
          />
          <button
            onClick={handleMercadonaSearch}
            disabled={mercadonaLoading}
            className="bg-orange-700 hover:bg-orange-600 disabled:opacity-50 rounded-lg px-3 text-sm"
          >
            {mercadonaLoading ? '...' : 'Buscar'}
          </button>
        </div>
        {mercadonaResults.length > 0 && (
          <div className="mt-3 space-y-2">
            {mercadonaResults.map(p => {
              const mercadonaId = p.id.replace('mercadona_', '')
              const alreadyAdded = products.some(prod => prod.mercadonaId === mercadonaId)
              const inPantry = alreadyAdded && pantryProductIds.has(
                products.find(prod => prod.mercadonaId === mercadonaId)?.id ?? ''
              )
              return (
                <div key={p.id} className="flex items-center gap-3 bg-gray-800 rounded-xl p-3">
                  {p.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.imageUrl} alt={p.name} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{p.name}</div>
                    <div className="text-xs text-gray-500 flex gap-2 mt-0.5">
                      <span>keto {p.ketoScore}/5</span>
                      {p.unitPrice && <span>{p.unitPrice.toFixed(2)}€</span>}
                    </div>
                  </div>
                  {inPantry ? (
                    <span className="text-green-400 text-sm flex-shrink-0">✓ En despensa</span>
                  ) : (
                    <button
                      onClick={() => handleAddMercadona(p)}
                      className="bg-green-700 hover:bg-green-600 text-white text-xs px-3 py-1.5 rounded-lg flex-shrink-0"
                    >
                      + Añadir
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
        {mercadonaResults.length === 0 && mercadonaQuery && !mercadonaLoading && (
          <p className="text-xs text-gray-600 mt-2">Sin resultados (¿está mercadona-cli instalado?)</p>
        )}
      </div>

      {/* Search + category filter */}
      <input
        className="w-full bg-gray-900 rounded-xl px-4 py-3 mb-3 text-sm"
        placeholder="🔍 Buscar producto..."
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
        {CATEGORIES.map(c => (
          <button
            key={c.value}
            onClick={() => setCategory(c.value)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs transition-colors ${
              category === c.value
                ? 'bg-green-700 text-white'
                : 'bg-gray-900 text-gray-400 hover:bg-gray-800'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Product grid */}
      <div className="grid grid-cols-1 gap-2">
        {filtered.map(product => (
          <ProductCard
            key={product.id}
            product={product}
            inPantry={pantryProductIds.has(product.id)}
            pantryItemId={pantryMap.get(product.id)}
            onToggle={handleToggle}
          />
        ))}
        {filtered.length === 0 && (
          <p className="text-gray-500 text-center py-8">Sin productos {search && `para "${search}"`}</p>
        )}
      </div>
    </main>
  )
}
