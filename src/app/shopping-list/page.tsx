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

export default function ShoppingListPage() {
  const [items, setItems] = useState<ShoppingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [newItemName, setNewItemName] = useState('')
  const [adding, setAdding] = useState(false)

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

  const handleAdd = async () => {
    if (!newItemName.trim()) return
    setAdding(true)
    await fetch('/api/shopping-list', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newItemName }),
    })
    setNewItemName('')
    setAdding(false)
    await fetchItems()
  }

  const handleClearChecked = async () => {
    const checkedIds = items.filter(i => i.checked).map(i => i.id)
    await Promise.all(checkedIds.map(id => fetch(`/api/shopping-list/${id}`, { method: 'DELETE' })))
    await fetchItems()
  }

  const unchecked = items.filter(i => !i.checked)
  const checked = items.filter(i => i.checked)
  const totalPrice = items.reduce((sum, i) => sum + (i.product?.unitPrice ?? 0), 0)

  if (loading) return <div className="p-4 text-gray-500">Cargando...</div>

  return (
    <main className="p-4">
      <div className="flex items-center justify-between pt-4 pb-4">
        <div>
          <h1 className="text-xl font-bold">Lista de compra</h1>
          <p className="text-sm text-gray-400">
            {unchecked.length} pendientes
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

      {/* Add item input */}
      <div className="flex gap-2 mb-6">
        <input
          className="flex-1 bg-gray-900 rounded-xl px-4 py-2.5 text-sm"
          placeholder="Añadir producto..."
          value={newItemName}
          onChange={e => setNewItemName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
        />
        <button
          onClick={handleAdd}
          disabled={adding}
          className="bg-green-700 hover:bg-green-600 disabled:opacity-50 rounded-xl px-4 text-sm"
        >
          +
        </button>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-4xl mb-3">🛒</p>
          <p>Lista vacía</p>
          <p className="text-sm mt-1">Las recetas te sugerirán qué comprar</p>
        </div>
      ) : (
        <div className="space-y-2">
          {unchecked.map(item => (
            <ShoppingListItem key={item.id} item={item} onToggle={handleToggle} onDelete={handleDelete} />
          ))}
          {checked.length > 0 && (
            <div className="mt-4">
              <p className="text-xs text-gray-600 mb-2">Comprados</p>
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
