'use client'
import { useEffect, useState, useCallback } from 'react'
import type { MercadonaProduct as MercadonaResult } from '@/lib/mercadona'

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

type NutritionModal = {
  name: string
  imageUrl: string | null
  ketoScore: number
  category: string
  unitPrice: number | null
  mercadonaId: string | null
  carbs: number | null
  fat: number | null
  protein: number | null
  calories: number | null
  ingredients?: string
  allergens?: string
  nutritionSource?: 'openfoodfacts' | 'category'
}

const KETO_SCORE_LABEL: Record<number, { label: string; color: string; hex: string; desc: string }> = {
  5: { label: 'Muy keto', color: 'text-green-400', hex: '#a3e635', desc: 'Carne, pescado, huevos, aceites — base de la dieta keto' },
  4: { label: 'Keto', color: 'text-lime-400', hex: '#a3e635', desc: 'Lácteos, verduras bajas en carbos, frutos secos' },
  3: { label: 'Low carb', color: 'text-yellow-400', hex: '#f59e0b', desc: 'Usar con moderación. Revisar etiqueta' },
  2: { label: 'Dudoso', color: 'text-orange-400', hex: '#f97316', desc: 'Puede tener azúcares ocultos o almidón' },
  1: { label: 'Poco keto', color: 'text-red-400', hex: '#ef4444', desc: 'Alto en carbohidratos, evitar en keto estricto' },
  0: { label: 'No keto', color: 'text-red-600', hex: '#ef4444', desc: 'Pan, pasta, azúcar, cereales — no compatibles' },
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
  const [modal, setModal] = useState<NutritionModal | null>(null)
  const [loadingNutrition, setLoadingNutrition] = useState(false)

  // Manual add
  const [showManual, setShowManual] = useState(false)
  const [manualName, setManualName] = useState('')

  const fetchPantry = useCallback(async () => {
    const res = await fetch('/api/pantry')
    const data = await res.json()
    setPantryItems(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchPantry() }, [fetchPantry])

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
      body: JSON.stringify({ productId: saved.id }),
    })
    setManualName('')
    setShowManual(false)
    await fetchPantry()
  }

  // Open nutrition modal — fetch full detail if Mercadona product
  const handleOpenNutrition = async (item: PantryItem) => {
    const p = item.product
    const base: NutritionModal = {
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

  if (loading) return <div className="p-4" style={{ color: '#547856' }}>Cargando...</div>

  const ketoInfo = KETO_SCORE_LABEL[modal?.ketoScore ?? 3]

  return (
    <main className="px-4 pt-4 pb-4">
      {/* Nutrition modal */}
      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: 'rgba(6,14,7,0.92)' }}
          onClick={() => setModal(null)}
        >
          <div
            className="w-full max-w-2xl p-5 max-h-[80vh] overflow-y-auto"
            style={{ background: '#0c1a0d', borderTop: '1px solid #1c321d', borderRadius: '1.25rem 1.25rem 0 0' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start gap-4 mb-5">
              {modal.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={modal.imageUrl} alt={modal.name} className="w-16 h-16 rounded-2xl object-cover flex-shrink-0" />
              )}
              <div className="flex-1">
                <h2 className="font-bold text-lg leading-tight" style={{ fontFamily: 'Syne, sans-serif', color: '#ecf5e0' }}>
                  {modal.name}
                </h2>
                {modal.unitPrice && (
                  <p className="font-semibold mt-0.5" style={{ color: '#f59e0b' }}>{modal.unitPrice.toFixed(2)}€</p>
                )}
              </div>
              <button onClick={() => setModal(null)} className="text-2xl leading-none" style={{ color: '#3b5e3c' }}>×</button>
            </div>

            {/* Keto score */}
            <div className="rounded-2xl p-4 mb-4" style={{ background: '#142514' }}>
              <div className="flex items-center gap-3 mb-1">
                <span className="text-2xl font-bold" style={{ fontFamily: 'Syne, sans-serif', color: KETO_SCORE_LABEL[modal.ketoScore]?.hex ?? '#a3e635' }}>
                  {modal.ketoScore}/5
                </span>
                <span className="font-semibold" style={{ color: KETO_SCORE_LABEL[modal.ketoScore]?.hex ?? '#a3e635' }}>
                  {ketoInfo?.label}
                </span>
                <span className="text-xs ml-auto" style={{ color: '#3b5e3c' }}>
                  {modal.nutritionSource === 'openfoodfacts' ? '📊 Open Food Facts' : `${CATEGORY_EMOJI[modal.category]} categoría`}
                </span>
              </div>
              <p className="text-sm" style={{ color: '#547856' }}>{ketoInfo?.desc}</p>
            </div>

            {/* Macros */}
            {(modal.carbs != null || modal.fat != null || modal.protein != null) && (
              <div className="rounded-2xl p-4 mb-4" style={{ background: '#142514' }}>
                <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#3b5e3c' }}>
                  por 100g
                </p>
                <div className="grid grid-cols-4 gap-2 text-center">
                  {modal.carbs != null && (
                    <div>
                      <div className="text-xl font-bold" style={{ fontFamily: 'Syne, sans-serif', color: '#f97316' }}>
                        {modal.carbs.toFixed(1)}
                        <span className="text-xs font-normal">g</span>
                      </div>
                      <div className="text-xs mt-0.5" style={{ color: '#3b5e3c' }}>Carbos</div>
                    </div>
                  )}
                  {modal.fat != null && (
                    <div>
                      <div className="text-xl font-bold" style={{ fontFamily: 'Syne, sans-serif', color: '#f59e0b' }}>
                        {modal.fat.toFixed(1)}
                        <span className="text-xs font-normal">g</span>
                      </div>
                      <div className="text-xs mt-0.5" style={{ color: '#3b5e3c' }}>Grasa</div>
                    </div>
                  )}
                  {modal.protein != null && (
                    <div>
                      <div className="text-xl font-bold" style={{ fontFamily: 'Syne, sans-serif', color: '#60a5fa' }}>
                        {modal.protein.toFixed(1)}
                        <span className="text-xs font-normal">g</span>
                      </div>
                      <div className="text-xs mt-0.5" style={{ color: '#3b5e3c' }}>Proteína</div>
                    </div>
                  )}
                  {modal.calories != null && (
                    <div>
                      <div className="text-xl font-bold" style={{ fontFamily: 'Syne, sans-serif', color: '#ecf5e0' }}>
                        {Math.round(modal.calories)}
                      </div>
                      <div className="text-xs mt-0.5" style={{ color: '#3b5e3c' }}>kcal</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {loadingNutrition ? (
              <p className="text-sm text-center py-4" style={{ color: '#3b5e3c' }}>Cargando info nutricional...</p>
            ) : (
              <>
                {modal.ingredients && (
                  <div className="mb-4">
                    <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#3b5e3c' }}>Ingredientes</p>
                    <p className="text-sm leading-relaxed" style={{ color: '#7a9e7c' }}>{modal.ingredients}</p>
                  </div>
                )}
                {modal.allergens && (
                  <div className="mb-4 rounded-xl p-3" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
                    <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#f59e0b' }}>⚠️ Alérgenos</p>
                    <p className="text-sm" style={{ color: '#fbbf24' }}>{modal.allergens}</p>
                  </div>
                )}
                {!modal.ingredients && !modal.allergens && modal.mercadonaId && (
                  <p className="text-sm text-center py-2" style={{ color: '#264227' }}>Sin información nutricional disponible</p>
                )}
                {!modal.mercadonaId && (
                  <p className="text-sm text-center py-2" style={{ color: '#264227' }}>Producto añadido manualmente</p>
                )}
              </>
            )}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between pt-2 pb-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'Syne, sans-serif', color: '#ecf5e0' }}>
            Mi despensa
          </h1>
          <p className="text-sm mt-0.5" style={{ color: '#547856' }}>{pantryItems.length} productos</p>
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
        <div className="rounded-2xl p-4 mb-4 flex gap-2" style={{ background: '#142514', border: '1px solid #1c321d' }}>
          <input
            className="flex-1 rounded-xl px-3 py-2 text-sm outline-none"
            style={{ background: '#1c321d', color: '#ecf5e0' }}
            placeholder="Nombre del producto"
            value={manualName}
            onChange={e => setManualName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddManual()}
            autoFocus
          />
          <button
            onClick={handleAddManual}
            className="rounded-xl px-4 text-sm font-semibold"
            style={{ background: '#a3e635', color: '#060e07' }}
          >
            Añadir
          </button>
        </div>
      )}

      {/* Mercadona search */}
      <div className="rounded-2xl p-4 mb-6" style={{ background: '#142514', border: '1px solid #1c321d' }}>
        <p className="text-sm font-semibold mb-3" style={{ color: '#ecf5e0' }}>🔍 Buscar en Mercadona</p>
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
                  {p.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.imageUrl} alt={p.name} className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate" style={{ color: '#ecf5e0' }}>{p.name}</div>
                    <div className="text-xs flex gap-2 mt-0.5">
                      {p.unitPrice && <span className="font-medium" style={{ color: '#f59e0b' }}>{p.unitPrice.toFixed(2)}€</span>}
                      <span style={{ color: KETO_SCORE_LABEL[p.ketoScore]?.hex ?? '#547856' }}>
                        {score?.label}
                      </span>
                    </div>
                  </div>
                  {alreadyInPantry ? (
                    <button
                      onClick={() => pantryItem && handleRemoveFromPantry(pantryItem.id)}
                      disabled={removingId === pantryItem?.id}
                      className="text-xs flex-shrink-0 font-semibold transition-colors"
                      style={{ color: '#a3e635' }}
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
          <p className="text-xs mt-3 text-center" style={{ color: '#264227' }}>Sin resultados</p>
        )}
      </div>

      {/* Pantry items grouped by category */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: '#3b5e3c' }}>En casa</p>
        {pantryItems.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-4xl mb-3">🧺</p>
            <p className="font-semibold" style={{ color: '#547856' }}>Despensa vacía</p>
            <p className="text-sm mt-1" style={{ color: '#3b5e3c' }}>Busca productos en Mercadona para añadirlos</p>
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
                <p className="text-xs font-semibold uppercase tracking-widest mb-2 flex items-center gap-1.5" style={{ color: '#3b5e3c' }}>
                  <span>{CATEGORY_EMOJI[category] ?? '🍽️'}</span>
                  <span>{category}</span>
                  <span style={{ color: '#264227' }}>({items.length})</span>
                </p>
                <div className="space-y-2">
                  {items.map(item => {
                    const ketoColor = KETO_SCORE_LABEL[item.product.ketoScore]?.hex ?? '#547856'
                    const score = KETO_SCORE_LABEL[item.product.ketoScore]
                    return (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 rounded-xl p-3"
                        style={{ background: '#142514', border: '1px solid #1c321d' }}
                      >
                        <button onClick={() => handleOpenNutrition(item)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
                          {item.product.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={item.product.imageUrl} alt={item.product.name} className="w-10 h-10 rounded-xl object-cover flex-shrink-0" />
                          ) : (
                            <div
                              className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                              style={{ background: '#1c321d' }}
                            >
                              {CATEGORY_EMOJI[item.product.category] ?? '🍽️'}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate" style={{ color: '#ecf5e0' }}>
                              {item.product.name}
                            </div>
                            <div className="text-xs flex gap-2 mt-0.5">
                              {item.product.unitPrice && (
                                <span style={{ color: '#f59e0b' }}>{item.product.unitPrice.toFixed(2)}€</span>
                              )}
                              <span style={{ color: ketoColor }}>{score?.label}</span>
                            </div>
                          </div>
                          <span className="text-xs flex-shrink-0" style={{ color: '#264227' }}>›</span>
                        </button>
                        <button
                          onClick={() => handleRemoveFromPantry(item.id)}
                          disabled={removingId === item.id}
                          className="text-xl flex-shrink-0 pl-2 leading-none transition-colors"
                          style={{ color: '#264227' }}
                          onMouseEnter={e => { (e.target as HTMLElement).style.color = '#ef4444' }}
                          onMouseLeave={e => { (e.target as HTMLElement).style.color = '#264227' }}
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
    </main>
  )
}
