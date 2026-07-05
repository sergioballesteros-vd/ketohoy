'use client'
import Image from 'next/image'
import { useEffect, useState, useCallback, useRef } from 'react'
import type { MercadonaProduct as MercadonaResult } from '@/lib/mercadona'
import ProductDetailModal from '@/components/ProductDetailModal'

import InventoryNutritionModal, { type InventoryNutritionModalData } from '@/components/InventoryNutritionModal'

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
  netCarbsPer100g: number | null
  fatPer100g: number | null
  proteinPer100g: number | null
  caloriesPer100g: number | null
}

type PantryItem = {
  id: string
  productId: string
  product: Product
}

async function loadPantryItems() {
  const res = await fetch('/api/pantry')
  const data = await res.json()
  return Array.isArray(data) ? data : []
}

const KETO_SCORE_LABEL: Record<number, { label: string; className: string; desc: string }> = {
  5: { label: 'Muy keto', className: 'text-[#a3e635]', desc: 'Carne, pescado, huevos, aceites — base de la dieta keto' },
  4: { label: 'Keto', className: 'text-[#a3e635]', desc: 'Lácteos, verduras bajas en carbos, frutos secos' },
  3: { label: 'Low carb', className: 'text-[#f59e0b]', desc: 'Usar con moderación. Revisar etiqueta' },
  2: { label: 'Dudoso', className: 'text-[#f97316]', desc: 'Puede tener azúcares ocultos o almidón' },
  1: { label: 'Poco keto', className: 'text-[#ef4444]', desc: 'Alto en carbohidratos, evitar en keto estricto' },
  0: { label: 'No keto', className: 'text-[#ef4444]', desc: 'Pan, pasta, azúcar, cereales — no compatibles' },
}

const CATEGORY_EMOJI: Record<string, string> = {
  meat: '🥩', fish: '🐟', eggs: '🥚', dairy: '🧀',
  vegetables: '🥦', fruit: '🍓', nuts: '🌰', oils: '🫒',
  sauces: '🥫', drinks: '🥤', other: '🍽️',
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
  const [modal, setModal] = useState<InventoryNutritionModalData | null>(null)
  const [loadingNutrition, setLoadingNutrition] = useState(false)
  const [detailProduct, setDetailProduct] = useState<MercadonaResult | null>(null)
  const modalCloseRef = useRef<HTMLButtonElement | null>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  // Manual add
  const [showManual, setShowManual] = useState(false)
  const [manualName, setManualName] = useState('')
  const [manualQty, setManualQty] = useState('')
  const [manualUnit, setManualUnit] = useState('ud')

  const fetchPantry = useCallback(async () => {
    const data = await loadPantryItems()
    setPantryItems(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    void (async () => {
      const data = await loadPantryItems()
      setPantryItems(data)
      setLoading(false)
    })()
  }, [])

  useEffect(() => {
    if (!modal) return
    previousFocusRef.current = document.activeElement as HTMLElement | null
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setModal(null)
    }
    window.addEventListener('keydown', onKeyDown)
    queueMicrotask(() => modalCloseRef.current?.focus())
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      previousFocusRef.current?.focus?.()
    }
  }, [modal])

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
    await fetch('/api/mercadona/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mercadonaId: p.id.replace('mercadona_', ''),
        addToPantry: true,
      }),
    })
    setAddingId(null)
    setMercadonaResults([])
    setMercadonaSearched(false)
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
      body: JSON.stringify({
        productId: saved.id,
        quantity: manualQty ? parseFloat(manualQty) : null,
        unit: manualUnit !== 'ud' ? manualUnit : null,
      }),
    })
    setManualName('')
    setManualQty('')
    setManualUnit('ud')
    setShowManual(false)
    await fetchPantry()
  }

  // Open nutrition modal — fetch full detail if Mercadona product
  const handleOpenNutrition = async (item: PantryItem) => {
    const p = item.product
    const base: InventoryNutritionModalData = {
      name: p.name,
      imageUrl: p.imageUrl,
      ketoScore: p.ketoScore,
      category: p.category,
      unitPrice: p.unitPrice,
      mercadonaId: p.mercadonaId,
      carbs: p.netCarbsPer100g,
      fat: p.fatPer100g,
      protein: p.proteinPer100g,
      calories: p.caloriesPer100g,
    }
    setModal(base)
    if (p.mercadonaId) {
      setLoadingNutrition(true)
      const res = await fetch(`/api/mercadona/product/${p.mercadonaId}`)
      if (res.ok) {
        const detail = await res.json()
        setModal({
          ...base,
          ingredients: detail.ingredients,
          allergens: detail.allergens,
          nutritionSource: base.carbs != null ? 'openfoodfacts' : 'category',
        })
      }
      setLoadingNutrition(false)
    }
  }

  if (loading) return <div className="p-4 text-[#547856]">Cargando...</div>

  const ketoInfo = KETO_SCORE_LABEL[modal?.ketoScore ?? 3]

  return (
    <main className="px-4 pt-4 pb-4">
      <InventoryNutritionModal
        modal={modal}
        loadingNutrition={loadingNutrition}
        ketoInfo={ketoInfo}
        categoryEmoji={CATEGORY_EMOJI}
        onClose={() => setModal(null)}
        closeButtonRef={modalCloseRef}
      />

      <div className="flex items-center justify-between pt-2 pb-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'Syne, sans-serif', color: '#ecf5e0' }}>
            Mi despensa
          </h1>
          <p className="text-sm mt-0.5 text-[#547856]">{pantryItems.length} productos</p>
        </div>
        <button
          onClick={() => setShowManual(!showManual)}
          className="text-sm font-medium px-3 py-1.5 rounded-xl transition-colors"
          style={{ background: '#142514', color: '#7a9e7c', border: '1px solid #1c321d' }}
        >
          + Manual
        </button>
      </div>

      {showManual && (
        <div className="rounded-2xl p-4 mb-4" style={{ background: '#142514', border: '1px solid #1c321d' }}>
          <input
            className="w-full rounded-xl px-3 py-2 text-sm outline-none mb-2"
            style={{ background: '#1c321d', color: '#ecf5e0' }}
            placeholder="Nombre del producto"
            value={manualName}
            onChange={e => setManualName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddManual()}
            autoFocus
          />
          <div className="flex gap-2">
            <input
              className="w-20 rounded-xl px-3 py-2 text-sm outline-none"
              style={{ background: '#1c321d', color: '#ecf5e0' }}
              placeholder="Cant."
              type="number"
              min="0"
              step="0.5"
              value={manualQty}
              onChange={e => setManualQty(e.target.value)}
            />
            <select
              className="flex-1 rounded-xl px-3 py-2 text-sm outline-none"
              style={{ background: '#1c321d', color: '#ecf5e0' }}
              value={manualUnit}
              onChange={e => setManualUnit(e.target.value)}
            >
              <option value="ud">ud</option>
              <option value="g">g</option>
              <option value="kg">kg</option>
              <option value="ml">ml</option>
              <option value="l">l</option>
              <option value="paquete">paquete</option>
            </select>
            <button
              onClick={handleAddManual}
              className="rounded-xl px-4 text-sm font-semibold"
              style={{ background: '#a3e635', color: '#060e07' }}
            >
              Añadir
            </button>
          </div>
        </div>
      )}

      {/* Mercadona search */}
      <div className="rounded-2xl p-4 mb-6" style={{ background: '#142514', border: '1px solid #1c321d' }}>
        <p className="text-sm font-semibold mb-3 text-[#ecf5e0]">🔍 Buscar en Mercadona</p>
        <div className="flex gap-2">
          <input
            className="flex-1 rounded-xl px-3 py-2 text-sm outline-none"
            style={{ background: '#1c321d', color: '#ecf5e0' }}
            placeholder="ej: huevos, salmón, queso..."
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
            {mercadonaResults.map(p => {
              const mercId = p.id.replace('mercadona_', '')
              const alreadyInPantry = pantryMercadonaIds.has(mercId)
              const pantryItem = pantryItems.find(i => i.product.mercadonaId === mercId)
              const score = KETO_SCORE_LABEL[p.ketoScore]
              return (
                <div key={p.id} className="flex items-center gap-3 rounded-xl p-3" style={{ background: '#1c321d' }}>
                  <button
                    className="flex items-center gap-3 flex-1 min-w-0 text-left"
                    onClick={() => setDetailProduct(p)}
                  >
                  {p.imageUrl && (
                    <Image src={p.imageUrl} alt={p.name} width={48} height={48} className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate text-[#ecf5e0]">{p.name}</div>
                    <div className="text-xs flex gap-2 mt-0.5">
                      {p.unitPrice && <span className="font-medium text-[#f59e0b]">{p.unitPrice.toFixed(2)}€</span>}
                      <span className={KETO_SCORE_LABEL[p.ketoScore]?.className ?? 'text-[#547856]'}>
                        {score?.label}
                      </span>
                    </div>
                  </div>
                  </button>
                  {alreadyInPantry ? (
                    <button
                      onClick={() => pantryItem && handleRemoveFromPantry(pantryItem.id)}
                      disabled={removingId === pantryItem?.id}
                      className="text-xs flex-shrink-0 font-semibold transition-colors text-[#a3e635] hover:text-red-500"
                    >
                      ✓ En despensa
                    </button>
                  ) : (
                    <button
                      onClick={() => handleAddMercadona(p)}
                      disabled={addingId === p.id}
                      className="text-xs px-3 py-1.5 rounded-xl flex-shrink-0 font-semibold disabled:opacity-50"
                      style={{ background: '#a3e635', color: '#060e07' }}
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
          <p className="text-xs mt-3 text-center text-[#264227]">Sin resultados</p>
        )}
      </div>

      {/* Pantry items grouped by category */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest mb-4 text-[#3b5e3c]">En casa</p>
        {pantryItems.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-4xl mb-3">🧺</p>
            <p className="font-semibold text-[#547856]">Despensa vacía</p>
            <p className="text-sm mt-1 text-[#3b5e3c]">Busca productos en Mercadona para añadirlos</p>
          </div>
        ) : (
          <div className="space-y-5">
            {Object.entries(
              pantryItems.reduce<Record<string, PantryItem[]>>((acc, item) => {
                const cat = item.product.category
                ;(acc[cat] ??= []).push(item)
                return acc
              }, {})
            ).map(([category, items]) => (
              <div key={category}>
                <p className="text-xs font-semibold uppercase tracking-widest mb-2 flex items-center gap-1.5 text-[#3b5e3c]">
                  <span>{CATEGORY_EMOJI[category] ?? '🍽️'}</span>
                  <span>{category}</span>
                  <span className="text-[#264227]">({items.length})</span>
                </p>
                <div className="space-y-2">
                  {items.map(item => {
                    const ketoColor = KETO_SCORE_LABEL[item.product.ketoScore]?.className ?? 'text-[#547856]'
                    const score = KETO_SCORE_LABEL[item.product.ketoScore]
                    return (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 rounded-xl p-3"
                        style={{ background: '#142514', border: '1px solid #1c321d' }}
                      >
                        <button onClick={() => handleOpenNutrition(item)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
                          {item.product.imageUrl ? (
                            <Image src={item.product.imageUrl} alt={item.product.name} width={40} height={40} className="w-10 h-10 rounded-xl object-cover flex-shrink-0" />
                          ) : (
                            <div
                              className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                              style={{ background: '#1c321d' }}
                            >
                              {CATEGORY_EMOJI[item.product.category] ?? '🍽️'}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate text-[#ecf5e0]">
                              {item.product.name}
                            </div>
                            <div className="text-xs flex gap-2 mt-0.5">
                              {item.product.unitPrice && (
                                <span className="text-[#f59e0b]">{item.product.unitPrice.toFixed(2)}€</span>
                              )}
                              <span className={ketoColor}>{score?.label}</span>
                            </div>
                          </div>
                          <span className="text-xs flex-shrink-0 text-[#264227]">›</span>
                        </button>
                        <button
                          onClick={() => handleRemoveFromPantry(item.id)}
                          disabled={removingId === item.id}
                          className="text-xl flex-shrink-0 pl-2 leading-none transition-colors text-[#264227] hover:text-red-500"
                        >
                          ×
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ProductDetailModal
        product={detailProduct}
        onClose={() => setDetailProduct(null)}
        onAddToPantry={detailProduct ? async () => { await handleAddMercadona(detailProduct) } : undefined}
      />
    </main>
  )
}
