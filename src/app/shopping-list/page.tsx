'use client'
import Image from 'next/image'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { Check, ChefHat, Compass, Minus, Plus, ShoppingBasket, Trash2 } from 'lucide-react'
import AddProductSheet from '@/components/AddProductSheet'
import { useToast } from '@/components/Toast'
import { Skeleton, focusRing } from '@/components/ui'
import { parseShoppingQuantity } from '@/lib/shoppingList'
import { pluralize } from '@/lib/pluralize'
import { apiFetch } from '@/lib/apiFetch'

type ShoppingItem = {
  id: string
  name: string
  quantity: string | null
  checked: boolean
  reason: string | null
  productId: string | null
  product: { mercadonaId: string | null; unitPrice: number | null; imageUrl: string | null } | null
}

const JSON_HEADERS = { 'Content-Type': 'application/json' }
const euros = (n: number) => `${n.toFixed(2).replace('.', ',')} €`

async function loadShoppingListItems(): Promise<ShoppingItem[]> {
  const res = await apiFetch('/api/shopping-list')
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json()
  return Array.isArray(data) ? data : []
}

const LEAVE_MS = 140
const isNumeric = (q: string | null) => q != null && q.trim() !== '' && Number.isFinite(Number(q))

export default function ShoppingListPage() {
  const [items, setItems] = useState<ShoppingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [adding, setAdding] = useState<null | 'search' | 'manual'>(null)
  const [leaving, setLeaving] = useState<Set<string>>(new Set())
  const { toast, show } = useToast()

  const refresh = useCallback(async () => {
    try {
      setItems(await loadShoppingListItems())
      setError(null)
    } catch {
      setError('No se pudo cargar la lista de compra')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void (async () => {
      await refresh()
    })()
  }, [refresh])

  const pending = items.filter(i => !i.checked)
  const bought = items.filter(i => i.checked)
  const total = pending.reduce((sum, i) => sum + (i.product?.unitPrice ?? 0) * parseShoppingQuantity(i.quantity, 1), 0)

  const owned: Record<string, number> = {}
  for (const i of pending) if (i.product?.mercadonaId) owned[i.product.mercadonaId] = parseShoppingQuantity(i.quantity, 1)

  // Plays the exit (opacity/transform) before the row leaves the list; the request is not delayed.
  const leave = async (id: string) => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    setLeaving(s => new Set(s).add(id))
    await new Promise(r => setTimeout(r, LEAVE_MS))
  }

  const request = async (url: string, init?: RequestInit) => {
    const res = await apiFetch(url, init)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
  }

  // Buying moves the item into the pantry on the server (see pantryTransfer). Optimistic so the tick feels instant.
  const toggle = async (item: ShoppingItem) => {
    setItems(list => list.map(i => (i.id === item.id ? { ...i, checked: !i.checked } : i)))
    try {
      await request(`/api/shopping-list/${item.id}/check`, { method: 'PATCH' })
      show(item.checked ? `${item.name} vuelve a la lista` : `${item.name} está en tu despensa`, item.checked ? undefined : { label: 'Ver', href: '/inventory' })
    } catch {
      show('No se pudo actualizar el producto')
    }
    await refresh()
  }

  const change = async (item: ShoppingItem, delta: number) => {
    const next = parseShoppingQuantity(item.quantity, 1) + delta
    const req = request(`/api/shopping-list/${item.id}/quantity`, { method: 'PATCH', headers: JSON_HEADERS, body: JSON.stringify({ delta }) })
    if (next <= 0) await leave(item.id)
    setItems(list => (next <= 0 ? list.filter(i => i.id !== item.id) : list.map(i => (i.id === item.id ? { ...i, quantity: String(next) } : i))))
    try {
      await req
      if (next <= 0) undoable(item)
    } catch {
      show('No se pudo cambiar la cantidad')
    }
    await refresh()
  }

  const remove = async (item: ShoppingItem) => {
    const req = request(`/api/shopping-list/${item.id}`, { method: 'DELETE' })
    await leave(item.id)
    setItems(list => list.filter(i => i.id !== item.id))
    try {
      await req
      undoable(item)
    } catch {
      show('No se pudo eliminar el producto')
    }
    await refresh()
  }

  // Removing is instant but reversible: the toast re-creates the item with the same data.
  const undoable = (item: ShoppingItem) =>
    show(`${item.name} eliminado`, {
      label: 'Deshacer',
      run: () =>
        void (async () => {
          await apiFetch('/api/shopping-list', {
            method: 'POST',
            headers: JSON_HEADERS,
            body: JSON.stringify({ name: item.name, quantity: item.quantity ?? 1, productId: item.productId, reason: item.reason }),
          })
          await refresh()
        })(),
    })

  // Bought items are already in the pantry; this only tidies the list.
  const clearBought = async () => {
    try {
      await request('/api/shopping-list', { method: 'DELETE', headers: JSON_HEADERS, body: JSON.stringify({ ids: bought.map(i => i.id) }) })
    } catch {
      show('No se pudo limpiar la lista')
    }
    await refresh()
  }

  return (
    <main className="min-h-screen px-4 pt-[calc(env(safe-area-inset-top)+1rem)]">
      <header className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h1 className="text-xl min-[360px]:text-2xl font-bold text-forest-50">Lista de compra</h1>
          <p className="mt-0.5 text-sm text-forest-300">
            {loading ? ' ' : <span key={pending.length} className="tick inline-block">{`${pending.length} ${pluralize(pending.length, 'pendiente', 'pendientes')}`}</span>}
            {total > 0 && <span> · <span key={total} className="tick inline-block">{euros(total)}</span></span>}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAdding('search')}
          className={`relative hit-area inline-flex h-10 items-center gap-1.5 rounded-full bg-[#a3e635] px-4 text-sm font-bold text-forest-950 ${focusRing}`}
        >
          <Plus size={16} strokeWidth={3} /> Añadir
        </button>
      </header>

      {error && (
        <p role="alert" className="mb-4 rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}{' '}
          <button type="button" onClick={() => void refresh()} className="font-semibold underline">
            Reintentar
          </button>
        </p>
      )}

      {loading ? (
        <div className="space-y-3" aria-busy="true">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-14" />
          ))}
        </div>
      ) : (
        <>
          {pending.length > 0 ? (
            <ul className="divide-y divide-forest-800">
              {pending.map(item => {
                const qty = parseShoppingQuantity(item.quantity, 1)
                const price = item.product?.unitPrice
                return (
                  <li key={item.id} className={`enter flex min-h-16 items-center gap-2 py-1.5 ${leaving.has(item.id) ? 'leaving' : ''}`}>
                    <button
                      type="button"
                      onClick={() => void toggle(item)}
                      aria-label={`Marcar ${item.name} como comprado`}
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${focusRing}`}
                    >
                      <span className="h-6 w-6 rounded-full border-2 border-forest-400" />
                    </button>
                    <span className={`relative h-10 w-10 shrink-0 overflow-hidden rounded-lg ${item.product?.imageUrl ? 'bg-white' : 'bg-forest-800'}`}>
                      {item.product?.imageUrl ? (
                        <Image src={item.product.imageUrl} alt="" fill sizes="40px" className="object-cover" />
                      ) : (
                        <ShoppingBasket className="absolute inset-0 m-auto text-forest-300" size={18} strokeWidth={1.5} />
                      )}
                    </span>
                    <span className="min-w-0 flex-1 pl-1">
                      <span className="line-clamp-2 text-[15px] leading-snug font-medium text-forest-50">{item.name}</span>
                      {(price != null || item.reason) && (
                        <span className="mt-0.5 block truncate text-xs text-forest-300">
                          {price != null ? (qty > 1 ? `${euros(price * qty)} · ${euros(price)} c/u` : euros(price)) : item.reason}
                        </span>
                      )}
                    </span>
                    {isNumeric(item.quantity) ? (
                      <span className="flex shrink-0 items-center rounded-full bg-forest-800">
                        <button
                          type="button"
                          onClick={() => void change(item, -1)}
                          aria-label={qty <= 1 ? `Quitar ${item.name} de la lista` : `Reducir cantidad de ${item.name}`}
                          className={`flex h-11 w-10 items-center justify-center rounded-full text-forest-50 ${focusRing}`}
                        >
                          {qty <= 1 ? <Trash2 size={16} className="text-red-300" /> : <Minus size={16} />}
                        </button>
                        <span className="min-w-5 text-center text-sm font-bold text-forest-50" aria-live="polite">
                          <span key={item.quantity} className="tick inline-block">{item.quantity}</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => void change(item, 1)}
                          aria-label={`Aumentar cantidad de ${item.name}`}
                          className={`flex h-11 w-10 items-center justify-center rounded-full text-[#a3e635] ${focusRing}`}
                        >
                          <Plus size={16} />
                        </button>
                      </span>
                    ) : (
                      <>
                        {item.quantity && <span className="shrink-0 text-sm text-forest-200">{item.quantity}</span>}
                        <button
                          type="button"
                          onClick={() => void remove(item)}
                          aria-label={`Quitar ${item.name} de la lista`}
                          className={`relative hit-area flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-forest-400 hover:text-red-300 ${focusRing}`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                  </li>
                )
              })}
            </ul>
          ) : (
            !error && (
              <div className="py-10 text-center">
                <ShoppingBasket size={36} strokeWidth={1.5} className="mx-auto mb-3 text-forest-500" />
                <p className="font-medium text-forest-50">{bought.length > 0 ? 'Todo comprado' : 'Lista vacía'}</p>
                <p className="mt-1 text-sm text-forest-300">
                  {bought.length > 0 ? 'Lo que has comprado ya está en tu despensa.' : 'No tienes productos pendientes.'}
                </p>
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                  <Link
                    href="/explore"
                    className={`inline-flex h-11 items-center gap-2 rounded-full bg-[#a3e635] px-5 text-sm font-bold text-forest-950 ${focusRing}`}
                  >
                    <Compass size={16} /> Explorar productos
                  </Link>
                  <Link
                    href="/meals"
                    className={`inline-flex h-11 items-center gap-2 rounded-full bg-forest-800 px-5 text-sm font-semibold text-forest-50 hover:bg-forest-700 ${focusRing}`}
                  >
                    <ChefHat size={16} /> Ver recetas
                  </Link>
                  <button
                    type="button"
                    onClick={() => setAdding('manual')}
                    className={`inline-flex h-11 items-center gap-2 rounded-full bg-forest-800 px-5 text-sm font-semibold text-forest-50 hover:bg-forest-700 ${focusRing}`}
                  >
                    <Plus size={16} /> Añadir manualmente
                  </button>
                </div>
              </div>
            )
          )}

          {bought.length > 0 && (
            <section className="mt-6" aria-label="Comprado">
              <div className="mb-1 flex items-center justify-between gap-3">
                <h2 className="text-xs font-semibold tracking-wider text-forest-300 uppercase">
                  Comprado · en tu despensa
                </h2>
                <button
                  type="button"
                  onClick={() => void clearBought()}
                  aria-label="Quitar los comprados de la lista"
                  className={`shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-forest-300 hover:text-forest-50 ${focusRing}`}
                >
                  Limpiar
                </button>
              </div>
              <ul className="divide-y divide-forest-800">
                {bought.map(item => (
                  <li key={item.id} className="enter flex min-h-14 items-center gap-2 py-1">
                    <button
                      type="button"
                      onClick={() => void toggle(item)}
                      aria-label={`Devolver ${item.name} a la lista`}
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${focusRing}`}
                    >
                      <span className="pop flex h-6 w-6 items-center justify-center rounded-full bg-[#a3e635] text-forest-950">
                        <Check size={14} strokeWidth={3} />
                      </span>
                    </button>
                    <span className="min-w-0 flex-1 truncate text-[15px] text-forest-300"><span className="strike">{item.name}</span></span>
                    {item.quantity && <span className="shrink-0 text-sm text-forest-400">×{item.quantity}</span>}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      {adding && (
        <AddProductSheet
          target="shopping"
          owned={owned}
          startManual={adding === 'manual'}
          onChanged={refresh}
          onClose={() => setAdding(null)}
        />
      )}
      {toast}
    </main>
  )
}
