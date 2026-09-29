'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Heart, LayoutGrid, Minus, Plus, Search, ShoppingBasket, X } from 'lucide-react'
import { CATEGORIES } from '@/lib/categories'
import type { MercadonaProduct as MercadonaResult } from '@/lib/mercadona'
import { parseShoppingQuantity } from '@/lib/shoppingList'
import { productosCount } from '@/lib/pluralize'
import { Chip, KetoBadge, Skeleton, focusRing } from '@/components/ui'
import ExploreProductSheet from './ExploreProductSheet'
import { apiFetch } from '@/lib/apiFetch'

type ShoppingItem = {
  id: string
  name: string
  quantity: string | null
  checked: boolean
  product: {
    id: string
    mercadonaId?: string | null
    name?: string
    imageUrl?: string | null
    unitPrice: number | null
    category: string
  } | null
}

const SUBCATEGORIES: Record<string, { key: string; label: string; terms: string[] }[]> = {
  meat: [
    { key: 'pollo', label: 'Pollo', terms: ['pollo'] },
    { key: 'pavo', label: 'Pavo', terms: ['pavo'] },
    { key: 'ternera', label: 'Ternera', terms: ['ternera'] },
    { key: 'cerdo', label: 'Cerdo', terms: ['cerdo', 'jamon', 'jamón', 'chorizo', 'lomo'] },
    { key: 'embutidos', label: 'Embutidos', terms: ['bacon', 'chorizo', 'salchicha', 'mortadela'] },
  ],
  fish: [
    { key: 'salmon', label: 'Salmón', terms: ['salmon', 'salmón'] },
    { key: 'atun', label: 'Atún', terms: ['atun', 'atún'] },
    { key: 'marisco', label: 'Marisco', terms: ['gamba', 'gambas', 'langostino', 'marisco'] },
    { key: 'conserva', label: 'Conserva', terms: ['conserva', 'lata', 'escabeche'] },
  ],
  dairy: [
    { key: 'queso', label: 'Queso', terms: ['queso', 'quesos'] },
    { key: 'yogur', label: 'Yogur', terms: ['yogur'] },
    { key: 'nata', label: 'Nata', terms: ['nata'] },
    { key: 'leche', label: 'Leche', terms: ['leche'] },
  ],
}

const normalizeText = (value: string) => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()

const matchesSubcategory = (product: MercadonaResult, subcategoryKey: string) => {
  const subcategory = Object.values(SUBCATEGORIES).flat().find(item => item.key === subcategoryKey)
  if (!subcategory) return true
  const haystack = normalizeText([product.name, product.brand, product.ingredients ?? '', product.allergens ?? '', product.category].filter(Boolean).join(' '))
  return subcategory.terms.some(term => haystack.includes(normalizeText(term)))
}


// Every product comes from Mercadona, so that name carries no information on a card.
const showBrand = (brand?: string | null) => !!brand && brand.toLowerCase() !== 'mercadona'

const euros = (n: number) => `${n.toFixed(2).replace('.', ',')} €`

export default function ExplorePage() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [products, setProducts] = useState<MercadonaResult[]>([])
  const [loading, setLoading] = useState(false)
  const [loadFailed, setLoadFailed] = useState(false)
  const [shoppingItems, setShoppingItems] = useState<ShoppingItem[]>([])
  const [detailProduct, setDetailProduct] = useState<MercadonaResult | null>(null)
  // Quantity shown right after a tap, before the server confirms; `pending` locks that product meanwhile.
  const [optimistic, setOptimistic] = useState<Record<string, number>>({})
  const [pending, setPending] = useState<Record<string, boolean>>({})
  const [cartError, setCartError] = useState<string | null>(null)
  // Persisted to localStorage (device-local, no backend model yet) so favorites
  // survive a reload — full cross-device sync is tracked as follow-up work.
  const [favoriteProductIds, setFavoriteProductIds] = useState<Record<string, boolean>>(() => {
    if (typeof window === 'undefined') return {}
    try {
      const stored = localStorage.getItem('ketohoy:favoriteProductIds')
      return stored ? JSON.parse(stored) : {}
    } catch {
      return {}
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem('ketohoy:favoriteProductIds', JSON.stringify(favoriteProductIds))
    } catch {
      // ignore unavailable storage (private mode, quota, etc.)
    }
  }, [favoriteProductIds])

  const loadShoppingList = useCallback(async () => {
    try {
      const res = await apiFetch('/api/shopping-list')
      const data = await res.json()
      setShoppingItems(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('[ExploreClient] failed to load shopping list', error)
      setShoppingItems([])
    }
  }, [])

  // One loader for trending / category / search: same state handling, different URL.
  const fetchProducts = useCallback(async (url: string) => {
    setLoading(true)
    setLoadFailed(false)
    try {
      const res = await apiFetch(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setProducts(data.products ?? [])
    } catch (error) {
      console.error('[ExploreClient] failed to load products', url, error)
      setProducts([])
      setLoadFailed(true)
    } finally {
      setLoading(false)
    }
  }, [])

  const loadTrending = useCallback(() => fetchProducts('/api/mercadona/search?q=keto'), [fetchProducts])

  const loadCategory = useCallback(
    async (key: string) => {
      setSelectedCategory(key)
      setSelectedSubcategory(null)
      setSearchQuery('')
      await fetchProducts(`/api/mercadona/category/${key}`)
    },
    [fetchProducts]
  )

  const loadSearch = useCallback(
    async (query: string) => {
      setSearchQuery(query)
      setSelectedCategory(null)
      setSelectedSubcategory(null)
      await fetchProducts(`/api/mercadona/search?q=${encodeURIComponent(query)}`)
    },
    [fetchProducts]
  )

  useEffect(() => {
    // Original code wrapped this in an async IIFE for the same reason: initial data fetch on mount.
    void (async () => {
      await Promise.all([loadTrending(), loadShoppingList()])
    })()
  }, [loadTrending, loadShoppingList])

  useEffect(() => {
    const query = searchQuery.trim()
    if (!query) return

    const timeout = window.setTimeout(() => {
      void loadSearch(query)
    }, 450)

    return () => window.clearTimeout(timeout)
  }, [searchQuery, loadSearch])

  const visibleProducts = selectedSubcategory
    ? products.filter(product => matchesSubcategory(product, selectedSubcategory))
    : products

  const shoppingSummary = shoppingItems.filter(item => !item.checked)
  const subtotal = shoppingSummary.reduce((sum, item) => {
    const qty = parseShoppingQuantity(item.quantity, 1)
    return sum + qty * (item.product?.unitPrice ?? 0)
  }, 0)

  // mercadonaId -> shopping list row, to show/adjust what is already in the list.
  const inList = useMemo(() => {
    const map: Record<string, { id: string; qty: number }> = {}
    for (const item of shoppingSummary) {
      const key = item.product?.mercadonaId
      if (key) map[key] = { id: item.id, qty: parseShoppingQuantity(item.quantity, 1) }
    }
    return map
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shoppingItems])

  const qtyOf = (product: MercadonaResult) => optimistic[product.mercadonaId] ?? inList[product.mercadonaId]?.qty ?? 0

  const changeQuantity = async (product: MercadonaResult, delta: number) => {
    const key = product.mercadonaId
    if (pending[key]) return
    const next = Math.max(0, qtyOf(product) + delta)
    setCartError(null)
    setPending(p => ({ ...p, [key]: true }))
    setOptimistic(o => ({ ...o, [key]: next }))
    try {
      let res: Response
      if (delta > 0) {
        res = await apiFetch('/api/mercadona/add', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mercadonaId: key, addToShoppingList: true, quantity: delta }),
        })
      } else {
        const row = inList[key]
        if (!row) return
        res = await apiFetch(`/api/shopping-list/${row.id}/quantity`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ delta }),
        })
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      await loadShoppingList()
    } catch (error) {
      console.error('[ExploreClient] failed to update shopping list', error)
      setCartError('No se pudo actualizar la lista. Inténtalo de nuevo.')
      throw error
    } finally {
      const without = <T,>(m: Record<string, T>) => Object.fromEntries(Object.entries(m).filter(([k]) => k !== key))
      setOptimistic(without)
      setPending(without)
    }
  }

  const tap = (product: MercadonaResult, delta: number) => void changeQuantity(product, delta).catch(() => {})

  const clearFilters = () => {
    setSelectedCategory(null)
    setSelectedSubcategory(null)
    setSearchQuery('')
    void loadTrending()
  }

  const toggleFavorite = (id: string) => setFavoriteProductIds(current => ({ ...current, [id]: !current[id] }))

  const cartCount = shoppingSummary.length
  const searchRef = useRef<HTMLInputElement>(null)

  return (
    <main className={`min-h-screen px-4 ${cartCount > 0 ? 'pb-[calc(5rem+env(safe-area-inset-bottom))]' : 'pb-6'}`}>
      <div className="sticky top-0 z-10 -mx-4 bg-forest-900/95 px-4 pt-[calc(env(safe-area-inset-top)+1rem)] pb-3 backdrop-blur">
        <h1 className="mb-3 text-xl min-[360px]:text-2xl font-bold text-forest-50">Catálogo</h1>

        <form
          role="search"
          onSubmit={e => {
            e.preventDefault()
            if (searchQuery.trim()) void loadSearch(searchQuery.trim())
          }}
          className="relative"
        >
          <Search size={18} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-forest-300" />
          <input
            ref={searchRef}
            type="search"
            enterKeyHint="search"
            className="h-11 w-full rounded-xl border border-forest-700 bg-forest-800 pr-10 pl-10 text-[15px] text-forest-50 outline-none transition-colors placeholder:text-forest-400 focus:border-[#a3e635] focus:ring-2 focus:ring-[#a3e635]/20 [&::-webkit-search-cancel-button]:hidden"
            placeholder="Buscar productos keto"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            aria-label="Buscar productos keto"
          />
          {searchQuery && (
            <button
              type="button"
              aria-label="Borrar búsqueda"
              onClick={() => {
                setSearchQuery('')
                clearFilters()
                searchRef.current?.focus()
              }}
              className={`absolute top-1/2 right-1 hit-area flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-forest-300 hover:text-forest-50 ${focusRing}`}
            >
              <X size={16} />
            </button>
          )}
        </form>

        <div className="hide-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4">
          <Chip active={!selectedCategory && !searchQuery} onClick={clearFilters}>
            <LayoutGrid size={15} /> Todo
          </Chip>
          {CATEGORIES.map(({ key, label, icon: Icon }) => (
            <Chip key={key} active={selectedCategory === key} onClick={() => void loadCategory(key)}>
              <Icon size={15} /> {label}
            </Chip>
          ))}
        </div>

        {selectedCategory && SUBCATEGORIES[selectedCategory]?.length > 0 && (
          <div className="hide-scrollbar -mx-4 mt-2 flex gap-2 overflow-x-auto px-4">
            {SUBCATEGORIES[selectedCategory].map(sub => (
              <Chip
                key={sub.key}
                active={selectedSubcategory === sub.key}
                onClick={() => setSelectedSubcategory(selectedSubcategory === sub.key ? null : sub.key)}
              >
                {sub.label}
              </Chip>
            ))}
          </div>
        )}
      </div>

      <section className="mt-2" aria-live="polite">
        {loading ? (
          <div className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5" aria-busy="true">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i}>
                <Skeleton className="aspect-square" />
                <Skeleton className="mt-2 h-4 w-3/4 rounded-md" />
                <Skeleton className="mt-1.5 h-3 w-1/2 rounded-md" />
              </div>
            ))}
          </div>
        ) : visibleProducts.length > 0 ? (
          <>
            <p className="mb-3 text-xs text-forest-300">
              {productosCount(visibleProducts.length)}
              {searchQuery.trim() ? ` para “${searchQuery.trim()}”` : selectedCategory ? ` · ${CATEGORIES.find(c => c.key === selectedCategory)?.label}` : ' · Selección keto'}
            </p>
            <ul className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {visibleProducts.map(product => {
                const qty = qtyOf(product)
                const busy = !!pending[product.mercadonaId]
                const fav = !!favoriteProductIds[product.id]
                return (
                  <li key={product.id} className="card-lift">
                    <div className="card-media relative aspect-square overflow-hidden rounded-2xl bg-white">
                      {product.imageUrl ? (
                        <Image
                          src={product.imageUrl}
                          alt=""
                          fill
                          sizes="(min-width: 640px) 200px, 50vw"
                          className="card-img object-cover"
                        />
                      ) : (
                        <ShoppingBasket className="absolute inset-0 m-auto text-forest-500" size={32} strokeWidth={1.5} />
                      )}
                      {/* pointer-only hit area; the name below is the keyboard/AT entry to the detail */}
                      <button
                        type="button"
                        tabIndex={-1}
                        aria-hidden
                        onClick={() => setDetailProduct(product)}
                        className="absolute inset-0"
                      />
                      <button
                        type="button"
                        aria-pressed={fav}
                        aria-label={fav ? 'Quitar favorito' : 'Marcar favorito'}
                        onClick={() => toggleFavorite(product.id)}
                        className={`absolute top-1 right-1 hit-area flex h-10 w-10 items-center justify-center rounded-full bg-forest-950/60 backdrop-blur-sm ${focusRing} ${fav ? 'text-[#a3e635]' : 'text-forest-50'}`}
                      >
                        <Heart size={16} fill={fav ? 'currentColor' : 'none'} />
                      </button>
                      {/* "+" first; compact stepper once the product is in the list */}
                      {qty === 0 ? (
                        <button
                          type="button"
                          disabled={busy}
                          aria-label={`Añadir ${product.name} a la lista`}
                          onClick={() => tap(product, 1)}
                          className={`absolute right-1.5 bottom-1.5 hit-area flex h-10 w-10 items-center justify-center rounded-full bg-[#a3e635] text-forest-950 shadow-md disabled:opacity-50 ${focusRing}`}
                        >
                          <Plus size={20} strokeWidth={2.5} />
                        </button>
                      ) : (
                        <div className="absolute right-1.5 bottom-1.5 flex h-11 items-center rounded-full bg-[#a3e635] text-forest-950 shadow-md">
                          <button
                            type="button"
                            disabled={busy}
                            aria-label={`Quitar una unidad de ${product.name}`}
                            onClick={() => tap(product, -1)}
                            className={`flex h-11 w-10 items-center justify-center rounded-full disabled:opacity-50 ${focusRing}`}
                          >
                            <Minus size={16} strokeWidth={2.5} />
                          </button>
                          <span className="min-w-4 text-center text-sm font-bold" aria-live="polite"><span key={qty} className="tick inline-block">{qty}</span></span>
                          <button
                            type="button"
                            disabled={busy}
                            aria-label={`Añadir otra unidad de ${product.name}`}
                            onClick={() => tap(product, 1)}
                            className={`flex h-11 w-10 items-center justify-center rounded-full disabled:opacity-50 ${focusRing}`}
                          >
                            <Plus size={16} strokeWidth={2.5} />
                          </button>
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setDetailProduct(product)}
                      className={`mt-2 block w-full rounded-lg text-left ${focusRing}`}
                    >
                      <span className="flex items-baseline gap-1.5">
                        <span className="text-[15px] font-bold text-forest-50">
                          {product.unitPrice != null ? euros(product.unitPrice) : '—'}
                        </span>
                        {product.referencePrice && (
                          <span className="truncate text-[11px] text-forest-300">{product.referencePrice}</span>
                        )}
                      </span>
                      <span className="mt-0.5 line-clamp-2 min-h-[2.75em] text-[13px] leading-snug text-forest-100">{product.name}</span>
                      <span className="mt-1 flex items-center gap-1.5 overflow-hidden">
                        <KetoBadge score={product.ketoScore} />
                        {showBrand(product.brand) && <span className="truncate text-[11px] text-forest-400">· {product.brand}</span>}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </>
        ) : (
          <div className="py-16 text-center">
            <Search size={36} strokeWidth={1.5} className="mx-auto mb-3 text-forest-500" />
            {loadFailed ? (
              <>
                <p className="font-medium text-forest-50">No se pudo cargar el catálogo</p>
                <button type="button" onClick={clearFilters} className={`mt-3 rounded-full bg-forest-800 px-4 py-2 text-sm font-semibold text-[#a3e635] ${focusRing}`}>
                  Reintentar
                </button>
              </>
            ) : (
              <>
                <p className="font-medium text-forest-50">No se encontraron productos</p>
                <p className="mt-1 text-sm text-forest-300">Prueba con “pollo”, “salmón” o cambia de categoría.</p>
              </>
            )}
          </div>
        )}
      </section>

      {cartError && (
        <p role="alert" className="mt-4 rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {cartError}
        </p>
      )}

      {cartCount > 0 && (
        <div className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+4.5rem)] z-30 px-4">
          <Link
            href="/shopping-list"
            className={`pointer-events-auto mx-auto flex h-12 max-w-2xl items-center justify-between rounded-2xl bg-[#a3e635] px-5 text-[15px] font-bold text-forest-950 shadow-lg ${focusRing}`}
          >
            <span>Ver lista · {productosCount(cartCount)}</span>
            <span>{subtotal > 0 ? euros(subtotal) : ''}</span>
          </Link>
        </div>
      )}

      {detailProduct && (
        <ExploreProductSheet
          product={detailProduct}
          inCartQty={qtyOf(detailProduct)}
          favorite={!!favoriteProductIds[detailProduct.id]}
          onToggleFavorite={() => toggleFavorite(detailProduct.id)}
          onAdd={quantity => changeQuantity(detailProduct, quantity)}
          onClose={() => setDetailProduct(null)}
        />
      )}
    </main>
  )
}
