'use client'
import React from 'react'
import type { MercadonaProduct as MercadonaResult } from '@/lib/mercadona'

type Props = {
  product: MercadonaResult | null
  onClose: () => void
  onAddToPantry?: () => Promise<void>
  onAddToShoppingList?: (quantity: number) => Promise<void>
}

const KETO_SCORE_LABEL: Record<number, { label: string; hex: string; desc: string }> = {
  5: { label: 'Muy keto', hex: '#a3e635', desc: 'Carne, pescado, huevos, aceites' },
  4: { label: 'Keto', hex: '#a3e635', desc: 'Lácteos, verduras bajas en carbos, frutos secos' },
  3: { label: 'Low carb', hex: '#f59e0b', desc: 'Usar con moderación' },
  2: { label: 'Dudoso', hex: '#f97316', desc: 'Puede tener azúcares ocultos' },
  1: { label: 'Poco keto', hex: '#ef4444', desc: 'Alto en carbohidratos' },
  0: { label: 'No keto', hex: '#ef4444', desc: 'No compatible con keto' },
}

export default function ProductDetailModal({ product, onClose, onAddToPantry, onAddToShoppingList }: Props) {
  const [detail, setDetail] = React.useState<{ ingredients?: string; allergens?: string } | null>(null)
  const [loadingDetail, setLoadingDetail] = React.useState(false)
  const [addingPantry, setAddingPantry] = React.useState(false)
  const [addingCart, setAddingCart] = React.useState(false)
  const [quantity, setQuantity] = React.useState(1)
  const closeButtonRef = React.useRef<HTMLButtonElement | null>(null)
  const previousFocusRef = React.useRef<HTMLElement | null>(null)

  React.useEffect(() => {
    if (!product?.mercadonaId) return
    let cancelled = false
    void (async () => {
      setDetail(null)
      setLoadingDetail(true)
      setQuantity(1)
      try {
        const r = await fetch(`/api/mercadona/product/${product.mercadonaId}`)
        const data = r.ok ? await r.json() : null
        if (!cancelled) setDetail(data)
      } finally {
        if (!cancelled) setLoadingDetail(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [product?.mercadonaId])

  React.useEffect(() => {
    if (!product) return
    previousFocusRef.current = document.activeElement as HTMLElement | null
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    queueMicrotask(() => closeButtonRef.current?.focus())
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      previousFocusRef.current?.focus?.()
    }
  }, [product, onClose])

  if (!product) return null

  const score = KETO_SCORE_LABEL[product.ketoScore] ?? KETO_SCORE_LABEL[2]

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: 'rgba(6,14,7,0.92)' }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="product-detail-title"
    >
      <div
        className="w-full max-w-2xl p-5 max-h-[85vh] overflow-y-auto"
        style={{ background: '#0c1a0d', borderTop: '1px solid #1c321d', borderRadius: '1.25rem 1.25rem 0 0' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start gap-4 mb-5">
          {product.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.imageUrl} alt={product.name} className="w-16 h-16 rounded-2xl object-cover flex-shrink-0" />
          )}
          <div className="flex-1">
            <h2 id="product-detail-title" className="font-bold text-lg leading-tight" style={{ fontFamily: 'Syne, sans-serif', color: '#ecf5e0' }}>{product.name}</h2>
            {product.unitPrice && <p className="font-semibold mt-0.5" style={{ color: '#f59e0b' }}>{product.unitPrice.toFixed(2)}€</p>}
            {product.referencePrice && <p className="text-xs mt-0.5" style={{ color: '#3b5e3c' }}>{product.referencePrice}</p>}
          </div>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="text-2xl leading-none"
            style={{ color: '#3b5e3c' }}
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>

        {/* Keto score */}
        <div className="rounded-2xl p-4 mb-4" style={{ background: '#142514' }}>
          <div className="flex items-center gap-3 mb-1">
            <span className="text-2xl font-bold" style={{ fontFamily: 'Syne, sans-serif', color: score.hex }}>{product.ketoScore}/5</span>
            <span className="font-semibold" style={{ color: score.hex }}>{score.label}</span>
          </div>
          <p className="text-sm" style={{ color: '#547856' }}>{score.desc}</p>
        </div>

        {/* Ingredients/allergens */}
        {loadingDetail ? (
          <p className="text-sm text-center py-4" style={{ color: '#3b5e3c' }}>Cargando info...</p>
        ) : (
          <>
            {detail?.ingredients && (
              <div className="mb-4">
                <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#3b5e3c' }}>Ingredientes</p>
                <p className="text-sm leading-relaxed" style={{ color: '#7a9e7c' }}>{detail.ingredients}</p>
              </div>
            )}
            {detail?.allergens && (
              <div className="mb-4 rounded-xl p-3" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
                <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#f59e0b' }}>⚠️ Alérgenos</p>
                <p className="text-sm" style={{ color: '#fbbf24' }}>{detail.allergens}</p>
              </div>
            )}
          </>
        )}

        {/* Action buttons */}
        {onAddToShoppingList && (
          <div className="rounded-2xl p-4 mb-4" style={{ background: '#142514', border: '1px solid #1c321d' }}>
            <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#3b5e3c' }}>
              Cantidad
            </p>
            <div className="flex items-center justify-between gap-3">
              <button
                onClick={() => setQuantity(q => Math.max(1, q - 1))}
                className="w-10 h-10 rounded-xl font-bold text-lg"
                style={{ background: '#1c321d', color: '#ecf5e0' }}
                aria-label="Reducir cantidad"
              >
                −
              </button>
              <div className="flex-1 text-center">
                <div className="text-2xl font-bold" style={{ color: '#ecf5e0' }}>{quantity}</div>
                <div className="text-xs" style={{ color: '#547856' }}>unidad{quantity === 1 ? '' : 'es'}</div>
              </div>
              <button
                onClick={() => setQuantity(q => q + 1)}
                className="w-10 h-10 rounded-xl font-bold text-lg"
                style={{ background: '#a3e635', color: '#060e07' }}
                aria-label="Aumentar cantidad"
              >
                +
              </button>
            </div>
          </div>
        )}
        <div className="flex gap-3 mt-5">
          {onAddToPantry && (
            <button
              onClick={async () => { setAddingPantry(true); await onAddToPantry(); setAddingPantry(false); onClose() }}
              disabled={addingPantry}
              className="flex-1 py-3 rounded-2xl font-bold text-sm disabled:opacity-50"
              style={{ background: '#a3e635', color: '#060e07' }}
            >
              {addingPantry ? '...' : '+ Despensa'}
            </button>
          )}
          {onAddToShoppingList && (
            <button
              onClick={async () => { setAddingCart(true); await onAddToShoppingList(quantity); setAddingCart(false); onClose() }}
              disabled={addingCart}
              className="flex-1 py-3 rounded-2xl font-bold text-sm disabled:opacity-50"
              style={{ background: '#1c321d', color: '#ecf5e0', border: '1px solid #264227' }}
            >
              {addingCart ? '...' : `+ Lista x${quantity}`}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
