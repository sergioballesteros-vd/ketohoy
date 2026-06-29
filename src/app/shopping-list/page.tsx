'use client'
import { useEffect, useState, useCallback } from 'react'
import ShoppingListItem from '@/components/ShoppingListItem'

type ShoppingItem = {
  id: string
  name: string
  quantity: string | null
  checked: boolean
  reason: string | null
  product: { unitPrice: number | null; category: string } | null
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

export default function ShoppingListPage() {
  const [items, setItems] = useState<ShoppingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [newItemName, setNewItemName] = useState('')

  // Mercadona search
  const [mercadonaQuery, setMercadonaQuery] = useState('')
  const [mercadonaResults, setMercadonaResults] = useState<MercadonaResult[]>([])
  const [mercadonaLoading, setMercadonaLoading] = useState(false)
  const [mercadonaSearched, setMercadonaSearched] = useState(false)
  const [addingId, setAddingId] = useState<string | null>(null)

  const fetchItems = useCallback(async () => {
    const res = await fetch('/api/shopping-list')
    const data = await res.json()
    setItems(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchItems() }, [fetchItems])

  const handleToggle = async (id: string) => {
    await fetch(`/api/shopping-list/${id}/check`, { method: 'PATCH' })
    await fetchItems()
  }

  const handleDelete = async (id: string) => {
    await fetch(`/api/shopping-list/${id}`, { method: 'DELETE' })
    await fetchItems()
  }

  const handleAddManual = async () => {
    if (!newItemName.trim()) return
    await fetch('/api/shopping-list', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newItemName }),
    })
    setNewItemName('')
    await fetchItems()
  }

  const handleClearChecked = async () => {
    const checkedIds = items.filter(i => i.checked).map(i => i.id)
    await Promise.all(checkedIds.map(id => fetch(`/api/shopping-list/${id}`, { method: 'DELETE' })))
    await fetchItems()
  }

  const handleMercadonaSearch = async () => {
    if (!mercadonaQuery.trim()) return
    setMercadonaLoading(true)
    setMercadonaSearched(true)
    const res = await fetch(`/api/mercadona/search?q=${encodeURIComponent(mercadonaQuery)}`)
    const data = await res.json()
    setMercadonaResults(data.products ?? [])
    setMercadonaLoading(false)
  }

  const handleAddMercadonaToCart = async (p: MercadonaResult) => {
    setAddingId(p.id)
    // Save product to DB first (upsert), then add to shopping list
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

    await fetch('/api/shopping-list', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: p.name,
        productId: saved.id,
        quantity: null,
      }),
    })
    setAddingId(null)
    setMercadonaResults([])
    setMercadonaQuery('')
    setMercadonaSearched(false)
    await fetchItems()
  }

  const unchecked = items.filter(i => !i.checked)
  const checked = items.filter(i => i.checked)
  const totalPrice = unchecked.reduce((sum, i) => sum + (i.product?.unitPrice ?? 0), 0)

  if (loading) return <div className="p-4 text-gray-500">Cargando...</div>

  return (
    <main className="p-4">
      <div className="flex items-center justify-between pt-4 pb-4">
        <div>
          <h1 className="text-xl font-bold">Lista de compra</h1>
          <p className="text-sm text-gray-400">
            {unchecked.length} {unchecked.length === 1 ? 'pendiente' : 'pendientes'}
            {totalPrice > 0 && ` · ~${totalPrice.toFixed(2)}€`}
          </p>
        </div>
        {checked.length > 0 && (
          <button
            onClick={handleClearChecked}
            className="text-xs text-gray-500 hover:text-red-400 transition-colors"
          >
            Limpiar comprados
          </button>
        )}
      </div>

      {/* Mercadona search */}
      <div className="bg-gray-900 rounded-xl p-4 mb-4">
        <p className="text-sm font-medium mb-3">🔍 Buscar en Mercadona</p>
        <div className="flex gap-2">
          <input
            className="flex-1 bg-gray-800 rounded-lg px-3 py-2 text-sm"
            placeholder="ej: leche, pan, yogur..."
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
            {mercadonaResults.map(p => (
              <div key={p.id} className="flex items-center gap-3 bg-gray-800 rounded-xl p-3">
                {p.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.imageUrl} alt={p.name} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{p.name}</div>
                  <div className="text-xs flex gap-2 mt-0.5">
                    {p.unitPrice && <span className="text-green-400 font-medium">{p.unitPrice.toFixed(2)}€</span>}
                    <span className="text-gray-500">keto {p.ketoScore}/5</span>
                  </div>
                </div>
                <button
                  onClick={() => handleAddMercadonaToCart(p)}
                  disabled={addingId === p.id}
                  className="bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white text-xs px-3 py-1.5 rounded-lg flex-shrink-0"
                >
                  {addingId === p.id ? '...' : '+ Carrito'}
                </button>
              </div>
            ))}
          </div>
        )}

        {mercadonaSearched && mercadonaResults.length === 0 && !mercadonaLoading && (
          <p className="text-xs text-gray-600 mt-3 text-center">Sin resultados</p>
        )}
      </div>

      {/* Manual add */}
      <div className="flex gap-2 mb-6">
        <input
          className="flex-1 bg-gray-900 rounded-xl px-4 py-2.5 text-sm"
          placeholder="Añadir producto manual..."
          value={newItemName}
          onChange={e => setNewItemName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAddManual()}
        />
        <button
          onClick={handleAddManual}
          className="bg-green-700 hover:bg-green-600 rounded-xl px-4 text-sm"
        >
          +
        </button>
      </div>

      {/* List */}
      {items.length === 0 ? (
        <div className="text-center py-10 text-gray-600">
          <p className="text-3xl mb-2">🛒</p>
          <p className="text-sm">Lista vacía</p>
          <p className="text-xs mt-1">Busca en Mercadona o añade productos manualmente</p>
        </div>
      ) : (
        <div className="space-y-2">
          {unchecked.map(item => (
            <ShoppingListItem key={item.id} item={item} onToggle={handleToggle} onDelete={handleDelete} />
          ))}
          {checked.length > 0 && (
            <div className="mt-4">
              <p className="text-xs text-gray-600 mb-2">Comprados → pasan a despensa</p>
              {checked.map(item => (
                <ShoppingListItem key={item.id} item={item} onToggle={handleToggle} onDelete={handleDelete} />
              ))}
            </div>
          )}
        </div>
      )}
    </main>
  )
}
