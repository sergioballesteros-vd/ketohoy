'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { Loader2, ShoppingBasket, Trash2 } from 'lucide-react'
import { KetoBadge, KetoNote, focusRing } from '@/components/ui'
import Sheet from '@/components/Sheet'
import { apiFetch } from '@/lib/apiFetch'

export type PantryProduct = {
  id: string
  name: string
  category: string
  ketoScore: number
  mercadonaId: string | null
  unitPrice: number | null
  imageUrl: string | null
  netCarbsPer100g: number | null
  nutritionSource: string
  fatPer100g: number | null
  proteinPer100g: number | null
  caloriesPer100g: number | null
}

export type PantryRow = {
  id: string
  productId: string
  quantity: number | null
  unit: string | null
  product: PantryProduct
}

const UNITS = ['ud', 'g', 'kg', 'ml', 'l', 'paquete']
const euros = (n: number) => `${n.toFixed(2).replace('.', ',')} €`
const num = (n: number) => n.toFixed(1).replace('.', ',')

const field =
  'h-11 rounded-xl border border-forest-700 bg-forest-800 px-3.5 text-[15px] text-forest-50 outline-none transition-colors focus:border-[#a3e635] focus:ring-2 focus:ring-[#a3e635]/20'

type Props = {
  item: PantryRow
  onClose: () => void
  onSave: (quantity: number | null, unit: string | null) => Promise<void>
  onRemove: () => void
}

export default function PantryItemSheet({ item, onClose, onSave, onRemove }: Props) {
  const p = item.product
  const [qty, setQty] = useState(item.quantity != null ? String(item.quantity) : '')
  const [unit, setUnit] = useState(item.unit ?? 'ud')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(false)
  const [detail, setDetail] = useState<{ ingredients?: string; allergens?: string } | null>(null)

  useEffect(() => {
    if (!p.mercadonaId) return
    let cancelled = false
    apiFetch(`/api/mercadona/product/${p.mercadonaId}`)
      .then(r => (r.ok ? r.json() : null))
      .then(d => !cancelled && setDetail(d))
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [p.mercadonaId])

  const nextQty = qty.trim() === '' ? null : Number(qty)
  const nextUnit = unit === 'ud' ? null : unit
  const invalid = nextQty !== null && !(nextQty > 0)
  const dirty = nextQty !== item.quantity || nextUnit !== item.unit

  const macros = [
    ['Carbos netos', p.netCarbsPer100g, 'g'],
    ['Grasa', p.fatPer100g, 'g'],
    ['Proteína', p.proteinPer100g, 'g'],
  ] as const
  const hasMacros = macros.some(([, v]) => v != null)

  return (
    <Sheet
      labelId="pantry-item-title"
      onClose={onClose}
      footer={
        <>
          {saveError && (
            <p role="alert" className="mb-2 text-center text-sm text-red-300">
              No se pudo guardar. Inténtalo de nuevo.
            </p>
          )}
          <button
            type="button"
            disabled={!dirty || invalid || saving}
            onClick={async () => {
              setSaving(true)
              setSaveError(false)
              try {
                await onSave(nextQty, nextUnit)
                onClose()
              } catch {
                setSaveError(true)
              } finally {
                setSaving(false)
              }
            }}
            className={`flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#a3e635] font-semibold text-forest-950 disabled:opacity-50 ${focusRing}`}
          >
            {saving && <Loader2 size={18} className="animate-spin" />} Guardar cambios
          </button>
        </>
      }
    >
      <div className="flex gap-4">
        <div className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-lg ${p.imageUrl ? 'bg-white' : 'bg-forest-800'}`}>
          {p.imageUrl ? (
            <Image src={p.imageUrl} alt="" fill sizes="80px" className="object-cover" />
          ) : (
            <ShoppingBasket className="absolute inset-0 m-auto text-forest-300" size={28} strokeWidth={1.5} />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h2 id="pantry-item-title" className="text-lg leading-tight font-semibold text-forest-50">
            {p.name}
          </h2>
          <p className="mt-1 flex items-center gap-2 text-sm text-forest-300">
            {p.unitPrice != null && <span>{euros(p.unitPrice)}</span>}
            <KetoBadge score={p.ketoScore} />
          </p>
        </div>
      </div>

      <div className="mt-5 flex items-end gap-3">
        <label className="block w-32">
          <span className="mb-1 block text-xs font-medium text-forest-200">Cantidad</span>
          <input
            type="number"
            min="0"
            step="0.5"
            inputMode="decimal"
            value={qty}
            placeholder="Opcional"
            onChange={e => setQty(e.target.value)}
            aria-invalid={invalid}
            className={`${field} w-full`}
          />
        </label>
        <label className="block flex-1">
          <span className="mb-1 block text-xs font-medium text-forest-200">Unidad</span>
          <select value={unit} onChange={e => setUnit(e.target.value)} className={`${field} w-full`}>
            {UNITS.map(u => (
              <option key={u}>{u}</option>
            ))}
          </select>
        </label>
      </div>
      {invalid && <p className="mt-1 text-xs text-red-300">La cantidad debe ser mayor que 0 (o vacía).</p>}

      <div className="mt-4">
        <KetoNote score={p.ketoScore} source={p.nutritionSource} netCarbs={p.netCarbsPer100g} />
      </div>

      {(hasMacros || detail?.ingredients || detail?.allergens || !p.mercadonaId) && (
        <div className="mt-4 divide-y divide-forest-800 border-t border-forest-800">
          {hasMacros && (
            <section className="py-4">
              <h3 className="text-xs font-semibold tracking-wider text-forest-400 uppercase">Por 100 g</h3>
              <dl className="mt-2 grid grid-cols-4 gap-2">
                {macros.map(([label, value, unitLabel]) =>
                  value != null ? (
                    <div key={label}>
                      <dd className="text-lg font-semibold text-forest-50">
                        {num(value)}
                        <span className="text-xs font-normal text-forest-300"> {unitLabel}</span>
                      </dd>
                      <dt className="text-xs text-forest-300">{label}</dt>
                    </div>
                  ) : null
                )}
                {p.caloriesPer100g != null && (
                  <div>
                    <dd className="text-lg font-semibold text-forest-50">{Math.round(p.caloriesPer100g)}</dd>
                    <dt className="text-xs text-forest-300">kcal</dt>
                  </div>
                )}
              </dl>
            </section>
          )}
          {detail?.ingredients && (
            <section className="py-4">
              <h3 className="text-xs font-semibold tracking-wider text-forest-400 uppercase">Ingredientes</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-forest-100">{detail.ingredients}</p>
            </section>
          )}
          {detail?.allergens && (
            <section className="py-4">
              <h3 className="text-xs font-semibold tracking-wider text-forest-400 uppercase">Alérgenos</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-forest-100">{detail.allergens}</p>
            </section>
          )}
          {!p.mercadonaId && <p className="py-4 text-sm text-forest-300">Sin más información de este producto.</p>}
        </div>
      )}

      <button
        type="button"
        onClick={() => {
          onRemove()
          onClose()
        }}
        className={`mt-2 flex h-11 items-center gap-2 rounded-xl px-2 text-sm font-semibold text-red-300 hover:bg-red-500/10 ${focusRing}`}
      >
        <Trash2 size={16} /> Quitar de la despensa
      </button>
    </Sheet>
  )
}
