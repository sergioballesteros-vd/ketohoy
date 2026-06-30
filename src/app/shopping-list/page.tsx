'use client'
import { useEffect, useState, useCallback } from 'react'
import ShoppingListItem from '@/components/ShoppingListItem'
import type { MercadonaProduct as MercadonaResult } from '@/lib/mercadona'

type ShoppingItem = {
  id: string
  name: string
  quantity: string | null
  checked: boolean
  reason: string | null
  product: { unitPrice: number | null; category: string } | null
}

export default function ShoppingListPage() {
  const [items, setItems] = useState<ShoppingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newItemName, setNewItemName] = useState('')

  // Mercadona search
  const [mercadonaQuery, setMercadonaQuery] = useState('')
  const [mercadonaResults, setMercadonaResults] = useState<MercadonaResult[]>([])
  const [mercadonaLoading, setMercadonaLoading] = useState(false)
  const [mercadonaSearched, setMercadonaSearched] = useState(false)
  const [addingId, setAddingId] = useState<string | null>(null)

  const fetchItems = useCallback(async () => {
    try {
      const res = await fetch('/api/shopping-list')
      if (!res.ok) throw new Error('Error cargando lista')
      const data = await res.json()
      setItems(Array.isArray(data) ? data : [])
      setError(null)
    } catch {
      setError('Error cargando la lista de compra')
    } finally {
      setLoading(false)
    }
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
    if (checkedIds.length === 0) return
    await fetch('/api/shopping-list', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: checkedIds }),
    })
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
    await fetch('/api/mercadona/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mercadonaId: p.id.replace('mercadona_', ''),
        addToShoppingList: true,
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

  if (loading) return <div className="p-4" style={{ color: '#547856' }}>Cargando...</div>

  return (
    <main className="px-4 pt-4 pb-4">
      <div className="flex items-center justify-between pt-2 pb-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'Syne, sans-serif', color: '#ecf5e0' }}>
            Lista de compra
          </h1>
          <p className="text-sm mt-0.5" style={{ color: '#547856' }}>
            {unchecked.length} {unchecked.length === 1 ? 'pendiente' : 'pendientes'}
            {totalPrice > 0 && <span style={{ color: '#f59e0b' }}> · ~{totalPrice.toFixed(2)}€</span>}
          </p>
        </div>
        {checked.length > 0 && (
          <button
            onClick={handleClearChecked}
            className="text-xs font-medium transition-colors"
            style={{ color: '#3b5e3c' }}
            onMouseEnter={e => { (e.target as HTMLElement).style.color = '#ef4444' }}
            onMouseLeave={e => { (e.target as HTMLElement).style.color = '#3b5e3c' }}
          >
            Limpiar comprados
          </button>
        )}
      </div>

      {/* Mercadona search */}
      <div className="rounded-2xl p-4 mb-4" style={{ background: '#142514', border: '1px solid #1c321d' }}>
        <p className="text-sm font-semibold mb-3" style={{ color: '#ecf5e0' }}>🔍 Buscar en Mercadona</p>
        <div className="flex gap-2">
          <input
            className="flex-1 rounded-xl px-3 py-2 text-sm outline-none"
            style={{ background: '#1c321d', color: '#ecf5e0' }}
            placeholder="ej: leche, pan, yogur..."
            value={mercadonaQuery}
            onChange={e => setMercadonaQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !mercadonaLoading && handleMercadonaSearch()}
          />
          <button
            onClick={handleMercadonaSearch}
            disabled={mercadonaLoading}
            className="rounded-xl px-4 text-sm font-semibold disabled:opacity-50"
            style={{ background: '#f97316', color: '#fff' }}
          >
            {mercadonaLoading ? '...' : 'Buscar'}
          </button>
        </div>

        {mercadonaResults.length > 0 && (
          <div className="mt-3 space-y-2">
            {mercadonaResults.map(p => (
              <div key={p.id} className="flex items-center gap-3 rounded-xl p-3" style={{ background: '#1c321d' }}>
                {p.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.imageUrl} alt={p.name} className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate" style={{ color: '#ecf5e0' }}>{p.name}</div>
                  <div className="text-xs flex gap-2 mt-0.5">
                    {p.unitPrice && <span className="font-medium" style={{ color: '#f59e0b' }}>{p.unitPrice.toFixed(2)}€</span>}
                    <span style={{ color: '#547856' }}>keto {p.ketoScore}/5</span>
                  </div>
                </div>
                <button
                  onClick={() => handleAddMercadonaToCart(p)}
                  disabled={addingId === p.id}
                  className="text-xs px-3 py-1.5 rounded-xl flex-shrink-0 font-semibold disabled:opacity-50"
                  style={{ background: '#f97316', color: '#fff' }}
                >
                  {addingId === p.id ? '...' : '+ Carrito'}
                </button>
              </div>
            ))}
          </div>
        )}

        {mercadonaSearched && mercadonaResults.length === 0 && !mercadonaLoading && (
          <p className="text-xs mt-3 text-center" style={{ color: '#264227' }}>Sin resultados</p>
        )}
      </div>

      {/* Manual add */}
      <div className="flex gap-2 mb-5">
        <input
          className="flex-1 rounded-xl px-4 py-2.5 text-sm outline-none"
          style={{ background: '#142514', color: '#ecf5e0', border: '1px solid #1c321d' }}
          placeholder="Añadir producto manual..."
          value={newItemName}
          onChange={e => setNewItemName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAddManual()}
        />
        <button
          onClick={handleAddManual}
          className="rounded-xl px-4 text-sm font-bold"
          style={{ background: '#a3e635', color: '#060e07' }}
        >
          +
        </button>
      </div>

      {error && <p className="text-sm text-center py-4" style={{ color: '#ef4444' }}>{error}</p>}

      {/* List */}
      {items.length === 0 ? (
        <div className="text-center py-14">
          <p className="text-5xl mb-4">🛒</p>
          <p className="font-semibold" style={{ color: '#547856' }}>Lista vacía</p>
          <p className="text-sm mt-1" style={{ color: '#3b5e3c' }}>Busca en Mercadona o añade manualmente</p>
        </div>
      ) : (
        <div className="space-y-2">
          {unchecked.map(item => (
            <ShoppingListItem key={item.id} item={item} onToggle={handleToggle} onDelete={handleDelete} />
          ))}
          {checked.length > 0 && (
            <div className="mt-5">
              <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#264227' }}>
                Ya en el carrito
              </p>
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
