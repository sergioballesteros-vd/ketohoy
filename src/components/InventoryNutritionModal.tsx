'use client'

import Image from 'next/image'
import type { RefObject } from 'react'

export type InventoryNutritionModalData = {
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

type KetoInfo = {
  label: string
  desc: string
  className: string
}

type Props = {
  modal: InventoryNutritionModalData | null
  loadingNutrition: boolean
  ketoInfo: KetoInfo
  categoryEmoji: Record<string, string>
  onClose: () => void
  closeButtonRef: RefObject<HTMLButtonElement | null>
}

export default function InventoryNutritionModal({
  modal,
  loadingNutrition,
  ketoInfo,
  categoryEmoji,
  onClose,
  closeButtonRef,
}: Props) {
  if (!modal) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(6,14,7,0.92)]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="inventory-nutrition-title"
    >
      <div
        className="w-full max-w-2xl p-5 max-h-[80vh] overflow-y-auto bg-[#0c1a0d] border-t border-[#1c321d]"
        style={{ borderRadius: '1.25rem 1.25rem 0 0' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start gap-4 mb-5">
          {modal.imageUrl && (
            <Image src={modal.imageUrl} alt={modal.name} width={64} height={64} className="w-16 h-16 rounded-2xl object-cover flex-shrink-0" />
          )}
          <div className="flex-1">
            <h2 id="inventory-nutrition-title" className="font-bold text-lg leading-tight font-syne text-[#ecf5e0]">
              {modal.name}
            </h2>
            {modal.unitPrice && (
              <p className="font-semibold mt-0.5 text-[#f59e0b]">{modal.unitPrice.toFixed(2)}€</p>
            )}
          </div>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="text-2xl leading-none text-[#3b5e3c]"
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>

        <div className="rounded-2xl p-4 mb-4 bg-[#142514]">
          <div className="flex items-center gap-3 mb-1">
            <span className={`text-2xl font-bold font-syne ${ketoInfo.className}`}>
              {modal.ketoScore}/5
            </span>
            <span className={`font-semibold ${ketoInfo.className}`}>
              {ketoInfo.label}
            </span>
            <span className="text-xs ml-auto text-[#3b5e3c]">
              {modal.nutritionSource === 'openfoodfacts' ? '📊 Open Food Facts' : `${categoryEmoji[modal.category]} categoría`}
            </span>
          </div>
          <p className="text-sm text-[#547856]">{ketoInfo.desc}</p>
        </div>

        {(modal.carbs != null || modal.fat != null || modal.protein != null) && (
          <div className="rounded-2xl p-4 mb-4 bg-[#142514]">
            <p className="text-xs font-semibold uppercase tracking-widest mb-3 text-[#3b5e3c]">
              por 100g
            </p>
            <div className="grid grid-cols-4 gap-2 text-center">
              {modal.carbs != null && (
                <div>
                  <div className="text-xl font-bold font-syne text-[#f97316]">
                    {modal.carbs.toFixed(1)}
                    <span className="text-xs font-normal">g</span>
                  </div>
                  <div className="text-xs mt-0.5 text-[#3b5e3c]">Carbos</div>
                </div>
              )}
              {modal.fat != null && (
                <div>
                  <div className="text-xl font-bold font-syne text-[#f59e0b]">
                    {modal.fat.toFixed(1)}
                    <span className="text-xs font-normal">g</span>
                  </div>
                  <div className="text-xs mt-0.5 text-[#3b5e3c]">Grasa</div>
                </div>
              )}
              {modal.protein != null && (
                <div>
                  <div className="text-xl font-bold font-syne text-[#60a5fa]">
                    {modal.protein.toFixed(1)}
                    <span className="text-xs font-normal">g</span>
                  </div>
                  <div className="text-xs mt-0.5 text-[#3b5e3c]">Proteína</div>
                </div>
              )}
              {modal.calories != null && (
                <div>
                  <div className="text-xl font-bold font-syne text-[#ecf5e0]">
                    {Math.round(modal.calories)}
                  </div>
                  <div className="text-xs mt-0.5 text-[#3b5e3c]">kcal</div>
                </div>
              )}
            </div>
          </div>
        )}

        {loadingNutrition ? (
          <p className="text-sm text-center py-4 text-[#3b5e3c]">Cargando info nutricional...</p>
        ) : (
          <>
            {modal.ingredients && (
              <div className="mb-4">
                <p className="text-xs font-semibold uppercase tracking-widest mb-2 text-[#3b5e3c]">Ingredientes</p>
                <p className="text-sm leading-relaxed text-[#7a9e7c]">{modal.ingredients}</p>
              </div>
            )}
            {modal.allergens && (
              <div className="mb-4 rounded-xl p-3 bg-[rgba(245,158,11,0.08)] border border-[rgba(245,158,11,0.2)]">
                <p className="text-xs font-semibold uppercase tracking-widest mb-1 text-[#f59e0b]">⚠️ Alérgenos</p>
                <p className="text-sm text-[#fbbf24]">{modal.allergens}</p>
              </div>
            )}
            {!modal.ingredients && !modal.allergens && modal.mercadonaId && (
              <p className="text-sm text-center py-2 text-[#264227]">Sin información nutricional disponible</p>
            )}
            {!modal.mercadonaId && (
              <p className="text-sm text-center py-2 text-[#264227]">Producto añadido manualmente</p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
