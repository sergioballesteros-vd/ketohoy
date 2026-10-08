'use client'
import Image from 'next/image'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { ChevronRight, Plus } from 'lucide-react'
import AddProductSheet from '@/components/AddProductSheet'
import { useToast } from '@/components/Toast'
import { KetoBadge, Skeleton, focusRing } from '@/components/ui'
import { persistedNutritionSource } from '@/lib/ketoLabel'
import { CATEGORIES, categoryOf } from '@/lib/categories'
import { productosCount } from '@/lib/pluralize'
import PantryItemSheet, { type PantryRow } from './PantryItemSheet'
import { apiFetch } from '@/lib/apiFetch'
import { closeSheet } from '@/components/Sheet'
import { filterPantryItems } from '@/lib/pantrySearch'

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
  const [query, setQuery] = useState('')
  const [leaving, setLeaving] = useState<Set<string>>(new Set())
  const [entering, setEntering] = useState<Set<string>>(new Set())
  const { toast, show } = useToast()
  const mutations = useRef(new Set<string>())
  const mounted = useRef(true)
  const generation = useRef(0)
  const searchInput = useRef<HTMLInputElement>(null)
  const rowPositions = useRef(new Map<string, { top: number; height: number }>())
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])

  const captureRowPositions = () => {
    rowPositions.current = new Map(Array.from(document.querySelectorAll<HTMLElement>('[data-list-row]')).flatMap(row => {
      const id = row.dataset.listRow
      if (!id) return []
      const rect = row.getBoundingClientRect()
      return [[id, { top: rect.top, height: rect.height }] as const]
    }))
  }

  useLayoutEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const rows = Array.from(document.querySelectorAll<HTMLElement>('[data-list-row]')).map(row => ({ row, id: row.dataset.listRow, rect: row.getBoundingClientRect() }))
    const positions = new Map<string, { top: number; height: number }>()
    rows.forEach(({ row, id, rect }) => {
      if (!id) return
      const top = rect.top
      const previous = rowPositions.current.get(id)
      const visible = rect.bottom > 0 && rect.top < window.innerHeight
      const wasVisible = previous && previous.top + previous.height > 0 && previous.top < window.innerHeight
      if (!reduce && previous && (visible || wasVisible) && Math.abs(previous.top - top) > 1) {
        row.animate([{ transform: `translateY(${previous.top - top}px)` }, { transform: 'translateY(0)' }], { duration: 140, easing: 'cubic-bezier(.22,1,.36,1)' })
      }
      positions.set(id, { top, height: rect.height })
    })
    rowPositions.current = positions
  }, [items])

  const clearEntering = (id: string) => setEntering(rows => {
    if (!rows.has(id)) return rows
    const next = new Set(rows)
    next.delete(id)
    return next
  })

  const leaveRow = async (id: string) => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const row = document.getElementById(`pantry-row-${id}`)
    if (!row) return
    setLeaving(rows => new Set(rows).add(id))
    await new Promise<void>(resolve => {
      const finish = (event: TransitionEvent) => {
        if (event.target !== row || event.propertyName !== 'opacity') return
        row.removeEventListener('transitionend', finish)
        row.removeEventListener('transitioncancel', finish)
        resolve()
      }
      row.addEventListener('transitionend', finish)
      row.addEventListener('transitioncancel', finish)
    })
  }

  const refresh = useCallback(async () => {
    const current = ++generation.current
    try {
      const rows = await loadPantryItems()
      if (!mounted.current || current !== generation.current) return
      captureRowPositions()
      setItems(rows)
      setError(null)
    } catch {
      if (!mounted.current || current !== generation.current) return
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

  const filteredItems = useMemo(() => filterPantryItems(items, query), [items, query])
  const hasSearchQuery = query.trim().length > 0

  const groups = useMemo(() => {
    const byCat = new Map<string, PantryRow[]>()
    for (const item of filteredItems) {
      const key = categoryOf(item.product.category).key
      byCat.set(key, [...(byCat.get(key) ?? []), item])
    }
    return CATEGORIES.filter(c => byCat.has(c.key)).map(c => ({ ...c, items: byCat.get(c.key)! }))
  }, [filteredItems])

  const clearSearch = () => {
    setQuery('')
    searchInput.current?.focus()
  }

  const save = async (item: PantryRow, quantity: number | null, unit: string | null) => {
    const res = await apiFetch(`/api/pantry/${item.id}`, { method: 'PATCH', headers: JSON_HEADERS, body: JSON.stringify({ quantity, unit }) })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    await refresh()
  }

  const remove = async (item: PantryRow): Promise<boolean> => {
    if (mutations.current.has(item.id)) return false
    mutations.current.add(item.id)
    generation.current++
    try {
      const res = await apiFetch(`/api/pantry/${item.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      if (!mounted.current) return false
      await leaveRow(item.id)
      if (!mounted.current) return false
      captureRowPositions()
      setItems(rows => rows.filter(row => row.id !== item.id))
      setLeaving(rows => { const next = new Set(rows); next.delete(item.id); return next })
      await refresh()
      if (!mounted.current) return false
      let restored = false
      const undo = async () => {
        if (restored || mutations.current.has(item.id)) return
        mutations.current.add(item.id)
        generation.current++
        try {
          const response = await apiFetch('/api/pantry', {
            method: 'POST', headers: JSON_HEADERS,
            body: JSON.stringify({ productId: item.productId, quantity: item.quantity, unit: item.unit }),
          })
          if (!response.ok) throw new Error()
          const row = await response.json()
          restored = true
          if (!mounted.current) return
          if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) setEntering(rows => new Set(rows).add(row.id))
          // KH-016 returns the effective row; an existing row must never be overwritten with the snapshot.
          captureRowPositions()
          setItems(rows => [...rows.filter(existing => existing.id !== row.id), row])
          await refresh()
          if (mounted.current) show(row.outcome === 'existing' ? 'Ya está en tu despensa. Se conserva la cantidad actual.' : 'Producto restaurado', {
            label: 'Editar', run: () => setSelected(row),
          })
        } catch {
          if (mounted.current) show('No se pudo restaurar el producto', { label: 'Reintentar', run: () => void undo() })
        } finally { mutations.current.delete(item.id) }
      }
      show(`${item.product.name} quitado`, { label: 'Deshacer', run: () => void undo() })
      return true
    } catch {
      if (mounted.current) show('No se pudo quitar el producto', { label: 'Reintentar', run: () => { void remove(item).then(success => { if (success && mounted.current) setSelected(current => current?.id === item.id ? null : current) }) } })
      return false
    } finally { mutations.current.delete(item.id) }
  }

  return (
    <main className="min-h-screen px-4 pt-[calc(env(safe-area-inset-top)+1rem)]">
      <header className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h1 className="text-xl min-[360px]:text-2xl font-semibold text-forest-50">Despensa</h1>
          <p className="mt-0.5 text-sm text-forest-300">{loading ? ' ' : <span key={items.length} className="inline-block">{productosCount(items.length)}</span>}</p>
        </div>
        <button
          type="button"
          onClick={() => setAdding(true)}
          className={`relative hit-area inline-flex h-10 items-center gap-1.5 rounded-full bg-[#a3e635] px-4 text-sm font-semibold text-forest-950 ${focusRing}`}
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
        <div className="py-6">
          <p className="font-medium text-forest-50">Tu despensa está vacía</p>
          <p className="mx-auto mt-1 max-w-xs text-sm text-forest-300">
            Añade lo que tienes en casa para descontarlo de la lista de compra.
          </p>

        </div>
      ) : items.length > 0 ? (
        <>
          <section className="mb-5">
            <label htmlFor="pantry-search" className="sr-only">Buscar en tu despensa</label>
            <div className="flex items-center gap-2">
              <input
                ref={searchInput}
                id="pantry-search"
                type="search"
                value={query}
                onChange={event => setQuery(event.target.value)}
                placeholder="Buscar en tu despensa"
                className={`h-11 min-w-0 flex-1 rounded-xl border border-forest-700 bg-forest-900 px-3.5 text-[15px] text-forest-50 placeholder:text-forest-400 outline-none focus:border-[#a3e635] focus:ring-2 focus:ring-[#a3e635]/20 ${focusRing}`}
              />
              {query.length > 0 && (
                <button type="button" onClick={clearSearch} aria-label="Limpiar búsqueda" className={`relative hit-area h-11 shrink-0 rounded-xl px-3 text-sm font-semibold text-forest-100 hover:bg-forest-800 ${focusRing}`}>
                  Limpiar
                </button>
              )}
            </div>
            {hasSearchQuery && <p className="mt-2 text-sm text-forest-300">{filteredItems.length} de {items.length} productos</p>}
          </section>

          {hasSearchQuery && filteredItems.length === 0 ? (
            <div className="py-6">
              <p className="font-medium text-forest-50">No encontramos nada en tu despensa para “{query.trim()}”.</p>
              <button type="button" onClick={clearSearch} className={`mt-2 min-h-11 rounded-lg px-3 text-sm font-semibold text-[#a3e635] underline ${focusRing}`}>
                Limpiar búsqueda
              </button>
            </div>
          ) : (
            <div className="md:columns-2 md:gap-10">
              {groups.map(({ key, label, icon: Icon, items: rows }) => (
                <section key={key} className="mb-5 break-inside-avoid">
                  <h2 className="mb-1 flex items-center gap-2 text-xs font-semibold tracking-wider text-forest-300 uppercase">
                    {label}
                    <span className="font-normal text-forest-400">{rows.length}</span>
                  </h2>
                  <ul className="divide-y divide-forest-800">
                    {rows.map(item => {
                      const qty = quantityLabel(item)
                      return (
                        <li key={item.id} id={`pantry-row-${item.id}`} data-list-row={item.id} onAnimationEnd={event => { if (event.target === event.currentTarget) clearEntering(item.id) }} className={`${leaving.has(item.id) ? 'leaving' : ''} ${entering.has(item.id) ? 'row-enter' : ''}`}>
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
                                  {item.product.ketoScore < 4 && <KetoBadge score={item.product.ketoScore} source={persistedNutritionSource(item.product)} />}
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
        </>
      ) : null}

      {adding && <AddProductSheet target="pantry" owned={owned} onChanged={refresh} onClose={closeSheet(() => setAdding(false))} onEditPantry={item => closeSheet(() => { setAdding(false); setSelected(item) })()} />}
      {selected && (
        <PantryItemSheet
          item={selected}
          onClose={closeSheet(() => setSelected(current => current?.id === selected.id ? null : current))}
          onSave={(q, u) => save(selected, q, u)}
          onRemove={() => remove(selected)}
        />
      )}
      {toast}
    </main>
  )
}
