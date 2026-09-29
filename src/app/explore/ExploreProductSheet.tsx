'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { Heart, Minus, Plus, ShoppingBasket } from 'lucide-react'
import type { MercadonaProduct } from '@/lib/mercadona'
import { ketoLabel } from '@/lib/ketoLabel'
import { KetoBadge, focusRing } from '@/components/ui'
import Sheet from '@/components/Sheet'
import { apiFetch } from '@/lib/apiFetch'

type Props = {
  product: MercadonaProduct
  inCartQty: number
  favorite: boolean
  onToggleFavorite: () => void
  onAdd: (quantity: number) => Promise<void>
  onClose: () => void
}

const euros = (n: number) => `${n.toFixed(2).replace('.', ',')} €`

export default function ExploreProductSheet({ product, inCartQty, favorite, onToggleFavorite, onAdd, onClose }: Props) {
  const [detail, setDetail] = useState<{ ingredients?: string; allergens?: string } | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [adding, setAdding] = useState(false)
  const { hint } = ketoLabel(product.ketoScore)

  useEffect(() => {
    let cancelled = false
    apiFetch(`/api/mercadona/product/${product.mercadonaId}`)
      .then(r => (r.ok ? r.json() : null))
      .then(d => !cancelled && setDetail(d))
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [product.mercadonaId])

  const total = product.unitPrice != null ? product.unitPrice * quantity : null
  const brand = product.brand?.toLowerCase() === 'mercadona' ? null : product.brand

  return (
    <Sheet
      labelId="explore-sheet-title"
      onClose={onClose}
      actions={
        <button
          type="button"
          onClick={onToggleFavorite}
          aria-pressed={favorite}
          aria-label={favorite ? 'Quitar favorito' : 'Marcar favorito'}
          className={`relative hit-area flex h-10 w-10 items-center justify-center rounded-full hover:bg-forest-800 ${focusRing} ${favorite ? 'text-[#a3e635]' : 'text-forest-200'}`}
        >
          <Heart size={20} fill={favorite ? 'currentColor' : 'none'} />
        </button>
      }
      footer={
        <>
          <div className="flex items-center gap-3">
            <div className="flex h-12 items-center rounded-2xl bg-forest-800">
              <button
                type="button"
                aria-label="Reducir cantidad"
                onClick={() => setQuantity(q => Math.max(1, q - 1))}
                className={`flex h-12 w-11 items-center justify-center rounded-2xl text-forest-50 ${focusRing}`}
              >
                <Minus size={18} />
              </button>
              <span className="w-7 text-center font-semibold text-forest-50" aria-live="polite">
                {quantity}
              </span>
              <button
                type="button"
                aria-label="Aumentar cantidad"
                onClick={() => setQuantity(q => q + 1)}
                className={`flex h-12 w-11 items-center justify-center rounded-2xl text-forest-50 ${focusRing}`}
              >
                <Plus size={18} />
              </button>
            </div>
            <button
              type="button"
              disabled={adding}
              onClick={async () => {
                setAdding(true)
                try {
                  await onAdd(quantity)
                  onClose()
                } catch {
                  // the page shows the error; keep the sheet open so the user can retry
                } finally {
                  setAdding(false)
                }
              }}
              className={`flex h-12 flex-1 items-center justify-between rounded-2xl bg-[#a3e635] px-5 font-bold text-forest-950 disabled:opacity-50 ${focusRing}`}
            >
              <span>Añadir a la lista</span>
              {total != null && <span>{euros(total)}</span>}
            </button>
          </div>
          {inCartQty > 0 && <p className="mt-2 text-center text-xs text-forest-400">Ya tienes {inCartQty} en tu lista</p>}
        </>
      }
    >
      <div className="flex gap-4">
        <div className="relative aspect-square w-28 shrink-0 overflow-hidden rounded-2xl bg-white">
          {product.imageUrl ? (
            <Image src={product.imageUrl} alt="" fill sizes="112px" className="object-cover" />
          ) : (
            <ShoppingBasket className="absolute inset-0 m-auto text-forest-500" size={32} strokeWidth={1.5} />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h2 id="explore-sheet-title" className="text-lg leading-tight font-bold text-forest-50">
            {product.name}
          </h2>
          {brand && <p className="mt-0.5 text-sm text-forest-300">{brand}</p>}
          <p className="mt-2 flex flex-wrap items-baseline gap-x-2">
            <span className="font-syne text-2xl font-bold text-forest-50">
              {product.unitPrice != null ? euros(product.unitPrice) : '—'}
            </span>
            {product.referencePrice && <span className="text-sm text-forest-300">{product.referencePrice}</span>}
          </p>
          <div className="mt-1.5" title={hint}>
            <KetoBadge score={product.ketoScore} />
          </div>
        </div>
      </div>
      <p className="mt-3 text-xs text-forest-400">{hint}. Estimación según el tipo de producto, no un dato nutricional exacto.</p>

      {(detail?.ingredients || detail?.allergens) && (
        <div className="mt-5 divide-y divide-forest-800 border-t border-forest-800">
          {detail.ingredients && (
            <section className="py-4">
              <h3 className="text-xs font-semibold tracking-wider text-forest-400 uppercase">Ingredientes</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-forest-100">{detail.ingredients}</p>
            </section>
          )}
          {detail.allergens && (
            <section className="py-4">
              <h3 className="text-xs font-semibold tracking-wider text-forest-400 uppercase">Alérgenos</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-forest-100">{detail.allergens}</p>
            </section>
          )}
        </div>
      )}
    </Sheet>
  )
}
