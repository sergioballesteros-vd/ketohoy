'use client'
import Image from 'next/image'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronRight, Plus, ShoppingBasket } from 'lucide-react'
import AddProductSheet from '@/components/AddProductSheet'
import { useToast } from '@/components/Toast'
import { KetoBadge, Skeleton, focusRing } from '@/components/ui'
import { CATEGORIES, categoryOf } from '@/lib/categories'
import { productosCount } from '@/lib/pluralize'
import PantryItemSheet, { type PantryRow } from './PantryItemSheet'
import { apiFetch } from '@/lib/apiFetch'

const JSON_HEADERS = { 'Content-Type': 'application/json' }

async function loadPantryItems(): Promise<PantryRow[]> {
  const res = await apiFetch('/api/pantry')
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json()
  return Array.isArray(data) ? data : []
}

const quantityLabel = (item: PantryRow) =>
  item.quantity != null ? `${item.quantity} ${item.unit ?? 'ud'}` : null

export default function InventoryPage() {
  const [items, setItems] = useState<PantryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [selected, setSelected] = useState<PantryRow | null>(null)
  const { toast, show } = useToast()

  const refresh = useCallback(async () => {
    try {
      setItems(await loadPantryItems())
      setError(null)
    } catch {
      setError('No se pudo cargar la despensa')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void (async () => {
      await refresh()
    })()
  }, [refresh])

  const owned = useMemo(() => {
    const map: Record<string, number> = {}
    for (const i of items) if (i.product.mercadonaId) map[i.product.mercadonaId] = 1
    return map
  }, [items])

  const groups = useMemo(() => {
    const byCat = new Map<string, PantryRow[]>()
    for (const item of items) {
      const key = categoryOf(item.product.category).key
      byCat.set(key, [...(byCat.get(key) ?? []), item])
    }
    return CATEGORIES.filter(c => byCat.has(c.key)).map(c => ({ ...c, items: byCat.get(c.key)! }))
  }, [items])

  const save = async (item: PantryRow, quantity: number | null, unit: string | null) => {
    const res = await apiFetch(`/api/pantry/${item.id}`, { method: 'PATCH', headers: JSON_HEADERS, body: JSON.stringify({ quantity, unit }) })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    await refresh()
  }

  // Removing is instant but reversible: the toast re-creates the row with the same quantity.
  const remove = async (item: PantryRow) => {
    const res = await apiFetch(`/api/pantry/${item.id}`, { method: 'DELETE' })
    if (!res.ok) {
      show('No se pudo quitar el producto')
      return
    }
    await refresh()
    show(`${item.product.name} quitado`, {
      label: 'Deshacer',
      run: () =>
        void (async () => {
          await apiFetch('/api/pantry', {
            method: 'POST',
            headers: JSON_HEADERS,
            body: JSON.stringify({ productId: item.productId, quantity: item.quantity, unit: item.unit }),
          })
          await refresh()
        })(),
    })
  }

  return (
    <main className="min-h-screen px-4 pt-[calc(env(safe-area-inset-top)+1rem)]">
      <header className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h1 className="text-xl min-[360px]:text-2xl font-bold text-forest-50">Mi despensa</h1>
          <p className="mt-0.5 text-sm text-forest-300">{loading ? ' ' : <span key={items.length} className="tick inline-block">{productosCount(items.length)}</span>}</p>
        </div>
        <button
          type="button"
          onClick={() => setAdding(true)}
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
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} className="h-14" />
          ))}
        </div>
      ) : items.length === 0 && !error ? (
        <div className="py-14 text-center">
          <ShoppingBasket size={36} strokeWidth={1.5} className="mx-auto mb-3 text-forest-500" />
          <p className="font-medium text-forest-50">Tu despensa está vacía</p>
          <p className="mx-auto mt-1 max-w-xs text-sm text-forest-300">
            Añade lo que tienes en casa y KetoHoy te dirá qué recetas puedes cocinar.
          </p>
          <button
            type="button"
            onClick={() => setAdding(true)}
            className={`mt-4 inline-flex h-11 items-center gap-1.5 rounded-full bg-[#a3e635] px-5 text-sm font-bold text-forest-950 ${focusRing}`}
          >
            <Plus size={16} strokeWidth={3} /> Añadir productos
          </button>
        </div>
      ) : (
        <div className="md:columns-2 md:gap-10">
          {groups.map(({ key, label, icon: Icon, items: rows }) => (
            <section key={key} className="mb-5 break-inside-avoid">
              <h2 className="mb-1 flex items-center gap-2 text-xs font-semibold tracking-wider text-forest-300 uppercase">
                <Icon size={14} /> {label}
                <span className="font-normal text-forest-400">{rows.length}</span>
              </h2>
              <ul className="divide-y divide-forest-800">
                {rows.map(item => {
                  const qty = quantityLabel(item)
                  return (
                    <li key={item.id} className="enter">
                      <button
                        type="button"
                        onClick={() => setSelected(item)}
                        className={`flex min-h-14 w-full items-center gap-3 rounded-lg py-2 text-left ${focusRing}`}
                      >
                        <span className={`relative h-10 w-10 shrink-0 overflow-hidden rounded-lg ${item.product.imageUrl ? 'bg-white' : 'bg-forest-800'}`}>
                          {item.product.imageUrl ? (
                            <Image src={item.product.imageUrl} alt="" fill sizes="40px" className="object-cover" />
                          ) : (
                            <Icon className="absolute inset-0 m-auto text-forest-300" size={18} strokeWidth={1.5} />
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[15px] font-medium text-forest-50">{item.product.name}</span>
                          {(qty || item.product.ketoScore < 4) && (
                            <span className="mt-0.5 flex items-center gap-2 text-xs text-forest-300">
                              {qty && <span>{qty}</span>}
                              {/* only when it is worth a warning: most of a keto pantry is Keto/Muy keto */}
                              {item.product.ketoScore < 4 && <KetoBadge score={item.product.ketoScore} />}
                            </span>
                          )}
                        </span>
                        <ChevronRight size={16} className="shrink-0 text-forest-500" />
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      {adding && <AddProductSheet target="pantry" owned={owned} onChanged={refresh} onClose={() => setAdding(false)} />}
      {selected && (
        <PantryItemSheet
          item={selected}
          onClose={() => setSelected(null)}
          onSave={(q, u) => save(selected, q, u)}
          onRemove={() => void remove(selected)}
        />
      )}
      {toast}
    </main>
  )
}
