'use client'
import { useEffect, useState, useCallback } from 'react'

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

type MercadonaResult = {
  id: string
  name: string
  brand: string
  category: string
  ketoScore: number
  mercadonaId: string | null
  unitPrice: number | null
  imageUrl: string | null
  tags: string
}

export default function InventoryPage() {
  const [pantryItems, setPantryItems] = useState<PantryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [mercadonaQuery, setMercadonaQuery] = useState('')
  const [mercadonaResults, setMercadonaResults] = useState<MercadonaResult[]>([])
  const [mercadonaLoading, setMercadonaLoading] = useState(false)
  const [mercadonaSearched, setMercadonaSearched] = useState(false)
  const [addingId, setAddingId] = useState<string | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)

  // Manual add
  const [showManual, setShowManual] = useState(false)
  const [manualName, setManualName] = useState('')

  const fetchPantry = useCallback(async () => {
    const res = await fetch('/api/pantry')
    const data = await res.json()
    setPantryItems(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchPantry() }, [fetchPantry])

  const pantryProductIds = new Set(pantryItems.map(i => i.productId))
  const pantryMercadonaIds = new Set(
    pantryItems.map(i => i.product.mercadonaId).filter(Boolean)
  )

  const handleMercadonaSearch = async () => {
    if (!mercadonaQuery.trim()) return
    setMercadonaLoading(true)
    setMercadonaSearched(true)
    const res = await fetch(`/api/mercadona/search?q=${encodeURIComponent(mercadonaQuery)}`)
    const data = await res.json()
    setMercadonaResults(data.products ?? [])
    setMercadonaLoading(false)
  }

  const handleAddMercadona = async (p: MercadonaResult) => {
    setAddingId(p.id)
    // Save product to DB then add to pantry
    const saved = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: p.name,
        brand: p.brand,
        source: 'mercadona',
        mercadonaId: p.id.replace('mercadona_', ''),
        category: p.category,
        ketoScore: p.ketoScore,
        unitPrice: p.unitPrice,
        imageUrl: p.imageUrl,
      }),
    }).then(r => r.json())

    await fetch('/api/pantry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: saved.id }),
    })
    setAddingId(null)
    await fetchPantry()
  }

  const handleRemoveFromPantry = async (pantryItemId: string) => {
    setRemovingId(pantryItemId)
    await fetch(`/api/pantry/${pantryItemId}`, { method: 'DELETE' })
    setRemovingId(null)
    await fetchPantry()
  }

  const handleAddManual = async () => {
    if (!manualName.trim()) return
    const saved = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: manualName, category: 'other', source: 'manual' }),
    }).then(r => r.json())
    await fetch('/api/pantry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: saved.id }),
    })
    setManualName('')
    setShowManual(false)
    await fetchPantry()
  }

  if (loading) return <div className="p-4 text-gray-500">Cargando...</div>

  return (
    <main className="p-4">
      <div className="flex items-center justify-between pt-4 pb-4">
        <div>
          <h1 className="text-xl font-bold">Mi despensa</h1>
          <p className="text-sm text-gray-400">{pantryItems.length} productos</p>
        </div>
        <button
          onClick={() => setShowManual(!showManual)}
          className="bg-gray-800 hover:bg-gray-700 text-white px-3 py-1.5 rounded-lg text-sm"
        >
          + Manual
        </button>
      </div>

      {/* Manual add */}
      {showManual && (
        <div className="bg-gray-900 rounded-xl p-4 mb-4 flex gap-2">
          <input
            className="flex-1 bg-gray-800 rounded-lg px-3 py-2 text-sm"
            placeholder="Nombre del producto"
            value={manualName}
            onChange={e => setManualName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddManual()}
            autoFocus
          />
          <button onClick={handleAddManual} className="bg-green-700 hover:bg-green-600 rounded-lg px-4 text-sm">
            Añadir
          </button>
        </div>
      )}

      {/* Mercadona search */}
      <div className="bg-gray-900 rounded-xl p-4 mb-6">
        <p className="text-sm font-medium mb-3">🔍 Buscar en Mercadona</p>
        <div className="flex gap-2">
          <input
            className="flex-1 bg-gray-800 rounded-lg px-3 py-2 text-sm"
            placeholder="ej: huevos, salmón, queso..."
            value={mercadonaQuery}
            onChange={e => setMercadonaQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleMercadonaSearch()}
          />
          <button
            onClick={handleMercadonaSearch}
            disabled={mercadonaLoading}
            className="bg-orange-600 hover:bg-orange-500 disabled:opacity-50 rounded-lg px-4 text-sm font-medium"
          >
            {mercadonaLoading ? '...' : 'Buscar'}
          </button>
        </div>

        {mercadonaResults.length > 0 && (
          <div className="mt-3 space-y-2">
            {mercadonaResults.map(p => {
              const mercId = p.id.replace('mercadona_', '')
              const alreadyInPantry = pantryMercadonaIds.has(mercId)
              const pantryItem = pantryItems.find(i => i.product.mercadonaId === mercId)
              return (
                <div key={p.id} className="flex items-center gap-3 bg-gray-800 rounded-xl p-3">
                  {p.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.imageUrl} alt={p.name} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{p.name}</div>
                    <div className="text-xs text-gray-500 flex gap-2 mt-0.5">
                      {p.unitPrice && <span className="text-green-400 font-medium">{p.unitPrice.toFixed(2)}€</span>}
                      <span>keto {p.ketoScore}/5</span>
                    </div>
                  </div>
                  {alreadyInPantry ? (
                    <button
                      onClick={() => pantryItem && handleRemoveFromPantry(pantryItem.id)}
                      disabled={removingId === pantryItem?.id}
                      className="text-green-400 text-xs flex-shrink-0 hover:text-red-400 transition-colors"
                    >
                      ✓ En despensa
                    </button>
                  ) : (
                    <button
                      onClick={() => handleAddMercadona(p)}
                      disabled={addingId === p.id}
                      className="bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white text-xs px-3 py-1.5 rounded-lg flex-shrink-0"
                    >
                      {addingId === p.id ? '...' : '+ Añadir'}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {mercadonaSearched && mercadonaResults.length === 0 && !mercadonaLoading && (
          <p className="text-xs text-gray-600 mt-3 text-center">Sin resultados</p>
        )}
      </div>

      {/* Current pantry */}
      <div>
        <p className="text-sm font-medium text-gray-400 mb-3">En casa</p>
        {pantryItems.length === 0 ? (
          <div className="text-center py-10 text-gray-600">
            <p className="text-3xl mb-2">🧺</p>
            <p className="text-sm">Despensa vacía</p>
            <p className="text-xs mt-1">Busca productos en Mercadona para añadirlos</p>
          </div>
        ) : (
          <div className="space-y-2">
            {pantryItems.map(item => (
              <div key={item.id} className="flex items-center gap-3 bg-gray-900 rounded-xl p-3">
                {item.product.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.product.imageUrl} alt={item.product.name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center text-lg flex-shrink-0">
                    {item.product.category === 'meat' ? '🥩' : item.product.category === 'fish' ? '🐟' : item.product.category === 'eggs' ? '🥚' : item.product.category === 'dairy' ? '🧀' : item.product.category === 'vegetables' ? '🥦' : item.product.category === 'nuts' ? '🌰' : item.product.category === 'oils' ? '🫒' : '🍽️'}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{item.product.name}</div>
                  {item.product.unitPrice && (
                    <div className="text-xs text-gray-500">{item.product.unitPrice.toFixed(2)}€</div>
                  )}
                </div>
                <button
                  onClick={() => handleRemoveFromPantry(item.id)}
                  disabled={removingId === item.id}
                  className="text-gray-600 hover:text-red-400 transition-colors text-lg flex-shrink-0"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
