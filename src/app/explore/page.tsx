'use client'
export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { Beef, Carrot, ChevronRight, Egg, Fish, Heart, Milk, Minus, Nut, Plus, Search, Sparkles, UtensilsCrossed, Droplets, X } from 'lucide-react'
import type { MercadonaProduct as MercadonaResult } from '@/lib/mercadona'
import { parseShoppingQuantity } from '@/lib/shoppingList'

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

const CATEGORIES = [
  { key: 'meat', label: 'Carne', icon: Beef },
  { key: 'fish', label: 'Pescado', icon: Fish },
  { key: 'eggs', label: 'Huevos', icon: Egg },
  { key: 'dairy', label: 'Lácteos', icon: Milk },
  { key: 'vegetables', label: 'Verduras', icon: Carrot },
  { key: 'nuts', label: 'Frutos secos', icon: Nut },
  { key: 'oils', label: 'Aceites', icon: Droplets },
  { key: 'sauces', label: 'Salsas', icon: UtensilsCrossed },
]

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

export default function ExplorePage() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [products, setProducts] = useState<MercadonaResult[]>([])
  const [loading, setLoading] = useState(false)
  const [shoppingItems, setShoppingItems] = useState<ShoppingItem[]>([])
  const [shoppingLoading, setShoppingLoading] = useState(true)
  const [detailProduct, setDetailProduct] = useState<MercadonaResult | null>(null)
  const [draftQuantities, setDraftQuantities] = useState<Record<string, number>>({})

  const loadShoppingList = useCallback(async () => {
    try {
      const res = await fetch('/api/shopping-list')
      const data = await res.json()
      setShoppingItems(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error(error)
      setShoppingItems([])
    } finally {
      setShoppingLoading(false)
    }
  }, [])

  const loadTrending = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/mercadona/search?q=keto')
      const data = await res.json()
      const list = data.products?.slice(0, 8) ?? []
      setProducts(list)
      setDetailProduct(list[0] ?? null)
    } catch (error) {
      console.error(error)
      setProducts([])
      setDetailProduct(null)
    } finally {
      setLoading(false)
    }
  }, [])

  const loadCategory = useCallback(async (key: string) => {
    setSelectedCategory(key)
    setSelectedSubcategory(null)
    setSearchQuery('')
    setLoading(true)
    try {
      const res = await fetch(`/api/mercadona/category/${key}`)
      const data = await res.json()
      const list = data.products ?? []
      setProducts(list)
      setDetailProduct(list[0] ?? null)
    } catch (error) {
      console.error(error)
      setProducts([])
      setDetailProduct(null)
    } finally {
      setLoading(false)
    }
  }, [])

  const loadSearch = useCallback(async (query: string) => {
    setSearchQuery(query)
    setSelectedCategory(null)
    setSelectedSubcategory(null)
    setLoading(true)
    try {
      const res = await fetch(`/api/mercadona/search?q=${encodeURIComponent(query)}`)
      const data = await res.json()
      const list = data.products ?? []
      setProducts(list)
      setDetailProduct(list[0] ?? null)
    } catch (error) {
      console.error(error)
      setProducts([])
      setDetailProduct(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void (async () => {
      await loadTrending()
      await loadShoppingList()
    })()
  }, [loadTrending, loadShoppingList])

  const visibleProducts = selectedSubcategory
    ? products.filter(product => matchesSubcategory(product, selectedSubcategory))
    : products

  const selectedProduct = detailProduct ?? visibleProducts[0] ?? null
  const selectedQuantity = selectedProduct ? (draftQuantities[selectedProduct.id] ?? 1) : 1

  const shoppingSummary = shoppingItems.filter(item => !item.checked)
  const subtotal = shoppingSummary.reduce((sum, item) => {
    const qty = parseShoppingQuantity(item.quantity, 1)
    return sum + qty * (item.product?.unitPrice ?? 0)
  }, 0)

  const updateDraftQuantity = (productId: string, delta: number) => {
    setDraftQuantities(current => {
      const next = Math.max(1, (current[productId] ?? 1) + delta)
      return { ...current, [productId]: next }
    })
  }

  const setDraftQuantity = (productId: string, quantity: number) => {
    setDraftQuantities(current => ({ ...current, [productId]: Math.max(1, quantity) }))
  }

  const handleAddToCart = async (product: MercadonaResult, quantity: number) => {
    await fetch('/api/mercadona/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mercadonaId: product.mercadonaId,
        addToShoppingList: true,
        quantity,
      }),
    })
    await loadShoppingList()
  }

  const clearFilters = async () => {
    setSelectedCategory(null)
    setSelectedSubcategory(null)
    setSearchQuery('')
    await loadTrending()
  }

  return (
    <main className="px-4 pt-6 pb-24 min-h-screen" style={{ background: 'radial-gradient(circle at top, rgba(163,230,53,0.08), transparent 30%), #081109' }}>
      <div className="sticky top-0 z-10 pb-3" style={{ background: 'linear-gradient(180deg, #081109 88%, transparent 100%)' }}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold mb-0.5 tracking-tight" style={{ fontFamily: 'Syne, sans-serif', color: '#ecf5e0' }}>
              Descubrir
            </h1>
            <p className="text-xs sm:text-sm" style={{ color: '#5f7f5f' }}>
              Explora, ajusta cantidad y añade sin saltar de pantalla.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void clearFilters()}
            className="mt-1 rounded-full px-4 py-2 text-sm font-semibold transition-colors"
            style={{ background: '#142514', color: '#a3e635', border: '1px solid #1c321d' }}
          >
            Ver todos <ChevronRight size={16} className="inline-block" />
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            void loadSearch(searchQuery.trim())
          }}
          className="relative mt-4"
        >
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#a3e635]">
            <Search size={20} />
          </div>
          <input
            type="text"
            className="w-full py-3.5 pl-11 pr-10 rounded-2xl outline-none transition-all duration-300"
            placeholder="Buscar productos keto..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              background: 'rgba(163, 230, 53, 0.05)',
              border: '1px solid rgba(163, 230, 53, 0.2)',
              color: '#ecf5e0',
              backdropFilter: 'blur(12px)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
            }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('')
                void loadTrending()
              }}
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-[#547856] hover:text-[#a3e635] transition-colors"
            >
              <X size={18} />
            </button>
          )}
        </form>
      </div>

      <div className="mb-5 -mx-4 px-4 overflow-x-auto hide-scrollbar">
        <div className="flex gap-3 w-max pb-2">
          {CATEGORIES.map(cat => {
            const Icon = cat.icon
            const active = selectedCategory === cat.key
            return (
              <button
                key={cat.key}
                onClick={() => void loadCategory(cat.key)}
                className="flex flex-col items-center justify-center gap-2 rounded-2xl w-20 h-24 transition-all duration-300 active:scale-95 shrink-0"
                style={active
                  ? { background: '#a3e635', color: '#060e07', boxShadow: '0 8px 16px rgba(163, 230, 53, 0.18)' }
                  : { background: '#142514', border: '1px solid #1c321d', color: '#a3e635' }
                }
              >
                <Icon size={28} strokeWidth={active ? 2.5 : 1.5} />
                <span className="text-[11px] font-medium tracking-wide" style={{ color: active ? '#060e07' : '#ecf5e0' }}>
                  {cat.label}
                </span>
              </button>
            )
          })}
        </div>

        {selectedCategory && SUBCATEGORIES[selectedCategory]?.length > 0 && (
          <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
            {SUBCATEGORIES[selectedCategory].map(sub => {
              const active = selectedSubcategory === sub.key
              return (
                <button
                  key={sub.key}
                  onClick={() => setSelectedSubcategory(active ? null : sub.key)}
                  className="whitespace-nowrap rounded-full px-3 py-2 text-xs font-semibold shrink-0 transition-colors"
                  style={active
                    ? { background: '#a3e635', color: '#060e07' }
                    : { background: '#142514', color: '#ecf5e0', border: '1px solid #1c321d' }}
                >
                  {sub.label}
                </button>
              )
            })}
          </div>
        )}
      </div>

      <section className="mb-6">
        <div className="flex items-end justify-between gap-3 mb-3">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles size={20} className="text-[#a3e635]" />
              <h2 className="text-[17px] font-extrabold tracking-wide uppercase" style={{ color: '#ecf5e0' }}>
                1. Explorar productos
              </h2>
            </div>
            <p className="text-sm mt-1" style={{ color: '#5f7f5f' }}>
              Explora y añade a tu compra
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setDetailProduct(visibleProducts[0] ?? null)
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
            className="rounded-full px-4 py-2 text-sm font-semibold transition-colors"
            style={{ background: '#142514', color: '#a3e635', border: '1px solid #1c321d' }}
          >
            Ver todos <ChevronRight size={16} className="inline-block" />
          </button>
        </div>

        {loading ? (
          <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="w-56 h-[18rem] rounded-[28px] animate-pulse shrink-0" style={{ background: '#142514', border: '1px solid #1c321d' }} />
            ))}
          </div>
        ) : visibleProducts.length > 0 ? (
          <div className="flex gap-3 overflow-x-auto hide-scrollbar snap-x snap-mandatory pb-2">
            {visibleProducts.slice(0, 6).map(product => {
              const qty = draftQuantities[product.id] ?? 1
              return (
                <button
                  key={product.id}
                  onClick={() => setDetailProduct(product)}
                  className="w-56 rounded-[28px] overflow-hidden shrink-0 snap-start text-left transition-transform active:scale-[0.99]"
                  style={{ background: '#111c12', border: '1px solid #1c321d', boxShadow: '0 10px 30px rgba(0,0,0,0.22)' }}
                >
                  <div className="relative bg-black">
                    <div className="absolute top-3 left-3 z-10 rounded-2xl px-2.5 py-1.5" style={{ background: 'rgba(11,20,10,0.88)', border: '1px solid #a3e635' }}>
                      <div className="text-xl leading-none font-black" style={{ color: '#a3e635' }}>
                        {product.ketoScore}
                      </div>
                      <div className="text-[10px] uppercase tracking-widest" style={{ color: '#ecf5e0' }}>
                        Keto
                      </div>
                    </div>
                    <button
                      type="button"
                      className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full flex items-center justify-center"
                      style={{ background: 'rgba(11,20,10,0.72)', border: '1px solid rgba(236,245,224,0.12)', color: '#ecf5e0' }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Heart size={16} />
                    </button>
                    <div className="aspect-[1.1] p-3">
                      {product.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover rounded-[24px]" />
                      ) : (
                        <div className="w-full h-full rounded-[24px]" style={{ background: '#1c321d' }} />
                      )}
                    </div>
                  </div>

                  <div className="p-4 pt-0">
                    <div className="text-[17px] font-semibold leading-tight line-clamp-2" style={{ color: '#ecf5e0' }}>
                      {product.name}
                    </div>
                    <div className="text-sm mt-1" style={{ color: '#889c89' }}>
                      {product.brand}
                    </div>

                    <div className="mt-3">
                      <div className="text-[22px] font-black" style={{ color: '#a3e635' }}>
                        {product.unitPrice != null ? `${product.unitPrice.toFixed(2)} €` : '—'}
                      </div>
                      {product.referencePrice && (
                        <div className="text-xs mt-0.5" style={{ color: '#6f886f' }}>
                          {product.referencePrice}
                        </div>
                      )}
                    </div>

                    <div className="mt-4 flex items-center rounded-full overflow-hidden" style={{ background: '#0d160d', border: '1px solid #223722' }}>
                      <button
                        type="button"
                        className="w-12 h-12 flex items-center justify-center text-2xl"
                        style={{ color: '#a3e635' }}
                        onClick={(e) => {
                          e.stopPropagation()
                          updateDraftQuantity(product.id, -1)
                        }}
                      >
                        <Minus size={18} />
                      </button>
                      <div className="flex-1 text-center">
                        <div className="text-2xl font-extrabold" style={{ color: '#ecf5e0' }}>{qty}</div>
                      </div>
                      <button
                        type="button"
                        className="w-12 h-12 flex items-center justify-center text-2xl"
                        style={{ color: '#a3e635' }}
                        onClick={(e) => {
                          e.stopPropagation()
                          updateDraftQuantity(product.id, 1)
                        }}
                      >
                        <Plus size={18} />
                      </button>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        ) : (
          <div className="rounded-[28px] p-8 text-center" style={{ background: '#111c12', border: '1px solid #1c321d' }}>
            <Search size={44} className="mx-auto mb-3 opacity-25 text-[#a3e635]" />
            <p className="text-[#ecf5e0] font-medium mb-1">No se encontraron productos.</p>
            <p className="text-sm" style={{ color: '#5f7f5f' }}>
              Prueba con &quot;pollo&quot;, &quot;salmón&quot; o cambia de categoría.
            </p>
          </div>
        )}
      </section>

      <section className="mb-6 rounded-[30px] p-4" style={{ background: 'linear-gradient(180deg, rgba(20,37,20,0.96), rgba(15,26,15,0.96))', border: '1px solid #223722', boxShadow: '0 18px 40px rgba(0,0,0,0.2)' }}>
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-[17px] font-extrabold tracking-wide uppercase" style={{ color: '#ecf5e0' }}>
              2. Detalle del producto
            </h2>
            <p className="text-sm mt-1" style={{ color: '#5f7f5f' }}>
              Elige la cantidad que necesitas
            </p>
          </div>
          <button
            type="button"
            onClick={() => setDetailProduct(null)}
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{ background: '#111c12', border: '1px solid #223722', color: '#ecf5e0' }}
          >
            <X size={22} />
          </button>
        </div>

        {selectedProduct ? (
          <>
            <div className="flex gap-4">
              <div className="w-36 shrink-0">
                {selectedProduct.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={selectedProduct.imageUrl} alt={selectedProduct.name} className="w-full aspect-square object-cover rounded-[24px]" />
                ) : (
                  <div className="w-full aspect-square rounded-[24px]" style={{ background: '#111c12' }} />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xl font-extrabold leading-tight" style={{ color: '#ecf5e0' }}>
                  {selectedProduct.name}
                </div>
                <div className="text-sm mt-1" style={{ color: '#889c89' }}>
                  {selectedProduct.brand}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-full px-3 py-1.5 text-sm font-semibold" style={{ background: 'rgba(163,230,53,0.08)', border: '1px solid rgba(163,230,53,0.25)', color: '#a3e635' }}>
                    {selectedProduct.ketoScore} KETO
                  </span>
                  <span className="rounded-full px-3 py-1.5 text-sm" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid #223722', color: '#889c89' }}>
                    {selectedProduct.category}
                  </span>
                </div>
                <div className="mt-4 text-[28px] font-black" style={{ color: '#a3e635' }}>
                  {selectedProduct.unitPrice != null ? `${selectedProduct.unitPrice.toFixed(2)} €` : '—'}
                </div>
                {selectedProduct.referencePrice && (
                  <div className="text-sm mt-0.5" style={{ color: '#6f886f' }}>
                    {selectedProduct.referencePrice}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-5 rounded-[24px] p-4" style={{ background: '#111c12', border: '1px solid #223722' }}>
              <div className="flex items-center justify-between mb-4">
                <div className="text-lg font-semibold" style={{ color: '#ecf5e0' }}>
                  Cantidad
                </div>
                <div className="text-sm" style={{ color: '#889c89' }}>
                  Unidad: {selectedProduct.referencePrice ? 'Paquete' : 'Unidad'}
                </div>
              </div>

              <div className="grid grid-cols-[1fr_1fr] gap-3">
                <div className="rounded-[22px] p-3 flex items-center justify-between" style={{ background: '#0d160d', border: '1px solid #223722' }}>
                  <button
                    type="button"
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ color: '#a3e635' }}
                    onClick={() => setDraftQuantity(selectedProduct.id, selectedQuantity - 1)}
                  >
                    <Minus size={22} />
                  </button>
                  <div className="text-center">
                    <div className="text-4xl font-black leading-none" style={{ color: '#ecf5e0' }}>
                      {selectedQuantity}
                    </div>
                    <div className="text-xs mt-1" style={{ color: '#889c89' }}>
                      {selectedQuantity === 1 ? 'unidad' : 'unidades'}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ color: '#a3e635' }}
                    onClick={() => setDraftQuantity(selectedProduct.id, selectedQuantity + 1)}
                  >
                    <Plus size={22} />
                  </button>
                </div>

                <div className="rounded-[22px] p-4" style={{ background: '#0d160d', border: '1px solid #223722' }}>
                  <div className="text-sm" style={{ color: '#889c89' }}>
                    Total estimado
                  </div>
                  <div className="text-[28px] font-black mt-1" style={{ color: '#a3e635' }}>
                    {selectedProduct.unitPrice != null ? `${(selectedProduct.unitPrice * selectedQuantity).toFixed(2)} €` : '—'}
                  </div>
                  {selectedProduct.unitPrice != null && (
                    <div className="text-xs mt-1" style={{ color: '#889c89' }}>
                      ({selectedQuantity} x {selectedProduct.unitPrice.toFixed(2)} €)
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-3 grid grid-cols-5 gap-2">
                {[1, 2, 3, 4, 5].map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setDraftQuantity(selectedProduct.id, n)}
                    className="rounded-xl py-2 text-sm font-semibold transition-colors"
                    style={selectedQuantity === n
                      ? { background: '#a3e635', color: '#060e07' }
                      : { background: '#111c12', color: '#ecf5e0', border: '1px solid #223722' }}
                  >
                    {n}{n === 5 ? '+' : ''}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => void handleAddToCart(selectedProduct, selectedQuantity)}
                className="mt-4 w-full rounded-[22px] py-4 flex items-center justify-between gap-3"
                style={{ background: '#c7f23a', color: '#09120a' }}
              >
                <span className="flex items-center gap-3 font-bold text-lg">
                  <span className="inline-flex w-8 h-8 items-center justify-center rounded-full bg-[#09120a]/10">
                    <Search size={16} className="opacity-0" />
                  </span>
                  <span>Añadir a compra</span>
                </span>
                <span className="font-black text-lg">
                  {selectedProduct.unitPrice != null ? `${(selectedProduct.unitPrice * selectedQuantity).toFixed(2)} €` : ''}
                </span>
              </button>
            </div>
          </>
        ) : (
          <div className="rounded-[24px] border border-dashed" style={{ borderColor: '#223722', color: '#6f886f' }}>
            <div className="p-6 text-center">
              Selecciona un producto para ver el detalle.
            </div>
          </div>
        )}
      </section>

      <section className="rounded-[30px] p-4" style={{ background: '#111c12', border: '1px solid #223722', boxShadow: '0 18px 40px rgba(0,0,0,0.2)' }}>
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-[17px] font-extrabold tracking-wide uppercase" style={{ color: '#ecf5e0' }}>
              3. Tu lista de compra
            </h2>
            <p className="text-sm mt-1" style={{ color: '#5f7f5f' }}>
              Revisa y ajusta las cantidades
            </p>
          </div>
          <Link
            href="/shopping-list"
            className="rounded-full px-4 py-2 text-sm font-semibold transition-colors"
            style={{ background: '#142514', color: '#a3e635', border: '1px solid #1c321d' }}
          >
            Editar lista <ChevronRight size={16} className="inline-block" />
          </Link>
        </div>

        {shoppingLoading ? (
          <div className="rounded-[24px] h-32 animate-pulse" style={{ background: '#0d160d' }} />
        ) : shoppingSummary.length > 0 ? (
          <div className="rounded-[24px] overflow-hidden" style={{ background: '#0d160d', border: '1px solid #223722' }}>
            {shoppingSummary.slice(0, 3).map(item => {
              const qty = parseShoppingQuantity(item.quantity, 1)
              return (
                <div key={item.id} className="flex items-center gap-3 p-3 border-b border-[#223722] last:border-b-0">
                  <div className="w-10 h-10 rounded-xl bg-[#142514] flex items-center justify-center shrink-0" style={{ border: '1px solid #223722' }}>
                    {item.product?.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.product.imageUrl} alt={item.name} className="w-full h-full object-cover rounded-xl" />
                    ) : (
                      <span className="text-lg">🛒</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate" style={{ color: '#ecf5e0' }}>{item.name}</div>
                    <div className="text-xs mt-0.5" style={{ color: '#889c89' }}>
                      {qty} {qty === 1 ? 'unidad' : 'unidades'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-black" style={{ color: '#a3e635' }}>
                      {item.product?.unitPrice != null ? `${(item.product.unitPrice * qty).toFixed(2)} €` : '—'}
                    </div>
                    {item.product?.unitPrice != null && (
                      <div className="text-xs" style={{ color: '#889c89' }}>
                        {qty} x {item.product.unitPrice.toFixed(2)} €
                      </div>
                    )}
                  </div>
                </div>
              )
            })}

            <div className="flex items-center justify-between gap-3 px-3 py-3">
              <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: '#ecf5e0' }}>
                <span className="text-lg">🛒</span>
                Subtotal
                <span style={{ color: '#889c89' }}>({shoppingSummary.length} productos)</span>
              </div>
              <div className="text-2xl font-black" style={{ color: '#a3e635' }}>
                {subtotal > 0 ? `${subtotal.toFixed(2)} €` : '—'}
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-[24px] p-6 text-center" style={{ background: '#0d160d', border: '1px solid #223722', color: '#6f886f' }}>
            Tu lista está vacía.
          </div>
        )}
      </section>

      {!loading && visibleProducts.length === 0 && (
        <div className="mt-5 rounded-[24px] p-4 text-center" style={{ background: 'rgba(20,37,20,0.72)', border: '1px solid #1c321d' }}>
          <p className="text-sm text-[#ecf5e0] font-medium">No se encontraron productos.</p>
          <p className="text-xs mt-1" style={{ color: '#5f7f5f' }}>
            Prueba con &quot;pollo&quot;, &quot;salmon&quot; o cambia de categoría.
          </p>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </main>
  )
}
