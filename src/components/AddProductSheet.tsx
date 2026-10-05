'use client'

import Image from 'next/image'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, Loader2, Plus, Search, ShoppingBasket } from 'lucide-react'
import type { MercadonaProduct } from '@/lib/mercadona'
import { CATEGORIES } from '@/lib/categories'
import { Chip, KetoBadge, focusRing } from '@/components/ui'
import Sheet from '@/components/Sheet'
import type { PantryRow } from '@/app/inventory/PantryItemSheet'
import { apiFetch } from '@/lib/apiFetch'

type Props = {
  /** where added products go: the pantry or the shopping list */
  target: 'pantry' | 'shopping'
  /** mercadonaId -> how many are already there (pantry: 1 if present) */
  owned: Record<string, number>
  /** called after every successful add so the page can refresh its data */
  onChanged: () => Promise<void> | void
  onClose: () => void
  /** open on the manual tab (e.g. from the empty state's "Añadir manualmente") */
  startManual?: boolean
  onEditPantry?: (item: PantryRow) => void
}

const UNITS = ['ud', 'g', 'kg', 'ml', 'l', 'paquete']
const QUICK = ['pollo', 'huevos', 'salmón', 'aguacate', 'queso']
const euros = (n: number) => `${n.toFixed(2).replace('.', ',')} €`

const field =
  'h-11 w-full rounded-xl border border-forest-700 bg-forest-800 px-3.5 text-[15px] text-forest-50 outline-none transition-colors placeholder:text-forest-400 focus:border-[#a3e635] focus:ring-2 focus:ring-[#a3e635]/20'

async function ok(res: Response) {
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res
}

const JSON_HEADERS = { 'Content-Type': 'application/json' }

/**
 * One add-product flow for Despensa and Lista de compra: search Mercadona or type a product by hand.
 * The sheet stays open so several products can be added in a row.
 */
export default function AddProductSheet({ target, owned, onChanged, onClose, startManual, onEditPantry }: Props) {
  const [tab, setTab] = useState<'search' | 'manual'>(startManual ? 'manual' : 'search')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<MercadonaProduct[]>([])
  const [searching, setSearching] = useState(false)
  const [searched, setSearched] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{ name: string; outcome: 'created' | 'existing'; item?: PantryRow } | null>(null)

  const [name, setName] = useState('')
  const [qty, setQty] = useState(target === 'shopping' ? '1' : '')
  const [unit, setUnit] = useState('ud')
  const [category, setCategory] = useState('other')
  const nameRef = useRef<HTMLInputElement>(null)

  // Same generation/abort/debounce contract as the catalog (KH-009).
  const searchRequest = useRef<{ query: string; controller: AbortController } | null>(null)
  const searchGeneration = useRef(0)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const invalidateSearch = useCallback(() => {
    searchGeneration.current++
    searchRequest.current?.controller.abort()
    searchRequest.current = null
    if (searchTimer.current) clearTimeout(searchTimer.current)
  }, [])
  const search = useCallback(async (q: string) => {
    if (q.length < 2 || searchRequest.current?.query === q) return
    invalidateSearch()
    const generation = searchGeneration.current
    const controller = new AbortController()
    searchRequest.current = { query: q, controller }
    const current = () => generation === searchGeneration.current && !controller.signal.aborted
    setSearching(true)
    setError(null)
    try {
      const res = await ok(await apiFetch(`/api/mercadona/search?q=${encodeURIComponent(q)}`, { signal: controller.signal }))
      const data = await res.json()
      if (current()) setResults(data.products ?? [])
    } catch {
      if (current()) {
        searchRequest.current = null
        setResults([])
        setError('No se pudo buscar. Inténtalo de nuevo.')
      }
    } finally {
      if (current()) {
        setSearching(false)
        setSearched(true)
      }
    }
  }, [invalidateSearch])

  useEffect(() => {
    if (query.trim().length >= 2) searchTimer.current = setTimeout(() => void search(query.trim()), 400)
    return invalidateSearch
  }, [query, search, invalidateSearch])

  const onQuery = (value: string) => {
    invalidateSearch()
    setQuery(value)
    setSearching(false)
    setError(null)
    setResults([])
    setSearched(false)
  }

  const addProduct = async (p: MercadonaProduct) => {
    setBusy(p.mercadonaId)
    setError(null)
    try {
      const res = await ok(
        await apiFetch('/api/mercadona/add', {
          method: 'POST',
          headers: JSON_HEADERS,
          body: JSON.stringify(
            target === 'pantry'
              ? { mercadonaId: p.mercadonaId, addToPantry: true }
              : { mercadonaId: p.mercadonaId, addToShoppingList: true, quantity: 1 }
          ),
        })
      )
      const data = await res.json()
      if (target === 'pantry') setFeedback({ name: p.name, outcome: data.pantryItem.outcome, item: data.pantryItem })
      await onChanged()
    } catch {
      setError('No se pudo añadir. Inténtalo de nuevo.')
    } finally {
      setBusy(null)
    }
  }

  const addManual = async (e: React.FormEvent) => {
    e.preventDefault()
    const clean = name.trim()
    if (!clean) return
    const quantity = qty ? Number(qty) : null
    setBusy('manual')
    setError(null)
    try {
      // Manual products are real products (with a category) in both flows, so they land in the right
      // pantry group when bought from the list.
      const product = await (
        await ok(await apiFetch('/api/products', { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ name: clean, category, source: 'manual' }) }))
      ).json()
      let pantryItem: (PantryRow & { outcome: 'created' | 'existing' }) | undefined
      if (target === 'pantry') {
        pantryItem = await (await ok(
          await apiFetch('/api/pantry', {
            method: 'POST',
            headers: JSON_HEADERS,
            body: JSON.stringify({ productId: product.id, quantity: quantity && quantity > 0 ? quantity : null, unit: quantity && quantity > 0 ? unit : null }),
          })
        )).json()
      } else {
        await ok(
          await apiFetch('/api/shopping-list', {
            method: 'POST',
            headers: JSON_HEADERS,
            body: JSON.stringify({ name: clean, productId: product.id, quantity: quantity && quantity > 0 ? quantity : 1 }),
          })
        )
      }
      await onChanged()
      setFeedback({ name: clean, outcome: pantryItem?.outcome ?? 'created', item: pantryItem })
      setName('')
      setQty(target === 'shopping' ? '1' : '')
      nameRef.current?.focus()
    } catch {
      setError('No se pudo añadir. Inténtalo de nuevo.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <Sheet labelId="add-product-title" title={target === 'pantry' ? 'Añadir a la despensa' : 'Añadir a la lista'} onClose={onClose}>
      <div className="mt-3 flex flex-wrap gap-2">
        <Chip active={tab === 'search'} onClick={() => setTab('search')}>
          Buscar en Mercadona
        </Chip>
        <Chip active={tab === 'manual'} onClick={() => setTab('manual')}>
          Manual
        </Chip>
      </div>

      {error && (
        <p role="alert" className="mt-3 rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      {tab === 'search' ? (
        <div className="mt-4">
          <div className="relative">
            <Search size={18} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-forest-300" />
            <input
              type="search"
              data-sheet-initial-focus
              enterKeyHint="search"
              aria-label="Buscar productos de Mercadona"
              placeholder="Huevos, salmón, queso…"
              value={query}
              onChange={e => onQuery(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void search(query.trim()) } }}
              className={`${field} pl-10 [&::-webkit-search-cancel-button]:hidden`}
            />
            {searching && <Loader2 size={16} className="absolute top-1/2 right-3.5 -translate-y-1/2 animate-spin text-forest-300" />}
          </div>

          {results.length > 0 ? (
            <ul className="mt-2 divide-y divide-forest-800">
              {results.map(p => {
                const have = owned[p.mercadonaId] ?? 0
                const pantryHas = target === 'pantry' && have > 0
                return (
                  <li key={p.id} className="flex items-center gap-3 py-2.5">
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-white">
                      {p.imageUrl ? (
                        <Image src={p.imageUrl} alt="" fill sizes="48px" className="object-cover" />
                      ) : (
                        <ShoppingBasket className="absolute inset-0 m-auto text-forest-500" size={20} strokeWidth={1.5} />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-[13px] leading-snug font-medium text-forest-50">{p.name}</p>
                      <p className="mt-0.5 flex items-center gap-2 text-xs text-forest-300">
                        {p.unitPrice != null && <span className="font-semibold text-forest-100">{euros(p.unitPrice)}</span>}
                        <KetoBadge score={p.ketoScore} classification={p.classification} />
                      </p>
                    </div>
                    {pantryHas ? (
                      <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-[#a3e635]">
                        <Check size={14} strokeWidth={3} /> En casa
                      </span>
                    ) : (
                      <div className="flex shrink-0 items-center gap-2">
                        {have > 0 && <span className="text-xs font-semibold text-[#a3e635]">×{have}</span>}
                        <button
                          type="button"
                          disabled={busy === p.mercadonaId}
                          onClick={() => void addProduct(p)}
                          aria-label={`Añadir ${p.name}`}
                          className={`relative hit-area flex h-10 w-10 items-center justify-center rounded-full bg-[#a3e635] text-forest-950 disabled:opacity-50 ${focusRing}`}
                        >
                          {busy === p.mercadonaId ? <Loader2 size={18} className="animate-spin" /> : <Plus size={20} strokeWidth={2.5} />}
                        </button>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          ) : searched && !searching && !error ? (
            <p className="py-8 text-center text-sm text-forest-300">Sin resultados para “{query.trim()}”.</p>
          ) : (
            <div className="mt-3 flex flex-wrap gap-2">
              {QUICK.map(q => (
                <Chip key={q} onClick={() => onQuery(q)}>
                  {q}
                </Chip>
              ))}
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={addManual} className="mt-4 space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-forest-200">Producto</span>
            <input ref={nameRef} data-sheet-initial-focus required value={name} onChange={e => setName(e.target.value)} placeholder="Nombre del producto" className={field} />
          </label>
          <div className="grid grid-cols-2 gap-3 sm:flex">
            <label className="block min-w-0 sm:w-24">
              <span className="mb-1 block text-xs font-medium text-forest-200">{target === 'shopping' ? 'Cantidad de paquetes' : 'Cantidad'}</span>
              <input type="number" min={target === 'shopping' ? '0.5' : '0'} step="0.5" inputMode="decimal" value={qty} onChange={e => setQty(e.target.value)} className={field} />
            </label>
            {target === 'pantry' && (
              <label className="block min-w-0 flex-1">
                <span className="mb-1 block text-xs font-medium text-forest-200">Unidad</span>
                <select value={unit} onChange={e => setUnit(e.target.value)} className={field}>
                  {UNITS.map(u => (
                    <option key={u}>{u}</option>
                  ))}
                </select>
              </label>
            )}
            <label className="col-span-2 block min-w-0 flex-1">
              <span className="mb-1 block text-xs font-medium text-forest-200">Categoría</span>
              <select value={category} onChange={e => setCategory(e.target.value)} className={field}>
                {CATEGORIES.map(c => (
                  <option key={c.key} value={c.key}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <button
            type="submit"
            disabled={busy === 'manual' || !name.trim()}
            className={`flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#a3e635] font-semibold text-forest-950 disabled:opacity-50 ${focusRing}`}
          >
            {busy === 'manual' && <Loader2 size={18} className="animate-spin" />} Añadir
          </button>

        </form>
      )}
      {feedback && (
        <div className="mt-3 text-sm text-[#a3e635]" role="status">
          <p className="flex items-start justify-center gap-1 break-words">
            <Check className="shrink-0" size={14} strokeWidth={3} />
            <span className="min-w-0">{feedback.outcome === 'existing' ? 'Ya está en tu despensa. Se conserva la cantidad actual.' : `${feedback.name} añadido`}</span>
          </p>
          {feedback.outcome === 'existing' && feedback.item && onEditPantry && (
            <button type="button" onClick={() => onEditPantry(feedback.item!)} className={`mt-2 min-h-11 rounded-lg px-3 font-semibold underline ${focusRing}`}>
              Editar cantidad
            </button>
          )}
        </div>
      )}
    </Sheet>
  )
}
