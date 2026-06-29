'use client'
import { useEffect, useState, useCallback } from 'react'

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

type MercadonaResult = {
  id: string
  name: string
  brand: string
  category: string
  ketoScore: number
  mercadonaId: string | null
  unitPrice: number | null
  referencePrice: string | null
  imageUrl: string | null
  tags: string
  ingredients?: string
  allergens?: string
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

const KETO_SCORE_LABEL: Record<number, { label: string; color: string; desc: string }> = {
  5: { label: 'Muy keto', color: 'text-green-400', desc: 'Carne, pescado, huevos, aceites — base de la dieta keto' },
  4: { label: 'Keto', color: 'text-lime-400', desc: 'Lácteos, verduras bajas en carbos, frutos secos' },
  3: { label: 'Low carb', color: 'text-yellow-400', desc: 'Usar con moderación. Revisar etiqueta' },
  2: { label: 'Dudoso', color: 'text-orange-400', desc: 'Puede tener azúcares ocultos o almidón' },
  1: { label: 'Poco keto', color: 'text-red-400', desc: 'Alto en carbohidratos, evitar en keto estricto' },
  0: { label: 'No keto', color: 'text-red-600', desc: 'Pan, pasta, azúcar, cereales — no compatibles' },
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

  if (loading) return <div className="p-4 text-gray-500">Cargando...</div>

  const ketoInfo = KETO_SCORE_LABEL[modal?.ketoScore ?? 3]

  return (
    <main className="p-4">
      {/* Nutrition modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-end justify-center" onClick={() => setModal(null)}>
          <div
            className="bg-gray-900 rounded-t-2xl w-full max-w-2xl p-5 max-h-[80vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start gap-4 mb-4">
              {modal.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={modal.imageUrl} alt={modal.name} className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
              )}
              <div className="flex-1">
                <h2 className="font-bold text-lg leading-tight">{modal.name}</h2>
                {modal.unitPrice && <p className="text-green-400 font-medium">{modal.unitPrice.toFixed(2)}€</p>}
              </div>
              <button onClick={() => setModal(null)} className="text-gray-500 text-2xl leading-none">×</button>
            </div>

            {/* Keto score */}
            <div className="bg-gray-800 rounded-xl p-4 mb-4">
              <div className="flex items-center gap-3 mb-1">
                <span className={`text-2xl font-bold ${ketoInfo?.color}`}>{modal.ketoScore}/5</span>
                <span className={`font-semibold ${ketoInfo?.color}`}>{ketoInfo?.label}</span>
                <span className="text-xs text-gray-600 ml-auto">
                  {modal.nutritionSource === 'openfoodfacts' ? '📊 Open Food Facts' : `${CATEGORY_EMOJI[modal.category]} categoría`}
                </span>
              </div>
              <p className="text-sm text-gray-400">{ketoInfo?.desc}</p>
            </div>

            {/* Macros */}
            {(modal.carbs != null || modal.fat != null || modal.protein != null) && (
              <div className="bg-gray-800 rounded-xl p-4 mb-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Valores por 100g</p>
                <div className="grid grid-cols-4 gap-2 text-center">
                  {modal.carbs != null && (
                    <div>
                      <div className="text-lg font-bold text-orange-400">{modal.carbs.toFixed(1)}g</div>
                      <div className="text-xs text-gray-500">Carbos</div>
                    </div>
                  )}
                  {modal.fat != null && (
                    <div>
                      <div className="text-lg font-bold text-yellow-400">{modal.fat.toFixed(1)}g</div>
                      <div className="text-xs text-gray-500">Grasa</div>
                    </div>
                  )}
                  {modal.protein != null && (
                    <div>
                      <div className="text-lg font-bold text-blue-400">{modal.protein.toFixed(1)}g</div>
                      <div className="text-xs text-gray-500">Proteína</div>
                    </div>
                  )}
                  {modal.calories != null && (
                    <div>
                      <div className="text-lg font-bold text-gray-300">{Math.round(modal.calories)}</div>
                      <div className="text-xs text-gray-500">kcal</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {loadingNutrition ? (
              <p className="text-gray-500 text-sm text-center py-4">Cargando info nutricional...</p>
            ) : (
              <>
                {modal.ingredients && (
                  <div className="mb-4">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Ingredientes</p>
                    <p className="text-sm text-gray-300 leading-relaxed">{modal.ingredients}</p>
                  </div>
                )}
                {modal.allergens && (
                  <div className="mb-4">
                    <p className="text-xs font-semibold text-yellow-500 uppercase tracking-wide mb-1">⚠️ Alérgenos</p>
                    <p className="text-sm text-yellow-200">{modal.allergens}</p>
                  </div>
                )}
                {!modal.ingredients && !modal.allergens && modal.mercadonaId && (
                  <p className="text-gray-600 text-sm text-center py-2">Sin información nutricional disponible</p>
                )}
                {!modal.mercadonaId && (
                  <p className="text-gray-600 text-sm text-center py-2">Producto añadido manualmente — sin datos de Mercadona</p>
                )}
              </>
            )}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between pt-4 pb-4">
        <div>
          <h1 className="text-xl font-bold">Mi despensa</h1>
          <p className="text-sm text-gray-400">{pantryItems.length} productos</p>
        </div>
        <button
          onClick={() => setShowManual(!showManual)}
          className="bg-gray-800 hover:bg-gray-700 text-white px-3 py-1.5 rounded-lg text-sm"
        >
          + Manual
        </button>
      </div>

      {showManual && (
        <div className="bg-gray-900 rounded-xl p-4 mb-4 flex gap-2">
          <input
            className="flex-1 bg-gray-800 rounded-lg px-3 py-2 text-sm"
            placeholder="Nombre del producto"
            value={manualName}
            onChange={e => setManualName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddManual()}
            autoFocus
          />
          <button onClick={handleAddManual} className="bg-green-700 hover:bg-green-600 rounded-lg px-4 text-sm">
            Añadir
          </button>
        </div>
      )}

      {/* Mercadona search */}
      <div className="bg-gray-900 rounded-xl p-4 mb-6">
        <p className="text-sm font-medium mb-3">🔍 Buscar en Mercadona</p>
        <div className="flex gap-2">
          <input
            className="flex-1 bg-gray-800 rounded-lg px-3 py-2 text-sm"
            placeholder="ej: huevos, salmón, queso..."
            value={mercadonaQuery}
            onChange={e => setMercadonaQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleMercadonaSearch()}
          />
          <button
            onClick={handleMercadonaSearch}
            disabled={mercadonaLoading}
            className="bg-orange-600 hover:bg-orange-500 disabled:opacity-50 rounded-lg px-4 text-sm font-medium"
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
                <div key={p.id} className="flex items-center gap-3 bg-gray-800 rounded-xl p-3">
                  {p.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.imageUrl} alt={p.name} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{p.name}</div>
                    <div className="text-xs flex gap-2 mt-0.5">
                      {p.unitPrice && <span className="text-green-400 font-medium">{p.unitPrice.toFixed(2)}€</span>}
                      <span className={score?.color ?? 'text-gray-500'}>keto {p.ketoScore}/5 · {score?.label}</span>
                    </div>
                  </div>
                  {alreadyInPantry ? (
                    <button
                      onClick={() => pantryItem && handleRemoveFromPantry(pantryItem.id)}
                      disabled={removingId === pantryItem?.id}
                      className="text-green-400 text-xs flex-shrink-0 hover:text-red-400 transition-colors"
                    >
                      ✓ En despensa
                    </button>
                  ) : (
                    <button
                      onClick={() => handleAddMercadona(p)}
                      disabled={addingId === p.id}
                      className="bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white text-xs px-3 py-1.5 rounded-lg flex-shrink-0"
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
          <p className="text-xs text-gray-600 mt-3 text-center">Sin resultados</p>
        )}
      </div>

      {/* Pantry items */}
      <div>
        <p className="text-sm font-medium text-gray-400 mb-3">En casa</p>
        {pantryItems.length === 0 ? (
          <div className="text-center py-10 text-gray-600">
            <p className="text-3xl mb-2">🧺</p>
            <p className="text-sm">Despensa vacía</p>
            <p className="text-xs mt-1">Busca productos en Mercadona para añadirlos</p>
          </div>
        ) : (
          <div className="space-y-2">
            {pantryItems.map(item => {
              const score = KETO_SCORE_LABEL[item.product.ketoScore]
              return (
                <div key={item.id} className="flex items-center gap-3 bg-gray-900 rounded-xl p-3">
                  <button onClick={() => handleOpenNutrition(item)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
                    {item.product.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.product.imageUrl} alt={item.product.name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center text-lg flex-shrink-0">
                        {CATEGORY_EMOJI[item.product.category] ?? '🍽️'}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{item.product.name}</div>
                      <div className="text-xs flex gap-2 mt-0.5">
                        {item.product.unitPrice && (
                          <span className="text-green-400">{item.product.unitPrice.toFixed(2)}€</span>
                        )}
                        <span className={score?.color ?? 'text-gray-500'}>
                          keto {item.product.ketoScore}/5 · {score?.label}
                        </span>
                      </div>
                    </div>
                    <span className="text-gray-600 text-xs flex-shrink-0">ℹ️</span>
                  </button>
                  <button
                    onClick={() => handleRemoveFromPantry(item.id)}
                    disabled={removingId === item.id}
                    className="text-gray-600 hover:text-red-400 transition-colors text-lg flex-shrink-0 pl-2"
                  >
                    ×
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
